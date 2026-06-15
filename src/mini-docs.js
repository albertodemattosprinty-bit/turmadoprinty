import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import zlib from "node:zlib";

import { db, query } from "./db.js";

let miniDocsSchemaPromise = null;

function normalizeDocKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeLineText(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function getZipEntryBuffer(buffer, entryName) {
  const signature = 0x06054b50;
  const minimumSize = 22;
  const searchStart = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;

  for (let index = buffer.length - minimumSize; index >= searchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Nao foi possivel localizar a estrutura ZIP do DOCX.");
  }

  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = centralDirectoryOffset;

  while (cursor < buffer.length - 46) {
    const headerSignature = buffer.readUInt32LE(cursor);
    if (headerSignature !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.slice(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");

    if (fileName === entryName) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error("Entrada ZIP invalida no DOCX.");
      }

      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        return compressedData;
      }
      if (compressionMethod === 8) {
        return zlib.inflateRawSync(compressedData);
      }
      throw new Error(`Compressao ZIP nao suportada no DOCX: ${compressionMethod}`);
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`Arquivo ${entryName} nao encontrado dentro do DOCX.`);
}

function extractDocxLinesFromXml(xmlText) {
  const paragraphs = String(xmlText || "").match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const lines = [];

  for (const paragraph of paragraphs) {
    const withTabs = paragraph
      .replace(/<w:tab\b[^/]*\/>/g, "\t")
      .replace(/<w:br\b[^/]*\/>/g, "\n")
      .replace(/<w:cr\b[^/]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n");
    const withoutTags = withTabs.replace(/<[^>]+>/g, "");
    const decoded = decodeXmlEntities(withoutTags);
    const paragraphLines = decoded.split("\n");

    for (const line of paragraphLines) {
      lines.push(normalizeLineText(line));
    }
  }

  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.length ? lines : [""];
}

export async function readDocxLines(filePath) {
  const buffer = await readFile(filePath);
  const xmlBuffer = getZipEntryBuffer(buffer, "word/document.xml");
  return extractDocxLinesFromXml(xmlBuffer.toString("utf8"));
}

export async function readMiniDocumentJson(filePath) {
  const rawText = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawText);
  const lines = Array.isArray(parsed?.lines) ? parsed.lines.map((line) => normalizeLineText(line)) : [];
  return {
    key: normalizeDocKey(parsed?.key || ""),
    title: String(parsed?.title || "Documento").trim() || "Documento",
    lines: lines.length ? lines : [""]
  };
}

function buildDocumentPayload(documentRow, lineRows) {
  return {
    id: documentRow.id,
    key: documentRow.doc_key,
    title: documentRow.title,
    sourcePath: String(documentRow.source_path || "").trim(),
    lineCount: lineRows.length,
    updatedAt: documentRow.updated_at instanceof Date ? documentRow.updated_at.toISOString() : documentRow.updated_at,
    lines: lineRows.map((row) => ({
      id: row.id,
      number: Math.max(1, Number(row.line_number || 1) || 1),
      text: String(row.content || "")
    }))
  };
}

async function withTransaction(callback) {
  if (!db) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getDocumentRowByKey(client, docKey) {
  const result = await client.query(
    `
      select *
      from mini_documents
      where doc_key = $1
      limit 1
    `,
    [normalizeDocKey(docKey)]
  );
  return result.rows[0] || null;
}

async function getDocumentLinesById(client, documentId) {
  const result = await client.query(
    `
      select id, line_number, content
      from mini_document_lines
      where document_id = $1
      order by line_number asc, created_at asc
    `,
    [documentId]
  );
  return result.rows;
}

async function saveDocumentLines(client, documentId, lines) {
  await client.query("delete from mini_document_lines where document_id = $1", [documentId]);

  for (let index = 0; index < lines.length; index += 1) {
    await client.query(
      `
        insert into mini_document_lines (document_id, line_number, content)
        values ($1, $2, $3)
      `,
      [documentId, index + 1, normalizeLineText(lines[index])]
    );
  }

  await client.query("update mini_documents set updated_at = now() where id = $1", [documentId]);
}

export async function ensureMiniDocsSchema() {
  if (miniDocsSchemaPromise) {
    return miniDocsSchemaPromise;
  }

  miniDocsSchemaPromise = (async () => {
    await query(`
      create table if not exists mini_documents (
        id uuid primary key default gen_random_uuid(),
        doc_key text not null unique,
        title text not null default 'Documento',
        source_path text not null default '',
        source_hash text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);
    await query(`
      create table if not exists mini_document_lines (
        id uuid primary key default gen_random_uuid(),
        document_id uuid not null references mini_documents(id) on delete cascade,
        line_number integer not null,
        content text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (document_id, line_number)
      );
    `);
    await query("create index if not exists idx_mini_document_lines_doc_line on mini_document_lines(document_id, line_number);");
  })().catch((error) => {
    miniDocsSchemaPromise = null;
    throw error;
  });

  return miniDocsSchemaPromise;
}

export async function seedMiniDocumentFromDocxIfMissing(docKey, title, filePath) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const existing = await getDocumentRowByKey(client, docKey);
    if (existing) {
      const lineRows = await getDocumentLinesById(client, existing.id);
      return buildDocumentPayload(existing, lineRows);
    }

    const lines = await readDocxLines(filePath);
    const sourceHash = crypto.createHash("sha1").update(lines.join("\n")).digest("hex");
    const insertResult = await client.query(
      `
        insert into mini_documents (doc_key, title, source_path, source_hash)
        values ($1, $2, $3, $4)
        returning *
      `,
      [normalizeDocKey(docKey), String(title || "Documento").trim() || "Documento", String(filePath || "").trim(), sourceHash]
    );
    const documentRow = insertResult.rows[0];
    await saveDocumentLines(client, documentRow.id, lines);
    const lineRows = await getDocumentLinesById(client, documentRow.id);
    return buildDocumentPayload(documentRow, lineRows);
  });
}

export async function seedMiniDocumentFromJsonIfMissing(docKey, title, filePath) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const existing = await getDocumentRowByKey(client, docKey);
    if (existing) {
      const lineRows = await getDocumentLinesById(client, existing.id);
      return buildDocumentPayload(existing, lineRows);
    }

    const documentJson = await readMiniDocumentJson(filePath);
    const lines = documentJson.lines;
    const sourceHash = crypto.createHash("sha1").update(lines.join("\n")).digest("hex");
    const insertResult = await client.query(
      `
        insert into mini_documents (doc_key, title, source_path, source_hash)
        values ($1, $2, $3, $4)
        returning *
      `,
      [
        normalizeDocKey(docKey || documentJson.key),
        String(title || documentJson.title || "Documento").trim() || "Documento",
        String(filePath || "").trim(),
        sourceHash
      ]
    );
    const documentRow = insertResult.rows[0];
    await saveDocumentLines(client, documentRow.id, lines);
    const lineRows = await getDocumentLinesById(client, documentRow.id);
    return buildDocumentPayload(documentRow, lineRows);
  });
}

export async function ensureMiniDocumentExists(docKey, title) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const existing = await getDocumentRowByKey(client, docKey);
    if (existing) {
      const lineRows = await getDocumentLinesById(client, existing.id);
      return buildDocumentPayload(existing, lineRows);
    }

    const insertResult = await client.query(
      `
        insert into mini_documents (doc_key, title, source_path, source_hash)
        values ($1, $2, $3, $4)
        returning *
      `,
      [normalizeDocKey(docKey), String(title || "Documento").trim() || "Documento", "", ""]
    );
    return buildDocumentPayload(insertResult.rows[0], []);
  });
}

export async function getMiniDocumentByKey(docKey) {
  await ensureMiniDocsSchema();
  const result = await query(
    `
      select *
      from mini_documents
      where doc_key = $1
      limit 1
    `,
    [normalizeDocKey(docKey)]
  );
  const documentRow = result.rows[0] || null;
  if (!documentRow) {
    return null;
  }
  const lineRows = await getDocumentLinesById({ query }, documentRow.id);
  return buildDocumentPayload(documentRow, lineRows);
}

export async function updateMiniDocumentLine(docKey, lineNumber, content) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const documentRow = await getDocumentRowByKey(client, docKey);
    if (!documentRow) {
      return null;
    }

    const lines = await getDocumentLinesById(client, documentRow.id);
    const safeLineNumber = Math.max(1, Number(lineNumber || 1) || 1);
    const lineIndex = safeLineNumber - 1;
    if (!lines[lineIndex]) {
      throw new Error("Linha nao encontrada.");
    }

    const nextLines = lines.map((row) => String(row.content || ""));
    nextLines[lineIndex] = normalizeLineText(content);
    await saveDocumentLines(client, documentRow.id, nextLines);
    const refreshedRows = await getDocumentLinesById(client, documentRow.id);
    const refreshedDocument = await getDocumentRowByKey(client, docKey);
    return buildDocumentPayload(refreshedDocument, refreshedRows);
  });
}

export async function insertMiniDocumentLinesAfter(docKey, afterLineNumber, linesToInsert) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const documentRow = await getDocumentRowByKey(client, docKey);
    if (!documentRow) {
      return null;
    }

    const lineRows = await getDocumentLinesById(client, documentRow.id);
    const safeAfterLineNumber = Math.max(0, Number(afterLineNumber || 0) || 0);
    const safeInsertIndex = Math.min(lineRows.length, safeAfterLineNumber);
    const normalizedInsertLines = (Array.isArray(linesToInsert) ? linesToInsert : [])
      .map((item) => normalizeLineText(item));

    if (!normalizedInsertLines.length) {
      return buildDocumentPayload(documentRow, lineRows);
    }

    const nextLines = lineRows.map((row) => String(row.content || ""));
    nextLines.splice(safeInsertIndex, 0, ...normalizedInsertLines);
    await saveDocumentLines(client, documentRow.id, nextLines);
    const refreshedRows = await getDocumentLinesById(client, documentRow.id);
    const refreshedDocument = await getDocumentRowByKey(client, docKey);
    return buildDocumentPayload(refreshedDocument, refreshedRows);
  });
}

export async function replaceMiniDocumentLineRange(docKey, startLineNumber, endLineNumber, replacementLines) {
  await ensureMiniDocsSchema();

  return withTransaction(async (client) => {
    const documentRow = await getDocumentRowByKey(client, docKey);
    if (!documentRow) {
      return null;
    }

    const lineRows = await getDocumentLinesById(client, documentRow.id);
    if (!lineRows.length) {
      throw new Error("Documento vazio.");
    }

    const safeStart = Math.max(1, Number(startLineNumber || 1) || 1);
    const safeEnd = Math.max(safeStart, Number(endLineNumber || safeStart) || safeStart);
    const startIndex = safeStart - 1;
    const deleteCount = Math.max(1, Math.min(lineRows.length, safeEnd) - safeStart + 1);
    const normalizedReplacementLines = (Array.isArray(replacementLines) ? replacementLines : [])
      .map((item) => normalizeLineText(item));

    const nextLines = lineRows.map((row) => String(row.content || ""));
    nextLines.splice(startIndex, deleteCount, ...normalizedReplacementLines);

    if (!nextLines.length) {
      nextLines.push("");
    }

    await saveDocumentLines(client, documentRow.id, nextLines);
    const refreshedRows = await getDocumentLinesById(client, documentRow.id);
    const refreshedDocument = await getDocumentRowByKey(client, docKey);
    return buildDocumentPayload(refreshedDocument, refreshedRows);
  });
}
