const page = document.body.dataset.page || "";

const weekendSchedule = [
  { day: "Sabado", city: "Goiania, GO", place: "Igreja Batista da Esperanca", time: "16h00", title: "Tarde infantil com louvor, teatro e participacao das familias" },
  { day: "Sabado", city: "Brasilia, DF", place: "Assembleia de Deus Vida Plena", time: "19h30", title: "Noite especial para criancas no congresso da igreja" },
  { day: "Domingo", city: "Uberlandia, MG", place: "Igreja Presbiteriana do Caminho", time: "09h30", title: "Manha de celebracao com musica, ensino e acolhimento" },
  { day: "Domingo", city: "Campinas, SP", place: "Comunidade Crista Fonte de Vida", time: "18h00", title: "Culto infantil com repertorio tematico e interacao com a igreja" }
];

function markActiveNav() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if ((page === "home" && href === "/index.html") || href === `/${page}.html`) {
      link.classList.add("active");
    }
  });
}

async function loadHealth() {
  const dot = document.getElementById("health-dot");
  const label = document.getElementById("health-label");
  const copy = document.getElementById("health-copy");
  const pills = document.getElementById("env-pills");
  if (!dot || !label || !copy || !pills) {
    return;
  }

  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    dot.classList.toggle("online", Boolean(data.ok));
    label.textContent = data.ok ? "Plataforma online" : "Falha na plataforma";
    copy.textContent = `Modelo padrao: ${data.env.model} | Conteudo em: ${data.env.contentBaseUrl}`;

    const items = [
      data.env.hasOpenAiKey ? "GPT ativo" : "GPT pendente",
      data.env.hasDatabaseUrl ? "Acesso ativo" : "Acesso pendente",
      data.env.hasPagBankToken ? `PagBank ${data.env.pagbankEnvironment}` : "PagBank pendente"
    ];

    pills.innerHTML = "";
    items.forEach((item) => {
      const pill = document.createElement("span");
      pill.className = "status-pill";
      pill.textContent = item;
      pills.appendChild(pill);
    });
  } catch (error) {
    label.textContent = "Servidor indisponivel";
    copy.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
}

async function startCheckout(productId, statusNode, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Abrindo checkout...";

  try {
    const response = await fetch("/api/payments/pagbank/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ productId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha ao criar checkout.");
    }

    window.location.href = data.payUrl;
  } catch (error) {
    if (statusNode) {
      statusNode.textContent = error instanceof Error ? error.message : "Erro ao iniciar pagamento.";
    }
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadAlbums() {
  const grid = document.getElementById("album-grid");
  const count = document.getElementById("album-count");
  const storeStatus = document.getElementById("store-status");
  if (!grid || !count) {
    return;
  }

  const response = await fetch(page === "produtos" ? "/api/store/products" : "/api/albums");
  const data = await response.json();
  count.textContent = `${data.items.length} albuns disponiveis`;
  grid.innerHTML = "";

  if (storeStatus) {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get("payment");

    if (paymentState === "return") {
      storeStatus.textContent = "Voce voltou do PagBank. Confira o status final do pagamento no painel e no webhook.";
    } else {
      storeStatus.textContent = "Pagamento com PagBank: Pix, boleto e cartao em checkout seguro.";
    }
  }

  data.items.forEach((album) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img class="album-cover" src="${album.coverUrl}" alt="Capa do album ${album.name}">
      <div class="album-body">
        <h3>${album.name}</h3>
        <p>${album.tracks > 0 ? `${album.tracks} faixas` : "Sem faixas cadastradas"}</p>
        ${album.priceLabel ? `<p class="album-price">${album.priceLabel}</p>` : ""}
        ${page === "produtos" && album.id ? `<button class="primary-button buy-button" data-product-id="${album.id}" type="button">Comprar com PagBank</button>` : ""}
      </div>
    `;
    grid.appendChild(card);
  });

  if (page === "produtos") {
    grid.querySelectorAll(".buy-button").forEach((button) => {
      button.addEventListener("click", async () => {
        await startCheckout(button.dataset.productId, storeStatus, button);
      });
    });
  }
}

function loadSchedule() {
  const grid = document.getElementById("schedule-grid");
  if (!grid) {
    return;
  }

  grid.innerHTML = "";
  weekendSchedule.forEach((item) => {
    const card = document.createElement("article");
    card.className = "schedule-card";
    card.innerHTML = `
      <p class="schedule-day">${item.day}</p>
      <h3>${item.title}</h3>
      <p>${item.place}</p>
      <p>${item.city}</p>
      <strong>${item.time}</strong>
    `;
    grid.appendChild(card);
  });
}

markActiveNav();
await Promise.all([loadHealth(), loadAlbums()]);
loadSchedule();
