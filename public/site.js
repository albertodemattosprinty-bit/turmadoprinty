import { getToken, initSiteHeader } from "./header.js";
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

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isRoseMattosUser(user) {
  return Boolean(user?.isAdmin) && normalizeUsername(user?.username) === "rosemattos";
}

function buildProductsAuthRedirect(filter) {
  const next = filter === "owned" ? "/produtos.html?modo=owned" : "/produtos.html";
  return `/auth.html?next=${encodeURIComponent(next)}`;
}

function parseProductsMode() {
  const mode = new URLSearchParams(window.location.search).get("modo");
  return mode === "owned" ? "owned" : "all";
}

async function loadProductsAccessState() {
  const token = getToken();

  if (!token) {
    return {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
  }

  try {
    const response = await fetch(getApiUrl("/api/account/access"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      return {
        authenticated: false,
        canDownloadAll: false,
        purchasedAlbumIds: []
      };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Falha ao carregar seus albuns.");
    }

    return {
      authenticated: true,
      canDownloadAll: Boolean(data.access?.canDownloadAll),
      purchasedAlbumIds: Array.isArray(data.access?.purchasedAlbumIds) ? data.access.purchasedAlbumIds : []
    };
  } catch {
    return {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
  }
}

function inferDownloadName(response, fallbackName) {
  const contentDisposition = response.headers.get("content-disposition") || "";
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] || fallbackName;
}

function escapeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function triggerBrowserDownload(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1500);
}

function triggerMissingZipEffect(card) {
  const cover = card?.querySelector(".album-cover");

  if (!cover) {
    return;
  }

  cover.classList.remove("album-cover-missing-zip");
  void cover.offsetWidth;
  cover.classList.add("album-cover-missing-zip");
}

async function loadAlbums(siteConfig, user) {
  const grid = document.getElementById("album-grid");
  const storeStatus = document.getElementById("store-status");

  if (!grid) {
    return;
  }

  if (page !== "produtos") {
    const refreshAlbums = async () => {
      grid.innerHTML = "";

      try {
        const response = await fetch(getApiUrl("/api/albums"));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Falha ao carregar o catalogo.");
        }

        const items = Array.isArray(data.items) ? data.items : [];

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
            </div>
          `;
          grid.appendChild(card);
        });

        applyTextOverrides(grid);
      } catch (error) {
        grid.innerHTML = `<p class="section-muted">${error instanceof Error ? error.message : "Erro ao carregar albuns."}</p>`;
      }
    };

    await refreshAlbums();
    return;
  }

  const filterBar = document.getElementById("products-filter-bar");
  const zipInput = document.getElementById("album-zip-input");
  let activeFilter = parseProductsMode();
  let selectedAlbumId = "";
  let uploadAlbumId = "";
  let items = [];
  const albumFeedbackById = new Map();
  const albumLinkDraftById = new Map();
  let accessState = {
    authenticated: false,
    canDownloadAll: false,
    purchasedAlbumIds: []
  };

  const isRose = isRoseMattosUser(user);

  const ownsAlbum = (album) => {
    if (isRose) {
      return true;
    }

    if (accessState.canDownloadAll) {
      return true;
    }

    return accessState.purchasedAlbumIds.includes(album.id);
  };

  const getOwnedAlbums = () => items.filter((album) => ownsAlbum(album));

  const setAlbumFeedback = (albumId, message, tone = "neutral") => {
    if (!albumId) {
      return;
    }

    if (!message) {
      albumFeedbackById.delete(albumId);
      return;
    }

    albumFeedbackById.set(albumId, {
      message,
      tone
    });
  };

  const getAlbumFeedback = (album) => {
    const savedFeedback = albumFeedbackById.get(album.id);

    if (savedFeedback?.message) {
      return savedFeedback;
    }

    if (isRose) {
      return {
        message: album.hasAlbumZip ? "ZIP online neste álbum" : "Aguardando envio do ZIP",
        tone: album.hasAlbumZip ? "success" : "neutral"
      };
    }

    return {
      message: album.hasAlbumZip ? "ZIP pronto para download" : "Album liberado na sua conta",
      tone: album.hasAlbumZip ? "success" : "neutral"
    };
  };

  const setFilterButtons = () => {
    filterBar?.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-filter") === activeFilter);
    });
  };

  const syncSelectedAlbum = (visibleItems) => {
    if (!visibleItems.length) {
      selectedAlbumId = "";
      return;
    }

    if (!visibleItems.some((album) => album.id === selectedAlbumId)) {
      selectedAlbumId = visibleItems[0].id;
    }
  };

  const updateProductsStatus = (visibleItems) => {
    if (storeStatus) {
      storeStatus.textContent = "";
    }
  };

  const updateAlbumInState = (nextAlbum) => {
    const normalizedAlbumZipUrl = typeof nextAlbum?.albumZipUrl === "string" && nextAlbum.albumZipUrl.trim()
      ? nextAlbum.albumZipUrl.trim()
      : "";
    const normalizedHasAlbumZip = typeof nextAlbum?.hasAlbumZip === "boolean"
      ? nextAlbum.hasAlbumZip
      : Boolean(normalizedAlbumZipUrl && normalizedAlbumZipUrl !== "[none]");

    items = items.map((album) => (
      album.id === nextAlbum.id
        ? {
            ...album,
            ...nextAlbum,
            albumZipUrl: normalizedAlbumZipUrl || album.albumZipUrl,
            hasAlbumZip: normalizedHasAlbumZip
          }
        : album
    ));
  };

  const renderOwnedCardAction = (album) => {
    const isSelected = album.id === selectedAlbumId;

    if (isRose) {
      const isUploading = uploadAlbumId === album.id;
      const isOnline = Boolean(album.hasAlbumZip);
      const label = isUploading ? "Enviando..." : isOnline ? "Zip Online" : "Enviar Zip";
      const draftLink = albumLinkDraftById.get(album.id) || (album.albumZipUrl && album.albumZipUrl !== "[none]" ? album.albumZipUrl : "");

      return `
        <div class="album-card-action${isSelected ? " is-visible" : ""}">
          <button
            class="primary-button album-zip-button album-zip-button-admin${isOnline ? " is-online" : ""}"
            type="button"
            data-role="album-zip-action"
            data-album-id="${album.id}"
            ${isUploading || !isSelected ? "disabled" : ""}
          >${label}</button>
        </div>
        <div class="album-link-form${isSelected ? " is-visible" : ""}">
          <input
            class="album-link-input"
            type="url"
            placeholder="https://seu-link-do-zip"
            value="${escapeHtmlAttribute(draftLink)}"
            data-role="album-link-input"
            data-album-id="${album.id}"
            ${!isSelected ? "disabled" : ""}
          >
          <button
            class="ghost-button album-link-button"
            type="button"
            data-role="album-link-submit"
            data-album-id="${album.id}"
            ${isUploading || !isSelected ? "disabled" : ""}
          >Enviar link</button>
        </div>
      `;
    }

    return `
      <div class="album-card-action${isSelected ? " is-visible" : ""}">
        <button
          class="primary-button album-zip-button"
          type="button"
          data-role="album-zip-action"
          data-album-id="${album.id}"
          ${!isSelected ? "disabled" : ""}
        >Download</button>
      </div>
    `;
  };

  const bindOwnedCardEvents = () => {
    grid.querySelectorAll(".album-card-owned").forEach((card) => {
      card.addEventListener("click", () => {
        selectedAlbumId = card.dataset.albumId || "";
        renderProducts();
      });
    });

    grid.querySelectorAll("[data-role='album-zip-action']").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const albumId = button.getAttribute("data-album-id") || "";
        const album = items.find((item) => item.id === albumId);
        const card = button.closest(".album-card-owned");

        if (!album || !card) {
          return;
        }

        if (isRose) {
          if (!(zipInput instanceof HTMLInputElement)) {
            return;
          }

          zipInput.dataset.albumId = album.id;
          zipInput.click();
          return;
        }

        if (!accessState.authenticated) {
          window.location.href = buildProductsAuthRedirect("owned");
          return;
        }

        if (!album.hasAlbumZip) {
          triggerMissingZipEffect(card);
          setAlbumFeedback(album.id, "ZIP ainda nao disponivel para este album.", "error");
          if (storeStatus) {
            storeStatus.textContent = "Esse album ainda esta sem ZIP online.";
          }
          renderProducts();
          return;
        }

        try {
          button.setAttribute("disabled", "disabled");
          window.open(album.albumZipUrl, "_blank", "noopener");

          if (storeStatus) {
            storeStatus.textContent = "Download iniciado.";
          }
        } catch (error) {
          if (storeStatus) {
            storeStatus.textContent = error instanceof Error ? error.message : "Erro ao baixar ZIP.";
          }
        } finally {
          button.removeAttribute("disabled");
        }
      });
    });

    grid.querySelectorAll("[data-role='album-link-input']").forEach((input) => {
      input.addEventListener("input", (event) => {
        const field = event.currentTarget;

        if (!(field instanceof HTMLInputElement)) {
          return;
        }

        albumLinkDraftById.set(field.dataset.albumId || "", field.value);
      });
    });

    grid.querySelectorAll("[data-role='album-link-submit']").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (!isRose) {
          return;
        }

        const albumId = button.getAttribute("data-album-id") || "";
        const album = items.find((item) => item.id === albumId);
        const linkInput = grid.querySelector(`[data-role='album-link-input'][data-album-id='${albumId}']`);
        const zipUrl = linkInput instanceof HTMLInputElement ? linkInput.value.trim() : "";

        if (!album) {
          return;
        }

        albumLinkDraftById.set(albumId, zipUrl);

        if (!/^https?:\/\//i.test(zipUrl)) {
          setAlbumFeedback(albumId, "Cole um link valido com http:// ou https://.", "error");
          renderProducts();
          return;
        }

        button.setAttribute("disabled", "disabled");
        setAlbumFeedback(albumId, "Salvando link deste album...", "neutral");
        renderProducts();

        try {
          const response = await fetch(getApiUrl(`/api/admin/albums/${encodeURIComponent(albumId)}/zip-link`), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({ zipUrl })
          });
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.error || "Nao foi possivel salvar o link do ZIP.");
          }

          updateAlbumInState(data.album || {});
          albumLinkDraftById.set(albumId, zipUrl);
          setAlbumFeedback(albumId, "Link salvo e publicado neste album.", "success");

          if (storeStatus) {
            storeStatus.textContent = `Link de ZIP salvo para ${album.name}.`;
          }
        } catch (error) {
          setAlbumFeedback(albumId, error instanceof Error ? error.message : "Erro ao salvar link do ZIP.", "error");
          if (storeStatus) {
            storeStatus.textContent = error instanceof Error ? error.message : "Erro ao salvar link do ZIP.";
          }
        } finally {
          button.removeAttribute("disabled");
          renderProducts();
        }
      });
    });
  };

  const renderProducts = () => {
    grid.innerHTML = "";
    setFilterButtons();

    const visibleItems = activeFilter === "owned" ? getOwnedAlbums() : items;
    syncSelectedAlbum(visibleItems);
    updateProductsStatus(visibleItems);

    if (!visibleItems.length) {
      grid.innerHTML = activeFilter === "owned"
        ? `<p class="section-muted">${accessState.authenticated || isRose ? "Nenhum album disponivel neste filtro ainda." : "Entre na sua conta para liberar a lista dos seus albuns."}</p>`
        : "<p class=\"section-muted\">Nenhum album disponivel no momento.</p>";
      return;
    }

    visibleItems.forEach((album) => {
      if (activeFilter === "all") {
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
        return;
      }

      const card = document.createElement("article");
      const isSelected = album.id === selectedAlbumId;
      card.className = `album-card album-card-owned${isSelected ? " is-selected" : ""}`;
      card.dataset.albumId = album.id;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Selecionar album ${album.name}`);
      card.innerHTML = `
        <img class="album-cover" src="${album.coverUrl}" alt="Capa do album ${album.name}">
        <div class="album-body">
          <h3>${album.name}</h3>
          ${album.priceLabel ? `<p class="album-price">${album.priceLabel}</p>` : ""}
        </div>
        ${renderOwnedCardAction(album)}
      `;
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectedAlbumId = album.id;
          renderProducts();
        }
      });
      grid.appendChild(card);
    });

    bindOwnedCardEvents();
    applyTextOverrides(grid);
  };

  const refreshAlbums = async () => {
    grid.innerHTML = "";

    try {
      const [productsResponse, nextAccessState] = await Promise.all([
        fetch(getApiUrl("/api/store/products")),
        loadProductsAccessState()
      ]);
      const data = await productsResponse.json();

      if (!productsResponse.ok) {
        throw new Error(data.error || "Falha ao carregar o catalogo.");
      }

      items = Array.isArray(data.items) ? data.items : [];
      accessState = nextAccessState;
      renderProducts();
    } catch (error) {
      grid.innerHTML = `<p class="section-muted">${error instanceof Error ? error.message : "Erro ao carregar albuns."}</p>`;

      if (storeStatus) {
        storeStatus.textContent = "Nao foi possivel carregar a lista de albuns agora.";
      }
    }
  };

  filterBar?.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.getAttribute("data-filter") === "owned" ? "owned" : "all";
      const url = new URL(window.location.href);

      if (activeFilter === "owned") {
        url.searchParams.set("modo", "owned");
      } else {
        url.searchParams.delete("modo");
      }

      window.history.replaceState({}, "", url);
      renderProducts();
    });
  });

  zipInput?.addEventListener("change", async (event) => {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const albumId = input.dataset.albumId || "";
    const album = items.find((item) => item.id === albumId);
    const file = input.files?.[0];
    input.value = "";

    if (!album || !file) {
      return;
    }

    uploadAlbumId = album.id;
    setAlbumFeedback(album.id, "Enviando ZIP para este album...", "neutral");
    renderProducts();

    try {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        throw new Error("Escolha um arquivo .zip.");
      }

      if (storeStatus) {
        storeStatus.textContent = `Enviando ZIP de ${album.name}...`;
      }

      const response = await fetch(getApiUrl(`/api/admin/albums/${encodeURIComponent(album.id)}/zip`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": file.type || "application/zip",
          "X-File-Name": encodeURIComponent(file.name)
        },
        body: file
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel enviar o ZIP.");
      }

      updateAlbumInState(data.album || {});
      setAlbumFeedback(album.id, "ZIP online neste album.", "success");
      if (storeStatus) {
        storeStatus.textContent = `ZIP de ${album.name} publicado no bucket.`;
      }
    } catch (error) {
      setAlbumFeedback(album.id, error instanceof Error ? error.message : "Erro ao enviar ZIP.", "error");
      if (storeStatus) {
        storeStatus.textContent = error instanceof Error ? error.message : "Erro ao enviar ZIP.";
      }
    } finally {
      uploadAlbumId = "";
      renderProducts();
    }
  });

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

function buildBannerLoader() {
  const loader = document.createElement("div");
  loader.className = "page-banner-loader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = `
    <div class="page-banner-loader-outer">
      <div class="page-banner-loader-inner">
        <div class="page-banner-loader-core"></div>
      </div>
    </div>
  `;
  return loader;
}

function whenImageReady(image) {
  return new Promise((resolve) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }

    const finish = () => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };

    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
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
  banner.classList.add("is-loading");
  banner.appendChild(viewport);
  banner.appendChild(buildBannerLoader());

  const slides = config.slides.map((slide, index) => {
    const node = createBannerPicture(slide, index, config.slides.length);
    node.classList.toggle("is-active", index === 0);
    viewport.appendChild(node);
    return node;
  });

  const firstBannerImage = slides[0]?.querySelector("img");
  if (firstBannerImage) {
    whenImageReady(firstBannerImage).then(() => {
      banner.classList.remove("is-loading");
    });
  } else {
    banner.classList.remove("is-loading");
  }

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
