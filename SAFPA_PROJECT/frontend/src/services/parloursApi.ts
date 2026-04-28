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
  primaryColor: string;
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

export function setParlourStatus(id: string, status: Parlour['status']): Promise<Parlour> {
  return request<Parlour>(`/api/parlours/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}
