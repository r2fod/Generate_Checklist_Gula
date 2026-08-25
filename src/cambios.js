// ─── QUÉ HA CAMBIADO, PARA QUIEN LO USA ────────────────────────────────────────
// A mano, con revisión, no se genera — mismo estilo que precios.js y sector.js. Frases
// cortas en el idioma de quien carga el camión, no de quien programa: "la voz suena más
// natural", no "fix(worker): actualizar modelo de voz de Gemini". Lo que le importa a
// quien ve el aviso de "hay una versión nueva" es QUÉ cambia para él, no cómo se hizo.
//
// La entrada más reciente va la PRIMERA. vite.config.js solo publica esa en
// version.json — el resto del historial vive aquí por si hace falta mirar atrás, no
// para enseñarse entera en un aviso que se ve de pasada antes de recargar.
//
// Sin React, sin nube: es una lista. Se prueba con node.

/** @typedef {{ fecha: string, cambios: string[] }} EntradaCambios */

/** @type {EntradaCambios[]} */
export const CAMBIOS = [
  {
    fecha: "2026-08-25",
    cambios: [
      "La voz del asistente suena más natural en el móvil.",
      "El asistente puede comparar los ratios de la casa (camareros, bebida, hielo, paella) con los del sector.",
    ],
  },
];

/**
 * La entrada más reciente, o null si la lista está vacía (no debería pasar, pero un
 * fichero a mano se puede dejar sin tocar por error). Aparte para que quien la use no
 * tenga que acordarse de que "la primera" es la más nueva.
 * @returns {EntradaCambios | null}
 */
export function ultimoCambio() {
  return CAMBIOS[0] || null;
}
