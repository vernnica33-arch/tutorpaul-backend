(() => {
  "use strict";

  const feed = document.getElementById("feed");
  const form = document.getElementById("composerForm");
  const input = document.getElementById("composerInput");
  const typing = document.getElementById("typing");
  const msgTemplate = document.getElementById("msgTemplate");

  const themeBtn = document.getElementById("themeBtn");
  const iconSun = document.getElementById("iconSun");
  const iconMoon = document.getElementById("iconMoon");

  const creditsBtn = document.getElementById("creditsBtn");
  const creditsModal = document.getElementById("creditsModal");
  const challengeBtn = document.getElementById("challengeBtn");

  const ENDPOINT = "https://tutorpaul-backend.onrender.com/api/chat";

  // Historial en memoria para dar contexto al modelo (rol 'user' | 'model').
  let history = [];

  /* ---------------- Tema claro / oscuro ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    iconSun.style.display = theme === "dark" ? "none" : "block";
    iconMoon.style.display = theme === "dark" ? "block" : "none";
    try { localStorage.setItem("tutorpaul-theme", theme); } catch (e) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("tutorpaul-theme"); } catch (e) {}
    if (saved === "light" || saved === "dark") return applyTheme(saved);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  initTheme();

  /* ---------------- Modal de créditos ---------------- */
  function openCredits() { creditsModal.hidden = false; }
  function closeCredits() { creditsModal.hidden = true; }
  creditsBtn.addEventListener("click", openCredits);
  creditsModal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeCredits();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !creditsModal.hidden) closeCredits();
  });

  /* ---------------- Render de mensajes (estilo post) ---------------- */
  function renderMessage({ role, text, isError }) {
    const node = msgTemplate.content.cloneNode(true);
    const post = node.querySelector(".post");
    const avatar = node.querySelector(".post__avatar");
    const name = node.querySelector(".post__name");
    const time = node.querySelector(".post__time");
    const body = node.querySelector(".post__text");

    const isUser = role === "user";
    post.classList.add(isUser ? "post--user" : "post--tutor");
    if (isError) post.classList.add("post--error");

    avatar.textContent = isUser ? "Tú" : "P";
    name.textContent = isUser ? "Tú" : "Tutor Paul";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    body.textContent = text;

    feed.appendChild(node);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function welcomeMessage() {
    renderMessage({
      role: "model",
      text:
        "Hi! I'm Tutor Paul 👋 Vamos a practicar Inglés de 1° de Bachillerato juntos. " +
        "Cuéntame: ¿en qué tema quieres trabajar hoy — vocabulario, gramática, o prefieres un reto rápido?",
    });
  }
 /* ---------------- Envío de mensajes ---------------- */
  async function sendToTutor() {
    typing.hidden = false;
    input.disabled = true;
    form.querySelector(".composer__send").disabled = true;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          history: history,
          message: history[history.length - 1]?.text || ""
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "No se pudo obtener respuesta.");
      }

      const replyText = data.text || data.reply || "Sin respuesta del tutor.";
      history.push({ role: "model", text: replyText });
      renderMessage({ role: "model", text: replyText });
    } catch (err) {
      renderMessage({
        role: "model",
        isError: true,
        text:
          "⚠️ " +
          (err.message ||
            "Tutor Paul no está disponible en este momento. Intenta de nuevo en unos segundos."),
      });
    } finally {
      typing.hidden = true;
      input.disabled = false;
      form.querySelector(".composer__send").disabled = false;
      input.focus();
    }
  }

  /* ---------------- Reto rápido ---------------- */
  challengeBtn.addEventListener("click", () => {
    const text =
      "Dame un reto socrático corto de Inglés (vocabulario o gramática) para mi nivel, " +
      "de 1° de Bachillerato, y guíame con preguntas hasta que yo mismo llegue a la respuesta.";
    history.push({ role: "user", text: "⚡ (Reto rápido solicitado)" });
    renderMessage({ role: "user", text: "⚡ Quiero un reto rápido" });
    // Se envía la instrucción real al modelo, aunque en pantalla se muestre el resumen.
    history[history.length - 1].text = text;
    sendToTutor();
  });

  welcomeMessage();
})();
