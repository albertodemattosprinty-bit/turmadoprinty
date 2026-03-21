import { getToken, initSiteHeader, loadCurrentUser } from "./header.js";
import { getApiUrl } from "./api.js";

const usersStatus = document.getElementById("users-status");
const usersTableBody = document.getElementById("users-table-body");
const userDetailPanel = document.getElementById("user-detail-panel");
const userDetailTitle = document.getElementById("user-detail-title");
const userDetailSubtitle = document.getElementById("user-detail-subtitle");
const userPlanSelect = document.getElementById("user-plan-select");
const userContractorSelect = document.getElementById("user-contractor-select");
const userEventLabel = document.getElementById("user-event-label");
const userEventSelect = document.getElementById("user-event-select");
const userSaveButton = document.getElementById("user-save-button");
const userDeleteButton = document.getElementById("user-delete-button");
const userDetailStatus = document.getElementById("user-detail-status");
const userMessagePanel = document.getElementById("user-message-panel");
const userMessagePreview = document.getElementById("user-message-preview");
const userMessagePreviewTitle = document.getElementById("user-message-preview-title");
const userMessagePreviewBody = document.getElementById("user-message-preview-body");
const userMessageTitle = document.getElementById("user-message-title");
const userMessageBody = document.getElementById("user-message-body");
const userMessageCounter = document.getElementById("user-message-counter");
const userMessageSendButton = document.getElementById("user-message-send-button");

let users = [];
let plans = [];
let schedule = [];
let selectedUserId = "";
let messageComposerUserId = "";
const viewedActiveMessageIds = new Set();

function redirectToAuth() {
  window.location.href = `/auth.html?next=${encodeURIComponent("/users.html")}`;
}

function formatTextTokens(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
}

function formatNarrationDuration(totalSeconds) {
  const safeSeconds = Math.round(Number(totalSeconds) || 0);

  if (safeSeconds < 60) {
    return `${safeSeconds} segundos`;
  }

  if (safeSeconds < 3600) {
    return `${Math.round(safeSeconds / 60)} minutos`;
  }

  return `${(safeSeconds / 3600).toFixed(1).replace(".", ",")} horas`;
}

function getSelectedUser() {
  return users.find((item) => item.id === selectedUserId) || null;
}

function updateMessageCounter() {
  const total = String(userMessageBody.value || "").length;
  userMessageCounter.textContent = `${total}/500`;
}

function resetMessageComposer() {
  userMessageTitle.value = "";
  userMessageBody.value = "";
  updateMessageCounter();
}

function openMessageComposer(userId) {
  selectedUserId = userId;
  messageComposerUserId = userId;
  const user = getSelectedUser();

  if (user?.activeMessage?.id) {
    viewedActiveMessageIds.add(user.activeMessage.id);
  }

  renderUsersTable();
  renderDetailPanel();
  userMessageTitle.focus();
}

function syncContractorEventVisibility() {
  userEventLabel.hidden = userContractorSelect.value !== "true";
}

function renderDetailPanel() {
  const user = getSelectedUser();

  if (!user) {
    userDetailPanel.hidden = true;
    return;
  }

  userDetailPanel.hidden = false;
  userDetailTitle.textContent = user.name || user.username || "Usuario";
  userDetailSubtitle.textContent = user.username ? `@${user.username}` : "Sem username";
  userPlanSelect.value = user.assignedPlanId || "gratis";
  userContractorSelect.value = user.isContractor ? "true" : "false";
  userEventSelect.value = user.contractorEventId || "";
  userDetailStatus.textContent = "";
  userMessagePanel.hidden = messageComposerUserId !== user.id;
  if (userMessagePreview && userMessagePreviewTitle && userMessagePreviewBody) {
    const activeMessage = user.activeMessage || null;
    userMessagePreview.hidden = !activeMessage;
    userMessagePreviewTitle.textContent = activeMessage?.title || "";
    userMessagePreviewBody.textContent = activeMessage?.body || "";
  }
  syncContractorEventVisibility();
}

function renderUsersTable() {
  usersTableBody.innerHTML = "";

  if (!users.length) {
    usersTableBody.innerHTML = "<p class=\"section-muted\">Nenhum usuario encontrado.</p>";
    return;
  }

  users.forEach((user) => {
    const hasUnseenActiveMessage = Boolean(
      user.hasActiveMessage &&
      user.activeMessage?.id &&
      !viewedActiveMessageIds.has(user.activeMessage.id)
    );

    const row = document.createElement("article");
    row.className = `users-table-row users-table-card ${user.isOnline ? "is-online" : "is-offline"}${user.id === selectedUserId ? " is-selected" : ""}`;
    row.innerHTML = `
      <div class="users-table-user">
        <button class="users-table-select" type="button">
          <span class="users-table-user-copy">
            <strong class="users-table-user-name">
              <span>${user.name || user.username || "Usuario"}</span>
              ${hasUnseenActiveMessage ? '<span class="users-message-dot" aria-hidden="true"></span>' : ""}
            </strong>
            <small>${user.username ? `@${user.username}` : ""}</small>
          </span>
        </button>
        <button class="users-message-button" type="button" aria-label="Abrir mensagem de ${user.name || user.username || "usuario"}" title="Abrir mensagem">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9.41l-3.7 3.58A1 1 0 0 1 4 17.86V15.5A2.5 2.5 0 0 1 1.5 13v-7A2.5 2.5 0 0 1 4 3.5Zm2.5-.5a.5.5 0 0 0-.5.5v7c0 .28.22.5.5.5h3.31c.26 0 .51.1.7.29L12 14.82V13.5a1 1 0 0 1 1-1h4.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/></svg>
        </button>
      </div>
      <span>${formatTextTokens(user.textTokensTotal)}</span>
      <span>${formatNarrationDuration(user.narrationSecondsTotal)}</span>
    `;

    row.querySelector(".users-table-select")?.addEventListener("click", () => {
      selectedUserId = user.id;
      if (user.activeMessage?.id) {
        viewedActiveMessageIds.add(user.activeMessage.id);
      }
      messageComposerUserId = messageComposerUserId === user.id || user.hasActiveMessage ? user.id : "";
      renderUsersTable();
      renderDetailPanel();
    });

    row.querySelector(".users-message-button")?.addEventListener("click", () => {
      if (messageComposerUserId !== user.id) {
        resetMessageComposer();
      }

      openMessageComposer(user.id);
    });

    usersTableBody.appendChild(row);
  });
}

