(function initProject200Books() {
  const TOKEN_KEY = "turma_do_printy_token";
  const byId = (id) => document.getElementById(id);
  const state = { books: [], loading: false, pollTimer: 0, literaryStyle: "Romance", isAdmin: false, coverEditorBook: null, bible: null, bibleLoading: null, bibleBook: 0, bibleChapter: 0, bibleVerse: 0, activeChunk: 0, reading: null, pendingBlocks: [], savingBlocks: [], readingSavePromise: null, readingBlocksSinceFeedback: 0, queuedBlockKeys: new Set(), currentChunks: [], currentContext: null, chunkStartedAt: 0, readerTouch: null, planStep: 0, planStartedAt: 0, planLetters: 0, plan: { lettersPerSecond: 14.7, durationMonths: 12, durationDays: 0, repeatDays: [0,1,2,3,4,5,6], scheduleConfig: null, scheduleLabel: "Todos os dias" } };
  const BIBLE_TOTAL_CHARACTERS = 3809122;
  const COVER_STYLES = ["Editorial cinematográfica", "Minimalista premium", "Ilustração 3D", "Aquarela artística", "Fantasia épica", "Fotográfica realista", "Vintage clássica", "Anime contemporâneo", "Infantil colorida", "Sombria e misteriosa"];

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

  function bookCoverMarkup(book, className = "book-card-cover", progress = "") {
    const image = book?.coverImageUrl ? `<img src="${escapeHtml(book.coverImageUrl)}" alt="" loading="lazy" />` : '<span class="book-cover-fallback" aria-hidden="true"></span>';
    return `<span class="${className} book-cover-composed">${image}${progress ? `<span class="book-card-progress">${escapeHtml(progress)}</span>` : ""}</span>`;
  }

  function readingWithQueuedBlocks() {
    const confirmed = state.reading || {};
    const queued = [...state.savingBlocks, ...state.pendingBlocks];
    const queuedCharacters = queued.reduce((total, block) => total + Math.max(0, Number(block?.characters || 0)), 0);
    const queuedBibleCharacters = queued.filter((block) => block?.readingType === "bible").reduce((total, block) => total + Math.max(0, Number(block?.characters || 0)), 0);
    const totalCharacters = Math.max(0, Number(confirmed.totalCharacters || 0)) + queuedCharacters;
    return { ...confirmed, totalCharacters, bibleCharacters: Math.max(0, Number(confirmed.bibleCharacters || 0)) + queuedBibleCharacters, exactPoints: totalCharacters / 50, visiblePoints: Math.floor(totalCharacters / 50) };
  }

  function renderReadingPointsSummary() {
    const summary = byId("booksReadingPointsSummary");
    const reading = readingWithQueuedBlocks();
    if (summary) summary.textContent = `Você tem ${Math.floor(Number(reading.exactPoints || 0))} pontos de leitura totais`;
  }

  function renderLibrary() {
    const grid = byId("booksGrid");
    if (!grid) return;
    renderReadingPointsSummary();
    const bibleCard = `<button class="book-card bible-book-card" type="button" data-open-bible aria-label="Bíblia Sagrada">
      <span class="book-card-cover bible-book-cover"><span class="bible-book-cross">✦</span><span class="book-card-progress">66 livros</span></span>
    </button>`;
    grid.innerHTML = bibleCard + state.books.map((book) => `
      <button class="book-card" type="button" data-book-id="${escapeHtml(book.id)}" aria-label="${escapeHtml(book.title)}, um livro de ${escapeHtml(book.authorName)}" ${book.status === "ready" ? "" : "data-book-pending=\"true\""}>
        ${bookCoverMarkup(book, "book-card-cover", statusLabel(book))}
      </button>
    `).join("") + (!state.books.length ? '<div class="books-empty">A Bíblia já está disponível. Toque em + para criar o primeiro livro com Luna.</div>' : "");
  }

  async function loadReadingProgress() {
    if (!getToken()) return null;
    try { const payload = await apiFetch("/api/200/reading"); state.reading = payload?.reading || null; renderReadingPointsSummary(); return state.reading; } catch { return null; }
  }

  async function flushReadingBlocks({ force = false } = {}) {
    if (state.readingSavePromise) return state.readingSavePromise;
    if (!getToken() || !state.pendingBlocks.length || (!force && state.pendingBlocks.length < 5)) return null;
    const blocks = state.pendingBlocks.splice(0, 5);
    state.savingBlocks = blocks;
    let persisted = false;
    const save = (async () => {
    try {
      const payload = await apiFetch("/api/200/reading/blocks", { method: "POST", body: JSON.stringify({ blocks }) });
      state.reading = payload?.reading || state.reading;
      persisted = true;
      window.dispatchEvent(new CustomEvent("project200:reading-updated"));
      return state.reading;
    } catch { state.pendingBlocks.unshift(...blocks); return null; }
    finally {
      state.savingBlocks = [];
      state.readingSavePromise = null;
      renderReadingPointsSummary();
      if (persisted && state.pendingBlocks.length >= 5) void flushReadingBlocks();
    }
    })();
    state.readingSavePromise = save;
    return save;
  }

  async function flushAllReadingBlocks() {
    while (state.pendingBlocks.length || state.savingBlocks.length) {
      const saved = await flushReadingBlocks({ force: true });
      if (!saved) return null;
    }
    return state.reading;
  }

  function showPointsUpdate(reading = readingWithQueuedBlocks()) {
    const modal = ensureBooksOverlay("readingPointsOverlay");
    renderReadingPointsSummary();
    modal.innerHTML = `<div class="reading-feedback-card"><span>PONTOS DE LEITURA</span><strong>${Math.floor(Number(reading?.exactPoints || 0))}</strong><p>${Number(reading?.totalCharacters || 0).toLocaleString("pt-BR")} letras lidas</p></div>`;
    modal.hidden = false; window.setTimeout(() => { modal.hidden = true; }, 1000);
  }

  function ensureBooksOverlay(id) {
    let overlay = byId(id); if (overlay) return overlay;
    overlay = document.createElement("section"); overlay.id = id; overlay.className = "books-fullscreen-overlay"; overlay.hidden = true; document.body.appendChild(overlay); return overlay;
  }

  function showRhythmControl(remainingMs) {
    const modal = ensureBooksOverlay("readingRhythmOverlay"); const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    modal.innerHTML = `<div class="reading-feedback-card"><span>CONTROLE DE RITMO</span><div class="reading-clock">◷</div><strong>${seconds}s</strong><p>Ajuste o ritmo da leitura...</p><div class="reading-wait-track"><i style="animation-duration:${Math.max(1, remainingMs)}ms"></i></div></div>`;
    modal.hidden = false; window.setTimeout(() => { modal.hidden = true; }, 1000);
  }

  function getReadingBlockKey(index = state.activeChunk) {
    const context = state.currentContext || {};
    return `${context.type || "book"}:${context.bookKey || "unknown"}:${context.chapterNumber || 0}:${Number(index || 0)}`;
  }

  function anchorActiveChunk({ smooth = true } = {}) {
    const scroll = byId("bookReaderScroll"); const active = scroll?.querySelector("[data-reading-chunk].is-active");
    if (!scroll || !active) return;
    const targetTop = Math.max(0, active.offsetTop - ((scroll.clientHeight - active.offsetHeight) / 2));
    scroll.scrollTo({ top: targetTop, behavior: smooth ? "smooth" : "auto" });
  }

  function selectReadingChunk(index, { scroll = true } = {}) {
    const chunks = [...document.querySelectorAll("[data-reading-chunk]")]; if (!chunks.length) return;
    const next = Math.max(0, Math.min(chunks.length - 1, index)); state.activeChunk = next;
    if (!state.queuedBlockKeys.has(getReadingBlockKey(next))) state.chunkStartedAt = Date.now();
    chunks.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === next));
    if (scroll) anchorActiveChunk({ smooth: true });
  }

  async function finishCurrentChunkAndAdvance(chunk) {
    const index = Number(chunk.dataset.readingChunk || 0);
    if (index !== state.activeChunk) { selectReadingChunk(index); return; }
    const context = state.currentContext || {};
    const key = getReadingBlockKey(index);
    if (state.queuedBlockKeys.has(key)) { selectReadingChunk(index + 1); return; }
    const characters = String(chunk.textContent || "").trim().length; const minimumMs = (characters / 25) * 1000; const elapsed = Date.now() - state.chunkStartedAt;
    if (elapsed < minimumMs) { showRhythmControl(minimumMs - elapsed); return; }
    if (!state.queuedBlockKeys.has(key)) {
      state.queuedBlockKeys.add(key);
      state.pendingBlocks.push({ key, characters, readingType: context.type || "book", bookKey: context.bookKey, chapterNumber: context.chapterNumber });
    }
    state.readingBlocksSinceFeedback += 1;
    if (state.readingBlocksSinceFeedback >= 5) {
      state.readingBlocksSinceFeedback = 0;
      showPointsUpdate();
      void flushReadingBlocks();
    }
    if (context.type === "bible" && index === state.currentChunks.length - 1) {
      const saved = await flushAllReadingBlocks();
      if (!saved) return;
      try {
        const payload = await apiFetch("/api/200/reading/bible-chapter", { method: "POST", body: JSON.stringify({ bookKey: context.bookKey, chapterNumber: context.chapterNumber, expectedBlocks: state.currentChunks.length }) });
        state.reading = payload?.reading || state.reading;
        renderBibleReader();
      } catch (error) {
        const status = byId("booksStatus"); if (status) status.textContent = error.message;
        return;
      }
    }
    selectReadingChunk(index + 1);
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
        const available = Math.max(1, 400 - current.length - (current ? 1 : 0));
        const minimumCut = Math.max(1, 150 - current.length - (current ? 1 : 0));
        const cutCandidates = [...remaining.matchAll(/[,.;!?]/g)].map((match) => match.index + 1).filter((index) => index >= minimumCut && index <= available);
        const cutAt = cutCandidates[cutCandidates.length - 1] || available;
        current = `${current}${current ? " " : ""}${remaining.slice(0, cutAt)}`.trim();
        commit();
        remaining = remaining.slice(cutAt).trim();
      }
    });
    commit();
    if (chunks.length > 1 && chunks[chunks.length - 1].length < 150) {
      const last = chunks[chunks.length - 1]; const previous = chunks[chunks.length - 2]; const combined = `${previous} ${last}`;
      if (combined.length <= 400) { chunks[chunks.length - 2] = combined; chunks.pop(); }
      else if (combined.length >= 300) {
        const lower = Math.max(150, combined.length - 400); const upper = Math.min(400, combined.length - 151);
        const boundaries = [...combined.matchAll(/[,.;!?]\s+/g)].map((match) => match.index + match[0].trimEnd().length).filter((index) => index >= lower && index <= upper);
        const splitAt = boundaries[boundaries.length - 1] || upper;
        chunks[chunks.length - 2] = combined.slice(0, splitAt).trim(); chunks[chunks.length - 1] = combined.slice(splitAt).trim();
      }
    }
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

  function renderSelectableReader({ title, subtitle, chunks, selected = 0, chapterLabel = "", context = null }) {
    const scroll = byId("bookReaderScroll");
    if (!scroll) return;
    scroll.innerHTML = `<section class="book-reader-hero book-reader-compact"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p><small class="book-reader-gesture-hint">Deslize para cima ou para baixo para trocar de trecho</small></section><section class="book-reader-pages book-reader-chunks">${chapterLabel ? `<span class="book-page-number">${escapeHtml(chapterLabel)}</span>` : ""}${chunks.map((chunk, index) => `<button type="button" class="book-reading-chunk${index === selected ? " is-active" : ""}" data-reading-chunk="${index}">${escapeHtml(chunk)}</button>`).join("")}</section>`;
    state.currentChunks = chunks; state.currentContext = context; state.activeChunk = selected; state.chunkStartedAt = Date.now();
    setReaderOpen(true);
    window.requestAnimationFrame(() => anchorActiveChunk({ smooth: false }));
  }

  function renderBibleReader() {
    const book = state.bible?.[state.bibleBook]; const chapter = book?.chapters?.[state.bibleChapter];
    if (!book || !chapter) return;
    const paragraphs = splitReadingParagraphs(chapter.verses.map((verse) => verse.text).join(" "));
    const verseOffset = chapter.verses.slice(0, state.bibleVerse).reduce((sum, verse) => sum + verse.text.length + 1, 0);
    let coveredCharacters = 0;
    const selected = Math.max(0, paragraphs.findIndex((paragraph) => { const includesOffset = verseOffset < coveredCharacters + paragraph.length + 1; coveredCharacters += paragraph.length + 1; return includesOffset; }));
    state.activeChunk = selected;
    const completed = new Set(state.reading?.completedBibleChapters || []);
    const selector = `<div class="bible-nav"><select id="bibleBookSelect">${state.bible.map((item, index) => `<option value="${index}" ${item.chapters.every((part) => completed.has(`${item.key}:${part.number}`)) ? "class=\"is-complete\"" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select><select id="bibleChapterSelect">${book.chapters.map((item, index) => `<option value="${index}" ${completed.has(`${book.key}:${item.number}`) ? "class=\"is-complete\"" : ""}>Cap. ${item.number}</option>`).join("")}</select><select id="bibleVerseSelect">${chapter.verses.map((item, index) => `<option value="${index}">V. ${item.number}</option>`).join("")}</select></div>`;
    const percent = Math.min(100, Number(state.reading?.bibleCharacters || 0) * 100 / BIBLE_TOTAL_CHARACTERS);
    renderSelectableReader({ title: `${book.name} | Capítulo ${chapter.number}`, subtitle: `${percent.toFixed(2)}% completo`, chunks: paragraphs, selected, chapterLabel: `${book.name} ${chapter.number}`, context: { type: "bible", bookKey: book.key, chapterNumber: chapter.number } });
    const scroll = byId("bookReaderScroll");
    scroll.insertAdjacentHTML("afterbegin", selector);
    byId("bibleBookSelect").value = String(state.bibleBook); byId("bibleChapterSelect").value = String(state.bibleChapter); byId("bibleVerseSelect").value = String(state.bibleVerse);
    byId("bibleBookSelect").classList.toggle("is-complete", book.chapters.every((part) => completed.has(`${book.key}:${part.number}`)));
    byId("bibleChapterSelect").classList.toggle("is-complete", completed.has(`${book.key}:${chapter.number}`));
    byId("bibleBookSelect").onchange = (event) => { state.bibleBook = Number(event.target.value); state.bibleChapter = 0; state.bibleVerse = 0; renderBibleReader(); };
    byId("bibleChapterSelect").onchange = (event) => { state.bibleChapter = Number(event.target.value); state.bibleVerse = 0; renderBibleReader(); };
    byId("bibleVerseSelect").onchange = (event) => { state.bibleVerse = Number(event.target.value); renderBibleReader(); };
  }

  async function enterBibleReader() {
    const status = byId("booksStatus"); if (status) status.textContent = "Abrindo Bíblia Sagrada...";
    try { await Promise.all([loadBible(), loadReadingProgress()]); renderBibleReader(); if (status) status.textContent = ""; } catch (error) { if (status) status.textContent = error.message; }
  }

  function ensureBooksWorkspaceOpen() {
    const booksModal = byId("booksModal");
    if (booksModal?.classList.contains("active")) return;
    const opener = document.querySelector('[data-open-modal="booksModal"]');
    if (opener) opener.click();
    else if (booksModal) { booksModal.classList.add("active"); booksModal.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open"); void loadLibrary({ quiet: true }); void loadReadingProgress(); }
  }

  function openBible() {
    ensureBooksWorkspaceOpen();
    const modal = ensureBooksOverlay("bibleWelcomeOverlay");
    modal.innerHTML = `<div class="bible-welcome-card"><span>BÍBLIA SAGRADA</span><h2>Continue sua leitura</h2><p>Leia no seu ritmo, acompanhe capítulos e transforme letras em progresso.</p><button type="button" data-bible-read>Iniciar leitura</button><button type="button" class="is-secondary" data-bible-plan>Plano de leitura</button><button type="button" class="is-ghost" data-bible-close>Agora não</button></div>`;
    modal.hidden = false;
  }

  const planSample = "No princípio criou Deus os céus e a terra. A terra era sem forma e vazia; havia trevas sobre a face do abismo, mas o Espírito de Deus pairava sobre as águas. Então Deus disse: haja luz. E houve luz. Deus viu que a luz era boa e separou a luz das trevas.";
  const planDurations = [{ days: 7, label: "7 dias" }, { days: 15, label: "15 dias" }, ...Array.from({ length: 36 }, (_, index) => ({ months: index + 1, label: index < 11 ? `${index + 1} ${index ? "meses" : "mês"}` : `${Math.floor((index + 1) / 12)} ano${index + 1 >= 24 ? "s" : ""}${(index + 1) % 12 ? ` e ${(index + 1) % 12} mês${(index + 1) % 12 > 1 ? "es" : ""}` : ""}` }))];
  function defaultBibleSchedule() {
    const today = new Date(); const startsOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return { frequency: "daily", interval: 1, intervalUnit: "day", weekDays: [0,1,2,3,4,5,6], avoidDays: [], monthlyMode: "weekday", monthDay: today.getDate(), monthlyOrdinalIndex: 0, monthlyWeekdayIndex: today.getDay(), startsOn, endMode: "never", endsOn: "", count: 10, notification: { mode: "at_time", customAmount: 10, customUnit: "minutes" } };
  }
  function repeatDaysFromSchedule(config) {
    const cfg = config || {};
    if (cfg.frequency === "none") return [];
    if (cfg.intervalUnit === "week") return [...new Set(Array.isArray(cfg.weekDays) ? cfg.weekDays : [])].filter((day) => day >= 0 && day <= 6).sort();
    if (cfg.intervalUnit === "day") {
      const avoided = new Set(cfg.frequency === "periodic" && Array.isArray(cfg.avoidDays) ? cfg.avoidDays : []);
      return [0,1,2,3,4,5,6].filter((day) => !avoided.has(day));
    }
    return [Math.max(0, Math.min(6, Number(cfg.monthlyWeekdayIndex ?? new Date().getDay())))];
  }
  function hydrateBiblePlan() {
    const saved = state.reading?.biblePlan;
    if (!saved) return;
    state.plan = { ...state.plan, ...saved, repeatDays: Array.isArray(saved.repeatDays) ? saved.repeatDays : state.plan.repeatDays, scheduleConfig: saved.scheduleConfig || state.plan.scheduleConfig };
    const durationIndex = planDurations.findIndex((item) => Number(item.days || 0) === Number(saved.durationDays || 0) && Number(item.months || 0) === Number(saved.durationMonths || 0));
    if (durationIndex >= 0) state.plan.durationIndex = durationIndex;
    const modalApi = window.project200DailyRepetitionModal;
    if (state.plan.scheduleConfig && typeof modalApi?.label === "function") state.plan.scheduleLabel = modalApi.label(state.plan.scheduleConfig, { fallback: "Definir repetição", maxLength: 34 });
  }
  function openBiblePlan(step = 1) {
    state.planStep = step; const modal = ensureBooksOverlay("biblePlanOverlay"); modal.hidden = false;
    if (step === 1) modal.innerHTML = `<div class="bible-plan-card"><span>1 DE 4 · TEMPO DE LEITURA</span><h2>Vamos definir seu tempo de leitura</h2><p>Toque e leia o trecho no seu ritmo natural.</p><button data-plan-read>Ler texto</button><button class="is-ghost" data-plan-close>Cancelar</button></div>`;
    if (step === 2) { modal.innerHTML = `<div class="bible-plan-card plan-reading"><span>O texto vai aparecer na tela<br>Leia no seu ritmo natural</span><strong id="planCountdown">Começa em 5...</strong><p id="planSample" hidden>${escapeHtml(planSample)}</p><button id="planFinish" hidden data-plan-finish>Finalizar leitura</button></div>`; let count = 5; const timer = window.setInterval(() => { count -= 1; const label = byId("planCountdown"); if (count > 0 && label) label.textContent = `Começa em ${count}...`; else { window.clearInterval(timer); if (label) label.hidden = true; byId("planSample").hidden = false; byId("planFinish").hidden = false; state.planStartedAt = Date.now(); } }, 1000); }
    if (step === 3) modal.innerHTML = `<div class="bible-plan-card"><span>2 DE 4 · SEU RITMO</span><h2>${state.plan.lettersPerSecond.toFixed(1)} letras por segundo</h2><p>Usaremos esse ritmo para calcular sua leitura diária.</p><button data-plan-next>Continuar</button></div>`;
    if (step === 4) renderBiblePlanDuration(modal);
    if (step === 5) renderBiblePlanSchedule(modal);
  }
  function calculateBibleDailyMinutes() {
    const duration = planDurations[Math.max(0, Number(state.plan.durationIndex ?? 13))];
    const days = duration.days || duration.months * 30;
    const activeDays = Math.max(1, state.plan.repeatDays.length);
    return Math.max(1, Math.ceil(BIBLE_TOTAL_CHARACTERS / Math.max(1, state.plan.lettersPerSecond) / ((days / 7) * activeDays) / 60));
  }
  function renderBiblePlanDuration(modal = byId("biblePlanOverlay")) {
    const index = Math.max(0, Number(state.plan.durationIndex ?? 13)); state.plan.durationIndex = index; const duration = planDurations[index];
    const dailyMinutes = calculateBibleDailyMinutes(); state.plan.dailyMinutes = dailyMinutes;
    const time = dailyMinutes >= 60 ? `${Math.floor(dailyMinutes / 60)}h ${dailyMinutes % 60}min` : `${dailyMinutes} minutos`;
    modal.innerHTML = `<div class="bible-plan-card"><span>3 DE 4 · PRAZO</span><h2>Quer ler em quanto tempo?</h2><div class="plan-duration"><button data-plan-prev>‹</button><strong>${duration.label}</strong><button data-plan-next-duration>›</button></div><div class="plan-daily"><small>Você vai ler</small><strong>${time}</strong><small>Por dia</small></div><button data-plan-schedule>Continuar</button></div>`;
  }
  function renderBiblePlanSchedule(modal = byId("biblePlanOverlay")) {
    const modalApi = window.project200DailyRepetitionModal;
    const label = typeof modalApi?.label === "function" ? modalApi.label(state.plan.scheduleConfig || defaultBibleSchedule(), { fallback: "Definir repetição", maxLength: 34 }) : (state.plan.scheduleLabel || "Todos os dias");
    state.plan.scheduleLabel = label;
    modal.innerHTML = `<div class="bible-plan-card"><span>4 DE 4 · REPETIÇÃO</span><h2>Quando você quer ler?</h2><button type="button" class="plan-repeat-choice" data-plan-open-repetition><span><small>Repetição</small><strong>${escapeHtml(label)}</strong></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Zm12-13 3.5 3.5 1.2-1.2a1.4 1.4 0 0 0 0-2l-.5-.5a1.4 1.4 0 0 0-2 0L16 3.5Z" fill="currentColor"/></svg></button><p class="plan-save-status" id="biblePlanStatus"></p><button data-plan-save>Criar plano de leitura</button></div>`;
  }
  async function saveBiblePlan() {
    const status = byId("biblePlanStatus"); const button = byId("biblePlanOverlay")?.querySelector("[data-plan-save]");
    if (!state.plan.repeatDays.length) { if (status) status.textContent = "Escolha pelo menos um dia de leitura."; return; }
    if (button) button.disabled = true; if (status) status.textContent = "Criando sua missão de leitura...";
    state.plan.dailyMinutes = calculateBibleDailyMinutes();
    const duration = planDurations[state.plan.durationIndex]; const modalApi = window.project200DailyRepetitionModal; const payload = { profile: typeof modalApi?.getProfileName === "function" ? modalApi.getProfileName() : "Usuario", lettersPerSecond: state.plan.lettersPerSecond, durationDays: duration.days || 0, durationMonths: duration.months || 0, dailyMinutes: state.plan.dailyMinutes, repeatDays: state.plan.repeatDays, scheduleConfig: state.plan.scheduleConfig || defaultBibleSchedule() };
    try {
      const result = await apiFetch("/api/200/reading/bible-plan", { method: "PUT", body: JSON.stringify(payload) }); state.reading = result?.reading || state.reading; window.dispatchEvent(new CustomEvent("project200:reading-updated")); byId("biblePlanOverlay").hidden = true; byId("bibleWelcomeOverlay").hidden = true; void enterBibleReader();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Não foi possível criar o plano.";
      if (button) button.disabled = false;
    }
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
      state.isAdmin = Boolean(payload?.isAdmin);
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
      let bookChunkIndex = 0;
      const pages = (Array.isArray(book.pages) ? book.pages : []).map((page) => `
        <article class="book-page"><span class="book-page-number">Página ${Number(page.pageNumber || 0)}</span><h3>${escapeHtml(page.title)}</h3>${splitReadingParagraphs(page.content).map((chunk) => { const index = bookChunkIndex++; return `<button type="button" class="book-reading-chunk${index === 0 ? " is-active" : ""}" data-reading-chunk="${index}">${escapeHtml(chunk)}</button>`; }).join("")}</article>`).join("");
      scroll.innerHTML = `
        <section class="book-reader-hero">
          ${bookCoverMarkup(book, "book-reader-cover")}
        </section>
        <section class="book-reader-pages">
          ${pages}
        </section>`;
      scroll.scrollTop = 0;
      state.currentChunks = [...scroll.querySelectorAll("[data-reading-chunk]")].map((item) => item.textContent || "");
      state.currentContext = { type: "book", bookKey: book.id, chapterNumber: 0 };
      state.activeChunk = 0; state.chunkStartedAt = Date.now();
      setReaderOpen(true);
      window.requestAnimationFrame(() => anchorActiveChunk({ smooth: false }));
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

  function openCoverEditor(book) {
    if (!state.isAdmin || !book) return;
    state.coverEditorBook = book;
    const modal = ensureBooksOverlay("bookCoverEditorOverlay");
    modal.innerHTML = `<form class="book-cover-editor" id="bookCoverRegenerateForm"><span>CAPA DO LIVRO</span><h2>${escapeHtml(book.title)}</h2><p>A IA vai desenhar o título e “Um livro de ${escapeHtml(book.authorName)}” diretamente na nova imagem.</p><label><small>Estilo da capa</small><select id="bookCoverRegenerateStyle">${COVER_STYLES.map((style) => `<option ${style === book.coverStyle ? "selected" : ""}>${escapeHtml(style)}</option>`).join("")}</select></label><label><small>Prompt adicional</small><textarea id="bookCoverRegeneratePrompt" maxlength="1800" placeholder="Ex.: uma cena noturna com contraste dourado, sem pessoas..."></textarea></label><p class="book-cover-editor-status" id="bookCoverEditorStatus"></p><button type="submit" class="is-primary" id="bookCoverRegenerateSubmit">Gerar nova capa</button><button type="button" class="is-ghost" data-cover-editor-close>Cancelar</button></form>`;
    modal.hidden = false;
  }

  async function regenerateCover(event) {
    event.preventDefault();
    const book = state.coverEditorBook; if (!state.isAdmin || !book) return;
    const submit = byId("bookCoverRegenerateSubmit"); const status = byId("bookCoverEditorStatus");
    if (submit) submit.disabled = true;
    if (status) status.textContent = "Gerando a nova arte da capa...";
    try {
      const payload = await apiFetch(`/api/200/books/${encodeURIComponent(book.id)}/cover`, { method: "POST", body: JSON.stringify({ coverStyle: byId("bookCoverRegenerateStyle")?.value || book.coverStyle, coverPrompt: byId("bookCoverRegeneratePrompt")?.value || "" }) });
      const updated = payload?.book;
      if (updated) state.books = state.books.map((item) => item.id === updated.id ? { ...item, ...updated, authorName: item.authorName } : item);
      renderLibrary();
      byId("bookCoverEditorOverlay").hidden = true;
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Não foi possível gerar a nova capa.";
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest('[data-open-modal="booksModal"]');
    if (openButton) window.setTimeout(() => { void loadLibrary(); void loadReadingProgress(); }, 0);
    if (event.target.closest("#openBookCreate")) setCreateOpen(true);
    if (event.target.closest("#closeBookCreate")) setCreateOpen(false);
    if (event.target.closest("#closeBookReader")) { void flushReadingBlocks({ force: true }); setReaderOpen(false); }
    if (event.target.closest("[data-open-bible]")) openBible();
    if (event.target.closest("[data-bible-close]")) byId("bibleWelcomeOverlay").hidden = true;
    if (event.target.closest("[data-bible-read]")) { byId("bibleWelcomeOverlay").hidden = true; void enterBibleReader(); }
    if (event.target.closest("[data-bible-plan]")) void loadReadingProgress().then(() => { byId("bibleWelcomeOverlay").hidden = true; hydrateBiblePlan(); openBiblePlan(1); });
    if (event.target.closest("[data-plan-close]")) byId("biblePlanOverlay").hidden = true;
    if (event.target.closest("[data-plan-read]")) openBiblePlan(2);
    if (event.target.closest("[data-plan-finish]")) { state.plan.lettersPerSecond = planSample.length / Math.max(1, (Date.now() - state.planStartedAt) / 1000); openBiblePlan(3); }
    if (event.target.closest("[data-plan-next]")) openBiblePlan(4);
    if (event.target.closest("[data-plan-prev]")) { state.plan.durationIndex = Math.max(0, state.plan.durationIndex - 1); renderBiblePlanDuration(); }
    if (event.target.closest("[data-plan-next-duration]")) { state.plan.durationIndex = Math.min(planDurations.length - 1, state.plan.durationIndex + 1); renderBiblePlanDuration(); }
    if (event.target.closest("[data-plan-schedule]")) openBiblePlan(5);
    if (event.target.closest("[data-plan-open-repetition]")) {
      const modalApi = window.project200DailyRepetitionModal;
      if (typeof modalApi?.open === "function") modalApi.open("bible-plan", (config) => {
        state.plan.scheduleConfig = config;
        state.plan.repeatDays = repeatDaysFromSchedule(config);
        state.plan.scheduleLabel = typeof modalApi.label === "function" ? modalApi.label(config, { fallback: "Definir repetição", maxLength: 34 }) : "Personalizado";
        renderBiblePlanSchedule();
      }, state.plan.scheduleConfig || defaultBibleSchedule());
    }
    const planDay = event.target.closest("[data-plan-day]");
    if (planDay) { const day = Number(planDay.dataset.planDay); state.plan.repeatDays = state.plan.repeatDays.includes(day) ? state.plan.repeatDays.filter((item) => item !== day) : [...state.plan.repeatDays, day].sort(); if (!state.plan.repeatDays.length) state.plan.repeatDays = [day]; renderBiblePlanSchedule(); }
    if (event.target.closest("[data-plan-save]")) void saveBiblePlan();
    if (event.target.closest("[data-cover-editor-close]")) byId("bookCoverEditorOverlay").hidden = true;
    if (event.target.closest("[data-reading-chunk]")) return;
    const style = event.target.closest("[data-book-style]");
    if (style) {
      state.literaryStyle = String(style.dataset.bookStyle || "Romance");
      document.querySelectorAll("[data-book-style]").forEach((chip) => chip.classList.toggle("is-selected", chip === style));
    }
    const card = event.target.closest("[data-book-id]");
    if (card) void openBook(String(card.dataset.bookId || ""));
  });
  byId("bookCreateForm")?.addEventListener("submit", submitBook);
  document.addEventListener("submit", (event) => {
    if (event.target?.id === "bookCoverRegenerateForm") void regenerateCover(event);
  });
  document.addEventListener("contextmenu", (event) => {
    const card = event.target.closest("[data-book-id]");
    if (!state.isAdmin || !card) return;
    const book = state.books.find((item) => item.id === String(card.dataset.bookId || ""));
    if (!book) return;
    event.preventDefault();
    openCoverEditor(book);
  });
  const readerScroll = byId("bookReaderScroll");
  function navigateReader(direction) {
    const chunks = [...document.querySelectorAll("[data-reading-chunk]")];
    if (!chunks.length) return;
    if (direction < 0) { selectReadingChunk(state.activeChunk - 1); return; }
    const active = chunks[state.activeChunk];
    if (active) void finishCurrentChunkAndAdvance(active);
  }
  readerScroll?.addEventListener("wheel", (event) => {
    if (!byId("bookReaderLayer")?.hidden) event.preventDefault();
  }, { passive: false });
  readerScroll?.addEventListener("touchstart", (event) => {
    if (event.target.closest(".bible-nav")) { state.readerTouch = null; return; }
    const touch = event.changedTouches?.[0];
    state.readerTouch = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });
  readerScroll?.addEventListener("touchmove", (event) => {
    if (state.readerTouch) event.preventDefault();
  }, { passive: false });
  readerScroll?.addEventListener("touchend", (event) => {
    const start = state.readerTouch; state.readerTouch = null;
    const touch = event.changedTouches?.[0];
    if (!start || !touch) return;
    const vertical = touch.clientY - start.y; const horizontal = touch.clientX - start.x;
    if (Math.abs(vertical) < 36 || Math.abs(vertical) < Math.abs(horizontal)) return;
    navigateReader(vertical < 0 ? 1 : -1);
  }, { passive: true });
  readerScroll?.addEventListener("touchcancel", () => { state.readerTouch = null; }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || byId("bookReaderLayer")?.hidden) return;
    if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    navigateReader(event.key === "ArrowDown" ? 1 : -1);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void flushReadingBlocks({ force: true });
    if (!document.hidden && byId("booksModal")?.classList.contains("active")) void loadLibrary({ quiet: true });
  });
  window.Project200Books = { openBible };
})();
