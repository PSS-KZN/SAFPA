import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FuneralCase } from '../../types';
import { deleteFuneralCase, fetchFuneralCases } from '../../services/funeralCasesApi';
import { filterFuneralCasesForUser } from '../../utils/dataScope';

const statusColors: Record<string, string> = {
  logged: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

export default function FuneralCasesList() {
  const { currentUser } = useRole();
  const [filterStatus, setFilterStatus] = useState('all');
  const [items, setItems] = useState<FuneralCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchFuneralCases(parlourId);
        setItems(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load funeral cases');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const cases = filterFuneralCasesForUser(items, currentUser);
  const filtered = filterStatus === 'all'
    ? cases
    : filterStatus === 'open'
      ? cases.filter((c) => c.status !== 'completed' && c.status !== 'archived')
      : cases.filter((c) => c.status === filterStatus);
  const openCases = cases.filter((c) => c.status !== 'completed' && c.status !== 'archived').length;
  const scheduledCases = cases.filter((c) => c.status === 'scheduled').length;
  const closedCases = cases.filter((c) => c.status === 'completed' || c.status === 'archived').length;

  const onDeleteCase = async (id: string) => {
    const confirmed = window.confirm('Delete this funeral case? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await deleteFuneralCase(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete funeral case');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Funeral Cases</h1>
        <Link to="/funeral-cases/new" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ New Case</Link>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Open Cases</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{openCases}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Scheduled Services</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{scheduledCases}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Closed Cases</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{closedCases}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'open', 'logged', 'in_progress', 'scheduled', 'completed', 'archived'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading funeral cases...</div>
      ) : (
      <div className="table-scroll bg-white rounded-xl shadow-sm border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Case #</th>
              <th className="px-4 py-3">Deceased</th>
              <th className="px-4 py-3">Date of Death</th>
              <th className="px-4 py-3">Funeral Date</th>
              <th className="px-4 py-3">Informant</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Coordinator</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Closure</th>
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
                  <td className="px-4 py-3 text-slate-500">{c.informantName || '—'}</td>
                  <td className="px-4 py-3 capitalize">{c.caseType}</td>
                  <td className="px-4 py-3">{c.coordinatorName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.closedAt ? `${c.closedAt.slice(0, 10)}${c.closedBy ? ` · ${c.closedBy}` : ''}` : 'Open'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{completedTasks}/{c.tasks.length}</span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${c.tasks.length ? (completedTasks / c.tasks.length) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/funeral-cases/${c.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
                      <button
                        type="button"
                        onClick={() => void onDeleteCase(c.id)}
                        className="text-slate-400 hover:text-red-700"
                        aria-label="Delete funeral case"
                        title="Delete case"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">No funeral cases found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

