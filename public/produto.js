const sessionStorageKey = "turma_do_printy_token";
const offlineCacheName = "turma-do-printy-offline-v1";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productDescription = document.getElementById("product-description");
const productPrice = document.getElementById("product-price");
const productTrackCount = document.getElementById("product-track-count");
const buyAlbumButton = document.getElementById("buy-album-button");
const purchaseStatus = document.getElementById("purchase-status");
const manifestStatus = document.getElementById("manifest-status");
const trackList = document.getElementById("track-list");

let accessState = {
  authenticated: false,
  canDownloadAll: false,
  purchasedAlbumIds: []
};

let currentAudio = null;
let currentTrackNumber = null;

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

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    return;
  }

  const response = await fetch("/api/account/access", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (response.status === 401) {
    window.localStorage.removeItem(sessionStorageKey);
    accessState = {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar acesso do usuario.");
  }

  accessState = {
    authenticated: true,
    canDownloadAll: Boolean(data.access.canDownloadAll),
    purchasedAlbumIds: Array.isArray(data.access.purchasedAlbumIds) ? data.access.purchasedAlbumIds : []
  };
}

function setPurchaseStatus(albumId) {
  const params = new URLSearchParams(window.location.search);

  if (params.get("payment") === "return") {
    purchaseStatus.textContent = "Pagamento enviado ao Stripe. O plano Gratis ja libera streaming e download offline no navegador.";
    return;
  }

  if (canUseDownloads(albumId)) {
    purchaseStatus.textContent = accessState.authenticated
      ? "Plano Gratis ativo no servidor. Todas as faixas podem tocar e ser baixadas para uso offline neste navegador."
      : "Faca login para usar o plano Gratis e baixar as faixas para uso offline neste navegador.";
    return;
  }

  purchaseStatus.textContent = "Streaming liberado. Faca login para baixar as faixas para uso offline neste navegador.";
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
    purchaseStatus.textContent = error instanceof Error ? error.message : "Erro ao iniciar pagamento.";
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
    const playButton = card.querySelector("[data-role='play']");
    const pauseButton = card.querySelector("[data-role='pause']");

    if (!playButton || !pauseButton) {
      return;
    }

    const isCurrent = currentTrackNumber === trackNumber && currentAudio;
    const isPlaying = isCurrent && !currentAudio.paused;
    playButton.hidden = isPlaying;
    pauseButton.hidden = !isPlaying;
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
  actionLabel.textContent = downloaded ? "Disponivel offline neste navegador" : label || "Streaming online";
  downloadButton.disabled = false;
}

async function downloadTrackForOffline(card, albumId, track) {
  if (!accessState.authenticated) {
    redirectToAuth(albumId);
    return;
  }

  if (!canUseDownloads(albumId)) {
    purchaseStatus.textContent = "O plano Gratis precisa estar ativo na sua conta para baixar offline.";
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
    article.innerHTML = `
      <div class="track-copy">
        <p class="track-number">Faixa ${String(track.number).padStart(3, "0")}</p>
        <h3>${track.label}</h3>
        <p class="track-download-label">${downloaded ? "Disponivel offline neste navegador" : "Streaming online"}</p>
      </div>
      <div class="track-player-shell">
        <audio preload="none"></audio>
        <div class="track-player-controls">
          <button class="icon-button ghost-button" type="button" data-role="play" aria-label="Tocar">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="icon-button ghost-button" type="button" data-role="pause" aria-label="Pausar" hidden>
            <svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>
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
    `;

    const audio = article.querySelector("audio");
    bindAudioToCard(article, audio);

    article.querySelector("[data-role='play']").addEventListener("click", async () => {
      await playTrack(article, album.id, track);
    });

    article.querySelector("[data-role='pause']").addEventListener("click", () => {
      audio.pause();
      updatePlayerButtons();
    });

    article.querySelector("[data-role='restart']").addEventListener("click", () => {
      restartTrack(article);
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

    trackList.appendChild(article);
  }
}

async function loadAlbumDetail() {
  const albumId = getAlbumId();

  if (!albumId) {
    productTitle.textContent = "Album nao encontrado";
    purchaseStatus.textContent = "Escolha um album pela pagina de produtos.";
    buyAlbumButton.disabled = true;
    return;
  }

  try {
    await loadAccessState();

    const response = await fetch(`/api/store/products/${encodeURIComponent(albumId)}`);
    const album = await response.json();

    if (!response.ok) {
      throw new Error(album.error || "Falha ao carregar album.");
    }

    document.title = `Turma do Printy | ${album.name}`;
    productCover.src = album.coverUrl;
    productCover.alt = `Capa do album ${album.name}`;
    productTitle.textContent = album.name;
    productDescription.textContent = album.description;
    productPrice.textContent = album.priceLabel;
    productTrackCount.textContent = `${album.tracks.length} MP3`;
    manifestStatus.textContent = album.hasManifest
      ? "Titulos carregados do manifest do album."
      : "Manifest de faixas nao encontrado. Exibindo numeracao padrao.";
    setPurchaseStatus(album.id);
    await renderTracks(album);

    buyAlbumButton.textContent = "Comprar no Stripe";
    buyAlbumButton.onclick = async () => {
      await startCheckout(album.id);
    };
  } catch (error) {
    productTitle.textContent = "Nao foi possivel abrir o album";
    purchaseStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido.";
    buyAlbumButton.disabled = true;
  }
}

await loadAlbumDetail();
