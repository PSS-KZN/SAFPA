import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { assertReportExportAllowed } from '../lib/subscription';

interface MonthlyAggregation {
  month: string;
  collected: number;
  due: number;
}

interface MemberGrowthPoint {
  month: string;
  members: number;
}

interface FuneralCaseTrendPoint {
  month: string;
  total: number;
  open: number;
  closed: number;
}

function monthKey(dateText: string): string {
  if (dateText.length >= 7) {
    return dateText.slice(0, 7);
  }
  return 'unknown';
}

function monthKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function isOpenFuneralCase(status: string): boolean {
  return status !== 'completed' && status !== 'archived';
}

function buildMemberGrowthSeries(members: Array<{ joinDate: string; createdAt: Date }>): MemberGrowthPoint[] {
  const memberMonthMap = new Map<string, number>();

  for (const member of members) {
    const key = member.joinDate ? monthKey(member.joinDate) : monthKeyFromDate(member.createdAt);
    memberMonthMap.set(key, (memberMonthMap.get(key) || 0) + 1);
  }

  return Array.from(memberMonthMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-6)
    .map(([month, count]) => ({ month, members: count }));
}

function buildFuneralCaseTrendSeries(funeralCases: Array<{ dateOfDeath: string; createdAt: Date; status: string }>): FuneralCaseTrendPoint[] {
  const monthlyMap = new Map<string, FuneralCaseTrendPoint>();

  for (const funeralCase of funeralCases) {
    const key = funeralCase.dateOfDeath ? monthKey(funeralCase.dateOfDeath) : monthKeyFromDate(funeralCase.createdAt);
    const current = monthlyMap.get(key) || { month: key, total: 0, open: 0, closed: 0 };
    current.total += 1;
    if (isOpenFuneralCase(funeralCase.status)) {
      current.open += 1;
    } else {
      current.closed += 1;
    }
    monthlyMap.set(key, current);
  }

  return Array.from(monthlyMap.values())
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-6);
}

function inDateRange(dateText: string, startDate?: string, endDate?: string): boolean {
  if (!dateText) {
    return false;
  }

  if (startDate && dateText < startDate) {
    return false;
  }

  if (endDate && dateText > endDate) {
    return false;
  }

  return true;
}

function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function buildParlourDashboard(params: {
  parlourId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  productName?: string;
}) {
  const memberWhere = params.parlourId ? { parlourId: params.parlourId, ...(params.branchId ? { branchId: params.branchId } : {}) } : undefined;

  const [members, policies, payments, funeralCases, branches] = await Promise.all([
    prisma.member.findMany({ where: memberWhere }),
    prisma.policy.findMany({ where: params.parlourId ? { parlourId: params.parlourId } : undefined }),
    prisma.paymentTransaction.findMany({ where: params.parlourId ? { parlourId: params.parlourId } : undefined }),
    prisma.funeralCase.findMany({ where: params.parlourId ? { parlourId: params.parlourId } : undefined }),
    prisma.branch.findMany({ where: params.parlourId ? { parlourId: params.parlourId } : undefined }),
  ]);

  const memberIdSet = new Set(members.map((member) => member.id));
  const branchFilteredPolicies = params.branchId
    ? policies.filter((policy) => memberIdSet.has(policy.memberId))
    : policies;

  const productFilteredPolicies = params.productName
    ? branchFilteredPolicies.filter((policy) => policy.productName === params.productName)
    : branchFilteredPolicies;

  const filteredPolicies = (params.startDate || params.endDate)
    ? productFilteredPolicies.filter((policy) => inDateRange(policy.startDate, params.startDate, params.endDate))
    : productFilteredPolicies;

  const policyIdSet = new Set(filteredPolicies.map((policy) => policy.id));
  const filteredPayments = payments.filter((payment) => {
    if (params.branchId && !policyIdSet.has(payment.policyId)) {
      return false;
    }
    if (params.productName && !policyIdSet.has(payment.policyId)) {
      return false;
    }
    if (params.startDate || params.endDate) {
      return inDateRange(payment.date, params.startDate, params.endDate);
    }
    return true;
  });

  const filteredFuneralCases = funeralCases.filter((funeralCase) => {
    if (params.branchId && funeralCase.branchId !== params.branchId) {
      return false;
    }
    if (params.startDate || params.endDate) {
      return inDateRange(funeralCase.dateOfDeath, params.startDate, params.endDate);
    }
    return true;
  });

  const hasExplicitDateFilter = Boolean(params.startDate || params.endDate);
  const defaultRange = currentMonthRange();
  const collectionWindowStart = hasExplicitDateFilter ? params.startDate : defaultRange.startDate;
  const collectionWindowEnd = hasExplicitDateFilter ? params.endDate : defaultRange.endDate;
  const collectionWindowPayments = filteredPayments.filter((payment) =>
    inDateRange(payment.date, collectionWindowStart, collectionWindowEnd)
  );

  const activePolicies = filteredPolicies.filter((policy) => policy.status === 'active').length;
  const totalPolicies = filteredPolicies.length;
  const totalMembers = members.length;
  const openFuneralCases = filteredFuneralCases.filter((funeralCase) => isOpenFuneralCase(funeralCase.status)).length;

  const premiumsDue = filteredPolicies.reduce((sum, policy) => sum + policy.premiumAmount, 0);
  const premiumsCollected = collectionWindowPayments
    .filter((payment) => payment.status === 'successful')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const arrears = filteredPolicies.reduce((sum, policy) => sum + policy.arrearsAmount, 0);

  const monthlyMap = new Map<string, MonthlyAggregation>();
  for (const payment of filteredPayments) {
    const key = monthKey(payment.date);
    const current = monthlyMap.get(key) || { month: key, collected: 0, due: 0 };
    current.due += payment.amount;
    if (payment.status === 'successful') {
      current.collected += payment.amount;
    }
    monthlyMap.set(key, current);
  }

  const monthlyCollections = Array.from(monthlyMap.values())
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-6);

  const branchPerformance = branches
    .filter((branch) => !params.branchId || branch.id === params.branchId)
    .map((branch) => {
      const branchMembers = members.filter((member) => member.branchId === branch.id);
      const branchMemberSet = new Set(branchMembers.map((member) => member.id));
      const branchPolicies = filteredPolicies.filter((policy) => branchMemberSet.has(policy.memberId));
      const branchPolicySet = new Set(branchPolicies.map((policy) => policy.id));
      const branchPayments = collectionWindowPayments.filter((payment) => branchPolicySet.has(payment.policyId));

      const branchDue = branchPolicies.reduce((sum, policy) => sum + policy.premiumAmount, 0);
      const branchCollected = branchPayments
        .filter((payment) => payment.status === 'successful')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const rawRate = branchDue > 0 ? Math.round((branchCollected / branchDue) * 100) : 0;

      return {
        branchId: branch.id,
        branch: branch.name,
        members: branchMembers.length,
        collections: Math.max(0, Math.min(rawRate, 100)),
      };
    });

  const productCounts: Record<string, number> = {};
  for (const policy of filteredPolicies) {
    productCounts[policy.productName] = (productCounts[policy.productName] || 0) + 1;
  }

  const policyDistribution = Object.entries(productCounts).map(([name, value]) => ({ name, value }));

  const lifecycleMap = new Map<string, number>();
  for (const policy of filteredPolicies) {
    lifecycleMap.set(policy.status, (lifecycleMap.get(policy.status) || 0) + 1);
  }
  const policyLifecycle = Array.from(lifecycleMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count);

  const memberGrowth = buildMemberGrowthSeries(members);
  const funeralCaseTrend = buildFuneralCaseTrendSeries(filteredFuneralCases);

  return {
    totalMembers,
    totalPolicies,
    activePolicies,
    premiumsDue,
    premiumsCollected,
    arrears,
    openFuneralCases,
    monthlyCollections,
    branchPerformance,
    policyDistribution,
    policyLifecycle,
    memberGrowth,
    funeralCaseTrend,
  };
}

