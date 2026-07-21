const tokenKey = "turma_do_printy_token";
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const registerNameInput = document.getElementById("registerNameInput");
const registerUsernameInput = document.getElementById("registerUsernameInput");
const registerPasswordInput = document.getElementById("registerPasswordInput");
const registerPasswordConfirmInput = document.getElementById("registerPasswordConfirmInput");
const messageEl = document.getElementById("loginMessage");
const tabButtons = Array.from(document.querySelectorAll("[data-login-tab]"));
const tabPanels = Array.from(document.querySelectorAll("[data-login-panel]"));

function setLoginMessage(message) {
  if (messageEl) {
    messageEl.textContent = message;
  }
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
    document.cookie = `${tokenKey}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
    return;
  }
  window.localStorage.removeItem(tokenKey);
  document.cookie = `${tokenKey}=; path=/; max-age=0; SameSite=Lax`;
}

function setLoginTab(tab) {
  const nextTab = String(tab || "login").trim().toLowerCase() === "register" ? "register" : "login";
  tabButtons.forEach((button) => {
    const active = button.dataset.loginTab === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  tabPanels.forEach((panel) => {
    const active = panel.dataset.loginPanel === nextTab;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

async function runJsonRequest(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Falha na requisicao.");
  }
  return data;
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = String(usernameInput?.value || "").trim();
  const password = String(passwordInput?.value || "");
  if (!username || !password) {
    setLoginMessage("Preencha usuário e senha.");
    return;
  }
  setLoginMessage("Entrando...");
  try {
    const data = await runJsonRequest("/api/auth/login", { username, password });
    if (!data?.token) {
      throw new Error("Falha no login.");
    }
    setToken(String(data.token));
    setLoginMessage("Acesso liberado.");
    window.location.href = "/200";
  } catch (error) {
    setLoginMessage(error instanceof Error ? error.message : "Falha no login.");
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = String(registerNameInput?.value || "").trim();
  const username = String(registerUsernameInput?.value || "").trim();
  const password = String(registerPasswordInput?.value || "");
  const confirmPassword = String(registerPasswordConfirmInput?.value || "");
  if (!name || !username || !password || !confirmPassword) {
    setLoginMessage("Preencha todos os campos do cadastro.");
    return;
  }
  if (password !== confirmPassword) {
    setLoginMessage("As senhas nao conferem.");
    return;
  }
  setLoginMessage("Criando conta...");
  try {
    await runJsonRequest("/api/auth/register", { name, username, password, app: "project200" });
    const data = await runJsonRequest("/api/auth/login", { username, password });
    if (!data?.token) {
      throw new Error("Conta criada, mas o login automatico falhou.");
    }
    setToken(String(data.token));
    setLoginMessage("Conta criada e acesso liberado.");
    window.location.href = "/200";
  } catch (error) {
    setLoginMessage(error instanceof Error ? error.message : "Falha no cadastro.");
  }
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLoginMessage("");
    setLoginTab(button.dataset.loginTab || "login");
  });
});

setLoginTab("login");
