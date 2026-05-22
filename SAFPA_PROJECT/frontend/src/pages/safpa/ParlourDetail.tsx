import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Mail, Phone, Calendar, PencilLine, Save, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Branch, Parlour, ParlourSubscription, User } from '../../types';
import { fetchParlourById, updateParlour } from '../../services/parloursApi';
import { fetchBranches } from '../../services/branchesApi';
import { fetchParlourSubscriptions } from '../../services/parlourSubscriptionsApi';
import { fetchUsers } from '../../services/usersApi';
import { fetchParlourAdoptionDetail, type ParlourAdoptionDetail } from '../../services/reportsApi';

type ParlourFormState = {
  name: string;
  region: string;
  province: string;
  tier: Parlour['tier'];
  status: Parlour['status'];
  onboardingProgress: number;
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
  businessDescription: string;
  joinedDate: string;
};

function createFormState(parlour: Parlour): ParlourFormState {
  return {
    name: parlour.name,
    region: parlour.region,
    province: parlour.province,
    tier: parlour.tier,
    status: parlour.status,
    onboardingProgress: parlour.onboardingProgress,
    contactEmail: parlour.contactEmail,
    contactPhone: parlour.contactPhone,
    primaryColor: parlour.primaryColor,
    businessDescription: parlour.businessDescription || '',
    joinedDate: parlour.joinedDate,
  };
}

const onboardingStepDefinitions = [
  { label: 'Business Profile', detail: 'Capture the core parlour profile, contacts, and launch ownership.', progress: 20 },
  { label: 'Branding & Logo', detail: 'Set up visual identity, colours, and branded web presence.', progress: 40 },
  { label: 'Products Setup', detail: 'Configure products, packages, and billing defaults.', progress: 60 },
  { label: 'Branch Configuration', detail: 'Add branches, assign managers, and confirm operational scope.', progress: 80 },
  { label: 'Go Live', detail: 'Confirm readiness and move the tenant into active service.', progress: 100 },
] as const;

