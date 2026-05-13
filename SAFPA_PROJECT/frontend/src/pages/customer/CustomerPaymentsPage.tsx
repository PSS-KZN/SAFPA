import { CreditCard } from 'lucide-react';
import type { PaymentTransaction } from '../../types';
import { useCustomerPortal } from './customerPortalContext';

export default function CustomerPaymentsPage() {
  const { policies, payments, paymentForm, paying, setPaymentForm, payNow } = useCustomerPortal();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr),minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Make a Payment</h2>
          <p className="mt-1 text-sm text-slate-500">Record a payment against your policy.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Policy</label>
            <select
              value={paymentForm.policyId}
              onChange={(event) => {
                const selected = policies.find((policy) => policy.id === event.target.value);
                setPaymentForm((previous) => ({
                  ...previous,
                  policyId: event.target.value,
                  amount: selected ? selected.premiumAmount : previous.amount,
                }));
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="">Select policy...</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>{policy.policyNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Amount</label>
            <input type="number" min={0} value={paymentForm.amount} onChange={(event) => setPaymentForm((previous) => ({ ...previous, amount: Number(event.target.value) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Method</label>
            <select value={paymentForm.method} onChange={(event) => setPaymentForm((previous) => ({ ...previous, method: event.target.value as PaymentTransaction['method'] }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
              <option value="card">Card</option>
              <option value="eft">EFT</option>
              <option value="cash">Cash</option>
              <option value="debit_order">Debit Order</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Payment Date</label>
            <input type="date" value={paymentForm.date} onChange={(event) => setPaymentForm((previous) => ({ ...previous, date: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <button onClick={() => void payNow()} disabled={paying} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            <CreditCard size={16} /> {paying ? 'Processing Payment...' : 'Pay Now'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
          <p className="mt-1 text-sm text-slate-500">Track recent transactions across your linked policies.</p>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .slice()
                  .sort((left, right) => right.date.localeCompare(left.date))
                  .slice(0, 8)
                  .map((payment) => {
                    const policy = policies.find((item) => item.id === payment.policyId);
                    return (
                      <tr key={payment.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{payment.date}</td>
                        <td className="px-4 py-3 font-mono text-xs">{policy?.policyNumber || payment.policyNumber}</td>
                        <td className="px-4 py-3">R{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 capitalize">{payment.method.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${payment.status === 'successful' ? 'bg-green-100 text-green-700' : payment.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{payment.status}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No payments have been recorded yet for your customer profile.</div>
        )}
      </section>
    </div>
  );
}