import fs from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export { schema };

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/** Banco embutido (PGlite). Sem `dir`, fica só em memória (usado nos testes). */
export async function criarDbPglite(dir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const client = dir ? new PGlite(dir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

/** PostgreSQL de produção (Neon), pela variável DATABASE_URL. */
async function criarDbPostgres(url: string): Promise<DB> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 5, prepare: false });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

const g = globalThis as unknown as { __sfpDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__sfpDb) {
    g.__sfpDb = process.env.DATABASE_URL
      ? criarDbPostgres(process.env.DATABASE_URL)
      : criarDbPglite(path.join(process.cwd(), ".data", "pglite"));
  }
  return g.__sfpDb;
}
