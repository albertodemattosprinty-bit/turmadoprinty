import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/200/project.js", import.meta.url), "utf8");
const now = Date.parse("2026-10-13T15:00:00Z");
const microtask = (id, title, extra = {}) => ({ id, title, scheduleMode: "periodic", intervalValue: 1,
  intervalUnit: "days", createdAt: "2026-10-12T15:00:00Z", nextDueAt: "2026-10-13T14:00:00Z", ...extra });
const folder = { id: "folder", title: "Pasta de estudos", isFolder: true, variants: [
  microtask("one", "Revisar inglês"), microtask("two", "Ler capítulo"),
  microtask("done", "Já concluída", { lastCompletedAt: "2026-10-13T14:00:00Z", nextDueAt: "2026-10-14T14:00:00Z" }),
  microtask("future", "Amanhã", { nextDueAt: "2026-10-14T14:00:00Z" })
] };

class Element {
  constructor() { this.dataset = {}; this.children = []; this.innerHTML = ""; this.hidden = false;
    this.style = { setProperty() {} }; this.classList = { add() {}, remove() {} }; }
  querySelectorAll() { return []; }
  querySelector(selector) { return this.parts?.[selector] || null; }
  setAttribute() {}
  appendChild(child) { this.children.push(child); }
}

function harness(extra = {}) {
  const panel = new Element(); const list = new Element();
  const state = { actionMissions: [structuredClone(folder)], activeOffset: 0, actionsMissionOnly: true,
    options: { missionActionsMode: "separate" }, missionRun: {} };
  const c = vm.createContext({ state, Date, console, actionsMissionsPanel: panel, actionsMissionsList: list,
    actionsList: new Element(), document: { createElement: () => new Element() },
    getServerNowMs: () => now, getToken: () => "test", normalizeMissionActionsMode: (value) => value,
    isLimitGoal: (goal) => goal?.goalKind === "limit", isMissionFolder: (goal) => Boolean(goal?.isFolder || goal?.variants?.length),
    isMissionScheduledForToday: (item) => !item.scheduleMode || new Date(item.nextDueAt).getTime() < Date.parse("2026-10-14T00:00:00Z"),
    normalizeMissionVariantScheduleMode: (value) => value,
    alignMissionVariantNextDueDate: (value) => new Date(value),
    sortMissionVariants: (items) => items,
    getActionsMissionProgress: () => ({ progress: 0, target: 1, percent: 0 }),
    getMissionExpectation: () => ({ tone: "blue" }), getMissionDisplayIcon: () => ({ src: "icon.svg", alt: "Ícone" }),
    escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;"),
    animateProgressFillWidth() {}, getActiveTimeWindow: () => ({ dateKey: "2026-10-13" }), buildMissionScheduleUnits: () => [],
    isActionsMissionMutedForDate: () => false, getMissionInstallmentVisual: () => ({ className: "blue", rgb: "0, 0, 255" }),
    getAvailableMissionById: (id) => state.actionMissions.find((goal) => goal.id === id),
    ...extra });
  const names = ["getMissionVariantTiming", "getPendingActionsMicrotasks", "getActionsMissionEntries", "renderActionsMissionsPanel",
    "buildMissionInstallments", "buildActionsDynamicMissionDeckEntries", "createActionsDynamicMissionDeck", "openActionsMissionEntry"];
  vm.runInContext(names.map((name) => {
    const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}\\r?\\n`));
    assert.ok(match, name); return match[0];
  }).join("\n"), c);
  return { c, state, list };
}

test("folder contributes individual pending microtasks and excludes completed and future cycles", () => {
  const { c, state } = harness();
  state.actionMissions.push({ id: "simple", title: "Missão simples" }, { id: "empty", isFolder: true, variants: [] },
    { id: "limit", goalKind: "limit", title: "Limite" });
  const entries = c.getActionsMissionEntries();
  assert.deepEqual(Array.from(entries, (entry) => entry.title), ["Revisar inglês", "Ler capítulo", "Missão simples"]);
  assert.deepEqual(Array.from(entries, (entry) => entry.key), ["folder:one", "folder:two", "simple"]);
});

test("separate Actions panel renders microtask names and retains their parent and child identities", () => {
  const { c, list } = harness(); c.renderActionsMissionsPanel();
  assert.equal(list.children.length, 2);
  assert.match(list.children[0].innerHTML, /<h3>Revisar inglês<\/h3>/);
  assert.match(list.children[1].innerHTML, /<h3>Ler capítulo<\/h3>/);
  assert.doesNotMatch(list.children.map((card) => card.innerHTML).join(""), /Pasta de estudos|Já concluída|Amanhã/);
  assert.equal(list.children[0].dataset.actionsMissionGoalId, "folder");
  assert.equal(list.children[0].dataset.missionVariantId, "one");
});

test("dynamic schedule keeps both microtasks in one folder using their actual due dates", () => {
  const { c } = harness(); const entries = c.buildMissionInstallments();
  assert.equal(entries.length, 2);
  assert.equal(c.buildActionsDynamicMissionDeckEntries(entries).length, 2);
  assert.equal(entries[0].dueAtMs, Date.parse(folder.variants[0].nextDueAt));
  assert.notEqual(entries[0].id, entries[1].id);
});

test("dynamic deck replaces folder title and aggregate progress with the pending microtask", () => {
  const { c } = harness({ createMissionCard: () => {
    const card = new Element(); card.parts = { '.history-mission-card-title': { textContent: folder.title },
      '.history-mission-card-progress': { textContent: '2 de 4' }, '.history-mission-progress-fill': { style: { width: '50%' } } };
    return card;
  } });
  const deck = c.createActionsDynamicMissionDeck(c.buildMissionInstallments());
  const cards = deck.children[0].children;
  const byVariant = new Map(cards.map((card) => [card.dataset.missionVariantId, card]));
  assert.equal(byVariant.get("one").parts['.history-mission-card-title'].textContent, "Revisar inglês");
  assert.equal(byVariant.get("two").parts['.history-mission-card-title'].textContent, "Ler capítulo");
  assert.equal(byVariant.get("two").parts['.history-mission-card-progress'].textContent, "Pendente");
});

test("clicking a microtask starts that exact child while ordinary missions keep their entry flow", () => {
  const started = []; const opened = [];
  const { c, state } = harness({ beginMissionRun: (goal, variant) => started.push([goal.id, variant.id]),
    openMissionEntryModal: (id) => opened.push(id), renderActions() {} });
  c.openActionsMissionEntry("folder", "two");
  c.openActionsMissionEntry("simple");
  c.openActionsMissionEntry("folder", "done");
  assert.deepEqual(started, [["folder", "two"]]); assert.deepEqual(opened, ["simple"]);
  assert.equal(state.missionRun.availableVariants.length, 4);
});

test("when a microtask is completed, it leaves Actions and the other pending child remains", () => {
  const { c, state } = harness();
  state.actionMissions[0].variants[0].lastCompletedAt = "2026-10-13T15:00:00Z";
  state.actionMissions[0].variants[0].nextDueAt = "2026-10-14T15:00:00Z";
  assert.deepEqual(Array.from(c.getActionsMissionEntries(), (entry) => entry.variant.id), ["two"]);
});
