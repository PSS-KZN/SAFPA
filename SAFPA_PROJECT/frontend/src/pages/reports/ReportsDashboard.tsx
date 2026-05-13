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

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="font-semibold mb-4">Member Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke="#e31837" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
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
  const memberGrowth = useMemo(() => {
    if (!data) {
      return [];
    }

    const months = data.monthlyCollections;
    if (months.length === 0) {
      return [];
    }

    const estimatedBase = Math.max(0, data.totalMembers - months.length * 20);
    let runningTotal = estimatedBase;
    return months.map((month) => {
      const next = Math.max(5, Math.round((month.collected / Math.max(month.due, 1)) * 25));
      runningTotal += next;
      return { month: month.month, new: next, total: runningTotal };
    });
  }, [data]);

  const funeralVolume = useMemo(() => {
    if (!data) {
      return [];
    }

    const months = data.monthlyCollections;
    if (months.length === 0) {
      return [];
    }

    return months.map((month) => {
      const pressure = Math.max(month.due - month.collected, 0);
      const cases = Math.max(1, Math.round(pressure / 10000));
      return { month: month.month, cases };
    });
  }, [data]);

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

  const documentCoverage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of documents) {
      counts.set(item.type, (counts.get(item.type) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [documents]);

  const exportCSV = (name: string, reportRows: Array<{ month: string; collected: number; due: number }>) => {
    const csvContent = 'data:text/csv;charset=utf-8,Month,Collected,Due\n'
      + reportRows.map((r) => `${r.month},${r.collected},${r.due}`).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isNetworkRole ? 'Network Reports' : isOperationsRole ? 'Operations Analytics' : 'Reports & Analytics'}
        </h1>
        <button
          onClick={() => exportCSV('collections-report', isNetworkRole ? (networkData?.monthlyCollections || []) : collectionsReport)}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
                <PolicyDistributionChart policyDistribution={data.policyDistribution} />
              </div>
              <BranchPerformanceTable branchPerformance={data.branchPerformance} branchId={currentUser.role === 'branch_manager' ? currentUser.branchId : undefined} />
            </>
          )}

          {currentUser.role === 'policy_admin' && (
            <>
              <KPIGrid data={data} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PolicyDistributionChart policyDistribution={data.policyDistribution} />
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
              </div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold mb-4">Policy Lifecycle Focus</h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.policyLifecycle}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
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
                        {data.policyLifecycle.map((row) => (
                          <tr key={row.status} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-3 py-2 capitalize">{row.status.replace(/_/g, ' ')}</td>
                            <td className="px-3 py-2 font-medium">{row.count.toLocaleString()}</td>
                          </tr>
                        ))}
                        {data.policyLifecycle.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-8 text-center text-slate-400">No lifecycle policy data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentUser.role === 'collections_clerk' && (
            <>
              <KPIGrid data={data} />
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Funeral Cases Volume</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={funeralVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="cases" fill="#0f766e" name="Cases" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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
              </div>
            </>
          )}

          {currentUser.role === 'reporting_analyst' && (
            <>
              <KPIGrid data={data} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CollectionsChart monthlyCollections={data.monthlyCollections} />
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Member Growth (Estimated)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={memberGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#e31837" strokeWidth={2} name="Total Members" />
                      <Line type="monotone" dataKey="new" stroke="#22c55e" strokeWidth={2} name="New Members" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-semibold mb-4">Funeral Cases Volume (Estimated)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={funeralVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cases" fill="#8b5cf6" name="Cases" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <PolicyDistributionChart policyDistribution={data.policyDistribution} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

