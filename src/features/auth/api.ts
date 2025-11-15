import { API_BASE } from '@/lib/api';

export type RegisterResponse = {
  token: string;
  user: { id: string; email: string; role: 'student' | 'lecturer' | 'admin' };
};

const DEFAULT_TIMEOUT = 12000;

async function postAuth(
  endpoint: 'auth/register' | 'auth/login',
  payload: unknown,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<RegisterResponse> {
  const url = `${API_BASE}/${endpoint}`;
  
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'AbortError')), timeoutMs);
  const kind = endpoint.endsWith('login') ? 'login' : 'register';
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${kind}_failed_${res.status}:${text}`);
    }
    
    return res.json() as Promise<RegisterResponse>;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error(`${kind}_failed_timeout`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function registerEmail(email: string): Promise<RegisterResponse> {
  return postAuth('auth/register', { email });
}

export async function loginEmail(email: string): Promise<RegisterResponse> {
  return postAuth('auth/login', { email });
}
