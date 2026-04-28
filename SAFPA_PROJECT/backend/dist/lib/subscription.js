"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCreateLimit = assertCreateLimit;
exports.assertBulkImportLimit = assertBulkImportLimit;
exports.assertReportExportAllowed = assertReportExportAllowed;
const prisma_1 = require("./prisma");
const TIER_LIMITS = {
    basic: {
        branches: 2,
        users: 5,
        products: 3,
        bulkImportRows: 200,
        reportExport: false,
    },
    standard: {
        branches: 5,
        users: 20,
        products: 10,
        bulkImportRows: 1000,
        reportExport: true,
    },
    premium: {
        branches: 100,
        users: 100,
        products: 100,
        bulkImportRows: 10000,
        reportExport: true,
    },
};
async function getTier(parlourId) {
    const parlour = await prisma_1.prisma.parlour.findUnique({ where: { id: parlourId }, select: { tier: true } });
    return parlour?.tier || 'basic';
}
async function assertCreateLimit(parlourId, feature) {
    const tier = await getTier(parlourId);
    const limit = TIER_LIMITS[tier][feature];
    const count = feature === 'branches'
        ? await prisma_1.prisma.branch.count({ where: { parlourId } })
        : feature === 'users'
            ? await prisma_1.prisma.appUser.count({ where: { parlourId } })
            : await prisma_1.prisma.product.count({ where: { parlourId } });
    if (count >= limit) {
        throw new Error(`Tier limit exceeded for ${feature}. Upgrade from ${tier} to continue.`);
    }
}
async function assertBulkImportLimit(parlourId, rows) {
    const tier = await getTier(parlourId);
    const limit = TIER_LIMITS[tier].bulkImportRows;
    if (rows > limit) {
        throw new Error(`Bulk import row limit exceeded for ${tier}. Max rows: ${limit}.`);
    }
}
async function assertReportExportAllowed(parlourId) {
    const tier = await getTier(parlourId);
    if (!TIER_LIMITS[tier].reportExport) {
        throw new Error(`Report export is not available on ${tier} tier.`);
    }
}
//# sourceMappingURL=subscription.js.map