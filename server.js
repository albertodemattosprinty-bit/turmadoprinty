import "./src/load-env.js";

import { createReadStream, existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDocument as getPdfDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import Stripe from "stripe";

import { albums } from "./src/albums.js";
import { createSession, createUser, findUserBySessionToken, findUserByUsername, parseBearerToken, verifyPassword } from "./src/auth.js";
import { deleteUserById, dismissAdminUserMessage, ensureAdminUsersSchema, getActiveAdminUserMessage, getUserContractorState, listUsersWithAdminData, recordNarrationUsage, recordTextTokenUsage, removeUserPlanOverride, saveUserReplyToAdminMessage, sendAdminUserMessage, setUserContractorStatus, setUserPlanOverride, touchUserPresence } from "./src/admin-users.js";
import { createAlbumManifestStore } from "./src/album-manifests.js";
import { canDownloadTrackForPlan } from "./src/access-rules.js";
import { hasDatabase, query } from "./src/db.js";
import { appendMiniChatMessages, createMiniChat, getMiniChatById, listMiniChats } from "./src/mini-chats.js";
import {
  claimNextMiniCourseJob,
  completeMiniCourseJob,
  createMiniCourse,
  createMiniCourseJob,
  deleteMiniCourse,
  failMiniCourseJob,
  getMiniCourseById,
  getMiniCourseJobDebug,
  getMiniCourseUserSummary,
  listMiniCourseJobs,
  listMiniCourses,
  resetRunningMiniCourseJobs,
  saveMiniCourseQuizResult,
  startMiniCourse,
  updateMiniCourseCover,
  updateMiniCourseVisibility,
  updateMiniCourseQuiz,
  updateMiniCourseJobProgress,
  updateMiniCourseProgress
} from "./src/mini-courses.js";
import { createMiniLessonPlan, deleteMiniLessonPlan, ensureMiniLessonPlansSchema, getMiniLessonPlanById, listMiniLessonPlans, updateMiniLessonPlan } from "./src/mini-plans.js";
import { clearMiniMediaSongPlayback, createMiniMediaSongAsset, deleteMiniMediaAlbumByLegacyId, deleteMiniMediaSongAsset, deleteMiniMediaSongByLegacyIds, getMiniMediaSongByLegacyIds, hydrateMiniMediaLibraryFromDatabase, listMiniMediaSongAssets, syncMiniMediaLibraryToDatabase, updateMiniMediaAlbumMetadata, updateMiniMediaSongLyrics, updateMiniMediaSongPlayback } from "./src/mini-media.js";
import { ensureMiniDocumentExists, insertMiniDocumentLinesAfter, replaceMiniDocumentLineRange, updateMiniDocumentLine } from "./src/mini-docs.js";
import { createEscreverParagraph, deleteEscreverParagraph, ensureEscreverSchema, listEscreverParagraphs } from "./src/escrever.js";
import { buildMiniSystemPrompt, MINI_MINISTRY_CONTEXT } from "./src/mini-prompts.js";
import { assignAlbumGrantToUser, createAlbumPurchaseRecord, createPlanSubscriptionRecord, ensurePaymentSchema, getAlbumRehearsalCodeForOwner, getUserAccessState, isActivePaymentStatus, isActiveSubscriptionStatus, isInactiveSubscriptionStatus, markAlbumPurchaseStatus, markPlanSubscriptionStatus, recordPaymentWebhookEvent, redeemAlbumRehearsalCode } from "./src/payments.js";
import { buildSubscriptionPlans, findSubscriptionPlanById } from "./src/plans.js";
import { createScheduleEntry, ensureSiteConfigSchema, getAlbumZipLinks, getScheduleEntries, getSiteContentSettings, getSitePricingSettings, saveAlbumZipLink, saveSiteContentSettings, saveSitePricingSettings, updateScheduleEntry } from "./src/site-config.js";
import { buildStoreProducts, findStoreProductById, formatPriceFromCents, slugifyAlbumName } from "./src/store.js";
import { createAllTermEntry, deleteAllTerms, deleteTermById, ensureAllTermsSchema, getAllTermById, getLatestTermByUserId, getTermQuestionOrder, listAllTermDates, listAllTermsByDate } from "./src/all-terms.js";
import { createQuickUserAction, createUserAction, deleteUserAction, ensureActionsSchema, extendQuickUserAction, getProject200RuntimeState, getUserActionById, listUserActions, setActionMusicDefaultByTitle, updateUserAction, updateUserActionStatus, updateUserActionStatusManual } from "./src/actions.js";
import { addPlatformBalance, createPlatformFinanceEntry, deletePlatformFinanceEntry, deletePlatformOccurrence, deletePlatformOccurrencesByFilter, ensurePlatformFinanceSchema, listPlatformFinanceByRange, payPlatformOccurrence, summarizePlatformFinanceMonth } from "./src/platform-finance.js";
import { abortProject200SleepSession, getProject200SleepSession, startProject200SleepSession, finishProject200SleepSession, listProject200SleepHistory, updateProject200SleepHistoryEntry } from "./src/project200-sleep.js";
import { ensureStatsSchema, getProject200StatsAspectConfig, getStatsGoals, getStatsSummary, updateProject200StatsAspectConfig, updateStatsGoals } from "./src/stats.js";
import { approveConstitutionVersion, createConstitutionVersion, ensureConstitutionSchema, listConstitutionVersions } from "./src/constitution.js";
import { createProject200SystemEvent, createProject200TextEntry, ensureProject200HistorySchema, listProject200History } from "./src/project200-history.js";
import { ensureProject200MusicSchema, getProject200MusicStationsForUser, setProject200MusicTaskDefault, toggleProject200MusicFavorite } from "./src/project200-music.js";
import { exportProject200DataToUser } from "./src/project200-export.js";
import { getProject200FinanceNotes, saveProject200FinanceNotes, summarizeProject200PersonalFinance } from "./src/project200-finance.js";
import { createExtraGoal, createExtraGoalVariant, deleteExtraGoal, deleteExtraGoalVariant, ensureExtraGoalsSchema, listExtraGoalsByScope, listExtraGoalVariants, summarizeExtraGoals, updateExtraGoal, updateExtraGoalProgress, updateExtraGoalVariant } from "./src/extra-goals.js";
import { createProject200Profile, deleteProject200Profile, listProject200ProfileNames, listProject200Profiles, normalizeStoredProject200ProfileName, PROJECT200_DEFAULT_PROFILE_NAME, resolveProject200ProfileName, reassignProject200ProfileTasks, updateProject200ProfileAvatar, updateProject200ProfileName, updateProject200ProfileSvgIcon } from "./src/project200-profiles.js";
import { buildProject200SvgSearchPrompt, findProject200SvgById, findProject200SvgCandidates } from "./src/project200-svg-icons.js";
import { acceptProject200FriendInvite, createProject200FriendInvite, ensureProject200FriendsSchema, getProject200FriendsSnapshot, recordProject200ActionPoints, rejectProject200FriendInvite, removeProject200ActionPoints } from "./src/project200-friends.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const CONTENT_BASE_URL = (process.env.CONTENT_BASE_URL || "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";
const OPENAI_INSTANT_MODEL = process.env.OPENAI_INSTANT_MODEL || "gpt-4.1-nano";
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "cedar", "marin"]);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const PROJECT200_TIME_ZONE = process.env.PROJECT200_TIME_ZONE || "America/Sao_Paulo";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const R2_ACCOUNT_ID = String(process.env.R2_ACCOUNT_ID || "").trim();
const R2_BUCKET_NAME = String(process.env.R2_BUCKET_NAME || "").trim();
const R2_ACCESS_KEY_ID = String(process.env.R2_ACCESS_KEY_ID || "").trim();
const R2_SECRET_ACCESS_KEY = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || CONTENT_BASE_URL).replace(/\/+$/, "");
const DEFAULT_SYSTEM_PROMPT = "Responda em portugues do Brasil, com tom humano, claro, respeitoso e direto. So use linguagem ou conteudo religioso se a pessoa pedir claramente ou trouxer esse contexto. Nao ofereca extras nem proximos passos que nao foram pedidos. Entregue exatamente o que a pessoa pediu, com etica, amizade e boa conversa.";
const ADMIN_IDENTITIES = new Set(["rosemattos", "lucasm", "albertomattos"]);
const ALBUM_ZIP_FOLDER = "album-zips";
const MAX_ALBUM_ZIP_BYTES = 150 * 1024 * 1024;
const MINI_COURSE_MODEL_CANDIDATES = ["gpt-5.1", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"];
const MINI_COURSE_COVERS_PREFIX = "mini/courses";
const MINI_MEDIA_LIBRARY_KEY = "mini/media/library.json";
const MINI_MEDIA_ALBUMS_PREFIX = "mini/media/albums";
const MINI_MEDIA_COVER_SYNC_PREFIX = "Capas/";
const MINI_MEDIA_IMAGE_MODELS = [
  { id: "gpt-image-2", label: "GPT Image 2" },
  { id: "gpt-image-1.5", label: "GPT Image 1.5" },
  { id: "gpt-image-1", label: "GPT Image 1" },
  { id: "gpt-image-1-mini", label: "GPT Image 1 Mini" }
];
const MAX_MINI_COURSE_COVER_BYTES = 15 * 1024 * 1024;
const MAX_MINI_MEDIA_COVER_BYTES = 15 * 1024 * 1024;
const MAX_MINI_MEDIA_TRACK_BYTES = 40 * 1024 * 1024;
const MAX_MINI_MEDIA_SCORE_BYTES = 30 * 1024 * 1024;
const MINI_DOC_KEY_ALL_DOCS = "all-docs";
const MINI_DOC_TITLE_ALL_DOCS = "AllDocs";

const publicDir = path.join(__dirname, "public");
const imagesDir = path.join(__dirname, "images");
const eduSongsDir = path.join(__dirname, "musicas Edu");
const contextFilePath = path.join(__dirname, "contexto.txt");
const contentDir = path.join(__dirname, "ConteÃºdo");
const albumManifestStore = createAlbumManifestStore({ rootDir: __dirname });
let cachedContextPrompt = "";
let r2Client = null;
let miniMediaDatabaseBootstrapped = false;

const eduDownloadFiles = {
  "abandona-no-lixao": {
    downloadName: "Abandona no lixao.mp3",
    fileName: "Abandona no lix\u00E3o.mp3"
  },
  "playback-abandona-no-lixao": {
    downloadName: "Playback abandona no lixao.mp3",
    fileName: "Playback abandona no lix\u00F5a.mp3"
  },
  "lindo-cachorrinho": {
    downloadName: "Lindo Cachorrinho.mp3",
    fileName: "Lindo Cachorrinho.mp3"
  },
  "playback-lindo-cachorrinho": {
    downloadName: "PlayBack Lindo Cachorrinho.mp3",
    fileName: "PlayBack Lindo Cachorrinho.mp3"
  }
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

const DEFAULT_RESPONSE_STYLE_PROMPT = "Responda de forma direta e natural, preferencialmente em ate 500 caracteres. So ultrapasse esse limite quando isso for realmente necessario para manter clareza ou utilidade.";
const DEFAULT_PREVIEW_MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_INSTANT_MAX_COMPLETION_TOKENS || 120);
const DEFAULT_FINAL_MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_FINAL_MAX_COMPLETION_TOKENS || 220);
const allowedCorsOrigins = new Set([
  "https://www.turmadoprinty.com.br",
  "https://turmadoprinty.com.br",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost"
]);

function normalizeAdminIdentity(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim()
    .toLowerCase();
}

function isAdminUser(user) {
  const username = normalizeAdminIdentity(user?.username);
  const name = normalizeAdminIdentity(user?.name);
  return ADMIN_IDENTITIES.has(username) || ADMIN_IDENTITIES.has(name);
}

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return false;
  }

  if (allowedCorsOrigins.has(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function applyCorsHeaders(request, response) {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin.trim() : "";

  if (!isAllowedCorsOrigin(origin)) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-File-Name, X-Track-Title, X-Track-Order, X-Page-Order, X-Model, X-Mini-Course-Catalog");
  response.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Disposition");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}


function sendSseEvent(response, eventName, payload) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function buildContentDisposition(filename) {
  const safeName = String(filename || "download.mp3");
  const fallback = safeName.replace(/[^\x20-\x7E]/g, "") || "download.mp3";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function buildAlbumZipKey(product) {
  return `${ALBUM_ZIP_FOLDER}/${slugifyAlbumName(product.name)}.zip`;
}

function buildAlbumZipPublicUrlFromKey(key) {
  return `${R2_PUBLIC_BASE_URL}/${String(key || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function buildPublicR2UrlFromKey(key) {
  return `${R2_PUBLIC_BASE_URL}/${String(key || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function buildProject200SvgAssetUrl(fileName) {
  return buildPublicR2UrlFromKey(`project200/svg-hub/${String(fileName || "").trim()}`);
}

async function listPublicR2AssetsByPrefix(prefix) {
  const normalizedPrefix = String(prefix || "").trim().replace(/^\/+/, "");
  if (!normalizedPrefix) {
    return [];
  }

  const client = getR2Client();
  const assets = [];
  let continuationToken;

  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: normalizedPrefix,
      ContinuationToken: continuationToken
    }));
    const objects = Array.isArray(result?.Contents) ? result.Contents : [];

    for (const item of objects) {
      const key = String(item?.Key || "").trim();
      if (!key || key.endsWith("/")) {
        continue;
      }

      const extension = path.posix.extname(key).toLowerCase();
      const fileName = path.posix.basename(key);
      assets.push({
        key,
        fileName,
        extension,
        url: buildAlbumZipPublicUrlFromKey(key)
      });
    }

    continuationToken = result?.IsTruncated ? result?.NextContinuationToken : undefined;
  } while (continuationToken);

  return assets.sort((first, second) => first.key.localeCompare(second.key, "pt-BR"));
}

function buildSafeDownloadBaseName(value, fallback = "arquivo") {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function getAlbumTrackLinesForPdf(track) {
  const syncLines = Array.isArray(track?.lyricsSyncData?.lines) ? track.lyricsSyncData.lines : [];
  if (syncLines.length) {
    return syncLines
      .map((line) => ({
        text: String(line?.text || "").trim(),
        characterId: String(line?.characterId || "").trim()
      }))
      .filter((line) => line.text);
  }

  return String(track?.lyrics || "")
    .split(/\r?\n/)
    .map((text) => ({
      text: String(text || "").trim(),
      characterId: ""
    }))
    .filter((line) => line.text);
}

function getTrackCharacterName(track, characterId) {
  if (!characterId) {
    return "";
  }
  const characters = Array.isArray(track?.albumCharacters) ? track.albumCharacters : [];
  const match = characters.find((item) => String(item?.id || "") === String(characterId));
  return String(match?.name || "").trim();
}

function wrapPdfText(text, maxChars = 86) {
  const source = String(text || "").trim();
  if (!source) {
    return [""];
  }

  const words = source.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function buildAlbumPdfBuffer(albumDetail) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = { width: 595.28, height: 841.89 };
  const marginX = 46;
  const marginTop = 54;
  const marginBottom = 44;
  const textColor = rgb(0.24, 0.26, 0.29);
  const softBackground = rgb(0.985, 0.985, 0.975);
  const dividerColor = rgb(0.9, 0.91, 0.92);

  let page = pdf.addPage([pageSize.width, pageSize.height]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
    color: softBackground
  });

  let cursorY = pageSize.height - marginTop;

  const ensureSpace = (heightNeeded = 24) => {
    if (cursorY - heightNeeded >= marginBottom) {
      return;
    }
    page = pdf.addPage([pageSize.width, pageSize.height]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
      color: softBackground
    });
    cursorY = pageSize.height - marginTop;
  };

  const drawLine = (text, {
    font = regularFont,
    size = 12,
    color = textColor,
    lineGap = 6
  } = {}) => {
    ensureSpace(size + lineGap);
    page.drawText(String(text || ""), {
      x: marginX,
      y: cursorY,
      size,
      font,
      color
    });
    cursorY -= size + lineGap;
  };

  drawLine(albumDetail?.name || "Album", {
    font: boldFont,
    size: 24,
    lineGap: 14
  });

  for (const track of Array.isArray(albumDetail?.tracks) ? albumDetail.tracks : []) {
    ensureSpace(42);
    page.drawLine({
      start: { x: marginX, y: cursorY + 10 },
      end: { x: pageSize.width - marginX, y: cursorY + 10 },
      thickness: 1,
      color: dividerColor
    });
    cursorY -= 18;

    drawLine(track?.title || track?.label || `Faixa ${track?.number || ""}`, {
      font: boldFont,
      size: 18,
      lineGap: 10
    });

    const lines = getAlbumTrackLinesForPdf(track);
    if (!lines.length) {
      drawLine("Sem texto disponivel.", {
        size: 11,
        color: rgb(0.45, 0.46, 0.49),
        lineGap: 12
      });
      continue;
    }

    for (const line of lines) {
      const characterName = getTrackCharacterName(track, line.characterId);
      if (characterName) {
        drawLine(characterName, {
          size: 9,
          color: rgb(0.48, 0.49, 0.52),
          lineGap: 4
        });
      }
      for (const wrappedLine of wrapPdfText(line.text, 84)) {
        drawLine(wrappedLine, {
          size: 12,
          lineGap: 5
        });
      }
      cursorY -= 5;
    }

    cursorY -= 8;
  }

  return Buffer.from(await pdf.save());
}

async function fetchTrackDownloadAsset(track, albumName, trackNumber) {
  const assetResponse = await fetch(getTrackDownloadUrl(track, albumName, trackNumber));
  if (!assetResponse.ok) {
    throw new Error(`Nao foi possivel baixar a faixa ${track?.title || trackNumber}.`);
  }
  const buffer = Buffer.from(await assetResponse.arrayBuffer());
  return {
    buffer,
    contentType: assetResponse.headers.get("content-type") || "audio/mpeg"
  };
}

async function buildAlbumBundleZipBuffer(product, albumDetail, pdfBuffer) {
  const zip = new JSZip();
  const rootFolder = zip.folder(buildSafeDownloadBaseName(product?.name || "Album", "Album"));
  const audioFolder = rootFolder.folder("Audios");
  const textFolder = rootFolder.folder("Textos");

  textFolder.file("Pdf do Album.pdf", pdfBuffer, {
    binary: true
  });

  const tracks = Array.isArray(albumDetail?.tracks) ? albumDetail.tracks : [];
  for (const track of tracks) {
    const trackNumber = Number(track?.number || 0) || 0;
    const { buffer } = await fetchTrackDownloadAsset(track, product?.name || "", trackNumber);
    const fileName = `${String(trackNumber).padStart(3, "0")} - ${buildSafeDownloadBaseName(track?.title || track?.label || `Faixa ${trackNumber}`, `Faixa ${trackNumber}`)}.mp3`;
    audioFolder.file(fileName, buffer, {
      binary: true
    });
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

async function readR2ObjectText(key) {
  const client = getR2Client();

  try {
    const result = await client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key
    }));
    const body = result?.Body;
    if (!body) {
      return "";
    }
    if (typeof body.transformToString === "function") {
      return await body.transformToString("utf8");
    }

    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (error) {
    const statusCode = Number(error?.$metadata?.httpStatusCode || 0) || 0;
    if (statusCode === 404 || error?.name === "NoSuchKey" || /not exist/i.test(String(error?.message || ""))) {
      return "";
    }
    throw error;
  }
}

async function readR2ObjectBuffer(key) {
  const client = getR2Client();

  const result = await client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key
  }));
  const body = result?.Body;
  if (!body) {
    return Buffer.alloc(0);
  }
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sanitizeMiniMediaTitle(value, fallback = "Sem titulo") {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return text || fallback;
}

function getMiniMediaFileExtension(fileName, fallback = "") {
  const safeName = String(fileName || "").trim();
  const extension = path.extname(safeName).toLowerCase();
  if (extension && /^[.][a-z0-9]{1,8}$/i.test(extension)) {
    return extension;
  }
  return fallback;
}

function getMiniMediaContentType(fileName, fallback = "application/octet-stream") {
  const extension = getMiniMediaFileExtension(fileName);
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    default:
      return fallback;
  }
}

function isMiniMediaImageUpload(fileName, contentType) {
  const extension = getMiniMediaFileExtension(fileName);
  const safeContentType = String(contentType || "").trim().toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"].includes(extension)
    || safeContentType.startsWith("image/");
}

function isMiniMediaAudioUpload(fileName, contentType) {
  const extension = getMiniMediaFileExtension(fileName);
  const safeContentType = String(contentType || "").trim().toLowerCase();
  return [".mp3", ".wav", ".ogg", ".m4a", ".aac"].includes(extension)
    || safeContentType.startsWith("audio/");
}

function isMiniMediaScoreUpload(fileName, contentType) {
  const extension = getMiniMediaFileExtension(fileName);
  const safeContentType = String(contentType || "").trim().toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(extension)
    || safeContentType === "application/pdf"
    || safeContentType.startsWith("image/");
}

function normalizeMiniMediaSong(raw, index = 0) {
  const safeTitle = sanitizeMiniMediaTitle(raw?.title, `Faixa ${index + 1}`);
  return {
    id: String(raw?.id || `track-${index + 1}`).trim() || `track-${index + 1}`,
    globalId: String(raw?.globalId || "").trim(),
    title: safeTitle,
    subtitle: sanitizeMiniMediaTitle(raw?.subtitle || "Faixa do album", "Faixa do album"),
    key: String(raw?.key || "").trim(),
    playbackKey: String(raw?.playbackKey || "").trim(),
    playbackSongId: String(raw?.playbackSongId || "").trim(),
    lyricsKey: String(raw?.lyricsKey || "").trim(),
    lyricsText: String(raw?.lyricsText || "").trim(),
    lyricsSyncData: raw?.lyricsSyncData && typeof raw.lyricsSyncData === "object" ? raw.lyricsSyncData : null,
    lyricsUpdatedAt: raw?.lyricsUpdatedAt || null,
    scoreCount: Math.max(0, Number(raw?.scoreCount || 0) || 0),
    contentType: String(raw?.contentType || "").trim(),
    order: Math.max(0, Number(raw?.order || index) || index),
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null
  };
}

function normalizeMiniMediaAlbumCharacters(value) {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => ({
      id: String(item?.id || `character-${index + 1}`).trim() || `character-${index + 1}`,
      name: sanitizeMiniMediaTitle(item?.name || `Personagem ${index + 1}`, `Personagem ${index + 1}`),
      color: String(item?.color || "").trim(),
      group: String(item?.group || "").trim()
    }))
    .filter((item) => item.name && item.color);
}

function normalizeMiniMediaAlbum(raw, index = 0) {
  const songs = Array.isArray(raw?.songs) ? raw.songs.map((song, songIndex) => normalizeMiniMediaSong(song, songIndex)) : [];
  songs.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const metadata = raw?.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
    ? raw.metadata
    : {};
  const characters = normalizeMiniMediaAlbumCharacters(raw?.characters || metadata.characters);

  return {
    id: String(raw?.id || `album-${index + 1}`).trim() || `album-${index + 1}`,
    globalId: String(raw?.globalId || "").trim(),
    title: sanitizeMiniMediaTitle(raw?.title, `Album ${index + 1}`),
    subtitle: sanitizeMiniMediaTitle(raw?.subtitle || `${songs.length} musicas`, `${songs.length} musicas`),
    coverKey: String(raw?.coverKey || "").trim(),
    coverContentType: String(raw?.coverContentType || "").trim(),
    metadata: {
      ...metadata,
      characters
    },
    characters,
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
    songs
  };
}

function normalizeMiniMediaLibrary(raw) {
  const albums = Array.isArray(raw?.albums) ? raw.albums.map((album, index) => normalizeMiniMediaAlbum(album, index)) : [];
  return { albums };
}

function normalizeMiniMediaAlbumSongsOrder(album) {
  if (!album || !Array.isArray(album.songs)) {
    return;
  }
  album.songs = album.songs
    .map((song, index) => normalizeMiniMediaSong({
      ...song,
      order: Math.max(0, Number(song?.order ?? index) || index)
    }, index))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((song, index) => ({
      ...song,
      order: index
    }));
  album.subtitle = `${album.songs.length} musicas`;
}

function buildMiniMediaAlbumFolder(albumId) {
  return `${MINI_MEDIA_ALBUMS_PREFIX}/${String(albumId || "").trim()}`;
}

function buildMiniMediaTrackLyricsKey(albumId, trackId) {
  return `${buildMiniMediaAlbumFolder(albumId)}/lyrics/${String(trackId || "").trim()}.json`;
}

function buildMiniCourseCoverFolder(courseId) {
  return `${MINI_COURSE_COVERS_PREFIX}/${String(courseId || "").trim()}`;
}

function buildMiniMediaAlbumPayload(album, options = {}) {
  const includeExtended = options?.includeExtended === true;
  const coverImageUrl = album?.coverKey ? buildAlbumZipPublicUrlFromKey(album.coverKey) : "";
  const characters = normalizeMiniMediaAlbumCharacters(album?.characters || album?.metadata?.characters);
  const songs = Array.isArray(album?.songs) ? album.songs.map((song) => ({
    id: song.id,
    globalId: song.globalId || "",
    title: song.title,
    subtitle: song.subtitle,
    order: Math.max(0, Number(song.order || 0) || 0),
    url: song.key ? buildAlbumZipPublicUrlFromKey(song.key) : "",
    songJsonUrl: buildAlbumZipPublicUrlFromKey(`${buildMiniMediaAlbumFolder(album.id)}/songs/${song.globalId || song.id}/song.json`),
    playbackSongId: song.playbackSongId || "",
    playbackUrl: song.playbackSongId
      ? buildAlbumZipPublicUrlFromKey(album.songs.find((candidate) => candidate.globalId === song.playbackSongId)?.key || "")
      : (song.playbackKey ? buildAlbumZipPublicUrlFromKey(song.playbackKey) : ""),
    coverImageUrl,
    hasLyrics: Boolean(song.lyricsText || song.lyricsKey),
    ...(includeExtended ? { lyricsText: String(song.lyricsText || "").trim() } : {}),
    lyricsSyncData: song.lyricsSyncData && typeof song.lyricsSyncData === "object" ? song.lyricsSyncData : null,
    lyricsUpdatedAt: song.lyricsUpdatedAt || null,
    hasScores: Math.max(0, Number(song.scoreCount || 0) || 0) > 0,
    scoreCount: Math.max(0, Number(song.scoreCount || 0) || 0)
  })) : [];

  return {
    id: album.id,
    globalId: album.globalId || "",
    title: album.title,
    subtitle: album.subtitle || `${songs.length} musicas`,
    coverImageUrl,
    characters,
    songs
  };
}

function buildMiniMediaLibraryPayload(library, options = {}) {
  const normalized = normalizeMiniMediaLibrary(library);
  return {
    albums: normalized.albums.map((album) => buildMiniMediaAlbumPayload(album, options))
  };
}

async function loadMiniMediaLibrary() {
  const rawText = await readR2ObjectText(MINI_MEDIA_LIBRARY_KEY);
  let library = { albums: [] };
  if (rawText) {
    try {
      library = normalizeMiniMediaLibrary(JSON.parse(rawText));
    } catch {
      library = { albums: [] };
    }
  }
  let normalized = await syncMiniMediaLibraryFromCoverFolder(library);
  if (hasDatabase()) {
    try {
      if (!miniMediaDatabaseBootstrapped) {
        normalized = normalizeMiniMediaLibrary(await syncMiniMediaLibraryToDatabase(normalized));
        miniMediaDatabaseBootstrapped = true;
      } else {
        normalized = normalizeMiniMediaLibrary(await hydrateMiniMediaLibraryFromDatabase(normalized));
      }
    } catch (error) {
      console.error("Falha ao carregar a camada Postgres da biblioteca MINI:", error);
    }
  }
  return normalized;
}

async function persistMiniMediaLibraryDocuments(normalized) {
  const r2Client = getR2Client();
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: MINI_MEDIA_LIBRARY_KEY,
    Body: Buffer.from(JSON.stringify(normalized, null, 2), "utf8"),
    ContentType: "application/json; charset=utf-8"
  }));
  for (const album of normalized.albums) {
    const albumJsonKey = `${buildMiniMediaAlbumFolder(album.id)}/album.json`;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: albumJsonKey,
      Body: Buffer.from(JSON.stringify(album, null, 2), "utf8"),
      ContentType: "application/json; charset=utf-8"
    }));
    for (const song of album.songs) {
      let assets = [];
      if (hasDatabase() && song.globalId) {
        try {
          assets = await listMiniMediaSongAssets(song.globalId);
        } catch {
          assets = [];
        }
      }
      const songJsonKey = `${buildMiniMediaAlbumFolder(album.id)}/songs/${song.globalId || song.id}/song.json`;
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: songJsonKey,
        Body: Buffer.from(JSON.stringify({
          ...song,
          albumId: album.globalId || album.id,
          albumLegacyId: album.id,
          assets
        }, null, 2), "utf8"),
        ContentType: "application/json; charset=utf-8"
      }));
    }
  }
}

async function saveMiniMediaLibrary(library) {
  let normalized = normalizeMiniMediaLibrary(library);
  if (hasDatabase()) {
    try {
      normalized = normalizeMiniMediaLibrary(await syncMiniMediaLibraryToDatabase(normalized));
    } catch (error) {
      console.error("Falha ao sincronizar a biblioteca MINI com o Postgres:", error);
    }
  }
  await persistMiniMediaLibraryDocuments(normalized);
  return normalized;
}

async function loadMiniMediaTrackLyrics(key) {
  const rawText = await readR2ObjectText(key);
  if (!rawText) {
    return { lyrics: "", updatedAt: null };
  }
  try {
    const parsed = JSON.parse(rawText);
    return {
      lyrics: String(parsed?.lyrics || "").trim(),
      updatedAt: parsed?.updatedAt || null
    };
  } catch {
    return {
      lyrics: String(rawText || "").trim(),
      updatedAt: null
    };
  }
}

async function saveMiniMediaTrackLyrics(key, lyrics, updatedBy = "") {
  const payload = {
    lyrics: String(lyrics || "").trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy || "").trim() || null
  };
  await getR2Client().send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
    ContentType: "application/json; charset=utf-8"
  }));
  return payload;
}

async function buildMiniMediaScoreFiles(fileBuffer, fileName, contentType) {
  const extension = getMiniMediaFileExtension(fileName).toLowerCase();
  const isPdf = extension === ".pdf" || String(contentType || "").toLowerCase() === "application/pdf";
  let previewBuffer = null;
  let downloadPdfBuffer = null;

  if (isPdf) {
    downloadPdfBuffer = fileBuffer;
    try {
      const loadingTask = getPdfDocument({ data: new Uint8Array(fileBuffer) });
      const pdfDocument = await loadingTask.promise;
      const firstPage = await pdfDocument.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.6 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const canvasContext = canvas.getContext("2d");
      await firstPage.render({ canvasContext, viewport }).promise;
      previewBuffer = await sharp(canvas.toBuffer("image/png")).webp({ quality: 86 }).toBuffer();
      if (typeof loadingTask.destroy === "function") {
        await loadingTask.destroy();
      }
    } catch {
      previewBuffer = null;
    }
  } else {
    previewBuffer = await sharp(fileBuffer).webp({ quality: 86 }).toBuffer();
    const pdfImageBuffer = await sharp(fileBuffer).png().toBuffer();
    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(pdfImageBuffer);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    downloadPdfBuffer = Buffer.from(await pdf.save());
  }

  return {
    previewBuffer,
    downloadPdfBuffer
  };
}

function buildMiniMediaAssetPayload(asset) {
  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    pageOrder: asset.pageOrder,
    sourceUrl: asset.sourceKey ? buildAlbumZipPublicUrlFromKey(asset.sourceKey) : "",
    previewUrl: asset.previewKey ? buildAlbumZipPublicUrlFromKey(asset.previewKey) : "",
    downloadUrl: asset.downloadKey ? buildAlbumZipPublicUrlFromKey(asset.downloadKey) : "",
    sourceContentType: asset.sourceContentType,
    metadata: asset.metadata || {},
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt
  };
}

async function syncMiniMediaLibraryFromCoverFolder(library) {
  const normalized = normalizeMiniMediaLibrary(library);

  try {
    const client = getR2Client();
    const result = await client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: MINI_MEDIA_COVER_SYNC_PREFIX
    }));
    const objects = Array.isArray(result?.Contents) ? result.Contents : [];
    let changed = false;

    for (const item of objects) {
      const key = String(item?.Key || "").trim();
      if (!key || key.endsWith("/") || !/\.avif$/i.test(key)) {
        continue;
      }

      const fileName = path.posix.basename(key);
      const rawTitle = fileName.replace(/\.avif$/i, "");
      let decodedTitle = rawTitle;
      try {
        decodedTitle = decodeURIComponent(rawTitle);
      } catch {
        decodedTitle = rawTitle;
      }
      const title = sanitizeMiniMediaTitle(decodedTitle.replace(/[_-]+/g, " "), "");
      if (!title) {
        continue;
      }

      const existing = normalized.albums.find((album) => (
        String(album.coverKey || "").trim() === key
        || String(album.title || "").trim().toLowerCase() === title.toLowerCase()
      ));
      const now = new Date().toISOString();

      if (existing) {
        const currentCoverKey = String(existing.coverKey || "").trim();
        const currentCoverType = String(existing.coverContentType || "").trim().toLowerCase();
        const shouldKeepCustomCover = Boolean(
          currentCoverKey
          && currentCoverKey !== key
          && currentCoverType
          && currentCoverType !== "image/avif"
        );

        if (shouldKeepCustomCover) {
          continue;
        }

        if (currentCoverKey !== key || currentCoverType !== "image/avif") {
          existing.coverKey = key;
          existing.coverContentType = "image/avif";
          existing.updatedAt = now;
          changed = true;
        }
        continue;
      }

      const baseId = slugifyAlbumName(title) || `album-${Date.now()}`;
      let albumId = baseId;
      let suffix = 2;
      while (normalized.albums.some((album) => album.id === albumId)) {
        albumId = `${baseId}-${suffix}`;
        suffix += 1;
      }

      normalized.albums.push(normalizeMiniMediaAlbum({
        id: albumId,
        title,
        subtitle: "0 musicas",
        coverKey: key,
        coverContentType: "image/avif",
        createdAt: now,
        updatedAt: now,
        songs: []
      }));
      changed = true;
    }

    if (changed) {
      return saveMiniMediaLibrary(normalized);
    }
  } catch (_) {
    // Keep current library if cover sync fails.
  }

  return normalized;
}

function hasAlbumZip(album) {
  return Boolean(album?.albumZipUrl && album.albumZipUrl !== "[none]");
}

function resolveAlbumZipUrl(manifest, productId, albumZipLinks = {}) {
  const storedUrl = typeof albumZipLinks?.[productId]?.url === "string"
    ? albumZipLinks[productId].url.trim()
    : "";

  if (storedUrl) {
    return storedUrl;
  }

  return typeof manifest?.albumZipUrl === "string" && manifest.albumZipUrl.trim()
    ? manifest.albumZipUrl.trim()
    : "[none]";
}

function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Configure R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY para enviar ZIP.");
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    });
  }

  return r2Client;
}

async function listProject200MusicStations() {
  try {
    const radioStationsPath = path.join(__dirname, "public", "200", "radio-stations.json");
    const radioStationsRaw = await readFile(radioStationsPath, "utf8");
    const radioStationsData = JSON.parse(radioStationsRaw);
    const radioStations = Array.isArray(radioStationsData?.stations) ? radioStationsData.stations : [];
    const validStations = radioStations
      .filter((station) => Array.isArray(station?.tracks) && station.tracks.length > 0)
      .map((station) => ({
        name: String(station?.name || "").trim() || "Estação",
        tracks: station.tracks
          .filter((track) => String(track?.url || "").trim())
          .map((track) => ({
            name: String(track?.name || "Faixa").trim() || "Faixa",
            url: String(track?.url || "").trim()
          }))
      }));
    if (validStations.length) {
      return validStations;
    }
  } catch {
    // Fall through to R2-based discovery.
  }

  const prefix = "Music/";
  const fallbackStations = [
    { name: "Estação 1", tracks: [] },
    { name: "Estação 2", tracks: [] },
    { name: "Estação 3", tracks: [] },
    { name: "Estação 4", tracks: [] },
    { name: "Estação 5", tracks: [] }
  ];

  try {
    const client = getR2Client();
    const result = await client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix
    }));
    const objects = Array.isArray(result?.Contents) ? result.Contents : [];
    const grouped = new Map();
    for (const item of objects) {
      const key = String(item?.Key || "");
      if (!key || key.endsWith("/")) continue;
      const relative = key.slice(prefix.length);
      if (!relative) continue;
      const parts = relative.split("/").filter(Boolean);
      const stationName = parts.length > 1 ? parts[0] : "Estação 1";
      const fileName = parts[parts.length - 1];
      const trackNameRaw = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Faixa";
      if (!grouped.has(stationName)) grouped.set(stationName, []);
      grouped.get(stationName).push({
        key,
        name: trackNameRaw,
        url: buildAlbumZipPublicUrlFromKey(key)
      });
    }
    const stations = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([name, tracks]) => {
        const totals = tracks.reduce((map, track) => {
          map.set(track.name, Number(map.get(track.name) || 0) + 1);
          return map;
        }, new Map());
        const nameCount = new Map();
        const renamed = tracks.map((track) => {
          const clean = track.name;
          const count = Number(nameCount.get(clean) || 0) + 1;
          nameCount.set(clean, count);
          return {
            name: Number(totals.get(clean) || 0) > 1 ? `${clean} (${count})` : clean,
            url: track.url
          };
        });
        return { name, tracks: renamed };
      });
    return stations.length ? stations : fallbackStations;
  } catch {
    return fallbackStations;
  }
}

async function readApiResponse(response) {
  const rawText = await response.text();
  const text = rawText.trim();

  if (!text) {
    return { data: null, text: "" };
  }

  try {
    return {
      data: JSON.parse(text),
      text
    };
  } catch {
    return {
      data: null,
      text
    };
  }
}

