import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { createMember } from '../../services/membersApi';
import { createPolicy } from '../../services/policiesApi';
import { fetchProducts } from '../../services/productsApi';
import type { Product } from '../../types';

const POLICY_STATUSES = ['draft', 'pending', 'active', 'suspended', 'lapsed', 'reinstated', 'cancelled', 'closed'] as const;

export default function AddMember() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [policyRules, setPolicyRules] = useState<Record<string, string[]>>({});
  const [transitionFrom, setTransitionFrom] = useState<(typeof POLICY_STATUSES)[number]>('pending');
  const [transitionTo, setTransitionTo] = useState<(typeof POLICY_STATUSES)[number]>('active');
  const [form, setForm] = useState({
    firstName: '', lastName: '', idNumber: '', phone: '', email: '',
    address: '', city: '', province: '',
    depFirstName: '', depLastName: '', depRelationship: '',
    benFirstName: '', benLastName: '', benPercentage: '100',
    product: 'pr1',
    billingFrequency: 'monthly',
    policyStatus: 'pending',
    waitingPeriodDays: '0',
    startDate: new Date().toISOString().slice(0, 10),
    nextDueDate: new Date().toISOString().slice(0, 10),
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

  const addTransition = () => {
    setPolicyRules((previous) => {
      const currentTargets = previous[transitionFrom] ?? [];
      if (currentTargets.includes(transitionTo)) {
        return previous;
      }

      return {
        ...previous,
        [transitionFrom]: [...currentTargets, transitionTo],
      };
    });
  };

  const removeTransition = (from: string, to: string) => {
    setPolicyRules((previous) => {
      const currentTargets = previous[from] ?? [];
      const nextTargets = currentTargets.filter((item) => item !== to);
      const nextRules = { ...previous };

      if (nextTargets.length === 0) {
        delete nextRules[from];
      } else {
        nextRules[from] = nextTargets;
      }

      return nextRules;
    });
  };

  const submitMember = async () => {
    if (!form.firstName || !form.lastName || !form.idNumber || !form.phone) {
      setNotice('Please complete all required personal details.');
      return;
    }

    const selectedProduct = products.find((product) => product.id === form.product);
    if (!selectedProduct) {
      setNotice('Please select a valid package before continuing.');
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      const member = await createMember({
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

      await createPolicy({
        memberId: member.id,
        parlourId: currentUser.parlourId || 'p1',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        status: form.policyStatus as (typeof POLICY_STATUSES)[number],
        premiumAmount: selectedProduct.premiumFrom,
        waitingPeriodDays: Math.max(0, Number(form.waitingPeriodDays) || 0),
        billingFrequency: form.billingFrequency as 'monthly' | 'weekly' | 'annually',
        nextDueDate: form.nextDueDate,
        startDate: form.startDate,
        coverAmount: selectedProduct.coverFrom,
        arrearsAmount: 0,
        allowedStatusTransitions: Object.keys(policyRules).length > 0 ? policyRules : undefined,
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
        {['Personal Info', 'Dependants', 'Beneficiary', 'Package', 'Policy Rules'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium' : 'text-slate-400'}`}>{s}</span>
            {i < 4 && <div className="w-8 h-px bg-slate-300" />}
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

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Policy Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Initial Policy Status</label>
                <select value={form.policyStatus} onChange={(e) => update('policyStatus', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  {POLICY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Billing Frequency</label>
                <select value={form.billingFrequency} onChange={(e) => update('billingFrequency', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Policy Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Next Due Date</label>
                <input type="date" value={form.nextDueDate} onChange={(e) => update('nextDueDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Waiting Period (days)</label>
              <input
                type="number"
                min={0}
                value={form.waitingPeriodDays}
                onChange={(e) => update('waitingPeriodDays', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Allowed Status Transitions (optional)</label>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <select value={transitionFrom} onChange={(e) => setTransitionFrom(e.target.value as (typeof POLICY_STATUSES)[number])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {POLICY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <select value={transitionTo} onChange={(e) => setTransitionTo(e.target.value as (typeof POLICY_STATUSES)[number])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {POLICY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button type="button" onClick={addTransition} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900">Add</button>
                </div>

                <div className="mt-3 space-y-2">
                  {Object.entries(policyRules).length === 0 && (
                    <p className="text-xs text-slate-500">No custom transitions added. Default transition rules will apply.</p>
                  )}

                  {Object.entries(policyRules).map(([from, toList]) => (
                    <div key={from} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{from}</p>
                      <div className="flex flex-wrap gap-2">
                        {toList.map((to) => (
                          <button key={`${from}-${to}`} type="button" onClick={() => removeTransition(from, to)} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100" title="Remove transition">
                            {to} x
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Policy Admin can define custom transitions per member policy at onboarding.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
          {notice && <div className="mr-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{notice}</div>}
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50">Previous</button>
          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Next</button>
          ) : (
            <button disabled={saving} onClick={() => void submitMember()} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">{saving ? 'Creating...' : 'Create Member + Policy'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

