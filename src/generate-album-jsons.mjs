import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "Conte\u00fado");
const outputDir = path.join(rootDir, "albuns-json");
const publicBaseUrl = "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev";
const maxPlaybackVariationSeconds = 2;
const allowedSupportExtensions = new Set([".pdf", ".txt", ".docx", ".doc"]);
const genericFileKeywords = [
  "cifra",
  "cifras",
  "texto",
  "textos",
  "letras e musicas",
  "letras",
  "musicas",
  "musicas e letras",
  "partitura",
  "partituras",
  "trilhagem",
  "sonoplastia",
  "guia de producao",
  "tom original",
  "tom sugestao",
  "thumbs",
  "faixa"
];

const albumLyricsZipUrls = {
  "Datas Comemorativas 1": "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/lyrics/Datas%20Comemorativas%201.zip",
  "É Natal": "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/lyrics/%C3%89%20Natal.zip"
};

const bitrates = {
  V1L1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  V1L2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  V1L3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  V2L1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  V2L2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  V2L3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
};

const sampleRates = {
  3: [44100, 48000, 32000, 0],
  2: [22050, 24000, 16000, 0],
  0: [11025, 12000, 8000, 0]
};

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isGenericName(value) {
  const normalized = normalizeName(value);
  return genericFileKeywords.some((keyword) => normalized.includes(keyword));
}

function cleanCandidateTitle(value) {
  return String(value || "")
    .replace(/\.[^.]+$/u, "")
    .replace(/[_]/g, " ")
    .replace(/\s*-\s*[^-]*(?:\d{3,4}|\(\d+\)).*$/u, "")
    .replace(/\s+-\s+(?:a4|a5|final|ltr|cfr|prt|playback|pb|voz|instrumental).*$/iu, "")
    .replace(/\(\d+\)$/u, "")
    .replace(/\s+\d{3,4}$/u, "")
    .replace(/\s+\(([^)]+)\)$/u, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\d.\-)\s]+/u, "")
    .trim();
}

function isChordToken(token) {
  return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?$/iu.test(token);
}

function isLikelyChordLine(value) {
  const tokens = String(value || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  return tokens.length >= 2 && tokens.every((token) => isChordToken(token));
}

function isTitleCandidate(value) {
  const title = cleanCandidateTitle(value);
  const normalized = normalizeName(title);

  if (!title || title.length < 3 || title.length > 70) {
    return false;
  }

  if (isGenericName(title)) {
    return false;
  }

  if (/^faixa\s*\d+$/iu.test(title) || /^textos?$/iu.test(title)) {
    return false;
  }

  if (/^\d+$/u.test(title) || /[?;:]$/u.test(title) || /^[A-Z]-\s/u.test(title)) {
    return false;
  }

  if (/\b000\d\b/u.test(title) || normalized === "fim") {
    return false;
  }

  if (/^[a-z]/u.test(title)) {
    return false;
  }

  if (isLikelyChordLine(title)) {
    return false;
  }

  return title.split(/\s+/u).length <= 10;
}

function pushUniqueTitle(target, seen, value) {
  const title = cleanCandidateTitle(value);
  const normalized = normalizeName(title);

  if (!isTitleCandidate(title) || seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  target.push(title);
}

function extractTitlesFromTextContent(text) {
  const titles = [];
  const seen = new Set();
  const lines = String(text || "")
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n/u)
    .map((line) => cleanCandidateTitle(line))
    .filter(Boolean);

  for (const line of lines) {
    pushUniqueTitle(titles, seen, line);
  }

  return titles;
}

function extractSequentialTitlesFromTextContent(text) {
  const lines = String(text || "")
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n/u)
    .map((line) => cleanCandidateTitle(line))
    .filter(Boolean);
  const titles = [];
  const seen = new Set();

  function pushIfValid(value) {
    if (isTitleCandidate(value)) {
      pushUniqueTitle(titles, seen, value);
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const faixaMatch = current.match(/^faixa\s*(\d+)(?:\s*[-–.:]\s*(.+))?$/iu);

    if (faixaMatch) {
      if (faixaMatch[2]) {
        pushIfValid(faixaMatch[2]);
      } else {
        for (let lookahead = index + 1; lookahead <= index + 3 && lookahead < lines.length; lookahead += 1) {
          const candidate = lines[lookahead].replace(/^[\-–.:]+/u, "").trim();
          if (isTitleCandidate(candidate)) {
            pushIfValid(candidate);
            break;
          }
        }
      }

      continue;
    }

    const numberedTitleMatch = current.match(/^(\d+)\s*[.)-]\s*(.+)$/u);
    if (numberedTitleMatch) {
      pushIfValid(numberedTitleMatch[2]);
      continue;
    }

    if (/^\d+$/u.test(current)) {
      const next = lines[index + 1] || "";
      const secondNext = lines[index + 2] || "";
      const candidate = /^[\-–.:]+$/u.test(next) ? secondNext : next;
      pushIfValid(candidate);
    }
  }

  return titles;
}

