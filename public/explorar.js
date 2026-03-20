import { initContentAdmin } from "./content-admin.js";

const sessionStorageKey = "turma_do_printy_token";
const conversationStorageKey = "turma_do_printy_chat_conversations";
const legacyHistoryStorageKey = "turma_do_printy_chat_history";
const chatModeStorageKey = "turma_do_printy_chat_mode";
const chatSettingsStorageKey = "turma_do_printy_chat_settings";
const defaultOpenAiVoice = "alloy";
const openAiVoiceOptions = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "cedar", "marin"];

const authStatus = document.getElementById("auth-status");
const chatAuthStatus = document.getElementById("chat-auth-status");
const exploreBanner = document.getElementById("explore-banner");
const exploreAuthShell = document.getElementById("explore-auth-shell");
const exploreChatLayout = document.getElementById("explore-chat-layout");
const historyList = document.getElementById("history-list");
const chatSearchInput = document.getElementById("chat-search-input");
const sidebarToggleButton = document.getElementById("sidebar-toggle-button");
const newChatButton = document.getElementById("new-chat-button");
const editChatsButton = document.getElementById("edit-chats-button");
const settingsButton = document.getElementById("settings-button");
const logoutButton = document.getElementById("logout-button");
const chatShell = document.getElementById("chat-shell");
const chatThread = document.getElementById("chat-thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");
const micButton = document.getElementById("mic-button");
const composerStatus = document.getElementById("composer-status");
const conversationHeader = document.getElementById("conversation-header");
const conversationTitle = document.getElementById("conversation-title");
const conversationMeta = document.getElementById("conversation-meta");
const chatModeButton = document.getElementById("chat-mode-button");
const chatModeButtonIcon = document.getElementById("chat-mode-button-icon");
const chatModeButtonLabel = document.getElementById("chat-mode-button-label");
const chatModeMenu = document.getElementById("chat-mode-menu");
const chatModeOptions = Array.from(document.querySelectorAll("[data-chat-mode]"));
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const registerName = document.getElementById("register-name");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");
const settingsModal = document.getElementById("settings-modal");
const settingsForm = document.getElementById("settings-form");
const settingsCloseButton = document.getElementById("settings-close-button");
const settingsCancelButton = document.getElementById("settings-cancel-button");
const settingsVoiceSelect = document.getElementById("settings-voice-select");
const settingsResponseStyle = document.getElementById("settings-response-style");
const settingsCallName = document.getElementById("settings-call-name");
const settingsMinistryDream = document.getElementById("settings-ministry-dream");
const settingsRoleSelect = document.getElementById("settings-role-select");
const settingsStatus = document.getElementById("settings-status");

let currentController = null;
let stopRequested = false;
let currentUser = null;
let activeConversationId = null;
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let isRecording = false;
let sidebarCollapsed = window.innerWidth <= 980;
let chatSearchTerm = "";
let historyEditMode = false;
let editingConversationId = null;
let speakingButton = null;
let speakingAudio = null;
let speakingAudioUrl = "";
let speechRecognition = null;
let speechRecognitionSilenceTimer = null;
let speechRecognitionBaseText = "";
let speechRecognitionFinalTranscript = "";
let narrationState = null;
let pendingSearchFocus = null;
let searchHighlightResetId = null;
let showEmptyDraftConversation = false;
let siteConfig = {
  banners: {},
  textOverrides: {}
};
let accessState = {
  authenticated: false,
  planId: "gratis",
  canDownloadAll: false
};

const chatModes = {
  fast: {
    label: "Pratico",
    model: "gpt-4.1-nano",
    instantModel: "gpt-4.1-nano",
    maxCompletionTokens: 260,
    previewMaxCompletionTokens: 120
  },
  think: {
    label: "Pensativo",
    model: "gpt-4.1-mini",
    instantModel: "gpt-4.1-nano",
    maxCompletionTokens: 700,
    previewMaxCompletionTokens: 160
  },
  project: {
    label: "Projeto",
    model: "gpt-5-mini",
    instantModel: "gpt-4.1-mini",
    maxCompletionTokens: 2600,
    previewMaxCompletionTokens: 220,
    planRequired: "life"
  }
};

const emptyConversationVariants = [
  "Quando voce quiser",
  "Pode começar daqui",
  "Estou por aqui",
  "Sua proxima ideia pode nascer agora",
  "Vamos montar algo bonito juntos",
  "Tem espaco para uma nova conversa",
  "Quando fizer sentido para voce",
  "Pronto para criar com calma",
  "Um novo chat pode comecar agora",
  "Vamos dar forma a uma boa ideia"
];

const conversationTitleMaxLength = 30;
const searchPreviewMaxLength = 45;
const searchPreviewBaseMaxLength = 15;
const searchTextHighlightDurationMs = 5000;
const chatRevealCharsPerSecond = 100;
const chatRevealTickMs = 50;
const speechSilenceTimeoutMs = 3000;
const speechChunkWordCount = 20;
const emptyConversationSupportText = "Posso ajudar com roteiros, programacoes, legendas, devocionais, cantatas e ideias para o ministerio infantil.";
const sidebarMenuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 6.5m0 5.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 12m0 5.5A1.5 1.5 0 0 1 5.5 16h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 17.5"/></svg>';
const micIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3m5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A7 7 0 0 1 5 12a1 1 0 1 1 2 0 5 5 0 1 0 10 0"/></svg>';
const squareStopIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z"/></svg>';
const chatModeMeta = {
  fast: {
    label: "Pratico",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>'
  },
  think: {
    label: "Pensativo",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7 7 0 0 0-4.37 12.47c.3.24.47.61.47.99V18a2 2 0 0 0 2 2h1v1a1 1 0 1 0 2 0v-1h1a2 2 0 0 0 2-2v-1.54c0-.38.17-.75.47-.99A7 7 0 0 0 12 3m-2 6a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1m4 0a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1m-4 7h4v2h-4z"/></svg>'
  },
  project: {
    label: "Projeto",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3c2.8.2 4.88 1.14 6.5 2.77-1.63 1.62-2.57 3.7-2.77 6.5l-3.41 3.4-1.92-1.92-3.95 3.95 1.07 1.07-1.42 1.42-4.24-4.24 1.42-1.42 1.07 1.07 3.95-3.95-1.92-1.92zm-7.9 13.56 1.84 1.84-3.89 1.06z"/></svg>'
  }
};

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(sessionStorageKey, token);
    return;
  }

  window.localStorage.removeItem(sessionStorageKey);
}

async function loadSiteConfig() {
  const response = await fetch("/api/site/config");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar configuracoes do site.");
  }

  return data;
}

async function runAuthRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha na autenticacao.");
  }

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

function setComposerStatus(message = "") {
  composerStatus.textContent = "";
}

function createDefaultChatSettings() {
  return {
    voice: defaultOpenAiVoice,
    responseStyle: "",
    callName: "",
    ministryDream: "",
    ministryRole: "Lider"
  };
}

function getChatSettingsStore() {
  try {
    return JSON.parse(window.localStorage.getItem(chatSettingsStorageKey) || "{}");
  } catch {
    return {};
  }
}

function getUserChatSettings() {
  const store = getChatSettingsStore();
  return {
    ...createDefaultChatSettings(),
    ...(store[getUserKey()] || {})
  };
}

function saveUserChatSettings(nextSettings) {
  const store = getChatSettingsStore();
  store[getUserKey()] = {
    ...createDefaultChatSettings(),
    ...nextSettings
  };
  window.localStorage.setItem(chatSettingsStorageKey, JSON.stringify(store));
}

function populateVoiceOptions() {
  if (!settingsVoiceSelect || settingsVoiceSelect.options.length) {
    return;
  }

  settingsVoiceSelect.innerHTML = openAiVoiceOptions
    .map((voice) => `<option value="${voice}">${voice}</option>`)
    .join("");
}

