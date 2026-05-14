import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { assertBulkImportLimit } from '../lib/subscription';

const policyStatusEnum = z.enum([
  'draft',
  'pending',
  'active',
  'suspended',
  'lapsed',
  'reinstated',
  'cancelled',
  'closed',
]);

const createPolicySchema = z.object({
  memberId: z.string().min(1),
  parlourId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  status: policyStatusEnum.default('pending'),
  premiumAmount: z.number().int().positive(),
  waitingPeriodDays: z.number().int().nonnegative().default(0),
  billingFrequency: z.enum(['monthly', 'weekly', 'annually']),
  nextDueDate: z.string().min(8),
  startDate: z.string().min(8),
  coverAmount: z.number().int().positive(),
  arrearsAmount: z.number().int().nonnegative().default(0),
  lastPaymentDate: z.string().optional(),
  allowedStatusTransitions: z.record(z.string(), z.array(z.string())).optional(),
});

const updatePolicySchema = createPolicySchema.omit({ memberId: true, parlourId: true, productId: true }).partial();
const updateStatusSchema = z.object({ status: policyStatusEnum });

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}, z.string().optional());

const optionalPositiveIntSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

const optionalNonNegativeIntSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}, z.coerce.number().int().nonnegative().optional());

const bulkImportRowSchema = z.object({
  policyNumber: optionalStringSchema,
  memberId: z.string().min(1),
  productId: z.string().min(1),
  productName: optionalStringSchema,
  status: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return value;
  }, policyStatusEnum.optional()),
  premiumAmount: optionalPositiveIntSchema,
  billingFrequency: z.enum(['monthly', 'weekly', 'annually']),
  nextDueDate: z.string().min(8),
  startDate: z.string().min(8),
  coverAmount: optionalPositiveIntSchema,
  arrearsAmount: optionalNonNegativeIntSchema,
  lastPaymentDate: optionalStringSchema,
});

const bulkImportSchema = z.object({
  parlourId: z.string().min(1),
  rows: z.array(bulkImportRowSchema),
});

const recordPaymentSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(['debit_order', 'eft', 'card', 'cash']),
  status: z.enum(['successful', 'failed', 'pending', 'reversed']).default('successful'),
  date: z.string().min(8),
  reference: z.string().optional(),
});

const allowedTransitions: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['active', 'cancelled'],
  active: ['suspended', 'lapsed', 'closed', 'cancelled'],
  suspended: ['active', 'reinstated', 'lapsed', 'cancelled'],
  lapsed: ['reinstated', 'closed'],
  reinstated: ['active', 'suspended', 'cancelled'],
  cancelled: [],
  closed: [],
};

type TransitionRules = Record<string, string[]>;

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
      policyNumber: normalized.policynumber || '',
      memberId: normalized.memberid || '',
      productId: normalized.productid || '',
      productName: normalized.productname || '',
      status: normalized.status || '',
      premiumAmount: normalized.premiumamount || normalized.premium || '',
      billingFrequency: normalized.billingfrequency || normalized.frequency || '',
      nextDueDate: normalized.nextduedate || normalized.duedate || '',
      startDate: normalized.startdate || '',
      coverAmount: normalized.coveramount || normalized.cover || '',
      arrearsAmount: normalized.arrearsamount || normalized.arrears || '',
      lastPaymentDate: normalized.lastpaymentdate || '',
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

