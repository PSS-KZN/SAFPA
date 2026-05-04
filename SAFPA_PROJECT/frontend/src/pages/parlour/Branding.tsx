import { useEffect, useMemo, useState } from 'react';
import { Globe, Mail, MapPin, Palette, Phone, RefreshCcw, Save } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { checkParlourSubdomainAvailability, fetchParlourById, updateParlourBranding, uploadParlourLogo } from '../../services/parloursApi';
import { resolveAssetUrl } from '../../services/http';
import type { Parlour } from '../../types';

type BrandingFormState = {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tagline: string;
  businessDescription: string;
  supportEmail: string;
  supportPhone: string;
  physicalAddress: string;
  websiteTemplate: Parlour['websiteTemplate'];
  websiteSubdomain: string;
  customDomain: string;
  customDomainStatus: Parlour['customDomainStatus'];
  customDomainDnsTarget: string;
  customDomainNotes: string;
};

const templateOptions: Array<{ value: Parlour['websiteTemplate']; label: string; description: string }> = [
  { value: 'heritage', label: 'Heritage', description: 'Traditional, dignified layout with stronger ceremony and trust cues.' },
  { value: 'modern', label: 'Modern', description: 'Cleaner presentation with bolder CTAs and polished service sections.' },
  { value: 'community', label: 'Community', description: 'Warmer local-first presentation for accessible neighbourhood brands.' },
];

function createFormFromParlour(parlour: Parlour): BrandingFormState {
  return {
    logo: parlour.logo || '',
    primaryColor: parlour.primaryColor,
    secondaryColor: parlour.secondaryColor,
    accentColor: parlour.accentColor,
    tagline: parlour.tagline || '',
    businessDescription: parlour.businessDescription || '',
    supportEmail: parlour.supportEmail || parlour.contactEmail,
    supportPhone: parlour.supportPhone || parlour.contactPhone,
    physicalAddress: parlour.physicalAddress || '',
    websiteTemplate: parlour.websiteTemplate,
    websiteSubdomain: parlour.websiteSubdomain || '',
    customDomain: parlour.customDomain || '',
    customDomainStatus: parlour.customDomainStatus,
    customDomainDnsTarget: parlour.customDomainDnsTarget || 'cname.safpa-sites.co.za',
    customDomainNotes: parlour.customDomainNotes || '',
  };
}

