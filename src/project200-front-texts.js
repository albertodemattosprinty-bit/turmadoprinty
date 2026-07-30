import { query } from "./db.js";

let project200FrontTextsSchemaPromise = null;

function normalizeTextKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function normalizeTextValue(value, maxLength = 4000) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

export async function ensureProject200FrontTextsSchema() {
  if (!project200FrontTextsSchemaPromise) {
    project200FrontTextsSchemaPromise = (async () => {
      await query(`
        create table if not exists project200_front_texts (
          text_key text primary key,
          page text not null default '/200',
          scope text not null default 'global',
          default_text text not null default '',
          current_text text not null default '',
          selector_hint text not null default '',
          updated_by_user_id uuid references users(id) on delete set null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
      await query("create index if not exists idx_project200_front_texts_page_scope on project200_front_texts(page, scope, updated_at desc);");
    })().catch((error) => {
      project200FrontTextsSchemaPromise = null;
      throw error;
    });
  }
  return project200FrontTextsSchemaPromise;
}

function mapFrontTextRow(row) {
  if (!row) return null;
  return {
    key: String(row.text_key || ""),
    page: String(row.page || "/200"),
    scope: String(row.scope || "global"),
    defaultText: String(row.default_text || ""),
    currentText: String(row.current_text || ""),
    selectorHint: String(row.selector_hint || ""),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function listProject200FrontTexts({ page = "/200", scope = "global" } = {}) {
  await ensureProject200FrontTextsSchema();
  const result = await query(
    `
      select text_key, page, scope, default_text, current_text, selector_hint, updated_at
        from project200_front_texts
       where page = $1 and scope = $2 and current_text <> ''
       order by updated_at desc
    `,
    [String(page || "/200").trim() || "/200", String(scope || "global").trim() || "global"]
  );
  return result.rows.map(mapFrontTextRow).filter(Boolean);
}

export async function saveProject200FrontText(adminUserId, input = {}) {
  await ensureProject200FrontTextsSchema();
  const key = normalizeTextKey(input.key);
  const currentText = normalizeTextValue(input.currentText);
  const defaultText = normalizeTextValue(input.defaultText || currentText);
  if (!key) throw new Error("Chave do texto invalida.");
  if (!currentText) throw new Error("Digite o texto global.");
  const result = await query(
    `
      insert into project200_front_texts (
        text_key, page, scope, default_text, current_text, selector_hint, updated_by_user_id, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now(), now())
      on conflict (text_key) do update set
        page = excluded.page,
        scope = excluded.scope,
        default_text = case
          when project200_front_texts.default_text = '' then excluded.default_text
          else project200_front_texts.default_text
        end,
        current_text = excluded.current_text,
        selector_hint = excluded.selector_hint,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()
      returning text_key, page, scope, default_text, current_text, selector_hint, updated_at
    `,
    [
      key,
      String(input.page || "/200").trim() || "/200",
      String(input.scope || "global").trim() || "global",
      defaultText,
      currentText,
      normalizeTextValue(input.selectorHint, 500),
      adminUserId
    ]
  );
  return mapFrontTextRow(result.rows[0]);
}
