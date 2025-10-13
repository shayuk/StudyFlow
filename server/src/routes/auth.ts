import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { signToken, type Role } from '../auth/jwt';
import { SINGLE_ORG_NAME } from '../config';

const router = Router();

function requireEnvOr503(res: Response): { ok: boolean; msg?: string } {
  const jwtOk = !!process.env.JWT_SECRET;
  const dbOk = !!process.env.DATABASE_URL;
  if (!jwtOk || !dbOk) {
    const msg = `service not ready: ${!jwtOk ? 'JWT_SECRET ' : ''}${!dbOk ? 'DATABASE_URL' : ''}`.trim();
    res.status(503).json({ error: msg });
    return { ok: false, msg };
  }
  return { ok: true };
}

async function withDbTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('db timeout')), ms)) as Promise<T>,
  ]);
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const env = requireEnvOr503(res);
    if (!env.ok) return;

    const { email, name } = (req.body ?? {}) as { email?: string; name?: string };
    const e = (email || '').toString().trim().toLowerCase();
    if (!/.+@.+\..+/.test(e)) return res.status(400).json({ error: 'invalid email' });

    let org = await withDbTimeout(prisma.org.findFirst({ where: { name: SINGLE_ORG_NAME } }));
    if (!org) org = await withDbTimeout(prisma.org.create({ data: { name: SINGLE_ORG_NAME } }));

    const existing = await withDbTimeout(prisma.user.findUnique({ where: { email: e } }));
    if (existing) return res.status(409).json({ error: 'A user with this email already exists.' });

    const user = await withDbTimeout(prisma.user.create({ data: { orgId: org.id, email: e, name: name || null, role: 'student' } }));

    const token = signToken({ sub: user.id, orgId: user.orgId, roles: [user.role as Role] });
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'register failed';
    const code = msg.includes('timeout') ? 504 : 500;
    return res.status(code).json({ error: msg });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const env = requireEnvOr503(res);
    if (!env.ok) return;

    const { email } = (req.body ?? {}) as { email?: string };
    const e = (email || '').toString().trim().toLowerCase();
    if (!/.+@.+\..+/.test(e)) return res.status(400).json({ error: 'invalid email' });

    const user = await withDbTimeout(prisma.user.findUnique({ where: { email: e } }));
    if (!user) return res.status(404).json({ error: 'user not found' });

    const token = signToken({ sub: user.id, orgId: user.orgId, roles: [user.role as Role] });
    return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'login failed';
    const code = msg.includes('timeout') ? 504 : 500;
    return res.status(code).json({ error: msg });
  }
});

export default router;
