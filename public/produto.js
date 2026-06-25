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
let modalManualLineIndex = -1;
let trackTextsTouchState = null;
let trackTextsLastActiveIndex = -1;
let trackTextsSyncMode = false;
let trackTextsSyncDraft = null;
let trackTextsTitleHoldTimer = null;
let trackTextsLastTap = { index: -1, time: 0 };
let trackTextsSaveInFlight = false;
const freePreviewSeconds = 30;
const freePreviewFadeSeconds = 4;
const characterPalettes = {
  boys: ["#7FDBFF", "#9EE8FF", "#61D2FF", "#8CCBFF"],
  girls: ["#FF79C6", "#FF9BE0", "#D38BFF", "#F09CFF"],
  men: ["#FFFFFF"],
  women: ["#FFF3A6"]
};

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

function normalizeCharacterGroup(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["boys", "girls", "men", "women"].includes(normalized) ? normalized : "boys";
}

function getTrackCharacters(track) {
  return Array.isArray(track?.albumCharacters) ? track.albumCharacters : [];
}

function getCharacterById(track, characterId) {
  return getTrackCharacters(track).find((item) => String(item?.id || "") === String(characterId || "")) || null;
}

function getLineDisplayColor(track, line) {
  const character = getCharacterById(track, line?.characterId);
  return character?.color || "";
}

function cloneLyricsLines(lines) {
  return Array.isArray(lines)
    ? lines.map((line, index) => ({
      number: Number(line?.number || index + 1) || (index + 1),
      text: String(line?.text || "").trim(),
      timestampMs: line?.timestampMs === null || line?.timestampMs === undefined ? null : Math.max(0, Number(line.timestampMs) || 0),
      characterId: String(line?.characterId || "").trim()
    })).filter((line) => line.text)
    : [];
}

function getTrackSyncDraftStorageKey(track) {
  const albumId = String(track?.sourceAlbumId || currentAlbum?.id || "");
  const trackId = String(track?.sourceSongId || track?.number || "");
  return albumId && trackId ? `produto-track-sync:${albumId}:${trackId}` : "";
}

function readTrackSyncDraft(track) {
  const key = getTrackSyncDraftStorageKey(track);
  if (!key) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? {
        ...parsed,
        lines: cloneLyricsLines(parsed.lines)
      }
      : null;
  } catch (error) {
    return null;
  }
}

function writeTrackSyncDraft(track, draft) {
  const key = getTrackSyncDraftStorageKey(track);
  if (!key || !draft) {
    return;
  }
  const payload = {
    ...draft,
    lines: cloneLyricsLines(draft.lines),
    updatedAt: new Date().toISOString()
  };
  trackTextsSyncDraft = payload;
  window.localStorage.setItem(key, JSON.stringify(payload));
}

function clearTrackSyncDraft(track) {
  const key = getTrackSyncDraftStorageKey(track);
  if (key) {
    window.localStorage.removeItem(key);
  }
}

function buildTrackSyncDraft(track, draft = null) {
  const baseLines = cloneLyricsLines(draft?.lines?.length ? draft.lines : getTrackLyricsLines(track));
  return {
    albumId: String(track?.sourceAlbumId || ""),
    trackId: String(track?.sourceSongId || ""),
    trackNumber: Number(track?.number || 0),
    title: String(track?.title || ""),
    lyrics: baseLines.map((line) => line.text).join("\n"),
    lines: baseLines,
    syncMode: Boolean(draft?.syncMode)
  };
}

function getTrackModalWorkingLines(track) {
  const modalTrack = getModalTrack();
  if (
    trackTextsSyncDraft &&
    String(trackTextsSyncDraft.trackNumber || "") === String(modalTrack?.number || "") &&
    String(trackTextsSyncDraft.trackId || "") === String(modalTrack?.sourceSongId || "")
  ) {
    return cloneLyricsLines(trackTextsSyncDraft.lines);
  }
  return getTrackLyricsLines(track);
}

