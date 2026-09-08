(() => {
  const PAGE = "/200";
  const SCOPE = "global";
  const TEXT_ATTR = "data-project200-front-text-key";
  const DEFAULT_ATTR = "data-project200-front-text-default";
  const KIND_ATTR = "data-project200-front-text-kind";
  const state = {
    overrides: new Map(),
    observer: null
  };

  function safeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function apiUrl(path) {
    const metaValue = document.querySelector('meta[name="tdp-api-base-url"]')?.getAttribute("content")?.trim();
    const base = metaValue || (typeof window.__TDP_API_BASE_URL__ === "string" ? window.__TDP_API_BASE_URL__ : "") || window.location.origin;
    return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : "/" + path);
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
    element?.classList?.remove("project200-front-text-editable");
    if (element?.hasAttribute?.(TEXT_ATTR)) {
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

  async function init() {
    document.documentElement.classList.remove("project200-front-text-admin");
    document.getElementById("project200FrontTextEditor")?.remove();
    document.getElementById("project200FrontTextStyle")?.remove();
    await loadOverrides();
    scan(document.body);
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
