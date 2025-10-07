import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Send, Maximize2, Minus } from 'lucide-react';
import { Navbar } from './Navbar';
import { useAuth } from '@/hooks/useAuth';

const ChatWidget = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const containerClasses = isExpanded
    ? 'fixed bottom-0 left-0 w-3/4 h-3/4 bg-white rounded-t-lg shadow-2xl flex flex-col z-50 m-8'
    : 'fixed bottom-8 left-8 bg-white rounded-lg shadow-2xl w-80 h-96 flex flex-col z-50';

  return (
    <div className={containerClasses}>
      <header
        className="bg-primary text-white p-3 flex justify-between items-center rounded-t-lg cursor-pointer"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <h3 className="font-bold">StudyFlow Bot</h3>
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="hover:bg-primary-dark p-1 rounded-full"
        >
          {isExpanded ? <Minus size={20} /> : <Maximize2 size={20} />}
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto bg-background">
        {/* Chat messages will go here */}
        <p className="text-sm text-gray-500">אין הודעות עדיין. התחילו שיחה!</p>
      </div>
      <footer className="p-3 border-t bg-white">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <input
            type="text"
            placeholder="הקלד הודעה..."
            className="flex-1 p-2 border rounded-full text-sm"
          />
          <button className="bg-primary text-white p-2 rounded-full hover:bg-primary-dark">
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export const AppShell = () => {
  const user = useAuth(state => state.user);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <main className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <ChatWidget />
    </div>
  );
};
