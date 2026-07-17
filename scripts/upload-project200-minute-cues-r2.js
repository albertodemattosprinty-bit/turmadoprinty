import "../src/load-env.js";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const prefix = "project200/audio/pt-BR/minutos-restantes/v1";
const shouldUploadManifest = process.argv.includes("--upload-manifest");

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
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

function getMinuteFileName(minutes) {
  return `${String(minutes).padStart(3, "0")}-minutos.mp3`;
}

function hasExactMinuteCue(minutes) {
  return minutes >= 1 && minutes <= 360 && (minutes <= 60 || minutes % 5 === 0);
}

function buildEntry(minutes) {
  const exact = hasExactMinuteCue(minutes);
  if (exact) {
    return {
      minutes,
      fileName: getMinuteFileName(minutes),
      text: minutes === 1 ? "1 minuto" : `${minutes} minutos`,
      mode: "single",
      parts: [getMinuteFileName(minutes)]
    };
  }

  const hourMinutes = Math.floor(minutes / 60) * 60;
  const remainingMinutes = minutes % 60;
  return {
    minutes,
    fileName: getMinuteFileName(minutes),
    text: `${minutes} minutos`,
    mode: "combo",
    parts: [getMinuteFileName(hourMinutes), getMinuteFileName(remainingMinutes)]
  };
}

function buildManifest() {
  return {
    version: 3,
    language: "pt-BR",
    maxMinutes: 360,
    coverage: "natural-combo-from-120-base-files",
    generatedAt: new Date().toISOString(),
    baseFiles: 120,
    entries: Array.from({ length: 360 }, (_, index) => buildEntry(index + 1))
  };
}

async function main() {
  const manifest = buildManifest();

  if (!shouldUploadManifest) {
    const comboEntries = manifest.entries.filter((entry) => entry.mode === "combo");
    console.log(JSON.stringify({
      mode: "dry-run",
      prefix,
      totalEntries: manifest.entries.length,
      baseFiles: manifest.baseFiles,
      comboEntries: comboEntries.length,
      sampleCombo: comboEntries[0],
      lastCombo: comboEntries.at(-1),
      coverage: manifest.coverage
    }, null, 2));
    return;
  }

  const client = buildClient();
  const bucket = requiredEnv("R2_BUCKET_NAME");
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefix}/manifest.json`,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "public, max-age=300"
  }));
  console.log(`Manifest publicado em ${prefix}/manifest.json`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
