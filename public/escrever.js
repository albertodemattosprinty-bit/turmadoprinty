import { getApiUrl } from "./api.js";

const sessionStorageKey = "turma_do_printy_token";
const doubleTapWindowMs = 500;
const longPressMs = 400;
const chunkIntervalMs = 1200;
const swipeRevealThresholdPx = 70;
const swipeDeleteThresholdPx = 72;

const app = document.getElementById("escrever-app");
const loadingSection = document.getElementById("escrever-loading");
const loadingText = document.getElementById("escrever-loading-text");
const surface = document.getElementById("escrever-surface");
const emptyState = document.getElementById("escrever-empty");
const listElement = document.getElementById("escrever-list");
const liveShell = document.getElementById("escrever-live");
const liveText = document.getElementById("escrever-live-text");
const liveStatus = document.getElementById("escrever-live-status");
const recordingDot = document.getElementById("escrever-recording-dot");
const toast = document.getElementById("escrever-toast");

let paragraphs = [];
let selectedParagraphId = "";
let currentUser = null;
let lastTapAt = 0;
let mediaStream = null;
let mediaRecorder = null;
let isRecording = false;
let liveTranscript = "";
let liveChunkQueue = [];
let liveChunkInFlight = false;
let recordedChunks = [];
let pointerGesture = null;
let toastTimeoutId = 0;

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function setLoading(message) {
  loadingText.textContent = message;
}

function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.hidden = true;
  }, 1800);
}

function setRecordingDotVisible(visible) {
  recordingDot.hidden = !visible;
}

