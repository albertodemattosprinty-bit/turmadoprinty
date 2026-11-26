const ICONS = "/midia/icons/contratante/";
const TOKEN_KEY = "turma_do_printy_token";
const slots = [
  { id: "stage", label: "Palco", hint: "Mostre o espaço da apresentação." },
  { id: "audience", label: "Público", hint: "Mostre onde ficará o público." },
  { id: "entrance", label: "Entrada da igreja", hint: "Mostre a entrada do local." }
];
const presentations = {
  "teatro-fantoches": { name: "Econômico Simples", duration: "50 min", team: "2 integrantes" },
  "teatro-palco": { name: "Econômico Plus", duration: "1h15", team: "3 integrantes" },
  "parques-arenas": { name: "Show Completo", duration: "1h30", team: "4 integrantes" },
  "congresso-infantil": { name: "Congresso infantil", duration: "1h15", team: "4 integrantes" },
  "show-completo-2h": { name: "Turma do Printy Experience", duration: "3h", team: "5 integrantes" }
};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));
const icon = (name) => `${ICONS}${name}.svg`;
const detailIcon = (name) => name.startsWith("/") ? name : icon(name);
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` });
let activePayment = null;
let photoContext = null;
let activePhotoIndex = 0;
let photoPreviewObjectUrl = "";
const photoDescriptions = [
  "Fotografe o palco e a área da apresentação de frente, mostrando o espaço completo e os acessos próximos.",
  "Mostre a área onde ficará o público. Se possível, fotografe a partir do palco em direção às cadeiras.",
  "Fotografe a entrada principal da igreja ou do local para a equipe identificar o acesso e planejar a chegada."
];

function daysPastDue(value) {
  if (!value) return 0;
  const due = Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(due)) return 0;
  const today = new Date();
  return Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - due) / 86400000);
}

function dateLabel(value) {
  if (!value) return "Data a definir";
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Data a definir" : new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function badge(payment) {
  if (payment.status === "REVIEW") return ["pending", "Em análise"];
  if (payment.status === "CONFIRMED" || Number(payment.remainingCents || 0) <= 0) return ["confirmed", "Pago"];
  const late = daysPastDue(payment.dueDate);
  if (late <= 0) return ["on-time", "Em dia"];
  if (late <= 3) return ["pending", "Pendente"];
  return ["overdue", "Atrasado"];
}

function eventStatus(payments, isDraft) {
  const overdue = !isDraft && payments.some((payment) => Number(payment.remainingCents || 0) > 0 && daysPastDue(payment.dueDate) >= 15);
  const first = payments.find((payment) => Number(payment.order) === 1) || payments[0];
  if (overdue) return ["cancelled", "Cancelado"];
  if (Number(first?.paidCents || 0) > 0 || first?.status === "CONFIRMED") return ["confirmed", "Confirmado"];
  return ["open", "Em aberto"];
}

function videoDeadline(workflow) {
  if (workflow.promoVideo?.url) return { value: "Vídeo enviado", note: "Material entregue pela equipe.", progress: 100 };
  const payments = workflow.payments || [];
  const first = payments.find((payment) => Number(payment.order) === 1) || payments[0];
  const started = first?.userReportedAt || first?.adminConfirmedAt;
  if (!started) return { value: "Aguardando pagamento", note: "A previsão de 7 dias começa no primeiro pagamento.", progress: 0 };
  const remaining = Math.ceil((new Date(started).getTime() + 7 * 86400000 - Date.now()) / 86400000);
  return remaining > 0
    ? { value: `${remaining} ${remaining === 1 ? "dia restante" : "dias restantes"}`, note: "Prazo previsto para entrega do vídeo pela equipe.", progress: Math.min(100, Math.round((7 - remaining) / 7 * 100)) }
    : { value: "Prazo de 7 dias alcançado", note: "A equipe está preparando o envio do vídeo.", progress: 100 };
}

function detailRow(iconName, value, label) {
  if (!value) return "";
  return `<div class="event-overview__detail" role="group" aria-label="${esc(label)}"><img src="${esc(detailIcon(iconName))}" alt=""><span>${esc(value)}</span></div>`;
}

function ensureHost() {
  let host = document.getElementById("eventOverview");
  if (host) return host;
  host = document.createElement("div");
  host.id = "eventOverview";
  host.className = "event-overview";
  document.querySelector(".draft-note")?.insertAdjacentElement("beforebegin", host);
  host.addEventListener("click", (event) => {
    if (event.target.closest("[data-photo-card]")) { openPhotoDialog(); return; }
    if (event.target.closest("[data-payment-card]")) { openPaymentDialog(); return; }
    const paymentButton = event.target.closest("[data-pay-id]");
    if (paymentButton) openPayment(paymentButton.dataset.payId);
  });
  host.addEventListener("keydown", (event) => {
    if (event.target.closest("[data-photo-card]") && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openPhotoDialog();
    }
    if (event.target.closest("[data-payment-card]") && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openPaymentDialog();
    }
  });
  return host;
}

function progressCard({ iconName, title, value, note, progress, extra = "", attributes = "" }) {
  return `<article class="event-overview__card" ${attributes}><div class="event-overview__card-head"><img src="${icon(iconName)}" alt=""><span>${title}</span></div><strong class="event-overview__value">${esc(value)}</strong><div class="event-overview__track" role="progressbar" aria-label="${title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><small class="event-overview__note">${esc(note)}</small>${extra}</article>`;
}

