import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUser } from './jwt';

export interface AuthedRequest extends Request {
  user?: JwtUser;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.header('Authorization') || req.header('authorization');
  const devAuth = process.env.DEV_AUTH_MODE === 'true';
  if (!hdr || !hdr.startsWith('Bearer ')) {
    if (devAuth) {
      const role = (req.header('x-role') || 'student') as JwtUser['roles'][number];
      const orgId = req.header('x-org-id') || 'dev-org';
      const sub = req.header('x-user-id') || 'dev-user';
      req.user = { sub, orgId, roles: [role] };
      return next();
    }
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }
  const token = hdr.slice('Bearer '.length).trim();
  try {
    const user = verifyToken(token);
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
