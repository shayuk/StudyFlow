import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string | undefined;
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Log environment variables (without exposing sensitive data)
  const envCheck = {
    hasDatabase: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET,
    hasAdminEmail: !!process.env.DEFAULT_ADMIN_EMAIL,
    adminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'not set',
    allowedOrigins: process.env.ALLOWED_ORIGINS || 'not set',
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  };

  console.log('Test register endpoint:', envCheck);

  // Simple test response
  return res.status(200).json({
    success: true,
    message: 'Test register endpoint working',
    timestamp: new Date().toISOString(),
    env: envCheck
  });
}
