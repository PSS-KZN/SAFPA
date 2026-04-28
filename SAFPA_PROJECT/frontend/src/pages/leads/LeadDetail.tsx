import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, User, Tag } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '../../types';
import { convertLead, fetchLeads, updateLeadStatus } from '../../services/leadsApi';

const statusColors: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-violet-100 text-violet-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-slate-100 text-slate-600',
};

export default function LeadDetail() {
  const { currentUser } = useRole();
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchLeads(parlourId);
        const found = records.find((item) => item.id === id) || null;

        if (found && currentUser.role === 'branch_manager' && currentUser.branchId && found.branchId !== currentUser.branchId) {
          setLead(null);
          return;
        }

        setLead(found);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, parlourId, currentUser.role, currentUser.branchId]);

  const canConvert = useMemo(() => lead?.status !== 'converted' && lead?.status !== 'lost', [lead]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading lead...</div>;
  }

  if (!lead) {
    return <div className="text-center py-12 text-slate-500">Lead not found</div>;
  }

  const handleStatus = async (status: Lead['status']) => {
    try {
      setBusy(true);
      setError(null);
      const updated = await updateLeadStatus(lead.id, status);
      setLead(updated);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update lead status');
    } finally {
      setBusy(false);
    }
  };

  const handleConvert = async () => {
    try {
      setBusy(true);
      setError(null);
      const result = await convertLead(lead.id, {
        branchId: lead.branchId,
        createPolicy: false,
      });
      setLead(result.lead);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : 'Failed to convert lead');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/leads" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Leads
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{lead.firstName} {lead.lastName}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>{lead.status}</span>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

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
            <button disabled={busy || lead.status === 'contacted'} onClick={() => void handleStatus('contacted')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">Mark as Contacted</button>
            <button disabled={busy || !canConvert} onClick={() => void handleConvert()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60">Convert to Member</button>
            <button disabled={busy || lead.status === 'lost'} onClick={() => void handleStatus('lost')} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300 disabled:opacity-60">Mark as Lost</button>
          </div>
        </div>
      </div>
    </div>
  );
}

