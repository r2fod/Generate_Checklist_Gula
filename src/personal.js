// ─── CUÁNTA GENTE HACE FALTA EN UN EVENTO ─────────────────────────────────────
// Sala, cocina y logística a partir del tipo y de los comensales.
//
// Los números NO salen de los manuales del sector: salen de contar el personal que se
// puso de verdad en 19 eventos de la hoja de costes. Los del sector se quedaban cortos
// para cómo se trabaja aquí, y quedarse corto no es solo poner menos gente: de la cifra
// de sala salen también los delantales, las bandejas, los litos y los menús de personal.
//
// Vive aparte de checklist-generadores.js porque lo usan DOS sitios: la checklist (que
// provisiona material para esa gente) y el calendario, que enseña con semanas de
// antelación cuánta gente hace falta cada día y cuánta hay disponible.

// Pax por camarero, medido:
//   boda/comunión   9,0 · 7,1 · 9,0 · 6,7 · 8,7  → 1 cada 9
//   corporativo    11,5 · 7,2 · 5,0 · 10,7       → 1 cada 10
// Cumpleaños y producción grande NO tienen medición propia: se quedan donde estaban y
// se marcan aquí para no dar por bueno un número que nadie ha comprobado.
export const PAX_POR_CAMARERO = {
  boda: 9,
  comunion: 9,
  corporativo: 10,
  cumpleanos: 20,   // sin medir
  produccion: 20,   // sin medir por encima de 30 pax
};

// Los que salieron de la hoja de costes de verdad. Los otros dos se avisan en pantalla
// como "ratio sin comprobar" — hasta que alguien ponga el suyo, que entonces ya está
// comprobado por quien lo ha vivido y el aviso sobra.
const SIN_MEDIR = ["cumpleanos", "produccion"];

// ─── LOS RATIOS SE PUEDEN AJUSTAR ─────────────────────────────────────────────
// Los de arriba son el punto de partida, no una ley: cada catering trabaja distinto y
// los de cumpleaños y producción nadie los ha medido. Lo que se ajuste vale para toda la
// app —la checklist provisiona delantales, bandejas, litos y menús de personal a partir
// de la cifra de sala— y se guarda en Firestore, para que el equipo entero cuente igual.
//
// Vive en una variable de módulo y no se pasa por parámetro porque personalNecesario se
// llama desde media docena de sitios: enhebrarlo por todos sería tocar código que
// funciona a cambio de nada. Se pone UNA vez al arrancar (ver ponRatios).
let ratios = { ...PAX_POR_CAMARERO };

// Solo números que tengan sentido como "pax por camarero". Un 0 dividiría por cero y un
// 500 diría que una boda de 300 se saca con dos personas: los dos vienen de un dedo
// resbalando en el móvil, no de una decisión.
export function saneaRatios(brutos) {
  const limpio = {};
  if (!brutos || typeof brutos !== "object") return limpio;
  Object.keys(PAX_POR_CAMARERO).forEach(tipo => {
    const n = Number(brutos[tipo]);
    if (Number.isFinite(n) && n >= 1 && n <= 60) limpio[tipo] = n;
  });
  return limpio;
}

// Lo que no venga se queda en su valor de partida: así una corrección de los medidos en
// una versión nueva llega igual a todo lo que nadie ha tocado.
export function ponRatios(nuevos) {
  ratios = { ...PAX_POR_CAMARERO, ...saneaRatios(nuevos) };
  return { ...ratios };
}

export function leerRatios() { return { ...ratios }; }

// Solo lo que alguien ha cambiado de verdad, para no congelar los de partida
export function ratiosCambiados(valores = {}) {
  const cambios = {};
  Object.entries(saneaRatios(valores)).forEach(([tipo, n]) => {
    if (n !== PAX_POR_CAMARERO[tipo]) cambios[tipo] = n;
  });
  return cambios;
}

// Cocina, por tramos. Medido: 2 hasta 40 pax, 3 hasta 60, 4-5 de 100 en adelante.
// Por tramos y no con una división porque los saltos reales no son proporcionales: de
// 26 a 40 pax siempre fueron 2, y de 100 a 150 siempre 4 o 5.
function cocinaNecesaria(pax) {
  if (pax <= 0) return 0;
  if (pax <= 40) return 2;
  if (pax <= 60) return 3;
  if (pax <= 120) return 4;
  // Por encima de 120 se quedaba clavado en 5: una boda de 300 pedía la misma cocina
  // que una de 130. No es que falte gente, es que la comida no sale a tiempo.
  //
  // OJO: los tramos de arriba SÍ están medidos; esto de aquí NO. Los 19 eventos de la
  // hoja no llegan a 200 pax, así que 1 cada 55 es la referencia del sector (1 cada
  // 40-50 en emplatado) puesta con prudencia. En cuanto haya un evento grande de
  // verdad, se ajusta con ese número.
  return Math.max(5, Math.ceil(pax / 55));
}

// Logística es el número más estable de toda la hoja: 2 personas en casi todo, sea de
// 40 o de 150 pax, y 1 en lo pequeño. No escala con los comensales porque no depende de
// ellos, sino del camión: cargarlo y descargarlo cuesta lo mismo con 60 que con 140.
function logisticaNecesaria(pax) {
  if (pax <= 0) return 0;
  if (pax <= 30) return 1;
  // Se quedaba en 2 para siempre: lo mismo para 40 que para 400. Sube despacio porque
  // de verdad no escala con los comensales —depende del camión— pero una boda de 300
  // son dos viajes y el doble de material. Tope en 4: por encima no se ha visto nunca.
  return Math.min(4, 1 + Math.ceil(pax / 100));
}

