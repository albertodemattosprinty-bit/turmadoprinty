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

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!next || !next.startsWith("/")) {
    return "/explorar.html";
  }

  return next;
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
    throw new Error(data.error || "Falha na autenticação.");
  }

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

async function loadSessionState() {
  returnLink.href = getNextPath();

  if (!getToken()) {
    authStatus.textContent = "Nenhuma sessão ativa. Faça login para liberar o chat.";
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
      authStatus.textContent = data.error || "Sessão inválida.";
      return;
    }

    authStatus.textContent = `Sessão ativa para @${data.user.username}. Redirecionando...`;
    window.location.href = getNextPath();
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
}

function redirectToNext() {
  window.location.href = getNextPath();
}

function redirectAfterRegister() {
  window.location.href = "/index.html";
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
    redirectAfterRegister();
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
    redirectToNext();
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

meButton.addEventListener("click", async () => {
  authOutput.textContent = "Validando sessão...";

  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
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

await loadSessionState();
