const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'public/200/life-capture.js');
let s = fs.readFileSync(p, 'utf8');
function rep(oldValue, newValue, label) {
  if (!s.includes(oldValue)) throw new Error('trecho nao encontrado: ' + label);
  s = s.replace(oldValue, newValue);
}
rep(`  async function saveCapture(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }
`, `  async function saveCapture(item) {
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
    if (!getAuthToken()) return [];
    const response = await fetch('/api/200/life-captures', {
      method: 'GET',
      headers: withAuthHeaders(),
      credentials: 'same-origin'
    });
    const payload = await readJsonResponse(response, 'Nao foi possivel carregar sua memoria.');
    return Array.isArray(payload?.captures) ? payload.captures : [];
  }

  async function patchServerCapture(captureId, patch = {}) {
    if (!getAuthToken() || !captureId) return null;
    const response = await fetch('/api/200/life-captures/' + encodeURIComponent(String(captureId)), {
      method: 'PATCH',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      body: JSON.stringify(patch)
    });
    const payload = await readJsonResponse(response, 'Nao foi possivel atualizar a captura.');
    return payload?.capture || null;
  }
`, 'save batch + remote helpers');
rep(`      const response = await fetch('/api/200/life-captures/upload', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
`, `      const response = await fetch('/api/200/life-captures/upload', {
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
`, 'upload body + response');
rep(`  async function refreshCaptures() {
    state.captures = await loadCaptures();
    state.activeIndex = clamp(state.activeIndex, 0, Math.max(state.captures.length - 1, 0));
    await renderAlbumThumb();
    renderViewer();
  }
`, `  async function refreshCaptures() {
    let items = [];
    try {
      const remote = await fetchServerCaptures();
      if (Array.isArray(remote) && remote.length) {
        items = remote.slice();
        await saveCapturesBatch(items);
      } else {
        items = await loadCaptures();
      }
    } catch {
      items = await loadCaptures();
    }
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    state.captures = items;
    state.activeIndex = clamp(state.activeIndex, 0, Math.max(state.captures.length - 1, 0));
    await renderAlbumThumb();
    renderViewer();
  }
`, 'refresh captures');
rep(`  async function saveNote() {
    const capture = findCaptureById(state.noteCaptureId) || getActiveCapture();
    if (!capture) return;
    const input = byId("lifeCaptureNoteInput");
    setNoteStatus("Salvando nota...");
    await persistCapturePatch(capture.id, { noteText: safeText(input?.value).trim() });
    setNoteStatus("Nota salva.");
    closeNote();
  }
`, `  async function saveNote() {
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
`, 'save note server');
rep(`    const item = {
      ...capture,
      title: safeText(input?.value).trim() || defaultTitle(capture.kind, capture.createdAt)
    };
`, `    const item = {
      ...capture,
      title: safeText(input?.value).trim() || defaultTitle(capture.kind, capture.createdAt),
      metadata: capture.metadata && typeof capture.metadata === 'object' ? capture.metadata : {}
    };
`, 'save pending item metadata');
fs.writeFileSync(p, s, 'utf8');
console.log('life-capture sync patched');
