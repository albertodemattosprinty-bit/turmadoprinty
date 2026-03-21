import "./src/load-env.js";

import { createReadStream, existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

import { albums } from "./src/albums.js";
import { createSession, createUser, findUserBySessionToken, findUserByUsername, parseBearerToken, verifyPassword } from "./src/auth.js";
import { deleteUserById, dismissAdminUserMessage, ensureAdminUsersSchema, getActiveAdminUserMessage, getUserContractorState, listUsersWithAdminData, recordNarrationUsage, recordTextTokenUsage, removeUserPlanOverride, saveUserReplyToAdminMessage, sendAdminUserMessage, setUserContractorStatus, setUserPlanOverride, touchUserPresence } from "./src/admin-users.js";
import { createAlbumManifestStore } from "./src/album-manifests.js";
import { canDownloadTrackForPlan } from "./src/access-rules.js";
import { hasDatabase, query } from "./src/db.js";
import { createAlbumPurchaseRecord, createPlanSubscriptionRecord, ensurePaymentSchema, getUserAccessState, isActivePaymentStatus, isActiveSubscriptionStatus, isInactiveSubscriptionStatus, markAlbumPurchaseStatus, markPlanSubscriptionStatus, recordPaymentWebhookEvent } from "./src/payments.js";
import { buildSubscriptionPlans, findSubscriptionPlanById } from "./src/plans.js";
import { createScheduleEntry, ensureSiteConfigSchema, getScheduleEntries, getSiteContentSettings, getSitePricingSettings, saveSiteContentSettings, saveSitePricingSettings, updateScheduleEntry } from "./src/site-config.js";
import { buildStoreProducts, findStoreProductById, formatPriceFromCents, slugifyAlbumName } from "./src/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const CONTENT_BASE_URL = (process.env.CONTENT_BASE_URL || "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";
const OPENAI_INSTANT_MODEL = process.env.OPENAI_INSTANT_MODEL || "gpt-4.1-nano";
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "cedar", "marin"]);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const DEFAULT_SYSTEM_PROMPT = "Responda em portugues do Brasil, com tom humano, claro, respeitoso e direto. So use linguagem ou conteudo religioso se a pessoa pedir claramente ou trouxer esse contexto. Nao ofereca extras nem proximos passos que nao foram pedidos. Entregue exatamente o que a pessoa pediu, com etica, amizade e boa conversa.";
const ADMIN_USERNAME = "rosemattos";

const publicDir = path.join(__dirname, "public");
const imagesDir = path.join(__dirname, "images");
const eduSongsDir = path.join(__dirname, "musicas Edu");
const contextFilePath = path.join(__dirname, "contexto.txt");
const contentDir = path.join(__dirname, "Conteúdo");
const albumManifestStore = createAlbumManifestStore({ rootDir: __dirname });
let cachedContextPrompt = "";

