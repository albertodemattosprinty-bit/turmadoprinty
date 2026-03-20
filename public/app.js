import { getApiUrl } from "./api.js";

const healthDot = document.getElementById("health-dot");
const healthLabel = document.getElementById("health-label");
const healthCopy = document.getElementById("health-copy");
const envPills = document.getElementById("env-pills");
const albumGrid = document.getElementById("album-grid");
const albumCount = document.getElementById("album-count");
const scheduleGrid = document.getElementById("schedule-grid");
const gptForm = document.getElementById("gpt-form");
const gptMessage = document.getElementById("gpt-message");
const gptSystem = document.getElementById("gpt-system");
const gptOutput = document.getElementById("gpt-output");
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

const sessionStorageKey = "turma_do_printy_token";
const weekendSchedule = [
  {
    day: "Sabado",
    city: "Goiania, GO",
    place: "Igreja Batista da Esperanca",
    time: "16h00",
    title: "Tarde infantil com louvor, teatro e participacao das familias"
  },
  {
    day: "Sabado",
    city: "Brasilia, DF",
    place: "Assembleia de Deus Vida Plena",
    time: "19h30",
    title: "Noite especial para criancas no congresso da igreja"
  },
  {
    day: "Domingo",
    city: "Uberlandia, MG",
    place: "Igreja Presbiteriana do Caminho",
    time: "09h30",
    title: "Manha de celebracao com musica, ensino e acolhimento"
  },
  {
    day: "Domingo",
    city: "Campinas, SP",
    place: "Comunidade Crista Fonte de Vida",
    time: "18h00",
    title: "Culto infantil com repertorio tematico e interacao com a igreja"
  }
];

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

function renderAlbums(items) {
  albumGrid.innerHTML = "";
  albumCount.textContent = `${items.length} albuns disponiveis`;

  items.forEach((album) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img src="${album.coverUrl}" alt="Capa do album ${album.name}" class="album-cover">
      <div class="album-body">
        <h3>${album.name}</h3>
        <p>${album.tracks > 0 ? `${album.tracks} MP3 disponiveis` : "Album sem MP3 cadastrado"}</p>
      </div>
    `;
    albumGrid.appendChild(card);
  });
}

function renderSchedule() {
  scheduleGrid.innerHTML = "";

  weekendSchedule.forEach((item) => {
    const card = document.createElement("article");
    card.className = "schedule-card";
    card.innerHTML = `
      <p class="schedule-day">${item.day}</p>
      <h3>${item.title}</h3>
      <p>${item.place}</p>
      <p>${item.city}</p>
      <strong>${item.time}</strong>
    `;
    scheduleGrid.appendChild(card);
  });
}

async function loadHealth() {
  try {
    const response = await fetch(getApiUrl("/api/health"));
    const data = await response.json();

    setHealthState(Boolean(data.ok));
    healthLabel.textContent = data.ok ? "Plataforma online" : "Falha na plataforma";
    healthCopy.textContent = `Modelo padrao: ${data.env.model} | Conteudo em: ${data.env.contentBaseUrl}`;

    renderPills([
      data.env.hasOpenAiKey ? "GPT ativo" : "GPT pendente",
      data.env.hasDatabaseUrl ? "Acesso ativo" : "Acesso pendente",
      `Modelo ${data.env.model}`
    ]);

    authStatus.textContent = data.env.hasDatabaseUrl
      ? "Cadastro por nome de usuario e senha liberado"
      : "Configure DATABASE_URL para liberar o acesso";
  } catch (error) {
    setHealthState(false);
    healthLabel.textContent = "Falha ao conectar";
    healthCopy.textContent = error instanceof Error ? error.message : "Erro desconhecido";
    renderPills(["Servidor indisponivel"]);
    authStatus.textContent = "Servidor indisponivel";
  }
}

async function loadAlbums() {
  const response = await fetch(getApiUrl("/api/albums"));
  const data = await response.json();
  renderAlbums(data.items);
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

gptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  gptOutput.textContent = "Consultando o assistente...";

  try {
    const response = await fetch(getApiUrl("/api/gpt/ask"), {
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
  authOutput.textContent = "Criando conta...";

  if (registerPassword.value !== registerPasswordConfirm.value) {
    authOutput.textContent = "As senhas nao conferem.";
    return;
  }

  try {
    const data = await runAuthRequest("/api/auth/register", {
      name: registerName.value,
      username: registerUsername.value,
      password: registerPassword.value
    });

    authOutput.textContent = JSON.stringify(data, null, 2);
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
  } catch (error) {
    authOutput.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
});

meButton.addEventListener("click", async () => {
  authOutput.textContent = "Validando sessao...";

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

renderSchedule();
await Promise.all([loadHealth(), loadAlbums()]);
