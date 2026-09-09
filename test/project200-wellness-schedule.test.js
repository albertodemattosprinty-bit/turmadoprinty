import test from "node:test";
import assert from "node:assert/strict";

import {
  isProject200ExerciseScheduledForDate,
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
