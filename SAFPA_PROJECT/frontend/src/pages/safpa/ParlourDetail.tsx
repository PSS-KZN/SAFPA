import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Mail, Phone, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Branch, Parlour, User } from '../../types';
import { fetchParlourById } from '../../services/parloursApi';
import { fetchBranches } from '../../services/branchesApi';
import { fetchUsers } from '../../services/usersApi';

export default function ParlourDetail() {
  const { id } = useParams();
  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [parlourBranches, setParlourBranches] = useState<Branch[]>([]);
  const [parlourUsers, setParlourUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadParlour = async () => {
      try {
        const [record, branches, users] = await Promise.all([
          fetchParlourById(id),
          fetchBranches(id),
          fetchUsers(id),
        ]);
        setParlour(record);
        setParlourBranches(branches);
        setParlourUsers(users);
      } catch {
        setParlour(null);
        setParlourBranches([]);
        setParlourUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void loadParlour();
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading parlour...</div>;
  if (!parlour) return <div className="text-center py-12 text-slate-500">Parlour not found</div>;

  const onboardingSteps = [
    { label: 'Business Profile', done: parlour.onboardingProgress >= 20 },
    { label: 'Branding & Logo', done: parlour.onboardingProgress >= 40 },
    { label: 'Products Setup', done: parlour.onboardingProgress >= 60 },
    { label: 'Branch Configuration', done: parlour.onboardingProgress >= 80 },
    { label: 'Go Live', done: parlour.onboardingProgress >= 100 },
  ];

  return (
    <div>
      <Link to="/safpa/parlours" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Parlours
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: parlour.primaryColor }}>
          {parlour.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{parlour.name}</h1>
          <p className="text-slate-500">{parlour.region}, {parlour.province}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${parlour.status === 'active' ? 'bg-green-100 text-green-700' : parlour.status === 'onboarding' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {parlour.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Building2 size={16} /> Tier: <span className="font-medium capitalize">{parlour.tier}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><Users size={16} /> Members: <span className="font-medium">{parlour.totalMembers.toLocaleString()}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><Mail size={16} /> {parlour.contactEmail}</div>
            <div className="flex items-center gap-2 text-slate-600"><Phone size={16} /> {parlour.contactPhone}</div>
            <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> Joined: {parlour.joinedDate}</div>
          </div>
        </div>

        {/* Onboarding Progress */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Onboarding Progress — {parlour.onboardingProgress}%</h3>
          <div className="h-2 bg-slate-200 rounded-full mb-4">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${parlour.onboardingProgress}%` }} />
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${step.done ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                  {step.done && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={step.done ? 'text-slate-700' : 'text-slate-400'}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Users ({parlourUsers.length})</h3>
          <div className="space-y-2">
            {parlourUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 text-sm py-1">
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold">
                  {u.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{u.role.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4">Branches ({parlourBranches.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2">Branch</th>
              <th className="pb-2">City</th>
              <th className="pb-2">Manager</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {parlourBranches.map((b) => (
              <tr key={b.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{b.name}</td>
                <td className="py-2 text-slate-500">{b.city}</td>
                <td className="py-2">{b.manager}</td>
                <td className="py-2 text-slate-500">{b.phone}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

