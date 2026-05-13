import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { Communication, Member, Parlour, PaymentTransaction, Policy } from '../../types';
import { fetchCommunications } from '../../services/communicationsApi';
import { fetchMembers, updateMember } from '../../services/membersApi';
import { fetchPayments, createPayment } from '../../services/paymentsApi';
import { fetchParlourById } from '../../services/parloursApi';
import { fetchPolicies } from '../../services/policiesApi';

export type ProfileFormState = {
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
};

export type PaymentFormState = {
  policyId: string;
  amount: number;
  method: PaymentTransaction['method'];
  date: string;
};

type CustomerPortalContextValue = {
  member: Member;
  parlour: Parlour;
  policies: Policy[];
  payments: PaymentTransaction[];
  communications: Communication[];
  activePolicy: Policy | null;
  profileForm: ProfileFormState;
  paymentForm: PaymentFormState;
  savingProfile: boolean;
  paying: boolean;
  error: string | null;
  notice: string | null;
  setPaymentForm: Dispatch<SetStateAction<PaymentFormState>>;
  updateProfileField: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => void;
  saveProfile: () => Promise<void>;
  payNow: () => Promise<void>;
};

const emptyProfile: ProfileFormState = {
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
};

const tabLinks = [
  { label: 'My Policy', to: '/customer/policy' },
  { label: 'Payments', to: '/customer/payments' },
  { label: 'Support', to: '/customer/support' },
];

export function useCustomerPortal() {
  return useOutletContext<CustomerPortalContextValue>();
}

export default function CustomerPortal() {
  const { currentUser } = useRole();
  const [member, setMember] = useState<Member | null>(null);
  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfile);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    policyId: '',
    amount: 0,
    method: 'card',
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    if (!currentUser.parlourId) {
      setLoading(false);
      setError('No parlour is linked to this customer profile.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [memberRecords, policyRecords, paymentRecords, communicationRecords, parlourRecord] = await Promise.all([
        fetchMembers(currentUser.parlourId),
        fetchPolicies(currentUser.parlourId),
        fetchPayments(currentUser.parlourId),
        fetchCommunications(currentUser.parlourId),
        fetchParlourById(currentUser.parlourId),
      ]);

      const resolvedMember = memberRecords.find((item) => item.id === currentUser.memberId) || null;
      const memberPolicies = resolvedMember ? policyRecords.filter((policy) => policy.memberId === resolvedMember.id) : [];
      const policyIds = new Set(memberPolicies.map((policy) => policy.id));
      const memberPayments = paymentRecords.filter((payment) => payment.memberId === resolvedMember?.id || policyIds.has(payment.policyId));
      const memberCommunications = communicationRecords.filter(
        (communication) =>
          communication.recipientContact === resolvedMember?.phone ||
          communication.recipientContact === resolvedMember?.email ||
          communication.recipientName === `${resolvedMember?.firstName ?? ''} ${resolvedMember?.lastName ?? ''}`.trim()
      );

      setMember(resolvedMember);
      setParlour(parlourRecord);
      setPolicies(memberPolicies);
      setPayments(memberPayments);
      setCommunications(memberCommunications);
      setProfileForm(
        resolvedMember
          ? {
              phone: resolvedMember.phone,
              email: resolvedMember.email,
              address: resolvedMember.address,
              city: resolvedMember.city,
              province: resolvedMember.province,
            }
          : emptyProfile
      );
      setPaymentForm((previous) => ({
        ...previous,
        policyId: previous.policyId || memberPolicies[0]?.id || '',
        amount: previous.amount > 0 ? previous.amount : memberPolicies[0]?.premiumAmount || 0,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load customer portal');
    } finally {
      setLoading(false);
    }
  }, [currentUser.memberId, currentUser.parlourId]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const activePolicy = useMemo(() => policies.find((policy) => policy.id === paymentForm.policyId) || policies[0] || null, [paymentForm.policyId, policies]);
  const updateProfileField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setProfileForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveProfile = async () => {
    if (!member) {
      setError('No member profile is available for updates.');
      return;
    }

    try {
      setSavingProfile(true);
      setError(null);
      setNotice(null);
      const updated = await updateMember(member.id, profileForm);
      setMember(updated);
      setNotice('Your contact details were updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update your details');
    } finally {
      setSavingProfile(false);
    }
  };

  const payNow = async () => {
    if (!paymentForm.policyId || paymentForm.amount <= 0) {
      setError('Choose a policy and enter a valid amount.');
      return;
    }

    try {
      setPaying(true);
      setError(null);
      setNotice(null);
      await createPayment({
        policyId: paymentForm.policyId,
        amount: paymentForm.amount,
        date: paymentForm.date,
        method: paymentForm.method,
        status: 'successful',
      });
      await loadPortal();
      setNotice('Your payment was recorded successfully.');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading your customer portal...</div>;
  }

  if (!member || !parlour) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Customer profile not found for this session.</div>;
  }

  const contextValue: CustomerPortalContextValue = {
    member,
    parlour,
    policies,
    payments,
    communications,
    activePolicy,
    profileForm,
    paymentForm,
    savingProfile,
    paying,
    error,
    notice,
    setPaymentForm,
    updateProfileField,
    saveProfile,
    payNow,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <ShieldCheck size={14} /> Customer Self-Service
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {member.firstName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move between your policy, payments, and support details without staying on one long page.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {tabLinks.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={contextValue} />
    </div>
  );
}