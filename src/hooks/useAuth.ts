import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'student' | 'lecturer';
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loginByRole: (role: 'student' | 'lecturer') => void;
}

const mockUsers: Record<'student' | 'lecturer', User> = {
  student: { id: 's1', name: 'ישראל ישראלי', role: 'student' },
  lecturer: { id: 'l1', name: 'ד"ר כהן', role: 'lecturer' },
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  loginByRole: (role) => set({ user: mockUsers[role] }),
}));
