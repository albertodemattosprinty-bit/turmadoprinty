import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { decryptJsonWithKey, encryptJsonWithKey } from "../src/privacy-crypto.js";

test("AES-256-GCM preserva JSON e caracteres UTF-8", () => {
  const key = crypto.randomBytes(32);
  const value = {
    mensagem: "Meu plano de vida é privado 🚀",
    propostas: [{ tipo: "finance", valor: 125.5 }]
  };
  const encrypted = encryptJsonWithKey(key, value, "usuario-1|mensagem-1");
  assert.notDeepEqual(encrypted.data, value);
  assert.deepEqual(decryptJsonWithKey(key, encrypted, "usuario-1|mensagem-1"), value);
});

test("AAD impede trocar um registro criptografado de contexto", () => {
  const key = crypto.randomBytes(32);
  const encrypted = encryptJsonWithKey(key, { segredo: true }, "usuario-1|registro-1");
  assert.throws(() => decryptJsonWithKey(key, encrypted, "usuario-2|registro-1"));
});

test("alteracao no ciphertext e detectada", () => {
  const key = crypto.randomBytes(32);
  const encrypted = encryptJsonWithKey(key, { saldo: 1000 }, "finance");
  const bytes = Buffer.from(encrypted.data, "base64");
  bytes[0] ^= 1;
  assert.throws(() => decryptJsonWithKey(key, { ...encrypted, data: bytes.toString("base64") }, "finance"));
});
