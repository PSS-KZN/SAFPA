import { parlourDashboardStats, safpaDashboardStats } from '../data/dashboardStats';
import type {
  AuditEntry,
  Branch,
  Communication,
  Document,
  Lead,
  Parlour,
  ParlourSubscription,
  SubscriptionPlan,
  User,
  UserRole,
} from '../types';
import { IS_DEMO_MODE } from './config';
import { generateDemoId, getDemoState, nowIsoString, resetDemoState, type DemoAdoptionRecord, type DemoState, updateDemoState } from './store';

export class DemoApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status = 400, errors?: unknown) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function parseUrl(path: string): URL {
  return new URL(path, 'http://demo.local');
}

function getMethod(init?: RequestInit): string {
  return (init?.method || 'GET').toUpperCase();
}

async function readBody(init?: RequestInit): Promise<unknown> {
  if (!init?.body) {
    return null;
  }

  if (typeof init.body === 'string') {
    return JSON.parse(init.body) as unknown;
  }

  if (init.body instanceof FormData) {
    return init.body;
  }

  return null;
}

function getHeaders(init?: RequestInit): Headers {
  return new Headers(init?.headers || {});
}

function getActor(init?: RequestInit) {
  const headers = getHeaders(init);
  return {
    id: headers.get('x-user-id') || 'system',
    name: headers.get('x-user-name') || 'Demo User',
    role: (headers.get('x-user-role') || 'safpa_admin') as UserRole,
    parlourId: headers.get('x-parlour-id') || undefined,
  };
}

function requireEntity<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new DemoApiError(message, 404);
  }

  return value;
}

function getAdoptionRecord(state: DemoState, parlour: Parlour): DemoAdoptionRecord {
  return state.adoptionByParlourId[parlour.id] || {
    onboardingStatus: parlour.status === 'active' ? 'live' : 'onboarding',
    goLiveAt: parlour.status === 'active' ? `${parlour.joinedDate}T09:00:00.000Z` : null,
    firstActiveAt: null,
    lastActiveAt: null,
    activeUsers7d: 0,
    activeUsers30d: 0,
    events7d: 0,
    events30d: 0,
    healthScore: parlour.status === 'active' ? 80 : 55,
    healthStatus: parlour.status === 'active' ? 'green' : 'amber',
    isDormant: false,
    isAtRisk: parlour.status === 'suspended',
    moduleActivity: [],
  };
}

function appendAuditEntry(state: DemoState, entry: Omit<AuditEntry, 'id' | 'timestamp'>): DemoState {
  const nextEntry: AuditEntry = {
    id: generateDemoId('a'),
    timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
    ...entry,
  };

  return {
    ...state,
    auditEntries: [nextEntry, ...state.auditEntries],
  };
}

function parlourAudit(state: DemoState, parlours: Parlour[], updated: Parlour, actor: ReturnType<typeof getActor>): DemoState {
  return appendAuditEntry({ ...state, parlours }, {
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'PARLOUR_UPDATED',
    entityType: 'Parlour',
    entityId: updated.id,
    entityLabel: updated.name,
    details: 'Parlour profile updated in frontend-only demo mode',
  });
}

function getParlourName(state: DemoState, parlourId: string): string {
  return state.parlours.find((parlour) => parlour.id === parlourId)?.name || 'Unknown Parlour';
}

function getPlanAmount(state: DemoState, tier: SubscriptionPlan['tier']): number {
  return state.subscriptionPlans.find((plan) => plan.tier === tier)?.amount || 0;
}

