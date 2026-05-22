import { CheckCircle2 } from 'lucide-react';
import { useCustomerPortal } from './customerPortalContext';

export default function CustomerPolicyPage() {
  const { activePolicy, payments } = useCustomerPortal();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">My Policy</h2>
            <p className="mt-1 text-sm text-slate-500">Your current cover, billing details, and next payment date.</p>
          </div>
          {activePolicy && <span className={`rounded-full px-3 py-1 text-xs font-medium ${activePolicy.status === 'active' ? 'bg-green-100 text-green-700' : activePolicy.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{activePolicy.status}</span>}
        </div>

        {activePolicy ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Policy Number</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{activePolicy.policyNumber}</div>
              <div className="mt-3 text-sm text-slate-600">{activePolicy.productName}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Monthly Premium</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">R{activePolicy.premiumAmount.toLocaleString()}</div>
              <div className="mt-3 text-sm text-slate-600">Cover: R{activePolicy.coverAmount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Next Due Date</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{activePolicy.nextDueDate}</div>
              <div className="mt-2 text-sm text-slate-600">Billing frequency: {activePolicy.billingFrequency}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Arrears</div>
              <div className={`mt-1 text-base font-semibold ${activePolicy.arrearsAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>R{activePolicy.arrearsAmount.toLocaleString()}</div>
              <div className="mt-2 text-sm text-slate-600">Last payment: {activePolicy.lastPaymentDate || 'No payment recorded yet'}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No active policy was found for this customer profile.</div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Payment Snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">Your latest recorded transactions and statuses.</p>
        </div>

        {payments.length > 0 ? (
          <div className="table-scroll rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .slice()
                  .sort((left, right) => right.date.localeCompare(left.date))
                  .slice(0, 4)
                  .map((payment) => (
                    <tr key={payment.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{payment.date}</td>
                      <td className="px-4 py-3">R{payment.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize">{payment.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${payment.status === 'successful' ? 'bg-green-100 text-green-700' : payment.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{payment.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No payments have been recorded yet for your customer profile.</div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 size={16} className="text-emerald-500" /> Reminder history and payment updates appear automatically in this portal as they are logged by the parlour.
        </div>
      </section>
    </div>
  );
}