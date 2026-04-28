import type { FuneralCase } from '../types';
import { jsonRequest, request } from './http';

export function fetchFuneralCases(parlourId: string): Promise<FuneralCase[]> {
  return request<FuneralCase[]>(`/api/funeral-cases?parlourId=${encodeURIComponent(parlourId)}`);
}

export function fetchFuneralCase(id: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}`);
}

export function createFuneralCase(input: Omit<FuneralCase, 'id' | 'caseNumber'>): Promise<FuneralCase> {
  return request<FuneralCase>('/api/funeral-cases', jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCase(id: string, input: Partial<Omit<FuneralCase, 'id' | 'parlourId'>>): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function updateFuneralCaseStatus(id: string, status: FuneralCase['status']): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}

export function addFuneralCaseTask(id: string, input: { title: string; assignee?: string; dueDate?: string }): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/tasks`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseTask(
  id: string,
  taskId: string,
  input: { title?: string; completed?: boolean; assignee?: string; dueDate?: string }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/tasks/${taskId}`, jsonRequest(input, { method: 'PATCH' }));
}
