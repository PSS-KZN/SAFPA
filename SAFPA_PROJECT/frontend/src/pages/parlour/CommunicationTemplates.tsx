import { useRole } from '../../contexts/RoleContext';
import { useEffect, useState } from 'react';
import { MessageSquare, Mail, Plus, Edit, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CommunicationTemplate } from '../../types';
import { fetchTemplates, setTemplateStatus } from '../../services/templatesApi';

const triggerLabels: Record<string, string> = {
  payment_reminder: 'Payment Reminder',
  payment_receipt: 'Payment Receipt',
  payment_failed_notice: 'Payment Failed Notice',
  policy_activated: 'Policy Activated',
  policy_lapsed: 'Policy Lapsed',
  policy_suspended: 'Policy Suspended',
  policy_reinstated: 'Policy Reinstated',
  policy_cancelled: 'Policy Cancelled',
  funeral_case_update: 'Funeral Case Update',
  welcome: 'Welcome',
  custom: 'Custom',
};

export default function CommunicationTemplates() {
  const { currentUser } = useRole();
  const parlourId = currentUser.parlourId || 'p1';
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email' | 'whatsapp'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const records = await fetchTemplates(parlourId);
        setTemplates(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [parlourId]);

  const parlourTemplates = templates.filter((t) => t.parlourId === parlourId);
  const filtered = parlourTemplates.filter((t) => filterType === 'all' || t.type === filterType);

  const toggleStatus = async (template: CommunicationTemplate) => {
    try {
      setError(null);
      const updated = await setTemplateStatus(template.id, !template.isActive);
      setTemplates((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update template status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Communication Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Manage SMS and email templates for automated and manual communications</p>
        </div>
        <Link to="/parlour/comm-templates/new" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
          <Plus size={16} /> New Template
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading templates...</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-700 rounded-lg"><MessageSquare size={18} /></div>
          <div>
            <p className="text-xs text-slate-500">SMS Templates</p>
            <p className="text-xl font-bold">{parlourTemplates.filter((t) => t.type === 'sms').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-violet-100 text-violet-700 rounded-lg"><Mail size={18} /></div>
          <div>
            <p className="text-xs text-slate-500">Email Templates</p>
            <p className="text-xl font-bold">{parlourTemplates.filter((t) => t.type === 'email').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-700 rounded-lg"><ToggleRight size={18} /></div>
          <div>
            <p className="text-xs text-slate-500">Active Templates</p>
            <p className="text-xl font-bold">{parlourTemplates.filter((t) => t.isActive).length}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {(['all', 'sms', 'email'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-lg text-sm uppercase ${filterType === t ? 'bg-white shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'all' ? 'All' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {filtered.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${tpl.type === 'sms' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                  {tpl.type === 'sms' ? <MessageSquare size={18} /> : <Mail size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{tpl.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tpl.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {tpl.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                    <span className="capitalize">{tpl.type.toUpperCase()}</span>
                    <span>·</span>
                    <span>Trigger: {triggerLabels[tpl.trigger]}</span>
                    <span>·</span>
                    <span>Last updated: {tpl.lastUpdated}</span>
                  </div>
                  {tpl.subject && (
                    <p className="text-xs text-slate-500 mb-2">Subject: <span className="font-medium text-slate-700">{tpl.subject}</span></p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-2 font-mono bg-slate-50 p-2 rounded text-xs">{tpl.body.substring(0, 120)}{tpl.body.length > 120 ? '...' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
                <Link to={`/parlour/comm-templates/${tpl.id}/edit`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit">
                  <Edit size={16} />
                </Link>
                <button onClick={() => void toggleStatus(tpl)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg" title={tpl.isActive ? 'Deactivate' : 'Activate'}>
                  {tpl.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                </button>
              </div>
            </div>

            {/* Expanded preview */}
            {previewId === tpl.id && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2">Full Template Body:</p>
                <pre className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap font-mono">{tpl.body}</pre>
                <p className="text-xs text-slate-400 mt-2">
                  Available variables: <span className="font-mono">{'{member_name}'}</span>, <span className="font-mono">{'{policy_number}'}</span>, <span className="font-mono">{'{amount}'}</span>, <span className="font-mono">{'{due_date}'}</span>, <span className="font-mono">{'{arrears}'}</span>, <span className="font-mono">{'{contact_number}'}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

