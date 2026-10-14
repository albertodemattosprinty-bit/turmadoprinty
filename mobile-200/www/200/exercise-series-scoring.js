import { project200SeriesWorkSeconds } from "./exercise-performance.js";

export function normalizeExerciseRir(value) {
  if (value === null || value === undefined || value === "") return null;
  const rir = Number(value);
  if (!Number.isInteger(rir) || rir < 0 || rir > 100) throw new Error("RIR deve ser um número inteiro entre 0 e 100.");
  return rir;
}

export function mechanicalStrengthPoints(value) {
  const rir = normalizeExerciseRir(value);
  return rir === 0 ? 3 : rir === 1 ? 1 : 0;
}

export function muscleGainMinutesForWorkout(workout = {}) {
  if (String(workout.trackingType ?? workout.tracking_type) !== "series") return Math.max(0, Number(workout.durationMinutes ?? workout.duration_minutes) || 0);
  const series = Array.isArray(workout.series) ? workout.series : [];
  if (!series.length) return Math.max(0, Number(workout.durationMinutes ?? workout.duration_minutes) || 0);
  return series.reduce((sum, item) => {
    const reps = Math.max(0, Number(item.repetitions ?? item.reps) || 0);
    return sum + (reps > 0 ? project200SeriesWorkSeconds(reps) / 60 * (reps < 6 ? .75 : 1) : 0);
  }, 0);
}

export function workoutRestSeconds(workout = {}, nowMs = Date.now()) {
  const startedAt = new Date(workout.restStartedAt || "").getTime();
  const elapsed = Number.isFinite(startedAt) ? Math.max(0, Math.floor((nowMs - startedAt) / 1000)) : 0;
  return Math.max(0, Math.trunc(Number(workout.restSeconds || 0))) + elapsed;
}
