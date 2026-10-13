import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const offlineSource = fs.readFileSync(new URL("../public/200/offline-data.js", import.meta.url), "utf8");
const projectSource = fs.readFileSync(new URL("../public/200/project.js", import.meta.url), "utf8");
const actionsSource = fs.readFileSync(new URL("../src/actions.js", import.meta.url), "utf8");
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

function offlineHarness() {
  let now = Date.parse("2026-10-13T15:00:00Z");
  const storage = new Map();
  const timers = new Map();
  const events = [];
  let timerId = 0;
  const listeners = new Map();
  const win = {
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    navigator: { onLine: true }, location: { protocol: "https:" }, crypto,
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => timers.delete(id), setInterval: () => ++timerId,
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent: (event) => { events.push(event); listeners.get(event.type)?.(event); },
    fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }),
  };
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({ window: win, Date: Clock, AbortController,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    document: { addEventListener() {}, createElement() { throw new Error("Background sync must not create UI"); } },
  });
  vm.runInContext(offlineSource, context);
  return { get api() { return win.Project200Offline; }, win, storage, timers, events, now: () => now, advance: (ms) => { now += ms; },
    restart: () => { delete win.Project200Offline; vm.runInContext(offlineSource, context); } };
}

const path = "/api/actions?from=today&to=tomorrow";
const action = (id = "a", status = "IN_PROGRESS") => ({ id, status, title: "Estudar", assignee: "Lucas", categoryId: "estudo",
  startAt: "2026-10-13T15:00:00Z", endAt: "2026-10-13T15:10:00Z", startedAt: "2026-10-13T15:00:00Z", accumulatedSeconds: 0 });
const queueOptions = (id, extra = {}) => ({ method: "PATCH", offlineQueue: true, offlineImmediate: true,
  offlineResponse: { action: action(id) }, offlineInvalidates: ["/api/actions"], ...extra });

test("cached server clock keeps advancing after a stale mark and app restart", async () => {
  const h = offlineHarness();
  h.api.put(path, { actions: [action()], serverNow: "2026-10-13T15:00:00Z" });
  h.advance(90000);
  h.api.markStale("/api/actions");
  h.win.navigator.onLine = false;
  const payload = await h.api.request(path, {}, () => { throw new Error("must use local data"); });
  assert.equal(payload.serverNow, "2026-10-13T15:01:30.000Z");
  h.advance(30000);
  h.restart();
  assert.equal(h.api.peek(path).serverNow, "2026-10-13T15:02:00.000Z");
});

test("background response cannot overwrite a start that happened during its request", async () => {
  const h = offlineHarness();
  h.api.put(path, { actions: [action("a", "PENDING")] });
  h.api.markStale("/api/actions");
  const network = deferred();
  await h.api.request(path, {}, () => network.promise);
  h.api.put(path, { actions: [action()] });
  network.resolve({ actions: [action("a", "PENDING")] });
  await flush();
  assert.equal(h.api.peek(path).actions[0].status, "IN_PROGRESS");
  assert.equal(h.events.filter((event) => event.type === "project200:offline-data-updated").length, 0);
});

test("cache refreshes for the same path share one network request", async () => {
  const h = offlineHarness(); const network = deferred(); let calls = 0;
  h.api.put(path, { actions: [] }); h.api.markStale("/api/actions");
  const fetch = () => { calls++; return network.promise; };
  await Promise.all([h.api.request(path, {}, fetch), h.api.request(path, {}, fetch)]);
  assert.equal(calls, 1);
  network.resolve({ actions: [] }); await flush();
});

test("offline start returns immediately without attempting the network", async () => {
  const h = offlineHarness(); h.win.navigator.onLine = false;
  const payload = await h.api.request("/api/actions/a/status", queueOptions("a"), () => { throw new Error("network called"); });
  assert.equal(payload.offlineQueued, true);
  assert.equal(h.api.pendingCount(), 1);
  assert.equal(h.api.pendingActionIds()[0], "a");
});

