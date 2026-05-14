import type { User, UserRole } from '../types';
import { jsonRequest, request } from './http';

interface LoginResponse {
  token: string;
  user: User;
}

export function loginRequest(input: { email: string; password: string; role: UserRole }): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', jsonRequest(input, { method: 'POST' }));
}