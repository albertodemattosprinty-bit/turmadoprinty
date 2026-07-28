const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'public/200/life-capture.js');
let s = fs.readFileSync(p, 'utf8');
function rep(a,b,label){ if(!s.includes(a)) throw new Error('missing '+label); s=s.replace(a,b); }
rep(`    noteLastSpeechAt: 0
  };`,`    noteLastSpeechAt: 0,
    previewReady: false
  };`,'state previewReady');
rep(`<div class="life-capture-preview-frame">
              <video id="lifeCapturePreview" autoplay playsinline muted></video>
              <canvas id="lifeCaptureCanvas" width="720" height="720" hidden></canvas>
            </div>`,`<div class="life-capture-preview-frame" id="lifeCapturePreviewFrame">
              <div class="life-capture-preview-placeholder" id="lifeCapturePreviewPlaceholder" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M6 7h2.2l1.5-2h8.6l1.5 2H22a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1Zm6 3.2a4.8 4.8 0 1 0 4.8 4.8 4.8 4.8 0 0 0-4.8-4.8Z" fill="currentColor"/></svg>
              </div>
              <video id="lifeCapturePreview" autoplay playsinline muted></video>
              <canvas id="lifeCaptureCanvas" width="720" height="720" hidden></canvas>
            </div>`,'placeholder inject');
rep(`  function stopPreview() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    const preview = byId("lifeCapturePreview");`,`  function syncPreviewPlaceholder() {
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
    const preview = byId("lifeCapturePreview");`,'sync preview placeholder func');
rep(`    if (!preview.videoWidth || !preview.videoHeight || !context) {
      state.raf = requestAnimationFrame(drawPreviewFrame);
      return;
    }`,`    if (!preview.videoWidth || !preview.videoHeight || !context) {
      state.previewReady = false;
      syncPreviewPlaceholder();
      state.raf = requestAnimationFrame(drawPreviewFrame);
      return;
    }
    if (!state.previewReady) {
      state.previewReady = true;
      syncPreviewPlaceholder();
    }`,'drawPreview readiness');
rep(`    preview.srcObject = state.stream;
    preview.style.transform = "scaleX(-1)";
    await preview.play().catch(() => {});`,`    state.previewReady = false;
    syncPreviewPlaceholder();
    preview.srcObject = state.stream;
    preview.style.transform = "none";
    await preview.play().catch(() => {});`,'startPreview no mirror');
rep(`    const context = canvas.getContext("2d", { alpha: false });
    if (!preview.videoWidth || !preview.videoHeight || !context) {`,`    const context = canvas.getContext("2d", { alpha: false });
    if (!preview.videoWidth || !preview.videoHeight || !context) {`,'noop');
rep(`    const side = Math.min(preview.videoWidth, preview.videoHeight);
    const sourceX = (preview.videoWidth - side) / 2;
    const sourceY = (preview.videoHeight - side) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.filter = FILTER;
    context.drawImage(preview, sourceX, sourceY, side, side, 0, 0, canvas.width, canvas.height);`,`    const side = Math.min(preview.videoWidth, preview.videoHeight);
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
    context.restore();`,'mirror final selfie');
rep(`  async function loadShareContacts() {
    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await readJsonResponse(response, "Nao foi possivel carregar os contatos.");
    return {
      tutors: Array.isArray(payload?.tutors) ? payload.tutors : [],
      friends: Array.isArray(payload?.friends) ? payload.friends : []
    };
  }
`,`  async function loadShareContacts() {
    const response = await fetch("/api/200/tutors", { credentials: "same-origin" });
    const payload = await readJsonResponse(response, "Nao foi possivel carregar os contatos.");
    const tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
    const friends = Array.isArray(payload?.friends) ? payload.friends : [];
    const tutorIds = new Set(tutors.map((item) => String(item.contactUserId || item.userId || item.id || "")));
    return {
      tutors,
      friends: friends.filter((friend) => {
        const friendId = String(friend?.userId || friend?.id || "");
        return !tutorIds.has(friendId);
      })
    };
  }
`,'share contacts filter only');
rep(`      directory.friends.forEach((friend) => {
        if (friend.isTutor) return;
        entries.push({`,`      directory.friends.forEach((friend) => {
        entries.push({`,'show all friends');
fs.writeFileSync(p,s,'utf8');

const c = path.join(process.cwd(), 'public/200/life-capture.css');
let css = fs.readFileSync(c,'utf8');
function repc(a,b,label){ if(!css.includes(a)) throw new Error('missing css '+label); css=css.replace(a,b); }
repc(`.life-capture-stage{min-height:0;display:grid;place-items:center}
.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}` , `.life-capture-stage{min-height:0;display:grid;place-items:center;overflow:visible}
.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}
.life-capture-preview-placeholder{position:absolute;inset:0;display:grid;place-items:center;background:#061334;color:rgba(255,255,255,.78);z-index:2}
.life-capture-preview-placeholder svg{width:68px;height:68px}
.life-capture-preview-frame.is-ready .life-capture-preview-placeholder{opacity:0;pointer-events:none}`,'placeholder css');
repc(`.life-capture-shell.is-video-mode{width:100%;max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage{overflow:visible}.life-capture-shell.is-video-mode .life-capture-preview-frame{width:100vw;max-width:100vw;border-radius:0;box-shadow:none}` , `.life-capture-shell.is-video-mode,.life-capture-shell.is-photo-mode{width:100%;max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage,.life-capture-shell.is-photo-mode .life-capture-stage{overflow:visible}.life-capture-shell.is-video-mode .life-capture-preview-frame,.life-capture-shell.is-photo-mode .life-capture-preview-frame{width:100vw;max-width:100vw;border-radius:0;box-shadow:none}`,'full width all preview');
repc(`.life-capture-share-list{display:grid;gap:12px}` , `.life-capture-share-list{display:grid;gap:12px;max-height:min(62dvh,560px);overflow:auto;padding-right:4px}`,'share scrolling');
repc(`@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}` , `@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(100vw,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}`,'mobile full width');
fs.writeFileSync(c,css,'utf8');
console.log('patched');
