import { query } from "./db.js";
import { normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME } from "./project200-profiles.js";
const DEFAULT_SALDO_GOAL_CENTS = 1000000;
const CLOSED_DAILY_REPORT_SYNC_BATCH_SIZE = 3;
const closedDailyReportSyncByUser = new Map();
const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const PROJECT200_STATS_ASPECT_CATEGORIES = new Set([
  "sono",
  "alimentacao",
  "hidratacao",
  "estudo",
  "financeiro",
  "trabalho",
  "casa",
  "exercicios",
  "social",
  "familia",
  "higiene",
  "lazer"
]);

function normalizeProject200StatsProfile(value) {
  return normalizeStoredProject200ProfileName(value || PROJECT200_DEFAULT_PROFILE_NAME);
}

function normalizeProject200StatsCategoryId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT200_STATS_ASPECT_CATEGORIES.has(normalized) ? normalized : "";
}

function normalizeProject200MissionGoalIds(value) {
  const list = Array.isArray(value) ? value : [];
  const unique = new Set();
  for (const item of list) {
    const normalized = String(item || "").trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique];
}

function getProjectTimeZoneOffsetMinutes(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PROJECT200_TIME_ZONE,
    timeZoneName: "shortOffset"
  });
  const zoneName = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value || "GMT-03:00";
  const match = zoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    return -180;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes);
}

function getProjectCalendarParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT200_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day")
  };
}

function makeProjectZonedDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const offsetMinutes = getProjectTimeZoneOffsetMinutes(new Date(guessUtcMs));
  return new Date(guessUtcMs - (offsetMinutes * 60000));
}

function startOfProjectDay(date) {
  const { year, month, day } = getProjectCalendarParts(date);
  return makeProjectZonedDate(year, month, day, 0, 0, 0);
}

function addProjectDays(date, amount) {
  return new Date(date.getTime() + (amount * 86400000));
}

function startOfProjectWeek(date) {
  const value = startOfProjectDay(date);
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: PROJECT200_TIME_ZONE,
    weekday: "short"
  }).format(value);
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  const weekday = weekdayMap[weekdayLabel] ?? 0;
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addProjectDays(value, -daysSinceMonday);
}

function resolveStatsRange(scope = "general") {
  const now = new Date();
  const today = startOfProjectDay(now);
  const normalized = String(scope || "").trim().toLowerCase();
  const monthNames = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  if (!normalized || normalized === "general") {
    return { key: "general", label: "Geral", from: null, to: null };
  }
  if (normalized === "today") {
    return { key: "today", label: "Hoje", from: today, to: addProjectDays(today, 1) };
  }
  if (normalized === "week") {
    const weekStart = startOfProjectWeek(now);
    return { key: "week", label: "Esta semana", from: weekStart, to: addProjectDays(weekStart, 7) };
  }
  if (normalized === "last15") {
    return { key: "last15", label: "Ultimos 15 dias", from: addProjectDays(today, -14), to: addProjectDays(today, 1) };
  }
  if (normalized === "last7") {
    return { key: "last7", label: "Ultimos 7 dias", from: addProjectDays(today, -6), to: addProjectDays(today, 1) };
  }
  if (normalized === "last30") {
    return { key: "last30", label: "Ultimos 30 dias", from: addProjectDays(today, -29), to: addProjectDays(today, 1) };
  }
  if (/^month-\d{2}$/.test(normalized)) {
    const monthIndex = Number(normalized.slice(-2)) - 1;
    const { year } = getProjectCalendarParts(now);
    if (monthIndex >= 0 && monthIndex <= 11) {
      const from = makeProjectZonedDate(year, monthIndex + 1, 1, 0, 0, 0);
      const to = monthIndex === 11
        ? makeProjectZonedDate(year + 1, 1, 1, 0, 0, 0)
        : makeProjectZonedDate(year, monthIndex + 2, 1, 0, 0, 0);
      return {
        key: normalized,
        label: monthNames[monthIndex].replace(/^./, (c) => c.toUpperCase()),
        from,
        to
      };
    }
  }

  return { key: "general", label: "Geral", from: null, to: null };
}

