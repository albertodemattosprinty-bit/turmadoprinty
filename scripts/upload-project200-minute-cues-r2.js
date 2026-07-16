import "../src/load-env.js";

import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const sourceDir = "C:/Users/Lucas/Pictures/FlashCards Capa/Nova pasta/Nova pasta";
const existingCueDir = path.resolve("public/200/mission-cues");
const prefix = "project200/audio/pt-BR/minutos-restantes/v1";
const shouldUpload = process.argv.includes("--upload");

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function buildClient() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY")
    }
  });
}

function sourceIndexToMinutes(index) {
  return index <= 56 ? index + 3 : 60 + ((index - 57) * 5);
}

async function buildEntries() {
  const entries = [
    { minutes: 1, sourcePath: path.join(existingCueDir, "1-min.mp3"), originalName: "1-min.mp3" },
    { minutes: 2, sourcePath: path.join(existingCueDir, "2-min.mp3"), originalName: "2-min.mp3" },
    { minutes: 3, sourcePath: path.join(existingCueDir, "3-min.mp3"), originalName: "3-min.mp3" }
  ];

  for (let index = 1; index <= 117; index += 1) {
    const originalName = `${String(index).padStart(4, "0")}.mp3`;
    entries.push({
      minutes: sourceIndexToMinutes(index),
      sourcePath: path.join(sourceDir, originalName),
      originalName
    });
  }

  for (const entry of entries) {
    await fs.access(entry.sourcePath);
    entry.fileName = `${String(entry.minutes).padStart(3, "0")}-minutos.mp3`;
    entry.key = `${prefix}/${entry.fileName}`;
  }
  return entries;
}

async function uploadInBatches(client, bucket, entries, batchSize = 8) {
  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    await Promise.all(batch.map(async (entry) => {
      const body = await fs.readFile(entry.sourcePath);
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: entry.key,
        Body: body,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable"
      }));
    }));
    console.log(`Enviados ${Math.min(index + batch.length, entries.length)}/${entries.length}`);
  }
}

async function main() {
  const entries = await buildEntries();
  const manifest = {
    version: 1,
    language: "pt-BR",
    maxMinutes: 360,
    entries: entries.map(({ minutes, fileName, originalName }) => ({ minutes, fileName, originalName }))
  };

  if (!shouldUpload) {
    console.log(JSON.stringify({ mode: "dry-run", prefix, total: entries.length, first: entries[0], last: entries.at(-1) }, null, 2));
    return;
  }

  const bucket = requiredEnv("R2_BUCKET_NAME");
  const client = buildClient();
  await uploadInBatches(client, bucket, entries);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefix}/manifest.json`,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "public, max-age=300"
  }));
  console.log(`Catálogo publicado: ${prefix}/manifest.json`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
