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

interface ParlourGrowthPoint {
  month: string;
  parlours: number;
}

interface FuneralCaseTrendPoint {
  month: string;
  total: number;
  open: number;
  closed: number;
}

interface AdoptionSnapshot {
  parlourId: string;
  parlourName: string;
  province: string;
  tier: string;
  status: string;
  onboardingStatus: string;
  onboardingProgress: number;
  goLiveAt: string | null;
  firstActiveAt: string | null;
  lastActiveAt: string | null;
  activeUsers7d: number;
  activeUsers30d: number;
  events7d: number;
  events30d: number;
  healthScore: number;
  healthStatus: 'green' | 'amber' | 'red';
  isDormant: boolean;
  isAtRisk: boolean;
}

interface MonthRange {
  month: string;
  startDate: string;
  endDate: string;
}

interface UsageSummaryRow {
  parlourId: string;
  parlourName: string;
  tier: string;
  status: string;
  activeUsers: number;
  events: number;
  topModule: string | null;
  lastActivityAt: string | null;
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

function buildParlourGrowthSeries(parlours: Array<{ joinedDate?: string | null; createdAt: Date }>): ParlourGrowthPoint[] {
  const parlourMonthMap = new Map<string, number>();

  for (const parlour of parlours) {
    const key = parlour.joinedDate ? monthKey(parlour.joinedDate) : monthKeyFromDate(parlour.createdAt);
    parlourMonthMap.set(key, (parlourMonthMap.get(key) || 0) + 1);
  }

  return Array.from(parlourMonthMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-6)
    .map(([month, count]) => ({ month, parlours: count }));
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

function normalizeDateText(dateText?: string | Date | null): string {
  if (!dateText) {
    return '';
  }

  if (dateText instanceof Date) {
    return dateText.toISOString().slice(0, 10);
  }

  return dateText.slice(0, 10);
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

function monthRange(month?: string): MonthRange {
  const normalized = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    month: normalized,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function dateDaysAgo(days: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  return now.toISOString().slice(0, 10);
}

function daysSince(dateText?: string | null): number | null {
  if (!dateText) {
    return null;
  }

  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function uniqueActiveUsers(events: Array<{ userId: string | null }>): number {
  return new Set(events.map((event) => event.userId).filter((userId): userId is string => Boolean(userId))).size;
}

function calculateHealthScore(params: {
  onboardingProgress: number;
  activeUsers30d: number;
  events7d: number;
  events30d: number;
  goLiveAt?: string | null;
}): number {
  const onboarding = Math.round(Math.min(params.onboardingProgress, 100) * 0.3);
  const users = Math.min(params.activeUsers30d * 8, 25);
  const events = Math.min(params.events30d * 2, 25);
  const recency = Math.min(params.events7d * 4, 10);
  const goLive = params.goLiveAt ? 10 : 0;
  return Math.max(0, Math.min(100, onboarding + users + events + recency + goLive));
}

function healthStatusFromScore(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) {
    return 'green';
  }

  if (score >= 45) {
    return 'amber';
  }

  return 'red';
}

function buildAdoptionSnapshot(params: {
  parlour: {
    id: string;
    name: string;
    province: string;
    tier: string;
    status: string;
    onboardingStatus: string;
    onboardingProgress: number;
    goLiveAt: string | null;
    firstActiveAt: string | null;
    lastActiveAt: string | null;
  };
  events7d: Array<{ userId: string | null }>;
  events30d: Array<{ userId: string | null }>;
}): AdoptionSnapshot {
  const activeUsers7d = uniqueActiveUsers(params.events7d);
  const activeUsers30d = uniqueActiveUsers(params.events30d);
  const events7d = params.events7d.length;
  const events30d = params.events30d.length;
  const healthScore = calculateHealthScore({
    onboardingProgress: params.parlour.onboardingProgress,
    activeUsers30d,
    events7d,
    events30d,
    goLiveAt: params.parlour.goLiveAt,
  });
  const healthStatus = healthStatusFromScore(healthScore);
  const inactivityDays = daysSince(params.parlour.lastActiveAt);
  const isDormant = Boolean(params.parlour.firstActiveAt) && events30d === 0;
  const isAtRisk = healthStatus !== 'green' || inactivityDays !== null && inactivityDays > 14;

  return {
    parlourId: params.parlour.id,
    parlourName: params.parlour.name,
    province: params.parlour.province,
    tier: params.parlour.tier,
    status: params.parlour.status,
    onboardingStatus: params.parlour.onboardingStatus,
    onboardingProgress: params.parlour.onboardingProgress,
    goLiveAt: params.parlour.goLiveAt,
    firstActiveAt: params.parlour.firstActiveAt,
    lastActiveAt: params.parlour.lastActiveAt,
    activeUsers7d,
    activeUsers30d,
    events7d,
    events30d,
    healthScore,
    healthStatus,
    isDormant,
    isAtRisk,
  };
}

async function buildAdoptionSnapshots(parlourId?: string) {
  const [parlours, usageEvents] = await Promise.all([
    prisma.parlour.findMany({
      where: parlourId ? { id: parlourId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        province: true,
        tier: true,
        status: true,
        onboardingStatus: true,
        onboardingProgress: true,
        goLiveAt: true,
        firstActiveAt: true,
        lastActiveAt: true,
      },
    }),
    prisma.parlourUsageEvent.findMany({
      where: parlourId ? { parlourId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        parlourId: true,
        userId: true,
        userName: true,
        userRole: true,
        module: true,
        eventType: true,
        entityType: true,
        entityId: true,
        details: true,
        occurredOn: true,
        createdAt: true,
      },
    }),
  ]);

  const window7d = dateDaysAgo(7);
  const window30d = dateDaysAgo(30);

  const groupedEvents = new Map<string, typeof usageEvents>();
  for (const event of usageEvents) {
    const current = groupedEvents.get(event.parlourId) || [];
    current.push(event);
    groupedEvents.set(event.parlourId, current);
  }

  const snapshots = parlours.map((parlour) => {
    const parlourEvents = groupedEvents.get(parlour.id) || [];
    const events7d = parlourEvents.filter((event) => event.occurredOn >= window7d);
    const events30d = parlourEvents.filter((event) => event.occurredOn >= window30d);
    return buildAdoptionSnapshot({ parlour, events7d, events30d });
  });

  return { snapshots, usageEvents };
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

  const filteredMemberIdSet = new Set(filteredPolicies.map((policy) => policy.memberId));
  const dateFilteredMembers = (params.startDate || params.endDate)
    ? members.filter((member) => inDateRange(normalizeDateText(member.joinDate || member.createdAt), params.startDate, params.endDate))
    : members;
  const filteredMembers = params.productName || params.startDate || params.endDate
    ? dateFilteredMembers.filter((member) => !filteredMemberIdSet.size || filteredMemberIdSet.has(member.id))
    : members;

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
  const totalMembers = filteredMembers.length;
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
      const branchMembers = filteredMembers.filter((member) => member.branchId === branch.id);
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

  const memberGrowth = buildMemberGrowthSeries(filteredMembers);
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
  const selectedMonth = typeof _req.query.month === 'string' ? _req.query.month : undefined;
  const selectedRange = monthRange(selectedMonth);

  const [parlours, members, policies, payments, funeralCases, usageEvents] = await Promise.all([
    prisma.parlour.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.member.findMany(),
    prisma.policy.findMany(),
    prisma.paymentTransaction.findMany(),
    prisma.funeralCase.findMany(),
    prisma.parlourUsageEvent.findMany({
      where: {
        occurredOn: {
          gte: selectedRange.startDate,
          lte: selectedRange.endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalParlours = parlours.length;
  const activeParlours = parlours.filter((parlour) => parlour.status === 'active').length;
  const totalMembers = members.length;
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((policy) => policy.status === 'active').length;
  const totalArrears = policies.reduce((sum, policy) => sum + policy.arrearsAmount, 0);
  const openFuneralCases = funeralCases.filter((item) => isOpenFuneralCase(item.status)).length;

  const nowMonth = selectedRange.month;
  const duePoliciesThisMonth = policies.filter((policy) => policy.status === 'active');
  const premiumsDueThisMonth = duePoliciesThisMonth.reduce((sum, policy) => sum + policy.premiumAmount, 0);
  const paymentsThisMonth = payments.filter((payment) => monthKey(payment.date) === nowMonth && payment.status === 'successful');
  const premiumsCollectedThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + payment.amount, 0);
  const collectionRate = premiumsDueThisMonth > 0 ? Math.round((premiumsCollectedThisMonth / premiumsDueThisMonth) * 100) : 0;

  const usageSummary = parlours
    .map<UsageSummaryRow>((parlour) => {
      const parlourEvents = usageEvents.filter((event) => event.parlourId === parlour.id);
      const moduleCounts = new Map<string, number>();
      for (const event of parlourEvents) {
        moduleCounts.set(event.module, (moduleCounts.get(event.module) || 0) + 1);
      }

      const topModule = Array.from(moduleCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
      const activeUsers = new Set(parlourEvents.map((event) => event.userId).filter((value): value is string => Boolean(value))).size;

      return {
        parlourId: parlour.id,
        parlourName: parlour.name,
        tier: parlour.tier,
        status: parlour.status,
        activeUsers,
        events: parlourEvents.length,
        topModule,
        lastActivityAt: parlourEvents[0]?.occurredOn ?? null,
      };
    })
    .sort((left, right) => right.events - left.events || right.activeUsers - left.activeUsers);

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

  const parlourGrowth = buildParlourGrowthSeries(parlours);
  const funeralCaseTrend = buildFuneralCaseTrendSeries(funeralCases);

  return res.json({
    selectedMonth: selectedRange.month,
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
    parlourGrowth,
    funeralCaseTrend,
    parlours,
    usageSummary,
  });
});

reportsRouter.get('/adoption/overview', async (req, res) => {
  if (req.actor?.role !== 'safpa_admin') {
    return res.status(403).json({ message: 'Only SAFPA admins can view network adoption analytics' });
  }

  const { snapshots } = await buildAdoptionSnapshots();

  return res.json({
    totalParlours: snapshots.length,
    liveParlours: snapshots.filter((snapshot) => snapshot.onboardingStatus === 'live').length,
    activeParlours7d: snapshots.filter((snapshot) => snapshot.events7d > 0).length,
    activeParlours30d: snapshots.filter((snapshot) => snapshot.events30d > 0).length,
    dormantParlours: snapshots.filter((snapshot) => snapshot.isDormant).length,
    atRiskParlours: snapshots.filter((snapshot) => snapshot.isAtRisk).length,
    parlours: snapshots,
  });
});

reportsRouter.get('/adoption/parlours/:id', async (req, res) => {
  const parlourId = req.params.id;
  if (req.actor?.role !== 'safpa_admin' && req.actor?.parlourId !== parlourId) {
    return res.status(403).json({ message: 'Parlour scope violation' });
  }

  const { snapshots, usageEvents } = await buildAdoptionSnapshots(parlourId);
  const snapshot = snapshots[0];

  if (!snapshot) {
    return res.status(404).json({ message: 'Parlour not found' });
  }

  const recentEvents = usageEvents
    .slice(0, 12)
    .map((event) => ({
      id: event.id,
      occurredOn: event.occurredOn,
      module: event.module,
      eventType: event.eventType,
      userName: event.userName,
      userRole: event.userRole,
      details: event.details,
      entityType: event.entityType,
      entityId: event.entityId,
    }));

  const moduleCounts = new Map<string, number>();
  for (const event of usageEvents) {
    moduleCounts.set(event.module, (moduleCounts.get(event.module) || 0) + 1);
  }

  return res.json({
    ...snapshot,
    daysSinceLastActivity: daysSince(snapshot.lastActiveAt),
    moduleActivity: Array.from(moduleCounts.entries())
      .map(([module, count]) => ({ module, count }))
      .sort((left, right) => right.count - left.count),
    recentEvents,
  });
});
