import { useRole } from '../../contexts/RoleContext';
import { parlours } from '../../data/parlours';
import { Phone, Mail, MapPin, Clock, Heart } from 'lucide-react';

export default function WebsitePreview() {
  const { currentUser } = useRole();
  const parlour = parlours.find((p) => p.id === (currentUser.parlourId || 'p1')) || parlours[0];

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
            {[
              { name: 'Basic Cover', price: 'R50', cover: 'R5,000', features: ['Individual cover', 'Up to 2 dependants', '6-month waiting period'] },
              { name: 'Family Cover', price: 'R150', cover: 'R15,000', features: ['Family cover', 'Up to 6 dependants', '3-month waiting period', 'Grocery benefit'] },
              { name: 'Premium Cover', price: 'R350', cover: 'R50,000', features: ['Extended family', 'Up to 10 dependants', 'No waiting period', 'Repatriation included', 'Tombstone benefit'] },
            ].map((pkg) => (
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
              <input type="text" placeholder="Full Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="tel" placeholder="Phone Number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="email" placeholder="Email Address" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <textarea placeholder="Message" rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <button className="w-full py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: parlour.primaryColor }}>Send Message</button>
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

