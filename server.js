const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash-exp"
];

app.post('/api/chat', async (req, res) => {
  const { history, message } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY en el servidor." });
  }

  // Estructura de mensajes para Google AI Studio
  const contents = [...(history || [])];
  if (message) {
    contents.push({ role: "user", parts: [{ text: message }] });
  }

  // Intento de conexión con modelos
  for (const model of MODEL_CANDIDATES) {
    try {
      // AQUÍ SE PASA LA CLAVE DE FORMA OBLIGATORIA EN LA URL (?key=...)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return res.json({ text: reply, reply: reply });
        }
      }
    } catch (err) {
      console.warn(`Error probando modelo ${model}:`, err);
    }
  }

  res.status(503).json({ error: "No se obtuvo respuesta de la API de Google." });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});