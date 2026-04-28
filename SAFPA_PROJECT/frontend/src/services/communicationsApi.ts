import type { Communication } from '../types';
import { jsonRequest, request } from './http';

export function fetchCommunications(parlourId: string): Promise<Communication[]> {
  return request<Communication[]>(`/api/communications?parlourId=${encodeURIComponent(parlourId)}`);
}

export function sendCommunication(input: Omit<Communication, 'id'>): Promise<Communication> {
  return request<Communication>('/api/communications/send', jsonRequest(input, { method: 'POST' }));
}
