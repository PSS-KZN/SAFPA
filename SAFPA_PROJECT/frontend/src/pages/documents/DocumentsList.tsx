import { useRole } from '../../contexts/RoleContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Upload, Search, Eye, Trash2, File } from 'lucide-react';
import type { Document } from '../../types';
import { deleteDocument, fetchDocuments, getDocumentDownloadUrl, uploadDocumentFile } from '../../services/documentsApi';
import { fetchMembers } from '../../services/membersApi';
import { fetchPolicies } from '../../services/policiesApi';
import { fetchFuneralCases } from '../../services/funeralCasesApi';

const typeLabels: Record<string, string> = {
  id_copy: 'ID Copy',
  death_certificate: 'Death Certificate',
  proof_of_address: 'Proof of Address',
  policy_document: 'Policy Document',
  receipt: 'Receipt',
  burial_order: 'Burial Order',
  consent_form: 'Consent Form',
  other: 'Other',
};

const typeColors: Record<string, string> = {
  id_copy: 'bg-red-100 text-red-700',
  death_certificate: 'bg-red-100 text-red-700',
  proof_of_address: 'bg-amber-100 text-amber-700',
  policy_document: 'bg-violet-100 text-violet-700',
  receipt: 'bg-green-100 text-green-700',
  burial_order: 'bg-orange-100 text-orange-700',
  consent_form: 'bg-cyan-100 text-cyan-700',
  other: 'bg-slate-100 text-slate-600',
};

const entityLabels: Record<string, string> = {
  member: 'Member',
  policy: 'Policy',
  funeral_case: 'Funeral Case',
};

const entityTypesByRole: Partial<Record<string, Document['entityType'][]>> = {
  operations_coordinator: ['funeral_case'],
  policy_admin: ['member', 'policy'],
};

