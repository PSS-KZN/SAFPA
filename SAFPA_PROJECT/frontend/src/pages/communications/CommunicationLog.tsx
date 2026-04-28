import { useRole } from '../../contexts/RoleContext';
import { useEffect, useState } from 'react';
import type { Communication } from '../../types';
import { fetchCommunications, sendCommunication } from '../../services/communicationsApi';

export default function CommunicationLog() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState({
    recipientName: '',
    recipientContact: '',
    channel: 'sms' as 'sms' | 'email' | 'both',
    subject: '',
    message: '',
  });

  const load = async () => {
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
  };

  useEffect(() => {
    void load();
  }, [parlourId]);

  const parlourComms = items.filter((c) => c.parlourId === parlourId);
  const filtered = filterType === 'all' ? parlourComms : parlourComms.filter((c) => c.type === filterType);

  const sendCustomMessage = async () => {
    if (!composer.recipientName || !composer.recipientContact || !composer.message) {
      setError('Please complete recipient name, contact, and message.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      const types: Array<'sms' | 'email'> = composer.channel === 'both' ? ['sms', 'email'] : [composer.channel];

      await Promise.all(types.map((type) => sendCommunication({
        parlourId,
        type,
        recipientName: composer.recipientName,
        recipientContact: composer.recipientContact,
        subject: type === 'email' ? composer.subject || undefined : undefined,
        template: composer.message,
        status: 'sent',
        sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      })));

      await load();
      setShowComposer(false);
      setComposer({ recipientName: '', recipientContact: '', channel: 'sms', subject: '', message: '' });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Communications</h1>
        <button onClick={() => setShowComposer(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Send Message</button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 mb-4">
        {['all', 'sms', 'email'].map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm uppercase ${filterType === t ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading communications...</div>
      ) : (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs uppercase ${c.type === 'sms' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>{c.type}</span>
                </td>
                <td className="px-4 py-3 font-medium">{c.recipientName}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.recipientContact}</td>
                <td className="px-4 py-3">{c.template}</td>
                <td className="px-4 py-3 text-slate-500">{c.subject || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === 'delivered' ? 'bg-green-100 text-green-700' : c.status === 'sent' ? 'bg-red-100 text-red-700' : c.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.sentAt}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No communication records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {showComposer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Compose Message</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Recipient Name</label>
                <input value={composer.recipientName} onChange={(e) => setComposer((previous) => ({ ...previous, recipientName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Recipient Contact</label>
                <input value={composer.recipientContact} onChange={(e) => setComposer((previous) => ({ ...previous, recipientContact: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone or email" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Send Via</label>
                <select value={composer.channel} onChange={(e) => setComposer((previous) => ({ ...previous, channel: e.target.value as 'sms' | 'email' | 'both' }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Subject (Email)</label>
                <input value={composer.subject} onChange={(e) => setComposer((previous) => ({ ...previous, subject: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={composer.channel === 'sms'} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Message</label>
                <textarea value={composer.message} onChange={(e) => setComposer((previous) => ({ ...previous, message: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={5} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowComposer(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => void sendCustomMessage()} disabled={sending} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

