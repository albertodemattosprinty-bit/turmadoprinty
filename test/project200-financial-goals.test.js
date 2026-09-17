import test from "node:test";
import assert from "node:assert/strict";
import { buildProject200FinancialGoalSchedule, financialGoalToProject200Mission } from "../src/project200-financial-goals.js";

test("chosen initial deposit starts today, grows linearly and reaches the exact deadline total", () => {
  const schedule = buildProject200FinancialGoalSchedule({ startOn: "2026-09-17", targetOn: "2026-10-17", targetAmountCents: 31000, gradualModel: true, initialDepositCents: 100 });
  assert.equal(schedule.length, 31);
  assert.equal(schedule[0].until, "2026-09-17");
  assert.equal(schedule[0].amountCents, 100);
  assert.equal(schedule.at(-1).until, "2026-10-17");
  assert.equal(schedule.reduce((sum, day) => sum + day.amountCents, 0), 31000);
  assert.ok(schedule.every((day, index) => Number.isInteger(day.amountCents) && (!index || day.amountCents >= schedule[index - 1].amountCents)));
});

test("one real today towards ten reais preserves today and gradually allocates the remainder", () => {
  const schedule = buildProject200FinancialGoalSchedule({ startOn: "2026-09-17", targetOn: "2026-10-02", targetAmountCents: 1000, gradualModel: true, initialDepositCents: 100 });
  assert.equal(schedule[0].amountCents, 100);
  assert.equal(schedule.reduce((sum, day) => sum + day.amountCents, 0), 1000);
  assert.ok(schedule.every((day) => Number.isInteger(day.amountCents) && day.amountCents >= 0));
  assert.ok(schedule.slice(2).every((day, index) => day.amountCents >= schedule[index + 1].amountCents));
});

test("zero, entire target, tiny amounts and long plans do not lose or create cents", () => {
  for (const days of [15, 29, 30, 365, 10958]) {
    const targetOn = new Date(Date.UTC(2026, 8, 17 + days)).toISOString().slice(0, 10);
    for (const targetAmountCents of [1, 17, 1000, 999999999999]) {
      for (const initialDepositCents of [0, Math.floor(targetAmountCents / 3), targetAmountCents]) {
        const schedule = buildProject200FinancialGoalSchedule({ startOn: "2026-09-17", targetOn, targetAmountCents, gradualModel: true, initialDepositCents });
        assert.equal(schedule[0].amountCents, initialDepositCents);
        assert.equal(schedule.reduce((sum, day) => sum + day.amountCents, 0), targetAmountCents);
        assert.ok(schedule.every((day) => Number.isSafeInteger(day.amountCents) && day.amountCents >= 0));
        assert.ok(schedule.slice(2).every((day, index) => day.amountCents >= schedule[index + 1].amountCents));
      }
    }
  }
});

test("invalid initial deposits are rejected instead of allocating negative money", () => {
  for (const initialDepositCents of [-1, 1001, 0.5, NaN]) {
    assert.throws(() => buildProject200FinancialGoalSchedule({ startOn: "2026-09-17", targetOn: "2026-10-02", targetAmountCents: 1000, gradualModel: true, initialDepositCents }));
  }
});

test("financial missions use the goal identity and actual money progress without premature completion", () => {
  const mission = financialGoalToProject200Mission({ id: "goal-one", name: "Reserva", profileName: "Lucas", targetAmountCents: 10000, progressCents: 9999, progressPercent: 100, schedule: [{ amountCents: 1 }] });
  assert.equal(mission.id, "goal-one");
  assert.equal(mission.title, "Reserva");
  assert.equal(mission.categoryId, "planejamento");
  assert.equal(mission.scheduleConfig.financialGoalId, "goal-one");
  assert.equal(mission.scheduleConfig.locked, true);
  assert.equal(mission.financialGoal.progressCents, 9999);
  assert.ok(mission.progressValue < mission.targetValue);
  assert.equal(mission.financialGoal.schedule, undefined);
});

test("financial goal uses daily steps below 30 days", () => {
  const schedule = buildProject200FinancialGoalSchedule({
    startOn: "2026-09-08",
    targetOn: "2026-09-23",
    targetAmountCents: 150000,
    gradualModel: false
  });
  assert.equal(schedule.length, 15);
  assert.equal(schedule.reduce((sum, item) => sum + item.amountCents, 0), 150000);
  assert.equal(schedule[0].label, "Dia 1");
});

test("gradual financial goal grows and preserves the exact total", () => {
  const schedule = buildProject200FinancialGoalSchedule({
    startOn: "2026-09-08",
    targetOn: "2027-09-08",
    targetAmountCents: 1200000,
    gradualModel: true
  });
  assert.equal(schedule.length, 12);
  assert.ok(schedule[0].amountCents < schedule.at(-1).amountCents);
  assert.equal(schedule.reduce((sum, item) => sum + item.amountCents, 0), 1200000);
});

test("financial goal keeps monthly steps after one year", () => {
  const schedule = buildProject200FinancialGoalSchedule({
    startOn: "2026-09-08",
    targetOn: "2027-10-08",
    targetAmountCents: 1300000,
    gradualModel: false
  });
  assert.equal(schedule.length, 13);
  assert.equal(schedule.at(-1).until, "2027-10-08");
  assert.equal(schedule.reduce((sum, item) => sum + item.amountCents, 0), 1300000);
});
