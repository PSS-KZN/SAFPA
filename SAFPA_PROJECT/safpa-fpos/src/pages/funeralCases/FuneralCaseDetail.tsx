import { useParams, Link } from 'react-router-dom';
import { funeralCases } from '../../data/funeralCases';
import { documents } from '../../data/documents';
import { ArrowLeft, Calendar, MapPin, User, FileText, CheckSquare, Square, Upload, File, Users, Truck, Building2, MessageSquare } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  logged: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

export default function FuneralCaseDetail() {
  const { id } = useParams();
  const fc = funeralCases.find((c) => c.id === id);
  const [tasks, setTasks] = useState(fc?.tasks || []);
  const caseDocs = documents.filter((d) => d.entityType === 'funeral_case' && d.entityId === id);

  const typeLabels: Record<string, string> = {
    death_certificate: 'Death Certificate',
    burial_order: 'Burial Order',
    id_copy: 'ID Copy',
    policy_document: 'Policy Document',
    other: 'Other',
  };

  const typeColors: Record<string, string> = {
    death_certificate: 'bg-red-100 text-red-700',
    burial_order: 'bg-orange-100 text-orange-700',
    id_copy: 'bg-red-100 text-red-700',
    policy_document: 'bg-violet-100 text-violet-700',
    other: 'bg-slate-100 text-slate-600',
  };

  if (!fc) return <div className="text-center py-12 text-slate-500">Case not found</div>;

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <Link to="/funeral-cases" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Cases
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{fc.caseNumber}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[fc.status]}`}>{fc.status.replace('_', ' ')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Case Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Deceased Information</h3>
          <div className="space-y-2 text-sm">
            <div className="font-medium text-lg">{fc.deceasedName}</div>
            <div className="text-slate-500 font-mono text-xs">ID: {fc.deceasedIdNumber}</div>
            <div className="flex items-center gap-2 text-slate-600 mt-3"><Calendar size={16} /> Date of Death: {fc.dateOfDeath}</div>
            {fc.funeralDate && <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> Funeral Date: {fc.funeralDate}</div>}
            {fc.venue && <div className="flex items-center gap-2 text-slate-600"><MapPin size={16} /> {fc.venue}</div>}
            <div className="flex items-center gap-2 text-slate-600"><User size={16} /> Coordinator: {fc.coordinatorName}</div>
            <div className="flex items-center gap-2 text-slate-600"><FileText size={16} /> Type: <span className="capitalize">{fc.caseType}</span></div>
          </div>
          {fc.policyNumber && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600">Linked Policy: <Link to={`/policies/${fc.policyId}`} className="font-mono font-medium hover:underline">{fc.policyNumber}</Link></p>
            </div>
          )}
        </div>

        {/* Task Checklist */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Task Checklist</h3>
            <span className="text-sm text-slate-500">{completedCount}/{tasks.length} complete</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full mb-4">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} />
          </div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} onClick={() => toggleTask(t.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${t.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                {t.completed ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-slate-400" />}
                <div className="flex-1">
                  <span className={`text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.assignee && <span>Assigned to {t.assignee}</span>}
                    {t.dueDate && <span className="ml-2">Due: {t.dueDate}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-red-600 hover:text-red-800">+ Add Task</button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-semibold mb-4">Notes</h3>
        <div className="space-y-2 mb-4">
          {fc.notes.map((n, i) => (
            <div key={i} className="text-sm p-3 bg-slate-50 rounded-lg">{n}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Add a note..." className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Add</button>
        </div>
      </div>

      {/* Resources & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Staff assigned */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Staff Assigned</h3>
          <div className="space-y-2 mb-4">
            {[
              { name: fc.coordinatorName, role: 'Coordinator' },
              { name: 'Thabo Mokoena', role: 'Pallbearer Lead' },
              { name: 'Zanele Mkhize', role: 'Family Liaison' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.role}</div>
                </div>
                <button className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
            ))}
          </div>
          <button className="text-sm text-red-600 hover:text-red-800">+ Assign Staff</button>
        </div>

        {/* Vehicles */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Truck size={16} /> Vehicles</h3>
          <div className="space-y-2 mb-4">
            {[
              { reg: 'GP 123-456', type: 'Hearse', driver: 'Solomon Dube' },
              { reg: 'GP 789-012', type: 'Family Car', driver: 'TBC' },
            ].map((v, i) => (
              <div key={i} className="text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.reg}</div>
                    <div className="text-xs text-slate-400">{v.type} · {v.driver}</div>
                  </div>
                  <button className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <button className="text-sm text-red-600 hover:text-red-800">+ Assign Vehicle</button>
        </div>

        {/* Suppliers */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 size={16} /> Suppliers</h3>
          <div className="space-y-2 mb-4">
            {[
              { name: 'Graceland Coffins', service: 'Coffin Supply', status: 'confirmed' },
              { name: 'Divine Flowers', service: 'Floral Arrangements', status: 'pending' },
            ].map((s, i) => (
              <div key={i} className="text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.service}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="text-sm text-red-600 hover:text-red-800">+ Add Supplier</button>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><FileText size={16} /> Documents ({caseDocs.length})</h3>
          <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-lg">
            <Upload size={14} /> Upload
          </button>
        </div>
        {caseDocs.length > 0 ? (
          <div className="space-y-2">
            {caseDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <File size={16} className="text-slate-400" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-slate-400">Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>
                  {typeLabels[doc.type] || doc.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">No documents uploaded for this case yet</div>
        )}
        <div className="mt-4 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400 hover:border-red-300 cursor-pointer transition-colors">
          Drop files here or <span className="text-red-600">browse</span> · PDF, JPG, PNG up to 10 MB
        </div>
      </div>

      {/* Communication log */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare size={16} /> Communication Log</h3>
        <div className="space-y-2 mb-4">
          {[
            { type: 'SMS', recipient: 'Nomsa Ndlovu (family)', msg: 'Dear family, case FC-2026-001 has been assigned. Your coordinator is ' + fc.coordinatorName + '.', date: fc.createdAt },
            { type: 'SMS', recipient: 'Nomsa Ndlovu (family)', msg: 'Update: Documentation received. Funeral scheduled for ' + (fc.funeralDate || 'TBC') + '.', date: fc.funeralDate || '' },
          ].filter((c) => c.date).map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${c.type === 'SMS' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>{c.type}</span>
              <div className="flex-1">
                <div className="font-medium text-xs text-slate-500 mb-0.5">To: {c.recipient} · {c.date}</div>
                <div className="text-slate-700">{c.msg}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800">
          <MessageSquare size={14} /> Send Communication
        </button>
      </div>
    </div>
  );
}

