import test from "node:test";
import assert from "node:assert/strict";

import {
  isProject200ExerciseScheduledForDate,
  normalizeProject200ExerciseDefinition,
  quantizeProject200MuscleLoad,
  project200ExerciseLibraryCompletionPercent
} from "../src/project200-wellness.js";
import { PROJECT200_MUSCLES } from "../public/200/exercise-muscles.js";
import { PROJECT200_MUSCLE_MAPS } from "../public/200/exercise-muscle-maps.js";
import {
  calculateProject200WeeklyMuscleVolume,
  project200MuscleVolumeColor,
  project200MuscleVolumePercent,
  project200RepetitionFactor
} from "../public/200/exercise-muscle-volume.js";

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

test("weekly muscle plan converts weighted sets into the product scale", () => {
  const volume = calculateProject200WeeklyMuscleVolume([{
    trackingType: "series",
    targetSeries: 2,
    targetReps: 12,
    scheduleConfig: { frequency: "weekly", weekDays: [1, 4] },
    muscles: [{ muscleId: "peitoral-maior", load: 1 }, { muscleId: "triceps", load: .5 }]
  }]);
  assert.deepEqual(volume.map(({ muscleId, effectiveSets, percent, stage }) => ({ muscleId, effectiveSets, percent, stage })), [
    { muscleId: "peitoral-maior", effectiveSets: 4, percent: 50, stage: "Manutenção" },
    { muscleId: "triceps", effectiveSets: 2, percent: 30, stage: "Saúde" }
  ]);
  assert.equal(project200MuscleVolumePercent(14), 100);
});

test("repetition and color scales remain gradual", () => {
  assert.equal(project200RepetitionFactor(4), .5);
  assert.equal(project200RepetitionFactor(8), 1);
  assert.notEqual(project200MuscleVolumeColor(50), project200MuscleVolumeColor(51));
  assert.notEqual(project200MuscleVolumeColor(99), project200MuscleVolumeColor(100));
});
