import type { AssistantChatContext } from '../../services/assistantApi';

export const OPEN_ASSISTANT_EVENT = 'safpa-open-assistant';

export interface OpenAssistantDetail {
  prompt?: string;
  context?: AssistantChatContext;
}

export function openAssistant(detail: OpenAssistantDetail = {}) {
  window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, { detail }));
}
