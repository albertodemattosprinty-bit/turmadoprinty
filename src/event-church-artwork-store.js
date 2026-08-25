import { query } from "./db.js";
import { ensureEventContractingSchema } from "./event-contracting.js";

let schemaPromise = null;

function mapChurchArtwork(row) {
  if (!row?.church_art_key) return null;
  return {
    key: row.church_art_key,
    userId: row.user_id,
    url: `/api/event-church-artworks/${encodeURIComponent(row.term_id)}`,
    fileName: row.church_art_name || "fachada-igreja-cinematografica.jpg",
    contentType: row.church_art_content_type || "image/jpeg",
    sizeBytes: Number(row.church_art_size || 0),
    period: row.church_art_period || "",
    model: row.church_art_model || "",
    quality: row.church_art_quality || "",
    updatedAt: row.church_art_updated_at || row.updated_at || null
  };
}

async function ensureEventChurchArtworkSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await ensureEventContractingSchema();
      await query(`
        alter table event_contract_assets
          add column if not exists church_art_key text,
          add column if not exists church_art_name text,
          add column if not exists church_art_content_type text,
          add column if not exists church_art_size bigint,
          add column if not exists church_art_period text,
          add column if not exists church_art_model text,
          add column if not exists church_art_quality text,
          add column if not exists church_art_updated_at timestamptz,
          add column if not exists church_art_generated_by_user_id uuid references users(id) on delete set null;
      `);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function saveEventChurchArtwork(actorId, userId, termId, asset) {
  await ensureEventChurchArtworkSchema();
  const result = await query(`
    insert into event_contract_assets
      (term_id, user_id, church_art_key, church_art_name, church_art_content_type, church_art_size,
       church_art_period, church_art_model, church_art_quality, church_art_updated_at, church_art_generated_by_user_id)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10)
    on conflict (term_id) do update set
      church_art_key=excluded.church_art_key,
      church_art_name=excluded.church_art_name,
      church_art_content_type=excluded.church_art_content_type,
      church_art_size=excluded.church_art_size,
      church_art_period=excluded.church_art_period,
      church_art_model=excluded.church_art_model,
      church_art_quality=excluded.church_art_quality,
      church_art_updated_at=now(),
      church_art_generated_by_user_id=excluded.church_art_generated_by_user_id,
      updated_at=now()
    returning *
  `, [termId, userId, asset.key, asset.fileName, asset.contentType, asset.sizeBytes, asset.period, asset.model, asset.quality, actorId]);
  const artwork = mapChurchArtwork(result.rows[0]);

  if (asset.generatedByContractor) {
    await query(
      `insert into event_admin_updates (term_id, user_id, kind, payload)
       values ($1, $2, 'CHURCH_ARTWORK_GENERATED', $3::jsonb)`,
      [termId, userId, JSON.stringify({ fileName: artwork?.fileName || asset.fileName })]
    );
  }
  return artwork;
}

export async function getEventChurchArtworkFile(termId) {
  await ensureEventChurchArtworkSchema();
  const result = await query(`
    select term_id, user_id, church_art_key, church_art_name, church_art_content_type, church_art_size,
           church_art_period, church_art_model, church_art_quality, church_art_updated_at, updated_at
      from event_contract_assets
     where term_id = $1 and church_art_key is not null
     limit 1
  `, [termId]);
  return mapChurchArtwork(result.rows[0]);
}
