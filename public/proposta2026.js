const rail = document.querySelector("#chapter-rail");
const sections = Array.from(document.querySelectorAll(".chapter"));
const navDots = Array.from(document.querySelectorAll(".nav-dot"));
const backgroundLayers = Array.from(document.querySelectorAll(".proposal-bg"));
const assetStatus = document.querySelector("#asset-status");
const missionPhoto = document.querySelector("#mission-photo");
const backstageMedia = document.querySelector("#backstage-media");
const heroVideoShell = document.querySelector("#hero-video-shell");

const fallbackBackgrounds = [
  "linear-gradient(135deg, rgba(4, 14, 26, 0.3), rgba(5, 22, 44, 0.82)), radial-gradient(circle at top left, rgba(139, 212, 255, 0.22), transparent 34%), linear-gradient(135deg, #0a2d57, #123661)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.28), rgba(5, 22, 44, 0.84)), radial-gradient(circle at 80% 10%, rgba(139, 212, 255, 0.2), transparent 28%), linear-gradient(135deg, #0d2e53, #0c4677)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.36), rgba(5, 22, 44, 0.84)), radial-gradient(circle at 20% 30%, rgba(139, 212, 255, 0.15), transparent 26%), linear-gradient(135deg, #08243f, #123c66)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.32), rgba(5, 22, 44, 0.82)), radial-gradient(circle at 70% 20%, rgba(139, 212, 255, 0.2), transparent 32%), linear-gradient(135deg, #0a315f, #17385f)",
  "linear-gradient(135deg, rgba(4, 14, 26, 0.34), rgba(5, 22, 44, 0.84)), radial-gradient(circle at center, rgba(139, 212, 255, 0.16), transparent 34%), linear-gradient(135deg, #071f37, #0f4778)"
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
let heroVideoStage = null;
let heroVideoPoster = null;
let heroVideoElement = null;
let heroVideoButton = null;
let heroBufferStatus = null;

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

  setActiveBackground(Number(activeSection.dataset.bgIndex || 0));
}

function scrollToSection(index) {
  const nextIndex = Math.max(0, Math.min(index, sections.length - 1));
  updateSectionState(nextIndex);
  rail.scrollTo({
    top: sectionTops[nextIndex] || 0,
    behavior: "smooth"
  });
}

function lockWheel() {
  wheelLocked = true;
  window.setTimeout(() => {
    wheelLocked = false;
  }, 850);
}

function handleWheel(event) {
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

  event.preventDefault();
  const delta = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
  scrollToSection(currentSectionIndex + delta);
}

function handleTouchStart(event) {
  touchStartY = event.touches[0]?.clientY || 0;
  lastTouchY = touchStartY;
}

function handleTouchMove(event) {
  event.preventDefault();
  lastTouchY = event.touches[0]?.clientY || touchStartY;
}

function handleTouchEnd() {
  if (wheelLocked) {
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
    updateSectionState(Number(bestEntry.target.dataset.sectionIndex || 0));
  }, {
    root: rail,
    threshold: [0.45, 0.65, 0.8]
  });

  sections.forEach((section) => observer.observe(section));
}

