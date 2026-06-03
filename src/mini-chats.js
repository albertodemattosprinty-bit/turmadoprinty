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
    title: row.title || "Novo chat",
    summary: row.summary || "",
    messages: normalizeMessages(row.messages || []),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    lastMessageAt: toIso(row.last_message_at)
  };
}

export async function ensureMiniChatsSchema() {
  await query(`
    create table if not exists mini_chats (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null default 'Novo chat',
      summary text not null default '',
      messages jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_message_at timestamptz
    );
  `);
  await query("create index if not exists idx_mini_chats_user_updated_at on mini_chats(user_id, updated_at desc);");
  await query("create index if not exists idx_mini_chats_user_last_message_at on mini_chats(user_id, last_message_at desc nulls last);");
}

export async function listMiniChats(userId, limit = 20) {
  await ensureMiniChatsSchema();
  const result = await query(
    `
      select id, title, summary, created_at, updated_at, last_message_at, messages
      from mini_chats
      where user_id = $1
      order by coalesce(last_message_at, updated_at) desc, created_at desc
      limit $2
    `,
    [userId, Math.max(1, Math.min(Number(limit) || 20, 50))]
  );
  return result.rows.map(normalizeChat);
}

export async function getMiniChatById(userId, chatId) {
  await ensureMiniChatsSchema();
  const result = await query(
    `
      select id, title, summary, created_at, updated_at, last_message_at, messages
      from mini_chats
      where user_id = $1 and id = $2
      limit 1
    `,
    [userId, chatId]
  );
  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function createMiniChat(userId, payload = {}) {
  await ensureMiniChatsSchema();
  const title = String(payload.title || "Novo chat").trim() || "Novo chat";
  const messages = normalizeMessages(payload.messages || []);
  const summary = String(payload.summary || "").trim();
  const result = await query(
    `
      insert into mini_chats (user_id, title, summary, messages, created_at, updated_at, last_message_at)
      values ($1, $2, $3, $4::jsonb, now(), now(), null)
      returning id, title, summary, created_at, updated_at, last_message_at, messages
    `,
    [userId, title.slice(0, 120), summary.slice(0, 2000), JSON.stringify(messages)]
  );
  return normalizeChat(result.rows[0]);
}

export async function updateMiniChat(userId, chatId, patch = {}) {
  await ensureMiniChatsSchema();
  const current = await getMiniChatById(userId, chatId);
  if (!current) {
    return null;
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
      update mini_chats
      set title = $3,
          summary = $4,
          messages = $5::jsonb,
          last_message_at = $6::timestamptz,
          updated_at = now()
      where user_id = $1 and id = $2
      returning id, title, summary, created_at, updated_at, last_message_at, messages
    `,
    [userId, chatId, nextTitle, nextSummary, JSON.stringify(nextMessages), nextLastMessageAt]
  );

  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function appendMiniChatMessages(userId, chatId, entries = [], patch = {}) {
  const current = await getMiniChatById(userId, chatId);
  const existingMessages = current?.messages || [];
  const nextMessages = [...existingMessages, ...normalizeMessages(entries)];

  return updateMiniChat(userId, chatId, {
    title: patch.title,
    summary: patch.summary,
    messages: nextMessages,
    lastMessageAt: patch.lastMessageAt || new Date().toISOString()
  });
}
