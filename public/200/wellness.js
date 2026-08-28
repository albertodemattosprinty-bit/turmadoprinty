import { getApiUrl } from "../api.js";

const TOKEN_KEY = "turma_do_printy_token";
const PROFILE_KEY = "project_200_profile_v1";
const fatLossExercises = [
  ["walk","Caminhar","steps","Ao ar livre ou esteira","Mantenha postura alta, passos naturais e ritmo que permita respirar com controle."],
  ["bike","Bicicleta","minutes","Bicicleta comum","Ajuste o banco, pedale de forma contínua e evite travar os joelhos."],
  ["treadmill","Esteira","minutes","Esteira","Comece devagar, olhe para frente e aumente a velocidade apenas quando estiver estável."],
  ["run","Corrida","minutes","Natural","Pouse o pé abaixo do corpo e mantenha passos curtos e leves."],
  ["elliptical","Elíptico","minutes","Elíptico","Apoie todo o pé, segure as alças sem tensão e mantenha movimento contínuo."],
  ["rowing","Remo ergométrico","minutes","Máquina de remo","Empurre com as pernas, incline pouco o tronco e só depois puxe com os braços."],
  ["stair","Escada ergométrica","minutes","Máquina de escada","Apoie o pé inteiro e evite sustentar o peso nos braços."],
  ["rope","Pular corda","minutes","Corda","Faça saltos baixos, gire a corda pelos punhos e pouse suavemente."],
  ["swim","Natação","minutes","Piscina","Alongue a braçada, solte o ar dentro da água e mantenha ritmo confortável."],
  ["dance","Dança aeróbica","minutes","Natural","Mantenha o corpo solto e siga movimentos contínuos no seu ritmo."],
  ["hike","Trilha","minutes","Natural","Use calçado firme, encurte o passo nas subidas e observe o terreno."],
  ["jumping-jack","Polichinelo","minutes","Natural","Abra pernas e braços juntos e pouse com joelhos levemente flexionados."],
  ["mountain-climber","Escalador","minutes","Natural","Mãos sob os ombros, abdômen firme e joelhos alternando à frente."],
  ["burpee","Burpee","minutes","Natural","Agache, leve os pés para trás, volte e levante sem perder o controle da lombar."],
  ["high-knees","Corrida com joelhos altos","minutes","Natural","Corra parado elevando os joelhos e aterrisse na parte da frente do pé."],
  ["shadow-boxing","Boxe sombra","minutes","Natural","Guarda alta, golpes controlados e pés sempre em movimento."],
  ["skating","Patinação","minutes","Patins","Flexione os joelhos, mantenha o centro de equilíbrio baixo e deslize lateralmente."],
  ["water-aerobics","Hidroginástica","minutes","Piscina","Use a resistência da água com movimentos amplos e controlados."],
  ["spinning","Spinning","minutes","Bicicleta de spinning","Ajuste banco e guidão, mantenha cadência estável e resistência segura."],
  ["battle-rope","Corda naval","minutes","Corda naval","Base firme, abdômen ativo e ondas alternadas produzidas pelos braços." ]
].map(([id,name,tracking,equipment,cue]) => ({ id,name,tracking,equipment,cue,category:"fat_loss" }));

