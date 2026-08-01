import { query } from "./db.js";
import { PROJECT200_DEFAULT_PROFILE_NAME, resolveProject200ProfileName } from "./project200-profiles.js";

const PROJECT_ITEM_TYPES = new Set(["step", "action", "mission", "limit"]);

function normalizeText(value, max = 160) {
  return String(value || "").normalize("NFC").replace(/\s+/gu, " ").trim().slice(0, max);
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function normalizeItem(item = {}) {
  const itemType = PROJECT_ITEM_TYPES.has(String(item.itemType || "").trim()) ? String(item.itemType).trim() : "step";
  const itemId = String(item.itemId || "").trim() || null;
  const title = normalizeText(item.title, 160);
  const durationMinutes = Math.max(1, Math.min(1440, Math.trunc(Number(item.durationMinutes || 5) || 5)));
  if (itemType === "step" && !title) throw new Error("Dê um título para a etapa.");
  if (itemType !== "step" && !itemId) throw new Error("Escolha um item da sua lista.");
  return { itemType, itemId, title, durationMinutes };
}

function mapProject(row, items = []) {
  return {
    id: String(row.id),
    profileName: String(row.assigned_profile || PROJECT200_DEFAULT_PROFILE_NAME),
    name: String(row.name || "Projeto"),
    kind: String(row.kind || "project"),
    startsOn: String(row.starts_on || ""),
    endsOn: String(row.ends_on || ""),
    finalPercent: row.final_percent == null ? null : Number(row.final_percent),
    overallPercent: row.overall_percent == null ? 0 : Number(row.overall_percent),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    items
  };
}

function mapItem(row) {
  return {
    id: String(row.id),
    itemType: String(row.item_type),
    itemId: row.item_id ? String(row.item_id) : null,
    title: String(row.title || ""),
    durationMinutes: Math.max(1, Number(row.duration_minutes || 5)),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
  };
}

export async function ensureProject200ProjectsSchema() {
  await query(`
    create table if not exists project200_projects (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      name text not null,
      kind text not null default 'project',
      starts_on date not null default current_date,
      ends_on date not null,
      final_percent numeric(5,2),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`
    create table if not exists project200_project_items (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references project200_projects(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      item_type text not null,
      item_id uuid,
      title text not null default '',
      duration_minutes integer not null default 5,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create table if not exists project200_project_daily_progress (
      project_id uuid not null references project200_projects(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      scope_date date not null default current_date,
      progress_percent numeric(5,2) not null default 0,
      updated_at timestamptz not null default now(),
      primary key (project_id, scope_date)
    )
  `);
  await query("create index if not exists idx_project200_projects_owner on project200_projects(user_id, assigned_profile, created_at desc)");
  await query("create index if not exists idx_project200_project_items_project on project200_project_items(project_id, created_at asc)");
}

export async function listProject200Projects(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200ProjectsSchema();
  const profile = await resolveProject200ProfileName(userId, profileName);
  const result = await query(`
    select project.*, progress.overall_percent
    from project200_projects project
    left join (
      select project_id, round(avg(progress_percent), 2) as overall_percent
      from project200_project_daily_progress
      where user_id = $1
      group by project_id
    ) progress on progress.project_id = project.id
    where project.user_id = $1 and project.assigned_profile = $2
    order by project.created_at desc
  `, [userId, profile]);
  if (!result.rows.length) return [];
  const ids = result.rows.map((row) => row.id);
  const itemResult = await query(`select * from project200_project_items where user_id = $1 and project_id = any($2::uuid[]) order by created_at asc`, [userId, ids]);
  const byProject = new Map();
  itemResult.rows.forEach((row) => {
    const key = String(row.project_id);
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(mapItem(row));
  });
  return result.rows.map((row) => mapProject(row, byProject.get(String(row.id)) || []));
}

export async function createProject200Project(userId, profileName, payload = {}) {
  await ensureProject200ProjectsSchema();
  const profile = await resolveProject200ProfileName(userId, profileName);
  const name = normalizeText(payload.name, 120);
  const kind = String(payload.kind || "project") === "dream" ? "dream" : "project";
  const startsOn = normalizeDate(payload.startsOn);
  const endsOn = normalizeDate(payload.endsOn);
  if (!name) throw new Error("Dê um nome ao projeto.");
  if (!startsOn || !endsOn || endsOn < startsOn) throw new Error("Escolha um prazo válido.");
  const projectResult = await query(`insert into project200_projects (user_id, assigned_profile, name, kind, starts_on, ends_on) values ($1,$2,$3,$4,$5::date,$6::date) returning *`, [userId, profile, name, kind, startsOn, endsOn]);
  const project = projectResult.rows[0];
  for (const rawItem of Array.isArray(payload.items) ? payload.items.slice(0, 200) : []) {
    const item = normalizeItem(rawItem);
    await query(`insert into project200_project_items (project_id, user_id, item_type, item_id, title, duration_minutes) values ($1,$2,$3,$4::uuid,$5,$6)`, [project.id, userId, item.itemType, item.itemId, item.title, item.durationMinutes]);
  }
  return (await listProject200Projects(userId, profile)).find((item) => item.id === String(project.id));
}

export async function replaceProject200ProjectItems(userId, profileName, projectId, items = []) {
  await ensureProject200ProjectsSchema();
  const profile = await resolveProject200ProfileName(userId, profileName);
  const owner = await query(`select id from project200_projects where id = $1 and user_id = $2 and assigned_profile = $3`, [projectId, userId, profile]);
  if (!owner.rows[0]) throw new Error("Projeto não encontrado.");
  const existing = await query(`select * from project200_project_items where project_id = $1 and user_id = $2`, [projectId, userId]);
  const completedByKey = new Map(existing.rows.map((row) => [`${row.item_type}:${row.item_id || row.title}`, row.completed_at]));
  await query(`delete from project200_project_items where project_id = $1 and user_id = $2`, [projectId, userId]);
  for (const rawItem of Array.isArray(items) ? items.slice(0, 200) : []) {
    const item = normalizeItem(rawItem);
    const completedAt = completedByKey.get(`${item.itemType}:${item.itemId || item.title}`) || null;
    await query(`insert into project200_project_items (project_id,user_id,item_type,item_id,title,duration_minutes,completed_at) values ($1,$2,$3,$4::uuid,$5,$6,$7)`, [projectId,userId,item.itemType,item.itemId,item.title,item.durationMinutes,completedAt]);
  }
  return (await listProject200Projects(userId, profile)).find((item) => item.id === String(projectId));
}


export async function recordProject200DailyProgress(userId, projectId, percent) {
  await ensureProject200ProjectsSchema();
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  const owner = await query(`select id, ends_on from project200_projects where id = $1 and user_id = $2`, [projectId, userId]);
  if (!owner.rows[0]) throw new Error("Projeto não encontrado.");
  if (String(owner.rows[0].ends_on || "") < new Date().toISOString().slice(0, 10)) return null;
  await query(`
    insert into project200_project_daily_progress (project_id, user_id, scope_date, progress_percent, updated_at)
    values ($1, $2, current_date, $3, now())
    on conflict (project_id, scope_date)
    do update set progress_percent = excluded.progress_percent, updated_at = now()
  `, [projectId, userId, value]);
  const result = await query(`select round(avg(progress_percent), 2) as overall_percent from project200_project_daily_progress where project_id = $1 and user_id = $2`, [projectId, userId]);
  return Number(result.rows[0]?.overall_percent || 0);
}

export async function toggleProject200Step(userId, projectId, itemId, completed) {
  await ensureProject200ProjectsSchema();
  const result = await query(`update project200_project_items set completed_at = case when $4::boolean then now() else null end where id = $1 and project_id = $2 and user_id = $3 and item_type = 'step' returning *`, [itemId, projectId, userId, Boolean(completed)]);
  if (!result.rows[0]) throw new Error("Etapa não encontrada.");
  return mapItem(result.rows[0]);
}
