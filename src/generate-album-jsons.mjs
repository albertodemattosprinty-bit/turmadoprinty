import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "Conteúdo");
const outputDir = path.join(rootDir, "albuns-json");
const publicBaseUrl = "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev";
const MAX_PLAYBACK_VARIATION_SECONDS = 2;

const BITRATES = {
  V1L1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  V1L2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  V1L3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  V2L1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  V2L2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  V2L3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
};

const SAMPLE_RATES = {
  3: [44100, 48000, 32000, 0],
  2: [22050, 24000, 16000, 0],
  0: [11025, 12000, 8000, 0]
};

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getBitrateKey(versionBits, layerBits) {
  if (versionBits === 3 && layerBits === 3) return "V1L1";
  if (versionBits === 3 && layerBits === 2) return "V1L2";
  if (versionBits === 3 && layerBits === 1) return "V1L3";
  if ((versionBits === 2 || versionBits === 0) && layerBits === 3) return "V2L1";
  if ((versionBits === 2 || versionBits === 0) && layerBits === 2) return "V2L2";
  if ((versionBits === 2 || versionBits === 0) && layerBits === 1) return "V2L3";
  return "";
}

function getSamplesPerFrame(versionBits, layerBits) {
  if (layerBits === 3) return 384;
  if (layerBits === 2) return 1152;
  if (layerBits === 1) return versionBits === 3 ? 1152 : 576;
  return 0;
}

function getFrameLength(versionBits, layerBits, bitrate, sampleRate, paddingBit) {
  if (layerBits === 3) {
    return Math.floor(((12 * bitrate * 1000) / sampleRate + paddingBit) * 4);
  }

  if (layerBits === 2) {
    return Math.floor((144 * bitrate * 1000) / sampleRate + paddingBit);
  }

  if (layerBits === 1) {
    const coefficient = versionBits === 3 ? 144 : 72;
    return Math.floor((coefficient * bitrate * 1000) / sampleRate + paddingBit);
  }

  return 0;
}

async function getMp3DurationSeconds(filePath) {
  const buffer = await fs.readFile(filePath);
  let offset = 0;

  if (buffer.length >= 10 && buffer.toString("utf8", 0, 3) === "ID3") {
    const id3Size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + id3Size;
  }

  let durationSeconds = 0;

  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32BE(offset);
    const sync = (header >>> 21) & 0x7ff;

    if (sync !== 0x7ff) {
      offset += 1;
      continue;
    }

    const versionBits = (header >>> 19) & 0x3;
    const layerBits = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    const paddingBit = (header >>> 9) & 0x1;

    if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
      offset += 1;
      continue;
    }

    const bitrateKey = getBitrateKey(versionBits, layerBits);
    const bitrate = BITRATES[bitrateKey]?.[bitrateIndex] || 0;
    const sampleRate = SAMPLE_RATES[versionBits]?.[sampleRateIndex] || 0;
    const samplesPerFrame = getSamplesPerFrame(versionBits, layerBits);
    const frameLength = getFrameLength(versionBits, layerBits, bitrate, sampleRate, paddingBit);

    if (!bitrate || !sampleRate || !samplesPerFrame || !frameLength) {
      offset += 1;
      continue;
    }

    durationSeconds += samplesPerFrame / sampleRate;
    offset += frameLength;
  }

  return Number(durationSeconds.toFixed(2));
}

function buildPublicUrl(albumName, fileName) {
  return `${publicBaseUrl}/${encodeURIComponent(albumName)}/mp3/${encodeURIComponent(fileName)}`;
}

function createTrackEntry(albumName, fileName, durationSeconds) {
  const number = Number.parseInt(path.parse(fileName).name, 10);
  const code = path.parse(fileName).name.padStart(3, "0");

  return {
    number,
    code,
    title: `Música ${number}`,
    type: "full",
    durationSeconds,
    publicUrl: buildPublicUrl(albumName, fileName)
  };
}

function applyFixedLouvoresPattern(tracks) {
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];

    if (track.number >= 11 && track.number <= 20) {
      track.type = "playback";
      continue;
    }

    if (track.number >= 1 && track.number <= 10) {
      const playbackTrack = tracks.find((item) => item.number === track.number + 10);
      if (playbackTrack) {
        track.playbackTrackNumber = playbackTrack.number;
        track.playbackTrackCode = playbackTrack.code;
      }
    }
  }
}

function applyFixedDatasPattern(tracks) {
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];

    if (track.number >= 10 && track.number <= 18) {
      track.type = "playback";
      continue;
    }

    if (track.number >= 1 && track.number <= 9) {
      const playbackTrack = tracks.find((item) => item.number === track.number + 9);
      if (playbackTrack) {
        track.playbackTrackNumber = playbackTrack.number;
        track.playbackTrackCode = playbackTrack.code;
      }
    }
  }
}

function applyDurationBasedPattern(tracks) {
  const midpoint = Math.ceil(tracks.length / 2);

  for (let index = 0; index < midpoint; index += 1) {
    const fullTrack = tracks[index];
    const playbackCandidate = tracks[index + midpoint];

    if (!playbackCandidate) {
      continue;
    }

    const difference = Math.abs((fullTrack.durationSeconds || 0) - (playbackCandidate.durationSeconds || 0));
    if (difference > MAX_PLAYBACK_VARIATION_SECONDS) {
      continue;
    }

    playbackCandidate.type = "playback";
    fullTrack.playbackTrackNumber = playbackCandidate.number;
    fullTrack.playbackTrackCode = playbackCandidate.code;
  }
}

function classifyTracks(albumName, tracks) {
  const normalizedAlbumName = normalizeName(albumName);

  if (normalizedAlbumName.startsWith("louvores da garotada")) {
    applyFixedLouvoresPattern(tracks);
    return;
  }

  if (normalizedAlbumName.startsWith("datas comemorativas") && normalizedAlbumName !== "datas comemorativas 3") {
    applyFixedDatasPattern(tracks);
    return;
  }

  applyDurationBasedPattern(tracks);
}

async function buildAlbumJson(albumName) {
  const albumDir = path.join(contentDir, albumName, "mp3");
  const fileNames = (await fs.readdir(albumDir))
    .filter((fileName) => path.extname(fileName).toLowerCase() === ".mp3")
    .sort((left, right) => left.localeCompare(right, "pt-BR", { numeric: true }));

  const tracks = [];

  for (const fileName of fileNames) {
    const filePath = path.join(albumDir, fileName);
    const durationSeconds = await getMp3DurationSeconds(filePath);
    tracks.push(createTrackEntry(albumName, fileName, durationSeconds));
  }

  classifyTracks(albumName, tracks);

  return {
    album: albumName,
    tracks
  };
}

async function main() {
  const albumNames = (await fs.readdir(contentDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  await fs.mkdir(outputDir, { recursive: true });

  for (const albumName of albumNames) {
    const albumJson = await buildAlbumJson(albumName);
    const outputPath = path.join(outputDir, `${albumName}.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(albumJson, null, 2)}\n`, "utf8");
  }

  console.log(`Gerados ${albumNames.length} arquivos JSON em ${outputDir}`);
}

await main();
