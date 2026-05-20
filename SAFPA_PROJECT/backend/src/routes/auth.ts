import { Router } from 'express';
import { z } from 'zod';
import { resetDemoSessionData } from '../lib/demoReset';
import { prisma } from '../lib/prisma';
import { writeUsageEvent } from '../lib/usage';

const DEMO_PASSWORD = 'demo123';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator', 'policyholder_customer']),
});

export const authRouter = Router();

authRouter.post('/demo-session/reset', async (_req, res) => {
  try {
    await resetDemoSessionData();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to reset demo session data',
    });
  }
});

authRouter.get('/demo-users', async (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const users = await prisma.appUser.findMany({
    where: {
      status: 'active',
      ...(role ? { role } : {}),
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parlourId: true,
      branchId: true,
      memberId: true,
      status: true,
    },
  });

  return res.json(users);
});

async function resolvePolicyholderUser(email: string) {
  const member = await prisma.member.findFirst({
    where: { email },
    select: {
      id: true,
      parlourId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!member) {
    return null;
  }

  const displayName = `${member.firstName} ${member.lastName}`.trim();
  const existing = await prisma.appUser.findFirst({
    where: {
      OR: [{ email }, { memberId: member.id }],
    },
  });

  if (existing) {
    return prisma.appUser.update({
      where: { id: existing.id },
      data: {
        name: displayName,
        email,
        role: 'policyholder_customer',
        parlourId: member.parlourId,
        branchId: member.branchId,
        memberId: member.id,
        status: 'active',
      },
    });
  }

  return prisma.appUser.create({
    data: {
      id: `u-customer-${member.id}`,
      name: displayName,
      email,
      role: 'policyholder_customer',
      parlourId: member.parlourId,
      branchId: member.branchId,
      memberId: member.id,
      status: 'active',
    },
  });
}

async function resolveCustomerMemberId(user: { role: string; email: string; parlourId?: string | null; memberId?: string | null }) {
  if (user.role !== 'policyholder_customer') {
    return user.memberId || undefined;
  }

  if (user.memberId) {
    return user.memberId;
  }

  const member = await prisma.member.findFirst({
    where: {
      email: user.email,
      ...(user.parlourId ? { parlourId: user.parlourId } : {}),
    },
    select: { id: true },
  });

  return member?.id;
}

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Provide email, password, and role' });
  }

  if (parsed.data.password !== DEMO_PASSWORD) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  let user = await prisma.appUser.findFirst({
    where: {
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'active',
    },
  });

  if (!user && parsed.data.role === 'policyholder_customer') {
    user = await resolvePolicyholderUser(parsed.data.email);
  }

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const memberId = await resolveCustomerMemberId(user);

  await writeUsageEvent(req, {
    module: 'auth',
    eventType: 'login_success',
    parlourId: user.parlourId || undefined,
    branchId: user.branchId || undefined,
    entityType: 'User',
    entityId: user.id,
    actor: {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    },
  });

  return res.json({
    token: user.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      parlourId: user.parlourId,
      branchId: user.branchId,
      memberId,
    },
  });
});

authRouter.get('/session', async (req, res) => {
  const userId = req.header('x-user-id') || (req.header('authorization')?.replace(/^Bearer\s+/i, '') || '');
  if (!userId) {
    return res.status(200).json({ authenticated: false });
  }

  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user || user.status !== 'active') {
    return res.status(200).json({ authenticated: false });
  }

  const memberId = await resolveCustomerMemberId(user);

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      parlourId: user.parlourId,
      branchId: user.branchId,
      memberId,
    },
  });
});
