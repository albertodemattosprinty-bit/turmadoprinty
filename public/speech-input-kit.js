(() => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const managedSelector = 'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="date"]):not([type="datetime-local"]):not([type="month"]):not([type="time"]):not([type="week"]):not([type="password"]), textarea';
  const skipTypes = new Set(["number", "password", "email", "tel", "url"]);
  const stateByField = new WeakMap();
  const mobileOnly = window.matchMedia("(max-width: 900px)").matches;
  let activeSession = null;

  if (!mobileOnly) {
    return;
  }

  function injectStyles() {
    if (document.getElementById("speech-input-kit-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "speech-input-kit-styles";
    style.textContent = `
      .speech-kit-wrap {
        position: relative;
      }

      .speech-kit-field {
        padding-right: 46px !important;
      }

      .speech-kit-trigger {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        cursor: pointer;
        background: transparent;
        z-index: 5;
      }

      .speech-kit-trigger svg {
        width: 22px;
        height: 22px;
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  function createMicSvg(color) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="${color}" d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4m6-4a1 1 0 0 1 2 0 8 8 0 0 1-7 7.94V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.06A8 8 0 0 1 4 11a1 1 0 1 1 2 0 6 6 0 0 0 12 0"/></svg>`;
  }

  function createCloseSvg(color) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="${color}" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4l-4.9-4.9 4.9-4.9a1 1 0 0 0 0-1.4"/></svg>`;
  }

  function toTitleCase(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    if (/^[\d\s.,:/-]+$/.test(text)) {
      return text;
    }
    return text
      .toLocaleLowerCase("pt-BR")
      .replace(/\p{L}+/gu, (word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1));
  }

  function isSupportedField(field) {
    if (!field || field.dataset.speechKitReady === "1") {
      return false;
    }
    if (field.disabled || field.readOnly) {
      return false;
    }
    const type = String(field.type || "").toLowerCase();
    const autocomplete = String(field.autocomplete || "").toLowerCase();
    if (skipTypes.has(type) || field.dataset.speechKit === "off" || autocomplete.includes("password")) {
      return false;
    }
    return true;
  }

  function triggerInputEvents(field) {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setButtonVisual(field, mode) {
    const state = stateByField.get(field);
    if (!state?.button) {
      return;
    }
    if (mode === "listening") {
      state.button.innerHTML = createMicSvg("#c72127");
      return;
    }
    if (mode === "clear") {
      state.button.innerHTML = createCloseSvg("#d92626");
      return;
    }
    state.button.innerHTML = createMicSvg("#0b3da8");
  }

  function syncButtonByValue(field) {
    const hasText = String(field.value || "").trim().length > 0;
    setButtonVisual(field, hasText ? "clear" : "idle");
  }

  function stopActiveSession() {
    if (!activeSession) {
      return;
    }
    const { recognition, field } = activeSession;
    activeSession = null;
    try {
      recognition.stop();
    } catch (_error) {
      // noop
    }
    syncButtonByValue(field);
  }

  function startRecognition(field) {
    if (!Recognition) {
      window.alert("Reconhecimento de voz não disponível neste dispositivo.");
      return;
    }

    stopActiveSession();

    const baseText = String(field.value || "").trim();
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const part = String(result[0]?.transcript || "").trim();
        if (!part) {
          continue;
        }
        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${part}`.trim();
        } else {
          interim = `${interim} ${part}`.trim();
        }
      }

      const composed = [baseText, finalTranscript, interim].filter(Boolean).join(" ").trim();
      field.value = toTitleCase(composed);
      triggerInputEvents(field);
      setButtonVisual(field, "listening");
    };

    recognition.onerror = () => {
      stopActiveSession();
    };

    recognition.onend = () => {
      if (activeSession?.recognition === recognition) {
        activeSession = null;
      }
      syncButtonByValue(field);
    };

    activeSession = { recognition, field };
    setButtonVisual(field, "listening");
    recognition.start();
  }

  function handleTriggerClick(field) {
    if (activeSession?.field === field) {
      stopActiveSession();
      return;
    }

    const hasText = String(field.value || "").trim().length > 0;
    if (hasText) {
      field.value = "";
      triggerInputEvents(field);
      setButtonVisual(field, "idle");
      return;
    }

    startRecognition(field);
  }

  function installField(field) {
    if (!isSupportedField(field)) {
      return;
    }

    const parent = field.parentElement;
    if (!parent) {
      return;
    }

    parent.classList.add("speech-kit-wrap");
    field.classList.add("speech-kit-field");
    field.dataset.speechKitReady = "1";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "speech-kit-trigger";
    button.setAttribute("aria-label", "Usar microfone");
    button.innerHTML = createMicSvg("#0b3da8");
    button.addEventListener("click", () => handleTriggerClick(field));

    field.addEventListener("input", () => {
      if (activeSession?.field !== field) {
        syncButtonByValue(field);
      }
    });

    parent.appendChild(button);
    stateByField.set(field, { button });
    syncButtonByValue(field);
  }

  function scanAndInstall(root = document) {
    root.querySelectorAll(managedSelector).forEach((field) => installField(field));
  }

  function observeDom() {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          if (node.matches?.(managedSelector)) {
            installField(node);
          }
          scanAndInstall(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  injectStyles();
  scanAndInstall();
  observeDom();
})();
