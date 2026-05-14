import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';
import { assertCreateLimit } from '../lib/subscription';

const roleEnum = z.enum([
  'safpa_admin',
  'parlour_owner',
  'branch_manager',
  'policy_admin',
  'collections_clerk',
  'operations_coordinator',
  'policyholder_customer',
]);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: roleEnum,
  parlourId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  avatar: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateUserSchema = createUserSchema.partial();
const updateStatusSchema = z.object({ status: z.enum(['active', 'inactive']) });

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const parlourId = req.query.parlourId;

  const users = await prisma.appUser.findMany({
    where: typeof parlourId === 'string' ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid user payload',
      errors: parsed.error.flatten(),
    });
  }

  if (parsed.data.parlourId) {
    try {
      await assertCreateLimit(parsed.data.parlourId, 'users');
    } catch (error) {
      return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
  }

  try {
    const user = await prisma.appUser.create({
      data: {
        id: `u${Date.now()}`,
        ...parsed.data,
      },
    });

    await writeAuditLog(req, {
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      entityLabel: user.name,
      parlourId: user.parlourId || undefined,
    });

    return res.status(201).json(user);
  } catch {
    return res.status(409).json({ message: 'User with this email already exists' });
  }
});

usersRouter.patch('/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid user payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await prisma.appUser.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      entityLabel: user.name,
      parlourId: user.parlourId || undefined,
    });

    return res.json(user);
  } catch {
    return res.status(404).json({ message: 'User not found' });
  }
});

usersRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid status payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await prisma.appUser.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: user.id,
      entityLabel: user.name,
      parlourId: user.parlourId || undefined,
      details: `status=${user.status}`,
    });

    return res.json(user);
  } catch {
    return res.status(404).json({ message: 'User not found' });
  }
});
