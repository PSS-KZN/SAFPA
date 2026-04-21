import { parlours } from '../../data/parlours';
import { branches } from '../../data/branches';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

export default function ParlourList() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Parlour Management</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Parlour</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Parlour Name</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Onboarding</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Branches</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parlours.map((p) => {
              const branchCount = branches.filter((b) => b.parlourId === p.id).length;
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.province}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.tier === 'premium' ? 'bg-violet-100 text-violet-700' : p.tier === 'standard' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'onboarding' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.onboardingProgress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{p.onboardingProgress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.totalMembers.toLocaleString()}</td>
                  <td className="px-4 py-3">{branchCount}</td>
                  <td className="px-4 py-3">
                    <Link to={`/safpa/parlours/${p.id}`} className="text-red-600 hover:text-red-800">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

