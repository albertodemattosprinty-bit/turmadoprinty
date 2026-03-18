import { initContentAdmin } from "./content-admin.js";

const sessionStorageKey = "turma_do_printy_token";
const conversationStorageKey = "turma_do_printy_chat_conversations";
const legacyHistoryStorageKey = "turma_do_printy_chat_history";
const chatModeStorageKey = "turma_do_printy_chat_mode";

const authStatus = document.getElementById("auth-status");
const chatAuthStatus = document.getElementById("chat-auth-status");
const exploreBanner = document.getElementById("explore-banner");
const exploreAuthShell = document.getElementById("explore-auth-shell");
const exploreChatLayout = document.getElementById("explore-chat-layout");
const historyList = document.getElementById("history-list");
const chatSearchInput = document.getElementById("chat-search-input");
const sidebarToggleButton = document.getElementById("sidebar-toggle-button");
const newChatButton = document.getElementById("new-chat-button");
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
const chatModeSelect = document.getElementById("chat-mode-select");
const chatModeIcon = document.getElementById("chat-mode-icon");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const registerName = document.getElementById("register-name");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");

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
let speakingButton = null;
let siteConfig = {
  banners: {},
  textOverrides: {}
};

const chatModes = {
  fast: {
    model: "gpt-4.1-nano",
    instantModel: "gpt-4.1-nano",
    icon: '<svg viewBox="0 0 24 24"><path d="M13 2 5 14h5l-1 8 8-12h-5z"/></svg>'
  },
  think: {
    model: "gpt-4.1-mini",
    instantModel: "gpt-4.1-nano",
    icon: '<svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-4.66 12.22c.4.35.66.84.66 1.37V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-.41c0-.53.26-1.02.66-1.37A7 7 0 0 0 12 3m-2 17h4a2 2 0 0 1-4 0"/></svg>'
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

const conversationTitleMaxLength = 22;
const sidebarMenuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 6.5m0 5.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 12m0 5.5A1.5 1.5 0 0 1 5.5 16h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 4 17.5"/></svg>';

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
  composerStatus.textContent = message;
}

function getChatMode() {
  const stored = window.localStorage.getItem(chatModeStorageKey);
  return chatModes[stored] ? stored : "fast";
}

function syncChatModeUi() {
  const mode = getChatMode();

  if (chatModeSelect) {
    chatModeSelect.value = mode;
  }

  if (chatModeIcon) {
    chatModeIcon.innerHTML = chatModes[mode].icon;
  }
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

function saveConversations(conversations) {
  const store = getConversationStore();
  store[getUserKey()] = conversations;
  setConversationStore(store);
}

function getActiveConversation() {
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
    .replaceAll(">", "&gt;");
}

function stopBrowserSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (speakingButton) {
    speakingButton.classList.remove("playing");
    speakingButton.setAttribute("aria-label", "Ouvir resposta");
    speakingButton.title = "Ouvir resposta";
    speakingButton = null;
  }
}

function pickSpeechVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const ptBrVoices = voices.filter((voice) => /^pt-BR/i.test(voice.lang));
  const maleHint = ptBrVoices.find((voice) => /male|masc|ricardo|antonio|brasil/i.test(`${voice.name} ${voice.voiceURI}`));
  return maleHint || ptBrVoices[0] || voices.find((voice) => /^pt/i.test(voice.lang)) || voices[0] || null;
}

