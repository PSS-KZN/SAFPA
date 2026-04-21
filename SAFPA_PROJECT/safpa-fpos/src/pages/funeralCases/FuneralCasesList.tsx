import { funeralCases } from '../../data/funeralCases';
import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  logged: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

export default function FuneralCasesList() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [filterStatus, setFilterStatus] = useState('all');

  const cases = funeralCases.filter((c) => c.parlourId === parlourId);
  const filtered = filterStatus === 'all' ? cases : cases.filter((c) => c.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Funeral Cases</h1>
        <Link to="/funeral-cases/new" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ New Case</Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'logged', 'in_progress', 'scheduled', 'completed', 'archived'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Case #</th>
              <th className="px-4 py-3">Deceased</th>
              <th className="px-4 py-3">Date of Death</th>
              <th className="px-4 py-3">Funeral Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Coordinator</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tasks</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const completedTasks = c.tasks.filter((t) => t.completed).length;
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.caseNumber}</td>
                  <td className="px-4 py-3 font-medium">{c.deceasedName}</td>
                  <td className="px-4 py-3 text-slate-500">{c.dateOfDeath}</td>
                  <td className="px-4 py-3 text-slate-500">{c.funeralDate || '—'}</td>
                  <td className="px-4 py-3 capitalize">{c.caseType}</td>
                  <td className="px-4 py-3">{c.coordinatorName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{completedTasks}/{c.tasks.length}</span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${c.tasks.length ? (completedTasks / c.tasks.length) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/funeral-cases/${c.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
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

