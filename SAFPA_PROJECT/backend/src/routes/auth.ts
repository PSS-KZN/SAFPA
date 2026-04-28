import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const loginSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success || (!parsed.data.userId && !parsed.data.email)) {
    return res.status(400).json({ message: 'Provide userId or email' });
  }

  const user = await prisma.appUser.findFirst({
    where: {
      ...(parsed.data.userId ? { id: parsed.data.userId } : {}),
      ...(parsed.data.email ? { email: parsed.data.email } : {}),
      status: 'active',
    },
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json({
    token: user.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      parlourId: user.parlourId,
      branchId: user.branchId,
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

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      parlourId: user.parlourId,
      branchId: user.branchId,
    },
  });
});
