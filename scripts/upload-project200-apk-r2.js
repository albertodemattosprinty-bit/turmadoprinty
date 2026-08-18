import "../src/load-env.js";

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { Resolver } from "node:dns";
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand
} from "@aws-sdk/client-s3";

const appVersion = "0.89";
const defaultApkPath = path.resolve("mobile-200/android/app/build/outputs/apk/debug/app-debug.apk");
const apkPath = path.resolve(process.argv[2] || defaultApkPath);
const latestKey = "project200/app/latest/iLife-Mindset-debug.apk";
const releaseKey = `project200/app/releases/${appVersion}/iLife-Mindset-v${appVersion}-debug.apk`;
const manifestKey = "project200/app/latest/manifest.json";
const multipartThresholdBytes = 5 * 1024 * 1024;
const multipartPartSizeBytes = 5 * 1024 * 1024;
const r2DnsResolver = new Resolver();
r2DnsResolver.setServers(["1.1.1.1", "8.8.8.8"]);

function lookupR2Host(hostname, options, callback) {
  r2DnsResolver.resolve4(hostname, (error, addresses) => {
    if (error) return callback(error);
    if (options?.all) return callback(null, addresses.map((address) => ({ address, family: 4 })));
    return callback(null, addresses[0], 4);
  });
}

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
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      httpsAgent: new https.Agent({ keepAlive: true, lookup: lookupR2Host })
    }),
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

function escapeCurlConfigValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function uploadFileWithCurl(bucket, key, filePath, options = {}) {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const hostname = `${accountId}.r2.cloudflarestorage.com`;
  const addresses = await new Promise((resolve, reject) => {
    r2DnsResolver.resolve4(hostname, (error, result) => error ? reject(error) : resolve(result));
  });
  if (!addresses.length) throw new Error(`DNS nao retornou endereco para ${hostname}.`);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://${hostname}/${encodeURIComponent(bucket)}/${encodedKey}`;
  const args = [
    "--config", "-",
    "--fail-with-body", "--silent", "--show-error", "--http1.1",
    "--retry", "10", "--retry-all-errors", "--retry-delay", "2",
    "--connect-timeout", "30", "--max-time", "900",
    "--resolve", `${hostname}:443:${addresses[0]}`,
    "--request", "PUT", "--upload-file", filePath,
    "--header", "Expect:",
    "--header", `Content-Type: ${options.contentType || "application/octet-stream"}`,
    "--header", `Content-Disposition: ${options.contentDisposition || "attachment"}`,
    "--header", `Cache-Control: ${options.cacheControl || "no-store, max-age=0"}`,
    url
  ];
  await new Promise((resolve, reject) => {
    const child = spawn("curl.exe", args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`curl falhou ao publicar ${key} (codigo ${code}): ${stderr || stdout}`));
    });
    const user = `${requiredEnv("R2_ACCESS_KEY_ID")}:${requiredEnv("R2_SECRET_ACCESS_KEY")}`;
    child.stdin.end(`user = "${escapeCurlConfigValue(user)}"\naws-sigv4 = "aws:amz:auto:s3"\n`);
  });
}

async function uploadAndVerify(client, bucket, key, body, options = {}) {
  const objectOptions = {
    Bucket: bucket,
    Key: key,
    ContentType: options.contentType,
    ContentDisposition: options.contentDisposition,
    CacheControl: options.cacheControl
  };
  if (body.length > multipartThresholdBytes && options.filePath) {
    await uploadFileWithCurl(bucket, key, options.filePath, options);
  } else if (body.length > multipartThresholdBytes) {
    const created = await client.send(new CreateMultipartUploadCommand(objectOptions));
    const uploadId = created.UploadId;
    if (!uploadId) throw new Error(`R2 nao retornou UploadId para ${key}.`);
    const parts = [];
    try {
      for (let offset = 0, partNumber = 1; offset < body.length; offset += multipartPartSizeBytes, partNumber += 1) {
        const partBody = body.subarray(offset, Math.min(offset + multipartPartSizeBytes, body.length));
        const uploadedPart = await client.send(new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: partBody,
          ContentLength: partBody.length
        }));
        if (!uploadedPart.ETag) throw new Error(`R2 nao retornou ETag para a parte ${partNumber} de ${key}.`);
        parts.push({ ETag: uploadedPart.ETag, PartNumber: partNumber });
      }
      await client.send(new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts }
      }));
    } catch (error) {
      await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId })).catch(() => {});
      throw error;
    }
  } else {
    await client.send(new PutObjectCommand({ ...objectOptions, Body: body }));
  }
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
    filePath: apkPath,
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
