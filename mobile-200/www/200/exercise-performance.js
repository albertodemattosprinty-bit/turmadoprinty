const METRIC_LIMITS = Object.freeze({
  energyPerMinute: [1, 5],
  strengthPerMinute: [.5, 5],
  resistancePerMinute: [.5, 5]
});

const CARDIO_METRICS = Object.freeze({
  walk: [1, .5, 1.2],
  "run-light": [2.5, 1, 3],
  run: [3.5, 1.3, 4.1],
  "run-heavy": [5, 1.8, 5],
  "bike-light": [1.8, .7, 2.3],
  bike: [3, 1.1, 3.6],
  "bike-heavy": [4.5, 1.5, 4.8],
  treadmill: [3, 1.1, 3.5],
  elliptical: [3, 1.2, 3.8],
  rowing: [4, 2.2, 4.4],
  stair: [4.2, 2, 4.3],
  rope: [4.4, 1.5, 4.6],
  swim: [3.8, 1.8, 4.4],
  dance: [2.8, .8, 3.4],
  hike: [3.2, 1.2, 3.8],
  "jumping-jack": [3.5, 1, 3.8],
  "mountain-climber": [4.5, 2.2, 4.5],
  burpee: [5, 2.6, 4.8],
  "high-knees": [4.5, 1.4, 4.6],
  "shadow-boxing": [3.4, 1.1, 4],
  skating: [3.4, 1.3, 4],
  "water-aerobics": [2.4, 1, 3.2],
  spinning: [4.2, 1.5, 4.7],
  "battle-rope": [5, 2.8, 4.6]
});

const CARDIO_MUSCLES = Object.freeze({
  walk: [["reto-femoral", .4], ["posterior-coxa", .35], ["panturrilha", .45]],
  "run-light": [["reto-femoral", .55], ["posterior-coxa", .5], ["panturrilha", .6]],
  run: [["reto-femoral", .7], ["posterior-coxa", .65], ["panturrilha", .75]],
  "run-heavy": [["reto-femoral", .9], ["posterior-coxa", .85], ["panturrilha", 1]],
  "bike-light": [["reto-femoral", .5], ["gluteo-maximo", .35], ["panturrilha", .45]],
  bike: [["reto-femoral", .7], ["gluteo-maximo", .5], ["panturrilha", .65]],
  "bike-heavy": [["reto-femoral", .9], ["gluteo-maximo", .65], ["panturrilha", .85]]
});

function clamp(value, minimum, maximum) {
  const numeric = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(numeric) ? numeric : minimum));
}

function roundedRate(value, minimum, maximum) {
  return Math.round(clamp(value, minimum, maximum) * 20) / 20;
}

function roundedPoints(value) {
  return Math.round(Math.max(0, Number(value) || 0) * 100) / 100;
}

export function project200SeriesWorkSeconds(repetitions) {
  const reps = Math.max(1, Math.trunc(Number(repetitions) || 1));
  if (reps <= 5) return 30;
  if (reps <= 7) return 36;
  if (reps <= 9) return 40;
  if (reps <= 12) return 60;
  if (reps <= 15) return 75;
  if (reps <= 18) return 90;
  return Math.min(600, Math.max(90, reps * 5));
}

