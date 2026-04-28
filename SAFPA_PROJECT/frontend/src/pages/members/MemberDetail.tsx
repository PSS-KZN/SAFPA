import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Wallet, Upload, File } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useEffect, useState } from 'react';
import type { Document, Member, PaymentTransaction, Policy } from '../../types';
import { fetchDocuments } from '../../services/documentsApi';
import { fetchMember } from '../../services/membersApi';
import { fetchPayments } from '../../services/paymentsApi';
import { fetchPolicies } from '../../services/policiesApi';

export default function MemberDetail() {
  const { currentUser } = useRole();
  const { id } = useParams();

  const [member, setMember] = useState<Member | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const parlourId = currentUser.parlourId || 'p1';
        const [memberRecord, policyRecords, paymentRecords, documentRecords] = await Promise.all([
          fetchMember(id),
          fetchPolicies(parlourId),
          fetchPayments(parlourId),
          fetchDocuments({ parlourId }),
        ]);

        setMember(memberRecord);
        setPolicies(policyRecords);
        setPayments(paymentRecords);
        setDocuments(documentRecords);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, currentUser.parlourId]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading member...</div>;
  }

  if (!member) {
    return <div className="text-center py-12 text-slate-500">Member not found</div>;
  }

  const memberPolicies = policies.filter((p) => p.memberId === member.id);
  const memberPayments = payments.filter((p) => p.memberId === member.id);
  const memberDocs = documents.filter((d) => d.entityType === 'member' && d.entityId === member.id);

  const docTypeLabels: Record<string, string> = {
    id_copy: 'ID Copy', proof_of_address: 'Proof of Address',
    consent_form: 'Consent Form', policy_document: 'Policy Document', other: 'Other',
  };
  const docTypeColors: Record<string, string> = {
    id_copy: 'bg-red-100 text-red-700', proof_of_address: 'bg-amber-100 text-amber-700',
    consent_form: 'bg-cyan-100 text-cyan-700', policy_document: 'bg-violet-100 text-violet-700', other: 'bg-slate-100 text-slate-600',
  };

  return (
    <div>
      <Link to="/members" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Members
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold">
          {member.firstName[0]}{member.lastName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{member.firstName} {member.lastName}</h1>
          <p className="text-slate-500 text-sm font-mono">{member.idNumber}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{member.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Contact */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Contact Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Phone size={16} />{member.phone}</div>
            <div className="flex items-center gap-2 text-slate-600"><Mail size={16} />{member.email}</div>
            <div className="flex items-center gap-2 text-slate-600"><MapPin size={16} />{member.address}, {member.city}, {member.province}</div>
            <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} />Joined: {member.joinDate}</div>
          </div>
        </div>

        {/* Dependants */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Dependants ({member.dependants.length})</h3>
          {member.dependants.length === 0 ? (
            <p className="text-sm text-slate-400">No dependants</p>
          ) : (
            <div className="space-y-2">
              {member.dependants.map((d) => (
                <div key={d.id} className="text-sm py-1 border-b border-slate-100 last:border-0">
                  <div className="font-medium">{d.firstName} {d.lastName}</div>
                  <div className="text-xs text-slate-400">{d.relationship} • DOB: {d.dateOfBirth}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Beneficiaries */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Beneficiaries ({member.beneficiaries.length})</h3>
          {member.beneficiaries.length === 0 ? (
            <p className="text-sm text-slate-400">No beneficiaries</p>
          ) : (
            <div className="space-y-2">
              {member.beneficiaries.map((b) => (
                <div key={b.id} className="text-sm py-1 border-b border-slate-100 last:border-0">
                  <div className="font-medium">{b.firstName} {b.lastName}</div>
                  <div className="text-xs text-slate-400">{b.relationship} • {b.percentage}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText size={18} /> Policies ({memberPolicies.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2">Policy #</th>
              <th className="pb-2">Product</th>
              <th className="pb-2">Premium</th>
              <th className="pb-2">Cover</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberPolicies.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{p.policyNumber}</td>
                <td className="py-2">{p.productName}</td>
                <td className="py-2">R{p.premiumAmount}/mo</td>
                <td className="py-2">R{p.coverAmount.toLocaleString()}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'suspended' ? 'bg-amber-100 text-amber-700' : p.status === 'lapsed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{p.status}</span>
                </td>
                <td className="py-2">
                  <Link to={`/policies/${p.id}`} className="text-red-600 hover:text-red-800 text-xs">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Wallet size={18} /> Payment History</h3>
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
            {memberPayments.map((p) => (
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
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><FileText size={18} /> Documents ({memberDocs.length})</h3>
          <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-lg">
            <Upload size={14} /> Upload
          </button>
        </div>
        {memberDocs.length > 0 ? (
          <div className="space-y-2">
            {memberDocs.map((doc) => (
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
          <div className="text-center py-6 text-slate-400 text-sm">No documents uploaded for this member</div>
        )}
        <div className="mt-3 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400 hover:border-red-300 cursor-pointer transition-colors">
          Drop files here or <span className="text-red-600">browse</span>
        </div>
      </div>
    </div>
  );
}

