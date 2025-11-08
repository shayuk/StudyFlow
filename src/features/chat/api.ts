const BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('jwt');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export async function startConversation(botInstanceId?: string) {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/api/chat/start`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders 
    },
    body: JSON.stringify({ botInstanceId }),
  });
  if (!res.ok) throw new Error('failed_to_start');
  return res.json() as Promise<{ id: string }>; // server returns full ConversationOut; we use id
}

export async function streamMessage(
  conversationId: string,
  content: string,
  onToken: (t: string) => void
) {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/api/chat/${encodeURIComponent(conversationId)}/message?stream=1`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok || !res.body) throw new Error('stream_failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Parse Server-Sent Event frame
      const lines = frame.split('\n');
      const evt = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
      const dataLine = lines.find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine.slice(6));
        if (evt === 'delta' && typeof payload?.t === 'string') {
          onToken(payload.t);
        }
        // 'done' can be handled by caller if needed
      } catch {
        // ignore malformed JSON
      }
    }
  }
}
