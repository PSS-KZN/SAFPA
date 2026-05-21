import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { writeUsageEvent } from '../lib/usage';

const createDocumentSchema = z.object({
  parlourId: z.string().min(1),
  name: z.string().min(2),
  type: z.string().min(2),
  entityType: z.enum(['member', 'policy', 'funeral_case']),
  entityId: z.string().min(1),
  uploadedBy: z.string().min(2),
  uploadedAt: z.string().min(8).optional(),
  size: z.string().min(2),
});

export const documentsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function allowedEntityTypesForRole(role?: string): Array<'member' | 'policy' | 'funeral_case'> {
  if (role === 'operations_coordinator') {
    return ['funeral_case'];
  }

  if (role === 'policy_admin') {
    return ['member', 'policy'];
  }

  if (role === 'policyholder_customer') {
    return ['member', 'policy'];
  }

  return ['member', 'policy', 'funeral_case'];
}

function actorCanAccessEntityType(actor: Express.SessionActor | undefined, entityType: 'member' | 'policy' | 'funeral_case'): boolean {
  return allowedEntityTypesForRole(actor?.role).includes(entityType);
}

async function actorCanAccessEntity(
  actor: Express.SessionActor | undefined,
  record: { parlourId: string; entityType: 'member' | 'policy' | 'funeral_case'; entityId: string },
): Promise<boolean> {
  if (actor?.parlourId && actor.parlourId !== record.parlourId) {
    return false;
  }

  if (!actorCanAccessEntityType(actor, record.entityType)) {
    return false;
  }

  if (actor?.role !== 'policyholder_customer') {
    return true;
  }

  if (!actor.memberId) {
    return false;
  }

  if (record.entityType === 'member') {
    return record.entityId === actor.memberId;
  }

  if (record.entityType === 'policy') {
    const policy = await prisma.policy.findUnique({
      where: { id: record.entityId },
      select: { memberId: true, parlourId: true },
    });

    return Boolean(policy && policy.memberId === actor.memberId && (!actor.parlourId || policy.parlourId === actor.parlourId));
  }

  return false;
}

