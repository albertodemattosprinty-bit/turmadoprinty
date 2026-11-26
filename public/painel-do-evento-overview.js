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
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` });
let activePayment = null;

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
  if (late <= 0) return ["confirmed", "Em dia"];
  if (late <= 3) return ["pending", "Pendente"];
  return ["cancelled", "Atrasado"];
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
  return `<div class="event-overview__detail" role="group" aria-label="${esc(label)}"><img src="${icon(iconName)}" alt=""><span>${esc(value)}</span></div>`;
}

function ensureHost() {
  let host = document.getElementById("eventOverview");
  if (host) return host;
  host = document.createElement("div");
  host.id = "eventOverview";
  host.className = "event-overview";
  document.querySelector(".draft-note")?.insertAdjacentElement("beforebegin", host);
  host.addEventListener("click", (event) => {
    const paymentButton = event.target.closest("[data-pay-id]");
    if (paymentButton) openPayment(paymentButton.dataset.payId);
  });
  host.addEventListener("change", (event) => {
    const input = event.target.closest("[data-photo-slot]");
    if (input) void uploadPhoto(input);
  });
  return host;
}

function progressCard({ iconName, title, value, note, progress, extra = "" }) {
  return `<article class="event-overview__card"><div class="event-overview__card-head"><img src="${icon(iconName)}" alt=""><span>${title}</span></div><strong class="event-overview__value">${esc(value)}</strong><div class="event-overview__track" role="progressbar" aria-label="${title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><small class="event-overview__note">${esc(note)}</small>${extra}</article>`;
}

function renderPayments(workflow) {
  const payments = workflow.payments || [];
  const total = payments.reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.paidCents || 0), 0);
  const percent = total ? Math.min(100, Math.round(paid / total * 100)) : 0;
  const rows = payments.map((payment) => {
    const [tone, label] = badge(payment);
    const rest = Number(payment.remainingCents || 0);
    const due = payment.dueDate ? ` · vence ${dateLabel(payment.dueDate)}` : "";
    return `<div class="event-overview__payment"><span><strong>${Number(payment.order) || ""}ª parcela</strong> · <span class="event-overview__payment-status event-overview__payment-status--${tone}">${esc(label)}</span>${esc(due)}</span>${rest > 0 ? `<button class="event-overview__button" type="button" data-pay-id="${esc(payment.id)}">Informar pagamento</button>` : `<strong>${tone === "confirmed" ? "Pago" : esc(label)}</strong>`}</div>`;
  }).join("");
  const value = total ? `${money(paid)} / ${money(total)}` : "Aguardando proposta final";
  const note = total ? `${money(paid)} pagos de ${money(total)}. Ao informar, o valor entra automaticamente como pago.` : "Os valores serão exibidos quando a proposta for finalizada.";
  return progressCard({ iconName: "event-money", title: "Pagamentos", value, note, progress: percent,
    extra: rows ? `<div class="event-overview__payments">${rows}</div>` : "" });
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
  const address = [answers.endereco, answers.cep].filter(Boolean).join(" · ");
  const where = [answers.igreja, answers.localEvento, answers.cidade].filter(Boolean).join(" · ");
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
    detailRow("event-location", where, "Igreja, local e cidade"),
    detailRow("event-audience", answers.publicoEstimado ? `${answers.publicoEstimado} pessoas` : "", "Tamanho do público"),
    detailRow("event-duration", details.duration, "Duração"),
    detailRow("event-team", details.team, "Equipe"),
    detailRow("event-team", answers.contratante, "Nome do contratante"),
    detailRow("event-location", answers.whatsapp, "Telefone do contratante"),
    detailRow("event-location", address, "Endereço e CEP"),
    detailRow("event-location", answers.pais, "País"),
    detailRow("event-story", answers.elementosEvento, "Elementos escolhidos"),
    detailRow("event-money", basePrice, "Valor base"),
    detailRow("event-money", transport, "Transporte"),
    detailRow("event-location", answers.transportRoute, "Percurso"),
    detailRow("event-money", answers.finalPrice || (answers.finalPriceCents ? money(answers.finalPriceCents) : ""), "Valor total antes do parcelamento"),
    detailRow("event-money", installmentCount ? `${installmentCount}x de ${money(installmentAmount)}` : "", "Parcelamento"),
    detailRow("event-money", answers.proposalFinancedTotalCents ? money(answers.proposalFinancedTotalCents) : "", "Total parcelado"),
    detailRow("event-money", mealTotal || "R$ 0,00", "Refeições"),
    detailRow("event-story", answers.mealSelectionDescription, "Refeições selecionadas"),
    detailRow("event-location", answers.freeLodging === "Sim" ? "Hospedagem sem custo" : "Hospedagem a definir", "Hospedagem")
  ].filter(Boolean).join("");
  host.innerHTML = `
    <div class="event-overview__cards">
      ${renderPayments(workflow)}
      ${progressCard({ iconName: "event-video", title: "Vídeo de divulgação", value: video.value, note: video.note, progress: video.progress })}
      ${progressCard({ iconName: "event-photos", title: "Fotos do local", value: `${photoCount} de 3 fotos`, note: "Palco, público e entrada da igreja.", progress: Math.round(photoCount / 3 * 100) })}
    </div>
    <section class="event-overview__details" aria-label="Informações do evento">${rows}${detailRow("event-money", answers.finalPrice || (answers.finalPriceCents ? money(answers.finalPriceCents) : ""), "Valor total")}</section>
    <section class="event-overview__photos"><h2>Fotos do local</h2><p>Envie imagens do palco, do público e da entrada da igreja.</p><div class="event-overview__photo-grid">${slots.map((slot) => {
      const photo = photos[slot.id];
      return `<article class="event-overview__photo"><div class="event-overview__photo-preview">${photo?.url ? `<img data-photo-preview="${slot.id}" alt="Foto do local: ${slot.label}">` : "Adicione uma foto"}</div><strong>${slot.label}</strong><small data-photo-feedback="${slot.id}">${esc(slot.hint)}</small><label>${photo ? "Trocar foto" : "Enviar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" data-photo-slot="${slot.id}"></label></article>`;
    }).join("")}</div></section>`;
  document.getElementById("infoSections")?.setAttribute("hidden", "");
  document.getElementById("draftNote")?.toggleAttribute("hidden", !term?.isDraft);
  loadPhotoPreviews(photos);
  ensurePaymentDialog();
}

