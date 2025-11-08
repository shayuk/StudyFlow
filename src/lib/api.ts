export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_BASE}/api/${String(path || '').replace(/^\/+/, '')}`;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('jwt');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export function apiFetch(path: string, init?: RequestInit) {
  const authHeaders = getAuthHeaders();
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers || {})
    }
  });
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeaders();
  const res = await apiFetch(path, {
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers || {}) 
    },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}