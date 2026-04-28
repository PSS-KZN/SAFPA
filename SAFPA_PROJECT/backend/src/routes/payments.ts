import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const createPaymentSchema = z.object({
  policyId: z.string().min(1),
  amount: z.number().int().positive(),
  date: z.string().min(8),
  method: z.enum(['debit_order', 'eft', 'card', 'cash']),
  status: z.enum(['successful', 'failed', 'pending', 'reversed']).default('successful'),
  reference: z.string().optional(),
});

const reconciliationImportSchema = z.object({
  parlourId: z.string().min(1),
  fileName: z.string().min(3),
  importedBy: z.string().min(2),
  matched: z.number().int().nonnegative(),
  exceptions: z.number().int().nonnegative(),
  status: z.enum(['completed', 'processing', 'failed']).default('completed'),
  details: z.array(z.string()).optional(),
});

export const paymentsRouter = Router();

paymentsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const payments = await prisma.paymentTransaction.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(payments);
});

paymentsRouter.post('/', async (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payment payload', errors: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findUnique({ where: { id: parsed.data.policyId } });
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

  let arrearsAmount = policy.arrearsAmount;
  if (parsed.data.status === 'successful') {
    arrearsAmount = Math.max(0, policy.arrearsAmount - parsed.data.amount);
  }

  const policyUpdateData: { arrearsAmount: number; lastPaymentDate?: string } = {
    arrearsAmount,
  };

  if (parsed.data.status === 'successful') {
    policyUpdateData.lastPaymentDate = parsed.data.date;
  }

  await prisma.policy.update({
    where: { id: policy.id },
    data: policyUpdateData,
  });

  await prisma.communicationLog.create({
    data: {
      id: generateId('c'),
      parlourId: payment.parlourId,
      type: 'sms',
      recipientName: payment.memberName,
      recipientContact: member?.phone || '',
      template: parsed.data.status === 'successful' ? 'Payment Receipt' : 'Payment Failed Notice',
      status: 'delivered',
      sentAt: parsed.data.date,
      metadata: {
        policyId: policy.id,
        paymentId: payment.id,
      },
    },
  });

  await writeAuditLog(req, {
    action: 'PAYMENT_CAPTURED',
    entityType: 'Payment',
    entityId: payment.id,
    entityLabel: payment.reference,
    parlourId: payment.parlourId,
    details: `amount=${payment.amount};status=${payment.status}`,
  });

  return res.status(201).json(payment);
});

paymentsRouter.get('/reconciliation-imports', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const imports = await prisma.reconciliationImport.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(imports);
});

paymentsRouter.post('/reconciliation-imports', async (req, res) => {
  const parsed = reconciliationImportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid reconciliation payload', errors: parsed.error.flatten() });
  }

  const importedAt = new Date().toISOString().slice(0, 10);

  const record = await prisma.reconciliationImport.create({
    data: {
      id: generateId('rec'),
      parlourId: parsed.data.parlourId,
      fileName: parsed.data.fileName,
      importedBy: parsed.data.importedBy,
      importedAt,
      matched: parsed.data.matched,
      exceptions: parsed.data.exceptions,
      status: parsed.data.status,
      details: parsed.data.details || [],
    },
  });

  await writeAuditLog(req, {
    action: 'RECON_FILE_IMPORTED',
    entityType: 'Reconciliation',
    entityId: record.id,
    entityLabel: record.fileName,
    parlourId: record.parlourId,
    details: `matched=${record.matched};exceptions=${record.exceptions}`,
  });

  return res.status(201).json(record);
});

paymentsRouter.post('/billing-events/generate', async (req, res) => {
  const schema = z.object({ parlourId: z.string().min(1), dueDate: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const policies = await prisma.policy.findMany({
    where: {
      parlourId: parsed.data.parlourId,
      status: { in: ['active', 'suspended'] },
    },
  });

  let count = 0;
  for (const policy of policies) {
    await prisma.billingEvent.create({
      data: {
        id: generateId('be'),
        parlourId: policy.parlourId,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        dueDate: parsed.data.dueDate,
        amount: policy.premiumAmount,
        status: 'pending',
      },
    });
    count += 1;
  }

  await writeAuditLog(req, {
    action: 'BILLING_EVENTS_GENERATED',
    entityType: 'BillingEvent',
    entityId: generateId('be-job'),
    entityLabel: parsed.data.dueDate,
    parlourId: parsed.data.parlourId,
    details: `count=${count}`,
  });

  return res.json({ created: count });
});
