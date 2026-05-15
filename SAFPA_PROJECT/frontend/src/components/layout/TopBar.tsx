import { useRole } from '../../contexts/RoleContext';
import { useTenantBranding } from '../../contexts/useTenantBranding';
import { resolveAssetUrl } from '../../services/http';
import type { UserRole } from '../../types';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';

const roleLabels: Record<UserRole, string> = {
  safpa_admin: 'SAFPA Admin',
  parlour_owner: 'Parlour Owner',
  branch_manager: 'Branch Manager',
  policy_admin: 'Policy Admin',
  collections_clerk: 'Collections Clerk',
  operations_coordinator: 'Operations Coordinator',
  policyholder_customer: 'Policyholder / Customer',
};

export default function TopBar() {
  const { currentUser } = useRole();
  const { parlourBrand, isTenantBranded } = useTenantBranding();
  const [showNotifications, setShowNotifications] = useState(false);

  const shellPrimary = 'var(--app-accent)';
  const shellAccent = 'var(--app-sidebar-accent)';
  const headerStyle = {
    borderTop: '3px solid var(--app-sidebar-accent)',
    background: 'rgba(255, 250, 242, 0.92)',
    borderBottomColor: 'var(--app-border-soft)',
    color: 'var(--app-ink)',
    backdropFilter: 'blur(12px)',
  };

  const notifications = [
    'New lead from website — Kgomotso Phiri',
    'Payment failed — Precious Mkhwanazi (UBT-2026-0005)',
    'Funeral case FC-2026-001 — flowers task overdue',
    'Parlour onboarding: Restful Haven reached 60%',
  ];

  return (
    <header className="relative z-20 flex h-16 flex-shrink-0 items-center justify-between border-b px-6 shadow-sm" style={headerStyle}>
      {/* Search */}
      <div className="flex w-96 items-center gap-2 rounded-lg border px-4 py-2 transition-all" style={{ borderColor: 'var(--app-border)', background: 'rgba(255, 250, 242, 0.9)', boxShadow: 'inset 0 0 0 1px rgba(122, 46, 46, 0.06)' }}>
        <Search size={16} className="text-[var(--app-ink-muted)]" />
        <input
          type="text"
          placeholder="Search members, policies, cases..."
          className="flex-1 bg-transparent text-sm text-[var(--app-ink)] outline-none placeholder:text-[var(--app-ink-muted)]"
        />
      </div>

      <div className="flex items-center gap-6">
        {isTenantBranded && parlourBrand && (
          <div className="hidden items-center gap-3 rounded-xl border px-4 py-2 lg:flex" style={{ borderColor: 'var(--app-border-soft)', background: 'rgba(255, 250, 242, 0.74)' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
              {parlourBrand.logo ? (
                <img src={resolveAssetUrl(parlourBrand.logo)} alt={`${parlourBrand.name} logo`} className="h-7 w-7 object-contain" />
              ) : (
                <span className="text-xs font-bold" style={{ color: shellPrimary }}>{parlourBrand.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--app-ink)]">{parlourBrand.name}</div>
              <div className="text-xs text-[var(--app-ink-muted)]">{parlourBrand.tagline || 'Tenant workspace'}</div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-full p-2 text-[var(--app-ink-muted)] transition-colors hover:bg-[rgba(122,46,46,0.06)] hover:text-[var(--app-ink)]"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: shellAccent }}></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-xl border bg-[var(--app-surface)] shadow-lg animate-fade-in" style={{ borderColor: 'var(--app-border-soft)' }}>
              <div className="flex items-center justify-between border-b px-4 py-4 text-sm font-semibold text-[var(--app-ink)]" style={{ borderColor: 'var(--app-border-soft)', background: 'rgba(122, 46, 46, 0.04)' }}>
                <span>Notifications</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(122, 46, 46, 0.08)', color: 'var(--app-accent)' }}>{notifications.length} New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className="flex cursor-pointer items-start gap-3 border-b px-4 py-3 text-sm text-[var(--app-ink-muted)] transition-colors hover:bg-[rgba(122,46,46,0.04)]" style={{ borderColor: 'rgba(122, 46, 46, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: shellAccent }}></div>
                    <span className="leading-relaxed">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 border-l pl-4" style={{ borderColor: 'var(--app-border-soft)' }}>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-[var(--app-ink)]">{currentUser.name}</div>
            <div className="text-xs text-[var(--app-ink-muted)]">{roleLabels[currentUser.role]}</div>
          </div>
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm" style={{ backgroundColor: shellPrimary, boxShadow: '0 0 0 4px rgba(200, 154, 109, 0.2)' }}>
            {currentUser.name.split(' ').map((n) => n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
}

