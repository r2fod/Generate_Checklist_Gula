// ─── PAELLA ────────────────────────────────────────────────────────────────────
// Cuántas paelleras salen y de qué talla. Vive fuera de App.jsx porque lo usan las
// dos puntas: la checklist para cargarlas (con sus paletas, trípodes y bombonas) y el
// formulario para proponer un número y una talla a quien lo rellena, que no tiene por
// qué saber la cuenta. Teniéndolo en un solo sitio, cambiar la ración cambia las dos.

// Una paellera da de comer a unas 30 personas. De ahí sale el número.
const PERSONAS_POR_PAELLA = 30;

/** @param {number} [pax] @returns {number} */
export function paellasPorPax(pax = 0) {
  return Math.max(1, Math.ceil((pax || 0) / PERSONAS_POR_PAELLA));
}

// La talla por tramos de gente. Es lo que se ha usado siempre: hasta 40 la pequeña,
// hasta 80 la mediana, y de ahí para arriba la grande.
/** @param {number} [pax] @returns {"pequeña"|"mediana"|"grande"} */
export function tallaPorPax(pax = 0) {
  return pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande";
}

// Lo que carga la checklist. Las dos cosas se pueden fijar a mano: hay menús en los
// que cocina prefiere dos medianas a una grande, o al revés, y eso no lo sabe el pax.
// numManual = 0 (o vacío) significa "las que salgan por la gente".
/**
 * @param {number} pax
 * @param {string} [tallaManual] "Auto" o una talla fijada a mano
 * @param {number} [numManual] 0 o vacío = las que salgan por la gente
 * @returns {{ n: number, talla: string }}
 */
export function calcPaella(pax, tallaManual, numManual) {
  // Number() y no el valor tal cual: numManual llega de un <input>, o sea como texto, y
  // "3" > 0 es cierto pero devolvía la CADENA "3" a la checklist.
  const aMano = Number(numManual) || 0;
  const n = aMano > 0 ? aMano : paellasPorPax(pax);
  const talla = tallaManual && tallaManual !== "Auto"
    ? tallaManual.toLowerCase()
    : tallaPorPax(pax);
  return { n, talla };
}