function isDesktopPointer() {
  return typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(pointer:fine)").matches : false;
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
  } else if (accessData?.user) {
    currentUser = accessData.user;
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
  return isAdmin() && String(track?.streamUrl || "").trim();
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
          <p id="track-texts-sync-status" class="track-texts-sync-status" hidden>Modo sync ativo</p>
        </div>
        <div class="track-texts-head-actions">
          <button id="track-texts-save-sync" class="ghost-button track-texts-save-sync" type="button" hidden>Salvar sync</button>
        <button class="ghost-button track-texts-close" type="button" data-role="close-texts" aria-label="Voltar aos detalhes">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 6.3a1 1 0 0 1 0 1.4L11.41 12l4.29 4.3a1 1 0 0 1-1.41 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.41 0"/></svg>
        </button>
        </div>
      </div>
      <div class="track-texts-player" data-role="modal-player">
        <button class="ghost-button track-texts-player-button" type="button" data-role="modal-play" aria-label="Tocar faixa">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="track-texts-player-progress">
          <input id="track-texts-progress" class="track-texts-progress-input" type="range" min="0" max="100" value="0" step="0.1" data-role="modal-progress" aria-label="Tempo da faixa">
          <div class="track-texts-time-row">
            <span id="track-texts-current-time">00:00</span>
            <span id="track-texts-duration">00:00</span>
          </div>
        </div>
        <button class="ghost-button track-texts-player-button" type="button" data-role="modal-list" aria-label="Escolher outra faixa">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 6.5m0 5.5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 12m1.5 5A1.5 1.5 0 1 0 5.5 20h13a1.5 1.5 0 1 0 0-3z"/></svg>
        </button>
      </div>
      <div id="track-texts-body" class="track-texts-body"></div>
      <div class="track-texts-track-picker" data-role="track-picker" hidden>
        <div class="track-texts-track-picker-backdrop" data-role="close-track-picker"></div>
        <div class="track-texts-track-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="track-picker-title">
          <div class="track-texts-track-picker-head">
            <h4 id="track-picker-title">Faixas do album</h4>
            <button class="ghost-button track-texts-close" type="button" data-role="close-track-picker" aria-label="Fechar lista de faixas">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 6.3a1 1 0 0 1 0 1.4L11.41 12l4.29 4.3a1 1 0 0 1-1.41 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.41 0"/></svg>
            </button>
          </div>
          <div class="track-texts-track-picker-list" data-role="track-picker-list"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-role='close-texts']").forEach((node) => {
    node.addEventListener("click", () => {
      if (trackTextsTitleHoldTimer) {
        window.clearTimeout(trackTextsTitleHoldTimer);
        trackTextsTitleHoldTimer = null;
      }
      closeTrackTextsTrackPicker();
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("show");
    });
  });
  modal.querySelectorAll("[data-role='close-track-picker']").forEach((node) => {
    node.addEventListener("click", () => {
      closeTrackTextsTrackPicker();
    });
  });
  modal.querySelector("[data-role='modal-play']")?.addEventListener("click", async () => {
    await toggleTrackTextsModalPlayback();
  });
  modal.querySelector("[data-role='modal-list']")?.addEventListener("click", () => {
    openTrackTextsTrackPicker();
  });
  modal.querySelector("#track-texts-save-sync")?.addEventListener("click", async () => {
    await saveTrackTextsSyncDraft();
  });
  modal.querySelector("[data-role='modal-progress']")?.addEventListener("input", async (event) => {
    const currentTrack = getModalTrack();
    if (!currentTrack) {
      return;
    }
    const progressValue = Number(event.target?.value || 0);
    await seekTrackAudio(currentTrack, null, { progressPercent: progressValue, autoplay: false });
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

function ensureTrackTextsConfirmModal() {
  let modal = document.getElementById("track-texts-confirm-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "track-texts-confirm-modal";
  modal.className = "track-texts-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="track-texts-backdrop" data-role="close-track-confirm"></div>
    <div class="track-texts-panel track-generation-panel track-text-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="track-text-confirm-title">
      <div class="track-texts-head">
        <div>
          <p class="eyebrow">Recriar textos</p>
          <h3 id="track-text-confirm-title" class="section-title small">Deseja excluir o timestamp atual?</h3>
        </div>
      </div>
      <p id="track-text-confirm-message" class="track-generation-message">Os textos serao recriados pela OpenAI e a faixa ficara somente com texto simples, sem a syncagem atual.</p>
      <div class="bulk-track-title-actions">
        <button id="track-text-confirm-cancel" class="ghost-button" type="button">Cancelar</button>
        <button id="track-text-confirm-accept" class="primary-button" type="button">Continuar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-role='close-track-confirm']").forEach((node) => {
    node.addEventListener("click", () => {
      resolveTrackTextsConfirm(false);
    });
  });
  modal.querySelector("#track-text-confirm-cancel")?.addEventListener("click", () => {
    resolveTrackTextsConfirm(false);
  });
  modal.querySelector("#track-text-confirm-accept")?.addEventListener("click", () => {
    resolveTrackTextsConfirm(true);
  });
  return modal;
}

let trackTextsConfirmResolver = null;

function resolveTrackTextsConfirm(accepted) {
  const modal = document.getElementById("track-texts-confirm-modal");
  if (modal) {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
  }
  if (typeof trackTextsConfirmResolver === "function") {
    const resolver = trackTextsConfirmResolver;
    trackTextsConfirmResolver = null;
    resolver(Boolean(accepted));
  }
}

function confirmTrackTextsReset() {
  const modal = ensureTrackTextsConfirmModal();
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  return new Promise((resolve) => {
    trackTextsConfirmResolver = resolve;
  });
}

function ensureTrackCharacterModal() {
  let modal = document.getElementById("track-character-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "track-character-modal";
  modal.className = "track-texts-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="track-texts-backdrop" data-role="close-character-modal"></div>
    <div class="track-texts-panel track-generation-panel track-character-panel" role="dialog" aria-modal="true" aria-labelledby="track-character-title">
      <div class="track-texts-head">
        <div>
          <p class="eyebrow">Personagem da linha</p>
          <h3 id="track-character-title" class="section-title small">Adicionar personagem</h3>
        </div>
        <button class="ghost-button track-texts-close" type="button" data-role="close-character-modal" aria-label="Fechar modal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 6.3a1 1 0 0 1 0 1.4L11.41 12l4.29 4.3a1 1 0 0 1-1.41 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.41 0"/></svg>
        </button>
      </div>
      <p id="track-character-line-preview" class="track-generation-message"></p>
      <label class="track-character-field">Personagem do album
        <select id="track-character-select" class="track-character-select"></select>
      </label>
      <div class="track-character-divider">ou crie um novo</div>
      <label class="track-character-field">Nome
        <input id="track-character-name" type="text" maxlength="40" placeholder="Ex.: Menino 1">
      </label>
      <label class="track-character-field">Grupo
        <select id="track-character-group" class="track-character-select">
          <option value="boys">Meninos</option>
          <option value="girls">Meninas</option>
          <option value="men">Homens</option>
          <option value="women">Mulheres</option>
        </select>
      </label>
      <div id="track-character-palette" class="track-character-palette"></div>
      <label class="track-character-field">Cor
        <input id="track-character-color" type="color" value="#7FDBFF">
      </label>
      <div class="bulk-track-title-actions">
        <button id="track-character-cancel" class="ghost-button" type="button">Cancelar</button>
        <button id="track-character-save" class="primary-button" type="button">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll("[data-role='close-character-modal']").forEach((node) => {
    node.addEventListener("click", () => {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("show");
    });
  });

  modal.querySelector("#track-character-cancel")?.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
  });

  modal.querySelector("#track-character-group")?.addEventListener("change", () => {
    syncCharacterPaletteOptions();
  });

  modal.querySelector("#track-character-save")?.addEventListener("click", async () => {
    await submitTrackCharacterModal();
  });

  return modal;
}

