import { query } from "./db.js";

const ASSIGNEES = ["Geral", "Rose", "Alberto", "Lucas", "Thainan"];

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, amount) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function resolveStatsRange(scope = "general") {
  const now = new Date();
  const today = startOfDay(now);
  const normalized = String(scope || "").trim().toLowerCase();
  const monthNames = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  if (!normalized || normalized === "general") {
    return { key: "general", label: "Geral", from: null, to: null };
  }
  if (normalized === "today") {
    return { key: "today", label: "Hoje", from: today, to: addDays(today, 1) };
  }
  if (normalized === "week") {
    const weekday = today.getDay();
    const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
    const weekStart = addDays(today, -daysSinceMonday);
    return { key: "week", label: "Esta semana", from: weekStart, to: addDays(weekStart, 7) };
  }
  if (normalized === "last15") {
    return { key: "last15", label: "Ultimos 15 dias", from: addDays(today, -14), to: addDays(today, 1) };
  }
  if (normalized === "last30") {
    return { key: "last30", label: "Ultimos 30 dias", from: addDays(today, -29), to: addDays(today, 1) };
  }
  if (/^month-\d{2}$/.test(normalized)) {
    const monthIndex = Number(normalized.slice(-2)) - 1;
    const year = today.getFullYear();
    if (monthIndex >= 0 && monthIndex <= 11) {
      const from = new Date(year, monthIndex, 1);
      const to = monthIndex === 11 ? new Date(year + 1, 0, 1) : new Date(year, monthIndex + 1, 1);
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
  return {
    dailyIncomeGoalCents: Number(row.daily_income_goal_cents || 0),
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

async function syncClosedDailyReports(userId) {
  await ensureStatsSchema();

  const yesterday = startOfDay(new Date());
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

  let cursor = last.rows[0]?.report_date ? addDays(new Date(last.rows[0].report_date), 1) : addDays(yesterday, -30);
  const end = addDays(yesterday, -1);

  while (cursor <= end) {
    const from = startOfDay(cursor);
    const to = addDays(from, 1);
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
    cursor = addDays(cursor, 1);
  }
}

async function buildStatsSummary(userId, range) {
  const [actionsResult, incomeResult, expenseResult, balanceResult] = await Promise.all([
    query(
      `
        with action_status as (
          select
            a.id,
            a.assignee,
            extract(epoch from (a.end_at - a.start_at)) / 60.0 as minutes,
            coalesce(o.status, 'PENDING') as status
          from actions a
          left join action_status_overrides o
            on o.user_id = a.user_id
           and o.action_id = a.id
          where a.user_id = $1
            and ($2::timestamptz is null or a.start_at < $3::timestamptz)
            and ($2::timestamptz is null or a.end_at > $2::timestamptz)
        )
        select
          assignee,
          coalesce(sum(minutes), 0)::bigint as total_minutes,
          coalesce(sum(case when upper(status) = 'COMPLETED' then minutes else 0 end), 0)::bigint as completed_minutes
        from action_status
        group by assignee
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

  const byAssignee = {};
  for (const row of actionsResult.rows) {
    const assignee = ASSIGNEES.includes(row.assignee) ? row.assignee : "Geral";
    byAssignee[assignee] = {
      totalMinutes: Number(row.total_minutes || 0),
      completedMinutes: Number(row.completed_minutes || 0)
    };
  }

  const totalMinutes = Object.values(byAssignee).reduce((sum, item) => sum + Number(item.totalMinutes || 0), 0);
  const completedMinutes = Object.values(byAssignee).reduce((sum, item) => sum + Number(item.completedMinutes || 0), 0);

  return {
    rangeKey: range.key,
    rangeLabel: range.label,
    totals: {
      totalMinutes,
      completedMinutes,
      completionPercent: totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0,
      incomeCents: Number(incomeResult.rows[0]?.income_cents || 0),
      expenseCents: Number(expenseResult.rows[0]?.expense_cents || 0),
      balanceCents: Number(balanceResult.rows[0]?.balance_cents || 0)
    },
    byAssignee
  };
}

export async function getStatsSummary(userId, scope) {
  await syncClosedDailyReports(userId);
  const range = resolveStatsRange(scope);
  return buildStatsSummary(userId, {
    key: range.key,
    label: range.label,
    from: range.from ? range.from.toISOString() : null,
    to: range.to ? range.to.toISOString() : null
  });
}
