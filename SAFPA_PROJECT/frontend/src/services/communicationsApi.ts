import type { Communication } from '../types';
import { jsonRequest, request } from './http';

export interface SendCommunicationInput {
  parlourId: string;
  type: 'sms' | 'email';
  recipientName: string;
  recipientContact: string;
  trigger?: 'payment_reminder' | 'payment_receipt' | 'payment_failed_notice' | 'policy_activated' | 'policy_lapsed' | 'policy_suspended' | 'policy_reinstated' | 'policy_cancelled' | 'funeral_case_update' | 'welcome' | 'custom';
  templateId?: string;
  templateName?: string;
  subject?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function fetchCommunications(parlourId: string): Promise<Communication[]> {
  return request<Communication[]>(`/api/communications?parlourId=${encodeURIComponent(parlourId)}`);
}

export function sendCommunication(input: SendCommunicationInput): Promise<Communication> {
  return request<Communication>('/api/communications/send', jsonRequest(input, { method: 'POST' }));
}
