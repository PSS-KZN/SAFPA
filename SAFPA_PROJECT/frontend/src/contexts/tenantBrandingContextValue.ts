import { createContext } from 'react';
import type { Parlour } from '../types';

export interface TenantBrandingContextValue {
  parlourBrand: Parlour | null;
  loading: boolean;
  isTenantBranded: boolean;
  setParlourBranding: (parlour: Parlour | null) => void;
}

export const TenantBrandingContext = createContext<TenantBrandingContextValue | undefined>(undefined);