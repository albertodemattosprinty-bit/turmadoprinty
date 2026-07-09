import { getApiUrl } from "./api.js";

const sessionStorageKey = "turma_do_printy_token";

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
const returnLink = document.getElementById("return-link");

function isNativeCapacitorApp() {
  const capacitor = window.Capacitor;
  if (!capacitor) {
    return false;
  }
  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }
  const platform = typeof capacitor.getPlatform === "function" ? capacitor.getPlatform() : "";
  return platform === "android" || platform === "ios";
}

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

function normalizeNextPath(next) {
  const raw = String(next || "").trim();
  if (!raw || !raw.startsWith("/")) {
    return "/200/index.html";
  }
  if (raw === "/200" || raw === "/200/") {
    return "/200/index.html";
  }
  return raw;
}

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  return normalizeNextPath(params.get("next"));
}

async function runAuthRequest(url, payload) {
  const response = await fetch(getApiUrl(url), {
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

function setActiveLogTab(tabId) {
  document.querySelectorAll("[data-log-tab]").forEach((button) => {
    const isActive = button.getAttribute("data-log-tab") === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-log-panel]").forEach((panel) => {
    const isActive = panel.getAttribute("data-log-panel") === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function setAuthOutput(message) {
  if (!authOutput) {
    return;
  }
  authOutput.hidden = !message;
  authOutput.textContent = message;
}

async function loadSessionState() {
  returnLink.href = getNextPath();

  if (!getToken()) {
    authStatus.textContent = "Entre ou cadastre sua conta para continuar.";
    return;
  }

  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      setToken("");
      authStatus.textContent = data.error || "Sessao invalida.";
      return;
    }

    authStatus.textContent = `Sessao ativa para @${data.user.username}. Redirecionando...`;
    window.location.replace(getNextPath());
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
}

function redirectToNext() {
  window.location.replace(getNextPath());
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthOutput("Criando conta...");

  if (registerPassword.value !== registerPasswordConfirm.value) {
    setAuthOutput("As senhas nao conferem.");
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      username: registerUsername.value,
      password: registerPassword.value
    });

    setAuthOutput(JSON.stringify(data, null, 2));
    redirectToNext();
  } catch (error) {
    setAuthOutput(error instanceof Error ? error.message : "Erro desconhecido");
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthOutput("Entrando...");

  try {
    const data = await runAuthRequest("/api/auth/login", {
      username: loginUsername.value,
      password: loginPassword.value
    });

    setAuthOutput(JSON.stringify(data, null, 2));
    redirectToNext();
  } catch (error) {
    setAuthOutput(error instanceof Error ? error.message : "Erro desconhecido");
  }
});

meButton?.addEventListener("click", async () => {
  setAuthOutput("Validando sessao...");

  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json();
    setAuthOutput(JSON.stringify(data, null, 2));
  } catch (error) {
    setAuthOutput(error instanceof Error ? error.message : "Erro desconhecido");
  }
});

document.querySelectorAll("[data-log-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveLogTab(button.getAttribute("data-log-tab") || "login");
  });
});

setActiveLogTab("login");
await loadSessionState();