const eduDownloadFiles = {
  "abandona-no-lixao": {
    downloadName: "Abandona no lixao.mp3",
    fileName: "Abandona no lix\u00E3o.mp3"
  },
  "playback-abandona-no-lixao": {
    downloadName: "Playback abandona no lixao.mp3",
    fileName: "Playback abandona no lix\u00F5a.mp3"
  },
  "lindo-cachorrinho": {
    downloadName: "Lindo Cachorrinho.mp3",
    fileName: "Lindo Cachorrinho.mp3"
  },
  "playback-lindo-cachorrinho": {
    downloadName: "PlayBack Lindo Cachorrinho.mp3",
    fileName: "PlayBack Lindo Cachorrinho.mp3"
  }
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

const DEFAULT_RESPONSE_STYLE_PROMPT = "Responda de forma direta e natural, preferencialmente em ate 500 caracteres. So ultrapasse esse limite quando isso for realmente necessario para manter clareza ou utilidade.";
const DEFAULT_PREVIEW_MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_INSTANT_MAX_COMPLETION_TOKENS || 120);
const DEFAULT_FINAL_MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_FINAL_MAX_COMPLETION_TOKENS || 220);
const allowedCorsOrigins = new Set([
  "https://www.turmadoprinty.com.br",
  "https://turmadoprinty.com.br",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost"
]);

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === ADMIN_USERNAME;
}

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return false;
  }

  if (allowedCorsOrigins.has(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function applyCorsHeaders(request, response) {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin.trim() : "";

  if (!isAllowedCorsOrigin(origin)) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Disposition");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendSseEvent(response, eventName, payload) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function buildContentDisposition(filename) {
  const safeName = String(filename || "download.mp3");
  const fallback = safeName.replace(/[^\x20-\x7E]/g, "") || "download.mp3";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

async function readApiResponse(response) {
  const rawText = await response.text();
  const text = rawText.trim();

  if (!text) {
    return { data: null, text: "" };
  }

  try {
    return {
      data: JSON.parse(text),
      text
    };
  } catch {
    return {
      data: null,
      text
    };
  }
}

async function readRawTextBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readTextBody(request) {
  return (await readRawTextBody(request)).trim();
}

function getInstantModel(body) {
  const requested = typeof body?.instantModel === "string" ? body.instantModel.trim() : "";
  return requested || OPENAI_INSTANT_MODEL || OPENAI_MODEL;
}

function getFinalModel(body) {
  const requested = typeof body?.model === "string" ? body.model.trim() : "";
  return requested || OPENAI_MODEL;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMessageForHeuristics(message) {
  return String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isLikelyGibberishMessage(message) {
  const normalized = normalizeMessageForHeuristics(message);
  const compact = normalized.replace(/\s+/g, "");

  if (!compact) {
    return false;
  }

  if (compact.length <= 3 && /[^a-z0-9]/.test(compact) === false) {
    return true;
  }

  if (/^(.)\1{4,}$/.test(compact)) {
    return true;
  }

  if (/^[a-z]{4,12}$/.test(compact) && !/[aeiou]/.test(compact)) {
    return true;
  }

  if (/^[a-z0-9]{6,18}$/.test(compact) && !/[aeiou]/.test(compact) && !/\d/.test(compact.slice(0, 2))) {
    return true;
  }

  return false;
}

function buildFastFallbackReply(message) {
  if (isLikelyGibberishMessage(message)) {
    return "Acho que sua mensagem veio truncada ou aleatoria. Me envie de novo em uma frase curta e eu respondo bem mais rapido.";
  }

  return "";
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Envie a imagem em data URL base64.");
  }

  return {
    mimeType: match[1].trim().toLowerCase(),
    buffer: Buffer.from(match[2], "base64")
  };
}

function getUploadExtension(mimeType) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

async function saveBannerAsset(dataUrl, bannerKey) {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = getUploadExtension(mimeType);

  if (!extension) {
    throw new Error("Formato de banner nao suportado. Use PNG, JPG, WEBP ou SVG.");
  }

  if (!buffer.length) {
    throw new Error("Banner vazio.");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Banner muito grande. Limite de 5 MB.");
  }

  const safeKey = String(bannerKey || "banner").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const relativeDir = path.join("uploads", "banners");
  const fileName = `${safeKey}-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absoluteDir = path.join(publicDir, relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return `/${relativeDir.replaceAll("\\", "/")}/${fileName}`;
}

async function createChatCompletion(apiKey, payload) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const { data, text } = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data?.error?.message || text || "Falha ao chamar a API da OpenAI.");
  }

  if (!data) {
    throw new Error("A OpenAI devolveu uma resposta vazia ou invalida.");
  }

  return data;
}

async function getContextPrompt() {
  if (cachedContextPrompt) {
    return cachedContextPrompt;
  }

  try {
    const contextText = (await readFile(contextFilePath, "utf8")).trim();
    cachedContextPrompt = contextText;
    return contextText;
  } catch {
    return "";
  }
}

let stripeClient = null;

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY nao configurada.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function buildCoverUrl(albumName) {
  return `${CONTENT_BASE_URL}/Capas/${encodeURIComponent(albumName)}.avif`;
}

function buildTrackUrl(albumName, trackNumber) {
  return `${CONTENT_BASE_URL}/${encodeURIComponent(albumName)}/mp3/${String(trackNumber).padStart(3, "0")}.mp3`;
}

function getBaseUrl(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const protocol = typeof forwardedProto === "string" && forwardedProto ? forwardedProto.split(",")[0].trim() : "http";
  const host = typeof forwardedHost === "string" && forwardedHost ? forwardedHost.split(",")[0].trim() : request.headers.host || "localhost:3000";
  return `${protocol}://${host}`;
}

function getAlbumPayload() {
  return albums.map((album) => ({
    ...album,
    coverUrl: buildCoverUrl(album.name)
  }));
}

function getStorePayload() {
  const products = buildStoreProducts();

  return products.map((product) => ({
    ...product,
    priceLabel: formatPriceFromCents(product.unitAmount),
    coverUrl: buildCoverUrl(product.name),
    href: `/produto.html?album=${encodeURIComponent(product.id)}`
  }));
}

function getAlbumPriceCents(pricing, productId) {
  return Number(pricing?.albumOverrides?.[productId]) || Number(pricing?.albumPriceCents) || 4990;
}

function serializeManifestTrack(track) {
  return {
    number: track.number,
    code: track.code || String(track.number).padStart(3, "0"),
    label: track.title || track.label || `Faixa ${String(track.number).padStart(3, "0")}`,
    title: track.title || track.label || `Faixa ${String(track.number).padStart(3, "0")}`,
    type: String(track.type || "full").trim().toLowerCase() === "playback" ? "playback" : "full",
    durationSeconds: Number(track.durationSeconds) || 0,
    publicUrl: track.publicUrl || "",
    playbackTrackNumber: Number(track.playbackTrackNumber) || null,
    playbackTrackCode: track.playbackTrackCode || null,
    lyrics: typeof track.lyrics === "string" ? track.lyrics : ""
  };
}

async function buildAlbumDetailResponse(product, pricing) {
  const manifestTracks = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
  const unitAmount = getAlbumPriceCents(pricing, product.id);

  return {
    ...product,
    unitAmount,
    priceLabel: formatPriceFromCents(unitAmount),
    coverUrl: buildCoverUrl(product.name),
    href: `/produto.html?album=${encodeURIComponent(product.id)}`,
    tracks: manifestTracks.map((track) => ({
      ...serializeManifestTrack(track),
      streamUrl: buildTrackUrl(product.name, track.number),
      downloadUrl: buildTrackUrl(product.name, track.number)
    })),
    hasManifest: manifestTracks.some((track) => String(track.title || "").trim())
  };
}

function extractChatCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const texts = [];

  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      texts.push(item.text);
    }
  }

  return texts.join("\n\n").trim();
}

async function readJsonBody(request) {
  const raw = await readTextBody(request);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("JSON invalido.");
  }
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username || null,
    isAdmin: isAdminUser(user),
    isContractor: Boolean(user.is_contractor),
    contractorEventId: user.contractor_event_id || null,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
    sessionExpiresAt: user.expires_at || null
  };
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9._-]{3,24}$/.test(username);
}

function detectUserToneProfile(user) {
  const firstName = String(user?.name || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

  const femaleNames = new Set([
    "ana", "maria", "julia", "juliana", "beatriz", "gabriela", "leticia", "patricia", "amanda", "camila",
    "larissa", "luiza", "fernanda", "isabela", "isabella", "mariana", "heloisa", "helena", "sophia", "sofia",
    "vitoria", "valentina", "bruna", "raquel", "priscila", "roberta", "rosa", "rose", "alice", "clara"
  ]);
  const maleNames = new Set([
    "joao", "jose", "pedro", "lucas", "mateus", "matheus", "gabriel", "davi", "daniel", "rafael",
    "samuel", "henrique", "guilherme", "vinicius", "leonardo", "thiago", "rodrigo", "marcos", "paulo", "miguel"
  ]);

  if (femaleNames.has(firstName)) {
    return {
      label: "amiga",
      prompt: "Quando fizer sentido usar um vocativo curto, trate a pessoa no feminino, com naturalidade, como 'amiga'."
    };
  }

  if (maleNames.has(firstName)) {
    return {
      label: "amigo",
      prompt: "Quando fizer sentido usar um vocativo curto, trate a pessoa no masculino, com naturalidade, como 'amigo'."
    };
  }

  return {
    label: "pessoa",
    prompt: "Se o genero nao estiver claro pelo nome, mantenha linguagem neutra e natural, sem forcar vocativos."
  };
}

function sanitizeAdminUserMessage(message) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    userId: message.userId,
    title: message.title,
    body: message.body,
    createdAt: message.createdAt,
    dismissedAt: message.dismissedAt,
    sentByUserId: message.sentByUserId,
    userReplyBody: message.userReplyBody,
    userReplyCreatedAt: message.userReplyCreatedAt
  };
}

async function requireAuth(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para liberar cadastro e login."
    });
    return null;
  }

  const token = parseBearerToken(request.headers.authorization);

  if (!token) {
    sendJson(response, 401, { error: "Token ausente." });
    return null;
  }

  const user = await findUserBySessionToken(token);

  if (!user) {
    sendJson(response, 401, { error: "Sessao invalida ou expirada." });
    return null;
  }

  try {
    await touchUserPresence(user.id);
  } catch {
    // Presenca nao deve bloquear requests autenticadas.
  }

  return user;
}

