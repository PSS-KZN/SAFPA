import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { ensureDefaultSubscriptionPlans } from '../lib/subscription';

const createSubscriptionPlanSchema = z.object({
  tier: z.enum(['basic', 'standard', 'premium']),
  name: z.string().min(2).max(50),
  amount: z.number().int().min(0),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.omit({ tier: true }).partial();

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/', async (req, res) => {
  await ensureDefaultSubscriptionPlans();

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ amount: 'asc' }, { name: 'asc' }],
  });

  return res.json(plans);
});

subscriptionsRouter.post('/', async (req, res) => {
  const parsed = createSubscriptionPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid subscription plan payload',
      errors: parsed.error.flatten(),
    });
  }

  const existing = await prisma.subscriptionPlan.findUnique({
    where: { tier: parsed.data.tier },
  });

  if (existing) {
    return res.status(409).json({ message: 'A plan for this tier already exists. Update it instead.' });
  }

  const subscriptionPlan = await prisma.subscriptionPlan.create({
    data: {
      id: generateId('plan'),
      ...parsed.data,
    },
  });

  await writeAuditLog(req, {
    action: 'SUBSCRIPTION_PLAN_CREATED',
    entityType: 'SubscriptionPlan',
    entityId: subscriptionPlan.id,
    entityLabel: subscriptionPlan.name,
    details: `tier=${subscriptionPlan.tier}; amount=${subscriptionPlan.amount}`,
  });

  return res.status(201).json(subscriptionPlan);
});

subscriptionsRouter.patch('/:id', async (req, res) => {
  const parsed = updateSubscriptionPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid subscription plan payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const existingPlan = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
    if (!existingPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const subscriptionPlan = await prisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    if (parsed.data.amount !== undefined) {
      await prisma.parlourSubscription.updateMany({
        where: { tier: existingPlan.tier },
        data: { amount: parsed.data.amount },
      });
    }

    await writeAuditLog(req, {
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: subscriptionPlan.id,
      entityLabel: subscriptionPlan.name,
      details: [
        parsed.data.name ? `name=${parsed.data.name}` : undefined,
        parsed.data.amount !== undefined ? `amount=${parsed.data.amount}` : undefined,
        parsed.data.isActive !== undefined ? `isActive=${parsed.data.isActive}` : undefined,
      ]
        .filter(Boolean)
        .join('; '),
    });

    return res.json(subscriptionPlan);
  } catch {
    return res.status(404).json({ message: 'Subscription plan not found' });
  }
});

subscriptionsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Subscription plan not found' });
  }

  const assignments = await prisma.parlourSubscription.count({ where: { tier: existing.tier } });
  if (assignments > 0) {
    return res.status(409).json({ message: 'This plan is currently assigned to parlours. Reassign them before deleting the plan.' });
  }

  await prisma.subscriptionPlan.delete({ where: { id: req.params.id } });

  await writeAuditLog(req, {
    action: 'SUBSCRIPTION_PLAN_DELETED',
    entityType: 'SubscriptionPlan',
    entityId: existing.id,
    entityLabel: existing.name,
  });

  return res.status(204).send();
});
