import crypto from "node:crypto";

import { query } from "./db.js";

const MAX_OCCURRENCES = 370;

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeAction(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    repeatGroupId: row.repeat_group_id || null,
    repeatRule: row.repeat_rule || "none",
    repeatDays: Array.isArray(row.repeat_days) ? row.repeat_days : [],
    createdAt: toIso(row.created_at)
  };
}

function parseDate(value, label) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} invalido.`);
  }

  return date;
}

function normalizeRepeatDays(days) {
  if (!Array.isArray(days)) {
    return [];
  }

  return [...new Set(days
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b);
}

export async function ensureActionsSchema() {
  await query(`
    create table if not exists actions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      start_at timestamptz not null,
      end_at timestamptz not null,
      repeat_group_id uuid,
      repeat_rule text not null default 'none',
      repeat_days jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    );
  `);

  await query("create index if not exists idx_actions_user_time on actions(user_id, start_at, end_at);");
  await query("create index if not exists idx_actions_repeat_group on actions(user_id, repeat_group_id);");
}

export async function listUserActions(userId, { from, to }) {
  await ensureActionsSchema();

  const fromDate = parseDate(from, "Data inicial");
  const toDate = parseDate(to, "Data final");

  if (toDate <= fromDate) {
    throw new Error("Intervalo de datas invalido.");
  }

  const result = await query(
    `
      select id, user_id, title, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, created_at
      from actions
      where user_id = $1
        and start_at < $3
        and end_at > $2
      order by start_at asc, created_at asc
    `,
    [userId, fromDate.toISOString(), toDate.toISOString()]
  );

  return result.rows.map(normalizeAction);
}

export async function createUserAction(userId, payload) {
  await ensureActionsSchema();

  const title = String(payload?.title || "").trim();
  const repeatRule = String(payload?.repeatRule || "none").trim() || "none";
  const repeatDays = normalizeRepeatDays(payload?.repeatDays);
  const rawOccurrences = Array.isArray(payload?.occurrences) && payload.occurrences.length
    ? payload.occurrences
    : [{ startAt: payload?.startAt, endAt: payload?.endAt }];

  if (title.length < 2) {
    throw new Error("Titulo da tarefa invalido.");
  }

  if (rawOccurrences.length > MAX_OCCURRENCES) {
    throw new Error("Limite de recorrencias excedido.");
  }

  const now = new Date();
  const occurrences = rawOccurrences.map((occurrence) => {
    const startAt = parseDate(occurrence?.startAt, "Horario inicial");
    const endAt = parseDate(occurrence?.endAt, "Horario final");

    if (startAt < now) {
      throw new Error("Nao e possivel criar tarefas antes da data e hora atuais.");
    }

    if (endAt <= startAt) {
      throw new Error("O horario final precisa ser depois do horario inicial.");
    }

    if (endAt.getTime() - startAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new Error("A tarefa nao pode passar de 24 horas.");
    }

    return { startAt, endAt };
  });

  for (const occurrence of occurrences) {
    const overlap = await query(
      `
        select title, start_at, end_at
        from actions
        where user_id = $1
          and start_at < $3
          and end_at > $2
        limit 1
      `,
      [userId, occurrence.startAt.toISOString(), occurrence.endAt.toISOString()]
    );

    if (overlap.rows[0]) {
      const busy = normalizeAction(overlap.rows[0]);
      throw new Error(`Horario indisponivel por sobrepor "${busy.title}".`);
    }
  }

  const repeatGroupId = occurrences.length > 1 || repeatRule !== "none" ? crypto.randomUUID() : null;
  const values = [];
  const placeholders = occurrences.map((occurrence, index) => {
    const offset = index * 7;
    values.push(
      userId,
      title,
      occurrence.startAt.toISOString(),
      occurrence.endAt.toISOString(),
      repeatGroupId,
      repeatRule,
      JSON.stringify(repeatDays)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}::jsonb)`;
  });

  const result = await query(
    `
      insert into actions (user_id, title, start_at, end_at, repeat_group_id, repeat_rule, repeat_days)
      values ${placeholders.join(", ")}
      returning id, user_id, title, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, created_at
    `,
    values
  );

  return result.rows.map(normalizeAction);
}

export async function deleteUserAction(userId, actionId) {
  await ensureActionsSchema();

  const current = await query(
    "select id, repeat_group_id from actions where user_id = $1 and id = $2 limit 1",
    [userId, String(actionId || "").trim()]
  );

  const action = current.rows[0];

  if (!action) {
    return { deleted: 0 };
  }

  if (action.repeat_group_id) {
    const deletedGroup = await query(
      "delete from actions where user_id = $1 and repeat_group_id = $2",
      [userId, action.repeat_group_id]
    );

    return { deleted: deletedGroup.rowCount || 0 };
  }

  const deletedSingle = await query(
    "delete from actions where user_id = $1 and id = $2",
    [userId, action.id]
  );

  return { deleted: deletedSingle.rowCount || 0 };
}
