import { useCallback, useState } from 'react';
import { startConversation, streamMessage } from './api';

export function useChat(botInstanceId?: string) {
  const [conversationId, setConv] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle'|'connecting'|'streaming'|'error'|'done'>('idle');
  const [text, setText] = useState('');

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    const out = await startConversation(botInstanceId);
    const id = (out as any).id || (out as any).conversationId || '';
    setConv(id);
    return id;
  }, [conversationId, botInstanceId]);

  const send = useCallback(async (content: string) => {
    setStatus('connecting');
    const id = await ensureConversation();
    setStatus('streaming');
    setText('');
    try {
      await streamMessage(id, content, (t) => setText((prev) => prev + t));
      setStatus('done');
    } catch (e) {
      setStatus('error');
    }
  }, [ensureConversation]);

  return { conversationId, status, text, send };
}
