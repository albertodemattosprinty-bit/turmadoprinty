import crypto from "node:crypto";

import { query } from "./db.js";
import { PROJECT200_DEFAULT_PROFILE_NAME, resolveProject200ProfileName } from "./project200-profiles.js";

const MAX_OCCURRENCES = 370;
const ACTION_STATUS_PENDING = "PENDING";
const ACTION_STATUS_IN_PROGRESS = "IN_PROGRESS";
const ACTION_STATUS_PAUSED = "PAUSED";
const ACTION_STATUS_COMPLETED = "COMPLETED";
const DEFAULT_ASSIGNEE = PROJECT200_DEFAULT_PROFILE_NAME;
const DEFAULT_CATEGORY_ID = "";
const QUICK_TASK_CATEGORY_ID = "quick_task";
const SLEEP_ACTION_CATEGORY_ID = "sono";
const ACTIONS_TIME_ZONE = "America/Sao_Paulo";

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

  if (normalized === ACTION_STATUS_PAUSED) {
    return ACTION_STATUS_PAUSED;
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
  if (raw === SLEEP_ACTION_CATEGORY_ID) return DEFAULT_CATEGORY_ID;
  return raw.replace(/[^a-z0-9_]/g, "");
}

function normalizeActionTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 160);
}

function toDateKey(value = new Date()) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTIONS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(safeDate);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function getNextActionStatus(currentStatus) {
  const normalized = normalizeActionStatus(currentStatus);

  if (normalized === ACTION_STATUS_PENDING) {
    return ACTION_STATUS_IN_PROGRESS;
  }

  if (normalized === ACTION_STATUS_IN_PROGRESS) {
    return ACTION_STATUS_COMPLETED;
  }

  if (normalized === ACTION_STATUS_PAUSED) {
    return ACTION_STATUS_IN_PROGRESS;
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
    svgIconUrl: String(row.svg_icon_url || "").trim(),
    svgIconLabel: String(row.svg_icon_label || "").trim(),
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
    completionPercent: normalizeActionStatus(row.status_override) === ACTION_STATUS_COMPLETED
      ? 100
      : Math.max(0, Math.min(100, Math.trunc(Number(row.completion_percent || 0) || 0))),
    accumulatedSeconds: Math.max(0, Math.trunc(Number(row.accumulated_seconds || 0) || 0)),
    createdAt: toIso(row.created_at),
    lateStartMinutes
  };
}

function createActionOverlapError(overlaps = []) {
  const safeOverlaps = (Array.isArray(overlaps) ? overlaps : []).filter(Boolean);
  const busyTitle = String(safeOverlaps[0]?.title || "outra tarefa").trim();
  const error = new Error(`Horario indisponivel por sobrepor "${busyTitle}".`);
  error.code = "ACTION_OVERLAP";
  error.overlaps = safeOverlaps;
  return error;
}

