import { initSiteHeader } from "./header.js";

const storageKey = "turma_do_printy_cronograma_state";
const durationForm = document.getElementById("cronograma-duration-form");
const totalMinutesInput = document.getElementById("cronograma-total-minutes");
const timeDisplay = document.getElementById("cronograma-time-display");
const durationStatus = document.getElementById("cronograma-duration-status");
const stepOne = document.getElementById("cronograma-step-1");
const stepTwo = document.getElementById("cronograma-step-2");
const boardSummary = document.getElementById("cronograma-board-summary");
const timeline = document.getElementById("cronograma-timeline");
const addButton = document.getElementById("cronograma-add-button");
const deleteButton = document.getElementById("cronograma-delete-button");
const startButton = document.getElementById("cronograma-start-button");
const moveLeftButton = document.getElementById("cronograma-move-left-button");
const moveRightButton = document.getElementById("cronograma-move-right-button");
const remainingTimeNode = document.getElementById("cronograma-remaining-time");
const selectedPanelWrap = document.getElementById("cronograma-selected-panel-wrap");
const selectedPanel = document.getElementById("cronograma-selected-panel");
const addPanel = document.getElementById("cronograma-add-panel");
const closeAddPanelButton = document.getElementById("cronograma-close-add-panel");
const optionsGrid = document.getElementById("cronograma-options-grid");
const addForm = document.getElementById("cronograma-add-form");
const selectedTypeInput = document.getElementById("cronograma-selected-type");
const blockMinutesInput = document.getElementById("cronograma-block-minutes");
const addStatus = document.getElementById("cronograma-add-status");
const decreaseTimeButton = document.getElementById("cronograma-decrease-time");
const increaseTimeButton = document.getElementById("cronograma-increase-time");
const resetButton = document.getElementById("cronograma-reset-button");
const fixedBarWrap = document.getElementById("cronograma-fixed-bar-wrap");

