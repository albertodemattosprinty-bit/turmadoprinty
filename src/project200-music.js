import { query } from "./db.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTrackUrl(value) {
  return normalizeText(value);
}

function normalizeTrackName(value) {
  return normalizeText(value) || "Faixa";
}

function normalizeDefaultMode(value) {
  return normalizeText(value).toLowerCase() === "station" ? "station" : "track";
}

function normalizeStationName(value) {
  return normalizeText(value) || "Estação";
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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, track_url)
    );
  `);
  await query("create index if not exists idx_project200_music_favorites_user_time on project200_music_favorites(user_id, updated_at desc);");

  await query(`
    create table if not exists project200_music_task_defaults (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      task_title text not null,
      default_mode text not null default 'track',
      station_name text not null,
      track_name text not null,
      track_url text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, task_title)
    );
  `);
  await query("alter table project200_music_task_defaults add column if not exists default_mode text not null default 'track';");
  await query("create index if not exists idx_project200_music_task_defaults_user_time on project200_music_task_defaults(user_id, updated_at desc);");
}

export async function getProject200MusicPreferences(userId) {
  if (!userId) {
    return {
      favoriteTrackUrls: [],
      defaults: []
    };
  }

  await ensureProject200MusicSchema();

  const [favoritesResult, defaultsResult] = await Promise.all([
    query(
      `select station_name, track_name, track_url from project200_music_favorites where user_id = $1 order by updated_at desc`,
      [userId]
    ),
    query(
      `select task_title, default_mode, station_name, track_name, track_url from project200_music_task_defaults where user_id = $1 order by updated_at desc`,
      [userId]
    )
  ]);

  return {
    favoriteTrackUrls: favoritesResult.rows.map((row) => normalizeTrackUrl(row.track_url)).filter(Boolean),
    defaults: defaultsResult.rows.map((row) => ({
      taskTitle: normalizeTaskTitle(row.task_title),
      mode: normalizeDefaultMode(row.default_mode),
      stationName: normalizeStationName(row.station_name),
      trackName: normalizeText(row.track_name),
      trackUrl: normalizeTrackUrl(row.track_url)
    })).filter((row) => row.taskTitle && (row.mode === "station" ? row.stationName : row.trackUrl))
  };
}

function sortTracksWithFavoritesFirst(tracks, favoriteSet) {
  return [...tracks].sort((left, right) => {
    const leftFavorite = favoriteSet.has(normalizeTrackUrl(left?.url));
    const rightFavorite = favoriteSet.has(normalizeTrackUrl(right?.url));

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
        defaults: []
      }
    };
  }

  const preferences = await getProject200MusicPreferences(userId);
  const favoriteSet = new Set(preferences.favoriteTrackUrls);
  const defaultTrackByTaskTitle = new Map(preferences.defaults.map((item) => [item.taskTitle, item]));

  return {
    stations: normalizedStations.map((station) => {
      const stationName = normalizeStationName(station?.name);
      const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
      const orderedTracks = sortTracksWithFavoritesFirst(tracks, favoriteSet).map((track) => {
        const trackUrl = normalizeTrackUrl(track?.url);
        const taskTitles = preferences.defaults
          .filter((entry) => entry.mode === "track" && entry.trackUrl === trackUrl)
          .map((entry) => entry.taskTitle);

        return {
          ...track,
          stationName,
          isFavorite: favoriteSet.has(trackUrl),
          defaultTaskTitles: taskTitles
        };
      });

      return {
        ...station,
        name: stationName,
        tracks: orderedTracks
      };
    }),
    preferences: {
      favoriteTrackUrls: preferences.favoriteTrackUrls,
      defaults: preferences.defaults,
      defaultTrackByTaskTitle: Object.fromEntries(defaultTrackByTaskTitle.entries())
    }
  };
}

export async function toggleProject200MusicFavorite({ userId, stationName, trackName, trackUrl, favorite }) {
  if (!userId) {
    throw new Error("Entre na conta para salvar favoritos.");
  }

  const safeStationName = normalizeStationName(stationName);
  const safeTrackName = normalizeTrackName(trackName);
  const safeTrackUrl = normalizeTrackUrl(trackUrl);
  const shouldFavorite = Boolean(favorite);

  if (safeMode === "track" && !safeTrackUrl) {
    throw new Error("Escolha uma música válida.");
  }

  await ensureProject200MusicSchema();

  if (!shouldFavorite) {
    await query(
      `delete from project200_music_favorites where user_id = $1 and track_url = $2`,
      [userId, safeTrackUrl]
    );
    return {
      favoriteTrackUrls: (await getProject200MusicPreferences(userId)).favoriteTrackUrls
    };
  }

  await query(
    `
      insert into project200_music_favorites (user_id, station_name, track_name, track_url)
      values ($1, $2, $3, $4)
      on conflict (user_id, track_url) do update
        set station_name = excluded.station_name,
            track_name = excluded.track_name,
            updated_at = now()
    `,
    [userId, safeStationName, safeTrackName, safeTrackUrl]
  );

  return {
    favoriteTrackUrls: (await getProject200MusicPreferences(userId)).favoriteTrackUrls
  };
}

export async function setProject200MusicTaskDefault({ userId, taskTitle, mode, stationName, trackName, trackUrl }) {
  if (!userId) {
    throw new Error("Entre na conta para salvar o padrão.");
  }

  const safeTaskTitle = normalizeTaskTitle(taskTitle);
  const safeMode = normalizeDefaultMode(mode);
  const safeStationName = normalizeStationName(stationName);
  const safeTrackName = normalizeText(trackName);
  const safeTrackUrl = normalizeTrackUrl(trackUrl);

  if (!safeTaskTitle) {
    throw new Error("Informe o nome da tarefa atual.");
  }

  if (safeMode === "track" && !safeTrackUrl) {
    throw new Error("Escolha uma música válida.");
  }

  await ensureProject200MusicSchema();

  await query(
    `
      insert into project200_music_task_defaults (user_id, task_title, default_mode, station_name, track_name, track_url)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (user_id, task_title) do update
        set default_mode = excluded.default_mode,
            station_name = excluded.station_name,
            track_name = excluded.track_name,
            track_url = excluded.track_url,
            updated_at = now()
    `,
    [userId, safeTaskTitle, safeMode, safeStationName, safeTrackName, safeTrackUrl]
  );

  return {
    defaults: (await getProject200MusicPreferences(userId)).defaults
  };
}
