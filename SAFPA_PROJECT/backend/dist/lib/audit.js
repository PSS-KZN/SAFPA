"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const prisma_1 = require("./prisma");
const id_1 = require("./id");
function timestampString(now) {
    return now.toISOString().replace('T', ' ').slice(0, 19);
}
function actorFromRequest(req) {
    if (req.actor) {
        return {
            userId: req.actor.userId,
            userName: req.actor.userName,
            userRole: req.actor.role,
        };
    }
    return {
        userId: req.headers['x-user-id'] || 'system',
        userName: req.headers['x-user-name'] || 'System',
        userRole: req.headers['x-user-role'] || 'system',
    };
}
async function writeAuditLog(req, input) {
    const now = new Date();
    const actor = actorFromRequest(req);
    await prisma_1.prisma.auditEntry.create({
        data: {
            id: (0, id_1.generateId)('a'),
            timestamp: timestampString(now),
            userId: actor.userId,
            userName: actor.userName,
            userRole: actor.userRole,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            entityLabel: input.entityLabel,
            parlourId: input.parlourId,
            details: input.details,
        },
    });
}
//# sourceMappingURL=audit.js.map