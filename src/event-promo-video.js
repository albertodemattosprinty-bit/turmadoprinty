import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const MONTHS_PT = Object.freeze([
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]);
const WEEKDAYS_PT = Object.freeze([
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado"
]);
const HOURS_PT = Object.freeze([
  "zero", "uma", "duas", "três", "quatro", "cinco", "seis",
  "sete", "oito", "nove", "dez", "onze", "doze"
]);

const assetDirectory = fileURLToPath(new URL("../assets/event-promo-video/", import.meta.url));
const EVENT_PROMO_ASSETS = Object.freeze({
  background: path.join(assetDirectory, "background.mp4"),
  music: path.join(assetDirectory, "music.mp3"),
  intro: path.join(assetDirectory, "intro.mp3"),
  outro: path.join(assetDirectory, "outro.mp3")
});

function parseClock(value) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})(?:h|:)?(\d{2})?(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3] || "";
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return { hour, minute };
}

function minuteCopy(minute) {
  if (minute === 0) return "";
  if (minute === 30) return " e meia";
  return ` e ${String(minute).padStart(2, "0")} minutos`;
}

export function formatEventTimeForSpeech(value) {
  const clock = parseClock(value);
  if (!clock) throw new Error("Horario do evento invalido para a locucao.");
  const { hour, minute } = clock;
  if (hour === 0) return `meia-noite${minuteCopy(minute)}`;
  if (hour === 12) return `meio-dia${minuteCopy(minute)}`;
  const spokenHour = HOURS_PT[hour > 12 ? hour - 12 : hour];
  const suffix = hour >= 6 && hour <= 11
    ? "da manhã"
    : hour >= 13 && hour <= 18
      ? "da tarde"
      : hour >= 19
        ? "da noite"
        : "da madrugada";
  return `${spokenHour}${minuteCopy(minute)} ${suffix}`;
}

export function buildEventPromoNarration(term) {
  const answers = term?.answers || {};
  const church = String(answers.igreja || "").replace(/\s+/g, " ").trim();
  const eventDate = String(term?.eventDate || "").slice(0, 10);
  const date = new Date(`${eventDate}T12:00:00Z`);
  if (!church) throw new Error("Nome da igreja nao encontrado no termo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(date.getTime())) {
    throw new Error("Data do evento nao encontrada no termo.");
  }
  const day = date.getUTCDate();
  const month = MONTHS_PT[date.getUTCMonth()];
  const weekday = WEEKDAYS_PT[date.getUTCDay()];
  const time = formatEventTimeForSpeech(term?.eventTime || answers.horario);
  const weekdayCopy = weekday === "domingo" || weekday === "sábado" ? `no ${weekday}` : `na ${weekday}`;
  return `Vai ser na ${church}, dia ${day} de ${month}, ${weekdayCopy}, às ${time}.`;
}

export async function synthesizeEventPromoNarration({ apiKey, text, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY nao configurada para gerar a locucao.");
  const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      response_format: "wav",
      input: text,
      instructions: "Fale em portugues do Brasil, com voz alegre, acolhedora e animada. Pronuncie nomes proprios com cuidado e mantenha ritmo natural de convite para um evento infantil."
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details || "A OpenAI nao conseguiu gerar a locucao Marin.");
  }
  return Buffer.from(await response.arrayBuffer());
}

function runFfmpeg(args) {
  if (!ffmpegPath) return Promise.reject(new Error("FFmpeg nao esta disponivel neste servidor."));
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), 120000);
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-16000);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg encerrou com codigo ${code ?? signal}. ${stderr}`.trim()));
    });
  });
}

export async function composeEventPromoVideo(narrationWav) {
  if (!Buffer.isBuffer(narrationWav) || narrationWav.length < 44) {
    throw new Error("A locucao Marin recebida esta vazia.");
  }
  const workDirectory = await mkdtemp(path.join(tmpdir(), "printy-event-video-"));
  const narrationPath = path.join(workDirectory, "marin.wav");
  const outputPath = path.join(workDirectory, "video-divulgacao.mp4");
  try {
    await writeFile(narrationPath, narrationWav);
    const filter = [
      "[1:a:0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.18[music]",
      "[2:a:0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[intro]",
      "[3:a:0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[marin]",
      "[4:a:0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[outro]",
      "[intro][marin][outro]concat=n=3:v=0:a=1[voice]",
      "[music][voice]amix=inputs=2:duration=longest:dropout_transition=0:weights=1 1:normalize=0,alimiter=limit=0.95[audio]"
    ].join(";");
    await runFfmpeg([
      "-hide_banner", "-loglevel", "warning", "-y",
      "-i", EVENT_PROMO_ASSETS.background,
      "-stream_loop", "-1", "-i", EVENT_PROMO_ASSETS.music,
      "-i", EVENT_PROMO_ASSETS.intro,
      "-i", narrationPath,
      "-i", EVENT_PROMO_ASSETS.outro,
      "-filter_complex", filter,
      "-map", "0:v:0", "-map", "[audio]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-map_metadata", "-1", "-movflags", "+faststart", "-shortest",
      outputPath
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

export function getEventPromoAssetPaths() {
  return { ...EVENT_PROMO_ASSETS };
}
