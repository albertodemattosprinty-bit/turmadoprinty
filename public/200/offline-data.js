(function initializeProject200Offline(global) {
  "use strict";

  if (global.Project200Offline) return;

  const CACHE_PREFIX = "project200.offline.cache.v1.";
  const OUTBOX_PREFIX = "project200.offline.outbox.v1.";
  const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
  const MAX_CACHE_ENTRIES = 48;
  const CACHEABLE_GETS = [
    /^\/api\/actions(?:\?|$)/,
    /^\/api\/200\/extra-goals(?:\?|$)/,
    /^\/api\/200\/mission-order(?:\?|$)/,
    /^\/api\/200\/wellness(?:\?|$)/,
    /^\/api\/200\/finance\/personal(?:\?|$)/,
    /^\/api\/platform\/(?:entries|summary)(?:\?|$)/,
    /^\/api\/200\/projects(?:\?|$)/,
  ];

  let activityCount = 0;
  let syncPromise = null;
  let refreshTimer = null;

  function accountKey() {
    const token = String(global.localStorage.getItem("turma_do_printy_token") || global.localStorage.getItem("tdpToken") || global.localStorage.getItem("token") || "anonymous");
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function cacheStorageKey() {
    return `${CACHE_PREFIX}${accountKey()}`;
  }

  function outboxStorageKey() {
    return `${OUTBOX_PREFIX}${accountKey()}`;
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return global.structuredClone ? global.structuredClone(value) : JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function normalizePath(path) {
    return String(path || "").trim();
  }

  function isCacheable(path) {
    return CACHEABLE_GETS.some((pattern) => pattern.test(normalizePath(path)));
  }

  function getCacheRecord(path) {
    const records = readJson(cacheStorageKey(), {});
    const record = records[normalizePath(path)];
    return record && typeof record === "object" && Object.prototype.hasOwnProperty.call(record, "payload") ? record : null;
  }

  function put(path, payload) {
    const normalized = normalizePath(path);
    if (!normalized || payload == null) return;
    const records = readJson(cacheStorageKey(), {});
    records[normalized] = { savedAt: Date.now(), payload: clone(payload) };
    const ordered = Object.entries(records).sort((left, right) => Number(right[1]?.savedAt || 0) - Number(left[1]?.savedAt || 0));
    writeJson(cacheStorageKey(), Object.fromEntries(ordered.slice(0, MAX_CACHE_ENTRIES)));
  }

  function peek(path) {
    return clone(getCacheRecord(path)?.payload ?? null);
  }

  function hasCached(path) {
    return Boolean(getCacheRecord(path));
  }

  function invalidate(prefixes) {
    const values = (Array.isArray(prefixes) ? prefixes : [prefixes]).map(normalizePath).filter(Boolean);
    if (!values.length) return;
    const records = readJson(cacheStorageKey(), {});
    let changed = false;
    Object.keys(records).forEach((path) => {
      if (values.some((prefix) => path.startsWith(prefix))) {
        delete records[path];
        changed = true;
      }
    });
    if (changed) writeJson(cacheStorageKey(), records);
  }

  function ensureFeedback() {
    let feedback = document.getElementById("project200OfflineFeedback");
    if (feedback) return feedback;
    const style = document.createElement("style");
    style.textContent = `
      #project200OfflineFeedback{position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;z-index:100000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 28px);padding:8px 13px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(13,27,49,.92);color:#f7fbff;font:700 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.01em;box-shadow:0 8px 28px rgba(0,0,0,.24);backdrop-filter:blur(14px);transform:translate(-50%,-150%);opacity:0;pointer-events:none;transition:transform .22s ease,opacity .22s ease}
      #project200OfflineFeedback.is-visible{transform:translate(-50%,0);opacity:1}
      #project200OfflineFeedback .project200-offline-spinner{width:13px;height:13px;flex:0 0 auto;border:2px solid rgba(255,255,255,.28);border-top-color:#fff;border-radius:50%;animation:project200OfflineSpin .75s linear infinite}
      @keyframes project200OfflineSpin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){#project200OfflineFeedback{transition:none}#project200OfflineFeedback .project200-offline-spinner{animation-duration:1.6s}}
    `;
    document.head.appendChild(style);
    feedback = document.createElement("div");
    feedback.id = "project200OfflineFeedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.innerHTML = '<span class="project200-offline-spinner" aria-hidden="true"></span><span>Carregando elementos</span>';
    document.body.appendChild(feedback);
    return feedback;
  }

  function beginActivity() {
    activityCount += 1;
    ensureFeedback().classList.add("is-visible");
  }

  function endActivity() {
    activityCount = Math.max(0, activityCount - 1);
    if (activityCount) return;
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(() => ensureFeedback().classList.remove("is-visible"), 280);
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function samePayload(left, right) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }

  function uuid() {
    return global.crypto?.randomUUID?.() || `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function sanitizeHeaders(headers) {
    const safe = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (String(key).toLowerCase() !== "authorization") safe[key] = value;
    });
    return safe;
  }

  function enqueue(path, options) {
    const outbox = readJson(outboxStorageKey(), []);
    outbox.push({
      id: uuid(),
      path: normalizePath(path),
      method: String(options.method || "POST").toUpperCase(),
      headers: sanitizeHeaders(options.headers),
      body: typeof options.body === "string" ? options.body : options.body == null ? null : JSON.stringify(options.body),
      invalidates: Array.isArray(options.offlineInvalidates) ? options.offlineInvalidates : [],
      createdAt: Date.now(),
    });
    writeJson(outboxStorageKey(), outbox.slice(-300));
    emit("project200:offline-queued", { path, pending: Math.min(outbox.length, 300) });
  }

  function getApiUrl(path) {
    const value = normalizePath(path);
    if (/^https?:\/\//i.test(value)) return value;
    const override = String(global.__TDP_API_BASE_URL__ || "").trim().replace(/\/+$/, "");
    if (override) return `${override}${value.startsWith("/") ? value : `/${value}`}`;
    const isNative = Boolean(global.Capacitor?.isNativePlatform?.());
    if (isNative || global.location?.protocol === "file:") return `https://www.turmadoprinty.com.br${value.startsWith("/") ? value : `/${value}`}`;
    return value;
  }

  async function sendQueued(item) {
    const headers = { ...(item.headers || {}) };
    const token = String(global.localStorage.getItem("turma_do_printy_token") || global.localStorage.getItem("tdpToken") || global.localStorage.getItem("token") || "").trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await global.fetch(getApiUrl(item.path), {
      method: item.method,
      headers,
      body: item.body,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || "Nao foi possivel sincronizar os dados offline.");
      error.httpResponse = true;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function sync() {
    if (syncPromise) return syncPromise;
    if (global.navigator?.onLine === false) return { synced: 0, pending: readJson(outboxStorageKey(), []).length };
    syncPromise = (async () => {
      let outbox = readJson(outboxStorageKey(), []);
      if (!outbox.length) return { synced: 0, pending: 0 };
      beginActivity();
      let synced = 0;
      const invalidates = new Set();
      try {
        while (outbox.length && global.navigator?.onLine !== false) {
          const item = outbox[0];
          try {
            await sendQueued(item);
          } catch (error) {
            if (error?.httpResponse && [400, 404, 409, 410, 422].includes(Number(error.status))) {
              outbox.shift();
              writeJson(outboxStorageKey(), outbox);
              emit("project200:offline-sync-error", { path: item.path, message: error.message });
              continue;
            }
            break;
          }
          outbox.shift();
          writeJson(outboxStorageKey(), outbox);
          synced += 1;
          (item.invalidates || []).forEach((prefix) => invalidates.add(prefix));
        }
        if (invalidates.size) invalidate([...invalidates]);
        if (synced) emit("project200:offline-sync-complete", { synced, pending: outbox.length, invalidates: [...invalidates] });
        return { synced, pending: outbox.length };
      } finally {
        endActivity();
      }
    })().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  }

  function isOfflineFailure(error) {
    return global.navigator?.onLine === false || !error?.httpResponse;
  }

  async function backgroundRefresh(path, options, execute, previousPayload) {
    beginActivity();
    try {
      const payload = await execute();
      put(path, payload);
      if (!samePayload(previousPayload, payload)) emit("project200:offline-data-updated", { path, payload: clone(payload) });
    } catch {
      // O cache continua sendo a fonte segura quando a atualização em segundo plano falha.
    } finally {
      endActivity();
    }
  }

  async function request(path, options, execute) {
    const normalized = normalizePath(path);
    const requestOptions = options || {};
    const method = String(requestOptions.method || "GET").toUpperCase();
    const cacheable = method === "GET" && isCacheable(normalized);
    const maxAgeMs = Math.max(0, Number(requestOptions.cacheMaxAgeMs ?? DEFAULT_MAX_AGE_MS));
    const cached = cacheable ? getCacheRecord(normalized) : null;

    if (cacheable && cached && !requestOptions.forceNetwork) {
      const isFresh = Date.now() - Number(cached.savedAt || 0) <= maxAgeMs;
      if (!isFresh && global.navigator?.onLine !== false) void backgroundRefresh(normalized, requestOptions, execute, cached.payload);
      return clone(cached.payload);
    }

    try {
      const payload = await execute();
      if (cacheable) put(normalized, payload);
      if (method !== "GET" && requestOptions.offlineInvalidates) invalidate(requestOptions.offlineInvalidates);
      return payload;
    } catch (error) {
      if (cacheable && cached) return clone(cached.payload);
      if (method !== "GET" && requestOptions.offlineQueue && isOfflineFailure(error)) {
        enqueue(normalized, requestOptions);
        const fallback = clone(requestOptions.offlineResponse || {});
        return fallback && typeof fallback === "object"
          ? { ...fallback, offlineQueued: true }
          : { offlineQueued: true, value: fallback };
      }
      throw error;
    }
  }

  global.addEventListener("online", () => void sync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && global.navigator?.onLine !== false) void sync();
  });
  global.setTimeout(() => {
    ensureFeedback();
    if (global.navigator?.onLine !== false) void sync();
  }, 0);

  global.Project200Offline = {
    request,
    sync,
    peek,
    put,
    hasCached,
    invalidate,
    isOnline: () => global.navigator?.onLine !== false,
    pendingCount: () => readJson(outboxStorageKey(), []).length,
    activity: async (task) => {
      beginActivity();
      try { return await task(); } finally { endActivity(); }
    },
  };
})(window);
