import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const EXERCISE_VIDEO_MAX_SECONDS = 15;
const EXERCISE_VIDEO_TIMEOUT_MS = 90000;

function runFfmpeg(args, { acceptAnyExitCode = false } = {}) {
  if (!ffmpegPath) return Promise.reject(new Error("FFmpeg não está disponível neste servidor."));
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, EXERCISE_VIDEO_TIMEOUT_MS);
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-12000); });
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (!timedOut && (code === 0 || acceptAnyExitCode)) resolve(stderr);
      else if (timedOut) reject(new Error("A otimização do vídeo demorou além do esperado."));
      else reject(new Error("Não foi possível converter este vídeo para o formato web."));
    });
  });
}
async function probeVideoDuration(filePath) {
  const stderr = await runFfmpeg(["-hide_banner", "-i", filePath], { acceptAnyExitCode: true });
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error("Não foi possível identificar a duração do vídeo enviado.");
  return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
}

export async function compileProject200ExerciseVideo(sourceBuffer) {
  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length < 1024) throw new Error("O vídeo enviado está vazio ou inválido.");
  const workDirectory = await mkdtemp(path.join(tmpdir(), "project200-exercise-video-"));
  const inputPath = path.join(workDirectory, "source-video");
  const outputPath = path.join(workDirectory, "exercise-video.mp4");
  const posterPngPath = path.join(workDirectory, "exercise-poster.png");
  try {
    await writeFile(inputPath, sourceBuffer);
    const durationSeconds = await probeVideoDuration(inputPath);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("O vídeo enviado não possui duração válida.");
    if (durationSeconds > EXERCISE_VIDEO_MAX_SECONDS + 0.05) throw new Error("Envie um vídeo de no máximo 15 segundos.");
    const squareFilter = "scale=600:600:force_original_aspect_ratio=decrease,pad=600:600:(ow-iw)/2:(oh-ih)/2:color=0xEAD8C4,fps=30,format=yuv420p";
    await runFfmpeg([
      "-hide_banner", "-loglevel", "warning", "-y", "-i", inputPath,
      "-vf", squareFilter, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "28",
      "-maxrate", "1400k", "-bufsize", "2800k", "-movflags", "+faststart", "-map_metadata", "-1", outputPath
    ]);
    await runFfmpeg([
      "-hide_banner", "-loglevel", "warning", "-y", "-i", outputPath,
      "-frames:v", "1", "-vf", "scale=600:600", posterPngPath
    ]);
    const [videoBuffer, posterBuffer] = await Promise.all([
      readFile(outputPath),
      sharp(posterPngPath).webp({ quality: 78, effort: 5 }).toBuffer()
    ]);
    return { videoBuffer, posterBuffer, durationSeconds: Math.round(durationSeconds * 100) / 100 };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}
