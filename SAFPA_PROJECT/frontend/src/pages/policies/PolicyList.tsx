import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Member, Policy } from '../../types';
import { fetchMembers } from '../../services/membersApi';
import { fetchPolicies } from '../../services/policiesApi';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  lapsed: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  reinstated: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-slate-100 text-slate-600',
};

export default function PolicyList() {
  const { currentUser } = useRole();
  const [filterStatus, setFilterStatus] = useState('all');
  const [items, setItems] = useState<Policy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [policyRecords, memberRecords] = await Promise.all([fetchPolicies(parlourId), fetchMembers(parlourId)]);
        setItems(policyRecords);
        setMembers(memberRecords);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const parlourPolicies = currentUser.role === 'branch_manager' && currentUser.branchId
    ? items.filter((policy) => members.some((member) => member.id === policy.memberId && member.branchId === currentUser.branchId))
    : items;
  const filtered = filterStatus === 'all' ? parlourPolicies : parlourPolicies.filter((p) => p.status === filterStatus);
  const canCreatePolicy = currentUser.role === 'parlour_owner' || currentUser.role === 'policy_admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Policies</h1>
        {canCreatePolicy && (
          <div className="flex gap-2">
            <Link to="/policies/import" className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1">
              <Upload size={14} /> Bulk Import
            </Link>
            <Link to="/policies/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">+ Create Policy</Link>
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'active', 'suspended', 'lapsed', 'draft', 'pending'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterStatus === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading policies...</div>
      ) : (
      <div className="table-scroll bg-white rounded-xl shadow-sm border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Policy #</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Cover</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Arrears</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const member = members.find((m) => m.id === p.memberId);
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-3 font-medium">{member ? `${member.firstName} ${member.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{p.productName}</td>
                  <td className="px-4 py-3">R{p.premiumAmount}</td>
                  <td className="px-4 py-3">R{p.coverAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">{p.arrearsAmount > 0 ? <span className="text-red-600 font-medium">R{p.arrearsAmount}</span> : '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/policies/${p.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
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

