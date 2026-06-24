import postgres from "postgres";

export function createDatabaseClient(maxConnections = 10) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  return postgres(databaseUrl, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
}

