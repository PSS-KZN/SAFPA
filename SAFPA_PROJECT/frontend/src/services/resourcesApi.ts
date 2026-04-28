import type { Resource } from '../types';
import { jsonRequest, request } from './http';

export interface ResourceFilters {
  type?: Resource['type'];
  search?: string;
}

export function fetchResources(filters?: ResourceFilters): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (filters?.type) {
    params.set('type', filters.type);
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }

  const query = params.toString();
  return request<Resource[]>(`/api/resources${query ? `?${query}` : ''}`);
}

export function createResource(input: Omit<Resource, 'id'>): Promise<Resource> {
  return request<Resource>('/api/resources', jsonRequest(input, { method: 'POST' }));
}
