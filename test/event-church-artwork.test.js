import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import {
  buildEventChurchArtworkPrompt,
  generateEventChurchArtwork,
  resolveEventChurchVisualPeriod
} from "../src/event-church-artwork.js";

const term = (horario) => ({
  eventTime: horario,
  answers: {
    igreja: "Igreja Batista",
    cidade: "Jandira"
  }
});

test("define dia antes das 17h, entardecer …s 17h e noite a partir das 18h", () => {
  assert.equal(resolveEventChurchVisualPeriod(term("16:59")), "day");
  assert.equal(resolveEventChurchVisualPeriod(term("17:00")), "sunset");
  assert.equal(resolveEventChurchVisualPeriod(term("18:00")), "night");
  assert.equal(resolveEventChurchVisualPeriod(term("6h00am")), "day");
  assert.equal(resolveEventChurchVisualPeriod(term("7h30pm")), "night");
});

test("prompt preserva a igreja e exige composi‡Æo 16:9", () => {
  const result = buildEventChurchArtworkPrompt(term("19:30"));
  assert.equal(result.period, "night");
  assert.match(result.prompt, /Igreja Batista/);
  assert.match(result.prompt, /16:9/);
  /*
  assert.match(result.prompt, /crian‡as/i);
  */
  assert.match(result.prompt, /Mostre algumas/);
});

test("envia edi‡Æo ao GPT Image 2 em JPEG 1536x864 e qualidade m‚dia", async () => {
  const sourceBuffer = await sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: "#dddddd"
    }
  }).jpeg().toBuffer();
  let request = null;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return { data: [{ b64_json: sourceBuffer.toString("base64") }] };
      }
    };
  };

  const result = await generateEventChurchArtwork({
    apiKey: "test-key",
    term: term("18:30"),
    sourceBuffer,
    fetchImpl
  });

  assert.equal(request.url, "https://api.openai.com/v1/images/edits");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body.get("model"), "gpt-image-2");
  assert.equal(request.options.body.get("quality"), "medium");
  assert.equal(request.options.body.get("size"), "1536x864");
  assert.equal(request.options.body.get("output_format"), "jpeg");
  assert.equal(result.period, "night");
  assert.equal(result.size, "1536x864");
  assert.equal(result.estimatedTotalCostUsd, "0.04-0.08");
  assert.ok(result.imageBuffer.length > 100);
});
