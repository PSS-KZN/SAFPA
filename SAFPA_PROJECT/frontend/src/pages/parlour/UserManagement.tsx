import { useEffect, useState } from 'react';
import { useRole } from '../../contexts/RoleContext';
import type { User, UserRole } from '../../types';
import { createUser, fetchUsers, setUserStatus, updateUser } from '../../services/usersApi';

const roleLabels: Record<string, string> = {
  safpa_admin: 'SAFPA Admin',
  parlour_owner: 'Parlour Owner',
  branch_manager: 'Branch Manager',
  policy_admin: 'Policy Admin',
  collections_clerk: 'Collections Clerk',
  operations_coordinator: 'Operations Coordinator',
};

export default function UserManagement() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [parlourUsers, setParlourUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'policy_admin' as UserRole,
    branchId: '',
    status: 'active' as User['status'],
  });

  const managedRoles: UserRole[] = [
    'parlour_owner',
    'branch_manager',
    'policy_admin',
    'collections_clerk',
    'operations_coordinator',
  ];

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      role: 'policy_admin',
      branchId: '',
      status: 'active',
    });
    setEditingUserId(null);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchUsers(parlourId);
      setParlourUsers(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [parlourId]);

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId || '',
      status: user.status,
    });
    setShowModal(true);
  };

  const saveUser = async () => {
    if (!form.name || !form.email) {
      setError('Please complete all required user fields before saving.');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      branchId: form.branchId || undefined,
      status: form.status,
      parlourId,
    };

    try {
      setSaving(true);
      setError(null);

      if (editingUserId) {
        const updated = await updateUser(editingUserId, payload);
        setParlourUsers((previous) => previous.map((user) => (user.id === updated.id ? updated : user)));
      } else {
        const created = await createUser(payload);
        setParlourUsers((previous) => [created, ...previous]);
      }

      setShowModal(false);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    const nextStatus: User['status'] = user.status === 'active' ? 'inactive' : 'active';

    try {
      setError(null);
      const updated = await setUserStatus(user.id, nextStatus);
      setParlourUsers((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update user status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button onClick={openCreateModal} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add User</button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading users...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parlourUsers.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold">
                        {u.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{roleLabels[u.role]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEditModal(u)} className="text-red-600 hover:text-red-800 text-sm mr-3">Edit</button>
                    <button onClick={() => void toggleStatus(u)} className="text-slate-400 hover:text-slate-600 text-sm">
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {parlourUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">No users found for this parlour.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">{editingUserId ? 'Edit User' : 'Add User'}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Name*</label>
                <input value={form.name} onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Email*</label>
                <input type="email" value={form.email} onChange={(e) => setForm((previous) => ({ ...previous, email: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Role*</label>
                <select value={form.role} onChange={(e) => setForm((previous) => ({ ...previous, role: e.target.value as UserRole }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {managedRoles.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Branch ID (optional)</label>
                <input value={form.branchId} onChange={(e) => setForm((previous) => ({ ...previous, branchId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. b1" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Status</label>
                <select value={form.status} onChange={(e) => setForm((previous) => ({ ...previous, status: e.target.value as User['status'] }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
              <button onClick={() => void saveUser()} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

