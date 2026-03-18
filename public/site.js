const page = document.body.dataset.page || "";
const sessionStorageKey = "turma_do_printy_token";

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

async function loadCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}

function markActiveNav() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if ((page === "home" && href === "/index.html") || href === `/${page}.html`) {
      link.classList.add("active");
    }
  });
}

async function loadSiteConfig() {
  const response = await fetch("/api/site/config");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar configuracoes do site.");
  }

  return data;
}

function ensureAdminPanel() {
  const main = document.querySelector(".page-shell");

  if (!main) {
    return null;
  }

  let panel = document.getElementById("admin-panel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "admin-panel";
    panel.className = "admin-panel";
    main.prepend(panel);
  }

  return panel;
}

async function savePricing(payload, statusNode) {
  const response = await fetch("/api/admin/pricing", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao salvar precos.");
  }

  if (statusNode) {
    statusNode.textContent = "Valores salvos no servidor.";
  }

  return data;
}

function renderProductsAdminPanel(user, siteConfig, refreshAlbums) {
  if (!user?.isAdmin || page !== "produtos") {
    return;
  }

  const panel = ensureAdminPanel();

  if (!panel) {
    return;
  }

  panel.innerHTML = `
    <div class="admin-panel-head">
      <strong>Admin RoseMattos</strong>
      <span>Produtos</span>
    </div>
    <form id="admin-product-form" class="admin-form-inline">
      <label>Preco das cantatas (centavos)
        <input id="admin-album-price" type="number" min="0" step="1" value="${siteConfig.pricing.albumPriceCents}">
      </label>
      <button class="primary-button" type="submit">Salvar valor</button>
      <p id="admin-product-status" class="section-muted"></p>
    </form>
  `;

  const form = document.getElementById("admin-product-form");
  const status = document.getElementById("admin-product-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Salvando...";

    try {
      await savePricing({
        albumPriceCents: Number(document.getElementById("admin-album-price").value || 0),
        planPrices: siteConfig.pricing.planPrices
      }, status);

      await refreshAlbums();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Erro ao salvar.";
    }
  });
}

async function loadAlbums(siteConfig, user) {
  const grid = document.getElementById("album-grid");
  const count = document.getElementById("album-count");
  const storeStatus = document.getElementById("store-status");

  if (!grid || !count) {
    return;
  }

  const refreshAlbums = async () => {
    grid.innerHTML = "";

    try {
      const response = await fetch(page === "produtos" ? "/api/store/products" : "/api/albums");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar o catalogo.");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      count.textContent = `${items.length} albuns disponiveis`;

      if (storeStatus) {
        storeStatus.textContent = "Abra um album para ouvir os MP3 e comprar na pagina de detalhes.";
      }

      if (!items.length) {
        grid.innerHTML = "<p class=\"section-muted\">Nenhum album disponivel no momento.</p>";
        return;
      }

      items.forEach((album) => {
        const card = document.createElement("article");
        card.className = "album-card";
        card.innerHTML = `
          <img class="album-cover" src="${album.coverUrl}" alt="Capa do album ${album.name}">
          <div class="album-body">
            <h3>${album.name}</h3>
            <p>${album.tracks > 0 ? `${album.tracks} MP3 disponiveis` : "Album sem MP3 cadastrado"}</p>
            ${album.priceLabel ? `<p class="album-price">${album.priceLabel}</p>` : ""}
            ${page === "produtos" && album.href ? `<a class="primary-button buy-button icon-only-button" href="${album.href}" aria-label="Comprar album"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h-2l-1 2H1v2h2l2.4 8.1A2 2 0 0 0 6.3 18H17a2 2 0 0 0 1.9-1.4L21 8H7.4l-.5-2zM9 20a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg></a>` : ""}
          </div>
        `;
        grid.appendChild(card);
      });
    } catch (error) {
      count.textContent = "Falha ao carregar";
      grid.innerHTML = `<p class="section-muted">${error instanceof Error ? error.message : "Erro ao carregar albuns."}</p>`;

      if (storeStatus) {
        storeStatus.textContent = "Nao foi possivel carregar a lista de albuns agora.";
      }
    }
  };

  renderProductsAdminPanel(user, siteConfig, refreshAlbums);
  await refreshAlbums();
}

function renderAgendaAdminPanel(user, siteConfig, refreshSchedule) {
  if (!user?.isAdmin || page !== "agenda") {
    return;
  }

  const panel = ensureAdminPanel();

  if (!panel) {
    return;
  }

  panel.innerHTML = `
    <div class="admin-panel-head">
      <strong>Admin RoseMattos</strong>
      <span>Agenda</span>
    </div>
    <form id="admin-schedule-form" class="admin-form-grid">
      <label>Data
        <input id="admin-schedule-date" type="text" placeholder="06/09">
      </label>
      <label>Igreja / evento
        <input id="admin-schedule-place" type="text" placeholder="Igreja Assembleia...">
      </label>
      <label>Cidade / regiao
        <input id="admin-schedule-city" type="text" placeholder="Pinheiros - SP">
      </label>
      <label>Horario
        <input id="admin-schedule-time" type="text" placeholder="10:00">
      </label>
      <button class="primary-button" type="submit">Adicionar agenda</button>
      <p id="admin-schedule-status" class="section-muted"></p>
    </form>
  `;

  const form = document.getElementById("admin-schedule-form");
  const status = document.getElementById("admin-schedule-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Salvando...";

    try {
      const response = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          monthLabel: "",
          dateLabel: document.getElementById("admin-schedule-date").value,
          place: document.getElementById("admin-schedule-place").value,
          city: document.getElementById("admin-schedule-city").value,
          time: document.getElementById("admin-schedule-time").value
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar agenda.");
      }

      status.textContent = "Agenda adicionada e publicada.";
      form.reset();
      await refreshSchedule();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Erro ao salvar agenda.";
    }
  });
}

async function loadSchedule(siteConfig, user) {
  const grid = document.getElementById("schedule-grid");

  if (!grid) {
    return;
  }

  const refreshSchedule = async () => {
    const response = await fetch("/api/site/config");
    const data = await response.json();
    const scheduleItems = Array.isArray(data.schedule) ? data.schedule : [];

    grid.innerHTML = "";

    scheduleItems.forEach((item) => {
      const card = document.createElement("article");
      card.className = "schedule-card";
      card.innerHTML = `
        <p class="schedule-day">${item.dateLabel}</p>
        <h3>${item.place}</h3>
        <p>${item.city}</p>
        <strong>${item.time}</strong>
      `;
      grid.appendChild(card);
    });
  };

  renderAgendaAdminPanel(user, siteConfig, refreshSchedule);
  await refreshSchedule();
}

markActiveNav();

const [siteConfig, currentUser] = await Promise.all([
  loadSiteConfig().catch(() => ({ pricing: { albumPriceCents: 4990, planPrices: {} }, schedule: [] })),
  loadCurrentUser().catch(() => null)
]);

await loadAlbums(siteConfig, currentUser);
await loadSchedule(siteConfig, currentUser);
