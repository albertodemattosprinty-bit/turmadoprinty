import { getApiUrl } from "/api.js";

const TOKEN_KEY = "turma_do_printy_token";
const $ = (id) => document.getElementById(id);

let state = { users: [], pages: [], presentations: [] };
let activeUserId = "";
let activeDetail = null;
let activeFilter = "all";
let editingPage = null;
let expenseStep = 1;
let expenseDraft = { userId: "", file: null, amountCents: 0, category: "" };

const token = () => localStorage.getItem(TOKEN_KEY) || "";
const auth = (extra = {}) => ({
  ...extra,
  ...(token() ? { Authorization: `Bearer ${token()}` } : {})
});
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[character]));
const money = (cents) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
}).format(Number(cents || 0) / 100);
const date = (value) => {
  if (!value) return "A definir";
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "A definir"
    : new Intl.DateTimeFormat("pt-BR").format(parsed);
};
const dateTime = (value) => {
  if (!value) return "Sem atividade";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Sem atividade"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
};
const duration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  if (total < 60) return `${total}s`;
  if (total < 3600) return `${Math.floor(total / 60)}min`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h${minutes ? ` ${minutes}min` : ""}`;
};
const statusMeta = (status) => status === "CONFIRMED"
  ? ["confirmed", "Confirmado"]
  : status === "REVIEW"
    ? ["review", "Em análise"]
    : ["pending", "Pendente"];
const expenseCategory = (note) => note?.category === "LODGING"
  ? "Hospedagem"
  : note?.category === "FOOD"
    ? "Alimentação"
    : note?.category === "FUEL"
      ? "Combustível"
      : note?.category === "TOLL"
        ? "Pedágio"
        : note?.otherLabel || "Outros";

function syncBodyLock() {
  const hasOpenDialog = [...document.querySelectorAll(".fullscreen-dialog, .centered-dialog")]
    .some((element) => !element.classList.contains("hidden"));
  document.body.classList.toggle("dialog-open", hasOpenDialog);
}

function getUser(userId) {
  return (state.users || []).find((user) => String(user.userId) === String(userId)) || null;
}

function eventStage(user) {
  if (user.status === "scheduled") return "Evento confirmado";
  if (user.termId) return "Termo concluído";
  return "Avaliando proposta";
}

function renderMetrics() {
  const users = state.users || [];
  $("metricPeople").textContent = users.length;
  $("metricAccesses").textContent = users.reduce((sum, user) => sum + Number(user.accessCount || 0), 0);
  $("metricScheduled").textContent = users.filter((user) => user.status === "scheduled").length;
  $("metricAttention").textContent = users.filter((user) => user.hasUnreadUpdate).length;
}

function filteredUsers() {
  const query = $("eventSearch").value.trim().toLocaleLowerCase("pt-BR");
  return (state.users || []).filter((user) => {
    const matchesText = !query || [user.name, user.accountName, user.username, user.presentationName]
      .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query));
    const matchesFilter = activeFilter === "all"
      || (activeFilter === "attention" && user.hasUnreadUpdate)
      || (activeFilter === "scheduled" && user.status === "scheduled")
      || (activeFilter === "open" && user.status !== "scheduled");
    return matchesText && matchesFilter;
  });
}

function renderEvents() {
  const users = filteredUsers();
  $("usersBody").innerHTML = users.map((user) => {
    const status = user.status === "scheduled"
      ? '<span class="status-pill status-pill--scheduled">Confirmado</span>'
      : '<span class="status-pill status-pill--open">Em negociação</span>';
    const noteButton = user.termId
      ? `<button class="button button--success" type="button" data-add-expense="${esc(user.userId)}">Adicionar nota</button>`
      : '<button class="button button--secondary" type="button" disabled title="O termo precisa estar concluído">Adicionar nota</button>';
    const roomButton = user.termId
      ? `<button class="button button--secondary" type="button" data-open-room="${esc(user.userId)}">Abrir sala</button>`
      : '<button class="button button--secondary" type="button" disabled>Aguardando termo</button>';
    return `
      <tr ${user.termId ? `data-open-user="${esc(user.userId)}"` : ""}>
        <td>
          <span class="event-primary">
            <strong>${esc(user.name || "Evento sem nome")}${user.hasUnreadUpdate ? '<span class="attention-dot" title="Nova movimentação"></span>' : ""}</strong>
            <small>@${esc(user.username || "sem usuário")}</small>
          </span>
        </td>
        <td><strong>${esc(eventStage(user))}</strong><span class="cell-detail">${user.eventCount ? `${user.eventCount} evento${user.eventCount === 1 ? "" : "s"}` : "Termo ainda não concluído"}</span></td>
        <td><strong>${user.finalPriceCents ? money(user.finalPriceCents) : "A definir"}</strong><span class="cell-detail">${esc(user.presentationName || "Apresentação não escolhida")}</span></td>
        <td><strong>${dateTime(user.lastAccessAt || user.termCreatedAt)}</strong><span class="cell-detail">${duration(user.activeSeconds)} de interesse · ${Number(user.accessCount || 0)} acessos</span></td>
        <td>${status}</td>
        <td><div class="action-cluster">${noteButton}${roomButton}<button class="button button--danger" type="button" data-delete-event="${esc(user.userId)}">Excluir</button></div></td>
      </tr>
    `;
  }).join("");
  $("eventsEmpty").classList.toggle("hidden", users.length > 0);
  document.querySelector(".table-wrap").classList.toggle("hidden", users.length === 0);
}

function renderCommercialPages() {
  const pages = state.pages || state.coupons || [];
  state.pages = pages;
  $("commercialList").innerHTML = pages.map((page) => {
    const pagePath = page.pagePath || `/${String(page.code || "").toLowerCase()}`;
    return `
      <article class="commercial-card">
        <div class="commercial-card__main">
          <div class="commercial-card__title">
            <a href="${esc(pagePath)}" target="_blank" rel="noopener">${esc(pagePath)}</a>
            <span class="status-pill ${page.active ? "status-pill--success" : "status-pill--inactive"}">${page.active ? "Ativa" : "Inativa"}</span>
          </div>
          <p>${esc(page.presentationName)} · ${Number(page.eventCount || 1)} evento${Number(page.eventCount || 1) === 1 ? "" : "s"} · desconto ${money(page.discountCents)} · transporte ${page.transportAmountCents ? money(page.transportAmountCents) : "sem cobrança"}${page.freeLodging ? " · hospedagem sem cobrança" : ""}</p>
        </div>
        <div class="action-cluster">
          <button class="button button--secondary" type="button" data-edit-page="${esc(page.id)}">Editar</button>
          <button class="button button--secondary" type="button" data-toggle-page="${esc(page.id)}">${page.active ? "Desativar" : "Reativar"}</button>
          <button class="button button--danger" type="button" data-delete-page="${esc(page.id)}">Excluir</button>
        </div>
      </article>
    `;
  }).join("");
  $("commercialEmpty").classList.toggle("hidden", pages.length > 0);
}

function renderPage() {
  renderMetrics();
  renderEvents();
  renderCommercialPages();
  const currentValue = $("presentationSelect").value;
  $("presentationSelect").innerHTML = (state.presentations || [])
    .map((presentation) => `<option value="${esc(presentation.key)}">${esc(presentation.name)} · ${money(presentation.unitPriceCents)}</option>`)
    .join("");
  if (currentValue) $("presentationSelect").value = currentValue;
}

async function load() {
  const response = await fetch(getApiUrl("/api/admin/eventos"), { headers: auth() });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    location.href = "/auth.html?next=/admineventos";
    return;
  }
  if (!response.ok) throw new Error(data.error || "Não foi possível carregar a central de eventos.");
  state = {
    users: data.users || [],
    pages: data.pages || data.coupons || [],
    coupons: data.coupons || [],
    presentations: data.presentations || []
  };
  renderPage();
  $("adminLoading").classList.add("hidden");
  $("adminApp").classList.remove("hidden");
}

function setStatus(element, status) {
  const [className, label] = statusMeta(status);
  element.className = `status-pill status-pill--${className}`;
  element.textContent = label;
}

function renderEventRoom(data) {
  const summary = getUser(activeUserId) || {};
  const answers = data.term.answers || {};
  const workflow = data.workflow || {};

  $("roomAccount").textContent = `${data.user.name || "Contratante"} · @${data.user.username || "usuário"}`;
  $("roomTitle").textContent = answers.igreja || summary.name || "Evento";
  $("roomMeta").innerHTML = [
    `${date(data.term.eventDate)} · ${data.term.eventTime || "horário a definir"}`,
    answers.cidade || "Cidade a definir",
    `${Number(answers.eventCount || summary.eventCount || 1)} evento${Number(answers.eventCount || summary.eventCount || 1) === 1 ? "" : "s"}`
  ].map((item) => `<span class="meta-chip">${esc(item)}</span>`).join("");
  $("roomStatus").className = `status-pill status-pill--${summary.status === "scheduled" ? "scheduled" : "open"}`;
  $("roomStatus").textContent = summary.status === "scheduled" ? "Evento confirmado" : "Em negociação";

  $("overviewUser").textContent = data.user.name || summary.accountName || "—";
  $("overviewPresentation").textContent = answers.presentationName || summary.presentationName || "—";
  $("overviewPrice").textContent = answers.finalPriceCents ? money(answers.finalPriceCents) : summary.finalPriceCents ? money(summary.finalPriceCents) : "—";
  $("overviewAccess").textContent = `${Number(summary.accessCount || 0)} acesso${Number(summary.accessCount || 0) === 1 ? "" : "s"}`;
  $("overviewTime").textContent = duration(summary.activeSeconds);
  $("overviewPage").textContent = answers.eventPagePath || (answers.couponCode ? `/${String(answers.couponCode).toLowerCase()}` : "Entrada direta");

  $("adminPayments").innerHTML = (workflow.payments || []).map((payment) => {
    const [statusClass, statusLabel] = statusMeta(payment.status);
    const title = payment.order === 1 ? "Sinal do evento" : "Pagamento final";
    const action = payment.status === "REVIEW"
      ? `<button class="button button--success button--wide" type="button" data-confirm-payment="${esc(payment.id)}">Confirmar recebimento</button>`
      : payment.status === "CONFIRMED"
        ? '<button class="button button--success button--wide" type="button" disabled>Pagamento quitado</button>'
        : '<button class="button button--secondary button--wide" type="button" disabled>Aguardando o contratante</button>';
    return `
      <article class="item-card">
        <div class="item-card__top">
          <div><h3>${title}</h3><p>Vencimento: ${date(payment.dueDate)}</p></div>
          <span class="status-pill status-pill--${statusClass}">${statusLabel}</span>
        </div>
        <strong class="item-card__value">${esc(payment.amount)}</strong>
        <small>Pago: ${esc(payment.paid || "R$ 0,00")} · Saldo: ${esc(payment.remaining || payment.amount)}</small>
        ${payment.status === "REVIEW" ? `<small>Informado nesta baixa: ${esc(payment.reportedAmount)}</small>` : ""}
        ${action}
      </article>
    `;
  }).join("") || '<div class="empty-state">Nenhuma parcela criada.</div>';

  $("adminExpenseNotes").innerHTML = (workflow.expenseNotes || []).map((note) => `
    <article class="item-card">
      <div class="item-card__top">
        <div><h3>${esc(note.title)}</h3><p>${esc(expenseCategory(note))}</p></div>
        <strong>${esc(note.amount)}</strong>
      </div>
      <button class="button button--secondary button--wide" type="button" data-expense-file="${esc(note.fileUrl)}">Abrir comprovante</button>
    </article>
  `).join("") || '<div class="empty-state">Nenhuma nota de consumo adicionada.</div>';

  const video = workflow.promoVideo;
  $("currentVideo").classList.toggle("hidden", !video);
  if (video) {
    $("currentVideo").dataset.videoFile = video.url;
    $("currentVideo").href = video.url.startsWith("/api/") ? "#" : video.url;
  } else {
    $("currentVideo").dataset.videoFile = "";
    $("currentVideo").removeAttribute("href");
  }
  $("videoFeedback").textContent = video ? `Material atual: ${video.fileName || "vídeo de divulgação"}` : "Nenhum vídeo enviado.";

  const lodging = workflow.lodging || {};
  const lodgingItems = [
    ["Hotel", lodging.hotelName],
    ["Telefone", lodging.phone],
    ["Endereço", lodging.address],
    ["Check-in", date(lodging.checkIn)],
    ["Check-out", date(lodging.checkOut)],
    ["Observações", lodging.notes]
  ];
  $("hotelInfo").innerHTML = lodgingItems.map(([label, value]) => `
    <article class="info-card"><small>${label}</small><strong>${esc(value || "—")}</strong></article>
  `).join("");
  setStatus($("adminLodgingStatus"), lodging.status || "PENDING");
  $("confirmHotel").classList.toggle("hidden", lodging.status !== "REVIEW");
  $("hotelAdminFeedback").textContent = lodging.status === "CONFIRMED"
    ? "Hospedagem conferida e confirmada."
    : lodging.status === "REVIEW"
      ? "O contratante enviou os dados. Faça a conferência antes de confirmar."
      : "Aguardando o envio dos dados pelo contratante.";

  $("adminPdf").href = data.term.pdfUrl;
}

async function openEventRoom(userId) {
  activeUserId = userId;
  $("eventRoom").classList.remove("hidden");
  syncBodyLock();
  $("roomTitle").textContent = "Carregando…";
  const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(userId)}`), { headers: auth() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível abrir a sala do evento.");
  activeDetail = data;
  renderEventRoom(data);
  await load();
}

