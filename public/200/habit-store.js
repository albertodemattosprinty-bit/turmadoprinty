const HABIT_STORE_HABITS = [
  ["hidratação", "Hidratação", "💧", "hidratacao", 5],
  ["preparar-refeições", "Preparar refeições", "🥘", "alimentacao", 45],
  ["preparar-para-dormir", "Preparar para dormir", "🌙", "sono", 20],
  ["escovar-dentes", "Escovar os dentes", "🪥", "higiene", 2],
  ["fio-dental", "Fio dental", "🦷", "higiene", 2],
  ["banho", "Banho", "🚿", "higiene", 10],
  ["higiene-facial", "Higiene facial", "🧴", "higiene", 5],
  ["higiene-íntima", "Higiene íntima", "🧼", "higiene", 3],
  ["cuidar-cabelo", "Cuidar do cabelo", "💇", "higiene", 10],
  ["unhas-cuidados", "Unhas e cuidados corporais", "✂️", "higiene", 15],
  ["arrumar-cama", "Arrumar a cama", "🛏️", "casa", 3],
  ["guardar-objetos", "Guardar objetos", "📦", "casa", 10],
  ["organizar-louça", "Lavar / organizar louça", "🍽️", "casa", 15],
  ["retirar-lixo", "Retirar o lixo", "🗑️", "casa", 5],
  ["limpar-superfícies", "Limpar superfícies", "🧽", "casa", 10],
  ["limpar-chão", "Limpar o chão", "🧹", "casa", 20],
  ["limpar-móveis", "Limpar móveis / retirar poeira", "🪑", "casa", 20],
  ["lavar-roupas", "Lavar roupas", "👕", "casa", 10],
  ["dobrar-roupas", "Dobrar e guardar roupas", "🧺", "casa", 15],
  ["trocar-roupa-cama", "Trocar roupa de cama / toalhas", "🛌", "casa", 10],
  ["limpar-banheiro", "Limpar banheiro", "🚽", "casa", 25],
  ["limpar-cozinha", "Limpar cozinha", "🍳", "casa", 20],
  ["organizar-despensa", "Organizar geladeira / despensa", "🧊", "casa", 15],
  ["compras-casa", "Compras / reposição da casa", "🛒", "casa", 45],
  ["manutenção-casa", "Manutenção da casa", "🔧", "casa", 30],
  ["planejar-jornada", "Planejar jornada de trabalho", "🗓️", "trabalho", 10],
  ["trabalho-profundo", "Trabalho profundo", "🎯", "trabalho", 90],
  ["trabalho-operacional", "Trabalho operacional", "⚙️", "trabalho", 120],
  ["comunicação-profissional", "Comunicação profissional", "💬", "trabalho", 30],
  ["administração-profissional", "Administração profissional", "📋", "trabalho", 30],
  ["organizar-trabalho", "Organizar ambiente / arquivos de trabalho", "🗂️", "trabalho", 10],
  ["habilidade-profissional", "Desenvolver habilidade profissional", "📈", "trabalho", 30],
  ["encerrar-jornada", "Revisar e encerrar jornada", "✅", "trabalho", 10],
  ["leitura-smartbook", "Leitura / SmartBook", "📚", "aprendizado", 20],
  ["estudo-estruturado", "Estudo estruturado", "🧠", "aprendizado", 30],
  ["revisão-conhecimento", "Revisão de conhecimento", "🔁", "aprendizado", 10],
  ["prática-deliberada", "Prática deliberada de habilidade", "🎹", "aprendizado", 30],
  ["meditação", "Meditação / respiração consciente", "🧘", "aspecto", 10],
  ["diário", "Diário / reflexão", "✍️", "aspecto", 10],
  ["planejamento-pessoal", "Planejamento / revisão pessoal", "🧭", "aspecto", 15],
  ["lazer-intencional", "Lazer intencional", "🎮", "lazer", 60],
  ["organização-digital", "Organização digital", "💻", "aspecto", 15]
].map(([id, title, icon, categoryId, minutes]) => ({ id, title, icon, categoryId, minutes, quantity: 1 }));

