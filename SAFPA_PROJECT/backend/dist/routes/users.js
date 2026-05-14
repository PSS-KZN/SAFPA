"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
const roleEnum = zod_1.z.enum([
    'safpa_admin',
    'parlour_owner',
    'branch_manager',
    'policy_admin',
    'collections_clerk',
    'operations_coordinator',
]);
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    role: roleEnum,
    parlourId: zod_1.z.string().min(1).optional(),
    branchId: zod_1.z.string().min(1).optional(),
    avatar: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'inactive']).default('active'),
});
const updateUserSchema = createUserSchema.partial();
const updateStatusSchema = zod_1.z.object({ status: zod_1.z.enum(['active', 'inactive']) });
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.get('/', async (req, res) => {
    const parlourId = req.query.parlourId;
    const users = await prisma_1.prisma.appUser.findMany({
        where: typeof parlourId === 'string' ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    res.json(users);
});
exports.usersRouter.post('/', async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid user payload',
            errors: parsed.error.flatten(),
        });
    }
    if (parsed.data.parlourId) {
        try {
            await (0, subscription_1.assertCreateLimit)(parsed.data.parlourId, 'users');
        }
        catch (error) {
            return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
        }
    }
    try {
        const user = await prisma_1.prisma.appUser.create({
            data: {
                id: `u${Date.now()}`,
                ...parsed.data,
            },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user.id,
            entityLabel: user.name,
            parlourId: user.parlourId || undefined,
        });
        return res.status(201).json(user);
    }
    catch {
        return res.status(409).json({ message: 'User with this email already exists' });
    }
});
exports.usersRouter.patch('/:id', async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid user payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const user = await prisma_1.prisma.appUser.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: user.id,
            entityLabel: user.name,
            parlourId: user.parlourId || undefined,
        });
        return res.json(user);
    }
    catch {
        return res.status(404).json({ message: 'User not found' });
    }
});
exports.usersRouter.patch('/:id/status', async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid status payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const user = await prisma_1.prisma.appUser.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'USER_STATUS_CHANGED',
            entityType: 'User',
            entityId: user.id,
            entityLabel: user.name,
            parlourId: user.parlourId || undefined,
            details: `status=${user.status}`,
        });
        return res.json(user);
    }
    catch {
        return res.status(404).json({ message: 'User not found' });
    }
});
//# sourceMappingURL=users.js.map