function renderPayments(workflow) {
  const payments = workflow.payments || [];
  const total = payments.reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.paidCents || 0), 0);
  const percent = total ? Math.min(100, Math.round(paid / total * 100)) : 0;
  const value = total ? `${money(paid)} / ${money(total)}` : "—";
  const note = total ? `${money(paid)} pagos de ${money(total)}. Toque para ver as parcelas e informar um pagamento.` : "Toque para consultar e informar os pagamentos do evento.";
  return progressCard({ iconName: "event-money", title: "Pagamentos", value, note, progress: percent,
    attributes: 'data-payment-card role="button" tabindex="0" aria-label="Abrir pagamentos do evento"' });
}

function renderOverview({ term, workflow }) {
  const host = ensureHost();
  const answers = term?.answers || {};
  workflow = workflow || {};
  const payments = workflow.payments || [];
  const status = eventStatus(payments, Boolean(term?.isDraft));
  const hero = document.querySelector(".hero");
  let statusBadge = document.getElementById("eventOverallStatus");
  if (!statusBadge) {
    statusBadge = document.createElement("span");
    statusBadge.id = "eventOverallStatus";
    hero?.appendChild(statusBadge);
  }
  statusBadge.className = `event-overview__status event-overview__status--${status[0]}`;
  statusBadge.textContent = status[1];

  const video = videoDeadline(workflow);
  const photos = workflow.venuePhotos || {};
  const photoCount = slots.filter((slot) => photos[slot.id]?.url).length;
  const details = presentations[answers.presentationKey] || {};
  const placeType = String(answers.localEvento || "").trim();
  const isChurch = /igreja/i.test(placeType) || /igreja/i.test(String(answers.igreja || ""));
  const date = term?.eventDate
    ? dateLabel(term.eventDate)
    : [answers.dia, answers.mes, answers.ano].filter(Boolean).join(" de ") || "Data a definir";
  const type = answers.presentationName || details.name || answers.tipoEvento || answers.presentationKey;
  const installmentCount = Number(answers.proposalInstallments) || 0;
  const installmentAmount = Number(answers.proposalInstallmentCents) || 0;
  const basePrice = answers.basePrice || (answers.basePriceCents ? money(answers.basePriceCents) : "");
  const transport = answers.transportAmount || (answers.transportAmountCents ? money(answers.transportAmountCents) : "");
  const mealTotal = answers.mealAmount || (answers.mealAmountCents ? money(answers.mealAmountCents) : "");
  const rows = [
    detailRow("event-date", date, "Data do evento"),
    detailRow("event-time", answers.horario || term?.eventTime, "Horário do evento"),
    detailRow("event-type", type, "Tipo de evento"),
    detailRow("event-story", answers.historia, "História escolhida"),
    detailRow(isChurch ? "church" : "event-location", answers.igreja || placeType, isChurch ? "Igreja" : "Local do evento"),
    detailRow("city", answers.cidade, "Cidade"),
    detailRow("event-audience", answers.publicoEstimado ? `${answers.publicoEstimado} pessoas` : "", "Tamanho do público"),
    detailRow("event-duration", details.duration, "Duração"),
    detailRow("event-team", details.team, "Equipe"),
    detailRow("avatar", answers.contratante, "Nome do contratante"),
    detailRow("whatsapp", answers.whatsapp, "Telefone do contratante"),
    detailRow("local-two", answers.endereco, "Endereço do evento"),
    detailRow("local-two", answers.cep, "CEP"),
    detailRow("brazil", "Brasil", "País"),
    detailRow("event-story", answers.elementosEvento, "Elementos escolhidos"),
    detailRow("event-money", basePrice, "Valor base"),
    detailRow("/midia/icons/viagem/carro.svg", transport, "Transporte"),
    detailRow("event-money", answers.finalPrice || (answers.finalPriceCents ? money(answers.finalPriceCents) : ""), "Valor total antes do parcelamento"),
    detailRow("ticket-list", installmentCount ? `${installmentCount}x de ${money(installmentAmount)}` : "", "Parcelamento"),
    detailRow("event-money", answers.proposalFinancedTotalCents ? money(answers.proposalFinancedTotalCents) : "", "Total parcelado"),
    detailRow("/midia/icons/alimentacao.svg", mealTotal || "R$ 0,00", "Refeições"),
    detailRow("event-location", answers.freeLodging === "Sim" ? "Hospedagem sem custo" : "Hospedagem a definir", "Hospedagem")
  ].filter(Boolean).join("");
  host.innerHTML = `
    <div class="event-overview__layout">
      <div class="event-overview__cards">
        ${renderPayments(workflow)}
        ${progressCard({ iconName: "event-video", title: "Vídeo de divulgação", value: video.value, note: video.note, progress: video.progress })}
        ${progressCard({ iconName: "event-photos", title: "Fotos do local", value: `${photoCount} de 3 fotos`, note: "Toque para enviar ou revisar as fotos do evento.", progress: Math.round(photoCount / 3 * 100), attributes: 'data-photo-card role="button" tabindex="0" aria-label="Abrir envio das fotos do local"' })}
      </div>
      <section class="event-overview__details" aria-label="Informações do evento">${rows}</section>
    </div>`;
  document.getElementById("infoSections")?.setAttribute("hidden", "");
  document.getElementById("draftNote")?.toggleAttribute("hidden", !term?.isDraft);
  photoContext = { term, workflow };
  ensurePaymentDialog();
  ensurePhotoDialog();
}

