import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const TRACKING_TYPES = new Set(["steps", "minutes", "series"]);

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
    totalReps: Math.max(0, Math.trunc(Number(row.total_reps || 0) || 0)), seriesCount: Math.max(0, Math.trunc(Number(row.series_count || 0) || 0))
  };
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
  await query(`create index if not exists idx_project200_exercise_user_profile_date on project200_exercise_sessions(user_id, assigned_profile, started_at desc)`);
  await query(`create unique index if not exists idx_project200_exercise_active on project200_exercise_sessions(user_id, assigned_profile) where status = 'active'`);
  await query(`create table if not exists project200_exercise_series (
    id uuid primary key default gen_random_uuid(), session_id uuid not null references project200_exercise_sessions(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade, series_number integer not null,
    repetitions integer not null default 0, completed_at timestamptz not null default now(), unique (session_id, series_number)
  )`);
  await query(`create index if not exists idx_project200_exercise_series_session on project200_exercise_series(session_id, series_number)`);
}

async function getActiveWorkoutRow(userId, profileName) {
  const result = await query(
    `select session.*, coalesce(series.series_count, 0)::integer as series_count
     from project200_exercise_sessions session
     left join lateral (
       select count(*)::integer as series_count from project200_exercise_series item where item.session_id = session.id
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
  const [mealResult, summaryResult, workoutResult, recentWorkoutResult] = await Promise.all([
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
    )
  ]);
  const summary = summaryResult.rows[0] || {};
  return {
    profileName: profile,
    today: {
      calories: Math.round(Number(summary.total_calories || 0)),
      qualityScore: clampInteger(summary.quality_score, 0, 100),
      mealCount: Math.max(0, Math.trunc(Number(summary.meal_count || 0) || 0))
    },
    meals: mealResult.rows.map(normalizeMealRow),
    activeWorkout: normalizeWorkoutRow(workoutResult),
    recentWorkouts: recentWorkoutResult.rows.map(normalizeWorkoutRow)
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

export async function startProject200ExerciseSession(userId, payload = {}) {
  await ensureProject200WellnessSchema();
  const profile = normalizeProfileName(payload.profileName);
  const existing = await getActiveWorkoutRow(userId, profile);
  if (existing) return normalizeWorkoutRow(existing);
  const exerciseId = String(payload.exerciseId || "").trim().slice(0, 80);
  const exerciseName = String(payload.exerciseName || "").trim().slice(0, 120);
  const trackingType = TRACKING_TYPES.has(payload.trackingType) ? payload.trackingType : "minutes";
  if (!exerciseId || exerciseName.length < 2) throw new Error("Escolha um exercicio valido.");
  const result = await query(
    `insert into project200_exercise_sessions (
       user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment
     ) values ($1, $2, $3, $4, $5, $6, $7) returning *, 0::integer as series_count`,
    [userId, profile, exerciseId, exerciseName, payload.category === "fat_loss" ? "fat_loss" : "strength", trackingType, String(payload.equipment || "").trim().slice(0, 120)]
  );
  return normalizeWorkoutRow(result.rows[0]);
}

export async function updateProject200ExerciseProgress(userId, sessionId, payload = {}) {
  await ensureProject200WellnessSchema();
  const result = await query(
    `update project200_exercise_sessions
     set steps = greatest(steps, $3), duration_minutes = greatest(duration_minutes, $4), updated_at = now()
     where id = $1 and user_id = $2 and status = 'active' returning *`,
    [sessionId, userId, clampInteger(payload.steps, 0, 200000), Math.max(0, Math.min(1440, Number(payload.durationMinutes || 0) || 0))]
  );
  if (!result.rows[0]) throw new Error("Treino ativo nao encontrado.");
  return normalizeWorkoutRow(await getActiveWorkoutRow(userId, result.rows[0].assigned_profile));
}

export async function addProject200ExerciseSeries(userId, sessionId, repetitions) {
  await ensureProject200WellnessSchema();
  const reps = clampInteger(repetitions, 1, 10000);
  const sessionResult = await query(
    `select * from project200_exercise_sessions where id = $1 and user_id = $2 and status = 'active' and tracking_type = 'series' limit 1`,
    [sessionId, userId]
  );
  const session = sessionResult.rows[0];
  if (!session) throw new Error("Serie ativa nao encontrada.");
  const numberResult = await query(`select coalesce(max(series_number), 0) + 1 as next_number from project200_exercise_series where session_id = $1`, [sessionId]);
  const seriesNumber = Math.max(1, Math.trunc(Number(numberResult.rows[0]?.next_number || 1)));
  await query(
    `insert into project200_exercise_series (session_id, user_id, series_number, repetitions) values ($1, $2, $3, $4)`,
    [sessionId, userId, seriesNumber, reps]
  );
  await query(`update project200_exercise_sessions set total_reps = total_reps + $3, updated_at = now() where id = $1 and user_id = $2`, [sessionId, userId, reps]);
  return { seriesNumber, repetitions: reps, workout: normalizeWorkoutRow(await getActiveWorkoutRow(userId, session.assigned_profile)) };
}

export async function finishProject200ExerciseSession(userId, sessionId, payload = {}) {
  await ensureProject200WellnessSchema();
  const result = await query(
    `update project200_exercise_sessions
     set status = 'completed', completed_at = now(), steps = greatest(steps, $3),
       duration_minutes = greatest(duration_minutes, case when tracking_type in ('minutes', 'steps') then greatest(0, extract(epoch from (now() - started_at)) / 60) else duration_minutes end),
       updated_at = now()
     where id = $1 and user_id = $2 and status = 'active' returning *`,
    [sessionId, userId, clampInteger(payload.steps, 0, 200000)]
  );
  if (!result.rows[0]) throw new Error("Treino ativo nao encontrado.");
  const countResult = await query(`select count(*)::integer as series_count from project200_exercise_series where session_id = $1`, [sessionId]);
  return normalizeWorkoutRow({ ...result.rows[0], series_count: countResult.rows[0]?.series_count || 0 });
}