function closeEventRoom() {
  $("eventRoom").classList.add("hidden");
  activeUserId = "";
  activeDetail = null;
  history.replaceState(null, "", "/admineventos");
  syncBodyLock();
}

async function openExpenseDocument(button) {
  const preview = window.open("", "_blank");
  button.disabled = true;
  try {
    const response = await fetch(getApiUrl(button.dataset.expenseFile), { headers: auth() });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não foi possível abrir o comprovante.");
    }
    const url = URL.createObjectURL(await response.blob());
    if (preview) preview.location.href = url;
    else {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    preview?.close();
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function openPromoVideo(fileUrl, trigger) {
  if (!fileUrl) return;
  if (!fileUrl.startsWith("/api/")) {
    window.open(fileUrl, "_blank", "noopener");
    return;
  }
  const preview = window.open("", "_blank");
  trigger?.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(getApiUrl(fileUrl), { headers: auth() });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não foi possível abrir o vídeo.");
    }
    const url = URL.createObjectURL(await response.blob());
    if (preview) preview.location.href = url;
    else window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (error) {
    preview?.close();
    alert(error.message);
  } finally {
    trigger?.removeAttribute("aria-busy");
  }
}

function renderExpenseStep() {
  document.querySelectorAll("[data-expense-step]").forEach((section) => {
    section.classList.toggle("hidden", Number(section.dataset.expenseStep) !== expenseStep);
  });
  document.querySelectorAll("#expenseProgress span").forEach((dot, index) => {
    dot.classList.toggle("active", index < expenseStep);
  });
  $("expenseBack").classList.toggle("hidden", expenseStep === 1);
  $("expenseNext").textContent = expenseStep === 3 ? "Adicionar nota" : "Avançar";
  $("expenseFeedback").textContent = "";
}

function openExpenseFlow(userId) {
  const user = getUser(userId);
  if (!user?.termId) {
    alert("Este contratante precisa concluir o termo antes de receber uma nota.");
    return;
  }
  expenseDraft = { userId, file: null, amountCents: 0, category: "" };
  expenseStep = 1;
  $("expenseEventName").textContent = `Evento: ${user.name || "Sem nome"} · @${user.username || "usuário"}`;
  $("expenseFile").value = "";
  $("expenseFileName").textContent = "Nenhum arquivo selecionado";
  $("expenseTitle").value = "";
  $("expenseValue").value = "";
  $("expenseOther").value = "";
  $("expenseOtherField").classList.add("hidden");
  document.querySelectorAll(".category-option").forEach((button) => button.classList.remove("selected"));
  renderExpenseStep();
  $("expenseFlow").classList.remove("hidden");
  syncBodyLock();
}

function closeExpenseFlow() {
  $("expenseFlow").classList.add("hidden");
  syncBodyLock();
}

async function submitExpense() {
  const otherLabel = $("expenseOther").value.replace(/\s+/g, " ").trim();
  if (!expenseDraft.category) {
    $("expenseFeedback").textContent = "Escolha uma categoria.";
    return;
  }
  if (expenseDraft.category === "OTHER" && !otherLabel) {
    $("expenseFeedback").textContent = "Explique o tipo de consumo classificado como Outros.";
    $("expenseOther").focus();
    return;
  }

  const button = $("expenseNext");
  const file = expenseDraft.file;
  button.disabled = true;
  $("expenseFeedback").textContent = "Enviando o comprovante com segurança…";
  try {
    const contentType = file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : "image/jpeg");
    const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(expenseDraft.userId)}/expense-notes`), {
      method: "PUT",
      headers: auth({
        "Content-Type": contentType,
        "X-File-Name": encodeURIComponent(file.name),
        "X-Note-Title": encodeURIComponent($("expenseTitle").value.trim()),
        "X-Note-Amount-Cents": String(expenseDraft.amountCents),
        "X-Note-Category": expenseDraft.category,
        "X-Note-Other-Label": encodeURIComponent(otherLabel)
      }),
      body: file
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível adicionar a nota.");
    $("expenseFeedback").textContent = "Nota adicionada e liberada para o contratante.";
    const userId = expenseDraft.userId;
    await load();
    if (!$("eventRoom").classList.contains("hidden") && activeUserId === userId) {
      await openEventRoom(userId);
    }
    window.setTimeout(closeExpenseFlow, 550);
  } catch (error) {
    $("expenseFeedback").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function openCommercialEditor(page) {
  editingPage = page;
  $("commercialEditorTitle").textContent = `Editar ${page.pagePath || `/${String(page.code || "").toLowerCase()}`}`;
  $("editPresentation").innerHTML = (state.presentations || [])
    .map((presentation) => `<option value="${esc(presentation.key)}">${esc(presentation.name)}</option>`)
    .join("");
  $("editDiscount").value = (Number(page.discountCents || 0) / 100).toFixed(2);
  $("editPresentation").value = page.presentationKey;
  $("editEventCount").value = page.eventCount;
  $("editTransportAmount").value = (Number(page.transportAmountCents || 0) / 100).toFixed(2);
  $("editTripType").value = page.transportTripType || "ONE_WAY";
  $("editCityA").value = page.transportCityA || "";
  $("editCityB").value = page.transportCityB || "";
  $("editFreeLodging").checked = Boolean(page.freeLodging);
  $("commercialEditorFeedback").textContent = page.transportDescription || "";
  $("commercialEditor").classList.remove("hidden");
  syncBodyLock();
}

function closeCommercialEditor() {
  $("commercialEditor").classList.add("hidden");
  editingPage = null;
  syncBodyLock();
}

$("refreshBtn").addEventListener("click", async () => {
  $("refreshBtn").disabled = true;
  try { await load(); } catch (error) { alert(error.message); }
  finally { $("refreshBtn").disabled = false; }
});

$("eventSearch").addEventListener("input", renderEvents);
$("eventFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("#eventFilters button").forEach((item) => item.classList.toggle("active", item === button));
  renderEvents();
});

$("usersBody").addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-event]");
  if (deleteButton) {
    event.stopPropagation();
    const user = state.users.find((item) => String(item.userId) === String(deleteButton.dataset.deleteEvent));
    if (!user) return;
    const confirmed = window.confirm(`Excluir este evento de ${user.name || user.username || "este usuario"}?\n\nEle saira do painel e da agenda publica. A conta, o termo, os pagamentos e o historico serao preservados.`);
    if (!confirmed) return;
    deleteButton.disabled = true;
    fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(user.userId)}`), {
      method: "DELETE",
      headers: auth()
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nao foi possivel excluir o evento.");
      await load();
    }).catch((error) => {
      alert(error.message);
      deleteButton.disabled = false;
    });
    return;
  }
  const expenseButton = event.target.closest("[data-add-expense]");
  if (expenseButton) {
    event.stopPropagation();
    openExpenseFlow(expenseButton.dataset.addExpense);
    return;
  }
  const roomButton = event.target.closest("[data-open-room]");
  const row = event.target.closest("[data-open-user]");
  const userId = roomButton?.dataset.openRoom || row?.dataset.openUser;
  if (userId) openEventRoom(userId).catch((error) => alert(error.message));
});

