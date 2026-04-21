import { useParams, Link } from 'react-router-dom';
import { leads } from '../../data/leads';
import { ArrowLeft, Phone, Mail, Calendar, User, Tag } from 'lucide-react';

const statusColors: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-violet-100 text-violet-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-slate-100 text-slate-600',
};

export default function LeadDetail() {
  const { id } = useParams();
  const lead = leads.find((l) => l.id === id);
  if (!lead) return <div className="text-center py-12 text-slate-500">Lead not found</div>;

  return (
    <div>
      <Link to="/leads" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Leads
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{lead.firstName} {lead.lastName}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>{lead.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Contact Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Phone size={16} /> {lead.phone}</div>
            {lead.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={16} /> {lead.email}</div>}
            <div className="flex items-center gap-2 text-slate-600"><Tag size={16} /> Source: <span className="capitalize">{lead.source}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> Created: {lead.createdAt}</div>
            {lead.assignedTo && <div className="flex items-center gap-2 text-slate-600"><User size={16} /> Assigned to: {lead.assignedTo}</div>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Notes</h3>
          <p className="text-sm text-slate-500">{lead.notes || 'No notes added yet.'}</p>
          <textarea className="w-full mt-4 px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3} placeholder="Add a note..." />
          <button className="mt-2 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700">Save Note</button>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Mark as Contacted</button>
            <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">Convert to Member</button>
            <button className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300">Mark as Lost</button>
          </div>
        </div>
      </div>
    </div>
  );
}

