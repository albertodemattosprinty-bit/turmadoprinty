(() => {
  const FILTER = "saturate(1.08) contrast(1.04) brightness(1.03)";
  const DB_NAME = "project200-life-captures";
  const STORE_NAME = "captures";
  const PROFILE_KEY = "project_200_profile_v1";
  const MEDIA_PREFIX = "[[ILIFE_MEDIA:";
  const MEDIA_SUFFIX = "]]";
  const TOKEN_KEY = "turma_do_printy_token";
  const state = {
    mode: "photo",
    facingMode: "environment",
    stream: null,
    raf: 0,
    recorder: null,
    chunks: [],
    recording: false,
    recordingStartedAt: 0,
    pending: null,
    captures: [],
    uploads: new Map(),
    activeIndex: 0,
    noteCaptureId: "",
    shareCaptureId: "",
    dragStartX: 0,
    dragDeltaX: 0,
    dragging: false,
    titleRecorder: null,
    titleStream: null,
    titleTimer: 0,
    titleAnalyser: null,
    titleAudioContext: null,
    titleLastSpeechAt: 0,
    noteRecorder: null,
    noteStream: null,
    noteTimer: 0,
    noteAnalyser: null,
    noteAudioContext: null,
    noteLastSpeechAt: 0,
    previewReady: false,
    memoryDiagnostics: {
      localCount: 0,
      remoteCount: 0,
      lastLoadError: "",
      lastUploadError: "",
      lastUploadAt: ""
    }
  };

  const byId = (id) => document.getElementById(id);
  const safeText = (value, fallback = "") => String(value ?? fallback);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatDate(iso) {
    const date = new Date(iso || Date.now());
    const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${day}  ${time}`;
  }

  function defaultTitle(kind, iso) {
    return `${kind === "video" ? "Video" : "Foto"} ${formatDate(iso)}`;
  }

  function currentProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return "Usuario";
      const parsed = JSON.parse(raw);
      return safeText(parsed?.name || parsed?.profileName || parsed?.username || "Usuario").trim() || "Usuario";
    } catch {
      return "Usuario";
    }
  }

  function readTokenCookie() {
    try {
      const match = document.cookie.match(/(?:^|; )turma_do_printy_token=([^;]+)/);
      return safeText(match ? decodeURIComponent(match[1]) : "").trim();
    } catch {
      return "";
    }
  }

  function getAuthToken() {
    try {
      const localToken = safeText(window.localStorage.getItem(TOKEN_KEY)).trim();
      if (localToken) return localToken;
    } catch {}
    return readTokenCookie();
  }

  function withAuthHeaders(headers = {}) {
    const next = { ...headers };
    const token = getAuthToken();
    if (token) next.Authorization = 'Bearer ' + token;
    return next;
  }

  function getApiOrigin() {
    const metaValue = document.querySelector('meta[name="tdp-api-base-url"]')?.getAttribute("content")?.trim();
    if (metaValue) return metaValue.replace(/\/+$/, "");
    const runtimeValue = typeof window.__TDP_API_BASE_URL__ === "string" ? window.__TDP_API_BASE_URL__.trim() : "";
    if (runtimeValue) return runtimeValue.replace(/\/+$/, "");
    const capacitor = window.Capacitor;
    const platform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "web";
    const isNative = typeof capacitor?.isNativePlatform === "function" ? capacitor.isNativePlatform() : platform === "android" || platform === "ios";
    if (isNative) return "https://www.turmadoprinty.com.br";
    return window.location.origin.replace(/\/+$/, "");
  }

  function getApiUrl(path) {
    if (!path) return getApiOrigin();
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    return getApiOrigin() + normalizedPath;
  }

  function inject() {
    if (byId("lifeCaptureOverlay")) return;
    const host = document.createElement("div");
    host.innerHTML = `
      <section class="life-capture-overlay" id="lifeCaptureOverlay" aria-hidden="true">
        <div class="life-capture-shell">
          <header class="life-capture-head">
            <div class="life-capture-head-copy">
              <span class="life-capture-kicker">Camera</span>
              <h2 class="life-capture-title" id="lifeCaptureModeLabel">Foto</h2>
            </div>
            <button class="life-capture-close" type="button" data-life-close="capture" aria-label="Fechar camera">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="life-capture-stage">
            <div class="life-capture-preview-frame" id="lifeCapturePreviewFrame">
              <div class="life-capture-preview-placeholder" id="lifeCapturePreviewPlaceholder" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>
              </div>
              <video id="lifeCapturePreview" autoplay playsinline muted></video>
              <canvas id="lifeCaptureCanvas" width="720" height="720" hidden></canvas>
            </div>
          </div>
          <p class="life-capture-status" id="lifeCaptureStatus">Abrindo camera...</p>
          <footer class="life-capture-footer">
            <button class="life-capture-icon-btn" id="lifeCaptureAlbumButton" type="button" aria-label="Abrir album">
              <span class="life-capture-thumb" id="lifeCaptureAlbumThumb">
                <svg viewBox="0 0 24 24"><path d="M4 5h5l1.4 1.8H20a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2.5 4.5v6h11v-6Z" fill="currentColor"/></svg>
              </span>
            </button>
            <button class="life-capture-trigger" id="lifeCaptureTriggerButton" type="button" aria-label="Capturar">
              <span class="life-capture-trigger-ring"></span>
              <span class="life-capture-trigger-core"></span>
            </button>
            <button class="life-capture-switch-minimal" id="lifeCaptureSwitchButton" type="button" aria-label="Trocar camera">
              <svg viewBox="0 0 24 24"><path d="M16 4h2.5A3.5 3.5 0 0 1 22 7.5V10m-14 10H5.5A3.5 3.5 0 0 1 2 16.5V14m4 6 3-3-3-3m12-10-3 3 3 3M8 7h8a3 3 0 1 1 0 6H8a3 3 0 1 1 0-6Zm0 4h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="life-capture-mode-btn" id="lifeCaptureModeButton" type="button" aria-label="Trocar foto ou video"></button>
          </footer>
        </div>
      </section>

      <section class="life-capture-overlay" id="lifeCaptureSaveOverlay" aria-hidden="true">
        <div class="life-capture-save-shell">
          <header class="life-capture-save-head">
            <div class="life-capture-head-copy">
              <span class="life-capture-kicker">Adicione um nome</span>
              <h2 class="life-capture-title">Seu momento</h2>
            </div>
            <button class="life-capture-close" type="button" data-life-close="save" aria-label="Fechar etapa">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="life-capture-save-preview">
            <img id="lifeCaptureSaveImage" alt="Previa da foto" hidden />
            <video id="lifeCaptureSaveVideo" playsinline muted loop hidden></video>
            <button class="life-capture-save-mic" id="lifeCaptureSaveMicButton" type="button" aria-label="Falar o nome">
              <svg viewBox="0 0 24 24"><path d="M12 15.2a3.6 3.6 0 0 0 3.6-3.6V6.6a3.6 3.6 0 1 0-7.2 0v5a3.6 3.6 0 0 0 3.6 3.6Zm-5.4-3.8a5.4 5.4 0 0 0 10.8 0M12 18.4V22m-3 0h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <label class="life-capture-save-title-wrap">
            <input class="life-capture-save-title" id="lifeCaptureTitleInput" type="text" maxlength="80" placeholder="De um nome para esse momento" />
          </label>
          <p class="life-capture-status" id="lifeCaptureSaveStatus"></p>
          <button class="primary-btn life-capture-save-button" id="lifeCaptureSaveButton" type="button">Salvar</button>
        </div>
      </section>

      <section class="life-capture-overlay" id="lifeCaptureViewerOverlay" aria-hidden="true">
        <div class="life-capture-viewer-shell">
          <div class="life-capture-viewer-viewport" id="lifeCaptureViewerViewport">
            <div class="life-capture-viewer-track" id="lifeCaptureViewerTrack"></div>
          </div>
          <div class="life-capture-viewer-footer">
            <button class="life-capture-toolbar-btn" id="lifeCaptureNoteButton" type="button" aria-label="Adicionar nota">
              <svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            </button>
            <button class="life-capture-toolbar-btn" id="lifeCaptureFullscreenButton" type="button" aria-label="Ver em tela cheia">
              <svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button class="life-capture-toolbar-btn" id="lifeCaptureViewerCloseButton" type="button" aria-label="Fechar visualizacao">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </section>

      <section class="life-capture-focus-overlay" id="lifeCaptureFocusOverlay" aria-hidden="true">
        <button class="life-capture-close" id="lifeCaptureFocusCloseButton" type="button" aria-label="Fechar tela cheia" style="position:absolute;top:max(18px,env(safe-area-inset-top,0px));right:18px;z-index:4;">
          <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <div class="life-capture-focus-media" id="lifeCaptureFocusMedia"></div>
      </section>

      <section class="life-capture-overlay" id="lifeCaptureNoteOverlay" aria-hidden="true">
        <div class="life-capture-note-shell">
          <header class="life-capture-note-head">
            <div class="life-capture-head-copy">
              <span class="life-capture-kicker">Notas da memoria</span>
              <h2 class="life-capture-title">Texto ou voz</h2>
            </div>
            <button class="life-capture-close" type="button" data-life-close="note" aria-label="Fechar nota">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </header>
          <label class="life-capture-note-field">
            <textarea class="life-capture-note-text" id="lifeCaptureNoteInput" placeholder="Escreva ou dite uma nota para esse momento"></textarea>
          </label>
          <div class="life-capture-note-actions">
            <button class="life-capture-note-mic" id="lifeCaptureNoteMicButton" type="button" aria-label="Gravar nota por voz">
              <svg viewBox="0 0 24 24"><path d="M12 15.2a3.6 3.6 0 0 0 3.6-3.6V6.6a3.6 3.6 0 1 0-7.2 0v5a3.6 3.6 0 0 0 3.6 3.6Zm-5.4-3.8a5.4 5.4 0 0 0 10.8 0M12 18.4V22m-3 0h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button class="primary-btn life-capture-note-save" id="lifeCaptureNoteSaveButton" type="button">Salvar nota</button>
          </div>
          <p class="life-capture-status" id="lifeCaptureNoteStatus"></p>
        </div>
      </section>

      <section class="life-capture-overlay" id="lifeCaptureShareOverlay" aria-hidden="true">
        <div class="life-capture-share-shell">
          <header class="life-capture-share-head">
            <div class="life-capture-head-copy">
              <span class="life-capture-kicker">Compartilhar</span>
              <h2 class="life-capture-title">Enviar para o chat</h2>
            </div>
            <button class="life-capture-close" type="button" data-life-close="share" aria-label="Fechar compartilhar">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="life-capture-share-list" id="lifeCaptureShareList"></div>
          <p class="life-capture-share-status" id="lifeCaptureShareStatus"></p>
        </div>
      </section>
    `;
    document.body.appendChild(host);
  }

  function setStatus(message = "") {
    const element = byId("lifeCaptureStatus");
    if (element) element.textContent = message;
  }

  function setSaveStatus(message = "") {
    const element = byId("lifeCaptureSaveStatus");
    if (element) element.textContent = message;
  }

  function setNoteStatus(message = "") {
    const element = byId("lifeCaptureNoteStatus");
    if (element) element.textContent = message;
  }

  function setShareStatus(message = "") {
    const element = byId("lifeCaptureShareStatus");
    if (element) element.textContent = message;
  }

  function show(id) {
    const element = byId(id);
    if (!element) return;
    element.classList.add("active");
    element.setAttribute("aria-hidden", "false");
  }

  function hide(id) {
    const element = byId(id);
    if (!element) return;
    element.classList.remove("active");
    element.setAttribute("aria-hidden", "true");
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadCaptures() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const items = Array.isArray(request.result) ? request.result.slice() : [];
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function saveCapture(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveCapturesBatch(items) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      for (const item of Array.isArray(items) ? items : []) {
        if (item?.id) store.put(item);
      }
      transaction.oncomplete = () => resolve(items || []);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function fetchServerCaptures() {
    const response = await fetch(getApiUrl('/api/200/life-captures'), {
      method: 'GET',
      headers: withAuthHeaders(),
      credentials: 'same-origin'
    });
    const payload = await readJsonResponse(response, 'Nao foi possivel carregar sua memoria.');
    return Array.isArray(payload?.captures) ? payload.captures : [];
  }

  async function patchServerCapture(captureId, patch = {}) {
    if (!captureId) return null;
    const response = await fetch(getApiUrl('/api/200/life-captures/' + encodeURIComponent(String(captureId))), {
      method: 'PATCH',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      body: JSON.stringify(patch)
    });
    const payload = await readJsonResponse(response, 'Nao foi possivel atualizar a captura.');
    return payload?.capture || null;
  }

  async function readJsonResponse(response, fallbackMessage) {
    const responseText = await response.text();
    let payload = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        const normalized = responseText.toLowerCase();
        if (normalized.includes("window.location.replace") || normalized.includes("/200/index.html")) {
          throw new Error("A API redirecionou para /200/index.html. Verifique login/token antes de consultar R2/Postgres.");
        }
        if (normalized.includes("<!doctype") || normalized.includes("<html")) {
          throw new Error("A API devolveu HTML em vez de JSON. Verifique rota, login/token ou deploy do backend.");
        }
        const plain = responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(plain || fallbackMessage || 'Resposta invalida do servidor.');
      }
    }
    if (!response.ok) {
      throw new Error(safeText(payload?.error || fallbackMessage || 'Nao foi possivel concluir essa acao.'));
    }
    return payload || {};
  }

  function dataUrlParts(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(safeText(dataUrl));
    if (!match) return { mimeType: '', base64: '' };
    return { mimeType: safeText(match[1]), base64: safeText(match[2]) };
  }

  async function blobToBase64(blob) {
    const dataUrl = await blobToDataUrl(blob);
    return dataUrlParts(dataUrl).base64;
  }

  function buildCapturePreviewUrl(capture) {
    return safeText(capture?.previewRemoteUrl || capture?.previewUrl || capture?.previewDataUrl || '');
  }

  function buildCaptureMediaUrl(capture) {
    return safeText(capture?.remoteUrl || capture?.mediaUrl || '');
  }

  async function ensureCaptureUploaded(capture) {
    if (!capture?.id) return capture;
    if (buildCaptureMediaUrl(capture) && buildCapturePreviewUrl(capture)) return capture;
    if (state.uploads.has(capture.id)) return state.uploads.get(capture.id);
    const uploadPromise = (async () => {
      if (!(capture.mediaBlob instanceof Blob)) return capture;
      const mediaBase64 = await blobToBase64(capture.mediaBlob);
      const previewParts = dataUrlParts(capture.previewDataUrl);
      const response = await fetch(getApiUrl('/api/200/life-captures/upload'), {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify({
          captureId: capture.id,
          kind: capture.kind,
          title: safeText(capture.title || ''),
          noteText: safeText(capture.noteText || ''),
          createdAt: capture.createdAt,
          durationMs: Number(capture.durationMs || 0),
          metadata: capture.metadata && typeof capture.metadata === 'object' ? capture.metadata : {},
          mimeType: safeText(capture.mimeType || capture.mediaBlob.type || ''),
          fileBase64: mediaBase64,
          previewBase64: previewParts.base64
        })
      });
      const payload = await readJsonResponse(response, 'Nao foi possivel enviar a midia.');
      const asset = payload?.asset || {};
      const serverCapture = payload?.capture && typeof payload.capture === 'object' ? payload.capture : null;
      const updated = {
        ...capture,
        ...(serverCapture || {}),
        remoteUrl: safeText(serverCapture?.remoteUrl || asset.url || capture.remoteUrl || ''),
        mediaUrl: safeText(serverCapture?.mediaUrl || asset.url || capture.mediaUrl || ''),
        previewRemoteUrl: safeText(serverCapture?.previewRemoteUrl || asset.previewUrl || capture.previewRemoteUrl || ''),
        previewUrl: safeText(serverCapture?.previewUrl || asset.previewUrl || capture.previewUrl || ''),
        uploadKey: safeText(serverCapture?.uploadKey || asset.key || capture.uploadKey || ''),
        previewKey: safeText(serverCapture?.previewKey || asset.previewKey || capture.previewKey || ''),
        sizeBytes: Number.isFinite(serverCapture?.sizeBytes) ? Number(serverCapture.sizeBytes) : (Number.isFinite(asset.sizeBytes) ? Number(asset.sizeBytes) : (capture.sizeBytes || capture.mediaBlob.size || 0)),
        uploadedAt: safeText(serverCapture?.uploadedAt || new Date().toISOString())
      };
      await saveCapture(updated);
      const active = getActiveCapture();
      const keepIndexId = safeText(active?.id || capture.id);
      await refreshCaptures();
      const nextIndex = state.captures.findIndex((item) => String(item.id) === keepIndexId);
      if (nextIndex >= 0) {
        state.activeIndex = nextIndex;
        updateViewerTransform();
      }
      return findCaptureById(capture.id) || updated;
    })().finally(() => {
      state.uploads.delete(capture.id);
    });
    state.uploads.set(capture.id, uploadPromise);
    return uploadPromise;
  }

  async function refreshCaptures() {
    let local = [];
    let remote = [];
    try {
      local = await loadCaptures();
    } catch {
      local = [];
    }
    state.memoryDiagnostics.localCount = local.length;
    try {
      remote = await fetchServerCaptures();
      state.memoryDiagnostics.remoteCount = Array.isArray(remote) ? remote.length : 0;
      state.memoryDiagnostics.lastLoadError = "";
      if (Array.isArray(remote) && remote.length) await saveCapturesBatch(remote);
    } catch (error) {
      remote = [];
      state.memoryDiagnostics.remoteCount = 0;
      state.memoryDiagnostics.lastLoadError = error instanceof Error ? error.message : "Falha ao consultar R2/Postgres.";
    }
    const byCaptureId = new Map();
    local.forEach((item) => {
      if (item?.id) byCaptureId.set(String(item.id), item);
    });
    (Array.isArray(remote) ? remote : []).forEach((item) => {
      if (!item?.id) return;
      byCaptureId.set(String(item.id), { ...(byCaptureId.get(String(item.id)) || {}), ...item });
    });
    const items = [...byCaptureId.values()];
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    state.captures = items;
    state.activeIndex = clamp(state.activeIndex, 0, Math.max(state.captures.length - 1, 0));
    await renderAlbumThumb();
    renderViewer();
  }

  function queuePendingUploads() {
    state.captures.forEach((capture) => {
      if (!capture?.id) return;
      if (buildCaptureMediaUrl(capture)) return;
      if (!(capture.mediaBlob instanceof Blob)) return;
      queueMicrotask(() => {
        ensureCaptureUploaded(capture).catch((error) => {
          state.memoryDiagnostics.lastUploadError = error instanceof Error ? error.message : "Falha ao salvar no R2.";
          renderViewer();
        });
      });
    });
  }

  async function uploadCaptureNow(captureId) {
    const capture = findCaptureById(captureId) || getActiveCapture();
    if (!capture) return;
    if (buildCaptureMediaUrl(capture)) {
      setStatus("Essa memoria ja esta vinculada ao R2/Postgres.");
      return;
    }
    if (!(capture.mediaBlob instanceof Blob)) {
      state.memoryDiagnostics.lastUploadError = "Arquivo local indisponivel neste dispositivo. Abra no aparelho onde a captura foi criada.";
      setStatus(state.memoryDiagnostics.lastUploadError);
      renderViewer();
      return;
    }
    try {
      setStatus("Salvando memoria no R2...");
      await persistCapturePatch(capture.id, { uploadStatus: "uploading", uploadError: "" });
      const uploaded = await ensureCaptureUploaded(capture);
      state.memoryDiagnostics.lastUploadAt = new Date().toISOString();
      state.memoryDiagnostics.lastUploadError = "";
      await saveCapture({ ...(findCaptureById(capture.id) || capture), ...(uploaded || {}) });
      await refreshCaptures();
      setStatus("Memoria salva no R2 e vinculada a sua conta.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar no R2.";
      state.memoryDiagnostics.lastUploadError = message;
      await persistCapturePatch(capture.id, { uploadStatus: "failed", uploadError: message }).catch(() => {});
      setStatus(message);
      renderViewer();
    }
  }

  function getActiveCapture() {
    return state.captures[state.activeIndex] || null;
  }

  function syncPreviewPlaceholder() {
    const frame = byId("lifeCapturePreviewFrame");
    const placeholder = byId("lifeCapturePreviewPlaceholder");
    if (frame) frame.classList.toggle("is-ready", !!state.previewReady);
    if (placeholder) placeholder.hidden = !!state.previewReady;
  }

  function stopPreview() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.previewReady = false;
    syncPreviewPlaceholder();
    const preview = byId("lifeCapturePreview");
    try {
      preview?.pause();
    } catch {}
    if (preview) preview.srcObject = null;
    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  function drawPreviewFrame() {
    const preview = byId("lifeCapturePreview");
    const canvas = byId("lifeCaptureCanvas");
    if (!(preview && canvas)) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!preview.videoWidth || !preview.videoHeight || !context) {
      state.previewReady = false;
      syncPreviewPlaceholder();
      state.raf = requestAnimationFrame(drawPreviewFrame);
      return;
    }
    if (!state.previewReady) {
      state.previewReady = true;
      syncPreviewPlaceholder();
    }
    const side = Math.min(preview.videoWidth, preview.videoHeight);
    const sourceX = (preview.videoWidth - side) / 2;
    const sourceY = (preview.videoHeight - side) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.filter = FILTER;
    if (state.facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(preview, sourceX, sourceY, side, side, 0, 0, canvas.width, canvas.height);
    context.restore();
    state.raf = requestAnimationFrame(drawPreviewFrame);
  }

  async function startPreview() {
    stopPreview();
    const preview = byId("lifeCapturePreview");
    if (!preview) return;
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: state.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });
    state.previewReady = false;
    syncPreviewPlaceholder();
    preview.srcObject = state.stream;
    preview.style.transform = "none";
    await preview.play().catch(() => {});
    drawPreviewFrame();
    setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");
  }

  function setModeUi() {
    const label = byId("lifeCaptureModeLabel");
    const modeButton = byId("lifeCaptureModeButton");
    const trigger = byId("lifeCaptureTriggerButton");
    if (label) label.textContent = state.mode === "video" ? "Video" : "Foto";
    if (modeButton) {
      modeButton.innerHTML = state.mode === "video"
        ? '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.2l4.1-2.4c.8-.46 1.9.1 1.9 1.02v9.4c0 .92-1.1 1.48-1.9 1.02L16 15.3v1.2A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>';
    }
    const captureShell = document.querySelector('#lifeCaptureOverlay .life-capture-shell');
    captureShell?.classList.toggle('is-video-mode', state.mode === 'video');
    trigger?.classList.toggle("is-recording", state.recording);
  }

  function canvasBlob() {
    const canvas = byId("lifeCaptureCanvas");
    return new Promise((resolve, reject) => {
      canvas?.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar a imagem."));
      }, "image/webp", 0.86);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(safeText(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function videoPreviewFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve) => {
      video.onloadeddata = resolve;
      setTimeout(resolve, 500);
    });
    try {
      video.currentTime = 0.05;
    } catch {}
    await new Promise((resolve) => {
      video.onseeked = resolve;
      setTimeout(resolve, 250);
    });
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const context = canvas.getContext("2d", { alpha: false });
    if (context) {
      context.filter = FILTER;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/webp", 0.82);
  }

  function prepareSave(capture) {
    state.pending = capture;
    const image = byId("lifeCaptureSaveImage");
    const video = byId("lifeCaptureSaveVideo");
    const input = byId("lifeCaptureTitleInput");
    setSaveStatus("");
    if (input) {
      input.value = safeText(capture.title);
      input.placeholder = defaultTitle(capture.kind, capture.createdAt);
    }
    if (capture.kind === "photo") {
      if (image) {
        image.hidden = false;
        image.src = capture.previewDataUrl;
      }
      if (video) {
        video.hidden = true;
        try { video.pause(); } catch {}
        video.removeAttribute("src");
        video.load();
      }
    } else {
      if (image) image.hidden = true;
      if (video) {
        video.hidden = false;
        video.poster = capture.previewDataUrl;
        video.src = URL.createObjectURL(capture.mediaBlob);
        video.load();
        video.play().catch(() => {});
      }
    }
    hide("lifeCaptureOverlay");
    show("lifeCaptureSaveOverlay");
    setTimeout(() => input?.focus(), 40);
  }

  async function capturePhoto() {
    setStatus("Capturando foto...");
    const mediaBlob = await canvasBlob();
    const previewDataUrl = await blobToDataUrl(mediaBlob);
    stopPreview();
    prepareSave({
      id: `life-${Date.now()}`,
      kind: "photo",
      createdAt: new Date().toISOString(),
      mimeType: "image/webp",
      mediaBlob,
      previewDataUrl,
      noteText: ""
    });
  }

  async function toggleVideoRecording() {
    const trigger = byId("lifeCaptureTriggerButton");
    if (!state.recording) {
      const canvas = byId("lifeCaptureCanvas");
      const stream = canvas.captureStream(30);
      const audioTrack = state.stream?.getAudioTracks?.()[0];
      if (audioTrack) {
        try {
          stream.addTrack(audioTrack.clone());
        } catch {}
      }
      state.chunks = [];
      state.recorder = new MediaRecorder(
        stream,
        {
          mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
            ? "video/webm;codecs=vp8,opus"
            : "video/webm"
        }
      );
      state.recording = true;
      state.recordingStartedAt = Date.now();
      setModeUi();
      setStatus("Gravando video...");
      state.recorder.ondataavailable = (event) => {
        if (event.data?.size) state.chunks.push(event.data);
      };
      state.recorder.onstop = async () => {
        state.recording = false;
        setModeUi();
        const mimeType = safeText(state.recorder?.mimeType || "video/webm");
        const mediaBlob = new Blob(state.chunks, { type: mimeType });
        const previewDataUrl = await videoPreviewFromBlob(mediaBlob);
        stopPreview();
        prepareSave({
          id: `life-${Date.now()}`,
          kind: "video",
          createdAt: new Date().toISOString(),
          mimeType,
          mediaBlob,
          previewDataUrl,
          durationMs: Date.now() - state.recordingStartedAt,
          noteText: ""
        });
      };
      state.recorder.start();
      trigger?.classList.add("is-recording");
      return;
    }
    trigger?.classList.remove("is-recording");
    state.recorder?.stop();
  }

  async function renderAlbumThumb() {
    const thumb = byId("lifeCaptureAlbumThumb");
    if (!thumb) return;
    const latest = state.captures[0];
    const previewUrl = buildCapturePreviewUrl(latest) || buildCaptureMediaUrl(latest);
    if (!previewUrl) {
      thumb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5h5l1.4 1.8H20a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2.5 4.5v6h11v-6Z" fill="currentColor"/></svg>';
      return;
    }
    thumb.innerHTML = `<img src="${previewUrl}" alt="Ultimo item" />`;
  }

  function pauseViewerVideos() {
    document.querySelectorAll("#lifeCaptureViewerTrack video").forEach((video) => {
      try { video.pause(); } catch {}
    });
  }

  function updateViewerTransform(withTransition = true) {
    const track = byId("lifeCaptureViewerTrack");
    if (!track) return;
    track.style.transition = withTransition ? "transform .32s cubic-bezier(.22,.61,.36,1)" : "none";
    const base = -(state.activeIndex * window.innerWidth);
    track.style.transform = `translate3d(${base + state.dragDeltaX}px,0,0)`;
    updateViewerMediaPlayback();
  }

  function renderMemoryEmptyDetails() {
    const tokenStatus = getAuthToken() ? "token encontrado" : "token ausente";
    const lines = [
      "Local: " + state.memoryDiagnostics.localCount,
      "Postgres/R2: " + state.memoryDiagnostics.remoteCount,
      "Sessao: " + tokenStatus
    ];
    if (state.memoryDiagnostics.lastLoadError) lines.push("Busca remota: " + state.memoryDiagnostics.lastLoadError);
    if (state.memoryDiagnostics.lastUploadError) lines.push("Ultimo upload: " + state.memoryDiagnostics.lastUploadError);
    if (state.memoryDiagnostics.lastUploadAt) lines.push("Ultimo envio: " + formatDate(state.memoryDiagnostics.lastUploadAt));
    return lines;
  }

  function renderViewer() {
    const track = byId("lifeCaptureViewerTrack");
    if (!track) return;
    track.replaceChildren();
    if (!state.captures.length) {
      const empty = document.createElement("div");
      empty.className = "life-capture-viewer-slide";
      const panel = document.createElement("div");
      panel.className = "life-capture-empty";
      const title = document.createElement("strong");
      title.textContent = "Sua memoria ainda esta vazia.";
      panel.appendChild(title);
      renderMemoryEmptyDetails().forEach((line) => {
        const detail = document.createElement("small");
        detail.textContent = line;
        panel.appendChild(detail);
      });
      empty.appendChild(panel);
      track.appendChild(empty);
      updateViewerTransform();
      return;
    }
    state.captures.forEach((capture) => {
      const slide = document.createElement("article");
      slide.className = "life-capture-viewer-slide";
      slide.dataset.captureId = capture.id;

      const media = document.createElement("div");
      media.className = "life-capture-viewer-media";

      const uploaded = Boolean(buildCaptureMediaUrl(capture));
      const upload = document.createElement("button");
      upload.className = "life-capture-viewer-upload" + (uploaded ? " is-uploaded" : "");
      upload.type = "button";
      upload.dataset.captureUpload = capture.id;
      upload.ariaLabel = uploaded ? "Memoria salva no R2" : "Salvar memoria no R2";
      upload.title = upload.ariaLabel;
      upload.innerHTML = uploaded
        ? '<svg viewBox="0 0 24 24"><path d="M20 17.5A4.5 4.5 0 0 0 15.5 13H15a6 6 0 1 0-11.3 3.2A3.5 3.5 0 0 0 5.5 23H19a3 3 0 0 0 1-5.8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 17 2 2 4-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M20 17.5A4.5 4.5 0 0 0 15.5 13H15a6 6 0 1 0-11.3 3.2A3.5 3.5 0 0 0 5.5 23H19a3 3 0 0 0 1-5.8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 18V9m0 0-3 3m3-3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      media.appendChild(upload);

      if (capture.noteText) {
        const badge = document.createElement("button");
        badge.className = "life-capture-viewer-badge";
        badge.type = "button";
        badge.dataset.captureNote = capture.id;
        badge.ariaLabel = "Abrir nota";
        badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
        media.appendChild(badge);
      }

      const share = document.createElement("button");
      share.className = "life-capture-viewer-share";
      share.type = "button";
      share.dataset.captureShare = capture.id;
      share.ariaLabel = "Compartilhar no chat";
      share.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 8a3 3 0 1 0-2.8-4H13a3 3 0 0 0 .2 1.1L7.9 8.2a3 3 0 1 0 0 7.6l5.3 3.1A3 3 0 1 0 14 17a2.9 2.9 0 0 0-.2-1l-5.4-3.2a2.9 2.9 0 0 0 0-1.6l5.4-3.2A3 3 0 0 0 16 8Z" fill="currentColor"/></svg>';
      media.appendChild(share);

      if (capture.kind === "video") {
        const video = document.createElement("video");
        video.dataset.captureVideo = capture.id;
        video.dataset.captureKind = "video";
        video.poster = buildCapturePreviewUrl(capture);
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.controls = false;
        video.disablePictureInPicture = true;
        const mediaUrl = buildCaptureMediaUrl(capture);
        video.src = mediaUrl || URL.createObjectURL(capture.mediaBlob);
        video.addEventListener("loadeddata", () => {
          try {
            video.currentTime = 0.05;
            video.pause();
          } catch {}
        }, { once: true });
        video.addEventListener("click", () => openFocus(capture.id));
        media.appendChild(video);
      } else {
        const image = document.createElement("img");
        image.src = buildCapturePreviewUrl(capture) || buildCaptureMediaUrl(capture);
        image.alt = safeText(capture.title || defaultTitle(capture.kind, capture.createdAt));
        image.addEventListener("click", () => openFocus(capture.id));
        media.appendChild(image);
      }

      slide.appendChild(media);
      track.appendChild(slide);
    });
    updateViewerTransform();
  }

  function updateViewerMediaPlayback() {
    pauseViewerVideos();
  }

  function openViewer() {
    stopPreview();
    hide("lifeCaptureOverlay");
    show("lifeCaptureViewerOverlay");
    renderViewer();
    updateViewerTransform();
  }

  function closeViewer() {
    pauseViewerVideos();
    hide("lifeCaptureViewerOverlay");
    show("lifeCaptureOverlay");
    startPreview().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Falha ao reabrir a camera.");
    });
  }

  function findCaptureById(id) {
    return state.captures.find((capture) => String(capture.id) === String(id)) || null;
  }

  function openFocus(captureId) {
    const capture = findCaptureById(captureId) || getActiveCapture();
    const host = byId("lifeCaptureFocusMedia");
    if (!(capture && host)) return;
    host.replaceChildren();
    if (capture.kind === "video") {
      const video = document.createElement("video");
      video.poster = buildCapturePreviewUrl(capture);
      video.src = buildCaptureMediaUrl(capture) || URL.createObjectURL(capture.mediaBlob);
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      host.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = buildCapturePreviewUrl(capture);
      image.alt = safeText(capture.title || "Memoria");
      host.appendChild(image);
    }
    show("lifeCaptureFocusOverlay");
  }

  function openSharedFocus(payload) {
    const host = byId("lifeCaptureFocusMedia");
    if (!host) return;
    host.replaceChildren();
    if (safeText(payload?.kind) === "video" && safeText(payload?.mediaUrl)) {
      const video = document.createElement("video");
      video.poster = safeText(payload?.previewUrl || payload?.previewDataUrl);
      video.src = safeText(payload?.mediaUrl);
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      host.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = safeText(payload?.previewUrl || payload?.previewDataUrl);
      image.alt = safeText(payload?.title || "Midia compartilhada");
      host.appendChild(image);
    }
    show("lifeCaptureFocusOverlay");
  }

  function closeFocus() {
    const host = byId("lifeCaptureFocusMedia");
    host?.replaceChildren();
    hide("lifeCaptureFocusOverlay");
  }

  function openNote(captureId) {
    const capture = findCaptureById(captureId) || getActiveCapture();
    if (!capture) return;
    state.noteCaptureId = capture.id;
    const input = byId("lifeCaptureNoteInput");
    if (input) input.value = safeText(capture.noteText || "");
    setNoteStatus("");
    show("lifeCaptureNoteOverlay");
    setTimeout(() => input?.focus(), 40);
  }

  function closeNote() {
    stopNoteMic();
    hide("lifeCaptureNoteOverlay");
  }

  async function persistCapturePatch(captureId, patch) {
    const capture = findCaptureById(captureId);
    if (!capture) return null;
    const updated = { ...capture, ...patch };
    await saveCapture(updated);
    await refreshCaptures();
    return updated;
  }

  async function saveNote() {
    const capture = findCaptureById(state.noteCaptureId) || getActiveCapture();
    if (!capture) return;
    const input = byId("lifeCaptureNoteInput");
    const nextNote = safeText(input?.value).trim();
    setNoteStatus("Salvando nota...");
    await persistCapturePatch(capture.id, { noteText: nextNote });
    try {
      const serverCapture = await patchServerCapture(capture.id, { noteText: nextNote });
      if (serverCapture) {
        await saveCapture({ ...(findCaptureById(capture.id) || capture), ...serverCapture });
        await refreshCaptures();
      }
    } catch {}
    setNoteStatus("Nota salva.");
    closeNote();
  }

  function encodeUtf8Base64(text) {
    const bytes = new TextEncoder().encode(safeText(text));
    let binary = "";
    bytes.forEach((value) => { binary += String.fromCharCode(value); });
    return window.btoa(binary);
  }

  function buildSharePayload(capture) {
    return {
      kind: capture.kind,
      title: safeText(capture.title || defaultTitle(capture.kind, capture.createdAt)),
      previewDataUrl: safeText(capture.previewDataUrl),
      previewUrl: buildCapturePreviewUrl(capture),
      mediaUrl: buildCaptureMediaUrl(capture),
      dateLabel: formatDate(capture.createdAt),
      noteText: safeText(capture.noteText || ""),
      sizeBytes: Number(capture.sizeBytes || capture.mediaBlob?.size || 0),
      durationMs: Number(capture.durationMs || 0)
    };
  }

  function buildShareMessage(capture) {
    return `${MEDIA_PREFIX}${encodeUtf8Base64(JSON.stringify(buildSharePayload(capture)))}${MEDIA_SUFFIX}`;
  }

  async function loadShareContacts() {
    const [friendsResult, tutorsResult] = await Promise.allSettled([
      fetch(getApiUrl("/api/200/friends?scope=today"), { credentials: "same-origin", headers: withAuthHeaders() })
        .then((response) => readJsonResponse(response, "Falha ao carregar amigos (/api/200/friends).")),
      fetch(getApiUrl("/api/200/tutors"), { credentials: "same-origin", headers: withAuthHeaders() })
        .then((response) => readJsonResponse(response, "Falha ao carregar chats (/api/200/tutors)."))
    ]);
    const warnings = [];
    if (friendsResult.status === "rejected") warnings.push("Amigos: " + (friendsResult.reason instanceof Error ? friendsResult.reason.message : "falha ao consultar."));
    if (tutorsResult.status === "rejected") warnings.push("Chats: " + (tutorsResult.reason instanceof Error ? tutorsResult.reason.message : "falha ao consultar."));
    if (friendsResult.status === "rejected" && tutorsResult.status === "rejected") {
      throw new Error(warnings.join(" | ") || "Falha ao carregar amigos e chats.");
    }
    const friendsPayload = friendsResult.status === "fulfilled" ? friendsResult.value : {};
    const tutorsPayload = tutorsResult.status === "fulfilled" ? tutorsResult.value : {};
    const tutors = Array.isArray(tutorsPayload?.tutors) ? tutorsPayload.tutors : [];
    const tutorByUserId = new Map(tutors.map((item) => [
      String(item?.contactUserId || item?.userId || item?.id || "").trim(),
      item
    ]).filter(([id]) => id));
    const mergedFriends = new Map();
    const pushFriend = (friend) => {
      const friendId = String(friend?.userId || friend?.contactUserId || friend?.id || "").trim();
      if (!friendId) return;
      const tutor = tutorByUserId.get(friendId);
      mergedFriends.set(friendId, { ...(mergedFriends.get(friendId) || {}), ...friend, userId: friendId, tutor });
    };
    (Array.isArray(friendsPayload?.friends) ? friendsPayload.friends : []).forEach(pushFriend);
    (Array.isArray(tutorsPayload?.friends) ? tutorsPayload.friends : []).forEach(pushFriend);
    tutors.forEach((tutor) => pushFriend({
      ...tutor,
      userId: String(tutor?.contactUserId || tutor?.userId || tutor?.id || "").trim()
    }));
    return { tutors, friends: [...mergedFriends.values()], warnings };
  }

  async function ensureTutor(friend) {
    const friendId = String(friend?.userId || friend?.contactUserId || friend?.id || "").trim();
    if (!friendId) throw new Error("Amigo invalido.");
    if (friend?.tutor) return friend.tutor;
    const response = await fetch(getApiUrl("/api/200/tutors"), {
      method: "POST",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({ tutorUserId: friendId })
    });
    const payload = await readJsonResponse(response, "Falha ao preparar contato no chat (/api/200/tutors).");
    const tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
    return tutors.find((item) => String(item?.contactUserId || item?.userId || item?.id || "").trim() === friendId) || { contactUserId: friendId };
  }

  async function shareToMarin(capture) {
    const ready = await ensureCaptureUploaded(capture);
    const response = await fetch(getApiUrl("/api/200/marin/messages"), {
      method: "POST",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),
        personaKey: "marin",
        content: buildShareMessage(ready || capture)
      })
    });
    await readJsonResponse(response, "Falha ao enviar para Marin (/api/200/marin/messages).");
  }

  async function shareToTutor(contactId, capture) {
    const ready = await ensureCaptureUploaded(capture);
    const response = await fetch(getApiUrl(`/api/200/tutors/${encodeURIComponent(contactId)}/messages`), {
      method: "POST",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(ready || capture) })
    });
    await readJsonResponse(response, "Falha ao enviar mensagem para amigo (/api/200/tutors/:id/messages).");
  }

  async function openShare(captureId) {
    const capture = findCaptureById(captureId) || getActiveCapture();
    if (!capture) return;
    state.shareCaptureId = capture.id;
    const list = byId("lifeCaptureShareList");
    if (!list) return;
    list.replaceChildren();
    setShareStatus("Carregando contatos...");
    show("lifeCaptureShareOverlay");

    try {
      const directory = await loadShareContacts();
      const shareWarnings = Array.isArray(directory.warnings) ? directory.warnings.filter(Boolean) : [];
      const entries = directory.friends.map((friend) => ({
        type: "friend",
        friend,
        title: safeText(friend.displayName || friend.name || friend.username || "Amigo"),
        subtitle: safeText(friend.username ? `@${friend.username}` : "Enviar no chat")
      }));

      if (!entries.length) {
        setShareStatus((shareWarnings.length ? shareWarnings.join(" | ") + " | " : "") + "Nenhum amigo disponivel ainda.");
      } else if (shareWarnings.length) {
        setShareStatus(shareWarnings.join(" | "));
      }

      entries.forEach((entry) => {
        const button = document.createElement("button");
        button.className = "life-capture-share-card";
        button.type = "button";
        button.innerHTML = `
          <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5C20 16 16.42 14 12 14Z" fill="currentColor"/></svg>
          <span><strong>${entry.title}</strong><small>${entry.subtitle}</small></span>
        `;
        button.addEventListener("click", async () => {
          try {
            setShareStatus("Preparando contato no chat...");
            const tutor = await ensureTutor(entry.friend);
            const contactUserId = safeText(tutor?.contactUserId || entry.friend?.userId || entry.friend?.id);
            if (!contactUserId) throw new Error("Nao foi possivel preparar esse contato.");
            setShareStatus("Subindo/confirmando midia no R2...");
            await ensureCaptureUploaded(capture);
            setShareStatus("Enviando mensagem para amigo...");
            await shareToTutor(contactUserId, capture);
            setShareStatus("Mensagem enviada.");
          } catch (error) {
            setShareStatus("Compartilhar amigo: " + (error instanceof Error ? error.message : "falha inesperada."));
          }
        });
        list.appendChild(button);
      });

      const marinButton = document.createElement("button");
      marinButton.className = "life-capture-share-card";
      marinButton.type = "button";
      marinButton.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M4 5h16v10H8l-4 4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        <span><strong>Marin IA</strong><small>Enviar para o chat da IA</small></span>
      `;
      marinButton.addEventListener("click", async () => {
        try {
          setShareStatus("Subindo/confirmando midia no R2...");
          await ensureCaptureUploaded(capture);
          setShareStatus("Enviando mensagem para Marin...");
          await shareToMarin(capture);
          setShareStatus("Enviado para Marin.");
        } catch (error) {
          setShareStatus("Compartilhar Marin: " + (error instanceof Error ? error.message : "falha inesperada."));
        }
      });
      list.appendChild(marinButton);

      if (!shareWarnings.length && entries.length) setShareStatus(capture.kind === "video" ? "Videos entram no chat como card com capa." : "Escolha um amigo para enviar no chat.");
    } catch (error) {
      setShareStatus("Carregar compartilhamento: " + (error instanceof Error ? error.message : "falha ao carregar contatos."));
    }
  }

  function stopTitleMic() {
    if (state.titleTimer) clearInterval(state.titleTimer);
    state.titleTimer = 0;
    if (state.titleRecorder && state.titleRecorder.state !== "inactive") state.titleRecorder.stop();
    state.titleRecorder = null;
    if (state.titleStream) state.titleStream.getTracks().forEach((track) => track.stop());
    state.titleStream = null;
    if (state.titleAudioContext) {
      try { state.titleAudioContext.close(); } catch {}
    }
    state.titleAudioContext = null;
    state.titleAnalyser = null;
    byId("lifeCaptureSaveMicButton")?.classList.remove("is-recording");
  }

  async function transcribeBlob(blob, fileName) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    bytes.forEach((value) => { binary += String.fromCharCode(value); });
    const response = await fetch(getApiUrl("/api/audio/transcribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        audioBase64: window.btoa(binary),
        mimeType: safeText(blob.type || "audio/webm"),
        fileName
      })
    });
    const payload = await readJsonResponse(response, "Nao foi possivel transcrever o audio. Verifique login/token da sessao.");
    return safeText(payload?.text || "").trim();
  }

  async function startTitleMic() {
    const input = byId("lifeCaptureTitleInput");
    try {
      state.titleStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.titleAudioContext = new AudioContext();
      const source = state.titleAudioContext.createMediaStreamSource(state.titleStream);
      state.titleAnalyser = state.titleAudioContext.createAnalyser();
      state.titleAnalyser.fftSize = 2048;
      source.connect(state.titleAnalyser);
      const chunks = [];
      state.titleRecorder = new MediaRecorder(state.titleStream, { mimeType: "audio/webm" });
      state.titleRecorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      state.titleRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (!blob.size) {
          stopTitleMic();
          return;
        }
        setSaveStatus("Transcrevendo nome...");
        try {
          const text = await transcribeBlob(blob, "life-capture-title.webm");
          if (input) input.value = text.slice(0, 80);
          setSaveStatus(text ? "Nome preenchido." : "Nada captado.");
        } catch (error) {
          setSaveStatus(error instanceof Error ? error.message : "Falha ao transcrever.");
        }
        stopTitleMic();
      };
      state.titleRecorder.start();
      byId("lifeCaptureSaveMicButton")?.classList.add("is-recording");
      setSaveStatus("Gravando nome...");
      state.titleLastSpeechAt = Date.now();
      state.titleTimer = window.setInterval(() => {
        if (!state.titleAnalyser) return;
        const buffer = new Uint8Array(state.titleAnalyser.fftSize);
        state.titleAnalyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          const value = (buffer[index] - 128) / 128;
          sum += value * value;
        }
        if (Math.sqrt(sum / buffer.length) > 0.02) state.titleLastSpeechAt = Date.now();
        if (Date.now() - state.titleLastSpeechAt > 1800) state.titleRecorder?.stop();
      }, 120);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Falha no microfone.");
      stopTitleMic();
    }
  }

  function stopNoteMic() {
    if (state.noteTimer) clearInterval(state.noteTimer);
    state.noteTimer = 0;
    if (state.noteRecorder && state.noteRecorder.state !== "inactive") state.noteRecorder.stop();
    state.noteRecorder = null;
    if (state.noteStream) state.noteStream.getTracks().forEach((track) => track.stop());
    state.noteStream = null;
    if (state.noteAudioContext) {
      try { state.noteAudioContext.close(); } catch {}
    }
    state.noteAudioContext = null;
    state.noteAnalyser = null;
    byId("lifeCaptureNoteMicButton")?.classList.remove("is-recording");
  }

  async function startNoteMic() {
    const input = byId("lifeCaptureNoteInput");
    try {
      state.noteStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.noteAudioContext = new AudioContext();
      const source = state.noteAudioContext.createMediaStreamSource(state.noteStream);
      state.noteAnalyser = state.noteAudioContext.createAnalyser();
      state.noteAnalyser.fftSize = 2048;
      source.connect(state.noteAnalyser);
      const chunks = [];
      state.noteRecorder = new MediaRecorder(state.noteStream, { mimeType: "audio/webm" });
      state.noteRecorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      state.noteRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (!blob.size) {
          stopNoteMic();
          return;
        }
        setNoteStatus("Transcrevendo nota...");
        try {
          const text = await transcribeBlob(blob, "life-capture-note.webm");
          const prefix = safeText(input?.value).trim();
          const merged = [prefix, text].filter(Boolean).join(prefix && text ? "\n\n" : "");
          if (input) input.value = merged;
          setNoteStatus(text ? "Nota adicionada." : "Nada captado.");
        } catch (error) {
          setNoteStatus(error instanceof Error ? error.message : "Falha ao transcrever.");
        }
        stopNoteMic();
      };
      state.noteRecorder.start();
      byId("lifeCaptureNoteMicButton")?.classList.add("is-recording");
      setNoteStatus("Gravando nota...");
      state.noteLastSpeechAt = Date.now();
      state.noteTimer = window.setInterval(() => {
        if (!state.noteAnalyser) return;
        const buffer = new Uint8Array(state.noteAnalyser.fftSize);
        state.noteAnalyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          const value = (buffer[index] - 128) / 128;
          sum += value * value;
        }
        if (Math.sqrt(sum / buffer.length) > 0.02) state.noteLastSpeechAt = Date.now();
        if (Date.now() - state.noteLastSpeechAt > 1800) state.noteRecorder?.stop();
      }, 120);
    } catch (error) {
      setNoteStatus(error instanceof Error ? error.message : "Falha no microfone.");
      stopNoteMic();
    }
  }

  async function savePending() {
    const input = byId("lifeCaptureTitleInput");
    const capture = state.pending;
    if (!capture) return;
    setSaveStatus("Salvando...");
    const item = {
      ...capture,
      title: safeText(input?.value).trim() || defaultTitle(capture.kind, capture.createdAt),
      metadata: capture.metadata && typeof capture.metadata === 'object' ? capture.metadata : {}
    };
    await saveCapture(item);
    state.pending = null;
    setSaveStatus("Salvo.");
    hide("lifeCaptureSaveOverlay");
    await refreshCaptures();
    queueMicrotask(() => {
      ensureCaptureUploaded(item).catch(() => {});
    });
    show("lifeCaptureOverlay");
    await startPreview();
  }

  function bindSwipe() {
    const viewport = byId("lifeCaptureViewerViewport");
    if (!viewport || viewport.dataset.lifeBound === "true") return;
    viewport.dataset.lifeBound = "true";

    viewport.addEventListener("pointerdown", (event) => {
      if (!state.captures.length) return;
      state.dragging = true;
      state.dragStartX = event.clientX;
      state.dragDeltaX = 0;
      updateViewerTransform(false);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      state.dragDeltaX = event.clientX - state.dragStartX;
      updateViewerTransform(false);
    });

    const finishSwipe = () => {
      if (!state.dragging) return;
      const threshold = Math.max(56, window.innerWidth * 0.12);
      if (state.dragDeltaX <= -threshold) state.activeIndex = clamp(state.activeIndex + 1, 0, state.captures.length - 1);
      if (state.dragDeltaX >= threshold) state.activeIndex = clamp(state.activeIndex - 1, 0, state.captures.length - 1);
      state.dragging = false;
      state.dragDeltaX = 0;
      updateViewerTransform(true);
    };

    viewport.addEventListener("pointerup", finishSwipe);
    viewport.addEventListener("pointercancel", finishSwipe);
    viewport.addEventListener("pointerleave", finishSwipe);
  }

  async function openCapture() {
    inject();
    bindSwipe();
    setModeUi();
    show("lifeCaptureOverlay");
    await refreshCaptures();
    queuePendingUploads();
    try {
      await startPreview();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao abrir a camera.");
    }
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "lifeCaptureHomeButton") {
      void openCapture();
      return;
    }

    if (button.dataset.lifeClose === "capture") {
      stopPreview();
      hide("lifeCaptureOverlay");
      return;
    }

    if (button.dataset.lifeClose === "save") {
      state.pending = null;
      stopTitleMic();
      hide("lifeCaptureSaveOverlay");
      show("lifeCaptureOverlay");
      startPreview().catch(() => {});
      return;
    }

    if (button.dataset.lifeClose === "note") {
      closeNote();
      return;
    }

    if (button.dataset.lifeClose === "share") {
      hide("lifeCaptureShareOverlay");
      setShareStatus("");
      return;
    }

    if (button.id === "lifeCaptureModeButton") {
      if (state.recording) return;
      state.mode = state.mode === "photo" ? "video" : "photo";
      setModeUi();
      setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");
      return;
    }

    if (button.id === "lifeCaptureSwitchButton") {
      if (state.recording) return;
      state.facingMode = state.facingMode === "environment" ? "user" : "environment";
      setStatus(state.facingMode === "user" ? "Camera frontal ativa." : "Camera traseira ativa.");
      startPreview().catch((error) => {
        setStatus(error instanceof Error ? error.message : "Falha ao trocar camera.");
      });
      return;
    }

    if (button.id === "lifeCaptureTriggerButton") {
      try {
        if (state.mode === "video") await toggleVideoRecording();
        else await capturePhoto();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha na captura.");
      }
      return;
    }

    if (button.id === "lifeCaptureAlbumButton") {
      openViewer();
      return;
    }

    if (button.id === "lifeCaptureSaveMicButton") {
      if (state.titleRecorder) stopTitleMic();
      else void startTitleMic();
      return;
    }

    if (button.id === "lifeCaptureSaveButton") {
      void savePending().catch((error) => {
        setSaveStatus(error instanceof Error ? error.message : "Falha ao salvar.");
      });
      return;
    }

    if (button.id === "lifeCaptureViewerCloseButton") {
      closeViewer();
      return;
    }

    if (button.id === "lifeCaptureFullscreenButton") {
      const capture = getActiveCapture();
      if (capture) openFocus(capture.id);
      return;
    }

    if (button.id === "lifeCaptureFocusCloseButton") {
      closeFocus();
      return;
    }

    if (button.id === "lifeCaptureNoteButton") {
      const capture = getActiveCapture();
      if (capture) openNote(capture.id);
      return;
    }

    if (button.id === "lifeCaptureNoteMicButton") {
      if (state.noteRecorder) stopNoteMic();
      else void startNoteMic();
      return;
    }

    if (button.id === "lifeCaptureNoteSaveButton") {
      void saveNote().catch((error) => {
        setNoteStatus(error instanceof Error ? error.message : "Falha ao salvar a nota.");
      });
      return;
    }

    if (button.dataset.captureUpload) {
      void uploadCaptureNow(button.dataset.captureUpload);
      return;
    }

    if (button.dataset.captureNote) {
      openNote(button.dataset.captureNote);
      return;
    }

    if (button.dataset.captureShare) {
      void openShare(button.dataset.captureShare);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFocus();
      closeNote();
      hide("lifeCaptureShareOverlay");
      if (byId("lifeCaptureViewerOverlay")?.classList.contains("active")) {
        closeViewer();
      } else {
        stopPreview();
        hide("lifeCaptureSaveOverlay");
        hide("lifeCaptureOverlay");
      }
    }
    if (event.key === "ArrowRight" && byId("lifeCaptureViewerOverlay")?.classList.contains("active") && state.captures.length) {
      state.activeIndex = clamp(state.activeIndex + 1, 0, state.captures.length - 1);
      updateViewerTransform(true);
    }
    if (event.key === "ArrowLeft" && byId("lifeCaptureViewerOverlay")?.classList.contains("active") && state.captures.length) {
      state.activeIndex = clamp(state.activeIndex - 1, 0, state.captures.length - 1);
      updateViewerTransform(true);
    }
    if (event.key === "Enter" && document.activeElement === byId("lifeCaptureTitleInput")) {
      event.preventDefault();
      void savePending();
    }
  });

  window.addEventListener("project200:life-capture-open-shared", (event) => {
    openSharedFocus(event.detail);
  });

  inject();
  bindSwipe();
  setModeUi();
  void refreshCaptures();
})();