const strengthExercises = [
  ["squat","Agachamento livre","Natural","Pés na largura dos ombros; quadril para trás e joelhos acompanhando os pés."],
  ["leg-press","Leg press","Máquina leg press","Pés firmes; desça sem tirar o quadril do banco e empurre sem travar os joelhos."],
  ["leg-extension","Cadeira extensora","Máquina extensora","Alinhe o joelho ao eixo, estenda as pernas e desça controlando."],
  ["leg-curl","Mesa flexora","Máquina flexora","Mantenha o quadril apoiado, flexione os joelhos e retorne devagar."],
  ["calf-raise","Elevação de panturrilha","Máquina ou degrau","Eleve os calcanhares ao máximo e desça com controle."],
  ["hip-thrust","Elevação pélvica","Banco e barra","Apoie as costas no banco e eleve o quadril contraindo os glúteos."],
  ["romanian-deadlift","Stiff","Barra ou halteres","Quadril para trás, coluna neutra e peso perto das pernas."],
  ["deadlift","Levantamento terra","Barra","Barra perto das canelas, peito aberto e subida empurrando o chão."],
  ["bench-press","Supino reto com barra","Banco e barra","Escápulas apoiadas, barra ao meio do peito e pés firmes."],
  ["dumbbell-press","Supino com halteres","Banco e halteres","Desça os halteres ao lado do peito e empurre mantendo os punhos firmes."],
  ["push-up","Flexão de braços","Natural","Corpo alinhado, mãos sob os ombros e peito descendo junto."],
  ["incline-bench","Supino inclinado","Banco inclinado e pesos","Mantenha o peito alto e empurre os pesos acima da parte superior do peito."],
  ["pec-deck","Voador peitoral","Máquina peck deck","Cotovelos apoiados, una os braços à frente e volte sem soltar o peso."],
  ["crossover","Crossover","Polias","Incline pouco o tronco e aproxime as mãos à frente do peito."],
  ["lat-pulldown","Puxada frontal","Máquina de puxada","Puxe a barra ao alto do peito sem jogar o tronco para trás."],
  ["pull-up","Barra fixa","Barra fixa","Comece pendurado, puxe o peito em direção à barra e desça controlando."],
  ["seated-row","Remada baixa","Máquina ou cabo","Peito aberto, puxe ao abdômen e aproxime as escápulas."],
  ["one-arm-row","Remada unilateral","Banco e halter","Apoie uma mão, coluna neutra e puxe o halter ao quadril."],
  ["barbell-row","Remada curvada","Barra","Incline o tronco com coluna neutra e puxe a barra ao abdômen."],
  ["overhead-press","Desenvolvimento de ombros","Halteres ou máquina","Abdômen firme e pesos subindo sem arquear a lombar."],
  ["lateral-raise","Elevação lateral","Halteres","Cotovelos levemente flexionados e braços subindo até a linha dos ombros."],
  ["front-raise","Elevação frontal","Halteres","Eleve os pesos à frente até os ombros sem balançar o tronco."],
  ["reverse-fly","Crucifixo inverso","Halteres ou máquina","Abra os braços para trás e aproxime as escápulas."],
  ["shrug","Encolhimento de ombros","Barra ou halteres","Eleve os ombros verticalmente e desça sem girá-los."],
  ["barbell-curl","Rosca direta","Barra","Cotovelos ao lado do corpo e barra subindo sem embalo."],
  ["dumbbell-curl","Rosca alternada","Halteres","Alterne os braços mantendo cotovelo parado e punho firme."],
  ["hammer-curl","Rosca martelo","Halteres","Palmas voltadas uma para a outra e cotovelos fixos."],
  ["triceps-pushdown","Tríceps na polia","Polia","Cotovelos junto ao corpo e mãos descendo até estender os braços."],
  ["overhead-triceps","Tríceps francês","Halter","Cotovelos apontados à frente e peso descendo atrás da cabeça."],
  ["bench-dip","Mergulho no banco","Banco","Mãos no banco, quadril próximo e cotovelos dobrando para trás."],
  ["crunch","Abdominal curto","Natural","Lombar apoiada e ombros subindo pela contração do abdômen."],
  ["leg-raise","Elevação de pernas","Natural ou barra","Mantenha o abdômen firme e eleve as pernas sem embalo."],
  ["russian-twist","Abdominal russo","Natural ou peso","Tronco inclinado, abdômen firme e rotação controlada dos ombros."],
  ["glute-bridge","Ponte de glúteos","Natural","Pés no chão, eleve o quadril e contraia os glúteos no topo."],
  ["bulgarian-squat","Agachamento búlgaro","Banco e halteres opcionais","Pé traseiro no banco e joelho da frente acompanhando o pé."],
  ["lunge","Avanço","Natural ou halteres","Dê um passo, desça os dois joelhos e empurre o chão para voltar."],
  ["hack-squat","Agachamento hack","Máquina hack","Costas apoiadas, desça com controle e empurre pela planta dos pés."],
  ["smith-squat","Agachamento Smith","Máquina Smith","Posicione os pés à frente e desça mantendo costas apoiadas na trajetória."],
  ["adductor","Cadeira adutora","Máquina adutora","Feche as pernas contra a resistência e retorne lentamente."],
  ["abductor","Cadeira abdutora","Máquina abdutora","Abra os joelhos contra a resistência sem inclinar o tronco." ]
].map(([id,name,equipment,cue]) => ({ id,name,equipment,cue,tracking:"series",category:"strength" }));

