import { db, query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";
import { getProject200ConfirmedSleepOverlapSeconds, subtractProject200ConfirmedSleepFromIntervals } from "./project200-sleep.js";

const EXTRA_GOALS_TIME_ZONE = "America/Sao_Paulo";
const EXTRA_GOAL_MAX_DURATION_SECONDS = 180 * 60;
const EXTRA_GOAL_MAX_CYCLES = 12;
const DEFAULT_ACTIVE_TIME_START_MINUTES = 8 * 60;
const DEFAULT_ACTIVE_TIME_END_MINUTES = 24 * 60;
const EXTRA_GOAL_CATEGORY_IDS = new Set([
  "alimentacao", "hidratacao", "aprendizado", "trabalho", "casa", "exercicios",
  "social", "planejamento", "higiene", "lazer", "aspecto"
]);
export const EXTRA_GOAL_HISTORY_SCOPES = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "last7", label: "Ultimos 7 dias", days: 7 },
  { key: "last15", label: "Ultimos 15 dias", days: 15 },
  { key: "last30", label: "Ultimos 30 dias", days: 30 }
];
const DEFAULT_EXTRA_GOALS = [];

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

function normalizeExtraGoalKind(value) {
  return String(value || "goal").trim().toLowerCase() === "limit" ? "limit" : "goal";
}

const ALL_EXTRA_GOAL_REPEAT_DAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeExtraGoalRepeatDays(value, fallback = ALL_EXTRA_GOAL_REPEAT_DAYS) {
  const source = Array.isArray(value) ? value : fallback;
  return [...new Set(source.map((day) => Math.trunc(Number(day))).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
}

function normalizeLimitIntervalUnit(value) {
  const normalized = String(value || "day").trim().toLowerCase();
  return ["day", "week", "month", "year"].includes(normalized) ? normalized : "day";
}

function normalizeExtraGoalCategoryId(value) {
  const normalized = String(value || "planejamento").trim().toLowerCase();
  return EXTRA_GOAL_CATEGORY_IDS.has(normalized) ? normalized : "planejamento";
}

const extraGoalTimeZonePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: EXTRA_GOALS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getExtraGoalTimeZoneOffsetMs(value) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = extraGoalTimeZonePartsFormatter.formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const representedAsUtc = Date.UTC(
    read("year"),
    Math.max(0, read("month") - 1),
    Math.max(1, read("day")),
    read("hour"),
    read("minute"),
    read("second")
  );
  return representedAsUtc - date.getTime();
}

function extraGoalDateKeyToMidnight(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(Number.NaN);
  const wallClockUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let timestamp = wallClockUtc;
  for (let index = 0; index < 3; index += 1) {
    timestamp = wallClockUtc - getExtraGoalTimeZoneOffsetMs(new Date(timestamp));
  }
  return new Date(timestamp);
}

function addLimitIntervalDateKey(startValue, intervalValue, intervalUnit) {
  const amount = Math.max(1, Math.min(999, Math.trunc(Number(intervalValue) || 1)));
  const unit = normalizeLimitIntervalUnit(intervalUnit);
  const startKey = toDateKey(startValue);
  const [year, month, day] = startKey.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day, 12));
  if (unit === "day" || unit === "week") {
    result.setUTCDate(result.getUTCDate() + (unit === "week" ? amount * 7 : amount));
  } else {
    const originalDay = result.getUTCDate();
    result.setUTCDate(1);
    if (unit === "month") result.setUTCMonth(result.getUTCMonth() + amount);
    else result.setUTCFullYear(result.getUTCFullYear() + amount);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(originalDay, lastDay));
  }
  return [
    String(result.getUTCFullYear()).padStart(4, "0"),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function addLimitInterval(startValue, intervalValue, intervalUnit) {
  return extraGoalDateKeyToMidnight(addLimitIntervalDateKey(startValue, intervalValue, intervalUnit));
}

export function resolveLimitCycleWindow(startValue, intervalValue, intervalUnit, nowValue = new Date()) {
  const now = nowValue instanceof Date && !Number.isNaN(nowValue.getTime()) ? nowValue : new Date();
  let start = new Date(startValue);
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime()) start = new Date(now);
  let end = addLimitInterval(start, intervalValue, intervalUnit);
  let advanced = false;
  let guard = 0;
  while (end.getTime() <= now.getTime() && guard < 5000) {
    start = end;
    end = addLimitInterval(start, intervalValue, intervalUnit);
    advanced = true;
    guard += 1;
  }
  return { start, end, advanced };
}

function normalizeExtraGoalVariantUnit(value) {
  return String(value || "days").trim().toLowerCase() === "hours" ? "hours" : "days";
}

function normalizeExtraGoalVariantScheduleMode(value) {
  return String(value || "periodic").trim().toLowerCase() === "weekly" ? "weekly" : "periodic";
}

function normalizeActiveTimeMinutes(value, fallback, { allowEndOfDay = false } = {}) {
  const maximum = allowEndOfDay ? 24 * 60 : (24 * 60) - 1;
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(maximum, number));
}

