export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SESSION_KEY = 'safpa_session';

type ValidationErrorPayload = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function getSessionHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {};
    }

    const session = JSON.parse(raw) as {
      id?: string;
      name?: string;
      role?: string;
      parlourId?: string;
      branchId?: string;
    };

    if (!session.id || !session.role) {
      return {};
    }

    return {
      'x-user-id': session.id,
      'x-user-name': session.name || session.id,
      'x-user-role': session.role,
      ...(session.parlourId ? { 'x-parlour-id': session.parlourId } : {}),
      ...(session.branchId ? { 'x-branch-id': session.branchId } : {}),
      Authorization: `Bearer ${session.id}`,
    };
  } catch {
    return {};
  }
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

function formatValidationErrors(errors: unknown): string {
  if (!errors || typeof errors !== 'object') {
    return '';
  }

  const payload = errors as ValidationErrorPayload;
  const lines: string[] = [];

  for (const message of payload.formErrors || []) {
    if (message?.trim()) {
      lines.push(message.trim());
    }
  }

  for (const [field, fieldMessages] of Object.entries(payload.fieldErrors || {})) {
    for (const message of fieldMessages || []) {
      if (message?.trim()) {
        lines.push(`${humanizeFieldName(field)}: ${message.trim()}`);
      }
    }
  }

  const uniqueLines = Array.from(new Set(lines));
  return uniqueLines.length > 0 ? uniqueLines.join(' | ') : '';
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...getSessionHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string; errors?: unknown } | null;
    const message = payload?.message || 'Request failed';
    const validationSummary = formatValidationErrors(payload?.errors);
    const validationDetails = validationSummary ? ` ${validationSummary}` : '';
    throw new Error(`${message} (${response.status})${validationDetails}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function jsonRequest(body: unknown, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: JSON.stringify(body),
  };
}

export function resolveAssetUrl(assetPath?: string | null): string | undefined {
  if (!assetPath) {
    return undefined;
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith('/')) {
    return `${API_BASE_URL}${assetPath}`;
  }

  return `${API_BASE_URL}/${assetPath}`;
}