function parseTransitionRules(raw: unknown): TransitionRules | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const parsed: TransitionRules = {};
  for (const [status, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      parsed[status] = value;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

function getDependantCount(rawDependants: unknown): number {
  return Array.isArray(rawDependants) ? rawDependants.length : 0;
}

function waitingPeriodViolation(startDate: string, waitingPeriodDays: number): boolean {
  if (waitingPeriodDays <= 0) {
    return false;
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return elapsedDays < waitingPeriodDays;
}

async function validatePolicyConstraints(params: {
  parlourId: string;
  memberId: string;
  productId: string;
  startDate: string;
  targetStatus: string;
  waitingPeriodDays: number;
}): Promise<{ productName?: string; premiumAmount?: number; coverAmount?: number; error?: string }> {
  const [member, product] = await Promise.all([
    prisma.member.findUnique({ where: { id: params.memberId } }),
    prisma.product.findUnique({ where: { id: params.productId } }),
  ]);

  if (!member || member.parlourId !== params.parlourId) {
    return { error: 'Member not found in parlour scope' };
  }

  if (!product || product.parlourId !== params.parlourId) {
    return { error: 'Product not found in parlour scope' };
  }

  const dependantCount = getDependantCount(member.dependants);
  if (dependantCount > product.maxDependants) {
    return { error: `Member has ${dependantCount} dependants but product allows maximum ${product.maxDependants}` };
  }

  if (
    (params.targetStatus === 'active' || params.targetStatus === 'reinstated')
    && waitingPeriodViolation(params.startDate, params.waitingPeriodDays)
  ) {
    return { error: `Waiting period (${params.waitingPeriodDays} days) has not elapsed` };
  }

  return {
    productName: product.name,
    premiumAmount: product.premiumFrom,
    coverAmount: product.coverFrom,
  };
}

function canTransition(from: string, to: string, productRules: TransitionRules | null): boolean {
  if (from === to) {
    return true;
  }

  if (productRules) {
    return (productRules[from] || []).includes(to);
  }

  return (allowedTransitions[from] || []).includes(to);
}

async function createPolicyFromImportRow(params: {
  parlourId: string;
  row: z.infer<typeof bulkImportRowSchema>;
}): Promise<{ policy?: { id: string; policyNumber: string; parlourId: string }; reason?: string; dedupeKey?: string; policyNumber?: string }> {
  const status = params.row.status || 'pending';
  const normalizedPolicyNumber = params.row.policyNumber ? params.row.policyNumber.trim() : undefined;
  const dedupeKey = `${params.row.memberId}|${params.row.productId}|${params.row.startDate}`;

  if (normalizedPolicyNumber) {
    const existingNumber = await prisma.policy.findUnique({ where: { policyNumber: normalizedPolicyNumber }, select: { id: true } });
    if (existingNumber) {
      return { reason: 'Duplicate policy number', policyNumber: normalizedPolicyNumber };
    }
  } else {
    const existingComposite = await prisma.policy.findFirst({
      where: {
        parlourId: params.parlourId,
        memberId: params.row.memberId,
        productId: params.row.productId,
        startDate: params.row.startDate,
      },
      select: { id: true },
    });

    if (existingComposite) {
      return { reason: 'Duplicate policy for member/product/start date', dedupeKey };
    }
  }

  const constraints = await validatePolicyConstraints({
    parlourId: params.parlourId,
    memberId: params.row.memberId,
    productId: params.row.productId,
    startDate: params.row.startDate,
    targetStatus: status,
    waitingPeriodDays: 0,
  });

  if (constraints.error) {
    return { reason: constraints.error, dedupeKey, policyNumber: normalizedPolicyNumber };
  }

  const premiumAmount = params.row.premiumAmount ?? constraints.premiumAmount ?? 0;
  const coverAmount = params.row.coverAmount ?? constraints.coverAmount ?? 0;
  if (premiumAmount <= 0 || coverAmount <= 0) {
    return { reason: 'Premium amount and cover amount must be greater than zero', dedupeKey, policyNumber: normalizedPolicyNumber };
  }

  const policy = await prisma.policy.create({
    data: {
      id: generateId('pol'),
      policyNumber: normalizedPolicyNumber || `POL-${generateId('n')}`,
      memberId: params.row.memberId,
      parlourId: params.parlourId,
      productId: params.row.productId,
      productName: params.row.productName || constraints.productName || 'Policy Product',
      status,
      premiumAmount,
      waitingPeriodDays: 0,
      billingFrequency: params.row.billingFrequency,
      nextDueDate: params.row.nextDueDate,
      startDate: params.row.startDate,
      coverAmount,
      arrearsAmount: params.row.arrearsAmount ?? 0,
      lastPaymentDate: params.row.lastPaymentDate,
    },
  });

  return { policy, dedupeKey, policyNumber: normalizedPolicyNumber };
}

export const policiesRouter = Router();

policiesRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const actor = req.actor;

  if (actor?.role === 'policyholder_customer') {
    if (!actor.memberId) {
      return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
    }

    const policies = await prisma.policy.findMany({
      where: {
        memberId: actor.memberId,
        ...(parlourId ? { parlourId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(policies);
  }

  const policies = await prisma.policy.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(policies);
});

policiesRouter.post('/', async (req, res) => {
  const parsed = createPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
  }

  const constraints = await validatePolicyConstraints({
    parlourId: parsed.data.parlourId,
    memberId: parsed.data.memberId,
    productId: parsed.data.productId,
    startDate: parsed.data.startDate,
    targetStatus: parsed.data.status,
    waitingPeriodDays: parsed.data.waitingPeriodDays,
  });

  if (constraints.error) {
    return res.status(409).json({ message: constraints.error });
  }

  const policy = await prisma.policy.create({
    data: {
      id: generateId('pol'),
      policyNumber: `POL-${generateId('n')}`,
      ...parsed.data,
      productName: constraints.productName || parsed.data.productName,
      allowedStatusTransitions: parsed.data.allowedStatusTransitions as Prisma.InputJsonValue | undefined,
    },
  });

  await writeAuditLog(req, {
    action: 'POLICY_CREATED',
    entityType: 'Policy',
    entityId: policy.id,
    entityLabel: policy.policyNumber,
    parlourId: policy.parlourId,
  });

  return res.status(201).json(policy);
});

policiesRouter.patch('/:id', async (req, res) => {
  const parsed = updatePolicySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
  }

  try {
    const existing = await prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    const constraints = await validatePolicyConstraints({
      parlourId: existing.parlourId,
      memberId: existing.memberId,
      productId: existing.productId,
      startDate: parsed.data.startDate || existing.startDate,
      targetStatus: parsed.data.status || existing.status,
      waitingPeriodDays: parsed.data.waitingPeriodDays ?? existing.waitingPeriodDays,
    });

    if (constraints.error) {
      return res.status(409).json({ message: constraints.error });
    }

    const policyRules = parseTransitionRules(parsed.data.allowedStatusTransitions ?? existing.allowedStatusTransitions);

    if (parsed.data.status && !canTransition(existing.status, parsed.data.status, policyRules)) {
      return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(data, 'allowedStatusTransitions')) {
      data.allowedStatusTransitions = data.allowedStatusTransitions as Prisma.InputJsonValue;
    }

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data,
    });

    await writeAuditLog(req, {
      action: 'POLICY_UPDATED',
      entityType: 'Policy',
      entityId: policy.id,
      entityLabel: policy.policyNumber,
      parlourId: policy.parlourId,
    });

    return res.json(policy);
  } catch {
    return res.status(404).json({ message: 'Policy not found' });
  }
});

policiesRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.policy.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Policy not found' });
  }

  const constraints = await validatePolicyConstraints({
    parlourId: existing.parlourId,
    memberId: existing.memberId,
    productId: existing.productId,
    startDate: existing.startDate,
    targetStatus: parsed.data.status,
    waitingPeriodDays: existing.waitingPeriodDays,
  });

  if (constraints.error) {
    return res.status(409).json({ message: constraints.error });
  }

  const policyRules = parseTransitionRules(existing.allowedStatusTransitions);

  if (!canTransition(existing.status, parsed.data.status, policyRules)) {
    return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
  }

  const updated = await prisma.policy.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
  });

  await writeAuditLog(req, {
    action: 'POLICY_STATUS_CHANGED',
    entityType: 'Policy',
    entityId: updated.id,
    entityLabel: updated.policyNumber,
    parlourId: updated.parlourId,
    details: `status=${updated.status}`,
  });

  return res.json(updated);
});

