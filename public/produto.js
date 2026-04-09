import { getToken, initSiteHeader } from "./header.js";
import { getApiUrl } from "./api.js";

const offlineCacheName = "turma-do-printy-offline-v1";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productPrice = document.getElementById("product-price");
const buyAlbumButton = document.getElementById("buy-album-button");
const lyricsDownloadButton = document.getElementById("lyrics-download-button");
const trackList = document.getElementById("track-list");
const albumAdminPanel = document.getElementById("album-admin-panel");
const albumPriceInput = document.getElementById("album-price-input");
const albumSaveButton = document.getElementById("album-save-button");
const albumAdminStatus = document.getElementById("album-admin-status");

let accessState = {
  authenticated: false,
  planId: "gratis",
  canDownloadAll: false,
  purchasedAlbumIds: []
};

let currentAudio = null;
let currentTrackNumber = null;
let currentUser = null;
let currentAlbum = null;
let activeSpeechRecognition = null;
let lyricsSilenceTimer = null;
let floatingNoticeTimer = null;
let albumShortcutBuffer = "";
let albumShortcutTimer = null;
const adminUsername = "rosemattos";
const freePreviewSeconds = 30;
const freePreviewFadeSeconds = 4;

function normalizeCatalogText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasFullCatalogAccess() {
  return ["pro", "life"].includes(normalizeCatalogText(accessState.planId));
}

function isPlusPlaybackAlbumName(albumName) {
  const normalized = normalizeCatalogText(albumName);

  if (!normalized) {
    return false;
  }

  if (/^datas comemorativas [1-8]$/.test(normalized)) {
    return true;
  }

  if (/^louvores da garotada [1-8]$/.test(normalized)) {
    return true;
  }

  if (normalized.startsWith("coletanea")) {
    return true;
  }

  return ["favoritas", "favoritas 1", "favoritas 2", "ebd", "zero a seis anos"].includes(normalized);
}

function canStreamTrack(albumId, albumName, track) {
  if (hasPurchasedAlbum(albumId) || hasFullCatalogAccess()) {
    return true;
  }

  if (track?.type !== "playback") {
    return true;
  }

  return normalizeCatalogText(accessState.planId) === "plus" && isPlusPlaybackAlbumName(albumName);
}

function isRoseMattosUser() {
  return String(currentUser?.username || "").trim().toLowerCase() === adminUsername;
}

function canDownloadTrack(albumId, albumName, track) {
  if (hasPurchasedAlbum(albumId) || hasFullCatalogAccess()) {
    return true;
  }

  if (normalizeCatalogText(accessState.planId) !== "plus") {
    return false;
  }

  if (track?.type !== "playback") {
    return true;
  }

  return isPlusPlaybackAlbumName(albumName);
}

function shouldLimitFreePreview(albumId, albumName, track) {
  return !hasPurchasedAlbum(albumId)
    && normalizeCatalogText(accessState.planId) === "gratis"
    && canStreamTrack(albumId, albumName, track);
}

function getTrackModeLabel(track) {
  return track?.type === "playback" ? "Playback" : "Full";
}

function getAlbumId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("album") || "";
}

function getAuthRedirectUrl(albumId) {
  return `/auth.html?next=${encodeURIComponent(`/produto.html?album=${encodeURIComponent(albumId)}`)}`;
}

function redirectToAuth(albumId) {
  window.location.href = getAuthRedirectUrl(albumId);
}

function getOwnedProductsUrl() {
  return "/produtos.html?modo=owned";
}

