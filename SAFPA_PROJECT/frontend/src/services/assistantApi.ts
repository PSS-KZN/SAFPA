import { jsonRequest, request } from './http';
import type { UserRole } from '../types';

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatContext {
  page?: string;
  entityType?: 'policy' | 'member' | 'funeral_case';
  entityId?: string;
  currentPath?: string;
}

export interface AssistantChatResponse {
  answer: string;
  suggestions: string[];
  appliedRole: UserRole;
  guardrail: string;
}

export function chatWithAssistant(
  message: string,
  history: AssistantChatMessage[],
  context?: AssistantChatContext,
): Promise<AssistantChatResponse> {
  return request<AssistantChatResponse>('/api/assistant/chat', jsonRequest({ message, history, context }, { method: 'POST' }));
}