function fillSettingsForm() {
  if (!settingsForm) {
    return;
  }

  populateVoiceOptions();
  const settings = getUserChatSettings();
  settingsVoiceSelect.value = settings.voice || defaultOpenAiVoice;
  settingsResponseStyle.value = settings.responseStyle || "";
  settingsCallName.value = settings.callName || "";
  settingsMinistryDream.value = settings.ministryDream || "";
  settingsRoleSelect.value = settings.ministryRole || "Lider";
  settingsStatus.textContent = "";
}

function openSettingsModal() {
  if (!currentUser || !settingsModal) {
    return;
  }

  fillSettingsForm();
  settingsModal.hidden = false;
}

function closeSettingsModal() {
  if (!settingsModal) {
    return;
  }

  settingsModal.hidden = true;
}

function getChatMode() {
  const stored = window.localStorage.getItem(chatModeStorageKey);
  if (stored === "practical") {
    return "fast";
  }
  if (stored === "pensativo") {
    return "think";
  }
  return chatModes[stored] ? stored : "fast";
}

function closeChatModeMenu() {
  if (!chatModeButton || !chatModeMenu) {
    return;
  }

  chatModeMenu.hidden = true;
  chatModeButton.setAttribute("aria-expanded", "false");
}

function openChatModeMenu() {
  if (!chatModeButton || !chatModeMenu) {
    return;
  }

  chatModeMenu.hidden = false;
  chatModeButton.setAttribute("aria-expanded", "true");
}

function syncChatModeUi() {
  const mode = getChatMode();

  if (chatModeButtonLabel) {
    chatModeButtonLabel.textContent = chatModeMeta[mode]?.label || "Pratico";
  }

  if (chatModeButtonIcon) {
    chatModeButtonIcon.innerHTML = chatModeMeta[mode]?.icon || chatModeMeta.fast.icon;
  }

  chatModeOptions.forEach((option) => {
    option.setAttribute("aria-checked", option.dataset.chatMode === mode ? "true" : "false");
    option.classList.toggle("is-active", option.dataset.chatMode === mode);
  });
}

function syncModeAvailability() {
  if (!chatModeOptions.length) {
    return;
  }

  const projectOption = chatModeOptions.find((option) => option.dataset.chatMode === "project");
  const projectText = projectOption?.querySelector(".chat-mode-option-text");
  if (projectText) {
    projectText.textContent = accessState.planId === "life" ? "Projeto" : "Projeto (Life)";
  }

  const currentMode = getChatMode();
  if (currentMode === "project" && accessState.planId !== "life") {
    window.localStorage.setItem(chatModeStorageKey, "think");
  }

  syncChatModeUi();
}

function getConversationStore() {
  try {
    return JSON.parse(window.localStorage.getItem(conversationStorageKey) || "{}");
  } catch {
    return {};
  }
}

function setConversationStore(store) {
  window.localStorage.setItem(conversationStorageKey, JSON.stringify(store));
}

function getLegacyHistory() {
  try {
    return JSON.parse(window.localStorage.getItem(legacyHistoryStorageKey) || "[]");
  } catch {
    return [];
  }
}

function getUserKey() {
  return currentUser?.username || "guest";
}

function getUserDisplayName() {
  return currentUser?.name || currentUser?.username || "";
}

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      planId: "gratis",
      canDownloadAll: false
    };
    return;
  }

  const response = await fetch("/api/account/access", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    accessState = {
      authenticated: Boolean(currentUser),
      planId: "gratis",
      canDownloadAll: false
    };
    return;
  }

  accessState = {
    authenticated: true,
    planId: data?.access?.plan?.id || "gratis",
    canDownloadAll: Boolean(data?.access?.canDownloadAll)
  };
}

