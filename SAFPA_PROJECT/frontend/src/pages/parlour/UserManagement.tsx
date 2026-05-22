import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { User } from '../../types';
import { fetchUsers, setUserStatus } from '../../services/usersApi';

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

  const loadUsers = useCallback(async () => {
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
  }, [parlourId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

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
        <Link to="/parlour/users/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">+ Add User</Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading users...</div>
      ) : (
        <div className="table-scroll bg-white rounded-xl shadow-sm border border-slate-200">
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
                    <Link to={`/parlour/users/${u.id}/edit`} className="mr-3 text-sm text-red-600 hover:text-red-800">Edit</Link>
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
    </div>
  );
}