function ensureTrackTextEditModal() {
  let modal = document.getElementById("track-text-edit-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "track-text-edit-modal";
  modal.className = "track-texts-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="track-texts-backdrop" data-role="close-text-edit"></div>
    <div class="track-texts-panel track-generation-panel track-text-edit-panel" role="dialog" aria-modal="true" aria-labelledby="track-text-edit-title">
      <div class="track-texts-head">
        <div>
          <p class="eyebrow">Editar texto</p>
          <h3 id="track-text-edit-title" class="section-title small">Linha da faixa</h3>
        </div>
        <button class="ghost-button track-texts-close" type="button" data-role="close-text-edit" aria-label="Fechar modal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.7 6.3a1 1 0 0 1 0 1.4L11.41 12l4.29 4.3a1 1 0 0 1-1.41 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.41 0"/></svg>
        </button>
      </div>
      <label class="track-character-field">Texto da linha
        <textarea id="track-text-edit-input" class="track-text-edit-input" rows="5" maxlength="240" placeholder="Edite somente o texto desta linha"></textarea>
      </label>
      <p class="track-generation-message">O timestamp atual sera mantido.</p>
      <div class="bulk-track-title-actions">
        <button id="track-text-edit-cancel" class="ghost-button" type="button">Cancelar</button>
        <button id="track-text-edit-save" class="primary-button" type="button">Salvar texto</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll("[data-role='close-text-edit']").forEach((node) => {
    node.addEventListener("click", () => {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("show");
    });
  });
  modal.querySelector("#track-text-edit-cancel")?.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
  });
  modal.querySelector("#track-text-edit-save")?.addEventListener("click", async () => {
    await submitTrackTextEditModal();
  });

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

function syncCharacterPaletteOptions() {
  const modal = ensureTrackCharacterModal();
  const groupSelect = modal.querySelector("#track-character-group");
  const colorInput = modal.querySelector("#track-character-color");
  const paletteNode = modal.querySelector("#track-character-palette");
  const group = normalizeCharacterGroup(groupSelect?.value);
  const colors = characterPalettes[group] || characterPalettes.boys;

  if (paletteNode) {
    paletteNode.innerHTML = colors.map((color) => `
      <button class="track-character-color-chip" type="button" data-color="${color}" style="--character-chip:${color}"></button>
    `).join("");
    paletteNode.querySelectorAll("[data-color]").forEach((node) => {
      node.addEventListener("click", () => {
        if (colorInput) {
          colorInput.value = String(node.dataset.color || "#7FDBFF");
        }
      });
    });
  }

  if (colorInput && !colors.includes(colorInput.value.toUpperCase())) {
    colorInput.value = colors[0];
  }
}