async function readRawTextBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readBinaryBody(request, maxBytes = MAX_ALBUM_ZIP_BYTES) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (maxBytes > 0 && totalBytes > maxBytes) {
      throw new Error(`Arquivo acima do limite de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function readTextBody(request) {
  return (await readRawTextBody(request)).trim();
}

function getInstantModel(body) {
  const requested = typeof body?.instantModel === "string" ? body.instantModel.trim() : "";
  return requested || OPENAI_INSTANT_MODEL || OPENAI_MODEL;
}

function getFinalModel(body) {
  const requested = typeof body?.model === "string" ? body.model.trim() : "";
  return requested || OPENAI_MODEL;
}

function normalizeMiniInstantModel(value) {
  const requested = String(value || "").trim();
  if (!requested) {
    return "";
  }

  if (requested === "gpt-4.1-instant") {
    return "gpt-4.1-mini";
  }

  return requested;
}

function getMiniCourseGeneratorModels() {
  const unique = new Set();
  [
    "gpt-5.1",
    OPENAI_MODEL,
    OPENAI_INSTANT_MODEL,
    ...MINI_COURSE_MODEL_CANDIDATES
  ].forEach((value) => {
    const safe = String(value || "").trim();
    if (safe) {
      unique.add(safe);
    }
  });

  return Array.from(unique).map((id) => ({
    id,
    label: id.toUpperCase().replace(/^GPT-/, "GPT-")
  }));
}

function normalizeMiniCourseGeneratorModel(value) {
  const requested = normalizeMiniInstantModel(value);
  const available = getMiniCourseGeneratorModels().map((item) => item.id);
  return available.includes(requested) ? requested : "gpt-5.1";
}

function supportsReasoningEffortForModel(model) {
  return /^gpt-5/i.test(String(model || "").trim());
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMessageForHeuristics(message) {
  return String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isLikelyGibberishMessage(message) {
  const normalized = normalizeMessageForHeuristics(message);
  const compact = normalized.replace(/\s+/g, "");

  if (!compact) {
    return false;
  }

  if (compact.length <= 3 && /[^a-z0-9]/.test(compact) === false) {
    return true;
  }

  if (/^(.)\1{4,}$/.test(compact)) {
    return true;
  }

  if (/^[a-z]{4,12}$/.test(compact) && !/[aeiou]/.test(compact)) {
    return true;
  }

  if (/^[a-z0-9]{6,18}$/.test(compact) && !/[aeiou]/.test(compact) && !/\d/.test(compact.slice(0, 2))) {
    return true;
  }

  return false;
}

function buildFastFallbackReply(message) {
  if (isLikelyGibberishMessage(message)) {
    return "Acho que sua mensagem veio truncada ou aleatoria. Me envie de novo em uma frase curta e eu respondo bem mais rapido.";
  }

  return "";
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Envie a imagem em data URL base64.");
  }

  return {
    mimeType: match[1].trim().toLowerCase(),
    buffer: Buffer.from(match[2], "base64")
  };
}

function getUploadExtension(mimeType) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

async function saveBannerAsset(dataUrl, bannerKey) {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = getUploadExtension(mimeType);

  if (!extension) {
    throw new Error("Formato de banner nao suportado. Use PNG, JPG, WEBP ou SVG.");
  }

  if (!buffer.length) {
    throw new Error("Banner vazio.");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Banner muito grande. Limite de 5 MB.");
  }

  const safeKey = String(bannerKey || "banner").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const relativeDir = path.join("uploads", "banners");
  const fileName = `${safeKey}-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absoluteDir = path.join(publicDir, relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return `/${relativeDir.replaceAll("\\", "/")}/${fileName}`;
}

async function createChatCompletion(apiKey, payload, options = {}) {
  const timeoutMs = Math.max(0, Number(options?.timeoutMs || 0) || 0);
  const timeoutMessage = String(options?.timeoutMessage || "").trim()
    || "A chamada para a OpenAI demorou demais e foi interrompida.";
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller?.signal
    });

    const { data, text } = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data?.error?.message || text || "Falha ao chamar a API da OpenAI.");
    }

    if (!data) {
      throw new Error("A OpenAI devolveu uma resposta vazia ou invalida.");
    }

    return data;
  } catch (error) {
    if (controller?.signal?.aborted || error?.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getContextPrompt() {
  if (cachedContextPrompt) {
    return cachedContextPrompt;
  }

  try {
    const contextText = (await readFile(contextFilePath, "utf8")).trim();
    cachedContextPrompt = contextText;
    return contextText;
  } catch {
    return "";
  }
}

let stripeClient = null;
function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY nao configurada.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function buildCoverUrl(albumName) {
  return `${CONTENT_BASE_URL}/Capas/${encodeURIComponent(albumName)}.avif`;
}

function buildTrackUrl(albumName, trackNumber) {
  return `${CONTENT_BASE_URL}/${encodeURIComponent(albumName)}/mp3/${String(trackNumber).padStart(3, "0")}.mp3`;
}

function normalizeStoreCatalogText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const MINI_PRODUCT_ALBUM_ALIASES = {
  [normalizeStoreCatalogText("Coletânea de dia das mães")]: [
    "De repente mãe",
    "Mãe inesquecível",
    "Simplesmente Mãe",
    "Um presente chamado mãe"
  ],
  [normalizeStoreCatalogText("Coletânea de Dia dos Pais")]: [
    "Aprendi com meu Pai",
    "Meu pai, meu amigo"
  ],
  [normalizeStoreCatalogText("Coletânea de Natal")]: [
    "É Natal",
    "A Verdadeira Historia do Natal",
    "Jesus, a alegria do Natal",
    "Já Nasceu",
    "O nascimento do Rei",
    "O Sentido do Natal 2",
    "Um presente para todos",
    "Em busca do presente maior"
  ]
};

function getMiniTrackType(song = {}) {
  const normalizedTitle = normalizeStoreCatalogText(song?.title || "");
  if (normalizedTitle.includes("playback") || normalizedTitle.includes("trilha")) {
    return "playback";
  }
  return "full";
}

function getMiniMediaAlbumsByTitleMap(library) {
  const map = new Map();
  const albums = Array.isArray(library?.albums) ? library.albums : [];
  for (const album of albums) {
    map.set(normalizeStoreCatalogText(album?.title || ""), album);
  }
  return map;
}

function resolveMiniMediaAlbumsForProduct(product, library) {
  const titleMap = getMiniMediaAlbumsByTitleMap(library);
  const normalizedProductName = normalizeStoreCatalogText(product?.name || "");
  const exact = titleMap.get(normalizedProductName);
  if (exact) {
    return [exact];
  }

  const aliases = MINI_PRODUCT_ALBUM_ALIASES[normalizedProductName] || [];
  const resolved = aliases
    .map((title) => titleMap.get(normalizeStoreCatalogText(title)))
    .filter(Boolean);
  if (resolved.length) {
    return resolved;
  }

  return [];
}

function buildMiniBackedStoreTracks(product, library) {
  const sourceAlbums = resolveMiniMediaAlbumsForProduct(product, library);
  let runningNumber = 1;
  const tracks = [];

  for (const album of sourceAlbums) {
    const songs = Array.isArray(album?.songs) ? [...album.songs] : [];
    songs.sort((left, right) => (Number(left?.order || 0) || 0) - (Number(right?.order || 0) || 0));

    for (const song of songs) {
      const number = runningNumber;
      runningNumber += 1;
      tracks.push({
        number,
        code: String(number).padStart(3, "0"),
        label: String(song?.title || `Faixa ${String(number).padStart(3, "0")}`).trim() || `Faixa ${String(number).padStart(3, "0")}`,
        title: String(song?.title || `Faixa ${String(number).padStart(3, "0")}`).trim() || `Faixa ${String(number).padStart(3, "0")}`,
        type: getMiniTrackType(song),
        durationSeconds: Number(song?.durationSeconds || 0) || 0,
        publicUrl: String(song?.url || "").trim(),
        streamUrl: String(song?.url || "").trim(),
        downloadUrl: String(song?.url || "").trim(),
        playbackTrackNumber: null,
        playbackTrackCode: null,
        playbackUrl: String(song?.playbackUrl || "").trim(),
        lyrics: String(song?.lyricsText || "").trim(),
        lyricsSyncData: song?.lyricsSyncData && typeof song.lyricsSyncData === "object" ? song.lyricsSyncData : null,
        lyricsUpdatedAt: song?.lyricsUpdatedAt || null,
        hasLyrics: Boolean(song?.hasLyrics),
        hasScores: Boolean(song?.hasScores),
        scoreCount: Math.max(0, Number(song?.scoreCount || 0) || 0),
        albumCharacters: normalizeMiniMediaAlbumCharacters(album?.characters),
        coverUrl: String(song?.coverImageUrl || album?.coverImageUrl || "").trim(),
        sourceAlbumId: String(album?.id || "").trim(),
        sourceAlbumTitle: String(album?.title || "").trim() || String(product?.name || "").trim() || "Álbum",
        sourceSongId: String(song?.id || "").trim(),
        sourceSongGlobalId: String(song?.globalId || "").trim(),
        songJsonUrl: String(song?.songJsonUrl || "").trim(),
        miniResources: {
          songJsonUrl: String(song?.songJsonUrl || "").trim(),
          lyricsApiUrl: `/api/mini/media/albums/${encodeURIComponent(String(album?.id || "").trim())}/tracks/${encodeURIComponent(String(song?.id || "").trim())}/lyrics`,
          assetsApiUrl: `/api/mini/media/albums/${encodeURIComponent(String(album?.id || "").trim())}/tracks/${encodeURIComponent(String(song?.id || "").trim())}/assets`
        }
      });
    }
  }

  return {
    sourceAlbums,
    tracks
  };
}

function buildStoreCoverUrl(product, miniSourceAlbums = []) {
  const firstMiniCover = miniSourceAlbums.find((album) => String(album?.coverImageUrl || "").trim());
  if (firstMiniCover) {
    return String(firstMiniCover.coverImageUrl || "").trim();
  }
  return buildCoverUrl(product.name);
}

function getBaseUrl(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const protocol = typeof forwardedProto === "string" && forwardedProto ? forwardedProto.split(",")[0].trim() : "http";
  const host = typeof forwardedHost === "string" && forwardedHost ? forwardedHost.split(",")[0].trim() : request.headers.host || "localhost:3000";
  return `${protocol}://${host}`;
}

function getAlbumPayload() {
  return albums.map((album) => ({
    ...album,
    coverUrl: buildCoverUrl(album.name)
  }));
}

function getStorePayload() {
  const products = buildStoreProducts();

  return products.map((product) => ({
    ...product,
    priceLabel: formatPriceFromCents(product.unitAmount),
    coverUrl: buildCoverUrl(product.name),
    href: `/produto.html?album=${encodeURIComponent(product.id)}`
  }));
}

async function buildStoreProductCard(product, pricing, albumZipLinks = {}, miniLibrary = { albums: [] }) {
  const manifest = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
  const albumZipUrl = resolveAlbumZipUrl(manifest, product.id, albumZipLinks);
  const miniBacked = buildMiniBackedStoreTracks(product, miniLibrary);
  const trackCount = miniBacked.tracks.length || Number(product.tracks) || 0;

  return {
    ...product,
    description: trackCount > 0 ? `${trackCount} faixas conectadas ao MINI` : product.description,
    priceLabel: formatPriceFromCents(product.unitAmount),
    coverUrl: buildStoreCoverUrl(product, miniBacked.sourceAlbums),
    href: `/produto.html?album=${encodeURIComponent(product.id)}`,
    albumZipUrl,
    hasAlbumZip: albumZipUrl !== "[none]",
    trackCount,
    catalogSource: miniBacked.tracks.length ? "mini" : "legacy"
  };
}

async function buildStoreProductsResponse(pricing, albumZipLinks = {}) {
  const storeProducts = buildStoreProducts(pricing.albumPriceCents, pricing.albumOverrides);
  const miniLibrary = buildMiniMediaLibraryPayload(await loadMiniMediaLibrary().catch(() => ({ albums: [] })), { includeExtended: true });
  return Promise.all(storeProducts.map((product) => buildStoreProductCard(product, pricing, albumZipLinks, miniLibrary)));
}

function getAlbumPriceCents(pricing, productId) {
  return Number(pricing?.albumOverrides?.[productId]) || Number(pricing?.albumPriceCents) || 4990;
}

function serializeManifestTrack(track) {
  return {
    number: track.number,
    code: track.code || String(track.number).padStart(3, "0"),
    label: track.title || track.label || `Faixa ${String(track.number).padStart(3, "0")}`,
    title: track.title || track.label || `Faixa ${String(track.number).padStart(3, "0")}`,
    type: String(track.type || "full").trim().toLowerCase() === "playback" ? "playback" : "full",
    durationSeconds: Number(track.durationSeconds) || 0,
    publicUrl: track.publicUrl || "",
    playbackTrackNumber: Number(track.playbackTrackNumber) || null,
    playbackTrackCode: track.playbackTrackCode || null,
    lyrics: typeof track.lyrics === "string" ? track.lyrics : ""
  };
}

async function buildAlbumDetailResponse(product, pricing, albumZipLinks = {}) {
  const manifest = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
  const unitAmount = getAlbumPriceCents(pricing, product.id);
  const albumZipUrl = resolveAlbumZipUrl(manifest, product.id, albumZipLinks);
  const miniLibrary = buildMiniMediaLibraryPayload(await loadMiniMediaLibrary().catch(() => ({ albums: [] })), { includeExtended: true });
  const miniBacked = buildMiniBackedStoreTracks(product, miniLibrary);
  const tracks = miniBacked.tracks.length
    ? miniBacked.tracks
    : manifest.tracks.map((track) => ({
      ...serializeManifestTrack(track),
      streamUrl: buildTrackUrl(product.name, track.number),
      downloadUrl: buildTrackUrl(product.name, track.number)
    }));

  return {
    ...product,
    unitAmount,
    priceLabel: formatPriceFromCents(unitAmount),
    coverUrl: buildStoreCoverUrl(product, miniBacked.sourceAlbums),
    href: `/produto.html?album=${encodeURIComponent(product.id)}`,
    albumZipUrl,
    hasAlbumZip: albumZipUrl !== "[none]",
    lyricsZipUrl: manifest.lyricsZipUrl,
    tracks,
    trackCount: tracks.length,
    catalogSource: miniBacked.tracks.length ? "mini" : "legacy",
    sourceAlbums: miniBacked.sourceAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      coverImageUrl: album.coverImageUrl || "",
      songCount: Array.isArray(album.songs) ? album.songs.length : 0
    })),
    hasManifest: miniBacked.tracks.length ? true : manifest.tracks.some((track) => String(track.title || "").trim())
  };
}

function extractChatCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const texts = [];

  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      texts.push(item.text);
    }
  }

  return texts.join("\n\n").trim();
}

function extractJsonObjectText(text) {
  const clean = String(text || "").trim();
  if (!clean) {
    return "";
  }

  if (clean.startsWith("{") && clean.endsWith("}")) {
    return clean;
  }

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return clean.slice(firstBrace, lastBrace + 1).trim();
  }

  return clean;
}

function parseStructuredJsonText(text) {
  const clean = String(text || "").trim();
  if (!clean) {
    return null;
  }

  const candidates = [clean];
  const extracted = extractJsonObjectText(clean);
  if (extracted && extracted !== clean) {
    candidates.push(extracted);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function getAlbumTrackByNumber(album, trackNumber) {
  if (!album || !Array.isArray(album.tracks)) {
    return null;
  }

  return album.tracks.find((track) => Number(track?.number || 0) === Number(trackNumber || 0)) || null;
}

function normalizeLyricsSyncLines(lines) {
  if (!Array.isArray(lines)) {
    return [];
  }

  return lines
    .map((line, index) => {
      const text = String(line?.text || "").replace(/\s+/g, " ").trim();
      const timestampMs = Math.max(0, Number(line?.timestampMs ?? line?.startMs ?? 0) || 0);
      if (!text) {
        return null;
      }

      return {
        number: index + 1,
        text,
        timestampMs,
        characterId: String(line?.characterId || "").trim()
      };
    })
    .filter(Boolean);
}

const MINI_CHARACTER_GROUPS = {
  boys: ["#7FDBFF", "#9EE8FF", "#61D2FF", "#8CCBFF"],
  girls: ["#FF79C6", "#FF9BE0", "#D38BFF", "#F09CFF"],
  men: ["#FFFFFF"],
  women: ["#FFF3A6"]
};

function normalizeCharacterGroup(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["boys", "girls", "men", "women"].includes(normalized)) {
    return normalized;
  }
  return "boys";
}

function pickNextCharacterColor(existingCharacters, group) {
  const safeGroup = normalizeCharacterGroup(group);
  const palette = MINI_CHARACTER_GROUPS[safeGroup] || MINI_CHARACTER_GROUPS.boys;
  const usedCount = (Array.isArray(existingCharacters) ? existingCharacters : [])
    .filter((item) => normalizeCharacterGroup(item?.group) === safeGroup)
    .length;
  return palette[Math.min(usedCount, palette.length - 1)];
}

function buildLyricsTextFromSyncLines(lines) {
  return normalizeLyricsSyncLines(lines)
    .map((line) => line.text)
    .join("\n");
}

function startsWithUppercaseWord(word) {
  return /^[A-ZÀ-Ý][\p{L}\p{M}'’-]*$/u.test(String(word || "").trim());
}

function splitTextIntoShortLyricsLines(text, maxChars = 30) {
  const safeMax = Math.max(8, Number(maxChars) || 30);
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const rawParts = normalized
    .split(/\n+/)
    .flatMap((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return [];
      }
      if (trimmedLine.length <= safeMax) {
        return [trimmedLine];
      }

      const sentenceParts = trimmedLine
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      return sentenceParts.flatMap((part) => {
        if (part.length <= safeMax) {
          return [part];
        }

        return part
          .split(/(?<=[,;:])\s+/)
          .map((segment) => segment.trim())
          .filter(Boolean);
      });
    })
    .filter(Boolean);

  const output = [];
  const preferredBreakLength = Math.max(16, safeMax - 10);
  const targetLineLength = Math.max(preferredBreakLength, safeMax - 4);

  for (const part of rawParts) {
    if (part.length <= safeMax) {
      output.push(part);
      continue;
    }

    const words = part.split(/\s+/).filter(Boolean);
    let buffer = "";
    for (const word of words) {
      if (
        buffer
        && startsWithUppercaseWord(word)
        && buffer.length >= preferredBreakLength
        && !/[.!?:;,-]$/.test(buffer)
      ) {
        output.push(buffer.trim());
        buffer = "";
      }

      const candidate = buffer ? `${buffer} ${word}` : word;
      if (candidate.length <= safeMax) {
        buffer = candidate;
        if (
          startsWithUppercaseWord(word)
          && buffer.length >= targetLineLength
          && !/[.!?:;,-]$/.test(buffer)
        ) {
          output.push(buffer.trim());
          buffer = "";
        }
        continue;
      }

      if (buffer) {
        output.push(buffer);
      }

      if (word.length <= safeMax) {
        buffer = word;
        continue;
      }

      let remaining = word;
      while (remaining.length > safeMax) {
        output.push(remaining.slice(0, safeMax));
        remaining = remaining.slice(safeMax).trim();
      }
      buffer = remaining;
    }

    if (buffer) {
      output.push(buffer);
    }
  }

  const mergedOutput = [];
  for (const line of output.map((item) => item.trim()).filter(Boolean)) {
    const previous = mergedOutput[mergedOutput.length - 1] || "";
    const canMerge = previous
      && `${previous} ${line}`.length <= safeMax
      && !/[.!?]$/.test(previous);

    if (canMerge) {
      mergedOutput[mergedOutput.length - 1] = `${previous} ${line}`.trim();
      continue;
    }

    mergedOutput.push(line);
  }

  return mergedOutput;
}

function extractTranscriptSegments(payload) {
  if (!Array.isArray(payload?.segments)) {
    return [];
  }

  return payload.segments
    .map((segment, index) => {
      const text = String(segment?.text || "").replace(/\s+/g, " ").trim();
      const startMs = Math.max(0, Math.round((Number(segment?.start) || 0) * 1000));
      const endMs = Math.max(startMs, Math.round((Number(segment?.end) || 0) * 1000));
      if (!text) {
        return null;
      }

      return {
        index: index + 1,
        text,
        startMs,
        endMs
      };
    })
    .filter(Boolean);
}

async function generateTimedLyricsForTrack(apiKey, track) {
  const audioUrl = String(track?.streamUrl || "").trim();
  if (!audioUrl) {
    throw new Error("A faixa nao possui streamUrl publico para transcrever.");
  }

  const audioResponse = await fetch(audioUrl);
  const { data: audioErrorPayload, text: audioErrorText } = audioResponse.ok
    ? { data: null, text: "" }
    : await readApiResponse(audioResponse);

  if (!audioResponse.ok) {
    throw new Error(audioErrorPayload?.error || audioErrorText || "Nao foi possivel baixar o MP3 publico desta faixa.");
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  if (!audioBuffer.length) {
    throw new Error("O MP3 desta faixa veio vazio.");
  }

  const safeFileName = `${String(track?.title || track?.label || "faixa").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "faixa"}.mp3`;
  const formData = new FormData();
  formData.append("model", OPENAI_TRANSCRIBE_MODEL);
  formData.append("language", "pt");
  formData.append("response_format", "json");
  formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), safeFileName);

  const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });
  const { data: transcriptionPayload, text: transcriptionText } = await readApiResponse(transcriptionResponse);

  if (!transcriptionResponse.ok) {
    throw new Error(
      transcriptionPayload?.error?.message
      || transcriptionPayload?.error
      || transcriptionText
      || "Falha ao transcrever o MP3 da faixa."
    );
  }

  const fullText = String(transcriptionPayload?.text || "").trim();
  if (!fullText) {
    throw new Error("A OpenAI nao retornou texto para esta faixa.");
  }

  let syncLines = normalizeLyricsSyncLines(
    splitTextIntoShortLyricsLines(fullText, 30).map((text) => ({
      text,
      timestampMs: null
    }))
  );

  syncLines = syncLines.map((line) => ({
    ...line,
    text: String(line.text || "").slice(0, 30).trim(),
    timestampMs: null
  })).filter((line) => line.text);

  return {
    lyrics: buildLyricsTextFromSyncLines(syncLines),
    syncData: {
      title: String(track?.title || track?.label || "").trim(),
      lines: syncLines,
      generatedAt: new Date().toISOString(),
      generatedBy: "openai",
      transcriptionModel: OPENAI_TRANSCRIBE_MODEL,
      organizerModel: "local-line-split",
      mode: "phrases-only",
      maxCharsPerLine: 30
    }
  };
}

async function readJsonBody(request) {
  const raw = await readTextBody(request);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("JSON invalido.");
  }
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username || null,
    isAdmin: isAdminUser(user),
    isContractor: Boolean(user.is_contractor),
    contractorEventId: user.contractor_event_id || null,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    project200Profile: user.project200_profile || null,
    createdAt: user.created_at,
    sessionExpiresAt: user.expires_at || null
  };
}

async function ensureProject200ProfileLinksSchema() {
  await query(`
    create table if not exists project200_profile_links (
      user_id uuid primary key references users(id) on delete cascade,
      assigned_profile text not null,
      assigned_by_user_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

async function getProject200AssignedProfile(userId) {
  if (!userId) return "";
  await ensureProject200ProfileLinksSchema();
  const result = await query(
    `select assigned_profile from project200_profile_links where user_id = $1 limit 1`,
    [userId]
  );
  return normalizeStoredProject200ProfileName(result.rows[0]?.assigned_profile || "");
}

async function findUserByUsernameOrNameInput(usernameInput) {
  const normalizedInput = String(usernameInput || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (!normalizedInput) {
    return null;
  }

  const searchResult = await query(
    `
      select id, name, username, created_at
      from users
      where username = $1
         or lower(regexp_replace(coalesce(name, ''), '\\s+', ' ', 'g')) = $2
         or username ilike $3
         or name ilike $3
      order by
        case
          when username = $1 then 0
          when lower(regexp_replace(coalesce(name, ''), '\\s+', ' ', 'g')) = $2 then 1
          else 2
        end,
        created_at asc
      limit 1
    `,
    [normalizedInput, normalizedInput, `%${String(usernameInput || "").trim()}%`]
  );

  return searchResult.rows[0] || null;
}

function isValidUsername(username) {
  return /^[\p{L}\p{M}\p{N} ._-]{3,24}$/u.test(username);
}

function detectUserToneProfile(user) {
  const firstName = String(user?.name || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

  const femaleNames = new Set([
    "ana", "maria", "julia", "juliana", "beatriz", "gabriela", "leticia", "patricia", "amanda", "camila",
    "larissa", "luiza", "fernanda", "isabela", "isabella", "mariana", "heloisa", "helena", "sophia", "sofia",
    "vitoria", "valentina", "bruna", "raquel", "priscila", "roberta", "rosa", "rose", "alice", "clara"
  ]);
  const maleNames = new Set([
    "joao", "jose", "pedro", "lucas", "mateus", "matheus", "gabriel", "davi", "daniel", "rafael",
    "samuel", "henrique", "guilherme", "vinicius", "leonardo", "thiago", "rodrigo", "marcos", "paulo", "miguel"
  ]);

  if (femaleNames.has(firstName)) {
    return {
      label: "amiga",
      prompt: "Quando fizer sentido usar um vocativo curto, trate a pessoa no feminino, com naturalidade, como 'amiga'."
    };
  }

  if (maleNames.has(firstName)) {
    return {
      label: "amigo",
      prompt: "Quando fizer sentido usar um vocativo curto, trate a pessoa no masculino, com naturalidade, como 'amigo'."
    };
  }

  return {
    label: "pessoa",
    prompt: "Se o genero nao estiver claro pelo nome, mantenha linguagem neutra e natural, sem forcar vocativos."
  };
}

function sanitizeAdminUserMessage(message) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    userId: message.userId,
    title: message.title,
    body: message.body,
    createdAt: message.createdAt,
    dismissedAt: message.dismissedAt,
    sentByUserId: message.sentByUserId,
    userReplyBody: message.userReplyBody,
    userReplyCreatedAt: message.userReplyCreatedAt
  };
}

async function requireAuth(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para liberar cadastro e login."
    });
    return null;
  }

  const token = parseBearerToken(request.headers.authorization);

  if (!token) {
    sendJson(response, 401, { error: "Token ausente." });
    return null;
  }

  const user = await findUserBySessionToken(token);

  if (!user) {
    sendJson(response, 401, { error: "Sessao invalida ou expirada." });
    return null;
  }

  try {
    await touchUserPresence(user.id);
  } catch {
    // Presenca nao deve bloquear requests autenticadas.
  }

  return user;
}

async function requireAdmin(request, response) {
  const user = await requireAuth(request, response);

  if (!user) {
    return null;
  }

  if (!isAdminUser(user)) {
    sendJson(response, 403, { error: "Acesso restrito ao administrador." });
    return null;
  }

  return user;
}

async function getOptionalAuthUser(request) {
  if (!hasDatabase()) {
    return null;
  }

  const token = parseBearerToken(request.headers.authorization);

  if (!token) {
    return null;
  }

  const user = await findUserBySessionToken(token);

  if (!user) {
    return null;
  }

  try {
    await touchUserPresence(user.id);
  } catch {
    // Presenca nao deve bloquear requests opcionais.
  }

  return user;
}

const FINANCE_PERIOD_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
const FINANCE_STRIPE_SYNC_INTERVAL_MS = 2 * 60 * 1000;
let financeStripeLastSyncAt = 0;
let financeStripeSyncPromise = null;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function formatFinanceRangeLabel(rawPeriod) {
  const value = String(rawPeriod || "").trim().toLowerCase();

  if (!value || value === "total") {
    return "Total";
  }

  if (value === "today") {
    return "Hoje";
  }

  if (value === "week") {
    return "Esta semana";
  }

  if (value === "last15") {
    return "Ultimos 15 dias";
  }

  if (value === "last30") {
    return "Ultimos 30 dias";
  }

  if (/^month-\d{2}$/.test(value)) {
    const monthIndex = Number(value.slice(-2)) - 1;
    if (monthIndex >= 0 && monthIndex < FINANCE_PERIOD_MONTHS.length) {
      return FINANCE_PERIOD_MONTHS[monthIndex];
    }
  }

  return "Total";
}

function resolveFinanceRange(rawPeriod) {
  const now = new Date();
  const today = startOfDay(now);
  const normalized = String(rawPeriod || "total").trim().toLowerCase() || "total";
  const result = {
    key: "total",
    label: "Total",
    fromIso: null,
    toIso: null
  };

  if (normalized === "today") {
    return {
      key: "today",
      label: "Hoje",
      fromIso: today.toISOString(),
      toIso: addDays(today, 1).toISOString()
    };
  }

  if (normalized === "week") {
    const weekday = today.getDay();
    const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
    const weekStart = addDays(today, -daysSinceMonday);
    return {
      key: "week",
      label: "Esta semana",
      fromIso: weekStart.toISOString(),
      toIso: addDays(weekStart, 7).toISOString()
    };
  }

  if (normalized === "last15") {
    return {
      key: "last15",
      label: "Ultimos 15 dias",
      fromIso: addDays(today, -14).toISOString(),
      toIso: addDays(today, 1).toISOString()
    };
  }

  if (normalized === "last30") {
    return {
      key: "last30",
      label: "Ultimos 30 dias",
      fromIso: addDays(today, -29).toISOString(),
      toIso: addDays(today, 1).toISOString()
    };
  }

  if (/^month-\d{2}$/.test(normalized)) {
    const monthIndex = Number(normalized.slice(-2)) - 1;

    if (monthIndex >= 0 && monthIndex < 12) {
      const year = today.getFullYear();
      const monthStart = new Date(year, monthIndex, 1);
      const nextMonthStart = monthIndex === 11
        ? new Date(year + 1, 0, 1)
        : new Date(year, monthIndex + 1, 1);

      return {
        key: normalized,
        label: FINANCE_PERIOD_MONTHS[monthIndex],
        fromIso: monthStart.toISOString(),
        toIso: nextMonthStart.toISOString()
      };
    }
  }

  result.label = formatFinanceRangeLabel(normalized);
  return result;
}

function readSubscriptionIdFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const subscription = payload.subscription;

  if (typeof subscription === "string" && subscription.trim()) {
    return subscription.trim();
  }

  if (subscription && typeof subscription === "object" && typeof subscription.id === "string" && subscription.id.trim()) {
    return subscription.id.trim();
  }

  if (typeof payload.subscription_id === "string" && payload.subscription_id.trim()) {
    return payload.subscription_id.trim();
  }

  return null;
}

async function resolveSubscriptionIdFromCheckout(stripe, checkoutId) {
  if (!checkoutId) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(String(checkoutId));
    return readSubscriptionIdFromPayload(session);
  } catch {
    return null;
  }
}

async function syncFinanceSubscriptionsWithStripe() {
  if (!STRIPE_SECRET_KEY || !hasDatabase()) {
    return;
  }

  await ensurePaymentSchema();
  const stripe = getStripeClient();
  const result = await query(
    `
      select
        reference_id,
        subscription_id,
        checkout_id,
        status,
        raw_payload
      from user_plan_subscriptions
      where plan_id <> 'gratis'
        and (
          status in ('ACTIVE', 'PAID', 'AUTHORIZED', 'PENDING', 'OVERDUE')
          or subscription_id is not null
        )
      order by updated_at desc
      limit 120
    `
  );

  for (const row of result.rows) {
    let subscriptionId = typeof row.subscription_id === "string" ? row.subscription_id.trim() : "";

    if (!subscriptionId) {
      subscriptionId = readSubscriptionIdFromPayload(row.raw_payload || {}) || "";
    }

    if (!subscriptionId) {
      subscriptionId = await resolveSubscriptionIdFromCheckout(stripe, row.checkout_id);
    }

    if (!subscriptionId) {
      continue;
    }

    let subscription = null;

    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      continue;
    }

    const nextStatus = normalizeStripeSubscriptionStatus(subscription?.status);
    const activatedAt = isActiveSubscriptionStatus(nextStatus)
      ? toIsoDateFromUnix(subscription?.current_period_start) || toIsoDateFromUnix(subscription?.start_date)
      : null;
    const canceledAt = isInactiveSubscriptionStatus(nextStatus)
      ? toIsoDateFromUnix(subscription?.canceled_at) || new Date().toISOString()
      : null;

    await markPlanSubscriptionStatus({
      referenceId: row.reference_id,
      status: nextStatus,
      subscriptionId,
      payload: subscription,
      activatedAt,
      canceledAt
    });
  }
}

async function syncFinanceSubscriptionsWithStripeIfNeeded() {
  if (!STRIPE_SECRET_KEY) {
    return;
  }

  const now = Date.now();

  if (financeStripeSyncPromise) {
    await financeStripeSyncPromise;
    return;
  }

  if (financeStripeLastSyncAt && (now - financeStripeLastSyncAt) < FINANCE_STRIPE_SYNC_INTERVAL_MS) {
    return;
  }

  financeStripeSyncPromise = (async () => {
    try {
      await syncFinanceSubscriptionsWithStripe();
    } catch (error) {
      console.error("[finance stripe sync]", error);
    } finally {
      financeStripeLastSyncAt = Date.now();
      financeStripeSyncPromise = null;
    }
  })();

  await financeStripeSyncPromise;
}

async function buildFinanceSummary(rawPeriod = "total") {
  await ensurePaymentSchema();
  await syncFinanceSubscriptionsWithStripeIfNeeded();
  const range = resolveFinanceRange(rawPeriod);

  const result = await query(`
    with album_sales as (
      select coalesce(sum(amount_cents), 0)::bigint as total_cents
      from user_album_purchases
      where (
          status in ('PAID', 'AUTHORIZED')
          or paid_at is not null
        )
        and ($1::timestamptz is null or coalesce(paid_at, created_at) >= $1::timestamptz)
        and ($2::timestamptz is null or coalesce(paid_at, created_at) < $2::timestamptz)
    ),
    plan_sales as (
      select coalesce(sum(amount_cents), 0)::bigint as total_cents
      from user_plan_subscriptions
      where plan_id <> 'gratis'
        and (
          status in ('ACTIVE', 'PAID', 'AUTHORIZED')
          or activated_at is not null
        )
        and ($1::timestamptz is null or coalesce(activated_at, created_at) >= $1::timestamptz)
        and ($2::timestamptz is null or coalesce(activated_at, created_at) < $2::timestamptz)
    ),
    active_subscriptions as (
      select distinct on (user_id)
        user_id,
        amount_cents
      from user_plan_subscriptions
      where plan_id <> 'gratis'
        and status in ('ACTIVE', 'PAID', 'AUTHORIZED')
      order by user_id, updated_at desc
    )
    select
      ((select total_cents from album_sales) + (select total_cents from plan_sales))::bigint as total_sales_cents,
      (select count(*)::int from active_subscriptions) as active_subscribers,
      (select coalesce(sum(amount_cents), 0)::bigint from active_subscriptions) as monthly_revenue_cents
  `, [range.fromIso, range.toIso]);

  const row = result.rows[0] || {};

  return {
    totalSalesCents: Number(row.total_sales_cents || 0),
    activeSubscribers: Number(row.active_subscribers || 0),
    monthlyRevenueCents: Number(row.monthly_revenue_cents || 0),
    periodKey: range.key,
    periodLabel: range.label,
    periodFrom: range.fromIso,
    periodTo: range.toIso,
    generatedAt: new Date().toISOString()
  };
}

async function ensurePaymentsReady(response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres e rode o SQL de inicializacao para liberar pagamentos."
    });
    return false;
  }

  try {
    await ensurePaymentSchema();
    await ensureSiteConfigSchema();
    await ensureAdminUsersSchema();
    await ensureAllTermsSchema();
    await ensureActionsSchema();
    await ensurePlatformFinanceSchema();
    await ensureStatsSchema();
    await ensureConstitutionSchema();
    await ensureProject200ProfileLinksSchema();
    await ensureExtraGoalsSchema();
    await ensureProject200FriendsSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar o schema de pagamentos.",
      hint: "Confirme se o banco aceita criar tabelas e se a extensao pgcrypto esta habilitada."
    });
    return false;
  }

  return true;
}

function getTrackDownloadUrl(track = {}, productName = "", trackNumber = 0) {
  return String(track?.downloadUrl || track?.streamUrl || track?.publicUrl || "").trim() || buildTrackUrl(productName, trackNumber);
}

function getStripeEnvironment() {
  return STRIPE_SECRET_KEY.startsWith("sk_live_") ? "production" : "test";
}

function buildStripeSuccessUrl(baseUrl, pathname, queryKey, value) {
  return `${baseUrl}${pathname}?${queryKey}=${encodeURIComponent(value)}&payment=return&session_id={CHECKOUT_SESSION_ID}`;
}

function normalizeStripeSubscriptionStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active" || normalized === "trialing") {
    return "ACTIVE";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return "OVERDUE";
  }

  if (normalized === "canceled") {
    return "CANCELED";
  }

  if (normalized === "incomplete" || normalized === "incomplete_expired") {
    return "DECLINED";
  }

  return normalized ? normalized.toUpperCase() : "PENDING";
}

function normalizeStripePaymentStatus(status) {
  return String(status || "").trim().toLowerCase() === "paid" ? "PAID" : "PENDING";
}

function getEventObject(event) {
  return event?.data?.object || {};
}

function getMetadataReferenceId(payload) {
  return payload?.metadata?.referenceId || payload?.metadata?.reference_id || null;
}

function getStripeInvoiceReferenceId(invoice) {
  return getMetadataReferenceId(invoice) || getMetadataReferenceId(invoice?.parent?.subscription_details) || null;
}

function toIsoDateFromUnix(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function extractChatUsageTokens(payload) {
  const usage = payload?.usage || {};
  const totalTokens = Number(usage.total_tokens);
  return Number.isFinite(totalTokens) && totalTokens > 0 ? totalTokens : 0;
}

function estimateNarrationDurationSeconds(text) {
  const safeText = String(text || "").trim();

  if (!safeText) {
    return 0;
  }

  const words = safeText.split(/\s+/).filter(Boolean).length;
  if (!words) {
    return 0;
  }

  return Math.max(1, Math.round(words / 2.6));
}

async function handleGptRequest(request, response, user = null) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const contextPrompt = await getContextPrompt();
  const systemBase = typeof body.system === "string" && body.system.trim() ? body.system.trim() : DEFAULT_SYSTEM_PROMPT;
  const responseStylePrompt = typeof body.responseStyle === "string" && body.responseStyle.trim()
    ? body.responseStyle.trim()
    : DEFAULT_RESPONSE_STYLE_PROMPT;
  const userToneProfile = detectUserToneProfile(user);
  const userPrompt = user?.name
    ? `Nome da pessoa: ${user.name}.\n${userToneProfile.prompt}`
    : userToneProfile.prompt;
  const system = contextPrompt
    ? `${systemBase}\n\n${responseStylePrompt}\n\n${userPrompt}\n\nContexto principal da Turma do Printy:\n${contextPrompt}`
    : `${systemBase}\n\n${responseStylePrompt}\n\n${userPrompt}`;
  const requestedFinalModel = getFinalModel(body);
  const instantModel = getInstantModel(body);
  const history = Array.isArray(body.history) ? body.history : [];
  const wantsStream = Boolean(body.stream) || String(request.headers.accept || "").includes("text/event-stream");
  const previewMaxCompletionTokens = getPositiveInteger(body.previewMaxCompletionTokens, DEFAULT_PREVIEW_MAX_COMPLETION_TOKENS);
  const finalMaxCompletionTokens = getPositiveInteger(body.maxCompletionTokens, DEFAULT_FINAL_MAX_COMPLETION_TOKENS);

  if (!message) {
    sendJson(response, 400, { error: "Envie um campo 'message' com texto." });
    return;
  }

  const fallbackReply = buildFastFallbackReply(message);

  if (fallbackReply) {
    if (wantsStream) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });
      response.write(`data: ${JSON.stringify({ type: "preview", model: "local-fast-path", text: fallbackReply })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: "done", text: fallbackReply })}\n\n`);
      response.end();
      return;
    }

    sendJson(response, 200, {
      ok: true,
      model: "local-fast-path",
      outputText: fallbackReply,
      raw: null
    });
    return;
  }

  const model = requestedFinalModel;

  const messages = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
    .slice(-4)
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }));

  const requestPayload = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages,
      { role: "user", content: message }
    ],
    max_completion_tokens: finalMaxCompletionTokens
  };

  try {
    if (wantsStream) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });

      const sendEvent = (payload) => {
        response.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      let finalStarted = false;
      let previewSent = false;

      sendEvent({ type: "status", stage: "preview", message: "Montando uma resposta imediata..." });

      const shouldRunPreview = instantModel && instantModel !== model;
      const previewPromise = shouldRunPreview
        ? createChatCompletion(apiKey, {
          model: instantModel,
          messages: [
            ...(system ? [{ role: "system", content: `${system}\n\nEntregue primeiro uma resposta imediata, curta e pratica em ate 500 caracteres.` }] : []),
            ...messages,
            { role: "user", content: message }
          ],
          max_completion_tokens: previewMaxCompletionTokens
        })
          .then((previewPayload) => {
            const previewText = extractChatCompletionText(previewPayload);
            void recordTextTokenUsage(user?.id, extractChatUsageTokens(previewPayload));

            if (!previewText || finalStarted || previewSent) {
              return;
            }

            previewSent = true;
            sendEvent({
              type: "preview",
              model: previewPayload.model || instantModel,
              text: previewText
            });
          })
          .catch(() => {
            if (!finalStarted && !previewSent) {
              sendEvent({
                type: "status",
                stage: "preview",
                message: "Seguindo com a resposta principal..."
              });
            }
          })
        : Promise.resolve();

      const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          ...requestPayload,
          stream: true,
          stream_options: {
            include_usage: true
          }
        })
      });

      if (!openAiResponse.ok) {
        const { data: payload, text } = await readApiResponse(openAiResponse);
        sendEvent({
          type: "error",
          message: payload?.error?.message || text || "Falha ao chamar a API da OpenAI."
        });
        response.end();
        return;
      }

      const reader = openAiResponse.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let streamedUsageTokens = 0;

      if (!reader) {
        sendEvent({ type: "error", message: "A OpenAI nao devolveu stream de resposta." });
        response.end();
        return;
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine.startsWith("data:")) {
            continue;
          }

          const payloadText = trimmedLine.slice(5).trim();

          if (!payloadText || payloadText === "[DONE]") {
            continue;
          }

          const payload = JSON.parse(payloadText);
          const delta = payload?.choices?.[0]?.delta?.content;
          const usageTokens = extractChatUsageTokens(payload);

          if (usageTokens > 0) {
            streamedUsageTokens = usageTokens;
          }

          if (typeof delta === "string" && delta) {
            if (!finalStarted) {
              finalStarted = true;
              sendEvent({ type: "status", stage: "final", message: "Respondendo..." });
            }
            finalText += delta;
            sendEvent({ type: "delta", text: delta });
          }
        }
      }

      await previewPromise;
      void recordTextTokenUsage(user?.id, streamedUsageTokens);
      sendEvent({ type: "done", text: finalText });
      response.end();
      return;
    }

    const payload = await createChatCompletion(apiKey, requestPayload);
    void recordTextTokenUsage(user?.id, extractChatUsageTokens(payload));

    sendJson(response, 200, {
      ok: true,
      model: payload.model,
      outputText: extractChatCompletionText(payload),
      raw: payload
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao chamar a OpenAI.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

function decodeBase64Audio(base64Audio) {
  if (typeof base64Audio !== "string" || !base64Audio.trim()) {
    throw new Error("Audio ausente.");
  }

  return Buffer.from(base64Audio, "base64");
}

async function handleAudioTranscription(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" && body.mimeType.trim() ? body.mimeType.trim() : "audio/webm";
  const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "speech.webm";

  let audioBuffer;

  try {
    audioBuffer = decodeBase64Audio(audioBase64);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  if (audioBuffer.length === 0) {
    sendJson(response, 400, { error: "Audio vazio." });
    return;
  }

  try {
    const formData = new FormData();
    formData.append("model", OPENAI_TRANSCRIBE_MODEL);
    formData.append("language", "pt");
    formData.append("file", new Blob([audioBuffer], { type: mimeType }), fileName);

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const { data: payload, text } = await readApiResponse(transcriptionResponse);

    if (!transcriptionResponse.ok) {
      sendJson(response, transcriptionResponse.status, {
        error: "Falha ao transcrever o audio.",
        details: payload || text || "Resposta vazia da OpenAI."
      });
      return;
    }

    if (!payload) {
      sendJson(response, 502, {
        error: "A OpenAI devolveu uma resposta vazia ou invalida na transcricao."
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      text: typeof payload.text === "string" ? payload.text.trim() : "",
      model: OPENAI_TRANSCRIBE_MODEL
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao transcrever o audio.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function handleAudioSpeech(request, response, user = null) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const safeText = text.slice(0, 3900);
  const voice = typeof body.voice === "string" && OPENAI_TTS_VOICES.has(body.voice.trim()) ? body.voice.trim() : "alloy";

  if (!safeText) {
    sendJson(response, 400, { error: "Texto ausente para sintetizar audio." });
    return;
  }

  try {
    const speechResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_TTS_MODEL,
        voice,
        response_format: "mp3",
        input: safeText
      })
    });

    if (!speechResponse.ok) {
      const { data: payload, text: rawText } = await readApiResponse(speechResponse);
      sendJson(response, speechResponse.status, {
        error: "Falha ao gerar o audio da OpenAI.",
        details: payload || rawText || "Resposta vazia da OpenAI."
      });
      return;
    }

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    void recordNarrationUsage(user?.id, estimateNarrationDurationSeconds(safeText));
    response.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store"
    });
    response.end(audioBuffer);
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro interno ao gerar audio.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function handleEscreverParagraphsList(request, response) {
  try {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    const paragraphs = await listEscreverParagraphs(user.id);
    sendJson(response, 200, { ok: true, paragraphs });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar os paragrafos."
    });
  }
}

async function handleEscreverParagraphCreate(request, response) {
  try {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    const body = await readJsonBody(request);
    const paragraph = await createEscreverParagraph(user.id, body);
    sendJson(response, 201, { ok: true, paragraph });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar o paragrafo."
    });
  }
}

async function handleEscreverParagraphDelete(request, response, paragraphId) {
  try {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    const deleted = await deleteEscreverParagraph(user.id, paragraphId);
    sendJson(response, deleted ? 200 : 404, {
      ok: deleted
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir o paragrafo."
    });
  }
}

async function handleProject200TextOrganize(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    sendJson(response, 400, { error: "Texto ausente." });
    return;
  }

  const clipped = text.slice(0, 2000);
  const model = getInstantModel(body);

  try {
    const completion = await createChatCompletion(apiKey, {
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "VocÃª organiza textos em pt-BR. Corrija apenas grafia/pontuaÃ§Ã£o, sem mudar a ideia. Crie um tÃ­tulo curto (atÃ© 60 chars). Responda JSON puro: {\"title\":\"...\",\"text\":\"...\"}."
        },
        {
          role: "user",
          content: clipped
        }
      ]
    });

    const raw = extractChatCompletionText(completion);
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const organizedTitle = String(parsed?.title || "").trim() || "Texto novo";
    const organizedText = String(parsed?.text || "").trim() || clipped;

    sendJson(response, 200, {
      ok: true,
      title: organizedTitle.slice(0, 60),
      text: organizedText.slice(0, 2000),
      model
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Erro ao organizar texto.",
      details: error instanceof Error ? error.message : "Falha desconhecida."
    });
  }
}

async function handleProject200FinanceInterpret(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = String(body?.text || "").trim();
  if (!text) {
    sendJson(response, 400, { error: "Texto ausente." });
    return;
  }

  try {
    const parseAmountCents = (value) => {
      if (value === null || value === undefined) {
        return 0;
      }
      const raw = String(value).trim();
      if (!raw) {
        return 0;
      }
      const normalized = raw
        .replace(/[Rr]\$/g, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const direct = Number(normalized);
      if (!Number.isFinite(direct) || direct <= 0) {
        return 0;
      }
      return direct >= 1000 ? Math.round(direct) : Math.round(direct * 100);
    };

    const parseAmountFromText = (input) => {
      const match = String(input || "").match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
      if (!match) {
        return 0;
      }
      const normalized = match[1].replace(/\./g, "").replace(/,/g, ".");
      const value = Number(normalized);
      if (!Number.isFinite(value) || value <= 0) {
        return 0;
      }
      return Math.round(value * 100);
    };

    const normalizeCategory = (rawCategory, kind) => {
      const normalized = String(rawCategory || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
      const incomeMap = new Map([
        ["eventos", "Eventos"],
        ["inscricoes", "Inscricoes"],
        ["apoiadores", "Apoiadores"],
        ["site", "Site"],
        ["venda de ativo", "Venda de ativo"],
        ["direitos autorais", "Direitos autorais"],
        ["autorais", "Direitos autorais"],
        ["copyright", "Direitos autorais"],
        ["royalties", "Direitos autorais"]
      ]);
      const expenseMap = new Map([
        ["alimentacao", "Alimentacao"],
        ["aluguel", "Aluguel"],
        ["carro", "Carro"],
        ["eventos", "Eventos"],
        ["lazer", "Lazer"],
        ["anuncios", "Anuncios"],
        ["plataformas", "Plataformas"],
        ["plataforma", "Plataformas"],
        ["servicos casa", "Servicos casa"],
        ["casa", "Servicos casa"],
        ["vestuario", "Vestuario"],
        ["roupa", "Vestuario"],
        ["saude", "Saude"],
        ["remedio", "Saude"],
        ["farmacia", "Saude"],
        ["imprevistos", "Imprevistos"],
        ["imprevisto", "Imprevistos"],
        ["emprestimos e juros", "Emprestimos e Juros"],
        ["emprestimo", "Emprestimos e Juros"],
        ["juros", "Emprestimos e Juros"]
      ]);
      const map = kind === "INCOME" ? incomeMap : expenseMap;
      if (map.has(normalized)) {
        return map.get(normalized);
      }
      for (const [key, value] of map.entries()) {
        if (normalized.includes(key)) {
          return value;
        }
      }
      return kind === "INCOME" ? "Eventos" : "Alimentacao";
    };

    const model = OPENAI_INSTANT_MODEL || "gpt-4.1-nano";
    const completion = await createChatCompletion(apiKey, {
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "Interprete texto financeiro em pt-BR e responda APENAS JSON puro com campos: name, kind(INCOME|EXPENSE), category, amountCents, amount(optional), recurrenceType(SIMPLE|RECURRING), recurrenceDayOfMonth(optional). Regras obrigatorias: (1) se usuario falar 'dia X' ou 'todo dia X', use RECURRING e recurrenceDayOfMonth=X (1..31); (2) se recorrencia nao estiver explicita, use SIMPLE; (3) titulo minimalista e direto (max 25 chars). Categorias de saida permitidas: Alimentacao, Aluguel, Carro, Eventos, Servicos casa, Anuncios, Plataformas, Lazer, Vestuario, Saude, Imprevistos, Emprestimos e Juros. Categorias de entrada permitidas: Eventos, Inscricoes, Apoiadores, Site, Venda de ativo, Direitos autorais. Mapeamento: pao/comida/restaurante/mercado => Alimentacao; gasolina/uber/oficina => Carro; render/site/openai/chatgpt => Plataformas; luz/internet/gas/streaming/reparo/pintura/casa => Servicos casa (ou Aluguel quando for aluguel); viagem/pedagio/leds => Eventos ou Lazer; roupa/camisa/sapato => Vestuario; medico/farmacia/remedio/exame => Saude; emergencia/imprevisto => Imprevistos; emprestimo/juros => Emprestimos e Juros; royalties/direitos autorais => Direitos autorais. Se falar 'entrou/recebi/venda' tende a INCOME. Se falar 'gastei/paguei/comprei' tende a EXPENSE. Exemplo: 'gastei 10 reais de pao' => {name:'Padaria',kind:'EXPENSE',category:'Alimentacao',amountCents:1000,recurrenceType:'SIMPLE'}. Exemplo: '250 reais de luz todo dia 10' => {name:'Conta de luz',kind:'EXPENSE',category:'Servicos casa',amountCents:25000,recurrenceType:'RECURRING',recurrenceDayOfMonth:10}."
        },
        { role: "user", content: text.slice(0, 1200) }
      ]
    });

    const raw = extractChatCompletionText(completion);
    const parsed = JSON.parse(raw);
    const amountFromAmountCents = parseAmountCents(parsed?.amountCents);
    const amountFromAmount = parseAmountCents(parsed?.amount);
    const amountFromText = parseAmountFromText(text);
    const amountCents = Math.max(0, amountFromAmountCents || amountFromAmount || amountFromText);
    if (!amountCents) {
      sendJson(response, 422, { error: "Nao consegui identificar o valor." });
      return;
    }

    const kind = String(parsed?.kind || "EXPENSE").toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";
    const recurrenceType = String(parsed?.recurrenceType || "SIMPLE").toUpperCase() === "RECURRING" ? "RECURRING" : "SIMPLE";
    const recurrenceDayOfMonthRaw = Number(parsed?.recurrenceDayOfMonth || 1);
    const recurrenceDayOfMonth = Math.min(31, Math.max(1, Number.isFinite(recurrenceDayOfMonthRaw) ? recurrenceDayOfMonthRaw : 1));

    sendJson(response, 200, {
      ok: true,
      entry: {
        name: String(parsed?.name || "Lancamento").slice(0, 90),
        kind,
        category: normalizeCategory(parsed?.category, kind),
        amountCents,
        recurrenceType,
        recurrenceDayOfMonth
      },
      model
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Nao foi possivel interpretar o texto financeiro.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function handleProject200PersonalFinanceRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const requestUrl = new URL(request.url || "/api/200/finance/personal", `http://${request.headers.host || "localhost"}`);
    const period = requestUrl.searchParams.get("period") || "total";
    const [summary, notes] = await Promise.all([
      summarizeProject200PersonalFinance(user.id, period),
      getProject200FinanceNotes(user.id)
    ]);
    sendJson(response, 200, {
      ok: true,
      summary,
      notes
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o financeiro."
    });
  }
}

