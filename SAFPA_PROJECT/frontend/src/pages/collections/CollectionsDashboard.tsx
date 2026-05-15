import { useRole } from '../../contexts/RoleContext';
import { CheckCircle, XCircle, Clock, AlertTriangle, Upload, FileDown, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Member, PaymentTransaction, Policy } from '../../types';
import { sendCommunication } from '../../services/communicationsApi';
import { fetchMembers } from '../../services/membersApi';
import { createPayment, createReconciliationImport, fetchPaymentProviders, fetchPayments, fetchReconciliationImports, generateBillingEvents, type PaymentProvider, type ReconciliationImportRecord } from '../../services/paymentsApi';
import { fetchPolicies } from '../../services/policiesApi';

const formatCurrencyTooltip = (value: unknown) => {
  const amount = Array.isArray(value) ? value[0] : value;
  return `R${Number(amount ?? 0).toLocaleString()}`;
};

export default function CollectionsDashboard() {
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState<'overview' | 'portal' | 'transactions' | 'arrears' | 'reconciliation'>('overview');
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reconImports, setReconImports] = useState<ReconciliationImportRecord[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [capturingPayment, setCapturingPayment] = useState(false);
  const [sendingReminderPolicyId, setSendingReminderPolicyId] = useState<string | null>(null);
  const [portalForm, setPortalForm] = useState({
    policyId: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    method: 'cash' as PaymentTransaction['method'],
    status: 'successful' as PaymentTransaction['status'],
    reference: '',
  });

  const parlourId = currentUser.parlourId || 'p1';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [paymentRecords, policyRecords, memberRecords, importRecords, providerResponse] = await Promise.all([
        fetchPayments(parlourId),
        fetchPolicies(parlourId),
        fetchMembers(parlourId),
        fetchReconciliationImports(parlourId),
        fetchPaymentProviders(),
      ]);

      setPayments(paymentRecords);
      setPolicies(policyRecords);
      setMembers(memberRecords);
      setReconImports(importRecords);
      setProviders(providerResponse.providers);
      if (policyRecords.length > 0) {
        const firstPolicy = policyRecords[0];
        setPortalForm((previous) => ({
          ...previous,
          policyId: previous.policyId || firstPolicy.id,
          amount: previous.amount > 0 ? previous.amount : firstPolicy.premiumAmount,
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load collections data');
    } finally {
      setLoading(false);
    }
  }, [parlourId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runBillingGeneration = async () => {
    try {
      setError(null);
      await generateBillingEvents(parlourId, new Date().toISOString().slice(0, 10));
      await load();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Failed to generate billing events');
    }
  };

  const importReconciliation = async () => {
    try {
      setError(null);
      await createReconciliationImport({
        parlourId,
        fileName: `Recon_${Date.now()}.csv`,
        importedBy: currentUser.name,
        matched: Math.max(10, Math.floor(payments.length * 0.8)),
        exceptions: Math.max(0, Math.floor(payments.length * 0.1)),
      });
      await load();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import reconciliation file');
    }
  };

  const capturePayment = async () => {
    if (!portalForm.policyId || portalForm.amount <= 0) {
      setError('Select a policy and enter a valid amount.');
      return;
    }

    try {
      setCapturingPayment(true);
      setError(null);
      setNotice(null);
      await createPayment({
        policyId: portalForm.policyId,
        amount: portalForm.amount,
        date: portalForm.date,
        method: portalForm.method,
        status: portalForm.status,
        reference: portalForm.reference || undefined,
      });
      await load();
      setActiveTab('transactions');
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Failed to capture payment');
    } finally {
      setCapturingPayment(false);
    }
  };

  const sendReminder = async (policy: Policy) => {
    const member = members.find((item) => item.id === policy.memberId);
    if (!member) {
      setError('Member details were not found for this policy.');
      return;
    }

    const recipientContact = member.phone || member.email;
    if (!recipientContact) {
      setError('The policyholder has no phone or email contact for reminders.');
      return;
    }

    try {
      setSendingReminderPolicyId(policy.id);
      setError(null);
      setNotice(null);
      await sendCommunication({
        parlourId,
        type: member.phone ? 'sms' : 'email',
        recipientName: `${member.firstName} ${member.lastName}`.trim(),
        recipientContact,
        trigger: 'payment_reminder',
        templateName: 'Arrears Reminder',
        subject: member.phone ? undefined : `Payment reminder for ${policy.policyNumber}`,
        message: `Dear ${member.firstName}, your policy ${policy.policyNumber} is in arrears by R${policy.arrearsAmount}. Please contact the parlour or make payment to keep cover active.`,
        metadata: {
          memberId: member.id,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          arrearsAmount: policy.arrearsAmount,
          relatedEntityType: 'policy',
          relatedEntityId: policy.id,
        },
      });
      setNotice(`Reminder sent for ${policy.policyNumber}.`);
    } catch (reminderError) {
      setError(reminderError instanceof Error ? reminderError.message : 'Failed to send reminder');
    } finally {
      setSendingReminderPolicyId(null);
    }
  };

  const parlourPayments = payments;
  const successful = parlourPayments.filter((p) => p.status === 'successful');
  const failed = parlourPayments.filter((p) => p.status === 'failed');
  const pending = parlourPayments.filter((p) => p.status === 'pending');

  const totalCollected = successful.reduce((sum, p) => sum + p.amount, 0);
  const totalFailed = failed.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  const parlourPolicies = policies;
  const arrearsMembers = parlourPolicies.filter((p) => p.arrearsAmount > 0);
  const overdueBalance = arrearsMembers.reduce((sum, policy) => sum + policy.arrearsAmount, 0);
  const collectionRate = totalCollected + totalFailed > 0 ? Math.round((totalCollected / (totalCollected + totalFailed)) * 100) : 100;
  const activeProviderName = providers.find((provider) => provider.code === 'safpa_mvp_static')?.name || 'SAFPA Static Provider';

  const chartData = [
    { month: 'Jan', collected: 14500, failed: 1200 },
    { month: 'Feb', collected: 15800, failed: 800 },
    { month: 'Mar', collected: 16200, failed: 1500 },
    { month: 'Apr', collected: totalCollected, failed: totalFailed },
  ];

  const cards = [
    {
      label: 'Collected',
      value: `R${totalCollected.toLocaleString()}`,
      detail: `${collectionRate}% success rate this cycle`,
      icon: <CheckCircle size={20} />,
      shell: 'border-slate-200 bg-white',
      iconSurface: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    },
    {
      label: 'Failed',
      value: `R${totalFailed.toLocaleString()}`,
      detail: `${failed.length} transactions need follow-up`,
      icon: <XCircle size={20} />,
      shell: 'border-slate-200 bg-white',
      iconSurface: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    },
    {
      label: 'Pending',
      value: `R${totalPending.toLocaleString()}`,
      detail: `${pending.length} items awaiting confirmation`,
      icon: <Clock size={20} />,
      shell: 'border-slate-200 bg-white',
      iconSurface: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    },
    {
      label: 'In Arrears',
      value: `${arrearsMembers.length} policies`,
      detail: `Overdue balance at R${overdueBalance.toLocaleString()}`,
      icon: <AlertTriangle size={20} />,
      shell: 'border-slate-200 bg-white',
      iconSurface: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    },
  ];

  const retryPayment = (payment: PaymentTransaction) => {
    setPortalForm((previous) => ({
      ...previous,
      policyId: payment.policyId,
      amount: payment.amount,
      date: new Date().toISOString().slice(0, 10),
      method: payment.method,
      status: 'successful',
      reference: '',
    }));
    setActiveTab('portal');
    setError(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Collections</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['overview', 'portal', 'transactions', 'arrears', 'reconciliation'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === t ? 'bg-white shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>}

      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading collections...</div>}

      {activeTab === 'overview' && (
        <>
          <section className="mb-8 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)] lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Collections Overview
                </div>
                <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900">Track recovery performance, provider flow, and overdue pressure from one view.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Collections is currently running with <span className="font-semibold text-slate-900">{activeProviderName}</span> for digital methods, while branch cash stays manual. Use this overview to see where revenue is landing and where follow-up is required.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Success Rate</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{collectionRate}%</div>
                  <div className="mt-2 text-xs text-slate-500">Based on successful versus failed captured transactions.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Overdue Balance</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">R{overdueBalance.toLocaleString()}</div>
                  <div className="mt-2 text-xs text-slate-500">Outstanding across policies already in arrears.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-3 lg:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Operational Next Step</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">Refresh billing demand before reconciling new settlements.</div>
                    </div>
                    <button onClick={() => void runBillingGeneration()} className="shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Generate Billing Events</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-[20px] border p-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.26)] transition hover:border-slate-300 ${c.shell}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{c.label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{c.value}</p>
                    <p className="mt-2 max-w-[18rem] text-sm leading-5 text-slate-600">{c.detail}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconSurface}`}>{c.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Collections Trend</h3>
                    <p className="mt-1 text-sm text-slate-500">Compare settled revenue against failed attempts across the recent cycle.</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Live from collections activity</div>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-6">
                <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="collectionsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.72} />
                  </linearGradient>
                  <linearGradient id="failedBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.78} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `R${v.toLocaleString()}`} axisLine={false} tickLine={false} width={72} />
                <Tooltip formatter={formatCurrencyTooltip} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 18px 40px -24px rgba(15, 23, 42, 0.45)' }} />
                <Bar dataKey="collected" fill="url(#collectionsBar)" name="Collected" radius={[8, 8, 0, 0]} />
                <Bar dataKey="failed" fill="url(#failedBar)" name="Failed" radius={[8, 8, 0, 0]} />
              </BarChart>
                </ResponsiveContainer>
              </div>
          </div>
        </>
      )}

      {activeTab === 'portal' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl">
          <h3 className="font-semibold mb-1">Payment Portal</h3>
          <p className="text-sm text-slate-500 mb-5">Capture an over-the-counter or manual payment against a policy.</p>
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-medium text-slate-800">MVP Provider Setup</div>
            <div className="mt-1">Digital methods route through <span className="font-medium">{providers.find((provider) => provider.code === 'safpa_mvp_static')?.name || 'SAFPA Static Provider'}</span>. Cash stays on manual branch capture.</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Policy</label>
              <select value={portalForm.policyId} onChange={(e) => {
                const nextPolicy = policies.find((policy) => policy.id === e.target.value);
                setPortalForm((previous) => ({
                  ...previous,
                  policyId: e.target.value,
                  amount: nextPolicy ? nextPolicy.premiumAmount : previous.amount,
                }));
              }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Select policy...</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>{policy.policyNumber} - {policy.productName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Amount</label>
              <input type="number" value={portalForm.amount} onChange={(e) => setPortalForm((previous) => ({ ...previous, amount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date</label>
              <input type="date" value={portalForm.date} onChange={(e) => setPortalForm((previous) => ({ ...previous, date: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Method</label>
              <select value={portalForm.method} onChange={(e) => setPortalForm((previous) => ({ ...previous, method: e.target.value as PaymentTransaction['method'] }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="eft">EFT</option>
                <option value="debit_order">Debit Order</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Status</label>
              <select value={portalForm.status} onChange={(e) => setPortalForm((previous) => ({ ...previous, status: e.target.value as PaymentTransaction['status'] }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Reference (optional)</label>
              <input value={portalForm.reference} onChange={(e) => setPortalForm((previous) => ({ ...previous, reference: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Auto-generated if blank" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() => void capturePayment()} disabled={capturingPayment} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60">
              {capturingPayment ? 'Capturing...' : 'Capture Payment'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Policy #</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parlourPayments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{p.date}</td>
                  <td className="px-4 py-3 font-medium">{p.memberName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-3">R{p.amount}</td>
                  <td className="px-4 py-3 capitalize">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.providerName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'successful' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.status === 'successful' ? <Link to={`/collections/receipt/${p.id}`} className="text-red-600 hover:text-red-800 text-xs">Receipt</Link> : <span className="text-slate-300 text-xs">Receipt</span>}
                      {(p.status === 'failed' || p.status === 'pending') && (
                        <button onClick={() => retryPayment(p)} className="text-slate-600 hover:text-slate-900 text-xs">Retry</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'arrears' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Policy #</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Arrears Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Payment</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {arrearsMembers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-3">{p.productName}</td>
                  <td className="px-4 py-3">R{p.premiumAmount}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">R{p.arrearsAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.lastPaymentDate || 'Never'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void sendReminder(p)}
                      disabled={sendingReminderPolicyId === p.id}
                      className="text-red-600 hover:text-red-800 text-xs mr-2 disabled:text-slate-300"
                    >
                      {sendingReminderPolicyId === p.id ? 'Sending...' : 'Send Reminder'}
                    </button>
                    <Link to={`/policies/${p.id}`} className="text-slate-500 hover:text-slate-700 text-xs">View Policy</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Upload area */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold mb-1">Import Provider Settlement File</h3>
            <p className="text-sm text-slate-500 mb-5">Upload a CSV or Excel file from your payment provider to match transactions and flag exceptions (FR-058).</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors mb-4">
              <Upload size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600 mb-1">Drop your reconciliation file here</p>
              <p className="text-xs text-slate-400 mb-4">Supported formats: CSV, XLSX · Max 5 MB</p>
              <button className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-700">Choose File</button>
              <button onClick={() => void importReconciliation()} className="ml-2 bg-slate-800 text-white px-5 py-2 rounded-lg text-sm hover:bg-slate-900">Import Demo File</button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-300 px-4 py-2 rounded-lg">
                <FileDown size={16} /> Download Template
              </button>
              <span className="text-xs text-slate-400">Use the SAFPA standard reconciliation template for best results</span>
            </div>
          </div>

          {/* Previous imports */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Previous Reconciliation Imports</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Imported By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Exceptions</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {reconImports.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{r.fileName}</td>
                    <td className="px-4 py-3">{r.importedBy}</td>
                    <td className="px-4 py-3 text-slate-500">{r.importedAt}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-green-600"><CheckSquare size={14} /> {r.matched}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${r.exceptions > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{r.exceptions} {r.exceptions > 0 ? 'flagged' : ''}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 capitalize">{r.status}</span>
                    </td>
                  </tr>
                ))}
                {reconImports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No imports found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

