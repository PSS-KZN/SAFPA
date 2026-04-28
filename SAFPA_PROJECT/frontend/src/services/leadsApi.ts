import type { Lead } from '../types';
import { jsonRequest, request } from './http';

export interface ConvertLeadInput {
  branchId?: string;
  createPolicy?: boolean;
  productId?: string;
  premiumAmount?: number;
  coverAmount?: number;
}

export interface WebsiteInquiryInput {
  parlourId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  message?: string;
}

export function fetchLeads(parlourId: string): Promise<Lead[]> {
  return request<Lead[]>(`/api/leads?parlourId=${encodeURIComponent(parlourId)}`);
}

export function createLead(input: Omit<Lead, 'id'>): Promise<Lead> {
  return request<Lead>('/api/leads', jsonRequest(input, { method: 'POST' }));
}

export function updateLead(id: string, input: Partial<Omit<Lead, 'id'>>): Promise<Lead> {
  return request<Lead>(`/api/leads/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function updateLeadStatus(id: string, status: Lead['status']): Promise<Lead> {
  return request<Lead>(`/api/leads/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}

export function convertLead(id: string, input: ConvertLeadInput): Promise<{ lead: Lead; member: unknown; policyId: string | null }> {
  return request<{ lead: Lead; member: unknown; policyId: string | null }>(`/api/leads/${id}/convert`, jsonRequest(input, { method: 'POST' }));
}

export function submitWebsiteInquiry(input: WebsiteInquiryInput): Promise<{ ok: boolean; leadId: string }> {
  return request<{ ok: boolean; leadId: string }>('/api/leads/website-inquiry', jsonRequest(input, { method: 'POST' }));
}