async function handleProject200PersonalFinanceNotesUpdate(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const notes = await saveProject200FinanceNotes(user.id, body?.notes);
    sendJson(response, 200, {
      ok: true,
      notes
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar as anotacoes."
    });
  }
}

async function handleExtraGoalsListRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const requestUrl = new URL(request.url || "/api/200/extra-goals", `http://${request.headers.host || "localhost"}`);
    const selectedProfile = await resolveProject200ProfileName(user.id, requestUrl.searchParams.get("profile"), { fallbackToDefault: true });
    const scopedGoals = await listExtraGoalsByScope(user.id, selectedProfile, requestUrl.searchParams.get("scope"));
    const goals = Array.isArray(scopedGoals?.goals) ? scopedGoals.goals : [];
    const summary = summarizeExtraGoals(goals);
    sendJson(response, 200, { ok: true, profile: selectedProfile, goals, summary, scope: scopedGoals?.scope || null });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar as missoes."
    });
  }
}

async function handleExtraGoalCreateRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const selectedProfile = await resolveProject200ProfileName(user.id, body?.profile, { fallbackToDefault: true });
    const goals = await createExtraGoal(user.id, selectedProfile, body);
    const summary = summarizeExtraGoals(goals);
    sendJson(response, 200, { ok: true, profile: selectedProfile, goals, summary });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel criar a missao."
    });
  }
}

async function handleExtraGoalProgressRequest(request, response, goalId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const selectedProfile = await resolveProject200ProfileName(user.id, body?.profile, { fallbackToDefault: true });
    const shouldTrackPointsUpdate = Math.trunc(Number(body?.delta || 0) || 0) !== 0;
    const pointsSnapshotPrepared = body?.pointsSnapshotPrepared === true;
    let dailyRankingBefore = null;
    if (shouldTrackPointsUpdate && (!pointsSnapshotPrepared || Math.trunc(Number(body?.delta || 0) || 0) < 0)) {
      try {
        dailyRankingBefore = await getProject200FriendsSnapshot(user.id, "today");
      } catch {}
    }
    const goals = await updateExtraGoalProgress(
      user.id,
      selectedProfile,
      goalId,
      body?.delta,
      new Date(),
      body?.variantId,
      body?.variantIds
    );
    const summary = summarizeExtraGoals(goals);
    let dailyRankingAfter = null;
    if (shouldTrackPointsUpdate) {
      try {
        dailyRankingAfter = await getProject200FriendsSnapshot(user.id, "today");
      } catch {}
    }
    sendJson(response, 200, {
      ok: true,
      profile: selectedProfile,
      goals,
      summary,
      pointsUpdate: dailyRankingAfter
        ? { before: dailyRankingBefore, after: dailyRankingAfter }
        : null
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar a missao."
    });
  }
}

async function syncProject200ActionPoints(userId, beforeAction, afterAction, { restore = false } = {}) {
  const beforeStatus = String(beforeAction?.status || "PENDING").trim().toUpperCase();
  const afterStatus = String(afterAction?.status || "PENDING").trim().toUpperCase();
  const actionId = String(afterAction?.id || beforeAction?.id || "").trim();
  if (!actionId) {
    return { pointsAwarded: 0, pointsUpdate: null };
  }
  if (restore || (beforeStatus === "COMPLETED" && afterStatus !== "COMPLETED")) {
    let dailyRankingBefore = null;
    try {
      dailyRankingBefore = await getProject200FriendsSnapshot(userId, "today");
    } catch {}
    const removed = await removeProject200ActionPoints(userId, actionId);
    let dailyRankingAfter = null;
    if (removed) {
      try {
        dailyRankingAfter = await getProject200FriendsSnapshot(userId, "today");
      } catch {}
    }
    return {
      pointsAwarded: -Math.max(0, Math.trunc(Number(removed?.points || 0) || 0)),
      pointsUpdate: removed && dailyRankingBefore && dailyRankingAfter
        ? { before: dailyRankingBefore, after: dailyRankingAfter }
        : null
    };
  }
  const afterPercent = afterStatus === "COMPLETED"
    ? 100
    : Math.max(0, Math.min(100, Math.trunc(Number(afterAction?.completionPercent || 0) || 0)));
  const beforePercent = beforeStatus === "COMPLETED"
    ? 100
    : Math.max(0, Math.min(100, Math.trunc(Number(beforeAction?.completionPercent || 0) || 0)));
  if (!(["PAUSED", "COMPLETED"].includes(afterStatus)) || afterPercent <= 0 || (beforeStatus === afterStatus && beforePercent === afterPercent)) {
    return { pointsAwarded: 0, pointsUpdate: null };
  }

  let dailyRankingBefore = null;
  try {
    dailyRankingBefore = await getProject200FriendsSnapshot(userId, "today");
  } catch {}
  const award = await recordProject200ActionPoints(userId, afterAction, afterAction?.completedAt || afterAction?.statusUpdatedAt || new Date());
  const pointsDelta = Math.trunc(Number(award?.deltaPoints || 0) || 0);
  if (!pointsDelta) {
    return { pointsAwarded: 0, pointsUpdate: null };
  }
  let dailyRankingAfter = null;
  try {
    dailyRankingAfter = await getProject200FriendsSnapshot(userId, "today");
  } catch {}
  return {
    pointsAwarded: pointsDelta,
    pointsUpdate: dailyRankingBefore && dailyRankingAfter
      ? { before: dailyRankingBefore, after: dailyRankingAfter }
      : null
  };
}

async function handleExtraGoalUpdateRequest(request, response, goalId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const selectedProfile = await resolveProject200ProfileName(user.id, body?.profile, { fallbackToDefault: true });
    const goals = await updateExtraGoal(user.id, selectedProfile, goalId, body);
    const summary = summarizeExtraGoals(goals);
    sendJson(response, 200, { ok: true, profile: selectedProfile, goals, summary });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel editar a missao."
    });
  }
}

async function handleExtraGoalDeleteRequest(request, response, goalId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const requestUrl = new URL(request.url || "/api/200/extra-goals", `http://${request.headers.host || "localhost"}`);
    const selectedProfile = await resolveProject200ProfileName(user.id, requestUrl.searchParams.get("profile"), { fallbackToDefault: true });
    const goals = await deleteExtraGoal(user.id, selectedProfile, goalId);
    const summary = summarizeExtraGoals(goals);
    sendJson(response, 200, { ok: true, profile: selectedProfile, goals, summary });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir a missao."
    });
  }
}

async function handleProject200ActionInterpret(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = String(body?.text || "").trim();
  if (!text) {
    sendJson(response, 400, { error: "Texto ausente." });
    return;
  }

  try {
    const authUser = await requireAuth(request, response);
    if (!authUser) {
      return;
    }

    const profileNames = await listProject200ProfileNames(authUser.id);
    const assigneePrompt = profileNames.length ? profileNames.join("|") : PROJECT200_DEFAULT_PROFILE_NAME;
    const model = OPENAI_INSTANT_MODEL || "gpt-4.1-nano";
    const completion = await createChatCompletion(apiKey, {
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Interprete pedido de tarefa em pt-BR. Responda JSON puro com: title(max 25 chars, minimo possivel), startHour(0-23), startMinute(0-59), endHour(0-23), endMinute(0-59), repeatRule(none|daily|custom), repeatDays(array com 0=dom..6=sab), assignee(${assigneePrompt}|""), assigneeDetected(boolean). Se horario final nao ficar claro, infira pelo contexto da tarefa (ex: treino/caminhada tende a 60-120 min; higiene matinal 20-60 min; leitura/estudo 30-90 min), mantendo inicio e fim coerentes. Se ainda assim faltar horario: use proxima hora cheia e +1h no fim. Se pessoa nao for citada: assignee vazio e assigneeDetected false. Se texto disser todo dia: daily. Se citar dias da semana: custom com repeatDays. Se nao mencionar recorrencia: none.`
        },
        { role: "user", content: text.slice(0, 1200) }
      ]
    });

    const raw = extractChatCompletionText(completion);
    const parsed = JSON.parse(raw);

    const clampHour = (value, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return fallback;
      }
      return Math.max(0, Math.min(23, Math.round(n)));
    };
    const clampMinute = (value, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return fallback;
      }
      return Math.max(0, Math.min(59, Math.round(n)));
    };

    const now = new Date();
    const defaultStartHour = (now.getHours() + 1) % 24;
    const title = String(parsed?.title || "Tarefa").trim().slice(0, 25) || "Tarefa";
    const startHour = clampHour(parsed?.startHour, defaultStartHour);
    const startMinute = clampMinute(parsed?.startMinute, 0);
    let endHour = clampHour(parsed?.endHour, (startHour + 1) % 24);
    let endMinute = clampMinute(parsed?.endMinute, startMinute);
    if (endHour === startHour && endMinute <= startMinute) {
      endHour = (startHour + 1) % 24;
      endMinute = startMinute;
    }

    const repeatRuleRaw = String(parsed?.repeatRule || "none").toLowerCase();
    const repeatRule = repeatRuleRaw === "daily" || repeatRuleRaw === "custom" ? repeatRuleRaw : "none";
    const repeatDays = Array.isArray(parsed?.repeatDays)
      ? [...new Set(parsed.repeatDays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
      : [];
    const assignee = String(parsed?.assignee || "").trim()
      ? await resolveProject200ProfileName(authUser.id, parsed?.assignee, { fallbackToDefault: false }).catch(() => "")
      : "";
    const assigneeDetected = Boolean(parsed?.assigneeDetected && assignee);

    sendJson(response, 200, {
      ok: true,
      action: {
        title,
        startHour,
        startMinute,
        endHour,
        endMinute,
        repeatRule: repeatRule === "custom" && !repeatDays.length ? "none" : repeatRule,
        repeatDays,
        assignee,
        assigneeDetected
      },
      model
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Nao foi possivel interpretar a tarefa.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

const PROJECT200_TASK_CATEGORIES = [
  { id: "sono", name: "Sono" },
  { id: "alimentacao", name: "Alimentação" },
  { id: "hidratacao", name: "Hidratação" },
  { id: "aprendizado", name: "Aprendizado" },
  { id: "trabalho", name: "Trabalho" },
  { id: "casa", name: "Casa" },
  { id: "exercicios", name: "Exercícios" },
  { id: "social", name: "Social" },
  { id: "planejamento", name: "Planejamento" },
  { id: "higiene", name: "Higiene" },
  { id: "lazer", name: "Lazer" },
  { id: "aspecto", name: "Aspecto" }
];

function inferProject200CategoryLocally(title) {
  const normalized = String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const pick = (id) => PROJECT200_TASK_CATEGORIES.find((item) => item.id === id) || PROJECT200_TASK_CATEGORIES[0];
  if (/\b(agua|hidrata|garrafa|beber)\b/.test(normalized)) return pick("hidratacao");
  if (/\b(cafe|almoco|jantar|comida|refeicao|lanche|cozinhar)\b/.test(normalized)) return pick("alimentacao");
  if (/\b(dormir|sono|cochilo|descansar)\b/.test(normalized)) return pick("sono");
  if (/\b(estudar|estudo|ler|leitura|curso|aula|revisao|aprender|habilidade|treinar idioma)\b/.test(normalized)) return pick("aprendizado");
  if (/\b(planejar|planejamento|agenda|meta|organizar|orcamento|fatura|conta|pix|pagar|invest|finance|dinheiro)\b/.test(normalized)) return pick("planejamento");
  if (/\b(reuniao|projeto|cliente|entrega|trabalho|task)\b/.test(normalized)) return pick("trabalho");
  if (/\b(arrumar|limpar|lavar|cozinha|quarto|banheiro|casa)\b/.test(normalized)) return pick("casa");
  if (/\b(filme|serie|jogo|lazer|passeio)\b/.test(normalized)) return pick("lazer");
  if (/\b(treino|academia|corrida|caminhada|alongamento|exercicio)\b/.test(normalized)) return pick("exercicios");
  if (/\b(amigo|social|evento|encontro)\b/.test(normalized)) return pick("social");
  if (/\b(familia|filho|filha|pai|mae|esposa|marido)\b/.test(normalized)) return pick("planejamento");
  if (/\b(escovar|banho|higiene|barba|cabelo|dente)\b/.test(normalized)) return pick("higiene");
  return pick("aspecto");
}

async function suggestProject200SvgAsset(text, options = {}) {
  const input = String(text || "").trim();
  const kind = String(options?.kind || "task").trim().toLowerCase() || "task";
  const candidates = await findProject200SvgCandidates(input, 24);
  const fallback = candidates[0] || null;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!fallback) {
    return null;
  }

  if (!apiKey) {
    return {
      id: fallback.id,
      label: fallback.label,
      fileName: fallback.fileName,
      keywords: Array.isArray(fallback.keywords) ? fallback.keywords : [],
      url: buildProject200SvgAssetUrl(fallback.fileName),
      model: "local-fallback"
    };
  }

  try {
    const model = OPENAI_INSTANT_MODEL || "gpt-4.1-nano";
    const completion = await createChatCompletion(apiKey, {
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Escolha somente um SVG para ${kind} com base no texto. Responda JSON puro {"id":"..."} usando apenas um dos ids listados. Prefira o SVG mais concreto, útil e visualmente intuitivo.`
        },
        {
          role: "user",
          content: `Texto: ${input.slice(0, 300)}\n\nSVGs candidatos:\n${buildProject200SvgSearchPrompt(candidates)}`
        }
      ]
    });
    const raw = extractChatCompletionText(completion);
    const parsed = JSON.parse(raw);
    const chosen = findProject200SvgById(candidates, parsed?.id) || fallback;
    return {
      id: chosen.id,
      label: chosen.label,
      fileName: chosen.fileName,
      keywords: Array.isArray(chosen.keywords) ? chosen.keywords : [],
      url: buildProject200SvgAssetUrl(chosen.fileName),
      model
    };
  } catch {
    return {
      id: fallback.id,
      label: fallback.label,
      fileName: fallback.fileName,
      keywords: Array.isArray(fallback.keywords) ? fallback.keywords : [],
      url: buildProject200SvgAssetUrl(fallback.fileName),
      model: "local-fallback"
    };
  }
}

async function handleProject200ActionCategorize(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  const title = String(body?.title || "").trim();
  if (title.length < 2) {
    sendJson(response, 400, { error: "Título ausente." });
    return;
  }

  if (!apiKey) {
    const local = inferProject200CategoryLocally(title);
    sendJson(response, 200, { ok: true, category: local, model: "local-fallback" });
    return;
  }

  try {
    const model = "gpt-4.1-nano";
    const completion = await createChatCompletion(apiKey, {
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Classifique o título de tarefa em UM dos 12 aspectos. Responda JSON puro: {"categoryId":"...","categoryName":"..."}. Use Aspecto apenas quando nenhum conceito for claramente provável. Aspectos válidos: ${PROJECT200_TASK_CATEGORIES.map((c) => `${c.id}=${c.name}`).join("; ")}.`
        },
        { role: "user", content: title.slice(0, 180) }
      ]
    });
    const raw = extractChatCompletionText(completion);
    const parsed = JSON.parse(raw);
    const categoryId = String(parsed?.categoryId || "").trim().toLowerCase();
    const hit = PROJECT200_TASK_CATEGORIES.find((item) => item.id === categoryId) || inferProject200CategoryLocally(title);
    sendJson(response, 200, {
      ok: true,
      category: hit,
      model
    });
  } catch {
    const local = inferProject200CategoryLocally(title);
    sendJson(response, 200, { ok: true, category: local, model: "local-fallback" });
  }
}

async function handleProject200SvgSuggest(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const text = String(body?.text || "").trim();
  const kind = String(body?.kind || "task").trim().toLowerCase() || "task";
  if (text.length < 2) {
    sendJson(response, 400, { error: "Texto ausente." });
    return;
  }

  try {
    const asset = await suggestProject200SvgAsset(text, { kind });
    sendJson(response, 200, {
      ok: true,
      asset
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel sugerir o SVG."
    });
  }
}

async function handleProject200ProfileSvgSuggestRequest(request, response, profileId) {
  const authUser = await requireAuth(request, response);
  if (!authUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    body = {};
  }

  try {
    const profiles = await listProject200Profiles(authUser.id);
    const profile = profiles.find((item) => String(item.id || "").trim() === String(profileId || "").trim());
    if (!profile) {
      sendJson(response, 404, { error: "Usuario nao encontrado." });
      return;
    }
    const text = String(body?.text || profile.name || "").trim();
    const asset = await suggestProject200SvgAsset(text, { kind: "profile" });
    if (!asset) {
      sendJson(response, 404, { error: "Nenhum SVG encontrado." });
      return;
    }
    const updatedProfile = await updateProject200ProfileSvgIcon(authUser.id, profile.id, {
      svgIconUrl: asset.url,
      svgIconLabel: asset.label
    });
    sendJson(response, 200, {
      ok: true,
      profile: updatedProfile,
      asset
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel escolher o SVG do usuario."
    });
  }
}

async function handleMiniLessonPlanGenerate(request, response) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const theme = String(body?.theme || "").trim();
  const bibleText = String(body?.bibleText || "").trim() || "a definir";
  const age = Math.max(6, Math.min(14, Number(body?.age || 6)));
  const durationMinutesInput = Number(body?.durationMinutes || 0);
  const chatId = String(body?.chatId || "").trim();
  const selectedBlocks = Array.isArray(body?.selectedBlocks) ? body.selectedBlocks : [];
  const normalizedBlocks = selectedBlocks
    .map((item) => ({
      name: String(item?.name || "").trim(),
      minutes: Number(item?.minutes || 0)
    }))
    .filter((item) => item.name);

  const blocks = normalizedBlocks.length
    ? normalizedBlocks.slice(0, 12)
    : [
      { name: "Abertura", minutes: 5 },
      { name: "Historia biblica", minutes: 12 },
      { name: "Aplicacao pratica", minutes: 10 },
      { name: "Oracao final", minutes: 5 }
    ];
  const durationMinutes = durationMinutesInput > 0
    ? durationMinutesInput
    : blocks.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const durationText = durationMinutes > 0 ? `${durationMinutes} minutos` : "a definir";

  const model = "gpt-5.1";
  const themePrompt = theme || "aula infantil cristã";
  const authUser = await getOptionalAuthUser(request);
  const sharedContext = await getContextPrompt();

  try {
    const stageNames = blocks.map((b) => b.name);
    let chatMemory = "";

    if (authUser && chatId) {
      const chat = await getMiniChatById(authUser.id, chatId).catch(() => null);
      if (chat) {
        chatMemory = chat.messages
          .slice(-12)
          .map((message) => `${message.role === "assistant" ? "IA" : "Usuario"}: ${String(message.content || "").slice(0, 240)}`)
          .join(" | ");
      }
    }

    const system = buildMiniSystemPrompt({
      modeKey: "project",
      sharedContext,
      plannerContext: MINI_MINISTRY_CONTEXT,
      chatMemory,
      theme: themePrompt,
      bibleText,
      age,
      durationText,
      extraInstructions: [
        "Crie uma resposta unica e consolidada, mas organizada em partes coerentes com os blocos escolhidos.",
        "Interprete todos os blocos da aula na ordem recebida e transforme isso em uma narrativa fluida com introducao geral, transicoes naturais e aplicacao pratica.",
        "O resultado deve ter cerca de 4000 caracteres no total, com minimo de 3200 e maximo de 4500, em portugues do Brasil.",
        "A resposta deve ter uma introducao curta que conecte todos os blocos e depois um texto principal em 3 a 5 paragrafos, cada um com um subtitulo simples e claro.",
        "Cada paragrafo deve conversar com o tempo do bloco e com o contexto da aula, sem soar como uma lista de cards.",
        "Não trate os blocos como cards independentes; faça o texto soar como uma aula unica, coesa e legível.",
        "Responda em JSON puro com as chaves mainTitle, intro, content e parts.",
        "O campo content deve conter o texto consolidado completo da aula em paragrafos.",
        "Se quiser, parts pode repetir esses paragrafos para compatibilidade, mas o front vai priorizar content."
      ].join(" ")
    });
    const lessonPlanJsonSchema = {
      name: "mini_lesson_plan",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["mainTitle", "intro", "content", "parts"],
        properties: {
          mainTitle: { type: "string" },
          intro: { type: "string" },
          content: { type: "string" },
          parts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "minutes", "content"],
              properties: {
                title: { type: "string" },
                minutes: { type: "integer" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    };
    const completion = await createChatCompletion(apiKey, {
      model,
      reasoning_effort: "none",
      temperature: 0.35,
      max_completion_tokens: 1800,
      response_format: {
        type: "json_schema",
        json_schema: lessonPlanJsonSchema
      },
      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: `Blocos programados (ordem obrigatoria): ${stageNames.join(" | ")}\nEscreva uma unica reflexao/plano de aula consolidado a partir desses blocos, sem separar por bloco.`
        }
      ]
    });

    const raw = extractChatCompletionText(completion);
    const parsed = parseStructuredJsonText(raw);

    const mainTitle = String(parsed?.mainTitle || `Plano de Aula: ${themePrompt}`).trim();
    const intro = String(parsed?.intro || "").trim();
    const consolidatedContent = String(parsed?.content || "").trim();
    const parts = Array.isArray(parsed?.parts) ? parsed.parts : [];
    const plainOutput = [consolidatedContent, intro, ...parts.map((item) => String(item?.content || "").trim())].filter(Boolean).join("\n\n").trim();
    const seedText = consolidatedContent || plainOutput || intro || raw;
    const splitSeedText = (text, count) => {
      const clean = String(text || "").trim();
      if (!clean || count <= 0) {
        return [];
      }
      const paragraphChunks = clean.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
      if (paragraphChunks.length > 1) {
        return paragraphChunks;
      }
      const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [clean];
      const bucketSize = Math.max(1, Math.ceil(sentences.length / count));
      const buckets = [];
      for (let index = 0; index < count; index += 1) {
        const start = index * bucketSize;
        const end = start + bucketSize;
        const chunk = sentences.slice(start, end).join(" ").trim();
        if (chunk) {
          buckets.push(chunk);
        }
      }
      return buckets.length ? buckets : [clean];
    };
    const normalizedParts = stageNames.map((name, index) => {
      const source = parts[index] || {};
      const fallbackChunk = splitSeedText(seedText, stageNames.length)[index] || "";
      return {
        title: String(source?.title || name).trim() || name,
        minutes: Number(source?.minutes || blocks[index]?.minutes || 0) || Number(blocks[index]?.minutes || 0) || 0,
        content: String(source?.content || "").trim() || fallbackChunk || seedText
      };
    });

    const fallbackChunks = splitSeedText(seedText, stageNames.length);

    const balancedParts = normalizedParts.map((part, index) => {
      const ownContent = String(part.content || "").trim();
      if (ownContent) {
        return part;
      }

      const fallbackText = fallbackChunks[index] || fallbackChunks[0] || "";
      return {
        ...part,
        content: fallbackText || part.content
      };
    });

    const hasAnyRealPartContent = balancedParts.some((part) => String(part.content || "").trim());
    const finalParts = hasAnyRealPartContent ? balancedParts : normalizedParts;
    const finalContent = consolidatedContent || raw || [intro, ...finalParts.map((item) => String(item?.content || "").trim())].filter(Boolean).join("\n\n").trim();

    sendJson(response, 200, {
      ok: true,
      model,
      mainTitle,
      intro,
      content: finalContent,
      parts: finalParts
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Falha ao gerar plano.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

function createMiniChatTitleFromMessage(message) {
  const cleaned = String(message || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Novo chat";
  }

  return cleaned.slice(0, 32).replace(/[.!?]+$/g, "") || "Novo chat";
}

function getProjectTimeZoneOffsetMinutes(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PROJECT200_TIME_ZONE,
    timeZoneName: "shortOffset",
    hour: "2-digit"
  });
  const value = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value || "GMT-3";
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return -180;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes);
}

function getProjectCalendarParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT200_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day")
  };
}

function makeProjectZonedDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const offsetMinutes = getProjectTimeZoneOffsetMinutes(new Date(guessUtcMs));
  return new Date(guessUtcMs - (offsetMinutes * 60000));
}

function formatProjectNowLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PROJECT200_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function startOfProjectDay(date) {
  const { year, month, day } = getProjectCalendarParts(date);
  return makeProjectZonedDate(year, month, day, 0, 0, 0);
}

function addProjectDays(date, amount) {
  return new Date(date.getTime() + (amount * 86400000));
}

function startOfProjectWeek(date) {
  const value = startOfProjectDay(date);
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: PROJECT200_TIME_ZONE,
    weekday: "short"
  }).format(value);
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  const weekday = weekdayMap[weekdayLabel] ?? 0;
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addProjectDays(value, -daysSinceMonday);
}

function summarizeProject200OwnProgress(actions = []) {
  const totalMinutes = actions.reduce((sum, action) => {
    const startAt = action?.startAt ? new Date(action.startAt).getTime() : NaN;
    const endAt = action?.endAt ? new Date(action.endAt).getTime() : NaN;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
      return sum;
    }
    return sum + Math.round((endAt - startAt) / 60000);
  }, 0);
  const completedMinutes = actions.reduce((sum, action) => {
    if (String(action?.status || "").trim().toUpperCase() !== "COMPLETED") {
      return sum;
    }
    const startAt = action?.startAt ? new Date(action.startAt).getTime() : NaN;
    const endAt = action?.endAt ? new Date(action.endAt).getTime() : NaN;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
      return sum;
    }
    return sum + Math.round((endAt - startAt) / 60000);
  }, 0);
  const lateStartMinutes = actions.reduce((sum, action) => sum + Math.max(0, Number(action?.lateStartMinutes || 0)), 0);
  return {
    totalMinutes,
    completedMinutes,
    lateStartMinutes,
    completionPercent: totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0
  };
}

function summarizeProject200ScheduledMinutes(actions) {
  return (Array.isArray(actions) ? actions : []).reduce((sum, action) => {
    const startAt = action?.startAt ? new Date(action.startAt).getTime() : NaN;
    const endAt = action?.endAt ? new Date(action.endAt).getTime() : NaN;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
      return sum;
    }
    return sum + Math.max(0, Math.round((endAt - startAt) / (60 * 1000)));
  }, 0);
}

function describeProject200PlannedMinutesBand(plannedMinutes) {
  const total = Math.max(0, Math.round(Number(plannedMinutes || 0)));
  if (total >= 6000) {
    return "ideal";
  }
  if (total >= 4000) {
    return "media minima";
  }
  if (total >= 2000) {
    return "pouco, mas bom pra comecar";
  }
  if (total >= 1000) {
    return "fraco ainda";
  }
  if (total >= 500) {
    return "muito baixo";
  }
  return "criticamente baixo";
}

function formatProject200ActionLine(action, now) {
  const assignee = normalizeStoredProject200ProfileName(action?.assignee);
  const title = String(action?.title || "Tarefa").trim();
  const start = action?.startAt ? new Date(action.startAt) : null;
  const end = action?.endAt ? new Date(action.endAt) : null;
  const status = String(action?.status || "PENDING").trim().toUpperCase();
  const timeFormat = {
    timeZone: PROJECT200_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  const startLabel = start && !Number.isNaN(start.getTime()) ? start.toLocaleTimeString("pt-BR", timeFormat) : "--:--";
  const endLabel = end && !Number.isNaN(end.getTime()) ? end.toLocaleTimeString("pt-BR", timeFormat) : "--:--";
  let badge = "pendente";
  if (status === "COMPLETED") {
    badge = "concluída";
  } else if (status === "IN_PROGRESS") {
    badge = "em andamento";
  } else if (start && start.getTime() < now.getTime()) {
    badge = "atrasada";
  }
  return `${startLabel}-${endLabel} | ${assignee} | ${title} | ${badge}`;
}

function clipProject200Text(value, maxLength = 140) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}…` : cleaned;
}

function formatProject200CompletedActionLine(action) {
  const assignee = normalizeStoredProject200ProfileName(action?.assignee);
  const title = String(action?.title || "Tarefa").trim();
  const completedAt = action?.completedAt ? new Date(action.completedAt) : null;
  const timeFormat = {
    timeZone: PROJECT200_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  const completedLabel = completedAt && !Number.isNaN(completedAt.getTime())
    ? completedAt.toLocaleTimeString("pt-BR", timeFormat)
    : "--:--";
  return `${completedLabel} | ${assignee} | ${title} | concluida`;
}

function filterProject200ActionsByProfile(actions, profileName) {
  const normalizedProfile = normalizeStoredProject200ProfileName(profileName);
  return (Array.isArray(actions) ? actions : []).filter((action) => (
    normalizeStoredProject200ProfileName(action?.assignee) === normalizedProfile
  ));
}

function summarizeProject200ProfileProgress(actions) {
  const list = Array.isArray(actions) ? actions : [];
  let totalMinutes = 0;
  let completedMinutes = 0;
  let lateStartMinutes = 0;

  for (const action of list) {
    const startAt = action?.startAt ? new Date(action.startAt).getTime() : NaN;
    const endAt = action?.endAt ? new Date(action.endAt).getTime() : NaN;
    const startedAt = action?.startedAt ? new Date(action.startedAt).getTime() : NaN;
    const durationMinutes = Number.isFinite(startAt) && Number.isFinite(endAt) && endAt > startAt
      ? Math.round((endAt - startAt) / (60 * 1000))
      : 0;
    totalMinutes += durationMinutes;
    if (String(action?.status || "").trim().toUpperCase() === "COMPLETED") {
      completedMinutes += durationMinutes;
    }
    if (Number.isFinite(startedAt) && Number.isFinite(startAt) && startedAt > startAt) {
      lateStartMinutes += Math.round((startedAt - startAt) / (60 * 1000));
    }
  }

  return {
    totalMinutes,
    completedMinutes,
    lateStartMinutes,
    completionPercent: totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0
  };
}

async function buildMiniChatCompletionPrompt({ user, chat, modeKey, message, extraContext = "" }) {
  const recentMessages = Array.isArray(chat?.messages) ? chat.messages.slice(-12) : [];
  const chatMemory = recentMessages
    .map((item) => `${item.role === "assistant" ? "IA" : "Usuario"}: ${String(item.content || "").slice(0, 240)}`)
    .join(" | ");
  const sharedContext = await getContextPrompt();

  return buildMiniSystemPrompt({
    modeKey,
    chatMemory,
    sharedContext,
    plannerContext: MINI_MINISTRY_CONTEXT,
    responseStyle: "",
    callName: "",
    ministryRole: "Lider",
    ministryDream: "",
    extraInstructions: [
      "A conversa pertence ao MINI da Turma do Printy e pode ser reaproveitada no planejador de aulas quando fizer sentido.",
      "Se o usuario trouxer tema, idade, texto biblico, atividades ou ideias, considere isso como contexto disponivel para futuras aulas.",
      extraContext
    ].filter(Boolean).join(" ")
  });
}

async function handleMiniChatsListRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const chats = await listMiniChats(user.id, 30);
    sendJson(response, 200, { ok: true, chats });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar chats."
    });
  }
}