export async function ensureStatsSchema() {
  await query(`
    create table if not exists platform_stats_goals (
      user_id uuid primary key references users(id) on delete cascade,
      daily_income_goal_cents bigint not null default 0,
      monthly_balance_goal_cents bigint not null default 0,
      recurring_income_goal_cents bigint not null default 0,
      updated_at timestamptz not null default now()
    );
  `);

  await query(`
    create table if not exists platform_daily_reports (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      report_date date not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (user_id, report_date)
    );
  `);

  await query(`
    create table if not exists project200_stats_aspects (
      user_id uuid not null references users(id) on delete cascade,
      assigned_profile text not null default 'Usuario',
      category_id text not null,
      target_minutes integer not null default 1,
      mission_goal_ids jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, assigned_profile, category_id)
    );
  `);
  await query("alter table project200_stats_aspects add column if not exists assigned_profile text not null default 'Usuario';");
  await query("alter table project200_stats_aspects add column if not exists category_id text not null default '';");
  await query("alter table project200_stats_aspects add column if not exists target_minutes integer not null default 1;");
  await query("alter table project200_stats_aspects add column if not exists mission_goal_ids jsonb not null default '[]'::jsonb;");
  await query("alter table project200_stats_aspects add column if not exists created_at timestamptz not null default now();");
  await query("alter table project200_stats_aspects add column if not exists updated_at timestamptz not null default now();");
  await query("update project200_stats_aspects set assigned_profile = 'Usuario' where assigned_profile is null or btrim(assigned_profile) = '';");
  await query("create index if not exists idx_project200_stats_aspects_user_profile on project200_stats_aspects(user_id, assigned_profile, updated_at desc);");
}

function normalizeProject200StatsAspectRow(row) {
  const missionGoalIds = normalizeProject200MissionGoalIds(row?.mission_goal_ids);
  return {
    categoryId: normalizeProject200StatsCategoryId(row?.category_id),
    targetMinutes: Math.max(1, Math.trunc(Number(row?.target_minutes || 1) || 1)),
    missionGoalIds
  };
}

export async function getProject200StatsAspectConfig(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME) {
  await ensureStatsSchema();
  const normalizedProfile = normalizeProject200StatsProfile(profileName);
  const result = await query(
    `
      select category_id, target_minutes, mission_goal_ids
      from project200_stats_aspects
      where user_id = $1
        and assigned_profile = $2
      order by category_id asc
    `,
    [userId, normalizedProfile]
  );
  const config = {};
  for (const row of result.rows) {
    const normalized = normalizeProject200StatsAspectRow(row);
    if (!normalized.categoryId) {
      continue;
    }
    config[normalized.categoryId] = {
      targetMinutes: normalized.targetMinutes,
      missionGoalIds: normalized.missionGoalIds
    };
  }
  return config;
}

export async function updateProject200StatsAspectConfig(userId, profileName = PROJECT200_DEFAULT_PROFILE_NAME, categoryId, payload = {}) {
  await ensureStatsSchema();
  const normalizedProfile = normalizeProject200StatsProfile(profileName);
  const normalizedCategoryId = normalizeProject200StatsCategoryId(categoryId);
  if (!normalizedCategoryId) {
    throw new Error("Categoria de estatística inválida.");
  }
  const targetMinutes = Math.max(1, Math.trunc(Number(payload?.targetMinutes || 1) || 1));
  const missionGoalIds = normalizeProject200MissionGoalIds(payload?.missionGoalIds);
  await query(
    `
      insert into project200_stats_aspects (
        user_id, assigned_profile, category_id, target_minutes, mission_goal_ids, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5::jsonb, now(), now())
      on conflict (user_id, assigned_profile, category_id) do update
        set target_minutes = excluded.target_minutes,
            mission_goal_ids = excluded.mission_goal_ids,
            updated_at = now()
    `,
    [userId, normalizedProfile, normalizedCategoryId, targetMinutes, JSON.stringify(missionGoalIds)]
  );
  return getProject200StatsAspectConfig(userId, normalizedProfile);
}

export async function getStatsGoals(userId) {
  await ensureStatsSchema();
  const result = await query(
    `
      select daily_income_goal_cents, monthly_balance_goal_cents, recurring_income_goal_cents
      from platform_stats_goals
      where user_id = $1
      limit 1
    `,
    [userId]
  );
  const row = result.rows[0] || {};
  const saldoGoal = Math.max(0, Number(row.daily_income_goal_cents || 0)) || DEFAULT_SALDO_GOAL_CENTS;
  return {
    dailyIncomeGoalCents: saldoGoal,
    monthlyBalanceGoalCents: Number(row.monthly_balance_goal_cents || 0),
    recurringIncomeGoalCents: Number(row.recurring_income_goal_cents || 0)
  };
}

