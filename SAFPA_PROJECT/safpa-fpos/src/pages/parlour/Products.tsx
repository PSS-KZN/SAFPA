import { products } from '../../data/policies';
import { useRole } from '../../contexts/RoleContext';

export default function Products() {
  const { currentUser } = useRole();
  const parlourProducts = products.filter((p) => p.parlourId === (currentUser.parlourId || 'p1'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products & Packages</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">+ Add Product</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parlourProducts.map((p) => (
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
              <button className="text-sm text-red-600 hover:text-red-800">Edit</button>
              <button className="text-sm text-slate-400 hover:text-slate-600">{p.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

