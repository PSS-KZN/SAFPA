import { Router } from 'express';
import type { Prisma } from '@prisma/client';
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

const staticProvider = {
  code: 'safpa_mvp_static',
  name: 'SAFPA Static Provider',
  mode: 'static',
  status: 'configured',
  methods: ['debit_order', 'eft', 'card'] as const,
  notes: 'Static MVP provider placeholder until a live gateway is enabled.',
};

export const paymentsRouter = Router();

function resolvePaymentProvider(method: 'debit_order' | 'eft' | 'card' | 'cash') {
  if (method === 'cash') {
    return {
      providerCode: 'manual_branch_capture',
      providerName: 'Manual Branch Capture',
      captureChannel: 'branch_manual',
    };
  }

  return {
    providerCode: staticProvider.code,
    providerName: staticProvider.name,
    captureChannel: 'provider_static',
  };
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function compareDate(left: string, right: string): number {
  return normalizeDate(left).localeCompare(normalizeDate(right));
}

function addBillingFrequency(date: string, frequency: string): string {
  const normalized = normalizeDate(date);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (frequency === 'weekly') {
    parsed.setUTCDate(parsed.getUTCDate() + 7);
  } else if (frequency === 'annually') {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  } else {
    parsed.setUTCMonth(parsed.getUTCMonth() + 1);
  }

  return parsed.toISOString().slice(0, 10);
}

function isSettled(status: string): boolean {
  return status === 'paid' || status === 'reconciled';
}

function receiptStoragePath(paymentId: string): string {
  return `receipt://${paymentId}`;
}

async function ensureBillingEventsThrough(
  tx: Prisma.TransactionClient,
  policy: Awaited<ReturnType<typeof prisma.policy.findUniqueOrThrow>>,
  throughDate: string,
): Promise<number> {
  const upperBound = normalizeDate(throughDate);
  const existingEvents = await tx.billingEvent.findMany({
    where: {
      policyId: policy.id,
      dueDate: { lte: upperBound },
    },
    select: { dueDate: true },
  });

  const existingDueDates = new Set(existingEvents.map((event) => normalizeDate(event.dueDate)));
  let created = 0;
  let cursor = normalizeDate(policy.nextDueDate);

  while (compareDate(cursor, upperBound) <= 0) {
    if (!existingDueDates.has(cursor)) {
      await tx.billingEvent.create({
        data: {
          id: generateId('be'),
          parlourId: policy.parlourId,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          dueDate: cursor,
          amount: policy.premiumAmount,
          status: 'pending',
        },
      });
      existingDueDates.add(cursor);
      created += 1;
    }

    cursor = addBillingFrequency(cursor, policy.billingFrequency);
  }

  return created;
}

async function createReceiptRecord(
  tx: Prisma.TransactionClient,
  payment: Awaited<ReturnType<typeof prisma.paymentTransaction.create>>,
  actorName: string,
): Promise<string> {
  const receipt = await tx.documentRecord.create({
    data: {
      id: generateId('doc'),
      parlourId: payment.parlourId,
      name: `Receipt-${payment.reference}.txt`,
      type: 'receipt',
      entityType: 'Payment',
      entityId: payment.id,
      uploadedBy: actorName,
      uploadedAt: payment.date,
      size: `${String(payment.amount).length + payment.reference.length + 32} B`,
      storagePath: receiptStoragePath(payment.id),
      mimeType: 'text/plain',
    },
  });

  return receipt.id;
}

async function applySuccessfulPayment(
  tx: Prisma.TransactionClient,
  policy: Awaited<ReturnType<typeof prisma.policy.findUniqueOrThrow>>,
  payment: Awaited<ReturnType<typeof prisma.paymentTransaction.create>>,
  actorName: string,
): Promise<{ appliedAmount: number; unappliedAmount: number; appliedDueDates: string[]; receiptId: string; nextDueDate: string; arrearsAmount: number }> {
  const coverageDate = compareDate(payment.date, policy.nextDueDate) >= 0 ? payment.date : policy.nextDueDate;
  await ensureBillingEventsThrough(tx, policy, coverageDate);

  let events = await tx.billingEvent.findMany({
    where: { policyId: policy.id },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  let remaining = payment.amount;
  const appliedDueDates: string[] = [];
  let latestKnownDueDate = events.length > 0 ? normalizeDate(events[events.length - 1].dueDate) : normalizeDate(policy.nextDueDate);

  while (remaining > 0) {
    let target = events.find((event) => !isSettled(event.status) && event.settledAmount < event.amount);

    if (!target) {
      latestKnownDueDate = addBillingFrequency(latestKnownDueDate, policy.billingFrequency);
      target = await tx.billingEvent.create({
        data: {
          id: generateId('be'),
          parlourId: policy.parlourId,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          dueDate: latestKnownDueDate,
          amount: policy.premiumAmount,
          status: 'pending',
        },
      });
      events = [...events, target];
    }

    const outstandingAmount = target.amount - target.settledAmount;
    const applied = Math.min(remaining, outstandingAmount);
    const nextSettledAmount = target.settledAmount + applied;
    const nextStatus = nextSettledAmount >= target.amount ? 'paid' : 'partial';

    const updated = await tx.billingEvent.update({
      where: { id: target.id },
      data: {
        settledAmount: nextSettledAmount,
        settledAt: nextStatus === 'paid' ? normalizeDate(payment.date) : null,
        lastPaymentReference: payment.reference,
        status: nextStatus,
      },
    });

    events = events.map((event) => (event.id === updated.id ? updated : event));
    if (!appliedDueDates.includes(normalizeDate(updated.dueDate))) {
      appliedDueDates.push(normalizeDate(updated.dueDate));
    }
    remaining -= applied;

    if (nextStatus === 'partial') {
      break;
    }
  }

  const today = normalizeDate(new Date().toISOString());
  const outstandingEvents = events.filter((event) => !isSettled(event.status) || event.settledAmount < event.amount);
  const nextOutstanding = outstandingEvents[0] ?? null;
  const nextDueDate = nextOutstanding ? normalizeDate(nextOutstanding.dueDate) : addBillingFrequency(latestKnownDueDate, policy.billingFrequency);
  const arrearsAmount = outstandingEvents.reduce((sum, event) => {
    if (compareDate(event.dueDate, today) < 0) {
      return sum + Math.max(0, event.amount - event.settledAmount);
    }
    return sum;
  }, 0);

  await tx.policy.update({
    where: { id: policy.id },
    data: {
      arrearsAmount,
      lastPaymentDate: normalizeDate(payment.date),
      nextDueDate,
    },
  });

  const receiptId = await createReceiptRecord(tx, payment, actorName);

  return {
    appliedAmount: payment.amount - remaining,
    unappliedAmount: remaining,
    appliedDueDates,
    receiptId,
    nextDueDate,
    arrearsAmount,
  };
}

paymentsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const payments = await prisma.paymentTransaction.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(payments);
});

paymentsRouter.get('/providers', async (_req, res) => {
  return res.json({
    providers: [
      staticProvider,
      {
        code: 'manual_branch_capture',
        name: 'Manual Branch Capture',
        mode: 'manual',
        status: 'configured',
        methods: ['cash'],
        notes: 'Used for over-the-counter branch payments and back-office capture.',
      },
    ],
  });
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
  const provider = resolvePaymentProvider(parsed.data.method);

  const actorName = req.actor?.userName || (req.headers['x-user-name'] as string) || 'System';
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.create({
      data: {
        id: generateId('pay'),
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        memberId: policy.memberId,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
        amount: parsed.data.amount,
        date: normalizeDate(parsed.data.date),
        method: parsed.data.method,
        providerCode: provider.providerCode,
        providerName: provider.providerName,
        captureChannel: provider.captureChannel,
        status: parsed.data.status,
        reference,
        parlourId: policy.parlourId,
      },
    });

    let applicationSummary: Awaited<ReturnType<typeof applySuccessfulPayment>> | null = null;
    if (parsed.data.status === 'successful') {
      applicationSummary = await applySuccessfulPayment(tx, policy, payment, actorName);
    }

    if (parsed.data.status === 'successful' || parsed.data.status === 'failed') {
      await tx.communicationLog.create({
        data: {
          id: generateId('c'),
          parlourId: payment.parlourId,
          type: parsed.data.status === 'successful' ? 'email' : 'sms',
          recipientName: payment.memberName,
          recipientContact: parsed.data.status === 'successful' ? (member?.email || member?.phone || '') : (member?.phone || ''),
          subject: parsed.data.status === 'successful' ? `Payment Receipt - ${payment.reference}` : undefined,
          template: parsed.data.status === 'successful' ? 'Payment Receipt' : 'Payment Failed Notice',
          status: 'delivered',
          sentAt: normalizeDate(parsed.data.date),
          metadata: {
            policyId: policy.id,
            paymentId: payment.id,
            receiptId: applicationSummary?.receiptId,
            appliedDueDates: applicationSummary?.appliedDueDates || [],
          },
        },
      });
    }

    return { payment, applicationSummary };
  });

  await writeAuditLog(req, {
    action: 'PAYMENT_CAPTURED',
    entityType: 'Payment',
    entityId: result.payment.id,
    entityLabel: result.payment.reference,
    parlourId: result.payment.parlourId,
    details: [
      `amount=${result.payment.amount}`,
      `status=${result.payment.status}`,
      `method=${result.payment.method}`,
      `provider=${result.payment.providerCode}`,
      `channel=${result.payment.captureChannel}`,
      result.applicationSummary ? `applied=${result.applicationSummary.appliedAmount}` : null,
      result.applicationSummary ? `unapplied=${result.applicationSummary.unappliedAmount}` : null,
      result.applicationSummary ? `dueDates=${result.applicationSummary.appliedDueDates.join(',') || 'none'}` : null,
      result.applicationSummary ? `nextDueDate=${result.applicationSummary.nextDueDate}` : null,
      result.applicationSummary ? `arrears=${result.applicationSummary.arrearsAmount}` : null,
    ].filter(Boolean).join(';'),
  });

  return res.status(201).json(result.payment);
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
  await prisma.$transaction(async (tx) => {
    for (const policy of policies) {
      count += await ensureBillingEventsThrough(tx, policy, parsed.data.dueDate);
    }
  });

  await writeAuditLog(req, {
    action: 'BILLING_EVENTS_GENERATED',
    entityType: 'BillingEvent',
    entityId: generateId('be-job'),
    entityLabel: parsed.data.dueDate,
    parlourId: parsed.data.parlourId,
    details: `count=${count};mode=configured-schedule`,
  });

  return res.json({ created: count });
});
