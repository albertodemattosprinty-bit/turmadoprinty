import { getApiUrl } from "/api.js";

const TOKEN_KEY = "turma_do_printy_token";
const $ = (id) => document.getElementById(id);

let term = null;
let activePayment = null;
let selectedPaymentAmountCents = 0;

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

function setStatus(element, status, customLabel = "") {
  const [className, label] = statusMeta(status);
  element.className = `status-pill status-pill--${className}`;
  element.textContent = customLabel || label;
}

function renderCountdown(eventDate) {
  if (!eventDate) {
    $("countdownValue").textContent = "—";
    $("countdownLabel").textContent = "data ainda não definida";
    return;
  }
  const target = new Date(`${String(eventDate).slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days > 1) {
    $("countdownValue").textContent = days;
    $("countdownLabel").textContent = "dias até o evento";
  } else if (days === 1) {
    $("countdownValue").textContent = "1 dia";
    $("countdownLabel").textContent = "falta muito pouco";
  } else if (days === 0) {
    $("countdownValue").textContent = "É hoje";
    $("countdownLabel").textContent = "chegou o grande dia";
  } else {
    $("countdownValue").textContent = Math.abs(days);
    $("countdownLabel").textContent = `${Math.abs(days) === 1 ? "dia" : "dias"} desde o evento`;
  }
}

function renderPayments(workflow) {
  const payments = workflow.payments || [];
  $("payments").innerHTML = payments.map((payment) => {
    const [statusClass, statusLabel] = statusMeta(payment.status);
    const title = payment.order === 1 ? "Sinal do evento" : "Pagamento final";
    const action = payment.status === "PENDING"
      ? `<button class="button button--primary button--wide" type="button" data-payment="${esc(payment.id)}">Informar pagamento</button>`
      : payment.status === "REVIEW"
        ? '<button class="button button--secondary button--wide" type="button" disabled>Aguardando conferência da equipe</button>'
        : '<button class="button button--success button--wide" type="button" disabled>Pagamento confirmado</button>';
    return `
      <article class="item-card">
        <div class="item-card__top">
          <div><h3>${title}</h3><p>Vencimento: ${date(payment.dueDate)}</p></div>
          <span class="status-pill status-pill--${statusClass}">${statusLabel}</span>
        </div>
        <strong class="item-card__value">${esc(payment.amount)}</strong>
        <small>Confirmado: ${esc(payment.paid || "R$ 0,00")} · Saldo: ${esc(payment.remaining || payment.amount)}</small>
        ${action}
      </article>
    `;
  }).join("") || '<div class="empty-state">Os pagamentos ainda não foram configurados.</div>';

  const totalCents = payments.reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0);
  const paidCents = payments.reduce((sum, payment) => sum + Number(payment.paidCents || 0), 0);
  const remainingCents = payments.reduce((sum, payment) => sum + Number(payment.remainingCents || 0), 0);
  $("financeTotal").textContent = money(totalCents);
  $("financePaid").textContent = money(paidCents);
  $("financeRemaining").textContent = money(remainingCents);
}

function renderExpenses(workflow) {
  const notes = workflow.expenseNotes || [];
  $("expenseTotal").textContent = money(notes.reduce((sum, note) => sum + Number(note.amountCents || 0), 0));
  $("expenseNotes").innerHTML = notes.map((note) => `
    <article class="item-card">
      <div class="item-card__top">
        <div><h3>${esc(note.title)}</h3><p>${esc(expenseCategory(note))}</p></div>
        <strong>${esc(note.amount)}</strong>
      </div>
      <button class="button button--secondary button--wide" type="button" data-expense-file="${esc(note.fileUrl)}">Ver comprovante</button>
    </article>
  `).join("") || '<div class="empty-state">Ainda não há notas de consumo vinculadas ao evento.</div>';
}

function renderMaterials(workflow) {
  const video = workflow.promoVideo;
  const videoUrl = video?.url || "";
  $("generatePromoVideo").textContent = video ? "Gerar novamente" : "Gerar vídeo automaticamente";
  $("videoLink").setAttribute("aria-disabled", video ? "false" : "true");
  $("videoLink").textContent = video ? "Assistir ao vídeo" : "Vídeo ainda não gerado";
  $("videoHint").textContent = video
    ? video.fileName || "Seu vídeo personalizado está pronto."
    : "Use o botão abaixo para criar automaticamente o vídeo personalizado do evento.";
  $("videoLink").dataset.videoFile = videoUrl;
  $("videoLink").href = videoUrl && !videoUrl.startsWith("/api/") ? videoUrl : "#";
  $("pdfLink").href = term.pdfUrl || "/termo";
}

function renderLogistics(answers, workflow) {
  const freeTransport = answers.freeTransport === "Sim" || answers.freeTransport === true;
  $("transportBenefit").classList.toggle("hidden", !freeTransport);
  $("transportCopy").textContent = answers.transportDescription || "A equipe combinará os detalhes do transporte diretamente com você.";
  if (freeTransport) setStatus($("transportStatus"), "CONFIRMED", "Sem cobrança");
  else setStatus($("transportStatus"), "PENDING", "A combinar");

  const freeLodging = answers.freeLodging === "Sim" || answers.freeLodging === true;
  $("lodgingBenefit").classList.toggle("hidden", !freeLodging);
  const lodging = workflow.lodging || {};
  $("hotelName").value = lodging.hotelName || "";
  $("hotelPhone").value = lodging.phone || "";
  $("hotelAddress").value = lodging.address || "";
  $("hotelCheckIn").value = lodging.checkIn || "";
  $("hotelCheckOut").value = lodging.checkOut || "";
  $("hotelNotes").value = lodging.notes || "";
  setStatus($("lodgingStatus"), lodging.status || "PENDING");
  $("saveHotel").textContent = lodging.status === "CONFIRMED"
    ? "Atualizar dados do hotel"
    : lodging.status === "REVIEW"
      ? "Atualizar e reenviar"
      : "Enviar dados do hotel";
}

function renderReadiness(answers, workflow) {
  const payments = workflow.payments || [];
  const lodging = workflow.lodging || {};
  const freeLodging = answers.freeLodging === "Sim" || answers.freeLodging === true;
  const checkpoints = [
    true,
    payments[0]?.status === "CONFIRMED",
    payments[1]?.status === "CONFIRMED",
    Boolean(workflow.promoVideo),
    freeLodging || lodging.status === "CONFIRMED"
  ];
  const completed = checkpoints.filter(Boolean).length;
  const percentage = Math.round((completed / checkpoints.length) * 100);
  $("readinessBar").style.width = `${percentage}%`;
  $("readinessText").textContent = `${percentage}% concluído`;

  const paymentInReview = payments.find((payment) => payment.status === "REVIEW");
  const pendingPayment = payments.find((payment) => payment.status === "PENDING");
  if (pendingPayment) {
    $("nextActionTitle").textContent = pendingPayment.order === 1 ? "Informe o pagamento do sinal" : "Prepare o pagamento final";
    $("nextActionText").textContent = `A parcela vence em ${date(pendingPayment.dueDate)}. Você pode informar qualquer valor até o saldo restante.`;
    $("nextActionLink").href = "#financeiro";
    $("nextActionLink").textContent = "Ir para pagamentos";
  } else if (!freeLodging && lodging.status === "PENDING") {
    $("nextActionTitle").textContent = "Envie os dados da hospedagem";
    $("nextActionText").textContent = "Informe hotel, endereço e datas para a equipe conferir a reserva.";
    $("nextActionLink").href = "#logistica";
    $("nextActionLink").textContent = "Preencher hospedagem";
  } else if (paymentInReview || lodging.status === "REVIEW") {
    $("nextActionTitle").textContent = "Aguarde a conferência da equipe";
    $("nextActionText").textContent = "Recebemos suas informações e estamos fazendo a validação manual.";
    $("nextActionLink").href = paymentInReview ? "#financeiro" : "#logistica";
    $("nextActionLink").textContent = "Acompanhar situação";
  } else if (!workflow.promoVideo) {
    $("nextActionTitle").textContent = "Gere seu vídeo de divulgação";
    $("nextActionText").textContent = "Crie agora o vídeo personalizado com os dados do seu evento.";
    $("nextActionLink").href = "#materiais";
    $("nextActionLink").textContent = "Gerar vídeo";
  } else {
    $("nextActionTitle").textContent = "Seu evento está preparado";
    $("nextActionText").textContent = "Os principais pontos estão confirmados. Continue acompanhando este painel até a data do evento.";
    $("nextActionLink").href = "#materiais";
    $("nextActionLink").textContent = "Revisar evento";
  }

  const allPaid = payments.length > 0 && payments.every((payment) => payment.status === "CONFIRMED");
  if (percentage === 100) setStatus($("overallStatus"), "CONFIRMED", "Preparação concluída");
  else if (paymentInReview || lodging.status === "REVIEW") setStatus($("overallStatus"), "REVIEW", "Aguardando conferência");
  else setStatus($("overallStatus"), allPaid ? "CONFIRMED" : "PENDING", allPaid ? "Financeiro confirmado" : "Preparação em andamento");
}

function render(data) {
  term = data.panel.term;
  const answers = term.answers || {};
  const workflow = term.workflow || {};

  $("eventName").textContent = answers.igreja || "Seu evento";
  $("eventDate").textContent = `${date(term.eventDate)} · ${term.eventTime || "horário a definir"}`;
  $("eventCity").textContent = answers.cidade || "Cidade a definir";
  $("pixKey").textContent = workflow.pixKey || "36.442.785/0001-00";
  $("pixLabel").textContent = workflow.pixLabel || "CNPJ";

  renderCountdown(term.eventDate);
  renderPayments(workflow);
  renderMaterials(workflow);
  renderExpenses(workflow);
  renderLogistics(answers, workflow);
  renderReadiness(answers, workflow);

  $("contractorLoading").classList.add("hidden");
  $("emptyState").classList.add("hidden");
  $("contractorApp").classList.remove("hidden");
}

async function load() {
  if (!token()) {
    location.href = "/auth.html?next=/painel-do-contratante";
    return;
  }
  const response = await fetch(getApiUrl("/api/contractor-panel"), { headers: auth() });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    location.href = "/auth.html?next=/painel-do-contratante";
    return;
  }
  if (!response.ok) {
    const message = data.code === "PROJECT200_ONBOARDING_REQUIRED"
      ? "Sua conta de evento está sendo preparada. Atualize a página para continuar."
      : data.error || "Não foi possível carregar o seu evento.";
    throw new Error(message);
  }
  if (!data.panel?.hasTerm) {
    $("contractorLoading").classList.add("hidden");
    $("emptyState").classList.remove("hidden");
    return;
  }
  render(data);
}

function openPayment(payment) {
  activePayment = payment;
  selectedPaymentAmountCents = 0;
  const remainingCents = Number(payment.remainingCents ?? payment.amountCents ?? 0);
  $("paymentTitle").textContent = payment.order === 1 ? "Pagamento do sinal" : "Pagamento final";
  $("paymentDueSummary").textContent = `Saldo desta parcela: ${payment.remaining || payment.amount} · vencimento em ${date(payment.dueDate)}.`;
  $("partialPaymentValue").max = String(remainingCents / 100);
  $("partialPaymentValue").value = (remainingCents / 100).toFixed(2);
  $("paymentAmountStep").classList.remove("hidden");
  $("paymentPixStep").classList.add("hidden");
  $("paymentFeedback").textContent = "";
  $("paymentDialog").classList.remove("hidden");
  document.body.classList.add("dialog-open");
}

function closePayment() {
  $("paymentDialog").classList.add("hidden");
  document.body.classList.remove("dialog-open");
  activePayment = null;
  selectedPaymentAmountCents = 0;
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

$("reloadPanel").addEventListener("click", async () => {
  $("reloadPanel").disabled = true;
  try { await load(); } catch (error) { alert(error.message); }
  finally { $("reloadPanel").disabled = false; }
});

$("payments").addEventListener("click", (event) => {
  const button = event.target.closest("[data-payment]");
  if (!button) return;
  const payment = (term?.workflow?.payments || []).find((item) => String(item.id) === String(button.dataset.payment));
  if (payment) openPayment(payment);
});

$("continueToPix").addEventListener("click", () => {
  const remainingCents = Number(activePayment?.remainingCents ?? activePayment?.amountCents ?? 0);
  selectedPaymentAmountCents = Math.round(Number($("partialPaymentValue").value || 0) * 100);
  if (selectedPaymentAmountCents < 1 || selectedPaymentAmountCents > remainingCents) {
    $("paymentFeedback").textContent = `Informe um valor de até ${activePayment?.remaining || activePayment?.amount}.`;
    return;
  }
  $("paymentSummary").textContent = `Você vai informar ${money(selectedPaymentAmountCents)} via Pix.`;
  $("paymentAmountStep").classList.add("hidden");
  $("paymentPixStep").classList.remove("hidden");
  $("paymentFeedback").textContent = "";
});

$("copyPix").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("pixKey").textContent);
    $("paymentFeedback").textContent = "Chave Pix copiada.";
  } catch {
    $("paymentFeedback").textContent = "Selecione e copie a chave Pix exibida acima.";
  }
});

$("reportPayment").addEventListener("click", async () => {
  if (!activePayment || !selectedPaymentAmountCents) return;
  $("reportPayment").disabled = true;
  $("paymentFeedback").textContent = "Enviando informação para conferência…";
  try {
    const response = await fetch(getApiUrl(`/api/contractor-panel/payments/${encodeURIComponent(activePayment.id)}/report`), {
      method: "POST",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ amountCents: selectedPaymentAmountCents })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível informar o pagamento.");
    closePayment();
    await load();
  } catch (error) {
    $("paymentFeedback").textContent = error.message;
  } finally {
    $("reportPayment").disabled = false;
  }
});

$("closePayment").addEventListener("click", closePayment);
$("paymentDialog").addEventListener("click", (event) => {
  if (event.target === $("paymentDialog")) closePayment();
});

$("expenseNotes").addEventListener("click", (event) => {
  const button = event.target.closest("[data-expense-file]");
  if (button) openExpenseDocument(button);
});

$("videoLink").addEventListener("click", (event) => {
  const link = $("videoLink");
  if (link.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
  if (link.dataset.videoFile?.startsWith("/api/")) {
    event.preventDefault();
    void openPromoVideo(link.dataset.videoFile, link);
  }
});

$("generatePromoVideo").addEventListener("click", async () => {
  const button = $("generatePromoVideo");
  const feedback = $("promoVideoFeedback");
  button.disabled = true;
  button.textContent = "Gerando seu vídeo…";
  feedback.textContent = "Criando a locução Marin e montando o vídeo. Isso pode levar alguns segundos…";
  try {
    const response = await fetch(getApiUrl("/api/contractor-panel/promo-video/generate"), { method: "POST", headers: auth() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível gerar o vídeo agora.");
    feedback.textContent = "Vídeo pronto! Você já pode assistir e compartilhar.";
    await load();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = term?.workflow?.promoVideo ? "Gerar novamente" : "Gerar vídeo automaticamente";
  }
});

$("lodgingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("saveHotel").disabled = true;
  $("hotelFeedback").textContent = "Enviando dados para conferência…";
  try {
    const body = {
      hotelName: $("hotelName").value,
      phone: $("hotelPhone").value,
      address: $("hotelAddress").value,
      checkIn: $("hotelCheckIn").value,
      checkOut: $("hotelCheckOut").value,
      notes: $("hotelNotes").value
    };
    const response = await fetch(getApiUrl("/api/contractor-panel/lodging"), {
      method: "PUT",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível salvar os dados do hotel.");
    $("hotelFeedback").textContent = "Dados enviados. A equipe fará a conferência.";
    await load();
  } catch (error) {
    $("hotelFeedback").textContent = error.message;
  } finally {
    $("saveHotel").disabled = false;
  }
});

load().catch((error) => {
  $("contractorLoading").innerHTML = `<div><strong>Não foi possível abrir seu evento.</strong><p>${esc(error.message)}</p></div>`;
});