function openTrackCharacterModal(track, lineIndex) {
  const modal = ensureTrackCharacterModal();
  const line = getTrackLyricsLines(track)[lineIndex] || null;
  const preview = modal.querySelector("#track-character-line-preview");
  const select = modal.querySelector("#track-character-select");
  const nameInput = modal.querySelector("#track-character-name");
  const groupSelect = modal.querySelector("#track-character-group");
  const colorInput = modal.querySelector("#track-character-color");
  if (!line || !preview || !select || !nameInput || !groupSelect || !colorInput) {
    return;
  }

  const characters = getTrackCharacters(track);
  const currentCharacter = getCharacterById(track, line.characterId);
  preview.textContent = line.text;
  modal.dataset.albumId = String(track?.sourceAlbumId || "");
  modal.dataset.trackId = String(track?.sourceSongId || "");
  modal.dataset.trackNumber = String(track?.number || "");
  modal.dataset.lineNumber = String(line.number || lineIndex + 1);

  select.innerHTML = `
    <option value="">Sem personagem</option>
    ${characters.map((item) => `<option value="${escapeHtml(item.id)}" ${currentCharacter?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
    <option value="__new__">Criar novo</option>
  `;
  nameInput.value = "";
  groupSelect.value = currentCharacter?.group ? normalizeCharacterGroup(currentCharacter.group) : "boys";
  colorInput.value = currentCharacter?.color || (characterPalettes.boys[0]);
  syncCharacterPaletteOptions();

  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
}

function openTrackTextEditModal(track, lineIndex) {
  const modal = ensureTrackTextEditModal();
  const line = getTrackModalWorkingLines(track)[lineIndex] || null;
  const input = modal.querySelector("#track-text-edit-input");
  if (!line || !input) {
    return;
  }

  modal.dataset.albumId = String(track?.sourceAlbumId || "");
  modal.dataset.trackId = String(track?.sourceSongId || "");
  modal.dataset.trackNumber = String(track?.number || "");
  modal.dataset.lineIndex = String(lineIndex);
  input.value = line.text || "";
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  window.setTimeout(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 20);
}

function splitEditedTrackText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

async function submitTrackTextEditModal() {
  const modal = ensureTrackTextEditModal();
  const albumId = String(modal.dataset.albumId || "");
  const trackId = String(modal.dataset.trackId || "");
  const trackNumber = Number(modal.dataset.trackNumber || 0);
  const lineIndex = Number(modal.dataset.lineIndex || -1);
  const input = modal.querySelector("#track-text-edit-input");
  const track = getTrackByNumber(trackNumber);
  if (!albumId || !trackId || !track || lineIndex < 0 || !input) {
    return;
  }

  const nextLinesText = splitEditedTrackText(input.value);
  if (!nextLinesText.length) {
    showFloatingNotice("Digite algum texto para a linha.");
    return;
  }

  const lines = cloneLyricsLines(getTrackModalWorkingLines(track));
  const originalLine = lines[lineIndex];
  if (!originalLine) {
    return;
  }

  const replacementLines = nextLinesText.map((text, index) => ({
    ...originalLine,
    number: lineIndex + index + 1,
    text,
    timestampMs: index === 0 ? originalLine.timestampMs : null
  }));
  lines.splice(lineIndex, 1, ...replacementLines);
  const normalizedLines = lines.map((line, index) => ({
    ...line,
    number: index + 1
  }));

  if (trackTextsSyncMode) {
    trackTextsSyncDraft = buildTrackSyncDraft(track, {
      lines: normalizedLines,
      syncMode: true
    });
    persistTrackTextsSyncDraft(track);
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
    modalManualLineIndex = lineIndex;
    openTrackTextsModal(track);
    showFloatingNotice("Texto atualizado no modo sync.");
    return;
  }

  try {
    const response = await fetch(getApiUrl(`/api/mini/media/albums/${encodeURIComponent(albumId)}/tracks/${encodeURIComponent(trackId)}/lyrics`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        lyrics: normalizedLines.map((line) => line.text).join("\n"),
        syncData: {
          ...(track.lyricsSyncData && typeof track.lyricsSyncData === "object" ? track.lyricsSyncData : {}),
          albumId,
          trackId,
          title: track.title,
          lines: normalizedLines
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel atualizar o texto.");
    }

    const updatedTrack = {
      ...track,
      lyrics: data.lyrics || normalizedLines.map((line) => line.text).join("\n"),
      lyricsSyncData: data.syncData || {
        ...(track.lyricsSyncData && typeof track.lyricsSyncData === "object" ? track.lyricsSyncData : {}),
        lines: normalizedLines
      }
    };
    updateTrackInCurrentAlbum(updatedTrack);
    await renderTracks(currentAlbum);
    openTrackTextsModal(updatedTrack);
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
    showFloatingNotice("Texto da linha atualizado.");
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel atualizar o texto.");
  }
}

async function submitTrackCharacterModal() {
  const modal = ensureTrackCharacterModal();
  const albumId = String(modal.dataset.albumId || "");
  const trackId = String(modal.dataset.trackId || "");
  const trackNumber = Number(modal.dataset.trackNumber || 0);
  const lineNumber = Number(modal.dataset.lineNumber || 0);
  const select = modal.querySelector("#track-character-select");
  const nameInput = modal.querySelector("#track-character-name");
  const groupSelect = modal.querySelector("#track-character-group");
  const colorInput = modal.querySelector("#track-character-color");
  if (!albumId || !trackId || !trackNumber || !lineNumber || !select || !nameInput || !groupSelect || !colorInput) {
    return;
  }

  try {
    let characterId = String(select.value || "").trim();
    if (characterId === "__new__" || (!characterId && nameInput.value.trim())) {
      const createResponse = await fetch(getApiUrl(`/api/mini/media/albums/${encodeURIComponent(albumId)}/characters`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          group: groupSelect.value,
          color: colorInput.value
        })
      });
      const createData = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(createData.error || "Nao foi possivel criar o personagem.");
      }
      characterId = String(createData.character?.id || "").trim();
      const updatedTrack = getTrackByNumber(trackNumber);
      if (updatedTrack) {
        updatedTrack.albumCharacters = Array.isArray(createData.album?.characters) ? createData.album.characters : updatedTrack.albumCharacters;
      }
    }

    const response = await fetch(getApiUrl(`/api/mini/media/albums/${encodeURIComponent(albumId)}/tracks/${encodeURIComponent(trackId)}/lyrics/lines/${lineNumber}/character`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ characterId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel salvar o personagem da linha.");
    }

    const updatedTrack = getTrackByNumber(trackNumber);
    if (updatedTrack) {
      updatedTrack.albumCharacters = Array.isArray(data.characters) ? data.characters : updatedTrack.albumCharacters;
      updatedTrack.lyricsSyncData = data.syncData || updatedTrack.lyricsSyncData;
      openTrackTextsModal(updatedTrack);
    }

    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel salvar personagem.");
  }
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
        <button class="track-texts-line ${line.timestampMs !== null && line.timestampMs !== undefined ? "is-synced" : ""}" type="button" data-lyrics-index="${index}" data-line-number="${line.number}" data-timestamp-ms="${line.timestampMs === null ? "" : line.timestampMs}" data-character-id="${escapeHtml(line.characterId || "")}" style="${getLineDisplayColor(track, line) ? `--line-character-color:${getLineDisplayColor(track, line)};` : ""}">
          ${escapeHtml(line.text)}
        </button>
      `).join("")}
    </div>
  `;
}

function getTrackIndexByNumber(trackNumber) {
  return Array.isArray(currentAlbum?.tracks)
    ? currentAlbum.tracks.findIndex((track) => Number(track?.number || 0) === Number(trackNumber || 0))
    : -1;
}

function getTrackByNumber(trackNumber) {
  return Array.isArray(currentAlbum?.tracks)
    ? currentAlbum.tracks.find((track) => Number(track?.number || 0) === Number(trackNumber || 0)) || null
    : null;
}

function getModalTrack() {
  const body = document.getElementById("track-texts-body");
  return getTrackByNumber(body?.dataset.trackNumber || "");
}

function getModalLines() {
  const track = getModalTrack();
  return track ? getTrackModalWorkingLines(track) : [];
}

function closeTrackTextsTrackPicker() {
  const modal = document.getElementById("track-texts-modal");
  const picker = modal?.querySelector("[data-role='track-picker']");
  if (!picker) {
    return;
  }
  picker.hidden = true;
  picker.classList.remove("show");
}

function openTrackTextsTrackPicker() {
  const modal = ensureTrackTextsModal();
  const picker = modal.querySelector("[data-role='track-picker']");
  const list = modal.querySelector("[data-role='track-picker-list']");
  const modalTrack = getModalTrack();
  if (!picker || !list || !Array.isArray(currentAlbum?.tracks)) {
    return;
  }

  list.innerHTML = currentAlbum.tracks.map((track) => {
    const isCurrent = Number(track?.number || 0) === Number(modalTrack?.number || 0);
    return `
      <button class="track-texts-track-picker-item ${isCurrent ? "is-active" : ""}" type="button" data-role="track-picker-item" data-track-number="${Number(track?.number || 0)}">
        <span class="track-texts-track-picker-number">${String(track?.number || 0).padStart(2, "0")}</span>
        <span class="track-texts-track-picker-title">${escapeHtml(track?.title || track?.label || `Faixa ${track?.number || ""}`)}</span>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-role='track-picker-item']").forEach((node) => {
    node.addEventListener("click", () => {
      const nextTrack = getTrackByNumber(node.dataset.trackNumber || "");
      closeTrackTextsTrackPicker();
      if (!nextTrack) {
        return;
      }
      const nextIndex = getTrackIndexByNumber(nextTrack.number);
      if (nextIndex >= 0) {
        currentTrackIndex = nextIndex;
        syncTrackCarouselUi();
      }
      openTrackTextsModal(nextTrack);
    });
  });

  picker.hidden = false;
  picker.classList.add("show");
}

