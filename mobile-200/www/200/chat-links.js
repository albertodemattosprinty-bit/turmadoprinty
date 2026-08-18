const CHAT_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/u;
const ILIFE_MEDIA_PREFIX = "[[ILIFE_MEDIA:";
const ILIFE_MEDIA_SUFFIX = "]]";

const PRIVATE_MEDIA_PATH_PREFIX = "/api/200/life-captures/";
const PRIVATE_MEDIA_TOKEN_KEY = "turma_do_printy_token";
let activeChatAudioElement = null;
const chatAudioState = window.__project200ChatAudioState || (window.__project200ChatAudioState = { url: "", playing: false, time: 0, players: new Map() });
if (!(chatAudioState.players instanceof Map)) chatAudioState.players = new Map();

function stopActiveChatAudio(exceptAudio = null) {
  if (activeChatAudioElement && activeChatAudioElement !== exceptAudio) {
    try { activeChatAudioElement.pause(); } catch {}
  }
}

function playNextChatAudio(card) {
  const nextCard = card?.parentElement?.querySelector?.(".marin-message-audio-card + .marin-message-audio-card");
  const nextButton = nextCard?.querySelector?.(".marin-message-audio-button");
  if (nextButton) nextButton.click();
}

function readPrivateMediaToken() {
  try {
    const localToken = String(window.localStorage.getItem(PRIVATE_MEDIA_TOKEN_KEY) || "").trim();
    if (localToken) return localToken;
  } catch {}
  try {
    const match = document.cookie.match(/(?:^|; )turma_do_printy_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getPrivateMediaApiOrigin() {
  const metaValue = document.querySelector('meta[name="tdp-api-base-url"]')?.getAttribute("content")?.trim();
  if (metaValue) return metaValue.replace(/\/+$/, "");
  const runtimeValue = typeof window.__TDP_API_BASE_URL__ === "string" ? window.__TDP_API_BASE_URL__.trim() : "";
  if (runtimeValue) return runtimeValue.replace(/\/+$/, "");
  const capacitor = window.Capacitor;
  const platform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "web";
  const isNative = typeof capacitor?.isNativePlatform === "function" ? capacitor.isNativePlatform() : platform === "android" || platform === "ios";
  if (isNative) return "https://turmadoprinty.onrender.com";
  return window.location.origin.replace(/\/+$/, "");
}

function withPrivateMediaAuth(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) return "";
  try {
    const parsed = new URL(safeUrl, getPrivateMediaApiOrigin());
    if (!parsed.pathname.startsWith(PRIVATE_MEDIA_PATH_PREFIX)) return safeUrl;
    parsed.searchParams.delete("token");
    const token = readPrivateMediaToken();
    if (token) parsed.searchParams.set("token", token);
    return parsed.toString();
  } catch {
    return safeUrl;
  }
}

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
  const seconds = total % 60;
  if (minutes <= 0) return seconds + "s";
  return minutes + " min e " + seconds + " s";
}

function getChatAudioPlayer(mediaUrl) {
  const key = String(mediaUrl || "");
  if (!key) return null;
  const existing = chatAudioState.players.get(key);
  if (existing) return existing;
  const audio = new Audio(key);
  audio.preload = "metadata";
  audio.playsInline = true;
  audio.playbackRate = 1;
  chatAudioState.players.set(key, audio);
  return audio;
}

function formatPlaybackRate(rate) {
  return Math.max(1, Math.min(2.5, Number(rate || 1))).toFixed(2) + "x";
}

function nextPlaybackRate(rate) {
  const steps = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
  const current = Number(rate || 1);
  return steps.find((step) => step > current + 0.01) || 1;
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

function createMediaCard(payload, options = {}) {
  const kind = String(payload?.kind || "").trim().toLowerCase();
  const previewUrl = withPrivateMediaAuth(payload?.previewUrl || payload?.previewRemoteUrl || payload?.previewDataUrl || "");
  const mediaUrl = withPrivateMediaAuth(payload?.mediaUrl || payload?.remoteUrl || "");
  const noteText = String(payload?.noteText || "").trim();
  if (!previewUrl && !mediaUrl && kind !== "text") return null;

  if (kind === "audio" && mediaUrl) {
    const role = String(options.role || payload?.role || "").trim().toLowerCase();
    const isUserAudio = role === "user";
    const card = document.createElement("div");
    card.className = "marin-message-audio-card";
    card.classList.toggle("is-user-audio", isUserAudio);
    card.classList.toggle("is-viewed", hasAudioBeenViewed(mediaUrl));

    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-message-audio-button";
    button.textContent = "\u25b6";
    button.setAttribute("aria-label", "Reproduzir audio");

    const label = document.createElement(isUserAudio ? "button" : "span");
    label.className = "marin-message-audio-label";
    if (isUserAudio) {
      label.type = "button";
      label.setAttribute("aria-label", "Reproduzir audio enviado");
      label.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5-.9a1 1 0 0 0-1.4 1.4A3.5 3.5 0 0 1 16 12a3.5 3.5 0 0 1-.9 2.5 1 1 0 1 0 1.4 1.4A5.5 5.5 0 0 0 18 12a5.5 5.5 0 0 0-1.5-3.9Zm2.8-2.8a1 1 0 0 0-1.4 1.4A7.4 7.4 0 0 1 20 12a7.4 7.4 0 0 1-2.1 5.3 1 1 0 0 0 1.4 1.4A9.4 9.4 0 0 0 22 12a9.4 9.4 0 0 0-2.7-6.7Z" fill="currentColor"/></svg><strong>Audio enviado</strong>';
    } else {
      const wave = document.createElement("span");
      wave.className = "marin-message-audio-wave";
      wave.setAttribute("role", "slider");
      wave.setAttribute("aria-label", "Linha do tempo do audio");
      wave.setAttribute("aria-valuemin", "0");
      wave.setAttribute("aria-valuemax", "100");
      wave.setAttribute("aria-valuenow", "0");
      label.appendChild(wave);
    }

    const progress = document.createElement("span");
    progress.className = "marin-message-audio-progress";
    const progressFill = document.createElement("i");
    const progressDot = document.createElement("b");
    progress.append(progressFill, progressDot);

    const duration = document.createElement("button");
    duration.type = "button";
    duration.className = "marin-message-audio-duration";
    duration.setAttribute("aria-label", "Alterar velocidade do audio");

    const audio = getChatAudioPlayer(mediaUrl);
    const barCount = 32;
    const bars = [];
    const wave = label.querySelector?.(".marin-message-audio-wave") || null;
    if (wave) {
      for (let index = 0; index < barCount; index += 1) {
        const bar = document.createElement("i");
        bar.style.setProperty("--wave-level", "0.28");
        wave.appendChild(bar);
        bars.push(bar);
      }
    }

    const totalSeconds = () => {
      const recordedTotal = Math.max(0, Number(payload?.durationMs || 0) / 1000);
      return recordedTotal > 0 ? recordedTotal : (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0);
    };

    const updateProgress = () => {
      const total = totalSeconds();
      const current = Math.max(0, Number(audio.currentTime || 0));
      const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
      bars.forEach((bar, index) => bar.classList.toggle("is-played", index < Math.round(ratio * bars.length)));
      progressFill.style.width = (ratio * 100).toFixed(2) + "%";
      progressDot.style.left = (ratio * 100).toFixed(2) + "%";
      if (wave) wave.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      duration.textContent = audio.paused ? formatMediaDuration(total * 1000) : formatPlaybackRate(audio.playbackRate);
      button.textContent = audio.paused ? "\u25b6" : "\u275a\u275a";
      card.classList.toggle("is-playing", !audio.paused && !audio.ended);
    };

    const seekFromClientX = (clientX) => {
      const total = totalSeconds();
      if (!total) return;
      const target = wave || progress;
      const rect = target.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      audio.currentTime = ratio * total;
      updateProgress();
    };

    let scrubbing = false;
    const bindSeek = (target) => {
      if (!target) return;
      target.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        scrubbing = true;
        target.setPointerCapture?.(event.pointerId);
        seekFromClientX(event.clientX);
      });
      target.addEventListener("pointermove", (event) => {
        if (!scrubbing) return;
        event.preventDefault();
        seekFromClientX(event.clientX);
      });
      const endScrub = (event) => {
        if (!scrubbing) return;
        scrubbing = false;
        target.releasePointerCapture?.(event.pointerId);
      };
      target.addEventListener("pointerup", endScrub);
      target.addEventListener("pointercancel", endScrub);
    };
    bindSeek(wave);
    bindSeek(progress);

    const togglePlay = (event) => {
      event?.stopPropagation?.();
      if (audio.paused) {
        stopActiveChatAudio(audio);
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    };

    button.addEventListener("click", togglePlay);
    if (isUserAudio) label.addEventListener("click", togglePlay);
    duration.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) return;
      audio.playbackRate = nextPlaybackRate(audio.playbackRate);
      updateProgress();
    });

    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("ratechange", updateProgress);
    audio.addEventListener("timeupdate", () => {
      chatAudioState.url = mediaUrl;
      chatAudioState.time = Math.max(0, Number(audio.currentTime || 0));
      updateProgress();
    });
    audio.addEventListener("play", () => {
      stopActiveChatAudio(audio);
      activeChatAudioElement = audio;
      chatAudioState.url = mediaUrl;
      chatAudioState.playing = true;
      chatAudioState.time = Math.max(0, Number(audio.currentTime || 0));
      markAudioViewed(card, mediaUrl);
      updateProgress();
    });
    audio.addEventListener("pause", () => {
      if (activeChatAudioElement === audio) activeChatAudioElement = null;
      if (chatAudioState.url === mediaUrl) {
        chatAudioState.playing = false;
        chatAudioState.time = Math.max(0, Number(audio.currentTime || 0));
      }
      updateProgress();
    });
    audio.addEventListener("ended", () => {
      if (activeChatAudioElement === audio) activeChatAudioElement = null;
      if (chatAudioState.url === mediaUrl) {
        chatAudioState.playing = false;
        chatAudioState.time = 0;
      }
      audio.currentTime = 0;
      updateProgress();
      window.setTimeout(() => card.classList.remove("is-playing"), 500);
      playNextChatAudio(card);
    });

    if (wave) {
      buildAudioWaveform(mediaUrl, barCount).then((values) => {
        values.forEach((value, index) => bars[index]?.style.setProperty("--wave-level", String(value)));
      });
    }

    if (chatAudioState.url === mediaUrl && Number(chatAudioState.time || 0) > 0 && audio.paused) {
      try { audio.currentTime = Number(chatAudioState.time || 0); } catch {}
    }
    if (isUserAudio) card.append(label, progress);
    else card.append(button, label, duration);
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
    image.alt = "";
    trigger.appendChild(image);
  }

  trigger.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
  });

  card.appendChild(trigger);


  return card;
}

export function renderChatMessageContent(container, content, options = {}) {
  if (!(container instanceof Element)) return;
  const text = String(content || "");
  container.replaceChildren();
  const mediaPayload = parseMediaPayload(text);
  if (mediaPayload) {
    const card = createMediaCard(mediaPayload, options);
    if (card) container.append(card);
    return;
  }
  renderPlainText(container, text);
}

