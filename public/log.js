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
const authOutput = document.getElementById("auth-output");
const returnLink = document.getElementById("return-link");
const securityDialog = document.getElementById("security-dialog");

function isNativeCapacitorApp() {
  const capacitor = window.Capacitor;
  if (capacitor) {
    if (typeof capacitor.isNativePlatform === "function") return capacitor.isNativePlatform();
    const platform = typeof capacitor.getPlatform === "function" ? capacitor.getPlatform() : "";
    if (platform === "android" || platform === "ios") return true;
  }
  return window.location.protocol === "file:";
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
  if (!raw || !raw.startsWith("/")) return isNativeCapacitorApp() ? "/200/index.html" : "/200";
  if (raw === "/200" || raw === "/200/") return isNativeCapacitorApp() ? "/200/index.html" : "/200";
  return raw;
}

function getNextPath() {
  return normalizeNextPath(new URLSearchParams(window.location.search).get("next"));
}

function getAuthApp() {
  return getNextPath().startsWith("/200") ? "project200" : "";
}

async function runAuthRequest(url, payload) {
  const response = await fetch(getApiUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na autenticação.");
  if (data.token) setToken(data.token);
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
  setAuthOutput("");
}

function setAuthOutput(message, tone = "error") {
  if (!authOutput) return;
  authOutput.hidden = !message;
  authOutput.textContent = message;
  authOutput.dataset.tone = tone;
}

function setFormBusy(form, busy) {
  if (!form) return;
  form.querySelectorAll("input, button").forEach((element) => {
    element.disabled = Boolean(busy);
  });
  form.setAttribute("aria-busy", String(Boolean(busy)));
}

async function loadSessionState() {
  if (returnLink) {
    returnLink.href = "/";
    returnLink.hidden = isNativeCapacitorApp();
  }
  if (!getToken()) {
    if (authStatus) authStatus.textContent = "Entre ou crie sua conta para continuar.";
    return;
  }
  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToken("");
      if (authStatus) authStatus.textContent = "Sua sessão terminou. Entre novamente para continuar.";
      return;
    }
    if (authStatus) authStatus.textContent = `Bem-vindo de volta, ${data.user?.name || data.user?.username || "você"}.`;
    window.location.replace(getNextPath());
  } catch {
    if (authStatus) authStatus.textContent = "Não foi possível validar sua sessão agora.";
  }
}

function redirectToNext() {
  window.location.replace(getNextPath());
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!registerForm.reportValidity()) return;
  if (registerPassword.value !== registerPasswordConfirm.value) {
    setAuthOutput("As senhas não conferem.");
    registerPasswordConfirm.focus();
    return;
  }
  setFormBusy(registerForm, true);
  setAuthOutput("Criando seu espaço...", "neutral");
  try {
    await runAuthRequest("/api/auth/register", {
      name: registerName.value.trim(),
      username: registerUsername.value.trim(),
      password: registerPassword.value,
      app: getAuthApp()
    });
    setAuthOutput("Conta criada. Preparando seu primeiro acesso...", "success");
    redirectToNext();
  } catch (error) {
    setAuthOutput(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    setFormBusy(registerForm, false);
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  setFormBusy(loginForm, true);
  setAuthOutput("Entrando...", "neutral");
  try {
    await runAuthRequest("/api/auth/login", {
      username: loginUsername.value.trim(),
      password: loginPassword.value,
      app: getAuthApp()
    });
    setAuthOutput("Acesso liberado. Abrindo seu espaço...", "success");
    redirectToNext();
  } catch (error) {
    setAuthOutput(error instanceof Error ? error.message : "Não foi possível entrar.");
    setFormBusy(loginForm, false);
  }
});

document.querySelectorAll("[data-log-tab]").forEach((button) => {
  button.addEventListener("click", () => setActiveLogTab(button.getAttribute("data-log-tab") || "login"));
});

document.querySelector("[data-open-security]")?.addEventListener("click", () => {
  if (!securityDialog) return;
  if (typeof securityDialog.showModal === "function") securityDialog.showModal();
  else securityDialog.setAttribute("open", "");
});

document.querySelectorAll("[data-close-security]").forEach((button) => {
  button.addEventListener("click", () => securityDialog?.close());
});

securityDialog?.addEventListener("click", (event) => {
  if (event.target === securityDialog) securityDialog.close();
});

setActiveLogTab("login");
await loadSessionState();
