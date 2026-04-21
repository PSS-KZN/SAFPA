import { documents } from '../../data/documents';
import { members } from '../../data/members';
import { policies } from '../../data/policies';
import { funeralCases } from '../../data/funeralCases';
import { useRole } from '../../contexts/RoleContext';
import { useState } from 'react';
import { FileText, Upload, Search, Eye, Trash2, File } from 'lucide-react';

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

function getEntityName(entityType: string, entityId: string): string {
  if (entityType === 'member') {
    const m = members.find((x) => x.id === entityId);
    return m ? `${m.firstName} ${m.lastName}` : entityId;
  }
  if (entityType === 'policy') {
    const p = policies.find((x) => x.id === entityId);
    return p ? p.policyNumber : entityId;
  }
  if (entityType === 'funeral_case') {
    const fc = funeralCases.find((x) => x.id === entityId);
    return fc ? fc.caseNumber : entityId;
  }
  return entityId;
}

export default function DocumentsList() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const parlourDocs = documents.filter((d) => d.parlourId === parlourId);

  const filtered = parlourDocs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      getEntityName(d.entityType, d.entityId).toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === 'all' || d.entityType === filterEntity;
    const matchType = filterType === 'all' || d.type === filterType;
    return matchSearch && matchEntity && matchType;
  });

  const allTypes = Array.from(new Set(parlourDocs.map((d) => d.type)));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and manage documents linked to members, policies, and funeral cases</p>
        </div>
        <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(['member', 'policy', 'funeral_case'] as const).map((et) => {
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
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Entity Types</option>
          <option value="member">Members</option>
          <option value="policy">Policies</option>
          <option value="funeral_case">Funeral Cases</option>
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
                    <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="View"><Eye size={15} /></button>
                    <button className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={15} /></button>
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
        <p className="text-xs text-slate-400 mb-4">PDF, JPG or PNG · Max 10 MB · Linked to a member, policy, or funeral case</p>
        <button className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-700">
          Choose File
        </button>
      </div>
    </div>
  );
}

