const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server.js');
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  `    const kind = String(body?.kind || "photo").trim().toLowerCase() === "video" ? "video" : "photo";\n    const mimeType = String(body?.mimeType || "").trim().toLowerCase();\n    const fileBase64 = String(body?.fileBase64 || "").trim();\n    const previewBase64 = String(body?.previewBase64 || "").trim();\n`,
  `    const kind = String(body?.kind || "photo").trim().toLowerCase() === "video" ? "video" : "photo";\n    const captureId = String(body?.captureId || body?.id || "").trim() || crypto.randomUUID();\n    const title = String(body?.title || "").trim();\n    const noteText = String(body?.noteText || "").trim();\n    const createdAt = body?.createdAt;\n    const durationMs = Math.max(0, Math.trunc(Number(body?.durationMs || 0) || 0));\n    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};\n    const mimeType = String(body?.mimeType || "").trim().toLowerCase();\n    const fileBase64 = String(body?.fileBase64 || "").trim();\n    const previewBase64 = String(body?.previewBase64 || "").trim();\n`
);
s = s.replace(
  `    sendJson(response, 201, {\n      ok: true,\n      asset: {\n        kind,\n        key: mediaKey,\n        url: buildPublicR2UrlFromKey(mediaKey),\n        previewKey,\n        previewUrl,\n        sizeBytes: mediaBuffer.length,\n        mimeType\n      }\n    });\n`,
  `    const capture = await upsertProject200LifeCapture(user.id, {\n      id: captureId,\n      kind,\n      title,\n      noteText,\n      createdAt,\n      mimeType,\n      mediaKey,\n      mediaUrl: buildPublicR2UrlFromKey(mediaKey),\n      previewKey,\n      previewUrl,\n      sizeBytes: mediaBuffer.length,\n      durationMs,\n      metadata\n    });\n\n    sendJson(response, 201, {\n      ok: true,\n      asset: {\n        kind,\n        key: mediaKey,\n        url: buildPublicR2UrlFromKey(mediaKey),\n        previewKey,\n        previewUrl,\n        sizeBytes: mediaBuffer.length,\n        mimeType\n      },\n      capture\n    });\n`
);
if (!s.includes('if (request.method === "GET" && pathname === "/api/200/life-captures") {')) {
  s = s.replace(
    `  if (request.method === "POST" && pathname === "/api/200/life-captures/upload") {\n    await handleProject200LifeCaptureUploadRequest(request, response);\n    return;\n  }\n`,
    `  if (request.method === "GET" && pathname === "/api/200/life-captures") {\n    await handleProject200LifeCaptureListRequest(request, response);\n    return;\n  }\n\n  if (request.method === "PATCH" && pathname.match(/^\\/api\\/200\\/life-captures\\/[^/]+$/)) {\n    const captureId = decodeURIComponent(pathname.replace(/^\\/api\\/200\\/life-captures\\/([^/]+)$/, "$1"));\n    await handleProject200LifeCapturePatchRequest(request, response, captureId);\n    return;\n  }\n\n  if (request.method === "POST" && pathname === "/api/200/life-captures/upload") {\n    await handleProject200LifeCaptureUploadRequest(request, response);\n    return;\n  }\n`
  );
}
fs.writeFileSync(p, s, 'utf8');
console.log('upload + routes wired');
