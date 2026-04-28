"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const createTemplateSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2),
    type: zod_1.z.enum(['sms', 'email']),
    trigger: zod_1.z.string().min(2),
    subject: zod_1.z.string().optional(),
    body: zod_1.z.string().min(3),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.string().optional(),
    lastUpdated: zod_1.z.string().optional(),
});
const updateTemplateSchema = createTemplateSchema.omit({ parlourId: true }).partial();
exports.templatesRouter = (0, express_1.Router)();
exports.templatesRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const templates = await prisma_1.prisma.communicationTemplate.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(templates.map((template) => ({
        ...template,
        createdAt: template.createdOn,
    })));
});
exports.templatesRouter.post('/', async (req, res) => {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid template payload', errors: parsed.error.flatten() });
    }
    const nowString = new Date().toISOString().slice(0, 10);
    const createdOn = parsed.data.createdAt || nowString;
    const lastUpdated = parsed.data.lastUpdated || nowString;
    const template = await prisma_1.prisma.communicationTemplate.create({
        data: {
            id: (0, id_1.generateId)('tpl'),
            parlourId: parsed.data.parlourId,
            name: parsed.data.name,
            type: parsed.data.type,
            trigger: parsed.data.trigger,
            subject: parsed.data.subject,
            body: parsed.data.body,
            isActive: parsed.data.isActive,
            createdOn,
            lastUpdated,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'TEMPLATE_CREATED',
        entityType: 'Template',
        entityId: template.id,
        entityLabel: template.name,
        parlourId: template.parlourId,
    });
    return res.status(201).json({ ...template, createdAt: template.createdOn });
});
exports.templatesRouter.patch('/:id', async (req, res) => {
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid template payload', errors: parsed.error.flatten() });
    }
    const payload = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
        payload.createdOn = payload.createdAt;
        delete payload.createdAt;
    }
    payload.lastUpdated = new Date().toISOString().slice(0, 10);
    try {
        const template = await prisma_1.prisma.communicationTemplate.update({
            where: { id: req.params.id },
            data: payload,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'TEMPLATE_UPDATED',
            entityType: 'Template',
            entityId: template.id,
            entityLabel: template.name,
            parlourId: template.parlourId,
        });
        return res.json({ ...template, createdAt: template.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Template not found' });
    }
});
exports.templatesRouter.patch('/:id/status', async (req, res) => {
    const schema = zod_1.z.object({ isActive: zod_1.z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
    }
    try {
        const template = await prisma_1.prisma.communicationTemplate.update({
            where: { id: req.params.id },
            data: {
                isActive: parsed.data.isActive,
                lastUpdated: new Date().toISOString().slice(0, 10),
            },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'TEMPLATE_STATUS_CHANGED',
            entityType: 'Template',
            entityId: template.id,
            entityLabel: template.name,
            parlourId: template.parlourId,
            details: `isActive=${String(template.isActive)}`,
        });
        return res.json({ ...template, createdAt: template.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Template not found' });
    }
});
//# sourceMappingURL=templates.js.map