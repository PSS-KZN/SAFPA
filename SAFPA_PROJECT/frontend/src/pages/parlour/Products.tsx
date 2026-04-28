import { useEffect, useState } from 'react';
import { useRole } from '../../contexts/RoleContext';
import type { Product } from '../../types';
import { createProduct, fetchProducts, setProductStatus, updateProduct } from '../../services/productsApi';

export default function Products() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    premiumFrom: 0,
    coverFrom: 0,
    waitingPeriodDays: 0,
    maxDependants: 0,
    isActive: true,
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchProducts(parlourId);
      setProducts(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [parlourId]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      premiumFrom: 0,
      coverFrom: 0,
      waitingPeriodDays: 0,
      maxDependants: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      premiumFrom: product.premiumFrom,
      coverFrom: product.coverFrom,
      waitingPeriodDays: product.waitingPeriodDays,
      maxDependants: product.maxDependants,
      isActive: product.isActive,
    });
    setShowModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.description) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingId) {
        const updated = await updateProduct(editingId, form);
        setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createProduct({
          parlourId,
          ...form,
        });
        setProducts((previous) => [created, ...previous]);
      }

      setShowModal(false);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      setError(null);
      const updated = await setProductStatus(product.id, !product.isActive);
      setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products & Packages</h1>
        <button onClick={openCreate} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Product</button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading products...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{p.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">{p.description}</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Premium from</span><span className="font-medium">R{p.premiumFrom}/mo</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cover from</span><span className="font-medium">R{p.coverFrom.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Waiting period</span><span className="font-medium">{p.waitingPeriodDays} days</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Max dependants</span><span className="font-medium">{p.maxDependants}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => openEdit(p)} className="text-sm text-red-600 hover:text-red-800">Edit</button>
              <button onClick={() => void toggleStatus(p)} className="text-sm text-slate-400 hover:text-slate-600">{p.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Name*</label>
                <input value={form.name} onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Description*</label>
                <input value={form.description} onChange={(e) => setForm((previous) => ({ ...previous, description: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Premium</label>
                <input type="number" value={form.premiumFrom} onChange={(e) => setForm((previous) => ({ ...previous, premiumFrom: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Cover</label>
                <input type="number" value={form.coverFrom} onChange={(e) => setForm((previous) => ({ ...previous, coverFrom: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Waiting Period (days)</label>
                <input type="number" value={form.waitingPeriodDays} onChange={(e) => setForm((previous) => ({ ...previous, waitingPeriodDays: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Max Dependants</label>
                <input type="number" value={form.maxDependants} onChange={(e) => setForm((previous) => ({ ...previous, maxDependants: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
              <button onClick={() => void saveProduct()} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

