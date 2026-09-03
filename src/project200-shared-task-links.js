import { query } from "./db.js";
import { ensureActionsSchema } from "./actions.js";
import { ensureExtraGoalsSchema } from "./extra-goals.js";
import { ensureProject200FriendsSchema } from "./project200-friends.js";
import { ensureProject200WellnessSchema } from "./project200-wellness.js";
import { ensureProject200ProfilesSchema, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";

const TIME_ZONE = "America/Sao_Paulo";
const PERIODS = [0, 1, 3, 7, 15, 30, 60, 90, 120];
const DIRECT_COMPARISON_TYPES = new Set(["series_exercise", "walking", "bicycle", "nutrition_quality"]);
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
function safeDays(value) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(120, parsed)) : 0;
}
function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "accepted" || status === "rejected" ? status : "pending";
}
function normalizeType(value) {
  const type = String(value || "").trim();
  return new Set(["scheduled_task", "simple_mission", "compound_mission", "series_exercise", "walking", "bicycle", "weight", "nutrition_quality", "microtask"]).has(type) ? type : "";
}
function labelForType(type) {
  return {
    scheduled_task: "tarefa com horário", simple_mission: "missão simples", compound_mission: "missão composta",
    series_exercise: "exercício de séries", walking: "caminhada", bicycle: "bicicleta", weight: "peso", nutrition_quality: "qualidade da alimentação", microtask: "microtarefa"
  }[type] || "item";
}
async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await Promise.all([ensureProject200FriendsSchema(), ensureActionsSchema(), ensureExtraGoalsSchema(), ensureProject200WellnessSchema(), ensureProject200ProfilesSchema()]);
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
  const result = await query(`select u.id, u.name, u.username, profile.avatar_preset, profile.avatar_data_url, profile.svg_icon_url, profile.svg_icon_label
    from users u
    left join lateral (
      select avatar_preset, avatar_data_url, svg_icon_url, svg_icon_label
      from project200_profiles where user_id = u.id and deleted_at is null
      order by case when lower(trim(coalesce(name, ''))) = lower($2) then 0 else 1 end, sort_order asc, created_at asc limit 1
    ) profile on true where u.id = $1 limit 1`, [userId, PROJECT200_DEFAULT_PROFILE_NAME]);
  const row = result.rows[0] || {};
  return {
    userId: String(row.id || userId), name: String(row.name || row.username || "Usuário"), username: String(row.username || ""),
    avatarPreset: String(row.avatar_preset || ""), avatarDataUrl: String(row.avatar_data_url || ""),
    svgIconUrl: String(row.svg_icon_url || ""), svgIconLabel: String(row.svg_icon_label || "")
  };
}
function typeForExercise(row) {
  const text = `${row.exercise_id || ""} ${row.exercise_name || ""}`.toLocaleLowerCase("pt-BR");
  if (text.includes("bicic") || text.includes("bike")) return "bicycle";
  if (text.includes("camin") || text.includes("esteira") || text.includes("corrida")) return "walking";
  return String(row.tracking_type || "") === "series" ? "series_exercise" : "";
}
async function listItems(userId) {
  await ensureSchema();
  const [actions, goals, variants, library, weight, nutrition] = await Promise.all([
    query("select id, title from actions where user_id = $1 and start_at is not null and coalesce(repeat_rule, 'none') <> 'none' order by start_at asc", [userId]),
    query("select id, title, is_folder from extra_goals where user_id = $1 and coalesce(goal_kind, 'goal') <> 'limit' order by created_at asc", [userId]),
    query("select id, title from extra_goal_variants where user_id = $1 order by created_at asc", [userId]),
    query("select exercise_id, exercise_name, tracking_type from project200_exercise_library where user_id = $1 order by created_at asc", [userId]),
    query("select 1 from project200_weight_entries where user_id = $1 limit 1", [userId]),
    query("select 1 from project200_nutrition_entries where user_id = $1 limit 1", [userId])
  ]);
  const items = [
    ...actions.rows.map((row) => ({ type: "scheduled_task", key: String(row.id), label: String(row.title || "Tarefa com horário") })),
    ...goals.rows.map((row) => ({ type: row.is_folder ? "compound_mission" : "simple_mission", key: String(row.id), label: String(row.title || (row.is_folder ? "Missão composta" : "Missão")) })),
    ...variants.rows.map((row) => ({ type: "microtask", key: String(row.id), label: String(row.title || "Microtarefa") }))
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
  const sourceType = String(link.source_type);
  return {
    link: { id: String(link.id), sourceType, sourceLabel: String(link.source_label), directComparison: DIRECT_COMPARISON_TYPES.has(sourceType) },
    candidates: DIRECT_COMPARISON_TYPES.has(sourceType) ? [] : (await listItems(userId)).filter((item) => item.type === sourceType)
  };
}

async function cloneSharedItem(recipientUserId, link) {
  const sourceUserId = String(link.requester_user_id), sourceType = String(link.source_type), sourceKey = String(link.source_key);
  if (sourceType === "scheduled_task") {
    const result = await query(`insert into actions (
      user_id, title, music_default_mode, music_station_name, music_track_name, music_track_url, assignee, category_id,
      svg_icon_url, svg_icon_label, start_at, end_at, repeat_group_id, repeat_rule, repeat_days, repeat_config
    ) select $1, title, music_default_mode, music_station_name, music_track_name, music_track_url, $2, category_id,
      svg_icon_url, svg_icon_label, start_at, end_at, gen_random_uuid(), repeat_rule, repeat_days, repeat_config
      from actions where user_id=$3 and id=$4::uuid returning id, title`, [recipientUserId, PROJECT200_DEFAULT_PROFILE_NAME, sourceUserId, sourceKey]);
    if (!result.rows[0]) throw new Error("A tarefa original não está mais disponível.");
    return { type: sourceType, key: String(result.rows[0].id), label: String(result.rows[0].title) };
  }
  if (sourceType === "simple_mission" || sourceType === "compound_mission") {
    const result = await query(`insert into extra_goals (
      user_id, assigned_profile, title, category_id, goal_kind, target_value, unit_duration_minutes, unit_duration_seconds,
      limit_interval_value, limit_interval_unit, limit_cycle_started_at, count_sleep_time, is_folder, repeat_days, schedule_config,
      svg_icon_url, svg_icon_label, progress_value, progress_date, last_progress_at, created_at, updated_at
    ) select $1, $2, title, category_id, goal_kind, target_value, unit_duration_minutes, unit_duration_seconds,
      limit_interval_value, limit_interval_unit, now(), count_sleep_time, is_folder, repeat_days, schedule_config,
      svg_icon_url, svg_icon_label, 0, null, null, now(), now()
      from extra_goals where user_id=$3 and id=$4::uuid returning id, title`, [recipientUserId, PROJECT200_DEFAULT_PROFILE_NAME, sourceUserId, sourceKey]);
    if (!result.rows[0]) throw new Error("A missão original não está mais disponível.");
    const clonedGoalId = String(result.rows[0].id);
    if (sourceType === "compound_mission") {
      await query(`insert into extra_goal_variants (
        user_id, goal_id, assigned_profile, title, interval_value, target_value, interval_unit, repeat_days,
        unit_duration_seconds, next_due_at, schedule_mode, avoid_days, schedule_config, last_completed_at, created_at, updated_at
      ) select $1, $2::uuid, $3, title, interval_value, target_value, interval_unit, repeat_days,
        unit_duration_seconds, null, schedule_mode, avoid_days, schedule_config, null, now(), now()
        from extra_goal_variants where user_id=$4 and goal_id=$5::uuid order by created_at asc`,
      [recipientUserId, clonedGoalId, PROJECT200_DEFAULT_PROFILE_NAME, sourceUserId, sourceKey]);
    }
    return { type: sourceType, key: clonedGoalId, label: String(result.rows[0].title) };
  }
  if (sourceType === "microtask") {
    const parent = await query(`insert into extra_goals (
      user_id, assigned_profile, title, category_id, goal_kind, target_value, unit_duration_minutes, unit_duration_seconds,
      limit_interval_value, limit_interval_unit, limit_cycle_started_at, count_sleep_time, is_folder, repeat_days, schedule_config,
      svg_icon_url, svg_icon_label, progress_value, progress_date, last_progress_at, created_at, updated_at
    ) select $1, $2, goal.title, goal.category_id, goal.goal_kind, goal.target_value, 0, 0,
      goal.limit_interval_value, goal.limit_interval_unit, now(), goal.count_sleep_time, true, goal.repeat_days, goal.schedule_config,
      goal.svg_icon_url, goal.svg_icon_label, 0, null, null, now(), now()
      from extra_goal_variants variant join extra_goals goal on goal.id=variant.goal_id
      where variant.user_id=$3 and variant.id=$4::uuid returning id`, [recipientUserId, PROJECT200_DEFAULT_PROFILE_NAME, sourceUserId, sourceKey]);
    if (!parent.rows[0]) throw new Error("A microtarefa original não está mais disponível.");
    const variant = await query(`insert into extra_goal_variants (
      user_id, goal_id, assigned_profile, title, interval_value, target_value, interval_unit, repeat_days,
      unit_duration_seconds, next_due_at, schedule_mode, avoid_days, schedule_config, last_completed_at, created_at, updated_at
    ) select $1, $2::uuid, $3, title, interval_value, target_value, interval_unit, repeat_days,
      unit_duration_seconds, null, schedule_mode, avoid_days, schedule_config, null, now(), now()
      from extra_goal_variants where user_id=$4 and id=$5::uuid returning id, title`,
    [recipientUserId, parent.rows[0].id, PROJECT200_DEFAULT_PROFILE_NAME, sourceUserId, sourceKey]);
    return { type: sourceType, key: String(variant.rows[0].id), label: String(variant.rows[0].title) };
  }
  if (sourceType === "series_exercise") {
    const clonedExerciseId = `shared-${crypto.randomUUID()}`;
    const result = await query(`insert into project200_exercise_library (
      user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
      daily_goal, target_series, target_reps, target_minutes, target_distance_meters, created_at, updated_at
    ) select $1, $2, $3, exercise_name, category, tracking_type, equipment,
      daily_goal, target_series, target_reps, target_minutes, target_distance_meters, now(), now()
      from project200_exercise_library where user_id=$4 and exercise_id=$5 returning exercise_id, exercise_name`,
    [recipientUserId, PROJECT200_DEFAULT_PROFILE_NAME, clonedExerciseId, sourceUserId, sourceKey]);
    if (!result.rows[0]) throw new Error("O exercício original não está mais disponível.");
    return { type: sourceType, key: String(result.rows[0].exercise_id), label: String(result.rows[0].exercise_name) };
  }
  if (sourceType === "walking" || sourceType === "bicycle") {
    const existing = (await listItems(recipientUserId)).find((item) => item.type === sourceType);
    if (existing) return existing;
    const clonedExerciseId = `shared-${crypto.randomUUID()}`;
    const result = await query(`insert into project200_exercise_library (
      user_id, assigned_profile, exercise_id, exercise_name, category, tracking_type, equipment,
      daily_goal, target_series, target_reps, target_minutes, target_distance_meters, created_at, updated_at
    ) select $1, $2, $3, exercise_name, category, tracking_type, equipment,
      daily_goal, target_series, target_reps, target_minutes, target_distance_meters, now(), now()
      from project200_exercise_library where user_id=$4 and (
        ($5='walking' and (lower(exercise_id || ' ' || exercise_name) like '%camin%' or lower(exercise_id || ' ' || exercise_name) like '%esteira%' or lower(exercise_id || ' ' || exercise_name) like '%corrida%'))
        or ($5='bicycle' and (lower(exercise_id || ' ' || exercise_name) like '%bicic%' or lower(exercise_id || ' ' || exercise_name) like '%bike%'))
      ) order by created_at asc limit 1 returning exercise_id, exercise_name`,
    [recipientUserId, PROJECT200_DEFAULT_PROFILE_NAME, clonedExerciseId, sourceUserId, sourceType]);
    if (!result.rows[0]) throw new Error("A atividade original não está mais disponível.");
    return { type: sourceType, key: sourceType, label: String(result.rows[0].exercise_name) };
  }
  if (DIRECT_COMPARISON_TYPES.has(sourceType)) return { type: sourceType, key: sourceKey, label: String(link.source_label) };
  throw new Error("Este tipo de ação ainda não pode ser clonado.");
}
export async function respondProject200SharedTaskLink(userId, linkId, action, payload = {}) {
  await ensureSchema();
  const link = await findLinkForRecipient(userId, linkId);
  if (normalizeStatus(link.status) !== "pending") throw new Error("Essa solicitação já foi respondida.");
  const normalizedAction = String(action || "").toLowerCase();
  if (normalizedAction === "reject") {
    await query("update project200_shared_task_links set status='rejected', responded_at=now(), updated_at=now() where id=$1", [link.id]);
    return { id: link.id, status: "rejected" };
  }
  if (normalizedAction === "clone") {
    const cloned = await cloneSharedItem(String(userId || ""), link);
    await query("update project200_shared_task_links set target_type=$2, target_key=$3, target_label=$4, status='accepted', responded_at=now(), updated_at=now() where id=$1", [link.id, cloned.type, cloned.key, cloned.label]);
    return { id: link.id, status: "accepted", cloned: true, item: cloned };
  }
  if (DIRECT_COMPARISON_TYPES.has(String(link.source_type))) {
    const direct = { type: String(link.source_type), key: String(link.source_key), label: String(link.source_label) };
    await query("update project200_shared_task_links set target_type=$2, target_key=$3, target_label=$4, status='accepted', responded_at=now(), updated_at=now() where id=$1", [link.id, direct.type, direct.key, direct.label]);
    return { id: link.id, status: "accepted", direct: true };
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
  if (item.type === "microtask") {
    const result = await query("select count(*)::integer as total from extra_goal_variants where user_id=$1 and id=$2::uuid and last_completed_at::date between $3::date and $4::date", [userId, item.key, startDate, endDate]);
    return { value: Number(result.rows[0]?.total || 0), unit: "conclusões" };
  }
  if (item.type === "series_exercise") {
    const result = await query("select coalesce(sum(session.total_reps),0)::integer as movements, coalesce(sum((select count(*) from project200_exercise_series item where item.session_id=session.id)),0)::integer as series from project200_exercise_sessions session where session.user_id=$1 and session.exercise_id=$2 and session.status='completed' and coalesce(session.completed_at,session.started_at)::date between $3::date and $4::date", [userId, item.key, startDate, endDate]);
    return { value: Number(result.rows[0]?.movements || 0), extra: Number(result.rows[0]?.series || 0), unit: "movimentos", extraUnit: "séries" };
  }
  if (item.type === "walking" || item.type === "bicycle") {
    const result = await query(`select coalesce(sum(distance_meters),0)::numeric/1000 as kilometers, coalesce(sum(duration_minutes),0)::numeric as minutes
      from project200_exercise_sessions where user_id=$1 and status='completed' and (
        ($2='walking' and (lower(exercise_id || ' ' || exercise_name) like '%camin%' or lower(exercise_id || ' ' || exercise_name) like '%esteira%' or lower(exercise_id || ' ' || exercise_name) like '%corrida%'))
        or ($2='bicycle' and (lower(exercise_id || ' ' || exercise_name) like '%bicic%' or lower(exercise_id || ' ' || exercise_name) like '%bike%'))
      ) and coalesce(completed_at,started_at)::date between $3::date and $4::date`, [userId, item.type, startDate, endDate]);
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
export async function getProject200SharedTaskLinks(userId, friendId, days = 0) {
  await ensureSchema();
  const selfId = String(userId || "").trim(), otherId = String(friendId || "").trim();
  await assertFriendship(selfId, otherId);
  const rangeDays = safeDays(days), endDate = dateKey(), startDate = rangeDays === 0 ? "2000-01-01" : addDays(endDate, -(rangeDays - 1));
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
