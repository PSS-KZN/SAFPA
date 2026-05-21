import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, File, FileText, HeartHandshake, Upload } from 'lucide-react';
import type { Document, FuneralCase } from '../../types';
import { fetchDocuments, uploadDocumentFile } from '../../services/documentsApi';
import { createFuneralCase, fetchFuneralCases } from '../../services/funeralCasesApi';
import { useCustomerPortal } from './customerPortalContext';

const docTypeLabels: Record<Document['type'], string> = {
  id_copy: 'ID Copy',
  death_certificate: 'Death Certificate',
  proof_of_address: 'Proof of Address',
  policy_document: 'Policy Document',
  receipt: 'Receipt',
  burial_order: 'Burial Order',
  consent_form: 'Consent Form',
  other: 'Other',
};

const docTypeColors: Record<Document['type'], string> = {
  id_copy: 'bg-red-100 text-red-700',
  death_certificate: 'bg-rose-100 text-rose-700',
  proof_of_address: 'bg-amber-100 text-amber-700',
  policy_document: 'bg-violet-100 text-violet-700',
  receipt: 'bg-emerald-100 text-emerald-700',
  burial_order: 'bg-orange-100 text-orange-700',
  consent_form: 'bg-cyan-100 text-cyan-700',
  other: 'bg-slate-100 text-slate-600',
};

const claimRequirements: Array<{ type: Document['type']; label: string; description: string }> = [
  { type: 'death_certificate', label: 'Death Certificate', description: 'Official death certificate for the deceased person covered by the claim.' },
  { type: 'id_copy', label: 'Claimant ID Copy', description: 'Certified ID or passport copy for the person submitting the claim.' },
  { type: 'proof_of_address', label: 'Proof of Address', description: 'Recent proof of address for claimant verification.' },
  { type: 'burial_order', label: 'Burial Order / Funeral Letter', description: 'Burial order, funeral letter, or funeral arrangement confirmation.' },
  { type: 'consent_form', label: 'Signed Consent Form', description: 'Any signed claim or consent paperwork requested by the parlour.' },
];

type ClaimFormState = {
  deceasedName: string;
  deceasedIdNumber: string;
  dateOfDeath: string;
  placeOfDeath: string;
  causeOfDeath: string;
  informantName: string;
  informantPhone: string;
};

const claimStatusColors: Record<FuneralCase['status'], string> = {
  logged: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-600',
};

