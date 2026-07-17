export const MINUTE_CUE_MAX_MINUTES = 6 * 60;
export const MINUTE_CUE_PRELOAD_SECONDS = 6;
export const MINUTE_CUE_INTERVALS = [0, 1, 3, 5, 10];
export const MINUTE_CUE_FINAL_MINUTES = [5, 3, 1];
export const MINUTE_CUE_R2_BASE_URL = "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/project200/audio/pt-BR/minutos-restantes/v1";

export function normalizeMinuteCueInterval(value) {
  const numeric = Math.trunc(Number(value || 0));
  return MINUTE_CUE_INTERVALS.includes(numeric) ? numeric : 0;
}

export function getMinuteCueIntervalLabel(value) {
  const interval = normalizeMinuteCueInterval(value);
  if (!interval) return "Desativada";
  return `De ${interval} em ${interval} ${interval === 1 ? "minuto" : "minutos"}`;
}

export function getMinuteCueFileUrl(totalMinutes) {
  const minutes = Math.trunc(Number(totalMinutes || 0));
  if (minutes < 1 || minutes > MINUTE_CUE_MAX_MINUTES) return "";
  return `${MINUTE_CUE_R2_BASE_URL}/${String(minutes).padStart(3, "0")}-minutos.mp3`;
}

export function hasExactMinuteCue(totalMinutes) {
  const minutes = Math.trunc(Number(totalMinutes || 0));
  if (minutes < 1 || minutes > MINUTE_CUE_MAX_MINUTES) return false;
  return minutes <= 60 || minutes % 5 === 0;
}

export function buildMinuteCueUrls(totalMinutes) {
  const minutes = Math.trunc(Number(totalMinutes || 0));
  if (minutes < 1 || minutes > MINUTE_CUE_MAX_MINUTES) return [];
  if (hasExactMinuteCue(minutes)) return [getMinuteCueFileUrl(minutes)];

  const hourMinutes = Math.floor(minutes / 60) * 60;
  const remainingMinutes = minutes % 60;
  return [getMinuteCueFileUrl(hourMinutes), getMinuteCueFileUrl(remainingMinutes)].filter(Boolean);
}

export function shouldAnnounceMinute(totalMinutes, intervalValue, finalMinutesEnabled) {
  const minutes = Math.trunc(Number(totalMinutes || 0));
  if (minutes < 1 || minutes > MINUTE_CUE_MAX_MINUTES) return false;
  const interval = normalizeMinuteCueInterval(intervalValue);
  const isIntervalCue = interval > 0 && minutes % interval === 0;
  const isFinalCue = Boolean(finalMinutesEnabled) && MINUTE_CUE_FINAL_MINUTES.includes(minutes);
  return isIntervalCue || isFinalCue;
}

export function buildMinuteCueSchedule(remainingSeconds, intervalValue, finalMinutesEnabled) {
  const safeRemainingSeconds = Math.max(0, Math.ceil(Number(remainingSeconds || 0)));
  const highestMinute = Math.min(MINUTE_CUE_MAX_MINUTES, Math.floor(safeRemainingSeconds / 60));
  const schedule = [];
  for (let minute = highestMinute; minute >= 1; minute -= 1) {
    if (!shouldAnnounceMinute(minute, intervalValue, finalMinutesEnabled)) continue;
    schedule.push({
      minute,
      remainingSeconds: minute * 60,
      urls: buildMinuteCueUrls(minute)
    });
  }
  return schedule;
}
