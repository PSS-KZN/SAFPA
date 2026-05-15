import { useRole } from '../../contexts/RoleContext';
import { useTenantBranding } from '../../contexts/useTenantBranding';
import { resolveAssetUrl } from '../../services/http';
import type { UserRole } from '../../types';
import {
  LayoutDashboard, Building2, Users, FileText, Wallet, HeartHandshake,
  MessageSquare, BarChart3, Globe, UserPlus, ChevronLeft, ChevronRight,
  BookOpen, Shield, FolderOpen, LayoutTemplate, SwatchBook, LogOut,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  group?: string;
}

const navItems: NavItem[] = [
  // SAFPA Admin
  { label: 'SAFPA Dashboard', path: '/safpa', icon: <LayoutDashboard size={18} />, roles: ['safpa_admin'], group: 'SAFPA' },
  { label: 'Parlour Management', path: '/safpa/parlours', icon: <Building2 size={18} />, roles: ['safpa_admin'], group: 'SAFPA' },
  { label: 'Subscriptions', path: '/safpa/subscriptions', icon: <Wallet size={18} />, roles: ['safpa_admin'], group: 'SAFPA' },
  { label: 'Resources & Notices', path: '/safpa/resources', icon: <BookOpen size={18} />, roles: ['safpa_admin'], group: 'SAFPA' },

  // Parlour Admin
  { label: 'Dashboard', path: '/parlour', icon: <LayoutDashboard size={18} />, roles: ['parlour_owner', 'branch_manager'], group: 'Overview' },
  { label: 'Policy Overview', path: '/policy-admin', icon: <LayoutDashboard size={18} />, roles: ['policy_admin'], group: 'Overview' },
  { label: 'Operations Overview', path: '/operations', icon: <LayoutDashboard size={18} />, roles: ['operations_coordinator'], group: 'Overview' },
  { label: 'Branches', path: '/parlour/branches', icon: <Building2 size={18} />, roles: ['parlour_owner'], group: 'Overview' },
  { label: 'Users', path: '/parlour/users', icon: <Users size={18} />, roles: ['parlour_owner'], group: 'Overview' },
  { label: 'Products', path: '/parlour/products', icon: <FileText size={18} />, roles: ['parlour_owner'], group: 'Overview' },
  { label: 'Branding', path: '/parlour/branding', icon: <SwatchBook size={18} />, roles: ['parlour_owner'], group: 'Overview' },
  { label: 'Website Preview', path: '/website', icon: <Globe size={18} />, roles: ['parlour_owner'], group: 'Overview' },
  { label: 'Comm. Templates', path: '/parlour/comm-templates', icon: <LayoutTemplate size={18} />, roles: ['parlour_owner'], group: 'Overview' },

  // CRM
  { label: 'Leads', path: '/leads', icon: <UserPlus size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin'], group: 'CRM' },

  // Policy & Members
  { label: 'Members', path: '/members', icon: <Users size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin'], group: 'Members' },
  { label: 'Policies', path: '/policies', icon: <FileText size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin'], group: 'Members' },

  // Collections
  { label: 'Collections', path: '/collections', icon: <Wallet size={18} />, roles: ['parlour_owner', 'branch_manager', 'collections_clerk'], group: 'Finance' },

  // Funeral Cases
  { label: 'Funeral Cases', path: '/funeral-cases', icon: <HeartHandshake size={18} />, roles: ['parlour_owner', 'branch_manager', 'operations_coordinator'], group: 'Operations' },

  // Communications
  { label: 'Communications', path: '/communications', icon: <MessageSquare size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'], group: 'Operations' },

  // Customer Portal
  { label: 'My Policy', path: '/customer/policy', icon: <FileText size={18} />, roles: ['policyholder_customer'], group: 'Self-Service' },
  { label: 'Payments', path: '/customer/payments', icon: <Wallet size={18} />, roles: ['policyholder_customer'], group: 'Self-Service' },
  { label: 'Support', path: '/customer/support', icon: <MessageSquare size={18} />, roles: ['policyholder_customer'], group: 'Self-Service' },

  // Documents
  { label: 'Documents', path: '/documents', icon: <FolderOpen size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin', 'operations_coordinator'], group: 'Operations' },

  // Reports
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'], group: 'Analytics' },

  // Audit
  { label: 'Audit Log', path: '/audit-log', icon: <Shield size={18} />, roles: ['safpa_admin', 'parlour_owner'], group: 'Analytics' },
];

export default function Sidebar() {
  const { currentUser, logout } = useRole();
  const { parlourBrand, isTenantBranded } = useTenantBranding();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const filtered = navItems.filter((item) => item.roles.includes(currentUser.role));

  const grouped: { group: string; items: NavItem[] }[] = [];
  let lastGroup = '';
  for (const item of filtered) {
    const g = item.group || '';
    if (g !== lastGroup) {
      grouped.push({ group: g, items: [item] });
      lastGroup = g;
    } else {
      grouped[grouped.length - 1].items.push(item);
    }
  }

  const sidebarBackground = {
    background: 'linear-gradient(180deg, var(--app-sidebar-bg) 0%, var(--app-sidebar-bg-strong) 100%)',
    borderRightColor: 'rgba(200, 154, 109, 0.18)',
  };
  const accentColor = 'var(--app-sidebar-accent)';
  const logoSurface = { background: 'linear-gradient(135deg, rgba(200, 154, 109, 0.26), rgba(255, 250, 242, 0.16))' };
  const tenantTitle = currentUser.role === 'safpa_admin' ? 'SAFPA Federation' : parlourBrand?.name ?? 'SAFPA FPOS';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} flex min-h-screen flex-col border-r text-[var(--app-sidebar-ink)] shadow-2xl transition-all duration-300 relative z-20`} style={sidebarBackground}>
      {/* Logo */}
      <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-[rgba(200,154,109,0.1)] px-5">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={logoSurface}>
              {isTenantBranded && parlourBrand?.logo ? (
                <img src={resolveAssetUrl(parlourBrand.logo)} alt={`${tenantTitle} logo`} className="w-full h-full object-contain" />
              ) : (
                <img src="/safpa-logo.png" alt="SAFPA Logo" className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <div className="text-[17px] font-bold tracking-tight text-[var(--app-sidebar-ink-strong)]">{tenantTitle}</div>
              {isTenantBranded && <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tenant Workspace</div>}
              {currentUser.role === 'safpa_admin' && <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--app-sidebar-accent)]">National Workspace</div>}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-white flex items-center justify-center p-1">
            {isTenantBranded && parlourBrand?.logo ? (
              <img src={resolveAssetUrl(parlourBrand.logo)} alt={`${tenantTitle} logo`} className="w-full h-full object-contain" />
            ) : (
              <img src="/safpa-logo.png" alt="SAFPA Logo" className="w-full h-full object-contain" />
            )}
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-[var(--app-sidebar-muted)] transition-colors hover:bg-white/5 hover:text-[var(--app-sidebar-ink-strong)]">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} className="mx-auto mt-4 rounded-lg bg-white/5 p-2 text-[var(--app-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-[var(--app-sidebar-ink-strong)]">
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        {grouped.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-6' : ''}>
            {!collapsed && section.group && (
              <div className="mb-2 px-6 text-[11px] font-bold uppercase tracking-widest text-[var(--app-sidebar-muted)]">
                {section.group}
              </div>
            )}
            {collapsed && si > 0 && <div className="mx-4 my-4 border-t border-[rgba(200,154,109,0.1)]" />}
            
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/safpa' || item.path === '/parlour'}
                  style={({ isActive }) =>
                    isActive && isTenantBranded
                      ? {
                          color: accentColor,
                          background: `linear-gradient(90deg, ${accentColor}20 0%, transparent 100%)`,
                        }
                      : undefined
                  }
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 mx-3 rounded-xl text-[14px] font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#c89a6d]/15 to-transparent text-[#f8e8c9] relative'
                        : 'text-[#cbbfad] hover:bg-white/5 hover:text-[#fffaf2]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accentColor }} />}
                      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#c89a6d]' : 'text-[#8f7e68] group-hover:text-[#e8dbc6]'}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-[rgba(200,154,109,0.1)] bg-[var(--app-sidebar-panel)] px-4 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(200,154,109,0.35)] bg-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--app-accent-strong)]"
          >
            <LogOut size={16} /> Logout
          </button>
          <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-[#9f8f7a]">
            <span>{isTenantBranded ? 'Tenant branded shell' : 'v1.0.0 Production'}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">System Online</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="border-t border-[rgba(200,154,109,0.1)] bg-[var(--app-sidebar-panel)] px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-xl border border-[rgba(200,154,109,0.35)] bg-[var(--app-accent)] px-3 py-3 text-white transition hover:bg-[var(--app-accent-strong)]"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
