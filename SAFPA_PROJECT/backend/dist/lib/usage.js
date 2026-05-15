"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeUsageEvent = writeUsageEvent;
const id_1 = require("./id");
const prisma_1 = require("./prisma");
const activationEvents = new Set([
    'member_created',
    'member_bulk_imported',
    'policy_created',
    'payment_captured',
    'funeral_case_created',
    'document_uploaded',
]);
function dateOnly(value) {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
    }
    return new Date().toISOString().slice(0, 10);
}
function actorFromRequest(req, override) {
    if (override?.userId || override?.userName || override?.userRole) {
        return {
            userId: override.userId || 'system',
            userName: override.userName || override.userId || 'System',
            userRole: override.userRole || 'system',
        };
    }
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
async function writeUsageEvent(req, input) {
    const parlourId = input.parlourId || req.actor?.parlourId;
    if (!parlourId) {
        return;
    }
    const actor = actorFromRequest(req, input.actor);
    const occurredOn = dateOnly(input.occurredOn);
    await prisma_1.prisma.parlourUsageEvent.create({
        data: {
            id: (0, id_1.generateId)('usage'),
            parlourId,
            branchId: input.branchId || req.actor?.branchId,
            userId: actor.userId,
            userName: actor.userName,
            userRole: actor.userRole,
            module: input.module,
            eventType: input.eventType,
            entityType: input.entityType,
            entityId: input.entityId,
            details: input.details,
            metadata: input.metadata,
            occurredOn,
        },
    });
    const parlour = await prisma_1.prisma.parlour.findUnique({
        where: { id: parlourId },
        select: {
            id: true,
            status: true,
            onboardingStatus: true,
            firstActiveAt: true,
            goLiveAt: true,
        },
    });
    if (!parlour) {
        return;
    }
    const data = {
        lastActiveAt: occurredOn,
    };
    if (activationEvents.has(input.eventType) && !parlour.firstActiveAt) {
        data.firstActiveAt = occurredOn;
    }
    if (activationEvents.has(input.eventType) && parlour.onboardingStatus === 'setup') {
        data.onboardingStatus = 'initial_use';
    }
    if (activationEvents.has(input.eventType) && parlour.status === 'active') {
        if (!parlour.goLiveAt) {
            data.goLiveAt = occurredOn;
        }
        data.onboardingStatus = 'live';
    }
    await prisma_1.prisma.parlour.update({
        where: { id: parlourId },
        data,
    });
}
//# sourceMappingURL=usage.js.map