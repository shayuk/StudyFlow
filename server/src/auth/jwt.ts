import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { JWT_AUDIENCE, JWT_ISSUER } from '../config';

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

export function signToken(payload: JwtUser, expiresInSeconds: number = 7 * 24 * 60 * 60): string {
  const secret: Secret = getJwtSecret();
  const opts: SignOptions = {
    expiresIn: expiresInSeconds,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256'
  };
  return jwt.sign(payload, secret, opts);
}

export function verifyToken(token: string): JwtUser {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
  return decoded as JwtUser;
}
