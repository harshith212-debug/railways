import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgChecked?: boolean;
  pgAvailable?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function isPostgresAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  if (globalForPrisma.pgChecked) {
    return Boolean(globalForPrisma.pgAvailable);
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    globalForPrisma.pgChecked = true;
    globalForPrisma.pgAvailable = true;
    return true;
  } catch {
    globalForPrisma.pgChecked = true;
    globalForPrisma.pgAvailable = false;
    return false;
  }
}
