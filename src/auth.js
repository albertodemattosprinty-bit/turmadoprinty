import crypto from "node:crypto";

import { query } from "./db.js";

const SESSION_DURATION_DAYS = 30;
const LEGACY_ADMIN_USERNAMES = Object.freeze(["rosemattos", "lucasm", "albertomattos"]);
let authSecuritySchemaPromise = null;

export function normalizeUserRole(value) {
  return String(value || "").trim().toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

export async function ensureAuthSecuritySchema() {
  if (!authSecuritySchemaPromise) {
    authSecuritySchemaPromise = (async () => {
      await query(`
        alter table users add column if not exists role text not null default 'USER';
      `);
      await query(`
        update users set role = 'USER' where role is null or upper(role) not in ('USER', 'ADMIN');
      `);
      await query(`
        create table if not exists auth_security_migrations (
          migration_key text primary key,
          applied_at timestamptz not null default now()
        );
      `);
      await query(
        `with applied as (
           insert into auth_security_migrations (migration_key)
           values ('bootstrap-legacy-admin-roles-v1')
           on conflict (migration_key) do nothing
           returning migration_key
         )
         update users
            set role = 'ADMIN'
          where exists (select 1 from applied)
            and lower(coalesce(username, '')) = any($1::text[])`,
        [LEGACY_ADMIN_USERNAMES]
      );
      await query(`alter table user_sessions add column if not exists revoked_at timestamptz;`);
      await query(`alter table user_sessions add column if not exists last_used_at timestamptz;`);
      await query(`create index if not exists idx_user_sessions_active_token on user_sessions(token_hash) where revoked_at is null;`);
    })().catch((error) => {
      authSecuritySchemaPromise = null;
      throw error;
    });
  }
  return authSecuritySchemaPromise;
}

function normalizeUsername(username) {
  return String(username || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function buildSyntheticEmail(normalizedUsername) {
  const usernameHash = crypto.createHash("sha256").update(normalizedUsername).digest("hex").slice(0, 24);
  return `user-${usernameHash}@usuarios.turmadoprinty.local`;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function parseBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return "";
  }

  return headerValue.slice("Bearer ".length).trim();
}

export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, savedHash] = String(storedHash || "").split(":");

    if (!salt || !savedHash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      const savedBuffer = Buffer.from(savedHash, "hex");
      const derivedBuffer = Buffer.from(derivedKey.toString("hex"), "hex");

      if (savedBuffer.length !== derivedBuffer.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(savedBuffer, derivedBuffer));
    });
  });
}

export async function createUser({ name, username, password }) {
  await ensureAuthSecuritySchema();
  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const syntheticEmail = buildSyntheticEmail(normalizedUsername);

  const result = await query(
    `
      insert into users (name, username, email, password_hash, email_verified)
      values ($1, $2, $3, $4, true)
      returning id, name, username, email, email_verified, role, created_at
    `,
    [name.trim(), normalizedUsername, syntheticEmail, passwordHash]
  );

  return result.rows[0];
}

export async function findUserByUsername(username) {
  await ensureAuthSecuritySchema();
  const result = await query(
    `
      select id, name, username, email, password_hash, email_verified, role, created_at
      from users
      where username = $1
      limit 1
    `,
    [normalizeUsername(username)]
  );

  return result.rows[0] || null;
}

export async function createSession(userId) {
  await ensureAuthSecuritySchema();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await query(`delete from user_sessions where expires_at <= now() or revoked_at < now() - interval '30 days'`);
  await query(
    `
      insert into user_sessions (user_id, token_hash, expires_at)
      values ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt.toISOString()]
  );

  return {
    token,
    expiresAt
  };
}

export async function findUserBySessionToken(token) {
  if (!token) return null;
  await ensureAuthSecuritySchema();
  const result = await query(
    `
      select u.id, u.name, u.username, u.email, u.email_verified, u.role, u.created_at, s.expires_at
        from user_sessions s
        join users u on u.id = s.user_id
       where s.token_hash = $1
         and s.expires_at > now()
         and s.revoked_at is null
       limit 1
    `,
    [hashToken(token)]
  );

  return result.rows[0] || null;
}

export async function revokeSessionToken(token) {
  if (!token) return false;
  await ensureAuthSecuritySchema();
  const result = await query(
    `update user_sessions
        set revoked_at = coalesce(revoked_at, now())
      where token_hash = $1
        and revoked_at is null
      returning id`,
    [hashToken(token)]
  );
  return Boolean(result.rows[0]);
}
