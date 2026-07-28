import fs from "node:fs";

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`missing: ${label}`);
  return source.replace(search, replacement);
}

const lifePath = 'C:/Users/Lucas/Desktop/Turma do Printy Database/public/200/life-capture.js';
let life = fs.readFileSync(lifePath, 'utf8');

life = replaceOrThrow(life, '    noteLastSpeechAt: 0\r\n  };', '    noteLastSpeechAt: 0,\r\n    uploads: new Map()\r\n  };', 'uploads state');

life = replaceOrThrow(life,
`          <footer class="life-capture-footer">
            <button class="life-capture-icon-btn" id="lifeCaptureAlbumButton" type="button" aria-label="Abrir album">
              <span class="life-capture-thumb" id="lifeCaptureAlbumThumb">
                <svg viewBox="0 0 24 24"><path d="M4 5h5l1.4 1.8H20a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2.5 4.5v6h11v-6Z" fill="currentColor"/></svg>
              </span>
            </button>
            <button class="life-capture-trigger" id="lifeCaptureTriggerButton" type="button" aria-label="Capturar">
              <span class="life-capture-trigger-ring"></span>
              <span class="life-capture-trigger-core"></span>
            </button>
            <div class="life-capture-capture-tools">
              <button class="life-capture-mode-btn" id="lifeCaptureModeButton" type="button" aria-label="Trocar foto ou video"></button>
              <button class="life-capture-switch-btn" id="lifeCaptureSwitchButton" type="button" aria-label="Trocar camera">
                <svg viewBox="0 0 24 24"><path d="M16 4h2.5A3.5 3.5 0 0 1 22 7.5V10m-14 10H5.5A3.5 3.5 0 0 1 2 16.5V14m4 6 3-3-3-3m12-10-3 3 3 3M8 7h8a3 3 0 1 1 0 6H8a3 3 0 1 1 0-6Zm0 4h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </footer>`,
`          <footer class="life-capture-footer">
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
          </footer>`, 'footer');

life = replaceOrThrow(life,
`  async function saveCapture(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }`,
`  async function saveCapture(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async function readJsonResponse(response, fallbackMessage) {
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      const normalized = String(text || "").trim().toLowerCase();
      if (normalized.startsWith("<!doctype") || normalized.startsWith("<html")) {
        throw new Error("Sua sessao parece ter saído do fluxo. Feche e abra esse modal novamente.");
      }
      throw new Error(fallbackMessage || "Resposta invalida do servidor.");
    }
    if (!response.ok) {
      throw new Error(safeText(payload?.error || fallbackMessage || "Falha na requisicao."));
    }
    return payload || {};
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 32768;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const slice = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...slice);
    }
    return window.btoa(binary);
  }

  function parseDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(safeText(dataUrl));
    if (!match) return { mimeType: "", base64: "" };
    return { mimeType: match[1], base64: match[2] };
  }

  function buildCaptureMediaUrl(capture) {
    return safeText(capture?.remoteUrl || "");
  }

  function buildCapturePreviewUrl(capture) {
    return safeText(capture?.previewRemoteUrl || capture?.previewDataUrl || "");
  }

  async function ensureCaptureUploaded(capture) {
    const current = findCaptureById(capture?.id) || capture;
    if (!current) throw new Error("Captura nao encontrada.");
    if (current.remoteUrl) return current;
    if (state.uploads.has(current.id)) return state.uploads.get(current.id);

    const uploadPromise = (async () => {
      await persistCapturePatch(current.id, { uploadStatus: "uploading", uploadError: "" });
      const mediaBytes = new Uint8Array(await current.mediaBlob.arrayBuffer());
      const previewPayload = parseDataUrl(current.previewDataUrl);
      const response = await fetch("/api/200/life-captures/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kind: current.kind,
          mimeType: current.mimeType,
          fileBase64: bytesToBase64(mediaBytes),
          previewBase64: previewPayload.base64
        })
      });
      const payload = await readJsonResponse(response, "Nao foi possivel enviar essa memoria para o R2.");
      const asset = payload?.asset || {};
      return persistCapturePatch(current.id, {
        remoteKey: safeText(asset.key),
        remoteUrl: safeText(asset.url),
        previewRemoteUrl: safeText(asset.previewUrl),
        sizeBytes: Number(asset.sizeBytes || current.mediaBlob?.size || 0),
        uploadStatus: "uploaded",
        uploadError: "",
        uploadedAt: new Date().toISOString()
      });
    })().catch(async (error) => {
      await persistCapturePatch(current.id, { uploadStatus: "failed", uploadError: error instanceof Error ? error.message : "Falha no upload." });
      throw error;
    }).finally(() => {
      state.uploads.delete(current.id);
    });

    state.uploads.set(current.id, uploadPromise);
    return uploadPromise;
  }`, 'helper block');

