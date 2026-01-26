// ═══════════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma client with logging in development
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Singleton Prisma client
 * In development, we store the client on the global object to prevent
 * creating multiple instances during hot reloading
 */
export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

/**
 * Disconnect from database
 */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Connect to database
 */
export async function connectDb(): Promise<void> {
  await prisma.$connect();
}
