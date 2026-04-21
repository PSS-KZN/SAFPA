import { useParams, Link } from 'react-router-dom';
import { policies } from '../../data/policies';
import { members } from '../../data/members';
import { payments } from '../../data/payments';
import { documents } from '../../data/documents';
import { ArrowLeft, FileText, Calendar, DollarSign, AlertCircle, Upload, File } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  lapsed: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-red-100 text-red-700',
  reinstated: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-500',
};

export default function PolicyDetail() {
  const { id } = useParams();
  const policy = policies.find((p) => p.id === id);
  if (!policy) return <div className="text-center py-12 text-slate-500">Policy not found</div>;

  const member = members.find((m) => m.id === policy.memberId);
  const policyPayments = payments.filter((p) => p.policyId === policy.id);
  const policyDocs = documents.filter((d) => d.entityType === 'policy' && d.entityId === policy.id);

  const docTypeLabels: Record<string, string> = {
    policy_document: 'Policy Document', id_copy: 'ID Copy', receipt: 'Receipt', other: 'Other',
  };
  const docTypeColors: Record<string, string> = {
    policy_document: 'bg-violet-100 text-violet-700', id_copy: 'bg-red-100 text-red-700',
    receipt: 'bg-green-100 text-green-700', other: 'bg-slate-100 text-slate-600',
  };

  const timeline = [
    { event: 'Policy Created', date: policy.startDate, status: 'done' },
    { event: 'First Premium Collected', date: policy.startDate, status: 'done' },
    ...(policy.status === 'suspended' ? [{ event: 'Policy Suspended', date: '2026-03-15', status: 'warning' as const }] : []),
    ...(policy.status === 'lapsed' ? [{ event: 'Policy Lapsed', date: '2026-04-01', status: 'error' as const }] : []),
  ];

  return (
    <div>
      <Link to="/policies" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Policies
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{policy.policyNumber}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[policy.status]}`}>{policy.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText size={18} /> Policy Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-medium">{policy.productName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Premium</span><span className="font-medium">R{policy.premiumAmount}/mo</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cover Amount</span><span className="font-medium">R{policy.coverAmount.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Billing</span><span className="font-medium capitalize">{policy.billingFrequency}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Start Date</span><span className="font-medium">{policy.startDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Next Due</span><span className="font-medium">{policy.nextDueDate}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Policyholder</h3>
          {member ? (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-lg">{member.firstName} {member.lastName}</div>
              <div className="text-slate-500 font-mono text-xs">{member.idNumber}</div>
              <div className="text-slate-500">{member.phone}</div>
              <div className="text-slate-500">{member.email}</div>
              <Link to={`/members/${member.id}`} className="text-red-600 hover:text-red-800 text-sm inline-block mt-2">View Member Profile →</Link>
            </div>
          ) : <p className="text-slate-400 text-sm">Member not found</p>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign size={18} /> Financial</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Last Payment</span><span className="font-medium">{policy.lastPaymentDate || 'None'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Arrears</span>
              {policy.arrearsAmount > 0 ? (
                <span className="font-medium text-red-600 flex items-center gap-1"><AlertCircle size={14} /> R{policy.arrearsAmount}</span>
              ) : <span className="font-medium text-green-600">R0</span>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">Record Payment</button>
            {policy.status === 'suspended' && <button className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">Reinstate</button>}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={18} /> Status Timeline</h3>
        <div className="space-y-3">
          {timeline.map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={`w-3 h-3 rounded-full ${t.status === 'done' ? 'bg-green-500' : t.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="font-medium">{t.event}</span>
              <span className="text-slate-400">{t.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4">Payment History</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2">Date</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Method</th>
              <th className="pb-2">Reference</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {policyPayments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2">{p.date}</td>
                <td className="py-2">R{p.amount}</td>
                <td className="py-2 capitalize">{p.method.replace('_', ' ')}</td>
                <td className="py-2 font-mono text-xs">{p.reference}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'successful' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><FileText size={18} /> Documents ({policyDocs.length})</h3>
          <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-lg">
            <Upload size={14} /> Upload
          </button>
        </div>
        {policyDocs.length > 0 ? (
          <div className="space-y-2">
            {policyDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <File size={16} className="text-slate-400" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-slate-400">Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${docTypeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>
                  {docTypeLabels[doc.type] || doc.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">No documents uploaded for this policy</div>
        )}
        <div className="mt-3 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400 hover:border-red-300 cursor-pointer transition-colors">
          Drop files here or <span className="text-red-600">browse</span>
        </div>
      </div>
    </div>
  );
}

