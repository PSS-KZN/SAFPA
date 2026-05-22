import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Wallet, Upload, File, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useEffect, useState } from 'react';
import type { Beneficiary, Dependant, Document, Member, PaymentTransaction, Policy } from '../../types';
import { fetchDocuments } from '../../services/documentsApi';
import { fetchMember, updateMember } from '../../services/membersApi';
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editable, setEditable] = useState<Member | null>(null);

  const canEditMember = currentUser.role === 'parlour_owner' || currentUser.role === 'branch_manager' || currentUser.role === 'policy_admin';

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
        setEditable(memberRecord);
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

  const editState = editable || member;

  const updateEditableField = <K extends keyof Member>(field: K, value: Member[K]) => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }
      return { ...previous, [field]: value };
    });
  };

  const updateDependant = (index: number, field: keyof Dependant, value: string) => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      const nextDependants = previous.dependants.map((dependant, dependantIndex) => (
        dependantIndex === index ? { ...dependant, [field]: value } : dependant
      ));

      return { ...previous, dependants: nextDependants };
    });
  };

  const addDependant = () => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        dependants: [
          ...previous.dependants,
          {
            id: `d-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            firstName: '',
            lastName: '',
            idNumber: '',
            relationship: '',
            dateOfBirth: '',
          },
        ],
      };
    });
  };

  const removeDependant = (index: number) => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        dependants: previous.dependants.filter((_, dependantIndex) => dependantIndex !== index),
      };
    });
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      const nextBeneficiaries = previous.beneficiaries.map((beneficiary, beneficiaryIndex) => (
        beneficiaryIndex === index
          ? {
            ...beneficiary,
            [field]: field === 'percentage' ? Number(value) : value,
          }
          : beneficiary
      ));

      return { ...previous, beneficiaries: nextBeneficiaries };
    });
  };

  const addBeneficiary = () => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        beneficiaries: [
          ...previous.beneficiaries,
          {
            id: `bn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            firstName: '',
            lastName: '',
            idNumber: '',
            relationship: '',
            percentage: 0,
          },
        ],
      };
    });
  };

  const removeBeneficiary = (index: number) => {
    setEditable((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        beneficiaries: previous.beneficiaries.filter((_, beneficiaryIndex) => beneficiaryIndex !== index),
      };
    });
  };

  const cancelEdit = () => {
    setEditable(member);
    setIsEditing(false);
    setNotice(null);
  };

  const saveMember = async () => {
    if (!editable) {
      return;
    }

    if (!editable.firstName || !editable.lastName || !editable.idNumber || !editable.phone) {
      setNotice('First name, last name, ID number, and phone are required.');
      return;
    }

    const sanitizedDependants = editable.dependants.filter((dependant) => dependant.firstName && dependant.lastName);
    const sanitizedBeneficiaries = editable.beneficiaries.filter((beneficiary) => beneficiary.firstName && beneficiary.lastName);

    try {
      setSaving(true);
      setNotice(null);

      const updated = await updateMember(member.id, {
        branchId: editable.branchId,
        firstName: editable.firstName,
        lastName: editable.lastName,
        idNumber: editable.idNumber,
        phone: editable.phone,
        email: editable.email,
        address: editable.address,
        city: editable.city,
        province: editable.province,
        joinDate: editable.joinDate,
        status: editable.status,
        dependants: sanitizedDependants,
        beneficiaries: sanitizedBeneficiaries,
      });

      setMember(updated);
      setEditable(updated);
      setIsEditing(false);
      setNotice('Member profile updated successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

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
        {canEditMember && (
          <div className="ml-auto flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={cancelEdit} className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1">
                  <X size={14} /> Cancel
                </button>
                <button disabled={saving} onClick={() => void saveMember()} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60 flex items-center gap-1">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => { setIsEditing(true); setNotice(null); }} className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1">
                <Pencil size={14} /> Edit Member
              </button>
            )}
          </div>
        )}
      </div>

      {notice && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Contact */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Contact Details</h3>
          {isEditing ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <input value={editState.firstName} onChange={(event) => updateEditableField('firstName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="First name" />
                <input value={editState.lastName} onChange={(event) => updateEditableField('lastName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Last name" />
              </div>
              <input value={editState.idNumber} onChange={(event) => updateEditableField('idNumber', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ID number" />
              <input value={editState.phone} onChange={(event) => updateEditableField('phone', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" />
              <input value={editState.email} onChange={(event) => updateEditableField('email', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" />
              <input value={editState.address} onChange={(event) => updateEditableField('address', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Address" />
              <div className="grid grid-cols-2 gap-2">
                <input value={editState.city} onChange={(event) => updateEditableField('city', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="City" />
                <input value={editState.province} onChange={(event) => updateEditableField('province', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Province" />
              </div>
              <select value={editState.status} onChange={(event) => updateEditableField('status', event.target.value as Member['status'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Phone size={16} />{member.phone}</div>
              <div className="flex items-center gap-2 text-slate-600"><Mail size={16} />{member.email}</div>
              <div className="flex items-center gap-2 text-slate-600"><MapPin size={16} />{member.address}, {member.city}, {member.province}</div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} />Joined: {member.joinDate}</div>
            </div>
          )}
        </div>

        {/* Dependants */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Dependants ({editState.dependants.length})</h3>
            {isEditing && (
              <button onClick={addDependant} className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            )}
          </div>
          {editState.dependants.length === 0 ? (
            <p className="text-sm text-slate-400">No dependants</p>
          ) : (
            <div className="space-y-2">
              {editState.dependants.map((dependant, index) => (
                <div key={dependant.id} className="text-sm py-2 border-b border-slate-100 last:border-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={dependant.firstName} onChange={(event) => updateDependant(index, 'firstName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="First name" />
                        <input value={dependant.lastName} onChange={(event) => updateDependant(index, 'lastName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Last name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={dependant.relationship} onChange={(event) => updateDependant(index, 'relationship', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Relationship" />
                        <input value={dependant.dateOfBirth} onChange={(event) => updateDependant(index, 'dateOfBirth', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="YYYY-MM-DD" />
                      </div>
                      <input value={dependant.idNumber} onChange={(event) => updateDependant(index, 'idNumber', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="ID number" />
                      <button onClick={() => removeDependant(index)} className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{dependant.firstName} {dependant.lastName}</div>
                      <div className="text-xs text-slate-400">{dependant.relationship} • DOB: {dependant.dateOfBirth}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Beneficiaries */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Beneficiaries ({editState.beneficiaries.length})</h3>
            {isEditing && (
              <button onClick={addBeneficiary} className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            )}
          </div>
          {editState.beneficiaries.length === 0 ? (
            <p className="text-sm text-slate-400">No beneficiaries</p>
          ) : (
            <div className="space-y-2">
              {editState.beneficiaries.map((beneficiary, index) => (
                <div key={beneficiary.id} className="text-sm py-2 border-b border-slate-100 last:border-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={beneficiary.firstName} onChange={(event) => updateBeneficiary(index, 'firstName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="First name" />
                        <input value={beneficiary.lastName} onChange={(event) => updateBeneficiary(index, 'lastName', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Last name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={beneficiary.relationship} onChange={(event) => updateBeneficiary(index, 'relationship', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Relationship" />
                        <input type="number" value={beneficiary.percentage} onChange={(event) => updateBeneficiary(index, 'percentage', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Percentage" min={0} max={100} />
                      </div>
                      <input value={beneficiary.idNumber} onChange={(event) => updateBeneficiary(index, 'idNumber', event.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="ID number" />
                      <button onClick={() => removeBeneficiary(index)} className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{beneficiary.firstName} {beneficiary.lastName}</div>
                      <div className="text-xs text-slate-400">{beneficiary.relationship} • {beneficiary.percentage}%</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText size={18} /> Policies ({memberPolicies.length})</h3>
        <div className="table-scroll">
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
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Wallet size={18} /> Payment History</h3>
        <div className="table-scroll">
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

