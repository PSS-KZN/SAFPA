"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRouter = void 0;
const express_1 = require("express");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const createDocumentSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2),
    type: zod_1.z.string().min(2),
    entityType: zod_1.z.enum(['member', 'policy', 'funeral_case']),
    entityId: zod_1.z.string().min(1),
    uploadedBy: zod_1.z.string().min(2),
    uploadedAt: zod_1.z.string().min(8).optional(),
    size: zod_1.z.string().min(2),
});
exports.documentsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
function uploadsDir() {
    const dir = node_path_1.default.resolve(process.cwd(), 'uploads');
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
exports.documentsRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const records = await prisma_1.prisma.documentRecord.findMany({
        where: {
            parlourId: parlourId || undefined,
            entityType: entityType || undefined,
            entityId: entityId || undefined,
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(records);
});
exports.documentsRouter.post('/', async (req, res) => {
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid document payload', errors: parsed.error.flatten() });
    }
    const record = await prisma_1.prisma.documentRecord.create({
        data: {
            id: (0, id_1.generateId)('doc'),
            parlourId: parsed.data.parlourId,
            name: parsed.data.name,
            type: parsed.data.type,
            entityType: parsed.data.entityType,
            entityId: parsed.data.entityId,
            uploadedBy: parsed.data.uploadedBy,
            uploadedAt: parsed.data.uploadedAt || new Date().toISOString().slice(0, 10),
            size: parsed.data.size,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'DOCUMENT_UPLOADED',
        entityType: 'Document',
        entityId: record.id,
        entityLabel: record.name,
        parlourId: record.parlourId,
    });
    return res.status(201).json(record);
});
exports.documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
    const schema = zod_1.z.object({
        parlourId: zod_1.z.string().min(1),
        name: zod_1.z.string().min(2).optional(),
        type: zod_1.z.string().min(2),
        entityType: zod_1.z.enum(['member', 'policy', 'funeral_case']),
        entityId: zod_1.z.string().min(1),
        uploadedBy: zod_1.z.string().min(2),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid upload payload', errors: parsed.error.flatten() });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
    }
    const extension = node_path_1.default.extname(req.file.originalname);
    const diskName = `${(0, id_1.generateId)('file')}${extension}`;
    const fullPath = node_path_1.default.join(uploadsDir(), diskName);
    node_fs_1.default.writeFileSync(fullPath, req.file.buffer);
    const sizeKb = Math.max(1, Math.round(req.file.size / 1024));
    const record = await prisma_1.prisma.documentRecord.create({
        data: {
            id: (0, id_1.generateId)('doc'),
            parlourId: parsed.data.parlourId,
            name: parsed.data.name || req.file.originalname,
            type: parsed.data.type,
            entityType: parsed.data.entityType,
            entityId: parsed.data.entityId,
            uploadedBy: parsed.data.uploadedBy,
            uploadedAt: new Date().toISOString().slice(0, 10),
            size: `${sizeKb} KB`,
            storagePath: fullPath,
            mimeType: req.file.mimetype,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'DOCUMENT_UPLOADED',
        entityType: 'Document',
        entityId: record.id,
        entityLabel: record.name,
        parlourId: record.parlourId,
        details: `storagePath=${diskName}`,
    });
    return res.status(201).json(record);
});
exports.documentsRouter.get('/:id/download', async (req, res) => {
    const record = await prisma_1.prisma.documentRecord.findUnique({ where: { id: req.params.id } });
    if (!record) {
        return res.status(404).json({ message: 'Document not found' });
    }
    if (!record.storagePath || !node_fs_1.default.existsSync(record.storagePath)) {
        return res.status(404).json({ message: 'File not found on disk' });
    }
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${record.name}"`);
    return res.sendFile(record.storagePath);
});
exports.documentsRouter.delete('/:id', async (req, res) => {
    try {
        const record = await prisma_1.prisma.documentRecord.delete({ where: { id: req.params.id } });
        if (record.storagePath && node_fs_1.default.existsSync(record.storagePath)) {
            node_fs_1.default.unlinkSync(record.storagePath);
        }
        await (0, audit_1.writeAuditLog)(req, {
            action: 'DOCUMENT_DELETED',
            entityType: 'Document',
            entityId: record.id,
            entityLabel: record.name,
            parlourId: record.parlourId,
        });
        return res.status(204).send();
    }
    catch {
        return res.status(404).json({ message: 'Document not found' });
    }
});
//# sourceMappingURL=documents.js.map