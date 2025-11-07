import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
});

// JWT signing function
function signToken(payload: { sub: string; orgId: string; roles: string[] }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  
  return jwt.sign(payload, secret, {
    expiresIn: '30d',
    issuer: process.env.JWT_ISSUER || 'studyflow-server',
    audience: process.env.JWT_AUDIENCE || 'studyflow-client',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Register handler called:', {
    method: req.method,
    url: req.url,
    body: req.body
  });

  // Set CORS headers
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ error: 'JWT not configured' });
    }

    // Parse request body
    const { email, name } = req.body || {};
    const normalizedEmail = (email || '').toString().trim().toLowerCase();

    // Validate email
    if (!/.+@.+\..+/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get or create org
    const SINGLE_ORG_NAME = process.env.SINGLE_ORG_NAME || 'Ariel University';
    let org = await prisma.org.findFirst({ where: { name: SINGLE_ORG_NAME } });
    if (!org) {
      org = await prisma.org.create({ data: { name: SINGLE_ORG_NAME } });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Determine role based on email
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'krimishay68@gmail.com';
    const role = normalizedEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';
    
    // Create user
    const user = await prisma.user.create({
      data: {
        orgId: org.id,
        email: normalizedEmail,
        name: name || null,
        role: role
      }
    });

    // Generate token
    const token = signToken({
      sub: user.id,
      orgId: user.orgId,
      roles: [user.role]
    });

    // Return success response
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return res.status(500).json({ error: message });
  }
}
