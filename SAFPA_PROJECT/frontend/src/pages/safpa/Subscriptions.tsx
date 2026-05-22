import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SubscriptionPlan } from '../../types';
import { deleteSubscription, fetchSubscriptions } from '../../services/subscriptionsApi';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const subscriptionRows = await fetchSubscriptions();
      setSubscriptions(subscriptionRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (subscription: SubscriptionPlan) => {
    const confirmed = window.confirm(`Delete ${subscription.name}?`);
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
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">Create, update, and retire subscription plans without mixing in tenant assignments.</p>
        </div>
        <Link to="/safpa/subscriptions/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
          + New Subscription
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading subscriptions...</div>
      ) : (
        <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{subscription.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${subscription.tier === 'premium' ? 'bg-violet-100 text-violet-700' : subscription.tier === 'standard' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {subscription.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{subscription.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${subscription.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                      {subscription.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">R{subscription.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/safpa/subscriptions/${subscription.id}/edit`} className="text-xs text-red-600 hover:text-red-800">
                        Edit
                      </Link>
                      <button onClick={() => void remove(subscription)} className="text-xs text-slate-600 hover:text-slate-900">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
