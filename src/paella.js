// ─── PAELLA ────────────────────────────────────────────────────────────────────
// Cuántas paelleras salen y de qué talla. Vive fuera de App.jsx porque lo usan las
// dos puntas: la checklist para cargarlas (con sus paletas, trípodes y bombonas) y el
// formulario para proponer un número y una talla a quien lo rellena, que no tiene por
// qué saber la cuenta. Teniéndolo en un solo sitio, cambiar la ración cambia las dos.

import { factorComidaVigente } from "./comida.js";

// Una paellera da de comer a unas 30 personas. De ahí sale el número.
// Exportada para que sector.js pueda comparar este ratio contra el del sector sin
// duplicarlo — sigue siendo este fichero quien decide el valor.
export const PERSONAS_POR_PAELLA = 30;

// El factor de comida (ver comida.js) multiplica la cuenta, igual que en la bebida:
// 0,6 es "aquí con dos paelleras de 100 pax sobra, carguemos una y media redondeada".
// El tipo es el del evento: el factor es por tipo, y un tipo sin medir da 1.
/** @param {number} [pax] @param {string} [tipo] @returns {number} */
export function paellasPorPax(pax = 0, tipo = "") {
  return Math.max(1, Math.ceil(((pax || 0) / PERSONAS_POR_PAELLA) * factorComidaVigente(tipo, "paella")));
}

// La talla por tramos de gente. Es lo que se ha usado siempre: hasta 40 la pequeña,
// hasta 80 la mediana, y de ahí para arriba la grande.
/** @param {number} [pax] @returns {"pequeña"|"mediana"|"grande"} */
export function tallaPorPax(pax = 0) {
  return pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande";
}

// Lo que carga la checklist. Las dos cosas se pueden fijar a mano: hay menús en los
// que cocina prefiere dos medianas a una grande, o al revés, y eso no lo sabe el pax.
// numManual = 0 (o vacío) significa "las que salgan por la gente". El número a mano
// MANDA sobre el factor de comida a propósito: calibrar contra un número puesto a mano
// sesgaría el factor (ver calibracion.js, que salta los eventos manuales).
/**
 * @param {number} pax
 * @param {string} [tallaManual] "Auto" o una talla fijada a mano
 * @param {number} [numManual] 0 o vacío = las que salgan por la gente
 * @param {string} [tipo] tipo de evento, para el factor de comida
 * @returns {{ n: number, talla: string }}
 */
export function calcPaella(pax, tallaManual, numManual, tipo = "") {
  // Number() y no el valor tal cual: numManual llega de un <input>, o sea como texto, y
  // "3" > 0 es cierto pero devolvía la CADENA "3" a la checklist.
  const aMano = Number(numManual) || 0;
  const n = aMano > 0 ? aMano : paellasPorPax(pax, tipo);
  const talla = tallaManual && tallaManual !== "Auto"
    ? tallaManual.toLowerCase()
    : tallaPorPax(pax);
  return { n, talla };
}
