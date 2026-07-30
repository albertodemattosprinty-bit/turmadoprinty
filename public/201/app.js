import { getApiUrl } from "../api.js";

const tokenKey = "turma_do_printy_token";
const defaults = {
  currentVersion: "0.71",
  minimumVersion: "0.71",
  downloadUrl: "https://pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev/project200/app/latest/iLife-Mindset-debug.apk",
  title: "Atualizacao do iLife disponivel",
  message: "Para continuar usando o iLife MindsetPlan com seguranca, baixe a versao mais recente do aplicativo.",
  buttonLabel: "Baixar APK atualizado"
};

const elements = {
  title: document.getElementById("updateTitle"),
  message: document.getElementById("updateMessage"),
  minimum: document.getElementById("minimumVersionLabel"),
  download: document.getElementById("downloadButton"),
  publicStatus: document.getElementById("publicStatus"),
  page: document.querySelector(".update-page"),
  adminPanel: document.getElementById("adminPanel"),
  adminForm: document.getElementById("adminForm"),
  adminStatus: document.getElementById("adminStatus"),
  currentInput: document.getElementById("currentVersionInput"),
  minimumInput: document.getElementById("minimumVersionInput"),
  urlInput: document.getElementById("downloadUrlInput"),
  titleInput: document.getElementById("titleInput"),
  messageInput: document.getElementById("messageInput"),
  buttonInput: document.getElementById("buttonLabelInput")
};

function getToken() {
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || "";
}

function normalizeConfig(config) {
  return { ...defaults, ...(config || {}) };
}

function renderConfig(rawConfig) {
  const config = normalizeConfig(rawConfig);
  elements.title.textContent = config.title;
  elements.message.textContent = config.message;
  elements.minimum.textContent = config.minimumVersion;
  elements.download.textContent = config.buttonLabel;
  const url = new URL(config.downloadUrl);
  url.searchParams.set("download", "1");
  url.searchParams.set("v", config.currentVersion || config.minimumVersion || "0.7");
  url.searchParams.set("t", String(Date.now()));
  elements.download.href = url.toString();
  elements.download.download = `iLife-Mindset-v${config.currentVersion || "0.7"}-debug.apk`;

  elements.currentInput.value = config.currentVersion;
  elements.minimumInput.value = config.minimumVersion;
  elements.urlInput.value = config.downloadUrl;
  elements.titleInput.value = config.title;
  elements.messageInput.value = config.message;
  elements.buttonInput.value = config.buttonLabel;
}

async function requestJson(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(getApiUrl(path), { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Falha na requisicao.");
  return payload;
}

async function loadConfig() {
  try {
    const payload = await requestJson("/api/201/app-update", { cache: "no-store" });
    renderConfig(payload.config);
    elements.publicStatus.textContent = "";
  } catch (error) {
    renderConfig(defaults);
    elements.publicStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel carregar a configuracao.";
  }
}

async function revealAdminIfAllowed() {
  if (!getToken()) {
    elements.publicStatus.textContent = "Entre com uma conta ADMIN para editar a versao minima global.";
    return;
  }
  try {
    const payload = await requestJson("/api/auth/me?app=project200", { cache: "no-store" });
    if (String(payload?.user?.role || "").trim().toUpperCase() === "ADMIN") {
      document.body.classList.add("admin-mode");
      elements.adminPanel.hidden = false;
      elements.adminPanel.setAttribute("aria-hidden", "false");
      elements.adminStatus.textContent = "Campos ativos para salvar a versao minima global no Postgres.";
      elements.minimumInput.focus({ preventScroll: true });
      return;
    }
    elements.publicStatus.textContent = "Sua conta nao tem permissao de ADMIN para editar esta pagina.";
  } catch (error) {
    elements.adminPanel.hidden = true;
    elements.publicStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel confirmar sua sessao admin.";
  }
}

elements.adminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    elements.adminStatus.textContent = "Salvando...";
    try {
      const payload = await requestJson("/api/admin/201/app-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentVersion: elements.currentInput.value,
          minimumVersion: elements.minimumInput.value,
          downloadUrl: elements.urlInput.value,
          title: elements.titleInput.value,
          message: elements.messageInput.value,
          buttonLabel: elements.buttonInput.value
        })
      });
      renderConfig(payload.config);
      elements.adminStatus.textContent = "Salvo no Postgres.";
    } catch (error) {
      elements.adminStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel salvar.";
    }
  })();
});

await loadConfig();
await revealAdminIfAllowed();
