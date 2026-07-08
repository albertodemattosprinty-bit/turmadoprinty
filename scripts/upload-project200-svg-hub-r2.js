import "../src/load-env.js";

import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const sourceDir = "C:/Users/Lucas/Pictures/DeHoje/SVG HUB";
const prefix = "project200/svg-hub";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function buildClient() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

async function main() {
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const client = buildClient();
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.svg$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  for (const fileName of files) {
    const absolutePath = path.join(sourceDir, fileName);
    const body = await fs.readFile(absolutePath);
    const key = `${prefix}/${fileName}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/svg+xml; charset=utf-8",
      CacheControl: "public, max-age=31536000, immutable"
    }));
    console.log(`Upload concluído: ${key}`);
  }

  console.log(`Total enviado: ${files.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
