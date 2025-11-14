export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_BASE}/api/${String(path || '').replace(/^\/+/, '')}`;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('jwt');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function withDefaults(path: string, init?: RequestInit): RequestInit {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? undefined);

  const authHeaders = getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));

  if (method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...init,
    method,
    credentials: init?.credentials ?? 'include',
    headers,
  };
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), withDefaults(path, init));
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}