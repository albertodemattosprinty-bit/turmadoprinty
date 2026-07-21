const DEFAULT_PERSONAS = [
  { key: "marin", name: "Marin", avatar: "/200/agents/marin.svg" },
  { key: "peter", name: "Peter", avatar: "/200/agents/peter.svg" },
  { key: "lena", name: "Lena", avatar: "/200/agents/lena.svg" },
  { key: "gaia", name: "Gaia", avatar: "/200/agents/gaia.svg" },
  { key: "sami", name: "Sami", avatar: "/200/agents/sami.svg" },
  { key: "zach", name: "Zach", avatar: "/200/agents/zach.svg" }
];

const PERSONA_DESCRIPTIONS = {
  marin: "Humano, perspicaz e firme",
  peter: "Prático e estratégico",
  lena: "Acolhedora e encorajadora",
  gaia: "Equilibrada e reflexiva",
  sami: "Curioso, leve e próximo",
  zach: "Direto e energético"
};

export function initializeProject200MarinUi(dependencies = {}) {
  const {
    apiRequest,
    openModal,
    closeModal,
    showFloatingNotice,
    formatMoney,
    getProfileName,
    arrayBufferToBase64
  } = dependencies;

  const elements = {
    homeEntry: document.getElementById("marinHomeEntryButton"),
    homeName: document.getElementById("marinHomePersonaName"),
    personaModal: document.getElementById("marinPersonaModal"),
    personaList: document.getElementById("marinPersonaList"),
    personaHelp: document.getElementById("marinPersonaHelp"),
    generalPrompt: document.getElementById("marinGeneralPromptButton"),
    promptModal: document.getElementById("marinPromptModal"),
    promptBack: document.getElementById("marinPromptBackButton"),
    promptTitle: document.getElementById("marinPromptTitle"),
    promptTextarea: document.getElementById("marinPromptTextarea"),
    promptStatus: document.getElementById("marinPromptStatus"),
    promptSave: document.getElementById("marinPromptSaveButton"),
    chatModal: document.getElementById("marinChatModal"),
    chatName: document.getElementById("marinChatPersonaName"),
    chatPersona: document.getElementById("marinChatPersonaButton"),
    messages: document.getElementById("marinChatMessages"),
    status: document.getElementById("marinChatStatus"),
    form: document.getElementById("marinChatForm"),
    input: document.getElementById("marinChatInput"),
    mic: document.getElementById("marinChatMicButton"),
    send: document.getElementById("marinChatSendButton")
  };

  const state = {
    profile: "",
    personaKey: "marin",
    personaName: "Marin",
    personas: DEFAULT_PERSONAS.map((persona) => ({ ...persona })),
    generalPrompt: "",
    messages: [],
    isAdmin: false,
    loaded: false,
    loading: false,
    sending: false,
    promptKey: "",
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: []
  };

  function currentProfile() {
    return String(typeof getProfileName === "function" ? getProfileName() : "Usuario").trim() || "Usuario";
  }

  function updateIdentity() {
    const name = String(state.personaName || "Marin").trim() || "Marin";
    if (elements.homeName) elements.homeName.textContent = name;
    if (elements.chatName) elements.chatName.textContent = name;
    if (elements.homeEntry) elements.homeEntry.setAttribute("aria-label", "Conversar com " + name);
  }

  function setStatus(message = "", thinking = false) {
    if (!elements.status) return;
    elements.status.textContent = String(message || "");
    elements.status.classList.toggle("is-thinking", Boolean(thinking));
  }

  function notify(message) {
    if (typeof showFloatingNotice === "function") {
      showFloatingNotice(message);
      return;
    }
    setStatus(message);
  }

  function bindPressGesture(element, { tap, hold } = {}) {
    if (!element) return;
    let timer = null;
    let held = false;
    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };
    element.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      held = false;
      clear();
      if (typeof hold === "function") {
        timer = window.setTimeout(() => {
          timer = null;
          held = true;
          hold();
        }, 500);
      }
    });
    element.addEventListener("pointerup", () => {
      clear();
      if (!held && typeof tap === "function") tap();
      held = false;
    });
    element.addEventListener("pointercancel", clear);
    element.addEventListener("pointerleave", clear);
    element.addEventListener("contextmenu", (event) => {
      if (typeof hold !== "function") return;
      event.preventDefault();
      clear();
      held = true;
      hold();
    });
    element.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && typeof tap === "function") {
        event.preventDefault();
        tap();
      }
    });
  }

  function renderPersonaList() {
    if (!elements.personaList) return;
    elements.personaList.innerHTML = "";
    state.personas.forEach((persona) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "marin-persona-option";
      button.classList.toggle("is-selected", persona.key === state.personaKey);

      const avatar = document.createElement("img");
      avatar.className = "marin-persona-avatar";
      avatar.src = persona.avatar;
      avatar.alt = "";

      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = persona.name;
      const description = document.createElement("small");
      description.textContent = PERSONA_DESCRIPTIONS[persona.key] || "Personalidade iLife";
      copy.append(name, description);

      const check = document.createElement("span");
      check.className = "marin-persona-check";
      check.textContent = "✓";
      button.append(avatar, copy, check);

      bindPressGesture(button, {
        tap: () => void selectPersona(persona.key),
        hold: state.isAdmin ? () => openPromptEditor(persona.key) : null
      });
      elements.personaList.appendChild(button);
    });
    if (elements.generalPrompt) elements.generalPrompt.hidden = !state.isAdmin;
    if (elements.personaHelp) {
      elements.personaHelp.textContent = state.isAdmin
        ? "Toque para escolher. Segure por 500 ms ou use o botão direito para editar o prompt."
        : "Toque em um nome para escolher com quem conversar.";
    }
  }

  function proposalMeta(proposal) {
    if (proposal.type === "action") {
      const dateLine = proposal.dateLabel || (proposal.startAt ? new Date(proposal.startAt).toLocaleDateString("pt-BR") : "");
      const timeLine = proposal.timeLabel || (proposal.durationMinutes ? proposal.durationMinutes + " minutos" : "");
      return [dateLine, timeLine].filter(Boolean);
    }
    if (proposal.type === "mission") {
      const amount = Number(proposal.targetValue || 1);
      const itemLabel = amount === 1 ? "1 item" : amount + " itens";
      const durationLabel = Number(proposal.unitDurationMinutes || 0) > 0
        ? proposal.unitDurationMinutes + " minutos por item"
        : "";
      return [itemLabel, durationLabel].filter(Boolean);
    }
    const nature = proposal.financeKind === "INCOME" ? "Entrada" : "Saída";
    const money = typeof formatMoney === "function" ? formatMoney(Number(proposal.amountCents || 0)) : "";
    return [nature + (money ? " — " + money : ""), proposal.dateLabel || proposal.timeLabel || proposal.startsOn || ""].filter(Boolean);
  }

  function proposalIcon(proposal) {
    if (proposal.type === "action") return "/200/icons/acts.svg";
    if (proposal.type === "mission") return "/200/icons/target.svg";
    return "/200/icons/financas.svg";
  }

  function createProposalCard(message, proposal) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-proposal-card";
    button.classList.toggle("is-finance", proposal.type === "finance");
    button.classList.toggle("is-finance-income", proposal.type === "finance" && proposal.financeKind === "INCOME");
    button.classList.toggle("is-finance-expense", proposal.type === "finance" && proposal.financeKind !== "INCOME");
    button.classList.toggle("is-applied", Boolean(proposal._applied));

    const icon = document.createElement("img");
    icon.className = "marin-proposal-icon";
    icon.src = proposalIcon(proposal);
    icon.alt = "";

    const copy = document.createElement("span");
    copy.className = "marin-proposal-copy";
    const title = document.createElement("strong");
    title.className = "marin-proposal-title";
    title.textContent = proposal.title;
    copy.appendChild(title);
    proposalMeta(proposal).forEach((line) => {
      const meta = document.createElement("span");
      meta.className = "marin-proposal-meta";
      meta.textContent = line;
      copy.appendChild(meta);
    });

    const stateIcon = document.createElement("span");
    stateIcon.className = "marin-proposal-state";
    stateIcon.textContent = proposal._applied ? "✓" : "+";
    button.append(icon, copy, stateIcon);
    if (!proposal._applied) {
      button.addEventListener("click", () => applyProposal(message, proposal, button));
    }
    return button;
  }

  function renderMessages() {
    if (!elements.messages) return;
    elements.messages.innerHTML = "";
    if (!state.messages.length) {
      const empty = document.createElement("p");
      empty.className = "marin-chat-empty";
      empty.textContent = "Eu sou " + state.personaName + ". Quero conhecer sua vida com calma e transformar seus minutos em um plano que faça sentido. Por onde você quer começar?";
      elements.messages.appendChild(empty);
      return;
    }

    state.messages.forEach((message) => {
      const bubble = document.createElement("article");
      bubble.className = "marin-message " + (message.role === "user" ? "is-user" : "is-assistant");
      const copy = document.createElement("div");
      copy.className = "marin-message-copy";
      copy.textContent = String(message.content || "");
      bubble.appendChild(copy);
      elements.messages.appendChild(bubble);

      if (message.role === "assistant" && Array.isArray(message.proposals) && message.proposals.length) {
        const list = document.createElement("div");
        list.className = "marin-proposal-list";
        message.proposals.slice(0, 8).forEach((proposal) => list.appendChild(createProposalCard(message, proposal)));
        elements.messages.appendChild(list);
      }
    });
    window.requestAnimationFrame(() => {
      elements.messages.scrollTop = elements.messages.scrollHeight;
    });
  }

  async function load({ silent = false, force = false } = {}) {
    const profile = currentProfile();
    if (state.loading) return;
    if (!force && state.loaded && state.profile === profile) {
      updateIdentity();
      return;
    }
    state.loading = true;
    if (!silent) setStatus("Abrindo sua conversa...", true);
    try {
      const payload = await apiRequest("/api/200/marin/bootstrap?profile=" + encodeURIComponent(profile), {
        skipGlobalLoading: true
      });
      state.profile = String(payload?.profile || profile);
      state.personaKey = String(payload?.personaKey || "marin");
      state.personaName = String(payload?.personaName || "Marin");
      state.personas = Array.isArray(payload?.personas) && payload.personas.length ? payload.personas : state.personas;
      state.generalPrompt = String(payload?.generalPrompt || "");
      state.isAdmin = Boolean(payload?.isAdmin);
      state.messages = Array.isArray(payload?.messages) ? payload.messages : [];
      state.loaded = true;
      updateIdentity();
      renderPersonaList();
      renderMessages();
      setStatus("");
    } catch (error) {
      if (!silent) setStatus(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
    } finally {
      state.loading = false;
    }
  }

  async function openChat() {
    openModal("marinChatModal");
    await load({ force: state.profile !== currentProfile() });
    renderMessages();
    window.setTimeout(() => elements.input?.focus({ preventScroll: true }), 80);
  }

  async function openPersonaPicker() {
    await load({ silent: true, force: state.profile !== currentProfile() });
    renderPersonaList();
    openModal("marinPersonaModal");
  }

  async function selectPersona(personaKey) {
    const key = String(personaKey || "").trim().toLowerCase();
    const persona = state.personas.find((entry) => entry.key === key);
    if (!persona || key === state.personaKey) {
      closeModal(elements.personaModal);
      return;
    }
    const previous = {
      key: state.personaKey,
      name: state.personaName,
      messages: state.messages
    };
    state.personaKey = key;
    state.personaName = persona.name;
    state.messages = [];
    updateIdentity();
    renderPersonaList();
    renderMessages();
    closeModal(elements.personaModal);
    try {
      const payload = await apiRequest("/api/200/marin/persona", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: currentProfile(), personaKey: key }),
        skipGlobalLoading: true
      });
      state.personaKey = String(payload?.personaKey || key);
      state.personaName = String(payload?.personaName || persona.name);
      state.messages = Array.isArray(payload?.messages) ? payload.messages : [];
      updateIdentity();
      renderMessages();
    } catch (error) {
      state.personaKey = previous.key;
      state.personaName = previous.name;
      state.messages = previous.messages;
      updateIdentity();
      renderMessages();
      notify(error instanceof Error ? error.message : "Não foi possível trocar.");
    }
  }

  function openPromptEditor(key) {
    if (!state.isAdmin) return;
    const normalized = String(key || "").trim().toLowerCase();
    const isGeneral = normalized === "general";
    const persona = state.personas.find((entry) => entry.key === normalized);
    state.promptKey = isGeneral ? "general" : normalized;
    if (elements.promptTitle) elements.promptTitle.textContent = isGeneral ? "Prompt geral" : (persona?.name || "Personalidade");
    if (elements.promptTextarea) elements.promptTextarea.value = isGeneral ? state.generalPrompt : String(persona?.prompt || "");
    if (elements.promptStatus) elements.promptStatus.textContent = "";
    openModal("marinPromptModal");
    window.setTimeout(() => elements.promptTextarea?.focus({ preventScroll: true }), 80);
  }

  async function savePrompt() {
    const prompt = String(elements.promptTextarea?.value || "").trim();
    if (!state.isAdmin || !state.promptKey) return;
    if (elements.promptStatus) elements.promptStatus.textContent = "Salvando...";
    if (elements.promptSave) elements.promptSave.disabled = true;
    try {
      const payload = await apiRequest("/api/200/marin/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: state.promptKey, prompt }),
        skipGlobalLoading: true
      });
      if (state.promptKey === "general") {
        state.generalPrompt = String(payload?.prompt?.prompt || prompt);
      } else {
        const persona = state.personas.find((entry) => entry.key === state.promptKey);
        if (persona) persona.prompt = String(payload?.prompt?.prompt || prompt);
      }
      if (elements.promptStatus) elements.promptStatus.textContent = "Prompt salvo no PostgreSQL.";
    } catch (error) {
      if (elements.promptStatus) elements.promptStatus.textContent = error instanceof Error ? error.message : "Falha ao salvar.";
    } finally {
      if (elements.promptSave) elements.promptSave.disabled = false;
    }
  }

  function resizeInput() {
    if (!elements.input) return;
    elements.input.style.height = "auto";
    elements.input.style.height = Math.min(132, Math.max(44, elements.input.scrollHeight)) + "px";
  }

  async function sendMessage() {
    const content = String(elements.input?.value || "").trim();
    if (!content || state.sending) return;
    state.messages.push({
      id: "local-" + Date.now(),
      role: "user",
      content,
      proposals: []
    });
    if (elements.input) {
      elements.input.value = "";
      resizeInput();
    }
    state.sending = true;
    if (elements.send) elements.send.disabled = true;
    if (elements.mic) elements.mic.disabled = true;
    renderMessages();
    setStatus(state.personaName + " está pensando", true);
    try {
      const payload = await apiRequest("/api/200/marin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: currentProfile(),
          personaKey: state.personaKey,
          content
        }),
        skipGlobalLoading: true
      });
      if (payload?.message) state.messages.push(payload.message);
      renderMessages();
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível responder agora.");
    } finally {
      state.sending = false;
      if (elements.send) elements.send.disabled = false;
      if (elements.mic) elements.mic.disabled = false;
      window.setTimeout(() => elements.input?.focus({ preventScroll: true }), 40);
    }
  }

  function applyProposal(message, proposal, button) {
    if (!message?.id || !proposal?.key || proposal._applied) return;
    proposal._applied = true;
    button.classList.add("is-applied", "is-pending");
    const stateIcon = button.querySelector(".marin-proposal-state");
    if (stateIcon) stateIcon.textContent = "✓";
    void apiRequest(
      "/api/200/marin/messages/" + encodeURIComponent(message.id)
        + "/proposals/" + encodeURIComponent(proposal.key) + "/apply",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: currentProfile() }),
        skipGlobalLoading: true
      }
    ).then(() => {
      button.classList.remove("is-pending");
    }).catch((error) => {
      proposal._applied = false;
      button.classList.remove("is-applied", "is-pending");
      if (stateIcon) stateIcon.textContent = "+";
      notify(error instanceof Error ? error.message : "Não foi possível ativar.");
    });
  }

  function stopVoiceCapture() {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") state.mediaRecorder.stop();
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop());
      state.mediaStream = null;
    }
    elements.mic?.classList.remove("is-recording");
  }

  async function toggleVoiceCapture() {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      stopVoiceCapture();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaStream = stream;
      state.audioChunks = [];
      const options = typeof MediaRecorder !== "undefined"
        && typeof MediaRecorder.isTypeSupported === "function"
        && MediaRecorder.isTypeSupported("audio/webm")
        ? { mimeType: "audio/webm" }
        : undefined;
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      state.mediaRecorder = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) state.audioChunks.push(event.data);
      });
      recorder.addEventListener("stop", async () => {
        elements.mic?.classList.remove("is-recording");
        const chunks = state.audioChunks.slice();
        state.audioChunks = [];
        state.mediaRecorder = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          setStatus("Não ouvi nada. Tente novamente.");
          return;
        }
        setStatus("Transformando sua voz em texto...", true);
        try {
          const buffer = await blob.arrayBuffer();
          const payload = await apiRequest("/api/audio/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: arrayBufferToBase64(buffer),
              mimeType: blob.type || "audio/webm",
              fileName: "marin-voice.webm"
            }),
            skipGlobalLoading: true
          });
          if (elements.input) {
            elements.input.value = String(payload?.text || "").trim();
            resizeInput();
            elements.input.focus({ preventScroll: true });
          }
          setStatus("");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Falha ao transcrever.");
        }
      });
      recorder.start();
      elements.mic?.classList.add("is-recording");
      setStatus("Ouvindo... toque novamente para parar.");
    } catch (error) {
      stopVoiceCapture();
      setStatus(error instanceof Error ? error.message : "Não foi possível abrir o microfone.");
    }
  }

  updateIdentity();
  bindPressGesture(elements.homeEntry, {
    tap: () => void openChat(),
    hold: () => void openPersonaPicker()
  });
  elements.chatPersona?.addEventListener("click", () => void openPersonaPicker());
  elements.generalPrompt?.addEventListener("click", () => openPromptEditor("general"));
  elements.promptBack?.addEventListener("click", () => closeModal(elements.promptModal));
  elements.promptSave?.addEventListener("click", () => void savePrompt());
  elements.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendMessage();
  });
  elements.input?.addEventListener("input", resizeInput);
  elements.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  });
  elements.mic?.addEventListener("click", () => void toggleVoiceCapture());
  elements.chatModal?.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", stopVoiceCapture);
  });

  return {
    load,
    openChat,
    openPersonaPicker,
    stopVoiceCapture
  };
}