function setBuyButtonState({ label, onClick, disabled = false, ariaLabel = "" }) {
  if (!buyAlbumButton) {
    return;
  }

  const nextLabel = String(label || "").trim() || "Comprar";
  buyAlbumButton.disabled = disabled;
  buyAlbumButton.setAttribute("aria-label", ariaLabel || nextLabel);
  buyAlbumButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h-2l-1 2H1v2h2l2.4 8.1A2 2 0 0 0 6.3 18H17a2 2 0 0 0 1.9-1.4L21 8H7.4l-.5-2zM9 20a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
    <span>${nextLabel}</span>
  `;
  buyAlbumButton.onclick = onClick || null;
}

function hasPurchasedAlbum(albumId) {
  return accessState.purchasedAlbumIds.includes(albumId);
}

function canUseDownloads(albumId) {
  return accessState.canDownloadAll || hasPurchasedAlbum(albumId);
}

function hasLyricsZip(album) {
  return Boolean(album?.lyricsZipUrl && album.lyricsZipUrl !== "[none]");
}

function syncLyricsDownloadButton(album) {
  if (!lyricsDownloadButton) {
    return;
  }

  lyricsDownloadButton.hidden = false;
  lyricsDownloadButton.disabled = false;
  lyricsDownloadButton.onclick = () => {
    if (!canUseDownloads(album.id)) {
      showFloatingNotice("Você ainda não tem esse álbum");
      return;
    }

    if (!hasLyricsZip(album)) {
      showFloatingNotice("Textos ainda nÃ£o disponÃ­veis para este Ã¡lbum");
      return;
    }

    window.open(album.lyricsZipUrl, "_blank", "noopener");
  };
}

function showFloatingNotice(message) {
  let notice = document.getElementById("floating-notice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "floating-notice";
    notice.className = "floating-notice";
    document.body.appendChild(notice);
  }

  notice.textContent = message;
  notice.classList.add("visible");

  if (floatingNoticeTimer) {
    clearTimeout(floatingNoticeTimer);
  }

  floatingNoticeTimer = window.setTimeout(() => {
    notice.classList.remove("visible");
  }, 2000);
}

function isAdmin() {
  return Boolean(
    currentUser?.isAdmin &&
    String(currentUser?.username || "").trim().toLowerCase() === adminUsername
  );
}

function clearAlbumShortcutBuffer() {
  albumShortcutBuffer = "";
  if (albumShortcutTimer) {
    clearTimeout(albumShortcutTimer);
    albumShortcutTimer = null;
  }
}

function refreshTrackTitleUi(card, nextTitle) {
  if (!card) {
    return;
  }

  const titleDisplay = card.querySelector(".track-title-display");
  const titleInput = card.querySelector(".track-title-input");
  const trackTitle = card.querySelector(".track-title");
  const safeTitle = String(nextTitle || "").trim();

  if (titleInput) {
    titleInput.value = safeTitle;
  }

  if (titleDisplay) {
    titleDisplay.textContent = safeTitle;
  }

  if (trackTitle) {
    trackTitle.textContent = safeTitle;
  }
}

function getEditableTrackCards() {
  return Array.from(document.querySelectorAll(".track-card"));
}

function ensureBulkTitleModal() {
  let modal = document.getElementById("bulk-track-title-modal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.id = "bulk-track-title-modal";
  modal.className = "bulk-track-title-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="bulk-track-title-backdrop" data-role="close-modal"></div>
    <div class="bulk-track-title-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-track-title-heading">
      <h2 id="bulk-track-title-heading">Colar nomes das músicas</h2>
      <p>Cole uma lista com um nome por linha. Os nomes vazios serão preenchidos em ordem.</p>
      <textarea id="bulk-track-title-input" placeholder="Exemplo&#10;Primeira música&#10;Segunda música&#10;Terceira música"></textarea>
      <div class="bulk-track-title-actions">
        <button id="bulk-track-title-cancel" class="ghost-button" type="button">Cancelar</button>
        <button id="bulk-track-title-apply" class="primary-button" type="button">Preencher</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-role='close-modal']").forEach((element) => {
    element.addEventListener("click", () => {
      modal.hidden = true;
    });
  });

  modal.querySelector("#bulk-track-title-cancel")?.addEventListener("click", () => {
    modal.hidden = true;
  });

  modal.querySelector("#bulk-track-title-apply")?.addEventListener("click", () => {
    const input = modal.querySelector("#bulk-track-title-input");
    const pastedLines = String(input?.value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!pastedLines.length) {
      albumAdminStatus.textContent = "Cole pelo menos um nome para preencher.";
      return;
    }

    const emptyCards = getEditableTrackCards().filter((card) => {
      const titleInput = card.querySelector(".track-title-input");
      const titleText = titleInput?.value?.trim() || "";
      return !titleText;
    });

    if (!emptyCards.length) {
      albumAdminStatus.textContent = "Nao encontrei nomes vazios para preencher.";
      modal.hidden = true;
      return;
    }

    let appliedCount = 0;

    emptyCards.forEach((card, index) => {
      const nextTitle = pastedLines[index];
      if (!nextTitle) {
        return;
      }

      refreshTrackTitleUi(card, nextTitle);
      appliedCount += 1;
    });

    albumAdminStatus.textContent = appliedCount
      ? `${appliedCount} nome(s) preenchido(s). Clique em "Salvar album" para gravar.`
      : "Os nomes colados foram menores do que a quantidade de slots vazios.";

    if (input) {
      input.value = "";
    }

    modal.hidden = true;
  });

  return modal;
}

function openBulkTitleModal() {
  if (!isAdmin()) {
    return;
  }

  const modal = ensureBulkTitleModal();
  modal.hidden = false;
  const input = modal.querySelector("#bulk-track-title-input");
  if (input instanceof HTMLTextAreaElement) {
    input.focus();
    input.select();
  }
}

function syncPlaybackTitlesFromLinkedSongs() {
  if (!isAdmin()) {
    return;
  }

  const cards = getEditableTrackCards();
  if (!cards.length) {
    return;
  }

  const cardsByTrackNumber = new Map(
    cards.map((card) => [Number(card.dataset.trackNumber), card])
  );

  let updatedCount = 0;

  cards.forEach((card) => {
    const playbackSelect = card.querySelector(".track-playback-select");
    const sourceTitleInput = card.querySelector(".track-title-input");
    const sourceTitle = String(sourceTitleInput?.value || "").trim();
    const linkedPlaybackNumber = Number(playbackSelect?.value || 0);

    if (!linkedPlaybackNumber || !sourceTitle) {
      return;
    }

    const playbackCard = cardsByTrackNumber.get(linkedPlaybackNumber);
    if (!playbackCard) {
      return;
    }

    refreshTrackTitleUi(playbackCard, sourceTitle);
    updatedCount += 1;
  });

  albumAdminStatus.textContent = updatedCount
    ? `${updatedCount} playback(s) herdaram o nome da musica vinculada. Clique em "Salvar album" para gravar.`
    : "Nenhum playback vinculado encontrou um nome de musica para herdar.";
}

function handleAlbumAdminShortcuts(event) {
  if (!isAdmin() || !currentAlbum) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement) {
    const tagName = target.tagName;
    const isTypingField = target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    if (isTypingField) {
      return;
    }
  }

  const key = String(event.key || "").toLowerCase();
  if (key !== "t" && key !== "y") {
    clearAlbumShortcutBuffer();
    return;
  }

  albumShortcutBuffer = `${albumShortcutBuffer}${key}`.slice(-2);

  if (albumShortcutTimer) {
    clearTimeout(albumShortcutTimer);
  }

  albumShortcutTimer = window.setTimeout(() => {
    clearAlbumShortcutBuffer();
  }, 700);

  if (albumShortcutBuffer === "tt") {
    event.preventDefault();
    clearAlbumShortcutBuffer();
    openBulkTitleModal();
    return;
  }

  if (albumShortcutBuffer === "yy") {
    event.preventDefault();
    clearAlbumShortcutBuffer();
    syncPlaybackTitlesFromLinkedSongs();
  }
}

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      planId: "gratis",
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    currentUser = null;
    return;
  }

  const [accessResponse, meResponse] = await Promise.all([
    fetch(getApiUrl("/api/account/access"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(() => null)
  ]);

  const accessData = await accessResponse.json();

  if (accessResponse.status === 401) {
    window.localStorage.removeItem(sessionStorageKey);
    accessState = {
      authenticated: false,
      planId: "gratis",
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    currentUser = null;
    return;
  }

  if (!accessResponse.ok) {
    throw new Error(accessData.error || "Falha ao carregar acesso do usuario.");
  }

  accessState = {
    authenticated: true,
    planId: accessData.access?.plan?.id || accessData.access?.planId || "gratis",
    canDownloadAll: Boolean(accessData.access.canDownloadAll),
    purchasedAlbumIds: Array.isArray(accessData.access.purchasedAlbumIds) ? accessData.access.purchasedAlbumIds : []
  };

  if (meResponse?.ok) {
    const meData = await meResponse.json();
    currentUser = meData.user || null;
  }
}

function setPurchaseStatus(albumId) {
  const purchaseStatus = document.getElementById("purchase-status");

  if (!purchaseStatus) {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get("payment") === "return") {
    purchaseStatus.textContent = "Pagamento enviado ao Stripe. Aguarde a confirmacao para liberar seus downloads.";
    return;
  }

  if (canUseDownloads(albumId)) {
    purchaseStatus.textContent = accessState.authenticated
      ? "Download liberado para este album na sua conta."
      : "Faca login para acessar seus downloads.";
    return;
  }

  if (normalizeCatalogText(accessState.planId) === "plus") {
    purchaseStatus.textContent = "Plano Plus: downloads e playbacks liberados conforme a faixa e a colecao.";
    return;
  }

  purchaseStatus.textContent = "";
}

async function startCheckout(albumId) {
  const token = getToken();

  if (!token) {
    redirectToAuth(albumId);
    return;
  }

  setBuyButtonState({
    label: "Abrindo checkout...",
    disabled: true,
    ariaLabel: "Abrindo checkout"
  });

  try {
    const response = await fetch(getApiUrl("/api/payments/stripe/checkout"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: albumId })
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (response.status === 401) {
      redirectToAuth(albumId);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Falha ao criar checkout.");
    }

    if (!data.payUrl) {
      throw new Error("Checkout criado sem link de pagamento.");
    }

    window.location.href = data.payUrl;
  } catch (error) {
    const purchaseStatus = document.getElementById("purchase-status");
    if (purchaseStatus) {
      purchaseStatus.textContent = error instanceof Error ? error.message : "Erro ao iniciar pagamento.";
    }
    setBuyButtonState({
      label: "Comprar",
      onClick: async () => {
        await startCheckout(albumId);
      },
      ariaLabel: "Comprar album"
    });
  }
}

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getOfflineCacheKey(albumId, trackNumber) {
  return `/offline-tracks/${encodeURIComponent(albumId)}/${trackNumber}.mp3`;
}

async function getOfflineTrackUrl(albumId, trackNumber) {
  const cache = await caches.open(offlineCacheName);
  const match = await cache.match(getOfflineCacheKey(albumId, trackNumber));

  if (!match) {
    return "";
  }

  const blob = await match.blob();
  return URL.createObjectURL(blob);
}

async function isTrackDownloaded(albumId, trackNumber) {
  const cache = await caches.open(offlineCacheName);
  return Boolean(await cache.match(getOfflineCacheKey(albumId, trackNumber)));
}

function updatePlayerButtons() {
  document.querySelectorAll(".track-card").forEach((card) => {
    const trackNumber = Number(card.dataset.trackNumber);
    const playButton = card.querySelector("[data-role='play']");
    const progressBar = card.querySelector("[data-role='progress']");
    const currentTimeLabel = card.querySelector("[data-role='current-time']");
    const durationLabel = card.querySelector("[data-role='duration']");
    const audio = card.querySelector("audio");

    if (!playButton || !audio) {
      return;
    }

    const isCurrent = currentTrackNumber === trackNumber && currentAudio;
    const isPlaying = isCurrent && !currentAudio.paused;
    playButton.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    playButton.setAttribute("aria-label", isPlaying ? "Pausar faixa" : "Tocar faixa");

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (progressBar) {
      progressBar.value = String(progress);
      progressBar.style.setProperty("--track-progress", `${progress}%`);
    }

    if (currentTimeLabel) {
      currentTimeLabel.textContent = formatTime(currentTime);
    }

    if (durationLabel) {
      durationLabel.textContent = formatTime(duration);
    }
  });
}

function bindAudioToCard(card, audio) {
  if (!audio) {
    return;
  }

  audio.addEventListener("loadedmetadata", updatePlayerButtons);
  audio.addEventListener("timeupdate", () => {
    const previewLimit = Number(card.dataset.previewLimitSeconds || 0);

    if (previewLimit > 0) {
      const fadeStart = Math.max(0, previewLimit - freePreviewFadeSeconds);

      if (audio.currentTime >= previewLimit) {
        audio.volume = 1;
        audio.pause();
        showFloatingNotice("No plano gratis a previa vai ate 30 segundos.");
      } else if (audio.currentTime >= fadeStart) {
        const remaining = Math.max(0, previewLimit - audio.currentTime);
        audio.volume = Math.min(1, remaining / Math.max(freePreviewFadeSeconds, 1));
      } else {
        audio.volume = 1;
      }
    } else {
      audio.volume = 1;
    }

    updatePlayerButtons();
  });
  audio.addEventListener("ended", () => {
    audio.volume = 1;
    audio.currentTime = 0;
    updatePlayerButtons();
  });
  audio.addEventListener("pause", () => {
    audio.volume = 1;
    updatePlayerButtons();
  });
  audio.addEventListener("play", updatePlayerButtons);

  const progressBar = card.querySelector("[data-role='progress']");
  if (progressBar) {
    progressBar.addEventListener("input", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const nextTime = duration > 0 ? (Number(progressBar.value) / 100) * duration : 0;
      audio.currentTime = nextTime;
      updatePlayerButtons();
    });
  }
}

async function playTrack(card, albumId, track) {
  const audio = card.querySelector("audio");

  if (!audio) {
    return;
  }

  if (!canStreamTrack(albumId, currentAlbum?.name, track)) {
    showFloatingNotice("Seu plano nao libera ouvir este playback.");
    return;
  }

  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (!audio.dataset.ready) {
    const offlineUrl = await getOfflineTrackUrl(albumId, track.number);
    audio.src = offlineUrl || track.streamUrl;
    audio.dataset.ready = "true";
  }

  const previewLimit = Number(card.dataset.previewLimitSeconds || 0);
  if (previewLimit > 0 && audio.currentTime >= previewLimit) {
    audio.currentTime = 0;
  }

  currentAudio = audio;
  currentTrackNumber = track.number;
  await audio.play();
  updatePlayerButtons();
}

function setDownloadUi(card, { downloading = false, progress = 0, downloaded = false, label = "" } = {}) {
  const actionLabel = card.querySelector(".track-download-label");
  const downloadButton = card.querySelector("[data-role='download']");

  if (!actionLabel || !downloadButton) {
    return;
  }

  if (downloading) {
    actionLabel.textContent = label || `Baixando ${Math.round(progress)}%`;
    downloadButton.disabled = true;
    return;
  }

  actionLabel.textContent = downloaded ? "Download concluido, voce pode acessar sem internet" : label || card.dataset.trackMode || "Full";
  downloadButton.disabled = false;
}

async function downloadTrackForOffline(card, albumId, track) {
  if (!accessState.authenticated) {
    redirectToAuth(albumId);
    return;
  }

  if (!canDownloadTrack(albumId, currentAlbum?.name, track)) {
    showFloatingNotice("Seu plano nao libera download desta faixa.");
    return;
  }

  const response = await fetch(getApiUrl(`/api/store/products/${encodeURIComponent(albumId)}/tracks/${track.number}/download`), {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (response.status === 401) {
    redirectToAuth(albumId);
    return;
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Falha ao baixar faixa para uso offline.");
  }

  const totalBytes = Number(response.headers.get("content-length") || 0);
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  setDownloadUi(card, {
    downloading: true,
    progress: 0,
    label: "Preparando download offline..."
  });

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    receivedBytes += value.length;

    const progress = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0;
    setDownloadUi(card, {
      downloading: true,
      progress,
      label: totalBytes > 0 ? `Baixando ${Math.round(progress)}%` : "Baixando..."
    });
  }

  const blob = new Blob(chunks, { type: "audio/mpeg" });
  const cache = await caches.open(offlineCacheName);
  await cache.put(getOfflineCacheKey(albumId, track.number), new Response(blob, {
    headers: {
      "Content-Type": "audio/mpeg"
    }
  }));

  const audio = card.querySelector("audio");
  if (audio) {
    audio.src = URL.createObjectURL(blob);
    audio.dataset.ready = "true";
  }

  setDownloadUi(card, { downloaded: true });
}

function stopSpeechRecognition() {
  if (lyricsSilenceTimer) {
    clearTimeout(lyricsSilenceTimer);
    lyricsSilenceTimer = null;
  }

  if (activeSpeechRecognition) {
    activeSpeechRecognition.stop();
    activeSpeechRecognition = null;
  }
}

function resetSpeechSilenceTimeout() {
  if (lyricsSilenceTimer) {
    clearTimeout(lyricsSilenceTimer);
  }

  lyricsSilenceTimer = window.setTimeout(() => {
    stopSpeechRecognition();
  }, 5000);
}

function createSpeechRecognition(onText, onStatus) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    onStatus?.("Ditado nao suportado neste navegador.");
    return null;
  }

  stopSpeechRecognition();
  const recognition = new Recognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    let text = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) {
        text += `${result[0].transcript} `;
      }
    }

    if (text.trim()) {
      onText(text.trim());
      resetSpeechSilenceTimeout();
    }
  };

  recognition.onerror = () => {
    onStatus?.("Microfone interrompido.");
    stopSpeechRecognition();
  };

  recognition.onend = () => {
    activeSpeechRecognition = null;
  };

  activeSpeechRecognition = recognition;
  return recognition;
}

function enableTitleVoiceShortcut(card, titleInput) {
  let holdTimer = null;
  const titleStatus = card.querySelector(".track-editor-status");

  const startHold = () => {
    holdTimer = window.setTimeout(() => {
      const recognition = createSpeechRecognition((text) => {
        titleInput.value = text;
        titleInput.dispatchEvent(new Event("input"));
        titleStatus.textContent = "Titulo atualizado por voz.";
      }, (message) => {
        titleStatus.textContent = message;
      });

      if (recognition) {
        recognition.start();
        titleStatus.textContent = "Ouvindo titulo...";
        resetSpeechSilenceTimeout();
      }
    }, 500);
  };

  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  titleInput.addEventListener("pointerdown", startHold);
  titleInput.addEventListener("pointerup", cancelHold);
  titleInput.addEventListener("pointerleave", cancelHold);
}

function attachLyricsVoiceShortcut(card, lyricsInput) {
  const titleStatus = card.querySelector(".track-editor-status");

  lyricsInput.addEventListener("input", () => {
    if (!isAdmin()) {
      return;
    }

    if (!lyricsInput.value.toLowerCase().includes("miki")) {
      return;
    }

    lyricsInput.value = lyricsInput.value.replace(/miki/ig, "").trimStart();
    const recognition = createSpeechRecognition((text) => {
      lyricsInput.value = `${lyricsInput.value}${lyricsInput.value ? "\n" : ""}${text}`;
      titleStatus.textContent = "Letra recebendo ditado...";
      resetSpeechSilenceTimeout();
    }, (message) => {
      titleStatus.textContent = message;
    });

    if (recognition) {
      recognition.start();
      titleStatus.textContent = "Microfone da letra ligado.";
      resetSpeechSilenceTimeout();
    }
  });
}

function collectEditableTracks() {
  return Array.from(document.querySelectorAll(".track-card")).map((card) => {
    const number = Number(card.dataset.trackNumber);
    const titleInput = card.querySelector(".track-title-input");
    const typeButton = card.querySelector(".track-type-toggle");
    const lyricsInput = card.querySelector(".track-lyrics-input");
    const playbackSelect = card.querySelector(".track-playback-select");
    const track = currentAlbum.tracks.find((item) => item.number === number);

    return {
      ...track,
      title: titleInput ? titleInput.value.trim() || track.title : track.title,
      label: titleInput ? titleInput.value.trim() || track.title : track.title,
      type: typeButton?.dataset.trackType || track.type,
      playbackTrackNumber: playbackSelect && playbackSelect.value ? Number(playbackSelect.value) : null,
      lyrics: lyricsInput ? lyricsInput.value : track.lyrics || ""
    };
  });
}

function bindAdminTrackEditor(card, album, track) {
  if (!isAdmin()) {
    return;
  }

  const titleDisplay = card.querySelector(".track-title-display");
  const titleInput = card.querySelector(".track-title-input");
  const typeButton = card.querySelector(".track-type-toggle");
  const editorToggle = card.querySelector(".track-editor-toggle");
  const editorPanel = card.querySelector(".track-editor-panel");
  const playbackSelect = card.querySelector(".track-playback-select");
  const lyricsInput = card.querySelector(".track-lyrics-input");
  const playLyricsButton = card.querySelector(".track-editor-play");
  const backLyricsButton = card.querySelector(".track-editor-back");
  const forwardLyricsButton = card.querySelector(".track-editor-forward");

  titleDisplay.hidden = false;
  titleInput.hidden = true;

  titleDisplay.addEventListener("click", () => {
    titleDisplay.hidden = true;
    titleInput.hidden = false;
    titleInput.focus();
    titleInput.select();
  });

  titleInput.addEventListener("blur", () => {
    titleDisplay.textContent = titleInput.value.trim() || track.title;
    titleDisplay.hidden = false;
    titleInput.hidden = true;
  });

  typeButton.addEventListener("click", () => {
    const nextType = typeButton.dataset.trackType === "playback" ? "full" : "playback";
    typeButton.dataset.trackType = nextType;
    typeButton.textContent = nextType === "playback" ? "Playback" : "Full";
    card.dataset.trackMode = nextType === "playback" ? "Playback" : "Full";
    const labelNode = card.querySelector(".track-download-label");
    if (labelNode && !labelNode.textContent.includes("offline")) {
      labelNode.textContent = card.dataset.trackMode;
    }
    playbackSelect.disabled = nextType !== "full";
  });

  editorToggle?.addEventListener("click", () => {
    editorPanel.hidden = !editorPanel.hidden;
  });

  playLyricsButton.addEventListener("click", async () => {
    const audio = card.querySelector("audio");

    if (audio && !audio.src) {
      await playTrack(card, album.id, track);
      audio.pause();
    }

    if (audio.paused) {
      await playTrack(card, album.id, track);
    } else {
      audio.pause();
    }

    playLyricsButton.textContent = audio.paused ? "Play" : "Pause";
  });

  backLyricsButton.addEventListener("click", () => {
    const audio = card.querySelector("audio");
    if (audio) {
      audio.currentTime = Math.max(0, (audio.currentTime || 0) - 3);
    }
  });

  forwardLyricsButton.addEventListener("click", () => {
    const audio = card.querySelector("audio");
    if (audio) {
      audio.currentTime = Math.max(0, (audio.currentTime || 0) + 3);
    }
  });

  attachLyricsVoiceShortcut(card, lyricsInput);
  enableTitleVoiceShortcut(card, titleInput);
}

async function renderTracks(album) {
  trackList.innerHTML = "";

  if (!Array.isArray(album.tracks) || !album.tracks.length) {
    trackList.innerHTML = `
      <article class="track-card">
        <h3 class="track-title">Nenhuma faixa cadastrada neste album</h3>
      </article>
    `;
    return;
  }

  for (const track of album.tracks) {
    const article = document.createElement("article");
    article.className = "track-card";
    article.dataset.trackNumber = String(track.number);
    article.dataset.trackMode = getTrackModeLabel(track);
    article.dataset.previewLimitSeconds = shouldLimitFreePreview(album.id, album.name, track) ? String(freePreviewSeconds) : "0";

    const playbackOptions = album.tracks
      .filter((item) => item.number !== track.number)
      .map((item) => `<option value="${item.number}" ${Number(track.playbackTrackNumber) === item.number ? "selected" : ""}>${String(item.number).padStart(3, "0")}</option>`)
      .join("");

    article.innerHTML = `
      <h3 class="track-title">${track.label}</h3>
      <div class="track-player-shell">
        <audio class="track-native-audio" preload="none"></audio>
        <button class="track-play-button" type="button" data-role="play" aria-label="Tocar faixa">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="track-progress-shell">
          <input class="track-progress-input" type="range" min="0" max="100" value="0" step="0.1" data-role="progress" aria-label="Progresso da faixa">
          <div class="track-time-row">
            <span data-role="current-time">00:00</span>
            <span data-role="duration">00:00</span>
          </div>
        </div>
      </div>
      <div class="track-download-row">
        <span class="track-download-label">${
          canDownloadTrack(album.id, album.name, track)
            ? "Download disponivel"
            : track.type === "playback"
              ? "Playback"
              : "Preview"
        }</span>
        <button class="ghost-button download-icon-button" type="button" data-role="download" aria-label="Baixar faixa">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1m-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1"/></svg>
        </button>
      </div>
      ${isAdmin() ? `
        <div class="track-admin-tools">
          <div class="track-copy">
            <h3 class="track-title-display">${track.label}</h3>
            <input class="track-title-input" type="text" value="${track.label}" hidden>
          </div>
          <div class="track-inline-actions">
            <button class="ghost-button track-type-toggle" type="button" data-track-type="${track.type}">${getTrackModeLabel(track)}</button>
            <button class="ghost-button track-editor-toggle track-editor-plus" type="button" aria-label="Editar faixa">+</button>
          </div>
        </div>
      ` : ""}
      ${isAdmin() ? `
        <div class="track-editor-panel" hidden>
          <div class="track-editor-row">
            <label>Playback desta faixa
              <select class="track-playback-select" ${track.type === "playback" ? "disabled" : ""}>
                <option value="">Sem playback</option>
                ${playbackOptions}
              </select>
            </label>
          </div>
          <label>Letra
            <textarea class="track-lyrics-input" placeholder="Digite a letra aqui. Se quiser ditar, escreva miki.">${track.lyrics || ""}</textarea>
          </label>
          <div class="track-editor-player">
            <button class="ghost-button track-editor-back" type="button">-3s</button>
            <button class="primary-button track-editor-play" type="button">Play</button>
            <button class="ghost-button track-editor-forward" type="button">+3s</button>
          </div>
          <p class="track-editor-status section-muted">Segure o titulo por 0.5s para ditar por voz.</p>
        </div>
      ` : ""}
    `;

    const audio = article.querySelector("audio");
    bindAudioToCard(article, audio);

    article.querySelector("[data-role='play']").addEventListener("click", async () => {
      if (currentAudio === audio && audio && !audio.paused) {
        audio.pause();
        updatePlayerButtons();
        return;
      }

      await playTrack(article, album.id, track);
    });

    article.querySelector("[data-role='download']")?.addEventListener("click", async () => {
      try {
        await downloadTrackForOffline(article, album.id, track);
      } catch (error) {
        setDownloadUi(article, {
          label: track.type === "playback" ? "Playback" : "Faixa"
        });
        showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel baixar a faixa.");
      }
    });

    setDownloadUi(article, {
      label: canDownloadTrack(album.id, album.name, track)
        ? "Download disponivel"
        : track.type === "playback"
          ? "Playback"
          : "Faixa"
    });

    if (canDownloadTrack(album.id, album.name, track) && await isTrackDownloaded(album.id, track.number)) {
      setDownloadUi(article, { downloaded: true });
    }

    bindAdminTrackEditor(article, album, track);
    trackList.appendChild(article);
  }

  updatePlayerButtons();
}

function syncAdminPanel(album) {
  if (!isAdmin()) {
    albumAdminPanel.hidden = true;
    albumAdminPanel.style.display = "none";
    return;
  }

  albumAdminPanel.hidden = false;
  albumAdminPanel.style.display = "grid";
  albumPriceInput.value = String(album.unitAmount || 0);
}

async function saveAlbumAdminChanges() {
  if (!isAdmin() || !currentAlbum) {
    return;
  }

  albumAdminStatus.textContent = "Salvando...";
  albumSaveButton.disabled = true;

  try {
    const response = await fetch(getApiUrl(`/api/admin/albums/${encodeURIComponent(currentAlbum.id)}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        priceCents: Number(albumPriceInput.value || 0),
        tracks: collectEditableTracks()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha ao salvar album.");
    }

    currentAlbum = data.album;
    productPrice.textContent = currentAlbum.priceLabel;
    albumAdminStatus.textContent = "Album salvo.";
    await renderTracks(currentAlbum);
  } catch (error) {
    albumAdminStatus.textContent = error instanceof Error ? error.message : "Erro ao salvar.";
  } finally {
    albumSaveButton.disabled = false;
  }
}