function buildReportsDashboard(state: DemoState, parlourId: string, branchId?: string | null) {
  const scopedMembers = state.members.filter((member) => member.parlourId === parlourId && (!branchId || member.branchId === branchId));
  const scopedPolicies = state.policies.filter((policy) => policy.parlourId === parlourId);
  const scopedPayments = state.payments.filter((payment) => payment.parlourId === parlourId);
  const scopedFuneralCases = state.funeralCases.filter((item) => item.parlourId === parlourId && (!branchId || item.branchId === branchId));
  const productCounts = new Map<string, number>();

  for (const policy of scopedPolicies) {
    productCounts.set(policy.productName, (productCounts.get(policy.productName) || 0) + 1);
  }

  return {
    totalMembers: scopedMembers.length || parlourDashboardStats.totalMembers,
    totalPolicies: scopedPolicies.length || parlourDashboardStats.totalPolicies,
    activePolicies: scopedPolicies.filter((policy) => ['active', 'reinstated'].includes(policy.status)).length || parlourDashboardStats.activePolicies,
    premiumsDue: scopedPolicies.reduce((sum, policy) => sum + policy.premiumAmount, 0) || parlourDashboardStats.premiumsDueThisMonth,
    premiumsCollected: scopedPayments.filter((payment) => payment.status === 'successful').reduce((sum, payment) => sum + payment.amount, 0) || parlourDashboardStats.premiumsCollectedThisMonth,
    arrears: scopedPolicies.reduce((sum, policy) => sum + policy.arrearsAmount, 0) || parlourDashboardStats.totalArrears,
    openFuneralCases: scopedFuneralCases.filter((item) => ['logged', 'in_progress', 'scheduled'].includes(item.status)).length || parlourDashboardStats.openFuneralCases,
    monthlyCollections: parlourDashboardStats.monthlyCollections,
    branchPerformance: state.branches
      .filter((branch) => branch.parlourId === parlourId)
      .map((branch) => ({
        branchId: branch.id,
        branch: branch.name,
        members: scopedMembers.filter((member) => member.branchId === branch.id).length,
        collections: scopedPayments
          .filter((payment) => state.members.find((member) => member.id === payment.memberId)?.branchId === branch.id && payment.status === 'successful')
          .reduce((sum, payment) => sum + payment.amount, 0),
      })),
    policyDistribution: Array.from(productCounts.entries()).map(([name, value]) => ({ name, value })),
    policyLifecycle: ['draft', 'pending', 'active', 'suspended', 'lapsed', 'reinstated', 'cancelled', 'closed']
      .map((status) => ({ status, count: scopedPolicies.filter((policy) => policy.status === status).length }))
      .filter((item) => item.count > 0),
    memberGrowth: parlourDashboardStats.memberGrowth,
    funeralCaseTrend: [
      { month: 'Nov 2025', total: 2, open: 1, closed: 1 },
      { month: 'Dec 2025', total: 3, open: 2, closed: 1 },
      { month: 'Jan 2026', total: 4, open: 2, closed: 2 },
      { month: 'Feb 2026', total: 5, open: 3, closed: 2 },
      { month: 'Mar 2026', total: 4, open: 2, closed: 2 },
      {
        month: 'Apr 2026',
        total: scopedFuneralCases.length || 3,
        open: scopedFuneralCases.filter((item) => item.status !== 'completed' && item.status !== 'archived').length || 1,
        closed: scopedFuneralCases.filter((item) => item.status === 'completed' || item.status === 'archived').length || 2,
      },
    ],
  };
}

