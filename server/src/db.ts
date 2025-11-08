import { PrismaClient, Prisma } from '@prisma/client/edge';

// Singleton Prisma Client to avoid multiple instances in dev with ts-node-dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Configure Prisma with better error handling for Vercel
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] as Prisma.LogLevel[]
    : ['error'] as Prisma.LogLevel[],
  errorFormat: 'minimal',
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
