import { getApiUrl } from "./api.js";
import { getToken, initSiteHeader, loadCurrentUser } from "./header.js";

const elements = {
  eyebrow: document.getElementById("subscriptions-eyebrow"),
  title: document.getElementById("subscriptions-title"),
  intro: document.getElementById("subscriptions-intro"),
  toolbar: document.getElementById("subscriptions-toolbar"),
  search: document.getElementById("subscriptions-search"),
  count: document.getElementById("subscriptions-count"),
  feedback: document.getElementById("subscriptions-feedback"),
  loading: document.getElementById("subscriptions-loading"),
  grid: document.getElementById("subscriptions-grid"),
  empty: document.getElementById("subscriptions-empty"),
  emptyCopy: document.getElementById("subscriptions-empty-copy")
};

const inactiveStatuses = new Set(["CANCELED", "CANCELLED", "SUSPENDED", "EXPIRED", "INACTIVE", "REPLACED"]);
const statusLabels = {
  ACTIVE: "Ativa",
  PAID: "Ativa",
  AUTHORIZED: "Ativa",
  PENDING: "Aguardando confirmação",
  OVERDUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  CANCELLED: "Cancelada",
  SUSPENDED: "Suspensa",
  EXPIRED: "Encerrada",
  DECLINED: "Pagamento recusado",
  INACTIVE: "Inativa",
  REPLACED: "Substituída"
};

const planLabels = {
  gratis: "Grátis",
  plus: "Plus",
  pro: "Pro",
  life: "Life"
};

const state = {
  isAdmin: false,
  subscriptions: [],
  busyId: "",
  query: ""
};

function redirectToAuth() {
  window.location.href = `/auth.html?next=${encodeURIComponent("/meusplanos")}`;
}

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

function setFeedback(message = "", type = "") {
  elements.feedback.textContent = message;
  elements.feedback.className = `subscriptions-feedback${type ? ` is-${type}` : ""}`;
  elements.feedback.hidden = !message;
}

function getPlanLabel(planId) {
  const normalized = String(planId || "").trim().toLowerCase();
  return planLabels[normalized] || normalized || "Plano";
}

function getStatusLabel(subscription) {
  if (subscription.cancelAtPeriodEnd && !inactiveStatuses.has(subscription.status)) {
    return "Cancela no fim do período";
  }

  return statusLabels[subscription.status] || subscription.status;
}

function getStatusClass(subscription) {
  if (subscription.cancelAtPeriodEnd && !inactiveStatuses.has(subscription.status)) {
    return "scheduled";
  }

  if (["ACTIVE", "PAID", "AUTHORIZED"].includes(subscription.status)) {
    return "active";
  }

  if (["PENDING", "OVERDUE"].includes(subscription.status)) {
    return "pending";
  }

  return "inactive";
}

function getPeriodCopy(subscription) {
  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return `Acesso disponível até ${formatDate(subscription.currentPeriodEnd)}. Não haverá nova cobrança.`;
  }

  if (subscription.cancelAtPeriodEnd) {
    return "A renovação foi desativada. O acesso permanece até o fim do período já pago.";
  }

  if (subscription.canceledAt) {
    return `Assinatura encerrada em ${formatDate(subscription.canceledAt)}.`;
  }

  if (subscription.currentPeriodEnd) {
    return `Próxima renovação prevista para ${formatDate(subscription.currentPeriodEnd)}.`;
  }

  return "A situação é sincronizada diretamente com o Stripe.";
}

function canManageRemoteSubscription(subscription) {
  return Boolean(subscription.subscriptionId) && !inactiveStatuses.has(subscription.status);
}

function renderActions(subscription) {
  if (!canManageRemoteSubscription(subscription)) {
    return "";
  }

  const busy = state.busyId === subscription.id;
  const buttons = [];

  if (!subscription.cancelAtPeriodEnd) {
    buttons.push(`
      <button class="ghost-button subscription-action" type="button" data-subscription-id="${escapeHtml(subscription.id)}" data-mode="period_end" ${busy ? "disabled" : ""}>
        ${busy ? "Processando..." : "Parar renovação"}
      </button>
    `);
  }

  if (state.isAdmin) {
    buttons.push(`
      <button class="subscription-danger-button subscription-action" type="button" data-subscription-id="${escapeHtml(subscription.id)}" data-mode="immediate" ${busy ? "disabled" : ""}>
        ${busy ? "Processando..." : "Cancelar agora"}
      </button>
    `);
  }

  return buttons.length ? `<div class="subscription-actions">${buttons.join("")}</div>` : "";
}

