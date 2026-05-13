import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { Product } from '../../types';
import { fetchProducts, setProductStatus } from '../../services/productsApi';

export default function Products() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
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
  }, [parlourId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

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
        <Link to="/parlour/products/new" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">+ Add Product</Link>
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
              <div className="flex justify-between"><span className="text-slate-500">Max dependants</span><span className="font-medium">{p.maxDependants}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/parlour/products/${p.id}/edit`} className="text-sm text-red-600 hover:text-red-800">Edit</Link>
              <button onClick={() => void toggleStatus(p)} className="text-sm text-slate-400 hover:text-slate-600">{p.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

