import { Router } from 'express';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const leadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);

const createLeadSchema = z.object({
  parlourId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  source: z.enum(['website', 'branch', 'agent', 'referral']).default('website'),
  status: leadStatusEnum.default('new'),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
});

const updateLeadSchema = createLeadSchema.partial();
const updateLeadStatusSchema = z.object({ status: leadStatusEnum });

const websiteInquirySchema = z.object({
  parlourId: z.string().min(1),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  message: z.string().max(1000).optional(),
  trap: z.string().optional(),
});

const convertLeadSchema = z.object({
  branchId: z.string().min(1).optional(),
  createPolicy: z.boolean().default(false),
  productId: z.string().optional(),
  premiumAmount: z.number().int().positive().optional(),
  coverAmount: z.number().int().positive().optional(),
});

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const leadsRouter = Router();

leadsRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const leads = await prisma.lead.findMany({
    where: parlourId ? { parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    leads.map((lead) => ({
      ...lead,
      createdAt: lead.createdOn,
    }))
  );
});

leadsRouter.post('/', async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid lead payload', errors: parsed.error.flatten() });
  }

  const createdOn = parsed.data.createdAt || todayString();

  const lead = await prisma.lead.create({
    data: {
      id: generateId('l'),
      parlourId: parsed.data.parlourId,
      branchId: parsed.data.branchId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      source: parsed.data.source,
      status: parsed.data.status,
      assignedTo: parsed.data.assignedTo,
      notes: parsed.data.notes,
      createdOn,
    },
  });

  await writeAuditLog(req, {
    action: 'LEAD_CREATED',
    entityType: 'Lead',
    entityId: lead.id,
    entityLabel: `${lead.firstName} ${lead.lastName}`,
    parlourId: lead.parlourId,
  });

  return res.status(201).json({ ...lead, createdAt: lead.createdOn });
});

leadsRouter.post('/website-inquiry', async (req, res) => {
  const parsed = websiteInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid inquiry payload', errors: parsed.error.flatten() });
  }

  if (parsed.data.trap) {
    return res.status(200).json({ ok: true });
  }

  const lead = await prisma.lead.create({
    data: {
      id: generateId('l'),
      parlourId: parsed.data.parlourId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      source: 'website',
      status: 'new',
      notes: parsed.data.message,
      createdOn: todayString(),
    },
  });

  await writeAuditLog(req, {
    action: 'WEBSITE_INQUIRY_CREATED',
    entityType: 'Lead',
    entityId: lead.id,
    entityLabel: `${lead.firstName} ${lead.lastName}`,
    parlourId: lead.parlourId,
  });

  return res.status(201).json({ ok: true, leadId: lead.id });
});

leadsRouter.patch('/:id', async (req, res) => {
  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid lead payload', errors: parsed.error.flatten() });
  }

  const payload: Record<string, unknown> = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(payload, 'createdAt')) {
    payload.createdOn = payload.createdAt;
    delete payload.createdAt;
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: payload,
    });

    await writeAuditLog(req, {
      action: 'LEAD_UPDATED',
      entityType: 'Lead',
      entityId: lead.id,
      entityLabel: `${lead.firstName} ${lead.lastName}`,
      parlourId: lead.parlourId,
    });

    return res.json({ ...lead, createdAt: lead.createdOn });
  } catch {
    return res.status(404).json({ message: 'Lead not found' });
  }
});

leadsRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateLeadStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status payload', errors: parsed.error.flatten() });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'LEAD_STATUS_CHANGED',
      entityType: 'Lead',
      entityId: lead.id,
      entityLabel: `${lead.firstName} ${lead.lastName}`,
      parlourId: lead.parlourId,
      details: `status=${lead.status}`,
    });

    return res.json({ ...lead, createdAt: lead.createdOn });
  } catch {
    return res.status(404).json({ message: 'Lead not found' });
  }
});

leadsRouter.post('/:id/convert', async (req, res) => {
  const parsed = convertLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid conversion payload', errors: parsed.error.flatten() });
  }

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }

  if (lead.status === 'converted') {
    return res.status(400).json({ message: 'Lead already converted' });
  }

  const memberResult = await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        id: generateId('m'),
        parlourId: lead.parlourId,
        branchId: parsed.data.branchId || lead.branchId || 'b1',
        firstName: lead.firstName,
        lastName: lead.lastName,
        idNumber: `TEMP-${Date.now()}`,
        phone: lead.phone,
        email: lead.email || '',
        address: '',
        city: '',
        province: '',
        joinDate: todayString(),
        status: 'active',
        dependants: [],
        beneficiaries: [],
      },
    });

    let policyId: string | null = null;

    if (parsed.data.createPolicy && parsed.data.productId) {
      const product = await tx.product.findUnique({ where: { id: parsed.data.productId } });
      if (product) {
        const policy = await tx.policy.create({
          data: {
            id: generateId('pol'),
            policyNumber: `POL-${Date.now()}`,
            memberId: member.id,
            parlourId: lead.parlourId,
            productId: product.id,
            productName: product.name,
            status: 'pending',
            premiumAmount: parsed.data.premiumAmount || product.premiumFrom,
            billingFrequency: 'monthly',
            nextDueDate: todayString(),
            startDate: todayString(),
            coverAmount: parsed.data.coverAmount || product.coverFrom,
            arrearsAmount: 0,
          },
        });

        policyId = policy.id;
      }
    }

    const convertedLead = await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'converted' },
    });

    return { member, policyId, convertedLead };
  });

  await writeAuditLog(req, {
    action: 'LEAD_CONVERTED_TO_MEMBER',
    entityType: 'Lead',
    entityId: lead.id,
    entityLabel: `${lead.firstName} ${lead.lastName}`,
    parlourId: lead.parlourId,
    details: `memberId=${memberResult.member.id}`,
  });

  return res.json({
    lead: { ...memberResult.convertedLead, createdAt: memberResult.convertedLead.createdOn },
    member: memberResult.member,
    policyId: memberResult.policyId,
  });
});
