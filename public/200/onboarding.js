import { getApiUrl } from "../api.js";

const PERSONAS = [
  { key: "marin", name: "Marin", logline: "Incisivo, humano e parceiro para construir seu plano de vida.", avatar: "/200/agents/marin.svg" },
  { key: "peter", name: "Peter", logline: "Estratégico e direto para transformar intenção em progresso.", avatar: "/200/agents/peter.svg" },
  { key: "lena", name: "Lena", logline: "Acolhedora, perceptiva e firme nos compromissos importantes.", avatar: "/200/agents/lena.svg" },
  { key: "gaia", name: "Gaia", logline: "Equilíbrio, clareza e constância para cuidar da vida inteira.", avatar: "/200/agents/gaia.svg" },
  { key: "sami", name: "Sami", logline: "Energia criativa e coragem para começar mesmo nos dias difíceis.", avatar: "/200/agents/sami.svg" },
  { key: "zach", name: "Zach", logline: "Foco, disciplina e ação para projetos realmente ambiciosos.", avatar: "/200/agents/zach.svg" }
];

const ASPECTS = [
  { name: "Sono", icon: "/200/aspect-icons/sono.svg" },
  { name: "Alimentação", icon: "/200/aspect-icons/alimentacao.svg" },
  { name: "Hidratação", icon: "/200/aspect-icons/hidratacao.svg" },
  { name: "Aprendizado", icon: "/200/aspect-icons/aprendizado.svg" },
  { name: "Trabalho", icon: "/200/aspect-icons/trabalho.svg" },
  { name: "Casa", icon: "/200/aspect-icons/casa.svg" },
  { name: "Exercícios", icon: "/200/aspect-icons/exercicios.svg" },
  { name: "Social", icon: "/200/aspect-icons/social.svg" },
  { name: "Planejamento", icon: "/200/aspect-icons/planejamento.svg" },
  { name: "Higiene", icon: "/200/aspect-icons/higiene.svg" },
  { name: "Lazer", icon: "/200/aspect-icons/lazer.svg" },
  { name: "Aspecto", icon: "/200/aspect-icons/aspecto.svg" }
];

const EDUCATION = [
  {
    eyebrow: "Seu plano",
    title: "Crie um plano de ações",
    copy: "Transforme o futuro que você quer em ações pequenas, claras e possíveis de concluir."
  },
  {
    eyebrow: "Qualidade de vida",
    title: "Melhore os 12 aspectos",
    copy: "Ações melhoram a qualidade de vida.",
    aspects: ASPECTS.slice(0, 6)
  },
  {
    eyebrow: "Sua vida por inteiro",
    title: "Todos os aspectos importam",
    copy: "Continue evoluindo com equilíbrio, sem abandonar as áreas que sustentam você.",
    aspects: ASPECTS.slice(6)
  },
  {
    eyebrow: "Consistência",
    title: "Adicione tarefas diárias",
    copy: "As tarefas colocam seu plano em movimento e ajudam você a repetir o que realmente funciona."
  },
  {
    eyebrow: "Seu placar",
    title: "Cada minuto concluído vale 1 ponto",
    copy: "O iLife transforma tempo investido em um placar silencioso e justo da sua evolução."
  }
];

function safeText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bearerHeaders(token, extra) {
  return Object.assign({
    Authorization: "Bearer " + String(token || "")
  }, extra || {});
}

async function readResponse(response) {
  const payload = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    throw new Error(payload && payload.error ? payload.error : "Não foi possível continuar.");
  }
  return payload;
}

