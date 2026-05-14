import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const DEMO_PASSWORD = 'demo123';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator', 'policyholder_customer']),
});

export const authRouter = Router();

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

  const user = await prisma.appUser.findFirst({
    where: {
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'active',
    },
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const memberId = await resolveCustomerMemberId(user);

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
