import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$connect();
    console.info('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$disconnect();
    console.info('🔌 Database disconnected');
  } catch (error) {
    console.error('❌ Failed to disconnect from database:', error);
  }
}

export async function healthCheck(): Promise<boolean> {
  const client = getPrismaClient();
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { prisma };

