import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

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
  status: policyStatusEnum,
  premiumAmount: z.number().int().positive(),
  billingFrequency: z.enum(['monthly', 'weekly', 'annually']),
  nextDueDate: z.string().min(8),
  startDate: z.string().min(8),
  coverAmount: z.number().int().positive(),
  arrearsAmount: z.number().int().nonnegative().default(0),
  lastPaymentDate: z.string().optional(),
});

const updatePolicySchema = createPolicySchema.omit({ memberId: true, parlourId: true, productId: true }).partial();
const updateStatusSchema = z.object({ status: policyStatusEnum });

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

function canTransition(from: string, to: string): boolean {
  if (from === to) {
    return true;
  }

  return (allowedTransitions[from] || []).includes(to);
}

export const policiesRouter = Router();

policiesRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const policies = await prisma.policy.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(policies);
});

policiesRouter.get('/:id', async (req, res) => {
  const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found' });
  }

  return res.json(policy);
});

policiesRouter.post('/', async (req, res) => {
  const parsed = createPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
  }

  const policy = await prisma.policy.create({
    data: {
      id: generateId('pol'),
      policyNumber: `POL-${Date.now()}`,
      ...parsed.data,
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

    if (parsed.data.status && !canTransition(existing.status, parsed.data.status)) {
      return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
    }

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: parsed.data,
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

  if (!canTransition(existing.status, parsed.data.status)) {
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