policiesRouter.post('/bulk-import', async (req, res) => {
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
  const seenPolicyNumbers = new Set<string>();
  const seenCompositeKeys = new Set<string>();
  let createdCount = 0;

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];

    if (row.policyNumber) {
      const normalizedPolicyNumber = row.policyNumber.trim();
      if (seenPolicyNumbers.has(normalizedPolicyNumber)) {
        errors.push({ index, reason: 'Duplicate policy number in import file' });
        continue;
      }
      seenPolicyNumbers.add(normalizedPolicyNumber);
    } else {
      const composite = `${row.memberId}|${row.productId}|${row.startDate}`;
      if (seenCompositeKeys.has(composite)) {
        errors.push({ index, reason: 'Duplicate member/product/start date in import payload' });
        continue;
      }
      seenCompositeKeys.add(composite);
    }

    const created = await createPolicyFromImportRow({
      parlourId: parsed.data.parlourId,
      row,
    });

    if (!created.policy) {
      errors.push({ index, reason: created.reason || 'Failed to create policy row' });
      continue;
    }

    createdCount += 1;
  }

  await writeAuditLog(req, {
    action: 'POLICY_BULK_IMPORTED',
    entityType: 'Policy',
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

policiesRouter.post('/bulk-import-file', upload.single('file'), async (req, res) => {
  const schema = z.object({ parlourId: z.string().min(1) });
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
  const seenPolicyNumbers = new Set<string>();
  const seenCompositeKeys = new Set<string>();
  let createdCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const parsedRow = bulkImportRowSchema.safeParse(row);
    if (!parsedRow.success) {
      errors.push({ index, reason: 'Validation failed' });
      continue;
    }

    if (parsedRow.data.policyNumber) {
      const normalizedPolicyNumber = parsedRow.data.policyNumber.trim();
      if (seenPolicyNumbers.has(normalizedPolicyNumber)) {
        errors.push({ index, reason: 'Duplicate policy number in import file' });
        continue;
      }
      seenPolicyNumbers.add(normalizedPolicyNumber);
    } else {
      const composite = `${parsedRow.data.memberId}|${parsedRow.data.productId}|${parsedRow.data.startDate}`;
      if (seenCompositeKeys.has(composite)) {
        errors.push({ index, reason: 'Duplicate member/product/start date in import file' });
        continue;
      }
      seenCompositeKeys.add(composite);
    }

    const created = await createPolicyFromImportRow({
      parlourId: parsedFields.data.parlourId,
      row: parsedRow.data,
    });

    if (!created.policy) {
      errors.push({ index, reason: created.reason || 'Failed to create policy row' });
      continue;
    }

    createdCount += 1;
  }

  let errorFileToken: string | null = null;
  if (errors.length > 0) {
    errorFileToken = generateId('import-errors');
    const csv = ['row,reason', ...errors.map((item) => `${item.index + 2},"${item.reason}"`)].join('\n');
    importErrorFiles.set(errorFileToken, csv);
  }

  await writeAuditLog(req, {
    action: 'POLICY_BULK_IMPORTED_FILE',
    entityType: 'Policy',
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

policiesRouter.get('/bulk-import-errors/:token', (req, res) => {
  const csv = importErrorFiles.get(req.params.token);
  if (!csv) {
    return res.status(404).json({ message: 'Error file not found' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="policy_import_errors_${req.params.token}.csv"`);
  return res.send(csv);
});

policiesRouter.get('/:id', async (req, res) => {
  const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found' });
  }

  return res.json(policy);
});

policiesRouter.post('/:id/record-payment', async (req, res) => {
  const parsed = recordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payment payload', errors: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found' });
  }

  const member = await prisma.member.findUnique({ where: { id: policy.memberId } });

  const reference = parsed.data.reference || `PAY-${Date.now()}`;
  const providerMeta = parsed.data.method === 'cash'
    ? {
        providerCode: 'manual_branch_capture',
        providerName: 'Manual Branch Capture',
        captureChannel: 'branch_manual',
      }
    : {
        providerCode: 'safpa_mvp_static',
        providerName: 'SAFPA Static Provider',
        captureChannel: 'provider_static',
      };

  const payment = await prisma.paymentTransaction.create({
    data: {
      id: generateId('pay'),
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      memberId: policy.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
      amount: parsed.data.amount,
      date: parsed.data.date,
      method: parsed.data.method,
      providerCode: providerMeta.providerCode,
      providerName: providerMeta.providerName,
      captureChannel: providerMeta.captureChannel,
      status: parsed.data.status,
      reference,
      parlourId: policy.parlourId,
    },
  });

  let nextArrears = policy.arrearsAmount;
  let nextStatus = policy.status;
  if (parsed.data.status === 'successful') {
    nextArrears = Math.max(0, policy.arrearsAmount - parsed.data.amount);
    if (nextArrears === 0 && (policy.status === 'suspended' || policy.status === 'lapsed')) {
      nextStatus = 'active';
    }
  }

  const updatedPolicy = await prisma.policy.update({
    where: { id: policy.id },
    data: {
      arrearsAmount: nextArrears,
      lastPaymentDate: parsed.data.date,
      status: nextStatus,
    },
  });

  await writeAuditLog(req, {
    action: 'PAYMENT_RECORDED',
    entityType: 'Payment',
    entityId: payment.id,
    entityLabel: `${payment.reference}`,
    parlourId: payment.parlourId,
    details: `policyId=${policy.id};status=${payment.status}`,
  });

  return res.json({ payment, policy: updatedPolicy });
});