export async function updateStatsGoals(userId, payload) {
  await ensureStatsSchema();
  const daily = Math.max(0, Math.trunc(Number(payload?.dailyIncomeGoalCents) || 0));
  const monthly = Math.max(0, Math.trunc(Number(payload?.monthlyBalanceGoalCents) || 0));
  const recurring = Math.max(0, Math.trunc(Number(payload?.recurringIncomeGoalCents) || 0));
  await query(
    `
      insert into platform_stats_goals (
        user_id, daily_income_goal_cents, monthly_balance_goal_cents, recurring_income_goal_cents
      )
      values ($1, $2, $3, $4)
      on conflict (user_id) do update
        set daily_income_goal_cents = excluded.daily_income_goal_cents,
            monthly_balance_goal_cents = excluded.monthly_balance_goal_cents,
            recurring_income_goal_cents = excluded.recurring_income_goal_cents,
            updated_at = now()
    `,
    [userId, daily, monthly, recurring]
  );
  return getStatsGoals(userId);
}

async function syncClosedDailyReports(userId, options = {}) {
  await ensureStatsSchema();
  const maxDays = Math.max(1, Math.trunc(Number(options?.maxDays) || 0)) || CLOSED_DAILY_REPORT_SYNC_BATCH_SIZE;

  const yesterday = startOfProjectDay(new Date());
  if (!yesterday) {
    return;
  }

  const last = await query(
    `
      select report_date
      from platform_daily_reports
      where user_id = $1
      order by report_date desc
      limit 1
    `,
    [userId]
  );

  let cursor = last.rows[0]?.report_date ? addProjectDays(startOfProjectDay(new Date(last.rows[0].report_date)), 1) : addProjectDays(yesterday, -30);
  const end = addProjectDays(yesterday, -1);
  let syncedDays = 0;

  while (cursor <= end && syncedDays < maxDays) {
    const from = startOfProjectDay(cursor);
    const to = addProjectDays(from, 1);
    const stats = await buildStatsSummary(userId, {
      from: from.toISOString(),
      to: to.toISOString(),
      label: from.toISOString().slice(0, 10),
      key: "closed-day"
    });
    await query(
      `
        insert into platform_daily_reports (user_id, report_date, payload)
        values ($1, $2::date, $3::jsonb)
        on conflict (user_id, report_date) do nothing
      `,
      [userId, from.toISOString().slice(0, 10), JSON.stringify(stats)]
    );
    cursor = addProjectDays(cursor, 1);
    syncedDays += 1;
  }
}

function scheduleClosedDailyReportsSync(userId) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || closedDailyReportSyncByUser.has(safeUserId)) {
    return;
  }

  const task = syncClosedDailyReports(safeUserId, { maxDays: CLOSED_DAILY_REPORT_SYNC_BATCH_SIZE })
    .catch(() => {})
    .finally(() => {
      closedDailyReportSyncByUser.delete(safeUserId);
    });

  closedDailyReportSyncByUser.set(safeUserId, task);
}

