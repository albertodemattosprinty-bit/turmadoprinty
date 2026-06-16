import { query } from "./db.js";

let miniMediaSchemaPromise = null;

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

function normalizeLyricsSyncData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const lines = Array.isArray(value.lines) ? value.lines.map((line, index) => ({
    number: Math.max(1, Number(line?.number ?? (index + 1)) || (index + 1)),
    text: String(line?.text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim(),
    timestampMs: line?.timestampMs === null || line?.timestampMs === undefined ? null : Math.max(0, Number(line.timestampMs) || 0),
    tag: String(line?.tag || "").trim() === "correct32" ? "correct32" : ""
  })) : [];
  return {
    albumId: String(value.albumId || "").trim(),
    trackId: String(value.trackId || "").trim(),
    title: String(value.title || "").trim(),
    playbackUrl: String(value.playbackUrl || "").trim(),
    durationMs: Math.max(0, Number(value.durationMs || 0) || 0),
    lines
  };
}

export async function ensureMiniMediaSchema() {
  if (miniMediaSchemaPromise) {
    return miniMediaSchemaPromise;
  }
  miniMediaSchemaPromise = (async () => {
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
      lyrics_text text not null default '',
      lyrics_sync_json jsonb not null default '{}'::jsonb,
      lyrics_updated_at timestamptz,
      playback_song_id uuid references mini_media_songs(id) on delete set null,
      track_order integer not null default 0,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (album_id, legacy_id)
    );
  `);
    await query("alter table mini_media_songs add column if not exists lyrics_text text not null default '';");
    await query("alter table mini_media_songs add column if not exists lyrics_sync_json jsonb not null default '{}'::jsonb;");
    await query("alter table mini_media_songs add column if not exists lyrics_updated_at timestamptz;");
    await query("alter table mini_media_songs add column if not exists playback_song_id uuid references mini_media_songs(id) on delete set null;");
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
  })().catch((error) => {
    miniMediaSchemaPromise = null;
    throw error;
  });
  return miniMediaSchemaPromise;
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
          returning id, playback_key, lyrics_key, lyrics_text, lyrics_sync_json, lyrics_updated_at, playback_song_id
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
      song.lyricsText = String(songResult.rows[0]?.lyrics_text || "").trim();
      song.lyricsSyncData = normalizeLyricsSyncData(songResult.rows[0]?.lyrics_sync_json);
      song.lyricsUpdatedAt = toIso(songResult.rows[0]?.lyrics_updated_at);
      song.playbackSongId = songResult.rows[0]?.playback_song_id || null;
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

export async function hydrateMiniMediaLibraryFromDatabase(library = { albums: [] }) {
  await ensureMiniMediaSchema();
  const result = await query(`
    select
      a.id as album_global_id,
      a.legacy_id as album_legacy_id,
      s.id as song_global_id,
      s.legacy_id as song_legacy_id,
      s.playback_song_id,
      s.lyrics_text,
      s.lyrics_sync_json,
      s.lyrics_updated_at,
      count(asset.id) filter (where asset.asset_type = 'score')::integer as score_count
    from mini_media_albums a
    left join mini_media_songs s on s.album_id = a.id
    left join mini_media_song_assets asset on asset.song_id = s.id
    group by a.id, a.legacy_id, s.id, s.legacy_id, s.playback_song_id, s.lyrics_text, s.lyrics_sync_json, s.lyrics_updated_at
  `);
  const albums = new Map((Array.isArray(library?.albums) ? library.albums : []).map((album) => [String(album.id), album]));
  for (const row of result.rows) {
    const album = albums.get(String(row.album_legacy_id));
    if (!album) {
      continue;
    }
    album.globalId = row.album_global_id;
    const song = album.songs?.find((item) => String(item.id) === String(row.song_legacy_id));
    if (!song) {
      continue;
    }
    song.globalId = row.song_global_id;
    song.playbackSongId = row.playback_song_id || null;
    song.lyricsText = String(row.lyrics_text || "").trim();
    song.lyricsSyncData = normalizeLyricsSyncData(row.lyrics_sync_json);
    song.lyricsKey = "";
    song.lyricsUpdatedAt = toIso(row.lyrics_updated_at);
    song.scoreCount = Math.max(0, Number(row.score_count || 0) || 0);
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

export async function updateMiniMediaSongLyrics(songId, lyrics = "", syncData = null) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      update mini_media_songs
      set
        lyrics_text = $2,
        lyrics_sync_json = $3::jsonb,
        lyrics_key = '',
        lyrics_updated_at = case when $2 = '' and coalesce(jsonb_array_length(coalesce($3::jsonb -> 'lines', '[]'::jsonb)), 0) = 0 then null else now() end,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      songId,
      String(lyrics || "").replace(/\r\n/g, "\n").trim(),
      JSON.stringify(normalizeLyricsSyncData(syncData) || {})
    ]
  );
  return result.rows[0] || null;
}

export async function updateMiniMediaSongPlayback(songId, playbackSongId = null) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      update mini_media_songs target
      set playback_song_id = source.id, playback_key = '', updated_at = now()
      from mini_media_songs source
      where target.id = $1
        and source.id = $2
        and source.album_id = target.album_id
        and source.id <> target.id
      returning target.*
    `,
    [songId, playbackSongId]
  );
  return result.rows[0] || null;
}

export async function clearMiniMediaSongPlayback(songId) {
  await ensureMiniMediaSchema();
  const result = await query(
    `
      update mini_media_songs
      set playback_song_id = null, playback_key = '', updated_at = now()
      where id = $1
      returning *
    `,
    [songId]
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