const blockTypes = [
  { id: "abertura", label: "Abertura", className: "cronograma-type-abertura", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 8v8l8 5 8-5V8zm0 2.2 5.8 3.6L12 12.4 6.2 8.8z"/></svg>' },
  { id: "boas-vindas", label: "Boas-vindas", className: "cronograma-type-boas-vindas", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m-7 8a7 7 0 0 1 14 0z"/></svg>' },
  { id: "oracao-inicial", label: "Oração inicial", className: "cronograma-type-oracao-inicial", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c2.8 2.3 4.5 4.8 4.5 7.2A4.4 4.4 0 0 1 12 14.6a4.4 4.4 0 0 1-4.5-4.4C7.5 7.8 9.2 5.3 12 3m0 13c4 0 7 1.7 7 4v1H5v-1c0-2.3 3-4 7-4"/></svg>' },
  { id: "louvor", label: "Louvor", className: "cronograma-type-louvor", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v9.1A3.5 3.5 0 1 1 12 10V6l8-2v7.1A3.5 3.5 0 1 1 18 8V4z"/></svg>' },
  { id: "quebra-gelo", label: "Quebra-gelo", className: "cronograma-type-quebra-gelo", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v4H8zm-3 6h14v12H5zm3 3v2h8v-2z"/></svg>' },
  { id: "dinamica", label: "Dinâmica", className: "cronograma-type-dinamica", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.2 4.8L19 9l-4.8 2.2L12 16l-2.2-4.8L5 9l4.8-2.2z"/></svg>' },
  { id: "brincadeira", label: "Brincadeira", className: "cronograma-type-brincadeira", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l3 5-3 11H7L4 9zm2.2 3-1.4 2h8.4l-1.4-2z"/></svg>' },
  { id: "historia-biblica", label: "História bíblica", className: "cronograma-type-historia-biblica", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h10a3 3 0 0 1 3 3v13H9a3 3 0 0 0-3 0zm0 0a3 3 0 0 0-3 3v13h3a3 3 0 0 1 3-3h10"/></svg>' },
  { id: "ensino-mensagem", label: "Ensino / Mensagem", className: "cronograma-type-ensino-mensagem", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H4zm2 2v6h12V7zm1 10h10v2H7z"/></svg>' },
  { id: "versiculo-do-dia", label: "Versículo do dia", className: "cronograma-type-versiculo-do-dia", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2"/></svg>' },
  { id: "memorizacao", label: "Memorização", className: "cronograma-type-memorizacao", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8m1 4v4.2l3 1.8-1 1.7-4-2.4V8z"/></svg>' },
  { id: "atividade-pratica", label: "Atividade prática", className: "cronograma-type-atividade-pratica", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v3H4zm2 5h12v9H6zm3 2v5h2v-5zm4 0v5h2v-5z"/></svg>' },
  { id: "desenho-pintura", label: "Desenho / Pintura", className: "cronograma-type-desenho-pintura", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a1 1 0 0 1 0-2h4a5 5 0 0 0 0-10zm-4 7a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 8 10m3-2a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 11 8m4 2a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 15 10"/></svg>' },
  { id: "teatro-encenacao", label: "Teatro / Encenação", className: "cronograma-type-teatro-encenacao", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v14H4zm4 4a1 1 0 1 0 1 1 1 1 0 0 0-1-1m8 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1m-8 7 2-1 2 1 2-1 2 1"/></svg>' },
  { id: "video", label: "Vídeo", className: "cronograma-type-video", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4zm16 4 4-2v10l-4-2z"/></svg>' },
  { id: "perguntas-interacao", label: "Perguntas / Interação", className: "cronograma-type-perguntas-interacao", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7 3 3 6.1 3 10c0 2.2 1.3 4.1 3.4 5.4L6 21l4.2-2.2A11 11 0 0 0 12 19c5 0 9-3.1 9-7s-4-9-9-9m-.2 11h-1.6v-1.6h1.6zm1.8-5.3-.7.7c-.6.6-.9 1-.9 2h-1.6v-.4c0-.9.3-1.7 1-2.4l1-1a1.6 1.6 0 1 0-2.7-1.1H8.1a3.2 3.2 0 1 1 5.5 2.2"/></svg>' },
  { id: "ofertas", label: "Ofertas", className: "cronograma-type-ofertas", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 7v10l8 5 8-5V7zm1 5h3v2h-2v1h2v2h-2v2h-2v-2H9v-2h3V9H9V7h3V5h2z"/></svg>' },
  { id: "pedidos-de-oracao", label: "Pedidos de oração", className: "cronograma-type-pedidos-de-oracao", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.2-8A5.3 5.3 0 0 1 12 5.5 5.3 5.3 0 0 1 21.2 13c-2.5 3.65-9.2 8-9.2 8"/></svg>' },
  { id: "lanche-encerramento", label: "Lanche / Encerramento", className: "cronograma-type-lanche-encerramento", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h2v8a2 2 0 0 1-2 2zm4 0h2v8a2 2 0 0 1-2 2zm4 0h2v8a4 4 0 0 1-3 3.87V21h-2v-6.13A4 4 0 0 1 9 11V3h2v8a2 2 0 0 0 4 0z"/></svg>' }
];

let state = loadState();
let selectedBlockId = null;
let selectedTypeId = "";
let lessonTimerId = 0;
let lessonStartedAt = 0;

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return {
      totalMinutes: Number(parsed.totalMinutes) || 0,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : []
    };
  } catch {
    return {
      totalMinutes: 0,
      blocks: []
    };
  }
}

function saveState() {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(10, Math.min(480, Number(minutes) || 60));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 1 && remainder === 0) {
    return "Uma hora";
  }

  if (hours === 0) {
    return `${remainder} minutos`;
  }

  const hourLabel = hours === 1 ? "1 hora" : `${hours} horas`;
  if (!remainder) {
    return hourLabel;
  }

  return `${hourLabel} e ${remainder} minutos`;
}

function syncTimeDisplay() {
  const totalMinutes = Math.max(10, Math.min(480, Number(totalMinutesInput.value) || 60));
  totalMinutesInput.value = String(totalMinutes);
  timeDisplay.textContent = formatMinutes(totalMinutes);
}

function generateId() {
  return `cronograma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTypeById(typeId) {
  return blockTypes.find((item) => item.id === typeId) || null;
}

function getUsedMinutes() {
  return state.blocks.reduce((total, block) => total + (Number(block.minutes) || 0), 0);
}

function getRemainingMinutes() {
  return Math.max(state.totalMinutes - getUsedMinutes(), 0);
}

function openAddPanel() {
  addPanel.hidden = false;
}

function closeAddPanel() {
  addPanel.hidden = true;
  selectedTypeId = "";
  selectedTypeInput.value = "";
  blockMinutesInput.value = "";
  addStatus.textContent = "";
  renderOptionsGrid();
}

function renderOptionsGrid() {
  optionsGrid.innerHTML = blockTypes.map((item) => `
    <button class="cronograma-option-card ${item.className} ${selectedTypeId === item.id ? "is-active" : ""}" type="button" data-type-id="${item.id}">
      <strong>${item.label}</strong>
    </button>
  `).join("");

  optionsGrid.querySelectorAll("[data-type-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTypeId = button.dataset.typeId || "";
      selectedTypeInput.value = getTypeById(selectedTypeId)?.label || "";
      renderOptionsGrid();
    });
  });
}

function updateToolbarState() {
  const selectedIndex = state.blocks.findIndex((block) => block.id === selectedBlockId);
  deleteButton.disabled = selectedIndex === -1;
  moveLeftButton.disabled = selectedIndex <= 0;
  moveRightButton.disabled = selectedIndex === -1 || selectedIndex >= state.blocks.length - 1;
}

function renderSelectedPanel() {
  const selectedBlock = state.blocks.find((block) => block.id === selectedBlockId);

  if (!selectedBlock) {
    selectedPanelWrap.hidden = false;
    selectedPanel.innerHTML = `
      <div class="cronograma-selected-card cronograma-selected-default">
        <strong>Minha aula</strong>
      </div>
    `;
    updateToolbarState();
    return;
  }

  const type = getTypeById(selectedBlock.typeId);
  selectedPanelWrap.hidden = false;
  selectedPanel.innerHTML = `
    <div class="cronograma-selected-card ${type?.className || ""}">
      <strong>${type?.label || "Etapa"}</strong>
      <span>${selectedBlock.minutes} min</span>
    </div>
  `;
  updateToolbarState();
}

function renderTimeline() {
  if (!state.totalMinutes) {
    timeline.innerHTML = "";
    return;
  }

  const elapsedMinutes = lessonStartedAt ? Math.floor((Date.now() - lessonStartedAt) / 60000) : 0;
  let accumulatedMinutes = 0;

  timeline.innerHTML = state.blocks.length
    ? state.blocks.map((block) => {
        const type = getTypeById(block.typeId);
        const widthPercent = (block.minutes / state.totalMinutes) * 100;
        const startsAt = accumulatedMinutes;
        accumulatedMinutes += block.minutes;
        const isCurrentBlock = lessonStartedAt && elapsedMinutes >= startsAt && elapsedMinutes < accumulatedMinutes;
        return `
          <button
            class="cronograma-block ${type?.className || ""} ${selectedBlockId === block.id ? "is-selected" : ""} ${lessonStartedAt ? "is-live" : ""} ${isCurrentBlock ? "is-current" : ""}"
            type="button"
            data-block-id="${block.id}"
            style="width: ${widthPercent}%"
            title="${type?.label || "Etapa"} - ${block.minutes} min"
          >
            <span class="cronograma-block-icon ${type?.id === "oracao-inicial" || type?.id === "pedidos-de-oracao" ? "is-blue-icon" : ""}">${type?.icon || ""}</span>
          </button>
        `;
      }).join("")
    : '<div class="cronograma-empty-state">Toque em adicionar para criar o primeiro bloco.</div>';

  timeline.querySelectorAll("[data-block-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedBlockId = button.dataset.blockId || null;
      renderTimeline();
      renderSelectedPanel();
    });
  });
}

function renderBoard() {
  if (!state.totalMinutes) {
    stepTwo.hidden = true;
    addPanel.hidden = true;
    fixedBarWrap.hidden = true;
    selectedPanelWrap.hidden = true;
    document.body.classList.remove("cronograma-planning-mode");
    document.body.classList.remove("cronograma-live-mode");
    return;
  }

  stepOne.hidden = true;
  stepTwo.hidden = false;
  fixedBarWrap.hidden = false;
  selectedPanelWrap.hidden = false;
  document.body.classList.add("cronograma-planning-mode");
  boardSummary.textContent = `Tempo total da aula: ${state.totalMinutes} minutos. Organize os blocos abaixo com clareza.`;
  remainingTimeNode.textContent = `Restante: ${getRemainingMinutes()} min`;
  renderTimeline();
  renderSelectedPanel();
}

function stopLessonTimer() {
  if (lessonTimerId) {
    window.clearInterval(lessonTimerId);
    lessonTimerId = 0;
  }
}

function startLesson() {
  if (!state.blocks.length) {
    return;
  }

  lessonStartedAt = Date.now();
  document.body.classList.add("cronograma-live-mode");
  stopLessonTimer();
  lessonTimerId = window.setInterval(() => {
    const elapsedMinutes = Math.floor((Date.now() - lessonStartedAt) / 60000);
    remainingTimeNode.textContent = `Restante: ${Math.max(state.totalMinutes - elapsedMinutes, 0)} min`;
    renderTimeline();
  }, 1000);
  renderTimeline();
}

durationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const totalMinutes = Number(totalMinutesInput.value || 0);

  if (!Number.isInteger(totalMinutes) || totalMinutes < 10) {
    durationStatus.textContent = "Informe pelo menos 10 minutos para a aula.";
    return;
  }

  if (getUsedMinutes() > totalMinutes) {
    state.blocks = [];
    selectedBlockId = null;
  }

  state.totalMinutes = totalMinutes;
  saveState();
  durationStatus.textContent = "";
  renderBoard();
  stepTwo.scrollIntoView({ behavior: "smooth", block: "start" });
});

decreaseTimeButton.addEventListener("click", () => {
  const nextMinutes = Math.max(10, (Number(totalMinutesInput.value) || 60) - 5);
  totalMinutesInput.value = String(nextMinutes);
  syncTimeDisplay();
});

increaseTimeButton.addEventListener("click", () => {
  const nextMinutes = Math.min(480, (Number(totalMinutesInput.value) || 60) + 5);
  totalMinutesInput.value = String(nextMinutes);
  syncTimeDisplay();
});

addButton.addEventListener("click", () => {
  openAddPanel();
  renderOptionsGrid();
  addPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

closeAddPanelButton.addEventListener("click", () => {
  closeAddPanel();
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const minutes = Number(blockMinutesInput.value || 0);

  if (!selectedTypeId) {
    addStatus.textContent = "Escolha uma etapa antes de definir os minutos.";
    return;
  }

  if (!Number.isInteger(minutes) || minutes < 1) {
    addStatus.textContent = "Defina uma quantidade válida de minutos.";
    return;
  }

  if (getUsedMinutes() + minutes > state.totalMinutes) {
    addStatus.textContent = "Esse bloco ultrapassa o tempo total da aula.";
    return;
  }

  state.blocks.push({
    id: generateId(),
    typeId: selectedTypeId,
    minutes
  });
  saveState();
  closeAddPanel();
  renderBoard();
});

deleteButton.addEventListener("click", () => {
  if (!selectedBlockId) {
    return;
  }

  state.blocks = state.blocks.filter((block) => block.id !== selectedBlockId);
  selectedBlockId = null;
  saveState();
  renderBoard();
});

moveLeftButton.addEventListener("click", () => {
  const index = state.blocks.findIndex((block) => block.id === selectedBlockId);
  if (index <= 0) {
    return;
  }

  [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
  saveState();
  renderBoard();
});

moveRightButton.addEventListener("click", () => {
  const index = state.blocks.findIndex((block) => block.id === selectedBlockId);
  if (index === -1 || index >= state.blocks.length - 1) {
    return;
  }

  [state.blocks[index], state.blocks[index + 1]] = [state.blocks[index + 1], state.blocks[index]];
  saveState();
  renderBoard();
});

resetButton.addEventListener("click", () => {
  stopLessonTimer();
  state = {
    totalMinutes: 0,
    blocks: []
  };
  selectedBlockId = null;
  selectedTypeId = "";
  lessonStartedAt = 0;
  saveState();
  totalMinutesInput.value = "60";
  syncTimeDisplay();
  stepOne.hidden = false;
  stepTwo.hidden = true;
  addPanel.hidden = true;
  document.body.classList.remove("cronograma-planning-mode");
  document.body.classList.remove("cronograma-live-mode");
  fixedBarWrap.hidden = true;
  selectedPanelWrap.hidden = true;
  timeline.innerHTML = "";
});

startButton.addEventListener("click", () => {
  startLesson();
});

await initSiteHeader().catch(() => null);
totalMinutesInput.value = state.totalMinutes ? String(state.totalMinutes) : "60";
syncTimeDisplay();
renderOptionsGrid();
renderBoard();
