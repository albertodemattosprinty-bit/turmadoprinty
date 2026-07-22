import { query } from "./db.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTrackUrl(value) {
  return normalizeText(value);
}

function normalizeCatalogId(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeTrackName(value) {
  return normalizeText(value) || "Faixa";
}

function normalizeDefaultMode(value) {
  return normalizeText(value).toLowerCase() === "station" ? "station" : "track";
}

function normalizeStationName(value) {
  return normalizeText(value) || "Estacao";
}

function normalizeTaskTitle(value) {
  return normalizeText(value);
}

export async function ensureProject200MusicSchema() {
  await query(`
    create table if not exists project200_music_favorites (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      station_name text not null,
      track_name text not null,
      track_url text not null,
      station_id text,
      track_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, track_url)
    );
  `);
  await query("alter table project200_music_favorites add column if not exists station_id text;");
  await query("alter table project200_music_favorites add column if not exists track_id text;");
  await query("create index if not exists idx_project200_music_favorites_user_time on project200_music_favorites(user_id, updated_at desc);");
  await query("create unique index if not exists idx_project200_music_favorites_user_track_id on project200_music_favorites(user_id, track_id) where track_id is not null and track_id <> '';");

  await query(`
    create table if not exists project200_music_task_defaults (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      task_title text not null,
      default_mode text not null default 'track',
      station_name text not null,
      track_name text not null,
      track_url text not null,
      station_id text,
      track_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, task_title)
    );
  `);
  await query("alter table project200_music_task_defaults add column if not exists default_mode text not null default 'track';");
  await query("alter table project200_music_task_defaults add column if not exists station_id text;");
  await query("alter table project200_music_task_defaults add column if not exists track_id text;");
  await query("create index if not exists idx_project200_music_task_defaults_user_time on project200_music_task_defaults(user_id, updated_at desc);");
}

export async function getProject200MusicPreferences(userId) {
  if (!userId) {
    return {
      favoriteTrackUrls: [],
      favoriteTrackIds: [],
      favorites: [],
      defaults: []
    };
  }

  await ensureProject200MusicSchema();

  const [favoritesResult, defaultsResult] = await Promise.all([
    query(
      `select station_id, track_id, station_name, track_name, track_url
         from project200_music_favorites
        where user_id = $1
        order by updated_at desc`,
      [userId]
    ),
    query(
      `select task_title, default_mode, station_id, track_id, station_name, track_name, track_url
         from project200_music_task_defaults
        where user_id = $1
        order by updated_at desc`,
      [userId]
    )
  ]);

  const favorites = favoritesResult.rows.map((row) => ({
    stationId: normalizeCatalogId(row.station_id),
    trackId: normalizeCatalogId(row.track_id),
    stationName: normalizeStationName(row.station_name),
    trackName: normalizeTrackName(row.track_name),
    trackUrl: normalizeTrackUrl(row.track_url)
  }));

  return {
    favoriteTrackUrls: favorites.map((row) => row.trackUrl).filter(Boolean),
    favoriteTrackIds: favorites.map((row) => row.trackId).filter(Boolean),
    favorites,
    defaults: defaultsResult.rows.map((row) => ({
      taskTitle: normalizeTaskTitle(row.task_title),
      mode: normalizeDefaultMode(row.default_mode),
      stationId: normalizeCatalogId(row.station_id),
      trackId: normalizeCatalogId(row.track_id),
      stationName: normalizeStationName(row.station_name),
      trackName: normalizeText(row.track_name),
      trackUrl: normalizeTrackUrl(row.track_url)
    })).filter((row) => row.taskTitle && (row.mode === "station" ? (row.stationId || row.stationName) : (row.trackId || row.trackUrl)))
  };
}

function findCatalogStation(stations, preference) {
  const stationId = normalizeCatalogId(preference?.stationId);
  const stationName = normalizeStationName(preference?.stationName);
  return stations.find((station) => stationId && normalizeCatalogId(station?.id) === stationId)
    || stations.find((station) => normalizeStationName(station?.name) === stationName)
    || null;
}

function findCatalogTrack(stations, preference) {
  const trackId = normalizeCatalogId(preference?.trackId);
  const trackUrl = normalizeTrackUrl(preference?.trackUrl);
  const preferredStation = findCatalogStation(stations, preference);
  const candidates = preferredStation
    ? [preferredStation, ...stations.filter((station) => station !== preferredStation)]
    : stations;

  for (const station of candidates) {
    const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
    const track = tracks.find((item) => trackId && normalizeCatalogId(item?.id) === trackId)
      || tracks.find((item) => trackUrl && normalizeTrackUrl(item?.url) === trackUrl);
    if (track) return { station, track };
  }

  return null;
}

async function backfillProject200MusicReferences(userId, favorites, defaults) {
  const statements = [];
  favorites.forEach((favorite) => {
    if (!favorite.trackId || !favorite.trackUrl) return;
    statements.push(query(
      `update project200_music_favorites
          set station_id = $3,
              track_id = $4,
              station_name = $5,
              track_name = $6,
              track_url = $7,
              updated_at = now()
        where user_id = $1
          and (track_url = $2 or track_id = $4)`,
      [
        userId,
        favorite.legacyTrackUrl || favorite.trackUrl,
        favorite.stationId || null,
        favorite.trackId,
        favorite.stationName,
        favorite.trackName,
        favorite.trackUrl
      ]
    ).catch(() => null));
  });
  defaults.forEach((preference) => {
    if (preference.mode === "track" && !preference.trackId) return;
    if (preference.mode === "station" && !preference.stationId) return;
    statements.push(query(
      `update project200_music_task_defaults
          set station_id = $3,
              track_id = $4,
              station_name = $5,
              track_name = $6,
              track_url = $7,
              updated_at = now()
        where user_id = $1
          and task_title = $2`,
      [
        userId,
        preference.taskTitle,
        preference.stationId || null,
        preference.trackId || null,
        preference.stationName,
        preference.trackName || "",
        preference.trackUrl || ""
      ]
    ).catch(() => null));
  });
  await Promise.all(statements);
}

function sortTracksWithFavoritesFirst(tracks, favoriteUrlSet, favoriteIdSet) {
  return [...tracks].sort((left, right) => {
    const leftId = normalizeCatalogId(left?.id);
    const rightId = normalizeCatalogId(right?.id);
    const leftFavorite = (leftId && favoriteIdSet.has(leftId)) || favoriteUrlSet.has(normalizeTrackUrl(left?.url));
    const rightFavorite = (rightId && favoriteIdSet.has(rightId)) || favoriteUrlSet.has(normalizeTrackUrl(right?.url));

    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1;
    }

    return normalizeTrackName(left?.name).localeCompare(normalizeTrackName(right?.name), "pt-BR");
  });
}

