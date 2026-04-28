import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const resourceType = z.enum(['notice', 'training', 'partner', 'policy', 'template']);

const createResourceSchema = z.object({
  title: z.string().min(3),
  type: resourceType,
  description: z.string().min(10),
  publishedBy: z.string().min(2),
  fileSize: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  publishedAt: z.string().optional(),
});

export const resourcesRouter = Router();

resourcesRouter.get('/', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : undefined;

  const records = await prisma.resourceAsset.findMany({
    where: type ? { type } : undefined,
    orderBy: { publishedAt: 'desc' },
  });

  const filtered = search
    ? records.filter((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
      return item.title.toLowerCase().includes(search)
        || item.description.toLowerCase().includes(search)
        || tags.some((tag) => tag.includes(search));
    })
    : records;

  return res.json(filtered);
});

resourcesRouter.post('/', async (req, res) => {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid resource payload', errors: parsed.error.flatten() });
  }

  const resource = await prisma.resourceAsset.create({
    data: {
      id: generateId('res'),
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description,
      publishedBy: parsed.data.publishedBy,
      publishedAt: parsed.data.publishedAt || new Date().toISOString().slice(0, 10),
      fileSize: parsed.data.fileSize,
      url: parsed.data.url,
      tags: parsed.data.tags as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog(req, {
    action: 'RESOURCE_PUBLISHED',
    entityType: 'Resource',
    entityId: resource.id,
    entityLabel: resource.title,
  });

  return res.status(201).json(resource);
});
