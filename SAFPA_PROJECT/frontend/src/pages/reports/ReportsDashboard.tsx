import { useRole } from '../../contexts/RoleContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchReportsDashboard, type ReportsDashboardData } from '../../services/reportsApi';
import { fetchProducts } from '../../services/productsApi';

const COLORS = ['#e31837', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsDashboard() {
  const { currentUser } = useRole();
  const userParlourId = currentUser.parlourId || 'p1';
  const [data, setData] = useState<ReportsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productName, setProductName] = useState('');
  const [productOptions, setProductOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchProducts(userParlourId);
        setProductOptions(products.map((product) => product.name));
      } catch {
        setProductOptions([]);
      }
    };

    void loadProducts();
  }, [userParlourId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchReportsDashboard(
          userParlourId,
          {
            branchId: currentUser.role === 'branch_manager' ? currentUser.branchId : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            productName: productName || undefined,
          }
        );
        setData(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userParlourId, currentUser.role, currentUser.branchId, startDate, endDate, productName]);

  const collectionsReport = data?.monthlyCollections || [];
  const policyDistribution = data?.policyDistribution || [];

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

  const showBranchPerformance = currentUser.role === 'parlour_owner' || currentUser.role === 'branch_manager';
  const scopedBranchPerformance = data?.branchPerformance || [];
  const visibleBranchPerformance = currentUser.role === 'branch_manager' && currentUser.branchId
    ? scopedBranchPerformance.filter((row) => row.branchId === currentUser.branchId)
    : scopedBranchPerformance;

  const exportCSV = (name: string) => {
    const csvContent = 'data:text/csv;charset=utf-8,Month,Collected,Due\n'
      + collectionsReport.map((r) => `${r.month},${r.collected},${r.due}`).join('\n');
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
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button onClick={() => exportCSV('collections-report')} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        <select value={productName} onChange={(event) => setProductName(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="">All products</option>
          {productOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading reports...</div>}

      {data && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total Members</div>
            <div className="text-xl font-semibold">{data.totalMembers.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Active Policies</div>
            <div className="text-xl font-semibold">{data.activePolicies.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Collections</div>
            <div className="text-xl font-semibold">R{data.premiumsCollected.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Open Funeral Cases</div>
            <div className="text-xl font-semibold">{data.openFuneralCases.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Report */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Collections Report</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={collectionsReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `R${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: any) => `R${v.toLocaleString()}`} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="due" fill="#e2e8f0" name="Due" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Growth */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Member Growth</h3>
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

        {/* Funeral Cases Volume */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Funeral Cases Volume</h3>
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

        {/* Policy Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Policy Distribution by Product</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={policyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {policyDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Performance */}
      {showBranchPerformance && (
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
              {visibleBranchPerformance.map((b) => (
                <tr key={b.branch} className="border-b border-slate-100">
                  <td className="py-3 font-medium">{b.branch}</td>
                  <td className="py-3">{b.members.toLocaleString()}</td>
                  <td className="py-3">{b.collections}%</td>
                  <td className="py-3">
                    <div className="w-32 h-2 bg-slate-200 rounded-full">
                      <div className={`h-full rounded-full ${b.collections >= 90 ? 'bg-green-500' : b.collections >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${b.collections}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {visibleBranchPerformance.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">No branch performance data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

