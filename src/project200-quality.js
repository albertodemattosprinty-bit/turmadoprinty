import { query } from './db.js';
import { QUALITY_ASPECTS } from '../public/200/quality-data.js';
import { normalizeStoredProject200ProfileName } from './project200-profiles.js';
import { ensureStatsSchema } from './stats.js';
import { ensureExtraGoalsSchema } from './extra-goals.js';
import { ensureProject200SleepSchema } from './project200-sleep.js';
import { ensureProject200WellnessSchema } from './project200-wellness.js';
import { ensureProject200FinanceLedgerSchema } from './project200-finance-ledger.js';

// Each observed calendar day replaces one of the 90 estimated days. Unobserved
// days keep the user's estimate; absence of a record is not treated as failure.
export function qualityRollingAverage(baseline, dailyRows) {
  const totals = Object.fromEntries(QUALITY_ASPECTS.map(({ id }) => [id, { sum: 0, count: 0 }]));
  for (const row of dailyRows) {
    const entry = totals[row.category_id];
    if (!entry || !(Number(row.planned) > 0)) continue;
    entry.sum += Math.max(0, Math.min(100, Number(row.completed) / Number(row.planned) * 100));
    entry.count++;
  }
  return Object.fromEntries(QUALITY_ASPECTS.map(({ id }) => [id,
    Math.round(((90 - totals[id].count) * baseline[id] + totals[id].sum) / 90 * 10) / 10
  ]));
}

export function validateQualityValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length !== 12 ||
      QUALITY_ASPECTS.some(({ id }) => !Number.isInteger(values[id]) || values[id] < 0 || values[id] > 100)) {
    throw new Error('Avalie os 12 aspectos com porcentagens inteiras entre 0 e 100.');
  }
  return Object.fromEntries(QUALITY_ASPECTS.map(({ id }) => [id, values[id]]));
}

export async function ensureQualitySchema() {
  await query(`create table if not exists project200_quality_assessments (
    user_id uuid not null references users(id) on delete cascade,
    assigned_profile text not null,
    baseline_values jsonb not null,
    baseline_days integer not null default 90 check (baseline_days = 90),
    assessed_at timestamptz not null default now(),
    primary key(user_id, assigned_profile)
  )`);
  await query("alter table project200_quality_assessments add column if not exists finance_native_initialized boolean not null default false");
}

