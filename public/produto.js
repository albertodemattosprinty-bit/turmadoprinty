import { getToken, initSiteHeader } from "./header.js";
import { getApiUrl } from "./api.js";

const offlineCacheName = "turma-do-printy-offline-v1";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productPrice = document.getElementById("product-price");
const buyAlbumButton = document.getElementById("buy-album-button");
const lyricsDownloadButton = document.getElementById("lyrics-download-button");
const trackList = document.getElementById("track-list");
const trackPrevButton = document.getElementById("track-prev-button");
const trackNextButton = document.getElementById("track-next-button");
const trackPositionLabel = document.getElementById("track-position-label");
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
let currentTrackIndex = 0;
let currentUser = null;
let currentAlbum = null;
let activeSpeechRecognition = null;
let lyricsSilenceTimer = null;
let floatingNoticeTimer = null;
let albumShortcutBuffer = "";
let albumShortcutTimer = null;
let trackGenerationProgressTimer = null;
let trackGenerationProgressValue = 0;
const freePreviewSeconds = 30;
const freePreviewFadeSeconds = 4;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCatalogText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeAdminIdentity(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
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
  const username = normalizeAdminIdentity(currentUser?.username);
  const name = normalizeAdminIdentity(currentUser?.name);
  return username === "rosemattos" || name === "rosemattos";
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
    isRoseMattosUser()
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

async function confirmReturnedCheckoutIfNeeded(albumId) {
  const params = new URLSearchParams(window.location.search);
  const paymentReturned = params.get("payment") === "return";
  const sessionId = params.get("session_id") || "";
  const purchaseStatus = document.getElementById("purchase-status");
  const token = getToken();

  if (!paymentReturned || !sessionId || !token) {
    return;
  }

  try {
    if (purchaseStatus) {
      purchaseStatus.textContent = "Confirmando pagamento do album...";
    }

    const response = await fetch(getApiUrl("/api/payments/stripe/checkout/confirm"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        sessionId,
        albumId
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Nao foi possivel confirmar seu pagamento.");
    }

    if (purchaseStatus && payload.paymentStatus === "PAID") {
      purchaseStatus.textContent = "Pagamento confirmado. Seu album ja foi liberado.";
    }
  } catch (error) {
    if (purchaseStatus) {
      purchaseStatus.textContent = error instanceof Error ? error.message : "Erro ao confirmar pagamento.";
    }
  }
}

function setPurchaseStatus(albumId) {
  const purchaseStatus = document.getElementById("purchase-status");

  if (!purchaseStatus) {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (canUseDownloads(albumId)) {
    purchaseStatus.textContent = accessState.authenticated
      ? "Download liberado para este album na sua conta."
      : "Faca login para acessar seus downloads.";
    return;
  }

  if (params.get("payment") === "return") {
    purchaseStatus.textContent = "Pagamento enviado ao Stripe. Aguarde a confirmacao para liberar seus downloads.";
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

function hasTrackTexts(track) {
  return Boolean(getTrackLyricsLines(track).length || String(track?.lyrics || "").trim());
}

function canGenerateTrackTexts(track) {
  return isRoseMattosUser()
    && String(track?.sourceAlbumId || "").trim()
    && String(track?.sourceSongId || "").trim()
    && String(track?.streamUrl || "").trim();
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

function ensureTrackTextsModal() {
  let modal = document.getElementById("track-texts-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "track-texts-modal";
  modal.className = "track-texts-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="track-texts-backdrop" data-role="close-texts"></div>
    <div class="track-texts-panel" role="dialog" aria-modal="true" aria-labelledby="track-texts-title">
      <div class="track-texts-head">
        <div>
          <p class="eyebrow">Textos da faixa</p>
          <h3 id="track-texts-title" class="section-title small">Carregando...</h3>
        </div>
        <button class="ghost-button track-texts-close" type="button" data-role="close-texts" aria-label="Voltar aos detalhes">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 6.3a1 1 0 0 1 0 1.4L11.41 12l4.29 4.3a1 1 0 0 1-1.41 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.41 0"/></svg>
        </button>
      </div>
      <div id="track-texts-meta" class="track-texts-meta"></div>
      <div id="track-texts-body" class="track-texts-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-role='close-texts']").forEach((node) => {
    node.addEventListener("click", () => {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("show");
    });
  });
  return modal;
}

function ensureTrackGenerationModal() {
  let modal = document.getElementById("track-generation-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "track-generation-modal";
  modal.className = "track-texts-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="track-texts-backdrop"></div>
    <div class="track-texts-panel track-generation-panel" role="dialog" aria-modal="true" aria-labelledby="track-generation-title">
      <div class="track-texts-head">
        <div>
          <p class="eyebrow">Criar textos</p>
          <h3 id="track-generation-title" class="section-title small">Preparando...</h3>
        </div>
      </div>
      <p id="track-generation-message" class="track-generation-message">Conectando o audio ao fluxo do MINI...</p>
      <div class="track-generation-progress">
        <div id="track-generation-bar" class="track-generation-progress-bar"></div>
      </div>
      <div id="track-generation-percent" class="track-generation-percent">0%</div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function setTrackGenerationModalState({ open = true, title = "Preparando...", message = "", progress = 0 } = {}) {
  const modal = ensureTrackGenerationModal();
  const titleNode = modal.querySelector("#track-generation-title");
  const messageNode = modal.querySelector("#track-generation-message");
  const barNode = modal.querySelector("#track-generation-bar");
  const percentNode = modal.querySelector("#track-generation-percent");
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  if (titleNode) {
    titleNode.textContent = title;
  }
  if (messageNode) {
    messageNode.textContent = message;
  }
  if (barNode) {
    barNode.style.width = `${safeProgress}%`;
  }
  if (percentNode) {
    percentNode.textContent = `${Math.round(safeProgress)}%`;
  }

  modal.setAttribute("aria-hidden", open ? "false" : "true");
  modal.classList.toggle("show", open);
}

function stopTrackGenerationProgress() {
  if (trackGenerationProgressTimer) {
    window.clearInterval(trackGenerationProgressTimer);
    trackGenerationProgressTimer = null;
  }
}

function startTrackGenerationProgress() {
  trackGenerationProgressValue = 8;
  setTrackGenerationModalState({
    title: "Lendo o audio",
    message: "Estamos preparando a faixa para transcrever e montar os timestamps.",
    progress: trackGenerationProgressValue
  });

  stopTrackGenerationProgress();
  trackGenerationProgressTimer = window.setInterval(() => {
    trackGenerationProgressValue = Math.min(92, trackGenerationProgressValue + (trackGenerationProgressValue < 38 ? 8 : 4));

    let title = "Lendo o audio";
    let message = "Estamos preparando a faixa para transcrever e montar os timestamps.";
    if (trackGenerationProgressValue >= 35) {
      title = "Transcrevendo";
      message = "A OpenAI esta ouvindo o MP3 e montando o texto base.";
    }
    if (trackGenerationProgressValue >= 68) {
      title = "Alinhando frases";
      message = "Agora estamos organizando as frases e o instante em que cada uma comeca.";
    }

    setTrackGenerationModalState({
      title,
      message,
      progress: trackGenerationProgressValue
    });
  }, 900);
}

function renderLyricsLinesHtml(track, lines) {
  if (!lines.length) {
    return `<div class="track-texts-empty">Essa faixa ainda nao tem texto salvo.</div>`;
  }

  return `
    <div class="track-texts-lines" data-role="track-texts-lines">
      ${lines.map((line, index) => `
        <div class="track-texts-line" data-lyrics-index="${index}" data-timestamp-ms="${line.timestampMs === null ? "" : line.timestampMs}">
          ${escapeHtml(line.text)}
        </div>
      `).join("")}
    </div>
  `;
}

function openTrackTextsModal(track) {
  const modal = ensureTrackTextsModal();
  const title = modal.querySelector("#track-texts-title");
  const meta = modal.querySelector("#track-texts-meta");
  const body = modal.querySelector("#track-texts-body");
  if (!title || !meta || !body) {
    return;
  }

  const lines = Array.isArray(track?.lyricsSyncData?.lines) ? track.lyricsSyncData.lines : [];
  const syncedCount = lines.filter((line) => line?.timestampMs !== null && line?.timestampMs !== undefined).length;
  const parts = [];
  if (track?.hasScores) {
    parts.push(`${track.scoreCount || 0} partituras`);
  }
  if (lines.length) {
    parts.push(`${syncedCount}/${lines.length} timestamps`);
  }
  if (track?.songJsonUrl) {
    parts.push("song.json conectado");
  }

  title.textContent = track?.title || "Textos da faixa";
  meta.innerHTML = parts.length ? parts.map((item) => `<span class="status-pill">${escapeHtml(item)}</span>`).join("") : "";
  body.dataset.trackNumber = String(track?.number || "");
  body.innerHTML = renderLyricsLinesHtml(track, getTrackLyricsLines(track));
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  syncTrackTextsModalHighlight(track, currentAudio?.currentTime || 0);
}

function getTrackLyricsLines(track) {
  const syncLines = Array.isArray(track?.lyricsSyncData?.lines) ? track.lyricsSyncData.lines : [];
  if (syncLines.length) {
    return syncLines.map((line, index) => ({
      number: Number(line?.number || index + 1) || (index + 1),
      text: String(line?.text || "").trim(),
      timestampMs: line?.timestampMs === null || line?.timestampMs === undefined ? null : Math.max(0, Number(line.timestampMs) || 0)
    })).filter((line) => line.text);
  }

  return String(track?.lyrics || "")
    .split(/\r?\n/)
    .map((text, index) => ({
      number: index + 1,
      text: String(text || "").trim(),
      timestampMs: null
    }))
    .filter((line) => line.text);
}

function renderTrackLyrics(track) {
  const lines = getTrackLyricsLines(track);
  if (!lines.length) {
    return "";
  }

  return `
    <div class="track-lyrics-panel" data-role="lyrics-panel">
      ${lines.map((line, index) => `
        <div class="track-lyrics-line" data-lyrics-index="${index}" data-timestamp-ms="${line.timestampMs === null ? "" : line.timestampMs}">
          ${escapeHtml(line.text)}
        </div>
      `).join("")}
    </div>
  `;
}

function syncTrackTextsModalHighlight(track, currentTimeSeconds) {
  const modal = document.getElementById("track-texts-modal");
  const body = modal?.querySelector("#track-texts-body");
  const isVisible = modal?.classList.contains("show") && modal?.getAttribute("aria-hidden") === "false";
  if (!body || !isVisible) {
    return;
  }

  if (String(body.dataset.trackNumber || "") !== String(track?.number || "")) {
    return;
  }

  const lines = getTrackLyricsLines(track);
  const hasTimedLines = lines.some((line) => line.timestampMs !== null && line.timestampMs !== undefined);
  const currentMs = Math.max(0, Number(currentTimeSeconds || 0) * 1000);
  let activeIndex = -1;

  if (hasTimedLines) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.timestampMs !== null && line.timestampMs !== undefined && currentMs >= line.timestampMs) {
        activeIndex = index;
      }
    }
  }

  body.querySelectorAll(".track-texts-line").forEach((node, index) => {
    node.classList.toggle("is-active", hasTimedLines && index === activeIndex);
  });
}

function syncTrackLyricsHighlight(card, track, currentTimeSeconds) {
  const panel = card?.querySelector("[data-role='lyrics-panel']");
  if (!panel) {
    syncTrackTextsModalHighlight(track, currentTimeSeconds);
    return;
  }

  const lines = getTrackLyricsLines(track);
  const hasTimedLines = lines.some((line) => line.timestampMs !== null && line.timestampMs !== undefined);
  const currentMs = Math.max(0, Number(currentTimeSeconds || 0) * 1000);
  let activeIndex = -1;

  if (hasTimedLines) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.timestampMs !== null && line.timestampMs !== undefined && currentMs >= line.timestampMs) {
        activeIndex = index;
      }
    }
  }

  panel.querySelectorAll(".track-lyrics-line").forEach((node, index) => {
    node.classList.toggle("is-active", hasTimedLines && index === activeIndex);
  });
  syncTrackTextsModalHighlight(track, currentTimeSeconds);
}

function syncTrackCarouselUi() {
  const cards = Array.from(trackList.querySelectorAll(".track-card"));
  const total = cards.length;
  if (!total) {
    if (trackPositionLabel) {
      trackPositionLabel.textContent = "Faixa 0 de 0";
    }
    if (trackPrevButton) trackPrevButton.disabled = true;
    if (trackNextButton) trackNextButton.disabled = true;
    return;
  }

  currentTrackIndex = Math.max(0, Math.min(currentTrackIndex, total - 1));
  cards.forEach((card, index) => {
    const isActive = index === currentTrackIndex;
    card.hidden = !isActive;
    card.classList.toggle("is-current", isActive);
  });

  const activeCard = cards[currentTrackIndex] || null;
  const activeTrackNumber = Number(activeCard?.dataset.trackNumber || 0);
  if (currentAudio && currentTrackNumber && activeTrackNumber && currentTrackNumber !== activeTrackNumber) {
    currentAudio.pause();
  }

  if (trackPositionLabel) {
    trackPositionLabel.textContent = `Faixa ${currentTrackIndex + 1} de ${total}`;
  }
  if (trackPrevButton) {
    trackPrevButton.disabled = currentTrackIndex <= 0;
  }
  if (trackNextButton) {
    trackNextButton.disabled = currentTrackIndex >= total - 1;
  }
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

    const track = currentAlbum?.tracks?.find((item) => Number(item.number) === trackNumber) || null;
    if (track) {
      syncTrackLyricsHighlight(card, track, currentTime);
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
  const textsButton = card.querySelector("[data-role='texts']");
  const generateTextsButton = card.querySelector("[data-role='generate-texts']");

  if (!actionLabel || !downloadButton) {
    return;
  }

  if (downloading) {
    actionLabel.textContent = label || `Baixando ${Math.round(progress)}%`;
    downloadButton.disabled = true;
    if (textsButton) {
      textsButton.disabled = true;
    }
    if (generateTextsButton) {
      generateTextsButton.disabled = true;
    }
    return;
  }

  actionLabel.textContent = downloaded ? "Download concluido, voce pode acessar sem internet" : label || card.dataset.trackMode || "Full";
  downloadButton.disabled = false;
  if (textsButton) {
    textsButton.disabled = false;
  }
  if (generateTextsButton) {
    generateTextsButton.disabled = false;
  }
}

function updateTrackInCurrentAlbum(updatedTrack) {
  if (!currentAlbum || !Array.isArray(currentAlbum.tracks)) {
    return;
  }

  currentAlbum = {
    ...currentAlbum,
    tracks: currentAlbum.tracks.map((track) => (
      track.number === updatedTrack.number
        ? { ...track, ...updatedTrack }
        : track
    ))
  };
}

async function createTrackTexts(card, album, track) {
  if (!canGenerateTrackTexts(track)) {
    showFloatingNotice("Essa faixa ainda nao esta conectada ao fluxo completo do MINI.");
    return;
  }

  startTrackGenerationProgress();

  try {
    const response = await fetch(getApiUrl(`/api/store/products/${encodeURIComponent(album.id)}/tracks/${track.number}/generate-texts`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel criar os textos desta faixa.");
    }

    stopTrackGenerationProgress();
    setTrackGenerationModalState({
      title: "Tudo pronto",
      message: "Os textos e os timestamps foram gerados e ligados ao catalogo do MINI.",
      progress: 100
    });

    const updatedTrack = {
      ...track,
      lyrics: data.lyrics || "",
      lyricsSyncData: data.syncData || null
    };
    updateTrackInCurrentAlbum(updatedTrack);
    await renderTracks(currentAlbum);
    openTrackTextsModal(updatedTrack);
    showFloatingNotice("Textos criados com sucesso.");
    window.setTimeout(() => {
      setTrackGenerationModalState({ open: false });
    }, 900);
  } catch (error) {
    stopTrackGenerationProgress();
    setTrackGenerationModalState({ open: false });
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel criar os textos.");
  }
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
  const canEditTracksHere = isAdmin() && album?.catalogSource !== "mini";
  currentTrackIndex = Math.max(0, Math.min(currentTrackIndex, Math.max((album?.tracks?.length || 1) - 1, 0)));

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
    article.dataset.songJsonUrl = track.songJsonUrl || "";
    article.dataset.sourceAlbumId = track.sourceAlbumId || "";
    article.dataset.sourceSongId = track.sourceSongId || "";

    const playbackOptions = album.tracks
      .filter((item) => item.number !== track.number)
      .map((item) => `<option value="${item.number}" ${Number(track.playbackTrackNumber) === item.number ? "selected" : ""}>${String(item.number).padStart(3, "0")}</option>`)
      .join("");

    article.innerHTML = `
      <div class="track-title-row">
        <h3 class="track-title">${track.label}</h3>
        ${track.type === "playback" ? `<span class="status-pill">Playback</span>` : ""}
      </div>
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
        <div class="track-download-actions">
          <button class="ghost-button track-texts-button" type="button" data-role="texts" ${hasTrackTexts(track) ? "" : "hidden"}>Ver textos</button>
          ${canGenerateTrackTexts(track) ? `<button class="ghost-button track-texts-button" type="button" data-role="generate-texts">Criar textos</button>` : ""}
          <button class="ghost-button download-icon-button" type="button" data-role="download" aria-label="Baixar faixa">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1m-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1"/></svg>
          </button>
        </div>
      </div>
      ${renderTrackLyrics(track)}
      ${canEditTracksHere ? `
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
      ${canEditTracksHere ? `
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

    article.querySelector("[data-role='texts']")?.addEventListener("click", () => {
      openTrackTextsModal(track);
    });

    article.querySelector("[data-role='generate-texts']")?.addEventListener("click", async () => {
      await createTrackTexts(article, album, track);
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

    if (canEditTracksHere) {
      bindAdminTrackEditor(article, album, track);
    }
    trackList.appendChild(article);
  }

  syncTrackCarouselUi();
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
  albumAdminStatus.textContent = album?.catalogSource === "mini"
    ? "Preço editável aqui. Faixas, letras e timestamps agora vêm do catálogo do MINI."
    : "";
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
    await confirmReturnedCheckoutIfNeeded(albumId);
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
    currentTrackIndex = 0;
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

trackPrevButton?.addEventListener("click", () => {
  currentTrackIndex = Math.max(0, currentTrackIndex - 1);
  syncTrackCarouselUi();
});

trackNextButton?.addEventListener("click", () => {
  const total = Array.isArray(currentAlbum?.tracks) ? currentAlbum.tracks.length : 0;
  currentTrackIndex = Math.min(Math.max(total - 1, 0), currentTrackIndex + 1);
  syncTrackCarouselUi();
});

document.addEventListener("keydown", handleAlbumAdminShortcuts);

await initSiteHeader().catch(() => null);
await loadAlbumDetail();
