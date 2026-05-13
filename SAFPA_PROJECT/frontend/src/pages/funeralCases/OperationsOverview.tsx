import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, FileText, FolderOpen, HeartHandshake, MessageSquare, TriangleAlert } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { fetchCommunications } from '../../services/communicationsApi';
import { fetchDocuments } from '../../services/documentsApi';
import { fetchFuneralCases } from '../../services/funeralCasesApi';
import type { Communication, Document, FuneralCase } from '../../types';

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

export default function OperationsOverview() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [funeralCases, setFuneralCases] = useState<FuneralCase[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [caseData, communicationData, documentData] = await Promise.all([
          fetchFuneralCases(parlourId),
          fetchCommunications(parlourId),
          fetchDocuments({ parlourId }),
        ]);

        const scopedCases = currentUser.branchId
          ? caseData.filter((item) => item.branchId === currentUser.branchId)
          : caseData;

        setFuneralCases(scopedCases);
        setCommunications(communicationData);
        setDocuments(documentData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load operations overview');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentUser.branchId, parlourId]);

  const openCases = useMemo(
    () => funeralCases.filter((item) => item.status !== 'completed' && item.status !== 'archived').length,
    [funeralCases],
  );
  const scheduledServices = useMemo(
    () => funeralCases.filter((item) => item.funeralDate && item.status === 'scheduled').length,
    [funeralCases],
  );
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return funeralCases.flatMap((item) => item.tasks.map((task) => ({ caseNumber: item.caseNumber, deceasedName: item.deceasedName, task })))
      .filter(({ task }) => !task.completed && task.dueDate && new Date(task.dueDate) < now);
  }, [funeralCases]);
  const pendingComms = useMemo(
    () => communications.filter((item) => item.status === 'pending' || item.status === 'failed').length,
    [communications],
  );

  const upcomingServices = useMemo(() => {
    return [...funeralCases]
      .filter((item) => item.funeralDate)
      .sort((left, right) => new Date(left.funeralDate || left.createdAt).getTime() - new Date(right.funeralDate || right.createdAt).getTime())
      .slice(0, 5);
  }, [funeralCases]);

  const taskQueue = useMemo(() => overdueTasks.slice(0, 5), [overdueTasks]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
      .slice(0, 4);
  }, [documents]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading operations overview...</div>;
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
              Operations Coordinator Overview
            </div>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900">See active case pressure, service timing, and paperwork from one operational view.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">This dashboard is focused on delivery execution: open funeral work, scheduled services, overdue tasks that need unblocking, and supporting documents or communications that still require attention.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/funeral-cases/new" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Quick Action</div>
              <div className="mt-2 text-base font-semibold text-slate-900">Log Funeral Case</div>
              <div className="mt-1 text-sm text-slate-500">Open a new service case and assign delivery work.</div>
            </Link>
            <Link to="/communications/new" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Quick Action</div>
              <div className="mt-2 text-base font-semibold text-slate-900">Send Update</div>
              <div className="mt-1 text-sm text-slate-500">Notify families, branches, or suppliers quickly.</div>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open Cases', value: openCases.toLocaleString(), detail: 'Active case files still in progress.', icon: <HeartHandshake size={20} />, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
          { label: 'Scheduled Services', value: scheduledServices.toLocaleString(), detail: 'Cases with confirmed service dates.', icon: <CalendarClock size={20} />, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
          { label: 'Overdue Tasks', value: overdueTasks.length.toLocaleString(), detail: 'Tasks past due and still incomplete.', icon: <TriangleAlert size={20} />, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
          { label: 'Pending Messages', value: pendingComms.toLocaleString(), detail: 'Communications that failed or are still pending.', icon: <MessageSquare size={20} />, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
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
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Services</h2>
              <p className="mt-1 text-sm text-slate-500">The next cases on the delivery calendar.</p>
            </div>
            <Link to="/funeral-cases" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
              View funeral cases <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingServices.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.caseNumber}</div>
                    <div className="mt-1 text-sm text-slate-600">{item.deceasedName}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Service date {formatDate(item.funeralDate)}</div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>{item.venue || 'Venue pending'}</div>
                    <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{item.status}</div>
                  </div>
                </div>
              </div>
            ))}
            {upcomingServices.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No services are currently scheduled.</div>}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Operational Attention</h2>
              <p className="mt-1 text-sm text-slate-500">Overdue tasks and the latest supporting file activity.</p>
            </div>
            <Link to="/documents" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
              View documents <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {taskQueue.map((item) => (
              <div key={`${item.caseNumber}-${item.task.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.task.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{item.caseNumber} · {item.deceasedName}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Due {formatDate(item.task.dueDate)}</div>
                  </div>
                  <div className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Overdue</div>
                </div>
              </div>
            ))}
            {taskQueue.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No overdue case tasks are currently blocking operations.</div>}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FolderOpen size={16} className="text-slate-500" />
              Recent document activity
            </div>
            <div className="space-y-3">
              {recentDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{document.name}</div>
                    <div className="text-xs text-slate-500">{document.entityType.replace('_', ' ')} · {document.size}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{document.type.replace('_', ' ')}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(document.uploadedAt)}</div>
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent document uploads found.</div>}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Case Documentation Coverage</h2>
            <p className="mt-1 text-sm text-slate-500">Recent file activity across funeral cases and related records.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <FileText size={14} />
            {documents.length} files indexed
          </div>
        </div>
      </section>
    </div>
  );
}