const fs = require('fs');
const path = require('path');

function mustReplace(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Trecho nao encontrado: ${label}`);
  }
  return source.replace(search, replacement);
}

const jsPath = path.join(process.cwd(), 'public/200/life-capture.js');
let js = fs.readFileSync(jsPath, 'utf8');

js = mustReplace(js,
`    pending: null,
    captures: [],
    activeIndex: 0,`,
`    pending: null,
    captures: [],
    uploads: new Map(),
    activeIndex: 0,`,
'state uploads');

js = mustReplace(js,
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
          </footer>`,
'footer layout');

js = mustReplace(js,
`  async function refreshCaptures() {
    state.captures = await loadCaptures();
    state.activeIndex = clamp(state.activeIndex, 0, Math.max(state.captures.length - 1, 0));
    await renderAlbumThumb();
    renderViewer();
  }
`,
`  async function readJsonResponse(response, fallbackMessage) {
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          throw new Error(plain || fallbackMessage || 'Resposta invalida do servidor.');
        }
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
      const response = await fetch('/api/200/life-captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: capture.kind,
          mimeType: safeText(capture.mimeType || capture.mediaBlob.type || ''),
          fileBase64: mediaBase64,
          previewBase64: previewParts.base64
        })
      });
      const payload = await readJsonResponse(response, 'Nao foi possivel enviar a midia.');
      const asset = payload?.asset || {};
      const updated = {
        ...capture,
        remoteUrl: safeText(asset.url || capture.remoteUrl || ''),
        mediaUrl: safeText(asset.url || capture.mediaUrl || ''),
        previewRemoteUrl: safeText(asset.previewUrl || capture.previewRemoteUrl || ''),
        previewUrl: safeText(asset.previewUrl || capture.previewUrl || ''),
        uploadKey: safeText(asset.key || capture.uploadKey || ''),
        previewKey: safeText(asset.previewKey || capture.previewKey || ''),
        sizeBytes: Number.isFinite(asset.sizeBytes) ? Number(asset.sizeBytes) : (capture.sizeBytes || capture.mediaBlob.size || 0),
        uploadedAt: new Date().toISOString()
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
    state.captures = await loadCaptures();
    state.activeIndex = clamp(state.activeIndex, 0, Math.max(state.captures.length - 1, 0));
    await renderAlbumThumb();
    renderViewer();
  }
`,
'upload helpers');

js = mustReplace(js,
`    preview.srcObject = state.stream;
    await preview.play().catch(() => {});
    drawPreviewFrame();
    setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");`,
`    preview.srcObject = state.stream;
    preview.style.transform = "scaleX(-1)";
    await preview.play().catch(() => {});
    drawPreviewFrame();
    setStatus(state.mode === "video" ? "Video 720p ativo." : "Foto 720p ativa.");`,
'mirror preview');

js = mustReplace(js,
`    if (modeButton) {
      modeButton.innerHTML = state.mode === "video"
        ? '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.2l4.1-2.4c.8-.46 1.9.1 1.9 1.02v9.4c0 .92-1.1 1.48-1.9 1.02L16 15.3v1.2A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>';
    }
    trigger?.classList.toggle("is-recording", state.recording);`,
`    if (modeButton) {
      modeButton.innerHTML = state.mode === "video"
        ? '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v1.2l4.1-2.4c.8-.46 1.9.1 1.9 1.02v9.4c0 .92-1.1 1.48-1.9 1.02L16 15.3v1.2A2.5 2.5 0 0 1 13.5 19h-7A2.5 2.5 0 0 1 4 16.5Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>';
    }
    document.querySelector('#lifeCaptureOverlay .life-capture-shell')?.classList.toggle('is-video-mode', state.mode === 'video');
    trigger?.classList.toggle("is-recording", state.recording);`,
'mode shell class');

js = mustReplace(js,
`    thumb.innerHTML = \`<img src="\${latest.previewDataUrl}" alt="Ultimo item" />\`;`,
`    thumb.innerHTML = \`<img src="\${buildCapturePreviewUrl(latest)}" alt="Ultimo item" />\`;`,
'album thumb remote');

js = mustReplace(js,
`  function buildSharePayload(capture) {
    return {
      kind: capture.kind,
      title: safeText(capture.title || defaultTitle(capture.kind, capture.createdAt)),
      previewDataUrl: safeText(capture.previewDataUrl),
      dateLabel: formatDate(capture.createdAt),
      noteText: safeText(capture.noteText || "")
    };
  }
`,
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
  }
`,
'share payload');

js = mustReplace(js,
`    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel carregar os contatos."));`,
`    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await readJsonResponse(response, "Nao foi possivel carregar os contatos.");`,
'load contacts response');

js = mustReplace(js,
`    const response = await fetch("/api/200/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tutorUserId: friend.userId })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel adicionar esse contato."));`,
`    const response = await fetch("/api/200/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tutorUserId: friend.userId })
    });
    const payload = await readJsonResponse(response, "Nao foi possivel adicionar esse contato.");`,
'ensure tutor response');

js = mustReplace(js,
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
  }
`,
`  async function shareToMarin(capture) {
    const ready = await ensureCaptureUploaded(capture);
    const response = await fetch("/api/200/marin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),
        personaKey: "marin",
        content: buildShareMessage(ready || capture)
      })
    });
    await readJsonResponse(response, "Nao foi possivel compartilhar com a Marin.");
  }
