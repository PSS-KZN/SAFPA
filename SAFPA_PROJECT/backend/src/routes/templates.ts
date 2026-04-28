import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const createTemplateSchema = z.object({
  parlourId: z.string().min(1),
  name: z.string().min(2),
  type: z.enum(['sms', 'email']),
  trigger: z.string().min(2),
  subject: z.string().optional(),
  body: z.string().min(3),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  lastUpdated: z.string().optional(),
});

const updateTemplateSchema = createTemplateSchema.omit({ parlourId: true }).partial();

export const templatesRouter = Router();

templatesRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const templates = await prisma.communicationTemplate.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    templates.map((template) => ({
      ...template,
      createdAt: template.createdOn,
    }))
  );
});

templatesRouter.post('/', async (req, res) => {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid template payload', errors: parsed.error.flatten() });
  }

  const nowString = new Date().toISOString().slice(0, 10);
  const createdOn = parsed.data.createdAt || nowString;
  const lastUpdated = parsed.data.lastUpdated || nowString;

  const template = await prisma.communicationTemplate.create({
    data: {
      id: generateId('tpl'),
      parlourId: parsed.data.parlourId,
      name: parsed.data.name,
      type: parsed.data.type,
      trigger: parsed.data.trigger,
      subject: parsed.data.subject,
      body: parsed.data.body,
      isActive: parsed.data.isActive,
      createdOn,
      lastUpdated,
    },
  });

  await writeAuditLog(req, {
    action: 'TEMPLATE_CREATED',
    entityType: 'Template',
    entityId: template.id,
    entityLabel: template.name,
    parlourId: template.parlourId,
  });

  return res.status(201).json({ ...template, createdAt: template.createdOn });
});

templatesRouter.patch('/:id', async (req, res) => {
  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid template payload', errors: parsed.error.flatten() });
  }

  const payload: Record<string, unknown> = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
    payload.createdOn = payload.createdAt;
    delete payload.createdAt;
  }
  payload.lastUpdated = new Date().toISOString().slice(0, 10);

  try {
    const template = await prisma.communicationTemplate.update({
      where: { id: req.params.id },
      data: payload,
    });

    await writeAuditLog(req, {
      action: 'TEMPLATE_UPDATED',
      entityType: 'Template',
      entityId: template.id,
      entityLabel: template.name,
      parlourId: template.parlourId,
    });

    return res.json({ ...template, createdAt: template.createdOn });
  } catch {
    return res.status(404).json({ message: 'Template not found' });
  }
});

templatesRouter.patch('/:id/status', async (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
  }

  try {
    const template = await prisma.communicationTemplate.update({
      where: { id: req.params.id },
      data: {
        isActive: parsed.data.isActive,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    });

    await writeAuditLog(req, {
      action: 'TEMPLATE_STATUS_CHANGED',
      entityType: 'Template',
      entityId: template.id,
      entityLabel: template.name,
      parlourId: template.parlourId,
      details: `isActive=${String(template.isActive)}`,
    });

    return res.json({ ...template, createdAt: template.createdOn });
  } catch {
    return res.status(404).json({ message: 'Template not found' });
  }
});
