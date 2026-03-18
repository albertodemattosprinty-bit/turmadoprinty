import crypto from "node:crypto";

import { query } from "./db.js";

const SESSION_DURATION_DAYS = 30;
const VERIFICATION_CODE_DURATION_MINUTES = 10;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateVerificationCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
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

export async function createUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  const result = await query(
    `
      insert into users (name, email, password_hash, email_verified)
      values ($1, $2, $3, true)
      returning id, name, email, email_verified, created_at
    `,
    [name.trim(), normalizedEmail, passwordHash]
  );

  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query(
    `
      select id, name, email, password_hash, email_verified, created_at
      from users
      where email = $1
      limit 1
    `,
    [normalizeEmail(email)]
  );

  return result.rows[0] || null;
}

export async function findVerifiedUserByEmail(email) {
  const result = await query(
    `
      select id, name, email, password_hash, email_verified, created_at
      from users
      where email = $1
        and email_verified = true
      limit 1
    `,
    [normalizeEmail(email)]
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

export async function createRegistrationCode({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_DURATION_MINUTES * 60 * 1000);

  await query("delete from email_verification_codes where email = $1", [normalizedEmail]);

  await query(
    `
      insert into email_verification_codes (name, email, password_hash, code_hash, expires_at)
      values ($1, $2, $3, $4, $5)
    `,
    [name.trim(), normalizedEmail, passwordHash, codeHash, expiresAt.toISOString()]
  );

  return {
    code,
    expiresAt
  };
}

export async function verifyRegistrationCode({ email, code }) {
  const normalizedEmail = normalizeEmail(email);
  const result = await query(
    `
      select id, name, email, password_hash, code_hash, expires_at
      from email_verification_codes
      where email = $1
      order by created_at desc
      limit 1
    `,
    [normalizedEmail]
  );

  const verification = result.rows[0] || null;

  if (!verification) {
    throw new Error("Nenhum codigo encontrado para esse email.");
  }

  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    await query("delete from email_verification_codes where email = $1", [normalizedEmail]);
    throw new Error("Codigo expirado. Gere um novo codigo.");
  }

  if (verification.code_hash !== hashVerificationCode(code)) {
    throw new Error("Codigo invalido.");
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  let user;

  if (existingUser?.email_verified) {
    await query("delete from email_verification_codes where email = $1", [normalizedEmail]);
    throw new Error("Esse email ja esta cadastrado.");
  }

  if (existingUser) {
    const updated = await query(
      `
        update users
        set name = $1,
            password_hash = $2,
            email_verified = true
        where id = $3
        returning id, name, email, email_verified, created_at
      `,
      [verification.name, verification.password_hash, existingUser.id]
    );
    user = updated.rows[0];
  } else {
    const created = await query(
      `
        insert into users (name, email, password_hash, email_verified)
        values ($1, $2, $3, true)
        returning id, name, email, email_verified, created_at
      `,
      [verification.name, verification.email, verification.password_hash]
    );
    user = created.rows[0];
  }

  await query("delete from email_verification_codes where email = $1", [normalizedEmail]);

  return user;
}

export async function findUserBySessionToken(token) {
  const result = await query(
    `
      select u.id, u.name, u.email, u.email_verified, u.created_at, s.expires_at
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
