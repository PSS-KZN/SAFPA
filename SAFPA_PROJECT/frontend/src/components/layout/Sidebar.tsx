import { useRole } from '../../contexts/RoleContext';
import { useTenantBranding } from '../../contexts/useTenantBranding';
import { resolveAssetUrl } from '../../services/http';
import type { UserRole } from '../../types';
import {
  LayoutDashboard, Building2, Users, FileText, Wallet, HeartHandshake,
  MessageSquare, BarChart3, Globe, UserPlus, ChevronLeft, ChevronRight,
  BookOpen, Shield, FolderOpen, LayoutTemplate, SwatchBook,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
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

  // Documents
  { label: 'Documents', path: '/documents', icon: <FolderOpen size={18} />, roles: ['parlour_owner', 'branch_manager', 'policy_admin', 'operations_coordinator'], group: 'Operations' },

  // Reports
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'reporting_analyst'], group: 'Analytics' },

  // Audit
  { label: 'Audit Log', path: '/audit-log', icon: <Shield size={18} />, roles: ['safpa_admin', 'parlour_owner'], group: 'Analytics' },
];

export default function Sidebar() {
  const { currentUser } = useRole();
  const { parlourBrand, isTenantBranded } = useTenantBranding();
  const [collapsed, setCollapsed] = useState(false);

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

  const sidebarBackground = isTenantBranded
    ? { background: `linear-gradient(180deg, ${parlourBrand?.secondaryColor ?? '#0a0f1c'} 0%, #080c17 100%)`, borderRightColor: `${parlourBrand?.primaryColor ?? '#1e293b'}33` }
    : undefined;
  const accentColor = isTenantBranded ? parlourBrand?.accentColor ?? '#e31837' : '#e31837';
  const logoSurface = isTenantBranded
    ? { background: `linear-gradient(135deg, ${parlourBrand?.primaryColor ?? '#ffffff'}22, ${parlourBrand?.accentColor ?? '#ffffff'}22)` }
    : undefined;
  const tenantTitle = isTenantBranded ? parlourBrand?.name ?? 'Tenant Workspace' : 'SAFPA FPOS';

  return (
    <aside className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} bg-[#0a0f1c] text-slate-300 flex flex-col transition-all duration-300 min-h-screen relative z-20 shadow-2xl border-r border-slate-800/50`} style={sidebarBackground}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-slate-800/50 flex-shrink-0">
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
              <div className="text-[17px] font-bold tracking-tight text-white font-['Outfit']">{tenantTitle}</div>
              {isTenantBranded && <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tenant Workspace</div>}
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
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} className="mx-auto mt-4 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        {grouped.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-6' : ''}>
            {!collapsed && section.group && (
              <div className="px-6 mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {section.group}
              </div>
            )}
            {collapsed && si > 0 && <div className="mx-4 my-4 border-t border-slate-800/50" />}
            
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
                        ? 'bg-gradient-to-r from-red-600/10 to-transparent text-red-500 relative'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ backgroundColor: isTenantBranded ? accentColor : '#dc2626' }} />}
                      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-slate-500 group-hover:text-slate-300'}`} style={isActive && isTenantBranded ? { color: accentColor } : undefined}>
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
        <div className="px-6 py-5 border-t border-slate-800/50 text-[12px] font-medium text-slate-500 flex items-center justify-between bg-[#080c17]">
          <span>{isTenantBranded ? 'Tenant branded shell' : 'v1.0.0 Production'}</span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">System Online</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse-slow"></div>
          </div>
        </div>
      )}
    </aside>
  );
}
