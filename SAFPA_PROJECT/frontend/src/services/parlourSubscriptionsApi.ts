import type { ParlourSubscription } from '../types';
import { jsonRequest, request } from './http';

export interface CreateParlourSubscriptionInput {
  parlourId: string;
  tier: ParlourSubscription['tier'];
  status: ParlourSubscription['status'];
  billingCycle: ParlourSubscription['billingCycle'];
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  notes?: string;
}

export type UpdateParlourSubscriptionInput = Partial<{
  tier: ParlourSubscription['tier'];
  status: ParlourSubscription['status'];
  billingCycle: ParlourSubscription['billingCycle'];
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes: string;
}>;

export function fetchParlourSubscriptions(parlourId?: string): Promise<ParlourSubscription[]> {
  const query = parlourId ? `?parlourId=${encodeURIComponent(parlourId)}` : '';
  return request<ParlourSubscription[]>(`/api/parlour-subscriptions${query}`);
}

export function createParlourSubscription(input: CreateParlourSubscriptionInput): Promise<ParlourSubscription> {
  return request<ParlourSubscription>('/api/parlour-subscriptions', jsonRequest(input, { method: 'POST' }));
}

export function updateParlourSubscription(id: string, input: UpdateParlourSubscriptionInput): Promise<ParlourSubscription> {
  return request<ParlourSubscription>(`/api/parlour-subscriptions/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteParlourSubscription(id: string): Promise<void> {
  return request<void>(`/api/parlour-subscriptions/${id}`, { method: 'DELETE' });
}