function syncTrackTextsModeUi(track) {
  const modal = document.getElementById("track-texts-modal");
  const panel = modal?.querySelector(".track-texts-panel");
  const status = modal?.querySelector("#track-texts-sync-status");
  const saveButton = modal?.querySelector("#track-texts-save-sync");
  if (!modal || !panel) {
    return;
  }

  panel.classList.toggle("is-sync-mode", trackTextsSyncMode);
  if (status) {
    status.hidden = !trackTextsSyncMode;
    status.textContent = trackTextsSyncMode ? "Modo sync ativo" : "";
  }
  if (saveButton) {
    saveButton.hidden = !(trackTextsSyncMode && isAdmin() && String(track?.sourceAlbumId || "") && String(track?.sourceSongId || ""));
    saveButton.disabled = trackTextsSaveInFlight;
    saveButton.textContent = trackTextsSaveInFlight ? "Salvando..." : "Salvar sync";
  }
}

async function enterTrackTextsSyncMode(track) {
  if (!isAdmin() || !track) {
    return;
  }
  const draft = readTrackSyncDraft(track);
  trackTextsSyncMode = true;
  trackTextsSyncDraft = buildTrackSyncDraft(track, draft);
  trackTextsSyncDraft.syncMode = true;
  writeTrackSyncDraft(track, trackTextsSyncDraft);
  openTrackTextsModal(track);
  syncTrackTextsModeUi(track);
  await seekTrackAudio(track, currentTrackNumber === track.number ? currentAudio?.currentTime || 0 : 0, { autoplay: true });
}

function exitTrackTextsSyncMode(track, { keepDraft = true } = {}) {
  trackTextsSyncMode = false;
  if (trackTextsSyncDraft && track) {
    trackTextsSyncDraft.syncMode = false;
    if (keepDraft) {
      writeTrackSyncDraft(track, trackTextsSyncDraft);
    }
  }
  syncTrackTextsModeUi(track);
}

function persistTrackTextsSyncDraft(track) {
  if (!trackTextsSyncDraft || !track) {
    return;
  }
  trackTextsSyncDraft.lines = cloneLyricsLines(trackTextsSyncDraft.lines).map((line, index) => ({
    ...line,
    number: index + 1
  }));
  trackTextsSyncDraft.lyrics = trackTextsSyncDraft.lines.map((line) => line.text).join("\n");
  trackTextsSyncDraft.syncMode = trackTextsSyncMode;
  writeTrackSyncDraft(track, trackTextsSyncDraft);
}

function resetTrackSyncDraftFromLine(lineIndex) {
  if (!trackTextsSyncDraft) {
    return;
  }
  trackTextsSyncDraft.lines = trackTextsSyncDraft.lines.map((line, index) => ({
    ...line,
    timestampMs: lineIndex <= 0
      ? null
      : (index > lineIndex ? null : line.timestampMs)
  }));
}

function mergeTrackSyncDraftLine(lineIndex) {
  if (!trackTextsSyncDraft || lineIndex <= 0 || !trackTextsSyncDraft.lines[lineIndex]) {
    return false;
  }
  const lines = cloneLyricsLines(trackTextsSyncDraft.lines);
  const previousLine = lines[lineIndex - 1];
  const currentLine = lines[lineIndex];
  previousLine.text = `${previousLine.text}${previousLine.text && currentLine.text ? " " : ""}${currentLine.text}`.trim();
  if (!previousLine.characterId && currentLine.characterId) {
    previousLine.characterId = currentLine.characterId;
  }
  lines.splice(lineIndex, 1);
  trackTextsSyncDraft.lines = lines.map((line, index) => ({
    ...line,
    number: index + 1
  }));
  return true;
}

