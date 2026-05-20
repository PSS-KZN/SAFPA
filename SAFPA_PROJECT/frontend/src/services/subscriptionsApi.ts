import type { SubscriptionPlan } from '../types';
import { jsonRequest, request } from './http';

export interface CreateSubscriptionInput {
  tier: SubscriptionPlan['tier'];
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
}

export type UpdateSubscriptionInput = Partial<{
  name: string;
  amount: number;
  description: string;
  isActive: boolean;
}>;

export function fetchSubscriptions(): Promise<SubscriptionPlan[]> {
  return request<SubscriptionPlan[]>('/api/subscriptions');
}

export function createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionPlan> {
  return request<SubscriptionPlan>('/api/subscriptions', jsonRequest(input, { method: 'POST' }));
}

export function updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<SubscriptionPlan> {
  return request<SubscriptionPlan>(`/api/subscriptions/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteSubscription(id: string): Promise<void> {
  return request<void>(`/api/subscriptions/${id}`, { method: 'DELETE' });
}
