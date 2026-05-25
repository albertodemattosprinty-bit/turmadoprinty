import { query } from "./db.js";

const DEFAULT_TEXT = "O Projeto Família é o nosso principal e mais importante projeto, ele visa bem estar, segurança em um projeto contínuo de longo prazo, todos os envolvidos se comprometem a concluir de boa vontade as propostas descritas no projeto";
const APPROVERS = ["Rose", "Alberto", "Lucas", "Thainan"];

function normalizeApprover(value) {
  const input = String(value || "").trim();
  const found = APPROVERS.find((name) => name.toLowerCase() === input.toLowerCase());
  if (!found) {
    throw new Error("Pessoa invalida para aprovacao.");
  }
  return found;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function ensureConstitutionSchema() {
  await query(`
    create table if not exists project_constitution_versions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      version_number integer not null,
      text_content text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, version_number)
    );
  `);

  await query(`
    create table if not exists project_constitution_approvals (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      version_id uuid not null references project_constitution_versions(id) on delete cascade,
      approver text not null,
      approved_at timestamptz not null default now(),
      unique (user_id, version_id, approver)
    );
  `);

  await query("create index if not exists idx_project_constitution_versions_user on project_constitution_versions(user_id, version_number);");
  await query("create index if not exists idx_project_constitution_approvals_user_version on project_constitution_approvals(user_id, version_id);");
}

async function ensureDefaultVersion(userId) {
  const existing = await query(
    "select id from project_constitution_versions where user_id = $1 limit 1",
    [userId]
  );

  if (existing.rows[0]?.id) {
    return;
  }

  await query(
    `
      insert into project_constitution_versions (user_id, version_number, text_content)
      values ($1, 1, $2)
    `,
    [userId, DEFAULT_TEXT]
  );
}

export async function listConstitutionVersions(userId) {
  await ensureConstitutionSchema();
  await ensureDefaultVersion(userId);

  const versionsResult = await query(
    `
      select id, version_number, text_content, created_at, updated_at
      from project_constitution_versions
      where user_id = $1
      order by version_number asc
    `,
    [userId]
  );

  const approvalResult = await query(
    `
      select version_id, approver, approved_at
      from project_constitution_approvals
      where user_id = $1
    `,
    [userId]
  );

  const approvalsByVersion = new Map();
  for (const row of approvalResult.rows) {
    const key = String(row.version_id);
    const current = approvalsByVersion.get(key) || {};
    current[row.approver] = toIso(row.approved_at);
    approvalsByVersion.set(key, current);
  }

  return versionsResult.rows.map((row) => ({
    id: row.id,
    versionNumber: Number(row.version_number || 0),
    label: `Versão ${Number(row.version_number || 0)}`,
    text: row.text_content || "",
    approvals: approvalsByVersion.get(String(row.id)) || {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  }));
}

export async function createConstitutionVersion(userId, text) {
  await ensureConstitutionSchema();
  await ensureDefaultVersion(userId);

  const nextResult = await query(
    `
      select coalesce(max(version_number), 0)::int + 1 as next_version
      from project_constitution_versions
      where user_id = $1
    `,
    [userId]
  );

  const nextVersion = Number(nextResult.rows[0]?.next_version || 1);
  const finalText = String(text || "").trim();

  if (finalText.length < 10) {
    throw new Error("Texto da constituicao muito curto.");
  }

  const insertResult = await query(
    `
      insert into project_constitution_versions (user_id, version_number, text_content)
      values ($1, $2, $3)
      returning id
    `,
    [userId, nextVersion, finalText]
  );

  return insertResult.rows[0]?.id || null;
}

export async function approveConstitutionVersion(userId, versionId, approverRaw) {
  await ensureConstitutionSchema();
  const approver = normalizeApprover(approverRaw);
  const trimmedVersionId = String(versionId || "").trim();

  if (!trimmedVersionId) {
    throw new Error("Versao invalida.");
  }

  const versionResult = await query(
    `
      select id
      from project_constitution_versions
      where user_id = $1
        and id = $2
      limit 1
    `,
    [userId, trimmedVersionId]
  );

  if (!versionResult.rows[0]?.id) {
    throw new Error("Versao nao encontrada.");
  }

  await query(
    `
      insert into project_constitution_approvals (user_id, version_id, approver)
      values ($1, $2, $3)
      on conflict (user_id, version_id, approver) do update
        set approved_at = now()
    `,
    [userId, trimmedVersionId, approver]
  );
}
