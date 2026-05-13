import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { createBranch, fetchBranches, updateBranch } from '../../services/branchesApi';

type BranchFormState = {
  name: string;
  address: string;
  city: string;
  province: string;
  manager: string;
  phone: string;
};

const initialForm: BranchFormState = {
  name: '',
  address: '',
  city: '',
  province: '',
  manager: '',
  phone: '',
};

const branchChecklist = [
  'Capture the branch identity and physical location clearly.',
  'Set the branch manager and phone number up front for staff routing.',
  'Return to the branch list after save to manage status changes.',
];

export default function BranchEditor() {
  const { id } = useParams();
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const isEditing = Boolean(id);
  const [form, setForm] = useState<BranchFormState>(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadBranch = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchBranches(parlourId);
        const branch = records.find((item) => item.id === id);

        if (!branch) {
          setError('Branch not found.');
          return;
        }

        setForm({
          name: branch.name,
          address: branch.address,
          city: branch.city,
          province: branch.province,
          manager: branch.manager,
          phone: branch.phone,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load branch');
      } finally {
        setLoading(false);
      }
    };

    void loadBranch();
  }, [id, parlourId]);

  const updateForm = <K extends keyof BranchFormState>(field: K, value: BranchFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveBranch = async () => {
    if (!form.name || !form.address || !form.city || !form.province || !form.manager || !form.phone) {
      setError('Please complete all branch fields before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (id) {
        await updateBranch(id, form);
      } else {
        await createBranch({
          parlourId,
          status: 'active',
          ...form,
        });
      }

      navigate('/parlour/branches');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/parlour/branches" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Branches
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <Building2 size={14} /> Parlour Setup
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{isEditing ? 'Edit Branch' : 'Add Branch'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Move branch setup out of the popup so location and manager details are easier to review before saving.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading branch...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Branch Details</h2>
              <p className="mt-1 text-sm text-slate-500">Enter the core operational details for this branch.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Branch Name*</label>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Address*</label>
                <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">City*</label>
                <input value={form.city} onChange={(event) => updateForm('city', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Province*</label>
                <input value={form.province} onChange={(event) => updateForm('province', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Manager*</label>
                <input value={form.manager} onChange={(event) => updateForm('manager', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Phone*</label>
                <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/parlour/branches" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">
                Cancel
              </Link>
              <button onClick={() => void saveBranch()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving Branch...' : isEditing ? 'Save Branch' : 'Create Branch'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
              Checklist
            </div>
            <h2 className="mt-4 text-xl font-semibold">Set the branch up cleanly on the first pass.</h2>
            <div className="mt-6 space-y-3">
              {branchChecklist.map((item) => (
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