function attachAssistantAudioButton(article, text) {
  if (!article || !text || !("speechSynthesis" in window)) {
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

  button.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (speakingButton === button) {
      stopBrowserSpeech();
      return;
    }

    stopBrowserSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 0.92;
    const voice = pickSpeechVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => stopBrowserSpeech();
    utterance.onerror = () => stopBrowserSpeech();

    speakingButton = button;
    button.classList.add("playing");
    button.setAttribute("aria-label", "Parar audio");
    button.title = "Parar audio";
    window.speechSynthesis.speak(utterance);
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
}

function renderHistoryList() {
  const conversations = getFilteredConversations();
  historyList.innerHTML = "";

  if (!currentUser) {
    historyList.innerHTML = "";
    return;
  }

  if (!conversations.length) {
    historyList.innerHTML = `
      <div class="history-empty">
        <strong>${chatSearchTerm ? "Nenhum chat encontrado." : "Nenhuma conversa ainda."}</strong>
        <p>${chatSearchTerm ? "Tente outro termo para localizar sua conversa." : "Clique em \"Nova conversa\" para abrir seu primeiro chat."}</p>
      </div>
    `;
    return;
  }

  conversations.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${item.id === activeConversationId ? " active" : ""}`;
    button.innerHTML = `
      <span class="history-item-row">
        <strong title="${escapeHtml(item.title)}">${escapeHtml(clampConversationTitle(item.title))}</strong>
        <span class="history-time">${formatRelativeDate(item.updatedAt)}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      activeConversationId = item.id;
      renderConversation();
      renderHistoryList();
    });
    historyList.appendChild(button);
  });
}

function renderConversation() {
  const conversation = getActiveConversation();
  chatThread.innerHTML = "";

  if (!conversation || conversation.messages.length === 0) {
    chatShell.classList.add("conversation-shell-empty");
    chatThread.classList.add("chat-thread-empty");
    if (conversationHeader) {
      conversationHeader.hidden = true;
    }
    conversationTitle.textContent = "";
    conversationMeta.textContent = "";
    chatThread.innerHTML = `
      <section class="empty-conversation-state">
        <h2>${escapeHtml(getEmptyConversationCopy())}</h2>
        <p>Posso ajudar com roteiros, programacoes, legendas, devocionais, cantatas e ideias para o ministerio infantil.</p>
      </section>
    `;
    return;
  }

  chatShell.classList.remove("conversation-shell-empty");
  chatThread.classList.remove("chat-thread-empty");
  if (conversationHeader) {
    conversationHeader.hidden = false;
  }
  conversationTitle.textContent = conversation.title;
  conversationMeta.textContent = `Atualizada em ${formatRelativeDate(conversation.updatedAt)}`;

  conversation.messages.forEach((item) => {
    const article = document.createElement("article");
    article.className = `message-card ${item.role === "user" ? "user" : "assistant"}`;
    article.innerHTML = `
      <div class="message-role">${item.role === "user" ? "Você" : "Assistente"}</div>
      <div class="message-text">${escapeHtml(item.content)}</div>
    `;

    if (item.role === "assistant") {
      attachAssistantAudioButton(article, item.content);
    }

    chatThread.appendChild(article);
  });

  chatThread.scrollTop = chatThread.scrollHeight;
}