function fillPlanOptions() {
  userPlanSelect.innerHTML = `
    <option value="gratis">Sem plano manual</option>
    ${plans
      .filter((plan) => plan.id !== "gratis")
      .map((plan) => `<option value="${plan.id}">${plan.name}</option>`)
      .join("")}
  `;
}

function fillEventOptions() {
  userEventSelect.innerHTML = `
    <option value="">Escolher evento</option>
    ${schedule.map((event) => `<option value="${event.id}">${event.dateLabel} - ${event.place}</option>`).join("")}
  `;
}

async function loadUsers() {
  const response = await fetch(getApiUrl("/api/admin/users"), {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    redirectToAuth();
    return;
  }

  if (response.status === 403) {
    window.location.href = "/index.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar usuarios.");
  }

  users = Array.isArray(data.users) ? data.users : [];
  plans = Array.isArray(data.plans) ? data.plans : [];
  schedule = Array.isArray(data.schedule) ? data.schedule : [];

  if (!selectedUserId && users[0]) {
    selectedUserId = users[0].id;
  }

  fillPlanOptions();
  fillEventOptions();
  renderUsersTable();
  renderDetailPanel();
  usersStatus.textContent = `${users.length} usuarios carregados.`;
}

async function sendMessageToSelectedUser() {
  const user = getSelectedUser();

  if (!user || messageComposerUserId !== user.id) {
    return;
  }

  const title = userMessageTitle.value.trim();
  const body = userMessageBody.value.trim();

  if (!title) {
    userDetailStatus.textContent = "Digite o titulo da mensagem.";
    userMessageTitle.focus();
    return;
  }

  if (!body) {
    userDetailStatus.textContent = "Digite o texto da mensagem.";
    userMessageBody.focus();
    return;
  }

  if (body.length > 500) {
    userDetailStatus.textContent = "A mensagem pode ter no maximo 500 caracteres.";
    userMessageBody.focus();
    return;
  }

  userDetailStatus.textContent = "Enviando mensagem...";

  try {
    const response = await fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(user.id)}/message`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        title,
        body
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Falha ao enviar mensagem.");
    }

    userDetailStatus.textContent = "Mensagem enviada para o usuario.";
    if (data?.message?.id) {
      viewedActiveMessageIds.add(data.message.id);
    }
    resetMessageComposer();
    await loadUsers();
  } catch (error) {
    userDetailStatus.textContent = error instanceof Error ? error.message : "Erro ao enviar mensagem.";
  }
}

async function saveSelectedUser() {
  const user = getSelectedUser();

  if (!user) {
    return;
  }

  userDetailStatus.textContent = "Salvando...";

  try {
    const responses = await Promise.all([
      fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(user.id)}/plan`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          planId: userPlanSelect.value
        })
      }),
      fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(user.id)}/contractor`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          isContractor: userContractorSelect.value === "true",
          contractorEventId: userContractorSelect.value === "true" ? userEventSelect.value : ""
        })
      })
    ]);

    for (const response of responses) {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar usuario.");
      }
    }

    userDetailStatus.textContent = "Alteracoes salvas.";
    await loadUsers();
  } catch (error) {
    userDetailStatus.textContent = error instanceof Error ? error.message : "Erro ao salvar.";
  }
}

async function deleteSelectedUser() {
  const user = getSelectedUser();

  if (!user) {
    return;
  }

  const confirmed = window.confirm(`Excluir a conta de ${user.name || user.username || "este usuario"}?`);

  if (!confirmed) {
    return;
  }

  userDetailStatus.textContent = "Excluindo...";

  try {
    const response = await fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(user.id)}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Falha ao excluir usuario.");
    }

    selectedUserId = "";
    userDetailStatus.textContent = "";
    await loadUsers();
  } catch (error) {
    userDetailStatus.textContent = error instanceof Error ? error.message : "Erro ao excluir.";
  }
}

await initSiteHeader().catch(() => null);
const currentUser = await loadCurrentUser().catch(() => null);

if (!currentUser) {
  redirectToAuth();
} else if (String(currentUser.username || "").trim().toLowerCase() !== "rosemattos") {
  window.location.href = "/index.html";
} else {
  userContractorSelect.addEventListener("change", syncContractorEventVisibility);
  userMessageBody.addEventListener("input", updateMessageCounter);
  userMessageSendButton.addEventListener("click", sendMessageToSelectedUser);
  userSaveButton.addEventListener("click", saveSelectedUser);
  userDeleteButton.addEventListener("click", deleteSelectedUser);
  updateMessageCounter();

  try {
    await loadUsers();
  } catch (error) {
    usersStatus.textContent = error instanceof Error ? error.message : "Erro ao carregar usuarios.";
  }
}
