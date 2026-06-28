import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const EXTRA_GOALS_TIME_ZONE = "America/Sao_Paulo";

function normalizeExtraGoalTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
}

function normalizeExtraGoalProfile(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function toDateKey(value = new Date()) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const date = value instanceof Date ? value : new Date(value);
  const target = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EXTRA_GOALS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(target);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function getStoredDateKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return "";
}

function normalizeExtraGoalRow(row, dateKey = toDateKey()) {
  const targetValue = Math.max(1, Math.trunc(Number(row.target_value || 0) || 1));
  const rawProgress = Math.max(0, Math.trunc(Number(row.progress_value || 0) || 0));
  const storedDateKey = getStoredDateKey(row.progress_date_key) || getStoredDateKey(row.progress_date);
  const progressValue = storedDateKey === dateKey ? rawProgress : 0;
  return {
    id: row.id,
    userId: row.user_id,
    profileName: normalizeExtraGoalProfile(row.assigned_profile),
    title: normalizeExtraGoalTitle(row.title),
    targetValue,
    progressValue,
    remainingValue: Math.max(0, targetValue - progressValue),
    percent: Math.max(0, Math.min(100, Math.round((progressValue / targetValue) * 100))),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export function summarizeExtraGoals(goals = []) {
  const list = Array.isArray(goals) ? goals : [];
  const completed = list.filter((goal) => Number(goal.progressValue || 0) >= Number(goal.targetValue || 0));
  return {
    total: list.length,
    completed: completed.length,
    pending: Math.max(0, list.length - completed.length),
    lines: list.slice(0, 8).map((goal) => `${goal.title}: ${goal.progressValue} de ${goal.targetValue}`),
    missingLines: list
      .filter((goal) => Number(goal.progressValue || 0) < Number(goal.targetValue || 0))
      .slice(0, 8)
      .map((goal) => `${goal.title}: falta ${Math.max(0, Number(goal.targetValue || 0) - Number(goal.progressValue || 0))} de ${goal.targetValue}`)
  };
}

export async function ensureExtraGoalsSchema() {
  await query(`
    create table if not exists extra_goals (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      title text not null,
      target_value integer not null default 1,
      progress_value integer not null default 0,
      progress_date date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table extra_goals add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table extra_goals add column if not exists progress_value integer not null default 0;");
  await query("alter table extra_goals add column if not exists progress_date date;");
  await query("update extra_goals set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query("create index if not exists idx_extra_goals_user_profile_created on extra_goals(user_id, assigned_profile, created_at asc);");
}

export async function listExtraGoals(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, date = new Date()) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const dateKey = toDateKey(date);
  const result = await query(
    `
      select
        id,
        user_id,
        assigned_profile,
        title,
        target_value,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key,
        created_at,
        updated_at
      from extra_goals
      where user_id = $1
        and assigned_profile = $2
      order by created_at asc, id asc
    `,
    [userId, normalizedProfile]
  );
  return result.rows.map((row) => normalizeExtraGoalRow(row, dateKey));
}

export async function createExtraGoal(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const title = normalizeExtraGoalTitle(payload?.title);
  const targetValue = Math.max(1, Math.trunc(Number(payload?.targetValue) || 0));
  if (!title) {
    throw new Error("Informe o nome da missao.");
  }
  if (!targetValue) {
    throw new Error("Informe a unidade diaria da missao.");
  }
  await query(
    `
      insert into extra_goals (
        user_id, assigned_profile, title, target_value, progress_value, progress_date, created_at, updated_at
      )
      values ($1, $2, $3, $4, 0, null, now(), now())
    `,
    [userId, normalizedProfile, title, targetValue]
  );
  return listExtraGoals(userId, normalizedProfile);
}

export async function updateExtraGoalProgress(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, delta, date = new Date()) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  const safeDelta = Math.trunc(Number(delta) || 0);
  if (!safeDelta) {
    throw new Error("Ajuste invalido.");
  }
  const dateKey = toDateKey(date);
  const currentResult = await query(
    `
      select
        id,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key
      from extra_goals
      where id = $1
        and user_id = $2
        and assigned_profile = $3
      limit 1
    `,
    [safeGoalId, userId, normalizedProfile]
  );
  const current = currentResult.rows[0];
  if (!current) {
    throw new Error("Missao nao encontrada.");
  }
  const currentProgress = (getStoredDateKey(current.progress_date_key) || getStoredDateKey(current.progress_date)) === dateKey
    ? Math.max(0, Math.trunc(Number(current.progress_value || 0) || 0))
    : 0;
  const nextProgress = Math.max(0, currentProgress + safeDelta);
  await query(
    `
      update extra_goals
      set progress_value = $4,
          progress_date = $5::date,
          updated_at = now()
      where id = $1
        and user_id = $2
        and assigned_profile = $3
    `,
    [safeGoalId, userId, normalizedProfile, nextProgress, dateKey]
  );
  return listExtraGoals(userId, normalizedProfile, dateKey);
}

export async function deleteExtraGoal(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  await query(
    `
      delete from extra_goals
      where id = $1
        and user_id = $2
        and assigned_profile = $3
    `,
    [safeGoalId, userId, normalizedProfile]
  );
  return listExtraGoals(userId, normalizedProfile);
}
