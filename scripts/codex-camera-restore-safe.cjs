const fs = require('fs');
const path = require('path');
const cssPath = path.join(process.cwd(), 'public/200/life-capture.css');
let css = fs.readFileSync(cssPath, 'utf8');
function replaceOrThrow(from, to, label) {
  if (!css.includes(from)) throw new Error(`css trecho nao encontrado: ${label}`);
  css = css.replace(from, to);
}
replaceOrThrow(
  `.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}`,
  `.life-capture-preview-frame,.life-capture-save-preview{position:relative;width:min(80vw,60dvh,460px);aspect-ratio:1/1;overflow:hidden;border-radius:32px;background:rgba(4,15,40,.54);box-shadow:0 28px 68px rgba(1,12,32,.32)}\n.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9;border-radius:0;box-shadow:none;background:#061334}`,
  'preview frame base'
);
replaceOrThrow(
  `.life-capture-capture-tools{display:flex;align-items:center;gap:10px}.life-capture-shell.is-video-mode,.life-capture-shell.is-photo-mode{width:100%;max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage,.life-capture-shell.is-photo-mode .life-capture-stage{overflow:visible}.life-capture-shell.is-video-mode .life-capture-preview-frame,.life-capture-shell.is-photo-mode .life-capture-preview-frame{width:100vw;max-width:100vw;border-radius:0;box-shadow:none}`,
  `.life-capture-capture-tools{display:flex;align-items:center;gap:10px}.life-capture-shell.is-video-mode{width:min(100%,760px);max-width:100%}.life-capture-shell.is-video-mode .life-capture-stage{overflow:visible}`,
  'mode layout block'
);
replaceOrThrow(
  `@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame,.life-capture-save-preview{width:min(100vw,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}`,
  `@media (max-width:540px){#runningTaskModal .running-task-content.is-idle-layout .life-capture-home-entry{top:calc(64% + clamp(38px,6dvh,48px))}.life-capture-preview-frame{width:100%;max-width:100%;aspect-ratio:16/9}.life-capture-save-preview{width:min(86vw,58dvh,420px)}.life-capture-footer{grid-template-columns:58px minmax(0,1fr) auto auto;width:min(100%,100vw)}.life-capture-icon-btn,.life-capture-mode-btn{width:56px;height:56px}.life-capture-switch-minimal{width:40px;height:40px}.life-capture-trigger{width:84px;height:84px}.life-capture-viewer-footer{width:min(100%,320px)}}`,
  'mobile block'
);
fs.writeFileSync(cssPath, css, 'utf8');

const jsPath = path.join(process.cwd(), 'public/200/life-capture.js');
let js = fs.readFileSync(jsPath, 'utf8');
if (!js.includes(`captureShell?.classList.toggle('is-photo-mode', state.mode === 'photo');`)) throw new Error('js trecho nao encontrado');
js = js.replace(`\n    captureShell?.classList.toggle('is-photo-mode', state.mode === 'photo');`, '');
fs.writeFileSync(jsPath, js, 'utf8');
console.log('camera layout restored safely');
