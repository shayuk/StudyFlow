import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const body = JSON.stringify({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body).toString());
  res.end(body);
}
