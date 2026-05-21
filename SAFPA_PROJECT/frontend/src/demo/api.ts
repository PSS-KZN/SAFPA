import { parlourDashboardStats, safpaDashboardStats } from '../data/dashboardStats';
import type {
  AuditEntry,
  Branch,
  Communication,
  Document,
  FuneralCase,
  Lead,
  Member,
  Parlour,
  ParlourSubscription,
  PaymentTransaction,
  Policy,
  SubscriptionPlan,
  User,
  UserRole,
} from '../types';
import type { PaymentProvider, ReconciliationImportRecord } from '../services/paymentsApi';
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
    branchId: headers.get('x-branch-id') || undefined,
  };
}

function requireEntity<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new DemoApiError(message, 404);
  }

  return value;
}

function getPaymentProviders(): PaymentProvider[] {
  return [
    {
      code: 'safpa_mvp_static',
      name: 'SAFPA Static Provider',
      mode: 'static',
      status: 'configured',
      methods: ['debit_order', 'eft', 'card'],
      notes: 'Static MVP provider placeholder until a live gateway is enabled.',
    },
    {
      code: 'manual_branch_capture',
      name: 'Manual Branch Capture',
      mode: 'manual',
      status: 'configured',
      methods: ['cash'],
      notes: 'Used for over-the-counter branch payments and back-office capture.',
    },
  ];
}

function resolvePaymentProvider(method: PaymentTransaction['method']): Pick<PaymentTransaction, 'providerCode' | 'providerName' | 'captureChannel'> {
  if (method === 'cash') {
    return {
      providerCode: 'manual_branch_capture',
      providerName: 'Manual Branch Capture',
      captureChannel: 'branch_manual',
    };
  }

  return {
    providerCode: 'safpa_mvp_static',
    providerName: 'SAFPA Static Provider',
    captureChannel: 'provider_static',
  };
}

function buildDemoPayment(input: Record<string, unknown>, policy: Policy, member: Member | undefined): PaymentTransaction {
  const method = (input.method as PaymentTransaction['method']) || 'cash';
  const provider = resolvePaymentProvider(method);

  return {
    id: generateDemoId('pay'),
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    memberId: policy.memberId,
    memberName: member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown Member',
    amount: Number(input.amount || 0),
    date: String(input.date || new Date().toISOString().slice(0, 10)),
    method,
    providerCode: provider.providerCode,
    providerName: provider.providerName,
    captureChannel: provider.captureChannel,
    status: (input.status as PaymentTransaction['status']) || 'successful',
    reference: String(input.reference || `PAY-${Date.now()}`),
    parlourId: policy.parlourId,
  };
}

function canTransitionPolicyStatus(policy: Policy, nextStatus: Policy['status']): boolean {
  if (policy.status === nextStatus) {
    return true;
  }

  const rules = policy.allowedStatusTransitions;
  if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
    const allowed = (rules as Record<string, unknown>)[policy.status];
    if (Array.isArray(allowed)) {
      return allowed.includes(nextStatus);
    }
  }

  const defaults: Record<Policy['status'], Policy['status'][]> = {
    draft: ['pending', 'cancelled'],
    pending: ['active', 'cancelled'],
    active: ['suspended', 'lapsed', 'closed', 'cancelled'],
    suspended: ['active', 'reinstated', 'lapsed', 'cancelled'],
    lapsed: ['reinstated', 'closed'],
    reinstated: ['active', 'suspended', 'cancelled'],
    cancelled: [],
    closed: [],
  };

  return defaults[policy.status].includes(nextStatus);
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