function ensurePaymentDialog() {
  if (document.getElementById("eventPaymentDialog")) return;
  const dialog = document.createElement("section");
  dialog.id = "eventPaymentDialog";
  dialog.className = "event-payment-dialog";
  dialog.hidden = true;
  dialog.innerHTML = `<div class="event-payment-dialog__card" role="dialog" aria-modal="true" aria-labelledby="eventPaymentTitle"><header class="event-payment-dialog__header"><h2 id="eventPaymentTitle">Pagamentos do evento</h2><button class="event-payment-dialog__x" type="button" data-payment-close aria-label="Fechar">×</button></header><div id="eventPaymentList"></div><form id="eventPaymentForm" hidden><p id="eventPaymentSummary"></p><label>Valor pago<input id="eventPaymentAmount" type="number" min="0.01" step="0.01" inputmode="decimal"></label><p id="eventPaymentFeedback" class="event-payment-dialog__feedback" role="status" aria-live="polite"></p><div class="event-payment-dialog__actions"><button class="event-payment-dialog__back" type="button" data-payment-back>Voltar às parcelas</button><button class="event-payment-dialog__submit" type="submit" id="eventPaymentSubmit">Confirmar como pago</button></div></form></div>`;
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-payment-close]")) dialog.hidden = true;
    if (event.target.closest("[data-payment-back]")) {
      document.getElementById("eventPaymentForm").hidden = true;
      document.getElementById("eventPaymentList").hidden = false;
      activePayment = null;
    }
    const paymentButton = event.target.closest("[data-pay-id]");
    if (paymentButton) openPayment(paymentButton.dataset.payId);
  });
  dialog.querySelector("#eventPaymentForm").addEventListener("submit", (event) => { event.preventDefault(); void submitPayment(); });
  document.body.appendChild(dialog);
}

