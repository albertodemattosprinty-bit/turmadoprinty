import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const DAY_MS = 86400000;
const MAX_TARGET_CENTS = 999999999999;

function normalizeDateOnly(value, label) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${label} invalida.`);
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} invalida.`);
  }
  return raw;
}

function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysBetween(startOn, targetOn) {
  return Math.round((dateFromKey(targetOn) - dateFromKey(startOn)) / DAY_MS);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  const desiredDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(desiredDay, lastDay));
  return next;
}

function distributeProgressively(totalCents, periodCount) {
  if (periodCount <= 0) return [];
  const weights = Array.from({ length: periodCount }, (_, index) => 0.7 + (periodCount === 1 ? 0 : (0.6 * index) / (periodCount - 1)));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const values = weights.map((weight) => Math.floor((totalCents * weight) / weightTotal));
  let remainder = totalCents - values.reduce((sum, value) => sum + value, 0);
  for (let index = values.length - 1; index >= 0 && remainder > 0; index -= 1, remainder -= 1) values[index] += 1;
  return values;
}

export function buildProject200FinancialGoalSchedule({ startOn, targetOn, targetAmountCents, gradualModel }) {
  const durationDays = Math.max(1, daysBetween(startOn, targetOn));
  const amount = Math.max(0, Math.trunc(Number(targetAmountCents || 0) || 0));
  const useDays = durationDays < 30;
  const start = dateFromKey(startOn);
  const boundaries = [];
  if (useDays) {
    for (let index = 1; index <= durationDays; index += 1) boundaries.push(dateToKey(addDays(start, index)));
  } else {
    const target = dateFromKey(targetOn);
    for (let index = 1; ; index += 1) {
      const cursor = addMonths(start, index);
      if (cursor >= target) break;
      boundaries.push(dateToKey(cursor));
    }
    boundaries.push(targetOn);
  }
  const values = gradualModel
    ? distributeProgressively(amount, boundaries.length)
    : distributeProgressively(amount, boundaries.length).map(() => Math.floor(amount / boundaries.length));
  if (!gradualModel && values.length) values[values.length - 1] += amount - values.reduce((sum, value) => sum + value, 0);
  return boundaries.map((until, index) => ({
    index: index + 1,
    label: useDays ? `Dia ${index + 1}` : new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(dateFromKey(until)),
    until,
    amountCents: values[index]
  }));
}

export async function ensureProject200FinancialGoalsSchema() {
  await query(`create table if not exists project200_financial_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null default 'Usuario',
    name text not null,
    target_amount_cents bigint not null check (target_amount_cents > 0),
    start_on date not null,
    target_on date not null,
    gradual_model boolean not null default false,
    status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ARCHIVED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (target_on > start_on)
  )`);
  await query("create index if not exists idx_project200_financial_goals_user_profile on project200_financial_goals(user_id, assigned_profile, status, target_on);");
}

function normalizeGoalRow(row) {
  const targetAmountCents = Number(row.target_amount_cents || 0);
  const progressCents = Math.max(0, Number(row.progress_cents || 0));
  const startOn = String(row.start_on || "").slice(0, 10);
  const targetOn = String(row.target_on || "").slice(0, 10);
  const durationDays = Math.max(1, daysBetween(startOn, targetOn));
  return {
    id: String(row.id),
    profileName: String(row.assigned_profile || PROJECT200_DEFAULT_PROFILE_NAME),
    name: String(row.name || "Meta financeira"),
    targetAmountCents,
    progressCents,
    remainingCents: Math.max(0, targetAmountCents - progressCents),
    progressPercent: Math.max(0, Math.min(100, Math.round((progressCents / Math.max(1, targetAmountCents)) * 1000) / 10)),
    startOn,
    targetOn,
    durationDays,
    requiredPerDayCents: Math.ceil(Math.max(0, targetAmountCents - progressCents) / Math.max(1, daysBetween(dateToKey(new Date()), targetOn))),
    gradualModel: Boolean(row.gradual_model),
    status: String(row.status || "ACTIVE"),
    schedule: buildProject200FinancialGoalSchedule({ startOn, targetOn, targetAmountCents, gradualModel: Boolean(row.gradual_model) })
  };
}

export async function listProject200FinancialGoals(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureProject200FinancialGoalsSchema();
  const profile = normalizeStoredProject200ProfileName(profileName);
  const result = await query(`
    select goal.*,
      coalesce(sum(case when occurrence.status='SETTLED' and occurrence.kind='INCOME' and item.deleted_at is null then occurrence.amount_cents else 0 end),0)::bigint as progress_cents
    from project200_financial_goals goal
    left join project200_finance_items item on item.financial_goal_id=goal.id and item.user_id=goal.user_id
    left join project200_finance_occurrences occurrence on occurrence.item_id=item.id and occurrence.user_id=goal.user_id
    where goal.user_id=$1 and goal.assigned_profile=$2 and goal.status<>'ARCHIVED'
    group by goal.id
    order by case goal.status when 'ACTIVE' then 0 else 1 end, goal.target_on asc, goal.created_at desc
  `, [userId, profile]);
  return result.rows.map(normalizeGoalRow);
}

export async function createProject200FinancialGoal(userId, payload = {}) {
  await ensureProject200FinancialGoalsSchema();
  const profile = normalizeStoredProject200ProfileName(payload.profileName || PROJECT200_DEFAULT_PROFILE_NAME);
  const name = String(payload.name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (name.length < 2) throw new Error("Dê um nome para sua meta financeira.");
  const targetAmountCents = Number(payload.targetAmountCents);
  if (!Number.isSafeInteger(targetAmountCents) || targetAmountCents <= 0 || targetAmountCents > MAX_TARGET_CENTS) throw new Error("Informe quanto deseja obter.");
  const startOn = normalizeDateOnly(payload.startOn || dateToKey(new Date()), "Data inicial");
  const targetOn = normalizeDateOnly(payload.targetOn, "Prazo");
  const durationDays = daysBetween(startOn, targetOn);
  if (durationDays < 15) throw new Error("A meta financeira precisa ter pelo menos 15 dias.");
  if (durationDays > 10958) throw new Error("A meta financeira pode durar no máximo 30 anos.");
  const result = await query(`insert into project200_financial_goals (
      user_id,assigned_profile,name,target_amount_cents,start_on,target_on,gradual_model
    ) values ($1,$2,$3,$4,$5::date,$6::date,$7) returning *,0::bigint as progress_cents`,
    [userId, profile, name, targetAmountCents, startOn, targetOn, Boolean(payload.gradualModel)]);
  return normalizeGoalRow(result.rows[0]);
}

export async function assertProject200FinancialGoal(userId, goalId) {
  const normalized = String(goalId || "").trim();
  if (!normalized) return null;
  await ensureProject200FinancialGoalsSchema();
  const result = await query("select id from project200_financial_goals where id=$1 and user_id=$2 and status='ACTIVE' limit 1", [normalized, userId]);
  if (!result.rows[0]) throw new Error("Meta financeira não encontrada.");
  return String(result.rows[0].id);
}
