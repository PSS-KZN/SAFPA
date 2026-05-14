import { useRole } from '../../contexts/RoleContext';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Communication } from '../../types';
import { fetchCommunications } from '../../services/communicationsApi';

function formatTrigger(trigger?: string) {
  if (!trigger) {
    return 'Manual / Unspecified';
  }

  return trigger.replace(/_/g, ' ');
}

export default function CommunicationLog() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Communication['status']>('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchCommunications(parlourId);
      setItems(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [parlourId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parlourComms = items.filter((c) => c.parlourId === parlourId);
  const triggerOptions = useMemo(
    () => Array.from(new Set(parlourComms.map((item) => item.metadata?.trigger).filter(Boolean))) as string[],
    [parlourComms],
  );
  const filtered = parlourComms.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) {
      return false;
    }

    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }

    if (triggerFilter !== 'all' && c.metadata?.trigger !== triggerFilter) {
      return false;
    }

    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="mt-1 text-sm text-slate-500">Demo delivery only. Logs reflect simulated lifecycle states without sending real SMS or email.</p>
        </div>
        <Link to="/communications/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">+ Send Message</Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'sms', 'email'] as const).map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm uppercase ${filterType === t ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <select value={triggerFilter} onChange={(event) => setTriggerFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
          <option value="all">All triggers</option>
          {triggerOptions.map((trigger) => (
            <option key={trigger} value={trigger}>{formatTrigger(trigger)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading communications...</div>
      ) : (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Related</th>
              <th className="px-4 py-3">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs uppercase ${c.type === 'sms' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>{c.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase text-slate-500">{formatTrigger(c.metadata?.trigger)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.recipientName}</div>
                    <div className="text-xs text-slate-500">{c.recipientContact}</div>
                  </td>
                  <td className="px-4 py-3">{c.metadata?.templateName || c.template}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === 'delivered' ? 'bg-green-100 text-green-700' : c.status === 'queued' ? 'bg-slate-100 text-slate-700' : c.status === 'sent' ? 'bg-blue-100 text-blue-700' : c.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    <div className="mt-1 text-[11px] text-slate-400">{c.metadata?.statusReason || 'Demo dispatch lifecycle'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.metadata?.relatedEntityType ? `${c.metadata.relatedEntityType}: ${c.metadata.relatedEntityId || 'n/a'}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.metadata?.queuedAt || c.sentAt}</td>
                </tr>
                {expandedId === c.id && (
                  <tr className="border-t border-slate-100 bg-slate-50/70">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</div>
                          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            {c.metadata?.renderedSubject && <div className="mb-2 font-medium text-slate-900">{c.metadata.renderedSubject}</div>}
                            <div className="whitespace-pre-wrap">{c.metadata?.renderedBody || 'No rendered body stored'}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery Timeline</div>
                          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                            <div>Provider mode: <span className="font-medium text-slate-800">{c.metadata?.providerMode || 'demo'}</span></div>
                            <div>Queued: <span className="font-medium text-slate-800">{c.metadata?.queuedAt || '—'}</span></div>
                            <div>Sent: <span className="font-medium text-slate-800">{c.sentAt || '—'}</span></div>
                            <div>Delivered: <span className="font-medium text-slate-800">{c.metadata?.deliveredAt || '—'}</span></div>
                            <div>Failed: <span className="font-medium text-slate-800">{c.metadata?.failedAt || '—'}</span></div>
                            <div>Provider ref: <span className="font-medium text-slate-800">{c.metadata?.providerMessageId || '—'}</span></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No communication records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

