(() => {
  "use strict";

  const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
  const DOUBLE_CLICK_WINDOW_MS = 1000;
  const ORDER_IDLE_MS = 3000;
  const LOCAL_INDEX_KEY = "midia-local-tracks-v1";
  const LOCAL_DIRECTORY = "midia-audios";
  const LOCAL_CACHE = "midia-audios-v1";

  const elements = {
    openUploadButton: document.getElementById("openUploadButton"),
    uploadPanel: document.getElementById("uploadPanel"),
    cancelUploadButton: document.getElementById("cancelUploadButton"),
    trackTitleInput: document.getElementById("trackTitleInput"),
    trackFileInput: document.getElementById("trackFileInput"),
    filePicker: document.getElementById("filePicker"),
    filePickerTitle: document.getElementById("filePickerTitle"),
    filePickerHint: document.getElementById("filePickerHint"),
    submitUploadButton: document.getElementById("submitUploadButton"),
    uploadProgress: document.getElementById("uploadProgress"),
    uploadProgressBar: document.getElementById("uploadProgressBar"),
    uploadStatus: document.getElementById("uploadStatus"),
    searchInput: document.getElementById("searchInput"),
    libraryStatus: document.getElementById("libraryStatus"),
    trackList: document.getElementById("trackList"),
    emptyState: document.getElementById("emptyState"),
    trackTemplate: document.getElementById("trackTemplate"),
    audioPlayer: document.getElementById("audioPlayer")
  };

  const state = {
    tracks: [],
    activeTrackId: "",
    lastCardClickAt: 0,
    lastCardTrackId: "",
    playbackRequestId: 0,
    orderSelectedTrackId: "",
    orderIdleTimer: 0,
    orderDirty: false,
    orderSaveRevision: 0,
    currentObjectUrl: "",
    savedTrackIds: loadSavedTrackIds(),
    uploading: false
  };

  function loadSavedTrackIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_INDEX_KEY) || "[]");
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function persistSavedTrackIds() {
    try {
      localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(Array.from(state.savedTrackIds)));
    } catch {
      // The audio itself never uses localStorage; this is only a tiny id index.
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "tamanho não informado";
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  function getTrackById(id) {
    return state.tracks.find((track) => track.id === id) || null;
  }

  function setUploadStatus(message, error = false) {
    elements.uploadStatus.textContent = message || "";
    elements.uploadStatus.classList.toggle("is-error", error);
  }

  function setUploadProgress(percent, visible = true) {
    elements.uploadProgress.hidden = !visible;
    elements.uploadProgressBar.style.width = `${Math.max(0, Math.min(100, Number(percent || 0)))}%`;
  }

  function openUploadPanel() {
    elements.uploadPanel.hidden = false;
    elements.uploadPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => elements.trackTitleInput.focus({ preventScroll: true }), 350);
  }

  function resetUploadForm(close = false) {
    if (state.uploading) return;
    elements.trackTitleInput.value = "";
    elements.trackFileInput.value = "";
    elements.filePickerTitle.textContent = "Escolher arquivo de áudio";
    elements.filePickerHint.textContent = "MP3, M4A, AAC, WAV, OGG ou FLAC · até 150 MB";
    elements.submitUploadButton.disabled = true;
    setUploadProgress(0, false);
    setUploadStatus("");
    if (close) elements.uploadPanel.hidden = true;
  }

  function selectFile(file) {
    if (!file) {
      resetUploadForm(false);
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = new Set(["mp3", "m4a", "aac", "wav", "ogg", "flac"]);
    if (!allowed.has(extension)) {
      setUploadStatus("Escolha um arquivo MP3, M4A, AAC, WAV, OGG ou FLAC.", true);
      elements.submitUploadButton.disabled = true;
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadStatus("Essa música ultrapassa o limite de 150 MB.", true);
      elements.submitUploadButton.disabled = true;
      return;
    }
    if (!elements.trackTitleInput.value.trim()) {
      elements.trackTitleInput.value = file.name.replace(/\.[^.]+$/, "");
    }
    elements.filePickerTitle.textContent = file.name;
    elements.filePickerHint.textContent = formatBytes(file.size);
    elements.submitUploadButton.disabled = false;
    setUploadStatus("Pronta para enviar.");
  }

  function updatePlayingVisuals() {
    elements.trackList.querySelectorAll(".track-card").forEach((card) => {
      const playing = card.dataset.trackId === state.activeTrackId && !elements.audioPlayer.paused;
      card.classList.toggle("is-playing", playing);
      card.setAttribute("aria-pressed", String(playing));
      const status = card.querySelector(".track-state");
      if (status) status.textContent = playing ? "Tocando agora · 2 cliques para pausar" : "Clique para ouvir";
    });
    updateOrderSelectionVisuals();
  }

  function updateSavedVisuals() {
    elements.trackList.querySelectorAll(".track-card").forEach((card) => {
      const saved = state.savedTrackIds.has(card.dataset.trackId);
      const button = card.querySelector(".local-download");
      const label = card.querySelector(".local-label");
      button?.classList.toggle("is-saved", saved);
      if (label) label.textContent = saved ? "Salva localmente" : "Baixar local";
      if (button) button.title = saved ? "Esta música já está salva neste navegador" : "Salvar no armazenamento deste navegador";
    });
  }
  function updateOrderSelectionVisuals() {
    elements.trackList.querySelectorAll(".track-card").forEach((card) => {
      const selected = card.dataset.trackId === state.orderSelectedTrackId;
      card.classList.toggle("is-order-selected", selected);
      if (selected) {
        card.setAttribute("aria-current", "true");
        const playing = card.dataset.trackId === state.activeTrackId && !elements.audioPlayer.paused;
        const status = card.querySelector(".track-state");
        if (status) status.textContent = playing
          ? "Tocando e selecionada · use ↑ e ↓ para mover"
          : "Selecionada · use ↑ e ↓ para mover";
      } else {
        card.removeAttribute("aria-current");
      }
    });
  }

  function clearOrderIdleTimer() {
    if (state.orderIdleTimer) {
      window.clearTimeout(state.orderIdleTimer);
      state.orderIdleTimer = 0;
    }
  }

  function armOrderFinalizeTimer() {
    clearOrderIdleTimer();
    if (!state.orderSelectedTrackId) return;
    state.orderIdleTimer = window.setTimeout(() => {
      void finalizeOrderSelection();
    }, ORDER_IDLE_MS);
  }

  function selectTrackForOrder(track, card) {
    if (state.orderSelectedTrackId === track.id) {
      void finalizeOrderSelection();
      return;
    }
    state.orderSelectedTrackId = track.id;
    updateOrderSelectionVisuals();
    card.focus({ preventScroll: true });
    elements.libraryStatus.textContent = `“${track.title}” selecionada. Use ↑ e ↓; a ordem fixa em 3 segundos.`;
    armOrderFinalizeTimer();
  }

  function moveSelectedTrack(direction) {
    const selectedId = state.orderSelectedTrackId;
    const currentIndex = state.tracks.findIndex((track) => track.id === selectedId);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= state.tracks.length) {
      const edge = targetIndex < 0 ? "primeira" : "última";
      elements.libraryStatus.textContent = `Essa música já é a ${edge} da lista.`;
      armOrderFinalizeTimer();
      return;
    }

    const [movedTrack] = state.tracks.splice(currentIndex, 1);
    state.tracks.splice(targetIndex, 0, movedTrack);
    state.orderDirty = true;
    renderTracks();
    window.requestAnimationFrame(() => {
      const selectedCard = elements.trackList.querySelector(`[data-track-id="${CSS.escape(selectedId)}"]`);
      selectedCard?.focus({ preventScroll: true });
    });
    elements.libraryStatus.textContent = `“${movedTrack.title}” movida para a posição ${targetIndex + 1}. Fixa em 3 segundos.`;
    armOrderFinalizeTimer();
  }

  async function finalizeOrderSelection({ silent = false } = {}) {
    const selectedTrack = getTrackById(state.orderSelectedTrackId);
    clearOrderIdleTimer();
    state.orderSelectedTrackId = "";
    updatePlayingVisuals();

    if (!state.orderDirty) {
      if (!silent && selectedTrack) elements.libraryStatus.textContent = "Ordem mantida.";
      return;
    }

    state.orderDirty = false;
    const revision = ++state.orderSaveRevision;
    const trackIds = state.tracks.map((track) => track.id);
    if (!silent) elements.libraryStatus.textContent = "Salvando a ordem para todo mundo…";

    try {
      const response = await fetch("/api/midia/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds }),
        keepalive: silent
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Falha ao salvar a ordem.");
      if (revision !== state.orderSaveRevision) return;
      if (Array.isArray(payload.tracks) && !state.orderDirty && !state.orderSelectedTrackId) {
        state.tracks = payload.tracks;
        renderTracks();
      }
      if (!silent) elements.libraryStatus.textContent = "Ordem salva para todo mundo.";
    } catch {
      if (revision !== state.orderSaveRevision) return;
      state.orderDirty = true;
      if (!silent) elements.libraryStatus.textContent = "Não foi possível salvar a ordem. Tente mover novamente.";
    }
  }


  function renderTracks() {
    const term = elements.searchInput.value.trim().toLocaleLowerCase("pt-BR");
    const visibleTracks = state.tracks.filter((track) => track.title.toLocaleLowerCase("pt-BR").includes(term));
    elements.trackList.replaceChildren();

    visibleTracks.forEach((track) => {
      const fragment = elements.trackTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".track-card");
      card.dataset.trackId = track.id;
      card.setAttribute("aria-label", `${track.title}. Clique para ouvir; dois cliques para pausar; clique direito para mudar a ordem.`);
      fragment.querySelector(".track-number").textContent = String(state.tracks.indexOf(track) + 1).padStart(2, "0");
      fragment.querySelector(".track-title").textContent = track.title;
      fragment.querySelector(".track-size").textContent = formatBytes(track.sizeBytes);

      const pcDownload = fragment.querySelector(".pc-download");
      pcDownload.href = track.downloadUrl;
      pcDownload.setAttribute("download", `${track.title}.${track.extension || "mp3"}`);
      pcDownload.setAttribute("aria-label", `Baixar ${track.title} para o PC`);

      const localDownload = fragment.querySelector(".local-download");
      localDownload.setAttribute("aria-label", `Baixar ${track.title} localmente neste navegador`);
      localDownload.addEventListener("click", () => saveTrackLocally(track, localDownload));

      card.addEventListener("click", (event) => activateTrackCard(track, event));
      card.addEventListener("contextmenu", (event) => {
        if (event.target.closest("[data-action]")) return;
        event.preventDefault();
        selectTrackForOrder(track, card);
      });
      card.addEventListener("dblclick", (event) => event.preventDefault());
      card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("[data-action]")) {
          event.preventDefault();
          activateTrackCard(track, event);
        }
      });
      elements.trackList.appendChild(fragment);
    });

    const noResults = visibleTracks.length === 0;
    elements.emptyState.hidden = !noResults;
    elements.libraryStatus.textContent = term
      ? `${visibleTracks.length} resultado${visibleTracks.length === 1 ? "" : "s"} para “${elements.searchInput.value.trim()}”`
      : `${state.tracks.length} música${state.tracks.length === 1 ? "" : "s"} disponível${state.tracks.length === 1 ? "" : "is"}`;
    updatePlayingVisuals();
    updateSavedVisuals();
  }

  async function getLocalTrackFile(track) {
    if (!state.savedTrackIds.has(track.id)) return null;

    if (navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle(LOCAL_DIRECTORY);
        const handle = await directory.getFileHandle(`${track.id}.${track.extension || "mp3"}`);
        return await handle.getFile();
      } catch {
        // Try the Cache Storage fallback below.
      }
    }

    if ("caches" in window) {
      try {
        const cache = await caches.open(LOCAL_CACHE);
        const response = await cache.match(track.streamUrl);
        if (response) return await response.blob();
      } catch {
        // The saved id is cleaned up below.
      }
    }

    state.savedTrackIds.delete(track.id);
    persistSavedTrackIds();
    updateSavedVisuals();
    return null;
  }

  async function resolveTrackSource(track) {
    const localFile = await getLocalTrackFile(track);
    if (localFile) {
      const objectUrl = URL.createObjectURL(localFile);
      return { url: objectUrl, objectUrl };
    }
    return { url: track.streamUrl, objectUrl: "" };
  }

  function releaseCurrentObjectUrl() {
    if (state.currentObjectUrl) {
      URL.revokeObjectURL(state.currentObjectUrl);
      state.currentObjectUrl = "";
    }
  }

  async function playTrack(track) {
    const requestId = ++state.playbackRequestId;
    try {
      if (elements.audioPlayer.dataset.trackId !== track.id) {
        elements.audioPlayer.pause();
        releaseCurrentObjectUrl();
        const source = await resolveTrackSource(track);
        if (requestId !== state.playbackRequestId) {
          if (source.objectUrl) URL.revokeObjectURL(source.objectUrl);
          return;
        }
        state.currentObjectUrl = source.objectUrl;
        elements.audioPlayer.src = source.url;
        elements.audioPlayer.dataset.trackId = track.id;
        elements.audioPlayer.load();
      }
      if (requestId !== state.playbackRequestId) return;
      state.activeTrackId = track.id;
      await elements.audioPlayer.play();
      updatePlayingVisuals();
    } catch {
      if (requestId !== state.playbackRequestId) return;
      state.activeTrackId = "";
      updatePlayingVisuals();
      elements.libraryStatus.textContent = "Não foi possível tocar essa música agora.";
    }
  }

  function pauseCurrentTrack() {
    elements.audioPlayer.pause();
    state.playbackRequestId += 1;
    state.activeTrackId = "";
    updatePlayingVisuals();
  }

  function activateTrackCard(track, event) {
    if (event.target.closest("[data-action]")) return;
    const now = Date.now();
    const sameTrackIsPlaying = state.activeTrackId === track.id && !elements.audioPlayer.paused;

    const isDoubleClick = state.lastCardTrackId === track.id
      && now - state.lastCardClickAt < DOUBLE_CLICK_WINDOW_MS;
    state.lastCardTrackId = track.id;

    if (isDoubleClick) {
      state.lastCardClickAt = now;
      pauseCurrentTrack();
      return;
    }
    if (sameTrackIsPlaying) {
      if (now - state.lastCardClickAt < DOUBLE_CLICK_WINDOW_MS) pauseCurrentTrack();
      state.lastCardClickAt = now;
      return;
    }

    state.lastCardClickAt = now;
    void playTrack(track);
  }

  function updateLocalButtonProgress(button, loaded, total) {
    const label = button.querySelector(".local-label");
    if (!label) return;
    if (total > 0) {
      label.textContent = `Salvando ${Math.min(100, Math.round((loaded / total) * 100))}%`;
    } else {
      label.textContent = `Salvando ${formatBytes(loaded)}`;
    }
  }

  async function writeResponseToOpfs(track, response, button) {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(LOCAL_DIRECTORY, { create: true });
    const handle = await directory.getFileHandle(`${track.id}.${track.extension || "mp3"}`, { create: true });
    const writable = await handle.createWritable();
    const reader = response.body.getReader();
    const total = Number(response.headers.get("content-length") || track.sizeBytes || 0);
    let loaded = 0;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        await writable.write(value);
        loaded += value.byteLength;
        updateLocalButtonProgress(button, loaded, total);
      }
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => {});
      throw error;
    }
  }

  async function saveTrackLocally(track, button) {
    if (button.disabled || state.savedTrackIds.has(track.id)) return;
    button.disabled = true;
    const label = button.querySelector(".local-label");
    if (label) label.textContent = "Preparando…";

    try {
      await navigator.storage?.persist?.().catch(() => false);
      let saved = false;

      if (navigator.storage?.getDirectory) {
        const response = await fetch(track.streamUrl);
        if (!response.ok || !response.body) throw new Error("Falha no download");
        await writeResponseToOpfs(track, response, button);
        saved = true;
      } else if ("caches" in window) {
        const response = await fetch(track.streamUrl);
        if (!response.ok) throw new Error("Falha no download");
        const cache = await caches.open(LOCAL_CACHE);
        await cache.put(track.streamUrl, response);
        saved = true;
      }

      if (!saved) throw new Error("Armazenamento local indisponível");
      state.savedTrackIds.add(track.id);
      persistSavedTrackIds();
      updateSavedVisuals();
      elements.libraryStatus.textContent = `“${track.title}” foi salva localmente neste navegador.`;
    } catch {
      if (label) label.textContent = "Tentar baixar local";
      elements.libraryStatus.textContent = "O navegador não liberou espaço local. Use “Baixar para PC” nesta música.";
    } finally {
      button.disabled = false;
    }
  }

  async function loadTracks() {
    elements.libraryStatus.textContent = "Carregando músicas…";
    try {
      const response = await fetch("/api/midia/tracks", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Falha ao carregar");
      state.tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
      renderTracks();
    } catch {
      elements.libraryStatus.textContent = "Não foi possível carregar as músicas agora.";
      elements.emptyState.hidden = false;
    }
  }

  function uploadSelectedTrack() {
    const file = elements.trackFileInput.files?.[0];
    const title = elements.trackTitleInput.value.trim();
    if (!file || state.uploading) return;
    if (!title) {
      setUploadStatus("Digite o nome da música.", true);
      elements.trackTitleInput.focus();
      return;
    }

    state.uploading = true;
    elements.submitUploadButton.disabled = true;
    elements.cancelUploadButton.disabled = true;
    setUploadStatus("Enviando ao R2…");
    setUploadProgress(0, true);

    const request = new XMLHttpRequest();
    request.open("PUT", "/api/midia/tracks");
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    request.setRequestHeader("X-Track-Title", encodeURIComponent(title));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100, true);
    });
    request.addEventListener("load", () => {
      let payload = {};
      try {
        payload = JSON.parse(request.responseText || "{}");
      } catch {
        payload = {};
      }
      if (request.status < 200 || request.status >= 300) {
        setUploadStatus(payload.error || "Não foi possível enviar essa música.", true);
        return;
      }
      setUploadProgress(100, true);
      setUploadStatus("Música publicada para todo mundo.");
      if (payload.track) state.tracks.push(payload.track);
      renderTracks();
      window.setTimeout(() => resetUploadForm(true), 900);
    });
    request.addEventListener("error", () => setUploadStatus("A conexão caiu durante o envio. Tente de novo.", true));
    request.addEventListener("loadend", () => {
      state.uploading = false;
      elements.cancelUploadButton.disabled = false;
      elements.submitUploadButton.disabled = !elements.trackFileInput.files?.[0];
    });
    request.send(file);
  }

  elements.openUploadButton.addEventListener("click", openUploadPanel);
  elements.cancelUploadButton.addEventListener("click", () => resetUploadForm(true));
  elements.submitUploadButton.addEventListener("click", uploadSelectedTrack);
  elements.trackFileInput.addEventListener("change", () => selectFile(elements.trackFileInput.files?.[0]));
  elements.searchInput.addEventListener("input", renderTracks);
  document.addEventListener("keydown", (event) => {
    if (!state.orderSelectedTrackId) return;
    const tagName = String(event.target?.tagName || "").toUpperCase();
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelectedTrack(event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      void finalizeOrderSelection();
    }
  });
  elements.filePicker.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.filePicker.classList.add("is-dragging");
  });
  elements.filePicker.addEventListener("dragleave", () => elements.filePicker.classList.remove("is-dragging"));
  elements.filePicker.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.filePicker.classList.remove("is-dragging");
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    elements.trackFileInput.files = transfer.files;
    selectFile(file);
  });
  elements.audioPlayer.addEventListener("play", () => {
    state.activeTrackId = elements.audioPlayer.dataset.trackId || "";
    updatePlayingVisuals();
  });
  elements.audioPlayer.addEventListener("pause", () => {
    state.activeTrackId = "";
    updatePlayingVisuals();
  });
  elements.audioPlayer.addEventListener("ended", () => {
    state.activeTrackId = "";
    elements.audioPlayer.currentTime = 0;
    updatePlayingVisuals();
  });
  elements.audioPlayer.addEventListener("timeupdate", () => {
    if (!state.activeTrackId || !Number.isFinite(elements.audioPlayer.duration)) return;
    const card = elements.trackList.querySelector(`[data-track-id="${CSS.escape(state.activeTrackId)}"]`);
    const bar = card?.querySelector(".track-progress span");
    if (bar) bar.style.width = `${(elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100}%`;
  });
  window.addEventListener("beforeunload", releaseCurrentObjectUrl);
  window.addEventListener("pagehide", () => void finalizeOrderSelection({ silent: true }));

  void loadTracks();
})();
