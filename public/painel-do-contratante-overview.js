import { getApiUrl } from "/api.js";

const ICONS = "/midia/icons/contratante/";
const TOKEN_KEY = "turma_do_printy_token";
const PHOTO_SLOTS = [
  { id: "stage", label: "Palco", hint: "Mostre o espaço da apresentação." },
  { id: "audience", label: "Público", hint: "Mostre onde o público ficará." },
  { id: "entrance", label: "Entrada da igreja", hint: "Mostre a entrada do local." }
];
const PRESENTATIONS = {
  "teatro-fantoches": { name: "Econômico Simples", duration: "50 min", team: 2 },
  "teatro-palco": { name: "Econômico Plus", duration: "1h15", team: 3 },
  "parques-arenas": { name: "Show Completo", duration: "1h30", team: 4 },
  "congresso-infantil": { name: "Congresso infantil", duration: "1h15", team: 4 },
  "show-completo-2h": { name: "Turma do Printy Experience", duration: "3h", team: 5 }
};
const photoPreviewUrls = new Map();
let currentContext = null;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);
const dateLabel = (value) => {
  if (!value) return "Data a definir";
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Data a definir" : new Intl.DateTimeFormat("pt-BR").format(parsed);
};
const icon = (name) => `${ICONS}${name}.svg`;

function daysPastDue(value) {
  if (!value) return 0;
  const due = Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(due)) return 0;
  const today = new Date();
  const todayKey = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayKey - due) / 86400000);
}

function ensureOverviewStyles() {
  if (document.getElementById("contractorOverviewStyles")) return;
  const link = document.createElement("link");
  link.id = "contractorOverviewStyles";
  link.rel = "stylesheet";
  link.href = "/painel-do-contratante-overview.css";
  document.head.appendChild(link);
}

function paymentBadge(payment) {
  if (payment.status === "REVIEW") return ["review", "Em análise"];
  if (payment.status === "CONFIRMED" || Number(payment.remainingCents || 0) <= 0) return ["confirmed", "Pago"];
  const late = daysPastDue(payment.dueDate);
  if (late <= 0) return ["confirmed", "Em dia"];
  if (late <= 3) return ["pending", "Pendente"];
  return ["overdue", "Atrasado"];
}

function setEventStatus(payments, isDraft) {
  const statusElement = document.getElementById("overallStatus");
  if (!statusElement) return;
  const cancelled = !isDraft && payments.some((payment) => Number(payment.remainingCents || 0) > 0 && daysPastDue(payment.dueDate) >= 15);
  const firstPayment = payments.find((payment) => Number(payment.order) === 1) || payments[0];
  const confirmed = Number(firstPayment?.paidCents || 0) > 0 || firstPayment?.status === "CONFIRMED";
  const state = cancelled ? ["cancelled", "Cancelado"] : confirmed ? ["confirmed", "Confirmado"] : ["open", "Em aberto"];
  statusElement.className = `status-pill status-pill--${state[0]}`;
  statusElement.textContent = state[1];
  statusElement.title = cancelled ? "Há uma parcela com 15 dias ou mais de atraso." : "";
}

function formatVideoDeadline(workflow) {
  const payments = workflow.payments || [];
  const first = payments.find((payment) => Number(payment.order) === 1) || payments[0];
  const firstPaymentAt = first?.userReportedAt || first?.adminConfirmedAt || "";
  const videoReady = Boolean(workflow.promoVideo?.url);
  if (videoReady) return { value: "Vídeo enviado", note: "Material entregue pela equipe.", progress: 100 };
  if (!firstPaymentAt) return { value: "Aguardando pagamento", note: "A previsão de 7 dias começa após o primeiro pagamento.", progress: 0 };
  const deadline = new Date(firstPaymentAt).getTime() + 7 * 86400000;
  const remaining = Math.ceil((deadline - Date.now()) / 86400000);
  if (remaining > 0) {
    return { value: `${remaining} ${remaining === 1 ? "dia restante" : "dias restantes"}`, note: "Previsão de entrega do vídeo de divulgação.", progress: Math.max(0, Math.min(100, ((7 - remaining) / 7) * 100)) };
  }
  return { value: "Prazo de 7 dias alcançado", note: "A equipe está preparando o envio do vídeo.", progress: 100 };
}

function paymentTotals(workflow) {
  const payments = workflow.payments || [];
  const total = payments.reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.paidCents || 0), 0);
  const next = payments.find((payment) => Number(payment.remainingCents || 0) > 0);
  return { total, paid, percent: total ? Math.min(100, Math.round(paid / total * 100)) : 0, next };
}

