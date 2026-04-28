import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { createMember } from '../../services/membersApi';
import { fetchProducts } from '../../services/productsApi';
import type { Product } from '../../types';

export default function AddMember() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', idNumber: '', phone: '', email: '',
    address: '', city: '', province: '',
    depFirstName: '', depLastName: '', depRelationship: '',
    benFirstName: '', benLastName: '', benPercentage: '100',
    product: 'pr1',
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const records = await fetchProducts(currentUser.parlourId || 'p1');
        const activeProducts = records.filter((product) => product.isActive);
        setProducts(activeProducts);
        if (activeProducts.length > 0) {
          setForm((previous) => ({ ...previous, product: activeProducts[0].id }));
        }
      } catch {
        setProducts([]);
      }
    };

    void loadProducts();
  }, [currentUser.parlourId]);

  const submitMember = async () => {
    if (!form.firstName || !form.lastName || !form.idNumber || !form.phone) {
      setNotice('Please complete all required personal details.');
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      await createMember({
        parlourId: currentUser.parlourId || 'p1',
        branchId: currentUser.branchId || 'b1',
        firstName: form.firstName,
        lastName: form.lastName,
        idNumber: form.idNumber,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        province: form.province,
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        dependants: form.depFirstName && form.depLastName ? [{
          id: `d-${Date.now()}`,
          firstName: form.depFirstName,
          lastName: form.depLastName,
          idNumber: 'TEMP',
          relationship: form.depRelationship || 'Dependant',
          dateOfBirth: '2000-01-01',
        }] : [],
        beneficiaries: form.benFirstName && form.benLastName ? [{
          id: `bn-${Date.now()}`,
          firstName: form.benFirstName,
          lastName: form.benLastName,
          idNumber: 'TEMP',
          relationship: 'Beneficiary',
          percentage: Number(form.benPercentage) || 100,
        }] : [],
      });
      navigate('/members', { replace: true });
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : 'Failed to create member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/members" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Members
      </Link>
      <h1 className="text-2xl font-bold mb-6">Add New Member</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Personal Info', 'Dependants', 'Beneficiary', 'Package'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium' : 'text-slate-400'}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-slate-300" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-600 mb-1">First Name*</label><input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Last Name*</label><input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm text-slate-600 mb-1">SA ID Number*</label><input type="text" value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" maxLength={13} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-600 mb-1">Phone*</label><input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm text-slate-600 mb-1">Address</label><input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-600 mb-1">City</label><input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Province</label>
                <select value={form.province} onChange={(e) => update('province', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">Select...</option>
                  {['Gauteng', 'KwaZulu-Natal', 'Eastern Cape', 'Western Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Add Dependant</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-600 mb-1">First Name</label><input type="text" value={form.depFirstName} onChange={(e) => update('depFirstName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Last Name</label><input type="text" value={form.depLastName} onChange={(e) => update('depLastName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm text-slate-600 mb-1">Relationship</label>
              <select value={form.depRelationship} onChange={(e) => update('depRelationship', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Select...</option>
                {['Spouse', 'Child', 'Parent', 'Sibling', 'Extended family'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400">You can add more dependants after registration.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Add Beneficiary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-600 mb-1">First Name</label><input type="text" value={form.benFirstName} onChange={(e) => update('benFirstName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Last Name</label><input type="text" value={form.benLastName} onChange={(e) => update('benLastName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm text-slate-600 mb-1">Benefit Percentage</label><input type="number" value={form.benPercentage} onChange={(e) => update('benPercentage', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} max={100} /></div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Select Package</h3>
            <div className="space-y-3">
              {products.map((p) => (
                <label key={p.id} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${form.product === p.id ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                  <input type="radio" name="product" value={p.id} checked={form.product === p.id} onChange={() => update('product', p.id)} />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-slate-500">R{p.premiumFrom}/mo • Cover up to R{p.coverFrom.toLocaleString()}</div>
                  </div>
                </label>
              ))}
              {products.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No active products found. Add a product first in Products.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
          {notice && <div className="mr-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{notice}</div>}
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50">Previous</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Next</button>
          ) : (
            <button disabled={saving} onClick={() => void submitMember()} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">{saving ? 'Creating...' : 'Create Member'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

