export function initializeProject200TutorsUi(dependencies = {}) {
  const {
    apiRequest,
    openModal,
    closeModal,
    showFloatingNotice,
    getProfileName,
    onRequestProposal
  } = dependencies;

  const elements = {
    homeEntry: document.getElementById("marinHomeEntryButton"),
    homeName: document.getElementById("marinHomePersonaName"),
    personaList: document.getElementById("marinPersonaList"),
    personaModal: document.getElementById("marinPersonaModal"),
    chatModal: document.getElementById("marinChatModal"),
    chatName: document.getElementById("marinChatPersonaName"),
    chatType: document.getElementById("marinChatIdentityType"),
    chatPersonButton: document.getElementById("marinChatPersonaButton"),
    proposalButton: document.getElementById("marinChatProposalButton"),
    messages: document.getElementById("marinChatMessages"),
    status: document.getElementById("marinChatStatus"),
    form: document.getElementById("marinChatForm"),
    input: document.getElementById("marinChatInput"),
    send: document.getElementById("marinChatSendButton"),
    tutorModal: document.getElementById("marinTutorModal"),
    tutorClose: document.getElementById("marinTutorCloseButton"),
    tutorList: document.getElementById("marinTutorList"),
    tutorStatus: document.getElementById("marinTutorStatus"),
    proposalTypeModal: document.getElementById("marinTutorProposalTypeModal"),
    proposalTypeClose: document.getElementById("marinTutorProposalTypeClose"),
    proposalAction: document.getElementById("marinTutorProposalAction"),
    proposalMission: document.getElementById("marinTutorProposalMission")
  };

  const defaultPersonMarkup = elements.chatPersonButton?.innerHTML || "";
  const state = {
    human: false,
    tutors: [],
    friends: [],
    activeTutor: null,
    messages: [],
    sending: false,
    pollTimer: 0,
    renderingContacts: false
  };

  function currentProfile() {
    return String(typeof getProfileName === "function" ? getProfileName() : "Usuario").trim() || "Usuario";
  }

  function activeContactId() {
    return String(state.activeTutor?.contactUserId || state.activeTutor?.userId || "").trim();
  }

  function avatarUrl(entry) {
    return String(entry?.avatarDataUrl || entry?.svgIconUrl || "").trim();
  }

  function notify(message) {
    if (typeof showFloatingNotice === "function") {
      showFloatingNotice(message);
      return;
    }
    setStatus(message);
  }

  function setStatus(message = "") {
    if (!elements.status) return;
    elements.status.textContent = String(message || "");
    elements.status.classList.remove("is-thinking");
  }

  function createAvatar(entry, className) {
    const url = avatarUrl(entry);
    if (url) {
      const image = document.createElement("img");
      image.className = className;
      image.src = url;
      image.alt = "";
      return image;
    }
    const fallback = document.createElement("span");
    fallback.className = className;
    fallback.textContent = String(entry?.initials || entry?.name || "U").trim().slice(0, 2).toUpperCase();
    return fallback;
  }

  function updateHeader() {
    if (!state.human || !state.activeTutor) {
      if (elements.proposalButton) elements.proposalButton.hidden = true;
      if (elements.chatType) elements.chatType.textContent = "IA do iLife";
      if (elements.chatPersonButton) elements.chatPersonButton.innerHTML = defaultPersonMarkup;
      return;
    }
    const name = String(state.activeTutor.name || "Tutor");
    if (elements.chatName) elements.chatName.textContent = name;
    if (elements.chatType) elements.chatType.textContent = "Conversa humana";
    if (elements.homeName) elements.homeName.textContent = name;
    if (elements.proposalButton) elements.proposalButton.hidden = false;
    if (elements.chatPersonButton) {
      const url = avatarUrl(state.activeTutor);
      elements.chatPersonButton.innerHTML = "";
      if (url) {
        elements.chatPersonButton.appendChild(createAvatar(state.activeTutor, "marin-chat-contact-avatar"));
      } else {
        elements.chatPersonButton.appendChild(createAvatar(state.activeTutor, "marin-chat-contact-avatar"));
      }
      elements.chatPersonButton.setAttribute("aria-label", "Adicionar tutor");
    }
  }

  function proposalMeta(proposal) {
    if (proposal.type === "action") {
      const date = proposal.dateLabel || (proposal.startAt ? new Date(proposal.startAt).toLocaleDateString("pt-BR") : "");
      const time = proposal.timeLabel || (proposal.durationMinutes ? proposal.durationMinutes + " minutos" : "");
      return [date, time].filter(Boolean);
    }
    const amount = Math.max(1, Number(proposal.targetValue || 1));
    const seconds = Math.max(0, Number(proposal.unitDurationSeconds || (Number(proposal.unitDurationMinutes || 0) * 60)));
    const duration = seconds > 0
      ? (seconds < 60 ? seconds + " segundos por item" : Math.max(1, Math.round(seconds / 60)) + " minutos por item")
      : "";
    return [amount === 1 ? "1 item" : amount + " itens", duration].filter(Boolean);
  }

  function createProposalCard(message, proposal) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marin-proposal-card";
    button.classList.toggle("is-applied", Boolean(proposal._applied));
    button.classList.toggle("is-pending", Boolean(proposal._pending));
    const icon = document.createElement("img");
    icon.className = "marin-proposal-icon";
    icon.src = proposal.type === "mission" ? "/200/icons/target.svg" : "/200/icons/acts.svg";
    icon.alt = "";
    const copy = document.createElement("span");
    copy.className = "marin-proposal-copy";
    const title = document.createElement("strong");
    title.className = "marin-proposal-title";
    title.textContent = String(proposal.title || "");
    copy.appendChild(title);
    proposalMeta(proposal).forEach((line) => {
      const meta = document.createElement("span");
      meta.className = "marin-proposal-meta";
      meta.textContent = line;
      copy.appendChild(meta);
    });
    const canApply = proposal._canApply !== false;
    const marker = document.createElement("span");
    marker.className = "marin-proposal-state";
    marker.textContent = proposal._applied ? "OK" : (proposal._pending ? "..." : (canApply ? "+" : ">"));
    button.append(icon, copy, marker);
    if (!proposal._applied && !proposal._pending && canApply) {
      button.addEventListener("click", () => applyProposal(message, proposal, button));
    } else if (!canApply) {
      button.disabled = true;
      button.classList.add("is-sent");
    }
    return button;
  }

  function renderMessages({ preserveScroll = false } = {}) {
    if (!elements.messages || !state.human) return;
    const bottomDistance = elements.messages.scrollHeight - elements.messages.scrollTop - elements.messages.clientHeight;
    elements.messages.innerHTML = "";
    if (!state.messages.length) {
      const empty = document.createElement("p");
      empty.className = "marin-chat-empty";
      empty.textContent = "A conversa com " + String(state.activeTutor?.name || "seu tutor") + " comeca aqui.";
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
      if (Array.isArray(message.proposals) && message.proposals.length) {
        const list = document.createElement("div");
        list.className = "marin-proposal-list";
        list.classList.toggle("is-user", message.role === "user");
        message.proposals.forEach((proposal) => list.appendChild(createProposalCard(message, proposal)));
        elements.messages.appendChild(list);
      }
    });
    window.requestAnimationFrame(() => {
      if (preserveScroll && bottomDistance > 80) {
        elements.messages.scrollTop = Math.max(0, elements.messages.scrollHeight - elements.messages.clientHeight - bottomDistance);
      } else {
        elements.messages.scrollTop = elements.messages.scrollHeight;
      }
    });
  }

  async function loadDirectory() {
    const payload = await apiRequest("/api/200/tutors", { skipGlobalLoading: true });
    state.tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
    state.friends = Array.isArray(payload?.friends) ? payload.friends : [];
    if (state.activeTutor) {
      state.activeTutor = state.tutors.find((entry) => String(entry.contactUserId || "") === activeContactId()) || state.activeTutor;
    }
    renderTutorContacts();
  }

  function renderTutorContacts() {
    if (!elements.personaList || state.renderingContacts) return;
    state.renderingContacts = true;
    elements.personaList.querySelectorAll("[data-tutor-contact], .marin-persona-divider--tutors").forEach((node) => node.remove());
    if (state.tutors.length) {
      const divider = document.createElement("div");
      divider.className = "marin-persona-divider marin-persona-divider--tutors";
      divider.textContent = "Tutores e tutorados";
      elements.personaList.appendChild(divider);
      state.tutors.forEach((tutor) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "marin-persona-option is-human";
        button.dataset.tutorContact = String(tutor.contactUserId || tutor.userId || "");
        button.classList.toggle("is-selected", state.human && activeContactId() === button.dataset.tutorContact);
        const avatar = createAvatar(tutor, "marin-persona-avatar");
        const copy = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = String(tutor.name || "Tutor");
        const label = document.createElement("small");
        label.textContent = String(tutor.relationshipLabel || "Conversa humana");
        copy.append(name, label);
        const check = document.createElement("span");
        check.className = "marin-persona-check";
        check.textContent = "OK";
        button.append(avatar, copy, check);
        button.addEventListener("click", () => void selectTutor(tutor));
        elements.personaList.appendChild(button);
      });
    }
    state.renderingContacts = false;
  }

  function renderTutorPicker() {
    if (!elements.tutorList) return;
    elements.tutorList.innerHTML = "";
    if (!state.friends.length) {
      const empty = document.createElement("p");
      empty.className = "marin-tutor-empty";
      empty.textContent = "Voce ainda nao tem amigos com convite aceito.";
      elements.tutorList.appendChild(empty);
      return;
    }
    state.friends.forEach((friend) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "marin-tutor-option";
      button.disabled = Boolean(friend.isTutor);
      const avatar = createAvatar(friend, "marin-tutor-avatar");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = String(friend.name || "Amigo");
      const logline = document.createElement("small");
      logline.textContent = friend.isTutor ? "Tutor adicionado" : (friend.username ? "@" + friend.username : "Amizade aceita");
      copy.append(name, logline);
      const marker = document.createElement("span");
      marker.className = "marin-tutor-option-state";
      marker.textContent = friend.isTutor ? "OK" : "+";
      button.append(avatar, copy, marker);
      if (!friend.isTutor) button.addEventListener("click", () => void addTutor(friend));
      elements.tutorList.appendChild(button);
    });
  }

  async function openTutorPicker() {
    openModal("marinTutorModal");
    if (elements.tutorStatus) elements.tutorStatus.textContent = "Carregando amigos...";
    try {
      await loadDirectory();
      renderTutorPicker();
      if (elements.tutorStatus) elements.tutorStatus.textContent = "";
    } catch (error) {
      if (elements.tutorStatus) elements.tutorStatus.textContent = error instanceof Error ? error.message : "Nao foi possivel carregar.";
    }
  }

  async function addTutor(friend) {
    if (elements.tutorStatus) elements.tutorStatus.textContent = "Adicionando tutor...";
    try {
      const payload = await apiRequest("/api/200/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorUserId: friend.userId }),
        skipGlobalLoading: true
      });
      state.tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
      state.friends = Array.isArray(payload?.friends) ? payload.friends : [];
      renderTutorPicker();
      renderTutorContacts();
      const tutor = state.tutors.find((entry) => String(entry.contactUserId || "") === String(friend.userId || ""));
      if (tutor) await selectTutor(tutor);
    } catch (error) {
      if (elements.tutorStatus) elements.tutorStatus.textContent = error instanceof Error ? error.message : "Falha ao adicionar tutor.";
    }
  }

  async function refreshMessages({ silent = true } = {}) {
    const contactId = activeContactId();
    if (!state.human || !contactId) return;
    try {
      const payload = await apiRequest("/api/200/tutors/" + encodeURIComponent(contactId) + "/messages?limit=80", {
        skipGlobalLoading: true
      });
      state.messages = Array.isArray(payload?.messages) ? payload.messages : [];
      renderMessages({ preserveScroll: silent });
      if (!silent) setStatus("");
    } catch (error) {
      if (!silent) setStatus(error instanceof Error ? error.message : "Nao foi possivel abrir a conversa.");
    }
  }

  function stopPolling() {
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    state.pollTimer = 0;
  }

  function startPolling() {
    stopPolling();
    if (!state.human || !activeContactId()) return;
    state.pollTimer = window.setInterval(() => {
      if (state.human && elements.chatModal?.classList.contains("active")) {
        void refreshMessages({ silent: true });
      }
    }, 2500);
  }

  async function openHumanChat() {
    if (!state.human || !state.activeTutor) return;
    openModal("marinChatModal");
    updateHeader();
    renderMessages();
    await refreshMessages({ silent: false });
    startPolling();
    window.setTimeout(() => elements.input?.focus({ preventScroll: true }), 60);
  }

  async function selectTutor(tutor) {
    state.human = true;
    state.activeTutor = tutor;
    state.messages = [];
    closeModal(elements.personaModal);
    closeModal(elements.tutorModal);
    updateHeader();
    renderTutorContacts();
    await openHumanChat();
  }

  function leaveHumanMode() {
    if (!state.human) return;
    state.human = false;
    state.activeTutor = null;
    state.messages = [];
    stopPolling();
    updateHeader();
    renderTutorContacts();
  }

  async function sendMessage() {
    const content = String(elements.input?.value || "").trim();
    const contactId = activeContactId();
    if (!state.human || !content || !contactId || state.sending) return;
    const localId = "local-" + Date.now();
    state.messages.push({ id: localId, role: "user", content, proposals: [], source: "human" });
    elements.input.value = "";
    state.sending = true;
    if (elements.send) elements.send.disabled = true;
    renderMessages();
    setStatus("Enviando...");
    try {
      const payload = await apiRequest("/api/200/tutors/" + encodeURIComponent(contactId) + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        skipGlobalLoading: true
      });
      state.messages = state.messages.filter((message) => message.id !== localId);
      if (payload?.message) state.messages.push(payload.message);
      renderMessages();
      setStatus("");
    } catch (error) {
      state.messages = state.messages.filter((message) => message.id !== localId);
      renderMessages();
      setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar.");
    } finally {
      state.sending = false;
      if (elements.send) elements.send.disabled = false;
    }
  }

  async function sendHumanProposal(proposal) {
    const contactId = activeContactId();
    if (!state.human || !contactId) throw new Error("Escolha um tutor antes de criar o cartao.");
    const payload = await apiRequest("/api/200/tutors/" + encodeURIComponent(contactId) + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: proposal?.type === "mission" ? "Missao sugerida" : "Tarefa sugerida",
        proposal
      }),
      skipGlobalLoading: true
    });
    if (payload?.message) state.messages.push(payload.message);
    renderMessages();
    return payload?.message || null;
  }

  function applyProposal(message, proposal, button) {
    proposal._pending = true;
    button.classList.add("is-pending");
    const marker = button.querySelector(".marin-proposal-state");
    if (marker) marker.textContent = "...";
    void apiRequest(
      "/api/200/tutors/messages/" + encodeURIComponent(message.id)
        + "/proposals/" + encodeURIComponent(proposal.key) + "/apply",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: currentProfile() }),
        skipGlobalLoading: true
      }
    ).then((payload) => {
      if (payload?.processing && !payload?.alreadyApplied) {
        proposal._pending = true;
        button.classList.add("is-pending");
        if (marker) marker.textContent = "...";
        window.setTimeout(() => void refreshMessages({ silent: true }), 1800);
        return;
      }
      proposal._pending = false;
      proposal._applied = true;
      button.classList.remove("is-pending");
      button.classList.add("is-applied");
      if (marker) marker.textContent = "OK";
    }).catch((error) => {
      proposal._pending = false;
      button.classList.remove("is-pending");
      if (marker) marker.textContent = "+";
      notify(error instanceof Error ? error.message : "Nao foi possivel ativar.");
    });
  }

  function requestProposal(type) {
    closeModal(elements.proposalTypeModal);
    if (!state.human || !activeContactId()) return;
    if (typeof onRequestProposal === "function") onRequestProposal(type);
  }

  elements.chatPersonButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void openTutorPicker();
  }, true);
  elements.proposalButton?.addEventListener("click", () => openModal("marinTutorProposalTypeModal"));
  elements.tutorClose?.addEventListener("click", () => closeModal(elements.tutorModal));
  elements.proposalTypeClose?.addEventListener("click", () => closeModal(elements.proposalTypeModal));
  elements.proposalAction?.addEventListener("click", () => requestProposal("action"));
  elements.proposalMission?.addEventListener("click", () => requestProposal("mission"));

  elements.form?.addEventListener("submit", (event) => {
    if (!state.human) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void sendMessage();
  }, true);
  elements.input?.addEventListener("keydown", (event) => {
    if (!state.human || event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void sendMessage();
  }, true);
  let homePressStartedAt = 0;
  elements.homeEntry?.addEventListener("pointerdown", () => {
    if (state.human) homePressStartedAt = Date.now();
  }, true);
  elements.homeEntry?.addEventListener("pointerup", (event) => {
    if (!state.human) return;
    const elapsed = Date.now() - homePressStartedAt;
    if (elapsed >= 480) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openHumanChat();
  }, true);
  elements.homeEntry?.addEventListener("keydown", (event) => {
    if (!state.human || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openHumanChat();
  }, true);
  elements.personaList?.addEventListener("click", (event) => {
    if (event.target.closest("[data-tutor-contact]")) return;
    if (event.target.closest(".marin-persona-option")) leaveHumanMode();
  }, true);
  elements.chatModal?.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", stopPolling);
  });

  if (elements.personaList) {
    const observer = new MutationObserver(() => {
      if (!state.renderingContacts && !elements.personaList.querySelector("[data-tutor-contact]")) {
        window.queueMicrotask(renderTutorContacts);
      }
    });
    observer.observe(elements.personaList, { childList: true });
  }

  updateHeader();
  void loadDirectory().catch(() => {});

  return {
    openChat: openHumanChat,
    sendHumanProposal,
    isHumanActive: () => Boolean(state.human && activeContactId()),
    stop: stopPolling
  };
}
