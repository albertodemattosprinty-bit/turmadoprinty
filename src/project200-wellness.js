import { db, query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";
import { ensureExtraGoalsSchema } from "./extra-goals.js";
import { normalizeProject200MuscleSelections } from "../public/200/exercise-muscles.js";
import {
  calculateProject200ExerciseMuscleGains,
  project200DecayedMusclePoints,
  PROJECT200_MUSCLE_POINTS_PER_PERCENT
} from "../public/200/exercise-muscle-progress.js";

const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const TRACKING_TYPES = new Set(["steps", "minutes", "series", "gps"]);
const EXERCISE_CATEGORIES = new Set(["strength", "aerobic", "calisthenics"]);
export const PROJECT200_MEAL_SLOTS = [
  ["pre_morning_snack", "Lanche pré-matinal"],
  ["breakfast", "Café da manhã"],
  ["morning_snack", "Lanche da manhã"],
  ["lunch", "Almoço"],
  ["afternoon_snack", "Lanche da tarde"],
  ["afternoon_coffee", "Café da tarde"],
  ["dinner", "Janta"],
  ["night_snack", "Lanche da noite"]
].map(([key, label]) => ({ key, label }));
const MEAL_SLOT_KEYS = new Set(PROJECT200_MEAL_SLOTS.map(({ key }) => key));
const DEFAULT_MEAL_SLOT_KEYS = ["breakfast", "lunch", "dinner"];
const PROJECT200_NUTRIENT_DEFINITIONS = [
  { key: "calories", label: "Calorias", unit: "kcal" },
  { key: "carbohydrates", label: "Carboidratos", unit: "g" },
  { key: "proteins", label: "Proteínas", unit: "g" },
  { key: "sugars", label: "Açúcares", unit: "g" },
  { key: "fats", label: "Gorduras", unit: "g" },
  { key: "fiber", label: "Fibras", unit: "g" },
  { key: "sodium", label: "Sódio", unit: "mg" },
  { key: "micronutrients", label: "Micronutrientes", unit: "%" }
];

function normalizeProfileName(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.trunc(Number(value || 0) || 0)));
}

function normalizeExerciseSchedule(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { nativeType: _ignoredNativeType, ...schedule } = value;
  return schedule;
}

function project200DateKey(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: PROJECT200_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = formatter.formatToParts(value);
  const read = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function normalizeMealRow(row) {
  return {
    id: String(row.id), profileName: normalizeProfileName(row.assigned_profile),
    description: String(row.description || ""), calories: Math.max(0, Number(row.calories || 0)),
    qualityScore: clampInteger(row.quality_score, 0, 100), feedback: String(row.feedback || ""),
    mealSlot: MEAL_SLOT_KEYS.has(row.meal_slot) ? row.meal_slot : "",
    nutrients: Array.isArray(row.components) ? row.components : [],
    components: Array.isArray(row.components) ? row.components : [],
    consumedAt: new Date(row.consumed_at).toISOString(), createdAt: new Date(row.created_at).toISOString()
  };
}

function normalizeWorkoutRow(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id), profileName: normalizeProfileName(row.assigned_profile),
    exerciseId: String(row.exercise_id || ""), exerciseName: String(row.exercise_name || "Exercicio"),
    category: String(row.category || "strength"), trackingType: TRACKING_TYPES.has(row.tracking_type) ? row.tracking_type : "minutes",
    equipment: String(row.equipment || ""), status: String(row.status || "active"),
    startedAt: new Date(row.started_at).toISOString(), completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    durationMinutes: Math.max(0, Number(row.duration_minutes || 0)), steps: Math.max(0, Math.trunc(Number(row.steps || 0) || 0)),
    distanceMeters: Math.max(0, Math.trunc(Number(row.distance_meters || 0) || 0)),
    targetSeries: Math.max(0, Math.trunc(Number(row.target_series || 0) || 0)),
    targetReps: Math.max(0, Math.trunc(Number(row.target_reps || 0) || 0)),
    targetMinutes: Math.max(0, Number(row.target_minutes || 0)),
    targetDistanceMeters: Math.max(0, Math.trunc(Number(row.target_distance_meters || 0))),
    totalReps: Math.max(0, Math.trunc(Number(row.total_reps || 0) || 0)), seriesCount: Math.max(0, Math.trunc(Number(row.series_count || 0) || 0)),
    series: (Array.isArray(row.series_items) ? row.series_items : []).map((item) => ({
      seriesNumber: Math.max(1, Math.trunc(Number(item?.seriesNumber || item?.series_number || 1))),
      repetitions: Math.max(0, Math.trunc(Number(item?.repetitions || 0))),
      targetRepetitions: Math.max(0, Math.trunc(Number(item?.targetRepetitions || item?.target_repetitions || 0)))
    }))
  };
}

