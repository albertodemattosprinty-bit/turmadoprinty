import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL?.trim();

export const db = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

export async function query(text, params = []) {
  if (!db) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  return db.query(text, params);
}

export function hasDatabase() {
  return Boolean(db);
}
