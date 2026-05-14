import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { dispatchCommunication } from '../lib/communications';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const sendMessageSchema = z.object({
  parlourId: z.string().min(1),
  type: z.enum(['sms', 'email']),
  recipientName: z.string().min(2),
  recipientContact: z.string().min(2),
  trigger: z.enum([
    'payment_reminder',
    'payment_receipt',
    'payment_failed_notice',
    'policy_activated',
    'policy_suspended',
    'policy_lapsed',
    'policy_reinstated',
    'policy_cancelled',
    'funeral_case_update',
    'welcome',
    'custom',
  ]).default('custom'),
  templateId: z.string().min(1).optional(),
  templateName: z.string().min(2).optional(),
  subject: z.string().optional(),
  message: z.string().min(2),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const runRemindersSchema = z.object({
  parlourId: z.string().min(1),
  dueDate: z.string().optional(),
});

export const communicationsRouter = Router();

communicationsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const actor = req.actor;

  if (actor?.role === 'policyholder_customer') {
    if (!actor.memberId) {
      return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
    }

    const member = await prisma.member.findUnique({ where: { id: actor.memberId } });
    if (!member || (actor.parlourId && member.parlourId !== actor.parlourId)) {
      return res.json([]);
    }

    const records = await prisma.communicationLog.findMany({
      where: {
        ...(parlourId ? { parlourId } : {}),
        OR: [
          { recipientContact: member.phone },
          { recipientContact: member.email },
          { recipientName: `${member.firstName} ${member.lastName}`.trim() },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(records);
  }

  const records = await prisma.communicationLog.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(records);
});

communicationsRouter.post('/send', async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid communication payload', errors: parsed.error.flatten() });
  }

  const record = await dispatchCommunication(prisma, {
    parlourId: parsed.data.parlourId,
    type: parsed.data.type,
    recipientName: parsed.data.recipientName,
    recipientContact: parsed.data.recipientContact,
    trigger: parsed.data.trigger,
    templateId: parsed.data.templateId,
    templateName: parsed.data.templateName,
    subject: parsed.data.subject,
    body: parsed.data.message,
    metadata: parsed.data.metadata,
    createdBy: req.actor?.userName || req.actor?.userId,
  });

  await writeAuditLog(req, {
    action: 'COMMUNICATION_SENT',
    entityType: 'Communication',
    entityId: record.id,
    entityLabel: `${record.type} to ${record.recipientName}`,
    parlourId: record.parlourId,
  });

  return res.status(201).json(record);
});

communicationsRouter.post('/run-reminders', async (req, res) => {
  const parsed = runRemindersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid reminder payload', errors: parsed.error.flatten() });
  }

  const dueDate = parsed.data.dueDate || new Date().toISOString().slice(0, 10);
  const policies = await prisma.policy.findMany({
    where: {
      parlourId: parsed.data.parlourId,
      nextDueDate: { lte: dueDate },
      status: { in: ['active', 'suspended', 'lapsed'] },
    },
  });

  let sent = 0;
  for (const policy of policies) {
    const member = await prisma.member.findUnique({ where: { id: policy.memberId } });
    if (!member || !member.phone) {
      continue;
    }

    await dispatchCommunication(prisma, {
      parlourId: parsed.data.parlourId,
      type: 'sms',
      recipientName: `${member.firstName} ${member.lastName}`.trim(),
      recipientContact: member.phone,
      trigger: 'payment_reminder',
      body: 'Dear {member_name}, your premium of R{amount} for policy {policy_number} is due on {due_date}. Please ensure funds are available.',
      variables: {
        member_name: `${member.firstName} ${member.lastName}`.trim(),
        amount: policy.premiumAmount,
        policy_number: policy.policyNumber,
        due_date: dueDate,
        contact_number: member.phone,
      },
      metadata: {
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        amount: policy.premiumAmount,
        dueDate,
        relatedEntityType: 'policy',
        relatedEntityId: policy.id,
      },
      createdBy: req.actor?.userName || req.actor?.userId,
    });
    sent += 1;
  }

  await writeAuditLog(req, {
    action: 'REMINDERS_DISPATCHED',
    entityType: 'Communication',
    entityId: generateId('reminder-run'),
    entityLabel: dueDate,
    parlourId: parsed.data.parlourId,
    details: `sent=${sent}`,
  });

  return res.json({ sent, dueDate });
});
