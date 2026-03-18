const sessionStorageKey = "turma_do_printy_token";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productDescription = document.getElementById("product-description");
const productPrice = document.getElementById("product-price");
const productTrackCount = document.getElementById("product-track-count");
const buyAlbumButton = document.getElementById("buy-album-button");
const purchaseStatus = document.getElementById("purchase-status");
const manifestStatus = document.getElementById("manifest-status");
const trackList = document.getElementById("track-list");

let accessState = {
  authenticated: false,
  canDownloadAll: false,
  purchasedAlbumIds: []
};

function getAlbumId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("album") || "";
}

function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

function getAuthRedirectUrl(albumId) {
  return `/auth.html?next=${encodeURIComponent(`/produto.html?album=${encodeURIComponent(albumId)}`)}`;
}

function redirectToAuth(albumId) {
  window.location.href = getAuthRedirectUrl(albumId);
}

function hasPurchasedAlbum(albumId) {
  return accessState.purchasedAlbumIds.includes(albumId);
}

function hasPaidPlan() {
  return accessState.canDownloadAll;
}

async function loadAccessState() {
  const token = getToken();

  if (!token) {
    accessState = {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    return;
  }

  const response = await fetch("/api/account/access", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (response.status === 401) {
    window.localStorage.removeItem(sessionStorageKey);
    accessState = {
      authenticated: false,
      canDownloadAll: false,
      purchasedAlbumIds: []
    };
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha ao carregar acesso do usuario.");
  }

  accessState = {
    authenticated: true,
    canDownloadAll: Boolean(data.access.canDownloadAll),
    purchasedAlbumIds: Array.isArray(data.access.purchasedAlbumIds) ? data.access.purchasedAlbumIds : []
  };
}

function updatePurchaseState(albumId) {
  const purchased = hasPurchasedAlbum(albumId);
  const params = new URLSearchParams(window.location.search);

  if (params.get("payment") === "return") {
    purchaseStatus.textContent = "Pagamento enviado ao PagBank. Aguarde a confirmacao para liberar os downloads.";
    return;
  }

  if (hasPaidPlan()) {
    purchaseStatus.textContent = "Plano pago ativo no servidor. Downloads liberados para todas as musicas.";
    return;
  }

  if (purchased) {
    purchaseStatus.textContent = "Compra confirmada no servidor. Downloads liberados por faixa.";
    return;
  }

  purchaseStatus.textContent = accessState.authenticated
    ? "Streaming liberado. Compre este album ou assine um plano pago para baixar."
    : "Streaming liberado. Faca login para comprar este album ou assinar um plano pago.";
}

async function startCheckout(albumId) {
  const token = getToken();

  if (!token) {
    redirectToAuth(albumId);
    return;
  }

  const originalText = buyAlbumButton.textContent;
  buyAlbumButton.disabled = true;
  buyAlbumButton.textContent = "Abrindo checkout...";

  try {
    const response = await fetch("/api/payments/pagbank/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: albumId })
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (response.status === 401) {
      redirectToAuth(albumId);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Falha ao criar checkout.");
    }

    if (!data.payUrl) {
      throw new Error("Checkout criado sem link de pagamento.");
    }

    window.location.href = data.payUrl;
  } catch (error) {
    purchaseStatus.textContent = error instanceof Error ? error.message : "Erro ao iniciar pagamento.";
    buyAlbumButton.disabled = false;
    buyAlbumButton.textContent = originalText;
  }
}

function renderTracks(album) {
  const purchased = hasPurchasedAlbum(album.id) || hasPaidPlan();
  trackList.innerHTML = "";

  album.tracks.forEach((track) => {
    const downloadHref = `/api/store/products/${encodeURIComponent(album.id)}/tracks/${track.number}/download`;
    const article = document.createElement("article");
    article.className = "track-card";
    article.innerHTML = `
      <div class="track-copy">
        <p class="track-number">Faixa ${String(track.number).padStart(3, "0")}</p>
        <h3>${track.label}</h3>
      </div>
      <audio controls preload="none" class="track-player" src="${track.streamUrl}"></audio>
      <div class="track-actions">
        ${purchased
          ? `<a class="ghost-button" href="${downloadHref}">Baixar faixa</a>`
          : `<button class="ghost-button" type="button" disabled>${accessState.authenticated ? "Compre para baixar" : "Faca login para comprar"}</button>`}
      </div>
    `;
    trackList.appendChild(article);
  });
}

async function loadAlbumDetail() {
  const albumId = getAlbumId();

  if (!albumId) {
    productTitle.textContent = "Album nao encontrado";
    purchaseStatus.textContent = "Escolha um album pela pagina de produtos.";
    buyAlbumButton.disabled = true;
    return;
  }

  try {
    await loadAccessState();

    const response = await fetch(`/api/store/products/${encodeURIComponent(albumId)}`);
    const album = await response.json();

    if (!response.ok) {
      throw new Error(album.error || "Falha ao carregar album.");
    }

    document.title = `Turma do Printy | ${album.name}`;
    productCover.src = album.coverUrl;
    productCover.alt = `Capa do album ${album.name}`;
    productTitle.textContent = album.name;
    productDescription.textContent = album.description;
    productPrice.textContent = album.priceLabel;
    productTrackCount.textContent = `${album.tracks.length} faixas`;
    manifestStatus.textContent = album.hasManifest
      ? "Titulos carregados do manifest do album."
      : "Manifest de faixas nao encontrado. Exibindo numeracao padrao.";
    updatePurchaseState(album.id);
    renderTracks(album);

    buyAlbumButton.onclick = async () => {
      await startCheckout(album.id);
    };
  } catch (error) {
    productTitle.textContent = "Nao foi possivel abrir o album";
    purchaseStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido.";
    buyAlbumButton.disabled = true;
  }
}

await loadAlbumDetail();
