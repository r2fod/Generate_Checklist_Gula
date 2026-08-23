// ─── LAS MESAS DONDE SE SIENTA LA GENTE ───────────────────────────────────────
// Vive fuera de App.jsx porque lo usan los tres generadores, y porque el reparto se
// puede probar solo.
//
// Las de COCINA no se eligen: son siempre rectangulares de 1,80, que es sobre lo que se
// prepara el servicio. Esto es solo para los comensales.
//
// Las rectangulares son nuestras; las redondas son de alquiler.

// Cuánta gente entra en cada tipo.
//
// La rectangular de 1,80 va a SEIS y no a siete u ocho, que es lo que dan las tablas:
// aquí se juntan varias para hacer mesas largas, y al juntarlas se pierden las cabeceras
// —que es justo de donde salen los comensales de más de esas tablas—.
/** @type {Record<string, { porMesa: number, alquiler: boolean, etiqueta: string }>} */
export const TIPOS_MESA = {
  "Rectangular 1,8m": { porMesa: 6, alquiler: false, etiqueta: "Mesas de 1,8m" },
  "Redonda 1,5m": { porMesa: 8, alquiler: true, etiqueta: "Mesas redondas 1,5m (alquiler)" },
  "Redonda 1,8m": { porMesa: 10, alquiler: true, etiqueta: "Mesas redondas 1,8m (alquiler)" },
  "Redonda 2m": { porMesa: 12, alquiler: true, etiqueta: "Mesas redondas 2m (alquiler)" },
};

export const TIPO_MESA_POR_DEFECTO = "Rectangular 1,8m";

/** @param {string} [tipo] @returns {string} uno de TIPOS_MESA, o el de por defecto */
export function tipoMesaValido(tipo = TIPO_MESA_POR_DEFECTO) {
  return Object.prototype.hasOwnProperty.call(TIPOS_MESA, tipo) ? tipo : TIPO_MESA_POR_DEFECTO;
}

// Cuántas mesas hacen falta para sentar a esta gente, del tipo elegido
/** @param {number} pax @param {string} [tipo] @returns {number} */
export function mesasComensales(pax, tipo = TIPO_MESA_POR_DEFECTO) {
  const n = Math.max(0, Math.round(pax) || 0);
  if (!n) return 0;
  return Math.ceil(n / TIPOS_MESA[tipoMesaValido(tipo)].porMesa);
}

// Las líneas que van a la checklist: [[etiqueta, cantidad, esAlquiler], ...]
//
// Las rectangulares se quedan SIEMPRE bajo "Mesas de 1,8m", con redondas o sin ellas: no
// son solo "las de cocina", son también las de las barras de bebida, y en la checklist
// interesa verlas todas juntas en una línea como ha sido siempre. El nombre es además la
// identidad del ítem: si esa línea cambiara de nombre se perderían sus marcas de carga y
// sus cantidades corregidas a mano en todos los eventos que ya existen.
/**
 * @param {number} mesasCocina
 * @param {number} pax
 * @param {string} [tipo]
 * @returns {Array<[string, string, boolean]>} [etiqueta, cantidad, esAlquiler]
 */
export function lineasDeMesas(mesasCocina, pax, tipo = TIPO_MESA_POR_DEFECTO) {
  const t = tipoMesaValido(tipo);
  const paraComer = mesasComensales(pax, t);
  const cocina = Math.max(0, Math.round(mesasCocina) || 0);
  if (!TIPOS_MESA[t].alquiler) {
    // Todo rectangular: una sola línea, como ha sido siempre
    return [["Mesas de 1,8m", String(cocina + paraComer), false]];
  }
  return [
    ["Mesas de 1,8m", String(cocina), false],
    [TIPOS_MESA[t].etiqueta, String(paraComer), true],
  ];
}

// Cuántas mesas hay que vestir en total (para los manteles)
/** @param {number} mesasCocina @param {number} pax @param {string} [tipo] @returns {number} */
export function mesasParaVestir(mesasCocina, pax, tipo = TIPO_MESA_POR_DEFECTO) {
  return (Math.max(0, Math.round(mesasCocina) || 0)) + mesasComensales(pax, tipo);
}
