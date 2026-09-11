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

test("exercise cards keep the thumbnail visible until play is requested", async () => {
  const source = await readFile(new URL("../public/200/wellness.js", import.meta.url), "utf8");
  assert.match(source, /data-exercise-video-cover/);
  assert.match(source, /video\.hidden=false;if\(cover\)cover\.hidden=true/);
  assert.match(source, /showExerciseVideoCover\(otherShell,\{reset:true\}\)/);
  assert.match(source, /\.catch\(\(\)=>\{showExerciseVideoCover\(shell\)/);
});

test("admin thumbnail generation creates one optimized 600x600 WebP cover", async () => {
  const [serverSource, wellnessSource, htmlSource] = await Promise.all([
    readFile(new URL("../server.js", import.meta.url), "utf8"),
    readFile(new URL("../src/project200-wellness.js", import.meta.url), "utf8"),
    readFile(new URL("../public/200/index.html", import.meta.url), "utf8")
  ]);
  assert.match(serverSource, /handleProject200ExerciseThumbnailRequest/);
  assert.match(serverSource, /exercises\\\/\[\^\/\]\+\\\/thumbnail/);
  assert.match(serverSource, /model, prompt, size: "1024x1024", quality: "medium"/);
  assert.match(serverSource, /resize\(\{ width: 600, height: 600/);
  assert.match(serverSource, /webp\(\{ quality: 80, effort: 5 \}\)/);
  assert.match(wellnessSource, /thumbnail_url text not null default ''/);
  assert.match(wellnessSource, /thumbnailUrl: String\(row\?\.thumbnail_url/);
  assert.match(htmlSource, />Preencher Thumbs</);
  assert.match(htmlSource, />Gerar thumbs pendentes</);
  assert.match(htmlSource, />Gerar todas novamente</);
});
