import { isChatMediaMessage, renderChatMessageContent } from "./chat-links.js?v=0.7.0";

export function initializeProject200TutorsUi(dependencies = {}) {
  const {
    apiRequest,
    openModal,
    closeModal,
    showFloatingNotice,
    getProfileName,
    getCurrentProfileAvatar,
    onRequestProposal,
    getNotificationPreferences
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
    proposalMission: document.getElementById("marinTutorProposalMission"),
    unreadAlert: document.getElementById("tutorUnreadAlert"),
    unreadAvatar: document.getElementById("tutorUnreadAvatar"),
    unreadAvatarFallback: document.getElementById("tutorUnreadAvatarFallback"),
    unreadCount: document.getElementById("tutorUnreadCount"),
    notificationAudio: document.getElementById("tutorNotificationAudio"),
    composer: document.getElementById("marinChatForm")
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
    syncCursor: "",
    syncing: false,
    syncToken: 0,
    syncContactId: "",
    renderingContacts: false,
    inboxTimer: 0,
    inboxSyncing: false,
    inboxHydrated: false,
    inboxNotifications: [],
    inboxUnreadCount: 0,
    notifiedMessageIds: new Set(),
    recording: false,
    recordingStartedAt: 0,
    recordingPointerDownAt: 0,
    recordingWasActiveOnPress: false,
    recordingAutoStopOnRelease: false,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: []
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

  function findTutorByContactId(contactId) {
    const normalizedContactId = String(contactId || "").trim();
    if (!normalizedContactId) return null;
    return state.tutors.find((entry) => String(entry.contactUserId || entry.userId || "") === normalizedContactId) || null;
  }

  const SEND_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 20 18-8L3 4v6l12 2-12 2z"/></svg>';
  const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.6 3.6 0 0 0 3.6-3.6V6.6a3.6 3.6 0 1 0-7.2 0v5a3.6 3.6 0 0 0 3.6 3.6Zm-5.4-3.8a5.4 5.4 0 0 0 10.8 0M12 18.4V22m-3 0h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function hasTypedMessage() {
    return Boolean(String(elements.input?.value || "").trim());
  }

  function syncComposerMode() {
    const hasText = hasTypedMessage();
    elements.composer?.classList.toggle("is-recording", state.recording);
    elements.composer?.classList.toggle("has-text", hasText);
    if (!elements.send) return;
    elements.send.classList.toggle("is-mic", !hasText);
    elements.send.classList.toggle("is-recording", state.recording);
    elements.send.type = hasText ? "submit" : "button";
    elements.send.setAttribute("aria-label", hasText ? "Enviar mensagem" : (state.recording ? "Encerrar e enviar audio" : "Gravar audio"));
    elements.send.innerHTML = hasText ? SEND_ICON : MIC_ICON;
  }

  function chooseAudioMimeType() {
    const options = ["audio/ogg;codecs=opus", "audio/ogg", "audio/webm;codecs=opus", "audio/webm"];
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
    return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler audio."));
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
    const title = String(options.title || asset?.title || (kind === "video" ? "Video do chat" : kind === "photo" ? "Imagem do chat" : "Audio do chat"));
    const mediaUrl = String(asset?.url || asset?.mediaUrl || asset?.remoteUrl || "");
    const payload = {
      kind,
      title,
      previewDataUrl: String(options.previewDataUrl || ""),
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

  function buildAudioShareMessage(asset, durationMs) {
    return buildMediaShareMessage(asset, { kind: "audio", title: "Audio do chat", durationMs });
  }

  function fileToBase64(file) {
    return blobToBase64(file);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler anexo."));
      reader.readAsDataURL(file);
    });
  }

  function attachmentKind(file) {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("audio/")) return "audio";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("image/")) return "photo";
    return "";
  }

  function attachmentTitle(file, kind) {
    const name = String(file?.name || "").trim().replace(/\.[^.]+$/, "");
    if (name) return name.slice(0, 80);
    if (kind === "video") return "Video do chat";
    if (kind === "photo") return "Imagem do chat";
    return "Audio do chat";
  }

  async function uploadChatAttachment(file) {
    const kind = attachmentKind(file);
    if (!kind) throw new Error("Envie audio, video ou imagem.");
    if (Number(file?.size || 0) > 20 * 1024 * 1024) throw new Error("O anexo precisa ter ate 20 MB.");
    const mimeType = String(file.type || "").split(";")[0];
    if (!mimeType) throw new Error("Arquivo sem tipo valido.");
    const previewDataUrl = "";
    const payload = await apiRequest("/api/200/life-captures/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: attachmentTitle(file, kind),
        noteText: "",
        createdAt: new Date().toISOString(),
        durationMs: 0,
        metadata: { source: "project200-human-chat-attachment", fileName: String(file.name || "") },
        mimeType,
        fileBase64: await fileToBase64(file),
        previewBase64: ""
      }),
      skipGlobalLoading: true
    });
    return {
      asset: payload?.asset || payload?.capture || null,
      kind,
      title: attachmentTitle(file, kind),
      previewDataUrl,
      sizeBytes: Number(file.size || 0)
    };
  }
  async function uploadChatAudio(blob, durationMs) {
    const mimeType = String(blob?.type || "audio/ogg").split(";")[0] || "audio/ogg";
    const fileBase64 = await blobToBase64(blob);
    const payload = await apiRequest("/api/200/life-captures/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "audio",
        title: "Audio do chat",
        noteText: "",
        createdAt: new Date().toISOString(),
        durationMs,
        metadata: { source: "project200-human-chat" },
        mimeType,
        fileBase64,
        previewBase64: ""
      }),
      skipGlobalLoading: true
    });
    return payload?.asset || payload?.capture || null;
  }
  function notificationPreferences() {
    const preferences = typeof getNotificationPreferences === "function" ? getNotificationPreferences() : {};
    return {
      enabled: preferences?.enabled === true,
      soundEnabled: preferences?.soundEnabled === true
    };
  }

  function notificationEntryKey(entry) {
    return String(entry?.latestMessageId || "").trim();
  }

  function localNotificationId(value) {
    const text = String(value || Date.now());
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return Math.max(1, Math.abs(hash) % 2147483000);
  }

  function renderUnreadAlert() {
    if (!elements.unreadAlert) return;
    const preferences = notificationPreferences();
    const notifications = Array.isArray(state.inboxNotifications) ? state.inboxNotifications : [];
    const unreadCount = Math.max(0, Number(state.inboxUnreadCount || 0)) || notifications.reduce((total, entry) => total + Math.max(0, Number(entry?.unreadCount || 0)), 0);
    const latest = notifications[0] || null;
    const visible = preferences.enabled && Boolean(latest) && unreadCount > 0;
    elements.unreadAlert.hidden = !visible;
    if (!visible) {
      elements.unreadAlert.dataset.contactId = "";
      return;
    }
    elements.unreadAlert.dataset.contactId = String(latest.contactUserId || latest.userId || "");
    elements.unreadAlert.setAttribute("aria-label", `${unreadCount} ${unreadCount === 1 ? "mensagem nova" : "mensagens novas"} de ${String(latest.name || "um contato")}`);
    if (elements.unreadCount) elements.unreadCount.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    const url = avatarUrl(latest);
    if (elements.unreadAvatar) {
      elements.unreadAvatar.hidden = !url;
      if (url && elements.unreadAvatar.src !== url) elements.unreadAvatar.src = url;
    }
    if (elements.unreadAvatarFallback) {
      elements.unreadAvatarFallback.hidden = Boolean(url);
      elements.unreadAvatarFallback.textContent = String(latest.initials || latest.name || "U").trim().slice(0, 2).toUpperCase();
    }
  }

  async function primeNotificationSound() {
    if (!elements.notificationAudio) return false;
    const previousVolume = elements.notificationAudio.volume;
    try {
      elements.notificationAudio.volume = 0;
      elements.notificationAudio.currentTime = 0;
      await elements.notificationAudio.play();
      elements.notificationAudio.pause();
      elements.notificationAudio.currentTime = 0;
      return true;
    } catch {
      return false;
    } finally {
      elements.notificationAudio.volume = previousVolume || 1;
    }
  }

  async function playNotificationSound() {
    if (!notificationPreferences().soundEnabled || !elements.notificationAudio) return;
    try {
      elements.notificationAudio.pause();
      elements.notificationAudio.currentTime = 0;
      elements.notificationAudio.volume = 1;
      await elements.notificationAudio.play();
    } catch {}
  }

  async function showSystemNotification(entry) {
    if (!notificationPreferences().enabled || !entry) return false;
    const name = String(entry.name || "um contato");
    const title = `Nova mensagem de ${name}`;
    const body = Number(entry.unreadCount || 0) > 1
      ? `${Math.max(1, Number(entry.unreadCount || 0))} mensagens novas no iLife`
      : "Voce recebeu uma nova mensagem no iLife.";
    const nativeNotifications = window.Capacitor?.Plugins?.LocalNotifications || null;
    if (nativeNotifications?.schedule) {
      try {
        const permission = await nativeNotifications.checkPermissions();
        if (permission?.display !== "granted") return false;
        const withSound = notificationPreferences().soundEnabled;
        await nativeNotifications.schedule({
          notifications: [{
            id: localNotificationId(notificationEntryKey(entry)),
            title,
            body,
            channelId: withSound ? "ilife-messages" : "ilife-messages-silent",
            sound: withSound ? "ilife.mp3" : null,
            schedule: { at: new Date(Date.now() + 160) },
            extra: { contactUserId: String(entry.contactUserId || entry.userId || "") }
          }]
        });
        return true;
      } catch {
        return false;
      }
    }
    if (typeof window.Notification === "function" && window.Notification.permission === "granted") {
      try {
        const notification = new window.Notification(title, {
          body,
          icon: avatarUrl(entry) || "/200/images/ilife-mindsetplan-home.png",
          tag: `ilife-message-${String(entry.contactUserId || entry.userId || "")}`,
          renotify: true,
          silent: true
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
          void openUnreadContact(String(entry.contactUserId || entry.userId || ""));
        };
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async function announceInboxEntry(entry) {
    const usedNativeNotification = await showSystemNotification(entry);
    if (!usedNativeNotification || !window.Capacitor?.Plugins?.LocalNotifications) {
      await playNotificationSound();
    }
  }

  async function refreshInbox({ announce = true } = {}) {
    if (!notificationPreferences().enabled || state.inboxSyncing) {
      renderUnreadAlert();
      return;
    }
    state.inboxSyncing = true;
    try {
      const payload = await apiRequest("/api/200/tutors/inbox", { skipGlobalLoading: true });
      const nextNotifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
      const freshEntries = nextNotifications.filter((entry) => {
        const key = notificationEntryKey(entry);
        return key && !state.notifiedMessageIds.has(key);
      });
      state.inboxNotifications = nextNotifications;
      state.inboxUnreadCount = Math.max(0, Number(payload?.unreadCount || 0));
      renderUnreadAlert();
      if (!state.inboxHydrated) {
        state.inboxHydrated = true;
      } else if (announce && freshEntries.length) {
        await announceInboxEntry(freshEntries[0]);
      }
      nextNotifications.forEach((entry) => {
        const key = notificationEntryKey(entry);
        if (key) state.notifiedMessageIds.add(key);
      });
      if (state.notifiedMessageIds.size > 240) {
        state.notifiedMessageIds = new Set([...state.notifiedMessageIds].slice(-160));
      }
    } catch {
      renderUnreadAlert();
    } finally {
      state.inboxSyncing = false;
    }
  }

  function stopInboxPolling() {
    if (state.inboxTimer) window.clearInterval(state.inboxTimer);
    state.inboxTimer = 0;
  }

  function startInboxPolling() {
    stopInboxPolling();
    if (!notificationPreferences().enabled) return;
    state.inboxTimer = window.setInterval(() => void refreshInbox({ announce: true }), 8000);
  }

  function refreshNotificationPreferences() {
    if (!notificationPreferences().enabled) {
      stopInboxPolling();
      state.inboxHydrated = false;
      state.inboxNotifications = [];
      state.inboxUnreadCount = 0;
      renderUnreadAlert();
      return;
    }
    renderUnreadAlert();
    void refreshInbox({ announce: state.inboxHydrated });
    startInboxPolling();
  }

  async function acknowledgeConversation(contactId) {
    const normalizedContactId = String(contactId || "").trim();
    if (!normalizedContactId) return;
    state.inboxNotifications = state.inboxNotifications.filter((entry) => String(entry?.contactUserId || entry?.userId || "") !== normalizedContactId);
    state.inboxUnreadCount = state.inboxNotifications.reduce((total, entry) => total + Math.max(0, Number(entry?.unreadCount || 0)), 0);
    renderUnreadAlert();
    try {
      await apiRequest(`/api/200/tutors/${encodeURIComponent(normalizedContactId)}/messages/read`, {
        method: "POST",
        skipGlobalLoading: true
      });
      await refreshInbox({ announce: false });
    } catch {}
  }

  async function openUnreadContact(contactId) {
    const normalizedContactId = String(contactId || "").trim();
    if (!normalizedContactId) return;
    let tutor = findTutorByContactId(normalizedContactId);
    if (!tutor) {
      try {
        await loadDirectory();
      } catch {}
      tutor = findTutorByContactId(normalizedContactId);
    }
    if (tutor) await selectTutor(tutor);
  }

  function updateHeader() {
    if (!state.human || !state.activeTutor) {
      if (elements.proposalButton) elements.proposalButton.hidden = true;
      if (elements.chatType) elements.chatType.textContent = "IA do iLife";
      if (elements.chatPersonButton) {
        const currentAvatar = String(typeof getCurrentProfileAvatar === "function" ? getCurrentProfileAvatar() : "").trim();
        elements.chatPersonButton.innerHTML = currentAvatar
          ? `<img class="marin-chat-contact-avatar" src="${currentAvatar.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}" alt="Seu avatar">`
          : defaultPersonMarkup;
      }
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

  function messageFingerprint(message) {
    return JSON.stringify([
      String(message?.id || ""),
      String(message?.role || ""),
      String(message?.content || ""),
      String(message?.createdAt || ""),
      Array.isArray(message?.proposals) ? message.proposals : []
    ]);
  }

  function conversationFingerprint(messages) {
    return (Array.isArray(messages) ? messages : [])
      .map((message) => messageFingerprint(message))
      .join("\n");
  }

  function mergeMessageChanges(changes) {
    const merged = new Map(state.messages.map((message) => [String(message?.id || ""), message]));
    changes.forEach((message) => {
      const id = String(message?.id || "");
      if (id) merged.set(id, message);
    });
    state.messages = [...merged.values()]
      .sort((left, right) => {
        const leftTime = Date.parse(String(left?.createdAt || "")) || 0;
        const rightTime = Date.parse(String(right?.createdAt || "")) || 0;
        return leftTime - rightTime || String(left?.id || "").localeCompare(String(right?.id || ""));
      })
      .slice(-100);
  }

  function renderMessages({ preserveScroll = false, animateMessageIds = new Set() } = {}) {
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
      const messageId = String(message?.id || "");
      const isSharedMedia = isChatMediaMessage(message.content);
      const bubble = document.createElement("article");
      bubble.className = isSharedMedia
        ? "marin-message-shared " + (message.role === "user" ? "is-user" : "is-assistant")
        : "marin-message " + (message.role === "user" ? "is-user" : "is-assistant");
      if (!animateMessageIds.has(messageId)) {
        bubble.classList.add("is-synced");
      }
      const copy = document.createElement("div");
      copy.className = isSharedMedia ? "marin-message-shared-content" : "marin-message-copy";
      renderChatMessageContent(copy, message.content);
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

  async function ensureHumanContact(friend) {
    const normalizedUserId = String(friend?.userId || friend?.contactUserId || "").trim();
    if (!normalizedUserId) {
      throw new Error("Escolha um amigo valido.");
    }
    let tutor = findTutorByContactId(normalizedUserId);
    if (tutor) {
      return tutor;
    }
    await loadDirectory();
    tutor = findTutorByContactId(normalizedUserId);
    if (tutor) {
      return tutor;
    }
    const payload = await apiRequest("/api/200/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorUserId: normalizedUserId }),
      skipGlobalLoading: true
    });
    state.tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
    state.friends = Array.isArray(payload?.friends) ? payload.friends : [];
    renderTutorPicker();
    renderTutorContacts();
    tutor = findTutorByContactId(normalizedUserId);
    if (!tutor) {
      throw new Error("Nao foi possivel abrir a conversa com esse amigo.");
    }
    return tutor;
  }

  async function openFriendChat(friend) {
    const tutor = await ensureHumanContact(friend);
    await selectTutor(tutor);
  }

  async function refreshMessages({ silent = true, forceFull = false } = {}) {
    const contactId = activeContactId();
    if (!state.human || !contactId) return;
    if (state.syncing && state.syncContactId === contactId) return;

    const useCursor = !forceFull && Boolean(state.syncCursor);
    const requestToken = state.syncToken + 1;
    state.syncToken = requestToken;
    state.syncing = true;
    state.syncContactId = contactId;
    let requestPath = "/api/200/tutors/" + encodeURIComponent(contactId) + "/messages?limit=80";
    if (useCursor) {
      requestPath += "&after=" + encodeURIComponent(state.syncCursor);
    }

    try {
      const payload = await apiRequest(requestPath, { skipGlobalLoading: true });
      if (
        requestToken !== state.syncToken
        || !state.human
        || activeContactId() !== contactId
      ) {
        return;
      }

      const changes = Array.isArray(payload?.messages) ? payload.messages : [];
      const previousIds = new Set(state.messages.map((message) => String(message?.id || "")));
      const beforeFingerprint = conversationFingerprint(state.messages);
      if (useCursor) {
        mergeMessageChanges(changes);
      } else {
        state.messages = changes.slice(-100);
      }
      state.syncCursor = String(payload?.cursor || state.syncCursor || "");
      const afterFingerprint = conversationFingerprint(state.messages);

      if (beforeFingerprint !== afterFingerprint) {
        const animateMessageIds = silent
          ? new Set(changes
              .map((message) => String(message?.id || ""))
              .filter((id) => id && !previousIds.has(id)))
          : new Set();
        renderMessages({ preserveScroll: silent, animateMessageIds });
      }
      if (!silent) setStatus("");
    } catch (error) {
      if (!silent) setStatus(error instanceof Error ? error.message : "Nao foi possivel abrir a conversa.");
    } finally {
      if (requestToken === state.syncToken) {
        state.syncing = false;
        state.syncContactId = "";
      }
    }
  }

  function stopPolling() {
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    state.pollTimer = 0;
  }

  function canPollMessages() {
    return Boolean(
      state.human
      && activeContactId()
      && !document.hidden
      && elements.chatModal?.classList.contains("active")
    );
  }

  function startPolling() {
    stopPolling();
    if (!state.human || !activeContactId()) return;
    state.pollTimer = window.setInterval(() => {
      if (canPollMessages()) {
        void refreshMessages({ silent: true });
      }
    }, 5000);
  }

  function syncVisibleConversation() {
    if (canPollMessages()) {
      void refreshMessages({ silent: true });
    }
  }

  async function openHumanChat() {
    if (!state.human || !state.activeTutor) return;
    openModal("marinChatModal");
    updateHeader();
    renderMessages({ animateMessageIds: new Set() });
    await refreshMessages({ silent: false, forceFull: !state.syncCursor });
    await acknowledgeConversation(activeContactId());
    startPolling();
    syncComposerMode();
    window.setTimeout(() => elements.input?.focus({ preventScroll: true }), 60);
  }

  async function selectTutor(tutor) {
    state.human = true;
    state.activeTutor = tutor;
    state.messages = [];
    state.syncCursor = "";
    state.syncToken += 1;
    state.syncing = false;
    state.syncContactId = "";
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
    state.syncCursor = "";
    state.syncToken += 1;
    state.syncing = false;
    state.syncContactId = "";
    stopPolling();
    updateHeader();
    renderTutorContacts();
  }

  function stopAudioStream() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop());
      state.mediaStream = null;
    }
  }

  function resetRecordingUi() {
    state.recording = false;
    state.recordingStartedAt = 0;
    state.recordingPointerDownAt = 0;
    state.recordingWasActiveOnPress = false;
    state.recordingAutoStopOnRelease = false;
    syncComposerMode();
  }

  async function finishAudioRecording({ send = true } = {}) {
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") {
      resetRecordingUi();
      stopAudioStream();
      return;
    }
    state.mediaRecorder._sendOnStop = Boolean(send);
    state.mediaRecorder.stop();
  }

  async function startAudioRecording() {
    if (!state.human || state.recording || state.sending || hasTypedMessage()) return;
    const contactId = activeContactId();
    if (!contactId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = chooseAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      state.mediaStream = stream;
      state.mediaRecorder = recorder;
      state.audioChunks = [];
      state.recording = true;
      state.recordingStartedAt = Date.now();
      syncComposerMode();
      setStatus("Toque no microfone para enviar.");
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) state.audioChunks.push(event.data);
      });
      recorder.addEventListener("stop", async () => {
        const chunks = state.audioChunks.slice();
        const shouldSend = recorder._sendOnStop !== false;
        const durationMs = Math.max(0, Date.now() - state.recordingStartedAt);
        state.audioChunks = [];
        state.mediaRecorder = null;
        resetRecordingUi();
        stopAudioStream();
        if (!shouldSend) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/ogg" });
        if (!blob.size) {
          setStatus("Nao ouvi nada. Tente novamente.");
          return;
        }
        state.sending = true;
        if (elements.send) elements.send.disabled = true;
        setStatus("Enviando audio...");
        try {
          const asset = await uploadChatAudio(blob, durationMs);
          const mediaUrl = String(asset?.url || asset?.mediaUrl || "");
          if (!mediaUrl) throw new Error("Audio enviado sem URL publica.");
          const payload = await apiRequest("/api/200/tutors/" + encodeURIComponent(contactId) + "/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: buildAudioShareMessage(asset, durationMs) }),
            skipGlobalLoading: true
          });
          if (payload?.message) state.messages.push(payload.message);
          renderMessages({
            animateMessageIds: new Set(payload?.message?.id ? [String(payload.message.id)] : [])
          });
          setStatus("");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar o audio.");
        } finally {
          state.sending = false;
          if (elements.send) elements.send.disabled = false;
          syncComposerMode();
        }
      });
      recorder.start();
    } catch (error) {
      resetRecordingUi();
      stopAudioStream();
      setStatus(error instanceof Error ? error.message : "Nao foi possivel abrir o microfone.");
    }
  }

  async function toggleAudioRecording() {
    if (hasTypedMessage()) {
      await sendMessage();
      return;
    }
    if (state.recording) {
      await finishAudioRecording({ send: true });
      return;
    }
    await startAudioRecording();
  }

  async function sendAttachment(file) {
    const contactId = activeContactId();
    if (!state.human || !contactId || state.attaching) return;
    state.attaching = true;
    if (elements.attach) elements.attach.disabled = true;
    setStatus("Enviando anexo...");
    try {
      const uploaded = await uploadChatAttachment(file);
      const mediaUrl = String(uploaded.asset?.url || uploaded.asset?.mediaUrl || "");
      if (!mediaUrl) throw new Error("Anexo enviado sem URL publica.");
      const payload = await apiRequest("/api/200/tutors/" + encodeURIComponent(contactId) + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: buildMediaShareMessage(uploaded.asset, {
            kind: uploaded.kind,
            title: uploaded.title,
            previewDataUrl: uploaded.previewDataUrl,
            sizeBytes: uploaded.sizeBytes
          })
        }),
        skipGlobalLoading: true
      });
      if (payload?.message) state.messages.push(payload.message);
      renderMessages({
        animateMessageIds: new Set(payload?.message?.id ? [String(payload.message.id)] : [])
      });
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar o anexo.");
    } finally {
      state.attaching = false;
      if (elements.attach) elements.attach.disabled = false;
      if (elements.fileInput) elements.fileInput.value = "";
    }
  }

  function firstSupportedFile(fileList) {
    return [...(fileList || [])].find((file) => attachmentKind(file)) || null;
  }
  async function sendMessage() {
    const content = String(elements.input?.value || "").trim();
    const contactId = activeContactId();
    if (!state.human || !content || !contactId || state.sending) return;
    const localId = "local-" + Date.now();
    state.messages.push({
      id: localId,
      role: "user",
      content,
      proposals: [],
      source: "human",
      createdAt: new Date().toISOString()
    });
    elements.input.value = "";
    state.sending = true;
    if (elements.send) elements.send.disabled = true;
    renderMessages({ animateMessageIds: new Set([localId]) });
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
      renderMessages({
        animateMessageIds: new Set(payload?.message?.id ? [String(payload.message.id)] : [])
      });
      setStatus("");
    } catch (error) {
      state.messages = state.messages.filter((message) => message.id !== localId);
      renderMessages({ animateMessageIds: new Set() });
      setStatus(error instanceof Error ? error.message : "Nao foi possivel enviar.");
    } finally {
      state.sending = false;
      if (elements.send) elements.send.disabled = false;
      syncComposerMode();
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
    renderMessages({
      animateMessageIds: new Set(payload?.message?.id ? [String(payload.message.id)] : [])
    });
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

  document.addEventListener("visibilitychange", syncVisibleConversation);
  window.addEventListener("focus", syncVisibleConversation);
  const syncInboxOnResume = () => {
    if (!document.hidden && notificationPreferences().enabled) {
      void refreshInbox({ announce: state.inboxHydrated });
    }
  };
  document.addEventListener("visibilitychange", syncInboxOnResume);
  window.addEventListener("focus", syncInboxOnResume);

  elements.unreadAlert?.addEventListener("click", () => {
    void openUnreadContact(String(elements.unreadAlert?.dataset.contactId || ""));
  });
  const nativeNotifications = window.Capacitor?.Plugins?.LocalNotifications || null;
  nativeNotifications?.addListener?.("localNotificationActionPerformed", (event) => {
    const contactId = String(event?.notification?.extra?.contactUserId || "");
    if (contactId) void openUnreadContact(contactId);
  });


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

  elements.attach?.addEventListener("click", (event) => {
    if (!state.human) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    elements.fileInput?.click();
  }, true);
  elements.fileInput?.addEventListener("change", () => {
    const file = firstSupportedFile(elements.fileInput?.files);
    if (file) void sendAttachment(file);
  });
  elements.chatModal?.addEventListener("dragover", (event) => {
    if (!state.human || state.attaching) return;
    if (!firstSupportedFile(event.dataTransfer?.files)) return;
    event.preventDefault();
    elements.chatModal.classList.add("is-attachment-dragging");
  });
  elements.chatModal?.addEventListener("dragleave", (event) => {
    if (!elements.chatModal?.contains(event.relatedTarget)) {
      elements.chatModal?.classList.remove("is-attachment-dragging");
    }
  });
  elements.chatModal?.addEventListener("drop", (event) => {
    if (!state.human || state.attaching) return;
    const file = firstSupportedFile(event.dataTransfer?.files);
    if (!file) return;
    event.preventDefault();
    elements.chatModal?.classList.remove("is-attachment-dragging");
    void sendAttachment(file);
  });
  elements.form?.addEventListener("submit", (event) => {
    if (!state.human) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (hasTypedMessage()) void sendMessage();
    else void toggleAudioRecording();
  }, true);
  elements.input?.addEventListener("input", syncComposerMode);
  elements.input?.addEventListener("keydown", (event) => {
    if (!state.human || event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (hasTypedMessage()) void sendMessage();
  }, true);
  elements.send?.addEventListener("pointerdown", (event) => {
    if (!state.human || hasTypedMessage()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.recordingPointerDownAt = Date.now();
    state.recordingWasActiveOnPress = state.recording;
    if (!state.recording) void startAudioRecording();
  }, true);
  elements.send?.addEventListener("pointerup", (event) => {
    if (!state.human || hasTypedMessage()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const elapsed = Date.now() - Number(state.recordingPointerDownAt || Date.now());
    if (state.recordingWasActiveOnPress || elapsed >= 3000) {
      void finishAudioRecording({ send: true });
      return;
    }
    window.setTimeout(() => {
      state.recordingPointerDownAt = 0;
      state.recordingWasActiveOnPress = false;
    }, 350);
  }, true);
  elements.send?.addEventListener("pointercancel", () => {
    state.recordingPointerDownAt = 0;
    state.recordingWasActiveOnPress = false;
  }, true);
  elements.send?.addEventListener("click", (event) => {
    if (!state.human || hasTypedMessage()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!state.recordingPointerDownAt) void toggleAudioRecording();
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
    button.addEventListener("click", () => {
      stopPolling();
      void finishAudioRecording({ send: false });
    });
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
  syncComposerMode();
  void loadDirectory().catch(() => {});

  return {
    openChat: openHumanChat,
    openFriendChat,
    sendHumanProposal,
    isHumanActive: () => Boolean(state.human && activeContactId()),
    refreshNotificationPreferences,
    primeNotificationSound,
    refreshHeader: updateHeader,
    stop: () => {
      stopPolling();
      stopInboxPolling();
    }
  };
}
