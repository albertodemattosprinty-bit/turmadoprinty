import { getApiUrl } from "../api.js";

const tokenKey = "turma_do_printy_token";
const releaseVersion = "0.77";
const defaults = {
  currentVersion: releaseVersion,
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
  forceUpdateButton: document.getElementById("forceUpdateButton"),
  currentInput: document.getElementById("currentVersionInput"),
  minimumInput: document.getElementById("minimumVersionInput"),
  urlInput: document.getElementById("downloadUrlInput"),
  titleInput: document.getElementById("titleInput"),
  messageInput: document.getElementById("messageInput"),
  buttonInput: document.getElementById("buttonLabelInput")
};

function readTokenCookie() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)turma_do_printy_token=([^;]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getToken() {
  const saved = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || "";
  if (saved) return saved;
  const cookieToken = readTokenCookie();
  if (cookieToken) {
    try {
      localStorage.setItem(tokenKey, cookieToken);
    } catch {}
  }
  return cookieToken;
}

function showAdminLoginPrompt(message = "Entre com uma conta ADMIN para editar a versao minima global.") {
  elements.publicStatus.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message + " ";
  const link = document.createElement("a");
  link.href = "/log?next=/201";
  link.textContent = "Entrar como admin";
  elements.publicStatus.append(text, link);
}

function normalizeConfig(config) {
  return { ...defaults, ...(config || {}) };
}

function compareVersions(left, right) {
  const leftParts = String(left || "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length, 1);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function updateForceButton(config) {
  const isRequired = compareVersions(config.minimumVersion, releaseVersion) >= 0;
  elements.forceUpdateButton.disabled = isRequired;
  elements.forceUpdateButton.textContent = isRequired
    ? `Atualizacao ${releaseVersion} obrigatoria`
    : `Exigir atualizacao ${releaseVersion}`;
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
  updateForceButton(config);
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
    showAdminLoginPrompt();
    return;
  }
  try {
    const payload = await requestJson("/api/auth/me?app=project200", { cache: "no-store" });
    if (payload?.user?.isAdmin || String(payload?.user?.role || "").trim().toUpperCase() === "ADMIN") {
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

async function saveConfig(config) {
  return requestJson("/api/admin/201/app-update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
}

elements.forceUpdateButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    `Exigir a versao ${releaseVersion} agora? Usuarios com versoes anteriores nao poderao continuar sem atualizar.`
  );
  if (!confirmed) return;

  void (async () => {
    elements.forceUpdateButton.disabled = true;
    elements.adminStatus.textContent = `Publicando a atualizacao obrigatoria ${releaseVersion}...`;
    try {
      const payload = await saveConfig({
        currentVersion: releaseVersion,
        minimumVersion: releaseVersion,
        downloadUrl: defaults.downloadUrl,
        title: elements.titleInput.value || defaults.title,
        message: elements.messageInput.value || defaults.message,
        buttonLabel: elements.buttonInput.value || defaults.buttonLabel
      });
      renderConfig(payload.config);
      elements.adminStatus.textContent = `Versao ${releaseVersion} exigida para todos os aplicativos.`;
    } catch (error) {
      elements.forceUpdateButton.disabled = false;
      elements.adminStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel ativar a atualizacao.";
    }
  })();
});

elements.adminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    elements.adminStatus.textContent = "Salvando...";
    try {
      const payload = await saveConfig({
        currentVersion: elements.currentInput.value,
        minimumVersion: elements.minimumInput.value,
        downloadUrl: elements.urlInput.value,
        title: elements.titleInput.value,
        message: elements.messageInput.value,
        buttonLabel: elements.buttonInput.value
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
