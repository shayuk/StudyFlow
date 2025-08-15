import { create } from 'zustand';

interface User {
  name: string;
  role: 'lecturer' | 'student';
}

interface UserState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// Mock user for demonstration purposes
const mockUser: User = {
    name: 'ד"ר גלית מדר',
    role: 'lecturer',
};

export const useUserStore = create<UserState>((set) => ({
  user: mockUser, // Default to a logged-in mock user
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