async function handleMiniChatsCreateRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const chat = await createMiniChat(user.id, {
      title: body?.title || "Novo chat",
      messages: Array.isArray(body?.messages) ? body.messages : []
    });
    sendJson(response, 201, { ok: true, chat });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel criar chat."
    });
  }
}

async function handleMiniLessonPlansListRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const plans = await listMiniLessonPlans(user.id, 30);
    sendJson(response, 200, { ok: true, plans });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar os planos."
    });
  }
}

function normalizeMiniCourseStyle(value) {
  return String(value || "").trim().toLowerCase() === "story" ? "story" : "course";
}

function buildMiniCourseStyleLabel(style) {
  return normalizeMiniCourseStyle(style) === "story" ? "Estilo historia" : "Estilo curso";
}

function buildMiniCourseMapTitle(style) {
  return normalizeMiniCourseStyle(style) === "story" ? "Mapa da historia" : "Mapa do curso";
}

function distributeMiniCourseKindCounts(total, ratioEntries) {
  const safeTotal = Math.max(1, Number(total || 1) || 1);
  const draft = ratioEntries.map(([kind, ratio]) => ({
    kind,
    count: Math.floor(safeTotal * ratio),
    remainder: (safeTotal * ratio) - Math.floor(safeTotal * ratio)
  }));
  let assigned = draft.reduce((sum, entry) => sum + entry.count, 0);
  while (assigned < safeTotal) {
    draft
      .slice()
      .sort((a, b) => b.remainder - a.remainder)
      .some((entry) => {
        entry.count += 1;
        assigned += 1;
        return true;
      });
  }
  return draft;
}

function buildMiniCourseChapterContentKinds(pageCount, style = "course") {
  const safeStyle = normalizeMiniCourseStyle(style);
  const ratios = safeStyle === "story"
    ? [["text", 0.5], ["closing", 0.5]]
    : [["text", 0.5], ["didactic", 0.25], ["closing", 0.25]];
  const counts = distributeMiniCourseKindCounts(pageCount, ratios);
  const kinds = [];
  for (const entry of counts) {
    for (let index = 0; index < entry.count; index += 1) {
      kinds.push(entry.kind);
    }
  }
  while (kinds.length < pageCount) {
    kinds.push("text");
  }
  return kinds.slice(0, pageCount);
}

function distributeMiniCoursePagesAcrossChapters(totalPages, chapterCount) {
  const safeTotal = Math.max(4, Math.min(300, Number(totalPages || 8) || 8));
  const safeChapters = Math.max(1, Math.min(safeTotal, Number(chapterCount || 1) || 1));
  const base = Math.floor(safeTotal / safeChapters);
  const remainder = safeTotal % safeChapters;
  return Array.from({ length: safeChapters }, (_, index) => base + (index < remainder ? 1 : 0));
}

function buildMiniCourseChapterBlueprints(pageCount, chapterCount, style) {
  const contentPages = distributeMiniCoursePagesAcrossChapters(pageCount, chapterCount);
  return contentPages.map((contentPageCount, index) => ({
    chapterNumber: index + 1,
    contentPageCount,
    contentKinds: buildMiniCourseChapterContentKinds(contentPageCount, style)
  }));
}

function renumberMiniCoursePages(pages = []) {
  return (Array.isArray(pages) ? pages : []).map((page, index) => ({
    ...page,
    pageNumber: index + 1
  }));
}

function normalizeMiniCourseGeneratedPage(page, index, expectedKind = "text") {
  const kind = ["text", "didactic", "closing", "course-map", "chapter_open"].includes(String(page?.kind || "").trim().toLowerCase())
    ? String(page.kind).trim().toLowerCase()
    : expectedKind;
  const paragraphs = Array.isArray(page?.paragraphs)
    ? page.paragraphs.map((item) => String(item || "").trim()).filter(Boolean).slice(0, kind === "closing" ? 3 : 2)
    : [];
  const bullets = Array.isArray(page?.bullets)
    ? page.bullets.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];
  const tableRows = Array.isArray(page?.tableRows)
    ? page.tableRows
      .map((item) => ({
        label: String(item?.label || "").trim(),
        value: String(item?.value || "").trim()
      }))
      .filter((item) => item.label || item.value)
      .slice(0, 6)
    : [];

  return {
    pageNumber: index + 1,
    kind,
    title: String(page?.title || `Pagina ${index + 1}`).trim() || `Pagina ${index + 1}`,
    subtitle: String(page?.subtitle || "").trim(),
    logline: String(page?.logline || "").trim(),
    chapterNumber: Math.max(0, Number(page?.chapterNumber || 0) || 0),
    paragraphs,
    bullets,
    tableRows,
    imageUrl: "",
    imagePrompt: "",
    audioUrl: "",
    audioScript: ""
  };
}

function getMiniCoursePageTextLength(page) {
  return (Array.isArray(page?.paragraphs) ? page.paragraphs : [])
    .map((item) => String(item || "").trim())
    .join(" ")
    .trim()
    .length;
}

function evaluateMiniCoursePages(pages = [], startPageNumber = 1) {
  const issues = [];
  const validPages = pages.filter((page, index) => {
    const displayPageNumber = startPageNumber + index;
    const kind = String(page?.kind || "").trim().toLowerCase();
    const paragraphs = Array.isArray(page?.paragraphs) ? page.paragraphs.filter(Boolean) : [];
    const bullets = Array.isArray(page?.bullets) ? page.bullets.filter(Boolean) : [];
    const tableRows = Array.isArray(page?.tableRows) ? page.tableRows.filter((item) => item?.label || item?.value) : [];
    const textLength = getMiniCoursePageTextLength(page);

    if (kind === "course-map") {
      const ok = Boolean(String(page?.title || "").trim()) && tableRows.length >= 1;
      if (!ok) {
        issues.push(`Pagina ${displayPageNumber} de mapa do curso veio vazia ou sem capitulos.`);
      }
      return ok;
    }

    if (kind === "chapter_open") {
      const ok = Boolean(String(page?.title || "").trim()) && Boolean(String(page?.logline || "").trim());
      if (!ok) {
        issues.push(`Pagina ${displayPageNumber} de abertura de capitulo veio incompleta.`);
      }
      return ok;
    }

    if (kind === "text") {
      const ok = paragraphs.length >= 1 && textLength >= 320;
      if (!ok) {
        issues.push(`Pagina ${displayPageNumber} de texto veio fraca ou vazia.`);
      }
      return ok;
    }

    if (kind === "didactic") {
      const ok = bullets.length >= 3 || tableRows.length >= 2 || textLength >= 220;
      if (!ok) {
        issues.push(`Pagina ${displayPageNumber} didatica veio sem estrutura suficiente.`);
      }
      return ok;
    }

    if (kind === "closing") {
      const ok = paragraphs.length >= 3 && textLength >= 320;
      if (!ok) {
        issues.push(`Pagina ${displayPageNumber} final veio curta ou incompleta.`);
      }
      return ok;
    }

    const ok = paragraphs.length >= 1 || bullets.length >= 1 || tableRows.length >= 1;
    if (!ok) {
      issues.push(`Pagina ${displayPageNumber} veio vazia.`);
    }
    return ok;
  });

  return {
    validCount: validPages.length,
    issues
  };
}

function buildMiniCourseChunkSchema(chunkKinds) {
  const properties = {
    pages: {
      type: "array",
      minItems: chunkKinds.length,
      maxItems: chunkKinds.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "kind", "title", "subtitle", "logline", "chapterNumber", "paragraphs", "bullets", "tableRows"],
        properties: {
          pageNumber: { type: "integer" },
          kind: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          logline: { type: "string" },
          chapterNumber: { type: "integer" },
          paragraphs: { type: "array", items: { type: "string" } },
          bullets: { type: "array", items: { type: "string" } },
          tableRows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "value"],
              properties: {
                label: { type: "string" },
                value: { type: "string" }
              }
            }
          }
        }
      }
    }
  };

  return {
    name: "mini_course_chapter_chunk",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["pages"],
      properties
    }
  };
}

function buildMiniCourseChapterPlanSchema(chapterCount = 1) {
  return {
    name: "mini_course_chapter_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["mainTitle", "courseOverview", "chapters"],
      properties: {
        mainTitle: { type: "string" },
        courseOverview: { type: "string" },
        chapters: {
          type: "array",
          minItems: chapterCount,
          maxItems: chapterCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["chapterNumber", "title", "subtitle", "logline"],
            properties: {
              chapterNumber: { type: "integer" },
              title: { type: "string" },
              subtitle: { type: "string" },
              logline: { type: "string" }
            }
          }
        }
      }
    }
  };
}

function buildMiniCourseMapPage({ courseTitle, courseOverview, chapters, style = "course" }) {
  return normalizeMiniCourseGeneratedPage({
    kind: "course-map",
    title: buildMiniCourseMapTitle(style),
    subtitle: courseTitle,
    logline: courseOverview,
    tableRows: (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
      label: `Capitulo ${chapter.chapterNumber}`,
      value: [
        String(chapter.title || "").trim(),
        chapter.subtitle ? String(chapter.subtitle).trim() : "",
        chapter.logline ? String(chapter.logline).trim() : ""
      ].filter(Boolean).join(" • ")
    }))
  }, 0, "course-map");
}

function buildMiniCourseMapPromptText({ courseTitle, courseOverview, chapters, style = "course" }) {
  return [
    `${buildMiniCourseMapTitle(style)}: ${courseTitle}`,
    courseOverview ? `Visao geral: ${courseOverview}` : "",
    ...(Array.isArray(chapters) ? chapters : []).map((chapter) => (
      `Capitulo ${chapter.chapterNumber}: ${chapter.title}${chapter.subtitle ? ` | ${chapter.subtitle}` : ""}${chapter.logline ? ` | ${chapter.logline}` : ""}`
    ))
  ].filter(Boolean).join("\n");
}

async function planMiniCourseStructure({ apiKey, model = "gpt-5.1", title, context, pageCount, chapterCount = 1, courseStyle = "course" } = {}) {
  const sharedContext = await getContextPrompt();
  const safePageCount = Math.max(4, Math.min(300, Number(pageCount || 8) || 8));
  const safeChapterCount = Math.max(1, Math.min(safePageCount, Number(chapterCount || 1) || 1));
  const safeCourseStyle = normalizeMiniCourseStyle(courseStyle);
  const chapterBlueprints = buildMiniCourseChapterBlueprints(safePageCount, safeChapterCount, safeCourseStyle);
  const system = buildMiniSystemPrompt({
    modeKey: "project",
    sharedContext,
    plannerContext: MINI_MINISTRY_CONTEXT,
    theme: title,
    extraInstructions: [
      safeCourseStyle === "story"
        ? "Voce esta criando uma historia narrativa de leitura casual para o MINI, com fluidez, emocao, progressao natural e linguagem acolhedora."
        : "Voce esta criando cursos completos e globais para professores do Ministerio Infantil dentro do MINI.",
      "Use o contexto cristao compartilhado da plataforma e o tom ministerial do MINI.",
      safeCourseStyle === "story"
        ? "Nao trate a resposta como apostila, aula, roteiro didatico ou treinamento formal."
        : "O curso deve ser pratico, profundo, amoroso, biblicamente coerente e muito util para professores.",
      `O projeto tera ${safePageCount} paginas de conteudo distribuidas em ${safeChapterCount} capitulos.`,
      `Use o ${buildMiniCourseStyleLabel(safeCourseStyle)} na distribuicao interna de cada capitulo.`,
      safeCourseStyle === "story"
        ? "Cada capitulo deve soar como parte de uma leitura casual, com progressao narrativa clara."
        : "Cada capitulo deve conduzir o aprendizado com progressao natural e coerente.",
      "Responda apenas em JSON estruturado."
    ].join(" ")
  });

  const requestPayload = {
    model,
    temperature: 0.35,
    max_completion_tokens: 2200,
    response_format: {
      type: "json_schema",
      json_schema: buildMiniCourseChapterPlanSchema(safeChapterCount)
    },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          `Titulo-base do projeto: ${title}`,
          `Contexto principal: ${context}`,
          `Paginas de conteudo: ${safePageCount}.`,
          `Capitulos: ${safeChapterCount}.`,
          `Estilo escolhido: ${buildMiniCourseStyleLabel(safeCourseStyle)}.`,
          `Distribuicao de paginas por capitulo: ${chapterBlueprints.map((item) => `capitulo ${item.chapterNumber} = ${item.contentPageCount} paginas`).join("; ")}.`,
          safeCourseStyle === "story"
            ? "Crie a estrutura geral dessa historia, com titulo principal, visao geral e capitulos narrativos que convidem para leitura casual."
            : "Crie a estrutura geral do curso e devolva um titulo principal, uma visao geral curta e todos os capitulos.",
          `Voce deve devolver exatamente ${safeChapterCount} capitulos no array chapters, sem omitir, juntar, resumir ou cortar nenhum capitulo.`,
          "Cada capitulo precisa ter titulo, subtitulo e logline proprios, sem repeticao entre si.",
          safeCourseStyle === "story"
            ? "Os capitulos devem soar como etapas de uma narrativa viva, envolvente e natural."
            : "Os capitulos devem avancar com progressao natural e coerente."
        ].filter(Boolean).join("\n")
      }
    ]
  };
  if (supportsReasoningEffortForModel(model)) {
    requestPayload.reasoning_effort = "none";
  }

  const completion = await createChatCompletion(apiKey, requestPayload, {
    timeoutMs: 120000,
    timeoutMessage: "Planejamento do curso demorou demais para responder."
  });
  const raw = extractChatCompletionText(completion);
  const parsed = parseStructuredJsonText(raw);
  const courseMainTitle = String(parsed?.mainTitle || title).trim() || title;
  const courseOverview = String(parsed?.courseOverview || "").trim();
  const chapters = chapterBlueprints.map((blueprint, index) => {
    const source = Array.isArray(parsed?.chapters) ? parsed.chapters[index] : null;
    return {
      chapterNumber: blueprint.chapterNumber,
      title: String(source?.title || `Capitulo ${blueprint.chapterNumber}`).trim() || `Capitulo ${blueprint.chapterNumber}`,
      subtitle: String(source?.subtitle || "").trim(),
      logline: String(source?.logline || "").trim() || `Avanco do capitulo ${blueprint.chapterNumber}.`,
      contentPageCount: blueprint.contentPageCount,
      contentKinds: blueprint.contentKinds
    };
  });

  return {
    title: courseMainTitle,
    courseOverview,
    chapters,
    courseStyle: safeCourseStyle,
    courseMapText: buildMiniCourseMapPromptText({
      courseTitle: courseMainTitle,
      courseOverview,
      chapters,
      style: safeCourseStyle
    })
  };
}

function buildMiniCourseChapterOpenPage(chapter) {
  return normalizeMiniCourseGeneratedPage({
    kind: "chapter_open",
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    subtitle: chapter.subtitle,
    logline: chapter.logline
  }, 0, "chapter_open");
}

function buildMiniCourseQuizSchema(questionCount = 10) {
  return {
    name: "mini_course_quiz",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["questions"],
      properties: {
        questions: {
          type: "array",
          minItems: questionCount,
          maxItems: questionCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "question", "options", "correctIndex", "explanation"],
            properties: {
              id: { type: "string" },
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" }
              },
              correctIndex: { type: "integer" },
              explanation: { type: "string" }
            }
          }
        }
      }
    }
  };
}

class MiniCourseGenerationError extends Error {
  constructor(message, feedback = "", generatedPageCount = 0, debugPayload = null) {
    super(message);
    this.name = "MiniCourseGenerationError";
    this.feedback = String(feedback || "").trim();
    this.generatedPageCount = Math.max(0, Number(generatedPageCount || 0) || 0);
    this.debugPayload = debugPayload && typeof debugPayload === "object" && !Array.isArray(debugPayload)
      ? debugPayload
      : null;
  }
}

let miniCourseJobsBootstrapped = false;
let miniCourseJobsProcessing = false;

function buildMiniCourseFailureDebugPayload({ job, failure }) {
  const safeFailure = failure instanceof MiniCourseGenerationError
    ? failure
    : new MiniCourseGenerationError(
      failure instanceof Error ? failure.message : "Falha desconhecida na geracao do curso.",
      "",
      0
    );
  const jobSnapshot = job && typeof job === "object"
    ? {
      id: job.id || null,
      title: job.title || "Curso MINI",
      context: job.context || "",
      requestedModel: job.requestedModel || "gpt-5.1",
      requestedPageCount: Math.max(1, Number(job.requestedPageCount || 1) || 1),
      requestedChapterCount: Math.max(1, Number(job.requestedChapterCount || 1) || 1),
      requestedCourseStyle: normalizeMiniCourseStyle(job.requestedCourseStyle || "course"),
      status: job.status || "failed"
    }
    : null;
  return {
    exportedAt: new Date().toISOString(),
    job: jobSnapshot,
    failure: {
      message: safeFailure.message,
      feedback: safeFailure.feedback || "",
      generatedPageCount: safeFailure.generatedPageCount,
      debug: safeFailure.debugPayload && typeof safeFailure.debugPayload === "object" && !Array.isArray(safeFailure.debugPayload)
        ? safeFailure.debugPayload
        : null
    }
  };
}

function buildMiniCourseChunkLabel(chunk, chunkIndex, totalChunks) {
  return `Bloco ${chunkIndex + 1}/${totalChunks} • páginas ${chunk.startPageNumber}-${chunk.endPageNumber}`;
}

async function generateMiniCourseDraft({ apiKey, model = "gpt-5.1", title, context, pageCount, chapterCount = 1, courseStyle = "course", onProgress } = {}) {
  const safeChapterCount = Math.max(1, Math.min(pageCount, Number(chapterCount || 1) || 1));
  const safeCourseStyle = normalizeMiniCourseStyle(courseStyle);
  const chapterBlueprints = buildMiniCourseChapterBlueprints(pageCount, safeChapterCount, safeCourseStyle);
  const maxChapterAttempts = 3;
  const chapterTimeoutMs = pageCount >= 180
    ? 300000
    : pageCount >= 90
      ? 240000
      : pageCount >= 24
        ? 180000
        : 120000;
  const sharedContext = await getContextPrompt();

  const system = buildMiniSystemPrompt({
    modeKey: "project",
    sharedContext,
    plannerContext: MINI_MINISTRY_CONTEXT,
    theme: title,
    extraInstructions: [
      safeCourseStyle === "story"
        ? "Voce esta criando uma historia narrativa de leitura casual para o MINI, com fluidez, emocao, progressao natural e linguagem acolhedora."
        : "Voce esta criando cursos completos e globais para professores do Ministerio Infantil dentro do MINI.",
      "Use o contexto cristao compartilhado da plataforma e o tom ministerial do MINI.",
      safeCourseStyle === "story"
        ? "Nao trate a resposta como apostila, aula, roteiro didatico ou treinamento formal."
        : "O curso deve ser pratico, profundo, amoroso, biblicamente coerente e muito util para professores.",
      `O curso tera ${pageCount} paginas de conteudo distribuidas em ${safeChapterCount} capitulos.`,
      `Use o ${buildMiniCourseStyleLabel(safeCourseStyle)} na distribuicao interna de cada capitulo.`,
      "Nas paginas text, escreva 1 ou 2 paragrafos densos, claros e sem repeticao mecanica.",
      safeCourseStyle === "story"
        ? "Nas paginas closing, escreva 3 paragrafos completos que encerrem, aprofundem e mantenham o tom narrativo da leitura."
        : "Nas paginas didactic, entregue conteudo pedagogico com bullets claros ou tabela objetiva.",
      safeCourseStyle === "story"
        ? "Mantenha o ritmo como leitura casual, evitando explicar como professor para professor."
        : "Nas paginas closing, escreva 3 paragrafos completos de fechamento, aplicacao e encorajamento.",
      "Crie somente o texto visivel. Nao crie prompts de imagem, prompts de audio ou direcoes de capa.",
      "Nenhuma pagina pode vir vazia, resumida demais ou so com titulo.",
      "Nunca use placeholders como 'Conteudo para...', 'Subtitulo 2', 'Pagina 1' sem desenvolver o conteudo real.",
      "Responda apenas em JSON estruturado."
    ].join(" ")
  });

  const reportProgress = async (generatedPageCount, feedback) => {
    if (typeof onProgress === "function") {
      await onProgress({
        generatedPageCount,
        requestedPageCount: pageCount,
        feedback
      });
    }
  };

  const createCourseChapterAttempt = async ({ blueprint, chapterMeta, courseMainTitle, courseOverview, courseMapText, extraUserInstruction = "" }) => {
    const requestPayload = {
      model,
      temperature: extraUserInstruction ? 0.22 : 0.32,
      max_completion_tokens: Math.max(2600, 900 + (blueprint.contentPageCount * 420)),
      response_format: {
        type: "json_schema",
        json_schema: buildMiniCourseChunkSchema(blueprint.contentKinds)
      },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            `Titulo final do curso: ${courseMainTitle}`,
            `Contexto do curso: ${context}`,
            `Visao geral do curso: ${courseOverview}`,
            `Course-map oficial do curso:\n${courseMapText}`,
            `Capitulo ${chapterMeta.chapterNumber}: ${chapterMeta.title}`,
            `Subtitulo do capitulo: ${chapterMeta.subtitle}`,
            `Logline do capitulo: ${chapterMeta.logline}`,
            `Este capitulo tem ${blueprint.contentPageCount} paginas de conteudo.`,
            `Tipos obrigatorios neste capitulo: ${blueprint.contentKinds.map((kind, index) => `pagina ${index + 1} = ${kind}`).join("; ")}.`,
            normalizeMiniCourseStyle(safeCourseStyle) === "story"
              ? "Esta e uma historia narrativa em Estilo historia: nao use pagina didatica e mantenha a leitura casual, viva e natural."
              : "Este e um curso no Estilo curso: use paginas didaticas quando elas estiverem previstas.",
            "Escreva somente o conteudo visivel dessas paginas de conteudo.",
            "Para cada pagina text, entregue preferencialmente 2 paragrafos completos e densos, somando pelo menos 420 caracteres reais.",
            "Para cada pagina didactic, entregue estrutura suficiente para ensino: pelo menos 4 bullets fortes ou 2 linhas de tabela bem preenchidas.",
            normalizeMiniCourseStyle(safeCourseStyle) === "story"
              ? "Para cada pagina closing, entregue exatamente 3 paragrafos completos, mantendo o fechamento narrativo e sem frases telegraficas."
              : "Para cada pagina closing, entregue exatamente 3 paragrafos completos, sem frases telegraficas.",
            "Mantenha fluidez interna dentro do capitulo e evite repetir a mesma ideia com palavras parecidas.",
            extraUserInstruction
          ].filter(Boolean).join("\n")
        }
      ]
    };
    if (supportsReasoningEffortForModel(model)) {
      requestPayload.reasoning_effort = "none";
    }
    const completion = await createChatCompletion(apiKey, requestPayload, {
      timeoutMs: chapterTimeoutMs,
      timeoutMessage: `Capitulo ${chapterMeta.chapterNumber}: a OpenAI demorou demais para responder.`
    });
    const raw = extractChatCompletionText(completion);
    const parsed = parseStructuredJsonText(raw);
    const pages = Array.isArray(parsed?.pages) ? parsed.pages : [];
    const normalizedPages = blueprint.contentKinds.map((kind, index) => normalizeMiniCourseGeneratedPage({
      ...(pages[index] || {}),
      chapterNumber: chapterMeta.chapterNumber
    }, index, kind));
    const evaluation = evaluateMiniCoursePages(normalizedPages, 1);
    return { parsed, normalizedPages, evaluation };
  };

  const runCourseChapterWithRetries = async ({ blueprint, chapterMeta, courseMainTitle, courseOverview, courseMapText, generatedPageCountBefore }) => {
    let lastAttempt = null;
    let lastError = null;
    const minimumValidPages = blueprint.contentKinds.length;
    const chapterLabel = `Capitulo ${chapterMeta.chapterNumber}/${safeChapterCount}`;

    for (let attemptIndex = 0; attemptIndex < maxChapterAttempts; attemptIndex += 1) {
      const attemptLabel = `${chapterLabel} • tentativa ${attemptIndex + 1}/${maxChapterAttempts}`;
      const retryInstruction = attemptIndex === 0
        ? ""
        : [
          `A tentativa anterior do ${chapterLabel.toLowerCase()} veio incompleta ou inconsistente.`,
          "Regenere somente este capitulo.",
          "Nao use placeholders.",
          "Entregue conteudo real, com densidade e coerencia com o tema do curso.",
          "As paginas text precisam ficar mais desenvolvidas e substanciais.",
          "Se alguma pagina for didatica, prefira bullets claros ou tabela objetiva.",
          "Se alguma pagina for final, entregue exatamente 3 paragrafos completos."
        ].join(" ");

      await reportProgress(generatedPageCountBefore, `${attemptLabel}: solicitando conteúdo para a IA...`);

      try {
        const attempt = await createCourseChapterAttempt({ blueprint, chapterMeta, courseMainTitle, courseOverview, courseMapText, extraUserInstruction: retryInstruction });
        lastAttempt = attempt;

        if (attempt.evaluation.validCount >= minimumValidPages) {
          return attempt;
        }

        const issuesText = attempt.evaluation.issues.slice(0, 3).join(" ");
        await reportProgress(
          generatedPageCountBefore,
          `${attemptLabel}: a IA devolveu ${attempt.evaluation.validCount}/${minimumValidPages} páginas válidas.${issuesText ? ` ${issuesText}` : ""}${attemptIndex < maxChapterAttempts - 1 ? " Vamos tentar novamente." : ""}`
        );
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "Erro desconhecido ao chamar a OpenAI.";
        await reportProgress(
          generatedPageCountBefore,
          `${attemptLabel}: ${message}${attemptIndex < maxChapterAttempts - 1 ? " Vamos tentar novamente." : ""}`
        );
      }
    }

    if (lastAttempt) {
      throw new MiniCourseGenerationError(
        "A IA nao devolveu conteudo suficiente para concluir o curso.",
        `${chapterLabel}. ${lastAttempt.evaluation.issues.slice(0, 4).join(" ") || "A IA continuou devolvendo páginas vazias ou fracas após as tentativas."}`,
        generatedPageCountBefore,
        {
          stage: "chapter_validation",
          chapterLabel,
          chapterMeta,
          blueprint,
          generatedPageCountBefore,
          attemptEvaluation: lastAttempt.evaluation,
          parsedChapter: lastAttempt.parsed,
          normalizedPages: lastAttempt.normalizedPages
        }
      );
    }

    throw new MiniCourseGenerationError(
      "A IA nao devolveu conteudo suficiente para concluir o curso.",
      `${chapterLabel}. ${lastError instanceof Error ? lastError.message : "A IA falhou repetidamente sem retornar conteúdo utilizável."}`,
      generatedPageCountBefore,
      {
        stage: "chapter_request",
        chapterLabel,
        chapterMeta,
        blueprint,
        generatedPageCountBefore,
        lastErrorMessage: lastError instanceof Error ? lastError.message : "Falha desconhecida ao solicitar o capitulo."
      }
    );
  };

  await reportProgress(0, `Planejando ${safeChapterCount} capitulos com ${pageCount} paginas de conteudo...`);
  const plan = await planMiniCourseStructure({ apiKey, model, title, context, pageCount, chapterCount: safeChapterCount, courseStyle: safeCourseStyle });
  const courseMainTitle = plan.title;
  const courseOverview = plan.courseOverview;
  const chapters = chapterBlueprints.map((blueprint, index) => ({
    chapterNumber: blueprint.chapterNumber,
    title: String(plan.chapters[index]?.title || `Capitulo ${blueprint.chapterNumber}`).trim() || `Capitulo ${blueprint.chapterNumber}`,
    subtitle: String(plan.chapters[index]?.subtitle || "").trim(),
    logline: String(plan.chapters[index]?.logline || "").trim() || `Avanco do capitulo ${blueprint.chapterNumber}.`
  }));

  const generatedPages = [buildMiniCourseMapPage({ courseTitle: courseMainTitle, courseOverview, chapters, style: safeCourseStyle })];
  const courseMapText = plan.courseMapText || buildMiniCourseMapPromptText({ courseTitle: courseMainTitle, courseOverview, chapters, style: safeCourseStyle });
  const chapterFeedback = [];
  let generatedContentPages = 0;

  for (let chapterIndex = 0; chapterIndex < chapterBlueprints.length; chapterIndex += 1) {
    const blueprint = chapterBlueprints[chapterIndex];
    const chapterMeta = chapters[chapterIndex];
    generatedPages.push(buildMiniCourseChapterOpenPage(chapterMeta));
    const chapterAttempt = await runCourseChapterWithRetries({
      blueprint,
      chapterMeta,
      courseMainTitle,
      courseOverview,
      courseMapText,
      generatedPageCountBefore: generatedContentPages
    });
    generatedPages.push(...chapterAttempt.normalizedPages);
    generatedContentPages += blueprint.contentPageCount;
    if (chapterAttempt.evaluation.issues.length) {
      chapterFeedback.push(...chapterAttempt.evaluation.issues);
    }
    await reportProgress(
      generatedContentPages,
      `Capitulo ${chapterMeta.chapterNumber}/${safeChapterCount} concluido. Gerando curso: ${generatedContentPages}/${pageCount} paginas de conteudo prontas.`
    );
  }

  const finalPages = renumberMiniCoursePages(generatedPages);
  const finalEvaluation = evaluateMiniCoursePages(finalPages, 1);
  if (finalEvaluation.validCount < finalPages.length) {
    throw new MiniCourseGenerationError(
      "O curso final ficou incompleto e nao foi salvo.",
      finalEvaluation.issues.slice(0, 6).join(" ") || "A validacao final detectou paginas vazias.",
      generatedContentPages,
      {
        stage: "final_validation",
        generatedContentPages,
        courseMainTitle,
        courseOverview,
        chapters,
        finalEvaluation,
        finalPages
      }
    );
  }

  return {
    title: courseMainTitle,
    context,
    pages: finalPages,
    chapterCount: safeChapterCount,
    courseStyle: safeCourseStyle,
    contentPageCount: pageCount,
    coverImagePrompt: "",
    feedback: chapterFeedback.length
      ? `Curso criado com ${pageCount} paginas de conteudo em ${safeChapterCount} capitulos. Ajustamos pequenos pontos durante a geracao: ${chapterFeedback.slice(0, 2).join(" ")}`
      : `Curso criado com ${pageCount} paginas de conteudo em ${safeChapterCount} capitulos e validado por capitulo.`
  };
}

