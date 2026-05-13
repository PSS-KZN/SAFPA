import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Box, CheckCircle2 } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { createProduct, fetchProducts, updateProduct } from '../../services/productsApi';

type ProductFormState = {
  name: string;
  description: string;
  premiumFrom: number;
  coverFrom: number;
  maxDependants: number;
  isActive: boolean;
};

const initialForm: ProductFormState = {
  name: '',
  description: '',
  premiumFrom: 0,
  coverFrom: 0,
  maxDependants: 0,
  isActive: true,
};

const productChecklist = [
  'Define the package clearly so staff can sell it consistently.',
  'Set premium and cover together to avoid pricing mismatches.',
  'Keep inactive packages available for history but off new sales.',
];

export default function ProductEditor() {
  const { id } = useParams();
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const isEditing = Boolean(id);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchProducts(parlourId);
        const existing = records.find((product) => product.id === id);

        if (!existing) {
          setError('Product not found.');
          return;
        }

        setForm({
          name: existing.name,
          description: existing.description,
          premiumFrom: existing.premiumFrom,
          coverFrom: existing.coverFrom,
          maxDependants: existing.maxDependants,
          isActive: existing.isActive,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [id, parlourId]);

  const updateForm = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveProduct = async () => {
    if (!form.name || !form.description) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (id) {
        await updateProduct(id, form);
      } else {
        await createProduct({ parlourId, ...form });
      }

      navigate('/parlour/products');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/parlour/products" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <Box size={14} /> Product Catalog
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{isEditing ? 'Edit Product' : 'Add Product'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Give product setup a full page so package pricing and coverage are easier to review before publishing.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading product...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Package Details</h2>
              <p className="mt-1 text-sm text-slate-500">Capture pricing, cover, and availability for this package.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Name*</label>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Description*</label>
                <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Premium From</label>
                <input type="number" min={0} value={form.premiumFrom} onChange={(event) => updateForm('premiumFrom', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Cover From</label>
                <input type="number" min={0} value={form.coverFrom} onChange={(event) => updateForm('coverFrom', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Max Dependants</label>
                <input type="number" min={0} value={form.maxDependants} onChange={(event) => updateForm('maxDependants', Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:self-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} />
                  Active and available for new policies
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/parlour/products" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
              <button onClick={() => void saveProduct()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving Product...' : isEditing ? 'Save Product' : 'Create Product'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Checklist</div>
            <h2 className="mt-4 text-xl font-semibold">Keep packages easy for staff to explain.</h2>
            <div className="mt-6 space-y-3">
              {productChecklist.map((item) => (
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