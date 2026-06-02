const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const messageEl = document.getElementById("loginMessage");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = String(usernameInput?.value || "").trim();

  if (!username) {
    messageEl.textContent = "Digite o nome de acesso.";
    return;
  }

  messageEl.textContent = "Validando...";

  try {
    const response = await fetch("/api/200/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      messageEl.textContent = "Acesso negado.";
      return;
    }

    messageEl.textContent = "Acesso liberado.";
    window.location.href = "/200";
  } catch {
    messageEl.textContent = "Falha ao validar acesso.";
  }
});
