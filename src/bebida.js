// ─── LO QUE SE BEBE, SEGÚN EL TIPO DE EVENTO ──────────────────────────────────
// Los ratios de bebida de calculos.js salieron de eventos reales, pero de eventos de
// UN tipo: bodas y algún corporativo. En una comunión se bebe menos vino y más refresco
// que en una boda, y en un rodaje casi solo agua — eso lo sabe cualquiera que haya
// cargado el camión, pero la app cargaba lo mismo en los cinco casos.
//
// Aquí NO se inventa ese número. Todos los factores arrancan en 1: mientras nadie haya
// medido una comunión, decir "en comunión se bebe un 40% menos" sería tan de un dedo
// como el 1. Lo que hace este módulo es dejar dos vías para que el número deje de ser
// una suposición:
//
//   1. A mano, en el panel del calendario, igual que la gente por comensal.
//   2. Solo, desde el histórico: lo que salió menos lo que volvió, dividido entre los
//      comensales de ese evento (ver calibracion.js → calibracionBebida).
//
// Este fichero no importa NADA DE calculos.js a propósito: calculos.js lo usa, así que
// cualquier import de vuelta sería un ciclo. Sí importa de factorAjuste.js, que no
// depende de ninguno de los dos (solo constantes puras), así que no hay ciclo posible.
import { FACTOR_NEUTRO, esFactorValido } from "./factorAjuste.js";
export { FACTOR_NEUTRO, esFactorValido };

// Los ratios de partida, sacados de aquí para que haya UN solo sitio donde vive cada
// número: calculos.js los usa para calcular y calibracion.js para convertir un consumo
// medido en un factor ("se bebió 0,43 vino/adulto → factor 0,60").
export const RATIOS_BEBIDA = {
  vino: 0.72,                                  // botellas por adulto (blanco + tinto)
  cerveza: { verano: 3.0, invierno: 2.0 },     // tercios por adulto
  cava: 0.2,                                   // botellas por adulto
  refresco: 7.4,                               // unidades brutas por comensal (ver calculos.js)
};

// Las cuatro bebidas que se calibran. No están todas a propósito: son las que mueven
// dinero y sitio en el camión, las que llevan precio en el catálogo y las que se
// apuntan a la vuelta. La tónica, el Red Bull o el vermut se mueven con estas.
//
// "items" son las líneas EXACTAS de la checklist de las que sale el consumo medido; si
// alguna se renombra aquí, la calibración de esa bebida deja de encontrarla (por eso la
// prueba unitaria comprueba que todas existen en una checklist de verdad).
// "sobre" dice a quién se le reparte: el alcohol solo a los adultos, el refresco a todos
// (los niños son justo los que más refresco beben).
/** @type {Record<string, { nombre: string, sobre: "adultos"|"todos", items: string[] }>} */
export const BEBIDAS = {
  vino:     { nombre: "Vino",     sobre: "adultos", items: ["Vino blanco", "Vino tinto"] },
  cerveza:  { nombre: "Cerveza",  sobre: "adultos", items: ["Cerveza Alhambra (tercios)"] },
  cava:     { nombre: "Cava",     sobre: "adultos", items: ["Cava"] },
  refresco: { nombre: "Refrescos", sobre: "todos",  items: [
    "Coca-Cola normal", "Coca-Cola Zero", "Fanta naranja", "Fanta limón",
    "Aquarius", "Sprite", "Nestea",
  ] },
};

export const TIPOS_BEBIDA = ["boda", "comunion", "corporativo", "cumpleanos", "produccion"];
export const CLAVES_BEBIDA = Object.keys(BEBIDAS);

// Un factor es un multiplicador sobre el ratio de partida: 1 es "lo de siempre", 0,6 es
// "aquí se bebe un 40% menos". Se guarda ESPARCIDO —solo lo que alguien ha cambiado o
// lo que se ha medido— para que una corrección de los ratios base en una versión nueva
// siga llegando a todo lo que nadie ha tocado.

/**
 * Un mapa esparcido: tipo de evento → bebida → factor. Solo lo tocado.
 * @typedef {Record<string, Record<string, number>>} Factores
 */

