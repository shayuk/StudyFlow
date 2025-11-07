import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, headers } = req;
  
  // Set CORS headers
  const origin = headers.origin as string | undefined;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Return debug info
  return res.status(200).json({
    status: 'ok',
    method,
    url,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'not set'
    },
    headers: {
      origin: origin || 'none',
      'content-type': headers['content-type'] || 'none'
    }
  });
}
