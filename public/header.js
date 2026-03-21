import { getApiUrl } from "./api.js";

const sessionStorageKey = "turma_do_printy_token";
const adminMessagePollMs = 15000;

function ensureAdminMessageNotice() {
  let notice = document.getElementById("admin-user-message-notice");

  if (notice) {
    return notice;
  }

  notice = document.createElement("aside");
  notice.id = "admin-user-message-notice";
  notice.className = "admin-user-message-notice";
  notice.hidden = true;
  notice.innerHTML = `
    <button class="admin-user-message-close" type="button" aria-label="Fechar mensagem" title="Fechar mensagem">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>
    </button>
    <strong class="admin-user-message-title"></strong>
    <p class="admin-user-message-body"></p>
    <div class="admin-user-message-actions">
      <button class="admin-user-message-reply" type="button">Responder</button>
    </div>
    <form class="admin-user-message-compose" hidden>
      <input class="admin-user-message-input" type="text" maxlength="500" placeholder="Digite sua mensagem para Rose">
      <button class="admin-user-message-send" type="submit">Enviar</button>
    </form>
    <p class="admin-user-message-feedback" hidden></p>
  `;

  document.body.appendChild(notice);
  return notice;
}

function hideAdminMessageNotice() {
  const notice = document.getElementById("admin-user-message-notice");

  if (notice) {
    notice.hidden = true;
    notice.classList.remove("is-replying");
  }
}

async function fetchCurrentAdminMessage() {
  const token = getToken();

  if (!token) {
    hideAdminMessageNotice();
    return null;
  }

  const response = await fetch(getApiUrl("/api/account/message"), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    hideAdminMessageNotice();
    return null;
  }

  if (!response.ok) {
    throw new Error("Falha ao carregar mensagem.");
  }

  const data = await response.json().catch(() => ({}));
  return data.message || null;
}

async function dismissCurrentAdminMessage(messageId) {
  const token = getToken();

  if (!token || !messageId) {
    hideAdminMessageNotice();
    return;
  }

  const response = await fetch(getApiUrl("/api/account/message/dismiss"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ messageId })
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Falha ao fechar mensagem.");
  }

  hideAdminMessageNotice();
}

async function sendCurrentUserReply(messageId, body) {
  const token = getToken();

  if (!token || !messageId) {
    throw new Error("Mensagem indisponivel para resposta.");
  }

  const response = await fetch(getApiUrl("/api/account/message/reply"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ messageId, body })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Falha ao enviar resposta.");
  }

  return data.message || null;
}

function renderAdminMessageNotice(message) {
  const notice = ensureAdminMessageNotice();
  const title = notice.querySelector(".admin-user-message-title");
  const body = notice.querySelector(".admin-user-message-body");
  const closeButton = notice.querySelector(".admin-user-message-close");
  const replyButton = notice.querySelector(".admin-user-message-reply");
  const actions = notice.querySelector(".admin-user-message-actions");
  const composeForm = notice.querySelector(".admin-user-message-compose");
  const composeInput = notice.querySelector(".admin-user-message-input");
  const sendButton = notice.querySelector(".admin-user-message-send");
  const feedback = notice.querySelector(".admin-user-message-feedback");

  if (!message) {
    notice.hidden = true;
    notice.dataset.messageId = "";
    notice.classList.remove("is-replying");
    return;
  }

  title.textContent = message.title || "";
  body.textContent = message.body || "";
  notice.dataset.messageId = message.id || "";
  notice.hidden = false;
  notice.classList.remove("is-replying");
  if (composeForm) {
    composeForm.hidden = true;
  }
  if (composeInput) {
    composeInput.value = "";
  }
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = "";
  }
  if (actions) {
    actions.hidden = Boolean(message.userReplyBody);
  }

  title.hidden = false;
  body.hidden = false;

  if (message.userReplyBody) {
    title.hidden = true;
    body.hidden = true;
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = "Mensagem enviada para Rose.";
    }
  }

  if (!closeButton.dataset.bound) {
    closeButton.dataset.bound = "true";
    closeButton.addEventListener("click", async () => {
      closeButton.disabled = true;

      try {
        await dismissCurrentAdminMessage(notice.dataset.messageId || "");
      } catch {
        // Nao bloqueia a experiencia do usuario por falha ao fechar.
      } finally {
        closeButton.disabled = false;
      }
    });
  }

  if (replyButton && !replyButton.dataset.bound) {
    replyButton.dataset.bound = "true";
    replyButton.addEventListener("click", () => {
      notice.classList.add("is-replying");
      title.hidden = true;
      body.hidden = true;
      if (actions) {
        actions.hidden = true;
      }
      if (feedback) {
        feedback.hidden = true;
        feedback.textContent = "";
      }
      if (composeForm) {
        composeForm.hidden = false;
      }
      composeInput?.focus();
    });
  }

  if (composeForm && !composeForm.dataset.bound) {
    composeForm.dataset.bound = "true";
    composeForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const replyText = String(composeInput?.value || "").trim();

      if (!replyText) {
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "Digite sua mensagem.";
        }
        composeInput?.focus();
        return;
      }

      if (sendButton) {
        sendButton.disabled = true;
      }

      try {
        const nextMessage = await sendCurrentUserReply(notice.dataset.messageId || "", replyText);
        renderAdminMessageNotice(nextMessage);
      } catch (error) {
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = error instanceof Error ? error.message : "Erro ao enviar resposta.";
        }
      } finally {
        if (sendButton) {
          sendButton.disabled = false;
        }
      }
    });
  }
}

