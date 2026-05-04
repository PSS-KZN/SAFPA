import type { Parlour } from '../types';
import { jsonRequest, request } from './http';

export interface CreateParlourInput {
  name: string;
  region: string;
  province: string;
  tier: Parlour['tier'];
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
}

export interface UpdateParlourBrandingInput {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  businessDescription?: string;
  tagline?: string;
  supportEmail?: string;
  supportPhone?: string;
  physicalAddress?: string;
  websiteTemplate?: Parlour['websiteTemplate'];
  websiteSubdomain?: string;
  customDomain?: string;
  customDomainStatus?: Parlour['customDomainStatus'];
  customDomainDnsTarget?: string;
  customDomainNotes?: string;
  websitePublished?: boolean;
  websitePublishStatus?: Parlour['websitePublishStatus'];
  brandingCompletedAt?: string;
}

export interface SubdomainAvailability {
  available: boolean;
  websiteSubdomain: string;
  takenBy: string | null;
}

export type UpdateParlourInput = Partial<{
  name: string;
  region: string;
  province: string;
  tier: Parlour['tier'];
  status: Parlour['status'];
  onboardingProgress: number;
  totalMembers: number;
  totalPolicies: number;
  contactEmail: string;
  contactPhone: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  businessDescription: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  physicalAddress: string;
  websiteTemplate: Parlour['websiteTemplate'];
  websiteSubdomain: string;
  customDomain: string;
  customDomainStatus: Parlour['customDomainStatus'];
  customDomainDnsTarget: string;
  customDomainNotes: string;
  websitePublished: boolean;
  websitePublishStatus: Parlour['websitePublishStatus'];
  brandingCompletedAt: string;
  joinedDate: string;
}>;

export function fetchParlours(parlourId?: string): Promise<Parlour[]> {
  const query = parlourId ? `?parlourId=${encodeURIComponent(parlourId)}` : '';
  return request<Parlour[]>(`/api/parlours${query}`);
}

export function fetchParlourById(id: string): Promise<Parlour> {
  return request<Parlour>(`/api/parlours/${id}`);
}

export function createParlour(input: CreateParlourInput): Promise<Parlour> {
  return request<Parlour>(
    '/api/parlours',
    jsonRequest(
      {
        ...input,
        status: 'onboarding',
        onboardingProgress: 0,
        totalMembers: 0,
        totalPolicies: 0,
        joinedDate: new Date().toISOString().slice(0, 10),
      },
      { method: 'POST' }
    )
  );
}

export function updateParlour(id: string, input: UpdateParlourInput): Promise<Parlour> {
  return request<Parlour>(`/api/parlours/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function updateParlourBranding(id: string, input: UpdateParlourBrandingInput): Promise<Parlour> {
  return request<Parlour>(`/api/parlours/${id}/branding`, jsonRequest(input, { method: 'PATCH' }));
}

export function uploadParlourLogo(id: string, file: File): Promise<Parlour> {
  const formData = new FormData();
  formData.append('file', file);

  return request<Parlour>(`/api/parlours/${id}/logo`, {
    method: 'POST',
    body: formData,
  });
}

export function checkParlourSubdomainAvailability(value: string, excludeParlourId?: string): Promise<SubdomainAvailability> {
  const params = new URLSearchParams({ value });
  if (excludeParlourId) {
    params.set('excludeParlourId', excludeParlourId);
  }

  return request<SubdomainAvailability>(`/api/parlours/availability/subdomain?${params.toString()}`);
}

export function setParlourStatus(id: string, status: Parlour['status']): Promise<Parlour> {
  return request<Parlour>(`/api/parlours/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}
