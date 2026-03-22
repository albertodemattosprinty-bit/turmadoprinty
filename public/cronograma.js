import { initSiteHeader } from "./header.js";

const storageKey = "turma_do_printy_cronograma_state";
const durationForm = document.getElementById("cronograma-duration-form");
const totalMinutesInput = document.getElementById("cronograma-total-minutes");
const durationStatus = document.getElementById("cronograma-duration-status");
const stepOne = document.getElementById("cronograma-step-1");
const stepTwo = document.getElementById("cronograma-step-2");
const boardSummary = document.getElementById("cronograma-board-summary");
const timeline = document.getElementById("cronograma-timeline");
const addButton = document.getElementById("cronograma-add-button");
const deleteButton = document.getElementById("cronograma-delete-button");
const moveLeftButton = document.getElementById("cronograma-move-left-button");
const moveRightButton = document.getElementById("cronograma-move-right-button");
const usedTimeNode = document.getElementById("cronograma-used-time");
const remainingTimeNode = document.getElementById("cronograma-remaining-time");
const selectedPanel = document.getElementById("cronograma-selected-panel");
const addPanel = document.getElementById("cronograma-add-panel");
const closeAddPanelButton = document.getElementById("cronograma-close-add-panel");
const optionsGrid = document.getElementById("cronograma-options-grid");
const addForm = document.getElementById("cronograma-add-form");
const selectedTypeInput = document.getElementById("cronograma-selected-type");
const blockMinutesInput = document.getElementById("cronograma-block-minutes");
const addStatus = document.getElementById("cronograma-add-status");

const blockTypes = [
  { id: "abertura", label: "Abertura", className: "cronograma-type-abertura" },
  { id: "boas-vindas", label: "Boas-vindas", className: "cronograma-type-boas-vindas" },
  { id: "oracao-inicial", label: "Oração inicial", className: "cronograma-type-oracao-inicial" },
  { id: "louvor", label: "Louvor", className: "cronograma-type-louvor" },
  { id: "quebra-gelo", label: "Quebra-gelo", className: "cronograma-type-quebra-gelo" },
  { id: "dinamica", label: "Dinâmica", className: "cronograma-type-dinamica" },
  { id: "brincadeira", label: "Brincadeira", className: "cronograma-type-brincadeira" },
  { id: "historia-biblica", label: "História bíblica", className: "cronograma-type-historia-biblica" },
  { id: "ensino-mensagem", label: "Ensino / Mensagem", className: "cronograma-type-ensino-mensagem" },
  { id: "versiculo-do-dia", label: "Versículo do dia", className: "cronograma-type-versiculo-do-dia" },
  { id: "memorizacao", label: "Memorização", className: "cronograma-type-memorizacao" },
  { id: "atividade-pratica", label: "Atividade prática", className: "cronograma-type-atividade-pratica" },
  { id: "desenho-pintura", label: "Desenho / Pintura", className: "cronograma-type-desenho-pintura" },
  { id: "teatro-encenacao", label: "Teatro / Encenação", className: "cronograma-type-teatro-encenacao" },
  { id: "video", label: "Vídeo", className: "cronograma-type-video" },
  { id: "perguntas-interacao", label: "Perguntas / Interação", className: "cronograma-type-perguntas-interacao" },
  { id: "ofertas", label: "Ofertas", className: "cronograma-type-ofertas" },
  { id: "pedidos-de-oracao", label: "Pedidos de oração", className: "cronograma-type-pedidos-de-oracao" },
  { id: "lanche-encerramento", label: "Lanche / Encerramento", className: "cronograma-type-lanche-encerramento" }
];

let state = loadState();
let selectedBlockId = null;
let selectedTypeId = "";

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
    selectedPanel.hidden = true;
    selectedPanel.innerHTML = "";
    updateToolbarState();
    return;
  }

  const type = getTypeById(selectedBlock.typeId);
  selectedPanel.hidden = false;
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

  timeline.innerHTML = state.blocks.length
    ? state.blocks.map((block) => {
        const type = getTypeById(block.typeId);
        const widthPercent = (block.minutes / state.totalMinutes) * 100;
        return `
          <button
            class="cronograma-block ${type?.className || ""} ${selectedBlockId === block.id ? "is-selected" : ""}"
            type="button"
            data-block-id="${block.id}"
            style="width: ${widthPercent}%"
            title="${type?.label || "Etapa"} - ${block.minutes} min"
          >
            <span>${type?.label || "Etapa"}</span>
            <small>${block.minutes} min</small>
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
    return;
  }

  stepOne.hidden = false;
  stepTwo.hidden = false;
  boardSummary.textContent = `Tempo total da aula: ${state.totalMinutes} minutos. Organize os blocos abaixo com clareza.`;
  usedTimeNode.textContent = `Usado: ${getUsedMinutes()} min`;
  remainingTimeNode.textContent = `Restante: ${getRemainingMinutes()} min`;
  renderTimeline();
  renderSelectedPanel();
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

await initSiteHeader().catch(() => null);
totalMinutesInput.value = state.totalMinutes ? String(state.totalMinutes) : "";
renderOptionsGrid();
renderBoard();