export function initializeProject200OnboardingUi(config) {
  const options = config || {};
  let root = null;
  let contentEl = null;
  let continueButton = null;
  let statusEl = null;
  let photoInput = null;
  let state = {
    active: false,
    busy: false,
    currentStep: 1,
    educationPage: 0,
    personaIndex: 0,
    selectedPersona: "",
    avatarCompleted: false,
    photoFile: null,
    photoUrl: "",
  };
  let progressFrame = 0;
  let progressStartedAt = 0;

  function getToken() {
    return typeof options.getToken === "function" ? options.getToken() : "";
  }

  function getUser() {
    return typeof options.getUser === "function" ? options.getUser() : null;
  }

  function getProfile() {
    return typeof options.getSelectedProfile === "function" ? options.getSelectedProfile() : null;
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = String(message || "");
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function setBusy(value) {
    state.busy = Boolean(value);
    if (continueButton) continueButton.disabled = state.busy;
    if (root) root.classList.toggle("is-busy", state.busy);
  }

  function ensureShell() {
    if (root) return;
    root = document.createElement("section");
    root.className = "project200-onboarding";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = [
      '<div class="project200-onboarding__aurora" aria-hidden="true"></div>',
      '<header class="project200-onboarding__header">',
      '<img src="/200/images/ilife-mindsetplan-home.png" alt="iLife MindsetPlan">',
      '<div class="project200-onboarding__steps" aria-label="Progresso">',
      '<span></span><span></span><span></span><span></span>',
      '</div>',
      '</header>',
      '<main class="project200-onboarding__content"></main>',
      '<footer class="project200-onboarding__footer">',
      '<p class="project200-onboarding__status" aria-live="polite"></p>',
      '<button class="project200-onboarding__continue" type="button">CONTINUAR</button>',
      '</footer>',
      '<input class="project200-onboarding__file" type="file" accept="image/*" aria-label="Escolher foto">',
    ].join("");
    document.body.appendChild(root);
    contentEl = root.querySelector(".project200-onboarding__content");
    continueButton = root.querySelector(".project200-onboarding__continue");
    statusEl = root.querySelector(".project200-onboarding__status");
    photoInput = root.querySelector(".project200-onboarding__file");

    continueButton.addEventListener("click", handleContinue);
    root.addEventListener("click", handleRootClick);
    photoInput.addEventListener("change", handlePhotoSelected);
  }

  function renderProgress() {
    if (!root) return;
    root.querySelectorAll(".project200-onboarding__steps span").forEach(function (dot, index) {
      dot.classList.toggle("is-active", index < state.currentStep);
    });
  }

  function renderWelcome() {
    const user = getUser();
    const firstName = safeText(String(user && user.name || "").trim().split(/\s+/)[0] || "você");
    contentEl.innerHTML = [
      '<section class="project200-onboarding__hero">',
      '<p class="project200-onboarding__eyebrow">Bem-vindo ao iLife</p>',
      '<h1>Uma vida incrível é construída <em>um minuto de cada vez.</em></h1>',
      '<p>Olá, ' + firstName + '. Vamos preparar o seu espaço para transformar intenção em uma evolução real.</p>',
      '<div class="project200-onboarding__minute"><strong>1</strong><span>minuto de ação<br>é 1 ponto conquistado</span></div>',
      '</section>'
    ].join("");
    continueButton.textContent = "COMEÇAR";
    continueButton.hidden = false;
  }

  function renderEducation() {
    const page = EDUCATION[state.educationPage] || EDUCATION[0];
    const aspects = page.aspects
      ? '<div class="project200-onboarding__aspects">' + page.aspects.map(function (aspect) {
          return '<div><img src="' + safeText(aspect.icon) + '" alt=""><span>' + safeText(aspect.name) + '</span></div>';
        }).join("") + '</div>'
      : "";
    contentEl.innerHTML = [
      '<section class="project200-onboarding__lesson">',
      '<p class="project200-onboarding__eyebrow">' + safeText(page.eyebrow) + '</p>',
      '<h1>' + safeText(page.title) + '</h1>',
      '<p>' + safeText(page.copy) + '</p>',
      aspects,
      '</section>'
    ].join("");
    continueButton.textContent = "CONTINUAR";
    continueButton.hidden = false;
  }

  function renderPersona() {
    const persona = PERSONAS[state.personaIndex] || PERSONAS[0];
    contentEl.innerHTML = [
      '<section class="project200-onboarding__persona">',
      '<p class="project200-onboarding__eyebrow">Escolha seu agente</p>',
      '<h1>Quem vai caminhar com você?</h1>',
      '<div class="project200-onboarding__persona-picker">',
      '<button type="button" data-persona-direction="-1" aria-label="Agente anterior">‹</button>',
      '<div class="project200-onboarding__persona-card">',
      '<img src="' + safeText(persona.avatar) + '" alt="Avatar de ' + safeText(persona.name) + '">',
      '<strong>' + safeText(persona.name) + '</strong>',
      '<p>' + safeText(persona.logline) + '</p>',
      '</div>',
      '<button type="button" data-persona-direction="1" aria-label="Próximo agente">›</button>',
      '</div>',
      '<div class="project200-onboarding__persona-dots">' + PERSONAS.map(function (_, index) {
        return '<span class="' + (index === state.personaIndex ? "is-active" : "") + '"></span>';
      }).join("") + '</div>',
      '</section>'
    ].join("");
    continueButton.textContent = "ESCOLHER " + persona.name.toUpperCase();
    continueButton.hidden = false;
  }

  function avatarVisualUrl() {
    return state.photoUrl || "";
  }

  function renderAvatar() {
    const url = avatarVisualUrl();
    contentEl.innerHTML = [
      '<section class="project200-onboarding__avatar">',
      '<p class="project200-onboarding__eyebrow">Seu avatar</p>',
      '<h1>Escolha sua foto</h1>',
      '<p>Use uma foto que represente você no iLife.</p>',
      '<button class="project200-onboarding__avatar-ring' + (state.busy ? " is-generating" : "") + '" type="button" data-avatar-pick style="--avatar-progress:0deg">',
      url
        ? '<img src="' + safeText(url) + '" alt="Foto escolhida">'
        : '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>Escolher foto</span>',
      '</button>',
      '<p class="project200-onboarding__avatar-hint">' + (state.avatarCompleted ? "Toque para escolher outra foto" : "A foto aparece no seu perfil assim que for escolhida") + '</p>',
      '<button class="project200-onboarding__skip" type="button" data-avatar-skip>Agora não</button>',
      '</section>'
    ].join("");
    continueButton.textContent = state.avatarCompleted ? "AVANÇAR" : "ESCOLHER FOTO";
    continueButton.hidden = false;
    continueButton.disabled = state.busy;
    if (state.busy) startProgressLoop();
  }

  function render() {
    ensureShell();
    renderProgress();
    setStatus("");
    if (state.currentStep === 1) renderWelcome();
    else if (state.currentStep === 2) renderEducation();
    else if (state.currentStep === 3) renderPersona();
    else renderAvatar();
  }

  async function patchProgress(payload) {
    const response = await fetch(getApiUrl("/api/200/onboarding"), {
      method: "PATCH",
      headers: bearerHeaders(getToken(), { "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    });
    const data = await readResponse(response);
    return data.onboarding || {};
  }

  async function handleContinue() {
    if (state.busy) return;
    setBusy(true);
    setStatus("");
    try {
      if (state.currentStep === 1) {
        state.currentStep = 2;
        state.educationPage = 0;
      } else if (state.currentStep === 2 && state.educationPage < EDUCATION.length - 1) {
        state.educationPage += 1;
      } else if (state.currentStep === 2) {
        state.currentStep = 3;
      } else if (state.currentStep === 3) {
        const persona = PERSONAS[state.personaIndex] || PERSONAS[0];
        state.selectedPersona = persona.key;
        state.currentStep = 4;
        if (typeof options.loadProfiles === "function") {
          await options.loadProfiles();
        }
      } else if (!state.avatarCompleted) {
        photoInput.click();
        return;
      } else {
        await finish();
        return;
      }
      const saved = await patchProgress({
        currentStep: state.currentStep,
        educationPage: state.educationPage,
        selectedPersona: state.selectedPersona || undefined
      });
      hydrate(saved);
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível continuar.", true);
    } finally {
      setBusy(false);
      if (state.active) render();
    }
  }

  function handleRootClick(event) {
    const directionButton = event.target.closest("[data-persona-direction]");
    if (directionButton && !state.busy) {
      const direction = Number(directionButton.dataset.personaDirection) || 1;
      state.personaIndex = (state.personaIndex + direction + PERSONAS.length) % PERSONAS.length;
      render();
      return;
    }
    if (event.target.closest("[data-avatar-pick]") && !state.busy) {
      photoInput.click();
      return;
    }
    if (event.target.closest("[data-avatar-skip]") && !state.busy) {
      finish();
    }
  }

  async function handlePhotoSelected() {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      setStatus("Escolha uma imagem válida.", true);
      return;
    }
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photoFile = file;
    state.photoUrl = URL.createObjectURL(file);
    state.avatarCompleted = false;
    render();
    await saveAvatarPhoto();
  }

  function startProgressLoop() {
    cancelAnimationFrame(progressFrame);
    progressStartedAt = performance.now();
    function tick(now) {
      if (!state.busy || !root) return;
      const ring = root.querySelector(".project200-onboarding__avatar-ring");
      if (ring) {
        const cycle = ((now - progressStartedAt) % 25000) / 25000;
        ring.style.setProperty("--avatar-progress", String(Math.round(cycle * 360)) + "deg");
      }
      progressFrame = requestAnimationFrame(tick);
    }
    progressFrame = requestAnimationFrame(tick);
  }

  function loadPhotoImage(file) {
    return new Promise(function (resolve, reject) {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(imageUrl);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(imageUrl);
        reject(new Error("Não foi possível abrir esta imagem."));
      };
      image.src = imageUrl;
    });
  }

  async function compilePhotoToWebp(file) {
    const image = await loadPhotoImage(file);
    const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width || 1));
    const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height || 1));
    const scale = Math.min(1, 800 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível preparar sua foto.");
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise(function (resolve) {
      canvas.toBlob(resolve, "image/webp", 0.88);
    });
    if (!blob) throw new Error("Seu navegador não conseguiu otimizar a foto.");
    return blob;
  }

  async function saveAvatarPhoto() {
    if (!state.photoFile || state.busy) return;
    const profile = getProfile();
    if (!profile || !profile.id) {
      setStatus("Não foi possível localizar seu perfil.", true);
      return;
    }
    setBusy(true);
    render();
    setStatus("Preparando sua foto...");
    try {
      const webpPhoto = await compilePhotoToWebp(state.photoFile);
      const response = await fetch(getApiUrl("/api/200/profiles/" + encodeURIComponent(profile.id) + "/avatar/upload"), {
        method: "POST",
        headers: bearerHeaders(getToken(), { "Content-Type": "image/webp" }),
        body: webpPhoto
      });
      const data = await readResponse(response);
      if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
      state.photoFile = webpPhoto;
      state.photoUrl = String(data.profile && (data.profile.avatarUrl || data.profile.avatarDataUrl) || "");
      state.avatarCompleted = true;
      if (typeof options.onProfileGenerated === "function") {
        options.onProfileGenerated(data.profile);
      }
      setBusy(false);
      render();
      const image = root.querySelector(".project200-onboarding__avatar-ring img");
      if (image) image.classList.add("is-revealed");
      setStatus("Sua foto está pronta.");
    } catch (error) {
      setBusy(false);
      render();
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar a foto.", true);
    }
  }

  async function finish() {
    if (state.busy) return;
    const persona = PERSONAS[state.personaIndex] || PERSONAS[0];
    const profile = getProfile();
    setBusy(true);
    setStatus("Preparando sua home...");
    try {
      await patchProgress({
        currentStep: 4,
        educationPage: EDUCATION.length - 1,
        selectedPersona: state.selectedPersona || persona.key,
        avatarCompleted: state.avatarCompleted,
        profile: profile && profile.name || "",
        complete: true
      });
      hide();
      if (typeof options.onComplete === "function") {
        await options.onComplete();
      }
    } catch (error) {
      setBusy(false);
      setStatus(error instanceof Error ? error.message : "Não foi possível concluir.", true);
    }
  }

  function hydrate(onboarding) {
    const data = onboarding || {};
    state.currentStep = Math.max(1, Math.min(4, Number(data.currentStep) || 1));
    state.educationPage = Math.max(0, Math.min(EDUCATION.length - 1, Number(data.educationPage) || 0));
    if (Object.prototype.hasOwnProperty.call(data, "selectedPersona")) {
      state.selectedPersona = String(data.selectedPersona || "");
    }
    if (Object.prototype.hasOwnProperty.call(data, "avatarCompleted")) {
      state.avatarCompleted = Boolean(data.avatarCompleted);
    }
    const personaIndex = PERSONAS.findIndex(function (persona) {
      return persona.key === state.selectedPersona;
    });
    state.personaIndex = personaIndex >= 0 ? personaIndex : 0;
  }

  async function start() {
    const response = await fetch(getApiUrl("/api/200/onboarding/start"), {
      method: "POST",
      headers: bearerHeaders(getToken())
    });
    const data = await readResponse(response);
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photoFile = null;
    state.photoUrl = "";
    if (photoInput) photoInput.value = "";
    if (typeof options.loadProfiles === "function") {
      await options.loadProfiles();
    }
    await show(data.onboarding || { required: true, currentStep: 1, educationPage: 0 });
    return data.onboarding || null;
  }

  async function show(onboarding) {
    ensureShell();
    hydrate(onboarding);
    state.active = true;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("project200-onboarding-active");
    render();
  }

  function hide() {
    state.active = false;
    state.busy = false;
    cancelAnimationFrame(progressFrame);
    if (root) {
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
    }
    document.documentElement.classList.remove("project200-onboarding-active");
  }

  return {
    start: start,
    show: show,
    hide: hide,
    isActive: function () { return state.active; }
  };
}
