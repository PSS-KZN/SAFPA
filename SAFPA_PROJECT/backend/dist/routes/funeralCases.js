"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.funeralCasesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const caseStatusEnum = zod_1.z.enum(['logged', 'in_progress', 'scheduled', 'completed', 'archived']);
const caseTypeEnum = zod_1.z.enum(['policy', 'cash', 'private']);
const taskSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().min(2),
    completed: zod_1.z.boolean().default(false),
    assignee: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
});
const createCaseSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    branchId: zod_1.z.string().min(1),
    deceasedName: zod_1.z.string().min(2),
    deceasedIdNumber: zod_1.z.string().min(6),
    dateOfDeath: zod_1.z.string().min(8),
    policyId: zod_1.z.string().optional(),
    policyNumber: zod_1.z.string().optional(),
    memberId: zod_1.z.string().optional(),
    coordinatorId: zod_1.z.string().default('u7'),
    coordinatorName: zod_1.z.string().min(2),
    status: caseStatusEnum.default('logged'),
    funeralDate: zod_1.z.string().optional(),
    venue: zod_1.z.string().optional(),
    caseType: caseTypeEnum,
    tasks: zod_1.z.array(taskSchema).default([]),
    notes: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: zod_1.z.string().optional(),
});
const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();
exports.funeralCasesRouter = (0, express_1.Router)();
exports.funeralCasesRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const records = await prisma_1.prisma.funeralCase.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(records.map((record) => ({
        ...record,
        createdAt: record.createdOn,
    })));
});
exports.funeralCasesRouter.get('/:id', async (req, res) => {
    const record = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!record) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    return res.json({ ...record, createdAt: record.createdOn });
});
exports.funeralCasesRouter.post('/', async (req, res) => {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid case payload', errors: parsed.error.flatten() });
    }
    const createdOn = parsed.data.createdAt || new Date().toISOString().slice(0, 10);
    const record = await prisma_1.prisma.funeralCase.create({
        data: {
            id: (0, id_1.generateId)('fc'),
            caseNumber: `FC-${Date.now()}`,
            parlourId: parsed.data.parlourId,
            branchId: parsed.data.branchId,
            deceasedName: parsed.data.deceasedName,
            deceasedIdNumber: parsed.data.deceasedIdNumber,
            dateOfDeath: parsed.data.dateOfDeath,
            policyId: parsed.data.policyId,
            policyNumber: parsed.data.policyNumber,
            memberId: parsed.data.memberId,
            coordinatorId: parsed.data.coordinatorId,
            coordinatorName: parsed.data.coordinatorName,
            status: parsed.data.status,
            funeralDate: parsed.data.funeralDate,
            venue: parsed.data.venue,
            caseType: parsed.data.caseType,
            tasks: parsed.data.tasks,
            notes: parsed.data.notes,
            createdOn,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_CREATED',
        entityType: 'Funeral Case',
        entityId: record.id,
        entityLabel: record.caseNumber,
        parlourId: record.parlourId,
    });
    return res.status(201).json({ ...record, createdAt: record.createdOn });
});
exports.funeralCasesRouter.patch('/:id', async (req, res) => {
    const parsed = updateCaseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid case payload', errors: parsed.error.flatten() });
    }
    const payload = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
        payload.createdOn = payload.createdAt;
        delete payload.createdAt;
    }
    try {
        const record = await prisma_1.prisma.funeralCase.update({
            where: { id: req.params.id },
            data: payload,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'FUNERAL_CASE_UPDATED',
            entityType: 'Funeral Case',
            entityId: record.id,
            entityLabel: record.caseNumber,
            parlourId: record.parlourId,
        });
        return res.json({ ...record, createdAt: record.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
});
exports.funeralCasesRouter.patch('/:id/status', async (req, res) => {
    const schema = zod_1.z.object({ status: caseStatusEnum });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
    }
    try {
        const record = await prisma_1.prisma.funeralCase.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'FUNERAL_CASE_STATUS_CHANGED',
            entityType: 'Funeral Case',
            entityId: record.id,
            entityLabel: record.caseNumber,
            parlourId: record.parlourId,
            details: `status=${record.status}`,
        });
        return res.json({ ...record, createdAt: record.createdOn });
    }
    catch {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
});
exports.funeralCasesRouter.post('/:id/tasks', async (req, res) => {
    const schema = zod_1.z.object({ title: zod_1.z.string().min(2), assignee: zod_1.z.string().optional(), dueDate: zod_1.z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid task payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const tasks = Array.isArray(existing.tasks) ? existing.tasks : [];
    const task = {
        id: (0, id_1.generateId)('t'),
        title: parsed.data.title,
        completed: false,
        assignee: parsed.data.assignee,
        dueDate: parsed.data.dueDate,
    };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { tasks: [...tasks, task] },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_TASK_ADDED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `task=${task.title}`,
    });
    return res.status(201).json({ ...updated, createdAt: updated.createdOn });
});
exports.funeralCasesRouter.patch('/:id/tasks/:taskId', async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(2).optional(),
        completed: zod_1.z.boolean().optional(),
        assignee: zod_1.z.string().optional(),
        dueDate: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid task payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const tasks = Array.isArray(existing.tasks) ? existing.tasks : [];
    const updatedTasks = tasks.map((item) => {
        if (String(item.id) !== req.params.taskId) {
            return item;
        }
        return {
            ...item,
            ...parsed.data,
        };
    });
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { tasks: updatedTasks },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_TASK_UPDATED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `taskId=${req.params.taskId}`,
    });
    return res.json({ ...updated, createdAt: updated.createdOn });
});
//# sourceMappingURL=funeralCases.js.map