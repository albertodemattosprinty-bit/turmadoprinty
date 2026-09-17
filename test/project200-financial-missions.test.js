import test from "node:test";
import assert from "node:assert/strict";

// Exercise real query/normalization paths against an in-memory database fixture.
process.env.DATABASE_URL = "postgres://fixture:fixture@localhost:1/fixture";
const { db } = await import("../src/db.js");
const { listExtraGoalsByScope, getExtraGoalById } = await import("../src/extra-goals.js");
const { createProject200FinancialGoal } = await import("../src/project200-financial-goals.js");
const goalId = "20000000-0000-4000-8000-000000000099";
const calls = [];
db.query = async (sql, params = []) => {
  calls.push({ sql, params });
  if (sql.includes("from project200_financial_goals goal")) {
    return { rows: params[0] === "owner" && params[1] === "Lucas" ? [{ id: goalId, assigned_profile: "Lucas", name: "Reserva", target_amount_cents: 1000, progress_cents: 100, start_on: "2026-09-17", target_on: "2026-10-02", gradual_model: true, initial_deposit_cents: 100, status: "ACTIVE" }] : [], rowCount: 1 };
  }
  if (sql.startsWith("insert into project200_financial_goals")) {
    return { rows: [{ id: goalId, assigned_profile: params[1], name: params[2], target_amount_cents: params[3], start_on: params[4], target_on: params[5], gradual_model: params[6], initial_deposit_cents: params[7], progress_cents: 0, status: "ACTIVE" }], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
};

test("existing financial goals appear once in every mission scope and preserve cumulative progress", async () => {
  for (const scope of ["today", "last7", "last15", "last30"]) {
    const result = await listExtraGoalsByScope("owner", "Lucas", scope);
    assert.equal(result.goals.length, 1);
    assert.equal(result.goals[0].id, goalId);
    assert.equal(result.goals[0].financialGoal.progressCents, 100);
    assert.equal(result.goals[0].progressValue, 10);
    assert.equal(result.goals[0].scheduleConfig.nativeType, "financial_goal");
  }
  assert.equal((await listExtraGoalsByScope("other-owner", "Lucas")).goals.length, 0);
  assert.equal((await listExtraGoalsByScope("owner", "Outro perfil")).goals.length, 0);
  assert.ok(!calls.some(({ sql }) => sql.includes("insert into extra_goal_progress_history")));
});

test("financial mission lookup retains the lock and cannot cross user or profile boundaries", async () => {
  const goal = await getExtraGoalById("owner", "Lucas", goalId);
  assert.equal(goal.scheduleConfig.locked, true);
  assert.equal(goal.scheduleConfig.nativeType, "financial_goal");
  assert.equal(await getExtraGoalById("other-owner", "Lucas", goalId), null);
  assert.equal(await getExtraGoalById("owner", "Outro perfil", goalId), null);
});

test("creating a gradual goal persists the chosen first deposit without recording fictitious progress", async () => {
  const goal = await createProject200FinancialGoal("owner", { profileName: "Lucas", name: "Reserva", targetAmountCents: 1000, startOn: "2026-09-17", targetOn: "2026-10-02", gradualModel: true, initialDepositCents: 100 });
  assert.equal(goal.initialDepositCents, 100);
  assert.equal(goal.schedule[0].amountCents, 100);
  assert.equal(goal.progressCents, 0);
  assert.equal(calls.findLast(({ sql }) => sql.startsWith("insert into project200_financial_goals")).params[7], 100);
  await assert.rejects(createProject200FinancialGoal("owner", { profileName: "Lucas", name: "Reserva", targetAmountCents: 1000, startOn: "2026-09-17", targetOn: "2026-10-02", gradualModel: true, initialDepositCents: 1001 }));
});

test.after(async () => { await db.end(); });
