import sharp from "sharp";

export const EVENT_CHURCH_IMAGE_DEFAULTS = Object.freeze({
  model: "gpt-image-2",
  quality: "medium",
  size: "1536x864",
  estimatedOutputCostUsd: 0.041,
  estimatedTotalCostUsd: "0.04-0.08"
});

function parseClockHour(value) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})(?:h|:)?(\d{2})?(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3] || "";
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return hour;
}

export function resolveEventChurchVisualPeriod(term) {
  const answers = term?.answers || {};
  const hour = parseClockHour(term?.eventTime || answers.horario);
  if (hour == null) throw new Error("Horário do evento inválido para definir a iluminação da fachada.");
  if (hour < 17) return "day";
  if (hour >= 18) return "night";
  return "sunset";
}

export function buildEventChurchArtworkPrompt(term) {
  const answers = term?.answers || {};
  const church = String(answers.igreja || "a igreja do evento").replace(/\s+/g, " ").trim();
  const city = String(answers.cidade || "").replace(/\s+/g, " ").trim();
  const period = resolveEventChurchVisualPeriod(term);
  const lighting = period === "day"
    ? "A cena acontece de dia, com céu azul, luz solar suave, cores alegres e fachada claramente iluminada."
    : period === "night"
      ? "A cena acontece à noite, com céu azul profundo, iluminação externa quente, janelas e entrada brilhando de forma acolhedora."
      : "A cena acontece no entardecer, com céu dourado e azul, luz cinematográfica suave e as primeiras luzes quentes da igreja acesas.";

  const prompt = [
    "Use a foto enviada como referência arquitetônica principal da fachada.",
    `Redesenhe a frente de ${church}${city ? ` em ${city}` : ""}, mantendo o prédio claramente reconhecível, suas proporções, entrada e elementos característicos.`,
    "Crie uma cena em estética de longa-metragem de animação 3D familiar, cinematográfica e encantadora, com acabamento visual inspirado em grandes filmes Disney e Pixar e aparência 4K.",
    lighting,
    "Mostre algumas crianças felizes acompanhadas de suas famílias entrando na igreja, em escala natural, com atmosfera segura, festiva e acolhedora.",
    "Valorize a arquitetura, a iluminação e a profundidade da cena. Composição horizontal ampla, entrada visível e espaço de respiro nas laterais.",
    "Não adicione cartazes, legendas, letras, logotipos ou marcas novas. Não transforme a igreja em outro prédio e não esconda a fachada."
    , "The final image must use an exact 16:9 horizontal cinematic composition.",
  ].join(" ");

  return { period, prompt };
}

export async function generateEventChurchArtwork({
  apiKey,
  term,
  sourceBuffer,
  model = EVENT_CHURCH_IMAGE_DEFAULTS.model,
  quality = EVENT_CHURCH_IMAGE_DEFAULTS.quality,
  size = EVENT_CHURCH_IMAGE_DEFAULTS.size,
  fetchImpl = fetch
}) {
  const normalizedApiKey = String(apiKey || "").trim();
  if (!normalizedApiKey) throw new Error("OPENAI_API_KEY não configurada para gerar a fachada.");
  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length < 32) {
    throw new Error("A foto da fachada está vazia.");
  }

  let referenceBuffer;
  try {
    referenceBuffer = await sharp(sourceBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: 1536, height: 1024, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86, chromaSubsampling: "4:2:0" })
      .toBuffer();
  } catch {
    throw new Error("Não foi possível ler essa foto. Envie JPG, PNG, WebP ou HEIC.");
  }

  const { period, prompt } = buildEventChurchArtworkPrompt(term);
  const formData = new FormData();
  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("size", size);
  formData.append("quality", quality);
  formData.append("output_format", "jpeg");
  formData.append("output_compression", "88");
  formData.append(
    "image[]",
    new Blob([referenceBuffer], { type: "image/jpeg" }),
    "fachada-referencia.jpg"
  );

  const response = await fetchImpl("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${normalizedApiKey}` },
    body: formData,
    signal: AbortSignal.timeout(180000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || "A OpenAI não conseguiu embelezar a fachada.");
  }

  const base64 = String(payload?.data?.[0]?.b64_json || "").trim();
  if (!base64) throw new Error("A OpenAI não devolveu a imagem da fachada.");
  const imageBuffer = Buffer.from(base64, "base64");
  if (imageBuffer.length < 100) throw new Error("A imagem gerada voltou vazia.");

  return {
    imageBuffer,
    contentType: "image/jpeg",
    fileName: "fachada-igreja-cinematografica.jpg",
    period,
    prompt,
    model,
    quality,
    size,
    estimatedOutputCostUsd: EVENT_CHURCH_IMAGE_DEFAULTS.estimatedOutputCostUsd,
    estimatedTotalCostUsd: EVENT_CHURCH_IMAGE_DEFAULTS.estimatedTotalCostUsd
  };
}
