// ─── EL ASISTENTE SE ENTERA DE LAS ACTUALIZACIONES ─────────────────────────────
// El banner de arriba ("hay una versión nueva") solo lo ve quien mira arriba. Pedido
// tal cual: que el asistente también avise, lea los cambios, y además diga cuando la
// actualización YA se ha aplicado — eso el banner nunca lo dijo, desaparecía sin más
// al recargar.
//
// Dos momentos, un mismo dato (cambios.js):
//   · ANTES de pulsar Actualizar: "esto va a cambiar" — lo compone App.jsx con lo que
//     ya trae version.json, no hace falta nada de este fichero.
//   · DESPUÉS de recargar: "esto acaba de cambiar" — para saberlo hace falta recordar,
//     ANTES de recargar, a qué build se estaba actualizando. Eso es lo que guarda este
//     fichero, y lo que comprueba al arrancar de nuevo.
//
// Sin React: entra y sale texto/JSON de almacen.js. Se prueba con node.
import { leerJSON, guardarJSON, borrar } from "../almacen.js";

const CLAVE_PENDIENTE = "gula_actualizando_a";

/**
 * Se llama justo antes de recargar la página (el clic en "Actualizar"): deja dicho a
 * qué build se está actualizando. Sin esto, el arranque de después no tiene forma de
 * saber si el reload llegó de verdad a la versión nueva o se quedó en la vieja (sin
 * conexión, caché del navegador…).
 * @param {string} id
 * @param {string[]} cambios
 */
export function marcarActualizando(id, cambios) {
  guardarJSON(CLAVE_PENDIENTE, { id, cambios: Array.isArray(cambios) ? cambios : [] });
}

/**
 * Se llama al arrancar, con el build de ESTA carga. Si hay una actualización marcada
 * como pendiente Y el build actual es justo el que se esperaba, la actualización llegó
 * de verdad: se devuelven sus cambios y se borra la marca, para no repetir la
 * confirmación en cada arranque siguiente. Si el build no coincide (recarga que no
 * llegó a aplicar la versión nueva, o ha salido otra versión distinta por medio) se
 * deja la marca puesta tal cual: no se inventa una confirmación que no ha pasado.
 * @param {string} buildActual
 * @returns {string[] | null}
 */
export function confirmaSiActualizado(buildActual) {
  const pendiente = leerJSON(CLAVE_PENDIENTE, null);
  if (!pendiente || !pendiente.id || pendiente.id !== buildActual) return null;
  borrar(CLAVE_PENDIENTE);
  return pendiente.cambios || [];
}
