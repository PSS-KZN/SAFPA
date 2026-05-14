import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { dispatchCommunication } from '../lib/communications';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const caseStatusEnum = z.enum(['logged', 'in_progress', 'scheduled', 'completed', 'archived']);
const caseTypeEnum = z.enum(['policy', 'cash', 'private']);
const taskCategoryEnum = z.enum(['documentation', 'logistics', 'family_support', 'ceremony', 'finance']);
const milestoneTypeEnum = z.enum([
  'death_notice_logged',
  'body_collection',
  'family_meeting',
  'documentation_collection',
  'funeral_service',
  'burial_or_cremation',
  'post_funeral_followup',
  'case_closure',
]);
const milestoneStatusEnum = z.enum(['pending', 'scheduled', 'completed']);
const vehicleAvailabilityEnum = z.enum(['available', 'allocated', 'maintenance']);

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2),
  completed: z.boolean().default(false),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  category: taskCategoryEnum.optional(),
  milestoneId: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
});

const staffSchema = z.object({
  id: z.string().optional(),
  staffUserId: z.string().optional(),
  displayName: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  role: z.string().min(2),
});

const vehicleSchema = z.object({
  id: z.string().optional(),
  reg: z.string().min(2),
  type: z.string().min(2),
  driver: z.string().min(2),
  capacity: z.number().int().positive().optional(),
  purpose: z.string().min(2).optional(),
  availabilityStatus: vehicleAvailabilityEnum.optional(),
});

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  service: z.string().min(2),
  status: z.enum(['pending', 'confirmed']).default('pending'),
});

const milestoneSchema = z.object({
  id: z.string().optional(),
  type: milestoneTypeEnum,
  title: z.string().min(2),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  status: milestoneStatusEnum.default('pending'),
  assignedStaffId: z.string().optional(),
  assignedVehicleId: z.string().optional(),
  notes: z.string().optional(),
  completedAt: z.string().optional(),
});

const createCaseSchema = z.object({
  parlourId: z.string().min(1),
  branchId: z.string().min(1),
  deceasedName: z.string().min(2),
  deceasedIdNumber: z.string().min(6),
  dateOfDeath: z.string().min(8),
  deathNoticeLoggedAt: z.string().optional(),
  deathNoticeLoggedBy: z.string().optional(),
  informantName: z.string().min(2),
  informantPhone: z.string().min(7),
  placeOfDeath: z.string().min(2),
  causeOfDeath: z.string().optional(),
  bodyCollected: z.boolean().default(false),
  bodyCollectionLocation: z.string().optional(),
  policyId: z.string().optional(),
  policyNumber: z.string().optional(),
  memberId: z.string().optional(),
  coordinatorId: z.string().default('u7'),
  coordinatorName: z.string().min(2),
  status: caseStatusEnum.default('logged'),
  funeralDate: z.string().optional(),
  venue: z.string().optional(),
  caseType: caseTypeEnum,
  tasks: z.array(taskSchema).default([]),
  notes: z.array(z.string()).default([]),
  staff: z.array(staffSchema).default([]),
  vehicles: z.array(vehicleSchema).default([]),
  suppliers: z.array(supplierSchema).default([]),
  milestones: z.array(milestoneSchema).default([]),
  closedAt: z.string().optional(),
  closedBy: z.string().optional(),
  closureSummary: z.string().optional(),
  closureChecklistComplete: z.boolean().default(false),
  createdAt: z.string().optional(),
});

const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();

type FuneralCaseRecord = Awaited<ReturnType<typeof prisma.funeralCase.findUnique>> extends infer T ? NonNullable<T> : never;
type JsonRecord = Record<string, unknown>;

function asJsonArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

