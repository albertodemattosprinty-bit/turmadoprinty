import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

import { compileProject200ExerciseVideo } from "../src/project200-exercise-video.js";

test("exercise video is compiled to a small 600x600 web asset and poster", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "project200-video-test-"));
  const sourcePath = path.join(directory, "source.mp4");
  try {
    const generated = spawnSync(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=320x180:d=0.4",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", sourcePath
    ], { windowsHide: true });
    assert.equal(generated.status, 0, generated.stderr?.toString() || "sample video generation failed");
    const result = await compileProject200ExerciseVideo(await readFile(sourcePath));
    assert.ok(result.videoBuffer.length > 1000);
    assert.ok(result.posterBuffer.length > 100);
    assert.ok(result.durationSeconds > 0 && result.durationSeconds <= 15);
    const poster = await sharp(result.posterBuffer).metadata();
    assert.equal(poster.width, 600);
    assert.equal(poster.height, 600);
    assert.equal(poster.format, "webp");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("exercise video longer than 15 seconds is rejected before conversion", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "project200-video-limit-test-"));
  const sourcePath = path.join(directory, "source.mp4");
  try {
    const generated = spawnSync(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=16",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", sourcePath
    ], { windowsHide: true });
    assert.equal(generated.status, 0, generated.stderr?.toString() || "sample video generation failed");
    await assert.rejects(
      compileProject200ExerciseVideo(await readFile(sourcePath)),
      /máximo 15 segundos/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
