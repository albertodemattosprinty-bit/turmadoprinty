import { query } from "./db.js";
import { PROJECT200_DEFAULT_PROFILE_NAME, normalizeStoredProject200ProfileName, resolveProject200ProfileName } from "./project200-profiles.js";

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

export async function ensureProject200HistorySchema() {
  await query(`
    create table if not exists project_200_history_entries (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      entry_type text not null,
      event_type text,
      assignee text,
      task_title text,
      speaker text,
      title text,
      body_text text,
      percent integer,
      pending_count integer,
      late_start_minutes integer,
      scope_date text,
      occurred_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
  `);
  await query("alter table project_200_history_entries add column if not exists late_start_minutes integer;");
  await query("create index if not exists idx_project_200_history_user_time on project_200_history_entries(user_id, occurred_at desc);");
  await query("create index if not exists idx_project_200_history_user_type on project_200_history_entries(user_id, entry_type);");
}

function normalizeSystemEntry(row) {
  return {
    id: row.id,
    type: row.event_type || "start",
    assignee: normalizeStoredProject200ProfileName(row.assignee),
    taskTitle: row.task_title || "",
    occurredAt: toIso(row.occurred_at) || toIso(row.created_at),
    percent: Number(row.percent || 0),
    pendingCount: Number(row.pending_count || 0),
    lateStartMinutes: Number(row.late_start_minutes || 0),
    scopeDate: row.scope_date || null
  };
}

function normalizeTextEntry(row) {
  return {
    id: row.id,
    speaker: normalizeStoredProject200ProfileName(row.speaker),
    title: row.title || "Texto novo",
    text: row.body_text || "",
    createdAt: toIso(row.occurred_at) || toIso(row.created_at)
  };
}

export async function getProject200HistorySpan(userId) {
  await ensureProject200HistorySchema();
  const result = await query(`
    select min(occurred_at) as first_occurred_at
    from project_200_history_entries
    where user_id = $1
  `, [userId]);
  const firstOccurredAt = toIso(result.rows[0]?.first_occurred_at);
  const now = new Date();
  const first = firstOccurredAt ? new Date(firstOccurredAt) : now;
  const elapsedDays = Math.floor((now.getTime() - first.getTime()) / 86400000) + 1;
  return {
    firstOccurredAt,
    maxDays: Math.max(1, elapsedDays)
  };
}
export async function listProject200History(userId, { from, to }) {
  await ensureProject200HistorySchema();
  const result = await query(
    `
      select *
      from project_200_history_entries
      where user_id = $1
        and ($2::timestamptz is null or occurred_at >= $2::timestamptz)
        and ($3::timestamptz is null or occurred_at < $3::timestamptz)
      order by occurred_at desc, created_at desc
      limit 1000
    `,
    [userId, from || null, to || null]
  );

  const systemEvents = [];
  const texts = [];
  for (const row of result.rows) {
    if (String(row.entry_type || "").toUpperCase() === "SYSTEM") {
      systemEvents.push(normalizeSystemEntry(row));
    } else if (String(row.entry_type || "").toUpperCase() === "TEXT") {
      texts.push(normalizeTextEntry(row));
    }
  }
  return { systemEvents, texts };
}

export async function createProject200SystemEvent(userId, payload) {
  await ensureProject200HistorySchema();
  const eventType = String(payload?.type || "start").trim().toLowerCase();
  const assignee = await resolveProject200ProfileName(userId, String(payload?.assignee || PROJECT200_DEFAULT_PROFILE_NAME).trim(), { fallbackToDefault: true });
  const taskTitle = String(payload?.taskTitle || "").trim();
  const occurredAt = toIso(payload?.occurredAt) || new Date().toISOString();
  const scopeDate = String(payload?.scopeDate || "").trim() || null;
  const percent = Number.isFinite(Number(payload?.percent)) ? Number(payload.percent) : 0;
  const pendingCount = Number.isFinite(Number(payload?.pendingCount)) ? Number(payload.pendingCount) : 0;
  const lateStartMinutes = Number.isFinite(Number(payload?.lateStartMinutes)) ? Number(payload.lateStartMinutes) : 0;

  if (scopeDate && (eventType === "star" || eventType === "day_close")) {
    const dedupe = await query(
      `
        select id
        from project_200_history_entries
        where user_id = $1
          and entry_type = 'SYSTEM'
          and event_type = $2
          and coalesce(scope_date, '') = $3
          and coalesce(assignee, '') = $4
        limit 1
      `,
      [userId, eventType, scopeDate, assignee]
    );
    if (dedupe.rows[0]) {
      return { id: dedupe.rows[0].id, type: eventType, assignee, taskTitle, occurredAt, percent, pendingCount, scopeDate };
    }
  }

  const result = await query(
    `
      insert into project_200_history_entries (
        user_id, entry_type, event_type, assignee, task_title, percent, pending_count, late_start_minutes, scope_date, occurred_at
      )
      values ($1, 'SYSTEM', $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
      returning *
    `,
    [userId, eventType, assignee, taskTitle, percent, pendingCount, lateStartMinutes, scopeDate, occurredAt]
  );

  return normalizeSystemEntry(result.rows[0]);
}

export async function createProject200TextEntry(userId, payload) {
  await ensureProject200HistorySchema();
  const speaker = await resolveProject200ProfileName(userId, String(payload?.speaker || PROJECT200_DEFAULT_PROFILE_NAME).trim(), { fallbackToDefault: true });
  const title = String(payload?.title || "Texto novo").trim() || "Texto novo";
  const text = String(payload?.text || "").trim();
  const occurredAt = toIso(payload?.createdAt) || new Date().toISOString();

  if (!text) {
    throw new Error("Texto vazio.");
  }

  const result = await query(
    `
      insert into project_200_history_entries (
        user_id, entry_type, speaker, title, body_text, occurred_at
      )
      values ($1, 'TEXT', $2, $3, $4, $5::timestamptz)
      returning *
    `,
    [userId, speaker, title.slice(0, 120), text.slice(0, 2000), occurredAt]
  );

  return normalizeTextEntry(result.rows[0]);
}
