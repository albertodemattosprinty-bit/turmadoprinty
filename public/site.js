import { getToken, initSiteHeader, loadCurrentUser } from "./header.js";
import { applyTextOverrides, initContentAdmin } from "./content-admin.js";
import { getApiUrl } from "./api.js";

const page = document.body.dataset.page || "";
const bannerConfigByPage = {
  home: {
    label: "Destaques da Turma do Printy",
    rotationMs: 5000,
    slides: [
      { mobile: "/images/home.png", desktop: "/images/homed.png", alt: "Banner principal da Home" },
      { mobile: "/images/promo1.png", desktop: "/images/promo1d.png", alt: "Banner promocional 1" },
      { mobile: "/images/promo4.png", desktop: "/images/promo4d.png", alt: "Banner promocional 4" },
      { mobile: "/images/promo2.png", desktop: "/images/promod2.png", alt: "Banner promocional 2" },
      { mobile: "/images/promo3.png", desktop: "/images/promo3d.png", alt: "Banner promocional 3" }
    ]
  },
  produtos: {
    label: "Destaques de produtos",
    rotationMs: 5000,
    slides: [
      { mobile: "/images/cantata.png", desktop: "/images/cantatad.png", alt: "Banner da cantata" },
      { mobile: "/images/promo3.png", desktop: "/images/promo3d.png", alt: "Banner promocional 3" }
    ]
  },
  eventos: {
    label: "Agenda de eventos",
    slides: [
      { mobile: "/images/agenda.png", desktop: "/images/agendad.png", alt: "Banner da agenda de eventos" }
    ]
  }
};

function markActiveNav() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      (page === "home" && href === "/index.html") ||
      href === `/${page}.html` ||
      ((page === "agenda" || page === "cursos") && href === "/eventos.html")
    ) {
      link.classList.add("active");
    }
  });
}

async function loadSiteConfig() {
  const response = await fetch(getApiUrl("/api/site/config"));
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
  const response = await fetch(getApiUrl("/api/admin/pricing"), {
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
  applyTextOverrides(panel);

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
      const response = await fetch(getApiUrl(page === "produtos" ? "/api/store/products" : "/api/albums"));
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
        const card = document.createElement(album.href ? "a" : "article");
        card.className = `album-card${album.href ? " album-card-link" : ""}`;

        if (album.href) {
          card.href = album.href;
          card.setAttribute("aria-label", `Abrir detalhes do album ${album.name}`);
        }

        card.innerHTML = `
          <img class="album-cover" src="${album.coverUrl}" alt="Capa do album ${album.name}">
          <div class="album-body">
            <h3>${album.name}</h3>
            ${album.priceLabel ? `<p class="album-price">${album.priceLabel}</p>` : ""}
          </div>
        `;
        grid.appendChild(card);
      });

      applyTextOverrides(grid);
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

function createBannerPicture(slide, index, total) {
  const picture = document.createElement("picture");
  picture.className = "page-banner-slide";
  picture.setAttribute("role", "group");
  picture.setAttribute("aria-roledescription", "slide");
  picture.setAttribute("aria-label", `${index + 1} de ${total}`);
  picture.innerHTML = `
    <source media="(min-width: 981px)" srcset="${slide.desktop}">
    <img src="${slide.mobile}" alt="${slide.alt}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async">
  `;
  return picture;
}

function initPageBanner() {
  const config = bannerConfigByPage[page];

  if (!config) {
    return;
  }

  const header = document.querySelector(".site-header");

  if (!header || document.querySelector(".page-top-banner")) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "page-top-banner";
  banner.setAttribute("aria-label", config.label);

  const viewport = document.createElement("div");
  viewport.className = "page-banner-viewport";
  banner.appendChild(viewport);

  const slides = config.slides.map((slide, index) => {
    const node = createBannerPicture(slide, index, config.slides.length);
    node.classList.toggle("is-active", index === 0);
    viewport.appendChild(node);
    return node;
  });

  if (slides.length > 1) {
    const dots = document.createElement("div");
    dots.className = "page-banner-dots";
    dots.setAttribute("aria-hidden", "true");

    const indicators = slides.map((_, index) => {
      const dot = document.createElement("span");
      dot.className = "page-banner-dot";
      dot.classList.toggle("is-active", index === 0);
      dots.appendChild(dot);
      return dot;
    });

    banner.appendChild(dots);

    let activeIndex = 0;
    window.setInterval(() => {
      slides[activeIndex].classList.remove("is-active");
      indicators[activeIndex].classList.remove("is-active");
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex].classList.add("is-active");
      indicators[activeIndex].classList.add("is-active");
    }, config.rotationMs || 5000);
  }

  header.insertAdjacentElement("afterend", banner);
}

