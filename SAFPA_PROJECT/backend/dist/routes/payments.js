"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const createPaymentSchema = zod_1.z.object({
    policyId: zod_1.z.string().min(1),
    amount: zod_1.z.number().int().positive(),
    date: zod_1.z.string().min(8),
    method: zod_1.z.enum(['debit_order', 'eft', 'card', 'cash']),
    status: zod_1.z.enum(['successful', 'failed', 'pending', 'reversed']).default('successful'),
    reference: zod_1.z.string().optional(),
});
const reconciliationImportSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(3),
    importedBy: zod_1.z.string().min(2),
    matched: zod_1.z.number().int().nonnegative(),
    exceptions: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(['completed', 'processing', 'failed']).default('completed'),
    details: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const payments = await prisma_1.prisma.paymentTransaction.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(payments);
});
exports.paymentsRouter.post('/', async (req, res) => {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid payment payload', errors: parsed.error.flatten() });
    }
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: parsed.data.policyId } });
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
    let arrearsAmount = policy.arrearsAmount;
    if (parsed.data.status === 'successful') {
        arrearsAmount = Math.max(0, policy.arrearsAmount - parsed.data.amount);
    }
    const policyUpdateData = {
        arrearsAmount,
    };
    if (parsed.data.status === 'successful') {
        policyUpdateData.lastPaymentDate = parsed.data.date;
    }
    await prisma_1.prisma.policy.update({
        where: { id: policy.id },
        data: policyUpdateData,
    });
    await prisma_1.prisma.communicationLog.create({
        data: {
            id: (0, id_1.generateId)('c'),
            parlourId: payment.parlourId,
            type: 'sms',
            recipientName: payment.memberName,
            recipientContact: member?.phone || '',
            template: parsed.data.status === 'successful' ? 'Payment Receipt' : 'Payment Failed Notice',
            status: 'delivered',
            sentAt: parsed.data.date,
            metadata: {
                policyId: policy.id,
                paymentId: payment.id,
            },
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PAYMENT_CAPTURED',
        entityType: 'Payment',
        entityId: payment.id,
        entityLabel: payment.reference,
        parlourId: payment.parlourId,
        details: `amount=${payment.amount};status=${payment.status}`,
    });
    return res.status(201).json(payment);
});
exports.paymentsRouter.get('/reconciliation-imports', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const imports = await prisma_1.prisma.reconciliationImport.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(imports);
});
exports.paymentsRouter.post('/reconciliation-imports', async (req, res) => {
    const parsed = reconciliationImportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid reconciliation payload', errors: parsed.error.flatten() });
    }
    const importedAt = new Date().toISOString().slice(0, 10);
    const record = await prisma_1.prisma.reconciliationImport.create({
        data: {
            id: (0, id_1.generateId)('rec'),
            parlourId: parsed.data.parlourId,
            fileName: parsed.data.fileName,
            importedBy: parsed.data.importedBy,
            importedAt,
            matched: parsed.data.matched,
            exceptions: parsed.data.exceptions,
            status: parsed.data.status,
            details: parsed.data.details || [],
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'RECON_FILE_IMPORTED',
        entityType: 'Reconciliation',
        entityId: record.id,
        entityLabel: record.fileName,
        parlourId: record.parlourId,
        details: `matched=${record.matched};exceptions=${record.exceptions}`,
    });
    return res.status(201).json(record);
});
exports.paymentsRouter.post('/billing-events/generate', async (req, res) => {
    const schema = zod_1.z.object({ parlourId: zod_1.z.string().min(1), dueDate: zod_1.z.string().min(8) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    }
    const policies = await prisma_1.prisma.policy.findMany({
        where: {
            parlourId: parsed.data.parlourId,
            status: { in: ['active', 'suspended'] },
        },
    });
    let count = 0;
    for (const policy of policies) {
        await prisma_1.prisma.billingEvent.create({
            data: {
                id: (0, id_1.generateId)('be'),
                parlourId: policy.parlourId,
                policyId: policy.id,
                policyNumber: policy.policyNumber,
                dueDate: parsed.data.dueDate,
                amount: policy.premiumAmount,
                status: 'pending',
            },
        });
        count += 1;
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'BILLING_EVENTS_GENERATED',
        entityType: 'BillingEvent',
        entityId: (0, id_1.generateId)('be-job'),
        entityLabel: parsed.data.dueDate,
        parlourId: parsed.data.parlourId,
        details: `count=${count}`,
    });
    return res.json({ created: count });
});
//# sourceMappingURL=payments.js.map