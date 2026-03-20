import { getApiUrl } from "./api.js";

const audio = document.getElementById("play-sync-audio");

let eventSource = null;
let socket = null;
let pendingPlayback = null;
let playbackTimer = null;
let lastPlaybackId = "";
let serverClockOffset = 0;
let reconnectTimer = null;

function isSamePlayback(payload) {
  const nextId = String(payload?.id || "").trim();
  return Boolean(nextId) && nextId === lastPlaybackId;
}

function getEstimatedServerNow() {
  return Date.now() + serverClockOffset;
}

async function syncServerClock() {
  const attempts = [];

  for (let index = 0; index < 3; index += 1) {
    const startedAt = Date.now();

    try {
      const response = await fetch(getApiUrl("/api/live-play/time"), { cache: "no-store" });
      const data = await response.json();
      const endedAt = Date.now();

      if (!response.ok || !Number.isFinite(data?.now)) {
        continue;
      }

      const midpoint = startedAt + ((endedAt - startedAt) / 2);
      attempts.push({
        latency: endedAt - startedAt,
        offset: Number(data.now) - midpoint
      });
    } catch {
      // Ignora falhas pontuais de rede.
    }
  }

  if (!attempts.length) {
    return;
  }

  attempts.sort((left, right) => left.latency - right.latency);
  serverClockOffset = attempts[0].offset;
}

async function attemptPlayback() {
  if (!pendingPlayback || !audio) {
    return;
  }

  try {
    await audio.play();
    pendingPlayback = null;
  } catch {
    // Alguns navegadores bloqueiam autoplay sem gesto do usuario.
  }
}

function bindRetryPlayback() {
  const retry = async () => {
    await attemptPlayback();

    if (!pendingPlayback) {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      window.removeEventListener("touchstart", retry);
    }
  };

  window.addEventListener("pointerdown", retry);
  window.addEventListener("keydown", retry);
  window.addEventListener("touchstart", retry, { passive: true });
}

function schedulePlaybackStart(payload) {
  const startAt = Number(payload?.startAt) || getEstimatedServerNow();
  const localDelay = Math.max(0, startAt - getEstimatedServerNow());

  window.clearTimeout(playbackTimer);
  playbackTimer = window.setTimeout(() => {
    attemptPlayback();
  }, localDelay);
}

function applyElapsedPosition(payload) {
  const elapsedSeconds = Math.max(0, (getEstimatedServerNow() - (Number(payload?.startAt) || 0)) / 1000);

  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return;
  }

  const syncPosition = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;

    if (duration > 0) {
      audio.currentTime = Math.min(elapsedSeconds, Math.max(0, duration - 0.25));
    } else {
      audio.currentTime = elapsedSeconds;
    }
  };

  if (audio.readyState >= 1) {
    syncPosition();
    return;
  }

  audio.addEventListener("loadedmetadata", syncPosition, { once: true });
}

async function preparePlayback(payload) {
  if (!audio || !payload?.streamUrl || isSamePlayback(payload)) {
    return;
  }

  lastPlaybackId = String(payload.id || "");
  pendingPlayback = payload;

  audio.pause();
  audio.src = payload.streamUrl;
  audio.currentTime = 0;
  audio.load();

  applyElapsedPosition(payload);
  schedulePlaybackStart(payload);
}

async function handlePlaybackMessage(rawPayload) {
  try {
    const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    await preparePlayback(payload);
  } catch {
    // Ignora payloads invalidos.
  }
}

function connectLivePlaybackFallback() {
  if (eventSource) {
    return;
  }

  eventSource = new EventSource(getApiUrl("/api/live-play/stream"));
  eventSource.addEventListener("playback", (event) => {
    handlePlaybackMessage(event.data);
  });
  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    window.setTimeout(connectLivePlaybackFallback, 1500);
  };
}

function connectLivePlayback() {
  socket?.close();

  const wsOrigin = getApiUrl("").replace(/^http/i, "ws").replace(/\/+$/, "");
  socket = new WebSocket(`${wsOrigin}/api/live-play/ws`);

  socket.addEventListener("open", () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message?.type === "playback") {
        handlePlaybackMessage(message.payload);
      }
    } catch {
      // Ignora mensagens invalidas.
    }
  });

  socket.addEventListener("close", () => {
    connectLivePlaybackFallback();
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connectLivePlayback, 1200);
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

bindRetryPlayback();
await syncServerClock();
window.setInterval(syncServerClock, 20000);
connectLivePlayback();
