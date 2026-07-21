import crypto from "node:crypto";

import { query } from "./db.js";

const DATA_ALGORITHM = "aes-256-gcm";
const DATA_ENVELOPE_VERSION = 1;
const KEY_BYTES = 32;
const IV_BYTES = 12;
let privacySchemaPromise = null;

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function parseKeyMaterial(rawValue, label) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  const value = raw.replace(/^base64:/i, "");
  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`${label} precisa representar exatamente 32 bytes.`);
  }
  return key;
}

function readKeyring() {
  const currentVersion = Math.max(1, Math.trunc(Number(process.env.PROJECT200_DATA_KEK_VERSION) || 1));
  const currentKey = parseKeyMaterial(process.env.PROJECT200_DATA_KEK, "PROJECT200_DATA_KEK");
  const keys = new Map();
  if (currentKey) keys.set(currentVersion, currentKey);

  const previousRaw = String(process.env.PROJECT200_DATA_PREVIOUS_KEKS || "").trim();
  if (previousRaw) {
    let previous;
    try {
      previous = JSON.parse(previousRaw);
    } catch {
      throw new Error("PROJECT200_DATA_PREVIOUS_KEKS precisa ser um objeto JSON.");
    }
    for (const [versionValue, keyValue] of Object.entries(previous || {})) {
      const version = Math.trunc(Number(versionValue));
      if (!Number.isInteger(version) || version < 1) {
        throw new Error("As versoes em PROJECT200_DATA_PREVIOUS_KEKS precisam ser inteiros positivos.");
      }
      const previousKey = parseKeyMaterial(keyValue, `PROJECT200_DATA_PREVIOUS_KEKS[${version}]`);
      if (!previousKey) {
        throw new Error(`A chave anterior da versao ${version} esta vazia.`);
      }
      keys.set(version, previousKey);
    }
  }

  const required = isTruthy(process.env.PROJECT200_DATA_ENCRYPTION_REQUIRED);
  if (required && !currentKey) {
    throw new Error("Criptografia obrigatoria, mas PROJECT200_DATA_KEK nao esta configurada.");
  }
  return { currentKey, currentVersion, keys, required, enabled: Boolean(currentKey) };
}

function buildAad(userId, context) {
  return Buffer.from(`project200|${String(userId)}|${String(context)}`, "utf8");
}

function encryptBuffer(key, plaintext, aad) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(DATA_ALGORITHM, key, iv);
  cipher.setAAD(aad);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), data };
}