async function loadAlbumDetail() {
  const albumId = getAlbumId();
  const purchaseStatus = document.getElementById("purchase-status");

  if (!albumId) {
    productTitle.textContent = "Album nao encontrado";
    if (purchaseStatus) {
      purchaseStatus.textContent = "Escolha um album pela pagina de produtos.";
    }
    setBuyButtonState({
      label: "Comprar",
      disabled: true,
      ariaLabel: "Comprar album"
    });
    return;
  }

  try {
    await loadAccessState();

    const response = await fetch(getApiUrl(isAdmin()
      ? `/api/admin/albums/${encodeURIComponent(albumId)}`
      : `/api/store/products/${encodeURIComponent(albumId)}`), {
      headers: getToken() && isAdmin()
        ? { Authorization: `Bearer ${getToken()}` }
        : {}
    });
    const payload = await response.json();
    const album = payload.album || payload;

    if (!response.ok) {
      throw new Error(album.error || "Falha ao carregar album.");
    }

    currentAlbum = album;
    document.title = `Turma do Printy | ${album.name}`;
    productCover.src = album.coverUrl;
    productCover.alt = `Capa do album ${album.name}`;
    productTitle.textContent = album.name;
    productPrice.textContent = album.priceLabel;
    syncLyricsDownloadButton(album);
    setPurchaseStatus(album.id);
    syncAdminPanel(album);
    await renderTracks(album);

    if (hasPurchasedAlbum(album.id)) {
      setBuyButtonState({
        label: "Acessar",
        onClick: () => {
          window.location.href = getOwnedProductsUrl();
        },
        ariaLabel: "Acessar meus albuns"
      });
    } else {
      setBuyButtonState({
        label: "Comprar",
        onClick: async () => {
          await startCheckout(album.id);
        },
        ariaLabel: "Comprar album"
      });
    }
  } catch (error) {
    productTitle.textContent = "Nao foi possivel abrir o album";
    if (purchaseStatus) {
      purchaseStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido.";
    }
    setBuyButtonState({
      label: "Comprar",
      disabled: true,
      ariaLabel: "Comprar album"
    });
  }
}

albumSaveButton?.addEventListener("click", async () => {
  await saveAlbumAdminChanges();
});

document.addEventListener("keydown", handleAlbumAdminShortcuts);

await initSiteHeader().catch(() => null);
await loadAlbumDetail();
