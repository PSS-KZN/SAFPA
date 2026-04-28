import { useRole } from '../../contexts/RoleContext';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Member, Policy, Product } from '../../types';
import { fetchMembers } from '../../services/membersApi';
import { createPolicy, fetchPolicies } from '../../services/policiesApi';
import { fetchProducts } from '../../services/productsApi';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  lapsed: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  reinstated: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-slate-100 text-slate-600',
};

export default function PolicyList() {
  const { currentUser } = useRole();
  const [filterStatus, setFilterStatus] = useState('all');
  const [items, setItems] = useState<Policy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    memberId: '',
    productId: '',
    billingFrequency: 'monthly' as Policy['billingFrequency'],
    premiumAmount: 0,
    coverAmount: 0,
    startDate: new Date().toISOString().slice(0, 10),
    nextDueDate: new Date().toISOString().slice(0, 10),
  });

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [policyRecords, memberRecords] = await Promise.all([
          fetchPolicies(parlourId),
          fetchMembers(parlourId),
        ]);
        const productRecords = await fetchProducts(parlourId);
        setItems(policyRecords);
        setMembers(memberRecords);
        const activeProducts = productRecords.filter((product) => product.isActive);
        setProducts(activeProducts);
        if (activeProducts.length > 0) {
          setForm((previous) => ({
            ...previous,
            productId: activeProducts[0].id,
            premiumAmount: activeProducts[0].premiumFrom,
            coverAmount: activeProducts[0].coverFrom,
          }));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const parlourPolicies = currentUser.role === 'branch_manager' && currentUser.branchId
    ? items.filter((policy) => members.some((member) => member.id === policy.memberId && member.branchId === currentUser.branchId))
    : items;
  const scopedMembers = currentUser.role === 'branch_manager' && currentUser.branchId
    ? members.filter((member) => member.branchId === currentUser.branchId)
    : members;
  const filtered = filterStatus === 'all' ? parlourPolicies : parlourPolicies.filter((p) => p.status === filterStatus);
  const canCreatePolicy = currentUser.role === 'parlour_owner' || currentUser.role === 'policy_admin';

  const createPolicyRecord = async () => {
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
        billingFrequency: form.billingFrequency,
        nextDueDate: form.nextDueDate,
        startDate: form.startDate,
        coverAmount: form.coverAmount,
        arrearsAmount: 0,
      });
      setItems((previous) => [created, ...previous]);
      setShowModal(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Policies</h1>
        {canCreatePolicy && (
          <button onClick={() => setShowModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Create Policy</button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'active', 'suspended', 'lapsed', 'draft', 'pending'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterStatus === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading policies...</div>
      ) : (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Policy #</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Cover</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Arrears</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const member = members.find((m) => m.id === p.memberId);
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-3 font-medium">{member ? `${member.firstName} ${member.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{p.productName}</td>
                  <td className="px-4 py-3">R{p.premiumAmount}</td>
                  <td className="px-4 py-3">R{p.coverAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">{p.arrearsAmount > 0 ? <span className="text-red-600 font-medium">R{p.arrearsAmount}</span> : '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/policies/${p.id}`} className="text-red-600 hover:text-red-800"><Eye size={16} /></Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Create Policy</h2>
            <p className="mb-4 text-sm text-slate-500">Policy creation is handled by Parlour Owners and Policy Admin users.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Member</label>
                <select value={form.memberId} onChange={(e) => setForm((previous) => ({ ...previous, memberId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select member...</option>
                  {scopedMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Product</label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const nextProductId = e.target.value;
                    const nextProduct = products.find((product) => product.id === nextProductId);
                    setForm((previous) => ({
                      ...previous,
                      productId: nextProductId,
                      premiumAmount: nextProduct ? nextProduct.premiumFrom : previous.premiumAmount,
                      coverAmount: nextProduct ? nextProduct.coverFrom : previous.coverAmount,
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Premium Amount</label>
                <input type="number" value={form.premiumAmount} onChange={(e) => setForm((previous) => ({ ...previous, premiumAmount: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Cover Amount</label>
                <input type="number" value={form.coverAmount} onChange={(e) => setForm((previous) => ({ ...previous, coverAmount: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Billing Frequency</label>
                <select value={form.billingFrequency} onChange={(e) => setForm((previous) => ({ ...previous, billingFrequency: e.target.value as Policy['billingFrequency'] }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((previous) => ({ ...previous, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Next Due Date</label>
                <input type="date" value={form.nextDueDate} onChange={(e) => setForm((previous) => ({ ...previous, nextDueDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => void createPolicyRecord()} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Policy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

