export const PROJECT200_MUSCLE_POINTS_AT_100 = 9.6;
export const PROJECT200_MUSCLE_DECAY_MINUTES = 25;
export const PROJECT200_MUSCLE_POINTS_PER_PERCENT = PROJECT200_MUSCLE_POINTS_AT_100 / 100;

const COLOR_ANCHORS = Object.freeze([
  [0, [148, 163, 184]],
  [10, [255, 255, 255]],
  [30, [34, 197, 94]],
  [40, [250, 204, 21]],
  [80, [249, 115, 22]],
  [100, [239, 68, 68]],
  [110, [249, 115, 22]],
  [140, [239, 68, 68]]
]);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function interpolateAnchors(value, anchors, interpolate) {
  if (value <= anchors[0][0]) return anchors[0][1];
  for (let index = 1; index < anchors.length; index += 1) {
    const [rightPoint, rightValue] = anchors[index];
    if (value > rightPoint) continue;
    const [leftPoint, leftValue] = anchors[index - 1];
    const ratio = (value - leftPoint) / Math.max(.0001, rightPoint - leftPoint);
    return interpolate(leftValue, rightValue, ratio);
  }
  return anchors.at(-1)[1];
}

function round(value, digits = 4) {
  const multiplier = 10 ** digits;
  return Math.round((Number(value) || 0) * multiplier) / multiplier;
}

export function calculateProject200ExerciseMuscleGains(series, muscles) {
  const basePoints = (Array.isArray(series) ? series : []).reduce((total, item) => {
    const repetitions = Math.max(0, Number(item?.repetitions ?? item?.reps ?? item) || 0);
    return total + (repetitions / 12);
  }, 0);
  if (!basePoints) return [];
  return (Array.isArray(muscles) ? muscles : []).flatMap((muscle) => {
    const muscleId = String(muscle?.muscleId || "").trim();
    const numericLoad = Number(muscle?.load);
    if (!muscleId || !Number.isFinite(numericLoad) || numericLoad < .25) return [];
    return [{ muscleId, points: round(basePoints * clamp(numericLoad, .25, 1)) }];
  });
}

export function project200DecayedMusclePoints(points, elapsedMinutes) {
  const elapsedSteps = Math.floor(Math.max(0, Number(elapsedMinutes) || 0) / PROJECT200_MUSCLE_DECAY_MINUTES);
  return round(Math.max(0, (Number(points) || 0) - (elapsedSteps * PROJECT200_MUSCLE_POINTS_PER_PERCENT)));
}

export function project200MuscleProgressPercent(points) {
  return round(Math.max(0, Number(points) || 0) / PROJECT200_MUSCLE_POINTS_AT_100 * 100, 2);
}

export function project200MuscleProgressStage(percent) {
  const value = Math.max(0, Number(percent) || 0);
  if (value >= 110) return "Sobrecarga";
  if (value >= 100) return "Hipertrofia forte";
  if (value >= 80) return "Hipertrofia";
  if (value >= 50) return "Manutenção";
  if (value >= 40) return "Adaptação";
  if (value > 10) return "Saúde";
  return "Irrelevante";
}

export function project200MuscleProgressColor(percent) {
  const rgb = interpolateAnchors(clamp(percent, 0, 140), COLOR_ANCHORS, (left, right, ratio) =>
    left.map((channel, index) => Math.round(channel + ((right[index] - channel) * ratio))));
  return `rgb(${rgb.join(" ")})`;
}

export function project200CurrentMuscleProgress(entry, nowMs = Date.now()) {
  const measuredAt = new Date(entry?.measuredAt || nowMs).getTime();
  const elapsedMinutes = Number.isFinite(measuredAt) ? Math.max(0, nowMs - measuredAt) / 60000 : 0;
  const points = project200DecayedMusclePoints(entry?.points, elapsedMinutes);
  const percent = project200MuscleProgressPercent(points);
  return {
    muscleId: String(entry?.muscleId || ""),
    points,
    percent,
    stage: project200MuscleProgressStage(percent),
    color: project200MuscleProgressColor(percent)
  };
}
