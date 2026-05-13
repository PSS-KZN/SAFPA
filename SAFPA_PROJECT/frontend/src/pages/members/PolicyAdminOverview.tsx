import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, MessageSquare, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { Communication, Lead, Member, Policy } from '../../types';
import { fetchLeads } from '../../services/leadsApi';
import { fetchMembers } from '../../services/membersApi';
import { fetchPolicies } from '../../services/policiesApi';
import { fetchCommunications } from '../../services/communicationsApi';

function formatDate(value?: string) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PolicyAdminOverview() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [members, setMembers] = useState<Member[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [memberData, policyData, leadData, communicationData] = await Promise.all([
          fetchMembers(parlourId),
          fetchPolicies(parlourId),
          fetchLeads(parlourId),
          fetchCommunications(parlourId),
        ]);

        setMembers(memberData);
        setPolicies(policyData);
        setLeads(leadData);
        setCommunications(communicationData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load policy administration overview');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members],
  );
  const activePolicies = useMemo(
    () => policies.filter((policy) => policy.status === 'active' || policy.status === 'reinstated').length,
    [policies],
  );
  const attentionPolicies = useMemo(
    () => policies.filter((policy) => policy.arrearsAmount > 0 || policy.status === 'pending' || policy.status === 'suspended' || policy.status === 'lapsed'),
    [policies],
  );
  const openLeads = useMemo(
    () => leads.filter((lead) => lead.status !== 'converted' && lead.status !== 'lost').length,
    [leads],
  );

  const nextPolicyQueue = useMemo(() => {
    return [...policies]
      .filter((policy) => policy.status !== 'cancelled' && policy.status !== 'closed')
      .sort((left, right) => new Date(left.nextDueDate).getTime() - new Date(right.nextDueDate).getTime())
      .slice(0, 5);
  }, [policies]);

  const recentLeadQueue = useMemo(() => {
    return [...leads]
      .filter((lead) => lead.status !== 'converted')
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5);
  }, [leads]);

  const recentCommunications = useMemo(() => {
    return [...communications]
      .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())
      .slice(0, 4);
  }, [communications]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading policy admin overview...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Policy Admin Overview
            </div>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900">Keep membership, cover, and follow-up work moving from one place.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">This view surfaces the policy book that needs action first: members to service, policies nearing due dates, leads still in conversion, and the latest member-facing communication activity.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/members/new" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Quick Action</div>
              <div className="mt-2 text-base font-semibold text-slate-900">Add Member</div>
              <div className="mt-1 text-sm text-slate-500">Capture a new policyholder and dependants.</div>
            </Link>
            <Link to="/policies/new" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Quick Action</div>
              <div className="mt-2 text-base font-semibold text-slate-900">Create Policy</div>
              <div className="mt-1 text-sm text-slate-500">Issue new cover without jumping through the list page.</div>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active Members', value: activeMembers.toLocaleString(), detail: 'Currently serviceable customer records.', icon: <Users size={20} />, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
          { label: 'Active Policies', value: activePolicies.toLocaleString(), detail: 'Policies in force and generating cover.', icon: <ShieldCheck size={20} />, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
          { label: 'Needs Attention', value: attentionPolicies.length.toLocaleString(), detail: 'Pending, suspended, lapsed, or in arrears.', icon: <FileText size={20} />, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
          { label: 'Open Leads', value: openLeads.toLocaleString(), detail: 'Prospects still active in the pipeline.', icon: <UserPlus size={20} />, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
        ].map((card) => (
          <div key={card.label} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600">{card.detail}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${card.tone}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Policy Work Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Upcoming due dates and policies likely to need admin intervention.</p>
            </div>
            <Link to="/policies" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
              View policies <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {nextPolicyQueue.map((policy) => (
              <div key={policy.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{policy.policyNumber}</div>
                    <div className="mt-1 text-sm text-slate-600">{policy.productName}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Next due {formatDate(policy.nextDueDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">R{policy.premiumAmount.toLocaleString()}</div>
                    <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${policy.arrearsAmount > 0 || policy.status === 'suspended' || policy.status === 'lapsed' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {policy.arrearsAmount > 0 ? `Arrears R${policy.arrearsAmount.toLocaleString()}` : policy.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {nextPolicyQueue.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No active policy work is queued right now.</div>}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lead Conversion and Outreach</h2>
              <p className="mt-1 text-sm text-slate-500">Recent leads and the latest member-facing communication activity.</p>
            </div>
            <Link to="/communications" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
              View communications <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeadQueue.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{lead.firstName} {lead.lastName}</div>
                    <div className="mt-1 text-sm text-slate-600">{lead.source} lead</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Created {formatDate(lead.createdAt)}</div>
                  </div>
                  <div className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{lead.status}</div>
                </div>
              </div>
            ))}
            {recentLeadQueue.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No open leads are waiting for conversion.</div>}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare size={16} className="text-slate-500" />
              Recent communication activity
            </div>
            <div className="space-y-3">
              {recentCommunications.map((communication) => (
                <div key={communication.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{communication.recipientName}</div>
                    <div className="text-xs text-slate-500">{communication.template} via {communication.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{communication.status}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(communication.sentAt)}</div>
                  </div>
                </div>
              ))}
              {recentCommunications.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent communication activity found.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}