import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { ensureDefaultSubscriptionPlans } from '../lib/subscription';

const createParlourSubscriptionSchema = z.object({
  parlourId: z.string().min(2),
  tier: z.enum(['basic', 'standard', 'premium']),
  status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  billingCycle: z.enum(['monthly', 'quarterly', 'annually']).default('monthly'),
  startDate: z.string().min(8),
  endDate: z.string().min(8).optional(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

const updateParlourSubscriptionSchema = createParlourSubscriptionSchema.omit({ parlourId: true }).partial();

async function getPlanAmount(tier: string) {
  await ensureDefaultSubscriptionPlans();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { tier } });
  if (!plan || !plan.isActive) {
    return null;
  }

  return plan.amount;
}

export const parlourSubscriptionsRouter = Router();

parlourSubscriptionsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const subscriptions = await prisma.parlourSubscription.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { updatedAt: 'desc' },
  });

  const parlours = await prisma.parlour.findMany({
    where: { id: { in: subscriptions.map((subscription) => subscription.parlourId) } },
    select: { id: true, name: true },
  });

  const parlourNameById = new Map(parlours.map((parlour) => [parlour.id, parlour.name]));

  return res.json(
    subscriptions.map((subscription) => ({
      ...subscription,
      parlourName: parlourNameById.get(subscription.parlourId) || 'Unknown Parlour',
    }))
  );
});

parlourSubscriptionsRouter.post('/', async (req, res) => {
  const parsed = createParlourSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour subscription payload',
      errors: parsed.error.flatten(),
    });
  }

  const parlour = await prisma.parlour.findUnique({ where: { id: parsed.data.parlourId } });
  if (!parlour) {
    return res.status(404).json({ message: 'Parlour not found' });
  }

  const existing = await prisma.parlourSubscription.findUnique({
    where: { parlourId: parsed.data.parlourId },
  });

  if (existing) {
    return res.status(409).json({ message: 'Parlour already has a subscription. Update it instead.' });
  }

  const amount = await getPlanAmount(parsed.data.tier);
  if (amount === null) {
    return res.status(404).json({ message: 'Active subscription plan not found for the selected tier.' });
  }

  const subscription = await prisma.parlourSubscription.create({
    data: {
      id: generateId('sub'),
      ...parsed.data,
      amount,
    },
  });

  if (parlour.tier !== parsed.data.tier) {
    await prisma.parlour.update({
      where: { id: parsed.data.parlourId },
      data: { tier: parsed.data.tier },
    });
  }

  await writeAuditLog(req, {
    action: 'PARLOUR_SUBSCRIPTION_CREATED',
    entityType: 'ParlourSubscription',
    entityId: subscription.id,
    entityLabel: parlour.name,
    parlourId: subscription.parlourId,
    details: `tier=${subscription.tier}; status=${subscription.status}; amount=${subscription.amount}`,
  });

  return res.status(201).json({
    ...subscription,
    parlourName: parlour.name,
  });
});

parlourSubscriptionsRouter.patch('/:id', async (req, res) => {
  const parsed = updateParlourSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour subscription payload',
      errors: parsed.error.flatten(),
    });
  }

  const existing = await prisma.parlourSubscription.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Parlour subscription not found' });
  }

  const nextTier = parsed.data.tier || existing.tier;
  const amount = parsed.data.tier ? await getPlanAmount(nextTier) : existing.amount;
  if (amount === null) {
    return res.status(404).json({ message: 'Active subscription plan not found for the selected tier.' });
  }

  const subscription = await prisma.parlourSubscription.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      amount,
    },
  });

  if (parsed.data.tier) {
    await prisma.parlour.update({
      where: { id: subscription.parlourId },
      data: { tier: parsed.data.tier },
    });
  }

  const parlour = await prisma.parlour.findUnique({
    where: { id: subscription.parlourId },
    select: { name: true },
  });

  await writeAuditLog(req, {
    action: 'PARLOUR_SUBSCRIPTION_UPDATED',
    entityType: 'ParlourSubscription',
    entityId: subscription.id,
    entityLabel: parlour?.name || subscription.parlourId,
    parlourId: subscription.parlourId,
    details: [
      parsed.data.tier ? `tier=${parsed.data.tier}` : undefined,
      parsed.data.status ? `status=${parsed.data.status}` : undefined,
      parsed.data.tier ? `amount=${amount}` : undefined,
    ]
      .filter(Boolean)
      .join('; '),
  });

  return res.json({
    ...subscription,
    parlourName: parlour?.name || 'Unknown Parlour',
  });
});

parlourSubscriptionsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.parlourSubscription.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Parlour subscription not found' });
  }

  const parlour = await prisma.parlour.findUnique({ where: { id: existing.parlourId } });

  await prisma.parlourSubscription.delete({ where: { id: req.params.id } });

  await writeAuditLog(req, {
    action: 'PARLOUR_SUBSCRIPTION_DELETED',
    entityType: 'ParlourSubscription',
    entityId: existing.id,
    entityLabel: parlour?.name || existing.parlourId,
    parlourId: existing.parlourId,
  });

  return res.status(204).send();
});