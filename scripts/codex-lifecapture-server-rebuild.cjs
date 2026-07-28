const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server.js');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('async function patchProject200LifeCaptureRecord(userId, captureId, patch) {');
const end = s.indexOf('async function handleProject200MarinMessageRequest(request, response) {');
if (start < 0 || end < 0 || end <= start) throw new Error('bloco alvo nao encontrado');
const replacement = `async function patchProject200LifeCaptureRecord(userId, captureId, patch) {
  if (!userId || !captureId) throw new Error('Captura invalida.');
  await ensureProject200LifeCapturesSchema();
  const fields = [];
  const values = [];
  let param = 1;
  const setField = (column, value) => {
    fields.push(column + ' = $' + param);
    values.push(value);
    param += 1;
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) setField('title', String(patch.title || '').trim());
  if (Object.prototype.hasOwnProperty.call(patch, 'noteText')) setField('note_text', String(patch.noteText || '').trim());
  if (Object.prototype.hasOwnProperty.call(patch, 'durationMs')) setField('duration_ms', Number(patch.durationMs || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'metadata')) setField('metadata', JSON.stringify(patch.metadata && typeof patch.metadata === 'object' ? patch.metadata : {}));
  if (!fields.length) {
    const current = await query('select * from project200_life_captures where id = $1 and user_id = $2 limit 1', [String(captureId), userId]);
    return mapProject200LifeCaptureRow(current.rows[0]);
  }
  fields.push('updated_at = now()');
  values.push(String(captureId), userId);
  const result = await query(
    'update project200_life_captures set ' + fields.join(', ') + ' where id = $' + param + ' and user_id = $' + (param + 1) + ' returning *',
    values
  );
  return mapProject200LifeCaptureRow(result.rows[0]);
}

async function handleProject200LifeCaptureListRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const captures = await listProject200LifeCaptures(user.id);
    sendJson(response, 200, { ok: true, captures });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : 'Nao foi possivel carregar as capturas.' });
  }
}

async function handleProject200LifeCapturePatchRequest(request, response, captureId) {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const body = await readJsonBody(request);
    const capture = await patchProject200LifeCaptureRecord(user.id, captureId, {
      title: body?.title,
      noteText: body?.noteText,
      durationMs: body?.durationMs,
      metadata: body?.metadata
    });
    if (!capture) {
      sendJson(response, 404, { error: 'Captura nao encontrada.' });
      return;
    }
    sendJson(response, 200, { ok: true, capture });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : 'Nao foi possivel atualizar a captura.' });
  }
}

async function handleProject200LifeCaptureUploadRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const body = await readJsonBody(request);
    const kind = String(body?.kind || 'photo').trim().toLowerCase() === 'video' ? 'video' : 'photo';
    const captureId = String(body?.captureId || body?.id || '').trim() || crypto.randomUUID();
    const title = String(body?.title || '').trim();
    const noteText = String(body?.noteText || '').trim();
    const createdAt = body?.createdAt;
    const durationMs = Number(body?.durationMs || 0);
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    const mimeType = String(body?.mimeType || '').trim().toLowerCase();
    const fileBase64 = String(body?.fileBase64 || '').trim();
    const previewBase64 = String(body?.previewBase64 || '').trim();
    if (!mimeType || !fileBase64) throw new Error('Envie o arquivo principal da captura.');

    const extensionByMime = {
      'image/webp': 'webp',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/webm': 'webm',
      'video/mp4': 'mp4',
      'video/ogg': 'ogv'
    };
    const extension = extensionByMime[mimeType];
    if (!extension) throw new Error('Formato de midia ainda nao suportado.');

    const mediaBuffer = Buffer.from(fileBase64, 'base64');
    if (!mediaBuffer.length) throw new Error('O arquivo enviado esta vazio.');
    if (mediaBuffer.length > 40 * 1024 * 1024) throw new Error('A captura esta acima do limite de 40 MB.');

    const usernamePart = String(user.username || user.id || 'usuario').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'usuario';
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const baseKey = \`project200/life-captures/\${usernamePart}/\${year}/\${month}/\${day}/\${Date.now()}-\${crypto.randomUUID().slice(0, 8)}\`;
    const mediaKey = \`\${baseKey}.\${extension}\`;

    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: mediaKey,
      Body: mediaBuffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    let previewKey = '';
    let previewUrl = '';
    if (previewBase64) {
      const previewBuffer = Buffer.from(previewBase64, 'base64');
      if (previewBuffer.length) {
        previewKey = \`\${baseKey}-preview.webp\`;
        await getR2Client().send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: previewKey,
          Body: previewBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable'
        }));
        previewUrl = buildPublicR2UrlFromKey(previewKey);
      }
    }

    const capture = await upsertProject200LifeCaptureRecord(user.id, {
      id: captureId,
      kind,
      title,
      noteText,
      createdAt,
      mimeType,
      mediaKey,
      mediaUrl: buildPublicR2UrlFromKey(mediaKey),
      previewKey,
      previewUrl,
      sizeBytes: mediaBuffer.length,
      durationMs,
      metadata
    });

    sendJson(response, 201, {
      ok: true,
      asset: {
        kind,
        key: mediaKey,
        url: buildPublicR2UrlFromKey(mediaKey),
        previewKey,
        previewUrl,
        sizeBytes: mediaBuffer.length,
        mimeType
      },
      capture
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : 'Nao foi possivel enviar a captura para o R2.'
    });
  }
}

`;
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s, 'utf8');
console.log('block rebuilt');
