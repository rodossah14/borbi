import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Singleton Prisma. En dev, on évite la prolifération d'instances
 * causée par le hot-reload de tsx en attachant le client à globalThis.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prismaClient ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}
