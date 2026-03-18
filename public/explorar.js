const sessionStorageKey = "turma_do_printy_token";
const conversationStorageKey = "turma_do_printy_chat_conversations";
const legacyHistoryStorageKey = "turma_do_printy_chat_history";

const authStatus = document.getElementById("auth-status");
const chatAuthStatus = document.getElementById("chat-auth-status");
const exploreAuthShell = document.getElementById("explore-auth-shell");
const exploreChatLayout = document.getElementById("explore-chat-layout");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat-button");
const logoutButton = document.getElementById("logout-button");
const chatHint = document.getElementById("chat-hint");
const chatShell = document.getElementById("chat-shell");
const chatThread = document.getElementById("chat-thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");
const micButton = document.getElementById("mic-button");
const composerStatus = document.getElementById("composer-status");
const conversationTitle = document.getElementById("conversation-title");
const conversationMeta = document.getElementById("conversation-meta");
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
    historyList.innerHTML = "";
    return;
  }

  if (!conversations.length) {
    historyList.innerHTML = `
      <div class="history-empty">
        <strong>Nenhuma conversa ainda.</strong>
        <p>Clique em "Nova conversa" para abrir seu primeiro chat.</p>
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
    conversationMeta.textContent = "Pronta para começar.";
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

function setRecordingState(recording) {
  isRecording = recording;
  micButton.classList.toggle("recording", recording);
  micButton.setAttribute("aria-label", recording ? "Parar gravação" : "Gravar mensagem de voz");
  micButton.title = recording ? "Parar gravação" : "Gravar mensagem de voz";
}

function syncComposerState() {
  const isLoggedIn = Boolean(currentUser);
  exploreAuthShell.hidden = isLoggedIn;
  exploreChatLayout.hidden = !isLoggedIn;
  logoutButton.hidden = !isLoggedIn;
  newChatButton.hidden = !isLoggedIn;
  chatShell.hidden = !isLoggedIn;
  micButton.disabled = !isLoggedIn;
  sendButton.disabled = !isLoggedIn;
  chatInput.disabled = !isLoggedIn;
  chatInput.placeholder = "Digite sua mensagem aqui...";
  chatHint.textContent = isLoggedIn ? `Histórico ativo para @${currentUser.username}.` : "";
}

async function loadSessionState() {
  if (!getToken()) {
    currentUser = null;
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
    migrateLegacyHistory();
    authStatus.textContent = `Logado como @${data.user.username}`;
    chatAuthStatus.textContent = `Logado como @${data.user.username}`;
    const conversations = getConversations();
    activeConversationId = activeConversationId || conversations[0]?.id || null;
    syncComposerState();
    renderHistoryList();
    renderConversation();
  } catch (error) {
    currentUser = null;
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

function createAssistantMessageElement(initialText = "Preparando resposta...") {
  const article = document.createElement("article");
  article.className = "message-card assistant";
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
    setText(nextText) {
      this.text = nextText;
      this.target.textContent = nextText;
      chatThread.scrollTop = chatThread.scrollHeight;
    },
    appendText(extraText) {
      if (!extraText) {
        return;
      }

      const nextText = this.text === "Preparando resposta..." ? extraText : `${this.text}${extraText}`;
      this.setText(nextText);
    }
  };
}

async function consumeAssistantStream(response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const assistantMessage = createAssistantMessageElement();
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
          assistantMessage.setText(event.message || "Preparando resposta...");
          continue;
        }

        if (event.type === "delta" && event.text) {
          assistantMessage.appendText(event.text);
          finalText = assistantMessage.text;
          continue;
        }

        if (event.type === "done") {
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
  micButton.disabled = true;
  stopRequested = false;
  currentController = new AbortController();
  setComposerStatus("Gerando resposta...");

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
        stream: true
      }),
      signal: currentController.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao consultar a IA.");
    }

    const isEventStream = (response.headers.get("content-type") || "").includes("text/event-stream");
    const finalText = isEventStream
      ? await consumeAssistantStream(response)
      : renderAssistantResponseImmediately((await response.json()).outputText || "");

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
    stopButton.disabled = true;
    micButton.disabled = !currentUser;
  }
});

stopButton.addEventListener("click", () => {
  stopRequested = true;
  if (currentController) {
    currentController.abort();
  }
  setComposerStatus("Resposta interrompida.");
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
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
  stopMediaTracks();
});

renderHistoryList();
renderConversation();
syncComposerState();
setComposerStatus("");
setActiveAuthTab("login");
await loadSessionState();
