// ─── EL DIARIO DE LO QUE VA MAL (SIN NOMBRES) ─────────────────────────────────
// Cuando alguien dice "esta mañana no me dejaba guardar", hoy no hay nada que mirar. La
// app no deja rastro: lo que pasó está en la consola del móvil de esa persona, que ya se
// ha cerrado. Y sin rastro, el arreglo empieza por intentar reproducirlo, que con un
// fallo de una vez al mes no pasa nunca.
//
// Esto es lo más pequeño que sirve: las últimas cosas que fueron mal, en este navegador,
// con su hora y su motivo. Se ven y se copian desde la pantalla de fallo (RedDeSeguridad)
// para pegarlas en el WhatsApp del equipo.
//
// **Y sin un solo dato de persona.** El repositorio es público y esto se pega en chats:
//   · No se apunta NUNCA el nombre de un evento, de un cliente ni de nadie del equipo.
//     Solo la etiqueta de lo que pasó, un puñado de números y, del motivo del error, una
//     versión limpiada.
//   · `sinDatosPersonales()` tacha lo que huele a persona en el texto del motivo:
//     correos, teléfonos, y lo que venga entre comillas (en los mensajes de la app, lo
//     entrecomillado casi siempre es el nombre de un evento).
//   · Los datos sueltos solo pueden ser números, booleanos o etiquetas de una lista
//     cerrada. Cualquier otra cosa se descarta: es la misma idea que la barrera de datos
//     del asistente, prohibir por defecto en vez de acordarse de tachar.
//
// Se guarda en este navegador y NO se sube a ningún sitio: quien lo quiere ver lo tiene
// delante, y no hay que confiar en nadie más.
import { leerJSON, guardarJSON, borrar } from "./almacen.js";

const CLAVE = "gula_diario";

// Qué compilación estaba corriendo. Sin esto, "esta mañana no me dejaba guardar" no se
// puede casar con ningún despliegue: el móvil de un montaje puede llevar días con el
// bundle viejo en caché (los .js van con hash, así que un index.html antiguo sigue
// sirviendo la compilación antigua). Lo pone Vite en tiempo de compilación
// (vite.config.js → define), y en node —las pruebas, el Worker— no existe.
//
// Se recorta a los diez primeros caracteres: el BUILD_ID es una fecha ISO completa y
// entera no cabe en una línea de chat, pero "2026-08-23" ya dice de qué día es el código.
const compilacion = () => {
  try { return typeof __BUILD_ID__ === "string" ? __BUILD_ID__.slice(0, 10) : "desarrollo"; }
  catch (e) { return "desarrollo"; }
};

// En cuál de las tres apps ha pasado. Sale de la CARPETA, que es lo que las separa
// (checklist/, formulario/, calendario/), no de nada que escriba una persona.
const dondeEstoy = () => {
  try {
    const t = String(location.pathname || "");
    return ["checklist", "formulario", "calendario", "pruebas"].find(c => t.includes(`/${c}`)) || "raiz";
  } catch (e) { return "?"; }
};
// Veinte llegan de sobra para "qué ha pasado hoy" y no engordan el almacén: el sitio que
// ocupa el diario es sitio que le falta al archivo de eventos, que es lo que importa.
export const MAX_APUNTES = 20;
const MAX_MOTIVO = 200;

// Lo que puede apuntarse. Lista cerrada a propósito: una etiqueta nueva se añade aquí,
// y en ese momento alguien mira si lo que va a apuntar lleva nombres.
/** @type {Record<string, string>} */
export const SUCESOS = {
  "nube-denegada": "La nube ha denegado una escritura",
  "nube-llena": "El documento ya no cabe en la nube",
  "nube-fallo": "Fallo al hablar con la nube",
  "almacen-lleno": "No cabe más en este navegador",
  "pantalla-rota": "La app ha fallado al dibujar",
  "proveedor-fallo": "Un proveedor del asistente ha fallado",
};

/** @param {string} que @returns {boolean} */
export const esSuceso = (que) => Object.prototype.hasOwnProperty.call(SUCESOS, que);