function normalizeExerciseLibraryRow(row) {
  const trackingType = TRACKING_TYPES.has(row?.tracking_type) ? row.tracking_type : "minutes";
  return {
    exerciseId: String(row?.exercise_id || ""), exerciseName: String(row?.exercise_name || "Exercicio"),
    category: EXERCISE_CATEGORIES.has(row?.category) ? row.category : "strength", trackingType,
    equipment: String(row?.equipment || ""), dailyGoal: Math.max(1, Number(row?.daily_goal || 1)),
    targetSeries: Math.max(0, Math.trunc(Number(row?.target_series || 0))),
    targetReps: Math.max(0, Math.trunc(Number(row?.target_reps || 0))),
    targetMinutes: Math.max(0, Number(row?.target_minutes || 0)),
    targetDistanceMeters: Math.max(0, Math.trunc(Number(row?.target_distance_meters || 0))),
    scheduleConfig: normalizeExerciseSchedule(row?.schedule_config),
    todayTotalReps: Math.max(0, Math.trunc(Number(row?.today_total_reps || 0))),
    todayDurationMinutes: Math.max(0, Number(row?.today_duration_minutes || 0)),
    todayDistanceMeters: Math.max(0, Math.trunc(Number(row?.today_distance_meters || 0)))
  };
}
function normalizeExerciseAssetRow(row) {
  return {
    exerciseId: String(row?.exercise_id || ""),
    exerciseName: String(row?.exercise_name || "Exercício"),
    muscles: Array.isArray(row?.muscles) ? row.muscles.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : [],
    startImageUrl: String(row?.start_image_url || ""),
    finishImageUrl: String(row?.finish_image_url || ""),
    muscleImageUrl: String(row?.muscle_image_url || ""),
    videoUrl: String(row?.video_url || ""),
    videoPosterUrl: String(row?.video_poster_url || ""),
    videoDurationSeconds: Math.max(0, Number(row?.video_duration_seconds || 0)),
    generatedModel: String(row?.generated_model || ""),
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export function quantizeProject200MuscleLoad(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.25;
  return Math.max(0.25, Math.min(1, Math.round(numeric * 20) / 20));
}

export function normalizeProject200ExerciseDefinition(payload = {}) {
  const exerciseId = String(payload.exerciseId ?? payload.exercise_id ?? "").trim().slice(0, 120);
  const exerciseName = String(payload.exerciseName ?? payload.exercise_name ?? "").trim().slice(0, 160);
  const categoryValue = String(payload.category || "strength").trim().toLowerCase();
  const trackingValue = String(payload.trackingType ?? payload.tracking_type ?? "series").trim().toLowerCase();
  const muscles = normalizeProject200MuscleSelections(payload.muscles, { quantize: quantizeProject200MuscleLoad });
  return {
    exerciseId,
    exerciseName,
    category: EXERCISE_CATEGORIES.has(categoryValue) ? categoryValue : "strength",
    trackingType: TRACKING_TYPES.has(trackingValue) ? trackingValue : "series",
    equipment: String(payload.equipment || "").trim().slice(0, 160),
    cue: String(payload.cue || "").trim().slice(0, 500),
    muscles,
    source: String(payload.source || "luna").trim().slice(0, 40) || "luna",
    updatedAt: payload.updated_at || payload.updatedAt ? new Date(payload.updated_at || payload.updatedAt).toISOString() : null
  };
}

let exerciseMuscleMigrationPromise = null;
async function migrateProject200ExerciseMuscles() {
  if (!exerciseMuscleMigrationPromise) exerciseMuscleMigrationPromise = (async () => {
    const result = await query("select exercise_id, muscles from project200_exercise_definitions");
    for (const row of result.rows) {
      const muscles = normalizeProject200MuscleSelections(row.muscles, { quantize: quantizeProject200MuscleLoad });
      if (JSON.stringify(row.muscles || []) === JSON.stringify(muscles)) continue;
      await query("update project200_exercise_definitions set muscles = $2::jsonb, updated_at = now() where exercise_id = $1", [row.exercise_id, JSON.stringify(muscles)]);
    }
  })().catch((error) => { exerciseMuscleMigrationPromise = null; throw error; });
  return exerciseMuscleMigrationPromise;
}
function normalizeWeightRow(row) {
  if (!row?.id) return null;
  return { id: String(row.id), weightKg: Number(row.weight_kg || 0), measuredAt: new Date(row.measured_at).toISOString() };
}

async function prepareProject200WellnessSchema() {
  await query(`create table if not exists project200_nutrition_entries (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', description text not null, calories numeric(10,2) not null default 0,
    quality_score integer not null default 0 check (quality_score between 0 and 100), feedback text not null default '',
    components jsonb not null default '[]'::jsonb, consumed_at timestamptz not null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await query(`create index if not exists idx_project200_nutrition_user_profile_date on project200_nutrition_entries(user_id, assigned_profile, consumed_at desc)`);
  await query("alter table project200_nutrition_entries add column if not exists meal_slot text not null default '';");
  await query(`create table if not exists project200_exercise_sessions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', exercise_id text not null, exercise_name text not null,
    category text not null default 'strength', tracking_type text not null default 'minutes', equipment text not null default '',
    status text not null default 'active', started_at timestamptz not null default now(), completed_at timestamptz null,
    duration_minutes numeric(10,2) not null default 0, steps integer not null default 0, total_reps integer not null default 0,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await query(`alter table project200_exercise_sessions add column if not exists target_series integer not null default 0`);
  await query(`alter table project200_exercise_sessions add column if not exists target_reps integer not null default 0`);
  await query(`alter table project200_exercise_sessions add column if not exists target_minutes numeric(10,2) not null default 0`);
  await query(`alter table project200_exercise_sessions add column if not exists target_distance_meters integer not null default 0`);
  await query(`alter table project200_exercise_sessions add column if not exists distance_meters integer not null default 0`);
  await query(`create index if not exists idx_project200_exercise_user_profile_date on project200_exercise_sessions(user_id, assigned_profile, started_at desc)`);
  await query(`create unique index if not exists idx_project200_exercise_active on project200_exercise_sessions(user_id, assigned_profile) where status = 'active'`);
  await query(`create table if not exists project200_exercise_series (
    id uuid primary key default gen_random_uuid(), session_id uuid not null references project200_exercise_sessions(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade, series_number integer not null,
    repetitions integer not null default 0, target_repetitions integer not null default 0,
    completed_at timestamptz not null default now(), unique (session_id, series_number)
  )`);
  await query(`create index if not exists idx_project200_exercise_series_session on project200_exercise_series(session_id, series_number)`);
  await query(`alter table project200_exercise_series add column if not exists target_repetitions integer not null default 0`);
  await query(`create table if not exists project200_exercise_library (
    user_id uuid not null references users(id) on delete cascade, assigned_profile text not null default 'Usuario',
    exercise_id text not null, exercise_name text not null, category text not null default 'strength',
    tracking_type text not null default 'minutes', equipment text not null default '', daily_goal numeric(12,2) not null default 1,
    target_series integer not null default 0, target_reps integer not null default 0,
    target_minutes numeric(10,2) not null default 0, target_distance_meters integer not null default 0,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (user_id, assigned_profile, exercise_id)
  )`);
  await query(`create index if not exists idx_project200_exercise_library_user_profile on project200_exercise_library(user_id, assigned_profile, created_at)`);
  await query(`alter table project200_exercise_library add column if not exists schedule_config jsonb`);
  await query(`create table if not exists project200_exercise_assets (
    exercise_id text primary key, exercise_name text not null, muscles jsonb not null default '[]'::jsonb,
    start_image_url text not null, finish_image_url text not null, muscle_image_url text not null default '', generated_model text not null default 'gpt-image-1',
    generated_by uuid null references users(id) on delete set null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await query(`alter table project200_exercise_assets add column if not exists muscle_image_url text not null default ''`);
  await query(`alter table project200_exercise_assets add column if not exists video_url text not null default ''`);
  await query(`alter table project200_exercise_assets add column if not exists video_poster_url text not null default ''`);
  await query(`alter table project200_exercise_assets add column if not exists video_duration_seconds numeric(6,2) not null default 0`);
  await query(`create table if not exists project200_exercise_definitions (
    exercise_id text primary key, exercise_name text not null,
    category text not null default 'strength', tracking_type text not null default 'series',
    equipment text not null default '', cue text not null default '', muscles jsonb not null default '[]'::jsonb,
    source text not null default 'luna', generated_by uuid null references users(id) on delete set null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists project200_exercise_muscle_state (
    user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', muscle_id text not null,
    points numeric(14,4) not null default 0, updated_at timestamptz not null default now(),
    primary key (user_id, assigned_profile, muscle_id)
  )`);
  await query(`create table if not exists project200_exercise_muscle_credits (
    session_id uuid not null references project200_exercise_sessions(id) on delete cascade,
    muscle_id text not null, user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', points numeric(14,4) not null,
    credited_at timestamptz not null default now(), primary key (session_id, muscle_id)
  )`);
  await query(`create index if not exists idx_project200_exercise_muscle_state_user_profile
    on project200_exercise_muscle_state(user_id, assigned_profile)`);
  await query(`create table if not exists project200_wellness_preferences (
    user_id uuid not null references users(id) on delete cascade, assigned_profile text not null default 'Usuario',
    height_cm numeric(6,2) null, askagain1 text not null default 'yes' check (askagain1 in ('yes','no')),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (user_id, assigned_profile)
  )`);
  await query("alter table project200_wellness_preferences add column if not exists meal_slots jsonb not null default '[\"breakfast\",\"lunch\",\"dinner\"]'::jsonb;");
  await query(`create table if not exists project200_weight_entries (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', weight_kg numeric(6,2) not null check (weight_kg between 1 and 500),
    measured_at timestamptz not null default now(), created_at timestamptz not null default now()
  )`);
  await query(`create index if not exists idx_project200_weight_user_profile_date on project200_weight_entries(user_id, assigned_profile, measured_at desc)`);
  await migrateProject200ExerciseMuscles();
}

let project200WellnessSchemaPromise = null;
export function ensureProject200WellnessSchema() {
  if (!project200WellnessSchemaPromise) {
    project200WellnessSchemaPromise = prepareProject200WellnessSchema().catch((error) => {
      project200WellnessSchemaPromise = null;
      throw error;
    });
  }
  return project200WellnessSchemaPromise;
}

async function getActiveWorkoutRow(userId, profileName) {
  const result = await query(
    `select session.*, coalesce(series.series_count, 0)::integer as series_count,
       coalesce(series.series_items, '[]'::jsonb) as series_items
     from project200_exercise_sessions session
     left join lateral (
       select count(*)::integer as series_count,
         jsonb_agg(jsonb_build_object('seriesNumber', item.series_number, 'repetitions', item.repetitions,
           'targetRepetitions', item.target_repetitions) order by item.series_number) as series_items
       from project200_exercise_series item where item.session_id = session.id
     ) series on true
     where session.user_id = $1 and session.assigned_profile = $2 and session.status = 'active'
     order by session.started_at desc limit 1`,
    [userId, normalizeProfileName(profileName)]
  );
  return result.rows[0] || null;
}

function project200Weekday(dateKey = project200DateKey()) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)).getUTCDay();
}

export function isProject200ExerciseScheduledForDate(row, dateKey = project200DateKey()) {
  const schedule = row?.schedule_config ?? row?.scheduleConfig;
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return true;
  if (schedule.frequency === "none") return false;
  const startsOn = String(schedule.startsOn || "").slice(0, 10);
  if (startsOn && startsOn > dateKey) return false;
  const weekDays = [...new Set((Array.isArray(schedule.weekDays) ? schedule.weekDays : [])
    .map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  return !weekDays.length || weekDays.includes(project200Weekday(dateKey));
}

function project200ExerciseScheduleWeekDays(rows = []) {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const selected = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const schedule = row?.schedule_config ?? row?.scheduleConfig;
    if (schedule?.frequency === "none") continue;
    const weekDays = [...new Set((Array.isArray(schedule?.weekDays) ? schedule.weekDays : [])
      .map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
    (weekDays.length ? weekDays : allDays).forEach((day) => selected.add(day));
  }
  return [...selected].sort((left, right) => left - right);
}

export function project200ExerciseLibraryCompletionPercent(rows = [], dateKey = project200DateKey()) {
  const items = (Array.isArray(rows) ? rows : []).filter((row) => isProject200ExerciseScheduledForDate(row, dateKey));
  if (!items.length) return 0;
  const total = items.reduce((sum, row) => {
    const trackingType = TRACKING_TYPES.has(row?.tracking_type) ? row.tracking_type : "minutes";
    const value = trackingType === "series"
      ? Number(row?.today_total_reps || 0)
      : trackingType === "gps"
        ? Number(row?.today_distance_meters || 0)
        : Number(row?.today_duration_minutes || 0);
    const target = Math.max(1, Number(row?.daily_goal || 1));
    return sum + Math.min(100, Math.max(0, Math.round((value / target) * 100)));
  }, 0);
  return Math.round(total / items.length);
}

export async function syncProject200ExerciseMission(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, libraryRows = null) {
  await ensureProject200WellnessSchema();
  await ensureExtraGoalsSchema();
  const profile = normalizeProfileName(profileName);
  let rows = Array.isArray(libraryRows) ? libraryRows : null;
  if (!rows) {
    const result = await query(
      `select library.*, coalesce(stats.today_total_reps, 0)::integer as today_total_reps,
         coalesce(stats.today_duration_minutes, 0)::numeric as today_duration_minutes,
         coalesce(stats.today_distance_meters, 0)::integer as today_distance_meters
       from project200_exercise_library library
       left join lateral (
         select coalesce(sum(session.total_reps), 0)::integer as today_total_reps,
           coalesce(sum(session.duration_minutes), 0)::numeric as today_duration_minutes,
           coalesce(sum(session.distance_meters), 0)::integer as today_distance_meters
         from project200_exercise_sessions session
         where session.user_id = library.user_id and session.assigned_profile = library.assigned_profile
           and session.exercise_id = library.exercise_id
           and session.status = 'completed'
           and (session.started_at at time zone $3)::date = (now() at time zone $3)::date
       ) stats on true
       where library.user_id = $1 and library.assigned_profile = $2`,
      [userId, profile, PROJECT200_TIME_ZONE]
    );
    rows = result.rows;
  }
  if (!rows.length) return null;
  const dateKey = project200DateKey();
  const percent = project200ExerciseLibraryCompletionPercent(rows, dateKey);
  const repeatDays = project200ExerciseScheduleWeekDays(rows);
  const scheduleConfig = { nativeType: "exercise_plan", locked: true, frequency: "weekly", interval: 1, intervalUnit: "week", weekDays: repeatDays, startsOn: dateKey, endMode: "never", notification: { mode: "at_time", customAmount: 10, customUnit: "minutes" } };
  const existing = await query(
    `select id from extra_goals where user_id=$1 and assigned_profile=$2 and schedule_config->>'nativeType'='exercise_plan' order by created_at asc limit 1`,
    [userId, profile]
  );
  let goalId = existing.rows[0]?.id || null;
  if (goalId) {
    await query(
      `update extra_goals set title='Exercícios', category_id='exercicios', goal_kind='goal', target_value=100,
         progress_value=$4, progress_date=$3::date, last_progress_at=now(), is_folder=false,
         repeat_days=$5::jsonb, schedule_config=$6::jsonb,
         svg_icon_url='/200/apps/exercicios.png', svg_icon_label='Exercícios', updated_at=now()
       where id=$7 and user_id=$1 and assigned_profile=$2`,
      [userId, profile, dateKey, percent, JSON.stringify(repeatDays), JSON.stringify(scheduleConfig), goalId]
    );
  } else {
    const inserted = await query(
      `insert into extra_goals (user_id,assigned_profile,title,category_id,goal_kind,target_value,progress_value,progress_date,last_progress_at,is_folder,repeat_days,schedule_config,svg_icon_url,svg_icon_label)
       values ($1,$2,'Exercícios','exercicios','goal',100,$4,$3::date,now(),false,$5::jsonb,$6::jsonb,'/200/apps/exercicios.png','Exercícios') returning id`,
      [userId, profile, dateKey, percent, JSON.stringify(repeatDays), JSON.stringify(scheduleConfig)]
    );
    goalId = inserted.rows[0]?.id || null;
  }
  if (goalId) {
    await query(
      `insert into extra_goal_progress_history (user_id,goal_id,assigned_profile,scope_date,progress_value,target_value,updated_at)
       values ($1,$2,$3,$4::date,$5,100,now())
       on conflict (user_id,goal_id,scope_date) do update set assigned_profile=excluded.assigned_profile,progress_value=excluded.progress_value,target_value=100,updated_at=now()`,
      [userId, goalId, profile, dateKey, percent]
    );
  }
  return { goalId: goalId ? String(goalId) : "", percent };
}

export async function getProject200WellnessDashboard(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(profileName);
  const [mealResult, summaryResult, workoutResult, recentWorkoutResult, preferencesResult, libraryResult, weightResult, assetResult, definitionResult, muscleProgressResult] = await Promise.all([
    query(
      `select * from project200_nutrition_entries
       where user_id = $1 and assigned_profile = $2
         and (consumed_at at time zone $3)::date = (now() at time zone $3)::date
       order by consumed_at desc`,
      [userId, profile, PROJECT200_TIME_ZONE]
    ),
    query(
      `select coalesce(sum(calories), 0)::numeric as total_calories,
        case when coalesce(sum(calories), 0) > 0 then round(sum(calories * quality_score) / sum(calories)) else 0 end::integer as quality_score,
        count(*)::integer as meal_count
       from project200_nutrition_entries
       where user_id = $1 and assigned_profile = $2
         and (consumed_at at time zone $3)::date = (now() at time zone $3)::date`,
      [userId, profile, PROJECT200_TIME_ZONE]
    ),
    getActiveWorkoutRow(userId, profile),
    query(
      `select session.*, coalesce(series.series_count, 0)::integer as series_count
       from project200_exercise_sessions session
       left join lateral (
         select count(*)::integer as series_count from project200_exercise_series item where item.session_id = session.id
       ) series on true
       where session.user_id = $1 and session.assigned_profile = $2 and session.status = 'completed'
       order by session.completed_at desc limit 8`,
      [userId, profile]
    ),
    query(`select height_cm, askagain1, meal_slots from project200_wellness_preferences where user_id = $1 and assigned_profile = $2 limit 1`, [userId, profile]),
    query(
      `select library.*, coalesce(stats.today_total_reps, 0)::integer as today_total_reps,
         coalesce(stats.today_duration_minutes, 0)::numeric as today_duration_minutes,
         coalesce(stats.today_distance_meters, 0)::integer as today_distance_meters
       from project200_exercise_library library
       left join lateral (
         select coalesce(sum(session.total_reps), 0)::integer as today_total_reps,
           coalesce(sum(session.duration_minutes), 0)::numeric as today_duration_minutes,
           coalesce(sum(session.distance_meters), 0)::integer as today_distance_meters
         from project200_exercise_sessions session
         where session.user_id = library.user_id and session.assigned_profile = library.assigned_profile
           and session.exercise_id = library.exercise_id
           and session.status = 'completed'
           and (session.started_at at time zone $3)::date = (now() at time zone $3)::date
       ) stats on true
       where library.user_id = $1 and library.assigned_profile = $2
       order by library.created_at asc`,
      [userId, profile, PROJECT200_TIME_ZONE]
    ),
    query(`select * from project200_weight_entries where user_id = $1 and assigned_profile = $2 order by measured_at desc limit 30`, [userId, profile]),
    query(`select * from project200_exercise_assets order by exercise_name asc`),
    query(`select * from project200_exercise_definitions order by exercise_name asc`),
    query(
      `select muscle_id,
         greatest(0::numeric, points - greatest(0, floor(extract(epoch from (now() - updated_at)) / 1500)) * $3::numeric) as current_points,
         updated_at, now() as measured_at
       from project200_exercise_muscle_state
       where user_id = $1 and assigned_profile = $2`,
      [userId, profile, PROJECT200_MUSCLE_POINTS_PER_PERCENT]
    )
  ]);
  const summary = summaryResult.rows[0] || {};
  const preference = preferencesResult.rows[0] || {};
  const storedMealSlots = Array.isArray(preference.meal_slots) ? preference.meal_slots.filter((key) => MEAL_SLOT_KEYS.has(key)) : [];
  const enabledMealSlotKeys = storedMealSlots.length ? storedMealSlots : DEFAULT_MEAL_SLOT_KEYS;
  const normalizedMeals = mealResult.rows.map(normalizeMealRow);
  const latestMealBySlot = new Map();
  normalizedMeals.forEach((meal) => { if (meal.mealSlot && !latestMealBySlot.has(meal.mealSlot)) latestMealBySlot.set(meal.mealSlot, meal); });
  const mealMissionQuality = Math.round(enabledMealSlotKeys.reduce((sum, key) => sum + Number(latestMealBySlot.get(key)?.qualityScore || 0), 0) / Math.max(1, enabledMealSlotKeys.length));
  const completedMealSlots = enabledMealSlotKeys.filter((key) => latestMealBySlot.has(key)).length;
  const exerciseCompletionPercent = project200ExerciseLibraryCompletionPercent(libraryResult.rows);
  await syncProject200ExerciseMission(userId, profile, libraryResult.rows);
  const weights = weightResult.rows.map(normalizeWeightRow);
  const heightCm = preference.height_cm ? Number(preference.height_cm) : null;
  const currentWeight = weights[0] || null;
  const bmi = currentWeight && heightCm ? currentWeight.weightKg / ((heightCm / 100) ** 2) : null;
  return {
    profileName: profile,
    today: {
      calories: Math.round(Number(summary.total_calories || 0)),
      qualityScore: clampInteger(mealMissionQuality, 0, 100),
      mealCount: Math.max(0, Math.trunc(Number(summary.meal_count || 0) || 0)),
      completedMealSlots,
      enabledMealSlots: enabledMealSlotKeys.length,
      mealCompletionPercent: Math.round((completedMealSlots / Math.max(1, enabledMealSlotKeys.length)) * 100),
      exerciseCompletionPercent
    },
    meals: normalizedMeals,
    mealSlots: PROJECT200_MEAL_SLOTS.map((slot) => ({ ...slot, enabled: enabledMealSlotKeys.includes(slot.key), meal: latestMealBySlot.get(slot.key) || null })),
    activeWorkout: normalizeWorkoutRow(workoutResult),
    recentWorkouts: recentWorkoutResult.rows.map(normalizeWorkoutRow),
    exerciseLibrary: libraryResult.rows.map(normalizeExerciseLibraryRow),
    exerciseAssets: assetResult.rows.map(normalizeExerciseAssetRow),
    exerciseDefinitions: definitionResult.rows.map(normalizeProject200ExerciseDefinition),
    muscleProgress: muscleProgressResult.rows.map((row) => ({
      muscleId: String(row.muscle_id || ""),
      points: Math.max(0, Number(row.current_points || 0)),
      updatedAt: new Date(row.updated_at).toISOString(),
      measuredAt: new Date(row.measured_at).toISOString()
    })),
    wellness: {
      preferences: { heightCm, askagain1: preference.askagain1 === "no" ? "no" : "yes" },
      currentWeight,
      bmi: bmi && Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null,
      weightHistory: weights
    }
  };
}

export async function saveProject200ExerciseDefinitions(userId, definitions = []) {
  await ensureProject200WellnessSchema();
  const saved = [];
  for (const raw of Array.isArray(definitions) ? definitions.slice(0, 40) : []) {
    const definition = normalizeProject200ExerciseDefinition(raw);
    if (!definition.exerciseId || !definition.exerciseName || !definition.muscles.length) continue;
    const result = await query(
      `insert into project200_exercise_definitions (
         exercise_id, exercise_name, category, tracking_type, equipment, cue, muscles, source, generated_by
       ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
       on conflict (exercise_id) do update set exercise_name=excluded.exercise_name, category=excluded.category,
         tracking_type=excluded.tracking_type, equipment=excluded.equipment, cue=excluded.cue,
         muscles=excluded.muscles, source=excluded.source, generated_by=excluded.generated_by, updated_at=now()
       returning *`,
      [definition.exerciseId, definition.exerciseName, definition.category, definition.trackingType,
        definition.equipment, definition.cue, JSON.stringify(definition.muscles), definition.source, userId]
    );
    saved.push(normalizeProject200ExerciseDefinition(result.rows[0]));
  }
  return saved;
}

export async function saveProject200ExerciseAssets(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 120);
  const exerciseName = String(payload.exerciseName || "").trim().slice(0, 160);
  const startImageUrl = String(payload.startImageUrl || "").trim().slice(0, 2000);
  const finishImageUrl = String(payload.finishImageUrl || "").trim().slice(0, 2000);
  const muscleImageUrl = String(payload.muscleImageUrl || "").trim().slice(0, 2000);
  const generatedModel = String(payload.generatedModel || "gpt-image-1").trim().slice(0, 80);
  const muscles = [...new Set((Array.isArray(payload.muscles) ? payload.muscles : [])
    .map((item) => String(item || "").trim().slice(0, 80)).filter(Boolean))].slice(0, 3);
  if (!exerciseId || !exerciseName || !startImageUrl || !finishImageUrl || !muscleImageUrl) throw new Error("Dados das imagens do exercício incompletos.");
  const result = await query(
    `insert into project200_exercise_assets (exercise_id, exercise_name, muscles, start_image_url, finish_image_url, muscle_image_url, generated_model, generated_by)
     values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
     on conflict (exercise_id) do update set exercise_name=excluded.exercise_name, muscles=excluded.muscles,
       start_image_url=excluded.start_image_url, finish_image_url=excluded.finish_image_url,
       muscle_image_url=excluded.muscle_image_url, generated_model=excluded.generated_model, generated_by=excluded.generated_by, updated_at=now()
     returning *`,
    [exerciseId, exerciseName, JSON.stringify(muscles), startImageUrl, finishImageUrl, muscleImageUrl, generatedModel, userId]
  );
  return normalizeExerciseAssetRow(result.rows[0]);
}

export async function saveProject200ExerciseVideoAsset(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 120);
  const exerciseName = String(payload.exerciseName || "").trim().slice(0, 160);
  const videoUrl = String(payload.videoUrl || "").trim().slice(0, 2000);
  const videoPosterUrl = String(payload.videoPosterUrl || "").trim().slice(0, 2000);
  const durationSeconds = Math.max(0, Math.min(15, Number(payload.durationSeconds || 0) || 0));
  if (!exerciseId || !exerciseName || !videoUrl || !videoPosterUrl || !durationSeconds) throw new Error("Dados do vídeo do exercício incompletos.");
  const result = await query(
    `insert into project200_exercise_assets (
       exercise_id, exercise_name, muscles, start_image_url, finish_image_url, muscle_image_url,
       video_url, video_poster_url, video_duration_seconds, generated_model, generated_by
     ) values ($1,$2,'[]'::jsonb,$4,$4,$4,$3,$4,$5,'admin-video',$6)
     on conflict (exercise_id) do update set exercise_name=excluded.exercise_name,
       video_url=excluded.video_url, video_poster_url=excluded.video_poster_url,
       video_duration_seconds=excluded.video_duration_seconds, generated_by=excluded.generated_by, updated_at=now()
     returning *`,
    [exerciseId, exerciseName, videoUrl, videoPosterUrl, durationSeconds, userId]
  );
  return normalizeExerciseAssetRow(result.rows[0]);
}

export async function createProject200NutritionEntry(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const description = String(payload.description || "").trim().slice(0, 500);
  const feedback = String(payload.feedback || "").trim().slice(0, 700);
  const consumedAt = new Date(payload.consumedAt || "");
  if (description.length < 2) throw new Error("Diga o que voce comeu.");
  if (Number.isNaN(consumedAt.getTime())) throw new Error("Informe o horario da refeicao.");
  const calories = Math.max(0, Math.min(20000, Number(payload.calories || 0) || 0));
  const qualityScore = clampInteger(payload.qualityScore, 0, 100);
  const mealSlot = String(payload.mealSlot || "").trim();
  if (!MEAL_SLOT_KEYS.has(mealSlot)) throw new Error("Escolha qual refeição está registrando.");
  const suppliedNutrients = Array.isArray(payload.nutrients || payload.components) ? (payload.nutrients || payload.components) : [];
  const components = PROJECT200_NUTRIENT_DEFINITIONS.map((definition, index) => {
    const item = suppliedNutrients.find((candidate) => String(candidate?.key || "").trim() === definition.key) || suppliedNutrients[index] || {};
    return {
      key: definition.key,
      label: definition.label,
      value: Math.max(0, Math.min(100000, Number(item?.value ?? item?.calories ?? 0) || 0)),
      unit: definition.unit,
      percent: clampInteger(item?.percent, 0, 100)
    };
  });
  await query(`delete from project200_nutrition_entries where user_id=$1 and assigned_profile=$2 and meal_slot=$3
    and (consumed_at at time zone $4)::date=($5::timestamptz at time zone $4)::date`,
    [userId, profile, mealSlot, PROJECT200_TIME_ZONE, consumedAt.toISOString()]);
  const result = await query(
    `insert into project200_nutrition_entries (
       user_id, assigned_profile, description, calories, quality_score, feedback, components, consumed_at, meal_slot
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) returning *`,
    [userId, profile, description, calories, qualityScore, feedback, JSON.stringify(components), consumedAt.toISOString(), mealSlot]
  );
  return normalizeMealRow(result.rows[0]);
}

export async function addProject200ExerciseToLibrary(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 80);
  const exerciseName = String(payload.exerciseName || "").trim().slice(0, 120);
  const trackingType = TRACKING_TYPES.has(payload.trackingType) ? payload.trackingType : "minutes";
  const category = EXERCISE_CATEGORIES.has(payload.category) ? payload.category : "strength";
  if (!exerciseId || exerciseName.length < 2) throw new Error("Escolha um exercicio valido.");
  const targetSeries = trackingType === "series" ? clampInteger(payload.targetSeries || 3, 1, 100) : 0;
  const targetReps = trackingType === "series" ? clampInteger(payload.targetReps || 12, 1, 10000) : 0;
  const targetMinutes = trackingType === "minutes" ? Math.max(1, Math.min(1440, Number(payload.targetMinutes || 30) || 30)) : 0;
  const targetDistanceMeters = trackingType === "gps" ? clampInteger(payload.targetDistanceMeters || 3000, 100, 10000000) : 0;
  const dailyGoal = trackingType === "series" ? targetSeries * targetReps : trackingType === "gps" ? targetDistanceMeters : targetMinutes;
  const scheduleConfig = normalizeExerciseSchedule(payload.scheduleConfig);
  const result = await query(
    `insert into project200_exercise_library (
       user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
       daily_goal, target_series, target_reps, target_minutes, target_distance_meters, schedule_config
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, coalesce($13::jsonb, '{"frequency":"daily","interval":1,"intervalUnit":"day"}'::jsonb))
     on conflict (user_id, assigned_profile, exercise_id) do update
     set exercise_name = excluded.exercise_name, category = excluded.category, tracking_type = excluded.tracking_type,
       equipment = excluded.equipment, daily_goal = excluded.daily_goal, target_series = excluded.target_series,
       target_reps = excluded.target_reps, target_minutes = excluded.target_minutes,
       target_distance_meters = excluded.target_distance_meters,
       schedule_config = case when $13::jsonb is null then project200_exercise_library.schedule_config else excluded.schedule_config end, updated_at = now()
     returning *, 0::integer as today_total_reps, 0::numeric as today_duration_minutes, 0::integer as today_distance_meters`,
    [userId, profile, exerciseId, exerciseName, category, trackingType, String(payload.equipment || "").trim().slice(0, 120),
      dailyGoal, targetSeries, targetReps, targetMinutes, targetDistanceMeters, scheduleConfig ? JSON.stringify(scheduleConfig) : null]
  );
  return normalizeExerciseLibraryRow(result.rows[0]);
}

export async function removeProject200ExerciseFromLibrary(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 80);
  if (!exerciseId) throw new Error("Escolha um exercicio valido.");
  const result = await query(
    `delete from project200_exercise_library where user_id = $1 and assigned_profile = $2 and exercise_id = $3 returning exercise_id, exercise_name`,
    [userId, profile, exerciseId]
  );
  if (!result.rows[0]) throw new Error("Exercicio nao encontrado na sua lista.");
  return { exerciseId: String(result.rows[0].exercise_id), exerciseName: String(result.rows[0].exercise_name || "Exercicio") };
}

export async function updateProject200MealSlots(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const mealSlots = [...new Set((Array.isArray(payload.mealSlots) ? payload.mealSlots : []).map(String).filter((key) => MEAL_SLOT_KEYS.has(key)))];
  if (mealSlots.length < 1 || mealSlots.length > 8) throw new Error("Ative entre 1 e 8 refeições.");
  const result = await query(`insert into project200_wellness_preferences (user_id,assigned_profile,meal_slots)
    values ($1,$2,$3::jsonb) on conflict(user_id,assigned_profile) do update set meal_slots=excluded.meal_slots,updated_at=now()
    returning meal_slots`, [userId, profile, JSON.stringify(mealSlots)]);
  return PROJECT200_MEAL_SLOTS.map((slot) => ({ ...slot, enabled: result.rows[0].meal_slots.includes(slot.key) }));
}

export async function approveProject200ExercisePlan(userId, payload = {}) {
  const profileName = normalizeProfileName(payload.profileName);
  const proposed = Array.isArray(payload.exercises) ? payload.exercises.slice(0, 24) : [];
  if (!proposed.length) throw new Error("O plano não possui exercícios para aprovar.");
  const exercises = [];
  for (const item of proposed) {
    exercises.push(await addProject200ExerciseToLibrary(userId, { ...item, profileName }));
  }
  return exercises;
}
export async function startProject200ExerciseSession(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const existing = await getActiveWorkoutRow(userId, profile);
  if (existing) return normalizeWorkoutRow(existing);
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 80);
  const exerciseName = String(payload.exerciseName || "").trim().slice(0, 120);
  const trackingType = TRACKING_TYPES.has(payload.trackingType) ? payload.trackingType : "minutes";
  const category = EXERCISE_CATEGORIES.has(payload.category) ? payload.category : "strength";
  const targetSeries = trackingType === "series" ? clampInteger(payload.targetSeries, 1, 100) : 0;
  const targetReps = trackingType === "series" ? clampInteger(payload.targetReps, 1, 10000) : 0;
  const targetMinutes = trackingType === "minutes" ? Math.max(1, Math.min(1440, Number(payload.targetMinutes || 1) || 1)) : 0;
  const targetDistanceMeters = trackingType === "gps" ? clampInteger(payload.targetDistanceMeters, 100, 10000000) : 0;
  const dailyGoal = trackingType === "series" ? targetSeries * targetReps : trackingType === "gps" ? targetDistanceMeters : targetMinutes;
  if (!exerciseId || exerciseName.length < 2) throw new Error("Escolha um exercicio valido.");
  const equipment = String(payload.equipment || "").trim().slice(0, 120);
  const result = await query(
    `insert into project200_exercise_sessions (
       user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
       target_series, target_reps, target_minutes, target_distance_meters
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *, 0::integer as series_count`,
    [userId, profile, exerciseId, exerciseName, category, trackingType, equipment,
      targetSeries, targetReps, targetMinutes, targetDistanceMeters]
  );
  await query(
    `insert into project200_exercise_library (
       user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
       daily_goal, target_series, target_reps, target_minutes, target_distance_meters
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (user_id, assigned_profile, exercise_id) do update
     set exercise_name = excluded.exercise_name, category = excluded.category, tracking_type = excluded.tracking_type,
       equipment = excluded.equipment, daily_goal = excluded.daily_goal, target_series = excluded.target_series,
       target_reps = excluded.target_reps, target_minutes = excluded.target_minutes,
       target_distance_meters = excluded.target_distance_meters, updated_at = now()`,
    [userId, profile, exerciseId, exerciseName, category, trackingType, equipment,
      dailyGoal, targetSeries, targetReps, targetMinutes, targetDistanceMeters]
  );
  return normalizeWorkoutRow(result.rows[0]);
}
export async function updateProject200ExerciseProgress(userId, sessionId, payload = {}) {
  await ensureProject200WellnessSchema();
  const result = await query(
    `update project200_exercise_sessions
     set steps = greatest(steps, $3), duration_minutes = greatest(duration_minutes, $4),
       distance_meters = greatest(distance_meters, $5), updated_at = now()
     where id = $1 and user_id = $2 and status = 'active' returning *`,
    [sessionId, userId, clampInteger(payload.steps, 0, 200000), Math.max(0, Math.min(1440, Number(payload.durationMinutes || 0) || 0)), clampInteger(payload.distanceMeters, 0, 10000000)]
  );
  if (!result.rows[0]) throw new Error("Treino ativo nao encontrado.");
  return normalizeWorkoutRow(await getActiveWorkoutRow(userId, result.rows[0].assigned_profile));
}

export function normalizeProject200WorkoutSeries(series = []) {
  return (Array.isArray(series) ? series : []).slice(0, 100).map((item, index) => ({
    seriesNumber: clampInteger(item?.seriesNumber ?? item?.series_number ?? index + 1, 1, 100),
    repetitions: clampInteger(item?.repetitions ?? item?.reps, 1, 10000),
    targetRepetitions: clampInteger(item?.targetRepetitions ?? item?.target_repetitions, 0, 10000)
  })).filter((item, index, items) => items.findIndex((candidate) => candidate.seriesNumber === item.seriesNumber) === index);
}

async function syncProject200ExerciseSeries(userId, sessionId, series = []) {
  const normalized = normalizeProject200WorkoutSeries(series);
  if (!normalized.length) return [];
  const sessionResult = await query(
    `select id from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'active' and tracking_type = 'series' limit 1`,
    [sessionId, userId]
  );
  if (!sessionResult.rows[0]) throw new Error("Treino ativo nao encontrado.");
  await query(
    `insert into project200_exercise_series (session_id, user_id, series_number, repetitions, target_repetitions)
     select $1, $2, item.series_number, item.repetitions, item.target_repetitions
     from jsonb_to_recordset($3::jsonb) as item(series_number integer, repetitions integer, target_repetitions integer)
     on conflict (session_id, series_number) do update set
       repetitions = excluded.repetitions, target_repetitions = excluded.target_repetitions`,
    [sessionId, userId, JSON.stringify(normalized.map((item) => ({
      series_number: item.seriesNumber,
      repetitions: item.repetitions,
      target_repetitions: item.targetRepetitions
    })))]
  );
  await query(
    `update project200_exercise_sessions set
       total_reps = coalesce((select sum(repetitions) from project200_exercise_series where session_id = $1), 0),
       updated_at = now()
     where id = $1 and user_id = $2 and status = 'active'`,
    [sessionId, userId]
  );
  return normalized;
}

export async function addProject200ExerciseSeries(userId, sessionId, repetitions, targetRepetitions = 0, requestedSeriesNumber = 0) {
  await ensureProject200WellnessSchema();
  const reps = clampInteger(repetitions, 1, 10000);
  const target = clampInteger(targetRepetitions, 0, 10000);
  const sessionResult = await query(
    `select * from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'active' and tracking_type = 'series' limit 1`,
    [sessionId, userId]
  );
  const session = sessionResult.rows[0];
  if (!session) throw new Error("Serie ativa nao encontrada.");
  const suppliedNumber = clampInteger(requestedSeriesNumber, 0, 100);
  const numberResult = suppliedNumber ? null : await query(`select coalesce(max(series_number), 0) + 1 as next_number from project200_exercise_series where session_id = $1`, [sessionId]);
  const seriesNumber = suppliedNumber || Math.max(1, Math.trunc(Number(numberResult?.rows[0]?.next_number || 1)));
  await query(
    `insert into project200_exercise_series (session_id, user_id, series_number, repetitions, target_repetitions)
     values ($1, $2, $3, $4, $5)
     on conflict (session_id, series_number) do update set
       repetitions = excluded.repetitions, target_repetitions = excluded.target_repetitions`,
    [sessionId, userId, seriesNumber, reps, target]
  );
  await query(
    `update project200_exercise_sessions set
       total_reps = coalesce((select sum(repetitions) from project200_exercise_series where session_id = $1), 0),
       updated_at = now()
     where id = $1 and user_id = $2 and status = 'active'`,
    [sessionId, userId]
  );
  return { seriesNumber, repetitions: reps, targetRepetitions: target, workout: normalizeWorkoutRow(await getActiveWorkoutRow(userId, session.assigned_profile)) };
}

async function creditProject200ExerciseMuscles(userId, workoutRow) {
  if (!workoutRow?.id || workoutRow.tracking_type !== "series") return [];
  const [seriesResult, definitionResult] = await Promise.all([
    query(`select repetitions from project200_exercise_series where session_id = $1 order by series_number`, [workoutRow.id]),
    query(`select * from project200_exercise_definitions where exercise_id = $1 limit 1`, [workoutRow.exercise_id])
  ]);
  const definition = definitionResult.rows[0] ? normalizeProject200ExerciseDefinition(definitionResult.rows[0]) : null;
  const gains = calculateProject200ExerciseMuscleGains(seriesResult.rows, definition?.muscles);
  const profile = normalizeProfileName(workoutRow.assigned_profile);
  for (const gain of gains) {
    await query(
      `with inserted_credit as (
         insert into project200_exercise_muscle_credits (session_id, muscle_id, user_id, assigned_profile, points)
         values ($1, $4, $2, $3, $5)
         on conflict (session_id, muscle_id) do nothing
         returning points
       )
       insert into project200_exercise_muscle_state (user_id, assigned_profile, muscle_id, points, updated_at)
       select $2, $3, $4, points, now() from inserted_credit
       on conflict (user_id, assigned_profile, muscle_id) do update set
         points = greatest(
           0::numeric,
           project200_exercise_muscle_state.points
             - greatest(0, floor(extract(epoch from (now() - project200_exercise_muscle_state.updated_at)) / 1500)) * $6::numeric
         ) + excluded.points,
         updated_at = now()`,
      [workoutRow.id, userId, profile, gain.muscleId, gain.points, PROJECT200_MUSCLE_POINTS_PER_PERCENT]
    );
  }
  return gains;
}

export async function finishProject200ExerciseSession(userId, sessionId, payload = {}) {
  await ensureProject200WellnessSchema();
  if (Array.isArray(payload.series) && payload.series.length) {
    await syncProject200ExerciseSeries(userId, sessionId, payload.series);
  }
  const result = await query(
    `update project200_exercise_sessions
     set status = 'completed', completed_at = now(), steps = greatest(steps, $3), distance_meters = greatest(distance_meters, $4),
       duration_minutes = greatest(duration_minutes, case when tracking_type in ('minutes', 'steps', 'gps') then greatest(0, extract(epoch from (now() - started_at)) / 60) else duration_minutes end),
       updated_at = now()
     where id = $1 and user_id = $2 and status = 'active' returning *`,
    [sessionId, userId, clampInteger(payload.steps, 0, 200000), clampInteger(payload.distanceMeters, 0, 10000000)]
  );
  let workoutRow = result.rows[0];
  if (!workoutRow) {
    const completedResult = await query(
      `select * from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'completed' limit 1`,
      [sessionId, userId]
    );
    workoutRow = completedResult.rows[0];
  }
  if (!workoutRow) throw new Error("Treino ativo nao encontrado.");
  await creditProject200ExerciseMuscles(userId, workoutRow);
  const countResult = await query(`select count(*)::integer as series_count from project200_exercise_series where session_id = $1`, [sessionId]);
  return normalizeWorkoutRow({ ...workoutRow, series_count: countResult.rows[0]?.series_count || 0 });
}

export async function discardProject200ExerciseSession(userId, sessionId) {
  await ensureProject200WellnessSchema();
  const result = await query(
    `delete from project200_exercise_sessions
     where id = $1 and user_id = $2 and status = 'active'
     returning id, exercise_name, assigned_profile`,
    [sessionId, userId]
  );
  if (!result.rows[0]) throw new Error("Treino ativo nao encontrado.");
  return {
    id: String(result.rows[0].id),
    exerciseName: String(result.rows[0].exercise_name || "Treino"),
    profileName: normalizeProfileName(result.rows[0].assigned_profile)
  };
}

async function rebuildProject200ExerciseMuscleState(client, userId, profileName) {
  const profile = normalizeProfileName(profileName);
  const creditResult = await client.query(
    `select session_id, muscle_id, points, credited_at
     from project200_exercise_muscle_credits
     where user_id = $1 and assigned_profile = $2
     order by muscle_id asc, credited_at asc, session_id asc`,
    [userId, profile]
  );
  const states = new Map();
  for (const credit of creditResult.rows) {
    const muscleId = String(credit.muscle_id || "");
    const creditedAt = new Date(credit.credited_at);
    if (!muscleId || Number.isNaN(creditedAt.getTime())) continue;
    const previous = states.get(muscleId);
    const elapsedMinutes = previous ? Math.max(0, creditedAt.getTime() - previous.updatedAt.getTime()) / 60000 : 0;
    const points = project200DecayedMusclePoints(previous?.points || 0, elapsedMinutes) + Math.max(0, Number(credit.points || 0));
    states.set(muscleId, { muscleId, points, updatedAt: creditedAt });
  }
  await client.query(
    `delete from project200_exercise_muscle_state where user_id = $1 and assigned_profile = $2`,
    [userId, profile]
  );
  const rows = [...states.values()].filter((item) => item.points > 0).map((item) => ({
    muscle_id: item.muscleId,
    points: item.points,
    updated_at: item.updatedAt.toISOString()
  }));
  if (!rows.length) return;
  await client.query(
    `insert into project200_exercise_muscle_state (user_id, assigned_profile, muscle_id, points, updated_at)
     select $1, $2, item.muscle_id, item.points, item.updated_at
     from jsonb_to_recordset($3::jsonb) as item(muscle_id text, points numeric, updated_at timestamptz)`,
    [userId, profile, JSON.stringify(rows)]
  );
}

export async function deleteProject200CompletedExerciseSession(userId, sessionId, fallbackProfileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200WellnessSchema();
  if (!db) throw new Error("DATABASE_URL nao configurada.");
  const client = await db.connect();
  try {
    await client.query("begin");
    const workoutResult = await client.query(
      `select id, exercise_name, assigned_profile
       from project200_exercise_sessions
       where id = $1 and user_id = $2 and status = 'completed'
       for update`,
      [sessionId, userId]
    );
    const workout = workoutResult.rows[0];
    if (!workout) {
      await client.query("commit");
      return {
        id: String(sessionId),
        exerciseName: "Treino",
        profileName: normalizeProfileName(fallbackProfileName),
        alreadyDeleted: true
      };
    }
    await client.query(
      `delete from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'completed'`,
      [sessionId, userId]
    );
    await rebuildProject200ExerciseMuscleState(client, userId, workout.assigned_profile);
    await client.query("commit");
    return {
      id: String(workout.id),
      exerciseName: String(workout.exercise_name || "Treino"),
      profileName: normalizeProfileName(workout.assigned_profile)
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
export async function updateProject200WellnessPreferences(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const heightValue = Number(payload.heightCm);
  const heightCm = Number.isFinite(heightValue) && heightValue >= 80 && heightValue <= 260 ? Math.round(heightValue * 10) / 10 : null;
  const askagain1 = payload.askagain1 === "no" ? "no" : "yes";
  const result = await query(
    `insert into project200_wellness_preferences (user_id, assigned_profile, height_cm, askagain1)
     values ($1, $2, $3, $4) on conflict (user_id, assigned_profile) do update
     set height_cm = coalesce(excluded.height_cm, project200_wellness_preferences.height_cm), askagain1 = excluded.askagain1, updated_at = now()
     returning height_cm, askagain1`,
    [userId, profile, heightCm, askagain1]
  );
  return { heightCm: result.rows[0]?.height_cm ? Number(result.rows[0].height_cm) : null, askagain1: result.rows[0]?.askagain1 === "no" ? "no" : "yes" };
}

export async function createProject200WeightEntry(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const weightKg = Math.round(Number(payload.weightKg || 0) * 100) / 100;
  if (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 500) throw new Error("Informe um peso valido entre 1 e 500 kg.");
  const measuredAt = new Date(payload.measuredAt || Date.now());
  if (Number.isNaN(measuredAt.getTime())) throw new Error("Data de pesagem invalida.");
  const result = await query(
    `insert into project200_weight_entries (user_id, assigned_profile, weight_kg, measured_at)
     values ($1, $2, $3, $4) returning *`,
    [userId, profile, weightKg, measuredAt.toISOString()]
  );
  return normalizeWeightRow(result.rows[0]);
}
