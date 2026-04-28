"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const loginSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
});
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.userId && !parsed.data.email)) {
        return res.status(400).json({ message: 'Provide userId or email' });
    }
    const user = await prisma_1.prisma.appUser.findFirst({
        where: {
            ...(parsed.data.userId ? { id: parsed.data.userId } : {}),
            ...(parsed.data.email ? { email: parsed.data.email } : {}),
            status: 'active',
        },
    });
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({
        token: user.id,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            parlourId: user.parlourId,
            branchId: user.branchId,
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
    return res.json({
        authenticated: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            parlourId: user.parlourId,
            branchId: user.branchId,
        },
    });
});
//# sourceMappingURL=auth.js.map