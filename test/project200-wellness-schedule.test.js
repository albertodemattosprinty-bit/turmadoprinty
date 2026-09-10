import test from "node:test";
import assert from "node:assert/strict";

import {
  isProject200ExerciseScheduledForDate,
  normalizeProject200ExerciseDefinition,
  quantizeProject200MuscleLoad,
  project200ExerciseLibraryCompletionPercent
} from "../src/project200-wellness.js";

test("exercise respects the selected weekdays", () => {
  const exercise = { schedule_config: { frequency: "weekly", weekDays: [1, 2, 4, 5, 6] } };
  assert.equal(isProject200ExerciseScheduledForDate(exercise, "2026-09-09"), false);
  assert.equal(isProject200ExerciseScheduledForDate(exercise, "2026-09-10"), true);
});

test("legacy exercises without a schedule remain available every day", () => {
  assert.equal(isProject200ExerciseScheduledForDate({}, "2026-09-09"), true);
});

test("disabled exercises do not enter the day", () => {
  const exercise = { schedule_config: { frequency: "none", weekDays: [3] } };
  assert.equal(isProject200ExerciseScheduledForDate(exercise, "2026-09-09"), false);
});

test("daily completion ignores exercises that are not scheduled today", () => {
  const scheduled = {
    tracking_type: "series",
    daily_goal: 20,
    today_total_reps: 10,
    schedule_config: { frequency: "weekly", weekDays: [3] }
  };
  const offDay = {
    tracking_type: "series",
    daily_goal: 20,
    today_total_reps: 20,
    schedule_config: { frequency: "weekly", weekDays: [4] }
  };
  assert.equal(project200ExerciseLibraryCompletionPercent([scheduled, offDay], "2026-09-09"), 50);
});

test("muscle loads are clamped and quantized in steps of 0.05", () => {
  assert.equal(quantizeProject200MuscleLoad(0.63), 0.65);
  assert.equal(quantizeProject200MuscleLoad(0.1), 0.25);
  assert.equal(quantizeProject200MuscleLoad(1.4), 1);
});

test("exercise definitions keep at most three unique muscles", () => {
  const definition = normalizeProject200ExerciseDefinition({
    exerciseId: "squat",
    exerciseName: "Agachamento",
    category: "strength",
    trackingType: "series",
    muscles: [
      { name: "Quadríceps", load: 1 },
      { name: "Glúteos", load: 0.83 },
      { name: "quadríceps", load: 0.5 },
      { name: "Posteriores", load: 0.57 },
      { name: "Core", load: 0.25 }
    ]
  });
  assert.deepEqual(definition.muscles, [
    { name: "Quadríceps", load: 1 },
    { name: "Glúteos", load: 0.85 },
    { name: "Posteriores", load: 0.55 }
  ]);
});
