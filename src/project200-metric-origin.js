import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function ensureProject200MetricOriginSchema() {
  await query(`
    create table if not exists project200_user_metric_origins (
      user_id uuid primary key references users(id) on delete cascade,
      first_point_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

export async function recordProject200FirstPointOrigin(userId, occurredAt = new Date()) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return null;
  }
  await ensureProject200MetricOriginSchema();
  const safeOccurredAt = toIso(occurredAt) || new Date().toISOString();
  const result = await query(
    `
      insert into project200_user_metric_origins (
        user_id, first_point_at, created_at, updated_at
      )
      values ($1, $2::timestamptz, now(), now())
      on conflict (user_id) do nothing
      returning first_point_at
    `,
    [normalizedUserId, safeOccurredAt]
  );
  return toIso(result.rows[0]?.first_point_at);
}
