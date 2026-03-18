const purchaseStorageKey = "turma_do_printy_purchased_albums";

const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productDescription = document.getElementById("product-description");
const productPrice = document.getElementById("product-price");
const productTrackCount = document.getElementById("product-track-count");
const buyAlbumButton = document.getElementById("buy-album-button");
const purchaseStatus = document.getElementById("purchase-status");
const manifestStatus = document.getElementById("manifest-status");
const trackList = document.getElementById("track-list");

function getAlbumId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("album") || "";
}

function getPurchases() {
  try {
    return JSON.parse(window.localStorage.getItem(purchaseStorageKey) || "{}");
  } catch {
    return {};
  }
}

function setPurchases(purchases) {
  window.localStorage.setItem(purchaseStorageKey, JSON.stringify(purchases));
}

function markAlbumPurchased(albumId) {
  const purchases = getPurchases();
  purchases[albumId] = {
    purchased: true,
    updatedAt: new Date().toISOString()
  };
  setPurchases(purchases);
}

function hasPurchasedAlbum(albumId) {
  return Boolean(getPurchases()[albumId]?.purchased);
}

function updatePurchaseState(albumId) {
  const purchased = hasPurchasedAlbum(albumId);
  purchaseStatus.textContent = purchased
    ? "Compra registrada neste navegador. Downloads liberados por faixa."
    : "Streaming liberado. O download por faixa aparece depois da compra.";
}

async function startCheckout(albumId) {
  const originalText = buyAlbumButton.textContent;
  buyAlbumButton.disabled = true;
  buyAlbumButton.textContent = "Abrindo checkout...";

  try {
    const response = await fetch("/api/payments/pagbank/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ productId: albumId })
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

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
  const purchased = hasPurchasedAlbum(album.id);
  trackList.innerHTML = "";

  album.tracks.forEach((track) => {
    const article = document.createElement("article");
    article.className = "track-card";
    article.innerHTML = `
      <div class="track-copy">
        <p class="track-number">Faixa ${String(track.number).padStart(3, "0")}</p>
        <h3>${track.label}</h3>
      </div>
      <audio controls preload="none" class="track-player" src="${track.streamUrl}"></audio>
      <div class="track-actions">
        ${purchased ? `<a class="ghost-button" href="${track.downloadUrl}" download>Baixar faixa</a>` : `<button class="ghost-button" type="button" disabled>Comprar para baixar</button>`}
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

  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "return") {
    markAlbumPurchased(albumId);
  }

  try {
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

    buyAlbumButton.addEventListener("click", async () => {
      await startCheckout(album.id);
    }, { once: true });
  } catch (error) {
    productTitle.textContent = "Nao foi possivel abrir o album";
    purchaseStatus.textContent = error instanceof Error ? error.message : "Erro desconhecido.";
    buyAlbumButton.disabled = true;
  }
}

await loadAlbumDetail();
