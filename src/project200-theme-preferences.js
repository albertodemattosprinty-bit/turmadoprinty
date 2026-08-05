import { query } from "./db.js";

const ALLOWED_THEMES = new Set(["black", "white", "sky"]);

export function normalizeProject200Theme(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "modern") return "black";
  if (normalized === "edge" || normalized === "light") return "sky";
  return ALLOWED_THEMES.has(normalized) ? normalized : "sky";
}

export async function ensureProject200ThemePreferencesSchema() {
  await query(`
    create table if not exists project200_theme_preferences (
      user_id uuid primary key references users(id) on delete cascade,
      theme text not null default 'sky',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

export async function getProject200ThemePreference(userId) {
  await ensureProject200ThemePreferencesSchema();
  const result = await query(
    `select theme from project200_theme_preferences where user_id = $1`,
    [userId]
  );
  return normalizeProject200Theme(result.rows[0]?.theme || "sky");
}

export async function saveProject200ThemePreference(userId, theme) {
  await ensureProject200ThemePreferencesSchema();
  const normalized = normalizeProject200Theme(theme);
  const result = await query(
    `
      insert into project200_theme_preferences (user_id, theme, created_at, updated_at)
      values ($1, $2, now(), now())
      on conflict (user_id) do update
        set theme = excluded.theme,
            updated_at = now()
      returning theme
    `,
    [userId, normalized]
  );
  return normalizeProject200Theme(result.rows[0]?.theme || normalized);
}
