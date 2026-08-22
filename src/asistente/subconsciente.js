// ─── EL SUBCONSCIENTE ─────────────────────────────────────────────────────────
// Lo que el asistente sabe SIN que le preguntes. En OpenHuman es un proceso que corre
// por detrás mientras no estás; aquí no puede serlo —una página web no deja nada
// ejecutándose cuando la cierras— así que se calcula al abrir.
//
// Y sale ganando: es determinista, instantáneo, no gasta un token y funciona sin
// conexión. Un parte que hay que pagar y esperar es un parte que nadie mira.
//
// Tres cosas, que son las tres del suyo:
//
//   1. QUÉ HA CAMBIADO desde la última vez. Es lo que de verdad se pregunta al abrir:
//      no "qué hay" sino "qué hay que no hubiera ayer".
//   2. CÓMO VAN LOS OBJETIVOS. Contrastar lo que pasa con lo que habéis dicho que
//      importa. Sin objetivos esto no dice nada, y es correcto que no lo diga.
//   3. QUÉ TOCA HOY. Lo que se acerca y lo que le falta.
//
// Lo que NO hace: "avanzar los objetivos" solo. Un asistente que dice "he bajado la
// merma" sin que nadie haya cambiado nada es peor que uno callado. Aquí se mira y se
// avisa; el trabajo lo hacen las personas.
//
// Sin React ni nube: entran datos, sale un parte.
import { revisarProximos } from "./revision.js";
import { esTipoEvento } from "../calendario/apuntes.js";
import { hoyUTCISO, enDiasUTCISO } from "../fecha.js";
import { leerJSON, guardarJSON } from "../almacen.js";

// En UTC, como estaban escritas aquí desde el principio: ver el porqué de que no se
// unifiquen con las locales en src/fecha.js.
const hoyISO = hoyUTCISO;
const enDias = enDiasUTCISO;

// ─── LA FOTO ──────────────────────────────────────────────────────────────────
// Para saber qué ha cambiado hay que recordar cómo estaba. Se guarda lo mínimo: nombres
// y un par de cifras. Guardar los eventos enteros sería duplicar la base de datos en el
// navegador para contestar una pregunta.
export function foto(eventosGuardados = {}, apuntes = [], memoria = [], objetivos = []) {
  return {
    cuando: Date.now(),
    eventos: Object.keys(eventosGuardados).sort(),
    // Solo los apuntes que son un evento: las vacaciones y las recogidas cambian mucho
    // y avisar de ellas cada mañana es ruido.
    apuntes: apuntes.filter(a => a && esTipoEvento(a.tipo)).map(a => `${a.fecha}·${a.titulo}`).sort(),
    recuerdos: memoria.length,
    objetivos: objetivos.filter(o => o.estado === "activo").length,
  };
}

const CLAVE_FOTO = "gula_asistente_foto";

export function leerFoto() {
  const f = leerJSON(CLAVE_FOTO, null);
  return f && f.cuando ? f : null;
}

export function guardarFoto(f) {
  guardarJSON(CLAVE_FOTO, f);
  return f;
}

// ─── QUÉ HA CAMBIADO ──────────────────────────────────────────────────────────
export function queHaCambiado(antes, ahora) {
  if (!antes) return null;   // primera vez: no hay con qué comparar, y decirlo es mentir
  const nuevos = (lista, previa) => lista.filter(x => !previa.includes(x));
  const idos = (lista, previa) => previa.filter(x => !lista.includes(x));

  const cambios = {
    eventosNuevos: nuevos(ahora.eventos, antes.eventos),
    eventosIdos: idos(ahora.eventos, antes.eventos),
    apuntesNuevos: nuevos(ahora.apuntes, antes.apuntes),
    recuerdosNuevos: Math.max(0, ahora.recuerdos - antes.recuerdos),
    desde: antes.cuando,
  };
  const hayAlgo = cambios.eventosNuevos.length || cambios.eventosIdos.length ||
    cambios.apuntesNuevos.length || cambios.recuerdosNuevos;
  return hayAlgo ? cambios : null;
}

