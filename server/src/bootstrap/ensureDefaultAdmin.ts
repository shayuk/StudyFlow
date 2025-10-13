import { prisma } from '../db';
import { logger } from '../logger';
import { DEFAULT_ADMIN_EMAIL, SINGLE_ORG_NAME } from '../config';

function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

export async function ensureDefaultAdmin(): Promise<void> {
  logger.info('Ensuring default admin…');

  const email = DEFAULT_ADMIN_EMAIL?.trim();
  if (!email) {
    logger.warn('DEFAULT_ADMIN_EMAIL not set; skipping default admin ensure');
    return;
  }
  if (!isValidEmail(email)) {
    logger.warn({ email }, 'DEFAULT_ADMIN_EMAIL is invalid; skipping');
    return;
  }

  // Find or create the single Org for production (Ariel University)
  let org = await prisma.org.findFirst({ where: { name: SINGLE_ORG_NAME } });
  if (!org) {
    org = await prisma.org.create({ data: { name: SINGLE_ORG_NAME } });
    logger.info({ orgId: org.id, name: SINGLE_ORG_NAME }, 'Created single Org for admin seeding');
  }

  // Try find user by email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data: { orgId: org.id, email, role: 'admin' } });
    logger.info({ email }, 'Default admin created');
    return;
  }

  const currentRole = (existing as { role?: string }).role;
  if (currentRole !== 'admin') {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    logger.info({ userId: existing.id, email }, 'Default admin promoted to admin');
  } else {
    logger.info({ userId: existing.id, email }, 'Default admin already present');
  }
}
