import jwt from 'jsonwebtoken';

export type Role = 'student' | 'instructor' | 'admin';

export interface JwtUser {
  sub: string; // user id
  orgId: string;
  roles: Role[];
  courseId?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || '';
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function signToken(payload: JwtUser, expiresIn: string = '7d'): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn });
}

export function verifyToken(token: string): JwtUser {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  return decoded as JwtUser;
}
