import type { ParlourSubscription } from '../types';
import { jsonRequest, request } from './http';

export interface CreateSubscriptionInput {
  parlourId: string;
  tier: ParlourSubscription['tier'];
  status: ParlourSubscription['status'];
  billingCycle: ParlourSubscription['billingCycle'];
  amount: number;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  notes?: string;
}

export type UpdateSubscriptionInput = Partial<{
  tier: ParlourSubscription['tier'];
  status: ParlourSubscription['status'];
  billingCycle: ParlourSubscription['billingCycle'];
  amount: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes: string;
}>;

export function fetchSubscriptions(parlourId?: string): Promise<ParlourSubscription[]> {
  const query = parlourId ? `?parlourId=${encodeURIComponent(parlourId)}` : '';
  return request<ParlourSubscription[]>(`/api/subscriptions${query}`);
}

export function createSubscription(input: CreateSubscriptionInput): Promise<ParlourSubscription> {
  return request<ParlourSubscription>('/api/subscriptions', jsonRequest(input, { method: 'POST' }));
}

export function updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<ParlourSubscription> {
  return request<ParlourSubscription>(`/api/subscriptions/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteSubscription(id: string): Promise<void> {
  return request<void>(`/api/subscriptions/${id}`, { method: 'DELETE' });
}
