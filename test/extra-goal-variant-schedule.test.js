import test from "node:test";
import assert from "node:assert/strict";

import { resolveNextExtraGoalVariantDueAt } from "../src/extra-goals.js";

test("periodico respeita o ciclo e pula dias evitados", () => {
  const next = resolveNextExtraGoalVariantDueAt({
    scheduleMode: "periodic",
    intervalValue: 5,
    intervalUnit: "days",
    avoidDays: [0, 6]
  }, "2026-08-03T12:00:00-03:00");
  assert.equal(next, "2026-08-10T15:00:00.000Z");
});

test("semanal renova no proximo dia selecionado", () => {
  const next = resolveNextExtraGoalVariantDueAt({
    scheduleMode: "weekly",
    repeatDays: [3, 5]
  }, "2026-08-03T12:00:00-03:00");
  assert.equal(next, "2026-08-05T15:00:00.000Z");
});

test("registro legado com ciclo e dias marcados prioriza o ciclo", () => {
  const next = resolveNextExtraGoalVariantDueAt({
    intervalValue: 8,
    intervalUnit: "days",
    repeatDays: [1]
  }, "2026-08-03T12:00:00-03:00");
  assert.equal(next, "2026-08-11T15:00:00.000Z");
});
