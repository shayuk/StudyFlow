import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type AuthState } from '../../hooks/useAuth.js';
import { Navbar } from "../../app/layout/Navbar.js";
import { ChatWidget } from '../../features/chat/ChatWidget.js';
import { NotificationManager } from '../../features/notifications/NotificationManager.js';

const MainLayout: React.FC = () => {
  const user = useAuth((state: AuthState) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div dir="rtl" className="flex flex-col min-h-screen bg-background text-text-primary">
      <NotificationManager />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
        <ChatWidget />
      </main>
    </div>
  );
};

export default MainLayout;
