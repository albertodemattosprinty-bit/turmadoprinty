import { getApiUrl } from "./api.js";

const audio = document.getElementById("play-sync-audio");

let eventSource = null;
let pendingPlayback = null;
let lastPlaybackId = "";

function isSamePlayback(payload) {
  const nextId = String(payload?.id || "").trim();
  return Boolean(nextId) && nextId === lastPlaybackId;
}

async function startPlayback(payload) {
  if (!audio || !payload?.streamUrl || isSamePlayback(payload)) {
    return;
  }

  lastPlaybackId = String(payload.id || "");
  pendingPlayback = payload;

  try {
    audio.pause();
    audio.src = payload.streamUrl;
    audio.currentTime = 0;
    await audio.play();
    pendingPlayback = null;
  } catch {
    // Alguns navegadores bloqueiam autoplay sem gesto do usuario.
  }
}

function bindRetryPlayback() {
  const retry = async () => {
    if (!pendingPlayback) {
      return;
    }

    try {
      await audio.play();
      pendingPlayback = null;
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      window.removeEventListener("touchstart", retry);
    } catch {
      // Mantem a tentativa para a proxima interacao.
    }
  };

  window.addEventListener("pointerdown", retry);
  window.addEventListener("keydown", retry);
  window.addEventListener("touchstart", retry, { passive: true });
}

function connectLivePlayback() {
  eventSource = new EventSource(getApiUrl("/api/live-play/stream"));

  eventSource.addEventListener("playback", async (event) => {
    try {
      const payload = JSON.parse(event.data);
      await startPlayback(payload);
    } catch {
      // Ignora payloads invalidos.
    }
  });

  eventSource.onerror = () => {
    eventSource?.close();
    window.setTimeout(connectLivePlayback, 1500);
  };
}

bindRetryPlayback();
connectLivePlayback();
