import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRole } from './RoleContext';
import { fetchParlourById } from '../services/parloursApi';
import type { Parlour } from '../types';

interface TenantBrandingContextValue {
  parlourBrand: Parlour | null;
  loading: boolean;
  isTenantBranded: boolean;
}

const TenantBrandingContext = createContext<TenantBrandingContextValue | undefined>(undefined);

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useRole();
  const [parlourBrand, setParlourBrand] = useState<Parlour | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasTenantBranding = currentUser.role !== 'safpa_admin' && Boolean(currentUser.parlourId);

    if (!hasTenantBranding) {
      setParlourBrand(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const parlour = await fetchParlourById(currentUser.parlourId || '');
        setParlourBrand(parlour);
      } catch {
        setParlourBrand(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentUser.parlourId, currentUser.role]);

  return (
    <TenantBrandingContext.Provider value={{ parlourBrand, loading, isTenantBranded: currentUser.role !== 'safpa_admin' && Boolean(parlourBrand) }}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  const context = useContext(TenantBrandingContext);
  if (!context) {
    throw new Error('useTenantBranding must be used within TenantBrandingProvider');
  }
  return context;
}