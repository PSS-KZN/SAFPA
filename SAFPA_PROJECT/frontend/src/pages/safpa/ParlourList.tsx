import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, PencilLine } from 'lucide-react';
import type { Parlour } from '../../types';
import { fetchParlours, setParlourStatus } from '../../services/parloursApi';
import { fetchBranches } from '../../services/branchesApi';
import { fetchMembers } from '../../services/membersApi';
import { fetchAdoptionOverview, type AdoptionOverviewParlour } from '../../services/reportsApi';

function getOnboardingStage(progress: number): string {
  if (progress >= 100) {
    return 'Go live complete';
  }
  if (progress >= 80) {
    return 'Branch setup';
  }
  if (progress >= 60) {
    return 'Products setup';
  }
  if (progress >= 40) {
    return 'Branding review';
  }
  if (progress >= 20) {
    return 'Business profile';
  }
  return 'Tenant created';
}

export default function ParlourList() {
  const [parlours, setParlours] = useState<Parlour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number> | null>(null);
  const [adoptionByParlourId, setAdoptionByParlourId] = useState<Record<string, AdoptionOverviewParlour>>({});

  const getHealthClasses = (healthStatus?: AdoptionOverviewParlour['healthStatus']) => {
    if (healthStatus === 'green') {
      return 'bg-green-100 text-green-700';
    }

    if (healthStatus === 'amber') {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-600';
  };

  const formatStatusLabel = (value?: string | null) => {
    if (!value) {
      return 'Not tracked';
    }

    return value.replace(/_/g, ' ');
  };

  const loadParlours = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recordsResult, branchesResult, membersResult, adoptionResult] = await Promise.allSettled([
        fetchParlours(),
        fetchBranches(),
        fetchMembers(),
        fetchAdoptionOverview(),
      ]);

      if (recordsResult.status !== 'fulfilled') {
        throw recordsResult.reason;
      }

      const records = recordsResult.value;
      setParlours(records);
      if (branchesResult.status === 'fulfilled') {
        const counts: Record<string, number> = {};
        for (const branch of branchesResult.value) {
          counts[branch.parlourId] = (counts[branch.parlourId] || 0) + 1;
        }
        setBranchCounts(counts);
      } else {
        setBranchCounts({});
      }

      if (membersResult.status === 'fulfilled') {
        const counts: Record<string, number> = {};
        for (const member of membersResult.value) {
          counts[member.parlourId] = (counts[member.parlourId] || 0) + 1;
        }
        setMemberCounts(counts);
      } else {
        setMemberCounts(null);
      }

      if (adoptionResult.status === 'fulfilled') {
        setAdoptionByParlourId(
          Object.fromEntries((adoptionResult.value.parlours || []).map((item) => [item.parlourId, item]))
        );
      } else {
        setAdoptionByParlourId({});
      }

      if (branchesResult.status !== 'fulfilled' || membersResult.status !== 'fulfilled' || adoptionResult.status !== 'fulfilled') {
        setError('Some supporting endpoint data could not be loaded. Core parlour records are shown below.');
      }
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
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parlours.map((p) => {
                const branchCount = branchCounts[p.id] || 0;
                const memberCount = memberCounts ? (memberCounts[p.id] || 0) : p.totalMembers;
                const adoption = adoptionByParlourId[p.id];
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{p.region}</div>
                      <div className="text-xs text-slate-400">{p.province}</div>
                    </td>
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.onboardingProgress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{p.onboardingProgress}%</span>
                        </div>
                        <div className="text-xs text-slate-500">{getOnboardingStage(p.onboardingProgress)}{adoption ? ` · ${formatStatusLabel(adoption.onboardingStatus)}` : ''}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {adoption ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${getHealthClasses(adoption.healthStatus)}`}>
                              {adoption.healthStatus}
                            </span>
                            {adoption.isDormant && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">Dormant</span>}
                            {adoption.isAtRisk && !adoption.isDormant && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">At risk</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {adoption.activeUsers30d} active users · {adoption.events30d} events / 30d
                          </div>
                          <div className="text-xs text-slate-400">
                            {adoption.lastActiveAt ? `Last active ${adoption.lastActiveAt}` : 'No tracked activity yet'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">No adoption data yet</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{memberCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{branchCount || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/safpa/parlours/${p.id}`} className="text-red-600 hover:text-red-800" title="View details">
                          <Eye size={16} />
                        </Link>
                        <Link to={`/safpa/parlours/${p.id}?mode=edit`} className="text-slate-600 hover:text-slate-900" title="Edit parlour">
                          <PencilLine size={16} />
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

