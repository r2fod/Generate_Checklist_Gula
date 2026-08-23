// ─── COLOR DE LOS MANTELES ─────────────────────────────────────────────────────
// Cuántos manteles hacen falta lo sigue calculando la app a partir de las mesas.
// Lo único que se elige es DE CUÁLES: beige, negros o de los dos, y en ese caso
// qué parte de cada uno.
//
// Vive fuera de App.jsx porque lo usan las tres checklists y el formulario, y
// porque el reparto se puede probar solo.

// Lo de siempre, para que un evento guardado antes de existir esta opción cargue
// exactamente lo mismo que cargaba: beige en los eventos de salón, negros en rodaje.
/** @param {string} evtKey @returns {"Beige"|"Negros"} */
export function colorPorDefecto(evtKey) {
  return evtKey === "produccion" ? "Negros" : "Beige";
}

// Devuelve las líneas de mantel que van a la checklist: [[etiqueta, cantidad], ...]
// Los nombres son los de siempre ("Manteles beige" / "Manteles negros") a propósito:
// el nombre es la identidad del ítem, y cambiarlo perdería las marcas de carga y las
// cantidades corregidas a mano de los eventos que ya existen.
/**
 * @param {number} total
 * @param {string} color "Beige", "Negros" o "Ambos"
 * @param {number} [porcentajeBeige]
 * @returns {Array<[string, string]>} líneas [etiqueta, cantidad] para la checklist
 */
export function repartoManteles(total, color, porcentajeBeige = 50) {
  const n = Math.max(0, Math.round(total) || 0);
  if (color === "Negros") return [["Manteles negros", String(n)]];
  if (color !== "Ambos") return [["Manteles beige", String(n)]];
  // De los dos: se reparte el total, sin cargar de más. Se redondea hacia arriba el
  // beige y el resto va en negros, así que la suma es siempre el total calculado.
  const pct = Math.min(100, Math.max(0, Number(porcentajeBeige)));
  const beige = Math.ceil((n * pct) / 100);
  const negros = n - beige;
  /** @type {Array<[string, string]>} */
  const lineas = [];
  if (beige > 0) lineas.push(["Manteles beige", String(beige)]);
  if (negros > 0) lineas.push(["Manteles negros", String(negros)]);
  return lineas;
}
