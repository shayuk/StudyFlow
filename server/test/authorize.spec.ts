import express from 'express';
import type { Request, RequestHandler } from 'express';
import request from 'supertest';
import type { JwtUser } from '../src/auth/jwt';
import { requireRole, requireAnyRole, requireOrg, requireOwnership } from '../src/auth/authorize';
import { describe, it, expect } from 'vitest';

function buildAppWith(user: Partial<JwtUser> | undefined, ...middlewares: RequestHandler[]) {
  const app = express();
  app.use(express.json());
  // Inject a fake user into req for testing
  app.use((req: Request & { user?: JwtUser }, _res, next) => {
    if (user) req.user = user as JwtUser;
    next();
  });
  // Protected route using provided middlewares
  app.get('/protected', ...middlewares, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('authorize middlewares', () => {
  it('requireRole("admin") allows admin, blocks instructor', async () => {
    const adminUser: JwtUser = { sub: 'u1', orgId: 'org1', roles: ['admin'] };
    const instrUser: JwtUser = { sub: 'u2', orgId: 'org1', roles: ['instructor'] };

    await request(buildAppWith(adminUser, requireRole('admin')))
      .get('/protected')
      .expect(200);

    const deny = await request(buildAppWith(instrUser, requireRole('admin')))
      .get('/protected')
      .expect(403);
    expect(deny.body.error).toMatch(/missing role/i);
  });

  it('requireAnyRole([instructor, admin]) allows instructor', async () => {
    const instrUser: JwtUser = { sub: 'u3', orgId: 'org1', roles: ['instructor'] };
    await request(buildAppWith(instrUser, requireAnyRole(['instructor', 'admin'])))
      .get('/protected')
      .expect(200);
  });

  it('requireOrg() blocks when orgId missing', async () => {
    const noOrg: Partial<JwtUser> = { sub: 'u4', roles: ['admin'] };
    const deny = await request(buildAppWith(noOrg, requireOrg()))
      .get('/protected')
      .expect(403);
    expect(deny.body.error).toMatch(/missing org/i);
  });

  it('requireOwnership() allows when sub matches owner, denies otherwise', async () => {
    const owner: JwtUser = { sub: 'u5', orgId: 'org1', roles: ['student'] };
    const other: JwtUser = { sub: 'u6', orgId: 'org1', roles: ['student'] };

    const ok = await request(
      buildAppWith(owner, requireOwnership(() => 'u5')),
    )
      .get('/protected')
      .expect(200);
    expect(ok.body.ok).toBe(true);

    const deny = await request(
      buildAppWith(other, requireOwnership(() => 'u5')),
    )
      .get('/protected')
      .expect(403);
    expect(deny.body.error).toMatch(/not owner/i);
  });
});