$("closeEventRoom").addEventListener("click", closeEventRoom);
$("roomAddExpense").addEventListener("click", () => {
  if (activeUserId) openExpenseFlow(activeUserId);
});

$("adminPayments").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-confirm-payment]");
  if (!button || !activeUserId) return;
  button.disabled = true;
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(activeUserId)}/payments/${encodeURIComponent(button.dataset.confirmPayment)}`), {
      method: "PATCH",
      headers: auth()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível confirmar o recebimento.");
    await openEventRoom(activeUserId);
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
});

$("adminExpenseNotes").addEventListener("click", (event) => {
  const button = event.target.closest("[data-expense-file]");
  if (button) openExpenseDocument(button);
});

$("currentVideo").addEventListener("click", (event) => {
  const link = $("currentVideo");
  if (link.dataset.videoFile?.startsWith("/api/")) {
    event.preventDefault();
    void openPromoVideo(link.dataset.videoFile, link);
  }
});

$("confirmHotel").addEventListener("click", async () => {
  if (!activeUserId) return;
  $("confirmHotel").disabled = true;
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(activeUserId)}/lodging`), {
      method: "PATCH",
      headers: auth()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível confirmar a hospedagem.");
    await openEventRoom(activeUserId);
  } catch (error) {
    $("hotelAdminFeedback").textContent = error.message;
  } finally {
    $("confirmHotel").disabled = false;
  }
});