function buildNetworkDashboard(state: DemoState) {
  const activePolicies = state.policies.filter((policy) => ['active', 'reinstated'].includes(policy.status)).length;
  const premiumsCollectedThisMonth = state.payments.filter((payment) => payment.status === 'successful').reduce((sum, payment) => sum + payment.amount, 0) || safpaDashboardStats.premiumsCollectedThisMonth;
  const premiumsDueThisMonth = state.policies.reduce((sum, policy) => sum + policy.premiumAmount, 0) || safpaDashboardStats.premiumsDueThisMonth;
  const totalArrears = state.policies.reduce((sum, policy) => sum + policy.arrearsAmount, 0) || safpaDashboardStats.totalArrears;
  const openFuneralCases = state.funeralCases.filter((item) => item.status !== 'completed' && item.status !== 'archived').length || safpaDashboardStats.openFuneralCases;
  const collectionRate = premiumsDueThisMonth > 0 ? Math.round((premiumsCollectedThisMonth / premiumsDueThisMonth) * 100) : 0;

  return {
    selectedMonth: '2026-04',
    totalParlours: state.parlours.length,
    activeParlours: state.parlours.filter((parlour) => parlour.status === 'active').length,
    totalMembers: state.parlours.reduce((sum, parlour) => sum + parlour.totalMembers, 0) || safpaDashboardStats.totalMembers,
    totalPolicies: state.parlours.reduce((sum, parlour) => sum + parlour.totalPolicies, 0) || safpaDashboardStats.totalPolicies,
    activePolicies,
    premiumsDueThisMonth,
    premiumsCollectedThisMonth,
    totalArrears,
    openFuneralCases,
    collectionRate,
    monthlyCollections: safpaDashboardStats.monthlyCollections,
    policyStatusBreakdown: safpaDashboardStats.policyStatusBreakdown,
    parlourGrowth: [
      { month: 'Nov 2025', parlours: 1 },
      { month: 'Dec 2025', parlours: 2 },
      { month: 'Jan 2026', parlours: 3 },
      { month: 'Feb 2026', parlours: 3 },
      { month: 'Mar 2026', parlours: 4 },
      { month: 'Apr 2026', parlours: state.parlours.length },
    ],
    funeralCaseTrend: [
      { month: 'Nov 2025', total: 3, open: 1, closed: 2 },
      { month: 'Dec 2025', total: 4, open: 2, closed: 2 },
      { month: 'Jan 2026', total: 5, open: 2, closed: 3 },
      { month: 'Feb 2026', total: 6, open: 3, closed: 3 },
      { month: 'Mar 2026', total: 6, open: 3, closed: 3 },
      { month: 'Apr 2026', total: state.funeralCases.length || 8, open: openFuneralCases, closed: Math.max((state.funeralCases.length || 8) - openFuneralCases, 0) },
    ],
    parlours: state.parlours.map((parlour) => ({
      id: parlour.id,
      name: parlour.name,
      province: parlour.province,
      tier: parlour.tier,
      status: parlour.status,
    })),
    usageSummary: state.parlours.map((parlour) => {
      const adoption = getAdoptionRecord(state, parlour);
      const sortedActivity = [...adoption.moduleActivity].sort((left, right) => right.count - left.count);
      return {
        parlourId: parlour.id,
        parlourName: parlour.name,
        tier: parlour.tier,
        status: parlour.status,
        activeUsers: state.users.filter((user) => user.parlourId === parlour.id && user.status === 'active').length,
        events: adoption.events30d,
        topModule: sortedActivity[0]?.module || null,
        lastActivityAt: adoption.lastActiveAt,
      };
    }),
  };
}

function buildAdoptionOverview(state: DemoState) {
  const parlours = state.parlours.map((parlour) => {
    const adoption = getAdoptionRecord(state, parlour);
    return {
      parlourId: parlour.id,
      parlourName: parlour.name,
      province: parlour.province,
      tier: parlour.tier,
      status: parlour.status,
      onboardingStatus: adoption.onboardingStatus,
      onboardingProgress: parlour.onboardingProgress,
      goLiveAt: adoption.goLiveAt,
      firstActiveAt: adoption.firstActiveAt,
      lastActiveAt: adoption.lastActiveAt,
      activeUsers7d: adoption.activeUsers7d,
      activeUsers30d: adoption.activeUsers30d,
      events7d: adoption.events7d,
      events30d: adoption.events30d,
      healthScore: adoption.healthScore,
      healthStatus: adoption.healthStatus,
      isDormant: adoption.isDormant,
      isAtRisk: adoption.isAtRisk,
    };
  });

  return {
    totalParlours: parlours.length,
    liveParlours: parlours.filter((parlour) => parlour.onboardingStatus === 'live' || parlour.status === 'active').length,
    activeParlours7d: parlours.filter((parlour) => parlour.activeUsers7d > 0 || parlour.events7d > 0).length,
    activeParlours30d: parlours.filter((parlour) => parlour.activeUsers30d > 0 || parlour.events30d > 0).length,
    dormantParlours: parlours.filter((parlour) => parlour.isDormant).length,
    atRiskParlours: parlours.filter((parlour) => parlour.isAtRisk).length,
    parlours,
  };
}

