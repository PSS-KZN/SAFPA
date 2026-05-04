import { Request, Response, Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit';
import { generateId } from '../lib/id';
import { prisma } from '../lib/prisma';

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a valid hex colour');
const websitePublishStatusSchema = z.enum(['draft', 'ready', 'published', 'needs_review']);
const customDomainStatusSchema = z.enum(['not_requested', 'requested', 'configured']);
const urlOrAssetPathSchema = z.string().trim().refine((value) => {
  if (!value) {
    return false;
  }

  if (value.startsWith('/')) {
    return true;
  }

  return z.url().safeParse(value).success;
}, 'Expected an absolute URL or an asset path starting with /');
const subdomainSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/, 'Expected a valid subdomain label');
const domainSchema = z.string().trim().toLowerCase().refine((value) => {
  if (!value) {
    return true;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}, 'Expected a valid domain name');
const brandingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const logoMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function brandingUploadsDir(): string {
  const dir = path.resolve(process.cwd(), 'uploads', 'branding');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function removeStoredLogoIfManaged(logoPath: string | null | undefined) {
  if (!logoPath || !logoPath.startsWith('/uploads/branding/')) {
    return;
  }

  const relativePath = logoPath.replace(/^\/uploads\//, '');
  const fullPath = path.resolve(process.cwd(), 'uploads', relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function isBrandingReady(data: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  tagline?: string | null;
  businessDescription?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  physicalAddress?: string | null;
  websiteTemplate?: string | null;
  websiteSubdomain?: string | null;
}) {
  return Boolean(
    data.primaryColor &&
      data.secondaryColor &&
      data.accentColor &&
      data.tagline?.trim() &&
      data.businessDescription?.trim() &&
      data.supportEmail?.trim() &&
      data.supportPhone?.trim() &&
      data.physicalAddress?.trim() &&
      data.websiteTemplate?.trim() &&
      data.websiteSubdomain?.trim()
  );
}

async function ensureSubdomainAvailable(websiteSubdomain: string | undefined, parlourId?: string) {
  if (!websiteSubdomain) {
    return;
  }

  const duplicate = await prisma.parlour.findFirst({
    where: {
      websiteSubdomain,
      ...(parlourId ? { NOT: { id: parlourId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (duplicate) {
    throw new Error(`Subdomain ${websiteSubdomain} is already used by ${duplicate.name}`);
  }
}

function resolvePublishState(input: {
  requestedPublishStatus?: z.infer<typeof websitePublishStatusSchema>;
  requestedPublished?: boolean;
  brandingReady: boolean;
}): z.infer<typeof websitePublishStatusSchema> {
  if (input.requestedPublishStatus === 'published' || input.requestedPublished === true) {
    return 'published';
  }

  if (input.requestedPublishStatus === 'needs_review') {
    return 'needs_review';
  }

  if (input.requestedPublishStatus === 'draft') {
    return 'draft';
  }

  return input.brandingReady ? 'ready' : 'draft';
}

function assertActorCanAccessParlour(req: Request, res: Response, parlourId: string): boolean {
  const actor = req.actor;
  if (!actor || actor.role === 'safpa_admin') {
    return true;
  }

  if (actor.parlourId && actor.parlourId !== parlourId) {
    res.status(403).json({ message: 'Parlour scope violation' });
    return false;
  }

  return true;
}

const createParlourSchema = z.object({
  name: z.string().min(2),
  region: z.string().min(2),
  province: z.string().min(2),
  tier: z.enum(['basic', 'standard', 'premium']),
  status: z.enum(['onboarding', 'active', 'suspended']).default('onboarding'),
  onboardingProgress: z.number().int().min(0).max(100).default(0),
  totalMembers: z.number().int().min(0).default(0),
  totalPolicies: z.number().int().min(0).default(0),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema.default('#0f172a'),
  accentColor: hexColorSchema.default('#dc2626'),
  businessDescription: z.string().trim().max(1000).optional(),
  tagline: z.string().trim().max(120).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().trim().min(7).max(30).optional(),
  physicalAddress: z.string().trim().max(240).optional(),
  websiteTemplate: z.enum(['heritage', 'modern', 'community']).default('heritage'),
  websiteSubdomain: subdomainSchema.optional(),
  customDomain: domainSchema.optional(),
  customDomainStatus: customDomainStatusSchema.default('not_requested'),
  customDomainDnsTarget: z.string().trim().max(180).optional(),
  customDomainNotes: z.string().trim().max(400).optional(),
  websitePublished: z.boolean().default(false),
  websitePublishStatus: websitePublishStatusSchema.default('draft'),
  brandingCompletedAt: z.string().min(8).optional(),
  joinedDate: z.string().min(8),
  logo: urlOrAssetPathSchema.optional(),
});

const brandingSchema = z.object({
  logo: urlOrAssetPathSchema.optional(),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  businessDescription: z.string().trim().max(1000).optional(),
  tagline: z.string().trim().max(120).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().trim().min(7).max(30).optional(),
  physicalAddress: z.string().trim().max(240).optional(),
  websiteTemplate: z.enum(['heritage', 'modern', 'community']).optional(),
  websiteSubdomain: subdomainSchema.optional(),
  customDomain: domainSchema.optional(),
  customDomainStatus: customDomainStatusSchema.optional(),
  customDomainDnsTarget: z.string().trim().max(180).optional(),
  customDomainNotes: z.string().trim().max(400).optional(),
  websitePublished: z.boolean().optional(),
  websitePublishStatus: websitePublishStatusSchema.optional(),
  brandingCompletedAt: z.string().min(8).optional(),
});

export const parloursRouter = Router();

parloursRouter.get('/availability/subdomain', async (req, res) => {
  const websiteSubdomain = typeof req.query.value === 'string' ? req.query.value.trim().toLowerCase() : '';
  const excludeParlourId = typeof req.query.excludeParlourId === 'string' ? req.query.excludeParlourId : undefined;

  if (!websiteSubdomain) {
    return res.status(400).json({ message: 'Subdomain value is required' });
  }

  const parsed = subdomainSchema.safeParse(websiteSubdomain);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid subdomain value',
      errors: parsed.error.flatten(),
    });
  }

  const existing = await prisma.parlour.findFirst({
    where: {
      websiteSubdomain: parsed.data,
      ...(excludeParlourId ? { NOT: { id: excludeParlourId } } : {}),
    },
    select: { id: true, name: true },
  });

  return res.json({
    available: !existing,
    websiteSubdomain: parsed.data,
    takenBy: existing?.name ?? null,
  });
});

parloursRouter.get('/', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;

  const parlours = await prisma.parlour.findMany({
    where: parlourId ? { id: parlourId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json(parlours);
});

parloursRouter.get('/:id', async (req, res) => {
  const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!assertActorCanAccessParlour(req, res, parlourId)) {
    return;
  }

  const parlour = await prisma.parlour.findUnique({
    where: { id: parlourId },
  });

  if (!parlour) {
    return res.status(404).json({ message: 'Parlour not found' });
  }

  return res.json(parlour);
});

parloursRouter.post('/', async (req, res) => {
  const parsed = createParlourSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    await ensureSubdomainAvailable(parsed.data.websiteSubdomain);
  } catch (error) {
    return res.status(409).json({ message: error instanceof Error ? error.message : 'Subdomain is unavailable' });
  }

  const brandingReady = isBrandingReady(parsed.data);
  const websitePublishStatus = resolvePublishState({
    requestedPublishStatus: parsed.data.websitePublishStatus,
    requestedPublished: parsed.data.websitePublished,
    brandingReady,
  });

  if (websitePublishStatus === 'published' && !brandingReady) {
    return res.status(400).json({ message: 'Branding must be complete before the website can be published' });
  }

  const customDomainStatus = parsed.data.customDomain
    ? parsed.data.customDomainStatus === 'not_requested'
      ? 'requested'
      : parsed.data.customDomainStatus
    : 'not_requested';

  const id = `p${Date.now()}`;
  const parlour = await prisma.parlour.create({
    data: {
      id,
      ...parsed.data,
      customDomainStatus,
      websitePublishStatus,
      websitePublished: websitePublishStatus === 'published',
      brandingCompletedAt: brandingReady ? parsed.data.brandingCompletedAt ?? new Date().toISOString().slice(0, 10) : parsed.data.brandingCompletedAt,
    },
  });

  await prisma.communicationTemplate.create({
    data: {
      id: generateId('tpl'),
      parlourId: parlour.id,
      name: 'Default Payment Reminder',
      type: 'sms',
      trigger: 'payment_reminder',
      body: 'Dear {member_name}, your premium is due on {due_date}.',
      isActive: true,
      createdOn: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  });

  await writeAuditLog(req, {
    action: 'PARLOUR_CREATED',
    entityType: 'Parlour',
    entityId: parlour.id,
    entityLabel: parlour.name,
  });

  return res.status(201).json(parlour);
});

parloursRouter.patch('/:id', async (req, res) => {
  const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!assertActorCanAccessParlour(req, res, parlourId)) {
    return;
  }

  const parsed = createParlourSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid parlour payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const parlour = await prisma.parlour.update({
      where: { id: parlourId },
      data: parsed.data,
    });

    await writeAuditLog(req, {
      action: 'PARLOUR_UPDATED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
    });

    return res.json(parlour);
  } catch {
    return res.status(404).json({ message: 'Parlour not found' });
  }
});

parloursRouter.patch('/:id/branding', async (req, res) => {
  const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!assertActorCanAccessParlour(req, res, parlourId)) {
    return;
  }

  const parsed = brandingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid branding payload',
      errors: parsed.error.flatten(),
    });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: 'At least one branding field is required' });
  }

  try {
    const existingParlour = await prisma.parlour.findUnique({ where: { id: parlourId } });
    if (!existingParlour) {
      return res.status(404).json({ message: 'Parlour not found' });
    }

    const nextBranding = {
      ...existingParlour,
      ...parsed.data,
      websiteSubdomain: parsed.data.websiteSubdomain ?? existingParlour.websiteSubdomain,
      customDomain: parsed.data.customDomain ?? existingParlour.customDomain,
      customDomainStatus: parsed.data.customDomainStatus ?? existingParlour.customDomainStatus,
      customDomainDnsTarget: parsed.data.customDomainDnsTarget ?? existingParlour.customDomainDnsTarget,
      customDomainNotes: parsed.data.customDomainNotes ?? existingParlour.customDomainNotes,
      websitePublishStatus: parsed.data.websitePublishStatus ?? existingParlour.websitePublishStatus,
      websitePublished: parsed.data.websitePublished ?? existingParlour.websitePublished,
    };

    await ensureSubdomainAvailable(nextBranding.websiteSubdomain ?? undefined, existingParlour.id);

    const brandingReady = isBrandingReady(nextBranding);
    const websitePublishStatus = resolvePublishState({
      requestedPublishStatus: parsed.data.websitePublishStatus,
      requestedPublished: parsed.data.websitePublished,
      brandingReady,
    });

    if (websitePublishStatus === 'published' && !brandingReady) {
      return res.status(400).json({ message: 'Complete the branding workspace before publishing the website' });
    }

    const customDomainStatus = nextBranding.customDomain
      ? parsed.data.customDomainStatus ?? (existingParlour.customDomainStatus === 'not_requested' ? 'requested' : existingParlour.customDomainStatus)
      : 'not_requested';

    const parlour = await prisma.parlour.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        customDomainStatus,
        websitePublishStatus,
        websitePublished: websitePublishStatus === 'published',
        brandingCompletedAt: brandingReady ? parsed.data.brandingCompletedAt ?? existingParlour.brandingCompletedAt ?? new Date().toISOString().slice(0, 10) : parsed.data.brandingCompletedAt ?? existingParlour.brandingCompletedAt,
      },
    });

    await writeAuditLog(req, {
      action: 'PARLOUR_BRANDING_UPDATED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
      details: `brandingFields=${Object.keys(parsed.data).join(',')};publishStatus=${websitePublishStatus};subdomain=${parlour.websiteSubdomain ?? 'none'}`,
    });

    return res.json(parlour);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Subdomain')) {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update branding settings' });
  }
});