function getConversations() {
  const store = getConversationStore();
  const items = Array.isArray(store[getUserKey()]) ? store[getUserKey()] : [];

  return items
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function getFilteredConversations() {
  const conversations = getConversations();
  const searchTerm = chatSearchTerm.trim().toLowerCase();

  if (!searchTerm) {
    return conversations;
  }

  return conversations.filter((item) => {
    const title = String(item.title || "").toLowerCase();
    const body = Array.isArray(item.messages)
      ? item.messages.map((message) => String(message.content || "").toLowerCase()).join(" ")
      : "";

    return title.includes(searchTerm) || body.includes(searchTerm);
  });
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeSearchTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findMatchIndexes(source, searchTerm) {
  const safeSource = String(source || "");
  const safeSearchTerm = normalizeSearchTerm(searchTerm);

  if (!safeSource || !safeSearchTerm) {
    return [];
  }

  const sourceLower = safeSource.toLocaleLowerCase("pt-BR");
  const searchLower = safeSearchTerm.toLocaleLowerCase("pt-BR");
  const indexes = [];
  let fromIndex = 0;

  while (fromIndex < sourceLower.length) {
    const matchIndex = sourceLower.indexOf(searchLower, fromIndex);

    if (matchIndex === -1) {
      break;
    }

    indexes.push(matchIndex);
    fromIndex = matchIndex + Math.max(searchLower.length, 1);
  }

  return indexes;
}

function buildSearchPreview(source, matchIndex, matchLength) {
  const safeSource = String(source || "").replace(/\s+/g, " ").trim();
  const safeMatchIndex = Math.max(0, Math.min(matchIndex, safeSource.length));
  const safeMatchLength = Math.max(0, Math.min(matchLength, safeSource.length - safeMatchIndex));
  const previewBaseLength = Math.min(safeMatchLength, searchPreviewBaseMaxLength);
  const base = safeSource.slice(safeMatchIndex, safeMatchIndex + previewBaseLength);

  if (!base) {
    return null;
  }

  const remaining = searchPreviewMaxLength - base.length;
  const beforeBudget = Math.floor(remaining / 2);
  const afterBudget = remaining - beforeBudget;
  let beforeStart = Math.max(0, safeMatchIndex - beforeBudget);
  let before = safeSource.slice(beforeStart, safeMatchIndex);
  let after = safeSource.slice(safeMatchIndex + safeMatchLength, safeMatchIndex + safeMatchLength + afterBudget);

  const missingBefore = beforeBudget - before.length;
  if (missingBefore > 0) {
    after = safeSource.slice(
      safeMatchIndex + safeMatchLength,
      safeMatchIndex + safeMatchLength + afterBudget + missingBefore
    );
  }

  const missingAfter = afterBudget - after.length;
  if (missingAfter > 0) {
    beforeStart = Math.max(0, beforeStart - missingAfter);
    before = safeSource.slice(beforeStart, safeMatchIndex);
  }

  return {
    before,
    base,
    after
  };
}

function buildSearchPreviewMarkup(preview) {
  if (!preview) {
    return "";
  }

  const fullText = `${preview.before}${preview.base}${preview.after}`.slice(0, searchPreviewMaxLength);
  const baseStart = preview.before.length;
  const baseEnd = baseStart + preview.base.length;

  return Array.from(fullText).map((char, index) => {
    const charPosition = index + 1;
    const opacityClassName =
      charPosition === 41 ? " history-search-char-fade-41"
      : charPosition === 42 ? " history-search-char-fade-42"
      : charPosition === 43 ? " history-search-char-fade-43"
      : charPosition === 44 ? " history-search-char-fade-44"
      : charPosition === 45 ? " history-search-char-fade-45"
      : "";
    const isBaseChar = index >= baseStart && index < baseEnd;
    const tagName = isBaseChar ? "strong" : "span";
    const className = `${isBaseChar ? "history-search-base" : "history-search-char"}${opacityClassName}`;

    return `<${tagName} class="${className}">${escapeHtml(char)}</${tagName}>`;
  }).join("");
}

function splitBalancedLine(text) {
  const safeText = String(text || "").replace(/\s+/g, " ").trim();

  if (!safeText) {
    return ["", ""];
  }

  const words = safeText.split(" ");
  if (words.length <= 1) {
    return [safeText, ""];
  }

  let bestIndex = 1;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const delta = Math.abs(left.length - right.length);

    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  }

  return [
    words.slice(0, bestIndex).join(" "),
    words.slice(bestIndex).join(" ")
  ];
}

function getConversationSearchResults(conversation, searchTerm) {
  const safeSearchTerm = normalizeSearchTerm(searchTerm);

  if (!safeSearchTerm) {
    return [];
  }

  const results = [];
  const titleMatches = findMatchIndexes(conversation.title || "", safeSearchTerm);

  titleMatches.forEach((matchIndex, occurrenceIndex) => {
    const preview = buildSearchPreview(conversation.title || "", matchIndex, safeSearchTerm.length);

    if (!preview) {
      return;
    }

    results.push({
      conversationId: conversation.id,
      title: conversation.title,
      targetType: "title",
      occurrenceIndex,
      preview
    });
  });

  (conversation.messages || []).forEach((message, messageIndex) => {
    const messageMatches = findMatchIndexes(message.content || "", safeSearchTerm);

    messageMatches.forEach((matchIndex, occurrenceIndex) => {
      const preview = buildSearchPreview(message.content || "", matchIndex, safeSearchTerm.length);

      if (!preview) {
        return;
      }

      results.push({
        conversationId: conversation.id,
        title: conversation.title,
        targetType: "message",
        messageIndex,
        occurrenceIndex,
        preview
      });
    });
  });

  return results;
}

function getHistoryEntries() {
  const conversations = getConversations();
  const safeSearchTerm = normalizeSearchTerm(chatSearchTerm);

  if (!safeSearchTerm) {
    return conversations.map((conversation) => ({
      type: "conversation",
      conversation
    }));
  }

  return conversations.flatMap((conversation) =>
    getConversationSearchResults(conversation, safeSearchTerm).map((result) => ({
      type: "search-result",
      conversation,
      result
    }))
  );
}

function saveConversations(conversations) {
  const store = getConversationStore();
  store[getUserKey()] = conversations;
  setConversationStore(store);
}

function getActiveConversation() {
  if (showEmptyDraftConversation) {
    return null;
  }

  const conversations = getConversations();

  if (!conversations.length) {
    return null;
  }

  return conversations.find((item) => item.id === activeConversationId) || conversations[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getHighlightedMarkup(text, searchTerm, occurrenceIndex, highlightClassName) {
  const source = String(text || "");
  const safeSearchTerm = normalizeSearchTerm(searchTerm);

  if (!source || !safeSearchTerm) {
    return escapeHtml(source);
  }

  const matches = findMatchIndexes(source, safeSearchTerm);

  if (!matches.length || occurrenceIndex >= matches.length) {
    return escapeHtml(source);
  }

  const matchIndex = matches[occurrenceIndex];
  const before = source.slice(0, matchIndex);
  const base = source.slice(matchIndex, matchIndex + safeSearchTerm.length);
  const after = source.slice(matchIndex + safeSearchTerm.length);

  return `${escapeHtml(before)}<span class="${highlightClassName}">${escapeHtml(base)}</span>${escapeHtml(after)}`;
}

function clearPendingSearchHighlight(resetOnly = false) {
  if (searchHighlightResetId) {
    window.clearTimeout(searchHighlightResetId);
    searchHighlightResetId = null;
  }

  document.querySelectorAll(".search-highlight-pulse").forEach((element) => {
    element.classList.remove("search-highlight-pulse");
  });

  document.querySelectorAll(".search-highlight-text").forEach((element) => {
    element.classList.remove("search-highlight-text");
  });

  if (!resetOnly) {
    pendingSearchFocus = null;
  }
}

function activateSearchResult(result) {
  pendingSearchFocus = {
    conversationId: result.conversationId,
    targetType: result.targetType,
    messageIndex: typeof result.messageIndex === "number" ? result.messageIndex : null,
    occurrenceIndex: result.occurrenceIndex,
    searchTerm: normalizeSearchTerm(chatSearchTerm)
  };
  activeConversationId = result.conversationId;
  renderConversation();
  renderHistoryList();
}

function finalizePendingSearchFocus() {
  if (!pendingSearchFocus || pendingSearchFocus.conversationId !== activeConversationId) {
    return;
  }

  const target = pendingSearchFocus.targetType === "title"
    ? conversationHeader?.querySelector('[data-search-target="title"]')
    : chatThread.querySelector(`[data-search-target="message"][data-message-index="${pendingSearchFocus.messageIndex}"]`);

  if (!(target instanceof HTMLElement)) {
    pendingSearchFocus = null;
    return;
  }

  clearPendingSearchHighlight(true);
  target.classList.add("search-highlight-pulse");
  target.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  target.querySelectorAll(".search-highlight-target").forEach((element) => {
    element.classList.add("search-highlight-text");
  });

  const activeFocus = pendingSearchFocus;
  searchHighlightResetId = window.setTimeout(() => {
    if (pendingSearchFocus !== activeFocus) {
      return;
    }

    clearPendingSearchHighlight();
  }, searchTextHighlightDurationMs);
}

function setAssistantThinkingState(active) {
  stopButton.classList.toggle("thinking", Boolean(active));
}

function syncMicButtonUi() {
  const isNarrating = Boolean(narrationState);
  const isListening = isRecording && !isNarrating;
  micButton.classList.toggle("recording", isListening);
  micButton.classList.toggle("audio-stop", isNarrating);
  micButton.innerHTML = isNarrating ? squareStopIcon : micIcon;
  micButton.setAttribute("aria-label", isNarrating ? "Parar audio" : isListening ? "Parar gravacao" : "Gravar mensagem de voz");
  micButton.title = isNarrating ? "Parar audio" : isListening ? "Parar gravacao" : "Gravar mensagem de voz";
}

function updateRecordingUi(recording) {
  isRecording = recording;
  syncMicButtonUi();
}

function stopAssistantSpeech() {
  if (narrationState?.fetchControllers?.length) {
    narrationState.fetchControllers.forEach((controller) => {
      try {
        controller.abort();
      } catch {
        // noop
      }
    });
  }

  if (speakingAudio) {
    speakingAudio.pause();
    speakingAudio.src = "";
    speakingAudio = null;
  }

  if (speakingAudioUrl) {
    URL.revokeObjectURL(speakingAudioUrl);
    speakingAudioUrl = "";
  }

  if (speakingButton) {
    speakingButton.classList.remove("playing");
    speakingButton.setAttribute("aria-label", "Ouvir resposta");
    speakingButton.title = "Ouvir resposta";
    speakingButton = null;
  }

  narrationState = null;
  updateRecordingUi(false);
  syncMicButtonUi();
}

function buildResponseStylePrompt(modeKey) {
  const settings = getUserChatSettings();
  const parts = [
    "Se a pessoa nao trouxer elemento religioso, responda de modo respeitoso, aberto e neutro, sem inserir religiao por conta propria.",
    "Entregue somente o que foi pedido, sem oferecer proximos passos, extras ou sugestoes nao solicitadas.",
    "Mantenha etica, respeito e amizade.",
    "Se a pergunta for minima ou basica, responda no mesmo tom e na mesma proporcao."
  ];

  if (settings.callName) {
    parts.push(`Chame a pessoa de ${settings.callName}.`);
  }

  if (settings.ministryRole) {
    parts.push(`Considere que o papel dela no ministerio infantil e ${settings.ministryRole}.`);
  }

  if (settings.ministryDream) {
    parts.push(`Sonho no ministerio infantil: ${settings.ministryDream}.`);
  }

  if (settings.responseStyle) {
    parts.push(`Estilo de resposta desejado: ${settings.responseStyle}.`);
  }

  if (modeKey === "fast") {
    parts.push("Seja extremamente pratico, util e rapido.");
  }

  if (modeKey === "think") {
    parts.push("Pense melhor antes de responder e entregue mais contexto, mas sem enrolar.");
  }

  if (modeKey === "project") {
    parts.push("Responda em formato de projeto bem desenvolvido, normalmente entre 6.000 e 8.000 caracteres, com estrutura clara, blocos bem organizados e ideias aplicaveis.");
  }

  return parts.join(" ");
}

function splitTextIntoSpeechChunks(text) {
  const source = String(text || "").replace(/\s+/g, " ").trim();

  if (!source) {
    return [];
  }

  const tokens = source.match(/\S+\s*/g) || [];
  const chunks = [];
  let currentChunk = "";
  let wordCount = 0;
  let reachedMinWords = false;

  tokens.forEach((token) => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return;
    }

    currentChunk += token;
    wordCount += 1;
    if (wordCount >= speechChunkWordCount) {
      reachedMinWords = true;
    }

    const endsWithBoundary = /[,.]$/.test(cleanToken);
    if (reachedMinWords && endsWithBoundary) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
      wordCount = 0;
      reachedMinWords = false;
    }
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function fetchSpeechChunk(text, voice, controller) {
  const response = await fetch("/api/audio/speak", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      text,
      voice
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Nao consegui gerar o audio da resposta.");
  }

  return response.blob();
}

function ensureNarrationBuffer(state, index) {
  if (!state || index >= state.chunks.length || state.chunkRequests[index]) {
    return;
  }

  const controller = new AbortController();
  state.fetchControllers.push(controller);
  state.chunkRequests[index] = fetchSpeechChunk(state.chunks[index], state.voice, controller)
    .then((blob) => {
      state.chunkBlobs[index] = blob;
      return blob;
    })
    .catch((error) => {
      if (error?.name === "AbortError") {
        return null;
      }
      throw error;
    })
    .finally(() => {
      state.fetchControllers = state.fetchControllers.filter((item) => item !== controller);
    });
}

async function playNarrationChunk(state, index) {
  if (!state || state.stopped || index >= state.chunks.length) {
    stopAssistantSpeech();
    return;
  }

  ensureNarrationBuffer(state, index);
  ensureNarrationBuffer(state, index + 1);
  const blob = state.chunkBlobs[index] || await state.chunkRequests[index];

  if (!blob || state.stopped || narrationState !== state) {
    return;
  }

  if (speakingAudioUrl) {
    URL.revokeObjectURL(speakingAudioUrl);
    speakingAudioUrl = "";
  }

  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  speakingAudio = audio;
  speakingAudioUrl = audioUrl;
  speakingButton = state.button;
  state.button.classList.add("playing");
  state.button.setAttribute("aria-label", "Parar audio");
  state.button.title = "Parar audio";
  syncMicButtonUi();

  audio.addEventListener("ended", async () => {
    if (narrationState !== state || state.stopped) {
      return;
    }

    const nextIndex = index + 1;
    ensureNarrationBuffer(state, nextIndex + 1);

    if (nextIndex >= state.chunks.length) {
      stopAssistantSpeech();
      return;
    }

    await playNarrationChunk(state, nextIndex);
  }, { once: true });

  audio.addEventListener("error", () => stopAssistantSpeech(), { once: true });
  await audio.play();
}

async function speakAssistantText(text, button) {
  const chunks = splitTextIntoSpeechChunks(text);

  if (!chunks.length) {
    return;
  }

  const state = {
    button,
    chunks,
    voice: getUserChatSettings().voice || defaultOpenAiVoice,
    chunkRequests: [],
    chunkBlobs: [],
    fetchControllers: [],
    stopped: false
  };

  narrationState = state;
  syncMicButtonUi();
  ensureNarrationBuffer(state, 0);
  ensureNarrationBuffer(state, 1);
  await playNarrationChunk(state, 0);
}

function attachAssistantAudioButton(article, text) {
  if (!article || !text) {
    return;
  }

  const controls = document.createElement("div");
  controls.className = "assistant-audio-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "assistant-audio-button";
  button.setAttribute("aria-label", "Ouvir resposta");
  button.title = "Ouvir resposta";
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5 9.8 9H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3.8L14 19a1 1 0 0 0 1.7-.72V5.72A1 1 0 0 0 14 5m4.2 2.3a1 1 0 0 1 1.4 0 6.5 6.5 0 0 1 0 9.2 1 1 0 0 1-1.4-1.42 4.5 4.5 0 0 0 0-6.36 1 1 0 0 1 0-1.42m-2.6 2.1a1 1 0 0 1 1.4.1 3 3 0 0 1 0 4 1 1 0 1 1-1.5-1.32 1 1 0 0 0 0-1.36 1 1 0 0 1 .1-1.42"/></svg>';
  controls.appendChild(button);
  article.appendChild(controls);

  button.addEventListener("click", async () => {
    if (speakingButton === button) {
      stopAssistantSpeech();
      return;
    }

    stopAssistantSpeech();

    try {
      await speakAssistantText(text, button);
    } catch (error) {
      stopAssistantSpeech();
      setComposerStatus(error instanceof Error ? error.message : "Nao consegui tocar o audio.");
    }
  });
}

function formatRelativeDate(value) {
  if (!value) {
    return "agora";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const isSameDay = now.toDateString() === date.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (diffMinutes < 1) {
    return "agora";
  }

  if (diffMinutes < 60) {
    return `ha ${diffMinutes}m`;
  }

  if (isSameDay && diffHours < 12) {
    return `ha ${diffHours}h`;
  }

  if (yesterday.toDateString() === date.toDateString()) {
    return "ontem";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date).replace(".", "");
}

function clampConversationTitle(value) {
  const sanitized = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.!?:"'`]+$/g, "")
    .trim();

  if (!sanitized) {
    return "Novo chat";
  }

  if (sanitized.length <= conversationTitleMaxLength) {
    return sanitized;
  }

  const slice = sanitized.slice(0, conversationTitleMaxLength - 1).trimEnd();
  return `${slice}…`;
}

function sanitizeConversationTitle(value) {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  return clampConversationTitle(trimmed || "Novo chat");
}

function createShortTitle(message) {
  const sanitized = message.replace(/\s+/g, " ").trim();
  if (!sanitized) {
    return "Novo chat";
  }

  const words = sanitized.split(" ").slice(0, 4).join(" ");
  return clampConversationTitle(words);
}

function createConversation(firstMessage = "") {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: createShortTitle(firstMessage),
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createWelcomeConversation() {
  const conversation = createConversation("");
  conversation.title = "Bem Vindo";
  return conversation;
}

function ensureWelcomeConversation() {
  const conversations = getConversations();

  if (conversations.length) {
    return conversations;
  }

  const welcomeConversation = createWelcomeConversation();
  saveConversations([welcomeConversation]);
  activeConversationId = welcomeConversation.id;
  return [welcomeConversation];
}

function getEmptyConversationCopy() {
  const todaySeed = new Date().toISOString().slice(0, 10);
  const usernameSeed = getUserKey();
  const seedValue = `${todaySeed}:${usernameSeed}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return emptyConversationVariants[seedValue % emptyConversationVariants.length];
}

function migrateLegacyHistory() {
  const legacyHistory = getLegacyHistory();

  if (!legacyHistory.length) {
    return;
  }

  const store = getConversationStore();
  const userKey = getUserKey();
  const hasCurrentConversations = Array.isArray(store[userKey]) && store[userKey].length > 0;

  if (hasCurrentConversations) {
    window.localStorage.removeItem(legacyHistoryStorageKey);
    return;
  }

  const firstUserMessage = legacyHistory.find((item) => item?.role === "user" && typeof item.content === "string")?.content || "";
  store[userKey] = [
    {
      ...createConversation(firstUserMessage),
      title: createShortTitle(firstUserMessage),
      messages: legacyHistory
        .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
        .map((item) => ({ role: item.role, content: item.content })),
      updatedAt: new Date().toISOString()
    }
  ];
  setConversationStore(store);
  window.localStorage.removeItem(legacyHistoryStorageKey);
}

function updateConversation(nextConversation) {
  const conversations = getConversations();
  const nextItems = conversations.filter((item) => item.id !== nextConversation.id);
  nextItems.unshift(nextConversation);
  saveConversations(nextItems);
  activeConversationId = nextConversation.id;
  showEmptyDraftConversation = false;
}

function renameConversation(conversationId, nextTitle) {
  const conversations = getConversations();
  const targetConversation = conversations.find((item) => item.id === conversationId);

  if (!targetConversation) {
    return false;
  }

  updateConversation({
    ...targetConversation,
    title: sanitizeConversationTitle(nextTitle),
    updatedAt: new Date().toISOString()
  });
  return true;
}

function deleteConversation(conversationId) {
  const conversations = getConversations();
  const nextItems = conversations.filter((item) => item.id !== conversationId);

  if (!nextItems.length) {
    const welcomeConversation = createWelcomeConversation();
    saveConversations([welcomeConversation]);
    activeConversationId = welcomeConversation.id;
    return;
  }

  saveConversations(nextItems);

  if (activeConversationId === conversationId) {
    activeConversationId = nextItems[0]?.id || null;
  }
}

function startConversationRename(conversationId) {
  editingConversationId = conversationId;
  renderHistoryList();
  const input = historyList.querySelector(`[data-history-title-input="${conversationId}"]`);

  if (input instanceof HTMLInputElement) {
    input.focus();
    input.select();
  }
}

function commitConversationRename(conversationId, nextTitle) {
  const renamed = renameConversation(conversationId, nextTitle);
  editingConversationId = null;

  if (renamed) {
    renderHistoryList();
    renderConversation();
  }
}

function renderHistoryList() {
  const entries = getHistoryEntries();
  historyList.innerHTML = "";

  if (!currentUser) {
    historyList.innerHTML = "";
    return;
  }

  if (!entries.length) {
    historyList.innerHTML = `
      <div class="history-empty">
        <strong>${chatSearchTerm ? "Nenhum chat encontrado." : "Nenhuma conversa ainda."}</strong>
        <p>${chatSearchTerm ? "Tente outro termo para localizar sua conversa." : "Clique em \"Nova conversa\" para abrir seu primeiro chat."}</p>
      </div>
    `;
    return;
  }

  entries.forEach((entry) => {
    const item = entry.conversation;
    const searchResult = entry.type === "search-result" ? entry.result : null;
    const itemShell = document.createElement("div");
    itemShell.className = `history-item-shell${historyEditMode ? " is-editing" : ""}`;

    const button = document.createElement("div");
    button.className = `history-item${item.id === activeConversationId ? " active" : ""}${searchResult ? " has-search-preview" : ""}`;
    button.setAttribute("role", "button");
    button.tabIndex = 0;

    if (editingConversationId === item.id) {
      button.innerHTML = `
        <span class="history-item-row history-item-row-editing">
          <input
            class="history-title-input"
            type="text"
            value="${escapeHtml(item.title || "Novo chat")}"
            data-history-title-input="${item.id}"
            maxlength="30"
            aria-label="Editar nome do chat"
          >
          <span class="history-item-actions">
            <button class="history-action-button" type="button" data-history-save="${item.id}" aria-label="Salvar nome" title="Salvar nome">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.55 18.2-4.7-4.7 1.4-1.4 3.3 3.3 8.2-8.2 1.4 1.4z"/></svg>
            </button>
          </span>
        </span>
      `;
    } else {
      button.innerHTML = `
        <span class="history-item-row">
          <strong title="${escapeHtml(item.title)}">${escapeHtml(clampConversationTitle(item.title))}</strong>
          ${
            historyEditMode
              ? `
                <span class="history-item-actions">
                  <button class="history-action-button" type="button" data-history-rename="${item.id}" aria-label="Editar nome do chat" title="Editar nome do chat">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.2V20h2.8l9.86-9.87-2.8-2.8zM18.71 8.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.17 1.17 2.8 2.8z"/></svg>
                  </button>
                  <button class="history-action-button danger" type="button" data-history-delete="${item.id}" aria-label="Excluir chat" title="Excluir chat">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h4v2H4V6h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 10h2v8H7zm1 10h8a2 2 0 0 0 2-2V9H6v9a2 2 0 0 0 2 2"/></svg>
                  </button>
                </span>
              `
              : ""
          }
        </span>
        ${
          searchResult
            ? `<span class="history-search-preview" title="${escapeAttribute(`${searchResult.preview.before}${searchResult.preview.base}${searchResult.preview.after}`)}">${buildSearchPreviewMarkup(searchResult.preview)}</span>`
            : ""
        }
      `;
    }

    button.addEventListener("click", () => {
      if (editingConversationId === item.id) {
        return;
      }

      if (searchResult) {
        activateSearchResult(searchResult);
        return;
      }

      clearPendingSearchHighlight();
      activeConversationId = item.id;
      showEmptyDraftConversation = false;
      renderConversation();
      renderHistoryList();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      if (editingConversationId === item.id) {
        return;
      }

      if (searchResult) {
        activateSearchResult(searchResult);
        return;
      }

      clearPendingSearchHighlight();
      activeConversationId = item.id;
      showEmptyDraftConversation = false;
      renderConversation();
      renderHistoryList();
    });

    itemShell.appendChild(button);
    historyList.appendChild(itemShell);

    const renameAction = itemShell.querySelector(`[data-history-rename="${item.id}"]`);
    renameAction?.addEventListener("click", (event) => {
      event.stopPropagation();
      startConversationRename(item.id);
    });

    const deleteAction = itemShell.querySelector(`[data-history-delete="${item.id}"]`);
    deleteAction?.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteConversation(item.id);
      editingConversationId = null;
      renderHistoryList();
      renderConversation();
    });

    const titleInput = itemShell.querySelector(`[data-history-title-input="${item.id}"]`);
    if (titleInput instanceof HTMLInputElement) {
      titleInput.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      titleInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitConversationRename(item.id, titleInput.value);
        } else if (event.key === "Escape") {
          editingConversationId = null;
          renderHistoryList();
        }
      });

      titleInput.addEventListener("blur", () => {
        commitConversationRename(item.id, titleInput.value);
      });
    }

    const saveAction = itemShell.querySelector(`[data-history-save="${item.id}"]`);
    saveAction?.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    saveAction?.addEventListener("click", (event) => {
      event.stopPropagation();
      const input = itemShell.querySelector(`[data-history-title-input="${item.id}"]`);
      if (input instanceof HTMLInputElement) {
        commitConversationRename(item.id, input.value);
      }
    });
  });
}

function renderConversation() {
  const conversation = getActiveConversation();
  chatThread.innerHTML = "";

  if (!conversation || conversation.messages.length === 0) {
    const [emptyLineOne, emptyLineTwo] = splitBalancedLine(emptyConversationSupportText);
    chatShell.classList.add("conversation-shell-empty");
    chatThread.classList.add("chat-thread-empty");
    if (conversationHeader) {
      conversationHeader.hidden = false;
    }
    conversationTitle.textContent = "";
    conversationMeta.textContent = "";
    chatThread.innerHTML = `
      <section class="empty-conversation-state">
        <h2>${escapeHtml(getEmptyConversationCopy())}</h2>
        <p>
          <span>${escapeHtml(emptyLineOne)}</span>
          <span>${escapeHtml(emptyLineTwo)}</span>
        </p>
      </section>
    `;
    return;
  }

  chatShell.classList.remove("conversation-shell-empty");
  chatThread.classList.remove("chat-thread-empty");
  if (conversationHeader) {
    conversationHeader.hidden = false;
  }
  const titleSearchActive = pendingSearchFocus
    && pendingSearchFocus.conversationId === conversation.id
    && pendingSearchFocus.targetType === "title";
  conversationTitle.dataset.searchTarget = "title";
  conversationTitle.innerHTML = titleSearchActive
    ? getHighlightedMarkup(conversation.title, pendingSearchFocus.searchTerm, pendingSearchFocus.occurrenceIndex, "search-highlight-target")
    : escapeHtml(conversation.title);
  conversationMeta.textContent = "";

  conversation.messages.forEach((item, messageIndex) => {
    const article = document.createElement("article");
    article.className = `message-card ${item.role === "user" ? "user" : "assistant"}`;
    const messageSearchActive = pendingSearchFocus
      && pendingSearchFocus.conversationId === conversation.id
      && pendingSearchFocus.targetType === "message"
      && pendingSearchFocus.messageIndex === messageIndex;
    article.innerHTML = `
      <div class="message-role">${item.role === "user" ? "Você" : "Assistente"}</div>
      <div class="message-text" data-search-target="message" data-message-index="${messageIndex}">${
        messageSearchActive
          ? getHighlightedMarkup(item.content, pendingSearchFocus.searchTerm, pendingSearchFocus.occurrenceIndex, "search-highlight-target")
          : escapeHtml(item.content)
      }</div>
    `;

    if (item.role === "assistant") {
      attachAssistantAudioButton(article, item.content);
    }

    chatThread.appendChild(article);
  });

  chatThread.scrollTop = chatThread.scrollHeight;
  window.requestAnimationFrame(() => {
    finalizePendingSearchFocus();
  });
}

function setRecordingState(recording) {
  updateRecordingUi(recording);
  micButton.setAttribute("aria-label", recording ? "Parar gravação" : "Gravar mensagem de voz");
  micButton.title = recording ? "Parar gravação" : "Gravar mensagem de voz";
}

function syncSidebarState() {
  if (!exploreChatLayout || !sidebarToggleButton) {
    return;
  }

  exploreChatLayout.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  document.body.classList.toggle("explore-sidebar-open", !sidebarCollapsed);
  sidebarToggleButton.setAttribute("aria-label", sidebarCollapsed ? "Mostrar historico" : "Recolher historico");
  sidebarToggleButton.title = sidebarCollapsed ? "Mostrar historico" : "Recolher historico";
  sidebarToggleButton.innerHTML = sidebarMenuIcon;
}

function syncComposerLayout() {
  const composerHeight = chatForm?.offsetHeight || 0;
  document.documentElement.style.setProperty("--explore-composer-height", `${composerHeight}px`);
}

function syncComposerEmptyState() {
  if (!chatForm || !chatInput) {
    return;
  }

  chatForm.classList.toggle("is-empty", !chatInput.value.trim());
}

window.addEventListener("resize", () => {
  const mobileView = window.innerWidth <= 980;
  sidebarCollapsed = mobileView ? sidebarCollapsed : false;
  syncSidebarState();
  syncComposerLayout();
});

function syncComposerState() {
  const isLoggedIn = Boolean(currentUser);
  document.body.classList.toggle("explore-authenticated", isLoggedIn);
  exploreAuthShell.hidden = isLoggedIn;
  exploreChatLayout.hidden = !isLoggedIn;
  if (exploreBanner) {
    exploreBanner.hidden = isLoggedIn;
  }
  logoutButton.hidden = !isLoggedIn;
  newChatButton.hidden = !isLoggedIn;
  if (editChatsButton) {
    editChatsButton.hidden = !isLoggedIn;
    editChatsButton.classList.toggle("is-active", historyEditMode && isLoggedIn);
  }
  if (settingsButton) {
    settingsButton.hidden = !isLoggedIn;
  }
  if (chatSearchInput) {
    chatSearchInput.disabled = !isLoggedIn;
  }
  chatShell.hidden = !isLoggedIn;
  micButton.disabled = !isLoggedIn;
  sendButton.disabled = !isLoggedIn;
  chatInput.disabled = !isLoggedIn;
  chatInput.placeholder = "Digite sua mensagem aqui...";
  syncSidebarState();
  syncComposerEmptyState();
  syncComposerLayout();
  syncMicButtonUi();
}

async function loadSessionState() {
  if (!getToken()) {
    currentUser = null;
    showEmptyDraftConversation = false;
    await loadAccessState();
    initContentAdmin({
      user: null,
      getToken,
      config: siteConfig
    });
    authStatus.textContent = "Entre ou cadastre sua conta para abrir o chat.";
    chatAuthStatus.textContent = "Sem login ativo.";
    syncComposerState();
    syncModeAvailability();
    renderHistoryList();
    renderConversation();
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      setToken("");
      currentUser = null;
      showEmptyDraftConversation = false;
      await loadAccessState();
      authStatus.textContent = data.error || "Sessão inválida.";
      chatAuthStatus.textContent = data.error || "Sessão inválida.";
      syncComposerState();
      syncModeAvailability();
      renderHistoryList();
      renderConversation();
      return;
    }

    currentUser = data.user;
    showEmptyDraftConversation = false;
    await loadAccessState();
    initContentAdmin({
      user: currentUser,
      getToken,
      config: siteConfig
    });
    migrateLegacyHistory();
    authStatus.textContent = `Logado como @${data.user.username}`;
    chatAuthStatus.textContent = getUserDisplayName();
    const conversations = ensureWelcomeConversation();
    activeConversationId = activeConversationId || conversations[0]?.id || null;
    syncComposerState();
    syncModeAvailability();
    renderHistoryList();
    renderConversation();
  } catch (error) {
    currentUser = null;
    showEmptyDraftConversation = false;
    await loadAccessState();
    initContentAdmin({
      user: null,
      getToken,
      config: siteConfig
    });
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    chatAuthStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    syncComposerState();
    syncModeAvailability();
    renderHistoryList();
    renderConversation();
  }
}

function addMessageToConversation(role, content) {
  let conversation = getActiveConversation();

  if (!conversation) {
    conversation = createConversation(role === "user" ? content : "");
  }

  if (!conversation.messages.length && role === "user") {
    conversation.title = createShortTitle(content);
  }

  const nextConversation = {
    ...conversation,
    updatedAt: new Date().toISOString(),
    messages: [...conversation.messages, { role, content }]
  };

  updateConversation(nextConversation);
  renderHistoryList();
  renderConversation();
  return nextConversation;
}

async function generateConversationTitle(conversationId, firstMessage) {
  const prompt = String(firstMessage || "").trim();

  if (!conversationId || !prompt || !currentUser) {
    return;
  }

  try {
    const selectedMode = chatModes.fast;
    const response = await fetch("/api/gpt/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        message: `Crie um titulo curtissimo para esta conversa: "${prompt}"`,
        system: `Responda somente com um titulo em portugues, com no maximo ${conversationTitleMaxLength} caracteres, sem aspas, sem ponto final e sem explicacoes.`,
        stream: false,
        model: selectedMode.model,
        instantModel: selectedMode.instantModel
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Falha ao gerar titulo.");
    }

    const nextTitle = clampConversationTitle(payload.outputText || payload.answer || "");
    const conversations = getConversations();
    const targetConversation = conversations.find((item) => item.id === conversationId);

    if (!targetConversation || !nextTitle || targetConversation.messages.length === 0) {
      return;
    }

    if (targetConversation.title !== createShortTitle(prompt) && targetConversation.title !== "Novo chat") {
      return;
    }

    updateConversation({
      ...targetConversation,
      title: nextTitle
    });
    renderHistoryList();
    renderConversation();
  } catch {
    // Mantem o titulo curto local se a geracao falhar.
  }
}

function createAssistantMessageElement(initialText = "Preparando resposta...") {
  const article = document.createElement("article");
  article.className = "message-card assistant";
  article.hidden = true;
  article.innerHTML = `
    <div class="message-text">${escapeHtml(initialText)}</div>
  `;
  chatThread.appendChild(article);
  chatThread.scrollTop = chatThread.scrollHeight;

  const state = {
    previewText: initialText || "",
    finalText: "",
    finalStarted: false,
    renderedLength: 0,
    typingTimerId: null
  };

  const api = {
    article,
    target: article.querySelector(".message-text"),
    hasPreview: false,
    getFullText() {
      if (state.finalText && (!state.previewText || state.finalStarted)) {
        return state.previewText
          ? `${state.previewText}\n\n${state.finalText}`
          : state.finalText;
      }

      return state.previewText || "";
    },
    ensureTypingLoop() {
      if (state.typingTimerId) {
        return;
      }

      const charsPerTick = Math.max(1, Math.round((chatRevealCharsPerSecond * chatRevealTickMs) / 1000));
      const renderStep = () => {
        const fullText = api.getFullText();

        if (state.renderedLength >= fullText.length) {
          window.clearInterval(state.typingTimerId);
          state.typingTimerId = null;
          return;
        }

        state.renderedLength = Math.min(fullText.length, state.renderedLength + charsPerTick);
        api.target.textContent = fullText.slice(0, state.renderedLength);
        article.hidden = state.renderedLength === 0;
        if (state.renderedLength > 0) {
          setAssistantThinkingState(false);
        }
        chatThread.scrollTop = chatThread.scrollHeight;
      };

      state.typingTimerId = window.setInterval(renderStep, chatRevealTickMs);
      renderStep();
    },
    syncText() {
      const fullText = api.getFullText();
      if (state.renderedLength > fullText.length) {
        state.renderedLength = fullText.length;
      }
      api.ensureTypingLoop();
    },
    setText(nextText) {
      state.previewText = nextText || "";
      state.finalText = "";
      state.finalStarted = false;
      api.syncText();
    },
    appendText(extraText) {
      if (!extraText) {
        return;
      }

      state.finalText += extraText;
      api.syncText();
    },
    setPreview(previewText) {
      api.hasPreview = Boolean(previewText);
      state.previewText = previewText || "";
      api.syncText();
    },
    startFinalBlock() {
      if (state.finalStarted) {
        return;
      }

      state.finalStarted = true;
      api.syncText();
    },
    finalizeAudio() {
      const cleanText = (state.finalText || state.previewText || "").trim();
      article.querySelector(".assistant-audio-actions")?.remove();
      attachAssistantAudioButton(article, cleanText);
    }
  };

  return api;
}

async function consumeAssistantStream(response, assistantMessage = createAssistantMessageElement()) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";

  if (!reader) {
    return "";
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventChunk of events) {
      const dataLines = eventChunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

      for (const dataLine of dataLines) {
        const event = JSON.parse(dataLine);

        if (event.type === "status") {
          if (event.stage === "final") {
            assistantMessage.startFinalBlock();
          }
          continue;
        }

        if (event.type === "preview" && event.text) {
          assistantMessage.setPreview(event.text);
          continue;
        }

        if (event.type === "delta" && event.text) {
          assistantMessage.appendText(event.text);
          finalText = `${finalText}${event.text}`;
          continue;
        }

        if (event.type === "done") {
          assistantMessage.finalizeAudio();
          return (event.text || finalText || "").trim();
        }

        if (event.type === "error") {
          throw new Error(event.message || "Falha ao consultar a IA.");
        }
      }
    }
  }

  return finalText.trim();
}

function renderAssistantResponseImmediately(text) {
  const article = document.createElement("article");
  article.className = "message-card assistant";
  article.innerHTML = `
    <div class="message-text">${escapeHtml(text)}</div>
  `;
  chatThread.appendChild(article);
  chatThread.scrollTop = chatThread.scrollHeight;
  return text.trim();
}

function ensureLoggedInBeforeChat() {
  if (currentUser) {
    return true;
  }

  authStatus.textContent = "Entre para liberar a conversa.";
  return false;
}

function stopMediaTracks() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler o audio."));
    reader.readAsDataURL(blob);
  });
}

async function transcribeAudio(blob) {
  const audioBase64 = await blobToBase64(blob);
  const response = await fetch("/api/audio/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || "audio/webm",
      fileName: blob.type.includes("mp4") ? "speech.mp4" : "speech.webm"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao transcrever o audio.");
  }

  return data.text || "";
}

async function stopRecordingAndTranscribe() {
  if (!mediaRecorder) {
    return;
  }

  setComposerStatus("Processando audio...");

  const stopPromise = new Promise((resolve) => {
    mediaRecorder.addEventListener("stop", resolve, { once: true });
  });

  mediaRecorder.stop();
  await stopPromise;

  const blob = new Blob(recordedChunks, {
    type: mediaRecorder.mimeType || "audio/webm"
  });

  mediaRecorder = null;
  recordedChunks = [];
  setRecordingState(false);
  syncMicButtonUi();
  stopMediaTracks();

  if (blob.size === 0) {
    setComposerStatus("Nenhum audio capturado.");
    return;
  }

  try {
    const transcript = await transcribeAudio(blob);

    if (!transcript) {
      setComposerStatus("Nao consegui entender o audio.");
      return;
    }

    chatInput.value = chatInput.value
      ? `${chatInput.value.trim()} ${transcript}`.trim()
      : transcript;
    chatInput.dispatchEvent(new Event("input"));
    setComposerStatus("Audio transcrito.");
  } catch (error) {
    setComposerStatus(error instanceof Error ? error.message : "Erro ao transcrever o audio.");
  }
}

function clearSpeechRecognitionSilenceTimer() {
  if (speechRecognitionSilenceTimer) {
    window.clearTimeout(speechRecognitionSilenceTimer);
    speechRecognitionSilenceTimer = null;
  }
}

function armSpeechRecognitionSilenceTimer() {
  clearSpeechRecognitionSilenceTimer();
  speechRecognitionSilenceTimer = window.setTimeout(() => {
    void stopSpeechRecognitionSession();
  }, speechSilenceTimeoutMs);
}

function updateLiveTranscript(finalTranscript = "", interimTranscript = "") {
  const nextValue = [speechRecognitionBaseText, speechRecognitionFinalTranscript, finalTranscript, interimTranscript]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  chatInput.value = nextValue;
  chatInput.dispatchEvent(new Event("input"));
}

function collectSpeechRecognitionTranscript(results, onlyFinal = false) {
  if (!results?.length) {
    return "";
  }

  const parts = [];

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const isFinal = Boolean(result?.isFinal);

    if (onlyFinal && !isFinal) {
      continue;
    }

    if (!onlyFinal && isFinal) {
      continue;
    }

    const transcript = String(result?.[0]?.transcript || "").trim();
    if (transcript) {
      parts.push(transcript);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function stopSpeechRecognitionSession() {
  clearSpeechRecognitionSilenceTimer();

  if (!speechRecognition) {
    setRecordingState(false);
    syncMicButtonUi();
    speechRecognitionFinalTranscript = "";
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const recognition = speechRecognition;
    speechRecognition = null;
    recognition.onend = () => {
      setRecordingState(false);
      syncMicButtonUi();
      speechRecognitionFinalTranscript = "";
      resolve();
    };
    try {
      recognition.stop();
    } catch {
      setRecordingState(false);
      syncMicButtonUi();
      speechRecognitionFinalTranscript = "";
      resolve();
    }
  });
}

async function startSpeechRecognitionSession() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    return false;
  }

  const recognition = new Recognition();
  speechRecognitionBaseText = chatInput.value.trim();
  speechRecognitionFinalTranscript = "";
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    speechRecognitionFinalTranscript = collectSpeechRecognitionTranscript(event.results, true);
    const interimTranscript = collectSpeechRecognitionTranscript(event.results, false);

    updateLiveTranscript("", interimTranscript);

    if (speechRecognitionFinalTranscript || interimTranscript) {
      armSpeechRecognitionSilenceTimer();
    }
  };

  recognition.onerror = () => {
    void stopSpeechRecognitionSession();
  };

  speechRecognition = recognition;
  recognition.start();
  setRecordingState(true);
  syncMicButtonUi();
  armSpeechRecognitionSilenceTimer();
  return true;
}

async function toggleRecording() {
  if (!ensureLoggedInBeforeChat()) {
    return;
  }

  if (narrationState) {
    narrationState.stopped = true;
    stopAssistantSpeech();
    return;
  }

  if (isRecording) {
    if (speechRecognition) {
      await stopSpeechRecognitionSession();
      return;
    }

    await stopRecordingAndTranscribe();
    return;
  }

  if (await startSpeechRecognitionSession()) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    setComposerStatus("Seu navegador nao suporta gravacao de audio.");
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    });

    mediaRecorder.start();
    setRecordingState(true);
    syncMicButtonUi();
    setComposerStatus("Ouvindo...");
  } catch (error) {
    stopMediaTracks();
    setRecordingState(false);
    syncMicButtonUi();
    setComposerStatus(error instanceof Error ? error.message : "Nao foi possivel acessar o microfone.");
  }
}

newChatButton.addEventListener("click", () => {
  if (!currentUser) {
    ensureLoggedInBeforeChat();
    return;
  }

  activeConversationId = null;
  showEmptyDraftConversation = true;
  renderHistoryList();
  renderConversation();
  setComposerStatus("");
  chatInput.focus();
});

editChatsButton?.addEventListener("click", () => {
  if (!currentUser) {
    ensureLoggedInBeforeChat();
    return;
  }

  historyEditMode = !historyEditMode;
  editingConversationId = null;
  editChatsButton.classList.toggle("is-active", historyEditMode);
  editChatsButton.setAttribute("aria-label", historyEditMode ? "Fechar edicao de chats" : "Editar chats");
  editChatsButton.title = historyEditMode ? "Fechar edicao de chats" : "Editar chats";
  renderHistoryList();
});

logoutButton.addEventListener("click", () => {
  setToken("");
  currentUser = null;
  activeConversationId = null;
  showEmptyDraftConversation = false;
  historyEditMode = false;
  editingConversationId = null;
  accessState = {
    authenticated: false,
    planId: "gratis",
    canDownloadAll: false
  };
  authStatus.textContent = "Sessao encerrada.";
  chatAuthStatus.textContent = "Sessao encerrada.";
  authStatus.textContent = "Entre ou crie sua conta para abrir o chat.";
  setComposerStatus("");
  closeSettingsModal();
  syncComposerState();
  syncModeAvailability();
  renderHistoryList();
  renderConversation();
});

micButton.addEventListener("click", async () => {
  await toggleRecording();
});

if (sidebarToggleButton) {
  sidebarToggleButton.addEventListener("click", () => {
    sidebarCollapsed = !sidebarCollapsed;
    syncSidebarState();
  });
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  if (!ensureLoggedInBeforeChat()) {
    return;
  }

  const baseConversation = getActiveConversation() || createConversation(message);
  const history = baseConversation.messages.slice(-8);
  showEmptyDraftConversation = false;

  const userConversation = addMessageToConversation("user", message);
  if (userConversation.messages.length === 1) {
    void generateConversationTitle(userConversation.id, message);
  }
  chatInput.value = "";
  chatInput.style.height = "auto";
  sendButton.disabled = true;
  sendButton.hidden = true;
  stopButton.disabled = false;
  stopButton.hidden = false;
  micButton.disabled = true;
  stopRequested = false;
  currentController = new AbortController();
  setAssistantThinkingState(true);
  const assistantMessage = createAssistantMessageElement("");
  const selectedMode = chatModes[getChatMode()] || chatModes.fast;
  const responseStyle = buildResponseStylePrompt(getChatMode());

  try {
    const response = await fetch("/api/gpt/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        message,
        history,
        stream: true,
        responseStyle,
        model: selectedMode.model,
        instantModel: selectedMode.instantModel,
        maxCompletionTokens: selectedMode.maxCompletionTokens,
        previewMaxCompletionTokens: selectedMode.previewMaxCompletionTokens
      }),
      signal: currentController.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao consultar a IA.");
    }

    const isEventStream = (response.headers.get("content-type") || "").includes("text/event-stream");
    let finalText = "";

    if (isEventStream) {
      finalText = await consumeAssistantStream(response, assistantMessage);
    } else {
      const payload = await response.json();
      finalText = (payload.outputText || "").trim();
      assistantMessage.setText(finalText || "Nao veio resposta desta vez.");
      assistantMessage.finalizeAudio();
    }

    if (finalText) {
      addMessageToConversation("assistant", finalText);
    } else {
      renderConversation();
    }

    setComposerStatus("");
  } catch (error) {
    renderConversation();
    const messageText = error instanceof Error ? error.message : "Erro desconhecido";
    chatAuthStatus.textContent = messageText;
    setComposerStatus(messageText);
  } finally {
    setAssistantThinkingState(false);
    currentController = null;
    stopRequested = false;
    sendButton.disabled = false;
    sendButton.hidden = false;
    stopButton.disabled = true;
    stopButton.hidden = true;
    micButton.disabled = !currentUser;
  }
});

stopButton.addEventListener("click", () => {
  stopRequested = true;
  if (currentController) {
    currentController.abort();
  }
  setAssistantThinkingState(false);
  setComposerStatus("");
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
  syncComposerEmptyState();
  syncComposerLayout();
});

if (chatSearchInput) {
  chatSearchInput.addEventListener("input", () => {
    chatSearchTerm = chatSearchInput.value || "";
    clearPendingSearchHighlight();
    renderHistoryList();
  });
}

if (chatModeButton && chatModeMenu) {
  chatModeButton.addEventListener("click", () => {
    if (chatModeMenu.hidden) {
      openChatModeMenu();
    } else {
      closeChatModeMenu();
    }
  });

  chatModeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const nextMode = option.dataset.chatMode || "fast";

      if (nextMode === "project" && accessState.planId !== "life") {
        window.localStorage.setItem(chatModeStorageKey, "think");
        syncChatModeUi();
        closeChatModeMenu();
        window.location.href = "/planos.html?from=project-mode";
        return;
      }

      window.localStorage.setItem(chatModeStorageKey, nextMode);
      syncChatModeUi();
      closeChatModeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!chatModeButton.contains(target) && !chatModeMenu.contains(target)) {
      closeChatModeMenu();
    }
  });
}

settingsButton?.addEventListener("click", () => {
  openSettingsModal();
});

settingsCloseButton?.addEventListener("click", () => {
  closeSettingsModal();
});

settingsCancelButton?.addEventListener("click", () => {
  closeSettingsModal();
});

settingsModal?.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.settingsClose === "true") {
    closeSettingsModal();
  }
});

settingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveUserChatSettings({
    voice: settingsVoiceSelect.value || defaultOpenAiVoice,
    responseStyle: settingsResponseStyle.value.trim(),
    callName: settingsCallName.value.trim(),
    ministryDream: settingsMinistryDream.value.trim(),
    ministryRole: settingsRoleSelect.value || "Lider"
  });
  settingsStatus.textContent = "Preferencias salvas.";
  window.setTimeout(() => {
    closeSettingsModal();
  }, 300);
});

function setActiveAuthTab(tabId) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    const isActive = button.dataset.authTab === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    const isActive = panel.dataset.authPanel === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveAuthTab(button.dataset.authTab || "login");
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "Entrando...";

  try {
    await runAuthRequest("/api/auth/login", {
      username: loginUsername.value,
      password: loginPassword.value
    });

    authStatus.textContent = "Login feito com sucesso.";
    await loadSessionState();
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro ao entrar.";
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "Criando conta...";

  if (registerPassword.value !== registerPasswordConfirm.value) {
    authStatus.textContent = "As senhas nao conferem.";
    return;
  }

  try {
    await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      username: registerUsername.value,
      password: registerPassword.value
    });

    authStatus.textContent = "Conta criada com sucesso.";
    await loadSessionState();
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro ao cadastrar.";
  }
});

window.addEventListener("beforeunload", () => {
  stopAssistantSpeech();
  clearSpeechRecognitionSilenceTimer();
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch {
      // noop
    }
    speechRecognition = null;
  }
  stopMediaTracks();
});

renderHistoryList();
renderConversation();
syncComposerState();
setComposerStatus("");
syncMicButtonUi();
populateVoiceOptions();
syncChatModeUi();
setActiveAuthTab("login");
syncComposerEmptyState();
syncComposerLayout();
siteConfig = await loadSiteConfig().catch(() => siteConfig);
initContentAdmin({
  user: null,
  getToken,
  config: siteConfig
});
await loadSessionState();