const EXERCISES = [...fatLossExercises, ...strengthExercises];

const byId = (id) => document.getElementById(id);
const modal = byId("wellnessModal");
const elements = {
  title: byId("wellnessTitle"), headerIcon: byId("wellnessHeaderIcon"), calories: byId("wellnessCaloriesToday"),
  quality: byId("wellnessQualityToday"), qualityFill: byId("wellnessQualityFill"), mealCount: byId("wellnessMealCount"),
  lunaMessage: byId("wellnessLunaMessage"), foodForm: byId("wellnessFoodForm"), foodInput: byId("wellnessFoodInput"),
  timeQuestion: byId("wellnessTimeQuestion"), foodTime: byId("wellnessFoodTime"), foodSend: byId("wellnessFoodSend"),
  nutritionStatus: byId("wellnessNutritionStatus"), mealList: byId("wellnessMealList"), exerciseGrid: byId("wellnessExerciseGrid"),
  activeWorkout: byId("wellnessActiveWorkout"), workoutName: byId("wellnessWorkoutName"), workoutCounter: byId("wellnessWorkoutCounter"),
  workoutDetail: byId("wellnessWorkoutDetail"), workoutPrimary: byId("wellnessWorkoutPrimary"), workoutFinish: byId("wellnessWorkoutFinish"),
  detail: byId("wellnessExerciseDetail"), detailCategory: byId("wellnessExerciseCategory"), detailName: byId("wellnessExerciseName"),
  detailEquipment: byId("wellnessExerciseEquipment"), detailInstructions: byId("wellnessExerciseInstructions"), detailStart: byId("wellnessExerciseStart"),
  repsLayer: byId("wellnessRepsLayer"), repsForm: byId("wellnessRepsForm"), repsInput: byId("wellnessRepsInput")
};

const state = {
  tab: "nutrition", filter: "all", dashboard: null, selectedExercise: null, workout: null,
  seriesInProgress: false, steps: 0, lastStepAt: 0, motionListening: false, saveTimer: null, ticker: null,
  pendingMeal: ""
};

