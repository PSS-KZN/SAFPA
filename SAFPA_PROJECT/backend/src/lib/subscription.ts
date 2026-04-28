import { prisma } from './prisma';

type Tier = 'basic' | 'standard' | 'premium';

interface TierLimit {
  branches: number;
  users: number;
  products: number;
  bulkImportRows: number;
  reportExport: boolean;
}

const TIER_LIMITS: Record<Tier, TierLimit> = {
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

async function getTier(parlourId: string): Promise<Tier> {
  const parlour = await prisma.parlour.findUnique({ where: { id: parlourId }, select: { tier: true } });
  return (parlour?.tier as Tier) || 'basic';
}

export async function assertCreateLimit(parlourId: string, feature: 'branches' | 'users' | 'products'): Promise<void> {
  const tier = await getTier(parlourId);
  const limit = TIER_LIMITS[tier][feature];

  const count = feature === 'branches'
    ? await prisma.branch.count({ where: { parlourId } })
    : feature === 'users'
      ? await prisma.appUser.count({ where: { parlourId } })
      : await prisma.product.count({ where: { parlourId } });

  if (count >= limit) {
    throw new Error(`Tier limit exceeded for ${feature}. Upgrade from ${tier} to continue.`);
  }
}

export async function assertBulkImportLimit(parlourId: string, rows: number): Promise<void> {
  const tier = await getTier(parlourId);
  const limit = TIER_LIMITS[tier].bulkImportRows;
  if (rows > limit) {
    throw new Error(`Bulk import row limit exceeded for ${tier}. Max rows: ${limit}.`);
  }
}

export async function assertReportExportAllowed(parlourId: string): Promise<void> {
  const tier = await getTier(parlourId);
  if (!TIER_LIMITS[tier].reportExport) {
    throw new Error(`Report export is not available on ${tier} tier.`);
  }
}
