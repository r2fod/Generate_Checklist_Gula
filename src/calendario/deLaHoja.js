// ─── LO QUE VIENE DE LA HOJA DE GOOGLE ────────────────────────────────────────
// El calendario de pared vivía en un Google Sheets con dos meses por fila y varias
// líneas de texto libre en cada día. Esto es lo que se salvó de ahí, revisado a mano:
// no es una importación automática y no se va a repetir.
//
// POR QUÉ NO HAY SINCRONIZACIÓN AUTOMÁTICA
//
// De 3.400 celdas con texto, 2.662 (el 78%) no seguían ningún patrón, y de las que sí,
// muchas no eran el evento sino la tarea de alrededor: "CARGA BODA", "COCINAR BODA",
// "IR A LA BODA", "LIMPIEZA BODA". Importar eso automáticamente habría llenado la app
// de eventos basura, y limpiarlos cuesta más que meterlos a mano.
//
// Además la hoja tiene datos personales del equipo (citas médicas, vacaciones), así que
// publicarla como CSV para que la app la leyera habría dejado una URL pública con
// información médica dentro. Se descartó por eso.
//
// A partir de aquí el calendario de la app es el sitio donde se apunta, y la hoja deja
// de mandar.

// Los eventos confirmados de la hoja de 2026, de agosto en adelante. El año se dedujo
// de la propia rejilla y se comprobó dos veces: el 5 de enero cae en lunes y el 1 de
// julio en miércoles, y solo 2026 cumple las dos cosas.
export const EVENTOS_DE_LA_HOJA = [
  { fecha: "2026-09-05", titulo: "Evento Aryan Campana", tipo: "corporativo" },
  { fecha: "2026-09-13", titulo: "Boda Eucaris y Pedro", tipo: "boda", sitio: "Molí" },
  { fecha: "2026-09-25", titulo: "Boda Nicole", tipo: "boda", sitio: "Molí del Ballestar" },
  { fecha: "2026-09-26", titulo: "Boda Yolanda e Ignacio", tipo: "boda", sitio: "Chiva" },
  { fecha: "2026-10-03", titulo: "Boda Rita y Lluisen", tipo: "boda" },
  { fecha: "2026-10-10", titulo: "Boda María y Noa", tipo: "boda", sitio: "Casa en Montcada" },
  { fecha: "2026-10-10", titulo: "Boda Alba Murillo", tipo: "boda" },
  { fecha: "2026-10-31", titulo: "Boda Adrienne y Maties", tipo: "boda", sitio: "Elche" },
  { fecha: "2026-11-07", titulo: "Boda Marta y Víctor", tipo: "boda", sitio: "Molí Ballestar" },
];

// Vacaciones de agosto, dichas por Raúl y contrastadas con la hoja donde había apunte.
// Las fechas son el ÚLTIMO día libre: quien "vuelve el 3" tiene el 2 como último día.
//
// Ojo con estas dos, que no coinciden con la hoja y mandan las de aquí:
//   · La hoja solo tenía un día suelto para Anna y para Rocío (el 11 de agosto), no el
//     mes entero.
//   · De Raúl no había ningún apunte de vacaciones en la hoja.
export const VACACIONES_DE_LA_HOJA = [
  // Irene se fue antes que el resto y también vuelve antes: la hoja marca su último día
  // el 30 de agosto, así que entra el 31.
  // Irene: la hoja marca del 4 al 30 de agosto, así que entra el 31.
  { fecha: "2026-08-04", hasta: "2026-08-30", titulo: "Irene", tipo: "vacaciones" },
  // Raúl es el ÚNICO que no sale de la hoja: allí no hay ningún apunte de vacaciones
  // suyo. Estas fechas las dio él. Último día libre el 2, vuelve el 3.
  { fecha: "2026-08-08", hasta: "2026-09-02", titulo: "Raúl", tipo: "vacaciones" },
  // Anna: la hoja solo tiene un día suelto, el 11, y la marca activa el 29 y el 30
  // ("ACTIVA ANNA EMAIL"). No hay apuntado un mes de vacaciones.
  { fecha: "2026-08-11", titulo: "Anna", tipo: "vacaciones" },
  // Rocío NO sigue el patrón del resto, y conviene no meterla en el saco de "la mayoría
  // del equipo". La hoja dice, día por día:
  //   ·  4 ago  trabajando ("PRODU: ANNA, RO, RAUL, JEFF")
  //   · 11 ago  "Vacas roci" — UN día suelto
  //   · 14, 17 y 18 ago  "ACTIVA RO" — activa, en pleno agosto
  //   ·  3 → 8 sep  "VACAS RO" — seis días seguidos, justo cuando vuelve el resto
  //
  // Aquí hubo un error que casi entra: se le puso un rango del 8 de agosto al 8 de
  // septiembre juntando su agosto con la semana de septiembre. Eso la daba por ausente
  // los días 14, 17 y 18, que son precisamente los que la hoja marca como ACTIVA. Se
  // apunta lo que hay escrito y nada más.
  { fecha: "2026-08-11", titulo: "Rocío", tipo: "vacaciones" },
  { fecha: "2026-09-03", hasta: "2026-09-08", titulo: "Rocío", tipo: "vacaciones" },
];

// Recogidas y devoluciones que estaban apuntadas en la hoja. No son eventos: no generan
// checklist, pero sí tienen que verse en el calendario porque son cosas con fecha que
// se olvidan.
export const RECOGIDAS_DE_LA_HOJA = [
  { fecha: "2026-09-09", titulo: "Recoger camión Covey", tipo: "recogida" },
  { fecha: "2026-09-15", titulo: "Recoger camión Covey", tipo: "recogida" },
  { fecha: "2026-09-20", titulo: "Devolver camión Covey", tipo: "recogida" },
  { fecha: "2026-09-25", titulo: "Recoger generadores 7K, furgo Albacar 18:00", tipo: "recogida" },
  { fecha: "2026-10-19", titulo: "Devolver camión Covey", tipo: "recogida" },
];

// Días que la hoja marcaba como cerrados o completos
export const CERRADOS_DE_LA_HOJA = [
  { fecha: "2026-09-26", titulo: "Día completo", tipo: "cerrado" },
  { fecha: "2026-09-27", titulo: "Día completo", tipo: "cerrado" },
  { fecha: "2026-10-03", titulo: "Día cerrado", tipo: "cerrado" },
];

export const TODO_DE_LA_HOJA = [
  ...EVENTOS_DE_LA_HOJA,
  ...VACACIONES_DE_LA_HOJA,
  ...RECOGIDAS_DE_LA_HOJA,
  ...CERRADOS_DE_LA_HOJA,
];