life = replaceOrThrow(life,
`  async function startPreview() {
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
    preview.srcObject = state.stream;
    await preview.play().catch(() => {});
    drawPreviewFrame();
    setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");
  }`,
`  async function startPreview() {
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
    preview.srcObject = state.stream;
    preview.style.transform = "scaleX(-1)";
    await preview.play().catch(() => {});
    drawPreviewFrame();
    setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");
  }`, 'startPreview');

life = replaceOrThrow(life,
`  function setModeUi() {
    const label = byId("lifeCaptureModeLabel");
    const modeButton = byId("lifeCaptureModeButton");
    const trigger = byId("lifeCaptureTriggerButton");
    if (label) label.textContent = state.mode === "video" ? "Video" : "Foto";
    if (modeButton) {
      modeButton.innerHTML = state.mode === "video"
        ? '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.2l4.1-2.4c.8-.46 1.9.1 1.9 1.02v9.4c0 .92-1.1 1.48-1.9 1.02L16 15.3v1.2A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>';
    }
    trigger?.classList.toggle("is-recording", state.recording);
  }`,
`  function setModeUi() {
    const label = byId("lifeCaptureModeLabel");
    const modeButton = byId("lifeCaptureModeButton");
    const trigger = byId("lifeCaptureTriggerButton");
    const shell = document.querySelector("#lifeCaptureOverlay .life-capture-shell");
    if (label) label.textContent = state.mode === "video" ? "Video" : "Foto";
    if (modeButton) {
      modeButton.innerHTML = state.mode === "video"
        ? '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.2l4.1-2.4c.8-.46 1.9.1 1.9 1.02v9.4c0 .92-1.1 1.48-1.9 1.02L16 15.3v1.2A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>';
    }
    shell?.classList.toggle("is-video-mode", state.mode === "video");
    trigger?.classList.toggle("is-recording", state.recording);
  }`, 'setModeUi');

life = replaceOrThrow(life,
`  function buildSharePayload(capture) {
    return {
      kind: capture.kind,
      title: safeText(capture.title || defaultTitle(capture.kind, capture.createdAt)),
      previewDataUrl: safeText(capture.previewDataUrl),
      dateLabel: formatDate(capture.createdAt),
      noteText: safeText(capture.noteText || "")
    };
  }`,
`  function buildSharePayload(capture) {
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
  }`, 'share payload');

life = replaceOrThrow(life,
`  async function loadShareContacts() {
    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel carregar os contatos."));
    return {
      tutors: Array.isArray(payload?.tutors) ? payload.tutors : [],
      friends: Array.isArray(payload?.friends) ? payload.friends : []
    };
  }`,
`  async function loadShareContacts() {
    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await readJsonResponse(response, "Nao foi possivel carregar os contatos.");
    return {
      tutors: Array.isArray(payload?.tutors) ? payload.tutors : [],
      friends: Array.isArray(payload?.friends) ? payload.friends : []
    };
  }`, 'loadShareContacts');

life = replaceOrThrow(life,
`  async function ensureTutor(friend) {
    const response = await fetch("/api/200/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tutorUserId: friend.userId })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel adicionar esse contato."));
    return Array.isArray(payload?.tutors) ? payload.tutors : [];
  }`,
`  async function ensureTutor(friend) {
    const response = await fetch("/api/200/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tutorUserId: friend.userId })
    });
    const payload = await readJsonResponse(response, "Nao foi possivel adicionar esse contato.");
    return Array.isArray(payload?.tutors) ? payload.tutors : [];
  }`, 'ensureTutor');

life = replaceOrThrow(life,
`  async function shareToMarin(capture) {
    const response = await fetch("/api/200/marin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),
        personaKey: "marin",
        content: buildShareMessage(capture)
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel compartilhar com a Marin."));
  }`,
`  async function shareToMarin(capture) {
    const uploaded = await ensureCaptureUploaded(capture);
    const response = await fetch("/api/200/marin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),
        personaKey: "marin",
        content: buildShareMessage(uploaded || capture)
      })
    });
    await readJsonResponse(response, "Nao foi possivel compartilhar com a Marin.");
  }`, 'shareToMarin');

