"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communicationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const communications_1 = require("../lib/communications");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const sendMessageSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    type: zod_1.z.enum(['sms', 'email']),
    recipientName: zod_1.z.string().min(2),
    recipientContact: zod_1.z.string().min(2),
    trigger: zod_1.z.enum([
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
    templateId: zod_1.z.string().min(1).optional(),
    templateName: zod_1.z.string().min(2).optional(),
    subject: zod_1.z.string().optional(),
    message: zod_1.z.string().min(2),
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
    const record = await (0, communications_1.dispatchCommunication)(prisma_1.prisma, {
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
        if (!member || !member.phone) {
            continue;
        }
        await (0, communications_1.dispatchCommunication)(prisma_1.prisma, {
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