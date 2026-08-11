import { getApiUrl } from "./api.js";
import { getAuthToken, setAuthToken } from "./auth-storage.js";

const authStatus = document.getElementById("auth-status");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerName = document.getElementById("register-name");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginFeedback = document.getElementById("login-feedback");
const registerFeedback = document.getElementById("register-feedback");
const meButton = document.getElementById("me-button");
const returnLink = document.getElementById("return-link");
const validUsernamePattern = /^[\p{L}\p{M}\p{N} ._-]{3,24}$/u;

const friendlyAuthErrors = new Map([
  ["Credenciais invalidas.", "Nome de usuário ou senha incorretos. Confira os dados e tente novamente."],
  ["Esse nome de usuario ja esta em uso.", "Esse nome de usuário já está em uso. Escolha outro para continuar."],
  ["Nome invalido.", "Digite seu nome com pelo menos 2 caracteres."],
  ["A senha precisa ter pelo menos 6 caracteres.", "A senha precisa ter pelo menos 6 caracteres."],
  ["Nome de usuario e senha sao obrigatorios.", "Digite seu nome de usuário e sua senha."]
]);

function getToken() {
  return getAuthToken();
}

function setToken(token) {
  return setAuthToken(token);
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
  let response;

  try {
    response = await fetch(getApiUrl(url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Confira sua internet e tente novamente.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const serverMessage = data.error || "Não foi possível concluir o acesso. Tente novamente.";
    throw new Error(friendlyAuthErrors.get(serverMessage) || serverMessage);
  }

  if (data.token) {
    data.sessionPersisted = setToken(data.token);
  }

  return data;
}

function setActiveAuthTab(tabId) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    const isActive = button.getAttribute("data-auth-tab") === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    const isActive = panel.getAttribute("data-auth-panel") === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  clearFormFeedback(loginFeedback, loginForm);
  clearFormFeedback(registerFeedback, registerForm);
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
    window.location.href = getNextPath();
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
}

function redirectToNext() {
  window.location.href = getNextPath();
}

function redirectAfterRegister() {
  redirectToNext();
}

function showFormFeedback(feedback, message, invalidFields = []) {
  if (feedback) {
    feedback.textContent = message;
    feedback.hidden = false;
  }

  invalidFields.forEach((field) => {
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", feedback.id);
  });

  if (invalidFields[0]) {
    invalidFields[0].focus();
  }
}

function clearFormFeedback(feedback, form) {
  if (feedback) {
    feedback.textContent = "";
    feedback.hidden = true;
  }

  form.querySelectorAll(".is-invalid").forEach((field) => {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  });
}

function validateRegistration() {
  if (registerName.value.trim().length < 2) {
    return { message: "Digite seu nome com pelo menos 2 caracteres.", fields: [registerName] };
  }

  if (!validUsernamePattern.test(registerUsername.value.trim())) {
    return {
      message: "O nome de usuário deve ter de 3 a 24 caracteres. Use apenas letras, números, espaços, ponto, tracinho ou underline.",
      fields: [registerUsername]
    };
  }

  if (registerPassword.value.length < 6) {
    return { message: "A senha precisa ter pelo menos 6 caracteres.", fields: [registerPassword] };
  }

  if (registerPassword.value !== registerPasswordConfirm.value) {
    return { message: "As senhas não coincidem. Digite a mesma senha nos dois campos.", fields: [registerPassword, registerPasswordConfirm] };
  }

  return null;
}

function validateLogin() {
  if (!loginUsername.value.trim()) {
    return { message: "Digite seu nome de usuário.", fields: [loginUsername] };
  }

  if (!validUsernamePattern.test(loginUsername.value.trim())) {
    return {
      message: "Confira o nome de usuário. Use de 3 a 24 caracteres: letras, números, espaços, ponto, tracinho ou underline.",
      fields: [loginUsername]
    };
  }

  if (!loginPassword.value) {
    return { message: "Digite sua senha.", fields: [loginPassword] };
  }

  return null;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormFeedback(registerFeedback, registerForm);

  const validationError = validateRegistration();
  if (validationError) {
    showFormFeedback(registerFeedback, validationError.message, validationError.fields);
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      username: registerUsername.value,
      password: registerPassword.value
    });

    if (data.token && data.sessionPersisted === false) {
      showFormFeedback(registerFeedback, "Sua conta foi criada, mas este navegador bloqueou a sessão. Abra turmadoprinty.com.br diretamente em uma nova aba e entre com os dados cadastrados.");
      return;
    }

    redirectAfterRegister();
  } catch (error) {
    showFormFeedback(
      registerFeedback,
      error instanceof Error ? error.message : "Não foi possível criar a conta. Tente novamente.",
      error instanceof Error && error.message.includes("nome de usuário já está em uso") ? [registerUsername] : []
    );
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormFeedback(loginFeedback, loginForm);

  const validationError = validateLogin();
  if (validationError) {
    showFormFeedback(loginFeedback, validationError.message, validationError.fields);
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/login", {
      username: loginUsername.value,
      password: loginPassword.value
    });

    if (data.token && data.sessionPersisted === false) {
      showFormFeedback(loginFeedback, "Seus dados estão corretos, mas este navegador bloqueou a sessão. Abra turmadoprinty.com.br diretamente em uma nova aba e entre novamente.");
      return;
    }

    redirectToNext();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.";
    const invalidFields = message.startsWith("Nome de usuário ou senha incorretos")
      ? [loginUsername, loginPassword]
      : [];
    showFormFeedback(loginFeedback, message, invalidFields);
  }
});

[registerName, registerUsername, registerPassword, registerPasswordConfirm].forEach((field) => {
  field.addEventListener("input", () => clearFormFeedback(registerFeedback, registerForm));
});

[loginUsername, loginPassword].forEach((field) => {
  field.addEventListener("input", () => clearFormFeedback(loginFeedback, loginForm));
});

meButton?.addEventListener("click", async () => {
  try {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json();
    authStatus.textContent = response.ok
      ? `Sessao ativa para @${data.user.username}.`
      : data.error || "Sessao invalida.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveAuthTab(button.getAttribute("data-auth-tab") || "login");
  });
});

setActiveAuthTab("login");
await loadSessionState();