function uploadsDir(): string {
  const dir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

documentsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
  const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
  const allowedEntityTypes = allowedEntityTypesForRole(req.actor?.role);

  if (entityType && !allowedEntityTypes.includes(entityType as 'member' | 'policy' | 'funeral_case')) {
    return res.json([]);
  }

  if (req.actor?.role === 'policyholder_customer') {
    if (!req.actor.memberId) {
      return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
    }

    const ownedPolicies = await prisma.policy.findMany({
      where: {
        memberId: req.actor.memberId,
        ...(req.actor.parlourId ? { parlourId: req.actor.parlourId } : {}),
      },
      select: { id: true },
    });
    const ownedPolicyIds = ownedPolicies.map((policy) => policy.id);

    const records = await prisma.documentRecord.findMany({
      where: {
        parlourId: req.actor.parlourId || parlourId || undefined,
        entityType: entityType || { in: allowedEntityTypes },
        entityId: entityId || undefined,
        OR: [
          { entityType: 'member', entityId: req.actor.memberId },
          { entityType: 'policy', entityId: { in: ownedPolicyIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(records);
  }

  const records = await prisma.documentRecord.findMany({
    where: {
      parlourId: req.actor?.parlourId || parlourId || undefined,
      entityType: entityType || { in: allowedEntityTypes },
      entityId: entityId || undefined,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(records);
});

documentsRouter.post('/', async (req, res) => {
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid document payload', errors: parsed.error.flatten() });
  }

  if (!actorCanAccessEntityType(req.actor, parsed.data.entityType)) {
    return res.status(403).json({ message: 'You are not allowed to manage this document type' });
  }

  if (!(await actorCanAccessEntity(req.actor, {
    parlourId: parsed.data.parlourId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  }))) {
    return res.status(403).json({ message: 'You are not allowed to manage this document' });
  }

  const record = await prisma.documentRecord.create({
    data: {
      id: generateId('doc'),
      parlourId: parsed.data.parlourId,
      name: parsed.data.name,
      type: parsed.data.type,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      uploadedBy: parsed.data.uploadedBy,
      uploadedAt: parsed.data.uploadedAt || new Date().toISOString().slice(0, 10),
      size: parsed.data.size,
    },
  });

  await writeAuditLog(req, {
    action: 'DOCUMENT_UPLOADED',
    entityType: 'Document',
    entityId: record.id,
    entityLabel: record.name,
    parlourId: record.parlourId,
  });

  await writeUsageEvent(req, {
    module: 'documents',
    eventType: 'document_uploaded',
    parlourId: record.parlourId,
    entityType: 'Document',
    entityId: record.id,
    details: record.name,
    metadata: {
      documentType: record.type,
      entityType: record.entityType,
      entityId: record.entityId,
      uploadMode: 'metadata_only',
    },
  });

  return res.status(201).json(record);
});

documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
  const schema = z.object({
    parlourId: z.string().min(1),
    name: z.string().min(2).optional(),
    type: z.string().min(2),
    entityType: z.enum(['member', 'policy', 'funeral_case']),
    entityId: z.string().min(1),
    uploadedBy: z.string().min(2),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid upload payload', errors: parsed.error.flatten() });
  }

  if (!actorCanAccessEntityType(req.actor, parsed.data.entityType)) {
    return res.status(403).json({ message: 'You are not allowed to manage this document type' });
  }

  if (!(await actorCanAccessEntity(req.actor, {
    parlourId: parsed.data.parlourId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  }))) {
    return res.status(403).json({ message: 'You are not allowed to manage this document' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }

  const extension = path.extname(req.file.originalname);
  const diskName = `${generateId('file')}${extension}`;
  const fullPath = path.join(uploadsDir(), diskName);
  fs.writeFileSync(fullPath, req.file.buffer);

  const sizeKb = Math.max(1, Math.round(req.file.size / 1024));
  const record = await prisma.documentRecord.create({
    data: {
      id: generateId('doc'),
      parlourId: parsed.data.parlourId,
      name: parsed.data.name || req.file.originalname,
      type: parsed.data.type,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      uploadedBy: parsed.data.uploadedBy,
      uploadedAt: new Date().toISOString().slice(0, 10),
      size: `${sizeKb} KB`,
      storagePath: fullPath,
      mimeType: req.file.mimetype,
    },
  });

  await writeAuditLog(req, {
    action: 'DOCUMENT_UPLOADED',
    entityType: 'Document',
    entityId: record.id,
    entityLabel: record.name,
    parlourId: record.parlourId,
    details: `storagePath=${diskName}`,
  });

  await writeUsageEvent(req, {
    module: 'documents',
    eventType: 'document_uploaded',
    parlourId: record.parlourId,
    entityType: 'Document',
    entityId: record.id,
    details: record.name,
    metadata: {
      documentType: record.type,
      entityType: record.entityType,
      entityId: record.entityId,
      uploadMode: 'file_upload',
      mimeType: record.mimeType,
    },
  });

  return res.status(201).json(record);
});

documentsRouter.get('/:id/download', async (req, res) => {
  const record = await prisma.documentRecord.findUnique({ where: { id: req.params.id } });
  if (!record) {
    return res.status(404).json({ message: 'Document not found' });
  }

  if (!(await actorCanAccessEntity(req.actor, {
    parlourId: record.parlourId,
    entityType: record.entityType as 'member' | 'policy' | 'funeral_case',
    entityId: record.entityId,
  }))) {
    return res.status(403).json({ message: 'You are not allowed to access this document' });
  }

  if (!record.storagePath || !fs.existsSync(record.storagePath)) {
    return res.status(404).json({ message: 'File not found on disk' });
  }

  res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${record.name}"`);
  return res.sendFile(record.storagePath);
});

documentsRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.documentRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!(await actorCanAccessEntity(req.actor, {
      parlourId: existing.parlourId,
      entityType: existing.entityType as 'member' | 'policy' | 'funeral_case',
      entityId: existing.entityId,
    }))) {
      return res.status(403).json({ message: 'You are not allowed to delete this document' });
    }

    const record = await prisma.documentRecord.delete({ where: { id: req.params.id } });

    if (record.storagePath && fs.existsSync(record.storagePath)) {
      fs.unlinkSync(record.storagePath);
    }

    await writeAuditLog(req, {
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: record.id,
      entityLabel: record.name,
      parlourId: record.parlourId,
    });

    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: 'Document not found' });
  }
});
