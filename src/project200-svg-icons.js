import fs from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve(process.cwd(), "public/200/svg-hub-manifest.json");

let manifestCache = null;
let manifestCacheMtimeMs = 0;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTerms(value) {
  return normalizeText(value).split(" ").filter((item) => item.length >= 2);
}

function scoreAssetAgainstText(asset, text) {
  const haystack = [
    asset?.label || "",
    ...(Array.isArray(asset?.keywords) ? asset.keywords : [])
  ].join(" ");
  const normalizedHaystack = normalizeText(haystack);
  const terms = splitTerms(text);
  if (!terms.length) {
    return 0;
  }
  let score = 0;
  terms.forEach((term) => {
    if (normalizedHaystack === term) {
      score += 10;
      return;
    }
    if (normalizedHaystack.includes(` ${term} `) || normalizedHaystack.startsWith(`${term} `) || normalizedHaystack.endsWith(` ${term}`)) {
      score += 6;
      return;
    }
    if (normalizedHaystack.includes(term)) {
      score += 3;
    }
  });
  return score;
}

export async function loadProject200SvgManifest() {
  const stats = await fs.stat(manifestPath);
  if (manifestCache && manifestCacheMtimeMs === stats.mtimeMs) {
    return manifestCache;
  }
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw);
  manifestCache = {
    assetPrefix: String(parsed?.assetPrefix || "project200/svg-hub").trim() || "project200/svg-hub",
    assets: Array.isArray(parsed?.assets) ? parsed.assets : []
  };
  manifestCacheMtimeMs = stats.mtimeMs;
  return manifestCache;
}

export async function findProject200SvgCandidates(text, limit = 24) {
  const manifest = await loadProject200SvgManifest();
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const scored = assets
    .map((asset) => ({
      ...asset,
      score: scoreAssetAgainstText(asset, text)
    }))
    .filter((asset) => asset.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return String(left.label || "").localeCompare(String(right.label || ""), "pt-BR");
    });

  const fallback = scored.length ? scored : assets.slice(0, Math.max(1, limit));
  return fallback.slice(0, Math.max(1, limit));
}

export function buildProject200SvgSearchPrompt(candidates = []) {
  return candidates.map((asset, index) => {
    const keywords = Array.isArray(asset?.keywords) ? asset.keywords.join(", ") : "";
    return `${index + 1}. id=${asset.id}; label=${asset.label}; keywords=${keywords}`;
  }).join("\n");
}

export function findProject200SvgById(assets = [], assetId = "") {
  const normalizedId = String(assetId || "").trim().toLowerCase();
  return (Array.isArray(assets) ? assets : []).find((asset) => String(asset?.id || "").trim().toLowerCase() === normalizedId) || null;
}
