const healthDot = document.getElementById("health-dot");
const healthLabel = document.getElementById("health-label");
const healthCopy = document.getElementById("health-copy");
const envPills = document.getElementById("env-pills");
const roadmapGrid = document.getElementById("roadmap-grid");
const albumGrid = document.getElementById("album-grid");
const albumCount = document.getElementById("album-count");
const gptForm = document.getElementById("gpt-form");
const gptMessage = document.getElementById("gpt-message");
const gptSystem = document.getElementById("gpt-system");
const gptOutput = document.getElementById("gpt-output");
const authStatus = document.getElementById("auth-status");
const registerForm = document.getElementById("register-form");
const verifyForm = document.getElementById("verify-form");
const loginForm = document.getElementById("login-form");
const registerName = document.getElementById("register-name");
const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");
const verifyEmail = document.getElementById("verify-email");
const verifyCode = document.getElementById("verify-code");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const meButton = document.getElementById("me-button");
const authOutput = document.getElementById("auth-output");

const sessionStorageKey = "turma_do_printy_token";

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

function setHealthState(isOnline) {
  healthDot.classList.toggle("online", isOnline);
  healthDot.classList.toggle("offline", !isOnline);
}

function renderPills(items) {
  envPills.innerHTML = "";

  items.forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = item;
    envPills.appendChild(pill);
  });
}

function renderRoadmap(items) {
  roadmapGrid.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "roadmap-card";
    card.innerHTML = `
      <p class="roadmap-status">${item.status}</p>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
    `;
    roadmapGrid.appendChild(card);
  });
}

function renderAlbums(items) {
  albumGrid.innerHTML = "";
  albumCount.textContent = `${items.length} albuns encontrados`;

  items.forEach((album) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img src="${album.coverUrl}" alt="Capa do album ${album.name}" class="album-cover">
      <div class="album-body">
        <h3>${album.name}</h3>
        <p>${album.tracks > 0 ? `${album.tracks} faixas` : "Sem faixas cadastradas"}</p>
      </div>
    `;
    albumGrid.appendChild(card);
  });
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    setHealthState(Boolean(data.ok));
    healthLabel.textContent = data.ok ? "Backend online" : "Backend com problema";
    healthCopy.textContent = `Modelo padrao: ${data.env.model} | Base de conteudo: ${data.env.contentBaseUrl}`;

    renderPills([
      data.env.hasOpenAiKey ? "OPENAI_API_KEY configurada" : "OPENAI_API_KEY pendente",
      data.env.hasDatabaseUrl ? "DATABASE_URL configurada" : "DATABASE_URL pendente",
      `Modelo ${data.env.model}`
    ]);

    authStatus.textContent = data.env.hasDatabaseUrl
      ? "Banco configurado, falta validar conexao e rodar o SQL"
      : "Cole a DATABASE_URL no .env para liberar login";
  } catch (error) {
    setHealthState(false);
    healthLabel.textContent = "Falha ao conectar";
    healthCopy.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    renderPills(["Servidor indisponivel"]);
  }
}

async function loadRoadmap() {
  const response = await fetch("/api/roadmap");
  const data = await response.json();
  renderRoadmap(data.items);
}

async function loadAlbums() {
  const response = await fetch("/api/albums");
  const data = await response.json();
  renderAlbums(data.items);
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

gptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  gptOutput.textContent = "Consultando backend...";

  try {
    const response = await fetch("/api/gpt/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: gptMessage.value,
        system: gptSystem.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      gptOutput.textContent = JSON.stringify(data, null, 2);
      return;
    }

    gptOutput.textContent = data.outputText || JSON.stringify(data.raw, null, 2);
  } catch (error) {
    gptOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authOutput.textContent = "Gerando codigo...";

  if (registerPassword.value !== registerPasswordConfirm.value) {
    authOutput.textContent = "As senhas nao conferem.";
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      email: registerEmail.value,
      password: registerPassword.value
    });

    verifyEmail.value = registerEmail.value;
    authOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authOutput.textContent = "Confirmando codigo...";

  try {
    const data = await runAuthRequest("/api/auth/verify-code", {
      email: verifyEmail.value,
      code: verifyCode.value
    });

    authOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authOutput.textContent = "Fazendo login...";

  try {
    const data = await runAuthRequest("/api/auth/login", {
      email: loginEmail.value,
      password: loginPassword.value
    });

    authOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

meButton.addEventListener("click", async () => {
  authOutput.textContent = "Validando sessao...";

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

await Promise.all([loadHealth(), loadRoadmap(), loadAlbums()]);
