import { auditLog } from '../data/auditLog';
import { branches } from '../data/branches';
import { communicationTemplates } from '../data/communicationTemplates';
import { communications } from '../data/communications';
import { documents } from '../data/documents';
import { funeralCases } from '../data/funeralCases';
import { leads } from '../data/leads';
import { members } from '../data/members';
import { parlours } from '../data/parlours';
import { payments } from '../data/payments';
import { policies, products } from '../data/policies';
import { resources } from '../data/resources';
import { users } from '../data/users';
import type {
  AuditEntry,
  Branch,
  Communication,
  CommunicationTemplate,
  Document,
  FuneralCase,
  Lead,
  Member,
  Parlour,
  ParlourSubscription,
  PaymentTransaction,
  Policy,
  Product,
  Resource,
  SubscriptionPlan,
  User,
} from '../types';
import type { ReconciliationImportRecord } from '../services/paymentsApi';

export interface DemoAdoptionRecord {
  onboardingStatus: string;
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
  moduleActivity: Array<{ module: string; count: number }>;
}

export interface DemoState {
  users: User[];
  parlours: Parlour[];
  branches: Branch[];
  members: Member[];
  products: Product[];
  policies: Policy[];
  payments: PaymentTransaction[];
  reconciliationImports: ReconciliationImportRecord[];
  leads: Lead[];
  funeralCases: FuneralCase[];
  documents: Document[];
  communications: Communication[];
  communicationTemplates: CommunicationTemplate[];
  resources: Resource[];
  auditEntries: AuditEntry[];
  subscriptionPlans: SubscriptionPlan[];
  parlourSubscriptions: ParlourSubscription[];
  adoptionByParlourId: Record<string, DemoAdoptionRecord>;
}

const DEMO_STORE_KEY = 'safpa_frontend_demo_store_v1';

