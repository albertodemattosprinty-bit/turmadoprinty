import { albums } from "./albums.js";

const DEFAULT_PRICE_CENTS = Number(process.env.DEFAULT_PRODUCT_PRICE_CENTS || 4990);

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildDescription(album) {
  if (album.tracks > 0) {
    return `${album.tracks} faixas para ministerio infantil`;
  }

  return "Conteudo digital da Turma do Printy";
}

export const storeProducts = albums.map((album) => ({
  id: slugify(album.name),
  name: album.name,
  description: buildDescription(album),
  unitAmount: DEFAULT_PRICE_CENTS,
  quantity: 1,
  tracks: album.tracks
}));

export function formatPriceFromCents(valueInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format((Number(valueInCents) || 0) / 100);
}

export function findStoreProductById(productId) {
  return storeProducts.find((item) => item.id === productId) || null;
}

export function slugifyAlbumName(value) {
  return slugify(value);
}