function normalizeStaffEntry(item: JsonRecord): JsonRecord {
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

function normalizeTaskEntry(item: JsonRecord): JsonRecord {
  const completed = Boolean(item.completed);
  return {
    ...item,
    completed,
    completedAt: completed && typeof item.completedAt === 'string' ? item.completedAt : undefined,
    completedBy: completed && typeof item.completedBy === 'string' ? item.completedBy : undefined,
  };
}

function normalizeMilestoneEntry(item: JsonRecord): JsonRecord {
  const status = typeof item.status === 'string' ? item.status : 'pending';
  return {
    ...item,
    status,
  };
}

function buildDefaultMilestones(input: z.infer<typeof createCaseSchema>): Array<z.infer<typeof milestoneSchema>> {
  const milestones: Array<z.infer<typeof milestoneSchema>> = [
    {
      id: generateId('ms'),
      type: 'death_notice_logged',
      title: 'Death Notice Logged',
      scheduledDate: input.deathNoticeLoggedAt || input.createdAt || new Date().toISOString().slice(0, 10),
      status: 'completed',
      completedAt: input.deathNoticeLoggedAt || new Date().toISOString(),
    },
    {
      id: generateId('ms'),
      type: 'body_collection',
      title: 'Body Collection',
      scheduledDate: input.bodyCollectionLocation ? input.dateOfDeath : undefined,
      status: input.bodyCollected ? 'completed' : 'pending',
      notes: input.bodyCollectionLocation,
      completedAt: input.bodyCollected ? new Date().toISOString() : undefined,
    },
    {
      id: generateId('ms'),
      type: 'documentation_collection',
      title: 'Documentation Collection',
      status: 'pending',
    },
    {
      id: generateId('ms'),
      type: 'family_meeting',
      title: 'Family Meeting',
      status: 'pending',
    },
    {
      id: generateId('ms'),
      type: 'funeral_service',
      title: 'Funeral Service',
      scheduledDate: input.funeralDate,
      status: input.funeralDate ? 'scheduled' : 'pending',
    },
    {
      id: generateId('ms'),
      type: 'burial_or_cremation',
      title: 'Burial Or Cremation',
      status: 'pending',
    },
    {
      id: generateId('ms'),
      type: 'case_closure',
      title: 'Case Closure',
      status: 'pending',
    },
  ];

  return milestones;
}

function hasScheduledFuneralService(milestones: JsonRecord[]): boolean {
  return milestones.some((item) => item.type === 'funeral_service' && typeof item.scheduledDate === 'string' && item.scheduledDate.length >= 8);
}

function canAssignAcrossBranches(actor?: Express.SessionActor): boolean {
  return actor?.role === 'safpa_admin' || actor?.role === 'parlour_owner';
}

async function validateStaffAssignment(record: FuneralCaseRecord, actor: Express.SessionActor | undefined, input: { staffUserId?: string; role?: string; displayName?: string; name?: string }) {
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

  const user = await prisma.appUser.findUnique({ where: { id: input.staffUserId } });
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

function validateLifecycleTransition(record: FuneralCaseRecord, nextStatus: z.infer<typeof caseStatusEnum>, updates?: { closureSummary?: string; closureChecklistComplete?: boolean; milestones?: JsonRecord[] }) {
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

function normalizeCase(record: FuneralCaseRecord) {
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

async function dispatchFuneralCaseCommunication(params: {
  funeralCase: {
    id: string;
    caseNumber: string;
    parlourId: string;
    deceasedName: string;
    informantName: string | null;
    informantPhone: string | null;
    coordinatorName: string | null;
    funeralDate: string | null;
    venue: string | null;
    status: string;
  };
  eventType: 'case_opened' | 'service_scheduled' | 'documents_required' | 'case_completed';
  statusMessage: string;
  actorName?: string;
}) {
  if (!params.funeralCase.informantPhone) {
    return;
  }

  await dispatchCommunication(prisma, {
    parlourId: params.funeralCase.parlourId,
    type: 'sms',
    recipientName: params.funeralCase.informantName || 'Family Contact',
    recipientContact: params.funeralCase.informantPhone,
    trigger: 'funeral_case_update',
    body: 'Dear {family_contact}, case {case_number} update: {status_message}. Coordinator: {coordinator_name}.',
    variables: {
      family_contact: params.funeralCase.informantName || 'Family Contact',
      case_number: params.funeralCase.caseNumber,
      status_message: params.statusMessage,
      coordinator_name: params.funeralCase.coordinatorName || 'Assigned Coordinator',
      coordinator_phone: '',
    },
    metadata: {
      funeralCaseId: params.funeralCase.id,
      caseNumber: params.funeralCase.caseNumber,
      eventType: params.eventType,
      relatedEntityType: 'funeral_case',
      relatedEntityId: params.funeralCase.id,
    },
    createdBy: params.actorName,
  });
}

export const funeralCasesRouter = Router();

funeralCasesRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const records = await prisma.funeralCase.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    records.map((record) => normalizeCase(record))
  );
});

funeralCasesRouter.get('/:id', async (req, res) => {
  const record = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!record) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  return res.json(normalizeCase(record));
});

