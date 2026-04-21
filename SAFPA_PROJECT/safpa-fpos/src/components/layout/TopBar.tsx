import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../types';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<UserRole, string> = {
  safpa_admin: 'SAFPA Admin',
  parlour_owner: 'Parlour Owner',
  branch_manager: 'Branch Manager',
  policy_admin: 'Policy Admin',
  collections_clerk: 'Collections Clerk',
  operations_coordinator: 'Operations Coordinator',
};

const roleDefaultPath: Record<UserRole, string> = {
  safpa_admin: '/safpa',
  parlour_owner: '/parlour',
  branch_manager: '/parlour',
  policy_admin: '/members',
  collections_clerk: '/collections',
  operations_coordinator: '/funeral-cases',
};

const allRoles: UserRole[] = [
  'safpa_admin', 'parlour_owner', 'branch_manager',
  'policy_admin', 'collections_clerk', 'operations_coordinator',
];

export default function TopBar() {
  const { currentUser, switchRole } = useRole();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    navigate(roleDefaultPath[role]);
  };

  const notifications = [
    'New lead from website — Kgomotso Phiri',
    'Payment failed — Precious Mkhwanazi (UBT-2026-0005)',
    'Funeral case FC-2026-001 — flowers task overdue',
    'Parlour onboarding: Restful Haven reached 60%',
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 relative z-20 shadow-sm">
      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 w-96 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search members, policies, cases..."
          className="bg-transparent outline-none text-sm flex-1 text-slate-800 placeholder-slate-400"
        />
      </div>

      <div className="flex items-center gap-6">
        {/* Role Switcher */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-1.5 shadow-sm">
          <label className="text-xs text-slate-500 font-medium">Role</label>
          <select
            value={currentUser.role}
            onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
            className="text-sm bg-transparent text-slate-800 font-medium outline-none cursor-pointer hover:text-red-600 transition-colors"
          >
            {allRoles.map((role) => (
              <option key={role} value={role} className="text-slate-800">{roleLabels[role]}</option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 animate-fade-in overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-semibold text-sm text-slate-800 flex items-center justify-between bg-slate-50">
                <span>Notifications</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{notifications.length} New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className="px-4 py-3 text-sm border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-slate-600 transition-colors flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                    <span className="leading-relaxed">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800">{currentUser.name}</div>
            <div className="text-xs text-slate-500">{roleLabels[currentUser.role]}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white ring-2 ring-slate-100 cursor-pointer">
            {currentUser.name.split(' ').map((n) => n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
}

