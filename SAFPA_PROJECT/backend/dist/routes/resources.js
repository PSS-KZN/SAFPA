"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourcesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const resourceType = zod_1.z.enum(['notice', 'training', 'partner', 'policy', 'template']);
const createResourceSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    type: resourceType,
    description: zod_1.z.string().min(10),
    publishedBy: zod_1.z.string().min(2),
    fileSize: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    publishedAt: zod_1.z.string().optional(),
});
exports.resourcesRouter = (0, express_1.Router)();
exports.resourcesRouter.get('/', async (req, res) => {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : undefined;
    const records = await prisma_1.prisma.resourceAsset.findMany({
        where: type ? { type } : undefined,
        orderBy: { publishedAt: 'desc' },
    });
    const filtered = search
        ? records.filter((item) => {
            const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
            return item.title.toLowerCase().includes(search)
                || item.description.toLowerCase().includes(search)
                || tags.some((tag) => tag.includes(search));
        })
        : records;
    return res.json(filtered);
});
exports.resourcesRouter.post('/', async (req, res) => {
    const parsed = createResourceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid resource payload', errors: parsed.error.flatten() });
    }
    const resource = await prisma_1.prisma.resourceAsset.create({
        data: {
            id: (0, id_1.generateId)('res'),
            title: parsed.data.title,
            type: parsed.data.type,
            description: parsed.data.description,
            publishedBy: parsed.data.publishedBy,
            publishedAt: parsed.data.publishedAt || new Date().toISOString().slice(0, 10),
            fileSize: parsed.data.fileSize,
            url: parsed.data.url,
            tags: parsed.data.tags,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'RESOURCE_PUBLISHED',
        entityType: 'Resource',
        entityId: resource.id,
        entityLabel: resource.title,
    });
    return res.status(201).json(resource);
});
//# sourceMappingURL=resources.js.map