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

function formatMediaDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return minutes + ":" + seconds;
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
  const kind = String(payload?.kind || "").trim().toLowerCase();
  const previewUrl = String(payload?.previewUrl || payload?.previewRemoteUrl || payload?.previewDataUrl || "");
  const mediaUrl = String(payload?.mediaUrl || payload?.remoteUrl || "");
  const noteText = String(payload?.noteText || "").trim();
  if (!previewUrl && !mediaUrl && kind !== "text") return null;

  if (kind === "audio" && mediaUrl) {
    const card = document.createElement("div");
    card.className = "marin-message-audio-card";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-message-audio-button";
    button.textContent = "▶";
    button.setAttribute("aria-label", "Reproduzir audio");
    const wave = document.createElement("span");
    wave.className = "marin-message-audio-wave";
    wave.setAttribute("aria-hidden", "true");
    wave.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";
    const duration = document.createElement("span");
    duration.className = "marin-message-audio-duration";
    duration.textContent = formatMediaDuration(payload?.durationMs || 0);
    const audio = new Audio(mediaUrl);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => { duration.textContent = formatMediaDuration(audio.duration * 1000); });
    audio.addEventListener("ended", () => { button.textContent = "▶"; });
    button.addEventListener("click", () => {
      if (audio.paused) {
        audio.play().then(() => { button.textContent = "❚❚"; }).catch(() => {});
      } else {
        audio.pause();
        button.textContent = "▶";
      }
    });
    card.addEventListener("dblclick", () => {
      window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
    });
    card.append(button, wave, duration);
    return card;
  }

  if (kind === "text") {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "marin-message-text-card";
    const title = document.createElement("strong");
    title.textContent = String(payload?.title || "Nota compartilhada");
    const body = document.createElement("p");
    body.textContent = noteText || mediaUrl || "Texto compartilhado";
    card.append(title, body);
    card.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
    });
    return card;
  }

  const card = document.createElement("div");
  card.className = "marin-message-media-card";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "marin-message-media-trigger";

  if (kind === "video" && mediaUrl) {
    const video = document.createElement("video");
    video.src = mediaUrl;
    video.poster = previewUrl;
    video.playsInline = true;
    video.controls = false;
    video.muted = true;
    video.preload = "metadata";
    trigger.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.src = previewUrl || mediaUrl;
    image.alt = String(payload?.title || "Memoria compartilhada");
    trigger.appendChild(image);
  }

  trigger.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
  });

  card.appendChild(trigger);

  const captionParts = [String(payload?.title || "").trim(), noteText].filter(Boolean);
  if (captionParts.length) {
    const meta = document.createElement("div");
    meta.className = "marin-message-media-meta";
    const title = document.createElement("strong");
    title.textContent = captionParts[0];
    meta.appendChild(title);
    if (captionParts[1]) {
      const note = document.createElement("span");
      note.textContent = captionParts[1];
      meta.appendChild(note);
    }
    card.appendChild(meta);
  }

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

