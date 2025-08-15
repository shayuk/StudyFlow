import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'alert' | 'recommendation' | 'info' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  isSpoken: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (message: string, type: NotificationType) => void;
  markAsRead: (id: string) => void;
  markAsSpoken: (id: string) => void;
  clearAll: () => void;
  getUnread: () => AppNotification[];
  getUnspoken: () => AppNotification[];
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (message, type) => {
    const newNotification: AppNotification = {
      id: uuidv4(),
      message,
      type,
      read: false,
      isSpoken: false,
    };
    set((state) => ({ notifications: [...state.notifications, newNotification] }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  clearAll: () => set({ notifications: [] }),
  markAsSpoken: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isSpoken: true } : n
      ),
    }));
  },
  getUnread: () => get().notifications.filter(n => !n.read),
  getUnspoken: () => get().notifications.filter(n => !n.isSpoken),
  clearNotifications: () => {
    set({ notifications: [] });
  }
}));
