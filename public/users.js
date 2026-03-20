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

let users = [];
let plans = [];
let schedule = [];
let selectedUserId = "";

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
  syncContractorEventVisibility();
}

function renderUsersTable() {
  usersTableBody.innerHTML = "";

  if (!users.length) {
    usersTableBody.innerHTML = "<p class=\"section-muted\">Nenhum usuario encontrado.</p>";
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `users-table-row users-table-card ${user.isOnline ? "is-online" : "is-offline"}${user.id === selectedUserId ? " is-selected" : ""}`;
    row.innerHTML = `
      <span>
        <strong>${user.name || user.username || "Usuario"}</strong>
        <small>${user.username ? `@${user.username}` : ""}</small>
      </span>
      <span>${formatTextTokens(user.textTokensTotal)}</span>
      <span>${formatNarrationDuration(user.narrationSecondsTotal)}</span>
    `;

    row.addEventListener("click", () => {
      selectedUserId = user.id;
      renderUsersTable();
      renderDetailPanel();
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
  userSaveButton.addEventListener("click", saveSelectedUser);
  userDeleteButton.addEventListener("click", deleteSelectedUser);

  try {
    await loadUsers();
  } catch (error) {
    usersStatus.textContent = error instanceof Error ? error.message : "Erro ao carregar usuarios.";
  }
}
