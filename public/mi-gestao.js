import { initSiteHeader } from "./header.js";

const storageKey = "turma_do_printy_mi_gestao_state";
const onboarding = document.getElementById("mi-gestao-onboarding");
const dashboard = document.getElementById("mi-gestao-dashboard");
const form = document.getElementById("mi-gestao-form");
const formStatus = document.getElementById("mi-gestao-form-status");
const openOnboardingButton = document.getElementById("open-onboarding-button");
const resetMinistryButton = document.getElementById("reset-ministry-button");
const titleNode = document.getElementById("mi-gestao-title");
const subtitleNode = document.getElementById("mi-gestao-subtitle");
const summaryNode = document.getElementById("mi-gestao-summary");
const roomGrid = document.getElementById("room-grid");
const roomPanel = document.getElementById("room-panel");
const roomSectionCaption = document.getElementById("room-section-caption");
const overviewPills = document.getElementById("overview-pills");
const overviewTeam = document.getElementById("overview-team");
const onboardingSteps = document.getElementById("onboarding-steps");

const steps = [
  "Nome da Igreja",
  "Nome do pastor",
  "Nome do ministério",
  "Seu nome",
  "Seu papel",
  "Quantidade de salas"
];

let state = loadState();
let activeRoomId = state.rooms[0]?.id || null;
let activeChildId = null;
let activeRoomSection = "children";
let isChildrenPanelOpen = true;
let activeAddPanel = null;

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return {
      ministry: parsed.ministry || null,
      rooms: Array.isArray(parsed.rooms)
        ? parsed.rooms.map((room, index) => ({
            id: room?.id || generateId(`room-${index + 1}`),
            name: room?.name || `Sala ${index + 1}`,
            teachers: Array.isArray(room?.teachers) ? room.teachers : [],
            ageRange: String(room?.ageRange || ""),
            children: Array.isArray(room?.children) ? room.children : [],
            materials: Array.isArray(room?.materials) ? room.materials : []
          }))
        : []
    };
  } catch {
    return {
      ministry: null,
      rooms: []
    };
  }
}

