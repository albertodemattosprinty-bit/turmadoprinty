import { getApiUrl } from "../api.js";

const tokenKey = "turma_do_printy_token";
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const actionStatuses = {
  pending: "PENDING",
  inProgress: "IN_PROGRESS",
  completed: "COMPLETED"
};
const assigneeOptions = ["Rose", "Geral", "Alberto", "Lucas", "Thainan", "Wilton"];
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
const platformIncomeCategories = ["Eventos", "Inscricoes", "Apoiadores", "Emprestimo", "Venda de ativo"];
const platformExpenseCategories = ["Alimentacao", "Aluguel", "Carro", "Eventos", "Servicos casa", "Anuncios", "Plataformas", "Lazer"];
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

const activeDateLabel = document.getElementById("activeDateLabel");
const actionsAuthAlert = document.getElementById("actionsAuthAlert");
const actionsList = document.getElementById("actionsList");
const actionsProgress = document.getElementById("actionsProgress");
const actionsProgressLabel = document.getElementById("actionsProgressLabel");
const actionsProgressMinutes = document.getElementById("actionsProgressMinutes");
const actionsProgressFill = document.getElementById("actionsProgressFill");
const actionsProgressPeople = document.getElementById("actionsProgressPeople");
const financeDateLabel = document.getElementById("financeDateLabel");
const platformEntriesList = document.getElementById("platformEntriesList");
const platformMonthlyIncome = document.getElementById("platformMonthlyIncome");
const platformMonthlyExpense = document.getElementById("platformMonthlyExpense");
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
const statsAssigneeCard = document.getElementById("statsAssigneeCard");
const statsAssigneePercent = document.getElementById("statsAssigneePercent");
const statsAssigneeAvatar = document.getElementById("statsAssigneeAvatar");
const statsAssigneeName = document.getElementById("statsAssigneeName");
const statsAssigneeDetail = document.getElementById("statsAssigneeDetail");
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
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let financeTimer = null;
let assigneeProgressTicker = null;
let statsTicker = null;

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
  platformBaseIncomeCents: 0,
  assigneeProgressRows: [],
  assigneeProgressIndex: 0,
  statsSummary: null,
  statsGoals: null,
  statsRotation: [],
  statsRotationIndex: 0,
  actions: [],
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
    endMinute: end.getMinutes()
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
  }

  if (id === "statsModal") {
    void loadStatsSummary();
  }

  if (id === "financeModal") {
    startFinancePresentation();
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

  if (modal.id === "statsModal" && statsTicker) {
    window.clearInterval(statsTicker);
    statsTicker = null;
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
    financeStatus.innerHTML = 'Entre como administrador para ver as finanÃ§as. <a href="/auth.html?next=/200">Entrar</a>';
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
      <div class="task-time">${formatHourChip(action.startAt)}</div>
      <img class="task-avatar" src="${avatarPath}" alt="${escapeHtml(`Avatar de ${assignee}`)}" loading="lazy" />
      <div class="task-main">
        <div class="task-title">${escapeHtml(action.title)}</div>
        <div class="task-assignee">${escapeHtml(assignee)}</div>
      </div>
      <button class="delete-task" type="button" data-delete-action="${action.id}" aria-label="Excluir tarefa">
        <svg viewBox="0 0 24 24"><path d="M8 4h8l1 2h4v2H3V6h4zm1 6h2v8H9zm4 0h2v8h-2zM7 10h10l-1 10H8z"/></svg>
      </button>
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

  actionsProgressLabel.textContent = `${percent}% concluido`;
  actionsProgressMinutes.textContent = "";
  actionsProgressFill.style.width = `${percent}%`;
  actionsProgressFill.parentElement?.setAttribute("aria-valuenow", String(percent));
  renderAssigneeProgressBars();
}

function renderAssigneeProgressBars() {
  actionsProgressPeople.innerHTML = "";
  state.assigneeProgressRows = [];
  state.assigneeProgressIndex = 0;

  const grouped = new Map();

  state.actions.forEach((action) => {
    const assignee = normalizeAssigneeName(action.assignee);

    if (assignee === "Geral") {
      return;
    }

    const total = getActionDurationMinutes(action);
    const completed = normalizeActionStatus(action.status) === actionStatuses.completed ? total : 0;
    const current = grouped.get(assignee) || { total: 0, completed: 0 };
    current.total += total;
    current.completed += completed;
    grouped.set(assignee, current);
  });

  [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
    .forEach(([assignee, summary]) => {
      if (summary.total <= 0) {
        return;
      }

      const percent = Math.max(0, Math.min(100, Math.round((summary.completed / summary.total) * 100)));
      const row = document.createElement("article");
      row.className = "actions-progress-person";
      row.innerHTML = `
        <div class="actions-progress-person-head">
          <strong>${escapeHtml(assignee)}</strong>
          <span>${percent}%</span>
        </div>
        <div class="actions-progress-track">
          <div class="actions-progress-fill" style="width:${percent}%"></div>
        </div>
      `;
      actionsProgressPeople.appendChild(row);
      state.assigneeProgressRows.push(row);
    });

  updateAssigneeProgressVisibility();
}

function updateAssigneeProgressVisibility() {
  if (!state.assigneeProgressRows.length) {
    return;
  }

  state.assigneeProgressRows.forEach((row, index) => {
    row.hidden = index !== state.assigneeProgressIndex;
  });
}

function startAssigneeProgressTicker() {
  if (assigneeProgressTicker) {
    window.clearInterval(assigneeProgressTicker);
    assigneeProgressTicker = null;
  }

  assigneeProgressTicker = window.setInterval(() => {
    if (!state.assigneeProgressRows.length) {
      return;
    }
    state.assigneeProgressIndex = (state.assigneeProgressIndex + 1) % state.assigneeProgressRows.length;
    updateAssigneeProgressVisibility();
  }, 2000);
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

function openWizard() {
  state.wizard = buildInitialWizardState();
  taskTitle.value = "";
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
  state.wizard.dateOffset = Math.max(0, state.wizard.dateOffset + amount);
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
  const now = new Date();

  if (firstStart < now) {
    throw new Error("Nao e possivel adicionar tarefa antes da hora atual.");
  }

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

    if (startAt >= now) {
      occurrences.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    }
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

    await apiRequest("/api/actions", {
      method: "POST",
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

function renderPlatformDateHeader() {
  if (financeDateLabel) {
    financeDateLabel.textContent = formatDateLabel(dateFromOffset(state.platformOffset));
  }
}

function getPlatformKindLabel(kind) {
  return String(kind || "").toUpperCase() === "INCOME" ? "Entrada" : "SaÃ­da";
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
function renderPlatformEntries() {
  if (!platformEntriesList) {
    return;
  }

  platformEntriesList.innerHTML = "";

  if (!getToken()) {
    platformEntriesList.innerHTML = '<div class="empty-state">Entre para ver as finanÃ§as.</div>';
    return;
  }

  if (!state.platformEntries.length) {
    platformEntriesList.innerHTML = '<div class="empty-state">Sem lanÃ§amentos nessa data.</div>';
    return;
  }

  state.platformEntries.forEach((entry) => {
    const row = document.createElement("article");
    row.className = `task-row ${getPlatformStatusClass(entry)}`;
    row.dataset.occurrenceId = entry.id || "";
    row.dataset.status = String(entry.status || "").trim().toUpperCase();
    row.innerHTML = `
      <div class="task-time">${formatHourChip(entry.occurredAt)}</div>
      <div class="task-main">
        <div class="task-title">${escapeHtml(entry.name)}</div>
        <div class="task-assignee">${escapeHtml(`${getPlatformKindLabel(entry.kind)} Â· ${entry.category}`)}</div>
      </div>
      <button class="delete-task" type="button" data-delete-platform-entry="${entry.entryId || ""}" aria-label="Excluir lanÃ§amento">
        <svg viewBox="0 0 24 24"><path d="M8 4h8l1 2h4v2H3V6h4zm1 6h2v8H9zm4 0h2v8h-2zM7 10h10l-1 10H8z"/></svg>
      </button>
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

function renderStatsRotationCard() {
  if (!state.statsRotation.length) {
    statsAssigneePercent.textContent = "0%";
    statsAssigneeName.textContent = "Sem dados";
    statsAssigneeDetail.textContent = "0/0 min";
    statsAssigneeAvatar.src = actionAvatarByAssignee.Geral;
    return;
  }

  const current = state.statsRotation[state.statsRotationIndex] || state.statsRotation[0];
  statsAssigneePercent.textContent = `${current.percent}%`;
  statsAssigneeName.textContent = current.name;
  statsAssigneeDetail.textContent = `${current.completed}/${current.total} min`;
  statsAssigneeAvatar.src = getActionAvatarPath(current.name);
}

function startStatsRotation() {
  if (statsTicker) {
    window.clearInterval(statsTicker);
    statsTicker = null;
  }

  renderStatsRotationCard();

  statsTicker = window.setInterval(() => {
    if (!state.statsRotation.length) {
      return;
    }
    state.statsRotationIndex = (state.statsRotationIndex + 1) % state.statsRotation.length;
    renderStatsRotationCard();
  }, 1500);
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

function buildStatsRotationFromSummary() {
  const byAssignee = state.statsSummary?.byAssignee || {};
  const rotation = [];
  const orderedNames = ["Geral", ...assigneeOptions.filter((name) => name !== "Geral")];
  for (const name of orderedNames) {
    const item = byAssignee[name] || { totalMinutes: 0, completedMinutes: 0 };
    const total = Number(item.totalMinutes || 0);
    const completed = Number(item.completedMinutes || 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    rotation.push({
      name,
      total,
      completed,
      percent
    });
  }
  state.statsRotation = rotation;
  state.statsRotationIndex = 0;
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
    buildStatsRotationFromSummary();
    renderStatsGoals();
    startStatsRotation();

    const isGeneral = scope.key === "general";
    statsGeneralGoals.hidden = !isGeneral;
    editStatsGoalsButton.hidden = !isGeneral;
  } catch (error) {
    statsAssigneeName.textContent = error instanceof Error ? error.message : "Falha";
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
    button.dataset.platformCategory = category;
    button.textContent = category;
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
      throw new Error("Informe um valor vÃ¡lido.");
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
    platformWizardMessage.textContent = error instanceof Error ? error.message : "Erro ao salvar lanÃ§amento.";
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
    platformWizardMessage.textContent = "Digite um nome vÃ¡lido.";
    return;
  }

  if (state.platformWizard.step === 2) {
    const raw = String(platformValueInput.value || "").replace(/\./g, "").replace(",", ".");
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      platformWizardMessage.textContent = "Digite um valor vÃ¡lido.";
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

actionsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-action]");

  if (!button) {
    const row = event.target.closest("[data-action-id]");

    if (!row) {
      return;
    }

    await toggleActionStatus(row.dataset.actionId);
    return;
  }

  if (!window.confirm("Excluir essa tarefa? Se for repetida, toda a rede sera removida.")) {
    return;
  }

  try {
    await apiRequest(`/api/actions/${encodeURIComponent(button.dataset.deleteAction)}`, {
      method: "DELETE"
    });
    await loadActions();
  } catch (error) {
    actionsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
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

  if (!window.confirm("Excluir este lanÃ§amento recorrente? Os valores jÃ¡ realizados permanecem.")) {
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

  if (event.target.closest("[data-delete-action]")) {
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
startAssigneeProgressTicker();

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