const HABIT_STORE_GROUPS = [
  ["Rotina", ["hidratação", "preparar-refeições"]], ["Sono", ["preparar-para-dormir"]],
  ["Higiene / cuidado pessoal", ["escovar-dentes", "fio-dental", "banho", "higiene-facial", "higiene-íntima", "cuidar-cabelo", "unhas-cuidados"]],
  ["Casa / ambiente", ["arrumar-cama", "guardar-objetos", "organizar-louça", "retirar-lixo", "limpar-superfícies", "limpar-chão", "limpar-móveis", "lavar-roupas", "dobrar-roupas", "trocar-roupa-cama", "limpar-banheiro", "limpar-cozinha", "organizar-despensa", "compras-casa", "manutenção-casa"]],
  ["Trabalho", ["planejar-jornada", "trabalho-profundo", "trabalho-operacional", "comunicação-profissional", "administração-profissional", "organizar-trabalho", "habilidade-profissional", "encerrar-jornada"]],
  ["Aprendizado / habilidades", ["leitura-smartbook", "estudo-estruturado", "revisão-conhecimento", "prática-deliberada"]],
  ["Emocional", ["meditação", "diário", "planejamento-pessoal", "lazer-intencional", "organização-digital"]]
];

HABIT_STORE_HABITS.push(
  { id: "nutrition-sugars", title: "Controle de açúcar", icon: "🍬", categoryId: "alimentacao", quantity: 25, unit: "g", kind: "nutrition-control", nutrientKey: "sugars", recommended: "Recomendado · OMS: <50 g/dia; ideal <25 g (açúcares livres, referência de 2.000 kcal)" },
  { id: "nutrition-proteins", title: "Controle de proteínas", icon: "🥚", categoryId: "alimentacao", quantity: 0, unit: "g", kind: "nutrition-control", nutrientKey: "proteins" },
  { id: "nutrition-carbohydrates", title: "Controle de carboidratos", icon: "🌾", categoryId: "alimentacao", quantity: 0, unit: "g", kind: "nutrition-control", nutrientKey: "carbohydrates" },
  { id: "nutrition-fiber", title: "Controle de fibras", icon: "🥬", categoryId: "alimentacao", quantity: 0, unit: "g", kind: "nutrition-control", nutrientKey: "fiber" },
  { id: "nutrition-fats", title: "Controle de gorduras", icon: "🥑", categoryId: "alimentacao", quantity: 0, unit: "g", kind: "nutrition-control", nutrientKey: "fats" },
  { id: "nutrition-sodium", title: "Controle de sódio", icon: "🧂", categoryId: "alimentacao", quantity: 0, unit: "mg", kind: "nutrition-control", nutrientKey: "sodium" },
  { id: "nutrition-micronutrients", title: "Micronutrientes", icon: "🧬", categoryId: "alimentacao", quantity: 0, unit: "%", kind: "nutrition-control", nutrientKey: "micronutrients" }
);
for (const [mealSlot, title, icon] of [["pre_morning_snack", "Lanche pré-matinal", "🌅"], ["breakfast", "Café da manhã", "☕"], ["morning_snack", "Lanche da manhã", "🍎"], ["lunch", "Almoço", "🍛"], ["afternoon_snack", "Lanche da tarde", "🍌"], ["afternoon_coffee", "Café da tarde", "🫖"], ["dinner", "Janta", "🍲"], ["night_snack", "Lanche da noite", "🌙"]]) {
  HABIT_STORE_HABITS.push({ id: `meal-${mealSlot}`, title, icon, categoryId: "alimentacao", minutes: 30, quantity: 1, kind: "meal-slot", mealSlot });
}
HABIT_STORE_GROUPS.push(["Nutrição", ["nutrition-sugars", "nutrition-proteins", "nutrition-carbohydrates", "nutrition-fiber", "nutrition-fats", "nutrition-sodium", "nutrition-micronutrients"]]);
HABIT_STORE_GROUPS.push(["Refeições", ["meal-pre_morning_snack", "meal-breakfast", "meal-morning_snack", "meal-lunch", "meal-afternoon_snack", "meal-afternoon_coffee", "meal-dinner", "meal-night_snack"]]);

const state = { selected: null, draft: null };
const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const context = () => window.project200ProjectsContext;
const allDays = [0, 1, 2, 3, 4, 5, 6];
const defaultSchedule = () => ({ frequency: "daily", interval: 1, intervalUnit: "day", weekDays: allDays, monthlyMode: "weekday", startsOn: new Date().toISOString().slice(0, 10), endMode: "never", notification: { mode: "at_time", customAmount: 10, customUnit: "minutes" } });

