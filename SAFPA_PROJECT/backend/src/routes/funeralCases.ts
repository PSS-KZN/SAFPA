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

const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  role: z.string().min(2),
});

const vehicleSchema = z.object({
  id: z.string().optional(),
  reg: z.string().min(2),
  type: z.string().min(2),
  driver: z.string().min(2),
});

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  service: z.string().min(2),
  status: z.enum(['pending', 'confirmed']).default('pending'),
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
  staff: z.array(staffSchema).default([]),
  vehicles: z.array(vehicleSchema).default([]),
  suppliers: z.array(supplierSchema).default([]),
  createdAt: z.string().optional(),
});

const updateCaseSchema = createCaseSchema.omit({ parlourId: true }).partial();

function normalizeCase(record: Awaited<ReturnType<typeof prisma.funeralCase.findUnique>> extends infer T ? NonNullable<T> : never) {
  return {
    ...record,
    createdAt: record.createdOn,
    staff: Array.isArray(record.staff) ? record.staff : [],
    vehicles: Array.isArray(record.vehicles) ? record.vehicles : [],
    suppliers: Array.isArray(record.suppliers) ? record.suppliers : [],
  };
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

  await writeAuditLog(req, {
    action: 'FUNERAL_CASE_CREATED',
    entityType: 'Funeral Case',
    entityId: record.id,
    entityLabel: record.caseNumber,
    parlourId: record.parlourId,
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

    return res.json(normalizeCase(record));
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

  return res.status(201).json(normalizeCase(updated));
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
  const staffItem = { id: generateId('stf'), name: parsed.data.name, role: parsed.data.role };

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { staff: [...staff, staffItem] as Prisma.InputJsonValue },
  });

  return res.status(201).json(normalizeCase(updated));
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
  const updatedStaff = staff.map((item) => (String(item.id) === req.params.staffId ? { ...item, ...parsed.data } : item));
  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { staff: updatedStaff as Prisma.InputJsonValue },
  });

  return res.json(normalizeCase(updated));
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

  const updated = await prisma.funeralCase.update({
    where: { id: existing.id },
    data: { vehicles: [...vehicles, vehicleItem] as Prisma.InputJsonValue },
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