function openPaymentDialog() {
  const dialog = document.getElementById("eventPaymentDialog");
  const list = document.getElementById("eventPaymentList");
  const payments = window.currentContractorEventContext?.workflow?.payments || [];
  document.getElementById("eventPaymentForm").hidden = true;
  activePayment = null;
  list.innerHTML = payments.length ? payments.map((payment) => {
    const [tone, label] = badge(payment);
    const due = payment.dueDate ? `Vencimento: ${dateLabel(payment.dueDate)}` : "Vencimento a definir";
    const paid = Number(payment.paidCents || 0);
    const remaining = Number(payment.remainingCents || 0);
    const canPay = remaining > 0 && payment.status !== "REVIEW";
    return `<article class="event-payment-row"><span class="event-payment-row__dot event-payment-row__dot--${tone}" aria-hidden="true"></span><div class="event-payment-row__info"><strong>${Number(payment.order) || ""}ª parcela · ${esc(payment.amount)}</strong><span>${esc(label)} · ${esc(due)}</span><small>${paid ? `${money(paid)} pagos` : "Ainda não pago"}${remaining ? ` · saldo ${money(remaining)}` : ""}</small></div>${canPay ? `<button class="event-overview__button" type="button" data-pay-id="${esc(payment.id)}">Informar pagamento</button>` : payment.status === "REVIEW" ? `<strong class="event-payment-row__paid">Em análise</strong>` : `<strong class="event-payment-row__paid">Pago</strong>`}</article>`;
  }).join("") : `<p class="event-payment-dialog__empty">Não há parcelas disponíveis para pagamento neste momento.</p>`;
  dialog.hidden = false;
}

function openPayment(paymentId) {
  const event = window.currentContractorEventContext;
  const payment = event?.workflow?.payments?.find((item) => String(item.id) === String(paymentId));
  if (!payment) return;
  activePayment = payment;
  document.getElementById("eventPaymentSummary").textContent = `${payment.order}ª parcela · saldo de ${payment.remaining}`;
  document.getElementById("eventPaymentAmount").value = (Number(payment.remainingCents || 0) / 100).toFixed(2);
  document.getElementById("eventPaymentAmount").max = (Number(payment.remainingCents || 0) / 100).toFixed(2);
  document.getElementById("eventPaymentFeedback").textContent = "";
  document.getElementById("eventPaymentList").hidden = true;
  document.getElementById("eventPaymentForm").hidden = false;
}

