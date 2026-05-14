"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communicationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const sendMessageSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    type: zod_1.z.enum(['sms', 'email']),
    recipientName: zod_1.z.string().min(2),
    recipientContact: zod_1.z.string().min(2),
    subject: zod_1.z.string().optional(),
    template: zod_1.z.string().min(2),
    status: zod_1.z.enum(['sent', 'delivered', 'failed', 'pending']).default('delivered'),
    sentAt: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
const runRemindersSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    dueDate: zod_1.z.string().optional(),
});
exports.communicationsRouter = (0, express_1.Router)();
exports.communicationsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const actor = req.actor;
    if (actor?.role === 'policyholder_customer') {
        if (!actor.memberId) {
            return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
        }
        const member = await prisma_1.prisma.member.findUnique({ where: { id: actor.memberId } });
        if (!member || (actor.parlourId && member.parlourId !== actor.parlourId)) {
            return res.json([]);
        }
        const records = await prisma_1.prisma.communicationLog.findMany({
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
    const records = await prisma_1.prisma.communicationLog.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(records);
});
exports.communicationsRouter.post('/send', async (req, res) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid communication payload', errors: parsed.error.flatten() });
    }
    const record = await prisma_1.prisma.communicationLog.create({
        data: {
            id: (0, id_1.generateId)('c'),
            parlourId: parsed.data.parlourId,
            type: parsed.data.type,
            recipientName: parsed.data.recipientName,
            recipientContact: parsed.data.recipientContact,
            subject: parsed.data.subject,
            template: parsed.data.template,
            status: parsed.data.status,
            sentAt: parsed.data.sentAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
            metadata: parsed.data.metadata,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'COMMUNICATION_SENT',
        entityType: 'Communication',
        entityId: record.id,
        entityLabel: `${record.type} to ${record.recipientName}`,
        parlourId: record.parlourId,
    });
    return res.status(201).json(record);
});
exports.communicationsRouter.post('/run-reminders', async (req, res) => {
    const parsed = runRemindersSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid reminder payload', errors: parsed.error.flatten() });
    }
    const dueDate = parsed.data.dueDate || new Date().toISOString().slice(0, 10);
    const policies = await prisma_1.prisma.policy.findMany({
        where: {
            parlourId: parsed.data.parlourId,
            nextDueDate: { lte: dueDate },
            status: { in: ['active', 'suspended', 'lapsed'] },
        },
    });
    let sent = 0;
    for (const policy of policies) {
        const member = await prisma_1.prisma.member.findUnique({ where: { id: policy.memberId } });
        if (!member) {
            continue;
        }
        await prisma_1.prisma.communicationLog.create({
            data: {
                id: (0, id_1.generateId)('c'),
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
    await (0, audit_1.writeAuditLog)(req, {
        action: 'REMINDERS_DISPATCHED',
        entityType: 'Communication',
        entityId: (0, id_1.generateId)('reminder-run'),
        entityLabel: dueDate,
        parlourId: parsed.data.parlourId,
        details: `sent=${sent}`,
    });
    return res.json({ sent, dueDate });
});
//# sourceMappingURL=communications.js.map