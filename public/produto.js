const sessionStorageKey = "turma_do_printy_token";
const offlineCacheName = "turma-do-printy-offline-v1";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productPrice = document.getElementById("product-price");
const buyAlbumButton = document.getElementById("buy-album-button");
const manifestStatus = document.getElementById("manifest-status");
const trackList = document.getElementById("track-list");
const albumAdminPanel = document.getElementById("album-admin-panel");
const albumPriceInput = document.getElementById("album-price-input");
const albumSaveButton = document.getElementById("album-save-button");
const albumAdminStatus = document.getElementById("album-admin-status");
const trackTextOverlay = document.getElementById("track-text-overlay");
const trackTextTitle = document.getElementById("track-text-title");
const trackTextBody = document.getElementById("track-text-body");
const trackTextClose = document.getElementById("track-text-close");

let accessState = {
  authenticated: false,
  canDownloadAll: false,
  purchasedAlbumIds: []
};

let currentAudio = null;
let currentTrackNumber = null;
let currentUser = null;
let currentAlbum = null;
let activeSpeechRecognition = null;
let lyricsSilenceTimer = null;
const adminUsername = "rosemattos";
const trackTextSpeakerPalette = [
  "#ffe17a",
  "#9fd4ff",
  "#9ff0bf",
  "#88b8ff"
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getTrackModeLabel(track) {
  return track?.type === "playback" ? "Playback" : "Full";
}

function getTrackTextContent(track) {
  return String(track?.textContent || track?.lyrics || "").trim();
}

function buildTrackTextJson(textContent) {
  const lines = String(textContent || "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dialogueMatch = line.match(/^\[([^\]]+)\]~\s*(.+)$/u);

      if (dialogueMatch) {
        const speaker = dialogueMatch[1].trim();
        const text = dialogueMatch[2].trim();

        if (speaker.toLowerCase() === "faixa") {
          return { type: "faixa", text };
        }

        return { type: "dialogo", speaker, text };
      }

      const lyricMatch = line.match(/^(?:\.?\s*faixa\.?|\[faixa\])\s*~?\s*(.+)$/iu);
      if (lyricMatch) {
        return { type: "faixa", text: lyricMatch[1].trim() };
      }

      return { type: "faixa", text: line };
    })
    .filter((item) => item.text);

  return lines.length ? { lines } : null;
}

function getTrackTextEntries(track) {
  const manifestLines = Array.isArray(track?.textJson?.lines) ? track.textJson.lines : [];

  if (manifestLines.length) {
    return manifestLines
      .map((item) => ({
        type: String(item?.type || "faixa").toLowerCase() === "dialogo" ? "dialogo" : "faixa",
        speaker: String(item?.speaker || "").trim(),
        text: String(item?.text || "").trim()
      }))
      .filter((item) => item.text);
  }

  return buildTrackTextJson(getTrackTextContent(track))?.lines || [];
}

function hasTrackText(track) {
  return getTrackTextEntries(track).length > 0;
}

function openTrackTextOverlay(track) {
  if (!trackTextOverlay || !trackTextTitle || !trackTextBody) {
    return;
  }

  const lines = getTrackTextEntries(track);
  if (!lines.length) {
    return;
  }

  const speakerColors = new Map();
  let colorIndex = 0;
  trackTextTitle.textContent = track.label || track.title || `Faixa ${String(track.number).padStart(3, "0")}`;
  trackTextBody.innerHTML = "";

  for (const line of lines) {
    const item = document.createElement("div");
    item.className = line.type === "dialogo" ? "track-text-line dialogue" : "track-text-line lyric";

    if (line.type === "dialogo" && line.speaker) {
      const speakerKey = line.speaker.trim().toLowerCase();
      if (!speakerColors.has(speakerKey)) {
        speakerColors.set(speakerKey, trackTextSpeakerPalette[colorIndex % trackTextSpeakerPalette.length]);
        colorIndex += 1;
      }

      const speaker = document.createElement("span");
      speaker.className = "track-text-speaker";
      speaker.textContent = line.speaker;
      speaker.style.background = speakerColors.get(speakerKey);
      item.appendChild(speaker);
    }

    const text = document.createElement("p");
    text.className = "track-text-copy";
    text.textContent = line.text;
    item.appendChild(text);
    trackTextBody.appendChild(item);
  }

  trackTextOverlay.hidden = false;
  document.body.classList.add("overlay-open");
}