function getActionDurationMinutesFromRange(startAt, endAt) {
  const startMs = startAt instanceof Date ? startAt.getTime() : new Date(startAt).getTime();
  const endMs = endAt instanceof Date ? endAt.getTime() : new Date(endAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

function ceilDateToNextMinute(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data invalida.");
  }
  const next = new Date(date);
  if (next.getSeconds() > 0 || next.getMilliseconds() > 0) {
    next.setMinutes(next.getMinutes() + 1);
  }
  next.setSeconds(0, 0);
  return next;
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
  await query("alter table actions add column if not exists sleep_session_date date;");
  await query("alter table actions add column if not exists sleep_tracked_minutes integer not null default 0;");
  await query("alter table actions add column if not exists svg_icon_url text not null default '';");
  await query("alter table actions add column if not exists svg_icon_label text not null default '';");

  await query("create index if not exists idx_actions_user_time on actions(user_id, start_at, end_at);");
  await query("create index if not exists idx_actions_repeat_group on actions(user_id, repeat_group_id);");
  await query("create index if not exists idx_actions_user_assignee on actions(user_id, assignee);");
  await query("create index if not exists idx_actions_sleep_session on actions(user_id, assignee, sleep_session_date);");
  await query(`
    create table if not exists action_svg_defaults (
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      svg_icon_url text not null default '',
      svg_icon_label text not null default '',
      updated_at timestamptz not null default now(),
      primary key (user_id, title)
    );
  `);
  await query("create index if not exists idx_action_svg_defaults_user on action_svg_defaults(user_id, updated_at desc);");

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
  await query("alter table action_status_overrides add column if not exists completion_percent integer not null default 0;");
  await query("alter table action_status_overrides add column if not exists accumulated_seconds integer not null default 0;");
  await query("update action_status_overrides set completion_percent = 100 where upper(status) = 'COMPLETED' and completion_percent <> 100;");

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

async function getStoredActionSvgDefault(userId, title) {
  const safeTitle = normalizeActionTitle(title);
  if (!safeTitle) {
    return null;
  }
  const result = await query(
    `
      select svg_icon_url, svg_icon_label
      from action_svg_defaults
      where user_id = $1
        and title = $2
      limit 1
    `,
    [userId, safeTitle]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    svgIconUrl: String(row.svg_icon_url || "").trim(),
    svgIconLabel: String(row.svg_icon_label || "").trim()
  };
}

async function saveActionSvgDefault(userId, title, svgIconUrl = "", svgIconLabel = "") {
  const safeTitle = normalizeActionTitle(title);
  if (!safeTitle) {
    return;
  }
  await query(
    `
      insert into action_svg_defaults (user_id, title, svg_icon_url, svg_icon_label, updated_at)
      values ($1, $2, $3, $4, now())
      on conflict (user_id, title)
      do update
         set svg_icon_url = excluded.svg_icon_url,
             svg_icon_label = excluded.svg_icon_label,
             updated_at = now()
    `,
    [userId, safeTitle, String(svgIconUrl || "").trim(), String(svgIconLabel || "").trim()]
  );
}

async function applyActionSvgDefaultToMatchingActions(userId, title, svgIconUrl = "", svgIconLabel = "") {
  const safeTitle = normalizeActionTitle(title);
  if (!safeTitle) {
    return;
  }
  await query(
    `
      update actions
         set svg_icon_url = $3,
             svg_icon_label = $4
       where user_id = $1
         and title = $2
    `,
    [userId, safeTitle, String(svgIconUrl || "").trim(), String(svgIconLabel || "").trim()]
  );
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

export async function getUserActionById(userId, actionId) {
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
        a.svg_icon_url,
        a.svg_icon_label,
        a.start_at,
        a.end_at,
        a.repeat_group_id,
        a.repeat_rule,
        a.repeat_days,
        a.created_at,
        o.status as status_override,
        o.started_at as status_started_at,
        o.completed_at as status_completed_at,
        o.completion_percent,
        o.accumulated_seconds,
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

export async function updateUserActionSvgIcon(userId, actionId, payload = {}) {
  await ensureActionsSchema();
  const safeActionId = String(actionId || "").trim();
  if (!safeActionId) {
    throw new Error("Tarefa nao encontrada.");
  }
  const svgIconUrl = String(payload?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || "").trim();
  const result = await query(
    `
      update actions
         set svg_icon_url = $3,
             svg_icon_label = $4
       where user_id = $1
         and id = $2
       returning id
    `,
    [userId, safeActionId, svgIconUrl, svgIconLabel]
  );
  if (!result.rows[0]) {
    throw new Error("Tarefa nao encontrada.");
  }
  return getUserActionById(userId, safeActionId);
}

async function setActionCompletedAt(userId, action, completedAt) {
  const completedIso = completedAt instanceof Date ? completedAt.toISOString() : new Date(completedAt).toISOString();
  const startedIso = action?.startedAt || action?.startAt || completedIso;
  await query(
    `
      insert into action_status_overrides (
        user_id,
        action_id,
        repeat_group_id,
        status,
        started_at,
        completed_at,
        completion_percent,
        accumulated_seconds
      )
      values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, 100, $7)
      on conflict (user_id, action_id) do update
        set status = excluded.status,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            completion_percent = 100,
            accumulated_seconds = excluded.accumulated_seconds,
            updated_at = now()
    `,
    [userId, action.id, action.repeatGroupId, ACTION_STATUS_COMPLETED, startedIso, completedIso,
      Math.max(0, Math.round((new Date(action.endAt).getTime() - new Date(action.startAt).getTime()) / 1000))]
  );
  await upsertProject200RuntimeState(userId, {
    actionId: action.id,
    actionTitle: action.title,
    eventType: "complete",
    startedAt: startedIso,
    occurredAt: completedIso
  });
}

async function cloneActionOccurrence(userId, action, startAt, endAt) {
  if (!action?.id) {
    return;
  }
  await query(
    `
      insert into actions (
        user_id, title, music_default_mode, music_station_name, music_track_name, music_track_url,
        assignee, category_id, svg_icon_url, svg_icon_label, start_at, end_at, repeat_group_id, repeat_rule, repeat_days
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12::timestamptz, $13, $14, $15::jsonb)
    `,
    [
      userId,
      action.title,
      action.musicDefaultMode || "track",
      action.musicStationName || null,
      action.musicTrackName || null,
      action.musicTrackUrl || null,
      action.assignee,
      action.categoryId || "",
      action.svgIconUrl || "",
      action.svgIconLabel || "",
      startAt.toISOString(),
      endAt.toISOString(),
      action.repeatGroupId || null,
      action.repeatRule || "none",
      JSON.stringify(Array.isArray(action.repeatDays) ? action.repeatDays : [])
    ]
  );
}

async function resizeActionWindow(userId, action, startAt, endAt) {
  await query(
    `
      update actions
         set start_at = $3::timestamptz,
             end_at = $4::timestamptz
       where user_id = $1
         and id = $2
    `,
    [userId, action.id, startAt.toISOString(), endAt.toISOString()]
  );
}

async function deleteActionOccurrence(userId, actionId) {
  await query("delete from action_status_overrides where user_id = $1 and action_id = $2", [userId, actionId]);
  await query("delete from actions where user_id = $1 and id = $2", [userId, actionId]);
}

async function reshapeActionsForQuickTask(userId, assignee, rangeStartAt, rangeEndAt, excludeActionId = "") {
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
        a.svg_icon_url,
        a.svg_icon_label,
        a.start_at,
        a.end_at,
        a.repeat_group_id,
        a.repeat_rule,
        a.repeat_days,
        a.created_at,
        o.status as status_override,
        o.started_at as status_started_at,
        o.completed_at as status_completed_at,
        o.completion_percent,
        o.accumulated_seconds,
        o.updated_at as status_updated_at
      from actions a
      left join action_status_overrides o
        on o.user_id = a.user_id
       and o.action_id = a.id
      where a.user_id = $1
        and a.assignee = $2
        and a.start_at < $4
        and a.end_at > $3
        and ($5 = '' or a.id <> $5::uuid)
      order by a.start_at asc, a.created_at asc
    `,
    [userId, assignee, rangeStartAt.toISOString(), rangeEndAt.toISOString(), String(excludeActionId || "").trim()]
  );

  for (const row of result.rows) {
    const action = normalizeAction(row);
    const actionStartAt = parseDate(action.startAt, "Horario inicial");
    const actionEndAt = parseDate(action.endAt, "Horario final");
    const overlapStartsBefore = actionStartAt.getTime() < rangeStartAt.getTime();
    const overlapEndsAfter = actionEndAt.getTime() > rangeEndAt.getTime();

    if (overlapStartsBefore && overlapEndsAfter) {
      await cloneActionOccurrence(userId, action, rangeEndAt, actionEndAt);
      await resizeActionWindow(userId, action, actionStartAt, rangeStartAt);
      if (normalizeActionStatus(action.status) === ACTION_STATUS_IN_PROGRESS) {
        await setActionCompletedAt(userId, action, rangeStartAt);
      }
      continue;
    }

    if (overlapStartsBefore) {
      await resizeActionWindow(userId, action, actionStartAt, rangeStartAt);
      if (normalizeActionStatus(action.status) === ACTION_STATUS_IN_PROGRESS) {
        await setActionCompletedAt(userId, action, rangeStartAt);
      }
      continue;
    }

    if (overlapEndsAfter) {
      await resizeActionWindow(userId, action, rangeEndAt, actionEndAt);
      continue;
    }

    await deleteActionOccurrence(userId, action.id);
  }
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
        a.svg_icon_url,
        a.svg_icon_label,
        a.start_at,
        a.end_at,
        a.repeat_group_id,
        a.repeat_rule,
        a.repeat_days,
        a.created_at,
        o.status as status_override,
        o.started_at as status_started_at,
        o.completed_at as status_completed_at,
        o.completion_percent,
        o.accumulated_seconds,
        o.updated_at as status_updated_at
      from actions a
      left join action_status_overrides o
        on o.user_id = a.user_id
       and o.action_id = a.id
      where a.user_id = $1
        and lower(coalesce(a.category_id, '')) <> '${SLEEP_ACTION_CATEGORY_ID}'
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

  const title = normalizeActionTitle(payload?.title);
  const assignee = await resolveProject200ProfileName(userId, normalizeAssignee(payload?.assignee), { fallbackToDefault: true });
  const categoryId = normalizeCategoryId(payload?.categoryId);
  const storedSvgDefault = await getStoredActionSvgDefault(userId, title);
  const svgIconUrl = String(payload?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  const repeatRule = String(payload?.repeatRule || "none").trim() || "none";
  const repeatDays = normalizeRepeatDays(payload?.repeatDays);
  const replaceOverlaps = Boolean(payload?.replaceOverlaps);
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

  if (replaceOverlaps) {
    await deleteOverlappingActions(userId, assignee, occurrences);
  }

  for (const occurrence of occurrences) {
    const overlap = await query(
      `
        select id, user_id, title, assignee, start_at, end_at
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
      throw createActionOverlapError([busy]);
    }
  }

  const repeatGroupId = occurrences.length > 1 || repeatRule !== "none" ? crypto.randomUUID() : null;
  const values = [];
  const placeholders = occurrences.map((occurrence, index) => {
    const offset = index * 11;
    values.push(
      userId,
      title,
      assignee,
      categoryId,
      svgIconUrl,
      svgIconLabel,
      occurrence.startAt.toISOString(),
      occurrence.endAt.toISOString(),
      repeatGroupId,
      repeatRule,
      JSON.stringify(repeatDays)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}::jsonb)`;
  });

  const result = await query(
    `
      insert into actions (user_id, title, assignee, category_id, svg_icon_url, svg_icon_label, start_at, end_at, repeat_group_id, repeat_rule, repeat_days)
      values ${placeholders.join(", ")}
      returning id, user_id, title, assignee, category_id, svg_icon_url, svg_icon_label, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, created_at
    `,
    values
  );

  if (svgIconUrl) {
    await saveActionSvgDefault(userId, title, svgIconUrl, svgIconLabel);
  }

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
      throw createActionOverlapError([busy]);
    }
  }
}

async function deleteOverlappingActions(userId, assignee, occurrences, excludeIds = []) {
  const safeExcludeIds = Array.isArray(excludeIds)
    ? excludeIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const deleteIds = new Set();

  for (const occurrence of occurrences) {
    const overlap = await query(
      `
        select id
        from actions
        where user_id = $1
          and assignee = $2
          and start_at < $4
          and end_at > $3
          and not (id = any($5::uuid[]))
      `,
      [userId, assignee, occurrence.startAt.toISOString(), occurrence.endAt.toISOString(), safeExcludeIds]
    );
    overlap.rows.forEach((row) => {
      if (row?.id) {
        deleteIds.add(String(row.id));
      }
    });
  }

  const ids = Array.from(deleteIds);
  if (!ids.length) {
    return;
  }

  await query("delete from action_status_overrides where user_id = $1 and action_id = any($2::uuid[])", [userId, ids]);
  await query("delete from actions where user_id = $1 and id = any($2::uuid[])", [userId, ids]);
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

  const safeTitle = normalizeActionTitle(title);
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

  const title = normalizeActionTitle(payload?.title || action?.title);
  const assignee = await resolveProject200ProfileName(userId, normalizeAssignee(payload?.assignee), { fallbackToDefault: true });
  const categoryId = normalizeCategoryId(payload?.categoryId || action?.categoryId);
  const storedSvgDefault = await getStoredActionSvgDefault(userId, title);
  const svgIconUrl = String(payload?.svgIconUrl || action?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || action?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  const repeatRule = String(payload?.repeatRule || "none").trim() || "none";
  const repeatDays = normalizeRepeatDays(payload?.repeatDays);
  const applyTo = String(payload?.applyTo || "").trim().toLowerCase() === "series" ? "series" : "single";
  const replaceOverlaps = Boolean(payload?.replaceOverlaps);
  const occurrences = parseActionOccurrences(payload);
  const sameRepeatDefinition = repeatRule === String(action.repeatRule || "none")
    && JSON.stringify(repeatDays) === JSON.stringify(normalizeRepeatDays(action.repeatDays));

  if (title.length < 2) {
    throw new Error("Titulo da tarefa invalido.");
  }
  const isSeriesUpdate = applyTo === "series" && (action.repeatGroupId || repeatRule !== "none" || occurrences.length > 1);

  if (isSeriesUpdate) {
    const seriesRows = action.repeatGroupId
      ? await query(
        `
          select id, start_at, end_at
          from actions
          where user_id = $1
            and repeat_group_id = $2
          order by start_at asc
        `,
        [userId, action.repeatGroupId]
      )
      : await query("select id, start_at, end_at from actions where user_id = $1 and id = $2", [userId, action.id]);
    const existingIds = seriesRows.rows.map((row) => String(row.id || "").trim()).filter(Boolean);

    if (action.repeatGroupId && sameRepeatDefinition) {
      const referenceStart = occurrences[0]?.startAt || parseDate(action.startAt, "Horario inicial");
      const referenceEnd = occurrences[0]?.endAt || parseDate(action.endAt, "Horario final");
      const nextOccurrences = seriesRows.rows.map((row) => {
        const rowStart = parseDate(row.start_at, "Horario inicial");
        const rowEnd = parseDate(row.end_at, "Horario final");
        const nextStart = new Date(rowStart);
        nextStart.setHours(referenceStart.getHours(), referenceStart.getMinutes(), 0, 0);
        const nextEnd = new Date(rowEnd);
        nextEnd.setHours(referenceEnd.getHours(), referenceEnd.getMinutes(), 0, 0);
        if (nextEnd <= nextStart) {
          nextEnd.setDate(nextEnd.getDate() + 1);
        }
        return {
          id: String(row.id || "").trim(),
          startAt: nextStart,
          endAt: nextEnd
        };
      });
      const overlapOccurrences = nextOccurrences.map((item) => ({ startAt: item.startAt, endAt: item.endAt }));
      if (replaceOverlaps) {
        await deleteOverlappingActions(userId, assignee, overlapOccurrences, existingIds);
      }
      await assertActionOverlaps(userId, assignee, overlapOccurrences, existingIds);
      for (const item of nextOccurrences) {
        await query(
          `
            update actions
               set title = $3,
                   assignee = $4,
                   category_id = $5,
                   svg_icon_url = $6,
                   svg_icon_label = $7,
                   start_at = $8::timestamptz,
                   end_at = $9::timestamptz,
                   repeat_rule = $10,
                   repeat_days = $11::jsonb
             where user_id = $1
               and id = $2
          `,
          [
            userId,
            item.id,
            title,
            assignee,
            categoryId,
            svgIconUrl,
            svgIconLabel,
            item.startAt.toISOString(),
            item.endAt.toISOString(),
            repeatRule,
            JSON.stringify(repeatDays)
          ]
        );
      }
      if (svgIconUrl) {
        await saveActionSvgDefault(userId, title, svgIconUrl, svgIconLabel);
        await applyActionSvgDefaultToMatchingActions(userId, title, svgIconUrl, svgIconLabel);
      }
      return getUserActionById(userId, action.id);
    }

    if (replaceOverlaps) {
      await deleteOverlappingActions(userId, assignee, occurrences, existingIds);
    }
    await assertActionOverlaps(userId, assignee, occurrences, existingIds);
    if (existingIds.length) {
      await query("delete from action_status_overrides where user_id = $1 and action_id = any($2::uuid[])", [userId, existingIds]);
      await query("delete from actions where user_id = $1 and id = any($2::uuid[])", [userId, existingIds]);
    }
    const created = await createUserAction(userId, {
      title,
      assignee,
      categoryId,
      svgIconUrl,
      svgIconLabel,
      repeatRule,
      repeatDays,
      occurrences
    });
    const preferred = created.find((item) => item.startAt === action.startAt) || created[0] || null;
    if (svgIconUrl) {
      await saveActionSvgDefault(userId, title, svgIconUrl, svgIconLabel);
      await applyActionSvgDefaultToMatchingActions(userId, title, svgIconUrl, svgIconLabel);
    }
    return preferred;
  }

  const occurrence = occurrences[0];
  if (replaceOverlaps) {
    await deleteOverlappingActions(userId, assignee, [occurrence], [action.id]);
  }
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
          svg_icon_url = $6,
          svg_icon_label = $7,
          start_at = $8::timestamptz,
          end_at = $9::timestamptz,
          repeat_group_id = $10,
          repeat_rule = $11,
          repeat_days = $12::jsonb
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
      svgIconUrl,
      svgIconLabel,
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

  if (svgIconUrl) {
    await saveActionSvgDefault(userId, title, svgIconUrl, svgIconLabel);
    await applyActionSvgDefaultToMatchingActions(userId, title, svgIconUrl, svgIconLabel);
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
  let completionPercent = Math.max(0, Math.min(100, Math.trunc(Number(action.completionPercent || 0) || 0)));
  let accumulatedSeconds = Math.max(0, Math.trunc(Number(action.accumulatedSeconds || 0) || 0));
  const plannedSeconds = Math.max(1, Math.round((new Date(action.endAt).getTime() - new Date(action.startAt).getTime()) / 1000));

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

    startedAt = action.status === ACTION_STATUS_PAUSED ? nowIso : (startedAt || nowIso);
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
    completionPercent = 100;
    accumulatedSeconds = plannedSeconds;
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
        completed_at,
        completion_percent,
        accumulated_seconds
      )
      values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8)
      on conflict (user_id, action_id) do update
        set repeat_group_id = excluded.repeat_group_id,
            status = excluded.status,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            completion_percent = excluded.completion_percent,
            accumulated_seconds = excluded.accumulated_seconds,
            updated_at = now()
    `,
    [
      userId,
      action.id,
      action.repeatGroupId,
      nextStatus,
      startedAt || null,
      completedAt || null,
      completionPercent,
      accumulatedSeconds
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
          completed_at,
          completion_percent,
          accumulated_seconds
        )
        values ($1, $2, $3, $4, null, null, 0, 0)
        on conflict (user_id, action_id) do update
          set status = excluded.status,
              started_at = null,
              completed_at = null,
              completion_percent = 0,
              accumulated_seconds = 0,
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

  if (mode === "pause") {
    if (normalizeActionStatus(action.status) !== ACTION_STATUS_IN_PROGRESS) {
      throw new Error("Somente uma tarefa em andamento pode ser pausada.");
    }
    const now = new Date();
    const startedAtMs = new Date(action.startedAt || now).getTime();
    const sessionSeconds = Number.isFinite(startedAtMs)
      ? Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000))
      : 0;
    const plannedSeconds = Math.max(1, Math.round((new Date(action.endAt).getTime() - new Date(action.startAt).getTime()) / 1000));
    const automaticSeconds = Math.min(plannedSeconds, Math.max(0, Math.trunc(Number(action.accumulatedSeconds || 0) || 0)) + sessionSeconds);
    const automaticPercent = Math.max(0, Math.min(100, Math.floor((automaticSeconds / plannedSeconds) * 100)));
    const requestedPercent = Number(payload?.completionPercent);
    const completionPercent = Number.isFinite(requestedPercent)
      ? Math.max(0, Math.min(100, Math.round(requestedPercent / 10) * 10))
      : automaticPercent;
    const accumulatedSeconds = Number.isFinite(requestedPercent)
      ? Math.min(plannedSeconds, Math.round((plannedSeconds * completionPercent) / 100))
      : automaticSeconds;
    const completed = completionPercent >= 100;
    const nextStatus = completed ? ACTION_STATUS_COMPLETED : ACTION_STATUS_PAUSED;
    const completedAt = completed ? now.toISOString() : null;
    await query(
      `
        insert into action_status_overrides (
          user_id,
          action_id,
          repeat_group_id,
          status,
          started_at,
          completed_at,
          completion_percent,
          accumulated_seconds
        )
        values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8)
        on conflict (user_id, action_id) do update
          set status = excluded.status,
              started_at = excluded.started_at,
              completed_at = excluded.completed_at,
              completion_percent = excluded.completion_percent,
              accumulated_seconds = excluded.accumulated_seconds,
              updated_at = now()
      `,
      [
        userId,
        action.id,
        action.repeatGroupId,
        nextStatus,
        completed ? (action.startedAt || now.toISOString()) : null,
        completedAt,
        completionPercent,
        accumulatedSeconds
      ]
    );
    await upsertProject200RuntimeState(userId, {
      actionId: action.id,
      actionTitle: action.title,
      eventType: completed ? "complete" : "pause",
      startedAt: completed ? (action.startedAt || now.toISOString()) : null,
      occurredAt: now.toISOString()
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
          completed_at,
          completion_percent,
          accumulated_seconds
        )
        values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, 100, $7)
        on conflict (user_id, action_id) do update
          set status = excluded.status,
              started_at = excluded.started_at,
              completed_at = excluded.completed_at,
              completion_percent = 100,
              accumulated_seconds = excluded.accumulated_seconds,
              updated_at = now()
      `,
      [userId, action.id, action.repeatGroupId, ACTION_STATUS_COMPLETED, startedAt, completedAt,
        Math.max(1, Math.round((new Date(action.endAt).getTime() - new Date(action.startAt).getTime()) / 1000))]
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

export async function createQuickUserAction(userId, payload = {}) {
  await ensureActionsSchema();
  const title = String(payload?.title || "").trim();
  if (title.length < 2) {
    throw new Error("Titulo da tarefa invalido.");
  }
  const assignee = await resolveProject200ProfileName(userId, normalizeAssignee(payload?.assignee), { fallbackToDefault: true });
  const plannedMinutesRaw = Math.max(1, Math.round(Number(payload?.plannedMinutes || 1) || 1));
  const plannedMinutes = Math.min(24 * 60, plannedMinutesRaw);
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + (plannedMinutes * 60000));

  await reshapeActionsForQuickTask(userId, assignee, startAt, endAt);
  const created = await createUserAction(userId, {
    title,
    assignee,
    categoryId: QUICK_TASK_CATEGORY_ID,
    repeatRule: "none",
    repeatDays: [],
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  });
  const action = created[0];
  if (!action?.id) {
    throw new Error("Nao foi possivel criar a tarefa rapida.");
  }
  return updateUserActionStatus(userId, action.id);
}

export async function extendQuickUserAction(userId, actionId, payload = {}) {
  await ensureActionsSchema();
  const action = await getUserActionById(userId, actionId);
  if (!action) {
    throw new Error("Tarefa nao encontrada.");
  }
  if (String(action.categoryId || "").trim() !== QUICK_TASK_CATEGORY_ID) {
    return action;
  }
  const currentEndAt = parseDate(action.endAt, "Horario final");
  const desiredEndAt = ceilDateToNextMinute(payload?.endAt || new Date());
  if (desiredEndAt.getTime() <= currentEndAt.getTime()) {
    return action;
  }
  await reshapeActionsForQuickTask(userId, action.assignee, currentEndAt, desiredEndAt, action.id);
  await resizeActionWindow(userId, action, parseDate(action.startAt, "Horario inicial"), desiredEndAt);
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
