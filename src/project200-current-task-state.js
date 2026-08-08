import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

let schemaPromise = null;

function normalizeProfile(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function normalizeIds(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean))].slice(0, 12);
}

function normalizeCycleDurations(value) {
  return (Array.isArray(value) ? value : [])
    .map((seconds) => Math.max(0, Math.min(10800, Math.trunc(Number(seconds || 0) || 0))))
    .filter((seconds) => seconds > 0)
    .slice(0, 12);
}

function normalizeTimestamp(value, fallback = new Date()) {
  const timestamp = new Date(value || fallback).getTime();
  return new Date(Number.isFinite(timestamp) ? timestamp : fallback).toISOString();
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    profile: row.assigned_profile,
    goalId: row.goal_id,
    variantId: row.variant_id || "",
    variantIds: normalizeIds(row.variant_ids),
    taskKind: row.task_kind,
    durationSeconds: Math.max(0, Math.trunc(Number(row.duration_seconds || 0) || 0)),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    cycleStartedAt: row.cycle_started_at ? new Date(row.cycle_started_at).toISOString() : (row.started_at ? new Date(row.started_at).toISOString() : null),
    cycleTarget: Math.max(1, Math.min(12, Math.trunc(Number(row.cycle_target || 1) || 1))),
    cycleIndex: Math.max(1, Math.min(12, Math.trunc(Number(row.cycle_index || 1) || 1))),
    completedCycles: Math.max(0, Math.min(12, Math.trunc(Number(row.completed_cycles || 0) || 0))),
    cycleDurationsSeconds: normalizeCycleDurations(row.cycle_durations_seconds),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function ensureProject200CurrentTaskStateSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`
        create table if not exists project200_current_task_state (
          user_id uuid primary key references users(id) on delete cascade,
          assigned_profile text not null default 'Usuario',
          goal_id uuid not null,
          variant_id uuid,
          variant_ids jsonb not null default '[]'::jsonb,
          task_kind text not null default 'mission',
          duration_seconds integer not null default 0,
          started_at timestamptz not null default now(),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          check (task_kind in ('mission', 'microtask'))
        );
      `);
      await query("create index if not exists idx_project200_current_task_state_goal on project200_current_task_state(goal_id);");
      await query("alter table project200_current_task_state add column if not exists cycle_started_at timestamptz;");
      await query("alter table project200_current_task_state add column if not exists cycle_target integer not null default 1;");
      await query("alter table project200_current_task_state add column if not exists cycle_index integer not null default 1;");
      await query("alter table project200_current_task_state add column if not exists completed_cycles integer not null default 0;");
      await query("alter table project200_current_task_state add column if not exists cycle_durations_seconds jsonb not null default '[]'::jsonb;");
      await query("update project200_current_task_state set cycle_started_at = started_at where cycle_started_at is null;");
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function getProject200CurrentTaskState(userId) {
  await ensureProject200CurrentTaskStateSchema();
  const result = await query("select * from project200_current_task_state where user_id = $1 limit 1", [userId]);
  return normalizeRow(result.rows[0]);
}

export async function saveProject200CurrentTaskState(userId, payload = {}) {
  await ensureProject200CurrentTaskStateSchema();
  const profile = normalizeProfile(payload?.profile);
  const goalId = String(payload?.goalId || "").trim();
  const variantId = String(payload?.variantId || "").trim() || null;
  const variantIds = normalizeIds(payload?.variantIds);
  const taskKind = String(payload?.taskKind || "mission").trim().toLowerCase() === "microtask" ? "microtask" : "mission";
  const durationSeconds = Math.max(0, Math.min(10800, Math.trunc(Number(payload?.durationSeconds || 0) || 0)));
  const cycleTarget = Math.max(1, Math.min(12, Math.trunc(Number(payload?.cycleTarget || 1) || 1)));
  const cycleIndex = Math.max(1, Math.min(cycleTarget, Math.trunc(Number(payload?.cycleIndex || 1) || 1)));
  const completedCycles = Math.max(0, Math.min(cycleTarget, Math.trunc(Number(payload?.completedCycles || 0) || 0)));
  const cycleDurationsSeconds = normalizeCycleDurations(payload?.cycleDurationsSeconds);
  const startedAt = normalizeTimestamp(payload?.startedAt);
  const cycleStartedAt = normalizeTimestamp(payload?.cycleStartedAt, new Date(startedAt));
  const resetStartedAt = payload?.resetStartedAt === true;
  if (!goalId) throw new Error("Missao invalida.");
  const result = await query(`
    insert into project200_current_task_state (
      user_id, assigned_profile, goal_id, variant_id, variant_ids, task_kind, duration_seconds,
      started_at, cycle_started_at, cycle_target, cycle_index, completed_cycles, cycle_durations_seconds
    )
    values ($1, $2, $3::uuid, $4::uuid, $5::jsonb, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12, $13::jsonb)
    on conflict (user_id) do update
      set assigned_profile = excluded.assigned_profile,
          goal_id = excluded.goal_id,
          variant_id = excluded.variant_id,
          variant_ids = excluded.variant_ids,
          task_kind = excluded.task_kind,
          duration_seconds = excluded.duration_seconds,
          started_at = case when $14::boolean then excluded.started_at else project200_current_task_state.started_at end,
          cycle_started_at = excluded.cycle_started_at,
          cycle_target = excluded.cycle_target,
          cycle_index = excluded.cycle_index,
          completed_cycles = excluded.completed_cycles,
          cycle_durations_seconds = excluded.cycle_durations_seconds,
          updated_at = now()
    returning *
  `, [userId, profile, goalId, variantId, JSON.stringify(variantIds), taskKind, durationSeconds, startedAt, cycleStartedAt, cycleTarget, cycleIndex, completedCycles, JSON.stringify(cycleDurationsSeconds), resetStartedAt]);
  return normalizeRow(result.rows[0]);
}

export async function clearProject200CurrentTaskState(userId) {
  await ensureProject200CurrentTaskStateSchema();
  await query("delete from project200_current_task_state where user_id = $1", [userId]);
}
