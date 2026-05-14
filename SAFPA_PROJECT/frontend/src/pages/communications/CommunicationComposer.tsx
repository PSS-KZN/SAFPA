import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { sendCommunication } from '../../services/communicationsApi';
import { fetchTemplates } from '../../services/templatesApi';
import type { CommunicationTemplate } from '../../types';

type ComposerState = {
  recipientName: string;
  recipientContact: string;
  channel: 'sms' | 'email' | 'both';
  templateId: string;
  subject: string;
  message: string;
};

const initialComposer: ComposerState = {
  recipientName: '',
  recipientContact: '',
  channel: 'sms',
  templateId: '',
  subject: '',
  message: '',
};

const guidance = [
  'Use SMS for urgent short notices and email when context needs more space.',
  'Template-backed sends are simulated only. No real SMS or email will leave the system.',
  'When sending both, the message is treated as a custom manual dispatch for each channel.',
  'You will return to the communication log after the demo send completes.',
];

function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, variableName: string) => variables[variableName] || '');
}

export default function CommunicationComposer() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const [composer, setComposer] = useState<ComposerState>(initialComposer);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateComposer = <K extends keyof ComposerState>(field: K, value: ComposerState[K]) => {
    setComposer((previous) => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const records = await fetchTemplates(parlourId);
        setTemplates(records.filter((template) => template.isActive));
      } finally {
        setLoadingTemplates(false);
      }
    };

    void loadTemplates();
  }, [parlourId]);

  const availableTemplates = useMemo(
    () => templates.filter((template) => composer.channel !== 'both' && template.type === composer.channel),
    [composer.channel, templates],
  );

  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === composer.templateId),
    [availableTemplates, composer.templateId],
  );

  const templateVariables = useMemo(
    () => ({
      member_name: composer.recipientName,
      recipient_name: composer.recipientName,
      recipient_contact: composer.recipientContact,
      contact_number: composer.recipientContact,
      contact_email: composer.recipientContact,
      message_body: composer.message,
    }),
    [composer.message, composer.recipientContact, composer.recipientName],
  );

  useEffect(() => {
    if (composer.channel === 'both' && composer.templateId) {
      setComposer((previous) => ({ ...previous, templateId: '' }));
    }
  }, [composer.channel, composer.templateId]);

  const handleTemplateChange = (templateId: string) => {
    const template = availableTemplates.find((item) => item.id === templateId);
    setComposer((previous) => ({
      ...previous,
      templateId,
      subject: template?.type === 'email' ? renderTemplate(template.subject || '', templateVariables) : previous.subject,
      message: template ? renderTemplate(template.body, templateVariables) : previous.message,
    }));
  };

  const sendMessage = async () => {
    if (!composer.recipientName || !composer.recipientContact || !composer.message) {
      setError('Please complete recipient name, contact, and message.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      const channels: Array<'sms' | 'email'> = composer.channel === 'both' ? ['sms', 'email'] : [composer.channel];

      await Promise.all(
        channels.map((type) =>
          sendCommunication({
            parlourId,
            type,
            recipientName: composer.recipientName,
            recipientContact: composer.recipientContact,
            trigger: selectedTemplate?.trigger || 'custom',
            templateId: type === composer.channel ? composer.templateId || undefined : undefined,
            templateName: selectedTemplate?.name,
            subject: type === 'email' ? composer.subject || undefined : undefined,
            message: composer.message,
            metadata: {
              manual: true,
              initiatedFrom: 'communication_composer',
            },
          })
        )
      );

      navigate('/communications');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/communications" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Communications
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <Send size={14} /> Outbound Message
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Send Message</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move message composition into a dedicated screen so channel choice, recipient data, and body content are easier to review.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Message Details</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the channel, enter the recipient, and write the outgoing message.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Recipient Name</label>
              <input value={composer.recipientName} onChange={(event) => updateComposer('recipientName', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Recipient Contact</label>
              <input value={composer.recipientContact} onChange={(event) => updateComposer('recipientContact', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Phone or email" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Send Via</label>
              <select value={composer.channel} onChange={(event) => updateComposer('channel', event.target.value as ComposerState['channel'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Template</label>
              <select
                value={composer.templateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100"
                disabled={composer.channel === 'both' || loadingTemplates}
              >
                <option value="">Custom manual message</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Subject (Email)</label>
              <input value={composer.subject} onChange={(event) => updateComposer('subject', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100" disabled={composer.channel === 'sms'} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Message</label>
              <textarea value={composer.message} onChange={(event) => updateComposer('message', event.target.value)} className="min-h-40 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              {selectedTemplate && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Using template <span className="font-semibold text-slate-700">{selectedTemplate.name}</span> with demo rendering for this recipient.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link to="/communications" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
            <button onClick={() => void sendMessage()} disabled={sending} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Guidance</div>
          <h2 className="mt-4 text-xl font-semibold">Review outbound communication before sending.</h2>
          <div className="mt-6 space-y-3">
            {guidance.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}