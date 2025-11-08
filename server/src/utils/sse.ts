import type { Request, Response } from 'express';
import express from 'express';

export function openSSE(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('Vary', 'Accept');
  // Disable buffering in some reverse proxies (nginx)
  // TODO: Ensure upstream (e.g., Vercel/Cloudflare) honors X-Accel-Buffering=no. Add docs or runtime log to confirm once per boot.
  res.setHeader('X-Accel-Buffering', 'no');
  // TODO: flushHeaders is not available in some environments. Guard already optional; consider logging once if missing to aid debugging.
  (res as any).flushHeaders?.();
  // TODO: Heartbeat interval keeps connections alive for SSE. Make interval configurable for tests and ensure it is cleared on all termination paths.
  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch { /* ignore */ }
  }, 15000);
  req.on('close', () => clearInterval(heartbeat));
  return {
    write(event: string, data: unknown) {
      try {
        res.write(`event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`);
      } catch { /* ignore */ }
    },
    end() {
      try { clearInterval(heartbeat); } catch { /* ignore */ }
      try { res.end(); } catch { /* ignore */ }
    },
  };
}

export function sseError(res: Response, message: string, code = 'BOT_ERROR') {
  try {
    res.write(`event: error\n` + `data: ${JSON.stringify({ code, message })}\n\n`);
  } catch { /* ignore */ }
  try { res.end(); } catch { /* ignore */ }
}