test("enqueueing while a sync response is pending does not lose the new task", async () => {
  const h = offlineHarness(); const first = deferred(); const sent = [];
  h.win.fetch = async (url) => { sent.push(url); if (sent.length === 1) await first.promise; return { ok: true, json: async () => ({}) }; };
  await h.api.request("/api/actions/a/status", queueOptions("a"), () => {});
  await flush();
  await h.api.request("/api/actions/b/status", queueOptions("b"), () => {});
  first.resolve(); await h.api.sync();
  assert.deepEqual(sent, ["/api/actions/a/status", "/api/actions/b/status"]);
  assert.equal(h.api.pendingCount(), 0);
});

test("forced online refresh protects actions with unsent changes", async () => {
  const h = offlineHarness(); h.win.navigator.onLine = false;
  h.api.put(path, { actions: [action()] });
  await h.api.request("/api/actions/a/status", queueOptions("a"), () => {});
  h.win.navigator.onLine = true;
  const payload = await h.api.request(path, { forceNetwork: true }, async () => ({ actions: [action("a", "PENDING")] }));
  assert.equal(payload.actions[0].status, "IN_PROGRESS");
});

test("a failed sync keeps its mutation and a later sync retries it", async () => {
  const h = offlineHarness(); h.win.navigator.onLine = false;
  await h.api.request("/api/actions/a/status", queueOptions("a"), () => {});
  h.win.navigator.onLine = true; h.win.fetch = async () => { throw new Error("no network"); };
  await h.api.sync(); assert.equal(h.api.pendingCount(), 1);
  h.win.fetch = async () => ({ ok: true, json: async () => ({}) });
  await h.api.sync(); assert.equal(h.api.pendingCount(), 0);
});

test("full storage reports failure instead of claiming the mutation was saved", async () => {
  const h = offlineHarness(); h.win.navigator.onLine = false;
  h.win.localStorage.setItem = () => { throw new Error("quota"); };
  await assert.rejects(h.api.request("/api/actions/a/status", queueOptions("a"), () => {}), /salvar/);
});

test("a stalled sync is cancelled and keeps the mutation for retry", async () => {
  const h = offlineHarness(); h.win.navigator.onLine = false;
  await h.api.request("/api/actions/a/status", queueOptions("a"), () => {});
  h.win.navigator.onLine = true;
  h.win.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  const syncing = h.api.sync(); await flush();
  [...h.timers.values()].find((timer) => timer.ms === 8000).fn();
  await syncing; assert.equal(h.api.pendingCount(), 1);
});

test("background updates to separate surfaces do not cancel each other", async () => {
  const h = offlineHarness(); const missions = "/api/200/extra-goals?profile=Lucas";
  const actionsNetwork = deferred(); const missionsNetwork = deferred();
  h.api.put(path, { actions: [] }); h.api.put(missions, { goals: [] });
  h.api.markStale(["/api/actions", "/api/200/extra-goals"]);
  await h.api.request(path, {}, () => actionsNetwork.promise);
  await h.api.request(missions, {}, () => missionsNetwork.promise);
  actionsNetwork.resolve({ actions: [action()] }); await flush();
  missionsNetwork.resolve({ goals: [{ id: "mission" }] }); await flush();
  assert.equal(h.api.peek(missions).goals[0].id, "mission");
});

