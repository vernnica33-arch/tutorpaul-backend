// netlify/functions/chat.js
// Proxy resiliente hacia la API de Google AI Studio (Gemini).
// Objetivo: la app NUNCA debe caerse porque un modelo gratuito fue
// descontinuado. Se prueba una lista ordenada de modelos y, si todos
// fallan, se consulta ListModels para descubrir alternativas vigentes.

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Orden de intento: primero los ALIAS "latest" (Google los reapunta
// automáticamente al modelo Flash/Pro vigente, así que sobreviven a
// migraciones de versión sin tocar código), luego modelos estables
// conocidos, del más económico/rápido al más capaz.
const MODEL_CANDIDATES = [
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro-latest",
  "gemini-2.5-pro",
];

const SYSTEM_PROMPT = `Eres "Tutor Paul", un tutor socrático virtual para estudiantes
de Primer Curso de Bachillerato (BGU) en Ecuador, especializado en la asignatura de
Inglés. Fuiste presentado por el Profe Paul Iñiguez, del Colegio AAMPETRA, como
responsable pedagógico del proyecto.

Método y personalidad:
- Nunca entregues la respuesta final de inmediato. Guía con preguntas breves que
  ayuden al estudiante a razonar y descubrir la respuesta por sí mismo (método
  socrático).
- Da acompañamiento cálido, paciente y motivador, nunca condescendiente.
- Corrige errores de inglés (gramática, vocabulario, pronunciación descrita en
  texto) señalando el error con una pregunta guía, no con la corrección directa,
  salvo que el estudiante ya haya intentado 2-3 veces o pida explícitamente la
  respuesta.
- Da instrucciones y explicaciones metacognitivas en español (idioma materno del
  estudiante), pero incentiva y practica el idioma inglés en los ejemplos,
  ejercicios y respuestas del estudiante.
- Ajusta la dificultad al nivel de 1° de Bachillerato (A2-B1 del MCER).
- Cuando el estudiante lo pida, propone "desafíos" cortos: mini-retos, quizzes de
  una pregunta, o situaciones para resolver en inglés.
- Sé breve: respuestas de 2 a 6 líneas como máximo, salvo que te pidan una
  explicación extensa.
- Si el estudiante se sale del tema de Inglés / 1° de Bachillerato, redirígelo
  con amabilidad hacia el aprendizaje.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Método no permitido" });
  }

  if (!API_KEY) {
    return respond(500, {
      error:
        "Falta configurar la variable de entorno GEMINI_API_KEY en Netlify (Site settings → Environment variables).",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "JSON inválido en la solicitud." });
  }

  const { history } = payload; // [{ role: 'user'|'model', text }]
  if (!Array.isArray(history) || history.length === 0) {
    return respond(400, { error: "Falta el historial de la conversación." });
  }

  const contents = history.map((turn) => ({
    role: turn.role === "model" ? "model" : "user",
    parts: [{ text: String(turn.text || "").slice(0, 4000) }],
  }));

  const requestBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  };

  const tried = [];

  // 1) Intentar la lista fija de candidatos, en orden.
  for (const model of MODEL_CANDIDATES) {
    const result = await tryModel(model, requestBody);
    tried.push(model);
    if (result.ok) return respond(200, { text: result.text, model });
    if (result.fatal) return respond(result.status, { error: result.message });
  }

  // 2) Si ninguno respondió, descubrir modelos vigentes vía ListModels
  //    e intentar con los que soporten generateContent y no se hayan
  //    probado ya.
  try {
    const list = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
    if (list.ok) {
      const data = await list.json();
      const discovered = (data.models || [])
        .filter(
          (m) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent") &&
            /flash|pro/i.test(m.name) &&
            !/vision|embedding|tts|image|audio|live/i.test(m.name)
        )
        .map((m) => m.name.replace("models/", ""))
        .filter((name) => !tried.includes(name));

      for (const model of discovered) {
        const result = await tryModel(model, requestBody);
        tried.push(model);
        if (result.ok) return respond(200, { text: result.text, model });
      }
    }
  } catch (e) {
    // Ignorar y caer al mensaje final de error.
  }

  return respond(502, {
    error:
      "Tutor Paul no pudo obtener respuesta de ningún modelo gratuito disponible en este momento. Modelos probados: " +
      tried.join(", "),
  });
};

async function tryModel(model, requestBody) {
  try {
    const res = await fetch(
      `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        fatal: true,
        status: res.status,
        message:
          "La API Key de Google AI Studio no es válida o no tiene permisos. Revisa GEMINI_API_KEY en Netlify.",
      };
    }

    // 404 (modelo descontinuado/no existe) o 429 (cuota agotada) o 5xx:
    // no son fatales, se pasa al siguiente modelo de la lista.
    if (!res.ok) {
      return { ok: false, fatal: false };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "";

    if (!text.trim()) return { ok: false, fatal: false };
    return { ok: true, text: text.trim() };
  } catch (e) {
    return { ok: false, fatal: false };
  }
}

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  };
}