async function saveTrackTextsSyncDraft() {
  const track = getModalTrack();
  if (!track || !trackTextsSyncDraft || !isAdmin() || trackTextsSaveInFlight) {
    return;
  }

  trackTextsSaveInFlight = true;
  syncTrackTextsModeUi(track);
  persistTrackTextsSyncDraft(track);

  try {
    const response = await fetch(getApiUrl(`/api/mini/media/albums/${encodeURIComponent(track.sourceAlbumId)}/tracks/${encodeURIComponent(track.sourceSongId)}/lyrics`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        lyrics: trackTextsSyncDraft.lyrics,
        syncData: {
          ...(track.lyricsSyncData && typeof track.lyricsSyncData === "object" ? track.lyricsSyncData : {}),
          albumId: track.sourceAlbumId,
          trackId: track.sourceSongId,
          title: track.title,
          lines: cloneLyricsLines(trackTextsSyncDraft.lines)
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel salvar a syncagem.");
    }

    const updatedTrack = {
      ...track,
      lyrics: data.lyrics || trackTextsSyncDraft.lyrics,
      lyricsSyncData: data.syncData || {
        ...(track.lyricsSyncData && typeof track.lyricsSyncData === "object" ? track.lyricsSyncData : {}),
        lines: cloneLyricsLines(trackTextsSyncDraft.lines)
      }
    };
    updateTrackInCurrentAlbum(updatedTrack);
    clearTrackSyncDraft(track);
    trackTextsSyncDraft = null;
    await renderTracks(currentAlbum);
    trackTextsSyncMode = false;
    openTrackTextsModal(updatedTrack);
    syncTrackTextsModeUi(updatedTrack);
    showFloatingNotice("Sync salva no Postgres com sucesso.");
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel salvar a syncagem.");
  } finally {
    trackTextsSaveInFlight = false;
    syncTrackTextsModeUi(getModalTrack() || track);
  }
}

function getTrackCardByNumber(trackNumber) {
  return trackList?.querySelector(`.track-card[data-track-number="${String(trackNumber)}"]`) || null;
}

function getTrackAudioByNumber(trackNumber) {
  return getTrackCardByNumber(trackNumber)?.querySelector("audio") || null;
}

async function ensureTrackReady(track, { autoplay = false } = {}) {
  if (!track || !currentAlbum) {
    return null;
  }

  const trackIndex = getTrackIndexByNumber(track.number);
  if (trackIndex >= 0) {
    currentTrackIndex = trackIndex;
    syncTrackCarouselUi();
  }

  const card = getTrackCardByNumber(track.number);
  const audio = card?.querySelector("audio");
  if (!card || !audio) {
    return null;
  }

  if (!canStreamTrack(currentAlbum.id, currentAlbum?.name, track)) {
    showFloatingNotice("Seu plano nao libera ouvir esta faixa.");
    return null;
  }

  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (!audio.dataset.ready) {
    const offlineUrl = await getOfflineTrackUrl(currentAlbum.id, track.number);
    audio.src = offlineUrl || track.streamUrl;
    audio.dataset.ready = "true";
  }

  if (audio.readyState < 1) {
    await new Promise((resolve) => {
      const finalize = () => resolve();
      audio.addEventListener("loadedmetadata", finalize, { once: true });
      window.setTimeout(finalize, 1200);
    });
  }

  currentAudio = audio;
  currentTrackNumber = track.number;

  if (autoplay) {
    await audio.play();
  } else {
    updatePlayerButtons();
  }

  return { card, audio };
}

async function seekTrackAudio(track, timeSeconds = null, options = {}) {
  const autoplay = Boolean(options?.autoplay);
  const progressPercent = Number.isFinite(options?.progressPercent) ? Number(options.progressPercent) : null;
  const resolved = await ensureTrackReady(track, { autoplay });
  if (!resolved?.audio) {
    return;
  }

  const { audio } = resolved;
  if (progressPercent !== null) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = duration > 0 ? (Math.max(0, Math.min(100, progressPercent)) / 100) * duration : 0;
  } else if (timeSeconds !== null && timeSeconds !== undefined) {
    audio.currentTime = Math.max(0, Number(timeSeconds) || 0);
  }

  if (autoplay && audio.paused) {
    await audio.play();
  }

  updatePlayerButtons();
}

async function toggleTrackTextsModalPlayback() {
  const track = getModalTrack();
  if (!track) {
    return;
  }

  if (currentTrackNumber === track.number && currentAudio) {
    if (currentAudio.paused) {
      await currentAudio.play();
    } else {
      currentAudio.pause();
    }
    updatePlayerButtons();
    return;
  }

  await seekTrackAudio(track, currentAudio?.currentTime || 0, { autoplay: true });
}

async function moveTrackTextsModal(direction) {
  const track = getModalTrack();
  const trackIndex = track ? getTrackIndexByNumber(track.number) : currentTrackIndex;
  const total = Array.isArray(currentAlbum?.tracks) ? currentAlbum.tracks.length : 0;
  if (!total) {
    return;
  }

  const nextIndex = Math.max(0, Math.min(total - 1, trackIndex + direction));
  const nextTrack = currentAlbum.tracks[nextIndex] || null;
  if (!nextTrack) {
    return;
  }

  currentTrackIndex = nextIndex;
  syncTrackCarouselUi();
  openTrackTextsModal(nextTrack);
}

function openTrackTextsModal(track) {
  const modal = ensureTrackTextsModal();
  const title = modal.querySelector("#track-texts-title");
  const body = modal.querySelector("#track-texts-body");
  if (!title || !body) {
    return;
  }

  title.textContent = track?.title || "Textos da faixa";
  body.dataset.trackNumber = String(track?.number || "");
  const storedDraft = isAdmin() ? readTrackSyncDraft(track) : null;
  if (storedDraft) {
    trackTextsSyncDraft = buildTrackSyncDraft(track, storedDraft);
    trackTextsSyncMode = Boolean(storedDraft.syncMode);
  } else if (!trackTextsSyncMode || String(trackTextsSyncDraft?.trackId || "") !== String(track?.sourceSongId || "")) {
    trackTextsSyncDraft = null;
    trackTextsSyncMode = false;
  }
  const renderLines = trackTextsSyncDraft ? cloneLyricsLines(trackTextsSyncDraft.lines) : getTrackLyricsLines(track);
  body.innerHTML = renderLyricsLinesHtml(track, renderLines);
  trackTextsLastActiveIndex = -1;
  closeTrackTextsTrackPicker();
  const allLines = renderLines;
  if (trackTextsSyncMode) {
    const firstUnsyncedIndex = allLines.findIndex((line) => line.timestampMs === null || line.timestampMs === undefined);
    modalManualLineIndex = firstUnsyncedIndex >= 0 ? firstUnsyncedIndex : Math.max(allLines.length - 1, 0);
  } else {
    modalManualLineIndex = allLines.some((line) => line.timestampMs !== null && line.timestampMs !== undefined) ? -1 : 0;
  }
  syncTrackTextsModeUi(track);
  title.onpointerdown = null;
  title.onpointerup = null;
  title.onpointerleave = null;
  title.onpointercancel = null;
  if (isAdmin()) {
    const clearTitleHold = () => {
      if (trackTextsTitleHoldTimer) {
        window.clearTimeout(trackTextsTitleHoldTimer);
        trackTextsTitleHoldTimer = null;
      }
    };
    title.onpointerdown = () => {
      clearTitleHold();
      trackTextsTitleHoldTimer = window.setTimeout(async () => {
        await enterTrackTextsSyncMode(track);
      }, 2000);
    };
    title.onpointerup = clearTitleHold;
    title.onpointerleave = clearTitleHold;
    title.onpointercancel = clearTitleHold;
  }
  body.querySelectorAll(".track-texts-line").forEach((node) => {
    const lineIndex = Number(node.dataset.lyricsIndex || 0);
    const openTextEditor = () => {
      if (isAdmin() && String(track?.sourceAlbumId || "") && String(track?.sourceSongId || "")) {
        openTrackTextEditModal(track, lineIndex);
      }
    };

    node.addEventListener("click", async (event) => {
      if (trackTextsTouchState?.opened) {
        trackTextsTouchState = null;
        return;
      }
      const now = Date.now();
      const isDoubleTap = trackTextsLastTap.index === lineIndex && (now - trackTextsLastTap.time) < 360;
      trackTextsLastTap = { index: lineIndex, time: now };

      if (trackTextsSyncMode && isDoubleTap) {
        event.preventDefault();
        if (mergeTrackSyncDraftLine(lineIndex)) {
          persistTrackTextsSyncDraft(track);
          modalManualLineIndex = Math.max(0, lineIndex - 1);
          openTrackTextsModal(track);
          showFloatingNotice("Linha unida com a de cima.");
        }
        return;
      }

      if (trackTextsSyncMode) {
        event.preventDefault();
        if (!trackTextsSyncDraft) {
          trackTextsSyncDraft = buildTrackSyncDraft(track);
        }
        const isPaused = !currentAudio || currentAudio.paused || currentTrackNumber !== track.number;
        if (isPaused) {
          const anchorTimestampMs = lineIndex <= 0
            ? 0
            : Math.max(0, Number(trackTextsSyncDraft.lines[lineIndex]?.timestampMs || 0));
          resetTrackSyncDraftFromLine(lineIndex);
          persistTrackTextsSyncDraft(track);
          modalManualLineIndex = Math.min(lineIndex + 1, Math.max(trackTextsSyncDraft.lines.length - 1, 0));
          await seekTrackAudio(track, anchorTimestampMs / 1000, { autoplay: false });
          openTrackTextsModal(track);
          return;
        }
        const nowMs = Math.max(0, Math.round((currentAudio?.currentTime || 0) * 1000));
        if (trackTextsSyncDraft.lines[lineIndex]) {
          trackTextsSyncDraft.lines[lineIndex].timestampMs = nowMs;
        }
        persistTrackTextsSyncDraft(track);
        modalManualLineIndex = Math.min(lineIndex + 1, Math.max(trackTextsSyncDraft.lines.length - 1, 0));
        openTrackTextsModal(track);
        return;
      }

      if (isAdmin() && isDesktopPointer()) {
        const timestampValue = String(node.dataset.timestampMs || "").trim();
        if (timestampValue) {
          const timestampMs = Number(timestampValue || 0);
          await seekTrackAudio(track, Math.max(0, timestampMs) / 1000, { autoplay: true });
          return;
        }
        modalManualLineIndex = lineIndex;
        syncTrackTextsModalHighlight(track, currentAudio?.currentTime || 0);
        return;
      }
      const timestampValue = String(node.dataset.timestampMs || "").trim();
      if (timestampValue) {
        const timestampMs = Number(timestampValue || 0);
        await seekTrackAudio(track, Math.max(0, timestampMs) / 1000, { autoplay: true });
        return;
      }
      modalManualLineIndex = lineIndex;
      syncTrackTextsModalHighlight(track, currentAudio?.currentTime || 0);
    });
    node.addEventListener("pointerdown", (event) => {
      if (!isAdmin()) {
        return;
      }
      trackTextsTouchState = {
        startX: Number(event.clientX || 0),
        startY: Number(event.clientY || 0),
        opened: false,
        timer: window.setTimeout(() => {
          if (trackTextsTouchState) {
            trackTextsTouchState.opened = true;
          }
          openTextEditor();
        }, 520)
      };
    });
    node.addEventListener("pointerup", () => {
      if (trackTextsTouchState?.timer) {
        window.clearTimeout(trackTextsTouchState.timer);
      }
      trackTextsTouchState = null;
    });
    node.addEventListener("pointercancel", () => {
      if (trackTextsTouchState?.timer) {
        window.clearTimeout(trackTextsTouchState.timer);
      }
      trackTextsTouchState = null;
    });
  });
  body.onpointerdown = (event) => {
    trackTextsTouchState = {
      ...(trackTextsTouchState || {}),
      startX: Number(event.clientX || 0),
      startY: Number(event.clientY || 0)
    };
  };
  body.onpointerup = async (event) => {
    const state = trackTextsTouchState;
    if (!state) {
      return;
    }
    const deltaX = Number(event.clientX || 0) - Number(state.startX || 0);
    const deltaY = Number(event.clientY || 0) - Number(state.startY || 0);
    if (Math.abs(deltaY) > 44 && Math.abs(deltaY) > Math.abs(deltaX)) {
      await moveTrackTextsLineBy(deltaY < 0 ? 1 : -1);
    }
    trackTextsTouchState = null;
  };
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  syncTrackTextsModalUi(track);
}

function getTrackLyricsLines(track) {
  const syncLines = Array.isArray(track?.lyricsSyncData?.lines) ? track.lyricsSyncData.lines : [];
  if (syncLines.length) {
    return syncLines.map((line, index) => ({
      number: Number(line?.number || index + 1) || (index + 1),
      text: String(line?.text || "").trim(),
      timestampMs: line?.timestampMs === null || line?.timestampMs === undefined ? null : Math.max(0, Number(line.timestampMs) || 0),
      characterId: String(line?.characterId || "").trim()
    })).filter((line) => line.text);
  }

  return String(track?.lyrics || "")
    .split(/\r?\n/)
    .map((text, index) => ({
      number: index + 1,
      text: String(text || "").trim(),
      timestampMs: null,
      characterId: ""
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

  const lines = getTrackModalWorkingLines(track);
  const hasTimedLines = lines.some((line) => line.timestampMs !== null && line.timestampMs !== undefined);
  const currentMs = Math.max(0, Number(currentTimeSeconds || 0) * 1000);
  let activeIndex = hasTimedLines ? -1 : Math.max(0, Math.min(modalManualLineIndex, Math.max(lines.length - 1, 0)));

  if (trackTextsSyncMode) {
    activeIndex = Math.max(0, Math.min(modalManualLineIndex, Math.max(lines.length - 1, 0)));
  }

  if (hasTimedLines && !trackTextsSyncMode) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.timestampMs !== null && line.timestampMs !== undefined && currentMs >= line.timestampMs) {
        activeIndex = index;
      }
    }
  }

  let activeNode = null;
  body.querySelectorAll(".track-texts-line").forEach((node, index) => {
    const isActive = index === activeIndex;
    const relativeOffset = activeIndex >= 0 ? Math.max(-4, Math.min(4, index - activeIndex)) : 0;
    const isSynced = lines[index]?.timestampMs !== null && lines[index]?.timestampMs !== undefined;
    node.classList.toggle("is-active", isActive);
    node.classList.toggle("is-synced", Boolean(isSynced));
    node.style.setProperty("--line-offset-y", `${relativeOffset * 12}px`);
    node.style.setProperty("--line-depth", String(Math.min(Math.abs(relativeOffset), 4)));
    if (isActive) {
      activeNode = node;
    }
  });

  if (activeNode && activeIndex !== trackTextsLastActiveIndex) {
    const bodyRect = body.getBoundingClientRect();
    const nodeRect = activeNode.getBoundingClientRect();
    const currentScrollTop = body.scrollTop;
    const nodeOffsetTop = nodeRect.top - bodyRect.top + currentScrollTop;
    const targetScrollTop = Math.max(
      0,
      nodeOffsetTop - (body.clientHeight / 2) + (activeNode.clientHeight / 2)
    );
    body.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    });
  }
  trackTextsLastActiveIndex = activeIndex;
}

