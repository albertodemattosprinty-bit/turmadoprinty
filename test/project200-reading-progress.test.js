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

test("o leitor usa caracteres da Bíblia para a porcentagem e SVG nos menus de livro e capítulo", async () => {
  const source = await readFile(new URL("../public/200/books.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../public/200/books.css", import.meta.url), "utf8");
  const backend = await readFile(new URL("../src/project200-reading.js", import.meta.url), "utf8");
  assert.match(source, /bibleCharacters \* 100 \/ BIBLE_TOTAL_CHARACTERS/u);
  assert.match(source, /Math\.min\(BIBLE_TOTAL_CHARACTERS, Number\(reading\?\.bibleCharacters \|\| 0\)\)/u);
  assert.match(source, /const allComplete = stats\.percent >= 100/u);
  assert.match(source, /class="bible-approved-icon"/u);
  assert.match(source, /data-bible-book-option/u);
  assert.match(source, /data-bible-chapter-option/u);
  assert.match(source, /queueBookReadingPosition\(context\.bookKey, index \+ 1\)/u);
  assert.match(source, /getBookResumePosition\(book\.id, state\.currentChunks\.length\)/u);
  assert.match(source, /bible-welcome-progress/u);
  assert.doesNotMatch(source, /capítulos concluídos ·/u);
  assert.doesNotMatch(source, /<small>\$\{stats\.completedChapterCount\}/u);
  assert.match(styles, /clamp\(1\.4rem,7vw,2\.38rem\)/u);
  assert.match(source, /completeCurrentBibleChapter\(context\)/u);
  assert.match(source, /advanceToNextBibleChapter/u);
  assert.match(source, /renderBibleCompletedScreen/u);
  assert.match(source, /const READING_CHARACTERS_PER_SECOND = 25/u);
  assert.match(source, /minimumMs = \(characters \/ READING_CHARACTERS_PER_SECOND\) \* 1000/u);
  assert.match(source, /if \(elapsed < minimumMs\) \{ showRhythmControl\(minimumMs\); return; \}/u);
  assert.match(source, /data-reading-rhythm-seconds/u);
  assert.match(source, /data-reading-rhythm-progress/u);
  assert.match(styles, /#readingRhythmOverlay\.books-fullscreen-overlay/u);
  assert.match(source, /data-bible-finished-close/u);
  assert.match(source, /expectedBlocks: state\.currentChunks\.length/u);
  assert.match(styles, /\.books-shell\.is-reading \.book-download-button\{visibility:hidden\}/u);
  assert.match(backend, /create table if not exists project200_bible_chapter_progress/u);
  assert.match(backend, /getCanonicalProject200BibleChapter\(bookKey, chapterNumber\)/u);
  assert.match(backend, /Leia todos os trechos deste capítulo antes de concluí-lo/u);
  assert.match(backend, /\(\$2::bigint\)::numeric\/50/u);
});