function buildHeroVideo() {
  if (!heroVideoShell) {
    return;
  }

  if (!heroVideoStage) {
    heroVideoStage = document.createElement("div");
    heroVideoStage.className = "video-stage";

    heroVideoPoster = document.createElement("img");
    heroVideoPoster.className = "video-poster";
    heroVideoPoster.alt = "Previa da proposta da Turma do Printy";

    heroVideoElement = document.createElement("video");
    heroVideoElement.controls = true;
    heroVideoElement.playsInline = true;
    heroVideoElement.preload = "none";

    const overlay = document.createElement("div");
    overlay.className = "video-overlay";

    const overlayCard = document.createElement("div");
    overlayCard.className = "video-overlay-card";
    overlayCard.innerHTML = `
      <strong>Video sob demanda</strong>
      <span class="buffer-status">O player so abre se o visitante quiser assistir. A thumb inicial fica sempre visivel no tamanho final de exibicao.</span>
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
      heroBufferStatus.textContent = "Preparando o video em buffer...";

      try {
        await heroVideoElement.play();
        heroBufferStatus.textContent = "Video pronto. Use o player como quiser.";
      } catch {
        heroBufferStatus.textContent = "Video carregado. Toque no player para iniciar quando quiser.";
      }
    });

    heroVideoElement.addEventListener("progress", () => {
      if (!heroVideoElement?.duration || !heroVideoElement.buffered?.length || !heroBufferStatus) {
        return;
      }
      const bufferedEnd = heroVideoElement.buffered.end(heroVideoElement.buffered.length - 1);
      const bufferedPercent = Math.min(100, Math.round((bufferedEnd / heroVideoElement.duration) * 100));
      heroBufferStatus.textContent = `Video em buffer: ${bufferedPercent}%`;
    });

    heroVideoElement.addEventListener("canplay", () => {
      if (heroBufferStatus) {
        heroBufferStatus.textContent = "Video pronto para assistir.";
      }
    });

    heroVideoElement.addEventListener("error", () => {
      if (heroBufferStatus) {
        heroBufferStatus.textContent = "Nao foi possivel carregar este video agora.";
      }
    });

    actions.append(heroVideoButton, termButton);
    overlayCard.append(actions);
    overlay.append(overlayCard);
    heroVideoStage.append(heroVideoPoster, heroVideoElement, overlay);
    heroVideoShell.append(heroVideoStage);
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
    heroVideoButton.textContent = heroVideoAsset ? "Abrir player" : "Player indisponivel";
    heroVideoButton.disabled = !heroVideoAsset;
  }
}

function assignBackgroundImages() {
  backgroundLayers.forEach((layer, index) => {
    const asset = loadedImages[index] || null;
    layer.style.backgroundImage = asset?.url
      ? `linear-gradient(135deg, rgba(4, 14, 26, 0.14), rgba(4, 14, 26, 0.3)), url("${asset.url}")`
      : fallbackBackgrounds[index];
  });

  setInlineBackground(missionPhoto, loadedImages[1] || loadedImages[0], fallbackBackgrounds[1]);
  setInlineBackground(backstageMedia, loadedImages[3] || loadedImages[0], fallbackBackgrounds[3]);
  heroPosterAsset = loadedImages[4] || loadedImages[0] || null;
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

    if (payload?.ok) {
      assetStatus.textContent = `${loadedImages.length} imagem(ns) e ${loadedVideos.length} video(s) encontrados em Proposta/.`;
      assetStatus.classList.remove("is-warning");
    } else {
      assetStatus.textContent = "Os assets do bucket nao puderam ser listados agora. A pagina segue pronta com visual de fallback.";
      assetStatus.classList.add("is-warning");
    }
  } catch {
    assignBackgroundImages();
    buildHeroVideo();
    assetStatus.textContent = "Nao foi possivel carregar os arquivos do bucket neste momento. O layout continua disponivel.";
    assetStatus.classList.add("is-warning");
  }
}

function attachEventListeners() {
  rail.addEventListener("wheel", handleWheel, { passive: false });
  rail.addEventListener("touchstart", handleTouchStart, { passive: true });
  rail.addEventListener("touchmove", handleTouchMove, { passive: false });
  rail.addEventListener("touchend", handleTouchEnd, { passive: true });
  window.addEventListener("keydown", handleKeyDown);

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

  window.addEventListener("resize", () => {
    recalculateSectionTops();
    scrollToSection(currentSectionIndex);
  });
}

function init() {
  recalculateSectionTops();
  observeActiveSection();
  attachEventListeners();
  updateSectionState(0);
  assignBackgroundImages();
  buildHeroVideo();
  loadAssets();
}

init();
