import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple direct handler without Express
  console.log('Simple test handler called:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  // Set CORS headers directly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'GET request successful',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    const body = req.body;
    return res.status(200).json({
      status: 'ok',
      message: 'POST request successful',
      received: body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({
    error: 'Method not allowed',
    method: req.method
  });
}
