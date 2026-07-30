(() => {
  const PAGE = "/200";
  const SCOPE = "global";
  const HOLD_MS = 3000;
  const TOKEN_KEY = "turma_do_printy_token";
  const TEXT_ATTR = "data-project200-front-text-key";
  const DEFAULT_ATTR = "data-project200-front-text-default";
  const KIND_ATTR = "data-project200-front-text-kind";
  const state = {
    isAdmin: false,
    overrides: new Map(),
    observer: null,
    holdTimer: 0,
    holdTarget: null,
    currentEdit: null
  };

  function safeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function token() {
    try { return safeText(window.localStorage.getItem(TOKEN_KEY)); } catch { return ""; }
  }

  function apiUrl(path) {
    const metaValue = document.querySelector('meta[name="tdp-api-base-url"]')?.getAttribute("content")?.trim();
    const base = metaValue || (typeof window.__TDP_API_BASE_URL__ === "string" ? window.__TDP_API_BASE_URL__ : "") || window.location.origin;
    return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : "/" + path);
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    const authToken = token();
    if (authToken) headers.Authorization = "Bearer " + authToken;
    return headers;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function elementSignature(element) {
    if (!(element instanceof Element)) return "text";
    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 5) {
      const id = safeText(current.id);
      const cls = safeText(current.className).split(" ").filter(Boolean).slice(0, 3).join(".");
      let index = 0;
      let sibling = current;
      while ((sibling = sibling.previousElementSibling)) index += sibling.tagName === current.tagName ? 1 : 0;
      parts.push(current.tagName.toLowerCase() + (id ? "#" + id : "") + (cls ? "." + cls : "") + ":" + index);
      current = current.parentElement;
    }
    return parts.reverse().join(">");
  }

  function buildKey(element, kind, defaultText) {
    const explicit = element?.getAttribute?.("data-front-text-key") || element?.getAttribute?.("data-project200-text-key");
    if (explicit) return "project200:" + explicit;
    return "project200:" + hashString([PAGE, SCOPE, kind, elementSignature(element), defaultText].join("|"));
  }

  function isBadText(text) {
    if (!text || text.length < 2 || text.length > 900) return true;
    if (/^[\d\s.,:%/+-]+$/.test(text)) return true;
    if (/^https?:\/\//i.test(text)) return true;
    return false;
  }

  function isExcludedElement(element) {
    if (!(element instanceof Element)) return true;
    if (element.closest("script,style,svg,canvas,audio,video,input,textarea,select,option,[contenteditable='true']")) return true;
    if (element.closest("[data-front-text-ignore],[data-user-content],[data-dynamic-text]")) return true;
    if (element.closest(".marin-chat-messages,.marin-message,.tutor-message,.action-card,.history-row,.finance-ledger,.running-task-title,.task-title,.mission-card,.life-capture-viewer-track,.life-capture-memory-list")) return true;
    if (element.closest("#marinChatMessages,#tutorUnreadAlert,#homeRunningTaskTitle,#actionsList,#historyList,#missionHistoryList,#financeLedgerList")) return true;
    return false;
  }

  function applyText(element, text) {
    const kind = element.getAttribute(KIND_ATTR) || "text";
    if (kind === "placeholder") element.setAttribute("placeholder", text);
    else if (kind === "aria-label") element.setAttribute("aria-label", text);
    else element.textContent = text;
  }

  function registerElement(element, kind, defaultText) {
    if (element?.hasAttribute?.(TEXT_ATTR)) {
      if (state.isAdmin) element.classList.add("project200-front-text-editable");
      const existingOverride = state.overrides.get(element.getAttribute(TEXT_ATTR));
      if (existingOverride) applyText(element, existingOverride);
      return;
    }
    const cleanDefault = safeText(defaultText);
    if (isBadText(cleanDefault) || isExcludedElement(element)) return;
    const key = buildKey(element, kind, cleanDefault);
    element.setAttribute(TEXT_ATTR, key);
    element.setAttribute(DEFAULT_ATTR, cleanDefault);
    element.setAttribute(KIND_ATTR, kind);
    if (state.isAdmin) element.classList.add("project200-front-text-editable");
    const override = state.overrides.get(key);
    if (override && override !== cleanDefault) applyText(element, override);
  }

  function scan(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || isExcludedElement(parent) || isBadText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (parent.children.length && safeText(parent.textContent) !== safeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => registerElement(node.parentElement, "text", node.nodeValue));
    root.querySelectorAll?.("[placeholder], [aria-label]").forEach((element) => {
      if (element.matches("input,textarea,select")) return;
      if (element.hasAttribute("placeholder")) registerElement(element, "placeholder", element.getAttribute("placeholder"));
      if (element.hasAttribute("aria-label")) registerElement(element, "aria-label", element.getAttribute("aria-label"));
    });
  }

  async function loadOverrides() {
    try {
      const response = await fetch(apiUrl("/api/200/front-texts?page=/200&scope=global"), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar textos.");
      (Array.isArray(payload?.texts) ? payload.texts : []).forEach((entry) => {
        if (entry?.key && entry?.currentText) state.overrides.set(String(entry.key), String(entry.currentText));
      });
    } catch {}
  }

  async function loadAdminState() {
    const authToken = token();
    if (!authToken) return;
    try {
      const response = await fetch(apiUrl("/api/auth/me?app=project200"), { headers: authHeaders(), cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      state.isAdmin = Boolean(response.ok && payload?.user?.isAdmin);
      document.documentElement.classList.toggle("project200-front-text-admin", state.isAdmin);
    } catch {
      state.isAdmin = false;
    }
  }

  function ensureModal() {
    let modal = document.getElementById("project200FrontTextEditor");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "project200FrontTextEditor";
    modal.className = "project200-front-text-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="project200-front-text-panel">',
      '<header><span>Texto global</span><button type="button" data-front-text-close aria-label="Fechar">×</button></header>',
      '<small id="project200FrontTextOriginal"></small>',
      '<textarea id="project200FrontTextInput" maxlength="4000"></textarea>',
      '<p id="project200FrontTextStatus"></p>',
      '<button type="button" id="project200FrontTextSave">Salvar global</button>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-front-text-close]")) closeModal();
    });
    modal.querySelector("#project200FrontTextSave")?.addEventListener("click", saveCurrentEdit);
    return modal;
  }

  function openModal(element) {
    if (!state.isAdmin || !(element instanceof Element)) return;
    const key = element.getAttribute(TEXT_ATTR);
    const defaultText = element.getAttribute(DEFAULT_ATTR) || safeText(element.textContent);
    if (!key || !defaultText) return;
    state.currentEdit = { element, key, defaultText, kind: element.getAttribute(KIND_ATTR) || "text" };
    const modal = ensureModal();
    const input = modal.querySelector("#project200FrontTextInput");
    const original = modal.querySelector("#project200FrontTextOriginal");
    const status = modal.querySelector("#project200FrontTextStatus");
    if (original) original.textContent = "Original: " + defaultText;
    if (input) input.value = state.overrides.get(key) || safeText(element.textContent || element.getAttribute("aria-label") || defaultText);
    if (status) status.textContent = "";
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => input?.focus(), 50);
  }

  function closeModal() {
    const modal = document.getElementById("project200FrontTextEditor");
    modal?.classList.remove("active");
    modal?.setAttribute("aria-hidden", "true");
    state.currentEdit = null;
  }

  async function saveCurrentEdit() {
    const edit = state.currentEdit;
    const modal = ensureModal();
    const input = modal.querySelector("#project200FrontTextInput");
    const status = modal.querySelector("#project200FrontTextStatus");
    const nextText = safeText(input?.value);
    if (!edit || !nextText) return;
    if (status) status.textContent = "Salvando...";
    try {
      const response = await fetch(apiUrl("/api/200/front-texts"), {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ key: edit.key, page: PAGE, scope: SCOPE, defaultText: edit.defaultText, currentText: nextText, selectorHint: elementSignature(edit.element) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar.");
      state.overrides.set(edit.key, nextText);
      document.querySelectorAll(`[${TEXT_ATTR}="${CSS.escape(edit.key)}"]`).forEach((element) => applyText(element, nextText));
      if (status) status.textContent = "Salvo para todos.";
      setTimeout(closeModal, 450);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Falha ao salvar.";
    }
  }

  function bindLongPress() {
    document.addEventListener("pointerdown", (event) => {
      if (!state.isAdmin) return;
      const target = event.target?.closest?.(`[${TEXT_ATTR}]`);
      if (!target || isExcludedElement(target)) return;
      state.holdTarget = target;
      window.clearTimeout(state.holdTimer);
      state.holdTimer = window.setTimeout(() => openModal(target), HOLD_MS);
    }, true);
    ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach((type) => {
      document.addEventListener(type, () => {
        window.clearTimeout(state.holdTimer);
        state.holdTarget = null;
      }, true);
    });
  }

  function injectStyle() {
    if (document.getElementById("project200FrontTextStyle")) return;
    const style = document.createElement("style");
    style.id = "project200FrontTextStyle";
    style.textContent = '.project200-front-text-admin .project200-front-text-editable{cursor:text}.project200-front-text-admin .project200-front-text-editable:active{outline:2px solid rgba(76,201,240,.42);outline-offset:3px}.project200-front-text-modal{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(4,12,24,.72);backdrop-filter:blur(10px)}.project200-front-text-modal.active{display:flex}.project200-front-text-panel{width:min(560px,100%);display:grid;gap:12px;padding:18px;border-radius:8px;background:#fff;color:#102033;box-shadow:0 24px 70px rgba(0,0,0,.35)}.project200-front-text-panel header{display:flex;align-items:center;justify-content:space-between;gap:12px}.project200-front-text-panel header span{font-weight:900}.project200-front-text-panel header button{width:38px;height:38px;border:0;border-radius:50%;background:#eef2f7;color:#102033;font-size:1.4rem}.project200-front-text-panel small{color:#667085;line-height:1.35}.project200-front-text-panel textarea{width:100%;min-height:150px;resize:vertical;border:1px solid #d0d5dd;border-radius:8px;padding:12px;font:inherit;color:#102033}.project200-front-text-panel p{min-height:20px;margin:0;color:#475467;font-size:.9rem}.project200-front-text-panel>button{min-height:48px;border:0;border-radius:8px;background:#1663ff;color:#fff;font-weight:900}';
    document.head.appendChild(style);
  }

  async function init() {
    injectStyle();
    await Promise.all([loadOverrides(), loadAdminState()]);
    scan(document.body);
    bindLongPress();
    state.observer = new MutationObserver((mutations) => {
      window.requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) scan(node);
          });
          if (mutation.type === "characterData") scan(mutation.target.parentElement);
        });
      });
    });
    state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else void init();
})();