funeralCasesRouter.post('/', async (req, res) => {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid case payload', errors: parsed.error.flatten() });
  }

  const createdOn = parsed.data.createdAt || new Date().toISOString().slice(0, 10);

  const record = await prisma.funeralCase.create({
    data: {
      id: generateId('fc'),
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
      tasks: parsed.data.tasks as Prisma.InputJsonValue,
      notes: parsed.data.notes as Prisma.InputJsonValue,
      staff: parsed.data.staff.map((item) => ({
        ...item,
        displayName: item.displayName || item.name,
        name: item.displayName || item.name,
      })) as Prisma.InputJsonValue,
      vehicles: parsed.data.vehicles as Prisma.InputJsonValue,
      suppliers: parsed.data.suppliers as Prisma.InputJsonValue,
      milestones: (parsed.data.milestones.length > 0 ? parsed.data.milestones : buildDefaultMilestones(parsed.data)) as Prisma.InputJsonValue,
      closedAt: parsed.data.closedAt,
      closedBy: parsed.data.closedBy,
      closureSummary: parsed.data.closureSummary,
      closureChecklistComplete: parsed.data.closureChecklistComplete,
      createdOn,
    },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_CREATED',
    entityType: 'Funeral Case',
    entityId: record.id,
    entityLabel: record.caseNumber,
    parlourId: record.parlourId,
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_DEATH_NOTICE_LOGGED',
    entityType: 'Funeral Case',
    entityId: record.id,
    entityLabel: record.caseNumber,
    parlourId: record.parlourId,
    details: `informant=${parsed.data.informantName}`,
  });

  await dispatchFuneralCaseCommunication({
    funeralCase: record,
    eventType: 'case_opened',
    statusMessage: `Death notice logged for ${record.deceasedName}. Your coordinator is ${record.coordinatorName}.`,
    actorName: req.actor?.userName || req.actor?.userId,
  });

  return res.status(201).json(normalizeCase(record));
});

funeralCasesRouter.patch('/:id', async (req, res) => {
  const parsed = updateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid case payload', errors: parsed.error.flatten() });
  }

  const payload: Record<string, unknown> = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
    payload.createdOn = payload.createdAt;
    delete payload.createdAt;
  }

  try {
    const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Funeral case not found' });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status') && typeof payload.status === 'string') {
      const lifecycleError = validateLifecycleTransition(existing, payload.status as z.infer<typeof caseStatusEnum>, {
        closureSummary: typeof payload.closureSummary === 'string' ? payload.closureSummary : undefined,
        closureChecklistComplete: typeof payload.closureChecklistComplete === 'boolean' ? payload.closureChecklistComplete : undefined,
        milestones: Array.isArray(payload.milestones) ? (payload.milestones as JsonRecord[]) : undefined,
      });

      if (lifecycleError) {
        return res.status(400).json({ message: lifecycleError });
      }

      if (payload.status === 'completed') {
        payload.closedAt = existing.closedAt || new Date().toISOString();
        payload.closedBy = existing.closedBy || req.actor?.userName || req.actor?.userId;
      }
    }

    const record = await prisma.funeralCase.update({
      where: { id: req.params.id },
      data: payload,
    });

    await writeAuditLog(req, {
      action: 'FUNERAL_CASE_UPDATED',
      entityType: 'Funeral Case',
      entityId: record.id,
      entityLabel: record.caseNumber,
      parlourId: record.parlourId,
    });

    if ((parsed.data.funeralDate && parsed.data.funeralDate !== existing.funeralDate) || (parsed.data.status === 'scheduled' && existing.status !== 'scheduled')) {
      await dispatchFuneralCaseCommunication({
        funeralCase: record,
        eventType: 'service_scheduled',
        statusMessage: `Funeral service scheduled for ${record.funeralDate || 'TBC'} at ${record.venue || 'venue pending'}.`,
        actorName: req.actor?.userName || req.actor?.userId,
      });
    }

    if (parsed.data.status === 'completed' && existing.status !== 'completed') {
      await dispatchFuneralCaseCommunication({
        funeralCase: record,
        eventType: 'case_completed',
        statusMessage: `Case ${record.caseNumber} has been completed and closed.`,
        actorName: req.actor?.userName || req.actor?.userId,
      });
    }

    return res.json(normalizeCase(record));
  } catch {
    return res.status(404).json({ message: 'Funeral case not found' });
  }
});

