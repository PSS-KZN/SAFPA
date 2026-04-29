import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';
import { assertCreateLimit } from '../lib/subscription';

const createProductSchema = z.object({
  parlourId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(2),
  premiumFrom: z.number().int().nonnegative(),
  coverFrom: z.number().int().nonnegative(),
  maxDependants: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

const updateProductSchema = createProductSchema.omit({ parlourId: true }).partial();

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const products = await prisma.product.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(products);
});

productsRouter.post('/', async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid product payload', errors: parsed.error.flatten() });
  }

  try {
    await assertCreateLimit(parsed.data.parlourId, 'products');
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
  }

  const product = await prisma.product.create({
    data: {
      id: generateId('pr'),
      ...parsed.data,
    },
  });

  await writeAuditLog(req, {
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: product.id,
    entityLabel: product.name,
    parlourId: product.parlourId,
  });

  return res.status(201).json(product);
});

productsRouter.patch('/:id', async (req, res) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid product payload', errors: parsed.error.flatten() });
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product.id,
      entityLabel: product.name,
      parlourId: product.parlourId,
    });

    return res.json(product);
  } catch {
    return res.status(404).json({ message: 'Product not found' });
  }
});

productsRouter.patch('/:id/status', async (req, res) => {
  const statusSchema = z.object({ isActive: z.boolean() });
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: parsed.data.isActive },
    });

    await writeAuditLog(req, {
      action: 'PRODUCT_STATUS_CHANGED',
      entityType: 'Product',
      entityId: product.id,
      entityLabel: product.name,
      parlourId: product.parlourId,
      details: `isActive=${String(product.isActive)}`,
    });

    return res.json(product);
  } catch {
    return res.status(404).json({ message: 'Product not found' });
  }
});
