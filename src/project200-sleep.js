import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const PROJECT200_SLEEP_ALLOWED_DELAYS = new Set([0, 5, 15, 30, 60]);
const PROJECT200_SLEEP_CUTOFF_MINUTES = 17 * 60;
export const PROJECT200_SLEEP_CATEGORY_ID = "sono";
export const PROJECT200_SLEEP_DEFAULT_TARGET_MINUTES = 420;
export const PROJECT200_SLEEP_MAX_TRACKED_MINUTES = 720;

function normalizeProfileName(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function getProjectTimeParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT200_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(safeDate);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second")
  };
}

function toProjectDateKey(value = new Date()) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const parts = getProjectTimeParts(value);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addDaysToDateKey(dateKey, amount) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number(part));
  const safeYear = Number.isInteger(year) ? year : 1970;
  const safeMonth = Number.isInteger(month) ? month : 1;
  const safeDay = Number.isInteger(day) ? day : 1;
  const shifted = new Date(Date.UTC(safeYear, safeMonth - 1, safeDay + Number(amount || 0), 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

function getSleepWakeDateKey(value = new Date()) {
  const parts = getProjectTimeParts(value);
  const baseKey = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const totalMinutes = (parts.hour * 60) + parts.minute + (parts.second > 0 ? 0.001 : 0);
  return totalMinutes > PROJECT200_SLEEP_CUTOFF_MINUTES
    ? addDaysToDateKey(baseKey, 1)
    : baseKey;
}

function parseDelayMinutes(value) {
  const minutes = Math.max(0, Math.trunc(Number(value || 0) || 0));
  if (!PROJECT200_SLEEP_ALLOWED_DELAYS.has(minutes)) {
    throw new Error("Escolha um tempo válido para iniciar o sono.");
  }
  return minutes;
}

function clampSavedMinutes(value) {
  const minutes = Math.max(0, Math.trunc(Number(value || 0) || 0));
  return Math.min(PROJECT200_SLEEP_MAX_TRACKED_MINUTES, minutes);
}

function normalizeActiveSleepSession(row) {
  if (!row?.id) {
    return null;
  }
  const scheduledStartAt = new Date(row.scheduled_start_at || row.scheduledStartAt || "").toISOString();
  const nowMs = Date.now();
  const scheduledStartAtMs = new Date(scheduledStartAt).getTime();
  const hasStarted = Number.isFinite(scheduledStartAtMs) && nowMs >= scheduledStartAtMs;
  const trackedMinutes = hasStarted ? Math.max(0, Math.floor((nowMs - scheduledStartAtMs) / 60000)) : 0;
  const countdownRemainingSeconds = hasStarted || !Number.isFinite(scheduledStartAtMs)
    ? 0
    : Math.max(0, Math.ceil((scheduledStartAtMs - nowMs) / 1000));
  return {
    id: String(row.id),
    profileName: normalizeProfileName(row.assigned_profile || row.assignedProfile),
    delayMinutes: Math.max(0, Math.trunc(Number(row.delay_minutes || row.delayMinutes || 0) || 0)),
    scheduledStartAt,
    phase: hasStarted ? "sleeping" : "countdown",
    trackedMinutes,
    cappedTrackedMinutes: clampSavedMinutes(trackedMinutes),
    countdownRemainingSeconds,
    maxTrackedMinutes: PROJECT200_SLEEP_MAX_TRACKED_MINUTES
  };
}

async function getActiveSleepSessionRow(userId, profileName) {
  const profile = normalizeProfileName(profileName);
  const result = await query(
    `
      select id, assigned_profile, delay_minutes, scheduled_start_at, status
      from project200_sleep_sessions
      where user_id = $1
        and assigned_profile = $2
        and status = 'active'
      order by created_at desc
      limit 1
    `,
    [userId, profile]
  );
  return result.rows[0] || null;
}

async function getSleepDailyTotal(userId, profileName, sleepDateKey) {
  const profile = normalizeProfileName(profileName);
  const result = await query(
    `
      select total_minutes
      from "sono-user"
      where user_id = $1
        and assigned_profile = $2
        and sleep_date = $3::date
      limit 1
    `,
    [userId, profile, sleepDateKey]
  );
  return Math.max(0, Math.trunc(Number(result.rows[0]?.total_minutes || 0) || 0));
}

export async function ensureProject200SleepSchema() {
  await query(`
    create table if not exists "sono-user" (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      sleep_date date not null,
      total_minutes integer not null default 0,
      source_session_id uuid null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, assigned_profile, sleep_date)
    );
  `);
  await query(`alter table "sono-user" add column if not exists assigned_profile text not null default 'Usuario';`);
  await query(`alter table "sono-user" add column if not exists sleep_date date not null default current_date;`);
  await query(`alter table "sono-user" add column if not exists total_minutes integer not null default 0;`);
  await query(`alter table "sono-user" add column if not exists source_session_id uuid null;`);
  await query(`alter table "sono-user" add column if not exists created_at timestamptz not null default now();`);
  await query(`alter table "sono-user" add column if not exists updated_at timestamptz not null default now();`);
  await query(`update "sono-user" set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';`);
  await query(`create index if not exists idx_sono_user_profile_date on "sono-user"(user_id, assigned_profile, sleep_date desc);`);

  await query(`
    create table if not exists project200_sleep_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      status text not null default 'active',
      delay_minutes integer not null default 0,
      scheduled_start_at timestamptz not null,
      completed_at timestamptz null,
      aborted_at timestamptz null,
      finalized_sleep_date date null,
      saved_minutes integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`alter table project200_sleep_sessions add column if not exists assigned_profile text not null default 'Usuario';`);
  await query(`alter table project200_sleep_sessions add column if not exists status text not null default 'active';`);
  await query(`alter table project200_sleep_sessions add column if not exists delay_minutes integer not null default 0;`);
  await query(`alter table project200_sleep_sessions add column if not exists scheduled_start_at timestamptz not null default now();`);
  await query(`alter table project200_sleep_sessions add column if not exists completed_at timestamptz null;`);
  await query(`alter table project200_sleep_sessions add column if not exists aborted_at timestamptz null;`);
  await query(`alter table project200_sleep_sessions add column if not exists finalized_sleep_date date null;`);
  await query(`alter table project200_sleep_sessions add column if not exists saved_minutes integer not null default 0;`);
  await query(`alter table project200_sleep_sessions add column if not exists created_at timestamptz not null default now();`);
  await query(`alter table project200_sleep_sessions add column if not exists updated_at timestamptz not null default now();`);
  await query(`update project200_sleep_sessions set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';`);
  await query(`create index if not exists idx_project200_sleep_sessions_user_profile on project200_sleep_sessions(user_id, assigned_profile, created_at desc);`);
  await query(`create unique index if not exists idx_project200_sleep_sessions_active on project200_sleep_sessions(user_id, assigned_profile) where status = 'active';`);
}

export async function getProject200SleepSession(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200SleepSchema();
  const row = await getActiveSleepSessionRow(userId, profileName);
  return normalizeActiveSleepSession(row);
}

export async function startProject200SleepSession(userId, payload = {}) {
  await ensureProject200SleepSchema();
  const profileName = normalizeProfileName(payload?.profileName);
  const existing = await getActiveSleepSessionRow(userId, profileName);
  if (existing) {
    return normalizeActiveSleepSession(existing);
  }
  const delayMinutes = parseDelayMinutes(payload?.delayMinutes);
  const scheduledStartAt = new Date(Date.now() + (delayMinutes * 60000));
  const result = await query(
    `
      insert into project200_sleep_sessions (
        user_id, assigned_profile, status, delay_minutes, scheduled_start_at, created_at, updated_at
      )
      values ($1, $2, 'active', $3, $4::timestamptz, now(), now())
      returning id, assigned_profile, delay_minutes, scheduled_start_at, status
    `,
    [userId, profileName, delayMinutes, scheduledStartAt.toISOString()]
  );
  return normalizeActiveSleepSession(result.rows[0]);
}

export async function finishProject200SleepSession(userId, payload = {}) {
  await ensureProject200SleepSchema();
  const profileName = normalizeProfileName(payload?.profileName);
  const session = await getActiveSleepSessionRow(userId, profileName);
  if (!session?.id) {
    throw new Error("Nenhuma sessão de sono ativa.");
  }
  const completedAt = payload?.completedAt ? new Date(payload.completedAt) : new Date();
  if (Number.isNaN(completedAt.getTime())) {
    throw new Error("Fim do sono inválido.");
  }
  const scheduledStartAt = new Date(session.scheduled_start_at);
  const trackedMinutes = completedAt > scheduledStartAt
    ? Math.max(0, Math.floor((completedAt.getTime() - scheduledStartAt.getTime()) / 60000))
    : 0;
  const savedMinutes = clampSavedMinutes(trackedMinutes);
  const sleepDateKey = getSleepWakeDateKey(completedAt);

  await query(
    `
      update project200_sleep_sessions
      set status = 'completed',
          completed_at = $3::timestamptz,
          finalized_sleep_date = $4::date,
          saved_minutes = $5,
          updated_at = now()
      where user_id = $1
        and id = $2
    `,
    [userId, session.id, completedAt.toISOString(), sleepDateKey, savedMinutes]
  );

  if (savedMinutes > 0) {
    await query(
      `
        insert into "sono-user" as sleep_user (
          user_id, assigned_profile, sleep_date, total_minutes, source_session_id, created_at, updated_at
        )
        values ($1, $2, $3::date, $4, $5::uuid, now(), now())
        on conflict (user_id, assigned_profile, sleep_date) do update
          set total_minutes = sleep_user.total_minutes + excluded.total_minutes,
              source_session_id = excluded.source_session_id,
              updated_at = now()
      `,
      [userId, profileName, sleepDateKey, savedMinutes, session.id]
    );
  }

  const dailyTotalMinutes = await getSleepDailyTotal(userId, profileName, sleepDateKey);
  return {
    sessionId: String(session.id),
    sleepDate: sleepDateKey,
    savedMinutes,
    dailyTotalMinutes,
    maxTrackedMinutes: PROJECT200_SLEEP_MAX_TRACKED_MINUTES
  };
}

export async function abortProject200SleepSession(userId, payload = {}) {
  await ensureProject200SleepSchema();
  const profileName = normalizeProfileName(payload?.profileName);
  const session = await getActiveSleepSessionRow(userId, profileName);
  if (!session?.id) {
    throw new Error("Nenhuma sessão de sono ativa.");
  }
  await query(
    `
      update project200_sleep_sessions
      set status = 'aborted',
          aborted_at = now(),
          updated_at = now()
      where user_id = $1
        and id = $2
    `,
    [userId, session.id]
  );
  return { ok: true };
}

export async function getProject200SleepTotalMinutesForRange(userId, range = {}) {
  await ensureProject200SleepSchema();
  const fromDateKey = range?.from ? toProjectDateKey(range.from) : null;
  const toDateKey = range?.to ? toProjectDateKey(range.to) : null;
  const result = await query(
    `
      select coalesce(sum(total_minutes), 0) as total_minutes
      from "sono-user"
      where user_id = $1
        and ($2::text is null or sleep_date >= $2::date)
        and ($3::text is null or sleep_date < $3::date)
    `,
    [userId, fromDateKey, toDateKey]
  );
  return Math.max(0, Math.trunc(Number(result.rows[0]?.total_minutes || 0) || 0));
}

export async function listProject200SleepHistory(userId, payload = {}) {
  await ensureProject200SleepSchema();
  const profileName = normalizeProfileName(payload?.profileName);
  const limit = Math.max(1, Math.min(7, Math.trunc(Number(payload?.limit || 7) || 7)));
  const result = await query(
    `select sleep_date::text as sleep_date, total_minutes
       from "sono-user"
      where user_id = $1 and assigned_profile = $2
      order by sleep_date desc
      limit $3`,
    [userId, profileName, limit]
  );
  return result.rows.map((row) => ({
    sleepDate: String(row.sleep_date || "").slice(0, 10),
    totalMinutes: clampSavedMinutes(row.total_minutes)
  }));
}

export async function updateProject200SleepHistoryEntry(userId, payload = {}) {
  await ensureProject200SleepSchema();
  const profileName = normalizeProfileName(payload?.profileName);
  const sleepDate = String(payload?.sleepDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sleepDate)) {
    throw new Error("Data do sono inválida.");
  }
  const totalMinutes = clampSavedMinutes(payload?.totalMinutes);
  const result = await query(
    `insert into "sono-user" as sleep_user
       (user_id, assigned_profile, sleep_date, total_minutes, source_session_id, created_at, updated_at)
     values ($1, $2, $3::date, $4, null, now(), now())
     on conflict (user_id, assigned_profile, sleep_date) do update
       set total_minutes = excluded.total_minutes, updated_at = now()
     returning sleep_date::text as sleep_date, total_minutes`,
    [userId, profileName, sleepDate, totalMinutes]
  );
  return {
    sleepDate: String(result.rows[0]?.sleep_date || sleepDate).slice(0, 10),
    totalMinutes: clampSavedMinutes(result.rows[0]?.total_minutes)
  };
}
