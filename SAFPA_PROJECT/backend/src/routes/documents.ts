import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

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

  const records = await prisma.documentRecord.findMany({
    where: {
      parlourId: parlourId || undefined,
      entityType: entityType || undefined,
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

  return res.status(201).json(record);
});

documentsRouter.get('/:id/download', async (req, res) => {
  const record = await prisma.documentRecord.findUnique({ where: { id: req.params.id } });
  if (!record) {
    return res.status(404).json({ message: 'Document not found' });
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
