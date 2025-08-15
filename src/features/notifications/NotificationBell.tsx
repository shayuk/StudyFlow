import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/notification.store.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';

export const NotificationBell: React.FC = () => {
  const { notifications, getUnread, markAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const unreadNotifications = getUnread();
  const node = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (node.current?.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={node} className="relative">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-6 w-6" />
        {unreadNotifications.length > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadNotifications.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 shadow-lg z-50">
          <CardHeader>
            <CardTitle>התראות</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-2 mb-2 rounded-md ${n.read ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-gray-900'}`}>
                  <p className="text-sm mb-2">{n.message}</p>
                  {!n.read && (
                    <Button variant="link" size="sm" onClick={() => markAsRead(n.id)} className="p-0 h-auto">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      סמן כנקרא
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center p-4">אין התראות חדשות.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
