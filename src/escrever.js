import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeParagraph(row) {
  return {
    id: row.id,
    text: row.text || "",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function ensureEscreverSchema() {
  await query(`
    create table if not exists escrever_paragraphs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      text text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await query("create index if not exists idx_escrever_paragraphs_user_created_at on escrever_paragraphs(user_id, created_at asc);");
  await query("create index if not exists idx_escrever_paragraphs_user_updated_at on escrever_paragraphs(user_id, updated_at desc);");
}

export async function listEscreverParagraphs(userId, limit = 300) {
  await ensureEscreverSchema();
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 300, 1000));
  const result = await query(
    `
      select id, text, created_at, updated_at
      from escrever_paragraphs
      where user_id = $1
      order by created_at asc, id asc
      limit $2
    `,
    [userId, cappedLimit]
  );

  return result.rows.map(normalizeParagraph);
}

export async function createEscreverParagraph(userId, payload = {}) {
  await ensureEscreverSchema();
  const text = String(payload.text || "").replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("Texto vazio.");
  }

  const result = await query(
    `
      insert into escrever_paragraphs (user_id, text, created_at, updated_at)
      values ($1, $2, now(), now())
      returning id, text, created_at, updated_at
    `,
    [userId, text]
  );

  return normalizeParagraph(result.rows[0]);
}

export async function deleteEscreverParagraph(userId, paragraphId) {
  await ensureEscreverSchema();
  const result = await query(
    `
      delete from escrever_paragraphs
      where user_id = $1 and id = $2
      returning id
    `,
    [userId, paragraphId]
  );

  return Boolean(result.rowCount);
}
