import { useState, type CSSProperties } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../types';

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'safpa_admin', label: 'SAFPA Admin' },
  { value: 'parlour_owner', label: 'Parlour Owner' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'policy_admin', label: 'Policy Admin' },
  { value: 'collections_clerk', label: 'Collections Clerk' },
  { value: 'operations_coordinator', label: 'Operations Coordinator' },
  { value: 'policyholder_customer', label: 'Policyholder / Customer' },
];

const roleDefaultPath: Record<UserRole, string> = {
  safpa_admin: '/safpa',
  parlour_owner: '/parlour',
  branch_manager: '/parlour',
  policy_admin: '/policy-admin',
  collections_clerk: '/collections',
  operations_coordinator: '/operations',
  policyholder_customer: '/customer',
};

const roleDescriptions: Record<UserRole, string> = {
  safpa_admin: 'Govern federation reporting, onboarding oversight, and tenant-wide operations from the national SAFPA control layer.',
  parlour_owner: 'Lead parlour performance, branding, users, and branch operations from the owner workspace.',
  branch_manager: 'Coordinate branch activity, member servicing, and front-office execution with local oversight.',
  policy_admin: 'Manage policy servicing, member updates, and product-linked administration with precision.',
  collections_clerk: 'Track premium collections, receipts, arrears follow-up, and repayment activity from one queue.',
  operations_coordinator: 'Run funeral case logistics, scheduling, suppliers, and service delivery communication.',
  policyholder_customer: 'Access the customer portal for policies, payments, documents, and communication history.',
};

const roleLabels: Record<UserRole, string> = {
  safpa_admin: 'SAFPA Admin',
  parlour_owner: 'Parlour Owner',
  branch_manager: 'Branch Manager',
  policy_admin: 'Policy Admin',
  collections_clerk: 'Collections Clerk',
  operations_coordinator: 'Operations Coordinator',
  policyholder_customer: 'Policyholder / Customer',
};

function getLoginTheme(): CSSProperties {
  return {
    '--page-bg': '#f5f0e8',
    '--page-overlay-a': 'rgba(122, 46, 46, 0.04)',
    '--page-overlay-b': 'rgba(139, 90, 60, 0.05)',
    '--panel-bg': '#1f1815',
    '--panel-overlay-a': 'rgba(122, 46, 46, 0.25)',
    '--panel-overlay-b': 'rgba(139, 90, 60, 0.12)',
    '--panel-ink': '#f5f0e8',
    '--panel-muted': '#d6ccc0',
    '--accent': '#7a2e2e',
    '--accent-strong': '#5e2323',
    '--accent-soft': '#c89a6d',
    '--ink': '#2a221c',
    '--ink-muted': '#6b5d4f',
    '--line': '#c9bba6',
    '--line-soft': 'rgba(122, 46, 46, 0.14)',
    '--surface': 'rgba(255, 252, 248, 0.82)',
    '--surface-strong': '#fffaf2',
    '--surface-soft': 'rgba(122, 46, 46, 0.04)',
    '--shadow': '0 24px 70px -34px rgba(42, 34, 28, 0.38)',
    '--button-ink': '#f8fafc',
  } as CSSProperties;
}

