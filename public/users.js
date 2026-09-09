import { getToken, initSiteHeader, loadCurrentUser } from "./header.js";
import { getApiUrl } from "./api.js";

const usersStatus = document.getElementById("users-status");
const usersTableBody = document.getElementById("users-table-body");
const userDetailModal = document.getElementById("user-detail-modal");
const userDetailPanel = document.getElementById("user-detail-panel");
const userDetailClose = document.getElementById("user-detail-close");
const userDetailTitle = document.getElementById("user-detail-title");
const userDetailSubtitle = document.getElementById("user-detail-subtitle");
const userDetailTextConsumption = document.getElementById("user-detail-text-consumption");
const userDetailNarrationConsumption = document.getElementById("user-detail-narration-consumption");
const userSubscriptionList = document.getElementById("user-subscription-list");
const userSubscriptionFeedback = document.getElementById("user-subscription-feedback");
const userPlanSelect = document.getElementById("user-plan-select");
const userContractorSelect = document.getElementById("user-contractor-select");
const userEventLabel = document.getElementById("user-event-label");
const userEventSelect = document.getElementById("user-event-select");
const userAlbumSelect = document.getElementById("user-album-select");
const userAlbumAssignButton = document.getElementById("user-album-assign-button");
const userAssignedAlbums = document.getElementById("user-assigned-albums");
const userSaveButton = document.getElementById("user-save-button");
const userDeleteButton = document.getElementById("user-delete-button");
const userDetailStatus = document.getElementById("user-detail-status");
const userMessagePanel = document.getElementById("user-message-panel");
const userMessagePreview = document.getElementById("user-message-preview");
const userMessagePreviewTitle = document.getElementById("user-message-preview-title");
const userMessagePreviewBody = document.getElementById("user-message-preview-body");
const userReplyPreview = document.getElementById("user-reply-preview");
const userReplyPreviewBody = document.getElementById("user-reply-preview-body");
const userMessageTitle = document.getElementById("user-message-title");
const userMessageBody = document.getElementById("user-message-body");
const userMessageCounter = document.getElementById("user-message-counter");
const userMessageSendButton = document.getElementById("user-message-send-button");

let users = [];
let plans = [];
let schedule = [];
let albums = [];
let subscriptions = [];
let subscriptionsLoadError = "";
let subscriptionBusyId = "";
let selectedUserId = "";
let messageComposerUserId = "";
let isDetailModalOpen = false;
const viewedReplyMessageIds = new Set();

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

const inactiveSubscriptionStatuses = new Set([
  "CANCELED",
  "CANCELLED",
  "SUSPENDED",
  "EXPIRED",
  "DECLINED",
  "INACTIVE",
  "REPLACED"
]);

