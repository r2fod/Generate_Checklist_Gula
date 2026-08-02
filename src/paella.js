// ─── PAELLA ────────────────────────────────────────────────────────────────────
// Cuántas paelleras salen y de qué talla. Vive fuera de App.jsx porque lo usan las
// dos puntas: la checklist para cargarlas (con sus paletas, trípodes y bombonas) y el
// formulario para proponer un número y una talla a quien lo rellena, que no tiene por
// qué saber la cuenta. Teniéndolo en un solo sitio, cambiar la ración cambia las dos.

// Una paellera da de comer a unas 30 personas. De ahí sale el número.
export const PERSONAS_POR_PAELLA = 30;

export function paellasPorPax(pax = 0) {
  return Math.max(1, Math.ceil((pax || 0) / PERSONAS_POR_PAELLA));
}

// La talla por tramos de gente. Es lo que se ha usado siempre: hasta 40 la pequeña,
// hasta 80 la mediana, y de ahí para arriba la grande.
export function tallaPorPax(pax = 0) {
  return pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande";
}

// Lo que carga la checklist. Las dos cosas se pueden fijar a mano: hay menús en los
// que cocina prefiere dos medianas a una grande, o al revés, y eso no lo sabe el pax.
// numManual = 0 (o vacío) significa "las que salgan por la gente".
export function calcPaella(pax, tallaManual, numManual) {
  const n = numManual > 0 ? numManual : paellasPorPax(pax);
  const talla = tallaManual && tallaManual !== "Auto"
    ? tallaManual.toLowerCase()
    : tallaPorPax(pax);
  return { n, talla };
}
