"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
const createBranchSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2),
    address: zod_1.z.string().min(2),
    city: zod_1.z.string().min(2),
    province: zod_1.z.string().min(2),
    manager: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(7),
    status: zod_1.z.enum(['active', 'inactive']).default('active'),
});
const updateBranchSchema = createBranchSchema.omit({ parlourId: true }).partial();
const updateStatusSchema = zod_1.z.object({ status: zod_1.z.enum(['active', 'inactive']) });
exports.branchesRouter = (0, express_1.Router)();
exports.branchesRouter.get('/', async (req, res) => {
    const parlourId = req.query.parlourId;
    const branches = await prisma_1.prisma.branch.findMany({
        where: typeof parlourId === 'string' ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    res.json(branches);
});
exports.branchesRouter.post('/', async (req, res) => {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid branch payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        await (0, subscription_1.assertCreateLimit)(parsed.data.parlourId, 'branches');
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const branch = await prisma_1.prisma.branch.create({
        data: {
            id: `b${Date.now()}`,
            ...parsed.data,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'BRANCH_CREATED',
        entityType: 'Branch',
        entityId: branch.id,
        entityLabel: branch.name,
        parlourId: branch.parlourId,
    });
    return res.status(201).json(branch);
});
exports.branchesRouter.patch('/:id', async (req, res) => {
    const parsed = updateBranchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid branch payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const branch = await prisma_1.prisma.branch.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'BRANCH_UPDATED',
            entityType: 'Branch',
            entityId: branch.id,
            entityLabel: branch.name,
            parlourId: branch.parlourId,
        });
        return res.json(branch);
    }
    catch {
        return res.status(404).json({ message: 'Branch not found' });
    }
});
exports.branchesRouter.patch('/:id/status', async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid status payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const branch = await prisma_1.prisma.branch.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'BRANCH_STATUS_CHANGED',
            entityType: 'Branch',
            entityId: branch.id,
            entityLabel: branch.name,
            parlourId: branch.parlourId,
            details: `status=${branch.status}`,
        });
        return res.json(branch);
    }
    catch {
        return res.status(404).json({ message: 'Branch not found' });
    }
});
//# sourceMappingURL=branches.js.map