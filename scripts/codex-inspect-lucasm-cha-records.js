import { db } from "../src/db.js";
import { listExtraGoalProgressEvents } from "../src/extra-goals.js";

const userId = "915df28e-6b48-4560-8bf8-352d465c71eb";
const goalId = "dcba80c4-ef64-4fc8-9c2b-21a719c11e73";
const history = await listExtraGoalProgressEvents(userId, "Usuario", goalId);

console.log(JSON.stringify(history.bestIntervals, null, 2));
await db.end();
