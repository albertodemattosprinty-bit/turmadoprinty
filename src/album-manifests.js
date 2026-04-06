import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function normalizeTrack(item, index) {
  const number = Number(item?.number) || index + 1;
  const code = String(item?.code || number).padStart(3, "0");
  const title = typeof item?.title === "string" && item.title.trim()
    ? item.title.trim()
    : typeof item?.label === "string" && item.label.trim()
      ? item.label.trim()
      : `Faixa ${code}`;
  const type = String(item?.type || "full").trim().toLowerCase() === "playback" ? "playback" : "full";

  return {
    number,
    code,
    title,
    type,
    durationSeconds: Number(item?.durationSeconds) || 0,
    publicUrl: typeof item?.publicUrl === "string" ? item.publicUrl : "",
    playbackTrackNumber: Number.isInteger(Number(item?.playbackTrackNumber)) ? Number(item.playbackTrackNumber) : null,
    playbackTrackCode: typeof item?.playbackTrackCode === "string" && item.playbackTrackCode.trim() ? item.playbackTrackCode.trim() : null,
    lyrics: typeof item?.lyrics === "string" ? item.lyrics : ""
  };
}

function normalizeLyricsZipUrl(value) {
  if (typeof value !== "string") {
    return "[none]";
  }

  const normalized = value.trim();
  return normalized ? normalized : "[none]";
}

function normalizeAlbumZipUrl(value) {
  if (typeof value !== "string") {
    return "[none]";
  }

  const normalized = value.trim();
  return normalized ? normalized : "[none]";
}

export function createAlbumManifestStore({ rootDir }) {
  const manifestsDir = path.join(rootDir, "albuns-json");

  async function readOptionalJson(filePath) {
    try {
      await access(filePath);
      return JSON.parse(await readFile(filePath, "utf8"));
    } catch {
      return null;
    }
  }

  function getManifestPath(albumName) {
    return path.join(manifestsDir, `${albumName}.json`);
  }

  async function readAlbumManifest(albumName, trackCount) {
    const payload = await readOptionalJson(getManifestPath(albumName));
    const rawTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
    const lyricsZipUrl = normalizeLyricsZipUrl(payload?.lyricsZipUrl);
    const albumZipUrl = normalizeAlbumZipUrl(payload?.albumZipUrl);

    if (!rawTracks.length) {
      return {
        albumZipUrl,
        lyricsZipUrl,
        tracks: Array.from({ length: trackCount }, (_, index) => normalizeTrack({}, index))
      };
    }

    return {
      albumZipUrl,
      lyricsZipUrl,
      tracks: rawTracks.slice(0, trackCount).map((item, index) => normalizeTrack(item, index))
    };
  }

  async function writeAlbumManifest(albumName, tracks, options = {}) {
    await mkdir(manifestsDir, { recursive: true });
    const currentManifest = await readOptionalJson(getManifestPath(albumName));
    const albumZipUrl = normalizeAlbumZipUrl(options.albumZipUrl ?? currentManifest?.albumZipUrl);
    const lyricsZipUrl = normalizeLyricsZipUrl(options.lyricsZipUrl ?? currentManifest?.lyricsZipUrl);
    const nextTracks = tracks
      .map((item, index) => normalizeTrack(item, index))
      .sort((left, right) => left.number - right.number)
      .map((track) => {
        const payload = {
          number: track.number,
          code: track.code,
          title: track.title,
          type: track.type,
          durationSeconds: track.durationSeconds,
          publicUrl: track.publicUrl
        };

        if (track.type === "full" && track.playbackTrackNumber) {
          payload.playbackTrackNumber = track.playbackTrackNumber;
        }

        if (track.type === "full" && track.playbackTrackCode) {
          payload.playbackTrackCode = track.playbackTrackCode;
        }

        if (track.lyrics) {
          payload.lyrics = track.lyrics;
        }

        return payload;
      });

    const manifest = {
      album: albumName,
      albumZipUrl,
      lyricsZipUrl,
      tracks: nextTracks
    };

    await writeFile(getManifestPath(albumName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  }

  return {
    readAlbumManifest,
    writeAlbumManifest
  };
}