async function buildStatsSummary(userId, range) {
  const [actionsResult, categoryResult, incomeResult, expenseResult, balanceResult] = await Promise.all([
    query(
      `
        with action_status as (
          select
            a.id,
            a.assignee,
            case
              when lower(coalesce(a.category_id, '')) = 'sono' and a.sleep_session_date is not null then
                greatest(coalesce(a.sleep_tracked_minutes, 0), extract(epoch from (a.end_at - a.start_at)) / 60.0)
              else extract(epoch from (a.end_at - a.start_at)) / 60.0
            end as minutes,
            coalesce(o.status, 'PENDING') as status,
            o.started_at,
            a.start_at
          from actions a
          left join action_status_overrides o
            on o.user_id = a.user_id
           and o.action_id = a.id
          where a.user_id = $1
            and (
              (
                lower(coalesce(a.category_id, '')) = 'sono'
                and a.sleep_session_date is not null
                and ($2::timestamptz is null or a.sleep_session_date >= ($2::timestamptz at time zone '${PROJECT200_TIME_ZONE}')::date)
                and ($3::timestamptz is null or a.sleep_session_date < ($3::timestamptz at time zone '${PROJECT200_TIME_ZONE}')::date)
              )
              or (
                lower(coalesce(a.category_id, '')) <> 'sono'
                and ($2::timestamptz is null or a.start_at < $3::timestamptz)
                and ($2::timestamptz is null or a.end_at > $2::timestamptz)
              )
            )
        )
        select
          assignee,
          coalesce(sum(minutes), 0)::bigint as total_minutes,
          coalesce(sum(case when upper(status) = 'COMPLETED' then minutes else 0 end), 0)::bigint as completed_minutes,
          coalesce(sum(
            case
              when started_at is null then 0
              when started_at <= start_at then 0
              else extract(epoch from (started_at - start_at)) / 60.0
            end
          ), 0)::bigint as late_start_minutes
        from action_status
        group by assignee
      `,
      [userId, range.from || null, range.to || null]
    ),
    query(
      `
        with action_status as (
          select
            a.id,
            a.category_id,
            case
              when lower(coalesce(a.category_id, '')) = 'sono' and a.sleep_session_date is not null then
                greatest(coalesce(a.sleep_tracked_minutes, 0), extract(epoch from (a.end_at - a.start_at)) / 60.0)
              else extract(epoch from (a.end_at - a.start_at)) / 60.0
            end as minutes,
            coalesce(o.status, 'PENDING') as status
          from actions a
          left join action_status_overrides o
            on o.user_id = a.user_id
           and o.action_id = a.id
          where a.user_id = $1
            and (
              (
                lower(coalesce(a.category_id, '')) = 'sono'
                and a.sleep_session_date is not null
                and ($2::timestamptz is null or a.sleep_session_date >= ($2::timestamptz at time zone '${PROJECT200_TIME_ZONE}')::date)
                and ($3::timestamptz is null or a.sleep_session_date < ($3::timestamptz at time zone '${PROJECT200_TIME_ZONE}')::date)
              )
              or (
                lower(coalesce(a.category_id, '')) <> 'sono'
                and ($2::timestamptz is null or a.start_at < $3::timestamptz)
                and ($2::timestamptz is null or a.end_at > $2::timestamptz)
              )
            )
        )
        select
          coalesce(nullif(trim(category_id), ''), 'sem_categoria') as category_id,
          coalesce(sum(case when upper(status) = 'COMPLETED' then minutes else 0 end), 0)::bigint as completed_minutes
        from action_status
        group by coalesce(nullif(trim(category_id), ''), 'sem_categoria')
      `,
      [userId, range.from || null, range.to || null]
    ),
    query(
      `
        select coalesce(sum(amount_cents), 0)::bigint as income_cents
        from platform_finance_occurrences
        where user_id = $1
          and kind = 'INCOME'
          and ($2::timestamptz is null or occurred_at >= $2::timestamptz)
          and ($3::timestamptz is null or occurred_at < $3::timestamptz)
      `,
      [userId, range.from || null, range.to || null]
    ),
    query(
      `
        select coalesce(sum(amount_cents), 0)::bigint as expense_cents
        from platform_finance_occurrences
        where user_id = $1
          and kind = 'EXPENSE'
          and paid_at is not null
          and ($2::timestamptz is null or paid_at >= $2::timestamptz)
          and ($3::timestamptz is null or paid_at < $3::timestamptz)
      `,
      [userId, range.from || null, range.to || null]
    ),
    query(
      `
        select balance_cents
        from platform_finance_balances
        where user_id = $1
        limit 1
      `,
      [userId]
    )
  ]);

  const totalMinutes = actionsResult.rows.reduce((sum, row) => sum + Number(row.total_minutes || 0), 0);
  const completedMinutes = actionsResult.rows.reduce((sum, row) => sum + Number(row.completed_minutes || 0), 0);
  const lateStartMinutes = actionsResult.rows.reduce((sum, row) => sum + Number(row.late_start_minutes || 0), 0);
  const byAssignee = {
    [PROJECT200_DEFAULT_PROFILE_NAME]: {
      totalMinutes,
      completedMinutes,
      lateStartMinutes
    }
  };
  const byCategory = {};
  for (const row of categoryResult.rows) {
    const categoryId = String(row.category_id || "").trim().toLowerCase() || "sem_categoria";
    byCategory[categoryId] = Number(row.completed_minutes || 0);
  }

  return {
    rangeKey: range.key,
    rangeLabel: range.label,
    totals: {
      totalMinutes,
      completedMinutes,
      lateStartMinutes,
      completionPercent: totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0,
      incomeCents: Number(incomeResult.rows[0]?.income_cents || 0),
      expenseCents: Number(expenseResult.rows[0]?.expense_cents || 0),
      balanceCents: Number(balanceResult.rows[0]?.balance_cents || 0)
    },
    byAssignee,
    byCategory,
    globalProfiles: []
  };
}

export async function getStatsSummary(userId, scope) {
  scheduleClosedDailyReportsSync(userId);
  const range = resolveStatsRange(scope);
  return buildStatsSummary(userId, {
    key: range.key,
    label: range.label,
    from: range.from ? range.from.toISOString() : null,
    to: range.to ? range.to.toISOString() : null
  });
}
