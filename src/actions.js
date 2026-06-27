import crypto from "node:crypto";

import { query } from "./db.js";
import { PROJECT200_DEFAULT_PROFILE_NAME, resolveProject200ProfileName } from "./project200-profiles.js";

const MAX_OCCURRENCES = 370;
const ACTION_STATUS_PENDING = "PENDING";
const ACTION_STATUS_IN_PROGRESS = "IN_PROGRESS";
const ACTION_STATUS_COMPLETED = "COMPLETED";
const DEFAULT_ASSIGNEE = PROJECT200_DEFAULT_PROFILE_NAME;
const DEFAULT_CATEGORY_ID = "";

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
  if (input.localeCompare("Geral", "pt-BR", { sensitivity: "accent" }) === 0) {
    return DEFAULT_ASSIGNEE;
  }
  return input;
}

function normalizeCategoryId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return DEFAULT_CATEGORY_ID;
  return raw.replace(/[^a-z0-9_]/g, "");
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
  const startAtIso = toIso(row.start_at);
  const startedAtIso = toIso(row.status_started_at);
  const lateStartMinutes = startAtIso && startedAtIso
    ? Math.max(0, Math.round((new Date(startedAtIso).getTime() - new Date(startAtIso).getTime()) / (60 * 1000)))
    : 0;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    assignee: normalizeAssignee(row.assignee),
    categoryId: normalizeCategoryId(row.category_id),
    musicDefaultMode: String(row.music_default_mode || "").trim() === "station" ? "station" : "track",
    musicStationName: String(row.music_station_name || "").trim(),
    musicTrackName: String(row.music_track_name || "").trim(),
    musicTrackUrl: String(row.music_track_url || "").trim(),
    startAt: startAtIso,
    endAt: toIso(row.end_at),
    repeatGroupId: row.repeat_group_id || null,
    repeatRule: row.repeat_rule || "none",
    repeatDays: Array.isArray(row.repeat_days) ? row.repeat_days : [],
    status: normalizeActionStatus(row.status_override),
    startedAt: toIso(row.status_started_at),
    completedAt: toIso(row.status_completed_at),
    statusUpdatedAt: toIso(row.status_updated_at),
    createdAt: toIso(row.created_at),
    lateStartMinutes
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
      music_default_mode text not null default 'track',
      music_station_name text,
      music_track_name text,
      music_track_url text,
      start_at timestamptz not null,
      end_at timestamptz not null,
      repeat_group_id uuid,
      repeat_rule text not null default 'none',
      repeat_days jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    );
  `);
  await query("alter table actions add column if not exists music_station_name text;");
  await query("alter table actions add column if not exists music_track_name text;");
  await query("alter table actions add column if not exists music_track_url text;");
  await query("alter table actions add column if not exists music_default_mode text not null default 'track';");
  await query(`alter table actions add column if not exists assignee text not null default '${DEFAULT_ASSIGNEE}';`);
  await query("alter table actions add column if not exists category_id text not null default '';");

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

  await query(`
    create table if not exists project200_runtime_state (
      user_id uuid primary key references users(id) on delete cascade,
      action_id uuid,
      action_title text,
      event_type text not null,
      started_at timestamptz,
      occurred_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("create index if not exists idx_project200_runtime_state_user_time on project200_runtime_state(user_id, updated_at desc);");
}

function normalizeRuntimeState(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    actionId: row.action_id || null,
    actionTitle: row.action_title || null,
    eventType: row.event_type || "start",
    startedAt: toIso(row.started_at),
    occurredAt: toIso(row.occurred_at) || toIso(row.updated_at)
  };
}

