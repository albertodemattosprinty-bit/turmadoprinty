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

  let syncPromise = null;
  const refreshes = new Map();
  const cacheRevisions = new Map();

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

  function revisionKey(path) {
    return `${cacheStorageKey()}:${normalizePath(path)}`;
  }

  function revisionFor(path) {
    const key = revisionKey(path);
    if (!cacheRevisions.has(key)) cacheRevisions.set(key, 0);
    return cacheRevisions.get(key);
  }

  function bumpRevision(path) {
    cacheRevisions.set(revisionKey(path), revisionFor(path) + 1);
  }

  function bumpPrefixes(prefixes) {
    const base = `${cacheStorageKey()}:`;
    cacheRevisions.forEach((revision, key) => {
      if (key.startsWith(base) && prefixes.some((prefix) => key.slice(base.length).startsWith(prefix))) {
        cacheRevisions.set(key, revision + 1);
      }
    });
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
    records[normalized] = { savedAt: Date.now(), capturedAt: Date.now(), payload: clone(payload) };
    bumpRevision(normalized);
    const ordered = Object.entries(records).sort((left, right) => Number(right[1]?.savedAt || 0) - Number(left[1]?.savedAt || 0));
    writeJson(cacheStorageKey(), Object.fromEntries(ordered.slice(0, MAX_CACHE_ENTRIES)));
  }

  function peek(path) {
    return readCachedPayload(getCacheRecord(path));
  }

  function readCachedPayload(record) {
    const payload = clone(record?.payload ?? null);
    const serverNow = new Date(payload?.serverNow || "").getTime();
    if (payload && Number.isFinite(serverNow)) {
      // A hora da resposta continua avançando, mesmo se o cache foi marcado como antigo.
      const capturedAt = Number(record.capturedAt || record.savedAt || 0);
      payload.serverNow = new Date(capturedAt > 0 ? serverNow + Math.max(0, Date.now() - capturedAt) : Date.now()).toISOString();
    }
    return payload;
  }

  function hasCached(path) {
    return Boolean(getCacheRecord(path));
  }

  function invalidate(prefixes) {
    const values = (Array.isArray(prefixes) ? prefixes : [prefixes]).map(normalizePath).filter(Boolean);
    if (!values.length) return;
    bumpPrefixes(values);
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

  function markStale(prefixes) {
    const values = (Array.isArray(prefixes) ? prefixes : [prefixes]).map(normalizePath).filter(Boolean);
    if (!values.length) return;
    bumpPrefixes(values);
    const records = readJson(cacheStorageKey(), {});
    let changed = false;
    Object.keys(records).forEach((path) => {
      if (!values.some((prefix) => path.startsWith(prefix))) return;
      records[path] = { ...records[path], savedAt: 0 };
      changed = true;
    });
    if (changed) writeJson(cacheStorageKey(), records);
  }

  function updateCached(prefixes, updater) {
    if (typeof updater !== "function") return;
    const values = (Array.isArray(prefixes) ? prefixes : [prefixes]).map(normalizePath).filter(Boolean);
    if (!values.length) return;
    bumpPrefixes(values);
    const records = readJson(cacheStorageKey(), {});
    let changed = false;
    Object.entries(records).forEach(([path, record]) => {
      if (!values.some((prefix) => path.startsWith(prefix))) return;
      const nextPayload = updater(clone(record?.payload), path);
      if (nextPayload === undefined) return;
      records[path] = { ...record, payload: clone(nextPayload) };
      changed = true;
    });
    if (changed) writeJson(cacheStorageKey(), records);
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function samePayload(left, right) {
    try {
      const ignoreVolatileClock = (key, value) => (
        ["serverNow", "generatedAt", "fetchedAt", "responseAt"].includes(String(key)) ? undefined : value
      );
      return JSON.stringify(left, ignoreVolatileClock) === JSON.stringify(right, ignoreVolatileClock);
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
    if (!writeJson(outboxStorageKey(), outbox)) throw new Error("Não foi possível salvar a alteração no aparelho.");
    markStale(options.offlineInvalidates || []);
    emit("project200:offline-queued", { path, pending: outbox.length });
  }

  function pendingActionIds() {
    return readJson(outboxStorageKey(), []).map((item) => {
      const match = String(item.path || "").match(/^\/api\/actions\/([^/?]+)\/status(?:\/manual)?$/);
      if (match) return decodeURIComponent(match[1]);
      if (item.path === "/api/actions/free-time") {
        try { return JSON.parse(item.body || "{}").clientActionId || ""; } catch {}
      }
      return "";
    }).filter(Boolean);
  }

  function protectPendingActions(path, payload) {
    if (!/^\/api\/actions(?:\?|$)/.test(path) || !Array.isArray(payload?.actions)) return payload;
    const pending = new Set(pendingActionIds());
    const local = peek(path)?.actions || [];
    const actions = new Map(payload.actions.map((action) => [String(action.id), action]));
    local.forEach((action) => { if (pending.has(String(action.id))) actions.set(String(action.id), action); });
    return { ...payload, actions: [...actions.values()] };
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
    const controller = new AbortController();
    const timer = global.setTimeout(() => controller.abort(), 8000);
    let response;
    let payload;
    try {
      response = await global.fetch(getApiUrl(item.path), {
        method: item.method, headers, body: item.body, cache: "no-store", signal: controller.signal,
      });
      payload = await response.json().catch(() => ({}));
    } finally {
      global.clearTimeout(timer);
    }
    if (!response.ok) {
      const error = new Error(payload?.error || "Nao foi possivel sincronizar os dados offline.");
      error.httpResponse = true;
      error.status = response.status;
      error.code = String(payload?.code || "");
      error.runningAction = payload?.runningAction || null;
      throw error;
    }
    return payload;
  }

  async function sync() {
    if (syncPromise) return syncPromise;
    if (global.navigator?.onLine === false) return { synced: 0, pending: readJson(outboxStorageKey(), []).length };
    const storageKey = outboxStorageKey();
    syncPromise = Promise.resolve().then(async () => {
      let outbox = readJson(storageKey, []);
      if (!outbox.length) return { synced: 0, pending: 0 };
      let synced = 0;
      let rejected = 0;
      const invalidates = new Set();
      while (outbox.length && global.navigator?.onLine !== false && outboxStorageKey() === storageKey) {
        const item = outbox[0];
        let payload;
        try {
          payload = await sendQueued(item);
        } catch (error) {
          if (error?.httpResponse && [400, 404, 409, 410, 422].includes(Number(error.status))) {
            outbox = readJson(storageKey, []).filter((queued) => queued.id !== item.id);
            writeJson(storageKey, outbox);
            rejected += 1;
            (item.invalidates || []).forEach((prefix) => invalidates.add(prefix));
            if (outboxStorageKey() === storageKey) {
              let requestedStatus = "";
              try { requestedStatus = String(JSON.parse(item.body || "{}").status || "").toUpperCase(); } catch {}
              emit("project200:offline-sync-error", {
                path: item.path,
                message: error.message,
                status: error.status,
                code: error.code || "",
                runningAction: error.runningAction || null,
                requestedStatus
              });
            }
            continue;
          }
          break;
        }
        // Releia: outra tarefa pode ter sido adicionada enquanto a rede respondia.
        outbox = readJson(storageKey, []).filter((queued) => queued.id !== item.id);
        writeJson(storageKey, outbox);
        synced += 1;
        (item.invalidates || []).forEach((prefix) => invalidates.add(prefix));
        if (outboxStorageKey() === storageKey) {
          let requestedStatus = "";
          try { requestedStatus = String(JSON.parse(item.body || "{}").status || "").toUpperCase(); } catch {}
          emit("project200:offline-mutation-synced", { path: item.path, payload, pending: outbox.length, requestedStatus });
        }
      }
      if (outboxStorageKey() === storageKey) {
        if (invalidates.size) markStale([...invalidates]);
        if (synced || rejected) emit("project200:offline-sync-complete", { synced, rejected, pending: outbox.length, invalidates: [...invalidates] });
      }
      return { synced, pending: outbox.length };
    }).finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  }

  function isOfflineFailure(error) {
    return global.navigator?.onLine === false || !error?.httpResponse;
  }

  async function backgroundRefresh(path, options, execute, previousPayload) {
    const account = accountKey();
    const refreshKey = revisionKey(path);
    if (refreshes.has(refreshKey)) return refreshes.get(refreshKey);
    const revision = revisionFor(path);
    const refresh = (async () => {
      try {
        const response = await execute({ background: true });
        if (account !== accountKey() || revision !== revisionFor(path)) return;
        const payload = protectPendingActions(path, response);
        const changed = !samePayload(previousPayload, payload);
        put(path, payload);
        if (changed) emit("project200:offline-data-updated", { path, payload: clone(payload) });
      } catch {
        // O cache continua sendo a fonte segura quando a atualização em segundo plano falha.
      } finally {
        refreshes.delete(refreshKey);
      }
    })();
    refreshes.set(refreshKey, refresh);
    return refresh;
  }

  async function request(path, options, execute) {
    const account = accountKey();
    const normalized = normalizePath(path);
    const requestOptions = options || {};
    const method = String(requestOptions.method || "GET").toUpperCase();
    const cacheable = method === "GET" && isCacheable(normalized);
    const maxAgeMs = Math.max(0, Number(requestOptions.cacheMaxAgeMs ?? DEFAULT_MAX_AGE_MS));
    const cached = cacheable ? getCacheRecord(normalized) : null;

    const queuedResponse = async () => {
      try {
        enqueue(normalized, requestOptions);
      } catch (error) {
        if (global.navigator?.onLine === false || readJson(outboxStorageKey(), []).length) throw error;
        const payload = await execute({ background: false });
        if (requestOptions.offlineInvalidates) markStale(requestOptions.offlineInvalidates);
        return payload;
      }
      if (global.navigator?.onLine !== false) void sync();
      const fallback = clone(requestOptions.offlineResponse || {});
      return { ...fallback, offlineQueued: true };
    };
    if (method !== "GET" && requestOptions.offlineQueue
      && (requestOptions.offlineImmediate || global.navigator?.onLine === false || readJson(outboxStorageKey(), []).length)) {
      return queuedResponse();
    }

    if (cacheable && cached && !requestOptions.forceNetwork) {
      const isFresh = Date.now() - Number(cached.savedAt || 0) <= maxAgeMs;
      if (!isFresh && global.navigator?.onLine !== false) void backgroundRefresh(normalized, requestOptions, execute, cached.payload);
      return readCachedPayload(cached);
    }

    try {
      const revision = revisionFor(normalized);
      let payload = await execute({ background: false });
      if (account !== accountKey()) throw new Error("A conta foi alterada durante a atualização.");
      if (cacheable && revision !== revisionFor(normalized) && hasCached(normalized)) return peek(normalized);
      if (cacheable) payload = protectPendingActions(normalized, payload);
      if (cacheable) put(normalized, payload);
      if (method !== "GET" && requestOptions.offlineInvalidates) markStale(requestOptions.offlineInvalidates);
      return payload;
    } catch (error) {
      if (account !== accountKey()) throw error;
      if (cacheable && !requestOptions.requireNetwork && hasCached(normalized)) return peek(normalized);
      if (method !== "GET" && requestOptions.offlineQueue && isOfflineFailure(error)) {
        return queuedResponse();
      }
      throw error;
    }
  }

  global.addEventListener("online", () => void sync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && global.navigator?.onLine !== false) void sync();
  });
  global.setTimeout(() => {
    if (global.navigator?.onLine !== false) void sync();
  }, 0);
  global.setInterval(() => { if (global.navigator?.onLine !== false) void sync(); }, 15000);

  global.Project200Offline = {
    request,
    sync,
    peek,
    put,
    hasCached,
    invalidate,
    markStale,
    updateCached,
    pendingActionIds,
    isOnline: () => global.navigator?.onLine !== false,
    pendingCount: () => readJson(outboxStorageKey(), []).length,
    activity: async (task) => task(),
  };
})(window);