$("generateAdminVideo").addEventListener("click", async () => {
  if (!activeUserId) return;
  const button = $("generateAdminVideo");
  button.disabled = true;
  button.textContent = "Gerando vídeo…";
  $("videoFeedback").textContent = "Criando a locução oficial e montando o vídeo. Isso pode levar alguns segundos…";
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(activeUserId)}/video/generate`), {
      method: "POST",
      headers: auth()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível gerar o vídeo.");
    await openEventRoom(activeUserId);
    $("videoFeedback").textContent = data.voiceProvider === "elevenlabs"
      ? "Vídeo gerado com a voz oficial da Turma do Printy."
      : "Vídeo gerado com a voz de segurança.";
  } catch (error) {
    $("videoFeedback").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Gerar automaticamente";
  }
});

$("uploadVideo").addEventListener("click", async () => {
  const file = $("videoFile").files?.[0];
  if (!file) {
    $("videoFeedback").textContent = "Escolha um vídeo antes de enviar.";
    return;
  }
  $("uploadVideo").disabled = true;
  $("videoFeedback").textContent = "Enviando vídeo…";
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/users/${encodeURIComponent(activeUserId)}/video`), {
      method: "PUT",
      headers: auth({
        "Content-Type": file.type || "video/mp4",
        "X-File-Name": encodeURIComponent(file.name)
      }),
      body: file
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível enviar o vídeo.");
    await openEventRoom(activeUserId);
  } catch (error) {
    $("videoFeedback").textContent = error.message;
  } finally {
    $("uploadVideo").disabled = false;
  }
});