async function syncAdminMessageNotice() {
  try {
    const currentNotice = document.getElementById("admin-user-message-notice");

    if (currentNotice?.classList.contains("is-replying")) {
      return;
    }

    const message = await fetchCurrentAdminMessage();
    renderAdminMessageNotice(message);
  } catch {
    // Silencioso para nao poluir a interface.
  }
}

function startAdminMessagePolling(user) {
  if (!user) {
    if (window.__turmaDoPrintyAdminMessagePollTimer) {
      window.clearInterval(window.__turmaDoPrintyAdminMessagePollTimer);
      window.__turmaDoPrintyAdminMessagePollTimer = null;
    }
    hideAdminMessageNotice();
    return;
  }

  if (window.__turmaDoPrintyAdminMessagePollTimer) {
    window.clearInterval(window.__turmaDoPrintyAdminMessagePollTimer);
  }

  void syncAdminMessageNotice();
  window.__turmaDoPrintyAdminMessagePollTimer = window.setInterval(() => {
    void syncAdminMessageNotice();
  }, adminMessagePollMs);
}

export function syncAdminMessageNoticeForUser(user) {
  startAdminMessagePolling(user);
}

export function getToken() {
  return window.localStorage.getItem(sessionStorageKey) || "";
}

export async function loadCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  const response = await fetch(getApiUrl("/api/auth/me"), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}

function buildLoggedOutMenu() {
  return `
    <a class="site-user-menu-item" href="/explorar.html">Entrar</a>
    <a class="site-user-menu-item" href="/explorar.html">Criar conta</a>
  `;
}

function buildLoggedInMenu(user) {
  const name = user?.name || user?.username || "Usuario";
  const username = user?.username ? `@${user.username}` : "";

  return `
    <div class="site-user-menu-head">
      <strong>${name}</strong>
      <span>${username}</span>
    </div>
    <a class="site-user-menu-item" href="/planos.html">Gerenciar assinatura</a>
    <a class="site-user-menu-item" href="/planos.html">Cancelar plano</a>
    <button class="site-user-menu-item" type="button" data-action="delete-account" disabled>Excluir conta</button>
    <button class="site-user-menu-item danger" type="button" data-action="logout">Sair da conta</button>
  `;
}

export async function initSiteHeader() {
  const header = document.querySelector(".site-header");

  if (!header) {
    return null;
  }

  let userShell = header.querySelector(".site-user-shell");

  if (!userShell) {
    userShell = document.createElement("div");
    userShell.className = "site-user-shell";
    userShell.innerHTML = `
      <button class="site-user-button" type="button" aria-label="Abrir menu do usuario" title="Perfil e conta">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12m0 2c-4.14 0-7.5 2.46-7.5 5.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1C19.5 16.46 16.14 14 12 14"/></svg>
      </button>
      <div class="site-user-menu" hidden></div>
    `;
    header.appendChild(userShell);
  }

  const userButton = userShell.querySelector(".site-user-button");
  const userMenu = userShell.querySelector(".site-user-menu");
  const user = await loadCurrentUser().catch(() => null);

  userMenu.innerHTML = user ? buildLoggedInMenu(user) : buildLoggedOutMenu();

  const closeMenu = () => {
    userShell.classList.remove("open");
    userMenu.hidden = true;
  };

  const openMenu = () => {
    userShell.classList.add("open");
    userMenu.hidden = false;
  };

  userButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (userShell.classList.contains("open")) {
      closeMenu();
      return;
    }

    openMenu();
  });

  userMenu.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");

    if (!target) {
      return;
    }

    const action = target.getAttribute("data-action");

    if (action === "logout") {
      window.localStorage.removeItem(sessionStorageKey);
      closeMenu();
      window.location.href = "/index.html";
      return;
    }

    if (action === "delete-account") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!userShell.contains(event.target)) {
      closeMenu();
    }
  });

  startAdminMessagePolling(user);

  return user;
}
