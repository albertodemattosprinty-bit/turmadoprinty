(function initProject200Books() {
  const TOKEN_KEY = "turma_do_printy_token";
  const byId = (id) => document.getElementById(id);
  const state = { books: [], loading: false, pollTimer: 0, literaryStyle: "Romance", bible: null, bibleLoading: null, bibleBook: 0, bibleChapter: 0, bibleVerse: 0, activeChunk: 0 };

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
    const bibleCard = `<button class="book-card bible-book-card" type="button" data-open-bible>
      <span class="book-card-cover bible-book-cover"><span class="bible-book-cross">✦</span><span class="book-card-progress">66 livros</span></span>
      <strong>Bíblia Sagrada</strong><small>Antigo e Novo Testamento</small>
    </button>`;
    grid.innerHTML = bibleCard + state.books.map((book) => `
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

  function splitReadingParagraphs(text) {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) return [];
    const sentences = source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [source];
    const chunks = [];
    let current = "";
    const commit = () => { if (current.trim()) chunks.push(current.trim()); current = ""; };
    sentences.forEach((sentence) => {
      let remaining = sentence.trim();
      while (remaining) {
        const candidate = `${current}${current ? " " : ""}${remaining}`.trim();
        if (candidate.length <= 400) { current = candidate; if (current.length >= 150 && /[.!?]$/.test(remaining)) commit(); break; }
        if (current.length >= 150) { commit(); continue; }
        const cutCandidates = [...remaining.matchAll(/[,.;!?]/g)].map((match) => match.index + 1).filter((index) => index >= Math.max(1, 400 - current.length));
        const cutAt = cutCandidates[0] || Math.max(1, 400 - current.length);
        current = `${current}${current ? " " : ""}${remaining.slice(0, cutAt)}`.trim();
        commit();
        remaining = remaining.slice(cutAt).trim();
      }
    });
    commit();
    if (chunks.length > 1 && chunks[chunks.length - 1].length < 150) chunks[chunks.length - 2] += ` ${chunks.pop()}`;
    return chunks;
  }

  function parseBible(text) {
    const result = [];
    let currentBook = null;
    let currentChapter = null;
    String(text || "").replace(/\r/g, "").split("\n").forEach((raw) => {
      const line = raw.trim();
      const chapter = line.match(/^[»]?([^\[]+?)\s*\[(\d+)\]$/);
      if (chapter) {
        const name = chapter[1].replace(/^»/, "").trim();
        const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!currentBook || currentBook.key !== key) { currentBook = { name, key, chapters: [] }; result.push(currentBook); }
        currentChapter = { number: Number(chapter[2]), verses: [] }; currentBook.chapters.push(currentChapter); return;
      }
      const verse = line.match(/^(\d+)\s+(.+)/);
      if (verse && currentChapter) currentChapter.verses.push({ number: Number(verse[1]), text: verse[2].trim() });
    });
    return result.filter((book) => book.chapters.length);
  }

  async function loadBible() {
    if (state.bible) return state.bible;
    if (!state.bibleLoading) state.bibleLoading = fetch(`${apiOrigin()}/200/biblia-sagrada.txt`)
      .then((response) => { if (!response.ok) throw new Error("Não foi possível carregar a Bíblia."); return response.arrayBuffer(); })
      .then((buffer) => { state.bible = parseBible(new TextDecoder("iso-8859-1").decode(buffer)); return state.bible; })
      .finally(() => { state.bibleLoading = null; });
    return state.bibleLoading;
  }

  function renderSelectableReader({ title, subtitle, chunks, selected = 0, chapterLabel = "" }) {
    const scroll = byId("bookReaderScroll");
    if (!scroll) return;
    scroll.innerHTML = `<section class="book-reader-hero book-reader-compact"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></section><section class="book-reader-pages book-reader-chunks">${chapterLabel ? `<span class="book-page-number">${escapeHtml(chapterLabel)}</span>` : ""}${chunks.map((chunk, index) => `<button type="button" class="book-reading-chunk${index === selected ? " is-active" : ""}" data-reading-chunk="${index}">${escapeHtml(chunk)}</button>`).join("")}</section>`;
    setReaderOpen(true);
    window.requestAnimationFrame(() => scroll.querySelector(".is-active")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  function renderBibleReader() {
    const book = state.bible?.[state.bibleBook]; const chapter = book?.chapters?.[state.bibleChapter];
    if (!book || !chapter) return;
    const paragraphs = splitReadingParagraphs(chapter.verses.map((verse) => verse.text).join(" "));
    const verse = chapter.verses[state.bibleVerse] || chapter.verses[0];
    const selected = Math.max(0, paragraphs.findIndex((paragraph) => paragraph.includes(verse?.text || "")));
    state.activeChunk = selected;
    const selector = `<div class="bible-nav"><select id="bibleBookSelect">${state.bible.map((item, index) => `<option value="${index}">${escapeHtml(item.name)}</option>`).join("")}</select><select id="bibleChapterSelect">${book.chapters.map((item, index) => `<option value="${index}">Cap. ${item.number}</option>`).join("")}</select><select id="bibleVerseSelect">${chapter.verses.map((item, index) => `<option value="${index}">V. ${item.number}</option>`).join("")}</select></div>`;
    renderSelectableReader({ title: "Bíblia Sagrada", subtitle: `${book.name} · capítulo ${chapter.number}`, chunks: paragraphs, selected, chapterLabel: `${book.name} ${chapter.number}` });
    const scroll = byId("bookReaderScroll");
    scroll.insertAdjacentHTML("afterbegin", selector);
    byId("bibleBookSelect").value = String(state.bibleBook); byId("bibleChapterSelect").value = String(state.bibleChapter); byId("bibleVerseSelect").value = String(state.bibleVerse);
    byId("bibleBookSelect").onchange = (event) => { state.bibleBook = Number(event.target.value); state.bibleChapter = 0; state.bibleVerse = 0; renderBibleReader(); };
    byId("bibleChapterSelect").onchange = (event) => { state.bibleChapter = Number(event.target.value); state.bibleVerse = 0; renderBibleReader(); };
    byId("bibleVerseSelect").onchange = (event) => { state.bibleVerse = Number(event.target.value); renderBibleReader(); };
  }

  async function openBible() {
    const status = byId("booksStatus"); if (status) status.textContent = "Abrindo Bíblia Sagrada...";
    try { await loadBible(); renderBibleReader(); if (status) status.textContent = ""; } catch (error) { if (status) status.textContent = error.message; }
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
      const pages = (Array.isArray(book.pages) ? book.pages : []).map((page) => `
        <article class="book-page"><span class="book-page-number">Página ${Number(page.pageNumber || 0)}</span><h3>${escapeHtml(page.title)}</h3>${splitReadingParagraphs(page.content).map((chunk, index) => `<button type="button" class="book-reading-chunk${index === 0 ? " is-active" : ""}" data-reading-chunk="${index}">${escapeHtml(chunk)}</button>`).join("")}</article>`).join("");
      scroll.innerHTML = `
        <section class="book-reader-hero">
          ${book.coverImageUrl ? `<img class="book-reader-cover" src="${escapeHtml(book.coverImageUrl)}" alt="Capa de ${escapeHtml(book.title)}" />` : ""}
          <h2>${escapeHtml(book.title)}</h2>
          <p>${escapeHtml(book.authorName)} · ${escapeHtml(book.literaryStyle)} · ${Number(book.pageCount || 0)} páginas</p>
        </section>
        <section class="book-reader-pages">
          ${pages}
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
    if (event.target.closest("[data-open-bible]")) void openBible();
    const chunk = event.target.closest("[data-reading-chunk]");
    if (chunk) {
      const chunks = [...document.querySelectorAll("[data-reading-chunk]")];
      const next = Math.min(chunks.length - 1, chunks.indexOf(chunk) + 1);
      chunks.forEach((item, index) => item.classList.toggle("is-active", index === next));
      chunks[next]?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
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