function formsEqual(left: BrandingFormState, right: BrandingFormState): boolean {
  return Object.entries(left).every(([key, value]) => value === right[key as keyof BrandingFormState]);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(firstHex: string, secondHex: string) {
  const lighter = Math.max(relativeLuminance(firstHex), relativeLuminance(secondHex));
  const darker = Math.min(relativeLuminance(firstHex), relativeLuminance(secondHex));
  return (lighter + 0.05) / (darker + 0.05);
}

export default function Branding() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';

  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [form, setForm] = useState<BrandingFormState | null>(null);
  const [initialForm, setInitialForm] = useState<BrandingFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<{ state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'; message: string }>({ state: 'idle', message: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const record = await fetchParlourById(parlourId);
        const nextForm = createFormFromParlour(record);
        setParlour(record);
        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  useEffect(() => {
    if (!form || !parlour) {
      return;
    }

    const nextValue = form.websiteSubdomain.trim().toLowerCase();
    if (!nextValue) {
      setSubdomainStatus({ state: 'idle', message: 'Choose a SAFPA-hosted subdomain for public website publishing.' });
      return;
    }

    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(nextValue)) {
      setSubdomainStatus({ state: 'invalid', message: 'Use lowercase letters, numbers, and hyphens only.' });
      return;
    }

    setSubdomainStatus({ state: 'checking', message: 'Checking subdomain availability...' });
    const timer = setTimeout(() => {
      void checkParlourSubdomainAvailability(nextValue, parlour.id)
        .then((result) => {
          setSubdomainStatus(
            result.available
              ? { state: 'available', message: `${result.websiteSubdomain}.safpa.co.za is available.` }
              : { state: 'taken', message: `Unavailable. Already used by ${result.takenBy || 'another parlour'}.` }
          );
        })
        .catch((availabilityError) => {
          setSubdomainStatus({ state: 'invalid', message: availabilityError instanceof Error ? availabilityError.message : 'Unable to validate subdomain right now.' });
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [form?.websiteSubdomain, parlour]);

  const isDirty = Boolean(form && initialForm && !formsEqual(form, initialForm));
  const publishStatus = parlour?.websitePublishStatus ?? 'draft';

  const publishBadge = useMemo(() => {
    if (publishStatus === 'published') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (publishStatus === 'ready') {
      return 'bg-blue-100 text-blue-700';
    }

    if (publishStatus === 'needs_review') {
      return 'bg-violet-100 text-violet-700';
    }

    return 'bg-amber-100 text-amber-700';
  }, [publishStatus]);

  const readinessChecks = useMemo(() => ({
    palette: Boolean(form?.primaryColor && form.secondaryColor && form.accentColor),
    profile: Boolean(form?.tagline && form.businessDescription && form.supportEmail && form.supportPhone),
    domain: Boolean(form?.websiteSubdomain) && subdomainStatus.state === 'available',
    customDomainTracked: Boolean(form?.customDomain) ? form?.customDomainStatus !== 'not_requested' : true,
  }), [form, subdomainStatus.state]);

  const contrastAudit = useMemo(() => {
    if (!form) {
      return [];
    }

    const checks = [
      { label: 'Primary colour on white text', ratio: contrastRatio(form.primaryColor, '#ffffff') },
      { label: 'Secondary colour on white text', ratio: contrastRatio(form.secondaryColor, '#ffffff') },
      { label: 'Accent colour on white text', ratio: contrastRatio(form.accentColor, '#ffffff') },
    ];

    return checks.map((item) => ({
      ...item,
      passes: item.ratio >= 4.5,
    }));
  }, [form]);

  const updateField = <K extends keyof BrandingFormState>(field: K, value: BrandingFormState[K]) => {
    setForm((previous) => (previous ? { ...previous, [field]: value } : previous));
    setNotice(null);
  };

  const persistBranding = async (mode: 'auto' | 'published') => {
    if (!form || !parlour) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      const updated = await updateParlourBranding(parlour.id, {
        ...form,
        customDomain: form.customDomain || undefined,
        logo: form.logo || undefined,
        websiteSubdomain: form.websiteSubdomain || undefined,
        websitePublishStatus: mode === 'published' ? 'published' : undefined,
        brandingCompletedAt: new Date().toISOString().slice(0, 10),
      });

      const nextForm = createFormFromParlour(updated);
      setParlour(updated);
      setForm(nextForm);
      setInitialForm(nextForm);
      setNotice(
        updated.websitePublishStatus === 'published'
          ? 'Branding saved and website published.'
          : updated.websitePublishStatus === 'ready'
            ? 'Branding saved. Website is ready to publish.'
            : updated.websitePublishStatus === 'needs_review'
              ? 'Branding saved. Website is awaiting review.'
              : 'Branding draft saved successfully.'
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (!initialForm) {
      return;
    }

    setForm(initialForm);
    setSelectedLogoFile(null);
    setNotice('Unsaved changes were discarded.');
    setError(null);
  };

  const handleLogoUpload = async () => {
    if (!selectedLogoFile || !parlour) {
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);
      setNotice(null);
      const updated = await uploadParlourLogo(parlour.id, selectedLogoFile);
      const nextForm = createFormFromParlour(updated);
      setParlour(updated);
      setForm(nextForm);
      setInitialForm(nextForm);
      setSelectedLogoFile(null);
      setNotice('Logo uploaded successfully. The new asset is now available across branded surfaces.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading || !form || !parlour) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading branding workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branding Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your parlour identity, website presentation, and publishing settings without SAFPA-admin intervention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${publishBadge}`}>
            {publishStatus.replace('_', ' ')}
          </span>
          {isDirty && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">Unsaved changes</span>}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Palette size={18} className="text-slate-500" />
              <h2 className="text-lg font-semibold">Brand Identity</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Logo URL or asset path</label>
                <input value={form.logo} onChange={(e) => updateField('logo', e.target.value)} placeholder="/branding/your-logo.png or https://example.com/logo.png" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <div className="mt-3">
                  <label className="mb-1 block text-sm text-slate-600">Upload logo file</label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700" />
                    <button onClick={() => void handleLogoUpload()} disabled={!selectedLogoFile || uploadingLogo} className="inline-flex h-[42px] items-center justify-center self-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 sm:self-auto disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/90">
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Supported formats: PNG, JPEG, WebP. Max size: 2 MB. Dimensions: 64x64 to 2048x2048.</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Primary colour</label>
                <input type="color" value={form.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 p-1" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Secondary colour</label>
                <input type="color" value={form.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 p-1" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Accent / CTA colour</label>
                <input type="color" value={form.accentColor} onChange={(e) => updateField('accentColor', e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 p-1" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">Quick palette preview</div>
                <div className="flex gap-3">
                  {[form.primaryColor, form.secondaryColor, form.accentColor].map((color) => (
                    <div key={color} className="flex-1 rounded-lg border border-white/60 p-4 text-center text-xs font-medium text-white shadow-sm" style={{ backgroundColor: color }}>
                      {color}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe size={18} className="text-slate-500" />
              <h2 className="text-lg font-semibold">Business Profile</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Tagline</label>
                <input value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} placeholder="Compassionate care, dignified farewells." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Business description</label>
                <textarea value={form.businessDescription} onChange={(e) => updateField('businessDescription', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Support email</label>
                  <input value={form.supportEmail} onChange={(e) => updateField('supportEmail', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Support phone</label>
                  <input value={form.supportPhone} onChange={(e) => updateField('supportPhone', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Physical address</label>
                <textarea value={form.physicalAddress} onChange={(e) => updateField('physicalAddress', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe size={18} className="text-slate-500" />
              <h2 className="text-lg font-semibold">Website Setup</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-600">Template choice</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {templateOptions.map((option) => {
                    const selected = form.websiteTemplate === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('websiteTemplate', option.value)}
                        className={`rounded-xl border p-4 text-left transition-colors ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
                      >
                        <div className="font-semibold">{option.label}</div>
                        <div className={`mt-2 text-sm ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{option.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">SAFPA subdomain</label>
                  <input value={form.websiteSubdomain} onChange={(e) => updateField('websiteSubdomain', e.target.value.toLowerCase())} placeholder="ubuntu-funerals" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-xs text-slate-500">Public URL: {form.websiteSubdomain ? `${form.websiteSubdomain}.safpa.co.za` : 'choose-a-subdomain.safpa.co.za'}</p>
                  <p className={`mt-1 text-xs ${subdomainStatus.state === 'available' ? 'text-emerald-600' : subdomainStatus.state === 'taken' || subdomainStatus.state === 'invalid' ? 'text-red-600' : 'text-slate-500'}`}>{subdomainStatus.message}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Custom domain</label>
                  <input value={form.customDomain} onChange={(e) => updateField('customDomain', e.target.value.toLowerCase())} placeholder="www.yourparlour.co.za" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-xs text-slate-500">Tracked for assisted setup. DNS automation is not part of MVP.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Custom domain status</label>
                  <select value={form.customDomainStatus} onChange={(e) => updateField('customDomainStatus', e.target.value as BrandingFormState['customDomainStatus'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="not_requested">Not requested</option>
                    <option value="requested">Requested</option>
                    <option value="configured">Configured</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">DNS target</label>
                  <input value={form.customDomainDnsTarget} onChange={(e) => updateField('customDomainDnsTarget', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Assisted setup notes</label>
                  <input value={form.customDomainNotes} onChange={(e) => updateField('customDomainNotes', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={resetChanges} disabled={!isDirty || saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCcw size={16} />
              Reset
            </button>
            <button onClick={() => void persistBranding('auto')} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => void persistBranding('published')} disabled={saving || subdomainStatus.state === 'taken' || subdomainStatus.state === 'invalid'} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              <Globe size={16} />
              {saving ? 'Publishing...' : 'Publish Website'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 text-sm font-semibold text-slate-700 shadow-sm">
                  {form.logo ? <img src={resolveAssetUrl(form.logo)} alt={`${parlour.name} logo`} className="h-12 w-12 object-contain" /> : parlour.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/70">Live preview</div>
                  <h3 className="mt-1 text-2xl font-bold">{parlour.name}</h3>
                  <p className="mt-1 text-sm text-white/85">{form.tagline || 'Your public-facing brand summary appears here.'}</p>
                </div>
              </div>
              <button className="mt-5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: form.accentColor }}>
                Request Assistance
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Business description</div>
                <p className="text-sm text-slate-600">{form.businessDescription || 'Add a short description so families and prospects understand your service proposition.'}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail size={16} style={{ color: form.primaryColor }} />{form.supportEmail || 'support@example.co.za'}</div>
                <div className="flex items-center gap-2"><Phone size={16} style={{ color: form.primaryColor }} />{form.supportPhone || '011 000 0000'}</div>
                <div className="flex items-center gap-2"><MapPin size={16} style={{ color: form.primaryColor }} />{form.physicalAddress || 'Add your public service address'}</div>
                <div className="flex items-center gap-2"><Globe size={16} style={{ color: form.primaryColor }} />{form.customDomain || (form.websiteSubdomain ? `${form.websiteSubdomain}.safpa.co.za` : 'Subdomain pending')}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Workspace Readiness</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Brand palette set</span>
                <span className={form.primaryColor && form.secondaryColor && form.accentColor ? 'text-emerald-600' : 'text-amber-600'}>
                  {form.primaryColor && form.secondaryColor && form.accentColor ? 'Ready' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Business profile complete</span>
                <span className={readinessChecks.profile ? 'text-emerald-600' : 'text-amber-600'}>
                  {readinessChecks.profile ? 'Ready' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Website domain chosen</span>
                <span className={readinessChecks.domain ? 'text-emerald-600' : 'text-amber-600'}>{readinessChecks.domain ? 'Ready' : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Custom domain workflow tracked</span>
                <span className={readinessChecks.customDomainTracked ? 'text-emerald-600' : 'text-amber-600'}>{readinessChecks.customDomainTracked ? form.customDomainStatus.replace('_', ' ') : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-slate-600">Publishing status</span>
                <span className={publishStatus === 'published' ? 'text-emerald-600' : publishStatus === 'ready' ? 'text-blue-600' : 'text-slate-500'}>{publishStatus.replace('_', ' ')}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Contrast Audit</h2>
            <div className="mt-4 space-y-3 text-sm">
              {contrastAudit.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-slate-600">{item.label}</span>
                  <span className={item.passes ? 'text-emerald-600' : 'text-amber-600'}>
                    {item.ratio.toFixed(2)}:1 {item.passes ? 'Pass' : 'Review'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-slate-500">Target contrast for normal text is 4.5:1 or higher. Review weaker combinations before pilot rollout.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}