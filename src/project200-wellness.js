import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const TRACKING_TYPES = new Set(["steps", "minutes", "series", "gps"]);
const EXERCISE_CATEGORIES = new Set(["strength", "aerobic", "calisthenics"]);

function normalizeProfileName(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.trunc(Number(value || 0) || 0)));
}

function normalizeMealRow(row) {
  return {
    id: String(row.id), profileName: normalizeProfileName(row.assigned_profile),
    description: String(row.description || ""), calories: Math.max(0, Number(row.calories || 0)),
    qualityScore: clampInteger(row.quality_score, 0, 100), feedback: String(row.feedback || ""),
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
    todayTotalReps: Math.max(0, Math.trunc(Number(row?.today_total_reps || 0))),
    todayDurationMinutes: Math.max(0, Number(row?.today_duration_minutes || 0)),
    todayDistanceMeters: Math.max(0, Math.trunc(Number(row?.today_distance_meters || 0)))
  };
}
function normalizeWeightRow(row) {
  if (!row?.id) return null;
  return { id: String(row.id), weightKg: Number(row.weight_kg || 0), measuredAt: new Date(row.measured_at).toISOString() };
}

export async function ensureProject200WellnessSchema() {
  await query(`create table if not exists project200_nutrition_entries (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', description text not null, calories numeric(10,2) not null default 0,
    quality_score integer not null default 0 check (quality_score between 0 and 100), feedback text not null default '',
    components jsonb not null default '[]'::jsonb, consumed_at timestamptz not null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await query(`create index if not exists idx_project200_nutrition_user_profile_date on project200_nutrition_entries(user_id, assigned_profile, consumed_at desc)`);
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
  await query(`create table if not exists project200_wellness_preferences (
    user_id uuid not null references users(id) on delete cascade, assigned_profile text not null default 'Usuario',
    height_cm numeric(6,2) null, askagain1 text not null default 'yes' check (askagain1 in ('yes','no')),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (user_id, assigned_profile)
  )`);
  await query(`create table if not exists project200_weight_entries (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario', weight_kg numeric(6,2) not null check (weight_kg between 1 and 500),
    measured_at timestamptz not null default now(), created_at timestamptz not null default now()
  )`);
  await query(`create index if not exists idx_project200_weight_user_profile_date on project200_weight_entries(user_id, assigned_profile, measured_at desc)`);

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

export async function getProject200WellnessDashboard(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(profileName);
  const [mealResult, summaryResult, workoutResult, recentWorkoutResult, preferencesResult, libraryResult, weightResult] = await Promise.all([
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
    query(`select height_cm, askagain1 from project200_wellness_preferences where user_id = $1 and assigned_profile = $2 limit 1`, [userId, profile]),
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
           and (session.started_at at time zone $3)::date = (now() at time zone $3)::date
       ) stats on true
       where library.user_id = $1 and library.assigned_profile = $2
       order by library.created_at asc`,
      [userId, profile, PROJECT200_TIME_ZONE]
    ),
    query(`select * from project200_weight_entries where user_id = $1 and assigned_profile = $2 order by measured_at desc limit 30`, [userId, profile])
  ]);
  const summary = summaryResult.rows[0] || {};
  const preference = preferencesResult.rows[0] || {};
  const weights = weightResult.rows.map(normalizeWeightRow);
  const heightCm = preference.height_cm ? Number(preference.height_cm) : null;
  const currentWeight = weights[0] || null;
  const bmi = currentWeight && heightCm ? currentWeight.weightKg / ((heightCm / 100) ** 2) : null;
  return {
    profileName: profile,
    today: {
      calories: Math.round(Number(summary.total_calories || 0)),
      qualityScore: clampInteger(summary.quality_score, 0, 100),
      mealCount: Math.max(0, Math.trunc(Number(summary.meal_count || 0) || 0))
    },
    meals: mealResult.rows.map(normalizeMealRow),
    activeWorkout: normalizeWorkoutRow(workoutResult),
    recentWorkouts: recentWorkoutResult.rows.map(normalizeWorkoutRow),
    exerciseLibrary: libraryResult.rows.map(normalizeExerciseLibraryRow),
    wellness: {
      preferences: { heightCm, askagain1: preference.askagain1 === "no" ? "no" : "yes" },
      currentWeight,
      bmi: bmi && Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null,
      weightHistory: weights
    }
  };
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
  const components = (Array.isArray(payload.components) ? payload.components : []).slice(0, 12).map((item) => ({
    name: String(item?.name || "").trim().slice(0, 100),
    calories: Math.max(0, Math.min(10000, Number(item?.calories || 0) || 0))
  })).filter((item) => item.name);
  const result = await query(
    `insert into project200_nutrition_entries (
       user_id, assigned_profile, description, calories, quality_score, feedback, components, consumed_at
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) returning *`,
    [userId, profile, description, calories, qualityScore, feedback, JSON.stringify(components), consumedAt.toISOString()]
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
  const targetSeries = trackingType === "series" ? 3 : 0;
  const targetReps = trackingType === "series" ? 12 : 0;
  const targetMinutes = trackingType === "minutes" ? 30 : 0;
  const targetDistanceMeters = trackingType === "gps" ? 3000 : 0;
  const dailyGoal = trackingType === "series" ? targetSeries * targetReps : trackingType === "gps" ? targetDistanceMeters : targetMinutes;
  const result = await query(
    `insert into project200_exercise_library (
       user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
       daily_goal, target_series, target_reps, target_minutes, target_distance_meters
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (user_id, assigned_profile, exercise_id) do update
     set exercise_name = excluded.exercise_name, category = excluded.category, tracking_type = excluded.tracking_type,
       equipment = excluded.equipment, updated_at = now()
     returning *, 0::integer as today_total_reps, 0::numeric as today_duration_minutes, 0::integer as today_distance_meters`,
    [userId, profile, exerciseId, exerciseName, category, trackingType, String(payload.equipment || "").trim().slice(0, 120),
      dailyGoal, targetSeries, targetReps, targetMinutes, targetDistanceMeters]
  );
  return normalizeExerciseLibraryRow(result.rows[0]);
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

export async function addProject200ExerciseSeries(userId, sessionId, repetitions, targetRepetitions = 0) {
  await ensureProject200WellnessSchema();
  const reps = clampInteger(repetitions, 1, 10000);
  const target = clampInteger(targetRepetitions, 0, 10000);
  const sessionResult = await query(
    `select * from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'active' and tracking_type = 'series' limit 1`,
    [sessionId, userId]
  );
  const session = sessionResult.rows[0];
  if (!session) throw new Error("Serie ativa nao encontrada.");
  const numberResult = await query(`select coalesce(max(series_number), 0) + 1 as next_number from project200_exercise_series where session_id = $1`, [sessionId]);
  const seriesNumber = Math.max(1, Math.trunc(Number(numberResult.rows[0]?.next_number || 1)));
  await query(
    `insert into project200_exercise_series (session_id, user_id, series_number, repetitions, target_repetitions) values ($1, $2, $3, $4, $5)`,
    [sessionId, userId, seriesNumber, reps, target]
  );
  await query(`update project200_exercise_sessions set total_reps = total_reps + $3, updated_at = now() where id = $1 and user_id = $2`, [sessionId, userId, reps]);
  return { seriesNumber, repetitions: reps, targetRepetitions: target, workout: normalizeWorkoutRow(await getActiveWorkoutRow(userId, session.assigned_profile)) };
}

export async function finishProject200ExerciseSession(userId, sessionId, payload = {}) {
  await ensureProject200WellnessSchema();
  const result = await query(
    `update project200_exercise_sessions
     set status = 'completed', completed_at = now(), steps = greatest(steps, $3), distance_meters = greatest(distance_meters, $4),
       duration_minutes = greatest(duration_minutes, case when tracking_type in ('minutes', 'steps', 'gps') then greatest(0, extract(epoch from (now() - started_at)) / 60) else duration_minutes end),
       updated_at = now()
     where id = $1 and user_id = $2 and status = 'active' returning *`,
    [sessionId, userId, clampInteger(payload.steps, 0, 200000), clampInteger(payload.distanceMeters, 0, 10000000)]
  );
  if (!result.rows[0]) throw new Error("Treino ativo nao encontrado.");
  const countResult = await query(`select count(*)::integer as series_count from project200_exercise_series where session_id = $1`, [sessionId]);
  return normalizeWorkoutRow({ ...result.rows[0], series_count: countResult.rows[0]?.series_count || 0 });
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