async function requireAdmin(request, response) {
  const user = await requireAuth(request, response);

  if (!user) {
    return null;
  }

  if (!isAdminUser(user)) {
    sendJson(response, 403, { error: "Acesso restrito ao administrador." });
    return null;
  }

  return user;
}

async function ensurePaymentsReady(response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres e rode o SQL de inicializacao para liberar pagamentos."
    });
    return false;
  }

  try {
    await ensurePaymentSchema();
    await ensureSiteConfigSchema();
    await ensureAdminUsersSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar o schema de pagamentos.",
      hint: "Confirme se o banco aceita criar tabelas e se a extensao pgcrypto esta habilitada."
    });
    return false;
  }

  return true;
}

function getTrackDownloadUrl(productName, trackNumber) {
  return buildTrackUrl(productName, trackNumber);
}

function getStripeEnvironment() {
  return STRIPE_SECRET_KEY.startsWith("sk_live_") ? "production" : "test";
}

function buildStripeSuccessUrl(baseUrl, pathname, queryKey, value) {
  return `${baseUrl}${pathname}?${queryKey}=${encodeURIComponent(value)}&payment=return&session_id={CHECKOUT_SESSION_ID}`;
}

function normalizeStripeSubscriptionStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active" || normalized === "trialing") {
    return "ACTIVE";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return "OVERDUE";
  }

  if (normalized === "canceled") {
    return "CANCELED";
  }

  if (normalized === "incomplete" || normalized === "incomplete_expired") {
    return "DECLINED";
  }

  return normalized ? normalized.toUpperCase() : "PENDING";
}

function normalizeStripePaymentStatus(status) {
  return String(status || "").trim().toLowerCase() === "paid" ? "PAID" : "PENDING";
}

function getEventObject(event) {
  return event?.data?.object || {};
}

function getMetadataReferenceId(payload) {
  return payload?.metadata?.referenceId || payload?.metadata?.reference_id || null;
}

function getStripeInvoiceReferenceId(invoice) {
  return getMetadataReferenceId(invoice) || getMetadataReferenceId(invoice?.parent?.subscription_details) || null;
}

