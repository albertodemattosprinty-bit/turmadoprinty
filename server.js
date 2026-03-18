import "./src/load-env.js";

import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { albums } from "./src/albums.js";
import { createSession, createUser, findUserBySessionToken, findUserByUsername, parseBearerToken, verifyPassword } from "./src/auth.js";
import { hasDatabase, query } from "./src/db.js";
import { findStoreProductById, formatPriceFromCents, storeProducts } from "./src/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const CONTENT_BASE_URL = (process.env.CONTENT_BASE_URL || "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5";
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const PAGBANK_ENVIRONMENT = String(process.env.PAGBANK_ENVIRONMENT || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN || "";
const PAGBANK_API_BASE_URL = PAGBANK_ENVIRONMENT === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
const DEFAULT_SYSTEM_PROMPT = "Responda como um cristao com fe consolidada no evangelho protestante, em tom suave, amigavel, acolhedor, amavel e disposto a ajudar como um amigo. Fale com naturalidade e conviccao, tratando o evangelho como a realidade central da resposta, sem usar expressoes como 'segundo o evangelho' ou apresentar essa base como mera suposicao. Priorize proximidade, clareza, verdade biblica e cuidado pastoral.";

const publicDir = path.join(__dirname, "public");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
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
  return storeProducts.map((product) => ({
    ...product,
    priceLabel: formatPriceFromCents(product.unitAmount),
    coverUrl: buildCoverUrl(product.name)
  }));
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
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

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
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
    sessionExpiresAt: user.expires_at || null
  };
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9._-]{3,24}$/.test(username);
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

  return user;
}

async function handleGptRequest(request, response) {
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
  const system = typeof body.system === "string" && body.system.trim() ? body.system.trim() : DEFAULT_SYSTEM_PROMPT;
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : OPENAI_MODEL;
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    sendJson(response, 400, { error: "Envie um campo 'message' com texto." });
    return;
  }

  const messages = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
    .slice(-12)
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }));

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
          { role: "user", content: message }
        ]
      })
    });

    const { data: payload, text } = await readApiResponse(openAiResponse);

    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status, {
        error: "Falha ao chamar a API da OpenAI.",
        details: payload || text || "Resposta vazia da OpenAI."
      });
      return;
    }

    if (!payload) {
      sendJson(response, 502, {
        error: "A OpenAI devolveu uma resposta vazia ou invalida."
      });
      return;
    }

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

async function createPagBankCheckout({ request, product }) {
  if (!PAGBANK_TOKEN) {
    throw new Error("PAGBANK_TOKEN nao configurado.");
  }

  const baseUrl = getBaseUrl(request);
  const referenceId = `printy-${product.id}-${crypto.randomUUID()}`;
  const redirectUrl = `${baseUrl}/produtos.html?payment=return&product=${encodeURIComponent(product.id)}`;
  const webhookUrl = `${baseUrl}/api/payments/pagbank/webhook`;

  const payload = {
    reference_id: referenceId,
    redirect_url: redirectUrl,
    customer_modifiable: true,
    items: [
      {
        name: product.name,
        quantity: product.quantity,
        unit_amount: product.unitAmount
      }
    ],
    payment_methods: [
      { type: "PIX" },
      { type: "BOLETO" },
      { type: "CREDIT_CARD" }
    ],
    notification_urls: [webhookUrl],
    payment_notification_urls: [webhookUrl]
  };

  const pagBankResponse = await fetch(`${PAGBANK_API_BASE_URL}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAGBANK_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-idempotency-key": crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });

  const { data, text } = await readApiResponse(pagBankResponse);

  if (!pagBankResponse.ok) {
    throw new Error(
      data?.error_messages?.[0]?.description ||
      data?.message ||
      text ||
      "Falha ao criar checkout no PagBank."
    );
  }

  if (!data) {
    throw new Error("O PagBank devolveu resposta vazia ou invalida ao criar o checkout.");
  }

  const payLink = Array.isArray(data.links) ? data.links.find((link) => link?.rel === "PAY" && typeof link.href === "string") : null;

  if (!payLink?.href) {
    throw new Error("Checkout criado sem link de pagamento.");
  }

  return {
    checkoutId: data.id,
    referenceId: data.reference_id,
    payUrl: payLink.href
  };
}

async function handlePagBankCheckoutRequest(request, response) {
  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const product = findStoreProductById(productId);

  if (!product) {
    sendJson(response, 404, { error: "Produto nao encontrado." });
    return;
  }

  try {
    const checkout = await createPagBankCheckout({ request, product });
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
      error: error instanceof Error ? error.message : "Erro ao criar checkout PagBank."
    });
  }
}

async function handlePagBankWebhook(request, response) {
  let body = {};

  try {
    body = await readJsonBody(request);
  } catch {
    body = {};
  }

  console.log("[PagBank webhook]", JSON.stringify(body));
  sendJson(response, 200, { ok: true });
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

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const { pathname } = requestUrl;

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "turma-do-printy-api",
      date: new Date().toISOString(),
      env: {
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasPagBankToken: Boolean(PAGBANK_TOKEN),
        contentBaseUrl: CONTENT_BASE_URL,
        model: OPENAI_MODEL,
        transcribeModel: OPENAI_TRANSCRIBE_MODEL,
        pagbankEnvironment: PAGBANK_ENVIRONMENT
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

  if (request.method === "GET" && pathname === "/api/store/products") {
    sendJson(response, 200, {
      items: getStorePayload(),
      total: storeProducts.length
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/gpt/ask") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleGptRequest(request, response);
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

  if (request.method === "POST" && pathname === "/api/payments/pagbank/checkout") {
    await handlePagBankCheckoutRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/payments/pagbank/webhook") {
    await handlePagBankWebhook(request, response);
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

      sendJson(response, 200, {
        ok: true,
        user: sanitizeUser(user)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao validar sessao."
      });
    }
    return;
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolvedPath = path.join(publicDir, requestedPath);

  if (!resolvedPath.startsWith(publicDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  if (existsSync(resolvedPath)) {
    await serveStatic(response, resolvedPath);
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
