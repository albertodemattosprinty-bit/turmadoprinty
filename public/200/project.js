import { getApiUrl } from "../api.js";

const tokenKey = "turma_do_printy_token";
const projectProfileKey = "project_200_profile_v1";
const sleepConfigKey = "project_200_sleep_v1";
const defaultSaldoGoalCents = 1000000;
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const actionStatuses = {
  pending: "PENDING",
  inProgress: "IN_PROGRESS",
  completed: "COMPLETED"
};
const assigneeOptions = ["Rose", "Geral", "Alberto", "Lucas", "Thainan"];
const statsScopes = [
  { key: "general", label: "Geral" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta semana" },
  { key: "last15", label: "Ultimos 15 dias" },
  { key: "last30", label: "Ultimos 30 dias" },
  { key: "month-01", label: "Janeiro" },
  { key: "month-02", label: "Fevereiro" },
  { key: "month-03", label: "Marco" },
  { key: "month-04", label: "Abril" },
  { key: "month-05", label: "Maio" },
  { key: "month-06", label: "Junho" },
  { key: "month-07", label: "Julho" },
  { key: "month-08", label: "Agosto" },
  { key: "month-09", label: "Setembro" },
  { key: "month-10", label: "Outubro" },
  { key: "month-11", label: "Novembro" },
  { key: "month-12", label: "Dezembro" }
];
const actionAvatarByAssignee = {
  Rose: "/200/avatars/rose.png",
  Geral: "/200/avatars/familyplan.png",
  Alberto: "/200/avatars/alberto.png",
  Lucas: "/200/avatars/lucas.png",
  Thainan: "/200/avatars/thainan.png",
  Wilton: "/200/avatars/wilton.png"
};
const platformIncomeCategories = ["Eventos", "Inscricoes", "Apoiadores", "Site", "Venda de ativo", "Direitos autorais"];
const platformExpenseCategories = ["Alimentacao", "Aluguel", "Carro", "Eventos", "Servicos casa", "Anuncios", "Plataformas", "Lazer", "Vestuario", "Saude", "Imprevistos", "Emprestimos e Juros"];
const platformCategoryIconByName = {
  Alimentacao: "/200/icons/alimentacao.svg",
  Aluguel: "/200/icons/aluguel.svg",
  Carro: "/200/icons/carro.svg",
  Eventos: "/200/icons/eventos.svg",
  "Servicos casa": "/200/icons/servicos-casa.svg",
  Anuncios: "/200/icons/anuncios.svg",
  Plataformas: "/200/icons/plataformas.svg",
  Lazer: "/200/icons/lazer.svg",
  Inscricoes: "/200/icons/inscricoes.svg",
  Apoiadores: "/200/icons/apoiadores.svg",
  Site: "/200/icons/site.svg",
  "Venda de ativo": "/200/icons/venda-de-ativo.svg",
  "Direitos autorais": "/200/icons/direitos-autorais.svg",
  Vestuario: "/200/icons/vestuario.svg",
  Saude: "/200/icons/saude.svg",
  Imprevistos: "/200/icons/imprevistos.svg",
  "Emprestimos e Juros": "/200/icons/emprestimos-juros.svg"
};
const constitutionDefaultText = "O Projeto Família é o nosso principal e mais importante projeto, ele visa bem estar, segurança em um projeto contínuo de longo prazo, todos os envolvidos se comprometem a concluir de boa vontade as propostas descritas no projeto";
const financePeriods = [
  { key: "total", label: "Total" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta semana" },
  { key: "last15", label: "Ultimos 15 dias" },
  { key: "last30", label: "Ultimos 30 dias" },
  { key: "month-01", label: "Janeiro" },
  { key: "month-02", label: "Fevereiro" },
  { key: "month-03", label: "Marco" },
  { key: "month-04", label: "Abril" },
  { key: "month-05", label: "Maio" },
  { key: "month-06", label: "Junho" },
  { key: "month-07", label: "Julho" },
  { key: "month-08", label: "Agosto" },
  { key: "month-09", label: "Setembro" },
  { key: "month-10", label: "Outubro" },
  { key: "month-11", label: "Novembro" },
  { key: "month-12", label: "Dezembro" }
];
const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const monthlyOrdinalLabels = ["Primeira", "Segunda", "Terceira", "Quarta", "Última"];
const monthlyWeekdayLabels = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const recurrenceDays = {
  none: [],
  daily: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5]
};
const historySpeakerOptions = ["Rose", "Alberto", "Lucas", "Thainan"];
const selectableProfiles = ["Rose", "Alberto", "Lucas", "Thainan"];
const profileTintByName = {
  Alberto: "linear-gradient(145deg, rgba(2, 27, 77, 0.7), rgba(11, 61, 168, 0.7))",
  Rose: "linear-gradient(145deg, rgba(31, 78, 216, 0.7), rgba(234, 76, 137, 0.7))",
  Lucas: "linear-gradient(145deg, rgba(79, 195, 247, 0.7), rgba(212, 160, 23, 0.7))",
  Thainan: "linear-gradient(145deg, rgba(0, 184, 169, 0.7), rgba(138, 92, 255, 0.7))"
};

const activeDateLabel = document.getElementById("activeDateLabel");
const actionsAuthAlert = document.getElementById("actionsAuthAlert");
const actionsList = document.getElementById("actionsList");
const actionsProgress = document.getElementById("actionsProgress");
const actionsProgressLabel = document.getElementById("actionsProgressLabel");
const actionsProgressMinutes = document.getElementById("actionsProgressMinutes");
const actionsProgressFill = document.getElementById("actionsProgressFill");
const financeDateLabel = document.getElementById("financeDateLabel");
const platformEntriesList = document.getElementById("platformEntriesList");
const financeEntryConfirmWizard = document.getElementById("financeEntryConfirmWizard");
const closeFinanceEntryConfirmButton = document.getElementById("closeFinanceEntryConfirm");
const financeEntryConfirmCard = document.getElementById("financeEntryConfirmCard");
const financeEntryConfirmName = document.getElementById("financeEntryConfirmName");
const financeEntryConfirmValue = document.getElementById("financeEntryConfirmValue");
const financeEntryConfirmMeta = document.getElementById("financeEntryConfirmMeta");
const financeEntryConfirmCancel = document.getElementById("financeEntryConfirmCancel");
const financeEntryConfirmApply = document.getElementById("financeEntryConfirmApply");
const platformMonthlyIncome = document.getElementById("platformMonthlyIncome");
const platformMonthlyExpense = document.getElementById("platformMonthlyExpense");
const platformExpenseCard = document.getElementById("platformExpenseCard");
const platformIncomeCard = document.getElementById("platformIncomeCard");
const platformSaldoCard = document.getElementById("platformSaldoCard");
const platformRealizedBalance = document.getElementById("platformRealizedBalance");
const platformBalanceValue = document.getElementById("platformBalanceValue");
const togglePlatformBalanceButton = document.getElementById("togglePlatformBalance");
const addPlatformBalanceButton = document.getElementById("addPlatformBalance");
const openPlatformWizardButton = document.getElementById("openPlatformWizard");
const platformWizard = document.getElementById("platformWizard");
const closePlatformWizardButton = document.getElementById("closePlatformWizard");
const platformForm = document.getElementById("platformForm");
const platformWizardStepLabel = document.getElementById("platformWizardStepLabel");
const platformWizardMessage = document.getElementById("platformWizardMessage");
const platformWizardBackButton = document.getElementById("platformWizardBack");
const platformWizardNextButton = document.getElementById("platformWizardNext");
const platformWizardAiCreateButton = document.getElementById("platformWizardAiCreate");
const platformNameInput = document.getElementById("platformName");
const platformNameMicButton = document.getElementById("platformNameMicButton");
const platformValueInput = document.getElementById("platformValue");
const platformCategoryRow = document.getElementById("platformCategoryRow");
const platformRecurrenceDayLabel = document.getElementById("platformRecurrenceDayLabel");
const statsScopeLabel = document.getElementById("statsScopeLabel");
const statsGeneralGoals = document.getElementById("statsGeneralGoals");
const statsDailyGoalProgress = document.getElementById("statsDailyGoalProgress");
const statsMonthlyGoalProgress = document.getElementById("statsMonthlyGoalProgress");
const statsRecurringGoalProgress = document.getElementById("statsRecurringGoalProgress");
const statsGeneralAvatar = document.getElementById("statsGeneralAvatar");
const statsGeneralDetail = document.getElementById("statsGeneralDetail");
const statsRankingList = document.getElementById("statsRankingList");
const editStatsGoalsButton = document.getElementById("editStatsGoals");
const openActionWizardButton = document.getElementById("openActionWizard");
const actionWizard = document.getElementById("actionWizard");
const closeActionWizardButton = document.getElementById("closeActionWizard");
const actionForm = document.getElementById("actionForm");
const wizardStepLabel = document.getElementById("wizardStepLabel");
const wizardBackButton = document.getElementById("wizardBack");
const wizardNextButton = document.getElementById("wizardNext");
const wizardMessage = document.getElementById("wizardMessage");
const taskTitle = document.getElementById("taskTitle");
const wizardDateLabel = document.getElementById("wizardDateLabel");
const wizardDatePickerWrap = document.getElementById("wizardDatePickerWrap");
const repeatToggle = document.getElementById("repeatToggle");
const repeatBox = document.getElementById("repeatBox");
const weekdayRow = document.getElementById("weekdayRow");
const repeatPeriodicBox = document.getElementById("repeatPeriodicBox");
const periodicEveryLabel = document.getElementById("periodicEveryLabel");
const avoidSaturdayInput = document.getElementById("avoidSaturday");
const avoidSundayInput = document.getElementById("avoidSunday");
const repeatMonthlyCustomBox = document.getElementById("repeatMonthlyCustomBox");
const monthlyOrdinalLabel = document.getElementById("monthlyOrdinalLabel");
const monthlyWeekdayLabel = document.getElementById("monthlyWeekdayLabel");
const repeatModeButtons = document.getElementById("repeatModeButtons");
const repeatModeBackButton = document.getElementById("repeatModeBackButton");
const financeIntroTitle = document.getElementById("financeIntroTitle");
const financePeriodPicker = document.getElementById("financePeriodPicker");
const financePeriodPrev = document.getElementById("financePeriodPrev");
const financePeriodNext = document.getElementById("financePeriodNext");
const financePeriodLabel = document.getElementById("financePeriodLabel");
const financeDashboard = document.getElementById("financeDashboard");
const financeStatus = document.getElementById("financeStatus");
const financeSalesLabel = document.getElementById("financeSalesLabel");
const financeTotalSales = document.getElementById("financeTotalSales");
const financeSubscribers = document.getElementById("financeSubscribers");
const financeMonthlyRevenue = document.getElementById("financeMonthlyRevenue");
const constitutionVersionLabel = document.getElementById("constitutionVersionLabel");
const constitutionAuthAlert = document.getElementById("constitutionAuthAlert");
const constitutionTextView = document.getElementById("constitutionTextView");
const constitutionMessage = document.getElementById("constitutionMessage");
const constitutionAvatars = document.getElementById("constitutionAvatars");
const openConstitutionEditButton = document.getElementById("openConstitutionEdit");
const constitutionEditWrap = document.getElementById("constitutionEditWrap");
const constitutionEditor = document.getElementById("constitutionEditor");
const saveConstitutionEditButton = document.getElementById("saveConstitutionEdit");
const cancelConstitutionEditButton = document.getElementById("cancelConstitutionEdit");
const historyDateLabel = document.getElementById("historyDateLabel");
const historyTimelineList = document.getElementById("historyTimelineList");
const openHistoryTextComposerButton = document.getElementById("openHistoryTextComposer");
const historyTextComposer = document.getElementById("historyTextComposer");
const closeHistoryTextComposerButton = document.getElementById("closeHistoryTextComposer");
const historyTextStepLabel = document.getElementById("historyTextStepLabel");
const historyTextForm = document.getElementById("historyTextForm");
const historyTextBackButton = document.getElementById("historyTextBack");
const historyTextNextButton = document.getElementById("historyTextNext");
const historyTextAvatarGrid = document.getElementById("historyTextAvatarGrid");
const historyMicButton = document.getElementById("historyMicButton");
const actionMicButton = document.getElementById("actionMicButton");
const actionVoiceStatus = document.getElementById("actionVoiceStatus");
const actionAiConfirm = document.getElementById("actionAiConfirm");
const actionAiConfirmTitle = document.getElementById("actionAiConfirmTitle");
const actionAiConfirmStart = document.getElementById("actionAiConfirmStart");
const actionAiConfirmEnd = document.getElementById("actionAiConfirmEnd");
const actionAiConfirmDates = document.getElementById("actionAiConfirmDates");
const actionAiEditButton = document.getElementById("actionAiEdit");
const actionAiApplyButton = document.getElementById("actionAiApply");
const actionAiEditDatesButton = document.getElementById("actionAiEditDates");
const actionAiRenameMicButton = document.getElementById("actionAiRenameMic");
const actionStatusWizard = document.getElementById("actionStatusWizard");
const closeActionStatusWizardButton = document.getElementById("closeActionStatusWizard");
const actionStatusOptionsStep = document.getElementById("actionStatusOptionsStep");
const actionStatusManualStep = document.getElementById("actionStatusManualStep");
const actionRestoreButton = document.getElementById("actionRestoreButton");
const actionManualFinishButton = document.getElementById("actionManualFinishButton");
const actionManualBackButton = document.getElementById("actionManualBackButton");
const actionManualSaveButton = document.getElementById("actionManualSaveButton");
const actionStatusWizardMessage = document.getElementById("actionStatusWizardMessage");
const actionStatusManualMessage = document.getElementById("actionStatusManualMessage");
const manualStartTimeInput = document.getElementById("manualStartTime");
const manualEndTimeInput = document.getElementById("manualEndTime");
const historyDeleteWordButton = document.getElementById("historyDeleteWordButton");
const historyClearTextButton = document.getElementById("historyClearTextButton");
const historyVoiceStatus = document.getElementById("historyVoiceStatus");
const historyLiveText = document.getElementById("historyLiveText");
const historyReadTitle = document.getElementById("historyReadTitle");
const historyReadBody = document.getElementById("historyReadBody");
const homeDateTimeLabel = document.getElementById("homeDateTimeLabel");
const openRunningTaskModalButton = document.getElementById("openRunningTaskModal");
const runningTaskName = document.getElementById("runningTaskName");
const runningTaskProgressRing = document.getElementById("runningTaskProgressRing");
const runningTaskPercent = document.getElementById("runningTaskPercent");
const runningTaskMinutesLeft = document.getElementById("runningTaskMinutesLeft");
const runningTaskNextName = document.getElementById("runningTaskNextName");
const runningTaskFinalizeButton = document.getElementById("runningTaskFinalizeButton");
const runningTaskStartNextButton = document.getElementById("runningTaskStartNextButton");
const actionsModal = document.getElementById("actionsModal");
const dayDonePercent = document.getElementById("dayDonePercent");
const dayDoneDelay = document.getElementById("dayDoneDelay");
const startDecisionModal = document.getElementById("startDecisionModal");
const closeStartDecisionModal = document.getElementById("closeStartDecisionModal");
const startDecisionTarget = document.getElementById("startDecisionTarget");
const startDecisionCurrent = document.getElementById("startDecisionCurrent");
const startDecisionActions = document.getElementById("startDecisionActions");
const sleepConfigModal = document.getElementById("sleepConfigModal");
const sleepStartLabel = document.getElementById("sleepStartLabel");
const sleepEndLabel = document.getElementById("sleepEndLabel");
const saveSleepConfigBtn = document.getElementById("saveSleepConfigBtn");
const overlapWizard = document.getElementById("overlapWizard");
const closeOverlapWizard = document.getElementById("closeOverlapWizard");
const overlapTaskTitle = document.getElementById("overlapTaskTitle");
const overlapTaskRange = document.getElementById("overlapTaskRange");
const overlapReplaceButton = document.getElementById("overlapReplaceButton");
const overlapFreePrev = document.getElementById("overlapFreePrev");
const overlapFreeNext = document.getElementById("overlapFreeNext");
const overlapFreeStartLabel = document.getElementById("overlapFreeStartLabel");
const overlapApplyFreeButton = document.getElementById("overlapApplyFreeButton");
const overlapChangeTimeButton = document.getElementById("overlapChangeTimeButton");
const project200LoginOverlay = document.getElementById("project200LoginOverlay");
const project200LoginForm = document.getElementById("project200LoginForm");
const project200Username = document.getElementById("project200Username");
const project200Password = document.getElementById("project200Password");
const project200LoginMessage = document.getElementById("project200LoginMessage");
const profileLinkOverlay = document.getElementById("profileLinkOverlay");
const profileLinkForm = document.getElementById("profileLinkForm");
const profileLinkUsername = document.getElementById("profileLinkUsername");
const profileLinkTargetLabel = document.getElementById("profileLinkTargetLabel");
const profileLinkMessage = document.getElementById("profileLinkMessage");
const profileLinkCancel = document.getElementById("profileLinkCancel");
const profileButtons = Array.from(document.querySelectorAll("[data-profile]"));
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let financeTimer = null;
let platformMetricsTicker = null;
let longPressTimer = null;
let longPressHandledActionId = "";
let platformLongPressTimer = null;
let platformLongPressHandledOccurrenceId = "";
let actionsDelayTicker = null;
let historyDeleteHoldTimer = null;
let historyDeleteHoldInterval = null;
let historyMediaRecorder = null;
let historyMediaStream = null;
let historyAudioContext = null;
let historyAudioAnalyser = null;
let historySpeechMonitorTimer = null;
let historyLastSpeechAt = 0;
let financeEntryConfirmResolve = null;
let actionMediaRecorder = null;
let actionMediaStream = null;
let actionAudioContext = null;
let actionAudioAnalyser = null;
let actionSpeechMonitorTimer = null;
let actionLastSpeechAt = 0;
let actionPendingAiPayload = null;
let actionStatusTargetId = "";
let runningTaskTicker = null;
let pendingActionsAnchorId = "";
let runningCarryOverMinutes = 0;
let actionsTimeTicker = null;
let actionsTimeShowDuration = false;
let timeButtonHoldTimer = null;
let timeButtonHoldInterval = null;
let periodicHoldTimer = null;
let periodicHoldInterval = null;
let platformNameMediaRecorder = null;
let platformNameMediaStream = null;
let platformNameAudioContext = null;
let platformNameAudioAnalyser = null;
let platformNameSpeechMonitorTimer = null;
let platformNameLastSpeechAt = 0;
let overlapCarouselTimer = null;
let profileHoldTimer = null;
let profileLongPressHandledProfile = "";
let profileLinkTarget = "";
let profilePressStartedAt = 0;
let profilePressProfile = "";
let sleepNavHoldTimer = null;
let sleepNavHoldInterval = null;
let sleepNavLongPressHandled = false;
let startDecisionResolver = null;

const state = {
  activeOffset: 0,
  platformOffset: 0,
  statsScopeIndex: 0,
  financePeriodIndex: 0,
  platformEntries: [],
  platformMonthly: {
    incomeCents: 0,
    expenseCents: 0
  },
  platformBalanceCents: 0,
  platformBalanceHidden: false,
  platformMetricIndex: 0,
  platformBaseIncomeCents: 0,
  statsSummary: null,
  statsGoals: null,
  statsRanking: [],
  statsGeneral: null,
  constitutionVersions: [],
  constitutionIndex: 0,
  constitutionEditing: false,
  actions: [],
  historySystem: [],
  historyTexts: [],
  selectedProfile: "Rose",
  profileLock: "",
  historyOffset: 0,
  historyTextComposer: {
    step: 1,
    speaker: "Rose",
    liveText: "",
    organizedText: "",
    organizedTitle: "",
    micActive: false
  },
  platformWizard: buildInitialPlatformWizardState(),
  wizard: buildInitialWizardState(),
  sleepConfig: { startHour: 23, startMinute: 0, endHour: 8, endMinute: 0 },
  overlapResolver: null,
  overlapItems: [],
  overlapIndex: 0,
  overlapCandidateStarts: [],
  overlapCandidateIndex: 0
};

function loadSleepConfig() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(sleepConfigKey) || "{}");
    state.sleepConfig.startHour = Number.isFinite(parsed.startHour) ? parsed.startHour : 23;
    state.sleepConfig.startMinute = Number.isFinite(parsed.startMinute) ? parsed.startMinute : 0;
    state.sleepConfig.endHour = Number.isFinite(parsed.endHour) ? parsed.endHour : 8;
    state.sleepConfig.endMinute = Number.isFinite(parsed.endMinute) ? parsed.endMinute : 0;
  } catch {}
}