export async function upsertProject200RuntimeState(userId, payload = {}) {
  await ensureActionsSchema();
  const actionId = String(payload?.actionId || "").trim() || null;
  const actionTitle = String(payload?.actionTitle || "").trim() || null;
  const eventType = String(payload?.eventType || "start").trim().toLowerCase() || "start";
  const startedAt = toIso(payload?.startedAt);
  const occurredAt = toIso(payload?.occurredAt) || new Date().toISOString();

  const result = await query(
    `
      insert into project200_runtime_state (
        user_id, action_id, action_title, event_type, started_at, occurred_at
      )
      values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
      on conflict (user_id) do update
        set action_id = excluded.action_id,
            action_title = excluded.action_title,
            event_type = excluded.event_type,
            started_at = excluded.started_at,
            occurred_at = excluded.occurred_at,
            updated_at = now()
      returning *
    `,
    [userId, actionId, actionTitle, eventType, startedAt, occurredAt]
  );

  return normalizeRuntimeState(result.rows[0]);
}

export async function getProject200RuntimeState(userId) {
  await ensureActionsSchema();
  const result = await query(
    `select * from project200_runtime_state where user_id = $1 limit 1`,
    [userId]
  );
  return normalizeRuntimeState(result.rows[0]);
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
        a.music_default_mode,
        a.music_station_name,
        a.music_track_name,
        a.music_track_url,
        a.assignee,
        a.category_id,
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
        a.music_default_mode,
        a.music_station_name,
        a.music_track_name,
        a.music_track_url,
        a.assignee,
        a.category_id,
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
  const assignee = await resolveProject200ProfileName(userId, normalizeAssignee(payload?.assignee), { fallbackToDefault: true });
  const categoryId = normalizeCategoryId(payload?.categoryId);
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
    const offset = index * 9;
    values.push(
      userId,
      title,
      assignee,
      categoryId,
      occurrence.startAt.toISOString(),
      occurrence.endAt.toISOString(),
      repeatGroupId,
      repeatRule,
      JSON.stringify(repeatDays)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}::jsonb)`;
  });

  const result = await query(
    `
      insert into actions (user_id, title, assignee, category_id, start_at, end_at, repeat_group_id, repeat_rule, repeat_days)
      values ${placeholders.join(", ")}
      returning id, user_id, title, assignee, category_id, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, created_at
    `,
    values
  );

  return result.rows.map(normalizeAction);
}

async function assertActionOverlaps(userId, assignee, occurrences, excludeIds = []) {
  const safeExcludeIds = Array.isArray(excludeIds)
    ? excludeIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  for (const occurrence of occurrences) {
    const overlap = await query(
      `
        select id, title, start_at, end_at
        from actions
        where user_id = $1
          and assignee = $2
          and start_at < $4
          and end_at > $3
          and not (id = any($5::uuid[]))
        limit 1
      `,
      [userId, assignee, occurrence.startAt.toISOString(), occurrence.endAt.toISOString(), safeExcludeIds]
    );

    if (overlap.rows[0]) {
      const busy = normalizeAction(overlap.rows[0]);
      throw new Error(`Horario indisponivel por sobrepor "${busy.title}".`);
    }
  }
}

function parseActionOccurrences(payload) {
  const rawOccurrences = Array.isArray(payload?.occurrences) && payload.occurrences.length
    ? payload.occurrences
    : [{ startAt: payload?.startAt, endAt: payload?.endAt }];
  if (rawOccurrences.length > MAX_OCCURRENCES) {
    throw new Error("Limite de recorrencias excedido.");
  }
  return rawOccurrences.map((occurrence) => {
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
}

export async function setActionMusicDefaultByTitle(userId, title, payload = {}) {
  await ensureActionsSchema();

  const safeTitle = String(title || "").trim();
  const defaultMode = String(payload?.mode || "").trim().toLowerCase() === "station" ? "station" : "track";
  const stationName = String(payload?.stationName || "").trim() || null;
  const trackName = String(payload?.trackName || "").trim() || null;
  const trackUrl = String(payload?.trackUrl || "").trim() || null;

  if (!safeTitle || !stationName || (defaultMode === "track" && !trackUrl)) {
    return 0;
  }

  const result = await query(
    `
      update actions
         set music_default_mode = $3,
             music_station_name = $4,
             music_track_name = $5,
             music_track_url = $6
       where user_id = $1
         and title = $2
    `,
    [userId, safeTitle, defaultMode, stationName, trackName, trackUrl]
  );

  return Number(result.rowCount || 0);
}

export async function updateUserAction(userId, actionId, payload) {
  await ensureActionsSchema();

  const action = await getUserActionById(userId, actionId);
  if (!action) {
    throw new Error("Tarefa nao encontrada.");
  }

  const title = String(payload?.title || "").trim();
  const assignee = await resolveProject200ProfileName(userId, normalizeAssignee(payload?.assignee), { fallbackToDefault: true });
  const categoryId = normalizeCategoryId(payload?.categoryId || action?.categoryId);
  const repeatRule = String(payload?.repeatRule || "none").trim() || "none";
  const repeatDays = normalizeRepeatDays(payload?.repeatDays);
  const applyTo = String(payload?.applyTo || "").trim().toLowerCase() === "series" ? "series" : "single";
  const occurrences = parseActionOccurrences(payload);

  if (title.length < 2) {
    throw new Error("Titulo da tarefa invalido.");
  }
  const isSeriesUpdate = applyTo === "series" && (action.repeatGroupId || repeatRule !== "none" || occurrences.length > 1);

  if (isSeriesUpdate) {
    const seriesRows = action.repeatGroupId
      ? await query("select id from actions where user_id = $1 and repeat_group_id = $2", [userId, action.repeatGroupId])
      : await query("select id from actions where user_id = $1 and id = $2", [userId, action.id]);
    const existingIds = seriesRows.rows.map((row) => String(row.id || "").trim()).filter(Boolean);
    await assertActionOverlaps(userId, assignee, occurrences, existingIds);
    if (existingIds.length) {
      await query("delete from action_status_overrides where user_id = $1 and action_id = any($2::uuid[])", [userId, existingIds]);
      await query("delete from actions where user_id = $1 and id = any($2::uuid[])", [userId, existingIds]);
    }
    const created = await createUserAction(userId, {
      title,
      assignee,
      categoryId,
      repeatRule,
      repeatDays,
      occurrences
    });
    const preferred = created.find((item) => item.startAt === action.startAt) || created[0] || null;
    return preferred;
  }

  const occurrence = occurrences[0];
  await assertActionOverlaps(userId, assignee, [occurrence], [action.id]);

  const detachFromSeries = Boolean(action.repeatGroupId);
  const nextRepeatGroupId = detachFromSeries ? null : action.repeatGroupId;
  const nextRepeatRule = detachFromSeries ? "none" : repeatRule;
  const nextRepeatDays = detachFromSeries ? [] : repeatDays;

  const result = await query(
    `
      update actions
      set title = $3,
          assignee = $4,
          category_id = $5,
          start_at = $6::timestamptz,
          end_at = $7::timestamptz,
          repeat_group_id = $8,
          repeat_rule = $9,
          repeat_days = $10::jsonb
      where user_id = $1
        and id = $2
      returning id
    `,
    [
      userId,
      action.id,
      title,
      assignee,
      categoryId,
      occurrence.startAt.toISOString(),
      occurrence.endAt.toISOString(),
      nextRepeatGroupId,
      nextRepeatRule,
      JSON.stringify(nextRepeatDays)
    ]
  );

  if (!result.rows[0]) {
    throw new Error("Tarefa nao encontrada.");
  }

  if (detachFromSeries) {
    await query(
      `
        update action_status_overrides
           set repeat_group_id = null,
               updated_at = now()
         where user_id = $1
           and action_id = $2
      `,
      [userId, action.id]
    );
  }

  return getUserActionById(userId, action.id);
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
    const inProgressConflict = await query(
      `
        select a.id, a.assignee, a.title
        from actions a
        join action_status_overrides o
          on o.user_id = a.user_id
         and o.action_id = a.id
        where a.user_id = $1
          and a.id <> $2
          and coalesce(upper(o.status), 'PENDING') = 'IN_PROGRESS'
          and lower(trim(coalesce(a.assignee, ''))) = lower(trim(coalesce($3, '')))
        limit 1
      `,
      [userId, action.id, action.assignee]
    );

    if (inProgressConflict.rows[0]) {
      throw new Error("Voce ja esta em outra tarefa.");
    }

    startedAt = startedAt || nowIso;
    completedAt = null;
    await upsertProject200RuntimeState(userId, {
      actionId: action.id,
      actionTitle: action.title,
      eventType: "start",
      startedAt,
      occurredAt: nowIso
    });
  } else if (nextStatus === ACTION_STATUS_COMPLETED) {
    startedAt = startedAt || nowIso;
    completedAt = completedAt || nowIso;
    await upsertProject200RuntimeState(userId, {
      actionId: action.id,
      actionTitle: action.title,
      eventType: "complete",
      startedAt,
      occurredAt: nowIso
    });
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

function isSameLocalDay(aIso, bIso) {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export async function updateUserActionStatusManual(userId, actionId, payload = {}) {
  await ensureActionsSchema();

  const action = await getUserActionById(userId, actionId);
  if (!action) {
    throw new Error("Tarefa nao encontrada.");
  }

  const mode = String(payload?.mode || "").trim().toLowerCase();
  if (mode === "restore") {
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
        values ($1, $2, $3, $4, null, null)
        on conflict (user_id, action_id) do update
          set status = excluded.status,
              started_at = null,
              completed_at = null,
              updated_at = now()
      `,
      [userId, action.id, action.repeatGroupId, ACTION_STATUS_PENDING]
    );
    await upsertProject200RuntimeState(userId, {
      actionId: action.id,
      actionTitle: action.title,
      eventType: "abort",
      startedAt: null,
      occurredAt: new Date().toISOString()
    });
    return getUserActionById(userId, action.id);
  }

  if (mode === "manual_complete") {
    const startedAtRaw = parseDate(payload?.startedAt, "Horario inicial manual");
    const completedAtRaw = parseDate(payload?.completedAt, "Horario final manual");
    if (completedAtRaw <= startedAtRaw) {
      throw new Error("O horario final precisa ser depois do inicial.");
    }

    let startedAt = startedAtRaw.toISOString();
    const completedAt = completedAtRaw.toISOString();
    const shouldAdjustDelay = isSameLocalDay(action.startAt, new Date().toISOString());
    if (!shouldAdjustDelay) {
      startedAt = action.startedAt || action.startAt;
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
          set status = excluded.status,
              started_at = excluded.started_at,
              completed_at = excluded.completed_at,
              updated_at = now()
      `,
      [userId, action.id, action.repeatGroupId, ACTION_STATUS_COMPLETED, startedAt, completedAt]
    );
    await upsertProject200RuntimeState(userId, {
      actionId: action.id,
      actionTitle: action.title,
      eventType: "complete",
      startedAt,
      occurredAt: completedAt
    });
    return getUserActionById(userId, action.id);
  }

  throw new Error("Modo manual invalido.");
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
    await query(
      "delete from action_status_overrides where user_id = $1 and repeat_group_id = $2",
      [userId, action.repeat_group_id]
    );
    const deletedGroup = await query(
      "delete from actions where user_id = $1 and repeat_group_id = $2",
      [userId, action.repeat_group_id]
    );

    return { deleted: deletedGroup.rowCount || 0 };
  }

  await query("delete from action_status_overrides where user_id = $1 and action_id = $2", [userId, action.id]);
  const deletedSingle = await query(
    "delete from actions where user_id = $1 and id = $2",
    [userId, action.id]
  );

  return { deleted: deletedSingle.rowCount || 0 };
}