`,
'shareToMarin');

js = mustReplace(js,
`  async function shareToTutor(contactId, capture) {
    const response = await fetch(\`/api/200/tutors/\${encodeURIComponent(contactId)}/messages\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(capture) })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(safeText(payload?.error || "Nao foi possivel compartilhar com esse contato."));
  }
`,
`  async function shareToTutor(contactId, capture) {
    const ready = await ensureCaptureUploaded(capture);
    const response = await fetch(\`/api/200/tutors/\${encodeURIComponent(contactId)}/messages\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(ready || capture) })
    });
    await readJsonResponse(response, "Nao foi possivel compartilhar com esse contato.");
  }
`,
'shareToTutor');

js = mustReplace(js,
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
        image.src = capture.previewDataUrl;
        image.alt = safeText(capture.title || defaultTitle(capture.kind, capture.createdAt));
        image.addEventListener("click", () => openFocus(capture.id));
        media.appendChild(image);
      }
`,
`      if (capture.kind === "video") {
        const video = document.createElement("video");
        video.dataset.captureVideo = capture.id;
        video.dataset.captureKind = "video";
        video.poster = buildCapturePreviewUrl(capture);
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.controls = true;
        const mediaUrl = buildCaptureMediaUrl(capture);
        video.src = mediaUrl || URL.createObjectURL(capture.mediaBlob);
        video.addEventListener("loadeddata", () => {
          try {
            video.currentTime = 0.05;
          } catch {}
        }, { once: true });
        media.appendChild(video);
      } else {
        const image = document.createElement("img");
        image.src = buildCapturePreviewUrl(capture);
        image.alt = safeText(capture.title || defaultTitle(capture.kind, capture.createdAt));
        image.addEventListener("click", () => openFocus(capture.id));
        media.appendChild(image);
      }
`,
'renderViewer media');

js = mustReplace(js,
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
  }
`,
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
      image.src = buildCapturePreviewUrl(capture);
      image.alt = safeText(capture.title || "Memoria");
      host.appendChild(image);
    }
    show("lifeCaptureFocusOverlay");
  }
`,
'openFocus remote');

js = mustReplace(js,
`  function openSharedFocus(payload) {
    const host = byId("lifeCaptureFocusMedia");
    if (!host) return;
    host.replaceChildren();
    const image = document.createElement("img");
    image.src = safeText(payload?.previewDataUrl);
    image.alt = safeText(payload?.title || "Midia compartilhada");
    host.appendChild(image);
    show("lifeCaptureFocusOverlay");
  }
`,
`  function openSharedFocus(payload) {
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
`,
'openSharedFocus media');

js = mustReplace(js,
`    await saveCapture(item);
    state.pending = null;
    setSaveStatus("Salvo.");
    hide("lifeCaptureSaveOverlay");
    await refreshCaptures();
    show("lifeCaptureOverlay");
    await startPreview();
  }
`,
`    await saveCapture(item);
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
`,
'savePending background upload');

fs.writeFileSync(jsPath, js, 'utf8');

const cssPath = path.join(process.cwd(), 'public/200/life-capture.css');
let css = fs.readFileSync(cssPath, 'utf8');
css = mustReplace(css,
`.life-capture-footer{display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:14px;width:min(100%,460px);margin:0 auto}
.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn,.life-capture-note-btn,.life-capture-toolbar-btn,.life-capture-share-card{border:0;color:inherit}
.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);box-shadow:0 14px 30px rgba(2,10,28,.2)}
.life-capture-icon-btn svg,.life-capture-mode-btn svg,.life-capture-switch-btn svg,.life-capture-note-btn svg,.life-capture-toolbar-btn svg,.life-capture-share-card svg{width:24px;height:24px}
`,
`.life-capture-footer{display:grid;grid-template-columns:64px minmax(0,1fr) auto auto;align-items:center;gap:14px;width:min(100%,560px);margin:0 auto}
.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn,.life-capture-switch-minimal,.life-capture-note-btn,.life-capture-toolbar-btn,.life-capture-share-card{border:0;color:inherit}
.life-capture-icon-btn,.life-capture-mode-btn{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);box-shadow:0 14px 30px rgba(2,10,28,.2)}
.life-capture-icon-btn svg,.life-capture-mode-btn svg,.life-capture-switch-btn svg,.life-capture-switch-minimal svg,.life-capture-note-btn svg,.life-capture-toolbar-btn svg,.life-capture-share-card svg{width:24px;height:24px}
`,
'css footer block');
css = mustReplace(css,
`.life-capture-trigger{justify-self:center;width:92px;height:92px;border:0;border-radius:50%;position:relative;display:grid;place-items:center;background:transparent}
`,
`.life-capture-trigger{grid-column:2;justify-self:center;width:92px;height:92px;border:0;border-radius:50%;position:relative;display:grid;place-items:center;background:transparent}
.life-capture-switch-minimal{grid-column:3;justify-self:end;width:42px;height:42px;display:grid;place-items:center;background:transparent;opacity:.92}
.life-capture-mode-btn{grid-column:4;justify-self:end}
`,
'css trigger block');
css = mustReplace(css,
`.life-capture-capture-tools{display:flex;align-items:center;gap:10px}
`,
`.life-capture-capture-tools{display:flex;align-items:center;gap:10px}
.life-capture-shell.is-video-mode{width:100%;max-width:100%}
.life-capture-shell.is-video-mode .life-capture-stage{overflow:visible}
.life-capture-shell.is-video-mode .life-capture-preview-frame{width:100vw;max-width:100vw;border-radius:0;box-shadow:none}
`,
'css video mode block');
css = mustReplace(css,
`@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto}.life-capture-icon-btn,.life-capture-mode-btn,.life-capture-switch-btn{width:56px;height:56px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}
`,
`@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}
`,
'css mobile media');
fs.writeFileSync(cssPath, css, 'utf8');

console.log('patched life-capture js/css');

