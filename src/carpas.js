// ─── CARPAS ────────────────────────────────────────────────────────────────────
// Cuántas carpas pide un rodaje y cuántas hay que alquilar. Vive fuera de App.jsx
// porque lo usan las dos puntas: la checklist para cargarlas y el formulario para
// recomendar un número a quien lo rellena, que no tiene por qué saber la cuenta.

// Lo que hay en el almacén. Por encima de esto hay que alquilar la diferencia.
export const CARPAS_EN_ALMACEN = 8;

// Una 3x3 cubre ~12 personas de pie (0,75 m²/pax), que es el estándar de las
// alquiladoras. Más una para el buffet y otra para el camión, que si van en la misma
// cuenta se comen el sitio de comer.
const CARPA_BUFFET = 1, CARPA_CAMION = 1;

/** @param {number} [pax] @returns {number} */
export function carpasRecomendadas(pax = 0) {
  const paraComer = Math.max(1, Math.ceil((pax || 0) / 12));
  return paraComer + CARPA_BUFFET + CARPA_CAMION;
}

// Las que no tenemos y hay que pedir fuera (Support On Set)
/** @param {number} [total] @returns {number} */
export function carpasPorAlquilar(total = 0) {
  return Math.max(0, (total || 0) - CARPAS_EN_ALMACEN);
}

// El día de más gente de un rodaje: es el que manda para el material, porque las
// carpas se montan una vez y se quedan.
/** @param {Array<string|number>} [dias] @returns {number} */
export function paxDelDiaGrande(dias = []) {
  return (Array.isArray(dias) ? dias : [])
    .map(d => parseInt(String(d), 10) || 0)
    .reduce((mx, n) => (n > mx ? n : mx), 0);
}
