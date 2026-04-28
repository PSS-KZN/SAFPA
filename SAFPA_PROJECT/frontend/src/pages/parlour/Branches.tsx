import { useEffect, useState } from 'react';
import { useRole } from '../../contexts/RoleContext';
import type { Branch } from '../../types';
import { createBranch, fetchBranches, setBranchStatus, updateBranch } from '../../services/branchesApi';

export default function Branches() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [parlourBranches, setParlourBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    manager: '',
    phone: '',
  });

  const resetForm = () => {
    setForm({ name: '', address: '', city: '', province: '', manager: '', phone: '' });
    setEditingBranchId(null);
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchBranches(parlourId);
      setParlourBranches(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBranches();
  }, [parlourId]);

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setForm({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      province: branch.province,
      manager: branch.manager,
      phone: branch.phone,
    });
    setShowModal(true);
  };

  const saveBranch = async () => {
    if (!form.name || !form.address || !form.city || !form.province || !form.manager || !form.phone) {
      setError('Please complete all branch fields before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingBranchId) {
        const updated = await updateBranch(editingBranchId, form);
        setParlourBranches((previous) => previous.map((branch) => (branch.id === updated.id ? updated : branch)));
      } else {
        const created = await createBranch({
          parlourId,
          status: 'active',
          ...form,
        });
        setParlourBranches((previous) => [created, ...previous]);
      }

      setShowModal(false);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (branch: Branch) => {
    const nextStatus: Branch['status'] = branch.status === 'active' ? 'inactive' : 'active';

    try {
      setError(null);
      const updated = await setBranchStatus(branch.id, nextStatus);
      setParlourBranches((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update branch status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        <button onClick={openCreateModal} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Branch</button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading branches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parlourBranches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{b.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
              </div>
              <div className="text-sm text-slate-500 space-y-1">
                <p>{b.address}</p>
                <p>{b.city}, {b.province}</p>
                <p className="mt-2"><span className="text-slate-700 font-medium">Manager:</span> {b.manager}</p>
                <p><span className="text-slate-700 font-medium">Phone:</span> {b.phone}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEditModal(b)} className="text-sm text-red-600 hover:text-red-800">Edit</button>
                <button onClick={() => void toggleStatus(b)} className="text-sm text-slate-400 hover:text-slate-600">
                  {b.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {parlourBranches.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">No branches found for this parlour.</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">{editingBranchId ? 'Edit Branch' : 'Add Branch'}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Branch Name*</label>
                <input value={form.name} onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Address*</label>
                <input value={form.address} onChange={(e) => setForm((previous) => ({ ...previous, address: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">City*</label>
                <input value={form.city} onChange={(e) => setForm((previous) => ({ ...previous, city: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Province*</label>
                <input value={form.province} onChange={(e) => setForm((previous) => ({ ...previous, province: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Manager*</label>
                <input value={form.manager} onChange={(e) => setForm((previous) => ({ ...previous, manager: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Phone*</label>
                <input value={form.phone} onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
              <button onClick={() => void saveBranch()} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

