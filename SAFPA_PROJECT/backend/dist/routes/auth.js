"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const demoReset_1 = require("../lib/demoReset");
const prisma_1 = require("../lib/prisma");
const usage_1 = require("../lib/usage");
const DEMO_PASSWORD = 'demo123';
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
    role: zod_1.z.enum(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator', 'policyholder_customer']),
});
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/demo-session/reset', async (_req, res) => {
    try {
        await (0, demoReset_1.resetDemoSessionData)();
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : 'Failed to reset demo session data',
        });
    }
});
exports.authRouter.get('/demo-users', async (req, res) => {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const users = await prisma_1.prisma.appUser.findMany({
        where: {
            status: 'active',
            ...(role ? { role } : {}),
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            parlourId: true,
            branchId: true,
            memberId: true,
            status: true,
        },
    });
    return res.json(users);
});
async function resolvePolicyholderUser(email) {
    const member = await prisma_1.prisma.member.findFirst({
        where: { email },
        select: {
            id: true,
            parlourId: true,
            branchId: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    });
    if (!member) {
        return null;
    }
    const displayName = `${member.firstName} ${member.lastName}`.trim();
    const existing = await prisma_1.prisma.appUser.findFirst({
        where: {
            OR: [{ email }, { memberId: member.id }],
        },
    });
    if (existing) {
        return prisma_1.prisma.appUser.update({
            where: { id: existing.id },
            data: {
                name: displayName,
                email,
                role: 'policyholder_customer',
                parlourId: member.parlourId,
                branchId: member.branchId,
                memberId: member.id,
                status: 'active',
            },
        });
    }
    return prisma_1.prisma.appUser.create({
        data: {
            id: `u-customer-${member.id}`,
            name: displayName,
            email,
            role: 'policyholder_customer',
            parlourId: member.parlourId,
            branchId: member.branchId,
            memberId: member.id,
            status: 'active',
        },
    });
}
async function resolveCustomerMemberId(user) {
    if (user.role !== 'policyholder_customer') {
        return user.memberId || undefined;
    }
    if (user.memberId) {
        return user.memberId;
    }
    const member = await prisma_1.prisma.member.findFirst({
        where: {
            email: user.email,
            ...(user.parlourId ? { parlourId: user.parlourId } : {}),
        },
        select: { id: true },
    });
    return member?.id;
}
exports.authRouter.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Provide email, password, and role' });
    }
    if (parsed.data.password !== DEMO_PASSWORD) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    let user = await prisma_1.prisma.appUser.findFirst({
        where: {
            email: parsed.data.email,
            role: parsed.data.role,
            status: 'active',
        },
    });
    if (!user && parsed.data.role === 'policyholder_customer') {
        user = await resolvePolicyholderUser(parsed.data.email);
    }
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const memberId = await resolveCustomerMemberId(user);
    await (0, usage_1.writeUsageEvent)(req, {
        module: 'auth',
        eventType: 'login_success',
        parlourId: user.parlourId || undefined,
        branchId: user.branchId || undefined,
        entityType: 'User',
        entityId: user.id,
        actor: {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
        },
    });
    return res.json({
        token: user.id,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            parlourId: user.parlourId,
            branchId: user.branchId,
            memberId,
        },
    });
});
exports.authRouter.get('/session', async (req, res) => {
    const userId = req.header('x-user-id') || (req.header('authorization')?.replace(/^Bearer\s+/i, '') || '');
    if (!userId) {
        return res.status(200).json({ authenticated: false });
    }
    const user = await prisma_1.prisma.appUser.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') {
        return res.status(200).json({ authenticated: false });
    }
    const memberId = await resolveCustomerMemberId(user);
    return res.json({
        authenticated: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            parlourId: user.parlourId,
            branchId: user.branchId,
            memberId,
        },
    });
});
//# sourceMappingURL=auth.js.map