$("couponForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("couponFeedback").textContent = "Criando página comercial…";
  const transportAmountCents = Math.round(Number($("transportValue").value || 0) * 100);
  const body = {
    pageSlug: $("couponCode").value,
    discountCents: Math.round(Number($("discountValue").value || 0) * 100),
    presentationKey: $("presentationSelect").value,
    eventCount: Number($("eventCount").value || 1),
    freeTransport: transportAmountCents === 0,
    transportAmountCents,
    freeLodging: $("freeLodging").checked
  };
  try {
    const response = await fetch(getApiUrl("/api/admin/eventos/pages"), {
      method: "POST",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível criar a página.");
    event.target.reset();
    $("eventCount").value = 1;
    $("transportValue").value = 0;
    $("couponFeedback").textContent = `Página ${data.page?.pagePath || "personalizada"} criada.`;
    await load();
  } catch (error) {
    $("couponFeedback").textContent = error.message;
  }
});

$("commercialList").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-page]");
  if (editButton) {
    const page = state.pages.find((item) => String(item.id) === String(editButton.dataset.editPage));
    if (page) openCommercialEditor(page);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-page]");
  if (deleteButton) {
    const page = state.pages.find((item) => String(item.id) === String(deleteButton.dataset.deletePage));
    if (!page) return;
    const pagePath = page.pagePath || `/${String(page.code || "").toLowerCase()}`;
    if (!window.confirm(`Excluir definitivamente o cupom e a pagina ${pagePath}?\n\nEsse endereco deixara de funcionar imediatamente.`)) return;
    deleteButton.disabled = true;
    try {
      const response = await fetch(getApiUrl(`/api/admin/eventos/pages/${encodeURIComponent(page.id)}`), {
        method: "DELETE",
        headers: auth()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nao foi possivel excluir a pagina.");
      await load();
    } catch (error) {
      alert(error.message);
      deleteButton.disabled = false;
    }
    return;
  }
  const toggleButton = event.target.closest("[data-toggle-page]");
  if (!toggleButton) return;
  const page = state.pages.find((item) => String(item.id) === String(toggleButton.dataset.togglePage));
  if (!page) return;
  toggleButton.disabled = true;
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/pages/${encodeURIComponent(page.id)}`), {
      method: "PATCH",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ active: !page.active })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível atualizar a página.");
    await load();
  } catch (error) {
    alert(error.message);
    toggleButton.disabled = false;
  }
});

$("closeCommercialEditor").addEventListener("click", closeCommercialEditor);
$("commercialEditor").addEventListener("click", (event) => {
  if (event.target === $("commercialEditor")) closeCommercialEditor();
});

$("commercialEditorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingPage) return;
  $("commercialEditorFeedback").textContent = "Salvando condição…";
  const transportAmountCents = Math.round(Number($("editTransportAmount").value || 0) * 100);
  const body = {
    discountCents: Math.round(Number($("editDiscount").value || 0) * 100),
    presentationKey: $("editPresentation").value,
    eventCount: Number($("editEventCount").value || 1),
    freeTransport: transportAmountCents === 0,
    transportAmountCents,
    transportTripType: $("editTripType").value,
    transportCityA: $("editCityA").value,
    transportCityB: $("editCityB").value,
    freeLodging: $("editFreeLodging").checked
  };
  try {
    const response = await fetch(getApiUrl(`/api/admin/eventos/pages/${encodeURIComponent(editingPage.id)}`), {
      method: "PATCH",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível salvar a condição.");
    closeCommercialEditor();
    await load();
  } catch (error) {
    $("commercialEditorFeedback").textContent = error.message;
  }
});

$("closeExpenseFlow").addEventListener("click", closeExpenseFlow);
$("expenseFile").addEventListener("change", (event) => {
  expenseDraft.file = event.target.files?.[0] || null;
  $("expenseFileName").textContent = expenseDraft.file ? expenseDraft.file.name : "Nenhum arquivo selecionado";
});
$("expenseValue").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
  expenseDraft.amountCents = Number(digits || 0);
  event.target.value = digits
    ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(expenseDraft.amountCents / 100)
    : "";
});
$("expenseCategories").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  expenseDraft.category = button.dataset.category;
  document.querySelectorAll(".category-option").forEach((item) => item.classList.toggle("selected", item === button));
  $("expenseOtherField").classList.toggle("hidden", expenseDraft.category !== "OTHER");
  if (expenseDraft.category === "OTHER") $("expenseOther").focus();
});
$("expenseBack").addEventListener("click", () => {
  if (expenseStep > 1) {
    expenseStep -= 1;
    renderExpenseStep();
  }
});
$("expenseNext").addEventListener("click", async () => {
  if (expenseStep === 1) {
    if (!expenseDraft.file) {
      alert("Escolha a foto ou o arquivo da nota.");
      return;
    }
    if (expenseDraft.file.size > 20 * 1024 * 1024) {
      alert("O arquivo precisa ter no máximo 20 MB.");
      return;
    }
    expenseStep = 2;
    renderExpenseStep();
    $("expenseTitle").focus();
    return;
  }
  if (expenseStep === 2) {
    const title = $("expenseTitle").value.replace(/\s+/g, " ").trim();
    if (title.length < 2) {
      alert("Escreva um título único para a nota.");
      return;
    }
    if (expenseDraft.amountCents < 1) {
      alert("Informe o valor da nota.");
      return;
    }
    expenseStep = 3;
    renderExpenseStep();
    return;
  }
  await submitExpense();
});

load()
  .then(() => {
    const userId = new URLSearchParams(location.search).get("user");
    if (userId) openEventRoom(userId).catch((error) => alert(error.message));
  })
  .catch((error) => {
    $("adminLoading").innerHTML = `<div><strong>Não foi possível abrir a central.</strong><p>${esc(error.message)}</p></div>`;
  });
