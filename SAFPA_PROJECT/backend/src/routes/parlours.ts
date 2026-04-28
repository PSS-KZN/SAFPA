import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const createParlourSchema = z.object({
  name: z.string().min(2),
  region: z.string().min(2),
  province: z.string().min(2),
  tier: z.enum(['basic', 'standard', 'premium']),
  status: z.enum(['onboarding', 'active', 'suspended']).default('onboarding'),
  onboardingProgress: z.number().int().min(0).max(100).default(0),
  totalMembers: z.number().int().min(0).default(0),
  totalPolicies: z.number().int().min(0).default(0),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  primaryColor: z.string().min(4),
  joinedDate: z.string().min(8),
  logo: z.string().optional(),
});

export const parloursRouter = Router();

parloursRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const parlours = await prisma.parlour.findMany({
    where: parlourId ? { id: parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json(parlours);
});

parloursRouter.get('/:id', async (req, res) => {
  const parlour = await prisma.parlour.findUnique({
    where: { id: req.params.id },
  });

  if (!parlour) {
    return res.status(404).json({ message: 'Parlour not found' });
  }

  return res.json(parlour);
});

parloursRouter.post('/', async (req, res) => {
  const parsed = createParlourSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour payload',
      errors: parsed.error.flatten(),
    });
  }

  const id = `p${Date.now()}`;
  const parlour = await prisma.parlour.create({
    data: {
      id,
      ...parsed.data,
    },
  });

  await prisma.communicationTemplate.create({
    data: {
      id: generateId('tpl'),
      parlourId: parlour.id,
      name: 'Default Payment Reminder',
      type: 'sms',
      trigger: 'payment_reminder',
      body: 'Dear {member_name}, your premium is due on {due_date}.',
      isActive: true,
      createdOn: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  });

  await writeAuditLog(req, {
    action: 'PARLOUR_CREATED',
    entityType: 'Parlour',
    entityId: parlour.id,
    entityLabel: parlour.name,
  });

  return res.status(201).json(parlour);
});

parloursRouter.patch('/:id', async (req, res) => {
  const parsed = createParlourSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const parlour = await prisma.parlour.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'PARLOUR_UPDATED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
    });

    return res.json(parlour);
  } catch {
    return res.status(404).json({ message: 'Parlour not found' });
  }
});

parloursRouter.patch('/:id/status', async (req, res) => {
  const schema = z.object({ status: z.enum(['onboarding', 'active', 'suspended']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid status payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const parlour = await prisma.parlour.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'PARLOUR_STATUS_CHANGED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
      details: `status=${parlour.status}`,
    });

    return res.json(parlour);
  } catch {
    return res.status(404).json({ message: 'Parlour not found' });
  }
});
