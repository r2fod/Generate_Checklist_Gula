// ─── EL SECTOR, COMO BANDA DE SANIDAD ──────────────────────────────────────────
// No es para pisar lo medido. La boda a 9 pax/camarero es medición de 19 eventos reales
// (ver personal.js); si el sector dice 12-15, la diferencia es intencional — aquí se
// trabaja distinto y ese comentario ya lo explica. Este fichero sirve para lo contrario:
// avisar cuando un ratio que NADIE ha medido (cumpleaños, producción, la paella) se sale
// muchísimo de lo normal, y de paso confirmar que los medidos siguen siendo intencionales
// y no un despiste.
//
// Números de fuentes públicas del sector de catering/eventos en España, recogidos el
// 2026-08-25. SIN VALIDAR contra los números de verdad del equipo todavía — se edita a
// mano, con revisión, no se genera. Mismo estilo que precios.js cuando se migró a
// Firestore: el dato vive en un solo sitio, con su fuente al lado.
//
// Sin React, sin nube: entran números, sale una comparación. Se prueba con node.
import { RATIOS_BEBIDA } from "../bebida.js";

/**
 * @typedef {{ nombre: string, unidad: string, banda: [number, number], fuente: string }} RatioSector
 */

/** @type {Record<string, RatioSector>} */
export const SECTOR = {
  camareros_banquete: {
    nombre: "Camareros (banquete sentado — boda, comunión)",
    unidad: "pax por camarero",
    banda: [12, 15],
    fuente: "banquete sentado, fuentes públicas del sector",
  },
  camareros_corporativo: {
    nombre: "Camareros (corporativo)",
    unidad: "pax por camarero",
    banda: [20, 30],
    fuente: "evento corporativo/cóctel, fuentes públicas del sector",
  },
  vino: {
    nombre: "Vino",
    unidad: "botellas por adulto",
    banda: [0.33, 0.5],
    fuente: "1 botella cada 2-3 personas, fuentes públicas del sector",
  },
  cerveza_verano: {
    nombre: "Cerveza (verano, con barra)",
    unidad: "tercios por adulto",
    banda: [1.5, 2],
    fuente: "con barra, fuentes públicas del sector",
  },
  cava: {
    nombre: "Cava (solo brindis)",
    unidad: "botellas por adulto",
    banda: [0.125, 0.167],
    fuente: "1 botella cada 6-8 personas, solo brindis, fuentes públicas del sector",
  },
  hielo_verano: {
    nombre: "Hielo (verano, con barra)",
    unidad: "kg por pax",
    banda: [0.7, 1],
    fuente: "con barra en verano, fuentes públicas del sector",
  },
  hielo_invierno: {
    nombre: "Hielo (sin barra o invierno)",
    unidad: "kg por pax",
    banda: [0.3, 0.5],
    fuente: "sin barra o en invierno, fuentes públicas del sector (ya citado en el comentario de calculos.js)",
  },
  paella: {
    nombre: "Paella",
    unidad: "personas por paellera",
    // De una ración de sector de ~150-200 g de arroz seco/persona y una paellera
    // grande de referencia (~1,5-2 kg de arroz seco): por validar con el equipo antes
    // de tratar esto como algo más que una primera estimación.
    banda: [30, 35],
    fuente: "≈150-200 g de arroz seco/persona, fuentes públicas del sector — SIN validar cuántas personas da cada talla de paellera de verdad",
  },
  refresco: {
    nombre: "Refrescos",
    unidad: "unidades por comensal",
    banda: [2.0, 3.5],
    fuente: "fuentes públicas del sector en eventos con celebración",
  },
};

/** @typedef {"dentro" | "por-encima" | "por-debajo" | "sin-dato"} TonoComparacion */

/**
 * @param {number} actual
 * @param {[number, number]} banda
 * @returns {{ tono: TonoComparacion, deltaPct: number }}
 */
function comparaUno(actual, banda) {
  const [min, max] = banda;
  if (actual >= min && actual <= max) return { tono: "dentro", deltaPct: 0 };
  const limite = actual < min ? min : max;
  const deltaPct = Math.round(((actual - limite) / limite) * 100);
  return { tono: actual < min ? "por-debajo" : "por-encima", deltaPct };
}

