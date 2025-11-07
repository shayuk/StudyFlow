import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin as string | undefined;
  const allowlist = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isAllowed = !!origin && allowlist.includes(origin);
  // Allow requests without Origin (e.g., curl) but return CORS headers only for allowed origins
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const body = JSON.stringify({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body).toString());
  res.end(body);
}