function decryptBuffer(key, envelope, aad) {
  const decipher = crypto.createDecipheriv(DATA_ALGORITHM, key, envelope.iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(envelope.tag);
  return Buffer.concat([decipher.update(envelope.data), decipher.final()]);
}

export function encryptJsonWithKey(keyValue, value, aadValue = "") {
  const key = Buffer.isBuffer(keyValue) ? keyValue : Buffer.from(keyValue);
  if (key.length !== KEY_BYTES) throw new Error("A chave de dados precisa ter 32 bytes.");
  const encrypted = encryptBuffer(key, Buffer.from(JSON.stringify(value), "utf8"), Buffer.from(String(aadValue), "utf8"));
  return {
    v: DATA_ENVELOPE_VERSION,
    alg: "A256GCM",
    iv: encrypted.iv.toString("base64"),
    tag: encrypted.tag.toString("base64"),
    data: encrypted.data.toString("base64")
  };
}

export function decryptJsonWithKey(keyValue, envelope, aadValue = "") {
  const key = Buffer.isBuffer(keyValue) ? keyValue : Buffer.from(keyValue);
  if (key.length !== KEY_BYTES) throw new Error("A chave de dados precisa ter 32 bytes.");
  if (!envelope || Number(envelope.v) !== DATA_ENVELOPE_VERSION || envelope.alg !== "A256GCM") {
    throw new Error("Envelope criptografado invalido ou nao suportado.");
  }
  const plaintext = decryptBuffer(key, {
    iv: Buffer.from(String(envelope.iv || ""), "base64"),
    tag: Buffer.from(String(envelope.tag || ""), "base64"),
    data: Buffer.from(String(envelope.data || ""), "base64")
  }, Buffer.from(String(aadValue), "utf8"));
  return JSON.parse(plaintext.toString("utf8"));
}

export function getPrivacyEncryptionStatus() {
  const config = readKeyring();
  return {
    enabled: config.enabled,
    required: config.required,
    currentVersion: config.currentVersion,
    availableVersions: [...config.keys.keys()].sort((a, b) => a - b)
  };
}

export async function ensurePrivacyEncryptionSchema() {
  if (!privacySchemaPromise) {
    privacySchemaPromise = query(`
      create table if not exists user_data_encryption_keys (
        user_id uuid primary key references users(id) on delete cascade,
        wrapped_key bytea not null,
        wrapped_iv bytea not null,
        wrapped_tag bytea not null,
        kek_version integer not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `).catch((error) => {
      privacySchemaPromise = null;
      throw error;
    });
  }
  return privacySchemaPromise;
}

function wrapUserKey(userId, userKey, version, kek) {
  return encryptBuffer(kek, userKey, buildAad(userId, `user-dek:v${version}`));
}

function unwrapUserKey(userId, row, keyring) {
  const version = Math.max(1, Math.trunc(Number(row.kek_version) || 0));
  const kek = keyring.keys.get(version);
  if (!kek) {
    throw new Error(`A chave-mestra da versao ${version} e necessaria para abrir os dados deste usuario.`);
  }
  return decryptBuffer(kek, {
    iv: Buffer.from(row.wrapped_iv),
    tag: Buffer.from(row.wrapped_tag),
    data: Buffer.from(row.wrapped_key)
  }, buildAad(userId, `user-dek:v${version}`));
}

async function getOrCreateUserDataKey(userId) {
  const keyring = readKeyring();
  if (!keyring.enabled) return null;
  await ensurePrivacyEncryptionSchema();

  let result = await query(
    `select user_id, wrapped_key, wrapped_iv, wrapped_tag, kek_version
       from user_data_encryption_keys where user_id = $1 limit 1`,
    [userId]
  );
  if (!result.rows[0]) {
    const userKey = crypto.randomBytes(KEY_BYTES);
    const wrapped = wrapUserKey(userId, userKey, keyring.currentVersion, keyring.currentKey);
    await query(
      `insert into user_data_encryption_keys
         (user_id, wrapped_key, wrapped_iv, wrapped_tag, kek_version)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id) do nothing`,
      [userId, wrapped.data, wrapped.iv, wrapped.tag, keyring.currentVersion]
    );
    result = await query(
      `select user_id, wrapped_key, wrapped_iv, wrapped_tag, kek_version
         from user_data_encryption_keys where user_id = $1 limit 1`,
      [userId]
    );
  }

  const row = result.rows[0];
  if (!row) throw new Error("Nao foi possivel criar a chave de dados do usuario.");
  const userKey = unwrapUserKey(userId, row, keyring);
  if (Number(row.kek_version) !== keyring.currentVersion) {
    const rewrapped = wrapUserKey(userId, userKey, keyring.currentVersion, keyring.currentKey);
    await query(
      `update user_data_encryption_keys
          set wrapped_key = $2, wrapped_iv = $3, wrapped_tag = $4,
              kek_version = $5, updated_at = now()
        where user_id = $1 and kek_version = $6`,
      [userId, rewrapped.data, rewrapped.iv, rewrapped.tag, keyring.currentVersion, row.kek_version]
    );
  }
  return userKey;
}

export async function encryptUserJson(userId, value, context) {
  const key = await getOrCreateUserDataKey(userId);
  if (!key) return null;
  return encryptJsonWithKey(key, value, buildAad(userId, context));
}

export async function decryptUserJson(userId, envelope, context) {
  if (!envelope) return null;
  const key = await getOrCreateUserDataKey(userId);
  if (!key) {
    throw new Error("Os dados estao criptografados, mas a chave-mestra nao esta disponivel.");
  }
  return decryptJsonWithKey(key, envelope, buildAad(userId, context));
}
