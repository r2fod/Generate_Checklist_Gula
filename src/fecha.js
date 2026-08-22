// ─── EL DÍA DE HOY, EN ISO ────────────────────────────────────────────────────
// "Hoy" estaba escrito cuatro veces (App.jsx, Calendario.jsx, subconsciente.js,
// tareas.js) y no de la misma manera: dos lo sacaban del calendario del móvil y dos de
// `toISOString()`, que es UTC. Aquí viven las dos, con nombre distinto y a propósito.
//
// **No se unifican.** Parecen la misma cuenta y no lo son: en España, de 00:00 a 02:00
// en verano, UTC todavía va por el día de ayer. Cambiar de golpe cuál usa cada sitio
// mueve la frontera de "esto ya ha pasado" en las horas en las que precisamente se está
// recogiendo un evento — y lo que se movería es qué apuntes cuentan como pendientes y
// qué tareas se caen solas. Así que cada llamada se quedó con la que ya tenía, y esto
// es solo el mismo código en un sitio en vez de en cuatro.
//
// Cuál usar si escribes algo nuevo: **`hoyLocalISO()`**. Las fechas de la app son días
// de calendario que alguien mira en un móvil ("la boda del 12"), no instantes.

// Un día de calendario tal y como lo ve este dispositivo. Lo que usan la checklist y el
// calendario, que comparan contra fechas escritas a mano por una persona.
/** @param {Date} f @returns {string} */
export const aISO = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

/** @param {Date} [ahora] @returns {string} */
export const hoyLocalISO = (ahora = new Date()) => aISO(ahora);

// El día en UTC. Lo que usan el subconsciente y las tareas desde que se escribieron.
/** @param {Date} [ahora] @returns {string} */
export const hoyUTCISO = (ahora = new Date()) => ahora.toISOString().slice(0, 10);

// Dentro de N días, en UTC. Misma cuenta y mismo huso que hoyUTCISO, que es con lo que
// se compara: mezclar los dos husos en los extremos de una ventana la deja descuadrada
// un día por un lado.
/** @param {number} n @param {number} [ahora] milisegundos @returns {string} */
export const enDiasUTCISO = (n, ahora = Date.now()) =>
  new Date(ahora + n * 86400000).toISOString().slice(0, 10);
