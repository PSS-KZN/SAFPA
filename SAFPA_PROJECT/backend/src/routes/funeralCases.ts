import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const caseStatusEnum = z.enum(['logged', 'in_progress', 'scheduled', 'completed', 'archived']);
const caseTypeEnum = z.enum(['policy', 'cash', 'private']);

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2),
  completed: z.boolean().default(false),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
});

const createCaseSchema = z.object({
  parlourId: z.string().min(1),
  branchId: z.string().min(1),
  deceasedName: z.string().min(2),
  deceasedIdNumber: z.string().min(6),
  dateOfDeath: z.string().min(8),
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
  createdAt: z.string().optional(),
});

const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();

export const funeralCasesRouter = Router();

funeralCasesRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const records = await prisma.funeralCase.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    records.map((record) => ({
      ...record,
      createdAt: record.createdOn,
    }))
  );
});

funeralCasesRouter.get('/:id', async (req, res) => {
  const record = await prisma.funeralCase.findUnique({ where: { id: req.params.id } });
  if (!record) {
    return res.status(404).json({ message: 'Funeral case not found' });
  }

  return res.json({ ...record, createdAt: record.createdOn });
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

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_CREATED',
    entityType: 'Funeral Case',
    entityId: record.id,
    entityLabel: record.caseNumber,
    parlourId: record.parlourId,
  });

  return res.status(201).json({ ...record, createdAt: record.createdOn });
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

    return res.json({ ...record, createdAt: record.createdOn });
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
    const record = await prisma.funeralCase.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'FUNERAL_CASE_STATUS_CHANGED',
      entityType: 'Funeral Case',
      entityId: record.id,
      entityLabel: record.caseNumber,
      parlourId: record.parlourId,
      details: `status=${record.status}`,
    });

    return res.json({ ...record, createdAt: record.createdOn });
  } catch {
    return res.status(404).json({ message: 'Funeral case not found' });
  }
});

funeralCasesRouter.post('/:id/tasks', async (req, res) => {
  const schema = z.object({ title: z.string().min(2), assignee: z.string().optional(), dueDate: z.string().optional() });
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

  return res.status(201).json({ ...updated, createdAt: updated.createdOn });
});

funeralCasesRouter.patch('/:id/tasks/:taskId', async (req, res) => {
  const schema = z.object({
    title: z.string().min(2).optional(),
    completed: z.boolean().optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
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

    return {
      ...item,
      ...parsed.data,
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

  return res.json({ ...updated, createdAt: updated.createdOn });
});
