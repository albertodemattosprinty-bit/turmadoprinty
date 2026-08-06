import "../src/load-env.js";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const appVersion = "0.85";
const defaultApkPath = path.resolve("mobile-200/android/app/build/outputs/apk/debug/app-debug.apk");
const apkPath = path.resolve(process.argv[2] || defaultApkPath);
const latestKey = "project200/app/latest/iLife-Mindset-debug.apk";
const releaseKey = `project200/app/releases/${appVersion}/iLife-Mindset-v${appVersion}-debug.apk`;
const manifestKey = "project200/app/latest/manifest.json";

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

function buildPublicUrl(key) {
  const baseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadAndVerify(client, bucket, key, body, options = {}) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    ContentDisposition: options.contentDisposition,
    CacheControl: options.cacheControl
  }));
  const uploaded = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (Number(uploaded.ContentLength || 0) !== body.length) {
    throw new Error(`Falha ao verificar o tamanho publicado em ${key}.`);
  }
}

async function main() {
  const client = buildClient();
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const apk = await fs.readFile(apkPath);
  const sha256 = crypto.createHash("sha256").update(apk).digest("hex");
  const uploadedAt = new Date().toISOString();
  const apkOptions = {
    contentType: "application/vnd.android.package-archive",
    contentDisposition: `attachment; filename="iLife-Mindset-v${appVersion}-debug.apk"`,
    cacheControl: "no-store, max-age=0"
  };

  await uploadAndVerify(client, bucket, releaseKey, apk, apkOptions);
  await uploadAndVerify(client, bucket, latestKey, apk, apkOptions);

  const manifest = Buffer.from(JSON.stringify({
    app: "iLife Mindset",
    appId: "com.turmadoprinty.project200",
    version: appVersion,
    channel: "debug",
    fileName: `iLife-Mindset-v${appVersion}-debug.apk`,
    sizeBytes: apk.length,
    sha256,
    uploadedAt,
    downloadUrl: buildPublicUrl(latestKey),
    releaseUrl: buildPublicUrl(releaseKey)
  }, null, 2));
  await uploadAndVerify(client, bucket, manifestKey, manifest, {
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-store, max-age=0"
  });

  console.log(JSON.stringify({
    version: appVersion,
    apkPath,
    sizeBytes: apk.length,
    sha256,
    latestKey,
    releaseKey,
    manifestKey,
    downloadUrl: buildPublicUrl(latestKey)
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