function extractLeadingTitlesFromTextContent(text) {
  const lines = String(text || "")
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n/u)
    .map((line) => cleanCandidateTitle(line))
    .filter(Boolean);
  const titles = [];
  const seen = new Set();

  for (const line of lines) {
    if (/^faixa\s*\d+/iu.test(line) || /^(\d+)\s*[.)-]?$/u.test(line)) {
      break;
    }

    pushUniqueTitle(titles, seen, line);

    if (titles.length >= 3) {
      break;
    }
  }

  return titles;
}

async function extractDocxText(filePath) {
  const escapedPath = filePath.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${escapedPath}')
$entry = $zip.GetEntry('word/document.xml')
if ($entry -eq $null) { $zip.Dispose(); exit 0 }
$reader = New-Object System.IO.StreamReader($entry.Open())
$xml = $reader.ReadToEnd()
$reader.Dispose()
$zip.Dispose()
$xml
`;

  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });

  return result.status === 0 ? result.stdout || "" : "";
}

async function extractTitlesFromSupportFiles(albumName, fullTrackCount) {
  const outrosDir = path.join(contentDir, albumName, "outros");
  const files = (await fs.readdir(outrosDir).catch(() => [])).filter((fileName) =>
    allowedSupportExtensions.has(path.extname(fileName).toLowerCase())
  );
  const titles = [];
  const seen = new Set();

  for (const fileName of files) {
    const extension = path.extname(fileName).toLowerCase();
    const filePath = path.join(outrosDir, fileName);

    if (extension === ".txt") {
      const content = await fs.readFile(filePath, "utf8").catch(() => "");
      const leadingTitles = extractLeadingTitlesFromTextContent(content);
      const sequentialTitles = extractSequentialTitlesFromTextContent(content);

      for (const title of [...leadingTitles, ...sequentialTitles]) {
        pushUniqueTitle(titles, seen, title);
      }

      if (leadingTitles.length === 0 && sequentialTitles.length === 0) {
        for (const title of extractTitlesFromTextContent(content)) {
          pushUniqueTitle(titles, seen, title);
        }
      }
    }

    if (extension === ".docx") {
      const xmlText = await extractDocxText(filePath);
      const leadingTitles = extractLeadingTitlesFromTextContent(xmlText);
      const sequentialTitles = extractSequentialTitlesFromTextContent(xmlText);

      for (const title of [...leadingTitles, ...sequentialTitles]) {
        pushUniqueTitle(titles, seen, title);
      }

      if (leadingTitles.length === 0 && sequentialTitles.length === 0) {
        for (const title of extractTitlesFromTextContent(xmlText)) {
          pushUniqueTitle(titles, seen, title);
        }
      }
    }

    pushUniqueTitle(titles, seen, fileName);

    if (titles.length >= fullTrackCount) {
      return titles.slice(0, fullTrackCount);
    }
  }

  return titles.slice(0, fullTrackCount);
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
    const bitrate = bitrates[bitrateKey]?.[bitrateIndex] || 0;
    const sampleRate = sampleRates[versionBits]?.[sampleRateIndex] || 0;
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
    title: `Musica ${number}`,
    type: "full",
    durationSeconds,
    publicUrl: buildPublicUrl(albumName, fileName)
  };
}

function applyFixedLouvoresPattern(tracks) {
  for (const track of tracks) {
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
  for (const track of tracks) {
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
    if (difference > maxPlaybackVariationSeconds) {
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

async function applySupportFileTitles(albumName, tracks) {
  const fullTracks = tracks.filter((track) => track.type === "full");
  const titles = await extractTitlesFromSupportFiles(albumName, fullTracks.length);

  for (let index = 0; index < Math.min(fullTracks.length, titles.length); index += 1) {
    fullTracks[index].title = titles[index];
  }
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
  await applySupportFileTitles(albumName, tracks);

  return {
    album: albumName,
    lyricsZipUrl: albumLyricsZipUrls[albumName] || "[none]",
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
