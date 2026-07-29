import crypto from "node:crypto";

import { query } from "./db.js";

let lifeCapturesSchemaPromise = null;

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeKind(value) {
  const kind = String(value || "photo").trim().toLowerCase();
  return new Set(["photo", "video", "audio", "text"]).has(kind) ? kind : "photo";
}

export async function ensureProject200LifeCapturesSchema() {
  if (!lifeCapturesSchemaPromise) {
    lifeCapturesSchemaPromise = (async () => {
      await query(`
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
      `);
      await query("create index if not exists idx_project200_life_captures_user_created on project200_life_captures(user_id, created_at_capture desc, created_at desc);");
    })().catch((error) => {
      lifeCapturesSchemaPromise = null;
      throw error;
    });
  }
  return lifeCapturesSchemaPromise;
}

function mapLifeCaptureRow(row) {
  if (!row) return null;
  return {
    id: normalizeId(row.id),
    kind: normalizeKind(row.kind),
    title: String(row.title || ""),
    noteText: String(row.note_text || ""),
    createdAt: row.created_at_capture instanceof Date
      ? row.created_at_capture.toISOString()
      : new Date(row.created_at_capture || Date.now()).toISOString(),
    mimeType: String(row.mime_type || ""),
    remoteUrl: String(row.media_url || ""),
    mediaUrl: String(row.media_url || ""),
    previewRemoteUrl: String(row.preview_url || ""),
    previewUrl: String(row.preview_url || ""),
    uploadKey: String(row.media_key || ""),
    previewKey: String(row.preview_key || ""),
    sizeBytes: Math.max(0, Math.trunc(Number(row.size_bytes || 0) || 0)),
    durationMs: Math.max(0, Math.trunc(Number(row.duration_ms || 0) || 0)),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    uploadedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(row.updated_at || Date.now()).toISOString()
  };
}

export async function listProject200LifeCaptures(userId) {
  await ensureProject200LifeCapturesSchema();
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return [];
  const result = await query(
    `
      select *
      from project200_life_captures
      where user_id = $1
      order by created_at_capture desc, created_at desc
    `,
    [normalizedUserId]
  );
  return result.rows.map(mapLifeCaptureRow).filter(Boolean);
}

export async function upsertProject200LifeCapture(userId, input) {
  await ensureProject200LifeCapturesSchema();
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) throw new Error("Usuario invalido para salvar a captura.");
  const captureId = normalizeId(input?.id) || crypto.randomUUID();
  const result = await query(
    `
      insert into project200_life_captures (
        id, user_id, kind, title, note_text, created_at_capture,
        mime_type, media_key, media_url, preview_key, preview_url,
        size_bytes, duration_ms, metadata, created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, coalesce($14::jsonb, '{}'::jsonb), now(), now()
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
    `,
    [
      captureId,
      normalizedUserId,
      normalizeKind(input?.kind),
      String(input?.title || "").trim(),
      String(input?.noteText || "").trim(),
      input?.createdAt ? new Date(input.createdAt) : new Date(),
      String(input?.mimeType || "").trim(),
      String(input?.mediaKey || "").trim(),
      String(input?.mediaUrl || "").trim(),
      String(input?.previewKey || "").trim(),
      String(input?.previewUrl || "").trim(),
      Math.max(0, Math.trunc(Number(input?.sizeBytes || 0) || 0)),
      Math.max(0, Math.trunc(Number(input?.durationMs || 0) || 0)),
      input?.metadata && typeof input.metadata === "object" ? JSON.stringify(input.metadata) : "{}"
    ]
  );
  return mapLifeCaptureRow(result.rows[0]);
}

export async function patchProject200LifeCapture(userId, captureId, patch = {}) {
  await ensureProject200LifeCapturesSchema();
  const normalizedUserId = normalizeId(userId);
  const normalizedCaptureId = normalizeId(captureId);
  if (!normalizedUserId || !normalizedCaptureId) throw new Error("Captura invalida.");
  const fields = [];
  const values = [];
  let param = 1;
  const setField = (column, value) => {
    fields.push(`${column} = $${param}`);
    values.push(value);
    param += 1;
  };
  if (Object.prototype.hasOwnProperty.call(patch, "title")) setField("title", String(patch.title || "").trim());
  if (Object.prototype.hasOwnProperty.call(patch, "noteText")) setField("note_text", String(patch.noteText || "").trim());
  if (Object.prototype.hasOwnProperty.call(patch, "durationMs")) setField("duration_ms", Math.max(0, Math.trunc(Number(patch.durationMs || 0) || 0)));
  if (Object.prototype.hasOwnProperty.call(patch, "metadata")) setField("metadata", JSON.stringify(patch.metadata && typeof patch.metadata === "object" ? patch.metadata : {}));
  if (!fields.length) {
    const current = await query("select * from project200_life_captures where id = $1 and user_id = $2 limit 1", [normalizedCaptureId, normalizedUserId]);
    return mapLifeCaptureRow(current.rows[0]);
  }
  fields.push("updated_at = now()");
  values.push(normalizedCaptureId, normalizedUserId);
  const result = await query(
    `update project200_life_captures set ${fields.join(", ")} where id = $${param} and user_id = $${param + 1} returning *`,
    values
  );
  return mapLifeCaptureRow(result.rows[0]);
}
