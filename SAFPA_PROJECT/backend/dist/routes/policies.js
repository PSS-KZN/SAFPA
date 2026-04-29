"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policiesRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
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
    status: policyStatusEnum.default('pending'),
    premiumAmount: zod_1.z.number().int().positive(),
    waitingPeriodDays: zod_1.z.number().int().nonnegative().default(0),
    billingFrequency: zod_1.z.enum(['monthly', 'weekly', 'annually']),
    nextDueDate: zod_1.z.string().min(8),
    startDate: zod_1.z.string().min(8),
    coverAmount: zod_1.z.number().int().positive(),
    arrearsAmount: zod_1.z.number().int().nonnegative().default(0),
    lastPaymentDate: zod_1.z.string().optional(),
    allowedStatusTransitions: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
const updatePolicySchema = createPolicySchema.omit({ memberId: true, parlourId: true, productId: true }).partial();
const updateStatusSchema = zod_1.z.object({ status: policyStatusEnum });
const optionalStringSchema = zod_1.z.preprocess((value) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    return value;
}, zod_1.z.string().optional());
const optionalPositiveIntSchema = zod_1.z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().int().positive().optional());
const optionalNonNegativeIntSchema = zod_1.z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().int().nonnegative().optional());
const bulkImportRowSchema = zod_1.z.object({
    policyNumber: optionalStringSchema,
    memberId: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1),
    productName: optionalStringSchema,
    status: zod_1.z.preprocess((value) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        }
        return value;
    }, policyStatusEnum.optional()),
    premiumAmount: optionalPositiveIntSchema,
    billingFrequency: zod_1.z.enum(['monthly', 'weekly', 'annually']),
    nextDueDate: zod_1.z.string().min(8),
    startDate: zod_1.z.string().min(8),
    coverAmount: optionalPositiveIntSchema,
    arrearsAmount: optionalNonNegativeIntSchema,
    lastPaymentDate: optionalStringSchema,
});
const bulkImportSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    rows: zod_1.z.array(bulkImportRowSchema),
});
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
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const importErrorFiles = new Map();
function normalizeHeader(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function mapSheetRows(rows) {
    return rows.map((row) => {
        const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()]));
        return {
            policyNumber: normalized.policynumber || '',
            memberId: normalized.memberid || '',
            productId: normalized.productid || '',
            productName: normalized.productname || '',
            status: normalized.status || '',
            premiumAmount: normalized.premiumamount || normalized.premium || '',
            billingFrequency: normalized.billingfrequency || normalized.frequency || '',
            nextDueDate: normalized.nextduedate || normalized.duedate || '',
            startDate: normalized.startdate || '',
            coverAmount: normalized.coveramount || normalized.cover || '',
            arrearsAmount: normalized.arrearsamount || normalized.arrears || '',
            lastPaymentDate: normalized.lastpaymentdate || '',
        };
    });
}
function parseImportRows(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
        return [];
    }
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    return mapSheetRows(rawRows);
}
function parseTransitionRules(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const parsed = {};
    for (const [status, value] of Object.entries(raw)) {
        if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
            parsed[status] = value;
        }
    }
    return Object.keys(parsed).length > 0 ? parsed : null;
}
function getDependantCount(rawDependants) {
    return Array.isArray(rawDependants) ? rawDependants.length : 0;
}
function waitingPeriodViolation(startDate, waitingPeriodDays) {
    if (waitingPeriodDays <= 0) {
        return false;
    }
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
        return false;
    }
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    return elapsedDays < waitingPeriodDays;
}
async function validatePolicyConstraints(params) {
    const [member, product] = await Promise.all([
        prisma_1.prisma.member.findUnique({ where: { id: params.memberId } }),
        prisma_1.prisma.product.findUnique({ where: { id: params.productId } }),
    ]);
    if (!member || member.parlourId !== params.parlourId) {
        return { error: 'Member not found in parlour scope' };
    }
    if (!product || product.parlourId !== params.parlourId) {
        return { error: 'Product not found in parlour scope' };
    }
    const dependantCount = getDependantCount(member.dependants);
    if (dependantCount > product.maxDependants) {
        return { error: `Member has ${dependantCount} dependants but product allows maximum ${product.maxDependants}` };
    }
    if ((params.targetStatus === 'active' || params.targetStatus === 'reinstated')
        && waitingPeriodViolation(params.startDate, params.waitingPeriodDays)) {
        return { error: `Waiting period (${params.waitingPeriodDays} days) has not elapsed` };
    }
    return {
        productName: product.name,
        premiumAmount: product.premiumFrom,
        coverAmount: product.coverFrom,
    };
}
function canTransition(from, to, productRules) {
    if (from === to) {
        return true;
    }
    if (productRules) {
        return (productRules[from] || []).includes(to);
    }
    return (allowedTransitions[from] || []).includes(to);
}
async function createPolicyFromImportRow(params) {
    const status = params.row.status || 'pending';
    const normalizedPolicyNumber = params.row.policyNumber ? params.row.policyNumber.trim() : undefined;
    const dedupeKey = `${params.row.memberId}|${params.row.productId}|${params.row.startDate}`;
    if (normalizedPolicyNumber) {
        const existingNumber = await prisma_1.prisma.policy.findUnique({ where: { policyNumber: normalizedPolicyNumber }, select: { id: true } });
        if (existingNumber) {
            return { reason: 'Duplicate policy number', policyNumber: normalizedPolicyNumber };
        }
    }
    else {
        const existingComposite = await prisma_1.prisma.policy.findFirst({
            where: {
                parlourId: params.parlourId,
                memberId: params.row.memberId,
                productId: params.row.productId,
                startDate: params.row.startDate,
            },
            select: { id: true },
        });
        if (existingComposite) {
            return { reason: 'Duplicate policy for member/product/start date', dedupeKey };
        }
    }
    const constraints = await validatePolicyConstraints({
        parlourId: params.parlourId,
        memberId: params.row.memberId,
        productId: params.row.productId,
        startDate: params.row.startDate,
        targetStatus: status,
        waitingPeriodDays: 0,
    });
    if (constraints.error) {
        return { reason: constraints.error, dedupeKey, policyNumber: normalizedPolicyNumber };
    }
    const premiumAmount = params.row.premiumAmount ?? constraints.premiumAmount ?? 0;
    const coverAmount = params.row.coverAmount ?? constraints.coverAmount ?? 0;
    if (premiumAmount <= 0 || coverAmount <= 0) {
        return { reason: 'Premium amount and cover amount must be greater than zero', dedupeKey, policyNumber: normalizedPolicyNumber };
    }
    const policy = await prisma_1.prisma.policy.create({
        data: {
            id: (0, id_1.generateId)('pol'),
            policyNumber: normalizedPolicyNumber || `POL-${(0, id_1.generateId)('n')}`,
            memberId: params.row.memberId,
            parlourId: params.parlourId,
            productId: params.row.productId,
            productName: params.row.productName || constraints.productName || 'Policy Product',
            status,
            premiumAmount,
            waitingPeriodDays: 0,
            billingFrequency: params.row.billingFrequency,
            nextDueDate: params.row.nextDueDate,
            startDate: params.row.startDate,
            coverAmount,
            arrearsAmount: params.row.arrearsAmount ?? 0,
            lastPaymentDate: params.row.lastPaymentDate,
        },
    });
    return { policy, dedupeKey, policyNumber: normalizedPolicyNumber };
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
exports.policiesRouter.post('/', async (req, res) => {
    const parsed = createPolicySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid policy payload', errors: parsed.error.flatten() });
    }
    const constraints = await validatePolicyConstraints({
        parlourId: parsed.data.parlourId,
        memberId: parsed.data.memberId,
        productId: parsed.data.productId,
        startDate: parsed.data.startDate,
        targetStatus: parsed.data.status,
        waitingPeriodDays: parsed.data.waitingPeriodDays,
    });
    if (constraints.error) {
        return res.status(409).json({ message: constraints.error });
    }
    const policy = await prisma_1.prisma.policy.create({
        data: {
            id: (0, id_1.generateId)('pol'),
            policyNumber: `POL-${(0, id_1.generateId)('n')}`,
            ...parsed.data,
            productName: constraints.productName || parsed.data.productName,
            allowedStatusTransitions: parsed.data.allowedStatusTransitions,
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
        const constraints = await validatePolicyConstraints({
            parlourId: existing.parlourId,
            memberId: existing.memberId,
            productId: existing.productId,
            startDate: parsed.data.startDate || existing.startDate,
            targetStatus: parsed.data.status || existing.status,
            waitingPeriodDays: parsed.data.waitingPeriodDays ?? existing.waitingPeriodDays,
        });
        if (constraints.error) {
            return res.status(409).json({ message: constraints.error });
        }
        const policyRules = parseTransitionRules(parsed.data.allowedStatusTransitions ?? existing.allowedStatusTransitions);
        if (parsed.data.status && !canTransition(existing.status, parsed.data.status, policyRules)) {
            return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${parsed.data.status}` });
        }
        const data = { ...parsed.data };
        if (Object.prototype.hasOwnProperty.call(data, 'allowedStatusTransitions')) {
            data.allowedStatusTransitions = data.allowedStatusTransitions;
        }
        const policy = await prisma_1.prisma.policy.update({
            where: { id: req.params.id },
            data,
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
    const constraints = await validatePolicyConstraints({
        parlourId: existing.parlourId,
        memberId: existing.memberId,
        productId: existing.productId,
        startDate: existing.startDate,
        targetStatus: parsed.data.status,
        waitingPeriodDays: existing.waitingPeriodDays,
    });
    if (constraints.error) {
        return res.status(409).json({ message: constraints.error });
    }
    const policyRules = parseTransitionRules(existing.allowedStatusTransitions);
    if (!canTransition(existing.status, parsed.data.status, policyRules)) {
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
exports.policiesRouter.post('/bulk-import', async (req, res) => {
    const parsed = bulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid import payload', errors: parsed.error.flatten() });
    }
    try {
        await (0, subscription_1.assertBulkImportLimit)(parsed.data.parlourId, parsed.data.rows.length);
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const errors = [];
    const seenPolicyNumbers = new Set();
    const seenCompositeKeys = new Set();
    let createdCount = 0;
    for (let index = 0; index < parsed.data.rows.length; index += 1) {
        const row = parsed.data.rows[index];
        if (row.policyNumber) {
            const normalizedPolicyNumber = row.policyNumber.trim();
            if (seenPolicyNumbers.has(normalizedPolicyNumber)) {
                errors.push({ index, reason: 'Duplicate policy number in import file' });
                continue;
            }
            seenPolicyNumbers.add(normalizedPolicyNumber);
        }
        else {
            const composite = `${row.memberId}|${row.productId}|${row.startDate}`;
            if (seenCompositeKeys.has(composite)) {
                errors.push({ index, reason: 'Duplicate member/product/start date in import payload' });
                continue;
            }
            seenCompositeKeys.add(composite);
        }
        const created = await createPolicyFromImportRow({
            parlourId: parsed.data.parlourId,
            row,
        });
        if (!created.policy) {
            errors.push({ index, reason: created.reason || 'Failed to create policy row' });
            continue;
        }
        createdCount += 1;
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'POLICY_BULK_IMPORTED',
        entityType: 'Policy',
        entityId: (0, id_1.generateId)('import'),
        entityLabel: `rows=${parsed.data.rows.length}`,
        parlourId: parsed.data.parlourId,
        details: `created=${createdCount};errors=${errors.length}`,
    });
    return res.json({
        totalRows: parsed.data.rows.length,
        createdCount,
        errorCount: errors.length,
        errors,
    });
});
exports.policiesRouter.post('/bulk-import-file', upload.single('file'), async (req, res) => {
    const schema = zod_1.z.object({ parlourId: zod_1.z.string().min(1) });
    const parsedFields = schema.safeParse(req.body);
    if (!parsedFields.success) {
        return res.status(400).json({ message: 'Invalid import payload', errors: parsedFields.error.flatten() });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'Import file is required' });
    }
    const rows = parseImportRows(req.file.buffer);
    try {
        await (0, subscription_1.assertBulkImportLimit)(parsedFields.data.parlourId, rows.length);
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const errors = [];
    const seenPolicyNumbers = new Set();
    const seenCompositeKeys = new Set();
    let createdCount = 0;
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const parsedRow = bulkImportRowSchema.safeParse(row);
        if (!parsedRow.success) {
            errors.push({ index, reason: 'Validation failed' });
            continue;
        }
        if (parsedRow.data.policyNumber) {
            const normalizedPolicyNumber = parsedRow.data.policyNumber.trim();
            if (seenPolicyNumbers.has(normalizedPolicyNumber)) {
                errors.push({ index, reason: 'Duplicate policy number in import file' });
                continue;
            }
            seenPolicyNumbers.add(normalizedPolicyNumber);
        }
        else {
            const composite = `${parsedRow.data.memberId}|${parsedRow.data.productId}|${parsedRow.data.startDate}`;
            if (seenCompositeKeys.has(composite)) {
                errors.push({ index, reason: 'Duplicate member/product/start date in import file' });
                continue;
            }
            seenCompositeKeys.add(composite);
        }
        const created = await createPolicyFromImportRow({
            parlourId: parsedFields.data.parlourId,
            row: parsedRow.data,
        });
        if (!created.policy) {
            errors.push({ index, reason: created.reason || 'Failed to create policy row' });
            continue;
        }
        createdCount += 1;
    }
    let errorFileToken = null;
    if (errors.length > 0) {
        errorFileToken = (0, id_1.generateId)('import-errors');
        const csv = ['row,reason', ...errors.map((item) => `${item.index + 2},"${item.reason}"`)].join('\n');
        importErrorFiles.set(errorFileToken, csv);
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'POLICY_BULK_IMPORTED_FILE',
        entityType: 'Policy',
        entityId: (0, id_1.generateId)('import'),
        entityLabel: req.file.originalname,
        parlourId: parsedFields.data.parlourId,
        details: `created=${createdCount};errors=${errors.length}`,
    });
    return res.json({
        totalRows: rows.length,
        createdCount,
        errorCount: errors.length,
        errors,
        errorFileToken,
    });
});
exports.policiesRouter.get('/bulk-import-errors/:token', (req, res) => {
    const csv = importErrorFiles.get(req.params.token);
    if (!csv) {
        return res.status(404).json({ message: 'Error file not found' });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="policy_import_errors_${req.params.token}.csv"`);
    return res.send(csv);
});
exports.policiesRouter.get('/:id', async (req, res) => {
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
    }
    return res.json(policy);
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