function normalizeTextSpacing(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function appendLiveTranscript(fragment) {
  const normalizedFragment = normalizeTextSpacing(fragment);
  if (!normalizedFragment) {
    return;
  }

  liveTranscript = normalizeTextSpacing(`${liveTranscript} ${normalizedFragment}`);
  liveText.textContent = liveTranscript || "Ouvindo...";
}

async function transcribeBlob(blob, fileName) {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < uint8Array.length; index += chunkSize) {
    const slice = uint8Array.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }

  const response = await fetch(getApiUrl("/api/audio/transcribe"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audioBase64: window.btoa(binary),
      mimeType: blob.type || "audio/webm",
      fileName
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Falha ao transcrever audio.");
  }

  return normalizeTextSpacing(data?.text || "");
}

async function flushLiveChunkQueue() {
  if (liveChunkInFlight) {
    return;
  }

  const nextItem = liveChunkQueue.shift();
  if (!nextItem) {
    return;
  }

  liveChunkInFlight = true;

  try {
    const text = await transcribeBlob(nextItem.blob, nextItem.fileName);
    appendLiveTranscript(text);
    liveStatus.textContent = liveTranscript ? "Falando..." : "Ouvindo...";
  } catch (error) {
    liveStatus.textContent = error instanceof Error ? error.message : "Falha ao ouvir.";
  } finally {
    liveChunkInFlight = false;
    if (liveChunkQueue.length) {
      void flushLiveChunkQueue();
    }
  }
}

async function loadSession() {
  const token = getToken();

  if (!token) {
    window.location.href = `/auth.html?next=${encodeURIComponent("/escrever")}`;
    return;
  }

  const response = await fetch(getApiUrl("/api/auth/me"), {
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok || !data?.user) {
    window.localStorage.removeItem(sessionStorageKey);
    window.location.href = `/auth.html?next=${encodeURIComponent("/escrever")}`;
    return;
  }

  currentUser = data.user;
}

async function loadParagraphs(selectedId = "") {
  const response = await fetch(getApiUrl("/api/escrever/paragraphs"), {
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Falha ao carregar paragrafos.");
  }

  paragraphs = Array.isArray(data?.paragraphs) ? data.paragraphs : [];
  selectedParagraphId = selectedId || selectedParagraphId || paragraphs[paragraphs.length - 1]?.id || "";
  renderParagraphs();
}

function updateSurfaceMode() {
  const hasParagraphs = paragraphs.length > 0;
  emptyState.hidden = hasParagraphs || isRecording;
  listElement.hidden = isRecording;
  liveShell.hidden = !isRecording;
  setRecordingDotVisible(Boolean(isRecording && !recordingDot.hidden));
}

function centerParagraph(paragraphId, behavior = "smooth") {
  if (!paragraphId) {
    return;
  }

  selectedParagraphId = paragraphId;
  renderParagraphs();
  const element = listElement.querySelector(`[data-paragraph-id="${paragraphId}"]`);
  element?.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior
  });
}

async function saveParagraph(text) {
  const normalizedText = normalizeTextSpacing(text);

  if (!normalizedText) {
    showToast("Nenhum texto reconhecido.");
    return;
  }

  const response = await fetch(getApiUrl("/api/escrever/paragraphs"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: normalizedText
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Falha ao salvar paragrafo.");
  }

  const paragraph = data?.paragraph;
  await loadParagraphs(paragraph?.id || "");
}

async function deleteParagraph(paragraphId) {
  const response = await fetch(getApiUrl(`/api/escrever/paragraphs/${encodeURIComponent(paragraphId)}`), {
    method: "DELETE",
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Falha ao excluir paragrafo.");
  }

  const currentIndex = paragraphs.findIndex((item) => item.id === paragraphId);
  const fallbackId = paragraphs[Math.max(0, currentIndex - 1)]?.id || paragraphs[currentIndex + 1]?.id || "";
  await loadParagraphs(fallbackId);
}

function bindParagraphGestures(element, paragraph) {
  let holdTimer = 0;
  let startX = 0;
  let startY = 0;
  let cancelled = false;

  const clearHold = () => {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
  };

  element.addEventListener("pointerdown", (event) => {
    if (isRecording) {
      return;
    }

    startX = event.clientX;
    startY = event.clientY;
    cancelled = false;
    holdTimer = window.setTimeout(async () => {
      holdTimer = 0;
      try {
        await navigator.clipboard.writeText(paragraph.text || "");
        showToast("Paragrafo copiado.");
      } catch {
        showToast("Nao foi possivel copiar.");
      }
    }, longPressMs);
  });

  element.addEventListener("pointermove", (event) => {
    if (!holdTimer) {
      return;
    }

    const deltaX = Math.abs(event.clientX - startX);
    const deltaY = Math.abs(event.clientY - startY);
    if (deltaX > 12 || deltaY > 12) {
      cancelled = true;
      clearHold();
    }
  });

  element.addEventListener("pointerup", async (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = Math.abs(event.clientY - startY);
    const hadHoldTimer = Boolean(holdTimer);
    clearHold();

    if (deltaX <= -swipeDeleteThresholdPx && deltaY < 36) {
      const confirmed = window.confirm("Excluir este paragrafo?");
      if (!confirmed) {
        return;
      }

      try {
        await deleteParagraph(paragraph.id);
        showToast("Paragrafo excluido.");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Falha ao excluir.");
      }
      return;
    }

    if (hadHoldTimer && !cancelled) {
      centerParagraph(paragraph.id);
    }
  });

  element.addEventListener("pointercancel", clearHold);
  element.addEventListener("pointerleave", () => {
    if (!holdTimer) {
      return;
    }
    clearHold();
  });
}

function renderParagraphs() {
  listElement.innerHTML = "";
  updateSurfaceMode();

  if (!paragraphs.length) {
    return;
  }

  paragraphs.forEach((paragraph) => {
    const article = document.createElement("article");
    const isSelected = paragraph.id === selectedParagraphId;
    article.className = `escrever-paragraph${isSelected ? " is-selected" : ""}`;
    article.setAttribute("data-paragraph-id", paragraph.id);

    const text = document.createElement("p");
    text.className = "escrever-paragraph-text";
    text.textContent = paragraph.text;
    article.appendChild(text);

    bindParagraphGestures(article, paragraph);
    listElement.appendChild(article);
  });
}

async function stopRecording() {
  if (!isRecording) {
    return;
  }

  isRecording = false;
  app.classList.remove("is-recording");
  liveStatus.textContent = "Finalizando...";

  const recorder = mediaRecorder;
  mediaRecorder = null;
  let stopPromise = Promise.resolve();

  if (recorder && recorder.state !== "inactive") {
    stopPromise = new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
    });
    recorder.stop();
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  await stopPromise;

  while (liveChunkInFlight || liveChunkQueue.length) {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

  try {
    const fullBlob = new Blob(recordedChunks, {
      type: recordedChunks[0]?.type || "audio/webm"
    });
    let finalText = "";

    if (fullBlob.size > 0) {
      finalText = await transcribeBlob(fullBlob, "escrever-final.webm");
    }

    if (!finalText) {
      finalText = normalizeTextSpacing(liveTranscript);
    }

    if (finalText) {
      await saveParagraph(finalText);
      showToast("Paragrafo salvo.");
    } else {
      showToast("Nada para salvar.");
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Falha ao salvar.");
  } finally {
    recordedChunks = [];
    liveChunkQueue = [];
    liveTranscript = "";
    liveText.textContent = "";
    liveStatus.textContent = "";
    recordingDot.hidden = true;
    renderParagraphs();
    if (selectedParagraphId) {
      centerParagraph(selectedParagraphId, "instant");
    }
  }
}

async function startRecording() {
  if (isRecording) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });

  mediaStream = stream;
  recordedChunks = [];
  liveChunkQueue = [];
  liveChunkInFlight = false;
  liveTranscript = "";
  liveText.textContent = "Ouvindo...";
  liveStatus.textContent = "Falando...";
  recordingDot.hidden = true;

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm"
  });

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (!event.data || event.data.size === 0) {
      return;
    }

    recordedChunks.push(event.data);

    if (isRecording) {
      liveChunkQueue.push({
        blob: event.data,
        fileName: `escrever-live-${Date.now()}.webm`
      });
      void flushLiveChunkQueue();
    }
  });

  mediaRecorder.addEventListener("stop", () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  });

  isRecording = true;
  app.classList.add("is-recording");
  updateSurfaceMode();
  mediaRecorder.start(chunkIntervalMs);
}

