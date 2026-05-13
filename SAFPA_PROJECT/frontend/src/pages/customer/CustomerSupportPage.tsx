import { Mail, MapPin, Phone } from 'lucide-react';
import { useCustomerPortal } from './customerPortalContext';

export default function CustomerSupportPage() {
  const { parlour, communications, profileForm, savingProfile, updateProfileField, saveProfile } = useCustomerPortal();
  const recentReminders = communications.slice().sort((left, right) => right.sentAt.localeCompare(left.sentAt)).slice(0, 5);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Update My Details</h2>
          <p className="mt-1 text-sm text-slate-500">Keep your contact and address details up to date.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Phone</label>
            <input value={profileForm.phone} onChange={(event) => updateProfileField('phone', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Email</label>
            <input value={profileForm.email} onChange={(event) => updateProfileField('email', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-600">Address</label>
            <input value={profileForm.address} onChange={(event) => updateProfileField('address', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">City</label>
            <input value={profileForm.city} onChange={(event) => updateProfileField('city', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Province</label>
            <input value={profileForm.province} onChange={(event) => updateProfileField('province', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={() => void saveProfile()} disabled={savingProfile} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {savingProfile ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Reminders and Contact</h2>
          <p className="mt-1 text-sm text-slate-500">Recent notices from your parlour and the fastest ways to reach them.</p>
        </div>

        <div className="mb-5 space-y-3">
          {recentReminders.length > 0 ? (
            recentReminders.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-900">{item.subject || item.template}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${item.status === 'delivered' ? 'bg-green-100 text-green-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">{item.type.toUpperCase()} sent on {item.sentAt}</div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No reminders or recent communications were found for your profile.</div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a href={`tel:${parlour.supportPhone || parlour.contactPhone}`} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><Phone size={16} /> Call Parlour</div>
            <div className="mt-2 text-sm text-slate-500">{parlour.supportPhone || parlour.contactPhone}</div>
          </a>
          <a href={`mailto:${parlour.supportEmail || parlour.contactEmail}`} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><Mail size={16} /> Email Parlour</div>
            <div className="mt-2 text-sm text-slate-500">{parlour.supportEmail || parlour.contactEmail}</div>
          </a>
          <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><MapPin size={16} /> Visit or Write</div>
            <div className="mt-2 text-sm text-slate-500">{parlour.physicalAddress || 'Contact the parlour for the nearest branch address.'}</div>
          </div>
        </div>
      </section>
    </div>
  );
}