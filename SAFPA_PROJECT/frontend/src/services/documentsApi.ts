import type { Document } from '../types';
import { jsonRequest, request } from './http';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface FetchDocumentsParams {
  parlourId: string;
  entityType?: Document['entityType'];
  entityId?: string;
}

export function fetchDocuments(params: FetchDocumentsParams): Promise<Document[]> {
  const query = new URLSearchParams({ parlourId: params.parlourId });
  if (params.entityType) {
    query.set('entityType', params.entityType);
  }
  if (params.entityId) {
    query.set('entityId', params.entityId);
  }
  return request<Document[]>(`/api/documents?${query.toString()}`);
}

export function createDocument(input: Omit<Document, 'id'>): Promise<Document> {
  return request<Document>('/api/documents', jsonRequest(input, { method: 'POST' }));
}

export function deleteDocument(id: string): Promise<void> {
  return request<void>(`/api/documents/${id}`, { method: 'DELETE' });
}

export async function uploadDocumentFile(input: {
  parlourId: string;
  type: Document['type'];
  entityType: Document['entityType'];
  entityId: string;
  uploadedBy: string;
  file: File;
}): Promise<Document> {
  const formData = new FormData();
  formData.append('parlourId', input.parlourId);
  formData.append('type', input.type);
  formData.append('entityType', input.entityType);
  formData.append('entityId', input.entityId);
  formData.append('uploadedBy', input.uploadedBy);
  formData.append('name', input.file.name);
  formData.append('file', input.file);

  return request<Document>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export function getDocumentDownloadUrl(id: string): string {
  return `${API_BASE_URL}/api/documents/${id}/download`;
}