function profileName() {
  return String(window.localStorage.getItem(PROFILE_KEY) || document.body.dataset.profile || "Usuario").trim() || "Usuario";
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = String(window.localStorage.getItem(TOKEN_KEY) || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(getApiUrl(path), { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Nao foi possivel concluir.");
  return payload;
}

function setTab(tab) {
  state.tab = tab === "exercises" ? "exercises" : "nutrition";
  document.querySelectorAll("[data-wellness-tab]").forEach((button) => button.classList.toggle("active", button.dataset.wellnessTab === state.tab));
  document.querySelectorAll("[data-wellness-pane]").forEach((pane) => pane.classList.toggle("active", pane.dataset.wellnessPane === state.tab));
  const exercising = state.tab === "exercises";
  if (elements.title) elements.title.textContent = exercising ? "Exercícios" : "Nutrição";
  if (elements.headerIcon) elements.headerIcon.src = exercising ? "/200/apps/exercicios.png" : "/200/apps/nutricao.png";
}

function openWellness(tab) {
  setTab(tab);
  modal?.classList.add("active");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  void loadDashboard();
}

function closeWellness() {
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  elements.detail.hidden = true;
  elements.repsLayer.hidden = true;
  if (!document.querySelector(".workspace-modal.active")) document.body.classList.remove("modal-open");
}

function exerciseInstructions(exercise) {
  if (exercise.tracking === "series") return [
    `Prepare ${exercise.equipment.toLowerCase()} com uma carga que permita movimento controlado.`,
    exercise.cue,
    "Faça a série sem prender a respiração. Pare se sentir dor aguda e informe quantos movimentos concluiu."
  ];
  if (exercise.tracking === "steps") return [
    "Leve o celular com você para o contador acompanhar seus passos.", exercise.cue,
    "Toque em Encerrar treino quando terminar; os passos e minutos serão guardados."
  ];
  return [
    `Prepare ${exercise.equipment.toLowerCase()} e comece em intensidade leve.`, exercise.cue,
    "Mantenha o ritmo pelo tempo desejado e toque em Encerrar treino ao finalizar."
  ];
}

function renderExerciseGrid() {
  if (!elements.exerciseGrid) return;
  const visible = state.filter === "all" ? EXERCISES : EXERCISES.filter((item) => item.category === state.filter);
  elements.exerciseGrid.innerHTML = visible.map((exercise) => {
    const number = EXERCISES.indexOf(exercise) + 1;
    const type = exercise.tracking === "series" ? "Séries e movimentos" : exercise.tracking === "steps" ? "Passos e minutos" : "Minutos";
    return `<button class="wellness-exercise-item" type="button" data-exercise-id="${exercise.id}"><span class="wellness-exercise-number">${String(number).padStart(2,"0")}</span><span class="wellness-exercise-copy"><strong>${exercise.name}</strong><small>${exercise.equipment} · ${type}</small></span><span class="wellness-exercise-chevron">›</span></button>`;
  }).join("");
}

function openExerciseDetail(exercise) {
  state.selectedExercise = exercise;
  elements.detailCategory.textContent = exercise.category === "strength" ? "Musculação" : "Condicionamento e perda de gordura";
  elements.detailName.textContent = exercise.name;
  elements.detailEquipment.textContent = `Equipamento: ${exercise.equipment}`;
  elements.detailInstructions.innerHTML = "";
  exerciseInstructions(exercise).forEach((instruction) => {
    const item = document.createElement("li"); item.textContent = instruction; elements.detailInstructions.appendChild(item);
  });
  elements.detailStart.textContent = exercise.tracking === "series" ? "Iniciar série" : "Iniciar exercício";
  elements.detail.hidden = false;
}

renderExerciseGrid();

function renderMeals() {
  const dashboard = state.dashboard || {};
  const today = dashboard.today || {};
  elements.calories.textContent = String(Math.round(Number(today.calories || 0)));
  elements.quality.textContent = String(Math.round(Number(today.qualityScore || 0)));
  elements.qualityFill.style.width = `${Math.max(0, Math.min(100, Number(today.qualityScore || 0)))}%`;
  const count = Number(today.mealCount || 0);
  elements.mealCount.textContent = count ? `${count} ${count === 1 ? "registro" : "registros"} hoje` : "Nenhum alimento registrado";
  elements.mealList.innerHTML = "";
  const meals = Array.isArray(dashboard.meals) ? dashboard.meals : [];
  if (!meals.length) {
    const empty = document.createElement("div"); empty.className = "wellness-meal-empty"; empty.textContent = "Sua tabela de hoje começa quando você contar para Luna o que comeu."; elements.mealList.appendChild(empty); return;
  }
  meals.forEach((meal) => {
    const article = document.createElement("article"); article.className = "wellness-meal-item";
    const copy = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = meal.description || "Alimento";
    const feedback = document.createElement("small"); feedback.textContent = meal.feedback || "Estimativa registrada por Luna.";
    const time = document.createElement("time"); time.textContent = new Date(meal.consumedAt).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
    copy.append(title, feedback, time);
    const score = document.createElement("div"); score.className = "wellness-meal-score";
    const calories = document.createElement("b"); calories.textContent = `${Math.round(Number(meal.calories || 0))} kcal`;
    const quality = document.createElement("span"); quality.textContent = `${Math.round(Number(meal.qualityScore || 0))}% qualidade`;
    score.append(calories, quality); article.append(copy, score); elements.mealList.appendChild(article);
  });
}

function elapsedSeconds(workout = state.workout) {
  const started = new Date(workout?.startedAt || "").getTime();
  return Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
}

function formatTimer(seconds) {
  const total = Math.max(0, Math.trunc(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}` : `${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

function renderWorkout() {
  const workout = state.workout;
  elements.activeWorkout.hidden = !workout;
  if (!workout) return;
  elements.workoutName.textContent = workout.exerciseName || "Treino";
  const isSeries = workout.trackingType === "series";
  const isSteps = workout.trackingType === "steps";
  elements.workoutCounter.textContent = isSeries
    ? `${Number(workout.seriesCount || 0)} séries · ${Number(workout.totalReps || 0)} movimentos`
    : isSteps ? `${state.steps || Number(workout.steps || 0)} passos` : formatTimer(elapsedSeconds(workout));
  elements.workoutDetail.textContent = isSeries
    ? (state.seriesInProgress ? "Série em andamento. Ao terminar, informe os movimentos." : "Progresso salvo. Você pode iniciar uma nova série.")
    : `${formatTimer(elapsedSeconds(workout))} de atividade · progresso salvo no seu perfil`;
  elements.workoutPrimary.hidden = !isSeries;
  if (isSeries) elements.workoutPrimary.textContent = state.seriesInProgress ? "Finalizar série" : "Começar nova série";
}

async function loadDashboard() {
  try {
    const payload = await apiRequest(`/api/200/wellness?profile=${encodeURIComponent(profileName())}`, { cache:"no-store" });
    state.dashboard = payload?.dashboard || {};
    state.workout = state.dashboard.activeWorkout || null;
    state.steps = Number(state.workout?.steps || 0);
    renderMeals(); renderWorkout();
    if (state.workout?.trackingType === "steps") void startStepCounter(false);
  } catch (error) {
    elements.nutritionStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel carregar.";
  }
}

async function startExercise() {
  const exercise = state.selectedExercise;
  if (!exercise || state.workout) return;
  elements.detailStart.disabled = true;
  try {
    const payload = await apiRequest("/api/200/exercises/start", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ profile:profileName(), exerciseId:exercise.id, exerciseName:exercise.name, category:exercise.category, trackingType:exercise.tracking, equipment:exercise.equipment })
    });
    state.workout = payload.workout;
    state.steps = Number(state.workout?.steps || 0);
    state.seriesInProgress = exercise.tracking === "series";
    elements.detail.hidden = true;
    if (exercise.tracking === "steps") await startStepCounter(true);
    renderWorkout();
  } catch (error) {
    elements.detailEquipment.textContent = error instanceof Error ? error.message : "Nao foi possivel iniciar.";
  } finally { elements.detailStart.disabled = false; }
}

async function finishWorkout() {
  if (!state.workout) return;
  elements.workoutFinish.disabled = true;
  try {
    await saveWorkoutProgress();
    await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/finish`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ steps:state.steps })
    });
    stopStepCounter(); state.workout = null; state.seriesInProgress = false; renderWorkout(); await loadDashboard();
  } catch (error) {
    elements.workoutDetail.textContent = error instanceof Error ? error.message : "Nao foi possivel encerrar.";
  } finally { elements.workoutFinish.disabled = false; }
}

async function saveWorkoutProgress() {
  if (!state.workout || state.workout.trackingType === "series") return;
  const payload = await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/progress`, {
    method:"PATCH", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ steps:state.steps, durationMinutes:elapsedSeconds(state.workout) / 60 })
  });
  state.workout = payload.workout || state.workout;
}

function onDeviceMotion(event) {
  if (!state.workout || state.workout.trackingType !== "steps") return;
  const acceleration = event.accelerationIncludingGravity || event.acceleration;
  if (!acceleration) return;
  const magnitude = Math.sqrt((acceleration.x || 0) ** 2 + (acceleration.y || 0) ** 2 + (acceleration.z || 0) ** 2);
  const now = Date.now();
  if (magnitude > 12.2 && magnitude < 24 && now - state.lastStepAt > 280) {
    state.lastStepAt = now; state.steps += 1; renderWorkout();
    if (state.steps % 10 === 0) void saveWorkoutProgress().catch(() => {});
  }
}

async function startStepCounter(requestPermission) {
  if (state.motionListening || !window.DeviceMotionEvent) return;
  try {
    if (requestPermission && typeof DeviceMotionEvent.requestPermission === "function") {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") {
        elements.workoutDetail.textContent = "Permita o sensor de movimento para contar os passos automaticamente."; return;
      }
    }
    window.addEventListener("devicemotion", onDeviceMotion, { passive:true });
    state.motionListening = true;
    state.saveTimer = window.setInterval(() => void saveWorkoutProgress().catch(() => {}), 20000);
  } catch {
    elements.workoutDetail.textContent = "O contador automático de passos não está disponível neste aparelho.";
  }
}

