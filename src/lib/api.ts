export const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, API_BASE).toString();
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
