import { useContext } from 'react';
import { TenantBrandingContext } from './tenantBrandingContextValue';

export function useTenantBranding() {
  const context = useContext(TenantBrandingContext);
  if (!context) {
    throw new Error('useTenantBranding must be used within TenantBrandingProvider');
  }
  return context;
}