function show(element) { element?.classList.add("active"); element?.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open"); }
function hide(element) { element?.classList.remove("active"); element?.setAttribute("aria-hidden", "true"); if (!document.querySelector(".workspace-modal.active")) document.body.classList.remove("modal-open"); }
function scheduleLabel() { return window.project200DailyRepetitionModal?.label?.(state.draft?.schedule, { fallback: "Todos os dias" }) || "Todos os dias"; }
function getHabit(id) { return HABIT_STORE_HABITS.find((habit) => habit.id === id) || null; }

function ensureModals() {
  if (byId("habitStoreModal")) return;
  const store = document.createElement("section");
  store.id = "habitStoreModal"; store.className = "workspace-modal habit-store-modal"; store.setAttribute("aria-hidden", "true");
  store.innerHTML = '<article class="habit-store-panel"><header><div><span class="habit-store-kicker">LOJA DE HÁBITOS</span><h2>Loja de Hábitos</h2><p>Compre com seus minutos</p></div><button type="button" data-habit-close aria-label="Fechar">×</button></header><button class="habit-store-custom" type="button" data-habit-custom><span>＋</span><strong>Criar hábito personalizado</strong><small>Defina tudo do seu jeito</small></button><div id="habitStoreCatalog"></div></article>';
  const configure = document.createElement("section");
  configure.id = "habitStoreConfigureModal"; configure.className = "workspace-modal habit-store-modal"; configure.setAttribute("aria-hidden", "true");
  configure.innerHTML = '<form class="habit-store-panel habit-store-config" id="habitStoreForm"><header><button class="habit-store-back" type="button" data-habit-back aria-label="Voltar">‹</button><div><span class="habit-store-kicker">HÁBITO NATIVO</span><h2 id="habitStoreConfigTitle"></h2></div><span id="habitStoreConfigIcon" class="habit-store-config-icon"></span></header><p class="habit-store-locked">Aspecto definido para este hábito</p><p id="habitStoreRecommendation" class="habit-store-recommendation" hidden></p><div class="habit-store-setting"><span>Tempo</span><div><button type="button" data-habit-adjust="minutes" data-habit-step="-1">−</button><strong id="habitStoreMinutes"></strong><button type="button" data-habit-adjust="minutes" data-habit-step="1">+</button></div></div><div class="habit-store-setting"><span id="habitStoreQuantityLabel">Quantidade</span><div><button type="button" data-habit-adjust="quantity" data-habit-step="-1">−</button><strong id="habitStoreQuantity"></strong><button type="button" data-habit-adjust="quantity" data-habit-step="1">+</button></div></div><button class="habit-store-frequency" type="button" id="habitStoreFrequency"><span>Frequência</span><strong></strong><b>›</b></button><p id="habitStoreStatus" class="habit-store-status" aria-live="polite"></p><footer><button type="submit" class="primary-btn">Adicionar às missões</button></footer></form>';
  document.body.append(store, configure);
  store.addEventListener("click", (event) => {
    if (event.target.closest("[data-habit-close]")) hide(store);
    if (event.target.closest("[data-habit-custom]")) { hide(store); context()?.openMissionCreateModal?.(); }
    const card = event.target.closest("[data-habit-id]"); if (card) openConfig(getHabit(card.dataset.habitId));
  });
  configure.addEventListener("click", (event) => {
    if (event.target.closest("[data-habit-back]")) { hide(configure); show(store); }
    const button = event.target.closest("[data-habit-adjust]");
    if (button && state.draft) { const field = button.dataset.habitAdjust; const minimum = field === "quantity" && state.selected?.kind === "nutrition-control" ? 0 : 1; state.draft[field] = Math.max(minimum, Math.min(field === "minutes" ? 1440 : 999999, Number(state.draft[field]) + Number(button.dataset.habitStep))); renderConfig(); }
  });
  byId("habitStoreFrequency").addEventListener("click", () => {
    window.project200DailyRepetitionModal?.open("habit-store", (schedule) => { state.draft.schedule = schedule; renderConfig(); }, state.draft.schedule);
  });
  byId("habitStoreForm").addEventListener("submit", createHabit);
}

function renderStore() {
  const catalog = byId("habitStoreCatalog"); if (!catalog) return;
  catalog.innerHTML = HABIT_STORE_GROUPS.map(([title, ids]) => `<section class="habit-store-group"><h3>${title}</h3>${ids.map((id) => { const habit = getHabit(id); return `<button type="button" class="habit-store-card" data-habit-id="${habit.id}"><span>${habit.icon}</span><strong>${escapeHtml(habit.title)}</strong><small>${habit.kind === "nutrition-control" ? "Meta nutricional" : habit.kind === "meal-slot" ? "Refeição do plano" : `${habit.minutes} min`}</small><b>›</b></button>`; }).join("")}</section>`).join("");
}
function openConfig(habit) { if (!habit) return; state.selected = habit; state.draft = { minutes: habit.minutes, quantity: habit.quantity, schedule: defaultSchedule() }; byId("habitStoreStatus").textContent = ""; hide(byId("habitStoreModal")); renderConfig(); show(byId("habitStoreConfigureModal")); }
function renderConfig() { const habit = state.selected; if (!habit || !state.draft) return; byId("habitStoreConfigTitle").textContent = habit.title; byId("habitStoreConfigIcon").textContent = habit.icon; const timeSetting = byId("habitStoreMinutes").closest(".habit-store-setting"); timeSetting.hidden = habit.kind === "nutrition-control"; timeSetting.style.display = timeSetting.hidden ? "none" : "flex"; byId("habitStoreMinutes").textContent = `${state.draft.minutes} min`; byId("habitStoreQuantity").textContent = `${state.draft.quantity}${habit.unit ? ` ${habit.unit}` : ""}`; byId("habitStoreQuantityLabel").textContent = habit.kind === "nutrition-control" ? "Meta diária" : "Quantidade"; const recommendation = byId("habitStoreRecommendation"); recommendation.hidden = !habit.recommended && !(habit.kind === "nutrition-control" && !state.draft.quantity); recommendation.textContent = habit.recommended || (habit.kind === "nutrition-control" ? "Defina sua meta diária para ativar este controle." : ""); byId("habitStoreFrequency").querySelector("strong").textContent = scheduleLabel(); }

async function createHabit(event) {
  event.preventDefault(); const ctx = context(), habit = state.selected, draft = state.draft; if (!ctx || !habit || !draft) return;
  const button = event.currentTarget.querySelector("button[type=submit]"); const status = byId("habitStoreStatus"); button.disabled = true; status.textContent = "Adicionando...";
  try {
    const profile = window.project200DailyRepetitionModal?.getProfileName?.();
    if (habit.kind === "nutrition-control" && draft.quantity < 1) throw new Error("Defina sua meta diária para continuar.");
    if (habit.kind === "nutrition-control" || habit.kind === "meal-slot") {
      const nutrition = await ctx.apiRequest(`/api/200/wellness?profile=${encodeURIComponent(profile || "")}`, { forceNetwork: true });
      if (!nutrition?.dashboard?.nutritionPlanConfigured) throw new Error("Monte e salve seu plano de refeições na Nutrição antes de ativar este hábito.");
      if (habit.kind === "meal-slot") {
        const slots = nutrition.dashboard.mealSlots.filter((slot) => slot.enabled).map((slot) => slot.key);
        if (!slots.includes(habit.mealSlot)) await ctx.apiRequest("/api/200/nutrition/meal-slots", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, mealSlots: [...slots, habit.mealSlot] }) });
      }
    }
    const schedule = { ...draft.schedule, nativeType: habit.kind === "nutrition-control" ? "metrics" : habit.kind === "meal-slot" ? "meal_slot" : "habit_store", nativeHabitId: habit.id, lockedAspectId: habit.categoryId, nutrientKey: habit.nutrientKey || "", mealSlot: habit.mealSlot || "" };
    const repeatDays = schedule.frequency === "weekly" ? schedule.weekDays : allDays;
    await ctx.apiRequest("/api/200/extra-goals", { method: "POST", headers: { "Content-Type": "application/json" }, offlineInvalidates: ["/api/200/extra-goals", "/api/actions"], body: JSON.stringify({ profile, title: habit.title, targetValue: draft.quantity, categoryId: habit.categoryId, goalKind: "goal", unitDurationSeconds: habit.kind === "nutrition-control" ? 0 : draft.minutes * 60, repeatDays, scheduleConfig: schedule, repeatConfig: schedule, svgIconLabel: habit.icon }) });
    if (habit.kind === "nutrition-control" || habit.kind === "meal-slot") await ctx.apiRequest(`/api/200/wellness?profile=${encodeURIComponent(profile || "")}`, { forceNetwork: true });
    await (ctx.refreshMissions || ctx.loadMissions)?.({ forceNetwork: true }); hide(byId("habitStoreConfigureModal"));
  } catch (error) { status.textContent = error instanceof Error ? error.message : "Não foi possível adicionar o hábito."; }
  finally { button.disabled = false; }
}

function openStore(event) { event.preventDefault(); event.stopImmediatePropagation(); ensureModals(); renderStore(); show(byId("habitStoreModal")); }
document.addEventListener("click", (event) => { if (event.target.closest("#openMissionCreateHero, #openMissionCreateButton, #openMissionCreateFloatingButton")) openStore(event); }, true);
