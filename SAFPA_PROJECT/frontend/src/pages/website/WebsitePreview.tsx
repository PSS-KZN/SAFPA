import { useRole } from '../../contexts/RoleContext';
import { ArrowRight, Building2, CheckCircle2, Clock, Heart, Mail, MapPin, Phone, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { submitWebsiteInquiry } from '../../services/leadsApi';
import { resolveAssetUrl } from '../../services/http';
import { fetchParlourById } from '../../services/parloursApi';
import { fetchProducts } from '../../services/productsApi';
import type { Parlour, Product } from '../../types';

type WebsiteSection = {
  title: string;
  description: string;
  icon: typeof Heart;
};

type WebsiteTemplateContent = {
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  servicesTitle: string;
  sections: WebsiteSection[];
  trustTitle: string;
  trustPoints: string[];
  contactTitle: string;
};

type InquiryFormState = {
  fullName: string;
  phone: string;
  email: string;
  message: string;
};

type PackageCard = {
  name: string;
  description: string;
  price: string;
  cover: string;
  dependantLabel: string;
  isRecommended: boolean;
  features: string[];
};

type SharedTemplateProps = {
  parlour: Parlour;
  content: WebsiteTemplateContent;
  websiteUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  tagline: string;
  description: string;
  buttonStyle: CSSProperties;
  heroGradient: CSSProperties;
  packageCards: PackageCard[];
  form: InquiryFormState;
  setForm: Dispatch<SetStateAction<InquiryFormState>>;
  notice: string | null;
  submitting: boolean;
  onSubmit: () => void;
};

const templateContent: Record<Parlour['websiteTemplate'], WebsiteTemplateContent> = {
  heritage: {
    heroKicker: 'Heritage template',
    heroTitle: 'Dignified funeral support for every family.',
    heroBody: 'A calm, trusted presentation built for established funeral parlours that want to communicate reliability, ceremony, and compassionate service.',
    servicesTitle: 'Trusted Service Areas',
    sections: [
      { title: 'Funeral Planning', description: 'Structured planning support from first call to final ceremony arrangements.', icon: Heart },
      { title: 'Family Guidance', description: 'Clear support for documentation, scheduling, and practical next steps during bereavement.', icon: Users },
      { title: 'Policy Administration', description: 'Member policy servicing, premium support, and cover guidance managed with consistency.', icon: ShieldCheck },
    ],
    trustTitle: 'Why families choose this parlour',
    trustPoints: ['Respectful service delivery', 'Clear support contact details', 'Professional funeral policy administration'],
    contactTitle: 'Speak to our support team',
  },
  modern: {
    heroKicker: 'Modern template',
    heroTitle: 'Professional cover and funeral services in one digital experience.',
    heroBody: 'A sharper, more commercial layout suited to growth-focused parlours that want strong package presentation and fast enquiries.',
    servicesTitle: 'What We Offer',
    sections: [
      { title: 'Instant Enquiries', description: 'Faster lead capture and direct contact options for families comparing service options.', icon: Building2 },
      { title: 'Flexible Packages', description: 'Clear package presentation with premium and cover values surfaced up front.', icon: ShieldCheck },
      { title: 'Coordinated Support', description: 'A practical experience for service scheduling, updates, and branch contact visibility.', icon: Users },
    ],
    trustTitle: 'Built for clarity and confidence',
    trustPoints: ['Clear pricing cues', 'Fast lead capture', 'Professional digital presence'],
    contactTitle: 'Request a consultation',
  },
  community: {
    heroKicker: 'Community template',
    heroTitle: 'Local support that families can reach and trust.',
    heroBody: 'A warmer community-first layout for parlours that want accessibility, local identity, and straightforward funeral support messaging.',
    servicesTitle: 'Community Support Services',
    sections: [
      { title: 'Local Assistance', description: 'Reachable support for nearby families who want a familiar and practical service experience.', icon: MapPin },
      { title: 'Family Cover', description: 'Simple policy options that can be explained clearly to households and community groups.', icon: ShieldCheck },
      { title: 'Bereavement Care', description: 'Compassionate guidance that keeps next steps understandable and personal.', icon: Heart },
    ],
    trustTitle: 'Community-first strengths',
    trustPoints: ['Locally recognisable support', 'Simple contact channels', 'Accessible package presentation'],
    contactTitle: 'Get in touch with our local team',
  },
};

function resolveWebsiteUrl(parlour: Parlour): string {
  if (parlour.customDomain) {
    return parlour.customDomain;
  }

  if (parlour.websiteSubdomain) {
    return `${parlour.websiteSubdomain}.safpa.co.za`;
  }

  return 'subdomain-pending.safpa.co.za';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function LogoBadge({ parlour }: { parlour: Parlour }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/90 p-2 text-slate-700 shadow-sm">
      {parlour.logo ? <img src={resolveAssetUrl(parlour.logo)} alt={`${parlour.name} logo`} className="h-full w-full object-contain" /> : <span className="text-lg font-bold">{parlour.name.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

function ContactDetails({ parlour, supportPhone, supportEmail, address, websiteUrl, tone = 'light' }: {
  parlour: Parlour;
  supportPhone: string;
  supportEmail: string;
  address: string;
  websiteUrl: string;
  tone?: 'light' | 'dark';
}) {
  const textClass = tone === 'dark' ? 'text-white/88' : 'text-slate-700';
  const iconClass = tone === 'dark' ? 'text-white' : '';

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 text-sm ${textClass}`}><Phone size={18} className={iconClass} style={tone === 'dark' ? undefined : { color: parlour.primaryColor }} />{supportPhone}</div>
      <div className={`flex items-center gap-3 text-sm ${textClass}`}><Mail size={18} className={iconClass} style={tone === 'dark' ? undefined : { color: parlour.primaryColor }} />{supportEmail}</div>
      <div className={`flex items-center gap-3 text-sm ${textClass}`}><MapPin size={18} className={iconClass} style={tone === 'dark' ? undefined : { color: parlour.primaryColor }} />{address}</div>
      <div className={`flex items-center gap-3 text-sm ${textClass}`}><Clock size={18} className={iconClass} style={tone === 'dark' ? undefined : { color: parlour.primaryColor }} />Mon-Fri: 8:00 AM - 5:00 PM</div>
      <div className={`flex items-center gap-3 text-sm ${textClass}`}><Building2 size={18} className={iconClass} style={tone === 'dark' ? undefined : { color: parlour.primaryColor }} />{websiteUrl}</div>
    </div>
  );
}

function InquiryForm({ form, setForm, notice, submitting, onSubmit, buttonStyle, surfaceClass = 'bg-white', inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400', noticeClass = 'border-slate-200 bg-slate-50 text-slate-600' }: {
  form: InquiryFormState;
  setForm: Dispatch<SetStateAction<InquiryFormState>>;
  notice: string | null;
  submitting: boolean;
  onSubmit: () => void;
  buttonStyle: CSSProperties;
  surfaceClass?: string;
  inputClass?: string;
  noticeClass?: string;
}) {
  return (
    <div className={`space-y-3 rounded-[1.75rem] border border-slate-200 p-6 shadow-sm ${surfaceClass}`}>
      <input type="text" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((previous) => ({ ...previous, fullName: e.target.value }))} className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`} />
      <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))} className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`} />
      <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm((previous) => ({ ...previous, email: e.target.value }))} className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`} />
      <textarea placeholder="Message" rows={4} value={form.message} onChange={(e) => setForm((previous) => ({ ...previous, message: e.target.value }))} className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`} />
      {notice && <div className={`rounded-xl border px-3 py-3 text-xs ${noticeClass}`}>{notice}</div>}
      <button disabled={submitting} onClick={onSubmit} className="w-full rounded-xl py-3 text-sm font-medium text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60" style={buttonStyle}>{submitting ? 'Submitting...' : 'Send Message'}</button>
    </div>
  );
}

function HeritageTemplatePreview({ parlour, content, websiteUrl, supportEmail, supportPhone, address, tagline, description, buttonStyle, heroGradient, packageCards, form, setForm, notice, submitting, onSubmit }: SharedTemplateProps) {
  const establishedYear = new Date(parlour.joinedDate).getFullYear();

  return (
    <div className="bg-[#f3efe7] text-slate-900">
      <section className="border-b border-[#c7b8a1] bg-[#1f2937] px-6 py-8 text-white md:px-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">{content.heroKicker}</div>
            <div className="mt-5 flex items-center gap-4">
              <LogoBadge parlour={parlour} />
              <div>
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{parlour.name}</h2>
                <p className="mt-1 text-sm uppercase tracking-[0.24em] text-white/60">{tagline}</p>
              </div>
            </div>
            <h3 className="mt-8 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">{content.heroTitle}</h3>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78">{description}</p>
            <p className="mt-4 max-w-2xl border-l-2 border-[#c7b8a1] pl-4 text-sm leading-7 text-white/62">{content.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm" style={buttonStyle}>Plan With Us</button>
              <button className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white">View Service Promise</button>
            </div>
          </div>

          <div className="rounded-sm border border-[#c7b8a1] bg-[#f6f1e8] p-6 text-slate-900 shadow-sm md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Established care profile</div>
            <div className="mt-4 rounded-sm border border-[#d5c7b3] bg-white p-6">
              <div className="text-sm text-slate-500">Trusted support since</div>
              <div className="mt-2 text-4xl font-bold">{Number.isNaN(establishedYear) ? 'SAFPA' : establishedYear}</div>
              <div className="mt-3 text-sm text-slate-600">Families choosing this preview see a composed, ceremonial website voice with stronger reassurance cues.</div>
            </div>
            <div className="mt-6 space-y-3">
              {content.trustPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 border-b border-[#e7dccb] px-1 py-4 last:border-b-0">
                  <CheckCircle2 size={18} style={{ color: parlour.accentColor }} className="mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-6 text-slate-600">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8ccb9] bg-[#f8f5ef] px-6 py-10 md:px-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ceremony-first structure</div>
            <h3 className="mt-2 text-2xl font-bold">{content.servicesTitle}</h3>
          </div>
          <div className="border border-[#c7b8a1] bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">Formal editorial layout</div>
        </div>
        <div className="border border-[#d8ccb9] bg-white">
          <div className="grid gap-0 md:grid-cols-3">
            {content.sections.map((section, index) => {
              const Icon = section.icon;
              const sectionBorderClass = index < content.sections.length - 1 ? 'md:border-r border-[#e7dccb]' : '';

              return (
                <div key={section.title} className={`p-6 md:min-h-[220px] ${sectionBorderClass}`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm text-white" style={buttonStyle}>
                    <Icon size={24} />
                  </div>
                  <h4 className="mt-6 text-lg font-semibold">{section.title}</h4>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{section.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8ccb9] bg-white px-6 py-10 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why this page feels different</div>
            <h3 className="mt-2 text-2xl font-bold">Trust and planning come before selling.</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">The heritage preview leads with reputation, family process, and dignified service framing before commercial packages, so the tone feels measured rather than promotional.</p>
            <div className="mt-6 border border-[#d8ccb9] bg-[#f8f5ef] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Support profile</div>
              <div className="mt-3 text-lg font-semibold">{content.contactTitle}</div>
              <div className="mt-4">
                <ContactDetails parlour={parlour} supportPhone={supportPhone} supportEmail={supportEmail} address={address} websiteUrl={websiteUrl} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Packages in an editorial cadence</div>
                <h3 className="mt-2 text-2xl font-bold">Our Packages</h3>
              </div>
              <span className="border border-[#c7b8a1] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">Top 3 active packages</span>
            </div>
            <div className="space-y-4">
              {packageCards.map((pkg) => (
                <div key={pkg.name} className="grid gap-4 border border-[#d8ccb9] bg-[#fcfaf7] p-5 md:grid-cols-[0.7fr_1.3fr] md:items-center">
                  <div className="border border-[#d2c2ab] p-5 text-white" style={pkg.isRecommended ? heroGradient : buttonStyle}>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{pkg.isRecommended ? 'Preferred plan' : 'Service plan'}</div>
                    <h4 className="mt-2 text-2xl font-semibold">{pkg.name}</h4>
                    <div className="mt-3 text-sm text-white/80">From {pkg.price}/mo</div>
                    <div className="mt-1 text-lg font-medium">Cover {pkg.cover}</div>
                  </div>
                  <div>
                    <p className="text-sm leading-7 text-slate-600">{pkg.description}</p>
                    <div className="mt-4 text-sm font-medium text-slate-800">{pkg.dependantLabel}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {pkg.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                          <ShieldCheck size={16} style={{ color: parlour.accentColor }} className="mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {packageCards.length === 0 && <div className="border border-[#d8ccb9] bg-[#fcfaf7] p-6 text-center text-slate-500">No active products configured yet.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe7] px-6 py-10 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-[#c7b8a1] bg-white p-7 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Family assurance</div>
            <h3 className="mt-3 text-2xl font-bold">{content.trustTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">The reassurance section is styled like a formal pledge rather than a marketing strip, which keeps the page anchored in care and professionalism.</p>
            <div className="mt-6 space-y-4">
              {content.trustPoints.map((point) => (
                <div key={point} className="border-l-4 px-4 py-4 text-sm text-slate-700" style={{ borderColor: parlour.accentColor, backgroundColor: '#f8f5ef' }}>{point}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Enquiry desk</div>
            <InquiryForm form={form} setForm={setForm} notice={notice} submitting={submitting} onSubmit={onSubmit} buttonStyle={buttonStyle} surfaceClass="border border-[#c7b8a1] bg-white" inputClass="border-[#d8ccb9] bg-[#fcfaf7] text-slate-900 placeholder:text-slate-400" noticeClass="border-[#d8ccb9] bg-[#f8f5ef] text-slate-700" />
          </div>
        </div>
      </section>

      <div className="border-t border-[#c7b8a1] bg-[#d8ccb9] px-6 py-4 text-center text-sm text-slate-700 md:px-10">
        {parlour.name} online profile: ceremonial, trust-led, and paced for reassurance.
      </div>
    </div>
  );
}

function ModernTemplatePreview({ parlour, content, websiteUrl, supportEmail, supportPhone, address, tagline, description, buttonStyle, heroGradient, packageCards, form, setForm, notice, submitting, onSubmit }: SharedTemplateProps) {
  return (
    <div className="bg-slate-950 text-white">
      <section className="overflow-hidden px-6 py-8 md:px-10 md:py-10">
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_38%),linear-gradient(145deg,#0f172a,#111827)] p-6 shadow-2xl md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                <Sparkles size={14} /> {content.heroKicker}
              </div>
              <div className="mt-6 flex items-center gap-4">
                <LogoBadge parlour={parlour} />
                <div>
                  <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{parlour.name}</h2>
                  <p className="mt-1 text-sm text-white/60">{tagline}</p>
                </div>
              </div>
              <h3 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{content.heroTitle}</h3>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">{description}</p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">{content.heroBody}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg" style={heroGradient}>Get a Quote</button>
                <button className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white">Compare Packages</button>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Packages</div>
                  <div className="mt-2 text-3xl font-bold">{packageCards.length}</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Lead Path</div>
                  <div className="mt-2 text-lg font-semibold">Fast enquiry capture</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Domain</div>
                  <div className="mt-2 text-sm font-medium text-white/85 break-all">{websiteUrl}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/50">Consultation funnel</div>
                    <div className="mt-2 text-2xl font-semibold">{content.contactTitle}</div>
                  </div>
                  <ArrowRight size={20} className="text-white/60" />
                </div>
                <p className="mt-3 text-sm leading-7 text-white/70">This version pushes conversion harder, leading with visible commercial offers, stronger CTA contrast, and faster paths to contact.</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-lg">
                <ContactDetails parlour={parlour} supportPhone={supportPhone} supportEmail={supportEmail} address={address} websiteUrl={websiteUrl} tone="dark" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-6 md:px-10 md:pb-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Commercial-first package grid</div>
            <h3 className="mt-2 text-2xl font-bold">Our Packages</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">Recommended plan stays center-stage</div>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {packageCards.map((pkg) => (
            <div key={pkg.name} className={`relative rounded-[1.75rem] border p-6 shadow-xl ${pkg.isRecommended ? 'border-white/20 bg-white text-slate-900' : 'border-white/10 bg-white/5 text-white'}`}>
              {pkg.isRecommended && <div className="absolute left-6 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white" style={buttonStyle}>Best value</div>}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className={`text-xs uppercase tracking-[0.2em] ${pkg.isRecommended ? 'text-slate-400' : 'text-white/45'}`}>Package</div>
                  <h4 className="mt-2 text-2xl font-semibold">{pkg.name}</h4>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${pkg.isRecommended ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white/80'}`}>From {pkg.price}/mo</div>
              </div>
              <div className={`mt-6 rounded-[1.5rem] p-5 ${pkg.isRecommended ? 'text-white' : ''}`} style={pkg.isRecommended ? heroGradient : { backgroundColor: `${parlour.primaryColor}18` }}>
                <div className={`text-xs uppercase tracking-[0.18em] ${pkg.isRecommended ? 'text-white/70' : 'text-white/70'}`}>Cover amount</div>
                <div className="mt-2 text-3xl font-bold">{pkg.cover}</div>
                <div className={`mt-2 text-sm ${pkg.isRecommended ? 'text-white/85' : 'text-white/80'}`}>{pkg.dependantLabel}</div>
              </div>
              <p className={`mt-5 text-sm leading-7 ${pkg.isRecommended ? 'text-slate-600' : 'text-white/70'}`}>{pkg.description}</p>
              <div className="mt-5 space-y-3">
                {pkg.features.map((feature) => (
                  <div key={feature} className={`flex items-start gap-3 text-sm ${pkg.isRecommended ? 'text-slate-700' : 'text-white/80'}`}>
                    <CheckCircle2 size={16} style={{ color: pkg.isRecommended ? parlour.accentColor : '#ffffff' }} className="mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <button className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ${pkg.isRecommended ? 'text-white' : 'text-slate-900'}`} style={pkg.isRecommended ? buttonStyle : { backgroundColor: '#ffffff' }}>
                {pkg.isRecommended ? 'Choose Recommended Plan' : 'Get Started'} <ArrowRight size={16} />
              </button>
            </div>
          ))}
          {packageCards.length === 0 && <div className="col-span-full rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-center text-white/60">No active products configured yet.</div>}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900 px-6 py-8 md:px-10">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">{content.servicesTitle}</div>
            <h3 className="mt-2 text-2xl font-bold">Built for clarity and action.</h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">The modern template compresses the sales journey: visible offers, strong CTA placement, quick reassurance, and clear next-step signals for digital visitors.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
            {content.trustPoints.map((point) => (
              <div key={point} className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80">{point}</div>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {content.sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={heroGradient}>
                  <Icon size={22} />
                </div>
                <h4 className="mt-6 text-lg font-semibold">{section.title}</h4>
                <p className="mt-3 text-sm leading-7 text-white/65">{section.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Always-on contact block</div>
            <h3 className="mt-3 text-2xl font-bold">{content.contactTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-white/65">Modern keeps the enquiry route prominent even below the hero so visitors never lose the next action.</p>
            <div className="mt-6">
              <ContactDetails parlour={parlour} supportPhone={supportPhone} supportEmail={supportEmail} address={address} websiteUrl={websiteUrl} tone="dark" />
            </div>
          </div>
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Contact Us</div>
            <InquiryForm form={form} setForm={setForm} notice={notice} submitting={submitting} onSubmit={onSubmit} buttonStyle={buttonStyle} surfaceClass="border border-white/12 bg-white/6 backdrop-blur-sm" inputClass="border-white/15 bg-slate-900/80 text-white placeholder:text-white/55" noticeClass="border-white/15 bg-white/8 text-white/85" />
          </div>
        </div>
      </section>

      <div className="border-t border-white/10 bg-slate-950 px-6 py-4 text-center text-sm text-white/55 md:px-10">
        {parlour.name} online profile: commercial, conversion-led, and built to move visitors fast.
      </div>
    </div>
  );
}

function CommunityTemplatePreview({ parlour, content, websiteUrl, supportEmail, supportPhone, address, tagline, description, buttonStyle, heroGradient, packageCards, form, setForm, notice, submitting, onSubmit }: SharedTemplateProps) {
  return (
    <div className="bg-[#fff8ef] text-slate-900">
      <section className="border-b border-amber-200 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(180deg,#fff8ef,#fff3df)] px-6 py-8 md:px-10 md:py-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
          <MapPin size={14} /> {content.heroKicker}
        </div>
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
          <div>
            <div className="flex items-center gap-4">
              <LogoBadge parlour={parlour} />
              <div>
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{parlour.name}</h2>
                <p className="mt-1 text-base text-slate-600">{tagline}</p>
              </div>
            </div>
            <h3 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{content.heroTitle}</h3>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">{content.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm" style={buttonStyle}>Talk to Our Team</button>
              <button className="rounded-full border border-amber-300 bg-white px-6 py-3 text-sm font-medium text-amber-900">See Local Services</button>
            </div>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {content.trustPoints.map((point) => (
                <div key={point} className="rounded-[1.5rem] border border-amber-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">{point}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Your neighbourhood contact point</div>
              <h3 className="mt-3 text-2xl font-bold">{content.contactTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">Community keeps location and reachability visible first, so families immediately know who to call, where to go, and what kind of support to expect.</p>
              <div className="mt-6">
                <ContactDetails parlour={parlour} supportPhone={supportPhone} supportEmail={supportEmail} address={address} websiteUrl={websiteUrl} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-amber-200 bg-[#fff0cf] px-4 py-5 text-slate-800 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Template</div>
                <div className="mt-2 font-semibold">{parlour.websiteTemplate}</div>
              </div>
              <div className="rounded-[1.75rem] border border-amber-200 bg-white px-4 py-5 text-slate-800 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Support line</div>
                <div className="mt-2 font-semibold">{supportPhone}</div>
              </div>
              <div className="rounded-[1.75rem] border border-amber-200 p-4 text-white shadow-sm" style={heroGradient}>
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">Website</div>
                <div className="mt-2 break-all font-semibold">{websiteUrl}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-10">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{content.servicesTitle}</div>
          <h3 className="mt-2 text-2xl font-bold">Support designed to feel close, clear, and reachable.</h3>
        </div>
        <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr_1fr]">
          {content.sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className={`rounded-[2rem] border border-amber-200 p-6 shadow-sm ${index === 1 ? 'bg-[#fff0cf] md:-translate-y-4' : 'bg-white'}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={buttonStyle}>
                  <Icon size={22} />
                </div>
                <h4 className="mt-6 text-lg font-semibold">{section.title}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-600">{section.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-amber-200 bg-[#fff1dd] px-6 py-10 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[1fr_1fr] xl:items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Friendly commercial section</div>
            <h3 className="mt-2 text-2xl font-bold">Our Packages</h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Community keeps products approachable. Plans are presented as easy-to-understand support options rather than sharp sales cards.</p>
          </div>
          <div className="rounded-[1.75rem] border border-amber-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">Packages stay visible, but the layout balances them with personal contact and local reassurance instead of leading with price comparison alone.</div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {packageCards.map((pkg) => (
            <div key={pkg.name} className={`rounded-[2rem] border border-amber-200 p-6 shadow-sm ${pkg.isRecommended ? 'bg-[#fff0cf]' : 'bg-white'}`}>
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-xl font-semibold">{pkg.name}</h4>
                {pkg.isRecommended && <span className="rounded-full px-3 py-1 text-xs font-medium text-white" style={buttonStyle}>Popular</span>}
              </div>
              <div className="mt-5 rounded-[1.75rem] bg-white/70 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Monthly premium</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{pkg.price}</div>
                <div className="mt-3 text-sm text-slate-600">Cover from {pkg.cover}</div>
                <div className="mt-1 text-sm text-slate-500">{pkg.dependantLabel}</div>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">{pkg.description}</p>
              <div className="mt-5 space-y-3">
                {pkg.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Star size={16} style={{ color: parlour.accentColor }} className="mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full rounded-xl py-3 text-sm font-medium text-white shadow-sm" style={buttonStyle}>Ask About This Plan</button>
            </div>
          ))}
          {packageCards.length === 0 && <div className="col-span-full rounded-[2rem] border border-amber-200 bg-white p-6 text-center text-slate-500">No active products configured yet.</div>}
        </div>
      </section>

      <section className="px-6 py-10 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Why neighbours choose us</div>
              <h3 className="mt-3 text-2xl font-bold">{content.trustTitle}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {content.trustPoints.map((point) => (
                  <div key={point} className="rounded-[1.5rem] bg-[#fff8ef] px-4 py-4 text-sm text-slate-700">{point}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Visit or call</div>
              <div className="mt-4">
                <ContactDetails parlour={parlour} supportPhone={supportPhone} supportEmail={supportEmail} address={address} websiteUrl={websiteUrl} />
              </div>
            </div>
          </div>
          <InquiryForm form={form} setForm={setForm} notice={notice} submitting={submitting} onSubmit={onSubmit} buttonStyle={buttonStyle} surfaceClass="bg-white" inputClass="border-amber-200 bg-[#fffcf6] text-slate-900 placeholder:text-slate-400" noticeClass="border-amber-200 bg-[#fff8ef] text-slate-700" />
        </div>
      </section>

      <div className="border-t border-amber-200 bg-[#f6dec0] px-6 py-4 text-center text-sm text-slate-700 md:px-10">
        {parlour.name} online profile: local, approachable, and built around reachable support.
      </div>
    </div>
  );
}

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
    const topProducts = products.slice(0, 3);
    const recommendedIndex = topProducts.length > 1 ? 1 : 0;

    return topProducts.map((product, index) => ({
      name: product.name,
      description: product.description,
      price: formatCurrency(product.premiumFrom),
      cover: formatCurrency(product.coverFrom),
      dependantLabel: product.maxDependants > 0 ? `${product.maxDependants} dependants included` : 'Individual cover option',
      isRecommended: index === recommendedIndex,
      features: [
        product.maxDependants > 0 ? `Up to ${product.maxDependants} dependants covered` : 'Designed for single-member cover',
        'Waiting periods remain aligned to the member policy rules',
        'Application and support handled by the parlour team',
      ],
    }));
  }, [products]);

  const content = useMemo(() => templateContent[parlour?.websiteTemplate || 'heritage'], [parlour?.websiteTemplate]);

  if (!parlour) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading website preview...</div>;
  }

  const websiteUrl = resolveWebsiteUrl(parlour);
  const supportEmail = parlour.supportEmail || parlour.contactEmail;
  const supportPhone = parlour.supportPhone || parlour.contactPhone;
  const address = parlour.physicalAddress || `${parlour.region}, ${parlour.province}`;
  const tagline = parlour.tagline || 'Compassionate care in your time of need';
  const description = parlour.businessDescription || 'A trusted funeral parlour supporting families with funeral planning, policy administration, and practical service guidance.';
  const buttonStyle = { backgroundColor: parlour.accentColor };
  const heroGradient = { background: `linear-gradient(135deg, ${parlour.primaryColor}, ${parlour.secondaryColor})` };
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

  const sharedTemplateProps: SharedTemplateProps = {
    parlour,
    content,
    websiteUrl,
    supportEmail,
    supportPhone,
    address,
    tagline,
    description,
    buttonStyle,
    heroGradient,
    packageCards,
    form,
    setForm,
    notice,
    submitting,
    onSubmit: () => void submitInquiry(),
  };

  let templateView = <HeritageTemplatePreview {...sharedTemplateProps} />;

  if (parlour.websiteTemplate === 'modern') {
    templateView = <ModernTemplatePreview {...sharedTemplateProps} />;
  } else if (parlour.websiteTemplate === 'community') {
    templateView = <CommunityTemplatePreview {...sharedTemplateProps} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Website Preview</h1>
        <span className="text-sm text-slate-500">Preview of the {parlour.websiteTemplate} website template for {parlour.name}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          Website URL: <span className="font-medium text-slate-700">{websiteUrl}</span> · Status: <span className="font-medium text-slate-700">{parlour.websitePublishStatus.replace('_', ' ')}</span>
        </div>
        {templateView}

        <div className="p-6 text-center text-sm text-white" style={heroGradient}>
          © 2026 {parlour.name}. Powered by SAFPA FPOS. {parlour.websitePublishStatus === 'published' ? 'Public website is marked as published.' : parlour.websitePublishStatus === 'ready' ? 'Branding is ready for publication.' : 'This preview is not yet published.'}
        </div>
      </div>
    </div>
  );
}

