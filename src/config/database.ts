import { PrismaClient } from '@prisma/client';

// Global variable to store the PrismaClient instance
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create a single PrismaClient instance
const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// In development, prevent multiple instances due to hot reloading
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;