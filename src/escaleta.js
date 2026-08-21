// ─── LA ESCALETA DEL DÍA ──────────────────────────────────────────────────────
// A qué hora toca cada cosa. Todos los datos ya estaban en la app —la hora de inicio,
// las horas de cóctel y de copas, el horario de logística, los tiempos estimados de
// preparación, carga, montaje y recogida— pero repartidos por cinco sitios distintos, y
// nadie los ponía en una sola línea de tiempo. Así que la pregunta de siempre ("¿a qué
// hora hay que salir del obrador?") se contestaba a ojo, restando de cabeza el día antes.
//
// Se calcula HACIA ATRÁS desde la hora de inicio, que es la única hora que no se
// negocia: el cliente la ha dicho y hay que estar. Todo lo demás cae donde caiga.
//
// Lo que NO hace: inventarse el viaje. La app no sabe a cuántos kilómetros está la
// finca, así que el trayecto se pide (o se deja en el hueco por defecto) en vez de
// simularlo — una escaleta que se saca un tiempo de viaje de la manga es peor que no
// tener escaleta, porque parece que lo sabe.
import { estimarTiemposCarga, sumarMinutosHora } from "./tiempos-carga.js";
import { esHora, enMinutos } from "./personal.js";

// Media hora de margen entre estar montado y que llegue el primer invitado. No es un
// número de sector, es el respiro que hace falta para repasar, cambiarse y colocar lo
// que siempre falta — y para que un atasco no se coma el montaje.
export const MARGEN_ANTES_MIN = 30;

// Lo que se tarda en llegar cuando nadie lo ha dicho. Es un hueco declarado, no una
// estimación: sale marcado en la escaleta para que se corrija, no para que se crea.
export const VIAJE_POR_DEFECTO_MIN = 45;

export const FASES = {
  prep:     { titulo: "Preparación en el obrador", crono: "prep" },
  carga:    { titulo: "Carga del camión",          crono: "carga" },
  viaje:    { titulo: "Viaje al sitio",            crono: null },
  montaje:  { titulo: "Montaje en el sitio",       crono: "montaje" },
  margen:   { titulo: "Repaso y últimos detalles", crono: null },
  coctel:   { titulo: "Cóctel / aperitivo",        crono: null },
  servicio: { titulo: "Servicio en mesa",          crono: null },
  copas:    { titulo: "Barra de copas",            crono: null },
  recogida: { titulo: "Recogida",                  crono: "descarga" },
};

// Cuánto dura el servicio en mesa cuando no hay nada que lo diga. Sale de los eventos
// de la casa: entre que se sientan y se levantan van unas dos horas y media largas.
const SERVICIO_MIN = 150;

const aMin = (h) => (esHora(h) ? enMinutos(h) : null);

// Las horas de inicio del equipo de logística, que es lo que YA se ha decidido. Si hay
// una puesta a mano manda sobre la estimación: alguien lo ha pensado.
function inicioLogistica(logisticaEquipo = []) {
  const horas = logisticaEquipo.map(p => aMin(p && p.inicio)).filter(n => n !== null);
  return horas.length ? Math.min(...horas) : null;
}

// La escaleta entera, en orden. Cada tramo lleva su hora de inicio, su duración y, si la
// tiene, la fase del cronómetro del Modo carga: así la escaleta dice a qué hora tocaba y
// el cronómetro cuánto se tardó de verdad.
//
// Devuelve [] si no hay hora de inicio. Es a propósito: sin ella no hay escaleta que
// valga, y enseñar una que empieza a las 00:00 es enseñar una mentira ordenada.
export function escaletaDelEvento({
  horaInicio,
  horasCoctel = 0,
  horasCopas = 0,
  totalItems = 0,
  pax = 0,
  numLogistica = 1,
  horasJornada = 0,
  logisticaEquipo = [],
  viajeMin = VIAJE_POR_DEFECTO_MIN,
  calibracion = null,
} = {}) {
  if (!esHora(horaInicio)) return [];
  const t = estimarTiemposCarga({ totalItems, pax, numLogistica, horasJornada }, calibracion);

  // ── Hacia atrás desde la hora de inicio ──
  const finMontaje = sumarMinutosHora(horaInicio, -MARGEN_ANTES_MIN);
  const iniMontaje = sumarMinutosHora(finMontaje, -t.montajeMin);
  const iniViaje   = sumarMinutosHora(iniMontaje, -viajeMin);
  const iniCarga   = sumarMinutosHora(iniViaje, -t.cargaMin);
  const iniPrep    = sumarMinutosHora(iniCarga, -t.prepMin);

  const tramos = [];
  const pon = (fase, hora, minutos, extra = {}) => {
    if (minutos <= 0) return;
    tramos.push({ fase, hora, minutos, fin: sumarMinutosHora(hora, minutos), ...FASES[fase], ...extra });
  };

  pon("prep", iniPrep, t.prepMin);
  pon("carga", iniCarga, t.cargaMin);
  pon("viaje", iniViaje, viajeMin, { estimado: viajeMin === VIAJE_POR_DEFECTO_MIN });
  pon("montaje", iniMontaje, t.montajeMin);
  pon("margen", finMontaje, MARGEN_ANTES_MIN);

  // ── Hacia delante desde la hora de inicio ──
  let reloj = horaInicio;
  const coctelMin = Math.round(horasCoctel * 60);
  if (coctelMin > 0) { pon("coctel", reloj, coctelMin); reloj = sumarMinutosHora(reloj, coctelMin); }
  pon("servicio", reloj, SERVICIO_MIN);
  reloj = sumarMinutosHora(reloj, SERVICIO_MIN);
  const copasMin = Math.round(horasCopas * 60);
  if (copasMin > 0) { pon("copas", reloj, copasMin); reloj = sumarMinutosHora(reloj, copasMin); }
  pon("recogida", reloj, t.descargaMin);

  // Lo que ya se ha decidido manda sobre lo estimado, pero se avisa de la diferencia:
  // si el equipo entra a las 9 y la cuenta dice que hay que empezar a las 7:30, eso no
  // es un detalle, es hora y media que va a faltar en el montaje.
  const decidido = inicioLogistica(logisticaEquipo);
  const estimado = aMin(iniPrep);
  const desfase = decidido !== null && estimado !== null ? decidido - estimado : null;
  return tramos.map(tr => (tr.fase === "prep" && desfase !== null
    ? { ...tr, horaDecidida: logisticaEquipo.length ? sumarMinutosHora("00:00", decidido) : null, desfaseMin: desfase }
    : tr));
}

// El resumen de una línea para el WhatsApp y la cabecera: "Salida 08:15 · inicio 13:00
// · recogida hasta 21:40". Es lo que de verdad se pregunta por el grupo.
export function resumenEscaleta(tramos = []) {
  if (!tramos.length) return "";
  const primero = tramos[0];
  const ultimo = tramos[tramos.length - 1];
  const inicio = tramos.find(t => t.fase === "coctel" || t.fase === "servicio");
  return [
    `Salida ${primero.hora}`,
    inicio ? `inicio ${inicio.hora}` : "",
    `recogida hasta ${ultimo.fin}`,
  ].filter(Boolean).join(" · ");
}
