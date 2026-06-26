import crypto from "node:crypto";

import { db, query } from "./db.js";

export const PROJECT200_DEFAULT_PROFILE_NAME = "Usuario";
export const PROJECT200_DEFAULT_PROFILE_AVATAR = "default-user";

const LEGACY_SEED_PROFILES = [
  { name: PROJECT200_DEFAULT_PROFILE_NAME, avatarPreset: PROJECT200_DEFAULT_PROFILE_AVATAR, isImmutable: true, isSystem: true, sortOrder: 0 },
];
const LEGACY_REMOVED_PROFILE_KEYS = ["geral", "rose", "alberto", "lucas", "thainan"];

function normalizeProfileName(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeStoredProject200ProfileName(value) {
  const input = normalizeProfileName(value);
  if (!input) {
    return PROJECT200_DEFAULT_PROFILE_NAME;
  }
  if (input.localeCompare("Geral", "pt-BR", { sensitivity: "accent" }) === 0) {
    return PROJECT200_DEFAULT_PROFILE_NAME;
  }
  return input;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeProfileRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatarPreset: row.avatar_preset || PROJECT200_DEFAULT_PROFILE_AVATAR,
    avatarDataUrl: String(row.avatar_data_url || "").trim(),
    isImmutable: Boolean(row.is_immutable),
    isSystem: Boolean(row.is_system),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

async function migrateLegacyGeneralToUsuario(client, userId) {
  await client.query(
    `update actions set assignee = $2 where user_id = $1 and lower(trim(coalesce(assignee, ''))) = any($3::text[])`,
    [userId, PROJECT200_DEFAULT_PROFILE_NAME, LEGACY_REMOVED_PROFILE_KEYS]
  );
  await client.query(
    `update project_200_history_entries set assignee = $2 where user_id = $1 and lower(trim(coalesce(assignee, ''))) = any($3::text[])`,
    [userId, PROJECT200_DEFAULT_PROFILE_NAME, LEGACY_REMOVED_PROFILE_KEYS]
  );
  await client.query(
    `update project_200_history_entries set speaker = $2 where user_id = $1 and lower(trim(coalesce(speaker, ''))) = any($3::text[])`,
    [userId, PROJECT200_DEFAULT_PROFILE_NAME, LEGACY_REMOVED_PROFILE_KEYS]
  );
  await client.query(
    `update project200_profile_links set assigned_profile = $2, updated_at = now() where user_id = $1 and lower(trim(coalesce(assigned_profile, ''))) = any($3::text[])`,
    [userId, PROJECT200_DEFAULT_PROFILE_NAME, LEGACY_REMOVED_PROFILE_KEYS]
  );
  await client.query(
    `
      update project200_profiles
      set deleted_at = now(),
          updated_at = now()
      where user_id = $1
        and deleted_at is null
        and lower(trim(coalesce(name, ''))) = any($2::text[])
    `,
    [userId, LEGACY_REMOVED_PROFILE_KEYS.filter((name) => name !== "geral")]
  );
}

async function seedDefaultProfiles(client, userId) {
  const existingResult = await client.query(
    `
      select lower(name) as normalized_name
      from project200_profiles
      where user_id = $1
        and deleted_at is null
    `,
    [userId]
  );
  const existingNames = new Set(existingResult.rows.map((row) => String(row.normalized_name || "").trim()).filter(Boolean));

  for (const profile of LEGACY_SEED_PROFILES) {
    const normalized = profile.name.toLocaleLowerCase("pt-BR");
    if (existingNames.has(normalized)) {
      continue;
    }
    await client.query(
      `
        insert into project200_profiles (
          id, user_id, name, avatar_preset, is_immutable, is_system, sort_order
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        crypto.randomUUID(),
        userId,
        profile.name,
        profile.avatarPreset,
        profile.isImmutable,
        profile.isSystem,
        profile.sortOrder
      ]
    );
  }

  await migrateLegacyGeneralToUsuario(client, userId);
}

async function getProfileByIdWithClient(client, userId, profileId) {
  const result = await client.query(
    `
      select *
      from project200_profiles
      where user_id = $1
        and id = $2
        and deleted_at is null
      limit 1
    `,
    [userId, String(profileId || "").trim()]
  );
  return result.rows[0] ? normalizeProfileRow(result.rows[0]) : null;
}

async function getProfileByNameWithClient(client, userId, profileName) {
  const normalizedName = normalizeStoredProject200ProfileName(profileName);
  const result = await client.query(
    `
      select *
      from project200_profiles
      where user_id = $1
        and deleted_at is null
        and lower(name) = lower($2)
      order by sort_order asc, created_at asc
      limit 1
    `,
    [userId, normalizedName]
  );
  return result.rows[0] ? normalizeProfileRow(result.rows[0]) : null;
}

export async function ensureProject200ProfilesSchema() {
  await query(`
    create table if not exists project200_profiles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      name text not null,
      avatar_preset text not null default 'default-user',
      avatar_data_url text not null default '',
      is_immutable boolean not null default false,
      is_system boolean not null default false,
      sort_order integer not null default 100,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz
    );
  `);
  await query("alter table project200_profiles add column if not exists avatar_data_url text not null default '';");
  await query("create unique index if not exists idx_project200_profiles_unique_name on project200_profiles (user_id, lower(name)) where deleted_at is null;");
  await query("create index if not exists idx_project200_profiles_user_sort on project200_profiles (user_id, sort_order, created_at);");
}

export async function listProject200Profiles(userId) {
  await ensureProject200ProfilesSchema();
  const client = await db.connect();
  try {
    await client.query("begin");
    await seedDefaultProfiles(client, userId);
    const result = await client.query(
      `
        select *
        from project200_profiles
        where user_id = $1
          and deleted_at is null
        order by sort_order asc, created_at asc
      `,
      [userId]
    );
    await client.query("commit");
    return result.rows.map(normalizeProfileRow);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listGlobalProject200Profiles() {
  await ensureProject200ProfilesSchema();
  const result = await query(
    `
      with ranked_profiles as (
        select
          *,
          row_number() over (
            partition by lower(trim(coalesce(name, '')))
            order by
              case when nullif(trim(coalesce(avatar_data_url, '')), '') is not null then 0 else 1 end,
              updated_at desc,
              created_at desc
          ) as profile_rank
        from project200_profiles
        where deleted_at is null
      )
      select *
      from ranked_profiles
      where profile_rank = 1
      order by lower(name), created_at asc
    `
  );
  return result.rows.map(normalizeProfileRow);
}

export async function listProject200ProfileNames(userId) {
  const profiles = await listProject200Profiles(userId);
  return profiles.map((profile) => profile.name);
}

export async function getProject200ProfileByName(userId, profileName) {
  await ensureProject200ProfilesSchema();
  const client = await db.connect();
  try {
    await client.query("begin");
    await seedDefaultProfiles(client, userId);
    const profile = await getProfileByNameWithClient(client, userId, profileName);
    await client.query("commit");
    return profile;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveProject200ProfileName(userId, profileName, options = {}) {
  const fallbackToDefault = options.fallbackToDefault !== false;
  const normalized = normalizeProfileName(profileName);
  if (!normalized) {
    if (fallbackToDefault) {
      return PROJECT200_DEFAULT_PROFILE_NAME;
    }
    throw new Error("Usuário inválido.");
  }

  const matchedProfile = await getProject200ProfileByName(userId, normalized);
  if (matchedProfile) {
    return matchedProfile.name;
  }

  if (fallbackToDefault && normalized.localeCompare("Geral", "pt-BR", { sensitivity: "accent" }) === 0) {
    return PROJECT200_DEFAULT_PROFILE_NAME;
  }

  throw new Error("Usuário inválido.");
}

export async function createProject200Profile(userId, payload = {}) {
  await ensureProject200ProfilesSchema();
  const name = normalizeProfileName(payload?.name);
  if (name.length < 2 || name.length > 40) {
    throw new Error("Digite um nome de usuário entre 2 e 40 caracteres.");
  }

  const profiles = await listProject200Profiles(userId);
  if (profiles.some((profile) => profile.name.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0)) {
    throw new Error("Já existe um usuário com esse nome.");
  }

  const result = await query(
    `
      insert into project200_profiles (
        user_id, name, avatar_preset, is_immutable, is_system, sort_order
      )
      values ($1, $2, $3, false, false, $4)
      returning *
    `,
    [userId, name, PROJECT200_DEFAULT_PROFILE_AVATAR, 100 + profiles.length]
  );

  return normalizeProfileRow(result.rows[0]);
}

export async function deleteProject200Profile(userId, profileId) {
  await ensureProject200ProfilesSchema();
  const client = await db.connect();
  try {
    await client.query("begin");
    await seedDefaultProfiles(client, userId);

    const profile = await getProfileByIdWithClient(client, userId, profileId);
    if (!profile) {
      throw new Error("Usuário não encontrado.");
    }
    if (profile.isImmutable) {
      throw new Error("O usuário padrão não pode ser excluído.");
    }

    await client.query(`update actions set assignee = $2 where user_id = $1 and assignee = $3`, [userId, PROJECT200_DEFAULT_PROFILE_NAME, profile.name]);
    await client.query(`update project_200_history_entries set assignee = $2 where user_id = $1 and assignee = $3`, [userId, PROJECT200_DEFAULT_PROFILE_NAME, profile.name]);
    await client.query(`update project_200_history_entries set speaker = $2 where user_id = $1 and speaker = $3`, [userId, PROJECT200_DEFAULT_PROFILE_NAME, profile.name]);
    await client.query(`update project200_profile_links set assigned_profile = $2, updated_at = now() where user_id = $1 and assigned_profile = $3`, [userId, PROJECT200_DEFAULT_PROFILE_NAME, profile.name]);
    await client.query(`update project200_profiles set deleted_at = now(), updated_at = now() where user_id = $1 and id = $2`, [userId, profile.id]);

    await client.query("commit");
    return { deleted: true, fallbackProfileName: PROJECT200_DEFAULT_PROFILE_NAME };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProject200ProfileAvatar(userId, profileId, payload = {}) {
  await ensureProject200ProfilesSchema();
  const avatarDataUrl = String(payload?.avatarDataUrl || "").trim();
  if (!avatarDataUrl.startsWith("data:image/")) {
    throw new Error("A imagem do usuário é inválida.");
  }
  if (avatarDataUrl.length > 14 * 1024 * 1024) {
    throw new Error("A imagem do usuário ficou grande demais.");
  }

  const client = await db.connect();
  try {
    await client.query("begin");
    await seedDefaultProfiles(client, userId);

    const profile = await getProfileByIdWithClient(client, userId, profileId);
    if (!profile) {
      throw new Error("Usuário não encontrado.");
    }

    const result = await client.query(
      `
        update project200_profiles
        set avatar_data_url = $3,
            updated_at = now()
        where user_id = $1
          and id = $2
          and deleted_at is null
        returning *
      `,
      [userId, profile.id, avatarDataUrl]
    );

    await client.query("commit");
    return normalizeProfileRow(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function reassignProject200ProfileTasks(userId, payload = {}) {
  await ensureProject200ProfilesSchema();
  const client = await db.connect();
  try {
    await client.query("begin");
    await seedDefaultProfiles(client, userId);

    const source = await getProfileByIdWithClient(client, userId, payload?.sourceProfileId);
    const target = await getProfileByIdWithClient(client, userId, payload?.targetProfileId);
    if (!source || !target) {
      throw new Error("Selecione usuários válidos para copiar.");
    }
    if (source.id === target.id) {
      throw new Error("Escolha um usuário diferente para receber as tarefas.");
    }

    const result = await client.query(
      `update actions set assignee = $3 where user_id = $1 and assignee = $2`,
      [userId, source.name, target.name]
    );

    await client.query("commit");
    return {
      movedTasks: Number(result.rowCount || 0),
      sourceProfileName: source.name,
      targetProfileName: target.name
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
