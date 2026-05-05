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
const taskCategoryEnum = zod_1.z.enum(['documentation', 'logistics', 'family_support', 'ceremony', 'finance']);
const milestoneTypeEnum = zod_1.z.enum([
    'death_notice_logged',
    'body_collection',
    'family_meeting',
    'documentation_collection',
    'funeral_service',
    'burial_or_cremation',
    'post_funeral_followup',
    'case_closure',
]);
const milestoneStatusEnum = zod_1.z.enum(['pending', 'scheduled', 'completed']);
const vehicleAvailabilityEnum = zod_1.z.enum(['available', 'allocated', 'maintenance']);
const taskSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().min(2),
    completed: zod_1.z.boolean().default(false),
    assignee: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
    category: taskCategoryEnum.optional(),
    milestoneId: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().optional(),
    completedBy: zod_1.z.string().optional(),
});
const staffSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    staffUserId: zod_1.z.string().optional(),
    displayName: zod_1.z.string().min(2).optional(),
    name: zod_1.z.string().min(2).optional(),
    role: zod_1.z.string().min(2),
});
const vehicleSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    reg: zod_1.z.string().min(2),
    type: zod_1.z.string().min(2),
    driver: zod_1.z.string().min(2),
    capacity: zod_1.z.number().int().positive().optional(),
    purpose: zod_1.z.string().min(2).optional(),
    availabilityStatus: vehicleAvailabilityEnum.optional(),
});
const supplierSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2),
    service: zod_1.z.string().min(2),
    status: zod_1.z.enum(['pending', 'confirmed']).default('pending'),
});
const milestoneSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: milestoneTypeEnum,
    title: zod_1.z.string().min(2),
    scheduledDate: zod_1.z.string().optional(),
    scheduledTime: zod_1.z.string().optional(),
    status: milestoneStatusEnum.default('pending'),
    assignedStaffId: zod_1.z.string().optional(),
    assignedVehicleId: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().optional(),
});
const createCaseSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    branchId: zod_1.z.string().min(1),
    deceasedName: zod_1.z.string().min(2),
    deceasedIdNumber: zod_1.z.string().min(6),
    dateOfDeath: zod_1.z.string().min(8),
    deathNoticeLoggedAt: zod_1.z.string().optional(),
    deathNoticeLoggedBy: zod_1.z.string().optional(),
    informantName: zod_1.z.string().min(2),
    informantPhone: zod_1.z.string().min(7),
    placeOfDeath: zod_1.z.string().min(2),
    causeOfDeath: zod_1.z.string().optional(),
    bodyCollected: zod_1.z.boolean().default(false),
    bodyCollectionLocation: zod_1.z.string().optional(),
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
    milestones: zod_1.z.array(milestoneSchema).default([]),
    closedAt: zod_1.z.string().optional(),
    closedBy: zod_1.z.string().optional(),
    closureSummary: zod_1.z.string().optional(),
    closureChecklistComplete: zod_1.z.boolean().default(false),
    createdAt: zod_1.z.string().optional(),
});
const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();
function asJsonArray(value) {
    return Array.isArray(value) ? value : [];
}
function normalizeStaffEntry(item) {
    const displayName = typeof item.displayName === 'string'
        ? item.displayName
        : typeof item.name === 'string'
            ? item.name
            : '';
    return {
        ...item,
        displayName,
        name: displayName,
    };
}
function normalizeTaskEntry(item) {
    const completed = Boolean(item.completed);
    return {
        ...item,
        completed,
        completedAt: completed && typeof item.completedAt === 'string' ? item.completedAt : undefined,
        completedBy: completed && typeof item.completedBy === 'string' ? item.completedBy : undefined,
    };
}
function normalizeMilestoneEntry(item) {
    const status = typeof item.status === 'string' ? item.status : 'pending';
    return {
        ...item,
        status,
    };
}
function buildDefaultMilestones(input) {
    const milestones = [
        {
            id: (0, id_1.generateId)('ms'),
            type: 'death_notice_logged',
            title: 'Death Notice Logged',
            scheduledDate: input.deathNoticeLoggedAt || input.createdAt || new Date().toISOString().slice(0, 10),
            status: 'completed',
            completedAt: input.deathNoticeLoggedAt || new Date().toISOString(),
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'body_collection',
            title: 'Body Collection',
            scheduledDate: input.bodyCollectionLocation ? input.dateOfDeath : undefined,
            status: input.bodyCollected ? 'completed' : 'pending',
            notes: input.bodyCollectionLocation,
            completedAt: input.bodyCollected ? new Date().toISOString() : undefined,
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'documentation_collection',
            title: 'Documentation Collection',
            status: 'pending',
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'family_meeting',
            title: 'Family Meeting',
            status: 'pending',
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'funeral_service',
            title: 'Funeral Service',
            scheduledDate: input.funeralDate,
            status: input.funeralDate ? 'scheduled' : 'pending',
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'burial_or_cremation',
            title: 'Burial Or Cremation',
            status: 'pending',
        },
        {
            id: (0, id_1.generateId)('ms'),
            type: 'case_closure',
            title: 'Case Closure',
            status: 'pending',
        },
    ];
    return milestones;
}
function hasScheduledFuneralService(milestones) {
    return milestones.some((item) => item.type === 'funeral_service' && typeof item.scheduledDate === 'string' && item.scheduledDate.length >= 8);
}
function canAssignAcrossBranches(actor) {
    return actor?.role === 'safpa_admin' || actor?.role === 'parlour_owner';
}
async function validateStaffAssignment(record, actor, input) {
    if (!input.staffUserId) {
        const displayName = input.displayName || input.name;
        if (!displayName) {
            throw new Error('Staff display name is required');
        }
        return {
            staffUserId: undefined,
            displayName,
            name: displayName,
            role: input.role,
        };
    }
    const user = await prisma_1.prisma.appUser.findUnique({ where: { id: input.staffUserId } });
    if (!user || user.status !== 'active') {
        throw new Error('Assigned staff member not found');
    }
    if (user.parlourId !== record.parlourId) {
        throw new Error('Assigned staff must belong to the same parlour');
    }
    if (!canAssignAcrossBranches(actor) && user.branchId && user.branchId !== record.branchId) {
        throw new Error('Assigned staff must belong to the same branch');
    }
    return {
        staffUserId: user.id,
        displayName: user.name,
        name: user.name,
        role: input.role,
    };
}
function validateLifecycleTransition(record, nextStatus, updates) {
    const milestones = updates?.milestones || asJsonArray(record.milestones).map(normalizeMilestoneEntry);
    const closureSummary = updates?.closureSummary ?? record.closureSummary ?? undefined;
    const closureChecklistComplete = updates?.closureChecklistComplete ?? record.closureChecklistComplete;
    if (nextStatus === 'scheduled' && !hasScheduledFuneralService(milestones)) {
        return 'A funeral service milestone must be scheduled before marking a case as scheduled.';
    }
    if (nextStatus === 'completed') {
        if (!closureSummary || !closureSummary.trim()) {
            return 'A closure summary is required before completing a case.';
        }
        if (!closureChecklistComplete) {
            return 'Closure checklist must be complete before completing a case.';
        }
    }
    if (nextStatus === 'archived' && record.status !== 'completed') {
        return 'Only completed cases can be archived.';
    }
    return null;
}
function normalizeCase(record) {
    return {
        ...record,
        createdAt: record.createdOn,
        deathNoticeLoggedAt: record.deathNoticeLoggedAt || record.createdOn,
        deathNoticeLoggedBy: record.deathNoticeLoggedBy || record.coordinatorName,
        informantName: record.informantName || '',
        informantPhone: record.informantPhone || '',
        placeOfDeath: record.placeOfDeath || '',
        causeOfDeath: record.causeOfDeath || '',
        bodyCollected: record.bodyCollected,
        bodyCollectionLocation: record.bodyCollectionLocation || '',
        tasks: asJsonArray(record.tasks).map(normalizeTaskEntry),
        staff: asJsonArray(record.staff).map(normalizeStaffEntry),
        vehicles: asJsonArray(record.vehicles),
        suppliers: asJsonArray(record.suppliers),
        milestones: asJsonArray(record.milestones).map(normalizeMilestoneEntry),
        closureSummary: record.closureSummary || '',
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
            deathNoticeLoggedAt: parsed.data.deathNoticeLoggedAt || createdOn,
            deathNoticeLoggedBy: parsed.data.deathNoticeLoggedBy || req.actor?.userName || parsed.data.coordinatorName,
            informantName: parsed.data.informantName,
            informantPhone: parsed.data.informantPhone,
            placeOfDeath: parsed.data.placeOfDeath,
            causeOfDeath: parsed.data.causeOfDeath,
            bodyCollected: parsed.data.bodyCollected,
            bodyCollectionLocation: parsed.data.bodyCollectionLocation,
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
            staff: parsed.data.staff.map((item) => ({
                ...item,
                displayName: item.displayName || item.name,
                name: item.displayName || item.name,
            })),
            vehicles: parsed.data.vehicles,
            suppliers: parsed.data.suppliers,
            milestones: (parsed.data.milestones.length > 0 ? parsed.data.milestones : buildDefaultMilestones(parsed.data)),
            closedAt: parsed.data.closedAt,
            closedBy: parsed.data.closedBy,
            closureSummary: parsed.data.closureSummary,
            closureChecklistComplete: parsed.data.closureChecklistComplete,
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
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_DEATH_NOTICE_LOGGED',
        entityType: 'Funeral Case',
        entityId: record.id,
        entityLabel: record.caseNumber,
        parlourId: record.parlourId,
        details: `informant=${parsed.data.informantName}`,
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
        const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Funeral case not found' });
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'status') && typeof payload.status === 'string') {
            const lifecycleError = validateLifecycleTransition(existing, payload.status, {
                closureSummary: typeof payload.closureSummary === 'string' ? payload.closureSummary : undefined,
                closureChecklistComplete: typeof payload.closureChecklistComplete === 'boolean' ? payload.closureChecklistComplete : undefined,
                milestones: Array.isArray(payload.milestones) ? payload.milestones : undefined,
            });
            if (lifecycleError) {
                return res.status(400).json({ message: lifecycleError });
            }
            if (payload.status === 'completed') {
                payload.closedAt = existing.closedAt || new Date().toISOString();
                payload.closedBy = existing.closedBy || req.actor?.userName || req.actor?.userId;
            }
        }
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
        const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Funeral case not found' });
        }
        const lifecycleError = validateLifecycleTransition(existing, parsed.data.status);
        if (lifecycleError) {
            return res.status(400).json({ message: lifecycleError });
        }
        const record = await prisma_1.prisma.funeralCase.update({
            where: { id: req.params.id },
            data: {
                status: parsed.data.status,
                closedAt: parsed.data.status === 'completed' ? existing.closedAt || new Date().toISOString() : existing.closedAt,
                closedBy: parsed.data.status === 'completed' ? existing.closedBy || req.actor?.userName || req.actor?.userId : existing.closedBy,
            },
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
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(2),
        assignee: zod_1.z.string().optional(),
        dueDate: zod_1.z.string().optional(),
        category: taskCategoryEnum.optional(),
        milestoneId: zod_1.z.string().optional(),
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
    const task = {
        id: (0, id_1.generateId)('t'),
        title: parsed.data.title,
        completed: false,
        assignee: parsed.data.assignee,
        dueDate: parsed.data.dueDate,
        category: parsed.data.category,
        milestoneId: parsed.data.milestoneId,
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
        category: taskCategoryEnum.optional(),
        milestoneId: zod_1.z.string().optional(),
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
        const nextCompleted = typeof parsed.data.completed === 'boolean' ? parsed.data.completed : Boolean(item.completed);
        return {
            ...item,
            ...parsed.data,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            completedBy: nextCompleted ? req.actor?.userName || req.actor?.userId : undefined,
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
    try {
        const validated = await validateStaffAssignment(existing, req.actor, parsed.data);
        const staffItem = { id: (0, id_1.generateId)('stf'), ...validated };
        const updated = await prisma_1.prisma.funeralCase.update({
            where: { id: existing.id },
            data: { staff: [...staff, staffItem] },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'FUNERAL_CASE_STAFF_ASSIGNED',
            entityType: 'Funeral Case',
            entityId: updated.id,
            entityLabel: updated.caseNumber,
            parlourId: updated.parlourId,
            details: `staff=${staffItem.displayName}`,
        });
        return res.status(201).json(normalizeCase(updated));
    }
    catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid staff assignment' });
    }
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
    const currentItem = staff.find((item) => String(item.id) === req.params.staffId);
    if (!currentItem) {
        return res.status(404).json({ message: 'Assigned staff not found' });
    }
    try {
        const validated = await validateStaffAssignment(existing, req.actor, {
            staffUserId: typeof parsed.data.staffUserId === 'string' ? parsed.data.staffUserId : typeof currentItem.staffUserId === 'string' ? currentItem.staffUserId : undefined,
            displayName: typeof parsed.data.displayName === 'string' ? parsed.data.displayName : typeof currentItem.displayName === 'string' ? currentItem.displayName : undefined,
            name: typeof parsed.data.name === 'string' ? parsed.data.name : typeof currentItem.name === 'string' ? currentItem.name : undefined,
            role: parsed.data.role || (typeof currentItem.role === 'string' ? currentItem.role : undefined),
        });
        const updatedStaff = staff.map((item) => (String(item.id) === req.params.staffId ? { ...item, ...validated } : item));
        const updated = await prisma_1.prisma.funeralCase.update({
            where: { id: existing.id },
            data: { staff: updatedStaff },
        });
        return res.json(normalizeCase(updated));
    }
    catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid staff assignment' });
    }
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
    const enrichedVehicleItem = {
        ...vehicleItem,
        capacity: parsed.data.capacity,
        purpose: parsed.data.purpose,
        availabilityStatus: parsed.data.availabilityStatus || 'allocated',
    };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { vehicles: [...vehicles, enrichedVehicleItem] },
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
exports.funeralCasesRouter.post('/:id/milestones', async (req, res) => {
    const parsed = milestoneSchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid milestone payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const milestones = asJsonArray(existing.milestones);
    const milestoneItem = {
        id: (0, id_1.generateId)('ms'),
        ...parsed.data,
        completedAt: parsed.data.status === 'completed' ? parsed.data.completedAt || new Date().toISOString() : undefined,
    };
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { milestones: [...milestones, milestoneItem] },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_MILESTONE_ADDED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `milestone=${milestoneItem.title}`,
    });
    return res.status(201).json(normalizeCase(updated));
});
exports.funeralCasesRouter.patch('/:id/milestones/:milestoneId', async (req, res) => {
    const parsed = milestoneSchema.omit({ id: true }).partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid milestone payload', errors: parsed.error.flatten() });
    }
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const milestones = asJsonArray(existing.milestones);
    const updatedMilestones = milestones.map((item) => {
        if (String(item.id) !== req.params.milestoneId) {
            return item;
        }
        const nextStatus = typeof parsed.data.status === 'string' ? parsed.data.status : item.status;
        return {
            ...item,
            ...parsed.data,
            completedAt: nextStatus === 'completed' ? parsed.data.completedAt || (typeof item.completedAt === 'string' ? item.completedAt : new Date().toISOString()) : undefined,
        };
    });
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { milestones: updatedMilestones },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_MILESTONE_UPDATED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `milestoneId=${req.params.milestoneId}`,
    });
    return res.json(normalizeCase(updated));
});
exports.funeralCasesRouter.delete('/:id/milestones/:milestoneId', async (req, res) => {
    const existing = await prisma_1.prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        return res.status(404).json({ message: 'Funeral case not found' });
    }
    const milestones = asJsonArray(existing.milestones);
    const updated = await prisma_1.prisma.funeralCase.update({
        where: { id: existing.id },
        data: { milestones: milestones.filter((item) => String(item.id) !== req.params.milestoneId) },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'FUNERAL_CASE_MILESTONE_DELETED',
        entityType: 'Funeral Case',
        entityId: updated.id,
        entityLabel: updated.caseNumber,
        parlourId: updated.parlourId,
        details: `milestoneId=${req.params.milestoneId}`,
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