funeralCasesRouter.patch('/:id/status', async (req, res) => {
  const schema = z.object({ status: caseStatusEnum });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
  }

  try {
    const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Funeral case not found' });
    }

    const lifecycleError = validateLifecycleTransition(existing, parsed.data.status);
    if (lifecycleError) {
      return res.status(400).json({ message: lifecycleError });
    }

    const record = await prisma.funeralCase.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        closedAt: parsed.data.status === 'completed' ? existing.closedAt || new Date().toISOString() : existing.closedAt,
        closedBy: parsed.data.status === 'completed' ? existing.closedBy || req.actor?.userName || req.actor?.userId : existing.closedBy,
      },
    });

    await writeAuditLog(req, {
      action: 'FUNERAL_CASE_STATUS_CHANGED',
      entityType: 'Funeral Case',
      entityId: record.id,
      entityLabel: record.caseNumber,
      parlourId: record.parlourId,
      details: `status=${record.status}`,
    });

    if (record.status === 'scheduled' && existing.status !== 'scheduled') {
      await dispatchFuneralCaseCommunication({
        funeralCase: record,
        eventType: 'service_scheduled',
        statusMessage: `Funeral service scheduled for ${record.funeralDate || 'TBC'} at ${record.venue || 'venue pending'}.`,
        actorName: req.actor?.userName || req.actor?.userId,
      });
    }

    if (record.status === 'completed' && existing.status !== 'completed') {
      await dispatchFuneralCaseCommunication({
        funeralCase: record,
        eventType: 'case_completed',
        statusMessage: `Case ${record.caseNumber} has been completed and closed.`,
        actorName: req.actor?.userName || req.actor?.userId,
      });
    }

    return res.json(normalizeCase(record));
  } catch {
    return res.status(404).json({ message: 'Funeral case not found' });
  }
});

funeralCasesRouter.post('/:id/tasks', async (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    category: taskCategoryEnum.optional(),
    milestoneId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid task payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const tasks = Array.isArray(existing.tasks) ? (existing.tasks as Array<Record<string, unknown>>) : [];
  const task = {
    id: generateId('t'),
    title: parsed.data.title,
    completed: false,
    assignee: parsed.data.assignee,
    dueDate: parsed.data.dueDate,
    category: parsed.data.category,
    milestoneId: parsed.data.milestoneId,
  };

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { tasks: [...tasks, task] as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_TASK_ADDED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `task=${task.title}`,
  });

  if (task.category === 'documentation') {
    await dispatchFuneralCaseCommunication({
      funeralCase: updated,
      eventType: 'documents_required',
      statusMessage: `Additional documents are required for case ${updated.caseNumber}. Please contact ${updated.coordinatorName} for assistance.`,
      actorName: req.actor?.userName || req.actor?.userId,
    });
  }

  return res.status(201).json(normalizeCase(updated));
});

