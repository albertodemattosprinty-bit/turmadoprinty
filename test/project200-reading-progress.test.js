import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeProject200ReadingPosition } from "../src/project200-reading.js";

test("a posição de livro é normalizada para uma chave escalável por usuário e obra", () => {
  assert.deepEqual(normalizeProject200ReadingPosition({ readingType: "book", bookKey: " livro-123 ", chapterNumber: 99, chunkIndex: 42 }), {
    readingType: "book",
    bookKey: "livro-123",
    chapterNumber: 0,
    chunkIndex: 42
  });
  assert.throws(() => normalizeProject200ReadingPosition({ readingType: "book", bookKey: "" }), /Livro inválido/u);
});

test("índices inválidos são limitados antes de chegar ao Postgres", () => {
  assert.equal(normalizeProject200ReadingPosition({ bookKey: "abc", chunkIndex: -7 }).chunkIndex, 0);
  assert.equal(normalizeProject200ReadingPosition({ bookKey: "abc", chunkIndex: 999999 }).chunkIndex, 100000);
  assert.equal(normalizeProject200ReadingPosition({ readingType: "bible", bookKey: "GENESIS", chapterNumber: 999, chunkIndex: 3 }).chapterNumber, 200);
});

test("o leitor usa capítulos concluídos para a porcentagem e SVG nos menus de livro e capítulo", async () => {
  const source = await readFile(new URL("../public/200/books.js", import.meta.url), "utf8");
  assert.match(source, /completedChapterCount \* 100 \/ allChapterKeys\.length/u);
  assert.match(source, /class="bible-approved-icon"/u);
  assert.match(source, /data-bible-book-option/u);
  assert.match(source, /data-bible-chapter-option/u);
  assert.match(source, /queueBookReadingPosition\(context\.bookKey, index \+ 1\)/u);
  assert.match(source, /getBookResumePosition\(book\.id, state\.currentChunks\.length\)/u);
});
