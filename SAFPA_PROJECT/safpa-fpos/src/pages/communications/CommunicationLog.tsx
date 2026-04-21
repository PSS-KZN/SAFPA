import { communications } from '../../data/communications';
import { useRole } from '../../contexts/RoleContext';
import { useState } from 'react';

export default function CommunicationLog() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [filterType, setFilterType] = useState('all');

  const parlourComms = communications.filter((c) => c.parlourId === parlourId);
  const filtered = filterType === 'all' ? parlourComms : parlourComms.filter((c) => c.type === filterType);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Communications</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Send Message</button>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'sms', 'email'].map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm uppercase ${filterType === t ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

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
          </tbody>
        </table>
      </div>
    </div>
  );
}

