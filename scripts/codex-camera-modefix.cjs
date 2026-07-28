const fs = require('fs');
const p = 'C:/Users/Lucas/Desktop/Turma do Printy Database/public/200/life-capture.js';
let s = fs.readFileSync(p, 'utf8');
const oldLine = `    document.querySelector('#lifeCaptureOverlay .life-capture-shell')?.classList.toggle('is-video-mode', state.mode === 'video');`;
if (!s.includes(oldLine)) throw new Error('linha setModeUi nao encontrada');
s = s.replace(oldLine, `    const captureShell = document.querySelector('#lifeCaptureOverlay .life-capture-shell');\n    captureShell?.classList.toggle('is-video-mode', state.mode === 'video');\n    captureShell?.classList.toggle('is-photo-mode', state.mode === 'photo');`);
fs.writeFileSync(p, s, 'utf8');
console.log('ok');
