import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signToken, verifyToken, type JwtUser } from '../src/auth/jwt';

const DFLT_USER: JwtUser = {
  sub: 'u-jwt',
  orgId: 'org-jwt',
  roles: ['student'],
};

let originalSecret: string | undefined;

beforeEach(() => {
  originalSecret = process.env.JWT_SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

describe('auth/jwt sign/verify', () => {
  it('signToken throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    expect(() => signToken(DFLT_USER)).toThrow(/JWT_SECRET is not set/);
  });

  it('verifyToken throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    expect(() => verifyToken('fake.token.here')).toThrow(/JWT_SECRET is not set/);
  });

  it('signs and verifies a token when secret is set', () => {
    process.env.JWT_SECRET = 'test-secret';
    const token = signToken(DFLT_USER, '1h');
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(DFLT_USER.sub);
    expect(decoded.orgId).toBe(DFLT_USER.orgId);
    expect(decoded.roles).toEqual(DFLT_USER.roles);
  });

  it('verifyToken fails for token signed with a different secret', () => {
    process.env.JWT_SECRET = 'secret-A';
    const token = signToken(DFLT_USER, '1h');

    process.env.JWT_SECRET = 'secret-B';
    expect(() => verifyToken(token)).toThrow();
  });

  it('verifyToken fails for expired token', async () => {
    process.env.JWT_SECRET = 'short-lived';
    const token = signToken(DFLT_USER, '1ms');
    await new Promise((r) => setTimeout(r, 5));
    expect(() => verifyToken(token)).toThrow();
  });
});