/** @param {unknown} brutos @returns {Factores} */
export function saneaFactores(brutos) {
  /** @type {Factores} */
  const limpio = {};
  if (!brutos || typeof brutos !== "object") return limpio;
  const datos = /** @type {Record<string, any>} */ (brutos);
  TIPOS_BEBIDA.forEach(tipo => {
    const fila = datos[tipo];
    if (!fila || typeof fila !== "object") return;
    CLAVES_BEBIDA.forEach(bebida => {
      const n = Number(fila[bebida]);
      if (esFactorValido(n)) {
        if (!limpio[tipo]) limpio[tipo] = {};
        limpio[tipo][bebida] = n;
      }
    });
  });
  return limpio;
}

// El estado vivo, igual que los ratios de personal: se pone una vez al arrancar (cuando
// llega de la nube) y lo lee todo el mundo sin tener que pasárselo de componente en
// componente hasta el generador de la checklist.
/** @type {Factores} */
let factores = {};

/** @param {unknown} nuevos @returns {Factores} */
export function ponFactores(nuevos) {
  factores = saneaFactores(nuevos);
  return leerFactores();
}

/** @returns {Factores} */
export function leerFactores() {
  /** @type {Factores} */
  const copia = {};
  Object.entries(factores).forEach(([tipo, fila]) => { copia[tipo] = { ...fila }; });
  return copia;
}

// Lo que se sube a la nube: como ya se guarda esparcido, es la propia lista limpia. Se
// mantiene la función para que el sitio que la usa no tenga que saber eso.
/** @param {Factores} [valores] @returns {Factores} */
export function factoresCambiados(valores = {}) { return saneaFactores(valores); }

// Un solo factor, con su 1 por defecto. Es la única forma de leerlos en el cálculo: así
// da igual que el tipo no exista (una checklist antigua) o que la bebida no se haya
// tocado nunca.
/** @param {Factores|null|undefined} valores @param {string} tipo @param {string} bebida @returns {number} */
export function factorDe(valores, tipo, bebida) {
  const fila = valores && valores[tipo];
  const n = fila ? Number(fila[bebida]) : NaN;
  return esFactorValido(n) ? n : FACTOR_NEUTRO;
}

// Los cuatro factores de un tipo, listos para calcBebidas. Sin argumento coge los que
// haya puestos ahora mismo, que es lo que quiere el generador de la checklist.
/** @param {string} tipo @param {Factores} [valores] @returns {Record<string, number>} */
export function factoresDeTipo(tipo, valores = factores) {
  /** @type {Record<string, number>} */
  const salida = {};
  CLAVES_BEBIDA.forEach(bebida => { salida[bebida] = factorDe(valores, tipo, bebida); });
  return salida;
}

// Cuántos factores están tocados, para poder avisar en la cabecera del panel sin
// desplegarlo ("2 ajustados").
/** @param {Factores} [valores] @returns {number} */
export function cuantosAjustados(valores = factores) {
  return TIPOS_BEBIDA.reduce((acc, tipo) =>
    acc + CLAVES_BEBIDA.filter(b => factorDe(valores, tipo, b) !== FACTOR_NEUTRO).length, 0);
}

// Poner o quitar un factor sin pisar el resto de la fila. Poner el neutro es QUITARLO,
// no guardar un 1: guardarlo congelaría el ratio de partida si algún día se corrige.
/**
 * @param {Factores|null|undefined} valores
 * @param {string} tipo @param {string} bebida @param {unknown} valor
 * @returns {Factores}
 */
export function conFactor(valores, tipo, bebida, valor) {
  /** @type {Factores} */
  const copia = {};
  Object.entries(valores || {}).forEach(([t, fila]) => { copia[t] = { ...fila }; });
  const n = Number(valor);
  if (!esFactorValido(n) || n === FACTOR_NEUTRO) {
    if (copia[tipo]) {
      delete copia[tipo][bebida];
      if (!Object.keys(copia[tipo]).length) delete copia[tipo];
    }
    return copia;
  }
  if (!copia[tipo]) copia[tipo] = {};
  copia[tipo][bebida] = n;
  return copia;
}
