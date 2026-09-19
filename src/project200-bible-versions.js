import crypto from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { query } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIBLE_FILE_PATH = path.join(__dirname, "..", "public", "200", "biblia-sagrada.txt");
const BIBLE_MODEL = String(process.env.PROJECT200_BIBLE_MODEL_LUNA || process.env.PROJECT200_MARIN_MODEL_LUNA || "gpt-5.6-luna").trim();
const generationJobs = new Map();
let schemaPromise = null;
let parsedBiblePromise = null;

function normalizeBibleKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 100);
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

function serializeVersion(row = {}) {
  if (!row?.book_key) return null;
  return {
    bookKey: row.book_key,
    bookName: row.book_name,
    chapterNumber: Number(row.chapter_number || 0),
    verses: Array.isArray(row.verses) ? row.verses.map((verse) => ({ number: Number(verse.number), text: String(verse.text || "").trim() })) : [],
    modelId: row.model_id,
    revision: Number(row.revision || 1),
    updatedAt: row.updated_at
  };
}

export function parseProject200Bible(text) {
  const books = [];
  let currentBook = null;
  let currentChapter = null;
  String(text || "").replace(/\r/g, "").split("\n").forEach((raw) => {
    const line = raw.trim();
    const chapterMatch = line.match(/^[»]?([^\[]+?)\s*\[(\d+)\]$/);
    if (chapterMatch) {
      const name = chapterMatch[1].replace(/^»/, "").trim();
      const key = normalizeBibleKey(name);
      if (!currentBook || currentBook.key !== key) {
        currentBook = { name, key, chapters: [] };
        books.push(currentBook);
      }
      currentChapter = { number: Number(chapterMatch[2]), verses: [] };
      currentBook.chapters.push(currentChapter);
      return;
    }
    const verseMatch = line.match(/^(\d+)\s+(.+)/);
    if (verseMatch && currentChapter) currentChapter.verses.push({ number: Number(verseMatch[1]), text: verseMatch[2].trim() });
  });
  return books.filter((book) => book.chapters.length);
}

export function validateSimplifiedBibleVerses(candidate, originalVerses) {
  const source = Array.isArray(originalVerses) ? originalVerses : [];
  const verses = Array.isArray(candidate?.verses) ? candidate.verses : [];
  if (!source.length || verses.length !== source.length) throw new Error("Luna não manteve todos os versículos do capítulo.");
  return verses.map((verse, index) => {
    const expectedNumber = Number(source[index]?.number || 0);
    const number = Number(verse?.number || 0);
    const text = String(verse?.text || "").replace(/\s+/gu, " ").trim();
    if (number !== expectedNumber) throw new Error("Luna alterou a numeração dos versículos.");
    if (!text || text.length > 2400) throw new Error(`O versículo ${expectedNumber} voltou vazio ou inválido.`);
    return { number, text };
  });
}

export function buildBibleRewriteSchema(verseCount) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["verses"],
    properties: {
      verses: {
        type: "array",
        minItems: verseCount,
        maxItems: verseCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["number", "text"],
          properties: {
            number: { type: "integer" },
            text: { type: "string", minLength: 1, maxLength: 2400 }
          }
        }
      }
    }
  };
}

async function loadBible() {
  if (!parsedBiblePromise) parsedBiblePromise = readFile(BIBLE_FILE_PATH)
    .then((buffer) => parseProject200Bible(new TextDecoder("iso-8859-1").decode(buffer)))
    .catch((error) => { parsedBiblePromise = null; throw error; });
  return parsedBiblePromise;
}

export async function getCanonicalProject200BibleChapter(bookKey, chapterNumber) {
  const safeBookKey = normalizeBibleKey(bookKey);
  const safeChapterNumber = Math.max(1, Math.min(200, Math.trunc(Number(chapterNumber || 0))));
  const books = await loadBible();
  const book = books.find((item) => item.key === safeBookKey);
  const chapter = book?.chapters.find((item) => item.number === safeChapterNumber);
  if (!book || !chapter?.verses?.length) throw new Error("Capítulo bíblico não encontrado na base original.");
  return { bookKey: book.key, bookName: book.name, chapterNumber: chapter.number, verses: chapter.verses };
}

