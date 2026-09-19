# Tutor Paul — Tutor Socrático de Inglés (1° Bachillerato)

Aplicación web para acompañamiento socrático de la asignatura de **Inglés**,
dirigida a estudiantes de **1° de Bachillerato (BGU) — Ecuador**, presentada
por el **Profe Paul Iñiguez**, del **Colegio AAMPETRA**.

## ¿Qué incluye?

- Interfaz de chat con estética tipo Threads (monocromo, feed de "posts"),
  con modo claro y oscuro automático/manual.
- Función serverless (`netlify/functions/chat.js`) que llama a la API
  gratuita de **Google AI Studio (Gemini)** con **resiliencia entre
  modelos**: si un modelo gratuito fue descontinuado o está sin cuota,
  prueba automáticamente el siguiente de la lista, y si todos fallan,
  descubre modelos vigentes por sí misma antes de responder con error.
- Sección de créditos (perfil) con foto y datos del responsable.

## 1. Obtener tu API Key gratuita

1. Entra a https://aistudio.google.com/
2. Crea una API Key gratuita ("Get API key").
3. Cópiala, la necesitarás en el paso 3.

## 2. Subir el proyecto a Netlify

Opción rápida: arrastra esta carpeta completa a
https://app.netlify.com/drop, o conéctala desde un repositorio de GitHub.

## 3. Configurar la variable de entorno (IMPORTANTE)

**Nunca** pongas la API Key directamente en el código. En Netlify:

`Site settings → Environment variables → Add a variable`

- Nombre: `GEMINI_API_KEY`
- Valor: tu clave de Google AI Studio

Vuelve a desplegar el sitio (`Deploys → Trigger deploy`) para que la
función tome la variable.

## 4. Agregar tu foto y datos de créditos

- Copia tu foto a `assets/yo.jpg` (reemplaza el archivo, mismo nombre).
  Si no la agregas, se muestra un ícono de perfil genérico automáticamente.
- Edita en `index.html`, dentro de `<div id="creditsModal">`, los campos
  marcados como `[Agregar correo institucional]` y `[Agregar usuario / enlace]`.

## 5. Ajustar la lista de modelos gratuitos (opcional)

En `netlify/functions/chat.js`, la constante `MODEL_CANDIDATES` define el
orden de prueba. Los modelos gratuitos de Google cambian con el tiempo:
puedes reordenar o añadir nombres nuevos ahí; la función seguirá
funcionando aunque algunos ya no existan, porque además descubre modelos
vigentes automáticamente como último recurso.

## Estructura del proyecto

```
tutor-paul/
├── index.html
├── netlify.toml
├── assets/
│   ├── styles.css
│   ├── app.js
│   └── yo-placeholder.svg   (reemplázalo agregando assets/yo.jpg)
└── netlify/
    └── functions/
        └── chat.js
```

## Notas pedagógicas

El "system prompt" del tutor (dentro de `chat.js`) implementa el método
socrático: no entrega respuestas directas, guía con preguntas, corrige con
amabilidad y ajusta el nivel a 1° de Bachillerato. Puedes editarlo ahí
mismo para afinar tono, nivel o reglas de corrección.
