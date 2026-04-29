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
const staffSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2),
    role: zod_1.z.string().min(2),
});
const vehicleSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    reg: zod_1.z.string().min(2),
    type: zod_1.z.string().min(2),
    driver: zod_1.z.string().min(2),
});
const supplierSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2),
    service: zod_1.z.string().min(2),
    status: zod_1.z.enum(['pending', 'confirmed']).default('pending'),
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
    staff: zod_1.z.array(staffSchema).default([]),
    vehicles: zod_1.z.array(vehicleSchema).default([]),
    suppliers: zod_1.z.array(supplierSchema).default([]),
    createdAt: zod_1.z.string().optional(),
});
const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();
function normalizeCase(record) {
    return {
        ...record,
        createdAt: record.createdOn,
        staff: Array.isArray(record.staff) ? record.staff : [],
        vehicles: Array.isArray(record.vehicles) ? record.vehicles : [],
        suppliers: Array.isArray(record.suppliers) ? record.suppliers : [],
    };
}
exports.funeralCasesRouter = (0, express_1.Router)();
exports.funeralCasesRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const records = await prisma_1.prisma.funeralCase.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(records.map((record) => normalizeCase(record)));
});
exports.funeralCasesRouter.get('/:id', async (req, res) => {
    const record = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!record) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    return res.json(normalizeCase(record));
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
            staff: parsed.data.staff,
            vehicles: parsed.data.vehicles,
            suppliers: parsed.data.suppliers,
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
    return res.status(201).json(normalizeCase(record));
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
        return res.json(normalizeCase(record));
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
        return res.json(normalizeCase(record));
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
    return res.status(201).json(normalizeCase(updated));
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
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/tasks/:taskId', async (req, res) => {
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const tasks = Array.isArray(existing.tasks) ? existing.tasks : [];
    const updatedTasks = tasks.filter((item) => String(item.id) !== req.params.taskId);
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { tasks: updatedTasks },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_TASK_DELETED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `taskId=${req.params.taskId}`,
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.post('/:id/notes', async (req, res) => {
    const schema = zod_1.z.object({ note: zod_1.z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid note payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const notes = Array.isArray(existing.notes) ? existing.notes : [];
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { notes: [...notes, parsed.data.note] },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_NOTE_ADDED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
    });
    return res.status(201).json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/notes/:index', async (req, res) => {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
        return res.status(400).json({ message: 'Invalid note index' });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const notes = Array.isArray(existing.notes) ? existing.notes : [];
    if (index >= notes.length) {
        return res.status(404).json({ message: 'Note not found' });
    }
    const updatedNotes = notes.filter((_, idx) => idx !== index);
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { notes: updatedNotes },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_NOTE_DELETED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `index=${index}`,
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.post('/:id/staff', async (req, res) => {
    const parsed = staffSchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid staff payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const staff = Array.isArray(existing.staff) ? existing.staff : [];
    const staffItem = { id: (0, id_1.generateId)('stf'), name: parsed.data.name, role: parsed.data.role };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { staff: [...staff, staffItem] },
    });
    return res.status(201).json(normalizeCase(updated));
});
exports.funeralCasesRouter.patch('/:id/staff/:staffId', async (req, res) => {
    const parsed = staffSchema.omit({ id: true }).partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid staff payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const staff = Array.isArray(existing.staff) ? existing.staff : [];
    const updatedStaff = staff.map((item) => (String(item.id) === req.params.staffId ? { ...item, ...parsed.data } : item));
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { staff: updatedStaff },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/staff/:staffId', async (req, res) => {
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const staff = Array.isArray(existing.staff) ? existing.staff : [];
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { staff: staff.filter((item) => String(item.id) !== req.params.staffId) },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.post('/:id/vehicles', async (req, res) => {
    const parsed = vehicleSchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid vehicle payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const vehicles = Array.isArray(existing.vehicles) ? existing.vehicles : [];
    const vehicleItem = { id: (0, id_1.generateId)('vhc'), reg: parsed.data.reg, type: parsed.data.type, driver: parsed.data.driver };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { vehicles: [...vehicles, vehicleItem] },
    });
    return res.status(201).json(normalizeCase(updated));
});
exports.funeralCasesRouter.patch('/:id/vehicles/:vehicleId', async (req, res) => {
    const parsed = vehicleSchema.omit({ id: true }).partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid vehicle payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const vehicles = Array.isArray(existing.vehicles) ? existing.vehicles : [];
    const updatedVehicles = vehicles.map((item) => (String(item.id) === req.params.vehicleId ? { ...item, ...parsed.data } : item));
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { vehicles: updatedVehicles },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/vehicles/:vehicleId', async (req, res) => {
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const vehicles = Array.isArray(existing.vehicles) ? existing.vehicles : [];
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { vehicles: vehicles.filter((item) => String(item.id) !== req.params.vehicleId) },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.post('/:id/suppliers', async (req, res) => {
    const parsed = supplierSchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid supplier payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const suppliers = Array.isArray(existing.suppliers) ? existing.suppliers : [];
    const supplierItem = { id: (0, id_1.generateId)('sup'), name: parsed.data.name, service: parsed.data.service, status: parsed.data.status };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { suppliers: [...suppliers, supplierItem] },
    });
    return res.status(201).json(normalizeCase(updated));
});
exports.funeralCasesRouter.patch('/:id/suppliers/:supplierId', async (req, res) => {
    const parsed = supplierSchema.omit({ id: true }).partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid supplier payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const suppliers = Array.isArray(existing.suppliers) ? existing.suppliers : [];
    const updatedSuppliers = suppliers.map((item) => (String(item.id) === req.params.supplierId ? { ...item, ...parsed.data } : item));
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { suppliers: updatedSuppliers },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/suppliers/:supplierId', async (req, res) => {
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const suppliers = Array.isArray(existing.suppliers) ? existing.suppliers : [];
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { suppliers: suppliers.filter((item) => String(item.id) !== req.params.supplierId) },
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id', async (req, res) => {
    try {
        const deleted = await prisma_1.prisma.funeralCase.delete({ where: { id: req.params.id } });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'FUNERAL_CASE_DELETED',
            entityType: 'Funeral Case',
            entityId: deleted.id,
            entityLabel: deleted.caseNumber,
            parlourId: deleted.parlourId,
        });
        return res.status(204).send();
    }
    catch {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
});
//# sourceMappingURL=funeralCases.js.map