export async function getQualityAssessment(userId, profile) {
  await ensureQualitySchema();
  const tasksResult = await query(`select distinct on (coalesce(repeat_group_id::text,id::text))
    id,title,category_id from actions where user_id=$1 and assignee=$2
    order by coalesce(repeat_group_id::text,id::text),start_at desc`, [userId, normalizeStoredProject200ProfileName(profile)]);
  const linkedTasks = tasksResult.rows.map(task => ({ id: task.id, title: task.title, categoryId: task.category_id }));
  const result = await query(`select baseline_values, baseline_days, assessed_at, finance_native_initialized
    from project200_quality_assessments where user_id = $1 and assigned_profile = $2`,
    [userId, normalizeStoredProject200ProfileName(profile)]);
  const row = result.rows[0];
  if (!row) return { completed: false, values: {}, linkedTasks };
  if (!row.finance_native_initialized) {
    row.baseline_values = { ...(row.baseline_values || {}), planejamento: 0 };
    await query(`update project200_quality_assessments set baseline_values=$3::jsonb,finance_native_initialized=true
      where user_id=$1 and assigned_profile=$2`, [userId, normalizeStoredProject200ProfileName(profile), JSON.stringify(row.baseline_values)]);
  }
  await Promise.all([ensureStatsSchema(), ensureExtraGoalsSchema(), ensureProject200SleepSchema(), ensureProject200WellnessSchema(), ensureProject200FinanceLedgerSchema()]);
  const daily = await query(`with settings as (
      select * from project200_stats_aspect_settings where user_id=$1 and assigned_profile=$2
    ), samples as (
      select a.category_id, (a.start_at at time zone $4)::date as day,
        greatest(0,extract(epoch from(a.end_at-a.start_at))/60) as planned,
        greatest(0,extract(epoch from(a.end_at-a.start_at))/60) *
          case when upper(coalesce(o.status,''))='COMPLETED' then 1
          else greatest(0,least(100,coalesce(o.completion_percent,0)))/100.0 end as completed
      from actions a left join action_status_overrides o on o.user_id=a.user_id and o.action_id=a.id
      where a.user_id=$1 and a.assignee=$2 and a.category_id not in ('sono','alimentacao','exercicios','planejamento')
        and a.start_at >= greatest($3::timestamptz,now()-interval '91 days')
      union all
      select s.category_id, h.scope_date,
        h.target_value * greatest(g.unit_duration_seconds/60.0,g.unit_duration_minutes,1),
        h.progress_value * greatest(g.unit_duration_seconds/60.0,g.unit_duration_minutes,1)
      from extra_goal_progress_history h
      join extra_goals g on g.id=h.goal_id and g.user_id=h.user_id and g.assigned_profile=h.assigned_profile
      join settings s on s.mission_goal_ids ? g.id::text
      where h.user_id=$1 and h.assigned_profile=$2 and g.goal_kind<>'limit' and not g.is_folder
        and s.category_id not in ('alimentacao','exercicios','planejamento')
      union all
      select 'sono', sleep_date, coalesce((select target_minutes from settings where category_id='sono'),420), total_minutes
      from "sono-user" where user_id=$1 and assigned_profile=$2
      union all
      select 'alimentacao', nutrition_days.day, 100,
        coalesce((select sum(latest.quality_score)::numeric / greatest(jsonb_array_length(pref.meal_slots),1)
          from (select distinct on (entry.meal_slot) entry.meal_slot,entry.quality_score
            from project200_nutrition_entries entry
            where entry.user_id=$1 and entry.assigned_profile=$2 and pref.meal_slots ? entry.meal_slot
              and (entry.consumed_at at time zone $4)::date=nutrition_days.day
            order by entry.meal_slot,entry.consumed_at desc) latest),0)
      from project200_wellness_preferences pref
      cross join lateral generate_series(greatest(pref.created_at::date,$3::date,current_date-89),current_date,interval '1 day') nutrition_days(day)
      where pref.user_id=$1 and pref.assigned_profile=$2 and jsonb_array_length(pref.meal_slots)>0
      union all
      select 'exercicios', exercise_days.day, coalesce(sum(library.daily_goal),0),
        coalesce(sum(case library.tracking_type when 'series' then activity.total_reps when 'gps' then activity.distance_meters else activity.duration_minutes end),0)
      from project200_exercise_library library
      cross join lateral generate_series(greatest(library.created_at::date,$3::date,current_date-89),current_date,interval '1 day') exercise_days(day)
      left join lateral (select coalesce(sum(session.total_reps),0) total_reps,coalesce(sum(session.distance_meters),0) distance_meters,coalesce(sum(session.duration_minutes),0) duration_minutes
        from project200_exercise_sessions session where session.user_id=library.user_id and session.assigned_profile=library.assigned_profile
          and session.exercise_id=library.exercise_id and session.status='completed' and (session.completed_at at time zone $4)::date=exercise_days.day) activity on true
      where library.user_id=$1 and library.assigned_profile=$2
      group by exercise_days.day
      union all
      select 'planejamento', finance_days.day,
        coalesce(sum(goal.target_amount_cents::numeric / greatest(goal.target_on-goal.start_on,1)),0),
        coalesce(sum((select sum(occurrence.amount_cents) from project200_finance_items item join project200_finance_occurrences occurrence on occurrence.item_id=item.id
          where item.financial_goal_id=goal.id and item.deleted_at is null and occurrence.status='SETTLED' and occurrence.kind='INCOME'
            and occurrence.due_on=finance_days.day)),0)
      from project200_financial_goals goal
      cross join lateral generate_series(greatest(goal.start_on,$3::date,current_date-89),least(goal.target_on,current_date),interval '1 day') finance_days(day)
      where goal.user_id=$1 and goal.assigned_profile=$2 and goal.status<>'ARCHIVED'
      group by finance_days.day
    ) select category_id,day,sum(planned) as planned,sum(completed) as completed from samples
    where day > ($3::timestamptz at time zone $4)::date
      and day >= (now() at time zone $4)::date-89 and day <= (now() at time zone $4)::date
    group by category_id,day`, [userId, normalizeStoredProject200ProfileName(profile), row.assessed_at, process.env.PROJECT200_TIME_ZONE || 'America/Sao_Paulo']);
  return { completed: true, values: qualityRollingAverage(row.baseline_values, daily.rows), baselineValues: row.baseline_values,
    baselineDays: row.baseline_days, assessedAt: row.assessed_at, linkedTasks, source: 'baseline_and_recorded_daily_execution' };
}

export async function saveQualityAssessment(userId, profile, values) {
  const normalized = validateQualityValues(values);
  await ensureQualitySchema();
  await query(`insert into project200_quality_assessments(user_id, assigned_profile, baseline_values,finance_native_initialized)
    values ($1,$2,$3::jsonb,true) on conflict(user_id, assigned_profile) do update
    set baseline_values = excluded.baseline_values, finance_native_initialized=true, assessed_at = now()`,
    [userId, normalizeStoredProject200ProfileName(profile), JSON.stringify(normalized)]);
  return getQualityAssessment(userId, profile);
}
