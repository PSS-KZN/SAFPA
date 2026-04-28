import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye, Search, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Member, Policy } from '../../types';
import { fetchMembers } from '../../services/membersApi';
import { fetchPolicies } from '../../services/policiesApi';

export default function MembersList() {
  const { currentUser } = useRole();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManageMembers = currentUser.role === 'parlour_owner' || currentUser.role === 'policy_admin';

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [memberRecords, policyRecords] = await Promise.all([
          fetchMembers(parlourId),
          fetchPolicies(parlourId),
        ]);

        setMembers(memberRecords);
        setPolicies(policyRecords);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const parlourMembers = currentUser.role === 'branch_manager' && currentUser.branchId
    ? members.filter((member) => member.branchId === currentUser.branchId)
    : members;
  const filtered = parlourMembers.filter((m) =>
    `${m.firstName} ${m.lastName} ${m.idNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        {canManageMembers && (
          <div className="flex gap-2">
            <Link to="/members/import" className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1">
              <Upload size={14} /> Bulk Import
            </Link>
            <Link to="/members/new" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Member</Link>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 mb-4 w-80">
        <Search size={16} className="text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or ID..." className="bg-transparent outline-none text-sm flex-1" />
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading members...</div>
      ) : (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">ID Number</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Policies</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Join Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const memberPolicies = policies.filter((p) => p.memberId === m.id);
              return (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.firstName} {m.lastName}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{m.idNumber}</td>
                  <td className="px-4 py-3 text-slate-500">{m.phone}</td>
                  <td className="px-4 py-3">{memberPolicies.length}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{m.joinDate}</td>
                  <td className="px-4 py-3">
                    <Link to={`/members/${m.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
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

