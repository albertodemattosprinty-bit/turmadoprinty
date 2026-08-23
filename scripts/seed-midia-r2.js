import "../src/load-env.js";

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const PREFIX = "midia/audio/";
const paths = process.argv.slice(2);

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Configure ${name} antes de enviar as musicas.`);
  return value;
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Musica";
}

function titleFromKey(key) {
  return path.posix.basename(key)
    .replace(/^\d{13}-[a-f0-9]{8}-/i, "")
    .replace(/\.[^.]+$/, "");
}

function publicUrl(baseUrl, key) {
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function listExistingKeys(client, bucket) {
  const keys = [];
  let continuationToken;
  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: PREFIX,
      ContinuationToken: continuationToken
    }));
    keys.push(...(result.Contents || []).map((item) => String(item.Key || "")).filter(Boolean));
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function main() {
  if (!paths.length) {
    throw new Error("Informe pelo menos um arquivo de audio.");
  }

  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const publicBaseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY")
    }
  });
  const existingKeys = await listExistingKeys(client, bucket);
  const existingTitles = new Set(existingKeys.map((key) => titleFromKey(key).toLocaleLowerCase("pt-BR")));

  for (const filePath of paths) {
    const details = await stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".mp3") throw new Error(`Arquivo base precisa ser MP3: ${filePath}`);
    const title = normalizeTitle(path.basename(filePath, extension));
    const normalizedTitle = title.toLocaleLowerCase("pt-BR");

    if (existingTitles.has(normalizedTitle)) {
      console.log(`Ja existe: ${title}`);
      continue;
    }

    const key = `${PREFIX}${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${title}${extension}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: details.size,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable"
    }));
    existingTitles.add(normalizedTitle);
    console.log(`Enviada: ${title} (${Math.round(details.size / 1024 / 1024)} MB)`);
    console.log(publicUrl(publicBaseUrl, key));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
