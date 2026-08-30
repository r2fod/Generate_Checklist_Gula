// ─── CALIBRACIÓN DE COMIDA: PAELLA Y BANDEJAS ─────────────────────────────────
// El hermano de bebida.js y del factor de hielo, para las dos cantidades de
// comida que SÍ salen de una cuenta por pax: las paelleras (una cada 30) y las
// bandejas (por tramos de pax). El número honesto está en los eventos ya hechos:
// lo que salió menos lo que volvió SIN USAR — la misma convención que la bebida
// ya usa, hecha explícita para el equipo:
//
//   · bebida: lo que vuelve es la botella sin abrir (no se bebió).
//   · paella: lo que vuelve es la que NO salió (no se usó).
//   · bandejas: lo que vuelve es la que no se usó para pasar.
//
// Con esa convención "lo cargado − lo vuelto" es lo que de verdad se usó, y el
// factor converge como el resto: aplicar la sugerencia y volver a medir da 1,
// no otra corrección encima. El panel de comida lo dice en pantalla, porque es
// lo que decide si el dato existe.
//
// Lo que NO está aquí: las frituras. Su número es manual por evento (no hay
// ratio base contra el que calibrar); acordárselo sería memoria, no
// calibración.
import { esFactorValido, TIPOS_BEBIDA } from "./bebida.js";

// Los grupos, por sus líneas de checklist. La paella tiene etiqueta dinámica
// ("Paella pequeña/mediana/grande"), así que va por matcher, no por lista — y
// el matcher no pisa "Paletas de paella" ni "Descansadores de paella", que no
// empiezan por "Paella ".
/** @typedef {{ nombre: string, esDeGrupo: (label: string) => boolean }} GrupoComida */
/** @type {Record<string, GrupoComida>} */
export const COMIDAS = {
  paella: {
    nombre: "Paella",
    /** @param {string} label */
    esDeGrupo: (label) => label.startsWith("Paella "),
  },
  bandejas: {
    nombre: "Bandejas",
    /** @param {string} label */
    esDeGrupo: (label) => label === "Bandejas de madera" || label === "Bandejas de plata",
  },
};
export const CLAVES_COMIDA = Object.keys(COMIDAS);

// Mapa esparcido: tipo → grupo → factor. Solo lo tocado o medido, para que una
// corrección de los valores de partida en una versión nueva siga llegando a
// todo lo que nadie ha tocado (mismo motivo que la bebida y el hielo).
/** @type {Record<string, Record<string, number>>} */
let factores = {};

/** @param {unknown} nuevos @returns {Record<string, Record<string, number>>} */
export function ponFactoresComida(nuevos) {
  factores = saneaFactoresComida(nuevos);
  return leerFactoresComida();
}

/** @returns {Record<string, Record<string, number>>} */
export function leerFactoresComida() {
  /** @type {Record<string, Record<string, number>>} */
  const copia = {};
  Object.entries(factores).forEach(([tipo, fila]) => { copia[tipo] = { ...fila }; });
  return copia;
}

// Lo que se sube a la nube: como ya se guarda esparcido, es la propia lista
// limpia. Subir un 1 congelado taparía la corrección del valor de partida.
/** @param {Record<string, Record<string, number>>} [valores] @returns {Record<string, Record<string, number>>} */
export function factoresComidaCambiados(valores = {}) { return saneaFactoresComida(valores); }

/** @param {unknown} brutos @returns {Record<string, Record<string, number>>} */
function saneaFactoresComida(brutos) {
  /** @type {Record<string, Record<string, number>>} */
  const limpio = {};
  if (!brutos || typeof brutos !== "object") return limpio;
  const datos = /** @type {Record<string, any>} */ (brutos);
  TIPOS_BEBIDA.forEach(tipo => {
    const fila = datos[tipo];
    if (!fila || typeof fila !== "object") return;
    CLAVES_COMIDA.forEach(clave => {
      const n = Number(fila[clave]);
      // El mismo rango válido que en la bebida: fuera de 0,3–2 no hay un
      // evento raro, hay un dedo resbalando.
      if (esFactorValido(n)) {
        if (!limpio[tipo]) limpio[tipo] = {};
        limpio[tipo][clave] = n;
      }
    });
  });
  return limpio;
}

// Un solo factor, con su 1 por defecto. Es la única forma de leerlos en el
// cálculo: así da igual que el tipo no exista (un evento antiguo) o que el
// grupo no se haya tocado nunca.
/** @param {Record<string, Record<string, number>>|null|undefined} valores @param {string} tipo @param {string} clave @returns {number} */
export function factorDeComida(valores, tipo, clave) {
  const f = Number((valores || {})[tipo]?.[clave]);
  return esFactorValido(f) ? f : 1;
}

// El que leen los cálculos (paella.js, calcBandejas de calculos.js) contra el
// estado del módulo, sin que el llamador tenga que saber nada de la nube.
/** @param {string} [tipo] @param {string} [clave] @returns {number} */
export function factorComidaVigente(tipo = "", clave = "") {
  return factorDeComida(factores, tipo, clave);
}

// Inmutable: devuelve el mapa nuevo. Poner el neutro es QUITAR el factor, no
// guardar un 1: guardarlo congelaría el ratio de partida el día que se
// corrija en una versión nueva.
/** @param {Record<string, Record<string, number>>|null|undefined} factores @param {string} tipo @param {string} clave @param {number} valor @returns {Record<string, Record<string, number>>} */
export function conFactorComida(factores, tipo, clave, valor) {
  /** @type {Record<string, Record<string, number>>} */
  const copia = {};
  Object.entries(factores || {}).forEach(([t, fila]) => { copia[t] = { ...fila }; });
  const n = Number(valor);
  if (!esFactorValido(n) || n === 1) {
    if (copia[tipo]) {
      delete copia[tipo][clave];
      if (!Object.keys(copia[tipo]).length) delete copia[tipo];
    }
  } else {
    if (!copia[tipo]) copia[tipo] = {};
    copia[tipo][clave] = n;
  }
  return copia;
}
