const page = document.body.dataset.page || "";

const weekendSchedule = [
  { day: "Sábado", city: "Goiânia, GO", place: "Igreja Batista da Esperança", time: "16h00", title: "Tarde infantil com louvor, teatro e participação das famílias" },
  { day: "Sábado", city: "Brasília, DF", place: "Assembleia de Deus Vida Plena", time: "19h30", title: "Noite especial para crianças no congresso da igreja" },
  { day: "Domingo", city: "Uberlândia, MG", place: "Igreja Presbiteriana do Caminho", time: "09h30", title: "Manhã de celebração com música, ensino e acolhimento" },
  { day: "Domingo", city: "Campinas, SP", place: "Comunidade Cristã Fonte de Vida", time: "18h00", title: "Culto infantil com repertório temático e interação com a igreja" }
];

function markActiveNav() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if ((page === "home" && href === "/index.html") || href === `/${page}.html`) {
      link.classList.add("active");
    }
  });
}

async function loadHealth() {
  const dot = document.getElementById("health-dot");
  const label = document.getElementById("health-label");
  const copy = document.getElementById("health-copy");
  const pills = document.getElementById("env-pills");
  if (!dot || !label || !copy || !pills) {
    return;
  }

  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    dot.classList.toggle("online", Boolean(data.ok));
    label.textContent = data.ok ? "Plataforma online" : "Falha na plataforma";
    copy.textContent = `Modelo padrão: ${data.env.model} | Conteúdo em: ${data.env.contentBaseUrl}`;

    const items = [
      data.env.hasOpenAiKey ? "GPT ativo" : "GPT pendente",
      data.env.hasDatabaseUrl ? "Acesso ativo" : "Acesso pendente",
      `Modelo ${data.env.model}`
    ];

    pills.innerHTML = "";
    items.forEach((item) => {
      const pill = document.createElement("span");
      pill.className = "status-pill";
      pill.textContent = item;
      pills.appendChild(pill);
    });
  } catch (error) {
    label.textContent = "Servidor indisponível";
    copy.textContent = error instanceof Error ? error.message : "Erro desconhecido";
  }
}

async function loadAlbums() {
  const grid = document.getElementById("album-grid");
  const count = document.getElementById("album-count");
  if (!grid || !count) {
    return;
  }

  const response = await fetch("/api/albums");
  const data = await response.json();
  count.textContent = `${data.items.length} álbuns disponíveis`;
  grid.innerHTML = "";

  data.items.forEach((album) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img class="album-cover" src="${album.coverUrl}" alt="Capa do álbum ${album.name}">
      <div class="album-body">
        <h3>${album.name}</h3>
        <p>${album.tracks > 0 ? `${album.tracks} faixas` : "Sem faixas cadastradas"}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

function loadSchedule() {
  const grid = document.getElementById("schedule-grid");
  if (!grid) {
    return;
  }

  grid.innerHTML = "";
  weekendSchedule.forEach((item) => {
    const card = document.createElement("article");
    card.className = "schedule-card";
    card.innerHTML = `
      <p class="schedule-day">${item.day}</p>
      <h3>${item.title}</h3>
      <p>${item.place}</p>
      <p>${item.city}</p>
      <strong>${item.time}</strong>
    `;
    grid.appendChild(card);
  });
}

markActiveNav();
await Promise.all([loadHealth(), loadAlbums()]);
loadSchedule();
