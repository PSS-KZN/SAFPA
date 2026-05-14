import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { CommunicationTemplate } from '../../types';
import { createTemplate, fetchTemplates, updateTemplate } from '../../services/templatesApi';

const triggerLabels: Record<CommunicationTemplate['trigger'], string> = {
  payment_reminder: 'Payment Reminder',
  payment_receipt: 'Payment Receipt',
  payment_failed_notice: 'Payment Failed Notice',
  policy_activated: 'Policy Activated',
  policy_lapsed: 'Policy Lapsed',
  policy_suspended: 'Policy Suspended',
  policy_reinstated: 'Policy Reinstated',
  policy_cancelled: 'Policy Cancelled',
  funeral_case_update: 'Funeral Case Update',
  welcome: 'Welcome',
  custom: 'Custom',
};

type TemplateFormState = {
  name: string;
  type: CommunicationTemplate['type'];
  trigger: CommunicationTemplate['trigger'];
  subject: string;
  body: string;
  isActive: boolean;
};

const initialForm: TemplateFormState = {
  name: '',
  type: 'sms',
  trigger: 'custom',
  subject: '',
  body: '',
  isActive: true,
};

const notes = [
  'Use custom templates for ad hoc staff messaging and reusable outreach.',
  'Keep SMS concise and reserve subjects for email only.',
  'Preserve active status only for templates ready to send immediately.',
];

export default function TemplateEditor() {
  const { id } = useParams();
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const isEditing = Boolean(id);
  const [form, setForm] = useState<TemplateFormState>(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchTemplates(parlourId);
        const existing = records.find((template) => template.id === id);

        if (!existing) {
          setError('Template not found.');
          return;
        }

        setForm({
          name: existing.name,
          type: existing.type,
          trigger: existing.trigger,
          subject: existing.subject || '',
          body: existing.body,
          isActive: existing.isActive,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    void loadTemplate();
  }, [id, parlourId]);

  const updateForm = <K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveTemplate = async () => {
    if (!form.name || !form.body) {
      setError('Please complete the template name and body before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (id) {
        await updateTemplate(id, {
          name: form.name,
          type: form.type,
          trigger: form.trigger,
          subject: form.type === 'email' ? form.subject || undefined : undefined,
          body: form.body,
          isActive: form.isActive,
          lastUpdated: new Date().toISOString().slice(0, 10),
        });
      } else {
        const stamp = new Date().toISOString().slice(0, 10);
        await createTemplate({
          parlourId,
          name: form.name,
          type: form.type,
          trigger: form.trigger,
          subject: form.type === 'email' ? form.subject || undefined : undefined,
          body: form.body,
          isActive: form.isActive,
          createdAt: stamp,
          lastUpdated: stamp,
        });
      }

      navigate('/parlour/comm-templates');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/parlour/comm-templates" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Templates
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <MessageSquare size={14} /> Communication Setup
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{isEditing ? 'Edit Template' : 'New Template'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move template editing out of inline controls so message content and activation status are easier to review.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading template...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Template Details</h2>
              <p className="mt-1 text-sm text-slate-500">Configure the message type, trigger, and template body.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Template Name*</label>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Type*</label>
                <select value={form.type} onChange={(event) => updateForm('type', event.target.value as CommunicationTemplate['type'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Trigger*</label>
                <select value={form.trigger} onChange={(event) => updateForm('trigger', event.target.value as CommunicationTemplate['trigger'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {form.type === 'email' && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-slate-600">Subject</label>
                  <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Body*</label>
                <textarea value={form.body} onChange={(event) => updateForm('body', event.target.value)} className="min-h-40 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono" />
              </div>
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} />
                  Template is active and available for sending
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/parlour/comm-templates" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
              <button onClick={() => void saveTemplate()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving Template...' : isEditing ? 'Save Template' : 'Create Template'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Notes</div>
            <h2 className="mt-4 text-xl font-semibold">Treat templates like reusable production content.</h2>
            <div className="mt-6 space-y-3">
              {notes.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}