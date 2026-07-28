const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server.js');
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('async function handleProject200LifeCaptureListRequest(request, response) {')) {
  s = s.replace(
    'async function handleProject200LifeCaptureUploadRequest(request, response) {\n',
`async function handleProject200LifeCaptureListRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const captures = await listProject200LifeCaptures(user.id);
    sendJson(response, 200, { ok: true, captures });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Nao foi possivel carregar as capturas." });
  }
}

async function handleProject200LifeCapturePatchRequest(request, response, captureId) {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const body = await readJsonBody(request);
    const capture = await patchProject200LifeCapture(user.id, captureId, {
      title: body?.title,
      noteText: body?.noteText,
      durationMs: body?.durationMs,
      metadata: body?.metadata
    });
    if (!capture) {
      sendJson(response, 404, { error: "Captura nao encontrada." });
      return;
    }
    sendJson(response, 200, { ok: true, capture });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Nao foi possivel atualizar a captura." });
  }
}

async function handleProject200LifeCaptureUploadRequest(request, response) {
`
  );
}
fs.writeFileSync(p, s, 'utf8');
console.log('handlers wired');
