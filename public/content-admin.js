import { getApiUrl } from "./api.js";

const EDITABLE_SELECTOR = "h1, h2, h3, h4, h5, h6, p, span, strong, a, button, label, small, li";
let activeConfig = {
  banners: {},
  textOverrides: {}
};
let adminState = {
  canEdit: false,
  getToken: () => "",
  onConfigChange: null
};
let contentNotice = null;
let bannerResizeBound = false;
let textEditorBound = false;

function ensureNotice() {
  if (!contentNotice) {
    contentNotice = document.createElement("div");
    contentNotice.className = "floating-notice";
    document.body.appendChild(contentNotice);
  }

  return contentNotice;
}

function showNotice(message) {
  const notice = ensureNotice();
  notice.textContent = message;
  notice.classList.add("visible");
  window.clearTimeout(showNotice.timeoutId);
  showNotice.timeoutId = window.setTimeout(() => {
    notice.classList.remove("visible");
  }, 2200);
}

function normalizeRawTextKey(text) {
  return `raw::${String(text || "").trim().replace(/\s+/g, " ")}`;
}

function ensureTextKeys(root = document.body) {
  root.querySelectorAll(EDITABLE_SELECTOR).forEach((element) => {
    if (element.closest(".admin-panel, [data-no-global-edit='true']")) {
      return;
    }

    const explicitKey = element.dataset.textKey;

    if (explicitKey) {
      if (!element.dataset.textOriginal) {
        element.dataset.textOriginal = element.textContent.trim();
      }
      return;
    }

    if (element.children.length > 0) {
      return;
    }

    const text = element.textContent.trim();

    if (!text) {
      return;
    }

    element.dataset.textKey = normalizeRawTextKey(text);
    element.dataset.textOriginal = text;
  });
}

export function setActiveSiteConfig(config = {}) {
  activeConfig = {
    banners: config.banners || {},
    textOverrides: config.textOverrides || {}
  };
}

export function getTextOverride(key, fallback = "") {
  return activeConfig.textOverrides?.[key] || fallback;
}

export function applyTextOverrides(root = document.body) {
  ensureTextKeys(root);

  root.querySelectorAll("[data-text-key]").forEach((element) => {
    const key = element.dataset.textKey;
    const original = element.dataset.textOriginal || element.textContent.trim();
    const nextText = activeConfig.textOverrides?.[key] || original;
    element.textContent = nextText;
  });
}

function getBannerSrcForViewport(entry = {}, fallback = "") {
  const isMobile = window.innerWidth <= 980;
  if (isMobile) {
    return entry.mobile || entry.desktop || fallback;
  }

  return entry.desktop || entry.mobile || fallback;
}

export function applyBannerOverrides(root = document.body) {
  root.querySelectorAll("img[data-banner-key]").forEach((image) => {
    const key = image.dataset.bannerKey;
    const fallback = image.dataset.bannerDefault || image.getAttribute("src") || "";
    const nextSrc = getBannerSrcForViewport(activeConfig.banners?.[key], fallback);

    if (!image.dataset.bannerDefault) {
      image.dataset.bannerDefault = fallback;
    }

    if (nextSrc && image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
  });
}

function bindBannerResize() {
  if (bannerResizeBound) {
    return;
  }

  bannerResizeBound = true;
  window.addEventListener("resize", () => applyBannerOverrides(document.body));
}

async function saveBanner({ bannerKey, target, imageDataUrl, token }) {
  const response = await fetch(getApiUrl("/api/admin/site/banner"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ bannerKey, target, imageDataUrl })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao salvar banner.");
  }

  return data;
}

async function saveTextOverride({ key, text, token }) {
  const response = await fetch(getApiUrl("/api/admin/site/text"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ key, text })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao salvar texto.");
  }

  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function createBannerAdminTools(image, getToken) {
  const bannerKey = image.dataset.bannerKey;

  if (!bannerKey || image.parentElement?.querySelector(`[data-banner-admin='${bannerKey}']`)) {
    return;
  }

  const shell = document.createElement("div");
  shell.className = "banner-admin-tools";
  shell.dataset.bannerAdmin = bannerKey;
  shell.innerHTML = `
    <label class="banner-upload-button" data-no-global-edit="true">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16a1 1 0 0 1-1-1V8.41l-2.3 2.3a1 1 0 0 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1-1.4 1.42L13 8.4V15a1 1 0 0 1-1 1m-7 3a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2z"/></svg>
      <span>Trocar banner</span>
    </label>
    <label class="banner-target-field" data-no-global-edit="true">
      <span>Aplicar em</span>
      <select>
        <option value="both">Mobile + Desktop</option>
        <option value="mobile">Mobile</option>
        <option value="desktop">Desktop</option>
      </select>
    </label>
  `;

  image.insertAdjacentElement("afterend", shell);

  const fileInput = shell.querySelector("input");
  const targetSelect = shell.querySelector("select");

  fileInput.addEventListener("change", async () => {
    const [file] = Array.from(fileInput.files || []);

    if (!file) {
      return;
    }

    const token = getToken();

    if (!token) {
      showNotice("Login expirado para salvar banner.");
      return;
    }

    shell.classList.add("is-uploading");

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const data = await saveBanner({
        bannerKey,
        target: targetSelect.value,
        imageDataUrl,
        token
      });

      setActiveSiteConfig({
        ...activeConfig,
        banners: data.banners || activeConfig.banners
      });
      applyBannerOverrides(document.body);
      showNotice("Banner atualizado.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Erro ao enviar banner.");
    } finally {
      shell.classList.remove("is-uploading");
      fileInput.value = "";
    }
  });
}

function bindTextEditing() {
  if (textEditorBound) {
    return;
  }

  textEditorBound = true;

  document.addEventListener("dblclick", async (event) => {
    if (!adminState.canEdit) {
      return;
    }

    const element = event.target instanceof Element ? event.target.closest("[data-text-key]") : null;

    if (!element || element.closest(".admin-panel, [data-no-global-edit='true']")) {
      return;
    }

    const key = element.dataset.textKey;
    const currentText = element.textContent.trim();
    const nextText = window.prompt("Novo texto global:", currentText);

    if (!key || nextText === null) {
      return;
    }

    const trimmedText = nextText.trim();

    if (!trimmedText || trimmedText === currentText) {
      return;
    }

    try {
      const data = await saveTextOverride({
        key,
        text: trimmedText,
        token: adminState.getToken()
      });

      setActiveSiteConfig({
        ...activeConfig,
        textOverrides: data.textOverrides || activeConfig.textOverrides
      });
      applyTextOverrides(document.body);
      adminState.onConfigChange?.(activeConfig);
      showNotice("Texto global atualizado.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Erro ao salvar texto.");
    }
  });
}

export function initContentAdmin({ user, getToken, config, onConfigChange } = {}) {
  setActiveSiteConfig(config || activeConfig);
  adminState = {
    canEdit: Boolean(user?.isAdmin),
    getToken: typeof getToken === "function" ? getToken : adminState.getToken,
    onConfigChange: onConfigChange || null
  };
  applyTextOverrides(document.body);
  applyBannerOverrides(document.body);
  bindBannerResize();

  document.querySelectorAll("[data-text-key]").forEach((element) => {
    element.classList.toggle("content-editable", adminState.canEdit);
    element.title = adminState.canEdit ? "Duplo clique para editar em toda a plataforma" : "";
  });

  if (!user?.isAdmin) {
    return;
  }

  document.querySelectorAll("img[data-banner-key]").forEach((image) => {
    createBannerAdminTools(image, getToken);
  });

  bindTextEditing();
}
