import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const EXTRA_GOALS_TIME_ZONE = "America/Sao_Paulo";
const EXTRA_GOAL_MAX_DURATION_SECONDS = 180 * 60;
const EXTRA_GOAL_MAX_CYCLES = 12;
export const EXTRA_GOAL_HISTORY_SCOPES = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "last7", label: "Ultimos 7 dias", days: 7 },
  { key: "last15", label: "Ultimos 15 dias", days: 15 },
  { key: "last30", label: "Ultimos 30 dias", days: 30 }
];
const DEFAULT_EXTRA_GOALS = [
  { title: "Beber água", targetValue: 8 },
  { title: "Guardar 6 itens", targetValue: 6 },
  { title: "Ler uma página", targetValue: 6 },
  { title: "Escovar os dentes", targetValue: 3 }
];

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

function normalizeExtraGoalVariantUnit(value) {
  return String(value || "days").trim().toLowerCase() === "hours" ? "hours" : "days";
}

function normalizeExtraGoalVariantRow(row) {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: normalizeExtraGoalTitle(row.title),
    intervalValue: Math.max(1, Math.trunc(Number(row.interval_value || 1))),
    intervalUnit: normalizeExtraGoalVariantUnit(row.interval_unit),
    lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
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
  const unitDurationMinutes = Math.max(0, Math.trunc(Number(row.unit_duration_minutes || 0) || 0));
  const storedUnitDurationSeconds = Math.max(0, Math.trunc(Number(row.unit_duration_seconds || 0) || 0));
  const unitDurationSeconds = storedUnitDurationSeconds || (unitDurationMinutes * 60);
  return {
    id: row.id,
    userId: row.user_id,
    profileName: normalizeExtraGoalProfile(row.assigned_profile),
    title: normalizeExtraGoalTitle(row.title),
    svgIconUrl: String(row.svg_icon_url || "").trim(),
    svgIconLabel: String(row.svg_icon_label || "").trim(),
    targetValue,
    unitDurationMinutes,
    unitDurationSeconds,
    progressValue,
    remainingValue: Math.max(0, targetValue - progressValue),
    percent: Math.max(0, Math.min(100, Math.round((progressValue / targetValue) * 100))),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

function getExtraGoalHistoryScope(scopeKey = "today") {
  const normalized = String(scopeKey || "today").trim().toLowerCase();
  return EXTRA_GOAL_HISTORY_SCOPES.find((scope) => scope.key === normalized) || EXTRA_GOAL_HISTORY_SCOPES[0];
}

function getDefaultExtraGoalOrder(title) {
  const normalizedTitle = normalizeExtraGoalTitle(title).toLocaleLowerCase("pt-BR");
  const index = DEFAULT_EXTRA_GOALS.findIndex((goal) => normalizeExtraGoalTitle(goal.title).toLocaleLowerCase("pt-BR") === normalizedTitle);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

async function getStoredExtraGoalSvgDefault(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, title = "") {
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeTitle = normalizeExtraGoalTitle(title);
  if (!safeTitle) {
    return null;
  }
  const result = await query(
    `
      select svg_icon_url, svg_icon_label
      from extra_goal_svg_defaults
      where user_id = $1
        and assigned_profile = $2
        and title = $3
      limit 1
    `,
    [userId, normalizedProfile, safeTitle]
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

async function saveExtraGoalSvgDefault(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, title = "", svgIconUrl = "", svgIconLabel = "") {
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeTitle = normalizeExtraGoalTitle(title);
  if (!safeTitle) {
    return;
  }
  await query(
    `
      insert into extra_goal_svg_defaults (user_id, assigned_profile, title, svg_icon_url, svg_icon_label, updated_at)
      values ($1, $2, $3, $4, $5, now())
      on conflict (user_id, assigned_profile, title)
      do update
         set svg_icon_url = excluded.svg_icon_url,
             svg_icon_label = excluded.svg_icon_label,
             updated_at = now()
    `,
    [userId, normalizedProfile, safeTitle, String(svgIconUrl || "").trim(), String(svgIconLabel || "").trim()]
  );
}

async function applyExtraGoalSvgDefaultToMatchingGoals(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, title = "", svgIconUrl = "", svgIconLabel = "") {
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeTitle = normalizeExtraGoalTitle(title);
  if (!safeTitle) {
    return;
  }
  await query(
    `
      update extra_goals
         set svg_icon_url = $4,
             svg_icon_label = $5,
             updated_at = now()
       where user_id = $1
         and assigned_profile = $2
         and title = $3
    `,
    [userId, normalizedProfile, safeTitle, String(svgIconUrl || "").trim(), String(svgIconLabel || "").trim()]
  );
}

async function ensureDefaultExtraGoals(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const seededResult = await query(
    `
      select 1
      from extra_goal_profiles
      where user_id = $1
        and assigned_profile = $2
      limit 1
    `,
    [userId, normalizedProfile]
  );
  if (seededResult.rows[0]) {
    return;
  }
  for (const goal of DEFAULT_EXTRA_GOALS) {
    const storedSvgDefault = await getStoredExtraGoalSvgDefault(userId, normalizedProfile, goal.title);
    await query(
      `
        insert into extra_goals (
          user_id, assigned_profile, title, target_value, svg_icon_url, svg_icon_label, progress_value, progress_date, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, 0, null, now(), now())
      `,
      [
        userId,
        normalizedProfile,
        normalizeExtraGoalTitle(goal.title),
        Math.max(1, Math.trunc(Number(goal.targetValue) || 1)),
        String(storedSvgDefault?.svgIconUrl || "").trim(),
        String(storedSvgDefault?.svgIconLabel || "").trim()
      ]
    );
  }
  await query(
    `
      insert into extra_goal_profiles (user_id, assigned_profile, seeded_at)
      values ($1, $2, now())
      on conflict (user_id, assigned_profile) do nothing
    `,
    [userId, normalizedProfile]
  );
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
    create table if not exists extra_goal_profiles (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      seeded_at timestamptz not null default now(),
      primary key (user_id, assigned_profile)
    );
  `);
  await query(`
    create table if not exists extra_goals (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      title text not null,
      target_value integer not null default 1,
      unit_duration_minutes integer not null default 0,
      unit_duration_seconds integer not null default 0,
      svg_icon_url text not null default '',
      svg_icon_label text not null default '',
      progress_value integer not null default 0,
      progress_date date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table extra_goals add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table extra_goals add column if not exists progress_value integer not null default 0;");
  await query("alter table extra_goals add column if not exists progress_date date;");
  await query("alter table extra_goals add column if not exists unit_duration_minutes integer not null default 0;");
  await query("alter table extra_goals add column if not exists unit_duration_seconds integer not null default 0;");
  await query("update extra_goals set unit_duration_seconds = unit_duration_minutes * 60 where unit_duration_seconds <= 0 and unit_duration_minutes > 0;");
  await query("alter table extra_goals add column if not exists svg_icon_url text not null default '';");
  await query("alter table extra_goals add column if not exists svg_icon_label text not null default '';");
  await query("update extra_goals set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query("create index if not exists idx_extra_goals_user_profile_created on extra_goals(user_id, assigned_profile, created_at asc);");
  await query(`
    create table if not exists extra_goal_progress_history (
      user_id uuid not null references users(id) on delete cascade,
      goal_id uuid not null references extra_goals(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      scope_date date not null,
      progress_value integer not null default 0,
      target_value integer not null default 1,
      updated_at timestamptz not null default now(),
      primary key (user_id, goal_id, scope_date)
    );
  `);
  await query("alter table extra_goal_progress_history add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table extra_goal_progress_history add column if not exists progress_value integer not null default 0;");
  await query("alter table extra_goal_progress_history add column if not exists target_value integer not null default 1;");
  await query("alter table extra_goal_progress_history add column if not exists updated_at timestamptz not null default now();");
  await query("update extra_goal_progress_history set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query("create index if not exists idx_extra_goal_progress_history_user_profile_date on extra_goal_progress_history(user_id, assigned_profile, scope_date desc);");
  await query("alter table extra_goal_profiles add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table extra_goal_profiles add column if not exists seeded_at timestamptz not null default now();");
  await query("update extra_goal_profiles set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query(`
    insert into extra_goal_profiles (user_id, assigned_profile, seeded_at)
    select distinct user_id, assigned_profile, coalesce(min(created_at), now())
    from extra_goals
    group by user_id, assigned_profile
    on conflict (user_id, assigned_profile) do nothing
  `);
  await query(`
    create table if not exists extra_goal_svg_defaults (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      title text not null,
      svg_icon_url text not null default '',
      svg_icon_label text not null default '',
      updated_at timestamptz not null default now(),
      primary key (user_id, assigned_profile, title)
    );
  `);
  await query("create index if not exists idx_extra_goal_svg_defaults_user_profile on extra_goal_svg_defaults(user_id, assigned_profile, updated_at desc);");
  await query(`
    create table if not exists extra_goal_variants (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      goal_id uuid not null references extra_goals(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      title text not null,
      interval_value integer not null default 1,
      interval_unit text not null default 'days',
      last_completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("create index if not exists idx_extra_goal_variants_owner on extra_goal_variants(user_id, goal_id, assigned_profile, updated_at desc);");
}

export async function listExtraGoalVariants(userId, profileName, goalId) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  const goal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  if (!goal) throw new Error("Missao nao encontrada.");
  const result = await query(`
    select id, goal_id, title, interval_value, interval_unit, last_completed_at, created_at, updated_at
    from extra_goal_variants
    where user_id = $1 and assigned_profile = $2 and goal_id = $3
    order by updated_at desc, created_at asc
  `, [userId, normalizedProfile, safeGoalId]);
  return result.rows.map(normalizeExtraGoalVariantRow);
}

export async function createExtraGoalVariant(userId, profileName, goalId, payload = {}) {
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  const title = normalizeExtraGoalTitle(payload?.title);
  const intervalValue = Math.min(999, Math.max(1, Math.trunc(Number(payload?.intervalValue || 1))));
  const intervalUnit = normalizeExtraGoalVariantUnit(payload?.intervalUnit);
  if (!title) throw new Error("Informe o nome da micro-tarefa.");
  const goal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  if (!goal) throw new Error("Missao nao encontrada.");
  await query(`
    insert into extra_goal_variants (user_id, goal_id, assigned_profile, title, interval_value, interval_unit)
    values ($1, $2, $3, $4, $5, $6)
  `, [userId, safeGoalId, normalizedProfile, title, intervalValue, intervalUnit]);
  return listExtraGoalVariants(userId, normalizedProfile, safeGoalId);
}

export async function updateExtraGoalVariant(userId, profileName, goalId, variantId, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const title = normalizeExtraGoalTitle(payload?.title);
  const intervalValue = Math.min(999, Math.max(1, Math.trunc(Number(payload?.intervalValue || 1))));
  const intervalUnit = normalizeExtraGoalVariantUnit(payload?.intervalUnit);
  if (!title) throw new Error("Informe o nome da micro-tarefa.");
  const result = await query(`
    update extra_goal_variants set title = $5, interval_value = $6, interval_unit = $7, updated_at = now()
    where id = $4 and goal_id = $3 and user_id = $1 and assigned_profile = $2
  `, [userId, normalizedProfile, goalId, variantId, title, intervalValue, intervalUnit]);
  if (!result.rowCount) throw new Error("Micro-tarefa nao encontrada.");
  return listExtraGoalVariants(userId, normalizedProfile, goalId);
}

export async function deleteExtraGoalVariant(userId, profileName, goalId, variantId) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  await query(`delete from extra_goal_variants where id = $4 and goal_id = $3 and user_id = $1 and assigned_profile = $2`,
    [userId, normalizedProfile, goalId, variantId]);
  return listExtraGoalVariants(userId, normalizedProfile, goalId);
}

async function syncExtraGoalProgressHistory(userId, goal, dateKey = toDateKey()) {
  const goalId = String(goal?.id || "").trim();
  const normalizedProfile = normalizeExtraGoalProfile(goal?.profileName);
  if (!goalId || !normalizedProfile || !getStoredDateKey(dateKey)) {
    return;
  }
  const progressValue = Math.max(0, Math.trunc(Number(goal?.progressValue || 0) || 0));
  const targetValue = Math.max(1, Math.trunc(Number(goal?.targetValue || 0) || 1));
  await query(
    `
      insert into extra_goal_progress_history (
        user_id, goal_id, assigned_profile, scope_date, progress_value, target_value, updated_at
      )
      values ($1, $2, $3, $4::date, $5, $6, now())
      on conflict (user_id, goal_id, scope_date)
      do update
         set assigned_profile = excluded.assigned_profile,
             progress_value = excluded.progress_value,
             target_value = excluded.target_value,
             updated_at = now()
    `,
    [userId, goalId, normalizedProfile, dateKey, progressValue, targetValue]
  );
}

async function syncCurrentExtraGoalHistory(userId, goals = [], dateKey = toDateKey()) {
  for (const goal of Array.isArray(goals) ? goals : []) {
    if (Number(goal?.progressValue || 0) > 0) {
      await syncExtraGoalProgressHistory(userId, goal, dateKey);
    }
  }
}

export async function listExtraGoals(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, date = new Date()) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  await ensureDefaultExtraGoals(userId, normalizedProfile);
  const dateKey = toDateKey(date);
  const result = await query(
    `
      select
        id,
        user_id,
        assigned_profile,
        title,
        target_value,
        unit_duration_minutes,
        unit_duration_seconds,
        svg_icon_url,
        svg_icon_label,
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
  const goals = result.rows
    .map((row) => normalizeExtraGoalRow(row, dateKey))
    .sort((left, right) => {
      const leftOrder = getDefaultExtraGoalOrder(left.title);
      const rightOrder = getDefaultExtraGoalOrder(right.title);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left.title || "").localeCompare(String(right.title || ""), "pt-BR");
    });
  const variantsResult = await query(`
    select id, goal_id, title, interval_value, interval_unit, last_completed_at, created_at, updated_at
    from extra_goal_variants
    where user_id = $1 and assigned_profile = $2
    order by created_at asc, id asc
  `, [userId, normalizedProfile]);
  const variantsByGoalId = new Map();
  for (const row of variantsResult.rows) {
    const goalId = String(row.goal_id || "").trim();
    if (!variantsByGoalId.has(goalId)) {
      variantsByGoalId.set(goalId, []);
    }
    variantsByGoalId.get(goalId).push(normalizeExtraGoalVariantRow(row));
  }
  const goalsWithVariants = goals.map((goal) => {
    const variants = variantsByGoalId.get(String(goal.id || "").trim()) || [];
    return {
      ...goal,
      variantCount: variants.length,
      variants
    };
  });
  await syncCurrentExtraGoalHistory(userId, goalsWithVariants, dateKey);
  return goalsWithVariants;
}

export async function listExtraGoalsByScope(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, scopeKey = "today") {
  const scope = getExtraGoalHistoryScope(scopeKey);
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const goals = await listExtraGoals(userId, normalizedProfile);
  if (scope.key === "today") {
    return {
      scope,
      goals
    };
  }

  const endDateKey = toDateKey();
  const startDateKey = toDateKey(new Date(Date.now() - ((scope.days - 1) * 24 * 60 * 60 * 1000)));
  const result = await query(
    `
      select
        goal_id,
        count(*) filter (where progress_value >= target_value and target_value > 0) as completed_days,
        count(*) filter (where progress_value > 0) as active_days,
        coalesce(sum(progress_value), 0) as total_progress_value,
        max(updated_at) as updated_at
      from extra_goal_progress_history
      where user_id = $1
        and assigned_profile = $2
        and scope_date >= $3::date
        and scope_date <= $4::date
      group by goal_id
    `,
    [userId, normalizedProfile, startDateKey, endDateKey]
  );
  const historyByGoalId = new Map(result.rows.map((row) => [String(row.goal_id || "").trim(), row]));
  return {
    scope: {
      ...scope,
      startDateKey,
      endDateKey
    },
    goals: goals.map((goal) => {
      const history = historyByGoalId.get(String(goal.id || "").trim()) || {};
      const totalProgressValue = Math.max(0, Math.trunc(Number(history.total_progress_value || 0) || 0));
      const expandedTargetValue = Math.max(1, Math.trunc(Number(goal.targetValue || 1) || 1)) * scope.days;
      return {
        ...goal,
        isHistoryRange: true,
        totalProgressValue,
        progressValue: totalProgressValue,
        targetValue: expandedTargetValue,
        remainingValue: Math.max(0, expandedTargetValue - totalProgressValue),
        percent: expandedTargetValue > 0 ? Math.max(0, Math.min(100, Math.round((totalProgressValue / expandedTargetValue) * 100))) : 0,
        scopeKey: scope.key
      };
    })
  };
}

export async function getExtraGoalById(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, date = new Date()) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  const dateKey = toDateKey(date);
  const result = await query(
    `
      select
        id,
        user_id,
        assigned_profile,
        title,
        target_value,
        unit_duration_minutes,
        unit_duration_seconds,
        svg_icon_url,
        svg_icon_label,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key,
        created_at,
        updated_at
      from extra_goals
      where user_id = $1
        and assigned_profile = $2
        and id = $3
      limit 1
    `,
    [userId, normalizedProfile, safeGoalId]
  );
  const row = result.rows[0];
  return row ? normalizeExtraGoalRow(row, dateKey) : null;
}

export async function createExtraGoal(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const title = normalizeExtraGoalTitle(payload?.title);
  const targetValue = Math.max(1, Math.trunc(Number(payload?.targetValue) || 0));
  const storedSvgDefault = await getStoredExtraGoalSvgDefault(userId, normalizedProfile, title);
  const svgIconUrl = String(payload?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  if (!title) {
    throw new Error("Informe o nome da missao.");
  }
  if (!targetValue) {
    throw new Error("Informe a unidade diaria da missao.");
  }
  const unitDurationSeconds = Math.min(EXTRA_GOAL_MAX_DURATION_SECONDS, Math.max(0, Math.trunc(Number(
    payload?.unitDurationSeconds ?? (Number(payload?.unitDurationMinutes || 0) * 60)
  ) || 0)));
  const unitDurationMinutes = Math.max(0, Math.trunc(unitDurationSeconds / 60));
  await query(
    `
      insert into extra_goals (
        user_id, assigned_profile, title, target_value, unit_duration_minutes, unit_duration_seconds, svg_icon_url, svg_icon_label, progress_value, progress_date, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, 0, null, now(), now())
    `,
    [userId, normalizedProfile, title, targetValue, unitDurationMinutes, unitDurationSeconds, svgIconUrl, svgIconLabel]
  );
  if (svgIconUrl) {
    await saveExtraGoalSvgDefault(userId, normalizedProfile, title, svgIconUrl, svgIconLabel);
  }
  return listExtraGoals(userId, normalizedProfile);
}

export async function updateExtraGoalProgress(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, delta, date = new Date(), variantId = "", variantIds = []) {
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
  const safeVariantIds = [...new Set([
    ...(Array.isArray(variantIds) ? variantIds : []),
    variantId
  ].map((value) => String(value || "").trim()).filter(Boolean))].slice(0, EXTRA_GOAL_MAX_CYCLES);
  if (safeDelta > 0 && safeVariantIds.length) {
    await query(`
      update extra_goal_variants set last_completed_at = now(), updated_at = now()
      where id = any($4::uuid[]) and goal_id = $1 and user_id = $2 and assigned_profile = $3
    `, [safeGoalId, userId, normalizedProfile, safeVariantIds]);
  }
  const goals = await listExtraGoals(userId, normalizedProfile, dateKey);
  const updatedGoal = goals.find((goal) => String(goal.id || "").trim() === safeGoalId) || null;
  if (updatedGoal) {
    await syncExtraGoalProgressHistory(userId, updatedGoal, dateKey);
  }
  return goals;
}

export async function updateExtraGoal(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  const nextTargetValue = Math.max(1, Math.trunc(Number(payload?.targetValue) || 0));
  const currentGoal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  const currentTitle = normalizeExtraGoalTitle(currentGoal?.title || payload?.title);
  const storedSvgDefault = await getStoredExtraGoalSvgDefault(userId, normalizedProfile, currentTitle);
  const svgIconUrl = String(payload?.svgIconUrl || currentGoal?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || currentGoal?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  const nextUnitDurationSeconds = Math.min(EXTRA_GOAL_MAX_DURATION_SECONDS, Math.max(0, Math.trunc(Number(
    payload?.unitDurationSeconds
      ?? (payload?.unitDurationMinutes !== undefined ? Number(payload.unitDurationMinutes || 0) * 60 : currentGoal?.unitDurationSeconds)
      ?? 0
  ) || 0)));
  const nextUnitDurationMinutes = Math.max(0, Math.trunc(nextUnitDurationSeconds / 60));
  if (!nextTargetValue) {
    throw new Error("Informe a unidade diaria da missao.");
  }
  await query(
    `
      update extra_goals
      set target_value = $4,
          unit_duration_minutes = $5,
          unit_duration_seconds = $6,
          svg_icon_url = $7,
          svg_icon_label = $8,
          updated_at = now()
      where id = $1
        and user_id = $2
        and assigned_profile = $3
    `,
    [safeGoalId, userId, normalizedProfile, nextTargetValue, nextUnitDurationMinutes, nextUnitDurationSeconds, svgIconUrl, svgIconLabel]
  );
  if (svgIconUrl && currentTitle) {
    await saveExtraGoalSvgDefault(userId, normalizedProfile, currentTitle, svgIconUrl, svgIconLabel);
    await applyExtraGoalSvgDefaultToMatchingGoals(userId, normalizedProfile, currentTitle, svgIconUrl, svgIconLabel);
  }
  const goals = await listExtraGoals(userId, normalizedProfile);
  const updatedGoal = goals.find((goal) => String(goal.id || "").trim() === safeGoalId) || null;
  if (updatedGoal) {
    await syncExtraGoalProgressHistory(userId, updatedGoal, toDateKey());
  }
  return goals;
}

export async function updateExtraGoalSvgIcon(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  const svgIconUrl = String(payload?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || "").trim();
  const result = await query(
    `
      update extra_goals
         set svg_icon_url = $4,
             svg_icon_label = $5,
             updated_at = now()
       where id = $1
         and user_id = $2
         and assigned_profile = $3
       returning id
    `,
    [safeGoalId, userId, normalizedProfile, svgIconUrl, svgIconLabel]
  );
  if (!result.rows[0]) {
    throw new Error("Missao nao encontrada.");
  }
  const currentGoal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  const currentTitle = normalizeExtraGoalTitle(currentGoal?.title || "");
  if (svgIconUrl && currentTitle) {
    await saveExtraGoalSvgDefault(userId, normalizedProfile, currentTitle, svgIconUrl, svgIconLabel);
    await applyExtraGoalSvgDefaultToMatchingGoals(userId, normalizedProfile, currentTitle, svgIconUrl, svgIconLabel);
  }
  return getExtraGoalById(userId, normalizedProfile, safeGoalId);
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
