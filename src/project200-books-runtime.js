import crypto from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  claimNextProject200Book,
  completeProject200Book,
  createProject200Book,
  ensureProject200BooksSchema,
  failProject200Book,
  getProject200Book,
  getProject200BookForAdmin,
  listProject200Books,
  resetGeneratingProject200Books,
  updateProject200BookCover,
  updateProject200BookGeneration
} from "./project200-books.js";

const BOOK_MODEL = String(process.env.PROJECT200_BOOK_MODEL_LUNA || process.env.PROJECT200_MARIN_MODEL_LUNA || "gpt-5.6-luna").trim();
const IMAGE_MODEL = String(process.env.PROJECT200_BOOK_IMAGE_MODEL || "gpt-image-1-mini").trim();
const COVER_PREFIX = "project200/books/covers";
const PUBLIC_BASE_URL = String(process.env.R2_PUBLIC_BASE_URL || process.env.CONTENT_BASE_URL || "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev").replace(/\/+$/, "");
const LITERARY_STYLES = Object.freeze([
  "Neutro", "Romance", "Fantasia", "Ficção científica", "Suspense", "Terror", "Aventura",
  "Drama", "Comédia", "Poesia", "Biografia", "Autobiografia", "Desenvolvimento pessoal",
  "Filosofia", "História", "Infantil", "Crônica"
]);

function usesNeutralLiteraryStyle(book) {
  return String(book?.literaryStyle || "").trim().toLocaleLowerCase("pt-BR") === "neutro";
}

function neutralPromptInstructions(book) {
  if (!usesNeutralLiteraryStyle(book)) return [];
  return [
    "Este livro usa o modo Neutro: o contexto criativo escrito pelo usuário é a única fonte de estilo, tom, gênero, voz e estrutura.",
    "Obedeça integralmente ao prompt do usuário e não imponha nenhuma assinatura literária, fórmula narrativa ou preferência da Luna.",
    "Não complete o pedido com convenções de gênero que não tenham sido solicitadas; acrescente apenas o mínimo indispensável para manter coerência entre as páginas."
  ];
}

let r2Client = null;

