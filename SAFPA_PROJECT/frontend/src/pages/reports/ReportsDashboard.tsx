import { useRole } from '../../contexts/RoleContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchNetworkDashboard,
  fetchReportsDashboard,
  type NetworkDashboardData,
  type ReportsDashboardData,
} from '../../services/reportsApi';
import { fetchFuneralCases } from '../../services/funeralCasesApi';
import { fetchDocuments } from '../../services/documentsApi';
import { fetchCommunications } from '../../services/communicationsApi';
import { fetchProducts } from '../../services/productsApi';
import type { Communication, Document, FuneralCase } from '../../types';

const COLORS = ['#e31837', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function formatCurrency(value: number): string {
  return `R${value.toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function humanizeLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

type CsvValue = string | number;

function csvCell(value: CsvValue): string {
  const normalized = String(value ?? '');
  if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function csvRow(values: CsvValue[]): string {
  return values.map(csvCell).join(',');
}

function buildCsvSection(title: string, headers: string[], rows: CsvValue[][]): string[] {
  return [csvRow([title]), csvRow(headers), ...rows.map((row) => csvRow(row)), ''];
}

function triggerCsvDownload(fileName: string, lines: string[]) {
  const csvContent = `data:text/csv;charset=utf-8,${lines.join('\n')}`;
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function KPIGrid({ data }: { data: ReportsDashboardData }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Active Policies</div>
        <div className="text-xl font-semibold">{data.activePolicies.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Premiums Due</div>
        <div className="text-xl font-semibold">{formatCurrency(data.premiumsDue)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Premiums Collected</div>
        <div className="text-xl font-semibold">{formatCurrency(data.premiumsCollected)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Arrears</div>
        <div className="text-xl font-semibold text-red-700">{formatCurrency(data.arrears)}</div>
      </div>
    </div>
  );
}

function CollectionsChart({ monthlyCollections }: { monthlyCollections: Array<{ month: string; collected: number; due: number }> }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">Collections Report</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyCollections}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v) => `R${Number(v).toLocaleString()}`} />
          <Tooltip formatter={(v) => `R${Number(v || 0).toLocaleString()}`} />
          <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
          <Bar dataKey="due" fill="#e2e8f0" name="Due" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PolicyDistributionChart({ policyDistribution }: { policyDistribution: Array<{ name: string; value: number }> }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">Policy Distribution by Product</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={policyDistribution}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, value }) => `${name}: ${Number(value).toLocaleString()}`}
          >
            {policyDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MemberGrowthChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ month: string; members: number }>;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="members" stroke="#e31837" strokeWidth={2} name="New Members" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function FuneralCaseTrendChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ month: string; total: number; open: number; closed: number }>;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="total" fill="#0f766e" name="Total Cases" radius={[4, 4, 0, 0]} />
          <Bar dataKey="open" fill="#f59e0b" name="Open Cases" radius={[4, 4, 0, 0]} />
          <Bar dataKey="closed" fill="#22c55e" name="Closed Cases" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; detail: string; valueClassName?: string }>;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className={`mt-2 text-2xl font-semibold ${item.valueClassName || 'text-slate-900'}`}>{item.value}</div>
          <div className="mt-2 text-sm leading-5 text-slate-500">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

function MonthlyPerformanceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; due: number; collected: number; rate: number; gap: number }>;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2">Period</th>
              <th className="pb-2">Due</th>
              <th className="pb-2">Collected</th>
              <th className="pb-2">Rate</th>
              <th className="pb-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
                <td className="py-3 font-medium">{row.label}</td>
                <td className="py-3">{formatCurrency(row.due)}</td>
                <td className="py-3">{formatCurrency(row.collected)}</td>
                <td className="py-3">{formatPercent(row.rate)}</td>
                <td className="py-3 text-red-700">{formatCurrency(row.gap)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">No monthly performance data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  valueLabel,
  rows,
  emptyLabel,
}: {
  title: string;
  valueLabel: string;
  rows: Array<{ label: string; value: number; share: number }>;
  emptyLabel: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="pb-2">Segment</th>
            <th className="pb-2">{valueLabel}</th>
            <th className="pb-2">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
              <td className="py-3 font-medium capitalize">{row.label}</td>
              <td className="py-3">{row.value.toLocaleString()}</td>
              <td className="py-3">{formatPercent(row.share)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-10 text-center text-slate-400">{emptyLabel}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PolicyLifecyclePanel({ policyLifecycle }: { policyLifecycle: Array<{ status: string; count: number }> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold mb-4">Policy Lifecycle Focus</h3>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={policyLifecycle}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tickFormatter={(value) => humanizeLabel(String(value))} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(value) => humanizeLabel(String(value))} />
              <Bar dataKey="count" fill="#e31837" name="Policies" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Policies</th>
              </tr>
            </thead>
            <tbody>
              {policyLifecycle.map((row) => (
                <tr key={row.status} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-2 capitalize">{humanizeLabel(row.status)}</td>
                  <td className="px-3 py-2 font-medium">{row.count.toLocaleString()}</td>
                </tr>
              ))}
              {policyLifecycle.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-slate-400">No lifecycle policy data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BranchPerformanceTable({
  branchPerformance,
  branchId,
}: {
  branchPerformance: Array<{ branchId: string; branch: string; members: number; collections: number }>;
  branchId?: string;
}) {
  const rows = branchId ? branchPerformance.filter((item) => item.branchId === branchId) : branchPerformance;

  return (
    <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-semibold mb-4">Branch Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="pb-2">Branch</th>
            <th className="pb-2">Members</th>
            <th className="pb-2">Collection Rate</th>
            <th className="pb-2">Performance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((branch) => (
            <tr key={branch.branchId} className="border-b border-slate-100">
              <td className="py-3 font-medium">{branch.branch}</td>
              <td className="py-3">{branch.members.toLocaleString()}</td>
              <td className="py-3">{branch.collections}%</td>
              <td className="py-3">
                <div className="w-32 h-2 bg-slate-200 rounded-full">
                  <div
                    className={`h-full rounded-full ${branch.collections >= 90 ? 'bg-green-500' : branch.collections >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.max(0, Math.min(branch.collections, 100))}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-10 text-center text-slate-400">No branch performance data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OperationsKPIGrid({
  openCases,
  scheduledCases,
  overdueTasks,
  pendingMessages,
}: {
  openCases: number;
  scheduledCases: number;
  overdueTasks: number;
  pendingMessages: number;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Open Cases</div>
        <div className="text-xl font-semibold">{openCases.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Scheduled Services</div>
        <div className="text-xl font-semibold">{scheduledCases.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Overdue Tasks</div>
        <div className="text-xl font-semibold text-amber-700">{overdueTasks.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">Pending Messages</div>
        <div className="text-xl font-semibold text-red-700">{pendingMessages.toLocaleString()}</div>
      </div>
    </div>
  );
}

function NetworkAdminView({ data }: { data: NetworkDashboardData }) {
  const activeParlourRate = data.totalParlours > 0 ? (data.activeParlours / data.totalParlours) * 100 : 0;
  const averageMembersPerParlour = data.totalParlours > 0 ? data.totalMembers / data.totalParlours : 0;
  const averagePoliciesPerParlour = data.totalParlours > 0 ? data.totalPolicies / data.totalParlours : 0;
  const monthlyRows = data.monthlyCollections.map((month) => ({
    label: month.month,
    due: month.due,
    collected: month.collected,
    rate: month.due > 0 ? (month.collected / month.due) * 100 : 0,
    gap: Math.max(month.due - month.collected, 0),
  }));
  const statusTotal = data.policyStatusBreakdown.reduce((sum, row) => sum + row.count, 0);
  const statusRows = data.policyStatusBreakdown.map((row) => ({
    label: humanizeLabel(row.status),
    value: row.count,
    share: statusTotal > 0 ? (row.count / statusTotal) * 100 : 0,
  }));

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total Parlours</div>
          <div className="text-xl font-semibold">{data.totalParlours.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Active Parlours</div>
          <div className="text-xl font-semibold">{data.activeParlours.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Premiums Due (This Month)</div>
          <div className="text-xl font-semibold">{formatCurrency(data.premiumsDueThisMonth)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total Arrears</div>
          <div className="text-xl font-semibold text-red-700">{formatCurrency(data.totalArrears)}</div>
        </div>
      </div>

      <MetricStrip
        items={[
          {
            label: 'Active Parlour Rate',
            value: formatPercent(activeParlourRate),
            detail: 'Share of onboarded parlours currently marked active.',
          },
          {
            label: 'Collection Rate',
            value: formatPercent(data.collectionRate),
            detail: 'Current-month collections against active policy billings.',
          },
          {
            label: 'Avg Members / Parlour',
            value: averageMembersPerParlour.toFixed(1),
            detail: 'Average book size across participating parlours.',
          },
          {
            label: 'Avg Policies / Parlour',
            value: averagePoliciesPerParlour.toFixed(1),
            detail: 'Policy density across the active network footprint.',
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Network Collections Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `R${Number(v || 0).toLocaleString()}`} />
              <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="due" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Policy Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.policyStatusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}>
                {data.policyStatusBreakdown.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <BreakdownTable
          title="Policy Status Detail"
          valueLabel="Policies"
          rows={statusRows}
          emptyLabel="No policy status data available"
        />

        <MonthlyPerformanceTable title="Collections Efficiency by Month" rows={monthlyRows} />

        <MemberGrowthChart title="Member Growth" data={data.memberGrowth} />
        <FuneralCaseTrendChart title="Network Funeral Case Trend" data={data.funeralCaseTrend} />

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="font-semibold mb-4">Parlour Footprint</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2">Parlour</th>
                  <th className="pb-2">Province</th>
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.parlours.map((parlour) => (
                  <tr key={parlour.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 font-medium">{parlour.name}</td>
                    <td className="py-3">{parlour.province}</td>
                    <td className="py-3 capitalize">{parlour.tier}</td>
                    <td className="py-3 capitalize">{parlour.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReportsDashboard() {
  const { currentUser } = useRole();
  const userParlourId = currentUser.parlourId || 'p1';
  const isNetworkRole = currentUser.role === 'safpa_admin';
  const isOperationsRole = currentUser.role === 'operations_coordinator';
  const [data, setData] = useState<ReportsDashboardData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkDashboardData | null>(null);
  const [funeralCases, setFuneralCases] = useState<FuneralCase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productName, setProductName] = useState('');
  const [productOptions, setProductOptions] = useState<string[]>([]);

  useEffect(() => {
    if (isNetworkRole || isOperationsRole) {
      return;
    }

    const loadProducts = async () => {
      try {
        const products = await fetchProducts(userParlourId);
        setProductOptions(products.map((product) => product.name));
      } catch {
        setProductOptions([]);
      }
    };

    void loadProducts();
  }, [isNetworkRole, isOperationsRole, userParlourId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isNetworkRole) {
          const records = await fetchNetworkDashboard();
          setNetworkData(records);
          setData(null);
        } else {
          const reportsRequest = fetchReportsDashboard(
            userParlourId,
            {
              branchId: currentUser.role === 'branch_manager' || currentUser.role === 'operations_coordinator' ? currentUser.branchId : undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              productName: isOperationsRole ? undefined : productName || undefined,
            }
          );

          const operationsRequests = isOperationsRole
            ? Promise.all([
                fetchFuneralCases(userParlourId),
                fetchDocuments({ parlourId: userParlourId, entityType: 'funeral_case' }),
                fetchCommunications(userParlourId),
              ])
            : Promise.resolve<[FuneralCase[], Document[], Communication[]]>([[], [], []]);

          const [records, operationsData] = await Promise.all([reportsRequest, operationsRequests]);
          setData(records);
          setNetworkData(null);

          if (isOperationsRole) {
            const [caseRecords, documentRecords, communicationRecords] = operationsData;
            const scopedCases = currentUser.branchId
              ? caseRecords.filter((item) => item.branchId === currentUser.branchId)
              : caseRecords;

            setFuneralCases(scopedCases);
            setDocuments(documentRecords);
            setCommunications(communicationRecords);
          } else {
            setFuneralCases([]);
            setDocuments([]);
            setCommunications([]);
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isNetworkRole, isOperationsRole, userParlourId, currentUser.role, currentUser.branchId, startDate, endDate, productName]);

  const collectionsReport = data?.monthlyCollections || [];
  const memberGrowth = data?.memberGrowth || [];
  const funeralCaseTrend = data?.funeralCaseTrend || [];

  const collectionRate = useMemo(
    () => (data && data.premiumsDue > 0 ? (data.premiumsCollected / data.premiumsDue) * 100 : 0),
    [data],
  );

  const arrearsRatio = useMemo(
    () => (data && data.premiumsDue > 0 ? (data.arrears / data.premiumsDue) * 100 : 0),
    [data],
  );

  const averagePremiumPerPolicy = useMemo(
    () => (data && data.totalPolicies > 0 ? data.premiumsDue / data.totalPolicies : 0),
    [data],
  );

  const averagePoliciesPerMember = useMemo(
    () => (data && data.totalMembers > 0 ? data.totalPolicies / data.totalMembers : 0),
    [data],
  );

  const monthlyPerformanceRows = useMemo(
    () => collectionsReport.map((row) => ({
      label: row.month,
      due: row.due,
      collected: row.collected,
      rate: row.due > 0 ? (row.collected / row.due) * 100 : 0,
      gap: Math.max(row.due - row.collected, 0),
    })),
    [collectionsReport],
  );

  const lifecycleRows = useMemo(() => {
    if (!data) {
      return [];
    }

    const total = data.policyLifecycle.reduce((sum, row) => sum + row.count, 0);
    return data.policyLifecycle.map((row) => ({
      label: humanizeLabel(row.status),
      value: row.count,
      share: total > 0 ? (row.count / total) * 100 : 0,
    }));
  }, [data]);

  const productRows = useMemo(() => {
    if (!data) {
      return [];
    }

    const total = data.policyDistribution.reduce((sum, row) => sum + row.value, 0);
    return data.policyDistribution
      .slice()
      .sort((left, right) => right.value - left.value)
      .map((row) => ({
        label: row.name,
        value: row.value,
        share: total > 0 ? (row.value / total) * 100 : 0,
      }));
  }, [data]);

  const branchBenchmarks = useMemo(() => {
    if (!data) {
      return null;
    }

    const ranked = [...data.branchPerformance].sort((left, right) => right.collections - left.collections);
    const currentBranch = currentUser.branchId ? ranked.find((item) => item.branchId === currentUser.branchId) : undefined;
    const branchRank = currentBranch ? ranked.findIndex((item) => item.branchId === currentBranch.branchId) + 1 : undefined;
    const bestBranch = ranked[0];

    return {
      branchCount: data.branchPerformance.length,
      currentBranch,
      branchRank,
      bestBranch,
      averageCollectionRate: data.branchPerformance.length > 0
        ? data.branchPerformance.reduce((sum, item) => sum + item.collections, 0) / data.branchPerformance.length
        : 0,
    };
  }, [data, currentUser.branchId]);

  const scheduledCases = useMemo(
    () => funeralCases.filter((item) => item.status === 'scheduled').length,
    [funeralCases],
  );

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return funeralCases.flatMap((item) => item.tasks)
      .filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now).length;
  }, [funeralCases]);

  const pendingMessages = useMemo(
    () => communications.filter((item) => item.status === 'pending' || item.status === 'failed').length,
    [communications],
  );

  const caseStatusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of funeralCases) {
      counts.set(item.status, (counts.get(item.status) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [funeralCases]);

  const caseStatusRows = useMemo(() => {
    const total = caseStatusBreakdown.reduce((sum, row) => sum + row.count, 0);
    return caseStatusBreakdown.map((row) => ({
      label: humanizeLabel(row.status),
      value: row.count,
      share: total > 0 ? (row.count / total) * 100 : 0,
    }));
  }, [caseStatusBreakdown]);

  const documentCoverage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of documents) {
      counts.set(item.type, (counts.get(item.type) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [documents]);

  const documentCoverageRows = useMemo(() => {
    const total = documentCoverage.reduce((sum, row) => sum + row.count, 0);
    return documentCoverage.map((row) => ({
      label: humanizeLabel(row.type),
      value: row.count,
      share: total > 0 ? (row.count / total) * 100 : 0,
    }));
  }, [documentCoverage]);

  const operationsHealth = useMemo(() => {
    const totalTasks = funeralCases.reduce((sum, item) => sum + item.tasks.length, 0);
    const completedTasks = funeralCases.reduce((sum, item) => sum + item.tasks.filter((task) => task.completed).length, 0);
    const closedCases = funeralCases.filter((item) => item.status === 'completed' || item.status === 'archived').length;
    const successfulCommunications = communications.filter((item) => item.status === 'sent' || item.status === 'delivered').length;

    return {
      taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      caseClosureRate: funeralCases.length > 0 ? (closedCases / funeralCases.length) * 100 : 0,
      documentsPerCase: funeralCases.length > 0 ? documents.length / funeralCases.length : 0,
      communicationDeliveryRate: communications.length > 0 ? (successfulCommunications / communications.length) * 100 : 0,
    };
  }, [communications, documents.length, funeralCases]);

  const downloadCurrentReport = () => {
    const generatedAt = new Date().toISOString();
    const fileName = `${currentUser.role}-analytics-${generatedAt.slice(0, 10)}.csv`;

    if (isNetworkRole && networkData) {
      const lines = [
        ...buildCsvSection('Report Context', ['Field', 'Value'], [
          ['Role', currentUser.role],
          ['Scope', 'Network'],
          ['Generated At', generatedAt],
        ]),
        ...buildCsvSection('Network Summary', ['Metric', 'Value'], [
          ['Total Parlours', networkData.totalParlours],
          ['Active Parlours', networkData.activeParlours],
          ['Total Members', networkData.totalMembers],
          ['Total Policies', networkData.totalPolicies],
          ['Active Policies', networkData.activePolicies],
          ['Premiums Due This Month', networkData.premiumsDueThisMonth],
          ['Premiums Collected This Month', networkData.premiumsCollectedThisMonth],
          ['Total Arrears', networkData.totalArrears],
          ['Open Funeral Cases', networkData.openFuneralCases],
          ['Collection Rate', formatPercent(networkData.collectionRate)],
        ]),
        ...buildCsvSection('Monthly Collections', ['Month', 'Due', 'Collected', 'Rate', 'Gap'], networkData.monthlyCollections.map((row) => [
          row.month,
          row.due,
          row.collected,
          formatPercent(row.due > 0 ? (row.collected / row.due) * 100 : 0),
          Math.max(row.due - row.collected, 0),
        ])),
        ...buildCsvSection('Policy Status Breakdown', ['Status', 'Policies'], networkData.policyStatusBreakdown.map((row) => [humanizeLabel(row.status), row.count])),
        ...buildCsvSection('Member Growth', ['Month', 'New Members'], networkData.memberGrowth.map((row) => [row.month, row.members])),
        ...buildCsvSection('Funeral Case Trend', ['Month', 'Total Cases', 'Open Cases', 'Closed Cases'], networkData.funeralCaseTrend.map((row) => [row.month, row.total, row.open, row.closed])),
        ...buildCsvSection('Parlour Footprint', ['Parlour', 'Province', 'Tier', 'Status'], networkData.parlours.map((row) => [row.name, row.province, row.tier, row.status])),
      ];
      triggerCsvDownload(fileName, lines);
      return;
    }

    if (!data) {
      return;
    }

    const contextSection = buildCsvSection('Report Context', ['Field', 'Value'], [
      ['Role', currentUser.role],
      ['Parlour', userParlourId],
      ['Branch', currentUser.branchId || 'all'],
      ['Start Date', startDate || 'all'],
      ['End Date', endDate || 'all'],
      ['Product Filter', productName || 'all'],
      ['Generated At', generatedAt],
    ]);

    const summarySection = buildCsvSection('Summary', ['Metric', 'Value'], [
      ['Total Members', data.totalMembers],
      ['Total Policies', data.totalPolicies],
      ['Active Policies', data.activePolicies],
      ['Premiums Due', data.premiumsDue],
      ['Premiums Collected', data.premiumsCollected],
      ['Arrears', data.arrears],
      ['Open Funeral Cases', data.openFuneralCases],
    ]);

    const monthlySection = buildCsvSection('Monthly Collections', ['Month', 'Due', 'Collected', 'Rate', 'Gap'], monthlyPerformanceRows.map((row) => [
      row.label,
      row.due,
      row.collected,
      formatPercent(row.rate),
      row.gap,
    ]));

    const lifecycleSection = buildCsvSection('Policy Lifecycle', ['Status', 'Policies', 'Share'], lifecycleRows.map((row) => [row.label, row.value, formatPercent(row.share)]));
    const productSection = buildCsvSection('Product Mix', ['Product', 'Policies', 'Share'], productRows.map((row) => [row.label, row.value, formatPercent(row.share)]));
    const memberGrowthSection = buildCsvSection('Member Growth', ['Month', 'New Members'], memberGrowth.map((row) => [row.month, row.members]));
    const funeralTrendSection = buildCsvSection('Funeral Case Trend', ['Month', 'Total Cases', 'Open Cases', 'Closed Cases'], funeralCaseTrend.map((row) => [row.month, row.total, row.open, row.closed]));
    const branchSection = buildCsvSection('Branch Performance', ['Branch', 'Members', 'Collection Rate'], data.branchPerformance.map((row) => [row.branch, row.members, `${row.collections}%`]));

    let lines = [...contextSection, ...summarySection];

    if (currentUser.role === 'parlour_owner' || currentUser.role === 'branch_manager') {
      lines = [
        ...lines,
        ...buildCsvSection('Portfolio Metrics', ['Metric', 'Value'], [
          ['Collection Rate', formatPercent(collectionRate)],
          ['Arrears Burden', formatPercent(arrearsRatio)],
          ['Average Premium per Policy', formatCurrency(averagePremiumPerPolicy)],
          ['Average Policies per Member', averagePoliciesPerMember.toFixed(2)],
        ]),
        ...monthlySection,
        ...productSection,
        ...lifecycleSection,
        ...memberGrowthSection,
        ...funeralTrendSection,
        ...branchSection,
      ];
    } else if (currentUser.role === 'policy_admin') {
      lines = [
        ...lines,
        ...buildCsvSection('Policy Admin Metrics', ['Metric', 'Value'], [
          ['Active Policy Ratio', formatPercent(data.totalPolicies > 0 ? (data.activePolicies / data.totalPolicies) * 100 : 0)],
          ['Policies per Member', averagePoliciesPerMember.toFixed(2)],
          ['Lifecycle Risk', formatPercent(lifecycleRows.filter((row) => row.label === 'lapsed' || row.label === 'suspended').reduce((sum, row) => sum + row.share, 0))],
          ['Top Product Concentration', productRows[0] ? formatPercent(productRows[0].share) : formatPercent(0)],
        ]),
        ...lifecycleSection,
        ...productSection,
        ...memberGrowthSection,
        ...monthlySection,
      ];
    } else if (currentUser.role === 'collections_clerk') {
      lines = [
        ...lines,
        ...buildCsvSection('Collections Metrics', ['Metric', 'Value'], [
          ['Collection Rate', formatPercent(collectionRate)],
          ['Shortfall', formatCurrency(Math.max(data.premiumsDue - data.premiumsCollected, 0))],
          ['Arrears per Active Policy', formatCurrency(data.activePolicies > 0 ? data.arrears / data.activePolicies : 0)],
          ['Average Monthly Collected', formatCurrency(monthlyPerformanceRows.length > 0 ? monthlyPerformanceRows.reduce((sum, row) => sum + row.collected, 0) / monthlyPerformanceRows.length : 0)],
        ]),
        ...monthlySection,
        ...lifecycleSection,
      ];
    } else if (currentUser.role === 'operations_coordinator') {
      lines = [
        ...lines,
        ...buildCsvSection('Operations Metrics', ['Metric', 'Value'], [
          ['Scheduled Services', scheduledCases],
          ['Overdue Tasks', overdueTasks],
          ['Pending Messages', pendingMessages],
          ['Task Completion Rate', formatPercent(operationsHealth.taskCompletionRate)],
          ['Case Closure Rate', formatPercent(operationsHealth.caseClosureRate)],
          ['Documents per Case', operationsHealth.documentsPerCase.toFixed(1)],
          ['Message Delivery Rate', formatPercent(operationsHealth.communicationDeliveryRate)],
        ]),
        ...funeralTrendSection,
        ...buildCsvSection('Case Status Detail', ['Status', 'Cases', 'Share'], caseStatusRows.map((row) => [row.label, row.value, formatPercent(row.share)])),
        ...buildCsvSection('Document Type Mix', ['Type', 'Files', 'Share'], documentCoverageRows.map((row) => [row.label, row.value, formatPercent(row.share)])),
        ...monthlySection,
      ];
    }

    triggerCsvDownload(fileName, lines);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isNetworkRole ? 'Network Reports' : isOperationsRole ? 'Operations Analytics' : 'Reports & Analytics'}
        </h1>
        <button
          onClick={downloadCurrentReport}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {!isNetworkRole && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          {isOperationsRole ? (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Scoped to funeral operations activity{currentUser.branchId ? ' for your branch' : ''}
            </div>
          ) : (
            <select value={productName} onChange={(event) => setProductName(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">All products</option>
              {productOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading reports...</div>}

      {isNetworkRole && networkData && <NetworkAdminView data={networkData} />}

      {!isNetworkRole && data && (
        <>
          {(currentUser.role === 'parlour_owner' || currentUser.role === 'branch_manager') && (
            <>
              <KPIGrid data={data} />
              <MetricStrip
                items={[
                  {
                    label: 'Collection Rate',
                    value: formatPercent(collectionRate),
                    detail: 'How much of billed premium value is landing inside the selected window.',
                    valueClassName: collectionRate >= 90 ? 'text-green-700' : collectionRate >= 75 ? 'text-amber-700' : 'text-red-700',
                  },
                  {
                    label: 'Arrears Burden',
                    value: formatPercent(arrearsRatio),
                    detail: 'Arrears exposure against the same book of billed premiums.',
                    valueClassName: arrearsRatio > 35 ? 'text-red-700' : 'text-slate-900',
                  },
                  {
                    label: 'Avg Premium / Policy',
                    value: formatCurrency(averagePremiumPerPolicy),
                    detail: 'Useful for spotting product mix shifts and pricing pressure.',
                  },
                  {
                    label: currentUser.role === 'branch_manager' ? 'Branch Rank' : 'Avg Branch Collection',
                    value: currentUser.role === 'branch_manager'
                      ? `${branchBenchmarks?.branchRank || 0}/${branchBenchmarks?.branchCount || 0}`
                      : formatPercent(branchBenchmarks?.averageCollectionRate || 0),
                    detail: currentUser.role === 'branch_manager'
                      ? `${branchBenchmarks?.bestBranch ? `Top branch is ${branchBenchmarks.bestBranch.branch}` : 'Compare current branch against peer branches.'}`
                      : 'Average collection performance across branch footprint.',
                  },
                ]}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
                <PolicyDistributionChart policyDistribution={data.policyDistribution} />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MemberGrowthChart title="Member Growth" data={memberGrowth} />
                <FuneralCaseTrendChart title="Funeral Case Trend" data={funeralCaseTrend} />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MonthlyPerformanceTable title="Collections Efficiency by Month" rows={monthlyPerformanceRows} />
                <BreakdownTable title="Product Mix Detail" valueLabel="Policies" rows={productRows} emptyLabel="No product distribution data available" />
              </div>
              <div className="mt-6">
                <PolicyLifecyclePanel policyLifecycle={data.policyLifecycle} />
              </div>
              <BranchPerformanceTable branchPerformance={data.branchPerformance} branchId={currentUser.role === 'branch_manager' ? currentUser.branchId : undefined} />
            </>
          )}

          {currentUser.role === 'policy_admin' && (
            <>
              <KPIGrid data={data} />
              <MetricStrip
                items={[
                  {
                    label: 'Active Policy Ratio',
                    value: formatPercent(data.totalPolicies > 0 ? (data.activePolicies / data.totalPolicies) * 100 : 0),
                    detail: 'Share of the policy book currently active and billable.',
                  },
                  {
                    label: 'Policies / Member',
                    value: averagePoliciesPerMember.toFixed(2),
                    detail: 'Signals cross-sell density and duplicate cover patterns.',
                  },
                  {
                    label: 'Lifecycle Risk',
                    value: formatPercent(lifecycleRows.filter((row) => row.label === 'lapsed' || row.label === 'suspended').reduce((sum, row) => sum + row.share, 0)),
                    detail: 'Combined suspended and lapsed exposure in the filtered book.',
                    valueClassName: 'text-amber-700',
                  },
                  {
                    label: 'Top Product Concentration',
                    value: productRows[0] ? formatPercent(productRows[0].share) : formatPercent(0),
                    detail: productRows[0] ? `${productRows[0].label} currently leads the policy mix.` : 'No product concentration data available.',
                  },
                ]}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PolicyDistributionChart policyDistribution={data.policyDistribution} />
                <MemberGrowthChart title="Member Growth" data={memberGrowth} />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
                <BreakdownTable title="Policy Lifecycle Detail" valueLabel="Policies" rows={lifecycleRows} emptyLabel="No lifecycle policy data available" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BreakdownTable title="Product Concentration" valueLabel="Policies" rows={productRows} emptyLabel="No product distribution data available" />
                <MonthlyPerformanceTable title="Collections Efficiency by Month" rows={monthlyPerformanceRows} />
              </div>
              <div className="mt-6">
                <PolicyLifecyclePanel policyLifecycle={data.policyLifecycle} />
              </div>
            </>
          )}

          {currentUser.role === 'collections_clerk' && (
            <>
              <KPIGrid data={data} />
              <MetricStrip
                items={[
                  {
                    label: 'Collection Rate',
                    value: formatPercent(collectionRate),
                    detail: 'Recovered value against billed premiums in the current view.',
                    valueClassName: collectionRate >= 90 ? 'text-green-700' : collectionRate >= 75 ? 'text-amber-700' : 'text-red-700',
                  },
                  {
                    label: 'Shortfall',
                    value: formatCurrency(Math.max(data.premiumsDue - data.premiumsCollected, 0)),
                    detail: 'Immediate follow-up gap for collections and retry activity.',
                    valueClassName: 'text-red-700',
                  },
                  {
                    label: 'Arrears / Active Policy',
                    value: formatCurrency(data.activePolicies > 0 ? data.arrears / data.activePolicies : 0),
                    detail: 'Average arrears burden sitting on each active policy.',
                  },
                  {
                    label: 'Avg Month Collected',
                    value: formatCurrency(monthlyPerformanceRows.length > 0 ? monthlyPerformanceRows.reduce((sum, row) => sum + row.collected, 0) / monthlyPerformanceRows.length : 0),
                    detail: 'Average monthly cash collected over the current report history.',
                  },
                ]}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Collections Snapshot</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Premiums Due</span><span className="font-medium">{formatCurrency(data.premiumsDue)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Premiums Collected</span><span className="font-medium">{formatCurrency(data.premiumsCollected)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Outstanding Arrears</span><span className="font-medium text-red-700">{formatCurrency(data.arrears)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Active Policies</span><span className="font-medium">{data.activePolicies.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MonthlyPerformanceTable title="Collections Efficiency by Month" rows={monthlyPerformanceRows} />
                <BreakdownTable title="Policy Lifecycle Risk Mix" valueLabel="Policies" rows={lifecycleRows} emptyLabel="No lifecycle policy data available" />
              </div>
            </>
          )}

          {currentUser.role === 'operations_coordinator' && (
            <>
              <OperationsKPIGrid
                openCases={data.openFuneralCases}
                scheduledCases={scheduledCases}
                overdueTasks={overdueTasks}
                pendingMessages={pendingMessages}
              />
              <MetricStrip
                items={[
                  {
                    label: 'Task Completion Rate',
                    value: formatPercent(operationsHealth.taskCompletionRate),
                    detail: 'Completed tasks across the current funeral case workload.',
                    valueClassName: operationsHealth.taskCompletionRate >= 75 ? 'text-green-700' : 'text-amber-700',
                  },
                  {
                    label: 'Case Closure Rate',
                    value: formatPercent(operationsHealth.caseClosureRate),
                    detail: 'Share of cases that have been completed or archived.',
                  },
                  {
                    label: 'Documents / Case',
                    value: operationsHealth.documentsPerCase.toFixed(1),
                    detail: 'Documentation density for operational case handling.',
                  },
                  {
                    label: 'Message Delivery Rate',
                    value: formatPercent(operationsHealth.communicationDeliveryRate),
                    detail: 'Sent or delivered communications as a share of all case messaging.',
                  },
                ]}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FuneralCaseTrendChart title="Funeral Case Trend" data={funeralCaseTrend} />

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Case Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={caseStatusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}>
                        {caseStatusBreakdown.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <BreakdownTable title="Case Status Detail" valueLabel="Cases" rows={caseStatusRows} emptyLabel="No funeral case status data available" />

                <BreakdownTable title="Document Type Mix" valueLabel="Files" rows={documentCoverageRows} emptyLabel="No funeral document data available" />

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Operational Snapshot</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Open cases</span><span className="font-medium">{data.openFuneralCases.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Scheduled services</span><span className="font-medium">{scheduledCases.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Overdue tasks</span><span className="font-medium text-amber-700">{overdueTasks.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Funeral documents</span><span className="font-medium">{documents.length.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Pending communications</span><span className="font-medium text-red-700">{pendingMessages.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Document Coverage</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={documentCoverage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tickFormatter={(value) => String(value).replace(/_/g, ' ')} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(value) => String(value).replace(/_/g, ' ')} />
                      <Bar dataKey="count" fill="#e31837" name="Documents" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <MonthlyPerformanceTable title="Revenue Pressure vs Case Load" rows={monthlyPerformanceRows} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