function listCollection(url: URL, state: DemoState, actor: ReturnType<typeof getActor>) {
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
      const actorMemberId = actor.role === 'policyholder_customer'
        ? state.users.find((user) => user.id === actor.id)?.memberId
        : undefined;
      const filtered = parlourId ? state.funeralCases.filter((item) => item.parlourId === parlourId) : state.funeralCases;
      return actor.role === 'policyholder_customer' && actorMemberId
        ? filtered.filter((item) => item.memberId === actorMemberId)
        : filtered;
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
    case '/api/payments/providers':
      return { providers: getPaymentProviders() };
    case '/api/payments/reconciliation-imports': {
      const parlourId = url.searchParams.get('parlourId');
      return parlourId ? state.reconciliationImports.filter((item) => item.parlourId === parlourId) : state.reconciliationImports;
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

type DemoAssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type DemoAssistantRequest = {
  message?: string;
  history?: DemoAssistantMessage[];
  context?: {
    page?: string;
    entityType?: 'policy' | 'member' | 'funeral_case';
    entityId?: string;
    currentPath?: string;
  };
};

type DemoAssistantResponse = {
  answer: string;
  suggestions: string[];
  appliedRole: UserRole;
  guardrail: string;
};

function normalizeAssistantPrompt(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function allowedPolicyTransitions(policy: Policy): string[] {
  const rules = policy.allowedStatusTransitions;
  if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
    const allowed = (rules as Record<string, unknown>)[policy.status];
    if (Array.isArray(allowed)) {
      return allowed.filter((item): item is string => typeof item === 'string');
    }
  }

  const defaults: Record<Policy['status'], Policy['status'][]> = {
    draft: ['pending', 'cancelled'],
    pending: ['active', 'cancelled'],
    active: ['suspended', 'lapsed', 'closed', 'cancelled'],
    suspended: ['active', 'reinstated', 'lapsed', 'cancelled'],
    lapsed: ['reinstated', 'closed'],
    reinstated: ['active', 'suspended', 'cancelled'],
    cancelled: [],
    closed: [],
  };

  return defaults[policy.status];
}

function actorMemberId(state: DemoState, actor: ReturnType<typeof getActor>): string | undefined {
  return state.users.find((user) => user.id === actor.id)?.memberId;
}

function visibleMembers(state: DemoState, actor: ReturnType<typeof getActor>): Member[] {
  if (actor.role === 'safpa_admin') {
    return state.members;
  }

  if (actor.role === 'policyholder_customer') {
    const memberId = actorMemberId(state, actor);
    return memberId ? state.members.filter((member) => member.id === memberId) : [];
  }

  if (!actor.parlourId) {
    return [];
  }

  const parlourMembers = state.members.filter((member) => member.parlourId === actor.parlourId);
  if (actor.role === 'branch_manager' && actor.branchId) {
    return parlourMembers.filter((member) => member.branchId === actor.branchId);
  }

  return parlourMembers;
}

function visiblePolicies(state: DemoState, actor: ReturnType<typeof getActor>): Policy[] {
  if (actor.role === 'safpa_admin') {
    return state.policies;
  }

  if (actor.role === 'operations_coordinator') {
    return [];
  }

  const memberIds = new Set(visibleMembers(state, actor).map((member) => member.id));
  return state.policies.filter((policy) => memberIds.has(policy.memberId));
}

function visibleDocuments(state: DemoState, actor: ReturnType<typeof getActor>): Document[] {
  if (actor.role === 'safpa_admin') {
    return state.documents;
  }

  if (actor.role === 'policyholder_customer') {
    const memberId = actorMemberId(state, actor);
    const policyIds = new Set(visiblePolicies(state, actor).map((policy) => policy.id));
    return state.documents.filter((document) => (
      (document.entityType === 'member' && document.entityId === memberId)
      || (document.entityType === 'policy' && policyIds.has(document.entityId))
    ));
  }

  if (!actor.parlourId) {
    return [];
  }

  const allowedTypes = actor.role === 'operations_coordinator'
    ? new Set(['funeral_case'])
    : actor.role === 'policy_admin'
      ? new Set(['member', 'policy'])
      : new Set(['member', 'policy', 'funeral_case']);

  return state.documents.filter((document) => document.parlourId === actor.parlourId && allowedTypes.has(document.entityType));
}

function visibleFuneralCases(state: DemoState, actor: ReturnType<typeof getActor>): FuneralCase[] {
  if (actor.role === 'safpa_admin') {
    return state.funeralCases;
  }

  if (actor.role === 'policyholder_customer') {
    const memberId = actorMemberId(state, actor);
    return memberId ? state.funeralCases.filter((funeralCase) => funeralCase.memberId === memberId) : [];
  }

  if (!actor.parlourId || actor.role === 'policy_admin' || actor.role === 'collections_clerk') {
    return [];
  }

  const parlourCases = state.funeralCases.filter((funeralCase) => funeralCase.parlourId === actor.parlourId);
  if (actor.role === 'branch_manager' && actor.branchId) {
    return parlourCases.filter((funeralCase) => funeralCase.branchId === actor.branchId);
  }

  return parlourCases;
}

function roleCapabilitySummary(role: UserRole): string {
  const summaries: Record<UserRole, string> = {
    safpa_admin: 'You can view network-wide parlour, adoption, reporting, and oversight data across the federation.',
    parlour_owner: 'You can view and manage members, policies, collections, communications, documents, and funeral cases for your parlour.',
    branch_manager: 'You can only view branch-scoped operational data tied to your branch.',
    policy_admin: 'You can work with leads, members, policies, communications, reports, and policy/member documents for your parlour.',
    collections_clerk: 'You can work with collections, balances, receipts, arrears, communications, and reports for your parlour.',
    operations_coordinator: 'You can work with funeral cases, operational communications, funeral-case documents, and operational reporting.',
    policyholder_customer: 'You can only access your own policy, payments, documents, claim history, and support information.',
  };

  return summaries[role];
}

function policyStatusMeaning(status: Policy['status']): string {
  const meanings: Record<Policy['status'], string> = {
    draft: 'The policy has been created but is not yet ready for cover to begin.',
    pending: 'The policy is awaiting activation and may still be in onboarding or validation.',
    active: 'The policy is in force and cover is intended to be active.',
    suspended: 'The policy has been paused, usually because of arrears or a servicing issue.',
    lapsed: 'The policy is no longer in force because it moved beyond suspension into lapse.',
    reinstated: 'The policy has been restored after a lapse or suspension and can move back to active.',
    cancelled: 'The policy has been cancelled and is no longer serviceable.',
    closed: 'The policy lifecycle is complete and closed out.',
  };

  return meanings[status];
}

function findPolicyFromPrompt(state: DemoState, actor: ReturnType<typeof getActor>, prompt: string): Policy | undefined {
  const policies = visiblePolicies(state, actor);
  const members = visibleMembers(state, actor);

  const byNumber = policies.find((policy) => prompt.includes(normalizeAssistantPrompt(policy.policyNumber)));
  if (byNumber) {
    return byNumber;
  }

  for (const member of members) {
    const memberName = normalizeAssistantPrompt(`${member.firstName} ${member.lastName}`);
    if (!memberName || !prompt.includes(memberName)) {
      continue;
    }

    const match = policies.find((policy) => policy.memberId === member.id);
    if (match) {
      return match;
    }
  }

  return policies[0];
}

function findMemberFromPrompt(state: DemoState, actor: ReturnType<typeof getActor>, prompt: string): Member | undefined {
  const members = visibleMembers(state, actor);

  const byName = members.find((member) => prompt.includes(normalizeAssistantPrompt(`${member.firstName} ${member.lastName}`)));
  if (byName) {
    return byName;
  }

  return members[0];
}

function findFuneralCaseFromPrompt(state: DemoState, actor: ReturnType<typeof getActor>, prompt: string): FuneralCase | undefined {
  const funeralCases = visibleFuneralCases(state, actor);

  const byNumber = funeralCases.find((funeralCase) => prompt.includes(normalizeAssistantPrompt(funeralCase.caseNumber)));
  if (byNumber) {
    return byNumber;
  }

  const byDeceased = funeralCases.find((funeralCase) => prompt.includes(normalizeAssistantPrompt(funeralCase.deceasedName)));
  if (byDeceased) {
    return byDeceased;
  }

  return funeralCases[0];
}

function resolvedPolicyFromContext(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): Policy | undefined {
  const policies = visiblePolicies(state, actor);
  if (input.context?.entityType === 'policy' && input.context.entityId) {
    const contextual = policies.find((policy) => policy.id === input.context?.entityId);
    if (contextual) {
      return contextual;
    }
  }

  const historyPrompt = [...(input.history || [])]
    .reverse()
    .find((message) => message.role === 'user' && message.content.trim())?.content;
  const normalizedHistoryPrompt = historyPrompt ? normalizeAssistantPrompt(historyPrompt) : '';

  return findPolicyFromPrompt(state, actor, prompt || normalizedHistoryPrompt);
}

function resolvedMemberFromContext(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): Member | undefined {
  const members = visibleMembers(state, actor);
  if (input.context?.entityType === 'member' && input.context.entityId) {
    const contextual = members.find((member) => member.id === input.context?.entityId);
    if (contextual) {
      return contextual;
    }
  }

  const historyPrompt = [...(input.history || [])]
    .reverse()
    .find((message) => message.role === 'user' && message.content.trim())?.content;
  const normalizedHistoryPrompt = historyPrompt ? normalizeAssistantPrompt(historyPrompt) : '';

  return findMemberFromPrompt(state, actor, prompt || normalizedHistoryPrompt);
}

function resolvedFuneralCaseFromContext(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): FuneralCase | undefined {
  const funeralCases = visibleFuneralCases(state, actor);
  if (input.context?.entityType === 'funeral_case' && input.context.entityId) {
    const contextual = funeralCases.find((funeralCase) => funeralCase.id === input.context?.entityId);
    if (contextual) {
      return contextual;
    }
  }

  const historyPrompt = [...(input.history || [])]
    .reverse()
    .find((message) => message.role === 'user' && message.content.trim())?.content;
  const normalizedHistoryPrompt = historyPrompt ? normalizeAssistantPrompt(historyPrompt) : '';

  return findFuneralCaseFromPrompt(state, actor, prompt || normalizedHistoryPrompt);
}

function buildPolicyExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const policy = resolvedPolicyFromContext(state, actor, input, prompt);
  if (!policy) {
    return {
      answer: `${roleCapabilitySummary(actor.role)} I cannot see a policy in your current role scope to explain.`,
      suggestions: ['What can I do in my role?', 'What documents are needed for reinstatement?', 'Show policies at risk'],
      appliedRole: actor.role,
      guardrail: 'No visible policy matched your current role scope.',
    };
  }

  const member = state.members.find((item) => item.id === policy.memberId);
  const nextActions = allowedPolicyTransitions(policy);
  const paymentCount = state.payments.filter((payment) => payment.policyId === policy.id).length;
  const waitingPeriodText = policy.waitingPeriodDays > 0
    ? `The waiting period is ${policy.waitingPeriodDays} days from ${policy.startDate}.`
    : 'There is no waiting period configured.';
  const arrearsText = policy.arrearsAmount > 0
    ? `The policy currently has arrears of R${policy.arrearsAmount}.`
    : 'The policy currently has no arrears.';

  return {
    answer: `Policy ${policy.policyNumber}${member ? ` for ${member.firstName} ${member.lastName}` : ''} is ${policy.status}. ${policyStatusMeaning(policy.status)} It is on ${policy.productName} with cover of R${policy.coverAmount.toLocaleString()} and a ${policy.billingFrequency} premium of R${policy.premiumAmount}. ${arrearsText} ${waitingPeriodText} I can also see ${paymentCount} recorded payment${paymentCount === 1 ? '' : 's'} for this policy. The next allowed status changes are ${nextActions.length > 0 ? nextActions.join(', ') : 'none'}.`,
    suggestions: ['Why is this policy status what it is?', 'What should I do next for this policy?', 'What documents are needed for reinstatement?'],
    appliedRole: actor.role,
    guardrail: `Response limited to policy data visible to the ${actor.role} role.`,
  };
}

function buildMemberExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const member = resolvedMemberFromContext(state, actor, input, prompt);
  if (!member) {
    return buildFallbackExplanation(actor);
  }

  const memberPolicies = visiblePolicies(state, actor).filter((policy) => policy.memberId === member.id);
  const successfulPayments = state.payments.filter((payment) => payment.memberId === member.id && payment.status === 'successful').length;

  return {
    answer: `${member.firstName} ${member.lastName} is currently an ${member.status} member in ${member.city}, ${member.province}. Their join date is ${member.joinDate}, and I can see ${memberPolicies.length} policy${memberPolicies.length === 1 ? '' : 'ies'} linked to this member, ${successfulPayments} successful payment${successfulPayments === 1 ? '' : 's'}, ${member.dependants.length} dependant${member.dependants.length === 1 ? '' : 's'}, and ${member.beneficiaries.length} beneficiar${member.beneficiaries.length === 1 ? 'y' : 'ies'}. This explanation is based on the member profile currently visible to your ${actor.role} role.`,
    suggestions: ['Explain a policy', 'What should I do next for this member?', 'What documents are needed?'],
    appliedRole: actor.role,
    guardrail: `Member explanations are limited to records visible to the ${actor.role} role.`,
  };
}

function buildMemberNextStepExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const member = resolvedMemberFromContext(state, actor, input, prompt);
  if (!member) {
    return buildRoleExplanation(actor);
  }

  const memberPolicies = visiblePolicies(state, actor).filter((policy) => policy.memberId === member.id);
  const nextStep = memberPolicies.length === 0
    ? 'Review whether this member should be linked to a policy product and confirm their onboarding details are complete.'
    : 'Review linked policy status, current arrears exposure, and whether any documents or beneficiary updates are outstanding.';

  return {
    answer: `The most sensible next step for ${member.firstName} ${member.lastName} is: ${nextStep}`,
    suggestions: ['Explain this member', 'Explain a policy', 'What documents are needed?'],
    appliedRole: actor.role,
    guardrail: 'Next-step guidance is generated from the visible member and linked policy state.',
  };
}

function buildFuneralCaseExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const funeralCase = resolvedFuneralCaseFromContext(state, actor, input, prompt);
  if (!funeralCase) {
    return buildFallbackExplanation(actor);
  }

  const openTasks = funeralCase.tasks.filter((task) => !task.completed).length;
  const notesCount = funeralCase.notes.length;

  return {
    answer: `Funeral case ${funeralCase.caseNumber} for ${funeralCase.deceasedName} is currently ${funeralCase.status}. The case type is ${funeralCase.caseType}, the coordinator is ${funeralCase.coordinatorName}, the date of death is ${funeralCase.dateOfDeath}, and the funeral date is ${funeralCase.funeralDate || 'not yet scheduled'}. I can see ${openTasks} open task${openTasks === 1 ? '' : 's'}, ${notesCount} note${notesCount === 1 ? '' : 's'}, and ${funeralCase.bodyCollected ? 'the body has already been collected.' : 'body collection is still pending.'}`,
    suggestions: ['What should I do next for this case?', 'What documents are needed?', 'Show communications for this case'],
    appliedRole: actor.role,
    guardrail: `Funeral case explanations are limited to records visible to the ${actor.role} role.`,
  };
}

function buildFuneralCaseNextStepExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const funeralCase = resolvedFuneralCaseFromContext(state, actor, input, prompt);
  if (!funeralCase) {
    return buildRoleExplanation(actor);
  }

  const nextStep = funeralCase.status === 'logged'
    ? 'Confirm body collection, assign the first operational tasks, and gather the required case documents.'
    : funeralCase.status === 'in_progress'
      ? 'Review open tasks, supplier readiness, and scheduling milestones to keep the service on track.'
      : funeralCase.status === 'scheduled'
        ? 'Verify all staff, vehicles, suppliers, and family coordination details before the service date.'
        : 'Review closure tasks, archive readiness, and any required follow-up items.';

  return {
    answer: `The most sensible next step for case ${funeralCase.caseNumber} is: ${nextStep}`,
    suggestions: ['Explain this case', 'What documents are needed?', 'Show communications for this case'],
    appliedRole: actor.role,
    guardrail: 'Next-step guidance is generated from the visible funeral case state.',
  };
}

function buildGreetingExplanation(actor: ReturnType<typeof getActor>): DemoAssistantResponse {
  return {
    answer: `Hello. I’m ready to help in the ${actor.role} workspace. Ask about a policy, a payment situation, role permissions, required documents, or policies at risk and I will respond using the records and rules available in your current scope.`,
    suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
    appliedRole: actor.role,
    guardrail: 'Greeting response generated from the current workspace scope and assistant rules.',
  };
}

function buildStatusReasonExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const policy = resolvedPolicyFromContext(state, actor, input, prompt);
  if (!policy) {
    return buildFallbackExplanation(actor);
  }

  const reason = policy.status === 'suspended'
    ? policy.arrearsAmount > 0
      ? `The strongest visible reason is arrears of R${policy.arrearsAmount}.`
      : 'The policy is suspended, but this demo record does not show arrears as the visible reason.'
    : policy.status === 'lapsed'
      ? `The policy is lapsed, which means it has moved beyond active servicing. Visible arrears are R${policy.arrearsAmount}.`
      : policy.status === 'pending'
        ? 'The policy is still pending, so activation has not been completed yet.'
        : `The policy is ${policy.status}, which means ${policyStatusMeaning(policy.status).toLowerCase()}`;

  return {
    answer: `For policy ${policy.policyNumber}, ${reason} The current next due date is ${policy.nextDueDate}, the last payment date is ${policy.lastPaymentDate || 'not recorded'}, and the next allowed transitions are ${allowedPolicyTransitions(policy).join(', ') || 'none'}.`,
    suggestions: ['Explain this policy', 'What should I do next for this policy?', 'Show policies at risk'],
    appliedRole: actor.role,
    guardrail: `Status reasoning is limited to the visible fields available to ${actor.role}.`,
  };
}

function buildPaymentExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const policy = resolvedPolicyFromContext(state, actor, input, prompt);
  if (!policy) {
    return buildRiskExplanation(state, actor);
  }

  const payments = state.payments.filter((payment) => payment.policyId === policy.id);
  const successful = payments.filter((payment) => payment.status === 'successful');
  const lastSuccessful = successful[0];

  return {
    answer: `For policy ${policy.policyNumber}, the premium is R${policy.premiumAmount} on a ${policy.billingFrequency} cycle, the next due date is ${policy.nextDueDate}, and arrears are currently R${policy.arrearsAmount}. I can see ${payments.length} recorded payment${payments.length === 1 ? '' : 's'} in scope${lastSuccessful ? `, with the latest successful payment on ${lastSuccessful.date}` : ''}. Payment and arrears questions are answered from the policy balance plus recorded transactions currently visible to you.`,
    suggestions: ['Explain this policy', 'Why is this policy status what it is?', 'Show policies at risk'],
    appliedRole: actor.role,
    guardrail: `Payment answers are restricted to visible transactions for ${actor.role}.`,
  };
}

function buildNextStepExplanation(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest, prompt: string): DemoAssistantResponse {
  const policy = resolvedPolicyFromContext(state, actor, input, prompt);
  if (!policy) {
    return buildRoleExplanation(actor);
  }

  const nextStep = policy.status === 'pending'
    ? 'Review onboarding requirements and activate the policy when the record is ready.'
    : policy.status === 'suspended'
      ? policy.arrearsAmount > 0
        ? `Prioritize settling arrears of R${policy.arrearsAmount}, then consider reactivation or reinstatement according to the allowed transitions.`
        : 'Review why the policy is suspended and move it through the allowed status transitions.'
      : policy.status === 'lapsed'
        ? 'Review reinstatement viability, supporting documents, and any outstanding balance before moving it forward.'
      : policy.status === 'active'
        ? 'Monitor arrears, keep payments current, and keep documents up to date.'
        : `Review the current lifecycle state and use one of the allowed next transitions: ${allowedPolicyTransitions(policy).join(', ') || 'none'}.`;

  return {
    answer: `The most sensible next step for policy ${policy.policyNumber} is: ${nextStep} From your ${actor.role} role, I will only recommend actions that fit the visible policy state and your scope.`,
    suggestions: ['Explain this policy', 'What documents are needed for reinstatement?', 'Why is this policy status what it is?'],
    appliedRole: actor.role,
    guardrail: 'Next-step guidance is generated from visible state, not a live model.',
  };
}

