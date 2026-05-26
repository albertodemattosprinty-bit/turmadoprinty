import { getApiUrl } from "../api.js";

const tokenKey = "turma_do_printy_token";
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
const platformIncomeCategories = ["Eventos", "Inscricoes", "Apoiadores", "Site", "Venda de ativo"];
const platformExpenseCategories = ["Alimentacao", "Aluguel", "Carro", "Eventos", "Servicos casa", "Anuncios", "Plataformas", "Lazer"];
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
  "Venda de ativo": "/200/icons/venda-de-ativo.svg"
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
const recurrenceDays = {
  none: [],
  daily: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5]
};
const historySystemStorageKey = "project200_history_system_v1";
const historyTextsStorageKey = "project200_history_texts_v1";
const historySpeakerOptions = ["Rose", "Alberto", "Lucas", "Thainan"];

const activeDateLabel = document.getElementById("activeDateLabel");
const actionsAuthAlert = document.getElementById("actionsAuthAlert");
const actionsList = document.getElementById("actionsList");
const actionsProgress = document.getElementById("actionsProgress");
const actionsProgressLabel = document.getElementById("actionsProgressLabel");
const actionsProgressMinutes = document.getElementById("actionsProgressMinutes");
const actionsProgressFill = document.getElementById("actionsProgressFill");
const financeDateLabel = document.getElementById("financeDateLabel");
const platformEntriesList = document.getElementById("platformEntriesList");
const platformMonthlyIncome = document.getElementById("platformMonthlyIncome");
const platformMonthlyExpense = document.getElementById("platformMonthlyExpense");
const platformExpenseCard = document.getElementById("platformExpenseCard");
const platformIncomeCard = document.getElementById("platformIncomeCard");
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
const platformNameInput = document.getElementById("platformName");
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
const wizardAssigneeLabel = document.getElementById("wizardAssigneeLabel");
const repeatToggle = document.getElementById("repeatToggle");
const repeatBox = document.getElementById("repeatBox");
const weekdayRow = document.getElementById("weekdayRow");
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
const historyDeleteWordButton = document.getElementById("historyDeleteWordButton");
const historyClearTextButton = document.getElementById("historyClearTextButton");
const historyVoiceStatus = document.getElementById("historyVoiceStatus");
const historyLiveText = document.getElementById("historyLiveText");
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let financeTimer = null;
let platformMetricsTicker = null;
let longPressTimer = null;
let longPressHandledActionId = "";
let historyDeleteHoldTimer = null;
let historyDeleteHoldInterval = null;
let historyMediaRecorder = null;
let historyMediaStream = null;
let historyAudioContext = null;
let historyAudioAnalyser = null;
let historySpeechMonitorTimer = null;
let historyLastSpeechAt = 0;

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
  wizard: buildInitialWizardState()
};

