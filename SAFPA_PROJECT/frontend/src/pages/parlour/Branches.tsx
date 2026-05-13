import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { Branch } from '../../types';
import { fetchBranches, setBranchStatus } from '../../services/branchesApi';

export default function Branches() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [parlourBranches, setParlourBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchBranches(parlourId);
      setParlourBranches(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [parlourId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const toggleStatus = async (branch: Branch) => {
    const nextStatus: Branch['status'] = branch.status === 'active' ? 'inactive' : 'active';

    try {
      setError(null);
      const updated = await setBranchStatus(branch.id, nextStatus);
      setParlourBranches((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update branch status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        <Link to="/parlour/branches/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">+ Add Branch</Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading branches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parlourBranches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{b.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
              </div>
              <div className="text-sm text-slate-500 space-y-1">
                <p>{b.address}</p>
                <p>{b.city}, {b.province}</p>
                <p className="mt-2"><span className="text-slate-700 font-medium">Manager:</span> {b.manager}</p>
                <p><span className="text-slate-700 font-medium">Phone:</span> {b.phone}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Link to={`/parlour/branches/${b.id}/edit`} className="text-sm text-red-600 hover:text-red-800">Edit</Link>
                <button onClick={() => void toggleStatus(b)} className="text-sm text-slate-400 hover:text-slate-600">
                  {b.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {parlourBranches.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">No branches found for this parlour.</div>
          )}
        </div>
      )}
    </div>
  );
}

