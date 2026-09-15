import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateProject200ExerciseMetricGains,
  defaultProject200ExerciseMetrics,
  defaultProject200ExerciseMuscleLoads,
  formatProject200Distance,
  normalizeProject200ExerciseMetrics,
  project200ExerciseDurationMinutes,
  project200MetricColor
} from "../public/200/exercise-performance.js";

test("cardio intensity pack keeps the requested light and heavy anchors", () => {
  assert.deepEqual(defaultProject200ExerciseMetrics({ id: "walk", category: "aerobic" }), {
    energyPerMinute: 1,
    strengthPerMinute: .5,
    resistancePerMinute: 1.2
  });
  assert.deepEqual(defaultProject200ExerciseMetrics({ id: "run-heavy", category: "aerobic" }), {
    energyPerMinute: 5,
    strengthPerMinute: 1.8,
    resistancePerMinute: 5
  });
  assert.equal(defaultProject200ExerciseMuscleLoads({ id: "bike-heavy" })[0].load, .9);
});

test("metric values are clamped and quantized to five hundredths", () => {
  assert.deepEqual(normalizeProject200ExerciseMetrics({
    energyPerMinute: 8,
    strengthPerMinute: .11,
    resistancePerMinute: 3.127
  }), { energyPerMinute: 5, strengthPerMinute: .5, resistancePerMinute: 3.15 });
});

test("timed gains multiply each per-minute rate by elapsed minutes", () => {
  assert.deepEqual(calculateProject200ExerciseMetricGains(
    { trackingType: "gps", durationMinutes: 30 },
    { energyPerMinute: 3.5, strengthPerMinute: 1.3, resistancePerMinute: 4.1 }
  ), { durationMinutes: 30, energy: 105, strength: 39, resistance: 123 });
});

test("series use estimated movement time instead of treating repetitions as minutes", () => {
  const workout = { trackingType: "series", series: [{ repetitions: 5 }, { repetitions: 12 }, { repetitions: 18 }] };
  assert.equal(project200ExerciseDurationMinutes(workout), 3);
  assert.equal(calculateProject200ExerciseMetricGains(workout, {
    energyPerMinute: 4,
    strengthPerMinute: 5,
    resistancePerMinute: 2
  }).strength, 15);
});

test("the 0-80 visual scales use the requested color tables", () => {
  assert.equal(project200MetricColor("energy", 20), "#22c55e");
  assert.equal(project200MetricColor("strength", 21), "#facc15");
  assert.equal(project200MetricColor("energy", 61), "#ef4444");
  assert.equal(project200MetricColor("resistance", 21), "#2563eb");
  assert.equal(project200MetricColor("resistance", 41), "#1e3a8a");
  assert.equal(project200MetricColor("resistance", 61), "#7e22ce");
});

test("GPS distance switches from meters to localized decimal kilometers", () => {
  assert.equal(formatProject200Distance(999), "999 m");
  assert.equal(formatProject200Distance(1000), "1,00 km");
  assert.equal(formatProject200Distance(1010), "1,01 km");
});

test("workout feedback keeps metrics before muscles for timed work and after muscles for series", async () => {
  const source = await readFile(new URL("../public/200/wellness.js", import.meta.url), "utf8");
  assert.match(source, /metricsBeforeMuscles:workout\?\.trackingType!=="series"/);
  assert.match(source, /if\(snapshot\.metricsBeforeMuscles\)\{await animateWorkoutMetrics\(snapshot,runId\);await animateWorkoutMuscles\(snapshot,runId\);\}else\{await animateWorkoutMuscles\(snapshot,runId\);await animateWorkoutMetrics\(snapshot,runId\);\}/);
  assert.match(source, /title:"\+ ENERGIA"/);
  assert.match(source, /title:"\+ FORÇA"/);
  assert.match(source, /title:"\+ RESISTÊNCIA"/);
});

test("GPS presentation advances one visual meter at a time", async () => {
  const source = await readFile(new URL("../public/200/wellness.js", import.meta.url), "utf8");
  assert.match(source, /state\.gpsDisplayDistanceMeters\+=1;renderGpsDistanceReadout\(\)/);
  assert.match(source, /minimumUpdateInterval:1000,interval:1000/);
});

test("GPS workout keeps distance in the circle and exposes temporary speed readouts", async () => {
  const [source, markup] = await Promise.all([
    readFile(new URL("../public/200/wellness.js", import.meta.url), "utf8"),
    readFile(new URL("../public/200/index.html", import.meta.url), "utf8")
  ]);
  assert.match(markup, /id="wellnessWorkoutCurrentSpeed"/);
  assert.match(markup, /id="wellnessWorkoutAverageSpeed"/);
  assert.match(markup, /id="wellnessWorkoutGpsValue"/);
  assert.match(source, /state\.gpsReadoutTimer=window\.setTimeout\([\s\S]*?,2000\)/);
  assert.match(source, /if\(elements\.phaseUnit\)elements\.phaseUnit\.textContent=""/);
});

test("GPS-capable exercises let the user choose time or GPS distance", async () => {
  const [source, markup] = await Promise.all([
    readFile(new URL("../public/200/wellness.js", import.meta.url), "utf8"),
    readFile(new URL("../public/200/index.html", import.meta.url), "utf8")
  ]);
  assert.match(markup, /data-goal-tracking="minutes"/);
  assert.match(markup, /data-goal-tracking="gps"/);
  assert.match(source, /\["minutes","gps"\]\.includes\(state\.goalTrackingType\)/);
  assert.match(source, /trackingType:goals\.trackingType\|\|exercise\.tracking/);
});

test("completion metric charts use an outlined ring instead of a filled pie", async () => {
  const styles = await readFile(new URL("../public/200/wellness-pack.css", import.meta.url), "utf8");
  assert.match(styles, /\.wellness-workout-metric-ring\{box-sizing:border-box;border:[^}]+background:transparent\}/);
  assert.match(styles, /\.wellness-workout-metric-ring::after\{[^}]+mask-composite:exclude/);
});
