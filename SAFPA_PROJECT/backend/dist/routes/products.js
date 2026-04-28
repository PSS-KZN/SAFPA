"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
const statusTransitionRuleSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional();
const createProductSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().min(2),
    premiumFrom: zod_1.z.number().int().nonnegative(),
    coverFrom: zod_1.z.number().int().nonnegative(),
    waitingPeriodDays: zod_1.z.number().int().nonnegative(),
    maxDependants: zod_1.z.number().int().nonnegative(),
    isActive: zod_1.z.boolean().default(true),
    allowedStatusTransitions: statusTransitionRuleSchema,
});
const updateProductSchema = createProductSchema.omit({ parlourId: true }).partial();
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const products = await prisma_1.prisma.product.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(products);
});
exports.productsRouter.post('/', async (req, res) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid product payload', errors: parsed.error.flatten() });
    }
    try {
        await (0, subscription_1.assertCreateLimit)(parsed.data.parlourId, 'products');
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const product = await prisma_1.prisma.product.create({
        data: {
            id: (0, id_1.generateId)('pr'),
            ...parsed.data,
            allowedStatusTransitions: parsed.data.allowedStatusTransitions,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product.id,
        entityLabel: product.name,
        parlourId: product.parlourId,
    });
    return res.status(201).json(product);
});
exports.productsRouter.patch('/:id', async (req, res) => {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid product payload', errors: parsed.error.flatten() });
    }
    try {
        const data = { ...parsed.data };
        if (Object.prototype.hasOwnProperty.call(data, 'allowedStatusTransitions')) {
            data.allowedStatusTransitions = data.allowedStatusTransitions;
        }
        const product = await prisma_1.prisma.product.update({
            where: { id: req.params.id },
            data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PRODUCT_UPDATED',
            entityType: 'Product',
            entityId: product.id,
            entityLabel: product.name,
            parlourId: product.parlourId,
        });
        return res.json(product);
    }
    catch {
        return res.status(404).json({ message: 'Product not found' });
    }
});
exports.productsRouter.patch('/:id/status', async (req, res) => {
    const statusSchema = zod_1.z.object({ isActive: zod_1.z.boolean() });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
    }
    try {
        const product = await prisma_1.prisma.product.update({
            where: { id: req.params.id },
            data: { isActive: parsed.data.isActive },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PRODUCT_STATUS_CHANGED',
            entityType: 'Product',
            entityId: product.id,
            entityLabel: product.name,
            parlourId: product.parlourId,
            details: `isActive=${String(product.isActive)}`,
        });
        return res.json(product);
    }
    catch {
        return res.status(404).json({ message: 'Product not found' });
    }
});
//# sourceMappingURL=products.js.map