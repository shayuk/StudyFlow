import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Send, Maximize, Minimize } from 'lucide-react';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const containerClasses = isExpanded
    ? 'fixed inset-0 sm:inset-auto sm:bottom-4 sm:left-4 sm:w-3/4 sm:h-3/4 z-50 flex flex-col'
    : 'fixed bottom-4 left-4 w-80 h-[400px] z-50 flex flex-col';

  if (!isOpen) return null;

  return (
    <Card className={`${containerClasses} shadow-2xl rounded-lg bg-background`}>
      <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-4 rounded-t-lg">
        <CardTitle className="text-lg">Galibot</CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-primary-foreground hover:bg-primary/80">
                {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary/80">
                <X className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 overflow-y-auto">
        {/* Chat messages will go here */}
        <p className="text-sm text-text-secondary">Welcome to Galibot! How can I help you today?</p>
      </CardContent>
      <div className="p-4 border-t">
        <div className="relative">
            <input
                type="text"
                placeholder="Type a message..."
                className="w-full pr-10 p-2 border rounded-md"
            />
            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                <Send className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </Card>
  );
};
