import { useRole } from '../../contexts/RoleContext';
import { resolveAssetUrl } from '../../services/http';
import { Users, FileText, Wallet, HeartHandshake, TrendingUp, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import type { Parlour } from '../../types';
import { fetchParlourById } from '../../services/parloursApi';
import { fetchReportsDashboard } from '../../services/reportsApi';
import { fetchLeads } from '../../services/leadsApi';
import { fetchAuditEntries } from '../../services/auditApi';

const formatCurrencyTooltip = (value: unknown) => {
  const amount = Array.isArray(value) ? value[0] : value;
  return `R${Number(amount ?? 0).toLocaleString()}`;
};

interface DashboardState {
  totalMembers: number;
  activePolicies: number;
  collectionRate: number;
  totalArrears: number;
  openCases: number;
  newLeads: number;
  monthlyCollections: Array<{ month: string; collected: number; due: number }>;
}

export default function ParlourDashboard() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [stats, setStats] = useState<DashboardState | null>(null);
  const [activity, setActivity] = useState<Array<{ text: string; time: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const canReadAudit = currentUser.role === 'safpa_admin' || currentUser.role === 'parlour_owner';

        const [parlourRecord, reportData, leads, audit] = await Promise.all([
          fetchParlourById(parlourId),
          fetchReportsDashboard(parlourId, currentUser.role === 'branch_manager' ? { branchId: currentUser.branchId } : undefined),
          fetchLeads(parlourId),
          canReadAudit ? fetchAuditEntries(parlourId, 5) : Promise.resolve([]),
        ]);

        const scopedLeads = currentUser.role === 'branch_manager' && currentUser.branchId
          ? leads.filter((lead) => lead.branchId === currentUser.branchId)
          : leads;

        const collectionRate = reportData.premiumsDue > 0
          ? Math.round((reportData.premiumsCollected / reportData.premiumsDue) * 100)
          : 0;

        setParlour(parlourRecord);
        setStats({
          totalMembers: reportData.totalMembers,
          activePolicies: reportData.activePolicies,
          collectionRate,
          totalArrears: reportData.arrears,
          openCases: reportData.openFuneralCases,
          newLeads: scopedLeads.filter((lead) => lead.status === 'new').length,
          monthlyCollections: reportData.monthlyCollections,
        });

        setActivity(
          audit.map((entry) => ({
            text: `${entry.action} - ${entry.entityLabel}`,
            time: entry.timestamp,
          }))
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId, currentUser.role, currentUser.branchId]);

  const memberGrowth = useMemo(() => {
    if (!stats) {
      return [];
    }

    const estimatedBase = Math.max(0, stats.totalMembers - stats.monthlyCollections.length * 20);
    let running = estimatedBase;
    return stats.monthlyCollections.map((item) => {
      const next = Math.max(5, Math.round((item.collected / Math.max(item.due, 1)) * 25));
      running += next;
      return { month: item.month, members: running };
    });
  }, [stats]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>;
  }

  if (!parlour || !stats) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Dashboard data is unavailable.</div>;
  }

  const cards = [
    { label: 'Active Members', value: stats.totalMembers.toLocaleString(), icon: <Users size={24} className="text-white" />, gradient: 'from-blue-600 to-blue-800' },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), icon: <FileText size={24} className="text-white" />, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Collection Rate', value: `${stats.collectionRate}%`, icon: <Wallet size={24} className="text-white" />, gradient: 'from-amber-500 to-amber-600' },
    { label: 'Arrears', value: `R${stats.totalArrears.toLocaleString()}`, icon: <TrendingUp size={24} className="text-white" />, gradient: 'from-red-600 to-red-800' },
    { label: 'Open Cases', value: stats.openCases, icon: <HeartHandshake size={24} className="text-white" />, gradient: 'from-slate-700 to-slate-800' },
    { label: 'New Leads', value: stats.newLeads, icon: <UserPlus size={24} className="text-white" />, gradient: 'from-slate-800 to-slate-900' },
  ];

  const dashboardPrimary = '#7a2e2e';
  const dashboardSecondary = '#2a221c';
  const dashboardAccent = '#c89a6d';
  const heroAddress = parlour.physicalAddress || `${parlour.region}, ${parlour.province}`;

  return (
    <div className="relative z-10 animate-fade-in-up">
      <div className="mb-8 overflow-hidden rounded-3xl border bg-[var(--app-surface)] shadow-sm" style={{ borderColor: 'var(--app-border-soft)' }}>
        <div className="grid grid-cols-1 gap-8 px-8 py-8 md:grid-cols-[1.2fr_0.8fr]" style={{ background: `linear-gradient(135deg, ${dashboardPrimary}, ${dashboardSecondary})` }}>
          <div className="text-white">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Internal tenant view</div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 p-2 text-slate-700 shadow-sm">
                {parlour.logo ? <img src={resolveAssetUrl(parlour.logo)} alt={`${parlour.name} logo`} className="h-full w-full object-contain" /> : <span className="text-lg font-bold">{parlour.name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{parlour.name}</h1>
                <p className="mt-1 text-white/80">{parlour.tagline || (currentUser.role === 'branch_manager' ? 'Branch Dashboard Overview' : 'Parlour Dashboard Overview')}</p>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/80">{parlour.businessDescription || 'This tenant-branded dashboard gives branch and parlour users a consistent internal identity without changing SAFPA-admin and cross-tenant surfaces.'}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur-sm">
              <div className="text-white/60">Support contact</div>
              <div className="mt-1 font-semibold">{parlour.supportPhone || parlour.contactPhone}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur-sm">
              <div className="text-white/60">Website status</div>
              <div className="mt-1 font-semibold">{parlour.websitePublished ? 'Published' : 'Draft'}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur-sm">
              <div className="text-white/60">Public address</div>
              <div className="mt-1 font-semibold">{heroAddress}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {cards.map((c, i) => (
          <div key={c.label} className="card card-hover p-6 flex items-center gap-5" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} shadow-lg shrink-0`}>
              {c.icon}
            </div>
            <div>
              <p className="text-[13px] text-slate-500 font-semibold uppercase tracking-wider">{c.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--app-ink)]">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="card p-6">
          <h3 className="mb-6 text-lg font-semibold text-[var(--app-ink)]">Monthly Collections</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b5d4f' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b5d4f' }} tickFormatter={(v) => `R${Number(v).toLocaleString()}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={formatCurrencyTooltip} cursor={{ fill: '#f5f0e8' }} contentStyle={{ borderRadius: '8px', border: '1px solid #d8cab6', boxShadow: '0 4px 6px -1px rgba(42, 34, 28, 0.1)', backgroundColor: '#fffaf2' }} />
              <Bar dataKey="collected" fill={dashboardAccent} name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="due" fill="#d8cab6" name="Due" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="mb-6 text-lg font-semibold text-[var(--app-ink)]">Member Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b5d4f' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b5d4f' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #d8cab6', boxShadow: '0 4px 6px -1px rgba(42, 34, 28, 0.1)', backgroundColor: '#fffaf2' }} />
              <Line type="monotone" dataKey="members" stroke={dashboardPrimary} strokeWidth={3} dot={{ r: 4, fill: dashboardPrimary, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="mb-6 text-lg font-semibold text-[var(--app-ink)]">Recent Activity</h3>
        <div className="space-y-4 text-sm">
          {activity.map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:bg-[rgba(122,46,46,0.04)]" style={{ borderColor: 'rgba(122, 46, 46, 0.08)', background: 'rgba(255, 250, 242, 0.74)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[var(--app-ink)]">{a.text}</span>
              </div>
              <span className="ml-4 whitespace-nowrap text-xs font-medium text-[var(--app-ink-muted)]">{a.time}</span>
            </div>
          ))}
          {activity.length === 0 && <div className="rounded-xl border p-4 text-[var(--app-ink-muted)]" style={{ borderColor: 'rgba(122, 46, 46, 0.08)', background: 'rgba(255, 250, 242, 0.74)' }}>No recent activity found.</div>}
        </div>
      </div>
    </div>
  );
}

