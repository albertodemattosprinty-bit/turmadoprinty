(function initProject200Books() {
  const TOKEN_KEY = "turma_do_printy_token";
  const byId = (id) => document.getElementById(id);
  const state = { books: [], loading: false, pollTimer: 0, literaryStyle: "Romance" };

  function getToken() {
    try {
      const local = String(window.localStorage.getItem(TOKEN_KEY) || "").trim();
      if (local) return local;
    } catch {}
    try {
      const match = document.cookie.match(/(?:^|; )turma_do_printy_token=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    } catch { return ""; }
  }

  function apiOrigin() {
    const configured = document.querySelector('meta[name="tdp-api-base-url"]')?.getAttribute("content")?.trim()
      || (typeof window.__TDP_API_BASE_URL__ === "string" ? window.__TDP_API_BASE_URL__.trim() : "");
    if (configured) return configured.replace(/\/+$/, "");
    const capacitor = window.Capacitor;
    const platform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "web";
    const native = typeof capacitor?.isNativePlatform === "function" ? capacitor.isNativePlatform() : ["android", "ios"].includes(platform);
    return native ? "https://www.turmadoprinty.com.br" : "";
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const response = await fetch(`${apiOrigin()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Não foi possível acessar Livros.");
    return payload;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  }

  function statusLabel(book) {
    if (book.status === "ready") return `${book.pageCount} páginas`;
    if (book.status === "failed") return "Geração interrompida";
    return `${book.generatedPageCount || 0} de ${book.pageCount} páginas`;
  }

  function renderLibrary() {
    const grid = byId("booksGrid");
    if (!grid) return;
    if (!state.books.length) {
      grid.innerHTML = '<div class="books-empty">A biblioteca está pronta para o primeiro livro. Toque em + para criar com Luna.</div>';
      return;
    }
    grid.innerHTML = state.books.map((book) => `
      <button class="book-card" type="button" data-book-id="${escapeHtml(book.id)}" ${book.status === "ready" ? "" : "data-book-pending=\"true\""}>
        <span class="book-card-cover">
          ${book.coverImageUrl ? `<img src="${escapeHtml(book.coverImageUrl)}" alt="Capa de ${escapeHtml(book.title)}" loading="lazy" />` : ""}
          <span class="book-card-progress">${escapeHtml(statusLabel(book))}</span>
        </span>
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.authorName)} · ${escapeHtml(book.literaryStyle)}</small>
      </button>
    `).join("");
  }

  function schedulePoll() {
    window.clearTimeout(state.pollTimer);
    if (!state.books.some((book) => ["queued", "generating"].includes(book.status))) return;
    state.pollTimer = window.setTimeout(() => void loadLibrary({ quiet: true }), 5000);
  }

  async function loadLibrary({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!quiet && byId("booksStatus")) byId("booksStatus").textContent = "Abrindo a biblioteca geral...";
    try {
      const payload = await apiFetch("/api/200/books");
      state.books = Array.isArray(payload?.books) ? payload.books : [];
      renderLibrary();
      if (byId("booksStatus")) byId("booksStatus").textContent = state.books.some((book) => ["queued", "generating"].includes(book.status))
        ? "Luna está escrevendo. Você pode sair: o livro continua sendo criado no servidor."
        : "";
      schedulePoll();
    } catch (error) {
      if (byId("booksStatus")) byId("booksStatus").textContent = error instanceof Error ? error.message : "Falha ao abrir a biblioteca.";
    } finally {
      state.loading = false;
    }
  }

  function setCreateOpen(open) {
    const layer = byId("bookCreateLayer");
    if (!layer) return;
    layer.hidden = !open;
    layer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) window.setTimeout(() => byId("bookTitleInput")?.focus(), 60);
  }

  function setReaderOpen(open) {
    const layer = byId("bookReaderLayer");
    if (!layer) return;
    layer.hidden = !open;
    layer.setAttribute("aria-hidden", open ? "false" : "true");
  }

  async function openBook(bookId) {
    const status = byId("booksStatus");
    const known = state.books.find((book) => book.id === bookId);
    if (known?.status !== "ready") {
      if (status) status.textContent = known?.errorMessage || known?.feedback || "Este livro ainda está sendo escrito.";
      return;
    }
    if (status) status.textContent = "Carregando páginas...";
    try {
      const payload = await apiFetch(`/api/200/books/${encodeURIComponent(bookId)}`);
      const book = payload?.book;
      const scroll = byId("bookReaderScroll");
      if (!book || !scroll) throw new Error("Livro indisponível.");
      scroll.innerHTML = `
        <section class="book-reader-hero">
          ${book.coverImageUrl ? `<img class="book-reader-cover" src="${escapeHtml(book.coverImageUrl)}" alt="Capa de ${escapeHtml(book.title)}" />` : ""}
          <h2>${escapeHtml(book.title)}</h2>
          <p>${escapeHtml(book.authorName)} · ${escapeHtml(book.literaryStyle)} · ${Number(book.pageCount || 0)} páginas</p>
        </section>
        <section class="book-reader-pages">
          ${(Array.isArray(book.pages) ? book.pages : []).map((page) => `
            <article class="book-page">
              <span class="book-page-number">Página ${Number(page.pageNumber || 0)}</span>
              <h3>${escapeHtml(page.title)}</h3>
              <p>${escapeHtml(page.content)}</p>
            </article>
          `).join("")}
        </section>`;
      scroll.scrollTop = 0;
      setReaderOpen(true);
      if (status) status.textContent = "";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Não foi possível abrir o livro.";
    }
  }

  async function submitBook(event) {
    event.preventDefault();
    const submit = byId("bookCreateSubmit");
    const message = byId("bookCreateMessage");
    const payload = {
      title: byId("bookTitleInput")?.value || "",
      literaryStyle: state.literaryStyle,
      coverStyle: byId("bookCoverStyleSelect")?.value || "Editorial cinematográfica",
      pageCount: Number(byId("bookPageCountInput")?.value || 12),
      contextPrompt: byId("bookContextInput")?.value || ""
    };
    if (submit) submit.disabled = true;
    if (message) message.textContent = "Enviando para Luna...";
    try {
      const result = await apiFetch("/api/200/books", { method: "POST", body: JSON.stringify(payload) });
      if (event.currentTarget) event.currentTarget.reset();
      state.literaryStyle = "Romance";
      document.querySelectorAll("[data-book-style]").forEach((chip) => chip.classList.toggle("is-selected", chip.dataset.bookStyle === state.literaryStyle));
      setCreateOpen(false);
      if (byId("booksStatus")) byId("booksStatus").textContent = `“${result?.book?.title || "Livro"}” entrou na fila. Luna continuará escrevendo mesmo se você fechar.`;
      await loadLibrary({ quiet: true });
    } catch (error) {
      if (message) message.textContent = error instanceof Error ? error.message : "Não foi possível criar o livro.";
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest('[data-open-modal="booksModal"]');
    if (openButton) window.setTimeout(() => void loadLibrary(), 0);
    if (event.target.closest("#openBookCreate")) setCreateOpen(true);
    if (event.target.closest("#closeBookCreate")) setCreateOpen(false);
    if (event.target.closest("#closeBookReader")) setReaderOpen(false);
    const style = event.target.closest("[data-book-style]");
    if (style) {
      state.literaryStyle = String(style.dataset.bookStyle || "Romance");
      document.querySelectorAll("[data-book-style]").forEach((chip) => chip.classList.toggle("is-selected", chip === style));
    }
    const card = event.target.closest("[data-book-id]");
    if (card) void openBook(String(card.dataset.bookId || ""));
  });
  byId("bookCreateForm")?.addEventListener("submit", submitBook);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && byId("booksModal")?.classList.contains("active")) void loadLibrary({ quiet: true });
  });
})();