// Tacha lo que puede identificar a alguien. No pretende ser un anonimizador de verdad
// —eso no existe con texto libre—: pretende que lo normal no se cuele. Por eso encima va
// una lista blanca de datos, y esto es solo la segunda vuelta.
/** @param {unknown} texto @returns {string} */
export function sinDatosPersonales(texto) {
  // El ORDEN importa: lo entrecomillado va PRIMERO. Al revés, el «correo» que acababa
  // de ponerse se quedaba entre comillas angulares y la regla del nombre lo volvía a
  // tachar como «nombre», así que el texto no decía qué clase de dato se había quitado.
  return String(texto || "")
    // Lo entrecomillado en los mensajes de esta app suele ser el nombre de un evento
    // ("No se pudo guardar «Boda de …»"), y el nombre de un evento es el de un cliente.
    .replace(/[«"'`][^«»"'`]{3,}[»"'`]/g, "«nombre»")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "«correo»")
    // Teléfonos: 9 cifras o más, con o sin espacios, guiones o prefijo.
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, "«teléfono»")
    // Rutas de Firestore con el id del documento dentro: el id sale del nombre.
    .replace(/\b(indice|eventos|calendario|publico|envios)\/[\w-]+/g, "$1/«id»")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MOTIVO);
}

// Solo números, booleanos y etiquetas cortas sin espacios (códigos de error tipo
// "permission-denied"). Un texto libre no entra: ahí es donde viajarían los nombres.
/**
 * @param {Record<string, unknown>} datos
 * @returns {Record<string, string|number|boolean>}
 */
function datosLimpios(datos) {
  /** @type {Record<string, string|number|boolean>} */
  const salida = {};
  Object.entries(datos || {}).forEach(([k, v]) => {
    if (typeof v === "number" && Number.isFinite(v)) salida[k] = v;
    else if (typeof v === "boolean") salida[k] = v;
    else if (typeof v === "string" && /^[\w.-]{1,40}$/.test(v)) salida[k] = v;
  });
  return salida;
}

/**
 * Un apunte: cuándo, qué, y los datos que hayan pasado la lista blanca.
 * @typedef {{ cuando: number, que: string, motivo?: string } & Record<string, string|number|boolean>} Apunte
 */

/** @returns {Apunte[]} */
export function leerDiario() {
  const l = leerJSON(CLAVE, []);
  return Array.isArray(l) ? l.filter(a => a && esSuceso(a.que)) : [];
}

// Devuelve el diario ya con lo nuevo dentro, para poder pintarlo sin volver a leerlo.
/**
 * @param {string} que una de las claves de SUCESOS
 * @param {{ motivo?: string } & Record<string, unknown>} [datos]
 * @returns {Apunte[]} el diario ya con lo nuevo dentro
 */
export function apunta(que, { motivo = "", ...datos } = {}) {
  if (!esSuceso(que)) return leerDiario();   // una etiqueta que no está en la lista no se apunta
  const apunte = {
    cuando: Date.now(),
    que,
    // Estructurado y siempre igual: hora, qué, dónde y con qué versión. Un apunte que a
    // veces trae una cosa y a veces otra no se puede leer de un vistazo ni comparar.
    donde: dondeEstoy(),
    version: compilacion(),
    ...(motivo ? { motivo: sinDatosPersonales(motivo) } : {}),
    ...datosLimpios(datos),
  };
  const diario = [apunte, ...leerDiario()].slice(0, MAX_APUNTES);
  guardarJSON(CLAVE, diario);
  return diario;
}

/** @returns {Apunte[]} */
export function borrarDiario() {
  borrar(CLAVE);
  return [];
}

// Lo que se copia y se pega en el chat del equipo. Texto plano, del más nuevo al más
// viejo, con la hora local, que es como lo cuenta quien lo sufrió ("sobre las once").
/** @param {Apunte[]} [diario] @returns {string} */
export function comoTexto(diario = leerDiario()) {
  if (!diario.length) return "Sin fallos apuntados en este dispositivo.";
  return diario.map(a => {
    const hora = new Date(a.cuando).toLocaleString("es-ES");
    const extra = Object.entries(a)
      .filter(([k]) => !["cuando", "que", "motivo", "donde", "version"].includes(k))
      .map(([k, v]) => `${k}=${v}`).join(" ");
    return `${hora} · [${a.donde || "?"} ${a.version || "?"}] ${SUCESOS[a.que]}`
      + `${a.motivo ? ` · ${a.motivo}` : ""}${extra ? ` · ${extra}` : ""}`;
  }).join("\n");
}
