import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { users } from '../data/users';
import { loginRequest } from '../services/authApi';

interface RoleContextType {
  currentUser: User;
  isAuthenticated: boolean;
  authLoading: boolean;
  setCurrentUser: (user: User) => void;
  login: (input: { email: string; password: string; role: UserRole }) => Promise<void>;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const SESSION_KEY = 'safpa_session';
const FALLBACK_USER = users[0];

function readStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.id || !parsed?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = readStoredUser();
    return stored || FALLBACK_USER;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readStoredUser()));
  const [authLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }, [currentUser, isAuthenticated]);

  const login = async (input: { email: string; password: string; role: UserRole }) => {
    const response = await loginRequest(input);
    setCurrentUser(response.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(FALLBACK_USER);
  };

  return (
    <RoleContext.Provider value={{ currentUser, isAuthenticated, authLoading, setCurrentUser, login, logout }}>
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