export const reportsRouter = Router();

reportsRouter.get('/dashboard', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const productName = typeof req.query.productName === 'string' ? req.query.productName : undefined;

  const data = await buildParlourDashboard({ parlourId, branchId, startDate, endDate, productName });
  return res.json(data);
});

reportsRouter.get('/dashboard/export', async (req, res) => {
  const parlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const productName = typeof req.query.productName === 'string' ? req.query.productName : undefined;

  if (!parlourId) {
    return res.status(400).json({ message: 'parlourId is required for export' });
  }

  try {
    await assertReportExportAllowed(parlourId);
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Tier restriction' });
  }

  const data = await buildParlourDashboard({ parlourId, branchId, startDate, endDate, productName });
  const lines = ['month,collected,due', ...data.monthlyCollections.map((row) => `${row.month},${row.collected},${row.due}`)];
  const csv = lines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="reports_${parlourId}.csv"`);
  return res.send(csv);
});

reportsRouter.get('/network', async (_req, res) => {
  const [parlours, members, policies, payments, funeralCases] = await Promise.all([
    prisma.parlour.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.member.findMany(),
    prisma.policy.findMany(),
    prisma.paymentTransaction.findMany(),
    prisma.funeralCase.findMany(),
  ]);

  const totalParlours = parlours.length;
  const activeParlours = parlours.filter((parlour) => parlour.status === 'active').length;
  const totalMembers = members.length;
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((policy) => policy.status === 'active').length;
  const totalArrears = policies.reduce((sum, policy) => sum + policy.arrearsAmount, 0);
  const openFuneralCases = funeralCases.filter((item) => isOpenFuneralCase(item.status)).length;

  const nowMonth = new Date().toISOString().slice(0, 7);
  const duePoliciesThisMonth = policies.filter((policy) => policy.status === 'active');
  const premiumsDueThisMonth = duePoliciesThisMonth.reduce((sum, policy) => sum + policy.premiumAmount, 0);
  const paymentsThisMonth = payments.filter((payment) => monthKey(payment.date) === nowMonth && payment.status === 'successful');
  const premiumsCollectedThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + payment.amount, 0);
  const collectionRate = premiumsDueThisMonth > 0 ? Math.round((premiumsCollectedThisMonth / premiumsDueThisMonth) * 100) : 0;

  const monthlyMap = new Map<string, MonthlyAggregation>();
  for (const payment of payments) {
    const key = monthKey(payment.date);
    const current = monthlyMap.get(key) || { month: key, collected: 0, due: 0 };
    current.due += payment.amount;
    if (payment.status === 'successful') {
      current.collected += payment.amount;
    }
    monthlyMap.set(key, current);
  }
  const monthlyCollections = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const statusMap = new Map<string, number>();
  for (const policy of policies) {
    statusMap.set(policy.status, (statusMap.get(policy.status) || 0) + 1);
  }
  const policyStatusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  const memberGrowth = buildMemberGrowthSeries(members);
  const funeralCaseTrend = buildFuneralCaseTrendSeries(funeralCases);

  return res.json({
    totalParlours,
    activeParlours,
    totalMembers,
    totalPolicies,
    activePolicies,
    premiumsDueThisMonth,
    premiumsCollectedThisMonth,
    totalArrears,
    openFuneralCases,
    collectionRate,
    monthlyCollections,
    policyStatusBreakdown,
    memberGrowth,
    funeralCaseTrend,
    parlours,
  });
});