parloursRouter.post('/:id/logo', brandingUpload.single('file'), async (req, res) => {
  const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!assertActorCanAccessParlour(req, res, parlourId)) {
    return;
  }

  const schema = z.object({
    parlourId: z.string().min(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid logo payload', errors: parsed.error.flatten() });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Logo file is required' });
  }

  if (!logoMimeTypes.has(req.file.mimetype)) {
    return res.status(400).json({ message: 'Supported logo formats are PNG, JPEG, and WebP only' });
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(req.file.buffer).metadata();
  } catch {
    return res.status(400).json({ message: 'The uploaded file is not a valid image' });
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 64 || height < 64 || width > 2048 || height > 2048) {
    return res.status(400).json({ message: 'Logo dimensions must be between 64x64 and 2048x2048 pixels' });
  }

  const parlour = await prisma.parlour.findUnique({ where: { id: parlourId } });
  if (!parlour) {
    return res.status(404).json({ message: 'Parlour not found' });
  }

  const extension = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
  const diskName = `${parlourId}-${Date.now()}${extension}`;
  const fullPath = path.join(brandingUploadsDir(), diskName);
  fs.writeFileSync(fullPath, req.file.buffer);

  removeStoredLogoIfManaged(parlour.logo);

  const logoPath = `/uploads/branding/${diskName}`;
  const updated = await prisma.parlour.update({
    where: { id: parlourId },
    data: { logo: logoPath },
  });

  await writeAuditLog(req, {
    action: 'PARLOUR_LOGO_UPLOADED',
    entityType: 'Parlour',
    entityId: updated.id,
    entityLabel: updated.name,
    details: `logoPath=${logoPath};mimeType=${req.file.mimetype};dimensions=${width}x${height}`,
  });

  return res.json(updated);
});

parloursRouter.patch('/:id/status', async (req, res) => {
  const schema = z.object({ status: z.enum(['onboarding', 'active', 'suspended']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid status payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const parlour = await prisma.parlour.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog(req, {
      action: 'PARLOUR_STATUS_CHANGED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
      details: `status=${parlour.status}`,
    });

    return res.json(parlour);
  } catch {
    return res.status(404).json({ message: 'Parlour not found' });
  }
});
