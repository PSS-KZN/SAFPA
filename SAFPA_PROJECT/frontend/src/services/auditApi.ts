import type { AuditEntry } from '../types';
import { request } from './http';

export function fetchAuditEntries(parlourId?: string, limit = 200): Promise<AuditEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (parlourId) {
    params.set('parlourId', parlourId);
  }
  return request<AuditEntry[]>(`/api/audit?${params.toString()}`);
}
