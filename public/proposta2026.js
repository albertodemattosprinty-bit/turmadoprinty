const rail = document.querySelector("#chapter-rail");
const sections = Array.from(document.querySelectorAll(".chapter"));
const navDots = Array.from(document.querySelectorAll(".nav-dot"));
const backgroundLayers = Array.from(document.querySelectorAll(".proposal-bg"));
const assetStatus = document.querySelector("#asset-status");
const missionPhoto = document.querySelector("#mission-photo");
const timelineVisual = document.querySelector("#timeline-visual");
const backstageMedia = document.querySelector("#backstage-media");
const posterGrid = document.querySelector("#poster-grid");
const modal = document.querySelector("#poster-modal");
const modalClose = document.querySelector("#modal-close");
const modalEyebrow = document.querySelector("#modal-eyebrow");
const modalTitle = document.querySelector("#modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalMedia = document.querySelector("#modal-media");
const modalDuration = document.querySelector("#modal-duration");
const modalTeam = document.querySelector("#modal-team");
const modalFocus = document.querySelector("#modal-focus");

const fallbackBackgrounds = [
  "linear-gradient(135deg, rgba(4, 14, 26, 0.3), rgba(5, 22, 44, 0.82)), radial-gradient(circle at top left, rgba(139, 212, 255, 0.22), transparent 34%), linear-gradient(135deg, #0a2d57, #123661)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.28), rgba(5, 22, 44, 0.84)), radial-gradient(circle at 80% 10%, rgba(139, 212, 255, 0.2), transparent 28%), linear-gradient(135deg, #0d2e53, #0c4677)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.36), rgba(5, 22, 44, 0.84)), radial-gradient(circle at 20% 30%, rgba(139, 212, 255, 0.15), transparent 26%), linear-gradient(135deg, #08243f, #123c66)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.32), rgba(5, 22, 44, 0.82)), radial-gradient(circle at 70% 20%, rgba(139, 212, 255, 0.2), transparent 32%), linear-gradient(135deg, #0a315f, #17385f)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.34), rgba(5, 22, 44, 0.84)), radial-gradient(circle at center, rgba(139, 212, 255, 0.16), transparent 34%), linear-gradient(135deg, #071f37, #0f4778)"
];

const timelineEntries = [
  { year: "1985", text: "Primeiros passos de uma visão voltada ao coração das crianças." },
  { year: "1995", text: "Novas peças, novas igrejas e novas formas de comunicar a verdade." },
  { year: "2005", text: "Consolidação de personagens, música e uma linguagem própria." },
  { year: "2015", text: "Histórias bíblicas ganhando novas gerações, sem perder a essência." },
  { year: "2026", text: "Uma proposta madura, ministerial e preparada para servir com excelência." }
];

const showTopics = [
  {
    id: "naama",
    title: "Fé em Deus",
    subtitle: "História de Naamã",
    description: "Uma narrativa sobre cura, humildade e fé, apresentada com personagens, humor e um convite claro a confiar em Deus.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 5 pessoas",
    focus: "Tema: fé em Deus",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #1a4474, #2a70b7)"
  },
  {
    id: "jonas",
    title: "Obediência e missões",
    subtitle: "História de Jonas",
    description: "Uma peça sobre fuga, chamado e obediência, conduzindo as crianças a entenderem que ouvir a Deus sempre vale a pena.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 4 pessoas",
    focus: "Tema: obediência e missões",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #0d3a6d, #1f83b5)"
  },
  {
    id: "samuel",
    title: "Ouvir a voz de Deus e obedecer",
    subtitle: "História de Samuel",
    description: "Um encontro sensível com a escuta espiritual, mostrando às crianças que Deus fala e chama com propósito.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 3 pessoas",
    focus: "Tema: escuta e obediência",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #19345a, #376ba5)"
  },
  {
    id: "davi",
    title: "Desafios e fé",
    subtitle: "Davi e Golias",
    description: "Uma apresentação vibrante sobre coragem, identidade e confiança em Deus diante de grandes desafios.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 3 ou 4 pessoas",
    focus: "Tema: desafios e fé",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #12385e, #4f75b0)"
  },
  {
    id: "criacao",
    title: "Amor de Deus",
    subtitle: "História da Criação",
    description: "Uma jornada poética e visual pelo cuidado de Deus na criação, comunicando beleza, origem e amor.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 5 pessoas",
    focus: "Tema: amor de Deus",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #0a3057, #3276aa)"
  },
  {
    id: "fabrica",
    title: "Fábrica de Heróis",
    subtitle: "Uma aventura para formar convicções",
    description: "Uma proposta dinâmica e marcante, pensada para falar de identidade, coragem e valores cristãos com linguagem viva.",
    duration: "Apresentação em torno de 1h15",
    team: "Equipe: 4 pessoas, podendo chegar a 6",
    focus: "Tema: formação e propósito",
    fallbackGradient: "linear-gradient(180deg, rgba(5, 18, 35, 0.08), rgba(5, 18, 35, 0.82)), linear-gradient(135deg, #162f56, #25558f)"
  }
];

let currentSectionIndex = 0;
let wheelLocked = false;
let touchStartY = 0;
let lastTouchY = 0;
let sectionTops = [];
let loadedImages = [];
let loadedVideos = [];
let heroVideoAsset = null;
let heroPosterAsset = null;
let modalVideoElement = null;
let timelineCycleIndex = 0;
let heroVideoStage = null;
let heroVideoPoster = null;
let heroVideoElement = null;
let heroVideoButton = null;
let heroBufferStatus = null;

function isDesktopAnchoredMode() {
  return window.innerWidth > 980;
}

function recalculateSectionTops() {
  sectionTops = sections.map((section) => section.offsetTop);
}

function setInlineBackground(element, asset, fallback) {
  if (!element) {
    return;
  }
  const overlay = "linear-gradient(180deg, rgba(4, 14, 26, 0.12), rgba(4, 14, 26, 0.82))";
  element.style.backgroundImage = asset?.url ? `${overlay}, url("${asset.url}")` : fallback;
}

function setActiveBackground(index) {
  backgroundLayers.forEach((layer, layerIndex) => {
    layer.classList.toggle("is-active", layerIndex === index);
  });
}

function updateSectionState(index) {
  currentSectionIndex = index;
  const activeSection = sections[index];
  if (!activeSection) {
    return;
  }

  sections.forEach((section, sectionIndex) => {
    const isVisible = sectionIndex === index;
    section.classList.toggle("is-visible", isVisible);
    section.setAttribute("aria-hidden", isVisible ? "false" : "true");
  });

  navDots.forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.goto) === index);
  });

  const backgroundIndex = Number(activeSection.dataset.bgIndex || 0);
  setActiveBackground(backgroundIndex);
}

