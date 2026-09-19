// ─── QUÉ ES UN "FACTOR" AJUSTABLE, PARA TODOS LOS QUE HAY ─────────────────────
// bebida.js y cristaleria.js guardan cada uno su propio mapa de factores, con formas
// distintas (uno por tipo de evento y bebida, el otro plano), pero comparten la MISMA
// definición de qué es un factor válido: un multiplicador sobre el número de partida,
// 1 es "como siempre", y fuera de 0,3-2 no hay un ajuste razonado, hay un dedo
// resbalando (un 0,1 deja la boda sin vino, un 5 pide cinco veces la bebida de un
// evento entero). Vivía escrito dos veces, palabra por palabra; aquí se escribe una.
export const FACTOR_NEUTRO = 1;

const MIN_FACTOR = 0.3, MAX_FACTOR = 2;
/** @param {unknown} n @returns {n is number} */
export function esFactorValido(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= MIN_FACTOR && n <= MAX_FACTOR;
}
