let preloadTimer = 0;
let playTimer = 0;
let activeKey = "";

function clearSchedule() {
  if (preloadTimer) clearTimeout(preloadTimer);
  if (playTimer) clearTimeout(playTimer);
  preloadTimer = 0;
  playTimer = 0;
  activeKey = "";
}

self.addEventListener("message", (event) => {
  const payload = event.data || {};
  if (payload.type === "cancel") {
    clearSchedule();
    return;
  }
  if (payload.type !== "schedule") return;

  clearSchedule();
  activeKey = String(payload.key || "");
  const scheduledKey = activeKey;
  const urls = Array.isArray(payload.urls) ? payload.urls.filter(Boolean) : [];
  const preloadDelayMs = Math.max(0, Number(payload.preloadDelayMs || 0));
  const playDelayMs = Math.max(0, Number(payload.playDelayMs || 0));

  preloadTimer = setTimeout(() => {
    preloadTimer = 0;
    if (!activeKey || activeKey !== scheduledKey) return;
    self.postMessage({ type: "preload", key: scheduledKey });
    void Promise.allSettled(urls.map((url) => fetch(url, { cache: "force-cache" })));
    playTimer = setTimeout(() => {
      playTimer = 0;
      if (!activeKey || activeKey !== scheduledKey) return;
      self.postMessage({ type: "play", key: scheduledKey });
      activeKey = "";
    }, playDelayMs);
  }, preloadDelayMs);
});
