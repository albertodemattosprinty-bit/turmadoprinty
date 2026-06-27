import crypto from "node:crypto";

import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const PROJECT200_TIME_ZONE = "America/Sao_Paulo";

const DEFAULT_DAILY_MISSIONS = [
  { title: "Beber um copo de água", targetCount: 6 },
  { title: "Respirar profundamente", targetCount: 6 },
  { title: "Um minuto de organização", targetCount: 6 },
  { title: "Agradecer alguma coisa", targetCount: 6 },
  { title: "Um minuto, atenção plena", targetCount: 6 }
];

function normalizeMissionTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
}

function normalizeMissionProfile(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const target = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT200_TIME_ZONE,
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

function normalizeMissionRow(row) {
  const targetCount = Math.max(1, Math.trunc(Number(row.target_count || 0) || 1));
  const progressCount = Math.max(0, Math.trunc(Number(row.progress_count || 0) || 0));
  const percent = Math.max(0, Math.min(100, Math.round((progressCount / targetCount) * 100)));
  return {
    id: row.id,
    userId: row.user_id,
    profileName: normalizeMissionProfile(row.assigned_profile),
    title: normalizeMissionTitle(row.title),
    targetCount,
    progressCount,
    remainingCount: Math.max(0, targetCount - progressCount),
    percent,
    isDefault: Boolean(row.is_default),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function ensureProject200MissionsSchema() {
  await query(`
    create table if not exists project200_daily_mission_templates (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      title text not null,
      target_count integer not null default 1,
      sort_order integer not null default 0,
      is_default boolean not null default false,
      deleted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists project200_daily_mission_progress (
      id uuid primary key,
      template_id uuid not null references project200_daily_mission_templates(id) on delete cascade,
      progress_date date not null,
      progress_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (template_id, progress_date)
    );
  `);
  await query("create index if not exists idx_project200_daily_mission_templates_user_profile on project200_daily_mission_templates(user_id, assigned_profile, sort_order, created_at);");
  await query("create index if not exists idx_project200_daily_mission_progress_template_date on project200_daily_mission_progress(template_id, progress_date);");
}

async function seedDefaultDailyMissions(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200MissionsSchema();
  const normalizedProfile = normalizeMissionProfile(profileName);
  const existing = await query(
    `
      select count(*)::int as total
      from project200_daily_mission_templates
      where user_id = $1
        and assigned_profile = $2
    `,
    [userId, normalizedProfile]
  );
  const total = Number(existing.rows[0]?.total || 0);
  if (total > 0) {
    return;
  }
  for (const [index, mission] of DEFAULT_DAILY_MISSIONS.entries()) {
    await query(
      `
        insert into project200_daily_mission_templates (
          id, user_id, assigned_profile, title, target_count, sort_order, is_default, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, true, now(), now())
      `,
      [crypto.randomUUID(), userId, normalizedProfile, mission.title, Math.max(1, Math.trunc(Number(mission.targetCount) || 1)), index]
    );
  }
}

export async function listProject200DailyMissions(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, date = new Date()) {
  await seedDefaultDailyMissions(userId, profileName);
  const normalizedProfile = normalizeMissionProfile(profileName);
  const dateKey = toDateKey(date);
  const result = await query(
    `
      select
        t.id,
        t.user_id,
        t.assigned_profile,
        t.title,
        t.target_count,
        t.sort_order,
        t.is_default,
        t.created_at,
        t.updated_at,
        coalesce(p.progress_count, 0) as progress_count
      from project200_daily_mission_templates t
      left join project200_daily_mission_progress p
        on p.template_id = t.id
       and p.progress_date = $3::date
      where t.user_id = $1
        and t.assigned_profile = $2
        and t.deleted_at is null
      order by t.sort_order asc, t.created_at asc
    `,
    [userId, normalizedProfile, dateKey]
  );
  return result.rows.map(normalizeMissionRow);
}

export async function createProject200DailyMission(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, payload = {}) {
  await ensureProject200MissionsSchema();
  const normalizedProfile = normalizeMissionProfile(profileName);
  const title = normalizeMissionTitle(payload?.title);
  const targetCount = Math.max(1, Math.trunc(Number(payload?.targetCount) || 1));
  if (!title) {
    throw new Error("Informe o nome da missão.");
  }
  const sortResult = await query(
    `
      select coalesce(max(sort_order), -1) + 1 as next_sort
      from project200_daily_mission_templates
      where user_id = $1
        and assigned_profile = $2
    `,
    [userId, normalizedProfile]
  );
  const nextSort = Number(sortResult.rows[0]?.next_sort || 0);
  await query(
    `
      insert into project200_daily_mission_templates (
        id, user_id, assigned_profile, title, target_count, sort_order, is_default, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, false, now(), now())
    `,
    [crypto.randomUUID(), userId, normalizedProfile, title, targetCount, nextSort]
  );
  const items = await listProject200DailyMissions(userId, normalizedProfile);
  return items;
}

export async function deleteProject200DailyMission(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, missionId = "") {
  await ensureProject200MissionsSchema();
  const normalizedProfile = normalizeMissionProfile(profileName);
  const safeMissionId = String(missionId || "").trim();
  if (!safeMissionId) {
    throw new Error("Missão inválida.");
  }
  await query(
    `
      update project200_daily_mission_templates
      set deleted_at = now(),
          updated_at = now()
      where id = $1
        and user_id = $2
        and assigned_profile = $3
        and deleted_at is null
    `,
    [safeMissionId, userId, normalizedProfile]
  );
  return listProject200DailyMissions(userId, normalizedProfile);
}

export async function updateProject200DailyMissionProgress(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, missionId = "", delta = 0, date = new Date()) {
  await ensureProject200MissionsSchema();
  const normalizedProfile = normalizeMissionProfile(profileName);
  const safeMissionId = String(missionId || "").trim();
  const safeDelta = Math.trunc(Number(delta) || 0);
  if (!safeMissionId) {
    throw new Error("Missão inválida.");
  }
  if (!safeDelta) {
    return listProject200DailyMissions(userId, normalizedProfile, date);
  }
  const templateResult = await query(
    `
      select id, target_count
      from project200_daily_mission_templates
      where id = $1
        and user_id = $2
        and assigned_profile = $3
        and deleted_at is null
      limit 1
    `,
    [safeMissionId, userId, normalizedProfile]
  );
  const template = templateResult.rows[0];
  if (!template) {
    throw new Error("Missão não encontrada.");
  }
  const targetCount = Math.max(1, Math.trunc(Number(template.target_count || 0) || 1));
  const dateKey = toDateKey(date);
  await query(
    `
      insert into project200_daily_mission_progress (
        id, template_id, progress_date, progress_count, created_at, updated_at
      )
      values ($1, $2, $3::date, greatest(0, least($5, $4)), now(), now())
      on conflict (template_id, progress_date) do update
        set progress_count = greatest(0, least($5, project200_daily_mission_progress.progress_count + $4)),
            updated_at = now()
    `,
    [crypto.randomUUID(), safeMissionId, dateKey, safeDelta, targetCount]
  );
  return listProject200DailyMissions(userId, normalizedProfile, date);
}

export async function summarizeProject200DailyMissions(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, date = new Date()) {
  const missions = await listProject200DailyMissions(userId, profileName, date);
  const completed = missions.filter((item) => item.progressCount >= item.targetCount);
  return {
    total: missions.length,
    completed: completed.length,
    pending: Math.max(0, missions.length - completed.length),
    lines: missions.slice(0, 8).map((item) => `${item.title}: ${item.progressCount}/${item.targetCount} (${item.percent}%)`)
  };
}