function listCollection(url: URL, state: DemoState) {
  switch (url.pathname) {
    case '/api/parlours': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.parlours.filter((parlour) => parlour.id === parlourId) : state.parlours;
    }
    case '/api/branches': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.branches.filter((branch) => branch.parlourId === parlourId) : state.branches;
    }
    case '/api/users': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.users.filter((user) => user.parlourId === parlourId) : state.users;
    }
    case '/api/products': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.products.filter((product) => product.parlourId === parlourId) : state.products;
    }
    case '/api/leads': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.leads.filter((lead) => lead.parlourId === parlourId) : state.leads;
    }
    case '/api/documents': {
      const parlourId = url.searchParams.get('parlourId');
      const entityType = url.searchParams.get('entityType');
      const entityId = url.searchParams.get('entityId');
      return state.documents.filter((document) => (!parlourId || document.parlourId === parlourId) && (!entityType || document.entityType === entityType) && (!entityId || document.entityId === entityId));
    }
    case '/api/funeral-cases': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.funeralCases.filter((item) => item.parlourId === parlourId) : state.funeralCases;
    }
    case '/api/communications': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.communications.filter((item) => item.parlourId === parlourId) : state.communications;
    }
    case '/api/templates':
      return state.communicationTemplates;
    case '/api/resources':
      return state.resources;
    case '/api/members': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.members.filter((item) => item.parlourId === parlourId) : state.members;
    }
    case '/api/policies': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.policies.filter((item) => item.parlourId === parlourId) : state.policies;
    }
    case '/api/payments': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.payments.filter((item) => item.parlourId === parlourId) : state.payments;
    }
    case '/api/subscriptions':
      return state.subscriptionPlans;
    case '/api/parlour-subscriptions': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.parlourSubscriptions.filter((item) => item.parlourId === parlourId) : state.parlourSubscriptions;
    }
    case '/api/audit': {
      const parlourId = url.searchParams.get('parlourId');
      const limit = Number(url.searchParams.get('limit') || '200');
      const items = parlourId ? state.auditEntries.filter((item) => item.parlourId === parlourId) : state.auditEntries;
      return items.slice(0, limit);
    }
    default:
      throw new DemoApiError(`Demo mode does not yet support ${url.pathname}`, 501);
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new DemoApiError('Unable to read uploaded file', 400));
    reader.readAsDataURL(file);
  });
}

