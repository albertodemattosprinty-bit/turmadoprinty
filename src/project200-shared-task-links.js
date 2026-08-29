import { query } from "./db.js";
import { ensureActionsSchema } from "./actions.js";
import { ensureExtraGoalsSchema } from "./extra-goals.js";
import { ensureProject200FriendsSchema } from "./project200-friends.js";
import { ensureProject200WellnessSchema } from "./project200-wellness.js";

const TIME_ZONE = "America/Sao_Paulo";
const PERIODS = [1, 3, 7, 15, 30, 60, 90, 120];
let schemaPromise = null;

function dateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value instanceof Date ? value : new Date(value));
  return `${parts.find((part) => part.type === "year")?.value || "0000"}-${parts.find((part) => part.type === "month")?.value || "01"}-${parts.find((part) => part.type === "day")?.value || "01"}`;
}
function addDays(value, delta) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + Number(delta || 0));
  return dateKey(date);
}
function safeDays(value) { return Math.max(1, Math.min(120, Math.trunc(Number(value || 1) || 1))); }
function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "accepted" || status === "rejected" ? status : "pending";
}
function normalizeType(value) {
  const type = String(value || "").trim();
  return new Set(["scheduled_task", "simple_mission", "compound_mission", "series_exercise", "walking", "bicycle", "weight", "nutrition_quality"]).has(type) ? type : "";
}
function labelForType(type) {
  return {
    scheduled_task: "tarefa com horário", simple_mission: "missão simples", compound_mission: "missão composta",
    series_exercise: "exercício de séries", walking: "caminhada", bicycle: "bicicleta", weight: "peso", nutrition_quality: "qualidade da alimentação"
  }[type] || "item";
}
async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await Promise.all([ensureProject200FriendsSchema(), ensureActionsSchema(), ensureExtraGoalsSchema(), ensureProject200WellnessSchema()]);
      await query(`create table if not exists project200_shared_task_links (
        id uuid primary key default gen_random_uuid(),
        requester_user_id uuid not null references users(id) on delete cascade,
        recipient_user_id uuid not null references users(id) on delete cascade,
        source_type text not null, source_key text not null, source_label text not null,
        target_type text, target_key text, target_label text,
        status text not null default 'pending' check (status in ('pending','accepted','rejected')),
        responded_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        check (requester_user_id <> recipient_user_id)
      )`);
      await query("create unique index if not exists idx_project200_shared_task_links_unique on project200_shared_task_links(requester_user_id, recipient_user_id, source_type, source_key);");
      await query("create index if not exists idx_project200_shared_task_links_recipient on project200_shared_task_links(recipient_user_id, status, updated_at desc);");
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}
async function assertFriendship(userId, friendId) {
  const result = await query(`select 1 from project200_friendships where status = 'accepted' and ((requester_user_id = $1 and addressee_user_id = $2) or (requester_user_id = $2 and addressee_user_id = $1)) limit 1`, [userId, friendId]);
  if (!result.rows[0]) throw new Error("Escolha um amigo com amizade aceita.");
}
export async function assertProject200SharedTaskFriendship(userId, friendId) {
  await ensureSchema();
  await assertFriendship(String(userId || "").trim(), String(friendId || "").trim());
}
async function userName(userId) {
  const result = await query("select id, name, username from users where id = $1 limit 1", [userId]);
  const row = result.rows[0] || {};
  return { userId: String(row.id || userId), name: String(row.name || row.username || "Usuário") };
}
function typeForExercise(row) {
  const text = `${row.exercise_id || ""} ${row.exercise_name || ""}`.toLocaleLowerCase("pt-BR");
  if (text.includes("bicic") || text.includes("bike")) return "bicycle";
  if (text.includes("camin") || text.includes("esteira") || text.includes("corrida")) return "walking";
  return String(row.tracking_type || "") === "series" ? "series_exercise" : "";
}
async function listItems(userId) {
  await ensureSchema();
  const [actions, goals, library, weight, nutrition] = await Promise.all([
    query("select id, title from actions where user_id = $1 and start_at is not null order by start_at asc", [userId]),
    query("select id, title, is_folder from extra_goals where user_id = $1 and coalesce(goal_kind, 'goal') <> 'limit' order by created_at asc", [userId]),
    query("select exercise_id, exercise_name, tracking_type from project200_exercise_library where user_id = $1 order by created_at asc", [userId]),
    query("select 1 from project200_weight_entries where user_id = $1 limit 1", [userId]),
    query("select 1 from project200_nutrition_entries where user_id = $1 limit 1", [userId])
  ]);
  const items = [
    ...actions.rows.map((row) => ({ type: "scheduled_task", key: String(row.id), label: String(row.title || "Tarefa com horário") })),
    ...goals.rows.map((row) => ({ type: row.is_folder ? "compound_mission" : "simple_mission", key: String(row.id), label: String(row.title || (row.is_folder ? "Missão composta" : "Missão")) }))
  ];
  const seenSpecial = new Set();
  for (const row of library.rows) {
    const type = typeForExercise(row);
    if (!type) continue;
    if ((type === "walking" || type === "bicycle") && seenSpecial.has(type)) continue;
    seenSpecial.add(type);
    items.push({ type, key: type === "series_exercise" ? String(row.exercise_id) : type, label: type === "series_exercise" ? String(row.exercise_name || "Exercício de séries") : labelForType(type) });
  }
  if (weight.rows[0]) items.push({ type: "weight", key: "weight", label: "Peso" });
  if (nutrition.rows[0]) items.push({ type: "nutrition_quality", key: "nutrition-quality", label: "Qualidade da alimentação" });
  return items;
}
async function getItem(userId, type, key) {
  const items = await listItems(userId);
  return items.find((item) => item.type === normalizeType(type) && item.key === String(key || "")) || null;
}
function sourceParams(item) { return [item.type, item.key, item.label]; }
export async function listProject200SharedTaskItems(userId) { return listItems(String(userId || "").trim()); }
export async function createProject200SharedTaskLink(userId, friendId, payload = {}) {
  await ensureSchema();
  const requester = String(userId || "").trim(), recipient = String(friendId || "").trim();
  if (!requester || !recipient || requester === recipient) throw new Error("Amigo inválido.");
  await assertFriendship(requester, recipient);
  const item = await getItem(requester, payload.type, payload.key);
  if (!item) throw new Error("Escolha um item disponível para compartilhar.");
  const existing = await query("select id, status from project200_shared_task_links where requester_user_id = $1 and recipient_user_id = $2 and source_type = $3 and source_key = $4 limit 1", [requester, recipient, item.type, item.key]);
  if (existing.rows[0] && normalizeStatus(existing.rows[0].status) !== "rejected") return { id: existing.rows[0].id, status: normalizeStatus(existing.rows[0].status), alreadyExists: true };
  if (existing.rows[0]) {
    const updated = await query("update project200_shared_task_links set source_label = $2, target_type = null, target_key = null, target_label = null, status = 'pending', responded_at = null, updated_at = now() where id = $1 returning id, status", [existing.rows[0].id, item.label]);
    return { id: updated.rows[0].id, status: "pending" };
  }
  const created = await query("insert into project200_shared_task_links (requester_user_id, recipient_user_id, source_type, source_key, source_label) values ($1,$2,$3,$4,$5) returning id, status", [requester, recipient, ...sourceParams(item)]);
  return { id: created.rows[0].id, status: "pending" };
}
async function findLinkForRecipient(userId, linkId) {
  const result = await query("select * from project200_shared_task_links where id = $1 and recipient_user_id = $2 limit 1", [String(linkId || ""), String(userId || "")]);
  if (!result.rows[0]) throw new Error("Solicitação não encontrada.");
  return result.rows[0];
}
export async function getProject200SharedTaskCandidates(userId, linkId) {
  await ensureSchema();
  const link = await findLinkForRecipient(userId, linkId);
  if (normalizeStatus(link.status) !== "pending") throw new Error("Essa solicitação já foi respondida.");
  return { link: { id: String(link.id), sourceType: String(link.source_type), sourceLabel: String(link.source_label) }, candidates: (await listItems(userId)).filter((item) => item.type === String(link.source_type)) };
}
export async function respondProject200SharedTaskLink(userId, linkId, action, payload = {}) {
  await ensureSchema();
  const link = await findLinkForRecipient(userId, linkId);
  if (normalizeStatus(link.status) !== "pending") throw new Error("Essa solicitação já foi respondida.");
  if (String(action || "").toLowerCase() === "reject") {
    await query("update project200_shared_task_links set status='rejected', responded_at=now(), updated_at=now() where id=$1", [link.id]);
    return { id: link.id, status: "rejected" };
  }
  const candidate = await getItem(userId, link.source_type, payload.targetKey);
  if (!candidate || candidate.type !== String(link.source_type)) throw new Error("Escolha um item do mesmo tipo para comparar.");
  await query("update project200_shared_task_links set target_type=$2, target_key=$3, target_label=$4, status='accepted', responded_at=now(), updated_at=now() where id=$1", [link.id, candidate.type, candidate.key, candidate.label]);
  return { id: link.id, status: "accepted" };
}
async function metricForItem(userId, item, startDate, endDate) {
  if (!item) return { value: 0, unit: "" };
  if (item.type === "scheduled_task") {
    const result = await query("select count(*)::integer as total from action_status_overrides where user_id=$1 and action_id=$2::uuid and upper(status)='COMPLETED' and completed_at::date between $3::date and $4::date", [userId, item.key, startDate, endDate]);
    return { value: Number(result.rows[0]?.total || 0), unit: "conclusões" };
  }
  if (item.type === "simple_mission" || item.type === "compound_mission") {
    const result = await query("select coalesce(sum(progress_value),0)::integer as total from extra_goal_progress_history where user_id=$1 and goal_id=$2::uuid and scope_date between $3::date and $4::date", [userId, item.key, startDate, endDate]);
    return { value: Number(result.rows[0]?.total || 0), unit: item.type === "compound_mission" ? "progresso do pack" : "progresso" };
  }
  if (item.type === "series_exercise") {
    const result = await query("select coalesce(sum(session.total_reps),0)::integer as movements, coalesce(sum((select count(*) from project200_exercise_series item where item.session_id=session.id)),0)::integer as series from project200_exercise_sessions session where session.user_id=$1 and session.exercise_id=$2 and session.status='completed' and coalesce(session.completed_at,session.started_at)::date between $3::date and $4::date", [userId, item.key, startDate, endDate]);
    return { value: Number(result.rows[0]?.movements || 0), extra: Number(result.rows[0]?.series || 0), unit: "movimentos", extraUnit: "séries" };
  }
  if (item.type === "walking" || item.type === "bicycle") {
    const term = item.type === "walking" ? "%camin%" : "%bicic%";
    const result = await query("select coalesce(sum(distance_meters),0)::numeric/1000 as kilometers, coalesce(sum(duration_minutes),0)::numeric as minutes from project200_exercise_sessions where user_id=$1 and status='completed' and lower(exercise_name) like $2 and coalesce(completed_at,started_at)::date between $3::date and $4::date", [userId, term, startDate, endDate]);
    const kilometers = Number(result.rows[0]?.kilometers || 0), minutes = Number(result.rows[0]?.minutes || 0);
    return { value: kilometers, unit: "km", extra: minutes, extraUnit: "min", speed: minutes > 0 ? kilometers / (minutes / 60) : 0 };
  }
  if (item.type === "weight") {
    const result = await query("select weight_kg from project200_weight_entries where user_id=$1 and (measured_at at time zone $3)::date <= $2::date order by measured_at desc limit 1", [userId, endDate, TIME_ZONE]);
    return { value: Number(result.rows[0]?.weight_kg || 0), unit: "kg" };
  }
  if (item.type === "nutrition_quality") {
    const result = await query("select case when coalesce(sum(calories),0)>0 then round(sum(calories*quality_score)/sum(calories)) else 0 end::integer as quality from project200_nutrition_entries where user_id=$1 and (consumed_at at time zone $4)::date between $2::date and $3::date", [userId, startDate, endDate, TIME_ZONE]);
    return { value: Number(result.rows[0]?.quality || 0), unit: "%" };
  }
  return { value: 0, unit: "" };
}
export async function getProject200SharedTaskLinks(userId, friendId, days = 1) {
  await ensureSchema();
  const selfId = String(userId || "").trim(), otherId = String(friendId || "").trim();
  await assertFriendship(selfId, otherId);
  const rangeDays = safeDays(days), endDate = dateKey(), startDate = addDays(endDate, -(rangeDays - 1));
  const rows = await query("select * from project200_shared_task_links where ((requester_user_id=$1 and recipient_user_id=$2) or (requester_user_id=$2 and recipient_user_id=$1)) and status in ('pending','accepted') order by updated_at desc", [selfId, otherId]);
  const active = [], pending = [];
  for (const row of rows.rows) {
    const requesterIsSelf = String(row.requester_user_id) === selfId;
    const source = { type: String(row.source_type), key: String(row.source_key), label: String(row.source_label) };
    if (normalizeStatus(row.status) === "pending") {
      pending.push({ id: String(row.id), incoming: !requesterIsSelf, requesterName: requesterIsSelf ? "" : (await userName(row.requester_user_id)).name, source });
      continue;
    }
    const target = { type: String(row.target_type), key: String(row.target_key), label: String(row.target_label) };
    const selfItem = requesterIsSelf ? source : target, friendItem = requesterIsSelf ? target : source;
    const [selfMetric, friendMetric] = await Promise.all([metricForItem(selfId, selfItem, startDate, endDate), metricForItem(otherId, friendItem, startDate, endDate)]);
    active.push({ id: String(row.id), type: source.type, selfItem, friendItem, selfMetric, friendMetric });
  }
  return { self: await userName(selfId), friend: await userName(otherId), days: rangeDays, periods: PERIODS, active, pending };
}
