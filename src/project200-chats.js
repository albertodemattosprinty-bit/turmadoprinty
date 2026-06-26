import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => ({
      role: String(item?.role || "").trim() || "user",
      content: String(item?.content || "").trim(),
      createdAt: toIso(item?.createdAt) || new Date().toISOString()
    }))
    .filter((item) => item.content);
}

function normalizeChat(row) {
  return {
    id: row.id,
    title: row.title || "Conversas",
    summary: row.summary || "",
    messages: normalizeMessages(row.messages || []),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    lastMessageAt: toIso(row.last_message_at)
  };
}

export async function ensureProject200ChatsSchema() {
  await query(`
    create table if not exists project200_chats (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null unique references users(id) on delete cascade,
      title text not null default 'Conversas',
      summary text not null default '',
      messages jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_message_at timestamptz
    );
  `);
  await query("create index if not exists idx_project200_chats_updated_at on project200_chats(updated_at desc);");
}

export async function getProject200Chat(userId) {
  await ensureProject200ChatsSchema();
  const result = await query(
    `
      select id, title, summary, created_at, updated_at, last_message_at, messages
      from project200_chats
      where user_id = $1
      limit 1
    `,
    [userId]
  );
  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function createProject200Chat(userId, payload = {}) {
  await ensureProject200ChatsSchema();
  const title = String(payload.title || "Conversas").trim() || "Conversas";
  const summary = String(payload.summary || "").trim();
  const messages = normalizeMessages(payload.messages || []);
  const result = await query(
    `
      insert into project200_chats (user_id, title, summary, messages, created_at, updated_at, last_message_at)
      values ($1, $2, $3, $4::jsonb, now(), now(), null)
      on conflict (user_id) do update
        set title = excluded.title,
            summary = excluded.summary,
            updated_at = now()
      returning id, title, summary, created_at, updated_at, last_message_at, messages
    `,
    [userId, title.slice(0, 120), summary.slice(0, 2000), JSON.stringify(messages)]
  );
  return normalizeChat(result.rows[0]);
}

export async function updateProject200Chat(userId, patch = {}) {
  await ensureProject200ChatsSchema();
  const current = await getProject200Chat(userId);
  if (!current) {
    return createProject200Chat(userId, patch);
  }

  const nextTitle = typeof patch.title === "string" && patch.title.trim()
    ? patch.title.trim().slice(0, 120)
    : current.title;
  const nextSummary = typeof patch.summary === "string"
    ? patch.summary.trim().slice(0, 4000)
    : current.summary;
  const nextMessages = Array.isArray(patch.messages)
    ? normalizeMessages(patch.messages)
    : current.messages;
  const nextLastMessageAt = patch.lastMessageAt ? toIso(patch.lastMessageAt) : current.lastMessageAt;

  const result = await query(
    `
      update project200_chats
      set title = $2,
          summary = $3,
          messages = $4::jsonb,
          last_message_at = $5::timestamptz,
          updated_at = now()
      where user_id = $1
      returning id, title, summary, created_at, updated_at, last_message_at, messages
    `,
    [userId, nextTitle, nextSummary, JSON.stringify(nextMessages), nextLastMessageAt]
  );

  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function appendProject200ChatMessages(userId, entries = [], patch = {}) {
  const current = await getProject200Chat(userId);
  const existingMessages = current?.messages || [];
  const nextMessages = [...existingMessages, ...normalizeMessages(entries)];

  return updateProject200Chat(userId, {
    title: patch.title,
    summary: patch.summary,
    messages: nextMessages,
    lastMessageAt: patch.lastMessageAt || new Date().toISOString()
  });
}