async function moveTrackTextsLineBy(delta) {
  const track = getModalTrack();
  const lines = getModalLines();
  if (!track || !lines.length) {
    return;
  }

  const hasTimedLines = lines.some((line) => line.timestampMs !== null && line.timestampMs !== undefined);
  let baseIndex = hasTimedLines ? lines.findIndex((line) => Number(line.timestampMs || 0) >= Math.max(0, Number(currentAudio?.currentTime || 0) * 1000)) : modalManualLineIndex;
  if (baseIndex < 0) {
    baseIndex = hasTimedLines ? 0 : 0;
  }
  const nextIndex = Math.max(0, Math.min(lines.length - 1, baseIndex + delta));
  modalManualLineIndex = nextIndex;
  const targetLine = lines[nextIndex];
  if (hasTimedLines && targetLine?.timestampMs !== null && targetLine?.timestampMs !== undefined) {
    await seekTrackAudio(track, Math.max(0, Number(targetLine.timestampMs || 0)) / 1000, { autoplay: true });
    return;
  }
  syncTrackTextsModalHighlight(track, currentAudio?.currentTime || 0);
}

function syncTrackTextsModalUi(track) {
  const modal = document.getElementById("track-texts-modal");
  const progressInput = modal?.querySelector("[data-role='modal-progress']");
  const playButton = modal?.querySelector("[data-role='modal-play']");
  const currentTimeLabel = modal?.querySelector("#track-texts-current-time");
  const durationLabel = modal?.querySelector("#track-texts-duration");
  const listButton = modal?.querySelector("[data-role='modal-list']");
  if (!modal || modal.getAttribute("aria-hidden") !== "false" || !track) {
    return;
  }

  const audio = getTrackAudioByNumber(track.number);
  const duration = Number.isFinite(audio?.duration) ? audio.duration : 0;
  const currentTime = currentTrackNumber === track.number && Number.isFinite(currentAudio?.currentTime) ? currentAudio.currentTime : 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = currentTrackNumber === track.number && currentAudio && !currentAudio.paused;

  if (progressInput) {
    progressInput.value = String(progress);
    progressInput.style.setProperty("--track-progress", `${progress}%`);
  }
  if (playButton) {
    playButton.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    playButton.setAttribute("aria-label", isPlaying ? "Pausar faixa" : "Tocar faixa");
  }
  if (currentTimeLabel) {
    currentTimeLabel.textContent = formatTime(currentTime);
  }
  if (durationLabel) {
    durationLabel.textContent = formatTime(duration);
  }
  if (listButton) {
    listButton.disabled = !Array.isArray(currentAlbum?.tracks) || currentAlbum.tracks.length <= 1;
  }

  syncTrackTextsModalHighlight(track, currentTime);
}

function syncTrackLyricsHighlight(card, track, currentTimeSeconds) {
  const panel = card?.querySelector("[data-role='lyrics-panel']");
  if (!panel) {
    syncTrackTextsModalHighlight(track, currentTimeSeconds);
    return;
  }

  const lines = getTrackModalWorkingLines(track);
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

  const modalTrack = getModalTrack();
  if (modalTrack) {
    syncTrackTextsModalUi(modalTrack);
  }
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

  const hasExistingTimestamps = getTrackLyricsLines(track).some((line) => line.timestampMs !== null && line.timestampMs !== undefined);
  if (hasExistingTimestamps) {
    const accepted = await confirmTrackTextsReset();
    if (!accepted) {
      return;
    }
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
