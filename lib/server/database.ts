import { Pool } from "pg";

const DATABASE_POOL_SYMBOL = Symbol.for("willing-ways-ai.database-pool");

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    ""
  );
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getDatabasePool() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("The PostgreSQL database is not configured.");
  }

  const globalObject = globalThis as typeof globalThis & {
    [DATABASE_POOL_SYMBOL]?: Pool;
  };

  if (!globalObject[DATABASE_POOL_SYMBOL]) {
    globalObject[DATABASE_POOL_SYMBOL] = new Pool({
      connectionString: databaseUrl,
      max: 4,
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    });
  }

  return globalObject[DATABASE_POOL_SYMBOL];
}
