import { useRole } from '../../contexts/RoleContext';
import { useEffect, useState } from 'react';
import { Shield, Search, User } from 'lucide-react';
import type { AuditEntry } from '../../types';
import { fetchAuditEntries } from '../../services/auditApi';

const actionColors: Record<string, string> = {
  POLICY_UPDATED: 'bg-amber-100 text-amber-700',
  POLICY_CREATED: 'bg-red-100 text-red-700',
  PAYMENT_RECORDED: 'bg-green-100 text-green-700',
  CASE_STATUS_CHANGED: 'bg-violet-100 text-violet-700',
  USER_CREATED: 'bg-cyan-100 text-cyan-700',
  MEMBER_CREATED: 'bg-teal-100 text-teal-700',
  REMINDER_SENT: 'bg-orange-100 text-orange-700',
  DOCUMENT_UPLOADED: 'bg-slate-100 text-slate-600',
  PARLOUR_CREATED: 'bg-indigo-100 text-indigo-700',
  PRODUCT_UPDATED: 'bg-pink-100 text-pink-700',
  TASK_COMPLETED: 'bg-lime-100 text-lime-700',
  RECON_FILE_IMPORTED: 'bg-emerald-100 text-emerald-700',
  RESOURCE_PUBLISHED: 'bg-red-100 text-red-700',
  BULK_IMPORT: 'bg-purple-100 text-purple-700',
  BRANCH_CREATED: 'bg-yellow-100 text-yellow-700',
};

const roleColors: Record<string, string> = {
  safpa_admin: 'bg-indigo-100 text-indigo-700',
  parlour_owner: 'bg-red-100 text-red-700',
  branch_manager: 'bg-teal-100 text-teal-700',
  policy_admin: 'bg-violet-100 text-violet-700',
  collections_clerk: 'bg-green-100 text-green-700',
  operations_coordinator: 'bg-amber-100 text-amber-700',
  reporting_analyst: 'bg-blue-100 text-blue-700',
};

export default function AuditLog() {
  const { currentUser } = useRole();
  const isSAFPA = currentUser.role === 'safpa_admin';
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchAuditEntries(isSAFPA ? undefined : currentUser.parlourId, 300);
        setEntries(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load audit entries');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isSAFPA, currentUser.parlourId]);

  const visibleLogs = isSAFPA
    ? entries
    : entries.filter((e) => e.parlourId === currentUser.parlourId);

  const filtered = visibleLogs.filter((e) => {
    const matchSearch = e.userName.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entityLabel.toLowerCase().includes(search.toLowerCase()) ||
      (e.details || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || e.action === filterAction;
    return matchSearch && matchAction;
  });

  const uniqueActions = Array.from(new Set(visibleLogs.map((e) => e.action)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-slate-800 text-white rounded-lg"><Shield size={20} /></div>
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full trail of sensitive actions across the system</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading audit log...</div>}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user, action, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{e.timestamp}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      <User size={12} />
                    </div>
                    <span className="font-medium">{e.userName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[e.userRole] || 'bg-slate-100 text-slate-600'}`}>
                    {e.userRole.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[e.action] || 'bg-slate-100 text-slate-600'}`}>
                    {e.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="text-xs text-slate-400">{e.entityType}</span>
                    <div className="font-medium text-xs mt-0.5">{e.entityLabel}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={e.details}>{e.details}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No audit entries found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3 text-right">{filtered.length} entries shown</p>
    </div>
  );
}

