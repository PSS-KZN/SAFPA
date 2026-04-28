"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parloursRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const createParlourSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    region: zod_1.z.string().min(2),
    province: zod_1.z.string().min(2),
    tier: zod_1.z.enum(['basic', 'standard', 'premium']),
    status: zod_1.z.enum(['onboarding', 'active', 'suspended']).default('onboarding'),
    onboardingProgress: zod_1.z.number().int().min(0).max(100).default(0),
    totalMembers: zod_1.z.number().int().min(0).default(0),
    totalPolicies: zod_1.z.number().int().min(0).default(0),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(7),
    primaryColor: zod_1.z.string().min(4),
    joinedDate: zod_1.z.string().min(8),
    logo: zod_1.z.string().optional(),
});
exports.parloursRouter = (0, express_1.Router)();
exports.parloursRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const parlours = await prisma_1.prisma.parlour.findMany({
        where: parlourId ? { id: parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    res.json(parlours);
});
exports.parloursRouter.get('/:id', async (req, res) => {
    const parlour = await prisma_1.prisma.parlour.findUnique({
        where: { id: req.params.id },
    });
    if (!parlour) {
        return res.status(404).json({ message: 'Parlour not found' });
    }
    return res.json(parlour);
});
exports.parloursRouter.post('/', async (req, res) => {
    const parsed = createParlourSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid parlour payload',
            errors: parsed.error.flatten(),
        });
    }
    const id = `p${Date.now()}`;
    const parlour = await prisma_1.prisma.parlour.create({
        data: {
            id,
            ...parsed.data,
        },
    });
    await prisma_1.prisma.communicationTemplate.create({
        data: {
            id: (0, id_1.generateId)('tpl'),
            parlourId: parlour.id,
            name: 'Default Payment Reminder',
            type: 'sms',
            trigger: 'payment_reminder',
            body: 'Dear {member_name}, your premium is due on {due_date}.',
            isActive: true,
            createdOn: new Date().toISOString().slice(0, 10),
            lastUpdated: new Date().toISOString().slice(0, 10),
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PARLOUR_CREATED',
        entityType: 'Parlour',
        entityId: parlour.id,
        entityLabel: parlour.name,
    });
    return res.status(201).json(parlour);
});
exports.parloursRouter.patch('/:id', async (req, res) => {
    const parsed = createParlourSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid parlour payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const parlour = await prisma_1.prisma.parlour.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PARLOUR_UPDATED',
            entityType: 'Parlour',
            entityId: parlour.id,
            entityLabel: parlour.name,
        });
        return res.json(parlour);
    }
    catch {
        return res.status(404).json({ message: 'Parlour not found' });
    }
});
exports.parloursRouter.patch('/:id/status', async (req, res) => {
    const schema = zod_1.z.object({ status: zod_1.z.enum(['onboarding', 'active', 'suspended']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid status payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const parlour = await prisma_1.prisma.parlour.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PARLOUR_STATUS_CHANGED',
            entityType: 'Parlour',
            entityId: parlour.id,
            entityLabel: parlour.name,
            details: `status=${parlour.status}`,
        });
        return res.json(parlour);
    }
    catch {
        return res.status(404).json({ message: 'Parlour not found' });
    }
});
//# sourceMappingURL=parlours.js.map