export default function LoginPage() {
  const { currentUser, isAuthenticated, login, availableUsers, authLoading } = useRole();
  const navigate = useNavigate();
  const [email, setEmail] = useState('kagiso@safpa.org.za');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<UserRole>('safpa_admin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-6 text-center text-[#6b5d4f]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        <div>
          <div className="mx-auto mb-4 h-px w-16 bg-[#7a2e2e]" />
          <p className="text-2xl italic">Preparing your workspace</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={roleDefaultPath[currentUser.role]} replace />;
  }

  const matchingUsers = availableUsers.filter((user) => user.role === role);
  const theme = getLoginTheme();

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await login({ email, password, role });
      navigate(roleDefaultPath[role], { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Lora:wght@400;500;600&display=swap');

        @keyframes gentleFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes softFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes drawLine {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .login-page {
          background-color: var(--page-bg);
          background-image:
            radial-gradient(at 20% 30%, var(--page-overlay-a) 0px, transparent 50%),
            radial-gradient(at 80% 70%, var(--page-overlay-b) 0px, transparent 52%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0.035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .login-panel {
          background-color: var(--panel-bg);
          background-image:
            radial-gradient(at 30% 20%, var(--panel-overlay-a) 0px, transparent 55%),
            radial-gradient(at 70% 80%, var(--panel-overlay-b) 0px, transparent 50%),
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: auto, auto, 32px 32px, 32px 32px;
        }

        .animate-gentleFade { animation: gentleFade 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
        .animate-softFade { animation: softFade 1.2s ease-out forwards; opacity: 0; }
        .animate-drawLine { animation: drawLine 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; transform-origin: left; transform: scaleX(0); }

        .label-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-style: italic;
          letter-spacing: 0.02em;
          color: var(--accent);
        }

        .field-line {
          width: 100%;
          border: none;
          border-bottom: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          padding: 10px 0 12px;
          font-family: 'Lora', serif;
          font-size: 17px;
          outline: none;
          transition: border-color 0.25s ease;
        }

        .field-line:focus {
          border-bottom-color: var(--accent);
        }

        .field-line::placeholder {
          color: var(--ink-muted);
          opacity: 0.7;
          font-style: italic;
        }

        .select-line {
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%237a2e2e' stroke-width='1.2'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0 center;
        }

        .select-line option {
          background: var(--surface-strong);
          color: var(--ink);
        }

        .submit-engraved {
          position: relative;
          width: 100%;
          border: none;
          background: linear-gradient(135deg, var(--accent-strong) 0%, var(--panel-bg) 100%);
          color: var(--button-ink);
          padding: 18px 32px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.25s ease, letter-spacing 0.25s ease, filter 0.25s ease;
        }

        .submit-engraved::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(255,255,255,0.22);
          transition: inset 0.25s ease;
          pointer-events: none;
        }

        .submit-engraved:hover:not(:disabled) {
          transform: translateY(-1px);
          letter-spacing: 0.28em;
          filter: brightness(1.05);
        }

        .submit-engraved:hover:not(:disabled)::before {
          inset: 6px;
        }

        .submit-engraved:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .quick-chip {
          border: 1px solid var(--line-soft);
          background: var(--surface-soft);
          color: var(--ink-muted);
          padding: 6px 12px;
          font-family: 'Lora', serif;
          font-size: 12px;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
        }

        .quick-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: color-mix(in srgb, var(--surface-soft) 60%, white 40%);
        }
      `}</style>

      <div className="login-page relative min-h-screen w-full overflow-x-hidden" style={{ ...theme, fontFamily: "'Lora', serif" }}>
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1fr]">
          <section className="login-panel relative hidden overflow-hidden px-16 py-16 text-[var(--panel-ink)] lg:flex lg:flex-col lg:justify-between xl:px-24">
            <div className="pointer-events-none absolute inset-8 border border-white/5" />
            <div className="pointer-events-none absolute inset-10 border border-white/[0.03]" />

            <div className="relative z-10 my-auto py-12">
              <div className="animate-gentleFade mb-8 flex items-center gap-5" style={{ animationDelay: '0.32s' }}>
                <div className="flex h-24 w-24 items-center justify-center rounded-sm bg-white p-3 shadow-2xl shrink-0">
                  <img src="/safpa-logo.png" alt="SAFPA" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="h-px w-24 bg-[var(--accent-soft)]" />
                  <p
                    className="mt-4 uppercase text-[var(--accent-soft)]"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 'clamp(0.9rem, 1.4vw, 1.15rem)',
                      letterSpacing: '0.22em',
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    The Funeral Parlour
                    <br />
                    Operations System
                  </p>
                  <div className="mt-3 h-px bg-gradient-to-r from-[var(--accent-soft)]/60 via-[var(--accent-soft)]/20 to-transparent" />
                </div>
              </div>

              <h1
                className="animate-gentleFade text-[var(--panel-ink)]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(2.75rem, 5vw, 4.5rem)',
                  lineHeight: 1.05,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  animationDelay: '0.38s',
                }}
              >
                Honouring lives,
                <br />
                <em style={{ fontWeight: 300, color: 'var(--accent-soft)' }}>serving families,</em>
                <br />
                with care.
              </h1>

              <p className="mt-8 max-w-md text-lg leading-relaxed text-[var(--panel-muted)] animate-gentleFade" style={{ animationDelay: '0.5s' }}>
                Sign into the SAFPA Funeral Parlour Operations System to move between administration, member servicing, collections, and funeral case execution from one secure workspace.
              </p>

              <div className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-4 animate-gentleFade" style={{ animationDelay: '0.62s' }}>
                {[
                  { num: 'I', label: 'Administration' },
                  { num: 'II', label: 'Policy Servicing' },
                  { num: 'III', label: 'Collections' },
                  { num: 'IV', label: 'Case Management' },
                ].map((item) => (
                  <div key={item.num} className="flex items-baseline gap-3">
                    <span className="text-sm text-[var(--accent-soft)]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
                      {item.num}.
                    </span>
                    <span className="text-base text-[var(--panel-ink)]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 animate-gentleFade" style={{ animationDelay: '0.75s' }}>
                <div className="h-px w-6 bg-[var(--accent-soft)]" />
                <p className="mt-3 text-base italic text-[var(--panel-muted)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Where memory is held, dignity remains.
                </p>
                <div className="mt-5 max-w-md border-l border-[var(--accent-soft)]/45 pl-4">
                  <div className="text-xs uppercase tracking-[0.28em] text-[var(--accent-soft)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Selected workspace
                  </div>
                  <p className="mt-2 text-lg text-[var(--panel-ink)]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                    {roleLabels[role]}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--panel-muted)]">
                    {roleDescriptions[role]}
                  </p>
                </div>
              </div>

              <div className="mt-12 animate-gentleFade text-right" style={{ animationDelay: '0.82s' }}>
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--panel-muted)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Republic of
                </div>
                <div className="mt-1 text-3xl text-[var(--panel-ink)]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
                  South Africa
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex items-center justify-center px-6 py-16 sm:px-12 lg:px-20">
            <div className="absolute left-1/2 top-10 -translate-x-1/2 lg:hidden">
              <div className="flex h-20 w-20 items-center justify-center rounded-sm bg-white p-2.5 shadow-md">
                <img src="/safpa-logo.png" alt="SAFPA" className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="w-full max-w-md animate-gentleFade pt-10 lg:pt-0" style={{ animationDelay: '0.28s' }}>
              <div className="text-center">
                <div className="mb-8 inline-flex items-center gap-2.5 border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-60" />
                  <span className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    SAFPA · FPOS
                  </span>
                  <span className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-60" />
                </div>

                <h2
                  className="text-[var(--ink)]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(1.7rem, 3.2vw, 2.4rem)',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Funeral Parlour
                  <br />
                  Operations System
                </h2>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--line)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <div className="h-px flex-1 bg-[var(--line)]" />
                </div>

                <p className="mt-5 text-base italic text-[var(--ink-muted)]">Please sign in to access your workspace</p>
              </div>

              {error && (
                <div className="mt-8 border-l-2 border-[var(--accent)] bg-[var(--surface-soft)] px-5 py-4 animate-softFade">
                  <p className="label-text mb-1">A note</p>
                  <p className="text-sm text-[var(--ink-muted)]">{error}</p>
                </div>
              )}

              <div className="mt-10 space-y-8">
                <div>
                  <label htmlFor="login-role" className="label-text mb-2 block">Your role</label>
                  <select
                    id="login-role"
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value as UserRole);
                      setEmail(availableUsers.find((user) => user.role === event.target.value)?.email || '');
                    }}
                    className="field-line select-line"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="login-email" className="label-text mb-2 block">Email address</label>
                  <input
                    id="login-email"
                    list="demo-role-emails"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="field-line"
                    placeholder="your.name@safpa.org.za"
                  />
                  <datalist id="demo-role-emails">
                    {matchingUsers.map((user) => (
                      <option key={user.id} value={user.email}>{user.name}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="login-password" className="label-text mb-2 block">Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="field-line pr-16"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-0 top-2 text-sm italic text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {showPassword ? 'hide' : 'show'}
                    </button>
                  </div>
                </div>

                <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="submit-engraved mt-4">
                  {submitting ? 'Signing in...' : 'Enter Workspace'}
                </button>
              </div>

              <div className="mt-12">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--line)]" />
                  <span className="text-xs italic text-[var(--ink-muted)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    demonstration access
                  </span>
                  <div className="h-px flex-1 bg-[var(--line)]" />
                </div>

                <div className="text-center">
                  <p className="text-sm text-[var(--ink-muted)]">
                    Use password <span className="italic text-[var(--accent)]">demo123</span> with any account below
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {matchingUsers.slice(0, 3).map((user) => (
                      <button key={user.id} type="button" onClick={() => setEmail(user.email)} className="quick-chip">
                        {user.email}
                      </button>
                    ))}
                    {matchingUsers.length > 3 && (
                      <span className="px-3 py-1.5 text-xs italic text-[var(--ink-muted)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        and {matchingUsers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <p className="text-xs italic text-[var(--ink-muted)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  In service of South African families · POPIA compliant
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}