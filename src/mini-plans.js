import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSelectedBlocks(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => ({
      name: String(item?.name || "").trim(),
      minutes: Number(item?.minutes || 0) || 0
    }))
    .filter((item) => item.name);
}

function normalizeParts(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => ({
      title: String(item?.title || "").trim(),
      minutes: Number(item?.minutes || 0) || 0,
      content: String(item?.content || "").trim()
    }))
    .filter((item) => item.title || item.content);
}

function normalizePlan(row) {
  return {
    id: row.id,
    title: row.title || "Plano de Aula",
    theme: row.theme || "",
    age: Number(row.age || 6) || 6,
    intro: row.intro || "",
    parts: normalizeParts(row.parts || []),
    selectedBlocks: normalizeSelectedBlocks(row.selected_blocks || []),
    content: row.content || "",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function ensureMiniLessonPlansSchema() {
  await query(`
    create table if not exists mini_lesson_plans (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null default 'Plano de Aula',
      theme text not null default '',
      age smallint not null default 6,
      intro text not null default '',
      parts jsonb not null default '[]'::jsonb,
      selected_blocks jsonb not null default '[]'::jsonb,
      content text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await query("create index if not exists idx_mini_lesson_plans_user_updated_at on mini_lesson_plans(user_id, updated_at desc);");
}

export async function listMiniLessonPlans(userId, limit = 20) {
  await ensureMiniLessonPlansSchema();
  const result = await query(
    `
      select id, title, theme, age, intro, parts, selected_blocks, content, created_at, updated_at
      from mini_lesson_plans
      where user_id = $1
      order by updated_at desc, created_at desc
      limit $2
    `,
    [userId, Math.max(1, Math.min(Number(limit) || 20, 50))]
  );
  return result.rows.map(normalizePlan);
}

export async function getMiniLessonPlanById(userId, planId) {
  await ensureMiniLessonPlansSchema();
  const result = await query(
    `
      select id, title, theme, age, intro, parts, selected_blocks, content, created_at, updated_at
      from mini_lesson_plans
      where user_id = $1 and id = $2
      limit 1
    `,
    [userId, planId]
  );
  return result.rows[0] ? normalizePlan(result.rows[0]) : null;
}

export async function createMiniLessonPlan(userId, payload = {}) {
  await ensureMiniLessonPlansSchema();
  const title = String(payload.title || "Plano de Aula").trim() || "Plano de Aula";
  const theme = String(payload.theme || "").trim();
  const age = Math.max(6, Math.min(14, Number(payload.age || 6) || 6));
  const intro = String(payload.intro || "").trim();
  const parts = normalizeParts(payload.parts || []);
  const selectedBlocks = normalizeSelectedBlocks(payload.selectedBlocks || []);
  const content = String(payload.content || "").trim();
  const result = await query(
    `
      insert into mini_lesson_plans (user_id, title, theme, age, intro, parts, selected_blocks, content, created_at, updated_at)
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, now(), now())
      returning id, title, theme, age, intro, parts, selected_blocks, content, created_at, updated_at
    `,
    [userId, title.slice(0, 180), theme.slice(0, 240), age, intro, JSON.stringify(parts), JSON.stringify(selectedBlocks), content]
  );
  return normalizePlan(result.rows[0]);
}

export async function updateMiniLessonPlan(userId, planId, payload = {}) {
  await ensureMiniLessonPlansSchema();
  const current = await getMiniLessonPlanById(userId, planId);
  if (!current) {
    return null;
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : current.title;
  const theme = typeof payload.theme === "string"
    ? payload.theme.trim()
    : current.theme;
  const age = Math.max(6, Math.min(14, Number(payload.age || current.age || 6) || current.age || 6));
  const intro = typeof payload.intro === "string"
    ? payload.intro.trim()
    : current.intro;
  const parts = Array.isArray(payload.parts) ? normalizeParts(payload.parts) : current.parts;
  const selectedBlocks = Array.isArray(payload.selectedBlocks) ? normalizeSelectedBlocks(payload.selectedBlocks) : current.selectedBlocks;
  const content = typeof payload.content === "string"
    ? payload.content.trim()
    : current.content;

  const result = await query(
    `
      update mini_lesson_plans
      set title = $3,
          theme = $4,
          age = $5,
          intro = $6,
          parts = $7::jsonb,
          selected_blocks = $8::jsonb,
          content = $9,
          updated_at = now()
      where user_id = $1 and id = $2
      returning id, title, theme, age, intro, parts, selected_blocks, content, created_at, updated_at
    `,
    [userId, planId, title.slice(0, 180), theme.slice(0, 240), age, intro, JSON.stringify(parts), JSON.stringify(selectedBlocks), content]
  );

  return result.rows[0] ? normalizePlan(result.rows[0]) : null;
}

export async function deleteMiniLessonPlan(userId, planId) {
  await ensureMiniLessonPlansSchema();
  const result = await query(
    `
      delete from mini_lesson_plans
      where user_id = $1 and id = $2
      returning id
    `,
    [userId, planId]
  );
  return Boolean(result.rowCount);
}