async function processMiniCourseJobsQueue() {
  if (miniCourseJobsProcessing) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return;
  }

  miniCourseJobsProcessing = true;

  try {
    while (true) {
      const job = await claimNextMiniCourseJob();
      if (!job) {
        break;
      }

      try {
        await updateMiniCourseJobProgress(job.id, {
          generatedPageCount: 0,
          feedback: `Preparando ${job.requestedPageCount} páginas em ${job.requestedChapterCount} capítulos no ${buildMiniCourseStyleLabel(job.requestedCourseStyle)} com ${normalizeMiniCourseGeneratorModel(job.requestedModel)}...`
        });

        const draft = await generateMiniCourseDraft({
          apiKey,
          model: normalizeMiniCourseGeneratorModel(job.requestedModel),
          title: job.title,
          context: job.context,
          pageCount: job.requestedPageCount,
          chapterCount: job.requestedChapterCount,
          courseStyle: job.requestedCourseStyle,
          onProgress: async ({ generatedPageCount, feedback }) => {
            await updateMiniCourseJobProgress(job.id, {
              generatedPageCount,
              feedback
            });
          }
        });

        const course = await createMiniCourse({
          title: draft.title,
          context: draft.context,
          pages: draft.pages,
          chapterCount: draft.chapterCount,
          courseStyle: draft.courseStyle,
          contentPageCount: draft.contentPageCount,
          coverImagePrompt: draft.coverImagePrompt,
          createdByUserId: job.createdByUserId
        });

        await completeMiniCourseJob(job.id, {
          generatedPageCount: draft.contentPageCount,
          courseId: course.id,
          feedback: draft.feedback
        });
      } catch (error) {
        const failure = error instanceof MiniCourseGenerationError
          ? error
          : new MiniCourseGenerationError(
            error instanceof Error ? error.message : "Nao foi possivel gerar o curso.",
            "A geração falhou antes de salvar o curso. Verifique o bloco informado e a mensagem técnica abaixo.",
            0
          );

        await failMiniCourseJob(job.id, {
          generatedPageCount: failure.generatedPageCount,
          feedback: failure.feedback || "A IA nao conseguiu concluir a geracao deste curso.",
          errorMessage: failure.message,
          debugPayload: buildMiniCourseFailureDebugPayload({ job, failure })
        });
      }
    }
  } finally {
    miniCourseJobsProcessing = false;
  }
}

async function bootstrapMiniCourseJobsQueue() {
  if (miniCourseJobsBootstrapped) {
    return;
  }
  miniCourseJobsBootstrapped = true;

  try {
    await resetRunningMiniCourseJobs();
    await processMiniCourseJobsQueue();
  } catch (error) {
    console.error("Falha ao retomar jobs de cursos do MINI:", error);
  }
}

function getMiniCourseCatalog(request) {
  const headerCatalog = String(request?.headers?.["x-mini-course-catalog"] || "").trim().toLowerCase();
  if (headerCatalog === "ilife") {
    return "ilife";
  }

  try {
    const requestUrl = new URL(String(request?.url || "/"), "http://localhost");
    return String(requestUrl.searchParams.get("catalog") || "").trim().toLowerCase() === "ilife" ? "ilife" : "mini";
  } catch {
    return "mini";
  }
}

async function handleMiniCoursesListRequest(request, response) {
  const user = await getOptionalAuthUser(request);
  const catalog = getMiniCourseCatalog(request);
  const includeHidden = Boolean(user && isAdminUser(user));

  try {
    const [courses, summary] = await Promise.all([
      listMiniCourses(user?.id || "", {
        includeHidden: catalog === "mini" && includeHidden,
        visibility: catalog === "ilife" ? "hidden" : "visible"
      }),
      user ? getMiniCourseUserSummary(user.id) : Promise.resolve({ completedCourses: 0, startedCourses: 0, totalPoints: 0 })
    ]);
    const courseSummaries = courses.map((course) => ({
      ...course,
      pages: [],
      quizQuestions: []
    }));

    sendJson(response, 200, {
      ok: true,
      courses: courseSummaries,
      user: user ? sanitizeUser(user) : null,
      summary
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar os cursos."
    });
  }
}

async function handleMiniCoursesSummaryRequest(request, response) {
  const user = await getOptionalAuthUser(request);

  try {
    const summary = user
      ? await getMiniCourseUserSummary(user.id)
      : { completedCourses: 0, startedCourses: 0, totalPoints: 0 };

    sendJson(response, 200, {
      ok: true,
      user: user ? sanitizeUser(user) : null,
      summary
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o resumo dos cursos."
    });
  }
}

async function handleMiniMediaLibraryRequest(request, response) {
  const user = await getOptionalAuthUser(request);

  try {
    const library = await loadMiniMediaLibrary();
    sendJson(response, 200, {
      ok: true,
      user: user ? sanitizeUser(user) : null,
      library: buildMiniMediaLibraryPayload(library)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar a biblioteca de midia."
    });
  }
}

async function handleMiniMediaImageModelsRequest(request, response) {
  const user = await getOptionalAuthUser(request);
  sendJson(response, 200, {
    ok: true,
    user: user ? sanitizeUser(user) : null,
    models: MINI_MEDIA_IMAGE_MODELS,
    defaultModel: MINI_MEDIA_IMAGE_MODELS[0]?.id || "gpt-image-2",
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY)
  });
}

function splitMiniDocumentTextToLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim());
}

async function ensureAllDocsMiniDocument() {
  return ensureMiniDocumentExists(MINI_DOC_KEY_ALL_DOCS, MINI_DOC_TITLE_ALL_DOCS);
}

async function handleMiniDocumentRequest(request, response) {
  const user = await getOptionalAuthUser(request);

  try {
    const document = await ensureAllDocsMiniDocument();
    sendJson(response, 200, {
      ok: true,
      user: user ? sanitizeUser(user) : null,
      document
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o documento."
    });
  }
}

async function handleMiniDocumentLineUpdateRequest(request, response, lineNumber) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    await ensureAllDocsMiniDocument();
    const document = await updateMiniDocumentLine(MINI_DOC_KEY_ALL_DOCS, lineNumber, body?.text || "");
    if (!document) {
      sendJson(response, 404, { error: "Documento nao encontrado." });
      return;
    }
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      document
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a linha."
    });
  }
}

async function handleMiniDocumentInsertRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const lines = Array.isArray(body?.lines)
    ? body.lines.map((item) => String(item || ""))
    : splitMiniDocumentTextToLines(body?.text || "");

  try {
    await ensureAllDocsMiniDocument();
    const document = await insertMiniDocumentLinesAfter(
      MINI_DOC_KEY_ALL_DOCS,
      Math.max(0, Number(body?.afterLineNumber || 0) || 0),
      lines
    );
    if (!document) {
      sendJson(response, 404, { error: "Documento nao encontrado." });
      return;
    }
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      document
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel inserir as linhas."
    });
  }
}

async function handleMiniDocumentRewriteRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const document = await ensureAllDocsMiniDocument();
    const startLineNumber = Math.max(1, Number(body?.startLineNumber || 1) || 1);
    const endLineNumber = Math.max(startLineNumber, Number(body?.endLineNumber || startLineNumber) || startLineNumber);
    const selectedLines = (Array.isArray(document?.lines) ? document.lines : [])
      .filter((line) => line.number >= startLineNumber && line.number <= endLineNumber)
      .map((line) => String(line.text || ""));

    if (!selectedLines.length) {
      sendJson(response, 404, { error: "Trecho nao encontrado." });
      return;
    }

    const prompt = String(body?.prompt || "").trim();
    if (!prompt) {
      sendJson(response, 400, { error: "Informe como a OpenAI deve editar o texto." });
      return;
    }

    const mode = String(body?.mode || "editar").trim().toLowerCase() || "editar";
    const completion = await createChatCompletion(apiKey, {
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: [
            "Voce edita textos em portugues do Brasil para um documento infantil/cristao do projeto MINI.",
            "Responda apenas com o texto final do trecho pedido.",
            "Mantenha a divisao em linhas curtas; use quebras de linha reais quando fizer sentido.",
            "Nao use markdown, cercas de codigo, numeracao ou comentarios extras."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            `Modo pedido: ${mode}.`,
            `Linhas atuais (${startLineNumber}-${endLineNumber}):`,
            selectedLines.join("\n"),
            "",
            `Instrucao do administrador: ${prompt}`,
            "",
            "Entregue somente a nova versao do trecho."
          ].join("\n")
        }
      ]
    }, {
      timeoutMs: 90000,
      timeoutMessage: "A OpenAI demorou demais para editar o texto."
    });

    const rewrittenText = String(completion?.choices?.[0]?.message?.content || "").trim();
    if (!rewrittenText) {
      sendJson(response, 502, { error: "A OpenAI nao devolveu texto para substituir o trecho." });
      return;
    }

    const replacementLines = splitMiniDocumentTextToLines(rewrittenText);
    const updatedDocument = await replaceMiniDocumentLineRange(
      MINI_DOC_KEY_ALL_DOCS,
      startLineNumber,
      endLineNumber,
      replacementLines
    );
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      document: updatedDocument,
      feedback: `Trecho ${startLineNumber}-${endLineNumber} refeito com gpt-4.1-mini.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel refazer o trecho."
    });
  }
}

async function handleMiniMediaAlbumCreateRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = sanitizeMiniMediaTitle(body?.title, "");
  if (!title) {
    sendJson(response, 400, { error: "Informe o titulo do album." });
    return;
  }

  try {
    const library = await loadMiniMediaLibrary();
    const baseId = slugifyAlbumName(title) || `album-${Date.now()}`;
    let albumId = baseId;
    let suffix = 2;
    while (library.albums.some((album) => album.id === albumId)) {
      albumId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const now = new Date().toISOString();
    const album = normalizeMiniMediaAlbum({
      id: albumId,
      title,
      subtitle: "0 musicas",
      createdAt: now,
      updatedAt: now,
      songs: []
    });

    library.albums.push(album);
    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 201, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel criar o album."
    });
  }
}

async function handleMiniMediaAlbumCoverUploadRequest(request, response, albumId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const providedFileName = decodeURIComponent(String(request.headers["x-file-name"] || "cover").trim() || "cover");
  const contentType = String(request.headers["content-type"] || "").trim().toLowerCase();

  if (!isMiniMediaImageUpload(providedFileName, contentType)) {
    sendJson(response, 400, { error: "Envie uma imagem valida para a capa." });
    return;
  }

  try {
    const fileBuffer = await readBinaryBody(request, MAX_MINI_MEDIA_COVER_BYTES);
    if (!fileBuffer.length) {
      sendJson(response, 400, { error: "Imagem de capa vazia." });
      return;
    }

    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    const extension = getMiniMediaFileExtension(providedFileName, ".jpg") || ".jpg";
    const key = `${buildMiniMediaAlbumFolder(albumId)}/cover${extension}`;
    const finalContentType = getMiniMediaContentType(providedFileName, contentType || "image/jpeg");
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: finalContentType
    }));

    album.coverKey = key;
    album.coverContentType = finalContentType;
    album.updatedAt = new Date().toISOString();
    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel enviar a capa."
    });
  }
}

async function handleMiniMediaTrackUploadRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const providedFileName = decodeURIComponent(String(request.headers["x-file-name"] || "").trim() || "track.mp3");
  const providedTrackTitle = sanitizeMiniMediaTitle(decodeURIComponent(String(request.headers["x-track-title"] || "").trim()), "");
  const contentType = String(request.headers["content-type"] || "").trim().toLowerCase();
  const trackOrder = Math.max(0, Number(request.headers["x-track-order"] || 0) || 0);

  if (!isMiniMediaAudioUpload(providedFileName, contentType)) {
    sendJson(response, 400, { error: "Envie um arquivo de audio valido." });
    return;
  }

  try {
    const fileBuffer = await readBinaryBody(request, MAX_MINI_MEDIA_TRACK_BYTES);
    if (!fileBuffer.length) {
      sendJson(response, 400, { error: "Arquivo de audio vazio." });
      return;
    }

    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    const extension = getMiniMediaFileExtension(providedFileName, ".mp3") || ".mp3";
    const safeTrackId = slugifyAlbumName(trackId) || `track-${trackOrder + 1}`;
    const key = `${buildMiniMediaAlbumFolder(albumId)}/tracks/${safeTrackId}${extension}`;
    const finalContentType = getMiniMediaContentType(providedFileName, contentType || "audio/mpeg");
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: finalContentType
    }));

    const titleFromFile = sanitizeMiniMediaTitle(providedFileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), `Faixa ${trackOrder + 1}`);
    const songTitle = providedTrackTitle || titleFromFile;
    const existingIndex = album.songs.findIndex((song) => song.id === safeTrackId);
    if (existingIndex < 0) {
      album.songs.forEach((song) => {
        if (Number(song.order || 0) >= trackOrder) {
          song.order = Number(song.order || 0) + 1;
        }
      });
    }
    const nextSong = normalizeMiniMediaSong({
      id: safeTrackId,
      globalId: existingIndex >= 0 ? album.songs[existingIndex].globalId : "",
      title: songTitle,
      subtitle: `${album.title} • faixa ${trackOrder + 1}`,
      key,
      playbackSongId: existingIndex >= 0 ? album.songs[existingIndex].playbackSongId : "",
      lyricsKey: existingIndex >= 0 ? album.songs[existingIndex].lyricsKey : "",
      lyricsText: existingIndex >= 0 ? album.songs[existingIndex].lyricsText : "",
      lyricsSyncData: existingIndex >= 0 ? album.songs[existingIndex].lyricsSyncData : null,
      lyricsUpdatedAt: existingIndex >= 0 ? album.songs[existingIndex].lyricsUpdatedAt : null,
      contentType: finalContentType,
      order: trackOrder,
      createdAt: existingIndex >= 0 ? album.songs[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, trackOrder);

    if (existingIndex >= 0) {
      album.songs.splice(existingIndex, 1, nextSong);
    } else {
      album.songs.push(nextSong);
    }
    normalizeMiniMediaAlbumSongsOrder(album);
    album.updatedAt = new Date().toISOString();
    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel enviar a musica."
    });
  }
}

async function handleMiniMediaTrackUpdateRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = sanitizeMiniMediaTitle(body?.title, "");
  if (!title) {
    sendJson(response, 400, { error: "Informe o nome da faixa." });
    return;
  }

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    const song = album.songs.find((item) => item.id === trackId);
    if (!song) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    song.title = title;
    song.updatedAt = new Date().toISOString();
    album.updatedAt = song.updatedAt;
    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar a faixa."
    });
  }
}

async function handleMiniMediaTrackLyricsRequest(request, response, albumId, trackId) {
  const user = await getOptionalAuthUser(request);

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    const song = album.songs.find((item) => item.id === trackId);
    if (!song) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const databaseSong = await getSyncedMiniMediaSong(library, albumId, trackId);
    const lyrics = String(databaseSong.lyrics_text || "").trim();

    sendJson(response, 200, {
      ok: true,
      user: user ? sanitizeUser(user) : null,
      albumId,
      trackId,
      song: {
        id: song.id,
        title: song.title
      },
      lyrics,
      syncData: databaseSong.lyrics_sync_json && typeof databaseSong.lyrics_sync_json === "object" ? databaseSong.lyrics_sync_json : null,
      hasLyrics: Boolean(lyrics),
      hasScores: Math.max(0, Number(databaseSong.score_count || 0) || 0) > 0,
      scoreCount: Math.max(0, Number(databaseSong.score_count || 0) || 0),
      updatedAt: databaseSong.lyrics_updated_at || null,
      serverNow: new Date().toISOString()
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar a letra."
    });
  }
}

async function handleStoreTrackTextsGenerateRequest(request, response, productId, trackNumber) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  try {
    const pricing = await getSitePricingSettings();
    const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);
    if (!product) {
      sendJson(response, 404, { error: "Produto nao encontrado." });
      return;
    }

    const albumZipLinks = await getAlbumZipLinks();
    const album = await buildAlbumDetailResponse(product, pricing, albumZipLinks);
    const track = getAlbumTrackByNumber(album, trackNumber);
    if (!track) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const sourceAlbumId = String(track?.sourceAlbumId || "").trim();
    const sourceSongId = String(track?.sourceSongId || "").trim();
    if (!sourceAlbumId || !sourceSongId) {
      sendJson(response, 400, { error: "Essa faixa nao esta vinculada ao catalogo do MINI." });
      return;
    }

    const library = await loadMiniMediaLibrary();
    const databaseSong = await getSyncedMiniMediaSong(library, sourceAlbumId, sourceSongId);
    const generated = await generateTimedLyricsForTrack(apiKey, track);
    const updatedSong = await updateMiniMediaSongLyrics(databaseSong.id, generated.lyrics, generated.syncData);

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      albumId: productId,
      trackNumber: Number(trackNumber || 0),
      sourceAlbumId,
      sourceSongId,
      lyrics: generated.lyrics,
      syncData: updatedSong?.lyrics_sync_json && typeof updatedSong.lyrics_sync_json === "object"
        ? updatedSong.lyrics_sync_json
        : generated.syncData,
      updatedAt: updatedSong?.lyrics_updated_at || null,
      feedback: "Texto simples gerado com sucesso e timestamps antigos removidos."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar os textos desta faixa."
    });
  }
}

async function handleMiniMediaAlbumCharacterCreateRequest(request, response, albumId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const name = sanitizeMiniMediaTitle(body?.name || "", "").trim();
  const group = normalizeCharacterGroup(body?.group);

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    const characters = normalizeMiniMediaAlbumCharacters(album.characters || album.metadata?.characters);
    const colorInput = String(body?.color || "").trim();
    const color = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorInput)
      ? colorInput.toUpperCase()
      : pickNextCharacterColor(characters, group);

    if (!name) {
      sendJson(response, 400, { error: "Informe o nome do personagem." });
      return;
    }

    const character = {
      id: crypto.randomUUID(),
      name,
      color,
      group
    };

    album.characters = [...characters, character];
    album.metadata = {
      ...(album.metadata && typeof album.metadata === "object" ? album.metadata : {}),
      characters: album.characters
    };

    if (hasDatabase()) {
      await updateMiniMediaAlbumMetadata(albumId, album.metadata);
    }

    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 201, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum, { includeExtended: true }),
      character
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel criar o personagem."
    });
  }
}

async function handleMiniMediaAlbumCharacterDeleteRequest(request, response, albumId, characterId = "__all__") {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const safeCharacterId = String(characterId || "").trim();
  if (!safeCharacterId) {
    sendJson(response, 400, { error: "Personagem invalido." });
    return;
  }

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    const characters = normalizeMiniMediaAlbumCharacters(album.characters || album.metadata?.characters);
    if (!characters.length) {
      sendJson(response, 404, { error: "Personagem nao encontrado." });
      return;
    }

    const removeAllCharacters = safeCharacterId === "__all__";
    const targetCharacter = removeAllCharacters
      ? null
      : characters.find((item) => item.id === safeCharacterId) || null;
    if (!removeAllCharacters && !targetCharacter) {
      sendJson(response, 404, { error: "Personagem nao encontrado." });
      return;
    }

    const nextCharacters = removeAllCharacters
      ? []
      : characters.filter((item) => item.id !== targetCharacter.id);

    album.characters = nextCharacters;
    album.metadata = {
      ...(album.metadata && typeof album.metadata === "object" ? album.metadata : {}),
      characters: nextCharacters
    };

    const syncUpdates = [];
    for (const song of Array.isArray(album.songs) ? album.songs : []) {
      const databaseSong = await getSyncedMiniMediaSong(library, albumId, song.id);
      const lines = normalizeLyricsSyncLines(song.lyricsSyncData?.lines || databaseSong.lyrics_sync_json?.lines || []);
      if (!lines.length) {
        continue;
      }

      let changed = false;
      const nextLines = lines.map((line) => {
        const currentCharacterId = String(line?.characterId || "").trim();
        if (!currentCharacterId) {
          return line;
        }
        if (!removeAllCharacters && currentCharacterId !== targetCharacter.id) {
          return line;
        }
        changed = true;
        return {
          ...line,
          characterId: ""
        };
      });

      if (!changed) {
        continue;
      }

      const nextSyncData = {
        ...(song.lyricsSyncData && typeof song.lyricsSyncData === "object" ? song.lyricsSyncData : {}),
        albumId,
        trackId: song.id,
        title: song.title,
        lines: nextLines
      };

      const updatedSong = await updateMiniMediaSongLyrics(
        databaseSong.id,
        song.lyricsText || buildLyricsTextFromSyncLines(nextLines),
        nextSyncData
      );

      song.lyricsSyncData = updatedSong?.lyrics_sync_json && typeof updatedSong.lyrics_sync_json === "object"
        ? updatedSong.lyrics_sync_json
        : nextSyncData;

      syncUpdates.push({
        trackId: song.id,
        syncData: song.lyricsSyncData
      });
    }

    if (hasDatabase()) {
      await updateMiniMediaAlbumMetadata(albumId, album.metadata);
    }

    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum, { includeExtended: true }),
      characters: nextCharacters,
      removedCharacterId: targetCharacter?.id || null,
      syncUpdates
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir os personagens."
    });
  }
}

async function handleMiniMediaTrackLineCharacterUpdateRequest(request, response, albumId, trackId, lineNumber) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const characterId = String(body?.characterId || "").trim();

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    const song = album.songs.find((item) => item.id === trackId);
    if (!song) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const characters = normalizeMiniMediaAlbumCharacters(album.characters || album.metadata?.characters);
    if (characterId && !characters.some((item) => item.id === characterId)) {
      sendJson(response, 400, { error: "Personagem nao pertence a este album." });
      return;
    }

    const databaseSong = await getSyncedMiniMediaSong(library, albumId, trackId);
    const lines = normalizeLyricsSyncLines(song.lyricsSyncData?.lines || databaseSong.lyrics_sync_json?.lines || []);
    const targetIndex = Math.max(0, Number(lineNumber || 1) - 1);
    if (!lines[targetIndex]) {
      sendJson(response, 404, { error: "Linha nao encontrada." });
      return;
    }

    lines[targetIndex] = {
      ...lines[targetIndex],
      characterId
    };

    const nextSyncData = {
      ...(song.lyricsSyncData && typeof song.lyricsSyncData === "object" ? song.lyricsSyncData : {}),
      albumId,
      trackId,
      title: song.title,
      lines
    };

    const updatedSong = await updateMiniMediaSongLyrics(databaseSong.id, song.lyricsText || buildLyricsTextFromSyncLines(lines), nextSyncData);
    song.lyricsSyncData = updatedSong?.lyrics_sync_json && typeof updatedSong.lyrics_sync_json === "object"
      ? updatedSong.lyrics_sync_json
      : nextSyncData;

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      lineNumber: targetIndex + 1,
      syncData: song.lyricsSyncData,
      characters
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel vincular o personagem."
    });
  }
}

async function handleMiniMediaTrackLyricsUpdateRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const lyrics = String(body?.lyrics || "").replace(/\r\n/g, "\n").trim();
  const syncData = body?.syncData && typeof body.syncData === "object" ? body.syncData : null;

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    const song = album.songs.find((item) => item.id === trackId);
    if (!song) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const databaseSong = await getSyncedMiniMediaSong(library, albumId, trackId);
    const updatedSong = await updateMiniMediaSongLyrics(databaseSong.id, lyrics, syncData);
    song.lyricsText = lyrics;
    song.lyricsSyncData = updatedSong?.lyrics_sync_json && typeof updatedSong.lyrics_sync_json === "object" ? updatedSong.lyrics_sync_json : null;
    song.lyricsKey = "";
    song.lyricsUpdatedAt = updatedSong?.lyrics_updated_at || null;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(album),
      library: buildMiniMediaLibraryPayload(library),
      trackId,
      lyrics,
      syncData: song.lyricsSyncData,
      hasLyrics: Boolean(lyrics),
      updatedAt: updatedSong?.lyrics_updated_at || null,
      serverNow: new Date().toISOString(),
      feedback: lyrics ? "Letra salva no Postgres com sucesso." : "Letra removida com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a letra."
    });
  }
}

async function getSyncedMiniMediaSong(library, albumId, trackId) {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL nao configurada para os recursos globais da musica.");
  }
  let song = await getMiniMediaSongByLegacyIds(albumId, trackId);
  if (!song) {
    await syncMiniMediaLibraryToDatabase(library);
    song = await getMiniMediaSongByLegacyIds(albumId, trackId);
  }
  if (!song) {
    throw new Error("Faixa nao encontrada no Postgres.");
  }
  return song;
}

async function handleMiniMediaSongAssetsRequest(request, response, albumId, trackId) {
  const user = await getOptionalAuthUser(request);
  try {
    const library = await loadMiniMediaLibrary();
    const song = await getSyncedMiniMediaSong(library, albumId, trackId);
    const assets = await listMiniMediaSongAssets(song.id);
    sendJson(response, 200, {
      ok: true,
      user: user ? sanitizeUser(user) : null,
      albumId,
      trackId,
      song: {
        id: song.id,
        title: song.title,
        playbackUrl: song.playback_key ? buildAlbumZipPublicUrlFromKey(song.playback_key) : ""
      },
      assets: assets.map((asset) => buildMiniMediaAssetPayload(asset))
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar os recursos da musica."
    });
  }
}

async function handleMiniMediaPlaybackUploadRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    const librarySong = album?.songs?.find((item) => item.id === trackId);
    if (!album || !librarySong) {
      sendJson(response, 404, { error: "Album ou faixa nao encontrado." });
      return;
    }
    const song = await getSyncedMiniMediaSong(library, albumId, trackId);
    const playbackTrackId = String(body?.playbackTrackId || "").trim();
    let playbackSong = null;
    if (playbackTrackId) {
      playbackSong = await getMiniMediaSongByLegacyIds(albumId, playbackTrackId);
      if (!playbackSong || playbackSong.id === song.id) {
        sendJson(response, 400, { error: "Escolha outra musica deste album como playback." });
        return;
      }
      const updated = await updateMiniMediaSongPlayback(song.id, playbackSong.id);
      if (!updated) {
        sendJson(response, 400, { error: "O playback precisa ser uma musica do mesmo album." });
        return;
      }
    } else {
      await clearMiniMediaSongPlayback(song.id);
    }
    librarySong.globalId = song.id;
    librarySong.playbackKey = "";
    librarySong.playbackSongId = playbackSong?.id || "";
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      library: buildMiniMediaLibraryPayload(library),
      playbackSongId: playbackSong?.id || "",
      feedback: playbackSong ? "Playback vinculado com sucesso." : "Playback removido com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar o playback."
    });
  }
}

async function handleMiniMediaScoreUploadRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const providedFileName = decodeURIComponent(String(request.headers["x-file-name"] || "partitura").trim() || "partitura");
  const contentType = String(request.headers["content-type"] || "").trim().toLowerCase();
  const requestedPageOrder = Math.max(0, Number(request.headers["x-page-order"] || 0) || 0);
  if (!isMiniMediaScoreUpload(providedFileName, contentType)) {
    sendJson(response, 400, { error: "Envie uma partitura em PDF, JPG, PNG ou WebP." });
    return;
  }

  try {
    const fileBuffer = await readBinaryBody(request, MAX_MINI_MEDIA_SCORE_BYTES);
    if (!fileBuffer.length) {
      sendJson(response, 400, { error: "Arquivo de partitura vazio." });
      return;
    }
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    const librarySong = album?.songs?.find((item) => item.id === trackId);
    if (!album || !librarySong) {
      sendJson(response, 404, { error: "Album ou faixa nao encontrado." });
      return;
    }
    const song = await getSyncedMiniMediaSong(library, albumId, trackId);
    const existingAssets = await listMiniMediaSongAssets(song.id);
    const pageOrder = requestedPageOrder || existingAssets.filter((asset) => asset.type === "score").length + 1;
    const title = `Partitura ${album.title} Pagina ${pageOrder}`;
    const safeBase = `pagina-${String(pageOrder).padStart(3, "0")}`;
    const sourceExtension = getMiniMediaFileExtension(providedFileName, contentType === "application/pdf" ? ".pdf" : ".png") || ".png";
    const assetFolder = `${buildMiniMediaAlbumFolder(albumId)}/songs/${song.id}/scores`;
    const sourceKey = `${assetFolder}/${safeBase}-original${sourceExtension}`;
    const previewKey = `${assetFolder}/${safeBase}-preview.webp`;
    const downloadKey = `${assetFolder}/${safeBase}-${slugifyAlbumName(title) || "partitura"}.pdf`;
    const converted = await buildMiniMediaScoreFiles(fileBuffer, providedFileName, contentType);

    const r2Client = getR2Client();
    const scoreUploads = [
      r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: sourceKey,
        Body: fileBuffer,
        ContentType: getMiniMediaContentType(providedFileName, contentType || "application/octet-stream")
      })),
      r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: downloadKey,
        Body: converted.downloadPdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: buildContentDisposition(`${title}.pdf`)
      }))
    ];
    if (converted.previewBuffer?.length) {
      scoreUploads.push(r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: previewKey,
        Body: converted.previewBuffer,
        ContentType: "image/webp"
      })));
    }
    await Promise.all(scoreUploads);

    const asset = await createMiniMediaSongAsset(song.id, {
      type: "score",
      title,
      pageOrder,
      sourceKey,
      previewKey: converted.previewBuffer?.length ? previewKey : "",
      downloadKey,
      sourceContentType: getMiniMediaContentType(providedFileName, contentType || "application/octet-stream"),
      metadata: {
        albumId,
        trackId,
        originalFileName: providedFileName
      }
    });

    librarySong.globalId = song.id;
    librarySong.scoreCount = existingAssets.filter((item) => item.type === "score").length + 1;
    sendJson(response, 201, {
      ok: true,
      user: sanitizeUser(adminUser),
      asset: buildMiniMediaAssetPayload(asset),
      library: buildMiniMediaLibraryPayload(library),
      feedback: `${title} salva com sucesso.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a partitura."
    });
  }
}

async function handleMiniMediaSongAssetDeleteRequest(request, response, albumId, trackId, assetId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }
  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    const librarySong = album?.songs?.find((item) => item.id === trackId);
    const song = await getSyncedMiniMediaSong(library, albumId, trackId);
    const asset = await deleteMiniMediaSongAsset(assetId, song.id);
    if (!asset) {
      sendJson(response, 404, { error: "Recurso nao encontrado." });
      return;
    }
    for (const key of [asset.sourceKey, asset.previewKey, asset.downloadKey].filter(Boolean)) {
      try {
        await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      } catch (_) {
        // Keep database deletion even when an old R2 object is already absent.
      }
    }
    const remainingAssets = await listMiniMediaSongAssets(song.id);
    if (librarySong) {
      librarySong.scoreCount = remainingAssets.filter((item) => item.type === "score").length;
    }
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      deleted: true,
      assetId,
      library: buildMiniMediaLibraryPayload(library),
      feedback: "Partitura excluida com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir a partitura."
    });
  }
}

async function handleMiniMediaTrackDeleteRequest(request, response, albumId, trackId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    const existingIndex = album.songs.findIndex((item) => item.id === trackId);
    if (existingIndex < 0) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const databaseSong = hasDatabase() ? await getMiniMediaSongByLegacyIds(albumId, trackId) : null;
    const databaseAssets = databaseSong ? await listMiniMediaSongAssets(databaseSong.id) : [];
    const [song] = album.songs.splice(existingIndex, 1);
    normalizeMiniMediaAlbumSongsOrder(album);
    album.updatedAt = new Date().toISOString();

    if (song?.key) {
      try {
        await getR2Client().send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: song.key
        }));
      } catch (_) {
        // Ignore bucket delete errors and keep metadata deletion.
      }
    }
    if (song?.lyricsKey) {
      try {
        await getR2Client().send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: song.lyricsKey
        }));
      } catch (_) {
        // Ignore bucket delete errors and keep metadata deletion.
      }
    }
    if (song?.playbackKey) {
      try {
        await getR2Client().send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: song.playbackKey
        }));
      } catch (_) {
        // Ignore bucket delete errors and keep metadata deletion.
      }
    }
    for (const key of databaseAssets.flatMap((asset) => [asset.sourceKey, asset.previewKey, asset.downloadKey]).filter(Boolean)) {
      try {
        await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      } catch (_) {
        // Ignore old object cleanup failures.
      }
    }
    const songJsonKey = `${buildMiniMediaAlbumFolder(albumId)}/songs/${song?.globalId || databaseSong?.id || song?.id}/song.json`;
    try {
      await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: songJsonKey }));
    } catch (_) {
      // Ignore old object cleanup failures.
    }
    if (hasDatabase()) {
      await deleteMiniMediaSongByLegacyIds(albumId, trackId);
    }

    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir a faixa."
    });
  }
}

async function handleMiniMediaAlbumDeleteRequest(request, response, albumId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  try {
    const library = await loadMiniMediaLibrary();
    const existingIndex = library.albums.findIndex((item) => item.id === albumId);
    if (existingIndex < 0) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    const [album] = library.albums.splice(existingIndex, 1);
    const databaseSongs = [];
    if (hasDatabase()) {
      for (const song of album.songs) {
        const databaseSong = await getMiniMediaSongByLegacyIds(albumId, song.id);
        if (databaseSong) {
          databaseSongs.push({
            song: databaseSong,
            assets: await listMiniMediaSongAssets(databaseSong.id)
          });
        }
      }
    }
    const keysToDelete = [
      String(album?.coverKey || "").trim(),
      `${buildMiniMediaAlbumFolder(albumId)}/album.json`,
      ...((Array.isArray(album?.songs) ? album.songs : []).flatMap((song) => [
        String(song?.key || "").trim(),
        String(song?.playbackKey || "").trim(),
        String(song?.lyricsKey || "").trim(),
        `${buildMiniMediaAlbumFolder(albumId)}/songs/${song?.globalId || song?.id}/song.json`
      ])),
      ...databaseSongs.flatMap((entry) => entry.assets.flatMap((asset) => [asset.sourceKey, asset.previewKey, asset.downloadKey]))
    ].filter(Boolean);

    for (const key of keysToDelete) {
      try {
        await getR2Client().send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key
        }));
      } catch (_) {
        // Ignore bucket delete errors and keep metadata deletion.
      }
    }

    if (hasDatabase()) {
      await deleteMiniMediaAlbumByLegacyId(albumId);
    }
    const saved = await saveMiniMediaLibrary(library);
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      deleted: true,
      albumId,
      library: buildMiniMediaLibraryPayload(saved),
      feedback: "Album excluido com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir o album."
    });
  }
}

