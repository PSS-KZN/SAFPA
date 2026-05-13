import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Wallet } from 'lucide-react';
import type { Parlour, ParlourSubscription } from '../../types';
import { fetchParlours } from '../../services/parloursApi';
import {
  createSubscription,
  fetchSubscriptions,
  updateSubscription,
  type CreateSubscriptionInput,
} from '../../services/subscriptionsApi';

interface SubscriptionForm {
  parlourId: string;
  tier: ParlourSubscription['tier'];
  status: ParlourSubscription['status'];
  billingCycle: ParlourSubscription['billingCycle'];
  amount: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes: string;
}

const initialFormState: SubscriptionForm = {
  parlourId: '',
  tier: 'basic',
  status: 'active',
  billingCycle: 'monthly',
  amount: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  autoRenew: true,
  notes: '',
};

const guidance = [
  'Select the tenant once and keep it locked during edits.',
  'Set billing and status clearly so finance changes are auditable.',
  'Use notes for exceptions like discounts, paused service, or manual approvals.',
];

export default function SubscriptionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<SubscriptionForm>(initialFormState);
  const [parlours, setParlours] = useState<Parlour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const parlourRows = await fetchParlours();
        setParlours(parlourRows);

        if (id) {
          const subscriptions = await fetchSubscriptions();
          const existing = subscriptions.find((subscription) => subscription.id === id);

          if (!existing) {
            setError('Subscription not found.');
            return;
          }

          setForm({
            parlourId: existing.parlourId,
            tier: existing.tier,
            status: existing.status,
            billingCycle: existing.billingCycle,
            amount: existing.amount,
            startDate: existing.startDate,
            endDate: existing.endDate || '',
            autoRenew: existing.autoRenew,
            notes: existing.notes || '',
          });
          return;
        }

        setForm((previous) => ({
          ...previous,
          parlourId: previous.parlourId || parlourRows[0]?.id || '',
        }));
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
    if (!form.parlourId || !form.startDate) {
      setError('Parlour and start date are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && id) {
        await updateSubscription(id, {
          tier: form.tier,
          status: form.status,
          billingCycle: form.billingCycle,
          amount: form.amount,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          autoRenew: form.autoRenew,
          notes: form.notes || undefined,
        });
      } else {
        const payload: CreateSubscriptionInput = {
          parlourId: form.parlourId,
          tier: form.tier,
          status: form.status,
          billingCycle: form.billingCycle,
          amount: form.amount,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          autoRenew: form.autoRenew,
          notes: form.notes || undefined,
        };

        await createSubscription(payload);
      }

      navigate('/safpa/subscriptions');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const selectedParlour = parlours.find((parlour) => parlour.id === form.parlourId);

  return (
    <div className="space-y-6">
      <Link to="/safpa/subscriptions" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Subscriptions
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
                <p className="mt-1 text-sm text-slate-500">Capture the billing agreement and renewal behavior for the selected parlour.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected tenant</div>
                <div className="text-sm font-semibold text-slate-700">{selectedParlour?.name || 'Choose parlour'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Parlour*</label>
                <select
                  disabled={isEditing}
                  value={form.parlourId}
                  onChange={(event) => onChange('parlourId', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select parlour</option>
                  {parlours.map((parlour) => (
                    <option key={parlour.id} value={parlour.id}>
                      {parlour.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Tier*</label>
                <select value={form.tier} onChange={(event) => onChange('tier', event.target.value as ParlourSubscription['tier'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Status*</label>
                <select value={form.status} onChange={(event) => onChange('status', event.target.value as ParlourSubscription['status'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Billing Cycle*</label>
                <select value={form.billingCycle} onChange={(event) => onChange('billingCycle', event.target.value as ParlourSubscription['billingCycle'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Amount (ZAR)*</label>
                <input type="number" min={0} value={form.amount} onChange={(event) => onChange('amount', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Start Date*</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input type="date" value={form.startDate} onChange={(event) => onChange('startDate', event.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">End Date</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input type="date" value={form.endDate} onChange={(event) => onChange('endDate', event.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.autoRenew} onChange={(event) => onChange('autoRenew', event.target.checked)} />
                  Auto renew subscription
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Notes</label>
                <textarea value={form.notes} onChange={(event) => onChange('notes', event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Optional internal notes for billing, approvals, or exceptions" />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/safpa/subscriptions" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">
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