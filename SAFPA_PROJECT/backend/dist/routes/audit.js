"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.get('/', async (req, res) => {
    const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
    const entries = await prisma_1.prisma.auditEntry.findMany({
        where: parlourId ? { parlourId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200,
    });
    return res.json(entries);
});
//# sourceMappingURL=audit.js.map