life = replaceOrThrow(life,
`  async function shareToTutor(contactId, capture) {
    const response = await fetch(`/api/200/tutors/${encodeURIComponent(contactId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(capture) })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel compartilhar com esse contato."));
  }`,
`  async function shareToTutor(contactId, capture) {
    const uploaded = await ensureCaptureUploaded(capture);
    const response = await fetch(`/api/200/tutors/${encodeURIComponent(contactId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(uploaded || capture) })
    });
    await readJsonResponse(response, "Nao foi possivel compartilhar com esse contato.");
  }`, 'shareToTutor');

life = replaceOrThrow(life,
`      if (capture.kind === "video") {
        const video = document.createElement("video");
        video.dataset.captureVideo = capture.id;
        video.dataset.captureKind = "video";
        video.poster = capture.previewDataUrl;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = URL.createObjectURL(capture.mediaBlob);
        video.addEventListener("loadeddata", () => {
          try {
            video.currentTime = 0.05;
          } catch {}
        }, { once: true });
        video.addEventListener("click", () => openFocus(capture.id));
        media.appendChild(video);
      } else {
        const image = document.createElement("img");
        image.src = capture.previewDataUrl;`,
`      if (capture.kind === "video") {
        const video = document.createElement("video");
        video.dataset.captureVideo = capture.id;
        video.dataset.captureKind = "video";
        video.poster = buildCapturePreviewUrl(capture);
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = buildCaptureMediaUrl(capture) || URL.createObjectURL(capture.mediaBlob);
        video.addEventListener("loadeddata", () => {
          try {
            video.currentTime = 0.05;
          } catch {}
        }, { once: true });

        const controls = document.createElement("div");
        controls.className = "life-capture-video-controls";

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "life-capture-video-pill";
        playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 6v12l10-6Z" fill="currentColor"/></svg>';

        const audioButton = document.createElement("button");
        audioButton.type = "button";
        audioButton.className = "life-capture-video-pill";
        audioButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 10h4l5-4v12l-5-4H5Z" fill="currentColor"/></svg>';

        const seek = document.createElement("input");
        seek.type = "range";
        seek.min = "0";
        seek.max = "1000";
        seek.value = "0";
        seek.className = "life-capture-video-seek";

        const syncControls = () => {
          const duration = Number(video.duration || 0);
          const currentTime = Number(video.currentTime || 0);
          seek.value = duration ? String(Math.round((currentTime / duration) * 1000)) : "0";
          playButton.innerHTML = video.paused
            ? '<svg viewBox="0 0 24 24"><path d="M8 6v12l10-6Z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M8 6h3v12H8Zm5 0h3v12h-3Z" fill="currentColor"/></svg>';
          audioButton.innerHTML = video.muted
            ? '<svg viewBox="0 0 24 24"><path d="M5 10h4l5-4v12l-5-4H5Z" fill="currentColor"/><path d="m17 9 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M5 10h4l5-4v12l-5-4H5Z" fill="currentColor"/><path d="M18 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        };

        playButton.addEventListener("click", () => {
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          syncControls();
        });
        audioButton.addEventListener("click", () => {
          video.muted = !video.muted;
          syncControls();
        });
        seek.addEventListener("input", () => {
          if (!video.duration) return;
          video.currentTime = (Number(seek.value || 0) / 1000) * video.duration;
        });
        video.addEventListener("timeupdate", syncControls);
        video.addEventListener("play", syncControls);
        video.addEventListener("pause", syncControls);
        video.addEventListener("volumechange", syncControls);
        video.addEventListener("loadedmetadata", syncControls);

        controls.append(playButton, audioButton, seek);
        media.append(video, controls);
      } else {
        const image = document.createElement("img");
        image.src = buildCapturePreviewUrl(capture) || capture.previewDataUrl;`, 'viewer video block');

life = replaceOrThrow(life,
`  function openFocus(captureId) {
    const capture = findCaptureById(captureId) || getActiveCapture();
    const host = byId("lifeCaptureFocusMedia");
    if (!(capture && host)) return;
    host.replaceChildren();
    if (capture.kind === "video") {
      const video = document.createElement("video");
      video.poster = capture.previewDataUrl;
      video.src = URL.createObjectURL(capture.mediaBlob);
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      host.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = capture.previewDataUrl;
      image.alt = safeText(capture.title || "Memoria");
      host.appendChild(image);
    }
    show("lifeCaptureFocusOverlay");
  }`,
`  function openFocus(captureId) {
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
      image.src = buildCapturePreviewUrl(capture) || capture.previewDataUrl;
      image.alt = safeText(capture.title || "Memoria");
      host.appendChild(image);
    }
    show("lifeCaptureFocusOverlay");
  }`, 'openFocus');

life = replaceOrThrow(life,
`  function openSharedFocus(payload) {
    const host = byId("lifeCaptureFocusMedia");
    if (!host) return;
    host.replaceChildren();
    const image = document.createElement("img");
    image.src = safeText(payload?.previewDataUrl);
    image.alt = safeText(payload?.title || "Midia compartilhada");
    host.appendChild(image);
    show("lifeCaptureFocusOverlay");
  }`,
`  function openSharedFocus(payload) {
    const host = byId("lifeCaptureFocusMedia");
    if (!host) return;
    host.replaceChildren();
    if (String(payload?.kind || "") === "video" && payload?.mediaUrl) {
      const video = document.createElement("video");
      video.src = safeText(payload.mediaUrl);
      video.poster = safeText(payload.previewUrl || payload.previewDataUrl);
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      host.appendChild(video);
      show("lifeCaptureFocusOverlay");
      return;
    }
    const image = document.createElement("img");
    image.src = safeText(payload?.previewUrl || payload?.previewDataUrl);
    image.alt = safeText(payload?.title || "Midia compartilhada");
    host.appendChild(image);
    show("lifeCaptureFocusOverlay");
  }`, 'openSharedFocus');

life = replaceOrThrow(life,
`  async function savePending() {
    const input = byId("lifeCaptureTitleInput");
    const capture = state.pending;
    if (!capture) return;
    setSaveStatus("Salvando...");
    const item = {
      ...capture,
      title: safeText(input?.value).trim() || defaultTitle(capture.kind, capture.createdAt)
    };
    await saveCapture(item);
    state.pending = null;
    setSaveStatus("Salvo.");
    hide("lifeCaptureSaveOverlay");
    await refreshCaptures();
    show("lifeCaptureOverlay");
    await startPreview();
  }`,
`  async function savePending() {
    const input = byId("lifeCaptureTitleInput");
    const capture = state.pending;
    if (!capture) return;
    setSaveStatus("Salvando...");
    const item = {
      ...capture,
      title: safeText(input?.value).trim() || defaultTitle(capture.kind, capture.createdAt)
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
  }`, 'savePending');

fs.writeFileSync(lifePath, life, 'utf8');

const cssPath = 'C:/Users/Lucas/Desktop/Turma do Printy Database/public/200/life-capture.css';
let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace('.life-capture-footer{display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:14px;width:min(100%,460px);margin:0 auto}', '.life-capture-footer{display:grid;grid-template-columns:64px minmax(0,1fr) auto auto;align-items:center;gap:14px;width:min(100%,520px);margin:0 auto}');
css = css.replace('.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn,.life-capture-note-btn,.life-capture-toolbar-btn,.life-capture-share-card{border:0;color:inherit}', '.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn,.life-capture-switch-minimal,.life-capture-note-btn,.life-capture-toolbar-btn,.life-capture-share-card{border:0;color:inherit}');
css = css.replace('.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);box-shadow:0 14px 30px rgba(2,10,28,.2)}', '.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);box-shadow:0 14px 30px rgba(2,10,28,.2)}.life-capture-switch-minimal{width:34px;height:34px;display:grid;place-items:center;background:transparent;justify-self:end;opacity:.9}.life-capture-switch-minimal svg{width:22px;height:22px}');
css = css.replace('.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}', '.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}.life-capture-shell.is-video-mode .life-capture-preview-frame{width:100vw;max-width:100vw;border-radius:0;box-shadow:none}');
css = css.replace('.life-capture-capture-tools{display:flex;align-items:center;gap:10px}', '.life-capture-capture-tools{display:flex;align-items:center;gap:10px}.life-capture-trigger{grid-column:2}.life-capture-mode-btn{grid-column:4;justify-self:end}.life-capture-switch-minimal{grid-column:3}');
css = css.replace('@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto}.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:56px;height:56px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}', '@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-shell.is-video-mode .life-capture-preview-frame{width:100vw}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto}.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:56px;height:56px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}');
fs.writeFileSync(cssPath, css, 'utf8');