function closeTrackTextOverlay() {
  if (!trackTextOverlay) {
    return;
  }

  trackTextOverlay.hidden = true;
  document.body.classList.remove("overlay-open");
}

function getAlbumId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("album") || "";
}

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function getAuthRedirectUrl(albumId) {
  return `/auth.html?next=${encodeURIComponent(`/produto.html?album=${encodeURIComponent(albumId)}`)}`;
}

function redirectToAuth(albumId) {
  window.location.href = getAuthRedirectUrl(albumId);
}

function hasPurchasedAlbum(albumId) {
  return accessState.purchasedAlbumIds.includes(albumId);
}

function canUseDownloads(albumId) {
  return accessState.canDownloadAll || hasPurchasedAlbum(albumId);
}

function isAdmin() {
  return Boolean(
    currentUser?.isAdmin &&
    String(currentUser?.username || "").trim().toLowerCase() === adminUsername
  );
}

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    currentUser = null;
    return;
  }

  const [accessResponse, meResponse] = await Promise.all([
    fetch("/api/account/access", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    fetch("/api/auth/me", {
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

  purchaseStatus.textContent = "";
}

async function startCheckout(albumId) {
  const token = getToken();

  if (!token) {
    redirectToAuth(albumId);
    return;
  }

  const originalText = buyAlbumButton.textContent;
  buyAlbumButton.disabled = true;
  buyAlbumButton.textContent = "Abrindo checkout...";

  try {
    const response = await fetch("/api/payments/stripe/checkout", {
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
    buyAlbumButton.disabled = false;
    buyAlbumButton.textContent = originalText;
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
    const playButton = card.querySelector("[data-role='play-toggle']");
    const playIcon = playButton?.querySelector("path");

    if (!playButton || !playIcon) {
      return;
    }

    const isCurrent = currentTrackNumber === trackNumber && currentAudio;
    const isPlaying = isCurrent && !currentAudio.paused;
    playButton.setAttribute("aria-label", isPlaying ? "Pausar" : "Tocar");
    playIcon.setAttribute("d", isPlaying ? "M7 5h4v14H7zm6 0h4v14h-4z" : "M8 5v14l11-7z");
  });
}

function bindAudioToCard(card, audio) {
  const timeLabel = card.querySelector(".track-time");
  const progress = card.querySelector(".track-progress");

  audio.addEventListener("loadedmetadata", () => {
    timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    progress.max = Number.isFinite(audio.duration) ? String(audio.duration) : "0";
  });

  audio.addEventListener("timeupdate", () => {
    if (!progress.dataset.downloading) {
      progress.value = String(audio.currentTime || 0);
    }

    timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    updatePlayerButtons();
  });

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    progress.value = "0";
    updatePlayerButtons();
  });

  audio.addEventListener("pause", updatePlayerButtons);
  audio.addEventListener("play", updatePlayerButtons);

  progress.addEventListener("input", () => {
    if (progress.dataset.downloading) {
      return;
    }

    audio.currentTime = Number(progress.value || 0);
  });
}

async function playTrack(card, albumId, track) {
  const audio = card.querySelector("audio");

  if (!audio) {
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

  currentAudio = audio;
  currentTrackNumber = track.number;
  await audio.play();
  updatePlayerButtons();
}

function restartTrack(card) {
  const audio = card.querySelector("audio");
  const progress = card.querySelector(".track-progress");

  if (!audio || !progress) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  progress.value = "0";
  updatePlayerButtons();
}

function seekTrack(card, delta) {
  const audio = card.querySelector("audio");

  if (!audio) {
    return;
  }

  audio.currentTime = Math.max(0, (audio.currentTime || 0) + delta);
}

function setDownloadUi(card, { downloading = false, progress = 0, downloaded = false, label = "" } = {}) {
  const progressBar = card.querySelector(".track-progress");
  const actionLabel = card.querySelector(".track-download-label");
  const downloadButton = card.querySelector("[data-role='download']");

  if (!progressBar || !actionLabel || !downloadButton) {
    return;
  }

  if (downloading) {
    progressBar.dataset.downloading = "true";
    progressBar.classList.add("downloading");
    progressBar.value = String(progress);
    progressBar.max = "100";
    actionLabel.textContent = label || `Baixando ${Math.round(progress)}%`;
    downloadButton.disabled = true;
    return;
  }

  delete progressBar.dataset.downloading;
  progressBar.classList.remove("downloading");
  actionLabel.textContent = downloaded ? "Disponivel offline neste navegador" : label || card.dataset.trackMode || "Full";
  downloadButton.disabled = false;
}

async function downloadTrackForOffline(card, albumId, track) {
  if (!accessState.authenticated) {
    redirectToAuth(albumId);
    return;
  }

  if (!canUseDownloads(albumId)) {
    manifestStatus.textContent = "Para baixar offline, compre este album ou assine um plano pago.";
    return;
  }

  const response = await fetch(`/api/store/products/${encodeURIComponent(albumId)}/tracks/${track.number}/download`, {
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
    const textInput = card.querySelector(".track-text-input");
    const playbackSelect = card.querySelector(".track-playback-select");
    const track = currentAlbum.tracks.find((item) => item.number === number);
    const textContent = textInput ? textInput.value : track.textContent || track.lyrics || "";

    return {
      ...track,
      title: titleInput ? titleInput.value.trim() || track.title : track.title,
      label: titleInput ? titleInput.value.trim() || track.title : track.title,
      type: typeButton?.dataset.trackType || track.type,
      playbackTrackNumber: playbackSelect && playbackSelect.value ? Number(playbackSelect.value) : null,
      lyrics: textContent,
      textContent,
      textJson: buildTrackTextJson(textContent)
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
  const editorToggle = card.querySelector(".track-admin-plus");
  const editorPanel = card.querySelector(".track-editor-panel");
  const playbackSelect = card.querySelector(".track-playback-select");
  const textInput = card.querySelector(".track-text-input");
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
    seekTrack(card, -3);
  });

  forwardLyricsButton.addEventListener("click", () => {
    seekTrack(card, 3);
  });

  attachLyricsVoiceShortcut(card, textInput);
  enableTitleVoiceShortcut(card, titleInput);
}

async function renderTracks(album) {
  trackList.innerHTML = "";

  if (!Array.isArray(album.tracks) || !album.tracks.length) {
    trackList.innerHTML = `
      <article class="track-card">
        <div class="track-copy">
          <p class="track-number">MP3</p>
          <h3>Nenhuma faixa cadastrada neste album</h3>
          <p class="track-download-label">Quando os arquivos forem publicados, eles vao aparecer aqui.</p>
        </div>
      </article>
    `;
    return;
  }

  for (const track of album.tracks) {
    const downloaded = await isTrackDownloaded(album.id, track.number);
    const article = document.createElement("article");
    article.className = "track-card";
    article.dataset.trackNumber = String(track.number);
    article.dataset.trackMode = getTrackModeLabel(track);

    const playbackOptions = album.tracks
      .filter((item) => item.number !== track.number)
      .map((item) => `<option value="${item.number}" ${Number(track.playbackTrackNumber) === item.number ? "selected" : ""}>${String(item.number).padStart(3, "0")}</option>`)
      .join("");

    article.innerHTML = `
      <div class="track-copy">
        <p class="track-number">Faixa ${String(track.number).padStart(3, "0")}</p>
        <div class="track-title-row">
          <h3 class="track-title-display">${escapeHtml(track.label)}</h3>
          <input class="track-title-input" type="text" value="${escapeHtml(track.label)}" hidden>
          ${isAdmin() ? `<button class="ghost-button track-type-toggle" type="button" data-track-type="${track.type}">${getTrackModeLabel(track)}</button>` : ""}
          ${isAdmin() ? `<button class="ghost-button track-admin-plus" type="button" aria-label="Abrir editor da faixa">+</button>` : ""}
        </div>
        <p class="track-download-label">${downloaded ? "Disponivel offline neste navegador" : getTrackModeLabel(track)}</p>
      </div>
      <div class="track-player-shell">
        <audio preload="none"></audio>
        <div class="track-player-controls">
          <button class="icon-button ghost-button" type="button" data-role="play-toggle" aria-label="Tocar">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="icon-button ghost-button track-text-button ${hasTrackText(track) ? "has-text" : "no-text"}" type="button" data-role="text" aria-label="Abrir texto da faixa">
            <svg viewBox="0 0 24 24"><path d="M5 4h14v2H5zm0 5h14v2H5zm0 5h10v2H5zm0 5h10v2H5z"/></svg>
          </button>
          <button class="icon-button ghost-button" type="button" data-role="restart" aria-label="Voltar ao inicio">
            <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
          </button>
          <input class="track-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso da faixa">
          <span class="track-time">00:00 / 00:00</span>
        </div>
      </div>
      <div class="track-actions">
        <button class="ghost-button" type="button" data-role="download">
          ${accessState.authenticated ? "Baixar offline" : "Faca login para baixar"}
        </button>
      </div>
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
          <label>Texto da faixa
            <textarea class="track-text-input" placeholder="Use [Nome]~ fala para dialogo e [faixa]~ para musica. Se quiser ditar, escreva miki.">${escapeHtml(track.textContent || track.lyrics || "")}</textarea>
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

    article.querySelector("[data-role='play-toggle']").addEventListener("click", async () => {
      if (currentAudio === audio && !audio.paused) {
        audio.pause();
        updatePlayerButtons();
        return;
      }

      await playTrack(article, album.id, track);
    });

    article.querySelector("[data-role='restart']").addEventListener("click", () => {
      restartTrack(article);
    });

    article.querySelector("[data-role='text']").addEventListener("click", () => {
      openTrackTextOverlay(track);
    });

    article.querySelector("[data-role='download']").addEventListener("click", async () => {
      try {
        await downloadTrackForOffline(article, album.id, track);
      } catch (error) {
        const label = article.querySelector(".track-download-label");
        label.textContent = error instanceof Error ? error.message : "Erro ao baixar para offline.";
      }
    });

    if (downloaded) {
      setDownloadUi(article, { downloaded: true });
    }

    bindAdminTrackEditor(article, album, track);
    trackList.appendChild(article);
  }
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
    const response = await fetch(`/api/admin/albums/${encodeURIComponent(currentAlbum.id)}`, {
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

  if (!albumId) {
    productTitle.textContent = "Album nao encontrado";
    manifestStatus.textContent = "Escolha um album pela pagina de produtos.";
    buyAlbumButton.disabled = true;
    return;
  }

  try {
    await loadAccessState();

    const response = await fetch(isAdmin()
      ? `/api/admin/albums/${encodeURIComponent(albumId)}`
      : `/api/store/products/${encodeURIComponent(albumId)}`, {
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
    manifestStatus.textContent = album.hasManifest
      ? "Titulos carregados do manifest do album."
      : "Manifest de faixas nao encontrado. Exibindo numeracao padrao.";
    setPurchaseStatus(album.id);
    syncAdminPanel(album);
    await renderTracks(album);

    buyAlbumButton.textContent = "Comprar";
    buyAlbumButton.onclick = async () => {
      await startCheckout(album.id);
    };
  } catch (error) {
    productTitle.textContent = "Nao foi possivel abrir o album";
    const purchaseStatus = document.getElementById("purchase-status");
    if (purchaseStatus) {
      purchaseStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido.";
    }
    buyAlbumButton.disabled = true;
  }
}

albumSaveButton?.addEventListener("click", async () => {
  await saveAlbumAdminChanges();
});

trackTextClose?.addEventListener("click", () => {
  closeTrackTextOverlay();
});

trackTextOverlay?.addEventListener("click", (event) => {
  if (event.target === trackTextOverlay) {
    closeTrackTextOverlay();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && trackTextOverlay && !trackTextOverlay.hidden) {
    closeTrackTextOverlay();
  }
});

await loadAlbumDetail();