function scrollToSection(index) {
  const nextIndex = Math.max(0, Math.min(index, sections.length - 1));
  updateSectionState(nextIndex);

  if (isDesktopAnchoredMode()) {
    rail.scrollTo({
      top: sectionTops[nextIndex] || 0,
      behavior: "smooth"
    });
  } else {
    sections[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function lockWheel() {
  wheelLocked = true;
  window.setTimeout(() => {
    wheelLocked = false;
  }, 850);
}

function handleWheel(event) {
  if (!isDesktopAnchoredMode()) {
    return;
  }
  event.preventDefault();
  if (wheelLocked) {
    return;
  }
  const direction = event.deltaY > 0 ? 1 : -1;
  if (!direction) {
    return;
  }
  lockWheel();
  scrollToSection(currentSectionIndex + direction);
}

function handleKeyDown(event) {
  if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(event.key)) {
    return;
  }
  if (event.target instanceof HTMLElement) {
    const tag = event.target.tagName;
    if (["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(tag)) {
      return;
    }
  }

  if (event.key === "Home") {
    event.preventDefault();
    scrollToSection(0);
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    scrollToSection(sections.length - 1);
    return;
  }

  const delta = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
  event.preventDefault();
  scrollToSection(currentSectionIndex + delta);
}

function handleTouchStart(event) {
  if (!isDesktopAnchoredMode()) {
    return;
  }
  touchStartY = event.touches[0]?.clientY || 0;
  lastTouchY = touchStartY;
}

function handleTouchMove(event) {
  if (!isDesktopAnchoredMode()) {
    return;
  }
  lastTouchY = event.touches[0]?.clientY || touchStartY;
}

function handleTouchEnd() {
  if (!isDesktopAnchoredMode() || wheelLocked) {
    return;
  }
  const delta = touchStartY - lastTouchY;
  if (Math.abs(delta) < 36) {
    return;
  }
  lockWheel();
  scrollToSection(currentSectionIndex + (delta > 0 ? 1 : -1));
}

function observeActiveSection() {
  const observer = new IntersectionObserver((entries) => {
    let bestEntry = null;
    for (const entry of entries) {
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
        bestEntry = entry;
      }
    }
    if (!bestEntry?.isIntersecting) {
      return;
    }
    const index = Number(bestEntry.target.dataset.sectionIndex || 0);
    updateSectionState(index);
  }, {
    root: isDesktopAnchoredMode() ? rail : null,
    threshold: [0.45, 0.65, 0.8]
  });

  sections.forEach((section) => observer.observe(section));
}

function buildHeroVideo() {
  const firstSection = sections[0];
  const heroCard = firstSection?.querySelector(".hero-stat-list");
  if (!heroCard) {
    return;
  }

  if (!heroVideoStage) {
    heroVideoStage = document.createElement("div");
    heroVideoStage.className = "video-stage";

    heroVideoPoster = document.createElement("img");
    heroVideoPoster.className = "video-poster";
    heroVideoPoster.alt = "Prévia da proposta da Turma do Printy";

    heroVideoElement = document.createElement("video");
    heroVideoElement.controls = true;
    heroVideoElement.playsInline = true;
    heroVideoElement.preload = "none";

    const overlay = document.createElement("div");
    overlay.className = "video-overlay";

    const overlayCard = document.createElement("div");
    overlayCard.className = "video-overlay-card";
    overlayCard.innerHTML = `
      <strong>Vídeo sob demanda</strong>
      <span class="buffer-status">O player só abre se o visitante quiser assistir. Ao tocar, o vídeo entra em buffer e libera os controles.</span>
    `;

    const actions = document.createElement("div");
    actions.className = "video-actions";

    heroVideoButton = document.createElement("button");
    heroVideoButton.type = "button";
    heroVideoButton.className = "button";

    const termButton = document.createElement("a");
    termButton.className = "ghost-button";
    termButton.href = "https://www.turmadoprinty.com.br/termo";
    termButton.textContent = "Ver termo";

    heroBufferStatus = overlayCard.querySelector(".buffer-status");

    heroVideoButton.addEventListener("click", async () => {
      if (!heroVideoAsset || !heroVideoElement || !heroVideoStage || !heroBufferStatus) {
        return;
      }
      heroVideoStage.classList.add("is-playing");
      heroVideoElement.src = heroVideoAsset.url;
      heroVideoElement.preload = "auto";
      heroVideoElement.load();
      heroBufferStatus.textContent = "Preparando o vídeo em buffer...";

      try {
        await heroVideoElement.play();
        heroBufferStatus.textContent = "Vídeo pronto. Use o player como quiser.";
      } catch {
        heroBufferStatus.textContent = "Vídeo carregado. Toque no player para iniciar quando quiser.";
      }
    });

    heroVideoElement.addEventListener("progress", () => {
      if (!heroVideoElement?.duration || !heroVideoElement.buffered?.length || !heroBufferStatus) {
        return;
      }
      const bufferedEnd = heroVideoElement.buffered.end(heroVideoElement.buffered.length - 1);
      const bufferedPercent = Math.min(100, Math.round((bufferedEnd / heroVideoElement.duration) * 100));
      heroBufferStatus.textContent = `Vídeo em buffer: ${bufferedPercent}%`;
    });

    heroVideoElement.addEventListener("canplay", () => {
      if (heroBufferStatus) {
        heroBufferStatus.textContent = "Vídeo pronto para assistir.";
      }
    });

    heroVideoElement.addEventListener("error", () => {
      if (heroBufferStatus) {
        heroBufferStatus.textContent = "Não foi possível carregar este vídeo agora.";
      }
    });

    actions.append(heroVideoButton, termButton);
    overlayCard.append(actions);
    overlay.append(overlayCard);
    heroVideoStage.append(heroVideoPoster, heroVideoElement, overlay);
    heroCard.prepend(heroVideoStage);
  }

  if (heroVideoPoster) {
    if (heroPosterAsset?.url) {
      heroVideoPoster.src = heroPosterAsset.url;
    } else {
      heroVideoPoster.removeAttribute("src");
      heroVideoPoster.style.backgroundImage = fallbackBackgrounds[0];
    }
  }

  if (heroVideoButton) {
    heroVideoButton.textContent = heroVideoAsset ? "Abrir player" : "Player indisponível";
    heroVideoButton.disabled = !heroVideoAsset;
  }
}

function renderPosterGrid() {
  posterGrid.innerHTML = "";

  showTopics.forEach((topic, index) => {
    const posterAsset = loadedImages[(index + 2) % Math.max(loadedImages.length, 1)] || null;
    const trailerAsset = loadedVideos[index % Math.max(loadedVideos.length, 1)] || null;
    const card = document.createElement("article");
    card.className = "poster-card";
    card.innerHTML = `
      <div class="poster-visual"></div>
      <div class="poster-copy">
        <strong>${topic.subtitle}</strong>
        <h3>${topic.title}</h3>
        <p>${topic.description}</p>
        <span class="poster-meta">${topic.team}</span>
        <button class="poster-button" type="button">Abrir detalhes</button>
      </div>
    `;

    const visual = card.querySelector(".poster-visual");
    visual.style.backgroundImage = posterAsset?.url
      ? `linear-gradient(180deg, rgba(5, 18, 35, 0.1), rgba(5, 18, 35, 0.84)), url("${posterAsset.url}")`
      : topic.fallbackGradient;

    card.querySelector(".poster-button")?.addEventListener("click", () => {
      openPosterModal(topic, posterAsset, trailerAsset);
    });

    posterGrid.append(card);
  });
}

function openPosterModal(topic, posterAsset, trailerAsset) {
  modalEyebrow.textContent = topic.subtitle;
  modalTitle.textContent = topic.title;
  modalDescription.textContent = topic.description;
  modalDuration.textContent = topic.duration;
  modalTeam.textContent = topic.team;
  modalFocus.textContent = topic.focus;
  modalMedia.innerHTML = "";
  modalMedia.style.backgroundImage = posterAsset?.url
    ? `linear-gradient(180deg, rgba(4, 14, 26, 0.12), rgba(4, 14, 26, 0.82)), url("${posterAsset.url}")`
    : topic.fallbackGradient;

  if (trailerAsset?.url) {
    modalVideoElement = document.createElement("video");
    modalVideoElement.controls = true;
    modalVideoElement.playsInline = true;
    modalVideoElement.preload = "none";
    modalVideoElement.poster = posterAsset?.url || "";
    modalVideoElement.src = trailerAsset.url;
    modalMedia.append(modalVideoElement);
  } else {
    const text = document.createElement("div");
    text.style.padding = "24px";
    text.style.display = "grid";
    text.style.alignContent = "end";
    text.style.height = "100%";
    text.innerHTML = "<p>Quando houver trailer disponível em <strong>Proposta/</strong>, ele aparecerá aqui automaticamente no player.</p>";
    modalMedia.append(text);
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePosterModal() {
  if (modalVideoElement) {
    modalVideoElement.pause();
    modalVideoElement.removeAttribute("src");
    modalVideoElement.load();
    modalVideoElement = null;
  }
  modal.hidden = true;
  document.body.style.overflow = window.innerWidth > 980 ? "hidden" : "auto";
}

function syncActiveSectionFromScroll() {
  const position = isDesktopAnchoredMode() ? rail.scrollTop : window.scrollY;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const top = isDesktopAnchoredMode() ? section.offsetTop : section.getBoundingClientRect().top + window.scrollY;
    const distance = Math.abs(top - position);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  if (bestIndex !== currentSectionIndex) {
    updateSectionState(bestIndex);
  }
}

function assignBackgroundImages() {
  const backgrounds = backgroundLayers.map((layer, index) => loadedImages[index] || null);
  backgroundLayers.forEach((layer, index) => {
    const asset = backgrounds[index];
    layer.style.backgroundImage = asset?.url
      ? `linear-gradient(135deg, rgba(4, 14, 26, 0.14), rgba(4, 14, 26, 0.3)), url("${asset.url}")`
      : fallbackBackgrounds[index];
  });

  setInlineBackground(missionPhoto, loadedImages[1] || loadedImages[0], fallbackBackgrounds[1]);
  setInlineBackground(timelineVisual, loadedImages[2] || loadedImages[0], fallbackBackgrounds[2]);
  setInlineBackground(backstageMedia, loadedImages[3] || loadedImages[0], fallbackBackgrounds[3]);
  heroPosterAsset = loadedImages[4] || loadedImages[0] || null;
}

function cycleTimelineCopy() {
  if (!timelineVisual || loadedImages.length < 2) {
    return;
  }
  window.setInterval(() => {
    timelineCycleIndex = (timelineCycleIndex + 1) % timelineEntries.length;
    const entry = timelineEntries[timelineCycleIndex];
    const image = loadedImages[(timelineCycleIndex + 1) % loadedImages.length];
    setInlineBackground(timelineVisual, image, fallbackBackgrounds[2]);
    const title = timelineVisual.querySelector("h3");
    const description = timelineVisual.querySelector("p");
    if (title) {
      title.textContent = `${entry.year}: a missão continua avançando.`;
    }
    if (description) {
      description.textContent = entry.text;
    }
  }, 4200);
}

async function loadAssets() {
  try {
    const response = await fetch("/api/proposta2026/assets", {
      headers: {
        Accept: "application/json"
      }
    });
    const payload = await response.json();
    loadedImages = Array.isArray(payload?.images) ? payload.images : [];
    loadedVideos = Array.isArray(payload?.videos) ? payload.videos : [];
    heroVideoAsset = loadedVideos[0] || null;

    assignBackgroundImages();
    buildHeroVideo();
    renderPosterGrid();
    cycleTimelineCopy();

    if (payload?.ok) {
      const imageCount = loadedImages.length;
      const videoCount = loadedVideos.length;
      assetStatus.textContent = `${imageCount} imagem(ns) e ${videoCount} vídeo(s) encontrados em Proposta/.`;
      assetStatus.classList.remove("is-warning");
    } else {
      assetStatus.textContent = "Os assets do bucket não puderam ser listados agora. A página segue pronta com visual de fallback.";
      assetStatus.classList.add("is-warning");
    }
  } catch {
    assignBackgroundImages();
    buildHeroVideo();
    renderPosterGrid();
    cycleTimelineCopy();
    assetStatus.textContent = "Não foi possível carregar os arquivos do bucket neste momento. O layout continua disponível.";
    assetStatus.classList.add("is-warning");
  }
}

function attachEventListeners() {
  rail.addEventListener("wheel", handleWheel, { passive: false });
  rail.addEventListener("scroll", syncActiveSectionFromScroll, { passive: true });
  window.addEventListener("scroll", syncActiveSectionFromScroll, { passive: true });
  window.addEventListener("keydown", handleKeyDown);
  rail.addEventListener("touchstart", handleTouchStart, { passive: true });
  rail.addEventListener("touchmove", handleTouchMove, { passive: true });
  rail.addEventListener("touchend", handleTouchEnd, { passive: true });

  document.querySelectorAll("[data-goto]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollToSection(Number(button.dataset.goto || 0));
    });
  });

  document.querySelectorAll("[data-scroll-next]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollToSection(currentSectionIndex + 1);
    });
  });

  modalClose?.addEventListener("click", closePosterModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closePosterModal();
    }
  });

  window.addEventListener("resize", () => {
    document.body.style.overflow = window.innerWidth > 980 ? "hidden" : "auto";
    recalculateSectionTops();
    scrollToSection(currentSectionIndex);
  });
}

function init() {
  document.body.style.overflow = window.innerWidth > 980 ? "hidden" : "auto";
  recalculateSectionTops();
  observeActiveSection();
  attachEventListeners();
  updateSectionState(0);
  renderPosterGrid();
  assignBackgroundImages();
  buildHeroVideo();
  loadAssets();
}

init();