async function handleMiniMediaAlbumCoverGenerateRequest(request, response, albumId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  const requestContentType = String(request.headers["content-type"] || "").trim().toLowerCase();
  const isUploadReference = requestContentType.startsWith("image/");
  let body = null;
  let uploadedReferenceBuffer = null;
  let uploadedReferenceType = requestContentType || "image/png";
  let uploadedReferenceName = decodeURIComponent(String(request.headers["x-file-name"] || "reference.png").trim() || "reference.png");

  if (isUploadReference) {
    if (!isMiniMediaImageUpload(uploadedReferenceName, uploadedReferenceType)) {
      sendJson(response, 400, { error: "Envie uma imagem valida como referencia." });
      return;
    }
    try {
      uploadedReferenceBuffer = await readBinaryBody(request, MAX_MINI_MEDIA_COVER_BYTES);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Falha ao ler a imagem enviada." });
      return;
    }
    if (!uploadedReferenceBuffer?.length) {
      sendJson(response, 400, { error: "Imagem de referencia vazia." });
      return;
    }
  } else {
    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  const requestedModel = String(isUploadReference ? request.headers["x-model"] || "" : body?.model || "").trim();
  const model = MINI_MEDIA_IMAGE_MODELS.some((item) => item.id === requestedModel)
    ? requestedModel
    : (MINI_MEDIA_IMAGE_MODELS[0]?.id || "gpt-image-2");

  try {
    const library = await loadMiniMediaLibrary();
    const album = library.albums.find((item) => item.id === albumId);
    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }
    if (!album.coverKey && !uploadedReferenceBuffer?.length) {
      sendJson(response, 400, { error: "Este album ainda nao possui capa base para replicar." });
      return;
    }

    const sourceBuffer = uploadedReferenceBuffer?.length
      ? uploadedReferenceBuffer
      : await readR2ObjectBuffer(album.coverKey);
    if (!sourceBuffer.length) {
      sendJson(response, 400, { error: uploadedReferenceBuffer?.length ? "Nao foi possivel ler a imagem enviada." : "Nao foi possivel carregar a capa atual do album." });
      return;
    }

    const coverType = String(
      uploadedReferenceBuffer?.length
        ? uploadedReferenceType
        : (album.coverContentType || getMiniMediaContentType(album.coverKey, "image/avif"))
    ).trim() || "image/avif";
    const formData = new FormData();
    formData.append("model", model);
    formData.append(
      "prompt",
      [
        `Use a imagem enviada como referencia principal do album "${album.title}".`,
        "Recrie uma nova imagem com fidelidade maxima ao enquadramento, personagens, objetos, cores, luz, fundo, estilo artistico e atmosfera.",
        "Nao invente elementos novos, nao mude o tema e nao simplifique a composicao.",
        "Entregue uma nova versao visualmente muito proxima da capa original, mais limpa e nítida."
      ].join(" ")
    );
    formData.append("size", "1024x1536");
    formData.append("quality", "high");
    formData.append(
      "image[]",
      new Blob([sourceBuffer], { type: coverType }),
      uploadedReferenceBuffer?.length
        ? (path.posix.basename(uploadedReferenceName) || "reference.png")
        : (path.posix.basename(album.coverKey) || "cover.png")
    );

    const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const payload = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status || 502, {
        error: payload?.error?.message || payload?.error || "Nao foi possivel gerar a nova capa com a OpenAI."
      });
      return;
    }

    const b64 = String(payload?.data?.[0]?.b64_json || "").trim();
    if (!b64) {
      sendJson(response, 502, { error: "A OpenAI nao devolveu a imagem gerada." });
      return;
    }

    const generatedBuffer = Buffer.from(b64, "base64");
    const key = `${buildMiniMediaAlbumFolder(albumId)}/cover-generated-${Date.now()}.png`;
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: generatedBuffer,
      ContentType: "image/png"
    }));

    album.coverKey = key;
    album.coverContentType = "image/png";
    album.updatedAt = new Date().toISOString();
    const saved = await saveMiniMediaLibrary(library);
    const savedAlbum = saved.albums.find((item) => item.id === albumId) || album;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      album: buildMiniMediaAlbumPayload(savedAlbum),
      library: buildMiniMediaLibraryPayload(saved),
      feedback: `Nova capa gerada com ${model}.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar a capa do album."
    });
  }
}

async function handleMiniCourseDetailRequest(request, response, courseId) {
  const user = await getOptionalAuthUser(request);
  const catalog = getMiniCourseCatalog(request);

  try {
    const course = await getMiniCourseById(courseId, user?.id || "");
    const isUnavailableForCatalog = catalog === "ilife"
      ? course?.isVisible !== false
      : (course?.isVisible === false && !isAdminUser(user));
    if (!course || isUnavailableForCatalog) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      course,
      user: user ? sanitizeUser(user) : null
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o curso."
    });
  }
}

async function handleMiniCourseCoverUploadRequest(request, response, courseId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const providedFileName = decodeURIComponent(String(request.headers["x-file-name"] || "cover.webp").trim() || "cover.webp");
  const contentType = String(request.headers["content-type"] || "").trim().toLowerCase();

  if (!isMiniMediaImageUpload(providedFileName, contentType)) {
    sendJson(response, 400, { error: "Envie uma imagem valida para a capa do curso." });
    return;
  }

  try {
    const existingCourse = await getMiniCourseById(courseId, "");
    if (!existingCourse) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    const fileBuffer = await readBinaryBody(request, MAX_MINI_COURSE_COVER_BYTES);
    if (!fileBuffer.length) {
      sendJson(response, 400, { error: "Imagem de capa vazia." });
      return;
    }

    const extension = ".webp";
    const key = `${buildMiniCourseCoverFolder(courseId)}/cover-${Date.now()}${extension}`;
    const finalContentType = "image/webp";
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: finalContentType
    }));

    const coverImageUrl = buildAlbumZipPublicUrlFromKey(key);
    const updatedCourse = await updateMiniCourseCover(courseId, coverImageUrl);
    if (!updatedCourse) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      course: updatedCourse,
      feedback: "Capa global do curso atualizada com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a capa do curso."
    });
  }
}

async function handleMiniCourseStartRequest(request, response, courseId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const course = await startMiniCourse(user.id, courseId);
    if (!course) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    const summary = await getMiniCourseUserSummary(user.id);
    sendJson(response, 200, {
      ok: true,
      course,
      user: sanitizeUser(user),
      summary
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel iniciar o curso."
    });
  }
}

async function handleMiniCourseProgressRequest(request, response, courseId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const course = await updateMiniCourseProgress(user.id, courseId, Number(body?.currentPage || 1) || 1);
    if (!course) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    const summary = await getMiniCourseUserSummary(user.id);
    sendJson(response, 200, {
      ok: true,
      course,
      user: sanitizeUser(user),
      summary
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar o progresso."
    });
  }
}

async function handleMiniCourseCoverGenerateRequest(request, response, courseId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  const requestContentType = String(request.headers["content-type"] || "").trim().toLowerCase();
  const isUploadReference = requestContentType.startsWith("image/");
  let body = null;
  let uploadedReferenceBuffer = null;
  let uploadedReferenceType = requestContentType || "image/png";
  let uploadedReferenceName = decodeURIComponent(String(request.headers["x-file-name"] || "reference.png").trim() || "reference.png");

  if (isUploadReference) {
    if (!isMiniMediaImageUpload(uploadedReferenceName, uploadedReferenceType)) {
      sendJson(response, 400, { error: "Envie uma imagem valida como referencia da capa." });
      return;
    }
    try {
      uploadedReferenceBuffer = await readBinaryBody(request, MAX_MINI_COURSE_COVER_BYTES);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Falha ao ler a imagem enviada." });
      return;
    }
    if (!uploadedReferenceBuffer?.length) {
      sendJson(response, 400, { error: "Imagem de referencia vazia." });
      return;
    }
  } else {
    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  const requestedModel = String(isUploadReference ? request.headers["x-model"] || "" : body?.model || "").trim();
  const model = MINI_MEDIA_IMAGE_MODELS.some((item) => item.id === requestedModel)
    ? requestedModel
    : (MINI_MEDIA_IMAGE_MODELS[0]?.id || "gpt-image-2");

  try {
    const existingCourse = await getMiniCourseById(courseId, "");
    if (!existingCourse) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    const prompt = [
      `Crie uma capa vertical original em proporcao 2:3 para o curso "${String(existingCourse.title || "Curso").trim()}".`,
      existingCourse.context ? `Contexto do curso: ${String(existingCourse.context).trim()}.` : "",
      existingCourse.coverImagePrompt ? `Direcao visual sugerida: ${String(existingCourse.coverImagePrompt).trim()}.` : "",
      "A arte deve parecer premium, acolhedora, nítida e apropriada para um curso cristao infantil ou de formacao de professores.",
      "Nao escreva titulo, letras, tipografia, selo ou texto na imagem.",
      uploadedReferenceBuffer?.length ? "Use a imagem enviada apenas como referencia de estilo, paleta, clima, composicao e nivel de detalhe." : "",
      uploadedReferenceBuffer?.length ? "Nao replique exatamente a imagem enviada e nao copie personagens, poses, enquadramento ou elementos de forma identica." : "",
      "Crie uma capa nova e original, mantendo personalidade propria mesmo quando houver referencia.",
      "A imagem precisa funcionar bem como capa do curso em tela mobile e desktop."
    ].filter(Boolean).join(" ");

    let openAiResponse = null;
    if (uploadedReferenceBuffer?.length) {
      const formData = new FormData();
      formData.append("model", model);
      formData.append("prompt", prompt);
      formData.append("size", "1024x1536");
      formData.append("quality", "high");
      formData.append(
        "image[]",
        new Blob([uploadedReferenceBuffer], { type: uploadedReferenceType }),
        path.posix.basename(uploadedReferenceName) || "reference.png"
      );
      openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      });
    } else {
      openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt,
          size: "1024x1536",
          quality: "high"
        })
      });
    }

    const payload = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status || 502, {
        error: payload?.error?.message || payload?.error || "Nao foi possivel gerar a capa do curso com a OpenAI."
      });
      return;
    }

    const b64 = String(payload?.data?.[0]?.b64_json || "").trim();
    if (!b64) {
      sendJson(response, 502, { error: "A OpenAI nao devolveu a imagem gerada." });
      return;
    }

    const generatedBuffer = Buffer.from(b64, "base64");
    const key = `${buildMiniCourseCoverFolder(courseId)}/cover-generated-${Date.now()}.png`;
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: generatedBuffer,
      ContentType: "image/png"
    }));

    const coverImageUrl = buildAlbumZipPublicUrlFromKey(key);
    const updatedCourse = await updateMiniCourseCover(courseId, coverImageUrl);
    if (!updatedCourse) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      course: updatedCourse,
      feedback: `Nova capa do curso gerada com ${model}.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar a capa do curso."
    });
  }
}

async function handleMiniCourseDeleteRequest(request, response, courseId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  try {
    const deleted = await deleteMiniCourse(courseId);
    if (!deleted) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      deleted: true,
      courseId,
      feedback: "Curso excluido com sucesso."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir o curso."
    });
  }
}

async function handleMiniCourseVisibilityRequest(request, response, courseId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const updatedCourse = await updateMiniCourseVisibility(courseId, body?.isVisible !== false);
    if (!updatedCourse) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(adminUser),
      course: updatedCourse,
      feedback: updatedCourse.isVisible === false
        ? "Curso ocultado do público com sucesso."
        : "Curso visível ao público novamente."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar a visibilidade do curso."
    });
  }
}

function buildMiniCourseQuizSourceText(course) {
  const pages = (Array.isArray(course?.pages) ? course.pages : []).filter((page) => !["course-map", "chapter_open"].includes(String(page?.kind || "").trim().toLowerCase()));
  const maxPages = 18;
  const maxChars = 16000;
  const compactText = (value, limit = 320) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  const selectedIndexes = (() => {
    if (pages.length <= maxPages) {
      return pages.map((_, index) => index);
    }
    const indexes = new Set([0, pages.length - 1]);
    for (let pickIndex = 1; pickIndex < maxPages - 1; pickIndex += 1) {
      const ratio = pickIndex / (maxPages - 1);
      indexes.add(Math.min(pages.length - 1, Math.round(ratio * (pages.length - 1))));
    }
    return [...indexes].sort((left, right) => left - right).slice(0, maxPages);
  })();

  const lines = [
    `Titulo do curso: ${compactText(course?.title || "", 180)}`,
    `Contexto do curso: ${compactText(course?.context || "", 600)}`
  ];

  if (pages.length > selectedIndexes.length) {
    lines.push(`Resumo parcial para quiz: usando ${selectedIndexes.length} de ${pages.length} páginas distribuídas pelo curso para manter a geração estável.`);
  }

  selectedIndexes.forEach((pageIndex) => {
    const page = pages[pageIndex] || {};
    lines.push(`Pagina ${pageIndex + 1}: ${compactText(page?.title || "", 140)}`);
    (Array.isArray(page?.paragraphs) ? page.paragraphs : [])
      .map((item) => compactText(item, 280))
      .filter(Boolean)
      .slice(0, 2)
      .forEach((item) => lines.push(item));
    (Array.isArray(page?.bullets) ? page.bullets : [])
      .map((item) => compactText(item, 180))
      .filter(Boolean)
      .slice(0, 4)
      .forEach((item) => lines.push(`- ${item}`));
    (Array.isArray(page?.tableRows) ? page.tableRows : [])
      .slice(0, 4)
      .forEach((row) => {
        const label = compactText(row?.label || "", 120);
        const value = compactText(row?.value || "", 160);
        if (label || value) {
          lines.push(`${label}${label && value ? ": " : ""}${value}`);
        }
      });
  });

  const output = [];
  let currentLength = 0;
  for (const line of lines) {
    const safeLine = String(line || "").trim();
    if (!safeLine) {
      continue;
    }
    const nextLength = currentLength + safeLine.length + 1;
    if (nextLength > maxChars) {
      output.push("Resumo cortado para evitar travamento do quiz em cursos muito longos.");
      break;
    }
    output.push(safeLine);
    currentLength = nextLength;
  }

  return output.join("\n");
}

function miniCourseQuizQuestionNeedsRetry(question) {
  if (!question || !Array.isArray(question.options) || question.options.length !== 4) {
    return true;
  }

  const promptText = String(question?.question || "").trim();
  if (!promptText) {
    return true;
  }

  const options = question.options
    .map((option) => String(option || "").trim())
    .filter(Boolean);
  if (options.length !== 4) {
    return true;
  }

  const normalizedOptions = options.map((option) => option.toLowerCase());
  if (new Set(normalizedOptions).size !== 4) {
    return true;
  }

  const correctIndex = Number(question?.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return true;
  }

  const explanation = String(question?.explanation || "").trim();
  if (!explanation) {
    return true;
  }

  return false;
}

function miniCourseQuizNeedsRetry(parsed) {
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questions.length !== 10) {
    return true;
  }
  return questions.some((question) => miniCourseQuizQuestionNeedsRetry(question));
}

async function handleMiniCourseQuizGenerateRequest(request, response, courseId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  try {
    const course = await getMiniCourseById(courseId, adminUser.id);
    if (!course) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }

    const quizModel = "gpt-5.1";
    const quizTimeoutMs = 120000;
    const sharedContext = await getContextPrompt();
    const quizSourceText = buildMiniCourseQuizSourceText(course);
    let parsed = null;
    let lastFailureMessage = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const requestPayload = {
        model: quizModel,
        temperature: 0.22,
        max_completion_tokens: 2600,
        response_format: {
          type: "json_schema",
          json_schema: buildMiniCourseQuizSchema(10)
        },
        messages: [
          {
            role: "system",
            content: buildMiniSystemPrompt({
              modeKey: "project",
              sharedContext,
              plannerContext: MINI_MINISTRY_CONTEXT,
              theme: course.title,
              extraInstructions: [
                "Crie um quiz de 10 perguntas para professores com base no curso.",
                "Cada pergunta deve ter exatamente 4 alternativas.",
                "As perguntas devem se basear no conteudo real do curso.",
                "Formule perguntas que reflitam com fidelidade o conteudo, a progressao e a linguagem do curso.",
                "Pode criar perguntas sobre ideias centrais, detalhes relevantes, aplicacoes, sequencias, exemplos e enfases presentes no curso.",
                "Evite inventar fatos que nao aparecem no curso.",
                "Mantenha 1 alternativa correta por pergunta.",
                "Evite alternativas obviamente faceis de eliminar pelo tamanho, pela simplicidade ou pelo tom.",
                "Em cada pergunta, escreva as 4 alternativas com estrutura, extensao e nivel de detalhe parecidos entre si.",
                "As alternativas erradas devem soar plausiveis e bem escritas, mas se desviar levemente do eixo central por termos, foco, objetivo ou aplicacao.",
                "Prefira distratores semanticamente proximos da correta, em vez de respostas curtas, caricatas ou fora do assunto.",
                "Quando a alternativa correta for uma frase longa, faca as incorretas tambem longas e com construcoes parecidas.",
                "Quando fizer sentido, comece as alternativas com uma mesma estrutura frasal para nao entregar a correta pelo formato.",
                "Escreva em portugues do Brasil.",
                "Nao repita perguntas.",
                "Responda apenas em JSON estruturado."
              ].join(" ")
            })
          },
          {
            role: "user",
            content: [
              "Crie 10 perguntas de multipla escolha com base no curso abaixo.",
              "Use somente o curso como fonte.",
              "Extraia perguntas que reflitam o curso como ele foi escrito.",
              "Torne o quiz mais equilibrado: respostas certas e erradas devem parecer igualmente fortes a primeira vista.",
              "Nao use uma alternativa correta muito mais longa ou muito mais especifica que as demais.",
              "Se a correta falar de objetivo, contexto, metodo ou aplicacao, faca as erradas seguirem a mesma forma frasal, mudando sutilmente o foco.",
              attempt > 1 ? "Refaca mantendo fidelidade ao curso e eliminando qualquer pergunta incompleta, repetida ou fora do conteudo." : "",
              quizSourceText
            ].filter(Boolean).join("\n\n")
          }
        ]
      };
      if (supportsReasoningEffortForModel(quizModel)) {
        requestPayload.reasoning_effort = "none";
      }

      try {
        const completion = await createChatCompletion(apiKey, requestPayload, {
          timeoutMs: quizTimeoutMs,
          timeoutMessage: `A OpenAI demorou demais para responder ao quiz na tentativa ${attempt}/3.`
        });
        const raw = extractChatCompletionText(completion);
        const candidate = parseStructuredJsonText(raw);
        if (!miniCourseQuizNeedsRetry(candidate)) {
          parsed = candidate;
          break;
        }
        lastFailureMessage = `Tentativa ${attempt}/3: a IA devolveu perguntas incompletas, repetidas ou fora do formato esperado para este curso.`;
      } catch (error) {
        lastFailureMessage = error instanceof Error ? error.message : "Nao foi possivel gerar o quiz.";
      }
    }

    if (!parsed) {
      sendJson(response, 422, {
        error: lastFailureMessage || "Nao foi possivel montar um quiz equilibrado para este curso."
      });
      return;
    }

    const updatedCourse = await updateMiniCourseQuiz(courseId, Array.isArray(parsed?.questions) ? parsed.questions : []);
    if (!updatedCourse || !updatedCourse.hasQuiz) {
      sendJson(response, 422, { error: "Nao foi possivel montar o quiz do curso." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      course: {
        ...updatedCourse,
        pages: []
      },
      feedback: "Quiz gerado com 10 perguntas."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar o quiz."
    });
  }
}

async function handleMiniCourseQuizSubmitRequest(request, response, courseId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const course = await getMiniCourseById(courseId, user.id);
    if (!course) {
      sendJson(response, 404, { error: "Curso nao encontrado." });
      return;
    }
    const quizQuestions = Array.isArray(course.quizQuestions) ? course.quizQuestions : [];
    if (!quizQuestions.length) {
      sendJson(response, 404, { error: "Este curso ainda nao possui quiz." });
      return;
    }

    const answers = Array.isArray(body?.answers) ? body.answers : [];
    let correctAnswers = 0;
    quizQuestions.forEach((question, index) => {
      const selectedIndex = Number(answers[index]?.selectedIndex);
      if (Number.isInteger(selectedIndex) && selectedIndex === Number(question.correctIndex)) {
        correctAnswers += 1;
      }
    });

    const result = await saveMiniCourseQuizResult(user.id, courseId, {
      correctAnswers,
      totalQuestions: quizQuestions.length
    });

    sendJson(response, 200, {
      ok: true,
      result
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a nota do quiz."
    });
  }
}

async function handleMiniCourseJobsListRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  try {
    const jobs = await listMiniCourseJobs(adminUser.id);
    sendJson(response, 200, {
      ok: true,
      jobs,
      user: sanitizeUser(adminUser)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar a fila de cursos."
    });
  }
}

async function handleMiniCourseJobDebugDownloadRequest(request, response, jobId) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  try {
    const job = await getMiniCourseJobDebug(adminUser.id, jobId);
    if (!job) {
      sendJson(response, 404, { error: "Job de curso nao encontrado." });
      return;
    }
    if (!job.hasDebugPayload || !job.debugPayload || !Object.keys(job.debugPayload).length) {
      sendJson(response, 404, { error: "Este job ainda nao possui JSON de falha para download." });
      return;
    }

    const fileName = `mini-course-job-${job.id}-failed.json`;
    const payload = {
      downloadedAt: new Date().toISOString(),
      job: {
        id: job.id,
        title: job.title,
        context: job.context,
        requestedModel: job.requestedModel,
        requestedPageCount: job.requestedPageCount,
        requestedChapterCount: job.requestedChapterCount,
        requestedCourseStyle: job.requestedCourseStyle,
        generatedPageCount: job.generatedPageCount,
        status: job.status,
        feedback: job.feedback,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt
      },
      debug: job.debugPayload
    };

    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": buildContentDisposition(fileName)
    });
    response.end(JSON.stringify(payload, null, 2));
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel baixar o JSON de falha."
    });
  }
}

async function handleMiniCourseModelsRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  sendJson(response, 200, {
    ok: true,
    models: getMiniCourseGeneratorModels(),
    defaultModel: normalizeMiniCourseGeneratorModel("gpt-5.1"),
    user: sanitizeUser(adminUser)
  });
}

async function handleMiniCoursePlanPreviewRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = String(body?.title || "").trim();
  const context = String(body?.context || "").trim();
  const model = normalizeMiniCourseGeneratorModel(body?.model);
  const pageCount = Math.max(4, Math.min(300, Number(body?.pageCount || 8) || 8));
  const chapterCount = Math.max(1, Math.min(pageCount, Number(body?.chapterCount || 1) || 1));
  const courseStyle = normalizeMiniCourseStyle(body?.courseStyle || "course");

  if (!title) {
    sendJson(response, 400, { error: "Informe o titulo do curso." });
    return;
  }

  if (!context) {
    sendJson(response, 400, { error: "Informe o contexto do curso." });
    return;
  }

  try {
    const plan = await planMiniCourseStructure({
      apiKey,
      model,
      title,
      context,
      pageCount,
      chapterCount,
      courseStyle
    });
    const previewText = [
      `${buildMiniCourseMapTitle(courseStyle)} planejado pela IA`,
      `Titulo final: ${plan.title}`,
      plan.courseOverview ? `Visao geral: ${plan.courseOverview}` : "",
      "",
      ...plan.chapters.map((chapter) => (
        `Capitulo ${chapter.chapterNumber} (${chapter.contentPageCount} paginas)\nTitulo: ${chapter.title}\nSubtitulo: ${chapter.subtitle || "-"}\nLogline: ${chapter.logline}\nPaginas previstas: ${chapter.contentKinds.join(", ")}`
      ))
    ].filter(Boolean).join("\n");

    sendJson(response, 200, {
      ok: true,
      plan: {
        title: plan.title,
        courseOverview: plan.courseOverview,
        chapters: plan.chapters,
        courseMapText: plan.courseMapText,
        courseStyle: plan.courseStyle
      },
      previewText,
      feedback: normalizeMiniCourseStyle(courseStyle) === "story"
        ? "Planejamento narrativo pronto. O campo central agora mostra o mapa da historia antes da geracao."
        : "Planejamento do curso pronto. O campo central agora mostra o mapa de capitulos antes da geracao."
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel planejar o curso com IA."
    });
  }
}

async function handleMiniCourseGenerateRequest(request, response) {
  const adminUser = await requireAdmin(request, response);
  if (!adminUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = String(body?.title || "").trim();
  const context = String(body?.context || "").trim();
  const model = normalizeMiniCourseGeneratorModel(body?.model);
  const pageCount = Math.max(4, Math.min(300, Number(body?.pageCount || 8) || 8));
  const chapterCount = Math.max(1, Math.min(pageCount, Number(body?.chapterCount || 1) || 1));
  const courseStyle = normalizeMiniCourseStyle(body?.courseStyle || "course");

  if (!title) {
    sendJson(response, 400, { error: "Informe o titulo do curso." });
    return;
  }

  if (!context) {
    sendJson(response, 400, { error: "Informe o contexto do curso." });
    return;
  }

  try {
    const job = await createMiniCourseJob({
      title,
      context,
      requestedModel: model,
      requestedPageCount: pageCount,
      requestedChapterCount: chapterCount,
      requestedCourseStyle: courseStyle,
      createdByUserId: adminUser.id
    });
    void processMiniCourseJobsQueue();

    sendJson(response, 202, {
      ok: true,
      job,
      feedback: `Curso solicitado com ${pageCount} páginas de conteúdo, ${chapterCount} capítulos e ${buildMiniCourseStyleLabel(courseStyle)} usando ${model}. Ele entrou na fila de geração.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar o curso.",
      feedback: "A geracao falhou antes de salvar o curso no Postgres."
    });
  }
}

async function handleMiniLessonPlansCreateRequest(request, response) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const plan = await createMiniLessonPlan(user.id, body || {});
    sendJson(response, 201, { ok: true, plan });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar o plano."
    });
  }
}

async function handleMiniLessonPlanDetailRequest(request, response, planId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const plan = await getMiniLessonPlanById(user.id, planId);
    if (!plan) {
      sendJson(response, 404, { error: "Plano nao encontrado." });
      return;
    }
    sendJson(response, 200, { ok: true, plan });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o plano."
    });
  }
}

async function handleMiniLessonPlanUpdateRequest(request, response, planId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const plan = await updateMiniLessonPlan(user.id, planId, body || {});
    if (!plan) {
      sendJson(response, 404, { error: "Plano nao encontrado." });
      return;
    }
    sendJson(response, 200, { ok: true, plan });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar o plano."
    });
  }
}

async function handleMiniLessonPlanDeleteRequest(request, response, planId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const deleted = await deleteMiniLessonPlan(user.id, planId);
    if (!deleted) {
      sendJson(response, 404, { error: "Plano nao encontrado." });
      return;
    }
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel excluir o plano."
    });
  }
}

async function handleMiniChatDetailRequest(request, response, chatId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  try {
    const chat = await getMiniChatById(user.id, chatId);
    if (!chat) {
      sendJson(response, 404, { error: "Chat nao encontrado." });
      return;
    }
    sendJson(response, 200, { ok: true, chat });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar chat."
    });
  }
}

async function handleMiniChatMessageRequest(request, response, chatId) {
  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const message = String(body?.message || "").trim();
  if (!message) {
    sendJson(response, 400, { error: "Mensagem ausente." });
    return;
  }

  const modeKey = String(body?.mode || "fast").trim();
  const selectedMode = {
    fast: { model: "gpt-4.1-nano", instantModel: "gpt-4.1-nano", maxCompletionTokens: 260 },
    think: { model: "gpt-4.1-mini", instantModel: "gpt-4.1-nano", maxCompletionTokens: 700 },
    project: { model: "gpt-5-mini", instantModel: "gpt-4.1-mini", maxCompletionTokens: 2600 }
  }[modeKey] || { model: OPENAI_MODEL, instantModel: OPENAI_INSTANT_MODEL, maxCompletionTokens: DEFAULT_FINAL_MAX_COMPLETION_TOKENS };

  try {
    let chat = chatId ? await getMiniChatById(user.id, chatId) : null;
    if (!chat) {
      chat = await createMiniChat(user.id, { title: createMiniChatTitleFromMessage(message) });
    }

    const userEntry = { role: "user", content: message, createdAt: new Date().toISOString() };
    const currentMessages = [...(chat.messages || [])].slice(-24);
    const system = await buildMiniChatCompletionPrompt({
      user,
      chat: { ...chat, messages: currentMessages },
      modeKey,
      message
    });

    const completion = await createChatCompletion(apiKey, {
      model: selectedMode.instantModel || selectedMode.model,
      temperature: 0.6,
      max_completion_tokens: selectedMode.maxCompletionTokens,
      messages: [
        { role: "system", content: system },
        ...currentMessages
          .filter((item) => item.role === "user" || item.role === "assistant")
          .map((item) => ({
            role: item.role,
            content: String(item.content || "")
          })),
        { role: "user", content: message }
      ]
    });

    const replyText = extractChatCompletionText(completion).trim();
    const assistantEntry = { role: "assistant", content: replyText, createdAt: new Date().toISOString() };
    const nextMessages = [...currentMessages, assistantEntry];
    const nextChat = await appendMiniChatMessages(user.id, chat.id, [userEntry, assistantEntry], {
      title: chat.title === "Novo chat" ? createMiniChatTitleFromMessage(message) : chat.title,
      lastMessageAt: new Date().toISOString()
    });

    sendJson(response, 200, {
      ok: true,
      model: selectedMode.instantModel || selectedMode.model,
      chat: nextChat,
      replyText
    });
  } catch (error) {
    sendJson(response, 500, {
      error: "Falha ao gerar resposta do MINI.",
      details: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
}

async function createStripeCheckout({ request, user, product }) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(request);
  const referenceId = `printy-${product.id}-${crypto.randomUUID()}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: buildStripeSuccessUrl(baseUrl, "/produto.html", "album", product.id),
    cancel_url: `${baseUrl}/produto.html?album=${encodeURIComponent(product.id)}`,
    locale: "pt-BR",
    customer_email: user.email || undefined,
    client_reference_id: referenceId,
    metadata: {
      kind: "album_purchase",
      referenceId,
      productId: product.id,
      userId: user.id
    },
    line_items: [
      {
        quantity: product.quantity,
        price_data: {
          currency: "brl",
          unit_amount: product.unitAmount,
          product_data: {
            name: product.name,
            description: product.description
          }
        }
      }
    ]
  });

  return {
    checkoutId: session.id,
    referenceId,
    payUrl: session.url,
    raw: session
  };
}

async function handleStripeCheckoutRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Produto nao encontrado." });
    return;
  }

  try {
    const checkout = await createStripeCheckout({ request, user, product });
    await createAlbumPurchaseRecord({
      userId: user.id,
      productId: product.id,
      referenceId: checkout.referenceId,
      checkoutId: checkout.checkoutId,
      amountCents: product.unitAmount,
      environment: getStripeEnvironment(),
      payload: checkout.raw
    });
    sendJson(response, 200, {
      ok: true,
      product: {
        id: product.id,
        name: product.name,
        priceLabel: formatPriceFromCents(product.unitAmount)
      },
      checkoutId: checkout.checkoutId,
      referenceId: checkout.referenceId,
      payUrl: checkout.payUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao criar checkout Stripe."
    });
  }
}

async function createStripeSubscriptionCheckout({ request, user, plan }) {
  const stripe = getStripeClient();
  const baseUrl = getBaseUrl(request);
  const referenceId = `printy-plan-${plan.id}-${crypto.randomUUID()}`;
  const intervalUnit = String(plan.intervalUnit || "MONTH").toLowerCase();
  const recurringInterval = intervalUnit === "year" || intervalUnit === "month" ? intervalUnit : "month";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: buildStripeSuccessUrl(baseUrl, "/planos.html", "plan", plan.id),
    cancel_url: `${baseUrl}/planos.html?plan=${encodeURIComponent(plan.id)}`,
    locale: "pt-BR",
    customer_email: user.email || undefined,
    client_reference_id: referenceId,
    metadata: {
      kind: "plan_subscription",
      referenceId,
      planId: plan.id,
      userId: user.id
    },
    subscription_data: {
      metadata: {
        kind: "plan_subscription",
        referenceId,
        planId: plan.id,
        userId: user.id
      }
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          recurring: {
            interval: recurringInterval,
            interval_count: Math.max(1, Number(plan.intervalLength) || 1)
          },
          unit_amount: plan.unitAmount,
          product_data: {
            name: `Plano ${plan.name}`,
            description: `Assinatura ${plan.name} da Turma do Printy`
          }
        }
      }
    ]
  });

  return {
    checkoutId: session.id,
    referenceId,
    payUrl: session.url,
    recurrencePlanId: session.subscription || null,
    raw: session
  };
}

async function handleStripeSubscriptionCheckoutRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  const pricing = await getSitePricingSettings();
  const plan = buildSubscriptionPlans(pricing.planPrices).find((item) => item.id === planId) || findSubscriptionPlanById(planId);

  if (!plan || plan.id === "gratis") {
    sendJson(response, 404, { error: "Plano recorrente nao encontrado." });
    return;
  }

  try {
    const checkout = await createStripeSubscriptionCheckout({ request, user, plan });
    await createPlanSubscriptionRecord({
      userId: user.id,
      planId: plan.id,
      referenceId: checkout.referenceId,
      checkoutId: checkout.checkoutId,
      amountCents: plan.unitAmount,
      environment: getStripeEnvironment(),
      payload: checkout.raw
    });
    sendJson(response, 200, {
      ok: true,
      plan: {
        id: plan.id,
        name: plan.name,
        priceLabel: formatPriceFromCents(plan.unitAmount)
      },
      checkoutId: checkout.checkoutId,
      referenceId: checkout.referenceId,
      recurrencePlanId: checkout.recurrencePlanId,
      payUrl: checkout.payUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao criar checkout recorrente Stripe."
    });
  }
}

function escapePdfText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toPdfLatinText(text) {
  return String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

function buildTermPdfBuffer(term) {
  const questions = getTermQuestionOrder();
  const lines = ["Formulario do Evento", ""];

  for (const item of questions) {
    const value = toPdfLatinText(String(term?.answers?.[item.key] || "-"));
    lines.push(item.label);
    lines.push(value);
    lines.push("");
  }

  const streamParts = [];
  streamParts.push("0 0.22 0.66 rg");
  streamParts.push("0 0 595 842 re f");
  streamParts.push("1 1 1 rg");
  streamParts.push("BT");
  streamParts.push("/F1 22 Tf");
  streamParts.push("40 790 Td");
  streamParts.push(`(${escapePdfText(lines[0])}) Tj`);
  streamParts.push("ET");

  let y = 755;
  for (let i = 1; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const fontSize = i % 3 === 1 ? 12 : 11;
    const maxChars = i % 3 === 1 ? 78 : 88;
    const wrapped = [];

    if (!rawLine) {
      wrapped.push("");
    } else {
      let current = "";
      for (const chunk of rawLine.split(/\s+/)) {
        const next = current ? `${current} ${chunk}` : chunk;
        if (next.length > maxChars) {
          if (current) {
            wrapped.push(current);
            current = chunk;
          } else {
            wrapped.push(next.slice(0, maxChars));
            current = next.slice(maxChars);
          }
        } else {
          current = next;
        }
      }
      if (current) {
        wrapped.push(current);
      }
    }

    for (const line of wrapped) {
      if (y < 38) {
        break;
      }
      streamParts.push("BT");
      streamParts.push(`/F1 ${fontSize} Tf`);
      streamParts.push(`40 ${y} Td`);
      streamParts.push(`(${escapePdfText(toPdfLatinText(line))}) Tj`);
      streamParts.push("ET");
      y -= line ? 18 : 10;
    }
    if (y < 38) {
      break;
    }
  }

  const contentStream = `${streamParts.join("\n")}\n`;
  const contentLength = Buffer.byteLength(contentStream, "latin1");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function handleCreateTerm(request, response) {
  const authUser = await requireAuth(request, response);
  if (!authUser) {
    return;
  }

  if (!hasDatabase()) {
    sendJson(response, 503, { error: "DATABASE_URL nao configurada." });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const term = await createAllTermEntry(body?.answers || {}, authUser.id);
    const answers = term?.answers || {};
    const months = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const monthInput = String(answers.mes || "").trim();
    const monthAsNumber = Number(monthInput);
    const monthLabel = Number.isInteger(monthAsNumber) && monthAsNumber >= 1 && monthAsNumber <= 12
      ? months[monthAsNumber - 1]
      : (monthInput || "-");

    const day = String(answers.dia || "").trim().padStart(2, "0");
    const monthDisplayNumber = Number.isInteger(monthAsNumber) && monthAsNumber >= 1 && monthAsNumber <= 12
      ? String(monthAsNumber).padStart(2, "0")
      : String((months.findIndex((m) => m.toLowerCase() === monthInput.toLowerCase()) + 1) || "").padStart(2, "0");
    const dateLabel = `${day}/${monthDisplayNumber || "00"}`;

    let timeLabel = String(answers.horario || "").trim();
    const timeMatch = timeLabel.toLowerCase().match(/^(\d{1,2})h(\d{2})(am|pm)$/);
    if (timeMatch) {
      let h = Number(timeMatch[1]);
      const m = timeMatch[2];
      const p = timeMatch[3];
      if (p === "pm" && h < 12) h += 12;
      if (p === "am" && h === 12) h = 0;
      timeLabel = `${String(h).padStart(2, "0")}:${m}`;
    }

    await createScheduleEntry({
      monthLabel,
      dateLabel,
      place: String(answers.igreja || "-"),
      city: String(answers.cidade || "-"),
      time: timeLabel || "-"
    });

    sendJson(response, 201, { ok: true, termId: term.id, pdfUrl: `/api/terms/${term.id}/pdf` });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel salvar o termo."
    });
  }
}

async function handleExtraGoalVariantsRequest(request, response, goalId, variantId = "") {
  const user = await requireAuth(request, response);
  if (!user) return;
  try {
    const requestUrl = new URL(request.url || "/api/200/extra-goals", `http://${request.headers.host || "localhost"}`);
    let body = {};
    if (request.method !== "GET" && request.method !== "DELETE") body = await readJsonBody(request);
    const profileValue = body?.profile || requestUrl.searchParams.get("profile");
    const selectedProfile = await resolveProject200ProfileName(user.id, profileValue, { fallbackToDefault: true });
    let variants;
    if (request.method === "POST") variants = await createExtraGoalVariant(user.id, selectedProfile, goalId, body);
    else if (request.method === "PATCH") variants = await updateExtraGoalVariant(user.id, selectedProfile, goalId, variantId, body);
    else if (request.method === "DELETE") variants = await deleteExtraGoalVariant(user.id, selectedProfile, goalId, variantId);
    else variants = await listExtraGoalVariants(user.id, selectedProfile, goalId);
    sendJson(response, 200, { ok: true, profile: selectedProfile, variants });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Nao foi possivel atualizar as variacoes." });
  }
}

async function handleGetContractorPanel(request, response) {
  const authUser = await requireAuth(request, response);
  if (!authUser) {
    return;
  }

  try {
    const term = await getLatestTermByUserId(authUser.id);

    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(authUser),
      panel: {
        hasTerm: Boolean(term),
        term: term
          ? {
              id: term.id,
              answers: term.answers || {},
              eventDate: term.eventDate,
              eventTime: term.eventTime,
              createdAt: term.createdAt,
              pdfUrl: `/api/terms/${term.id}/pdf`
            }
          : null
      }
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o painel do contratante."
    });
  }
}

