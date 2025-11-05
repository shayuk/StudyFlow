import { apiUrl } from '@/lib/api';

export type RegisterResponse = {
  token: string;
  user: { id: string; email: string; role: 'student' | 'lecturer' | 'admin' };
};

export async function registerEmail(email: string): Promise<RegisterResponse> {
  const res = await fetch(apiUrl('auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`register_failed_${res.status}:${text}`);
  }
  return res.json() as Promise<RegisterResponse>;
}

export async function loginEmail(email: string): Promise<RegisterResponse> {
  const res = await fetch(apiUrl('auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`login_failed_${res.status}:${text}`);
  }
  return res.json() as Promise<RegisterResponse>;
}