export default function ParlourDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [parlourBranches, setParlourBranches] = useState<Branch[]>([]);
  const [parlourUsers, setParlourUsers] = useState<User[]>([]);
  const [subscription, setSubscription] = useState<ParlourSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adoption, setAdoption] = useState<ParlourAdoptionDetail | null>(null);
  const [isEditing, setIsEditing] = useState(searchParams.get('mode') === 'edit');
  const [form, setForm] = useState<ParlourFormState | null>(null);
  const createdOwnerEmail = searchParams.get('ownerEmail');
  const createdOwnerName = searchParams.get('ownerName');

  const formatStatusLabel = (value?: string | null) => (value ? value.replace(/_/g, ' ') : 'Not tracked');
  const healthClasses = adoption?.healthStatus === 'green'
    ? 'bg-green-100 text-green-700'
    : adoption?.healthStatus === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-700';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadParlour = async () => {
      try {
        setError(null);
        const [record, branches, users, subscriptionRecord, adoptionDetail] = await Promise.all([
          fetchParlourById(id),
          fetchBranches(id),
          fetchUsers(id),
          fetchParlourSubscriptions(id).then((items) => items[0] ?? null),
          fetchParlourAdoptionDetail(id).catch(() => null),
        ]);
        setParlour(record);
        setForm(createFormState(record));
        setParlourBranches(branches);
        setParlourUsers(users);
        setSubscription(subscriptionRecord);
        setAdoption(adoptionDetail);
      } catch {
        setError('Failed to load parlour details.');
        setParlour(null);
        setParlourBranches([]);
        setParlourUsers([]);
        setSubscription(null);
        setAdoption(null);
      } finally {
        setLoading(false);
      }
    };

    void loadParlour();
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading parlour...</div>;
  if (!parlour) return <div className="text-center py-12 text-slate-500">Parlour not found</div>;

  const subscriptionManagementPath = subscription
    ? `/safpa/parlour-subscriptions/${subscription.id}/edit?returnTo=${encodeURIComponent(`/safpa/parlours/${parlour.id}`)}`
    : `/safpa/parlour-subscriptions/new?parlourId=${encodeURIComponent(parlour.id)}&returnTo=${encodeURIComponent(`/safpa/parlours/${parlour.id}`)}`;

  const onboardingProgress = isEditing && form ? form.onboardingProgress : parlour.onboardingProgress;
  const onboardingSteps = onboardingStepDefinitions.map((step) => ({
    ...step,
    done: onboardingProgress >= step.progress,
  }));

  const currentStepIndex = onboardingSteps.findIndex((step) => !step.done);
  const currentStep = currentStepIndex === -1 ? onboardingSteps[onboardingSteps.length - 1] : onboardingSteps[currentStepIndex];

  const updateForm = <K extends keyof ParlourFormState>(field: K, value: ParlourFormState[K]) => {
    setForm((previous) => (previous ? { ...previous, [field]: value } : previous));
  };

  const toggleOnboardingStep = (stepProgress: number, checked: boolean) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }

      const nextProgress = checked
        ? stepProgress
        : onboardingStepDefinitions.findLast((step) => step.progress < stepProgress)?.progress ?? 0;

      return {
        ...previous,
        onboardingProgress: nextProgress,
      };
    });
  };

  const startEdit = () => {
    setForm(createFormState(parlour));
    setIsEditing(true);
    setSearchParams({ mode: 'edit' });
  };

  const cancelEdit = () => {
    setForm(createFormState(parlour));
    setIsEditing(false);
    setSearchParams({});
  };

  const saveChanges = async () => {
    if (!id || !form) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await updateParlour(id, form);
      setParlour(updated);
      setForm(createFormState(updated));
      setIsEditing(false);
      setSearchParams({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update parlour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/safpa/parlours" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Parlours
      </Link>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {createdOwnerEmail && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Initial owner account created for {createdOwnerName || 'this parlour'}.
          Sign in with {createdOwnerEmail} and password demo123 to continue onboarding as the parlour owner.
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: parlour.primaryColor }}>
          {parlour.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{parlour.name}</h1>
          <p className="text-slate-500">{parlour.region}, {parlour.province}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${parlour.status === 'active' ? 'bg-green-100 text-green-700' : parlour.status === 'onboarding' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {parlour.status}
        </span>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button onClick={startEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <PencilLine size={16} /> Edit Parlour
            </button>
          ) : (
            <>
              <button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <X size={16} /> Cancel
              </button>
              <button onClick={() => void saveChanges()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Details</h3>
          {isEditing && form ? (
            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-slate-600">Parlour Name</label>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-600">Region</label>
                  <input value={form.region} onChange={(event) => updateForm('region', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-slate-600">Province</label>
                  <input value={form.province} onChange={(event) => updateForm('province', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-600">Status</label>
                  <select value={form.status} onChange={(event) => updateForm('status', event.target.value as Parlour['status'])} className="w-full rounded-lg border border-slate-300 px-3 py-2 capitalize">
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-slate-600">Billing</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                    Manage subscription in the Billing & Subscription section.
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-600">Contact Email</label>
                <input type="email" value={form.contactEmail} onChange={(event) => updateForm('contactEmail', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-slate-600">Contact Phone</label>
                <input value={form.contactPhone} onChange={(event) => updateForm('contactPhone', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-slate-600">Primary Brand Color</label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 py-2">
                  <input type="color" value={form.primaryColor} onChange={(event) => updateForm('primaryColor', event.target.value)} className="h-8 w-10 rounded border border-slate-200 bg-transparent p-1" />
                  <span className="text-slate-600">{form.primaryColor.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-600">Joined Date</label>
                <input type="date" value={form.joinedDate} onChange={(event) => updateForm('joinedDate', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-slate-600">Business Description</label>
                <textarea value={form.businessDescription} onChange={(event) => updateForm('businessDescription', event.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Users size={16} /> Members: <span className="font-medium">{parlour.totalMembers.toLocaleString()}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Mail size={16} /> {parlour.contactEmail}</div>
              <div className="flex items-center gap-2 text-slate-600"><Phone size={16} /> {parlour.contactPhone}</div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> Joined: {parlour.joinedDate}</div>
              {parlour.businessDescription && <p className="rounded-lg bg-slate-50 px-3 py-3 leading-6 text-slate-600">{parlour.businessDescription}</p>}
            </div>
          )}
        </div>

        {/* Onboarding Progress */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Onboarding Progress — {onboardingProgress}%</h3>
          <div className="h-2 bg-slate-200 rounded-full mb-4">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${onboardingProgress}%` }} />
          </div>
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="font-semibold">Current step: {currentStep.label}</div>
            <div className="mt-1 text-amber-700">{currentStep.detail}</div>
          </div>
          {isEditing && form && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Mark each onboarding task complete to advance progress automatically.
            </div>
          )}
          <div className="space-y-2">
            {onboardingSteps.map((step) => (
              <div key={step.label} className="rounded-lg border border-slate-100 px-3 py-3 text-sm">
                <div className="flex items-center gap-2">
                {isEditing && form ? (
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={(event) => toggleOnboardingStep(step.progress, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                ) : (
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${step.done ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                    {step.done && <span className="text-white text-xs">✓</span>}
                  </div>
                )}
                <span className={step.done ? 'text-slate-700' : 'text-slate-400'}>{step.label}</span>
                <span className="ml-auto text-xs text-slate-400">{step.progress}%</span>
                </div>
                <div className={`mt-1 pl-6 text-xs ${step.done ? 'text-slate-500' : 'text-slate-400'}`}>{step.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Billing & Subscription</h3>
              <p className="mt-1 text-sm text-slate-500">Keep plan and billing changes explicit and separate from the general parlour profile.</p>
            </div>
            <Link to={subscriptionManagementPath} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Wallet size={16} /> {subscription ? 'Manage Subscription' : 'Create Subscription'}
            </Link>
          </div>

          {subscription ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Building2 size={16} /> Subscription plan: <span className="font-medium capitalize">{subscription.tier}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Wallet size={16} /> Billing cycle: <span className="font-medium capitalize">{subscription.billingCycle}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> Start date: <span className="font-medium">{subscription.startDate}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar size={16} /> End date: <span className="font-medium">{subscription.endDate || 'Open-ended'}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Mail size={16} /> Status: <span className="font-medium capitalize">{subscription.status}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Users size={16} /> Amount: <span className="font-medium">R{subscription.amount.toLocaleString()}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Phone size={16} /> Auto renew: <span className="font-medium">{subscription.autoRenew ? 'Yes' : 'No'}</span></div>
              {subscription.notes && <p className="rounded-lg bg-slate-50 px-3 py-3 leading-6 text-slate-600">{subscription.notes}</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No billing record exists yet for this parlour. Create one here to start managing its subscription.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Users ({parlourUsers.length})</h3>
          <div className="space-y-2">
            {parlourUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 text-sm py-1">
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold">
                  {u.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{u.role.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {adoption && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Adoption & Activity</h3>
                <p className="mt-1 text-sm text-slate-500">Operational usage and rollout health for this parlour.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${healthClasses}`}>
                {adoption.healthStatus} health
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Onboarding</div>
                <div className="mt-2 text-lg font-semibold capitalize text-slate-900">{formatStatusLabel(adoption.onboardingStatus)}</div>
                <div className="mt-1 text-xs text-slate-500">{adoption.onboardingProgress}% complete</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Activity 30d</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{adoption.events30d}</div>
                <div className="mt-1 text-xs text-slate-500">{adoption.activeUsers30d} active users</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Last Active</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{adoption.lastActiveAt || 'Not yet'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {adoption.daysSinceLastActivity === null ? 'Waiting for first event' : `${adoption.daysSinceLastActivity} days ago`}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Go Live</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{adoption.goLiveAt || 'Pending'}</div>
                <div className="mt-1 text-xs text-slate-500">Score {adoption.healthScore}/100</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {adoption.isDormant && <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700">Dormant parlour</span>}
              {adoption.isAtRisk && <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">Needs intervention</span>}
              {!adoption.isDormant && !adoption.isAtRisk && <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">Healthy adoption</span>}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-medium text-slate-700">Module activity</div>
              <div className="flex flex-wrap gap-2">
                {adoption.moduleActivity.length > 0 ? adoption.moduleActivity.map((item) => (
                  <span key={item.module} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
                    {item.module} · {item.count}
                  </span>
                )) : <span className="text-sm text-slate-400">No module activity recorded yet.</span>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <div className="mt-4 space-y-3">
              {adoption.recentEvents.length > 0 ? adoption.recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium capitalize text-slate-800">{formatStatusLabel(event.eventType)}</div>
                    <div className="text-xs text-slate-400">{event.occurredOn}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {event.module} · {event.userName || 'System'}{event.userRole ? ` (${formatStatusLabel(event.userRole)})` : ''}
                  </div>
                  {event.details && <div className="mt-2 text-sm text-slate-600">{event.details}</div>}
                </div>
              )) : <div className="text-sm text-slate-400">No recent activity has been tracked for this parlour yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Branches Table */}
      <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4">Branches ({parlourBranches.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2">Branch</th>
              <th className="pb-2">City</th>
              <th className="pb-2">Manager</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {parlourBranches.map((b) => (
              <tr key={b.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{b.name}</td>
                <td className="py-2 text-slate-500">{b.city}</td>
                <td className="py-2">{b.manager}</td>
                <td className="py-2 text-slate-500">{b.phone}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