function normalizeActiveTimeRow(row = {}) {
  const startMinutes = normalizeActiveTimeMinutes(row.active_start_minutes, DEFAULT_ACTIVE_TIME_START_MINUTES);
  let endMinutes = normalizeActiveTimeMinutes(row.active_end_minutes, DEFAULT_ACTIVE_TIME_END_MINUTES, { allowEndOfDay: true });
  if (endMinutes === startMinutes) endMinutes = DEFAULT_ACTIVE_TIME_END_MINUTES;
  return {
    startMinutes,
    endMinutes,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

function normalizeExtraGoalProgressEventRow(row, latestId = "") {
  const id = String(row?.id || "").trim();
  return {
    id,
    goalId: String(row?.goal_id || "").trim(),
    value: Math.max(1, Math.trunc(Number(row?.delta_value || 1))),
    originalValue: Math.max(1, Math.trunc(Number(row?.original_delta_value || row?.delta_value || 1))),
    occurredAt: row?.occurred_at ? new Date(row.occurred_at).toISOString() : null,
    createdAt: row?.created_at ? new Date(row.created_at).toISOString() : null,
    editedAt: row?.edited_at ? new Date(row.edited_at).toISOString() : null,
    isLatest: Boolean(latestId && id === latestId)
  };
}

async function buildExtraGoalBestIntervals(userId, profileName, events = []) {
  const chronological = [...events]
    .filter((event) => event?.occurredAt)
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  const intervals = chronological.slice(1).map((event, index) => {
    const previous = chronological[index];
    const fromMs = new Date(previous.occurredAt).getTime();
    const toMs = new Date(event.occurredAt).getTime();
    return {
      fromEventId: previous.id,
      toEventId: event.id,
      fromAt: previous.occurredAt,
      toAt: event.occurredAt,
      grossDurationSeconds: Math.max(0, Math.floor((toMs - fromMs) / 1000))
    };
  });
  const netIntervals = await subtractProject200ConfirmedSleepFromIntervals(userId, profileName, intervals);
  const chronologicalIntervals = netIntervals
    .filter((interval) => interval.durationSeconds > 0)
    .sort((left, right) => new Date(left.toAt).getTime() - new Date(right.toAt).getTime());
  const rankedIntervals = netIntervals
    .filter((interval) => interval.durationSeconds > 0)
    .sort((left, right) => right.durationSeconds - left.durationSeconds);
  const rankedIntervalPositionByEventId = new Map(rankedIntervals.map((interval, index) => [String(interval.toEventId || ""), index + 1]));
  let cumulativeDurationSeconds = 0;
  const eventInsights = Object.fromEntries(chronologicalIntervals.map((interval, index) => {
    const durationSeconds = Math.max(0, Number(interval.durationSeconds || 0));
    const previousInterval = index > 0 ? chronologicalIntervals[index - 1] : null;
    const previousIntervalDurationSeconds = Math.max(0, Number(previousInterval?.durationSeconds || 0));
    const previousAverageDurationSeconds = index > 0
      ? Math.round(cumulativeDurationSeconds / index)
      : 0;
    cumulativeDurationSeconds += durationSeconds;
    const averageDurationSecondsAtEvent = Math.round(cumulativeDurationSeconds / (index + 1));
    return [String(interval.toEventId || ""), {
      intervalDurationSeconds: durationSeconds,
      previousIntervalDurationSeconds,
      intervalChangePercent: previousIntervalDurationSeconds > 0
        ? ((durationSeconds - previousIntervalDurationSeconds) / previousIntervalDurationSeconds) * 100
        : null,
      averageDurationSecondsAtEvent,
      previousAverageDurationSeconds,
      averageChangePercent: previousAverageDurationSeconds > 0
        ? ((averageDurationSecondsAtEvent - previousAverageDurationSeconds) / previousAverageDurationSeconds) * 100
        : null,
      intervalRank: rankedIntervalPositionByEventId.get(String(interval.toEventId || "")) || index + 1,
      averageRankAtEvent: chronologicalIntervals.reduce((rank, current) => rank + (Number(current.durationSeconds || 0) > averageDurationSecondsAtEvent ? 1 : 0), 1)
    }];
  }));
  const averageDurationSeconds = rankedIntervals.length
    ? Math.round(rankedIntervals.reduce((sum, interval) => sum + Number(interval.durationSeconds || 0), 0) / rankedIntervals.length)
    : 0;
  return {
    bestIntervals: rankedIntervals.slice(0, 50).map((interval, index) => ({ ...interval, rank: index + 1 })),
    intervalDurationsSeconds: rankedIntervals.map((interval) => Math.max(0, Number(interval.durationSeconds || 0))),
    averageDurationSeconds,
    intervalCount: rankedIntervals.length,
    eventInsights
  };
}

function normalizeScheduleConfig(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function normalizeExtraGoalVariantRow(row) {
  const unitDurationSeconds = Math.max(0, Math.trunc(Number(row.unit_duration_seconds || 0) || 0));
  return {
    id: row.id,
    goalId: row.goal_id,
    title: normalizeExtraGoalTitle(row.title),
    targetValue: Math.max(1, Math.min(999999, Math.trunc(Number(row.target_value || 1) || 1))),
    intervalValue: Math.max(1, Math.trunc(Number(row.interval_value || 1))),
    intervalUnit: normalizeExtraGoalVariantUnit(row.interval_unit),
    unitDurationSeconds,
    scheduleMode: normalizeExtraGoalVariantScheduleMode(row.schedule_mode),
    repeatDays: normalizeExtraGoalVariantScheduleMode(row.schedule_mode) === "weekly"
      ? normalizeExtraGoalRepeatDays(row.repeat_days, [])
      : [],
    avoidDays: normalizeExtraGoalVariantScheduleMode(row.schedule_mode) === "periodic"
      ? normalizeExtraGoalRepeatDays(row.avoid_days, [])
      : [],
    scheduleConfig: normalizeScheduleConfig(row.schedule_config),
    repeatConfig: normalizeScheduleConfig(row.schedule_config),
    nextDueAt: row.next_due_at ? new Date(row.next_due_at).toISOString() : null,
    lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

function normalizeVariantDurationSeconds(value) {
  return Math.max(0, Math.min(10800, Math.trunc(Number(value || 0) || 0)));
}

function normalizeVariantNextDueAt(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getExtraGoalVariantWeekday(value) {
  const dateKey = toDateKey(value);
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, Math.max(0, month - 1), Math.max(1, day), 12)).getUTCDay();
}

function addExtraGoalVariantDays(value, amount) {
  return new Date(new Date(value).getTime() + (Math.trunc(Number(amount) || 0) * 86400000));
}

function alignExtraGoalVariantDueAt(variant, candidateValue) {
  const candidate = new Date(candidateValue);
  const safeCandidate = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  const scheduleMode = normalizeExtraGoalVariantScheduleMode(variant?.scheduleMode ?? variant?.schedule_mode);
  if (scheduleMode === "weekly") {
    const repeatDays = normalizeExtraGoalRepeatDays(variant?.repeatDays ?? variant?.repeat_days, []);
    if (!repeatDays.length) return safeCandidate;
    for (let offset = 0; offset < 7; offset += 1) {
      const next = addExtraGoalVariantDays(safeCandidate, offset);
      if (repeatDays.includes(getExtraGoalVariantWeekday(next))) return next;
    }
    return safeCandidate;
  }
  const avoidDays = normalizeExtraGoalRepeatDays(variant?.avoidDays ?? variant?.avoid_days, []);
  let next = safeCandidate;
  for (let guard = 0; guard < 7 && avoidDays.includes(getExtraGoalVariantWeekday(next)); guard += 1) {
    next = addExtraGoalVariantDays(next, 1);
  }
  return next;
}

export function resolveNextExtraGoalVariantDueAt(variant, fromValue = new Date()) {
  const from = new Date(fromValue);
  const safeFrom = Number.isNaN(from.getTime()) ? new Date() : from;
  const scheduleMode = normalizeExtraGoalVariantScheduleMode(variant?.scheduleMode ?? variant?.schedule_mode);
  if (scheduleMode === "weekly") {
    return alignExtraGoalVariantDueAt(variant, addExtraGoalVariantDays(safeFrom, 1)).toISOString();
  }
  const intervalValue = Math.max(1, Math.min(999, Math.trunc(Number(variant?.intervalValue ?? variant?.interval_value ?? 1) || 1)));
  const intervalUnit = normalizeExtraGoalVariantUnit(variant?.intervalUnit ?? variant?.interval_unit);
  const intervalMs = intervalValue * (intervalUnit === "hours" ? 3600000 : 86400000);
  return alignExtraGoalVariantDueAt(variant, new Date(safeFrom.getTime() + intervalMs)).toISOString();
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
  const goalKind = normalizeExtraGoalKind(row.goal_kind);
  const storedDateKey = getStoredDateKey(row.progress_date_key) || getStoredDateKey(row.progress_date);
  const limitIntervalValue = Math.max(1, Math.min(999, Math.trunc(Number(row.limit_interval_value || 1))));
  const limitIntervalUnit = normalizeLimitIntervalUnit(row.limit_interval_unit);
  const limitCycle = resolveLimitCycleWindow(
    row.limit_cycle_started_at || row.created_at || new Date(),
    limitIntervalValue,
    limitIntervalUnit
  );
  const progressValue = goalKind === "limit" ? (limitCycle.advanced ? 0 : rawProgress) : (storedDateKey === dateKey ? rawProgress : 0);
  const unitDurationMinutes = goalKind === "limit" ? 0 : Math.max(0, Math.trunc(Number(row.unit_duration_minutes || 0) || 0));
  const storedUnitDurationSeconds = goalKind === "limit" ? 0 : Math.max(0, Math.trunc(Number(row.unit_duration_seconds || 0) || 0));
  const unitDurationSeconds = storedUnitDurationSeconds || (unitDurationMinutes * 60);
  return {
    id: row.id,
    userId: row.user_id,
    profileName: normalizeExtraGoalProfile(row.assigned_profile),
    title: normalizeExtraGoalTitle(row.title),
    categoryId: normalizeExtraGoalCategoryId(row.category_id),
    goalKind,
    isFolder: row.is_folder === true,
    repeatDays: normalizeExtraGoalRepeatDays(row.repeat_days),
    scheduleConfig: normalizeScheduleConfig(row.schedule_config),
    repeatConfig: normalizeScheduleConfig(row.schedule_config),
    svgIconUrl: String(row.svg_icon_url || "").trim(),
    svgIconLabel: String(row.svg_icon_label || "").trim(),
    targetValue,
    unitDurationMinutes,
    unitDurationSeconds,
    limitIntervalValue,
    limitIntervalUnit,
    countSleepTime: row.count_sleep_time !== false,
    sleepExcludedSeconds: 0,
    limitCycleStartedAt: limitCycle.start.toISOString(),
    limitCycleEndsAt: limitCycle.end.toISOString(),
    progressValue,
    lastProgressAt: row.last_progress_at ? new Date(row.last_progress_at).toISOString() : null,
    remainingValue: Math.max(0, targetValue - progressValue),
    percent: Math.max(0, Math.min(100, Math.round((progressValue / targetValue) * 100))),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

function getExtraGoalHistoryScope(scopeKey = "today") {
  const normalized = String(scopeKey || "today").trim().toLowerCase();
  const dynamicMatch = normalized.match(/^days-(\d+)$/);
  if (dynamicMatch) {
    const days = Math.max(1, Math.min(3650, Math.trunc(Number(dynamicMatch[1]) || 1)));
    return { key: `days-${days}`, label: `${days} dias`, days };
  }
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
      category_id text not null default 'planejamento',
      goal_kind text not null default 'goal',
      target_value integer not null default 1,
      unit_duration_minutes integer not null default 0,
      unit_duration_seconds integer not null default 0,
      limit_interval_value integer not null default 1,
      limit_interval_unit text not null default 'day',
      limit_cycle_started_at timestamptz not null default now(),
      count_sleep_time boolean not null default true,
      is_folder boolean not null default false,
      repeat_days jsonb not null default '[0,1,2,3,4,5,6]'::jsonb,
      schedule_config jsonb,
      svg_icon_url text not null default '',
      svg_icon_label text not null default '',
      progress_value integer not null default 0,
      progress_date date,
      last_progress_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table extra_goals add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table extra_goals add column if not exists category_id text not null default 'planejamento';");
  await query("update extra_goals set category_id = 'planejamento' where category_id is null or btrim(category_id) = '';");
  await query("alter table extra_goals add column if not exists goal_kind text not null default 'goal';");
  await query("update extra_goals set goal_kind = 'goal' where goal_kind is null or goal_kind not in ('goal', 'limit');");
  await query("alter table extra_goals add column if not exists progress_value integer not null default 0;");
  await query("alter table extra_goals add column if not exists progress_date date;");
  await query("alter table extra_goals add column if not exists last_progress_at timestamptz;");
  await query("alter table extra_goals add column if not exists unit_duration_minutes integer not null default 0;");
  await query("alter table extra_goals add column if not exists unit_duration_seconds integer not null default 0;");
  await query("alter table extra_goals add column if not exists limit_interval_value integer not null default 1;");
  await query("alter table extra_goals add column if not exists limit_interval_unit text not null default 'day';");
  await query("alter table extra_goals add column if not exists limit_cycle_started_at timestamptz not null default now();");
  await query("alter table extra_goals add column if not exists count_sleep_time boolean not null default true;");
  await query("alter table extra_goals add column if not exists is_folder boolean not null default false;");
  await query("alter table extra_goals add column if not exists repeat_days jsonb not null default '[0,1,2,3,4,5,6]'::jsonb;");
  await query("alter table extra_goals add column if not exists schedule_config jsonb;");
  await query("update extra_goals set limit_interval_value = 1 where limit_interval_value is null or limit_interval_value < 1;");
  await query("update extra_goals set limit_interval_unit = 'day' where limit_interval_unit is null or limit_interval_unit not in ('day', 'week', 'month', 'year');");
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
  await query(`
    create table if not exists extra_goal_progress_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      goal_id uuid not null references extra_goals(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      delta_value integer not null,
      original_delta_value integer not null,
      occurred_at timestamptz not null default now(),
      edited_at timestamptz,
      deleted_at timestamptz,
      created_at timestamptz not null default now(),
      constraint extra_goal_progress_events_positive check (delta_value > 0),
      constraint extra_goal_progress_events_original_positive check (original_delta_value > 0)
    );
  `);
  await query("alter table extra_goal_progress_events add column if not exists original_delta_value integer;");
  await query("update extra_goal_progress_events set original_delta_value = delta_value where original_delta_value is null;");
  await query("alter table extra_goal_progress_events alter column original_delta_value set not null;");
  await query("alter table extra_goal_progress_events add column if not exists occurred_at timestamptz not null default now();");
  await query("alter table extra_goal_progress_events add column if not exists edited_at timestamptz;");
  await query("alter table extra_goal_progress_events add column if not exists deleted_at timestamptz;");
  await query("create index if not exists idx_extra_goal_progress_events_timeline on extra_goal_progress_events(user_id, assigned_profile, goal_id, occurred_at desc, created_at desc);");
  await query(`
    insert into extra_goal_progress_events (
      user_id, goal_id, assigned_profile, delta_value, original_delta_value, occurred_at, created_at
    )
    select
      goal.user_id,
      goal.id,
      goal.assigned_profile,
      goal.progress_value,
      goal.progress_value,
      goal.last_progress_at,
      coalesce(goal.updated_at, goal.last_progress_at)
    from extra_goals goal
    where goal.goal_kind = 'limit'
      and goal.progress_value > 0
      and goal.last_progress_at is not null
      and not exists (
        select 1 from extra_goal_progress_events event
        where event.user_id = goal.user_id
          and event.goal_id = goal.id
          and event.assigned_profile = goal.assigned_profile
      )
  `);
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
      target_value integer not null default 1,
      interval_unit text not null default 'days',
      repeat_days jsonb not null default '[0,1,2,3,4,5,6]'::jsonb,
      last_completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("alter table extra_goal_variants add column if not exists target_value integer not null default 1;");
  await query("alter table extra_goal_variants add column if not exists unit_duration_seconds integer not null default 0;");
  await query("alter table extra_goal_variants add column if not exists next_due_at timestamptz;");
  await query("alter table extra_goal_variants add column if not exists repeat_days jsonb not null default '[0,1,2,3,4,5,6]'::jsonb;");
  await query("alter table extra_goal_variants add column if not exists schedule_mode text not null default 'periodic';");
  await query("alter table extra_goal_variants add column if not exists avoid_days jsonb not null default '[]'::jsonb;");
  await query("alter table extra_goal_variants add column if not exists schedule_config jsonb;");
  await query("update extra_goal_variants set schedule_mode = 'periodic' where schedule_mode is null or schedule_mode not in ('weekly', 'periodic');");
  await query("update extra_goal_variants set repeat_days = '[]'::jsonb where schedule_mode = 'periodic' and repeat_days <> '[]'::jsonb;");
  await query("update extra_goal_variants set avoid_days = '[]'::jsonb where schedule_mode = 'weekly' and avoid_days <> '[]'::jsonb;");
  await query(`
    update extra_goal_variants variant
    set unit_duration_seconds = goal.unit_duration_seconds,
        updated_at = now()
    from extra_goals goal
    where variant.goal_id = goal.id
      and variant.unit_duration_seconds <= 0
      and goal.unit_duration_seconds > 0
  `);
  await query(`
    update extra_goals goal
    set is_folder = true,
        unit_duration_minutes = 0,
        unit_duration_seconds = 0,
        updated_at = now()
    where goal.goal_kind = 'goal'
      and exists (select 1 from extra_goal_variants variant where variant.goal_id = goal.id)
      and (goal.is_folder = false or goal.unit_duration_minutes > 0 or goal.unit_duration_seconds > 0)
  `);
  await query("create index if not exists idx_extra_goal_variants_owner on extra_goal_variants(user_id, goal_id, assigned_profile, updated_at desc);");
  await query(`
    create table if not exists project200_user_active_time (
      user_id uuid primary key references users(id) on delete cascade,
      active_start_minutes integer not null default 480,
      active_end_minutes integer not null default 1440,
      updated_at timestamptz not null default now(),
      constraint project200_active_start_range check (active_start_minutes between 0 and 1439),
      constraint project200_active_end_range check (active_end_minutes between 0 and 1440),
      constraint project200_active_time_not_equal check (active_start_minutes <> active_end_minutes)
    );
  `);
  await query(`
    create table if not exists project200_mission_installment_orders (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      unit_keys jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now(),
      primary key (user_id, assigned_profile)
    );
  `);
}

export async function getProject200ActiveTime(userId) {
  await ensureExtraGoalsSchema();
  await query(`insert into project200_user_active_time (user_id) values ($1) on conflict (user_id) do nothing`, [userId]);
  const result = await query(`
    select active_start_minutes, active_end_minutes, updated_at
    from project200_user_active_time
    where user_id = $1
    limit 1
  `, [userId]);
  return normalizeActiveTimeRow(result.rows[0]);
}

export async function updateProject200ActiveTime(userId, payload = {}) {
  await ensureExtraGoalsSchema();
  const startMinutes = normalizeActiveTimeMinutes(payload?.startMinutes, DEFAULT_ACTIVE_TIME_START_MINUTES);
  const endMinutes = normalizeActiveTimeMinutes(payload?.endMinutes, DEFAULT_ACTIVE_TIME_END_MINUTES, { allowEndOfDay: true });
  if (startMinutes === endMinutes) throw new Error("O tempo ativo precisa ter horários diferentes.");
  const result = await query(`
    insert into project200_user_active_time (user_id, active_start_minutes, active_end_minutes, updated_at)
    values ($1, $2, $3, now())
    on conflict (user_id) do update
    set active_start_minutes = excluded.active_start_minutes,
        active_end_minutes = excluded.active_end_minutes,
        updated_at = now()
    returning active_start_minutes, active_end_minutes, updated_at
  `, [userId, startMinutes, endMinutes]);
  return normalizeActiveTimeRow(result.rows[0]);
}

function buildProject200MissionUnitKey(goalId, installmentNumber) {
  return `${String(goalId || "").trim()}:${Math.max(1, Math.trunc(Number(installmentNumber || 1)))}`;
}

export async function getProject200MissionInstallmentOrder(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const goalsResult = await query(`
    select id, title, target_value, svg_icon_url, svg_icon_label
    from extra_goals
    where user_id = $1 and assigned_profile = $2
      and goal_kind = 'goal'
      and target_value between 1 and 3
    order by lower(title) asc, title asc, id asc
  `, [userId, normalizedProfile]);
  const alphabeticalUnits = goalsResult.rows.flatMap((row) => {
    const target = Math.max(1, Math.trunc(Number(row.target_value || 1)));
    return Array.from({ length: target }, (_, index) => ({
      unitKey: buildProject200MissionUnitKey(row.id, index + 1),
      goalId: String(row.id || ""),
      title: normalizeExtraGoalTitle(row.title),
      installmentNumber: index + 1,
      target,
      svgIconUrl: String(row.svg_icon_url || "").trim(),
      svgIconLabel: String(row.svg_icon_label || "").trim()
    }));
  });
  const validByKey = new Map(alphabeticalUnits.map((unit) => [unit.unitKey, unit]));
  const savedResult = await query(`
    select unit_keys, updated_at
    from project200_mission_installment_orders
    where user_id = $1 and assigned_profile = $2
    limit 1
  `, [userId, normalizedProfile]);
  const savedKeys = Array.isArray(savedResult.rows[0]?.unit_keys) ? savedResult.rows[0].unit_keys : [];
  const orderedKeys = [];
  const seen = new Set();
  savedKeys.forEach((value) => {
    const key = String(value || "").trim();
    if (validByKey.has(key) && !seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  });
  alphabeticalUnits.forEach((unit) => {
    if (!seen.has(unit.unitKey)) {
      seen.add(unit.unitKey);
      orderedKeys.push(unit.unitKey);
    }
  });
  const activeTime = await getProject200ActiveTime(userId);
  const startMinutes = normalizeActiveTimeMinutes(activeTime.startMinutes, DEFAULT_ACTIVE_TIME_START_MINUTES);
  const endMinutes = normalizeActiveTimeMinutes(activeTime.endMinutes, DEFAULT_ACTIVE_TIME_END_MINUTES, { allowEndOfDay: true });
  const durationMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : (1440 - startMinutes) + endMinutes;
  const totalUnits = Math.max(1, orderedKeys.length);
  return {
    profile: normalizedProfile,
    units: orderedKeys.map((key, index) => {
      const dueAbsoluteMinutes = startMinutes + (((index + 1) * durationMinutes) / totalUnits);
      return {
        ...validByKey.get(key),
        sortOrder: index,
        dueMinutes: Math.round(dueAbsoluteMinutes) % 1440,
        dueDayOffset: Math.floor(dueAbsoluteMinutes / 1440)
      };
    }),
    activeTime,
    updatedAt: savedResult.rows[0]?.updated_at ? new Date(savedResult.rows[0].updated_at).toISOString() : null
  };
}

export async function updateProject200MissionInstallmentOrder(userId, profileName, payload = {}) {
  const current = await getProject200MissionInstallmentOrder(userId, profileName);
  const validByKey = new Map(current.units.map((unit) => [unit.unitKey, unit]));
  const requestedKeys = Array.isArray(payload?.unitKeys) ? payload.unitKeys : [];
  const orderedKeys = [];
  const seen = new Set();
  requestedKeys.forEach((value) => {
    const key = String(value || "").trim();
    if (validByKey.has(key) && !seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  });
  current.units.forEach((unit) => {
    if (!seen.has(unit.unitKey)) {
      seen.add(unit.unitKey);
      orderedKeys.push(unit.unitKey);
    }
  });
  await query(`
    insert into project200_mission_installment_orders (user_id, assigned_profile, unit_keys, updated_at)
    values ($1, $2, $3::jsonb, now())
    on conflict (user_id, assigned_profile) do update
    set unit_keys = excluded.unit_keys,
        updated_at = now()
  `, [userId, current.profile, JSON.stringify(orderedKeys)]);
  return getProject200MissionInstallmentOrder(userId, current.profile);
}
export async function listExtraGoalVariants(userId, profileName, goalId) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  const goal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  if (!goal) throw new Error("Missao nao encontrada.");
  const result = await query(`
    select id, goal_id, title, target_value, interval_value, interval_unit, unit_duration_seconds, schedule_mode, repeat_days, avoid_days, schedule_config, next_due_at, last_completed_at, created_at, updated_at
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
  const targetValue = Math.min(999999, Math.max(1, Math.trunc(Number(payload?.targetValue || 1) || 1)));
  const intervalValue = Math.min(999, Math.max(1, Math.trunc(Number(payload?.intervalValue || 1))));
  const intervalUnit = normalizeExtraGoalVariantUnit(payload?.intervalUnit);
  const unitDurationSeconds = normalizeVariantDurationSeconds(payload?.unitDurationSeconds);
  const scheduleMode = normalizeExtraGoalVariantScheduleMode(payload?.scheduleMode);
  const repeatDays = scheduleMode === "weekly" ? normalizeExtraGoalRepeatDays(payload?.repeatDays, []) : [];
  const avoidDays = scheduleMode === "periodic" ? normalizeExtraGoalRepeatDays(payload?.avoidDays, []) : [];
  const requestedNextDueAt = normalizeVariantNextDueAt(payload?.nextDueAt);
  const scheduleConfig = normalizeScheduleConfig(payload?.scheduleConfig || payload?.repeatConfig);
  const nextDueAt = requestedNextDueAt
    ? alignExtraGoalVariantDueAt({ scheduleMode, repeatDays, avoidDays }, requestedNextDueAt).toISOString()
    : null;
  if (scheduleMode === "weekly" && !repeatDays.length) throw new Error("Escolha pelo menos um dia da semana.");
  if (scheduleMode === "periodic" && avoidDays.length >= 7) throw new Error("Deixe pelo menos um dia disponivel.");
  if (!title) throw new Error("Informe o nome da micro-tarefa.");
  const goal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  if (!goal) throw new Error("Missao nao encontrada.");
  await query(`
    insert into extra_goal_variants (user_id, goal_id, assigned_profile, title, target_value, interval_value, interval_unit, unit_duration_seconds, schedule_mode, repeat_days, avoid_days, schedule_config, next_due_at)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::timestamptz)
  `, [userId, safeGoalId, normalizedProfile, title, targetValue, intervalValue, intervalUnit, unitDurationSeconds, scheduleMode, JSON.stringify(repeatDays), JSON.stringify(avoidDays), scheduleConfig ? JSON.stringify(scheduleConfig) : null, nextDueAt]);
  return listExtraGoalVariants(userId, normalizedProfile, safeGoalId);
}

export async function updateExtraGoalVariant(userId, profileName, goalId, variantId, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const title = normalizeExtraGoalTitle(payload?.title);
  const targetValue = Math.min(999999, Math.max(1, Math.trunc(Number(payload?.targetValue || 1) || 1)));
  const intervalValue = Math.min(999, Math.max(1, Math.trunc(Number(payload?.intervalValue || 1))));
  const intervalUnit = normalizeExtraGoalVariantUnit(payload?.intervalUnit);
  const unitDurationSeconds = normalizeVariantDurationSeconds(payload?.unitDurationSeconds);
  const scheduleMode = normalizeExtraGoalVariantScheduleMode(payload?.scheduleMode);
  const repeatDays = scheduleMode === "weekly" ? normalizeExtraGoalRepeatDays(payload?.repeatDays, []) : [];
  const avoidDays = scheduleMode === "periodic" ? normalizeExtraGoalRepeatDays(payload?.avoidDays, []) : [];
  const requestedNextDueAt = normalizeVariantNextDueAt(payload?.nextDueAt);
  const scheduleConfig = normalizeScheduleConfig(payload?.scheduleConfig || payload?.repeatConfig);
  const nextDueAt = requestedNextDueAt
    ? alignExtraGoalVariantDueAt({ scheduleMode, repeatDays, avoidDays }, requestedNextDueAt).toISOString()
    : null;
  if (!title) throw new Error("Informe o nome da micro-tarefa.");
  if (scheduleMode === "weekly" && !repeatDays.length) throw new Error("Escolha pelo menos um dia da semana.");
  if (scheduleMode === "periodic" && avoidDays.length >= 7) throw new Error("Deixe pelo menos um dia disponivel.");
  const result = await query(`
    update extra_goal_variants set title = $5, target_value = $6, interval_value = $7, interval_unit = $8, unit_duration_seconds = $9, schedule_mode = $10, repeat_days = $11::jsonb, avoid_days = $12::jsonb, schedule_config = $13::jsonb, next_due_at = $14::timestamptz, updated_at = now()
    where id = $4 and goal_id = $3 and user_id = $1 and assigned_profile = $2
  `, [userId, normalizedProfile, goalId, variantId, title, targetValue, intervalValue, intervalUnit, unitDurationSeconds, scheduleMode, JSON.stringify(repeatDays), JSON.stringify(avoidDays), scheduleConfig ? JSON.stringify(scheduleConfig) : null, nextDueAt]);
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
        category_id,
        goal_kind,
        target_value,
        unit_duration_minutes,
        unit_duration_seconds,
        limit_interval_value,
        limit_interval_unit,
        limit_cycle_started_at,
        count_sleep_time,
        is_folder,
        repeat_days,
        schedule_config,
        svg_icon_url,
        svg_icon_label,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key,
        last_progress_at,
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
  const firstLimitProgressResult = await query(`
    select goal_id, min(occurred_at) as first_progress_at
    from extra_goal_progress_events
    where user_id = $1
      and assigned_profile = $2
      and deleted_at is null
      and (occurred_at at time zone '${EXTRA_GOALS_TIME_ZONE}')::date = $3::date
    group by goal_id
  `, [userId, normalizedProfile, dateKey]);
  const firstLimitProgressByGoalId = new Map(
    firstLimitProgressResult.rows.map((row) => [
      String(row.goal_id || "").trim(),
      row.first_progress_at ? new Date(row.first_progress_at).toISOString() : null
    ])
  );
  const variantsResult = await query(`
    select id, goal_id, title, target_value, interval_value, interval_unit, unit_duration_seconds, schedule_mode, repeat_days, avoid_days, schedule_config, next_due_at, last_completed_at, created_at, updated_at
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
  const goalsWithVariants = await Promise.all(goals.map(async (goal) => {
    const variants = variantsByGoalId.get(String(goal.id || "").trim()) || [];
    const sleepExcludedSeconds = goal.goalKind === "limit" && goal.countSleepTime === false && goal.lastProgressAt
      ? await getProject200ConfirmedSleepOverlapSeconds(userId, normalizedProfile, goal.lastProgressAt, new Date())
      : 0;
    return {
      ...goal,
      sleepExcludedSeconds,
      limitFirstProgressAt: firstLimitProgressByGoalId.get(String(goal.id || "").trim()) || null,
      variantCount: variants.length,
      variants
    };
  }));
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
      with first_entries as (
        select
          goal_id,
          to_char(min(scope_date), 'YYYY-MM-DD') as first_scope_date_key
        from extra_goal_progress_history
        where user_id = $1
          and assigned_profile = $2
        group by goal_id
      ),
      scoped_entries as (
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
      )
      select
        first_entries.goal_id,
        first_entries.first_scope_date_key,
        coalesce(scoped_entries.completed_days, 0) as completed_days,
        coalesce(scoped_entries.active_days, 0) as active_days,
        coalesce(scoped_entries.total_progress_value, 0) as total_progress_value,
        scoped_entries.updated_at
      from first_entries
      left join scoped_entries using (goal_id)
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
    goals: goals.flatMap((goal) => {
      const history = historyByGoalId.get(String(goal.id || "").trim());
      if (!history?.first_scope_date_key || history.first_scope_date_key > startDateKey) {
        return [];
      }
      const totalProgressValue = Math.max(0, Math.trunc(Number(history.total_progress_value || 0) || 0));
      const expandedTargetValue = Math.max(1, Math.trunc(Number(goal.targetValue || 1) || 1)) * scope.days;
      return [{
        ...goal,
        isHistoryRange: true,
        firstEntryDateKey: history.first_scope_date_key,
        totalProgressValue,
        progressValue: totalProgressValue,
        targetValue: expandedTargetValue,
        remainingValue: Math.max(0, expandedTargetValue - totalProgressValue),
        percent: expandedTargetValue > 0 ? Math.max(0, Math.min(100, Math.round((totalProgressValue / expandedTargetValue) * 100))) : 0,
        scopeKey: scope.key
      }];
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
        category_id,
        goal_kind,
        target_value,
        unit_duration_minutes,
        unit_duration_seconds,
        limit_interval_value,
        limit_interval_unit,
        limit_cycle_started_at,
        count_sleep_time,
        is_folder,
        repeat_days,
        schedule_config,
        svg_icon_url,
        svg_icon_label,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key,
        last_progress_at,
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
  const goalKind = normalizeExtraGoalKind(payload?.goalKind);
  const categoryId = normalizeExtraGoalCategoryId(payload?.categoryId);
  const storedSvgDefault = await getStoredExtraGoalSvgDefault(userId, normalizedProfile, title);
  const svgIconUrl = String(payload?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  if (!title) {
    throw new Error("Informe o nome da missao.");
  }
  if (!targetValue) {
    throw new Error("Informe a unidade diaria da missao.");
  }
  const limitIntervalValue = Math.max(1, Math.min(999, Math.trunc(Number(payload?.limitIntervalValue || 1))));
  const limitIntervalUnit = normalizeLimitIntervalUnit(payload?.limitIntervalUnit);
  const requestedDurationSeconds = Math.min(EXTRA_GOAL_MAX_DURATION_SECONDS, Math.max(0, Math.trunc(Number(
    payload?.unitDurationSeconds ?? (Number(payload?.unitDurationMinutes || 0) * 60)
  ) || 0)));
  const isFolder = goalKind !== "limit" && payload?.isFolder === true;
  const repeatDays = normalizeExtraGoalRepeatDays(payload?.repeatDays);
  const scheduleConfig = normalizeScheduleConfig(payload?.scheduleConfig || payload?.repeatConfig);
  const unitDurationSeconds = goalKind === "limit" || isFolder ? 0 : requestedDurationSeconds;
  const unitDurationMinutes = Math.max(0, Math.trunc(unitDurationSeconds / 60));
  await query(
    `
      insert into extra_goals (
        user_id, assigned_profile, title, category_id, goal_kind, target_value, unit_duration_minutes, unit_duration_seconds,
        limit_interval_value, limit_interval_unit, limit_cycle_started_at, is_folder, repeat_days, schedule_config,
        svg_icon_url, svg_icon_label, progress_value, progress_date, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11, $12::jsonb, $13::jsonb, $14, $15, 0, null, now(), now())
    `,
    [userId, normalizedProfile, title, categoryId, goalKind, targetValue, unitDurationMinutes, unitDurationSeconds, limitIntervalValue, limitIntervalUnit, isFolder, JSON.stringify(repeatDays), scheduleConfig ? JSON.stringify(scheduleConfig) : null, svgIconUrl, svgIconLabel]
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
        goal_kind,
        progress_value,
        progress_date,
        to_char(progress_date, 'YYYY-MM-DD') as progress_date_key,
        limit_interval_value,
        limit_interval_unit,
        limit_cycle_started_at,
        created_at
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
  const currentKind = normalizeExtraGoalKind(current.goal_kind);
  const limitCycle = resolveLimitCycleWindow(
    current.limit_cycle_started_at || current.created_at || date,
    current.limit_interval_value,
    current.limit_interval_unit,
    date instanceof Date ? date : new Date(date)
  );
  const currentProgress = currentKind === "limit"
    ? (limitCycle.advanced ? 0 : Math.max(0, Math.trunc(Number(current.progress_value || 0) || 0)))
    : ((getStoredDateKey(current.progress_date_key) || getStoredDateKey(current.progress_date)) === dateKey
      ? Math.max(0, Math.trunc(Number(current.progress_value || 0) || 0))
      : 0);
  if (currentKind === "limit" && safeDelta < 0) {
    throw new Error("Use o histórico para corrigir movimentações do limite.");
  }
  const nextProgress = Math.max(0, currentProgress + safeDelta);
  const limitClient = currentKind === "limit" ? await db?.connect() : null;
  if (currentKind === "limit" && !limitClient) {
    throw new Error("Banco de dados indisponível.");
  }
  try {
    if (limitClient) await limitClient.query("begin");
    const runner = limitClient || { query };
    await runner.query(
    `
      update extra_goals
      set progress_value = $4,
          progress_date = $5::date,
          limit_cycle_started_at = case when goal_kind = 'limit' then $7::timestamptz else limit_cycle_started_at end,
          last_progress_at = case when $6 > 0 then now() else last_progress_at end,
          updated_at = now()
      where id = $1
        and user_id = $2
        and assigned_profile = $3
    `,
    [safeGoalId, userId, normalizedProfile, nextProgress, dateKey, safeDelta, limitCycle.start.toISOString()]
    );
    if (limitClient && safeDelta > 0) {
      await limitClient.query(
        `
          insert into extra_goal_progress_events (
            user_id, goal_id, assigned_profile, delta_value, original_delta_value, occurred_at, created_at
          )
          values ($1, $2, $3, $4, $4, $5::timestamptz, now())
        `,
        [userId, safeGoalId, normalizedProfile, safeDelta, (date instanceof Date ? date : new Date(date)).toISOString()]
      );
    }
    if (limitClient) await limitClient.query("commit");
  } catch (error) {
    if (limitClient) await limitClient.query("rollback").catch(() => {});
    throw error;
  } finally {
    limitClient?.release();
  }
  const safeVariantIds = [...new Set([
    ...(Array.isArray(variantIds) ? variantIds : []),
    variantId
  ].map((value) => String(value || "").trim()).filter(Boolean))].slice(0, EXTRA_GOAL_MAX_CYCLES);
  if (safeDelta > 0 && safeVariantIds.length) {
    const completedAt = new Date();
    const completedVariants = await query(`
      select id, interval_value, interval_unit, schedule_mode, repeat_days, avoid_days
      from extra_goal_variants
      where id = any($4::uuid[]) and goal_id = $1 and user_id = $2 and assigned_profile = $3
    `, [safeGoalId, userId, normalizedProfile, safeVariantIds]);
    for (const variant of completedVariants.rows) {
      const nextDueAt = resolveNextExtraGoalVariantDueAt(variant, completedAt);
      await query(`
        update extra_goal_variants
        set last_completed_at = $5::timestamptz, next_due_at = $6::timestamptz, updated_at = now()
        where id = $4 and goal_id = $1 and user_id = $2 and assigned_profile = $3
      `, [safeGoalId, userId, normalizedProfile, variant.id, completedAt.toISOString(), nextDueAt]);
    }
  }
  const goals = await listExtraGoals(userId, normalizedProfile, dateKey);
  const updatedGoal = goals.find((goal) => String(goal.id || "").trim() === safeGoalId) || null;
  if (updatedGoal) {
    await syncExtraGoalProgressHistory(userId, updatedGoal, dateKey);
  }
  return goals;
}

export async function listExtraGoalProgressEvents(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  const goal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  if (!goal || normalizeExtraGoalKind(goal.goalKind) !== "limit") {
    throw new Error("Histórico disponível somente para limites.");
  }
  const result = await query(
    `
      select id, goal_id, delta_value, original_delta_value, occurred_at, edited_at, created_at
      from extra_goal_progress_events
      where user_id = $1
        and goal_id = $2
        and assigned_profile = $3
        and deleted_at is null
      order by created_at desc, id desc
      limit 1000
    `,
    [userId, safeGoalId, normalizedProfile]
  );
  const latestId = String(result.rows[0]?.id || "");
  const normalizedEvents = result.rows.map((row) => normalizeExtraGoalProgressEventRow(row, latestId));
  const intervalSummary = await buildExtraGoalBestIntervals(userId, normalizedProfile, normalizedEvents);
  const events = normalizedEvents.map((event) => ({
    ...event,
    intervalInsight: intervalSummary.eventInsights[String(event.id || "")] || null
  }));
  return {
    goal,
    events,
    bestIntervals: intervalSummary.bestIntervals,
    intervalDurationsSeconds: intervalSummary.intervalDurationsSeconds,
    averageDurationSeconds: intervalSummary.averageDurationSeconds,
    intervalCount: intervalSummary.intervalCount
  };
}

async function mutateLatestExtraGoalProgressEvent(userId, profileName, goalId, eventId, operation, nextValue = 0, nextOccurredAt = "") {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  const safeEventId = String(eventId || "").trim();
  const client = await db?.connect();
  if (!client) throw new Error("Banco de dados indisponível.");
  try {
    await client.query("begin");
    const goalResult = await client.query(
      `
        select id, goal_kind, progress_value, limit_interval_value, limit_interval_unit,
               limit_cycle_started_at, created_at
        from extra_goals
        where id = $1 and user_id = $2 and assigned_profile = $3
        for update
      `,
      [safeGoalId, userId, normalizedProfile]
    );
    const goal = goalResult.rows[0];
    if (!goal || normalizeExtraGoalKind(goal.goal_kind) !== "limit") {
      throw new Error("Limite não encontrado.");
    }
    const eventResult = await client.query(
      `
        select id, delta_value, occurred_at
        from extra_goal_progress_events
        where user_id = $1 and goal_id = $2 and assigned_profile = $3 and deleted_at is null
        order by created_at desc, id desc
        limit 1
        for update
      `,
      [userId, safeGoalId, normalizedProfile]
    );
    const latest = eventResult.rows[0];
    if (!latest || String(latest.id) !== safeEventId) {
      throw new Error("Somente a última movimentação pode ser alterada.");
    }
    const cycle = resolveLimitCycleWindow(
      goal.limit_cycle_started_at || goal.created_at || new Date(),
      goal.limit_interval_value,
      goal.limit_interval_unit
    );
    const eventMs = new Date(latest.occurred_at).getTime();
    const eventInsideCycle = eventMs >= cycle.start.getTime() && eventMs < cycle.end.getTime();
    const currentProgress = cycle.advanced ? 0 : Math.max(0, Math.trunc(Number(goal.progress_value || 0)));
    let nextProgress = currentProgress;
    if (operation === "edit") {
      const safeNextValue = Math.max(1, Math.min(1000000, Math.trunc(Number(nextValue) || 0)));
      if (!safeNextValue) throw new Error("Informe uma quantidade válida.");
      const safeNextOccurredAt = new Date(nextOccurredAt || latest.occurred_at);
      if (Number.isNaN(safeNextOccurredAt.getTime())) throw new Error("Informe uma data e um horário válidos.");
      if (safeNextOccurredAt.getTime() > Date.now()) throw new Error("A movimentação não pode estar no futuro.");
      const nextEventInsideCycle = safeNextOccurredAt.getTime() >= cycle.start.getTime()
        && safeNextOccurredAt.getTime() < cycle.end.getTime();
      nextProgress = Math.max(
        0,
        currentProgress
          - (eventInsideCycle ? Number(latest.delta_value || 0) : 0)
          + (nextEventInsideCycle ? safeNextValue : 0)
      );
      await client.query(
        `update extra_goal_progress_events
         set delta_value = $5, occurred_at = $6::timestamptz, edited_at = now()
         where id = $1 and user_id = $2 and goal_id = $3 and assigned_profile = $4`,
        [safeEventId, userId, safeGoalId, normalizedProfile, safeNextValue, safeNextOccurredAt.toISOString()]
      );
    } else {
      if (eventInsideCycle) nextProgress = Math.max(0, currentProgress - Number(latest.delta_value || 0));
      await client.query(
        `update extra_goal_progress_events set deleted_at = now()
         where id = $1 and user_id = $2 and goal_id = $3 and assigned_profile = $4`,
        [safeEventId, userId, safeGoalId, normalizedProfile]
      );
    }
    const previousResult = await client.query(
      `
        select occurred_at
        from extra_goal_progress_events
        where user_id = $1 and goal_id = $2 and assigned_profile = $3 and deleted_at is null
        order by occurred_at desc, created_at desc, id desc
        limit 1
      `,
      [userId, safeGoalId, normalizedProfile]
    );
    await client.query(
      `
        update extra_goals
        set progress_value = $4,
            limit_cycle_started_at = $5::timestamptz,
            last_progress_at = $6::timestamptz,
            updated_at = now()
        where id = $1 and user_id = $2 and assigned_profile = $3
      `,
      [
        safeGoalId,
        userId,
        normalizedProfile,
        nextProgress,
        cycle.start.toISOString(),
        previousResult.rows[0]?.occurred_at ? new Date(previousResult.rows[0].occurred_at).toISOString() : null
      ]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  const goals = await listExtraGoals(userId, normalizedProfile);
  const updatedGoal = goals.find((goal) => String(goal.id || "") === safeGoalId);
  if (updatedGoal) await syncExtraGoalProgressHistory(userId, updatedGoal, toDateKey());
  return {
    goals,
    history: await listExtraGoalProgressEvents(userId, normalizedProfile, safeGoalId)
  };
}

export async function updateLatestExtraGoalProgressEvent(userId, profileName, goalId, eventId, value, occurredAt) {
  return mutateLatestExtraGoalProgressEvent(userId, profileName, goalId, eventId, "edit", value, occurredAt);
}

export async function deleteLatestExtraGoalProgressEvent(userId, profileName, goalId, eventId) {
  return mutateLatestExtraGoalProgressEvent(userId, profileName, goalId, eventId, "delete");
}

export async function updateExtraGoal(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, goalId, payload = {}) {
  await ensureExtraGoalsSchema();
  const normalizedProfile = normalizeExtraGoalProfile(profileName);
  const safeGoalId = String(goalId || "").trim();
  if (!safeGoalId) {
    throw new Error("Missao invalida.");
  }
  const currentGoal = await getExtraGoalById(userId, normalizedProfile, safeGoalId);
  const nextTitle = normalizeExtraGoalTitle(payload?.title ?? currentGoal?.title);
  if (!nextTitle) throw new Error("Informe o nome da missao.");
  const nextTargetValue = Math.max(1, Math.trunc(Number(payload?.targetValue ?? currentGoal?.targetValue) || 0));
  const currentTitle = normalizeExtraGoalTitle(currentGoal?.title || nextTitle);
  const storedSvgDefault = await getStoredExtraGoalSvgDefault(userId, normalizedProfile, currentTitle);
  const svgIconUrl = String(payload?.svgIconUrl || currentGoal?.svgIconUrl || storedSvgDefault?.svgIconUrl || "").trim();
  const svgIconLabel = String(payload?.svgIconLabel || currentGoal?.svgIconLabel || storedSvgDefault?.svgIconLabel || "").trim();
  const nextUnitDurationSeconds = Math.min(EXTRA_GOAL_MAX_DURATION_SECONDS, Math.max(0, Math.trunc(Number(
    payload?.unitDurationSeconds
      ?? (payload?.unitDurationMinutes !== undefined ? Number(payload.unitDurationMinutes || 0) * 60 : currentGoal?.unitDurationSeconds)
      ?? 0
  ) || 0)));
  const nextGoalKind = normalizeExtraGoalKind(currentGoal?.goalKind);
  const nextCategoryId = normalizeExtraGoalCategoryId(payload?.categoryId ?? currentGoal?.categoryId);
  const nextIsFolder = nextGoalKind !== "limit" && (payload?.isFolder === undefined ? currentGoal?.isFolder === true : payload.isFolder === true);
  const nextRepeatDays = normalizeExtraGoalRepeatDays(payload?.repeatDays, currentGoal?.repeatDays);
  const nextScheduleConfig = normalizeScheduleConfig(payload?.scheduleConfig || payload?.repeatConfig || currentGoal?.scheduleConfig || currentGoal?.repeatConfig);
  const safeNextUnitDurationSeconds = nextGoalKind === "limit" || nextIsFolder ? 0 : nextUnitDurationSeconds;
  const nextUnitDurationMinutes = Math.max(0, Math.trunc(safeNextUnitDurationSeconds / 60));
  const nextLimitIntervalValue = Math.max(1, Math.min(999, Math.trunc(Number(payload?.limitIntervalValue ?? currentGoal?.limitIntervalValue ?? 1) || 1)));
  const nextLimitIntervalUnit = normalizeLimitIntervalUnit(payload?.limitIntervalUnit ?? currentGoal?.limitIntervalUnit);
  const nextCountSleepTime = nextGoalKind === "limit"
    ? (payload?.countSleepTime === undefined ? currentGoal?.countSleepTime !== false : payload.countSleepTime !== false)
    : true;
  if (!nextTargetValue) {
    throw new Error("Informe a unidade diaria da missao.");
  }
  await query(
    `
      update extra_goals
      set title = $4,
          category_id = $5,
          target_value = $6,
          unit_duration_minutes = $7,
          unit_duration_seconds = $8,
          limit_interval_value = $9,
          limit_interval_unit = $10,
          count_sleep_time = $11,
          is_folder = $12,
          repeat_days = $13::jsonb,
          schedule_config = $14::jsonb,
          svg_icon_url = $15,
          svg_icon_label = $16,
          updated_at = now()
      where id = $1
        and user_id = $2
        and assigned_profile = $3
    `,
    [safeGoalId, userId, normalizedProfile, nextTitle, nextCategoryId, nextTargetValue, nextUnitDurationMinutes, safeNextUnitDurationSeconds, nextLimitIntervalValue, nextLimitIntervalUnit, nextCountSleepTime, nextIsFolder, JSON.stringify(nextRepeatDays), nextScheduleConfig ? JSON.stringify(nextScheduleConfig) : null, svgIconUrl, svgIconLabel]
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