function ensurePhotoDialog() {
  if (document.getElementById("eventPhotoDialog")) return;
  const dialog = document.createElement("section");
  dialog.id = "eventPhotoDialog";
  dialog.className = "event-photo-dialog";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "eventPhotoTitle");
  dialog.innerHTML = `<header class="event-photo-dialog__top"><strong>Fotos do local do evento</strong><button class="event-photo-dialog__close" type="button" data-photo-close aria-label="Fechar">×</button></header><div class="event-photo-dialog__content"><p class="event-photo-dialog__step" id="eventPhotoStep"></p><div class="event-photo-dialog__visual" id="eventPhotoVisual"></div><h2 id="eventPhotoTitle"></h2><p class="event-photo-dialog__description" id="eventPhotoDescription"></p><p class="event-photo-dialog__saved" id="eventPhotoFeedback" aria-live="polite"></p><div class="event-photo-dialog__actions"><label class="event-photo-dialog__action">Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-photo-upload></label><label class="event-photo-dialog__action event-photo-dialog__action--camera">Enviar da câmera<input type="file" accept="image/*" capture="environment" data-photo-upload></label></div><nav class="event-photo-dialog__navigation" aria-label="Etapas das fotos"><button type="button" data-photo-prev>← Anterior</button><div class="event-photo-dialog__dots" id="eventPhotoDots"></div><button type="button" data-photo-next>Próxima →</button></nav></div>`;
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-photo-close]")) { closePhotoDialog(); return; }
    if (event.target.closest("[data-photo-prev]")) { activePhotoIndex = Math.max(0, activePhotoIndex - 1); renderPhotoStep(); }
    if (event.target.closest("[data-photo-next]")) { activePhotoIndex = Math.min(slots.length - 1, activePhotoIndex + 1); renderPhotoStep(); }
    const dot = event.target.closest("[data-photo-index]");
    if (dot) { activePhotoIndex = Number(dot.dataset.photoIndex); renderPhotoStep(); }
  });
  dialog.addEventListener("change", (event) => {
    const input = event.target.closest("[data-photo-upload]");
    if (input) void uploadPhoto(input);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) closePhotoDialog();
    if (dialog.hidden) return;
    if (event.key === "ArrowLeft") { activePhotoIndex = Math.max(0, activePhotoIndex - 1); renderPhotoStep(); }
    if (event.key === "ArrowRight") { activePhotoIndex = Math.min(slots.length - 1, activePhotoIndex + 1); renderPhotoStep(); }
  });
  document.body.appendChild(dialog);
}

function openPhotoDialog() {
  ensurePhotoDialog();
  const photos = photoContext?.workflow?.venuePhotos || {};
  const missingIndex = slots.findIndex((slot) => !photos[slot.id]?.url);
  activePhotoIndex = missingIndex < 0 ? 0 : missingIndex;
  document.getElementById("eventPhotoDialog").hidden = false;
  document.body.style.overflow = "hidden";
  renderPhotoStep();
  document.querySelector("[data-photo-close]")?.focus();
}

function closePhotoDialog() {
  const dialog = document.getElementById("eventPhotoDialog");
  if (dialog) dialog.hidden = true;
  document.body.style.overflow = "";
  if (photoPreviewObjectUrl) URL.revokeObjectURL(photoPreviewObjectUrl);
  photoPreviewObjectUrl = "";
}