const subscriptionPlansSeed: SubscriptionPlan[] = [
  {
    id: 'plan_basic',
    tier: 'basic',
    name: 'Basic',
    amount: 499,
    description: 'Entry-level operating plan for smaller parlours.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_standard',
    tier: 'standard',
    name: 'Standard',
    amount: 899,
    description: 'Balanced plan for growing parlour groups.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan_premium',
    tier: 'premium',
    name: 'Premium',
    amount: 1499,
    description: 'Full feature set for larger or multi-branch parlours.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const parlourSubscriptionsSeed: ParlourSubscription[] = [
  {
    id: 'ps1',
    parlourId: 'p1',
    parlourName: 'Ubuntu Burial Services',
    tier: 'premium',
    status: 'active',
    billingCycle: 'monthly',
    amount: 1499,
    startDate: '2026-01-01',
    endDate: null,
    autoRenew: true,
    notes: 'Legacy showcase tenant.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'ps2',
    parlourId: 'p2',
    parlourName: 'Dignity Funerals',
    tier: 'standard',
    status: 'active',
    billingCycle: 'monthly',
    amount: 899,
    startDate: '2026-01-15',
    endDate: null,
    autoRenew: true,
    notes: null,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'ps3',
    parlourId: 'p3',
    parlourName: 'Peaceful Homes KoMkhulu',
    tier: 'basic',
    status: 'paused',
    billingCycle: 'monthly',
    amount: 499,
    startDate: '2026-02-01',
    endDate: null,
    autoRenew: false,
    notes: 'Follow-up required before reactivation.',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  },
];

const reconciliationImportsSeed: ReconciliationImportRecord[] = [
  {
    id: 'rec1',
    parlourId: 'p1',
    fileName: 'Ubuntu_April_2026.csv',
    importedBy: 'Mpho Tau',
    importedAt: '2026-04-20',
    matched: 142,
    exceptions: 3,
    status: 'completed',
  },
  {
    id: 'rec2',
    parlourId: 'p1',
    fileName: 'Ubuntu_March_2026.csv',
    importedBy: 'Mpho Tau',
    importedAt: '2026-03-21',
    matched: 138,
    exceptions: 5,
    status: 'completed',
  },
  {
    id: 'rec3',
    parlourId: 'p2',
    fileName: 'Dignity_April_2026.csv',
    importedBy: 'Zanele Mkhize',
    importedAt: '2026-04-19',
    matched: 96,
    exceptions: 2,
    status: 'completed',
  },
];

const adoptionSeed: Record<string, DemoAdoptionRecord> = {
  p1: {
    onboardingStatus: 'live',
    goLiveAt: '2026-01-08T09:00:00.000Z',
    firstActiveAt: '2026-01-09T08:30:00.000Z',
    lastActiveAt: '2026-04-21T09:14:32.000Z',
    activeUsers7d: 6,
    activeUsers30d: 8,
    events7d: 41,
    events30d: 167,
    healthScore: 92,
    healthStatus: 'green',
    isDormant: false,
    isAtRisk: false,
    moduleActivity: [
      { module: 'policies', count: 58 },
      { module: 'payments', count: 42 },
      { module: 'documents', count: 16 },
      { module: 'cases', count: 12 },
    ],
  },
  p2: {
    onboardingStatus: 'live',
    goLiveAt: '2026-01-20T09:00:00.000Z',
    firstActiveAt: '2026-01-22T10:15:00.000Z',
    lastActiveAt: '2026-04-20T11:05:22.000Z',
    activeUsers7d: 4,
    activeUsers30d: 5,
    events7d: 23,
    events30d: 96,
    healthScore: 78,
    healthStatus: 'green',
    isDormant: false,
    isAtRisk: false,
    moduleActivity: [
      { module: 'members', count: 20 },
      { module: 'documents', count: 14 },
      { module: 'cases', count: 9 },
    ],
  },
  p3: {
    onboardingStatus: 'stalled',
    goLiveAt: null,
    firstActiveAt: '2026-03-12T08:00:00.000Z',
    lastActiveAt: '2026-03-15T12:00:00.000Z',
    activeUsers7d: 0,
    activeUsers30d: 1,
    events7d: 0,
    events30d: 4,
    healthScore: 41,
    healthStatus: 'red',
    isDormant: true,
    isAtRisk: true,
    moduleActivity: [
      { module: 'payments', count: 2 },
      { module: 'members', count: 2 },
    ],
  },
  p4: {
    onboardingStatus: 'onboarding',
    goLiveAt: null,
    firstActiveAt: null,
    lastActiveAt: null,
    activeUsers7d: 0,
    activeUsers30d: 0,
    events7d: 0,
    events30d: 0,
    healthScore: 58,
    healthStatus: 'amber',
    isDormant: false,
    isAtRisk: false,
    moduleActivity: [],
  },
  p5: {
    onboardingStatus: 'configured',
    goLiveAt: null,
    firstActiveAt: null,
    lastActiveAt: null,
    activeUsers7d: 0,
    activeUsers30d: 0,
    events7d: 0,
    events30d: 0,
    healthScore: 64,
    healthStatus: 'amber',
    isDormant: false,
    isAtRisk: false,
    moduleActivity: [],
  },
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSeedDemoState(): DemoState {
  return {
    users: cloneValue(users),
    parlours: cloneValue(parlours),
    branches: cloneValue(branches),
    members: cloneValue(members),
    products: cloneValue(products),
    policies: cloneValue(policies),
    payments: cloneValue(payments),
    reconciliationImports: cloneValue(reconciliationImportsSeed),
    leads: cloneValue(leads),
    funeralCases: cloneValue(funeralCases),
    documents: cloneValue(documents),
    communications: cloneValue(communications),
    communicationTemplates: cloneValue(communicationTemplates),
    resources: cloneValue(resources),
    auditEntries: cloneValue(auditLog),
    subscriptionPlans: cloneValue(subscriptionPlansSeed),
    parlourSubscriptions: cloneValue(parlourSubscriptionsSeed),
    adoptionByParlourId: cloneValue(adoptionSeed),
  };
}

function normalizeStoredState(stored: unknown): DemoState | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return null;
  }

  const seed = createSeedDemoState();
  const candidate = stored as Partial<DemoState>;

  return {
    ...seed,
    ...candidate,
    users: Array.isArray(candidate.users) ? candidate.users : seed.users,
    parlours: Array.isArray(candidate.parlours) ? candidate.parlours : seed.parlours,
    branches: Array.isArray(candidate.branches) ? candidate.branches : seed.branches,
    members: Array.isArray(candidate.members) ? candidate.members : seed.members,
    products: Array.isArray(candidate.products) ? candidate.products : seed.products,
    policies: Array.isArray(candidate.policies) ? candidate.policies : seed.policies,
    payments: Array.isArray(candidate.payments) ? candidate.payments : seed.payments,
    reconciliationImports: Array.isArray(candidate.reconciliationImports) ? candidate.reconciliationImports : seed.reconciliationImports,
    leads: Array.isArray(candidate.leads) ? candidate.leads : seed.leads,
    funeralCases: Array.isArray(candidate.funeralCases) ? candidate.funeralCases : seed.funeralCases,
    documents: Array.isArray(candidate.documents) ? candidate.documents : seed.documents,
    communications: Array.isArray(candidate.communications) ? candidate.communications : seed.communications,
    communicationTemplates: Array.isArray(candidate.communicationTemplates) ? candidate.communicationTemplates : seed.communicationTemplates,
    resources: Array.isArray(candidate.resources) ? candidate.resources : seed.resources,
    auditEntries: Array.isArray(candidate.auditEntries) ? candidate.auditEntries : seed.auditEntries,
    subscriptionPlans: Array.isArray(candidate.subscriptionPlans) ? candidate.subscriptionPlans : seed.subscriptionPlans,
    parlourSubscriptions: Array.isArray(candidate.parlourSubscriptions) ? candidate.parlourSubscriptions : seed.parlourSubscriptions,
    adoptionByParlourId: candidate.adoptionByParlourId && typeof candidate.adoptionByParlourId === 'object' && !Array.isArray(candidate.adoptionByParlourId)
      ? { ...seed.adoptionByParlourId, ...candidate.adoptionByParlourId }
      : seed.adoptionByParlourId,
  };
}

function readStoredState(): DemoState | null {
  try {
    const raw = window.sessionStorage.getItem(DEMO_STORE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeStoredState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredState(state: DemoState) {
  window.sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(state));
}

export function getDemoState(): DemoState {
  const stored = readStoredState();
  if (stored) {
    return stored;
  }

  const seeded = createSeedDemoState();
  writeStoredState(seeded);
  return seeded;
}

export function updateDemoState(updater: (state: DemoState) => DemoState): DemoState {
  const nextState = updater(getDemoState());
  writeStoredState(nextState);
  return nextState;
}

export function resetDemoState(): DemoState {
  const seeded = createSeedDemoState();
  writeStoredState(seeded);
  return seeded;
}

export function generateDemoId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nowIsoString(): string {
  return new Date().toISOString();
}