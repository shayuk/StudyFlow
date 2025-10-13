import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { signToken } from '../auth/jwt';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, name, orgName, role } = (req.body ?? {}) as { email?: string; name?: string; orgName?: string; role?: string };
  const e = (email || '').toString().trim().toLowerCase();
  if (!/.+@.+\..+/.test(e)) return res.status(400).json({ error: 'invalid email' });

  let org = await prisma.org.findFirst();
  if (!org) org = await prisma.org.create({ data: { name: orgName || 'Default Org' } });

  let user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) {
    user = await prisma.user.create({ data: { orgId: org.id, email: e, name: name || null, role: (role || 'student') } });
  }

  const token = signToken({ sub: user.id, orgId: user.orgId, roles: [user.role as any] });
  return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId } });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email } = (req.body ?? {}) as { email?: string };
  const e = (email || '').toString().trim().toLowerCase();
  if (!/.+@.+\..+/.test(e)) return res.status(400).json({ error: 'invalid email' });

  const user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) return res.status(404).json({ error: 'user not found' });

  const token = signToken({ sub: user.id, orgId: user.orgId, roles: [user.role as any] });
  return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId } });
});

export default router;