export function defaultProject200ExerciseMetrics(exercise = {}) {
  const id = String(exercise.exerciseId ?? exercise.id ?? "").trim();
  const category = String(exercise.category || "strength");
  const difficulty = Math.max(1, Math.min(5, Number(exercise.difficulty) || 3));
  const exact = CARDIO_METRICS[id];
  if (exact) return { energyPerMinute: exact[0], strengthPerMinute: exact[1], resistancePerMinute: exact[2] };

  if (category === "aerobic") {
    return {
      energyPerMinute: roundedRate(1.3 + (difficulty * .65), 1, 5),
      strengthPerMinute: roundedRate(.5 + (difficulty * .22), .5, 5),
      resistancePerMinute: roundedRate(1.1 + (difficulty * .72), .5, 5)
    };
  }

  const heavyCompound = /(deadlift|squat|leg-press|hack-squat|smith-squat|pull-up|bench-press|barbell-row|pistol|pseudo-planche)/.test(id);
  const demandingBodyweight = /(burpee|jump|archer|pike|hindu|plank-up-down|bear-crawl|mountain)/.test(id);
  const isolation = /(curl|raise|extension|leg-curl|adductor|abductor|calf|shrug|triceps-pushdown)/.test(id);
  if (heavyCompound) return { energyPerMinute: 4.7, strengthPerMinute: 5, resistancePerMinute: 2.5 };
  if (demandingBodyweight) return { energyPerMinute: 4.2, strengthPerMinute: 3.8, resistancePerMinute: 3.6 };
  if (isolation) return { energyPerMinute: 2.5, strengthPerMinute: 4, resistancePerMinute: 1.8 };
  if (category === "calisthenics") return { energyPerMinute: 3.4, strengthPerMinute: 3.2, resistancePerMinute: 3 };
  return { energyPerMinute: 3.2, strengthPerMinute: 4.2, resistancePerMinute: 2.2 };
}

export function normalizeProject200ExerciseMetrics(payload = {}, fallbackExercise = payload) {
  const fallback = defaultProject200ExerciseMetrics(fallbackExercise);
  return Object.fromEntries(Object.entries(METRIC_LIMITS).map(([key, [minimum, maximum]]) => {
    const supplied = payload?.[key] ?? payload?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
    return [key, roundedRate(supplied === null || supplied === undefined || supplied === "" ? fallback[key] : supplied, minimum, maximum)];
  }));
}

export function defaultProject200ExerciseMuscleLoads(exercise = {}) {
  const id = String(exercise.exerciseId ?? exercise.id ?? "").trim();
  return (CARDIO_MUSCLES[id] || []).map(([muscleId, load]) => ({ muscleId, load }));
}

export function project200ExerciseDurationMinutes(workout = {}) {
  const trackingType = String(workout.trackingType ?? workout.tracking_type ?? "minutes");
  if (trackingType !== "series") return roundedPoints(workout.durationMinutes ?? workout.duration_minutes);
  const series = Array.isArray(workout.series) ? workout.series : [];
  if (series.length) return roundedPoints(series.reduce((total, item) => total + project200SeriesWorkSeconds(item?.repetitions ?? item?.reps) / 60, 0));
  const totalReps = Math.max(0, Number(workout.totalReps ?? workout.total_reps) || 0);
  return totalReps ? roundedPoints(project200SeriesWorkSeconds(totalReps) / 60) : 0;
}

export function calculateProject200ExerciseMetricGains(workout = {}, metrics = {}) {
  const durationMinutes = project200ExerciseDurationMinutes(workout);
  const rates = normalizeProject200ExerciseMetrics(metrics, { ...workout, ...metrics });
  return {
    durationMinutes,
    energy: roundedPoints(durationMinutes * rates.energyPerMinute),
    strength: roundedPoints(durationMinutes * rates.strengthPerMinute),
    resistance: roundedPoints(durationMinutes * rates.resistancePerMinute)
  };
}

export function project200MetricColor(metric, value) {
  const points = Math.max(0, Number(value) || 0);
  if (metric === "resistance") {
    if (points <= 20) return "#22c55e";
    if (points <= 40) return "#2563eb";
    if (points <= 60) return "#1e3a8a";
    return "#7e22ce";
  }
  if (points <= 20) return "#22c55e";
  if (points <= 40) return "#facc15";
  if (points <= 60) return "#f97316";
  return "#ef4444";
}

export function formatProject200Distance(meters) {
  const value = Math.max(0, Number(meters) || 0);
  return value < 1000
    ? `${Math.round(value).toLocaleString("pt-BR")} m`
    : `${(value / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}