function getR2Client() {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const bucket = String(process.env.R2_BUCKET_NAME || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 não configurado para salvar a capa do livro.");
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return { client: r2Client, bucket };
}

function buildPublicUrl(key) {
  return `${PUBLIC_BASE_URL}/${String(key || "").split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string" && content.text.trim()) return content.text.trim();
    }
  }
  return "";
}

async function requestStructuredJson(apiKey, { name, schema, instructions, input, maxOutputTokens = 10000, safetyId = "books" }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: BOOK_MODEL,
      instructions,
      input,
      reasoning: { effort: "none" },
      text: { verbosity: "high", format: { type: "json_schema", name, strict: true, schema } },
      max_output_tokens: maxOutputTokens,
      store: false,
      safety_identifier: `ilife_books_${crypto.createHash("sha256").update(String(safetyId)).digest("hex").slice(0, 24)}`
    })
  });
  const raw = await response.text();
  let payload = null;
  try { payload = JSON.parse(raw); } catch {}
  if (!response.ok) throw new Error(payload?.error?.message || raw || "Luna não conseguiu escrever o livro.");
  const text = extractResponseText(payload).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text) throw new Error("Luna devolveu uma resposta vazia.");
  return JSON.parse(text);
}

function buildPlanSchema(chapterCount) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["synopsis", "coverPrompt", "narrativeVoice", "chapters"],
    properties: {
      synopsis: { type: "string", minLength: 120, maxLength: 1200 },
      coverPrompt: { type: "string", minLength: 80, maxLength: 1200 },
      narrativeVoice: { type: "string", minLength: 30, maxLength: 500 },
      chapters: {
        type: "array",
        minItems: chapterCount,
        maxItems: chapterCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "purpose"],
          properties: {
            title: { type: "string", minLength: 2, maxLength: 120 },
            purpose: { type: "string", minLength: 40, maxLength: 700 }
          }
        }
      }
    }
  };
}

async function generatePlan(apiKey, book) {
  const chapterCount = Math.max(1, Math.min(20, Math.ceil(book.pageCount / 10)));
  const neutralInstructions = neutralPromptInstructions(book);
  const plan = await requestStructuredJson(apiKey, {
    name: "project200_book_plan",
    schema: buildPlanSchema(chapterCount),
    instructions: [
      usesNeutralLiteraryStyle(book)
        ? "Você é Luna, editora e organizadora do conteúdo solicitado pelo usuário no iLife."
        : "Você é Luna, romancista, editora e arquiteta literária do iLife.",
      "Planeje um livro original em português do Brasil, coerente do início ao fim e pronto para leitura pública.",
      usesNeutralLiteraryStyle(book)
        ? "Trate o contexto criativo do usuário como instrução soberana para todas as decisões literárias."
        : "Respeite integralmente o estilo literário, o contexto do usuário e a quantidade de páginas.",
      ...neutralInstructions,
      "Não mencione IA, prompt, instruções ou bastidores no livro.",
      "O prompt de capa deve descrever somente a direção visual e a composição da capa; a tipografia obrigatória será aplicada na geração final da imagem."
    ].join(" "),
    input: [
      `Título: ${book.title}`,
      usesNeutralLiteraryStyle(book)
        ? "Estilo literário: Neutro, sem estilo predefinido; siga exclusivamente o contexto criativo do autor."
        : `Estilo literário: ${book.literaryStyle}`,
      `Páginas: ${book.pageCount}`,
      `Estilo visual da capa: ${book.coverStyle}`,
      `Contexto criativo do autor: ${book.contextPrompt}`,
      `Crie exatamente ${chapterCount} capítulos no plano.`
    ].join("\n"),
    maxOutputTokens: 5000,
    safetyId: book.authorUserId
  });
  const pagesPerChapter = Math.ceil(book.pageCount / chapterCount);
  plan.chapters = plan.chapters.map((chapter, index) => ({
    ...chapter,
    startPage: index * pagesPerChapter + 1,
    endPage: Math.min(book.pageCount, (index + 1) * pagesPerChapter)
  })).filter((chapter) => chapter.startPage <= book.pageCount);
  return plan;
}

async function generateAndStoreCover(apiKey, book, plan = {}, options = {}) {
  const coverStyle = String(options.coverStyle || book.coverStyle || "Editorial cinematográfica").replace(/\s+/gu, " ").trim().slice(0, 120);
  const extraPrompt = String(options.extraPrompt || "").trim().slice(0, 1800);
  const titleText = String(book.title || "Livro iLife").replace(/\s+/gu, " ").trim().slice(0, 140);
  const authorText = `Um livro de ${String(book.authorName || "Autor iLife").replace(/\s+/gu, " ").trim().slice(0, 120)}`;
  const prompt = [
    `Capa vertical premium de livro, proporcao 2:3, para "${titleText}".`,
    usesNeutralLiteraryStyle(book)
      ? "Sem gênero literário predefinido; não acrescente uma estética de gênero além da direção fornecida pelo autor."
      : `Gênero: ${book.literaryStyle}.`,
    `Direção visual escolhida: ${coverStyle}.`,
    String(plan?.coverPrompt || book.contextPrompt || "").trim(),
    extraPrompt ? `Direção adicional aprovada pela administração: ${extraPrompt}.` : "",
    "Composição editorial marcante, alta legibilidade visual em miniatura, acabamento profissional.",
    `TIPOGRAFIA OBRIGATÓRIA DENTRO DA PRÓPRIA IMAGEM: desenhe exatamente o título "${titleText}" como o texto principal da capa, grande, artístico e perfeitamente legível.`,
    `No rodapé da mesma imagem, desenhe exatamente "${authorText}" em tipografia editorial menor e legível.`,
    "Não escreva nenhum outro texto legível, números, logotipos, marcas d'água ou molduras. Os dois textos obrigatórios devem fazer parte do PNG final, não podem ser deixados para interface externa."
  ].filter(Boolean).join(" ");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1024x1536", quality: "low", output_format: "png" })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "A capa não pôde ser criada.");
  const base64 = String(payload?.data?.[0]?.b64_json || "").trim();
  if (!base64) throw new Error("A OpenAI não devolveu os dados da capa.");
  const buffer = Buffer.from(base64, "base64");
  const key = `${COVER_PREFIX}/${book.id}-${Date.now()}.png`;
  const { client, bucket } = getR2Client();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "image/png", CacheControl: "public, max-age=31536000, immutable" }));
  return buildPublicUrl(key);
}

function pageCharacters(value) {
  return Array.from(String(value || "")).length;
}

function normalizePageContent(value) {
  let content = String(value || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (pageCharacters(content) <= 1800) return content;
  const chars = Array.from(content).slice(0, 1800).join("");
  const boundary = Math.max(chars.lastIndexOf(". "), chars.lastIndexOf("! "), chars.lastIndexOf("? "));
  content = boundary >= 1500 ? chars.slice(0, boundary + 1).trim() : chars.trim();
  return content;
}

function buildPagesSchema(count) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["pages"],
    properties: {
      pages: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["pageNumber", "title", "content"],
          properties: {
            pageNumber: { type: "integer" },
            title: { type: "string", minLength: 2, maxLength: 140 },
            content: { type: "string", minLength: 1500, maxLength: 1800 }
          }
        }
      }
    }
  };
}

function chapterForPage(plan, pageNumber) {
  return plan.chapters.find((chapter) => pageNumber >= chapter.startPage && pageNumber <= chapter.endPage) || plan.chapters.at(-1);
}

async function generatePageChunk(apiKey, book, plan, startPage, count, previousTail) {
  const pageNumbers = Array.from({ length: count }, (_, index) => startPage + index);
  const chapterContext = [...new Set(pageNumbers.map((number) => chapterForPage(plan, number)))].map((chapter) => ({
    title: chapter?.title || "Capítulo",
    purpose: chapter?.purpose || "Dar continuidade ao livro.",
    startPage: chapter?.startPage || startPage,
    endPage: chapter?.endPage || startPage + count - 1
  }));
  let lastError = null;
  const neutralInstructions = neutralPromptInstructions(book);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await requestStructuredJson(apiKey, {
        name: "project200_book_pages",
        schema: buildPagesSchema(count),
        instructions: [
          usesNeutralLiteraryStyle(book)
            ? "Você é Luna e está produzindo, sem estilo próprio, as páginas solicitadas pelo usuário em português do Brasil."
            : "Você é Luna e está escrevendo as páginas finais de um livro original em português do Brasil.",
          "Cada página deve conter rigorosamente entre 1500 e 1800 caracteres, contando espaços.",
          usesNeutralLiteraryStyle(book)
            ? "Escreva o conteúdo no formato determinado pelo usuário, sem notas editoriais, sem markdown e sem citar IA ou prompt."
            : "Escreva prosa literária completa, sem notas editoriais, sem markdown e sem citar IA ou prompt.",
          "Mantenha continuidade exata de personagens, fatos, voz, tempo verbal e atmosfera.",
          usesNeutralLiteraryStyle(book)
            ? "Faça cada página avançar exatamente o conteúdo pedido, sem acrescentar floreios ou convenções não solicitadas."
            : "Não resuma acontecimentos apenas para correr. Faça cada página avançar a narrativa ou argumento.",
          "O campo pageNumber deve corresponder exatamente à página solicitada.",
          ...neutralInstructions
        ].join(" "),
        input: [
          `Livro: ${book.title}`,
          usesNeutralLiteraryStyle(book)
            ? `Direção literária: siga exclusivamente este contexto do autor, sem estilo predefinido: ${book.contextPrompt}`
            : `Estilo: ${book.literaryStyle}`,
          `Sinopse: ${plan.synopsis}`,
          `Voz narrativa: ${plan.narrativeVoice}`,
          `Capítulos ativos: ${JSON.stringify(chapterContext)}`,
          `Escreva exatamente as páginas ${pageNumbers.join(", ")}.`,
          previousTail ? `Trecho final da página anterior para continuidade: ${previousTail}` : "Esta é a abertura do livro.",
          attempt > 1 ? `Tentativa de correção ${attempt}: respeite sem exceção a faixa de 1500 a 1800 caracteres em cada conteúdo.` : ""
        ].filter(Boolean).join("\n"),
        maxOutputTokens: Math.max(5000, count * 2600),
        safetyId: book.authorUserId
      });
      const pages = (Array.isArray(result?.pages) ? result.pages : []).map((page, index) => ({
        pageNumber: pageNumbers[index],
        title: String(page?.title || `Página ${pageNumbers[index]}`).trim().slice(0, 140),
        content: normalizePageContent(page?.content)
      }));
      if (pages.length !== count) throw new Error("Luna devolveu uma quantidade incorreta de páginas.");
      const invalid = pages.find((page) => pageCharacters(page.content) < 1500 || pageCharacters(page.content) > 1800);
      if (invalid) throw new Error(`A página ${invalid.pageNumber} ficou com ${pageCharacters(invalid.content)} caracteres.`);
      return pages;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Não foi possível completar o bloco de páginas.");
}

async function generateBook(apiKey, book) {
  const plan = await generatePlan(apiKey, book);
  await updateProject200BookGeneration(book.id, { synopsis: plan.synopsis, outline: plan, feedback: "Criando a capa com GPT Image Mini." });
  const coverImageUrl = await generateAndStoreCover(apiKey, book, plan);
  await updateProject200BookGeneration(book.id, { coverImageUrl, synopsis: plan.synopsis, outline: plan, feedback: "Capa salva no R2. Luna começou a escrever." });
  const pages = [];
  const chunkSize = 4;
  for (let startPage = 1; startPage <= book.pageCount; startPage += chunkSize) {
    const count = Math.min(chunkSize, book.pageCount - startPage + 1);
    const previousTail = pages.length ? Array.from(pages.at(-1).content).slice(-700).join("") : "";
    const chunk = await generatePageChunk(apiKey, book, plan, startPage, count, previousTail);
    pages.push(...chunk);
    await updateProject200BookGeneration(book.id, {
      generatedPageCount: pages.length,
      synopsis: plan.synopsis,
      outline: plan,
      coverImageUrl,
      feedback: `Luna escreveu ${pages.length} de ${book.pageCount} páginas.`
    });
  }
  return completeProject200Book(book.id, pages);
}

export function createProject200BooksRuntime({ requireAuth, requireAdmin, readJsonBody, sendJson }) {
  let processing = false;
  let bootstrapped = false;

  async function processQueue() {
    if (processing) return;
    processing = true;
    try {
      while (true) {
        const book = await claimNextProject200Book();
        if (!book) break;
        try {
          const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
          if (!apiKey) throw new Error("OPENAI_API_KEY não configurada para escrever livros.");
          await generateBook(apiKey, book);
        } catch (error) {
          await failProject200Book(book.id, error instanceof Error ? error.message : "Falha desconhecida na geração.");
        }
      }
    } catch (error) {
      console.error("Falha na fila de livros do /200:", error);
    } finally {
      processing = false;
    }
  }

  async function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    try {
      await ensureProject200BooksSchema();
      await resetGeneratingProject200Books();
      await processQueue();
    } catch (error) {
      console.error("Falha ao preparar Livros do /200:", error);
    }
  }

  async function handleList(request, response) {
    const user = await requireAuth(request, response);
    if (!user) return;
    try {
      const books = await listProject200Books(user.id);
      sendJson(response, 200, { books, literaryStyles: LITERARY_STYLES, model: BOOK_MODEL, imageModel: IMAGE_MODEL, isAdmin: String(user?.role || "").trim().toUpperCase() === "ADMIN" });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Não foi possível abrir a biblioteca." });
    }
  }

  async function handleGet(request, response, bookId) {
    const user = await requireAuth(request, response);
    if (!user) return;
    try {
      const book = await getProject200Book(user.id, bookId);
      if (!book) return sendJson(response, 404, { error: "Livro não encontrado." });
      sendJson(response, 200, { book });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Não foi possível abrir o livro." });
    }
  }

  async function handleCreate(request, response) {
    const user = await requireAuth(request, response);
    if (!user) return;
    if (!String(process.env.OPENAI_API_KEY || "").trim()) return sendJson(response, 503, { error: "OPENAI_API_KEY não configurada." });
    try {
      getR2Client();
      const body = await readJsonBody(request);
      const book = await createProject200Book(user.id, body);
      sendJson(response, 202, { ok: true, book, model: BOOK_MODEL, imageModel: IMAGE_MODEL });
      void processQueue();
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Não foi possível criar o livro." });
    }
  }

  async function handleRegenerateCover(request, response, bookId) {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    if (!String(process.env.OPENAI_API_KEY || "").trim()) return sendJson(response, 503, { error: "OPENAI_API_KEY não configurada." });
    try {
      getR2Client();
      const book = await getProject200BookForAdmin(bookId);
      if (!book) return sendJson(response, 404, { error: "Livro não encontrado." });
      const body = await readJsonBody(request);
      const coverStyle = String(body?.coverStyle || book.coverStyle || "Editorial cinematográfica").replace(/\s+/gu, " ").trim().slice(0, 120);
      const extraPrompt = String(body?.coverPrompt || "").trim().slice(0, 1800);
      const coverImageUrl = await generateAndStoreCover(String(process.env.OPENAI_API_KEY || "").trim(), book, book.outline || {}, { coverStyle, extraPrompt });
      const updated = await updateProject200BookCover(book.id, { coverImageUrl, coverStyle });
      sendJson(response, 200, { ok: true, book: updated, imageModel: IMAGE_MODEL });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Não foi possível gerar a nova capa." });
    }
  }

  return { bootstrap, handleCreate, handleGet, handleList, handleRegenerateCover, processQueue };
}
