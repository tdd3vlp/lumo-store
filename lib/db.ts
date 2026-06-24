import "server-only";
import { createDatabaseClient } from "@/lib/database";

declare global {
  var __lumoSql: ReturnType<typeof createDatabaseClient> | undefined;
}

export const sql =
  globalThis.__lumoSql ??
  createDatabaseClient(Number(process.env.DATABASE_POOL_SIZE ?? 10));

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumoSql = sql;
}
