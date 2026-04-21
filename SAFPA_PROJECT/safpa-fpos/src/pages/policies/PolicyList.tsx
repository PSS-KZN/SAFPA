import { policies } from '../../data/policies';
import { members } from '../../data/members';
import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useState } from 'react';

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

  const parlourPolicies = policies.filter((p) => p.parlourId === (currentUser.parlourId || 'p1'));
  const filtered = filterStatus === 'all' ? parlourPolicies : parlourPolicies.filter((p) => p.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Policies</h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'active', 'suspended', 'lapsed', 'draft', 'pending'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterStatus === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
    </div>
  );
}

