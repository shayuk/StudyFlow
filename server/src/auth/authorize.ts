import { Request, Response, NextFunction } from 'express';
import type { JwtUser, Role } from './jwt';

export interface AuthedRequest extends Request {
  user?: JwtUser;
}

export function requireRole(role: Role) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const roles = req.user?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: missing role ' + role });
    }
    next();
  };
}

export function requireAnyRole(accepted: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const roles = req.user?.roles || [];
    const ok = accepted.some(r => roles.includes(r));
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: requires one of roles ' + accepted.join(', ') });
    }
    next();
  };
}

export function requireOrg() {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.orgId) {
      return res.status(403).json({ error: 'Forbidden: missing org context' });
    }
    next();
  };
}

export function requireOwnership(getOwnerId: (req: AuthedRequest) => string | undefined) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const uid = req.user?.sub;
    const owner = getOwnerId(req);
    if (!uid || !owner || uid !== owner) {
      return res.status(403).json({ error: 'Forbidden: not owner' });
    }
    next();
  };
}
