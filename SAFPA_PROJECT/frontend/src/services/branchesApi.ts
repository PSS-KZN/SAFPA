import type { Branch } from '../types';
import { jsonRequest, request } from './http';

export interface CreateBranchInput {
  parlourId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  manager: string;
  phone: string;
  status: Branch['status'];
}

export type UpdateBranchInput = Partial<Omit<CreateBranchInput, 'parlourId'>>;

export function fetchBranches(parlourId?: string): Promise<Branch[]> {
  const query = parlourId ? `?parlourId=${encodeURIComponent(parlourId)}` : '';
  return request<Branch[]>(`/api/branches${query}`);
}

export function createBranch(input: CreateBranchInput): Promise<Branch> {
  return request<Branch>('/api/branches', jsonRequest(input, { method: 'POST' }));
}

export function updateBranch(id: string, input: UpdateBranchInput): Promise<Branch> {
  return request<Branch>(`/api/branches/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function setBranchStatus(id: string, status: Branch['status']): Promise<Branch> {
  return request<Branch>(`/api/branches/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}
