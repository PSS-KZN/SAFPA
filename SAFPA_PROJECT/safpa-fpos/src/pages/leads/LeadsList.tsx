import { leads } from '../../data/leads';
import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-violet-100 text-violet-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-slate-100 text-slate-600',
};

export default function LeadsList() {
  const { currentUser } = useRole();
  const [filterStatus, setFilterStatus] = useState('all');

  const parlourLeads = leads.filter((l) => l.parlourId === (currentUser.parlourId || 'p1'));
  const filtered = filterStatus === 'all' ? parlourLeads : parlourLeads.filter((l) => l.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Lead</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => (
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{l.firstName} {l.lastName}</td>
                <td className="px-4 py-3 text-slate-500">{l.phone}</td>
                <td className="px-4 py-3 capitalize">{l.source}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[l.status]}`}>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{l.assignedTo || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{l.createdAt}</td>
                <td className="px-4 py-3">
                  <Link to={`/leads/${l.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

