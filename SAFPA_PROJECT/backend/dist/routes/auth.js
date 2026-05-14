"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const DEMO_PASSWORD = 'demo123';
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
    role: zod_1.z.enum(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator', 'policyholder_customer']),
});
exports.authRouter = (0, express_1.Router)();
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
    const user = await prisma_1.prisma.appUser.findFirst({
        where: {
            email: parsed.data.email,
            role: parsed.data.role,
            status: 'active',
        },
    });
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const memberId = await resolveCustomerMemberId(user);
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