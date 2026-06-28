import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

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
      createdAt: toIso(item?.createdAt) || new Date().toISOString(),
      source: String(item?.source || "").trim() || "manual"
    }))
    .filter((item) => item.content);
}

function normalizeChat(row) {
  return {
    id: row.id,
    userId: row.user_id,
    profileName: normalizeStoredProject200ProfileName(row.assigned_profile || PROJECT200_DEFAULT_PROFILE_NAME),
    toneKey: normalizeChatToneKey(row.tone_key),
    title: row.title || "Conversas",
    summary: row.summary || "",
    messages: normalizeMessages(row.messages || []),
    unreadCount: Math.max(0, Number(row.unread_count || 0)),
    notificationPermission: String(row.notification_permission || "").trim() || "default",
    autoMeta: row.auto_meta && typeof row.auto_meta === "object" ? row.auto_meta : {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    lastMessageAt: toIso(row.last_message_at)
  };
}

function normalizeChatProfileName(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function normalizeChatToneKey(value) {
  const normalized = String(value || "neutral").trim().toLowerCase();
  return normalized || "neutral";
}

export async function ensureProject200ChatsSchema() {
  await query(`
    create table if not exists project200_chats (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      tone_key text not null default 'neutral',
      title text not null default 'Conversas',
      summary text not null default '',
      messages jsonb not null default '[]'::jsonb,
      unread_count integer not null default 0,
      notification_permission text not null default 'default',
      auto_meta jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_message_at timestamptz
    );
  `);
  await query("alter table project200_chats add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table project200_chats add column if not exists tone_key text not null default 'neutral';");
  await query("alter table project200_chats add column if not exists unread_count integer not null default 0;");
  await query("alter table project200_chats add column if not exists notification_permission text not null default 'default';");
  await query("alter table project200_chats add column if not exists auto_meta jsonb not null default '{}'::jsonb;");
  await query("update project200_chats set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query("update project200_chats set tone_key = 'neutral' where tone_key is null or btrim(tone_key) = '';");
  await query(`
    with ranked as (
      select ctid,
             row_number() over (
               partition by user_id, assigned_profile, tone_key
               order by coalesce(updated_at, last_message_at, created_at) desc, created_at desc, ctid desc
             ) as duplicate_rank
        from project200_chats
    )
    delete from project200_chats
    where ctid in (
      select ctid
      from ranked
      where duplicate_rank > 1
    );
  `);
  await query("drop index if exists idx_project200_chats_updated_at;");
  await query("drop index if exists idx_project200_chats_user_unique;");
  await query("drop index if exists idx_project200_chats_user_profile_unique;");
  await query("drop index if exists idx_project200_chats_user_profile_tone_unique;");
  await query(`
    create unique index if not exists idx_project200_chats_user_profile_tone_unique
    on project200_chats (user_id, assigned_profile, tone_key);
  `);
  await query("create index if not exists idx_project200_chats_updated_at on project200_chats(updated_at desc);");
}

export async function getProject200Chat(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral") {
  await ensureProject200ChatsSchema();
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  const result = await query(
    `
      select id, user_id, assigned_profile, tone_key, title, summary, created_at, updated_at, last_message_at, messages
           , unread_count, notification_permission, auto_meta
      from project200_chats
      where user_id = $1
        and assigned_profile = $2
        and tone_key = $3
      limit 1
    `,
    [userId, normalizedProfile, normalizedToneKey]
  );
  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function createProject200Chat(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral", payload = {}) {
  await ensureProject200ChatsSchema();
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  const title = String(payload.title || "Conversas").trim() || "Conversas";
  const summary = String(payload.summary || "").trim();
  const messages = normalizeMessages(payload.messages || []);
  const result = await query(
    `
      insert into project200_chats (
        user_id, assigned_profile, tone_key, title, summary, messages, unread_count, notification_permission, auto_meta, created_at, updated_at, last_message_at
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, 0, 'default', '{}'::jsonb, now(), now(), null)
      on conflict (user_id, assigned_profile, tone_key) do update
        set title = case
              when coalesce(project200_chats.messages, '[]'::jsonb) = '[]'::jsonb then excluded.title
              else project200_chats.title
            end,
            summary = case
              when coalesce(project200_chats.messages, '[]'::jsonb) = '[]'::jsonb then excluded.summary
              else project200_chats.summary
            end,
            updated_at = now()
      returning id, user_id, assigned_profile, tone_key, title, summary, created_at, updated_at, last_message_at, messages, unread_count, notification_permission, auto_meta
    `,
    [userId, normalizedProfile, normalizedToneKey, title.slice(0, 120), summary.slice(0, 2000), JSON.stringify(messages)]
  );
  return normalizeChat(result.rows[0]);
}

export async function updateProject200Chat(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral", patch = {}) {
  await ensureProject200ChatsSchema();
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  const current = await getProject200Chat(userId, normalizedProfile, normalizedToneKey);
  if (!current) {
    return createProject200Chat(userId, normalizedProfile, normalizedToneKey, patch);
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
  const nextUnreadCount = Number.isFinite(Number(patch.unreadCount))
    ? Math.max(0, Math.trunc(Number(patch.unreadCount) || 0))
    : Math.max(0, Number(current.unreadCount || 0));
  const nextNotificationPermission = typeof patch.notificationPermission === "string" && patch.notificationPermission.trim()
    ? patch.notificationPermission.trim()
    : current.notificationPermission || "default";
  const nextAutoMeta = patch.autoMeta && typeof patch.autoMeta === "object"
    ? patch.autoMeta
    : current.autoMeta || {};

  const result = await query(
    `
      update project200_chats
      set title = $3,
          summary = $4,
          messages = $5::jsonb,
          last_message_at = $6::timestamptz,
          unread_count = $7,
          notification_permission = $8,
          auto_meta = $9::jsonb,
          updated_at = now()
      where user_id = $1
        and assigned_profile = $2
        and tone_key = $10
      returning id, user_id, assigned_profile, tone_key, title, summary, created_at, updated_at, last_message_at, messages, unread_count, notification_permission, auto_meta
    `,
    [userId, normalizedProfile, nextTitle, nextSummary, JSON.stringify(nextMessages), nextLastMessageAt, nextUnreadCount, nextNotificationPermission, JSON.stringify(nextAutoMeta || {}), normalizedToneKey]
  );

  return result.rows[0] ? normalizeChat(result.rows[0]) : null;
}

export async function appendProject200ChatMessages(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral", entries = [], patch = {}) {
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  const current = await getProject200Chat(userId, normalizedProfile, normalizedToneKey);
  const existingMessages = current?.messages || [];
  const nextMessages = [...existingMessages, ...normalizeMessages(entries)];
  const unreadIncrement = Math.max(0, Math.trunc(Number(patch.unreadIncrement) || 0));
  const unreadCount = Math.max(0, Number(current?.unreadCount || 0) + unreadIncrement);

  return updateProject200Chat(userId, normalizedProfile, normalizedToneKey, {
    title: patch.title,
    summary: patch.summary,
    messages: nextMessages,
    lastMessageAt: patch.lastMessageAt || new Date().toISOString(),
    unreadCount,
    autoMeta: patch.autoMeta,
    notificationPermission: patch.notificationPermission
  });
}

export async function markProject200ChatRead(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral") {
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  return updateProject200Chat(userId, normalizedProfile, normalizedToneKey, {
    unreadCount: 0
  });
}

export async function saveProject200ChatNotificationPermission(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, toneKey = "neutral", permission = "default") {
  const normalizedProfile = normalizeChatProfileName(profileName);
  const normalizedToneKey = normalizeChatToneKey(toneKey);
  const safePermission = typeof permission === "string" && permission.trim() ? permission.trim().slice(0, 24) : "default";
  return updateProject200Chat(userId, normalizedProfile, normalizedToneKey, {
    notificationPermission: safePermission
  });
}
