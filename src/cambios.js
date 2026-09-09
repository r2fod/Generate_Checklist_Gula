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
    fecha: "2026-09-09",
    cambios: [
      "Si el cliente trae su propia bebida y no hay barra libre, ya no hace falta pedir vino, cerveza ni refrescos — el hielo y el agua del personal se calculan igual.",
      "Con barra libre de cóctel o copas, la bebida y la cristalería ya no se preguntan: se calculan solas.",
      "Primero y segundo plato: se puede elegir qué dobla (cubiertos, cristalería) en vez de doblarlo todo de golpe.",
      "El postre se puede servir en el mismo plato que el principal, sin repetir el color a mano.",
      "Buffets: las mesas se calculan según lo que se marca (quesos, dulce, ibéricos, croquetas...), no con una cifra fija.",
      "Mesas altas: según el número de barras montadas, no solo por el número de invitados.",
      "Se puede decir que no hace falta hielo, y la línea desaparece de la lista de la compra.",
      "Calendario: ya se puede ver y editar quién trabaja en un evento pasado, no solo en los próximos 14 días.",
      "Elegir evento: los que ya están configurados se ven de un vistazo, con más contraste.",
      "El formulario de oficina se reordenó por bloques (sitio y mobiliario, barra, cocina...) para rellenarlo más rápido.",
    ],
  },
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
