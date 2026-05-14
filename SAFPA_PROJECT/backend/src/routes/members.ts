import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { assertBulkImportLimit } from '../lib/subscription';

const dependantSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  idNumber: z.string().min(4),
  relationship: z.string().min(1),
  dateOfBirth: z.string().min(4),
});

const beneficiarySchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  idNumber: z.string().min(4),
  relationship: z.string().min(1),
  percentage: z.number().min(0).max(100),
});

const createMemberSchema = z.object({
  parlourId: z.string().min(1),
  branchId: z.string().min(1),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  idNumber: z.string().min(6),
  phone: z.string().min(7),
  email: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  province: z.string().default(''),
  joinDate: z.string().min(8),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  dependants: z.array(dependantSchema).default([]),
  beneficiaries: z.array(beneficiarySchema).default([]),
});

const updateMemberSchema = createMemberSchema.omit({ parlourId: true }).partial();

const bulkImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  idNumber: z.string().min(6),
  phone: z.string().min(7),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  branchId: z.string().optional(),
});

const bulkImportSchema = z.object({
  parlourId: z.string().min(1),
  defaultBranchId: z.string().min(1),
  rows: z.array(bulkImportRowSchema),
});

export const membersRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const importErrorFiles = new Map<string, string>();

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapSheetRows(rows: Array<Record<string, unknown>>): Array<Record<string, string>> {
  return rows.map((row) => {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
    );

    return {
      firstName: normalized.firstname || normalized.name || '',
      lastName: normalized.lastname || normalized.surname || '',
      idNumber: normalized.idnumber || normalized.id || '',
      phone: normalized.phone || normalized.phonenumber || normalized.mobile || '',
      email: normalized.email || '',
      address: normalized.address || '',
      city: normalized.city || '',
      province: normalized.province || '',
      branchId: normalized.branchid || '',
    };
  });
}

function parseImportRows(buffer: Buffer): Array<Record<string, string>> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return [];
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '' });
  return mapSheetRows(rawRows);
}

membersRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const actor = req.actor;

  if (actor?.role === 'policyholder_customer') {
    if (!actor.memberId) {
      return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
    }

    const member = await prisma.member.findUnique({ where: { id: actor.memberId } });
    if (!member || (actor.parlourId && member.parlourId !== actor.parlourId)) {
      return res.json([]);
    }

    return res.json([member]);
  }

  const members = await prisma.member.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(members);
});

membersRouter.post('/', async (req, res) => {
  const parsed = createMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid member payload', errors: parsed.error.flatten() });
  }

  const exists = await prisma.member.findFirst({
    where: {
      parlourId: parsed.data.parlourId,
      idNumber: parsed.data.idNumber,
    },
    select: { id: true },
  });

  if (exists) {
    return res.status(409).json({ message: 'Member with this ID number already exists' });
  }

  const member = await prisma.member.create({
    data: {
      id: generateId('m'),
      ...parsed.data,
    },
  });

  await writeAuditLog(req, {
    action: 'MEMBER_CREATED',
    entityType: 'Member',
    entityId: member.id,
    entityLabel: `${member.firstName} ${member.lastName}`,
    parlourId: member.parlourId,
  });

  return res.status(201).json(member);
});

membersRouter.patch('/:id', async (req, res) => {
  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid member payload', errors: parsed.error.flatten() });
  }

  if (req.actor?.role === 'policyholder_customer' && req.actor.memberId !== req.params.id) {
    return res.status(403).json({ message: 'Customers may only update their own profile' });
  }

  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'MEMBER_UPDATED',
      entityType: 'Member',
      entityId: member.id,
      entityLabel: `${member.firstName} ${member.lastName}`,
      parlourId: member.parlourId,
    });

    return res.json(member);
  } catch {
    return res.status(404).json({ message: 'Member not found' });
  }
});

