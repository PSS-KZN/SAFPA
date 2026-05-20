import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';
import type { Parlour } from '../../types';
import { createParlour } from '../../services/parloursApi';

type ParlourFormState = {
  name: string;
  region: string;
  province: string;
  tier: Parlour['tier'];
  ownerName: string;
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
};

const initialForm: ParlourFormState = {
  name: '',
  region: '',
  province: '',
  tier: 'basic',
  ownerName: '',
  contactEmail: '',
  contactPhone: '',
  primaryColor: '#1e3a5f',
};

const onboardingChecklist = [
  'Create the tenant profile and initial branding.',
  'Review contact details and assign the first owner.',
  'Continue onboarding from the parlour detail page after save.',
];

export default function AddParlour() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ParlourFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = <K extends keyof ParlourFormState>(field: K, value: ParlourFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const submit = async () => {
    if (!form.name || !form.region || !form.province || !form.ownerName || !form.contactEmail || !form.contactPhone) {
      setError('Please complete all required fields before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const created = await createParlour(form);
      const params = new URLSearchParams({
        ownerEmail: created.ownerUser.email,
        ownerName: created.ownerUser.name,
      });
      navigate(`/safpa/parlours/${created.parlour.id}?${params.toString()}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create parlour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/safpa/parlours" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Parlours
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
            <Building2 size={14} /> SAFPA Admin
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Add a New Parlour</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Use a full screen onboarding form instead of a cramped popup. Save the basic tenant details here, then continue setup from the parlour profile.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tenant Setup</h2>
              <p className="mt-1 text-sm text-slate-500">Capture the operational details needed to create the parlour account.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Default status</div>
              <div className="text-sm font-semibold text-amber-700">Onboarding</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Parlour Name*</label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Example: Sunrise Funeral Home"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Region*</label>
              <input
                value={form.region}
                onChange={(e) => updateForm('region', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Example: Highveld"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Province*</label>
              <input
                value={form.province}
                onChange={(e) => updateForm('province', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Example: Gauteng"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Subscription Tier*</label>
              <select
                value={form.tier}
                onChange={(e) => updateForm('tier', e.target.value as Parlour['tier'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Owner Name*</label>
              <input
                value={form.ownerName}
                onChange={(e) => updateForm('ownerName', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Example: Thandi Mokoena"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Primary Brand Color*</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-300 px-3 py-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => updateForm('primaryColor', e.target.value)}
                  className="h-9 w-12 rounded-lg border border-slate-200 bg-transparent p-1"
                />
                <span className="text-sm font-medium text-slate-600">{form.primaryColor.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Owner Login Email*</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateForm('contactEmail', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="owner@parlour.co.za"
              />
              <p className="mt-1 text-xs text-slate-400">This email becomes the initial owner sign-in. Demo password: demo123.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Contact Phone*</label>
              <input
                value={form.contactPhone}
                onChange={(e) => updateForm('contactPhone', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="011 234 5678"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link to="/safpa/parlours" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">
              Cancel
            </Link>
            <button
              onClick={() => void submit()}
              disabled={saving}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Creating Parlour...' : 'Create Parlour'}
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
            Next steps
          </div>
          <h2 className="mt-4 text-xl font-semibold">Keep onboarding moving after the first save.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            The creation screen now gives the form room for larger fields, clearer actions, and a direct handoff into the detailed setup workflow.
          </p>

          <div className="mt-6 space-y-3">
            {onboardingChecklist.map((item) => (
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