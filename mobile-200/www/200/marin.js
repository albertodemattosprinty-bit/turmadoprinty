import { isChatMediaMessage, renderChatMessageContent } from "./chat-links.js?v=0.83-chat-history-v1";

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
    send: document.getElementById("marinChatSendButton"),
    attach: document.getElementById("marinChatAttachButton"),
    fileInput: document.getElementById("marinChatFileInput")
  };

  const chatMessageBatchSize = 40;
  const chatMessageMaxLimit = 240;

  const state = {
    profile: "",
    personaKey: "marin",
    personaName: "Marin",
    personas: DEFAULT_PERSONAS.map((persona) => ({ ...persona })),
    generalPrompt: "",
    messages: [],
    messageLimit: chatMessageBatchSize,
    hasMoreMessages: false,
    loadingMoreMessages: false,
    isAdmin: false,
    loaded: false,
    loading: false,
    sending: false,
    promptKey: "",
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    recordingStartedAt: 0,
    attaching: false
  };

  function currentProfile() {
    return String(typeof getProfileName === "function" ? getProfileName() : "Usuario").trim() || "Usuario";
  }

  function isHumanChatMode() {
    return elements.chatModal?.dataset.chatMode === "human";
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

  const ASPECT_ICONS = Object.freeze({
    sono: "/200/aspect-icons/sono.svg",
    alimentacao: "/200/aspect-icons/alimentacao.svg",
    hidratacao: "/200/aspect-icons/hidratacao.svg",
    aprendizado: "/200/aspect-icons/aprendizado.svg",
    trabalho: "/200/aspect-icons/trabalho.svg",
    casa: "/200/aspect-icons/casa.svg",
    exercicios: "/200/aspect-icons/exercicios.svg",
    social: "/200/aspect-icons/social.svg",
    planejamento: "/200/aspect-icons/proposito.svg",
    higiene: "/200/aspect-icons/higiene.svg",
    lazer: "/200/aspect-icons/lazer.svg",
    aspecto: "/200/aspect-icons/familia.svg"
  });

  function proposalMeta(proposal) {
    if (proposal.type === "action") {
      const dateLine = proposal.dateLabel || (proposal.startAt ? new Date(proposal.startAt).toLocaleDateString("pt-BR") : "");
      const timeLine = proposal.timeLabel || (proposal.durationMinutes ? proposal.durationMinutes + " minutos" : "");
      return [dateLine, timeLine].filter(Boolean);
    }
    if (proposal.type === "mission" || proposal.type === "limit") {
      const amount = Number(proposal.targetValue || 1);
      const itemLabel = amount === 1 ? "1 item" : amount + " itens";
      if (proposal.type === "limit") {
        const units = { day: "dia", week: "semana", month: "mes", year: "ano" };
        const interval = Number(proposal.limitIntervalValue || 1);
        return [itemLabel + " a cada " + interval + " " + (units[proposal.limitIntervalUnit] || "dia")].filter(Boolean);
      }
      const durationLabel = Number(proposal.unitDurationMinutes || 0) > 0
        ? proposal.unitDurationMinutes + " minutos por item"
        : "";
      return [itemLabel, durationLabel].filter(Boolean);
    }
    if (proposal.type === "aspect") {
      const links = Array.isArray(proposal.missionGoalIds) ? proposal.missionGoalIds.length : 0;
      return [
        links ? links + (links === 1 ? " missao vinculada" : " missoes vinculadas") : "Acoes do aspecto",
        proposal.useManualTarget ? proposal.targetMinutes + " minutos de meta manual" : ""
      ].filter(Boolean);
    }
    const nature = proposal.financeKind === "INCOME" ? "Entrada" : "Saída";
    const money = typeof formatMoney === "function" ? formatMoney(Number(proposal.amountCents || 0)) : "";
    return [nature + (money ? " — " + money : ""), proposal.dateLabel || proposal.timeLabel || proposal.startsOn || ""].filter(Boolean);
  }

  function proposalIcon(proposal) {
    if (proposal.type === "action") return "/200/icons/acts.svg";
    if (proposal.type === "mission" || proposal.type === "limit") return "/200/icons/target.svg";
    if (proposal.type === "aspect" || proposal.type === "context") {
      return ASPECT_ICONS[proposal.aspectId] || "/200/icons/target.svg";
    }
    return "/200/icons/financas.svg";
  }

  function createDataLine(proposal) {
    const line = document.createElement("div");
    line.className = "marin-data-line";
    const icon = document.createElement("img");
    icon.className = "marin-data-line-icon";
    icon.src = proposalIcon(proposal);
    icon.alt = "";
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = proposal.title;
    const summary = document.createElement("span");
    summary.textContent = proposal.summary;
    copy.append(title, summary);
    line.append(icon, copy);
    return line;
  }

  function createProposalCard(message, proposal) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-proposal-card";
    button.classList.toggle("is-finance", proposal.type === "finance");
    button.classList.toggle("is-limit", proposal.type === "limit");
    button.classList.toggle("is-aspect", proposal.type === "aspect");
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

  function renderMessages({ stickToBottom = true } = {}) {
    if (!elements.messages) return;
    elements.messages.innerHTML = "";
    if (!state.messages.length) {
      const empty = document.createElement("p");
      empty.className = "marin-chat-empty";
      empty.textContent = "Eu sou " + state.personaName + ". Quero conhecer sua vida com calma e transformar seus minutos em um plano que faça sentido. Por onde você quer começar?";
      elements.messages.appendChild(empty);
      return;
    }

    if (state.hasMoreMessages) {
      const moreWrap = document.createElement("div");
      moreWrap.className = "marin-chat-more-wrap";
      const moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.className = "marin-chat-more-button";
      moreButton.disabled = Boolean(state.loadingMoreMessages);
      moreButton.textContent = state.loadingMoreMessages ? "Carregando..." : "Ver mais";
      moreButton.addEventListener("click", () => void loadMoreMessages());
      moreWrap.appendChild(moreButton);
      elements.messages.appendChild(moreWrap);
    }

    state.messages.forEach((message) => {
      const proposals = Array.isArray(message.proposals) ? message.proposals : [];
      if (message.role === "assistant") {
        proposals
          .filter((proposal) => proposal?.type === "context")
          .slice(0, 3)
          .forEach((proposal) => elements.messages.appendChild(createDataLine(proposal)));
      }
      const isSharedMedia = isChatMediaMessage(message.content);
      const bubble = document.createElement("article");
      bubble.className = (isSharedMedia ? "marin-message-shared " : "marin-message ") + (message.role === "user" ? "is-user" : "is-assistant");
      const copy = document.createElement("div");
      copy.className = isSharedMedia ? "marin-message-shared-content" : "marin-message-copy";
      renderChatMessageContent(copy, message.content, { role: message.role });
      bubble.appendChild(copy);
      elements.messages.appendChild(bubble);

      const actionable = proposals.filter((proposal) => proposal?.type !== "context").slice(0, 8);
      if (message.role === "assistant" && actionable.length) {
        const list = document.createElement("div");
        list.className = "marin-proposal-list";
        actionable.forEach((proposal) => list.appendChild(createProposalCard(message, proposal)));
        elements.messages.appendChild(list);
      }
    });
    if (stickToBottom) {
      window.requestAnimationFrame(() => {
        elements.messages.scrollTop = elements.messages.scrollHeight;
      });
    }
  }

  async function load({ silent = false, force = false, limit = state.messageLimit, preserveScroll = false } = {}) {
    const profile = currentProfile();
    if (state.loading) return;
    if (!force && state.loaded && state.profile === profile && Number(limit) <= state.messageLimit) {
      updateIdentity();
      return;
    }
    state.loading = true;
    if (!silent) setStatus("Abrindo sua conversa...", true);
    try {
      const scrollAnchor = preserveScroll && elements.messages ? elements.messages.scrollHeight - elements.messages.scrollTop : 0;
      const safeLimit = Math.max(chatMessageBatchSize, Math.min(chatMessageMaxLimit, Math.trunc(Number(limit) || chatMessageBatchSize)));
      const payload = await apiRequest("/api/200/marin/bootstrap?profile=" + encodeURIComponent(profile) + "&limit=" + encodeURIComponent(String(safeLimit)), {
        skipGlobalLoading: true
      });
      state.profile = String(payload?.profile || profile);
      state.personaKey = String(payload?.personaKey || "marin");
      state.personaName = String(payload?.personaName || "Marin");
      if (Array.isArray(payload?.personas) && payload.personas.length) {
        state.personas = payload.personas.map((persona) => {
          const fallback = DEFAULT_PERSONAS.find((item) => item.key === persona?.key) || {};
          return {
            ...fallback,
            ...persona,
            avatar: String(persona?.avatar || fallback.avatar || "")
          };
        });
      }
      state.generalPrompt = String(payload?.generalPrompt || "");
      state.isAdmin = Boolean(payload?.isAdmin);
      state.messages = Array.isArray(payload?.messages) ? payload.messages : [];
      state.messageLimit = safeLimit;
      state.hasMoreMessages = Boolean(payload?.hasMoreMessages) || (state.messages.length >= state.messageLimit && state.messageLimit < chatMessageMaxLimit);
      state.loaded = true;
      updateIdentity();
      renderPersonaList();
      renderMessages({ stickToBottom: !preserveScroll });
      if (preserveScroll && elements.messages) {
        window.requestAnimationFrame(() => {
          elements.messages.scrollTop = Math.max(0, elements.messages.scrollHeight - scrollAnchor);
        });
      }
      setStatus("");
    } catch (error) {
      if (!silent) setStatus(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
    } finally {
      state.loading = false;
    }
  }

  async function loadMoreMessages() {
    if (state.loadingMoreMessages || state.loading) return;
    state.loadingMoreMessages = true;
    renderMessages({ stickToBottom: false });
    try {
      await load({
        silent: true,
        force: true,
        limit: state.messageLimit + chatMessageBatchSize,
        preserveScroll: true
      });
    } finally {
      state.loadingMoreMessages = false;
      renderMessages({ stickToBottom: false });
    }
  }
  async function openChat() {
    openModal("marinChatModal");
    await load({ force: state.profile !== currentProfile(), limit: state.messageLimit });
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
      messages: state.messages,
      messageLimit: state.messageLimit,
      hasMoreMessages: state.hasMoreMessages
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

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler a midia."));
      reader.readAsDataURL(blob);
    });
  }

  function encodeUtf8Base64(text) {
    const bytes = new TextEncoder().encode(String(text || ""));
    let binary = "";
    bytes.forEach((value) => { binary += String.fromCharCode(value); });
    return window.btoa(binary);
  }

  function buildMediaShareMessage(asset, options = {}) {
    const kind = String(options.kind || asset?.kind || "").trim().toLowerCase();
    const mediaUrl = String(asset?.mediaUrl || asset?.remoteUrl || asset?.url || "");
    const payload = {
      kind,
      captureId: String(asset?.id || asset?.captureId || ""),
      title: String(options.title || asset?.title || (kind === "photo" ? "Imagem para a IA" : "Audio para a IA")),
      previewUrl: String(asset?.previewUrl || asset?.previewRemoteUrl || ""),
      mediaUrl,
      remoteUrl: mediaUrl,
      durationMs: Math.max(0, Number(options.durationMs || asset?.durationMs || 0)),
      sizeBytes: Math.max(0, Number(asset?.sizeBytes || options.sizeBytes || 0)),
      dateLabel: new Date().toLocaleDateString("pt-BR"),
      noteText: ""
    };
    return "[[ILIFE_MEDIA:" + encodeUtf8Base64(JSON.stringify(payload)) + "]]";
  }

  function aiAttachmentKind(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    if (type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|webm)$/i.test(name)) return "audio";
    if (type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(name)) return "photo";
    return "";
  }

  function aiAttachmentMimeType(file, kind) {
    const type = String(file?.type || "").split(";")[0].trim().toLowerCase();
    if (type && type !== "application/octet-stream") return type;
    const extension = String(file?.name || "").toLowerCase().split(".").pop();
    const byExtension = {
      mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", webm: "audio/webm",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif"
    };
    return byExtension[extension] || (kind === "audio" ? "audio/webm" : "");
  }

  async function uploadAiChatMedia({ blob, kind, mimeType, durationMs = 0, title }) {
    const fileBase64 = await blobToBase64(blob);
    const payload = await apiRequest("/api/200/life-captures/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title,
        noteText: "",
        createdAt: new Date().toISOString(),
        durationMs,
        metadata: { source: "project200-ai-chat", hiddenFromLibrary: true },
        mimeType,
        fileBase64,
        previewBase64: ""
      }),
      skipGlobalLoading: true
    });
    return { capture: payload?.capture || payload?.asset || null, fileBase64 };
  }

  async function sendMessage(options = {}) {
    const fromInput = !Object.prototype.hasOwnProperty.call(options, "content");
    const content = String(fromInput ? elements.input?.value : options.content || "").trim();
    if (!content || state.sending || isHumanChatMode()) return;
    const localId = "local-" + Date.now();
    state.messages.push({ id: localId, role: "user", content, proposals: [] });
    if (fromInput && elements.input) {
      elements.input.value = "";
      resizeInput();
    }
    state.sending = true;
    if (elements.send) elements.send.disabled = true;
    if (elements.mic) elements.mic.disabled = true;
    if (elements.attach) elements.attach.disabled = true;
    renderMessages();
    setStatus(state.personaName + " esta pensando", true);
    try {
      const payload = await apiRequest("/api/200/marin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: currentProfile(),
          personaKey: state.personaKey,
          content,
          inputType: options.inputType || "text",
          mediaBase64: options.mediaBase64 || "",
          mimeType: options.mimeType || "",
          fileName: options.fileName || "",
          caption: options.caption || ""
        }),
        skipGlobalLoading: true
      });
      state.messages = state.messages.filter((message) => message.id !== localId);
      if (payload?.userMessage) state.messages.push(payload.userMessage);
      else state.messages.push({ id: localId, role: "user", content, proposals: [] });
      if (payload?.message) state.messages.push(payload.message);
      renderMessages({ stickToBottom: !preserveScroll });
      if (preserveScroll && elements.messages) {
        window.requestAnimationFrame(() => {
          elements.messages.scrollTop = Math.max(0, elements.messages.scrollHeight - scrollAnchor);
        });
      }
      setStatus("");
    } catch (error) {
      state.messages = state.messages.filter((message) => message.id !== localId);
      renderMessages();
      setStatus(error instanceof Error ? error.message : "Nao foi possivel responder agora.");
    } finally {
      state.sending = false;
      if (elements.send) elements.send.disabled = false;
      if (elements.mic) elements.mic.disabled = false;
      if (elements.attach) elements.attach.disabled = false;
      window.setTimeout(() => elements.input?.focus({ preventScroll: true }), 40);
    }
  }

  async function sendAiAttachment(file) {
    if (!file || state.attaching || state.sending || isHumanChatMode()) return;
    const kind = aiAttachmentKind(file);
    if (!kind) {
      setStatus("Para a IA, envie uma imagem ou um audio.");
      return;
    }
    const maxBytes = kind === "photo" ? 12 * 1024 * 1024 : 20 * 1024 * 1024;
    if (Number(file.size || 0) > maxBytes) {
      setStatus(kind === "photo" ? "A imagem precisa ter ate 12 MB." : "O audio precisa ter ate 20 MB.");
      return;
    }
    const mimeType = aiAttachmentMimeType(file, kind);
    const caption = String(elements.input?.value || "").trim();
    state.attaching = true;
    if (elements.attach) elements.attach.disabled = true;
    setStatus(kind === "photo" ? "Enviando imagem para a IA..." : "Enviando audio para a IA...");
    try {
      const uploaded = await uploadAiChatMedia({
        blob: file,
        kind,
        mimeType,
        title: kind === "photo" ? "Imagem para a IA" : "Audio para a IA"
      });
      if (!uploaded.capture) throw new Error("A midia foi enviada sem referencia privada.");
      if (elements.input) {
        elements.input.value = "";
        resizeInput();
      }
      state.attaching = false;
      await sendMessage({
        content: buildMediaShareMessage(uploaded.capture, { kind, title: kind === "photo" ? "Imagem para a IA" : "Audio para a IA", sizeBytes: file.size }),
        inputType: kind === "photo" ? "image" : "audio",
        mediaBase64: uploaded.fileBase64,
        mimeType,
        fileName: String(file.name || (kind === "photo" ? "image.jpg" : "audio.webm")),
        caption
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar a midia.");
    } finally {
      state.attaching = false;
      if (elements.attach) elements.attach.disabled = false;
      if (elements.fileInput) elements.fileInput.value = "";
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

  function stopVoiceCapture({ send = false } = {}) {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder._sendOnStop = Boolean(send);
      state.mediaRecorder.stop();
      return;
    }
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop());
      state.mediaStream = null;
    }
    elements.send?.classList.remove("is-recording");
  }

  async function toggleVoiceCapture() {
    if (isHumanChatMode() || state.sending || state.attaching) return;
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      stopVoiceCapture({ send: true });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaStream = stream;
      state.audioChunks = [];
      const supportedTypes = ["audio/ogg;codecs=opus", "audio/ogg", "audio/webm;codecs=opus", "audio/webm"];
      const mimeType = typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
        ? supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ""
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      state.mediaRecorder = recorder;
      state.recordingStartedAt = Date.now();
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) state.audioChunks.push(event.data);
      });
      recorder.addEventListener("stop", async () => {
        const shouldSend = recorder._sendOnStop !== false;
        const durationMs = Math.max(0, Date.now() - state.recordingStartedAt);
        const chunks = state.audioChunks.slice();
        state.audioChunks = [];
        state.mediaRecorder = null;
        state.recordingStartedAt = 0;
        if (state.mediaStream) state.mediaStream.getTracks().forEach((track) => track.stop());
        state.mediaStream = null;
        elements.send?.classList.remove("is-recording");
        if (!shouldSend) {
          setStatus("");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (!blob.size) {
          setStatus("Nao ouvi nada. Tente novamente.");
          return;
        }
        state.attaching = true;
        setStatus("Enviando sua voz para " + state.personaName + "...", true);
        try {
          const normalizedMimeType = String(blob.type || "audio/webm").split(";")[0] || "audio/webm";
          const uploaded = await uploadAiChatMedia({
            blob,
            kind: "audio",
            mimeType: normalizedMimeType,
            durationMs,
            title: "Audio para a IA"
          });
          if (!uploaded.capture) throw new Error("O audio foi enviado sem referencia privada.");
          state.attaching = false;
          await sendMessage({
            content: buildMediaShareMessage(uploaded.capture, { kind: "audio", title: "Audio para a IA", durationMs, sizeBytes: blob.size }),
            inputType: "audio",
            mediaBase64: uploaded.fileBase64,
            mimeType: normalizedMimeType,
            fileName: "marin-voice." + (normalizedMimeType.includes("ogg") ? "ogg" : "webm")
          });
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar o audio.");
        } finally {
          state.attaching = false;
        }
      });
      recorder.start();
      elements.send?.classList.add("is-recording");
      setStatus("Ouvindo... toque novamente para enviar.");
    } catch (error) {
      stopVoiceCapture({ send: false });
      setStatus(error instanceof Error ? error.message : "Nao foi possivel abrir o microfone.");
    }
  }

  function openAiAttachmentPicker() {
    if (isHumanChatMode() || state.attaching || state.sending) return;
    if (typeof elements.fileInput?.showPicker === "function") {
      try {
        elements.fileInput.showPicker();
        return;
      } catch {}
    }
    try { elements.fileInput?.click(); } catch { setStatus("Nao foi possivel abrir os arquivos."); }
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
    if (isHumanChatMode()) return;
    event.preventDefault();
    void sendMessage();
  });
  elements.input?.addEventListener("input", resizeInput);
  elements.input?.addEventListener("keydown", (event) => {
    if (isHumanChatMode()) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  });
  elements.mic?.addEventListener("click", () => void toggleVoiceCapture());
  elements.send?.addEventListener("click", (event) => {
    if (isHumanChatMode() || String(elements.input?.value || "").trim()) return;
    event.preventDefault();
    void toggleVoiceCapture();
  });
  elements.attach?.addEventListener("click", (event) => {
    if (isHumanChatMode()) return;
    event.preventDefault();
    openAiAttachmentPicker();
  });
  elements.fileInput?.addEventListener("change", () => {
    if (isHumanChatMode()) return;
    const file = [...(elements.fileInput?.files || [])].find((entry) => aiAttachmentKind(entry));
    if (file) void sendAiAttachment(file);
  });
  elements.chatModal?.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => stopVoiceCapture({ send: false }));
  });

  return {
    load,
    openChat,
    openPersonaPicker,
    stopVoiceCapture
  };
}

