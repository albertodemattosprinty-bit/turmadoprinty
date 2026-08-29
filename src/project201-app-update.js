import { query } from "./db.js";

const CONFIG_KEY = "project200_android_update";
const REQUIRED_MINIMUM_VERSION = "1.03";

export const PROJECT201_DEFAULT_UPDATE_CONFIG = {
  currentVersion: "1.03",
  minimumVersion: "0.71",
  downloadUrl: "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/project200/app/latest/iLife-Mindset-debug.apk",
  title: "Atualizacao do iLife disponivel",
  message: "Para continuar usando o iLife MindsetPlan com seguranca, baixe a versao mais recente do aplicativo.",
  buttonLabel: "Baixar APK atualizado"
};

function normalizeVersion(value, fallback) {
  const normalized = String(value || "").trim().replace(",", ".");
  return /^\d+(?:\.\d+){0,3}$/.test(normalized) ? normalized : fallback;
}

function compareVersions(left, right) {
  const a = String(left || "").split(".").map((item) => Number(item) || 0), b = String(right || "").split(".").map((item) => Number(item) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) { if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0); }
  return 0;
}

function normalizeUrl(value, fallback) {
  const normalized = String(value || "").trim();
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalizeText(value, fallback, maxLength) {
  const normalized = String(value || "").trim();
  return (normalized || fallback).slice(0, maxLength);
}

export function normalizeProject201UpdateConfig(input = {}) {
  const minimumVersion = normalizeVersion(input.minimumVersion, PROJECT201_DEFAULT_UPDATE_CONFIG.minimumVersion);
  const currentVersion = normalizeVersion(input.currentVersion, PROJECT201_DEFAULT_UPDATE_CONFIG.currentVersion);
  const enforcedMinimumVersion = compareVersions(minimumVersion, REQUIRED_MINIMUM_VERSION) < 0 ? REQUIRED_MINIMUM_VERSION : minimumVersion;
  const enforcedCurrentVersion = compareVersions(currentVersion, enforcedMinimumVersion) < 0 ? enforcedMinimumVersion : currentVersion;
  return {
    currentVersion: enforcedCurrentVersion,
    minimumVersion: enforcedMinimumVersion,
    downloadUrl: normalizeUrl(input.downloadUrl, PROJECT201_DEFAULT_UPDATE_CONFIG.downloadUrl),
    title: normalizeText(input.title, PROJECT201_DEFAULT_UPDATE_CONFIG.title, 90),
    message: normalizeText(input.message, PROJECT201_DEFAULT_UPDATE_CONFIG.message, 700),
    buttonLabel: normalizeText(input.buttonLabel, PROJECT201_DEFAULT_UPDATE_CONFIG.buttonLabel, 80)
  };
}

export async function ensureProject201AppUpdateSchema() {
  await query(`
    create table if not exists project201_app_update_config (
      key text primary key,
      config jsonb not null default '{}'::jsonb,
      updated_by_user_id uuid references users(id) on delete set null,
      updated_at timestamptz not null default now()
    )
  `);
}

export async function getProject201AppUpdateConfig() {
  await ensureProject201AppUpdateSchema();
  const result = await query(
    `select config, updated_at from project201_app_update_config where key = $1 limit 1`,
    [CONFIG_KEY]
  );
  const stored = result.rows[0]?.config || {};
  return {
    ...normalizeProject201UpdateConfig(stored),
    updatedAt: result.rows[0]?.updated_at || null
  };
}

export async function saveProject201AppUpdateConfig(userId, input = {}) {
  await ensureProject201AppUpdateSchema();
  const current = await getProject201AppUpdateConfig();
  const next = normalizeProject201UpdateConfig({ ...current, ...input });
  const result = await query(
    `
      insert into project201_app_update_config (key, config, updated_by_user_id, updated_at)
      values ($1, $2::jsonb, $3, now())
      on conflict (key) do update set
        config = excluded.config,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()
      returning config, updated_at
    `,
    [CONFIG_KEY, JSON.stringify(next), userId || null]
  );
  return {
    ...normalizeProject201UpdateConfig(result.rows[0]?.config || next),
    updatedAt: result.rows[0]?.updated_at || null
  };
}