export async function ensureProject200BibleVersionsSchema() {
  if (!schemaPromise) schemaPromise = query(`create table if not exists project200_bible_versions (
    book_key text not null,
    book_name text not null,
    chapter_number integer not null,
    verses jsonb not null,
    model_id text not null default 'gpt-5.6-luna',
    revision integer not null default 1,
    generated_by uuid references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key(book_key, chapter_number)
  )`).catch((error) => { schemaPromise = null; throw error; });
  return schemaPromise;
}

export async function getProject200BibleVersion(bookKey, chapterNumber) {
  await ensureProject200BibleVersionsSchema();
  const safeBookKey = normalizeBibleKey(bookKey);
  const safeChapterNumber = Math.max(1, Math.min(200, Math.trunc(Number(chapterNumber || 0))));
  const result = await query(
    `select book_key, book_name, chapter_number, verses, model_id, revision, updated_at
       from project200_bible_versions
      where book_key=$1 and chapter_number=$2
      limit 1`,
    [safeBookKey, safeChapterNumber]
  );
  return serializeVersion(result.rows[0]);
}

async function requestSimplifiedChapter(apiKey, chapter, userId) {
  const schema = buildBibleRewriteSchema(chapter.verses.length);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: BIBLE_MODEL,
      instructions: [
        "Você é Luna, responsável por criar uma versão bíblica em português do Brasil muito simples, leve e atual.",
        "Reescreva o capítulo inteiro sem resumir, explicar, comentar, interpretar, pregar ou acrescentar doutrina.",
        "Preserve com rigor o sentido de cada versículo, seus fatos, sujeitos, relações, ordem, imagens essenciais, nomes próprios, números e sequência narrativa.",
        "Troque palavras e construções em desuso por equivalentes atuais. Prefira frases diretas, vocabulário cotidiano e compreensão imediata para qualquer pessoa.",
        "Evite floreios, linguagem rebuscada, gírias passageiras e mudanças de significado.",
        "Devolva exatamente um item para cada versículo recebido, na mesma ordem e com o mesmo número. Não una nem divida versículos."
      ].join("\n"),
      input: JSON.stringify({ book: chapter.bookName, chapter: chapter.chapterNumber, verses: chapter.verses }),
      reasoning: { effort: "none" },
      text: { verbosity: "low", format: { type: "json_schema", name: "project200_bible_simple_chapter", strict: true, schema } },
      max_output_tokens: 32000,
      store: false,
      safety_identifier: `ilife_bible_${crypto.createHash("sha256").update(String(userId || "anonymous")).digest("hex").slice(0, 24)}`
    }),
    signal: AbortSignal.timeout(180000)
  });
  const raw = await response.text();
  let payload = null;
  try { payload = JSON.parse(raw); } catch {}
  if (!response.ok) throw new Error(payload?.error?.message || raw || "Luna não conseguiu simplificar este capítulo agora.");
  const text = extractResponseText(payload).replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "").trim();
  if (!text) throw new Error("Luna devolveu uma resposta vazia.");
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { throw new Error("Luna devolveu um capítulo em formato inválido."); }
  return validateSimplifiedBibleVerses(parsed, chapter.verses);
}

export async function rewriteProject200BibleChapter(userId, bookKey, chapterNumber, apiKey) {
  const canonical = await getCanonicalProject200BibleChapter(bookKey, chapterNumber);
  const jobKey = `${canonical.bookKey}:${canonical.chapterNumber}`;
  if (generationJobs.has(jobKey)) return generationJobs.get(jobKey);
  const job = (async () => {
    const verses = await requestSimplifiedChapter(apiKey, canonical, userId);
    await ensureProject200BibleVersionsSchema();
    const result = await query(
      `insert into project200_bible_versions(book_key,book_name,chapter_number,verses,model_id,generated_by)
       values($1,$2,$3,$4::jsonb,$5,$6)
       on conflict(book_key,chapter_number) do update
         set book_name=excluded.book_name,
             verses=excluded.verses,
             model_id=excluded.model_id,
             generated_by=excluded.generated_by,
             revision=project200_bible_versions.revision+1,
             updated_at=now()
       returning book_key, book_name, chapter_number, verses, model_id, revision, updated_at`,
      [canonical.bookKey, canonical.bookName, canonical.chapterNumber, JSON.stringify(verses), BIBLE_MODEL, userId]
    );
    return serializeVersion(result.rows[0]);
  })().finally(() => generationJobs.delete(jobKey));
  generationJobs.set(jobKey, job);
  return job;
}