function renderAgendaAdminPanel(user, siteConfig, refreshSchedule) {
  if (!user?.isAdmin || page !== "eventos") {
    return;
  }

  const panel = ensureAdminPanel();

  if (!panel) {
    return;
  }

  panel.innerHTML = `
    <div class="admin-panel-head">
      <strong>Admin RoseMattos</strong>
      <span>Eventos</span>
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
  applyTextOverrides(panel);

  const form = document.getElementById("admin-schedule-form");
  const status = document.getElementById("admin-schedule-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Salvando...";

    try {
      const response = await fetch(getApiUrl("/api/admin/schedule"), {
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
    const response = await fetch(getApiUrl("/api/site/config"));
    const data = await response.json();
    const scheduleItems = Array.isArray(data.schedule) ? data.schedule : [];

    grid.innerHTML = "";

    scheduleItems.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = `schedule-card schedule-color-${(index % 5) + 1}`;
      const canEditEvent = Boolean(user && item.contractorUserId === user.id);
      card.innerHTML = `
        <div class="schedule-card-head">
          <p class="schedule-day" data-field="dateLabel">${item.dateLabel}</p>
          ${
            canEditEvent
              ? `<button class="schedule-edit-button" type="button" aria-label="Editar evento" title="Editar evento">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.2V20h2.8l9.86-9.87-2.8-2.8zM18.71 8.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.17 1.17 2.8 2.8z"/></svg>
                </button>`
              : ""
          }
        </div>
        <h3 data-field="place">${item.place}</h3>
        <p data-field="city">${item.city}</p>
        <strong data-field="time">${item.time}</strong>
      `;

      if (canEditEvent) {
        const button = card.querySelector(".schedule-edit-button");
        let editing = false;

        const setEditing = (nextEditing) => {
          editing = nextEditing;
          button.innerHTML = nextEditing
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.55 18.2-4.7-4.7 1.4-1.4 3.3 3.3 8.2-8.2 1.4 1.4z"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.2V20h2.8l9.86-9.87-2.8-2.8zM18.71 8.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.17 1.17 2.8 2.8z"/></svg>';
          button.setAttribute("aria-label", nextEditing ? "Salvar evento" : "Editar evento");
          button.title = nextEditing ? "Salvar evento" : "Editar evento";

          card.querySelectorAll("[data-field]").forEach((fieldNode) => {
            if (nextEditing) {
              fieldNode.setAttribute("contenteditable", "true");
              fieldNode.classList.add("is-editing");
            } else {
              fieldNode.removeAttribute("contenteditable");
              fieldNode.classList.remove("is-editing");
            }
          });
        };

        button.addEventListener("click", async () => {
          if (!editing) {
            setEditing(true);
            return;
          }

          button.disabled = true;

          try {
            const response = await fetch(getApiUrl(`/api/events/${encodeURIComponent(item.id)}/contractor`), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`
              },
              body: JSON.stringify({
                dateLabel: card.querySelector('[data-field="dateLabel"]')?.textContent?.trim() || item.dateLabel,
                place: card.querySelector('[data-field="place"]')?.textContent?.trim() || item.place,
                city: card.querySelector('[data-field="city"]')?.textContent?.trim() || item.city,
                time: card.querySelector('[data-field="time"]')?.textContent?.trim() || item.time
              })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(data.error || "Falha ao salvar evento.");
            }

            setEditing(false);
            await refreshSchedule();
          } catch (error) {
            alert(error instanceof Error ? error.message : "Erro ao salvar evento.");
          } finally {
            button.disabled = false;
          }
        });
      }

      grid.appendChild(card);
    });

    applyTextOverrides(grid);
  };

  renderAgendaAdminPanel(user, siteConfig, refreshSchedule);
  await refreshSchedule();
}

markActiveNav();
initPageBanner();
const headerUser = await initSiteHeader().catch(() => null);

const [siteConfig, currentUser] = await Promise.all([
  loadSiteConfig().catch(() => ({ pricing: { albumPriceCents: 4990, planPrices: {} }, schedule: [], banners: {}, textOverrides: {} })),
  Promise.resolve(headerUser || null)
]);

initContentAdmin({
  user: currentUser,
  getToken,
  config: siteConfig
});

await loadAlbums(siteConfig, currentUser);
await loadSchedule(siteConfig, currentUser);