function saveSleepConfig() {
  window.localStorage.setItem(sleepConfigKey, JSON.stringify(state.sleepConfig));
}

function getToken() {
  return window.localStorage.getItem(tokenKey) || "";
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
  } else {
    window.localStorage.removeItem(tokenKey);
  }
}

function readSelectedProfile() {
  const saved = String(window.localStorage.getItem(projectProfileKey) || "Rose");
  return selectableProfiles.includes(saved) ? saved : "Rose";
}

function refreshProfileLockFromAuth(authUser) {
  const lockedProfile = String(authUser?.project200Profile || "").trim();
  state.profileLock = selectableProfiles.includes(lockedProfile) ? lockedProfile : "";
}

function renderProfileFooterVisibility() {
  const lockedProfile = String(state.profileLock || "").trim();
  profileButtons.forEach((button) => {
    if (!lockedProfile) {
      button.hidden = false;
      return;
    }
    button.hidden = button.dataset.profile !== lockedProfile;
  });
}

function applySelectedProfile(profile) {
  if (state.profileLock && profile !== state.profileLock) {
    return;
  }
  const next = selectableProfiles.includes(profile) ? profile : "Rose";
  const nextTint = profileTintByName[next] || profileTintByName.Rose;
  const root = document.documentElement;
  root.style.setProperty("--app-tint-next", nextTint);
  root.style.setProperty("--app-next-opacity", "1");
  window.setTimeout(() => {
    root.style.setProperty("--app-tint-current", nextTint);
    root.style.setProperty("--app-next-opacity", "0");
  }, 1500);
  state.selectedProfile = next;
  document.body.dataset.profile = next;
  window.localStorage.setItem(projectProfileKey, next);
  profileButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.profile === next);
  });
  renderProfileFooterVisibility();
  renderHomeRunningTask();
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateFromOffset(offset) {
  return addDays(todayStart(), offset);
}

function getVisibleActions() {
  return state.actions.filter((action) => normalizeAssigneeName(action.assignee) === state.selectedProfile);
}

function getRunningActionForSelectedProfile() {
  const list = getVisibleActions();
  return list.find((action) => normalizeActionStatus(action?.status) === actionStatuses.inProgress) || null;
}

