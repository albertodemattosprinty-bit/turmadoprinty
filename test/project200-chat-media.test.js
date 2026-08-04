import assert from "node:assert/strict";
import test from "node:test";

import {
  addTranscriptToProject200ChatMediaMessage,
  buildProject200ChatMediaMessage,
  getProject200ChatMessageModelText,
  parseProject200ChatMediaMessage
} from "../src/project200-chat-media.js";

test("marcador de midia preserva payload UTF-8", () => {
  const content = buildProject200ChatMediaMessage({ kind: "photo", title: "Cafe da manha" });
  assert.deepEqual(parseProject200ChatMediaMessage(content), { kind: "photo", title: "Cafe da manha" });
});

test("transcricao de audio vira contexto do bot sem aparecer como texto no chat", () => {
  const content = buildProject200ChatMediaMessage({ kind: "audio", mediaUrl: "/private/audio" });
  const enriched = addTranscriptToProject200ChatMediaMessage(content, "Quero organizar minha rotina.");
  assert.equal(getProject200ChatMessageModelText(enriched), "Quero organizar minha rotina.");
  assert.equal(parseProject200ChatMediaMessage(enriched).kind, "audio");
});

test("imagem sem legenda recebe contexto seguro", () => {
  const content = buildProject200ChatMediaMessage({ kind: "photo" });
  assert.equal(getProject200ChatMessageModelText(content), "[Imagem enviada pelo usuario]");
});
