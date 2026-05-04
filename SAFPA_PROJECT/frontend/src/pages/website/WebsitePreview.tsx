import { useRole } from '../../contexts/RoleContext';
import { Phone, Mail, MapPin, Clock, Heart, ShieldCheck, Building2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const heroCardStyle = parlour.websiteTemplate === 'modern' ? 'rounded-[2rem]' : 'rounded-xl';

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
        <span className="text-sm text-slate-500">Preview of the {parlour.websiteTemplate} website template for {parlour.name}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          Website URL: <span className="font-medium text-slate-700">{websiteUrl}</span> · Status: <span className="font-medium text-slate-700">{parlour.websitePublishStatus.replace('_', ' ')}</span>
        </div>

        <div className={`m-4 overflow-hidden border border-slate-200 bg-white shadow-sm ${heroCardStyle}`}>
          <div className="relative px-8 py-12 text-white md:px-12 md:py-16" style={heroGradient}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{content.heroKicker}</div>
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 p-2 text-slate-700 shadow-sm">
                    {parlour.logo ? <img src={resolveAssetUrl(parlour.logo)} alt={`${parlour.name} logo`} className="h-full w-full object-contain" /> : <span className="text-lg font-bold">{parlour.name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold md:text-5xl">{parlour.name}</h2>
                    <p className="mt-1 text-base text-white/85">{tagline}</p>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-white/85 md:text-base">{description}</p>
                <div className="mt-3 max-w-2xl text-sm leading-6 text-white/80">{content.heroBody}</div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm" style={buttonStyle}>Get a Quote</button>
                  <button className="rounded-lg border border-white/60 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10">Contact Us</button>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-sm font-semibold text-white">Website Snapshot</div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/90">
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-white/60">Template</div>
                    <div className="font-medium">{parlour.websiteTemplate}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-white/60">Domain</div>
                    <div className="font-medium break-all">{websiteUrl}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-white/60">Support line</div>
                    <div className="font-medium">{supportPhone}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">{content.servicesTitle}</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Your saved branding details now drive this website preview, including template choice, public copy, contact profile, and call-to-action styling.</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-white" style={buttonStyle}>{parlour.websiteTemplate} template</span>
          </div>

          <div className={`grid grid-cols-1 gap-6 ${parlour.websiteTemplate === 'modern' ? 'md:grid-cols-[1.1fr_0.9fr_1fr]' : 'md:grid-cols-3'}`}>
            {content.sections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className={`rounded-2xl border border-slate-200 p-6 ${parlour.websiteTemplate === 'community' ? 'bg-amber-50/40' : 'bg-slate-50'}`}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white" style={buttonStyle}>
                    <Icon size={22} />
                  </div>
                  <h4 className="text-lg font-semibold">{section.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-50 p-8 md:p-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">Our Packages</h3>
              <p className="mt-2 text-sm text-slate-500">Packages are rendered from active products and styled using the saved palette so parlour owners can see exactly how commercial offerings appear on the public website.</p>
            </div>
            {packageCards.length > 0 && (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: parlour.accentColor }} />
                Top 3 active packages
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            {packageCards.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-3xl border bg-white p-6 shadow-sm ${pkg.isRecommended ? 'border-slate-900/10 shadow-xl ring-1 ring-slate-900/5' : 'border-slate-200'}`}
              >
                {pkg.isRecommended && (
                  <div className="absolute left-6 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm" style={buttonStyle}>
                    Recommended
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Package</div>
                    <h4 className="mt-2 text-xl font-semibold text-slate-900">{pkg.name}</h4>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${pkg.isRecommended ? 'text-white' : 'text-slate-700'}`} style={pkg.isRecommended ? buttonStyle : { backgroundColor: `${parlour.primaryColor}12` }}>
                    From {pkg.price}/mo
                  </span>
                </div>

                <div className={`mt-5 rounded-2xl border p-4 ${pkg.isRecommended ? 'border-transparent text-white' : 'border-slate-200 bg-slate-50'}`} style={pkg.isRecommended ? heroGradient : undefined}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coverage</div>
                  <div className="mt-2 text-2xl font-bold" style={pkg.isRecommended ? undefined : { color: parlour.primaryColor }}>{pkg.cover}</div>
                  <div className={`mt-2 text-sm ${pkg.isRecommended ? 'text-white/80' : 'text-slate-500'}`}>{pkg.dependantLabel}</div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-500">{pkg.description}</p>

                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <ShieldCheck size={16} style={{ color: parlour.accentColor }} className="mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-6 w-full rounded-xl py-3 text-sm font-medium shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${pkg.isRecommended ? 'text-white' : 'text-slate-900'}`}
                  style={pkg.isRecommended ? heroGradient : { backgroundColor: `${parlour.accentColor}1a`, border: `1px solid ${parlour.accentColor}33` }}
                >
                  {pkg.isRecommended ? 'Choose Recommended Plan' : 'Get Started'}
                </button>
              </div>
            ))}

            {packageCards.length === 0 && (
              <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No active products configured yet.</div>
            )}
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{content.trustTitle}</h3>
                <p className="mt-2 text-sm text-slate-500">The strongest reassurance points are centered here so the section feels balanced and easier to scan.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {content.trustPoints.map((point) => (
                  <div key={point} className="flex flex-col items-center justify-center rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-6 text-center shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <ShieldCheck size={20} style={{ color: parlour.primaryColor }} />
                    </div>
                    <span className="mt-4 max-w-[16rem] text-sm font-medium leading-6 text-slate-700">{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.75rem] p-6 text-white shadow-sm md:p-7" style={heroGradient}>
                <div className="text-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Business profile</div>
                  <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-white/90">{description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h3 className="mb-8 text-2xl font-bold">{content.contactTitle}</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm"><Phone size={18} style={{ color: parlour.primaryColor }} />{supportPhone}</div>
                  <div className="flex items-center gap-3 text-sm"><Mail size={18} style={{ color: parlour.primaryColor }} />{supportEmail}</div>
                  <div className="flex items-center gap-3 text-sm"><MapPin size={18} style={{ color: parlour.primaryColor }} />{address}</div>
                  <div className="flex items-center gap-3 text-sm"><Clock size={18} style={{ color: parlour.primaryColor }} />Mon–Fri: 8:00 AM – 5:00 PM</div>
                  <div className="flex items-center gap-3 text-sm"><Building2 size={18} style={{ color: parlour.primaryColor }} />{websiteUrl}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <input type="text" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((previous) => ({ ...previous, fullName: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm((previous) => ({ ...previous, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <textarea placeholder="Message" rows={3} value={form.message} onChange={(e) => setForm((previous) => ({ ...previous, message: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              {notice && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{notice}</div>}
              <button disabled={submitting} onClick={() => void submitInquiry()} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={buttonStyle}>{submitting ? 'Submitting...' : 'Send Message'}</button>
            </div>
          </div>
        </div>

        <div className="p-6 text-center text-sm text-white" style={heroGradient}>
          © 2026 {parlour.name}. Powered by SAFPA FPOS. {parlour.websitePublishStatus === 'published' ? 'Public website is marked as published.' : parlour.websitePublishStatus === 'ready' ? 'Branding is ready for publication.' : 'This preview is not yet published.'}
        </div>
      </div>
    </div>
  );
}

