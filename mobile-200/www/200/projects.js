const ctx = window.project200ProjectsContext;

if (ctx) {
  let records = [];
  let draft = null;
  let pickerType = "";
  let pickerSelection = new Set();
  let stepMinutes = 5;
  let progressTicker = null;
  let pendingCreator = null;
  let creatorWasActive = false;
  const syncedProgress = new Map();

  const byId = (id) => document.getElementById(id);
  const todayKey = () => {
    const date = new Date(ctx.getServerNowMs());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const active = (project) => String(project?.startsOn || "") <= todayKey() && String(project?.endsOn || "") >= todayKey();
  const durations = (() => {
    const values = [];
    for (let days = 3; days <= 30; days += 1) values.push({ days, months: 0, label: `${days} dias` });
    for (let months = 1; months <= 12; months += 1) values.push({ days: 0, months, label: months === 1 ? "1 mês" : `${months} meses` });
    for (let months = 15; months <= 120; months += 3) {
      const years = Math.floor(months / 12);
      const rest = months % 12;
      values.push({ days: 0, months, label: rest ? `${years} ${years === 1 ? "ano" : "anos"} e ${rest} meses` : `${years} ${years === 1 ? "ano" : "anos"}` });
    }
    return values;
  })();

  function itemStatus(item) {
    if (item.itemType === "step") return { percent: item.completedAt ? 100 : 0, broken: false };
    if (item.itemType === "action") {
      const action = ctx.state.actions.find((entry) => String(entry.id) === String(item.itemId));
      return { percent: ctx.normalizeActionStatus(action?.status) === ctx.actionStatuses.completed ? 100 : 0, broken: false };
    }
    const goal = [...(ctx.state.missions || []), ...(ctx.state.actionMissions || [])].find((entry) => String(entry.id) === String(item.itemId));
    if (item.itemType === "limit") {
      const broken = Number(goal?.progressValue || 0) > 0;
      return { percent: broken ? 0 : 100, broken };
    }
    const target = Math.max(1, Number(goal?.targetValue || 1));
    return { percent: Math.round(Math.min(100, (Number(goal?.progressValue || 0) / target) * 100)), broken: false };
  }

  function progress(project) {
    const values = (project.items || []).map((item) => itemStatus(item).percent);
    const value = values.length ? Math.round(values.reduce((sum, current) => sum + current, 0) / values.length) : 0;
    return { daily: value, total: project.finalPercent == null ? Math.round(Number(project.overallPercent ?? value)) : Math.round(Number(project.finalPercent)) };
  }

  function syncDailyProgress(project, value) {
    if (!active(project)) return;
    const key = `${project.id}:${todayKey()}`;
    if (syncedProgress.get(key) === value) return;
    syncedProgress.set(key, value);
    void ctx.apiRequest(`/api/200/projects/${project.id}/progress`, { method: "PUT", body: JSON.stringify({ percent: value }) })
      .then((payload) => { project.overallPercent = Number(payload?.overallPercent ?? project.overallPercent ?? value); })
      .catch(() => syncedProgress.delete(key));
  }

  function linked(type, id) {
    return records.filter(active).some((project) => (project.items || []).some((item) => item.itemType === type && String(item.itemId) === String(id)));
  }

  function updateProgressLabels() {
    const rotatingTotalMode = Date.now() % 4000 < 1500;
    document.querySelectorAll("[data-actions-project-id]").forEach((card) => {
      const project = records.find((entry) => String(entry.id) === String(card.dataset.actionsProjectId));
      if (!project) return;
      const values = progress(project);
      const totalMode = !active(project) || rotatingTotalMode;
      const value = totalMode ? values.total : values.daily;
      card.querySelector(".actions-project-label").textContent = totalMode ? `${value}% total do projeto` : `${value}% concluído hoje`;
      const fill = card.querySelector(".actions-project-fill");
      fill.style.width = `${value}%`;
      const brokenLimit = (project.items || []).some((item) => item.itemType === "limit" && itemStatus(item).broken);
      fill.style.background = !totalMode && brokenLimit ? "#f59e0b" : "#2f8dff";
    });
  }

  function renderInto(list) {
    document.querySelectorAll("#actionsMissionsList [data-actions-mission-goal-id]").forEach((card) => {
      const goalId = String(card.dataset.actionsMissionGoalId || "");
      if (!linked("mission", goalId) && !linked("limit", goalId)) return;
      const title = card.querySelector(".history-mission-card-title");
      if (title && !title.querySelector(".project-star")) title.insertAdjacentHTML("afterbegin", '<span class="project-star">★</span>');
    });
    records.forEach((project) => {
      const values = progress(project);
      syncDailyProgress(project, values.daily);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "actions-project-card";
      card.dataset.actionsProjectId = project.id;
      const brokenLimit = (project.items || []).some((item) => item.itemType === "limit" && itemStatus(item).broken);
      card.innerHTML = `<span class="actions-project-card-head"><strong>${ctx.escapeHtml(project.name)}</strong><small>${ctx.escapeHtml(project.endsOn)}</small></span><span class="actions-project-label">${values.daily}% concluído hoje</span><span class="actions-project-track"><span class="actions-project-fill" style="width:${values.daily}%;background:${brokenLimit ? "#f59e0b" : "#2f8dff"}"></span></span>`;
      list.appendChild(card);
    });
    records.filter(active).flatMap((project) => (project.items || []).map((item) => ({ project, item })))
      .filter(({ item }) => item.itemType === "step" && !item.completedAt)
      .forEach(({ project, item }) => {
        const row = document.createElement("article");
        row.className = "task-row task-pending-clean project-step-action";
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.dataset.projectStepId = item.id;
        row.dataset.projectId = project.id;
        row.innerHTML = `<div class="task-main"><div class="task-title"><span class="project-star">★</span>${ctx.escapeHtml(item.title)}</div><div class="task-assignee task-duration">${ctx.formatMinutesHuman(item.durationMinutes)} · ${ctx.escapeHtml(project.name)}</div></div><div class="task-time">Hoje</div>`;
        list.appendChild(row);
      });
    if (!progressTicker) progressTicker = window.setInterval(updateProgressLabels, 500);
  }

  async function load() {
    if (!ctx.getToken()) return;
    try {
      const payload = await ctx.apiRequest(`/api/200/projects?profile=${encodeURIComponent(ctx.state.selectedProfile)}`);
      records = Array.isArray(payload?.projects) ? payload.projects : [];
      if (ctx.actionsModal?.classList.contains("active")) ctx.renderActions();
    } catch {
      records = [];
    }
  }

  function renderItems() {
    const labels = { step: "Etapa", action: "Agenda", mission: "Missão", limit: "Limite" };
    byId("projectItemsList").innerHTML = (draft?.items || []).map((item, index) => {
      const warning = item.itemType === "limit" && itemStatus(item).broken ? "Limite quebrado" : labels[item.itemType];
      return `<div class="project-item-row"><span><strong>${ctx.escapeHtml(item.title || labels[item.itemType])}</strong><small>${warning}</small></span><button class="project-item-remove" type="button" data-project-item-remove="${index}" aria-label="Remover">×</button></div>`;
    }).join("");
  }

  function renderWizard() {
    if (!draft) return;
    document.querySelectorAll("[data-project-step]").forEach((step) => step.classList.toggle("is-active", Number(step.dataset.projectStep) === draft.step));
    byId("projectWizardStepLabel").textContent = `${draft.step} de 3`;
    byId("projectDurationLabel").textContent = durations[draft.durationIndex].label;
    byId("projectWizardNext").textContent = draft.step === 3 ? (draft.id ? "Salvar projeto" : "Criar projeto") : "Continuar";
    byId("projectWizardBack").style.visibility = draft.step === 1 ? "hidden" : "visible";
    renderItems();
  }

  function openWizard(kind = "project", project = null) {
    if (project) {
      draft = { id: project.id, kind: project.kind, step: 3, durationIndex: 0, items: (project.items || []).map((item) => ({ ...item })) };
      byId("projectNameInput").value = project.name;
    } else {
      draft = { id: "", kind, step: 1, durationIndex: 0, items: [] };
      byId("projectNameInput").value = "";
    }
    renderWizard();
    ctx.openModal("projectWizardModal");
  }

  function closeLayers() {
    ["projectItemMenu", "projectSourceChoice", "projectStepEditor", "projectListPicker"].forEach((id) => { byId(id).hidden = true; });
  }

  function sourceItems(type) {
    if (type === "action") {
      const seen = new Set();
      return (ctx.state.actions || []).filter((item) => {
        const key = String(item.repeatGroupId || item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map((item) => ({ id: item.id, title: ctx.formatActionTitleForDisplay(item.title) }));
    }
    return (ctx.state.missions || []).filter((goal) => type === "limit" ? ctx.isLimitGoal(goal) : !ctx.isLimitGoal(goal)).map((goal) => ({ id: goal.id, title: goal.title }));
  }

  function renderPicker() {
    const existing = new Set((draft.items || []).filter((item) => item.itemType === pickerType).map((item) => String(item.itemId)));
    byId("projectListPickerItems").innerHTML = sourceItems(pickerType).map((item) => {
      const selected = pickerSelection.has(String(item.id)) || existing.has(String(item.id));
      return `<button class="project-list-option${selected ? " is-selected" : ""}" type="button" data-project-pick="${ctx.escapeHtml(String(item.id))}"><span>${ctx.escapeHtml(item.title)}</span><i>${selected ? "✓" : "+"}</i></button>`;
    }).join("");
    byId("projectListCount").textContent = `+${pickerSelection.size}`;
  }

  async function save() {
    const name = String(byId("projectNameInput").value || "").trim();
    if (draft.id) {
      const payload = await ctx.apiRequest(`/api/200/projects/${encodeURIComponent(draft.id)}/items`, { method: "PUT", body: JSON.stringify({ profile: ctx.state.selectedProfile, items: draft.items }) });
      records = records.map((project) => project.id === payload.project.id ? payload.project : project);
    } else {
      const duration = durations[draft.durationIndex];
      const starts = new Date(ctx.getServerNowMs());
      const ends = new Date(starts);
      if (duration.months) ends.setMonth(ends.getMonth() + duration.months); else ends.setDate(ends.getDate() + duration.days);
      const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const payload = await ctx.apiRequest("/api/200/projects", { method: "POST", body: JSON.stringify({ profile: ctx.state.selectedProfile, name, kind: draft.kind, startsOn: dateKey(starts), endsOn: dateKey(ends), items: draft.items }) });
      records = [payload.project, ...records];
    }
    ctx.closeModal("projectWizardModal");
    ctx.renderActions();
  }

  byId("projectWizardNext")?.addEventListener("click", async () => {
    const status = byId("projectWizardStatus");
    if (draft.step === 1 && !byId("projectNameInput").value.trim()) return void (status.textContent = "Dê um nome ao projeto.");
    status.textContent = "";
    if (draft.step < 3) { draft.step += 1; renderWizard(); return; }
    try { await save(); } catch (error) { status.textContent = error instanceof Error ? error.message : "Não foi possível salvar."; }
  });
  byId("projectWizardBack")?.addEventListener("click", () => { if (draft?.step > 1) { draft.step -= 1; closeLayers(); renderWizard(); } });
  byId("projectWizardClose")?.addEventListener("click", () => ctx.closeModal("projectWizardModal"));
  byId("projectDurationPrev")?.addEventListener("click", () => { draft.durationIndex = Math.max(0, draft.durationIndex - 1); renderWizard(); });
  byId("projectDurationNext")?.addEventListener("click", () => { draft.durationIndex = Math.min(durations.length - 1, draft.durationIndex + 1); renderWizard(); });
  byId("projectAddItem")?.addEventListener("click", () => { closeLayers(); byId("projectItemMenu").hidden = false; });
  byId("projectItemMenu")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-item-type]");
    if (!button) return;
    pickerType = button.dataset.projectItemType;
    closeLayers();
    byId(pickerType === "step" ? "projectStepEditor" : "projectSourceChoice").hidden = false;
  });
  byId("projectSourceChoice")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-source]");
    if (!button) return;
    if (button.dataset.projectSource === "new") {
      pendingCreator = { type: pickerType, before: new Set(sourceItems(pickerType).map((item) => String(item.id))) };
      creatorWasActive = false;
      closeLayers();
      ctx.closeModal("projectWizardModal");
      if (pickerType === "action") ctx.openTaskComposer(); else ctx.openMissionCreateModal();
      return;
    }
    pickerSelection = new Set();
    closeLayers();
    byId("projectListPicker").hidden = false;
    renderPicker();
  });
  byId("projectListPickerItems")?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-project-pick]");
    if (!option) return;
    const id = String(option.dataset.projectPick);
    if (pickerSelection.has(id)) pickerSelection.delete(id); else pickerSelection.add(id);
    renderPicker();
  });
  byId("projectListConfirm")?.addEventListener("click", () => {
    const source = sourceItems(pickerType);
    pickerSelection.forEach((id) => {
      if (draft.items.some((item) => item.itemType === pickerType && String(item.itemId) === id)) return;
      const item = source.find((entry) => String(entry.id) === id);
      if (item) draft.items.push({ itemType: pickerType, itemId: id, title: item.title, durationMinutes: 5 });
    });
    closeLayers(); renderItems();
  });
  document.querySelectorAll("[data-project-step-time]").forEach((button) => button.addEventListener("click", () => {
    stepMinutes = Math.max(1, Math.min(1440, stepMinutes + Number(button.dataset.projectStepTime || 0)));
    byId("projectStepTimeLabel").textContent = ctx.formatMinutesHuman(stepMinutes);
  }));
  byId("projectStepAdd")?.addEventListener("click", () => {
    const title = byId("projectStepTitle").value.trim();
    if (!title) return;
    draft.items.push({ itemType: "step", itemId: null, title, durationMinutes: stepMinutes });
    byId("projectStepTitle").value = ""; stepMinutes = 5; byId("projectStepTimeLabel").textContent = "5 minutos"; closeLayers(); renderItems();
  });
  byId("projectItemsList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-item-remove]");
    if (!button) return;
    draft.items.splice(Number(button.dataset.projectItemRemove), 1); renderItems();
  });
  byId("actionsCreateMenu")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-actions-create]");
    if (!button) return;
    byId("actionsCreateMenu").hidden = true;
    if (button.dataset.actionsCreate === "agenda") ctx.openTaskComposer();
    else if (button.dataset.actionsCreate === "mission") ctx.openMissionCreateModal();
    else openWizard(button.dataset.actionsCreate);
  });
  ctx.actionsList.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-actions-project-id]");
    if (card) {
      const project = records.find((entry) => String(entry.id) === String(card.dataset.actionsProjectId));
      if (project) openWizard(project.kind, project);
      return;
    }
    const row = event.target.closest("[data-project-step-id]");
    if (!row) return;
    event.stopImmediatePropagation();
    const project = records.find((entry) => String(entry.id) === String(row.dataset.projectId));
    const item = project?.items?.find((entry) => String(entry.id) === String(row.dataset.projectStepId));
    if (!item) return;
    item.completedAt = new Date().toISOString(); ctx.renderActions();
    try { await ctx.apiRequest(`/api/200/projects/${project.id}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ completed: true }) }); }
    catch { item.completedAt = null; ctx.renderActions(); }
  }, true);


  const creatorElements = [byId("actionWizard"), byId("startDecisionModal"), byId("missionCreateModal")].filter(Boolean);
  if (creatorElements.length) {
    const creatorObserver = new MutationObserver(async () => {
      if (!pendingCreator) return;
      const anyActive = creatorElements.some((element) => element.classList.contains("active"));
      if (anyActive) {
        creatorWasActive = true;
        return;
      }
      if (!creatorWasActive) return;
      const pending = pendingCreator;
      pendingCreator = null;
      creatorWasActive = false;
      if (pending.type === "action") await ctx.loadActions({ silent: true });
      else await ctx.loadMissions();
      const created = sourceItems(pending.type).find((item) => !pending.before.has(String(item.id)));
      if (created && !draft.items.some((item) => item.itemType === pending.type && String(item.itemId) === String(created.id))) {
        draft.items.push({ itemType: pending.type, itemId: String(created.id), title: created.title, durationMinutes: 5 });
      }
      renderWizard();
      ctx.openModal("projectWizardModal");
    });
    creatorElements.forEach((element) => creatorObserver.observe(element, { attributes: true, attributeFilter: ["class"] }));
  }

  window.project200Projects = {
    load,
    renderInto,
    isLinked: linked,
    toggleCreateMenu() { const menu = byId("actionsCreateMenu"); menu.hidden = !menu.hidden; }
  };
}
