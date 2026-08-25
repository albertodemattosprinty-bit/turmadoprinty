import test from "node:test";
import assert from "node:assert/strict";
import { buildEventPromoNarration, formatEventTimeForSpeech } from "../src/event-promo-video.js";

test("converte os horarios do evento para fala natural em 12 horas", () => {
  assert.equal(formatEventTimeForSpeech("6h00am"), "seis da manhã");
  assert.equal(formatEventTimeForSpeech("11h30am"), "onze e meia da manhã");
  assert.equal(formatEventTimeForSpeech("12h00pm"), "meio-dia");
  assert.equal(formatEventTimeForSpeech("4h30pm"), "quatro e meia da tarde");
  assert.equal(formatEventTimeForSpeech("18:30"), "seis e meia da tarde");
  assert.equal(formatEventTimeForSpeech("19:00"), "sete da noite");
  assert.equal(formatEventTimeForSpeech("23:30"), "onze e meia da noite");
});

test("monta a locucao com igreja, data, dia da semana e horario", () => {
  assert.equal(buildEventPromoNarration({
    eventDate: "2026-08-24",
    eventTime: "4h30pm",
    answers: { igreja: "Igreja Batista Central" }
  }), "Vai ser na Igreja Batista Central, dia 24 de agosto, na segunda-feira, às quatro e meia da tarde.");
});
