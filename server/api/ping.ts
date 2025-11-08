import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Allow CORS from any origin for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // Simple ping response
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    ok: true, 
    timestamp: Date.now(),
    message: 'Server is running!'
  }));
}
