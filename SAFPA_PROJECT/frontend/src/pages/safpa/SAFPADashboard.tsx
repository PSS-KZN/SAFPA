import { Building2, Users, FileText, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';
import { fetchNetworkDashboard, type NetworkDashboardData } from '../../services/reportsApi';

// Premium SAFPA Palette
const COLORS = ['#e31837', '#f59e0b', '#0f172a', '#475569', '#94a3b8'];

export default function SAFPADashboard() {
  const [stats, setStats] = useState<NetworkDashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const records = await fetchNetworkDashboard();
        setStats(records);
      } catch {
        setStats(null);
      }
    };

    void load();
  }, []);

  if (!stats) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  const cards = [
    { label: 'Total Parlours', value: stats.totalParlours, sub: `${stats.activeParlours} active`, icon: <Building2 size={24} className="text-white" />, gradient: 'from-slate-800 to-slate-900' },
    { label: 'Total Members', value: stats.totalMembers.toLocaleString(), sub: '+1,115 this month', icon: <Users size={24} className="text-white" />, gradient: 'from-blue-600 to-blue-800' },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), sub: `of ${stats.totalPolicies.toLocaleString()} total`, icon: <FileText size={24} className="text-white" />, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Collection Rate', value: `${stats.collectionRate}%`, sub: `R${(stats.premiumsCollectedThisMonth / 100).toLocaleString()} collected`, icon: <Wallet size={24} className="text-white" />, gradient: 'from-amber-500 to-amber-600' },
    { label: 'Premiums Due', value: `R${(stats.premiumsDueThisMonth / 100).toLocaleString()}`, sub: 'This month', icon: <TrendingUp size={24} className="text-white" />, gradient: 'from-slate-700 to-slate-800' },
    { label: 'Total Arrears', value: `R${(stats.totalArrears / 100).toLocaleString()}`, sub: `${stats.openFuneralCases} open cases`, icon: <AlertTriangle size={24} className="text-white" />, gradient: 'from-red-600 to-red-800' },
  ];

  return (
    <div className="relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SAFPA Network</h1>
        <p className="text-[15px] text-slate-500 mt-1">Real-time performance metrics across all participating parlours.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="card card-hover p-6 flex items-center gap-5">
            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} shadow-lg shrink-0`}>
              {c.icon}
            </div>
            <div>
              <p className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">{c.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{c.value}</p>
              <p className="text-[13px] text-slate-400 mt-1 font-medium">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Collections Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Collections vs Due</h3>
              <p className="text-[13px] text-slate-500">Monthly financial performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyCollections}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `R${(v / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip formatter={(v: any) => `R${v.toLocaleString()}`} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="collected" fill="#e31837" name="Collected" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="due" fill="#cbd5e1" name="Due" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Policy Status Breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Policy Status</h3>
              <p className="text-[13px] text-slate-500">Current portfolio distribution</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.policyStatusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={3} label={({ status, count }: any) => `${status}: ${count.toLocaleString()}`}>
                {stats.policyStatusBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Member Growth + Parlour Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Member Growth</h3>
              <p className="text-[13px] text-slate-500">6-month acquisition trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.memberGrowth}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="members" stroke="#0f172a" strokeWidth={3} dot={{ r: 5, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-0 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Parlours Directory</h3>
              <p className="text-[13px] text-slate-500">Active network members</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parlour</th>
                  <th>Region</th>
                  <th>Tier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.parlours.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-slate-800">{p.name}</td>
                    <td>{p.province}</td>
                    <td>
                      <span className="badge badge-neutral capitalize">{p.tier}</span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : p.status === 'onboarding' ? 'badge-warning' : 'badge-danger'} capitalize`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