function iconRow(iconName, value, accessibleLabel) {
  return `<div class="contractor-overview-detail" aria-label="${esc(accessibleLabel)}"><img src="${icon(iconName)}" alt=""><span>${esc(value || "A definir")}</span></div>`;
}

function eventDetails(context) {
  const { term, answers } = context;
  const presentation = PRESENTATIONS[answers.presentationKey] || {};
  const venue = [answers.igreja, answers.localEvento].filter(Boolean).join(" · ");
  const location = [venue, answers.cidade].filter(Boolean).join(" · ");
  const address = [answers.endereco, answers.cep].filter(Boolean).join(" · ");
  const rows = [
    iconRow("event-date", dateLabel(term.eventDate), "Data do evento"),
    iconRow("event-time", term.eventTime || answers.horario, "Horário do evento"),
    iconRow("event-type", presentation.name || answers.presentationName || answers.tipoEvento || answers.presentationKey, "Tipo de evento"),
    iconRow("event-story", answers.historia, "História escolhida"),
    iconRow("event-location", location, "Igreja e local do evento"),
    iconRow("event-audience", answers.publicoEstimado ? `${answers.publicoEstimado} pessoas` : "Público a definir", "Tamanho do público"),
    iconRow("event-duration", presentation.duration || answers.duracao, "Duração"),
    iconRow("event-team", presentation.team ? `${presentation.team} integrantes` : answers.equipe, "Equipe"),
    iconRow("event-team", answers.contratante, "Nome do contratante"),
    `<div class="contractor-overview-detail" aria-label="Telefone do contratante"><svg class="contractor-overview-detail__phone" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.1 3.8h2.2l1.3 4-1.8 1.5a14 14 0 0 0 5.9 5.9l1.5-1.8 4 1.3v2.2a2 2 0 0 1-2.2 2A15 15 0 0 1 5.1 5.9a2 2 0 0 1 2-2.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>${esc(answers.whatsapp || "Telefone a definir")}</span></div>`,
    iconRow("event-location", address, "Endereço e CEP")
  ];
  return rows.join("");
}

function renderProgressCards(context) {
  const workflow = context.workflow || {};
  const payments = workflow.payments || [];
  const totals = paymentTotals(workflow);
  const video = formatVideoDeadline(workflow);
  const photos = workflow.venuePhotos || {};
  const photoCount = PHOTO_SLOTS.filter((slot) => Boolean(photos[slot.id]?.url)).length;
  const nextStatus = totals.next ? paymentBadge(totals.next)[1] : totals.total ? "Quitado" : "Aguardando contrato";
  const paymentNote = totals.next
    ? `${money(totals.paid)} pagos de ${money(totals.total)} · ${nextStatus}`
    : `${money(totals.paid)} pagos de ${money(totals.total)} · contrato quitado`;
  return `
    <div class="contractor-progress-grid">
      <a class="contractor-progress-card" href="#financeiro" aria-label="Pagamentos: ${esc(paymentNote)}">
        <div class="contractor-progress-card__head"><img src="${icon("event-money")}" alt=""><span>Pagamentos</span></div>
        <strong class="contractor-progress-card__value">${money(totals.paid)} <span aria-hidden="true">/</span> ${money(totals.total)}</strong>
        <div class="contractor-progress-track" role="progressbar" aria-label="Progresso dos pagamentos" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${totals.percent}"><span style="width:${totals.percent}%"></span></div>
        <small class="contractor-progress-card__note">${esc(paymentNote)}. Toque para informar um pagamento.</small>
      </a>
      <a class="contractor-progress-card" href="#materiais" aria-label="Vídeo de divulgação: ${esc(video.value)}">
        <div class="contractor-progress-card__head"><img src="${icon("event-video")}" alt=""><span>Vídeo de divulgação</span></div>
        <strong class="contractor-progress-card__value">${esc(video.value)}</strong>
        <div class="contractor-progress-track" role="progressbar" aria-label="Prazo do vídeo de divulgação" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(video.progress)}"><span style="width:${video.progress}%"></span></div>
        <small class="contractor-progress-card__note">${esc(video.note)}</small>
      </a>
      <a class="contractor-progress-card" href="#fotos-evento" aria-label="Fotos do local: ${photoCount} de 3 enviadas">
        <div class="contractor-progress-card__head"><img src="${icon("event-photos")}" alt=""><span>Fotos do local</span></div>
        <strong class="contractor-progress-card__value">${photoCount} de 3 fotos</strong>
        <div class="contractor-progress-track" role="progressbar" aria-label="Fotos do local enviadas" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${photoCount}"><span style="width:${Math.round(photoCount / 3 * 100)}%"></span></div>
        <small class="contractor-progress-card__note">Palco, público e entrada da igreja.</small>
      </a>
    </div>`;
}

