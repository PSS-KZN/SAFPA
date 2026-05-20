"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
const createSubscriptionPlanSchema = zod_1.z.object({
    tier: zod_1.z.enum(['basic', 'standard', 'premium']),
    name: zod_1.z.string().min(2).max(50),
    amount: zod_1.z.number().int().min(0),
    description: zod_1.z.string().max(500).optional(),
    isActive: zod_1.z.boolean().default(true),
});
const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.omit({ tier: true }).partial();
exports.subscriptionsRouter = (0, express_1.Router)();
exports.subscriptionsRouter.get('/', async (req, res) => {
    await (0, subscription_1.ensureDefaultSubscriptionPlans)();
    const plans = await prisma_1.prisma.subscriptionPlan.findMany({
        orderBy: [{ amount: 'asc' }, { name: 'asc' }],
    });
    return res.json(plans);
});
exports.subscriptionsRouter.post('/', async (req, res) => {
    const parsed = createSubscriptionPlanSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid subscription plan payload',
            errors: parsed.error.flatten(),
        });
    }
    const existing = await prisma_1.prisma.subscriptionPlan.findUnique({
        where: { tier: parsed.data.tier },
    });
    if (existing) {
        return res.status(409).json({ message: 'A plan for this tier already exists. Update it instead.' });
    }
    const subscriptionPlan = await prisma_1.prisma.subscriptionPlan.create({
        data: {
            id: (0, id_1.generateId)('plan'),
            ...parsed.data,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'SUBSCRIPTION_PLAN_CREATED',
        entityType: 'SubscriptionPlan',
        entityId: subscriptionPlan.id,
        entityLabel: subscriptionPlan.name,
        details: `tier=${subscriptionPlan.tier}; amount=${subscriptionPlan.amount}`,
    });
    return res.status(201).json(subscriptionPlan);
});
exports.subscriptionsRouter.patch('/:id', async (req, res) => {
    const parsed = updateSubscriptionPlanSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid subscription plan payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const existingPlan = await prisma_1.prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
        if (!existingPlan) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }
        const subscriptionPlan = await prisma_1.prisma.subscriptionPlan.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        if (parsed.data.amount !== undefined) {
            await prisma_1.prisma.parlourSubscription.updateMany({
                where: { tier: existingPlan.tier },
                data: { amount: parsed.data.amount },
            });
        }
        await (0, audit_1.writeAuditLog)(req, {
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
    }
    catch {
        return res.status(404).json({ message: 'Subscription plan not found' });
    }
});
exports.subscriptionsRouter.delete('/:id', async (req, res) => {
    const existing = await prisma_1.prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Subscription plan not found' });
    }
    const assignments = await prisma_1.prisma.parlourSubscription.count({ where: { tier: existing.tier } });
    if (assignments > 0) {
        return res.status(409).json({ message: 'This plan is currently assigned to parlours. Reassign them before deleting the plan.' });
    }
    await prisma_1.prisma.subscriptionPlan.delete({ where: { id: req.params.id } });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'SUBSCRIPTION_PLAN_DELETED',
        entityType: 'SubscriptionPlan',
        entityId: existing.id,
        entityLabel: existing.name,
    });
    return res.status(204).send();
});
//# sourceMappingURL=subscriptions.js.map