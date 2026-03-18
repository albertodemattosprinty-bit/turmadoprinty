const planStorageKey = "turma_do_printy_plan";
const planStatus = document.getElementById("plan-status");
const plansGrid = document.getElementById("plans-grid");

const plans = [
  {
    id: "gratis",
    name: "Gratis",
    priceLabel: "R$ 0/mês",
    description: "Streaming liberado. Downloads seguem bloqueados.",
    perks: ["Ouvir todas as faixas", "Navegar no catalogo"]
  },
  {
    id: "plus",
    name: "Plus",
    priceLabel: "R$ 2/mês",
    description: "Plano de teste com downloads de todas as musicas.",
    perks: ["Streaming completo", "Downloads globais"]
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "R$ 3/mês",
    description: "Mesmo acesso de download total, com outro valor de teste.",
    perks: ["Streaming completo", "Downloads globais"]
  },
  {
    id: "life",
    name: "Life",
    priceLabel: "R$ 4/mês",
    description: "Plano maximo de teste com downloads liberados em todo o catalogo.",
    perks: ["Streaming completo", "Downloads globais"]
  }
];

function getCurrentPlan() {
  try {
    return JSON.parse(window.localStorage.getItem(planStorageKey) || "{\"id\":\"gratis\"}");
  } catch {
    return { id: "gratis" };
  }
}

function setCurrentPlan(planId) {
  window.localStorage.setItem(planStorageKey, JSON.stringify({
    id: planId,
    updatedAt: new Date().toISOString()
  }));
}

function renderPlans() {
  const currentPlan = getCurrentPlan();
  const activePlan = plans.find((plan) => plan.id === currentPlan.id) || plans[0];
  planStatus.textContent = `Plano atual: ${activePlan.name}.`;
  plansGrid.innerHTML = "";

  plans.forEach((plan) => {
    const article = document.createElement("article");
    article.className = `plan-card${plan.id === activePlan.id ? " active" : ""}`;
    article.innerHTML = `
      <p class="eyebrow">${plan.name}</p>
      <h2>${plan.priceLabel}</h2>
      <p>${plan.description}</p>
      <div class="plan-perks">${plan.perks.map((perk) => `<span class="status-pill">${perk}</span>`).join("")}</div>
      <button class="${plan.id === activePlan.id ? "ghost-button" : "primary-button"} full-width" type="button">
        ${plan.id === activePlan.id ? "Plano ativo" : "Ativar plano"}
      </button>
    `;

    const button = article.querySelector("button");
    button.disabled = plan.id === activePlan.id;
    button.addEventListener("click", () => {
      setCurrentPlan(plan.id);
      renderPlans();
    });

    plansGrid.appendChild(article);
  });
}

renderPlans();
