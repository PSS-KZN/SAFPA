import type { CommunicationTemplate } from '../types';
import { jsonRequest, request } from './http';

export function fetchTemplates(parlourId: string): Promise<CommunicationTemplate[]> {
  return request<CommunicationTemplate[]>(`/api/templates?parlourId=${encodeURIComponent(parlourId)}`);
}

export function createTemplate(input: Omit<CommunicationTemplate, 'id'>): Promise<CommunicationTemplate> {
  return request<CommunicationTemplate>('/api/templates', jsonRequest(input, { method: 'POST' }));
}

export function updateTemplate(id: string, input: Partial<Omit<CommunicationTemplate, 'id' | 'parlourId'>>): Promise<CommunicationTemplate> {
  return request<CommunicationTemplate>(`/api/templates/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function setTemplateStatus(id: string, isActive: boolean): Promise<CommunicationTemplate> {
  return request<CommunicationTemplate>(`/api/templates/${id}/status`, jsonRequest({ isActive }, { method: 'PATCH' }));
}
