import { users } from '../../data/users';
import { useRole } from '../../contexts/RoleContext';

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
  const parlourUsers = users.filter((u) => u.parlourId === (currentUser.parlourId || 'p1'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add User</button>
      </div>

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
                  <button className="text-red-600 hover:text-red-800 text-sm mr-3">Edit</button>
                  <button className="text-slate-400 hover:text-slate-600 text-sm">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

