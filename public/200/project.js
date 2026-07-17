import { getApiUrl } from "../api.js";

import {
  MINUTE_CUE_INTERVALS,
  MINUTE_CUE_PRELOAD_SECONDS,
  buildMinuteCueSchedule,
  getMinuteCueIntervalLabel,
  normalizeMinuteCueInterval
} from "./minute-cues.js?v=20260717-ptbr-natural-combo-cues";

const tokenKey = "turma_do_printy_token";
const projectProfileKey = "project_200_profile_v1";
const optionsConfigKey = "project_200_options_v1";
const missionQuickSlotsKey = "project_200_mission_quick_slots_v1";
const missionVariantSortKey = "project_200_mission_variant_sort_v1";
const defaultSaldoGoalCents = 1000000;
const taskBeepOptionCycles = [0, 3, 5, 10];
const missionActionsModes = ["show", "hide", "separate"];
const missionActionsModeLabels = new Map([
  ["show", "Mostrar"],
  ["hide", "Não mostrar"],
  ["separate", "Janela separada"]
]);
const taskBeepOptionLabels = new Map([
  [0, "Nenhum"],
  [3, "Três vezes"],
  [5, "Cinco vezes"],
  [10, "Dez vezes"]
]);
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const actionStatuses = {
  pending: "PENDING",
  inProgress: "IN_PROGRESS",
  paused: "PAUSED",
  completed: "COMPLETED"
};
const missionQuickDefinitions = [
  { key: "water", label: "Água", defaultTitle: "Beber água", targetValue: 8 },
  { key: "store", label: "Objeto", defaultTitle: "Guardar 6 itens", targetValue: 6 },
  { key: "read", label: "Livro", defaultTitle: "Ler uma página", targetValue: 6 },
  { key: "brush", label: "Dente", defaultTitle: "Escovar os dentes", targetValue: 3 }
];
const runningMissionQuickToneKeys = ["water", "store", "read", "brush", "energy", "sun"];
const missionHistoryScopes = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "7 dias" },
  { key: "last15", label: "15 dias" },
  { key: "last30", label: "30 dias" }
];
const defaultProjectProfileName = "Usuario";
const statsScopes = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "7 dias" },
  { key: "last15", label: "15 dias" },
  { key: "last30", label: "30 dias" }
];
const statsPointCategories = [
  { id: "sono", name: "Sono", targetPoints: 420, icon: "/200/aspect-icons/sono.svg" },
  { id: "alimentacao", name: "Alimentação", targetPoints: 30, icon: "/200/aspect-icons/alimentacao.svg" },
  { id: "hidratacao", name: "Hidratação", targetPoints: 15, icon: "/200/aspect-icons/hidratacao.svg" },
  { id: "aprendizado", name: "Aprendizado", targetPoints: 60, icon: "/200/aspect-icons/aprendizado.svg" },
  { id: "trabalho", name: "Trabalho", targetPoints: 360, icon: "/200/aspect-icons/trabalho.svg" },
  { id: "casa", name: "Casa", targetPoints: 120, icon: "/200/aspect-icons/casa.svg" },
  { id: "exercicios", name: "Exercícios", targetPoints: 30, icon: "/200/aspect-icons/exercicios.svg" },
  { id: "social", name: "Social", targetPoints: 30, icon: "/200/aspect-icons/social.svg" },
  { id: "planejamento", name: "Planejamento", targetPoints: 30, icon: "/200/aspect-icons/planejamento.svg" },
  { id: "higiene", name: "Higiene", targetPoints: 15, icon: "/200/aspect-icons/higiene.svg" },
  { id: "lazer", name: "Lazer", targetPoints: 90, icon: "/200/aspect-icons/lazer.svg" },
  { id: "aspecto", name: "Aspecto", targetPoints: 30, icon: "/200/aspect-icons/aspecto.svg" }
];
const sleepDelayOptions = [0, 5, 15, 30, 60];
const avatarPresetToPath = {
  rose: "/200/avatars/rose.png",
  alberto: "/200/avatars/alberto.png",
  lucas: "/200/avatars/lucas.png",
  thainan: "/200/avatars/thainan.png",
  wilton: "/200/avatars/wilton.png",
  "default-user": ""
};
const taskCategoryDefinitions = statsPointCategories.map(({ id, name, icon }) => ({ id, name, icon }));
const legacyTaskCategoryMap = new Map([
  ["estudo", "aprendizado"],
  ["financeiro", "aprendizado"],
  ["familia", "planejamento"],
  ["fe_espiritualidade", "aspecto"],
  ["saude", "aspecto"],
  ["digital", "aspecto"]
]);
const projectTimeZone = "America/Sao_Paulo";
const taskCategoryMap = new Map(taskCategoryDefinitions.map((item) => [item.id, item]));
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
  weekly: [],
  weekdays: [1, 2, 3, 4, 5]
};
const runningMusicStationSeeds = {
  Calm: [
    "About space.mp3", "Good morning.mp3", "I feel joy.mp3", "I get up at 7.mp3",
    "I have seen.mp3", "I play chess.mp3", "I say yes.mp3", "It's good.mp3",
    "Memories.mp3", "My alarm.mp3", "This time tomorrow.mp3", "This time.mp3",
    "You didn't call me.mp3"
  ],
  Pop: [
    "99 (1).mp3", "99 (2).mp3", "99 (3).mp3", "99 (4).mp3",
    "99 (5).mp3", "99 (6).mp3", "99 (7).mp3", "99 (8).mp3"
  ],
  Frequency: [
    "432Hz Tides.mp3", "432Hz Tides (1).mp3", "Bamboo Breathing.mp3", "Bamboo Breathing (1).mp3",
    "Bamboo Frequency.mp3", "Bamboo Frequency (1).mp3", "Bamboo Heartstrings.mp3", "Bamboo Heartstrings (1).mp3",
    "Honeyed Silence.mp3", "Honeyed Silence (1).mp3", "Saffron Hum.mp3", "Saffron Hum (1).mp3",
    "Serenity Era.mp3", "Serenity Era (1).mp3", "Serenity Field.mp3", "Serenity Horizon.mp3",
    "Serenity Horizon (1).mp3", "Stone Hum.mp3", "Stone Hum (1).mp3", "World In Peace.mp3"
  ],
  Fun: [
    "Baby Jesus.mp3", "Baby Jesus (1).mp3", "Cradle Mercy (2).mp3", "Cradle Mercy (3).mp3",
    "Cradle Peace.mp3", "Cradle Peace (1).mp3", "Gentle Amen (2).mp3", "Gentle Amen (3).mp3",
    "Lullaby Mercy (2).mp3", "Lullaby Mercy (3).mp3", "Mercy Cradle.mp3", "Mercy Cradle (1).mp3",
    "Milk-White Mercy.mp3", "Milk-White Mercy (1).mp3", "Tin Can Orchestra.mp3", "Tin Can Orchestra (1).mp3"
  ],
  Jungle: [
    "Hidden Temple Map (2).mp3", "Hidden Temple Map (3).mp3", "Jungle Treasure Chase.mp3", "Jungle Treasure Chase (1).mp3",
    "Jungle Treasure Run.mp3", "Jungle Treasure Run (1).mp3", "Jungle Treasure Run (2).mp3", "Jungle Treasure Run (3).mp3",
    "Jungle Treasure Run (4).mp3", "Jungle Treasure Run (5).mp3", "Jungle Treasure Run (6).mp3", "Jungle Treasure Trail (1).mp3"
  ],
  Energy: [
    "3 minutes",
    "5 minutes",
    "10 minutes"
  ]
};

const activeDateLabel = document.getElementById("activeDateLabel");
const actionsAuthAlert = document.getElementById("actionsAuthAlert");
const actionsList = document.getElementById("actionsList");
const actionsProgress = document.getElementById("actionsProgress");
const actionsProgressLabel = document.getElementById("actionsProgressLabel");
const actionsProgressMinutes = document.getElementById("actionsProgressMinutes");
const actionsProgressFill = document.getElementById("actionsProgressFill");
const actionsMissionFilterButton = document.getElementById("actionsMissionFilterButton");
const actionsMissionRemainingCount = document.getElementById("actionsMissionRemainingCount");
const actionsMissionListIcon = document.getElementById("actionsMissionListIcon");
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
const statsScopePrevButton = document.getElementById("statsScopePrevButton");
const statsScopeNextButton = document.getElementById("statsScopeNextButton");
const statsMissionSummary = document.getElementById("statsMissionSummary");
const statsMissionTotal = document.getElementById("statsMissionTotal");
const statsMissionCompleted = document.getElementById("statsMissionCompleted");
const statsMissionPending = document.getElementById("statsMissionPending");
const statsMissionsList = document.getElementById("statsMissionsList");
const statsRankingList = document.getElementById("statsRankingList");
const statsAspectModal = document.getElementById("statsAspectModal");
const statsAspectTitle = document.getElementById("statsAspectTitle");
const statsAspectIcon = document.getElementById("statsAspectIcon");
const statsAspectTargetMinusButton = document.getElementById("statsAspectTargetMinus");
const statsAspectTargetPlusButton = document.getElementById("statsAspectTargetPlus");
const statsAspectTargetValue = document.getElementById("statsAspectTargetValue");
const statsAspectMetaCopy = document.getElementById("statsAspectMetaCopy");
const statsAspectTaskLabel = document.getElementById("statsAspectTaskLabel");
const statsAspectTaskMinutes = document.getElementById("statsAspectTaskMinutes");
const statsAspectProgressSummary = document.getElementById("statsAspectProgressSummary");
const statsAspectLinkedGoalsLabel = document.getElementById("statsAspectLinkedGoalsLabel");
const statsAspectLinkedGoalsValue = document.getElementById("statsAspectLinkedGoalsValue");
const statsAspectStatus = document.getElementById("statsAspectStatus");
const statsAspectSaveButton = document.getElementById("statsAspectSaveButton");
const openStatsAspectMissionAssignButton = document.getElementById("openStatsAspectMissionAssign");
const statsAspectMissionAssignModal = document.getElementById("statsAspectMissionAssignModal");
const statsAspectMissionAssignLabel = document.getElementById("statsAspectMissionAssignLabel");
const statsAspectMissionSelectedSummary = document.getElementById("statsAspectMissionSelectedSummary");
const statsAspectMissionOptions = document.getElementById("statsAspectMissionOptions");
const statsAspectMissionStatus = document.getElementById("statsAspectMissionStatus");
const statsAspectMissionSaveButton = document.getElementById("statsAspectMissionSaveButton");
const statsAspectMissionClearButton = document.getElementById("statsAspectMissionClearButton");
const sleepModalElement = document.getElementById("sleepModal");
const sleepModalShell = document.getElementById("sleepModalShell");
const sleepModalCloseButton = document.getElementById("sleepModalCloseButton");
const sleepModalSetup = document.getElementById("sleepModalSetup");
const sleepModalSetupSubtitle = document.getElementById("sleepModalSetupSubtitle");
const sleepDelayPrevButton = document.getElementById("sleepDelayPrevButton");
const sleepDelayLabel = document.getElementById("sleepDelayLabel");
const sleepDelayNextButton = document.getElementById("sleepDelayNextButton");
const sleepStartButton = document.getElementById("sleepStartButton");
const sleepModalFeedback = document.getElementById("sleepModalFeedback");
const sleepModalSession = document.getElementById("sleepModalSession");
const sleepSessionTitle = document.getElementById("sleepSessionTitle");
const sleepSessionTime = document.getElementById("sleepSessionTime");
const sleepSessionSubtitle = document.getElementById("sleepSessionSubtitle");
const sleepSessionCap = document.getElementById("sleepSessionCap");
const sleepModalControls = document.getElementById("sleepModalControls");
const sleepContinueButton = document.getElementById("sleepContinueButton");
const sleepFinishButton = document.getElementById("sleepFinishButton");
const sleepAbortButton = document.getElementById("sleepAbortButton");
const sleepMusicToggleButton = document.getElementById("sleepMusicToggleButton");
const sleepHistoryModal = document.getElementById("sleepHistoryModal");
const sleepHistoryCloseButton = document.getElementById("sleepHistoryCloseButton");
const sleepHistoryList = document.getElementById("sleepHistoryList");
const sleepHistoryStatus = document.getElementById("sleepHistoryStatus");
const openActionWizardButton = document.getElementById("openActionWizard");
const actionWizard = document.getElementById("actionWizard");
const closeActionWizardButton = document.getElementById("closeActionWizard");
const actionForm = document.getElementById("actionForm");
const wizardStepLabel = document.getElementById("wizardStepLabel");
const wizardHeaderBackButton = document.getElementById("wizardHeaderBack");
const wizardBackButton = document.getElementById("wizardBack");
const wizardNextButton = document.getElementById("wizardNext");
const wizardMessage = document.getElementById("wizardMessage");
const taskTitle = document.getElementById("taskTitle");
const actionCategoryTrigger = document.getElementById("actionCategoryTrigger");
const actionCategoryPreviewIcon = document.getElementById("actionCategoryPreviewIcon");
const actionCategoryPreviewLabel = document.getElementById("actionCategoryPreviewLabel");
const actionCategoryModal = document.getElementById("actionCategoryModal");
const closeActionCategoryModal = document.getElementById("closeActionCategoryModal");
const actionCategoryGrid = document.getElementById("actionCategoryGrid");
const confirmActionCategoryModal = document.getElementById("confirmActionCategoryModal");
const repeatTypeTabs = document.getElementById("repeatTypeTabs");
const wizardDateLabel = document.getElementById("wizardDateLabel");
const wizardDatePickerWrap = document.getElementById("wizardDatePickerWrap");
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
const financeEntriesLabel = document.getElementById("financeEntriesLabel");
const financeBalanceLabel = document.getElementById("financeBalanceLabel");
const financeTotalSales = document.getElementById("financeTotalSales");
const financeSubscribers = document.getElementById("financeSubscribers");
const financeMonthlyRevenue = document.getElementById("financeMonthlyRevenue");
const financeNotesInput = document.getElementById("financeNotesInput");
const saveFinanceNotesButton = document.getElementById("saveFinanceNotesButton");
const constitutionVersionLabel = document.getElementById("constitutionVersionLabel");
const constitutionAuthAlert = document.getElementById("constitutionAuthAlert");
const constitutionTextView = document.getElementById("constitutionTextView");
const constitutionMessage = document.getElementById("constitutionMessage");
const constitutionAvatars = document.getElementById("constitutionAvatars");
const openConstitutionEditButton = document.getElementById("openConstitutionEdit");
const toggleFreeTimeOptionButton = document.getElementById("toggleFreeTimeOption");
const toggleFreeTimeHint = document.getElementById("toggleFreeTimeHint");
const toggleMissionActionsOptionButton = document.getElementById("toggleMissionActionsOption");
const toggleMissionActionsHint = document.getElementById("toggleMissionActionsHint");
const toggleScreenLockOptionButton = document.getElementById("toggleScreenLockOption");
const toggleScreenLockHint = document.getElementById("toggleScreenLockHint");
const openProject200ExportModalButton = document.getElementById("openProject200ExportModal");
const project200ExportModal = document.getElementById("project200ExportModal");
const project200ExportUsernameInput = document.getElementById("project200ExportUsername");
const project200ExportMessage = document.getElementById("project200ExportMessage");
const project200ExportConfirmButton = document.getElementById("project200ExportConfirm");
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
const missionStatus = document.getElementById("missionStatus");
const missionsEmpty = document.getElementById("missionsEmpty");
const missionList = document.getElementById("missionList");
const missionsFooter = document.getElementById("missionsFooter");
const missionScopePrevButton = document.getElementById("missionScopePrevButton");
const missionScopeLabel = document.getElementById("missionScopeLabel");
const missionScopeNextButton = document.getElementById("missionScopeNextButton");
const openMissionCreateHeroButton = document.getElementById("openMissionCreateHero");
const openMissionCreateButton = document.getElementById("openMissionCreateButton");
const missionTitleInput = document.getElementById("missionTitleInput");
const missionTargetInput = document.getElementById("missionTargetInput");
const missionCreateStatus = document.getElementById("missionCreateStatus");
const missionCreateCloseButton = document.getElementById("missionCreateCloseButton");
const missionCreateTimeSummary = document.getElementById("missionCreateTimeSummary");
const openMissionCreateTimeButton = document.getElementById("openMissionCreateTimeButton");
const missionCreateConfirmButton = document.getElementById("missionCreateConfirm");
const missionAdjustTitle = document.getElementById("missionAdjustTitle");
const missionAdjustCloseButton = document.getElementById("missionAdjustCloseButton");
const missionAdjustMinusButton = document.getElementById("missionAdjustMinus");
const missionAdjustPlusButton = document.getElementById("missionAdjustPlus");
const missionAdjustValue = document.getElementById("missionAdjustValue");
const missionAdjustHint = document.getElementById("missionAdjustHint");
const missionAdjustTimeSummary = document.getElementById("missionAdjustTimeSummary");
const missionAdjustStatus = document.getElementById("missionAdjustStatus");
const openMissionVariantsButton = document.getElementById("openMissionVariantsButton");
const openMissionAdjustTimeButton = document.getElementById("openMissionAdjustTimeButton");
const missionAdjustConfirmButton = document.getElementById("missionAdjustConfirm");
const missionAdjustDeleteButton = document.getElementById("missionAdjustDelete");
const missionProgressTitle = document.getElementById("missionProgressTitle");
const missionProgressCloseButton = document.getElementById("missionProgressCloseButton");
const missionProgressMinusButton = document.getElementById("missionProgressMinus");
const missionProgressPlusButton = document.getElementById("missionProgressPlus");
const missionProgressValue = document.getElementById("missionProgressValue");
const missionProgressHint = document.getElementById("missionProgressHint");
const missionProgressStatus = document.getElementById("missionProgressStatus");
const missionProgressConfirmButton = document.getElementById("missionProgressConfirm");
const missionQuickAssignCloseButton = document.getElementById("missionQuickAssignCloseButton");
const missionQuickAssignGrid = document.getElementById("missionQuickAssignGrid");
const missionQuickAssignStatus = document.getElementById("missionQuickAssignStatus");
const missionTimeCloseButton = document.getElementById("missionTimeCloseButton");
const missionTimePrompt = document.getElementById("missionTimePrompt");
const missionTimeMinusButton = document.getElementById("missionTimeMinus");
const missionTimePlusButton = document.getElementById("missionTimePlus");
const missionTimeValue = document.getElementById("missionTimeValue");
const missionTimeUnitLabel = document.getElementById("missionTimeUnitLabel");
const missionTimeStatus = document.getElementById("missionTimeStatus");
const missionTimeConfirmButton = document.getElementById("missionTimeConfirmButton");
const missionRunBackButton = document.getElementById("missionRunBackButton");
const missionRunTitle = document.getElementById("missionRunTitle");
const missionRunTitleIcon = document.getElementById("missionRunTitleIcon");
const missionRunRingFill = document.getElementById("missionRunRingFill");
const missionRunClock = document.getElementById("missionRunClock");
const missionRunCycleSpotlight = document.getElementById("missionRunCycleSpotlight");
const missionRunCycleSpotlightValue = document.getElementById("missionRunCycleSpotlightValue");
const missionRunModePercentBtn = document.getElementById("missionRunModePercentBtn");
const missionRunModeTimeBtn = document.getElementById("missionRunModeTimeBtn");
const missionRunCycleCount = document.getElementById("missionRunCycleCount");
const missionRunPlayerSlot = document.getElementById("missionRunPlayerSlot");
const missionRunLoadingOverlay = document.getElementById("missionRunLoadingOverlay");
const missionRunStatus = document.getElementById("missionRunStatus");
const missionRunCompleteButton = document.getElementById("missionRunCompleteButton");
const missionRunConfirm = document.getElementById("missionRunConfirm");
const missionRunCancelDiscardButton = document.getElementById("missionRunCancelDiscardButton");
const missionRunCancelFinishButton = document.getElementById("missionRunCancelFinishButton");
const missionRunFinishChoice = document.getElementById("missionRunFinishChoice");
const missionRunFinishCloseButton = document.getElementById("missionRunFinishCloseButton");
const missionRunFinishButton = document.getElementById("missionRunFinishButton");
const missionRunRestartButton = document.getElementById("missionRunRestartButton");
const missionVariantsModal = document.getElementById("missionVariantsModal");
const missionVariantsCloseButton = document.getElementById("missionVariantsCloseButton");
const missionVariantSortButton = document.getElementById("missionVariantSortButton");
const missionVariantSortMenu = document.getElementById("missionVariantSortMenu");
const missionVariantsKicker = document.getElementById("missionVariantsKicker");
const missionVariantsTitle = document.getElementById("missionVariantsTitle");
const missionVariantCycleSelection = document.getElementById("missionVariantCycleSelection");
const missionVariantsList = document.getElementById("missionVariantsList");
const missionVariantAddButton = document.getElementById("missionVariantAddButton");
const missionVariantEditor = document.getElementById("missionVariantEditor");
const missionVariantTitleInput = document.getElementById("missionVariantTitleInput");
const missionVariantDeadlinePrev = document.getElementById("missionVariantDeadlinePrev");
const missionVariantDeadlineNext = document.getElementById("missionVariantDeadlineNext");
const missionVariantDeadlineValue = document.getElementById("missionVariantDeadlineValue");
const missionVariantHoursButton = document.getElementById("missionVariantHoursButton");
const missionVariantDaysButton = document.getElementById("missionVariantDaysButton");
const missionVariantStatus = document.getElementById("missionVariantStatus");
const missionVariantEditorCancel = document.getElementById("missionVariantEditorCancel");
const missionVariantEditorSave = document.getElementById("missionVariantEditorSave");
const runningTaskMissionButton = document.getElementById("runningTaskMissionButton");
const runningMissionQuickModal = document.getElementById("runningMissionQuickModal");
const closeRunningMissionQuickModalButton = document.getElementById("closeRunningMissionQuickModal");
const runningMissionQuickGrid = document.getElementById("runningMissionQuickGrid");
const runningMissionQuickSpotlight = document.getElementById("runningMissionQuickSpotlight");
const runningMissionQuickSpotlightIcon = document.getElementById("runningMissionQuickSpotlightIcon");
const runningMissionQuickSpotlightFill = document.getElementById("runningMissionQuickSpotlightFill");
const runningMissionQuickFeedback = document.getElementById("runningMissionQuickFeedback");
const runningMissionQuickFocus = document.getElementById("runningMissionQuickFocus");
const runningMissionQuickFocusIcon = document.getElementById("runningMissionQuickFocusIcon");
const runningMissionQuickFocusTitle = document.getElementById("runningMissionQuickFocusTitle");
const runningMissionQuickFocusProgressFill = document.getElementById("runningMissionQuickFocusProgressFill");
const runningMissionQuickFocusLinked = document.getElementById("runningMissionQuickFocusLinked");
const runningMissionQuickFocusLinkedLabel = document.getElementById("runningMissionQuickFocusLinkedLabel");
const runningMissionQuickFocusLinkedProgressFill = document.getElementById("runningMissionQuickFocusLinkedProgressFill");
const homeDateTimeLabel = document.getElementById("homeDateTimeLabel");
const homeRunningProgressRing = document.getElementById("homeRunningProgressRing");
const homeRunningPercent = document.getElementById("homeRunningPercent");
const homeRunningModeTimeBtn = document.getElementById("homeRunningModeTimeBtn");
const homeRunningModePercentBtn = document.getElementById("homeRunningModePercentBtn");
const homeRunningTaskTitle = document.getElementById("homeRunningTaskTitle");
const homeRunningTaskLinePrimary = document.getElementById("homeRunningTaskLinePrimary");
const homeRunningTaskLineSecondary = document.getElementById("homeRunningTaskLineSecondary");
const homeRunningDatePrimary = document.getElementById("homeRunningDatePrimary");
const homeRunningDateSecondary = document.getElementById("homeRunningDateSecondary");
const homeRunningActions = document.getElementById("homeRunningActions");
const homeRunningListButton = document.getElementById("homeRunningListButton");
const homeRunningRestoreButton = document.getElementById("homeRunningRestoreButton");
const homeRunningFinalizeButton = document.getElementById("homeRunningFinalizeButton");
const homeRunningMusicButton = document.getElementById("homeRunningMusicButton");
const homeRunningMissionButton = document.getElementById("homeRunningMissionButton");
const runningTaskModalElement = document.getElementById("runningTaskModal");
const quickTaskTitleInput = document.getElementById("quickTaskTitleInput");
const quickTaskMinutesInput = document.getElementById("quickTaskMinutesInput");
const quickTaskStartButton = document.getElementById("quickTaskStartButton");
const quickTaskStatus = document.getElementById("quickTaskStatus");
const runningTaskContent = runningTaskModalElement?.querySelector(".running-task-content");
const runningTaskName = document.getElementById("runningTaskName");
const runningTaskCategoryIcon = document.getElementById("runningTaskCategoryIcon");
const runningTaskProgressRing = document.getElementById("runningTaskProgressRing");
const runningTaskPercent = document.getElementById("runningTaskPercent");
const runningCircleWrap = runningTaskModalElement?.querySelector(".running-circle-wrap");
const runningCompletionLabel = document.getElementById("runningCompletionLabel");
const runningModeTimeBtn = document.getElementById("runningModeTimeBtn");
const runningModePercentBtn = document.getElementById("runningModePercentBtn");
const runningTaskMinutesLeft = document.getElementById("runningTaskMinutesLeft");
const runningTaskNextLabel = runningTaskModalElement?.querySelector(".running-task-next-label");
const runningTaskNextName = document.getElementById("runningTaskNextName");
const runningTaskNextTime = document.getElementById("runningTaskNextTime");
const runningNextPanel = document.getElementById("runningNextPanel");
const runningTaskHomeButton = document.getElementById("runningTaskHomeButton");
const runningTaskQuickButton = document.getElementById("runningTaskQuickButton");
const runningTaskListButton = document.getElementById("runningTaskListButton");
const runningTaskFinalizeButton = document.getElementById("runningTaskFinalizeButton");
const runningTaskRestoreButton = document.getElementById("runningTaskRestoreButton");
const runningTaskGiveUpButton = document.getElementById("runningTaskGiveUpButton");
const runningTaskMusicButton = document.getElementById("runningTaskMusicButton");
const runningTaskStartNextButton = document.getElementById("runningTaskStartNextButton");
const runningConfirmModal = document.getElementById("runningConfirmModal");
const runningConfirmTitle = document.getElementById("runningConfirmTitle");
const runningConfirmName = document.getElementById("runningConfirmName");
const runningConfirmPrimaryButton = document.getElementById("runningConfirmPrimaryButton");
const runningConfirmPauseButton = document.getElementById("runningConfirmPauseButton");
const runningConfirmBackButton = document.getElementById("runningConfirmBackButton");
const runningTaskActionsWrap = runningTaskModalElement?.querySelector(".running-task-actions");
const runningIdleHub = document.getElementById("runningIdleHub");
const runningPlayerStation = document.getElementById("runningPlayerStation");
const runningPlayerTrack = document.getElementById("runningPlayerTrack");
const runningPlayerTitleButton = document.getElementById("runningPlayerTitleButton");
const runningPlayerList = document.getElementById("runningPlayerList");
const runningPlayerRepeat = document.getElementById("runningPlayerRepeat");
const runningPlayerFavorite = document.getElementById("runningPlayerFavorite");
const runningPlayerDefault = document.getElementById("runningPlayerDefault");
const runningPlayerStationPrev = document.getElementById("runningPlayerStationPrev");
const runningPlayerStationNext = document.getElementById("runningPlayerStationNext");
const runningPlayerPrev = document.getElementById("runningPlayerPrev");
const runningPlayerNext = document.getElementById("runningPlayerNext");
const runningMiniPlayer = document.getElementById("runningMiniPlayer");
const runningMusicListModal = document.getElementById("runningMusicListModal");
const runningMusicListBack = document.getElementById("runningMusicListBack");
const runningMusicListStationPrev = document.getElementById("runningMusicListStationPrev");
const runningMusicListStationNext = document.getElementById("runningMusicListStationNext");
const runningMusicListStation = document.getElementById("runningMusicListStation");
const runningMusicListTrack = document.getElementById("runningMusicListTrack");
const runningMusicListItems = document.getElementById("runningMusicListItems");
const runningMusicListDefaultButton = document.getElementById("runningMusicListDefaultButton");
const runningMusicDefaultModal = document.getElementById("runningMusicDefaultModal");
const runningMusicDefaultStationButton = document.getElementById("runningMusicDefaultStationButton");
const runningMusicDefaultTrackButton = document.getElementById("runningMusicDefaultTrackButton");
const runningMusicDefaultStationName = document.getElementById("runningMusicDefaultStationName");
const runningMusicDefaultTrackName = document.getElementById("runningMusicDefaultTrackName");
const runningMusicDefaultStationHint = document.getElementById("runningMusicDefaultStationHint");
const runningMusicDefaultTrackHint = document.getElementById("runningMusicDefaultTrackHint");
const runningMusicDefaultChoiceModal = document.getElementById("runningMusicDefaultChoiceModal");
const runningMusicDefaultChoiceCopy = document.getElementById("runningMusicDefaultChoiceCopy");
const runningMusicDefaultRedefineButton = document.getElementById("runningMusicDefaultRedefineButton");
const runningMusicDefaultExecuteButton = document.getElementById("runningMusicDefaultExecuteButton");
const actionsModal = document.getElementById("actionsModal");
const runtimeStateEndpoint = "/api/200/runtime-state";
const dayDonePercent = document.getElementById("dayDonePercent");
const dayDoneDelay = document.getElementById("dayDoneDelay");
const screenLockOverlay = document.getElementById("screenLockOverlay");
const startDecisionModal = document.getElementById("startDecisionModal");
const closeStartDecisionModal = document.getElementById("closeStartDecisionModal");
const startDecisionContent = document.getElementById("startDecisionContent");
const startDecisionTaskTitle = document.getElementById("startDecisionTaskTitle");
const startDecisionMicButton = document.getElementById("startDecisionMicButton");
const startDecisionStartAt = document.getElementById("startDecisionStartAt");
const startDecisionEndAt = document.getElementById("startDecisionEndAt");
const startDecisionRepeatLabel = document.getElementById("startDecisionRepeatLabel");
const startDecisionMusicLabel = document.getElementById("startDecisionMusicLabel");
const startDecisionAspectLabel = document.getElementById("startDecisionAspectLabel");
const startDecisionActions = document.getElementById("startDecisionActions");
const startDecisionMessage = document.getElementById("startDecisionMessage");
const startDecisionStartInput = document.getElementById("startDecisionStartInput");
const startDecisionEndInput = document.getElementById("startDecisionEndInput");
const startDecisionDateInput = document.getElementById("startDecisionDateInput");
const startConflictModal = document.getElementById("startConflictModal");
const startConflictCurrentTitle = document.getElementById("startConflictCurrentTitle");
const startConflictQuestion = document.getElementById("startConflictQuestion");
const startConflictNextTitle = document.getElementById("startConflictNextTitle");
const startConflictFinalizeButton = document.getElementById("startConflictFinalizeButton");
const startConflictAbortButton = document.getElementById("startConflictAbortButton");
const startConflictBackButton = document.getElementById("startConflictBackButton");
const partialTaskModal = document.getElementById("partialTaskModal");
const partialTaskPercent = document.getElementById("partialTaskPercent");
const partialTaskDecreaseButton = document.getElementById("partialTaskDecreaseButton");
const partialTaskIncreaseButton = document.getElementById("partialTaskIncreaseButton");
const partialTaskContinueButton = document.getElementById("partialTaskContinueButton");
const postponeTaskModal = document.getElementById("postponeTaskModal");
const closePostponeTaskModal = document.getElementById("closePostponeTaskModal");
const postponeTaskTitle = document.getElementById("postponeTaskTitle");
const postponeTimeLabel = document.getElementById("postponeTimeLabel");
const postponeDayLabel = document.getElementById("postponeDayLabel");
const postponeFeedback = document.getElementById("postponeFeedback");
const confirmPostponeTask = document.getElementById("confirmPostponeTask");
const postponeOnlyFree = document.getElementById("postponeOnlyFree");
const postponeReplaceModal = document.getElementById("postponeReplaceModal");
const closePostponeReplaceModal = document.getElementById("closePostponeReplaceModal");
const postponeReplaceList = document.getElementById("postponeReplaceList");
const confirmPostponeReplace = document.getElementById("confirmPostponeReplace");
const overlapWizard = document.getElementById("overlapWizard");
const closeOverlapWizard = document.getElementById("closeOverlapWizard");
const overlapTaskTitle = document.getElementById("overlapTaskTitle");
const overlapTaskRange = document.getElementById("overlapTaskRange");
const overlapReplaceButton = document.getElementById("overlapReplaceButton");
const overlapCancelButton = document.getElementById("overlapCancelButton");
const overlapFreePrev = document.getElementById("overlapFreePrev");
const overlapFreeNext = document.getElementById("overlapFreeNext");
const overlapFreeStartLabel = document.getElementById("overlapFreeStartLabel");
const overlapApplyFreeButton = document.getElementById("overlapApplyFreeButton");
const overlapChangeTimeButton = document.getElementById("overlapChangeTimeButton");
const project200LoginOverlay = document.getElementById("project200LoginOverlay");
const project200LoginForm = document.getElementById("project200LoginForm");
const project200Username = document.getElementById("project200Username");
const project200Password = document.getElementById("project200Password");
const project200RegisterForm = document.getElementById("project200RegisterForm");
const project200RegisterName = document.getElementById("project200RegisterName");
const project200RegisterUsername = document.getElementById("project200RegisterUsername");
const project200RegisterPassword = document.getElementById("project200RegisterPassword");
const project200RegisterPasswordConfirm = document.getElementById("project200RegisterPasswordConfirm");
const project200LoginTabButton = document.getElementById("project200LoginTabButton");
const project200RegisterTabButton = document.getElementById("project200RegisterTabButton");
const project200LoginPanel = document.getElementById("project200LoginPanel");
const project200RegisterPanel = document.getElementById("project200RegisterPanel");
const project200LoginMessage = document.getElementById("project200LoginMessage");
const globalLoadingOverlay = document.getElementById("globalLoadingOverlay");
const globalLoadingIcon = document.getElementById("globalLoadingIcon");
const globalLoadingCopy = document.getElementById("globalLoadingCopy");
const profileManageOverlay = document.getElementById("profileManageOverlay");
const profileManageTitle = document.getElementById("profileManageTitle");
const profileManageTargetLabel = document.getElementById("profileManageTargetLabel");
const profileManageMessage = document.getElementById("profileManageMessage");
const profileManageCancel = document.getElementById("profileManageCancel");
const profileDeleteConfirmInput = document.getElementById("profileDeleteConfirmInput");
const profileDeleteConfirmButton = document.getElementById("profileDeleteConfirm");
const profileReassignSelect = document.getElementById("profileReassignSelect");
const profileReassignTargetHint = document.getElementById("profileReassignTargetHint");
const profileReassignConfirmButton = document.getElementById("profileReassignConfirm");
const profileFooter = document.getElementById("profileFooter");
const openProject200CreateProfileModalButton = document.getElementById("openProject200CreateProfileModal");
const openProfileAvatarModalFromOptionsButton = document.getElementById("openProfileAvatarModalFromOptions");
const project200CreateProfileNameInput = document.getElementById("project200CreateProfileName");
const project200CreateProfileMessage = document.getElementById("project200CreateProfileMessage");
const project200CreateProfileConfirmButton = document.getElementById("project200CreateProfileConfirm");
const homeProfileButton = document.getElementById("homeProfileButton");
const homePlayTime = document.getElementById("homePlayTime");
const homeRunningSurfaceButton = document.getElementById("homeRunningSurfaceButton");
const homeRunningSurfaceIcon = document.getElementById("homeRunningSurfaceIcon");
const homeSocialButton = document.getElementById("homeSocialButton");
const homeSocialBadge = document.getElementById("homeSocialBadge");
const homeSleepButton = document.getElementById("homeSleepButton");
const runningHomeSocialButton = document.getElementById("runningHomeSocialButton");
const runningHomeSocialBadge = document.getElementById("runningHomeSocialBadge");
const runningHomeSleepButton = document.getElementById("runningHomeSleepButton");
const socialModal = document.getElementById("socialModal");
const socialModalShell = document.getElementById("socialModalShell");
const socialModalLoading = document.getElementById("socialModalLoading");
const socialModalSubtitle = document.getElementById("socialModalSubtitle");
const socialInviteToggleButton = document.getElementById("socialInviteToggleButton");
const socialInviteForm = document.getElementById("socialInviteForm");
const socialInviteInput = document.getElementById("socialInviteInput");
const socialInviteSubmitButton = document.getElementById("socialInviteSubmitButton");
const socialModalStatus = document.getElementById("socialModalStatus");
const socialModalList = document.getElementById("socialModalList");
const pointsUpdateModal = document.getElementById("pointsUpdateModal");
const pointsUpdateTotal = document.getElementById("pointsUpdateTotal");
const pointsUpdateDelta = document.getElementById("pointsUpdateDelta");
const pointsUpdateRanking = document.getElementById("pointsUpdateRanking");
const pointsUpdateRankingList = document.getElementById("pointsUpdateRankingList");
const pointsUpdateContinue = document.getElementById("pointsUpdateContinue");
const socialScopePrevButton = document.getElementById("socialScopePrevButton");
const socialScopeNextButton = document.getElementById("socialScopeNextButton");
const statsRunningSurfaceButton = document.getElementById("statsRunningSurfaceButton");
const statsRunningSurfaceIcon = document.getElementById("statsRunningSurfaceIcon");
const homeProfileName = document.getElementById("homeProfileName");
const profileRenameInput = document.getElementById("profileRenameInput");
const profileRenameMessage = document.getElementById("profileRenameMessage");
const profileRenameConfirmButton = document.getElementById("profileRenameConfirmButton");
const toggleTaskBeepOptionButton = document.getElementById("toggleTaskBeepOption");
const toggleTaskBeepHint = document.getElementById("toggleTaskBeepHint");
const toggleMinuteNotificationsOptionButton = document.getElementById("toggleMinuteNotificationsOption");
const toggleMinuteNotificationsHint = document.getElementById("toggleMinuteNotificationsHint");
const toggleFinalMinuteNotificationsOptionButton = document.getElementById("toggleFinalMinuteNotificationsOption");
const toggleFinalMinuteNotificationsHint = document.getElementById("toggleFinalMinuteNotificationsHint");
const toggleBackgroundThemeOptionButton = document.getElementById("toggleBackgroundThemeOption");
const toggleBackgroundThemeHint = document.getElementById("toggleBackgroundThemeHint");
const toggleStopMusicOnFinishOptionButton = document.getElementById("toggleStopMusicOnFinishOption");
const toggleStopMusicOnFinishHint = document.getElementById("toggleStopMusicOnFinishHint");
const logoutProject200Button = document.getElementById("logoutProject200Button");
const profileAvatarModal = document.getElementById("profileAvatarModal");
const profileAvatarModalTitle = document.getElementById("profileAvatarModalTitle");
const profileAvatarModalHint = document.getElementById("profileAvatarModalHint");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
const profileAvatarFileInput = document.getElementById("profileAvatarFileInput");
const profileAvatarChooseButton = document.getElementById("profileAvatarChooseButton");
const profileAvatarFileName = document.getElementById("profileAvatarFileName");
const profileAvatarMessage = document.getElementById("profileAvatarMessage");
const homeRunningSurfaceActiveIconPath = "/200/icons/home-running-surface-active.svg";
const homeRunningSurfaceIdleIconPath = "/200/icons/home-running-surface-idle-ilife.svg";
const svgSelectorModal = document.getElementById("svgSelectorModal");
const svgSelectorTitle = document.getElementById("svgSelectorTitle");
const svgSelectorHint = document.getElementById("svgSelectorHint");
const svgSelectorPreview = document.getElementById("svgSelectorPreview");
const svgSelectorStatus = document.getElementById("svgSelectorStatus");
const svgSelectorGrid = document.getElementById("svgSelectorGrid");
const svgSelectorSaveButton = document.getElementById("svgSelectorSaveButton");
const projectShell = document.querySelector(".project-shell");
const loadingIconByArea = {
  actions: "/200/icons/acts.svg",
  missions: "/200/icons/target.svg",
  stats: "/200/icons/stats.svg",
  ideas: "/200/icons/text.svg",
  options: "/200/icons/options.svg"
};
let globalLoadingCount = 0;
let globalLoadingPreferredIcon = loadingIconByArea.actions;
let startupLoadingActive = false;
let startupLoadingFallbackTimer = null;
let globalLoadingFallbackTimer = null;
let globalLoadingTimedOut = false;
let homeSnapshotHydrationPromise = null;
let lastHomeSnapshotHydratedAtMs = 0;
let homeBootstrapRetryTimer = null;
let homeDeviceClockTimer = null;
let statsAspectConfigHydrationPromise = null;
const profileAvatarUploadButton = document.getElementById("profileAvatarUploadButton");
const profileAvatarGenerateButton = document.getElementById("profileAvatarGenerateButton");
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const backgroundThemeModes = [
  { key: "white", label: "Branco" },
  { key: "black", label: "Black" },
  { key: "orange", label: "Laranja" },
  { key: "bluevivid", label: "Azul vivo" },
  { key: "pinkstrong", label: "Rosa forte" },
  { key: "bluedark", label: "Azul escuro" },
  { key: "brown", label: "Marrom" },
  { key: "edge", label: "Edge" },
  { key: "light", label: "Light" }
];

let financeTimer = null;
let platformMetricsTicker = null;
let sleepModalTicker = null;
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
let actionCategoryInterpretTimer = null;
let actionCategoryTargetActionId = "";
let actionCategorySelectionId = "";
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
let profileManageTargetId = "";
let profileRenameTargetId = "";
let profilePressStartedAt = 0;
let profilePressProfile = "";
let profileAvatarTargetId = "";
let profileAvatarReferenceFile = null;
let profileAvatarReferenceDataUrl = "";
let profileAvatarBusy = false;
let profileSvgSuggestBusy = false;
let startDecisionResolver = null;
const runningAudio = typeof Audio !== "undefined" ? new Audio() : null;
const runningSuccessAudio = typeof Audio !== "undefined" ? new Audio("/200/5star.mp3") : null;
const runningEndBellAudio = typeof Audio !== "undefined" ? new Audio("/200/bicycleBell.ogg") : null;
const runningPunctualityUpAudio = typeof Audio !== "undefined" ? new Audio("/200/coin-punctuality.mp3") : null;
const runningPunctualityDownAudio = typeof Audio !== "undefined" ? new Audio("/200/pause-punctuality.mp3") : null;
const sleepFrequencyAudio = typeof Audio !== "undefined" ? new Audio() : null;
const touchClickSoundUrls = [
  "/200/sfx/touch-1.mp3",
  "/200/sfx/touch-2.mp3",
  "/200/sfx/touch-3.mp3",
  "/200/sfx/touch-4.mp3"
];
const missionProgressSoundUrl = "/200/sfx/mission-passou.mp3";
const touchClickAudioPool = typeof Audio !== "undefined"
  ? touchClickSoundUrls.map((url) => {
      const primary = new Audio(url);
      const secondary = new Audio(url);
      primary.preload = "auto";
      secondary.preload = "auto";
      primary.volume = 0.6;
      secondary.volume = 0.6;
      try {
        primary.load();
        secondary.load();
      } catch {}
      return [primary, secondary];
    })
  : [];
const missionProgressAudioPool = typeof Audio !== "undefined"
  ? [new Audio(missionProgressSoundUrl), new Audio(missionProgressSoundUrl)]
  : [];
const pointsRankOvertakeAudio = typeof Audio !== "undefined"
  ? new Audio("/200/sfx/mododesbloqueado.mp3")
  : null;
const RUNNING_RING_RADIUS = 48;
const RUNNING_RING_CIRCUMFERENCE = 2 * Math.PI * RUNNING_RING_RADIUS;
const RUNNING_RING_FULL_OFFSET = -0.8;
const RUNNING_COMPLETION_ANIMATION_MS = 1200;
const RUNNING_COMPLETION_HOLD_MS = 1000;
const RUNNING_COMPLETION_PUNCTUALITY_HOLD_MS = 2000;
const MISSION_RUN_MUSIC_FADE_OUT_MS = 2000;
const MISSION_RUN_MAX_CYCLES = 12;
const MISSION_RUN_CUE_PRIORITY_RADIUS_SECONDS = 15;
const SLEEP_FREQUENCY_STATION_NAME = "Frequency";
const SLEEP_FREQUENCY_FADE_MS = 15 * 60 * 1000;
const SLEEP_DIRECT_TRACK_URL = "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/trilhas/videoplayback%20(3).m4a";
const SLEEP_DIRECT_TRACK_HOLD_MS = 500;
const TOUCH_CLICK_SOUND_THROTTLE_MS = 45;
const RUNNING_NEXT_METRIC_PROGRESS_MS = 1500;
const RUNNING_NEXT_METRIC_PUNCTUALITY_MS = 2500;
const RUNNING_STATUS_ROTATION_MS = 2000;
if (runningAudio) {
  runningAudio.preload = "auto";
}
if (runningSuccessAudio) {
  runningSuccessAudio.preload = "auto";
}
if (runningEndBellAudio) {
  runningEndBellAudio.preload = "auto";
}
if (runningPunctualityUpAudio) {
  runningPunctualityUpAudio.preload = "auto";
}
if (runningPunctualityDownAudio) {
  runningPunctualityDownAudio.preload = "auto";
}
missionProgressAudioPool.forEach((audio) => {
  audio.preload = "auto";
  audio.volume = 0.72;
  try {
    audio.load();
  } catch {}
});
let runningMusicProgressTicker = null;
let runningNextMetricTimer = null;
let taskBeepAudioContext = null;
let runningMinuteCuePlayers = [];
const runningMinuteCueWorker = typeof Worker !== "undefined"
  ? new Worker("/200/minute-cue-worker.js?v=20260716-ptbr-minute-cues")
  : null;
let postponeNavHoldTimer = null;
let postponeNavHoldInterval = null;
let postponeNavLongPressHandled = false;
let postponeFeedbackCarouselTimer = null;
let runningMissionQuickFeedbackTimer = null;
let runningMissionQuickFocusTimer = null;
let runningMissionQuickRequestChain = Promise.resolve();
let pointsUpdateFeedbackQueue = Promise.resolve();
let runningMissionQuickSpotlightTimer = null;
let missionCardHoldTimer = null;
let missionCardHoldGoalId = "";
let missionCardPressedGoalId = "";
let missionCardHoldTriggered = false;
let missionRunTicker = null;
let missionRunAlarmTicker = null;
let missionVariantsTicker = null;
let missionRunCueAudio = null;
let missionRunCycleAudio = null;
let missionRunCycleAudioQueue = Promise.resolve();
let missionRunMusicFadeTimer = null;
let missionRunMusicFadeToken = 0;
let missionRunMusicFadeRestoreVolume = null;
let missionRunVariantSelectionTimer = null;
let missionRunCycleSwipeStartX = null;
let partialTaskResolver = null;
let partialTaskPercentValue = 0;
let partialTaskHoldTimeout = null;
let partialTaskHoldInterval = null;
const modalNavigationStack = [];
let modalBackNavigationActive = false;
const missionVariantsCache = new Map();
const missionRunAlarmNodes = new Set();
// Minute announcements use the shared Portuguese R2 catalog. Keep only the
// sub-minute mission cues here so the 1/3/5/10-minute schedule never overlaps.
const missionRunCueMap = new Map([[30, "30-sec.mp3"], [15, "15-sec.mp3"]]);
const missionRunCycleCueMap = new Map([
  [2, "2.mp3"], [3, "3.mp3"], [4, "4.mp3"], [5, "5.mp3"],
  [6, "6.mp3"], [7, "7.mp3"], [8, "8.mp3"], [9, "9.mp3"],
  [10, "10.mp3"], [11, "11.mp3"], [12, "12.mp3"]
]);
let sleepFrequencyMonitorTicker = null;
let sleepFrequencyFadeToken = 0;
let sleepMusicHoldTimer = null;
let sleepMusicHoldTriggered = false;
let lastTouchClickSoundAt = 0;
let svgAssetLibraryPromise = null;
let socialSnapshotHydrationPromise = null;
const defaultTaskSvgPath = "/200/icons/task-default.svg";
const defaultMissionSvgPath = "/200/icons/target.svg";

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
  statsGlobalProfiles: [],
  statsRanking: [],
  statsPointsOverview: null,
  statsMissions: [],
  statsScopeMissions: [],
  statsAspectConfig: {},
  statsAspectModal: {
    categoryId: "",
    targetMinutes: 0,
    missionGoalIds: []
  },
  sleepModal: {
    delayIndex: 0,
    session: null,
    controlsVisible: false,
    musicEnabled: false,
    musicLoading: false,
    musicMode: "frequency",
    musicTrackIndex: 0,
    lastPhase: "",
    fadeStarted: false
  },
  social: {
    scopeKey: "today",
    loading: false,
    inviteComposerOpen: false,
    pendingCount: 0,
    self: null,
    incomingInvites: [],
    friends: []
  },
  missions: [],
  actionMissions: [],
  actionsMissionOnly: false,
  constitutionVersions: [],
  constitutionIndex: 0,
  constitutionEditing: false,
  actions: [],
  historySystem: [],
  historyTexts: [],
  authUser: null,
  profiles: [],
  selectedProfile: defaultProjectProfileName,
  profileLock: "",
  historyOffset: 0,
  missionHistoryScopeIndex: 0,
  missionAdjust: {
    goalId: "",
    targetValue: 1,
    unitDurationSeconds: 30
  },
  missionCreate: {
    unitDurationSeconds: 30,
    timeConfigured: true
  },
  missionProgress: {
    goalId: "",
    deltaValue: 0,
    baseValue: 0
  },
  missionTime: {
    mode: "",
    title: "",
    value: 0
  },
  missionRun: {
    goalId: "",
    startedAtMs: 0,
    durationMs: 0,
    centerMode: "time",
    previousTaskTitle: "",
    alarmStarted: false,
    finalizing: false,
    completedSuccessfully: false,
    selectedVariantId: "",
    selectedVariantIds: [],
    availableVariants: [],
    cycleTarget: 1,
    cycleIndex: 1,
    completedCycles: 0,
    transitioningCycle: false,
    preloadedDailyRanking: null,
    rankingPreloadStarted: false,
    announcedCueSeconds: [],
    previousRemainingSeconds: null
  },
  missionVariants: {
    goalId: "",
    mode: "edit",
    items: [],
    editorOpen: false,
    editingId: "",
    cycleSelectionTarget: 1,
    cycleSelections: [],
    cycleSelectionResumeMode: "preserve",
    sortMode: "user",
    sortMenuOpen: false,
    intervalValue: 1,
    intervalUnit: "days"
  },
  missionQuickSlots: [],
  runningMissionQuick: {
    feedbackGoalKey: "",
    lastRenderedText: "",
    focusKey: "",
    isAnimating: false,
    spotlightGoalId: ""
  },
  historyTextComposer: {
    step: 1,
    speaker: defaultProjectProfileName,
    liveText: "",
    organizedText: "",
    organizedTitle: "",
    micActive: false
  },
  platformWizard: buildInitialPlatformWizardState(),
  wizard: buildInitialWizardState(),
  options: {
    showFreeTime: true,
    missionActionsMode: "show",
    completionBeepCycles: 0,
    minuteNotificationInterval: 1,
    finalMinuteNotificationsEnabled: true,
    backgroundTheme: "edge",
    screenLockEnabled: false,
    stopMusicOnFinish: false
  },
  svgAssets: [],
  svgSelector: {
    targetKind: "",
    targetId: "",
    selectedUrl: "",
    selectedLabel: ""
  },
  screenLock: {
    locked: false,
    inactivityTimerId: 0,
    promptTimerId: 0,
    promptVisible: false,
    gestureActive: false,
    touchStartY: 0,
    touchCurrentY: 0
  },
  overlapResolver: null,
  overlapItems: [],
  overlapIndex: 0,
  overlapCandidateStarts: [],
  overlapCandidateIndex: 0,
  serverNowMs: 0,
  serverNowCapturedAtMs: 0,
  homeSnapshotReady: false,
  homeClockReady: false,
  postpone: {
    actionId: "",
    dayOffset: 0,
    delayMinutes: 5,
    clockMinutes: 8 * 60,
    timeTapTimestamps: [],
    onlyFree: false
  },
  runningPlayer: {
    stations: [],
    stationsLoaded: false,
    stationIndex: 0,
    playOrderUrls: [],
    playOrderIndex: 0,
    isPlaying: false,
    shuffleEnabled: false,
    repeatEnabled: false,
    favoriteTrackUrls: new Set(),
    hiddenTrackUrls: new Set(),
    defaultPreferenceByTaskTitle: new Map(),
    currentTaskTitle: "",
    configurationTaskTitle: "",
    configurationMode: false,
    defaultAppliedActionId: ""
  },
  runningMinuteCue: {
    actionId: "",
    optionKey: "",
    played: new Set(),
    preparedKey: "",
    playTimer: 0,
    preloadTimer: 0,
    workerCue: null
  },
  runningEndBell: {
    actionId: "",
    played: false
  },
  runningCompletion: {
    active: false,
    phase: "idle",
    metric: "progress",
    fromPercent: 0,
    toPercent: 0,
    displayPercent: 0,
    label: "",
    nextAction: null,
    nextOfNext: null,
    savedMinutes: 0,
    lateMinutes: 0,
    punctualityFrom: 100,
    punctualityTo: 100,
    progressValue: 0,
    punctualityValue: 100,
    nextMetricMode: "progress",
    timeoutIds: [],
    rafId: 0
  },
  runningConfirm: {
    action: null,
    pauseAction: null
  },
  startConflict: {
    currentActionId: "",
    nextActionId: ""
  },
  startDecisionContext: {
    actionId: "",
    mode: "view",
    fieldToFocus: "",
    dirty: false
  },
  uiAnchors: {
    actionsCurrentCentered: false,
    runningMusicCentered: false
  },
  runtimeState: null,
  runningCenterMode: "auto",
  runningIdleCenterMode: "time",
  runningLocalStarts: {},
  quickTaskAutoFinalizing: false
};

function buildDefaultProfileAvatarDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e9f2ff"/>
          <stop offset="100%" stop-color="#8ec5ff"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#g)"/>
      <circle cx="48" cy="35" r="17" fill="#0b3da8"/>
      <path d="M22 79c4-16 15-24 26-24s22 8 26 24" fill="#0b3da8"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaultProfileAvatarDataUrl = buildDefaultProfileAvatarDataUrl();

function getProfilesList() {
  return Array.isArray(state.profiles) ? state.profiles : [];
}

function getDefaultProfile() {
  return getProfilesList().find((profile) => profile?.isImmutable) || getProfilesList()[0] || null;
}

function getDefaultProfileName() {
  return getDefaultProfile()?.name || defaultProjectProfileName;
}

function getProfileByName(name) {
  const input = String(name || "").trim();
  if (!input) {
    return getDefaultProfile();
  }
  return getProfilesList().find((profile) => String(profile?.name || "").localeCompare(input, "pt-BR", { sensitivity: "accent" }) === 0) || null;
}

function getProfileById(profileId) {
  const input = String(profileId || "").trim();
  return getProfilesList().find((profile) => String(profile?.id || "") === input) || null;
}

function getStatsGlobalProfileByName(name) {
  const input = String(name || "").trim();
  if (!input) {
    return null;
  }
  return (Array.isArray(state.statsGlobalProfiles) ? state.statsGlobalProfiles : []).find((profile) => (
    String(profile?.name || "").localeCompare(input, "pt-BR", { sensitivity: "accent" }) === 0
  )) || null;
}

function isProject200AdminUser() {
  return Boolean(state.authUser?.isAdmin);
}

function getProfileAvatarPath(profileOrName) {
  const profile = typeof profileOrName === "string" ? getProfileByName(profileOrName) : profileOrName;
  const customAvatar = String(profile?.avatarDataUrl || "").trim();
  if (customAvatar.startsWith("data:image/")) {
    return customAvatar;
  }
  const preset = String(profile?.avatarPreset || "").trim().toLowerCase();
  return avatarPresetToPath[preset] || defaultProfileAvatarDataUrl;
}

function getProfileSvgIconPath(profileOrName) {
  const profile = typeof profileOrName === "string" ? getProfileByName(profileOrName) : profileOrName;
  return String(profile?.svgIconUrl || "").trim();
}

function getSocialCardAvatarPath(entry) {
  const customAvatar = String(entry?.avatarDataUrl || "").trim();
  if (customAvatar.startsWith("data:image/")) {
    return customAvatar;
  }
  const svgIconUrl = String(entry?.svgIconUrl || "").trim();
  if (svgIconUrl) {
    return svgIconUrl;
  }
  const preset = String(entry?.avatarPreset || "").trim().toLowerCase();
  return avatarPresetToPath[preset] || "";
}

function getSocialCardInitials(entry) {
  const explicit = String(entry?.initials || "").trim();
  if (explicit) {
    return explicit.slice(0, 2).toUpperCase();
  }
  const source = String(entry?.name || entry?.username || "U").trim();
  const parts = source.split(/\s+/u).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase() || "U";
}

function renderSocialCardAvatar(entry) {
  const avatarPath = getSocialCardAvatarPath(entry);
  if (avatarPath) {
    return `<img src="${escapeHtml(avatarPath)}" alt="${escapeHtml(String(entry?.name || "Avatar"))}" loading="lazy" />`;
  }
  return `<span>${escapeHtml(getSocialCardInitials(entry))}</span>`;
}

function normalizeBackgroundTheme(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "modern") {
    return "black";
  }
  return backgroundThemeModes.find((item) => item.key === normalized)?.key || "edge";
}

function getBackgroundThemeMode(value) {
  const normalized = normalizeBackgroundTheme(value);
  return backgroundThemeModes.find((item) => item.key === normalized) || backgroundThemeModes[0];
}

function applyBackgroundTheme() {
  document.body.dataset.backgroundTheme = normalizeBackgroundTheme(state.options.backgroundTheme);
}

function readTokenCookie() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)turma_do_printy_token=([^;]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getCapacitorPlugin(name) {
  return window.Capacitor?.Plugins?.[name] || null;
}

function isNativeCapacitorApp() {
  const capacitor = window.Capacitor;
  if (typeof capacitor?.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }
  const platform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "";
  return platform === "android" || platform === "ios";
}

function getProject200LoginPath() {
  return isNativeCapacitorApp() ? "/log/index.html?next=/200" : "/log?next=/200";
}

function redirectToProject200Login() {
  window.location.replace(getProject200LoginPath());
}

async function hydrateNativeToken() {
  if (!isNativeCapacitorApp()) {
    return;
  }
  if (window.localStorage.getItem(tokenKey)) {
    return;
  }
  const preferencesPlugin = getCapacitorPlugin("Preferences");
  if (!preferencesPlugin?.get) {
    return;
  }
  try {
    const result = await preferencesPlugin.get({ key: tokenKey });
    const token = String(result?.value || "").trim();
    if (token) {
      window.localStorage.setItem(tokenKey, token);
    }
  } catch {}
}

function persistTokenToNative(token) {
  if (!isNativeCapacitorApp()) {
    return;
  }
  const preferencesPlugin = getCapacitorPlugin("Preferences");
  if (!preferencesPlugin) {
    return;
  }
  Promise.resolve().then(async () => {
    try {
      if (token) {
        await preferencesPlugin.set?.({ key: tokenKey, value: token });
      } else {
        await preferencesPlugin.remove?.({ key: tokenKey });
      }
    } catch {}
  });
}

function getToken() {
  const localToken = window.localStorage.getItem(tokenKey) || "";
  if (localToken) {
    return localToken;
  }
  const cookieToken = readTokenCookie();
  if (cookieToken) {
    try {
      window.localStorage.setItem(tokenKey, cookieToken);
    } catch {}
  }
  return cookieToken;
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
    document.cookie = `${tokenKey}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(tokenKey);
    document.cookie = `${tokenKey}=; path=/; max-age=0; SameSite=Lax`;
  }
  persistTokenToNative(token);
}

function getActiveModalLoadingIcon() {
  const activeModalId = String(document.querySelector(".workspace-modal.active")?.id || "").trim();
  if (activeModalId === "historyModal" || activeModalId === "missionCreateModal" || activeModalId === "missionAdjustModal" || activeModalId === "missionProgressModal" || activeModalId === "runningMissionQuickModal" || activeModalId === "missionQuickAssignModal" || activeModalId === "missionTimeModal") {
    return loadingIconByArea.missions;
  }
  if (activeModalId === "statsModal" || activeModalId === "statsAspectModal" || activeModalId === "statsAspectAssignModal") {
    return loadingIconByArea.stats;
  }
  if (activeModalId === "optionsModal" || activeModalId === "profileAvatarModal" || activeModalId === "profileRenameModal" || activeModalId === "profileManageOverlay") {
    return loadingIconByArea.options;
  }
  if (activeModalId === "ideasModal") {
    return loadingIconByArea.ideas;
  }
  return loadingIconByArea.actions;
}

function resolveLoadingIconForPath(path = "", preferredIcon = "") {
  const normalizedPath = String(path || "").trim().toLowerCase();
  if (normalizedPath.includes("/api/200/goals") || normalizedPath.includes("/api/200/goal-progress") || normalizedPath.includes("/api/200/stats-aspects")) {
    return loadingIconByArea.missions;
  }
  if (normalizedPath.includes("/api/200/stats") || normalizedPath.includes("/api/stats") || normalizedPath.includes("/api/history")) {
    return loadingIconByArea.stats;
  }
  if (normalizedPath.includes("/api/200/profiles") || normalizedPath.includes("/api/auth/register")) {
    return loadingIconByArea.options;
  }
  if (normalizedPath.includes("/api/auth") || normalizedPath.includes("/api/actions") || normalizedPath.includes("/api/runtime")) {
    return loadingIconByArea.actions;
  }
  return String(preferredIcon || "").trim() || globalLoadingPreferredIcon || getActiveModalLoadingIcon();
}

function beginGlobalLoading(iconSrc = "") {
  if (startupLoadingActive) return false;
  globalLoadingCount += 1;
  if (globalLoadingCount === 1) {
    window.__project200LoadingShownAt = Date.now();
    globalLoadingTimedOut = false;
    if (globalLoadingIcon) globalLoadingIcon.src = "/200/images/ilife-mindsetplan-home.png";
    if (globalLoadingCopy) globalLoadingCopy.textContent = "Carregando informações...";
    if (globalLoadingOverlay) {
      globalLoadingOverlay.style.removeProperty("display");
      globalLoadingOverlay.hidden = false;
      globalLoadingOverlay.classList.remove("is-leaving");
      globalLoadingOverlay.setAttribute("aria-hidden", "false");
    }
    if (globalLoadingFallbackTimer) window.clearTimeout(globalLoadingFallbackTimer);
    globalLoadingFallbackTimer = window.setTimeout(() => {
      globalLoadingFallbackTimer = null;
      globalLoadingTimedOut = true;
      hideGlobalLoadingOverlay();
    }, 6000);
  }
  void iconSrc;
  return true;
}

function hideGlobalLoadingOverlay() {
  if (!globalLoadingOverlay) return;
  globalLoadingOverlay.classList.add("is-leaving");
  globalLoadingOverlay.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!startupLoadingActive && (globalLoadingCount === 0 || globalLoadingTimedOut)) {
      globalLoadingOverlay.hidden = true;
      globalLoadingOverlay.classList.remove("is-leaving");
    }
  }, 260);
}

function endGlobalLoading(wasTracked = true) {
  if (!wasTracked) return;
  globalLoadingCount = Math.max(0, globalLoadingCount - 1);
  if (globalLoadingCount > 0) return;
  if (globalLoadingFallbackTimer) {
    window.clearTimeout(globalLoadingFallbackTimer);
    globalLoadingFallbackTimer = null;
  }
  globalLoadingTimedOut = false;
  hideGlobalLoadingOverlay();
}
async function runWithGlobalLoading(task, options = {}) {
  if (options.skipGlobalLoading) {
    return task();
  }
  const iconSrc = resolveLoadingIconForPath(options.path || "", options.iconSrc || "");
  const wasTracked = beginGlobalLoading(iconSrc);
  try {
    return await task();
  } finally {
    endGlobalLoading(wasTracked);
  }
}

function beginStartupLoading(iconSrc = loadingIconByArea.actions) {
  if (startupLoadingActive) return;
  startupLoadingActive = true;
  window.__project200LoadingShownAt = Date.now();
  state.homeClockReady = false;
  if (projectShell) projectShell.hidden = true;
  if (globalLoadingIcon && iconSrc) globalLoadingIcon.src = "/200/images/ilife-mindsetplan-home.png";
  if (globalLoadingCopy) globalLoadingCopy.textContent = "Preparando sua home...";
  if (globalLoadingOverlay) {
    globalLoadingOverlay.style.removeProperty("display");
    globalLoadingOverlay.hidden = false;
    globalLoadingOverlay.classList.remove("is-leaving");
    globalLoadingOverlay.setAttribute("aria-hidden", "false");
  }
  if (startupLoadingFallbackTimer) window.clearTimeout(startupLoadingFallbackTimer);
  startupLoadingFallbackTimer = window.setTimeout(forceEndStartupLoading, 6000);
}

function forceEndStartupLoading() {
  try {
    state.runningIdleCenterMode = "time";
    renderHomeRunningTask();
    if (!runningTaskModalElement?.classList.contains("active")) openPrimaryRunningSurface();
  } catch {
    // The hard timeout must still release the screen if home rendering fails.
  } finally {
    endStartupLoading();
  }
}

function endStartupLoading() {
  if (!startupLoadingActive) return;
  startupLoadingActive = false;
  if (startupLoadingFallbackTimer) {
    window.clearTimeout(startupLoadingFallbackTimer);
    startupLoadingFallbackTimer = null;
  }
  if (window.__project200HomeLoadingFailsafe) {
    window.clearTimeout(window.__project200HomeLoadingFailsafe);
    window.__project200HomeLoadingFailsafe = null;
  }
  if (projectShell) projectShell.hidden = false;
  if (globalLoadingOverlay) {
    globalLoadingOverlay.classList.add("is-leaving");
    globalLoadingOverlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!startupLoadingActive) {
        globalLoadingOverlay.hidden = true;
        globalLoadingOverlay.classList.remove("is-leaving");
      }
    }, 260);
  }
}

window.__project200ForceEndStartupLoading = forceEndStartupLoading;
window.__project200DismissCurrentLoading = () => {
  const shownAt = Number(window.__project200LoadingShownAt || 0);
  if (!shownAt || (Date.now() - shownAt) < 3000) return false;
  if (startupLoadingActive) {
    forceEndStartupLoading();
    return true;
  }
  globalLoadingTimedOut = true;
  hideGlobalLoadingOverlay();
  return true;
};
function revealInitialHomeIfReady() {
  if (!startupLoadingActive
    || !state.runningPlayer.stationsLoaded
    || !Array.isArray(state.runningPlayer.stations)
    || state.runningPlayer.stations.length < 2) return false;
  state.runningIdleCenterMode = "time";
  renderHomeRunningTask();
  syncHomeDeviceClock();
  const clockText = String(runningTaskPercent?.textContent || "").trim();
  const stationText = String(runningPlayerStation?.textContent || "").trim();
  const trackText = String(runningPlayerTrack?.textContent || "").trim();
  const greetingText = String(runningTaskNextName?.textContent || "").trim();
  state.homeClockReady = /\d{1,2}[:h]\d{2}/.test(clockText);
  const playerReady = Boolean(stationText && trackText && !/^carregando/i.test(stationText));
  const greetingReady = /^(bom dia|boa tarde|boa noite)$/i.test(greetingText);
  if (!state.homeClockReady || !playerReady || !greetingReady) return false;
  if (!runningTaskModalElement?.classList.contains("active")) openPrimaryRunningSurface();
  window.requestAnimationFrame(() => endStartupLoading());
  return true;
}
function readSelectedProfile() {
  const saved = String(window.localStorage.getItem(projectProfileKey) || "");
  const matched = getProfileByName(saved);
  return matched?.name || getDefaultProfileName();
}

function refreshProfileLockFromAuth(authUser) {
  void authUser;
  state.profileLock = "";
}

function renderProfileFooterVisibility() {
  const profiles = getProfilesList();
  if (profileFooter) {
    profileFooter.hidden = profiles.length <= 1;
  }
  profileFooter?.querySelectorAll("[data-profile]").forEach((button) => {
    button.hidden = false;
  });
}

function applySelectedProfile(profile) {
  const matched = getProfileByName(profile);
  const next = matched?.name || getDefaultProfileName();
  state.selectedProfile = next;
  loadMissionQuickSlots(next);
  loadStatsAspectConfig(next);
  document.body.dataset.profile = next;
  window.localStorage.setItem(projectProfileKey, next);
  profileFooter?.querySelectorAll("[data-profile]").forEach((button) => {
    button.classList.toggle("active", button.dataset.profile === next);
  });
  renderHomeProfileHero();
  renderProfileFooterVisibility();
  renderHomeRunningTask();
  renderRunningMissionQuickButtons();
}

function renderHomeProfileHero() {
  if (homeProfileName) {
    homeProfileName.textContent = "";
  }
}

function setProject200AuthTab(tab) {
  const nextTab = String(tab || "login").trim().toLowerCase() === "register" ? "register" : "login";
  project200LoginTabButton?.classList.toggle("active", nextTab === "login");
  project200RegisterTabButton?.classList.toggle("active", nextTab === "register");
  project200LoginTabButton?.setAttribute("aria-selected", nextTab === "login" ? "true" : "false");
  project200RegisterTabButton?.setAttribute("aria-selected", nextTab === "register" ? "true" : "false");
  project200LoginPanel?.classList.toggle("active", nextTab === "login");
  project200RegisterPanel?.classList.toggle("active", nextTab === "register");
  if (project200LoginPanel) {
    project200LoginPanel.hidden = nextTab !== "login";
  }
  if (project200RegisterPanel) {
    project200RegisterPanel.hidden = nextTab !== "register";
  }
}

function renderProfileFooter() {
  if (!profileFooter) {
    return;
  }
  profileFooter.innerHTML = getProfilesList().map((profile) => `
    <button class="profile-chip${profile.name === state.selectedProfile ? " active" : ""}" type="button" data-profile="${escapeHtml(profile.name)}" aria-label="${escapeHtml(profile.name)}">
      <img class="task-avatar" src="${getProfileSvgIconPath(profile) || getProfileAvatarPath(profile)}" alt="${escapeHtml(String(profile.svgIconLabel || profile.name || ""))}" />
    </button>
  `).join("");
  renderHomeProfileHero();
  renderProfileFooterVisibility();
}

function renderHistorySpeakerSelectionOptions() {
  if (!historyTextAvatarGrid) {
    return;
  }
  historyTextAvatarGrid.innerHTML = getProfilesList().map((profile) => `
    <button class="history-avatar-btn${profile.name === state.historyTextComposer.speaker ? " active" : ""}" type="button" data-history-speaker="${escapeHtml(profile.name)}">
      <img class="task-avatar" src="${getProfileSvgIconPath(profile) || getProfileAvatarPath(profile)}" alt="${escapeHtml(String(profile.svgIconLabel || profile.name || ""))}" />
      <span>${escapeHtml(profile.name)}</span>
    </button>
  `).join("");
}

function renderProfileManageOverlay() {
  const profile = getProfileById(profileManageTargetId) || getProfileByName(state.selectedProfile);
  const selectedProfile = getProfileByName(state.selectedProfile) || profile;
  if (!profile) {
    return;
  }
  if (profileManageTitle) {
    profileManageTitle.textContent = `Gerenciar ${profile.name}`;
  }
  if (profileManageTargetLabel) {
    profileManageTargetLabel.textContent = `Usuário selecionado: ${profile.name}`;
  }
  if (profileReassignSelect) {
    profileReassignSelect.innerHTML = getProfilesList().map((item) => `
      <option value="${escapeHtml(item.id)}"${item.id === profile.id ? " selected" : ""}>${escapeHtml(item.name)}</option>
    `).join("");
  }
  if (profileReassignTargetHint) {
    profileReassignTargetHint.textContent = `Destino: ${selectedProfile?.name || state.selectedProfile || "usuário selecionado"}`;
  }
  const canDelete = String(profileDeleteConfirmInput?.value || "").trim() === "Excluir";
  profileDeleteConfirmButton?.classList.toggle("is-disabled", !canDelete);
  if (profileDeleteConfirmButton) {
    profileDeleteConfirmButton.disabled = !canDelete;
  }
}

function todayStart() {
  return projectDateKeyToDate(getProjectDateKey(new Date(getServerNowMs())));
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getProjectDateTimeParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const fallback = new Date(typeof getServerNowMs === "function" ? getServerNowMs() : Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? fallback : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: projectTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(safeDate);
  const read = (type, fallbackValue = "00") => parts.find((part) => part.type === type)?.value || fallbackValue;
  return {
    year: read("year", "0000"),
    month: read("month", "01"),
    day: read("day", "01"),
    hour: Number(read("hour", "0")),
    minute: Number(read("minute", "0"))
  };
}

function getProjectTimeZoneOffsetMinutes(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: projectTimeZone,
    timeZoneName: "shortOffset"
  });
  const zoneName = formatter.formatToParts(safeDate).find((part) => part.type === "timeZoneName")?.value || "GMT-03:00";
  const match = zoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    return -180;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes);
}

function makeProjectZonedDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const offsetMinutes = getProjectTimeZoneOffsetMinutes(new Date(guessUtcMs));
  return new Date(guessUtcMs - (offsetMinutes * 60000));
}

function getProjectDateKey(value = new Date()) {
  const parts = getProjectDateTimeParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return getProjectDateKey(new Date(getServerNowMs()));
  }
  const shifted = makeProjectZonedDate(year, month, day + Number(days || 0), 12, 0, 0);
  return getProjectDateKey(shifted);
}

function projectDateKeyToDate(dateKey, hour = 0, minute = 0, second = 0) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return todayStart();
  }
  return makeProjectZonedDate(year, month, day, hour, minute, second);
}

function dateFromOffset(offset) {
  return projectDateKeyToDate(addDaysToDateKey(getProjectDateKey(new Date(getServerNowMs())), offset));
}

function getVisibleActions() {
  return state.actions
    .filter((action) => normalizeAssigneeName(action.assignee) === state.selectedProfile);
}

function getServerNowMs() {
  if (Number.isFinite(state.serverNowMs) && state.serverNowMs > 0 && Number.isFinite(state.serverNowCapturedAtMs) && state.serverNowCapturedAtMs > 0) {
    return state.serverNowMs + (Date.now() - state.serverNowCapturedAtMs);
  }
  return Date.now();
}

function getRunningActionForSelectedProfile() {
  const list = getVisibleActions();
  return list.find((action) => normalizeActionStatus(action?.status) === actionStatuses.inProgress) || null;
}

function isQuickTaskAction(action) {
  return String(action?.categoryId || "").trim().toLowerCase() === "quick_task";
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
  dayEnd.setDate(dayEnd.getDate() + 1);
  dayEnd.setHours(7, 59, 59, 999);
  let cursor = dayStart.getTime();

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

  return entries
    .filter((entry) => state.options.showFreeTime || entry.kind !== "free")
    .filter((entry) => getActionDurationMinutes(entry) > 0)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function normalizeMissionActionsMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return missionActionsModes.includes(normalized) ? normalized : "show";
}

function buildPendingActionMissionUnits() {
  if (state.activeOffset !== 0) return [];
  const weightedGoals = (Array.isArray(state.actionMissions) ? state.actionMissions : []).map((goal, goalIndex) => {
    const targetValue = Math.max(1, Math.trunc(Number(goal?.targetValue || 1) || 1));
    const progressValue = Math.max(0, Math.trunc(Number(goal?.progressValue || 0) || 0));
    const remainingValue = Math.max(0, targetValue - progressValue);
    return {
      goal,
      goalIndex,
      progressValue,
      remainingValue,
      emittedValue: 0,
      currentWeight: 0
    };
  }).filter((entry) => entry.remainingValue > 0);
  const totalWeight = weightedGoals.reduce((sum, entry) => sum + entry.remainingValue, 0);
  const units = [];
  let lastGoalIndex = -1;
  while (units.length < totalWeight) {
    weightedGoals.forEach((entry) => {
      if (entry.emittedValue < entry.remainingValue) {
        entry.currentWeight += entry.remainingValue;
      }
    });
    const available = weightedGoals.filter((entry) => entry.emittedValue < entry.remainingValue);
    if (!available.length) break;
    available.sort((left, right) => (
      right.currentWeight - left.currentWeight
      || left.goalIndex - right.goalIndex
    ));
    let selected = available[0];
    if (selected.goalIndex === lastGoalIndex && available.length > 1) {
      const selectedRemaining = selected.remainingValue - selected.emittedValue;
      const otherRemaining = available.reduce((sum, entry) => (
        entry.goalIndex === selected.goalIndex ? sum : sum + (entry.remainingValue - entry.emittedValue)
      ), 0);
      if (selectedRemaining <= otherRemaining + 1) {
        selected = available.find((entry) => entry.goalIndex !== lastGoalIndex) || selected;
      }
    }
    selected.currentWeight -= totalWeight;
    selected.emittedValue += 1;
    lastGoalIndex = selected.goalIndex;
    units.push({
      goal: selected.goal,
      unitIndex: selected.progressValue + selected.emittedValue
    });
  }
  return units;
}

function getActionMissionScheduleBounds() {
  const scheduled = getVisibleActions()
    .map((action) => ({
      startMs: new Date(action?.startAt).getTime(),
      endMs: new Date(action?.endAt).getTime()
    }))
    .filter((entry) => Number.isFinite(entry.startMs))
    .sort((left, right) => left.startMs - right.startMs);
  if (scheduled.length >= 2) {
    const startMs = scheduled[0].startMs;
    const last = scheduled[scheduled.length - 1];
    const endMs = last.startMs > startMs
      ? last.startMs
      : (Number.isFinite(last.endMs) && last.endMs > startMs ? last.endMs : startMs + (60 * 60 * 1000));
    return { startMs, endMs };
  }
  if (scheduled.length === 1) {
    const startMs = scheduled[0].startMs;
    const endMs = Number.isFinite(scheduled[0].endMs) && scheduled[0].endMs > startMs
      ? scheduled[0].endMs
      : startMs + (60 * 60 * 1000);
    return { startMs, endMs };
  }
  const selectedDate = dateFromOffset(state.activeOffset);
  const startMs = projectDateKeyToDate(getProjectDateKey(selectedDate), 8, 0).getTime();
  return { startMs, endMs: projectDateKeyToDate(getProjectDateKey(selectedDate), 20, 0).getTime() };
}

function buildActionMissionTimelineEntries() {
  const units = buildPendingActionMissionUnits();
  if (!units.length) return [];
  const { startMs, endMs } = getActionMissionScheduleBounds();
  const rangeMs = Math.max(0, endMs - startMs);
  return units.map(({ goal, unitIndex }, index) => {
    const ratio = (index + 1) / (units.length + 1);
    const scheduledMs = startMs + (rangeMs * ratio);
    const durationSeconds = Math.max(1, getMissionUnitDurationSeconds(goal));
    return {
      kind: "mission",
      id: `mission-${String(goal?.id || "")}-${unitIndex}`,
      goalId: String(goal?.id || ""),
      goal,
      unitIndex,
      status: actionStatuses.pending,
      title: String(goal?.title || "Missão"),
      startAt: new Date(scheduledMs).toISOString(),
      endAt: new Date(scheduledMs + (durationSeconds * 1000)).toISOString()
    };
  });
}

function formatActionMissionDuration(goal) {
  return formatMissionDurationValue(getMissionUnitDurationSeconds(goal));
}

function renderActionsMissionFilter() {
  if (!actionsMissionFilterButton) return;
  const mode = normalizeMissionActionsMode(state.options.missionActionsMode);
  const isAvailable = Boolean(getToken()) && state.activeOffset === 0 && mode !== "hide";
  const remainingCount = buildPendingActionMissionUnits().length;
  actionsMissionFilterButton.hidden = !isAvailable;
  actionsMissionFilterButton.classList.toggle("is-filtering", state.actionsMissionOnly);
  actionsMissionFilterButton.setAttribute("aria-label", state.actionsMissionOnly
    ? "Voltar para a lista de ações"
    : `Mostrar somente missões: ${remainingCount} restantes`);
  if (actionsMissionRemainingCount) {
    actionsMissionRemainingCount.hidden = state.actionsMissionOnly;
    actionsMissionRemainingCount.textContent = String(remainingCount);
  }
  if (actionsMissionListIcon) {
    actionsMissionListIcon.hidden = !state.actionsMissionOnly;
  }
}

function getRunningActionProgressState(action) {
  if (!action) {
    return { percent: 0, remainingMinutes: 0 };
  }
  const durationMinutes = getActionDurationMinutes(action);
  if (!durationMinutes) {
    return { percent: 0, remainingMinutes: 0 };
  }
  const runtimeActionId = String(state.runtimeState?.actionId || "").trim();
  const runtimeStartedAtMs = runtimeActionId === String(action?.id || "").trim()
    ? new Date(state.runtimeState?.startedAt || "").getTime()
    : 0;
  const persistedStartedAtMs = new Date(action?.startedAt || "").getTime();
  const localStartedAtMs = Number(state.runningLocalStarts?.[String(action?.id || "")] || 0);
  const startedAtMs = Number.isFinite(runtimeStartedAtMs) && runtimeStartedAtMs > 0
    ? runtimeStartedAtMs
    : Number.isFinite(persistedStartedAtMs) && persistedStartedAtMs > 0
      ? persistedStartedAtMs
      : Number.isFinite(localStartedAtMs) && localStartedAtMs > 0
        ? localStartedAtMs
        : new Date(action?.startAt).getTime();
  if (!Number.isFinite(startedAtMs)) {
    return { percent: 0, remainingMinutes: durationMinutes };
  }
  const accumulatedMinutes = Math.max(0, Number(action?.accumulatedSeconds || 0) / 60);
  const elapsedMinutes = accumulatedMinutes + Math.max(0, (getServerNowMs() - startedAtMs) / (60 * 1000));
  const totalBudget = durationMinutes + Math.max(0, Number(runningCarryOverMinutes || 0));
  const remainingBudget = Math.max(0, Math.ceil(totalBudget - elapsedMinutes));
  const percent = totalBudget > 0 ? Math.max(0, Math.min(100, Math.round((elapsedMinutes / totalBudget) * 100))) : 0;
  const percentPrecise = totalBudget > 0 ? Math.max(0, Math.min(100, (elapsedMinutes / totalBudget) * 100)) : 0;
  const startAtMs = new Date(action?.startAt).getTime();
  const scheduleDeltaMinutes = Number.isFinite(startAtMs)
    ? Math.round((startedAtMs - startAtMs) / (60 * 1000))
    : 0;
  return { percent, percentPrecise, remainingMinutes: remainingBudget, elapsedMinutes, durationMinutes, scheduleDeltaMinutes };
}

function formatSignedDelay(minutesValue) {
  const numeric = Number(minutesValue || 0);
  const total = Math.abs(Math.round(numeric));
  if (total <= 0) {
    return "0 minutos";
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) {
    return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }
  if (minutes <= 0) {
    return `${hours} hora${hours === 1 ? "" : "s"}`;
  }
  return `${hours} hora${hours === 1 ? "" : "s"} e ${String(minutes).padStart(2, "0")} minutos`;
}

function renderRunningStatusChip(punctualitySummary, scheduleDeltaMinutes) {
  if (!runningTaskMinutesLeft) {
    return;
  }
  const showPunctuality = Math.floor(getServerNowMs() / RUNNING_STATUS_ROTATION_MS) % 2 === 0;
  runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
  clearInlineTone(runningTaskMinutesLeft);
  if (showPunctuality) {
    runningTaskMinutesLeft.textContent = `Pontualidade ${punctualitySummary.punctualityPercent}%`;
    applyPunctualityTone(runningTaskMinutesLeft, punctualitySummary.punctualityPercent);
    return;
  }
  const numericDelay = Number(scheduleDeltaMinutes || 0);
  runningTaskMinutesLeft.textContent = formatSignedDelay(numericDelay);
  if (numericDelay > 0) {
    runningTaskMinutesLeft.classList.add("is-late");
  } else if (numericDelay < 0) {
    runningTaskMinutesLeft.classList.add("is-early");
  } else {
    runningTaskMinutesLeft.classList.add("is-bonus");
  }
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

function isRelatedRunningAction(source, candidate) {
  if (!source || !candidate) {
    return false;
  }
  if (String(source.id || "") === String(candidate.id || "")) {
    return false;
  }
  const sourceRepeatGroupId = String(source.repeatGroupId || "").trim();
  const candidateRepeatGroupId = String(candidate.repeatGroupId || "").trim();
  if (sourceRepeatGroupId && candidateRepeatGroupId) {
    return sourceRepeatGroupId === candidateRepeatGroupId;
  }
  return normalizeAssigneeName(source.assignee) === normalizeAssigneeName(candidate.assignee)
    && String(source.title || "").trim().localeCompare(String(candidate.title || "").trim(), "pt-BR", { sensitivity: "accent" }) === 0;
}

function getNextRelatedActionForRunning(action) {
  if (!action) {
    return null;
  }
  const runningStartMs = new Date(action.startAt).getTime();
  if (!Number.isFinite(runningStartMs)) {
    return null;
  }
  return getVisibleActions()
    .filter((item) => isRelatedRunningAction(action, item))
    .filter((item) => normalizeActionStatus(item.status) === actionStatuses.pending)
    .filter((item) => {
      const startMs = new Date(item.startAt).getTime();
      return Number.isFinite(startMs) && startMs > runningStartMs;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] || null;
}

function getNextTimelineEntryForRunning(action) {
  if (!action) return null;
  const currentStart = new Date(action.startAt).getTime();
  if (!Number.isFinite(currentStart)) return null;
  const timeline = buildActionTimelineEntries()
    .filter((entry) => entry.kind === "free" || normalizeActionStatus(entry.status) === actionStatuses.pending)
    .filter((entry) => {
      if (entry.id === action.id) return false;
      const start = new Date(entry.startAt).getTime();
      return Number.isFinite(start) && start > currentStart;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return timeline[0] || null;
}

function isGivenUpAction(action) {
  const title = String(action?.title || "");
  return title.includes("[DESISTIU]");
}

function formatActionTitleForDisplay(title) {
  return String(title || "").replace(/\s*\[DESISTIU\]\s*/gi, "").trim() || "Tarefa";
}

function formatTitleTwoLines(title) {
  const clean = formatActionTitleForDisplay(title);
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return escapeHtml(clean);
  return `${escapeHtml(parts[0])}<br>${escapeHtml(parts.slice(1).join(" "))}`;
}

function formatRunningTaskTitleMarkup(title) {
  const clean = formatActionTitleForDisplay(title);
  if (clean.length <= 16) {
    return escapeHtml(clean);
  }
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    const midpoint = Math.ceil(clean.length / 2);
    return `${escapeHtml(clean.slice(0, midpoint))}<br>${escapeHtml(clean.slice(midpoint).trim())}`;
  }
  let bestIndex = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const diff = Math.abs(first.length - second.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }
  const firstLine = words.slice(0, bestIndex).join(" ");
  const secondLine = words.slice(bestIndex).join(" ");
  return `${escapeHtml(firstLine)}<br>${escapeHtml(secondLine)}`;
}

function formatDurationHuman(totalMinutes) {
  const value = Math.max(0, Math.round(Number(totalMinutes || 0)));
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours > 0 && minutes > 0) return `${hours} hora${hours > 1 ? "s" : ""} e ${minutes} minutos`;
  if (hours > 0) return `${hours} hora${hours > 1 ? "s" : ""}`;
  return `${minutes} minutos`;
}

function formatMinutesCompact(totalMinutes) {
  const value = Math.max(0, Math.round(Number(totalMinutes || 0)));
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes} min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

function setRunningNextDisplay(name, totalMinutes) {
  if (runningTaskNextName) {
    runningTaskNextName.innerHTML = escapeHtml(name || "Tarefa");
  }
  if (runningTaskNextTime) {
    runningTaskNextTime.textContent = totalMinutes > 0 ? formatMinutesCompact(totalMinutes) : "Tempo";
  }
}

function formatWholePercentMarkup(value) {
  const safe = clampPercent(value);
  return `${Math.round(safe)}<span class="running-task-unit">%</span>`;
}

function formatRunningPercentMarkup(value) {
  const safe = clampPercent(value);
  if (safe >= 50) {
    return formatWholePercentMarkup(safe);
  }
  return formatPercentMarkup(safe, 1);
}

function getPunctualityPercentFromLateMinutes(lateMinutesValue) {
  const lateMinutes = Math.max(0, Number(lateMinutesValue || 0));
  return clampPercent(100 - (lateMinutes / 5));
}

function getPunctualityTone(percent) {
  const points = [
    { percent: 100, color: [34, 197, 94] },
    { percent: 80, color: [59, 130, 246] },
    { percent: 60, color: [234, 179, 8] },
    { percent: 40, color: [249, 115, 22] },
    { percent: 0, color: [239, 68, 68] }
  ];
  const safe = clampPercent(percent);
  if (safe >= 100) return points[0].color;
  for (let index = 0; index < points.length - 1; index += 1) {
    const upper = points[index];
    const lower = points[index + 1];
    if (safe <= upper.percent && safe >= lower.percent) {
      const span = upper.percent - lower.percent || 1;
      const ratio = (safe - lower.percent) / span;
      return upper.color.map((component, colorIndex) => Math.round(lower.color[colorIndex] + ((component - lower.color[colorIndex]) * ratio)));
    }
  }
  return points[points.length - 1].color;
}

function applyPunctualityTone(element, percent) {
  if (!element) return;
  const [red, green, blue] = getPunctualityTone(percent);
  const strong = `rgba(${red}, ${green}, ${blue}, 0.92)`;
  const soft = `rgba(${red}, ${green}, ${blue}, 0.58)`;
  element.style.background = `linear-gradient(90deg, ${strong}, ${soft})`;
}

function clearInlineTone(element) {
  if (!element) return;
  element.style.background = "";
}

function clampPercent(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function formatPercentMarkup(value, decimals = 1) {
  const safe = clampPercent(value);
  const formatted = safe.toFixed(decimals);
  const [whole, decimal = "0".repeat(decimals)] = formatted.split(".");
  return `${whole}<span class="running-task-decimal">.${decimal}</span><span class="running-task-unit">%</span>`;
}

function getRunningRingDashOffset(percent) {
  const safe = clampPercent(percent);
  if (safe >= 100) {
    return RUNNING_RING_FULL_OFFSET;
  }
  return RUNNING_RING_CIRCUMFERENCE * (1 - (safe / 100));
}

function setProgressRingPercent(ringElement, percent) {
  if (!ringElement) return;
  ringElement.style.strokeDasharray = `${RUNNING_RING_CIRCUMFERENCE} ${RUNNING_RING_CIRCUMFERENCE}`;
  ringElement.style.strokeDashoffset = String(getRunningRingDashOffset(percent));
}

function setRunningRingPercent(percent) {
  setProgressRingPercent(runningTaskProgressRing, percent);
}

function setHomeRingPercent(percent) {
  setProgressRingPercent(homeRunningProgressRing, percent);
}

function formatRunningCenter(percent, percentPrecise, remainingMinutes, remainingSeconds, showPercent) {
  if (showPercent) {
    const safe = Number.isFinite(percentPrecise) ? clampPercent(percentPrecise) : Number(percent || 0);
    return formatRunningPercentMarkup(safe);
  }
  const totalSec = Math.max(0, Math.round(Number(remainingSeconds || 0)));
  if (totalSec >= 3600) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h}<span class="running-task-decimal">:${String(m).padStart(2, "0")}</span>`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}<span class="running-task-decimal">:${String(s).padStart(2, "0")}</span>`;
}

function formatRunningClockMarkup(date = new Date()) {
  const parts = getProjectDateTimeParts(date);
  return `${String(parts.hour).padStart(2, "0")}<span class="running-task-decimal">:${String(parts.minute).padStart(2, "0")}</span>`;
}

function getRunningIdleGreeting(date = new Date()) {
  const hour = Number(getProjectDateTimeParts(date).hour || 0);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}


function getDayElapsedPercent(date = new Date()) {
  const parts = getProjectDateTimeParts(date);
  const totalMinutes = (parts.hour * 60) + parts.minute;
  return clampPercent((totalMinutes / (24 * 60)) * 100);
}

function formatRunningDateTitle(date = new Date()) {
  return formatDateLabel(date);
}

function updateRunningCenterModeButtons(mode) {
  if (runningModePercentBtn) runningModePercentBtn.classList.toggle("active", mode === "percent");
  if (runningModeTimeBtn) runningModeTimeBtn.classList.toggle("active", mode === "time");
  if (homeRunningModePercentBtn) homeRunningModePercentBtn.classList.toggle("active", mode === "percent");
  if (homeRunningModeTimeBtn) homeRunningModeTimeBtn.classList.toggle("active", mode === "time");
}

function setRunningCompletionVisualState(isCompletion) {
  runningTaskContent?.classList.toggle("is-completion-layout", isCompletion);
}

function setRunningIdleVisualState(isIdle) {
  runningTaskContent?.classList.toggle("is-idle-layout", isIdle);
}

function setRunningHomeVisibility(isVisible) {
  void isVisible;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function updateRunningPlayerOverlayState() {
  const hasOverlay = [
    runningMusicListModal,
    runningMusicDefaultModal,
    runningMusicDefaultChoiceModal
  ].some((modal) => modal?.classList.contains("active"));
  document.body.classList.toggle("running-player-overlay-open", hasOverlay);
}

function clearRunningCompletionTimers() {
  const timeoutIds = Array.isArray(state.runningCompletion.timeoutIds) ? state.runningCompletion.timeoutIds : [];
  timeoutIds.forEach((timerId) => window.clearTimeout(timerId));
  state.runningCompletion.timeoutIds = [];
  if (runningNextMetricTimer) {
    window.clearTimeout(runningNextMetricTimer);
    runningNextMetricTimer = null;
  }
  if (state.runningCompletion.rafId) {
    window.cancelAnimationFrame(state.runningCompletion.rafId);
    state.runningCompletion.rafId = 0;
  }
}

function queueRunningCompletionTimeout(callback, delayMs) {
  const timerId = window.setTimeout(() => {
    state.runningCompletion.timeoutIds = state.runningCompletion.timeoutIds.filter((item) => item !== timerId);
    callback();
  }, delayMs);
  state.runningCompletion.timeoutIds.push(timerId);
  return timerId;
}

function resetRunningCompletionState() {
  clearRunningCompletionTimers();
  state.runningCompletion.active = false;
  state.runningCompletion.phase = "idle";
  state.runningCompletion.metric = "progress";
  state.runningCompletion.fromPercent = 0;
  state.runningCompletion.toPercent = 0;
  state.runningCompletion.displayPercent = 0;
  state.runningCompletion.label = "";
  state.runningCompletion.nextAction = null;
  state.runningCompletion.nextOfNext = null;
  state.runningCompletion.savedMinutes = 0;
  state.runningCompletion.lateMinutes = 0;
  state.runningCompletion.punctualityFrom = 100;
  state.runningCompletion.punctualityTo = 100;
  state.runningCompletion.progressValue = 0;
  state.runningCompletion.punctualityValue = 100;
  state.runningCompletion.nextMetricMode = "progress";
  if (runningCompletionLabel) {
    runningCompletionLabel.textContent = "";
  }
  setRunningCompletionVisualState(false);
}

function buildTimelineEntrySnapshot(entry) {
  if (!entry) return null;
  return {
    id: entry.id || "",
    kind: entry.kind || "action",
    title: entry.title || "",
    categoryId: entry.categoryId || "",
    startAt: entry.startAt || "",
    endAt: entry.endAt || ""
  };
}

function renderRunningCompletionCelebration() {
  if (!runningTaskName || !runningTaskPercent || !runningTaskMinutesLeft || !runningTaskNextName) {
    return;
  }
  setRunningCompletionVisualState(true);
  setRunningIdleVisualState(false);
  runningTaskName.innerHTML = "";
  runningTaskMinutesLeft.textContent = "";
  runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
  setRunningNextDisplay("", 0);
  if (runningTaskCategoryIcon) {
    runningTaskCategoryIcon.hidden = true;
  }
  if (runningTaskFinalizeButton) runningTaskFinalizeButton.hidden = true;
  if (runningTaskRestoreButton) runningTaskRestoreButton.hidden = true;
  if (runningTaskGiveUpButton) runningTaskGiveUpButton.hidden = true;
  if (runningTaskListButton) runningTaskListButton.hidden = true;
  if (runningTaskMusicButton) runningTaskMusicButton.hidden = true;
  if (runningTaskStartNextButton) runningTaskStartNextButton.hidden = true;
  setRunningHomeVisibility(false);
  if (runningCompletionLabel) {
    runningCompletionLabel.textContent = String(state.runningCompletion.label || "");
  }
  updateRunningCenterModeButtons("percent");
  setRunningRingPercent(state.runningCompletion.displayPercent);
  if (runningTaskPercent) {
    runningTaskPercent.innerHTML = formatRunningPercentMarkup(state.runningCompletion.displayPercent);
  }
}

function splitHomeTaskTitle(title = "") {
  const words = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return ["", ""];
  }
  if (words.length === 1) {
    return [words[0], ""];
  }
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function setHomeTaskTitle(title = "", visible = false) {
  if (homeRunningTaskTitle) {
    homeRunningTaskTitle.hidden = !visible;
  }
  const [primary, secondary] = splitHomeTaskTitle(title);
  if (homeRunningTaskLinePrimary) {
    homeRunningTaskLinePrimary.textContent = visible ? primary : "";
  }
  if (homeRunningTaskLineSecondary) {
    homeRunningTaskLineSecondary.textContent = visible ? secondary : "";
  }
}

function renderRunningCompletionNextView() {
  const nextAction = state.runningCompletion.nextAction;
  if (!runningTaskName || !runningTaskPercent || !runningTaskMinutesLeft || !runningTaskNextName || !nextAction) {
    return;
  }
  setRunningCompletionVisualState(false);
  setRunningIdleVisualState(false);
  runningTaskName.innerHTML = formatRunningTaskTitleMarkup(nextAction.kind === "free" ? "Tempo livre" : formatActionTitleForDisplay(nextAction.title));
  if (runningTaskCategoryIcon) {
    runningTaskCategoryIcon.hidden = true;
  }
  if (runningTaskMinutesLeft) {
    runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
    runningTaskMinutesLeft.classList.add("is-bonus");
    runningTaskMinutesLeft.textContent = "Próxima";
  }
  setRunningRingPercent(state.runningCompletion.progressValue);
  if (runningTaskPercent) {
    runningTaskPercent.innerHTML = formatRunningPercentMarkup(state.runningCompletion.progressValue);
  }
  const nextOfNext = state.runningCompletion.nextOfNext;
  if (nextOfNext) {
    const nextLabel = nextOfNext.kind === "free" ? "Tempo livre" : formatActionTitleForDisplay(nextOfNext.title);
    setRunningNextDisplay(nextLabel, getActionDurationMinutes(nextOfNext));
  } else {
    setRunningNextDisplay("Sem próxima tarefa", 0);
  }
  if (runningTaskListButton) runningTaskListButton.hidden = false;
  if (runningTaskMusicButton) runningTaskMusicButton.hidden = false;
  if (runningTaskFinalizeButton) runningTaskFinalizeButton.hidden = true;
  if (runningTaskRestoreButton) runningTaskRestoreButton.hidden = true;
  if (runningTaskGiveUpButton) runningTaskGiveUpButton.hidden = true;
  if (runningTaskStartNextButton) {
    runningTaskStartNextButton.hidden = nextAction.kind !== "action";
    runningTaskStartNextButton.dataset.actionId = String(nextAction.id || "");
    runningTaskStartNextButton.dataset.kind = String(nextAction.kind || "action");
    runningTaskStartNextButton.dataset.startIso = String(nextAction.startAt || "");
    runningTaskStartNextButton.dataset.endIso = String(nextAction.endAt || "");
  }
  setRunningHomeVisibility(false);
}

function animateRunningCompletionProgress(fromPercent, toPercent, durationMs) {
  if (!runningTaskPercent || !runningTaskProgressRing) {
    return;
  }
  if (state.runningCompletion.rafId) {
    window.cancelAnimationFrame(state.runningCompletion.rafId);
  }
  const safeFrom = clampPercent(fromPercent);
  const safeTo = clampPercent(toPercent);
  const startedAt = performance.now();
  const step = (now) => {
    const ratio = Math.max(0, Math.min(1, (now - startedAt) / durationMs));
    const current = safeFrom + ((safeTo - safeFrom) * ratio);
    state.runningCompletion.displayPercent = current;
    setRunningRingPercent(current);
    runningTaskPercent.innerHTML = formatRunningPercentMarkup(current);
    if (ratio < 1) {
      state.runningCompletion.rafId = window.requestAnimationFrame(step);
      return;
    }
    state.runningCompletion.displayPercent = safeTo;
    state.runningCompletion.rafId = 0;
  };
  state.runningCompletion.rafId = window.requestAnimationFrame(step);
}

async function playRunningSuccessCue() {
  if (!runningSuccessAudio) return;
  try {
    runningSuccessAudio.pause();
    runningSuccessAudio.currentTime = 0;
    runningSuccessAudio.volume = Math.min(1, Number(runningAudio?.volume || 1) || 1);
    await runningSuccessAudio.play();
  } catch {}
}

async function playRunningPunctualityIntroCue() {
  if (!runningPunctualityUpAudio) return;
  try {
    runningPunctualityUpAudio.pause();
    runningPunctualityUpAudio.currentTime = 0;
    runningPunctualityUpAudio.volume = Math.min(1, Number(runningAudio?.volume || 1) || 1);
    await runningPunctualityUpAudio.play();
  } catch {}
}

async function playRunningPunctualityDownCue() {
  if (!runningPunctualityDownAudio) return;
  try {
    runningPunctualityDownAudio.pause();
    runningPunctualityDownAudio.currentTime = 0;
    runningPunctualityDownAudio.volume = Math.min(1, Number(runningAudio?.volume || 1) || 1);
    await runningPunctualityDownAudio.play();
  } catch {}
}

async function playRunningEndBellCue(actionId) {
  if (!actionId) return;
  if (state.runningEndBell.actionId === actionId && state.runningEndBell.played) {
    return;
  }
  state.runningEndBell.actionId = actionId;
  state.runningEndBell.played = true;
  const cycleCount = Number(state.options.completionBeepCycles || 0);
  if (cycleCount > 0) {
    await playCompletionBeeps(cycleCount);
    return;
  }
  if (!runningEndBellAudio) return;
  const baseRunningVolume = Math.max(0.2, Number(runningAudio?.volume || 1) || 1);
  const nextVolume = Math.min(1, Math.max(0.2, baseRunningVolume * 1.8));
  try {
    if (runningAudio && !runningAudio.paused) {
      await fadeAudioVolume(runningAudio, 0, 2000);
      runningAudio.pause();
      runningAudio.currentTime = 0;
    }
    for (let index = 0; index < 3; index += 1) {
      runningEndBellAudio.pause();
      runningEndBellAudio.currentTime = 0;
      runningEndBellAudio.volume = nextVolume;
      await runningEndBellAudio.play();
      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          runningEndBellAudio.onended = null;
          resolve();
        };
        runningEndBellAudio.onended = finish;
        window.setTimeout(finish, Math.max(400, (runningEndBellAudio.duration || 0.45) * 1000 + 120));
      });
      if (index < 2) {
        await wait(120);
      }
    }
  } catch {}
}

function startRunningCompletionTransition({ fromPercent, toPercent, nextAction, nextOfNext, savedMinutes, summary }) {
  clearRunningCompletionTimers();
  state.runningCompletion.active = true;
  state.runningCompletion.phase = "celebration";
  state.runningCompletion.metric = "progress";
  state.runningCompletion.fromPercent = clampPercent(fromPercent);
  state.runningCompletion.toPercent = clampPercent(toPercent);
  state.runningCompletion.displayPercent = clampPercent(fromPercent);
  state.runningCompletion.label = "";
  state.runningCompletion.nextAction = buildTimelineEntrySnapshot(nextAction);
  state.runningCompletion.nextOfNext = buildTimelineEntrySnapshot(nextOfNext);
  state.runningCompletion.savedMinutes = Math.max(0, Math.round(Number(savedMinutes || 0)));
  state.runningCompletion.lateMinutes = Math.max(0, Math.round(Number(summary?.late || 0)));
  state.runningCompletion.progressValue = clampPercent(toPercent);
  renderRunningCompletionCelebration();
  void playRunningSuccessCue();
  animateRunningCompletionProgress(fromPercent, toPercent, RUNNING_COMPLETION_ANIMATION_MS);
  queueRunningCompletionTimeout(() => {
    if (state.runningCompletion.nextAction) {
      state.runningCompletion.phase = "next";
      renderHomeRunningTask();
      return;
    }
    resetRunningCompletionState();
    renderHomeRunningTask();
  }, RUNNING_COMPLETION_ANIMATION_MS + RUNNING_COMPLETION_HOLD_MS);
}

function primeRunningTrackBuffer() {
  if (!runningAudio) return;
  const track = getCurrentRunningTrack();
  if (!track?.url) return;
  if (runningAudio.src !== track.url) {
    runningAudio.src = track.url;
    runningAudio.load();
  }
}

function fadeAudioVolume(audio, target, durationMs) {
  if (!audio) return Promise.resolve();
  const start = Number(audio.volume ?? 1);
  const delta = target - start;
  if (Math.abs(delta) < 0.001 || durationMs <= 0) {
    audio.volume = Math.max(0, Math.min(1, target));
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const ratio = Math.max(0, Math.min(1, elapsed / durationMs));
      audio.volume = Math.max(0, Math.min(1, start + (delta * ratio)));
      if (ratio >= 1) {
        window.clearInterval(timer);
        resolve();
      }
    }, 40);
  });
}

function playRandomTouchClickSound() {
  if (!Array.isArray(touchClickAudioPool) || !touchClickAudioPool.length) {
    return;
  }
  const now = Date.now();
  if (now - lastTouchClickSoundAt < TOUCH_CLICK_SOUND_THROTTLE_MS) {
    return;
  }
  lastTouchClickSoundAt = now;
  const randomIndex = Math.floor(Math.random() * touchClickAudioPool.length);
  const audioPair = touchClickAudioPool[randomIndex] || [];
  const clickAudio = audioPair.find((audio) => audio.paused || audio.ended) || audioPair[0];
  if (!clickAudio) {
    return;
  }
  try {
    clickAudio.currentTime = 0;
    void clickAudio.play().catch(() => {});
  } catch {
    // ignore touch sound failures
  }
}

function playMissionProgressSound() {
  if (!Array.isArray(missionProgressAudioPool) || !missionProgressAudioPool.length) {
    return;
  }
  try {
    const missionAudio = missionProgressAudioPool.find((audio) => audio.paused || audio.ended) || missionProgressAudioPool[0];
    if (!missionAudio) {
      return;
    }
    missionAudio.currentTime = 0;
    void missionAudio.play().catch(() => {});
  } catch {
    // ignore mission progress sound failures
  }
}

function renderSleepMusicToggleState() {
  if (!sleepMusicToggleButton) {
    return;
  }
  const isActive = Boolean(state.sleepModal?.musicEnabled);
  const isLoading = Boolean(state.sleepModal?.musicLoading);
  const isDirectMode = String(state.sleepModal?.musicMode || "frequency") === "direct";
  sleepMusicToggleButton.classList.toggle("is-active", isActive);
  sleepMusicToggleButton.classList.toggle("is-direct", isActive && isDirectMode);
  sleepMusicToggleButton.classList.toggle("is-loading", isLoading);
  sleepMusicToggleButton.setAttribute(
    "aria-label",
    isActive
      ? (isDirectMode ? "Desativar trilha direta do sono" : "Desativar música da rádio Frequency")
      : "Ativar música do sono"
  );
}

function getSleepFrequencyStationFromList(stations) {
  return (Array.isArray(stations) ? stations : []).find((station) =>
    String(station?.name || "").trim().toLowerCase() === SLEEP_FREQUENCY_STATION_NAME.toLowerCase()
    && Array.isArray(station?.tracks)
    && station.tracks.some((track) => String(track?.url || "").trim())
  ) || null;
}

async function loadSleepFrequencyStation() {
  const existing = getSleepFrequencyStationFromList(state.runningPlayer?.stations);
  if (existing) {
    return existing;
  }
  try {
    const response = await fetch("/200/radio-stations.json", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      const station = getSleepFrequencyStationFromList(payload?.stations);
      if (station) {
        return station;
      }
    }
  } catch {
    // keep fallback path
  }
  try {
    const payload = await apiRequest("/api/200/music/stations", { skipGlobalLoading: true });
    return getSleepFrequencyStationFromList(payload?.stations);
  } catch {
    return null;
  }
}

function stopSleepFrequencyMonitor() {
  if (sleepFrequencyMonitorTicker) {
    window.clearInterval(sleepFrequencyMonitorTicker);
    sleepFrequencyMonitorTicker = null;
  }
}

async function stopSleepFrequencyPlayback({ keepEnabled = false } = {}) {
  sleepFrequencyFadeToken += 1;
  stopSleepFrequencyMonitor();
  if (sleepFrequencyAudio) {
    sleepFrequencyAudio.pause();
    sleepFrequencyAudio.currentTime = 0;
    sleepFrequencyAudio.removeAttribute("src");
    sleepFrequencyAudio.load();
    sleepFrequencyAudio.volume = 1;
  }
  state.sleepModal.fadeStarted = false;
  state.sleepModal.lastPhase = "";
  if (!keepEnabled) {
    state.sleepModal.musicEnabled = false;
    state.sleepModal.musicMode = "frequency";
  }
  state.sleepModal.musicLoading = false;
  renderSleepMusicToggleState();
}

async function playSleepFrequencyCurrentTrack() {
  if (!sleepFrequencyAudio || !state.sleepModal?.musicEnabled) {
    return false;
  }
  if (String(state.sleepModal?.musicMode || "frequency") === "direct") {
    sleepFrequencyAudio.loop = true;
    sleepFrequencyAudio.volume = 1;
    if (normalizeRunningTrackUrl(sleepFrequencyAudio.src || "") !== normalizeRunningTrackUrl(SLEEP_DIRECT_TRACK_URL)) {
      sleepFrequencyAudio.src = SLEEP_DIRECT_TRACK_URL;
    }
    try {
      await sleepFrequencyAudio.play();
      return true;
    } catch {
      return false;
    }
  }
  const station = await loadSleepFrequencyStation();
  const tracks = Array.isArray(station?.tracks) ? station.tracks.filter((track) => String(track?.url || "").trim()) : [];
  if (!tracks.length) {
    return false;
  }
  const trackIndex = ((Number(state.sleepModal?.musicTrackIndex || 0) % tracks.length) + tracks.length) % tracks.length;
  const track = tracks[trackIndex] || tracks[0];
  state.sleepModal.musicTrackIndex = trackIndex;
  sleepFrequencyAudio.loop = Boolean(state.sleepModal?.fadeStarted);
  sleepFrequencyAudio.volume = 1;
  if (normalizeRunningTrackUrl(sleepFrequencyAudio.src || "") !== normalizeRunningTrackUrl(track.url || "")) {
    sleepFrequencyAudio.src = String(track.url || "").trim();
  }
  try {
    await sleepFrequencyAudio.play();
    return true;
  } catch {
    return false;
  }
}

async function advanceSleepFrequencyTrack() {
  if (String(state.sleepModal?.musicMode || "frequency") === "direct") {
    return;
  }
  const station = await loadSleepFrequencyStation();
  const tracks = Array.isArray(station?.tracks) ? station.tracks.filter((track) => String(track?.url || "").trim()) : [];
  if (!tracks.length || !state.sleepModal?.musicEnabled) {
    return;
  }
  state.sleepModal.musicTrackIndex = (Number(state.sleepModal?.musicTrackIndex || 0) + 1) % tracks.length;
  await playSleepFrequencyCurrentTrack();
}

function startSleepFrequencyMonitor() {
  stopSleepFrequencyMonitor();
  sleepFrequencyMonitorTicker = window.setInterval(() => {
    void syncSleepFrequencyPlayback();
  }, 1000);
}

async function startSleepFrequencyFadeOut() {
  if (!sleepFrequencyAudio || sleepFrequencyAudio.paused || state.sleepModal.fadeStarted !== true) {
    return;
  }
  const fadeToken = ++sleepFrequencyFadeToken;
  sleepFrequencyAudio.loop = true;
  await fadeAudioVolume(sleepFrequencyAudio, 0, SLEEP_FREQUENCY_FADE_MS);
  if (fadeToken !== sleepFrequencyFadeToken) {
    return;
  }
  await stopSleepFrequencyPlayback();
}

async function syncSleepFrequencyPlayback() {
  renderSleepMusicToggleState();
  if (!state.sleepModal?.musicEnabled) {
    stopSleepFrequencyMonitor();
    return;
  }
  if (String(state.sleepModal?.musicMode || "frequency") === "direct") {
    stopSleepFrequencyMonitor();
    state.sleepModal.fadeStarted = false;
    state.sleepModal.lastPhase = "";
    await playSleepFrequencyCurrentTrack();
    return;
  }
  const session = getComputedSleepSessionSnapshot(state.sleepModal?.session);
  if (!session) {
    state.sleepModal.lastPhase = "";
    state.sleepModal.fadeStarted = false;
    if (!sleepModalElement?.classList.contains("active")) {
      await stopSleepFrequencyPlayback();
      return;
    }
    startSleepFrequencyMonitor();
    await playSleepFrequencyCurrentTrack();
    return;
  }
  startSleepFrequencyMonitor();
  const previousPhase = String(state.sleepModal?.lastPhase || "").trim();
  const currentPhase = String(session.phase || "").trim();
  state.sleepModal.lastPhase = currentPhase;
  if (currentPhase === "countdown") {
    state.sleepModal.fadeStarted = false;
    sleepFrequencyFadeToken += 1;
    await playSleepFrequencyCurrentTrack();
    return;
  }
  if (!state.sleepModal.fadeStarted) {
    await playSleepFrequencyCurrentTrack();
  }
  if (currentPhase === "sleeping" && (!state.sleepModal.fadeStarted || previousPhase !== "sleeping")) {
    state.sleepModal.fadeStarted = true;
    void startSleepFrequencyFadeOut();
  }
}

if (sleepFrequencyAudio) {
  sleepFrequencyAudio.preload = "auto";
  sleepFrequencyAudio.addEventListener("ended", () => {
    if (!state.sleepModal?.musicEnabled || state.sleepModal?.fadeStarted || String(state.sleepModal?.musicMode || "frequency") === "direct") {
      return;
    }
    void advanceSleepFrequencyTrack();
  });
}

function clearRunningMinuteCuePlayers() {
  runningMinuteCuePlayers.forEach((audio) => {
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {}
  });
  runningMinuteCuePlayers = [];
}

function clearRunningMinuteCueTimers() {
  if (state.runningMinuteCue.playTimer) {
    window.clearTimeout(state.runningMinuteCue.playTimer);
    state.runningMinuteCue.playTimer = 0;
  }
  if (state.runningMinuteCue.preloadTimer) {
    window.clearTimeout(state.runningMinuteCue.preloadTimer);
    state.runningMinuteCue.preloadTimer = 0;
  }
  state.runningMinuteCue.workerCue = null;
  try { runningMinuteCueWorker?.postMessage({ type: "cancel" }); } catch {}
}

function resetRunningMinuteCueState(actionId = "", optionKey = "") {
  clearRunningMinuteCueTimers();
  clearRunningMinuteCuePlayers();
  state.runningMinuteCue.actionId = String(actionId || "");
  state.runningMinuteCue.optionKey = String(optionKey || "");
  state.runningMinuteCue.played = new Set();
  state.runningMinuteCue.preparedKey = "";
}

async function playRunningMinuteCuePlayers(minute, taskTitle) {
  const players = [...runningMinuteCuePlayers];
  if (!players.length) return;
  const baseVolume = runningAudio ? Number(runningAudio.volume || 1) : 1;
  const shouldRestoreMusic = Boolean(runningAudio && !runningAudio.paused);
  try {
    if (shouldRestoreMusic) {
      await fadeAudioVolume(runningAudio, Math.max(0.1, baseVolume * 0.25), 700);
    }
    for (const audio of players) {
      if (state.runningMinuteCue.actionId === "") break;
      audio.currentTime = 0;
      await new Promise((resolve) => {
        const finish = () => resolve();
        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", finish, { once: true });
        audio.play().catch(finish);
      });
    }
  } finally {
    if (shouldRestoreMusic && runningAudio && !runningAudio.paused) {
      await fadeAudioVolume(runningAudio, baseVolume, 700);
    }
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.playbackState = runningAudio && !runningAudio.paused ? "playing" : "none"; } catch {}
    }
    clearRunningMinuteCuePlayers();
    state.runningMinuteCue.preparedKey = "";
  }
}

function prepareRunningMinuteCue(entry, actionId, taskTitle, secondsUntilCue) {
  const cueKey = `${actionId}:${entry.minute}`;
  if (state.runningMinuteCue.preparedKey !== cueKey) {
    clearRunningMinuteCuePlayers();
    runningMinuteCuePlayers = entry.urls.map((url) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.load();
      return audio;
    });
    state.runningMinuteCue.preparedKey = cueKey;
  }
  if (state.runningMinuteCue.playTimer) return;
  state.runningMinuteCue.playTimer = window.setTimeout(() => {
    state.runningMinuteCue.playTimer = 0;
    if (state.runningMinuteCue.actionId !== actionId || state.runningMinuteCue.played.has(entry.minute)) return;
    state.runningMinuteCue.played.add(entry.minute);
    void playRunningMinuteCuePlayers(entry.minute, taskTitle);
  }, Math.max(0, Math.round(secondsUntilCue * 1000)));
}

function scheduleRunningMinuteCueWorker(entry, actionId, taskTitle, secondsUntilCue) {
  if (!runningMinuteCueWorker) return false;
  const cueKey = `${actionId}:${entry.minute}`;
  if (state.runningMinuteCue.workerCue?.key === cueKey) return true;
  state.runningMinuteCue.workerCue = { key: cueKey, entry, actionId, taskTitle };
  runningMinuteCueWorker.postMessage({
    type: "schedule",
    key: cueKey,
    urls: entry.urls,
    preloadDelayMs: Math.max(0, Math.round((secondsUntilCue - MINUTE_CUE_PRELOAD_SECONDS) * 1000)),
    playDelayMs: Math.max(0, Math.round(Math.min(MINUTE_CUE_PRELOAD_SECONDS, secondsUntilCue) * 1000))
  });
  return true;
}

if (runningMinuteCueWorker) {
  runningMinuteCueWorker.addEventListener("message", (event) => {
    const payload = event.data || {};
    const workerCue = state.runningMinuteCue.workerCue;
    if (!workerCue || payload.key !== workerCue.key || state.runningMinuteCue.actionId !== workerCue.actionId) return;
    if (payload.type === "preload") {
      if (state.runningMinuteCue.preparedKey !== workerCue.key) {
        clearRunningMinuteCuePlayers();
        runningMinuteCuePlayers = workerCue.entry.urls.map((url) => {
          const audio = new Audio(url);
          audio.preload = "auto";
          audio.load();
          return audio;
        });
        state.runningMinuteCue.preparedKey = workerCue.key;
      }
      return;
    }
    if (payload.type === "play") {
      state.runningMinuteCue.workerCue = null;
      if (state.runningMinuteCue.played.has(workerCue.entry.minute)) return;
      state.runningMinuteCue.played.add(workerCue.entry.minute);
      void playRunningMinuteCuePlayers(workerCue.entry.minute, workerCue.taskTitle);
    }
  });
}

function stopRunningMinuteCueSchedule() {
  resetRunningMinuteCueState();
}

function syncRunningMinuteCueSchedule(actionId, taskTitle, remainingSeconds) {
  const interval = normalizeMinuteCueInterval(state.options.minuteNotificationInterval);
  const finalMinutesEnabled = Boolean(state.options.finalMinuteNotificationsEnabled);
  const optionKey = `${interval}:${finalMinutesEnabled ? 1 : 0}`;
  if (!actionId || (!interval && !finalMinutesEnabled)) {
    stopRunningMinuteCueSchedule();
    return;
  }
  if (state.runningMinuteCue.actionId !== actionId || state.runningMinuteCue.optionKey !== optionKey) {
    resetRunningMinuteCueState(actionId, optionKey);
  }
  const nextEntry = buildMinuteCueSchedule(remainingSeconds, interval, finalMinutesEnabled)
    .find((entry) => !state.runningMinuteCue.played.has(entry.minute));
  if (!nextEntry) return;
  const secondsUntilCue = Math.max(0, Number(remainingSeconds || 0) - nextEntry.remainingSeconds);
  const cueKey = `${actionId}:${nextEntry.minute}`;
  if (scheduleRunningMinuteCueWorker(nextEntry, actionId, taskTitle, secondsUntilCue)) {
    return;
  }
  if (secondsUntilCue > MINUTE_CUE_PRELOAD_SECONDS) {
    if (state.runningMinuteCue.preparedKey && state.runningMinuteCue.preparedKey !== cueKey) {
      clearRunningMinuteCuePlayers();
      state.runningMinuteCue.preparedKey = "";
    }
    if (!state.runningMinuteCue.preloadTimer) {
      state.runningMinuteCue.preloadTimer = window.setTimeout(() => {
        state.runningMinuteCue.preloadTimer = 0;
        if (isMissionRunModalOpen() && state.missionRun?.goalId) {
          renderMissionRunState();
        } else {
          renderHomeRunningTask();
        }
      }, Math.max(250, Math.round((secondsUntilCue - MINUTE_CUE_PRELOAD_SECONDS) * 1000)));
    }
    return;
  }
  if (state.runningMinuteCue.preloadTimer) {
    window.clearTimeout(state.runningMinuteCue.preloadTimer);
    state.runningMinuteCue.preloadTimer = 0;
  }
  prepareRunningMinuteCue(nextEntry, actionId, taskTitle, secondsUntilCue);
}

function getEarliestPendingAction() {
  return getVisibleActions()
    .filter((item) => normalizeActionStatus(item.status) === actionStatuses.pending)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] || null;
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

function anchorToCurrentActionOnce() {
  if (state.uiAnchors.actionsCurrentCentered || !actionsList) {
    return;
  }
  const runningAction = getRunningActionForSelectedProfile();
  const targetId = String(runningAction?.id || pendingActionsAnchorId || "").trim();
  if (!targetId) {
    return;
  }
  const row = actionsList.querySelector(`[data-action-id="${targetId}"]`);
  if (!row) {
    return;
  }
  state.uiAnchors.actionsCurrentCentered = true;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function anchorToCurrentAction() {
  if (!actionsList) {
    return;
  }
  const runningAction = getRunningActionForSelectedProfile();
  const targetId = String(runningAction?.id || pendingActionsAnchorId || "").trim();
  if (!targetId) {
    return;
  }
  const row = actionsList.querySelector(`[data-action-id="${targetId}"]`);
  if (!row) {
    return;
  }
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderHomeRunningTask() {
  const missionOwnsMinuteCueSchedule = isMissionRunModalOpen() && Boolean(state.missionRun?.goalId);
  const setHomeRunningSurfaceState = (isRunning) => {
    if (homeRunningSurfaceIcon) {
      homeRunningSurfaceIcon.src = isRunning ? homeRunningSurfaceActiveIconPath : homeRunningSurfaceIdleIconPath;
    }
    if (statsRunningSurfaceIcon) {
      statsRunningSurfaceIcon.src = isRunning ? homeRunningSurfaceActiveIconPath : homeRunningSurfaceIdleIconPath;
    }
    if (homeRunningSurfaceButton) {
      homeRunningSurfaceButton.setAttribute("aria-label", isRunning ? "Abrir atividade em andamento" : "Abrir andamento");
    }
    if (statsRunningSurfaceButton) {
      statsRunningSurfaceButton.setAttribute("aria-label", isRunning ? "Abrir atividade em andamento" : "Abrir andamento");
    }
  };
  if (!state.homeSnapshotReady) {
    setHomeRunningSurfaceState(false);
    setHomeRingPercent(0);
    if (homeRunningPercent) {
      homeRunningPercent.innerHTML = "";
    }
    if (homeRunningDatePrimary) {
      homeRunningDatePrimary.textContent = "";
    }
    if (homeRunningDateSecondary) {
      homeRunningDateSecondary.textContent = "";
    }
    setHomeTaskTitle("", false);
    if (homeRunningActions) {
      homeRunningActions.hidden = true;
    }
    if (homeProfileButton) {
      homeProfileButton.setAttribute("aria-label", "Carregando rotina");
    }
    return;
  }
  const syncHomeWidget = ({
    percent = 0,
    centerMarkup = "0%",
    ariaLabel = "Painel da rotina",
    primaryLine = "",
    secondaryLine = "",
    useCalendarDate = true
  } = {}) => {
    setHomeRingPercent(percent);
    if (homeRunningPercent) {
      homeRunningPercent.innerHTML = centerMarkup;
    }
    const now = new Date();
    if (homeRunningDatePrimary) {
      homeRunningDatePrimary.textContent = useCalendarDate ? formatHomeDeviceClock(now) : primaryLine;
    }
    if (homeRunningDateSecondary) {
      homeRunningDateSecondary.textContent = useCalendarDate ? formatHomeDeviceDate(now) : secondaryLine;
    }
    if (homeProfileButton) {
      homeProfileButton.setAttribute("aria-label", ariaLabel);
    }
  };
  if (state.runningCompletion.active) {
    syncHomeWidget({
      percent: state.runningCompletion.displayPercent,
      centerMarkup: formatRunningPercentMarkup(state.runningCompletion.displayPercent),
      ariaLabel: "Painel da rotina em conclusão"
    });
    if (state.runningCompletion.phase === "celebration") {
      renderRunningCompletionCelebration();
      return;
    }
    if (state.runningCompletion.phase === "next") {
      renderRunningCompletionNextView();
      return;
    }
  }
  setRunningCompletionVisualState(false);
  const action = getRunningActionForSelectedProfile();
  state.runningPlayer.currentTaskTitle = String(action?.title || "").trim();
  const runningActionId = String(action?.id || "").trim();
  if (runningActionId && state.runningPlayer.defaultAppliedActionId !== runningActionId) {
    applyRunningTaskDefaultSelection(action);
    state.runningPlayer.defaultAppliedActionId = runningActionId;
  }
  const hasRunning = Boolean(action);
  if (!runningTaskName || !runningTaskProgressRing || !runningTaskPercent || !runningTaskMinutesLeft || !runningTaskNextName) {
    return;
  }
  if (!hasRunning) {
    if (!missionOwnsMinuteCueSchedule) {
      stopRunningMinuteCueSchedule();
    }
    setHomeRunningSurfaceState(false);
    state.runningPlayer.defaultAppliedActionId = "";
    const now = new Date(getServerNowMs());
    const dayElapsedPercent = getDayElapsedPercent(now);
    const showIdlePercent = state.runningIdleCenterMode === "percent";
    const homeCenterMarkup = showIdlePercent
      ? formatRunningPercentMarkup(dayElapsedPercent)
      : formatRunningClockMarkup(now);
    runningTaskName.textContent = "";
    if (runningTaskCategoryIcon) {
      runningTaskCategoryIcon.hidden = true;
    }
    setRunningRingPercent(dayElapsedPercent);
    runningTaskPercent.innerHTML = homeCenterMarkup;
    runningTaskMinutesLeft.textContent = "";
    runningTaskMinutesLeft.classList.remove("is-bonus", "is-late", "is-early");
    setRunningIdleVisualState(true);
    updateRunningCenterModeButtons(showIdlePercent ? "percent" : "time");
    if (runningTaskNextLabel) {
      runningTaskNextLabel.classList.add("running-fade");
      runningTaskNextLabel.classList.remove("is-hidden");
    }
    if (runningTaskNextName) {
      const greeting = getRunningIdleGreeting(now);
      runningTaskNextName.textContent = greeting;
      runningTaskNextName.setAttribute("aria-label", greeting);
    }
    if (runningTaskNextTime) runningTaskNextTime.textContent = "";
    if (runningTaskActionsWrap) runningTaskActionsWrap.hidden = true;
    if (runningIdleHub) runningIdleHub.hidden = false;
    if (runningMiniPlayer) runningMiniPlayer.hidden = false;
    if (runningTaskHomeButton) runningTaskHomeButton.hidden = true;
    if (runningTaskQuickButton) runningTaskQuickButton.hidden = true;
    if (runningTaskListButton) runningTaskListButton.hidden = true;
    if (runningTaskMissionButton) runningTaskMissionButton.hidden = true;
    if (runningTaskMusicButton) runningTaskMusicButton.hidden = true;
    if (runningTaskFinalizeButton) runningTaskFinalizeButton.hidden = true;
    if (runningTaskRestoreButton) runningTaskRestoreButton.hidden = true;
    if (runningTaskGiveUpButton) runningTaskGiveUpButton.hidden = true;
    if (runningTaskStartNextButton) {
      runningTaskStartNextButton.hidden = true;
      runningTaskStartNextButton.dataset.actionId = "";
    }
    setHomeTaskTitle("", false);
    if (homeRunningActions) {
      homeRunningActions.hidden = true;
    }
    syncHomeWidget({
      percent: dayElapsedPercent,
      centerMarkup: homeCenterMarkup,
      ariaLabel: "Painel da rotina sem tarefa em andamento"
    });
    renderRunningMusicPlayer();
    return;
  }
  const { percent, percentPrecise, elapsedMinutes, durationMinutes, scheduleDeltaMinutes } = getRunningActionProgressState(action);
  setHomeRunningSurfaceState(true);
  if (state.runningEndBell.actionId !== runningActionId) {
    state.runningEndBell.actionId = runningActionId;
    state.runningEndBell.played = false;
  }
  applyRunningStationForCategory(action.categoryId);
  setRunningIdleVisualState(false);

  if (runningIdleHub) runningIdleHub.hidden = true;
  if (runningMiniPlayer) runningMiniPlayer.hidden = false;
  if (runningTaskNextLabel) {
    runningTaskNextLabel.classList.add("running-fade");
    runningTaskNextLabel.classList.remove("is-hidden");
  }
  const nextAction = getNextTimelineEntryForRunning(action);
  runningTaskName.innerHTML = formatRunningTaskTitleMarkup(action.title);
  if (runningTaskCategoryIcon) {
    runningTaskCategoryIcon.hidden = true;
  }
  setRunningRingPercent(percent);
  const remainingSeconds = Math.max(0, Math.round((durationMinutes - elapsedMinutes) * 60));
  const estimatedRemaining = Math.max(0, Math.ceil(remainingSeconds / 60));
  const showPercent = state.runningCenterMode === "percent"
    ? true
    : state.runningCenterMode === "time"
      ? false
      : false;
  const runningCenterMarkup = formatRunningCenter(percent, percentPrecise, estimatedRemaining, remainingSeconds, showPercent);
  runningTaskPercent.innerHTML = runningCenterMarkup;
  updateRunningCenterModeButtons(showPercent ? "percent" : "time");
  if (!missionOwnsMinuteCueSchedule) {
    syncRunningMinuteCueSchedule(String(action.id || ""), action.title, remainingSeconds);
  }
  if (remainingSeconds <= 0) {
    void playRunningEndBellCue(runningActionId);
    if (isQuickTaskAction(action) && !state.quickTaskAutoFinalizing) {
      state.quickTaskAutoFinalizing = true;
      void performRunningFinalize(action);
    }
  }
  const punctualitySummary = getCompletionSummaryForSelectedProfile();
  renderRunningStatusChip(punctualitySummary, scheduleDeltaMinutes);
  if (runningTaskActionsWrap) runningTaskActionsWrap.hidden = false;
  if (nextAction) {
    const nextLabel = nextAction.kind === "free"
      ? "Tempo livre"
      : formatActionTitleForDisplay(nextAction.title);
    setRunningNextDisplay(nextLabel, getActionDurationMinutes(nextAction));
    if (homeRunningDatePrimary) {
      homeRunningDatePrimary.textContent = "Próxima tarefa";
    }
    if (homeRunningDateSecondary) {
      homeRunningDateSecondary.textContent = nextLabel;
    }
  } else {
    setRunningNextDisplay("Sem próxima tarefa", 0);
    if (homeRunningDatePrimary) {
      homeRunningDatePrimary.textContent = "Próxima tarefa";
    }
    if (homeRunningDateSecondary) {
      homeRunningDateSecondary.textContent = "Sem próxima tarefa";
    }
  }
  setHomeTaskTitle(formatActionTitleForDisplay(action.title), true);
  if (homeRunningActions) {
    homeRunningActions.hidden = false;
  }
  if (runningTaskListButton) runningTaskListButton.hidden = false;
  if (runningTaskMissionButton) runningTaskMissionButton.hidden = false;
  if (runningTaskHomeButton) runningTaskHomeButton.hidden = true;
  if (runningTaskQuickButton) runningTaskQuickButton.hidden = true;
  if (runningTaskMusicButton) runningTaskMusicButton.hidden = false;
  if (runningTaskFinalizeButton) runningTaskFinalizeButton.hidden = false;
  if (runningTaskRestoreButton) runningTaskRestoreButton.hidden = false;
  if (runningTaskStartNextButton) {
    runningTaskStartNextButton.hidden = true;
  }
  syncHomeWidget({
    percent,
    centerMarkup: runningCenterMarkup,
    ariaLabel: `${formatActionTitleForDisplay(action.title)} em andamento`,
    primaryLine: "Próxima tarefa",
    secondaryLine: nextAction
      ? (nextAction.kind === "free" ? "Tempo livre" : formatActionTitleForDisplay(nextAction.title))
      : "Sem próxima tarefa",
    useCalendarDate: false
  });
  renderRunningMusicPlayer();
}

async function loadRunningMusicStations() {
  const previousTrackUrl = String(getCurrentRunningTrack()?.url || "").trim();
  const previousStationName = String(getCurrentRunningStation()?.name || "").trim();
  const fallbackStations = Object.entries(runningMusicStationSeeds).map(([name, files]) => {
    if (name === "Energy") {
      return {
        name,
        tracks: [
          {
            name: "Energy 03",
            url: "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/De%20repente%20m%C3%A3e/3%20minutes.m4a"
          },
          {
            name: "Energy 05",
            url: "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/De%20repente%20m%C3%A3e/5%20minutes.m4a"
          },
          {
            name: "Energy 10",
            url: "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/De%20repente%20m%C3%A3e/10%20minutes.m4a"
          }
        ]
      };
    }
    const prefix = name;
    return {
      name,
      tracks: files.map((fileName, index) => ({
        name: `${prefix} ${String(index + 1).padStart(2, "0")}`,
        url: `https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/Music/${encodeURIComponent(name)}/${encodeURIComponent(fileName)}`
      }))
    };
  });

  state.runningPlayer.stations = fallbackStations;
  state.runningPlayer.stationsLoaded = true;
  state.runningPlayer.favoriteTrackUrls = new Set();
  state.runningPlayer.defaultPreferenceByTaskTitle = new Map();
  ensureRunningStationHasTracks(previousStationName);
  syncRunningMusicOrder({ preserveTrackUrl: previousTrackUrl });
  renderRunningMusicPlayer();
  if (runningMusicListModal?.classList.contains("active")) renderRunningMusicList();
  revealInitialHomeIfReady();
  try {
    const radioResponse = await fetch("/200/radio-stations.json", { cache: "no-store" });
    if (radioResponse.ok) {
      const radioData = await radioResponse.json();
      const radioStations = Array.isArray(radioData?.stations) ? radioData.stations : [];
      const validLocalStations = radioStations.filter((s) => Array.isArray(s?.tracks) && s.tracks.length > 0);
      if (validLocalStations.length) {
        state.runningPlayer.stations = validLocalStations;
      }
    }
  } catch {
    // keep fallback stations
  }

  try {
    const payload = await apiRequest("/api/200/music/stations");
    const stations = Array.isArray(payload?.stations) ? payload.stations : [];
    const validStations = stations.filter((s) => Array.isArray(s?.tracks) && s.tracks.length > 0);
    if (validStations.length) {
      state.runningPlayer.stations = validStations;
    }
  } catch {
    // keep local/fallback stations
  }
  const preferredStationIndex = previousStationName
    ? state.runningPlayer.stations.findIndex((station) => String(station?.name || "").trim() === previousStationName)
    : -1;
  if (preferredStationIndex >= 0) {
    state.runningPlayer.stationIndex = preferredStationIndex;
  } else {
    state.runningPlayer.stationIndex = 0;
  }
  ensureRunningStationHasTracks(previousStationName);
  syncRunningMusicOrder({ preserveTrackUrl: previousTrackUrl });

  try {
    const payload = await apiRequest("/api/200/music/stations");
    const stations = Array.isArray(payload?.stations) ? payload.stations : [];
    const validStations = stations.filter((s) => Array.isArray(s?.tracks) && s.tracks.length > 0);
    if (validStations.length) {
      state.runningPlayer.stations = validStations;
      state.runningPlayer.favoriteTrackUrls = new Set(Array.isArray(payload?.preferences?.favoriteTrackUrls) ? payload.preferences.favoriteTrackUrls : []);
      state.runningPlayer.defaultPreferenceByTaskTitle = buildRunningDefaultPreferenceMap(payload?.preferences);
      const refreshedStationIndex = previousStationName
        ? state.runningPlayer.stations.findIndex((station) => String(station?.name || "").trim() === previousStationName)
        : -1;
      state.runningPlayer.stationIndex = refreshedStationIndex >= 0 ? refreshedStationIndex : 0;
      ensureRunningStationHasTracks(previousStationName);
      syncRunningMusicOrder({ preserveTrackUrl: previousTrackUrl });
    }
  } catch {
    // keep local/fallback stations
  }

  renderRunningMusicPlayer();
  applyRunningTaskDefaultSelection();
  primeRunningTrackBuffer();
}

function getCurrentRunningStation() {
  return state.runningPlayer.stations[state.runningPlayer.stationIndex] || null;
}

function getFirstRunningStationWithTracksIndex() {
  return state.runningPlayer.stations.findIndex((station) =>
    Array.isArray(station?.tracks) && station.tracks.some((track) => String(track?.url || "").trim())
  );
}

function ensureRunningStationHasTracks(preferredStationName = "") {
  const stations = Array.isArray(state.runningPlayer.stations) ? state.runningPlayer.stations : [];
  if (!stations.length) {
    state.runningPlayer.stationIndex = 0;
    return null;
  }

  const currentIndex = Number.isFinite(state.runningPlayer.stationIndex) ? state.runningPlayer.stationIndex : 0;
  const currentStation = stations[currentIndex] || null;
  const currentHasTracks = Array.isArray(currentStation?.tracks) && currentStation.tracks.some((track) => String(track?.url || "").trim());
  if (currentHasTracks) {
    state.runningPlayer.stationIndex = currentIndex;
    return currentStation;
  }

  const preferredName = String(preferredStationName || "").trim();
  if (preferredName) {
    const preferredIndex = stations.findIndex((station) =>
      String(station?.name || "").trim() === preferredName
      && Array.isArray(station?.tracks)
      && station.tracks.some((track) => String(track?.url || "").trim())
    );
    if (preferredIndex >= 0) {
      state.runningPlayer.stationIndex = preferredIndex;
      return stations[preferredIndex];
    }
  }

  const fallbackIndex = getFirstRunningStationWithTracksIndex();
  if (fallbackIndex >= 0) {
    state.runningPlayer.stationIndex = fallbackIndex;
    return stations[fallbackIndex];
  }

  state.runningPlayer.stationIndex = 0;
  return stations[0] || null;
}

function getRunningFavoriteSet() {
  return state.runningPlayer.favoriteTrackUrls instanceof Set
    ? state.runningPlayer.favoriteTrackUrls
    : new Set();
}

function getRunningHiddenTrackSet() {
  return state.runningPlayer.hiddenTrackUrls instanceof Set
    ? state.runningPlayer.hiddenTrackUrls
    : new Set();
}

function buildRunningDefaultPreferenceMap(preferences = {}) {
  const defaults = Array.isArray(preferences?.defaults)
    ? preferences.defaults
    : Object.entries(preferences?.defaultTrackByTaskTitle || {}).map(([taskTitle, value]) => {
      if (value && typeof value === "object") {
        return { taskTitle, ...value };
      }
      return { taskTitle, mode: "track", trackUrl: value };
    });
  return new Map(defaults
    .map((item) => {
      const taskTitle = String(item?.taskTitle || "").trim();
      const mode = String(item?.mode || "track").trim() === "station" ? "station" : "track";
      const stationName = String(item?.stationName || "").trim();
      const trackName = String(item?.trackName || "").trim();
      const trackUrl = String(item?.trackUrl || "").trim();
      if (!taskTitle) {
        return null;
      }
      if (mode === "station" && !stationName) {
        return null;
      }
      if (mode === "track" && !trackUrl) {
        return null;
      }
      return [taskTitle, { mode, stationName, trackName, trackUrl }];
    })
    .filter(Boolean));
}

function getRunningDefaultPreferenceForTaskTitle(taskTitle = "") {
  const safeTaskTitle = String(taskTitle || "").trim();
  if (!safeTaskTitle) {
    return null;
  }
  const map = state.runningPlayer.defaultPreferenceByTaskTitle;
  if (!(map instanceof Map)) {
    return null;
  }
  return map.get(safeTaskTitle) || null;
}

function getRunningDefaultPreferenceForCurrentTask() {
  return getRunningDefaultPreferenceForTaskTitle(getRunningMusicTargetTaskTitle());
}

function getRunningMusicTargetTaskTitle() {
  if (state.runningPlayer.configurationMode) {
    return String(state.runningPlayer.configurationTaskTitle || "").trim();
  }
  return String(state.runningPlayer.currentTaskTitle || "").trim();
}

function applyRunningTaskDefaultSelection(action = getRunningActionForSelectedProfile()) {
  const taskTitle = String(action?.title || state.runningPlayer.currentTaskTitle || "").trim();
  const preference = getRunningDefaultPreferenceForTaskTitle(taskTitle);
  if (!preference || !Array.isArray(state.runningPlayer.stations) || !state.runningPlayer.stations.length) {
    return;
  }

  if (preference.mode === "station") {
    const stationIndex = state.runningPlayer.stations.findIndex((station) => String(station?.name || "").trim() === preference.stationName);
    if (stationIndex >= 0) {
      state.runningPlayer.stationIndex = stationIndex;
      syncRunningMusicOrder({ preserveTrackUrl: "" });
    }
    return;
  }

  const stationIndex = state.runningPlayer.stations.findIndex((station) =>
    Array.isArray(station?.tracks) && station.tracks.some((track) => String(track?.url || "").trim() === preference.trackUrl)
  );
  if (stationIndex >= 0) {
    state.runningPlayer.stationIndex = stationIndex;
    syncRunningMusicOrder({ preserveTrackUrl: preference.trackUrl });
  }
}

function getRunningDisplayedTracks(station = getCurrentRunningStation()) {
  const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
  const favoriteSet = getRunningFavoriteSet();
  const hiddenSet = getRunningHiddenTrackSet();
  return [...tracks].sort((left, right) => {
    const leftHidden = hiddenSet.has(String(left?.url || "").trim());
    const rightHidden = hiddenSet.has(String(right?.url || "").trim());
    if (leftHidden !== rightHidden) {
      return leftHidden ? 1 : -1;
    }
    const leftFavorite = favoriteSet.has(String(left?.url || "").trim());
    const rightFavorite = favoriteSet.has(String(right?.url || "").trim());
    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1;
    }
    return String(left?.name || "").localeCompare(String(right?.name || ""), "pt-BR");
  });
}

function shuffleRunningTracks(tracks) {
  const list = [...tracks];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function buildRunningPlayOrder(station = getCurrentRunningStation()) {
  const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
  const favoriteSet = getRunningFavoriteSet();
  const hiddenSet = getRunningHiddenTrackSet();
  const visibleTracks = tracks.filter((track) => !hiddenSet.has(String(track?.url || "").trim()));
  const favorites = visibleTracks.filter((track) => favoriteSet.has(String(track?.url || "").trim()));
  const others = visibleTracks.filter((track) => !favoriteSet.has(String(track?.url || "").trim()));

  if (!visibleTracks.length) {
    return [];
  }

  if (!state.runningPlayer.shuffleEnabled) {
    return visibleTracks.map((track) => String(track?.url || "").trim()).filter(Boolean);
  }

  const shuffledFavorites = shuffleRunningTracks(favorites);
  const shuffledOthers = shuffleRunningTracks(others);
  const playOrder = [];
  let favoriteIndex = 0;
  let otherIndex = 0;

  while (favoriteIndex < shuffledFavorites.length || otherIndex < shuffledOthers.length) {
    if (favoriteIndex < shuffledFavorites.length) {
      playOrder.push(shuffledFavorites[favoriteIndex++]);
    }
    if (otherIndex < shuffledOthers.length) {
      playOrder.push(shuffledOthers[otherIndex++]);
    }
  }

  if (!playOrder.length) {
    playOrder.push(...visibleTracks);
  }

  return playOrder.map((track) => String(track?.url || "").trim()).filter(Boolean);
}

function syncRunningMusicOrder({ preserveTrackUrl = "" } = {}) {
  const station = getCurrentRunningStation();
  const orderedUrls = buildRunningPlayOrder(station);
  state.runningPlayer.playOrderUrls = orderedUrls;

  const currentTrackUrl = String(preserveTrackUrl || getCurrentRunningTrack()?.url || orderedUrls[0] || "").trim();
  const nextIndex = orderedUrls.findIndex((url) => url === currentTrackUrl);
  state.runningPlayer.playOrderIndex = nextIndex >= 0 ? nextIndex : 0;
}

function normalizeRunningTrackUrl(url = "") {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) {
    return "";
  }
  try {
    return new URL(safeUrl, window.location.origin).href;
  } catch {
    return safeUrl;
  }
}

function findRunningTrackByUrl(trackUrl = "", preferredStation = null) {
  const normalizedTargetUrl = normalizeRunningTrackUrl(trackUrl);
  if (!normalizedTargetUrl) {
    return null;
  }

  const candidateStations = [];
  if (preferredStation) {
    candidateStations.push(preferredStation);
  }
  candidateStations.push(...(Array.isArray(state.runningPlayer.stations) ? state.runningPlayer.stations : []).filter((station) => station !== preferredStation));

  for (const station of candidateStations) {
    const tracks = Array.isArray(station?.tracks) ? station.tracks : [];
    const track = tracks.find((item) => normalizeRunningTrackUrl(item?.url) === normalizedTargetUrl);
    if (track) {
      return { station, track };
    }
  }

  return null;
}

function getRunningPlaybackState() {
  const station = getCurrentRunningStation();
  const currentTrack = getCurrentRunningTrack();
  const audioUrl = normalizeRunningTrackUrl(runningAudio?.currentSrc || runningAudio?.src || "");
  const match = findRunningTrackByUrl(audioUrl, station);
  return {
    station: match?.station || station,
    track: match?.track || currentTrack || station?.tracks?.[0] || null,
    audioUrl
  };
}

function getCurrentRunningTrack() {
  const station = getCurrentRunningStation();
  const orderedUrls = Array.isArray(state.runningPlayer.playOrderUrls) ? state.runningPlayer.playOrderUrls : [];
  const currentUrl = String(orderedUrls[state.runningPlayer.playOrderIndex] || orderedUrls[0] || "").trim();
  if (!station || !Array.isArray(station.tracks) || !station.tracks.length) return null;
  if (!currentUrl) {
    return station.tracks[0];
  }
  return station.tracks.find((track) => String(track?.url || "").trim() === currentUrl) || station.tracks[0];
}

function isRunningTrackFavorite(track) {
  return getRunningFavoriteSet().has(String(track?.url || "").trim());
}

function isRunningTrackHidden(track) {
  return getRunningHiddenTrackSet().has(String(track?.url || "").trim());
}

function isRunningTrackDefaultForCurrentTask(track) {
  const preference = getRunningDefaultPreferenceForCurrentTask();
  if (!preference || preference.mode !== "track") {
    return false;
  }
  return String(preference.trackUrl || "").trim() === String(track?.url || "").trim();
}

function isRunningStationDefaultForCurrentTask(station = getCurrentRunningStation()) {
  const preference = getRunningDefaultPreferenceForCurrentTask();
  if (!preference || preference.mode !== "station") {
    return false;
  }
  return String(preference.stationName || "").trim() === String(station?.name || "").trim();
}

function renderRunningMusicPlayer() {
  const playback = getRunningPlaybackState();
  const station = playback.station || getCurrentRunningStation();
  const track = playback.track || station?.tracks?.[0] || null;
  const stationIsDefault = isRunningStationDefaultForCurrentTask(station);
  const orderedUrls = Array.isArray(state.runningPlayer.playOrderUrls) ? state.runningPlayer.playOrderUrls : [];
  const hasTrackNavigation = orderedUrls.length > 1;
  const isPlaying = Boolean(runningAudio && !runningAudio.paused && track?.url && normalizeRunningTrackUrl(runningAudio.currentSrc || runningAudio.src || "") === normalizeRunningTrackUrl(track.url));

  if (runningPlayerStation) {
    runningPlayerStation.textContent = String(station?.name || "Carregando rádios");
  }

  if (runningPlayerTrack) {
    runningPlayerTrack.textContent = String(track?.name || "");
  }

  if (runningPlayerTitleButton) {
    runningPlayerTitleButton.classList.toggle("is-empty", !track);
  }

  const trackIsFavorite = Boolean(track && isRunningTrackFavorite(track));
  const trackIsDefault = Boolean(track && isRunningTrackDefaultForCurrentTask(track));
  const hasAnyDefault = trackIsDefault || stationIsDefault;

  runningPlayerRepeat?.classList.toggle("active", isPlaying);
  runningPlayerRepeat?.classList.toggle("is-playing", isPlaying);
  runningPlayerRepeat?.classList.toggle("is-disabled", !track?.url);
  runningPlayerRepeat?.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproduzir música");
  if (runningPlayerRepeat) {
    runningPlayerRepeat.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" fill="currentColor"/></svg>';
  }
  runningPlayerFavorite?.classList.toggle("active", trackIsFavorite);
  runningPlayerFavorite?.classList.toggle("is-favorite", trackIsFavorite);
  runningPlayerDefault?.classList.toggle("active", hasAnyDefault);
  runningPlayerDefault?.classList.toggle("is-default", hasAnyDefault);
  runningPlayerFavorite?.classList.toggle("is-disabled", !track?.url);
  runningPlayerDefault?.classList.toggle("is-disabled", !station?.name || !getRunningMusicTargetTaskTitle());
  runningPlayerPrev?.classList.toggle("is-disabled", !hasTrackNavigation);
  runningPlayerNext?.classList.toggle("is-disabled", !hasTrackNavigation);

  if (runningMusicListStation) {
    runningMusicListStation.textContent = String(station?.name || "Estação");
  }

  if (runningMusicListModal?.classList.contains("active")) {
    renderRunningMusicList();
  }
}

function ensureRunningAudioLoopState() {
  if (runningAudio) {
    runningAudio.loop = Boolean(state.runningPlayer.repeatEnabled);
  }
}

async function playRunningTrack(trackUrl = "") {
  const station = getCurrentRunningStation();
  const orderedUrls = Array.isArray(state.runningPlayer.playOrderUrls) ? state.runningPlayer.playOrderUrls : [];
  const targetUrl = String(trackUrl || orderedUrls[state.runningPlayer.playOrderIndex] || orderedUrls[0] || "").trim();
  const track = station?.tracks?.find((item) => String(item?.url || "").trim() === targetUrl) || null;
  if (!runningAudio || !track?.url) return;
  cancelMissionRunMusicFade();

  const nextIndex = orderedUrls.findIndex((url) => url === targetUrl);
  if (nextIndex >= 0) {
    state.runningPlayer.playOrderIndex = nextIndex;
  }

  runningAudio.src = track.url;
  ensureRunningAudioLoopState();
  try {
    await runningAudio.play();
    state.runningPlayer.isPlaying = true;
    renderRunningMusicPlayer();
    renderRunningMusicList();
  } catch {}
}

async function toggleRunningPlayPause() {
  if (!runningAudio) return;
  const track = getRunningPlaybackState().track || getCurrentRunningTrack();
  if (!track?.url) return;
  if (!runningAudio.src || normalizeRunningTrackUrl(runningAudio.src) !== normalizeRunningTrackUrl(track.url)) {
    await playRunningTrack(track.url);
    return;
  }
  if (runningAudio.paused) {
    try {
      cancelMissionRunMusicFade();
      ensureRunningAudioLoopState();
      await runningAudio.play();
      state.runningPlayer.isPlaying = true;
      renderRunningMusicPlayer();
      renderRunningMusicList();
    } catch {}
    return;
  }
  runningAudio.pause();
  state.runningPlayer.isPlaying = false;
  renderRunningMusicPlayer();
  renderRunningMusicList();
}

function ensureRunningAudioOnTouch() {
  if (state.runningPlayer.isPlaying) return;
  const hasTrack = Boolean(getCurrentRunningTrack()?.url);
  if (!hasTrack) return;
  void playRunningTrack();
}

async function moveRunningTrack(delta) {
  const orderedUrls = Array.isArray(state.runningPlayer.playOrderUrls) ? state.runningPlayer.playOrderUrls : [];
  if (!orderedUrls.length) return;
  const len = orderedUrls.length;
  state.runningPlayer.playOrderIndex = (state.runningPlayer.playOrderIndex + delta + len) % len;
  await playRunningTrack(orderedUrls[state.runningPlayer.playOrderIndex]);
}

async function moveRunningStation(delta) {
  const len = state.runningPlayer.stations.length;
  if (!len) return;
  const currentTrackUrl = String(getCurrentRunningTrack()?.url || "").trim();
  state.runningPlayer.stationIndex = (state.runningPlayer.stationIndex + delta + len) % len;
  syncRunningMusicOrder({ preserveTrackUrl: "" });
  const currentStation = getCurrentRunningStation();
  const firstUrl = String(currentStation?.tracks?.[0]?.url || "").trim();
  await playRunningTrack(currentTrackUrl && currentStation?.tracks?.some((track) => String(track?.url || "").trim() === currentTrackUrl)
    ? currentTrackUrl
    : firstUrl);
}

function renderRunningMusicList() {
  if (!runningMusicListItems) {
    return;
  }

  const station = ensureRunningStationHasTracks();
  const track = getRunningPlaybackState().track || getCurrentRunningTrack();
  const tracks = getRunningDisplayedTracks(station);
  const preference = getRunningDefaultPreferenceForCurrentTask();
  const defaultTrackUrl = preference?.mode === "track" ? String(preference.trackUrl || "").trim() : "";
  const defaultStationName = preference?.mode === "station" ? String(preference.stationName || "").trim() : "";

  if (!tracks.length) {
    runningMusicListItems.innerHTML = '<div class="empty-state">Nenhuma música disponível nesta estação.</div>';
    return;
  }

  runningMusicListItems.innerHTML = tracks.map((item) => {
    const isCurrent = Boolean(track && String(track.url || "").trim() === String(item.url || "").trim());
    const isFavorite = isRunningTrackFavorite(item);
    const isHidden = isRunningTrackHidden(item);
    const isLooping = Boolean(isCurrent && state.runningPlayer.repeatEnabled);
    const isDefault = Boolean(
      (defaultTrackUrl && String(item.url || "").trim() === defaultTrackUrl)
      || (defaultStationName && String(station?.name || "").trim() === defaultStationName)
    );
    return `
      <div class="running-music-track-row${isCurrent ? " is-current" : ""}${isFavorite ? " is-favorite" : ""}${isDefault ? " is-default" : ""}${isLooping ? " is-looping" : ""}${isHidden ? " is-hidden-track" : ""}" role="button" tabindex="0" data-track-url="${escapeHtml(String(item.url || ""))}" data-track-name="${escapeHtml(String(item.name || ""))}" data-track-station="${escapeHtml(String(station?.name || ""))}">
        <span class="running-music-track-waveform" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </span>
        <span class="running-music-track-main">
          <strong>${escapeHtml(String(item.name || "Faixa"))}</strong>
          <span>${escapeHtml(String(station?.name || "Estação"))}</span>
        </span>
        <span class="running-music-track-actions">
          <button class="running-music-track-hide" type="button" data-hide-track="${escapeHtml(String(item.url || ""))}" aria-label="${isHidden ? "Mostrar música" : "Ocultar música"}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <button class="running-music-track-loop" type="button" data-loop-track="${escapeHtml(String(item.url || ""))}" aria-label="${isLooping ? "Desativar repetição" : "Repetir música"}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 17H7l2.6 2.6L8.2 21 3 15.8 8.2 10.6l1.4 1.4L7 14h10a3 3 0 0 0 0-6h-1V6h1a5 5 0 0 1 0 10ZM7 7h10l-2.6-2.6L15.8 3 21 8.2 15.8 13.4l-1.4-1.4L17 10H7a3 3 0 0 0 0 6h1v2H7a5 5 0 0 1 0-10Z" fill="currentColor"/></svg>
          </button>
          <svg class="running-music-track-heart" viewBox="0 0 24 24"><path d="M12 21.35 10.55 20C5.4 15.4 2 12.4 2 8.5A5.5 5.5 0 0 1 7.5 3C9.24 3 10.92 3.81 12 5.08 13.08 3.81 14.76 3 16.5 3A5.5 5.5 0 0 1 22 8.5c0 3.9-3.4 6.9-8.55 11.5z"/></svg>
        </span>
      </div>
    `;
  }).join("");

  runningMusicListItems.querySelectorAll(".running-music-track-row").forEach((button) => {
    button.querySelector(".running-music-track-hide")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const trackUrl = String(event.currentTarget?.getAttribute("data-hide-track") || "").trim();
      if (!trackUrl) {
        return;
      }
      await toggleRunningTrackHidden(trackUrl);
    });
    button.querySelector(".running-music-track-loop")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const trackUrl = String(event.currentTarget?.getAttribute("data-loop-track") || "").trim();
      if (!trackUrl) {
        return;
      }
      await toggleRunningTrackLoop(trackUrl);
    });
    button.addEventListener("click", async () => {
      const trackUrl = String(button.dataset.trackUrl || "").trim();
      if (!trackUrl) {
        return;
      }
      if (getRunningHiddenTrackSet().has(trackUrl)) {
        return;
      }
      const stationName = String(button.dataset.trackStation || "").trim();
      const currentStation = getCurrentRunningStation();
      const targetStation = currentStation && String(currentStation.name || "").trim() === stationName ? currentStation : null;
      const targetTrack = targetStation?.tracks?.find((item) => String(item?.url || "").trim() === trackUrl) || null;
      if (!targetTrack) {
        return;
      }
      state.runningPlayer.playOrderUrls = buildRunningPlayOrder(targetStation);
      state.runningPlayer.playOrderIndex = Math.max(0, state.runningPlayer.playOrderUrls.findIndex((url) => url === trackUrl));
      await playRunningTrack(trackUrl);
      renderRunningMusicPlayer();
    });
    button.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      button.click();
    });
  });

  if (!state.uiAnchors.runningMusicCentered) {
    const currentRow = runningMusicListItems.querySelector(".running-music-track-row.is-current");
    if (currentRow) {
      state.uiAnchors.runningMusicCentered = true;
      currentRow.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
}

async function openRunningMusicListModal() {
  if (!runningMusicListModal) {
    return;
  }
  if (runningMusicListModal.parentElement !== document.body) document.body.appendChild(runningMusicListModal);
  runningMusicListModal.style.zIndex = "2400";
  runningMusicListModal.classList.add("active");
  runningMusicListModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("running-music-list-open");
  if (!runningTaskModalElement?.classList.contains("active") && !document.getElementById("missionRunModal")?.classList.contains("active")) {
    document.body.classList.add("running-music-standalone");
  }
  updateRunningPlayerOverlayState();
  if (!state.runningPlayer.stationsLoaded
    || !Array.isArray(state.runningPlayer.stations)
    || state.runningPlayer.stations.length < 2) {
    runningMusicListItems.innerHTML = '<div class="empty-state">Carregando estações...</div>';
    try {
      await loadRunningMusicStations();
    } catch {
      // Keep the modal open and let the empty state render below if loading fails.
    }
  }
  ensureRunningStationHasTracks();
  renderRunningMusicPlayer();
  renderRunningMusicList();
  updateRunningPlayerOverlayState();
}

function closeRunningMusicListModal() {
  if (!runningMusicListModal) {
    return;
  }
  runningMusicListModal.classList.remove("active");
  runningMusicListModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("running-music-list-open");
  document.body.classList.remove("running-music-standalone");
  updateRunningPlayerOverlayState();
}

async function toggleRunningTrackFavorite() {
  const track = getCurrentRunningTrack();
  const station = getCurrentRunningStation();
  if (!track?.url || !station) {
    return;
  }

  const favorite = !isRunningTrackFavorite(track);
  try {
    const payload = await apiRequest("/api/200/music/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stationName: station.name,
        trackName: track.name,
        trackUrl: track.url,
        favorite
      })
    });

    state.runningPlayer.favoriteTrackUrls = new Set(Array.isArray(payload?.preferences?.favoriteTrackUrls) ? payload.preferences.favoriteTrackUrls : []);
    syncRunningMusicOrder({ preserveTrackUrl: track.url });
    renderRunningMusicPlayer();
    renderRunningMusicList();
    if (favorite) {
      showFloatingNotice("Música adicionada aos favoritos.");
    } else {
      showFloatingNotice("Música removida dos favoritos.");
    }
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel salvar favorito.");
  }
}

async function toggleRunningTrackHidden(trackUrl) {
  const safeTrackUrl = String(trackUrl || "").trim();
  if (!safeTrackUrl) {
    return;
  }

  const hiddenSet = new Set(getRunningHiddenTrackSet());
  const shouldHide = !hiddenSet.has(safeTrackUrl);
  if (shouldHide) {
    hiddenSet.add(safeTrackUrl);
  } else {
    hiddenSet.delete(safeTrackUrl);
  }
  state.runningPlayer.hiddenTrackUrls = hiddenSet;

  const currentTrackUrl = String(getCurrentRunningTrack()?.url || "").trim();
  syncRunningMusicOrder({ preserveTrackUrl: shouldHide && currentTrackUrl === safeTrackUrl ? "" : currentTrackUrl });
  renderRunningMusicPlayer();
  renderRunningMusicList();

  if (shouldHide && currentTrackUrl === safeTrackUrl) {
    const nextTrackUrl = String(state.runningPlayer.playOrderUrls[state.runningPlayer.playOrderIndex] || "").trim();
    if (nextTrackUrl) {
      await playRunningTrack(nextTrackUrl);
    } else if (runningAudio) {
      runningAudio.pause();
      state.runningPlayer.isPlaying = false;
      renderRunningMusicPlayer();
    }
  } else {
    primeRunningTrackBuffer();
  }
}

async function toggleRunningTrackLoop(trackUrl = "") {
  const safeTrackUrl = String(trackUrl || "").trim();
  if (!safeTrackUrl) {
    return;
  }
  const currentTrackUrl = String(getCurrentRunningTrack()?.url || "").trim();
  if (currentTrackUrl !== safeTrackUrl) {
    state.runningPlayer.playOrderUrls = buildRunningPlayOrder(getCurrentRunningStation());
    state.runningPlayer.playOrderIndex = Math.max(0, state.runningPlayer.playOrderUrls.findIndex((url) => url === safeTrackUrl));
    await playRunningTrack(safeTrackUrl);
  }
  state.runningPlayer.repeatEnabled = !(state.runningPlayer.repeatEnabled && String(getCurrentRunningTrack()?.url || "").trim() === safeTrackUrl);
  ensureRunningAudioLoopState();
  renderRunningMusicPlayer();
  renderRunningMusicList();
}

function openRunningMusicDefaultModal() {
  const track = getCurrentRunningTrack();
  const station = getCurrentRunningStation();
  const taskTitle = getRunningMusicTargetTaskTitle();

  if (!station?.name) {
    return;
  }

  if (!taskTitle) {
    showFloatingNotice("Abra uma tarefa em andamento para definir o padrão.");
    return;
  }

  if (runningMusicDefaultStationName) {
    runningMusicDefaultStationName.textContent = String(station.name || "Estação");
  }
  if (runningMusicDefaultTrackName) {
    runningMusicDefaultTrackName.textContent = String(track?.name || "Música atual");
  }
  if (runningMusicDefaultStationHint) {
    runningMusicDefaultStationHint.innerHTML = `estação padrão para<br>${escapeHtml(taskTitle)}`;
  }
  if (runningMusicDefaultTrackHint) {
    runningMusicDefaultTrackHint.innerHTML = `música padrão para<br>${escapeHtml(taskTitle)}`;
  }

  closeModal("runningMusicDefaultChoiceModal");
  openModal("runningMusicDefaultModal");
}

function openRunningMusicDefaultChoiceModal() {
  const station = getCurrentRunningStation();
  const preference = getRunningDefaultPreferenceForCurrentTask();
  const taskTitle = getRunningMusicTargetTaskTitle();

  if (!station?.name || !preference || !taskTitle) {
    openRunningMusicDefaultModal();
    return;
  }

  if (runningMusicDefaultChoiceCopy) {
    runningMusicDefaultChoiceCopy.innerHTML = preference.mode === "station"
      ? `Padrão salvo: estação <strong>${escapeHtml(preference.stationName || "Estação")}</strong><br>para ${escapeHtml(taskTitle)}`
      : `Padrão salvo: música <strong>${escapeHtml(preference.trackName || "Música")}</strong><br>para ${escapeHtml(taskTitle)}`;
  }

  openModal("runningMusicDefaultChoiceModal");
}

async function executeRunningTaskDefaultPreference() {
  const preference = getRunningDefaultPreferenceForCurrentTask();
  if (!preference) {
    openRunningMusicDefaultModal();
    return;
  }

  let nextStationIndex = -1;
  let targetTrackUrl = "";

  if (preference.mode === "station") {
    nextStationIndex = state.runningPlayer.stations.findIndex((station) => String(station?.name || "").trim() === String(preference.stationName || "").trim());
  } else {
    nextStationIndex = state.runningPlayer.stations.findIndex((station) =>
      Array.isArray(station?.tracks) && station.tracks.some((track) => String(track?.url || "").trim() === String(preference.trackUrl || "").trim())
    );
    targetTrackUrl = String(preference.trackUrl || "").trim();
  }

  if (nextStationIndex < 0) {
    showFloatingNotice("Nao encontrei o padrão salvo para esta tarefa.");
    return;
  }

  state.runningPlayer.stationIndex = nextStationIndex;
  syncRunningMusicOrder({ preserveTrackUrl: targetTrackUrl });
  const station = getCurrentRunningStation();
  const fallbackTrackUrl = String(station?.tracks?.[0]?.url || "").trim();
  const finalTrackUrl = targetTrackUrl || fallbackTrackUrl;
  renderRunningMusicPlayer();
  renderRunningMusicList();
  closeModal("runningMusicDefaultChoiceModal");
  if (finalTrackUrl) {
    await playRunningTrack(finalTrackUrl);
  } else {
    primeRunningTrackBuffer();
  }
}

async function autoPlayRunningTaskDefaultPreference(action) {
  const taskTitle = String(action?.title || "").trim();
  if (!taskTitle) {
    return;
  }
  state.runningPlayer.currentTaskTitle = taskTitle;
  const preference = getRunningDefaultPreferenceForTaskTitle(taskTitle);
  if (!preference) {
    return;
  }
  if (!Array.isArray(state.runningPlayer.stations) || !state.runningPlayer.stations.length) {
    await loadRunningMusicStations();
  }
  await executeRunningTaskDefaultPreference();
}

async function saveRunningTaskDefault(mode = "track") {
  const track = getCurrentRunningTrack();
  const station = getCurrentRunningStation();
  const taskTitle = getRunningMusicTargetTaskTitle();

  if (!station?.name) {
    return;
  }

  if (!taskTitle) {
    showFloatingNotice("Abra uma tarefa em andamento para definir o padrão.");
    return;
  }

  const safeMode = mode === "station" ? "station" : "track";
  if (safeMode === "track" && !track?.url) {
    showFloatingNotice("Escolha uma música válida.");
    return;
  }

  try {
    const payload = await apiRequest("/api/200/music/default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: safeMode,
        taskTitle,
        stationName: station.name,
        trackName: safeMode === "track" ? track?.name : "",
        trackUrl: safeMode === "track" ? track?.url : ""
      })
    });

    state.runningPlayer.defaultPreferenceByTaskTitle = buildRunningDefaultPreferenceMap(payload?.preferences);
    if (state.runningPlayer.configurationMode && isTaskComposerMode()) renderTaskComposerModal();
    renderRunningMusicPlayer();
    renderRunningMusicList();
    closeRunningMusicListModal();
    closeModal("runningMusicDefaultModal");
    closeModal("runningMusicDefaultChoiceModal");
    state.runningPlayer.configurationMode = false;
    state.runningPlayer.configurationTaskTitle = "";
    showFloatingNotice(safeMode === "station" ? "Estação definida como padrão." : "Música definida como padrão.");
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Nao foi possivel salvar o padrão.");
  }
}

function getActionStoredCompletionPercent(action) {
  const status = normalizeActionStatus(action?.status);
  if (status === actionStatuses.completed) return 100;
  if (status !== actionStatuses.paused) return 0;
  return Math.max(0, Math.min(100, Math.trunc(Number(action?.completionPercent || 0) || 0)));
}

function getCompletionSummaryForSelectedProfile() {
  const list = getVisibleActions();
  const totalMinutes = list.reduce((sum, item) => sum + getActionDurationMinutes(item), 0);
  const completedMinutes = list.reduce((sum, item) => {
    if (isGivenUpAction(item)) {
      return sum;
    }
    return sum + (getActionDurationMinutes(item) * (getActionStoredCompletionPercent(item) / 100));
  }, 0);
  const percentPrecise = totalMinutes > 0 ? clampPercent((completedMinutes / totalMinutes) * 100) : 0;
  const percent = Math.round(percentPrecise);
  const nowMs = getServerNowMs();
  const dueActions = list.filter((item) => {
    if (isGivenUpAction(item)) {
      return false;
    }
    const endAtMs = new Date(item.endAt).getTime();
    return Number.isFinite(endAtMs) && endAtMs <= nowMs;
  });
  const expectedDueMinutes = dueActions.reduce((sum, item) => sum + getActionDurationMinutes(item), 0);
  const completedDueMinutes = dueActions.reduce((sum, item) => {
    return sum + (getActionDurationMinutes(item) * (getActionStoredCompletionPercent(item) / 100));
  }, 0);
  const late = Math.max(0, expectedDueMinutes - completedDueMinutes);
  const punctualityPrecise = expectedDueMinutes > 0
    ? clampPercent((completedDueMinutes / expectedDueMinutes) * 100)
    : 100;
  const punctualityPercent = Math.round(punctualityPrecise);
  return {
    percent,
    percentPrecise,
    late,
    completedMinutes,
    totalMinutes,
    expectedDueMinutes,
    completedDueMinutes,
    punctualityPrecise,
    punctualityPercent
  };
}

function isSameDate(a, b) {
  return toLocalDateKey(a) === toLocalDateKey(b);
}

function formatDateLabel(date) {
  if (isSameDate(date, todayStart())) {
    return "Hoje";
  }
  const parts = getProjectDateTimeParts(date);
  const monthIndex = Math.max(0, Math.min(11, Number(parts.month) - 1));
  return `${Number(parts.day)} ${monthLabels[monthIndex]}`;
}

function capitalizeFirstLetter(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatHomeCalendarDate(date = new Date()) {
  return capitalizeFirstLetter(new Intl.DateTimeFormat("pt-BR", {
    timeZone: projectTimeZone,
    day: "numeric",
    month: "long"
  }).format(date));
}

function formatHomeWeekdayLabel(date = new Date()) {
  return capitalizeFirstLetter(new Intl.DateTimeFormat("pt-BR", {
    timeZone: projectTimeZone,
    weekday: "long"
  }).format(date));
}

function formatHomeDeviceClock(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatHomeDeviceDate(date = new Date()) {
  return capitalizeFirstLetter(new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  }).format(date));
}

function syncHomeDeviceClock() {
  if (homePlayTime) {
    homePlayTime.textContent = formatHomeDeviceClock(new Date());
  }
  if (!homeRunningDatePrimary || !homeRunningDateSecondary || !state.homeSnapshotReady) {
    return;
  }
  if (state.runningCompletion.active || getRunningActionForSelectedProfile()) {
    return;
  }
  const now = new Date();
  homeRunningDatePrimary.textContent = formatHomeDeviceClock(now);
  homeRunningDateSecondary.textContent = formatHomeDeviceDate(now);
}

function startHomeDeviceClock() {
  syncHomeDeviceClock();
  if (homeDeviceClockTimer) {
    window.clearInterval(homeDeviceClockTimer);
  }
  homeDeviceClockTimer = window.setInterval(syncHomeDeviceClock, 1000);
}

function formatHistoryDateLabel(date) {
  if (isSameDate(date, todayStart())) {
    return "Hoje";
  }
  return `${String(date.getDate()).padStart(2, "0")} ${monthLabels[date.getMonth()]}`;
}

function getMissionHistoryScope() {
  return missionHistoryScopes[state.missionHistoryScopeIndex] || missionHistoryScopes[0];
}

function isMissionHistoryRangeActive() {
  return getMissionHistoryScope().key !== "today";
}

function renderMissionScopeControls() {
  const scope = getMissionHistoryScope();
  if (missionScopeLabel) {
    missionScopeLabel.textContent = scope.label;
  }
  if (missionScopePrevButton) {
    missionScopePrevButton.disabled = state.missionHistoryScopeIndex <= 0;
  }
  if (missionScopeNextButton) {
    missionScopeNextButton.disabled = state.missionHistoryScopeIndex >= missionHistoryScopes.length - 1;
  }
}

function toLocalDateKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return getProjectDateKey(value);
}

function formatTime(value) {
  const parts = getProjectDateTimeParts(value);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function formatHourChip(value) {
  const parts = getProjectDateTimeParts(value);
  return `${parts.hour}h${String(parts.minute).padStart(2, "0")}`;
}

function formatMinutesHuman(totalMinutesValue) {
  const total = Math.max(0, Math.round(Number(totalMinutesValue) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `${total} min`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
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
    window.clearTimeout(runningTaskTicker);
  }
  runningTaskTicker = window.setTimeout(function tickRunningTask() {
    renderHomeRunningTask();
    runningTaskTicker = window.setTimeout(tickRunningTask, 250);
  }, 250);
}

function formatMoney(cents) {
  return moneyFormatter.format(Number(cents || 0) / 100);
}

function normalizeActionStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === actionStatuses.inProgress) {
    return actionStatuses.inProgress;
  }

  if (normalized === actionStatuses.paused) {
    return actionStatuses.paused;
  }

  if (normalized === actionStatuses.completed) {
    return actionStatuses.completed;
  }

  return actionStatuses.pending;
}

function normalizeAssigneeName(value) {
  const input = String(value || "").trim();

  if (!input) {
    return getDefaultProfileName();
  }
  if (input.toLowerCase() === "geral") {
    return getDefaultProfileName();
  }
  const found = getProfileByName(input);
  return found?.name || getDefaultProfileName();
}

function getWizardAssigneeName() {
  return normalizeAssigneeName(state.selectedProfile || getDefaultProfileName());
}

function getSelectedProfileName() {
  return normalizeAssigneeName(state.selectedProfile || getDefaultProfileName());
}

function getProjectTodayDateKey() {
  return getProjectDateKey(new Date(getServerNowMs()));
}

function getStatsAvatarPath(assignee) {
  const globalProfile = getStatsGlobalProfileByName(assignee);
  if (globalProfile) {
    return getProfileAvatarPath(globalProfile);
  }
  return getActionAvatarPath(assignee);
}

function getActionAvatarPath(assignee) {
  return getProfileAvatarPath(assignee);
}

function isBlackBackgroundThemeActive() {
  return getBackgroundThemeMode(state.options.backgroundTheme).key === "black";
}

function getActionDisplayIcon(action) {
  if (isBlackBackgroundThemeActive()) {
    const assignee = String(action?.assignee || state.selectedProfile || getDefaultProfileName()).trim();
    return {
      src: getActionAvatarPath(assignee),
      alt: assignee ? `Foto de ${assignee}` : "Foto do usuario",
      categoryIcon: false
    };
  }
  const svgIconUrl = String(action?.svgIconUrl || "").trim();
  if (svgIconUrl) {
    return {
      src: svgIconUrl,
      alt: String(action?.svgIconLabel || action?.title || "Ícone da tarefa"),
      categoryIcon: true
    };
  }
  return {
    src: defaultTaskSvgPath,
    alt: "Ícone padrão da tarefa",
    categoryIcon: true
  };
}

function getMissionDisplayIcon(goal) {
  const svgIconUrl = String(goal?.svgIconUrl || "").trim();
  if (svgIconUrl) {
    return {
      src: svgIconUrl,
      alt: String(goal?.svgIconLabel || goal?.title || "Ícone da missão"),
      categoryIcon: true
    };
  }
  return {
    src: defaultMissionSvgPath,
    alt: String(goal?.title || "Ícone da missão"),
    categoryIcon: true
  };
}

function getTaskCategoryIconPath(categoryId) {
  const normalized = normalizeTaskCategoryId(categoryId);
  return taskCategoryMap.get(normalized)?.icon || taskCategoryMap.get("aspecto")?.icon || "";
}

function buildTaskAvatarMarkup(src, alt, options = {}) {
  const safeSrc = String(src || "").trim();
  const safeAlt = escapeHtml(alt || "");
  const categoryClass = options.categoryIcon ? " task-avatar-category" : "";
  return `<img class="task-avatar${categoryClass}" src="${safeSrc}" alt="${safeAlt}" loading="lazy" />`;
}

function getTaskCategoryName(categoryId) {
  const normalized = normalizeTaskCategoryId(categoryId);
  return taskCategoryMap.get(normalized)?.name || "Aspecto";
}

function normalizeTaskCategoryId(categoryId) {
  const normalized = String(categoryId || "").trim().toLowerCase();
  if (taskCategoryMap.has(normalized)) return normalized;
  return legacyTaskCategoryMap.get(normalized) || "aspecto";
}

function getActionThemeDotColor(action, options = {}) {
  const delayMinutes = Math.max(0, Number(options.delayMinutes || 0));
  const status = normalizeActionStatus(action?.status);
  const categoryId = String(action?.categoryId || "").trim().toLowerCase();
  const categoryColors = {
    sono: "#6d5dfc",
    alimentacao: "#d97706",
    hidratacao: "#1683ff",
    aprendizado: "#4f46e5",
    trabalho: "#0f766e",
    casa: "#059669",
    lazer: "#ec4899",
    exercicios: "#ef4444",
    social: "#f97316",
    planejamento: "#db2777",
    higiene: "#0ea5e9",
    aspecto: "#64748b"
  };

  if (status === actionStatuses.inProgress) return "#19bf5d";
  if (status === actionStatuses.paused) return "#2f7dff";
  if (status === actionStatuses.completed) return "#16a34a";
  if (isGivenUpAction(action)) return "#4b5563";
  if (delayMinutes >= 60) return "#dc2626";
  if (delayMinutes >= 30) return "#dc2626";
  if (delayMinutes >= 15) return "#f97316";
  if (delayMinutes > 0) return "#eab308";
  return categoryColors[categoryId] || "#64748b";
}

function buildActionTitleMarkup(title, dotColor = "", isBlinking = false) {
  const safeTitle = escapeHtml(formatActionTitleForDisplay(title));
  const safeDotColor = escapeHtml(String(dotColor || "").trim() || "#64748b");
  const dotMarkup = isBlackBackgroundThemeActive()
    ? ""
    : `<span class="task-status-dot${isBlinking ? " is-blinking" : ""}" style="--task-dot-color:${safeDotColor};" aria-hidden="true"></span>`;
  return `${dotMarkup}<span class="task-title-text">${safeTitle}</span>`;
}

function getStationNameForCategory(categoryId) {
  const id = String(categoryId || "").trim().toLowerCase();
  if (id === "sono") {
    return "Frequency";
  }
  if (id === "exercicios" || id === "casa") {
    return "Energy";
  }
  return "";
}

function applyRunningStationForCategory(categoryId) {
  void categoryId;
}

function buildDateWithTime(date, hour, minute) {
  const parts = getProjectDateTimeParts(date);
  return makeProjectZonedDate(Number(parts.year), Number(parts.month), Number(parts.day), hour, minute, 0);
}

function startOfDayIso(date) {
  const parts = getProjectDateTimeParts(date);
  return makeProjectZonedDate(Number(parts.year), Number(parts.month), Number(parts.day), 0, 0, 0).toISOString();
}

function nextDayIso(date) {
  return projectDateKeyToDate(addDaysToDateKey(getProjectDateKey(date), 1)).toISOString();
}

function buildInitialWizardState() {
  const now = new Date();
  const rounded = new Date(now.getTime() + 10 * 60 * 1000);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 5) * 5, 0, 0);

  const end = new Date(rounded.getTime() + 15 * 60 * 1000);

  return {
    step: 1,
    inlineEditStep: 0,
    returnToStartDecision: false,
    returnMode: "none",
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
    categoryId: "aspecto",
    categoryName: "Aspecto",
    svgIconUrl: "",
    svgIconLabel: "",
    editingActionId: null,
    replaceOverlaps: false
  };
}

function normalizeRepeatMode(mode) {
  if (mode === "custom") {
    return "weekly";
  }
  if (mode === "daily" || mode === "weekly" || mode === "periodic" || mode === "monthly_custom" || mode === "none") {
    return mode;
  }
  return "none";
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

  return runWithGlobalLoading(async () => {
    const response = await fetch(getApiUrl(path), {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const requestError = new Error(payload?.error || "Falha na requisicao.");
      requestError.code = String(payload?.code || "").trim();
      requestError.overlaps = Array.isArray(payload?.overlaps) ? payload.overlaps : [];
      requestError.runningAction = payload?.runningAction || null;
      throw requestError;
    }

    return payload;
  }, {
    path,
    iconSrc: options.loadingIcon || "",
    skipGlobalLoading: options.skipGlobalLoading === true
  });
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
  if (id !== "runningConfirmModal" && runningConfirmModal?.classList.contains("active")) {
    closeRunningConfirmModal();
  }
  if (["runningTaskModal", "actionsModal"].includes(id) && startConflictModal?.classList.contains("active")) {
    closeStartConflictModal("cancel");
  }
  const modal = document.getElementById(id);

  if (!modal) {
    return;
  }

  if (modalNavigationStack[modalNavigationStack.length - 1] !== id) {
    modalNavigationStack.push(id);
  }

  modal.classList.add("active");
  modal.classList.remove("is-fading-out");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (id === "actionsModal") {
    const runningAction = getRunningActionForSelectedProfile();
    const latestDone = getLatestCompletedActionForSelectedProfile();
    pendingActionsAnchorId = runningAction?.id || latestDone?.id || "";
    state.actionsMissionOnly = false;
    renderActions();
    void loadActions();
    void loadActionMissions();
    window.setTimeout(() => {
      anchorToCurrentActionOnce();
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

  if (id === "sleepModal") {
    startSleepModalTicker();
    renderSleepModalState();
  }

  if (id === "financeModal") {
    startFinancePresentation();
  }

  if (id === "profileRenameModal") {
    if (profileRenameMessage) {
      profileRenameMessage.textContent = "";
    }
    window.setTimeout(() => profileRenameInput?.focus(), 40);
  }

  if (id === "constitutionModal") {
    void loadConstitution();
  }

  if (id === "optionsModal") {
    renderOptionsModal();
  }

  if (id === "project200ExportModal") {
    resetProject200ExportModal();
    window.setTimeout(() => project200ExportUsernameInput?.focus(), 40);
  }

  if (id === "historyModal") {
    void (async () => {
      await loadMissions();
      renderMissions();
    })();
  }

  if (id === "runningTaskModal") {
    if (!getRunningActionForSelectedProfile()) {
      state.runningIdleCenterMode = "time";
    }
    setRunningHomeVisibility(false);
    void loadMissions();
    if (!state.homeSnapshotReady) {
      void ensureRunningSurfaceSnapshot();
    }
    startRunningTaskTicker();
    renderHomeRunningTask();
  }

  updateRunningPlayerOverlayState();
}

function closeModal(modal) {
  if (typeof modal === "string") {
    modal = document.getElementById(modal);
  }
  if (!modal) {
    return;
  }

  const wasActive = modal.classList.contains("active");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  const stackIndex = modalNavigationStack.lastIndexOf(modal.id);
  if (stackIndex === modalNavigationStack.length - 1) {
    modalNavigationStack.pop();
  }
  if (modal.id === "actionWizard") {
    closeWizard();
    return;
  }
  if (modal.id === "platformWizard") {
    closePlatformWizard();
    return;
  }

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
    document.body.classList.remove("task-starting");
  }

  if (modal.id === "historyModal") {
    closeHistoryTextComposer();
  }

  if (modal.id === "profileAvatarModal") {
    resetProfileAvatarModal();
    profileAvatarTargetId = "";
  }
  if (modal.id === "project200ExportModal") {
    resetProject200ExportModal();
  }
  if (modal.id === "calendarModal") {
    closeFinanceEntryConfirm(false);
  }
  if (modal.id === "runningTaskModal") {
    closeModal("runningMissionQuickModal");
    closeRunningMusicListModal();
    setRunningHomeVisibility(true);
  }
  if (modal.id === "runningMissionQuickModal") {
    resetRunningMissionQuickSpotlight();
    clearRunningMissionQuickFeedbackTimer();
    resetRunningMissionQuickFocusState();
    if (runningMissionQuickFeedback) {
      runningMissionQuickFeedback.textContent = "";
    }
  }
  if (modal.id === "missionRunModal") {
    if (wasActive && (!state.missionRun.completedSuccessfully || state.options.stopMusicOnFinish)) {
      fadeOutRunningMusicAfterMissionClose();
    }
    stopMissionRunTicker();
    stopMissionRunAlarm();
    stopMissionRunCueAudio();
    stopMissionRunCycleAudio();
    stopRunningMinuteCueSchedule();
    if (missionRunVariantSelectionTimer) {
      window.clearTimeout(missionRunVariantSelectionTimer);
      missionRunVariantSelectionTimer = null;
    }
    restoreRunningPlayerAfterMission();
    state.runningPlayer.currentTaskTitle = String(state.missionRun.previousTaskTitle || "").trim();
    state.missionRun.goalId = "";
    state.missionRun.startedAtMs = 0;
    state.missionRun.durationMs = 0;
    state.missionRun.centerMode = "time";
    state.missionRun.previousTaskTitle = "";
    state.missionRun.alarmStarted = false;
    state.missionRun.finalizing = false;
    state.missionRun.completedSuccessfully = false;
    state.missionRun.selectedVariantId = "";
    state.missionRun.selectedVariantIds = [];
    state.missionRun.availableVariants = [];
    state.missionRun.cycleTarget = 1;
    state.missionRun.cycleIndex = 1;
    state.missionRun.completedCycles = 0;
    state.missionRun.transitioningCycle = false;
    state.missionRun.preloadedDailyRanking = null;
    state.missionRun.rankingPreloadStarted = false;
    state.missionRun.announcedCueSeconds = [];
    state.missionRun.previousRemainingSeconds = null;
    if (missionRunConfirm) {
      missionRunConfirm.hidden = true;
    }
    if (missionRunFinishChoice) {
      missionRunFinishChoice.hidden = true;
    }
    if (missionRunStatus) {
      missionRunStatus.textContent = "";
    }
    if (missionRunRingFill) {
      missionRunRingFill.style.strokeDashoffset = "301.59";
    }
  }
  if (modal.id === "missionVariantsModal" && missionVariantsTicker) {
    window.clearInterval(missionVariantsTicker);
    missionVariantsTicker = null;
  }
  if (modal.id === "runningConfirmModal") {
    state.runningConfirm.action = null;
    state.runningConfirm.pauseAction = null;
    if (runningConfirmPauseButton) runningConfirmPauseButton.hidden = true;
    document.body.classList.remove("running-confirm-open", "running-confirm-from-actions");
  }
  if (modal.id === "startConflictModal") {
    document.body.classList.remove("start-conflict-open", "task-starting");
  }
  if (modal.id === "quickTaskModal") {
    document.body.classList.remove("quick-task-open");
  }
  if (modal.id === "sleepModal") {
    stopSleepModalTicker();
    state.sleepModal.controlsVisible = false;
    if (!state.sleepModal?.session) {
      void stopSleepFrequencyPlayback();
    } else if (state.sleepModal?.musicEnabled) {
      void syncSleepFrequencyPlayback();
    }
    renderSleepModalState();
  }
  if (modal.id === "socialModal") {
    state.social.inviteComposerOpen = false;
    state.social.loading = false;
    document.body.classList.remove("social-modal-loading");
    renderSocialModal();
  }
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
    if (!modalBackNavigationActive) {
      modalNavigationStack.length = 0;
    }
  }
  updateRunningPlayerOverlayState();
}

function navigateToProjectHome() {
  modalBackNavigationActive = true;
  try {

    if (actionCategoryModal?.classList.contains("active")) {
      actionCategoryModal.classList.remove("active");
      actionCategoryModal.setAttribute("aria-hidden", "true");
    }
    if (actionWizard?.classList.contains("active")) closeWizard();
    if (platformWizard?.classList.contains("active")) closePlatformWizard();
    if (actionStatusWizard?.classList.contains("active")) closeActionStatusWizard();
    if (profileManageOverlay?.classList.contains("active")) closeProfileManageOverlay();
    const activeModals = [...document.querySelectorAll(".workspace-modal.active")].reverse();
    activeModals.forEach((modal) => {
      if (modal.id === "startConflictModal") {
        closeStartConflictModal("cancel");
      } else if (modal.id === "startDecisionModal") {
        closeStartDecisionModalWith("cancel");
      } else if (modal.id === "runningConfirmModal") {
        closeRunningConfirmModal();
      } else {
        closeModal(modal);
      }
    });
  } finally {
    modalBackNavigationActive = false;
    modalNavigationStack.length = 0;
    document.body.classList.remove("modal-open", "start-decision-open", "start-conflict-open", "task-starting", "running-confirm-open", "running-confirm-from-actions", "quick-task-open");
  }
  openPrimaryRunningSurface();
}

function isDirectProjectHomeButton(button) {
  if (!button) return false;
  const label = String(button.getAttribute("aria-label") || "").trim().toLowerCase();
  if (label.includes("home")) return true;
  const homePath = button.querySelector('svg path[d^="M3 11"]');
  return Boolean(homePath);
}

function isProjectHomeVisible() {
  const hasWorkspaceModal = Boolean(document.querySelector(".workspace-modal.active"));
  const hasProfileManageOverlay = profileManageOverlay?.classList.contains("active");
  const hasLoginOverlay = project200LoginOverlay?.classList.contains("active");
  return !hasWorkspaceModal && !hasProfileManageOverlay && !hasLoginOverlay;
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

  showDbLoadingState(constitutionMessage, 84);
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
  financeSalesLabel.textContent = `Entradas (${periodLabel})`;
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
    if (financeNotesInput) {
      financeNotesInput.value = "";
      financeNotesInput.disabled = true;
    }
    if (saveFinanceNotesButton) {
      saveFinanceNotesButton.disabled = true;
    }
    financeStatus.innerHTML = 'Entre para ver seu financeiro. <a href="/log?next=/200">Entrar</a>';
    return;
  }

  if (financeNotesInput) {
    financeNotesInput.disabled = true;
  }
  if (saveFinanceNotesButton) {
    saveFinanceNotesButton.disabled = true;
  }
  showDbLoadingState(financeStatus, 84);
  setFinanceSalesTitle(selectedPeriod.label);

  try {
    const payload = await apiRequest(`/api/200/finance/personal?period=${encodeURIComponent(selectedPeriod.key)}`);
    const summary = payload.summary || {};
    const periodLabel = String(summary.periodLabel || selectedPeriod.label || "").trim() || "Total";

    setFinanceSalesTitle(periodLabel);
    financePeriodLabel.textContent = periodLabel;
    if (financeEntriesLabel) {
      financeEntriesLabel.textContent = "Lancamentos";
    }
    if (financeBalanceLabel) {
      financeBalanceLabel.textContent = "Saldo atual";
    }
    financeTotalSales.textContent = formatMoney(summary.incomeCents || 0);
    financeSubscribers.textContent = String(summary.totalEntries || 0);
    financeMonthlyRevenue.textContent = formatMoney(summary.balanceCents || 0);
    financeDashboard.hidden = false;
    financeStatus.textContent = "";
    if (financeNotesInput) {
      financeNotesInput.value = String(payload?.notes?.notes || "");
      financeNotesInput.disabled = false;
    }
    if (saveFinanceNotesButton) {
      saveFinanceNotesButton.disabled = false;
    }
  } catch (error) {
    financeDashboard.hidden = true;
    financeStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel carregar as financas.";
  }
}

async function saveFinanceNotes() {
  if (!getToken()) {
    financeStatus.textContent = "Entre para salvar suas anotacoes.";
    return;
  }
  if (saveFinanceNotesButton) {
    saveFinanceNotesButton.disabled = true;
  }
  financeStatus.textContent = "Salvando anotacoes...";
  try {
    const payload = await apiRequest("/api/200/finance/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: String(financeNotesInput?.value || "")
      })
    });
    if (financeNotesInput) {
      financeNotesInput.value = String(payload?.notes?.notes || "");
    }
    financeStatus.textContent = "Anotacoes salvas.";
  } catch (error) {
    financeStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar anotacoes.";
  } finally {
    if (saveFinanceNotesButton) {
      saveFinanceNotesButton.disabled = false;
    }
  }
}

function renderDateHeader() {
  activeDateLabel.textContent = formatDateLabel(dateFromOffset(state.activeOffset));
}

function renderActions() {
  actionsList.innerHTML = "";
  actionsAuthAlert.hidden = Boolean(getToken());
  renderActionsMissionFilter();

  if (!getToken()) {
    actionsProgress.hidden = true;
    actionsList.innerHTML = '<div class="empty-state">A agenda fica salva quando voce entra na conta.</div>';
    return;
  }

  const missionMode = normalizeMissionActionsMode(state.options.missionActionsMode);
  const missionEntries = buildActionMissionTimelineEntries();
  const actionEntries = buildActionTimelineEntries();
  const timelineEntries = (state.actionsMissionOnly
    ? missionEntries
    : missionMode === "show" ? [...actionEntries, ...missionEntries] : actionEntries)
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  if (!timelineEntries.length) {
    actionsList.innerHTML = state.actionsMissionOnly
      ? '<div class="empty-state">Todas as missões do dia foram concluídas.</div>'
      : '<div class="empty-state">Sem tarefas nesse dia.</div>';
  }

  timelineEntries.forEach((action) => {
    const slotOwner = state.selectedProfile;
    const slotAvatar = getActionAvatarPath(slotOwner);
    if (action.kind === "mission") {
      const delayMinutes = getPendingDelayMinutes(action);
      const cleanPendingClass = delayMinutes <= 0 ? " task-pending-clean" : "";
      const row = document.createElement("article");
      row.className = `task-row task-mission-entry${getDelayClassByMinutes(delayMinutes)}${cleanPendingClass}`;
      if (delayMinutes > 0 && delayMinutes <= 15) {
        row.style.setProperty("--delay-soft-rgb", getDelaySoftRgbByMinutes(delayMinutes));
      }
      row.dataset.actionMissionGoalId = String(action.goalId || "");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      const missionIcon = getMissionDisplayIcon(action.goal);
      row.innerHTML = `
        ${buildTaskAvatarMarkup(missionIcon.src, missionIcon.alt, { categoryIcon: true })}
        <div class="task-main">
          <div class="task-title">${buildActionTitleMarkup(action.title, getActionThemeDotColor(action, { delayMinutes }), false)}</div>
          <div class="task-assignee task-duration">${escapeHtml(formatActionMissionDuration(action.goal))}</div>
        </div>
        <div class="task-time" aria-hidden="true"></div>
      `;
      actionsList.appendChild(row);
      return;
    }
    if (action.kind === "free") {
      const duration = getActionDurationMinutes(action);
      const ended = getServerNowMs() >= new Date(action.endAt).getTime();
      const dotColor = ended ? "#94a3b8" : "#64748b";
      const row = document.createElement("article");
      row.className = `task-row task-free-slot${ended ? " task-free-expired" : ""}`;
      row.dataset.freeSlot = "1";
      row.dataset.startIso = action.startAt;
      row.dataset.endIso = action.endAt;
      row.innerHTML = `
        <img class="task-avatar" src="${slotAvatar}" alt="Tempo livre" loading="lazy" />
        <div class="task-main">
          <div class="task-title">${buildActionTitleMarkup("Tempo livre", dotColor, false)}</div>
          <div class="task-assignee task-duration">${formatMinutesHuman(duration)}</div>
        </div>
        <div class="task-time">${formatHourChip(action.startAt)}</div>
      `;
      actionsList.appendChild(row);
      return;
    }
    const status = normalizeActionStatus(action.status);
    const assignee = normalizeAssigneeName(action.assignee);
    const actionIcon = getActionDisplayIcon(action);
    const stateClass = status === actionStatuses.inProgress
      ? " task-in-progress"
      : status === actionStatuses.paused
        ? " task-paused"
        : (status === actionStatuses.completed ? " task-completed" : "");
    const gaveUpClass = isGivenUpAction(action) ? " task-gave-up" : "";
    const delayMinutes = getPendingDelayMinutes(action);
    const row = document.createElement("article");
    const cleanPendingClass = (status === actionStatuses.pending && delayMinutes <= 0) ? " task-pending-clean" : "";
    row.className = `task-row${stateClass}${gaveUpClass}${getDelayClassByMinutes(delayMinutes)}${cleanPendingClass}`;
    if (delayMinutes > 0 && delayMinutes <= 15) {
      row.style.setProperty("--delay-soft-rgb", getDelaySoftRgbByMinutes(delayMinutes));
    } else {
      row.style.removeProperty("--delay-soft-rgb");
    }
    row.dataset.actionId = action.id;
    if (status === actionStatuses.paused) {
      row.style.setProperty("--task-pause-progress", `${getActionStoredCompletionPercent(action)}%`);
    }
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    const dotColor = getActionThemeDotColor(action, { delayMinutes });
    const isBlinking = status === actionStatuses.inProgress;
    row.innerHTML = `
      ${buildTaskAvatarMarkup(actionIcon.src, actionIcon.alt, { categoryIcon: actionIcon.categoryIcon })}
      <div class="task-main">
        <div class="task-title">${buildActionTitleMarkup(action.title, dotColor, isBlinking)}</div>
        <div class="task-assignee task-duration">${formatMinutesHuman(getActionDurationMinutes(action))}${status === actionStatuses.paused ? ` · ${getActionStoredCompletionPercent(action)}%` : ""}</div>
      </div>
      <div class="task-time">${formatHourChip(action.startAt)}</div>
    `;
    actionsList.appendChild(row);
  });

  renderActionsProgress();
  renderHomeRunningTask();
  if (document.getElementById("actionsModal")?.classList.contains("active")) {
    window.requestAnimationFrame(() => {
      anchorToCurrentAction();
    });
  }
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
  const delta = getServerNowMs() - startAt;
  return delta > 0 ? Math.floor(delta / (60 * 1000)) : 0;
}

function getDelaySoftRgbByMinutes(minutes) {
  const start = [36, 97, 206];
  const end = [255, 214, 61];
  const progress = Math.max(0, Math.min(1, Number(minutes || 0) / 15));
  return start.map((component, index) => {
    const next = end[index];
    return Math.round(component + ((next - component) * progress));
  }).join(", ");
}

function getDelayClassByMinutes(minutes) {
  if (minutes <= 0) {
    return "";
  }
  if (minutes <= 15) {
    return " task-delay-soft";
  }
  if (minutes <= 35) {
    return " task-delay-yellow";
  }
  if (minutes <= 75) {
    return " task-delay-orange";
  }
  if (minutes <= 195) {
    return " task-delay-red";
  }
  return " task-delay-red";
}

function renderActionsProgress() {
  if (!getToken()) {
    actionsProgress.hidden = true;
    return;
  }

  actionsProgress.hidden = false;

  const summary = getCompletionSummaryForSelectedProfile();
  const percent = summary.percent;

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

function buildDbLoadingMarkup(minHeight = 140) {
  const safeMinHeight = Math.max(48, Number(minHeight || 140));
  return `<div class="db-loading-shell" style="--db-loading-min-height:${safeMinHeight}px;"><span class="db-loading-loop" aria-hidden="true"></span></div>`;
}

function showDbLoadingState(target, minHeight = 140) {
  if (!target) {
    return;
  }
  target.innerHTML = buildDbLoadingMarkup(minHeight);
}

async function loadActions(options = {}) {
  renderDateHeader();

  if (!getToken()) {
    state.actions = [];
    state.homeSnapshotReady = false;
    renderActions();
    return;
  }

  const date = dateFromOffset(state.activeOffset);
  if (options.silent !== true) {
    showDbLoadingState(actionsList, 220);
  }
  try {
    const payload = await apiRequestWithTimeout(`/api/actions?from=${encodeURIComponent(startOfDayIso(date))}&to=${encodeURIComponent(nextDayIso(date))}`, {
      skipGlobalLoading: options.silent === true
    }, 7000);
    state.actions = Array.isArray(payload.actions) ? payload.actions : [];
    const nextRunningLocalStarts = {};
    state.actions.forEach((action) => {
      if (normalizeActionStatus(action?.status) !== actionStatuses.inProgress) return;
      const fromApi = new Date(action?.startedAt || action?.startAt).getTime();
      if (Number.isFinite(fromApi)) {
        nextRunningLocalStarts[String(action.id || "")] = fromApi;
      }
    });
    state.runningLocalStarts = nextRunningLocalStarts;
    const parsedServerNow = new Date(payload?.serverNow || "").getTime();
    if (Number.isFinite(parsedServerNow)) {
      state.serverNowMs = parsedServerNow;
      state.serverNowCapturedAtMs = Date.now();
      state.homeSnapshotReady = true;
    } else {
      state.homeSnapshotReady = false;
    }
    try {
      const runtimePayload = await apiRequestWithTimeout(runtimeStateEndpoint, {}, 5000);
      state.runtimeState = runtimePayload?.runtimeState || null;
      const runtimeActionId = String(state.runtimeState?.actionId || "").trim();
      const runtimeStartedAt = new Date(state.runtimeState?.startedAt || "").getTime();
      const runtimeEventType = String(state.runtimeState?.eventType || "").trim().toLowerCase();
      const runtimeAction = state.actions.find((action) => String(action?.id || "") === runtimeActionId);
      if (runtimeActionId && ["start", "resume"].includes(runtimeEventType)
        && normalizeActionStatus(runtimeAction?.status) === actionStatuses.inProgress
        && Number.isFinite(runtimeStartedAt) && runtimeStartedAt > 0) {
        state.runningLocalStarts[runtimeActionId] = runtimeStartedAt;
        state.actions = state.actions.map((action) => String(action?.id || "") === runtimeActionId
          ? { ...action, startedAt: state.runtimeState?.startedAt || action.startedAt }
          : action);
      }
    } catch {
      state.runtimeState = null;
    }
    renderActions();
    registerDayCloseEventIfNeeded();
  } catch (error) {
    state.homeSnapshotReady = false;
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

  const targetAction = state.actions.find((item) => String(item?.id || "") === targetId);

  if (!targetAction) {
    return;
  }

  const currentStatus = normalizeActionStatus(targetAction.status);
  if (currentStatus === actionStatuses.completed) {
    openRunningConfirmModal("restore", targetAction, () => {
      void (async () => {
        try {
          await restoreActionToPending(targetAction.id);
          await loadStatsSummary();
        } catch (error) {
          showFloatingNotice(error instanceof Error ? error.message : "Falha ao restaurar tarefa.");
        }
      })();
    });
    return;
  }
  if (currentStatus === actionStatuses.pending && !options.skipDecision) {
    const rootChoice = await openStartDecisionModal(targetAction, null, buildPendingStartActionButtons(targetAction));
    if (!rootChoice || rootChoice === "cancel") {
      return;
    }
    if (rootChoice === "postpone") {
      openPostponeTaskModal(targetAction);
      return;
    }
    if (rootChoice === "remove") {
      await apiRequest(`/api/actions/${encodeURIComponent(targetAction.id)}`, { method: "DELETE" });
      await loadActions();
      return;
    }
  }
  if ([actionStatuses.pending, actionStatuses.paused].includes(currentStatus) && !options.ignoreRunningConflict) {
    const runningAction = await resolveRunningActionConflict(targetAction.id, targetAction);
    if (runningAction) {
      await handleRunningActionConflict(runningAction, targetAction);
      return;
    }
  }
  if (currentStatus === actionStatuses.inProgress && !options.skipEndConfirm) {
    openModal("runningTaskModal");
    closeActionsModalWithFade();
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
    const nextStatus = normalizeActionStatus(updated?.status);
    if ([actionStatuses.pending, actionStatuses.paused].includes(currentStatus) && nextStatus === actionStatuses.inProgress) {
      resetRunningCompletionState();
      state.runningLocalStarts[String(targetId)] = getServerNowMs();
      await autoPlayRunningTaskDefaultPreference(updated);
      openModal("runningTaskModal");
      closeActionsModalWithFade();
    }
    if (currentStatus === actionStatuses.inProgress && nextStatus === actionStatuses.completed) {
      delete state.runningLocalStarts[String(targetId)];
      pendingActionsAnchorId = updated?.id || "";
      enqueueActionPointsUpdateFeedback(
        payload?.pointsUpdate,
        RUNNING_COMPLETION_ANIMATION_MS + RUNNING_COMPLETION_HOLD_MS + 120
      );
    }
    startRunningTaskTicker();
    renderActions();
  } catch (error) {
    const normalizedErrorMessage = String(error?.message || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const isRunningConflict = error?.code === "ACTION_IN_PROGRESS_CONFLICT"
      || normalizedErrorMessage.includes("ja esta em outra tarefa");
    if (isRunningConflict && !options.ignoreRunningConflict) {
      const runningFromError = error?.runningAction || null;
      if (runningFromError) {
        state.actions = [...state.actions.filter((item) => String(item?.id || "") !== String(runningFromError?.id || "")), runningFromError];
      }
      const runningAction = runningFromError
        || await resolveRunningActionConflict(targetAction.id, targetAction, true);
      if (runningAction) {
        await handleRunningActionConflict(runningAction, targetAction);
        return;
      }
    }
    document.body.classList.remove("task-starting");
    window.alert(error instanceof Error ? error.message : "Nao foi possivel atualizar a tarefa.");
    renderActions();
  }
}

function moveActiveDate(amount) {
  state.activeOffset += amount;
  state.actionsMissionOnly = false;
  void loadActions();
  void loadActionMissions();
}

function openWizard(action = null, options = {}) {
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
    state.wizard.categoryId = normalizeTaskCategoryId(action.categoryId);
    state.wizard.categoryName = getTaskCategoryName(state.wizard.categoryId);
    state.wizard.editingActionId = action.id;
    taskTitle.value = action.title || "";
  } else {
    taskTitle.value = "";
  }
  state.wizard.step = Math.max(1, Math.min(4, Number(options.step || state.wizard.step || 1)));
  state.wizard.inlineEditStep = Number(options.inlineEditStep || 0) || 0;
  state.wizard.returnToStartDecision = Boolean(options.returnToStartDecision);
  state.wizard.returnMode = String(options.returnMode || "none");
  wizardMessage.textContent = "";
  hideActionAiConfirmation();
  actionWizard.classList.add("active");
  actionWizard.setAttribute("aria-hidden", "false");
  renderWizard();
  if (state.wizard.step === 1) {
    setTimeout(() => taskTitle.focus(), 60);
  }
}

function openRepeatEditorFromTaskComposer() {
  if (!isTaskComposerMode()) {
    return;
  }
  startDecisionModal?.classList.remove("active");
  startDecisionModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("start-decision-open");
  state.wizard.step = 2;
  state.wizard.inlineEditStep = 2;
  state.wizard.returnMode = "task-composer";
  wizardMessage.textContent = "";
  hideActionAiConfirmation();
  actionWizard.classList.add("active");
  actionWizard.setAttribute("aria-hidden", "false");
  renderWizard();
}

function closeWizard() {
  stopActionMic();
  if (actionCategoryInterpretTimer) {
    window.clearTimeout(actionCategoryInterpretTimer);
    actionCategoryInterpretTimer = null;
  }
  hideActionAiConfirmation();
  if (actionCategoryModal) {
    actionCategoryModal.classList.remove("active");
    actionCategoryModal.setAttribute("aria-hidden", "true");
  }
  if (actionVoiceStatus) {
    actionVoiceStatus.textContent = "Toque no microfone para criar por voz.";
  }
  document.body.classList.remove("start-decision-open", "start-conflict-open", "task-starting", "running-confirm-open", "running-confirm-from-actions", "quick-task-open");
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
  }
  actionWizard.classList.remove("active");
  actionWizard.setAttribute("aria-hidden", "true");
}

function renderActionCategoryPicker() {
  const selectedId = normalizeTaskCategoryId(state.wizard.categoryId);
  const selectedName = getTaskCategoryName(selectedId);
  const selectedIcon = String(state.wizard.svgIconUrl || "").trim() || getTaskCategoryIconPath(selectedId);
  const profileAvatar = getActionAvatarPath(getWizardAssigneeName());
  if (actionCategoryPreviewIcon) {
    actionCategoryPreviewIcon.src = selectedIcon || profileAvatar;
    actionCategoryPreviewIcon.alt = String(state.wizard.svgIconLabel || "").trim() || selectedName || "Avatar do usuário";
  }
  if (actionCategoryPreviewLabel) {
    actionCategoryPreviewLabel.textContent = selectedName || "Aspecto";
  }
}

function renderActionCategoryModal() {
  if (!actionCategoryGrid) return;
  const selectedId = normalizeTaskCategoryId(actionCategorySelectionId || state.wizard.categoryId);
  actionCategoryGrid.innerHTML = "";
  taskCategoryDefinitions.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-item-btn";
    button.dataset.categoryId = category.id;
    button.classList.toggle("active", category.id === selectedId);
    button.innerHTML = `<img src="${getTaskCategoryIconPath(category.id)}" alt="${escapeHtml(category.name)}" loading="lazy" /><span>${escapeHtml(category.name)}</span>`;
    actionCategoryGrid.appendChild(button);
  });
}

async function interpretActionCategoryFromTitle(titleText) {
  const title = String(titleText || "").trim();
  if (title.length < 2) return;
  try {
    const payload = await apiRequest("/api/200/actions/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    const categoryId = normalizeTaskCategoryId(payload?.category?.id);
    if (!categoryId || taskTitle.value.trim() !== title) return;
    state.wizard.categoryId = categoryId;
    state.wizard.categoryName = String(payload?.category?.name || getTaskCategoryName(categoryId));
    renderActionCategoryPicker();
    renderActionCategoryModal();
  } catch {}
}

async function saveActionCategory(actionId, categoryId) {
  const action = state.actions.find((item) => String(item.id) === String(actionId));
  if (!action) return;
  const shouldCascade = String(action.repeatRule || "none") !== "none";
  const matchKey = shouldCascade
    ? JSON.stringify({
        title: String(action.title || "").trim().toLowerCase(),
        assignee: String(action.assignee || "").trim().toLowerCase(),
        repeatRule: String(action.repeatRule || "none"),
        repeatDays: JSON.stringify(Array.isArray(action.repeatDays) ? action.repeatDays : [])
      })
    : "";
  const targets = shouldCascade
    ? state.actions.filter((item) => JSON.stringify({
      title: String(item.title || "").trim().toLowerCase(),
      assignee: String(item.assignee || "").trim().toLowerCase(),
      repeatRule: String(item.repeatRule || "none"),
      repeatDays: JSON.stringify(Array.isArray(item.repeatDays) ? item.repeatDays : [])
    }) === matchKey)
    : [action];
  await Promise.all(targets.map((item) => apiRequest(`/api/actions/${encodeURIComponent(item.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: item.title,
      assignee: item.assignee,
      categoryId,
      occurrences: [{ startAt: item.startAt, endAt: item.endAt }]
    })
  })));
  await loadActions();
}

async function loadSvgAssetLibrary() {
  if (!svgAssetLibraryPromise) {
    svgAssetLibraryPromise = fetch("/200/svg-hub-manifest.json")
      .then((response) => response.json())
      .then((payload) => Array.isArray(payload?.assets) ? payload.assets : [])
      .catch(() => []);
  }
  return await svgAssetLibraryPromise;
}

function setSvgSelectorPreview(url = "", label = "") {
  if (!svgSelectorPreview) {
    return;
  }
  svgSelectorPreview.src = String(url || "").trim() || defaultTaskSvgPath;
  svgSelectorPreview.alt = label || "Preview do ícone";
}

function renderSvgSelectorModal() {
  if (!svgSelectorGrid) {
    return;
  }
  const assets = Array.isArray(state.svgAssets) ? state.svgAssets : [];
  const selectedUrl = String(state.svgSelector?.selectedUrl || "").trim();
  svgSelectorGrid.innerHTML = "";
  assets.forEach((asset) => {
    const fileName = String(asset?.fileName || "").trim();
    if (!fileName) {
      return;
    }
    const assetUrl = `/200/svg-hub/${encodeURIComponent(fileName)}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `svg-selector-item${selectedUrl === assetUrl ? " is-selected" : ""}`;
    button.dataset.svgUrl = assetUrl;
    button.dataset.svgLabel = String(asset?.label || asset?.id || "Ícone").trim();
    button.innerHTML = buildTaskAvatarMarkup(assetUrl, String(asset?.label || "Ícone"), { categoryIcon: true });
    svgSelectorGrid.appendChild(button);
  });
  setSvgSelectorPreview(selectedUrl, String(state.svgSelector?.selectedLabel || "").trim());
}

async function openSvgSelectorModal(targetKind, targetId) {
  state.svgSelector.targetKind = String(targetKind || "").trim();
  state.svgSelector.targetId = String(targetId || "").trim();
  if (svgSelectorTitle) {
    svgSelectorTitle.textContent = targetKind === "mission" ? "Ícone da missão" : "Ícone da tarefa";
  }
  if (svgSelectorHint) {
    svgSelectorHint.textContent = targetKind === "mission"
      ? "Escolha um ícone da biblioteca para salvar nesta missão."
      : "Escolha um ícone da biblioteca para salvar nesta tarefa.";
  }
  if (svgSelectorStatus) {
    svgSelectorStatus.textContent = "Carregando ícones...";
  }
  if (targetKind === "mission") {
    const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id || "") === String(targetId || ""));
    state.svgSelector.selectedUrl = String(goal?.svgIconUrl || "").trim() || defaultMissionSvgPath;
    state.svgSelector.selectedLabel = String(goal?.svgIconLabel || goal?.title || "Ícone da missão").trim();
  } else {
    const action = (Array.isArray(state.actions) ? state.actions : []).find((item) => String(item.id || "") === String(targetId || ""));
    state.svgSelector.selectedUrl = String(action?.svgIconUrl || "").trim() || defaultTaskSvgPath;
    state.svgSelector.selectedLabel = String(action?.svgIconLabel || action?.title || "Ícone da tarefa").trim();
  }
  renderSvgSelectorModal();
  openModal("svgSelectorModal");
  state.svgAssets = await loadSvgAssetLibrary();
  renderSvgSelectorModal();
  if (svgSelectorStatus) {
    svgSelectorStatus.textContent = "";
  }
}

async function saveSvgSelectorChoice() {
  const targetKind = String(state.svgSelector?.targetKind || "").trim();
  const targetId = String(state.svgSelector?.targetId || "").trim();
  const selectedUrl = String(state.svgSelector?.selectedUrl || "").trim();
  const selectedLabel = String(state.svgSelector?.selectedLabel || "").trim();
  if (!targetKind || !targetId || !selectedUrl) {
    return;
  }
  if (svgSelectorStatus) {
    svgSelectorStatus.textContent = "Salvando ícone...";
  }
  if (targetKind === "mission") {
    const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id || "") === targetId);
    const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: String(state.selectedProfile || getDefaultProfileName()).trim(),
        targetValue: Math.max(1, Math.trunc(Number(goal?.targetValue || 1) || 1)),
        svgIconUrl: selectedUrl,
        svgIconLabel: selectedLabel
      })
    });
    if (Array.isArray(payload?.goals)) {
      state.missions = payload.goals;
      renderMissions();
      renderRunningMissionQuickButtons();
    }
  } else {
    const action = (Array.isArray(state.actions) ? state.actions : []).find((item) => String(item.id || "") === targetId);
    if (!action) {
      return;
    }
    const payload = await apiRequest(`/api/actions/${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: action.title,
        assignee: action.assignee,
        categoryId: String(action.categoryId || "").trim().toLowerCase(),
        svgIconUrl: selectedUrl,
        svgIconLabel: selectedLabel,
        occurrences: [{ startAt: action.startAt, endAt: action.endAt }]
      })
    });
    if (payload?.action) {
      updateActionInState(payload.action);
      renderActions();
      renderHomeRunningTask();
    }
  }
  if (svgSelectorStatus) {
    svgSelectorStatus.textContent = "Ícone salvo.";
  }
  window.setTimeout(() => closeModal("svgSelectorModal"), 180);
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

  if (wizardHeaderBackButton) {
    wizardHeaderBackButton.hidden = step === 1;
  }
  if (wizardBackButton) {
    wizardBackButton.textContent = "Cancelar";
  }
  wizardNextButton.textContent = state.wizard.inlineEditStep
    ? "Atualizar"
    : step === 4 ? "Criar tarefa" : "Continuar";
  wizardDateLabel.textContent = formatDateLabel(dateFromOffset(state.wizard.dateOffset));
  renderActionCategoryPicker();
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

function closeRunningTaskModalWithFade() {
  if (!runningTaskModalElement || !runningTaskModalElement.classList.contains("active")) {
    return;
  }
  closeRunningMusicListModal();
  runningTaskModalElement.classList.add("is-fading-out");
  window.setTimeout(() => {
    closeModal(runningTaskModalElement);
    runningTaskModalElement.classList.remove("is-fading-out");
  }, 500);
}

function closeRunningConfirmModal() {
  state.runningConfirm.action = null;
  state.runningConfirm.pauseAction = null;
  if (runningConfirmPauseButton) runningConfirmPauseButton.hidden = true;
  document.body.classList.remove("running-confirm-open", "running-confirm-from-actions");
  if (runningConfirmModal) {
    closeModal(runningConfirmModal);
  }
}

function openRunningConfirmModal(kind, action, onConfirm, options = {}) {
  if (!runningConfirmModal || !runningConfirmTitle || !runningConfirmName || !runningConfirmPrimaryButton || !runningConfirmBackButton) {
    return;
  }
  state.runningConfirm.action = typeof onConfirm === "function" ? onConfirm : null;
  state.runningConfirm.pauseAction = typeof options?.onPause === "function" ? options.onPause : null;
  const titleMap = {
    giveup: "Desistir?",
    abort: "Abortar ou pausar?",
    finalize: "Concluir?",
    restore: "Restaurar tarefa",
    delete: "Excluir microtarefa?",
    delete_mission: "Excluir missão inteira?"
  };
  const buttonMap = {
    giveup: "Desistir",
    abort: "Abortar",
    finalize: "Concluir",
    restore: "Restaurar tarefa",
    delete: "Excluir",
    delete_mission: "Excluir missão"
  };
  const classMap = {
    giveup: "is-desistir",
    abort: "is-abortar",
    finalize: "is-concluir",
    restore: "is-restaurar",
    delete: "is-excluir",
    delete_mission: "is-excluir"
  };
  runningConfirmTitle.textContent = titleMap[kind] || "Desistir?";
  runningConfirmName.textContent = String(action?.title || "Nome da tarefa");
  runningConfirmPrimaryButton.textContent = buttonMap[kind] || "Desistir";
  runningConfirmPrimaryButton.className = `primary-btn running-confirm-primary ${classMap[kind] || "is-desistir"}`;
  runningConfirmBackButton.textContent = "Voltar";
  if (runningConfirmPauseButton) {
    runningConfirmPauseButton.hidden = !(kind === "abort" && state.runningConfirm.pauseAction);
  }
  const openedFromActions = Boolean(actionsModal?.classList.contains("active"));
  document.body.classList.toggle("running-confirm-from-actions", openedFromActions);
  document.body.appendChild(runningConfirmModal);
  document.body.classList.add("running-confirm-open");
  openModal("runningConfirmModal");
}

function startActionsTimeTicker() {
  if (actionsTimeTicker) {
    window.clearInterval(actionsTimeTicker);
    actionsTimeTicker = null;
  }
}

function getCurrentTimelineEntry(nowMs, exceptId = "") {
  const timeline = buildActionTimelineEntries().filter((entry) => {
    if (exceptId && entry.id === exceptId) return false;
    if (entry.kind === "free") return true;
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
  state.runningPlayer.configurationMode = false;
  state.runningPlayer.configurationTaskTitle = "";
  closeModal(startDecisionModal);
  if (startDecisionContent) {
    startDecisionContent.id = "startDecisionContent";
  }
  if (startDecisionMicButton) {
    startDecisionMicButton.hidden = true;
    startDecisionMicButton.classList.remove("is-active");
  }
  state.startDecisionContext.mode = "view";
  state.startDecisionContext.fieldToFocus = "";
  state.startDecisionContext.dirty = false;
  if (startDecisionMessage) {
    startDecisionMessage.textContent = "";
  }
  document.body.classList.remove("start-decision-open");
  if (["start", "start_chosen", "do_current"].includes(String(value || ""))) {
    document.body.classList.add("task-starting");
  }
  const resolver = startDecisionResolver;
  startDecisionResolver = null;
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
  }
  if (resolver) resolver(value);
}

function closeStartConflictModal(value = "cancel") {
  document.body.classList.remove("start-conflict-open", "task-starting");
  if (startConflictModal) {
    closeModal(startConflictModal);
  }
  const resolver = state.startConflict.resolve;
  state.startConflict.resolve = null;
  if (resolver) {
    resolver(value);
  }
}

function formatActionMusicInlineLabel(action) {
  const label = formatActionMusicDecisionLabel(action);
  return label.replace(/^Música padrão da atividade:\s*/i, "").trim() || "Definir música";
}

function buildPendingStartActionButtons(targetAction) {
  void targetAction;
  return [
    { label: "Iniciar", value: "start", primary: true },
    { label: "Excluir", value: "remove" },
    { label: "Voltar", value: "cancel" }
  ];
}

function isTaskComposerMode() {
  return state.startDecisionContext.mode === "create" || state.startDecisionContext.mode === "edit";
}

function markTaskComposerDirty() {
  if (isTaskComposerMode()) {
    state.startDecisionContext.dirty = true;
  }
}

function formatTaskComposerDateLabel() {
  if (state.wizard.repeatOpen && normalizeRepeatMode(state.wizard.repeatMode) === "daily") {
    return "Diariamente";
  }
  return formatDateLabel(dateFromOffset(state.wizard.dateOffset)) || "Inserir uma data";
}

function renderTaskComposerMeta(button, iconMarkup, label, placeholder = false) {
  if (!button) return;
  button.innerHTML = `${iconMarkup}<span>${escapeHtml(label)}</span>`;
  button.classList.toggle("is-placeholder", Boolean(placeholder));
}

function renderTaskComposerModal() {
  if (!startDecisionContent || !startDecisionTaskTitle || !startDecisionMicButton) {
    return;
  }
  const mode = state.startDecisionContext.mode;
  const untouchedCreate = mode === "create" && !state.startDecisionContext.dirty;
  startDecisionContent.id = mode === "create" ? "create-task" : "edit-task";
  const titleValue = String(taskTitle?.value || "").trim();
  startDecisionTaskTitle.textContent = titleValue || "Inserir nome da tarefa";
  startDecisionTaskTitle.classList.toggle("is-placeholder", !titleValue);
  startDecisionTaskTitle.style.cursor = "pointer";
  startDecisionMicButton.hidden = false;
  startDecisionMicButton.classList.toggle("is-active", actionMediaRecorder && actionMediaRecorder.state !== "inactive");
  if (closeStartDecisionModal) {
    closeStartDecisionModal.hidden = false;
  }

  renderTaskComposerMeta(
    startDecisionStartAt,
    startDecisionStartAt?.querySelector("svg")?.outerHTML || "",
    untouchedCreate ? "Inserir horário inicial" : `${String(state.wizard.startHour).padStart(2, "0")}:${String(state.wizard.startMinute).padStart(2, "0")}`,
    untouchedCreate
  );
  renderTaskComposerMeta(
    startDecisionEndAt,
    startDecisionEndAt?.querySelector("svg")?.outerHTML || "",
    untouchedCreate ? "Inserir horário final" : `${String(state.wizard.endHour).padStart(2, "0")}:${String(state.wizard.endMinute).padStart(2, "0")}`,
    untouchedCreate
  );
  const repeatLabel = untouchedCreate ? "Inserir uma data" : formatTaskComposerDateLabel();
  renderTaskComposerMeta(
    startDecisionRepeatLabel,
    startDecisionRepeatLabel?.querySelector("svg")?.outerHTML || "",
    repeatLabel || "Inserir uma data",
    untouchedCreate || !repeatLabel
  );
  renderTaskComposerMeta(
    startDecisionMusicLabel,
    startDecisionMusicLabel?.querySelector("svg")?.outerHTML || "",
    formatActionMusicInlineLabel(findActionById(state.startDecisionContext.actionId)) || "Definir música",
    false
  );
  renderTaskComposerMeta(
    startDecisionAspectLabel,
    `<img src="${getTaskCategoryIconPath(state.wizard.categoryId)}" alt="" aria-hidden="true" />`,
    getTaskCategoryName(state.wizard.categoryId),
    false
  );

  if (startDecisionActions) {
    startDecisionActions.innerHTML = "";
    const primary = document.createElement("button");
    primary.type = "button";
    primary.className = "decision-btn decision-btn-start";
    primary.innerHTML = `<span>${mode === "create" ? "Criar tarefa" : "Salvar edição"}</span>`;
    primary.addEventListener("click", () => {
      void saveTaskComposer();
    });
    startDecisionActions.appendChild(primary);

    const secondary = document.createElement("button");
    secondary.type = "button";
    secondary.className = `decision-btn ${mode === "create" ? "decision-btn-edit" : "decision-btn-back"}`;
    secondary.innerHTML = "<span>Voltar</span>";
    secondary.addEventListener("click", () => {
      closeStartDecisionModalWith("cancel");
    });
    startDecisionActions.appendChild(secondary);

    if (mode === "edit") {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "decision-btn decision-btn-remove";
      removeButton.innerHTML = "<span>Excluir</span>";
      removeButton.addEventListener("click", async () => {
        const action = findActionById(state.startDecisionContext.actionId);
        if (!action) {
          closeStartDecisionModalWith("cancel");
          return;
        }
        if (!window.confirm("Excluir essa tarefa? Se for repetida, toda a rede sera removida.")) {
          return;
        }
        await apiRequest(`/api/actions/${encodeURIComponent(action.id)}`, { method: "DELETE" });
        closeStartDecisionModalWith("remove");
        await loadActions();
      });
      startDecisionActions.appendChild(removeButton);
    }
  }
}

function openTaskComposer(action = null, options = {}) {
  state.wizard = buildInitialWizardState();
  state.startDecisionContext.mode = action ? "edit" : "create";
  state.startDecisionContext.actionId = String(action?.id || "");
  state.startDecisionContext.fieldToFocus = String(options.fieldToFocus || "");
  state.startDecisionContext.dirty = false;
  if (startDecisionMessage) {
    startDecisionMessage.textContent = "";
  }
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
    state.wizard.categoryId = normalizeTaskCategoryId(action.categoryId);
    state.wizard.categoryName = getTaskCategoryName(state.wizard.categoryId);
    state.wizard.svgIconUrl = String(action.svgIconUrl || "").trim();
    state.wizard.svgIconLabel = String(action.svgIconLabel || "").trim();
    state.wizard.editingActionId = action.id;
    state.wizard.repeatOpen = String(action.repeatRule || "none") !== "none";
    state.wizard.repeatMode = normalizeRepeatMode(String(action.repeatRule || "none"));
    state.wizard.repeatDays = Array.isArray(action.repeatDays) ? action.repeatDays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6) : [];
    if (taskTitle) {
      taskTitle.value = String(action.title || "");
    }
  } else if (taskTitle) {
    taskTitle.value = "";
  }
  renderTaskComposerModal();
  openModal("startDecisionModal");
  document.body.classList.add("start-decision-open", "modal-open");
  if (state.startDecisionContext.fieldToFocus) {
    window.setTimeout(() => openTaskComposerFieldEditor(state.startDecisionContext.fieldToFocus), 40);
  }
}

function openTaskComposerFieldEditor(field) {
  if (!isTaskComposerMode()) {
    return;
  }
  if (field === "title") {
    const nextTitle = window.prompt("Nome da tarefa:", String(taskTitle?.value || "").trim());
    if (nextTitle == null) return;
    if (taskTitle) {
      taskTitle.value = String(nextTitle).trim().slice(0, 80);
    }
    markTaskComposerDirty();
    renderTaskComposerModal();
    void interpretActionCategoryFromTitle(taskTitle?.value || "");
    return;
  }
  if (field === "start" || field === "end") {
    const input = field === "start" ? startDecisionStartInput : startDecisionEndInput;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    input.value = `${String(field === "start" ? state.wizard.startHour : state.wizard.endHour).padStart(2, "0")}:${String(field === "start" ? state.wizard.startMinute : state.wizard.endMinute).padStart(2, "0")}`;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
      input.focus();
    }
    return;
  }
  if (field === "repeat") {
    openRepeatEditorFromTaskComposer();
  }
}

function findActionById(actionId) {
  return state.actions.find((item) => String(item?.id || "") === String(actionId || "")) || null;
}

function getRunningActionExcept(actionId) {
  return getVisibleActions().find((item) =>
    normalizeActionStatus(item?.status) === actionStatuses.inProgress
    && String(item?.id || "") !== String(actionId || "")
  ) || null;
}

async function resolveRunningActionConflict(actionId, targetAction = null, forceRuntimeRefresh = false) {
  const localRunning = getRunningActionExcept(actionId);
  if (localRunning) return localRunning;

  let runtimeState = state.runtimeState;
  if (forceRuntimeRefresh || !runtimeState) {
    try {
      const runtimePayload = await apiRequestWithTimeout(runtimeStateEndpoint, { skipGlobalLoading: true }, 5000);
      runtimeState = runtimePayload?.runtimeState || null;
      state.runtimeState = runtimeState;
    } catch {
      runtimeState = null;
    }
  }

  const runtimeActionId = String(runtimeState?.actionId || "").trim();
  const refreshedEventType = String(runtimeState?.eventType || "").trim().toLowerCase();
  if (!runtimeActionId || runtimeActionId === String(actionId || "") || !["start", "resume"].includes(refreshedEventType)) {
    return null;
  }

  const cachedRuntimeAction = state.actions.find((item) => String(item?.id || "") === runtimeActionId);
  if (normalizeActionStatus(cachedRuntimeAction?.status) === actionStatuses.inProgress) {
    return cachedRuntimeAction;
  }

  const runtimeStartedAt = new Date(runtimeState?.startedAt || runtimeState?.occurredAt || new Date());
  if (!Number.isNaN(runtimeStartedAt.getTime())) {
    const fromDate = new Date(runtimeStartedAt);
    const toDate = new Date(runtimeStartedAt);
    fromDate.setDate(fromDate.getDate() - 7);
    toDate.setDate(toDate.getDate() + 8);
    try {
      const payload = await apiRequestWithTimeout(`/api/actions?from=${encodeURIComponent(startOfDayIso(fromDate))}&to=${encodeURIComponent(startOfDayIso(toDate))}`, {
        skipGlobalLoading: true
      }, 7000);
      const fetchedActions = Array.isArray(payload?.actions) ? payload.actions : [];
      const fetchedRuntimeAction = fetchedActions.find((item) => String(item?.id || "") === runtimeActionId);
      if (fetchedRuntimeAction) {
        const merged = new Map(state.actions.map((item) => [String(item?.id || ""), item]));
        merged.set(runtimeActionId, fetchedRuntimeAction);
        state.actions = [...merged.values()];
        if (normalizeActionStatus(fetchedRuntimeAction?.status) === actionStatuses.inProgress) {
          return fetchedRuntimeAction;
        }
      }
    } catch {}
  }

  const fallbackStart = Number.isNaN(runtimeStartedAt.getTime()) ? new Date() : runtimeStartedAt;
  const fallbackDurationMinutes = Math.max(1, getActionDurationMinutes(targetAction) || 10);
  const fallbackAction = {
    id: runtimeActionId,
    title: String(runtimeState?.actionTitle || "Tarefa em andamento"),
    assignee: targetAction?.assignee || state.selectedProfile,
    status: actionStatuses.inProgress,
    startedAt: fallbackStart.toISOString(),
    startAt: fallbackStart.toISOString(),
    endAt: new Date(fallbackStart.getTime() + (fallbackDurationMinutes * 60 * 1000)).toISOString(),
    completionPercent: 0,
    accumulatedSeconds: 0
  };
  state.actions = [...state.actions.filter((item) => String(item?.id || "") !== runtimeActionId), fallbackAction];
  return fallbackAction;
}

function reopenStartDecisionForAction(actionId) {
  const action = findActionById(actionId);
  if (!action) {
    return;
  }
  void openStartDecisionModal(action, null, buildPendingStartActionButtons(action));
}

function openStartConflictModalForActions(currentAction, nextAction) {
  if (!startConflictModal) {
    return Promise.resolve("cancel");
  }
  if (runningConfirmModal?.classList.contains("active")) {
    closeRunningConfirmModal();
  }
  state.startConflict.currentActionId = String(currentAction?.id || "");
  state.startConflict.nextActionId = String(nextAction?.id || "");
  const currentTitle = formatActionTitleForDisplay(currentAction?.title || "Tarefa");
  if (startConflictCurrentTitle) {
    startConflictCurrentTitle.textContent = `${currentTitle} está em andamento`;
  }
  if (startConflictQuestion) {
    startConflictQuestion.textContent = `Você concluiu ${currentTitle}?`;
  }
  if (startConflictNextTitle) {
    startConflictNextTitle.textContent = `Próxima: ${formatActionTitleForDisplay(nextAction?.title || "tarefa")}`;
  }
  document.body.appendChild(startConflictModal);
  document.body.classList.add("start-conflict-open");
  openModal("startConflictModal");
  return new Promise((resolve) => {
    state.startConflict.resolve = resolve;
  });
}

async function handleRunningActionConflict(currentAction, nextAction) {
  const conflictChoice = await openStartConflictModalForActions(currentAction, nextAction);
  if (conflictChoice === "finalize_and_start") {
    await toggleActionStatus(currentAction.id, { skipEndConfirm: true });
    await toggleActionStatus(nextAction.id, { skipDecision: true, ignoreRunningConflict: true });
    return true;
  }
  if (conflictChoice === "partial_and_start") {
    const pausedResult = await pauseActionWithSelectedProgress(currentAction);
    if (!pausedResult) return true;
    delete state.runningLocalStarts[String(currentAction.id || "")];
    await toggleActionStatus(nextAction.id, { skipDecision: true, ignoreRunningConflict: true });
    return true;
  }
  return conflictChoice === "cancel";
}

function openStartDecisionModal(targetAction, currentEntry, buttons) {
  return new Promise((resolve) => {
    startDecisionResolver = resolve;
    state.startDecisionContext.actionId = String(targetAction?.id || "");
    state.startDecisionContext.mode = "view";
    state.startDecisionContext.fieldToFocus = "";
    state.startDecisionContext.dirty = false;
    if (startDecisionContent) {
      startDecisionContent.id = "startDecisionContent";
    }
    if (startDecisionMicButton) {
      startDecisionMicButton.hidden = true;
      startDecisionMicButton.classList.remove("is-active");
    }
    if (closeStartDecisionModal) {
      closeStartDecisionModal.hidden = false;
    }
    if (startDecisionTaskTitle) {
      startDecisionTaskTitle.textContent = formatActionTitleForDisplay(targetAction?.title || "Tarefa");
      startDecisionTaskTitle.classList.remove("is-placeholder");
    }
    if (startDecisionStartAt) {
      startDecisionStartAt.innerHTML = `${startDecisionStartAt.querySelector("svg")?.outerHTML || ""}<span>${escapeHtml(formatTime(targetAction?.startAt || 0))}</span>`;
    }
    if (startDecisionEndAt) {
      startDecisionEndAt.innerHTML = `${startDecisionEndAt.querySelector("svg")?.outerHTML || ""}<span>${escapeHtml(formatTime(targetAction?.endAt || 0))}</span>`;
    }
    if (startDecisionRepeatLabel) {
      startDecisionRepeatLabel.innerHTML = `${startDecisionRepeatLabel.querySelector("svg")?.outerHTML || ""}<span>${escapeHtml(formatRepeatLabel(String(targetAction?.repeatRule || "none"), Array.isArray(targetAction?.repeatDays) ? targetAction.repeatDays : []))}</span>`;
    }
    if (startDecisionMusicLabel) {
      startDecisionMusicLabel.innerHTML = `${startDecisionMusicLabel.querySelector("svg")?.outerHTML || ""}<span>${escapeHtml(formatActionMusicInlineLabel(targetAction))}</span>`;
    }
    if (startDecisionAspectLabel) {
      startDecisionAspectLabel.innerHTML = `<img src="${getTaskCategoryIconPath(targetAction?.categoryId)}" alt="" aria-hidden="true" /><span>${escapeHtml(getTaskCategoryName(targetAction?.categoryId))}</span>`;
    }
    if (startDecisionActions) {
      startDecisionActions.innerHTML = "";
      buttons.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const icons = {
          start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>',
          start_chosen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>',
          edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.5V20h2.5L17.1 9.4l-2.5-2.5zm14.1-9.1 1.2-1.2a1 1 0 0 0 0-1.4l-1.1-1.1a1 1 0 0 0-1.4 0l-1.2 1.2z"/></svg>',
          postpone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1zm1 11.6V6h-2v7.4l5.2 3.1 1-1.7z"/></svg>',
          remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2zm2-10v8h2v-8zm4 0v8h2v-8zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
          swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11z"/></svg>',
          do_current: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>',
          cancel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 6-6 1.4 1.4L9.8 11H18v2H9.8l3.6 3.6L12 18z"/></svg>'
        };
        const classMap = {
          start: "decision-btn decision-btn-start",
          start_chosen: "decision-btn decision-btn-start",
          edit: "decision-btn decision-btn-edit",
          postpone: "decision-btn decision-btn-postpone",
          remove: "decision-btn decision-btn-remove",
          swap: "decision-btn decision-btn-postpone",
          do_current: "decision-btn decision-btn-start",
          cancel: "decision-btn decision-btn-back"
        };
        btn.className = classMap[item.value] || (item.primary ? "primary-btn" : "ghost-btn");
        btn.innerHTML = `${icons[item.value] || ""}<span>${escapeHtml(item.label)}</span>`;
        btn.addEventListener("click", () => closeStartDecisionModalWith(item.value));
        startDecisionActions.appendChild(btn);
      });
    }
    openModal("startDecisionModal");
    document.body.classList.add("start-decision-open");
    document.body.classList.add("modal-open");
  });
}

function stopPostponeFeedbackCarousel() {
  if (postponeFeedbackCarouselTimer) {
    window.clearInterval(postponeFeedbackCarouselTimer);
    postponeFeedbackCarouselTimer = null;
  }
}

function closePostponeTaskModalView() {
  stopPostponeFeedbackCarousel();
  postponeTaskModal?.classList.remove("active");
  postponeTaskModal?.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
  }
}

function closePostponeReplaceModalView() {
  postponeReplaceModal?.classList.remove("active");
  postponeReplaceModal?.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
  }
}

function formatPostponeDayLabel(offset) {
  if (offset === 0) return "Hoje";
  if (offset === 1) return "Amanhã";
  return formatDateLabel(dateFromOffset(offset));
}

function formatClockFromMinutes(totalMinutes) {
  const clamped = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatSleepDelayLabel(totalMinutes) {
  const value = Math.max(0, Math.round(Number(totalMinutes || 0) || 0));
  if (value <= 0) {
    return "Agora";
  }
  if (value < 60) {
    return `${value} minutos`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (minutes <= 0) {
    return `${hours} hora${hours > 1 ? "s" : ""}`;
  }
  return `${hours}h ${minutes}min`;
}

function formatPostponeDelayLabel(totalMinutes) {
  const value = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours > 0 && minutes > 0) {
    return `+${hours} hora${hours > 1 ? "s" : ""} e ${minutes} minutos`;
  }
  if (hours > 0) {
    return `+${hours} hora${hours > 1 ? "s" : ""}`;
  }
  return `+${minutes} minutos`;
}

function getPostponeDraftAction() {
  const targetAction = state.actions.find((item) => item.id === state.postpone.actionId) || null;
  if (!targetAction) return null;
  const durationMinutes = Math.max(1, getActionDurationMinutes(targetAction));
  const sourceStartMs = new Date(targetAction.startAt).getTime();
  const baseDate = dateFromOffset(state.activeOffset + state.postpone.dayOffset);
  let startAt;
  if (state.postpone.dayOffset === 0) {
    const safeBase = Number.isFinite(sourceStartMs) ? sourceStartMs : Date.now();
    startAt = new Date(safeBase + (state.postpone.delayMinutes * 60 * 1000));
  } else {
    startAt = new Date(baseDate);
    startAt.setHours(0, 0, 0, 0);
    startAt = new Date(startAt.getTime() + (state.postpone.clockMinutes * 60 * 1000));
  }
  const endAt = new Date(startAt.getTime() + (durationMinutes * 60 * 1000));
  return { targetAction, startAt, endAt, durationMinutes };
}

function getPostponeOverlaps(startAt, endAt, sourceActionId) {
  const startMs = startAt.getTime();
  const endMs = endAt.getTime();
  return buildActionTimelineEntries()
    .filter((entry) => entry.kind !== "free" && String(entry.id || "") !== String(sourceActionId || ""))
    .filter((entry) => {
      const entryStart = new Date(entry.startAt).getTime();
      const entryEnd = new Date(entry.endAt).getTime();
      return Number.isFinite(entryStart) && Number.isFinite(entryEnd) && entryEnd > startMs && entryStart < endMs;
    });
}

function resolvePostponeDraftWithFreeFit(draft) {
  const nextDraft = { ...draft, fitFound: true };
  if (!state.postpone.onlyFree) {
    return nextDraft;
  }
  const targetStart = new Date(nextDraft.startAt);
  const dayStart = new Date(targetStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetStart);
  dayEnd.setHours(23, 59, 59, 999);
  const freeFit = buildActionTimelineEntries()
    .filter((entry) => entry.kind === "free")
    .map((entry) => ({ start: new Date(entry.startAt).getTime(), end: new Date(entry.endAt).getTime() }))
    .map((slot) => ({
      start: Math.max(slot.start, dayStart.getTime()),
      end: Math.min(slot.end, dayEnd.getTime())
    }))
    .filter((slot) => slot.end > slot.start)
    .find((slot) => slot.end - Math.max(slot.start, nextDraft.startAt.getTime()) >= nextDraft.durationMinutes * 60 * 1000);
  if (!freeFit) {
    nextDraft.fitFound = false;
    return nextDraft;
  }
  const fittedStart = new Date(Math.max(freeFit.start, nextDraft.startAt.getTime()));
  nextDraft.startAt = fittedStart;
  nextDraft.endAt = new Date(fittedStart.getTime() + (nextDraft.durationMinutes * 60 * 1000));
  return nextDraft;
}

function updatePostponeFeedback() {
  const draftRaw = getPostponeDraftAction();
  const draft = draftRaw ? resolvePostponeDraftWithFreeFit(draftRaw) : null;
  if (!draft || !postponeFeedback) return;
  const overlaps = getPostponeOverlaps(draft.startAt, draft.endAt, draft.targetAction.id);
  stopPostponeFeedbackCarousel();
  postponeFeedback.classList.remove("is-error");
  if (!draft.fitFound) {
    postponeFeedback.classList.add("is-error");
    postponeFeedback.textContent = "Sem horários livres";
    if (confirmPostponeTask) {
      confirmPostponeTask.disabled = true;
      confirmPostponeTask.classList.remove("is-replace");
      confirmPostponeTask.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg><span>Sem horários livres</span>';
    }
    return;
  }
  if (!overlaps.length) {
    postponeFeedback.textContent = `Disponível: inicia ${formatHourChip(draft.startAt.toISOString())}`;
    if (confirmPostponeTask) {
      confirmPostponeTask.disabled = false;
      confirmPostponeTask.classList.remove("is-replace");
      confirmPostponeTask.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8.5-8.5 1.4 1.4z"/></svg><span>Confirmar adiamento</span>';
    }
    return;
  }
  postponeFeedback.classList.add("is-error");
  if (confirmPostponeTask) {
    confirmPostponeTask.disabled = false;
    confirmPostponeTask.classList.add("is-replace");
    confirmPostponeTask.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v2H4zm0 8h16v2H4zm0-4h16v2H4z"/></svg><span>Substituir</span>';
  }
  let index = 0;
  const render = () => {
    const current = overlaps[index];
    const title = formatActionTitleForDisplay(current.title);
    postponeFeedback.textContent = `Sobrepondo ${title}`;
    index = (index + 1) % overlaps.length;
  };
  render();
  if (overlaps.length > 1) {
    postponeFeedbackCarouselTimer = window.setInterval(render, 750);
  }
}

function renderPostponeTaskModal() {
  if (postponeTaskTitle) {
    const targetAction = state.actions.find((item) => item.id === state.postpone.actionId);
    postponeTaskTitle.textContent = formatActionTitleForDisplay(targetAction?.title || "Tarefa");
  }
  if (postponeDayLabel) {
    postponeDayLabel.textContent = formatPostponeDayLabel(state.postpone.dayOffset);
  }
  if (postponeTimeLabel) {
    postponeTimeLabel.textContent = state.postpone.dayOffset === 0
      ? formatPostponeDelayLabel(state.postpone.delayMinutes)
      : formatClockFromMinutes(state.postpone.clockMinutes);
  }
  updatePostponeFeedback();
}

function movePostponeSelector(type, dir, hold = false) {
  if (!dir) return;
  if (type === "day") {
    const previousOffset = state.postpone.dayOffset;
    state.postpone.dayOffset = Math.max(0, state.postpone.dayOffset + dir);
    if (previousOffset === 0 && state.postpone.dayOffset > 0) {
      state.postpone.clockMinutes = 8 * 60;
      state.postpone.timeTapTimestamps = [];
    }
    renderPostponeTaskModal();
    return;
  }
  if (state.postpone.dayOffset === 0) {
    const step = hold ? 10 : 5;
    state.postpone.delayMinutes = Math.max(0, state.postpone.delayMinutes + (dir * step));
  } else {
    const step = hold ? 60 : 1;
    state.postpone.clockMinutes = ((state.postpone.clockMinutes + (dir * step)) % (24 * 60) + (24 * 60)) % (24 * 60);
    if (!hold) {
      const now = Date.now();
      state.postpone.timeTapTimestamps = state.postpone.timeTapTimestamps.filter((ts) => now - ts <= 1000);
      state.postpone.timeTapTimestamps.push(now);
      if (state.postpone.timeTapTimestamps.length >= 4) {
        state.postpone.clockMinutes = ((state.postpone.clockMinutes + (dir * 6)) % (24 * 60) + (24 * 60)) % (24 * 60);
        state.postpone.timeTapTimestamps = [];
      }
    }
  }
  renderPostponeTaskModal();
}

function openPostponeTaskModal(action) {
  state.postpone.actionId = String(action?.id || "");
  state.postpone.dayOffset = 0;
  state.postpone.delayMinutes = 5;
  state.postpone.clockMinutes = 8 * 60;
  state.postpone.timeTapTimestamps = [];
  state.postpone.onlyFree = false;
  if (postponeOnlyFree) postponeOnlyFree.checked = false;
  renderPostponeTaskModal();
  postponeTaskModal?.classList.add("active");
  postponeTaskModal?.setAttribute("aria-hidden", "false");
}

async function applyPostponeTaskConfirm({ allowReplace = false } = {}) {
  const draftRaw = getPostponeDraftAction();
  const draft = draftRaw ? resolvePostponeDraftWithFreeFit(draftRaw) : null;
  if (!draft) {
    closePostponeTaskModalView();
    return;
  }
  if (state.postpone.onlyFree && !draft.fitFound) {
    return;
  }
  const overlaps = getPostponeOverlaps(draft.startAt, draft.endAt, draft.targetAction.id);
  if (overlaps.length && !allowReplace) {
    if (postponeReplaceList) {
      postponeReplaceList.textContent = overlaps.map((entry) => {
        const label = formatActionTitleForDisplay(entry.title);
        return `${label} (${formatHourChip(entry.startAt)}-${formatHourChip(entry.endAt)})`;
      }).join(" | ");
    }
    postponeReplaceModal?.classList.add("active");
    postponeReplaceModal?.setAttribute("aria-hidden", "false");
    return;
  }
  if (allowReplace && overlaps.length) {
    for (const entry of overlaps) {
      await apiRequest(`/api/actions/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    }
  }
  const payload = {
    title: draft.targetAction.title,
    assignee: draft.targetAction.assignee || state.selectedProfile,
    repeatRule: "none",
    repeatDays: [],
    occurrences: [{ startAt: draft.startAt.toISOString(), endAt: draft.endAt.toISOString() }]
  };
  await apiRequest("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  closePostponeReplaceModalView();
  closePostponeTaskModalView();
  await loadActions();
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

async function patchActionFull(action, next) {
  await apiRequest(`/api/actions/${encodeURIComponent(action.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: next.title,
      assignee: next.assignee,
      repeatRule: next.repeatRule || "none",
      repeatDays: Array.isArray(next.repeatDays) ? next.repeatDays : [],
      occurrences: [{ startAt: next.startAt, endAt: next.endAt }]
    })
  });
}

async function markActionAsGivenUp(action) {
  const nextTitle = isGivenUpAction(action) ? String(action.title || "Tarefa") : `${String(action.title || "Tarefa")} [DESISTIU]`;
  await patchActionFull(action, {
    ...action,
    title: nextTitle
  });
  let current = normalizeActionStatus(action.status);
  if (current === actionStatuses.pending) {
    await apiRequest(`/api/actions/${encodeURIComponent(action.id)}/status`, { method: "PATCH" });
    current = actionStatuses.inProgress;
  }
  if (current === actionStatuses.inProgress) {
    await apiRequest(`/api/actions/${encodeURIComponent(action.id)}/status`, { method: "PATCH" });
  }
}

async function ensureProject200Session() {
  const token = getToken();
  if (!token) {
    state.authUser = null;
    state.social.pendingCount = 0;
    state.social.self = null;
    state.social.incomingInvites = [];
    state.social.friends = [];
    renderSocialModal();
    project200LoginOverlay?.classList.add("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "false");
    unlockProject200Screen();
    clearScreenLockInactivityTimer();
    return false;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);
  try {
    const response = await runWithGlobalLoading(() => fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    }), {
      path: "/api/auth/me",
      iconSrc: loadingIconByArea.actions
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        setToken("");
        state.profileLock = "";
        state.authUser = null;
        state.social.pendingCount = 0;
        state.social.self = null;
        state.social.incomingInvites = [];
        state.social.friends = [];
        renderSocialModal();
        project200LoginOverlay?.classList.add("active");
        project200LoginOverlay?.setAttribute("aria-hidden", "false");
        unlockProject200Screen();
        clearScreenLockInactivityTimer();
      }
      return false;
    }
    state.authUser = payload?.user || null;
    refreshProfileLockFromAuth(payload?.user || null);
    project200LoginOverlay?.classList.remove("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "true");
    scheduleScreenLockInactivity();
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      state.profileLock = "";
      state.authUser = null;
      renderSocialModal();
      return false;
    }
    state.profileLock = "";
    state.authUser = null;
    state.social.pendingCount = 0;
    state.social.self = null;
    state.social.incomingInvites = [];
    state.social.friends = [];
    renderSocialModal();
    project200LoginOverlay?.classList.add("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "false");
    unlockProject200Screen();
    clearScreenLockInactivityTimer();
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

function updateActionInState(nextAction) {
  const actionId = String(nextAction?.id || "").trim();
  if (!actionId) {
    return;
  }
  state.actions = (Array.isArray(state.actions) ? state.actions : []).map((action) => (
    String(action?.id || "").trim() === actionId
      ? { ...action, ...nextAction }
      : action
  ));
}

function updateMissionInState(nextGoal) {
  const goalId = String(nextGoal?.id || "").trim();
  if (!goalId) {
    return;
  }
  state.missions = (Array.isArray(state.missions) ? state.missions : []).map((goal) => (
    String(goal?.id || "").trim() === goalId
      ? { ...goal, ...nextGoal }
      : goal
  ));
}

async function loadProject200Profiles() {
  const payload = await apiRequestWithTimeout("/api/200/profiles", {}, 7000);
  state.profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
  applySelectedProfile(readSelectedProfile());
  renderProfileFooter();
  renderHistorySpeakerSelectionOptions();
}

function shouldRefreshHomeSnapshot(force = false) {
  if (!getToken()) {
    return false;
  }
  if (force) {
    return true;
  }
  if (!state.serverNowMs || !state.homeSnapshotReady) {
    return true;
  }
  return (Date.now() - lastHomeSnapshotHydratedAtMs) > 45000;
}

async function refreshHomeSnapshot(options = {}) {
  const force = options?.force === true;
  if (!shouldRefreshHomeSnapshot(force)) {
    return;
  }
  if (homeSnapshotHydrationPromise) {
    return homeSnapshotHydrationPromise;
  }
  homeSnapshotHydrationPromise = (async () => {
    try {
      if (!getProfilesList().length) {
        try {
          await loadProject200Profiles();
        } catch {}
      }
      state.homeSnapshotReady = false;
      await loadActions();
      await loadSocialSnapshot({
        skipGlobalLoading: true,
        silent: true
      });
      if (!state.homeSnapshotReady) {
        throw new Error("HOME_SNAPSHOT_PENDING");
      }
      lastHomeSnapshotHydratedAtMs = Date.now();
      revealInitialHomeIfReady();
    } catch {
      if (startupLoadingActive && getToken() && !homeBootstrapRetryTimer) {
        homeBootstrapRetryTimer = window.setTimeout(() => {
          homeBootstrapRetryTimer = null;
          void refreshHomeSnapshot({ force: true });
        }, 600);
      }
      renderHomeRunningTask();
    } finally {
      homeSnapshotHydrationPromise = null;
    }
  })();
  return homeSnapshotHydrationPromise;
}

async function ensureRunningSurfaceSnapshot() {
  if (state.homeSnapshotReady) {
    return;
  }
  if (homeSnapshotHydrationPromise) {
    await homeSnapshotHydrationPromise;
  }
  if (!state.homeSnapshotReady) {
    await loadActions({ silent: true });
  }
  renderHomeRunningTask();
}

async function createProject200ProfileFromModal() {
  const name = String(project200CreateProfileNameInput?.value || "").trim();
  if (!name) {
    if (project200CreateProfileMessage) {
      project200CreateProfileMessage.textContent = "Digite o nome do usuário.";
    }
    return;
  }
  const payload = await apiRequest("/api/200/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (project200CreateProfileMessage) {
    project200CreateProfileMessage.textContent = "";
  }
  if (project200CreateProfileNameInput) {
    project200CreateProfileNameInput.value = "";
  }
  if (payload?.profile) {
    state.profiles = [...getProfilesList(), payload.profile];
  }
  renderProfileFooter();
  renderHistorySpeakerSelectionOptions();
  closeModal("project200CreateProfileModal");
}

function openProfileManageOverlay(profileName) {
  const profile = getProfileByName(profileName);
  profileManageTargetId = String(profile?.id || "").trim();
  if (!profileManageTargetId) {
    return;
  }
  if (profileManageMessage) {
    profileManageMessage.textContent = "";
  }
  if (profileDeleteConfirmInput) {
    profileDeleteConfirmInput.value = "";
  }
  renderProfileManageOverlay();
  profileManageOverlay?.classList.add("active");
  profileManageOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => profileManageCancel?.focus(), 40);
}

function closeProfileManageOverlay() {
  profileManageOverlay?.classList.remove("active");
  profileManageOverlay?.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".workspace-modal.active")) {
    document.body.classList.remove("modal-open");
  }
  profileManageTargetId = "";
}

function updateProfileInState(nextProfile) {
  if (!nextProfile?.id) {
    return;
  }
  state.profiles = getProfilesList().map((profile) => (
    profile.id === nextProfile.id
      ? { ...profile, ...nextProfile }
      : profile
  ));
}

function resetProfileAvatarModal() {
  profileAvatarReferenceFile = null;
  profileAvatarReferenceDataUrl = "";
  profileAvatarBusy = false;
  if (profileAvatarFileInput) {
    profileAvatarFileInput.value = "";
  }
  if (profileAvatarFileName) {
    profileAvatarFileName.textContent = "Nenhum arquivo selecionado";
  }
  if (profileAvatarMessage) {
    profileAvatarMessage.textContent = "";
  }
}

function renderProfileAvatarModal() {
  const profile = getProfileById(profileAvatarTargetId) || getProfileByName(state.selectedProfile) || getDefaultProfile();
  if (!profile) {
    return;
  }
  if (profileAvatarModalTitle) {
    profileAvatarModalTitle.textContent = `Foto de ${profile.name}`;
  }
  if (profileAvatarModalHint) {
    profileAvatarModalHint.textContent = `Envie uma foto de ${profile.name} para usar direto no perfil, gerar uma versao estilo Disney Pixar com o gpt-image-1, ou toque no preview para deixar a IA escolher um SVG.`;
  }
  if (profileAvatarPreview) {
    profileAvatarPreview.src = profileAvatarReferenceDataUrl || getProfileSvgIconPath(profile) || getProfileAvatarPath(profile);
    profileAvatarPreview.alt = `Preview de ${profile.name}`;
  }
  if (profileAvatarFileName) {
    profileAvatarFileName.textContent = profileAvatarReferenceFile?.name || "Nenhum arquivo selecionado";
  }
  if (profileAvatarGenerateButton) {
    profileAvatarGenerateButton.disabled = profileAvatarBusy || !profileAvatarReferenceFile;
    profileAvatarGenerateButton.textContent = profileAvatarBusy ? "Gerando..." : "Gerar foto Pixar";
  }
  if (profileAvatarUploadButton) {
    profileAvatarUploadButton.disabled = profileAvatarBusy || !profileAvatarReferenceFile;
    profileAvatarUploadButton.textContent = profileAvatarBusy ? "Salvando..." : "Usar foto enviada";
  }
}

async function readFileAsDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    reader.readAsDataURL(file);
  });
}

function openProfileAvatarModal(profileName) {
  const profile = getProfileByName(profileName);
  profileAvatarTargetId = String(profile?.id || "").trim();
  if (!profileAvatarTargetId) {
    return;
  }
  resetProfileAvatarModal();
  renderProfileAvatarModal();
  openModal("profileAvatarModal");
}

async function submitProfileAvatarGeneration() {
  const profile = getProfileById(profileAvatarTargetId) || getProfileByName(state.selectedProfile);
  if (!profile) {
    return;
  }
  if (!profileAvatarReferenceFile) {
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = "Escolha uma foto antes de gerar.";
    }
    renderProfileAvatarModal();
    return;
  }

  const token = getToken();
  if (!token) {
    redirectToProject200Login();
    return;
  }

  profileAvatarBusy = true;
  if (profileAvatarMessage) {
    profileAvatarMessage.textContent = "Gerando foto Pixar...";
  }
  renderProfileAvatarModal();

  try {
    const response = await runWithGlobalLoading(() => fetch(getApiUrl(`/api/200/profiles/${encodeURIComponent(profile.id)}/avatar/generate`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": profileAvatarReferenceFile.type || "application/octet-stream"
      },
      body: profileAvatarReferenceFile
    }), {
      path: "/api/200/profiles/avatar/generate",
      iconSrc: loadingIconByArea.options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Nao foi possivel gerar a foto do usuario.");
    }
    if (payload?.profile) {
      updateProfileInState(payload.profile);
      renderProfileFooter();
      renderHistorySpeakerSelectionOptions();
      renderActions();
      renderMissions();
      renderHomeRunningTask();
    }
    profileAvatarReferenceFile = null;
    profileAvatarReferenceDataUrl = "";
    if (profileAvatarFileInput) {
      profileAvatarFileInput.value = "";
    }
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = "Foto atualizada com sucesso.";
    }
    renderProfileAvatarModal();
  } catch (error) {
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = error instanceof Error ? error.message : "Falha ao gerar a foto.";
    }
  } finally {
    profileAvatarBusy = false;
    renderProfileAvatarModal();
  }
}

async function submitProfileAvatarUpload() {
  const profile = getProfileById(profileAvatarTargetId) || getProfileByName(state.selectedProfile);
  if (!profile) {
    return;
  }
  if (!profileAvatarReferenceFile) {
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = "Escolha uma foto antes de salvar.";
    }
    renderProfileAvatarModal();
    return;
  }

  const token = getToken();
  if (!token) {
    redirectToProject200Login();
    return;
  }

  profileAvatarBusy = true;
  if (profileAvatarMessage) {
    profileAvatarMessage.textContent = "Salvando foto do perfil...";
  }
  renderProfileAvatarModal();

  try {
    const response = await runWithGlobalLoading(() => fetch(getApiUrl(`/api/200/profiles/${encodeURIComponent(profile.id)}/avatar/upload`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": profileAvatarReferenceFile.type || "application/octet-stream"
      },
      body: profileAvatarReferenceFile
    }), {
      path: "/api/200/profiles/avatar/upload",
      iconSrc: loadingIconByArea.options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Nao foi possivel salvar a foto do usuario.");
    }
    if (payload?.profile) {
      updateProfileInState(payload.profile);
      renderProfileFooter();
      renderHistorySpeakerSelectionOptions();
      renderActions();
      renderMissions();
      renderHomeRunningTask();
    }
    profileAvatarReferenceFile = null;
    profileAvatarReferenceDataUrl = "";
    if (profileAvatarFileInput) {
      profileAvatarFileInput.value = "";
    }
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = "Foto atualizada com sucesso.";
    }
    renderProfileAvatarModal();
  } catch (error) {
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = error instanceof Error ? error.message : "Falha ao salvar a foto.";
    }
  } finally {
    profileAvatarBusy = false;
    renderProfileAvatarModal();
  }
}

async function submitProfileSvgSuggestion() {
  const profile = getProfileById(profileAvatarTargetId) || getProfileByName(state.selectedProfile);
  if (!profile || profileSvgSuggestBusy) {
    return;
  }
  const token = getToken();
  if (!token) {
    redirectToProject200Login();
    return;
  }
  profileSvgSuggestBusy = true;
  if (profileAvatarMessage) {
    profileAvatarMessage.textContent = "Escolhendo SVG...";
  }
  try {
    const response = await runWithGlobalLoading(() => fetch(getApiUrl(`/api/200/profiles/${encodeURIComponent(profile.id)}/svg-icon/suggest`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: profile.name })
    }), {
      path: "/api/200/profiles/svg-icon/suggest",
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Falha ao escolher o SVG.");
    }
    if (payload?.profile) {
      state.profiles = (Array.isArray(state.profiles) ? state.profiles : []).map((item) => (
        String(item?.id || "") === String(payload.profile.id || "") ? payload.profile : item
      ));
      await loadActions();
      await loadMissions();
      renderMissions();
      renderProfileFooter();
      renderHomeProfileHero();
      renderProfileAvatarModal();
    }
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = `SVG escolhido: ${String(payload?.asset?.label || "ícone")}.`;
    }
  } catch (error) {
    if (profileAvatarMessage) {
      profileAvatarMessage.textContent = error instanceof Error ? error.message : "Falha ao escolher o SVG.";
    }
  } finally {
    profileSvgSuggestBusy = false;
  }
}

async function deleteManagedProfile() {
  const profile = getProfileById(profileManageTargetId);
  if (!profile) {
    return;
  }
  const payload = await apiRequest(`/api/200/profiles/${encodeURIComponent(profile.id)}`, {
    method: "DELETE"
  });
  state.profiles = getProfilesList().filter((item) => item.id !== profile.id);
  const fallbackProfileName = String(payload?.fallbackProfileName || getDefaultProfileName()).trim() || getDefaultProfileName();
  if (state.selectedProfile === profile.name) {
    applySelectedProfile(fallbackProfileName);
  }
  if (state.historyTextComposer.speaker === profile.name) {
    state.historyTextComposer.speaker = fallbackProfileName;
  }
  renderProfileFooter();
  renderHistorySpeakerSelectionOptions();
  closeProfileManageOverlay();
  await loadActions();
}

function openProfileRenameModal() {
  const profile = getProfileByName(state.selectedProfile) || getDefaultProfile();
  if (!profile) {
    return;
  }
  profileRenameTargetId = String(profile.id || "").trim();
  if (profileRenameInput) {
    profileRenameInput.value = String(profile.name || "");
  }
  if (profileRenameMessage) {
    profileRenameMessage.textContent = "";
  }
  openModal("profileRenameModal");
}

async function saveProfileRename() {
  const profile = getProfileById(profileRenameTargetId) || getProfileByName(state.selectedProfile);
  if (!profile) {
    return;
  }
  if (profileRenameMessage) {
    profileRenameMessage.textContent = "Salvando...";
  }
  if (profileRenameConfirmButton) {
    profileRenameConfirmButton.disabled = true;
  }
  try {
    const payload = await apiRequest(`/api/200/profiles/${encodeURIComponent(profile.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(profileRenameInput?.value || "")
      })
    });
    const renamed = payload?.profile || null;
    if (renamed) {
      state.profiles = getProfilesList().map((item) => item.id === renamed.id ? renamed : item);
      if (state.selectedProfile === profile.name) {
        applySelectedProfile(renamed.name);
      }
      if (state.historyTextComposer.speaker === profile.name) {
        state.historyTextComposer.speaker = renamed.name;
      }
      renderProfileFooter();
      renderHistorySpeakerSelectionOptions();
    }
    if (profileRenameMessage) {
      profileRenameMessage.textContent = "Nome salvo.";
    }
    await loadActions();
    window.setTimeout(() => closeModal("profileRenameModal"), 250);
  } catch (error) {
    if (profileRenameMessage) {
      profileRenameMessage.textContent = error instanceof Error ? error.message : "Falha ao salvar nome.";
    }
  } finally {
    if (profileRenameConfirmButton) {
      profileRenameConfirmButton.disabled = false;
    }
  }
}

async function reassignManagedProfileTasks() {
  const target = getProfileByName(state.selectedProfile) || getProfileById(profileManageTargetId);
  const sourceId = String(profileReassignSelect?.value || "").trim();
  const source = getProfileById(sourceId);
  if (!source || !target) {
    return;
  }
  const payload = await apiRequest("/api/200/profiles/reassign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceProfileId: source.id,
      targetProfileId: target.id
    })
  });
  if (profileManageMessage) {
    profileManageMessage.textContent = payload?.summary
      ? `${payload.summary.movedTasks} tarefa(s) de ${payload.summary.sourceProfileName} agora estão com ${payload.summary.targetProfileName}.`
      : "";
  }
  await loadActions();
}

function renderRepeatControls() {
  const repeatMode = normalizeRepeatMode(state.wizard.repeatMode);
  repeatBox.hidden = !state.wizard.repeatOpen;
  if (repeatTypeTabs) {
    repeatTypeTabs.querySelectorAll("[data-repeat-open]").forEach((button) => {
      button.classList.toggle("active", button.dataset.repeatOpen === String(state.wizard.repeatOpen));
    });
  }

  document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
    button.classList.toggle("active", normalizeRepeatMode(button.dataset.repeatMode) === repeatMode);
  });
  const showingDetailMode = repeatMode === "weekly" || repeatMode === "periodic" || repeatMode === "monthly_custom";
  if (wizardDatePickerWrap) {
    wizardDatePickerWrap.hidden = Boolean(state.wizard.repeatOpen);
  }
  if (repeatModeButtons) {
    repeatModeButtons.hidden = !state.wizard.repeatOpen || showingDetailMode;
  }
  if (repeatModeBackButton) {
    repeatModeBackButton.hidden = !state.wizard.repeatOpen || !showingDetailMode;
  }

  weekdayRow.innerHTML = "";
  weekdayRow.hidden = repeatMode !== "weekly";
  weekdayLabels.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.weekday = String(index);
    button.classList.toggle("active", state.wizard.repeatDays.includes(index));
    weekdayRow.appendChild(button);
  });
  if (repeatPeriodicBox) {
    repeatPeriodicBox.hidden = repeatMode !== "periodic";
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
    repeatMonthlyCustomBox.hidden = repeatMode !== "monthly_custom";
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
    const timeValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    container.innerHTML = `
      <div class="native-time-picker">
        <button class="native-time-trigger" type="button" data-open-native-time="${type}" aria-label="Escolher horário ${type === "start" ? "inicial" : "final"}">
          <strong>${timeValue}</strong>
          <span>Toque para abrir o relógio</span>
        </button>
        <input class="native-time-input" type="time" value="${timeValue}" step="60" data-native-time-input="${type}" aria-hidden="true" tabindex="-1" />
      </div>
    `;
  });
}

function openNativeTimePicker(type) {
  const input = actionForm?.querySelector(`[data-native-time-input="${type}"]`);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.focus();
  input.click();
}

function applyNativeTimeValue(type, value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) {
    return;
  }
  const [, hourText, minuteText] = match;
  if (type === "start") {
    state.wizard.startHour = Number(hourText);
    state.wizard.startMinute = Number(minuteText);
  } else {
    state.wizard.endHour = Number(hourText);
    state.wizard.endMinute = Number(minuteText);
  }
  renderTimePickers();
}

function setRepeatMode(mode) {
  const normalizedMode = normalizeRepeatMode(mode);
  const currentMode = normalizeRepeatMode(state.wizard.repeatMode);
  state.wizard.repeatOpen = true;
  if (currentMode !== normalizedMode) {
    state.wizard.repeatDays = [...(recurrenceDays[normalizedMode] || [])];
  }
  state.wizard.repeatMode = normalizedMode;
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
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
  state.wizard.repeatMode = state.wizard.repeatDays.length ? "weekly" : "none";
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
  renderRepeatControls();
}

function moveWizardDate(amount) {
  state.wizard.dateOffset += amount;
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
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

  if (state.wizard.step === 2 && state.wizard.repeatOpen && normalizeRepeatMode(state.wizard.repeatMode) === "weekly" && !state.wizard.repeatDays.length) {
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
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
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
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
  renderRepeatControls();
}

function shiftMonthlyWeekday(direction) {
  state.wizard.monthlyWeekdayIndex = (state.wizard.monthlyWeekdayIndex + direction + monthlyWeekdayLabels.length) % monthlyWeekdayLabels.length;
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
  renderRepeatControls();
}

function buildOccurrences() {
  const selectedDate = dateFromOffset(state.wizard.dateOffset);
  const firstStart = buildDateWithTime(selectedDate, state.wizard.startHour, state.wizard.startMinute);
  const firstEnd = buildDateWithTime(selectedDate, state.wizard.endHour, state.wizard.endMinute);
  const repeatMode = normalizeRepeatMode(state.wizard.repeatMode);
  if (firstEnd <= firstStart) {
    throw new Error("O horario final precisa ser depois do inicial.");
  }

  if (!state.wizard.repeatOpen || repeatMode === "none") {
    return [{ startAt: firstStart.toISOString(), endAt: firstEnd.toISOString() }];
  }

  const allowedDays = repeatMode === "weekly"
    ? state.wizard.repeatDays
    : recurrenceDays[repeatMode] || [];
  const occurrences = [];

  if (repeatMode === "periodic") {
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

  if (repeatMode === "monthly_custom") {
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

function computeOverlapsForOccurrences(occurrences, options = {}) {
  const existing = getVisibleActions();
  const excludeGroupId = String(options.excludeGroupId || "").trim();
  const collisions = [];
  for (const item of occurrences) {
    const startMs = new Date(item.startAt).getTime();
    const endMs = new Date(item.endAt).getTime();
    const hit = existing.filter((action) => {
      if (state.wizard.editingActionId && action.id === state.wizard.editingActionId) return false;
      if (excludeGroupId && String(action.repeatGroupId || "") === excludeGroupId) return false;
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
    const reopenStartDecisionActionId = state.wizard.returnToStartDecision
      ? String(state.wizard.editingActionId || "")
      : "";
    const reopenTaskComposer = state.wizard.returnMode === "task-composer";
    const editingAction = state.wizard.editingActionId ? findActionById(state.wizard.editingActionId) : null;
    const repeatRule = state.wizard.repeatOpen ? normalizeRepeatMode(state.wizard.repeatMode) : "none";
    const repeatDays = repeatRule === "weekly"
      ? state.wizard.repeatDays
      : recurrenceDays[repeatRule] || [];

    const requestPath = state.wizard.editingActionId
      ? `/api/actions/${encodeURIComponent(state.wizard.editingActionId)}`
      : "/api/actions";
    const requestMethod = state.wizard.editingActionId ? "PATCH" : "POST";
    let applyTo = "single";

    let occurrences = buildOccurrences();
    if (editingAction && editingAction.repeatGroupId) {
      const choice = window.prompt("1 - Editar uma tarefa\n2 - Editar todas as tarefas", "2");
      if (choice == null) {
        wizardMessage.textContent = "";
        return;
      }
      applyTo = String(choice).trim() === "1" ? "single" : "series";
    } else if (!editingAction && (repeatRule !== "none" || occurrences.length > 1)) {
      applyTo = "series";
    }
    const overlaps = computeOverlapsForOccurrences(occurrences, {
      excludeGroupId: applyTo === "series" ? String(editingAction?.repeatGroupId || "") : ""
    });
    if (overlaps.length) {
      let replaceOverlaps = false;
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
        replaceOverlaps = true;
        for (const item of overlaps) {
          await apiRequest(`/api/actions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        }
      }
      state.wizard.replaceOverlaps = replaceOverlaps;
    } else {
      state.wizard.replaceOverlaps = false;
    }

    const payload = await apiRequest(requestPath, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: taskTitle.value.trim(),
        assignee: getWizardAssigneeName(),
        categoryId: String(state.wizard.categoryId || "").trim().toLowerCase(),
        svgIconUrl: String(state.wizard.svgIconUrl || "").trim(),
        svgIconLabel: String(state.wizard.svgIconLabel || "").trim(),
        repeatRule,
        repeatDays,
        applyTo,
        replaceOverlaps: Boolean(state.wizard.replaceOverlaps || state.wizard.forceReplaceOverlaps),
        occurrences: occurrences
      })
    });
    state.wizard.forceReplaceOverlaps = false;
    const updatedActionId = String(payload?.action?.id || payload?.actions?.[0]?.id || state.wizard.editingActionId || "").trim();

    state.activeOffset = state.wizard.dateOffset;
    closeWizard();
    await loadActions();
    if (reopenTaskComposer) {
      const action = findActionById(updatedActionId);
      openTaskComposer(action || null);
      return;
    }
    if (reopenStartDecisionActionId) {
      reopenStartDecisionForAction(reopenStartDecisionActionId);
    }
  } catch (error) {
    if (error?.code === "ACTION_OVERLAP" && Array.isArray(error?.overlaps) && error.overlaps.length) {
      const occurrences = buildOccurrences();
      const decision = await openOverlapWizard(error.overlaps, occurrences);
      if (decision?.type === "replace") {
        state.wizard.forceReplaceOverlaps = true;
        wizardMessage.textContent = "";
        return saveAction();
      }
      if (decision?.type === "change_time") {
        state.wizard.step = 3;
        renderWizard();
        return;
      }
      if (decision?.type === "use_free" && decision.startAt) {
        const start = new Date(decision.startAt);
        const firstOccurrence = occurrences[0];
        const durationMs = firstOccurrence ? Math.max(60000, new Date(firstOccurrence.endAt).getTime() - new Date(firstOccurrence.startAt).getTime()) : 900000;
        const end = new Date(start.getTime() + durationMs);
        state.wizard.startHour = start.getHours();
        state.wizard.startMinute = start.getMinutes();
        state.wizard.endHour = end.getHours();
        state.wizard.endMinute = end.getMinutes();
        state.wizard.forceReplaceOverlaps = false;
        return saveAction();
      }
      wizardMessage.textContent = "Ajuste o horário para continuar.";
      return;
    }
    state.wizard.forceReplaceOverlaps = false;
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

function normalizePartialTaskPercent(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric / 10) * 10));
}

function getSuggestedPartialTaskPercent(action) {
  const storedPercent = getActionStoredCompletionPercent(action);
  const plannedSeconds = Math.max(1, getActionDurationMinutes(action) * 60);
  const accumulatedSeconds = Math.max(0, Number(action?.accumulatedSeconds || 0));
  const startedAtMs = new Date(action?.startedAt || "").getTime();
  const runningSeconds = normalizeActionStatus(action?.status) === actionStatuses.inProgress && Number.isFinite(startedAtMs)
    ? Math.max(0, (getServerNowMs() - startedAtMs) / 1000)
    : 0;
  const elapsedPercent = Math.floor(((accumulatedSeconds + runningSeconds) / plannedSeconds) * 100);
  return normalizePartialTaskPercent(Math.max(storedPercent, elapsedPercent));
}

function renderPartialTaskPercent() {
  if (!partialTaskPercent) return;
  partialTaskPercent.textContent = `${partialTaskPercentValue}%`;
  partialTaskPercent.setAttribute("aria-valuenow", String(partialTaskPercentValue));
}

function adjustPartialTaskPercent(direction) {
  partialTaskPercentValue = normalizePartialTaskPercent(partialTaskPercentValue + (Number(direction || 0) * 10));
  renderPartialTaskPercent();
}

function stopPartialTaskPercentHold() {
  if (partialTaskHoldTimeout) {
    window.clearTimeout(partialTaskHoldTimeout);
    partialTaskHoldTimeout = null;
  }
  if (partialTaskHoldInterval) {
    window.clearInterval(partialTaskHoldInterval);
    partialTaskHoldInterval = null;
  }
  partialTaskDecreaseButton?.classList.remove("is-holding");
  partialTaskIncreaseButton?.classList.remove("is-holding");
}

function bindPartialTaskPercentButton(button, direction) {
  if (!button) return;
  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && Number(event.button) !== 0) return;
    event.preventDefault();
    stopPartialTaskPercentHold();
    adjustPartialTaskPercent(direction);
    partialTaskHoldTimeout = window.setTimeout(() => {
      button.classList.add("is-holding");
      adjustPartialTaskPercent(direction);
      partialTaskHoldInterval = window.setInterval(() => {
        adjustPartialTaskPercent(direction);
      }, 300);
    }, 300);
    try {
      button.setPointerCapture(event.pointerId);
    } catch {}
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, stopPartialTaskPercentHold);
  });
  button.addEventListener("click", (event) => {
    if (event.detail === 0) adjustPartialTaskPercent(direction);
  });
}

function requestPartialTaskPercent(action) {
  stopPartialTaskPercentHold();
  if (partialTaskResolver) {
    partialTaskResolver(null);
    partialTaskResolver = null;
  }
  partialTaskPercentValue = getSuggestedPartialTaskPercent(action);
  renderPartialTaskPercent();
  openModal("partialTaskModal");
  return new Promise((resolve) => {
    partialTaskResolver = resolve;
  });
}

async function pauseActionPartially(actionId, completionPercent) {
  const payload = await apiRequest(`/api/actions/${encodeURIComponent(actionId)}/status/manual`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "pause",
      completionPercent: normalizePartialTaskPercent(completionPercent)
    })
  });
  const updated = payload?.action || null;
  if (!updated) {
    throw new Error("Nao foi possivel pausar a tarefa.");
  }
  state.actions = state.actions.map((item) => (String(item.id) === String(actionId) ? updated : item));
  delete state.runningLocalStarts[String(actionId || "")];
  renderActions();
  renderHomeRunningTask();
  return { action: updated, pointsUpdate: payload?.pointsUpdate || null };
}

async function pauseActionWithSelectedProgress(action) {
  const completionPercent = await requestPartialTaskPercent(action);
  if (completionPercent == null) return null;
  const result = await pauseActionPartially(String(action?.id || ""), completionPercent);
  enqueueActionPointsUpdateFeedback(result?.pointsUpdate, 100);
  return result;
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
  enqueueActionPointsUpdateFeedback(payload?.pointsUpdate, 100);
  renderActions();
  renderMissions();
  return payload;
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
  enqueueActionPointsUpdateFeedback(payload?.pointsUpdate, 250);
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
  showDbLoadingState(platformEntriesList, 220);

  try {
    const [entriesPayload, monthPayload, platformPayload] = await Promise.all([
      apiRequest(`/api/platform/entries?from=${encodeURIComponent(startOfDayIso(date))}&to=${encodeURIComponent(nextDayIso(date))}`),
      apiRequest(`/api/platform/summary?date=${encodeURIComponent(getPlatformMonthReferenceDate())}`),
      apiRequest("/api/200/finance/personal?period=total")
    ]);

    state.platformEntries = entriesPayload.entries || [];
    state.platformMonthly = monthPayload.summary || { incomeCents: 0, expenseCents: 0 };
    state.platformBaseIncomeCents = Number(platformPayload?.summary?.incomeCents || 0);
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
  startDecisionMicButton?.classList.remove("is-active");
}

function formatRepeatLabel(repeatRule, repeatDays) {
  if (repeatRule === "daily") {
    return "Diariamente";
  }
  if (repeatRule === "weekly" || repeatRule === "custom") {
    if (Array.isArray(repeatDays) && repeatDays.length) {
      const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      return `Semanalmente (${repeatDays.map((day) => names[day] || day).join(", ")})`;
    }
    return "Semanalmente";
  }
  if (repeatRule === "periodic") {
    return `A cada ${state.wizard.periodicEveryDays} dias`;
  }
  if (repeatRule === "monthly_custom") {
    return `Toda ${monthlyOrdinalLabels[state.wizard.monthlyOrdinalIndex]} ${monthlyWeekdayLabels[state.wizard.monthlyWeekdayIndex]}`;
  }
  return "Data única";
}

function formatActionMusicDecisionLabel(action) {
  const title = String(action?.title || taskTitle?.value || "").trim();
  const preference = getRunningDefaultPreferenceForTaskTitle(title);
  const mode = String(action?.musicDefaultMode || preference?.mode || "").trim().toLowerCase();
  const stationName = String(action?.musicStationName || preference?.stationName || "").trim();
  const trackName = String(action?.musicTrackName || preference?.trackName || "").trim();
  if (mode === "station" && stationName) {
    return `Música padrão da atividade: ${stationName}`;
  }
  if (trackName) {
    return `Música padrão da atividade: ${trackName}`;
  }
  return "Definir música";
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
  state.wizard.categoryId = String(entry?.categoryId || state.wizard.categoryId || "").trim().toLowerCase();
  state.wizard.categoryName = getTaskCategoryName(state.wizard.categoryId);
  state.wizard.startHour = Math.max(0, Math.min(23, Number(entry?.startHour || state.wizard.startHour)));
  state.wizard.startMinute = Math.max(0, Math.min(55, Math.round(Number(entry?.startMinute || state.wizard.startMinute) / 5) * 5));
  state.wizard.endHour = Math.max(0, Math.min(23, Number(entry?.endHour || state.wizard.endHour)));
  state.wizard.endMinute = Math.max(0, Math.min(55, Math.round(Number(entry?.endMinute || state.wizard.endMinute) / 5) * 5));
  state.wizard.repeatOpen = String(entry?.repeatRule || "none") !== "none";
  state.wizard.repeatMode = normalizeRepeatMode(String(entry?.repeatRule || "none"));
  state.wizard.repeatDays = Array.isArray(entry?.repeatDays) ? entry.repeatDays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6) : [];
  renderActionCategoryPicker();
  void interpretActionCategoryFromTitle(taskTitle.value);
  if (isTaskComposerMode()) {
    markTaskComposerDirty();
    renderTaskComposerModal();
    return;
  }
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
        if (isTaskComposerMode()) {
          applyInterpretedAction(actionPendingAiPayload || {});
          actionVoiceStatus.textContent = "Campos preenchidos.";
        } else {
          renderActionAiConfirmation(actionPendingAiPayload || {});
          actionVoiceStatus.textContent = "Tarefa pronta. Confirme abaixo.";
        }
      } catch (error) {
        actionVoiceStatus.textContent = error instanceof Error ? error.message : "Falha na interpretação.";
      }
    };
    actionMediaRecorder.start();
    actionMicButton?.classList.remove("mic-idle");
    actionMicButton?.classList.add("mic-active");
    startDecisionMicButton?.classList.add("is-active");
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

function getStatsScopeDays(scope = getActiveStatsScope()) {
  const key = String(scope?.key || "today").trim();
  if (key === "last30") return 30;
  if (key === "last15") return 15;
  if (key === "last7") return 7;
  return 1;
}

function renderStatsScopeControls() {
  const scope = getActiveStatsScope();
  if (statsScopeLabel) statsScopeLabel.textContent = scope.label;
  if (statsScopePrevButton) statsScopePrevButton.disabled = state.statsScopeIndex <= 0;
  if (statsScopeNextButton) statsScopeNextButton.disabled = state.statsScopeIndex >= statsScopes.length - 1;
}

function moveStatsScope(amount) {
  const nextIndex = Math.max(0, Math.min(statsScopes.length - 1, state.statsScopeIndex + amount));
  if (nextIndex === state.statsScopeIndex) {
    renderStatsScopeControls();
    return;
  }
  state.statsScopeIndex = nextIndex;
  renderStatsScopeControls();
  void loadStatsSummary();
}

function renderMissionSummary() {
  const summary = state.statsPointsOverview || { total: 0, last7: 0, last30: 0 };
  if (statsMissionTotal) {
    statsMissionTotal.textContent = String(Number(summary.total || 0));
  }
  if (statsMissionCompleted) {
    statsMissionCompleted.textContent = String(Number(summary.last7 || 0));
  }
  if (statsMissionPending) {
    statsMissionPending.textContent = String(Number(summary.last30 || 0));
  }
}

function buildStatsRankingFromSummary() {
  const byAssignee = state.statsSummary?.byAssignee || {};
  const ranking = [];
  const orderedNames = [...new Set([
    ...(Array.isArray(state.statsGlobalProfiles) ? state.statsGlobalProfiles : []).map((profile) => profile.name),
    ...Object.keys(byAssignee || {})
  ])];
  for (const name of orderedNames) {
    const item = byAssignee[name] || { totalMinutes: 0, completedMinutes: 0 };
    const completed = Number(item.completedMinutes || 0);
    const lateStartMinutes = Number(item.lateStartMinutes || 0);
    const payload = {
      name,
      completed,
      lateStartMinutes
    };
    ranking.push(payload);
  }

  ranking.sort((left, right) => {
    if (right.completed !== left.completed) {
      return right.completed - left.completed;
    }
    if (left.lateStartMinutes !== right.lateStartMinutes) {
      return left.lateStartMinutes - right.lateStartMinutes;
    }
    return left.name.localeCompare(right.name, "pt-BR");
  });

  state.statsRanking = ranking;
}

function mixPointColor(start, end, ratio) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio || 0)));
  const left = start.replace("#", "");
  const right = end.replace("#", "");
  const lr = parseInt(left.slice(0, 2), 16);
  const lg = parseInt(left.slice(2, 4), 16);
  const lb = parseInt(left.slice(4, 6), 16);
  const rr = parseInt(right.slice(0, 2), 16);
  const rg = parseInt(right.slice(2, 4), 16);
  const rb = parseInt(right.slice(4, 6), 16);
  const red = Math.round(lr + (rr - lr) * safeRatio);
  const green = Math.round(lg + (rg - lg) * safeRatio);
  const blue = Math.round(lb + (rb - lb) * safeRatio);
  return `rgb(${red}, ${green}, ${blue})`;
}

function getPointProgressColor(percent) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  const stops = [
    { percent: 0, color: "#dc2626" },
    { percent: 25, color: "#f97316" },
    { percent: 45, color: "#facc15" },
    { percent: 60, color: "#f59e0b" },
    { percent: 80, color: "#2dd4bf" },
    { percent: 100, color: "#16a34a" }
  ];
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const current = stops[index];
    if (safePercent <= current.percent) {
      const ratio = (safePercent - previous.percent) / Math.max(1, current.percent - previous.percent);
      return mixPointColor(previous.color, current.color, ratio);
    }
  }
  return stops[stops.length - 1].color;
}

function isSleepStatsCategory(categoryId) {
  return String(categoryId || "").trim().toLowerCase() === "sono";
}

function formatSleepTimerValue(totalSeconds) {
  const safeTotalSeconds = Math.max(0, Math.trunc(Number(totalSeconds || 0) || 0));
  const totalMinutes = Math.max(0, Math.ceil(safeTotalSeconds / 60));
  const hours = Math.trunc(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    hoursText: String(hours).padStart(2, "0"),
    minutesText: String(minutes).padStart(2, "0")
  };
}

function getStatsAspectConfigEntry(categoryId) {
  const normalized = String(categoryId || "").trim().toLowerCase();
  const fallback = statsPointCategories.find((entry) => entry.id === normalized) || null;
  const config = state.statsAspectConfig?.[normalized] || {};
  return {
    targetMinutes: Math.max(1, Math.trunc(Number(config.targetMinutes || fallback?.targetPoints || 1) || 1)),
    missionGoalIds: isSleepStatsCategory(normalized)
      ? []
      : Array.isArray(config.missionGoalIds)
      ? [...new Set(config.missionGoalIds.map((item) => String(item || "").trim()).filter(Boolean))]
      : (String(config.missionGoalId || "").trim() ? [String(config.missionGoalId || "").trim()] : [])
  };
}

function getCurrentMissionGoalById(goalId) {
  const normalized = String(goalId || "").trim();
  if (!normalized) {
    return null;
  }
  return (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item?.id || "") === normalized) || null;
}

function getCurrentMissionGoalsByIds(goalIds) {
  const ids = Array.isArray(goalIds) ? goalIds : [];
  return ids
    .map((goalId) => getCurrentMissionGoalById(goalId))
    .filter(Boolean);
}

function getVisibleCategoryTaskMinutes(categoryId) {
  const normalized = String(categoryId || "").trim().toLowerCase();
  return getVisibleActions()
    .filter((action) => String(action?.categoryId || "").trim().toLowerCase() === normalized)
    .reduce((sum, action) => sum + getActionDurationMinutes(action), 0);
}

const MISSION_MAX_DURATION_MINUTES = 180;
const MISSION_DURATION_OPTIONS_SECONDS = Object.freeze([
  5,
  10,
  15,
  30,
  45,
  ...Array.from({ length: MISSION_MAX_DURATION_MINUTES }, (_, index) => (index + 1) * 60)
]);
const DEFAULT_MISSION_DURATION_SECONDS = 30;

function getMissionUnitDurationSeconds(goal) {
  const storedSeconds = Math.max(0, Math.trunc(Number(goal?.unitDurationSeconds || 0) || 0));
  if (storedSeconds > 0) return storedSeconds;
  return Math.max(0, Math.trunc(Number(goal?.unitDurationMinutes || 0) * 60 || 0));
}

function getMissionUnitDurationMinutes(goal) {
  return getMissionUnitDurationSeconds(goal) / 60;
}

function normalizeMissionDurationOption(seconds, fallback = DEFAULT_MISSION_DURATION_SECONDS) {
  const numeric = Math.max(0, Math.trunc(Number(seconds || 0) || 0));
  if (MISSION_DURATION_OPTIONS_SECONDS.includes(numeric)) return numeric;
  if (!numeric) return fallback;
  return MISSION_DURATION_OPTIONS_SECONDS.reduce((closest, option) => (
    Math.abs(option - numeric) < Math.abs(closest - numeric) ? option : closest
  ), MISSION_DURATION_OPTIONS_SECONDS[0]);
}

function formatMissionDurationValue(seconds) {
  const safeSeconds = Math.max(0, Math.trunc(Number(seconds || 0) || 0));
  if (safeSeconds >= 60 && safeSeconds % 60 === 0) {
    const minutes = safeSeconds / 60;
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  }
  return safeSeconds === 1 ? "1 segundo" : `${safeSeconds} segundos`;
}

function formatMissionUnitDurationLabel(seconds) {
  return `${formatMissionDurationValue(seconds)} por unidade`;
}

function formatMissionTimePromptLabel(title) {
  const safeTitle = String(title || "esta missão").trim() || "esta missão";
  return `Quanto tempo leva 1 ${safeTitle}?`;
}

function buildStatsPointEntry(category, byCategory = {}) {
  const config = getStatsAspectConfigEntry(category.id);
  const selectedGoalIds = new Set((Array.isArray(config.missionGoalIds) ? config.missionGoalIds : []).map((id) => String(id || "").trim()).filter(Boolean));
  const scopedMissions = Array.isArray(state.statsScopeMissions) ? state.statsScopeMissions : [];
  const missionGoals = isSleepStatsCategory(category.id)
    ? []
    : scopedMissions.filter((goal) => selectedGoalIds.has(String(goal.id || "").trim()));
  const taskMinutes = Math.max(0, Number(byCategory?.[category.id] || 0));
  const points = missionGoals.length
    ? missionGoals.reduce((sum, goal) => sum + (Math.max(0, Number(goal.progressValue || 0)) * getMissionUnitDurationMinutes(goal)), 0)
    : Math.max(0, Number(byCategory?.[category.id] || 0));
  const targetPoints = missionGoals.length
    ? missionGoals.reduce((sum, goal) => sum + (Math.max(1, Number(goal.targetValue || 1)) * getMissionUnitDurationMinutes(goal)), 0)
    : Math.max(1, Number(config.targetMinutes || category.targetPoints || 1)) * getStatsScopeDays();
  const percent = targetPoints > 0 ? Math.max(0, Math.min(100, Math.round((points / targetPoints) * 100))) : 0;
  return {
    id: category.id,
    name: category.name,
    points,
    targetPoints,
    percent,
    taskMinutes,
    missionGoalIds: missionGoals.map((goal) => String(goal.id || "")),
    missionTitles: missionGoals.map((goal) => String(goal.title || "Missão")).filter(Boolean)
  };
}

function renderStatsAspectModalState() {
  const categoryId = String(state.statsAspectModal?.categoryId || "").trim().toLowerCase();
  const category = statsPointCategories.find((entry) => entry.id === categoryId) || null;
  if (!category) {
    return;
  }
  const isSleepCategory = isSleepStatsCategory(categoryId);
  const currentEntry = (Array.isArray(state.statsMissions) ? state.statsMissions : []).find((entry) => entry.id === categoryId)
    || buildStatsPointEntry(category, state.statsSummary?.byCategory || {});
  if (statsAspectTitle) {
    statsAspectTitle.textContent = category.name;
  }
  if (statsAspectIcon) {
    statsAspectIcon.src = getTaskCategoryIconPath(categoryId) || "/200/icons/agenda.svg";
  }
  const targetMinutes = Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || category.targetPoints || 1) || 1));
  state.statsAspectModal.targetMinutes = targetMinutes;
  if (statsAspectTargetValue) {
    statsAspectTargetValue.textContent = String(targetMinutes);
  }
  if (statsAspectMetaCopy) {
    statsAspectMetaCopy.textContent = `${targetMinutes} minutos`;
  }
  if (statsAspectTaskLabel) {
    statsAspectTaskLabel.textContent = isSleepCategory ? "Sono registrado:" : "Tarefas:";
  }
  if (statsAspectTaskMinutes) {
    statsAspectTaskMinutes.textContent = formatMinutesHuman(isSleepCategory ? currentEntry.points || 0 : currentEntry.taskMinutes || 0);
  }
  if (statsAspectProgressSummary) {
    const linkedMissionLabel = Array.isArray(currentEntry.missionTitles) && currentEntry.missionTitles.length
      ? `${currentEntry.percent}% via ${currentEntry.missionTitles.join(" + ")}`
      : `${currentEntry.percent}%`;
    statsAspectProgressSummary.textContent = linkedMissionLabel;
  }
  if (statsAspectLinkedGoalsLabel) {
    statsAspectLinkedGoalsLabel.textContent = isSleepCategory ? "Controle:" : "Missões vinculadas:";
  }
  if (statsAspectLinkedGoalsValue) {
    const titles = Array.isArray(currentEntry.missionTitles) ? currentEntry.missionTitles.filter(Boolean) : [];
    statsAspectLinkedGoalsValue.textContent = isSleepCategory
      ? "Independente de tarefas e missões"
      : (titles.length ? titles.join(" + ") : "Nenhuma");
  }
  if (statsAspectMissionAssignLabel) {
    statsAspectMissionAssignLabel.textContent = `Selecione uma ou mais missões para controlar ${category.name}.`;
  }
  if (openStatsAspectMissionAssignButton) {
    openStatsAspectMissionAssignButton.classList.toggle("is-sleep", isSleepCategory);
    openStatsAspectMissionAssignButton.setAttribute("aria-label", isSleepCategory ? "Abrir modal do sono" : "Atribuir missão");
    openStatsAspectMissionAssignButton.innerHTML = isSleepCategory
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.4A8.8 8.8 0 0 1 9.6 3.8a9.2 9.2 0 1 0 10.6 10.6z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>';
  }
}

function openStatsAspectModal(categoryId) {
  const category = statsPointCategories.find((entry) => entry.id === String(categoryId || "").trim().toLowerCase());
  if (!category) {
    return;
  }
  const config = getStatsAspectConfigEntry(category.id);
  state.statsAspectModal = {
    categoryId: category.id,
    targetMinutes: config.targetMinutes,
    missionGoalIds: [...config.missionGoalIds]
  };
  if (statsAspectStatus) {
    statsAspectStatus.textContent = "";
  }
  renderStatsAspectModalState();
  openModal("statsAspectModal");
}

function renderStatsAspectMissionOptions() {
  if (!statsAspectMissionOptions || !statsAspectMissionSelectedSummary) {
    return;
  }
  const selectedIds = new Set((Array.isArray(state.statsAspectModal?.missionGoalIds) ? state.statsAspectModal.missionGoalIds : []).map((item) => String(item || "").trim()).filter(Boolean));
  const missions = Array.isArray(state.missions) ? state.missions : [];
  const selectedGoals = missions.filter((goal) => selectedIds.has(String(goal.id || "")));
  statsAspectMissionSelectedSummary.textContent = selectedGoals.length
    ? `Vinculadas: ${selectedGoals.map((goal) => String(goal.title || "Missão")).join(" + ")}`
    : "Nenhuma missão vinculada.";
  if (!missions.length) {
    statsAspectMissionOptions.innerHTML = '<div class="empty-state">Sem missões cadastradas.</div>';
    return;
  }
  const items = missions.map((goal) => {
    const goalId = String(goal.id || "");
    const isActive = selectedIds.has(goalId);
    const progress = Math.max(0, Number(goal.progressValue || 0));
    const target = Math.max(1, Number(goal.targetValue || 1));
    const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
    return `
      <button class="stats-aspect-mission-option${isActive ? " is-active" : ""}" type="button" data-stats-mission-option="${escapeHtml(goalId)}">
        <div class="stats-aspect-mission-option-head">
          <strong>${escapeHtml(String(goal.title || "Missão"))}</strong>
          <span>${escapeHtml(`${progress}/${target}`)}</span>
        </div>
        <div class="stats-aspect-mission-option-progress" aria-hidden="true">
          <span style="width:${percent}%;"></span>
        </div>
      </button>
    `;
  });
  statsAspectMissionOptions.innerHTML = items.join("");
}

function createStatsPointRow(entry) {
  const row = document.createElement("article");
  const progressPercent = Math.max(0, Math.min(100, Number(entry.percent || 0)));
  const progressColor = getPointProgressColor(progressPercent);
  const iconPath = getTaskCategoryIconPath(entry.id) || "/200/icons/agenda.svg";
  row.className = "task-row stats-point-row";
  row.dataset.statsAspectId = String(entry.id || "");
  row.innerHTML = `
    <div class="stats-point-layout">
      <div class="stats-point-icon-wrap">
        <img class="stats-point-icon" src="${iconPath}" alt="${escapeHtml(entry.name)}" loading="lazy" />
      </div>
      <div class="task-main">
        <div class="stats-point-title-row">
          <div class="task-title">${escapeHtml(entry.name)}</div>
          <div class="stats-point-percent">${progressPercent}%</div>
        </div>
      </div>
      <div class="stats-point-progress" aria-hidden="true">
        <div class="stats-point-progress-fill" style="width:${progressPercent}%; background:linear-gradient(90deg, rgba(255,255,255,0.16) 0%, ${progressColor} 100%);"></div>
      </div>
    </div>
  `;
  return row;
}

function createStatsMissionRow(entry) {
  const row = document.createElement("article");
  const progressPercent = Math.max(0, Math.min(100, Number(entry.percent || 0)));
  row.className = "task-row stats-mission-row";
  row.dataset.missionId = String(entry.id || "");
  row.dataset.missionTitle = String(entry.title || "Missao");
  row.dataset.missionTargetCount = String(Number(entry.targetCount || 0));
  row.innerHTML = `
    <div class="task-main">
      <div class="task-title">${escapeHtml(String(entry.title || "Missao"))}</div>
      <div class="task-assignee">${escapeHtml(`${Number(entry.progressCount || 0)} de ${Number(entry.targetCount || 0)} • ${progressPercent}%`)}</div>
      <div class="stats-mission-progress" aria-hidden="true">
        <div class="stats-mission-progress-fill" style="width:${progressPercent}%;"></div>
      </div>
    </div>
    <div class="stats-mission-actions">
      <button class="stats-mission-btn stats-mission-btn-delete" type="button" data-mission-delete="${escapeHtml(String(entry.id || ""))}" aria-label="${escapeHtml(`Excluir ${String(entry.title || "missao")}`)}">×</button>
      <button class="stats-mission-btn stats-mission-btn-plus" type="button" data-mission-plus="${escapeHtml(String(entry.id || ""))}" aria-label="${escapeHtml(`Adicionar progresso em ${String(entry.title || "missao")}`)}">+</button>
    </div>
  `;
  return row;
}

function renderStatsMissions() {
  if (!statsMissionsList) {
    return;
  }

  statsMissionsList.innerHTML = "";
  const entries = Array.isArray(state.statsMissions) ? state.statsMissions : [];
  if (!entries.length) {
    statsMissionsList.innerHTML = '<div class="empty-state">Sem pontos por categoria ainda.</div>';
    return;
  }

  entries.forEach((entry) => {
    statsMissionsList.appendChild(createStatsPointRow(entry));
  });
}

function renderStatsRanking() {
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
        <img class="task-avatar" src="${getStatsAvatarPath(entry.name)}" alt="${escapeHtml(`Avatar de ${entry.name}`)}" loading="lazy" />
        <span class="stats-rank-badge">${index + 1}º</span>
      </div>
      <div class="task-main">
        <div class="task-title">${escapeHtml(entry.name)}</div>
        <div class="task-assignee">${entry.lateStartMinutes > 0 ? `${entry.completed} pontos • atraso ${entry.lateStartMinutes}m` : `${entry.completed} pontos`}</div>
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
    renderStatsScopeControls();
    if (statsMissionsList) {
      statsMissionsList.hidden = false;
      showDbLoadingState(statsMissionsList, 220);
    }
    if (statsMissionSummary) {
      statsMissionSummary.hidden = true;
    }
    if (statsRankingList) {
      statsRankingList.hidden = true;
    }
    await loadMissions();
    await hydrateStatsAspectConfig(state.selectedProfile || getDefaultProfileName(), {
      force: true,
      skipGlobalLoading: false
    });
    const scope = getActiveStatsScope();
    const profile = String(state.selectedProfile || getDefaultProfileName()).trim();
    const [summaryPayload, goalsPayload] = await Promise.all([
      apiRequest(`/api/stats/summary?scope=${encodeURIComponent(scope.key)}`, {
        skipGlobalLoading: false
      }),
      apiRequest(`/api/200/extra-goals?profile=${encodeURIComponent(profile)}&scope=${encodeURIComponent(scope.key)}`, {
        skipGlobalLoading: false
      }).catch(() => ({ goals: state.missions }))
    ]);
    const summary = summaryPayload?.summary || {};
    const byCategory = summary?.byCategory || {};
    state.statsScopeMissions = Array.isArray(goalsPayload?.goals) ? goalsPayload.goals : [];
    state.statsSummary = summary;
    state.statsGlobalProfiles = Array.isArray(summary?.globalProfiles) ? summary.globalProfiles : [];
    state.statsRanking = [];
    state.statsPointsOverview = null;
    state.statsMissions = statsPointCategories.map((category) => buildStatsPointEntry(category, byCategory));
    renderStatsMissions();
  } catch (error) {
    if (statsMissionsList) {
      statsMissionsList.innerHTML = `<div class="empty-state">${escapeHtml(error instanceof Error ? error.message : "Falha")}</div>`;
    }
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
  showDbLoadingState(historyTimelineList, 220);
  const payload = await apiRequest("/api/200/history");
  state.historySystem = Array.isArray(payload.systemEvents) ? payload.systemEvents : [];
  state.historyTexts = Array.isArray(payload.texts) ? payload.texts : [];
}

function formatSleepHistoryDate(dateKey) {
  const date = new Date(`${String(dateKey || "").slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(dateKey || "") : new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
}

function renderSleepHistoryEntries(entries = []) {
  if (!sleepHistoryList) return;
  if (!entries.length) {
    sleepHistoryList.innerHTML = '<div class="empty-state">Ainda não há registros de sono.</div>';
    return;
  }
  sleepHistoryList.innerHTML = entries.map((entry) => {
    const totalMinutes = Math.max(0, Math.min(720, Math.trunc(Number(entry?.totalMinutes || 0) || 0)));
    return `<div class="sleep-history-row" data-sleep-date="${escapeHtml(entry.sleepDate)}">
      <strong>${escapeHtml(formatSleepHistoryDate(entry.sleepDate))}</strong>
      <input type="number" min="0" max="12" value="${Math.floor(totalMinutes / 60)}" data-sleep-hours aria-label="Horas" /><span>h</span>
      <input type="number" min="0" max="59" value="${totalMinutes % 60}" data-sleep-minutes aria-label="Minutos" /><span>min</span>
      <button class="sleep-history-save" type="button" data-save-sleep>Salvar</button>
    </div>`;
  }).join("");
}

async function openSleepHistoryEditor() {
  openModal("sleepHistoryModal");
  if (sleepHistoryStatus) sleepHistoryStatus.textContent = "";
  if (sleepHistoryList) sleepHistoryList.innerHTML = '<div class="empty-state">Carregando...</div>';
  try {
    const profile = encodeURIComponent(getSelectedProfileName());
    const payload = await apiRequest(`/api/200/sleep-history?profile=${profile}`);
    renderSleepHistoryEntries(Array.isArray(payload?.entries) ? payload.entries : []);
  } catch (error) {
    if (sleepHistoryList) sleepHistoryList.innerHTML = `<div class="empty-state">${escapeHtml(error instanceof Error ? error.message : "Falha ao carregar.")}</div>`;
  }
}

function cacheLoadedMissionVariants(goals) {
  (Array.isArray(goals) ? goals : []).forEach((goal) => {
    if (!Array.isArray(goal?.variants)) return;
    missionVariantsCache.set(String(goal.id || ""), {
      loadedAt: Date.now(),
      items: goal.variants
    });
  });
}

async function loadMissions() {
  if (!getToken()) {
    state.missions = [];
    renderMissionScopeControls();
    return;
  }
  showDbLoadingState(missionList || missionsEmpty || missionStatus, 220);
  const profile = String(state.selectedProfile || getDefaultProfileName()).trim();
  const scope = getMissionHistoryScope();
  renderMissionScopeControls();
  try {
    const payload = await apiRequest(`/api/200/extra-goals?profile=${encodeURIComponent(profile)}&scope=${encodeURIComponent(scope.key)}`);
    state.missions = Array.isArray(payload?.goals) ? payload.goals : [];
    cacheLoadedMissionVariants(state.missions);
    if (missionStatus) {
      missionStatus.textContent = "";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar missões.";
    if (/usuario invalido/i.test(message)) {
      await loadProject200Profiles().catch(() => null);
      applySelectedProfile(getDefaultProfileName());
      try {
        const retryScope = getMissionHistoryScope();
        const retryPayload = await apiRequest(`/api/200/extra-goals?profile=${encodeURIComponent(getDefaultProfileName())}&scope=${encodeURIComponent(retryScope.key)}`);
        state.missions = Array.isArray(retryPayload?.goals) ? retryPayload.goals : [];
        cacheLoadedMissionVariants(state.missions);
        if (missionStatus) {
          missionStatus.textContent = "";
        }
        return;
      } catch (retryError) {
        state.missions = [];
        if (missionStatus) {
          missionStatus.textContent = retryError instanceof Error ? retryError.message : "Falha ao carregar missões.";
        }
        return;
      }
    }
    state.missions = [];
    if (missionStatus) {
      missionStatus.textContent = message;
    }
  }
}

async function loadActionMissions() {
  if (!getToken() || state.activeOffset !== 0) {
    state.actionMissions = [];
    renderActionsMissionFilter();
    return;
  }
  const profile = String(state.selectedProfile || getDefaultProfileName()).trim();
  try {
    const payload = await apiRequest(`/api/200/extra-goals?profile=${encodeURIComponent(profile)}&scope=today`, { skipGlobalLoading: true });
    state.actionMissions = Array.isArray(payload?.goals) ? payload.goals : [];
  } catch {
    state.actionMissions = [];
  }
  if (actionsModal?.classList.contains("active")) {
    renderActions();
  } else {
    renderActionsMissionFilter();
  }
}

function buildDefaultMissionQuickSlots() {
  return missionQuickDefinitions.map((definition) => ({
    key: definition.key,
    title: definition.defaultTitle,
    goalId: ""
  }));
}

function getMissionQuickStorageKey(profileName = state.selectedProfile || getDefaultProfileName()) {
  const userId = String(state.authUser?.id || "guest").trim() || "guest";
  const profile = normalizeAssigneeName(profileName || getDefaultProfileName()) || defaultProjectProfileName;
  return `${missionQuickSlotsKey}:${userId}:${profile}`;
}

function readMissionQuickSlots(profileName = state.selectedProfile || getDefaultProfileName()) {
  const fallback = buildDefaultMissionQuickSlots();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getMissionQuickStorageKey(profileName)) || "[]");
    if (!Array.isArray(parsed) || !parsed.length) {
      return fallback;
    }
    return missionQuickDefinitions.map((definition) => {
      const matched = parsed.find((item) => String(item?.key || "") === definition.key) || {};
      return {
        key: definition.key,
        title: String(matched.title || definition.defaultTitle || "").trim() || definition.defaultTitle,
        goalId: String(matched.goalId || "").trim()
      };
    });
  } catch (error) {
    return fallback;
  }
}

function persistMissionQuickSlots(profileName = state.selectedProfile || getDefaultProfileName()) {
  const sanitized = missionQuickDefinitions.map((definition) => {
    const matched = (Array.isArray(state.missionQuickSlots) ? state.missionQuickSlots : []).find((item) => item.key === definition.key) || {};
    return {
      key: definition.key,
      title: String(matched.title || definition.defaultTitle || "").trim() || definition.defaultTitle,
      goalId: String(matched.goalId || "").trim()
    };
  });
  state.missionQuickSlots = sanitized;
  window.localStorage.setItem(getMissionQuickStorageKey(profileName), JSON.stringify(sanitized));
}

function loadMissionQuickSlots(profileName = state.selectedProfile || getDefaultProfileName()) {
  state.missionQuickSlots = readMissionQuickSlots(profileName);
}

function buildDefaultStatsAspectConfig() {
  return Object.fromEntries(statsPointCategories.map((category) => [category.id, {
    targetMinutes: Math.max(1, Number(category.targetPoints || 1)),
    missionGoalIds: isSleepStatsCategory(category.id) ? [] : []
  }]));
}

function normalizeStatsAspectConfigMap(rawConfig = {}) {
  return Object.fromEntries(statsPointCategories.map((category) => {
    const legacyEntry = category.id === "aprendizado"
      ? (rawConfig?.estudo || rawConfig?.financeiro)
      : category.id === "planejamento"
        ? rawConfig?.familia
        : category.id === "aspecto"
          ? (rawConfig?.fe_espiritualidade || rawConfig?.saude || rawConfig?.digital)
          : null;
    const entry = rawConfig?.[category.id] || legacyEntry || {};
    const missionGoalIds = Array.isArray(entry.missionGoalIds)
      ? [...new Set(entry.missionGoalIds.map((item) => String(item || "").trim()).filter(Boolean))]
      : (String(entry.missionGoalId || "").trim() ? [String(entry.missionGoalId || "").trim()] : []);
    return [category.id, {
      targetMinutes: Math.max(1, Math.trunc(Number(entry.targetMinutes || category.targetPoints || 1) || 1)),
      missionGoalIds: isSleepStatsCategory(category.id) ? [] : missionGoalIds
    }];
  }));
}

function buildStatsAspectConfigPayload(categoryId) {
  const entry = state.statsAspectConfig?.[categoryId] || {};
  return {
    targetMinutes: Math.max(1, Math.trunc(Number(entry.targetMinutes || 1) || 1)),
    missionGoalIds: isSleepStatsCategory(categoryId)
      ? []
      : Array.isArray(entry.missionGoalIds)
      ? [...new Set(entry.missionGoalIds.map((item) => String(item || "").trim()).filter(Boolean))]
      : []
  };
}

function loadStatsAspectConfig(profileName = state.selectedProfile || getDefaultProfileName()) {
  state.statsAspectConfig = buildDefaultStatsAspectConfig();
  void hydrateStatsAspectConfig(profileName, { force: true });
}

async function hydrateStatsAspectConfig(profileName = state.selectedProfile || getDefaultProfileName(), options = {}) {
  if (!getToken()) {
    state.statsAspectConfig = buildDefaultStatsAspectConfig();
    return state.statsAspectConfig;
  }
  const normalizedProfile = normalizeAssigneeName(profileName || getDefaultProfileName()) || defaultProjectProfileName;
  if (statsAspectConfigHydrationPromise && options?.force !== true) {
    return statsAspectConfigHydrationPromise;
  }
  statsAspectConfigHydrationPromise = (async () => {
    try {
      const payload = await apiRequest(`/api/200/stats-aspects?profile=${encodeURIComponent(normalizedProfile)}`, {
        skipGlobalLoading: options?.skipGlobalLoading === true
      });
      const normalized = normalizeStatsAspectConfigMap(payload?.config || {});
      if ((normalizeAssigneeName(state.selectedProfile || getDefaultProfileName()) || defaultProjectProfileName) === normalizedProfile) {
        state.statsAspectConfig = normalized;
      }
      return normalized;
    } catch {
      const fallback = normalizeStatsAspectConfigMap(state.statsAspectConfig || {});
      if ((normalizeAssigneeName(state.selectedProfile || getDefaultProfileName()) || defaultProjectProfileName) === normalizedProfile) {
        state.statsAspectConfig = fallback;
      }
      return fallback;
    } finally {
      statsAspectConfigHydrationPromise = null;
    }
  })();
  return statsAspectConfigHydrationPromise;
}

async function persistStatsAspectConfig(categoryId, profileName = state.selectedProfile || getDefaultProfileName()) {
  const normalizedCategoryId = String(categoryId || "").trim().toLowerCase();
  if (!normalizedCategoryId) {
    throw new Error("Categoria inválida.");
  }
  const normalizedProfile = normalizeAssigneeName(profileName || getDefaultProfileName()) || defaultProjectProfileName;
  const payload = buildStatsAspectConfigPayload(normalizedCategoryId);
  const result = await apiRequest(`/api/200/stats-aspects/${encodeURIComponent(normalizedCategoryId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: normalizedProfile,
      targetMinutes: payload.targetMinutes,
      missionGoalIds: payload.missionGoalIds
    }),
    skipGlobalLoading: true
  });
  const normalized = normalizeStatsAspectConfigMap(result?.config || {});
  state.statsAspectConfig = normalized;
  return normalized;
}

function getCurrentSleepDelayMinutes() {
  return Math.max(0, Number(sleepDelayOptions[state.sleepModal?.delayIndex] || 0));
}

function getComputedSleepSessionSnapshot(session) {
  if (!session) {
    return null;
  }
  const scheduledStartAtMs = new Date(session.scheduledStartAt || "").getTime();
  const nowMs = getServerNowMs();
  const hasStarted = Number.isFinite(scheduledStartAtMs) && nowMs >= scheduledStartAtMs;
  const trackedMinutes = hasStarted ? Math.max(0, Math.floor((nowMs - scheduledStartAtMs) / 60000)) : 0;
  const countdownRemainingSeconds = hasStarted || !Number.isFinite(scheduledStartAtMs)
    ? 0
    : Math.max(0, Math.ceil((scheduledStartAtMs - nowMs) / 1000));
  return {
    ...session,
    phase: hasStarted ? "sleeping" : "countdown",
    trackedMinutes,
    countdownRemainingSeconds,
    cappedTrackedMinutes: Math.min(720, trackedMinutes)
  };
}

function stopSleepModalTicker() {
  if (sleepModalTicker) {
    window.clearInterval(sleepModalTicker);
    sleepModalTicker = null;
  }
}

function startSleepModalTicker() {
  stopSleepModalTicker();
  sleepModalTicker = window.setInterval(() => {
    renderSleepModalState();
  }, 1000);
}

function renderSleepModalState() {
  const session = getComputedSleepSessionSnapshot(state.sleepModal?.session);
  const isActiveSession = Boolean(session);
  renderSleepMusicToggleState();
  if (sleepModalCloseButton) {
    sleepModalCloseButton.hidden = isActiveSession;
  }
  if (sleepModalSetup) {
    sleepModalSetup.hidden = isActiveSession;
  }
  if (sleepModalSession) {
    sleepModalSession.hidden = !isActiveSession;
  }
  if (sleepModalControls && !isActiveSession) {
    sleepModalControls.hidden = true;
  }
  if (!isActiveSession) {
    if (sleepDelayLabel) {
      sleepDelayLabel.textContent = formatSleepDelayLabel(getCurrentSleepDelayMinutes());
    }
    if (sleepModalSetupSubtitle) {
      sleepModalSetupSubtitle.textContent = "Escolha em quanto tempo quer começar a dormir";
    }
    return;
  }
  if (sleepSessionTitle) {
    sleepSessionTitle.textContent = "SONO";
  }
  if (sleepSessionTime) {
    const timerParts = session.phase === "countdown"
      ? formatSleepTimerValue(session.countdownRemainingSeconds)
      : formatSleepTimerValue(session.trackedMinutes * 60);
    sleepSessionTime.innerHTML = `<span class="sleep-time-part">${timerParts.hoursText}</span><span class="sleep-time-separator" aria-hidden="true">:</span><span class="sleep-time-part">${timerParts.minutesText}</span>`;
  }
  if (sleepSessionSubtitle) {
    if (session.phase === "countdown") {
      sleepSessionSubtitle.textContent = "Contagem regressiva até o início do sono.";
    } else if (session.trackedMinutes >= 480) {
      sleepSessionSubtitle.textContent = "Toque na tela para continuar, encerrar ou abortar o sono.";
    } else {
      sleepSessionSubtitle.textContent = "Toque na tela para mostrar os controles.";
    }
  }
  if (sleepSessionCap) {
    sleepSessionCap.textContent = session.trackedMinutes > 720
      ? `Máximo contabilizado: 12h • exibindo ${formatMinutesHuman(session.trackedMinutes)}`
      : "Máximo contabilizado: 12h";
  }
  if (sleepFinishButton) {
    sleepFinishButton.hidden = session.phase !== "sleeping";
  }
  if (sleepModalControls) {
    sleepModalControls.hidden = !state.sleepModal.controlsVisible;
  }
  sleepModalShell?.classList.toggle("sleep-controls-visible", Boolean(state.sleepModal.controlsVisible && isActiveSession));
}

function shiftSleepDelay(direction) {
  const nextIndex = ((Number(state.sleepModal?.delayIndex || 0) + Number(direction || 0)) % sleepDelayOptions.length + sleepDelayOptions.length) % sleepDelayOptions.length;
  state.sleepModal.delayIndex = nextIndex;
  renderSleepModalState();
}

async function hydrateSleepSession(profileName = state.selectedProfile || getDefaultProfileName(), options = {}) {
  if (!getToken()) {
    state.sleepModal.session = null;
    renderSleepModalState();
    return null;
  }
  try {
    const payload = await apiRequest(`/api/200/sleep-session?profile=${encodeURIComponent(normalizeAssigneeName(profileName || getDefaultProfileName()) || defaultProjectProfileName)}`, {
      skipGlobalLoading: options?.skipGlobalLoading === true
    });
    state.sleepModal.session = payload?.session || null;
    renderSleepModalState();
    return state.sleepModal.session;
  } catch (error) {
    state.sleepModal.session = null;
    renderSleepModalState();
    if (options?.silent !== true && sleepModalFeedback) {
      sleepModalFeedback.textContent = error instanceof Error ? error.message : "Falha ao carregar o sono.";
    }
    return null;
  }
}

async function openSleepModal() {
  state.sleepModal.controlsVisible = false;
  if (sleepModalFeedback) {
    sleepModalFeedback.textContent = "";
  }
  await hydrateSleepSession(state.selectedProfile || getDefaultProfileName(), {
    skipGlobalLoading: true,
    silent: true
  });
  renderSleepModalState();
  openModal("sleepModal");
  if (state.sleepModal?.musicEnabled) {
    void syncSleepFrequencyPlayback();
  }
}

function renderSocialBadge() {
  const count = Math.max(0, Math.trunc(Number(state.social?.pendingCount || 0) || 0));
  [homeSocialBadge, runningHomeSocialBadge].forEach((badge) => {
    if (!badge) return;
    badge.hidden = count <= 0;
    badge.textContent = String(count);
  });
}

function renderSocialScopeFooter() {
  document.querySelectorAll("[data-social-scope]").forEach((button) => {
    button.classList.toggle("active", String(button.dataset.socialScope || "") === String(state.social?.scopeKey || "today"));
  });
}

function getSocialScopeIndex() {
  return missionHistoryScopes.findIndex((item) => item.key === String(state.social?.scopeKey || "today"));
}

function renderSocialModal() {
  renderSocialBadge();
  renderSocialScopeFooter();
  document.body.classList.toggle("social-modal-loading", Boolean(state.social?.loading));
  socialModalLoading && (socialModalLoading.hidden = !state.social.loading);
  if (socialInviteForm) {
    socialInviteForm.hidden = !state.social.inviteComposerOpen;
  }
  if (socialInviteToggleButton) {
    socialInviteToggleButton.textContent = state.social.inviteComposerOpen ? "×" : "+";
  }
  const rankedUsers = [];
  if (state.social?.self) {
    rankedUsers.push({ ...state.social.self, isSelf: true });
  }
  for (const friend of Array.isArray(state.social?.friends) ? state.social.friends : []) {
    rankedUsers.push({ ...friend, isSelf: false });
  }
  rankedUsers.sort((left, right) => {
    if (Number(right.points || 0) !== Number(left.points || 0)) {
      return Number(right.points || 0) - Number(left.points || 0);
    }
    return String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
  });
  const hasFriends = rankedUsers.length > 1;
  socialModalShell?.classList.toggle("has-friends", hasFriends);
  if (socialModalSubtitle) {
    socialModalSubtitle.hidden = hasFriends;
  }
  if (socialModalList) {
    const cards = [];
    rankedUsers.forEach((entry, index) => {
      cards.push(`
        <article class="social-card ${entry.isSelf ? "social-card--self" : "social-card--friend"}">
          <div class="social-card-avatar">${renderSocialCardAvatar(entry)}<span class="social-card-rank">${escapeHtml(`${index + 1}º`)}</span></div>
          <div class="social-card-body">
            <div class="social-card-name">${escapeHtml(String(entry.name || "Você"))}</div>
            <div class="social-card-copy">${entry.isSelf ? "Você" : "Pontos"}</div>
          </div>
          <div class="social-card-points">Pontos<br><strong>${escapeHtml(String(Math.max(0, Number(entry.points || 0))))}</strong></div>
        </article>
      `);
    });
    for (const invite of Array.isArray(state.social?.incomingInvites) ? state.social.incomingInvites : []) {
      const fromUser = invite?.fromUser || {};
      cards.push(`
        <article class="social-card social-card--invite">
          <div class="social-card-avatar">${renderSocialCardAvatar(fromUser)}</div>
          <div class="social-card-body">
            <div class="social-card-name">${escapeHtml(String(fromUser.name || "Usuario"))}</div>
            <div class="social-card-copy">${escapeHtml(String(fromUser.name || "Usuario"))} quer ser seu amigo.</div>
          </div>
          <div class="social-card-actions">
            <button class="social-card-action is-accept" type="button" data-social-accept="${escapeHtml(String(invite.id || ""))}">Aceitar</button>
            <button class="social-card-action is-reject" type="button" data-social-reject="${escapeHtml(String(invite.id || ""))}">Recusar</button>
          </div>
        </article>
      `);
    }
    for (const friend of Array.isArray(state.social?.friends) ? state.social.friends : []) {
      cards.push(`
        <article class="social-card social-card--friend">
          <div class="social-card-avatar">${renderSocialCardAvatar(friend)}</div>
          <div class="social-card-body">
            <div class="social-card-name">${escapeHtml(String(friend.name || "Usuario"))}</div>
            <div class="social-card-copy">Pontos</div>
          </div>
          <div class="social-card-points"><strong>${escapeHtml(String(Math.max(0, Number(friend.points || 0))))}</strong></div>
        </article>
      `);
    }
    if (!cards.length) {
      cards.push(`<div class="social-empty-state">Nenhum item por aqui ainda.</div>`);
    }
    socialModalList.innerHTML = cards.join("");
  }
}

function getPointsUpdateRankingEntries(snapshot) {
  const entries = [];
  if (snapshot?.self) {
    entries.push({ ...snapshot.self, isSelf: true });
  }
  for (const friend of Array.isArray(snapshot?.friends) ? snapshot.friends : []) {
    entries.push({ ...friend, isSelf: false });
  }
  entries.sort((left, right) => {
    const pointsDelta = Number(right?.points || 0) - Number(left?.points || 0);
    if (pointsDelta !== 0) {
      return pointsDelta;
    }
    return String(left?.name || "").localeCompare(String(right?.name || ""), "pt-BR");
  });
  return entries.map((entry, index) => ({
    ...entry,
    points: Math.max(0, Math.trunc(Number(entry?.points || 0) || 0)),
    rank: index + 1
  }));
}

function getPointsUpdateEntryKey(entry) {
  const userId = String(entry?.userId || "").trim();
  if (userId) {
    return userId;
  }
  return entry?.isSelf ? "self" : `friend:${String(entry?.name || "usuario").trim().toLowerCase()}`;
}

function getPointsUpdateVisibleRanking(entries) {
  const selfIndex = entries.findIndex((entry) => entry.isSelf);
  if (selfIndex < 0) {
    return [];
  }
  return entries.slice(Math.max(0, selfIndex - 2), selfIndex + 3);
}

function playPointsRankOvertakeSound() {
  if (!pointsRankOvertakeAudio) {
    return;
  }
  try {
    pointsRankOvertakeAudio.pause();
    pointsRankOvertakeAudio.currentTime = 0;
    pointsRankOvertakeAudio.volume = 1;
    void pointsRankOvertakeAudio.play().catch(() => {});
  } catch {}
}

function animatePointsUpdateTotal(fromPoints, toPoints) {
  if (!pointsUpdateTotal) {
    return;
  }
  const startedAt = performance.now();
  const durationMs = 900;
  const tick = (now) => {
    const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
    const eased = 1 - Math.pow(1 - progress, 3);
    pointsUpdateTotal.textContent = String(Math.round(fromPoints + ((toPoints - fromPoints) * eased)));
    if (progress < 1 && pointsUpdateModal?.classList.contains("active")) {
      window.requestAnimationFrame(tick);
    }
  };
  window.requestAnimationFrame(tick);
}

function renderPointsUpdateRanking(beforeSnapshot, afterSnapshot, didOvertake) {
  if (!pointsUpdateRanking || !pointsUpdateRankingList) {
    return;
  }
  const beforeEntries = getPointsUpdateRankingEntries(beforeSnapshot);
  const afterEntries = getPointsUpdateRankingEntries(afterSnapshot);
  const hasFriends = (Array.isArray(afterSnapshot?.friends) ? afterSnapshot.friends : []).length > 0;
  pointsUpdateRanking.hidden = !hasFriends;
  if (!hasFriends) {
    pointsUpdateRankingList.innerHTML = "";
    return;
  }

  const visibleAfter = getPointsUpdateVisibleRanking(afterEntries);
  const beforeByKey = new Map(beforeEntries.map((entry) => [getPointsUpdateEntryKey(entry), entry]));
  const beforeRankByKey = new Map(beforeEntries.map((entry) => [getPointsUpdateEntryKey(entry), entry.rank]));
  const initialEntries = didOvertake
    ? [...visibleAfter].sort((left, right) => {
        const leftRank = beforeRankByKey.get(getPointsUpdateEntryKey(left)) || Number.MAX_SAFE_INTEGER;
        const rightRank = beforeRankByKey.get(getPointsUpdateEntryKey(right)) || Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank;
      })
    : visibleAfter;

  pointsUpdateRankingList.innerHTML = initialEntries.map((entry) => {
    const key = getPointsUpdateEntryKey(entry);
    const initialEntry = didOvertake ? (beforeByKey.get(key) || entry) : entry;
    return `
      <div class="points-update-ranking-row${entry.isSelf ? " is-self" : ""}" data-points-ranking-user="${escapeHtml(key)}">
        <span class="points-update-rank">${escapeHtml(`${initialEntry.rank || entry.rank}º`)}</span>
        <strong class="points-update-name">${escapeHtml(String(entry?.name || (entry.isSelf ? "Você" : "Usuário")))}</strong>
        <span class="points-update-row-points">${escapeHtml(String(initialEntry.points ?? entry.points))}</span>
      </div>
    `;
  }).join("");

  if (!didOvertake) {
    return;
  }

  window.setTimeout(() => {
    if (!pointsUpdateModal?.classList.contains("active")) {
      return;
    }
    const nodes = new Map([...pointsUpdateRankingList.querySelectorAll("[data-points-ranking-user]")]
      .map((node) => [String(node.dataset.pointsRankingUser || ""), node]));
    const firstPositions = new Map([...nodes].map(([key, node]) => [key, node.getBoundingClientRect().top]));
    visibleAfter.forEach((entry) => {
      const node = nodes.get(getPointsUpdateEntryKey(entry));
      if (node) {
        pointsUpdateRankingList.appendChild(node);
      }
    });
    const lastPositions = new Map([...nodes].map(([key, node]) => [key, node.getBoundingClientRect().top]));
    visibleAfter.forEach((entry) => {
      const key = getPointsUpdateEntryKey(entry);
      const node = nodes.get(key);
      if (!node) {
        return;
      }
      const translateY = Number(firstPositions.get(key) || 0) - Number(lastPositions.get(key) || 0);
      node.style.transition = "none";
      node.style.transform = `translateY(${translateY}px)`;
      const rankNode = node.querySelector(".points-update-rank");
      const pointsNode = node.querySelector(".points-update-row-points");
      if (rankNode) rankNode.textContent = `${entry.rank}º`;
      if (pointsNode) pointsNode.textContent = String(entry.points);
    });
    void pointsUpdateRankingList.offsetHeight;
    window.requestAnimationFrame(() => {
      nodes.forEach((node) => {
        node.style.transition = "transform 620ms cubic-bezier(0.2, 0.84, 0.28, 1)";
        node.style.transform = "translateY(0)";
      });
      pointsUpdateModal.classList.add("is-overtaking");
      playPointsRankOvertakeSound();
    });
  }, 170);
}

async function showPointsUpdateFeedback(pointsUpdate) {
  const beforeSnapshot = pointsUpdate?.before || null;
  const afterSnapshot = pointsUpdate?.after || null;
  const beforePoints = Math.max(0, Math.trunc(Number(beforeSnapshot?.self?.points || 0) || 0));
  const afterPoints = Math.max(0, Math.trunc(Number(afterSnapshot?.self?.points || 0) || 0));
  const pointsDelta = afterPoints - beforePoints;
  const isLoss = pointsDelta < 0;
  if (!pointsUpdateModal || !afterSnapshot || pointsDelta === 0) {
    return;
  }

  const beforeEntries = getPointsUpdateRankingEntries(beforeSnapshot);
  const afterEntries = getPointsUpdateRankingEntries(afterSnapshot);
  const beforePosition = beforeEntries.findIndex((entry) => entry.isSelf);
  const afterPosition = afterEntries.findIndex((entry) => entry.isSelf);
  const didOvertake = !isLoss && beforePosition >= 0 && afterPosition >= 0 && afterPosition < beforePosition;

  if (String(state.social?.scopeKey || "today") === "today") {
    state.social.pendingCount = Math.max(0, Number(afterSnapshot?.pendingCount || 0) || 0);
    state.social.self = afterSnapshot?.self || null;
    state.social.incomingInvites = Array.isArray(afterSnapshot?.incomingInvites) ? afterSnapshot.incomingInvites : [];
    state.social.friends = Array.isArray(afterSnapshot?.friends) ? afterSnapshot.friends : [];
    renderSocialModal();
  }

  pointsUpdateModal.classList.remove("is-leaving", "is-overtaking", "is-loss");
  pointsUpdateModal.classList.toggle("is-loss", isLoss);
  if (pointsUpdateContinue) pointsUpdateContinue.hidden = true;
  if (pointsUpdateTotal) pointsUpdateTotal.textContent = String(beforePoints);
  if (pointsUpdateDelta) {
    const absoluteDelta = Math.abs(pointsDelta);
    pointsUpdateDelta.textContent = `${pointsDelta > 0 ? "+" : "-"}${absoluteDelta} ${absoluteDelta === 1 ? "ponto" : "pontos"}`;
  }
  renderPointsUpdateRanking(beforeSnapshot, afterSnapshot, didOvertake);
  openModal("pointsUpdateModal");
  animatePointsUpdateTotal(beforePoints, afterPoints);

  await new Promise((resolve) => window.setTimeout(resolve, 1500));
  if (pointsUpdateContinue) pointsUpdateContinue.hidden = false;
  pointsUpdateModal.classList.add("is-ready-to-continue");
  await new Promise((resolve) => {
    pointsUpdateModal.addEventListener("pointerup", resolve, { once: true });
  });
  pointsUpdateModal.classList.add("is-leaving");
  await new Promise((resolve) => window.setTimeout(resolve, 150));
  closeModal("pointsUpdateModal");
  pointsUpdateModal.classList.remove("is-leaving", "is-overtaking", "is-ready-to-continue", "is-loss");
  if (pointsUpdateContinue) pointsUpdateContinue.hidden = true;
}

function enqueuePointsUpdateFeedback(pointsUpdate) {
  if (!pointsUpdate?.before || !pointsUpdate?.after) {
    return;
  }
  pointsUpdateFeedbackQueue = pointsUpdateFeedbackQueue
    .catch(() => {})
    .then(() => showPointsUpdateFeedback(pointsUpdate));
}

function enqueueActionPointsUpdateFeedback(pointsUpdate, delayMs = 0) {
  if (!pointsUpdate?.before || !pointsUpdate?.after) {
    return;
  }
  window.setTimeout(() => enqueuePointsUpdateFeedback(pointsUpdate), Math.max(0, Number(delayMs || 0)));
}

async function loadSocialSnapshot(options = {}) {
  if (!getToken()) {
    state.social.pendingCount = 0;
    state.social.self = null;
    state.social.incomingInvites = [];
    state.social.friends = [];
    renderSocialModal();
    return null;
  }
  if (socialSnapshotHydrationPromise && options?.force !== true) {
    return socialSnapshotHydrationPromise;
  }
  socialSnapshotHydrationPromise = (async () => {
    const shouldShowLoading = options?.showLoading === true;
    if (shouldShowLoading) {
      state.social.loading = true;
      renderSocialModal();
    }
    try {
      const payload = await apiRequest(`/api/200/friends?scope=${encodeURIComponent(String(state.social?.scopeKey || "today"))}`, {
        skipGlobalLoading: options?.skipGlobalLoading === true
      });
      state.social.pendingCount = Math.max(0, Number(payload?.pendingCount || 0) || 0);
      state.social.self = payload?.self || null;
      state.social.incomingInvites = Array.isArray(payload?.incomingInvites) ? payload.incomingInvites : [];
      state.social.friends = Array.isArray(payload?.friends) ? payload.friends : [];
      renderSocialModal();
      return payload;
    } catch (error) {
      if (socialModalStatus && options?.silent !== true) {
        socialModalStatus.textContent = error instanceof Error ? error.message : "Falha ao carregar amizades.";
      }
      renderSocialModal();
      return null;
    } finally {
      if (shouldShowLoading) {
        state.social.loading = false;
        renderSocialModal();
      }
      socialSnapshotHydrationPromise = null;
    }
  })();
  return socialSnapshotHydrationPromise;
}

async function openSocialModal() {
  if (socialModalStatus) {
    socialModalStatus.textContent = "";
  }
  state.social.loading = true;
  renderSocialModal();
  openModal("socialModal");
  await loadSocialSnapshot({
    force: true,
    skipGlobalLoading: false,
    silent: true,
    showLoading: true
  });
  renderSocialModal();
}

async function submitSocialInvite() {
  const rawInput = String(socialInviteInput?.value || "").trim();
  if (!rawInput) {
    if (socialModalStatus) {
      socialModalStatus.textContent = "Digite o nome do amigo.";
    }
    return;
  }
  try {
    if (socialModalStatus) {
      socialModalStatus.textContent = "Procurando amigo...";
    }
    const lookup = await apiRequest(`/api/200/users/lookup?username=${encodeURIComponent(rawInput)}`, {
      skipGlobalLoading: false
    });
    const targetUserId = String(lookup?.user?.id || "").trim();
    if (!targetUserId) {
      throw new Error("Usuario nao encontrado.");
    }
    if (socialModalStatus) {
      socialModalStatus.textContent = "Enviando convite...";
    }
    await apiRequest("/api/200/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
      skipGlobalLoading: false
    });
    if (socialInviteInput) {
      socialInviteInput.value = "";
    }
    state.social.inviteComposerOpen = false;
    if (socialModalStatus) {
      socialModalStatus.textContent = `Convite enviado para ${String(lookup?.user?.name || lookup?.user?.username || "o amigo")}.`;
    }
    await loadSocialSnapshot({ force: true, skipGlobalLoading: false, silent: true });
  } catch (error) {
    if (socialModalStatus) {
      socialModalStatus.textContent = error instanceof Error ? error.message : "Falha ao enviar convite.";
    }
  } finally {
    renderSocialModal();
  }
}

async function respondToSocialInvite(friendshipId, action) {
  const normalizedId = String(friendshipId || "").trim();
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (!normalizedId || (normalizedAction !== "accept" && normalizedAction !== "reject")) {
    return;
  }
  try {
    if (socialModalStatus) {
      socialModalStatus.textContent = normalizedAction === "accept" ? "Aceitando convite..." : "Recusando convite...";
    }
    await apiRequest(`/api/200/friends/${encodeURIComponent(normalizedId)}/${normalizedAction === "accept" ? "accept" : "reject"}`, {
      method: "POST",
      skipGlobalLoading: false
    });
    if (socialModalStatus) {
      socialModalStatus.textContent = normalizedAction === "accept" ? "Amizade confirmada." : "Convite recusado.";
    }
    await loadSocialSnapshot({ force: true, skipGlobalLoading: false, silent: true });
  } catch (error) {
    if (socialModalStatus) {
      socialModalStatus.textContent = error instanceof Error ? error.message : "Falha ao responder convite.";
    }
  }
}

async function startSleepSessionFlow() {
  if (!getToken()) {
    return;
  }
  try {
    if (sleepModalFeedback) {
      sleepModalFeedback.textContent = "";
    }
    sleepStartButton?.setAttribute("disabled", "disabled");
    const payload = await apiRequest("/api/200/sleep-session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: normalizeAssigneeName(state.selectedProfile || getDefaultProfileName()) || defaultProjectProfileName,
        delayMinutes: getCurrentSleepDelayMinutes()
      }),
      skipGlobalLoading: false
    });
    state.sleepModal.session = payload?.session || null;
    state.sleepModal.controlsVisible = false;
    renderSleepModalState();
    if (state.sleepModal?.musicEnabled) {
      void syncSleepFrequencyPlayback();
    }
  } catch (error) {
    if (sleepModalFeedback) {
      sleepModalFeedback.textContent = error instanceof Error ? error.message : "Falha ao iniciar o sono.";
    }
  } finally {
    sleepStartButton?.removeAttribute("disabled");
  }
}

async function finishSleepSessionFlow() {
  try {
    const payload = await apiRequest("/api/200/sleep-session/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: normalizeAssigneeName(state.selectedProfile || getDefaultProfileName()) || defaultProjectProfileName
      }),
      skipGlobalLoading: false
    });
    state.sleepModal.session = null;
    state.sleepModal.controlsVisible = false;
    await stopSleepFrequencyPlayback();
    await loadStatsSummary();
    closeModal("sleepModal");
    closeModal("statsAspectModal");
    if (statsAspectStatus) {
      statsAspectStatus.textContent = `Sono salvo: ${formatMinutesHuman(payload?.savedMinutes || 0)}.`;
    }
  } catch (error) {
    if (sleepSessionSubtitle) {
      sleepSessionSubtitle.textContent = error instanceof Error ? error.message : "Falha ao encerrar o sono.";
    }
  }
}

async function abortSleepSessionFlow() {
  try {
    await apiRequest("/api/200/sleep-session/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: normalizeAssigneeName(state.selectedProfile || getDefaultProfileName()) || defaultProjectProfileName
      }),
      skipGlobalLoading: false
    });
    state.sleepModal.session = null;
    state.sleepModal.controlsVisible = false;
    await stopSleepFrequencyPlayback();
    renderSleepModalState();
    closeModal("sleepModal");
  } catch (error) {
    if (sleepSessionSubtitle) {
      sleepSessionSubtitle.textContent = error instanceof Error ? error.message : "Falha ao abortar o sono.";
    }
  }
}

function normalizeMissionTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function getMissionQuickDefinitionByKey(key) {
  return missionQuickDefinitions.find((item) => item.key === key) || null;
}

function getMissionQuickSlotByKey(key) {
  return (Array.isArray(state.missionQuickSlots) ? state.missionQuickSlots : []).find((item) => item.key === key) || null;
}

function getMissionQuickGoalByKey(key) {
  const definition = getMissionQuickDefinitionByKey(key);
  if (!definition) {
    return null;
  }
  const slot = getMissionQuickSlotByKey(key);
  const goals = Array.isArray(state.missions) ? state.missions : [];
  if (slot?.goalId) {
    const matchedById = goals.find((goal) => String(goal.id || "") === String(slot.goalId || ""));
    if (matchedById) {
      return matchedById;
    }
  }
  const normalizedTitle = normalizeMissionTitle(slot?.title || definition.defaultTitle);
  return goals.find((goal) => normalizeMissionTitle(goal.title) === normalizedTitle) || null;
}

function getMissionQuickGoalById(goalId) {
  return (Array.isArray(state.missions) ? state.missions : []).find((goal) => String(goal.id || "") === String(goalId || "")) || null;
}

function clearRunningMissionQuickFeedbackTimer() {
  if (runningMissionQuickFeedbackTimer) {
    window.clearTimeout(runningMissionQuickFeedbackTimer);
    runningMissionQuickFeedbackTimer = null;
  }
}

function clearRunningMissionQuickFocusTimer() {
  if (runningMissionQuickFocusTimer) {
    window.clearTimeout(runningMissionQuickFocusTimer);
    runningMissionQuickFocusTimer = null;
  }
}

function clearRunningMissionQuickSpotlightTimer() {
  if (runningMissionQuickSpotlightTimer) {
    window.clearTimeout(runningMissionQuickSpotlightTimer);
    runningMissionQuickSpotlightTimer = null;
  }
}

function resetRunningMissionQuickSpotlight() {
  clearRunningMissionQuickSpotlightTimer();
  state.runningMissionQuick.isAnimating = false;
  state.runningMissionQuick.spotlightGoalId = "";
  if (runningMissionQuickSpotlight) {
    runningMissionQuickSpotlight.hidden = true;
    runningMissionQuickSpotlight.setAttribute("aria-hidden", "true");
  }
  if (runningMissionQuickGrid) {
    runningMissionQuickGrid.hidden = false;
  }
  if (runningMissionQuickSpotlightFill) {
    runningMissionQuickSpotlightFill.style.transition = "none";
    runningMissionQuickSpotlightFill.style.strokeDashoffset = "276.46";
  }
}

function getMissionQuickThemeColor(key) {
  switch (String(key || "").trim()) {
    case "water":
      return "#03A9F4";
    case "store":
      return "#293245";
    case "read":
      return "#111111";
    case "brush":
      return "#8c9eff";
    case "energy":
      return "#0ea5e9";
    case "sun":
      return "#f59e0b";
    default:
      return "#2563eb";
  }
}

function getMissionQuickVisualKey(goal, index = 0) {
  const safeGoalId = String(goal?.id || "").trim();
  if (safeGoalId) {
    for (const definition of missionQuickDefinitions) {
      const matchedGoal = getMissionQuickGoalByKey(definition.key);
      if (String(matchedGoal?.id || "") === safeGoalId) {
        return definition.key;
      }
    }
  }
  return runningMissionQuickToneKeys[((Math.max(0, Number(index) || 0)) % runningMissionQuickToneKeys.length + runningMissionQuickToneKeys.length) % runningMissionQuickToneKeys.length];
}

function getLinkedStatsAspectByMissionGoalId(goalId) {
  const normalizedGoalId = String(goalId || "").trim();
  if (!normalizedGoalId) {
    return null;
  }
  for (const category of statsPointCategories) {
    const config = getStatsAspectConfigEntry(category.id);
    if (Array.isArray(config.missionGoalIds) && config.missionGoalIds.includes(normalizedGoalId)) {
      const entry = buildStatsPointEntry(category, state.statsSummary?.byCategory || {});
      return {
        category,
        entry
      };
    }
  }
  return null;
}

function resetRunningMissionQuickFocusState() {
  clearRunningMissionQuickFocusTimer();
  state.runningMissionQuick.focusKey = "";
  if (runningMissionQuickGrid) {
    runningMissionQuickGrid.hidden = false;
  }
  if (runningMissionQuickFocus) {
    runningMissionQuickFocus.hidden = true;
    runningMissionQuickFocus.style.color = "";
  }
  if (runningMissionQuickFocusProgressFill) {
    runningMissionQuickFocusProgressFill.style.width = "0%";
    runningMissionQuickFocusProgressFill.style.background = "";
  }
  if (runningMissionQuickFocusLinked) {
    runningMissionQuickFocusLinked.hidden = true;
    runningMissionQuickFocusLinked.style.color = "";
  }
  if (runningMissionQuickFocusLinkedProgressFill) {
    runningMissionQuickFocusLinkedProgressFill.style.width = "0%";
    runningMissionQuickFocusLinkedProgressFill.style.background = "";
  }
}

function showRunningMissionQuickFocus(goal, key) {
  if (!goal || !runningMissionQuickFocus || !runningMissionQuickGrid) {
    return;
  }
  resetRunningMissionQuickFocusState();
  const color = getMissionQuickThemeColor(key);
  const progress = Math.max(0, Number(goal.progressValue || 0));
  const target = Math.max(1, Number(goal.targetValue || 1));
  const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
  const linkedAspect = getLinkedStatsAspectByMissionGoalId(goal.id);
  state.runningMissionQuick.focusKey = String(key || "");
  runningMissionQuickGrid.hidden = true;
  runningMissionQuickFocus.hidden = false;
  runningMissionQuickFocus.style.color = color;
  if (runningMissionQuickFocusIcon) {
    runningMissionQuickFocusIcon.src = String(goal.svgIconUrl || "").trim() || `/200/icons/mission-${key === "store" ? "store" : key === "read" ? "book" : key === "brush" ? "brush" : "water"}.svg`;
  }
  if (runningMissionQuickFocusTitle) {
    runningMissionQuickFocusTitle.textContent = String(goal.title || "Missão");
  }
  if (runningMissionQuickFocusProgressFill) {
    runningMissionQuickFocusProgressFill.style.background = color;
    runningMissionQuickFocusProgressFill.style.width = "0%";
  }
  if (linkedAspect && runningMissionQuickFocusLinked && runningMissionQuickFocusLinkedLabel && runningMissionQuickFocusLinkedProgressFill) {
    const linkedColor = color;
    runningMissionQuickFocusLinked.hidden = false;
    runningMissionQuickFocusLinked.style.color = linkedColor;
    runningMissionQuickFocusLinkedLabel.textContent = linkedAspect.category.name;
    runningMissionQuickFocusLinkedProgressFill.style.background = linkedColor;
    runningMissionQuickFocusLinkedProgressFill.style.width = "0%";
    window.requestAnimationFrame(() => {
      runningMissionQuickFocusLinkedProgressFill.style.width = `${Math.max(0, Math.min(100, Number(linkedAspect.entry?.percent || 0)))}%`;
    });
  }
  window.requestAnimationFrame(() => {
    if (runningMissionQuickFocusProgressFill) {
      runningMissionQuickFocusProgressFill.style.width = `${percent}%`;
    }
  });
  runningMissionQuickFocusTimer = window.setTimeout(() => {
    resetRunningMissionQuickFocusState();
  }, 1300);
}

function renderRunningMissionQuickFeedback(goal, mode = "count") {
  if (!runningMissionQuickFeedback) {
    return;
  }
  if (!goal) {
    runningMissionQuickFeedback.textContent = "";
    return;
  }
  const progress = Math.max(0, Number(goal.progressValue || 0));
  const target = Math.max(1, Number(goal.targetValue || 1));
  const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
  const countText = `${goal.title} ${progress}x`;
  runningMissionQuickFeedback.textContent = mode === "percent" ? `${percent}%` : countText;
  state.runningMissionQuick.feedbackGoalKey = String(goal.id || goal.title || "");
  state.runningMissionQuick.lastRenderedText = runningMissionQuickFeedback.textContent;
}

function showRunningMissionQuickFeedback(goal) {
  clearRunningMissionQuickFeedbackTimer();
  renderRunningMissionQuickFeedback(goal, "count");
  runningMissionQuickFeedbackTimer = window.setTimeout(() => {
    renderRunningMissionQuickFeedback(goal, "percent");
  }, 1000);
}

function renderRunningMissionQuickButtons() {
  if (!runningMissionQuickGrid) {
    return;
  }
  if (state.runningMissionQuick?.isAnimating) {
    return;
  }
  const goals = (Array.isArray(state.missions) ? state.missions : [])
    .slice()
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "pt-BR"));
  if (!goals.length) {
    runningMissionQuickGrid.innerHTML = '<div class="running-mission-quick-empty">Nenhuma missão rápida disponível.</div>';
    return;
  }
  runningMissionQuickGrid.innerHTML = goals.map((goal, index) => {
    const visualKey = getMissionQuickVisualKey(goal, index);
    const iconPath = String(goal.svgIconUrl || "").trim() || `/200/icons/mission-${visualKey === "store" ? "store" : visualKey === "read" ? "book" : visualKey === "brush" ? "brush" : "water"}.svg`;
    const progress = Math.max(0, Number(goal.progressValue || 0));
    const target = Math.max(1, Number(goal.targetValue || 1));
    const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
    const circumference = 276.46;
    const dashOffset = (circumference * (100 - percent)) / 100;
    return `
      <button
        class="running-mission-quick-btn${progress <= 0 ? " is-zero-progress" : ""}"
        type="button"
        data-mission-quick-goal-id="${escapeHtml(String(goal.id || ""))}"
        data-mission-quick-tone="${escapeHtml(visualKey)}"
        aria-label="${escapeHtml(String(goal.title || "Missão"))}"
        title="${escapeHtml(`${String(goal.title || "Missão")}: ${progress} de ${target}`)}"
        style="--mission-quick-color:${escapeHtml(getMissionQuickThemeColor(visualKey))};"
      >
        <span class="running-mission-quick-card-badge">${escapeHtml(String(progress))}</span>
        <span class="running-mission-quick-card-circle-wrap">
          <svg class="running-mission-quick-card-ring${progress <= 0 ? " is-hidden" : ""}" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="runningMissionQuickGradient-${escapeHtml(String(goal.id || `goal-${index}`))}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1f9dff"></stop>
                <stop offset="100%" stop-color="#3ae4ca"></stop>
              </linearGradient>
            </defs>
            <circle class="running-mission-quick-card-ring-track" cx="50" cy="50" r="44"></circle>
            <circle class="running-mission-quick-card-ring-fill" cx="50" cy="50" r="44" data-progress-offset="${dashOffset}" style="stroke-dashoffset:276.46;stroke:url(#runningMissionQuickGradient-${escapeHtml(String(goal.id || `goal-${index}`))});"></circle>
          </svg>
          <span class="running-mission-quick-card-icon-shell">
            <img class="running-mission-quick-card-icon" src="${escapeHtml(iconPath)}" alt="" aria-hidden="true" />
          </span>
        </span>
        <span class="running-mission-quick-card-title">${escapeHtml(String(goal.title || "Missão"))}</span>
      </button>
    `;
  }).join("");
  window.requestAnimationFrame(() => {
    runningMissionQuickGrid.querySelectorAll(".running-mission-quick-card-ring-fill").forEach((element) => {
      element.style.strokeDashoffset = String(element.dataset.progressOffset || "276.46");
    });
  });
}

async function openRunningMissionQuickModal() {
  if (!getToken()) {
    redirectToProject200Login();
    return;
  }
  resetRunningMissionQuickSpotlight();
  renderRunningMissionQuickButtons();
  if (runningMissionQuickFeedback) {
    runningMissionQuickFeedback.textContent = "";
  }
  resetRunningMissionQuickFocusState();
  openModal("runningMissionQuickModal");
  void (async () => {
    await loadMissions();
    renderMissions();
    renderRunningMissionQuickButtons();
  })();
}

function applyMissionProgressLocally(goalId, delta) {
  state.missions = (Array.isArray(state.missions) ? state.missions : []).map((goal) => {
    if (String(goal.id || "") !== String(goalId || "")) {
      return goal;
    }
    const targetValue = Math.max(1, Number(goal.targetValue || 1));
    const progressValue = Math.max(0, Number(goal.progressValue || 0) + Number(delta || 0));
    return {
      ...goal,
      progressValue,
      remainingValue: Math.max(0, targetValue - progressValue),
      percent: Math.max(0, Math.min(100, Math.round((progressValue / targetValue) * 100)))
    };
  });
}

function queueRunningMissionQuickIncrement(goal) {
  const profile = String(state.selectedProfile || getDefaultProfileName()).trim();
  runningMissionQuickRequestChain = runningMissionQuickRequestChain
    .catch(() => {})
    .then(async () => {
      try {
        const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(String(goal.id || ""))}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            delta: 1
          })
        });
        if (Array.isArray(payload?.goals)) {
          state.missions = payload.goals;
          renderMissions();
          renderRunningMissionQuickButtons();
          const updatedGoal = getMissionQuickGoalById(goal.id);
          if (updatedGoal && runningMissionQuickFeedback?.textContent) {
            showRunningMissionQuickFeedback(updatedGoal);
          }
        }
        enqueuePointsUpdateFeedback(payload?.pointsUpdate);
      } catch (error) {
        await loadMissions();
        renderMissions();
        renderRunningMissionQuickButtons();
        if (runningMissionQuickFeedback) {
          runningMissionQuickFeedback.textContent = error instanceof Error ? error.message : "Falha ao atualizar missão.";
        }
      }
    });
}

function startRunningMissionQuickSpotlight(goal) {
  if (!goal || !runningMissionQuickGrid || !runningMissionQuickSpotlight || !runningMissionQuickSpotlightIcon || !runningMissionQuickSpotlightFill) {
    handleRunningMissionQuickTap(String(goal?.id || ""));
    return;
  }
  const visualKey = getMissionQuickVisualKey(goal, 0);
  const iconPath = String(goal.svgIconUrl || "").trim() || `/200/icons/mission-${visualKey === "store" ? "store" : visualKey === "read" ? "book" : visualKey === "brush" ? "brush" : "water"}.svg`;
  state.runningMissionQuick.isAnimating = true;
  state.runningMissionQuick.spotlightGoalId = String(goal.id || "");
  runningMissionQuickGrid.hidden = true;
  runningMissionQuickSpotlight.hidden = false;
  runningMissionQuickSpotlight.setAttribute("aria-hidden", "false");
  runningMissionQuickSpotlightIcon.src = iconPath;
  runningMissionQuickSpotlightFill.style.transition = "none";
  runningMissionQuickSpotlightFill.style.strokeDashoffset = "276.46";
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      runningMissionQuickSpotlightFill.style.transition = "stroke-dashoffset 2000ms linear";
      runningMissionQuickSpotlightFill.style.strokeDashoffset = "0";
    });
  });
  clearRunningMissionQuickSpotlightTimer();
  runningMissionQuickSpotlightTimer = window.setTimeout(() => {
    applyMissionProgressLocally(goal.id, 1);
    renderMissions();
    resetRunningMissionQuickSpotlight();
    renderRunningMissionQuickButtons();
    playMissionProgressSound();
    queueRunningMissionQuickIncrement(goal);
  }, 2000);
}

function handleRunningMissionQuickTap(key) {
  const goal = getMissionQuickGoalById(key);
  if (!goal) {
    if (runningMissionQuickFeedback) {
      runningMissionQuickFeedback.textContent = "Missão não encontrada.";
    }
    return;
  }
  if (state.runningMissionQuick?.isAnimating) {
    return;
  }
  startRunningMissionQuickSpotlight(goal);
}

function assignMissionQuickSlot(slotKey) {
  const goalId = String(state.missionAdjust?.goalId || "").trim();
  const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id || "") === goalId);
  const definition = getMissionQuickDefinitionByKey(slotKey);
  if (!goal || !definition) {
    return;
  }
  state.missionQuickSlots = missionQuickDefinitions.map((item) => {
    if (item.key !== slotKey) {
      return getMissionQuickSlotByKey(item.key) || {
        key: item.key,
        title: item.defaultTitle,
        goalId: ""
      };
    }
    return {
      key: item.key,
      title: String(goal.title || item.defaultTitle),
      goalId: String(goal.id || "")
    };
  });
  persistMissionQuickSlots();
  renderRunningMissionQuickButtons();
  if (missionAdjustStatus) {
    missionAdjustStatus.textContent = `${goal.title} agora está no acesso rápido ${definition.label}.`;
  }
  if (missionQuickAssignStatus) {
    missionQuickAssignStatus.textContent = `${goal.title} agora está no acesso rápido ${definition.label}.`;
  }
}

async function saveTaskComposer() {
  try {
    const title = String(taskTitle?.value || "").trim();
    if (title.length < 2) {
      if (startDecisionMessage) {
        startDecisionMessage.textContent = "Escreva o titulo da tarefa.";
      }
      return;
    }
    if (startDecisionMessage) {
      startDecisionMessage.textContent = "Salvando...";
    }
    const repeatRule = state.wizard.repeatOpen ? normalizeRepeatMode(state.wizard.repeatMode) : "none";
    const repeatDays = repeatRule === "weekly"
      ? state.wizard.repeatDays
      : recurrenceDays[repeatRule] || [];
    let occurrences = buildOccurrences();
    let applyTo = "single";
    const editingAction = findActionById(state.startDecisionContext.actionId);
    if (editingAction && editingAction.repeatGroupId && state.startDecisionContext.dirty) {
      const choice = window.prompt("1 - Editar uma tarefa\n2 - Editar todas as tarefas", "2");
      if (choice == null) {
        if (startDecisionMessage) {
          startDecisionMessage.textContent = "";
        }
        return;
      }
      applyTo = String(choice).trim() === "1" ? "single" : "series";
    } else if (!editingAction && (repeatRule !== "none" || occurrences.length > 1)) {
      applyTo = "series";
    }
    const overlaps = computeOverlapsForOccurrences(occurrences, {
      excludeGroupId: applyTo === "series" ? String(editingAction?.repeatGroupId || "") : ""
    });
    if (overlaps.length) {
      let replaceOverlaps = false;
      const decision = await openOverlapWizard(overlaps, occurrences);
      if (!decision || decision.type === "cancel") {
        if (startDecisionMessage) {
          startDecisionMessage.textContent = "Ajuste o horário para continuar.";
        }
        return;
      }
      if (decision.type === "change_time") {
        if (startDecisionMessage) {
          startDecisionMessage.textContent = "Escolha outro horário.";
        }
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
        replaceOverlaps = true;
        for (const item of overlaps) {
          await apiRequest(`/api/actions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        }
      }
      state.wizard.replaceOverlaps = replaceOverlaps;
    } else {
      state.wizard.replaceOverlaps = false;
    }
    const requestPath = editingAction
      ? `/api/actions/${encodeURIComponent(editingAction.id)}`
      : "/api/actions";
    const requestMethod = editingAction ? "PATCH" : "POST";
    await apiRequest(requestPath, {
      method: requestMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        assignee: getWizardAssigneeName(),
        categoryId: normalizeTaskCategoryId(state.wizard.categoryId),
        repeatRule,
        repeatDays,
        occurrences,
        applyTo,
        replaceOverlaps: Boolean(state.wizard.replaceOverlaps || state.wizard.forceReplaceOverlaps)
      })
    });
    state.wizard.forceReplaceOverlaps = false;
    closeStartDecisionModalWith(editingAction ? "edit" : "create");
    await loadActions();
  } catch (error) {
    if (error?.code === "ACTION_OVERLAP" && Array.isArray(error?.overlaps) && error.overlaps.length) {
      const occurrences = buildOccurrences();
      const decision = await openOverlapWizard(error.overlaps, occurrences);
      if (decision?.type === "replace") {
        state.wizard.forceReplaceOverlaps = true;
        if (startDecisionMessage) startDecisionMessage.textContent = "";
        return saveTaskComposer();
      }
      if (decision?.type === "use_free" && decision.startAt) {
        const start = new Date(decision.startAt);
        const firstOccurrence = occurrences[0];
        const durationMs = firstOccurrence ? Math.max(60000, new Date(firstOccurrence.endAt).getTime() - new Date(firstOccurrence.startAt).getTime()) : 900000;
        const end = new Date(start.getTime() + durationMs);
        state.wizard.startHour = start.getHours();
        state.wizard.startMinute = start.getMinutes();
        state.wizard.endHour = end.getHours();
        state.wizard.endMinute = end.getMinutes();
        state.wizard.forceReplaceOverlaps = false;
        return saveTaskComposer();
      }
      if (startDecisionMessage) startDecisionMessage.textContent = decision?.type === "change_time" ? "Escolha outro horário." : "Ajuste o horário para continuar.";
      return;
    }
    state.wizard.forceReplaceOverlaps = false;
    if (startDecisionMessage) {
      startDecisionMessage.textContent = error instanceof Error ? error.message : "Erro ao salvar.";
    }
  }
}

function openQuickTaskModal() {
  if (quickTaskTitleInput) {
    quickTaskTitleInput.value = "";
  }
  if (quickTaskMinutesInput) {
    quickTaskMinutesInput.value = "15";
  }
  if (quickTaskStatus) {
    quickTaskStatus.textContent = "";
  }
  document.body.classList.add("quick-task-open");
  openModal("quickTaskModal");
  window.setTimeout(() => quickTaskTitleInput?.focus(), 60);
}

async function submitQuickTaskStart(conflictMode = "") {
  const title = String(quickTaskTitleInput?.value || "").trim();
  const plannedMinutes = Math.max(1, Math.round(Number(quickTaskMinutesInput?.value || 15) || 15));
  if (!title) {
    if (quickTaskStatus) {
      quickTaskStatus.textContent = "Digite o nome da tarefa.";
    }
    return;
  }
  if (quickTaskStatus) {
    quickTaskStatus.textContent = "Iniciando tarefa rápida...";
  }
  if (quickTaskStartButton) {
    quickTaskStartButton.disabled = true;
  }
  try {
    const payload = await apiRequest("/api/actions/quick-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        plannedMinutes,
        assignee: getSelectedProfileName(),
        conflictMode
      })
    });
    closeModal("quickTaskModal");
    await loadActions();
    if (payload?.action?.id) {
      openModal("runningTaskModal");
    }
  } catch (error) {
    if (quickTaskStatus) {
      quickTaskStatus.textContent = error instanceof Error ? error.message : "Falha ao iniciar a tarefa rápida.";
    }
  } finally {
    if (quickTaskStartButton) {
      quickTaskStartButton.disabled = false;
    }
  }
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
  const person = escapeHtml(entry.assignee || getDefaultProfileName());
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

function renderMissionAdjustState() {
  const targetValue = Math.max(1, Math.trunc(Number(state.missionAdjust?.targetValue || 1) || 1));
  state.missionAdjust.targetValue = targetValue;
  if (missionAdjustValue) {
    missionAdjustValue.textContent = String(targetValue);
  }
  if (missionAdjustHint) {
    missionAdjustHint.textContent = `Meta diária ${targetValue}x`;
  }
  if (missionAdjustTimeSummary) {
    missionAdjustTimeSummary.textContent = `1 missão leva ${formatMissionDurationValue(state.missionAdjust?.unitDurationSeconds || DEFAULT_MISSION_DURATION_SECONDS)}`;
  }
  missionAdjustMinusButton?.classList.remove("active");
  missionAdjustPlusButton?.classList.add("active");
}

function openMissionCreateModal() {
  if (missionTitleInput) {
    missionTitleInput.value = "";
  }
  if (missionTargetInput) {
    missionTargetInput.value = "";
  }
  if (missionCreateStatus) {
    missionCreateStatus.textContent = "";
  }
  state.missionCreate = {
    unitDurationSeconds: DEFAULT_MISSION_DURATION_SECONDS,
    timeConfigured: true
  };
  if (missionCreateTimeSummary) {
    missionCreateTimeSummary.textContent = `1 missão leva ${formatMissionDurationValue(DEFAULT_MISSION_DURATION_SECONDS)}`;
  }
  openModal("missionCreateModal");
  window.setTimeout(() => missionTitleInput?.focus(), 60);
}

function openMissionAdjustModal(goalId) {
  const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id) === String(goalId));
  if (!goal) {
    return;
  }
  state.missionAdjust = {
    goalId: String(goal.id),
    targetValue: Math.max(1, Math.trunc(Number(goal.targetValue || 1) || 1)),
    unitDurationSeconds: getMissionUnitDurationSeconds(goal)
  };
  if (missionAdjustTitle) {
    missionAdjustTitle.textContent = String(goal.title || "Missão");
  }
  if (missionAdjustStatus) {
    missionAdjustStatus.textContent = "";
  }
  renderMissionAdjustState();
  openModal("missionAdjustModal");
}

function renderMissionProgressState() {
  const baseValue = Math.max(0, Math.trunc(Number(state.missionProgress?.baseValue || 0) || 0));
  const deltaValue = Math.trunc(Number(state.missionProgress?.deltaValue || 0) || 0);
  const previewValue = Math.max(0, baseValue + deltaValue);
  if (missionProgressValue) {
    missionProgressValue.textContent = String(previewValue);
  }
  if (missionProgressHint) {
    missionProgressHint.textContent = deltaValue < 0 ? `Subtraindo ${Math.abs(deltaValue)}` : `Adicionando ${deltaValue}`;
  }
  missionProgressMinusButton?.classList.remove("active");
  missionProgressPlusButton?.classList.add("active");
}

function renderMissionTimeState() {
  const safeValue = normalizeMissionDurationOption(state.missionTime?.value);
  state.missionTime.value = safeValue;
  if (missionTimePrompt) {
    missionTimePrompt.textContent = formatMissionTimePromptLabel(state.missionTime?.title || "");
  }
  if (missionTimeValue) {
    missionTimeValue.textContent = safeValue >= 60 && safeValue % 60 === 0
      ? String(safeValue / 60)
      : String(safeValue);
  }
  if (missionTimeUnitLabel) {
    missionTimeUnitLabel.textContent = formatMissionUnitDurationLabel(safeValue);
  }
}

function openMissionTimeModal(mode) {
  const safeMode = String(mode || "").trim();
  if (safeMode === "create") {
    state.missionTime = {
      mode: "create",
      title: String(missionTitleInput?.value || "").trim() || "esta missão",
      value: normalizeMissionDurationOption(state.missionCreate?.unitDurationSeconds)
    };
  } else {
    const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id || "") === String(state.missionAdjust?.goalId || ""));
    state.missionTime = {
      mode: "adjust",
      title: String(goal?.title || missionAdjustTitle?.textContent || "esta missão").trim(),
      value: normalizeMissionDurationOption(state.missionAdjust?.unitDurationSeconds)
    };
  }
  if (missionTimeStatus) {
    missionTimeStatus.textContent = "";
  }
  renderMissionTimeState();
  openModal("missionTimeModal");
}

function stopMissionRunTicker() {
  if (missionRunTicker) {
    window.clearInterval(missionRunTicker);
    missionRunTicker = null;
  }
}

function stopMissionRunAlarm() {
  if (missionRunAlarmTicker) {
    window.clearInterval(missionRunAlarmTicker);
    missionRunAlarmTicker = null;
  }
  missionRunAlarmNodes.forEach(({ oscillator, gain }) => {
    try { oscillator.stop(); } catch {}
    try { oscillator.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
  });
  missionRunAlarmNodes.clear();
  state.missionRun.alarmStarted = false;
}

function isMissionRunModalOpen() {
  const modal = document.getElementById("missionRunModal");
  return Boolean(modal?.classList.contains("active") && modal.getAttribute("aria-hidden") !== "true");
}

function stopMissionRunCueAudio() {
  if (!missionRunCueAudio) return;
  try { missionRunCueAudio.pause(); missionRunCueAudio.currentTime = 0; } catch {}
  missionRunCueAudio = null;
}

function stopMissionRunCycleAudio() {
  if (!missionRunCycleAudio) return;
  try { missionRunCycleAudio.pause(); missionRunCycleAudio.currentTime = 0; } catch {}
  missionRunCycleAudio = null;
}

function playMissionRunCycleCue(cycleNumber) {
  const safeCycleNumber = Math.max(2, Math.min(MISSION_RUN_MAX_CYCLES, Math.trunc(Number(cycleNumber || 0) || 0)));
  const fileName = missionRunCycleCueMap.get(safeCycleNumber);
  if (!fileName) return;
  missionRunCycleAudioQueue = missionRunCycleAudioQueue
    .catch(() => {})
    .then(async () => {
      if (!isMissionRunModalOpen() || Number(state.missionRun?.cycleIndex || 1) !== safeCycleNumber) {
        return;
      }
      stopMissionRunCueAudio();
      stopMissionRunCycleAudio();
      const audio = new Audio(`/200/mission-cycles/${fileName}`);
      missionRunCycleAudio = audio;
      audio.volume = 1;
      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve();
        };
        const timeoutId = window.setTimeout(finish, 10000);
        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", finish, { once: true });
        audio.play().catch(finish);
      });
      if (missionRunCycleAudio === audio) {
        missionRunCycleAudio = null;
      }
    });
}

function playMissionRunRemainingCue(seconds) {
  const fileName = missionRunCueMap.get(seconds);
  if (!fileName || !isMissionRunModalOpen()) return;
  if (missionRunCycleAudio && !missionRunCycleAudio.paused && !missionRunCycleAudio.ended) return;
  stopMissionRunCueAudio();
  missionRunCueAudio = new Audio(`/200/mission-cues/${fileName}`);
  missionRunCueAudio.volume = 1;
  missionRunCueAudio.play().catch(() => {});
}

async function playMissionRunAlarmBurst() {
  if (!isMissionRunModalOpen()) return;
  const audioContext = getTaskBeepAudioContext();
  if (!audioContext) return;
  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch {}
  const baseAt = Math.max(audioContext.currentTime + 0.02, audioContext.currentTime);
  for (let index = 0; index < 10; index += 1) {
    const startAt = baseAt + (index * 0.14);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(2680, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.98, startAt + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    const node = { oscillator, gain };
    missionRunAlarmNodes.add(node);
    oscillator.addEventListener("ended", () => {
      missionRunAlarmNodes.delete(node);
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    }, { once: true });
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.105);
  }
}

function startMissionRunAlarm() {
  if (state.missionRun.alarmStarted || !isMissionRunModalOpen()) return;
  state.missionRun.alarmStarted = true;
  void playMissionRunAlarmBurst();
  missionRunAlarmTicker = window.setInterval(() => {
    if (!isMissionRunModalOpen()) {
      stopMissionRunAlarm();
      return;
    }
    void playMissionRunAlarmBurst();
  }, 30000);
}

function mountRunningPlayerForMission() {
  if (!runningMiniPlayer || !missionRunPlayerSlot) return;
  if (!runningMiniPlayer.dataset.originalParentId) {
    runningMiniPlayer.dataset.originalParentId = String(runningMiniPlayer.parentElement?.id || "runningTaskModal");
  }
  missionRunPlayerSlot.appendChild(runningMiniPlayer);
  runningMiniPlayer.hidden = false;
  runningMiniPlayer.removeAttribute("hidden");
  renderRunningMusicPlayer();
}

function cancelMissionRunMusicFade({ restoreVolume = true } = {}) {
  missionRunMusicFadeToken += 1;
  if (missionRunMusicFadeTimer) {
    window.clearInterval(missionRunMusicFadeTimer);
    missionRunMusicFadeTimer = null;
  }
  if (restoreVolume && runningAudio && missionRunMusicFadeRestoreVolume !== null) {
    runningAudio.volume = Math.max(0, Math.min(1, missionRunMusicFadeRestoreVolume));
  }
  missionRunMusicFadeRestoreVolume = null;
}

function fadeOutRunningMusicAfterMissionClose() {
  cancelMissionRunMusicFade();
  if (!runningAudio || runningAudio.paused || runningAudio.ended) return;

  const audio = runningAudio;
  const fadeToken = missionRunMusicFadeToken;
  const startVolume = Math.max(0, Math.min(1, Number(audio.volume ?? 1)));
  const startedAt = Date.now();
  missionRunMusicFadeRestoreVolume = startVolume;

  if (startVolume <= 0.001) {
    audio.pause();
    state.runningPlayer.isPlaying = false;
    missionRunMusicFadeRestoreVolume = null;
    renderRunningMusicPlayer();
    return;
  }

  const timer = window.setInterval(() => {
    if (fadeToken !== missionRunMusicFadeToken) {
      window.clearInterval(timer);
      if (missionRunMusicFadeTimer === timer) missionRunMusicFadeTimer = null;
      return;
    }

    const ratio = Math.max(0, Math.min(1, (Date.now() - startedAt) / MISSION_RUN_MUSIC_FADE_OUT_MS));
    audio.volume = Math.max(0, startVolume * (1 - ratio));
    if (ratio < 1) return;

    window.clearInterval(timer);
    if (missionRunMusicFadeTimer === timer) missionRunMusicFadeTimer = null;
    audio.pause();
    audio.volume = startVolume;
    missionRunMusicFadeRestoreVolume = null;
    state.runningPlayer.isPlaying = false;
    renderRunningMusicPlayer();
  }, 40);
  missionRunMusicFadeTimer = timer;
}

function stopRunningMusicAfterFinishedActivity() {
  cancelMissionRunMusicFade({ restoreVolume: false });
  if (!runningAudio) return;
  try {
    runningAudio.pause();
    runningAudio.currentTime = 0;
  } catch {}
  state.runningPlayer.isPlaying = false;
  renderRunningMusicPlayer();
}

function restoreRunningPlayerAfterMission() {
  if (!runningMiniPlayer || runningMiniPlayer.parentElement !== missionRunPlayerSlot) return;
  const runningContent = document.querySelector("#runningTaskModal .running-task-content");
  runningContent?.appendChild(runningMiniPlayer);
  renderHomeRunningTask();
}

function setMissionRunLoading(isLoading) {
  const active = Boolean(isLoading);
  missionRunLoadingOverlay?.classList.toggle("active", active);
  missionRunLoadingOverlay?.setAttribute("aria-hidden", active ? "false" : "true");
  document.body.classList.toggle("mission-run-loading", active);
}

function ensureMissionActionLoadingContent(button) {
  if (!button || button.dataset.missionLoadingReady === "1") return;
  const originalContent = button.innerHTML;
  button.innerHTML = `<span class="mission-action-loading-content"><span class="mission-action-loading-text">${originalContent}</span><svg class="mission-action-loading-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="mission-action-loading-spinner-track" cx="12" cy="12" r="9"></circle><circle class="mission-action-loading-spinner-arc" cx="12" cy="12" r="9"></circle></svg></span>`;
  button.dataset.missionLoadingReady = "1";
}

function beginMissionActionLoading(button, options = {}) {
  if (!button || button.dataset.missionActionBusy === "1") return null;
  ensureMissionActionLoadingContent(button);
  const scope = options?.scope || button.closest(".workspace-modal, .history-mission-run-confirm") || button.parentElement;
  const scopedButtons = scope
    ? [...scope.querySelectorAll("button")]
    : [button];
  const disabledState = scopedButtons.map((item) => ({ item, disabled: Boolean(item.disabled) }));
  button.dataset.missionActionBusy = "1";
  button.setAttribute("aria-busy", "true");
  disabledState.forEach(({ item }) => { item.disabled = true; });
  void button.offsetWidth;
  button.classList.add("is-mission-action-loading");
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    button.classList.remove("is-mission-action-loading");
    button.removeAttribute("aria-busy");
    window.setTimeout(() => {
      disabledState.forEach(({ item, disabled }) => { item.disabled = disabled; });
      delete button.dataset.missionActionBusy;
    }, 500);
  };
}

async function runMissionActionWithLoading(button, action, options = {}) {
  const finishLoading = beginMissionActionLoading(button, options);
  if (!finishLoading) return undefined;
  try {
    return await action();
  } finally {
    finishLoading();
  }
}

function waitForMissionActionTransition() {
  return new Promise((resolve) => window.setTimeout(resolve, 500));
}

function normalizeMissionRunCycleTarget(value) {
  return Math.max(1, Math.min(MISSION_RUN_MAX_CYCLES, Math.trunc(Number(value || 1) || 1)));
}

function renderMissionRunCycleCount() {
  const target = normalizeMissionRunCycleTarget(state.missionRun?.cycleTarget);
  const current = Math.max(1, Math.min(target, Math.trunc(Number(state.missionRun?.cycleIndex || 1) || 1)));
  if (missionRunCycleCount) {
    missionRunCycleCount.textContent = `${target}X`;
    missionRunCycleCount.setAttribute("aria-label", `Quantidade de ciclos: ${target}. Ciclo atual: ${current}. Deslize para alterar`);
  }
  if (missionRunCycleSpotlightValue) {
    missionRunCycleSpotlightValue.textContent = String(current);
  }
  if (missionRunCycleSpotlight) {
    missionRunCycleSpotlight.hidden = target < 2;
  }
  missionRunClock?.classList.toggle("has-cycle-spotlight", target >= 2);
}

function getMissionRunVariantIdForCycle(cycleNumber = state.missionRun?.cycleIndex) {
  const index = Math.max(0, Math.trunc(Number(cycleNumber || 1) || 1) - 1);
  return String(state.missionRun?.selectedVariantIds?.[index] || state.missionRun?.selectedVariantId || "").trim();
}

function resetMissionRunCycleTimer(cycleNumber = 1) {
  const safeCycle = normalizeMissionRunCycleTarget(cycleNumber);
  stopMissionRunAlarm();
  stopMissionRunCueAudio();
  state.missionRun.cycleIndex = safeCycle;
  state.missionRun.startedAtMs = Date.now();
  state.missionRun.alarmStarted = false;
  state.missionRun.transitioningCycle = false;
  state.missionRun.rankingPreloadStarted = false;
  state.missionRun.preloadedDailyRanking = null;
  state.missionRun.announcedCueSeconds = [];
  state.missionRun.previousRemainingSeconds = null;
  state.missionRun.selectedVariantId = getMissionRunVariantIdForCycle(safeCycle);
  if (missionRunFinishChoice) missionRunFinishChoice.hidden = true;
  if (missionRunConfirm) missionRunConfirm.hidden = true;
  if (missionRunStatus) missionRunStatus.textContent = "";
  renderMissionRunCycleCount();
  renderMissionRunState();
}

async function preloadMissionRunDailyRanking() {
  if (state.missionRun.rankingPreloadStarted || !getToken()) return;
  state.missionRun.rankingPreloadStarted = true;
  try {
    state.missionRun.preloadedDailyRanking = await apiRequest("/api/200/friends?scope=today", { skipGlobalLoading: false });
  } catch {
    state.missionRun.preloadedDailyRanking = null;
  }
}

function advanceMissionRunCycle() {
  const current = normalizeMissionRunCycleTarget(state.missionRun?.cycleIndex);
  const target = normalizeMissionRunCycleTarget(state.missionRun?.cycleTarget);
  state.missionRun.completedCycles = Math.max(Number(state.missionRun.completedCycles || 0), current);
  if (current >= target) return false;
  const nextCycle = current + 1;
  resetMissionRunCycleTimer(nextCycle);
  playMissionRunCycleCue(nextCycle);
  return true;
}

function completeMissionRunCycle() {
  stopMissionRunAlarm();
  if (advanceMissionRunCycle()) return;
  state.missionRun.completedCycles = Math.max(
    Number(state.missionRun.completedCycles || 0),
    normalizeMissionRunCycleTarget(state.missionRun?.cycleIndex)
  );
  if (missionRunFinishChoice) missionRunFinishChoice.hidden = false;
}

function scheduleMissionRunVariantCycleSelection({ preserveCompleted = false, resumeMode = "preserve" } = {}) {
  if (missionRunVariantSelectionTimer) {
    window.clearTimeout(missionRunVariantSelectionTimer);
    missionRunVariantSelectionTimer = null;
  }
  const variants = Array.isArray(state.missionRun.availableVariants) ? state.missionRun.availableVariants : [];
  const cycleTarget = normalizeMissionRunCycleTarget(state.missionRun.cycleTarget);
  if (variants.length < 2 || cycleTarget < 2) return;
  missionRunVariantSelectionTimer = window.setTimeout(() => {
    missionRunVariantSelectionTimer = null;
    void openMissionVariantsModal(state.missionRun.goalId, "cycle-choose", {
      items: variants,
      cycleTarget,
      initialSelections: preserveCompleted
        ? (state.missionRun.selectedVariantIds || []).slice(0, cycleTarget)
        : [],
      resumeMode
    });
  }, 1000);
}

function setMissionRunCycleTarget(value) {
  if (!state.missionRun?.goalId || state.missionRun.finalizing) return;
  const previousTarget = normalizeMissionRunCycleTarget(state.missionRun.cycleTarget);
  const currentCycle = normalizeMissionRunCycleTarget(state.missionRun.cycleIndex);
  const nextTarget = Math.max(currentCycle, normalizeMissionRunCycleTarget(value));
  if (nextTarget === previousTarget) {
    renderMissionRunCycleCount();
    return;
  }
  state.missionRun.cycleTarget = nextTarget;
  if (nextTarget < previousTarget) {
    state.missionRun.selectedVariantIds = (state.missionRun.selectedVariantIds || []).slice(0, nextTarget);
  }
  if (nextTarget > previousTarget
    && Array.isArray(state.missionRun.availableVariants)
    && state.missionRun.availableVariants.length >= 2
    && (state.missionRun.selectedVariantIds || []).length < nextTarget) {
    scheduleMissionRunVariantCycleSelection({ preserveCompleted: true, resumeMode: "preserve" });
  }
  renderMissionRunState();
}

function restartMissionRunLocally() {
  if (state.missionRun.finalizing) return;
  const completed = Math.max(1, Math.trunc(Number(state.missionRun.completedCycles || state.missionRun.cycleIndex || 1) || 1));
  if (completed >= MISSION_RUN_MAX_CYCLES) {
    if (missionRunStatus) missionRunStatus.textContent = `O máximo é de ${MISSION_RUN_MAX_CYCLES} ciclos. Toque em Finalizar para receber os pontos.`;
    return;
  }
  state.missionRun.completedCycles = completed;
  state.missionRun.cycleTarget = Math.max(normalizeMissionRunCycleTarget(state.missionRun.cycleTarget), completed + 1);
  state.missionRun.cycleIndex = completed;
  if (Array.isArray(state.missionRun.availableVariants) && state.missionRun.availableVariants.length >= 2
    && !state.missionRun.selectedVariantIds[completed]) {
    if (missionRunFinishChoice) missionRunFinishChoice.hidden = true;
    scheduleMissionRunVariantCycleSelection({ preserveCompleted: true, resumeMode: "advance" });
    return;
  }
  advanceMissionRunCycle();
}

function getMissionRunGoalById(goalId) {
  const normalizedGoalId = String(goalId || "").trim();
  if (!normalizedGoalId) return null;
  return [
    ...(Array.isArray(state.actionMissions) ? state.actionMissions : []),
    ...(Array.isArray(state.missions) ? state.missions : [])
  ].find((item) => String(item?.id || "") === normalizedGoalId) || null;
}

function shouldSuppressMissionRunTimeCueNearCycle(cueSeconds, totalSeconds) {
  const currentCycle = normalizeMissionRunCycleTarget(state.missionRun?.cycleIndex);
  const targetCycles = normalizeMissionRunCycleTarget(state.missionRun?.cycleTarget);
  const nearPreviousCycleStart = currentCycle > 1
    && Math.abs(Number(totalSeconds || 0) - Number(cueSeconds || 0)) <= MISSION_RUN_CUE_PRIORITY_RADIUS_SECONDS;
  const nearNextCycleStart = currentCycle < targetCycles
    && Number(cueSeconds || 0) <= MISSION_RUN_CUE_PRIORITY_RADIUS_SECONDS;
  return nearPreviousCycleStart || nearNextCycleStart;
}

function renderMissionRunState() {
  const goalId = String(state.missionRun?.goalId || "").trim();
  const goal = getMissionRunGoalById(goalId);
  if (!goal) {
    return;
  }
  const durationMs = Math.max(0, Number(state.missionRun?.durationMs || 0));
  const elapsedMs = Math.max(0, Date.now() - Math.max(0, Number(state.missionRun?.startedAtMs || 0)));
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const percentPrecise = durationMs > 0 ? clampPercent((elapsedMs / durationMs) * 100) : 0;
  const percent = Math.round(percentPrecise);
  const circumference = 301.59;
  if (missionRunTitle) {
    missionRunTitle.textContent = String(goal.title || "Missão");
  }
  if (missionRunTitleIcon) {
    const icon = getMissionDisplayIcon(goal);
    missionRunTitleIcon.src = icon.src;
    missionRunTitleIcon.alt = icon.alt;
  }
  if (missionRunRingFill) {
    missionRunRingFill.style.strokeDashoffset = String(circumference - ((percentPrecise / 100) * circumference));
  }
  const centerMode = state.missionRun?.centerMode === "percent" ? "percent" : "time";
  missionRunModePercentBtn?.classList.toggle("active", centerMode === "percent");
  missionRunModeTimeBtn?.classList.toggle("active", centerMode === "time");
  if (missionRunClock) {
    missionRunClock.innerHTML = formatRunningCenter(percent, percentPrecise, remainingSeconds / 60, remainingSeconds, centerMode === "percent");
  }
  if (missionRunStatus) {
    missionRunStatus.textContent = durationMs > 0 ? "" : "Esta missão não tem tempo definido.";
  }
  syncRunningMinuteCueSchedule(
    `mission:${goalId}:cycle:${normalizeMissionRunCycleTarget(state.missionRun?.cycleIndex)}`,
    String(goal.title || "Missão"),
    remainingSeconds
  );
  renderMissionRunCycleCount();
  const announced = new Set(Array.isArray(state.missionRun.announcedCueSeconds) ? state.missionRun.announcedCueSeconds : []);
  const totalSeconds = Math.ceil(durationMs / 1000);
  for (const cueSeconds of missionRunCueMap.keys()) {
    if (totalSeconds >= cueSeconds && remainingSeconds <= cueSeconds && !announced.has(cueSeconds) && isMissionRunModalOpen()) {
      announced.add(cueSeconds);
      if (shouldSuppressMissionRunTimeCueNearCycle(cueSeconds, totalSeconds)) {
        continue;
      }
      playMissionRunRemainingCue(cueSeconds);
      break;
    }
  }
  state.missionRun.announcedCueSeconds = [...announced];
  state.missionRun.previousRemainingSeconds = remainingSeconds;
  const isLastCycle = normalizeMissionRunCycleTarget(state.missionRun?.cycleIndex) >= normalizeMissionRunCycleTarget(state.missionRun?.cycleTarget);
  if (isLastCycle && durationMs > 0 && remainingSeconds <= 30 && !state.missionRun.rankingPreloadStarted) {
    void preloadMissionRunDailyRanking();
  }
  if (durationMs > 0 && remainingSeconds <= 0 && missionRunFinishChoice?.hidden !== false && isMissionRunModalOpen()) {
    if (!isLastCycle && !state.missionRun.transitioningCycle) {
      state.missionRun.transitioningCycle = true;
      advanceMissionRunCycle();
    } else if (isLastCycle) {
      startMissionRunAlarm();
    }
  }
}

function normalizeMissionVariantSortMode(value) {
  return String(value || "").trim().toLowerCase() === "priority" ? "priority" : "user";
}

function loadMissionVariantSortMode() {
  try {
    return normalizeMissionVariantSortMode(window.localStorage.getItem(missionVariantSortKey));
  } catch {
    return "user";
  }
}

function saveMissionVariantSortMode(value) {
  const normalized = normalizeMissionVariantSortMode(value);
  try {
    window.localStorage.setItem(missionVariantSortKey, normalized);
  } catch {}
  return normalized;
}

function getMissionVariantTiming(variant, nowMs = getServerNowMs()) {
  const intervalMs = Math.max(1, Number(variant?.intervalValue || 1)) * (variant?.intervalUnit === "hours" ? 3600000 : 86400000);
  const rawReferenceMs = new Date(variant?.lastCompletedAt || variant?.createdAt || nowMs).getTime();
  const referenceMs = Number.isFinite(rawReferenceMs) ? rawReferenceMs : nowMs;
  const dueAtMs = referenceMs + intervalMs;
  const signedRemainingMs = dueAtMs - nowMs;
  const remainingMs = Math.max(0, signedRemainingMs);
  const overdueMs = Math.max(0, -signedRemainingMs);
  const completedCycle = Boolean(variant?.lastCompletedAt) && signedRemainingMs > 0;
  return {
    intervalMs,
    referenceMs,
    dueAtMs,
    signedRemainingMs,
    remainingMs,
    overdueMs,
    completedCycle,
    percent: Math.max(0, Math.min(100, (remainingMs / intervalMs) * 100))
  };
}

function formatMissionVariantDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function formatMissionVariantRemaining(timing) {
  if (timing.overdueMs > 0) {
    return `Atraso: ${formatMissionVariantDuration(timing.overdueMs)}`;
  }
  return `Restam: ${formatMissionVariantDuration(timing.remainingMs)}`;
}

function sortMissionVariants(items, sortMode = "user") {
  const normalizedMode = normalizeMissionVariantSortMode(sortMode);
  const nowMs = getServerNowMs();
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    if (normalizedMode === "priority") {
      const leftTiming = getMissionVariantTiming(left, nowMs);
      const rightTiming = getMissionVariantTiming(right, nowMs);
      if (leftTiming.overdueMs > 0 || rightTiming.overdueMs > 0) {
        if (leftTiming.overdueMs !== rightTiming.overdueMs) return rightTiming.overdueMs - leftTiming.overdueMs;
      }
      const timingDifference = leftTiming.percent - rightTiming.percent;
      if (timingDifference) return timingDifference;
    }
    const leftCreatedAt = new Date(left?.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right?.createdAt || 0).getTime();
    const creationDifference = (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0) - (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0);
    return creationDifference || String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

function getMissionVariantsDailyProgress(variants, nowMs = getServerNowMs()) {
  const items = Array.isArray(variants) ? variants : [];
  const todayKey = getProjectDateKey(new Date(nowMs));
  const tomorrowStartMs = projectDateKeyToDate(addDaysToDateKey(todayKey, 1)).getTime();
  const assignedToday = items.filter((variant) => {
    const timing = getMissionVariantTiming(variant, nowMs);
    const completedToday = Boolean(variant?.lastCompletedAt) && getProjectDateKey(new Date(variant.lastCompletedAt)) === todayKey;
    return completedToday || timing.dueAtMs < tomorrowStartMs;
  });
  const completedToday = assignedToday.filter((variant) => {
    if (!variant?.lastCompletedAt || getProjectDateKey(new Date(variant.lastCompletedAt)) !== todayKey) return false;
    return getMissionVariantTiming(variant, nowMs).signedRemainingMs > 0;
  });
  const total = assignedToday.length;
  const completed = completedToday.length;
  return {
    total,
    completed,
    percent: total > 0 ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 100,
    label: total > 0 ? `${completed} de ${total}` : "Completo hoje"
  };
}

function syncMissionVariantsIntoMissionState(goalId, items) {
  const variants = Array.isArray(items) ? items : [];
  state.missions = (Array.isArray(state.missions) ? state.missions : []).map((goal) => (
    String(goal?.id || "") === String(goalId || "")
      ? { ...goal, variants, variantCount: variants.length }
      : goal
  ));
}

function renderMissionVariants() {
  const editorOpen = Boolean(state.missionVariants.editorOpen);
  const chooseMode = state.missionVariants.mode === "choose" || state.missionVariants.mode === "cycle-choose";
  const cycleChooseMode = state.missionVariants.mode === "cycle-choose";
  const cycleSelectionTarget = normalizeMissionRunCycleTarget(state.missionVariants.cycleSelectionTarget);
  const cycleSelections = Array.isArray(state.missionVariants.cycleSelections) ? state.missionVariants.cycleSelections : [];
  if (missionVariantsKicker) missionVariantsKicker.textContent = chooseMode ? "Antes de iniciar" : "Micro-tarefas da missão";
  if (missionVariantsTitle) {
    missionVariantsTitle.textContent = cycleChooseMode
      ? `Escolha a micro-tarefa do ciclo ${Math.min(cycleSelections.length + 1, cycleSelectionTarget)}`
      : chooseMode
        ? "Qual micro-tarefa você vai fazer?"
        : (getMissionRunGoalById(state.missionVariants.goalId)?.title || "Lista de micro-tarefas");
  }
  if (missionVariantCycleSelection) {
    missionVariantCycleSelection.hidden = !cycleChooseMode;
    missionVariantCycleSelection.textContent = cycleChooseMode
      ? `${cycleSelections.length} de ${cycleSelectionTarget} ciclos escolhidos`
      : "";
  }
  if (missionVariantAddButton) missionVariantAddButton.hidden = chooseMode || editorOpen;
  if (missionVariantEditor) missionVariantEditor.hidden = !editorOpen;
  if (missionVariantSortButton) {
    const sortModeLabel = state.missionVariants.sortMode === "priority" ? "Prioridade" : "Usuário";
    missionVariantSortButton.hidden = editorOpen;
    missionVariantSortButton.setAttribute("aria-expanded", state.missionVariants.sortMenuOpen ? "true" : "false");
    missionVariantSortButton.setAttribute("aria-label", `Ordenar por: ${sortModeLabel}`);
    missionVariantSortButton.title = `Ordenar por: ${sortModeLabel}`;
  }
  if (missionVariantSortMenu) {
    missionVariantSortMenu.hidden = editorOpen || !state.missionVariants.sortMenuOpen;
    missionVariantSortMenu.querySelectorAll("[data-mission-variant-sort]").forEach((button) => {
      button.classList.toggle("active", button.dataset.missionVariantSort === state.missionVariants.sortMode);
    });
  }
  if (missionVariantDeadlineValue) missionVariantDeadlineValue.textContent = String(state.missionVariants.intervalValue || 1);
  missionVariantHoursButton?.classList.toggle("active", state.missionVariants.intervalUnit === "hours");
  missionVariantDaysButton?.classList.toggle("active", state.missionVariants.intervalUnit === "days");
  if (!missionVariantsList) return;
  const items = sortMissionVariants(state.missionVariants.items, state.missionVariants.sortMode);
  missionVariantsList.hidden = editorOpen;
  missionVariantsList.innerHTML = items.length ? items.map((variant) => {
    const timing = getMissionVariantTiming(variant);
    const tone = timing.overdueMs > 0 ? "red" : timing.percent <= 10 ? "red" : timing.percent <= 30 ? "orange" : "green";
    const barPercent = timing.completedCycle
      ? 100
      : timing.overdueMs > 0
        ? Math.max(2, Math.min(100, (timing.overdueMs / timing.intervalMs) * 100))
        : timing.percent;
    const unitLabel = variant.intervalUnit === "hours" ? `${variant.intervalValue}h` : `${variant.intervalValue} ${variant.intervalValue === 1 ? "dia" : "dias"}`;
    return `<article class="mission-variant-card${timing.completedCycle ? " is-completed" : ""}${timing.overdueMs > 0 ? " is-overdue" : ""}" data-mission-variant-id="${escapeHtml(variant.id)}">
      <button class="mission-variant-main" type="button"><span><strong>${escapeHtml(variant.title)}</strong><small>Prazo: ${unitLabel} · ${formatMissionVariantRemaining(timing)}</small></span>${chooseMode ? `<span class="mission-variant-play">${cycleChooseMode ? "Escolher" : "Iniciar"}</span>` : ""}</button>
      ${chooseMode ? "" : `<button class="mission-variant-delete" type="button" data-mission-variant-delete="${escapeHtml(variant.id)}" aria-label="Excluir ${escapeHtml(variant.title)}">×</button>`}
      <div class="mission-variant-bar"><span class="${tone}" style="width:${barPercent.toFixed(2)}%"></span></div>
    </article>`;
  }).join("") : '<div class="empty-state">Adicione micro-tarefas diferentes para controlar seus prazos.</div>';
}

async function loadMissionVariants(goalId, { force = false } = {}) {
  const cacheKey = String(goalId || "").trim();
  const cached = missionVariantsCache.get(cacheKey);
  if (!force && cached && Date.now() - Number(cached.loadedAt || 0) < 60000) {
    state.missionVariants.items = Array.isArray(cached.items) ? cached.items : [];
    return state.missionVariants.items;
  }
  const profile = encodeURIComponent(String(state.selectedProfile || getDefaultProfileName()).trim());
  const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}/variants?profile=${profile}`);
  state.missionVariants.items = Array.isArray(payload?.variants) ? payload.variants : [];
  missionVariantsCache.set(cacheKey, { loadedAt: Date.now(), items: state.missionVariants.items });
  return state.missionVariants.items;
}

async function openMissionVariantsModal(goalId, mode = "edit", options = {}) {
  const cachedItems = Array.isArray(options?.items) ? options.items : [];
  state.missionVariants = {
    goalId: String(goalId || ""),
    mode,
    items: cachedItems,
    editorOpen: false,
    editingId: "",
    cycleSelectionTarget: normalizeMissionRunCycleTarget(options?.cycleTarget || 1),
    cycleSelections: Array.isArray(options?.initialSelections) ? options.initialSelections.slice(0, MISSION_RUN_MAX_CYCLES) : [],
    cycleSelectionResumeMode: options?.resumeMode === "advance" ? "advance" : "preserve",
    sortMode: loadMissionVariantSortMode(),
    sortMenuOpen: false,
    intervalValue: 1,
    intervalUnit: "days"
  };
  openModal("missionVariantsModal");
  if (missionVariantsList && !cachedItems.length) missionVariantsList.innerHTML = '<div class="empty-state">Carregando atividades...</div>';
  try {
    if (!cachedItems.length) await loadMissionVariants(goalId);
  } catch (error) {
    if (missionVariantsList) missionVariantsList.innerHTML = `<div class="empty-state">${escapeHtml(error instanceof Error ? error.message : "Falha ao carregar.")}</div>`;
    return;
  }
  renderMissionVariants();
  if (missionVariantsTicker) window.clearInterval(missionVariantsTicker);
  missionVariantsTicker = window.setInterval(renderMissionVariants, 1000);
}

function beginMissionRun(goal, selectedVariant = null) {
  if (!goal) return;
  cancelMissionRunMusicFade();
  state.missionRun.goalId = String(goal.id || "");
  state.missionRun.startedAtMs = Date.now();
  state.missionRun.durationMs = Math.max(0, getMissionUnitDurationSeconds(goal) * 1000);
  state.missionRun.centerMode = "time";
  state.missionRun.alarmStarted = false;
  state.missionRun.finalizing = false;
  state.missionRun.completedSuccessfully = false;
  state.missionRun.selectedVariantId = String(selectedVariant?.id || "");
  state.missionRun.selectedVariantIds = selectedVariant?.id ? [String(selectedVariant.id)] : [];
  state.missionRun.cycleTarget = 1;
  state.missionRun.cycleIndex = 1;
  state.missionRun.completedCycles = 0;
  state.missionRun.transitioningCycle = false;
  state.missionRun.preloadedDailyRanking = null;
  state.missionRun.rankingPreloadStarted = false;
  state.missionRun.announcedCueSeconds = [];
  state.missionRun.previousRemainingSeconds = null;
  state.missionRun.previousTaskTitle = String(state.runningPlayer.currentTaskTitle || "").trim();
  state.runningPlayer.currentTaskTitle = String(goal.title || "Missão").trim();
  if (missionRunConfirm) {
    missionRunConfirm.hidden = true;
  }
  if (missionRunFinishChoice) {
    missionRunFinishChoice.hidden = true;
  }
  const alarmContext = getTaskBeepAudioContext();
  if (alarmContext?.state === "suspended") {
    void alarmContext.resume().catch(() => {});
  }
  renderMissionRunState();
  mountRunningPlayerForMission();
  const missionGoalId = String(goal.id || "");
  void loadRunningMusicStations().then(() => {
    if (!isMissionRunModalOpen() || String(state.missionRun.goalId || "") !== missionGoalId) return;
    return autoPlayRunningTaskDefaultPreference({ title: String(goal.title || "Missão") });
  });
  stopMissionRunTicker();
  missionRunTicker = window.setInterval(renderMissionRunState, 1000);
  openModal("missionRunModal");
  setMissionRunLoading(false);
}

async function openMissionRunModal(goalId) {
  const goal = getMissionRunGoalById(goalId);
  if (!goal) return;
  setMissionRunLoading(true);
  try {
    state.missionVariants.goalId = String(goalId || "");
    const variants = await loadMissionVariants(goalId);
    if (variants.length >= 2) {
      setMissionRunLoading(false);
      await openMissionVariantsModal(goalId, "choose", { items: variants });
      return;
    }
    state.missionRun.availableVariants = variants;
    beginMissionRun(goal, variants[0] || null);
  } catch {
    beginMissionRun(goal, null);
  } finally {
    if (!document.getElementById("missionRunModal")?.classList.contains("active")) {
      setMissionRunLoading(false);
    }
  }
}

async function finalizeMissionRun(triggerButton = null) {
  const goalId = String(state.missionRun?.goalId || "").trim();
  if (!goalId || state.missionRun.finalizing) {
    return;
  }
  const finishLoading = beginMissionActionLoading(triggerButton, {
    scope: document.getElementById("missionRunModal")
  });
  const completedCycles = Math.max(1, Math.min(MISSION_RUN_MAX_CYCLES, Math.trunc(Number(state.missionRun.completedCycles || state.missionRun.cycleIndex || 1) || 1)));
  const preloadedDailyRanking = state.missionRun.preloadedDailyRanking;
  state.missionRun.finalizing = true;
  if (missionRunFinishButton) missionRunFinishButton.disabled = true;
  if (missionRunRestartButton) missionRunRestartButton.disabled = true;
  if (missionRunStatus) {
    missionRunStatus.textContent = "Concluindo...";
  }
  try {
    const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: String(state.selectedProfile || getDefaultProfileName()).trim(),
        delta: completedCycles,
        variantId: String(state.missionRun.selectedVariantId || ""),
        variantIds: (state.missionRun.selectedVariantIds || []).slice(0, completedCycles),
        pointsSnapshotPrepared: Boolean(preloadedDailyRanking)
      })
    });
    enqueuePointsUpdateFeedback({
      before: payload?.pointsUpdate?.before || preloadedDailyRanking,
      after: payload?.pointsUpdate?.after || null
    });
    stopMissionRunAlarm();
    playMissionProgressSound();
    await Promise.all([loadMissions(), loadActionMissions()]);
    renderMissions();
    renderActions();
    renderRunningMissionQuickButtons();
    state.missionRun.completedSuccessfully = true;
    if (state.options.stopMusicOnFinish) {
      stopRunningMusicAfterFinishedActivity();
    }
    closeModal("missionRunModal");
  } catch (error) {
    state.missionRun.finalizing = false;
    showFloatingNotice(error instanceof Error ? error.message : "Falha ao concluir missão.");
    if (missionRunStatus) {
      missionRunStatus.textContent = error instanceof Error ? error.message : "Falha ao concluir missão.";
    }
  } finally {
    finishLoading?.();
    if (!finishLoading) {
      if (missionRunFinishButton) missionRunFinishButton.disabled = false;
      if (missionRunRestartButton) missionRunRestartButton.disabled = false;
    }
  }
}

function openMissionProgressModal(goalId) {
  const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id) === String(goalId));
  if (!goal) {
    return;
  }
  state.missionProgress = {
    goalId: String(goal.id || ""),
    deltaValue: 0,
    baseValue: Math.max(0, Math.trunc(Number(goal.progressValue || 0) || 0))
  };
  if (missionProgressTitle) {
    missionProgressTitle.textContent = String(goal.title || "Missão");
  }
  if (missionProgressStatus) {
    missionProgressStatus.textContent = "";
  }
  renderMissionProgressState();
  openModal("missionProgressModal");
}

function createMissionCard(goal) {
  const goalIcon = getMissionDisplayIcon(goal);
  const historyRangeActive = isMissionHistoryRangeActive();
  const variants = Array.isArray(goal?.variants) ? goal.variants : [];
  const hasMicrotasks = variants.length > 0 || Number(goal?.variantCount || 0) > 0;
  const dailyVariantProgress = !historyRangeActive && variants.length > 0
    ? getMissionVariantsDailyProgress(variants)
    : null;
  const progress = dailyVariantProgress ? dailyVariantProgress.completed : Math.max(0, Number(goal.progressValue || 0));
  const target = dailyVariantProgress ? dailyVariantProgress.total : Math.max(1, Number(goal.targetValue || 1));
  const percent = dailyVariantProgress
    ? dailyVariantProgress.percent
    : Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
  const progressLabel = dailyVariantProgress
    ? dailyVariantProgress.label
    : `${Math.max(0, Math.trunc(progress || 0))} de ${Math.max(1, Math.trunc(target || 1))}`;
  const card = document.createElement("article");
  card.className = `history-mission-card${hasMicrotasks ? " has-microtasks" : ""}`;
  card.dataset.goalId = String(goal.id || "");
  card.dataset.historyRangeActive = historyRangeActive ? "true" : "false";
  card.innerHTML = `
    <div class="history-mission-card-top">
      <div class="history-mission-card-info">
        ${goalIcon ? buildTaskAvatarMarkup(goalIcon.src, goalIcon.alt, { categoryIcon: goalIcon.categoryIcon }) : ""}
        <div>
        <h3 class="history-mission-card-title">${escapeHtml(String(goal.title || "Missão"))}${hasMicrotasks ? '<svg class="history-mission-folder-icon" viewBox="0 0 24 24" aria-label="Missão com microtarefas" role="img"><path d="M3 5.5h7l2 2h9v11H3v-13Zm2 4v7h14v-7H5Z" fill="currentColor"/></svg>' : ""}</h3>
        <div class="history-mission-card-progress">${escapeHtml(progressLabel)}</div>
        </div>
      </div>
      <div class="history-mission-card-actions">
        <button class="history-mission-card-edit" type="button" data-mission-goal-edit="${escapeHtml(String(goal.id || ""))}" aria-label="${escapeHtml(`Editar ${String(goal.title || "missão")}`)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 9.7-9.7-3.5-3.5L5 15.5 4 20zm12-13.8 2.8 2.8 1.2-1.2a2 2 0 0 0 0-2.8l-.1-.1a2 2 0 0 0-2.8 0L16 6.2z"/></svg></button>
      </div>
    </div>
    <div class="history-mission-progress-track" aria-hidden="true">
      <div class="history-mission-progress-fill" style="width:${percent}%;"></div>
    </div>
  `;
  return card;
}

function renderMissions() {
  const goals = Array.isArray(state.missions) ? state.missions : [];
  renderMissionScopeControls();
  if (missionsEmpty) {
    missionsEmpty.hidden = goals.length > 0;
  }
  if (missionList) {
    missionList.hidden = goals.length === 0;
    missionList.innerHTML = "";
  }
  if (missionsFooter) {
    missionsFooter.hidden = false;
  }
  if (!missionList || !goals.length) {
    return;
  }
  goals.forEach((goal) => {
    missionList.appendChild(createMissionCard(goal));
  });
}

function moveHistoryDate(amount) {
  state.historyOffset += amount;
  renderMissions();
  return payload;
}

async function shiftMissionHistoryScope(direction) {
  const nextIndex = Math.max(0, Math.min(missionHistoryScopes.length - 1, state.missionHistoryScopeIndex + direction));
  if (nextIndex === state.missionHistoryScopeIndex) {
    renderMissionScopeControls();
    return;
  }
  state.missionHistoryScopeIndex = nextIndex;
  await loadMissions();
  renderMissions();
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
    assignee: getDefaultProfileName(),
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
  renderHistorySpeakerSelectionOptions();
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
    speaker: state.selectedProfile || getDefaultProfileName(),
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
  if (!historyTextComposer) {
    return;
  }
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

function getTopProjectModal() {
  for (let index = modalNavigationStack.length - 1; index >= 0; index -= 1) {
    const modal = document.getElementById(modalNavigationStack[index]);
    if (modal?.classList.contains("active")) return modal;
  }
  const activeModals = [...document.querySelectorAll(".workspace-modal.active")];
  return activeModals[activeModals.length - 1] || null;
}

function navigateBackOneProjectLayer() {
  if (actionCategoryModal?.classList.contains("active")) {
    actionCategoryModal.classList.remove("active");
    actionCategoryModal.setAttribute("aria-hidden", "true");
    return true;
  }
  if (actionWizard?.classList.contains("active")) {
    if (state.wizard.inlineEditStep || Number(state.wizard.step || 1) > 1) {
      stepWizardBack();
    } else {
      closeWizard();
    }
    return true;
  }
  if (platformWizard?.classList.contains("active")) {
    if (Number(state.platformWizard?.step || 1) > 1) {
      state.platformWizard.step = Math.max(1, Number(state.platformWizard.step) - 1);
      renderPlatformWizard();
    } else {
      closePlatformWizard();
    }
    return true;
  }
  if (actionStatusWizard?.classList.contains("active")) {
    closeActionStatusWizard();
    return true;
  }
  if (profileManageOverlay?.classList.contains("active")) {
    closeProfileManageOverlay();
    return true;
  }
  if (missionRunFinishChoice?.hidden === false) {
    missionRunFinishChoice.hidden = true;
    return true;
  }
  if (missionRunConfirm?.hidden === false) {
    missionRunConfirm.hidden = true;
    return true;
  }
  const topModal = getTopProjectModal();
  if (!topModal) return false;
  const activeWorkspaceModals = [...document.querySelectorAll(".workspace-modal.active")];
  if (topModal.id === "runningTaskModal" && activeWorkspaceModals.length === 1) {
    return false;
  }
  modalBackNavigationActive = true;
  try {
    if (topModal.id === "startConflictModal") {
      closeStartConflictModal("cancel");
    } else if (topModal.id === "startDecisionModal") {
      closeStartDecisionModalWith("cancel");
    } else if (topModal.id === "runningConfirmModal") {
      closeRunningConfirmModal();
    } else {
      if (topModal.id === "partialTaskModal") {
        stopPartialTaskPercentHold();
        const resolve = partialTaskResolver;
        partialTaskResolver = null;
        if (resolve) resolve(null);
      }
      closeModal(topModal);
    }
    const previousId = modalNavigationStack[modalNavigationStack.length - 1] || "";
    const previousModal = previousId ? document.getElementById(previousId) : null;
    if (previousModal && !previousModal.classList.contains("active")) {
      openModal(previousId);
    }
  } finally {
    modalBackNavigationActive = false;
    if (!document.querySelector(".workspace-modal.active")) {
      modalNavigationStack.length = 0;
    }
  }
  return true;
}

function preventEdgeSwipeNavigation() {
  let startX = 0;
  let startY = 0;
  let fromEdge = false;
  let shouldGoHome = false;
  let activeTouchId = null;

  const resetEdgeSwipe = () => {
    fromEdge = false;
    shouldGoHome = false;
    activeTouchId = null;
  };

  const getActiveTouch = (touchList) => {
    const touches = Array.from(touchList || []);
    if (activeTouchId === null) return touches[0] || null;
    return touches.find((touch) => touch.identifier === activeTouchId) || null;
  };

  document.addEventListener("touchstart", (event) => {
    resetEdgeSwipe();
    if (event.touches?.length !== 1 || event.target?.closest?.("button, a, input, textarea, select, [role='button'], [contenteditable='true']")) {
      return;
    }
    const touch = event.touches[0];
    startX = Number(touch.clientX);
    startY = Number(touch.clientY);
    activeTouchId = touch.identifier;
    fromEdge = Number.isFinite(startX) && startX >= 0 && startX <= 20;
    shouldGoHome = false;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!fromEdge) {
      return;
    }
    const touch = getActiveTouch(event.touches);
    if (!touch) {
      resetEdgeSwipe();
      return;
    }
    const deltaX = Number(touch.clientX) - startX;
    const deltaY = Number(touch.clientY) - startY;
    if (Math.abs(deltaY) > 24 && Math.abs(deltaY) >= deltaX) {
      resetEdgeSwipe();
      return;
    }
    if (deltaX >= 36 && deltaX >= Math.abs(deltaY) * 1.5) {
      shouldGoHome = true;
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchend", (event) => {
    const touch = getActiveTouch(event.changedTouches);
    if (!touch) {
      resetEdgeSwipe();
      return;
    }
    const endX = Number(touch.clientX);
    const deltaX = endX - startX;
    if (fromEdge && shouldGoHome && deltaX >= 64) {
      navigateBackOneProjectLayer();
    }
    resetEdgeSwipe();
  }, { passive: true });

  document.addEventListener("touchcancel", resetEdgeSwipe, { passive: true });
}

function registerNativeBackButtonHandler() {
  if (!isNativeCapacitorApp()) {
    return;
  }
  const appPlugin = getCapacitorPlugin("App");
  if (!appPlugin?.addListener) {
    return;
  }
  appPlugin.addListener("backButton", async () => {
    if (navigateBackOneProjectLayer()) {
      return;
    }
    const shouldExit = window.confirm("Deseja fechar o Projeto 200?");
    if (!shouldExit) {
      return;
    }
    try {
      await appPlugin.exitApp?.();
    } catch {}
  });
}

function isAuthErrorMessage(message) {
  const text = String(message || "").trim().toLowerCase();
  return text.includes("sessao invalida") || text.includes("sessão inválida") || text.includes("token ausente");
}

function openProject200LoginOverlay(message = "") {
  if (project200LoginMessage) {
    project200LoginMessage.textContent = message;
  }
  setProject200AuthTab("login");
  project200LoginOverlay?.classList.add("active");
  project200LoginOverlay?.setAttribute("aria-hidden", "false");
  unlockProject200Screen();
  clearScreenLockInactivityTimer();
}

function clearProject200SessionState() {
  setToken("");
  state.profileLock = "";
  state.authUser = null;
  state.social.pendingCount = 0;
  state.social.self = null;
  state.social.incomingInvites = [];
  state.social.friends = [];
  state.social.inviteComposerOpen = false;
  state.actions = [];
  state.profiles = [];
  state.historySystem = [];
  state.historyTexts = [];
  state.serverNowMs = 0;
  state.serverNowCapturedAtMs = 0;
  state.homeSnapshotReady = false;
  if (homeBootstrapRetryTimer) {
    window.clearTimeout(homeBootstrapRetryTimer);
    homeBootstrapRetryTimer = null;
  }
  unlockProject200Screen();
  clearScreenLockInactivityTimer();
  renderProfileFooter();
  renderHistorySpeakerSelectionOptions();
  renderActions();
  renderMissions();
  renderHomeRunningTask();
  renderSocialModal();
}

async function bootstrapProject200App() {
  try {
    await hydrateNativeToken();
    const token = getToken();
    if (!token) {
      redirectToProject200Login();
      return;
    }
    await ensureProject200Session();
    const musicStationsPromise = loadRunningMusicStations().catch(() => {});
    await refreshHomeSnapshot({ force: true });
    project200LoginOverlay?.classList.remove("active");
    project200LoginOverlay?.setAttribute("aria-hidden", "true");
    revealInitialHomeIfReady();
    void musicStationsPromise.then(() => revealInitialHomeIfReady());
  } catch (error) {
    if (isAuthErrorMessage(error?.message)) {
      clearProject200SessionState();
      redirectToProject200Login();
      return;
    }
    renderHomeRunningTask();
  } finally {
    if (homeBootstrapRetryTimer) {
      window.clearTimeout(homeBootstrapRetryTimer);
      homeBootstrapRetryTimer = null;
    }
    if (getToken() && !revealInitialHomeIfReady()) {
      homeBootstrapRetryTimer = window.setTimeout(() => {
        homeBootstrapRetryTimer = null;
        if (!state.runningPlayer.stationsLoaded) void loadRunningMusicStations().then(() => revealInitialHomeIfReady());
        void refreshHomeSnapshot({ force: true }).then(() => revealInitialHomeIfReady());
      }, 600);
    }
  }
}
function openPrimaryRunningSurface() {
  if (!getToken()) {
    redirectToProject200Login();
    return;
  }
  openModal("runningTaskModal");
}

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const loadingIcon = String(button.dataset.loadingIcon || "").trim();
    if (loadingIcon) {
      globalLoadingPreferredIcon = loadingIcon;
    }
    openModal(button.dataset.openModal);
  });
});

document.querySelectorAll("[data-switch-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetModalId = String(button.dataset.switchModal || "").trim();
    if (!targetModalId) {
      return;
    }
    const loadingIcon = String(button.dataset.loadingIcon || "").trim();
    if (loadingIcon) {
      globalLoadingPreferredIcon = loadingIcon;
    }
    const currentModal = button.closest(".workspace-modal");
    if (currentModal) {
      closeModal(currentModal);
    }
    openModal(targetModalId);
  });
});

if (window.history && typeof window.history.pushState === "function") {
  try {
    window.history.pushState({ project200Guard: true }, "", window.location.href);
    window.addEventListener("popstate", () => {
      navigateBackOneProjectLayer();
      try {
        window.history.pushState({ project200Guard: true }, "", window.location.href);
      } catch {}
    });
  } catch {}
}

function getTaskBeepAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!taskBeepAudioContext) {
    taskBeepAudioContext = new AudioContextCtor();
  }
  return taskBeepAudioContext;
}

async function playCompletionBeeps(cycleCount) {
  const audioContext = getTaskBeepAudioContext();
  if (!audioContext) {
    return;
  }
  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch {}
  const baseAt = Math.max(audioContext.currentTime + 0.02, audioContext.currentTime);
  for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex += 1) {
    const cycleOffset = cycleIndex * 0.5;
    const beepOffsets = [0, 0.14];
    for (const beepOffset of beepOffsets) {
      const startAt = baseAt + cycleOffset + beepOffset;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(2240, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.95, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.105);
    }
  }
  await wait(Math.max(250, cycleCount * 500 + 180));
}

function loadOptionsConfig() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(optionsConfigKey) || "{}");
    state.options.showFreeTime = parsed.showFreeTime !== false;
    state.options.missionActionsMode = normalizeMissionActionsMode(parsed.missionActionsMode);
    state.options.completionBeepCycles = taskBeepOptionCycles.includes(Number(parsed.completionBeepCycles))
      ? Number(parsed.completionBeepCycles)
      : 0;
    state.options.minuteNotificationInterval = normalizeMinuteCueInterval(parsed.minuteNotificationInterval);
    state.options.finalMinuteNotificationsEnabled = parsed.finalMinuteNotificationsEnabled !== false;
    state.options.backgroundTheme = normalizeBackgroundTheme(parsed.backgroundTheme);
    state.options.screenLockEnabled = parsed.screenLockEnabled === true;
    state.options.stopMusicOnFinish = parsed.stopMusicOnFinish === true;
  } catch {
    state.options.showFreeTime = true;
    state.options.missionActionsMode = "show";
    state.options.completionBeepCycles = 0;
    state.options.minuteNotificationInterval = 1;
    state.options.finalMinuteNotificationsEnabled = true;
    state.options.backgroundTheme = "edge";
    state.options.screenLockEnabled = false;
    state.options.stopMusicOnFinish = false;
  }
  applyBackgroundTheme();
}

function saveOptionsConfig() {
  try {
    window.localStorage.setItem(optionsConfigKey, JSON.stringify({
      showFreeTime: Boolean(state.options.showFreeTime),
      missionActionsMode: normalizeMissionActionsMode(state.options.missionActionsMode),
      completionBeepCycles: Number(state.options.completionBeepCycles || 0),
      minuteNotificationInterval: normalizeMinuteCueInterval(state.options.minuteNotificationInterval),
      finalMinuteNotificationsEnabled: Boolean(state.options.finalMinuteNotificationsEnabled),
      backgroundTheme: normalizeBackgroundTheme(state.options.backgroundTheme),
      screenLockEnabled: Boolean(state.options.screenLockEnabled),
      stopMusicOnFinish: Boolean(state.options.stopMusicOnFinish)
    }));
  } catch {}
}

function getInteractionClientY(event) {
  if (typeof event?.clientY === "number") {
    return event.clientY;
  }
  const touch = event?.touches?.[0] || event?.changedTouches?.[0] || null;
  return typeof touch?.clientY === "number" ? touch.clientY : 0;
}

function clearScreenLockPromptTimer() {
  if (state.screenLock.promptTimerId) {
    window.clearTimeout(state.screenLock.promptTimerId);
    state.screenLock.promptTimerId = 0;
  }
}

function clearScreenLockInactivityTimer() {
  if (state.screenLock.inactivityTimerId) {
    window.clearTimeout(state.screenLock.inactivityTimerId);
    state.screenLock.inactivityTimerId = 0;
  }
}

function canAutoLockScreen() {
  if (!state.options.screenLockEnabled) {
    return false;
  }
  if (!getToken()) {
    return false;
  }
  if (!state.authUser) {
    return false;
  }
  if (project200LoginOverlay?.classList.contains("active")) {
    return false;
  }
  return true;
}

function hideScreenLockPrompt() {
  clearScreenLockPromptTimer();
  state.screenLock.promptVisible = false;
  document.body.classList.remove("screen-lock-prompt");
}

function showScreenLockPrompt() {
  if (!state.screenLock.locked) {
    return;
  }
  state.screenLock.promptVisible = true;
  document.body.classList.add("screen-lock-prompt");
  clearScreenLockPromptTimer();
  state.screenLock.promptTimerId = window.setTimeout(() => {
    if (!state.screenLock.locked) {
      return;
    }
    hideScreenLockPrompt();
  }, 1500);
}

function applyScreenLockUi() {
  const locked = Boolean(state.screenLock.locked);
  document.body.classList.toggle("screen-locked", locked);
  if (!screenLockOverlay) {
    return;
  }
  screenLockOverlay.hidden = !locked;
  screenLockOverlay.classList.toggle("active", locked);
  screenLockOverlay.setAttribute("aria-hidden", locked ? "false" : "true");
}

function scheduleScreenLockInactivity() {
  clearScreenLockInactivityTimer();
  if (!canAutoLockScreen() || state.screenLock.locked) {
    return;
  }
  state.screenLock.inactivityTimerId = window.setTimeout(() => {
    lockProject200Screen();
  }, 10000);
}

function lockProject200Screen() {
  clearScreenLockInactivityTimer();
  state.screenLock.locked = true;
  state.screenLock.gestureActive = false;
  state.screenLock.touchStartY = 0;
  state.screenLock.touchCurrentY = 0;
  hideScreenLockPrompt();
  applyScreenLockUi();
}

function unlockProject200Screen() {
  state.screenLock.locked = false;
  state.screenLock.gestureActive = false;
  state.screenLock.touchStartY = 0;
  state.screenLock.touchCurrentY = 0;
  hideScreenLockPrompt();
  applyScreenLockUi();
  scheduleScreenLockInactivity();
}

function registerScreenLockActivity() {
  if (state.screenLock.locked) {
    return;
  }
  scheduleScreenLockInactivity();
}

function renderOptionsModal() {
  if (toggleFreeTimeHint) {
    toggleFreeTimeHint.textContent = state.options.showFreeTime ? "Mostrando" : "Ocultando";
  }
  toggleFreeTimeOptionButton?.classList.toggle("is-off", !state.options.showFreeTime);
  const missionActionsMode = normalizeMissionActionsMode(state.options.missionActionsMode);
  if (toggleMissionActionsHint) {
    toggleMissionActionsHint.textContent = missionActionsModeLabels.get(missionActionsMode) || "Mostrar";
  }
  toggleMissionActionsOptionButton?.classList.toggle("is-off", missionActionsMode === "hide");
  if (toggleTaskBeepHint) {
    toggleTaskBeepHint.textContent = taskBeepOptionLabels.get(Number(state.options.completionBeepCycles || 0)) || "Nenhum";
  }
  if (toggleMinuteNotificationsHint) {
    toggleMinuteNotificationsHint.textContent = getMinuteCueIntervalLabel(state.options.minuteNotificationInterval);
  }
  toggleMinuteNotificationsOptionButton?.classList.toggle("is-off", !normalizeMinuteCueInterval(state.options.minuteNotificationInterval));
  if (toggleFinalMinuteNotificationsHint) {
    toggleFinalMinuteNotificationsHint.textContent = state.options.finalMinuteNotificationsEnabled ? "Ligadas: 5, 3 e 1 minuto" : "Desligadas";
  }
  toggleFinalMinuteNotificationsOptionButton?.classList.toggle("is-off", !state.options.finalMinuteNotificationsEnabled);
  if (toggleBackgroundThemeHint) {
    toggleBackgroundThemeHint.textContent = getBackgroundThemeMode(state.options.backgroundTheme).label;
  }
  if (toggleStopMusicOnFinishHint) {
    toggleStopMusicOnFinishHint.textContent = state.options.stopMusicOnFinish ? "Encerrar junto" : "Continuar tocando";
  }
  toggleStopMusicOnFinishOptionButton?.classList.toggle("is-off", !state.options.stopMusicOnFinish);
  if (toggleScreenLockHint) {
    toggleScreenLockHint.textContent = state.options.screenLockEnabled ? "Ativada" : "Desbloqueada";
  }
  toggleScreenLockOptionButton?.classList.toggle("is-off", !state.options.screenLockEnabled);
}

function resetProject200ExportModal() {
  if (project200ExportUsernameInput) {
    project200ExportUsernameInput.value = "";
  }
  if (project200ExportMessage) {
    project200ExportMessage.textContent = "";
  }
  if (project200ExportConfirmButton) {
    project200ExportConfirmButton.disabled = false;
  }
}

function renderProject200ExportSuccess(payload) {
  if (!project200ExportMessage) {
    return;
  }
  const targetName = String(payload?.targetUser?.username || payload?.targetUser?.name || "destino").trim();
  const actionsCount = Number(payload?.summary?.actions || 0);
  const historyCount = Number(payload?.summary?.historyEntries || 0);
  const financeCount = Number(payload?.summary?.financeOccurrences || 0);
  project200ExportMessage.textContent = `Exportado para ${targetName}: ${actionsCount} tarefas, ${historyCount} históricos e ${financeCount} lançamentos/copias financeiras.`;
}

async function submitProject200Export() {
  const username = String(project200ExportUsernameInput?.value || "").trim();
  if (!username) {
    if (project200ExportMessage) {
      project200ExportMessage.textContent = "Digite o nome de usuário da conta destino.";
    }
    return;
  }

  if (project200ExportMessage) {
    project200ExportMessage.textContent = "Exportando...";
  }
  if (project200ExportConfirmButton) {
    project200ExportConfirmButton.disabled = true;
  }

  try {
    const payload = await apiRequest("/api/200/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    renderProject200ExportSuccess(payload);
  } catch (error) {
    if (project200ExportMessage) {
      project200ExportMessage.textContent = error instanceof Error ? error.message : "Falha ao exportar.";
    }
  } finally {
    if (project200ExportConfirmButton) {
      project200ExportConfirmButton.disabled = false;
    }
  }
}

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isDirectProjectHomeButton(button)) {
      navigateToProjectHome();
      return;
    }
    closeModal(button.closest(".workspace-modal"));
  });
});

document.querySelectorAll("[data-day-nav]").forEach((button) => {
  button.addEventListener("click", () => moveActiveDate(Number(button.dataset.dayNav)));
});

financePeriodPrev?.addEventListener("click", () => moveFinancePeriod(-1));
financePeriodNext?.addEventListener("click", () => moveFinancePeriod(1));
saveFinanceNotesButton?.addEventListener("click", () => {
  void saveFinanceNotes();
});
document.querySelectorAll("[data-finance-day-nav]").forEach((button) => {
  button.addEventListener("click", () => movePlatformDate(Number(button.dataset.financeDayNav)));
});
document.querySelectorAll("[data-stats-scope-nav]").forEach((button) => {
  button.addEventListener("click", () => moveStatsScope(Number(button.dataset.statsScopeNav)));
});
statsScopePrevButton?.addEventListener("click", () => moveStatsScope(-1));
statsScopeNextButton?.addEventListener("click", () => moveStatsScope(1));
document.querySelectorAll("[data-constitution-nav]").forEach((button) => {
  button.addEventListener("click", () => moveConstitutionVersion(Number(button.dataset.constitutionNav)));
});

openActionWizardButton.addEventListener("click", () => {
  if (!getToken()) {
    redirectToProject200Login();
    return;
  }

  openTaskComposer();
});

closeActionWizardButton.addEventListener("click", closeWizard);
closeActionCategoryModal?.addEventListener("click", () => closeModal(actionCategoryModal));
actionCategoryTrigger?.addEventListener("click", () => {
  actionCategoryTargetActionId = "";
  actionCategorySelectionId = String(state.wizard.categoryId || "").trim().toLowerCase();
  renderActionCategoryModal();
  if (actionCategoryModal?.parentElement !== document.body) document.body.appendChild(actionCategoryModal);
  openModal("actionCategoryModal");
});
actionCategoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-id]");
  if (!button) return;
  actionCategorySelectionId = normalizeTaskCategoryId(button.dataset.categoryId);
  state.wizard.categoryId = actionCategorySelectionId;
  state.wizard.categoryName = getTaskCategoryName(actionCategorySelectionId);
  renderActionCategoryPicker();
  if (isTaskComposerMode()) renderTaskComposerModal();
  closeModal(actionCategoryModal);
  if (actionCategoryTargetActionId) {
    void saveActionCategory(actionCategoryTargetActionId, actionCategorySelectionId);
    actionCategoryTargetActionId = "";
  }
});
confirmActionCategoryModal?.addEventListener("click", () => {
  if (!actionCategorySelectionId) return;
  state.wizard.categoryId = normalizeTaskCategoryId(actionCategorySelectionId);
  state.wizard.categoryName = getTaskCategoryName(state.wizard.categoryId);
  renderActionCategoryPicker();
  closeModal(actionCategoryModal);
  if (actionCategoryTargetActionId) {
    void saveActionCategory(actionCategoryTargetActionId, state.wizard.categoryId);
    actionCategoryTargetActionId = "";
  }
});
taskTitle?.addEventListener("input", () => {
  if (actionCategoryInterpretTimer) {
    window.clearTimeout(actionCategoryInterpretTimer);
  }
  const title = taskTitle.value.trim();
  if (!title) {
    state.wizard.categoryId = "aspecto";
    state.wizard.categoryName = "Aspecto";
    state.wizard.svgIconUrl = "";
    state.wizard.svgIconLabel = "";
    renderActionCategoryPicker();
    return;
  }
  actionCategoryInterpretTimer = window.setTimeout(() => {
    void interpretActionCategoryFromTitle(title);
  }, 3000);
});
closePlatformWizardButton?.addEventListener("click", closePlatformWizard);
platformNameMicButton?.addEventListener("click", () => {
  void startPlatformNameMic();
});

function stepWizardBack() {
  if (state.wizard.inlineEditStep) {
    const actionId = String(state.wizard.editingActionId || "");
    const shouldReturn = Boolean(state.wizard.returnToStartDecision);
    const shouldReturnToTaskComposer = state.wizard.returnMode === "task-composer";
    closeWizard();
    if (shouldReturnToTaskComposer) {
      const action = findActionById(actionId);
      openTaskComposer(action || null);
      return;
    }
    if (shouldReturn && actionId) {
      reopenStartDecisionForAction(actionId);
    }
    return;
  }
  state.wizard.step = Math.max(1, state.wizard.step - 1);
  renderWizard();
}

wizardHeaderBackButton?.addEventListener("click", stepWizardBack);
wizardBackButton?.addEventListener("click", closeWizard);

wizardNextButton.addEventListener("click", () => {
  if (!validateStep()) {
    return;
  }

  if (state.wizard.inlineEditStep) {
    void saveAction();
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

repeatTypeTabs?.querySelectorAll("[data-repeat-open]").forEach((button) => {
  button.addEventListener("click", () => {
    const shouldOpen = button.dataset.repeatOpen === "true";
    state.wizard.repeatOpen = shouldOpen;
    if (shouldOpen && normalizeRepeatMode(state.wizard.repeatMode) === "none") {
      state.wizard.repeatMode = "daily";
      state.wizard.repeatDays = [...recurrenceDays.daily];
    }
    if (!shouldOpen) {
      state.wizard.repeatMode = "none";
      state.wizard.repeatDays = [];
    }
    if (state.wizard.returnMode === "task-composer") {
      state.startDecisionContext.dirty = true;
    }
    renderRepeatControls();
  });
});
repeatModeBackButton?.addEventListener("click", () => {
  state.wizard.repeatMode = "none";
  state.wizard.repeatDays = [];
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
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
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
});

avoidSundayInput?.addEventListener("change", () => {
  state.wizard.avoidSunday = Boolean(avoidSundayInput.checked);
  if (state.wizard.returnMode === "task-composer") {
    state.startDecisionContext.dirty = true;
  }
});

document.querySelectorAll("[data-repeat-mode]").forEach((button) => {
  button.addEventListener("click", () => setRepeatMode(button.dataset.repeatMode));
});

closeOverlapWizard?.addEventListener("click", () => closeOverlapWizardWith({ type: "cancel" }));
overlapReplaceButton?.addEventListener("click", () => closeOverlapWizardWith({ type: "replace" }));
overlapCancelButton?.addEventListener("click", () => closeOverlapWizardWith({ type: "cancel" }));
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
  const nativeTimeButton = event.target.closest("[data-open-native-time]");
  if (nativeTimeButton) {
    openNativeTimePicker(nativeTimeButton.dataset.openNativeTime);
    return;
  }
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

actionForm.addEventListener("change", (event) => {
  const input = event.target.closest("[data-native-time-input]");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  applyNativeTimeValue(input.dataset.nativeTimeInput, input.value);
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
  const missionRow = event.target.closest("[data-action-mission-goal-id]");
  if (missionRow) {
    openMissionRunModal(String(missionRow.dataset.actionMissionGoalId || ""));
    return;
  }
  const row = event.target.closest("[data-action-id]");
  if (!row) {
    return;
  }
  if (row.dataset.freeSlot === "1") {
    return;
  }
  const clickedAvatar = event.target.closest(".task-avatar");
  if (clickedAvatar) {
    void openSvgSelectorModal("task", row.dataset.actionId || "");
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

  const missionRow = event.target.closest("[data-action-mission-goal-id]");
  if (missionRow) {
    event.preventDefault();
    openMissionRunModal(String(missionRow.dataset.actionMissionGoalId || ""));
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
    redirectToProject200Login();
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

missionList?.addEventListener("click", (event) => {
  const avatar = event.target.closest(".task-avatar");
  const missionCard = event.target.closest("[data-goal-id]");
  if (avatar && missionCard) {
    void openSvgSelectorModal("mission", missionCard.dataset.goalId || "");
    return;
  }
  if (missionCard && !event.target.closest("[data-mission-goal-edit]")) {
    if (missionCardHoldTriggered) {
      missionCardHoldTriggered = false;
      return;
    }
    openMissionRunModal(missionCard.dataset.goalId || "");
    return;
  }
  const editButton = event.target.closest("[data-mission-goal-edit]");
  if (!editButton) {
    return;
  }
  openMissionAdjustModal(editButton.dataset.missionGoalEdit || "");
});
missionList?.addEventListener("pointerdown", (event) => {
  const missionCard = event.target.closest("[data-goal-id]");
  if (!missionCard || missionCard.dataset.historyRangeActive === "true" || event.target.closest("[data-mission-goal-edit]") || event.target.closest(".task-avatar")) {
    return;
  }
  const goalId = String(missionCard.dataset.goalId || "").trim();
  if (!goalId) {
    return;
  }
  if (missionCardHoldTimer) {
    window.clearTimeout(missionCardHoldTimer);
  }
  missionCardPressedGoalId = goalId;
  missionCardHoldGoalId = "";
  missionCardHoldTriggered = false;
  missionCardHoldTimer = window.setTimeout(() => {
    missionCardHoldTimer = null;
    if (!missionCardPressedGoalId) {
      return;
    }
    missionCardHoldGoalId = missionCardPressedGoalId;
    missionCardHoldTriggered = true;
    openMissionProgressModal(missionCardHoldGoalId);
  }, 500);
});
["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
  missionList?.addEventListener(eventName, () => {
    if (missionCardHoldTimer) {
      window.clearTimeout(missionCardHoldTimer);
      missionCardHoldTimer = null;
    }
    window.setTimeout(() => {
      missionCardPressedGoalId = "";
      missionCardHoldGoalId = "";
    }, missionCardHoldTriggered ? 80 : 0);
  });
});

let sleepStatsHoldTimer = 0;
let sleepStatsHoldTriggered = false;
statsMissionsList?.addEventListener("pointerdown", (event) => {
  const row = event.target.closest('[data-stats-aspect-id="sono"]');
  if (!row) return;
  sleepStatsHoldTriggered = false;
  window.clearTimeout(sleepStatsHoldTimer);
  sleepStatsHoldTimer = window.setTimeout(() => {
    sleepStatsHoldTriggered = true;
    void openSleepHistoryEditor();
  }, 500);
});
["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
  statsMissionsList?.addEventListener(eventName, () => {
    window.clearTimeout(sleepStatsHoldTimer);
    sleepStatsHoldTimer = 0;
  });
});
statsMissionsList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-stats-aspect-id]");
  if (!row) {
    return;
  }
  if (sleepStatsHoldTriggered && String(row.dataset.statsAspectId || "") === "sono") {
    sleepStatsHoldTriggered = false;
    return;
  }
  openStatsAspectModal(String(row.dataset.statsAspectId || ""));
});

openMissionCreateHeroButton?.addEventListener("click", openMissionCreateModal);
openMissionCreateButton?.addEventListener("click", openMissionCreateModal);
missionScopePrevButton?.addEventListener("click", () => {
  void shiftMissionHistoryScope(-1);
});
missionScopeNextButton?.addEventListener("click", () => {
  void shiftMissionHistoryScope(1);
});
missionTitleInput?.addEventListener("input", () => {
  if (missionCreateStatus) {
    missionCreateStatus.textContent = "";
  }
});
missionCreateConfirmButton?.addEventListener("click", () => {
  void (async () => {
    const title = String(missionTitleInput?.value || "").trim();
    const targetValue = Math.max(1, Math.trunc(Number(missionTargetInput?.value || 0) || 0));
    if (!title) {
      if (missionCreateStatus) {
        missionCreateStatus.textContent = "Digite o nome da missão.";
      }
      return;
    }
    if (!targetValue) {
      if (missionCreateStatus) {
        missionCreateStatus.textContent = "Digite a unidade diária.";
      }
      return;
    }
    if (!state.missionCreate?.timeConfigured) {
      if (missionCreateStatus) {
        missionCreateStatus.textContent = "Defina o tempo por unidade antes de criar a missão.";
      }
      openMissionTimeModal("create");
      return;
    }
    await runMissionActionWithLoading(missionCreateConfirmButton, async () => {
      if (missionCreateStatus) {
        missionCreateStatus.textContent = "Criando missão...";
      }
      try {
        await apiRequest("/api/200/extra-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            targetValue,
            profile: String(state.selectedProfile || getDefaultProfileName()).trim(),
            unitDurationSeconds: normalizeMissionDurationOption(state.missionCreate?.unitDurationSeconds),
            svgIconUrl: "",
            svgIconLabel: ""
          })
        });
        closeModal("missionCreateModal");
        await loadMissions();
        renderMissions();
        renderRunningMissionQuickButtons();
      } catch (error) {
        if (missionCreateStatus) {
          missionCreateStatus.textContent = error instanceof Error ? error.message : "Falha ao criar missão.";
        }
      }
    });
  })();
});

missionAdjustMinusButton?.addEventListener("click", () => {
  state.missionAdjust.targetValue = Math.max(1, Math.trunc(Number(state.missionAdjust.targetValue || 1) || 1) - 1);
  renderMissionAdjustState();
});

missionAdjustPlusButton?.addEventListener("click", () => {
  state.missionAdjust.targetValue = Math.max(1, Math.trunc(Number(state.missionAdjust.targetValue || 1) || 1) + 1);
  renderMissionAdjustState();
});

statsAspectTargetMinusButton?.addEventListener("click", () => {
  state.statsAspectModal.targetMinutes = Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || 1) || 1) - 1);
  renderStatsAspectModalState();
});

statsAspectTargetPlusButton?.addEventListener("click", () => {
  state.statsAspectModal.targetMinutes = Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || 1) || 1) + 1);
  renderStatsAspectModalState();
});

statsAspectSaveButton?.addEventListener("click", () => {
  void (async () => {
    const categoryId = String(state.statsAspectModal?.categoryId || "").trim().toLowerCase();
    if (!categoryId) {
      return;
    }
    state.statsAspectConfig[categoryId] = {
      ...getStatsAspectConfigEntry(categoryId),
      targetMinutes: Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || 1) || 1)),
      missionGoalIds: isSleepStatsCategory(categoryId)
        ? []
        : Array.isArray(state.statsAspectModal.missionGoalIds)
        ? [...new Set(state.statsAspectModal.missionGoalIds.map((item) => String(item || "").trim()).filter(Boolean))]
        : []
    };
    try {
      await persistStatsAspectConfig(categoryId);
      if (statsAspectStatus) {
        statsAspectStatus.textContent = "Meta atualizada.";
      }
      await loadStatsSummary();
      renderStatsAspectModalState();
    } catch (error) {
      if (statsAspectStatus) {
        statsAspectStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar a meta.";
      }
    }
  })();
});

openStatsAspectMissionAssignButton?.addEventListener("click", () => {
  void (async () => {
    const categoryId = String(state.statsAspectModal?.categoryId || "").trim().toLowerCase();
    if (isSleepStatsCategory(categoryId)) {
      await openSleepModal();
      return;
    }
    await loadMissions();
    renderStatsAspectMissionOptions();
    if (statsAspectMissionStatus) {
      statsAspectMissionStatus.textContent = "";
    }
    openModal("statsAspectMissionAssignModal");
  })();
});

statsAspectMissionOptions?.addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-stats-mission-option]");
  if (!optionButton) {
    return;
  }
  const goalId = String(optionButton.dataset.statsMissionOption || "").trim();
  if (!goalId) {
    return;
  }
  const selectedIds = new Set((Array.isArray(state.statsAspectModal?.missionGoalIds) ? state.statsAspectModal.missionGoalIds : []).map((item) => String(item || "").trim()).filter(Boolean));
  if (selectedIds.has(goalId)) {
    selectedIds.delete(goalId);
  } else {
    selectedIds.add(goalId);
  }
  state.statsAspectModal.missionGoalIds = [...selectedIds];
  renderStatsAspectMissionOptions();
});

statsAspectMissionSaveButton?.addEventListener("click", () => {
  void (async () => {
    const categoryId = String(state.statsAspectModal?.categoryId || "").trim().toLowerCase();
    if (!categoryId) {
      return;
    }
    state.statsAspectConfig[categoryId] = {
      ...getStatsAspectConfigEntry(categoryId),
      targetMinutes: Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || 1) || 1)),
      missionGoalIds: isSleepStatsCategory(categoryId)
        ? []
        : Array.isArray(state.statsAspectModal.missionGoalIds)
        ? [...new Set(state.statsAspectModal.missionGoalIds.map((item) => String(item || "").trim()).filter(Boolean))]
        : []
    };
    try {
      await persistStatsAspectConfig(categoryId);
      closeModal("statsAspectMissionAssignModal");
      await loadStatsSummary();
      renderStatsAspectModalState();
    } catch (error) {
      if (statsAspectMissionStatus) {
        statsAspectMissionStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar a atribuição.";
      }
    }
  })();
});

statsAspectMissionClearButton?.addEventListener("click", () => {
  void (async () => {
    const categoryId = String(state.statsAspectModal?.categoryId || "").trim().toLowerCase();
    if (!categoryId) {
      return;
    }
    state.statsAspectModal.missionGoalIds = [];
    state.statsAspectConfig[categoryId] = {
      ...getStatsAspectConfigEntry(categoryId),
      targetMinutes: Math.max(1, Math.trunc(Number(state.statsAspectModal.targetMinutes || 1) || 1)),
      missionGoalIds: []
    };
    try {
      await persistStatsAspectConfig(categoryId);
      closeModal("statsAspectMissionAssignModal");
      await loadStatsSummary();
      renderStatsAspectModalState();
    } catch (error) {
      if (statsAspectMissionStatus) {
        statsAspectMissionStatus.textContent = error instanceof Error ? error.message : "Falha ao limpar as missões.";
      }
    }
  })();
});

sleepDelayPrevButton?.addEventListener("click", () => {
  shiftSleepDelay(-1);
});

sleepDelayNextButton?.addEventListener("click", () => {
  shiftSleepDelay(1);
});

sleepStartButton?.addEventListener("click", () => {
  void startSleepSessionFlow();
});

async function toggleSleepFrequencyMode() {
  if (state.sleepModal?.musicLoading) {
    return;
  }
  const nextEnabled = !Boolean(state.sleepModal?.musicEnabled);
  state.sleepModal.musicLoading = true;
  if (!nextEnabled) {
    renderSleepMusicToggleState();
    await stopSleepFrequencyPlayback();
    return;
  }
  state.sleepModal.musicEnabled = true;
  state.sleepModal.musicMode = "frequency";
  state.sleepModal.fadeStarted = false;
  state.sleepModal.lastPhase = "";
  renderSleepMusicToggleState();
  const started = await playSleepFrequencyCurrentTrack();
  state.sleepModal.musicLoading = false;
  if (!started) {
    state.sleepModal.musicEnabled = false;
    state.sleepModal.musicMode = "frequency";
    if (sleepModalFeedback) {
      sleepModalFeedback.textContent = "Nao foi possivel iniciar a radio Frequency agora.";
    }
    renderSleepMusicToggleState();
    return;
  }
  if (sleepModalFeedback) {
    sleepModalFeedback.textContent = "";
  }
  await syncSleepFrequencyPlayback();
  renderSleepMusicToggleState();
}

async function activateSleepDirectTrackMode() {
  if (state.sleepModal?.musicLoading) {
    return;
  }
  state.sleepModal.musicLoading = true;
  sleepFrequencyFadeToken += 1;
  stopSleepFrequencyMonitor();
  if (sleepFrequencyAudio) {
    sleepFrequencyAudio.pause();
    sleepFrequencyAudio.currentTime = 0;
  }
  state.sleepModal.musicEnabled = true;
  state.sleepModal.musicMode = "direct";
  state.sleepModal.fadeStarted = false;
  state.sleepModal.lastPhase = "";
  renderSleepMusicToggleState();
  const started = await playSleepFrequencyCurrentTrack();
  state.sleepModal.musicLoading = false;
  if (!started) {
    state.sleepModal.musicEnabled = false;
    state.sleepModal.musicMode = "frequency";
    if (sleepModalFeedback) {
      sleepModalFeedback.textContent = "Nao foi possivel iniciar essa trilha agora.";
    }
    renderSleepMusicToggleState();
    return;
  }
  if (sleepModalFeedback) {
    sleepModalFeedback.textContent = "";
  }
  renderSleepMusicToggleState();
}

sleepMusicToggleButton?.addEventListener("click", () => {
  if (sleepMusicHoldTriggered) {
    sleepMusicHoldTriggered = false;
    return;
  }
  void toggleSleepFrequencyMode();
});

["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
  sleepMusicToggleButton?.addEventListener(eventName, () => {
    if (sleepMusicHoldTimer) {
      window.clearTimeout(sleepMusicHoldTimer);
      sleepMusicHoldTimer = null;
    }
  });
});

sleepMusicToggleButton?.addEventListener("pointerdown", () => {
  if (sleepMusicHoldTimer) {
    window.clearTimeout(sleepMusicHoldTimer);
  }
  sleepMusicHoldTriggered = false;
  sleepMusicHoldTimer = window.setTimeout(() => {
    sleepMusicHoldTimer = null;
    sleepMusicHoldTriggered = true;
    void activateSleepDirectTrackMode();
  }, SLEEP_DIRECT_TRACK_HOLD_MS);
});

sleepModalCloseButton?.addEventListener("click", () => {
  closeModal("sleepModal");
});

sleepHistoryCloseButton?.addEventListener("click", () => closeModal("sleepHistoryModal"));
sleepHistoryList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-sleep]");
  const row = button?.closest("[data-sleep-date]");
  if (!button || !row) return;
  const hours = Math.max(0, Math.min(12, Math.trunc(Number(row.querySelector("[data-sleep-hours]")?.value || 0) || 0)));
  const minutes = Math.max(0, Math.min(59, Math.trunc(Number(row.querySelector("[data-sleep-minutes]")?.value || 0) || 0)));
  const totalMinutes = Math.min(720, (hours * 60) + minutes);
  button.disabled = true;
  button.textContent = "Salvando...";
  void apiRequest(`/api/200/sleep-history/${encodeURIComponent(row.dataset.sleepDate || "")}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: getSelectedProfileName(), totalMinutes })
  }).then(async () => {
    button.textContent = "Salvo";
    if (sleepHistoryStatus) sleepHistoryStatus.textContent = "Registro atualizado.";
    await loadStatsSummary();
  }).catch((error) => {
    button.disabled = false;
    button.textContent = "Salvar";
    if (sleepHistoryStatus) sleepHistoryStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar.";
  });
});

sleepContinueButton?.addEventListener("click", () => {
  state.sleepModal.controlsVisible = false;
  renderSleepModalState();
});

sleepFinishButton?.addEventListener("click", () => {
  void finishSleepSessionFlow();
});

sleepAbortButton?.addEventListener("click", () => {
  void abortSleepSessionFlow();
});

sleepModalShell?.addEventListener("click", (event) => {
  if (!state.sleepModal?.session) {
    return;
  }
  if (event.target.closest("button")) {
    return;
  }
  state.sleepModal.controlsVisible = !state.sleepModal.controlsVisible;
  renderSleepModalState();
});

missionProgressMinusButton?.addEventListener("click", () => {
  const baseValue = Math.max(0, Math.trunc(Number(state.missionProgress.baseValue || 0) || 0));
  state.missionProgress.deltaValue = Math.max(-baseValue, Math.trunc(Number(state.missionProgress.deltaValue || 0) || 0) - 1);
  renderMissionProgressState();
});

missionProgressPlusButton?.addEventListener("click", () => {
  state.missionProgress.deltaValue = Math.trunc(Number(state.missionProgress.deltaValue || 0) || 0) + 1;
  renderMissionProgressState();
});

document.querySelectorAll("[data-mission-adjust-add]").forEach((button) => {
  button.addEventListener("click", () => {
    state.missionAdjust.targetValue = Math.max(
      1,
      Math.trunc(Number(state.missionAdjust.targetValue || 1) || 1) + Math.max(0, Math.trunc(Number(button.dataset.missionAdjustAdd || 0) || 0))
    );
    renderMissionAdjustState();
  });
});

document.querySelectorAll("[data-mission-progress-add]").forEach((button) => {
  button.addEventListener("click", () => {
    state.missionProgress.deltaValue = Math.trunc(Number(state.missionProgress.deltaValue || 0) || 0)
      + Math.max(0, Math.trunc(Number(button.dataset.missionProgressAdd || 0) || 0));
    renderMissionProgressState();
  });
});

missionAdjustConfirmButton?.addEventListener("click", () => {
  void (async () => {
    const goalId = String(state.missionAdjust?.goalId || "").trim();
    const targetValue = Math.max(1, Math.trunc(Number(state.missionAdjust?.targetValue || 1) || 1));
    const goal = (Array.isArray(state.missions) ? state.missions : []).find((item) => String(item.id || "") === goalId) || null;
    if (!goalId) {
      return;
    }
    const finishLoading = beginMissionActionLoading(missionAdjustConfirmButton);
    if (!finishLoading) return;
    if (missionAdjustStatus) {
      missionAdjustStatus.textContent = "Salvando...";
    }
    try {
      await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: String(state.selectedProfile || getDefaultProfileName()).trim(),
          targetValue,
          unitDurationSeconds: normalizeMissionDurationOption(state.missionAdjust?.unitDurationSeconds),
          svgIconUrl: String(goal?.svgIconUrl || "").trim(),
          svgIconLabel: String(goal?.svgIconLabel || "").trim()
        })
      });
      closeModal("missionAdjustModal");
      await loadMissions();
      renderMissions();
    } catch (error) {
      if (missionAdjustStatus) {
        missionAdjustStatus.textContent = error instanceof Error ? error.message : "Falha ao atualizar missão.";
      }
    } finally {
      finishLoading();
    }
  })();
});

missionProgressConfirmButton?.addEventListener("click", () => {
  void (async () => {
    const goalId = String(state.missionProgress?.goalId || "").trim();
    const deltaValue = Math.trunc(Number(state.missionProgress?.deltaValue || 0) || 0);
    if (!goalId || deltaValue === 0) {
      return;
    }
    const finishLoading = beginMissionActionLoading(missionProgressConfirmButton);
    if (!finishLoading) return;
    if (missionProgressStatus) {
      missionProgressStatus.textContent = deltaValue < 0 ? "Subtraindo..." : "Adicionando...";
    }
    try {
      const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: String(state.selectedProfile || getDefaultProfileName()).trim(),
          delta: deltaValue
        })
      });
      enqueuePointsUpdateFeedback(payload?.pointsUpdate);
      if (deltaValue > 0) {
        playMissionProgressSound();
      }
      closeModal("missionProgressModal");
      await loadMissions();
      renderMissions();
      renderRunningMissionQuickButtons();
    } catch (error) {
      if (missionProgressStatus) {
        missionProgressStatus.textContent = error instanceof Error ? error.message : "Falha ao atualizar progresso.";
      }
    } finally {
      finishLoading();
    }
  })();
});

missionAdjustDeleteButton?.addEventListener("click", () => {
  const goalId = String(state.missionAdjust?.goalId || "").trim();
  if (!goalId) return;
  const goal = (Array.isArray(state.missions) ? state.missions : [])
    .find((item) => String(item?.id || "") === goalId) || { title: "Missão" };
  openRunningConfirmModal("delete_mission", goal, () => {
    void (async () => {
      const finishLoading = beginMissionActionLoading(missionAdjustDeleteButton);
      if (!finishLoading) return;
      if (missionAdjustStatus) {
        missionAdjustStatus.textContent = "Excluindo...";
      }
      try {
        await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}?profile=${encodeURIComponent(String(state.selectedProfile || getDefaultProfileName()).trim())}`, {
          method: "DELETE"
        });
        state.missionQuickSlots = missionQuickDefinitions.map((definition) => {
          const slot = getMissionQuickSlotByKey(definition.key) || { key: definition.key, title: definition.defaultTitle, goalId: "" };
          return String(slot.goalId || "") === goalId
            ? { key: definition.key, title: definition.defaultTitle, goalId: "" }
            : slot;
        });
        persistMissionQuickSlots();
        closeModal("missionAdjustModal");
        await loadMissions();
        renderMissions();
        renderRunningMissionQuickButtons();
      } catch (error) {
        if (missionAdjustStatus) {
          missionAdjustStatus.textContent = error instanceof Error ? error.message : "Falha ao excluir missão.";
        }
      } finally {
        finishLoading();
      }
    })();
  });
});

missionQuickAssignGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mission-quick-slot-assign]");
  if (!button) {
    return;
  }
  assignMissionQuickSlot(String(button.dataset.missionQuickSlotAssign || ""));
});
openMissionCreateTimeButton?.addEventListener("click", () => {
  openMissionTimeModal("create");
});
openMissionVariantsButton?.addEventListener("click", () => {
  void openMissionVariantsModal(state.missionAdjust.goalId, "edit");
});
openMissionAdjustTimeButton?.addEventListener("click", () => {
  openMissionTimeModal("adjust");
});
missionCreateCloseButton?.addEventListener("click", () => {
  if (missionCreateStatus) {
    missionCreateStatus.textContent = "";
  }
  closeModal("missionCreateModal");
});
missionAdjustCloseButton?.addEventListener("click", () => {
  closeModal("missionAdjustModal");
});
missionProgressCloseButton?.addEventListener("click", () => {
  closeModal("missionProgressModal");
});
missionQuickAssignCloseButton?.addEventListener("click", () => {
  closeModal("missionQuickAssignModal");
});
missionTimeCloseButton?.addEventListener("click", () => {
  closeModal("missionTimeModal");
});
missionTimeMinusButton?.addEventListener("click", () => {
  const currentIndex = MISSION_DURATION_OPTIONS_SECONDS.indexOf(normalizeMissionDurationOption(state.missionTime?.value));
  state.missionTime.value = MISSION_DURATION_OPTIONS_SECONDS[Math.max(0, currentIndex - 1)];
  renderMissionTimeState();
});
missionTimePlusButton?.addEventListener("click", () => {
  const currentIndex = MISSION_DURATION_OPTIONS_SECONDS.indexOf(normalizeMissionDurationOption(state.missionTime?.value));
  state.missionTime.value = MISSION_DURATION_OPTIONS_SECONDS[Math.min(MISSION_DURATION_OPTIONS_SECONDS.length - 1, currentIndex + 1)];
  renderMissionTimeState();
});
missionTimeConfirmButton?.addEventListener("click", () => {
  const safeValue = normalizeMissionDurationOption(state.missionTime?.value);
  if (state.missionTime?.mode === "create") {
    state.missionCreate.unitDurationSeconds = safeValue;
    state.missionCreate.timeConfigured = true;
    if (missionCreateTimeSummary) {
      missionCreateTimeSummary.textContent = `1 missão leva ${formatMissionDurationValue(safeValue)}`;
    }
    if (missionCreateStatus) {
      missionCreateStatus.textContent = `Tempo definido: ${formatMissionUnitDurationLabel(safeValue)}.`;
    }
  } else {
    state.missionAdjust.unitDurationSeconds = safeValue;
    renderMissionAdjustState();
    if (missionAdjustStatus) {
      missionAdjustStatus.textContent = `Tempo definido: ${formatMissionUnitDurationLabel(safeValue)}.`;
    }
  }
  closeModal("missionTimeModal");
});
missionRunBackButton?.addEventListener("click", () => {
  if (missionRunConfirm) {
    missionRunConfirm.hidden = false;
  }
});
missionRunModePercentBtn?.addEventListener("click", () => {
  state.missionRun.centerMode = "percent";
  renderMissionRunState();
});
missionRunModeTimeBtn?.addEventListener("click", () => {
  state.missionRun.centerMode = "time";
  renderMissionRunState();
});
missionRunCycleCount?.addEventListener("pointerdown", (event) => {
  missionRunCycleSwipeStartX = Number(event.clientX || 0);
  try { missionRunCycleCount.setPointerCapture(event.pointerId); } catch {}
});
missionRunCycleCount?.addEventListener("pointerup", (event) => {
  const startX = Number(missionRunCycleSwipeStartX);
  missionRunCycleSwipeStartX = null;
  if (!Number.isFinite(startX)) return;
  const deltaX = Number(event.clientX || 0) - startX;
  const current = normalizeMissionRunCycleTarget(state.missionRun.cycleTarget);
  if (Math.abs(deltaX) >= 24) {
    setMissionRunCycleTarget(deltaX < 0 ? current + 1 : current - 1);
    return;
  }
  setMissionRunCycleTarget(current >= MISSION_RUN_MAX_CYCLES ? 1 : current + 1);
});
missionRunCycleCount?.addEventListener("pointercancel", () => {
  missionRunCycleSwipeStartX = null;
});
missionRunCancelDiscardButton?.addEventListener("click", () => {
  void runMissionActionWithLoading(missionRunCancelDiscardButton, async () => {
    await waitForMissionActionTransition();
    closeModal("missionRunModal");
  }, { scope: missionRunConfirm });
});
missionRunCancelFinishButton?.addEventListener("click", () => {
  void finalizeMissionRun(missionRunCancelFinishButton);
});
missionRunCompleteButton?.addEventListener("click", () => {
  completeMissionRunCycle();
});
missionRunFinishButton?.addEventListener("click", () => {
  void finalizeMissionRun(missionRunFinishButton);
});
missionRunFinishCloseButton?.addEventListener("click", () => {
  if (missionRunFinishChoice) {
    missionRunFinishChoice.hidden = true;
  }
});
missionRunRestartButton?.addEventListener("click", () => {
  void runMissionActionWithLoading(missionRunRestartButton, async () => {
    await waitForMissionActionTransition();
    restartMissionRunLocally();
  }, { scope: missionRunFinishChoice });
});

missionVariantsCloseButton?.addEventListener("click", () => {
  state.missionVariants.sortMenuOpen = false;
  closeModal("missionVariantsModal");
});
missionVariantSortButton?.addEventListener("click", () => {
  state.missionVariants.sortMenuOpen = !state.missionVariants.sortMenuOpen;
  renderMissionVariants();
});
missionVariantSortMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mission-variant-sort]");
  if (!button) return;
  state.missionVariants.sortMode = saveMissionVariantSortMode(button.dataset.missionVariantSort);
  state.missionVariants.sortMenuOpen = false;
  renderMissionVariants();
});
missionVariantAddButton?.addEventListener("click", () => {
  state.missionVariants.editorOpen = true;
  state.missionVariants.sortMenuOpen = false;
  state.missionVariants.editingId = "";
  state.missionVariants.intervalValue = 1;
  state.missionVariants.intervalUnit = "days";
  if (missionVariantTitleInput) missionVariantTitleInput.value = "";
  if (missionVariantStatus) missionVariantStatus.textContent = "";
  renderMissionVariants();
  window.setTimeout(() => missionVariantTitleInput?.focus(), 40);
});
missionVariantEditorCancel?.addEventListener("click", () => {
  state.missionVariants.editorOpen = false;
  renderMissionVariants();
});
missionVariantDeadlinePrev?.addEventListener("click", () => {
  state.missionVariants.intervalValue = Math.max(1, Number(state.missionVariants.intervalValue || 1) - 1);
  renderMissionVariants();
});
missionVariantDeadlineNext?.addEventListener("click", () => {
  state.missionVariants.intervalValue = Math.min(999, Number(state.missionVariants.intervalValue || 1) + 1);
  renderMissionVariants();
});
missionVariantHoursButton?.addEventListener("click", () => { state.missionVariants.intervalUnit = "hours"; renderMissionVariants(); });
missionVariantDaysButton?.addEventListener("click", () => { state.missionVariants.intervalUnit = "days"; renderMissionVariants(); });
missionVariantEditorSave?.addEventListener("click", async () => {
  const title = String(missionVariantTitleInput?.value || "").trim();
  if (!title) { if (missionVariantStatus) missionVariantStatus.textContent = "Digite o nome da micro-tarefa."; return; }
  const goalId = state.missionVariants.goalId;
  const editingId = state.missionVariants.editingId;
  const finishLoading = beginMissionActionLoading(missionVariantEditorSave);
  if (!finishLoading) return;
  try {
    const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(goalId)}/variants${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: String(state.selectedProfile || getDefaultProfileName()).trim(), title, intervalValue: state.missionVariants.intervalValue, intervalUnit: state.missionVariants.intervalUnit })
    });
    state.missionVariants.items = Array.isArray(payload?.variants) ? payload.variants : [];
    missionVariantsCache.set(String(goalId || ""), { loadedAt: Date.now(), items: state.missionVariants.items });
    syncMissionVariantsIntoMissionState(goalId, state.missionVariants.items);
    state.missionVariants.editorOpen = false;
    renderMissionVariants();
    renderMissions();
  } catch (error) {
    if (missionVariantStatus) missionVariantStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar.";
  } finally {
    finishLoading();
  }
});
missionVariantsList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-mission-variant-delete]");
  const card = event.target.closest("[data-mission-variant-id]");
  if (!card) return;
  const id = String(card.dataset.missionVariantId || "");
  const variant = (state.missionVariants.items || []).find((item) => String(item.id) === id);
  if (!variant) return;
  if (deleteButton) {
    openRunningConfirmModal("delete", variant, () => {
      void (async () => {
        try {
          const profile = encodeURIComponent(String(state.selectedProfile || getDefaultProfileName()).trim());
          const payload = await apiRequest(`/api/200/extra-goals/${encodeURIComponent(state.missionVariants.goalId)}/variants/${encodeURIComponent(id)}?profile=${profile}`, { method: "DELETE" });
          state.missionVariants.items = Array.isArray(payload?.variants) ? payload.variants : [];
          missionVariantsCache.set(String(state.missionVariants.goalId || ""), { loadedAt: Date.now(), items: state.missionVariants.items });
          syncMissionVariantsIntoMissionState(state.missionVariants.goalId, state.missionVariants.items);
          renderMissionVariants();
          renderMissions();
        } catch (error) {
          showFloatingNotice(error instanceof Error ? error.message : "Falha ao excluir microtarefa.");
        }
      })();
    });
    return;
  }
  if (state.missionVariants.mode === "choose") {
    const goal = getMissionRunGoalById(state.missionVariants.goalId);
    const variants = [...(state.missionVariants.items || [])];
    closeModal("missionVariantsModal");
    state.missionRun.availableVariants = variants;
    beginMissionRun(goal, variant);
    return;
  }
  if (state.missionVariants.mode === "cycle-choose") {
    state.missionVariants.cycleSelections = [...(state.missionVariants.cycleSelections || []), id];
    const target = normalizeMissionRunCycleTarget(state.missionVariants.cycleSelectionTarget);
    if (state.missionVariants.cycleSelections.length >= target) {
      const resumeMode = state.missionVariants.cycleSelectionResumeMode === "advance" ? "advance" : "preserve";
      const completedBeforeSelection = Math.max(0, Math.min(MISSION_RUN_MAX_CYCLES - 1, Math.trunc(Number(state.missionRun.completedCycles || 0) || 0)));
      state.missionRun.selectedVariantIds = state.missionVariants.cycleSelections.slice(0, target);
      state.missionRun.selectedVariantId = getMissionRunVariantIdForCycle(state.missionRun.cycleIndex);
      closeModal("missionVariantsModal");
      if (resumeMode === "advance" && completedBeforeSelection > 0) {
        state.missionRun.cycleIndex = completedBeforeSelection;
        state.missionRun.completedCycles = completedBeforeSelection;
        advanceMissionRunCycle();
      } else if (resumeMode === "advance") {
        state.missionRun.completedCycles = 0;
        resetMissionRunCycleTimer(1);
      } else {
        renderMissionRunCycleCount();
        renderMissionRunState();
      }
      return;
    }
    renderMissionVariants();
    return;
  }
  state.missionVariants.editorOpen = true;
  state.missionVariants.sortMenuOpen = false;
  state.missionVariants.editingId = id;
  state.missionVariants.intervalValue = variant.intervalValue;
  state.missionVariants.intervalUnit = variant.intervalUnit;
  if (missionVariantTitleInput) missionVariantTitleInput.value = variant.title;
  renderMissionVariants();
});

runningMissionQuickGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mission-quick-goal-id]");
  if (!button) {
    return;
  }
  handleRunningMissionQuickTap(String(button.dataset.missionQuickGoalId || ""));
});

closeRunningMissionQuickModalButton?.addEventListener("click", () => {
  closeModal("runningMissionQuickModal");
});

svgSelectorGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-svg-url]");
  if (!button) {
    return;
  }
  state.svgSelector.selectedUrl = String(button.dataset.svgUrl || "").trim();
  state.svgSelector.selectedLabel = String(button.dataset.svgLabel || "").trim();
  renderSvgSelectorModal();
});

svgSelectorSaveButton?.addEventListener("click", () => {
  void saveSvgSelectorChoice();
});

openHistoryTextComposerButton?.addEventListener("click", openHistoryTextComposer);
closeHistoryTextComposerButton?.addEventListener("click", closeHistoryTextComposer);

historyTextAvatarGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-speaker]");
  if (!button) {
    return;
  }
  state.historyTextComposer.speaker = button.dataset.historySpeaker || getDefaultProfileName();
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

async function performRunningFinalize(runningAction) {
  const beforeSummary = getCompletionSummaryForSelectedProfile();
  const duration = getActionDurationMinutes(runningAction);
  const startedAtMs = new Date(runningAction?.startedAt || runningAction?.startAt).getTime();
  const accumulatedMinutes = Math.max(0, Number(runningAction?.accumulatedSeconds || 0) / 60);
  const elapsed = accumulatedMinutes
    + (Number.isFinite(startedAtMs) ? Math.max(0, (getServerNowMs() - startedAtMs) / (60 * 1000)) : duration);
  const bonusBefore = Math.max(0, Number(runningCarryOverMinutes || 0));
  const remainingAfterBonus = Math.max(0, elapsed - bonusBefore);
  const savedMinutes = Math.max(0, Math.floor(duration - remainingAfterBonus));
  clearRunningCompletionTimers();
  state.runningCompletion.active = true;
  state.runningCompletion.phase = "celebration";
  state.runningCompletion.metric = "progress";
  state.runningCompletion.fromPercent = beforeSummary.percentPrecise;
  state.runningCompletion.toPercent = beforeSummary.percentPrecise;
  state.runningCompletion.displayPercent = beforeSummary.percentPrecise;
  state.runningCompletion.label = "Progresso";
  renderRunningCompletionCelebration();
  await toggleActionStatus(runningAction.id, { skipEndConfirm: true });
  const after = state.actions.find((item) => item.id === runningAction.id);
  if (normalizeActionStatus(after?.status) === actionStatuses.completed) {
    if (state.options.stopMusicOnFinish && runningAudio) {
      stopRunningMusicAfterFinishedActivity();
    }
    const nextAction = getNextTimelineEntryForRunning(runningAction);
    const nextOfNext = nextAction ? getNextTimelineEntryForRunning(nextAction) : null;
    const summary = getCompletionSummaryForSelectedProfile();
    runningCarryOverMinutes = savedMinutes;
    startRunningCompletionTransition({
      fromPercent: beforeSummary.percentPrecise,
      toPercent: summary.percentPrecise,
      nextAction,
      nextOfNext,
      savedMinutes: runningCarryOverMinutes,
      summary: {
        ...summary,
        punctualityBefore: beforeSummary.punctualityPrecise,
        punctualityAfter: summary.punctualityPrecise
      }
    });
    state.quickTaskAutoFinalizing = false;
    return;
  }
  resetRunningCompletionState();
  state.quickTaskAutoFinalizing = false;
  renderHomeRunningTask();
}

runningTaskFinalizeButton?.addEventListener("click", () => {
  const runningAction = getRunningActionForSelectedProfile();
  if (!runningAction) {
    return;
  }
  openRunningConfirmModal("finalize", runningAction, () => {
    void performRunningFinalize(runningAction);
  });
});

runningTaskStartNextButton?.addEventListener("click", () => {
  const actionId = String(runningTaskStartNextButton.dataset.actionId || "").trim();
  if (!actionId) return;
  resetRunningCompletionState();
  void toggleActionStatus(actionId, { skipDecision: true });
});

async function performRunningRestore(runningAction) {
  try {
    await restoreActionToPending(String(runningAction.id || ""));
    delete state.runningLocalStarts[String(runningAction.id || "")];
    startRunningTaskTicker();
    closeRunningTaskModalWithFade();
    window.setTimeout(() => openModal("actionsModal"), 500);
  } catch {}
}

async function performRunningPause(runningAction) {
  try {
    const result = await pauseActionWithSelectedProgress(runningAction);
    if (!result) return;
    startRunningTaskTicker();
    closeRunningTaskModalWithFade();
    window.setTimeout(() => {
      openModal("actionsModal");
      renderActions();
    }, 500);
  } catch (error) {
    showFloatingNotice(error instanceof Error ? error.message : "Falha ao pausar tarefa.");
  }
}

runningTaskRestoreButton?.addEventListener("click", () => {
  const runningAction = getRunningActionForSelectedProfile();
  if (!runningAction) return;
  openRunningConfirmModal("abort", runningAction, () => {
    void performRunningRestore(runningAction);
  }, {
    onPause: () => void performRunningPause(runningAction)
  });
});

runningTaskListButton?.addEventListener("click", () => {
  closeRunningTaskModalWithFade();
  window.setTimeout(() => openModal("actionsModal"), 500);
});
runningTaskHomeButton?.addEventListener("click", () => {
  navigateToProjectHome();
});
runningTaskQuickButton?.addEventListener("click", () => {
  openQuickTaskModal();
});
runningTaskMissionButton?.addEventListener("click", () => {
  void openRunningMissionQuickModal();
});
runningTaskMusicButton?.addEventListener("click", toggleRunningPlayPause);
homeRunningListButton?.addEventListener("click", () => {
  openModal("actionsModal");
});
homeRunningRestoreButton?.addEventListener("click", () => {
  const runningAction = getRunningActionForSelectedProfile();
  if (!runningAction) return;
  openRunningConfirmModal("abort", runningAction, () => {
    void performRunningRestore(runningAction);
  }, {
    onPause: () => void performRunningPause(runningAction)
  });
});
homeRunningFinalizeButton?.addEventListener("click", () => {
  const runningAction = getRunningActionForSelectedProfile();
  if (!runningAction) return;
  openRunningConfirmModal("finalize", runningAction, () => {
    void performRunningFinalize(runningAction);
  });
});
homeRunningMusicButton?.addEventListener("click", toggleRunningPlayPause);
homeRunningMissionButton?.addEventListener("click", () => {
  void openRunningMissionQuickModal();
});
runningPlayerList?.addEventListener("click", () => {
  state.startDecisionContext.actionId = "";
  state.runningPlayer.configurationMode = false;
  state.runningPlayer.configurationTaskTitle = "";
  openRunningMusicListModal();
});
runningPlayerPrev?.addEventListener("click", () => {
  void moveRunningTrack(-1);
});
runningPlayerNext?.addEventListener("click", () => {
  void moveRunningTrack(1);
});
runningMusicListBack?.addEventListener("click", () => {
  closeRunningMusicListModal();
  const wasConfiguration = state.runningPlayer.configurationMode;
  state.runningPlayer.configurationMode = false;
  state.runningPlayer.configurationTaskTitle = "";
  if (!wasConfiguration && state.startDecisionContext.actionId && !startDecisionModal?.classList.contains("active") && !runningTaskModalElement?.classList.contains("active")) {
    reopenStartDecisionForAction(state.startDecisionContext.actionId);
  }
});
runningMusicListStationPrev?.addEventListener("click", () => {
  void moveRunningStation(-1);
});
runningMusicListStationNext?.addEventListener("click", () => {
  void moveRunningStation(1);
});
runningPlayerRepeat?.addEventListener("click", toggleRunningPlayPause);
runningPlayerFavorite?.addEventListener("click", () => {
  void toggleRunningTrackFavorite();
});
runningPlayerDefault?.addEventListener("click", () => {
  if (getRunningDefaultPreferenceForCurrentTask()) {
    openRunningMusicDefaultChoiceModal();
    return;
  }
  openRunningMusicDefaultModal();
});
runningMusicDefaultStationButton?.addEventListener("click", () => {
  void saveRunningTaskDefault("station");
});
runningMusicDefaultTrackButton?.addEventListener("click", () => {
  void saveRunningTaskDefault("track");
});
runningMusicDefaultRedefineButton?.addEventListener("click", openRunningMusicDefaultModal);
runningMusicDefaultExecuteButton?.addEventListener("click", () => {
  void executeRunningTaskDefaultPreference();
});
runningMusicListDefaultButton?.addEventListener("click", () => {
  void saveRunningTaskDefault("track");
});
actionsMissionFilterButton?.addEventListener("click", () => {
  if (normalizeMissionActionsMode(state.options.missionActionsMode) === "hide") return;
  state.actionsMissionOnly = !state.actionsMissionOnly;
  renderActions();
  window.requestAnimationFrame(() => actionsList?.scrollTo({ top: 0, behavior: "smooth" }));
});
toggleFreeTimeOptionButton?.addEventListener("click", () => {
  state.options.showFreeTime = !state.options.showFreeTime;
  saveOptionsConfig();
  renderOptionsModal();
  renderActions();
  renderHomeRunningTask();
});
toggleTaskBeepOptionButton?.addEventListener("click", () => {
  const currentIndex = Math.max(0, taskBeepOptionCycles.indexOf(Number(state.options.completionBeepCycles || 0)));
  const nextIndex = (currentIndex + 1) % taskBeepOptionCycles.length;
  state.options.completionBeepCycles = taskBeepOptionCycles[nextIndex];
  saveOptionsConfig();
  renderOptionsModal();
});
toggleMinuteNotificationsOptionButton?.addEventListener("click", () => {
  const currentInterval = normalizeMinuteCueInterval(state.options.minuteNotificationInterval);
  const currentIndex = Math.max(0, MINUTE_CUE_INTERVALS.indexOf(currentInterval));
  state.options.minuteNotificationInterval = MINUTE_CUE_INTERVALS[(currentIndex + 1) % MINUTE_CUE_INTERVALS.length];
  saveOptionsConfig();
  renderOptionsModal();
  renderHomeRunningTask();
});
toggleFinalMinuteNotificationsOptionButton?.addEventListener("click", () => {
  state.options.finalMinuteNotificationsEnabled = !state.options.finalMinuteNotificationsEnabled;
  saveOptionsConfig();
  renderOptionsModal();
  renderHomeRunningTask();
});
toggleBackgroundThemeOptionButton?.addEventListener("click", () => {
  const currentIndex = Math.max(0, backgroundThemeModes.findIndex((item) => item.key === getBackgroundThemeMode(state.options.backgroundTheme).key));
  const nextIndex = (currentIndex + 1) % backgroundThemeModes.length;
  state.options.backgroundTheme = backgroundThemeModes[nextIndex].key;
  applyBackgroundTheme();
  saveOptionsConfig();
  renderOptionsModal();
});
toggleStopMusicOnFinishOptionButton?.addEventListener("click", () => {
  state.options.stopMusicOnFinish = !state.options.stopMusicOnFinish;
  saveOptionsConfig();
  renderOptionsModal();
});
toggleScreenLockOptionButton?.addEventListener("click", () => {
  state.options.screenLockEnabled = !state.options.screenLockEnabled;
  if (!state.options.screenLockEnabled) {
    unlockProject200Screen();
    clearScreenLockInactivityTimer();
  } else {
    scheduleScreenLockInactivity();
  }
  saveOptionsConfig();
  renderOptionsModal();
});
screenLockOverlay?.addEventListener("pointerdown", (event) => {
  if (!state.screenLock.locked) {
    return;
  }
  state.screenLock.gestureActive = true;
  state.screenLock.touchStartY = getInteractionClientY(event);
  state.screenLock.touchCurrentY = state.screenLock.touchStartY;
  showScreenLockPrompt();
  event.preventDefault();
});
screenLockOverlay?.addEventListener("pointermove", (event) => {
  if (!state.screenLock.locked || !state.screenLock.gestureActive) {
    return;
  }
  state.screenLock.touchCurrentY = getInteractionClientY(event);
  const deltaY = state.screenLock.touchCurrentY - state.screenLock.touchStartY;
  if (deltaY <= -80) {
    unlockProject200Screen();
  }
  event.preventDefault();
});
["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
  screenLockOverlay?.addEventListener(eventName, (event) => {
    if (state.screenLock.locked) {
      showScreenLockPrompt();
    }
    state.screenLock.gestureActive = false;
    state.screenLock.touchStartY = 0;
    state.screenLock.touchCurrentY = 0;
    event.preventDefault();
  });
});
document.addEventListener("pointerdown", (event) => {
  if (state.screenLock.locked) {
    return;
  }
  if (screenLockOverlay?.contains(event.target)) {
    return;
  }
  registerScreenLockActivity();
}, true);
document.addEventListener("pointerup", (event) => {
  if (event.pointerType === "mouse" && Number(event.button) !== 0) {
    return;
  }
  playRandomTouchClickSound();
}, true);
document.addEventListener("keydown", () => {
  registerScreenLockActivity();
}, true);
quickTaskStartButton?.addEventListener("click", () => {
  void (async () => {
    const runningAction = getRunningActionForSelectedProfile();
    if (!runningAction) {
      await submitQuickTaskStart();
      return;
    }
    const choice = await openStartConflictModalForActions(runningAction, {
      title: String(quickTaskTitleInput?.value || "Tarefa Rápida").trim() || "Tarefa Rápida"
    });
    if (!choice || choice === "cancel") {
      return;
    }
    if (choice === "partial_and_start") {
      const pausedResult = await pauseActionWithSelectedProgress(runningAction);
      if (!pausedResult) return;
      await submitQuickTaskStart();
      return;
    }
    await submitQuickTaskStart("finalize");
  })();
});
profileRenameConfirmButton?.addEventListener("click", () => {
  void saveProfileRename();
});
logoutProject200Button?.addEventListener("click", () => {
  const shouldLogout = window.confirm("Deseja sair do login salvo neste aparelho?");
  if (!shouldLogout) {
    return;
  }
  clearProject200SessionState();
  closeModal("optionsModal");
  redirectToProject200Login();
});
toggleMissionActionsOptionButton?.addEventListener("click", () => {
  const currentMode = normalizeMissionActionsMode(state.options.missionActionsMode);
  const currentIndex = Math.max(0, missionActionsModes.indexOf(currentMode));
  state.options.missionActionsMode = missionActionsModes[(currentIndex + 1) % missionActionsModes.length];
  if (state.options.missionActionsMode === "hide") {
    state.actionsMissionOnly = false;
  }
  saveOptionsConfig();
  renderOptionsModal();
  renderActions();
});
homeRunningSurfaceButton?.addEventListener("click", () => {
  openPrimaryRunningSurface();
});
homeSocialButton?.addEventListener("click", () => {
  void openSocialModal();
});
runningHomeSocialButton?.addEventListener("click", () => {
  void openSocialModal();
});
homeSleepButton?.addEventListener("click", () => {
  if (sleepModalFeedback) {
    sleepModalFeedback.textContent = "";
  }
  void openSleepModal();
});
runningHomeSleepButton?.addEventListener("click", () => {
  if (sleepModalFeedback) {
    sleepModalFeedback.textContent = "";
  }
  void openSleepModal();
});
socialInviteToggleButton?.addEventListener("click", () => {
  state.social.inviteComposerOpen = !state.social.inviteComposerOpen;
  if (socialModalStatus) {
    socialModalStatus.textContent = "";
  }
  renderSocialModal();
  if (state.social.inviteComposerOpen) {
    window.setTimeout(() => socialInviteInput?.focus(), 40);
  }
});
socialInviteSubmitButton?.addEventListener("click", () => {
  void submitSocialInvite();
});
socialInviteInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  void submitSocialInvite();
});
socialModalList?.addEventListener("click", (event) => {
  const acceptButton = event.target.closest("[data-social-accept]");
  if (acceptButton) {
    void respondToSocialInvite(String(acceptButton.dataset.socialAccept || ""), "accept");
    return;
  }
  const rejectButton = event.target.closest("[data-social-reject]");
  if (rejectButton) {
    void respondToSocialInvite(String(rejectButton.dataset.socialReject || ""), "reject");
  }
});
document.querySelectorAll("[data-social-scope]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextScope = String(button.dataset.socialScope || "").trim().toLowerCase();
    if (!nextScope || nextScope === state.social.scopeKey) {
      return;
    }
    state.social.scopeKey = nextScope;
    renderSocialScopeFooter();
    void loadSocialSnapshot({ force: true, skipGlobalLoading: false, silent: true });
  });
});
statsRunningSurfaceButton?.addEventListener("click", () => {
  openPrimaryRunningSurface();
});
openProject200ExportModalButton?.addEventListener("click", () => {
  if (!getToken()) {
    redirectToProject200Login();
    return;
  }
  openModal("project200ExportModal");
});
project200ExportConfirmButton?.addEventListener("click", () => {
  void submitProject200Export();
});
project200ExportUsernameInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  void submitProject200Export();
});
startDecisionTaskTitle?.addEventListener("click", () => {
  if (isTaskComposerMode()) {
    openTaskComposerFieldEditor("title");
    return;
  }
  const action = findActionById(state.startDecisionContext.actionId);
  if (!action) {
    return;
  }
  closeStartDecisionModalWith("cancel");
  openTaskComposer(action, { fieldToFocus: "title" });
});
startDecisionStartAt?.addEventListener("click", () => {
  if (isTaskComposerMode()) {
    openTaskComposerFieldEditor("start");
    return;
  }
  const action = findActionById(state.startDecisionContext.actionId);
  if (!action) {
    return;
  }
  closeStartDecisionModalWith("cancel");
  openTaskComposer(action, { fieldToFocus: "start" });
});
startDecisionEndAt?.addEventListener("click", () => {
  if (isTaskComposerMode()) {
    openTaskComposerFieldEditor("end");
    return;
  }
  const action = findActionById(state.startDecisionContext.actionId);
  if (!action) {
    return;
  }
  closeStartDecisionModalWith("cancel");
  openTaskComposer(action, { fieldToFocus: "end" });
});
startDecisionRepeatLabel?.addEventListener("click", () => {
  if (isTaskComposerMode()) {
    openTaskComposerFieldEditor("repeat");
    return;
  }
  const action = findActionById(state.startDecisionContext.actionId);
  if (!action) {
    return;
  }
  closeStartDecisionModalWith("cancel");
  openTaskComposer(action, { fieldToFocus: "repeat" });
});
startDecisionMusicLabel?.addEventListener("click", () => {
  const action = findActionById(state.startDecisionContext.actionId);
  const targetTitle = String(action?.title || taskTitle?.value || "").trim();
  if (!targetTitle) {
    window.alert("Defina primeiro o nome da tarefa.");
    return;
  }
  state.runningPlayer.configurationMode = true;
  state.runningPlayer.configurationTaskTitle = targetTitle;
  openRunningMusicListModal();
});
startDecisionMicButton?.addEventListener("click", () => {
  if (actionMediaRecorder && actionMediaRecorder.state !== "inactive") {
    stopActionMic();
    return;
  }
  void startActionMic();
});
startDecisionStartInput?.addEventListener("change", () => {
  const value = String(startDecisionStartInput.value || "").trim();
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return;
  state.wizard.startHour = Number(match[1]);
  state.wizard.startMinute = Number(match[2]);
  markTaskComposerDirty();
  renderTaskComposerModal();
});
startDecisionEndInput?.addEventListener("change", () => {
  const value = String(startDecisionEndInput.value || "").trim();
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return;
  state.wizard.endHour = Number(match[1]);
  state.wizard.endMinute = Number(match[2]);
  markTaskComposerDirty();
  renderTaskComposerModal();
});
startDecisionDateInput?.addEventListener("change", () => {
  const value = String(startDecisionDateInput.value || "").trim();
  if (!value) return;
  const picked = new Date(`${value}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return;
  const today = todayStart();
  picked.setHours(0, 0, 0, 0);
  state.wizard.dateOffset = Math.round((picked.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  markTaskComposerDirty();
  renderTaskComposerModal();
});
startConflictFinalizeButton?.addEventListener("click", () => closeStartConflictModal("finalize_and_start"));
startConflictAbortButton?.addEventListener("click", () => closeStartConflictModal("partial_and_start"));
startConflictBackButton?.addEventListener("click", () => closeStartConflictModal("cancel"));
bindPartialTaskPercentButton(partialTaskDecreaseButton, -1);
bindPartialTaskPercentButton(partialTaskIncreaseButton, 1);
partialTaskContinueButton?.addEventListener("click", () => {
  stopPartialTaskPercentHold();
  closeModal("partialTaskModal");
  const resolve = partialTaskResolver;
  partialTaskResolver = null;
  if (resolve) resolve(partialTaskPercentValue);
});
startDecisionAspectLabel?.addEventListener("click", () => {
  const action = findActionById(state.startDecisionContext.actionId);
  actionCategoryTargetActionId = isTaskComposerMode() ? "" : String(action?.id || "");
  actionCategorySelectionId = normalizeTaskCategoryId(isTaskComposerMode() ? state.wizard.categoryId : action?.categoryId);
  state.wizard.categoryId = actionCategorySelectionId;
  state.wizard.categoryName = getTaskCategoryName(actionCategorySelectionId);
  renderActionCategoryModal();
  if (actionCategoryModal?.parentElement !== document.body) document.body.appendChild(actionCategoryModal);
  openModal("actionCategoryModal");
});
runningConfirmPrimaryButton?.addEventListener("click", () => {
  const action = state.runningConfirm.action;
  const callback = action;
  closeRunningConfirmModal();
  if (typeof callback === "function") {
    callback();
  }
});
runningConfirmBackButton?.addEventListener("click", closeRunningConfirmModal);
runningModePercentBtn?.addEventListener("click", () => {
  state.runningCenterMode = state.runningCenterMode === "percent" ? "auto" : "percent";
  renderHomeRunningTask();
});
runningModeTimeBtn?.addEventListener("click", () => {
  state.runningCenterMode = state.runningCenterMode === "time" ? "auto" : "time";
  renderHomeRunningTask();
});
runningTaskPercent?.addEventListener("click", () => {
  if (getRunningActionForSelectedProfile()) {
    return;
  }
  state.runningIdleCenterMode = state.runningIdleCenterMode === "percent" ? "time" : "percent";
  renderHomeRunningTask();
});

runningConfirmPauseButton?.addEventListener("click", () => {
  const callback = state.runningConfirm.pauseAction;
  closeRunningConfirmModal();
  if (typeof callback === "function") callback();
});

if (runningAudio) {
  runningAudio.addEventListener("ended", () => {
    if (state.runningPlayer.repeatEnabled) {
      return;
    }
    void moveRunningTrack(1);
  });
}
handleSwipe(runningPlayerTrack, (amount) => void moveRunningStation(amount > 0 ? -1 : 1));
handleSwipe(runningTaskModalElement, (amount) => void moveRunningStation(amount > 0 ? -1 : 1));

updateConversationMicButtonVisual();
document.body.classList.add("project-no-select");
const isEditableTarget = (target) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
document.addEventListener("copy", (event) => {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
});
document.addEventListener("cut", (event) => {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
});
document.addEventListener("selectstart", (event) => {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
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
      renderMissions();
      closeHistoryTextComposer();
    } catch (error) {
      historyVoiceStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar texto.";
    }
  })();
});
state.profileLock = "";
beginStartupLoading(loadingIconByArea.actions);
applySelectedProfile(readSelectedProfile());
void bootstrapProject200App();

profileFooter?.addEventListener("contextmenu", (event) => {
  const button = event.target.closest("[data-profile]");
  if (button) {
    event.preventDefault();
  }
});
homeProfileButton?.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});
homeProfileButton?.addEventListener("click", () => {
  const profile = String(state.selectedProfile || getDefaultProfileName()).trim();
  if (!profile) {
    openPrimaryRunningSurface();
    return;
  }
  if (profileLongPressHandledProfile === profile) {
    profileLongPressHandledProfile = "";
    return;
  }
  openPrimaryRunningSurface();
});
homeProfileName?.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});
homeProfileName?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  profilePressStartedAt = Date.now();
  profilePressProfile = String(state.selectedProfile || getDefaultProfileName()).trim();
  if (profileHoldTimer) {
    window.clearTimeout(profileHoldTimer);
    profileHoldTimer = null;
  }
  if (profilePressProfile) {
    profileHoldTimer = window.setTimeout(() => {
      profileHoldTimer = null;
      if (!profilePressProfile) {
        return;
      }
      profileLongPressHandledProfile = profilePressProfile;
      openProfileRenameModal();
    }, 500);
  }
});
["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
  homeProfileName?.addEventListener(evt, () => {
    if (profileHoldTimer) {
      window.clearTimeout(profileHoldTimer);
      profileHoldTimer = null;
    }
    profilePressStartedAt = 0;
    profilePressProfile = "";
  });
});
homeProfileButton?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  profilePressStartedAt = Date.now();
  profilePressProfile = String(state.selectedProfile || getDefaultProfileName()).trim();
  if (profileHoldTimer) {
    window.clearTimeout(profileHoldTimer);
    profileHoldTimer = null;
  }
  if (profilePressProfile) {
    profileHoldTimer = window.setTimeout(() => {
      profileHoldTimer = null;
      if (!profilePressProfile) {
        return;
      }
      profileLongPressHandledProfile = profilePressProfile;
      if (!getToken()) {
        redirectToProject200Login();
        return;
      }
      openTaskComposer();
    }, 500);
  }
});
["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
  homeProfileButton?.addEventListener(evt, () => {
    if (profileHoldTimer) {
      window.clearTimeout(profileHoldTimer);
      profileHoldTimer = null;
    }
    profilePressStartedAt = 0;
    profilePressProfile = "";
  });
});
homeRunningModePercentBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  state.runningCenterMode = state.runningCenterMode === "percent" ? "auto" : "percent";
  renderHomeRunningTask();
});
homeRunningModeTimeBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  state.runningCenterMode = state.runningCenterMode === "time" ? "auto" : "time";
  renderHomeRunningTask();
});
profileAvatarChooseButton?.addEventListener("click", () => {
  profileAvatarFileInput?.click();
});
profileAvatarPreview?.addEventListener("click", () => {
  void submitProfileSvgSuggestion();
});
profileAvatarFileInput?.addEventListener("change", () => {
  const file = profileAvatarFileInput.files?.[0] || null;
  profileAvatarReferenceFile = file;
  if (!file) {
    profileAvatarReferenceDataUrl = "";
    renderProfileAvatarModal();
    return;
  }
  void (async () => {
    try {
      profileAvatarReferenceDataUrl = await readFileAsDataUrl(file);
      if (profileAvatarMessage) {
        profileAvatarMessage.textContent = "";
      }
    } catch (error) {
      profileAvatarReferenceDataUrl = "";
      if (profileAvatarMessage) {
        profileAvatarMessage.textContent = error instanceof Error ? error.message : "Falha ao ler a foto.";
      }
    }
    renderProfileAvatarModal();
  })();
});
profileAvatarGenerateButton?.addEventListener("click", () => {
  void submitProfileAvatarGeneration();
});
profileAvatarUploadButton?.addEventListener("click", () => {
  void submitProfileAvatarUpload();
});
profileFooter?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile]");
  if (!button) {
    return;
  }
  const profile = String(button.dataset.profile || "").trim();
  if (!profile) {
    return;
  }
  if (profileLongPressHandledProfile === profile) {
    profileLongPressHandledProfile = "";
    return;
  }
  applySelectedProfile(profile);
  renderActions();
});
profileFooter?.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("[data-profile]");
  if (!button) {
    return;
  }
  event.preventDefault();
  profilePressStartedAt = Date.now();
  profilePressProfile = String(button.dataset.profile || "").trim();
  if (profileHoldTimer) {
    window.clearTimeout(profileHoldTimer);
    profileHoldTimer = null;
  }
  if (profilePressProfile) {
    profileHoldTimer = window.setTimeout(() => {
      profileHoldTimer = null;
      if (!profilePressProfile) {
        return;
      }
      profileLongPressHandledProfile = profilePressProfile;
      openProfileManageOverlay(profilePressProfile);
    }, 500);
  }
});
profileFooter?.addEventListener("pointerup", (event) => {
  const button = event.target.closest("[data-profile]");
  if (!button) {
    return;
  }
  if (profileHoldTimer) {
    window.clearTimeout(profileHoldTimer);
    profileHoldTimer = null;
  }
  profilePressStartedAt = 0;
  profilePressProfile = "";
});
["pointerleave", "pointercancel"].forEach((evt) => {
  profileFooter?.addEventListener(evt, () => {
    if (profileHoldTimer) {
      window.clearTimeout(profileHoldTimer);
      profileHoldTimer = null;
    }
    profilePressStartedAt = 0;
    profilePressProfile = "";
  });
});

profileManageCancel?.addEventListener("click", closeProfileManageOverlay);
profileDeleteConfirmInput?.addEventListener("input", renderProfileManageOverlay);
profileDeleteConfirmButton?.addEventListener("click", () => {
  void (async () => {
    try {
      await deleteManagedProfile();
    } catch (error) {
      if (profileManageMessage) {
        profileManageMessage.textContent = error instanceof Error ? error.message : "Falha ao excluir usuário.";
      }
    }
  })();
});
profileReassignConfirmButton?.addEventListener("click", () => {
  void (async () => {
    try {
      await reassignManagedProfileTasks();
    } catch (error) {
      if (profileManageMessage) {
        profileManageMessage.textContent = error instanceof Error ? error.message : "Falha ao copiar tarefas.";
      }
    }
  })();
});
openProject200CreateProfileModalButton?.addEventListener("click", () => {
  project200CreateProfileMessage.textContent = "";
  project200CreateProfileNameInput.value = "";
  openModal("project200CreateProfileModal");
});
openProfileAvatarModalFromOptionsButton?.addEventListener("click", () => {
  const profile = getProfileByName(state.selectedProfile) || getDefaultProfile();
  if (!profile?.name) {
    return;
  }
  openProfileAvatarModal(profile.name);
});
project200CreateProfileConfirmButton?.addEventListener("click", () => {
  void (async () => {
    try {
      await createProject200ProfileFromModal();
    } catch (error) {
      if (project200CreateProfileMessage) {
        project200CreateProfileMessage.textContent = error instanceof Error ? error.message : "Falha ao criar usuário.";
      }
    }
  })();
});
project200CreateProfileNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void createProject200ProfileFromModal().catch((error) => {
      if (project200CreateProfileMessage) {
        project200CreateProfileMessage.textContent = error instanceof Error ? error.message : "Falha ao criar usuário.";
      }
    });
  }
});
closeStartDecisionModal?.addEventListener("click", () => {
  closeStartDecisionModalWith("cancel");
  navigateToProjectHome();
});
closePostponeTaskModal?.addEventListener("click", closePostponeTaskModalView);
closePostponeReplaceModal?.addEventListener("click", closePostponeReplaceModalView);
postponeOnlyFree?.addEventListener("change", () => {
  state.postpone.onlyFree = Boolean(postponeOnlyFree.checked);
  renderPostponeTaskModal();
});
confirmPostponeReplace?.addEventListener("click", () => {
  void applyPostponeTaskConfirm({ allowReplace: true });
});
confirmPostponeTask?.addEventListener("click", () => {
  void (async () => {
    try {
      await applyPostponeTaskConfirm({ allowReplace: false });
    } catch (error) {
      if (postponeFeedback) {
        postponeFeedback.classList.add("is-error");
        postponeFeedback.textContent = error instanceof Error ? error.message : "Falha ao adiar tarefa.";
      }
    }
  })();
});

document.querySelectorAll("[data-postpone-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    if (postponeNavLongPressHandled) {
      postponeNavLongPressHandled = false;
      return;
    }
    const type = String(button.dataset.postponeNav || "time");
    const dir = Number(button.dataset.dir || 0);
    movePostponeSelector(type, dir, false);
  });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const type = String(button.dataset.postponeNav || "time");
    const dir = Number(button.dataset.dir || 0);
    postponeNavLongPressHandled = false;
    if (postponeNavHoldTimer) {
      window.clearTimeout(postponeNavHoldTimer);
      postponeNavHoldTimer = null;
    }
    if (postponeNavHoldInterval) {
      window.clearInterval(postponeNavHoldInterval);
      postponeNavHoldInterval = null;
    }
    postponeNavHoldTimer = window.setTimeout(() => {
      postponeNavLongPressHandled = true;
      if (type === "time") {
        movePostponeSelector(type, dir, true);
        postponeNavHoldInterval = window.setInterval(() => {
          movePostponeSelector(type, dir, true);
        }, 500);
      }
    }, 500);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    button.addEventListener(evt, () => {
      if (postponeNavHoldTimer) {
        window.clearTimeout(postponeNavHoldTimer);
        postponeNavHoldTimer = null;
      }
      if (postponeNavHoldInterval) {
        window.clearInterval(postponeNavHoldInterval);
        postponeNavHoldInterval = null;
      }
    });
  });
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
      const response = await runWithGlobalLoading(() => fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }), {
        path: "/api/auth/login",
        iconSrc: loadingIconByArea.actions
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        throw new Error(data?.error || "Falha no login.");
      }
      setToken(String(data.token));
      state.authUser = data?.user || null;
      refreshProfileLockFromAuth(data?.user || null);
      if (project200LoginMessage) project200LoginMessage.textContent = "Acesso liberado.";
      project200LoginOverlay?.classList.remove("active");
      project200LoginOverlay?.setAttribute("aria-hidden", "true");
      await loadProject200Profiles();
      await loadActions();
      await loadSocialSnapshot({ force: true, skipGlobalLoading: true, silent: true });
      openPrimaryRunningSurface();
      scheduleScreenLockInactivity();
    } catch (error) {
      if (project200LoginMessage) {
        project200LoginMessage.textContent = error instanceof Error ? error.message : "Falha no login.";
      }
    }
  })();
});

project200LoginTabButton?.addEventListener("click", () => {
  if (project200LoginMessage) {
    project200LoginMessage.textContent = "";
  }
  setProject200AuthTab("login");
});

project200RegisterTabButton?.addEventListener("click", () => {
  if (project200LoginMessage) {
    project200LoginMessage.textContent = "";
  }
  setProject200AuthTab("register");
});

project200RegisterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = String(project200RegisterName?.value || "").trim();
  const username = String(project200RegisterUsername?.value || "").trim();
  const password = String(project200RegisterPassword?.value || "");
  const confirmPassword = String(project200RegisterPasswordConfirm?.value || "");
  if (!name || !username || !password || !confirmPassword) {
    if (project200LoginMessage) project200LoginMessage.textContent = "Preencha todos os campos do cadastro.";
    return;
  }
  if (password !== confirmPassword) {
    if (project200LoginMessage) project200LoginMessage.textContent = "As senhas nao conferem.";
    return;
  }
  if (project200LoginMessage) project200LoginMessage.textContent = "Criando conta...";
  void (async () => {
    try {
      const registerResponse = await runWithGlobalLoading(() => fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password })
      }), {
        path: "/api/auth/register",
        iconSrc: loadingIconByArea.options
      });
      const registerData = await registerResponse.json();
      if (!registerResponse.ok) {
        throw new Error(registerData?.error || "Falha no cadastro.");
      }

      const loginResponse = await runWithGlobalLoading(() => fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }), {
        path: "/api/auth/login",
        iconSrc: loadingIconByArea.actions
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData?.token) {
        throw new Error(loginData?.error || "Conta criada, mas o login automatico falhou.");
      }

      setToken(String(loginData.token));
      state.authUser = loginData?.user || null;
      refreshProfileLockFromAuth(loginData?.user || null);
      if (project200LoginMessage) project200LoginMessage.textContent = "Conta criada e acesso liberado.";
      project200LoginOverlay?.classList.remove("active");
      project200LoginOverlay?.setAttribute("aria-hidden", "true");
      setProject200AuthTab("login");
      await loadProject200Profiles();
      await loadActions();
      await loadSocialSnapshot({ force: true, skipGlobalLoading: true, silent: true });
      openPrimaryRunningSurface();
      scheduleScreenLockInactivity();
    } catch (error) {
      if (project200LoginMessage) {
        project200LoginMessage.textContent = error instanceof Error ? error.message : "Falha no cadastro.";
      }
    }
  })();
});

loadOptionsConfig();
applyScreenLockUi();
scheduleScreenLockInactivity();
startHomeDeviceClock();
renderSocialModal();

document.querySelectorAll("[data-history-day-nav]").forEach((button) => {
  button.addEventListener("click", () => moveHistoryDate(Number(button.dataset.historyDayNav)));
});

renderMissionScopeControls();
handleSwipe(historyDateLabel, moveHistoryDate);
handleSwipe(historyTimelineList, moveHistoryDate);
preventEdgeSwipeNavigation();
registerNativeBackButtonHandler();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    startRunningTaskTicker();
    scheduleScreenLockInactivity();
    void refreshHomeSnapshot();
    return;
  }
  clearScreenLockInactivityTimer();
});
window.addEventListener("focus", () => {
  startRunningTaskTicker();
  scheduleScreenLockInactivity();
  syncHomeDeviceClock();
  void refreshHomeSnapshot();
});
window.addEventListener("pageshow", () => {
  startRunningTaskTicker();
  scheduleScreenLockInactivity();
  syncHomeDeviceClock();
  void refreshHomeSnapshot();
});
document.addEventListener("resume", () => {
  startRunningTaskTicker();
  scheduleScreenLockInactivity();
  syncHomeDeviceClock();
  void refreshHomeSnapshot();
});
startRunningTaskTicker();
if (runningMusicProgressTicker) {
  window.clearInterval(runningMusicProgressTicker);
}











