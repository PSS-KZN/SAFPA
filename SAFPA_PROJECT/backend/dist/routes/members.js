"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.membersRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const zod_1 = require("zod");
const audit_1 = require("../lib/audit");
const id_1 = require("../lib/id");
const prisma_1 = require("../lib/prisma");
const subscription_1 = require("../lib/subscription");
const dependantSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    idNumber: zod_1.z.string().min(4),
    relationship: zod_1.z.string().min(1),
    dateOfBirth: zod_1.z.string().min(4),
});
const beneficiarySchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    idNumber: zod_1.z.string().min(4),
    relationship: zod_1.z.string().min(1),
    percentage: zod_1.z.number().min(0).max(100),
});
const createMemberSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    branchId: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    idNumber: zod_1.z.string().min(6),
    phone: zod_1.z.string().min(7),
    email: zod_1.z.string().default(''),
    address: zod_1.z.string().default(''),
    city: zod_1.z.string().default(''),
    province: zod_1.z.string().default(''),
    joinDate: zod_1.z.string().min(8),
    status: zod_1.z.enum(['active', 'inactive', 'suspended']).default('active'),
    dependants: zod_1.z.array(dependantSchema).default([]),
    beneficiaries: zod_1.z.array(beneficiarySchema).default([]),
});
const updateMemberSchema = createMemberSchema.omit({ parlourId: true }).partial();
const bulkImportRowSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    idNumber: zod_1.z.string().min(6),
    phone: zod_1.z.string().min(7),
    email: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    province: zod_1.z.string().optional(),
    branchId: zod_1.z.string().optional(),
});
const bulkImportSchema = zod_1.z.object({
    parlourId: zod_1.z.string().min(1),
    defaultBranchId: zod_1.z.string().min(1),
    rows: zod_1.z.array(bulkImportRowSchema),
});
exports.membersRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const importErrorFiles = new Map();
function normalizeHeader(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function mapSheetRows(rows) {
    return rows.map((row) => {
        const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()]));
        return {
            firstName: normalized.firstname || normalized.name || '',
            lastName: normalized.lastname || normalized.surname || '',
            idNumber: normalized.idnumber || normalized.id || '',
            phone: normalized.phone || normalized.phonenumber || normalized.mobile || '',
            email: normalized.email || '',
            address: normalized.address || '',
            city: normalized.city || '',
            province: normalized.province || '',
            branchId: normalized.branchid || '',
        };
    });
}
function parseImportRows(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
        return [];
    }
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    return mapSheetRows(rawRows);
}
exports.membersRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const members = await prisma_1.prisma.member.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return res.json(members);
});
exports.membersRouter.post('/', async (req, res) => {
    const parsed = createMemberSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid member payload', errors: parsed.error.flatten() });
    }
    const exists = await prisma_1.prisma.member.findFirst({
        where: {
            parlourId: parsed.data.parlourId,
            idNumber: parsed.data.idNumber,
        },
        select: { id: true },
    });
    if (exists) {
        return res.status(409).json({ message: 'Member with this ID number already exists' });
    }
    const member = await prisma_1.prisma.member.create({
        data: {
            id: (0, id_1.generateId)('m'),
            ...parsed.data,
        },
    });
    await (0, audit_1.writeAuditLog)(req, {
        action: 'MEMBER_CREATED',
        entityType: 'Member',
        entityId: member.id,
        entityLabel: `${member.firstName} ${member.lastName}`,
        parlourId: member.parlourId,
    });
    return res.status(201).json(member);
});
exports.membersRouter.patch('/:id', async (req, res) => {
    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid member payload', errors: parsed.error.flatten() });
    }
    try {
        const member = await prisma_1.prisma.member.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        await (0, audit_1.writeAuditLog)(req, {
            action: 'MEMBER_UPDATED',
            entityType: 'Member',
            entityId: member.id,
            entityLabel: `${member.firstName} ${member.lastName}`,
            parlourId: member.parlourId,
        });
        return res.json(member);
    }
    catch {
        return res.status(404).json({ message: 'Member not found' });
    }
});
exports.membersRouter.post('/bulk-import', async (req, res) => {
    const parsed = bulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid import payload', errors: parsed.error.flatten() });
    }
    try {
        await (0, subscription_1.assertBulkImportLimit)(parsed.data.parlourId, parsed.data.rows.length);
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const errors = [];
    let createdCount = 0;
    for (let index = 0; index < parsed.data.rows.length; index += 1) {
        const row = parsed.data.rows[index];
        const duplicate = await prisma_1.prisma.member.findFirst({
            where: {
                parlourId: parsed.data.parlourId,
                idNumber: row.idNumber,
            },
            select: { id: true },
        });
        if (duplicate) {
            errors.push({ index, reason: 'Duplicate ID number' });
            continue;
        }
        await prisma_1.prisma.member.create({
            data: {
                id: (0, id_1.generateId)('m'),
                parlourId: parsed.data.parlourId,
                branchId: row.branchId || parsed.data.defaultBranchId,
                firstName: row.firstName,
                lastName: row.lastName,
                idNumber: row.idNumber,
                phone: row.phone,
                email: row.email || '',
                address: row.address || '',
                city: row.city || '',
                province: row.province || '',
                joinDate: new Date().toISOString().slice(0, 10),
                status: 'active',
                dependants: [],
                beneficiaries: [],
            },
        });
        createdCount += 1;
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'MEMBER_BULK_IMPORTED',
        entityType: 'Member',
        entityId: (0, id_1.generateId)('import'),
        entityLabel: `rows=${parsed.data.rows.length}`,
        parlourId: parsed.data.parlourId,
        details: `created=${createdCount};errors=${errors.length}`,
    });
    return res.json({
        totalRows: parsed.data.rows.length,
        createdCount,
        errorCount: errors.length,
        errors,
    });
});
exports.membersRouter.post('/bulk-import-file', upload.single('file'), async (req, res) => {
    const schema = zod_1.z.object({
        parlourId: zod_1.z.string().min(1),
        defaultBranchId: zod_1.z.string().min(1),
    });
    const parsedFields = schema.safeParse(req.body);
    if (!parsedFields.success) {
        return res.status(400).json({ message: 'Invalid import payload', errors: parsedFields.error.flatten() });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'Import file is required' });
    }
    const rows = parseImportRows(req.file.buffer);
    try {
        await (0, subscription_1.assertBulkImportLimit)(parsedFields.data.parlourId, rows.length);
    }
    catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier limit exceeded' });
    }
    const errors = [];
    let createdCount = 0;
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowValidation = bulkImportRowSchema.safeParse(row);
        if (!rowValidation.success) {
            errors.push({ index, reason: 'Validation failed' });
            continue;
        }
        const duplicate = await prisma_1.prisma.member.findFirst({
            where: {
                parlourId: parsedFields.data.parlourId,
                idNumber: rowValidation.data.idNumber,
            },
            select: { id: true },
        });
        if (duplicate) {
            errors.push({ index, reason: 'Duplicate ID number' });
            continue;
        }
        await prisma_1.prisma.member.create({
            data: {
                id: (0, id_1.generateId)('m'),
                parlourId: parsedFields.data.parlourId,
                branchId: rowValidation.data.branchId || parsedFields.data.defaultBranchId,
                firstName: rowValidation.data.firstName,
                lastName: rowValidation.data.lastName,
                idNumber: rowValidation.data.idNumber,
                phone: rowValidation.data.phone,
                email: rowValidation.data.email || '',
                address: rowValidation.data.address || '',
                city: rowValidation.data.city || '',
                province: rowValidation.data.province || '',
                joinDate: new Date().toISOString().slice(0, 10),
                status: 'active',
                dependants: [],
                beneficiaries: [],
            },
        });
        createdCount += 1;
    }
    let errorFileToken = null;
    if (errors.length > 0) {
        errorFileToken = (0, id_1.generateId)('import-errors');
        const csv = ['row,reason', ...errors.map((item) => `${item.index + 2},"${item.reason}"`)].join('\n');
        importErrorFiles.set(errorFileToken, csv);
    }
    await (0, audit_1.writeAuditLog)(req, {
        action: 'MEMBER_BULK_IMPORTED_FILE',
        entityType: 'Member',
        entityId: (0, id_1.generateId)('import'),
        entityLabel: req.file.originalname,
        parlourId: parsedFields.data.parlourId,
        details: `created=${createdCount};errors=${errors.length}`,
    });
    return res.json({
        totalRows: rows.length,
        createdCount,
        errorCount: errors.length,
        errors,
        errorFileToken,
    });
});
exports.membersRouter.get('/bulk-import-errors/:token', (req, res) => {
    const csv = importErrorFiles.get(req.params.token);
    if (!csv) {
        return res.status(404).json({ message: 'Error file not found' });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import_errors_${req.params.token}.csv"`);
    return res.send(csv);
});
exports.membersRouter.get('/:id', async (req, res) => {
    const member = await prisma_1.prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }
    return res.json(member);
});
//# sourceMappingURL=members.js.map