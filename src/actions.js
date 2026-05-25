import crypto from "node:crypto";

import { query } from "./db.js";

const MAX_OCCURRENCES = 370;
const ACTION_STATUS_PENDING = "PENDING";
const ACTION_STATUS_IN_PROGRESS = "IN_PROGRESS";
const ACTION_STATUS_COMPLETED = "COMPLETED";
const DEFAULT_ASSIGNEE = "Geral";
const ALLOWED_ASSIGNEES = new Set(["Rose", "Geral", "Alberto", "Lucas", "Thainan", "Wilton"]);

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeActionStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === ACTION_STATUS_IN_PROGRESS) {
    return ACTION_STATUS_IN_PROGRESS;
  }

  if (normalized === ACTION_STATUS_COMPLETED) {
    return ACTION_STATUS_COMPLETED;
  }

  return ACTION_STATUS_PENDING;
}

function normalizeAssignee(value) {
  const input = String(value || "").trim();

  if (!input) {
    return DEFAULT_ASSIGNEE;
  }

  for (const name of ALLOWED_ASSIGNEES) {
    if (name.toLowerCase() === input.toLowerCase()) {
      return name;
    }
  }

  throw new Error("Pessoa da tarefa invalida.");
}

function getNextActionStatus(currentStatus) {
  const normalized = normalizeActionStatus(currentStatus);

  if (normalized === ACTION_STATUS_PENDING) {
    return ACTION_STATUS_IN_PROGRESS;
  }

  if (normalized === ACTION_STATUS_IN_PROGRESS) {
    return ACTION_STATUS_COMPLETED;
  }

  return ACTION_STATUS_COMPLETED;
}

function normalizeAction(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    assignee: normalizeAssignee(row.assignee),
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    repeatGroupId: row.repeat_group_id || null,
    repeatRule: row.repeat_rule || "none",
    repeatDays: Array.isArray(row.repeat_days) ? row.repeat_days : [],
    status: normalizeActionStatus(row.status_override),
    startedAt: toIso(row.status_started_at),
    completedAt: toIso(row.status_completed_at),
    statusUpdatedAt: toIso(row.status_updated_at),
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
  await query(`alter table actions add column if not exists assignee text not null default '${DEFAULT_ASSIGNEE}';`);

  await query("create index if not exists idx_actions_user_time on actions(user_id, start_at, end_at);");
  await query("create index if not exists idx_actions_repeat_group on actions(user_id, repeat_group_id);");
  await query("create index if not exists idx_actions_user_assignee on actions(user_id, assignee);");

  await query(`
    create table if not exists action_status_overrides (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      action_id uuid not null,
      repeat_group_id uuid,
      status text not null default 'PENDING',
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, action_id)
    );
  `);
  await query("create index if not exists idx_action_status_overrides_repeat_group on action_status_overrides(user_id, repeat_group_id);");
  await query("create index if not exists idx_action_status_overrides_status on action_status_overrides(user_id, status);");
}

async function getUserActionById(userId, actionId) {
  const trimmedActionId = String(actionId || "").trim();

  if (!trimmedActionId) {
    return null;
  }

  const result = await query(
    `
      select
        a.id,
        a.user_id,
        a.title,
        a.assignee,
        a.start_at,
        a.end_at,
        a.repeat_group_id,
        a.repeat_rule,
        a.repeat_days,
        a.created_at,
        o.status as status_override,
        o.started_at as status_started_at,
        o.completed_at as status_completed_at,
        o.updated_at as status_updated_at
      from actions a
      left join action_status_overrides o
        on o.user_id = a.user_id
       and o.action_id = a.id
      where a.user_id = $1
        and a.id = $2
      limit 1
    `,
    [userId, trimmedActionId]
  );

  return result.rows[0] ? normalizeAction(result.rows[0]) : null;
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
      select
        a.id,
        a.user_id,
        a.title,
        a.assignee,
        a.start_at,
        a.end_at,
        a.repeat_group_id,
        a.repeat_rule,
        a.repeat_days,
        a.created_at,
        o.status as status_override,
        o.started_at as status_started_at,
        o.completed_at as status_completed_at,
        o.updated_at as status_updated_at
      from actions a
      left join action_status_overrides o
        on o.user_id = a.user_id
       and o.action_id = a.id
      where a.user_id = $1
        and a.start_at < $3
        and a.end_at > $2
      order by a.start_at asc, a.created_at asc
    `,
    [userId, fromDate.toISOString(), toDate.toISOString()]
  );

  return result.rows.map(normalizeAction);
}

export async function createUserAction(userId, payload) {
  await ensureActionsSchema();

  const title = String(payload?.title || "").trim();
  const assignee = normalizeAssignee(payload?.assignee);
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
  const occurrences = rawOccurrences.map((occurrence) => {
    const startAt = parseDate(occurrence?.startAt, "Horario inicial");
    const endAt = parseDate(occurrence?.endAt, "Horario final");
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
          and assignee = $2
          and start_at < $4
          and end_at > $3
        limit 1
      `,
      [userId, assignee, occurrence.startAt.toISOString(), occurrence.endAt.toISOString()]
    );

    if (overlap.rows[0]) {
      const busy = normalizeAction(overlap.rows[0]);
      throw new Error(`Horario indisponivel por sobrepor "${busy.title}".`);
    }
  }

  const repeatGroupId = occurrences.length > 1 || repeatRule !== "none" ? crypto.randomUUID() : null;
  const values = [];
  const placeholders = occurrences.map((occurrence, index) => {
    const offset = index * 8;
    values.push(
      userId,
      title,
      assignee,
      occurrence.startAt.toISOString(),
      occurrence.endAt.toISOString(),
      repeatGroupId,
      repeatRule,
      JSON.stringify(repeatDays)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}::jsonb)`;
  });

  const result = await query(
    `
      insert into actions (user_id, title, assignee, start_at, end_at, repeat_group_id, repeat_rule, repeat_days)
      values ${placeholders.join(", ")}
      returning id, user_id, title, assignee, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, created_at
    `,
    values
  );

  return result.rows.map(normalizeAction);
}

export async function updateUserActionStatus(userId, actionId) {
  await ensureActionsSchema();

  const action = await getUserActionById(userId, actionId);

  if (!action) {
    throw new Error("Tarefa nao encontrada.");
  }

  const nextStatus = getNextActionStatus(action.status);

  if (action.status === ACTION_STATUS_COMPLETED && nextStatus === ACTION_STATUS_COMPLETED) {
    return action;
  }

  const nowIso = new Date().toISOString();
  let startedAt = action.startedAt;
  let completedAt = action.completedAt;

  if (nextStatus === ACTION_STATUS_IN_PROGRESS) {
    startedAt = startedAt || nowIso;
    completedAt = null;
  } else if (nextStatus === ACTION_STATUS_COMPLETED) {
    startedAt = startedAt || nowIso;
    completedAt = completedAt || nowIso;
  }

  await query(
    `
      insert into action_status_overrides (
        user_id,
        action_id,
        repeat_group_id,
        status,
        started_at,
        completed_at
      )
      values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
      on conflict (user_id, action_id) do update
        set repeat_group_id = excluded.repeat_group_id,
            status = excluded.status,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            updated_at = now()
    `,
    [
      userId,
      action.id,
      action.repeatGroupId,
      nextStatus,
      startedAt || null,
      completedAt || null
    ]
  );

  return getUserActionById(userId, action.id);
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
