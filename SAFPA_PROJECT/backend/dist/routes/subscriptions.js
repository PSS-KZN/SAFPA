"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const createSubscriptionSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(2),
    tier: zod_1.z.enum(['basic', 'standard', 'premium']),
    status: zod_1.z.enum(['active', 'paused', 'cancelled']).default('active'),
    billingCycle: zod_1.z.enum(['monthly', 'quarterly', 'annually']).default('monthly'),
    amount: zod_1.z.number().int().min(0),
    startDate: zod_1.z.string().min(8),
    endDate: zod_1.z.string().min(8).optional(),
    autoRenew: zod_1.z.boolean().default(true),
    notes: zod_1.z.string().max(500).optional(),
});
const updateSubscriptionSchema = createSubscriptionSchema
    .omit({ parlourId: true })
    .partial();
exports.subscriptionsRouter = (0, express_1.Router)();
exports.subscriptionsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const subscriptions = await prisma_1.prisma.parlourSubscription.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { updatedAt: 'desc' },
    });
    const parlours = await prisma_1.prisma.parlour.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.parlourId) } },
        select: { id: true, name: true },
    });
    const parlourNameById = new Map(parlours.map((parlour) => [parlour.id, parlour.name]));
    return res.json(subscriptions.map((subscription) => ({
        ...subscription,
        parlourName: parlourNameById.get(subscription.parlourId) || 'Unknown Parlour',
    })));
});
exports.subscriptionsRouter.post('/', async (req, res) => {
    const parsed = createSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid subscription payload',
            errors: parsed.error.flatten(),
        });
    }
    const parlour = await prisma_1.prisma.parlour.findUnique({ where: { id: parsed.data.parlourId } });
    if (!parlour) {
        return res.status(404).json({ message: 'Parlour not found' });
    }
    const existing = await prisma_1.prisma.parlourSubscription.findUnique({
        where: { parlourId: parsed.data.parlourId },
    });
    if (existing) {
        return res.status(409).json({ message: 'Parlour already has a subscription. Update it instead.' });
    }
    const subscription = await prisma_1.prisma.parlourSubscription.create({
        data: {
            id: (0, id_1.generateId)('sub'),
            ...parsed.data,
        },
    });
    if (parlour.tier !== parsed.data.tier) {
        await prisma_1.prisma.parlour.update({
            where: { id: parsed.data.parlourId },
            data: { tier: parsed.data.tier },
        });
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'SUBSCRIPTION_CREATED',
        entityType: 'Subscription',
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
exports.subscriptionsRouter.patch('/:id', async (req, res) => {
    const parsed = updateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid subscription payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const subscription = await prisma_1.prisma.parlourSubscription.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        if (parsed.data.tier) {
            await prisma_1.prisma.parlour.update({
                where: { id: subscription.parlourId },
                data: { tier: parsed.data.tier },
            });
        }
        const parlour = await prisma_1.prisma.parlour.findUnique({
            where: { id: subscription.parlourId },
            select: { id: true, name: true },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'SUBSCRIPTION_UPDATED',
            entityType: 'Subscription',
            entityId: subscription.id,
            entityLabel: parlour?.name || subscription.parlourId,
            parlourId: subscription.parlourId,
            details: [
                parsed.data.tier ? `tier=${parsed.data.tier}` : undefined,
                parsed.data.status ? `status=${parsed.data.status}` : undefined,
                parsed.data.amount !== undefined ? `amount=${parsed.data.amount}` : undefined,
            ]
                .filter(Boolean)
                .join('; '),
        });
        return res.json({
            ...subscription,
            parlourName: parlour?.name || 'Unknown Parlour',
        });
    }
    catch {
        return res.status(404).json({ message: 'Subscription not found' });
    }
});
exports.subscriptionsRouter.delete('/:id', async (req, res) => {
    const existing = await prisma_1.prisma.parlourSubscription.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Subscription not found' });
    }
    const parlour = await prisma_1.prisma.parlour.findUnique({ where: { id: existing.parlourId } });
    await prisma_1.prisma.parlourSubscription.delete({ where: { id: req.params.id } });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'SUBSCRIPTION_DELETED',
        entityType: 'Subscription',
        entityId: existing.id,
        entityLabel: parlour?.name || existing.parlourId,
        parlourId: existing.parlourId,
    });
    return res.status(204).send();
});
//# sourceMappingURL=subscriptions.js.map