function stopStepCounter() {
  if (state.motionListening) window.removeEventListener("devicemotion", onDeviceMotion);
  state.motionListening = false;
  if (state.saveTimer) window.clearInterval(state.saveTimer);
  state.saveTimer = null;
}

function handleSeriesPrimary() {
  if (!state.workout || state.workout.trackingType !== "series") return;
  if (!state.seriesInProgress) { state.seriesInProgress = true; renderWorkout(); return; }
  elements.repsLayer.hidden = false;
  elements.repsInput.value = "";
  window.setTimeout(() => elements.repsInput.focus(), 50);
}

async function saveSeries(event) {
  event.preventDefault();
  if (!state.workout) return;
  const repetitions = Math.max(1, Math.trunc(Number(elements.repsInput.value || 0) || 0));
  if (!repetitions) return;
  const submit = elements.repsForm.querySelector("button[type=submit]"); submit.disabled = true;
  try {
    const payload = await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/series`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ repetitions })
    });
    state.workout = payload.workout || state.workout;
    state.seriesInProgress = false; elements.repsLayer.hidden = true; renderWorkout();
  } catch (error) {
    elements.workoutDetail.textContent = error instanceof Error ? error.message : "Nao foi possivel salvar a serie.";
  } finally { submit.disabled = false; }
}

function extractMealTime(text) {
  const match = String(text || "").toLowerCase().match(/(?:\b(?:as|às)\s*)?([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?/i);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2,"0")}:${String(Number(match[2] || 0)).padStart(2,"0")}`;
}

function mealDateAt(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

async function submitFood(event) {
  event.preventDefault();
  const description = String(state.pendingMeal || elements.foodInput.value || "").trim();
  if (description.length < 2) { elements.nutritionStatus.textContent = "Conte para Luna o que você comeu."; return; }
  const time = elements.foodTime.value || extractMealTime(description);
  if (!time) {
    state.pendingMeal = description;
    elements.timeQuestion.hidden = false;
    elements.lunaMessage.textContent = "Que horas você comeu isso? Preciso do horário antes de guardar na sua tabela.";
    window.setTimeout(() => elements.foodTime.focus(), 30);
    return;
  }
  elements.foodSend.disabled = true;
  elements.nutritionStatus.textContent = "Luna está estimando calorias e qualidade...";
  try {
    const payload = await apiRequest("/api/200/nutrition/analyze", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ profile:profileName(), description, consumedAt:mealDateAt(time) })
    });
    if (payload.needsTime) {
      elements.timeQuestion.hidden = false;
      elements.lunaMessage.textContent = payload.question || "Que horas você comeu isso?";
      return;
    }
    state.dashboard = payload.dashboard || state.dashboard;
    elements.lunaMessage.textContent = payload.entry?.feedback || "Registro salvo na sua tabela de hoje.";
    elements.foodInput.value = "";
    elements.foodTime.value = "";
    state.pendingMeal = "";
    elements.timeQuestion.hidden = true;
    elements.nutritionStatus.textContent = "Alimento guardado.";
    renderMeals();
  } catch (error) {
    elements.nutritionStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel analisar.";
  } finally {
    elements.foodSend.disabled = false;
  }
}

