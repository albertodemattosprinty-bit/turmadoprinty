import { query } from "./db.js";

const PERSONA_KEYS = new Set(["marin", "peter", "lena", "gaia", "sami", "zach"]);
let schemaPromise = null;

function normalizePersona(value) {
  const key = String(value || "").trim().toLowerCase();
  return PERSONA_KEYS.has(key) ? key : "";
}

function normalizeRow(row) {
  if (!row) {
    return {
      required: false,
      status: "NOT_REQUIRED",
      currentStep: 0,
      educationPage: 0,
      selectedPersona: "",
      avatarCompleted: false,
      completedAt: null
    };
  }
  const completed = String(row.status || "").toUpperCase() === "COMPLETED";
  return {
    required: !completed,
    status: completed ? "COMPLETED" : "PENDING",
    currentStep: Math.max(1, Math.min(4, Math.trunc(Number(row.current_step) || 1))),
    educationPage: Math.max(0, Math.min(4, Math.trunc(Number(row.education_page) || 0))),
    selectedPersona: normalizePersona(row.selected_persona),
    avatarCompleted: Boolean(row.avatar_completed),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
  };
}

export async function ensureProject200OnboardingSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query("alter table users add column if not exists project200_onboarding_required boolean not null default false;");
      await query(`
        create table if not exists project200_user_onboarding (
          user_id uuid primary key references users(id) on delete cascade,
          status text not null default 'PENDING',
          current_step integer not null default 1,
          education_page integer not null default 0,
          selected_persona text,
          avatar_completed boolean not null default false,
          started_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          completed_at timestamptz
        );
      `);
      await query("create index if not exists idx_project200_user_onboarding_status on project200_user_onboarding(status);");
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function initializeProject200Onboarding(userId) {
  await ensureProject200OnboardingSchema();
  await query(
    `with created as (
       insert into project200_user_onboarding (user_id)
       values ($1)
       on conflict (user_id) do nothing
       returning user_id
     )
     update users
        set project200_onboarding_required = true
      where id = $1
        and exists (
          select 1
            from project200_user_onboarding onboarding
           where onboarding.user_id = $1
             and onboarding.status <> 'COMPLETED'
        )`,
    [userId]
  );
  return getProject200Onboarding(userId);
}

export async function restartProject200Onboarding(userId) {
  await ensureProject200OnboardingSchema();
  await query(
    `with restarted as (
       insert into project200_user_onboarding (user_id, status, current_step, education_page)
       values ($1, 'PENDING', 1, 0)
       on conflict (user_id) do update
         set status = 'PENDING',
             current_step = 1,
             education_page = 0,
             selected_persona = null,
             avatar_completed = false,
             completed_at = null,
             updated_at = now()
       returning user_id
     )
     update users
        set project200_onboarding_required = true
      where id = $1 and exists (select 1 from restarted)`,
    [userId]
  );
  return getProject200Onboarding(userId);
}

export async function getProject200Onboarding(userId) {
  await ensureProject200OnboardingSchema();
  const result = await query(
    `select status, current_step, education_page, selected_persona,
            avatar_completed, completed_at
       from project200_user_onboarding
      where user_id = $1
      limit 1`,
    [userId]
  );
  return normalizeRow(result.rows[0]);
}

export async function saveProject200OnboardingProgress(userId, payload = {}) {
  await ensureProject200OnboardingSchema();
  const currentStep = Math.max(1, Math.min(4, Math.trunc(Number(payload.currentStep) || 1)));
  const educationPage = Math.max(0, Math.min(4, Math.trunc(Number(payload.educationPage) || 0)));
  const personaProvided = Object.prototype.hasOwnProperty.call(payload, "selectedPersona");
  const selectedPersona = personaProvided ? normalizePersona(payload.selectedPersona) : "";
  if (personaProvided && !selectedPersona) {
    throw new Error("Escolha um agente valido.");
  }
  const avatarCompleted = payload.avatarCompleted === true;
  const result = await query(
    `update project200_user_onboarding
        set current_step = greatest(current_step, $2),
            education_page = greatest(education_page, $3),
            selected_persona = case when $4::boolean then $5 else selected_persona end,
            avatar_completed = avatar_completed or $6,
            updated_at = now()
      where user_id = $1 and status = 'PENDING'
      returning status, current_step, education_page, selected_persona,
                avatar_completed, completed_at`,
    [userId, currentStep, educationPage, personaProvided, selectedPersona || null, avatarCompleted]
  );
  if (!result.rows[0]) {
    const existing = await getProject200Onboarding(userId);
    if (existing.status === "NOT_REQUIRED") throw new Error("Onboarding nao iniciado para esta conta.");
    return existing;
  }
  return normalizeRow(result.rows[0]);
}

export async function markProject200OnboardingAvatarComplete(userId) {
  await ensureProject200OnboardingSchema();
  await query(
    `update project200_user_onboarding
        set avatar_completed = true, updated_at = now()
      where user_id = $1 and status = 'PENDING'`,
    [userId]
  );
}

export async function completeProject200Onboarding(userId) {
  await ensureProject200OnboardingSchema();
  const result = await query(
    `with finished as (
       update project200_user_onboarding
          set status = 'COMPLETED',
              current_step = 4,
              completed_at = coalesce(completed_at, now()),
              updated_at = now()
        where user_id = $1
          and status = 'PENDING'
          and current_step >= 4
          and selected_persona is not null
       returning user_id
     )
     update users
        set project200_onboarding_required = false
      where id = $1 and exists (select 1 from finished)
      returning id`,
    [userId]
  );
  if (!result.rows[0]) {
    const current = await getProject200Onboarding(userId);
    if (current.status === "COMPLETED") return current;
    throw new Error("Conclua as etapas e escolha um agente antes de continuar.");
  }
  return getProject200Onboarding(userId);
}