async function handleProject200ProfileAvatarGenerateRequest(request, response, profileId) {
  const authUser = await requireAuth(request, response);
  if (!authUser) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "OPENAI_API_KEY nao configurada.",
      hint: "Defina OPENAI_API_KEY no Render ou no arquivo .env local."
    });
    return;
  }

  const contentTypeHeader = String(request.headers["content-type"] || "").trim().toLowerCase();
  const contentType = contentTypeHeader.split(";")[0] || "image/png";
  if (!contentType.startsWith("image/")) {
    sendJson(response, 400, { error: "Envie uma imagem valida para gerar o avatar." });
    return;
  }

  let uploadedReferenceBuffer = null;
  try {
    uploadedReferenceBuffer = await readBinaryBody(request, MAX_MINI_COURSE_COVER_BYTES);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Falha ao ler a imagem enviada." });
    return;
  }

  if (!uploadedReferenceBuffer?.length) {
    sendJson(response, 400, { error: "Imagem de referencia vazia." });
    return;
  }

  try {
    const prompt = [
      "Crie um avatar quadrado estilizado para foto de perfil.",
      "Use a imagem enviada apenas como referencia da pessoa.",
      "Transforme em uma ilustracao premium inspirada em animacao disney pixar, com acabamento cinematografico tipo 4k.",
      "Mostre somente uma pessoa, centralizada, do peito para cima ou close no rosto.",
      "Mantenha semelhanca facial, simpatia e expressao acolhedora.",
      "Nao escreva texto, letras, numeros, molduras ou marcas."
    ].join(" ");

    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", prompt);
    formData.append("size", "1024x1024");
    formData.append("quality", "high");
    formData.append(
      "image[]",
      new Blob([uploadedReferenceBuffer], { type: contentType }),
      "project200-profile-reference.png"
    );

    const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const payload = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status || 502, {
        error: payload?.error?.message || payload?.error || "Nao foi possivel gerar a foto do usuario."
      });
      return;
    }

    const b64 = String(payload?.data?.[0]?.b64_json || "").trim();
    if (!b64) {
      sendJson(response, 502, { error: "A OpenAI nao devolveu a imagem gerada." });
      return;
    }

    const profile = await updateProject200ProfileAvatar(authUser.id, profileId, {
      avatarDataUrl: `data:image/png;base64,${b64}`
    });

    sendJson(response, 200, {
      ok: true,
      model: "gpt-image-1",
      profile,
      feedback: `Avatar atualizado com gpt-image-1 para ${profile.name}.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar a foto do usuario."
    });
  }
}

async function handleProject200ProfileAvatarUploadRequest(request, response, profileId) {
  const authUser = await requireAuth(request, response);
  if (!authUser) {
    return;
  }

  const contentTypeHeader = String(request.headers["content-type"] || "").trim().toLowerCase();
  const contentType = contentTypeHeader.split(";")[0] || "image/png";
  if (!contentType.startsWith("image/")) {
    sendJson(response, 400, { error: "Envie uma imagem valida para salvar no perfil." });
    return;
  }

  let uploadedReferenceBuffer = null;
  try {
    uploadedReferenceBuffer = await readBinaryBody(request, MAX_MINI_COURSE_COVER_BYTES);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Falha ao ler a imagem enviada." });
    return;
  }

  if (!uploadedReferenceBuffer?.length) {
    sendJson(response, 400, { error: "Imagem enviada vazia." });
    return;
  }

  try {
    const profile = await updateProject200ProfileAvatar(authUser.id, profileId, {
      avatarDataUrl: `data:${contentType};base64,${uploadedReferenceBuffer.toString("base64")}`
    });

    sendJson(response, 200, {
      ok: true,
      profile,
      feedback: `Foto atualizada para ${profile.name}.`
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel atualizar a foto do usuario."
    });
  }
}

async function handleTermStripeCheckout(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "JSON invalido." });
    return;
  }

  const stripeProductId = String(body?.stripeProductId || "").trim();
  const amountCents = Math.max(0, Math.trunc(Number(body?.amountCents || 0) || 0));
  const itemName = String(body?.itemName || "Turma do Printy").trim() || "Turma do Printy";
  const returnPathRaw = String(body?.returnPath || "/termo").trim();
  const returnPath = /^\/termo(?:\?.*)?$/.test(returnPathRaw) ? returnPathRaw : "/termo";
  if (!stripeProductId && !amountCents) {
    sendJson(response, 400, { error: "Produto ou valor do checkout nao informado." });
    return;
  }

  try {
    const stripe = getStripeClient();
    const baseUrl = getBaseUrl(request);
    const separator = returnPath.includes("?") ? "&" : "?";
    let lineItems = [];
    if (amountCents > 0) {
      lineItems = [{
        price_data: {
          currency: "brl",
          unit_amount: amountCents,
          product_data: {
            name: itemName
          }
        },
        quantity: 1
      }];
    } else {
      const prices = await stripe.prices.list({
        product: stripeProductId,
        active: true,
        limit: 1
      });

      const price = prices.data[0];
      if (!price?.id) {
        sendJson(response, 404, { error: "Preco ativo nao encontrado para este produto." });
        return;
      }

      lineItems = [{ price: price.id, quantity: 1 }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "pt-BR",
      line_items: lineItems,
      success_url: `${baseUrl}${returnPath}${separator}payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${returnPath}${separator}payment=cancel`
    });

    sendJson(response, 200, { ok: true, payUrl: session.url || "" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Falha ao criar checkout do termo."
    });
  }
}

async function handleDeleteAllTerms(response) {
  if (!hasDatabase()) {
    sendJson(response, 503, { error: "DATABASE_URL nao configurada." });
    return;
  }

  try {
    await deleteAllTerms();
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel apagar os termos."
    });
  }
}

async function handleDeleteOneTerm(response, termId) {
  if (!hasDatabase()) {
    sendJson(response, 503, { error: "DATABASE_URL nao configurada." });
    return;
  }

  try {
    const deleted = await deleteTermById(termId);
    if (!deleted) {
      sendJson(response, 404, { error: "Termo nao encontrado." });
      return;
    }
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel apagar o termo."
    });
  }
}

async function handleListAllTerms(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, { error: "DATABASE_URL nao configurada." });
    return;
  }

  try {
    const dates = await listAllTermDates();
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost:3000"}`);
    const selectedDate = requestUrl.searchParams.get("date") || dates[0] || null;
    const terms = selectedDate ? await listAllTermsByDate(selectedDate) : [];
    sendJson(response, 200, {
      ok: true,
      dates,
      selectedDate,
      questions: getTermQuestionOrder(),
      terms
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel listar os termos."
    });
  }
}

async function handleTermPdfDownload(response, termId) {
  if (!hasDatabase()) {
    sendJson(response, 503, { error: "DATABASE_URL nao configurada." });
    return;
  }

  const term = await getAllTermById(termId);
  if (!term) {
    sendJson(response, 404, { error: "Termo nao encontrado." });
    return;
  }

  const pdfBuffer = buildTermPdfBuffer(term);
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": pdfBuffer.length,
    "Content-Disposition": buildContentDisposition(`termo-${term.id}.pdf`)
  });
  response.end(pdfBuffer);
}

async function handleStripeCheckoutConfirmationRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  if (!sessionId) {
    sendJson(response, 400, { error: "sessionId obrigatorio." });
    return;
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.mode !== "payment") {
      sendJson(response, 400, { error: "Checkout invalido para compra de album." });
      return;
    }

    const referenceId = getMetadataReferenceId(session) || session.client_reference_id || "";
    const metadataUserId = typeof session.metadata?.userId === "string" ? session.metadata.userId.trim() : "";
    const metadataProductId = typeof session.metadata?.productId === "string" ? session.metadata.productId.trim() : "";

    if (!referenceId) {
      sendJson(response, 400, { error: "Checkout sem referencia para confirmar." });
      return;
    }

    if (metadataUserId && metadataUserId !== user.id) {
      sendJson(response, 403, { error: "Checkout pertence a outro usuario." });
      return;
    }

    if (!metadataProductId) {
      sendJson(response, 400, { error: "Checkout sem produto vinculado." });
      return;
    }

    const paymentStatus = normalizeStripePaymentStatus(session.payment_status);

    await createAlbumPurchaseRecord({
      userId: user.id,
      productId: metadataProductId,
      referenceId,
      checkoutId: session.id,
      amountCents: Number(session.amount_total) || 0,
      environment: getStripeEnvironment(),
      payload: session
    });

    await markAlbumPurchaseStatus({
      referenceId,
      status: paymentStatus,
      orderId: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
      chargeId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      payload: session,
      paidAt: isActivePaymentStatus(paymentStatus) ? new Date().toISOString() : null
    });

    const accessState = await getUserAccessState(user.id);
    sendJson(response, 200, {
      ok: true,
      paymentStatus,
      referenceId,
      access: accessState
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao confirmar checkout Stripe."
    });
  }
}

async function handleStripeWebhook(request, response) {
  const rawBody = await readRawTextBody(request);
  let event = null;

  try {
    const stripe = getStripeClient();
    const signature = request.headers["stripe-signature"];

    if (STRIPE_WEBHOOK_SECRET && typeof signature === "string" && rawBody) {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } else if (rawBody) {
      event = JSON.parse(rawBody);
    }
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Webhook Stripe invalido."
    });
    return;
  }

  if (!event && rawBody) {
    try {
      event = JSON.parse(rawBody);
    } catch {
      event = null;
    }
  }

  const payload = event || {};
  const resource = getEventObject(payload);
  const referenceId = getMetadataReferenceId(resource) || getStripeInvoiceReferenceId(resource);

  if (hasDatabase()) {
    try {
      await recordPaymentWebhookEvent({
        eventType: payload?.type || "unknown",
        resourceId: resource?.id || null,
        referenceId,
        payload
      });

      if (referenceId) {
        if (referenceId.startsWith("printy-plan-")) {
          let nextStatus = "PENDING";
          let activatedAt = null;
          let canceledAt = null;
          let subscriptionId = null;

          if (payload?.type === "checkout.session.completed") {
            nextStatus = resource?.mode === "subscription"
              ? normalizeStripeSubscriptionStatus(resource?.payment_status === "paid" ? "active" : "incomplete")
              : normalizeStripePaymentStatus(resource?.payment_status);
            activatedAt = isActiveSubscriptionStatus(nextStatus) ? new Date().toISOString() : null;
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "checkout.session.async_payment_succeeded") {
            nextStatus = "ACTIVE";
            activatedAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "checkout.session.async_payment_failed") {
            nextStatus = "DECLINED";
            canceledAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "invoice.paid") {
            nextStatus = "ACTIVE";
            activatedAt = toIsoDateFromUnix(resource?.status_transitions?.paid_at) || new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "invoice.payment_failed") {
            nextStatus = "OVERDUE";
            canceledAt = new Date().toISOString();
            subscriptionId = resource?.subscription || null;
          } else if (payload?.type === "customer.subscription.updated" || payload?.type === "customer.subscription.deleted") {
            nextStatus = normalizeStripeSubscriptionStatus(resource?.status);
            activatedAt = isActiveSubscriptionStatus(nextStatus) ? toIsoDateFromUnix(resource?.current_period_start) : null;
            canceledAt = isInactiveSubscriptionStatus(nextStatus) ? toIsoDateFromUnix(resource?.canceled_at) || new Date().toISOString() : null;
            subscriptionId = resource?.id || null;
          }

          await markPlanSubscriptionStatus({
            referenceId,
            status: nextStatus,
            subscriptionId,
            payload,
            activatedAt,
            canceledAt
          });
        } else {
          const paymentStatus = payload?.type === "checkout.session.async_payment_failed"
            ? "DECLINED"
            : normalizeStripePaymentStatus(resource?.payment_status);

          await markAlbumPurchaseStatus({
            referenceId,
            status: paymentStatus,
            orderId: resource?.payment_intent || resource?.id || null,
            chargeId: resource?.payment_intent || null,
            payload,
            paidAt: isActivePaymentStatus(paymentStatus) ? new Date().toISOString() : null
          });
        }
      }
    } catch (error) {
      console.error("[Stripe webhook error]", error);
    }
  }

  console.log("[Stripe webhook]", JSON.stringify(payload));
  sendJson(response, 200, { ok: true });
}

async function handleAccessStateRequest(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(user),
      access: accessState
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar acessos do usuario."
    });
  }
}

async function handleSiteConfigRequest(response) {
  try {
    const [pricing, schedule, content] = await Promise.all([
      getSitePricingSettings(),
      getScheduleEntries(),
      getSiteContentSettings()
    ]);

    sendJson(response, 200, {
      ok: true,
      pricing,
      schedule,
      banners: content.banners,
      textOverrides: content.textOverrides
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar configuracoes do site."
    });
  }
}

async function handleAdminBannerUpdate(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para salvar banners."
    });
    return;
  }

  try {
    await ensureSiteConfigSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar configuracoes do site."
    });
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const bannerKey = typeof body.bannerKey === "string" ? body.bannerKey.trim() : "";
  const target = typeof body.target === "string" ? body.target.trim().toLowerCase() : "";
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";

  if (!bannerKey) {
    sendJson(response, 400, { error: "Informe o banner que deseja trocar." });
    return;
  }

  if (!["mobile", "desktop", "both"].includes(target)) {
    sendJson(response, 400, { error: "Escolha mobile, desktop ou ambos." });
    return;
  }

  if (!imageDataUrl) {
    sendJson(response, 400, { error: "Envie a imagem do banner." });
    return;
  }

  try {
    const imageUrl = await saveBannerAsset(imageDataUrl, bannerKey);
    const currentContent = await getSiteContentSettings();
    const nextBanners = {
      ...currentContent.banners,
      [bannerKey]: {
        ...(currentContent.banners?.[bannerKey] || {})
      }
    };

    if (target === "desktop" || target === "both") {
      nextBanners[bannerKey].desktop = imageUrl;
    }

    if (target === "mobile" || target === "both") {
      nextBanners[bannerKey].mobile = imageUrl;
    }

    const content = await saveSiteContentSettings({
      banners: nextBanners,
      textOverrides: currentContent.textOverrides
    });

    sendJson(response, 200, {
      ok: true,
      banners: content.banners,
      bannerKey,
      imageUrl
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar banner."
    });
  }
}

async function handleAdminTextOverrideUpdate(request, response) {
  if (!hasDatabase()) {
    sendJson(response, 503, {
      error: "DATABASE_URL nao configurada.",
      hint: "Configure o Postgres para salvar textos globais."
    });
    return;
  }

  try {
    await ensureSiteConfigSchema();
  } catch (error) {
    sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Falha ao preparar configuracoes do site."
    });
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!key) {
    sendJson(response, 400, { error: "Informe a chave do texto." });
    return;
  }

  if (!text) {
    sendJson(response, 400, { error: "Informe o novo texto." });
    return;
  }

  try {
    const currentContent = await getSiteContentSettings();
    const content = await saveSiteContentSettings({
      banners: currentContent.banners,
      textOverrides: {
        ...currentContent.textOverrides,
        [key]: text
      }
    });

    sendJson(response, 200, {
      ok: true,
      textOverrides: content.textOverrides,
      key,
      text
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar texto."
    });
  }
}

async function handleAdminPricingUpdate(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const albumPriceCents = Number(body.albumPriceCents);
  const planPrices = {
    gratis: 0,
    plus: Number(body?.planPrices?.plus),
    pro: Number(body?.planPrices?.pro),
    life: Number(body?.planPrices?.life)
  };

  if (!Number.isInteger(albumPriceCents) || albumPriceCents < 0) {
    sendJson(response, 400, { error: "Preco dos albuns invalido." });
    return;
  }

  if (!Number.isInteger(planPrices.plus) || !Number.isInteger(planPrices.pro) || !Number.isInteger(planPrices.life)) {
    sendJson(response, 400, { error: "Precos dos planos invalidos." });
    return;
  }

  try {
    const currentPricing = await getSitePricingSettings();
    const pricing = await saveSitePricingSettings({
      albumPriceCents,
      albumOverrides: currentPricing.albumOverrides,
      planPrices
    });
    sendJson(response, 200, { ok: true, pricing });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar precos."
    });
  }
}

async function handleAdminScheduleCreate(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const monthLabel = typeof body.monthLabel === "string" ? body.monthLabel.trim() : "";
  const dateLabel = typeof body.dateLabel === "string" ? body.dateLabel.trim() : "";
  const place = typeof body.place === "string" ? body.place.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";

  if (!monthLabel || !dateLabel || !place || !city || !time) {
    sendJson(response, 400, { error: "Preencha mes, data, igreja, cidade e horario." });
    return;
  }

  try {
    const entry = await createScheduleEntry({ monthLabel, dateLabel, place, city, time });
    sendJson(response, 200, { ok: true, entry });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar agenda."
    });
  }
}

async function handleAdminAlbumDetail(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace("/api/admin/albums/", ""));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  const albumZipLinks = await getAlbumZipLinks();
  const detail = await buildAlbumDetailResponse(product, pricing, albumZipLinks);
  sendJson(response, 200, { ok: true, album: detail });
}

async function handleAdminAlbumUpdate(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace("/api/admin/albums/", ""));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  const priceCents = Number(body.priceCents);
  const miniLibrary = buildMiniMediaLibraryPayload(await loadMiniMediaLibrary().catch(() => ({ albums: [] })), { includeExtended: true });
  const miniBacked = buildMiniBackedStoreTracks(product, miniLibrary);

  if (!Number.isInteger(priceCents) || priceCents < 0) {
    sendJson(response, 400, { error: "Preco do album invalido." });
    return;
  }

  if (!miniBacked.tracks.length && tracks.length !== product.tracks) {
    sendJson(response, 400, { error: "Quantidade de faixas invalida para este album." });
    return;
  }

  const nextTracks = miniBacked.tracks.length ? null : tracks.map((track, index) => {
    const number = index + 1;
    const type = String(track?.type || "full").trim().toLowerCase() === "playback" ? "playback" : "full";
    const playbackTrackNumber = type === "full" ? Number(track?.playbackTrackNumber) || null : null;
    const playbackTrackCode = playbackTrackNumber ? String(playbackTrackNumber).padStart(3, "0") : null;

    return {
      number,
      code: String(track?.code || number).padStart(3, "0"),
      title: typeof track?.title === "string" && track.title.trim() ? track.title.trim() : `Faixa ${String(number).padStart(3, "0")}`,
      type,
      durationSeconds: Number(track?.durationSeconds) || 0,
      publicUrl: track?.publicUrl || buildTrackUrl(product.name, number),
      playbackTrackNumber,
      playbackTrackCode,
      lyrics: typeof track?.lyrics === "string" ? track.lyrics : ""
    };
  });

  try {
    if (nextTracks) {
      await albumManifestStore.writeAlbumManifest(product.name, nextTracks);
    }

    const albumOverrides = {
      ...(pricing.albumOverrides || {}),
      [product.id]: priceCents
    };

    await saveSitePricingSettings({
      albumPriceCents: pricing.albumPriceCents,
      albumOverrides,
      planPrices: pricing.planPrices
    });

    const nextPricing = await getSitePricingSettings();
    const albumZipLinks = await getAlbumZipLinks();
    const detail = await buildAlbumDetailResponse(product, nextPricing, albumZipLinks);
    sendJson(response, 200, { ok: true, album: detail });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar album."
    });
  }
}

function canAccessAlbumZip(accessState, productId) {
  return Boolean(accessState?.canDownloadAll || accessState?.purchasedAlbumIds?.includes(productId));
}

function canManageAlbumRehearsal(accessState, productId) {
  return Boolean(accessState?.purchasedAlbumIds?.includes(productId));
}

async function handleAlbumRehearsalCodeRequest(request, response, productId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);

    if (!canManageAlbumRehearsal(accessState, product.id)) {
      sendJson(response, 403, {
        error: "Esse codigo de ensaio so pode ser criado por quem possui este album."
      });
      return;
    }

    const rehearsal = await getAlbumRehearsalCodeForOwner({
      ownerUserId: user.id,
      productId: product.id,
      createIfMissing: true
    });

    sendJson(response, 200, {
      ok: true,
      rehearsal,
      owner: {
        username: user.username || null,
        name: user.name || null
      }
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel carregar o codigo de ensaio."
    });
  }
}

async function handleAlbumRehearsalRedeemRequest(request, response, productId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "JSON invalido." });
    return;
  }

  const rehearsalCode = String(body?.rehearsalCode || "").trim().toUpperCase();
  const guestKey = String(body?.guestKey || "").trim();
  const token = parseBearerToken(request.headers.authorization);
  const user = token ? await findUserBySessionToken(token).catch(() => null) : null;

  if (!rehearsalCode) {
    sendJson(response, 400, {
      error: "Informe o codigo de ensaio."
    });
    return;
  }

  try {
    if (user) {
      const currentAccessState = await getUserAccessState(user.id);
      if (currentAccessState.canDownloadAll || currentAccessState.purchasedAlbumIds.includes(product.id) || currentAccessState.rehearsalAlbumIds?.includes(product.id)) {
        sendJson(response, 200, {
          ok: true,
          access: currentAccessState,
          redemption: {
            alreadyGranted: true,
            accessCreatedAt: null,
            remainingUses: null,
            totalUses: null,
            rehearsalCode
          }
        });
        return;
      }
    }

    const redemption = await redeemAlbumRehearsalCode({
      userId: user?.id || null,
      guestKey,
      productId: product.id,
      rehearsalCode
    });

    const accessState = user ? await getUserAccessState(user.id) : null;
    sendJson(response, 200, {
      ok: true,
      access: accessState,
      redemption
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Nao foi possivel liberar o ensaio."
    });
  }
}

async function handleAdminAlbumZipUpload(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace(/^\/api\/admin\/albums\/([^/]+)\/zip$/, "$1"));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  const providedFileName = String(request.headers["x-file-name"] || "").trim();
  const contentType = String(request.headers["content-type"] || "").trim().toLowerCase();
  const declaredBytes = Number(request.headers["content-length"] || 0);
  const safeFileName = decodeURIComponent(providedFileName || `${slugifyAlbumName(product.name)}.zip`);

  if (!safeFileName.toLowerCase().endsWith(".zip")) {
    sendJson(response, 400, { error: "Envie um arquivo .zip." });
    return;
  }

  if (declaredBytes > MAX_ALBUM_ZIP_BYTES) {
    sendJson(response, 413, { error: `Arquivo acima do limite de ${Math.round(MAX_ALBUM_ZIP_BYTES / (1024 * 1024))} MB.` });
    return;
  }

  if (
    contentType
    && contentType !== "application/zip"
    && contentType !== "application/x-zip-compressed"
    && contentType !== "multipart/x-zip"
    && contentType !== "application/octet-stream"
  ) {
    sendJson(response, 400, { error: "Use um arquivo ZIP valido." });
    return;
  }

  try {
    const fileBuffer = await readBinaryBody(request, MAX_ALBUM_ZIP_BYTES);

    if (!fileBuffer.length) {
      sendJson(response, 400, { error: "ZIP vazio." });
      return;
    }

    const r2Key = buildAlbumZipKey(product);
    const r2Client = getR2Client();

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: "application/zip",
      ContentDisposition: buildContentDisposition(`${slugifyAlbumName(product.name)}.zip`)
    }));

    const manifest = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
    const publicZipUrl = buildAlbumZipPublicUrlFromKey(r2Key);

    await saveAlbumZipLink({
      productId: product.id,
      albumName: product.name,
      zipUrl: publicZipUrl,
      sourceType: "r2"
    });

    await albumManifestStore.writeAlbumManifest(product.name, manifest.tracks, {
      albumZipUrl: publicZipUrl,
      lyricsZipUrl: manifest.lyricsZipUrl
    });

    const albumZipLinks = await getAlbumZipLinks();
    const detail = await buildAlbumDetailResponse(product, pricing, albumZipLinks);
    sendJson(response, 200, {
      ok: true,
      album: detail
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao enviar ZIP."
    });
  }
}

async function handleAdminAlbumZipLinkUpdate(request, response, pathname) {
  const user = await requireAdmin(request, response);

  if (!user) {
    return;
  }

  const productId = decodeURIComponent(pathname.replace(/^\/api\/admin\/albums\/([^/]+)\/zip-link$/, "$1"));
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const zipUrl = typeof body?.zipUrl === "string" ? body.zipUrl.trim() : "";

  if (!/^https?:\/\//i.test(zipUrl)) {
    sendJson(response, 400, { error: "Informe um link valido com http:// ou https://." });
    return;
  }

  try {
    await saveAlbumZipLink({
      productId: product.id,
      albumName: product.name,
      zipUrl,
      sourceType: "link"
    });

    const manifest = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
    await albumManifestStore.writeAlbumManifest(product.name, manifest.tracks, {
      albumZipUrl: zipUrl,
      lyricsZipUrl: manifest.lyricsZipUrl
    });

    const albumZipLinks = await getAlbumZipLinks();
    const detail = await buildAlbumDetailResponse(product, pricing, albumZipLinks);
    sendJson(response, 200, {
      ok: true,
      album: detail
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao salvar link do ZIP."
    });
  }
}

async function handleProtectedAlbumZipDownload(request, response, pathname) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  const match = pathname.match(/^\/api\/store\/products\/([^/]+)\/zip\/download$/);

  if (!match) {
    sendJson(response, 404, { error: "ZIP nao encontrado." });
    return;
  }

  const productId = decodeURIComponent(match[1]);
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

  if (!product) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);

    if (!canAccessAlbumZip(accessState, product.id)) {
      sendJson(response, 403, {
        error: "Esse ZIP so fica liberado para quem possui o album."
      });
      return;
    }

    const manifest = await albumManifestStore.readAlbumManifest(product.name, product.tracks);
    const albumZipLinks = await getAlbumZipLinks();
    const albumZipUrl = resolveAlbumZipUrl(manifest, product.id, albumZipLinks);

    if (!albumZipUrl || albumZipUrl === "[none]") {
      sendJson(response, 404, {
        error: "ZIP ainda nao disponivel para este album."
      });
      return;
    }

    const assetResponse = await fetch(albumZipUrl);

    if (!assetResponse.ok || !assetResponse.body) {
      sendJson(response, assetResponse.status || 502, {
        error: "Nao foi possivel baixar o ZIP agora."
      });
      return;
    }

    const contentType = assetResponse.headers.get("content-type") || "application/zip";
    const contentLength = assetResponse.headers.get("content-length");
    const fileName = `${slugifyAlbumName(product.name)}.zip`;

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Disposition": buildContentDisposition(fileName),
      ...(contentLength ? { "Content-Length": contentLength } : {})
    });

    Readable.fromWeb(assetResponse.body).pipe(response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao validar o ZIP."
    });
  }
}

async function handleProtectedTrackDownload(request, response, pathname) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  const match = pathname.match(/^\/api\/store\/products\/([^/]+)\/tracks\/(\d+)\/download$/);

  if (!match) {
    sendJson(response, 404, { error: "Download nao encontrado." });
    return;
  }

  const productId = decodeURIComponent(match[1]);
  const trackNumber = Number(match[2]);
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);
  const albumZipLinks = await getAlbumZipLinks();
  const detail = product ? await buildAlbumDetailResponse(product, pricing, albumZipLinks) : null;

  if (!product || !detail || !Number.isInteger(trackNumber) || trackNumber < 1 || trackNumber > detail.tracks.length) {
    sendJson(response, 404, { error: "Faixa nao encontrada." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    const hasAlbumPurchase = accessState.purchasedAlbumIds.includes(product.id);
    const track = detail.tracks.find((item) => Number(item.number) === trackNumber);

    if (!track) {
      sendJson(response, 404, { error: "Faixa nao encontrada." });
      return;
    }

    const canDownloadByPlan = canDownloadTrackForPlan(accessState.plan?.id, {
      albumName: product.name,
      trackType: track.type
    });

    if (!canDownloadByPlan && !hasAlbumPurchase) {
      sendJson(response, 403, {
        error: "Seu plano nao libera download desta faixa."
      });
      return;
    }

    const assetResponse = await fetch(getTrackDownloadUrl(track, product.name, trackNumber));

    if (!assetResponse.ok || !assetResponse.body) {
      sendJson(response, assetResponse.status || 502, {
        error: "Nao foi possivel baixar a faixa agora."
      });
      return;
    }

    const contentType = assetResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = assetResponse.headers.get("content-length");
    const fileName = `${slugifyAlbumName(product.name)}-${String(trackNumber).padStart(3, "0")}.mp3`;

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      ...(contentLength ? { "Content-Length": contentLength } : {})
    });

    Readable.fromWeb(assetResponse.body).pipe(response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao validar download."
    });
  }
}

async function handleProtectedAlbumPdfDownload(request, response, pathname) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  const match = pathname.match(/^\/api\/store\/products\/([^/]+)\/pdf\/download$/);
  if (!match) {
    sendJson(response, 404, { error: "PDF nao encontrado." });
    return;
  }

  const productId = decodeURIComponent(match[1]);
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);
  const albumZipLinks = await getAlbumZipLinks();
  const detail = product ? await buildAlbumDetailResponse(product, pricing, albumZipLinks) : null;

  if (!product || !detail) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    if (!canAccessAlbumZip(accessState, product.id)) {
      sendJson(response, 403, {
        error: "Esse PDF so fica liberado para quem possui o album."
      });
      return;
    }

    const pdfBuffer = await buildAlbumPdfBuffer(detail);
    const fileName = `${buildSafeDownloadBaseName(product.name, "Album")}.pdf`;
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": buildContentDisposition(fileName)
    });
    response.end(pdfBuffer);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar o PDF do album."
    });
  }
}

async function handleProtectedAlbumBundleDownload(request, response, pathname) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);
  if (!user) {
    return;
  }

  const match = pathname.match(/^\/api\/store\/products\/([^/]+)\/bundle\/download$/);
  if (!match) {
    sendJson(response, 404, { error: "Pacote nao encontrado." });
    return;
  }

  const productId = decodeURIComponent(match[1]);
  const pricing = await getSitePricingSettings();
  const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);
  const albumZipLinks = await getAlbumZipLinks();
  const detail = product ? await buildAlbumDetailResponse(product, pricing, albumZipLinks) : null;

  if (!product || !detail) {
    sendJson(response, 404, { error: "Album nao encontrado." });
    return;
  }

  try {
    const accessState = await getUserAccessState(user.id);
    if (!canAccessAlbumZip(accessState, product.id)) {
      sendJson(response, 403, {
        error: "Esse pacote so fica liberado para quem possui o album."
      });
      return;
    }

    const pdfBuffer = await buildAlbumPdfBuffer(detail);
    const zipBuffer = await buildAlbumBundleZipBuffer(product, detail, pdfBuffer);
    const fileName = `${buildSafeDownloadBaseName(product.name, "Album")}.zip`;
    response.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Length": zipBuffer.length,
      "Content-Disposition": buildContentDisposition(fileName)
    });
    response.end(zipBuffer);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Nao foi possivel montar o pacote do album."
    });
  }
}

async function serveStatic(response, filePath) {
  try {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const headers = { "Content-Type": contentType };
    const normalizedFilePath = filePath.replaceAll("\\", "/").toLowerCase();

    if (normalizedFilePath.endsWith("/public/debug.html")) {
      headers["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet, noimageindex";
    }

    response.writeHead(200, headers);
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Erro ao carregar arquivo.");
  }
}

async function handleAdminUsersList(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  try {
    const pricing = await getSitePricingSettings();
    const storeProducts = buildStoreProducts(pricing.albumPriceCents, pricing.albumOverrides);
    const [users, schedule] = await Promise.all([
      listUsersWithAdminData(pricing.planPrices),
      getScheduleEntries()
    ]);

    sendJson(response, 200, {
      ok: true,
      users,
      plans: buildSubscriptionPlans(pricing.planPrices),
      albums: storeProducts.map((product) => ({
        id: product.id,
        name: product.name,
        tracks: product.tracks,
        priceLabel: formatPriceFromCents(product.unitAmount)
      })),
      schedule
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar usuarios."
    });
  }
}

async function handleAdminUserPlanUpdate(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";

  try {
    if (!planId || planId === "gratis") {
      await removeUserPlanOverride(userId);
    } else {
      await setUserPlanOverride({
        userId,
        planId,
        assignedByUserId: adminUser.id
      });
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao atualizar plano do usuario."
    });
  }
}

async function handleAdminUserContractorUpdate(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    await setUserContractorStatus({
      userId,
      isContractor: Boolean(body.isContractor),
      contractorEventId: typeof body.contractorEventId === "string" ? body.contractorEventId.trim() : ""
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao atualizar contratante."
    });
  }
}

async function handleAdminUserDelete(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  if (userId === adminUser.id) {
    sendJson(response, 400, { error: "A conta administradora nao pode ser excluida por aqui." });
    return;
  }

  try {
    await deleteUserById(userId);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao excluir usuario."
    });
  }
}

async function handleAdminUserMessageSend(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const messageText = typeof body.body === "string" ? body.body.trim() : "";

  if (!title) {
    sendJson(response, 400, { error: "Informe o titulo da mensagem." });
    return;
  }

  if (!messageText) {
    sendJson(response, 400, { error: "Digite o texto da mensagem." });
    return;
  }

  if (messageText.length > 500) {
    sendJson(response, 400, { error: "A mensagem pode ter no maximo 500 caracteres." });
    return;
  }

  try {
    const message = await sendAdminUserMessage({
      userId,
      title,
      body: messageText,
      sentByUserId: adminUser.id
    });

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao enviar mensagem ao usuario."
    });
  }
}

async function handleCurrentUserMessage(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  try {
    const message = await getActiveAdminUserMessage(user.id);
    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao carregar mensagem do usuario."
    });
  }
}

async function handleCurrentUserMessageDismiss(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";

  if (!messageId) {
    sendJson(response, 400, { error: "Informe a mensagem para fechar." });
    return;
  }

  try {
    const message = await dismissAdminUserMessage({
      userId: user.id,
      messageId
    });

    if (!message) {
      sendJson(response, 404, { error: "Mensagem nao encontrada ou ja fechada." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao fechar mensagem."
    });
  }
}

async function handleCurrentUserMessageReply(request, response) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
  const replyText = typeof body.body === "string" ? body.body.trim() : "";

  if (!messageId) {
    sendJson(response, 400, { error: "Informe a mensagem para responder." });
    return;
  }

  if (!replyText) {
    sendJson(response, 400, { error: "Digite sua resposta." });
    return;
  }

  if (replyText.length > 500) {
    sendJson(response, 400, { error: "A resposta pode ter no maximo 500 caracteres." });
    return;
  }

  try {
    const message = await saveUserReplyToAdminMessage({
      userId: user.id,
      messageId,
      body: replyText
    });

    if (!message) {
      sendJson(response, 404, { error: "Mensagem nao encontrada ou indisponivel para resposta." });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      message: sanitizeAdminUserMessage(message)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao enviar resposta."
    });
  }
}

async function handleAdminUserAlbumAssign(request, response, userId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const adminUser = await requireAdmin(request, response);

  if (!adminUser) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";

  if (!productId) {
    sendJson(response, 400, { error: "Escolha um album para atribuir." });
    return;
  }

  try {
    const pricing = await getSitePricingSettings();
    const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

    if (!product) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    await assignAlbumGrantToUser({
      userId,
      productId: product.id,
      assignedByUserId: adminUser.id
    });

    sendJson(response, 200, {
      ok: true,
      product: {
        id: product.id,
        name: product.name
      }
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Erro ao atribuir album."
    });
  }
}

async function handleContractorEventUpdate(request, response, eventId) {
  if (!await ensurePaymentsReady(response)) {
    return;
  }

  const user = await requireAuth(request, response);

  if (!user) {
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const schedule = await getScheduleEntries();
    const event = schedule.find((item) => item.id === eventId);

    if (!event) {
      sendJson(response, 404, { error: "Evento nao encontrado." });
      return;
    }

    if (!isAdminUser(user) && event.contractorUserId !== user.id) {
      sendJson(response, 403, { error: "Esse evento nao esta vinculado a sua conta." });
      return;
    }

    const updatedEvent = await updateScheduleEntry({
      eventId,
      dateLabel: typeof body.dateLabel === "string" ? body.dateLabel.trim() : event.dateLabel,
      place: typeof body.place === "string" ? body.place.trim() : event.place,
      city: typeof body.city === "string" ? body.city.trim() : event.city,
      time: typeof body.time === "string" ? body.time.trim() : event.time
    });

    sendJson(response, 200, {
      ok: true,
      event: updatedEvent
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro ao atualizar evento."
    });
  }
}