async function toggleRecording() {
  try {
    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Falha ao acessar o microfone.");
  }
}

function handleGlobalPointerDown(event) {
  pointerGesture = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedAt: Date.now()
  };
}

function handleGlobalPointerUp(event) {
  if (!pointerGesture || pointerGesture.pointerId !== event.pointerId) {
    return;
  }

  const now = Date.now();
  const deltaX = event.clientX - pointerGesture.x;
  const deltaY = event.clientY - pointerGesture.y;
  const elapsed = now - pointerGesture.startedAt;
  pointerGesture = null;

  if (isRecording && deltaY <= -swipeRevealThresholdPx && Math.abs(deltaX) < 80) {
    recordingDot.hidden = false;
    setRecordingDotVisible(true);
    return;
  }

  if (elapsed < 280 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
    if (now - lastTapAt <= doubleTapWindowMs) {
      lastTapAt = 0;
      void toggleRecording();
      return;
    }

    lastTapAt = now;
  }
}

async function bootstrap() {
  try {
    setLoading("Validando sua conta...");
    await loadSession();
    setLoading("Carregando seus paragrafos...");
    await loadParagraphs();
    loadingSection.hidden = true;
    surface.hidden = false;
    renderParagraphs();
    if (selectedParagraphId) {
      centerParagraph(selectedParagraphId, "instant");
    }
  } catch (error) {
    setLoading(error instanceof Error ? error.message : "Falha ao abrir o escrever.");
  }
}

app.addEventListener("pointerdown", handleGlobalPointerDown);
app.addEventListener("pointerup", handleGlobalPointerUp);

void bootstrap();