export async function getProject200MusicStationsForUser({ userId = null, stations = [] } = {}) {
  const normalizedStations = Array.isArray(stations) ? stations : [];

  if (!userId) {
    return {
      stations: normalizedStations,
      preferences: {
        favoriteTrackUrls: [],
        favoriteTrackIds: [],
        defaults: []
      }
    };
  }

  const preferences = await getProject200MusicPreferences(userId);
  const resolvedFavorites = preferences.favorites.map((favorite) => {
    const match = findCatalogTrack(normalizedStations, favorite);
    if (!match) return favorite;
    return {
      legacyTrackUrl: favorite.trackUrl,
      stationId: normalizeCatalogId(match.station?.id),
      trackId: normalizeCatalogId(match.track?.id),
      stationName: normalizeStationName(match.station?.name),
      trackName: normalizeTrackName(match.track?.name),
      trackUrl: normalizeTrackUrl(match.track?.url)
    };
  });
  const resolvedDefaults = preferences.defaults.map((preference) => {
    if (preference.mode === "station") {
      const station = findCatalogStation(normalizedStations, preference);
      return station ? {
        ...preference,
        stationId: normalizeCatalogId(station?.id),
        stationName: normalizeStationName(station?.name)
      } : preference;
    }
    const match = findCatalogTrack(normalizedStations, preference);
    return match ? {
      ...preference,
      stationId: normalizeCatalogId(match.station?.id),
      trackId: normalizeCatalogId(match.track?.id),
      stationName: normalizeStationName(match.station?.name),
      trackName: normalizeTrackName(match.track?.name),
      trackUrl: normalizeTrackUrl(match.track?.url)
    } : preference;
  });

  await backfillProject200MusicReferences(userId, resolvedFavorites, resolvedDefaults);

  const favoriteUrlSet = new Set(resolvedFavorites.map((item) => item.trackUrl).filter(Boolean));
  const favoriteIdSet = new Set(resolvedFavorites.map((item) => item.trackId).filter(Boolean));
  const defaultTrackByTaskTitle = new Map(resolvedDefaults.map((item) => [item.taskTitle, item]));

  return {
    stations: normalizedStations.map((station) => {
      const stationId = normalizeCatalogId(station?.id);
      const stationName = normalizeStationName(station?.name);
      const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
      const orderedTracks = sortTracksWithFavoritesFirst(tracks, favoriteUrlSet, favoriteIdSet).map((track) => {
        const trackId = normalizeCatalogId(track?.id);
        const trackUrl = normalizeTrackUrl(track?.url);
        const taskTitles = resolvedDefaults
          .filter((entry) => entry.mode === "track" && ((trackId && entry.trackId === trackId) || entry.trackUrl === trackUrl))
          .map((entry) => entry.taskTitle);

        return {
          ...track,
          id: trackId,
          stationId,
          stationName,
          isFavorite: (trackId && favoriteIdSet.has(trackId)) || favoriteUrlSet.has(trackUrl),
          defaultTaskTitles: taskTitles
        };
      });

      return {
        ...station,
        id: stationId,
        name: stationName,
        tracks: orderedTracks
      };
    }),
    preferences: {
      favoriteTrackUrls: [...favoriteUrlSet],
      favoriteTrackIds: [...favoriteIdSet],
      defaults: resolvedDefaults,
      defaultTrackByTaskTitle: Object.fromEntries(defaultTrackByTaskTitle.entries())
    }
  };
}