funeralCasesRouter.patch('/:id/tasks/:taskId', async (req, res) => {
  const schema = z.object({
    title: z.string().min(2).optional(),
    completed: z.boolean().optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    category: taskCategoryEnum.optional(),
    milestoneId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid task payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const tasks = Array.isArray(existing.tasks) ? (existing.tasks as Array<Record<string, unknown>>) : [];
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

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { tasks: updatedTasks as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_TASK_UPDATED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `taskId=${req.params.taskId}`,
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id/tasks/:taskId', async (req, res) => {
  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const tasks = Array.isArray(existing.tasks) ? (existing.tasks as Array<Record<string, unknown>>) : [];
  const updatedTasks = tasks.filter((item) => String(item.id) !== req.params.taskId);

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { tasks: updatedTasks as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_TASK_DELETED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `taskId=${req.params.taskId}`,
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.post('/:id/notes', async (req, res) => {
  const schema = z.object({ note: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid note payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const notes = Array.isArray(existing.notes) ? (existing.notes as string[]) : [];
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { notes: [...notes, parsed.data.note] as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_NOTE_ADDED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
  });

  return res.status(201).json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id/notes/:index', async (req, res) => {
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ message: 'Invalid note index' });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const notes = Array.isArray(existing.notes) ? (existing.notes as string[]) : [];
  if (index >= notes.length) {
    return res.status(404).json({ message: 'Note not found' });
  }

  const updatedNotes = notes.filter((_, idx) => idx !== index);
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { notes: updatedNotes as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_NOTE_DELETED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `index=${index}`,
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.post('/:id/staff', async (req, res) => {
  const parsed = staffSchema.omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid staff payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const staff = Array.isArray(existing.staff) ? (existing.staff as Array<Record<string, unknown>>) : [];
  try {
    const validated = await validateStaffAssignment(existing, req.actor, parsed.data);
    const staffItem = { id: generateId('stf'), ...validated };

    const updated = await prisma.funeralCase.update({
      where: { id: existing.id },
      data: { staff: [...staff, staffItem] as Prisma.InputJsonValue },
    });

    await writeAuditLog(req, {
      action: 'FUNERAL_CASE_STAFF_ASSIGNED',
      entityType: 'Funeral Case',
      entityId: updated.id,
      entityLabel: updated.caseNumber,
      parlourId: updated.parlourId,
      details: `staff=${staffItem.displayName}`,
    });

    return res.status(201).json(normalizeCase(updated));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid staff assignment' });
  }
});

funeralCasesRouter.patch('/:id/staff/:staffId', async (req, res) => {
  const parsed = staffSchema.omit({ id: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid staff payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const staff = Array.isArray(existing.staff) ? (existing.staff as Array<Record<string, unknown>>) : [];
  const currentItem = staff.find((item) => String(item.id) === req.params.staffId);
  if (!currentItem) {
    return res.status(404).json({ message: 'Assigned staff not found' });
  }

  try {
    const validated = await validateStaffAssignment(existing, req.actor, {
      staffUserId: typeof parsed.data.staffUserId === 'string' ? parsed.data.staffUserId : typeof currentItem.staffUserId === 'string' ? (currentItem.staffUserId as string) : undefined,
      displayName: typeof parsed.data.displayName === 'string' ? parsed.data.displayName : typeof currentItem.displayName === 'string' ? (currentItem.displayName as string) : undefined,
      name: typeof parsed.data.name === 'string' ? parsed.data.name : typeof currentItem.name === 'string' ? (currentItem.name as string) : undefined,
      role: parsed.data.role || (typeof currentItem.role === 'string' ? (currentItem.role as string) : undefined),
    });

    const updatedStaff = staff.map((item) => (String(item.id) === req.params.staffId ? { ...item, ...validated } : item));
    const updated = await prisma.funeralCase.update({
      where: { id: existing.id },
      data: { staff: updatedStaff as Prisma.InputJsonValue },
    });

    return res.json(normalizeCase(updated));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid staff assignment' });
  }
});

funeralCasesRouter.delete('/:id/staff/:staffId', async (req, res) => {
  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const staff = Array.isArray(existing.staff) ? (existing.staff as Array<Record<string, unknown>>) : [];
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { staff: staff.filter((item) => String(item.id) !== req.params.staffId) as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.post('/:id/vehicles', async (req, res) => {
  const parsed = vehicleSchema.omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid vehicle payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const vehicles = Array.isArray(existing.vehicles) ? (existing.vehicles as Array<Record<string, unknown>>) : [];
  const vehicleItem = { id: generateId('vhc'), reg: parsed.data.reg, type: parsed.data.type, driver: parsed.data.driver };
  const enrichedVehicleItem = {
    ...vehicleItem,
    capacity: parsed.data.capacity,
    purpose: parsed.data.purpose,
    availabilityStatus: parsed.data.availabilityStatus || 'allocated',
  };

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { vehicles: [...vehicles, enrichedVehicleItem] as Prisma.InputJsonValue },
  });

  return res.status(201).json(normalizeCase(updated));
});

funeralCasesRouter.patch('/:id/vehicles/:vehicleId', async (req, res) => {
  const parsed = vehicleSchema.omit({ id: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid vehicle payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const vehicles = Array.isArray(existing.vehicles) ? (existing.vehicles as Array<Record<string, unknown>>) : [];
  const updatedVehicles = vehicles.map((item) => (String(item.id) === req.params.vehicleId ? { ...item, ...parsed.data } : item));
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { vehicles: updatedVehicles as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.post('/:id/milestones', async (req, res) => {
  const parsed = milestoneSchema.omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid milestone payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const milestones = asJsonArray(existing.milestones);
  const milestoneItem = {
    id: generateId('ms'),
    ...parsed.data,
    completedAt: parsed.data.status === 'completed' ? parsed.data.completedAt || new Date().toISOString() : undefined,
  };

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { milestones: [...milestones, milestoneItem] as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_MILESTONE_ADDED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `milestone=${milestoneItem.title}`,
  });

  return res.status(201).json(normalizeCase(updated));
});

funeralCasesRouter.patch('/:id/milestones/:milestoneId', async (req, res) => {
  const parsed = milestoneSchema.omit({ id: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid milestone payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
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

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { milestones: updatedMilestones as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_MILESTONE_UPDATED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `milestoneId=${req.params.milestoneId}`,
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id/milestones/:milestoneId', async (req, res) => {
  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const milestones = asJsonArray(existing.milestones);
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { milestones: milestones.filter((item) => String(item.id) !== req.params.milestoneId) as Prisma.InputJsonValue },
  });

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_MILESTONE_DELETED',
    entityType: 'Funeral Case',
    entityId: updated.id,
    entityLabel: updated.caseNumber,
    parlourId: updated.parlourId,
    details: `milestoneId=${req.params.milestoneId}`,
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id/vehicles/:vehicleId', async (req, res) => {
  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const vehicles = Array.isArray(existing.vehicles) ? (existing.vehicles as Array<Record<string, unknown>>) : [];
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { vehicles: vehicles.filter((item) => String(item.id) !== req.params.vehicleId) as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.post('/:id/suppliers', async (req, res) => {
  const parsed = supplierSchema.omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid supplier payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const suppliers = Array.isArray(existing.suppliers) ? (existing.suppliers as Array<Record<string, unknown>>) : [];
  const supplierItem = { id: generateId('sup'), name: parsed.data.name, service: parsed.data.service, status: parsed.data.status };

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { suppliers: [...suppliers, supplierItem] as Prisma.InputJsonValue },
  });

  return res.status(201).json(normalizeCase(updated));
});

funeralCasesRouter.patch('/:id/suppliers/:supplierId', async (req, res) => {
  const parsed = supplierSchema.omit({ id: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid supplier payload', errors: parsed.error.flatten() });
  }

  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const suppliers = Array.isArray(existing.suppliers) ? (existing.suppliers as Array<Record<string, unknown>>) : [];
  const updatedSuppliers = suppliers.map((item) => (String(item.id) === req.params.supplierId ? { ...item, ...parsed.data } : item));
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { suppliers: updatedSuppliers as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id/suppliers/:supplierId', async (req, res) => {
  const existing = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  const suppliers = Array.isArray(existing.suppliers) ? (existing.suppliers as Array<Record<string, unknown>>) : [];
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { suppliers: suppliers.filter((item) => String(item.id) !== req.params.supplierId) as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
});

funeralCasesRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await prisma.funeralCase.delete({ where: { id: req.params.id } });

    await writeAuditLog(req, {
      action: 'FUNERAL_CASE_DELETED',
      entityType: 'Funeral Case',
      entityId: deleted.id,
      entityLabel: deleted.caseNumber,
      parlourId: deleted.parlourId,
    });

    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: 'Funeral case not found' });
  }
});
