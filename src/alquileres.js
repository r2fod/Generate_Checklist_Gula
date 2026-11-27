// ─── ALQUILERES: EL CATÁLOGO Y SUS RECOGIDAS ──────────────────────────────────
// Vive fuera de App.jsx porque es la parte que decide si alguien va a buscar el
// material o no. Aquí se puede probar sola, sin navegador ni pantalla.

/** @type {Record<string, { etiqueta: string, proveedor?: string }>} */
export const ALQUILERES = {
  sillas:          { etiqueta: "Sillas" }, // el proveedor lo elige el selector: Dealde o Carvillo
  mesas:           { etiqueta: "Mesas redondas" }, // solo si se eligen redondas: las rectangulares son nuestras
  armarioCaliente: { etiqueta: "Armario caliente", proveedor: "Dealde" },
  mobiliario:      { etiqueta: "Mobiliario", proveedor: "Event Style" },
  segundoCamion:  { etiqueta: "Segundo camión" },
  // Solo en producciones
  furgoAlquiler:   { etiqueta: "Furgoneta" },
  generador:       { etiqueta: "Generador", proveedor: "Support On Set" },
  carpas:          { etiqueta: "Carpas", proveedor: "Support On Set" },
};
export const PROVEEDORES_VEHICULO = ["Albacar", "Covey"];
export const SIN_ALQUILER_VEHICULO = "no";

/** @param {unknown} valor */
export function esDecisionVehiculo(valor) {
  return valor === SIN_ALQUILER_VEHICULO || PROVEEDORES_VEHICULO.some(proveedor => proveedor === valor);
}

/** @param {string} evento @param {string|number} pax @param {string|number} [ninos] */
export function proponeSegundoCamion(evento, pax, ninos = 0) {
  return evento === "boda" && (Number(pax) || 0) + (Number(ninos) || 0) > 80;
}

/** @param {string} clave @param {string|null} [decision] */
export function conceptoVehiculo(clave, decision) {
  return decision && PROVEEDORES_VEHICULO.includes(decision) ? conceptoAlquiler(clave, decision) : null;
}

/** @param {Record<string, any>} [estado] */
export function decisionGenerador(estado = {}) {
  if (typeof estado.llevaGenerador === "boolean") return estado.llevaGenerador;
  return estado.recogidas?.some?.((/** @type {Record<string, any>} */ r) => r?.auto === "generador") ? true : null;
}

// Las reservas previas pueden estar escritas a mano. Un camión sin más es el
// principal y no sirve para dar por reservado el segundo.
const RESERVAS_A_MANO = {
  furgoAlquiler: /\bfurgo(?:neta)?\b/i,
  generador: /\bgenerador\b/i,
  segundoCamion: /(?:segundo cami[oó]n|cami[oó]n\s*(?:n[º°.]?\s*)?(?:2\b|extra\b|adicional\b))/i,
};

// Cuántos días antes se recoge y cuántos después se devuelve
export const DIAS_ANTES_RECOGIDA = 1, DIAS_DESPUES_DEVOLUCION = 1;

// Suma (o resta) días a una fecha "AAAA-MM-DD" sin pasar por UTC: con toISOString()
// una fecha de verano se iba un día atrás según la hora del navegador.
/** @param {string} iso "AAAA-MM-DD" @param {number} dias @returns {string} */
export function sumaDias(iso, dias) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + dias);
  const dosCifras = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

// Nombre con el que el alquiler aparece en la lista de recogidas. Sin el verbo delante
// ("Recoger sillas"): el aviso ya pone "Recogida:" o "Devolución:" según toque.
// Qué alquileres pide un estado de evento. Es la MISMA decisión que toman los
// interruptores de la pantalla, pero mirando el estado en vez de reaccionar al clic.
/**
 * @param {Record<string, any>} [estado]
 * @returns {Record<string, string|null>} clave del alquiler → concepto, o null si no toca
 */
function alquileresDe(estado = {}) {
  const esProduccion = estado.evento === "produccion";
  const sillas = estado.origenSillas;
  return {
    sillas: (sillas === "Dealde" || sillas === "Carvillo") ? conceptoAlquiler("sillas", sillas) : null,
    armarioCaliente: estado.llevaArmarioCaliente ? conceptoAlquiler("armarioCaliente") : null,
    // Mobiliario de Event Style no se lleva a rodajes; generador y carpas son solo de rodaje
    mobiliario: (!esProduccion && estado.llevaMobiliarioAlquiler) ? conceptoAlquiler("mobiliario", estado.proveedorMobiliarioAlquiler) : null,
    furgoAlquiler: esProduccion ? conceptoVehiculo("furgoAlquiler", estado.furgoAlquiler) : null,
    generador: esProduccion && decisionGenerador(estado) ? conceptoAlquiler("generador") : null,
    segundoCamion: estado.evento === "boda" ? conceptoVehiculo("segundoCamion", estado.segundoCamion) : null,
    carpas: (esProduccion && estado.llevaCarpas && estado.alquilaCarpas) ? conceptoAlquiler("carpas") : null,
  };
}

// Sirve tanto al pulsar un alquiler como al aplicar un envío del formulario. Los
// apuntes manuales mandan y los alquileres que ya pasaron conservan su historial.
/**
 * @param {Array<Record<string, any>>} previas
 * @param {string} clave
 * @param {string|null} concepto
 * @param {string} fechaEvento
 * @param {RegExp} [patronManual]
 */
export function sincronizaRecogidaAlquiler(previas, clave, concepto, fechaEvento, patronManual) {
  if (!concepto) return previas.filter(r => r.auto !== clave || r.recogido || r.devuelto);

  const fechas = {
    fecha: sumaDias(fechaEvento, -DIAS_ANTES_RECOGIDA),
    fechaDevolucion: sumaDias(fechaEvento, DIAS_DESPUES_DEVOLUCION),
  };
  if (previas.some(r => r.auto === clave)) {
    return previas.map(r => r.auto === clave
      ? { ...r, concepto, ...(fechaEvento && r.fechasAuto ? fechas : {}) }
      : r);
  }
  const patron = patronManual || RESERVAS_A_MANO[/** @type {keyof typeof RESERVAS_A_MANO} */ (clave)];
  if (patron && previas.some(r => !r.auto && patron.test(String(r.concepto || "")))) return previas;
  return [...previas, { concepto, hora: "", ...fechas, auto: clave, fechasAuto: true }];
}

/** @param {Record<string, any>} [estado] */
export function recogidasConAlquileres(estado = {}) {
  const previas = Array.isArray(estado.recogidas) ? estado.recogidas : [];
  return Object.entries(alquileresDe(estado)).reduce(
    (recogidas, [clave, concepto]) => sincronizaRecogidaAlquiler(recogidas, clave, concepto, estado.fechaEvento || ""),
    previas,
  );
}

/** @param {string} clave @param {string} [proveedor] @returns {string} */
export function conceptoAlquiler(clave, proveedor) {
  const a = ALQUILERES[clave];
  const quien = proveedor || (a && a.proveedor);
  return `${a ? a.etiqueta : clave}${quien ? ` (${quien})` : ""}`;
}
