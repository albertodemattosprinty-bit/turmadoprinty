const sessionStorageKey = "turma_do_printy_token";
const historyStorageKey = "turma_do_printy_chat_history";

const authStatus = document.getElementById("auth-status");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerName = document.getElementById("register-name");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const meButton = document.getElementById("me-button");
const authOutput = document.getElementById("auth-output");
const chatThread = document.getElementById("chat-thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");

let currentController = null;
let stopRequested = false;

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(sessionStorageKey, token);
  } else {
    window.localStorage.removeItem(sessionStorageKey);
  }
}

function getHistory() {
  try {
    return JSON.parse(window.localStorage.getItem(historyStorageKey) || "[]");
  } catch {
    return [];
  }
}

function setHistory(history) {
  window.localStorage.setItem(historyStorageKey, JSON.stringify(history));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderHistory() {
  const history = getHistory();
  chatThread.innerHTML = "";

  if (history.length === 0) {
    chatThread.innerHTML = `
      <article class="message-card assistant">
        <div class="message-role">Assistente</div>
        <div class="message-text">Como posso ajudar hoje?</div>
      </article>
    `;
    return;
  }

  history.forEach((item) => {
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

function appendHistory(role, content) {
  const history = getHistory();
  history.push({ role, content });
  setHistory(history);
  renderHistory();
}

function setComposerEnabled(enabled) {
  chatInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

async function loadSessionState() {
  if (!getToken()) {
    authStatus.textContent = "Faça login para liberar o chat.";
    setComposerEnabled(false);
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
      authStatus.textContent = data.error || "Sessão inválida.";
      setComposerEnabled(false);
      return;
    }

    authStatus.textContent = `Logado como @${data.user.username}`;
    setComposerEnabled(true);
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    setComposerEnabled(false);
  }
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
    throw new Error(data.error || "Falha na autenticação.");
  }

  if (data.token) {
    setToken(data.token);
  }

  return data;
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
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return currentText;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authOutput.textContent = "Criando conta...";

  if (registerPassword.value !== registerPasswordConfirm.value) {
    authOutput.textContent = "As senhas não conferem.";
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      username: registerUsername.value,
      password: registerPassword.value
    });

    authOutput.textContent = JSON.stringify(data, null, 2);
    await loadSessionState();
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authOutput.textContent = "Entrando...";

  try {
    const data = await runAuthRequest("/api/auth/login", {
      username: loginUsername.value,
      password: loginPassword.value
    });

    authOutput.textContent = JSON.stringify(data, null, 2);
    await loadSessionState();
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

meButton.addEventListener("click", async () => {
  authOutput.textContent = "Validando sessão...";

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json();
    authOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message || !getToken()) {
    return;
  }

  appendHistory("user", message);
  chatInput.value = "";
  chatInput.style.height = "auto";
  sendButton.disabled = true;
  stopButton.disabled = false;
  stopRequested = false;
  currentController = new AbortController();

  try {
    const history = getHistory().slice(-12);
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
      appendHistory("assistant", finalText);
    } else {
      renderHistory();
    }
  } catch (error) {
    renderHistory();
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
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

renderHistory();
await loadSessionState();
