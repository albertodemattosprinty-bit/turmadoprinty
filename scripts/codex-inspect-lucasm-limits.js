import { db } from "../src/db.js";

const result = await db.query(
  `select
     event.id,
     usr.id as user_id,
     usr.username,
     usr.name,
     goal.id as goal_id,
     goal.title,
     goal.goal_kind,
     event.delta_value,
     event.occurred_at,
     to_char(event.occurred_at at time zone $2, $3) as local_time,
     event.deleted_at,
     event.assigned_profile
   from users usr
   join extra_goals goal on goal.user_id = usr.id
   left join extra_goal_progress_events event on event.goal_id = goal.id
   where (lower(usr.username) like lower($1) or lower(usr.name) like lower($1))
     and goal.goal_kind = $4
   order by event.occurred_at desc nulls last`,
  ["%LucasM%", "America/Sao_Paulo", "YYYY-MM-DD HH24:MI:SS", "limit"]
);

console.log(JSON.stringify(result.rows, null, 2));
await db.end();
