import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildBibleRewriteSchema, parseProject200Bible, validateSimplifiedBibleVerses } from "../src/project200-bible-versions.js";

test("a base bíblica mantém 66 livros com capítulos e versículos identificáveis", async () => {
  const buffer = await readFile(new URL("../public/200/biblia-sagrada.txt", import.meta.url));
  const books = parseProject200Bible(new TextDecoder("iso-8859-1").decode(buffer));

  assert.equal(books.length, 66);
  assert.ok(books.every((book) => book.key && book.name && book.chapters.length));
  assert.ok(books.every((book) => book.chapters.every((chapter) => chapter.number > 0 && chapter.verses.length)));
  assert.deepEqual(books[0].chapters[0].verses.slice(0, 2).map((verse) => verse.number), [1, 2]);
});

test("a versão simples só é aceita com a mesma divisão e numeração", () => {
  const original = [{ number: 1, text: "Texto original um." }, { number: 2, text: "Texto original dois." }];
  assert.deepEqual(validateSimplifiedBibleVerses({ verses: [{ number: 1, text: " Texto atual um. " }, { number: 2, text: "Texto atual dois." }] }, original), [
    { number: 1, text: "Texto atual um." },
    { number: 2, text: "Texto atual dois." }
  ]);
  assert.throws(() => validateSimplifiedBibleVerses({ verses: [{ number: 1, text: "Faltou um." }] }, original), /todos os versículos/u);
  assert.throws(() => validateSimplifiedBibleVerses({ verses: [{ number: 2, text: "Invertido." }, { number: 1, text: "Invertido." }] }, original), /numeração/u);
});

test("o schema estruturado exige exatamente um item por versículo", () => {
  const schema = buildBibleRewriteSchema(31);
  assert.equal(schema.properties.verses.minItems, 31);
  assert.equal(schema.properties.verses.maxItems, 31);
  assert.deepEqual(schema.properties.verses.items.required, ["number", "text"]);
  assert.equal(schema.properties.verses.items.additionalProperties, false);
});