export default function CustomerClaimsPage() {
  const { activePolicy, member, parlour } = useCustomerPortal();
  const [claimDocs, setClaimDocs] = useState<Document[]>([]);
  const [claims, setClaims] = useState<FuneralCase[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<Document['type']>('death_certificate');
  const [claimForm, setClaimForm] = useState<ClaimFormState>({
    deceasedName: '',
    deceasedIdNumber: '',
    dateOfDeath: '',
    placeOfDeath: '',
    causeOfDeath: '',
    informantName: '',
    informantPhone: '',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setClaimForm((previous) => ({
      ...previous,
      informantName: previous.informantName || `${member.firstName} ${member.lastName}`.trim(),
      informantPhone: previous.informantPhone || member.phone,
    }));
  }, [member.firstName, member.lastName, member.phone]);

  useEffect(() => {
    const loadClaimData = async () => {
      if (!activePolicy) {
        setClaimDocs([]);
        setClaims([]);
        setDocsLoading(false);
        setClaimsLoading(false);
        return;
      }

      try {
        setDocsLoading(true);
        setClaimsLoading(true);
        setError(null);
        const [documents, funeralCases] = await Promise.all([
          fetchDocuments({ parlourId: parlour.id, entityType: 'policy', entityId: activePolicy.id }),
          fetchFuneralCases(parlour.id),
        ]);

        setClaimDocs(documents);
        setClaims(
          funeralCases
            .filter((item) => item.caseType === 'policy' && (item.policyId === activePolicy.id || item.memberId === member.id))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load claim information');
      } finally {
        setDocsLoading(false);
        setClaimsLoading(false);
      }
    };

    void loadClaimData();
  }, [activePolicy, member.id, parlour.id]);

  const uploadedRequirementTypes = useMemo(() => new Set(claimDocs.map((doc) => doc.type)), [claimDocs]);
  const hasOpenClaim = useMemo(() => claims.some((claim) => !['completed', 'archived'].includes(claim.status)), [claims]);

  const uploadClaimDocument = async (file: File) => {
    if (!activePolicy) {
      setError('No active policy is available for claim uploads.');
      return;
    }

    try {
      setUploadingDoc(true);
      setError(null);
      setNotice(null);
      await uploadDocumentFile({
        parlourId: parlour.id,
        type: selectedDocType,
        entityType: 'policy',
        entityId: activePolicy.id,
        uploadedBy: `${member.firstName} ${member.lastName}`.trim(),
        file,
      });

      const refreshed = await fetchDocuments({ parlourId: parlour.id, entityType: 'policy', entityId: activePolicy.id });
      setClaimDocs(refreshed);
      setNotice(`${docTypeLabels[selectedDocType]} uploaded for ${activePolicy.policyNumber}.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload the claim document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const submitClaim = async () => {
    if (!activePolicy) {
      setError('No active policy is available for a claim.');
      return;
    }

    if (!claimForm.deceasedName || !claimForm.deceasedIdNumber || !claimForm.dateOfDeath || !claimForm.placeOfDeath || !claimForm.informantName || !claimForm.informantPhone) {
      setError('Complete the deceased and claimant details before submitting the claim.');
      return;
    }

    if (claimDocs.length === 0) {
      setError('Upload at least one supporting document before submitting the claim.');
      return;
    }

    try {
      setSubmittingClaim(true);
      setError(null);
      setNotice(null);
      const created = await createFuneralCase({
        parlourId: parlour.id,
        branchId: member.branchId,
        deceasedName: claimForm.deceasedName,
        deceasedIdNumber: claimForm.deceasedIdNumber,
        dateOfDeath: claimForm.dateOfDeath,
        deathNoticeLoggedAt: new Date().toISOString().slice(0, 10),
        deathNoticeLoggedBy: `Customer Portal - ${member.firstName} ${member.lastName}`.trim(),
        informantName: claimForm.informantName,
        informantPhone: claimForm.informantPhone,
        placeOfDeath: claimForm.placeOfDeath,
        causeOfDeath: claimForm.causeOfDeath || undefined,
        bodyCollected: false,
        bodyCollectionLocation: undefined,
        policyId: activePolicy.id,
        policyNumber: activePolicy.policyNumber,
        memberId: member.id,
        coordinatorId: 'u7',
        coordinatorName: 'Claims Desk',
        status: 'logged',
        funeralDate: undefined,
        venue: undefined,
        caseType: 'policy',
        tasks: [],
        notes: [`Claim submitted from customer portal for policy ${activePolicy.policyNumber}.`],
        staff: [],
        vehicles: [],
        suppliers: [],
        milestones: [],
        closedAt: undefined,
        closedBy: undefined,
        closureSummary: undefined,
        closureChecklistComplete: false,
        createdAt: new Date().toISOString().slice(0, 10),
      });

      setClaims((previous) => [created, ...previous]);
      setNotice(`Claim ${created.caseNumber} was submitted successfully. The parlour can now review your uploaded documents.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit the claim');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Start a Policy Claim</h2>
            <p className="mt-1 text-sm text-slate-500">Review your policy, upload supporting documents, then submit the claim to the parlour.</p>
          </div>
          {activePolicy && <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{activePolicy.policyNumber}</div>}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        {!activePolicy ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No active policy is linked to this customer profile, so a policy claim cannot be submitted yet.</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Policy Summary</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{activePolicy.productName}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="text-slate-400">Policy Number</div>
                    <div className="mt-1 font-medium text-slate-900">{activePolicy.policyNumber}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="text-slate-400">Cover Amount</div>
                    <div className="mt-1 font-medium text-slate-900">R{activePolicy.coverAmount.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900"><HeartHandshake size={16} /> Claim Details</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Deceased Full Name</label>
                    <input value={claimForm.deceasedName} onChange={(event) => setClaimForm((previous) => ({ ...previous, deceasedName: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Deceased ID Number</label>
                    <input value={claimForm.deceasedIdNumber} onChange={(event) => setClaimForm((previous) => ({ ...previous, deceasedIdNumber: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Date of Death</label>
                    <input type="date" value={claimForm.dateOfDeath} onChange={(event) => setClaimForm((previous) => ({ ...previous, dateOfDeath: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Place of Death</label>
                    <input value={claimForm.placeOfDeath} onChange={(event) => setClaimForm((previous) => ({ ...previous, placeOfDeath: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Claimant / Informant Name</label>
                    <input value={claimForm.informantName} onChange={(event) => setClaimForm((previous) => ({ ...previous, informantName: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Claimant / Informant Phone</label>
                    <input value={claimForm.informantPhone} onChange={(event) => setClaimForm((previous) => ({ ...previous, informantPhone: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-600">Cause of Death</label>
                    <input value={claimForm.causeOfDeath} onChange={(event) => setClaimForm((previous) => ({ ...previous, causeOfDeath: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Upload your documents first, then click Claim to send the case to the parlour.
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={() => void submitClaim()} disabled={submittingClaim || hasOpenClaim} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                    {hasOpenClaim ? 'Claim Already Submitted' : submittingClaim ? 'Submitting Claim...' : 'Claim'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 text-sm font-medium text-slate-900">Claim Document Checklist</div>
                <div className="space-y-3">
                  {claimRequirements.map((requirement) => {
                    const isUploaded = uploadedRequirementTypes.has(requirement.type);
                    return (
                      <div key={requirement.type} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{requirement.label}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{requirement.description}</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isUploaded ? 'Uploaded' : 'Needed'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-medium text-slate-900">Upload Supporting Document</div>
                <label className="mb-2 block text-sm text-slate-600">Document Type</label>
                <select value={selectedDocType} onChange={(event) => setSelectedDocType(event.target.value as Document['type'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  {claimRequirements.map((requirement) => (
                    <option key={requirement.type} value={requirement.type}>{requirement.label}</option>
                  ))}
                  <option value="other">Other Supporting Document</option>
                </select>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadClaimDocument(file);
                    }
                    event.currentTarget.value = '';
                  }}
                />

                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                  <Upload size={16} /> {uploadingDoc ? 'Uploading...' : 'Choose File'}
                </button>

                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Upload PDF, JPG, or PNG documents up to 10 MB. All documents below are the files currently attached to this claim request.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900"><FileText size={16} /> Claim Documents ({claimDocs.length})</div>
                {docsLoading ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading claim documents...</div>
                ) : claimDocs.length > 0 ? (
                  <div className="space-y-3">
                    {claimDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <File size={16} className="text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                            <div className="text-xs text-slate-500">Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}</div>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${docTypeColors[doc.type]}`}>{docTypeLabels[doc.type]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No claim documents have been uploaded for this policy yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Claim History</h2>
          <p className="mt-1 text-sm text-slate-500">Track claims already submitted for your policy and see where they are in the process.</p>
        </div>

        {claimsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading claim history...</div>
        ) : claims.length > 0 ? (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{claim.caseNumber}</div>
                    <div className="mt-1 text-sm text-slate-600">Deceased: {claim.deceasedName}</div>
                    <div className="mt-1 text-xs text-slate-500">Logged on {claim.deathNoticeLoggedAt} · Informant: {claim.informantName}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${claimStatusColors[claim.status]}`}>{claim.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No policy claims have been submitted from this portal yet.</div>
        )}
      </section>
    </div>
  );
}