import { getApiUrl } from "./api.js";

const sessionStorageKey = "turma_do_printy_token";

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

  return user;
}
