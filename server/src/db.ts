import { PrismaClient } from '@prisma/client';

// Singleton Prisma Client to avoid multiple instances in dev with ts-node-dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