async function loadPhotoPreviews(photos) {
  for (const slot of slots) {
    if (!photos?.[slot.id]?.url) continue;
    const image = document.querySelector(`[data-photo-preview="${slot.id}"]`);
    if (!image) continue;
    try {
      const response = await fetch(photos[slot.id].url, { headers: auth(), cache: "no-store" });
      if (response.ok) image.src = URL.createObjectURL(await response.blob());
    } catch { /* A falha de preview não bloqueia o restante do painel. */ }
  }
}

async function uploadPhoto(input) {
  const slot = slots.find((item) => item.id === input.dataset.photoSlot);
  const file = input.files?.[0];
  if (!slot || !file) return;
  const feedback = document.querySelector(`[data-photo-feedback="${slot.id}"]`);
  if (file.size > 15 * 1024 * 1024) { feedback.textContent = "A foto precisa ter até 15 MB."; return; }
  feedback.textContent = "Enviando foto…";
  input.disabled = true;
  try {
    const response = await fetch(`/api/contractor-panel/venue-photos/${slot.id}`, {
      method: "POST", headers: { ...auth(), "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível enviar esta foto.");
    feedback.textContent = "Foto salva.";
    window.location.reload();
  } catch (error) { feedback.textContent = error.message || "Não foi possível enviar esta foto."; }
  finally { input.disabled = false; input.value = ""; }
}

function ensurePaymentDialog() {
  if (document.getElementById("eventPaymentDialog")) return;
  const dialog = document.createElement("section");
  dialog.id = "eventPaymentDialog";
  dialog.className = "event-payment-dialog";
  dialog.hidden = true;
  dialog.innerHTML = `<div class="event-payment-dialog__card" role="dialog" aria-modal="true" aria-labelledby="eventPaymentTitle"><h2 id="eventPaymentTitle">Informar pagamento</h2><p id="eventPaymentSummary"></p><label>Valor pago<input id="eventPaymentAmount" type="number" min="0.01" step="0.01" inputmode="decimal"></label><p id="eventPaymentFeedback" class="event-payment-dialog__feedback" role="status" aria-live="polite"></p><div class="event-payment-dialog__actions"><button class="event-payment-dialog__cancel" type="button" data-payment-close>Cancelar</button><button class="event-payment-dialog__submit" type="button" id="eventPaymentSubmit">Confirmar como pago</button></div></div>`;
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-payment-close]")) dialog.hidden = true;
    if (event.target.closest("#eventPaymentSubmit")) void submitPayment();
  });
  document.body.appendChild(dialog);
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
  document.getElementById("eventPaymentDialog").hidden = false;
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