export async function toggleProject200MusicFavorite({ userId, stationId, trackId, stationName, trackName, trackUrl, favorite }) {
  if (!userId) {
    throw new Error("Entre na conta para salvar favoritos.");
  }

  const safeStationId = normalizeCatalogId(stationId);
  const safeTrackId = normalizeCatalogId(trackId);
  const safeStationName = normalizeStationName(stationName);
  const safeTrackName = normalizeTrackName(trackName);
  const safeTrackUrl = normalizeTrackUrl(trackUrl);
  const shouldFavorite = Boolean(favorite);

  if (!safeTrackUrl) {
    throw new Error("Escolha uma musica valida.");
  }

  await ensureProject200MusicSchema();

  await query(
    `delete from project200_music_favorites
      where user_id = $1
        and ((track_id is not null and track_id = $2) or track_url = $3)`,
    [userId, safeTrackId, safeTrackUrl]
  );

  if (shouldFavorite) {
    await query(
      `insert into project200_music_favorites
        (user_id, station_id, track_id, station_name, track_name, track_url)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, safeStationId || null, safeTrackId || null, safeStationName, safeTrackName, safeTrackUrl]
    );
  }

  const preferences = await getProject200MusicPreferences(userId);
  return {
    favoriteTrackUrls: preferences.favoriteTrackUrls,
    favoriteTrackIds: preferences.favoriteTrackIds
  };
}

export async function setProject200MusicTaskDefault({ userId, taskTitle, mode, stationId, trackId, stationName, trackName, trackUrl }) {
  if (!userId) {
    throw new Error("Entre na conta para salvar o padrao.");
  }

  const safeTaskTitle = normalizeTaskTitle(taskTitle);
  const safeMode = normalizeDefaultMode(mode);
  const safeStationId = normalizeCatalogId(stationId);
  const safeTrackId = normalizeCatalogId(trackId);
  const safeStationName = normalizeStationName(stationName);
  const safeTrackName = normalizeText(trackName);
  const safeTrackUrl = normalizeTrackUrl(trackUrl);

  if (!safeTaskTitle) {
    throw new Error("Informe o nome da tarefa atual.");
  }

  if (safeMode === "track" && !safeTrackUrl) {
    throw new Error("Escolha uma musica valida.");
  }

  await ensureProject200MusicSchema();

  await query(
    `insert into project200_music_task_defaults
      (user_id, task_title, default_mode, station_id, track_id, station_name, track_name, track_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (user_id, task_title) do update
       set default_mode = excluded.default_mode,
           station_id = excluded.station_id,
           track_id = excluded.track_id,
           station_name = excluded.station_name,
           track_name = excluded.track_name,
           track_url = excluded.track_url,
           updated_at = now()`,
    [
      userId,
      safeTaskTitle,
      safeMode,
      safeStationId || null,
      safeTrackId || null,
      safeStationName,
      safeTrackName,
      safeTrackUrl
    ]
  );

  return {
    defaults: (await getProject200MusicPreferences(userId)).defaults
  };
}
