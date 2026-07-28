const fs = require('fs');
const path = require('path');
const jsPath = path.join(process.cwd(), 'public/200/life-capture.js');
let js = fs.readFileSync(jsPath, 'utf8');
function rep(a,b,label){ if(!js.includes(a)) throw new Error('js trecho nao encontrado: '+label); js=js.replace(a,b); }
rep(`  const MEDIA_PREFIX = "[[ILIFE_MEDIA:";
  const MEDIA_SUFFIX = "]]";`, `  const MEDIA_PREFIX = "[[ILIFE_MEDIA:";
  const MEDIA_SUFFIX = "]]";
  const TOKEN_KEY = "turma_do_printy_token";`, 'token const');
rep(`  function currentProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return "Usuario";
      const parsed = JSON.parse(raw);
      return safeText(parsed?.name || parsed?.profileName || parsed?.username || "Usuario").trim() || "Usuario";
    } catch {
      return "Usuario";
    }
  }
`, `  function currentProfile() {
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
    if (token) next.Authorization = `Bearer ${token}`;
    return next;
  }
`, 'auth helpers');
rep(`      const response = await fetch('/api/200/life-captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',`, `      const response = await fetch('/api/200/life-captures/upload', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',`, 'upload auth');
rep(`    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });`, `    const response = await fetch("/api/200/tutors", { credentials: "same-origin", headers: withAuthHeaders() });`, 'loadShareContacts auth');
rep(`      headers: { "Content-Type": "application/json" },`, `      headers: withAuthHeaders({ "Content-Type": "application/json" }),`, 'ensureTutor auth');
rep(`      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),`, `      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({
        profile: currentProfile(),`, 'shareToMarin auth');
rep(`      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(ready || capture) })`, `      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({ content: buildShareMessage(ready || capture) })`, 'shareToTutor auth');
rep(`      if (capture.kind === "video") {
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
      } else {`, `      if (capture.kind === "video") {
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
      } else {`, 'viewer video inline stop');
rep(`  function updateViewerMediaPlayback() {
    pauseViewerVideos();
    const capture = getActiveCapture();
    if (!capture || capture.kind !== "video") return;
    const video = document.querySelector(`#lifeCaptureViewerTrack video[data-capture-video="${CSS.escape(capture.id)}"]`);
    if (video instanceof HTMLVideoElement) {
      video.play().catch(() => {});
    }
  }
`, `  function updateViewerMediaPlayback() {
    pauseViewerVideos();
  }
`, 'disable viewer autoplay');
fs.writeFileSync(jsPath, js, 'utf8');

const cssPath = path.join(process.cwd(), 'public/200/life-capture.css');
let css = fs.readFileSync(cssPath, 'utf8');
function crep(a,b,label){ if(!css.includes(a)) throw new Error('css trecho nao encontrado: '+label); css=css.replace(a,b); }
crep(`.life-capture-stage{min-height:0;display:grid;place-items:center;overflow:visible}`, `.life-capture-stage{min-height:0;display:grid;place-items:center;overflow:visible;width:100vw;margin-left:calc(50% - 50vw)}`,'stage full bleed');
crep(`.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9;border-radius:0;box-shadow:none;background:#061334}`, `.life-capture-preview-frame{width:100vw;max-width:100vw;aspect-ratio:1/1;border-radius:0;box-shadow:none;background:#061334;justify-self:center}`,'preview square full width');
crep(`.life-capture-viewer-media{position:relative;width:100vw;aspect-ratio:1/1;max-width:100vw;overflow:hidden;background:rgba(4,15,40,.54)}.life-capture-viewer-media::after{content:"";position:absolute;inset:auto 0 0 0;height:140px;background:linear-gradient(180deg,rgba(7,25,52,0) 0%,rgba(7,25,52,.68) 100%);pointer-events:none}` , `.life-capture-viewer-media{position:relative;width:100vw;aspect-ratio:1/1;max-width:100vw;overflow:hidden;background:rgba(4,15,40,.54);display:grid;place-items:center}.life-capture-viewer-media::after{content:"";position:absolute;inset:auto 0 0 0;height:140px;background:linear-gradient(180deg,rgba(7,25,52,0) 0%,rgba(7,25,52,.68) 100%);pointer-events:none}`,'viewer media align');
crep(`.life-capture-viewer-media video{pointer-events:auto}`, `.life-capture-viewer-media video{pointer-events:auto;object-position:center center}`,'viewer video center');
crep(`@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9}.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}`, `@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame{width:100vw;max-width:100vw;aspect-ratio:1/1}.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}`,'mobile preview square');
fs.writeFileSync(cssPath, css, 'utf8');
console.log('patched life capture update');