async function handleEduDownload(response, pathname) {
  const match = pathname.match(/^\/downloads\/edu\/([^/]+)$/);
  const slug = match?.[1] || "";
  const fileConfig = eduDownloadFiles[slug];

  if (!fileConfig) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Download nao encontrado.");
    return;
  }

  const filePath = path.join(eduSongsDir, fileConfig.fileName);

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo nao encontrado.");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": buildContentDisposition(fileConfig.downloadName),
    "Cache-Control": "public, max-age=3600"
  });

  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const { pathname } = requestUrl;

  applyCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "turma-do-printy-api",
      date: new Date().toISOString(),
      env: {
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasStripeKey: Boolean(STRIPE_SECRET_KEY),
        hasStripeWebhookSecret: Boolean(STRIPE_WEBHOOK_SECRET),
        contentBaseUrl: CONTENT_BASE_URL,
        model: OPENAI_MODEL,
        instantModel: OPENAI_INSTANT_MODEL,
        transcribeModel: OPENAI_TRANSCRIBE_MODEL,
        stripeEnvironment: getStripeEnvironment()
      }
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/db/health") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        ok: false,
        error: "DATABASE_URL nao configurada."
      });
      return;
    }

    try {
      const result = await query("select now() as now");
      sendJson(response, 200, {
        ok: true,
        now: result.rows[0].now
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao conectar no banco."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/albums") {
    sendJson(response, 200, {
      items: getAlbumPayload(),
      total: albums.length
    });
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/albums/")) {
    const albumName = decodeURIComponent(pathname.replace("/api/albums/", ""));
    const album = albums.find((item) => item.name === albumName);

    if (!album) {
      sendJson(response, 404, { error: "Album nao encontrado." });
      return;
    }

    sendJson(response, 200, {
      ...album,
      coverUrl: buildCoverUrl(album.name),
      tracks: Array.from({ length: album.tracks }, (_, index) => {
        const number = index + 1;

        return {
          number,
          label: `Faixa ${String(number).padStart(3, "0")}`,
          url: buildTrackUrl(album.name, number)
        };
      })
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/site/config") {
    await handleSiteConfigRequest(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/proposta2026/assets") {
    try {
      const assets = await listPublicR2AssetsByPrefix("Proposta/");
      const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
      const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);
      const images = assets.filter((asset) => imageExtensions.has(asset.extension));
      const videos = assets.filter((asset) => videoExtensions.has(asset.extension));

      sendJson(response, 200, {
        ok: true,
        prefix: "Proposta/",
        images,
        videos,
        total: assets.length
      });
    } catch (error) {
      sendJson(response, 200, {
        ok: false,
        prefix: "Proposta/",
        images: [],
        videos: [],
        total: 0,
        error: error instanceof Error ? error.message : "Nao foi possivel listar os arquivos da proposta."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/downloads/edu/")) {
    await handleEduDownload(response, pathname);
    return;
  }

  if (request.method === "GET" && pathname === "/api/store/products") {
    const [pricing, albumZipLinks] = await Promise.all([
      getSitePricingSettings(),
      getAlbumZipLinks()
    ]);
    const storeProducts = await buildStoreProductsResponse(pricing, albumZipLinks);
    sendJson(response, 200, {
      items: storeProducts,
      total: storeProducts.length
    });
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/store\/products\/[^/]+\/tracks\/\d+\/generate-texts$/)) {
    const generateTextsMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/tracks\/(\d+)\/generate-texts$/);
    await handleStoreTrackTextsGenerateRequest(
      request,
      response,
      decodeURIComponent(generateTextsMatch?.[1] || ""),
      Number(generateTextsMatch?.[2] || 0)
    );
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/store\/products\/[^/]+\/rehearsal-code$/)) {
    const rehearsalMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/rehearsal-code$/);
    await handleAlbumRehearsalCodeRequest(request, response, decodeURIComponent(rehearsalMatch?.[1] || ""));
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/store\/products\/[^/]+\/rehearsal-enter$/)) {
    const rehearsalEnterMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/rehearsal-enter$/);
    await handleAlbumRehearsalRedeemRequest(request, response, decodeURIComponent(rehearsalEnterMatch?.[1] || ""));
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/store/products/")) {
    const albumZipDownloadMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/zip\/download$/);
    const albumPdfDownloadMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/pdf\/download$/);
    const albumBundleDownloadMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/bundle\/download$/);
    const trackDownloadMatch = pathname.match(/^\/api\/store\/products\/([^/]+)\/tracks\/(\d+)\/download$/);

    if (albumZipDownloadMatch) {
      await handleProtectedAlbumZipDownload(request, response, pathname);
      return;
    }

    if (albumPdfDownloadMatch) {
      await handleProtectedAlbumPdfDownload(request, response, pathname);
      return;
    }

    if (albumBundleDownloadMatch) {
      await handleProtectedAlbumBundleDownload(request, response, pathname);
      return;
    }

    if (trackDownloadMatch) {
      await handleProtectedTrackDownload(request, response, pathname);
      return;
    }

    const productId = decodeURIComponent(pathname.replace("/api/store/products/", ""));
    const pricing = await getSitePricingSettings();
    const product = findStoreProductById(productId, pricing.albumPriceCents, pricing.albumOverrides);

    if (!product) {
      sendJson(response, 404, { error: "Produto nao encontrado." });
      return;
    }

    const albumZipLinks = await getAlbumZipLinks();
    sendJson(response, 200, await buildAlbumDetailResponse(product, pricing, albumZipLinks));
    return;
  }

  if (request.method === "POST" && pathname === "/api/gpt/ask") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleGptRequest(request, response, user);
    return;
  }

  if (request.method === "POST" && pathname === "/api/audio/transcribe") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleAudioTranscription(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/escrever/paragraphs") {
    await handleEscreverParagraphsList(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/escrever/paragraphs") {
    await handleEscreverParagraphCreate(request, response);
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/escrever\/paragraphs\/[^/]+$/)) {
    const paragraphId = decodeURIComponent(pathname.replace(/^\/api\/escrever\/paragraphs\/([^/]+)$/, "$1"));
    await handleEscreverParagraphDelete(request, response, paragraphId);
    return;
  }

  if (request.method === "POST" && pathname === "/api/audio/speak") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleAudioSpeech(request, response, user);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/texts/organize") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleProject200TextOrganize(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/finance/interpret") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleProject200FinanceInterpret(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/finance/personal") {
    await handleProject200PersonalFinanceRequest(request, response);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/200/finance/notes") {
    await handleProject200PersonalFinanceNotesUpdate(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/extra-goals") {
    await handleExtraGoalsListRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/extra-goals") {
    await handleExtraGoalCreateRequest(request, response);
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/200\/extra-goals\/[^/]+\/progress$/)) {
    const goalId = pathname.replace(/^\/api\/200\/extra-goals\/([^/]+)\/progress$/, "$1");
    await handleExtraGoalProgressRequest(request, response, goalId);
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/200\/extra-goals\/[^/]+$/)) {
    const goalId = pathname.replace(/^\/api\/200\/extra-goals\/([^/]+)$/, "$1");
    await handleExtraGoalUpdateRequest(request, response, goalId);
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/200\/extra-goals\/[^/]+$/)) {
    const goalId = pathname.replace(/^\/api\/200\/extra-goals\/([^/]+)$/, "$1");
    await handleExtraGoalDeleteRequest(request, response, goalId);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/actions/interpret") {
    const user = await requireAuth(request, response);

    if (!user) {
      return;
    }

    await handleProject200ActionInterpret(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/actions/categorize") {
    const user = await requireAuth(request, response);
    if (!user) {
      return;
    }
    await handleProject200ActionCategorize(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/svg-icons/suggest") {
    const user = await requireAuth(request, response);
    if (!user) {
      return;
    }
    await handleProject200SvgSuggest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/aulas/gerar") {
    await handleMiniLessonPlanGenerate(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/docs/all-docs") {
    await handleMiniDocumentRequest(request, response);
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/mini\/docs\/all-docs\/lines\/\d+$/)) {
    const lineNumber = Number(pathname.replace(/^\/api\/mini\/docs\/all-docs\/lines\/(\d+)$/, "$1")) || 1;
    await handleMiniDocumentLineUpdateRequest(request, response, lineNumber);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/docs/all-docs/insert") {
    await handleMiniDocumentInsertRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/docs/all-docs/rewrite") {
    await handleMiniDocumentRewriteRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/media") {
    await handleMiniMediaLibraryRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/media/image-models") {
    await handleMiniMediaImageModelsRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/media/albums") {
    await handleMiniMediaAlbumCreateRequest(request, response);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/characters/")) {
    const match = pathname.match(/^\/api\/mini\/media\/albums\/([^/]+)\/characters\/([^/]+)$/);
    await handleMiniMediaAlbumCharacterDeleteRequest(
      request,
      response,
      decodeURIComponent(match?.[1] || ""),
      decodeURIComponent(match?.[2] || "")
    );
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/media/albums/") && !pathname.includes("/tracks/") && !pathname.includes("/characters/") && !pathname.endsWith("/characters") && !pathname.endsWith("/cover") && !pathname.endsWith("/cover/generate")) {
    const albumId = decodeURIComponent(pathname.replace("/api/mini/media/albums/", ""));
    await handleMiniMediaAlbumDeleteRequest(request, response, albumId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/media/albums/") && pathname.endsWith("/cover/generate")) {
    const albumId = decodeURIComponent(pathname.replace("/api/mini/media/albums/", "").replace(/\/cover\/generate$/, ""));
    await handleMiniMediaAlbumCoverGenerateRequest(request, response, albumId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/media/albums/") && pathname.endsWith("/characters")) {
    const albumId = decodeURIComponent(pathname.replace("/api/mini/media/albums/", "").replace(/\/characters$/, ""));
    await handleMiniMediaAlbumCharacterCreateRequest(request, response, albumId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/media/albums/") && pathname.endsWith("/characters")) {
    const albumId = decodeURIComponent(pathname.replace("/api/mini/media/albums/", "").replace(/\/characters$/, ""));
    await handleMiniMediaAlbumCharacterDeleteRequest(request, response, albumId, "__all__");
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/media/albums/") && pathname.endsWith("/cover")) {
    const albumId = decodeURIComponent(pathname.replace("/api/mini/media/albums/", "").replace(/\/cover$/, ""));
    await handleMiniMediaAlbumCoverUploadRequest(request, response, albumId);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.endsWith("/lyrics")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").replace(/\/lyrics$/, "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaTrackLyricsRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.endsWith("/lyrics")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").replace(/\/lyrics$/, "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaTrackLyricsUpdateRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.includes("/lyrics/lines/") && pathname.endsWith("/character")) {
    const match = pathname.match(/^\/api\/mini\/media\/albums\/([^/]+)\/tracks\/([^/]+)\/lyrics\/lines\/(\d+)\/character$/);
    await handleMiniMediaTrackLineCharacterUpdateRequest(
      request,
      response,
      decodeURIComponent(match?.[1] || ""),
      decodeURIComponent(match?.[2] || ""),
      Number(match?.[3] || 0)
    );
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.endsWith("/assets")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").replace(/\/assets$/, "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaSongAssetsRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.endsWith("/assets/scores")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").replace(/\/assets\/scores$/, "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaScoreUploadRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.endsWith("/playback")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").replace(/\/playback$/, "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaPlaybackUploadRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/") && pathname.includes("/assets/")) {
    const withoutPrefix = pathname.replace("/api/mini/media/albums/", "");
    const [albumPart, trackAndAssetPart] = withoutPrefix.split("/tracks/");
    const [trackPart, assetPart] = String(trackAndAssetPart || "").split("/assets/");
    await handleMiniMediaSongAssetDeleteRequest(
      request,
      response,
      decodeURIComponent(albumPart || ""),
      decodeURIComponent(trackPart || ""),
      decodeURIComponent(assetPart || "")
    );
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaTrackUpdateRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaTrackUploadRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/media/albums/") && pathname.includes("/tracks/")) {
    const parts = pathname.replace("/api/mini/media/albums/", "").split("/tracks/");
    const albumId = decodeURIComponent(parts[0] || "");
    const trackId = decodeURIComponent(parts[1] || "");
    await handleMiniMediaTrackDeleteRequest(request, response, albumId, trackId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/courses") {
    await handleMiniCoursesListRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/courses/summary") {
    await handleMiniCoursesSummaryRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/courses/jobs") {
    await handleMiniCourseJobsListRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/courses/jobs/") && pathname.endsWith("/debug")) {
    const jobId = decodeURIComponent(pathname.replace("/api/mini/courses/jobs/", "").replace(/\/debug$/, ""));
    await handleMiniCourseJobDebugDownloadRequest(request, response, jobId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/courses/models") {
    await handleMiniCourseModelsRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/courses/plan") {
    await handleMiniCoursePlanPreviewRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/courses/generate") {
    await handleMiniCourseGenerateRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/quiz/generate")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/quiz\/generate$/, ""));
    await handleMiniCourseQuizGenerateRequest(request, response, courseId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/quiz/submit")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/quiz\/submit$/, ""));
    await handleMiniCourseQuizSubmitRequest(request, response, courseId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/cover/generate")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/cover\/generate$/, ""));
    await handleMiniCourseCoverGenerateRequest(request, response, courseId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/cover")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/cover$/, ""));
    await handleMiniCourseCoverUploadRequest(request, response, courseId);
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/visibility")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/visibility$/, ""));
    await handleMiniCourseVisibilityRequest(request, response, courseId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/courses/")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", ""));
    if (courseId && !courseId.includes("/")) {
      await handleMiniCourseDeleteRequest(request, response, courseId);
      return;
    }
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/courses/")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", ""));
    if (courseId && !courseId.includes("/")) {
      await handleMiniCourseDetailRequest(request, response, courseId);
      return;
    }
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/start")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/start$/, ""));
    await handleMiniCourseStartRequest(request, response, courseId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/courses/") && pathname.endsWith("/progress")) {
    const courseId = decodeURIComponent(pathname.replace("/api/mini/courses/", "").replace(/\/progress$/, ""));
    await handleMiniCourseProgressRequest(request, response, courseId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/plans") {
    await handleMiniLessonPlansListRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/plans") {
    await handleMiniLessonPlansCreateRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/plans/")) {
    const planId = decodeURIComponent(pathname.replace("/api/mini/plans/", ""));
    await handleMiniLessonPlanDetailRequest(request, response, planId);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/mini/plans/")) {
    const planId = decodeURIComponent(pathname.replace("/api/mini/plans/", ""));
    await handleMiniLessonPlanUpdateRequest(request, response, planId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/mini/plans/")) {
    const planId = decodeURIComponent(pathname.replace("/api/mini/plans/", ""));
    await handleMiniLessonPlanDeleteRequest(request, response, planId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/mini/chats") {
    await handleMiniChatsListRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/mini/chats") {
    await handleMiniChatsCreateRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/mini/chats/")) {
    const chatId = decodeURIComponent(pathname.replace("/api/mini/chats/", ""));
    await handleMiniChatDetailRequest(request, response, chatId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/mini/chats/") && pathname.endsWith("/messages")) {
    const chatId = decodeURIComponent(pathname.replace("/api/mini/chats/", "").replace(/\/messages$/, ""));
    await handleMiniChatMessageRequest(request, response, chatId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/account/access") {
    await handleAccessStateRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/checkout" || pathname === "/api/payments/pagbank/checkout")) {
    await handleStripeCheckoutRequest(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/payments/stripe/checkout/confirm") {
    await handleStripeCheckoutConfirmationRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/subscription-checkout" || pathname === "/api/payments/pagbank/subscription-checkout")) {
    await handleStripeSubscriptionCheckoutRequest(request, response);
    return;
  }

  if (request.method === "POST" && (pathname === "/api/payments/stripe/webhook" || pathname === "/api/payments/pagbank/webhook")) {
    await handleStripeWebhook(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        error: "DATABASE_URL nao configurada.",
        hint: "Configure o Postgres e rode o SQL de inicializacao."
      });
      return;
    }

    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2) {
      sendJson(response, 400, { error: "Nome invalido." });
      return;
    }

    if (!isValidUsername(username)) {
      sendJson(response, 400, { error: "Use um nome de usuario com 3 a 24 caracteres, incluindo letras com acento, numeros, espacos, ponto, tracinho ou underline." });
      return;
    }

    if (password.length < 6) {
      sendJson(response, 400, { error: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    try {
      const existingUser = await findUserByUsername(username);

      if (existingUser) {
        sendJson(response, 409, { error: "Esse nome de usuario ja esta em uso." });
        return;
      }

      const user = await createUser({ name, username, password });
      const session = await createSession(user.id);

      sendJson(response, 201, {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: sanitizeUser(user)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao criar usuario."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/verify-code") {
    sendJson(response, 410, {
      error: "A confirmacao por email esta pausada nesta versao."
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    if (!hasDatabase()) {
      sendJson(response, 503, {
        error: "DATABASE_URL nao configurada.",
        hint: "Configure o Postgres e rode o SQL de inicializacao."
      });
      return;
    }

    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidUsername(username) || !password) {
      sendJson(response, 400, { error: "Nome de usuario e senha sao obrigatorios." });
      return;
    }

    try {
      const user = await findUserByUsername(username);

      if (!user) {
        sendJson(response, 401, { error: "Credenciais invalidas." });
        return;
      }

      const passwordMatches = await verifyPassword(password, user.password_hash);

      if (!passwordMatches) {
        sendJson(response, 401, { error: "Credenciais invalidas." });
        return;
      }

      const session = await createSession(user.id);

      sendJson(response, 200, {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: sanitizeUser(user)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao fazer login."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/terms") {
    await handleCreateTerm(request, response);
    return;
  }

  if ((request.method === "GET" || request.method === "POST") && pathname.match(/^\/api\/200\/extra-goals\/[^/]+\/variants$/)) {
    const goalId = pathname.replace(/^\/api\/200\/extra-goals\/([^/]+)\/variants$/, "$1");
    await handleExtraGoalVariantsRequest(request, response, goalId);
    return;
  }

  if ((request.method === "PATCH" || request.method === "DELETE") && pathname.match(/^\/api\/200\/extra-goals\/[^/]+\/variants\/[^/]+$/)) {
    const match = pathname.match(/^\/api\/200\/extra-goals\/([^/]+)\/variants\/([^/]+)$/);
    await handleExtraGoalVariantsRequest(request, response, match[1], match[2]);
    return;
  }

  if (request.method === "GET" && pathname === "/api/contractor-panel") {
    await handleGetContractorPanel(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/all-terms") {
    await handleListAllTerms(request, response);
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/all-terms") {
    await handleDeleteAllTerms(response);
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/all-terms\/[^/]+$/)) {
    const termId = decodeURIComponent(pathname.replace(/^\/api\/all-terms\/([^/]+)$/, "$1"));
    await handleDeleteOneTerm(response, termId);
    return;
  }

  if (request.method === "GET" && pathname.match(/^\/api\/terms\/[^/]+\/pdf$/)) {
    const termId = decodeURIComponent(pathname.replace(/^\/api\/terms\/([^/]+)\/pdf$/, "$1"));
    await handleTermPdfDownload(response, termId);
    return;
  }

  if (request.method === "POST" && pathname === "/api/terms/checkout") {
    await handleTermStripeCheckout(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const contractorState = await getUserContractorState(user.id);
      const project200Profile = await getProject200AssignedProfile(user.id);

      sendJson(response, 200, {
        ok: true,
        user: sanitizeUser({
          ...user,
          is_contractor: contractorState.isContractor,
          contractor_event_id: contractorState.contractorEventId,
          project200_profile: project200Profile || null
        })
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao validar sessao."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/users/lookup") {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const rawInput = String(requestUrl.searchParams.get("username") || "")
        .normalize("NFC")
        .replace(/\s+/gu, " ")
        .trim();

      if (!rawInput || rawInput.length < 2) {
        sendJson(response, 400, { error: "Informe um nome de usuário válido." });
        return;
      }

      const normalized = rawInput.toLocaleLowerCase("pt-BR");
      const searchResult = await query(
        `
          select id, name, username, created_at
          from users
          where username = $1
             or lower(regexp_replace(coalesce(name, ''), '\\s+', ' ', 'g')) = $2
             or username ilike $3
             or name ilike $3
          order by
            case
              when username = $1 then 0
              when lower(regexp_replace(coalesce(name, ''), '\\s+', ' ', 'g')) = $2 then 1
              else 2
            end,
            created_at asc
          limit 1
        `,
        [normalized, normalized, `%${rawInput}%`]
      );
      const targetUser = searchResult.rows[0] || null;

      if (!targetUser) {
        sendJson(response, 404, { error: "Usuário não encontrado no banco principal." });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          name: targetUser.name || targetUser.username
        }
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao buscar usuário."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/friends") {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const scope = String(requestUrl.searchParams.get("scope") || "today").trim().toLowerCase();
      const snapshot = await getProject200FriendsSnapshot(authUser.id, scope);
      sendJson(response, 200, { ok: true, ...snapshot });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar os amigos."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/friends/invite") {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const body = await readJsonBody(request);
      const targetUserId = String(body?.targetUserId || "").trim();
      if (!targetUserId) {
        sendJson(response, 400, { error: "Informe o usuario do convite." });
        return;
      }

      const result = await createProject200FriendInvite(authUser.id, targetUserId);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel enviar o convite."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/200\/friends\/[^/]+\/accept$/)) {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const friendshipId = decodeURIComponent(pathname.replace(/^\/api\/200\/friends\/([^/]+)\/accept$/, "$1"));
      const result = await acceptProject200FriendInvite(authUser.id, friendshipId);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel aceitar o convite."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/200\/friends\/[^/]+\/reject$/)) {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const friendshipId = decodeURIComponent(pathname.replace(/^\/api\/200\/friends\/([^/]+)\/reject$/, "$1"));
      const result = await rejectProject200FriendInvite(authUser.id, friendshipId);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel recusar o convite."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/profile-links") {
    try {
      const authUser = await requireAuth(request, response);

      if (!authUser) {
        return;
      }

      const body = await readJsonBody(request);
      const usernameInput = String(body.username || "")
        .normalize("NFC")
        .replace(/\s+/gu, " ")
        .trim();
      const assignedProfile = await resolveProject200ProfileName(authUser.id, body.profile, { fallbackToDefault: false });

      if (!usernameInput || usernameInput.length < 2) {
        sendJson(response, 400, { error: "Nome de usuário inválido." });
        return;
      }
      const targetUser = await findUserByUsernameOrNameInput(usernameInput);

      if (!targetUser) {
        sendJson(response, 404, { error: "Usuário não encontrado no banco principal." });
        return;
      }

      await ensureProject200ProfileLinksSchema();
      await query(
        `
          insert into project200_profile_links (user_id, assigned_profile, assigned_by_user_id, created_at, updated_at)
          values ($1, $2, $3, now(), now())
          on conflict (user_id) do update
          set assigned_profile = excluded.assigned_profile,
              assigned_by_user_id = excluded.assigned_by_user_id,
              updated_at = now()
        `,
        [targetUser.id, assignedProfile, authUser.id]
      );

      sendJson(response, 200, {
        ok: true,
        link: {
          userId: targetUser.id,
          username: targetUser.username,
          name: targetUser.name || targetUser.username,
          profile: assignedProfile
        }
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao salvar vínculo."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/profiles") {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const profiles = await listProject200Profiles(authUser.id);
      sendJson(response, 200, { ok: true, profiles });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Erro ao carregar usuários."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/profiles") {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const body = await readJsonBody(request);
      const profile = await createProject200Profile(authUser.id, body);
      sendJson(response, 201, { ok: true, profile });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Erro ao criar usuário."
      });
    }
    return;
  }

  if ((request.method === "PUT" || request.method === "PATCH") && pathname.startsWith("/api/200/profiles/")) {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const profileId = decodeURIComponent(pathname.slice("/api/200/profiles/".length));
      const body = await readJsonBody(request);
      const profile = await updateProject200ProfileName(authUser.id, profileId, body);
      sendJson(response, 200, { ok: true, profile });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Erro ao atualizar usuario."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/profiles/reassign") {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const body = await readJsonBody(request);
      const summary = await reassignProject200ProfileTasks(authUser.id, body);
      sendJson(response, 200, { ok: true, summary });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Erro ao copiar tarefas."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/200/profiles/") && pathname.endsWith("/avatar/generate")) {
    const profileId = decodeURIComponent(
      pathname.slice("/api/200/profiles/".length, pathname.length - "/avatar/generate".length)
    );
    await handleProject200ProfileAvatarGenerateRequest(request, response, profileId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/200/profiles/") && pathname.endsWith("/svg-icon/suggest")) {
    const profileId = decodeURIComponent(
      pathname.slice("/api/200/profiles/".length, pathname.length - "/svg-icon/suggest".length)
    );
    await handleProject200ProfileSvgSuggestRequest(request, response, profileId);
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/200/profiles/") && pathname.endsWith("/avatar/upload")) {
    const profileId = decodeURIComponent(
      pathname.slice("/api/200/profiles/".length, pathname.length - "/avatar/upload".length)
    );
    await handleProject200ProfileAvatarUploadRequest(request, response, profileId);
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/200/profiles/")) {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const profileId = decodeURIComponent(pathname.slice("/api/200/profiles/".length));
      const result = await deleteProject200Profile(authUser.id, profileId);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Erro ao excluir usuário."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/export") {
    try {
      const authUser = await requireAuth(request, response);
      if (!authUser) {
        return;
      }

      const body = await readJsonBody(request);
      const usernameInput = String(body?.username || "").trim();
      if (!usernameInput) {
        sendJson(response, 400, { error: "Digite o nome de usuário da conta destino." });
        return;
      }

      const targetUser = await findUserByUsernameOrNameInput(usernameInput);
      if (!targetUser) {
        sendJson(response, 404, { error: "Usuário destino não encontrado." });
        return;
      }

      if (String(targetUser.id || "") === String(authUser.id || "")) {
        sendJson(response, 400, { error: "Escolha outra conta para exportar." });
        return;
      }

      const summary = await exportProject200DataToUser({
        sourceUserId: authUser.id,
        targetUserId: targetUser.id
      });

      sendJson(response, 200, {
        ok: true,
        targetUser: {
          id: targetUser.id,
          username: targetUser.username || null,
          name: targetUser.name || targetUser.username || "Usuário"
        },
        summary
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Não foi possível exportar os dados do /200."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/actions") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actions = await listUserActions(user.id, {
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to")
      });

      sendJson(response, 200, { ok: true, actions, serverNow: new Date().toISOString() });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel listar as acoes."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/history") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      await ensureProject200HistorySchema();
      const history = await listProject200History(user.id, {
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to")
      });
      sendJson(response, 200, { ok: true, ...history });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar historico."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/runtime-state") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const runtimeState = await getProject200RuntimeState(user.id);
      sendJson(response, 200, { ok: true, runtimeState });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar o estado atual."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/music/stations") {
    try {
      const user = await getOptionalAuthUser(request);
      const stations = await listProject200MusicStations();
      if (user) {
        await ensureProject200MusicSchema();
        const personalized = await getProject200MusicStationsForUser({ userId: user.id, stations });
        sendJson(response, 200, { ok: true, ...personalized });
        return;
      }
      sendJson(response, 200, { ok: true, stations, preferences: { favoriteTrackUrls: [], defaults: [] } });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar as estacoes."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/music/favorites") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const result = await toggleProject200MusicFavorite({
        userId: user.id,
        stationName: body.stationName,
        trackName: body.trackName,
        trackUrl: body.trackUrl,
        favorite: body.favorite
      });

      const stations = await listProject200MusicStations();
      const personalized = await getProject200MusicStationsForUser({ userId: user.id, stations });
      sendJson(response, 200, { ok: true, ...personalized, favoriteTrackUrls: result.favoriteTrackUrls });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar favorito."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/music/default") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const result = await setProject200MusicTaskDefault({
        userId: user.id,
        taskTitle: body.taskTitle,
        mode: body.mode,
        stationName: body.stationName,
        trackName: body.trackName,
        trackUrl: body.trackUrl
      });
      await setActionMusicDefaultByTitle(user.id, body.taskTitle, {
        mode: body.mode,
        stationName: body.stationName,
        trackName: body.trackName,
        trackUrl: body.trackUrl
      });

      const stations = await listProject200MusicStations();
      const personalized = await getProject200MusicStationsForUser({ userId: user.id, stations });
      sendJson(response, 200, { ok: true, ...personalized, defaults: result.defaults });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar o padrão."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/history/system") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      await ensureProject200HistorySchema();
      const body = await readJsonBody(request);
      const event = await createProject200SystemEvent(user.id, body);
      sendJson(response, 201, { ok: true, event });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar evento do historico."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/history/text") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      await ensureProject200HistorySchema();
      const body = await readJsonBody(request);
      const entry = await createProject200TextEntry(user.id, body);
      sendJson(response, 201, { ok: true, entry });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar texto do historico."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/constitution/versions") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const versions = await listConstitutionVersions(user.id);
      sendJson(response, 200, { ok: true, versions });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar a constituicao."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/constitution/versions") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const versionId = await createConstitutionVersion(user.id, body?.text);
      const versions = await listConstitutionVersions(user.id);
      sendJson(response, 201, { ok: true, versionId, versions });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar a versao da constituicao."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/constitution\/versions\/[^/]+\/approve$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const versionId = decodeURIComponent(pathname.replace(/^\/api\/constitution\/versions\/([^/]+)\/approve$/, "$1"));
      const body = await readJsonBody(request);
      await approveConstitutionVersion(user.id, versionId, body?.approver);
      const versions = await listConstitutionVersions(user.id);
      sendJson(response, 200, { ok: true, versions });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel registrar aprovacao."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/platform/entries") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const entries = await listPlatformFinanceByRange(user.id, {
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to")
      });

      sendJson(response, 200, { ok: true, entries });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel listar os lancamentos."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/platform/summary") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const summary = await summarizePlatformFinanceMonth(user.id, requestUrl.searchParams.get("date") || new Date().toISOString());
      sendJson(response, 200, { ok: true, summary });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel resumir as financas."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/stats/summary") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const summary = await getStatsSummary(user.id, requestUrl.searchParams.get("scope"));
      sendJson(response, 200, { ok: true, summary });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar estatisticas."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/stats/goals") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const goals = await getStatsGoals(user.id);
      sendJson(response, 200, { ok: true, goals });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar metas."
      });
    }
    return;
  }

  if (request.method === "PUT" && pathname === "/api/stats/goals") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const goals = await updateStatsGoals(user.id, body);
      sendJson(response, 200, { ok: true, goals });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar metas."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/stats-aspects") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const profile = requestUrl.searchParams.get("profile") || PROJECT200_DEFAULT_PROFILE_NAME;
      const config = await getProject200StatsAspectConfig(user.id, profile);
      sendJson(response, 200, { ok: true, config });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar as configuracoes das metricas."
      });
    }
    return;
  }

  if ((request.method === "PUT" || request.method === "PATCH") && pathname.startsWith("/api/200/stats-aspects/")) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const categoryId = decodeURIComponent(pathname.slice("/api/200/stats-aspects/".length));
      const body = await readJsonBody(request);
      const profile = body?.profile || PROJECT200_DEFAULT_PROFILE_NAME;
      const config = await updateProject200StatsAspectConfig(user.id, profile, categoryId, {
        targetMinutes: body?.targetMinutes,
        missionGoalIds: body?.missionGoalIds
      });
      sendJson(response, 200, { ok: true, config });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes das metricas."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/sleep-history") {
    try {
      const user = await requireAuth(request, response);
      if (!user) return;
      const entries = await listProject200SleepHistory(user.id, {
        profileName: requestUrl.searchParams.get("profile") || PROJECT200_DEFAULT_PROFILE_NAME,
        limit: 7
      });
      sendJson(response, 200, { ok: true, entries });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Nao foi possivel carregar o histórico de sono." });
    }
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/200\/sleep-history\/\d{4}-\d{2}-\d{2}$/)) {
    try {
      const user = await requireAuth(request, response);
      if (!user) return;
      const body = await readJsonBody(request);
      const entry = await updateProject200SleepHistoryEntry(user.id, {
        profileName: body?.profile || PROJECT200_DEFAULT_PROFILE_NAME,
        sleepDate: pathname.split("/").pop(),
        totalMinutes: body?.totalMinutes
      });
      sendJson(response, 200, { ok: true, entry });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Nao foi possivel atualizar o sono." });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/200/sleep-session") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const profile = requestUrl.searchParams.get("profile") || PROJECT200_DEFAULT_PROFILE_NAME;
      const session = await getProject200SleepSession(user.id, profile);
      sendJson(response, 200, { ok: true, session });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar a sessão de sono."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/sleep-session/start") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const session = await startProject200SleepSession(user.id, {
        profileName: body?.profile || PROJECT200_DEFAULT_PROFILE_NAME,
        delayMinutes: body?.delayMinutes
      });
      sendJson(response, 200, { ok: true, session });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel iniciar o sono."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/sleep-session/finish") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const result = await finishProject200SleepSession(user.id, {
        profileName: body?.profile || PROJECT200_DEFAULT_PROFILE_NAME,
        completedAt: body?.completedAt
      });
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel encerrar o sono."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/200/sleep-session/abort") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const result = await abortProject200SleepSession(user.id, {
        profileName: body?.profile || PROJECT200_DEFAULT_PROFILE_NAME
      });
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel abortar o sono."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/platform/entries") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const entry = await createPlatformFinanceEntry(user.id, body);

      sendJson(response, 201, { ok: true, entry });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel criar lancamento."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/platform/balance/add") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const balanceCents = await addPlatformBalance(user.id, body?.amountCents);
      sendJson(response, 200, {
        ok: true,
        balanceCents
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel adicionar saldo."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/platform\/occurrences\/[^/]+\/pay$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const occurrenceId = decodeURIComponent(pathname.replace(/^\/api\/platform\/occurrences\/([^/]+)\/pay$/, "$1"));
      const result = await payPlatformOccurrence(user.id, occurrenceId);
      sendJson(response, 200, {
        ok: true,
        result
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel confirmar o lanÃ§amento."
      });
    }
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/platform\/entries\/[^/]+$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const entryId = decodeURIComponent(pathname.replace(/^\/api\/platform\/entries\/([^/]+)$/, "$1"));
      const result = await deletePlatformFinanceEntry(user.id, entryId);

      sendJson(response, result.deleted ? 200 : 404, {
        ok: Boolean(result.deleted),
        deleted: result.deleted
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel excluir lancamento."
      });
    }
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/platform\/occurrences\/[^/]+$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const occurrenceId = decodeURIComponent(pathname.replace(/^\/api\/platform\/occurrences\/([^/]+)$/, "$1"));
      const result = await deletePlatformOccurrence(user.id, occurrenceId);
      sendJson(response, result.deleted ? 200 : 404, {
        ok: Boolean(result.deleted),
        deleted: result.deleted
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel excluir lancamento."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/platform/entries/delete-by-filter") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const result = await deletePlatformOccurrencesByFilter(user.id, {
        from: body?.from,
        to: body?.to,
        kind: body?.kind
      });

      sendJson(response, 200, {
        ok: true,
        result
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel apagar os lanÃ§amentos."
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/actions") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const actions = await createUserAction(user.id, body);

      sendJson(response, 201, { ok: true, actions });
    } catch (error) {
      const isOverlap = error?.code === "ACTION_OVERLAP";
      sendJson(response, isOverlap ? 409 : 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel salvar a acao.",
        code: isOverlap ? "ACTION_OVERLAP" : undefined,
        overlaps: isOverlap && Array.isArray(error?.overlaps) ? error.overlaps : undefined
      });
    }
    return;
  }

  if (request.method === "POST" && pathname === "/api/actions/quick-start") {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const body = await readJsonBody(request);
      const action = await createQuickUserAction(user.id, body);

      sendJson(response, 201, { ok: true, action });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel iniciar a tarefa rapida."
      });
    }
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/actions\/[^/]+$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actionId = decodeURIComponent(pathname.replace(/^\/api\/actions\/([^/]+)$/, "$1"));
      const result = await deleteUserAction(user.id, actionId);

      sendJson(response, result.deleted ? 200 : 404, {
        ok: Boolean(result.deleted),
        deleted: result.deleted
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel excluir a acao."
      });
    }
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/actions\/[^/]+$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actionId = decodeURIComponent(pathname.replace(/^\/api\/actions\/([^/]+)$/, "$1"));
      const body = await readJsonBody(request);
      const action = await updateUserAction(user.id, actionId, body);

      sendJson(response, action ? 200 : 404, {
        ok: Boolean(action),
        action
      });
    } catch (error) {
      const isOverlap = error?.code === "ACTION_OVERLAP";
      sendJson(response, isOverlap ? 409 : 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar a acao.",
        code: isOverlap ? "ACTION_OVERLAP" : undefined,
        overlaps: isOverlap && Array.isArray(error?.overlaps) ? error.overlaps : undefined
      });
    }
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/actions\/[^/]+\/status$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actionId = decodeURIComponent(pathname.replace(/^\/api\/actions\/([^/]+)\/status$/, "$1"));
      const beforeAction = await getUserActionById(user.id, actionId);
      const action = await updateUserActionStatus(user.id, actionId);
      const pointsResult = await syncProject200ActionPoints(user.id, beforeAction, action);

      sendJson(response, action ? 200 : 404, {
        ok: Boolean(action),
        action,
        pointsAwarded: pointsResult.pointsAwarded,
        pointsUpdate: pointsResult.pointsUpdate
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar o status da tarefa.",
        code: String(error?.code || "").trim(),
        runningAction: error?.runningAction || null
      });
    }
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/actions\/[^/]+\/status\/manual$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actionId = decodeURIComponent(pathname.replace(/^\/api\/actions\/([^/]+)\/status\/manual$/, "$1"));
      const body = await readJsonBody(request);
      const beforeAction = await getUserActionById(user.id, actionId);
      const action = await updateUserActionStatusManual(user.id, actionId, body);
      const pointsResult = await syncProject200ActionPoints(user.id, beforeAction, action, {
        restore: String(body?.mode || "").trim().toLowerCase() === "restore"
      });

      sendJson(response, 200, {
        ok: true,
        action,
        pointsAwarded: pointsResult.pointsAwarded,
        pointsUpdate: pointsResult.pointsUpdate
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar manualmente a tarefa."
      });
    }
    return;
  }

  if (request.method === "PATCH" && pathname.match(/^\/api\/actions\/[^/]+\/quick-extend$/)) {
    try {
      const user = await requireAuth(request, response);

      if (!user) {
        return;
      }

      const actionId = decodeURIComponent(pathname.replace(/^\/api\/actions\/([^/]+)\/quick-extend$/, "$1"));
      const body = await readJsonBody(request);
      const action = await extendQuickUserAction(user.id, actionId, body);

      sendJson(response, 200, {
        ok: true,
        action
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Nao foi possivel estender a tarefa rapida."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/finance/summary") {
    try {
      const adminUser = await requireAdmin(request, response);

      if (!adminUser) {
        return;
      }

      const summary = await buildFinanceSummary(requestUrl.searchParams.get("period"));
      sendJson(response, 200, { ok: true, summary });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Nao foi possivel carregar as financas."
      });
    }
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/users") {
    await handleAdminUsersList(request, response);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/users\/[^/]+\/plan$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/plan$/, "$1"));
    await handleAdminUserPlanUpdate(request, response, userId);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/users\/[^/]+\/contractor$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/contractor$/, "$1"));
    await handleAdminUserContractorUpdate(request, response, userId);
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/admin\/users\/[^/]+\/albums$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/albums$/, "$1"));
    await handleAdminUserAlbumAssign(request, response, userId);
    return;
  }

  if (request.method === "DELETE" && pathname.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)$/, "$1"));
    await handleAdminUserDelete(request, response, userId);
    return;
  }

  if (request.method === "POST" && pathname.match(/^\/api\/admin\/users\/[^/]+\/message$/)) {
    const userId = decodeURIComponent(pathname.replace(/^\/api\/admin\/users\/([^/]+)\/message$/, "$1"));
    await handleAdminUserMessageSend(request, response, userId);
    return;
  }

  if (request.method === "GET" && pathname === "/api/account/message") {
    await handleCurrentUserMessage(request, response);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/account/message/dismiss") {
    await handleCurrentUserMessageDismiss(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/account/message/reply") {
    await handleCurrentUserMessageReply(request, response);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/events\/[^/]+\/contractor$/)) {
    const eventId = decodeURIComponent(pathname.replace(/^\/api\/events\/([^/]+)\/contractor$/, "$1"));
    await handleContractorEventUpdate(request, response, eventId);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/admin/pricing") {
    await handleAdminPricingUpdate(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/schedule") {
    await handleAdminScheduleCreate(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/site/banner") {
    await handleAdminBannerUpdate(request, response);
    return;
  }

  if (request.method === "PUT" && pathname === "/api/admin/site/text") {
    await handleAdminTextOverrideUpdate(request, response);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/api/admin/albums/")) {
    if (pathname.match(/^\/api\/admin\/albums\/[^/]+\/zip-link$/)) {
      sendJson(response, 405, { error: "Use PUT para salvar o link do ZIP." });
      return;
    }

    if (pathname.match(/^\/api\/admin\/albums\/[^/]+\/zip$/)) {
      sendJson(response, 405, { error: "Use PUT para enviar ZIP." });
      return;
    }

    await handleAdminAlbumDetail(request, response, pathname);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/albums\/[^/]+\/zip$/)) {
    await handleAdminAlbumZipUpload(request, response, pathname);
    return;
  }

  if (request.method === "PUT" && pathname.match(/^\/api\/admin\/albums\/[^/]+\/zip-link$/)) {
    await handleAdminAlbumZipLinkUpdate(request, response, pathname);
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/admin/albums/")) {
    await handleAdminAlbumUpdate(request, response, pathname);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/images/")) {
    const imageRelativePath = pathname.slice(1);
    const resolvedImagePath = path.join(__dirname, imageRelativePath);

    if (!resolvedImagePath.startsWith(imagesDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Acesso negado.");
      return;
    }

    if (existsSync(resolvedImagePath)) {
      await serveStatic(response, resolvedImagePath);
      return;
    }
  }

  if (request.method === "GET" && (pathname === "/200" || pathname === "/200/")) {
    const targetPath = path.join(publicDir, "200", "index.html");
    if (existsSync(targetPath)) {
      await serveStatic(response, targetPath);
      return;
    }
  }

  let requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  try {
    requestedPath = decodeURIComponent(requestedPath);
  } catch {
    // Keep the raw path when the URL is malformed.
  }
  requestedPath = requestedPath.replace(/^[/\\]+/, "");
  const resolvedPath = path.join(publicDir, requestedPath);
  const htmlResolvedPath = path.join(publicDir, `${requestedPath}.html`);

  if (!resolvedPath.startsWith(publicDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  const directoryIndexPath = path.join(resolvedPath, "index.html");

  if (existsSync(directoryIndexPath) && directoryIndexPath.startsWith(publicDir)) {
    await serveStatic(response, directoryIndexPath);
    return;
  }

  if (existsSync(resolvedPath)) {
    await serveStatic(response, resolvedPath);
    return;
  }

  if (existsSync(htmlResolvedPath) && htmlResolvedPath.startsWith(publicDir)) {
    await serveStatic(response, htmlResolvedPath);
    return;
  }

  const fallbackPath = path.join(publicDir, "index.html");

  if (existsSync(fallbackPath)) {
    const html = await readFile(fallbackPath, "utf8");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Pagina nao encontrada.");
});

void bootstrapMiniCourseJobsQueue();
void ensureEscreverSchema().catch((error) => {
  console.error("Falha ao preparar a area /escrever:", error);
});

server.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
});


