import { prisma } from '../db';
import { logger } from '../logger';
import { DEFAULT_ADMIN_EMAIL } from '../config';

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

  // Find or create an Org to attach the admin to
  let org = await prisma.org.findFirst();
  if (!org) {
    org = await prisma.org.create({ data: { name: 'Default Org' } });
    logger.info({ orgId: org.id }, 'Created default Org for admin seeding');
  }

  // Try find user by email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    // Cast to any to avoid TS mismatch before prisma generate runs
    await prisma.user.create({ data: { orgId: org.id, email, role: 'admin' } as any });
    logger.info({ email }, 'Default admin created');
    return;
  }

  if ((existing as any).role !== 'admin') {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } as any });
    logger.info({ userId: existing.id, email }, 'Default admin promoted to admin');
  } else {
    logger.info({ userId: existing.id, email }, 'Default admin already present');
  }
}
