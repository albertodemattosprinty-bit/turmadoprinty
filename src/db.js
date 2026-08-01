import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL?.trim();
const schemaQueryPromises = new Map();

export const db = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

function isIdempotentSchemaQuery(text) {
  const normalized = String(text || "").trim().replace(/\s+/gu, " ").toLowerCase();
  return normalized.startsWith("create table if not exists ")
    || normalized.startsWith("create index if not exists ")
    || normalized.startsWith("create unique index if not exists ")
    || normalized.startsWith("create extension if not exists ")
    || (normalized.startsWith("alter table ") && normalized.includes(" if not exists "));
}

export async function query(text, params = []) {
  if (!db) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  if (params.length === 0 && isIdempotentSchemaQuery(text)) {
    const cacheKey = String(text).trim().replace(/\s+/gu, " ");
    if (!schemaQueryPromises.has(cacheKey)) {
      const schemaPromise = db.query(text).catch((error) => {
        schemaQueryPromises.delete(cacheKey);
        throw error;
      });
      schemaQueryPromises.set(cacheKey, schemaPromise);
    }
    return schemaQueryPromises.get(cacheKey);
  }

  return db.query(text, params);
}

export function hasDatabase() {
  return Boolean(db);
}