function renderSubscriptionCard(subscription) {
  const userBlock = state.isAdmin
    ? `
      <div class="subscription-user">
        <strong>${escapeHtml(subscription.user?.name || subscription.user?.username || "Usuário")}</strong>
        <span>${escapeHtml(subscription.user?.email || "E-mail não informado")}</span>
      </div>
    `
    : "";
  const stripeReference = state.isAdmin && subscription.subscriptionId
    ? `<span class="subscription-stripe-id" title="Identificador no Stripe">${escapeHtml(subscription.subscriptionId)}</span>`
    : "";

  return `
    <article class="subscription-card" data-record-id="${escapeHtml(subscription.id)}">
      <div class="subscription-card-head">
        <div>
          <p class="eyebrow">Plano ${escapeHtml(getPlanLabel(subscription.planId))}</p>
          <h2>${escapeHtml(formatCurrency(subscription.amountCents))}<small>/mês</small></h2>
        </div>
        <span class="subscription-status is-${getStatusClass(subscription)}">${escapeHtml(getStatusLabel(subscription))}</span>
      </div>
      ${userBlock}
      <dl class="subscription-details">
        <div><dt>Início</dt><dd>${escapeHtml(formatDate(subscription.activatedAt || subscription.createdAt))}</dd></div>
        <div><dt>Fim do período</dt><dd>${escapeHtml(formatDate(subscription.currentPeriodEnd))}</dd></div>
        <div><dt>Ambiente</dt><dd>${subscription.environment === "production" ? "Produção" : "Teste"}</dd></div>
      </dl>
      <p class="subscription-period-copy">${escapeHtml(getPeriodCopy(subscription))}</p>
      ${stripeReference}
      ${renderActions(subscription)}
    </article>
  `;
}

function getVisibleSubscriptions() {
  const query = state.query.trim().toLocaleLowerCase("pt-BR");

  if (!query) {
    return state.subscriptions;
  }

  return state.subscriptions.filter((subscription) => {
    const searchable = [
      subscription.planId,
      subscription.status,
      getStatusLabel(subscription),
      subscription.subscriptionId,
      subscription.user?.name,
      subscription.user?.username,
      subscription.user?.email
    ].join(" ").toLocaleLowerCase("pt-BR");
    return searchable.includes(query);
  });
}

function renderSubscriptions() {
  const subscriptions = getVisibleSubscriptions();
  elements.loading.hidden = true;
  elements.grid.innerHTML = subscriptions.map(renderSubscriptionCard).join("");
  elements.grid.hidden = subscriptions.length === 0;
  elements.empty.hidden = subscriptions.length !== 0;

  if (state.isAdmin) {
    elements.count.textContent = `${subscriptions.length} de ${state.subscriptions.length} assinatura(s)`;
    elements.emptyCopy.textContent = state.query
      ? "Nenhuma assinatura corresponde à busca."
      : "Ainda não existem assinaturas registradas.";
  } else {
    elements.emptyCopy.textContent = "Quando você assinar um plano, ele aparecerá aqui.";
  }

  document.querySelectorAll(".subscription-action").forEach((button) => {
    button.addEventListener("click", () => {
      void cancelSubscription(button.dataset.subscriptionId, button.dataset.mode);
    });
  });
}

async function fetchSubscriptions() {
  const token = getToken();

  if (!token) {
    redirectToAuth();
    return null;
  }

  const response = await fetch(getApiUrl("/api/account/subscriptions"), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    redirectToAuth();
    return null;
  }

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível carregar as assinaturas.");
  }

  return data;
}

async function refreshSubscriptions({ showLoading = true } = {}) {
  if (showLoading) {
    elements.loading.hidden = false;
    elements.grid.hidden = true;
    elements.empty.hidden = true;
  }

  const data = await fetchSubscriptions();

  if (!data) {
    return;
  }

  state.isAdmin = Boolean(data.isAdmin);
  state.subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];

  elements.toolbar.hidden = !state.isAdmin;

  if (state.isAdmin) {
    elements.eyebrow.textContent = "Administração";
    elements.title.textContent = "Planos de todos os usuários";
    elements.intro.textContent = "Acompanhe as assinaturas registradas e escolha entre parar a renovação ou cancelar imediatamente.";
  }

  renderSubscriptions();
}

async function cancelSubscription(subscriptionRecordId, mode) {
  const immediate = mode === "immediate";
  const confirmation = immediate
    ? "Cancelar esta assinatura agora? O usuário perderá o acesso imediatamente."
    : "Parar a renovação desta assinatura? O acesso continuará até o fim do período já pago.";

  if (!window.confirm(confirmation)) {
    return;
  }

  state.busyId = subscriptionRecordId;
  setFeedback(immediate ? "Cancelando assinatura no Stripe..." : "Desativando a renovação no Stripe...");
  renderSubscriptions();

  try {
    const response = await fetch(getApiUrl(`/api/account/subscriptions/${encodeURIComponent(subscriptionRecordId)}/cancel`), {
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
      throw new Error(data.error || "Não foi possível alterar a assinatura.");
    }

    await refreshSubscriptions({ showLoading: false });
    setFeedback(
      immediate
        ? "Assinatura cancelada imediatamente no Stripe."
        : "Renovação desativada. O acesso continuará até o fim do período pago.",
      "success"
    );
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Erro ao alterar a assinatura.", "error");
  } finally {
    state.busyId = "";
    renderSubscriptions();
  }
}

elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  renderSubscriptions();
});

await initSiteHeader().catch(() => null);

try {
  const user = await loadCurrentUser();

  if (!user) {
    redirectToAuth();
  } else {
    await refreshSubscriptions();
  }
} catch (error) {
  elements.loading.hidden = true;
  setFeedback(error instanceof Error ? error.message : "Erro ao abrir Meus planos.", "error");
}