function saveState() {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getRoomById(roomId) {
  return state.rooms.find((room) => room.id === roomId) || null;
}

function createRoom(index, role, ownerName) {
  return {
    id: generateId(`room-${index + 1}`),
    name: `Sala ${index + 1}`,
    teachers: role === "Professor" && index === 0 && ownerName ? [{ id: generateId("teacher"), name: ownerName }] : [],
    ageRange: "",
    children: [],
    materials: []
  };
}

function getTeacherSummary(room) {
  const teachers = Array.isArray(room.teachers) ? room.teachers : [];

  if (!teachers.length) {
    return "Sem professores cadastrados";
  }

  if (teachers.length === 1) {
    return `Professor ${teachers[0].name}`;
  }

  return `Professores: ${teachers[0].name} e ${teachers[1].name}${teachers.length > 2 ? ` +${teachers.length - 2}` : ""}`;
}

function countAllChildren() {
  return state.rooms.reduce((total, room) => total + (Array.isArray(room.children) ? room.children.length : 0), 0);
}

function countAllTeachers() {
  return state.rooms.reduce((total, room) => total + (Array.isArray(room.teachers) ? room.teachers.length : 0), 0);
}

function countAllMaterials() {
  return state.rooms.reduce((total, room) => total + (Array.isArray(room.materials) ? room.materials.length : 0), 0);
}

function fillFormFromState() {
  if (!state.ministry) {
    return;
  }

  form.churchName.value = state.ministry.churchName || "";
  form.pastorName.value = state.ministry.pastorName || "";
  form.ministryName.value = state.ministry.ministryName || "";
  form.ownerName.value = state.ministry.ownerName || "";
  form.roomCount.value = String(state.ministry.roomCount || state.rooms.length || 1);
  const roleField = form.querySelector(`input[name="role"][value="${state.ministry.role || "Professor"}"]`);
  if (roleField) {
    roleField.checked = true;
  }
}

function syncStepPreview() {
  const values = [
    form.churchName.value.trim(),
    form.pastorName.value.trim(),
    form.ministryName.value.trim(),
    form.ownerName.value.trim(),
    form.querySelector('input[name="role"]:checked')?.value || "",
    form.roomCount.value.trim()
  ];

  onboardingSteps.innerHTML = steps.map((label, index) => {
    const complete = Boolean(values[index]);
    return `<span class="mi-gestao-step ${complete ? "is-complete" : ""}">${escapeHtml(label)}</span>`;
  }).join("");
}

function openOnboarding() {
  if (state.ministry) {
    formStatus.textContent = "Apenas um departamento pode ser adicionado por enquanto. Você pode editar o cadastro atual.";
  }
  onboarding.hidden = false;
  openOnboardingButton.textContent = "Editar departamento infantil";
  fillFormFromState();
  syncStepPreview();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeOnboarding() {
  if (!state.ministry) {
    return;
  }

  onboarding.hidden = true;
}

function updateHeader() {
  const ministryName = state.ministry?.ministryName?.trim() || "Departamento Infantil";
  const churchName = state.ministry?.churchName?.trim() || "Organize salas, professores, crianças e materiais em um só lugar.";
  const ownerName = state.ministry?.ownerName?.trim() || "";
  const role = state.ministry?.role?.trim() || "";
  const roomCount = state.rooms.length;

  titleNode.textContent = ministryName;
  subtitleNode.textContent = churchName;
  summaryNode.textContent = state.ministry
    ? `${ownerName}${role ? ` • ${role}` : ""} • ${roomCount} sala${roomCount === 1 ? "" : "s"}`
    : "Monte o cadastro inicial do seu ministério para liberar o painel.";
}

function getActionItems() {
  return [
    {
      id: "children",
      label: "Crianças",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12m-6 8a1 1 0 0 1-1-1c0-3.03 3.13-5.5 7-5.5s7 2.47 7 5.5a1 1 0 0 1-1 1z"/></svg>'
    },
    {
      id: "teachers",
      label: "Professores",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 8l10 5 8.18-4.09V15H22V8zM6 12.94V16c0 2.21 2.69 4 6 4s6-1.79 6-4v-3.06l-6 3z"/></svg>'
    },
    {
      id: "materials",
      label: "Materiais",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm3-4h10l1 3H6z"/></svg>'
    }
  ];
}

function renderOverview() {
  if (!state.ministry) {
    overviewPills.innerHTML = "";
    overviewTeam.innerHTML = "";
    return;
  }

  const totalChildren = countAllChildren();
  const totalTeachers = countAllTeachers();
  const totalMaterials = countAllMaterials();
  const pills = [
    `${state.rooms.length} sala${state.rooms.length === 1 ? "" : "s"}`,
    `${totalChildren} criança${totalChildren === 1 ? "" : "s"}`,
    `${totalTeachers} professor${totalTeachers === 1 ? "" : "es"}`,
    `${totalMaterials} material${totalMaterials === 1 ? "" : "is"}`
  ];

  overviewPills.innerHTML = pills.map((pill) => `<span class="mi-gestao-pill">${escapeHtml(pill)}</span>`).join("");

  const teachers = state.rooms
    .flatMap((room) => room.teachers.map((teacher) => ({ roomName: room.name, name: teacher.name })));

  const teamCards = [];

  if (state.ministry?.pastorName) {
    teamCards.push(`
      <article class="mi-gestao-mini-item">
        <strong>Pastor ${escapeHtml(state.ministry.pastorName)}</strong>
        <span>${escapeHtml(state.ministry.churchName || "Igreja cadastrada")}</span>
      </article>
    `);
  }

  if (state.ministry?.ownerName) {
    teamCards.push(`
      <article class="mi-gestao-mini-item">
        <strong>${escapeHtml(state.ministry.ownerName)}</strong>
        <span>${escapeHtml(state.ministry.role || "Responsável")}</span>
      </article>
    `);
  }

  teamCards.push(
    ...teachers.map((teacher) => `
        <article class="mi-gestao-mini-item">
          <strong>${escapeHtml(teacher.name)}</strong>
          <span>${escapeHtml(teacher.roomName)}</span>
        </article>
      `)
  );

  overviewTeam.innerHTML = teamCards.length
    ? teamCards.join("")
    : '<p class="section-muted">Cadastre os professores de cada sala para vê-los aqui.</p>';
}

function renderRoomGrid() {
  if (!state.ministry) {
    roomGrid.innerHTML = "";
    roomSectionCaption.textContent = "";
    return;
  }

  roomSectionCaption.textContent = `${state.rooms.length} container${state.rooms.length === 1 ? "" : "s"} criado${state.rooms.length === 1 ? "" : "s"} com base no número de salas informado.`;

  roomGrid.innerHTML = state.rooms.map((room) => {
    const isActive = room.id === activeRoomId;
    const teacherSummary = escapeHtml(getTeacherSummary(room)).replace(" e ", "<br>");

    return `
      <button class="mi-gestao-room-card ${isActive ? "is-active" : ""}" type="button" data-room-id="${escapeHtml(room.id)}">
        <span class="mi-gestao-room-label">${escapeHtml(room.name)}</span>
        <strong class="mi-gestao-room-main">${teacherSummary}</strong>
        <span class="mi-gestao-room-meta">${room.children.length} criança(s) • ${room.materials.length} material(is)</span>
        <span class="mi-gestao-room-meta">${escapeHtml(room.ageRange || "Faixa etária ainda não definida")}</span>
      </button>
    `;
  }).join("");

  roomGrid.querySelectorAll("[data-room-id]").forEach((button) => {
    button.addEventListener("click", () => {
      activeRoomId = button.dataset.roomId || null;
      activeChildId = null;
      activeRoomSection = "children";
      isChildrenPanelOpen = true;
      activeAddPanel = null;
      renderRoomGrid();
      renderRoomPanel();
    });
  });
}

function renderChildDetail(room, child) {
  return `
    <article class="mi-gestao-child-detail">
      <button class="mi-gestao-panel-close" type="button" data-close-room-panel="true" aria-label="Fechar sala expandida">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
      </button>
      <button class="mi-gestao-back-button" type="button" data-back-to-room="true" aria-label="Voltar para a sala">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 5.3-1.4-1.4L5.2 12l8.1 8.1 1.4-1.4L9 13h9v-2H9z"/></svg>
      </button>
      <div class="mi-gestao-child-detail-head">
        <p class="eyebrow">${escapeHtml(room.name)}</p>
        <h4 class="section-title small">${escapeHtml(child.name)}</h4>
      </div>
      <div class="mi-gestao-detail-grid">
        <article class="mi-gestao-detail-card">
          <span>Data de nascimento</span>
          <strong>${escapeHtml(child.birthDate || "Não informada")}</strong>
        </article>
        <article class="mi-gestao-detail-card">
          <span>Responsável</span>
          <strong>${escapeHtml(child.guardianName || "Não informado")}</strong>
        </article>
        <article class="mi-gestao-detail-card">
          <span>Habilidades</span>
          <strong>${escapeHtml(child.skills || "Nenhuma habilidade cadastrada")}</strong>
        </article>
        <article class="mi-gestao-detail-card">
          <span>Hobbies</span>
          <strong>${escapeHtml(child.hobbies || "Nenhum hobby cadastrado")}</strong>
        </article>
        <article class="mi-gestao-detail-card mi-gestao-detail-card-wide">
          <span>Notas</span>
          <strong>${escapeHtml(child.notes || "Nenhuma informação adicional no momento")}</strong>
        </article>
      </div>
    </article>
  `;
}

function renderRoomPanel() {
  const room = getRoomById(activeRoomId);

  if (!room) {
    roomPanel.hidden = true;
    roomPanel.innerHTML = "";
    return;
  }

  roomPanel.hidden = false;
  roomPanel.classList.add("is-open");

  if (activeChildId) {
    const child = room.children.find((item) => item.id === activeChildId);
    if (child) {
      roomPanel.innerHTML = renderChildDetail(room, child);
      roomPanel.querySelector('[data-close-room-panel]')?.addEventListener("click", () => {
        activeChildId = null;
        activeRoomId = null;
        roomPanel.classList.remove("is-open");
        renderRoomGrid();
        renderRoomPanel();
      });
      roomPanel.querySelector("[data-back-to-room]")?.addEventListener("click", () => {
        activeChildId = null;
        renderRoomPanel();
      });
      return;
    }
  }

  const actions = getActionItems();
  const addPanelContent = {
    child: `
      <div class="mi-gestao-add-panel">
        <div class="mi-gestao-panel-subhead">
          <strong>Adicionar criança</strong>
          <button class="mi-gestao-inline-close" type="button" data-close-add-panel="true" aria-label="Fechar formulário">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
          </button>
        </div>
        <form class="mi-gestao-inline-form" data-form="child">
          <input name="name" type="text" placeholder="Nome" required>
          <input name="birthDate" type="date" placeholder="Data de nascimento">
          <input name="guardianName" type="text" placeholder="Nome do responsável">
          <input name="skills" type="text" placeholder="Habilidades">
          <input name="hobbies" type="text" placeholder="Hobbies">
          <textarea name="notes" rows="3" placeholder="Notas"></textarea>
          <button class="primary-button" type="submit">Salvar criança</button>
        </form>
      </div>
    `,
    teacher: `
      <div class="mi-gestao-add-panel">
        <div class="mi-gestao-panel-subhead">
          <strong>Adicionar professor</strong>
          <button class="mi-gestao-inline-close" type="button" data-close-add-panel="true" aria-label="Fechar formulário">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
          </button>
        </div>
        <form class="mi-gestao-inline-form mi-gestao-inline-form-compact" data-form="teacher">
          <input name="name" type="text" placeholder="Nome do professor" required>
          <button class="primary-button" type="submit">Salvar professor</button>
        </form>
      </div>
    `,
    material: `
      <div class="mi-gestao-add-panel">
        <div class="mi-gestao-panel-subhead">
          <strong>Adicionar material</strong>
          <button class="mi-gestao-inline-close" type="button" data-close-add-panel="true" aria-label="Fechar formulário">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
          </button>
        </div>
        <form class="mi-gestao-inline-form" data-form="material">
          <input name="name" type="text" placeholder="Nome do material" required>
          <select name="type" required>
            <option value="Durável">Durável</option>
            <option value="Não durável">Não durável</option>
          </select>
          <input name="quantity" type="text" placeholder="Quantidade">
          <textarea name="notes" rows="3" placeholder="Observações"></textarea>
          <button class="primary-button" type="submit">Salvar material</button>
        </form>
      </div>
    `
  };
  const sectionContent = {
    children: `
      <article class="mi-gestao-feature-card">
        <div class="mi-gestao-feature-head">
          <div>
            <p class="eyebrow">Crianças</p>
            <h4>Crianças da sala</h4>
          </div>
          <button class="primary-button mi-gestao-add-trigger" type="button" data-open-add-panel="child">Adicionar criança</button>
        </div>
        ${activeAddPanel === "child" ? addPanelContent.child : ""}
        ${isChildrenPanelOpen
          ? `
              <div class="mi-gestao-collection mi-gestao-child-collection">
                <div class="mi-gestao-panel-subhead">
                  <strong>Crianças cadastradas</strong>
                  <button class="mi-gestao-inline-close" type="button" data-hide-children="true" aria-label="Fechar crianças">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
                  </button>
                </div>
                ${room.children.length
                  ? room.children.map((child) => `
                      <button class="mi-gestao-list-card" type="button" data-child-id="${escapeHtml(child.id)}">
                        <strong>${escapeHtml(child.name)}</strong>
                        <span>${escapeHtml(child.guardianName || "Responsável não informado")}</span>
                      </button>
                    `).join("")
                  : '<p class="section-muted">Nenhuma criança cadastrada nesta sala ainda.</p>'}
              </div>
            `
          : `
              <button class="ghost-button mi-gestao-reopen-button" type="button" data-show-children="true">Mostrar crianças cadastradas</button>
            `}
      </article>
    `,
    teachers: `
      <article class="mi-gestao-feature-card">
        <div class="mi-gestao-feature-head">
          <div>
            <p class="eyebrow">Professores</p>
            <h4>Equipe da sala</h4>
          </div>
          <button class="primary-button mi-gestao-add-trigger" type="button" data-open-add-panel="teacher">Adicionar professor</button>
        </div>
        ${activeAddPanel === "teacher" ? addPanelContent.teacher : ""}
        <div class="mi-gestao-collection">
          ${room.teachers.length
            ? room.teachers.map((teacher) => `
                <article class="mi-gestao-mini-item">
                  <strong>${escapeHtml(teacher.name)}</strong>
                  <span>${escapeHtml(room.name)}</span>
                </article>
              `).join("")
            : '<p class="section-muted">Cadastre um ou mais professores para esta sala.</p>'}
        </div>
      </article>
    `,
    materials: `
      <article class="mi-gestao-feature-card">
        <div class="mi-gestao-feature-head">
          <div>
            <p class="eyebrow">Materiais</p>
            <h4>Materiais da sala</h4>
          </div>
          <button class="primary-button mi-gestao-add-trigger" type="button" data-open-add-panel="material">Adicionar material</button>
        </div>
        ${activeAddPanel === "material" ? addPanelContent.material : ""}
        <div class="mi-gestao-collection">
          ${room.materials.length
            ? room.materials.map((material) => `
                <article class="mi-gestao-material-card">
                  <div>
                    <strong>${escapeHtml(material.name)}</strong>
                    <span>${escapeHtml(material.quantity || "Quantidade livre")}</span>
                    ${material.notes ? `<span>${escapeHtml(material.notes)}</span>` : ""}
                  </div>
                  <span class="mi-gestao-tag">${escapeHtml(material.type)}</span>
                </article>
              `).join("")
            : '<p class="section-muted">Cadastre os materiais duráveis e não duráveis desta sala.</p>'}
        </div>
      </article>
    `
  };

  roomPanel.innerHTML = `
    <div class="mi-gestao-room-panel-dialog">
      <button class="mi-gestao-panel-close" type="button" data-close-room-panel="true" aria-label="Fechar sala expandida">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
      </button>
      <div class="mi-gestao-room-panel-head">
        <div>
          <p class="eyebrow">Sala Expandida</p>
          <h3 class="section-title small">${escapeHtml(room.name)}</h3>
        </div>
        <div class="mi-gestao-room-panel-pills">
          <span class="mi-gestao-pill">${room.children.length} crianças</span>
          <span class="mi-gestao-pill">${room.materials.length} materiais</span>
        </div>
      </div>

      <div class="mi-gestao-room-teacher-hero">
        <strong>${escapeHtml(getTeacherSummary(room))}</strong>
      </div>

      <div class="mi-gestao-room-actions" aria-label="Ações da sala">
        ${actions.map((action) => `
          <button class="mi-gestao-action-button ${activeRoomSection === action.id ? "is-active" : ""}" type="button" data-room-section="${escapeHtml(action.id)}">
            <span class="mi-gestao-action-icon">${action.icon}</span>
            <span class="mi-gestao-action-label">${escapeHtml(action.label)}</span>
          </button>
        `).join("")}
      </div>

      <div class="mi-gestao-room-sections">
        ${sectionContent[activeRoomSection] || sectionContent.children}
      </div>
    </div>
  `;

  roomPanel.querySelector('[data-close-room-panel]')?.addEventListener("click", () => {
    activeRoomId = null;
    activeChildId = null;
    roomPanel.classList.remove("is-open");
    renderRoomGrid();
    renderRoomPanel();
  });

  roomPanel.querySelectorAll("[data-room-section]").forEach((button) => {
    button.addEventListener("click", () => {
      activeRoomSection = button.dataset.roomSection || "children";
      activeAddPanel = null;
      renderRoomPanel();
    });
  });

  roomPanel.querySelectorAll("[data-open-add-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAddPanel = button.dataset.openAddPanel || null;
      renderRoomPanel();
    });
  });

  roomPanel.querySelectorAll("[data-close-add-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAddPanel = null;
      renderRoomPanel();
    });
  });

  roomPanel.querySelector('[data-hide-children]')?.addEventListener("click", () => {
    isChildrenPanelOpen = false;
    renderRoomPanel();
  });

  roomPanel.querySelector('[data-show-children]')?.addEventListener("click", () => {
    isChildrenPanelOpen = true;
    renderRoomPanel();
  });

  roomPanel.querySelector('[data-form="child"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    room.children.unshift({
      id: generateId("child"),
      name: String(formData.get("name") || "").trim(),
      birthDate: String(formData.get("birthDate") || "").trim(),
      guardianName: String(formData.get("guardianName") || "").trim(),
      skills: String(formData.get("skills") || "").trim(),
      hobbies: String(formData.get("hobbies") || "").trim(),
      notes: String(formData.get("notes") || "").trim()
    });
    saveState();
    activeAddPanel = null;
    isChildrenPanelOpen = true;
    renderAll();
  });

  roomPanel.querySelector('[data-form="teacher"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return;
    }
    room.teachers.push({
      id: generateId("teacher"),
      name
    });
    saveState();
    activeAddPanel = null;
    renderAll();
  });

  roomPanel.querySelector('[data-form="material"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    room.materials.unshift({
      id: generateId("material"),
      name: String(formData.get("name") || "").trim(),
      type: String(formData.get("type") || "").trim(),
      quantity: String(formData.get("quantity") || "").trim(),
      notes: String(formData.get("notes") || "").trim()
    });
    saveState();
    activeAddPanel = null;
    renderAll();
  });

  roomPanel.querySelectorAll("[data-child-id]").forEach((button) => {
    button.addEventListener("click", () => {
      activeChildId = button.dataset.childId || null;
      renderRoomPanel();
    });
  });
}

