import { Bot, Minimize2, Send, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { chatWithAssistant, type AssistantChatContext, type AssistantChatMessage } from '../../services/assistantApi';
import { OPEN_ASSISTANT_EVENT, type OpenAssistantDetail } from './assistantEvents';

const defaultStarterPrompts = [
  { label: 'My role', prompt: 'What can I do in my role?' },
  { label: 'Explain policy', prompt: 'Explain a policy' },
  { label: 'Reinstatement docs', prompt: 'What documents are needed for reinstatement?' },
  { label: 'Policies at risk', prompt: 'Show policies at risk' },
];

export default function FloatingAssistant() {
  const location = useLocation();
  const { currentUser } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello ${currentUser.name.split(' ')[0]}. Ask about policy rules, role access, claims, documents, payments, or risks and I will answer using the information available in your current workspace scope.`,
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [guardrail, setGuardrail] = useState('Responses are scoped to your current access level and visible records.');
  const [error, setError] = useState<string | null>(null);
  const [thinkingStage, setThinkingStage] = useState('Thinking...');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const resolveRouteContext = useCallback((): AssistantChatContext | undefined => {
    const policyMatch = location.pathname.match(/^\/policies\/([^/]+)$/);
    if (policyMatch) {
      return {
        page: 'policy_detail',
        entityType: 'policy',
        entityId: policyMatch[1],
        currentPath: location.pathname,
      };
    }

    const memberMatch = location.pathname.match(/^\/members\/([^/]+)$/);
    if (memberMatch) {
      return {
        page: 'member_detail',
        entityType: 'member',
        entityId: memberMatch[1],
        currentPath: location.pathname,
      };
    }

    const funeralCaseMatch = location.pathname.match(/^\/funeral-cases\/([^/]+)$/);
    if (funeralCaseMatch) {
      return {
        page: 'funeral_case_detail',
        entityType: 'funeral_case',
        entityId: funeralCaseMatch[1],
        currentPath: location.pathname,
      };
    }

    return undefined;
  }, [location.pathname]);

  const routeContext = resolveRouteContext();
  const starterPrompts = routeContext?.entityType === 'member'
    ? [
      { label: 'My role', prompt: 'What can I do in my role?' },
      { label: 'Explain member', prompt: 'Explain this member' },
      { label: 'Member next step', prompt: 'What should I do next for this member?' },
      { label: 'Required docs', prompt: 'What documents are needed?' },
    ]
    : routeContext?.entityType === 'funeral_case'
      ? [
        { label: 'My role', prompt: 'What can I do in my role?' },
        { label: 'Explain case', prompt: 'Explain this case' },
        { label: 'Case next step', prompt: 'What should I do next for this case?' },
        { label: 'Required docs', prompt: 'What documents are needed?' },
      ]
      : defaultStarterPrompts;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const animateAssistantReply = async (content: string, nextMessages: AssistantChatMessage[]) => {
    const assistantIndex = nextMessages.length;
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);

    for (let index = 0; index < content.length; index += 6) {
      const partial = content.slice(0, index + 6);
      setMessages((current) => {
        const updated = [...current];
        updated[assistantIndex] = { role: 'assistant', content: partial };
        return updated;
      });
      await wait(20);
    }
  };

  const sendPrompt = useCallback(async (nextPrompt: string, context?: AssistantChatContext) => {
    const trimmed = nextPrompt.trim();
    if (!trimmed || busy) {
      return;
    }

    const effectiveContext = context || routeContext;

    const nextMessages: AssistantChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setIsOpen(true);
    setMessages(nextMessages);
    setPrompt('');
    setBusy(true);
    setError(null);
    setThinkingStage(
      effectiveContext?.entityType === 'member'
        ? 'Reviewing the current member...'
        : effectiveContext?.entityType === 'funeral_case'
          ? 'Reviewing the current funeral case...'
          : effectiveContext?.entityType === 'policy'
            ? 'Reviewing the current policy...'
            : 'Reading your request...',
    );

    try {
      window.setTimeout(() => setThinkingStage('Checking access rules...'), 180);
      window.setTimeout(() => setThinkingStage(
        effectiveContext?.entityType === 'member'
          ? 'Preparing a member explanation...'
          : effectiveContext?.entityType === 'funeral_case'
            ? 'Preparing a funeral case explanation...'
            : effectiveContext?.entityType === 'policy'
              ? 'Preparing a policy explanation...'
              : 'Preparing a response...',
      ), 360);
      const response = await chatWithAssistant(trimmed, nextMessages, effectiveContext);
      setGuardrail(response.guardrail);
      await wait(420);
      await animateAssistantReply(response.answer, nextMessages);
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : 'Failed to get assistant response');
    } finally {
      setBusy(false);
      setThinkingStage('Thinking...');
    }
  }, [busy, messages, routeContext]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<OpenAssistantDetail>;
      const detail = customEvent.detail || {};
      setIsOpen(true);
      setIsExpanded(false);
      if (detail.prompt) {
        void sendPrompt(detail.prompt, detail.context);
      }
    };

    window.addEventListener(OPEN_ASSISTANT_EVENT, handleOpen as EventListener);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handleOpen as EventListener);
  }, [sendPrompt]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsExpanded(false);
          setIsOpen((current) => !current);
        }}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-accent)] text-white shadow-[0_18px_45px_rgba(122,46,46,0.35)] transition hover:scale-105 hover:bg-[var(--app-accent-strong)] md:bottom-6 md:right-6 md:h-16 md:w-16"
        aria-label="Open assistant"
      >
        <Bot size={26} />
      </button>

      {isOpen && (
        <section className={`fixed z-40 overflow-hidden border border-[var(--app-border-soft)] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] transition-all duration-300 ${isExpanded ? 'inset-x-3 bottom-3 top-20 rounded-[24px] md:bottom-8 md:left-auto md:right-8 md:top-auto md:h-[min(760px,calc(100vh-4rem))] md:w-[min(860px,calc(100vw-2rem))]' : 'inset-x-3 bottom-20 h-[min(70vh,36rem)] rounded-[24px] md:bottom-24 md:left-auto md:right-6 md:h-[min(620px,calc(100vh-8rem))] md:w-[min(420px,calc(100vw-1.5rem))]'}`}>
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--app-border-soft)] bg-[linear-gradient(135deg,#7c2d12_0%,#b45309_48%,#f59e0b_100%)] px-4 py-4 text-white md:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Assistant</h2>
                    <p className="mt-1 hidden text-sm text-amber-50/90 sm:block">Ask questions about policies, collections, claims, documents, and access rules.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsExpanded((current) => !current)} className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20" aria-label={isExpanded ? 'Compact assistant' : 'Expand assistant'}>
                    <Minimize2 size={16} />
                  </button>
                  <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20" aria-label="Close assistant">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className={`grid min-h-0 flex-1 gap-0 ${isExpanded ? 'md:grid-cols-[minmax(0,1fr)_260px]' : 'grid-cols-1'}`}>
              <div className="flex min-h-0 flex-col p-4 md:p-5">
                <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                          {message.role === 'user' ? <UserRound size={12} /> : <Sparkles size={12} />}
                          {message.role}
                        </div>
                        <div>{message.content}</div>
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">{thinkingStage}</div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pr-1">
                  {starterPrompts.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={busy}
                      onClick={() => void sendPrompt(item.prompt)}
                      className="shrink-0 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendPrompt(prompt);
                  }}
                  className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={2}
                    placeholder="Ask about policy status, cover, payments, documents, claims, or what you should do next."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
                  />
                  <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500">Responses adapt to your role and currently visible records.</div>
                    <button
                      type="submit"
                      disabled={busy || !prompt.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                </form>
              </div>

              <aside className={`border-l border-[var(--app-border-soft)] bg-slate-50/70 p-5 ${isExpanded ? 'hidden md:block' : 'hidden'}`}>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Active Guardrail
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{guardrail}</p>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Current Session</h3>
                  <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Role</dt>
                      <dd className="font-medium text-slate-900">{currentUser.role}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Parlour</dt>
                      <dd className="font-medium text-slate-900">{currentUser.parlourId || 'Network scope'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Branch</dt>
                      <dd className="font-medium text-slate-900">{currentUser.branchId || 'All visible'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-sm leading-6 text-slate-600">
                  Ask for explanations, next steps, payment context, required documents, and role-specific access guidance from anywhere in the product.
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
