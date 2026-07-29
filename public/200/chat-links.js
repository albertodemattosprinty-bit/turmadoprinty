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

export function isChatMediaMessage(content) {
  return Boolean(parseMediaPayload(content));
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

function audioViewedKey(mediaUrl) {
  let hash = 0;
  const text = String(mediaUrl || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return "project200-chat-audio-viewed:" + Math.abs(hash);
}

function markAudioViewed(card, mediaUrl) {
  card.classList.add("is-viewed");
  try {
    window.localStorage.setItem(audioViewedKey(mediaUrl), "1");
  } catch {}
}

function hasAudioBeenViewed(mediaUrl) {
  try {
    return window.localStorage.getItem(audioViewedKey(mediaUrl)) === "1";
  } catch {
    return false;
  }
}

function buildFallbackWaveform(count) {
  return Array.from({ length: count }, (_, index) => {
    const a = Math.sin(index * 1.7) * 0.24;
    const b = Math.sin(index * 0.43 + 1.8) * 0.18;
    return Math.max(0.18, Math.min(1, 0.52 + a + b));
  });
}

async function buildAudioWaveform(mediaUrl, count) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!mediaUrl || typeof AudioContextClass === "undefined") return buildFallbackWaveform(count);
  try {
    const response = await fetch(mediaUrl, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error("audio fetch failed");
    const buffer = await response.arrayBuffer();
    const context = new AudioContextClass();
    const decoded = await context.decodeAudioData(buffer.slice(0));
    await context.close().catch(() => {});
    const channel = decoded.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channel.length / count));
    const values = [];
    for (let bar = 0; bar < count; bar += 1) {
      let sum = 0;
      const start = bar * samplesPerBar;
      const end = Math.min(channel.length, start + samplesPerBar);
      for (let index = start; index < end; index += 1) sum += Math.abs(channel[index]);
      values.push(Math.max(0.12, Math.min(1, (sum / Math.max(1, end - start)) * 4.8)));
    }
    return values;
  } catch {
    return buildFallbackWaveform(count);
  }
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
    card.classList.toggle("is-viewed", hasAudioBeenViewed(mediaUrl));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-message-audio-button";
    button.textContent = "\u25b6";
    button.setAttribute("aria-label", "Reproduzir audio");
    const wave = document.createElement("span");
    wave.className = "marin-message-audio-wave";
    wave.setAttribute("role", "slider");
    wave.setAttribute("aria-label", "Linha do tempo do audio");
    wave.setAttribute("aria-valuemin", "0");
    wave.setAttribute("aria-valuemax", "100");
    wave.setAttribute("aria-valuenow", "0");
    const barCount = 32;
    const bars = Array.from({ length: barCount }, () => {
      const bar = document.createElement("i");
      bar.style.setProperty("--wave-level", "0.28");
      wave.appendChild(bar);
      return bar;
    });
    const duration = document.createElement("span");
    duration.className = "marin-message-audio-duration";
    duration.textContent = "0:00 / " + formatMediaDuration(payload?.durationMs || 0);
    const audio = new Audio(mediaUrl);
    audio.preload = "metadata";

    const updateProgress = () => {
      const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Math.max(0, Number(payload?.durationMs || 0) / 1000);
      const current = Math.max(0, Number(audio.currentTime || 0));
      const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
      const activeBars = Math.round(ratio * bars.length);
      bars.forEach((bar, index) => bar.classList.toggle("is-played", index < activeBars));
      duration.textContent = formatMediaDuration(current * 1000) + " / " + formatMediaDuration(total * 1000);
      wave.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    };

    const seekFromClientX = (clientX) => {
      const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      if (!total) return;
      const rect = wave.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      audio.currentTime = ratio * total;
      updateProgress();
    };

    let scrubbing = false;
    wave.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      scrubbing = true;
      wave.setPointerCapture?.(event.pointerId);
      seekFromClientX(event.clientX);
    });
    wave.addEventListener("pointermove", (event) => {
      if (!scrubbing) return;
      event.preventDefault();
      seekFromClientX(event.clientX);
    });
    const endScrub = (event) => {
      if (!scrubbing) return;
      scrubbing = false;
      wave.releasePointerCapture?.(event.pointerId);
    };
    wave.addEventListener("pointerup", endScrub);
    wave.addEventListener("pointercancel", endScrub);

    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", () => {
      button.textContent = "\u275a\u275a";
      markAudioViewed(card, mediaUrl);
    });
    audio.addEventListener("pause", () => { button.textContent = "\u25b6"; });
    audio.addEventListener("ended", () => {
      button.textContent = "\u25b6";
      updateProgress();
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });
    card.addEventListener("dblclick", () => {
      window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
    });
    buildAudioWaveform(mediaUrl, barCount).then((values) => {
      values.forEach((value, index) => bars[index]?.style.setProperty("--wave-level", String(value)));
    });
    card.append(button, wave, duration);
    updateProgress();
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

