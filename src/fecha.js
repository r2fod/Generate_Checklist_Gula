// ─── EL DÍA DE HOY, EN ISO ────────────────────────────────────────────────────
// "Hoy" estaba escrito de siete maneras distintas por el repositorio y, lo importante,
// no todas daban el mismo día. Aquí hay UNA, y esta es la razón de que sea la local:
//
// **Las fechas de esta app son días de calendario, no instantes.** "La boda del 12" la
// escribe una persona mirando un móvil en España; comparar eso contra UTC es comparar
// dos cosas distintas que se parecen 22 horas al día.
//
// El fallo que destapó unificarlas, y que estaba en producción todos los días del año:
//
//     const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
//     hoy.toISOString().slice(0, 10)      // ← ¡AYER!
//
// Poner el reloj a medianoche LOCAL y luego pasarlo a ISO (que es UTC) da el día
// anterior siempre que el huso vaya por delante de Greenwich, o sea siempre en España.
// Los avisos de recogidas y devoluciones se calculaban así: la ventana entera iba
// corrida un día y "hoy" viajaba a la interfaz siendo ayer. Ver la prueba que lo fija.
//
// En el Worker (Cloudflare) no hay huso: el contenedor va en UTC, así que `hoyISO()`
// allí devuelve el día UTC, que es exactamente lo que hacía antes. Nada cambia para el
// repaso de la noche.

/** El día de calendario de una fecha, tal y como lo ve este dispositivo.
 * @param {Date} f @returns {string} */
export const aISO = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

/** Hoy. La única. @param {Date} [ahora] @returns {string} */
export const hoyISO = (ahora = new Date()) => aISO(ahora);

/** Dentro de N días (o hace N, con negativo). Suma por días de CALENDARIO —no 86.400.000
 * milisegundos— para que los cambios de hora de marzo y octubre no descuadren la ventana
 * en un día: esos dos días tienen 23 y 25 horas.
 * @param {number} n @param {Date} [ahora] @returns {string} */
export function enDiasISO(n, ahora = new Date()) {
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  d.setDate(d.getDate() + Math.round(n));
  return aISO(d);
}

/** El día de una marca de tiempo (para agrupar recuerdos o gasto por día).
 * @param {number} ms @returns {string} */
export const diaDeMs = (ms) => (ms ? aISO(new Date(ms)) : "");
