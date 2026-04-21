import { branches } from '../../data/branches';
import { useRole } from '../../contexts/RoleContext';

export default function Branches() {
  const { currentUser } = useRole();
  const parlourBranches = branches.filter((b) => b.parlourId === (currentUser.parlourId || 'p1'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Branch</button>
      </div>

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
              <button className="text-sm text-red-600 hover:text-red-800">Edit</button>
              <button className="text-sm text-slate-400 hover:text-slate-600">Deactivate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

