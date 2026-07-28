const CHAT_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/u;
const ILIFE_MEDIA_PREFIX = "[[ILIFE_MEDIA:";
const ILIFE_MEDIA_SUFFIX = "]]";

function splitTrailingPunctuation(value) {
  const url = String(value || "");
  const trailing = url.match(TRAILING_URL_PUNCTUATION)?.[0] || "";
  return {
    url: trailing ? url.slice(0, -trailing.length) : url,
    trailing
  };
}

function createChatLink(rawUrl) {
  const parsed = new URL(/^www\./iu.test(rawUrl) ? `https://${rawUrl}` : rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  const link = document.createElement("a");
  link.className = "marin-message-link";
  link.href = parsed.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Abrir link ${rawUrl}`);

  const globe = document.createElement("span");
  globe.className = "marin-message-link-globe";
  globe.textContent = "\u{1F310}";
  globe.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "marin-message-link-label";
  label.textContent = rawUrl;
  link.append(globe, label);
  return link;
}

function decodeUtf8Base64(input) {
  const binary = window.atob(String(input || ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseMediaPayload(text) {
  const value = String(text || "").trim();
  if (!value.startsWith(ILIFE_MEDIA_PREFIX) || !value.endsWith(ILIFE_MEDIA_SUFFIX)) return null;
  const encoded = value.slice(ILIFE_MEDIA_PREFIX.length, -ILIFE_MEDIA_SUFFIX.length);
  try {
    return JSON.parse(decodeUtf8Base64(encoded));
  } catch {
    return null;
  }
}

function renderPlainText(container, text) {
  let cursor = 0;
  for (const match of text.matchAll(CHAT_URL_PATTERN)) {
    const index = Number(match.index || 0);
    if (index > cursor) container.append(document.createTextNode(text.slice(cursor, index)));
    const { url, trailing } = splitTrailingPunctuation(match[0]);
    let link = null;
    try {
      link = createChatLink(url);
    } catch {}
    container.append(link || document.createTextNode(match[0]));
    if (link && trailing) container.append(document.createTextNode(trailing));
    cursor = index + match[0].length;
  }
  if (cursor < text.length) container.append(document.createTextNode(text.slice(cursor)));
}

function createMediaCard(payload) {
  if (!(payload && payload.previewDataUrl)) return null;
  const card = document.createElement("div");
  card.className = "marin-message-media-card";

  const trigger = document.createElement("button");
  trigger.type = "button";
  const image = document.createElement("img");
  image.src = String(payload.previewDataUrl || "");
  image.alt = String(payload.title || "Memoria compartilhada");
  trigger.appendChild(image);
  trigger.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
  });

  const meta = document.createElement("div");
  meta.className = "marin-message-media-meta";
  const title = document.createElement("strong");
  title.textContent = String(payload.title || "Memoria compartilhada");
  const date = document.createElement("span");
  date.textContent = String(payload.dateLabel || "");
  meta.append(title, date);
  if (payload.noteText) {
    const note = document.createElement("span");
    note.textContent = String(payload.noteText);
    meta.append(note);
  }

  card.append(trigger, meta);
  return card;
}

export function renderChatMessageContent(container, content) {
  if (!(container instanceof Element)) return;
  const text = String(content || "");
  container.replaceChildren();
  const mediaPayload = parseMediaPayload(text);
  if (mediaPayload) {
    const card = createMediaCard(mediaPayload);
    if (card) container.append(card);
    return;
  }
  renderPlainText(container, text);
}
