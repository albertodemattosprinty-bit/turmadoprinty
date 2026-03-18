import { getToken, initSiteHeader, loadCurrentUser } from "./header.js";

const planStatus = document.getElementById("plan-status");
const plansGrid = document.getElementById("plans-grid");

function getAuthRedirectUrl() {
  return `/auth.html?next=${encodeURIComponent("/planos.html")}`;
}

function redirectToAuth() {
  window.location.href = getAuthRedirectUrl();
}

async function loadSiteConfig() {
  const response = await fetch("/api/site/config");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar configuracoes.");
  }

  return data;
}

function formatCurrency(valueInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format((Number(valueInCents) || 0) / 100);
}

function buildPlans(siteConfig) {
  const prices = siteConfig.pricing.planPrices || {};

  return [
    {
      id: "gratis",
      name: "Gratis",
      priceLabel: "Gratis",
      description: "Streaming e download offline liberados no navegador para usuarios logados.",
      perks: ["Ouvir todas as faixas", "Downloads offline", "Navegar no catalogo"]
    },
    {
      id: "plus",
      name: "Plus",
      priceLabel: `${formatCurrency(prices.plus)}/mes`,
      description: "9,90 musicas e playbacks.",
      perks: ["Musicas e playbacks", "Streaming completo", "Pagamento mensal recorrente"]
    },
    {
      id: "pro",
      name: "Pro",
      priceLabel: `${formatCurrency(prices.pro)}/mes`,
      description: "19,90 cantatas.",
      perks: ["Cantatas", "Streaming completo", "Pagamento mensal recorrente"]
    },
    {
      id: "life",
      name: "Life",
      priceLabel: `${formatCurrency(prices.life)}/mes`,
      description: "29,90 IA Ilimitada Pro.",
      perks: ["IA Ilimitada Pro", "Streaming completo", "Pagamento mensal recorrente"]
    }
  ];
}

let accessState = {
  authenticated: false,
  planId: "gratis",
  canDownloadAll: false
};

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      planId: "gratis",
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

function ensureAdminPanel() {
  let panel = document.getElementById("admin-panel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "admin-panel";
    panel.className = "admin-panel";
    document.querySelector(".page-shell")?.prepend(panel);
  }

  return panel;
}

function renderAdminPanel(user, siteConfig, refreshPage) {
  if (!user?.isAdmin) {
    return;
  }

  const panel = ensureAdminPanel();
  const prices = siteConfig.pricing.planPrices || {};

  panel.innerHTML = `
    <div class="admin-panel-head">
      <strong>Admin RoseMattos</strong>
      <span>Planos</span>
    </div>
    <form id="admin-plan-form" class="admin-form-grid">
      <label>Plus (centavos)
        <input id="admin-plan-plus" type="number" min="0" step="1" value="${prices.plus || 990}">
      </label>
      <label>Pro (centavos)
        <input id="admin-plan-pro" type="number" min="0" step="1" value="${prices.pro || 1990}">
      </label>
      <label>Life (centavos)
        <input id="admin-plan-life" type="number" min="0" step="1" value="${prices.life || 2990}">
      </label>
      <button class="primary-button" type="submit">Salvar planos</button>
      <p id="admin-plan-status" class="section-muted"></p>
    </form>
  `;

  const form = document.getElementById("admin-plan-form");
  const status = document.getElementById("admin-plan-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Salvando...";

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          albumPriceCents: siteConfig.pricing.albumPriceCents,
          planPrices: {
            gratis: 0,
            plus: Number(document.getElementById("admin-plan-plus").value || 0),
            pro: Number(document.getElementById("admin-plan-pro").value || 0),
            life: Number(document.getElementById("admin-plan-life").value || 0)
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar planos.");
      }

      status.textContent = "Planos atualizados no servidor.";
      await refreshPage();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Erro ao salvar planos.";
    }
  });
}

function renderPlans(plans) {
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
        ${isActive ? "Plano ativo" : plan.id === "gratis" ? "Plano padrao" : "Assinar"}
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
        button.textContent = "Assinar";
      }
    });

    plansGrid.appendChild(article);
  });
}

async function renderPage() {
  const [siteConfig, user] = await Promise.all([loadSiteConfig(), loadCurrentUser()]);
  const plans = buildPlans(siteConfig);
  renderAdminPanel(user, siteConfig, renderPage);
  await loadAccessState();
  renderPlans(plans);
}

await initSiteHeader().catch(() => null);

try {
  await renderPage();
} catch (error) {
  planStatus.textContent = error instanceof Error ? error.message : "Erro ao carregar planos.";
}
