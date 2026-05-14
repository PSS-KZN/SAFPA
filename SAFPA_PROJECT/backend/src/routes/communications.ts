import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const sendMessageSchema = z.object({
  parlourId: z.string().min(1),
  type: z.enum(['sms', 'email']),
  recipientName: z.string().min(2),
  recipientContact: z.string().min(2),
  subject: z.string().optional(),
  template: z.string().min(2),
  status: z.enum(['sent', 'delivered', 'failed', 'pending']).default('delivered'),
  sentAt: z.string().optional(),
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

  const record = await prisma.communicationLog.create({
    data: {
      id: generateId('c'),
      parlourId: parsed.data.parlourId,
      type: parsed.data.type,
      recipientName: parsed.data.recipientName,
      recipientContact: parsed.data.recipientContact,
      subject: parsed.data.subject,
      template: parsed.data.template,
      status: parsed.data.status,
      sentAt: parsed.data.sentAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      metadata: parsed.data.metadata as Prisma.InputJsonValue | undefined,
    },
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
    if (!member) {
      continue;
    }

    await prisma.communicationLog.create({
      data: {
        id: generateId('c'),
        parlourId: parsed.data.parlourId,
        type: 'sms',
        recipientName: `${member.firstName} ${member.lastName}`,
        recipientContact: member.phone,
        template: 'Payment Reminder',
        status: 'delivered',
        sentAt: `${dueDate} 08:00`,
        metadata: {
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          amount: policy.premiumAmount,
        },
      },
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
