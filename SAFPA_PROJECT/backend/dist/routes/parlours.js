"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parloursRouter = void 0;
const express_1 = require("express");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const usage_1 = require("../lib/usage");
const hexColorSchema = zod_1.z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a valid hex colour');
const websitePublishStatusSchema = zod_1.z.enum(['draft', 'ready', 'published', 'needs_review']);
const customDomainStatusSchema = zod_1.z.enum(['not_requested', 'requested', 'configured']);
const urlOrAssetPathSchema = zod_1.z.string().trim().refine((value) => {
    if (!value) {
        return false;
    }
    if (value.startsWith('/')) {
        return true;
    }
    return zod_1.z.url().safeParse(value).success;
}, 'Expected an absolute URL or an asset path starting with /');
const subdomainSchema = zod_1.z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/, 'Expected a valid subdomain label');
const domainSchema = zod_1.z.string().trim().toLowerCase().refine((value) => {
    if (!value) {
        return true;
    }
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}, 'Expected a valid domain name');
const brandingUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const logoMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
function brandingUploadsDir() {
    const dir = node_path_1.default.resolve(process.cwd(), 'uploads', 'branding');
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
function removeStoredLogoIfManaged(logoPath) {
    if (!logoPath || !logoPath.startsWith('/uploads/branding/')) {
        return;
    }
    const relativePath = logoPath.replace(/^\/uploads\//, '');
    const fullPath = node_path_1.default.resolve(process.cwd(), 'uploads', relativePath);
    if (node_fs_1.default.existsSync(fullPath)) {
        node_fs_1.default.unlinkSync(fullPath);
    }
}
function isBrandingReady(data) {
    return Boolean(data.primaryColor &&
        data.secondaryColor &&
        data.accentColor &&
        data.tagline?.trim() &&
        data.businessDescription?.trim() &&
        data.supportEmail?.trim() &&
        data.supportPhone?.trim() &&
        data.physicalAddress?.trim() &&
        data.websiteTemplate?.trim() &&
        data.websiteSubdomain?.trim());
}
async function ensureSubdomainAvailable(websiteSubdomain, parlourId) {
    if (!websiteSubdomain) {
        return;
    }
    const duplicate = await prisma_1.prisma.parlour.findFirst({
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
function resolvePublishState(input) {
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
function assertActorCanAccessParlour(req, res, parlourId) {
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
const createParlourSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    region: zod_1.z.string().min(2),
    province: zod_1.z.string().min(2),
    tier: zod_1.z.enum(['basic', 'standard', 'premium']),
    status: zod_1.z.enum(['onboarding', 'active', 'suspended']).default('onboarding'),
    onboardingProgress: zod_1.z.number().int().min(0).max(100).default(0),
    totalMembers: zod_1.z.number().int().min(0).default(0),
    totalPolicies: zod_1.z.number().int().min(0).default(0),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(7),
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema.default('#0f172a'),
    accentColor: hexColorSchema.default('#dc2626'),
    businessDescription: zod_1.z.string().trim().max(1000).optional(),
    tagline: zod_1.z.string().trim().max(120).optional(),
    supportEmail: zod_1.z.string().email().optional(),
    supportPhone: zod_1.z.string().trim().min(7).max(30).optional(),
    physicalAddress: zod_1.z.string().trim().max(240).optional(),
    websiteTemplate: zod_1.z.enum(['heritage', 'modern', 'community']).default('heritage'),
    websiteSubdomain: subdomainSchema.optional(),
    customDomain: domainSchema.optional(),
    customDomainStatus: customDomainStatusSchema.default('not_requested'),
    customDomainDnsTarget: zod_1.z.string().trim().max(180).optional(),
    customDomainNotes: zod_1.z.string().trim().max(400).optional(),
    websitePublished: zod_1.z.boolean().default(false),
    websitePublishStatus: websitePublishStatusSchema.default('draft'),
    brandingCompletedAt: zod_1.z.string().min(8).optional(),
    joinedDate: zod_1.z.string().min(8),
    logo: urlOrAssetPathSchema.optional(),
});
const brandingSchema = zod_1.z.object({
    logo: urlOrAssetPathSchema.optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    businessDescription: zod_1.z.string().trim().max(1000).optional(),
    tagline: zod_1.z.string().trim().max(120).optional(),
    supportEmail: zod_1.z.string().email().optional(),
    supportPhone: zod_1.z.string().trim().min(7).max(30).optional(),
    physicalAddress: zod_1.z.string().trim().max(240).optional(),
    websiteTemplate: zod_1.z.enum(['heritage', 'modern', 'community']).optional(),
    websiteSubdomain: subdomainSchema.optional(),
    customDomain: domainSchema.optional(),
    customDomainStatus: customDomainStatusSchema.optional(),
    customDomainDnsTarget: zod_1.z.string().trim().max(180).optional(),
    customDomainNotes: zod_1.z.string().trim().max(400).optional(),
    websitePublished: zod_1.z.boolean().optional(),
    websitePublishStatus: websitePublishStatusSchema.optional(),
    brandingCompletedAt: zod_1.z.string().min(8).optional(),
});
exports.parloursRouter = (0, express_1.Router)();
function deriveOnboardingStatus(progress, currentStatus, firstActiveAt, goLiveAt) {
    if (currentStatus === 'suspended') {
        return 'dormant';
    }
    if (goLiveAt || currentStatus === 'active') {
        return 'live';
    }
    if (firstActiveAt) {
        return 'initial_use';
    }
    if (progress >= 80) {
        return 'ready_to_launch';
    }
    if (progress >= 40) {
        return 'configuration';
    }
    return 'setup';
}
exports.parloursRouter.get('/availability/subdomain', async (req, res) => {
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
    const existing = await prisma_1.prisma.parlour.findFirst({
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
exports.parloursRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const actorParlourId = req.actor?.parlourId;
    const parlours = await prisma_1.prisma.parlour.findMany({
        where: actorParlourId ? { id: actorParlourId } : parlourId ? { id: parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    res.json(parlours);
});
exports.parloursRouter.get('/:id', async (req, res) => {
    const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!assertActorCanAccessParlour(req, res, parlourId)) {
        return;
    }
    const parlour = await prisma_1.prisma.parlour.findUnique({
        where: { id: parlourId },
    });
    if (!parlour) {
        return res.status(404).json({ message: 'Parlour not found' });
    }
    return res.json(parlour);
});
exports.parloursRouter.post('/', async (req, res) => {
    const parsed = createParlourSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid parlour payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        await ensureSubdomainAvailable(parsed.data.websiteSubdomain);
    }
    catch (error) {
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
    const parlour = await prisma_1.prisma.parlour.create({
        data: {
            id,
            ...parsed.data,
            onboardingStatus: deriveOnboardingStatus(parsed.data.onboardingProgress, parsed.data.status),
            onboardingStartedAt: parsed.data.joinedDate,
            onboardingCompletedAt: parsed.data.onboardingProgress >= 100 ? parsed.data.joinedDate : undefined,
            goLiveAt: parsed.data.status === 'active' ? parsed.data.joinedDate : undefined,
            customDomainStatus,
            websitePublishStatus,
            websitePublished: websitePublishStatus === 'published',
            brandingCompletedAt: brandingReady ? parsed.data.brandingCompletedAt ?? new Date().toISOString().slice(0, 10) : parsed.data.brandingCompletedAt,
        },
    });
    await prisma_1.prisma.communicationTemplate.create({
        data: {
            id: (0, id_1.generateId)('tpl'),
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
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PARLOUR_CREATED',
        entityType: 'Parlour',
        entityId: parlour.id,
        entityLabel: parlour.name,
    });
    return res.status(201).json(parlour);
});
exports.parloursRouter.patch('/:id', async (req, res) => {
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
        const existingParlour = await prisma_1.prisma.parlour.findUnique({ where: { id: parlourId } });
        if (!existingParlour) {
            return res.status(404).json({ message: 'Parlour not found' });
        }
        const nextProgress = parsed.data.onboardingProgress ?? existingParlour.onboardingProgress;
        const nextStatus = parsed.data.status ?? existingParlour.status;
        const nextGoLiveAt = nextStatus === 'active'
            ? existingParlour.goLiveAt ?? new Date().toISOString().slice(0, 10)
            : existingParlour.goLiveAt;
        const parlour = await prisma_1.prisma.parlour.update({
            where: { id: parlourId },
            data: {
                ...parsed.data,
                onboardingStatus: deriveOnboardingStatus(nextProgress, nextStatus, existingParlour.firstActiveAt, nextGoLiveAt),
                onboardingCompletedAt: nextProgress === 100
                    ? existingParlour.onboardingCompletedAt ?? new Date().toISOString().slice(0, 10)
                    : existingParlour.onboardingCompletedAt,
                goLiveAt: nextGoLiveAt,
            },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PARLOUR_UPDATED',
            entityType: 'Parlour',
            entityId: parlour.id,
            entityLabel: parlour.name,
        });
        return res.json(parlour);
    }
    catch {
        return res.status(500).json({ message: 'Failed to update parlour' });
    }
});
exports.parloursRouter.patch('/:id/branding', async (req, res) => {
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
        const existingParlour = await prisma_1.prisma.parlour.findUnique({ where: { id: parlourId } });
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
        const parlour = await prisma_1.prisma.parlour.update({
            where: { id: req.params.id },
            data: {
                ...parsed.data,
                onboardingStatus: deriveOnboardingStatus(existingParlour.onboardingProgress, existingParlour.status, existingParlour.firstActiveAt, websitePublishStatus === 'published' ? existingParlour.goLiveAt ?? new Date().toISOString().slice(0, 10) : existingParlour.goLiveAt),
                customDomainStatus,
                websitePublishStatus,
                websitePublished: websitePublishStatus === 'published',
                brandingCompletedAt: brandingReady ? parsed.data.brandingCompletedAt ?? existingParlour.brandingCompletedAt ?? new Date().toISOString().slice(0, 10) : parsed.data.brandingCompletedAt ?? existingParlour.brandingCompletedAt,
                goLiveAt: websitePublishStatus === 'published' ? existingParlour.goLiveAt ?? new Date().toISOString().slice(0, 10) : existingParlour.goLiveAt,
            },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PARLOUR_BRANDING_UPDATED',
            entityType: 'Parlour',
            entityId: parlour.id,
            entityLabel: parlour.name,
            details: `brandingFields=${Object.keys(parsed.data).join(',')};publishStatus=${websitePublishStatus};subdomain=${parlour.websiteSubdomain ?? 'none'}`,
        });
        await (0, usage_1.writeUsageEvent)(req, {
            module: 'parlours',
            eventType: websitePublishStatus === 'published' ? 'website_published' : 'branding_updated',
            parlourId: parlour.id,
            entityType: 'Parlour',
            entityId: parlour.id,
            details: `publishStatus=${websitePublishStatus}`,
            metadata: {
                websitePublishStatus,
                brandingReady,
            },
        });
        return res.json(parlour);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Subdomain')) {
            return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Failed to update branding settings' });
    }
});
exports.parloursRouter.post('/:id/logo', brandingUpload.single('file'), async (req, res) => {
    const parlourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!assertActorCanAccessParlour(req, res, parlourId)) {
        return;
    }
    const schema = zod_1.z.object({
        parlourId: zod_1.z.string().min(1).optional(),
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
    let metadata;
    try {
        metadata = await (0, sharp_1.default)(req.file.buffer).metadata();
    }
    catch {
        return res.status(400).json({ message: 'The uploaded file is not a valid image' });
    }
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < 64 || height < 64 || width > 2048 || height > 2048) {
        return res.status(400).json({ message: 'Logo dimensions must be between 64x64 and 2048x2048 pixels' });
    }
    const parlour = await prisma_1.prisma.parlour.findUnique({ where: { id: parlourId } });
    if (!parlour) {
        return res.status(404).json({ message: 'Parlour not found' });
    }
    const extension = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const diskName = `${parlourId}-${Date.now()}${extension}`;
    const fullPath = node_path_1.default.join(brandingUploadsDir(), diskName);
    node_fs_1.default.writeFileSync(fullPath, req.file.buffer);
    removeStoredLogoIfManaged(parlour.logo);
    const logoPath = `/uploads/branding/${diskName}`;
    const updated = await prisma_1.prisma.parlour.update({
        where: { id: parlourId },
        data: {
            logo: logoPath,
            onboardingStatus: deriveOnboardingStatus(parlour.onboardingProgress, parlour.status, parlour.firstActiveAt, parlour.goLiveAt),
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'PARLOUR_LOGO_UPLOADED',
        entityType: 'Parlour',
        entityId: updated.id,
        entityLabel: updated.name,
        details: `logoPath=${logoPath};mimeType=${req.file.mimetype};dimensions=${width}x${height}`,
    });
    await (0, usage_1.writeUsageEvent)(req, {
        module: 'parlours',
        eventType: 'branding_updated',
        parlourId: updated.id,
        entityType: 'Parlour',
        entityId: updated.id,
        details: 'logo_uploaded',
    });
    return res.json(updated);
});
exports.parloursRouter.patch('/:id/status', async (req, res) => {
    const schema = zod_1.z.object({ status: zod_1.z.enum(['onboarding', 'active', 'suspended']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: 'Invalid status payload',
            errors: parsed.error.flatten(),
        });
    }
    try {
        const existingParlour = await prisma_1.prisma.parlour.findUnique({ where: { id: req.params.id } });
        if (!existingParlour) {
            return res.status(404).json({ message: 'Parlour not found' });
        }
        const nextGoLiveAt = parsed.data.status === 'active'
            ? existingParlour.goLiveAt ?? new Date().toISOString().slice(0, 10)
            : existingParlour.goLiveAt;
        const parlour = await prisma_1.prisma.parlour.update({
            where: { id: req.params.id },
            data: {
                status: parsed.data.status,
                onboardingStatus: deriveOnboardingStatus(existingParlour.onboardingProgress, parsed.data.status, existingParlour.firstActiveAt, nextGoLiveAt),
                onboardingCompletedAt: parsed.data.status === 'active'
                    ? existingParlour.onboardingCompletedAt ?? new Date().toISOString().slice(0, 10)
                    : existingParlour.onboardingCompletedAt,
                goLiveAt: nextGoLiveAt,
            },
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'PARLOUR_STATUS_CHANGED',
            entityType: 'Parlour',
            entityId: parlour.id,
            entityLabel: parlour.name,
            details: `status=${parlour.status}`,
        });
        await (0, usage_1.writeUsageEvent)(req, {
            module: 'parlours',
            eventType: 'parlour_status_changed',
            parlourId: parlour.id,
            entityType: 'Parlour',
            entityId: parlour.id,
            details: `status=${parlour.status}`,
        });
        return res.json(parlour);
    }
    catch {
        return res.status(500).json({ message: 'Failed to update parlour status' });
    }
});
//# sourceMappingURL=parlours.js.map