import type { Policy } from '../types';
import { jsonRequest, request } from './http';

export interface RecordPolicyPaymentInput {
  amount: number;
  method: 'debit_order' | 'eft' | 'card' | 'cash';
  status?: 'successful' | 'failed' | 'pending' | 'reversed';
  date: string;
  reference?: string;
}

export interface CreatePolicyInput {
  memberId: string;
  parlourId: string;
  productId: string;
  productName: string;
  status: Policy['status'];
  premiumAmount: number;
  billingFrequency: Policy['billingFrequency'];
  nextDueDate: string;
  startDate: string;
  coverAmount: number;
  arrearsAmount?: number;
  lastPaymentDate?: string;
}

export function fetchPolicies(parlourId: string): Promise<Policy[]> {
  return request<Policy[]>(`/api/policies?parlourId=${encodeURIComponent(parlourId)}`);
}

export function fetchPolicy(id: string): Promise<Policy> {
  return request<Policy>(`/api/policies/${id}`);
}

export function createPolicy(input: CreatePolicyInput): Promise<Policy> {
  return request<Policy>('/api/policies', jsonRequest(input, { method: 'POST' }));
}

export function updatePolicy(id: string, input: Partial<Omit<Policy, 'id' | 'policyNumber' | 'memberId' | 'parlourId' | 'productId'>>): Promise<Policy> {
  return request<Policy>(`/api/policies/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function updatePolicyStatus(id: string, status: Policy['status']): Promise<Policy> {
  return request<Policy>(`/api/policies/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}

export function recordPolicyPayment(id: string, input: RecordPolicyPaymentInput): Promise<{ payment: unknown; policy: Policy }> {
  return request<{ payment: unknown; policy: Policy }>(`/api/policies/${id}/record-payment`, jsonRequest(input, { method: 'POST' }));
}