function setRecordingState(recording) {
  isRecording = recording;
  micButton.classList.toggle("recording", recording);
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

window.addEventListener("resize", () => {
  const mobileView = window.innerWidth <= 980;
  sidebarCollapsed = mobileView ? sidebarCollapsed : false;
  syncSidebarState();
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
  if (chatSearchInput) {
    chatSearchInput.disabled = !isLoggedIn;
  }
  chatShell.hidden = !isLoggedIn;
  micButton.disabled = !isLoggedIn;
  sendButton.disabled = !isLoggedIn;
  chatInput.disabled = !isLoggedIn;
  chatInput.placeholder = "Digite sua mensagem aqui...";
  syncSidebarState();
}

async function loadSessionState() {
  if (!getToken()) {
    currentUser = null;
    initContentAdmin({
      user: null,
      getToken,
      config: siteConfig
    });
    authStatus.textContent = "Entre ou cadastre sua conta para abrir o chat.";
    chatAuthStatus.textContent = "Sem login ativo.";
    syncComposerState();
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
      authStatus.textContent = data.error || "Sessão inválida.";
      chatAuthStatus.textContent = data.error || "Sessão inválida.";
      syncComposerState();
      renderHistoryList();
      renderConversation();
      return;
    }

    currentUser = data.user;
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
    renderHistoryList();
    renderConversation();
  } catch (error) {
    currentUser = null;
    initContentAdmin({
      user: null,
      getToken,
      config: siteConfig
    });
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    chatAuthStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    syncComposerState();
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
    <div class="message-role">Assistente</div>
    <div class="message-text">${escapeHtml(initialText)}</div>
  `;
  chatThread.appendChild(article);
  chatThread.scrollTop = chatThread.scrollHeight;

  return {
    article,
    target: article.querySelector(".message-text"),
    text: initialText,
    hasPreview: false,
    finalStarted: false,
    setText(nextText) {
      this.text = nextText;
      this.target.textContent = nextText;
      article.hidden = !nextText;
      chatThread.scrollTop = chatThread.scrollHeight;
    },
    appendText(extraText) {
      if (!extraText) {
        return;
      }

      const nextText = this.text === "Preparando resposta..." ? extraText : `${this.text}${extraText}`;
      this.setText(nextText);
    },
    setPreview(previewText) {
      this.hasPreview = Boolean(previewText);
      this.setText(previewText || "");
    },
    startFinalBlock() {
      if (!this.hasPreview || this.finalStarted) {
        return;
      }

      this.finalStarted = true;
      this.setText(`${this.text}\n\n`);
    },
    finalizeAudio() {
      const cleanText = (this.text || "").trim();
      article.querySelector(".assistant-audio-actions")?.remove();
      attachAssistantAudioButton(article, cleanText);
    }
  };
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
          finalText = assistantMessage.text;
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
    <div class="message-role">Assistente</div>
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

async function toggleRecording() {
  if (!ensureLoggedInBeforeChat()) {
    return;
  }

  if (isRecording) {
    await stopRecordingAndTranscribe();
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
    setComposerStatus("Ouvindo...");
  } catch (error) {
    stopMediaTracks();
    setRecordingState(false);
    setComposerStatus(error instanceof Error ? error.message : "Nao foi possivel acessar o microfone.");
  }
}

newChatButton.addEventListener("click", () => {
  if (!currentUser) {
    ensureLoggedInBeforeChat();
    return;
  }

  const freshConversation = createConversation("");
  updateConversation(freshConversation);
  renderHistoryList();
  renderConversation();
  setComposerStatus("");
  chatInput.focus();
});

logoutButton.addEventListener("click", () => {
  setToken("");
  currentUser = null;
  activeConversationId = null;
  authStatus.textContent = "Sessao encerrada.";
  chatAuthStatus.textContent = "Sessao encerrada.";
  authStatus.textContent = "Entre ou crie sua conta para abrir o chat.";
  setComposerStatus("");
  syncComposerState();
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
  const assistantMessage = createAssistantMessageElement("");
  const selectedMode = chatModes[getChatMode()] || chatModes.fast;

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
        model: selectedMode.model,
        instantModel: selectedMode.instantModel
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
  setComposerStatus("");
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
});

if (chatSearchInput) {
  chatSearchInput.addEventListener("input", () => {
    chatSearchTerm = chatSearchInput.value || "";
    renderHistoryList();
  });
}

if (chatModeSelect) {
  chatModeSelect.addEventListener("change", () => {
    window.localStorage.setItem(chatModeStorageKey, chatModeSelect.value);
    syncChatModeUi();
  });
}

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
  stopBrowserSpeech();
  stopMediaTracks();
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    pickSpeechVoice();
  };
}

renderHistoryList();
renderConversation();
syncComposerState();
setComposerStatus("");
syncChatModeUi();
setActiveAuthTab("login");
siteConfig = await loadSiteConfig().catch(() => siteConfig);
initContentAdmin({
  user: null,
  getToken,
  config: siteConfig
});
await loadSessionState();
