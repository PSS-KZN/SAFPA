import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Wallet } from 'lucide-react';
import type { SubscriptionPlan } from '../../types';
import {
  createSubscription,
  fetchSubscriptions,
  updateSubscription,
  type CreateSubscriptionInput,
} from '../../services/subscriptionsApi';

interface SubscriptionForm {
  tier: SubscriptionPlan['tier'];
  name: string;
  amount: number;
  description: string;
  isActive: boolean;
}

const initialFormState: SubscriptionForm = {
  tier: 'basic',
  name: '',
  amount: 0,
  description: '',
  isActive: true,
};

const guidance = [
  'Keep one active record per tier so parlour assignments stay predictable.',
  'Update the plan amount here and all future parlour assignments will use it.',
  'Deactivate plans you want hidden from new parlour assignments.',
];

export default function SubscriptionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const returnTo = searchParams.get('returnTo') || '/safpa/subscriptions';
  const backLabel = 'Back to Subscriptions';
  const [form, setForm] = useState<SubscriptionForm>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (id) {
          const subscriptions = await fetchSubscriptions();
          const existing = subscriptions.find((subscription) => subscription.id === id);

          if (!existing) {
            setError('Subscription not found.');
            return;
          }

          setForm({
            tier: existing.tier,
            name: existing.name,
            amount: existing.amount,
            description: existing.description || '',
            isActive: existing.isActive,
          });
          return;
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load subscription form');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const onChange = <K extends keyof SubscriptionForm>(field: K, value: SubscriptionForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Plan name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && id) {
        await updateSubscription(id, {
          name: form.name,
          amount: form.amount,
          description: form.description || undefined,
          isActive: form.isActive,
        });
      } else {
        const payload: CreateSubscriptionInput = {
          tier: form.tier,
          name: form.name,
          amount: form.amount,
          description: form.description || undefined,
          isActive: form.isActive,
        };

        await createSubscription(payload);
      }

      navigate(returnTo);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={returnTo} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> {backLabel}
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
            <Wallet size={14} /> SAFPA Billing
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{isEditing ? 'Edit Subscription' : 'Create Subscription'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Move subscription work out of the popup and into a full screen form so pricing, dates, and status changes are easier to review.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading subscription form...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Subscription Details</h2>
                <p className="mt-1 text-sm text-slate-500">Maintain the plan catalog that parlour billing records inherit from.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Tier*</label>
                <select disabled={isEditing} value={form.tier} onChange={(event) => onChange('tier', event.target.value as SubscriptionPlan['tier'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Plan Name*</label>
                <input value={form.name} onChange={(event) => onChange('name', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Amount (ZAR)*</label>
                <input type="number" min={0} value={form.amount} onChange={(event) => onChange('amount', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Status</label>
                <select value={form.isActive ? 'active' : 'inactive'} onChange={(event) => onChange('isActive', event.target.value === 'active')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Description</label>
                <textarea value={form.description} onChange={(event) => onChange('description', event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Optional summary for this subscription tier" />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to={returnTo} className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">
                Cancel
              </Link>
              <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving Subscription...' : isEditing ? 'Save Changes' : 'Create Subscription'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
              Guidance
            </div>
            <h2 className="mt-4 text-xl font-semibold">Keep subscription changes readable and controlled.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This screen gives admin billing actions the same dedicated workflow as parlour setup, with clearer review space for dates, status, and notes.
            </p>

            <div className="mt-6 space-y-3">
              {guidance.map((item) => (
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