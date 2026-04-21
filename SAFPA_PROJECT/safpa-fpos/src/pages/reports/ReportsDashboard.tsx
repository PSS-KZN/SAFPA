import { useRole } from '../../contexts/RoleContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#e31837', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const collectionsReport = [
  { month: 'Nov', collected: 1200000, due: 1350000 },
  { month: 'Dec', collected: 1350000, due: 1500000 },
  { month: 'Jan', collected: 1450000, due: 1600000 },
  { month: 'Feb', collected: 1550000, due: 1700000 },
  { month: 'Mar', collected: 1680000, due: 1850000 },
  { month: 'Apr', collected: 1785000, due: 1920000 },
];

const memberGrowth = [
  { month: 'Nov', new: 400, total: 9800 },
  { month: 'Dec', new: 350, total: 10200 },
  { month: 'Jan', new: 500, total: 10800 },
  { month: 'Feb', new: 600, total: 11400 },
  { month: 'Mar', new: 450, total: 11900 },
  { month: 'Apr', new: 550, total: 12450 },
];

const funeralVolume = [
  { month: 'Nov', cases: 12 }, { month: 'Dec', cases: 15 }, { month: 'Jan', cases: 10 },
  { month: 'Feb', cases: 8 }, { month: 'Mar', cases: 14 }, { month: 'Apr', cases: 11 },
];

const branchPerformance = [
  { branch: 'Soweto Main', members: 4200, collections: 95 },
  { branch: 'Pretoria North', members: 3800, collections: 91 },
  { branch: 'Vaal Triangle', members: 2100, collections: 87 },
];

const policyDistribution = [
  { name: 'Basic Individual', value: 3200 },
  { name: 'Family Essential', value: 5100 },
  { name: 'Premium Family', value: 2800 },
  { name: 'Pensioner Plan', value: 1700 },
];

export default function ReportsDashboard() {
  const { currentUser } = useRole();
  const isSAFPA = currentUser.role === 'safpa_admin';

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
      {!isSAFPA && (
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
              {branchPerformance.map((b) => (
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