function toIsoDateFromUnix(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function extractChatUsageTokens(payload) {
  const usage = payload?.usage || {};
  const totalTokens = Number(usage.total_tokens);
  return Number.isFinite(totalTokens) && totalTokens > 0 ? totalTokens : 0;
}

function estimateNarrationDurationSeconds(text) {
  const safeText = String(text || "").trim();

  if (!safeText) {
    return 0;
  }

  const words = safeText.split(/\s+/).filter(Boolean).length;
  if (!words) {
    return 0;
  }

  return Math.max(1, Math.round(words / 2.6));
}

async function handleGptRequest(request, response, user = null) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const contextPrompt = await getContextPrompt();
  const systemBase = typeof body.system === "string" && body.system.trim() ? body.system.trim() : DEFAULT_SYSTEM_PROMPT;
  const responseStylePrompt = typeof body.responseStyle === "string" && body.responseStyle.trim()
    ? body.responseStyle.trim()
    : DEFAULT_RESPONSE_STYLE_PROMPT;
  const userToneProfile = detectUserToneProfile(user);
  const userPrompt = user?.name
    ? `Nome da pessoa: ${user.name}.\n${userToneProfile.prompt}`
    : userToneProfile.prompt;
  const system = contextPrompt
    ? `${systemBase}\n\n${responseStylePrompt}\n\n${userPrompt}\n\nContexto principal da Turma do Printy:\n${contextPrompt}`
    : `${systemBase}\n\n${responseStylePrompt}\n\n${userPrompt}`;
  const requestedFinalModel = getFinalModel(body);
  const instantModel = getInstantModel(body);
  const history = Array.isArray(body.history) ? body.history : [];
  const wantsStream = Boolean(body.stream) || String(request.headers.accept || "").includes("text/event-stream");
  const previewMaxCompletionTokens = getPositiveInteger(body.previewMaxCompletionTokens, DEFAULT_PREVIEW_MAX_COMPLETION_TOKENS);
  const finalMaxCompletionTokens = getPositiveInteger(body.maxCompletionTokens, DEFAULT_FINAL_MAX_COMPLETION_TOKENS);

  if (!message) {
    sendJson(response, 400, { error: "Envie um campo 'message' com texto." });
    return;
  }

  const fallbackReply = buildFastFallbackReply(message);

  if (fallbackReply) {
    if (wantsStream) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });
      response.write(`data: ${JSON.stringify({ type: "preview", model: "local-fast-path", text: fallbackReply })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: "done", text: fallbackReply })}\n\n`);
      response.end();
      return;
    }

    sendJson(response, 200, {
      ok: true,
      model: "local-fast-path",
      outputText: fallbackReply,
      raw: null
    });
    return;
  }

  const model = requestedFinalModel;

  const messages = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
    .slice(-4)
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }));

  const requestPayload = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages,
      { role: "user", content: message }
    ],
    max_completion_tokens: finalMaxCompletionTokens
  };

  try {
    if (wantsStream) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });

      const sendEvent = (payload) => {
        response.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      let finalStarted = false;
      let previewSent = false;

      sendEvent({ type: "status", stage: "preview", message: "Montando uma resposta imediata..." });

      const shouldRunPreview = instantModel && instantModel !== model;
      const previewPromise = shouldRunPreview
        ? createChatCompletion(apiKey, {
          model: instantModel,
          messages: [
            ...(system ? [{ role: "system", content: `${system}\n\nEntregue primeiro uma resposta imediata, curta e pratica em ate 500 caracteres.` }] : []),
            ...messages,
            { role: "user", content: message }
          ],
          max_completion_tokens: previewMaxCompletionTokens
        })
          .then((previewPayload) => {
            const previewText = extractChatCompletionText(previewPayload);
            void recordTextTokenUsage(user?.id, extractChatUsageTokens(previewPayload));

            if (!previewText || finalStarted || previewSent) {
              return;
            }

            previewSent = true;
            sendEvent({
              type: "preview",
              model: previewPayload.model || instantModel,
              text: previewText
            });
          })
          .catch(() => {
            if (!finalStarted && !previewSent) {
              sendEvent({
                type: "status",
                stage: "preview",
                message: "Seguindo com a resposta principal..."
              });
            }
          })
        : Promise.resolve();

      const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          ...requestPayload,
          stream: true,
          stream_options: {
            include_usage: true
          }
        })
      });

      if (!openAiResponse.ok) {
        const { data: payload, text } = await readApiResponse(openAiResponse);
        sendEvent({
          type: "error",
          message: payload?.error?.message || text || "Falha ao chamar a API da OpenAI."
        });
        response.end();
        return;
      }

      const reader = openAiResponse.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let streamedUsageTokens = 0;

      if (!reader) {
        sendEvent({ type: "error", message: "A OpenAI nao devolveu stream de resposta." });
        response.end();
        return;
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine.startsWith("data:")) {
            continue;
          }

          const payloadText = trimmedLine.slice(5).trim();

          if (!payloadText || payloadText === "[DONE]") {
            continue;
          }

          const payload = JSON.parse(payloadText);
          const delta = payload?.choices?.[0]?.delta?.content;
          const usageTokens = extractChatUsageTokens(payload);

          if (usageTokens > 0) {
            streamedUsageTokens = usageTokens;
          }

          if (typeof delta === "string" && delta) {
            if (!finalStarted) {
              finalStarted = true;
              sendEvent({ type: "status", stage: "final", message: "Respondendo..." });
            }
            finalText += delta;
            sendEvent({ type: "delta", text: delta });
          }
        }
      }

      await previewPromise;
      void recordTextTokenUsage(user?.id, streamedUsageTokens);
      sendEvent({ type: "done", text: finalText });
      response.end();
      return;
    }

    const payload = await createChatCompletion(apiKey, requestPayload);
    void recordTextTokenUsage(user?.id, extractChatUsageTokens(payload));

    sendJson(response, 200, {
      ok: true,
      model: payload.model,
      outputText: extractChatCompletionText(payload),
      raw: payload
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao chamar a OpenAI.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

function decodeBase64Audio(base64Audio) {
  if (typeof base64Audio !== "string" || !base64Audio.trim()) {
    throw new Error("Audio ausente.");
  }

  return Buffer.from(base64Audio, "base64");
}

async function handleAudioTranscription(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" && body.mimeType.trim() ? body.mimeType.trim() : "audio/webm";
  const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "speech.webm";

  let audioBuffer;

  try {
    audioBuffer = decodeBase64Audio(audioBase64);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  if (audioBuffer.length === 0) {
    sendJson(response, 400, { error: "Audio vazio." });
    return;
  }

  try {
    const formData = new FormData();
    formData.append("model", OPENAI_TRANSCRIBE_MODEL);
    formData.append("language", "pt");
    formData.append("file", new Blob([audioBuffer], { type: mimeType }), fileName);

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const { data: payload, text } = await readApiResponse(transcriptionResponse);

    if (!transcriptionResponse.ok) {
      sendJson(response, transcriptionResponse.status, {
        error: "Falha ao transcrever o audio.",
        details: payload || text || "Resposta vazia da OpenAI."
      });
      return;
    }

    if (!payload) {
      sendJson(response, 502, {
        error: "A OpenAI devolveu uma resposta vazia ou invalida na transcricao."
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      text: typeof payload.text === "string" ? payload.text.trim() : "",
      model: OPENAI_TRANSCRIBE_MODEL
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao transcrever o audio.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function handleAudioSpeech(request, response, user = null) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const safeText = text.slice(0, 3900);
  const voice = typeof body.voice === "string" && OPENAI_TTS_VOICES.has(body.voice.trim()) ? body.voice.trim() : "alloy";

  if (!safeText) {
    sendJson(response, 400, { error: "Texto ausente para sintetizar audio." });
    return;
  }

  try {
    const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_TTS_MODEL,
        voice,
        response_format: "mp3",
        input: safeText
      })
    });

    if (!speechResponse.ok) {
      const { data: payload, text: rawText } = await readApiResponse(speechResponse);
      sendJson(response, speechResponse.status, {
        error: "Falha ao gerar o audio da OpenAI.",
        details: payload || rawText || "Resposta vazia da OpenAI."
      });
      return;
    }

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    void recordNarrationUsage(user?.id, estimateNarrationDurationSeconds(safeText));
    response.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store"
    });
    response.end(audioBuffer);
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao gerar audio.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function createStripeCheckout({ request, user, product }) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(request);
  const referenceId = `printy-${product.id}-${crypto.randomUUID()}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: buildStripeSuccessUrl(baseUrl, "/produto.html", "album", product.id),
    cancel_url: `${baseUrl}/produto.html?album=${encodeURIComponent(product.id)}`,
    locale: "pt-BR",
    customer_email: user.email || undefined,
    client_reference_id: referenceId,
    metadata: {
      kind: "album_purchase",
      referenceId,
      productId: product.id,
      userId: user.id
    },
    line_items: [
      {
        quantity: product.quantity,
        price_data: {
          currency: "brl",
          unit_amount: product.unitAmount,
          product_data: {
            name: product.name,
            description: product.description
          }
        }
      }
    ]
  });

  return {
    checkoutId: session.id,
    referenceId,
    payUrl: session.url,
    raw: session
  };
}

async function handleStripeCheckoutRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Produto nao encontrado." });
    return;
  }

  try {
    const checkout = await createStripeCheckout({ request, user, product });
    await createAlbumPurchaseRecord({
      userId: user.id,
      productId: product.id,
      referenceId: checkout.referenceId,
      checkoutId: checkout.checkoutId,
      amountCents: product.unitAmount,
      environment: getStripeEnvironment(),
      payload: checkout.raw
    });
    sendJson(response, 200, {
      ok: true,
      product: {
        id: product.id,
        name: product.name,
        priceLabel: formatPriceFromCents(product.unitAmount)
      },
      checkoutId: checkout.checkoutId,
      referenceId: checkout.referenceId,
      payUrl: checkout.payUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao criar checkout Stripe."
    });
  }
}

async function createStripeSubscriptionCheckout({ request, user, plan }) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(request);
  const referenceId = `printy-plan-${plan.id}-${crypto.randomUUID()}`;
  const intervalUnit = String(plan.intervalUnit || "MONTH").toLowerCase();
  const recurringInterval = intervalUnit === "year" || intervalUnit === "month" ? intervalUnit : "month";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: buildStripeSuccessUrl(baseUrl, "/planos.html", "plan", plan.id),
    cancel_url: `${baseUrl}/planos.html?plan=${encodeURIComponent(plan.id)}`,
    locale: "pt-BR",
    customer_email: user.email || undefined,
    client_reference_id: referenceId,
    metadata: {
      kind: "plan_subscription",
      referenceId,
      planId: plan.id,
      userId: user.id
    },
    subscription_data: {
      metadata: {
        kind: "plan_subscription",
        referenceId,
        planId: plan.id,
        userId: user.id
      }
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          recurring: {
            interval: recurringInterval,
            interval_count: Math.max(1, Number(plan.intervalLength) || 1)
          },
          unit_amount: plan.unitAmount,
          product_data: {
            name: `Plano ${plan.name}`,
            description: `Assinatura ${plan.name} da Turma do Printy`
          }
        }
      }
    ]
  });

  return {
    checkoutId: session.id,
    referenceId,
    payUrl: session.url,
    recurrencePlanId: session.subscription || null,
    raw: session
  };
}

async function handleStripeSubscriptionCheckoutRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  const pricing = await getSitePricingSettings();
  const plan = buildSubscriptionPlans(pricing.planPrices).find((item) => item.id === planId) || findSubscriptionPlanById(planId);

  if (!plan || plan.id === "gratis") {
    sendJson(response, 404, { error: "Plano recorrente nao encontrado." });
    return;
  }

  try {
    const checkout = await createStripeSubscriptionCheckout({ request, user, plan });
    await createPlanSubscriptionRecord({
      userId: user.id,
      planId: plan.id,
      referenceId: checkout.referenceId,
      checkoutId: checkout.checkoutId,
      amountCents: plan.unitAmount,
      environment: getStripeEnvironment(),
      payload: checkout.raw
    });
    sendJson(response, 200, {
      ok: true,
      plan: {
        id: plan.id,
        name: plan.name,
        priceLabel: formatPriceFromCents(plan.unitAmount)
      },
      checkoutId: checkout.checkoutId,
      referenceId: checkout.referenceId,
      recurrencePlanId: checkout.recurrencePlanId,
      payUrl: checkout.payUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao criar checkout recorrente Stripe."
    });
  }
}

async function handleStripeWebhook(request, response) {
  const rawBody = await readRawTextBody(request);
  let event = null;

  try {
    const stripe = getStripeClient();
    const signature = request.headers["stripe-signature"];

    if (STRIPE_WEBHOOK_SECRET && typeof signature === "string" && rawBody) {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } else if (rawBody) {
      event = JSON.parse(rawBody);
    }
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Webhook Stripe invalido."
    });
    return;
  }

  if (!event && rawBody) {
    try {
      event = JSON.parse(rawBody);
    } catch {
      event = null;
    }
  }

  const payload = event || {};
  const resource = getEventObject(payload);
  const referenceId = getMetadataReferenceId(resource) || getStripeInvoiceReferenceId(resource);

  if (hasDatabase()) {
    try {
      await recordPaymentWebhookEvent({
        eventType: payload?.type || "unknown",
        resourceId: resource?.id || null,
        referenceId,
        payload
      });

      if (referenceId) {
        if (referenceId.startsWith("printy-plan-")) {
          let nextStatus = "PENDING";
          let activatedAt = null;
          let canceledAt = null;
          let subscriptionId = null;

          if (payload?.type === "checkout.session.completed") {
            nextStatus = resource?.mode === "subscription"
              ? normalizeStripeSubscriptionStatus(resource?.payment_status === "paid" ? "active" : "incomplete")
              : normalizeStripePaymentStatus(resource?.payment_status);
            activatedAt = isActiveSubscriptionStatus(nextStatus) ? new Date().toISOString() : null;
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "checkout.session.async_payment_succeeded") {
            nextStatus = "ACTIVE";
            activatedAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "checkout.session.async_payment_failed") {
            nextStatus = "DECLINED";
            canceledAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "invoice.paid") {
            nextStatus = "ACTIVE";
            activatedAt = toIsoDateFromUnix(resource?.status_transitions?.paid_at) || new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "invoice.payment_failed") {
            nextStatus = "OVERDUE";
            canceledAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "customer.subscription.updated" || payload?.type === "customer.subscription.deleted") {
            nextStatus = normalizeStripeSubscriptionStatus(resource?.status);
            activatedAt = isActiveSubscriptionStatus(nextStatus) ? toIsoDateFromUnix(resource?.current_period_start) : null;
            canceledAt = isInactiveSubscriptionStatus(nextStatus) ? toIsoDateFromUnix(resource?.canceled_at) || new Date().toISOString() : null;
            subscriptionId = resource?.id || null;
          }

          await markPlanSubscriptionStatus({
            referenceId,
            status: nextStatus,
            subscriptionId,
            payload,
            activatedAt,
            canceledAt
          });
        } else {
          const paymentStatus = payload?.type === "checkout.session.async_payment_failed"
            ? "DECLINED"
            : normalizeStripePaymentStatus(resource?.payment_status);

          await markAlbumPurchaseStatus({
            referenceId,
            status: paymentStatus,
            orderId: resource?.payment_intent || resource?.id || null,
            chargeId: resource?.payment_intent || null,
            payload,
            paidAt: isActivePaymentStatus(paymentStatus) ? new Date().toISOString() : null
          });
        }
      }
    } catch (error) {
      console.error("[Stripe webhook error]", error);
    }
  }

  console.log("[Stripe webhook]", JSON.stringify(payload));
  sendJson(response, 200, { ok: true });
}

async function handleAccessStateRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(user),
      access: accessState
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar acessos do usuario."
    });
  }
}

async function handleSiteConfigRequest(response) {
  try {
    const [pricing, schedule, content] = await Promise.all([
      getSitePricingSettings(),
      getScheduleEntries(),
      getSiteContentSettings()
    ]);

    sendJson(response, 200, {
      ok: true,
      pricing,
      schedule,
      banners: content.banners,
      textOverrides: content.textOverrides
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar configuracoes do site."
    });
  }
}

async function handleAdminBannerUpdate(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para salvar banners."
    });
    return;
  }

  try {
    await ensureSiteConfigSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar configuracoes do site."
    });
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const bannerKey = typeof body.bannerKey === "string" ? body.bannerKey.trim() : "";
  const target = typeof body.target === "string" ? body.target.trim().toLowerCase() : "";
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";

  if (!bannerKey) {
    sendJson(response, 400, { error: "Informe o banner que deseja trocar." });
    return;
  }

  if (!["mobile", "desktop", "both"].includes(target)) {
    sendJson(response, 400, { error: "Escolha mobile, desktop ou ambos." });
    return;
  }

  if (!imageDataUrl) {
    sendJson(response, 400, { error: "Envie a imagem do banner." });
    return;
  }

  try {
    const imageUrl = await saveBannerAsset(imageDataUrl, bannerKey);
    const currentContent = await getSiteContentSettings();
    const nextBanners = {
      ...currentContent.banners,
      [bannerKey]: {
        ...(currentContent.banners?.[bannerKey] || {})
      }
    };

    if (target === "desktop" || target === "both") {
      nextBanners[bannerKey].desktop = imageUrl;
    }

    if (target === "mobile" || target === "both") {
      nextBanners[bannerKey].mobile = imageUrl;
    }

    const content = await saveSiteContentSettings({
      banners: nextBanners,
      textOverrides: currentContent.textOverrides
    });

    sendJson(response, 200, {
      ok: true,
      banners: content.banners,
      bannerKey,
      imageUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar banner."
    });
  }
}

async function handleAdminTextOverrideUpdate(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para salvar textos globais."
    });
    return;
  }

  try {
    await ensureSiteConfigSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar configuracoes do site."
    });
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!key) {
    sendJson(response, 400, { error: "Informe a chave do texto." });
    return;
  }

  if (!text) {
    sendJson(response, 400, { error: "Informe o novo texto." });
    return;
  }

  try {
    const currentContent = await getSiteContentSettings();
    const content = await saveSiteContentSettings({
      banners: currentContent.banners,
      textOverrides: {
        ...currentContent.textOverrides,
        [key]: text
      }
    });

    sendJson(response, 200, {
      ok: true,
      textOverrides: content.textOverrides,
      key,
      text
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar texto."
    });
  }
}

async function handleAdminPricingUpdate(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const albumPriceCents = Number(body.albumPriceCents);
  const planPrices = {
    gratis: 0,
    plus: Number(body?.planPrices?.plus),
    pro: Number(body?.planPrices?.pro),
    life: Number(body?.planPrices?.life)
  };

  if (!Number.isInteger(albumPriceCents) || albumPriceCents < 0) {
    sendJson(response, 400, { error: "Preco dos albuns invalido." });
    return;
  }

  if (!Number.isInteger(planPrices.plus) || !Number.isInteger(planPrices.pro) || !Number.isInteger(planPrices.life)) {
    sendJson(response, 400, { error: "Precos dos planos invalidos." });
    return;
  }

  try {
    const currentPricing = await getSitePricingSettings();
    const pricing = await saveSitePricingSettings({
      albumPriceCents,
      albumOverrides: currentPricing.albumOverrides,
      planPrices
    });
    sendJson(response, 200, { ok: true, pricing });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar precos."
    });
  }
}

async function handleAdminScheduleCreate(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const monthLabel = typeof body.monthLabel === "string" ? body.monthLabel.trim() : "";
  const dateLabel = typeof body.dateLabel === "string" ? body.dateLabel.trim() : "";
  const place = typeof body.place === "string" ? body.place.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";

  if (!monthLabel || !dateLabel || !place || !city || !time) {
    sendJson(response, 400, { error: "Preencha mes, data, igreja, cidade e horario." });
    return;
  }

  try {
    const entry = await createScheduleEntry({ monthLabel, dateLabel, place, city, time });
    sendJson(response, 200, { ok: true, entry });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar agenda."
    });
  }
}

async function handleAdminAlbumDetail(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace("/api/admin/albums/", ""));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  const detail = await buildAlbumDetailResponse(product, pricing);
  sendJson(response, 200, { ok: true, album: detail });
}

async function handleAdminAlbumUpdate(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace("/api/admin/albums/", ""));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  const priceCents = Number(body.priceCents);

  if (!Number.isInteger(priceCents) || priceCents < 0) {
    sendJson(response, 400, { error: "Preco do album invalido." });
    return;
  }

  if (tracks.length !== product.tracks) {
    sendJson(response, 400, { error: "Quantidade de faixas invalida para este album." });
    return;
  }

  const nextTracks = tracks.map((track, index) => {
    const number = index + 1;
    const type = String(track?.type || "full").trim().toLowerCase() === "playback" ? "playback" : "full";
    const playbackTrackNumber = type === "full" ? Number(track?.playbackTrackNumber) || null : null;
    const playbackTrackCode = playbackTrackNumber ? String(playbackTrackNumber).padStart(3, "0") : null;

    return {
      number,
      code: String(track?.code || number).padStart(3, "0"),
      title: typeof track?.title === "string" && track.title.trim() ? track.title.trim() : `Faixa ${String(number).padStart(3, "0")}`,
      type,
      durationSeconds: Number(track?.durationSeconds) || 0,
      publicUrl: track?.publicUrl || buildTrackUrl(product.name, number),
      playbackTrackNumber,
      playbackTrackCode,
      lyrics: typeof track?.lyrics === "string" ? track.lyrics : ""
    };
  });

  try {
    await albumManifestStore.writeAlbumManifest(product.name, nextTracks);

    const albumOverrides = {
      ...(pricing.albumOverrides || {}),
      [product.id]: priceCents
    };

    await saveSitePricingSettings({
      albumPriceCents: pricing.albumPriceCents,
      albumOverrides,
      planPrices: pricing.planPrices
    });

    const nextPricing = await getSitePricingSettings();
    const detail = await buildAlbumDetailResponse(product, nextPricing);
    sendJson(response, 200, { ok: true, album: detail });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar album."
    });
  }
}

async function handleProtectedTrackDownload(request, response, pathname) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  const match = pathname.match(/^\/api\/store\/products\/([^/]+)\/tracks\/(\d+)\/download$/);

  if (!match) {
    sendJson(response, 404, { error: "Download nao encontrado." });
    return;
  }

  const productId = decodeURIComponent(match[1]);
  const trackNumber = Number(match[2]);
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product || !Number.isInteger(trackNumber) || trackNumber < 1 || trackNumber > product.tracks) {
    sendJson(response, 404, { error: "Faixa nao encontrada." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    const hasAlbumPurchase = accessState.purchasedAlbumIds.includes(product.id);
    const manifestTracks = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
    const track = manifestTracks.find((item) => Number(item.number) === trackNumber);

    if (!track) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const canDownloadByPlan = canDownloadTrackForPlan(accessState.plan?.id, {
      albumName: product.name,
      trackType: track.type
    });

    if (!canDownloadByPlan && !hasAlbumPurchase) {
      sendJson(response, 403, {
        error: "Seu plano nao libera download desta faixa."
      });
      return;
    }

    const assetResponse = await fetch(getTrackDownloadUrl(product.name, trackNumber));

    if (!assetResponse.ok || !assetResponse.body) {
      sendJson(response, assetResponse.status || 502, {
        error: "Nao foi possivel baixar a faixa agora."
      });
      return;
    }

    const contentType = assetResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = assetResponse.headers.get("content-length");
    const fileName = `${slugifyAlbumName(product.name)}-${String(trackNumber).padStart(3, "0")}.mp3`;

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      ...(contentLength ? { "Content-Length": contentLength } : {})
    });

    Readable.fromWeb(assetResponse.body).pipe(response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao validar download."
    });
  }
}

async function serveStatic(response, filePath) {
  try {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Erro ao carregar arquivo.");
  }
}

async function handleAdminUsersList(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  try {
    const pricing = await getSitePricingSettings();
    const [users, schedule] = await Promise.all([
      listUsersWithAdminData(pricing.planPrices),
      getScheduleEntries()
    ]);

    sendJson(response, 200, {
      ok: true,
      users,
      plans: buildSubscriptionPlans(pricing.planPrices),
      schedule
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar usuarios."
    });
  }
}

async function handleAdminUserPlanUpdate(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";

  try {
    if (!planId || planId === "gratis") {
      await removeUserPlanOverride(userId);
    } else {
      await setUserPlanOverride({
        userId,
        planId,
        assignedByUserId: adminUser.id
      });
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao atualizar plano do usuario."
    });
  }
}

async function handleAdminUserContractorUpdate(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    await setUserContractorStatus({
      userId,
      isContractor: Boolean(body.isContractor),
      contractorEventId: typeof body.contractorEventId === "string" ? body.contractorEventId.trim() : ""
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao atualizar contratante."
    });
  }
}

async function handleAdminUserDelete(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  if (userId === adminUser.id) {
    sendJson(response, 400, { error: "A conta administradora nao pode ser excluida por aqui." });
    return;
  }

  try {
    await deleteUserById(userId);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao excluir usuario."
    });
  }
}

async function handleAdminUserMessageSend(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const messageText = typeof body.body === "string" ? body.body.trim() : "";

  if (!title) {
    sendJson(response, 400, { error: "Informe o titulo da mensagem." });
    return;
  }

  if (!messageText) {
    sendJson(response, 400, { error: "Digite o texto da mensagem." });
    return;
  }

  if (messageText.length > 500) {
    sendJson(response, 400, { error: "A mensagem pode ter no maximo 500 caracteres." });
    return;
  }

  try {
    const message = await sendAdminUserMessage({
      userId,
      title,
      body: messageText,
      sentByUserId: adminUser.id
    });

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao enviar mensagem ao usuario."
    });
  }
}

async function handleCurrentUserMessage(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  try {
    const message = await getActiveAdminUserMessage(user.id);
    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar mensagem do usuario."
    });
  }
}

async function handleCurrentUserMessageDismiss(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";

  if (!messageId) {
    sendJson(response, 400, { error: "Informe a mensagem para fechar." });
    return;
  }

  try {
    const message = await dismissAdminUserMessage({
      userId: user.id,
      messageId
    });

    if (!message) {
      sendJson(response, 404, { error: "Mensagem nao encontrada ou ja fechada." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao fechar mensagem."
    });
  }
}

async function handleCurrentUserMessageReply(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
  const replyText = typeof body.body === "string" ? body.body.trim() : "";

  if (!messageId) {
    sendJson(response, 400, { error: "Informe a mensagem para responder." });
    return;
  }

  if (!replyText) {
    sendJson(response, 400, { error: "Digite sua resposta." });
    return;
  }

  if (replyText.length > 500) {
    sendJson(response, 400, { error: "A resposta pode ter no maximo 500 caracteres." });
    return;
  }

  try {
    const message = await saveUserReplyToAdminMessage({
      userId: user.id,
      messageId,
      body: replyText
    });

    if (!message) {
      sendJson(response, 404, { error: "Mensagem nao encontrada ou indisponivel para resposta." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao enviar resposta."
    });
  }
}

async function handleContractorEventUpdate(request, response, eventId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const schedule = await getScheduleEntries();
    const event = schedule.find((item) => item.id === eventId);

    if (!event) {
      sendJson(response, 404, { error: "Evento nao encontrado." });
      return;
    }

    if (!isAdminUser(user) && event.contractorUserId !== user.id) {
      sendJson(response, 403, { error: "Esse evento nao esta vinculado a sua conta." });
      return;
    }

    const updatedEvent = await updateScheduleEntry({
      eventId,
      dateLabel: typeof body.dateLabel === "string" ? body.dateLabel.trim() : event.dateLabel,
      place: typeof body.place === "string" ? body.place.trim() : event.place,
      city: typeof body.city === "string" ? body.city.trim() : event.city,
      time: typeof body.time === "string" ? body.time.trim() : event.time
    });

    sendJson(response, 200, {
      ok: true,
      event: updatedEvent
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao atualizar evento."
    });
  }
}

async function handleEduDownload(response, pathname) {
  const match = pathname.match(/^\/downloads\/edu\/([^/]+)$/);
  const slug = match?.[1] || "";
  const fileConfig = eduDownloadFiles[slug];

  if (!fileConfig) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Download nao encontrado.");
    return;
  }

  const filePath = path.join(eduSongsDir, fileConfig.fileName);

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo nao encontrado.");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": buildContentDisposition(fileConfig.downloadName),
    "Cache-Control": "public, max-age=3600"
  });

  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const { pathname } = requestUrl;

  applyCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "turma-do-printy-api",
      date: new Date().toISOString(),
      env: {
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasStripeKey: Boolean(STRIPE_SECRET_KEY),
        hasStripeWebhookSecret: Boolean(STRIPE_WEBHOOK_SECRET),
        contentBaseUrl: CONTENT_BASE_URL,
        model: OPENAI_MODEL,
        instantModel: OPENAI_INSTANT_MODEL,
        transcribeModel: OPENAI_TRANSCRIBE_MODEL,
        stripeEnvironment: getStripeEnvironment()
      }
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/db/health") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        ok: false,
        error: "DATABASE_URL nao configurada."
      });
      return;
    }

    try {
      const result = await query("select now() as now");
      sendJson(response, 200, {
        ok: true,
        now: result.rows[0].now
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao conectar no banco."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/albums") {
    sendJson(response, 200, {
      items: getAlbumPayload(),
      total: albums.length
    });
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/albums/")) {
    const albumName = decodeURIComponent(pathname.replace("/api/albums/", ""));
    const album = albums.find((item) => item.name === albumName);

    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ...album,
      coverUrl: buildCoverUrl(album.name),
      tracks: Array.from({ length: album.tracks }, (_, index) => {
        const number = index + 1;

        return {
          number,
          label: `Faixa ${String(number).padStart(3, "0")}`,
          url: buildTrackUrl(album.name, number)
        };
      })
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/site/config") {
    await handleSiteConfigRequest(response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/downloads/edu/")) {
    await handleEduDownload(response, pathname);
    return;
  }

  if (request.method === "GET" && pathname === "/api/store/products") {
    const pricing = await getSitePricingSettings();
    const storeProducts = buildStoreProducts(pricing.albumPriceCents, pricing.albumOverrides);
    sendJson(response, 200, {
      items: storeProducts.map((product) => ({
        ...product,
        priceLabel: formatPriceFromCents(product.unitAmount),
        coverUrl: buildCoverUrl(product.name),
        href: `/produto.html?album=${encodeURIComponent(product.id)}`
      })),
      total: storeProducts.length
    });
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/store/products/")) {
    const trackDownloadMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/tracks\/(\d+)\/download$/);

    if (trackDownloadMatch) {
      await handleProtectedTrackDownload(request, response, pathname);
      return;
    }

    const productId = decodeURIComponent(pathname.replace("/api/store/products/", ""));
    const pricing = await getSitePricingSettings();
    const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

    if (!product) {
      sendJson(response, 404, { error: "Produto nao encontrado." });
      return;
    }

    sendJson(response, 200, await buildAlbumDetailResponse(product, pricing));
    return;
  }

  if (request.method === "POST" && pathname === "/api/gpt/ask") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleGptRequest(request, response, user);
    return;
  }

  if (request.method === "POST" && pathname === "/api/audio/transcribe") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleAudioTranscription(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/audio/speak") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleAudioSpeech(request, response, user);
    return;
  }

  if (request.method === "GET" && pathname === "/api/account/access") {
    await handleAccessStateRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/checkout" || pathname === "/api/payments/pagbank/checkout")) {
    await handleStripeCheckoutRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/subscription-checkout" || pathname === "/api/payments/pagbank/subscription-checkout")) {
    await handleStripeSubscriptionCheckoutRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/webhook" || pathname === "/api/payments/pagbank/webhook")) {
    await handleStripeWebhook(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        error: "DATABASE_URL nao configurada.",
        hint: "Configure o Postgres e rode o SQL de inicializacao."
      });
      return;
    }

    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2) {
      sendJson(response, 400, { error: "Nome invalido." });
      return;
    }

    if (!isValidUsername(username)) {
      sendJson(response, 400, { error: "Use um nome de usuario com 3 a 24 caracteres, letras, numeros, ponto, tracinho ou underline." });
      return;
    }

    if (password.length < 6) {
      sendJson(response, 400, { error: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    try {
      const existingUser = await findUserByUsername(username);

      if (existingUser) {
        sendJson(response, 409, { error: "Esse nome de usuario ja esta em uso." });
        return;
      }

      const user = await createUser({ name, username, password });
      const session = await createSession(user.id);

      sendJson(response, 201, {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: sanitizeUser(user)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao criar usuario."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/verify-code") {
    sendJson(response, 410, {
      error: "A confirmacao por email esta pausada nesta versao."
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        error: "DATABASE_URL nao configurada.",
        hint: "Configure o Postgres e rode o SQL de inicializacao."
      });
      return;
    }

    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidUsername(username) || !password) {
      sendJson(response, 400, { error: "Nome de usuario e senha sao obrigatorios." });
      return;
    }

    try {
      const user = await findUserByUsername(username);

      if (!user) {
        sendJson(response, 401, { error: "Credenciais invalidas." });
        return;
      }

      const passwordMatches = await verifyPassword(password, user.password_hash);

      if (!passwordMatches) {
        sendJson(response, 401, { error: "Credenciais invalidas." });
        return;
      }

      const session = await createSession(user.id);

      sendJson(response, 200, {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: sanitizeUser(user)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao fazer login."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const contractorState = await getUserContractorState(user.id);

      sendJson(response, 200, {
        ok: true,
        user: sanitizeUser({
          ...user,
          is_contractor: contractorState.isContractor,
          contractor_event_id: contractorState.contractorEventId
        })
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao validar sessao."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/users") {
    await handleAdminUsersList(request, response);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/users\/[^/]+\/plan$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/plan$/, "$1"));
    await handleAdminUserPlanUpdate(request, response, userId);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/users\/[^/]+\/contractor$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/contractor$/, "$1"));
    await handleAdminUserContractorUpdate(request, response, userId);
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)$/, "$1"));
    await handleAdminUserDelete(request, response, userId);
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/admin\/users\/[^/]+\/message$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/message$/, "$1"));
    await handleAdminUserMessageSend(request, response, userId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/account/message") {
    await handleCurrentUserMessage(request, response);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/account/message/dismiss") {
    await handleCurrentUserMessageDismiss(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/account/message/reply") {
    await handleCurrentUserMessageReply(request, response);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/events\/[^/]+\/contractor$/)) {
    const eventId = decodeURIComponent(pathname.replace(/^\/api\/events\/([^/]+)\/contractor$/, "$1"));
    await handleContractorEventUpdate(request, response, eventId);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/admin/pricing") {
    await handleAdminPricingUpdate(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/schedule") {
    await handleAdminScheduleCreate(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/site/banner") {
    await handleAdminBannerUpdate(request, response);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/admin/site/text") {
    await handleAdminTextOverrideUpdate(request, response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/admin/albums/")) {
    await handleAdminAlbumDetail(request, response, pathname);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/admin/albums/")) {
    await handleAdminAlbumUpdate(request, response, pathname);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/images/")) {
    const imageRelativePath = pathname.slice(1);
    const resolvedImagePath = path.join(__dirname, imageRelativePath);

    if (!resolvedImagePath.startsWith(imagesDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Acesso negado.");
      return;
    }

    if (existsSync(resolvedImagePath)) {
      await serveStatic(response, resolvedImagePath);
      return;
    }
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolvedPath = path.join(publicDir, requestedPath);
  const htmlResolvedPath = path.join(publicDir, `${requestedPath}.html`);

  if (!resolvedPath.startsWith(publicDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  if (existsSync(resolvedPath)) {
    await serveStatic(response, resolvedPath);
    return;
  }

  if (existsSync(htmlResolvedPath) && htmlResolvedPath.startsWith(publicDir)) {
    await serveStatic(response, htmlResolvedPath);
    return;
  }

  const fallbackPath = path.join(publicDir, "index.html");

  if (existsSync(fallbackPath)) {
    const html = await readFile(fallbackPath, "utf8");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Pagina nao encontrada.");
});

server.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
});
