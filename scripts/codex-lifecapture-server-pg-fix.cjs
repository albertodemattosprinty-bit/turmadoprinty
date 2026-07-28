const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server.js');
let s = fs.readFileSync(p, 'utf8');
function insertBefore(marker, block, label) {
  const idx = s.indexOf(marker);
  if (idx < 0) throw new Error('marker not found: ' + label);
  s = s.slice(0, idx) + block + '\n\n' + s.slice(idx);
}
function replaceOne(search, replacement, label) {
  const idx = s.indexOf(search);
  if (idx < 0) throw new Error('search not found: ' + label);
  s = s.slice(0, idx) + replacement + s.slice(idx + search.length);
}
const helperBlock = String.raw`async function ensureProject200LifeCapturesSchema() {
  await query(
    \
    create table if not exists project200_life_captures (
      id text primary key,
      user_id uuid not null references users(id) on delete cascade,
      kind text not null,
      title text not null default '',
      note_text text not null default '',
      created_at_capture timestamptz not null default now(),
      mime_type text not null default '',
      media_key text not null default '',
      media_url text not null default '',
      preview_key text not null default '',
      preview_url text not null default '',
      size_bytes bigint not null default 0,
      duration_ms integer not null default 0,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists project200_life_captures_user_created_idx
      on project200_life_captures (user_id, created_at_capture desc, created_at desc);
  \`
  );
}

function mapProject200LifeCaptureRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    kind: String(row.kind || 'photo') === 'video' ? 'video' : 'photo',
    title: String(row.title || ''),
    noteText: String(row.note_text || ''),
    createdAt: row.created_at_capture instanceof Date
      ? row.created_at_capture.toISOString()
      : new Date(row.created_at_capture || Date.now()).toISOString(),
    mimeType: String(row.mime_type || ''),
    remoteUrl: String(row.media_url || ''),
    mediaUrl: String(row.media_url || ''),
    previewRemoteUrl: String(row.preview_url || ''),
    previewUrl: String(row.preview_url || ''),
    uploadKey: String(row.media_key || ''),
    previewKey: String(row.preview_key || ''),
    sizeBytes: Number(row.size_bytes || 0),
    durationMs: Number(row.duration_ms || 0),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    uploadedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(row.updated_at || Date.now()).toISOString()
  };
}

async function upsertProject200LifeCaptureRecord(userId, input) {
  if (!userId) throw new Error('Usuario invalido para salvar a captura.');
  await ensureProject200LifeCapturesSchema();
  const captureId = String(input?.id || '').trim() || crypto.randomUUID();
  const result = await query(
    \`
      insert into project200_life_captures (
        id, user_id, kind, title, note_text, created_at_capture,
        mime_type, media_key, media_url, preview_key, preview_url,
        size_bytes, duration_ms, metadata, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, coalesce($14::jsonb, '{}'::jsonb), now()
      )
      on conflict (id) do update set
        kind = excluded.kind,
        title = excluded.title,
        note_text = excluded.note_text,
        created_at_capture = excluded.created_at_capture,
        mime_type = excluded.mime_type,
        media_key = excluded.media_key,
        media_url = excluded.media_url,
        preview_key = excluded.preview_key,
        preview_url = excluded.preview_url,
        size_bytes = excluded.size_bytes,
        duration_ms = excluded.duration_ms,
        metadata = excluded.metadata,
        updated_at = now()
      returning *
    \`,
    [
      captureId,
      userId,
      String(input?.kind || 'photo') === 'video' ? 'video' : 'photo',
      String(input?.title || '').trim(),
      String(input?.noteText || '').trim(),
      input?.createdAt ? new Date(input.createdAt) : new Date(),
      String(input?.mimeType || '').trim(),
      String(input?.mediaKey || '').trim(),
      String(input?.mediaUrl || '').trim(),
      String(input?.previewKey || '').trim(),
      String(input?.previewUrl || '').trim(),
      Number(input?.sizeBytes || 0),
      Number(input?.durationMs || 0),
      input?.metadata && typeof input.metadata === 'object' ? JSON.stringify(input.metadata) : '{}'
    ]
  );
  return mapProject200LifeCaptureRow(result.rows[0]);
}

async function listProject200LifeCaptures(userId) {
  if (!userId) return [];
  await ensureProject200LifeCapturesSchema();
  const result = await query(
    \`
      select *
      from project200_life_captures
      where user_id = $1
      order by created_at_capture desc, created_at desc
    \`,
    [userId]
  );
  return result.rows.map(mapProject200LifeCaptureRow).filter(Boolean);
}

async function patchProject200LifeCaptureRecord(userId, captureId, patch) {
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
}`.replace("await query(\n    \\\n", "await query(`\n").replace("\n  \\\`\n  );", "\n  `);\n");
insertBefore('async function handleProject200LifeCaptureUploadRequest(request, response) {', helperBlock, 'insert life capture helpers');
replaceOne(`    const kind = String(body?.kind || "photo").trim().toLowerCase() === "video" ? "video" : "photo";
    const mimeType = String(body?.mimeType || "").trim().toLowerCase();
    const fileBase64 = String(body?.fileBase64 || "").trim();
    const previewBase64 = String(body?.previewBase64 || "").trim();`, `    const kind = String(body?.kind || "photo").trim().toLowerCase() === "video" ? "video" : "photo";
    const captureId = String(body?.captureId || body?.id || "").trim() || crypto.randomUUID();
    const title = String(body?.title || "").trim();
    const noteText = String(body?.noteText || "").trim();
    const createdAt = body?.createdAt;
    const durationMs = Number(body?.durationMs || 0);
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
    const mimeType = String(body?.mimeType || "").trim().toLowerCase();
    const fileBase64 = String(body?.fileBase64 || "").trim();
    const previewBase64 = String(body?.previewBase64 || "").trim();`, 'upload body parse');
replaceOne(`    sendJson(response, 201, {
      ok: true,
      asset: {
        kind,
        key: mediaKey,
        url: buildPublicR2UrlFromKey(mediaKey),
        previewKey,
        previewUrl,
        sizeBytes: mediaBuffer.length,
        mimeType
      }
    });`, `    const capture = await upsertProject200LifeCaptureRecord(user.id, {
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
    });`, 'upload response capture');
replaceOne(`  if (request.method === "POST" && pathname === "/api/200/life-captures/upload") {
    await handleProject200LifeCaptureUploadRequest(request, response);
    return;
  }`, `  if (request.method === "GET" && pathname === "/api/200/life-captures") {
    await handleProject200LifeCaptureListRequest(request, response);
    return;
  }

  if (request.method === "PATCH" && /^\/api\/200\/life-captures\/[^/]+$/.test(pathname)) {
    const captureId = decodeURIComponent(pathname.replace("/api/200/life-captures/", ""));
    await handleProject200LifeCapturePatchRequest(request, response, captureId);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/life-captures/upload") {
    await handleProject200LifeCaptureUploadRequest(request, response);
    return;
  }`, 'route insert');
fs.writeFileSync(p, s, 'utf8');
console.log('server patched');
