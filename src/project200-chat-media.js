const MEDIA_PREFIX = "[[ILIFE_MEDIA:";
const MEDIA_SUFFIX = "]]";

function normalizePayload(payload = {}) {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

export function parseProject200ChatMediaMessage(content) {
  const value = String(content || "").trim();
  if (!value.startsWith(MEDIA_PREFIX) || !value.endsWith(MEDIA_SUFFIX)) return null;
  try {
    const encoded = value.slice(MEDIA_PREFIX.length, -MEDIA_SUFFIX.length);
    return normalizePayload(JSON.parse(Buffer.from(encoded, "base64").toString("utf8")));
  } catch {
    return null;
  }
}

export function buildProject200ChatMediaMessage(payload = {}) {
  const encoded = Buffer.from(JSON.stringify(normalizePayload(payload)), "utf8").toString("base64");
  return MEDIA_PREFIX + encoded + MEDIA_SUFFIX;
}

export function addTranscriptToProject200ChatMediaMessage(content, transcript) {
  const payload = parseProject200ChatMediaMessage(content);
  const normalizedTranscript = String(transcript || "").trim();
  if (!payload || !normalizedTranscript) return String(content || "");
  return buildProject200ChatMediaMessage({ ...payload, transcript: normalizedTranscript });
}

export function getProject200ChatMessageModelText(content) {
  const value = String(content || "").trim();
  const payload = parseProject200ChatMediaMessage(value);
  if (!payload) return value;
  const transcript = String(payload.transcript || payload.noteText || "").trim();
  if (transcript) return transcript;
  const kind = String(payload.kind || "").trim().toLowerCase();
  if (kind === "photo" || kind === "image") return "[Imagem enviada pelo usuario]";
  if (kind === "audio") return "[Audio enviado pelo usuario]";
  if (kind === "video") return "[Video enviado pelo usuario]";
  return "[Midia enviada pelo usuario]";
}