function buildRoleExplanation(actor: ReturnType<typeof getActor>): DemoAssistantResponse {
  return {
    answer: `${roleCapabilitySummary(actor.role)} The assistant should refuse anything outside that scope, including another parlour, another branch, or another customer's policy.`,
    suggestions: ['Explain a policy', 'Show policies at risk', 'What documents are needed for a claim?'],
    appliedRole: actor.role,
    guardrail: `Role enforcement is simulated using the current ${actor.role} session and scope headers.`,
  };
}

function buildClaimOrDocumentExplanation(state: DemoState, actor: ReturnType<typeof getActor>): DemoAssistantResponse {
  const documents = visibleDocuments(state, actor);
  const funeralCases = visibleFuneralCases(state, actor);
  const sampleDocuments = documents.slice(0, 3).map((document) => document.name).join(', ');
  const base = actor.role === 'operations_coordinator'
    ? 'For funeral operations, focus on death notices, supporting IDs, claim forms, and service-related case documents.'
    : actor.role === 'policyholder_customer'
      ? 'For customer questions, the assistant should stay limited to your own policy-linked and member-linked documents.'
      : 'For policy claims or reinstatement, the assistant should explain the required document pack using fixed rules plus the visible documents already on file.';

  return {
    answer: `${base} In your current scope, I can see ${documents.length} accessible documents${sampleDocuments ? `, including ${sampleDocuments}` : ''}. I can also see ${funeralCases.length} accessible funeral case records. I use those visible records together with workflow rules to answer document and claim questions consistently.`,
    suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
    appliedRole: actor.role,
    guardrail: `Claim and document guidance is restricted to records visible to ${actor.role}.`,
  };
}

function buildRiskExplanation(state: DemoState, actor: ReturnType<typeof getActor>): DemoAssistantResponse {
  const atRiskPolicies = visiblePolicies(state, actor).filter((policy) => policy.arrearsAmount > 0 || ['pending', 'suspended', 'lapsed'].includes(policy.status));
  const examples = atRiskPolicies.slice(0, 3).map((policy) => `${policy.policyNumber} (${policy.status}, arrears R${policy.arrearsAmount})`).join('; ');

  return {
    answer: `Within your current scope, I can see ${atRiskPolicies.length} policies that look at risk because they are pending, suspended, lapsed, or in arrears. ${examples ? `Examples: ${examples}.` : 'There are no risky policies visible right now.'} This assessment is based on the policy status and arrears data currently visible in your workspace.`,
    suggestions: ['Explain a policy', 'What can I do in my role?', 'What documents are needed for reinstatement?'],
    appliedRole: actor.role,
    guardrail: `Risk analysis is limited to policy records visible to ${actor.role}.`,
  };
}

function buildFallbackExplanation(actor: ReturnType<typeof getActor>): DemoAssistantResponse {
  return {
    answer: `I answer using the current session role, the records visible in your workspace, and the operating rules available to me. ${roleCapabilitySummary(actor.role)}`,
    suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
    appliedRole: actor.role,
    guardrail: 'Responses are generated from visible records and assistant rules within your current scope.',
  };
}

