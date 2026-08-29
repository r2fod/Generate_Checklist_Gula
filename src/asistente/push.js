// ─── AVISOS EN ESTE TELÉFONO (PUSH) ───────────────────────────────────────────
// Un recordatorio al que le llega el día no puede esperar a que alguien abra la
// app: el Worker (ver worker/index.js, "los avisos del día") lo empuja al teléfono.
// Esta es la parte de la app: el identificador del aparato, la clave pública en
// bytes y la validación de una suscripción.
//
// Sin React ni fetch: lo puro, que se prueba con node. El almacén se recibe como
// parámetro (la excepción de siempre, como en formulario/codigo.js): así se
// prueba con uno de mentira y nadie va a por el global.
export const CLAVE_ID = "gula_push_id";
export const CLAVE_SUSC = "gula_push_suscripcion";

// Uno por APARATO (como el gasto: por aparato, no por persona): el aviso lo recibe
// el teléfono, y el teléfono puede cambiar de manos.
/** @param {Storage} almacen @returns {string} */
export function idDeAparato(almacen) {
  try {
    const actual = almacen.getItem(CLAVE_ID);
    if (typeof actual === "string" && actual.length >= 8) return actual;
  } catch (e) { /* sin acceso: se genera y no se guarda (la próxima carga, otro id) */ }
  const nuevo = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  try { almacen.setItem(CLAVE_ID, nuevo); } catch (e) { /* sin sitio: el id vive solo en esta carga */ }
  return nuevo;
}

// La clave pública VAPID viaja en base64url; el navegador la quiere en bytes.
// El padding se repone porque base64url lo quita.
/** @param {string} base64url @returns {Uint8Array} */
export function clavePúblicaABytes(base64url) {
  const b64 = String(base64url || "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Una suscripción usable tiene los tres pedazos que de verdad hacen falta para
// empujarle un aviso: sin uno, es tirarlo a la basura. expirationTime NO es uno de
// ellos — el caso normal (Chrome, Firefox...) es que la suscripción no caduque
// nunca, y ahí vale null, no un número: exigir un número aquí rechazaba la
// suscripción de siempre y "Activar avisos" fallaba SIEMPRE con "no ha salido
// completa", aunque el navegador la hubiera dado bien. El Worker que de verdad
// envía (avisosDelDia, en worker/index.js) tampoco lo mira: solo endpoint y keys.
/** @param {unknown} s @returns {boolean} */
export function suscripcionLista(s) {
  return !!s && typeof s === "object"
    && typeof s.endpoint === "string" && s.endpoint.length > 0
    && s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string";
}
