import type { Member } from '../types';
import { jsonRequest, request } from './http';

export interface BulkImportResult {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  errors: Array<{ index: number; reason: string }>;
  errorFileToken?: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function fetchMembers(parlourId: string): Promise<Member[]> {
  return request<Member[]>(`/api/members?parlourId=${encodeURIComponent(parlourId)}`);
}

export function fetchMember(id: string): Promise<Member> {
  return request<Member>(`/api/members/${id}`);
}

export function createMember(input: Omit<Member, 'id'>): Promise<Member> {
  return request<Member>('/api/members', jsonRequest(input, { method: 'POST' }));
}

export function updateMember(id: string, input: Partial<Omit<Member, 'id' | 'parlourId'>>): Promise<Member> {
  return request<Member>(`/api/members/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function bulkImportMembers(parlourId: string, defaultBranchId: string, rows: Array<Record<string, string>>): Promise<BulkImportResult> {
  return request<BulkImportResult>(
    '/api/members/bulk-import',
    jsonRequest({ parlourId, defaultBranchId, rows }, { method: 'POST' })
  );
}

export function bulkImportMembersFile(parlourId: string, defaultBranchId: string, file: File): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('parlourId', parlourId);
  formData.append('defaultBranchId', defaultBranchId);
  formData.append('file', file);

  return request<BulkImportResult>('/api/members/bulk-import-file', {
    method: 'POST',
    body: formData,
  });
}

export function getBulkImportErrorFileUrl(token: string): string {
  return `${API_BASE_URL}/api/members/bulk-import-errors/${token}`;
}
