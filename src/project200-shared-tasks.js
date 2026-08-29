import { query } from "./db.js";
import { ensureActionsSchema } from "./actions.js";
import { ensureExtraGoalsSchema } from "./extra-goals.js";
import { ensureProject200FriendsSchema } from "./project200-friends.js";
import { ensureProject200WellnessSchema } from "./project200-wellness.js";

const TIME_ZONE = "America/Sao_Paulo";
const AVAILABLE_PERIODS = [1, 3, 7, 15, 30, 60, 90, 120];
let schemaPromise = null;

function dateKey(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = formatter.formatToParts(value instanceof Date ? value : new Date(value));
  return `${parts.find((part) => part.type === "year")?.value || "0000"}-${parts.find((part) => part.type === "month")?.value || "01"}-${parts.find((part) => part.type === "day")?.value || "01"}`;
}

function addDays(value, delta) {
  const [year, month, day] = String(value).split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day, 12));
  result.setUTCDate(result.getUTCDate() + Number(delta || 0));
  return dateKey(result);
}

function safeDays(value) {
  const days = Math.trunc(Number(value || 1) || 1);
  return Math.max(1, Math.min(120, days));
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "accepted" || normalized === "rejected" ? normalized : "pending";
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await Promise.all([ensureProject200FriendsSchema(), ensureExtraGoalsSchema(), ensureActionsSchema(), ensureProject200WellnessSchema()]);
      await query(`
        create table if not exists project200_shared_task_access (
          id uuid primary key default gen_random_uuid(),
          requester_user_id uuid not null references users(id) on delete cascade,
          recipient_user_id uuid not null references users(id) on delete cascade,
          status text not null default 'pending' check (status in ('pending','accepted','rejected')),
          responded_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          check (requester_user_id <> recipient_user_id)
        );
      `);
      await query("create unique index if not exists idx_project200_shared_task_pair on project200_shared_task_access(requester_user_id, recipient_user_id);");
      await query("create index if not exists idx_project200_shared_task_recipient on project200_shared_task_access(recipient_user_id, status, updated_at desc);");
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function assertFriendship(userId, friendId) {
  const result = await query(`select 1 from project200_friendships where status = 'accepted' and ((requester_user_id = $1 and addressee_user_id = $2) or (requester_user_id = $2 and addressee_user_id = $1)) limit 1`, [userId, friendId]);
  if (!result.rows[0]) throw new Error("Escolha um amigo com amizade aceita.");
}

export async function createProject200SharedTaskInvite(userId, friendId) {
  await ensureSchema();
  const requester = String(userId || "").trim();
  const recipient = String(friendId || "").trim();
  if (!requester || !recipient || requester === recipient) throw new Error("Amigo invalido.");
  await assertFriendship(requester, recipient);
  const existing = await query(`select * from project200_shared_task_access where (requester_user_id = $1 and recipient_user_id = $2) or (requester_user_id = $2 and recipient_user_id = $1) order by created_at desc limit 1`, [requester, recipient]);
  const row = existing.rows[0];
  if (row && normalizeStatus(row.status) === "accepted") return { id: row.id, status: "accepted", alreadyActive: true };
  if (row && normalizeStatus(row.status) === "pending") return { id: row.id, status: "pending", alreadyPending: true };
  if (row) {
    const updated = await query(`update project200_shared_task_access set requester_user_id = $1, recipient_user_id = $2, status = 'pending', responded_at = null, updated_at = now() where id = $3 returning id, status`, [requester, recipient, row.id]);
    return { id: updated.rows[0]?.id, status: "pending", created: true };
  }
  const created = await query(`insert into project200_shared_task_access (requester_user_id, recipient_user_id) values ($1, $2) returning id, status`, [requester, recipient]);
  return { id: created.rows[0]?.id, status: "pending", created: true };
}

export async function respondProject200SharedTaskInvite(userId, accessId, action) {
  await ensureSchema();
  const status = String(action || "").toLowerCase() === "accept" ? "accepted" : String(action || "").toLowerCase() === "reject" ? "rejected" : "";
  if (!status) throw new Error("Resposta invalida.");
  const result = await query(`update project200_shared_task_access set status = $3, responded_at = now(), updated_at = now() where id = $1 and recipient_user_id = $2 and status = 'pending' returning id, status`, [String(accessId || "").trim(), String(userId || "").trim(), status]);
  if (!result.rows[0]) throw new Error("Solicitacao nao encontrada.");
  return { id: result.rows[0].id, status: normalizeStatus(result.rows[0].status) };
}

async function getAccess(userId, friendId) {
  const result = await query(`select id, requester_user_id, recipient_user_id, status from project200_shared_task_access where (requester_user_id = $1 and recipient_user_id = $2) or (requester_user_id = $2 and recipient_user_id = $1) order by updated_at desc limit 1`, [userId, friendId]);
  const row = result.rows[0];
  return row ? { id: String(row.id), status: normalizeStatus(row.status), isRequester: String(row.requester_user_id) === String(userId) } : null;
}

async function getPersonCard(userId) {
  const result = await query(`select id, name, username from users where id = $1 limit 1`, [userId]);
  const row = result.rows[0] || {};
  return { userId: String(row.id || userId), name: String(row.name || row.username || "Usuario"), username: String(row.username || "") };
}

async function getActivities(userId, startDate, endDate) {
  const [actionsResult, goalsResult, libraryResult, sessionsResult, daysResult] = await Promise.all([
    query(`select a.id, a.title, a.category_id, coalesce(o.completed_at, a.end_at) as completed_at from actions a join action_status_overrides o on o.action_id = a.id and o.user_id = a.user_id where a.user_id = $1 and upper(coalesce(o.status, '')) = 'COMPLETED' and coalesce(o.completed_at, a.end_at)::date between $2::date and $3::date order by completed_at desc`, [userId, startDate, endDate]),
    query(`select g.id, g.title, g.category_id, g.is_folder, h.scope_date, h.progress_value, h.target_value from extra_goal_progress_history h join extra_goals g on g.id = h.goal_id and g.user_id = h.user_id where h.user_id = $1 and h.scope_date between $2::date and $3::date and h.progress_value >= greatest(1, h.target_value) order by h.scope_date desc`, [userId, startDate, endDate]),
    query(`select exercise_id, exercise_name, category, tracking_type, equipment from project200_exercise_library where user_id = $1 order by created_at asc`, [userId]),
    query(`select session.exercise_id, session.exercise_name, session.category, session.tracking_type, session.duration_minutes, session.distance_meters, session.total_reps, session.started_at, session.completed_at, coalesce((select count(*) from project200_exercise_series item where item.session_id = session.id), 0)::integer as series_count from project200_exercise_sessions session where session.user_id = $1 and session.status = 'completed' and coalesce(session.completed_at, session.started_at)::date between $2::date and $3::date`, [userId, startDate, endDate]),
    query(`select distinct day_key from (select coalesce(o.completed_at, a.end_at)::date as day_key from actions a join action_status_overrides o on o.action_id = a.id and o.user_id = a.user_id where a.user_id = $1 and upper(coalesce(o.status, '')) = 'COMPLETED' union select h.scope_date from extra_goal_progress_history h where h.user_id = $1 and h.progress_value >= greatest(1, h.target_value) union select coalesce(completed_at, started_at)::date from project200_exercise_sessions where user_id = $1 and status = 'completed') days where day_key <= current_date`, [userId])
  ]);
  const actions = actionsResult.rows.map((row) => ({ id: String(row.id), title: String(row.title || "Ação"), categoryId: String(row.category_id || ""), completedAt: row.completed_at }));
  const tasks = goalsResult.rows.map((row) => ({ id: String(row.id), title: String(row.title || "Tarefa"), categoryId: String(row.category_id || ""), isFolder: Boolean(row.is_folder), completedAt: row.scope_date }));
  const selectedExercises = libraryResult.rows.map((row) => ({ exerciseId: String(row.exercise_id), name: String(row.exercise_name || "Exercício"), category: String(row.category || "strength"), trackingType: String(row.tracking_type || "minutes"), equipment: String(row.equipment || "") }));
  const metrics = { movements: 0, series: 0, minutes: 0, kilometers: 0, walking: { minutes: 0, kilometers: 0, averageKmh: 0 }, bicycle: { minutes: 0, kilometers: 0, averageKmh: 0 }, strength: { movements: 0, series: 0 } };
  for (const row of sessionsResult.rows) {
    const name = String(row.exercise_name || "").toLocaleLowerCase("pt-BR");
    const minutes = Math.max(0, Number(row.duration_minutes || 0));
    const kilometers = Math.max(0, Number(row.distance_meters || 0) / 1000);
    const movements = Math.max(0, Number(row.total_reps || 0));
    metrics.minutes += minutes; metrics.kilometers += kilometers; metrics.movements += movements; metrics.series += Math.max(0, Number(row.series_count || 0) || 0);
    const target = name.includes("bicic") || name.includes("bike") ? metrics.bicycle : name.includes("camin") || name.includes("esteira") || name.includes("corrida") ? metrics.walking : metrics.strength;
    target.minutes += minutes; target.kilometers += kilometers; target.averageKmh = target.minutes > 0 ? target.kilometers / (target.minutes / 60) : 0; target.movements = (target.movements || 0) + movements; target.series = (target.series || 0) + Math.max(0, Number(row.series_count || 0) || 0);
  }
  metrics.strength.movements = Math.max(0, metrics.strength.movements || 0); metrics.strength.series = Math.max(0, metrics.strength.series || 0);
  const availableDays = daysResult.rows.length;
  return { actions, tasks, exercises: { title: "Exercícios", selected: selectedExercises }, metrics, availableDays };
}

export async function getProject200SharedTaskComparison(userId, friendId, days = 1) {
  await ensureSchema();
  const currentUserId = String(userId || "").trim();
  const otherUserId = String(friendId || "").trim();
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) throw new Error("Amigo invalido.");
  await assertFriendship(currentUserId, otherUserId);
  const access = await getAccess(currentUserId, otherUserId);
  const [self, friend] = await Promise.all([getPersonCard(currentUserId), getPersonCard(otherUserId)]);
  const selectedDays = safeDays(days);
  const endDate = dateKey();
  const startDate = addDays(endDate, -(selectedDays - 1));
  if (!access || access.status !== "accepted") {
    const preview = await getActivities(currentUserId, startDate, endDate);
    return { access: access || { status: "not_requested" }, self, friend, period: selectedDays, periods: [1, 3].filter((value) => value <= Math.max(1, preview.availableDays)), range: { startDate, endDate }, preview: { self: preview }, comparison: null };
  }
  const [selfData, friendData] = await Promise.all([getActivities(currentUserId, startDate, endDate), getActivities(otherUserId, startDate, endDate)]);
  const availableDays = Math.max(selfData.availableDays, friendData.availableDays);
  const periods = [...new Set([...AVAILABLE_PERIODS.filter((value) => value <= availableDays), ...(availableDays > 0 && availableDays <= 120 ? [availableDays] : [])])].sort((a, b) => a - b);
  return { access, self, friend, period: selectedDays, periods, range: { startDate, endDate }, comparison: { self: selfData, friend: friendData } };
}
