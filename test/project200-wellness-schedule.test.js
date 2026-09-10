import test from "node:test";
import assert from "node:assert/strict";

import {
  isProject200ExerciseScheduledForDate,
  normalizeProject200ExerciseDefinition,
  normalizeProject200WorkoutSeries,
  quantizeProject200MuscleLoad,
  project200ExerciseLibraryCompletionPercent
} from "../src/project200-wellness.js";
import { PROJECT200_MUSCLES } from "../public/200/exercise-muscles.js";
import { PROJECT200_MUSCLE_MAPS } from "../public/200/exercise-muscle-maps.js";
import {
  calculateProject200ExerciseMuscleGains,
  project200DecayedMusclePoints,
  project200MuscleProgressColor,
  project200MuscleProgressPercent,
  project200MuscleProgressStage
} from "../public/200/exercise-muscle-progress.js";

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
    { muscleId: "vasto-lateral", name: "Vasto lateral", load: 1 },
    { muscleId: "reto-femoral", name: "Reto femoral", load: 1 },
    { muscleId: "vasto-medial", name: "Vasto medial", load: 1 }
  ]);
});

test("exercise definitions reject muscles outside the fixed map", () => {
  const definition = normalizeProject200ExerciseDefinition({
    exerciseId: "custom",
    exerciseName: "Teste",
    muscles: [{ muscleId: "musculo-inventado", load: 1 }, { name: "Dorsais", load: 0.65 }]
  });
  assert.deepEqual(definition.muscles, [
    { muscleId: "latissimo-dorso", name: "Latíssimo do dorso", load: 0.65 }
  ]);
});

test("all clickable anatomy regions use the closed muscle registry", () => {
  const muscleIds = new Set(PROJECT200_MUSCLES.map(({ id }) => id));
  const regions = PROJECT200_MUSCLE_MAPS.flatMap(({ regions: mapRegions }) => mapRegions);
  assert.equal(PROJECT200_MUSCLES.length, 30);
  assert.equal(regions.length, 58);
  assert.equal(regions.every(({ muscleId }) => muscleIds.has(muscleId)), true);
});

test("completed series credit muscles by actual repetitions and intensity", () => {
  const gains = calculateProject200ExerciseMuscleGains(
    [{ repetitions: 12 }, { repetitions: 12 }, { repetitions: 12 }],
    [{ muscleId: "deltoide-anterior", load: .70 }, { muscleId: "triceps", load: 1 }]
  );
  assert.deepEqual(gains, [
    { muscleId: "deltoide-anterior", points: 2.1 },
    { muscleId: "triceps", points: 3 }
  ]);
  assert.deepEqual(calculateProject200ExerciseMuscleGains([{ repetitions: 6 }], [{ muscleId: "peitoral-maior", load: .5 }]), [
    { muscleId: "peitoral-maior", points: .25 }
  ]);
});

test("finish payload keeps rapid series ordered and idempotent", () => {
  assert.deepEqual(normalizeProject200WorkoutSeries([
    { seriesNumber: 1, repetitions: 12, targetRepetitions: 12 },
    { seriesNumber: 2, repetitions: 10, targetRepetitions: 12 },
    { seriesNumber: 2, repetitions: 999, targetRepetitions: 12 },
    { seriesNumber: 3, repetitions: 8, targetRepetitions: 12 }
  ]), [
    { seriesNumber: 1, repetitions: 12, targetRepetitions: 12 },
    { seriesNumber: 2, repetitions: 10, targetRepetitions: 12 },
    { seriesNumber: 3, repetitions: 8, targetRepetitions: 12 }
  ]);
});

test("the muscle scale uses 40 percent of its original requirement", () => {
  assert.equal(project200MuscleProgressPercent(4.8), 50);
  assert.equal(project200MuscleProgressStage(50), "Manutenção");
  assert.equal(project200MuscleProgressPercent(9.6), 100);
  assert.equal(project200MuscleProgressStage(100), "Hipertrofia forte");
  assert.equal(project200MuscleProgressPercent(10.56), 110);
  assert.equal(project200MuscleProgressStage(110), "Sobrecarga");
});

test("muscle state loses one percent every 25 minutes without becoming negative", () => {
  assert.equal(project200DecayedMusclePoints(9.6, 24.99), 9.6);
  assert.equal(project200DecayedMusclePoints(9.6, 25), 9.504);
  assert.equal(project200DecayedMusclePoints(9.6, 50), 9.408);
  assert.equal(project200DecayedMusclePoints(.05, 25), 0);
});

test("muscle state colors remain gradual", () => {
  assert.equal(project200MuscleProgressColor(0), "rgb(148 163 184)");
  assert.notEqual(project200MuscleProgressColor(50), project200MuscleProgressColor(51));
  assert.notEqual(project200MuscleProgressColor(99), project200MuscleProgressColor(100));
  assert.equal(project200MuscleProgressColor(110), "rgb(249 115 22)");
  assert.equal(project200MuscleProgressColor(140), "rgb(239 68 68)");
});
