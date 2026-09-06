import { query } from './db.js';
import { QUALITY_ASPECTS } from '../public/200/quality-data.js';
import { normalizeStoredProject200ProfileName } from './project200-profiles.js';
import { ensureStatsSchema } from './stats.js';
import { ensureExtraGoalsSchema } from './extra-goals.js';
import { ensureProject200SleepSchema } from './project200-sleep.js';

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
}

export async function getQualityAssessment(userId, profile) {
  await ensureQualitySchema();
  const tasksResult = await query(`select distinct on (coalesce(repeat_group_id::text,id::text))
    id,title,category_id from actions where user_id=$1 and assignee=$2
    order by coalesce(repeat_group_id::text,id::text),start_at desc`, [userId, normalizeStoredProject200ProfileName(profile)]);
  const linkedTasks = tasksResult.rows.map(task => ({ id: task.id, title: task.title, categoryId: task.category_id }));
  const result = await query(`select baseline_values, baseline_days, assessed_at
    from project200_quality_assessments where user_id = $1 and assigned_profile = $2`,
    [userId, normalizeStoredProject200ProfileName(profile)]);
  const row = result.rows[0];
  if (!row) return { completed: false, values: {}, linkedTasks };
  await Promise.all([ensureStatsSchema(), ensureExtraGoalsSchema(), ensureProject200SleepSchema()]);
  const daily = await query(`with settings as (
      select * from project200_stats_aspect_settings where user_id=$1 and assigned_profile=$2
    ), samples as (
      select a.category_id, (a.start_at at time zone $4)::date as day,
        greatest(0,extract(epoch from(a.end_at-a.start_at))/60) as planned,
        greatest(0,extract(epoch from(a.end_at-a.start_at))/60) *
          case when upper(coalesce(o.status,''))='COMPLETED' then 1
          else greatest(0,least(100,coalesce(o.completion_percent,0)))/100.0 end as completed
      from actions a left join action_status_overrides o on o.user_id=a.user_id and o.action_id=a.id
      where a.user_id=$1 and a.assignee=$2 and a.category_id<>'sono'
        and a.start_at >= greatest($3::timestamptz,now()-interval '91 days')
      union all
      select s.category_id, h.scope_date,
        h.target_value * greatest(g.unit_duration_seconds/60.0,g.unit_duration_minutes,1),
        h.progress_value * greatest(g.unit_duration_seconds/60.0,g.unit_duration_minutes,1)
      from extra_goal_progress_history h
      join extra_goals g on g.id=h.goal_id and g.user_id=h.user_id and g.assigned_profile=h.assigned_profile
      join settings s on s.mission_goal_ids ? g.id::text
      where h.user_id=$1 and h.assigned_profile=$2 and g.goal_kind<>'limit' and not g.is_folder
      union all
      select 'sono', sleep_date, coalesce((select target_minutes from settings where category_id='sono'),420), total_minutes
      from "sono-user" where user_id=$1 and assigned_profile=$2
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
  await query(`insert into project200_quality_assessments(user_id, assigned_profile, baseline_values)
    values ($1,$2,$3::jsonb) on conflict(user_id, assigned_profile) do update
    set baseline_values = excluded.baseline_values, assessed_at = now()`,
    [userId, normalizeStoredProject200ProfileName(profile), JSON.stringify(normalized)]);
  return getQualityAssessment(userId, profile);
}
