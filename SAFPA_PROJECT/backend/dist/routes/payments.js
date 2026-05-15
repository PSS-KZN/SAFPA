"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const communications_1 = require("../lib/communications");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const usage_1 = require("../lib/usage");
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
const staticProvider = {
    code: 'safpa_mvp_static',
    name: 'SAFPA Static Provider',
    mode: 'static',
    status: 'configured',
    methods: ['debit_order', 'eft', 'card'],
    notes: 'Static MVP provider placeholder until a live gateway is enabled.',
};
exports.paymentsRouter = (0, express_1.Router)();
function resolvePaymentProvider(method) {
    if (method === 'cash') {
        return {
            providerCode: 'manual_branch_capture',
            providerName: 'Manual Branch Capture',
            captureChannel: 'branch_manual',
        };
    }
    return {
        providerCode: staticProvider.code,
        providerName: staticProvider.name,
        captureChannel: 'provider_static',
    };
}
function normalizeDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
}
function compareDate(left, right) {
    return normalizeDate(left).localeCompare(normalizeDate(right));
}
function addBillingFrequency(date, frequency) {
    const normalized = normalizeDate(date);
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    if (frequency === 'weekly') {
        parsed.setUTCDate(parsed.getUTCDate() + 7);
    }
    else if (frequency === 'annually') {
        parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
    }
    else {
        parsed.setUTCMonth(parsed.getUTCMonth() + 1);
    }
    return parsed.toISOString().slice(0, 10);
}
function isSettled(status) {
    return status === 'paid' || status === 'reconciled';
}
function receiptStoragePath(paymentId) {
    return `receipt://${paymentId}`;
}
async function ensureBillingEventsThrough(tx, policy, throughDate) {
    const upperBound = normalizeDate(throughDate);
    const existingEvents = await tx.billingEvent.findMany({
        where: {
            policyId: policy.id,
            dueDate: { lte: upperBound },
        },
        select: { dueDate: true },
    });
    const existingDueDates = new Set(existingEvents.map((event) => normalizeDate(event.dueDate)));
    let created = 0;
    let cursor = normalizeDate(policy.nextDueDate);
    while (compareDate(cursor, upperBound) <= 0) {
        if (!existingDueDates.has(cursor)) {
            await tx.billingEvent.create({
                data: {
                    id: (0, id_1.generateId)('be'),
                    parlourId: policy.parlourId,
                    policyId: policy.id,
                    policyNumber: policy.policyNumber,
                    dueDate: cursor,
                    amount: policy.premiumAmount,
                    status: 'pending',
                },
            });
            existingDueDates.add(cursor);
            created += 1;
        }
        cursor = addBillingFrequency(cursor, policy.billingFrequency);
    }
    return created;
}
async function createReceiptRecord(tx, payment, actorName) {
    const receipt = await tx.documentRecord.create({
        data: {
            id: (0, id_1.generateId)('doc'),
            parlourId: payment.parlourId,
            name: `Receipt-${payment.reference}.txt`,
            type: 'receipt',
            entityType: 'Payment',
            entityId: payment.id,
            uploadedBy: actorName,
            uploadedAt: payment.date,
            size: `${String(payment.amount).length + payment.reference.length + 32} B`,
            storagePath: receiptStoragePath(payment.id),
            mimeType: 'text/plain',
        },
    });
    return receipt.id;
}
async function applySuccessfulPayment(tx, policy, payment, actorName) {
    const coverageDate = compareDate(payment.date, policy.nextDueDate) >= 0 ? payment.date : policy.nextDueDate;
    await ensureBillingEventsThrough(tx, policy, coverageDate);
    let events = await tx.billingEvent.findMany({
        where: { policyId: policy.id },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    let remaining = payment.amount;
    const appliedDueDates = [];
    let latestKnownDueDate = events.length > 0 ? normalizeDate(events[events.length - 1].dueDate) : normalizeDate(policy.nextDueDate);
    while (remaining > 0) {
        let target = events.find((event) => !isSettled(event.status) && event.settledAmount < event.amount);
        if (!target) {
            latestKnownDueDate = addBillingFrequency(latestKnownDueDate, policy.billingFrequency);
            target = await tx.billingEvent.create({
                data: {
                    id: (0, id_1.generateId)('be'),
                    parlourId: policy.parlourId,
                    policyId: policy.id,
                    policyNumber: policy.policyNumber,
                    dueDate: latestKnownDueDate,
                    amount: policy.premiumAmount,
                    status: 'pending',
                },
            });
            events = [...events, target];
        }
        const outstandingAmount = target.amount - target.settledAmount;
        const applied = Math.min(remaining, outstandingAmount);
        const nextSettledAmount = target.settledAmount + applied;
        const nextStatus = nextSettledAmount >= target.amount ? 'paid' : 'partial';
        const updated = await tx.billingEvent.update({
            where: { id: target.id },
            data: {
                settledAmount: nextSettledAmount,
                settledAt: nextStatus === 'paid' ? normalizeDate(payment.date) : null,
                lastPaymentReference: payment.reference,
                status: nextStatus,
            },
        });
        events = events.map((event) => (event.id === updated.id ? updated : event));
        if (!appliedDueDates.includes(normalizeDate(updated.dueDate))) {
            appliedDueDates.push(normalizeDate(updated.dueDate));
        }
        remaining -= applied;
        if (nextStatus === 'partial') {
            break;
        }
    }
    const today = normalizeDate(new Date().toISOString());
    const outstandingEvents = events.filter((event) => !isSettled(event.status) || event.settledAmount < event.amount);
    const nextOutstanding = outstandingEvents[0] ?? null;
    const nextDueDate = nextOutstanding ? normalizeDate(nextOutstanding.dueDate) : addBillingFrequency(latestKnownDueDate, policy.billingFrequency);
    const arrearsAmount = outstandingEvents.reduce((sum, event) => {
        if (compareDate(event.dueDate, today) < 0) {
            return sum + Math.max(0, event.amount - event.settledAmount);
        }
        return sum;
    }, 0);
    await tx.policy.update({
        where: { id: policy.id },
        data: {
            arrearsAmount,
            lastPaymentDate: normalizeDate(payment.date),
            nextDueDate,
        },
    });
    const receiptId = await createReceiptRecord(tx, payment, actorName);
    return {
        appliedAmount: payment.amount - remaining,
        unappliedAmount: remaining,
        appliedDueDates,
        receiptId,
        nextDueDate,
        arrearsAmount,
    };
}
exports.paymentsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const actor = req.actor;
    if (actor?.role === 'policyholder_customer') {
        if (!actor.memberId) {
            return res.status(403).json({ message: 'Customer account is not linked to a member profile' });
        }
        const payments = await prisma_1.prisma.paymentTransaction.findMany({
            where: {
                memberId: actor.memberId,
                ...(parlourId ? { parlourId } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(payments);
    }
    const payments = await prisma_1.prisma.paymentTransaction.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(payments);
});
exports.paymentsRouter.get('/providers', async (_req, res) => {
    return res.json({
        providers: [
            staticProvider,
            {
                code: 'manual_branch_capture',
                name: 'Manual Branch Capture',
                mode: 'manual',
                status: 'configured',
                methods: ['cash'],
                notes: 'Used for over-the-counter branch payments and back-office capture.',
            },
        ],
    });
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
    if (req.actor?.role === 'policyholder_customer' && req.actor.memberId !== policy.memberId) {
        return res.status(403).json({ message: 'Customers may only pay against their own policies' });
    }
    const member = await prisma_1.prisma.member.findUnique({ where: { id: policy.memberId } });
    const reference = parsed.data.reference || `PAY-${Date.now()}`;
    const provider = resolvePaymentProvider(parsed.data.method);
    const actorName = req.actor?.userName || req.headers['x-user-name'] || 'System';
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const payment = await tx.paymentTransaction.create({
            data: {
                id: (0, id_1.generateId)('pay'),
                policyId: policy.id,
                policyNumber: policy.policyNumber,
                memberId: policy.memberId,
                memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown Member',
                amount: parsed.data.amount,
                date: normalizeDate(parsed.data.date),
                method: parsed.data.method,
                providerCode: provider.providerCode,
                providerName: provider.providerName,
                captureChannel: provider.captureChannel,
                status: parsed.data.status,
                reference,
                parlourId: policy.parlourId,
            },
        });
        let applicationSummary = null;
        if (parsed.data.status === 'successful') {
            applicationSummary = await applySuccessfulPayment(tx, policy, payment, actorName);
        }
        if (parsed.data.status === 'successful' || parsed.data.status === 'failed') {
            const successful = parsed.data.status === 'successful';
            const contact = successful ? (member?.email || member?.phone || '') : (member?.phone || member?.email || '');
            if (contact) {
                await (0, communications_1.dispatchCommunication)(tx, {
                    parlourId: payment.parlourId,
                    type: successful && member?.email ? 'email' : 'sms',
                    recipientName: payment.memberName,
                    recipientContact: contact,
                    trigger: successful ? 'payment_receipt' : 'payment_failed_notice',
                    subject: successful ? `Payment Receipt - ${payment.reference}` : undefined,
                    body: successful
                        ? 'Dear {member_name}, your payment of R{amount} for policy {policy_number} has been received. Reference: {reference}.'
                        : 'Dear {member_name}, we could not process your payment of R{amount} for policy {policy_number}. Please contact the parlour for assistance.',
                    variables: {
                        member_name: payment.memberName,
                        amount: payment.amount,
                        policy_number: payment.policyNumber,
                        reference: payment.reference,
                    },
                    metadata: {
                        policyId: policy.id,
                        paymentId: payment.id,
                        receiptId: applicationSummary?.receiptId,
                        appliedDueDates: applicationSummary?.appliedDueDates || [],
                        relatedEntityType: 'payment',
                        relatedEntityId: payment.id,
                    },
                    createdBy: actorName,
                });
            }
        }
        return { payment, applicationSummary };
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PAYMENT_CAPTURED',
        entityType: 'Payment',
        entityId: result.payment.id,
        entityLabel: result.payment.reference,
        parlourId: result.payment.parlourId,
        details: [
            `amount=${result.payment.amount}`,
            `status=${result.payment.status}`,
            `method=${result.payment.method}`,
            `provider=${result.payment.providerCode}`,
            `channel=${result.payment.captureChannel}`,
            result.applicationSummary ? `applied=${result.applicationSummary.appliedAmount}` : null,
            result.applicationSummary ? `unapplied=${result.applicationSummary.unappliedAmount}` : null,
            result.applicationSummary ? `dueDates=${result.applicationSummary.appliedDueDates.join(',') || 'none'}` : null,
            result.applicationSummary ? `nextDueDate=${result.applicationSummary.nextDueDate}` : null,
            result.applicationSummary ? `arrears=${result.applicationSummary.arrearsAmount}` : null,
        ].filter(Boolean).join(';'),
    });
    await (0, usage_1.writeUsageEvent)(req, {
        module: 'payments',
        eventType: 'payment_captured',
        parlourId: result.payment.parlourId,
        entityType: 'Payment',
        entityId: result.payment.id,
        details: result.payment.reference,
        metadata: {
            amount: result.payment.amount,
            status: result.payment.status,
            method: result.payment.method,
            providerCode: result.payment.providerCode,
            captureChannel: result.payment.captureChannel,
        },
    });
    return res.status(201).json(result.payment);
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
    await prisma_1.prisma.$transaction(async (tx) => {
        for (const policy of policies) {
            count += await ensureBillingEventsThrough(tx, policy, parsed.data.dueDate);
        }
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'BILLING_EVENTS_GENERATED',
        entityType: 'BillingEvent',
        entityId: (0, id_1.generateId)('be-job'),
        entityLabel: parsed.data.dueDate,
        parlourId: parsed.data.parlourId,
        details: `count=${count};mode=configured-schedule`,
    });
    return res.json({ created: count });
});
//# sourceMappingURL=payments.js.map