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
