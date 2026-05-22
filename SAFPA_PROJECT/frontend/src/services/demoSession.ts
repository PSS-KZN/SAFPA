import { IS_DEMO_MODE } from '../demo/config';
import { resetDemoState } from '../demo/store';
import { API_BASE_URL } from './http';

const DEMO_SESSION_KEY = 'safpa_demo_session_v2';
let bootstrapPromise: Promise<void> | null = null;

export function ensureDemoSessionSeeded(): Promise<void> {
  const state = window.sessionStorage.getItem(DEMO_SESSION_KEY);
  if (state === 'ready') {
    return Promise.resolve();
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  window.sessionStorage.setItem(DEMO_SESSION_KEY, 'bootstrapping');
  bootstrapPromise = (IS_DEMO_MODE
    ? Promise.resolve().then(() => {
        resetDemoState();
      })
    : fetch(`${API_BASE_URL}/api/auth/demo-session/reset`, {
        method: 'POST',
      }).then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || 'Failed to initialise demo session');
        }
      }))
    .then(() => {
      window.sessionStorage.setItem(DEMO_SESSION_KEY, 'ready');
    })
    .catch((error) => {
      window.sessionStorage.removeItem(DEMO_SESSION_KEY);
      throw error;
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}