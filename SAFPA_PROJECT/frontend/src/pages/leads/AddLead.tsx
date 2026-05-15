import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, PhoneCall } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { Lead, User } from '../../types';
import { createLead } from '../../services/leadsApi';
import { fetchUsers } from '../../services/usersApi';

type LeadFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  source: Lead['source'];
  assignedTo: string;
  notes: string;
};

const initialForm: LeadFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  source: 'website',
  assignedTo: '',
  notes: '',
};

const reminders = [
  'Capture the minimum contact details first so follow-up can happen quickly.',
  'Use notes for urgency, family context, or preferred callback windows.',
  'New leads should land in the detail screen for qualification work immediately after save.',
];

export default function AddLead() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const [form, setForm] = useState<LeadFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyAdmins, setPolicyAdmins] = useState<User[]>([]);

  const updateForm = <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    const loadPolicyAdmins = async () => {
      try {
        const users = await fetchUsers(parlourId);
        setPolicyAdmins(
          users.filter((user) => {
            if (user.role !== 'policy_admin' || user.status !== 'active') {
              return false;
            }

            if (!currentUser.branchId) {
              return true;
            }

            return !user.branchId || user.branchId === currentUser.branchId;
          })
        );
      } catch {
        setPolicyAdmins([]);
      }
    };

    void loadPolicyAdmins();
  }, [currentUser.branchId, parlourId]);

  const saveLead = async () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('Please complete first name, last name, and phone.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const created = await createLead({
        parlourId,
        branchId: currentUser.branchId || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
        source: form.source,
        status: 'new',
        assignedTo: form.assignedTo || undefined,
        notes: form.notes || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      });

      navigate(`/leads/${created.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/leads" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Leads
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <PhoneCall size={14} /> Lead Intake
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Add Lead</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move lead capture out of the popup so intake staff can record cleaner details and hand off faster.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
            <p className="mt-1 text-sm text-slate-500">Capture source, contact details, and any context needed for follow-up.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">First Name*</label>
              <input value={form.firstName} onChange={(event) => updateForm('firstName', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Last Name*</label>
              <input value={form.lastName} onChange={(event) => updateForm('lastName', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Phone*</label>
              <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Email</label>
              <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Source</label>
              <select value={form.source} onChange={(event) => updateForm('source', event.target.value as Lead['source'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="website">Website</option>
                <option value="branch">Branch</option>
                <option value="agent">Agent</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Assigned To</label>
              <select value={form.assignedTo} onChange={(event) => updateForm('assignedTo', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="">Unassigned</option>
                {policyAdmins.map((user) => (
                  <option key={user.id} value={user.name}>{user.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Notes</label>
              <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link to="/leads" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
            <button onClick={() => void saveLead()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving Lead...' : 'Create Lead'}
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Reminders</div>
          <h2 className="mt-4 text-xl font-semibold">Keep intake clear and actionable.</h2>
          <div className="mt-6 space-y-3">
            {reminders.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}