function buildDemoAssistantResponse(state: DemoState, actor: ReturnType<typeof getActor>, input: DemoAssistantRequest): DemoAssistantResponse {
  const prompt = normalizeAssistantPrompt(input.message || '');
  const memberScoped = input.context?.entityType === 'member';
  const funeralCaseScoped = input.context?.entityType === 'funeral_case';

  if (!prompt) {
    return {
      answer: `Ask me about a policy, role access, claims, documents, or policies at risk. I will answer using the rules and records available to your ${actor.role} session.`,
      suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
      appliedRole: actor.role,
      guardrail: 'Empty prompt handled with deterministic help content.',
    };
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(prompt)) {
    return buildGreetingExplanation(actor);
  }

  if (prompt.includes('role') || prompt.includes('permission') || prompt.includes('access') || prompt.includes('what can i do')) {
    return buildRoleExplanation(actor);
  }

  if ((prompt.includes('why') || prompt.includes('reason')) && (prompt.includes('status') || prompt.includes('policy') || prompt.includes('suspended') || prompt.includes('lapsed') || prompt.includes('pending'))) {
    return buildStatusReasonExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('next step') || prompt.includes('what should i do') || prompt.includes('what do i do next') || prompt.includes('what now')) {
    if (memberScoped) {
      return buildMemberNextStepExplanation(state, actor, input, prompt);
    }

    if (funeralCaseScoped) {
      return buildFuneralCaseNextStepExplanation(state, actor, input, prompt);
    }

    return buildNextStepExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('payment') || prompt.includes('premium') || prompt.includes('due date') || prompt.includes('last payment')) {
    return buildPaymentExplanation(state, actor, input, prompt);
  }

  if (memberScoped && (prompt.includes('member') || prompt.includes('customer') || prompt.includes('person') || prompt.includes('profile') || prompt.includes('explain'))) {
    return buildMemberExplanation(state, actor, input, prompt);
  }

  if (funeralCaseScoped && (prompt.includes('funeral') || prompt.includes('case') || prompt.includes('deceased') || prompt.includes('service') || prompt.includes('explain'))) {
    return buildFuneralCaseExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('policy') || prompt.includes('cover') || prompt.includes('benefit') || prompt.includes('status') || prompt.includes('reinstat')) {
    return buildPolicyExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('member') || prompt.includes('customer') || prompt.includes('person') || prompt.includes('profile')) {
    return buildMemberExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('funeral') || prompt.includes('case') || prompt.includes('deceased') || prompt.includes('service')) {
    return buildFuneralCaseExplanation(state, actor, input, prompt);
  }

  if (prompt.includes('claim') || prompt.includes('document') || prompt.includes('support')) {
    return buildClaimOrDocumentExplanation(state, actor);
  }

  if (prompt.includes('risk') || prompt.includes('arrears') || prompt.includes('overdue') || prompt.includes('lapsed') || prompt.includes('suspend')) {
    return buildRiskExplanation(state, actor);
  }

  return buildFallbackExplanation(actor);
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
    if (url.pathname.startsWith('/api/policies/')) {
      const id = url.pathname.split('/')[3];
      return requireEntity(state.policies.find((policy) => policy.id === id), 'Policy not found') as T;
    }
    if (url.pathname.startsWith('/api/members/')) {
      const id = url.pathname.split('/')[3];
      return requireEntity(state.members.find((member) => member.id === id), 'Member not found') as T;
    }
    if (url.pathname.startsWith('/api/funeral-cases/')) {
      const id = url.pathname.split('/')[3];
      const record = requireEntity(state.funeralCases.find((item) => item.id === id), 'Funeral case not found');
      const actorMemberId = actor.role === 'policyholder_customer'
        ? state.users.find((user) => user.id === actor.id)?.memberId
        : undefined;
      if (actor.role === 'policyholder_customer' && actorMemberId && record.memberId !== actorMemberId) {
        throw new DemoApiError('You are not allowed to access this claim', 403);
      }
      return record as T;
    }
    return listCollection(url, state, actor) as T;
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

  if (url.pathname === '/api/assistant/chat' && method === 'POST') {
    return buildDemoAssistantResponse(state, actor, (body || {}) as DemoAssistantRequest) as T;
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

  if (url.pathname === '/api/funeral-cases' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const actorMemberId = actor.role === 'policyholder_customer'
      ? state.users.find((user) => user.id === actor.id)?.memberId
      : undefined;
    if (actor.role === 'policyholder_customer') {
      if (!actorMemberId || String(input.memberId || '') !== actorMemberId || String(input.caseType || '') !== 'policy') {
        throw new DemoApiError('Customers may only submit their own policy claims', 403);
      }
    }

    const record = {
      id: generateDemoId('fc'),
      caseNumber: `FC-${Date.now()}`,
      parlourId: String(input.parlourId || actor.parlourId || ''),
      branchId: String(input.branchId || ''),
      deceasedName: String(input.deceasedName || ''),
      deceasedIdNumber: String(input.deceasedIdNumber || ''),
      dateOfDeath: String(input.dateOfDeath || ''),
      deathNoticeLoggedAt: String(input.deathNoticeLoggedAt || new Date().toISOString().slice(0, 10)),
      deathNoticeLoggedBy: String(input.deathNoticeLoggedBy || actor.name),
      informantName: String(input.informantName || actor.name),
      informantPhone: String(input.informantPhone || ''),
      placeOfDeath: String(input.placeOfDeath || ''),
      causeOfDeath: input.causeOfDeath ? String(input.causeOfDeath) : undefined,
      bodyCollected: Boolean(input.bodyCollected),
      bodyCollectionLocation: input.bodyCollectionLocation ? String(input.bodyCollectionLocation) : undefined,
      policyId: input.policyId ? String(input.policyId) : undefined,
      policyNumber: input.policyNumber ? String(input.policyNumber) : undefined,
      memberId: input.memberId ? String(input.memberId) : undefined,
      coordinatorId: String(input.coordinatorId || 'u7'),
      coordinatorName: String(input.coordinatorName || 'Claims Desk'),
      status: (input.status as FuneralCase['status']) || 'logged',
      funeralDate: input.funeralDate ? String(input.funeralDate) : undefined,
      venue: input.venue ? String(input.venue) : undefined,
      caseType: (input.caseType as FuneralCase['caseType']) || 'policy',
      tasks: Array.isArray(input.tasks) ? input.tasks : [],
      notes: Array.isArray(input.notes) ? input.notes : [],
      staff: Array.isArray(input.staff) ? input.staff : [],
      vehicles: Array.isArray(input.vehicles) ? input.vehicles : [],
      suppliers: Array.isArray(input.suppliers) ? input.suppliers : [],
      milestones: Array.isArray(input.milestones) ? input.milestones : [],
      closedAt: input.closedAt ? String(input.closedAt) : undefined,
      closedBy: input.closedBy ? String(input.closedBy) : undefined,
      closureSummary: input.closureSummary ? String(input.closureSummary) : undefined,
      closureChecklistComplete: Boolean(input.closureChecklistComplete),
      createdAt: String(input.createdAt || nowIsoString().slice(0, 10)),
    } as DemoState['funeralCases'][number];

    updateDemoState((current) => ({
      ...current,
      funeralCases: [record, ...current.funeralCases],
    }));

    return record as T;
  }

  if (url.pathname === '/api/payments' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const policy = requireEntity(state.policies.find((item) => item.id === String(input.policyId || '')), 'Policy not found');
    const member = state.members.find((item) => item.id === policy.memberId);
    const payment = buildDemoPayment(input, policy, member);

    updateDemoState((current) => ({
      ...current,
      payments: [payment, ...current.payments],
      policies: current.policies.map((item) => {
        if (item.id !== policy.id || payment.status !== 'successful') {
          return item;
        }

        return {
          ...item,
          arrearsAmount: Math.max(0, item.arrearsAmount - payment.amount),
          lastPaymentDate: payment.date,
        };
      }),
    }));

    return payment as T;
  }

  if (url.pathname.startsWith('/api/policies/') && method === 'PATCH') {
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments[2];
    const mode = segments[3];
    const input = (body || {}) as Record<string, unknown>;
    let updated: Policy | null = null;

    updateDemoState((current) => {
      const existing = requireEntity(current.policies.find((policy) => policy.id === id), 'Policy not found');
      const nextStatus = mode === 'status' ? (input.status as Policy['status']) : (input.status as Policy['status'] | undefined);

      if (nextStatus && !canTransitionPolicyStatus(existing, nextStatus)) {
        throw new DemoApiError(`Invalid status transition from ${existing.status} to ${nextStatus}`, 409);
      }

      const policies = current.policies.map((policy) => {
        if (policy.id !== id) {
          return policy;
        }

        updated = mode === 'status'
          ? { ...policy, status: nextStatus || policy.status }
          : { ...policy, ...input } as Policy;

        return updated;
      });

      return {
        ...current,
        policies,
      };
    });

    return requireEntity(updated, 'Policy not found') as T;
  }

  if (url.pathname.startsWith('/api/policies/') && url.pathname.endsWith('/record-payment') && method === 'POST') {
    const id = url.pathname.split('/')[3];
    const policy = requireEntity(state.policies.find((item) => item.id === id), 'Policy not found');
    const member = state.members.find((item) => item.id === policy.memberId);
    const input = (body || {}) as Record<string, unknown>;
    const payment = buildDemoPayment(input, policy, member);

    let updatedPolicy: Policy | null = null;
    updateDemoState((current) => ({
      ...current,
      payments: [payment, ...current.payments],
      policies: current.policies.map((item) => {
        if (item.id !== policy.id) {
          return item;
        }

        const nextArrears = payment.status === 'successful'
          ? Math.max(0, item.arrearsAmount - payment.amount)
          : item.arrearsAmount;
        const nextStatus = payment.status === 'successful' && nextArrears === 0 && (item.status === 'suspended' || item.status === 'lapsed')
          ? 'active'
          : item.status;

        updatedPolicy = {
          ...item,
          arrearsAmount: nextArrears,
          lastPaymentDate: payment.date,
          status: nextStatus,
        };

        return updatedPolicy;
      }),
    }));

    return {
      payment,
      policy: requireEntity(updatedPolicy, 'Policy not found'),
    } as T;
  }

  if (url.pathname === '/api/payments/reconciliation-imports' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const record: ReconciliationImportRecord = {
      id: generateDemoId('rec'),
      parlourId: String(input.parlourId || actor.parlourId || ''),
      fileName: String(input.fileName || `Recon_${Date.now()}.csv`),
      importedBy: String(input.importedBy || actor.name),
      importedAt: new Date().toISOString().slice(0, 10),
      matched: Number(input.matched || 0),
      exceptions: Number(input.exceptions || 0),
      status: (input.status as ReconciliationImportRecord['status']) || 'completed',
    };

    updateDemoState((current) => ({
      ...current,
      reconciliationImports: [record, ...current.reconciliationImports],
    }));

    return record as T;
  }

  if (url.pathname === '/api/payments/billing-events/generate' && method === 'POST') {
    const input = (body || {}) as Record<string, unknown>;
    const parlourId = String(input.parlourId || actor.parlourId || '');
    const created = state.policies.filter((item) => item.parlourId === parlourId && ['active', 'suspended'].includes(item.status)).length;
    return { created } as T;
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