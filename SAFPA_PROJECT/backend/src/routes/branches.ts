import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';
import { assertCreateLimit } from '../lib/subscription';

const createBranchSchema = z.object({
  parlourId: z.string().min(1),
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  province: z.string().min(2),
  manager: z.string().min(2),
  phone: z.string().min(7),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateBranchSchema = createBranchSchema.omit({ parlourId: true }).partial();
const updateStatusSchema = z.object({ status: z.enum(['active', 'inactive']) });

export const branchesRouter = Router();

branchesRouter.get('/', async (req, res) => {
  const parlourId = req.query.parlourId;

  const branches = await prisma.branch.findMany({
    where: typeof parlourId === 'string' ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json(branches);
});

branchesRouter.post('/', async (req, res) => {
  const parsed = createBranchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid branch payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    await assertCreateLimit(parsed.data.parlourId, 'branches');
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
  }

  const branch = await prisma.branch.create({
    data: {
      id: `b${Date.now()}`,
      ...parsed.data,
    },
  });

  await writeAuditLog(req, {
    action: 'BRANCH_CREATED',
    entityType: 'Branch',
    entityId: branch.id,
    entityLabel: branch.name,
    parlourId: branch.parlourId,
  });

  return res.status(201).json(branch);
});

branchesRouter.patch('/:id', async (req, res) => {
  const parsed = updateBranchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid branch payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'BRANCH_UPDATED',
      entityType: 'Branch',
      entityId: branch.id,
      entityLabel: branch.name,
      parlourId: branch.parlourId,
    });

    return res.json(branch);
  } catch {
    return res.status(404).json({ message: 'Branch not found' });
  }
});

branchesRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid status payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'BRANCH_STATUS_CHANGED',
      entityType: 'Branch',
      entityId: branch.id,
      entityLabel: branch.name,
      parlourId: branch.parlourId,
      details: `status=${branch.status}`,
    });

    return res.json(branch);
  } catch {
    return res.status(404).json({ message: 'Branch not found' });
  }
});