membersRouter.post('/bulk-import', async (req, res) => {
  const parsed = bulkImportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid import payload', errors: parsed.error.flatten() });
  }

  try {
    await assertBulkImportLimit(parsed.data.parlourId, parsed.data.rows.length);
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
  }

  const errors: Array<{ index: number; reason: string }> = [];
  let createdCount = 0;

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];

    const duplicate = await prisma.member.findFirst({
      where: {
        parlourId: parsed.data.parlourId,
        idNumber: row.idNumber,
      },
      select: { id: true },
    });

    if (duplicate) {
      errors.push({ index, reason: 'Duplicate ID number' });
      continue;
    }

    await prisma.member.create({
      data: {
        id: generateId('m'),
        parlourId: parsed.data.parlourId,
        branchId: row.branchId || parsed.data.defaultBranchId,
        firstName: row.firstName,
        lastName: row.lastName,
        idNumber: row.idNumber,
        phone: row.phone,
        email: row.email || '',
        address: row.address || '',
        city: row.city || '',
        province: row.province || '',
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        dependants: [],
        beneficiaries: [],
      },
    });

    createdCount += 1;
  }

  await writeAuditLog(req, {
    action: 'MEMBER_BULK_IMPORTED',
    entityType: 'Member',
    entityId: generateId('import'),
    entityLabel: `rows=${parsed.data.rows.length}`,
    parlourId: parsed.data.parlourId,
    details: `created=${createdCount};errors=${errors.length}`,
  });

  return res.json({
    totalRows: parsed.data.rows.length,
    createdCount,
    errorCount: errors.length,
    errors,
  });
});

membersRouter.post('/bulk-import-file', upload.single('file'), async (req, res) => {
  const schema = z.object({
    parlourId: z.string().min(1),
    defaultBranchId: z.string().min(1),
  });
  const parsedFields = schema.safeParse(req.body);
  if (!parsedFields.success) {
    return res.status(400).json({ message: 'Invalid import payload', errors: parsedFields.error.flatten() });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Import file is required' });
  }

  const rows = parseImportRows(req.file.buffer);
  try {
    await assertBulkImportLimit(parsedFields.data.parlourId, rows.length);
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
  }

  const errors: Array<{ index: number; reason: string }> = [];
  let createdCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowValidation = bulkImportRowSchema.safeParse(row);
    if (!rowValidation.success) {
      errors.push({ index, reason: 'Validation failed' });
      continue;
    }

    const duplicate = await prisma.member.findFirst({
      where: {
        parlourId: parsedFields.data.parlourId,
        idNumber: rowValidation.data.idNumber,
      },
      select: { id: true },
    });

    if (duplicate) {
      errors.push({ index, reason: 'Duplicate ID number' });
      continue;
    }

    await prisma.member.create({
      data: {
        id: generateId('m'),
        parlourId: parsedFields.data.parlourId,
        branchId: rowValidation.data.branchId || parsedFields.data.defaultBranchId,
        firstName: rowValidation.data.firstName,
        lastName: rowValidation.data.lastName,
        idNumber: rowValidation.data.idNumber,
        phone: rowValidation.data.phone,
        email: rowValidation.data.email || '',
        address: rowValidation.data.address || '',
        city: rowValidation.data.city || '',
        province: rowValidation.data.province || '',
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        dependants: [],
        beneficiaries: [],
      },
    });

    createdCount += 1;
  }

  let errorFileToken: string | null = null;
  if (errors.length > 0) {
    errorFileToken = generateId('import-errors');
    const csv = ['row,reason', ...errors.map((item) => `${item.index + 2},"${item.reason}"`)].join('\n');
    importErrorFiles.set(errorFileToken, csv);
  }

  await writeAuditLog(req, {
    action: 'MEMBER_BULK_IMPORTED_FILE',
    entityType: 'Member',
    entityId: generateId('import'),
    entityLabel: req.file.originalname,
    parlourId: parsedFields.data.parlourId,
    details: `created=${createdCount};errors=${errors.length}`,
  });

  return res.json({
    totalRows: rows.length,
    createdCount,
    errorCount: errors.length,
    errors,
    errorFileToken,
  });
});

membersRouter.get('/bulk-import-errors/:token', (req, res) => {
  const csv = importErrorFiles.get(req.params.token);
  if (!csv) {
    return res.status(404).json({ message: 'Error file not found' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="import_errors_${req.params.token}.csv"`);
  return res.send(csv);
});

membersRouter.get('/:id', async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: req.params.id } });
  if (!member) {
    return res.status(404).json({ message: 'Member not found' });
  }

  return res.json(member);
});
