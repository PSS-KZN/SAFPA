import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { users } from '../data/users';

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  availableUsers: User[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const roleToDefaultUser: Record<UserRole, string> = {
  safpa_admin: 'u1',
  parlour_owner: 'u3',
  branch_manager: 'u4',
  policy_admin: 'u5',
  collections_clerk: 'u6',
  operations_coordinator: 'u7',
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(users[0]);

  const switchRole = (role: UserRole) => {
    const userId = roleToDefaultUser[role];
    const user = users.find((u) => u.id === userId);
    if (user) setCurrentUser(user);
  };

  return (
    <RoleContext.Provider value={{ currentUser, setCurrentUser, switchRole, availableUsers: users }}>
      {children}
    </RoleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
}