// Sala. Un banquete nunca sale con menos de dos personas.
function salaNecesaria(tipo, pax, paxPorCamarero = 0) {
  if (pax <= 0) return 0;
  const divisor = paxPorCamarero > 0 ? paxPorCamarero : (ratios[tipo] || 9);
  return Math.max(2, Math.ceil(pax / divisor));
}

// Todo junto, que es como se enseña en el calendario.
export function personalNecesario(tipo, pax, paxPorCamarero = 0) {
  const sala = salaNecesaria(tipo, pax, paxPorCamarero);
  const cocina = cocinaNecesaria(pax);
  const logistica = logisticaNecesaria(pax);
  // "Sin medir" deja de serlo en cuanto alguien pone el suyo: ese número ya no sale de
  // una suposición, sale de quien ha hecho el evento. Seguir avisando sería no hacerle
  // caso a la única persona que lo sabe.
  const sinMedir = SIN_MEDIR.includes(tipo) && ratios[tipo] === PAX_POR_CAMARERO[tipo];
  return { sala, cocina, logistica, total: sala + cocina + logistica, sinMedir };
}

// ─── QUIÉN VA A CADA EVENTO ───────────────────────────────────────────────────
// Lo mismo que el bloque "HORARIO PERSONAL EN EVENTO" de la hoja de costes: nombre,
// rol, hora de entrada, hora de salida e importe. Con eso salen solas las horas
// trabajadas y lo que cuesta el evento en personal, que es lo que hoy se cuadra a mano.
//
// El nombre es texto libre a propósito, aunque en pantalla se elija de un desplegable:
// en la hoja hay tanto gente del equipo como externos ("Camarero Paqui", el equipo de
// Edu), y obligar a que todos estén dados de alta dejaría fuera justo a los que se
// contratan para el día.
export const ROLES = { sala: "Sala", cocina: "Cocina", logistica: "Logística" };

// La hora del reloj, en un solo sitio. Estuvo escrita en tres —dos veces en apuntes.js
// y una aquí—, que es como se consigue que un día una acepte "24:00" y las otras no.
export const esHora = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || "").trim());

// Minutos desde medianoche, o null si no es una hora. Devolver null y no 0 importa: las
// 00:00 son una hora válida y "no hay hora" no lo es.
export function enMinutos(h) {
  if (!esHora(h)) return null;
  const [hh, mm] = String(h).trim().split(":").map(Number);
  return hh * 60 + mm;
}

// Y la vuelta: minutos a "HH:MM", dando la vuelta al reloj. Un turno seis horas antes de
// un banquete a las 2:00 son las 20:00 del día anterior, no una hora negativa.
export function enReloj(min) {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// Horas entre dos horas del reloj. Si la salida es MENOR que la entrada, es que se
// termina de madrugada: entrar a las 17:00 y salir a las 3:00 son diez horas, no menos
// catorce. En una boda es el caso normal, no la excepción.
export function horasEntre(inicio, fin) {
  const a = enMinutos(inicio), b = enMinutos(fin);
  if (a === null || b === null) return null;
  const min = b >= a ? b - a : b + 1440 - a;
  return Math.round((min / 60) * 100) / 100;
}

function saneaAsignado(bruto) {
  if (!bruto || typeof bruto !== "object") return null;
  const nombre = typeof bruto.nombre === "string" ? bruto.nombre.trim() : "";
  if (!nombre) return null;
  const limpio = { nombre, rol: ROLES[bruto.rol] ? bruto.rol : "sala" };
  if (esHora(bruto.inicio)) limpio.inicio = String(bruto.inicio).trim();
  if (esHora(bruto.fin)) limpio.fin = String(bruto.fin).trim();
  // El importe es lo que se le paga por ESE evento, como en la hoja: un número suelto,
  // no una tarifa por hora. Cero no se guarda: es lo mismo que no haberlo puesto.
  if (Number.isFinite(bruto.importe) && bruto.importe > 0) limpio.importe = Math.round(bruto.importe * 100) / 100;
  return limpio;
}

export function saneaAsignados(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(saneaAsignado).filter(Boolean);
}

// Lo que se enseña debajo de la lista: cuántos hay de cada rol, cuántas horas suman y
// cuánto cuesta. Las horas solo cuentan a quien tenga las dos horas puestas; el importe
// solo a quien lo tenga. Así una lista a medio rellenar da un total honesto en vez de
// uno que parece completo.
export function resumenAsignados(lista) {
  const asignados = saneaAsignados(lista);
  const porRol = { sala: 0, cocina: 0, logistica: 0 };
  let horas = 0, importe = 0, sinHoras = 0, sinImporte = 0;
  for (const a of asignados) {
    porRol[a.rol] = (porRol[a.rol] || 0) + 1;
    const h = horasEntre(a.inicio, a.fin);
    if (h === null) sinHoras++; else horas += h;
    if (a.importe) importe += a.importe; else sinImporte++;
  }
  return {
    total: asignados.length, porRol,
    horas: Math.round(horas * 100) / 100,
    importe: Math.round(importe * 100) / 100,
    sinHoras, sinImporte,
  };
}

// Qué falta por cubrir de cada rol. Negativo no existe: si hay más gente de la que la
// cuenta pedía, es que ese evento la necesitaba y el que sobra es el cálculo.
export function personalQueFalta(necesario, asignados) {
  const r = resumenAsignados(asignados);
  return {
    sala: Math.max(0, necesario.sala - r.porRol.sala),
    cocina: Math.max(0, necesario.cocina - r.porRol.cocina),
    logistica: Math.max(0, necesario.logistica - r.porRol.logistica),
  };
}