// ─── CÓMO VAN LOS OBJETIVOS ───────────────────────────────────────────────────
// Se contrasta cada objetivo con lo que se puede observar de verdad en los datos. Y
// cuando no se puede observar, se dice: un objetivo sobre el trato al cliente no sale
// de una checklist, y fingir que sí sería inventarse un progreso.
//
// Las señales son deliberadamente pocas y comprobables. Ampliarlas es añadir una fila.
const SENALES = [
  {
    como: /merma|rotura|rompe|cristaler/i,
    mira: (ctx) => {
      const con = Object.values(ctx.eventosGuardados).filter(e => e && Object.keys(e.roturas || {}).length);
      return con.length
        ? `Hay ${con.length} evento(s) con roturas apuntadas. El Resumen del Modo carga las valora en euros.`
        : "Todavía no hay roturas apuntadas en ningún evento, así que no hay con qué medirlo.";
    },
  },
  {
    como: /alquiler|silla|mesa redonda|recog/i,
    mira: (ctx) => {
      const alq = Object.entries(ctx.eventosGuardados)
        .filter(([, e]) => e && ((e.origenSillas && e.origenSillas !== "Nuestras") || (e.tipoMesa || "").includes("Redonda")))
        .filter(([, e]) => (e.fechaEvento || "") >= hoyISO());
      return alq.length
        ? `${alq.length} evento(s) próximos llevan alquiler: ${alq.map(([n]) => n).join(", ")}. Hay que pedirlo y cuadrar la recogida.`
        : "Ningún evento próximo lleva alquiler.";
    },
  },
  {
    como: /configur|a medias|formulario|dato/i,
    mira: (ctx) => {
      const flojos = revisarProximos(ctx.eventosGuardados, 30).filter(r => r.avisos.some(a => a.tono === "falta"));
      return flojos.length
        ? `${flojos.length} evento(s) próximos tienen datos sin poner: ${flojos.map(r => r.evento).join(", ")}.`
        : "Todos los eventos próximos tienen sus datos puestos.";
    },
  },
  {
    como: /hielo|bebida|sobra|consumo/i,
    mira: (ctx) => {
      const conVuelta = Object.values(ctx.eventosGuardados).filter(e => e && Object.keys(e.vueltos || {}).length);
      return conVuelta.length >= 3
        ? `Hay ${conVuelta.length} eventos con la vuelta apuntada: ya se puede calibrar la bebida desde el panel del Resumen.`
        : `Solo ${conVuelta.length} evento(s) con la vuelta apuntada. Hacen falta 3 para poder calibrar la bebida con datos reales.`;
    },
  },
];

export function comoVanLosObjetivos(objetivos = [], ctx = {}) {
  const eventosGuardados = ctx.eventosGuardados || {};
  return objetivos
    .filter(o => o.estado === "activo")
    .map(o => {
      const senal = SENALES.find(s => s.como.test(o.texto));
      return {
        objetivo: o.texto,
        // "No lo puedo medir" es una respuesta honesta y útil: dice que ese objetivo hay
        // que seguirlo por otro sitio, no que vaya bien.
        senal: senal ? senal.mira({ eventosGuardados }) : "Esto no sale de los datos de la app: lo tenéis que seguir vosotros.",
        medible: !!senal,
      };
    });
}

// ─── EL PARTE ─────────────────────────────────────────────────────────────────
export function parte({ eventosGuardados = {}, apuntes = [], memoria = [], objetivos = [], fotoAnterior = null } = {}) {
  const ahora = foto(eventosGuardados, apuntes, memoria, objetivos);
  const cambios = queHaCambiado(fotoAnterior, ahora);

  const hoy = hoyISO();
  const enUnaSemana = enDias(7);
  const estaSemana = Object.entries(eventosGuardados)
    .filter(([, e]) => e && (e.fechaEvento || "") >= hoy && (e.fechaEvento || "") <= enUnaSemana)
    .sort((a, b) => (a[1].fechaEvento || "").localeCompare(b[1].fechaEvento || ""))
    .map(([nombre, e]) => ({ nombre, fecha: e.fechaEvento, sitio: e.ubicacion || "", pax: (e.pax || 0) + (e.ninos || 0) }));

  const conProblemas = revisarProximos(eventosGuardados, 30);
  const urgentes = conProblemas.filter(r => r.avisos.some(a => a.tono === "falta"));

  return {
    foto: ahora,
    cambios,
    estaSemana,
    urgentes: urgentes.map(r => ({
      evento: r.evento, fecha: r.fecha,
      falta: r.avisos.filter(a => a.tono === "falta").map(a => a.texto),
    })),
    objetivos: comoVanLosObjetivos(objetivos, { eventosGuardados }),
    // Si no hay nada que contar, se dice. Un parte que siempre tiene algo que decir
    // acaba siendo un parte que nadie lee.
    hayAlgoQueContar: !!(cambios || estaSemana.length || urgentes.length),
  };
}