function functionSource(name) {
  const match = projectSource.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\r?\\n`));
  assert.ok(match, `Missing real application function: ${name}`);
  return match[0];
}

function projectHarness(names, extras = {}) {
  const timers = new Map(); let nextId = 0;
  const status = { pending: "PENDING", paused: "PAUSED", inProgress: "IN_PROGRESS", completed: "COMPLETED" };
  const state = { actions: [action()], selectedProfile: "Lucas", activeOffset: 0, actionPeriodDays: 1,
    runtimeState: null, runningLocalStarts: {}, homeSnapshotReady: true, optimisticActionIds: [], options: {},
    serverNowMs: Date.parse("2026-10-13T15:02:00Z"), serverNowCapturedAtMs: Date.now() };
  const noop = () => {};
  const win = { setTimeout: (fn, ms) => { const id = ++nextId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => timers.delete(id), setInterval: () => 1, clearInterval: noop,
    Project200Offline: { pendingActionIds: () => [], hasCached: () => true, put: noop, peek: () => ({}) } };
  const context = vm.createContext({ state, window: win, console, crypto, AbortController, TextEncoder, Uint8Array, Date, URL,
    document: { hidden: false }, navigator: { onLine: true }, actionStatuses: status, runningCarryOverMinutes: 0,
    actionsLoadGeneration: 0, actionsMutationGeneration: 0, continuousTaskTransitionTimer: 0,
    RUNNING_COMPLETION_ANIMATION_MS: 100, RUNNING_COMPLETION_HOLD_MS: 100,
    taskSpeechCancellations: new Set(), taskSpeechControllers: new Set(), taskSpeechContextKey: "action:a", taskSpeechGeneration: 0,
    taskSpeechPlaybackQueue: Promise.resolve(), taskSpeechBlobCache: new Map(), minuteCueBlobRequests: new Map(),
    normalizeActionStatus: (value) => value || "PENDING", getToken: () => "test-account", renderDateHeader: noop,
    dateFromOffset: () => new Date("2026-10-13"), projectDateKeyToDate: (value) => new Date(value),
    addDaysToDateKey: (value) => value, getProjectDateKey: () => "2026-10-13", startOfDayIso: () => "start", nextDayIso: () => "end",
    renderActions: noop, renderHomeRunningTask: noop, scheduleMissionNotifications: noop, registerDayCloseEventIfNeeded: noop,
    getActionDurationMinutes: () => 10, getServerNowMs: () => Date.parse("2026-10-13T15:02:00Z"),
    actionsProgress: {}, actionsList: {}, getRunningActionForSelectedProfile: () => null,
    isMissionRunModalOpen: () => false, getRunningPlaybackState: () => ({}), runningAudio: null,
    ...extras });
  vm.runInContext(names.map(functionSource).join("\n"), context);
  return { context, state: context.state, timers, win: context.window };
}

test("resume starts a new session while retaining accumulated work; restore resets it", () => {
  const h = projectHarness(["buildOptimisticAction"]);
  const paused = { ...action("a", "PAUSED"), accumulatedSeconds: 120, completionPercent: 20 };
  const resumed = h.context.buildOptimisticAction(paused, "IN_PROGRESS");
  assert.equal(resumed.startedAt, "2026-10-13T15:02:00.000Z");
  assert.equal(resumed.accumulatedSeconds, 120);
  const restored = h.context.buildOptimisticAction(paused, "PENDING");
  assert.equal(restored.startedAt, null); assert.equal(restored.accumulatedSeconds, 0);
});

test("timer uses the current local session and includes carry-over in its deadline", () => {
  const h = projectHarness(["getRunningActionProgressState"], { runningCarryOverMinutes: 1 });
  h.state.runningLocalStarts.a = Date.parse("2026-10-13T15:01:00Z");
  h.state.runtimeState = { actionId: "a", startedAt: "2026-10-13T14:00:00Z" };
  const progress = h.context.getRunningActionProgressState(action());
  assert.equal(progress.elapsedMinutes, 1); assert.equal(progress.remainingSeconds, 600);
});

test("a failed background refresh preserves the running screen and clock readiness", async () => {
  const h = projectHarness(["loadActions"], { apiRequestWithTimeout: async () => { throw new Error("offline"); } });
  await h.context.loadActions({ silent: true });
  assert.equal(h.state.homeSnapshotReady, true); assert.equal(h.state.actions[0].status, "IN_PROGRESS");
});

test("an older response cannot replace a task started while the response was pending", async () => {
  const network = deferred();
  const h = projectHarness(["loadActions"], { apiRequestWithTimeout: () => network.promise });
  const loading = h.context.loadActions({ silent: true });
  h.context.actionsMutationGeneration++;
  network.resolve({ actions: [action("a", "PENDING")] }); await loading;
  assert.equal(h.state.actions[0].status, "IN_PROGRESS");
});

test("the latest load wins when two refreshes return out of order", async () => {
  const first = deferred(); const second = deferred(); let calls = 0;
  const h = projectHarness(["loadActions"], { apiRequestWithTimeout: () => (++calls === 1 ? first.promise : second.promise) });
  const one = h.context.loadActions({ silent: true }); const two = h.context.loadActions({ silent: true });
  second.resolve({ actions: [action("b")] }); await two;
  first.resolve({ actions: [action("a", "PENDING")] }); await one;
  assert.equal(h.state.actions[0].id, "b");
});

test("continuous mode starts the scheduled next action without a network round trip", async () => {
  const started = [];
  const h = projectHarness(["scheduleContinuousTaskTransition"], { getNextTimelineEntryForRunning: () => action("b"),
    getActiveTimeWindow: () => ({ endMs: Date.parse("2026-10-13T20:00:00Z") }),
    resetRunningCompletionState() {}, toggleActionStatus: async (id) => { started.push(id); } });
  h.state.options.continuousTasksEnabled = true; h.state.actions = [action("a", "COMPLETED")];
  h.context.scheduleContinuousTaskTransition(h.state.actions[0]);
  await [...h.timers.values()][0].fn(); assert.deepEqual(started, ["b"]);
});

test("muting countdown stops only its players and preserves the music playback", () => {
  let voicePaused = 0; let musicPaused = 0;
  const voice = { pause: () => voicePaused++, removeAttribute() {}, load() {} };
  const h = projectHarness(["clearRunningMinuteCuePlayers", "clearRunningMinuteCueTimers", "resetRunningMinuteCueState", "stopRunningMinuteCueSchedule"], {
    runningMinuteCuePlayers: [voice], runningMinuteCueWorker: { postMessage() {} },
    runningAudio: { paused: false, pause: () => musicPaused++ } });
  h.state.runningMinuteCue = { generation: 0, played: new Set() };
  h.context.stopRunningMinuteCueSchedule();
  assert.equal(voicePaused, 1); assert.equal(musicPaused, 0); assert.equal(h.state.actions[0].status, "IN_PROGRESS");
});

test("a stalled voice player releases the queue and removes its listeners", async () => {
  const listeners = new Map(); let paused = false;
  const audio = { play: () => new Promise(() => {}), pause: () => { paused = true; },
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const h = projectHarness(["playVoiceAudioWithTimeout"]);
  const playback = h.context.playVoiceAudioWithTimeout(audio);
  [...h.timers.values()][0].fn(); await playback;
  assert.equal(paused, true); assert.equal(listeners.size, 0);
});

test("the actual countdown mute click preserves task status, start time, and music", () => {
  let clicked; let cancelled = 0; let stoppedPropagation = 0;
  const h = projectHarness([], { runningTaskVoiceButton: { addEventListener: (_name, fn) => { clicked = fn; } },
    saveOptionsConfig() {}, renderRunningMinuteVoiceToggle() {}, stopRunningMinuteCueSchedule: () => cancelled++ });
  h.state.options.runningMinuteVoiceEnabled = true;
  const before = JSON.stringify(h.state.actions);
  const source = projectSource.match(/runningTaskVoiceButton\?\.addEventListener\("click",[^]*?\n}\);/)[0];
  vm.runInContext(source, h.context);
  const event = { stopPropagation: () => stoppedPropagation++ };
  clicked(event); assert.equal(h.state.options.runningMinuteVoiceEnabled, false);
  clicked(event); assert.equal(h.state.options.runningMinuteVoiceEnabled, true);
  assert.equal(cancelled, 1); assert.equal(stoppedPropagation, 2); assert.equal(JSON.stringify(h.state.actions), before);
});

test("finishing a cancelled old cue cannot clear the next activity's voice players", async () => {
  const speaking = deferred(); let cleared = 0;
  const oldPlayer = { currentTime: 0 };
  const nextPlayer = { currentTime: 0 };
  const h = projectHarness(["playRunningMinuteCuePlayers"], { runningMinuteCuePlayers: [oldPlayer],
    playVoiceAudioWithTimeout: () => speaking.promise, clearRunningMinuteCuePlayers: () => cleared++ });
  h.state.options.runningMinuteVoiceEnabled = true; h.state.runningMinuteCue = { actionId: "a", generation: 1 };
  const playing = h.context.playRunningMinuteCuePlayers(1, "a", "a", 1); await flush();
  h.state.runningMinuteCue = { actionId: "b", generation: 2, preparedKey: "b:1" };
  h.context.runningMinuteCuePlayers = [nextPlayer];
  speaking.resolve(); await playing;
  assert.equal(cleared, 0); assert.equal(h.state.runningMinuteCue.preparedKey, "b:1");
});

test("countdown has a page-timer fallback when its worker stops responding", () => {
  const prepared = [];
  const h = projectHarness(["scheduleRunningMinuteCueWorker"], { MINUTE_CUE_PRELOAD_SECONDS: 6,
    runningMinuteCueWorker: { postMessage() {} }, clearRunningMinuteCueTimers() {},
    prepareRunningMinuteCue: (...args) => prepared.push(args) });
  h.state.runningMinuteCue = { generation: 1, played: new Set() };
  const entry = { minute: 1, urls: ["voice.mp3"] };
  h.context.scheduleRunningMinuteCueWorker(entry, "a", "Estudar", 90);
  const timer = [...h.timers.values()][0];
  assert.equal(timer.ms, 84000); timer.fn();
  assert.equal(prepared.length, 1); assert.equal(prepared[0][1], "a");
});

test("worker messages and timers from before mute cannot match a new schedule", () => {
  let prepared = 0; const messages = [];
  const h = projectHarness(["scheduleRunningMinuteCueWorker"], { MINUTE_CUE_PRELOAD_SECONDS: 6,
    runningMinuteCueWorker: { postMessage: (message) => messages.push(message) }, clearRunningMinuteCueTimers() {},
    prepareRunningMinuteCue: () => prepared++ });
  h.state.runningMinuteCue = { generation: 1, played: new Set() };
  const entry = { minute: 1, urls: ["voice.mp3"] };
  h.context.scheduleRunningMinuteCueWorker(entry, "a", "Estudar", 90);
  const oldTimer = [...h.timers.values()][0];
  h.state.runningMinuteCue.generation = 2;
  h.context.scheduleRunningMinuteCueWorker(entry, "a", "Estudar", 90);
  assert.notEqual(messages[0].key, messages[1].key);
  oldTimer.fn(); assert.equal(prepared, 0);
});

test("saved task speech survives reload offline and is isolated by account", async () => {
  const cached = new Map(); let fetches = 0;
  const h = projectHarness(["getTaskSpeechCacheKey", "requestTaskSpeechBlob"], { location: { origin: "https://localhost" },
    getApiUrl: (url) => url, fetch: async () => { fetches++; return new Response("voice", { headers: { "Content-Type": "audio/mpeg" } }); } });
  h.win.caches = { open: async () => ({ match: async (key) => cached.get(key)?.clone(),
    put: async (key, response) => { cached.set(key, response); } }) };
  const request = { kind: "action", id: "a", title: "Estudar" };
  await h.context.requestTaskSpeechBlob(request);
  h.context.taskSpeechBlobCache.clear(); h.context.navigator.onLine = false;
  assert.equal(await (await h.context.requestTaskSpeechBlob(request)).text(), "voice");
  assert.equal(fetches, 1);
  h.context.getToken = () => "different-account";
  await assert.rejects(h.context.requestTaskSpeechBlob(request), /offline/);
});

test("preparing start speech does not occupy the minute queue or pause music", async () => {
  const pending = deferred(); let paused = 0;
  const h = projectHarness(["queueTaskSpeechSequence"], { syncTaskSpeechContext() {},
    requestTaskSpeechBlob: () => pending.promise, runningAudio: { paused: false, pause: () => paused++ } });
  h.context.queueTaskSpeechSequence([{ id: "a" }]);
  let minutePlayed = false;
  h.context.taskSpeechPlaybackQueue = h.context.taskSpeechPlaybackQueue.then(() => { minutePlayed = true; });
  await flush(); assert.equal(minutePlayed, true); assert.equal(paused, 0);
  h.context.taskSpeechGeneration++;
  pending.resolve(null); await flush();
});

test("cached minute voices remain usable offline after reload", async () => {
  let fetches = 0;
  const blob = new Blob(["voice"], { type: "audio/mpeg" });
  const cache = { match: async () => ({ blob: async () => blob }) };
  const h = projectHarness(["loadMinuteCueBlob"], { navigator: { onLine: false }, fetch: () => { fetches++; } });
  h.win.caches = { open: async () => cache };
  assert.equal(await h.context.loadMinuteCueBlob("https://audio.test/001.mp3"), blob);
  assert.equal(fetches, 0);
});

function backendHarness(initial) {
  let stored = { ...initial }; const transitions = [];
  const context = vm.createContext({ crypto, query: async (_sql, values) => {
    if (values?.length === 8) stored = { ...stored, status: values[3], startedAt: values[4], completedAt: values[5], completionPercent: values[6], accumulatedSeconds: values[7] };
    if (values?.length === 7 && _sql.includes("action_status_overrides")) stored = { ...stored, status: values[3], startedAt: values[4], completedAt: values[5], completionPercent: 100, accumulatedSeconds: values[6] };
    return { rows: [] };
  }, resolveProject200ProfileName: async (_user, name) => name, PROJECT200_DEFAULT_PROFILE_NAME: "Lucas", Date });
  vm.runInContext(actionsSource.replace(/^import[^\n]+\n/gm, "").replace(/export /g, ""), context);
  context.ensureActionsSchema = async () => {};
  context.getUserActionById = async () => ({ ...stored });
  context.upsertProject200RuntimeState = async (_id, event) => transitions.push(event);
  return { context, transitions, get stored() { return stored; } };
}

test("retrying the same offline start does not complete the server action", async () => {
  const h = backendHarness(action("a", "PENDING"));
  const payload = { status: "IN_PROGRESS", startedAt: "2026-10-13T15:00:00Z", occurredAt: "2026-10-13T15:00:00Z" };
  await h.context.updateUserActionStatus("user", "a", payload);
  await h.context.updateUserActionStatus("user", "a", payload);
  assert.equal(h.stored.status, "IN_PROGRESS"); assert.equal(h.transitions.length, 1);
  assert.equal(h.stored.startedAt, "2026-10-13T15:00:00.000Z");
});

test("delayed offline completion retains its real completion time on retry", async () => {
  const h = backendHarness(action());
  const payload = { mode: "direct_complete", completedAt: "2026-10-13T15:10:00Z" };
  await h.context.updateUserActionStatusManual("user", "a", payload);
  await h.context.updateUserActionStatusManual("user", "a", payload);
  assert.equal(h.transitions[0].occurredAt, "2026-10-13T15:10:00.000Z");
  assert.equal(h.transitions.length, 1);
});

test("replaying a free-time creation retains its identity and never restarts a completed interval", async () => {
  const interval = { ...action(crypto.randomUUID(), "PENDING"), categoryId: "free_time" };
  const h = backendHarness(interval);
  const payload = { clientActionId: interval.id, profile: interval.assignee, startAt: interval.startAt, endAt: interval.endAt };
  await h.context.createFreeTimeUserAction("user", payload);
  await h.context.createFreeTimeUserAction("user", payload);
  assert.equal(h.transitions.length, 1);
  await h.context.updateUserActionStatusManual("user", interval.id, { mode: "direct_complete", completedAt: interval.endAt });
  assert.equal((await h.context.createFreeTimeUserAction("user", payload)).status, "COMPLETED");
});

test("free-time identifiers cannot overwrite an unrelated action", async () => {
  const unrelated = action(crypto.randomUUID(), "PENDING");
  const h = backendHarness(unrelated);
  await assert.rejects(h.context.createFreeTimeUserAction("user", { clientActionId: unrelated.id, profile: unrelated.assignee,
    startAt: unrelated.startAt, endAt: unrelated.endAt }), /utilizado/);
  assert.equal(h.transitions.length, 0);
});

test("offline A finishes, B starts, and reconnecting preserves both session times", async () => {
  const offline = offlineHarness(); offline.win.navigator.onLine = false;
  const a = action("a", "PENDING");
  const b = { ...action("b", "PENDING"), startAt: a.endAt, endAt: "2026-10-13T15:20:00Z", startedAt: null };
  a.startedAt = null;
  const servers = new Map([[a.id, backendHarness(a)], [b.id, backendHarness(b)]]);
  const noop = () => {};
  const h = projectHarness(["buildOptimisticAction", "updateActionInState", "cacheCurrentActionsState", "setActionOptimisticSync",
    "toggleActionStatus", "completeActionImmediately", "performRunningFinalize", "scheduleContinuousTaskTransition",
    "getRunningActionProgressState", "getNextTimelineEntryForRunning", "loadActions"], {
    getServerNowMs: offline.now, resetRunningCompletionState: noop, startRunningTaskTicker: noop,
    openPrimaryRunningSurface: noop, closeActionsModalWithFade: noop, autoPlayRunningTaskDefaultPreference: noop,
    queueActionStartSpeech: noop, registerSystemEventFromActionTransition: noop, enqueueActionPointsUpdateFeedback: noop,
    loadStatsSummary: async () => {}, pendingActionsAnchorId: "", actionCompletionAnimationId: "",
    getActiveTimeWindow: () => ({ endMs: Date.parse("2026-10-13T20:00:00Z") }),
    apiRequest: (url, options) => offline.api.request(url, options, () => { throw new Error("offline"); }),
    apiRequestWithTimeout: (url, options) => offline.api.request(url, options, async () => ({
      actions: [...servers.values()].map((server) => server.stored), serverNow: new Date(offline.now()).toISOString() })),
  });
  h.win.Project200Offline = offline.api;
  h.state.options.continuousTasksEnabled = true; h.state.actions = [a, b];
  h.context.getRunningActionForSelectedProfile = () => h.state.actions.find((item) => item.status === "IN_PROGRESS") || null;
  h.context.buildActionTimelineEntries = () => h.state.actions;
  await h.context.toggleActionStatus("a", { skipDecision: true, ignoreRunningConflict: true });
  assert.equal(h.state.actions[0].startedAt, "2026-10-13T15:00:00.000Z");
  offline.advance(600000);
  assert.equal(h.context.getRunningActionProgressState(h.state.actions[0]).remainingSeconds, 0);
  await h.context.performRunningFinalize(h.state.actions[0]);
  await [...h.timers.values()].find((timer) => timer.ms === 300).fn();
  await flush();
  assert.equal(h.state.actions[0].status, "COMPLETED"); assert.equal(h.state.actions[1].status, "IN_PROGRESS");
  assert.equal(offline.api.pendingCount(), 3);
  offline.advance(60000);
  offline.win.navigator.onLine = true;
  offline.win.fetch = async (url, options) => {
    const id = url.match(/\/actions\/([^/]+)\//)[1]; const body = JSON.parse(options.body);
    const server = servers.get(id);
    const result = url.endsWith("/manual")
      ? await server.context.updateUserActionStatusManual("user", id, body)
      : await server.context.updateUserActionStatus("user", id, body);
    return { ok: true, json: async () => ({ action: result }) };
  };
  await offline.api.sync();
  await h.context.loadActions({ silent: true, forceNetwork: true });
  assert.equal(offline.api.pendingCount(), 0);
  assert.equal(h.state.actions[0].status, "COMPLETED"); assert.equal(h.state.actions[1].status, "IN_PROGRESS");
  assert.equal(h.context.getRunningActionProgressState(h.state.actions[1]).remainingSeconds, 540);
  assert.equal(servers.get("b").stored.startedAt, "2026-10-13T15:10:00.000Z");
});
