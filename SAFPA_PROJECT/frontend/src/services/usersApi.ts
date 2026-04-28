import type { User, UserRole } from '../types';
import { jsonRequest, request } from './http';

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  parlourId?: string;
  branchId?: string;
  status: User['status'];
}

export type UpdateUserInput = Partial<CreateUserInput>;

export function fetchUsers(parlourId?: string): Promise<User[]> {
  const query = parlourId ? `?parlourId=${encodeURIComponent(parlourId)}` : '';
  return request<User[]>(`/api/users${query}`);
}

export function createUser(input: CreateUserInput): Promise<User> {
  return request<User>('/api/users', jsonRequest(input, { method: 'POST' }));
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return request<User>(`/api/users/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function setUserStatus(id: string, status: User['status']): Promise<User> {
  return request<User>(`/api/users/${id}/status`, jsonRequest({ status }, { method: 'PATCH' }));
}