function getToken() {
  return window.localStorage.getItem(tokenKey) || "";
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
  return assigneeOptions[state.wizard.assigneeIndex] || "Geral";
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

  const end = new Date(rounded.getTime() + 60 * 60 * 1000);

  return {
    step: 1,
    dateOffset: 0,
    assigneeIndex: 1,
    repeatOpen: false,
    repeatMode: "none",
    repeatDays: [],
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

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  if (id === "actionsModal") {
    void loadActions();
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
    loadHistoryFromStorage();
    renderHistory();
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

  if (modal.id === "historyModal") {
    closeHistoryTextComposer();
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

  if (!state.actions.length) {
    actionsList.innerHTML = '<div class="empty-state">Sem tarefas nesse dia.</div>';
    renderActionsProgress();
    return;
  }

  state.actions.forEach((action) => {
    const status = normalizeActionStatus(action.status);
    const assignee = normalizeAssigneeName(action.assignee);
    const avatarPath = getActionAvatarPath(assignee);
    const stateClass = status === actionStatuses.inProgress
      ? " task-in-progress"
      : (status === actionStatuses.completed ? " task-completed" : "");
    const row = document.createElement("article");
    row.className = `task-row${stateClass}`;
    row.dataset.actionId = action.id;
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.innerHTML = `
      <img class="task-avatar" src="${avatarPath}" alt="${escapeHtml(`Avatar de ${assignee}`)}" loading="lazy" />
      <div class="task-main">
        <div class="task-title">${escapeHtml(action.title)}</div>
        <div class="task-assignee">${escapeHtml(assignee)}</div>
      </div>
      <div class="task-time">${formatHourChip(action.startAt)}</div>
    `;
    actionsList.appendChild(row);
  });

  renderActionsProgress();
}

function getActionDurationMinutes(action) {
  const start = new Date(action.startAt).getTime();
  const end = new Date(action.endAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / (60 * 1000)));
}

function renderActionsProgress() {
  if (!getToken()) {
    actionsProgress.hidden = true;
    return;
  }

  actionsProgress.hidden = false;

  const totalMinutes = state.actions.reduce((sum, action) => sum + getActionDurationMinutes(action), 0);
  const completedMinutes = state.actions.reduce((sum, action) => {
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
}

async function toggleActionStatus(actionId) {
  const targetId = String(actionId || "").trim();

  if (!targetId) {
    return;
  }

  const targetAction = state.actions.find((item) => item.id === targetId);

  if (!targetAction) {
    return;
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
    state.wizard.assigneeIndex = Math.max(0, assigneeOptions.indexOf(normalizeAssigneeName(action.assignee)));
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
  actionWizard.classList.add("active");
  actionWizard.setAttribute("aria-hidden", "false");
  renderWizard();
  setTimeout(() => taskTitle.focus(), 60);
}

function closeWizard() {
  actionWizard.classList.remove("active");
  actionWizard.setAttribute("aria-hidden", "true");
}

function renderWizard() {
  const { step } = state.wizard;
  wizardStepLabel.textContent = `${step} de 5`;

  document.querySelectorAll(".wizard-step").forEach((section) => {
    const isActive = Number(section.dataset.step) === step;
    section.classList.toggle("active", isActive);
  });

  wizardBackButton.style.visibility = step === 1 ? "hidden" : "visible";
  wizardNextButton.textContent = step === 5 ? "Salvar" : "Continuar";
  wizardDateLabel.textContent = formatDateLabel(dateFromOffset(state.wizard.dateOffset));
  wizardAssigneeLabel.textContent = getWizardAssigneeName();
  renderRepeatControls();
  renderTimePickers();
}

function renderRepeatControls() {
  repeatBox.hidden = !state.wizard.repeatOpen;
  repeatToggle.classList.toggle("active", state.wizard.repeatOpen);

  document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.repeatMode === state.wizard.repeatMode);
  });

  weekdayRow.innerHTML = "";
  weekdayLabels.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.weekday = String(index);
    button.classList.toggle("active", state.wizard.repeatDays.includes(index));
    weekdayRow.appendChild(button);
  });
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

function moveWizardAssignee(direction) {
  const total = assigneeOptions.length;
  state.wizard.assigneeIndex = (state.wizard.assigneeIndex + direction + total) % total;
  wizardAssigneeLabel.textContent = getWizardAssigneeName();
}

function moveTime(type, unit, direction) {
  const prefix = type === "start" ? "start" : "end";
  const key = unit === "hour" ? `${prefix}Hour` : `${prefix}Minute`;
  const max = unit === "hour" ? 24 : 12;
  const step = unit === "hour" ? 1 : 5;
  const current = state.wizard[key];
  const normalized = unit === "hour"
    ? (current + direction + max) % max
    : ((((current / 5) + direction + max) % max) * step);

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
        occurrences: buildOccurrences()
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
  const choice = window.prompt("Opções da tarefa:\n1 - Excluir\n2 - Editar", "2");
  if (choice == null) {
    return;
  }

  const action = state.actions.find((item) => item.id === actionId);
  if (!action) {
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
  if (status === "DUE_TODAY") {
    return "task-pending-due";
  }
  if (status === "OVERDUE") {
    return "task-overdue";
  }
  return entry.kind === "INCOME" ? "task-completed" : "task-in-progress";
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
  if (!platformExpenseCard || !platformIncomeCard) {
    return;
  }

  const showExpense = state.platformMetricIndex % 2 === 0;
  platformExpenseCard.hidden = !showExpense;
  platformIncomeCard.hidden = showExpense;
}

function startPlatformMetricsRotation() {
  renderPlatformMetricCards();

  if (platformMetricsTicker) {
    window.clearInterval(platformMetricsTicker);
    platformMetricsTicker = null;
  }

  platformMetricsTicker = window.setInterval(() => {
    state.platformMetricIndex = (state.platformMetricIndex + 1) % 2;
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
    row.className = `task-row platform-entry-row ${kindClass} ${getPlatformStatusClass(entry)}`;
    row.dataset.occurrenceId = entry.id || "";
    row.dataset.status = String(entry.status || "").trim().toUpperCase();
    row.innerHTML = `
      <div class="task-title">${escapeHtml(entry.name)}</div>
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
    dailyIncomeGoalCents: 0,
    monthlyBalanceGoalCents: 0,
    recurringIncomeGoalCents: 0
  };
  const totals = summary.totals || {};
  const recurringIncome = Number(state.platformBaseIncomeCents || 0);

  const dailyPercent = safeGoalPercent(Number(totals.incomeCents || 0), Number(goals.dailyIncomeGoalCents || 0));
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
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const payload = {
      name,
      total,
      completed,
      percent
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
  const general = state.statsGeneral || { percent: 0, completed: 0, total: 0 };
  statsGeneralAvatar.src = actionAvatarByAssignee.Geral;
  statsGeneralDetail.textContent = `${general.percent}%`;

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
        <div class="task-assignee">${entry.percent}%</div>
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
    const [summaryPayload, goalsPayload, platformPayload] = await Promise.all([
      apiRequest(`/api/stats/summary?scope=${encodeURIComponent(scope.key)}`),
      apiRequest("/api/stats/goals"),
      apiRequest("/api/finance/summary?period=total")
    ]);

    state.statsSummary = summaryPayload.summary || {};
    state.statsGoals = goalsPayload.goals || null;
    state.platformBaseIncomeCents = Number(platformPayload?.summary?.monthlyRevenueCents || 0);
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
    dailyIncomeGoalCents: 0,
    monthlyBalanceGoalCents: 0,
    recurringIncomeGoalCents: 0
  };
  const dailyRaw = window.prompt("Meta diária de entradas (R$):", String((current.dailyIncomeGoalCents || 0) / 100).replace(".", ","));
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

function readStoredJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveHistoryToStorage() {
  window.localStorage.setItem(historySystemStorageKey, JSON.stringify(state.historySystem.slice(0, 500)));
  window.localStorage.setItem(historyTextsStorageKey, JSON.stringify(state.historyTexts.slice(0, 200)));
}

function loadHistoryFromStorage() {
  state.historySystem = readStoredJson(historySystemStorageKey, []);
  state.historyTexts = readStoredJson(historyTextsStorageKey, []);
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

function pushSystemHistoryEvent(payload) {
  const event = {
    id: crypto.randomUUID(),
    type: payload.type,
    assignee: normalizeAssigneeName(payload.assignee),
    taskTitle: String(payload.taskTitle || "").trim(),
    occurredAt: payload.occurredAt || new Date().toISOString(),
    percent: Number(payload.percent || 0),
    pendingCount: Number(payload.pendingCount || 0),
    scopeDate: payload.scopeDate || null
  };
  state.historySystem.unshift(event);
  saveHistoryToStorage();
}

function hasSystemEventForTask(actionId, type) {
  return state.historySystem.some((entry) => entry.actionId === actionId && entry.type === type);
}

function buildSystemMessage(entry) {
  const person = escapeHtml(entry.assignee || "Geral");
  const task = `<strong>${escapeHtml(entry.taskTitle || "Tarefa")}</strong>`;
  if (entry.type === "start") {
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
    card.innerHTML = `
      <div class="history-text-head">
        <img class="task-avatar" src="${getActionAvatarPath(entry.speaker)}" alt="${escapeHtml(entry.speaker)}" />
        <div>
          <div class="history-text-title">${escapeHtml(entry.title)}</div>
          <div class="task-assignee history-time">${formatHourChip(entry.createdAt)}</div>
        </div>
      </div>
      <div class="history-text-full" hidden>${escapeHtml(entry.text)}</div>
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
      pushSystemHistoryEvent({ type: "star", assignee, scopeDate: todayKey });
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
  pushSystemHistoryEvent({
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
  pushSystemHistoryEvent({
    type,
    assignee,
    taskTitle,
    occurredAt: new Date().toISOString()
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

wizardBackButton.addEventListener("click", () => {
  state.wizard.step = Math.max(1, state.wizard.step - 1);
  renderWizard();
});

wizardNextButton.addEventListener("click", () => {
  if (!validateStep()) {
    return;
  }

  if (state.wizard.step === 5) {
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

repeatToggle.addEventListener("click", () => {
  state.wizard.repeatOpen = !state.wizard.repeatOpen;
  renderRepeatControls();
});

document.querySelectorAll("[data-wizard-date]").forEach((button) => {
  button.addEventListener("click", () => moveWizardDate(Number(button.dataset.wizardDate)));
});

document.querySelectorAll("[data-wizard-assignee]").forEach((button) => {
  button.addEventListener("click", () => moveWizardAssignee(Number(button.dataset.wizardAssignee)));
});

document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
  button.addEventListener("click", () => setRepeatMode(button.dataset.repeatMode));
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

actionForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

actionsList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-action-id]");
  if (!row) {
    return;
  }
  beginActionLongPress(row.dataset.actionId);
});

actionsList.addEventListener("pointerup", endActionLongPress);
actionsList.addEventListener("pointerleave", endActionLongPress);
actionsList.addEventListener("pointercancel", endActionLongPress);

actionsList.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-action-id]");
  if (!row) {
    return;
  }
  const actionId = row.dataset.actionId;
  if (longPressHandledActionId === actionId) {
    longPressHandledActionId = "";
    return;
  }
  await toggleActionStatus(actionId);
});

platformEntriesList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-platform-entry]");
  if (!button) {
    const row = event.target.closest("[data-occurrence-id]");
    const status = String(row?.dataset?.status || "").trim().toUpperCase();
    if (row && (status === "DUE_TODAY" || status === "OVERDUE")) {
      if (window.confirm("Pagar agora?")) {
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

  event.preventDefault();
  await toggleActionStatus(row.dataset.actionId);
});

handleSwipe(activeDateLabel, moveActiveDate);
handleSwipe(actionsList, moveActiveDate);
handleSwipe(financePeriodLabel, moveFinancePeriod);
handleSwipe(financePeriodPicker, moveFinancePeriod);
handleSwipe(wizardAssigneeLabel, moveWizardAssignee);
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
  const body = card.querySelector(".history-text-full");
  if (!body) {
    return;
  }
  body.hidden = !body.hidden;
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
  state.historyTexts.unshift({
    id: crypto.randomUUID(),
    speaker: state.historyTextComposer.speaker,
    title,
    text: text.slice(0, 2000),
    createdAt: new Date().toISOString()
  });
  saveHistoryToStorage();
  renderHistory();
  closeHistoryTextComposer();
});

loadHistoryFromStorage();

document.querySelectorAll("[data-history-day-nav]").forEach((button) => {
  button.addEventListener("click", () => moveHistoryDate(Number(button.dataset.historyDayNav)));
});

handleSwipe(historyDateLabel, moveHistoryDate);
handleSwipe(historyTimelineList, moveHistoryDate);








