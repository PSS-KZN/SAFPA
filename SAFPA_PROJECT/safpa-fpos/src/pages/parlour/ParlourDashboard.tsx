import { parlourDashboardStats } from '../../data/dashboardStats';
import { useRole } from '../../contexts/RoleContext';
import { parlours } from '../../data/parlours';
import { funeralCases } from '../../data/funeralCases';
import { leads } from '../../data/leads';
import { Users, FileText, Wallet, HeartHandshake, TrendingUp, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ParlourDashboard() {
  const { currentUser } = useRole();
  const stats = parlourDashboardStats;
  const parlour = parlours.find((p) => p.id === currentUser.parlourId) || parlours[0];
  const parlourCases = funeralCases.filter((c) => c.parlourId === parlour.id && c.status !== 'completed' && c.status !== 'archived');
  const parlourLeads = leads.filter((l) => l.parlourId === parlour.id && l.status === 'new');

  const cards = [
    { label: 'Active Members', value: stats.totalMembers.toLocaleString(), icon: <Users size={20} />, color: 'bg-slate-100 text-slate-600' },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), icon: <FileText size={20} />, color: 'bg-slate-100 text-slate-600' },
    { label: 'Collection Rate', value: `${stats.collectionRate}%`, icon: <Wallet size={20} />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Arrears', value: `R${(stats.totalArrears / 100).toLocaleString()}k`, icon: <TrendingUp size={20} />, color: 'bg-red-50 text-red-600' },
    { label: 'Open Cases', value: parlourCases.length, icon: <HeartHandshake size={20} />, color: 'bg-slate-100 text-slate-600' },
    { label: 'New Leads', value: parlourLeads.length, icon: <UserPlus size={20} />, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{parlour.name}</h1>
        <p className="text-slate-500 mt-1">Parlour Dashboard Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {cards.map((c, i) => (
          <div key={c.label} className="glass-panel glass-panel-interactive rounded-2xl p-6 flex items-start gap-5" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`${c.color} p-3 rounded-xl border border-slate-200/60 shadow-sm`}>{c.icon}</div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{c.label}</p>
              <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-semibold text-slate-800 mb-6 text-lg">Monthly Collections</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `R${(v / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => `R${v.toLocaleString()}`} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="collected" fill="#e31837" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="due" fill="#cbd5e1" name="Due" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-semibold text-slate-800 mb-6 text-lg">Member Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-semibold text-slate-800 mb-6 text-lg">Recent Activity</h3>
        <div className="space-y-4 text-sm">
          {[
            { text: 'New lead received from website — David Moloi', time: '2 hours ago', icon: '📝' },
            { text: 'Payment failed — Precious Mkhwanazi (UBT-2026-0005)', time: '5 hours ago', icon: '❌' },
            { text: 'Funeral case FC-2026-001 task completed — Arrange hearse', time: '1 day ago', icon: '✅' },
            { text: 'New member registered — Fatima Essop', time: '2 days ago', icon: '👤' },
            { text: 'Policy POL-2026-0005 suspended due to arrears', time: '3 days ago', icon: '⚠️' },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">{a.icon}</span>
                <span className="text-slate-800">{a.text}</span>
              </div>
              <span className="text-slate-500 text-xs font-medium whitespace-nowrap ml-4">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