function buildActionTimelineEntries() {
  const visibleActions = getVisibleActions()
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const entries = [];
  const baseDate = dateFromOffset(state.activeOffset);
  const dayStart = new Date(baseDate);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(baseDate);
  dayEnd.setHours(23, 59, 59, 999);
  let cursor = dayStart.getTime();

  const sleepStart = new Date(baseDate);
  sleepStart.setHours(state.sleepConfig.startHour, state.sleepConfig.startMinute, 0, 0);
  const sleepEnd = new Date(sleepStart);
  sleepEnd.setDate(sleepEnd.getDate() + 1);
  sleepEnd.setHours(state.sleepConfig.endHour, state.sleepConfig.endMinute, 0, 0);

  for (const action of visibleActions) {
    const startMs = new Date(action.startAt).getTime();
    const endMs = new Date(action.endAt).getTime();
    if (Number.isFinite(startMs) && startMs > cursor) {
      entries.push({
        kind: "free",
        id: `free-${cursor}-${startMs}`,
        startAt: new Date(cursor).toISOString(),
        endAt: new Date(startMs).toISOString(),
        title: "Tempo livre"
      });
    }
    entries.push({ kind: "action", ...action });
    if (Number.isFinite(endMs)) {
      cursor = Math.max(cursor, endMs);
    }
  }

  if (cursor < dayEnd.getTime()) {
    entries.push({
      kind: "free",
      id: `free-${cursor}-${dayEnd.getTime()}`,
      startAt: new Date(cursor).toISOString(),
      endAt: new Date(dayEnd).toISOString(),
      title: "Tempo livre"
    });
  }

  const sleepStartClamped = Math.max(dayStart.getTime(), sleepStart.getTime());
  const sleepEndClamped = Math.min(dayEnd.getTime(), sleepEnd.getTime());
  if (sleepEndClamped > sleepStartClamped) {
    entries.push({
      kind: "sleep",
      id: "sleep-fixed",
      startAt: new Date(sleepStartClamped).toISOString(),
      endAt: new Date(sleepEndClamped).toISOString(),
      title: "Descanso"
    });
  }
  const normalized = [];
  const sleepEntry = entries.find((entry) => entry.kind === "sleep");
  for (const entry of entries) {
    if (entry.kind !== "free" || !sleepEntry) {
      normalized.push(entry);
      continue;
    }
    const freeStart = new Date(entry.startAt).getTime();
    const freeEnd = new Date(entry.endAt).getTime();
    const sleepStartMs = new Date(sleepEntry.startAt).getTime();
    const sleepEndMs = new Date(sleepEntry.endAt).getTime();
    if (freeEnd <= sleepStartMs || freeStart >= sleepEndMs) {
      normalized.push(entry);
      continue;
    }
    if (freeStart < sleepStartMs) {
      normalized.push({ ...entry, id: `${entry.id}-a`, endAt: new Date(sleepStartMs).toISOString() });
    }
    if (freeEnd > sleepEndMs) {
      normalized.push({ ...entry, id: `${entry.id}-b`, startAt: new Date(sleepEndMs).toISOString() });
    }
  }

  return normalized
    .filter((entry) => getActionDurationMinutes(entry) > 0)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function getRunningActionProgressState(action) {
  if (!action) {
    return { percent: 0, remainingMinutes: 0 };
  }
  const durationMinutes = getActionDurationMinutes(action);
  if (!durationMinutes) {
    return { percent: 0, remainingMinutes: 0 };
  }
  const startedAtMs = new Date(action?.startedAt || action?.startAt).getTime();
  if (!Number.isFinite(startedAtMs)) {
    return { percent: 0, remainingMinutes: durationMinutes };
  }
  const elapsedMinutes = Math.max(0, (Date.now() - startedAtMs) / (60 * 1000));
  const totalBudget = durationMinutes + Math.max(0, Number(runningCarryOverMinutes || 0));
  const remainingBudget = Math.max(0, Math.ceil(totalBudget - elapsedMinutes));
  const percent = totalBudget > 0 ? Math.max(0, Math.min(100, Math.round((elapsedMinutes / totalBudget) * 100))) : 0;
  const startAtMs = new Date(action?.startAt).getTime();
  const scheduleDeltaMinutes = Number.isFinite(startAtMs)
    ? Math.round((startedAtMs - startAtMs) / (60 * 1000))
    : 0;
  return { percent, remainingMinutes: remainingBudget, elapsedMinutes, durationMinutes, scheduleDeltaMinutes };
}

function formatSignedDelay(minutesValue) {
  const total = Math.abs(Number(minutesValue || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const sign = Number(minutesValue || 0) >= 0 ? "-" : "+";
  return `${sign}${hours} horas e ${String(minutes).padStart(2, "0")} minutos`;
}

function getNextActionForRunning(action) {
  if (!action) {
    return null;
  }
  const runningStartMs = new Date(action.startAt).getTime();
  if (!Number.isFinite(runningStartMs)) {
    return null;
  }
  const list = getVisibleActions()
    .filter((item) => item.id !== action.id)
    .filter((item) => normalizeActionStatus(item.status) === actionStatuses.pending)
    .filter((item) => {
      const startMs = new Date(item.startAt).getTime();
      return Number.isFinite(startMs) && startMs > runningStartMs;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return list[0] || null;
}

function getNextTimelineEntryForRunning(action) {
  if (!action) return null;
  const currentStart = new Date(action.startAt).getTime();
  if (!Number.isFinite(currentStart)) return null;
  const timeline = buildActionTimelineEntries()
    .filter((entry) => entry.kind === "free" || entry.kind === "sleep" || normalizeActionStatus(entry.status) === actionStatuses.pending)
    .filter((entry) => {
      if (entry.id === action.id) return false;
      const start = new Date(entry.startAt).getTime();
      return Number.isFinite(start) && start > currentStart;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return timeline[0] || null;
}

function getLatestCompletedActionForSelectedProfile() {
  return getVisibleActions()
    .filter((item) => normalizeActionStatus(item.status) === actionStatuses.completed)
    .sort((a, b) => {
      const aTs = new Date(a.completedAt || a.statusUpdatedAt || a.endAt || 0).getTime();
      const bTs = new Date(b.completedAt || b.statusUpdatedAt || b.endAt || 0).getTime();
      return bTs - aTs;
    })[0] || null;
}

function anchorToLastCompletedAction() {
  const targetId = String(pendingActionsAnchorId || "").trim();
  if (!targetId || !actionsList) {
    return;
  }
  const row = actionsList.querySelector(`[data-action-id="${targetId}"]`);
  if (!row) {
    return;
  }
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderHomeRunningTask() {
  const action = getRunningActionForSelectedProfile();
  const hasRunning = Boolean(action);
  if (openRunningTaskModalButton) {
    openRunningTaskModalButton.hidden = !hasRunning;
  }
  if (!runningTaskName || !runningTaskProgressRing || !runningTaskPercent || !runningTaskMinutesLeft || !runningTaskNextName) {
    return;
  }
  if (!hasRunning) {
    runningTaskName.textContent = "Sem tarefa em execução.";
    runningTaskProgressRing.style.strokeDashoffset = "301.59";
    runningTaskPercent.textContent = "0%";
    runningTaskMinutesLeft.textContent = "0 minutos restantes";
    runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
    runningTaskNextName.textContent = "Próxima tarefa será exibida aqui";
    return;
  }
  const { percent, elapsedMinutes, durationMinutes, scheduleDeltaMinutes } = getRunningActionProgressState(action);
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference * (1 - (percent / 100));
  const nextAction = getNextTimelineEntryForRunning(action);
  runningTaskName.textContent = String(action.title || "Tarefa");
  runningTaskProgressRing.style.strokeDashoffset = String(dashOffset);
  const estimatedRemaining = Math.max(0, Math.ceil(durationMinutes - elapsedMinutes));
  const loopModePercent = Math.floor(Date.now() / 3000) % 2 === 0;
  runningTaskPercent.textContent = loopModePercent ? `${percent}%` : `${estimatedRemaining}m`;
  runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
  runningTaskMinutesLeft.textContent = formatSignedDelay(scheduleDeltaMinutes);
  if (scheduleDeltaMinutes >= 0) {
    runningTaskMinutesLeft.classList.add("is-late");
  } else {
    runningTaskMinutesLeft.classList.add("is-early");
  }
  runningTaskNextName.textContent = nextAction
    ? String(nextAction.kind === "free" ? `Tempo livre (${formatMinutesHuman(getActionDurationMinutes(nextAction))})` : (nextAction.title || "Tarefa"))
    : "Descanso";
  if (runningTaskStartNextButton) {
    runningTaskStartNextButton.hidden = true;
  }
}

function getCompletionSummaryForSelectedProfile() {
  const list = getVisibleActions();
  const total = list.length;
  const completed = list.filter((item) => normalizeActionStatus(item.status) === actionStatuses.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const late = list.reduce((sum, item) => sum + Math.max(0, getActionLateStartMinutes(item)), 0);
  return { percent, late };
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDateLabel(date) {
  if (isSameDate(date, todayStart())) {
    return "Hoje";
  }

  return `${date.getDate()} ${monthLabels[date.getMonth()]}`;
}

function formatHistoryDateLabel(date) {
  if (isSameDate(date, todayStart())) {
    return "Hoje";
  }
  return `${String(date.getDate()).padStart(2, "0")} ${monthLabels[date.getMonth()]}`;
}

function toLocalDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatHourChip(value) {
  const date = new Date(value);
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatMinutesHuman(totalMinutesValue) {
  const total = Math.max(0, Math.round(Number(totalMinutesValue) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `${total} minutos`;
  if (minutes <= 0) return hours === 1 ? "1 hora" : `${hours} horas`;
  return `${hours === 1 ? "1 hora" : `${hours} horas`} e ${minutes} minutos`;
}

function formatHomeDateTime(now = new Date()) {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const day = now.getDate();
  const month = months[now.getMonth()] || "";
  const hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${day} de ${month} | ${hour}h${minute}`;
}

function startHomeDateTimeTicker() {
  if (!homeDateTimeLabel) {
    return;
  }
  const render = () => {
    homeDateTimeLabel.textContent = formatHomeDateTime(new Date());
  };
  render();
  window.setInterval(render, 30000);
}

function startRunningTaskTicker() {
  renderHomeRunningTask();
  if (runningTaskTicker) {
    window.clearInterval(runningTaskTicker);
  }
  runningTaskTicker = window.setInterval(() => {
    renderHomeRunningTask();
  }, 1000);
}

function formatMoney(cents) {
  return moneyFormatter.format(Number(cents || 0) / 100);
}

function normalizeActionStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === actionStatuses.inProgress) {
    return actionStatuses.inProgress;
  }

  if (normalized === actionStatuses.completed) {
    return actionStatuses.completed;
  }

  return actionStatuses.pending;
}

function normalizeAssigneeName(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "Geral";
  }

  const found = assigneeOptions.find((name) => name.toLowerCase() === input.toLowerCase());
  return found || "Geral";
}

function getWizardAssigneeName() {
  return normalizeAssigneeName(state.selectedProfile || "Rose");
}

function getActionAvatarPath(assignee) {
  return actionAvatarByAssignee[assignee] || actionAvatarByAssignee.Geral;
}

function buildDateWithTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function startOfDayIso(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function nextDayIso(date) {
  const next = addDays(date, 1);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

function buildInitialWizardState() {
  const now = new Date();
  const rounded = new Date(now.getTime() + 10 * 60 * 1000);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 5) * 5, 0, 0);

  const end = new Date(rounded.getTime() + 15 * 60 * 1000);

  return {
    step: 1,
    dateOffset: 0,
    repeatOpen: false,
    repeatMode: "none",
    repeatDays: [],
    periodicEveryDays: 2,
    avoidSaturday: false,
    avoidSunday: false,
    monthlyOrdinalIndex: 0,
    monthlyWeekdayIndex: 3,
    startHour: rounded.getHours(),
    startMinute: rounded.getMinutes() % 60,
    endHour: end.getHours(),
    endMinute: end.getMinutes(),
    editingActionId: null
  };
}

function buildInitialPlatformWizardState() {
  return {
    step: 1,
    kind: "INCOME",
    category: platformIncomeCategories[0],
    recurrenceType: "SIMPLE",
    recurrenceDayOfMonth: new Date().getDate()
  };
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Falha na requisicao.");
  }

  return payload;
}

async function apiRequestWithTimeout(path, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiRequest(path, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("A interpretação demorou demais.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function inferFinanceEntryLocally(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("Sem texto para interpretar.");
  }
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const numberMatch = normalized.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!numberMatch) {
    throw new Error("Nao consegui identificar o valor.");
  }
  const numeric = Number(numberMatch[1].replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Nao consegui identificar o valor.");
  }
  const amountCents = Math.round(numeric * 100);

  const isIncome = /\b(recebi|entrada|ganhei|vendi|pagaram|deposito|depositaram)\b/.test(normalized);
  const kind = isIncome ? "INCOME" : "EXPENSE";
  let category = kind === "INCOME" ? "Eventos" : "Alimentacao";
  if (kind === "EXPENSE") {
    if (/\b(gasolina|uber|mecanico|oficina|carro)\b/.test(normalized)) category = "Carro";
    else if (/\b(roupa|camisa|calca|sapato|tenis|vestuario)\b/.test(normalized)) category = "Vestuario";
    else if (/\b(medico|medica|consulta|exame|farmacia|remedio|saude)\b/.test(normalized)) category = "Saude";
    else if (/\b(imprevisto|emergencia|quebrou|acidente)\b/.test(normalized)) category = "Imprevistos";
    else if (/\b(emprestimo|juros|financiamento|parcela banco)\b/.test(normalized)) category = "Emprestimos e Juros";
    else if (/\b(render|openai|chatgpt|site|dominio|hospedagem|plataforma)\b/.test(normalized)) category = "Plataformas";
    else if (/\b(luz|internet|gas|streaming|aluguel|pintura|reparo|casa)\b/.test(normalized)) category = "Servicos casa";
    else if (/\b(viagem|pedagio|evento|led)\b/.test(normalized)) category = "Eventos";
    else if (/\b(lazer|cinema|bar|show)\b/.test(normalized)) category = "Lazer";
    else if (/\b(anuncio|trafego|ads)\b/.test(normalized)) category = "Anuncios";
  } else {
    if (/\b(site)\b/.test(normalized)) category = "Site";
    else if (/\b(autorais|royalt|direitos autorais|copyright)\b/.test(normalized)) category = "Direitos autorais";
    else if (/\b(apoiador|apoio)\b/.test(normalized)) category = "Apoiadores";
    else if (/\b(inscricao)\b/.test(normalized)) category = "Inscricoes";
    else if (/\b(venda)\b/.test(normalized)) category = "Venda de ativo";
  }

  let name = "Lancamento";
  if (/\b(carne|acougue)\b/.test(normalized)) name = "Carne";
  else if (/\b(pao|padaria)\b/.test(normalized)) name = "Padaria";
  else if (/\b(gasolina|combustivel)\b/.test(normalized)) name = "Combustivel";
  else if (/\b(aluguel)\b/.test(normalized)) name = "Aluguel";
  else if (/\b(internet)\b/.test(normalized)) name = "Internet";
  else if (/\b(luz)\b/.test(normalized)) name = "Luz";

  return {
    name,
    kind,
    category,
    amountCents,
    recurrenceType: "SIMPLE",
    recurrenceDayOfMonth: 1
  };
}

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.classList.remove("is-fading-out");
  modal.setAttribute("aria-hidden", "false");

  if (id === "actionsModal") {
    const latestDone = getLatestCompletedActionForSelectedProfile();
    pendingActionsAnchorId = latestDone?.id || "";
    void loadActions();
    window.setTimeout(() => {
      anchorToLastCompletedAction();
    }, 1000);
    if (actionsDelayTicker) {
      window.clearInterval(actionsDelayTicker);
    }
    startActionsTimeTicker();
    actionsDelayTicker = window.setInterval(() => {
      renderActions();
    }, 30000);
  }

  if (id === "calendarModal") {
    void loadPlatformFinance();
    startPlatformMetricsRotation();
  }

  if (id === "statsModal") {
    void loadStatsSummary();
  }

  if (id === "financeModal") {
    startFinancePresentation();
  }

  if (id === "constitutionModal") {
    void loadConstitution();
  }

  if (id === "historyModal") {
    void (async () => {
      await loadHistoryFromApi();
      renderHistory();
    })();
  }
}

function closeModal(modal) {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  closeWizard();
  closePlatformWizard();

  if (modal.id === "financeModal" && financeTimer) {
    window.clearTimeout(financeTimer);
    financeTimer = null;
  }

  if (modal.id === "calendarModal" && platformMetricsTicker) {
    window.clearInterval(platformMetricsTicker);
    platformMetricsTicker = null;
  }

  if (modal.id === "constitutionModal") {
    state.constitutionEditing = false;
    constitutionEditWrap.hidden = true;
    constitutionMessage.textContent = "";
  }

  if (modal.id === "actionsModal" && actionsDelayTicker) {
    window.clearInterval(actionsDelayTicker);
    actionsDelayTicker = null;
    if (actionsTimeTicker) {
      window.clearInterval(actionsTimeTicker);
      actionsTimeTicker = null;
    }
    closeActionStatusWizard();
  }

  if (modal.id === "historyModal") {
    closeHistoryTextComposer();
  }
  if (modal.id === "calendarModal") {
    closeFinanceEntryConfirm(false);
  }
}

function getActiveConstitutionVersion() {
  if (!state.constitutionVersions.length) {
    return null;
  }
  return state.constitutionVersions[state.constitutionIndex] || state.constitutionVersions[state.constitutionVersions.length - 1];
}

function renderConstitution() {
  const hasToken = Boolean(getToken());
  constitutionAuthAlert.hidden = hasToken;

  const current = getActiveConstitutionVersion();
  const label = current?.label || "Versão 1";
  constitutionVersionLabel.textContent = label;
  constitutionTextView.textContent = current?.text || constitutionDefaultText;

  constitutionAvatars.querySelectorAll("[data-constitution-approver]").forEach((button) => {
    const approver = button.dataset.constitutionApprover;
    const approved = Boolean(current?.approvals?.[approver]);
    button.classList.toggle("is-approved", approved);
    button.disabled = !hasToken;
  });
}

function moveConstitutionVersion(amount) {
  const total = state.constitutionVersions.length;
  if (!total) {
    return;
  }
  state.constitutionIndex = (state.constitutionIndex + amount + total) % total;
  state.constitutionEditing = false;
  constitutionEditWrap.hidden = true;
  constitutionMessage.textContent = "";
  renderConstitution();
}

async function loadConstitution() {
  state.constitutionEditing = false;
  constitutionEditWrap.hidden = true;
  constitutionMessage.textContent = "";

  if (!getToken()) {
    state.constitutionVersions = [{
      id: "local-default",
      versionNumber: 1,
      label: "Versão 1",
      text: constitutionDefaultText,
      approvals: {}
    }];
    state.constitutionIndex = 0;
    renderConstitution();
    return;
  }

  constitutionMessage.textContent = "Carregando...";
  try {
    const payload = await apiRequest("/api/constitution/versions");
    state.constitutionVersions = Array.isArray(payload?.versions) && payload.versions.length
      ? payload.versions
      : [{
        id: "local-default",
        versionNumber: 1,
        label: "Versão 1",
        text: constitutionDefaultText,
        approvals: {}
      }];
    state.constitutionIndex = state.constitutionVersions.length - 1;
    constitutionMessage.textContent = "";
    renderConstitution();
  } catch (error) {
    constitutionMessage.textContent = error instanceof Error ? error.message : "Falha ao carregar constituicao.";
    renderConstitution();
  }
}

function startConstitutionEdit() {
  if (!getToken()) {
    constitutionMessage.textContent = "Entre na conta para editar.";
    return;
  }
  const current = getActiveConstitutionVersion();
  constitutionEditor.value = current?.text || constitutionDefaultText;
  state.constitutionEditing = true;
  constitutionEditWrap.hidden = false;
  constitutionMessage.textContent = "";
}

async function saveConstitutionEdit() {
  if (!getToken()) {
    constitutionMessage.textContent = "Entre na conta para salvar.";
    return;
  }

  const text = String(constitutionEditor.value || "").trim();
  if (text.length < 10) {
    constitutionMessage.textContent = "Texto muito curto.";
    return;
  }

  constitutionMessage.textContent = "Salvando nova versao...";
  try {
    const payload = await apiRequest("/api/constitution/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    state.constitutionVersions = payload?.versions || state.constitutionVersions;
    state.constitutionIndex = Math.max(0, state.constitutionVersions.length - 1);
    state.constitutionEditing = false;
    constitutionEditWrap.hidden = true;
    constitutionMessage.textContent = "Nova versao salva. Aprovacoes reiniciadas.";
    renderConstitution();
  } catch (error) {
    constitutionMessage.textContent = error instanceof Error ? error.message : "Falha ao salvar versao.";
  }
}

async function approveConstitution(approver) {
  if (!getToken()) {
    constitutionMessage.textContent = "Entre na conta para aprovar.";
    return;
  }

  const version = getActiveConstitutionVersion();
  if (!version?.id) {
    return;
  }

  const ok = window.confirm(`${approver}: Concordar com essa versão?`);
  if (!ok) {
    return;
  }

  constitutionMessage.textContent = "Salvando aprovacao...";
  try {
    const payload = await apiRequest(`/api/constitution/versions/${encodeURIComponent(version.id)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approver })
    });
    state.constitutionVersions = payload?.versions || state.constitutionVersions;
    state.constitutionIndex = Math.max(0, state.constitutionVersions.findIndex((item) => item.id === version.id));
    constitutionMessage.textContent = `${approver} aprovou essa versao.`;
    renderConstitution();
  } catch (error) {
    constitutionMessage.textContent = error instanceof Error ? error.message : "Falha ao aprovar versao.";
  }
}

function getActiveFinancePeriod() {
  return financePeriods[state.financePeriodIndex] || financePeriods[0];
}

function setFinanceSalesTitle(periodLabel) {
  financeSalesLabel.textContent = `Total de vendas (${periodLabel})`;
}

function renderFinancePeriod() {
  const period = getActiveFinancePeriod();
  financePeriodLabel.textContent = period.label;
  setFinanceSalesTitle(period.label);
}

function moveFinancePeriod(direction) {
  const total = financePeriods.length;
  state.financePeriodIndex = (state.financePeriodIndex + direction + total) % total;
  renderFinancePeriod();

  const financeModal = document.getElementById("financeModal");
  if (financeModal?.classList.contains("active") && financeIntroTitle.hidden) {
    void loadFinanceSummary();
  }
}

function startFinancePresentation() {
  if (financeTimer) {
    window.clearTimeout(financeTimer);
  }

  renderFinancePeriod();
  financeIntroTitle.hidden = false;
  financePeriodPicker.hidden = true;
  financeDashboard.hidden = true;
  financeStatus.textContent = "";

  financeTimer = window.setTimeout(() => {
    financeTimer = null;
    void loadFinanceSummary();
  }, 1000);
}

async function loadFinanceSummary() {
  const selectedPeriod = getActiveFinancePeriod();

  financeIntroTitle.hidden = true;
  financePeriodPicker.hidden = false;

  if (!getToken()) {
    financeDashboard.hidden = true;
    financeStatus.innerHTML = 'Entre como administrador para ver as finanças. <a href="/auth.html?next=/200">Entrar</a>';
    return;
  }

  financeStatus.textContent = "Carregando...";
  setFinanceSalesTitle(selectedPeriod.label);

  try {
    const payload = await apiRequest(`/api/finance/summary?period=${encodeURIComponent(selectedPeriod.key)}`);
    const summary = payload.summary || {};
    const periodLabel = String(summary.periodLabel || selectedPeriod.label || "").trim() || "Total";

    setFinanceSalesTitle(periodLabel);
    financePeriodLabel.textContent = periodLabel;
    financeTotalSales.textContent = formatMoney(summary.totalSalesCents);
    financeSubscribers.textContent = String(summary.activeSubscribers || 0);
    financeMonthlyRevenue.textContent = formatMoney(summary.monthlyRevenueCents);
    financeDashboard.hidden = false;
    financeStatus.textContent = "";
  } catch (error) {
    financeDashboard.hidden = true;
    financeStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel carregar as financas.";
  }
}

function renderDateHeader() {
  activeDateLabel.textContent = formatDateLabel(dateFromOffset(state.activeOffset));
}

function renderActions() {
  actionsList.innerHTML = "";
  actionsAuthAlert.hidden = Boolean(getToken());

  if (!getToken()) {
    actionsProgress.hidden = true;
    actionsList.innerHTML = '<div class="empty-state">A agenda fica salva quando voce entra na conta.</div>';
    return;
  }

  const timelineEntries = buildActionTimelineEntries();

  if (!timelineEntries.length) {
    actionsList.innerHTML = '<div class="empty-state">Sem tarefas nesse dia.</div>';
    renderActionsProgress();
    return;
  }

  timelineEntries.forEach((action) => {
    const slotOwner = state.selectedProfile;
    const slotAvatar = getActionAvatarPath(slotOwner);
    if (action.kind === "sleep") {
      const row = document.createElement("article");
      row.className = "task-row task-sleep-slot";
      row.dataset.sleepSlot = "1";
      row.innerHTML = `
        <img class="task-avatar" src="${slotAvatar}" alt="Descanso" loading="lazy" />
        <div class="task-main">
          <div class="task-title">Descanso</div>
          <div class="task-assignee">${escapeHtml(String(slotOwner))}</div>
        </div>
        <div class="task-time">${formatHourChip(action.startAt)}</div>
      `;
      actionsList.appendChild(row);
      return;
    }
    if (action.kind === "free") {
      const duration = getActionDurationMinutes(action);
      const ended = Date.now() >= new Date(action.endAt).getTime();
      const row = document.createElement("article");
      row.className = `task-row task-free-slot${ended ? " task-free-expired" : ""}`;
      row.dataset.freeSlot = "1";
      row.dataset.startIso = action.startAt;
      row.dataset.endIso = action.endAt;
      row.innerHTML = `
        <img class="task-avatar" src="${slotAvatar}" alt="Tempo livre" loading="lazy" />
        <div class="task-main">
          <div class="task-title">Tempo livre</div>
          <div class="task-assignee">${escapeHtml(String(slotOwner))}</div>
        </div>
        <div class="task-time">${formatHourChip(action.startAt)}</div>
      `;
      actionsList.appendChild(row);
      return;
    }
    const status = normalizeActionStatus(action.status);
    const assignee = normalizeAssigneeName(action.assignee);
    const avatarPath = getActionAvatarPath(assignee);
    const stateClass = status === actionStatuses.inProgress
      ? " task-in-progress"
      : (status === actionStatuses.completed ? " task-completed" : "");
    const delayMinutes = getPendingDelayMinutes(action);
    const row = document.createElement("article");
    row.className = `task-row${stateClass}${getDelayClassByMinutes(delayMinutes)}`;
    row.dataset.actionId = action.id;
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.innerHTML = `
      <img class="task-avatar" src="${avatarPath}" alt="${escapeHtml(`Avatar de ${assignee}`)}" loading="lazy" />
      <div class="task-main">
        <div class="task-title">${escapeHtml(action.title)}</div>
        <div class="task-assignee task-duration"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1zm1 11.6V6h-2v7.4l5.2 3.1 1-1.7z"/></svg>${formatMinutesHuman(getActionDurationMinutes(action))}</div>
      </div>
      <div class="task-time">${formatHourChip(action.startAt)}</div>
    `;
    actionsList.appendChild(row);
  });

  renderActionsProgress();
  renderHomeRunningTask();
}

function getActionDurationMinutes(action) {
  const start = new Date(action.startAt).getTime();
  const end = new Date(action.endAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / (60 * 1000)));
}

function getActionLateStartMinutes(action) {
  if (Number.isFinite(Number(action?.lateStartMinutes))) {
    return Math.max(0, Number(action.lateStartMinutes));
  }
  const startAt = new Date(action?.startAt).getTime();
  const startedAt = new Date(action?.startedAt).getTime();
  if (!Number.isFinite(startAt) || !Number.isFinite(startedAt)) {
    return 0;
  }
  return Math.max(0, Math.round((startedAt - startAt) / (60 * 1000)));
}

function getPendingDelayMinutes(action) {
  const status = normalizeActionStatus(action?.status);
  if (status !== actionStatuses.pending) {
    return 0;
  }
  const startAt = new Date(action?.startAt).getTime();
  if (!Number.isFinite(startAt)) {
    return 0;
  }
  const delta = Date.now() - startAt;
  return delta > 0 ? Math.floor(delta / (60 * 1000)) : 0;
}

function getDelayClassByMinutes(minutes) {
  if (minutes <= 0) {
    return "";
  }
  if (minutes < 15) {
    return " task-delay-soft";
  }
  if (minutes < 60) {
    return " task-delay-yellow";
  }
  if (minutes < 120) {
    return " task-delay-orange";
  }
  if (minutes < 240) {
    return " task-delay-red";
  }
  return " task-delay-black";
}

function renderActionsProgress() {
  if (!getToken()) {
    actionsProgress.hidden = true;
    return;
  }

  actionsProgress.hidden = false;

  const visibleActions = getVisibleActions();
  const totalMinutes = visibleActions.reduce((sum, action) => sum + getActionDurationMinutes(action), 0);
  const completedMinutes = visibleActions.reduce((sum, action) => {
    const status = normalizeActionStatus(action.status);
    if (status !== actionStatuses.completed) {
      return sum;
    }
    return sum + getActionDurationMinutes(action);
  }, 0);
  const percent = totalMinutes > 0
    ? Math.max(0, Math.min(100, Math.round((completedMinutes / totalMinutes) * 100)))
    : 0;

  actionsProgressLabel.textContent = `${percent}%`;
  actionsProgressMinutes.textContent = "";
  actionsProgressFill.style.width = `${percent}%`;
  actionsProgressFill.parentElement?.setAttribute("aria-valuenow", String(percent));
  registerDailyMissionEvents();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadActions() {
  renderDateHeader();

  if (!getToken()) {
    state.actions = [];
    renderActions();
    return;
  }

  const date = dateFromOffset(state.activeOffset);
  actionsList.innerHTML = '<div class="empty-state">Carregando...</div>';

  try {
    const payload = await apiRequest(`/api/actions?from=${encodeURIComponent(startOfDayIso(date))}&to=${encodeURIComponent(nextDayIso(date))}`);
    state.actions = payload.actions || [];
    renderActions();
    registerDayCloseEventIfNeeded();
  } catch (error) {
    actionsProgress.hidden = true;
    actionsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
  renderHomeRunningTask();
}

async function toggleActionStatus(actionId, options = {}) {
  const targetId = String(actionId || "").trim();

  if (!targetId) {
    return;
  }

  const targetAction = state.actions.find((item) => item.id === targetId);

  if (!targetAction) {
    return;
  }

  const currentStatus = normalizeActionStatus(targetAction.status);
  if (currentStatus === actionStatuses.pending && !options.skipDecision) {
    const nowMs = Date.now();
    const targetStartMs = new Date(targetAction.startAt).getTime();
    const targetEndMs = new Date(targetAction.endAt).getTime();
    if (Number.isFinite(targetStartMs) && nowMs < targetStartMs) {
      const currentEntry = getCurrentTimelineEntry(nowMs, targetAction.id);
      if (currentEntry) {
        const buttons = [];
        const durationMs = Math.max(60 * 1000, targetEndMs - targetStartMs);
        if (currentEntry.kind === "free") {
          const freeEndMs = new Date(currentEntry.endAt).getTime();
          if (freeEndMs - nowMs >= durationMs) {
            buttons.push({ label: "Encaixar no horário livre", value: "fit_free", primary: true });
          } else {
            buttons.push({ label: "Usar tempo livre", value: "use_free", primary: true });
          }
          buttons.push({ label: "Adiantar tarefa", value: "advance" });
          buttons.push({ label: "Fechar", value: "cancel" });
        } else if (currentEntry.kind === "sleep") {
          buttons.push({ label: "Usar descanso", value: "use_sleep", primary: true });
          buttons.push({ label: "Adiantar tarefa", value: "advance" });
          buttons.push({ label: "Fechar", value: "cancel" });
        } else {
          buttons.push({ label: "Substituir", value: "swap", primary: true });
          buttons.push({ label: `Cumprir tarefa "${String(currentEntry.title || "atual")}"`, value: "do_current" });
          buttons.push({ label: "Fechar", value: "cancel" });
        }
        const decision = await openStartDecisionModal(targetAction, currentEntry, buttons);
        if (!decision || decision === "cancel") {
          return;
        }
        if (decision === "do_current" && currentEntry?.id) {
          await toggleActionStatus(currentEntry.id, { skipDecision: true });
          return;
        }
        if (decision === "swap" && currentEntry?.id && currentEntry.kind !== "free" && currentEntry.kind !== "sleep") {
          const swapStart = targetAction.startAt;
          const swapEnd = targetAction.endAt;
          await patchActionTime(targetAction, currentEntry.startAt, currentEntry.endAt);
          await patchActionTime(currentEntry, swapStart, swapEnd);
          await loadActions();
          return;
        }
        if (decision === "advance" || decision === "fit_free" || decision === "use_free" || decision === "use_sleep") {
          const now = new Date();
          const startAt = now.toISOString();
          const endAt = new Date(now.getTime() + durationMs).toISOString();
          await patchActionTime(targetAction, startAt, endAt);
          await loadActions();
          return await toggleActionStatus(targetAction.id, { skipDecision: true });
        }
      }
    }
    const okStart = window.confirm(`Você quer começar "${targetAction.title}" ?`);
    if (!okStart) {
      return;
    }
  }
  if (currentStatus === actionStatuses.inProgress) {
    const okEnd = window.confirm(`Você quer encerrar "${targetAction.title}" ?`);
    if (!okEnd) {
      return;
    }
  }

  try {
    const payload = await apiRequest(`/api/actions/${encodeURIComponent(targetId)}/status`, {
      method: "PATCH"
    });
    const updated = payload?.action || null;

    if (!updated) {
      throw new Error("Nao foi possivel atualizar o status.");
    }

    state.actions = state.actions.map((item) => (item.id === targetId ? updated : item));
    registerSystemEventFromActionTransition(targetAction, updated);
    const nextStatus = normalizeActionStatus(updated?.status);
    if (currentStatus === actionStatuses.pending && nextStatus === actionStatuses.inProgress) {
      openModal("runningTaskModal");
      window.setTimeout(() => {
        closeActionsModalWithFade();
      }, 600);
    }
    if (currentStatus === actionStatuses.inProgress && nextStatus === actionStatuses.completed) {
      pendingActionsAnchorId = updated?.id || "";
    }
    renderActions();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Nao foi possivel atualizar a tarefa.");
    renderActions();
  }
}

function moveActiveDate(amount) {
  state.activeOffset += amount;
  void loadActions();
}

function openWizard(action = null) {
  state.wizard = buildInitialWizardState();
  if (action) {
    const startAt = new Date(action.startAt);
    const endAt = new Date(action.endAt);
    const today = todayStart();
    const actionDay = new Date(startAt);
    actionDay.setHours(0, 0, 0, 0);
    state.wizard.dateOffset = Math.round((actionDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    state.wizard.startHour = startAt.getHours();
    state.wizard.startMinute = startAt.getMinutes();
    state.wizard.endHour = endAt.getHours();
    state.wizard.endMinute = endAt.getMinutes();
    state.wizard.editingActionId = action.id;
    taskTitle.value = action.title || "";
  } else {
    taskTitle.value = "";
  }
  wizardMessage.textContent = "";
  hideActionAiConfirmation();
  actionWizard.classList.add("active");
  actionWizard.setAttribute("aria-hidden", "false");
  renderWizard();
  setTimeout(() => taskTitle.focus(), 60);
}

function closeWizard() {
  stopActionMic();
  hideActionAiConfirmation();
  if (actionVoiceStatus) {
    actionVoiceStatus.textContent = "Toque no microfone para criar por voz.";
  }
  actionWizard.classList.remove("active");
  actionWizard.setAttribute("aria-hidden", "true");
}

function renderWizard() {
  const { step } = state.wizard;
  wizardStepLabel.textContent = `${step} de 4`;
  if (actionForm) {
    actionForm.dataset.step = String(step);
  }

  document.querySelectorAll(".wizard-step").forEach((section) => {
    const isActive = Number(section.dataset.step) === step;
    section.classList.toggle("active", isActive);
  });

  wizardBackButton.style.visibility = step === 1 ? "hidden" : "visible";
  wizardNextButton.textContent = step === 4 ? "Salvar" : "Continuar";
  wizardDateLabel.textContent = formatDateLabel(dateFromOffset(state.wizard.dateOffset));
  renderRepeatControls();
  renderTimePickers();
}

function closeActionsModalWithFade() {
  if (!actionsModal || !actionsModal.classList.contains("active")) {
    return;
  }
  actionsModal.classList.add("is-fading-out");
  window.setTimeout(() => {
    closeModal(actionsModal);
    actionsModal.classList.remove("is-fading-out");
  }, 500);
}

function startActionsTimeTicker() {
  if (actionsTimeTicker) {
    window.clearInterval(actionsTimeTicker);
    actionsTimeTicker = null;
  }
}

function renderSleepLabels() {
  if (sleepStartLabel) {
    sleepStartLabel.textContent = `${String(state.sleepConfig.startHour).padStart(2, "0")}:${String(state.sleepConfig.startMinute).padStart(2, "0")}`;
  }
  if (sleepEndLabel) {
    sleepEndLabel.textContent = `${String(state.sleepConfig.endHour).padStart(2, "0")}:${String(state.sleepConfig.endMinute).padStart(2, "0")}`;
  }
}

function moveSleepTime(target, deltaMinutes) {
  const hourKey = target === "start" ? "startHour" : "endHour";
  const minuteKey = target === "start" ? "startMinute" : "endMinute";
  const currentTotal = (Number(state.sleepConfig[hourKey] || 0) * 60) + Number(state.sleepConfig[minuteKey] || 0);
  const wrapped = ((currentTotal + deltaMinutes) % (24 * 60) + (24 * 60)) % (24 * 60);
  state.sleepConfig[hourKey] = Math.floor(wrapped / 60);
  state.sleepConfig[minuteKey] = wrapped % 60;
  renderSleepLabels();
}

function getCurrentTimelineEntry(nowMs, exceptId = "") {
  const timeline = buildActionTimelineEntries().filter((entry) => {
    if (exceptId && entry.id === exceptId) return false;
    if (entry.kind === "free" || entry.kind === "sleep") return true;
    const status = normalizeActionStatus(entry.status);
    return status === actionStatuses.pending || status === actionStatuses.inProgress;
  });
  return timeline.find((entry) => {
    const start = new Date(entry.startAt).getTime();
    const end = new Date(entry.endAt).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && nowMs >= start && nowMs < end;
  }) || null;
}

function closeStartDecisionModalWith(value) {
  startDecisionModal?.classList.remove("active");
  startDecisionModal?.setAttribute("aria-hidden", "true");
  const resolver = startDecisionResolver;
  startDecisionResolver = null;
  if (resolver) resolver(value);
}

function openStartDecisionModal(targetAction, currentEntry, buttons) {
  return new Promise((resolve) => {
    startDecisionResolver = resolve;
    if (startDecisionTarget) {
      startDecisionTarget.textContent = String(targetAction?.title || "Tarefa");
    }
    if (startDecisionCurrent) {
      startDecisionCurrent.textContent = String(currentEntry?.kind === "free"
        ? "Tempo livre"
        : currentEntry?.kind === "sleep"
          ? "Descanso"
          : (currentEntry?.title || "Tarefa"));
    }
    if (startDecisionActions) {
      startDecisionActions.innerHTML = "";
      buttons.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = item.primary ? "primary-btn" : "ghost-btn";
        btn.textContent = item.label;
        btn.addEventListener("click", () => closeStartDecisionModalWith(item.value));
        startDecisionActions.appendChild(btn);
      });
    }
    startDecisionModal?.classList.add("active");
    startDecisionModal?.setAttribute("aria-hidden", "false");
  });
}

async function patchActionTime(action, startAt, endAt) {
  await apiRequest(`/api/actions/${encodeURIComponent(action.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: action.title,
      assignee: action.assignee,
      repeatRule: action.repeatRule || "none",
      repeatDays: Array.isArray(action.repeatDays) ? action.repeatDays : [],
      occurrences: [{ startAt, endAt }]
    })
  });
}

async function ensureProject200Session() {
  const token = getToken();
  if (!token) {
    project200LoginOverlay?.classList.add("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "false");
    return false;
  }
  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToken("");
      state.profileLock = "";
      project200LoginOverlay?.classList.add("active");
      project200LoginOverlay?.setAttribute("aria-hidden", "false");
      return false;
    }
    refreshProfileLockFromAuth(payload?.user || null);
    if (state.profileLock) {
      applySelectedProfile(state.profileLock);
    }
    project200LoginOverlay?.classList.remove("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "true");
    return true;
  } catch {
    state.profileLock = "";
    project200LoginOverlay?.classList.add("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "false");
    return false;
  }
}

async function createProfileLink(username, profile) {
  const payload = await apiRequest("/api/200/profile-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, profile })
  });
  return payload?.link || null;
}

function openProfileLinkOverlay(profile) {
  profileLinkTarget = String(profile || "").trim();
  if (!profileLinkTarget) return;
  if (profileLinkTargetLabel) {
    profileLinkTargetLabel.textContent = `Perfil selecionado: ${profileLinkTarget}`;
  }
  if (profileLinkMessage) {
    profileLinkMessage.textContent = "";
  }
  if (profileLinkUsername) {
    profileLinkUsername.value = "";
  }
  profileLinkOverlay?.classList.add("active");
  profileLinkOverlay?.setAttribute("aria-hidden", "false");
  window.setTimeout(() => profileLinkUsername?.focus(), 40);
}

function closeProfileLinkOverlay() {
  profileLinkOverlay?.classList.remove("active");
  profileLinkOverlay?.setAttribute("aria-hidden", "true");
}

function renderRepeatControls() {
  repeatBox.hidden = !state.wizard.repeatOpen;
  repeatToggle.classList.toggle("active", state.wizard.repeatOpen);
  if (repeatToggle) {
    repeatToggle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 17.5V20h2.5L17.1 9.4l-2.5-2.5zm14.1-9.1 1.2-1.2a1 1 0 0 0 0-1.4l-1.1-1.1a1 1 0 0 0-1.4 0l-1.2 1.2z"/></svg><span>Personalizar</span>`;
  }

  document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.repeatMode === state.wizard.repeatMode);
  });
  const showingDetailMode = state.wizard.repeatMode === "periodic" || state.wizard.repeatMode === "monthly_custom";
  if (wizardDatePickerWrap) {
    wizardDatePickerWrap.hidden = Boolean(state.wizard.repeatOpen);
  }
  if (repeatModeButtons) {
    repeatModeButtons.hidden = showingDetailMode;
  }
  if (repeatModeBackButton) {
    repeatModeBackButton.hidden = !showingDetailMode;
  }

  weekdayRow.innerHTML = "";
  weekdayRow.hidden = state.wizard.repeatMode !== "custom";
  weekdayLabels.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.weekday = String(index);
    button.classList.toggle("active", state.wizard.repeatDays.includes(index));
    weekdayRow.appendChild(button);
  });
  if (repeatPeriodicBox) {
    repeatPeriodicBox.hidden = state.wizard.repeatMode !== "periodic";
  }
  if (periodicEveryLabel) {
    periodicEveryLabel.textContent = `${state.wizard.periodicEveryDays} ${state.wizard.periodicEveryDays === 1 ? "dia" : "dias"}`;
  }
  if (avoidSaturdayInput) {
    avoidSaturdayInput.checked = Boolean(state.wizard.avoidSaturday);
  }
  if (avoidSundayInput) {
    avoidSundayInput.checked = Boolean(state.wizard.avoidSunday);
  }
  if (repeatMonthlyCustomBox) {
    repeatMonthlyCustomBox.hidden = state.wizard.repeatMode !== "monthly_custom";
  }
  if (monthlyOrdinalLabel) {
    monthlyOrdinalLabel.textContent = monthlyOrdinalLabels[state.wizard.monthlyOrdinalIndex] || monthlyOrdinalLabels[0];
  }
  if (monthlyWeekdayLabel) {
    monthlyWeekdayLabel.textContent = monthlyWeekdayLabels[state.wizard.monthlyWeekdayIndex] || monthlyWeekdayLabels[3];
  }
}

function renderTimePickers() {
  document.querySelectorAll("[data-time-picker]").forEach((container) => {
    const type = container.dataset.timePicker;
    const hour = type === "start" ? state.wizard.startHour : state.wizard.endHour;
    const minute = type === "start" ? state.wizard.startMinute : state.wizard.endMinute;

    container.innerHTML = `
      <div class="time-row">
        <button class="circle-nav" type="button" data-time="${type}" data-unit="hour" data-dir="-1" aria-label="Hora anterior">
          <svg viewBox="0 0 24 24"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>
        </button>
        <div>
          <div class="time-value">${String(hour).padStart(2, "0")}</div>
          <div class="time-caption">horas</div>
        </div>
        <button class="circle-nav" type="button" data-time="${type}" data-unit="hour" data-dir="1" aria-label="Proxima hora">
          <svg viewBox="0 0 24 24"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z"/></svg>
        </button>
      </div>
      <div class="time-row">
        <button class="circle-nav" type="button" data-time="${type}" data-unit="minute" data-dir="-1" aria-label="Minuto anterior">
          <svg viewBox="0 0 24 24"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>
        </button>
        <div>
          <div class="time-value minute-value">${String(minute).padStart(2, "0")}</div>
          <div class="time-caption">minutos</div>
        </div>
        <button class="circle-nav" type="button" data-time="${type}" data-unit="minute" data-dir="1" aria-label="Proximo minuto">
          <svg viewBox="0 0 24 24"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z"/></svg>
        </button>
      </div>
    `;
  });
}

function setRepeatMode(mode) {
  if (state.wizard.repeatMode === mode) {
    state.wizard.repeatMode = "none";
    state.wizard.repeatDays = [];
  } else {
    state.wizard.repeatMode = mode;
    state.wizard.repeatDays = recurrenceDays[mode] || [];
  }

  renderRepeatControls();
}

function toggleWeekday(day) {
  const days = new Set(state.wizard.repeatDays);

  if (days.has(day)) {
    days.delete(day);
  } else {
    days.add(day);
  }

  state.wizard.repeatDays = [...days].sort((a, b) => a - b);
  state.wizard.repeatMode = state.wizard.repeatDays.length ? "custom" : "none";
  renderRepeatControls();
}

function moveWizardDate(amount) {
  state.wizard.dateOffset += amount;
  wizardDateLabel.textContent = formatDateLabel(dateFromOffset(state.wizard.dateOffset));
}

function moveTime(type, unit, direction) {
  const prefix = type === "start" ? "start" : "end";
  const key = unit === "hour" ? `${prefix}Hour` : `${prefix}Minute`;
  const max = unit === "hour" ? 24 : 60;
  const step = 1;
  const current = state.wizard[key];
  const normalized = unit === "hour"
    ? (current + direction + max) % max
    : (current + direction + max) % max;

  state.wizard[key] = normalized;
  renderTimePickers();
}

function validateStep() {
  wizardMessage.textContent = "";

  if (state.wizard.step === 1 && taskTitle.value.trim().length < 2) {
    wizardMessage.textContent = "Escreva o titulo da tarefa.";
    return false;
  }

  if (state.wizard.step === 2 && state.wizard.repeatOpen && state.wizard.repeatMode === "custom" && !state.wizard.repeatDays.length) {
    wizardMessage.textContent = "Marque pelo menos um dia da semana.";
    return false;
  }

  return true;
}

function moveTimeHoldFive(type, unit, direction) {
  const prefix = type === "start" ? "start" : "end";
  const key = unit === "hour" ? `${prefix}Hour` : `${prefix}Minute`;
  if (unit !== "minute") {
    moveTime(type, unit, direction);
    return;
  }
  const current = Number(state.wizard[key] || 0);
  const snapped = Math.ceil(current / 5) * 5;
  const base = current % 5 === 0 ? current : snapped;
  const next = (base + (5 * direction) + 60) % 60;
  state.wizard[key] = next;
  renderTimePickers();
}

function shiftPeriodicEveryDays(direction) {
  const next = Math.max(1, Math.min(180, Number(state.wizard.periodicEveryDays || 1) + direction));
  state.wizard.periodicEveryDays = next;
  renderRepeatControls();
}

function shiftPeriodicHoldTen(direction) {
  const current = Math.max(1, Math.min(180, Number(state.wizard.periodicEveryDays || 1)));
  let next = current;
  if (direction > 0) {
    const snappedUp = Math.ceil(current / 10) * 10;
    const base = current % 10 === 0 ? current : snappedUp;
    next = Math.min(180, base + 10);
  } else {
    const snappedDown = Math.floor(current / 10) * 10;
    const base = current % 10 === 0 ? current : snappedDown;
    next = Math.max(1, base - 10);
  }
  state.wizard.periodicEveryDays = next;
  renderRepeatControls();
}

function shiftMonthlyOrdinal(direction) {
  state.wizard.monthlyOrdinalIndex = (state.wizard.monthlyOrdinalIndex + direction + monthlyOrdinalLabels.length) % monthlyOrdinalLabels.length;
  renderRepeatControls();
}

function shiftMonthlyWeekday(direction) {
  state.wizard.monthlyWeekdayIndex = (state.wizard.monthlyWeekdayIndex + direction + monthlyWeekdayLabels.length) % monthlyWeekdayLabels.length;
  renderRepeatControls();
}

function buildOccurrences() {
  const selectedDate = dateFromOffset(state.wizard.dateOffset);
  const firstStart = buildDateWithTime(selectedDate, state.wizard.startHour, state.wizard.startMinute);
  const firstEnd = buildDateWithTime(selectedDate, state.wizard.endHour, state.wizard.endMinute);
  if (firstEnd <= firstStart) {
    throw new Error("O horario final precisa ser depois do inicial.");
  }

  if (!state.wizard.repeatOpen || state.wizard.repeatMode === "none") {
    return [{ startAt: firstStart.toISOString(), endAt: firstEnd.toISOString() }];
  }

  const allowedDays = state.wizard.repeatMode === "custom"
    ? state.wizard.repeatDays
    : recurrenceDays[state.wizard.repeatMode] || [];
  const occurrences = [];

  if (state.wizard.repeatMode === "periodic") {
    for (let index = 0; index < 180; index += Number(state.wizard.periodicEveryDays || 1)) {
      const date = addDays(selectedDate, index);
      if (state.wizard.avoidSaturday && date.getDay() === 6) continue;
      if (state.wizard.avoidSunday && date.getDay() === 0) continue;
      const startAt = buildDateWithTime(date, state.wizard.startHour, state.wizard.startMinute);
      const endAt = buildDateWithTime(date, state.wizard.endHour, state.wizard.endMinute);
      occurrences.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    }
    return occurrences;
  }

  if (state.wizard.repeatMode === "monthly_custom") {
    for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
      const base = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + monthOffset, 1);
      const monthDays = [];
      for (let day = 1; day <= 31; day += 1) {
        const d = new Date(base.getFullYear(), base.getMonth(), day);
        if (d.getMonth() !== base.getMonth()) break;
        if (d.getDay() === state.wizard.monthlyWeekdayIndex) monthDays.push(d);
      }
      const picked = state.wizard.monthlyOrdinalIndex === 4
        ? monthDays[monthDays.length - 1]
        : monthDays[state.wizard.monthlyOrdinalIndex];
      if (!picked) continue;
      const startAt = buildDateWithTime(picked, state.wizard.startHour, state.wizard.startMinute);
      const endAt = buildDateWithTime(picked, state.wizard.endHour, state.wizard.endMinute);
      if (startAt >= firstStart) {
        occurrences.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
      }
    }
    return occurrences;
  }

  for (let index = 0; index < 180; index += 1) {
    const date = addDays(selectedDate, index);

    if (!allowedDays.includes(date.getDay())) {
      continue;
    }

    const startAt = buildDateWithTime(date, state.wizard.startHour, state.wizard.startMinute);
    const endAt = buildDateWithTime(date, state.wizard.endHour, state.wizard.endMinute);
    occurrences.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
  }

  if (!occurrences.length) {
    throw new Error("Nenhuma data valida encontrada para essa repeticao.");
  }

  return occurrences;
}

function computeOverlapsForOccurrences(occurrences) {
  const existing = getVisibleActions();
  const collisions = [];
  for (const item of occurrences) {
    const startMs = new Date(item.startAt).getTime();
    const endMs = new Date(item.endAt).getTime();
    const hit = existing.filter((action) => {
      if (state.wizard.editingActionId && action.id === state.wizard.editingActionId) return false;
      const aStart = new Date(action.startAt).getTime();
      const aEnd = new Date(action.endAt).getTime();
      return aEnd > startMs && aStart < endMs;
    });
    collisions.push(...hit);
  }
  const uniq = new Map();
  collisions.forEach((item) => {
    if (!uniq.has(item.id)) uniq.set(item.id, item);
  });
  return [...uniq.values()].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function buildFreeStartCandidates(durationMinutes) {
  const timeline = buildActionTimelineEntries();
  return timeline
    .filter((entry) => entry.kind === "free" && getActionDurationMinutes(entry) >= durationMinutes)
    .map((entry) => entry.startAt);
}

function renderOverlapWizard() {
  if (!overlapTaskTitle || !overlapTaskRange || !overlapFreeStartLabel) return;
  if (!state.overlapItems.length) {
    overlapTaskTitle.textContent = "Sem conflitos";
    overlapTaskRange.textContent = "";
  } else {
    const item = state.overlapItems[state.overlapIndex % state.overlapItems.length];
    overlapTaskTitle.textContent = String(item.title || "Tarefa");
    overlapTaskRange.textContent = `${formatHourChip(item.startAt)} às ${formatHourChip(item.endAt)}`;
  }
  if (state.overlapCandidateStarts.length) {
    const startIso = state.overlapCandidateStarts[state.overlapCandidateIndex % state.overlapCandidateStarts.length];
    overlapFreeStartLabel.textContent = formatHourChip(startIso);
  } else {
    overlapFreeStartLabel.textContent = "Sem horário";
  }
}

function openOverlapWizard(overlaps, occurrences) {
  return new Promise((resolve) => {
    state.overlapResolver = resolve;
    state.overlapItems = overlaps;
    state.overlapIndex = 0;
    const first = occurrences[0];
    const duration = first ? Math.max(1, getActionDurationMinutes(first)) : 15;
    state.overlapCandidateStarts = buildFreeStartCandidates(duration);
    state.overlapCandidateIndex = 0;
    if (overlapCarouselTimer) window.clearInterval(overlapCarouselTimer);
    overlapCarouselTimer = window.setInterval(() => {
      if (state.overlapItems.length > 1) {
        state.overlapIndex = (state.overlapIndex + 1) % state.overlapItems.length;
        renderOverlapWizard();
      }
    }, 1000);
    renderOverlapWizard();
    overlapWizard?.classList.add("active");
    overlapWizard?.setAttribute("aria-hidden", "false");
  });
}

function closeOverlapWizardWith(payload) {
  if (overlapCarouselTimer) {
    window.clearInterval(overlapCarouselTimer);
    overlapCarouselTimer = null;
  }
  overlapWizard?.classList.remove("active");
  overlapWizard?.setAttribute("aria-hidden", "true");
  const resolver = state.overlapResolver;
  state.overlapResolver = null;
  if (resolver) resolver(payload);
}

async function saveAction() {
  try {
    wizardMessage.textContent = "Salvando...";
    const repeatRule = state.wizard.repeatOpen ? state.wizard.repeatMode : "none";
    const repeatDays = repeatRule === "custom"
      ? state.wizard.repeatDays
      : recurrenceDays[repeatRule] || [];

    const requestPath = state.wizard.editingActionId
      ? `/api/actions/${encodeURIComponent(state.wizard.editingActionId)}`
      : "/api/actions";
    const requestMethod = state.wizard.editingActionId ? "PATCH" : "POST";

    let occurrences = buildOccurrences();
    const overlaps = computeOverlapsForOccurrences(occurrences);
    if (overlaps.length) {
      const decision = await openOverlapWizard(overlaps, occurrences);
      if (!decision || decision.type === "cancel") {
        wizardMessage.textContent = "Ajuste o horário para continuar.";
        return;
      }
      if (decision.type === "change_time") {
        state.wizard.step = 3;
        renderWizard();
        return;
      }
      if (decision.type === "use_free" && decision.startAt) {
        const start = new Date(decision.startAt);
        const firstOccurrence = occurrences[0];
        const originalDurationMs = firstOccurrence
          ? Math.max(60 * 1000, new Date(firstOccurrence.endAt).getTime() - new Date(firstOccurrence.startAt).getTime())
          : 15 * 60 * 1000;
        state.wizard.startHour = start.getHours();
        state.wizard.startMinute = start.getMinutes();
        const end = new Date(start.getTime() + originalDurationMs);
        state.wizard.endHour = end.getHours();
        state.wizard.endMinute = end.getMinutes();
        occurrences = buildOccurrences();
      }
      if (decision.type === "replace") {
        for (const item of overlaps) {
          await apiRequest(`/api/actions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        }
      }
    }

    await apiRequest(requestPath, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: taskTitle.value.trim(),
        assignee: getWizardAssigneeName(),
        repeatRule,
        repeatDays,
        occurrences: occurrences
      })
    });

    state.activeOffset = state.wizard.dateOffset;
    closeWizard();
    await loadActions();
  } catch (error) {
    wizardMessage.textContent = error instanceof Error ? error.message : "Erro ao salvar.";
  }
}

async function openActionLongPressMenu(actionId) {
  const action = state.actions.find((item) => item.id === actionId);
  if (!action) {
    return;
  }
  const status = normalizeActionStatus(action.status);

  if (status === actionStatuses.inProgress) {
    actionStatusTargetId = action.id;
    actionStatusWizardMessage.textContent = `Tarefa: ${action.title}`;
    actionStatusManualMessage.textContent = "";
    actionStatusOptionsStep.hidden = false;
    actionStatusManualStep.hidden = true;
    manualStartTimeInput.value = formatTime(action.startedAt || action.startAt);
    manualEndTimeInput.value = formatTime(action.endAt);
    actionStatusWizard.classList.add("active");
    actionStatusWizard.setAttribute("aria-hidden", "false");
    return;
  }

  const choice = window.prompt("Opções da tarefa:\n1 - Excluir\n2 - Editar", "2");
  if (choice == null) {
    return;
  }

  const option = String(choice).trim();
  if (option === "1") {
    if (!window.confirm("Excluir essa tarefa? Se for repetida, toda a rede sera removida.")) {
      return;
    }
    await apiRequest(`/api/actions/${encodeURIComponent(actionId)}`, { method: "DELETE" });
    await loadActions();
    return;
  }

  if (option === "2") {
    openWizard(action);
  }
}

function closeActionStatusWizard() {
  actionStatusWizard.classList.remove("active");
  actionStatusWizard.setAttribute("aria-hidden", "true");
  actionStatusTargetId = "";
}

function parseTimeToIso(baseIso, hhmm) {
  const base = new Date(baseIso);
  const [hh, mm] = String(hhmm || "").split(":").map((v) => Number(v));
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) {
    return null;
  }
  base.setHours(hh, mm, 0, 0);
  return base.toISOString();
}

async function restoreActionToPending(actionId) {
  const payload = await apiRequest(`/api/actions/${encodeURIComponent(actionId)}/status/manual`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "restore" })
  });
  const updated = payload?.action;
  if (updated) {
    state.actions = state.actions.map((item) => (item.id === actionId ? updated : item));
  }
  const targetDay = toLocalDateKey(updated?.startAt || new Date().toISOString());
  const target = state.historySystem.find((item) => item.type === "start"
    && item.taskTitle === (updated?.title || "")
    && normalizeAssigneeName(item.assignee) === normalizeAssigneeName(updated?.assignee)
    && toLocalDateKey(item.occurredAt || item.createdAt || new Date().toISOString()) === targetDay);
  if (target?.id) {
    state.historySystem = state.historySystem.filter((item) => item.id !== target.id);
  }
  renderActions();
  renderHistory();
}

async function manualFinishAction(actionId) {
  const target = state.actions.find((item) => item.id === actionId);
  if (!target) {
    return;
  }
  const startedAt = parseTimeToIso(target.startAt, manualStartTimeInput.value);
  const completedAt = parseTimeToIso(target.startAt, manualEndTimeInput.value);
  if (!startedAt || !completedAt) {
    actionStatusManualMessage.textContent = "Preencha início e fim.";
    return;
  }
  if (new Date(completedAt).getTime() <= new Date(startedAt).getTime()) {
    actionStatusManualMessage.textContent = "Fim precisa ser após início.";
    return;
  }
  const payload = await apiRequest(`/api/actions/${encodeURIComponent(actionId)}/status/manual`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "manual_complete", startedAt, completedAt })
  });
  const updated = payload?.action;
  if (updated) {
    state.actions = state.actions.map((item) => (item.id === actionId ? updated : item));
  }
  renderActions();
  await loadStatsSummary();
}

function beginActionLongPress(actionId) {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
  }
  longPressTimer = window.setTimeout(() => {
    longPressHandledActionId = actionId;
    void openActionLongPressMenu(actionId);
  }, 500);
}

function endActionLongPress() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function beginPlatformLongPress(occurrenceId) {
  if (platformLongPressTimer) {
    window.clearTimeout(platformLongPressTimer);
  }
  platformLongPressTimer = window.setTimeout(() => {
    platformLongPressHandledOccurrenceId = occurrenceId;
  }, 500);
}

function endPlatformLongPress() {
  if (platformLongPressTimer) {
    window.clearTimeout(platformLongPressTimer);
    platformLongPressTimer = null;
  }
}

function renderPlatformDateHeader() {
  if (financeDateLabel) {
    financeDateLabel.textContent = formatDateLabel(dateFromOffset(state.platformOffset));
  }
}

function getPlatformKindLabel(kind) {
  return String(kind || "").toUpperCase() === "INCOME" ? "Entrada" : "Saída";
}

function getPlatformStatusClass(entry) {
  const status = String(entry?.status || "").trim().toUpperCase();
  const kind = String(entry?.kind || "").trim().toUpperCase();
  if (kind === "INCOME") {
    return "";
  }
  if (status === "DUE_TODAY") {
    return "task-pending-due";
  }
  if (status === "OVERDUE") {
    return "task-overdue";
  }
  return "";
}

function renderPlatformBalance() {
  if (!platformBalanceValue) {
    return;
  }

  platformBalanceValue.textContent = state.platformBalanceHidden
    ? "R$ ****"
    : formatMoney(state.platformBalanceCents);

  if (togglePlatformBalanceButton) {
    togglePlatformBalanceButton.textContent = state.platformBalanceHidden ? "*" : "•";
  }
}

function renderPlatformMetricCards() {
  if (!platformExpenseCard || !platformIncomeCard || !platformSaldoCard) {
    return;
  }

  const index = state.platformMetricIndex % 3;
  platformExpenseCard.hidden = index !== 0;
  platformIncomeCard.hidden = index !== 1;
  platformSaldoCard.hidden = index !== 2;
}

function startPlatformMetricsRotation() {
  renderPlatformMetricCards();

  if (platformMetricsTicker) {
    window.clearInterval(platformMetricsTicker);
    platformMetricsTicker = null;
  }

  platformMetricsTicker = window.setInterval(() => {
    state.platformMetricIndex = (state.platformMetricIndex + 1) % 3;
    renderPlatformMetricCards();
  }, 1500);
}
function renderPlatformEntries() {
  if (!platformEntriesList) {
    return;
  }

  platformEntriesList.innerHTML = "";

  if (!getToken()) {
    platformEntriesList.innerHTML = '<div class="empty-state">Entre para ver as finanças.</div>';
    return;
  }

  if (!state.platformEntries.length) {
    platformEntriesList.innerHTML = '<div class="empty-state">Sem lançamentos nessa data.</div>';
    return;
  }

  const getEntryAmountCents = (entry) => {
    if (Number.isFinite(Number(entry?.amountCents))) {
      return Number(entry.amountCents);
    }
    if (Number.isFinite(Number(entry?.valueCents))) {
      return Number(entry.valueCents);
    }
    if (Number.isFinite(Number(entry?.amount))) {
      return Math.round(Number(entry.amount) * 100);
    }
    return 0;
  };

  state.platformEntries.forEach((entry) => {
    const amountCents = getEntryAmountCents(entry);
    const signed = String(entry.kind || "").toUpperCase() === "INCOME" ? amountCents : -amountCents;
    const row = document.createElement("article");
    const kindClass = String(entry.kind || "").toUpperCase() === "INCOME"
      ? "platform-entry-income"
      : "platform-entry-debit";
    const isDebit = String(entry.kind || "").toUpperCase() !== "INCOME";
    const categoryName = String(entry.category || "").trim();
    const categoryIcon = platformCategoryIconByName[categoryName] || "/200/icons/financas.svg";
    const statusClass = getPlatformStatusClass(entry);
    const dueIncomeClass = String(entry.kind || "").toUpperCase() === "INCOME" && String(entry.status || "").toUpperCase() === "DUE_TODAY"
      ? "platform-entry-due"
      : "";
    row.className = `platform-entry-row ${kindClass} ${statusClass} ${dueIncomeClass}`.trim();
    row.dataset.occurrenceId = entry.id || "";
    row.dataset.status = String(entry.status || "").trim().toUpperCase();
    row.dataset.kind = String(entry.kind || "").trim().toUpperCase();
    row.dataset.amountCents = String(amountCents);
    row.dataset.entryName = String(entry.name || "");
    row.innerHTML = `
      <div class="task-title">
        ${isDebit ? `<img class="platform-entry-icon" src="${categoryIcon}" alt="Saída" loading="lazy" />` : ""}
        <span>${escapeHtml(entry.name)}</span>
      </div>
      <div class="platform-entry-value">${escapeHtml(formatMoney(signed))}</div>
    `;
    platformEntriesList.appendChild(row);
  });
}

function getPlatformMonthReferenceDate() {
  const base = dateFromOffset(state.platformOffset);
  return new Date(base.getFullYear(), base.getMonth(), 15).toISOString();
}

async function loadPlatformFinance() {
  renderPlatformDateHeader();

  if (!getToken()) {
    renderPlatformEntries();
    return;
  }

  const date = dateFromOffset(state.platformOffset);
  platformEntriesList.innerHTML = '<div class="empty-state">Carregando...</div>';

  try {
    const [entriesPayload, monthPayload, platformPayload] = await Promise.all([
      apiRequest(`/api/platform/entries?from=${encodeURIComponent(startOfDayIso(date))}&to=${encodeURIComponent(nextDayIso(date))}`),
      apiRequest(`/api/platform/summary?date=${encodeURIComponent(getPlatformMonthReferenceDate())}`),
      apiRequest("/api/finance/summary?period=total")
    ]);

    state.platformEntries = entriesPayload.entries || [];
    state.platformMonthly = monthPayload.summary || { incomeCents: 0, expenseCents: 0 };
    state.platformBaseIncomeCents = Number(platformPayload?.summary?.monthlyRevenueCents || 0);
    state.platformBalanceCents = Number(monthPayload?.summary?.balanceCents || 0);

    platformMonthlyExpense.textContent = formatMoney(state.platformMonthly.expenseCents);
    platformMonthlyIncome.textContent = formatMoney(Number(state.platformMonthly.incomeCents || 0) + state.platformBaseIncomeCents);
    const entries = Array.isArray(state.platformMonthly.entries) ? state.platformMonthly.entries : [];
    const realizedIncomeCents = entries.reduce((sum, item) => {
      const kind = String(item?.kind || "").toUpperCase();
      const paidAt = item?.paidAt;
      if (kind !== "INCOME" || !paidAt) {
        return sum;
      }
      return sum + Number(item?.amountCents || 0);
    }, 0);
    const realizedExpenseCents = entries.reduce((sum, item) => {
      const kind = String(item?.kind || "").toUpperCase();
      const paidAt = item?.paidAt;
      if (kind !== "EXPENSE" || !paidAt) {
        return sum;
      }
      return sum + Number(item?.amountCents || 0);
    }, 0);
    if (platformRealizedBalance) {
      platformRealizedBalance.textContent = formatMoney(realizedIncomeCents - realizedExpenseCents);
    }
    renderPlatformBalance();
    renderPlatformEntries();
  } catch (error) {
    platformEntriesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function movePlatformDate(amount) {
  state.platformOffset += amount;
  void loadPlatformFinance();
}

async function createPlatformEntryFromVoiceInterpret(text) {
  let entry = null;
  try {
    const interpreted = await apiRequestWithTimeout("/api/200/finance/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }, 12000);
    entry = interpreted?.entry || null;
  } catch (_error) {
    entry = inferFinanceEntryLocally(text);
  }
  if (!entry) {
    throw new Error("Sem interpretação.");
  }
  if (String(entry.recurrenceType || "").toUpperCase() !== "RECURRING" && /\bdia\s+\d{1,2}\b/i.test(text)) {
    entry.recurrenceType = "RECURRING";
    const dayMatch = text.match(/\bdia\s+(\d{1,2})\b/i);
    if (dayMatch) {
      entry.recurrenceDayOfMonth = Math.max(1, Math.min(31, Number(dayMatch[1])));
    }
  }
  await apiRequest("/api/platform/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: entry.name,
      kind: entry.kind,
      category: entry.category,
      amountCents: entry.amountCents,
      recurrenceType: entry.recurrenceType || "SIMPLE",
      recurrenceDayOfMonth: entry.recurrenceType === "RECURRING" ? Math.max(1, Math.min(31, Number(entry.recurrenceDayOfMonth || 1))) : null,
      baseDate: dateFromOffset(state.platformOffset).toISOString()
    })
  });
  await loadPlatformFinance();
}

function closeFinanceEntryConfirm(decision = false) {
  if (financeEntryConfirmWizard) {
    financeEntryConfirmWizard.classList.remove("active");
    financeEntryConfirmWizard.setAttribute("aria-hidden", "true");
  }
  if (typeof financeEntryConfirmResolve === "function") {
    const resolve = financeEntryConfirmResolve;
    financeEntryConfirmResolve = null;
    resolve(Boolean(decision));
  }
}

function openFinanceEntryConfirm(entry, categoryLabel) {
  return new Promise((resolve) => {
    financeEntryConfirmResolve = resolve;
    const kind = String(entry.kind || "").toUpperCase();
    const value = kind === "INCOME" ? Number(entry.amountCents || 0) : -Number(entry.amountCents || 0);
    const icon = platformCategoryIconByName[String(entry.category || "").trim()] || "/200/icons/financas.svg";
    financeEntryConfirmCard.classList.toggle("platform-entry-income", kind === "INCOME");
    financeEntryConfirmCard.classList.toggle("platform-entry-debit", kind !== "INCOME");
    financeEntryConfirmName.innerHTML = `<img class="platform-entry-icon" src="${icon}" alt="" aria-hidden="true" /><span>${escapeHtml(entry.name || "Lançamento")}</span>`;
    financeEntryConfirmValue.textContent = formatMoney(value);
    const recurrenceMeta = String(entry.recurrenceType || "").toUpperCase() === "RECURRING"
      ? `Tag: ${categoryLabel} • Data: dia ${Math.max(1, Math.min(31, Number(entry.recurrenceDayOfMonth || 1)))}`
      : `Tag: ${categoryLabel} • Data: ${formatDateLabel(dateFromOffset(state.platformOffset))}`;
    financeEntryConfirmMeta.textContent = recurrenceMeta;
    financeEntryConfirmWizard.classList.add("active");
    financeEntryConfirmWizard.setAttribute("aria-hidden", "false");
  });
}

function stopActionMic() {
  if (actionSpeechMonitorTimer) {
    window.clearInterval(actionSpeechMonitorTimer);
    actionSpeechMonitorTimer = null;
  }
  if (actionMediaRecorder && actionMediaRecorder.state !== "inactive") {
    actionMediaRecorder.stop();
  }
  actionMediaRecorder = null;
  actionAudioAnalyser = null;
  if (actionAudioContext) {
    actionAudioContext.close().catch(() => {});
    actionAudioContext = null;
  }
  if (actionMediaStream) {
    actionMediaStream.getTracks().forEach((track) => track.stop());
    actionMediaStream = null;
  }
  actionMicButton?.classList.remove("mic-active");
  actionMicButton?.classList.add("mic-idle");
}

function formatRepeatLabel(repeatRule, repeatDays) {
  if (repeatRule === "daily") {
    return "Diariamente";
  }
  if (repeatRule === "periodic") {
    return `A cada ${state.wizard.periodicEveryDays} dias`;
  }
  if (repeatRule === "monthly_custom") {
    return `Toda ${monthlyOrdinalLabels[state.wizard.monthlyOrdinalIndex]} ${monthlyWeekdayLabels[state.wizard.monthlyWeekdayIndex]}`;
  }
  if (repeatRule === "custom" && Array.isArray(repeatDays) && repeatDays.length) {
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    return repeatDays.map((day) => names[day] || day).join(", ");
  }
  return "Data única";
}

function renderActionAiConfirmation(payload) {
  if (!actionAiConfirm) {
    return;
  }
  const startHour = Number(payload?.startHour || 0);
  const startMinute = Number(payload?.startMinute || 0);
  const endHour = Number(payload?.endHour || 0);
  const endMinute = Number(payload?.endMinute || 0);
  const repeatRule = String(payload?.repeatRule || "none");
  const repeatDays = Array.isArray(payload?.repeatDays) ? payload.repeatDays : [];

  actionAiConfirmTitle.textContent = String(payload?.title || "Tarefa").trim() || "Tarefa";
  actionAiConfirmStart.textContent = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
  actionAiConfirmEnd.textContent = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  actionAiConfirmDates.textContent = formatRepeatLabel(repeatRule, repeatDays);
  actionAiConfirm.hidden = false;
}

function hideActionAiConfirmation() {
  if (actionAiConfirm) {
    actionAiConfirm.hidden = true;
  }
  actionPendingAiPayload = null;
}

function applyInterpretedAction(entry) {
  taskTitle.value = String(entry?.title || "").trim().slice(0, 80);
  state.wizard.startHour = Math.max(0, Math.min(23, Number(entry?.startHour || state.wizard.startHour)));
  state.wizard.startMinute = Math.max(0, Math.min(55, Math.round(Number(entry?.startMinute || state.wizard.startMinute) / 5) * 5));
  state.wizard.endHour = Math.max(0, Math.min(23, Number(entry?.endHour || state.wizard.endHour)));
  state.wizard.endMinute = Math.max(0, Math.min(55, Math.round(Number(entry?.endMinute || state.wizard.endMinute) / 5) * 5));
  state.wizard.repeatOpen = String(entry?.repeatRule || "none") !== "none";
  state.wizard.repeatMode = String(entry?.repeatRule || "none");
  state.wizard.repeatDays = Array.isArray(entry?.repeatDays) ? entry.repeatDays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6) : [];
  renderWizard();
}

function applyPendingInterpretedActionAndContinue() {
  if (!actionPendingAiPayload) {
    return;
  }
  const entry = actionPendingAiPayload;
  applyInterpretedAction(entry);
  state.wizard.step = 2;
  renderWizard();
  hideActionAiConfirmation();
}

async function startActionMic() {
  if (actionMediaRecorder && actionMediaRecorder.state !== "inactive") {
    actionVoiceStatus.textContent = "Microfone já está ouvindo...";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    actionMediaStream = stream;
    actionAudioContext = new AudioContext();
    const source = actionAudioContext.createMediaStreamSource(stream);
    actionAudioAnalyser = actionAudioContext.createAnalyser();
    actionAudioAnalyser.fftSize = 2048;
    source.connect(actionAudioAnalyser);

    const chunks = [];
    actionMediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    actionMediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };
    actionMediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (!blob.size) {
        actionVoiceStatus.textContent = "Sem áudio captado.";
        return;
      }
      try {
        actionVoiceStatus.textContent = "Transcrevendo...";
        const base64 = await blob.arrayBuffer().then((buffer) => arrayBufferToBase64(buffer));
        const transcribed = await apiRequest("/api/audio/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm", fileName: "action-voice.webm" })
        });
        const speechText = String(transcribed?.text || "").trim();
        if (!speechText) {
          actionVoiceStatus.textContent = "Sem texto captado.";
          return;
        }
        actionVoiceStatus.textContent = "Interpretando tarefa...";
        const interpreted = await apiRequest("/api/200/actions/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText })
        });
        actionPendingAiPayload = interpreted?.action || null;
        renderActionAiConfirmation(actionPendingAiPayload || {});
        actionVoiceStatus.textContent = "Tarefa pronta. Confirme abaixo.";
      } catch (error) {
        actionVoiceStatus.textContent = error instanceof Error ? error.message : "Falha na interpretação.";
      }
    };
    actionMediaRecorder.start();
    actionMicButton?.classList.remove("mic-idle");
    actionMicButton?.classList.add("mic-active");
    actionVoiceStatus.textContent = "Gravando...";
    actionLastSpeechAt = Date.now();
    actionSpeechMonitorTimer = window.setInterval(() => {
      if (!actionAudioAnalyser) {
        return;
      }
      const buffer = new Uint8Array(actionAudioAnalyser.fftSize);
      actionAudioAnalyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms > 0.02) {
        actionLastSpeechAt = Date.now();
      }
      if (Date.now() - actionLastSpeechAt >= 2000) {
        actionVoiceStatus.textContent = "Processando...";
        stopActionMic();
      }
    }, 110);
  } catch (error) {
    actionVoiceStatus.textContent = error instanceof Error ? error.message : "Falha no microfone.";
    stopActionMic();
  }
}

function getActiveStatsScope() {
  return statsScopes[state.statsScopeIndex] || statsScopes[0];
}

function moveStatsScope(amount) {
  const total = statsScopes.length;
  state.statsScopeIndex = (state.statsScopeIndex + amount + total) % total;
  statsScopeLabel.textContent = getActiveStatsScope().label;
  void loadStatsSummary();
}

function safeGoalPercent(value, goal) {
  if (!goal || goal <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(999, Math.round((value / goal) * 100)));
}

function renderStatsGoals() {
  const summary = state.statsSummary || {};
  const goals = state.statsGoals || {
    dailyIncomeGoalCents: defaultSaldoGoalCents,
    monthlyBalanceGoalCents: 0,
    recurringIncomeGoalCents: 0
  };
  const totals = summary.totals || {};
  const recurringIncome = Number(state.platformBaseIncomeCents || 0);

  const dailyValue = Number(state.platformBalanceCents || 0);
  const saldoGoal = Number(goals.dailyIncomeGoalCents || defaultSaldoGoalCents);
  const dailyPercent = safeGoalPercent(dailyValue, saldoGoal);
  const monthlyPercent = safeGoalPercent(Number(totals.balanceCents || 0), Number(goals.monthlyBalanceGoalCents || 0));
  const recurringPercent = safeGoalPercent(recurringIncome, Number(goals.recurringIncomeGoalCents || 0));

  statsDailyGoalProgress.textContent = `${dailyPercent}%`;
  statsMonthlyGoalProgress.textContent = `${monthlyPercent}%`;
  statsRecurringGoalProgress.textContent = `${recurringPercent}%`;
}

function buildStatsRankingFromSummary() {
  const byAssignee = state.statsSummary?.byAssignee || {};
  const ranking = [];
  const orderedNames = assigneeOptions;
  for (const name of orderedNames) {
    const item = byAssignee[name] || { totalMinutes: 0, completedMinutes: 0 };
    const total = Number(item.totalMinutes || 0);
    const completed = Number(item.completedMinutes || 0);
    const lateStartMinutes = Number(item.lateStartMinutes || 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const payload = {
      name,
      total,
      completed,
      percent,
      lateStartMinutes
    };

    if (name === "Geral") {
      state.statsGeneral = payload;
    } else {
      ranking.push(payload);
    }
  }

  ranking.sort((left, right) => {
    if (right.percent !== left.percent) {
      return right.percent - left.percent;
    }
    if (right.completed !== left.completed) {
      return right.completed - left.completed;
    }
    return left.name.localeCompare(right.name, "pt-BR");
  });

  state.statsRanking = ranking;
}

function renderStatsRanking() {
  const general = state.statsGeneral || { percent: 0, completed: 0, total: 0, lateStartMinutes: 0 };
  statsGeneralAvatar.src = actionAvatarByAssignee.Geral;
  statsGeneralDetail.textContent = general.lateStartMinutes > 0
    ? `${general.percent}% • atraso ${general.lateStartMinutes}m`
    : `${general.percent}%`;

  if (!statsRankingList) {
    return;
  }

  statsRankingList.innerHTML = "";

  if (!state.statsRanking.length) {
    statsRankingList.innerHTML = '<div class="empty-state">Sem tarefas para ranking nesse periodo.</div>';
    return;
  }

  state.statsRanking.forEach((entry, index) => {
    const row = document.createElement("article");
    row.className = "task-row stats-ranking-row";
    row.innerHTML = `
      <div class="stats-avatar-wrap">
        <img class="task-avatar" src="${getActionAvatarPath(entry.name)}" alt="${escapeHtml(`Avatar de ${entry.name}`)}" loading="lazy" />
        <span class="stats-rank-badge">${index + 1}º</span>
      </div>
      <div class="task-main">
        <div class="task-title">${escapeHtml(entry.name)}</div>
        <div class="task-assignee">${entry.lateStartMinutes > 0 ? `${entry.percent}% • atraso ${entry.lateStartMinutes}m` : `${entry.percent}%`}</div>
      </div>
    `;
    statsRankingList.appendChild(row);
  });
}

async function loadStatsSummary() {
  if (!getToken()) {
    return;
  }

  try {
    const scope = getActiveStatsScope();
    statsScopeLabel.textContent = scope.label;
    const [summaryPayload, goalsPayload, platformPayload, platformMonthPayload] = await Promise.all([
      apiRequest(`/api/stats/summary?scope=${encodeURIComponent(scope.key)}`),
      apiRequest("/api/stats/goals"),
      apiRequest("/api/finance/summary?period=total"),
      apiRequest(`/api/platform/summary?date=${encodeURIComponent(getPlatformMonthReferenceDate())}`)
    ]);

    state.statsSummary = summaryPayload.summary || {};
    state.statsGoals = goalsPayload.goals || null;
    state.platformBaseIncomeCents = Number(platformPayload?.summary?.monthlyRevenueCents || 0);
    state.platformBalanceCents = Number(platformMonthPayload?.summary?.balanceCents || state.platformBalanceCents);
    buildStatsRankingFromSummary();
    renderStatsGoals();
    renderStatsRanking();

    const isGeneral = scope.key === "general";
    statsGeneralGoals.hidden = !isGeneral;
    editStatsGoalsButton.hidden = !isGeneral;
  } catch (error) {
    if (statsRankingList) {
      statsRankingList.innerHTML = `<div class="empty-state">${escapeHtml(error instanceof Error ? error.message : "Falha")}</div>`;
    }
  }
}

async function editStatsGoals() {
  const current = state.statsGoals || {
    dailyIncomeGoalCents: defaultSaldoGoalCents,
    monthlyBalanceGoalCents: 0,
    recurringIncomeGoalCents: 0
  };
  const saldoDefault = Number(current.dailyIncomeGoalCents || defaultSaldoGoalCents);
  const dailyRaw = window.prompt("Meta de saldo (R$):", String(saldoDefault / 100).replace(".", ","));
  if (dailyRaw == null) {
    return;
  }
  const monthlyRaw = window.prompt("Meta mensal de saldo final (R$):", String((current.monthlyBalanceGoalCents || 0) / 100).replace(".", ","));
  if (monthlyRaw == null) {
    return;
  }
  const recurringRaw = window.prompt("Meta recorrente mensal (R$):", String((current.recurringIncomeGoalCents || 0) / 100).replace(".", ","));
  if (recurringRaw == null) {
    return;
  }

  const parseCurrency = (value) => Math.max(0, Math.round(Number(String(value).replace(/\./g, "").replace(",", ".")) * 100) || 0);

  try {
    const payload = await apiRequest("/api/stats/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyIncomeGoalCents: parseCurrency(dailyRaw),
        monthlyBalanceGoalCents: parseCurrency(monthlyRaw),
        recurringIncomeGoalCents: parseCurrency(recurringRaw)
      })
    });
    state.statsGoals = payload.goals || state.statsGoals;
    renderStatsGoals();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Nao foi possivel salvar metas.");
  }
}

function renderPlatformCategoryOptions() {
  const categories = state.platformWizard.kind === "INCOME" ? platformIncomeCategories : platformExpenseCategories;
  if (!categories.includes(state.platformWizard.category)) {
    state.platformWizard.category = categories[0];
  }

  platformCategoryRow.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-icon-btn";
    button.dataset.platformCategory = category;
    const iconPath = platformCategoryIconByName[category] || "/200/icons/agenda.svg";
    button.innerHTML = `<img src="${iconPath}" alt="${escapeHtml(category)}" loading="lazy" />`;
    button.classList.toggle("active", category === state.platformWizard.category);
    platformCategoryRow.appendChild(button);
  });
}

function renderPlatformWizard() {
  platformWizardStepLabel.textContent = `${state.platformWizard.step} de 4`;
  document.querySelectorAll("[data-platform-step]").forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.platformStep) === state.platformWizard.step);
  });
  platformWizardBackButton.style.visibility = state.platformWizard.step === 1 ? "hidden" : "visible";
  if (platformWizardAiCreateButton) {
    platformWizardAiCreateButton.hidden = state.platformWizard.step !== 1;
  }
  platformWizardNextButton.textContent = state.platformWizard.step === 4 || state.platformWizard.recurrenceType === "SIMPLE" && state.platformWizard.step === 3
    ? "Salvar"
    : "Continuar";
  platformRecurrenceDayLabel.textContent = String(state.platformWizard.recurrenceDayOfMonth);
  renderPlatformCategoryOptions();
}

function openPlatformWizard() {
  state.platformWizard = buildInitialPlatformWizardState();
  platformNameInput.value = "";
  platformValueInput.value = "";
  platformWizardMessage.textContent = "";
  platformWizard.classList.add("active");
  platformWizard.setAttribute("aria-hidden", "false");
  renderPlatformWizard();
  setTimeout(() => platformNameInput.focus(), 60);
}

function closePlatformWizard() {
  stopPlatformNameMic();
  platformWizard.classList.remove("active");
  platformWizard.setAttribute("aria-hidden", "true");
}

function movePlatformRecurrenceDay(amount) {
  const current = Number(state.platformWizard.recurrenceDayOfMonth || 1);
  state.platformWizard.recurrenceDayOfMonth = ((current - 1 + amount + 31) % 31) + 1;
  platformRecurrenceDayLabel.textContent = String(state.platformWizard.recurrenceDayOfMonth);
}

async function savePlatformEntry() {
  try {
    const raw = String(platformValueInput.value || "").replace(/\./g, "").replace(",", ".");
    const value = Number(raw);
    if (!String(platformNameInput.value || "").trim()) {
      throw new Error("Informe o nome.");
    }
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Informe um valor válido.");
    }

    await apiRequest("/api/platform/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: platformNameInput.value.trim(),
        kind: state.platformWizard.kind,
        category: state.platformWizard.category,
        amountCents: Math.round(value * 100),
        recurrenceType: state.platformWizard.recurrenceType,
        recurrenceDayOfMonth: state.platformWizard.recurrenceType === "RECURRING" ? state.platformWizard.recurrenceDayOfMonth : null,
        baseDate: dateFromOffset(state.platformOffset).toISOString()
      })
    });

    closePlatformWizard();
    await loadPlatformFinance();
  } catch (error) {
    platformWizardMessage.textContent = error instanceof Error ? error.message : "Erro ao salvar lançamento.";
  }
}

async function addPlatformBalanceNow() {
  const raw = window.prompt("Quanto deseja adicionar de saldo? (ex: 120,50)", "");
  if (raw == null) {
    return;
  }

  const value = Number(String(raw).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) {
    window.alert("Valor invalido.");
    return;
  }

  try {
    const payload = await apiRequest("/api/platform/balance/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: Math.round(value * 100) })
    });
    state.platformBalanceCents = Number(payload.balanceCents || 0);
    renderPlatformBalance();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Nao foi possivel adicionar saldo.");
  }
}

async function payPlatformOccurrenceNow(occurrenceId) {
  try {
    const payload = await apiRequest(`/api/platform/occurrences/${encodeURIComponent(occurrenceId)}/pay`, {
      method: "POST"
    });
    state.platformBalanceCents = Number(payload?.result?.balanceCents || state.platformBalanceCents);
    renderPlatformBalance();
    await loadPlatformFinance();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Nao foi possivel pagar agora.");
  }
}

async function loadHistoryFromApi() {
  if (!getToken()) {
    state.historySystem = [];
    state.historyTexts = [];
    return;
  }
  const payload = await apiRequest("/api/200/history");
  state.historySystem = Array.isArray(payload.systemEvents) ? payload.systemEvents : [];
  state.historyTexts = Array.isArray(payload.texts) ? payload.texts : [];
}

function historyIconSvg(type) {
  const map = {
    start: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
    resume: '<svg viewBox="0 0 24 24"><path d="m8 12 8-7v5h4v4h-4v5z"/></svg>',
    complete: '<svg viewBox="0 0 24 24"><path d="m9 16.2-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 17.3-6.2 3.7 1.6-7.1L2 9.2l7.2-.6L12 2l2.8 6.6 7.2.6-5.4 4.7 1.6 7.1z"/></svg>',
    day_close: '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm11 8H6v10h12z"/></svg>'
  };
  return map[type] || map.start;
}

async function pushSystemHistoryEvent(payload) {
  if (!getToken()) {
    return;
  }
  try {
    const response = await apiRequest("/api/200/history/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: payload.type,
        assignee: normalizeAssigneeName(payload.assignee),
        taskTitle: String(payload.taskTitle || "").trim(),
        occurredAt: payload.occurredAt || new Date().toISOString(),
        percent: Number(payload.percent || 0),
        pendingCount: Number(payload.pendingCount || 0),
        scopeDate: payload.scopeDate || null,
        lateStartMinutes: Number(payload.lateStartMinutes || 0)
      })
    });
    if (response?.event) {
      state.historySystem = [response.event, ...state.historySystem.filter((item) => item.id !== response.event.id)];
    }
  } catch {
    // no-op
  }
}

function hasSystemEventForTask(actionId, type) {
  return state.historySystem.some((entry) => entry.actionId === actionId && entry.type === type);
}

function buildSystemMessage(entry) {
  const person = escapeHtml(entry.assignee || "Geral");
  const task = `<strong>${escapeHtml(entry.taskTitle || "Tarefa")}</strong>`;
  if (entry.type === "start") {
    if (Number(entry.lateStartMinutes || 0) > 0) {
      return `${person} começou ${task} com ${Number(entry.lateStartMinutes)} minutos de atraso`;
    }
    return `${person} começou ${task}`;
  }
  if (entry.type === "pause") {
    return `${person} pausou ${task}`;
  }
  if (entry.type === "resume") {
    return `${person} retornou ${task}`;
  }
  if (entry.type === "complete") {
    return `${person} finalizou ${task}`;
  }
  if (entry.type === "star") {
    return `${person} completou a missão diária`;
  }
  if (entry.type === "day_close") {
    return `${person} não concluiu <strong>${entry.pendingCount}</strong> tarefas, encerrou com <strong>${entry.percent}%</strong>`;
  }
  return `${person} atualizou ${task}`;
}

function sameDayIso(a, b) {
  return toLocalDateKey(a) === toLocalDateKey(b);
}

function renderHistoryTimeline() {
  if (!historyTimelineList) {
    return;
  }
  const targetDate = dateFromOffset(state.historyOffset);
  historyDateLabel.textContent = formatHistoryDateLabel(targetDate);
  historyTimelineList.innerHTML = "";

  const systemItems = state.historySystem.map((entry) => ({
    kind: "system",
    occurredAt: entry.occurredAt,
    payload: entry
  }));
  const textItems = state.historyTexts.map((entry) => ({
    kind: "text",
    occurredAt: entry.createdAt,
    payload: entry
  }));

  const merged = [...systemItems, ...textItems]
    .filter((item) => sameDayIso(item.occurredAt, targetDate))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  if (!merged.length) {
    historyTimelineList.innerHTML = '<div class="empty-state">Sem histórico nesse dia.</div>';
    return;
  }

  merged.forEach((item) => {
    if (item.kind === "system") {
      const entry = item.payload;
      const card = document.createElement("article");
      card.className = `history-item system-${entry.type === "day_close" ? "day-close" : entry.type}`;
      card.innerHTML = `
        <div class="history-item-head">
          <span class="history-icon-badge">${historyIconSvg(entry.type)}</span>
          <span class="history-time">${formatHourChip(entry.occurredAt)}</span>
        </div>
        <div class="history-item-text">${buildSystemMessage(entry)}</div>
      `;
      historyTimelineList.appendChild(card);
      return;
    }

    const entry = item.payload;
    const card = document.createElement("article");
    card.className = "history-text-card";
    card.dataset.historyTextId = entry.id;
    card.dataset.historyTextTitle = entry.title || "Texto";
    card.dataset.historyTextBody = entry.text || "";
    card.innerHTML = `
      <div class="history-text-head">
        <img class="task-avatar" src="${getActionAvatarPath(entry.speaker)}" alt="${escapeHtml(entry.speaker)}" />
        <div>
          <div class="history-text-title">${escapeHtml(entry.title)}</div>
          <div class="task-assignee history-time">${formatHourChip(entry.createdAt)}</div>
        </div>
      </div>
    `;
    historyTimelineList.appendChild(card);
  });
}

function renderHistory() {
  renderHistoryTimeline();
}

function moveHistoryDate(amount) {
  state.historyOffset += amount;
  renderHistory();
}

function registerDailyMissionEvents() {
  const byAssignee = {};
  state.actions.forEach((action) => {
    const assignee = normalizeAssigneeName(action.assignee);
    byAssignee[assignee] = byAssignee[assignee] || { total: 0, completed: 0 };
    byAssignee[assignee].total += 1;
    if (normalizeActionStatus(action.status) === actionStatuses.completed) {
      byAssignee[assignee].completed += 1;
    }
  });
  Object.entries(byAssignee).forEach(([assignee, info]) => {
    if (!info.total || info.completed !== info.total) {
      return;
    }
    const todayKey = `${toLocalDateKey(new Date())}:${assignee}:star`;
    const exists = state.historySystem.some((entry) => entry.scopeDate === todayKey);
    if (!exists) {
      void pushSystemHistoryEvent({ type: "star", assignee, scopeDate: todayKey });
    }
  });
}

function registerDayCloseEventIfNeeded() {
  const selectedDate = dateFromOffset(state.activeOffset);
  const today = todayStart();
  if (selectedDate >= today) {
    return;
  }
  const pending = state.actions.filter((item) => normalizeActionStatus(item.status) !== actionStatuses.completed);
  if (!pending.length) {
    return;
  }
  const completed = state.actions.length - pending.length;
  const percent = state.actions.length ? Math.round((completed / state.actions.length) * 100) : 0;
  const dateKey = toLocalDateKey(selectedDate);
  if (state.historySystem.some((entry) => entry.type === "day_close" && entry.scopeDate === dateKey)) {
    return;
  }
  void pushSystemHistoryEvent({
    type: "day_close",
    assignee: "Geral",
    pendingCount: pending.length,
    percent,
    scopeDate: dateKey,
    occurredAt: `${dateKey}T23:59:59.000Z`
  });
}

function registerSystemEventFromActionTransition(before, after) {
  const prev = normalizeActionStatus(before?.status);
  const next = normalizeActionStatus(after?.status);
  if (prev === next) {
    return;
  }
  const assignee = normalizeAssigneeName(after?.assignee || before?.assignee);
  const taskTitle = after?.title || before?.title || "Tarefa";
  let type = "";
  if (next === actionStatuses.inProgress && prev === actionStatuses.pending) {
    const hasPause = state.historySystem.some((entry) => entry.type === "pause" && entry.taskTitle === taskTitle && entry.assignee === assignee);
    type = hasPause ? "resume" : "start";
  } else if (next === actionStatuses.pending && prev === actionStatuses.inProgress) {
    type = "pause";
  } else if (next === actionStatuses.completed) {
    type = "complete";
  }
  if (!type) {
    return;
  }
  void pushSystemHistoryEvent({
    type,
    assignee,
    taskTitle,
    occurredAt: new Date().toISOString(),
    lateStartMinutes: type === "start" ? getActionLateStartMinutes(after) : 0
  });
}

function setHistoryTextStep(step) {
  state.historyTextComposer.step = step;
  historyTextStepLabel.textContent = `${step} de 2`;
  document.querySelectorAll("[data-history-text-step]").forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.historyTextStep) === step);
  });
  historyTextBackButton.style.visibility = step === 1 ? "hidden" : "visible";
  historyTextNextButton.textContent = step === 2 ? "Salvar texto" : "Continuar";
}

function renderHistorySpeakerSelection() {
  historyTextAvatarGrid?.querySelectorAll("[data-history-speaker]").forEach((button) => {
    button.classList.toggle("active", button.dataset.historySpeaker === state.historyTextComposer.speaker);
  });
}

function renderHistoryLiveText() {
  historyLiveText.textContent = state.historyTextComposer.liveText || "Sem texto ainda.";
}

function openHistoryTextComposer() {
  state.historyTextComposer = {
    step: 1,
    speaker: "Rose",
    liveText: "",
    organizedText: "",
    organizedTitle: "",
    micActive: false
  };
  historyTextComposer.classList.add("active");
  historyTextComposer.setAttribute("aria-hidden", "false");
  historyVoiceStatus.textContent = "Aguardando gravação...";
  historyMicButton?.classList.remove("mic-active");
  historyMicButton?.classList.add("mic-idle");
  setHistoryTextStep(1);
  renderHistorySpeakerSelection();
  renderHistoryLiveText();
}

function closeHistoryTextComposer() {
  stopHistoryMic();
  historyTextComposer.classList.remove("active");
  historyTextComposer.setAttribute("aria-hidden", "true");
}

function cutLastWord() {
  const words = String(state.historyTextComposer.liveText || "").trim().split(/\s+/).filter(Boolean);
  words.pop();
  state.historyTextComposer.liveText = words.join(" ");
  renderHistoryLiveText();
}

function clearAllHistoryText() {
  state.historyTextComposer.liveText = "";
  renderHistoryLiveText();
}

function stopDeleteHold() {
  if (historyDeleteHoldTimer) {
    window.clearTimeout(historyDeleteHoldTimer);
    historyDeleteHoldTimer = null;
  }
  if (historyDeleteHoldInterval) {
    window.clearInterval(historyDeleteHoldInterval);
    historyDeleteHoldInterval = null;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let index = 0; index < bytes.length; index += chunk) {
    const slice = bytes.subarray(index, index + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function startDeleteHold() {
  stopDeleteHold();
  historyDeleteHoldTimer = window.setTimeout(() => {
    historyDeleteHoldInterval = window.setInterval(() => {
      cutLastWord();
    }, 170);
  }, 1000);
}

async function refineHistoryTextWithAi(rawText) {
  const payload = await apiRequest("/api/200/texts/organize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: rawText })
  });
  return {
    title: String(payload.title || "Texto sem título"),
    text: String(payload.text || rawText)
  };
}

function stopHistoryMic() {
  state.historyTextComposer.micActive = false;
  if (historySpeechMonitorTimer) {
    window.clearInterval(historySpeechMonitorTimer);
    historySpeechMonitorTimer = null;
  }
  if (historyMediaRecorder && historyMediaRecorder.state !== "inactive") {
    historyMediaRecorder.stop();
  }
  historyMediaRecorder = null;
  historyAudioAnalyser = null;
  if (historyAudioContext) {
    historyAudioContext.close().catch(() => {});
    historyAudioContext = null;
  }
  if (historyMediaStream) {
    historyMediaStream.getTracks().forEach((track) => track.stop());
    historyMediaStream = null;
  }
  historyMicButton?.classList.remove("mic-active");
  historyMicButton?.classList.add("mic-idle");
}

async function startHistoryMic() {
  if (state.historyTextComposer.micActive) {
    stopHistoryMic();
    historyVoiceStatus.textContent = "Microfone parado.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    historyMediaStream = stream;
    historyAudioContext = new AudioContext();
    const source = historyAudioContext.createMediaStreamSource(stream);
    historyAudioAnalyser = historyAudioContext.createAnalyser();
    historyAudioAnalyser.fftSize = 2048;
    source.connect(historyAudioAnalyser);
    const chunks = [];
    historyMediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    historyMediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };
    historyMediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (!blob.size) {
        return;
      }
      historyVoiceStatus.textContent = "Transcrevendo...";
      const base64 = await blob.arrayBuffer().then((buffer) => arrayBufferToBase64(buffer));
      const transcribed = await apiRequest("/api/audio/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm", fileName: "history-text.webm" })
      });
      const excerpt = String(transcribed?.text || "").trim();
      const joined = `${state.historyTextComposer.liveText} ${excerpt}`.trim().slice(0, 2000);
      state.historyTextComposer.liveText = joined;
      if (joined) {
        const organized = await refineHistoryTextWithAi(joined);
        state.historyTextComposer.organizedText = organized.text.slice(0, 2000);
        state.historyTextComposer.organizedTitle = organized.title;
        state.historyTextComposer.liveText = state.historyTextComposer.organizedText;
      }
      renderHistoryLiveText();
      historyVoiceStatus.textContent = "Texto atualizado.";
    };
    historyMediaRecorder.start();
    state.historyTextComposer.micActive = true;
    historyMicButton?.classList.remove("mic-idle");
    historyMicButton?.classList.add("mic-active");
    historyVoiceStatus.textContent = "Microfone ouvindo...";
    historyLastSpeechAt = Date.now();
    historySpeechMonitorTimer = window.setInterval(() => {
      if (!historyAudioAnalyser) {
        return;
      }
      const buffer = new Uint8Array(historyAudioAnalyser.fftSize);
      historyAudioAnalyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms > 0.02) {
        historyLastSpeechAt = Date.now();
      }
      if (Date.now() - historyLastSpeechAt >= 2000) {
        historyVoiceStatus.textContent = "Silêncio detectado. Encerrando...";
        stopHistoryMic();
      }
    }, 120);
  } catch (error) {
    historyVoiceStatus.textContent = error instanceof Error ? error.message : "Falha no microfone.";
    stopHistoryMic();
  }
}

function stopPlatformNameMic() {
  if (platformNameSpeechMonitorTimer) {
    window.clearInterval(platformNameSpeechMonitorTimer);
    platformNameSpeechMonitorTimer = null;
  }
  if (platformNameMediaRecorder && platformNameMediaRecorder.state !== "inactive") {
    platformNameMediaRecorder.stop();
  }
  platformNameMediaRecorder = null;
  platformNameAudioAnalyser = null;
  if (platformNameAudioContext) {
    platformNameAudioContext.close().catch(() => {});
    platformNameAudioContext = null;
  }
  if (platformNameMediaStream) {
    platformNameMediaStream.getTracks().forEach((track) => track.stop());
    platformNameMediaStream = null;
  }
  platformNameMicButton?.classList.remove("mic-active");
}

async function startPlatformNameMic() {
  if (platformNameMediaRecorder && platformNameMediaRecorder.state !== "inactive") {
    stopPlatformNameMic();
    platformWizardMessage.textContent = "Transcrevendo...";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    platformNameMediaStream = stream;
    platformNameAudioContext = new AudioContext();
    const source = platformNameAudioContext.createMediaStreamSource(stream);
    platformNameAudioAnalyser = platformNameAudioContext.createAnalyser();
    platformNameAudioAnalyser.fftSize = 2048;
    source.connect(platformNameAudioAnalyser);

    const chunks = [];
    platformNameMediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    platformNameMediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };
    platformNameMediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (!blob.size) {
        platformWizardMessage.textContent = "Sem áudio captado.";
        return;
      }
      try {
        const base64 = await blob.arrayBuffer().then((buffer) => arrayBufferToBase64(buffer));
        const transcribed = await apiRequest("/api/audio/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm", fileName: "platform-name.webm" })
        });
        const spoken = String(transcribed?.text || "").trim();
        if (!spoken) {
          platformWizardMessage.textContent = "Não consegui transcrever sua fala.";
          return;
        }
        platformNameInput.value = spoken;
        platformNameInput.dispatchEvent(new Event("input", { bubbles: true }));
        platformWizardMessage.textContent = "Texto transcrito.";
      } catch (error) {
        platformWizardMessage.textContent = error instanceof Error ? error.message : "Falha na transcrição.";
      }
    };
    platformNameMediaRecorder.start();
    platformNameMicButton?.classList.add("mic-active");
    platformWizardMessage.textContent = "Microfone ouvindo...";
    platformNameLastSpeechAt = Date.now();
    platformNameSpeechMonitorTimer = window.setInterval(() => {
      if (!platformNameAudioAnalyser) {
        return;
      }
      const buffer = new Uint8Array(platformNameAudioAnalyser.fftSize);
      platformNameAudioAnalyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms > 0.02) {
        platformNameLastSpeechAt = Date.now();
      }
      if (Date.now() - platformNameLastSpeechAt >= 2000) {
        platformWizardMessage.textContent = "Silêncio detectado. Transcrevendo...";
        stopPlatformNameMic();
      }
    }, 120);
  } catch (error) {
    stopPlatformNameMic();
    platformWizardMessage.textContent = error instanceof Error ? error.message : "Falha ao abrir microfone.";
  }
}
function handleSwipe(element, callback) {
  if (!element) {
    return;
  }

  let startX = 0;

  element.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });

  element.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - startX;

    if (Math.abs(delta) >= 48) {
      callback(delta > 0 ? -1 : 1);
    }
  }, { passive: true });
}

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(button.closest(".workspace-modal")));
});

document.querySelectorAll("[data-day-nav]").forEach((button) => {
  button.addEventListener("click", () => moveActiveDate(Number(button.dataset.dayNav)));
});

financePeriodPrev?.addEventListener("click", () => moveFinancePeriod(-1));
financePeriodNext?.addEventListener("click", () => moveFinancePeriod(1));
document.querySelectorAll("[data-finance-day-nav]").forEach((button) => {
  button.addEventListener("click", () => movePlatformDate(Number(button.dataset.financeDayNav)));
});
document.querySelectorAll("[data-stats-scope-nav]").forEach((button) => {
  button.addEventListener("click", () => moveStatsScope(Number(button.dataset.statsScopeNav)));
});
document.querySelectorAll("[data-constitution-nav]").forEach((button) => {
  button.addEventListener("click", () => moveConstitutionVersion(Number(button.dataset.constitutionNav)));
});

openActionWizardButton.addEventListener("click", () => {
  if (!getToken()) {
    window.location.href = "/auth.html?next=/200";
    return;
  }

  openWizard();
});

closeActionWizardButton.addEventListener("click", closeWizard);
closePlatformWizardButton?.addEventListener("click", closePlatformWizard);
platformNameMicButton?.addEventListener("click", () => {
  void startPlatformNameMic();
});

wizardBackButton.addEventListener("click", () => {
  state.wizard.step = Math.max(1, state.wizard.step - 1);
  renderWizard();
});

wizardNextButton.addEventListener("click", () => {
  if (!validateStep()) {
    return;
  }

  if (state.wizard.step === 4) {
    void saveAction();
    return;
  }

  state.wizard.step += 1;
  renderWizard();
});

platformWizardBackButton?.addEventListener("click", () => {
  state.platformWizard.step = Math.max(1, state.platformWizard.step - 1);
  renderPlatformWizard();
});

platformWizardNextButton?.addEventListener("click", () => {
  platformWizardMessage.textContent = "";
  if (state.platformWizard.step === 1 && platformNameInput.value.trim().length < 2) {
    platformWizardMessage.textContent = "Digite um nome válido.";
    return;
  }

  if (state.platformWizard.step === 2) {
    const raw = String(platformValueInput.value || "").replace(/\./g, "").replace(",", ".");
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      platformWizardMessage.textContent = "Digite um valor válido.";
      return;
    }
  }

  if (state.platformWizard.step === 3 && state.platformWizard.recurrenceType === "SIMPLE") {
    void savePlatformEntry();
    return;
  }

  if (state.platformWizard.step === 4) {
    void savePlatformEntry();
    return;
  }

  state.platformWizard.step += 1;
  renderPlatformWizard();
});

platformWizardAiCreateButton?.addEventListener("click", () => {
  const text = String(platformNameInput.value || "").trim();
  if (!text) {
    platformWizardMessage.textContent = "Digite a frase para a IA criar.";
    return;
  }
  platformWizardMessage.textContent = "Interpretando e criando...";
  void (async () => {
    try {
      await createPlatformEntryFromVoiceInterpret(text);
      closePlatformWizard();
      platformWizardMessage.textContent = "";
    } catch (error) {
      platformWizardMessage.textContent = error instanceof Error ? error.message : "Falha ao criar.";
    }
  })();
});

repeatToggle.addEventListener("click", () => {
  state.wizard.repeatOpen = !state.wizard.repeatOpen;
  renderRepeatControls();
});
repeatModeBackButton?.addEventListener("click", () => {
  state.wizard.repeatMode = "none";
  state.wizard.repeatDays = [];
  renderRepeatControls();
});

document.querySelectorAll("[data-wizard-date]").forEach((button) => {
  button.addEventListener("click", () => moveWizardDate(Number(button.dataset.wizardDate)));
});

document.querySelectorAll("[data-periodic-nav]").forEach((button) => {
  button.addEventListener("click", () => shiftPeriodicEveryDays(Number(button.dataset.periodicNav)));
  button.addEventListener("pointerdown", () => {
    const direction = Number(button.dataset.periodicNav || 0);
    if (!direction) return;
    if (periodicHoldTimer) window.clearTimeout(periodicHoldTimer);
    if (periodicHoldInterval) window.clearInterval(periodicHoldInterval);
    periodicHoldTimer = window.setTimeout(() => {
      shiftPeriodicHoldTen(direction);
      periodicHoldInterval = window.setInterval(() => {
        shiftPeriodicHoldTen(direction);
      }, 500);
    }, 500);
  });
});

["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
  document.querySelectorAll("[data-periodic-nav]").forEach((button) => {
    button.addEventListener(evt, () => {
      if (periodicHoldTimer) {
        window.clearTimeout(periodicHoldTimer);
        periodicHoldTimer = null;
      }
      if (periodicHoldInterval) {
        window.clearInterval(periodicHoldInterval);
        periodicHoldInterval = null;
      }
    });
  });
});

document.querySelectorAll("[data-monthly-ordinal-nav]").forEach((button) => {
  button.addEventListener("click", () => shiftMonthlyOrdinal(Number(button.dataset.monthlyOrdinalNav)));
});

document.querySelectorAll("[data-monthly-weekday-nav]").forEach((button) => {
  button.addEventListener("click", () => shiftMonthlyWeekday(Number(button.dataset.monthlyWeekdayNav)));
});

avoidSaturdayInput?.addEventListener("change", () => {
  state.wizard.avoidSaturday = Boolean(avoidSaturdayInput.checked);
});

avoidSundayInput?.addEventListener("change", () => {
  state.wizard.avoidSunday = Boolean(avoidSundayInput.checked);
});

document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
  button.addEventListener("click", () => setRepeatMode(button.dataset.repeatMode));
});

closeOverlapWizard?.addEventListener("click", () => closeOverlapWizardWith({ type: "cancel" }));
overlapReplaceButton?.addEventListener("click", () => closeOverlapWizardWith({ type: "replace" }));
overlapChangeTimeButton?.addEventListener("click", () => closeOverlapWizardWith({ type: "change_time" }));
overlapApplyFreeButton?.addEventListener("click", () => {
  if (!state.overlapCandidateStarts.length) {
    closeOverlapWizardWith({ type: "change_time" });
    return;
  }
  const startAt = state.overlapCandidateStarts[state.overlapCandidateIndex % state.overlapCandidateStarts.length];
  closeOverlapWizardWith({ type: "use_free", startAt });
});
overlapFreePrev?.addEventListener("click", () => {
  if (!state.overlapCandidateStarts.length) return;
  state.overlapCandidateIndex = (state.overlapCandidateIndex - 1 + state.overlapCandidateStarts.length) % state.overlapCandidateStarts.length;
  renderOverlapWizard();
});
overlapFreeNext?.addEventListener("click", () => {
  if (!state.overlapCandidateStarts.length) return;
  state.overlapCandidateIndex = (state.overlapCandidateIndex + 1) % state.overlapCandidateStarts.length;
  renderOverlapWizard();
});

document.querySelectorAll("[data-platform-kind]").forEach((button) => {
  button.addEventListener("click", () => {
    state.platformWizard.kind = button.dataset.platformKind;
    document.querySelectorAll("[data-platform-kind]").forEach((other) => {
      other.classList.toggle("active", other.dataset.platformKind === state.platformWizard.kind);
    });
    renderPlatformCategoryOptions();
  });
});

platformCategoryRow?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-platform-category]");
  if (!button) {
    return;
  }
  state.platformWizard.category = button.dataset.platformCategory;
  renderPlatformCategoryOptions();
});

document.querySelectorAll("[data-platform-recurrence]").forEach((button) => {
  button.addEventListener("click", () => {
    state.platformWizard.recurrenceType = button.dataset.platformRecurrence;
    document.querySelectorAll("[data-platform-recurrence]").forEach((other) => {
      other.classList.toggle("active", other.dataset.platformRecurrence === state.platformWizard.recurrenceType);
    });
    if (state.platformWizard.recurrenceType === "RECURRING" && state.platformWizard.step < 4) {
      state.platformWizard.step = 4;
    }
    renderPlatformWizard();
  });
});

document.querySelectorAll("[data-platform-day]").forEach((button) => {
  button.addEventListener("click", () => movePlatformRecurrenceDay(Number(button.dataset.platformDay)));
});

weekdayRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-weekday]");

  if (button) {
    toggleWeekday(Number(button.dataset.weekday));
  }
});

actionForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-time]");

  if (!button) {
    return;
  }

  moveTime(button.dataset.time, button.dataset.unit, Number(button.dataset.dir));
});

actionForm.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("[data-time]");
  if (!button) return;
  const type = button.dataset.time;
  const unit = button.dataset.unit;
  const dir = Number(button.dataset.dir || 0);
  if (!dir) return;
  if (timeButtonHoldTimer) window.clearTimeout(timeButtonHoldTimer);
  if (timeButtonHoldInterval) window.clearInterval(timeButtonHoldInterval);
  timeButtonHoldTimer = window.setTimeout(() => {
    moveTimeHoldFive(type, unit, dir);
    timeButtonHoldInterval = window.setInterval(() => {
      moveTimeHoldFive(type, unit, dir);
    }, 500);
  }, 500);
});

["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
  actionForm.addEventListener(evt, () => {
    if (timeButtonHoldTimer) {
      window.clearTimeout(timeButtonHoldTimer);
      timeButtonHoldTimer = null;
    }
    if (timeButtonHoldInterval) {
      window.clearInterval(timeButtonHoldInterval);
      timeButtonHoldInterval = null;
    }
  });
});

actionForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

actionsList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-action-id]");
  if (!row) {
    const sleepRow = event.target.closest("[data-sleep-slot]");
    if (sleepRow) {
      return;
    }
  }
  if (!row) {
    return;
  }
  if (row.dataset.freeSlot === "1") {
    return;
  }
  beginActionLongPress(row.dataset.actionId);
});

actionsList.addEventListener("pointerup", endActionLongPress);
actionsList.addEventListener("pointerleave", endActionLongPress);
actionsList.addEventListener("pointercancel", endActionLongPress);

actionsList.addEventListener("click", async (event) => {
  const sleepRow = event.target.closest("[data-sleep-slot]");
  if (sleepRow) {
    renderSleepLabels();
    openModal("sleepConfigModal");
    closeActionsModalWithFade();
    return;
  }
  const row = event.target.closest("[data-action-id]");
  if (!row) {
    return;
  }
  if (row.dataset.freeSlot === "1") {
    return;
  }
  const actionId = row.dataset.actionId;
  if (longPressHandledActionId === actionId) {
    longPressHandledActionId = "";
    return;
  }
  await toggleActionStatus(actionId);
});

platformEntriesList?.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-occurrence-id]");
  if (!row) {
    return;
  }
  beginPlatformLongPress(String(row.dataset.occurrenceId || ""));
});

platformEntriesList?.addEventListener("pointerup", endPlatformLongPress);
platformEntriesList?.addEventListener("pointerleave", endPlatformLongPress);
platformEntriesList?.addEventListener("pointercancel", endPlatformLongPress);

platformEntriesList?.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-occurrence-id]");
  const occurrenceId = String(row?.dataset?.occurrenceId || "").trim();
  if (occurrenceId && platformLongPressHandledOccurrenceId === occurrenceId) {
    platformLongPressHandledOccurrenceId = "";
    const entryName = String(row?.dataset?.entryName || "lançamento");
    const confirmedDelete = window.confirm(`Apagar este item de finanças?\n\n${entryName}`);
    if (!confirmedDelete) {
      return;
    }
    try {
      await apiRequest(`/api/platform/occurrences/${encodeURIComponent(occurrenceId)}`, {
        method: "DELETE"
      });
      await loadPlatformFinance();
    } catch (error) {
      platformEntriesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
    return;
  }

  const button = event.target.closest("[data-delete-platform-entry]");
  if (!button) {
    const status = String(row?.dataset?.status || "").trim().toUpperCase();
    if (row && (status === "DUE_TODAY" || status === "OVERDUE")) {
      const kind = String(row.dataset.kind || "").toUpperCase();
      const amountCents = Number(row.dataset.amountCents || 0);
      const label = row.dataset.entryName || "lançamento";
      const message = kind === "INCOME"
        ? `Confirmar recebimento de ${formatMoney(amountCents)} em "${label}"?`
        : `Confirmar pagamento de ${formatMoney(-amountCents)} em "${label}"?`;
      if (window.confirm(message)) {
        await payPlatformOccurrenceNow(row.dataset.occurrenceId);
      }
    }
    return;
  }

  const entryId = String(button.dataset.deletePlatformEntry || "").trim();
  if (!entryId) {
    return;
  }

  if (!window.confirm("Excluir este lançamento recorrente? Os valores já realizados permanecem.")) {
    return;
  }

  try {
    await apiRequest(`/api/platform/entries/${encodeURIComponent(entryId)}`, {
      method: "DELETE"
    });
    await loadPlatformFinance();
  } catch (error) {
    platformEntriesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
});

actionsList.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const row = event.target.closest("[data-action-id]");

  if (!row) {
    return;
  }
  if (row.dataset.freeSlot === "1") {
    return;
  }

  event.preventDefault();
  await toggleActionStatus(row.dataset.actionId);
});

handleSwipe(activeDateLabel, moveActiveDate);
handleSwipe(financePeriodLabel, moveFinancePeriod);
handleSwipe(financePeriodPicker, moveFinancePeriod);
handleSwipe(financeDateLabel, movePlatformDate);
renderFinancePeriod();
renderDateHeader();

openPlatformWizardButton?.addEventListener("click", () => {
  if (!getToken()) {
    window.location.href = "/auth.html?next=/200";
    return;
  }
  openPlatformWizard();
});
closeFinanceEntryConfirmButton?.addEventListener("click", () => closeFinanceEntryConfirm(false));
financeEntryConfirmCancel?.addEventListener("click", () => closeFinanceEntryConfirm(false));
financeEntryConfirmApply?.addEventListener("click", () => closeFinanceEntryConfirm(true));

platformForm?.addEventListener("submit", (event) => {
  event.preventDefault();
});

togglePlatformBalanceButton?.addEventListener("click", () => {
  state.platformBalanceHidden = !state.platformBalanceHidden;
  renderPlatformBalance();
});

addPlatformBalanceButton?.addEventListener("click", () => {
  void addPlatformBalanceNow();
});

editStatsGoalsButton?.addEventListener("click", () => {
  void editStatsGoals();
});
openConstitutionEditButton?.addEventListener("click", startConstitutionEdit);
cancelConstitutionEditButton?.addEventListener("click", () => {
  state.constitutionEditing = false;
  constitutionEditWrap.hidden = true;
  constitutionMessage.textContent = "";
});
saveConstitutionEditButton?.addEventListener("click", () => {
  void saveConstitutionEdit();
});
constitutionAvatars?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-constitution-approver]");
  if (!button) {
    return;
  }
  void approveConstitution(button.dataset.constitutionApprover || "");
});

historyTimelineList?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-history-text-id]");
  if (!card) {
    return;
  }
  if (historyReadTitle) {
    historyReadTitle.textContent = card.dataset.historyTextTitle || "Texto";
  }
  if (historyReadBody) {
    historyReadBody.textContent = card.dataset.historyTextBody || "";
  }
  openModal("historyReadModal");
});

openHistoryTextComposerButton?.addEventListener("click", openHistoryTextComposer);
closeHistoryTextComposerButton?.addEventListener("click", closeHistoryTextComposer);

historyTextAvatarGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-speaker]");
  if (!button) {
    return;
  }
  state.historyTextComposer.speaker = button.dataset.historySpeaker || "Rose";
  renderHistorySpeakerSelection();
});

historyTextBackButton?.addEventListener("click", () => {
  setHistoryTextStep(Math.max(1, state.historyTextComposer.step - 1));
});

historyMicButton?.addEventListener("click", () => {
  void startHistoryMic();
});

actionMicButton?.addEventListener("click", () => {
  void startActionMic();
});

closeActionStatusWizardButton?.addEventListener("click", closeActionStatusWizard);
actionManualFinishButton?.addEventListener("click", () => {
  actionStatusOptionsStep.hidden = true;
  actionStatusManualStep.hidden = false;
  actionStatusManualMessage.textContent = "";
});
actionManualBackButton?.addEventListener("click", () => {
  actionStatusManualStep.hidden = true;
  actionStatusOptionsStep.hidden = false;
  actionStatusManualMessage.textContent = "";
});
actionRestoreButton?.addEventListener("click", () => {
  if (!actionStatusTargetId) {
    return;
  }
  void (async () => {
    try {
      await restoreActionToPending(actionStatusTargetId);
      closeActionStatusWizard();
    } catch (error) {
      actionStatusWizardMessage.textContent = error instanceof Error ? error.message : "Falha ao restaurar.";
    }
  })();
});
actionManualSaveButton?.addEventListener("click", () => {
  if (!actionStatusTargetId) {
    return;
  }
  void (async () => {
    try {
      await manualFinishAction(actionStatusTargetId);
      closeActionStatusWizard();
    } catch (error) {
      actionStatusManualMessage.textContent = error instanceof Error ? error.message : "Falha ao finalizar manual.";
    }
  })();
});

actionAiEditButton?.addEventListener("click", () => {
  hideActionAiConfirmation();
  actionVoiceStatus.textContent = "Edite manualmente e continue.";
});

actionAiEditDatesButton?.addEventListener("click", () => {
  state.wizard.step = 2;
  hideActionAiConfirmation();
  renderWizard();
  actionVoiceStatus.textContent = "Edite as datas.";
});

actionAiRenameMicButton?.addEventListener("click", () => {
  state.wizard.step = 1;
  hideActionAiConfirmation();
  renderWizard();
  void startActionMic();
});

actionAiApplyButton?.addEventListener("click", () => {
  applyPendingInterpretedActionAndContinue();
  actionVoiceStatus.textContent = "Dados aplicados.";
});

document.querySelectorAll("[data-ai-time-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = String(button.dataset.aiTimeNav || "start");
    const dir = Number(button.dataset.dir || 0);
    if (!dir) return;
    moveTime(type, "minute", dir);
    if (type === "start") {
      actionAiConfirmStart.textContent = `${String(state.wizard.startHour).padStart(2, "0")}:${String(state.wizard.startMinute).padStart(2, "0")}`;
    } else {
      actionAiConfirmEnd.textContent = `${String(state.wizard.endHour).padStart(2, "0")}:${String(state.wizard.endMinute).padStart(2, "0")}`;
    }
  });
});

runningTaskFinalizeButton?.addEventListener("click", () => {
  void (async () => {
    const runningAction = getRunningActionForSelectedProfile();
    if (!runningAction) {
      return;
    }
    const duration = getActionDurationMinutes(runningAction);
    const startedAtMs = new Date(runningAction?.startedAt || runningAction?.startAt).getTime();
    const elapsed = Number.isFinite(startedAtMs) ? Math.max(0, (Date.now() - startedAtMs) / (60 * 1000)) : duration;
    const bonusBefore = Math.max(0, Number(runningCarryOverMinutes || 0));
    const remainingAfterBonus = Math.max(0, elapsed - bonusBefore);
    const savedMinutes = Math.max(0, Math.floor(duration - remainingAfterBonus));
    await toggleActionStatus(runningAction.id);
    const after = state.actions.find((item) => item.id === runningAction.id);
    if (normalizeActionStatus(after?.status) === actionStatuses.completed) {
      const nextAction = getNextTimelineEntryForRunning(runningAction);
      if (nextAction) {
        runningCarryOverMinutes = savedMinutes;
        runningTaskName.textContent = String(nextAction.kind === "free" ? "Tempo livre" : (nextAction.title || "Tarefa"));
        const nextOfNext = getNextTimelineEntryForRunning(nextAction);
        runningTaskNextName.textContent = nextOfNext
          ? String(nextOfNext.kind === "free" ? `Tempo livre (${formatMinutesHuman(getActionDurationMinutes(nextOfNext))})` : (nextOfNext.title || "Tarefa"))
          : "Descanso";
        runningTaskMinutesLeft.textContent = `${runningCarryOverMinutes} min de saldo`;
        runningTaskMinutesLeft.classList.toggle("is-bonus", runningCarryOverMinutes > 0);
        if (runningTaskStartNextButton) {
          runningTaskStartNextButton.hidden = false;
          runningTaskStartNextButton.dataset.actionId = String(nextAction.id || "");
          runningTaskStartNextButton.dataset.kind = String(nextAction.kind || "action");
          runningTaskStartNextButton.dataset.startIso = String(nextAction.startAt || "");
          runningTaskStartNextButton.dataset.endIso = String(nextAction.endAt || "");
        }
      } else {
        const summary = getCompletionSummaryForSelectedProfile();
        if (dayDonePercent) {
          dayDonePercent.textContent = `${summary.percent}%`;
        }
        if (dayDoneDelay) {
          dayDoneDelay.textContent = `Atraso: ${summary.late} min`;
        }
        openModal("dayDoneModal");
      }
    }
  })();
});

runningTaskStartNextButton?.addEventListener("click", () => {
  const kind = String(runningTaskStartNextButton.dataset.kind || "action");
  if (kind === "free") {
    const start = new Date(String(runningTaskStartNextButton.dataset.startIso || ""));
    const end = new Date(String(runningTaskStartNextButton.dataset.endIso || ""));
    openWizard();
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
      const today = todayStart();
      const day = new Date(start);
      day.setHours(0, 0, 0, 0);
      state.wizard.dateOffset = Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      state.wizard.startHour = start.getHours();
      state.wizard.startMinute = start.getMinutes();
      state.wizard.endHour = end.getHours();
      state.wizard.endMinute = end.getMinutes();
      state.wizard.step = 1;
      renderWizard();
    }
    return;
  }
  const actionId = String(runningTaskStartNextButton.dataset.actionId || "").trim();
  if (!actionId) return;
  void toggleActionStatus(actionId);
});

historyDeleteWordButton?.addEventListener("click", cutLastWord);
historyDeleteWordButton?.addEventListener("pointerdown", startDeleteHold);
historyDeleteWordButton?.addEventListener("pointerup", stopDeleteHold);
historyDeleteWordButton?.addEventListener("pointerleave", stopDeleteHold);
historyDeleteWordButton?.addEventListener("pointercancel", stopDeleteHold);
historyClearTextButton?.addEventListener("click", clearAllHistoryText);

historyTextForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.historyTextComposer.step === 1) {
    setHistoryTextStep(2);
    return;
  }
  const text = String(state.historyTextComposer.liveText || "").trim();
  if (!text) {
    historyVoiceStatus.textContent = "Fale algum texto antes de salvar.";
    return;
  }
  const title = String(state.historyTextComposer.organizedTitle || "").trim() || "Texto novo";
  void (async () => {
    try {
      const payload = await apiRequest("/api/200/history/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: state.historyTextComposer.speaker,
          title,
          text: text.slice(0, 2000),
          createdAt: new Date().toISOString()
        })
      });
      if (payload?.entry) {
        state.historyTexts = [payload.entry, ...state.historyTexts.filter((item) => item.id !== payload.entry.id)];
      }
      renderHistory();
      closeHistoryTextComposer();
    } catch (error) {
      historyVoiceStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar texto.";
    }
  })();
});
state.profileLock = "";
applySelectedProfile(readSelectedProfile());
void (async () => {
  const ok = await ensureProject200Session();
  if (ok) {
    await loadActions();
  } else {
    renderHomeRunningTask();
  }
})();

profileButtons.forEach((button) => {
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  const avatar = button.querySelector("img");
  if (avatar) {
    avatar.setAttribute("draggable", "false");
  }
  button.addEventListener("click", () => {
    const profile = String(button.dataset.profile || "Rose");
    if (profileLongPressHandledProfile === profile) {
      profileLongPressHandledProfile = "";
      return;
    }
    applySelectedProfile(profile);
    renderActions();
  });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const profile = String(button.dataset.profile || "").trim();
    if (!profile) return;
    profilePressStartedAt = Date.now();
    profilePressProfile = profile;
    if (profileHoldTimer) {
      window.clearTimeout(profileHoldTimer);
      profileHoldTimer = null;
    }
  });
  button.addEventListener("pointerup", () => {
    const heldMs = profilePressStartedAt ? (Date.now() - profilePressStartedAt) : 0;
    const profile = profilePressProfile;
    profilePressStartedAt = 0;
    profilePressProfile = "";
    if (heldMs >= 500 && profile) {
      profileLongPressHandledProfile = profile;
      openProfileLinkOverlay(profile);
    }
  });
  ["pointerleave", "pointercancel"].forEach((evt) => {
    button.addEventListener(evt, () => {
      profilePressStartedAt = 0;
      profilePressProfile = "";
      if (profileHoldTimer) {
        window.clearTimeout(profileHoldTimer);
        profileHoldTimer = null;
      }
    });
  });
});

profileLinkCancel?.addEventListener("click", closeProfileLinkOverlay);
closeStartDecisionModal?.addEventListener("click", () => closeStartDecisionModalWith("cancel"));
profileLinkForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = String(profileLinkUsername?.value || "").trim();
  if (!profileLinkTarget) {
    if (profileLinkMessage) profileLinkMessage.textContent = "Selecione um perfil.";
    return;
  }
  if (!username) {
    if (profileLinkMessage) profileLinkMessage.textContent = "Digite um nome de usuário.";
    return;
  }
  if (profileLinkMessage) profileLinkMessage.textContent = "Validando...";
  void (async () => {
    try {
      const foundUser = await createProfileLink(username, profileLinkTarget);
      if (!foundUser?.username) {
        throw new Error("Usuário não encontrado.");
      }
      state.profileLock = "";
      renderActions();
      if (profileLinkMessage) profileLinkMessage.textContent = "Vínculo realizado com sucesso.";
      window.setTimeout(() => {
        closeProfileLinkOverlay();
      }, 450);
    } catch (error) {
      if (profileLinkMessage) {
        profileLinkMessage.textContent = error instanceof Error ? error.message : "Falha ao vincular.";
      }
    }
  })();
});

project200LoginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = String(project200Username?.value || "").trim();
  const password = String(project200Password?.value || "");
  if (!username || !password) {
    if (project200LoginMessage) project200LoginMessage.textContent = "Preencha usuário e senha.";
    return;
  }
  if (project200LoginMessage) project200LoginMessage.textContent = "Entrando...";
  void (async () => {
    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        throw new Error(data?.error || "Falha no login.");
      }
      setToken(String(data.token));
      refreshProfileLockFromAuth(data?.user || null);
      if (state.profileLock) {
        applySelectedProfile(state.profileLock);
      }
      if (project200LoginMessage) project200LoginMessage.textContent = "Acesso liberado.";
      project200LoginOverlay?.classList.remove("active");
      project200LoginOverlay?.setAttribute("aria-hidden", "true");
      await loadActions();
    } catch (error) {
      if (project200LoginMessage) {
        project200LoginMessage.textContent = error instanceof Error ? error.message : "Falha no login.";
      }
    }
  })();
});

document.querySelectorAll("[data-sleep-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    if (sleepNavLongPressHandled) {
      sleepNavLongPressHandled = false;
      return;
    }
    const target = String(button.dataset.sleepNav || "start");
    const dir = Number(button.dataset.dir || 0);
    if (!dir) return;
    moveSleepTime(target, dir * 5);
  });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const target = String(button.dataset.sleepNav || "start");
    const dir = Number(button.dataset.dir || 0);
    if (!dir) return;
    sleepNavLongPressHandled = false;
    if (sleepNavHoldTimer) {
      window.clearTimeout(sleepNavHoldTimer);
      sleepNavHoldTimer = null;
    }
    if (sleepNavHoldInterval) {
      window.clearInterval(sleepNavHoldInterval);
      sleepNavHoldInterval = null;
    }
    sleepNavHoldTimer = window.setTimeout(() => {
      sleepNavLongPressHandled = true;
      moveSleepTime(target, dir * 60);
      sleepNavHoldInterval = window.setInterval(() => {
        moveSleepTime(target, dir * 60);
      }, 600);
    }, 500);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    button.addEventListener(evt, () => {
      if (sleepNavHoldTimer) {
        window.clearTimeout(sleepNavHoldTimer);
        sleepNavHoldTimer = null;
      }
      if (sleepNavHoldInterval) {
        window.clearInterval(sleepNavHoldInterval);
        sleepNavHoldInterval = null;
      }
    });
  });
});

saveSleepConfigBtn?.addEventListener("click", () => {
  const baseDate = dateFromOffset(state.activeOffset);
  const sleepStart = new Date(baseDate);
  sleepStart.setHours(state.sleepConfig.startHour, state.sleepConfig.startMinute, 0, 0);
  const sleepEnd = new Date(sleepStart);
  sleepEnd.setDate(sleepEnd.getDate() + 1);
  sleepEnd.setHours(state.sleepConfig.endHour, state.sleepConfig.endMinute, 0, 0);
  const hasOverlap = getVisibleActions().some((action) => {
    const start = new Date(action.startAt).getTime();
    const end = new Date(action.endAt).getTime();
    return end > sleepStart.getTime() && start < sleepEnd.getTime();
  });
  if (hasOverlap && !window.confirm("Esse horário de sono sobrepõe tarefas. Deseja continuar mesmo assim?")) {
    return;
  }
  saveSleepConfig();
  closeModal(sleepConfigModal);
  renderActions();
});

loadSleepConfig();

document.querySelectorAll("[data-history-day-nav]").forEach((button) => {
  button.addEventListener("click", () => moveHistoryDate(Number(button.dataset.historyDayNav)));
});

handleSwipe(historyDateLabel, moveHistoryDate);
handleSwipe(historyTimelineList, moveHistoryDate);
startHomeDateTimeTicker();
startRunningTaskTicker();








