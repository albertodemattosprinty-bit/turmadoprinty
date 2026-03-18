const sessionStorageKey = "turma_do_printy_token";
const planStatus = document.getElementById("plan-status");
const plansGrid = document.getElementById("plans-grid");

const plans = [
  {
    id: "gratis",
    name: "Gratis",
    priceLabel: "R$ 0/mes",
    description: "Streaming e download offline liberados no navegador para usuarios logados.",
    perks: ["Ouvir todas as faixas", "Downloads offline", "Navegar no catalogo"]
  },
  {
    id: "plus",
    name: "Plus",
    priceLabel: "R$ 2/mes",
    description: "Plano de teste com downloads de todas as musicas.",
    perks: ["Streaming completo", "Downloads globais", "Pagamento mensal recorrente"]
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "R$ 3/mes",
    description: "Mesmo acesso de download total, com outro valor de teste.",
    perks: ["Streaming completo", "Downloads globais", "Pagamento mensal recorrente"]
  },
  {
    id: "life",
    name: "Life",
    priceLabel: "R$ 4/mes",
    description: "Plano maximo de teste com downloads liberados em todo o catalogo.",
    perks: ["Streaming completo", "Downloads globais", "Pagamento mensal recorrente"]
  }
];

let accessState = {
  authenticated: false,
  planId: "gratis",
  planStatusValue: "FREE",
  canDownloadAll: false
};

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function getAuthRedirectUrl() {
  return `/auth.html?next=${encodeURIComponent("/planos.html")}`;
}

function redirectToAuth() {
  window.location.href = getAuthRedirectUrl();
}

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      planId: "gratis",
      planStatusValue: "FREE",
      canDownloadAll: false
    };
    return;
  }

  const response = await fetch("/api/account/access", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (response.status === 401) {
    window.localStorage.removeItem(sessionStorageKey);
    redirectToAuth();
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar plano atual.");
  }

  accessState = {
    authenticated: true,
    planId: data.access.plan.id || "gratis",
    planStatusValue: data.access.plan.status || "FREE",
    canDownloadAll: Boolean(data.access.canDownloadAll)
  };
}

async function startRecurringCheckout(plan) {
  const token = getToken();

  if (!token) {
    redirectToAuth();
    return;
  }

  const response = await fetch("/api/payments/stripe/subscription-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ planId: plan.id })
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};

  if (response.status === 401) {
    redirectToAuth();
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha ao criar checkout recorrente.");
  }

  if (!data.payUrl) {
    throw new Error("Checkout recorrente criado sem link de pagamento.");
  }

  window.location.href = data.payUrl;
}

function renderPlans() {
  const params = new URLSearchParams(window.location.search);
  const paymentReturned = params.get("payment") === "return";
  const activePlan = plans.find((plan) => plan.id === accessState.planId) || plans[0];

  if (!accessState.authenticated) {
    planStatus.textContent = "Faca login para ativar o plano Gratis e liberar downloads offline no navegador.";
  } else if (paymentReturned) {
    planStatus.textContent = "Pagamento enviado ao Stripe. Aguarde a confirmacao da assinatura.";
  } else if (accessState.canDownloadAll) {
    planStatus.textContent = `Plano ${activePlan.name} ativo no servidor. Streaming e downloads offline liberados para todo o catalogo.`;
  } else {
    planStatus.textContent = `Plano atual: ${activePlan.name}.`;
  }

  plansGrid.innerHTML = "";

  plans.forEach((plan) => {
    const isActive = accessState.canDownloadAll && plan.id === accessState.planId;
    const article = document.createElement("article");
    article.className = `plan-card${isActive ? " active" : ""}`;
    article.innerHTML = `
      <p class="eyebrow">${plan.name}</p>
      <h2>${plan.priceLabel}</h2>
      <p>${plan.description}</p>
      <div class="plan-perks">${plan.perks.map((perk) => `<span class="status-pill">${perk}</span>`).join("")}</div>
      <button class="${isActive || plan.id === "gratis" ? "ghost-button" : "primary-button"} full-width" type="button">
        ${isActive ? "Plano ativo" : plan.id === "gratis" ? "Plano padrao" : "Assinar no Stripe"}
      </button>
    `;

    const button = article.querySelector("button");
    button.disabled = isActive;
    button.addEventListener("click", async () => {
      if (plan.id === "gratis") {
        planStatus.textContent = "O plano Gratis ja fica disponivel como padrao.";
        return;
      }

      button.disabled = true;
      button.textContent = "Abrindo checkout...";

      try {
        await startRecurringCheckout(plan);
      } catch (error) {
        planStatus.textContent = error instanceof Error ? error.message : "Erro ao iniciar assinatura.";
        button.disabled = false;
        button.textContent = "Assinar no Stripe";
      }
    });

    plansGrid.appendChild(article);
  });
}

try {
  await loadAccessState();
  renderPlans();
} catch (error) {
  planStatus.textContent = error instanceof Error ? error.message : "Erro ao carregar planos.";
  renderPlans();
}
