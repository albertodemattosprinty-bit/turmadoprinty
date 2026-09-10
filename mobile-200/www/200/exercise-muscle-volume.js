const VOLUME_PERCENT_ANCHORS = Object.freeze([
  [0, 0],
  [1, 10],
  [2, 30],
  [3, 40],
  [4, 50],
  [6, 60],
  [10, 80],
  [14, 100],
  [18, 110],
  [30, 140]
]);

const COLOR_ANCHORS = Object.freeze([
  [0, [226, 232, 240]],
  [10, [255, 255, 255]],
  [30, [34, 197, 94]],
  [40, [250, 204, 21]],
  [80, [249, 115, 22]],
  [100, [239, 68, 68]],
  [110, [168, 85, 247]],
  [140, [126, 34, 206]]
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

export function project200RepetitionFactor(repetitions) {
  const reps = Math.max(0, Number(repetitions) || 0);
  if (!reps) return 0;
  return clamp(reps / 8, .25, 1);
}

export function project200WeeklyOccurrences(scheduleConfig) {
  if (scheduleConfig?.frequency === "none") return 0;
  const weekdays = [...new Set((Array.isArray(scheduleConfig?.weekDays) ? scheduleConfig.weekDays : [])
    .map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  return weekdays.length || 7;
}

export function project200MuscleVolumePercent(effectiveSets) {
  return Math.round(interpolateAnchors(Math.max(0, Number(effectiveSets) || 0), VOLUME_PERCENT_ANCHORS,
    (left, right, ratio) => left + ((right - left) * ratio)));
}

export function project200MuscleVolumeStage(percent) {
  const value = Math.max(0, Number(percent) || 0);
  if (value >= 110) return "Sobrecarga";
  if (value >= 100) return "Hipertrofia forte";
  if (value >= 80) return "Hipertrofia";
  if (value >= 50) return "Manutenção";
  if (value >= 40) return "Adaptação";
  if (value > 10) return "Saúde";
  return "Irrelevante";
}

export function project200MuscleVolumeColor(percent) {
  const rgb = interpolateAnchors(clamp(percent, 0, 140), COLOR_ANCHORS, (left, right, ratio) =>
    left.map((channel, index) => Math.round(channel + ((right[index] - channel) * ratio))));
  return `rgb(${rgb.join(" ")})`;
}

export function calculateProject200WeeklyMuscleVolume(exercises) {
  const totals = new Map();
  for (const exercise of Array.isArray(exercises) ? exercises : []) {
    if (String(exercise?.trackingType || exercise?.tracking || "") !== "series") continue;
    const series = Math.max(0, Number(exercise?.targetSeries) || 0);
    const occurrences = project200WeeklyOccurrences(exercise?.scheduleConfig);
    const repetitionFactor = project200RepetitionFactor(exercise?.targetReps);
    if (!series || !occurrences || !repetitionFactor) continue;
    for (const muscle of Array.isArray(exercise?.muscles) ? exercise.muscles : []) {
      const muscleId = String(muscle?.muscleId || "");
      const numericLoad = Number(muscle?.load);
      if (!muscleId || !Number.isFinite(numericLoad) || numericLoad < .25) continue;
      const load = clamp(numericLoad, .25, 1);
      totals.set(muscleId, (totals.get(muscleId) || 0) + (series * occurrences * repetitionFactor * load));
    }
  }
  return [...totals.entries()].map(([muscleId, effectiveSets]) => {
    const roundedSets = Math.round(effectiveSets * 100) / 100;
    const percent = project200MuscleVolumePercent(roundedSets);
    return { muscleId, effectiveSets: roundedSets, percent, stage: project200MuscleVolumeStage(percent), color: project200MuscleVolumeColor(percent) };
  }).sort((left, right) => right.effectiveSets - left.effectiveSets);
}
