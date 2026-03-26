import crypto from "node:crypto";

import { query } from "./db.js";

const SESSION_DURATION_DAYS = 30;

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
  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const syntheticEmail = buildSyntheticEmail(normalizedUsername);

  const result = await query(
    `
      insert into users (name, username, email, password_hash, email_verified)
      values ($1, $2, $3, $4, true)
      returning id, name, username, email, email_verified, created_at
    `,
    [name.trim(), normalizedUsername, syntheticEmail, passwordHash]
  );

  return result.rows[0];
}

export async function findUserByUsername(username) {
  const result = await query(
    `
      select id, name, username, email, password_hash, email_verified, created_at
      from users
      where username = $1
      limit 1
    `,
    [normalizeUsername(username)]
  );

  return result.rows[0] || null;
}

export async function createSession(userId) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

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
  const result = await query(
    `
      select u.id, u.name, u.username, u.email, u.email_verified, u.created_at, s.expires_at
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.expires_at > now()
      limit 1
    `,
    [hashToken(token)]
  );

  return result.rows[0] || null;
}
