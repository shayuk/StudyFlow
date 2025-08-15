import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader } from '../../components/ui/Card.js';
import { MessageSquare, X, Send, Maximize, Minimize } from 'lucide-react';
import { useUiStore } from '../../store/ui.store.js';
import type { User } from '../../store/auth.store.js';
import { useNotificationStore } from '../../store/notification.store.js';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'bot' | 'user';
}

interface ChatWidgetProps {
  user: User | null;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const { currentContext } = useUiStore();
  const { notifications, getUnspoken, markAsSpoken } = useNotificationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const botName = user?.role === 'student' ? 'Galibot' : 'Leobot';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Effect for initial welcome message
  useEffect(() => {
    const welcomeText = `היי! אני **${botName}**, העוזר האישי שלך. אני רואה שאת/ה נמצא/ת ב**${currentContext}**. איך אוכל לסייע?`;

    setMessages([
      {
        id: 'initial-welcome',
        sender: 'bot',
        text: welcomeText,
      },
    ]);
  }, [user?.role, botName, currentContext]);

  // Effect for proactive notifications
  useEffect(() => {
    if (!isOpen) return;

    const unspokenNotifications = getUnspoken();
    if (unspokenNotifications.length > 0) {
      const newBotMessages: ChatMessage[] = unspokenNotifications.map(n => ({
        id: n.id,
        sender: 'bot',
        text: n.message,
      }));

      setMessages(prevMessages => [...prevMessages, ...newBotMessages]);
      unspokenNotifications.forEach(n => markAsSpoken(n.id));
    }
  }, [notifications, isOpen, getUnspoken, markAsSpoken]);

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    const newUserMessage: ChatMessage = {
      id: new Date().toISOString(),
      sender: 'user',
      text: userInput,
    };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    
    // Simple bot echo for now
    setTimeout(() => {
        const botResponse: ChatMessage = {
            id: new Date().toISOString() + '-bot',
            sender: 'bot',
            text: `קיבלתי: "${userInput}". אני עדיין לומד לענות, אבל העברתי את זה למערכת.`
        };
        setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const containerClasses = isExpanded
    ? 'fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-3/4 sm:h-3/4 z-50 flex flex-col'
    : 'fixed bottom-4 right-4 w-80 h-[400px] z-50 flex flex-col';

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-2xl z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-8 w-8" />
      </Button>
    );
  }

  return (
    <Card className={`${containerClasses} shadow-2xl rounded-lg bg-background`}>
      <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-4 rounded-t-lg">
        <div className="flex flex-col">
          <p className="font-semibold">{botName}</p>
          <p className="text-xs text-gray-400">זמין כעת ב: {currentContext}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-primary-foreground hover:bg-primary/80">
            {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary/80">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 overflow-y-auto bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`rounded-lg px-3 py-2 max-w-[85%] shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
              <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-2 border-t bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="הקלד הודעה..."
            className="w-full pr-10 p-2 border rounded-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500 hover:text-blue-500" onClick={handleSendMessage}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