const subscriptionStatusLabels = {
  ACTIVE: "Ativa",
  PAID: "Ativa",
  AUTHORIZED: "Ativa",
  PENDING: "Aguardando confirmacao",
  OVERDUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  CANCELLED: "Cancelada",
  SUSPENDED: "Suspensa",
  EXPIRED: "Encerrada",
  DECLINED: "Pagamento recusado",
  INACTIVE: "Inativa",
  REPLACED: "Substituida"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(valueInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format((Number(valueInCents) || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getPlanLabel(planId) {
  const normalizedPlanId = String(planId || "").trim().toLowerCase();
  const plan = plans.find((item) => item.id === normalizedPlanId);
  return plan?.name || normalizedPlanId || "Plano";
}

function getSubscriptionStatus(subscription) {
  return String(subscription?.status || "PENDING").trim().toUpperCase();
}

function getSubscriptionStatusLabel(subscription) {
  const status = getSubscriptionStatus(subscription);

  if (subscription?.cancelAtPeriodEnd && !inactiveSubscriptionStatuses.has(status)) {
    return "Cancela no fim do periodo";
  }

  return subscriptionStatusLabels[status] || status;
}

function getSubscriptionStatusClass(subscription) {
  const status = getSubscriptionStatus(subscription);

  if (subscription?.cancelAtPeriodEnd && !inactiveSubscriptionStatuses.has(status)) {
    return "scheduled";
  }

  if (["ACTIVE", "PAID", "AUTHORIZED"].includes(status)) {
    return "active";
  }

  if (["PENDING", "OVERDUE"].includes(status)) {
    return "pending";
  }

  return "inactive";
}

function getSubscriptionPeriodCopy(subscription) {
  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return `Acesso disponivel ate ${formatDate(subscription.currentPeriodEnd)}. Nao havera nova cobranca.`;
  }

  if (subscription.cancelAtPeriodEnd) {
    return "A renovacao foi desativada. O acesso permanece ate o fim do periodo pago.";
  }

  if (subscription.currentPeriodEnd) {
    return `Proxima renovacao prevista para ${formatDate(subscription.currentPeriodEnd)}.`;
  }

  return "A situacao e sincronizada diretamente com o Stripe.";
}

function getSubscriptionsForUser(userId) {
  return subscriptions.filter((subscription) => String(subscription?.user?.id || "") === String(userId || ""));
}

function getCurrentSubscriptionsForUser(userId) {
  return getSubscriptionsForUser(userId).filter((subscription) => {
    const status = getSubscriptionStatus(subscription);
    return Boolean(subscription.subscriptionId) && !inactiveSubscriptionStatuses.has(status);
  });
}

function setSubscriptionFeedback(message = "", type = "") {
  if (!userSubscriptionFeedback) {
    return;
  }

  userSubscriptionFeedback.textContent = message;
  userSubscriptionFeedback.className = `subscriptions-feedback user-subscription-feedback${type ? ` is-${type}` : ""}`;
  userSubscriptionFeedback.hidden = !message;
}

function renderSubscriptionSummary(user) {
  const currentSubscriptions = getCurrentSubscriptionsForUser(user.id);
  const currentSubscription = currentSubscriptions[0] || null;

  if (currentSubscription) {
    return `<span class="users-subscription-summary is-${getSubscriptionStatusClass(currentSubscription)}">Assinatura ${escapeHtml(getPlanLabel(currentSubscription.planId))} · ${escapeHtml(getSubscriptionStatusLabel(currentSubscription))}</span>`;
  }

  if (user.assignedPlanId) {
    return `<span class="users-subscription-summary is-manual">Plano manual ${escapeHtml(getPlanLabel(user.assignedPlanId))}</span>`;
  }

  return '<span class="users-subscription-summary is-empty">Sem assinatura ativa</span>';
}

function renderUserSubscriptions(user) {
  if (!userSubscriptionList) {
    return;
  }

  if (subscriptionsLoadError) {
    userSubscriptionList.innerHTML = `
      <div class="user-subscription-empty is-error">
        <strong>Nao foi possivel carregar as assinaturas</strong>
        <span>${escapeHtml(subscriptionsLoadError)}</span>
      </div>
    `;
    return;
  }

  const allUserSubscriptions = getSubscriptionsForUser(user.id);
  const currentSubscriptions = getCurrentSubscriptionsForUser(user.id);
  const pendingCheckoutCount = allUserSubscriptions.filter((subscription) => (
    getSubscriptionStatus(subscription) === "PENDING" && !subscription.subscriptionId
  )).length;

  if (!currentSubscriptions.length) {
    const pendingCopy = pendingCheckoutCount
      ? `${pendingCheckoutCount} tentativa(s) de checkout ainda sem assinatura confirmada.`
      : "Este usuario nao possui uma assinatura ativa no Stripe.";
    userSubscriptionList.innerHTML = `
      <div class="user-subscription-empty">
        <strong>Nenhuma assinatura ativa</strong>
        <span>${escapeHtml(pendingCopy)}</span>
      </div>
    `;
    return;
  }

  userSubscriptionList.innerHTML = currentSubscriptions.map((subscription) => {
    const busy = subscriptionBusyId === subscription.id;
    const stopRenewalButton = subscription.cancelAtPeriodEnd
      ? ""
      : `
        <button class="ghost-button user-subscription-action" type="button" data-subscription-id="${escapeHtml(subscription.id)}" data-mode="period_end" ${busy ? "disabled" : ""}>
          ${busy ? "Processando..." : "Parar renovacao"}
        </button>
      `;

    return `
      <article class="subscription-card user-subscription-card">
        <div class="subscription-card-head">
          <div>
            <p class="eyebrow">Plano ${escapeHtml(getPlanLabel(subscription.planId))}</p>
            <h2>${escapeHtml(formatCurrency(subscription.amountCents))}<small>/mes</small></h2>
          </div>
          <span class="subscription-status is-${getSubscriptionStatusClass(subscription)}">${escapeHtml(getSubscriptionStatusLabel(subscription))}</span>
        </div>
        <dl class="subscription-details">
          <div><dt>Inicio</dt><dd>${escapeHtml(formatDate(subscription.activatedAt || subscription.createdAt))}</dd></div>
          <div><dt>Fim do periodo</dt><dd>${escapeHtml(formatDate(subscription.currentPeriodEnd))}</dd></div>
          <div><dt>Origem</dt><dd>Stripe</dd></div>
        </dl>
        <p class="subscription-period-copy">${escapeHtml(getSubscriptionPeriodCopy(subscription))}</p>
        <div class="subscription-actions">
          ${stopRenewalButton}
          <button class="subscription-danger-button user-subscription-action" type="button" data-subscription-id="${escapeHtml(subscription.id)}" data-mode="immediate" ${busy ? "disabled" : ""}>
            ${busy ? "Processando..." : "Cancelar agora"}
          </button>
        </div>
      </article>
    `;
  }).join("");

  userSubscriptionList.querySelectorAll(".user-subscription-action").forEach((button) => {
    button.addEventListener("click", () => {
      void cancelSelectedUserSubscription(button.dataset.subscriptionId, button.dataset.mode);
    });
  });
}

function getSelectedUser() {
  return users.find((item) => item.id === selectedUserId) || null;
}

function syncUserDetailModalState() {
  const hasUser = Boolean(getSelectedUser());
  const shouldOpen = isDetailModalOpen && hasUser;

  userDetailModal.hidden = !shouldOpen;
  userDetailPanel.hidden = !shouldOpen;
  document.body.classList.toggle("user-detail-modal-open", shouldOpen);
}

function openUserDetailModal(userId) {
  selectedUserId = userId;
  isDetailModalOpen = true;
  setSubscriptionFeedback();
  syncUserDetailModalState();
  renderUsersTable();
  renderDetailPanel();
}

function closeUserDetailModal() {
  isDetailModalOpen = false;
  messageComposerUserId = "";
  userDetailStatus.textContent = "";
  syncUserDetailModalState();
  renderUsersTable();
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
  messageComposerUserId = userId;
  openUserDetailModal(userId);
  const user = getSelectedUser();

  if (user?.activeMessage?.id && user?.activeMessage?.userReplyBody) {
    viewedReplyMessageIds.add(user.activeMessage.id);
  }

  renderDetailPanel();
  userMessageTitle.focus();
}

function syncContractorEventVisibility() {
  userEventLabel.hidden = userContractorSelect.value !== "true";
}

function getAlbumById(albumId) {
  return albums.find((item) => item.id === albumId) || null;
}

function renderAssignedAlbums(user) {
  if (!userAssignedAlbums) {
    return;
  }

  const assignedAlbumIds = Array.isArray(user?.assignedAlbumIds) ? user.assignedAlbumIds : [];

  if (!assignedAlbumIds.length) {
    userAssignedAlbums.innerHTML = "<p class=\"section-muted\">Nenhum album atribuido manualmente ainda.</p>";
    return;
  }

  userAssignedAlbums.innerHTML = assignedAlbumIds
    .map((albumId) => {
      const album = getAlbumById(albumId);
      const label = album ? `${album.name}${album.priceLabel ? ` - ${album.priceLabel}` : ""}` : albumId;
      return `<span class="user-album-chip">${label}</span>`;
    })
    .join("");
}

function renderDetailPanel() {
  const user = getSelectedUser();

  if (!user) {
    syncUserDetailModalState();
    return;
  }

  syncUserDetailModalState();
  userDetailTitle.textContent = user.name || user.username || "Usuario";
  userDetailSubtitle.textContent = user.username ? `@${user.username}` : "Sem username";
  userDetailTextConsumption.textContent = formatTextTokens(user.textTokensTotal);
  userDetailNarrationConsumption.textContent = formatNarrationDuration(user.narrationSecondsTotal);
  renderUserSubscriptions(user);
  userPlanSelect.value = user.assignedPlanId || "gratis";
  userContractorSelect.value = user.isContractor ? "true" : "false";
  userEventSelect.value = user.contractorEventId || "";
  userAlbumSelect.value = "";
  userDetailStatus.textContent = "";
  userMessagePanel.hidden = messageComposerUserId !== user.id;
  if (userMessagePreview && userMessagePreviewTitle && userMessagePreviewBody) {
    const activeMessage = user.activeMessage || null;
    userMessagePreview.hidden = !activeMessage;
    userMessagePreviewTitle.textContent = activeMessage?.title || "";
    userMessagePreviewBody.textContent = activeMessage?.body || "";
  }
  if (userReplyPreview && userReplyPreviewBody) {
    const replyBody = user.activeMessage?.userReplyBody || "";
    userReplyPreview.hidden = !replyBody;
    userReplyPreviewBody.textContent = replyBody;
  }
  renderAssignedAlbums(user);
  syncContractorEventVisibility();
}

function renderUsersTable() {
  usersTableBody.innerHTML = "";

  if (!users.length) {
    usersTableBody.innerHTML = "<p class=\"section-muted\">Nenhum usuario encontrado.</p>";
    return;
  }

  users.forEach((user) => {
    const hasUnreadUserReply = Boolean(
      user.activeMessage?.id &&
      user.activeMessage?.userReplyBody &&
      !viewedReplyMessageIds.has(user.activeMessage.id)
    );
    const hasUnreadEventUpdate = Boolean(user.hasUnreadEventUpdate);

    const row = document.createElement("article");
    row.className = `users-table-row users-table-card ${user.isOnline ? "is-online" : "is-offline"}${user.id === selectedUserId ? " is-selected" : ""}`;
    row.innerHTML = `
      <div class="users-table-user">
        <button class="users-table-select" type="button">
          <span class="users-table-user-copy">
            <strong class="users-table-user-name">
              ${(hasUnreadUserReply || hasUnreadEventUpdate) ? `<span class="users-message-dot users-message-dot-left" aria-hidden="true" title="${hasUnreadEventUpdate ? "Nova movimentacao no evento" : "Nova mensagem"}"></span>` : ""}
              <span>${user.name || user.username || "Usuario"}</span>
            </strong>
            <small>${user.username ? `@${user.username}` : ""}</small>
            ${renderSubscriptionSummary(user)}
          </span>
        </button>
        <button class="users-message-button" type="button" aria-label="Abrir mensagem de ${user.name || user.username || "usuario"}" title="Abrir mensagem">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9.41l-3.7 3.58A1 1 0 0 1 4 17.86V15.5A2.5 2.5 0 0 1 1.5 13v-7A2.5 2.5 0 0 1 4 3.5Zm2.5-.5a.5.5 0 0 0-.5.5v7c0 .28.22.5.5.5h3.31c.26 0 .51.1.7.29L12 14.82V13.5a1 1 0 0 1 1-1h4.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/></svg>
        </button>
      </div>
    `;

    row.querySelector(".users-table-select")?.addEventListener("click", () => {
      if (user.activeMessage?.id && user.activeMessage?.userReplyBody) {
        viewedReplyMessageIds.add(user.activeMessage.id);
      }
      messageComposerUserId = messageComposerUserId === user.id || user.hasActiveMessage ? user.id : "";
      openUserDetailModal(user.id);
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

function fillAlbumOptions() {
  userAlbumSelect.innerHTML = `
    <option value="">Escolher album</option>
    ${albums.map((album) => `<option value="${album.id}">${album.name}</option>`).join("")}
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
  albums = Array.isArray(data.albums) ? data.albums : [];

  await loadSubscriptionsForUsers();

  if (!selectedUserId && users[0]) {
    selectedUserId = users[0].id;
  }

  fillPlanOptions();
  fillEventOptions();
  fillAlbumOptions();
  renderUsersTable();
  renderDetailPanel();
  usersStatus.textContent = `${users.length} usuarios carregados.`;
}

async function loadSubscriptionsForUsers() {
  subscriptionsLoadError = "";

  try {
    const response = await fetch(getApiUrl("/api/account/subscriptions"), {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      redirectToAuth();
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Falha ao carregar assinaturas.");
    }

    subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];
  } catch (error) {
    subscriptions = [];
    subscriptionsLoadError = error instanceof Error ? error.message : "Erro ao carregar assinaturas.";
  }
}

async function cancelSelectedUserSubscription(subscriptionRecordId, mode) {
  const user = getSelectedUser();
  const subscription = getCurrentSubscriptionsForUser(user?.id).find((item) => item.id === subscriptionRecordId);

  if (!user || !subscription) {
    return;
  }

  const immediate = mode === "immediate";
  const userLabel = user.name || user.username || "este usuario";
  const planLabel = getPlanLabel(subscription.planId);
  const confirmation = immediate
    ? `Cancelar o plano ${planLabel} de ${userLabel} agora? O acesso sera encerrado imediatamente.`
    : `Parar a renovacao do plano ${planLabel} de ${userLabel}? O acesso continuara ate o fim do periodo pago.`;

  if (!window.confirm(confirmation)) {
    return;
  }

  subscriptionBusyId = subscription.id;
  setSubscriptionFeedback(immediate ? "Cancelando assinatura no Stripe..." : "Desativando renovacao no Stripe...");
  renderUserSubscriptions(user);

  try {
    const response = await fetch(getApiUrl(`/api/account/subscriptions/${encodeURIComponent(subscription.id)}/cancel`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        mode: immediate ? "immediate" : "period_end"
      })
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      redirectToAuth();
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel alterar a assinatura.");
    }

    await loadSubscriptionsForUsers();
    subscriptionBusyId = "";
    renderUsersTable();
    renderUserSubscriptions(getSelectedUser());
    setSubscriptionFeedback(
      immediate
        ? "Assinatura cancelada imediatamente no Stripe."
        : "Renovacao desativada. O acesso continuara ate o fim do periodo pago.",
      "success"
    );
  } catch (error) {
    subscriptionBusyId = "";
    renderUserSubscriptions(getSelectedUser());
    setSubscriptionFeedback(error instanceof Error ? error.message : "Erro ao alterar a assinatura.", "error");
  }
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

async function assignAlbumToSelectedUser() {
  const user = getSelectedUser();
  const productId = userAlbumSelect.value;

  if (!user) {
    return;
  }

  if (!productId) {
    userDetailStatus.textContent = "Escolha um album para atribuir.";
    userAlbumSelect.focus();
    return;
  }

  if (Array.isArray(user.assignedAlbumIds) && user.assignedAlbumIds.includes(productId)) {
    userDetailStatus.textContent = "Esse album ja foi atribuido manualmente para este usuario.";
    return;
  }

  userDetailStatus.textContent = "Atribuindo album...";
  userAlbumAssignButton.disabled = true;

  try {
    const response = await fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(user.id)}/albums`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        productId
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Falha ao atribuir album.");
    }

    const assignedAlbumName = data?.product?.name || "Album";
    await loadUsers();
    userDetailStatus.textContent = `${assignedAlbumName} atribuido com sucesso.`;
  } catch (error) {
    userDetailStatus.textContent = error instanceof Error ? error.message : "Erro ao atribuir album.";
  } finally {
    userAlbumAssignButton.disabled = false;
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
    closeUserDetailModal();
    userDetailStatus.textContent = "";
    await loadUsers();
  } catch (error) {
    userDetailStatus.textContent = error instanceof Error ? error.message : "Erro ao excluir.";
  }
}

await initSiteHeader().catch(() => null);
const currentUser = await loadCurrentUser().catch(() => null);
const allowedAdminUsernames = new Set(["rosemattos", "lucasm"]);

if (!currentUser) {
  redirectToAuth();
} else if (!currentUser.isAdmin || !allowedAdminUsernames.has(String(currentUser.username || "").trim().toLowerCase())) {
  window.location.href = "/index.html";
} else {
  userContractorSelect.addEventListener("change", syncContractorEventVisibility);
  userMessageBody.addEventListener("input", updateMessageCounter);
  userMessageSendButton.addEventListener("click", sendMessageToSelectedUser);
  userAlbumAssignButton.addEventListener("click", assignAlbumToSelectedUser);
  userSaveButton.addEventListener("click", saveSelectedUser);
  userDeleteButton.addEventListener("click", deleteSelectedUser);
  userDetailClose?.addEventListener("click", closeUserDetailModal);
  userDetailModal?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute("data-close-user-detail")) {
      closeUserDetailModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isDetailModalOpen) {
      closeUserDetailModal();
    }
  });
  updateMessageCounter();

  try {
    await loadUsers();
  } catch (error) {
    usersStatus.textContent = error instanceof Error ? error.message : "Erro ao carregar usuarios.";
  }
}
