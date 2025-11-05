import { create } from 'zustand';

interface User {
  id: string;
  name?: string;
  email?: string;
  role: 'student' | 'lecturer' | 'admin';
}

export interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loginByRole: (role: 'student' | 'lecturer' | 'admin') => void;
  loginWithToken: (user: User, token: string) => void;
}

const mockUsers: Record<'student' | 'lecturer' | 'admin', User> = {
  student: { id: 's1', name: 'ישראל ישראלי', role: 'student' },
  lecturer: { id: 'l1', name: 'ד"ר כהן', role: 'lecturer' },
  admin: { id: 'a1', name: 'מנהל', role: 'admin' },
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => {
    try { localStorage.removeItem('jwt'); } catch {}
    set({ user: null });
  },
  loginByRole: (role) => set({ user: mockUsers[role] }),
  loginWithToken: (user, token) => {
    try { localStorage.setItem('jwt', token); } catch {}
    set({ user });
  },
}));