async function renderPhotoStep() {
  const slot = slots[activePhotoIndex];
  if (!slot) return;
  const photos = photoContext?.workflow?.venuePhotos || {};
  const photo = photos[slot.id];
  const dialog = document.getElementById("eventPhotoDialog");
  if (!dialog) return;
  document.getElementById("eventPhotoStep").textContent = `Foto ${activePhotoIndex + 1} de ${slots.length}`;
  document.getElementById("eventPhotoTitle").textContent = slot.label;
  document.getElementById("eventPhotoDescription").textContent = photoDescriptions[activePhotoIndex];
  document.getElementById("eventPhotoFeedback").textContent = photo?.url ? "Foto já enviada. Se quiser, você pode substituí-la." : "";
  document.getElementById("eventPhotoDots").innerHTML = slots.map((item, index) => `<button type="button" data-photo-index="${index}" aria-label="Foto ${index + 1}: ${item.label}" ${index === activePhotoIndex ? 'aria-current="step"' : ""}></button>`).join("");
  dialog.querySelector("[data-photo-prev]").disabled = activePhotoIndex === 0;
  dialog.querySelector("[data-photo-next]").disabled = activePhotoIndex === slots.length - 1;
  const visual = document.getElementById("eventPhotoVisual");
  if (photoPreviewObjectUrl) URL.revokeObjectURL(photoPreviewObjectUrl);
  photoPreviewObjectUrl = "";
  visual.innerHTML = photo?.url ? "<span>Carregando foto…</span>" : `<img src="${icon("event-photos")}" alt="Ícone de câmera">`;
  if (photo?.url) {
    try {
      const response = await fetch(photo.url, { headers: auth(), cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível abrir a foto salva.");
      const url = URL.createObjectURL(await response.blob());
      if (slots[activePhotoIndex]?.id !== slot.id || dialog.hidden) { URL.revokeObjectURL(url); return; }
      photoPreviewObjectUrl = url;
      visual.innerHTML = `<img data-existing-photo src="${url}" alt="Foto enviada: ${esc(slot.label)}">`;
    } catch {
      if (slots[activePhotoIndex]?.id === slot.id) visual.innerHTML = `<img src="${icon("event-photos")}" alt="Ícone de câmera"><span>Foto enviada</span>`;
    }
  }
}

async function uploadPhoto(input) {
  const slot = slots[activePhotoIndex];
  const file = input.files?.[0];
  if (!slot || !file) return;
  const feedback = document.getElementById("eventPhotoFeedback");
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]).has(file.type.toLowerCase())) { feedback.textContent = "Escolha uma imagem JPG, PNG, WebP ou HEIC."; input.value = ""; return; }
  if (file.size > 15 * 1024 * 1024) { feedback.textContent = "A foto precisa ter até 15 MB."; input.value = ""; return; }
  feedback.textContent = "Enviando foto…";
  input.disabled = true;
  try {
    const response = await fetch(`/api/contractor-panel/venue-photos/${slot.id}`, {
      method: "POST", headers: { ...auth(), "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível enviar esta foto.");
    photoContext.workflow.venuePhotos[slot.id] = payload.photo;
    renderOverview(photoContext);
    document.getElementById("eventPhotoDialog").hidden = false;
    document.body.style.overflow = "hidden";
    await renderPhotoStep();
    document.getElementById("eventPhotoFeedback").textContent = "Foto enviada com sucesso.";
  } catch (error) { feedback.textContent = error.message || "Não foi possível enviar esta foto."; }
  finally { input.disabled = false; input.value = ""; }
}

async function submitPayment() {
  if (!activePayment) return;
  const input = document.getElementById("eventPaymentAmount");
  const feedback = document.getElementById("eventPaymentFeedback");
  const amountCents = Math.round(Number(input.value) * 100);
  if (amountCents < 1 || amountCents > Number(activePayment.remainingCents || 0)) { feedback.textContent = "Informe um valor válido até o saldo restante."; return; }
  const button = document.getElementById("eventPaymentSubmit");
  button.disabled = true;
  feedback.textContent = "Registrando pagamento…";
  try {
    const response = await fetch(`/api/contractor-panel/payments/${encodeURIComponent(activePayment.id)}/report`, {
      method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ amountCents })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível registrar o pagamento.");
    feedback.textContent = "Pagamento registrado e contabilizado como pago.";
    window.location.reload();
  } catch (error) { feedback.textContent = error.message || "Não foi possível registrar o pagamento."; }
  finally { button.disabled = false; }
}

window.addEventListener("contractor-event-panel-ready", (event) => {
  window.currentContractorEventContext = event.detail || {};
  renderOverview(window.currentContractorEventContext);
});

if (window.contractorEventPanelData && !window.currentContractorEventContext) {
  window.currentContractorEventContext = window.contractorEventPanelData;
  renderOverview(window.currentContractorEventContext);
}
