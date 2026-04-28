const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SESSION_KEY = 'safpa_session';

function getSessionHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
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
    const validationDetails = payload?.errors ? ` ${JSON.stringify(payload.errors)}` : '';
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
