import { useEffect, useMemo, useState } from 'react';
import type { Parlour, ParlourSubscription } from '../../types';
import { fetchParlours } from '../../services/parloursApi';
import {
  createSubscription,
  deleteSubscription,
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

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<ParlourSubscription[]>([]);
  const [parlours, setParlours] = useState<Parlour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ParlourSubscription | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(initialFormState);

  const parlourOptions = useMemo(() => parlours.map((parlour) => ({ id: parlour.id, name: parlour.name })), [parlours]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subscriptionRows, parlourRows] = await Promise.all([fetchSubscriptions(), fetchParlours()]);
      setSubscriptions(subscriptionRows);
      setParlours(parlourRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm({
      ...initialFormState,
      parlourId: parlourOptions[0]?.id || '',
    });
    setEditing(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (subscription: ParlourSubscription) => {
    setEditing(subscription);
    setForm({
      parlourId: subscription.parlourId,
      tier: subscription.tier,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      amount: subscription.amount,
      startDate: subscription.startDate,
      endDate: subscription.endDate || '',
      autoRenew: subscription.autoRenew,
      notes: subscription.notes || '',
    });
    setShowModal(true);
  };

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

      if (editing) {
        const updated = await updateSubscription(editing.id, {
          tier: form.tier,
          status: form.status,
          billingCycle: form.billingCycle,
          amount: form.amount,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          autoRenew: form.autoRenew,
          notes: form.notes || undefined,
        });

        setSubscriptions((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
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

        const created = await createSubscription(payload);
        setSubscriptions((previous) => [created, ...previous]);
      }

      setShowModal(false);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (subscription: ParlourSubscription) => {
    const confirmed = window.confirm(`Delete subscription for ${subscription.parlourName}?`);
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await deleteSubscription(subscription.id);
      setSubscriptions((previous) => previous.filter((item) => item.id !== subscription.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete subscription');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parlour Subscriptions</h1>
        <button onClick={openCreateModal} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
          + New Subscription
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading subscriptions...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Parlour</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing Cycle</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Auto Renew</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{subscription.parlourName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${subscription.tier === 'premium' ? 'bg-violet-100 text-violet-700' : subscription.tier === 'standard' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {subscription.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${subscription.status === 'active' ? 'bg-green-100 text-green-700' : subscription.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{subscription.billingCycle}</td>
                  <td className="px-4 py-3">R{subscription.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{subscription.startDate}</td>
                  <td className="px-4 py-3">{subscription.autoRenew ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEditModal(subscription)} className="text-xs text-red-600 hover:text-red-800">
                        Edit
                      </button>
                      <button onClick={() => void remove(subscription)} className="text-xs text-slate-600 hover:text-slate-900">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">{editing ? 'Edit Subscription' : 'New Subscription'}</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Parlour*</label>
                <select
                  disabled={Boolean(editing)}
                  value={form.parlourId}
                  onChange={(event) => onChange('parlourId', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select parlour</option>
                  {parlourOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Tier*</label>
                <select value={form.tier} onChange={(event) => onChange('tier', event.target.value as ParlourSubscription['tier'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Status*</label>
                <select value={form.status} onChange={(event) => onChange('status', event.target.value as ParlourSubscription['status'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Billing Cycle*</label>
                <select value={form.billingCycle} onChange={(event) => onChange('billingCycle', event.target.value as ParlourSubscription['billingCycle'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Amount (ZAR)*</label>
                <input type="number" min={0} value={form.amount} onChange={(event) => onChange('amount', Number(event.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Start Date*</label>
                <input type="date" value={form.startDate} onChange={(event) => onChange('startDate', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">End Date</label>
                <input type="date" value={form.endDate} onChange={(event) => onChange('endDate', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input id="autoRenew" type="checkbox" checked={form.autoRenew} onChange={(event) => onChange('autoRenew', event.target.checked)} />
                <label htmlFor="autoRenew" className="text-sm text-slate-600">
                  Auto renew subscription
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Notes</label>
                <textarea value={form.notes} onChange={(event) => onChange('notes', event.target.value)} className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