byId("appsHomeExercisesButton")?.addEventListener("click", () => openWellness("exercises"));
byId("appsHomeNutritionButton")?.addEventListener("click", () => openWellness("nutrition"));
byId("wellnessCloseButton")?.addEventListener("click", closeWellness);
document.querySelectorAll("[data-wellness-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.wellnessTab)));
document.querySelectorAll("[data-exercise-filter]").forEach((button) => button.addEventListener("click", () => {
  state.filter = button.dataset.exerciseFilter || "all";
  document.querySelectorAll("[data-exercise-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderExerciseGrid();
}));
elements.exerciseGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-exercise-id]");
  const exercise = EXERCISES.find((item) => item.id === button?.dataset.exerciseId);
  if (exercise) openExerciseDetail(exercise);
});
byId("wellnessExerciseDetailClose")?.addEventListener("click", () => { elements.detail.hidden = true; });
elements.detail?.addEventListener("click", (event) => { if (event.target === elements.detail) elements.detail.hidden = true; });
elements.detailStart?.addEventListener("click", () => void startExercise());
elements.workoutPrimary?.addEventListener("click", handleSeriesPrimary);
elements.workoutFinish?.addEventListener("click", () => void finishWorkout());
elements.repsForm?.addEventListener("submit", saveSeries);
byId("wellnessRepsCancel")?.addEventListener("click", () => { elements.repsLayer.hidden = true; });
elements.foodForm?.addEventListener("submit", submitFood);

state.ticker = window.setInterval(() => { if (state.workout) renderWorkout(); }, 1000);
window.addEventListener("pagehide", () => { if (state.workout) void saveWorkoutProgress().catch(() => {}); });
window.project200Wellness = { open:openWellness, close:closeWellness, exercises:EXERCISES };
