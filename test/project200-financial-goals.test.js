import test from "node:test";
import assert from "node:assert/strict";
import { buildProject200FinancialGoalSchedule } from "../src/project200-financial-goals.js";

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