function renderAll() {
  const hasMinistry = Boolean(state.ministry);
  updateHeader();
  dashboard.hidden = !hasMinistry;
  resetMinistryButton.hidden = !hasMinistry;
  openOnboardingButton.textContent = hasMinistry ? "Editar departamento infantil" : "Adicionar departamento infantil";
  if (!hasMinistry) {
    onboarding.hidden = false;
  }
  renderOverview();
  renderRoomGrid();
  renderRoomPanel();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const roomCount = Number(form.roomCount.value || 0);
  if (!Number.isInteger(roomCount) || roomCount < 1) {
    formStatus.textContent = "Informe pelo menos 1 sala.";
    return;
  }

  const ministry = {
    churchName: form.churchName.value.trim(),
    pastorName: form.pastorName.value.trim(),
    ministryName: form.ministryName.value.trim(),
    ownerName: form.ownerName.value.trim(),
    role: form.querySelector('input[name="role"]:checked')?.value || "Professor",
    roomCount
  };

  state = {
    ministry,
    rooms: Array.from({ length: roomCount }, (_, index) => {
      const existingRoom = state.rooms[index];
      if (existingRoom) {
        return {
          ...existingRoom,
          name: `Sala ${index + 1}`,
          ageRange: ""
        };
      }
      return createRoom(index, ministry.role, ministry.ownerName);
    })
  };

  activeRoomId = state.rooms[0]?.id || null;
  activeChildId = null;
  activeAddPanel = null;
  saveState();
  formStatus.textContent = "Painel central criado com sucesso.";
  closeOnboarding();
  renderAll();
});

openOnboardingButton.addEventListener("click", () => {
  openOnboarding();
});

resetMinistryButton.addEventListener("click", () => {
  state = {
    ministry: null,
    rooms: []
  };
  activeRoomId = null;
  activeChildId = null;
  window.localStorage.removeItem(storageKey);
  form.reset();
  syncStepPreview();
  formStatus.textContent = "";
  renderAll();
});

form.addEventListener("input", () => {
  formStatus.textContent = "";
  syncStepPreview();
});

document.querySelectorAll('input[name="role"]').forEach((input) => {
  input.addEventListener("change", syncStepPreview);
});

await initSiteHeader().catch(() => null);
fillFormFromState();
syncStepPreview();
renderAll();