export async function handleDemoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!IS_DEMO_MODE) {
    throw new DemoApiError('Demo mode is disabled', 500);
  }

  const url = parseUrl(path);
  const method = getMethod(init);
  const body = await readBody(init);
  const actor = getActor(init);
  const state = getDemoState();

  if (method === 'GET') {
    if (url.pathname === '/api/auth/demo-users') {
      const role = url.searchParams.get('role');
      return state.users.filter((user) => user.status === 'active' && (!role || user.role === role)) as T;
    }
    if (url.pathname === '/api/reports/network') {
      return buildNetworkDashboard(state) as T;
    }
    if (url.pathname === '/api/reports/adoption/overview') {
      return buildAdoptionOverview(state) as T;
    }
    if (url.pathname.startsWith('/api/reports/adoption/parlours/')) {
      const parlourId = url.pathname.split('/').pop() || '';
      const parlour = requireEntity(state.parlours.find((item) => item.id === parlourId), 'Parlour not found');
      const base = requireEntity(buildAdoptionOverview(state).parlours.find((item) => item.parlourId === parlourId), 'Parlour adoption not found');
      const adoption = getAdoptionRecord(state, parlour);
      const lastActive = adoption.lastActiveAt ? new Date(adoption.lastActiveAt).getTime() : null;
      return {
        ...base,
        daysSinceLastActivity: lastActive ? Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24)) : null,
        moduleActivity: adoption.moduleActivity,
        recentEvents: state.auditEntries.filter((entry) => entry.parlourId === parlourId).slice(0, 10).map((entry) => ({
          id: entry.id,
          occurredOn: entry.timestamp.replace(' ', 'T'),
          module: entry.entityType.toLowerCase().replace(/\s+/g, '_'),
          eventType: entry.action,
          userName: entry.userName,
          userRole: entry.userRole,
          details: entry.details || null,
          entityType: entry.entityType,
          entityId: entry.entityId,
        })),
      } as T;
    }
    if (url.pathname === '/api/reports/dashboard') {
      const parlourId = url.searchParams.get('parlourId');
      if (!parlourId) {
        throw new DemoApiError('Parlour is required', 400);
      }
      return buildReportsDashboard(state, parlourId, url.searchParams.get('branchId')) as T;
    }
    if (url.pathname === '/api/parlours/availability/subdomain') {
      const value = (url.searchParams.get('value') || '').trim().toLowerCase();
      const excludeParlourId = url.searchParams.get('excludeParlourId');
      const takenBy = state.parlours.find((parlour) => parlour.websiteSubdomain?.toLowerCase() === value && parlour.id !== excludeParlourId)?.id || null;
      return { available: !takenBy, websiteSubdomain: value, takenBy } as T;
    }
    if (url.pathname.startsWith('/api/parlours/')) {
      const id = url.pathname.split('/')[3];
      return requireEntity(state.parlours.find((parlour) => parlour.id === id), 'Parlour not found') as T;
    }
    if (url.pathname.startsWith('/api/funeral-cases/')) {
      const id = url.pathname.split('/')[3];
      return requireEntity(state.funeralCases.find((item) => item.id === id), 'Funeral case not found') as T;
    }
    return listCollection(url, state) as T;
  }

  if (url.pathname === '/api/auth/login' && method === 'POST') {
    const input = (body || {}) as { email?: string; role?: UserRole };
    if (!input.email || !input.role) {
      throw new DemoApiError('Email and role are required', 400);
    }
    const email = input.email.toLowerCase();
    const role = input.role;
    const user = state.users.find((candidate) => candidate.email.toLowerCase() === email && candidate.role === role && candidate.status === 'active');
    if (!user) {
      throw new DemoApiError('Invalid demo credentials', 401);
    }
    return { token: user.id, user } as T;
  }

  if (url.pathname === '/api/auth/demo-session/reset' && method === 'POST') {
    resetDemoState();
    return { ok: true } as T;
  }

  if (url.pathname === '/api/parlours' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const parlourId = generateDemoId('p');
    const joinedDate = String(input.joinedDate || new Date().toISOString().slice(0, 10));
    const parlour: Parlour = {
      id: parlourId,
      name: String(input.name || ''),
      region: String(input.region || ''),
      province: String(input.province || ''),
      tier: (input.tier as Parlour['tier']) || 'basic',
      status: (input.status as Parlour['status']) || 'onboarding',
      onboardingProgress: Number(input.onboardingProgress || 0),
      totalMembers: Number(input.totalMembers || 0),
      totalPolicies: Number(input.totalPolicies || 0),
      contactEmail: String(input.contactEmail || ''),
      contactPhone: String(input.contactPhone || ''),
      logo: undefined,
      primaryColor: String(input.primaryColor || '#9f2a2a'),
      secondaryColor: '#1f2937',
      accentColor: '#f59e0b',
      businessDescription: null,
      tagline: null,
      supportEmail: null,
      supportPhone: null,
      physicalAddress: null,
      websiteTemplate: 'modern',
      websiteSubdomain: null,
      customDomain: null,
      customDomainStatus: 'not_requested',
      customDomainDnsTarget: null,
      customDomainNotes: null,
      websitePublished: false,
      websitePublishStatus: 'draft',
      brandingCompletedAt: null,
      joinedDate,
    };
    const ownerUser: User = {
      id: generateDemoId('u'),
      name: String(input.ownerName || `${parlour.name} Owner`),
      email: String(input.contactEmail || `${parlourId}@demo.local`),
      role: 'parlour_owner',
      parlourId,
      status: 'active',
    };

    updateDemoState((current) => appendAuditEntry({
      ...current,
      parlours: [parlour, ...current.parlours],
      users: [ownerUser, ...current.users],
      adoptionByParlourId: {
        ...current.adoptionByParlourId,
        [parlourId]: getAdoptionRecord(current, parlour),
      },
    }, {
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'PARLOUR_CREATED',
      entityType: 'Parlour',
      entityId: parlour.id,
      entityLabel: parlour.name,
      details: `New parlour tenant created; region: ${parlour.region}; tier: ${parlour.tier}`,
    }));

    return { parlour, ownerUser } as T;
  }

  if (url.pathname.startsWith('/api/parlours/') && method === 'PATCH') {
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments[2];
    const mode = segments[3];
    const input = (body || {}) as Record<string, unknown>;
    let updated: Parlour | null = null;

    updateDemoState((current) => {
      const parlours = current.parlours.map((parlour) => {
        if (parlour.id !== id) {
          return parlour;
        }
        updated = mode === 'status' ? { ...parlour, status: input.status as Parlour['status'] } : { ...parlour, ...input } as Parlour;
        return updated;
      });

      if (!updated) {
        throw new DemoApiError('Parlour not found', 404);
      }

      return parlourAudit(current, parlours, updated, actor);
    });

    return updated as T;
  }

  if (url.pathname.endsWith('/logo') && method === 'POST') {
    const id = url.pathname.split('/')[3];
    if (!(body instanceof FormData)) {
      throw new DemoApiError('Logo upload requires form data', 400);
    }
    const file = body.get('file');
    if (!(file instanceof File)) {
      throw new DemoApiError('Logo file is required', 400);
    }

    const logo = await fileToDataUrl(file);
    let updated: Parlour | null = null;
    updateDemoState((current) => {
      const parlours = current.parlours.map((parlour) => {
        if (parlour.id !== id) {
          return parlour;
        }
        updated = { ...parlour, logo };
        return updated;
      });

      if (!updated) {
        throw new DemoApiError('Parlour not found', 404);
      }

      return parlourAudit(current, parlours, updated, actor);
    });

    return updated as T;
  }

  if (url.pathname === '/api/branches' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const branch: Branch = {
      id: generateDemoId('b'),
      parlourId: String(input.parlourId || ''),
      name: String(input.name || ''),
      address: String(input.address || ''),
      city: String(input.city || ''),
      province: String(input.province || ''),
      manager: String(input.manager || ''),
      phone: String(input.phone || ''),
      status: (input.status as Branch['status']) || 'active',
    };
    updateDemoState((current) => appendAuditEntry({ ...current, branches: [branch, ...current.branches] }, {
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'BRANCH_CREATED',
      entityType: 'Branch',
      entityId: branch.id,
      entityLabel: branch.name,
      parlourId: branch.parlourId,
      details: `New branch created; manager: ${branch.manager}`,
    }));
    return branch as T;
  }

  if (url.pathname.startsWith('/api/branches/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const mode = url.pathname.split('/')[4];
    const input = (body || {}) as Record<string, unknown>;
    let updated: Branch | null = null;
    updateDemoState((current) => {
      const branches = current.branches.map((branch) => {
        if (branch.id !== id) {
          return branch;
        }
        updated = mode === 'status' ? { ...branch, status: input.status as Branch['status'] } : { ...branch, ...input } as Branch;
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('Branch not found', 404);
      }
      return { ...current, branches };
    });
    return updated as T;
  }

  if (url.pathname === '/api/users' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const user: User = {
      id: generateDemoId('u'),
      name: String(input.name || ''),
      email: String(input.email || ''),
      role: input.role as UserRole,
      parlourId: input.parlourId ? String(input.parlourId) : undefined,
      branchId: input.branchId ? String(input.branchId) : undefined,
      status: (input.status as User['status']) || 'active',
    };
    updateDemoState((current) => appendAuditEntry({ ...current, users: [user, ...current.users] }, {
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      entityLabel: user.name,
      parlourId: user.parlourId,
      details: `New user created with role: ${user.role}`,
    }));
    return user as T;
  }

  if (url.pathname.startsWith('/api/users/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const mode = url.pathname.split('/')[4];
    const input = (body || {}) as Record<string, unknown>;
    let updated: User | null = null;
    updateDemoState((current) => {
      const users = current.users.map((user) => {
        if (user.id !== id) {
          return user;
        }
        updated = mode === 'status' ? { ...user, status: input.status as User['status'] } : { ...user, ...input } as User;
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('User not found', 404);
      }
      return { ...current, users };
    });
    return updated as T;
  }

  if (url.pathname === '/api/subscriptions' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const timestamp = nowIsoString();
    const plan: SubscriptionPlan = {
      id: generateDemoId('plan_'),
      tier: input.tier as SubscriptionPlan['tier'],
      name: String(input.name || ''),
      amount: Number(input.amount || 0),
      description: input.description ? String(input.description) : null,
      isActive: Boolean(input.isActive),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    updateDemoState((current) => ({ ...current, subscriptionPlans: [plan, ...current.subscriptionPlans] }));
    return plan as T;
  }

  if (url.pathname.startsWith('/api/subscriptions/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const input = (body || {}) as Record<string, unknown>;
    let updated: SubscriptionPlan | null = null;
    updateDemoState((current) => {
      const subscriptionPlans = current.subscriptionPlans.map((plan) => {
        if (plan.id !== id) {
          return plan;
        }
        updated = { ...plan, ...input, updatedAt: nowIsoString() } as SubscriptionPlan;
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('Subscription plan not found', 404);
      }
      const parlourSubscriptions = current.parlourSubscriptions.map((subscription) => (
        subscription.tier === updated?.tier
          ? { ...subscription, amount: updated?.amount || subscription.amount, updatedAt: nowIsoString() }
          : subscription
      ));
      return { ...current, subscriptionPlans, parlourSubscriptions };
    });
    return updated as T;
  }

  if (url.pathname.startsWith('/api/subscriptions/') && method === 'DELETE') {
    const id = url.pathname.split('/')[3];
    updateDemoState((current) => {
      const plan = requireEntity(current.subscriptionPlans.find((item) => item.id === id), 'Subscription plan not found');
      if (current.parlourSubscriptions.some((subscription) => subscription.tier === plan.tier)) {
        throw new DemoApiError('Cannot delete a subscription plan that is assigned to parlours', 409);
      }
      return { ...current, subscriptionPlans: current.subscriptionPlans.filter((item) => item.id !== id) };
    });
    return undefined as T;
  }

  if (url.pathname === '/api/parlour-subscriptions' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const timestamp = nowIsoString();
    const parlourId = String(input.parlourId || '');
    const subscription: ParlourSubscription = {
      id: generateDemoId('ps'),
      parlourId,
      parlourName: getParlourName(state, parlourId),
      tier: input.tier as ParlourSubscription['tier'],
      status: input.status as ParlourSubscription['status'],
      billingCycle: input.billingCycle as ParlourSubscription['billingCycle'],
      amount: getPlanAmount(state, input.tier as SubscriptionPlan['tier']),
      startDate: String(input.startDate || new Date().toISOString().slice(0, 10)),
      endDate: input.endDate ? String(input.endDate) : null,
      autoRenew: Boolean(input.autoRenew),
      notes: input.notes ? String(input.notes) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    updateDemoState((current) => ({ ...current, parlourSubscriptions: [subscription, ...current.parlourSubscriptions] }));
    return subscription as T;
  }

  if (url.pathname.startsWith('/api/parlour-subscriptions/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const input = (body || {}) as Record<string, unknown>;
    let updated: ParlourSubscription | null = null;
    updateDemoState((current) => {
      const parlourSubscriptions = current.parlourSubscriptions.map((subscription) => {
        if (subscription.id !== id) {
          return subscription;
        }
        const tier = (input.tier as SubscriptionPlan['tier']) || subscription.tier;
        updated = {
          ...subscription,
          ...input,
          tier,
          amount: getPlanAmount(current, tier),
          updatedAt: nowIsoString(),
        } as ParlourSubscription;
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('Parlour subscription not found', 404);
      }
      return { ...current, parlourSubscriptions };
    });
    return updated as T;
  }

  if (url.pathname.startsWith('/api/parlour-subscriptions/') && method === 'DELETE') {
    const id = url.pathname.split('/')[3];
    updateDemoState((current) => ({ ...current, parlourSubscriptions: current.parlourSubscriptions.filter((item) => item.id !== id) }));
    return undefined as T;
  }

  if (url.pathname === '/api/leads' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const lead: Lead = {
      id: generateDemoId('lead'),
      parlourId: String(input.parlourId || ''),
      branchId: input.branchId ? String(input.branchId) : undefined,
      firstName: String(input.firstName || ''),
      lastName: String(input.lastName || ''),
      phone: String(input.phone || ''),
      email: input.email ? String(input.email) : undefined,
      source: (input.source as Lead['source']) || 'website',
      status: (input.status as Lead['status']) || 'new',
      assignedTo: input.assignedTo ? String(input.assignedTo) : undefined,
      notes: input.notes ? String(input.notes) : undefined,
      createdAt: nowIsoString(),
    };
    updateDemoState((current) => ({ ...current, leads: [lead, ...current.leads] }));
    return lead as T;
  }

  if (url.pathname === '/api/leads/website-inquiry' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const leadId = generateDemoId('lead');
    updateDemoState((current) => ({
      ...current,
      leads: [{
        id: leadId,
        parlourId: String(input.parlourId || ''),
        firstName: String(input.firstName || ''),
        lastName: String(input.lastName || ''),
        phone: String(input.phone || ''),
        email: input.email ? String(input.email) : undefined,
        source: 'website',
        status: 'new',
        notes: input.message ? String(input.message) : undefined,
        createdAt: nowIsoString(),
      }, ...current.leads],
    }));
    return { ok: true, leadId } as T;
  }

  if (url.pathname.startsWith('/api/leads/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const mode = url.pathname.split('/')[4];
    const input = (body || {}) as Record<string, unknown>;
    let updated: Lead | null = null;
    updateDemoState((current) => {
      const leads = current.leads.map((lead) => {
        if (lead.id !== id) {
          return lead;
        }
        updated = mode === 'status' ? { ...lead, status: input.status as Lead['status'] } : { ...lead, ...input } as Lead;
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('Lead not found', 404);
      }
      return { ...current, leads };
    });
    return updated as T;
  }

  if (url.pathname === '/api/products' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const product = { id: generateDemoId('pr'), ...input };
    updateDemoState((current) => ({ ...current, products: [product as DemoState['products'][number], ...current.products] }));
    return product as T;
  }

  if (url.pathname.startsWith('/api/products/') && method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const mode = url.pathname.split('/')[4];
    const input = (body || {}) as Record<string, unknown>;
    let updated: DemoState['products'][number] | null = null;
    updateDemoState((current) => {
      const products = current.products.map((product) => {
        if (product.id !== id) {
          return product;
        }
        updated = mode === 'status' ? { ...product, isActive: Boolean(input.isActive) } : { ...product, ...input } as DemoState['products'][number];
        return updated;
      });
      if (!updated) {
        throw new DemoApiError('Product not found', 404);
      }
      return { ...current, products };
    });
    return updated as T;
  }

  if (url.pathname === '/api/communications/send' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const communication: Communication = {
      id: generateDemoId('com'),
      type: input.type as Communication['type'],
      recipientName: String(input.recipientName || ''),
      recipientContact: String(input.recipientContact || ''),
      subject: input.subject ? String(input.subject) : undefined,
      template: String(input.templateName || input.message || 'Ad hoc communication'),
      status: 'sent',
      sentAt: nowIsoString(),
      parlourId: String(input.parlourId || ''),
      metadata: {
        trigger: input.trigger ? String(input.trigger) : undefined,
        templateId: input.templateId ? String(input.templateId) : undefined,
        templateName: input.templateName ? String(input.templateName) : undefined,
        renderedBody: input.message ? String(input.message) : undefined,
        renderedSubject: input.subject ? String(input.subject) : undefined,
        providerMode: 'demo',
        createdBy: actor.id,
      },
    };
    updateDemoState((current) => ({ ...current, communications: [communication, ...current.communications] }));
    return communication as T;
  }

  if (url.pathname === '/api/documents' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const document: Document = {
      id: generateDemoId('doc'),
      name: String(input.name || ''),
      type: input.type as Document['type'],
      entityType: input.entityType as Document['entityType'],
      entityId: String(input.entityId || ''),
      parlourId: String(input.parlourId || ''),
      uploadedBy: String(input.uploadedBy || actor.name),
      uploadedAt: nowIsoString(),
      size: String(input.size || '0 KB'),
    };
    updateDemoState((current) => ({ ...current, documents: [document, ...current.documents] }));
    return document as T;
  }

  if (url.pathname === '/api/documents/upload' && method === 'POST') {
    if (!(body instanceof FormData)) {
      throw new DemoApiError('Document upload requires form data', 400);
    }
    const file = body.get('file');
    const dataUrl = file instanceof File ? await fileToDataUrl(file) : null;
    const document: Document = {
      id: generateDemoId('doc'),
      name: String(body.get('name') || (file instanceof File ? file.name : 'Upload')),
      type: String(body.get('type') || 'other') as Document['type'],
      entityType: String(body.get('entityType') || 'member') as Document['entityType'],
      entityId: String(body.get('entityId') || ''),
      parlourId: String(body.get('parlourId') || ''),
      uploadedBy: String(body.get('uploadedBy') || actor.name),
      uploadedAt: nowIsoString(),
      size: file instanceof File ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '1 KB',
    };
    updateDemoState((current) => ({ ...current, documents: [document, ...current.documents] }));
    return { ...document, downloadUrl: dataUrl } as T;
  }

  if (url.pathname.startsWith('/api/documents/') && method === 'DELETE') {
    const id = url.pathname.split('/')[3];
    updateDemoState((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== id) }));
    return undefined as T;
  }

  throw new DemoApiError(`Demo mode does not yet support ${method} ${url.pathname}`, 501);
}