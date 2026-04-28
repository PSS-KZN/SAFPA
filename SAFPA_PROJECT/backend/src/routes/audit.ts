import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const auditRouter = Router();

auditRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;

  const entries = await prisma.auditEntry.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200,
  });

  return res.json(entries);
});
