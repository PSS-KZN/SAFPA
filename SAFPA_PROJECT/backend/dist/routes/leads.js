"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const leadStatusEnum = zod_1.z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);
const createLeadSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    branchId: zod_1.z.string().min(1).optional(),
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(7),
    email: zod_1.z.string().email().optional(),
    source: zod_1.z.enum(['website', 'branch', 'agent', 'referral']).default('website'),
    status: leadStatusEnum.default('new'),
    assignedTo: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().optional(),
});
const updateLeadSchema = createLeadSchema.partial();
const updateLeadStatusSchema = zod_1.z.object({ status: leadStatusEnum });
const websiteInquirySchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(7),
    email: zod_1.z.string().email().optional(),
    message: zod_1.z.string().max(1000).optional(),
    trap: zod_1.z.string().optional(),
});
const convertLeadSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1).optional(),
    createPolicy: zod_1.z.boolean().default(false),
    productId: zod_1.z.string().optional(),
    premiumAmount: zod_1.z.number().int().positive().optional(),
    coverAmount: zod_1.z.number().int().positive().optional(),
});
function todayString() {
    return new Date().toISOString().slice(0, 10);
}
exports.leadsRouter = (0, express_1.Router)();
exports.leadsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const leads = await prisma_1.prisma.lead.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(leads.map((lead) => ({
        ...lead,
        createdAt: lead.createdOn,
    })));
});
exports.leadsRouter.post('/', async (req, res) => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid lead payload', errors: parsed.error.flatten() });
    }
    const createdOn = parsed.data.createdAt || todayString();
    const lead = await prisma_1.prisma.lead.create({
        data: {
            id: (0, id_1.generateId)('l'),
            parlourId: parsed.data.parlourId,
            branchId: parsed.data.branchId,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            phone: parsed.data.phone,
            email: parsed.data.email,
            source: parsed.data.source,
            status: parsed.data.status,
            assignedTo: parsed.data.assignedTo,
            notes: parsed.data.notes,
            createdOn,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        entityLabel: `${lead.firstName} ${lead.lastName}`,
        parlourId: lead.parlourId,
    });
    return res.status(201).json({ ...lead, createdAt: lead.createdOn });
});
exports.leadsRouter.post('/website-inquiry', async (req, res) => {
    const parsed = websiteInquirySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid inquiry payload', errors: parsed.error.flatten() });
    }
    if (parsed.data.trap) {
        return res.status(200).json({ ok: true });
    }
    const lead = await prisma_1.prisma.lead.create({
        data: {
            id: (0, id_1.generateId)('l'),
            parlourId: parsed.data.parlourId,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            phone: parsed.data.phone,
            email: parsed.data.email,
            source: 'website',
            status: 'new',
            notes: parsed.data.message,
            createdOn: todayString(),
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'WEBSITE_INQUIRY_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        entityLabel: `${lead.firstName} ${lead.lastName}`,
        parlourId: lead.parlourId,
    });
    return res.status(201).json({ ok: true, leadId: lead.id });
});
exports.leadsRouter.patch('/:id', async (req, res) => {
    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid lead payload', errors: parsed.error.flatten() });
    }
    const payload = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
        payload.createdOn = payload.createdAt;
        delete payload.createdAt;
    }
    try {
        const lead = await prisma_1.prisma.lead.update({
            where: { id: req.params.id },
            data: payload,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'LEAD_UPDATED',
            entityType: 'Lead',
            entityId: lead.id,
            entityLabel: `${lead.firstName} ${lead.lastName}`,
            parlourId: lead.parlourId,
        });
        return res.json({ ...lead, createdAt: lead.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Lead not found' });
    }
});
exports.leadsRouter.patch('/:id/status', async (req, res) => {
    const parsed = updateLeadStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
    }
    try {
        const lead = await prisma_1.prisma.lead.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'LEAD_STATUS_CHANGED',
            entityType: 'Lead',
            entityId: lead.id,
            entityLabel: `${lead.firstName} ${lead.lastName}`,
            parlourId: lead.parlourId,
            details: `status=${lead.status}`,
        });
        return res.json({ ...lead, createdAt: lead.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Lead not found' });
    }
});
exports.leadsRouter.post('/:id/convert', async (req, res) => {
    const parsed = convertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid conversion payload', errors: parsed.error.flatten() });
    }
    const lead = await prisma_1.prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
    }
    if (lead.status === 'converted') {
        return res.status(400).json({ message: 'Lead already converted' });
    }
    const memberResult = await prisma_1.prisma.$transaction(async (tx) => {
        const member = await tx.member.create({
            data: {
                id: (0, id_1.generateId)('m'),
                parlourId: lead.parlourId,
                branchId: parsed.data.branchId || lead.branchId || 'b1',
                firstName: lead.firstName,
                lastName: lead.lastName,
                idNumber: `TEMP-${Date.now()}`,
                phone: lead.phone,
                email: lead.email || '',
                address: '',
                city: '',
                province: '',
                joinDate: todayString(),
                status: 'active',
                dependants: [],
                beneficiaries: [],
            },
        });
        let policyId = null;
        if (parsed.data.createPolicy && parsed.data.productId) {
            const product = await tx.product.findUnique({ where: { id: parsed.data.productId } });
            if (product) {
                const policy = await tx.policy.create({
                    data: {
                        id: (0, id_1.generateId)('pol'),
                        policyNumber: `POL-${Date.now()}`,
                        memberId: member.id,
                        parlourId: lead.parlourId,
                        productId: product.id,
                        productName: product.name,
                        status: 'pending',
                        premiumAmount: parsed.data.premiumAmount || product.premiumFrom,
                        billingFrequency: 'monthly',
                        nextDueDate: todayString(),
                        startDate: todayString(),
                        coverAmount: parsed.data.coverAmount || product.coverFrom,
                        arrearsAmount: 0,
                    },
                });
                policyId = policy.id;
            }
        }
        const convertedLead = await tx.lead.update({
            where: { id: lead.id },
            data: { status: 'converted' },
        });
        return { member, policyId, convertedLead };
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'LEAD_CONVERTED_TO_MEMBER',
        entityType: 'Lead',
        entityId: lead.id,
        entityLabel: `${lead.firstName} ${lead.lastName}`,
        parlourId: lead.parlourId,
        details: `memberId=${memberResult.member.id}`,
    });
    return res.json({
        lead: { ...memberResult.convertedLead, createdAt: memberResult.convertedLead.createdOn },
        member: memberResult.member,
        policyId: memberResult.policyId,
    });
});
//# sourceMappingURL=leads.js.map