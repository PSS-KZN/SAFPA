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
  parlours: Array<{ id: string; name: string; province: string; tier: string; status: string }>;
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
