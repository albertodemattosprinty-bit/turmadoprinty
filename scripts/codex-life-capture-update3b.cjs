const fs = require('fs');
const path = require('path');
const jsPath = path.join(process.cwd(), 'public/200/life-capture.js');
let js = fs.readFileSync(jsPath, 'utf8');
function replaceOne(pattern, replacement, label) {
  const next = js.replace(pattern, replacement);
  if (next === js) throw new Error('nao alterou: ' + label);
  js = next;
}
replaceOne('const MEDIA_SUFFIX = "]]";','const MEDIA_SUFFIX = "]]";\n  const TOKEN_KEY = "turma_do_printy_token";','token key');
replaceOne(/function currentProfile\(\) \{[\s\S]*?\n  \}\n\n  function inject\(\) \{/,
`function currentProfile() {
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

  function inject() {`, 'auth helpers');
replaceOne("headers: { 'Content-Type': 'application/json' },","headers: withAuthHeaders({ 'Content-Type': 'application/json' }),",'upload headers');
replaceOne('const response = await fetch("/api/200/tutors", { credentials: "same-origin" });','const response = await fetch("/api/200/tutors", { credentials: "same-origin", headers: withAuthHeaders() });','contacts auth');
replaceOne(/headers: \{ "Content-Type": "application\/json" \},\n\s+credentials: "same-origin",\n\s+body: JSON\.stringify\(\{ tutorUserId: friend\.userId \}\)/,'headers: withAuthHeaders({ "Content-Type": "application/json" }),\n      credentials: "same-origin",\n      body: JSON.stringify({ tutorUserId: friend.userId })','ensure tutor auth');
replaceOne(/headers: \{ "Content-Type": "application\/json" \},\n\s+credentials: "same-origin",\n\s+body: JSON\.stringify\(\{\n\s+profile: currentProfile\(\),/,'headers: withAuthHeaders({ "Content-Type": "application/json" }),\n      credentials: "same-origin",\n      body: JSON.stringify({\n        profile: currentProfile(),','share marin auth');
replaceOne(/headers: \{ "Content-Type": "application\/json" \},\n\s+credentials: "same-origin",\n\s+body: JSON\.stringify\(\{ content: buildShareMessage\(ready \|\| capture\) \}\)/,'headers: withAuthHeaders({ "Content-Type": "application/json" }),\n      credentials: "same-origin",\n      body: JSON.stringify({ content: buildShareMessage(ready || capture) })','share tutor auth');
replaceOne(/if \(capture\.kind === "video"\) \{[\s\S]*?media\.appendChild\(video\);\n      \} else \{/,
`if (capture.kind === "video") {
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
      } else {`, 'viewer video block');
replaceOne(/function updateViewerMediaPlayback\(\) \{[\s\S]*?\n  \}/,`function updateViewerMediaPlayback() {
    pauseViewerVideos();
  }`,'disable viewer autoplay');
fs.writeFileSync(jsPath, js, 'utf8');

const cssPath = path.join(process.cwd(), 'public/200/life-capture.css');
let css = fs.readFileSync(cssPath, 'utf8');
function creplace(from, to, label) {
  const next = css.replace(from, to);
  if (next === css) throw new Error('css nao alterou: ' + label);
  css = next;
}
creplace('.life-capture-stage{min-height:0;display:grid;place-items:center;overflow:visible}', '.life-capture-stage{min-height:0;display:grid;place-items:center;overflow:visible;width:100vw;margin-left:calc(50% - 50vw)}','stage fullbleed');
creplace('.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9;border-radius:0;box-shadow:none;background:#061334}', '.life-capture-preview-frame{width:100vw;max-width:100vw;aspect-ratio:1/1;border-radius:0;box-shadow:none;background:#061334;justify-self:center}','preview square');
creplace('.life-capture-viewer-media{position:relative;width:100vw;aspect-ratio:1/1;max-width:100vw;overflow:hidden;background:rgba(4,15,40,.54)}.life-capture-viewer-media::after{content:"";position:absolute;inset:auto 0 0 0;height:140px;background:linear-gradient(180deg,rgba(7,25,52,0) 0%,rgba(7,25,52,.68) 100%);pointer-events:none}', '.life-capture-viewer-media{position:relative;width:100vw;aspect-ratio:1/1;max-width:100vw;overflow:hidden;background:rgba(4,15,40,.54);display:grid;place-items:center}.life-capture-viewer-media::after{content:"";position:absolute;inset:auto 0 0 0;height:140px;background:linear-gradient(180deg,rgba(7,25,52,0) 0%,rgba(7,25,52,.68) 100%);pointer-events:none}','viewer media center');
creplace('.life-capture-viewer-media video{pointer-events:auto}', '.life-capture-viewer-media video{pointer-events:auto;object-position:center center}','viewer video center');
creplace('.life-capture-shell.is-video-mode{width:min(100%,760px);max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage{overflow:visible}', '.life-capture-shell.is-video-mode{width:min(100%,760px);max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage{overflow:visible;width:100vw;margin-left:calc(50% - 50vw)}','video stage fullbleed');
creplace('.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9}.life-capture-save-preview{width:min(86vw,58dvh,420px)}', '.life-capture-preview-frame{width:100vw;max-width:100vw;aspect-ratio:1/1}.life-capture-save-preview{width:min(86vw,58dvh,420px)}','mobile preview square');
fs.writeFileSync(cssPath, css, 'utf8');
console.log('patched');
