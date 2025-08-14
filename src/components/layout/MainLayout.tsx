import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from "../../app/layout/Navbar";
import { ChatWidget } from '@/features/chat/ChatWidget';

const MainLayout: React.FC = () => {
  return (
    <div dir="rtl" className="flex flex-col min-h-screen bg-background text-text-primary">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
};

export default MainLayout;