function renderPhotoSlots(photos = {}) {
  return PHOTO_SLOTS.map((slot) => {
    const photo = photos[slot.id];
    const preview = photo
      ? `<img id="venuePhotoPreview-${slot.id}" alt="Foto enviada: ${esc(slot.label)}">`
      : `<span id="venuePhotoPreview-${slot.id}">Toque para adicionar a foto</span>`;
    return `
      <article class="contractor-photo-card">
        <div class="contractor-photo-card__preview">${preview}</div>
        <strong>${esc(slot.label)}</strong>
        <small>${esc(slot.hint)}</small>
        <label class="contractor-photo-picker" for="venuePhotoInput-${slot.id}">${photo ? "Trocar foto" : "Adicionar foto"}
          <input id="venuePhotoInput-${slot.id}" type="file" accept="image/jpeg,image/png,image/webp" data-venue-photo="${slot.id}" aria-label="Enviar foto de ${esc(slot.label)}">
        </label>
        <small class="contractor-photo-feedback" id="venuePhotoFeedback-${slot.id}" aria-live="polite"></small>
      </article>`;
  }).join("");
}

async function loadPhotoPreviews(photos) {
  for (const slot of PHOTO_SLOTS) {
    const photo = photos?.[slot.id];
    const cached = photoPreviewUrls.get(slot.id);
    const image = document.getElementById(`venuePhotoPreview-${slot.id}`);
    if (!photo?.url) {
      if (cached?.url) URL.revokeObjectURL(cached.url);
      photoPreviewUrls.delete(slot.id);
      continue;
    }
    if (!image) continue;
    if (cached?.updatedAt === photo.updatedAt) {
      if (image instanceof HTMLImageElement) image.src = cached.url;
      else {
        const preview = document.createElement("img");
        preview.id = `venuePhotoPreview-${slot.id}`;
        preview.alt = `Foto enviada: ${slot.label}`;
        preview.src = cached.url;
        image.replaceWith(preview);
      }
      continue;
    }
    if (cached?.url) URL.revokeObjectURL(cached.url);
    photoPreviewUrls.delete(slot.id);
    try {
      const response = await fetch(getApiUrl(photo.url), { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` }, cache: "no-store" });
      if (!response.ok) continue;
      const objectUrl = URL.createObjectURL(await response.blob());
      photoPreviewUrls.set(slot.id, { updatedAt: photo.updatedAt, url: objectUrl });
      const target = document.getElementById(`venuePhotoPreview-${slot.id}`);
      if (target) {
        const preview = document.createElement("img");
        preview.id = `venuePhotoPreview-${slot.id}`;
        preview.alt = `Foto enviada: ${slot.label}`;
        preview.src = objectUrl;
        target.replaceWith(preview);
      }
    } catch {
      const target = document.getElementById(`venuePhotoPreview-${slot.id}`);
      if (target) target.textContent = "Não foi possível carregar a foto agora.";
    }
  }
}

async function uploadVenuePhoto(input) {
  const slot = PHOTO_SLOTS.find((item) => item.id === input.dataset.venuePhoto);
  const file = input.files?.[0];
  if (!slot || !file) return;
  const feedback = document.getElementById(`venuePhotoFeedback-${slot.id}`);
  if (file.size > 15 * 1024 * 1024) {
    feedback.textContent = "A foto precisa ter até 15 MB.";
    input.value = "";
    return;
  }
  feedback.textContent = "Enviando foto…";
  input.disabled = true;
  try {
    const response = await fetch(getApiUrl(`/api/contractor-panel/venue-photos/${slot.id}`), {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`, "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      body: file
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível enviar esta foto.");
    feedback.textContent = "Foto salva.";
    window.location.reload();
  } catch (error) {
    feedback.textContent = error.message || "Não foi possível enviar esta foto.";
  } finally {
    input.disabled = false;
    input.value = "";
  }
}

export function renderContractorOverview(context) {
  currentContext = context;
  ensureOverviewStyles();
  const hero = document.querySelector(".contractor-hero");
  if (!hero) return;
  document.querySelector(".contractor-hero #contractorContactDetails")?.remove();
  let overview = document.getElementById("contractorOverview");
  if (!overview) {
    overview = document.createElement("section");
    overview.id = "contractorOverview";
    overview.className = "contractor-overview";
    overview.setAttribute("aria-label", "Visão geral do evento");
    hero.insertAdjacentElement("afterend", overview);
    overview.addEventListener("change", (event) => {
      const input = event.target.closest("[data-venue-photo]");
      if (input) void uploadVenuePhoto(input);
    });
    document.getElementById("reportPayment")?.addEventListener("click", () => {
      window.setTimeout(() => {
        const feedback = document.getElementById("paymentFeedback");
        if (feedback && feedback.textContent.toLowerCase().includes("confer")) {
          feedback.textContent = "Registrando o pagamento como pago automaticamente…";
        }
      }, 0);
    });
  }
  const workflow = context.workflow || {};
  const payments = workflow.payments || [];
  overview.innerHTML = `
    ${renderProgressCards(context)}
    <section class="contractor-overview-details" id="contractorContactDetails" aria-label="Informações do evento">${eventDetails(context)}</section>
    <section class="contractor-venue-photos" id="fotos-evento" aria-labelledby="venuePhotosTitle">
      <header class="contractor-venue-photos__header"><img src="${icon("event-photos")}" alt=""><div><h2 id="venuePhotosTitle">Fotos do local</h2><p>Envie 3 fotos para a equipe conhecer o espaço do evento.</p></div></header>
      <div class="contractor-photo-grid">${renderPhotoSlots(workflow.venuePhotos || {})}</div>
    </section>`;

  setEventStatus(payments, Boolean(context.term?.isDraft));
  payments.forEach((payment, index) => {
    const badge = document.querySelectorAll("#payments .item-card .status-pill")[index];
    if (!badge) return;
    const [statusClass, label] = paymentBadge(payment);
    badge.className = `status-pill status-pill--${statusClass}`;
    badge.textContent = label;
  });

  const generateVideo = document.getElementById("generatePromoVideo");
  if (generateVideo) {
    generateVideo.disabled = true;
    generateVideo.classList.add("hidden");
  }
  const videoInfo = formatVideoDeadline(workflow);
  const videoHint = document.getElementById("videoHint");
  if (videoHint) videoHint.textContent = workflow.promoVideo?.url ? "Vídeo enviado pela equipe." : videoInfo.note;
  const nextTitle = document.getElementById("nextActionTitle");
  const nextText = document.getElementById("nextActionText");
  const nextLink = document.getElementById("nextActionLink");
  const photoCount = PHOTO_SLOTS.filter((slot) => Boolean(workflow.venuePhotos?.[slot.id]?.url)).length;
  const firstPayment = payments.find((payment) => Number(payment.order) === 1) || payments[0];
  const firstPaymentStarted = Number(firstPayment?.paidCents || 0) > 0 || firstPayment?.status === "CONFIRMED";
  const lodgingRequired = context.answers.freeLodging !== "Sim" && context.answers.freeLodging !== true;
  const checkpoints = [
    !context.term?.isDraft,
    firstPaymentStarted,
    payments.length > 0 && payments.every((payment) => Number(payment.remainingCents || 0) <= 0),
    photoCount === PHOTO_SLOTS.length,
    Boolean(workflow.promoVideo?.url),
    !lodgingRequired || workflow.lodging?.status === "CONFIRMED"
  ];
  const readiness = Math.round(checkpoints.filter(Boolean).length / checkpoints.length * 100);
  const readinessText = document.getElementById("readinessText");
  const readinessBar = document.getElementById("readinessBar");
  if (readinessText) readinessText.textContent = `${readiness}% concluído`;
  if (readinessBar) readinessBar.style.width = `${readiness}%`;
  if (!context.term?.isDraft && firstPaymentStarted && photoCount < PHOTO_SLOTS.length && nextTitle && nextText && nextLink) {
    nextTitle.textContent = "Envie as fotos do local";
    nextText.textContent = "Adicione as imagens do palco, do público e da entrada da igreja.";
    nextLink.href = "#fotos-evento";
    nextLink.textContent = "Enviar fotos";
  } else if (!context.term?.isDraft && firstPaymentStarted && !workflow.promoVideo?.url && nextTitle && nextText && nextLink) {
    nextTitle.textContent = "Vídeo de divulgação em preparação";
    nextText.textContent = videoInfo.note;
    nextLink.href = "#contractorOverview";
    nextLink.textContent = videoInfo.value;
  }

  void loadPhotoPreviews(workflow.venuePhotos || {});
}

window.addEventListener("beforeunload", () => {
  for (const cached of photoPreviewUrls.values()) URL.revokeObjectURL(cached.url);
});
