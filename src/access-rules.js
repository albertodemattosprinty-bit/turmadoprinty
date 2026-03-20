function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPlusPlaybackAlbumName(albumName) {
  const normalized = normalizeText(albumName);

  if (!normalized) {
    return false;
  }

  if (/^datas comemorativas [1-8]$/.test(normalized)) {
    return true;
  }

  if (/^louvores da garotada [1-8]$/.test(normalized)) {
    return true;
  }

  if (normalized.startsWith("coletanea")) {
    return true;
  }

  return [
    "favoritas",
    "favoritas 1",
    "favoritas 2",
    "ebd",
    "zero a seis anos"
  ].includes(normalized);
}

export function hasFullCatalogAccess(planId) {
  return ["pro", "life"].includes(normalizeText(planId));
}

export function canStreamTrackForPlan(planId, { albumName, trackType }) {
  const normalizedPlanId = normalizeText(planId);
  const normalizedTrackType = normalizeText(trackType) === "playback" ? "playback" : "full";

  if (hasFullCatalogAccess(normalizedPlanId)) {
    return true;
  }

  if (normalizedTrackType !== "playback") {
    return true;
  }

  if (normalizedPlanId === "plus") {
    return isPlusPlaybackAlbumName(albumName);
  }

  return false;
}

export function canDownloadTrackForPlan(planId, { albumName, trackType }) {
  const normalizedPlanId = normalizeText(planId);
  const normalizedTrackType = normalizeText(trackType) === "playback" ? "playback" : "full";

  if (hasFullCatalogAccess(normalizedPlanId)) {
    return true;
  }

  if (normalizedPlanId !== "plus") {
    return false;
  }

  if (normalizedTrackType !== "playback") {
    return true;
  }

  return isPlusPlaybackAlbumName(albumName);
}

export function getCatalogAccessSummary(planId) {
  return {
    planId: normalizeText(planId) || "gratis",
    hasFullCatalogAccess: hasFullCatalogAccess(planId)
  };
}
