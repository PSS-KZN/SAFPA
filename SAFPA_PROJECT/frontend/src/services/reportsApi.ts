import { request } from './http';

export interface ReportsDashboardData {
  totalMembers: number;
  totalPolicies: number;
  activePolicies: number;
  premiumsDue: number;
  premiumsCollected: number;
  arrears: number;
  openFuneralCases: number;
  monthlyCollections: Array<{ month: string; collected: number; due: number }>;
  branchPerformance: Array<{ branchId: string; branch: string; members: number; collections: number }>;
  policyDistribution: Array<{ name: string; value: number }>;
  policyLifecycle: Array<{ status: string; count: number }>;
  memberGrowth: Array<{ month: string; members: number }>;
  funeralCaseTrend: Array<{ month: string; total: number; open: number; closed: number }>;
}

export interface ReportsFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  productName?: string;
}

export interface NetworkDashboardData {
  totalParlours: number;
  activeParlours: number;
  totalMembers: number;
  totalPolicies: number;
  activePolicies: number;
  premiumsDueThisMonth: number;
  premiumsCollectedThisMonth: number;
  totalArrears: number;
  openFuneralCases: number;
  collectionRate: number;
  monthlyCollections: Array<{ month: string; collected: number; due: number }>;
  policyStatusBreakdown: Array<{ status: string; count: number }>;
  memberGrowth: Array<{ month: string; members: number }>;
  funeralCaseTrend: Array<{ month: string; total: number; open: number; closed: number }>;
  parlours: Array<{ id: string; name: string; province: string; tier: string; status: string }>;
}

export interface AdoptionOverviewParlour {
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

export interface AdoptionOverviewData {
  totalParlours: number;
  liveParlours: number;
  activeParlours7d: number;
  activeParlours30d: number;
  dormantParlours: number;
  atRiskParlours: number;
  parlours: AdoptionOverviewParlour[];
}

export interface ParlourAdoptionDetail extends AdoptionOverviewParlour {
  daysSinceLastActivity: number | null;
  moduleActivity: Array<{ module: string; count: number }>;
  recentEvents: Array<{
    id: string;
    occurredOn: string;
    module: string;
    eventType: string;
    userName: string | null;
    userRole: string | null;
    details: string | null;
    entityType: string | null;
    entityId: string | null;
  }>;
}

export function fetchReportsDashboard(parlourId: string, filters?: ReportsFilters): Promise<ReportsDashboardData> {
  const params = new URLSearchParams({ parlourId });
  if (filters?.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters?.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    params.set('endDate', filters.endDate);
  }
  if (filters?.productName) {
    params.set('productName', filters.productName);
  }
  return request<ReportsDashboardData>(`/api/reports/dashboard?${params.toString()}`);
}

export function fetchNetworkDashboard(): Promise<NetworkDashboardData> {
  return request<NetworkDashboardData>('/api/reports/network');
}

export function fetchAdoptionOverview(): Promise<AdoptionOverviewData> {
  return request<AdoptionOverviewData>('/api/reports/adoption/overview');
}

export function fetchParlourAdoptionDetail(parlourId: string): Promise<ParlourAdoptionDetail> {
  return request<ParlourAdoptionDetail>(`/api/reports/adoption/parlours/${parlourId}`);
}
