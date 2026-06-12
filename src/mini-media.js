import { query } from "./db.js";

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeAsset(row) {
  return {
    id: row.id,
    songId: row.song_id,
    type: String(row.asset_type || "").trim(),
    title: String(row.title || "").trim(),
    pageOrder: Math.max(0, Number(row.page_order || 0) || 0),
    sourceKey: String(row.source_key || "").trim(),
    previewKey: String(row.preview_key || "").trim(),
    downloadKey: String(row.download_key || "").trim(),
    sourceContentType: String(row.source_content_type || "").trim(),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function ensureMiniMediaSchema() {
  await query(`
    create table if not exists mini_media_albums (
      id uuid primary key default gen_random_uuid(),
      legacy_id text not null unique,
      title text not null default 'Album',
      subtitle text not null default '',
      cover_key text not null default '',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists mini_media_songs (
      id uuid primary key default gen_random_uuid(),
      album_id uuid not null references mini_media_albums(id) on delete cascade,
      legacy_id text not null,
      title text not null default 'Faixa',
      subtitle text not null default '',
      audio_key text not null default '',
      playback_key text not null default '',
      lyrics_key text not null default '',
      track_order integer not null default 0,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (album_id, legacy_id)
    );
  `);
  await query(`
    create table if not exists mini_media_song_assets (
      id uuid primary key default gen_random_uuid(),
      song_id uuid not null references mini_media_songs(id) on delete cascade,
      asset_type text not null,
      title text not null default '',
      page_order integer not null default 0,
      source_key text not null default '',
      preview_key text not null default '',
      download_key text not null default '',
      source_content_type text not null default '',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query("create index if not exists idx_mini_media_songs_album_order on mini_media_songs(album_id, track_order, created_at);");
  await query("create index if not exists idx_mini_media_song_assets_song_type_order on mini_media_song_assets(song_id, asset_type, page_order, created_at);");
}

export async function syncMiniMediaLibraryToDatabase(library = { albums: [] }) {
  await ensureMiniMediaSchema();
  const albums = Array.isArray(library?.albums) ? library.albums : [];

  for (const album of albums) {
    const albumResult = await query(
      `
        insert into mini_media_albums (legacy_id, title, subtitle, cover_key, updated_at)
        values ($1, $2, $3, $4, now())
        on conflict (legacy_id)
        do update set
          title = excluded.title,
          subtitle = excluded.subtitle,
          cover_key = excluded.cover_key,
          updated_at = now()
        returning id
      `,
      [
        String(album?.id || "").trim(),
        String(album?.title || "Album").trim() || "Album",
        String(album?.subtitle || "").trim(),
        String(album?.coverKey || "").trim()
      ]
    );
    const albumGlobalId = albumResult.rows[0]?.id || null;
    album.globalId = albumGlobalId;

    const songs = Array.isArray(album?.songs) ? album.songs : [];
    for (const song of songs) {
      const songResult = await query(
        `
          insert into mini_media_songs (
            album_id, legacy_id, title, subtitle, audio_key, playback_key, lyrics_key, track_order, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, now())
          on conflict (album_id, legacy_id)
          do update set
            title = excluded.title,
            subtitle = excluded.subtitle,
            audio_key = excluded.audio_key,
            playback_key = case when excluded.playback_key <> '' then excluded.playback_key else mini_media_songs.playback_key end,
            lyrics_key = case when excluded.lyrics_key <> '' then excluded.lyrics_key else mini_media_songs.lyrics_key end,
            track_order = excluded.track_order,
            updated_at = now()
          returning id, playback_key, lyrics_key
        `,
        [
          albumGlobalId,
          String(song?.id || "").trim(),
          String(song?.title || "Faixa").trim() || "Faixa",
          String(song?.subtitle || "").trim(),
          String(song?.key || "").trim(),
          String(song?.playbackKey || "").trim(),
          String(song?.lyricsKey || "").trim(),
          Math.max(0, Number(song?.order || 0) || 0)
        ]
      );
      song.globalId = songResult.rows[0]?.id || null;
      song.playbackKey = String(songResult.rows[0]?.playback_key || song?.playbackKey || "").trim();
      song.lyricsKey = String(songResult.rows[0]?.lyrics_key || song?.lyricsKey || "").trim();
      const assetCountResult = await query(
        `
          select count(*)::integer as score_count
          from mini_media_song_assets
          where song_id = $1 and asset_type = 'score'
        `,
        [song.globalId]
      );
      song.scoreCount = Math.max(0, Number(assetCountResult.rows[0]?.score_count || 0) || 0);
    }
  }

  return library;
}

export async function getMiniMediaSongByLegacyIds(albumLegacyId, songLegacyId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      select
        s.*,
        a.legacy_id as album_legacy_id,
        a.title as album_title
      from mini_media_songs s
      join mini_media_albums a on a.id = s.album_id
      where a.legacy_id = $1 and s.legacy_id = $2
      limit 1
    `,
    [String(albumLegacyId || "").trim(), String(songLegacyId || "").trim()]
  );
  return result.rows[0] || null;
}

export async function updateMiniMediaSongLyrics(songId, lyricsKey = "") {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      update mini_media_songs
      set lyrics_key = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [songId, String(lyricsKey || "").trim()]
  );
  return result.rows[0] || null;
}

export async function updateMiniMediaSongPlayback(songId, playbackKey = "") {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      update mini_media_songs
      set playback_key = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [songId, String(playbackKey || "").trim()]
  );
  return result.rows[0] || null;
}

export async function createMiniMediaSongAsset(songId, asset = {}) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      insert into mini_media_song_assets (
        song_id, asset_type, title, page_order, source_key, preview_key, download_key, source_content_type, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      returning *
    `,
    [
      songId,
      String(asset?.type || "score").trim() || "score",
      String(asset?.title || "").trim(),
      Math.max(0, Number(asset?.pageOrder || 0) || 0),
      String(asset?.sourceKey || "").trim(),
      String(asset?.previewKey || "").trim(),
      String(asset?.downloadKey || "").trim(),
      String(asset?.sourceContentType || "").trim(),
      JSON.stringify(asset?.metadata && typeof asset.metadata === "object" ? asset.metadata : {})
    ]
  );
  return normalizeAsset(result.rows[0]);
}

export async function listMiniMediaSongAssets(songId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      select *
      from mini_media_song_assets
      where song_id = $1
      order by asset_type, page_order, created_at
    `,
    [songId]
  );
  return result.rows.map((row) => normalizeAsset(row));
}

export async function deleteMiniMediaSongAsset(assetId, songId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      delete from mini_media_song_assets
      where id = $1 and song_id = $2
      returning *
    `,
    [assetId, songId]
  );
  return result.rows[0] ? normalizeAsset(result.rows[0]) : null;
}

export async function deleteMiniMediaSongByLegacyIds(albumLegacyId, songLegacyId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      delete from mini_media_songs s
      using mini_media_albums a
      where s.album_id = a.id
        and a.legacy_id = $1
        and s.legacy_id = $2
      returning s.id
    `,
    [String(albumLegacyId || "").trim(), String(songLegacyId || "").trim()]
  );
  return result.rows[0]?.id || null;
}

export async function deleteMiniMediaAlbumByLegacyId(albumLegacyId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      delete from mini_media_albums
      where legacy_id = $1
      returning id
    `,
    [String(albumLegacyId || "").trim()]
  );
  return result.rows[0]?.id || null;
}
