"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policiesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const policyStatusEnum = zod_1.z.enum([
    'draft',
    'pending',
    'active',
    'suspended',
    'lapsed',
    'reinstated',
    'cancelled',
    'closed',
]);
const createPolicySchema = zod_1.z.object({
    memberId: zod_1.z.string().min(1),
    parlourId: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1),
    productName: zod_1.z.string().min(1),
    status: policyStatusEnum,
    premiumAmount: zod_1.z.number().int().positive(),
    billingFrequency: zod_1.z.enum(['monthly', 'weekly', 'annually']),
    nextDueDate: zod_1.z.string().min(8),
    startDate: zod_1.z.string().min(8),
    coverAmount: zod_1.z.number().int().positive(),
    arrearsAmount: zod_1.z.number().int().nonnegative().default(0),
    lastPaymentDate: zod_1.z.string().optional(),
});
const updatePolicySchema = createPolicySchema.omit({ memberId: true, parlourId: true, productId: true }).partial();
const updateStatusSchema = zod_1.z.object({ status: policyStatusEnum });
const recordPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().int().positive(),
    method: zod_1.z.enum(['debit_order', 'eft', 'card', 'cash']),
    status: zod_1.z.enum(['successful', 'failed', 'pending', 'reversed']).default('successful'),
    date: zod_1.z.string().min(8),
    reference: zod_1.z.string().optional(),
});
const allowedTransitions = {
    draft: ['pending', 'cancelled'],
    pending: ['active', 'cancelled'],
    active: ['suspended', 'lapsed', 'closed', 'cancelled'],
    suspended: ['active', 'reinstated', 'lapsed', 'cancelled'],
    lapsed: ['reinstated', 'closed'],
    reinstated: ['active', 'suspended', 'cancelled'],
    cancelled: [],
    closed: [],
};
function canTransition(from, to) {
    if (from === to) {
        return true;
    }
    return (allowedTransitions[from] || []).includes(to);
}
exports.policiesRouter = (0, express_1.Router)();
exports.policiesRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const policies = await prisma_1.prisma.policy.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(policies);
});
exports.policiesRouter.get('/:id', async (req, res) => {
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
    }
    return res.json(policy);
});
exports.policiesRouter.post('/', async (req, res) => {
    const parsed = createPolicySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
    }
    const policy = await prisma_1.prisma.policy.create({
        data: {
            id: (0, id_1.generateId)('pol'),
            policyNumber: `POL-${Date.now()}`,
            ...parsed.data,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'POLICY_CREATED',
        entityType: 'Policy',
        entityId: policy.id,
        entityLabel: policy.policyNumber,
        parlourId: policy.parlourId,
    });
    return res.status(201).json(policy);
});
exports.policiesRouter.patch('/:id', async (req, res) => {
    const parsed = updatePolicySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
    }
    try {
        const existing = await prisma_1.prisma.policy.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        if (parsed.data.status && !canTransition(existing.status, parsed.data.status)) {
            return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
        }
        const policy = await prisma_1.prisma.policy.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'POLICY_UPDATED',
            entityType: 'Policy',
            entityId: policy.id,
            entityLabel: policy.policyNumber,
            parlourId: policy.parlourId,
        });
        return res.json(policy);
    }
    catch {
        return res.status(404).json({ message: 'Policy not found' });
    }
});
exports.policiesRouter.patch('/:id/status', async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Policy not found' });
    }
    if (!canTransition(existing.status, parsed.data.status)) {
        return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
    }
    const updated = await prisma_1.prisma.policy.update({
        where: { id: req.params.id },
        data: { status: parsed.data.status },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'POLICY_STATUS_CHANGED',
        entityType: 'Policy',
        entityId: updated.id,
        entityLabel: updated.policyNumber,
        parlourId: updated.parlourId,
        details: `status=${updated.status}`,
    });
    return res.json(updated);
});
exports.policiesRouter.post('/:id/record-payment', async (req, res) => {
    const parsed = recordPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid payment payload', errors: parsed.error.flatten() });
    }
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
    }
    const member = await prisma_1.prisma.member.findUnique({ where: { id: policy.memberId } });
    const reference = parsed.data.reference || `PAY-${Date.now()}`;
    const payment = await prisma_1.prisma.paymentTransaction.create({
        data: {
            id: (0, id_1.generateId)('pay'),
            policyId: policy.id,
            policyNumber: policy.policyNumber,
            memberId: policy.memberId,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
            amount: parsed.data.amount,
            date: parsed.data.date,
            method: parsed.data.method,
            status: parsed.data.status,
            reference,
            parlourId: policy.parlourId,
        },
    });
    let nextArrears = policy.arrearsAmount;
    let nextStatus = policy.status;
    if (parsed.data.status === 'successful') {
        nextArrears = Math.max(0, policy.arrearsAmount - parsed.data.amount);
        if (nextArrears === 0 && (policy.status === 'suspended' || policy.status === 'lapsed')) {
            nextStatus = 'active';
        }
    }
    const updatedPolicy = await prisma_1.prisma.policy.update({
        where: { id: policy.id },
        data: {
            arrearsAmount: nextArrears,
            lastPaymentDate: parsed.data.date,
            status: nextStatus,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: payment.id,
        entityLabel: `${payment.reference}`,
        parlourId: payment.parlourId,
        details: `policyId=${policy.id};status=${payment.status}`,
    });
    return res.json({ payment, policy: updatedPolicy });
});
//# sourceMappingURL=policies.js.map