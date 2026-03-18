const sessionStorageKey = "turma_do_printy_token";
const conversationStorageKey = "turma_do_printy_chat_conversations";
const legacyHistoryStorageKey = "turma_do_printy_chat_history";

const authStatus = document.getElementById("auth-status");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat-button");
const loginLink = document.getElementById("login-link");
const logoutButton = document.getElementById("logout-button");
const chatHint = document.getElementById("chat-hint");
const chatThread = document.getElementById("chat-thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");
const conversationTitle = document.getElementById("conversation-title");
const conversationMeta = document.getElementById("conversation-meta");

let currentController = null;
let stopRequested = false;
let currentUser = null;
let activeConversationId = null;

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

function getConversations() {
  const store = getConversationStore();
  const items = Array.isArray(store[getUserKey()]) ? store[getUserKey()] : [];

  return items
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
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

function formatRelativeDate(value) {
  if (!value) {
    return "agora";
  }

  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return formatter.format(date);
}

function createShortTitle(message) {
  const sanitized = message.replace(/\s+/g, " ").trim();
  if (!sanitized) {
    return "Nova conversa";
  }

  const words = sanitized.split(" ").slice(0, 5).join(" ");
  return words.length > 32 ? `${words.slice(0, 29).trimEnd()}...` : words;
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
  const conversations = getConversations();
  historyList.innerHTML = "";

  if (!currentUser) {
    historyList.innerHTML = `
      <div class="history-empty">
        <strong>Entre para ver seu histórico.</strong>
        <p>Suas conversas ficam organizadas aqui com um nome curto para cada chat.</p>
      </div>
    `;
    return;
  }

  if (!conversations.length) {
    historyList.innerHTML = `
      <div class="history-empty">
        <strong>Nenhuma conversa ainda.</strong>
        <p>Quando você mandar a primeira mensagem, o chat aparece aqui automaticamente.</p>
      </div>
    `;
    return;
  }

  conversations.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${item.id === activeConversationId ? " active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(item.title)}</strong>
      <span>${item.messages.length} mensagens</span>
      <span>${formatRelativeDate(item.updatedAt)}</span>
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
    conversationTitle.textContent = "Nova conversa";
    conversationMeta.textContent = currentUser
      ? "Pronta para começar."
      : "Faça login somente quando quiser iniciar o chat.";
    chatThread.innerHTML = `
      <article class="message-card assistant">
        <div class="message-role">Assistente</div>
        <div class="message-text">Posso ajudar com ideias, roteiros, legendas e materiais para o ministério infantil.</div>
      </article>
    `;
    return;
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
    chatThread.appendChild(article);
  });

  chatThread.scrollTop = chatThread.scrollHeight;
}

function syncComposerState() {
  const isLoggedIn = Boolean(currentUser);
  logoutButton.hidden = !isLoggedIn;
  loginLink.hidden = isLoggedIn;
  chatInput.placeholder = isLoggedIn
    ? "Digite sua mensagem aqui..."
    : "Faça login quando quiser iniciar uma conversa com a IA.";
  chatHint.textContent = isLoggedIn
    ? `Histórico ativo para @${currentUser.username}.`
    : "Você pode navegar livremente. O login só é exigido quando for iniciar uma conversa.";
}

async function loadSessionState() {
  if (!getToken()) {
    currentUser = null;
    authStatus.textContent = "Você está navegando sem login.";
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
      syncComposerState();
      renderHistoryList();
      renderConversation();
      return;
    }

    currentUser = data.user;
    migrateLegacyHistory();
    authStatus.textContent = `Logado como @${data.user.username}`;
    const conversations = getConversations();
    activeConversationId = activeConversationId || conversations[0]?.id || null;
    syncComposerState();
    renderHistoryList();
    renderConversation();
  } catch (error) {
    currentUser = null;
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
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

async function animateAssistantResponse(text) {
  const article = document.createElement("article");
  article.className = "message-card assistant";
  article.innerHTML = `
    <div class="message-role">Assistente</div>
    <div class="message-text"></div>
  `;
  chatThread.appendChild(article);

  const target = article.querySelector(".message-text");
  const words = text.split(/\s+/).filter(Boolean);
  let currentText = "";

  for (const word of words) {
    if (stopRequested) {
      break;
    }

    currentText = currentText ? `${currentText} ${word}` : word;
    target.textContent = currentText;
    chatThread.scrollTop = chatThread.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return currentText;
}

function ensureLoggedInBeforeChat() {
  if (currentUser) {
    return true;
  }

  const next = encodeURIComponent("/explorar.html");
  window.location.href = `/auth.html?next=${next}`;
  return false;
}

newChatButton.addEventListener("click", () => {
  activeConversationId = null;
  renderHistoryList();
  renderConversation();
  chatInput.focus();
});

logoutButton.addEventListener("click", () => {
  setToken("");
  currentUser = null;
  activeConversationId = null;
  authStatus.textContent = "Sessão encerrada.";
  syncComposerState();
  renderHistoryList();
  renderConversation();
});

chatInput.addEventListener("focus", () => {
  if (!currentUser) {
    chatHint.textContent = "Para mandar a primeira mensagem, o acesso acontece na tela isolada de login.";
  }
});

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
  const history = baseConversation.messages.slice(-12);

  addMessageToConversation("user", message);
  chatInput.value = "";
  chatInput.style.height = "auto";
  sendButton.disabled = true;
  stopButton.disabled = false;
  stopRequested = false;
  currentController = new AbortController();

  try {
    const response = await fetch("/api/gpt/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        message,
        history
      }),
      signal: currentController.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha ao consultar a IA.");
    }

    const finalText = await animateAssistantResponse(data.outputText || "");

    if (finalText) {
      addMessageToConversation("assistant", finalText);
    } else {
      renderConversation();
    }
  } catch (error) {
    renderConversation();
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  } finally {
    currentController = null;
    stopRequested = false;
    sendButton.disabled = false;
    stopButton.disabled = true;
  }
});

stopButton.addEventListener("click", () => {
  stopRequested = true;
  if (currentController) {
    currentController.abort();
  }
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
});

renderHistoryList();
renderConversation();
syncComposerState();
await loadSessionState();
