import "../src/load-env.js";

import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

const stationSources = [
  {
    name: "Calm",
    sourceDir: "D:/American English Base Songs/Songs/Calm/Calm"
  },
  {
    name: "Pop",
    sourceDir: "D:/American English Base Songs/Songs/Calm/Pop"
  }
];

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

async function listKeys(client, bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));
    keys.push(...(response.Contents || []).map((item) => item.Key).filter(Boolean));
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function collectStationFiles(station) {
  const entries = await fs.readdir(station.sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".mp3")
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((entry) => ({
      station: station.name,
      fileName: entry.name,
      sourcePath: path.join(station.sourceDir, entry.name),
      key: `Music/${station.name}/${entry.name}`
    }));
}

async function uploadAndVerify(client, bucket, files) {
  for (let index = 0; index < files.length; index += 4) {
    const batch = files.slice(index, index + 4);
    await Promise.all(batch.map(async (file) => {
      const body = await fs.readFile(file.sourcePath);
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: body,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable"
      }));
      const uploaded = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: file.key }));
      if (Number(uploaded.ContentLength) !== body.length) {
        throw new Error(`Tamanho inesperado após upload: ${file.key}`);
      }
    }));
    console.log(`Enviados e validados ${Math.min(index + batch.length, files.length)}/${files.length}`);
  }
}

async function removeStaleStationFiles(client, bucket, stationName, expectedKeys) {
  const existingKeys = await listKeys(client, bucket, `Music/${stationName}/`);
  const staleKeys = existingKeys.filter((key) => !expectedKeys.has(key));
  for (const key of staleKeys) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`Removido: ${key}`);
  }
  return staleKeys;
}

async function main() {
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const client = buildClient();
  const filesByStation = new Map();
  for (const station of stationSources) {
    const files = await collectStationFiles(station);
    if (!files.length) throw new Error(`Nenhum MP3 encontrado em ${station.sourceDir}`);
    filesByStation.set(station.name, files);
  }

  const allFiles = [...filesByStation.values()].flat();
  await uploadAndVerify(client, bucket, allFiles);

  const cleanup = {};
  for (const station of stationSources) {
    const files = filesByStation.get(station.name) || [];
    cleanup[station.name] = await removeStaleStationFiles(
      client,
      bucket,
      station.name,
      new Set(files.map((file) => file.key))
    );
  }

  console.log(JSON.stringify({
    uploaded: Object.fromEntries([...filesByStation].map(([name, files]) => [name, files.length])),
    removed: Object.fromEntries(Object.entries(cleanup).map(([name, keys]) => [name, keys.length]))
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
