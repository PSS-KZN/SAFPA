import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Parlour } from '../../types';
import { fetchParlours, setParlourStatus } from '../../services/parloursApi';
import { fetchBranches } from '../../services/branchesApi';

export default function ParlourList() {
  const [parlours, setParlours] = useState<Parlour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});

  const loadParlours = async () => {
    try {
      setLoading(true);
      setError(null);
      const [records, allBranches] = await Promise.all([fetchParlours(), fetchBranches()]);
      setParlours(records);
      const counts: Record<string, number> = {};
      for (const branch of allBranches) {
        counts[branch.parlourId] = (counts[branch.parlourId] || 0) + 1;
      }
      setBranchCounts(counts);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load parlours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadParlours();
  }, []);

  const toggleStatus = async (parlour: Parlour) => {
    try {
      const nextStatus: Parlour['status'] = parlour.status === 'suspended' ? 'active' : 'suspended';
      const updated = await setParlourStatus(parlour.id, nextStatus);
      setParlours((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update parlour status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Parlour Management</h1>
        <Link to="/safpa/parlours/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
          + Add Parlour
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading parlours...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Parlour Name</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parlours.map((p) => {
                const branchCount = branchCounts[p.id] || 0;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.province}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.tier === 'premium' ? 'bg-violet-100 text-violet-700' : p.tier === 'standard' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {p.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'onboarding' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.onboardingProgress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{p.onboardingProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.totalMembers.toLocaleString()}</td>
                    <td className="px-4 py-3">{branchCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/safpa/parlours/${p.id}`} className="text-red-600 hover:text-red-800" title="View">
                          <Eye size={16} />
                        </Link>
                        <button onClick={() => void toggleStatus(p)} className="text-xs text-slate-600 hover:text-slate-900">
                          {p.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

