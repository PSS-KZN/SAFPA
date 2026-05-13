import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { Member, Policy, Product } from '../../types';
import { fetchMembers } from '../../services/membersApi';
import { createPolicy } from '../../services/policiesApi';
import { fetchProducts } from '../../services/productsApi';

type PolicyFormState = {
  memberId: string;
  productId: string;
  billingFrequency: Policy['billingFrequency'];
  premiumAmount: number;
  coverAmount: number;
  waitingPeriodDays: number;
  startDate: string;
  nextDueDate: string;
};

const initialForm: PolicyFormState = {
  memberId: '',
  productId: '',
  billingFrequency: 'monthly',
  premiumAmount: 0,
  coverAmount: 0,
  waitingPeriodDays: 0,
  startDate: new Date().toISOString().slice(0, 10),
  nextDueDate: new Date().toISOString().slice(0, 10),
};

const checklist = [
  'Select the right member and active package before quoting.',
  'Review premium, cover, and waiting period together to avoid mismatches.',
  'New policies open in their detail screen immediately after save for follow-up work.',
];

export default function NewPolicy() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<PolicyFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [memberRecords, productRecords] = await Promise.all([
          fetchMembers(parlourId),
          fetchProducts(parlourId),
        ]);

        const scopedMembers = currentUser.role === 'branch_manager' && currentUser.branchId
          ? memberRecords.filter((member) => member.branchId === currentUser.branchId)
          : memberRecords;
        const activeProducts = productRecords.filter((product) => product.isActive);

        setMembers(scopedMembers);
        setProducts(activeProducts);
        setForm((previous) => ({
          ...previous,
          memberId: previous.memberId || scopedMembers[0]?.id || '',
          productId: previous.productId || activeProducts[0]?.id || '',
          premiumAmount: activeProducts[0]?.premiumFrom || previous.premiumAmount,
          coverAmount: activeProducts[0]?.coverFrom || previous.coverAmount,
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load policy form');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentUser.branchId, currentUser.role, parlourId]);

  const updateForm = <K extends keyof PolicyFormState>(field: K, value: PolicyFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleProductChange = (productId: string) => {
    const selectedProduct = products.find((product) => product.id === productId);
    setForm((previous) => ({
      ...previous,
      productId,
      premiumAmount: selectedProduct ? selectedProduct.premiumFrom : previous.premiumAmount,
      coverAmount: selectedProduct ? selectedProduct.coverFrom : previous.coverAmount,
    }));
  };

  const savePolicy = async () => {
    if (!form.memberId || !form.productId || form.premiumAmount <= 0 || form.coverAmount <= 0) {
      setError('Please complete member, product, premium, and cover before saving.');
      return;
    }

    const selectedProduct = products.find((product) => product.id === form.productId);
    if (!selectedProduct) {
      setError('Selected product not found.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const created = await createPolicy({
        memberId: form.memberId,
        parlourId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        status: 'pending',
        premiumAmount: form.premiumAmount,
        waitingPeriodDays: Math.max(0, form.waitingPeriodDays),
        billingFrequency: form.billingFrequency,
        nextDueDate: form.nextDueDate,
        startDate: form.startDate,
        coverAmount: form.coverAmount,
        arrearsAmount: 0,
      });

      navigate(`/policies/${created.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/policies" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Policies
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <FileText size={14} /> Policy Setup
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Create Policy</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move policy creation out of the popup so member selection, product pricing, and dates are easier to verify.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading policy form...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Policy Details</h2>
              <p className="mt-1 text-sm text-slate-500">Create a new policy from an active product for the selected member.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Member</label>
                <select value={form.memberId} onChange={(event) => updateForm('memberId', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Product</label>
                <select value={form.productId} onChange={(event) => handleProductChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Premium Amount</label>
                <input type="number" min={0} value={form.premiumAmount} onChange={(event) => updateForm('premiumAmount', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Cover Amount</label>
                <input type="number" min={0} value={form.coverAmount} onChange={(event) => updateForm('coverAmount', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Billing Frequency</label>
                <select value={form.billingFrequency} onChange={(event) => updateForm('billingFrequency', event.target.value as Policy['billingFrequency'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Start Date</label>
                <input type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Waiting Period (days)</label>
                <input type="number" min={0} value={form.waitingPeriodDays} onChange={(event) => updateForm('waitingPeriodDays', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Next Due Date</label>
                <input type="date" value={form.nextDueDate} onChange={(event) => updateForm('nextDueDate', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/policies" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
              <button onClick={() => void savePolicy()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving Policy...' : 'Create Policy'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Checklist</div>
            <h2 className="mt-4 text-xl font-semibold">Set the policy up cleanly at creation time.</h2>
            <div className="mt-6 space-y-3">
              {checklist.map((item) => (
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