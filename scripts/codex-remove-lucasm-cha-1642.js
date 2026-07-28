import { db } from "../src/db.js";

const result = await db.query(
  `select
     event.id,
     usr.username,
     goal.id as goal_id,
     goal.title,
     event.delta_value,
     event.occurred_at,
     event.deleted_at,
     event.assigned_profile
   from extra_goal_progress_events event
   join users usr on usr.id = event.user_id
   join extra_goals goal on goal.id = event.goal_id
   where lower(usr.username) = lower($1)
     and lower(unaccent(goal.title)) = lower(unaccent($2))
     and to_char(event.occurred_at at time zone $4, $5) = $3
   order by event.occurred_at desc`,
  ["LucasM", "chá", "16:42", "America/Sao_Paulo", "HH24:MI"]
);

console.log(JSON.stringify(result.rows, null, 2));
await db.end();
