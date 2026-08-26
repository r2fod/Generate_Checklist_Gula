// ─── QUÉ VOZ USA LA NUBE ────────────────────────────────────────────────────────
// Gemini trae ~30 voces prefabricadas, cada una con su carácter. Antes solo se podía
// elegir a mano en Cloudflare (GEMINI_TTS_VOZ), igual para todo el equipo; el dueño
// pidió poder elegirla cada uno desde el propio asistente. Aquí solo un puñado
// CURADO, no las ~30 — eso sería un desplegable ilegible para quien no sabe qué es
// "Sadaltager". Se edita a mano, con revisión, no se genera — mismo estilo que
// precios.js, sector.js y cambios.js.
//
// Nombres y descripciones sacados de una fuente de terceros (los dominios oficiales
// de Google están bloqueados desde donde se ha podido comprobar esto) — si Google
// cambia el catálogo, esta lista puede quedar desactualizada sin que nada avise: es
// el mismo motivo por el que el modelo de voz (GEMINI_TTS_MODEL) ya caducó una vez.
//
// Sin React, sin nube: entra una clave, sale su ficha. Se prueba con node.

/** @typedef {{ id: string, nombre: string, tono: string }} VozGemini */

/** @type {VozGemini[]} */
export const VOCES_GEMINI = [
  { id: "Kore", nombre: "Kore", tono: "Firme y con seguridad (la de por defecto hasta ahora)" },
  { id: "Charon", nombre: "Charon", tono: "Clara y explicativa — la más parecida a un asistente tipo Jarvis" },
  { id: "Sadaltager", nombre: "Sadaltager", tono: "Con aire de autoridad, como quien sabe de lo que habla" },
  { id: "Umbriel", nombre: "Umbriel", tono: "Tranquila, sin prisa" },
  { id: "Puck", nombre: "Puck", tono: "Animada y con energía" },
  { id: "Aoede", nombre: "Aoede", tono: "Fresca y natural" },
  { id: "Achird", nombre: "Achird", tono: "Cercana, como un compañero más" },
  { id: "Leda", nombre: "Leda", tono: "Joven y con vida" },
];

export const CLAVES_VOZ_GEMINI = VOCES_GEMINI.map(v => v.id);

// "" (o cualquier cosa que no esté en la lista) significa "la que tenga puesta el
// Worker por defecto" — no se fuerza ninguna a quien no ha elegido, así el ajuste de
// Cloudflare (GEMINI_TTS_VOZ) sigue mandando para quien no ha tocado nada aquí.
export const vozGeminiValida = (id) => (CLAVES_VOZ_GEMINI.includes(id) ? id : "");
