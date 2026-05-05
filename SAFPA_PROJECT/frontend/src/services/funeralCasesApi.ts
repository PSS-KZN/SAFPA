import type { CaseTask, FuneralCase, FuneralCaseMilestone, FuneralCaseVehicle } from '../types';
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

export function addFuneralCaseTask(
  id: string,
  input: {
    title: string;
    assignee?: string;
    dueDate?: string;
    category?: CaseTask['category'];
    milestoneId?: string;
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/tasks`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseTask(
  id: string,
  taskId: string,
  input: {
    title?: string;
    completed?: boolean;
    assignee?: string;
    dueDate?: string;
    category?: CaseTask['category'];
    milestoneId?: string;
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/tasks/${taskId}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteFuneralCaseTask(id: string, taskId: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/tasks/${taskId}`, { method: 'DELETE' });
}

export function addFuneralCaseNote(id: string, note: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/notes`, jsonRequest({ note }, { method: 'POST' }));
}

export function deleteFuneralCaseNote(id: string, index: number): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/notes/${index}`, { method: 'DELETE' });
}

export function deleteFuneralCase(id: string): Promise<void> {
  return request<void>(`/api/funeral-cases/${id}`, { method: 'DELETE' });
}

export function addFuneralCaseStaff(
  id: string,
  input: { staffUserId?: string; displayName?: string; name?: string; role: string }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/staff`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseStaff(
  id: string,
  staffId: string,
  input: { staffUserId?: string; displayName?: string; name?: string; role?: string }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/staff/${staffId}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteFuneralCaseStaff(id: string, staffId: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/staff/${staffId}`, { method: 'DELETE' });
}

export function addFuneralCaseVehicle(
  id: string,
  input: {
    reg: string;
    type: string;
    driver: string;
    capacity?: number;
    purpose?: string;
    availabilityStatus?: FuneralCaseVehicle['availabilityStatus'];
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/vehicles`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseVehicle(
  id: string,
  vehicleId: string,
  input: {
    reg?: string;
    type?: string;
    driver?: string;
    capacity?: number;
    purpose?: string;
    availabilityStatus?: FuneralCaseVehicle['availabilityStatus'];
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/vehicles/${vehicleId}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteFuneralCaseVehicle(id: string, vehicleId: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/vehicles/${vehicleId}`, { method: 'DELETE' });
}

export function addFuneralCaseMilestone(
  id: string,
  input: {
    type: FuneralCaseMilestone['type'];
    title: string;
    scheduledDate?: string;
    scheduledTime?: string;
    status?: 'pending' | 'scheduled' | 'completed';
    assignedStaffId?: string;
    assignedVehicleId?: string;
    notes?: string;
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/milestones`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseMilestone(
  id: string,
  milestoneId: string,
  input: {
    type?: FuneralCaseMilestone['type'];
    title?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    status?: 'pending' | 'scheduled' | 'completed';
    assignedStaffId?: string;
    assignedVehicleId?: string;
    notes?: string;
  }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/milestones/${milestoneId}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteFuneralCaseMilestone(id: string, milestoneId: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/milestones/${milestoneId}`, { method: 'DELETE' });
}

export function addFuneralCaseSupplier(
  id: string,
  input: { name: string; service: string; status?: 'pending' | 'confirmed' }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/suppliers`, jsonRequest(input, { method: 'POST' }));
}

export function updateFuneralCaseSupplier(
  id: string,
  supplierId: string,
  input: { name?: string; service?: string; status?: 'pending' | 'confirmed' }
): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/suppliers/${supplierId}`, jsonRequest(input, { method: 'PATCH' }));
}

export function deleteFuneralCaseSupplier(id: string, supplierId: string): Promise<FuneralCase> {
  return request<FuneralCase>(`/api/funeral-cases/${id}/suppliers/${supplierId}`, { method: 'DELETE' });
}
