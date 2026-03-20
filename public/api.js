const nativeApiOrigin = "https://www.turmadoprinty.com.br";

function getConfiguredApiOrigin() {
  const metaValue = document
    .querySelector('meta[name="tdp-api-base-url"]')
    ?.getAttribute("content")
    ?.trim();

  if (metaValue) {
    return metaValue.replace(/\/+$/, "");
  }

  const runtimeValue = typeof window.__TDP_API_BASE_URL__ === "string"
    ? window.__TDP_API_BASE_URL__.trim()
    : "";

  if (runtimeValue) {
    return runtimeValue.replace(/\/+$/, "");
  }

  const capacitor = window.Capacitor;
  const platform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "web";
  const isNative = typeof capacitor?.isNativePlatform === "function"
    ? capacitor.isNativePlatform()
    : platform === "android" || platform === "ios";

  if (isNative) {
    return nativeApiOrigin;
  }

  return window.location.origin.replace(/\/+$/, "");
}

export function getApiOrigin() {
  return getConfiguredApiOrigin();
}

export function getApiUrl(path) {
  if (!path) {
    return getConfiguredApiOrigin();
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getConfiguredApiOrigin()}${normalizedPath}`;
}