export default function DocumentsList() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const allowedEntityTypes = entityTypesByRole[currentUser.role] || ['member', 'policy', 'funeral_case'];
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterEntityId, setFilterEntityId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [entityOptions, setEntityOptions] = useState<Array<{ id: string; label: string; entityType: Document['entityType'] }>>([]);
  const [uploadEntityType, setUploadEntityType] = useState<Document['entityType']>('member');
  const [uploadEntityId, setUploadEntityId] = useState<string>('');
  const [uploadType, setUploadType] = useState<Document['type']>('other');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [records, members, policies, funeralCases] = await Promise.all([
        fetchDocuments({ parlourId }),
        fetchMembers(parlourId),
        fetchPolicies(parlourId),
        fetchFuneralCases(parlourId),
      ]);
      setDocuments(records);

      const options: Array<{ id: string; label: string; entityType: Document['entityType'] }> = [
        ...members.map((member) => ({ id: member.id, label: `${member.firstName} ${member.lastName}`, entityType: 'member' as const })),
        ...policies.map((policy) => ({ id: policy.id, label: policy.policyNumber, entityType: 'policy' as const })),
        ...funeralCases.map((funeralCase) => ({ id: funeralCase.id, label: funeralCase.caseNumber, entityType: 'funeral_case' as const })),
      ].filter((option) => allowedEntityTypes.includes(option.entityType));
      setEntityOptions(options);
      if (!uploadEntityId && options.length > 0) {
        setUploadEntityType(options[0].entityType);
        setUploadEntityId(options[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [allowedEntityTypes, parlourId, uploadEntityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parlourDocs = documents.filter((doc) => allowedEntityTypes.includes(doc.entityType));

  const entityLabelById = useMemo(() => {
    return new Map(entityOptions.map((item) => [`${item.entityType}:${item.id}`, item.label]));
  }, [entityOptions]);

  const getEntityName = (entityType: string, entityId: string): string => {
    return entityLabelById.get(`${entityType}:${entityId}`) || entityId;
  };

  const filtered = parlourDocs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      getEntityName(d.entityType, d.entityId).toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === 'all' || d.entityType === filterEntity;
    const matchEntityId = filterEntityId === 'all' || d.entityId === filterEntityId;
    const matchType = filterType === 'all' || d.type === filterType;
    return matchSearch && matchEntity && matchEntityId && matchType;
  });

  const allTypes = Array.from(new Set(parlourDocs.map((d) => d.type)));

  const uploadDocumentFromFile = async (file: File) => {
    if (!uploadEntityId) {
      setError('Select an entity before uploading a file.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await uploadDocumentFile({
        parlourId,
        file,
        type: uploadType,
        entityType: uploadEntityType,
        entityId: uploadEntityId,
        uploadedBy: currentUser.name,
      });
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (id: string) => {
    try {
      setError(null);
      await deleteDocument(id);
      setDocuments((previous) => previous.filter((doc) => doc.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete document');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and manage documents linked to {allowedEntityTypes.map((type) => entityLabels[type]).join(', ').toLowerCase()}</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadDocumentFromFile(file);
          }
          event.currentTarget.value = '';
        }}
      />

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading documents...</div>}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {allowedEntityTypes.map((et) => {
          const count = parlourDocs.filter((d) => d.entityType === et).length;
          return (
            <div key={et} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 capitalize mb-1">{entityLabels[et]} Documents</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Total Documents</p>
          <p className="text-2xl font-bold">{parlourDocs.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={filterEntity}
          onChange={(e) => {
            setFilterEntity(e.target.value);
            setFilterEntityId('all');
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Entity Types</option>
          {allowedEntityTypes.includes('member') && <option value="member">Members</option>}
          {allowedEntityTypes.includes('policy') && <option value="policy">Policies</option>}
          {allowedEntityTypes.includes('funeral_case') && <option value="funeral_case">Funeral Cases</option>}
        </select>
        <select value={filterEntityId} onChange={(e) => setFilterEntityId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none">
          <option value="all">All Linked Records</option>
          {entityOptions
            .filter((option) => filterEntity === 'all' || option.entityType === filterEntity)
            .map((option) => (
              <option key={`${option.entityType}-${option.id}`} value={option.id}>
                {entityLabels[option.entityType]}: {option.label}
              </option>
            ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Document Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{typeLabels[t] || t}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        <select
          value={uploadEntityType}
          onChange={(e) => {
            const nextType = e.target.value as Document['entityType'];
            setUploadEntityType(nextType);
            const firstMatch = entityOptions.find((option) => option.entityType === nextType);
            setUploadEntityId(firstMatch?.id || '');
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          {allowedEntityTypes.includes('member') && <option value="member">Member</option>}
          {allowedEntityTypes.includes('policy') && <option value="policy">Policy</option>}
          {allowedEntityTypes.includes('funeral_case') && <option value="funeral_case">Funeral Case</option>}
        </select>
        <select
          value={uploadEntityId}
          onChange={(e) => setUploadEntityId(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          {entityOptions
            .filter((option) => option.entityType === uploadEntityType)
            .map((option) => (
              <option key={`${option.entityType}-${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          {entityOptions.filter((option) => option.entityType === uploadEntityType).length === 0 && (
            <option value="">No entities available</option>
          )}
        </select>
        <select value={uploadType} onChange={(e) => setUploadType(e.target.value as Document['type'])} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="id_copy">ID Copy</option>
          <option value="death_certificate">Death Certificate</option>
          <option value="proof_of_address">Proof of Address</option>
          <option value="policy_document">Policy Document</option>
          <option value="receipt">Receipt</option>
          <option value="burial_order">Burial Order</option>
          <option value="consent_form">Consent Form</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Linked To</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Uploaded By</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <File size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-xs font-mono truncate max-w-[200px]" title={d.name}>{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[d.type] || typeColors.other}`}>
                    {typeLabels[d.type] || d.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 bg-slate-100 rounded capitalize">{entityLabels[d.entityType]}</span>
                </td>
                <td className="px-4 py-3 font-medium">{getEntityName(d.entityType, d.entityId)}</td>
                <td className="px-4 py-3 text-slate-500">{d.uploadedBy}</td>
                <td className="px-4 py-3 text-slate-500">{d.uploadedAt}</td>
                <td className="px-4 py-3 text-slate-400">{d.size}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={getDocumentDownloadUrl(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="View" target="_blank" rel="noreferrer"><Eye size={15} /></a>
                    <button onClick={() => void removeDocument(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No documents found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload prompt */}
      <div className="mt-6 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
        <FileText size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium mb-1">Upload a new document</p>
        <p className="text-xs text-slate-400 mb-4">PDF, JPG or PNG · Max 10 MB · Linked to {allowedEntityTypes.map((type) => entityLabels[type]).join(', ').toLowerCase()}</p>
        <button onClick={() => fileInputRef.current?.click()} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-700">
          Choose File
        </button>
      </div>
    </div>
  );
}