/**
 * Comprueba si un factor de bebida ajusta el ratio demasiado bajo respecto al sector
 * o si se desvía mucho de la banda. Esto previene que una calibración basada en vueltas
 * esporádicas o no recurrentes ponga bebida de menos.
 *
 * @param {string} bebida Clave de bebida ('vino', 'cerveza', 'cava', 'refresco')
 * @param {number} [factor=1] Factor multiplicador aplicado o medido
 * @param {{ esVerano?: boolean }} [opciones]
 * @returns {{
 *   bebida: string,
 *   factor: number,
 *   ratioBase: number,
 *   ratioEfectivo: number,
 *   banda: [number, number],
 *   unidad: string,
 *   tono: TonoComparacion,
 *   deltaPct: number,
 *   peligroBajo: boolean,
 *   aviso: string | null,
 *   avisoCorto: string | null
 * } | null}
 */
export function comprobarBebidaSector(bebida, factor = 1, { esVerano = true } = {}) {
  const f = typeof factor === "number" && Number.isFinite(factor) && factor > 0 ? factor : 1;
  let ratioBase = 0;
  let banda = null;
  let unidad = "";

  if (bebida === "vino") {
    ratioBase = RATIOS_BEBIDA.vino; // 0.72
    banda = SECTOR.vino.banda;      // [0.33, 0.5]
    unidad = "bot/adulto";
  } else if (bebida === "cerveza") {
    ratioBase = esVerano ? RATIOS_BEBIDA.cerveza.verano : RATIOS_BEBIDA.cerveza.invierno; // 3.0 o 2.0
    banda = esVerano ? SECTOR.cerveza_verano.banda : [1.0, 1.5]; // [1.5, 2] en verano, [1.0, 1.5] en invierno
    unidad = "tercios/adulto";
  } else if (bebida === "cava") {
    ratioBase = RATIOS_BEBIDA.cava; // 0.20
    banda = SECTOR.cava.banda;      // [0.125, 0.167]
    unidad = "bot/adulto";
  } else if (bebida === "refresco") {
    ratioBase = 4.44;               // consumo real neto (~0.60 * 7.4)
    banda = SECTOR.refresco ? SECTOR.refresco.banda : [2.0, 3.5];
    unidad = "uds/pax";
  } else {
    return null;
  }

  const ratioEfectivo = Math.round(ratioBase * f * 100) / 100;
  const { tono, deltaPct } = comparaUno(ratioEfectivo, banda);
  const peligroBajo = tono === "por-debajo";

  let aviso = null;
  let avisoCorto = null;
  if (peligroBajo) {
    avisoCorto = `< sector (${ratioEfectivo} vs mín ${banda[0]})`;
    aviso = `Ratio por debajo del sector (${ratioEfectivo} vs mín. ${banda[0]} ${unidad}) · Riesgo de falta si no se apuntaron todas las vueltas`;
  } else if (deltaPct < -15) {
    avisoCorto = `bajada fuerte (${deltaPct}%)`;
    aviso = `Variación fuerte respecto al sector (${deltaPct}%). Comprobar que las vueltas estén completas.`;
  }

  return {
    bebida,
    factor: f,
    ratioBase,
    ratioEfectivo,
    banda,
    unidad,
    tono,
    deltaPct,
    peligroBajo,
    aviso,
    avisoCorto,
  };
}

/**
 * Compara ratios propios contra la banda del sector. No inventa nada: un ratio que no
 * está en `actuales` sale con tono "sin-dato" en vez de omitirse, para que quien
 * pregunte sepa que existe una banda del sector pero no hay número propio con el que
 * compararla — la regla de oro de la casa es que cada afirmación salga de un dato, y
 * "no lo sé" también es una respuesta que tiene que salir de algún sitio.
 * @param {Record<string, number>} actuales
 * @returns {Array<{ id: string, nombre: string, unidad: string, actual: number | null, banda: [number, number], fuente: string, tono: TonoComparacion, deltaPct: number }>}
 */
export function compararRatios(actuales = {}) {
  return Object.entries(SECTOR).map(([id, r]) => {
    const actual = actuales[id];
    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      return { id, nombre: r.nombre, unidad: r.unidad, actual: null, banda: r.banda, fuente: r.fuente, tono: "sin-dato", deltaPct: 0 };
    }
    const { tono, deltaPct } = comparaUno(actual, r.banda);
    return { id, nombre: r.nombre, unidad: r.unidad, actual, banda: r.banda, fuente: r.fuente, tono, deltaPct };
  });
}
