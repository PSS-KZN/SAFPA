import { useRole } from '../../contexts/RoleContext';
import { Phone, Mail, MapPin, Clock, Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { submitWebsiteInquiry } from '../../services/leadsApi';
import { fetchParlourById } from '../../services/parloursApi';
import { fetchProducts } from '../../services/productsApi';
import type { Parlour, Product } from '../../types';

export default function WebsitePreview() {
  const { currentUser } = useRole();
  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const parlourId = currentUser.parlourId || 'p1';

  useEffect(() => {
    const load = async () => {
      try {
        const [parlourRecord, productRecords] = await Promise.all([
          fetchParlourById(parlourId),
          fetchProducts(parlourId),
        ]);
        setParlour(parlourRecord);
        setProducts(productRecords.filter((product) => product.isActive));
      } catch {
        setParlour(null);
        setProducts([]);
      }
    };

    void load();
  }, [parlourId]);

  const packageCards = useMemo(() => {
    return products.slice(0, 3).map((product) => ({
      name: product.name,
      price: `R${product.premiumFrom}`,
      cover: `R${product.coverFrom.toLocaleString()}`,
      features: [
        `${product.maxDependants} dependants max`,
        'Waiting period configured per member policy',
        product.description,
      ],
    }));
  }, [products]);

  if (!parlour) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading website preview...</div>;
  }

  const submitInquiry = async () => {
    const parts = form.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || 'Lead';

    if (!firstName || !form.phone) {
      setNotice('Please enter your name and phone number.');
      return;
    }

    try {
      setSubmitting(true);
      setNotice(null);
      await submitWebsiteInquiry({
        parlourId: parlour.id,
        firstName,
        lastName,
        phone: form.phone,
        email: form.email || undefined,
        message: form.message || undefined,
      });

      setForm({ fullName: '', phone: '', email: '', message: '' });
      setNotice('Inquiry submitted successfully. A consultant will contact you shortly.');
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Website Preview</h1>
        <span className="text-sm text-slate-500">Preview of auto-generated website for {parlour.name}</span>
      </div>

      {/* Preview Frame */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Hero */}
        <div className="relative h-64 flex items-center justify-center text-white" style={{ backgroundColor: parlour.primaryColor }}>
          <div className="text-center z-10">
            <h2 className="text-4xl font-bold mb-2">{parlour.name}</h2>
            <p className="text-lg opacity-90">Compassionate care in your time of need</p>
            <div className="mt-6 flex gap-3 justify-center">
              <button className="bg-white text-slate-800 px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-100">Get a Quote</button>
              <button className="border border-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-white/10">Contact Us</button>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Our Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Funeral Planning', desc: 'Complete funeral planning and coordination, from venue booking to catering arrangements.' },
              { title: 'Policy Management', desc: 'Affordable funeral cover policies with flexible payment options for individuals and families.' },
              { title: 'Bereavement Support', desc: 'Compassionate support services to guide families through difficult times.' },
            ].map((s) => (
              <div key={s.title} className="text-center p-6 rounded-xl bg-slate-50">
                <Heart className="mx-auto mb-3" size={32} style={{ color: parlour.primaryColor }} />
                <h4 className="font-semibold mb-2">{s.title}</h4>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Packages */}
        <div className="p-8 bg-slate-50">
          <h3 className="text-2xl font-bold text-center mb-8">Our Packages</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packageCards.map((pkg) => (
              <div key={pkg.name} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center">
                <h4 className="font-semibold text-lg">{pkg.name}</h4>
                <p className="text-3xl font-bold my-3" style={{ color: parlour.primaryColor }}>{pkg.price}<span className="text-sm text-slate-400 font-normal">/mo</span></p>
                <p className="text-sm text-slate-500 mb-4">Cover up to {pkg.cover}</p>
                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                  {pkg.features.map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                <button className="w-full py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: parlour.primaryColor }}>Get Started</button>
              </div>
            ))}
            {packageCards.length === 0 && (
              <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No active products configured yet.</div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Contact Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm"><Phone size={18} style={{ color: parlour.primaryColor }} />{parlour.contactPhone}</div>
              <div className="flex items-center gap-3 text-sm"><Mail size={18} style={{ color: parlour.primaryColor }} />{parlour.contactEmail}</div>
              <div className="flex items-center gap-3 text-sm"><MapPin size={18} style={{ color: parlour.primaryColor }} />{parlour.region}, {parlour.province}</div>
              <div className="flex items-center gap-3 text-sm"><Clock size={18} style={{ color: parlour.primaryColor }} />Mon–Fri: 8:00 AM – 5:00 PM</div>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((previous) => ({ ...previous, fullName: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm((previous) => ({ ...previous, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <textarea placeholder="Message" rows={3} value={form.message} onChange={(e) => setForm((previous) => ({ ...previous, message: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              {notice && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{notice}</div>}
              <button disabled={submitting} onClick={() => void submitInquiry()} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ backgroundColor: parlour.primaryColor }}>{submitting ? 'Submitting...' : 'Send Message'}</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-white" style={{ backgroundColor: parlour.primaryColor }}>
          © 2026 {parlour.name}. Powered by SAFPA FPOS.
        </div>
      </div>
    </div>
  );
}

