import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
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

export default function LoginPage() {
  const { currentUser, isAuthenticated, login, availableUsers, authLoading } = useRole();
  const navigate = useNavigate();
  const [email, setEmail] = useState('kagiso@safpa.org.za');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<UserRole>('safpa_admin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">Loading session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={roleDefaultPath[currentUser.role]} replace />;
  }

  const matchingUsers = availableUsers.filter((user) => user.role === role);

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
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="grid h-full" style={{ gridTemplateColumns: 'minmax(360px, 0.9fr) minmax(420px, 1.1fr)' }}>
        <section className="relative flex h-full min-h-0 overflow-hidden bg-[#0a0f1c] text-white items-center justify-center px-8 lg:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,24,55,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(227,24,55,0.12),transparent_24%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="absolute -right-20 top-16 h-64 w-64 rounded-full bg-[#e31837]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-44 w-44 border-l border-t border-white/10 bg-white/4" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />

          <div className="relative z-10 mx-auto flex max-w-[430px] flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-[30px] bg-white p-2 shadow-[0_20px_70px_-30px_rgba(227,24,55,0.55)] ring-1 ring-white/10">
              <img src="/safpa-logo.png" alt="SAFPA Logo" className="h-full w-full object-contain" />
            </div>
            <div className="mt-6 rounded-full border border-[#e31837]/35 bg-[#e31837]/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
              SAFPA FPOS secure access
            </div>
            <h1 className="mt-8 text-[clamp(2.8rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
              <span className="block">Funeral Parlour</span>
              <span className="mt-2 block text-[#f4f7fb]">Operations</span>
              <span className="mt-2 block text-[#e31837]">Platform</span>
            </h1>
            <p className="mt-6 max-w-[420px] text-[17px] leading-8 text-slate-300">
              SAFPA&apos;s unified workspace for administration, policy servicing, collections, case management, and customer support.
            </p>
          </div>
        </section>

        <section className="flex h-full min-h-0 items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-3 md:px-8 lg:px-12">
          <div className="w-full max-w-[440px]">
            <div className="rounded-[28px] border border-slate-300 bg-white px-5 py-3.5 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.32),0_0_0_1px_rgba(148,163,184,0.22)] ring-1 ring-slate-200/80 md:px-6 md:py-4">
              <div className="mx-auto w-fit rounded-full bg-rose-50 px-4 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#be123c]">
                Backend-backed demo login
              </div>
              <div className="mt-2.5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-[#e31837]">
                  <LockKeyhole size={19} />
                </div>
                <h2 className="mt-2.5 text-[1.85rem] font-semibold tracking-[-0.05em] text-slate-950">Welcome Back</h2>
                <p className="mt-1 text-[15px] text-slate-600">Sign in to access your SAFPA workspace.</p>
              </div>

              {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-800">Select Role</label>
                  <select value={role} onChange={(event) => { setRole(event.target.value as UserRole); setEmail(availableUsers.find((user) => user.role === event.target.value)?.email || ''); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#e31837] focus:bg-white">
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-800">Email</label>
                  <input list="demo-role-emails" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#e31837] focus:bg-white" placeholder="staff@example.com" />
                  <datalist id="demo-role-emails">
                    {matchingUsers.map((user) => (
                      <option key={user.id} value={user.email}>{user.name}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-800">Password</label>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#e31837] focus:bg-white" placeholder="Enter password" />
                </div>
                <button onClick={() => void handleSubmit()} disabled={submitting} className="mt-0.5 w-full rounded-2xl bg-[linear-gradient(135deg,#e31837_0%,#be123c_100%)] px-5 py-3 text-base font-semibold text-white shadow-[0_12px_28px_-16px_rgba(227,24,55,0.7)] transition hover:brightness-105 disabled:opacity-50">
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </div>

              <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold tracking-[-0.02em] text-slate-950">Demo access</div>
                    <div className="mt-0.5 text-sm text-slate-600">Password: <span className="font-semibold text-slate-800">demo123</span></div>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Suggested</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">emails</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {matchingUsers.map((user) => (
                    <span key={user.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                      {user.email}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}