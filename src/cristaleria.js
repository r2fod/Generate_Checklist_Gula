// ─── FACTORES DE CRISTALERÍA ──────────────────────────────────────────────────
// calcCristaleria (calculos.js) sale "al extremo alto del sector + un 10% de margen
// para roturas", sin ningún dato propio detrás — son números de partida, no una
// medición. Aquí se deja la misma puerta que ya tiene la bebida (bebida.js) para
// poder ajustarlos: un factor por tipo de copa (vino, agua, cava, cubata), no por
// tipo de evento — calcCristaleria no distingue boda de comunión, así que el ajuste
// tampoco tiene sentido que lo haga.
//
// Un factor es un multiplicador sobre el número de partida: 1 es "como está hoy",
// 0,8 es "un 20% menos". Mismo rango que bebida.js y por el mismo motivo: fuera de
// 0,3-2 no hay un ajuste razonado, hay un dedo resbalando.

export const CLAVES_CRISTALERIA = ["vino", "agua", "cava", "cubata"];
export const FACTOR_NEUTRO = 1;

const MIN_FACTOR = 0.3, MAX_FACTOR = 2;
/** @param {unknown} n @returns {n is number} */
export function esFactorValido(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= MIN_FACTOR && n <= MAX_FACTOR;
}

/**
 * Un mapa esparcido: solo lo tocado. Lo que no aparece vale FACTOR_NEUTRO.
 * @typedef {Record<string, number>} FactoresCristaleria
 */

/** @param {unknown} brutos @returns {FactoresCristaleria} */
export function saneaFactoresCristaleria(brutos) {
  /** @type {FactoresCristaleria} */
  const limpio = {};
  if (!brutos || typeof brutos !== "object") return limpio;
  const datos = /** @type {Record<string, unknown>} */ (brutos);
  CLAVES_CRISTALERIA.forEach(clave => {
    const n = Number(datos[clave]);
    if (esFactorValido(n)) limpio[clave] = n;
  });
  return limpio;
}

// El estado vivo, igual que los factores de bebida y los ratios de personal: se pone
// una vez al arrancar (cuando llega de la nube) y lo lee calcCristaleria directamente,
// sin que nadie tenga que pasarlo de componente en componente.
/** @type {FactoresCristaleria} */
let factores = {};

/** @param {unknown} nuevos @returns {FactoresCristaleria} */
export function ponFactoresCristaleria(nuevos) {
  factores = saneaFactoresCristaleria(nuevos);
  return leerFactoresCristaleria();
}

/** @returns {FactoresCristaleria} */
export function leerFactoresCristaleria() { return { ...factores }; }

// Lo que se sube a la nube: como ya se guarda esparcido, es la propia lista limpia.
// Se mantiene la función para que el sitio que la usa no tenga que saber eso — mismo
// motivo que factoresCambiados en bebida.js.
/** @param {FactoresCristaleria} [valores] @returns {FactoresCristaleria} */
export function factoresCristaleriaCambiados(valores = {}) { return saneaFactoresCristaleria(valores); }

// Un solo factor, con su 1 por defecto. Es la única forma de leerlo desde el cálculo:
// así da igual que nadie lo haya tocado nunca.
/** @param {FactoresCristaleria|null|undefined} valores @param {string} clave @returns {number} */
export function factorCristaleria(valores, clave) {
  const n = valores ? Number(valores[clave]) : NaN;
  return esFactorValido(n) ? n : FACTOR_NEUTRO;
}
