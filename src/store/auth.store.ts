import { create } from 'zustand';
import { useNotificationStore } from './notification.store.js';

export interface User {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'lecturer';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => {
    // Clear notifications from the previous user's session
    useNotificationStore.getState().clearNotifications();
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    useNotificationStore.getState().clearNotifications();
    set({ user: null, isAuthenticated: false });
  },
}));
