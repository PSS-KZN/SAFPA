import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ReactElement } from 'react';
import { TenantBrandingContext } from './tenantBrandingContextValue';
import { useRole } from './RoleContext';
import { fetchParlourById } from '../services/parloursApi';
import type { Parlour } from '../types';

export function TenantBrandingProvider({ children }: { children: ReactNode }): ReactElement {
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
