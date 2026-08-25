// ─── LO QUE FALTA POR CONFIGURAR ────────────────────────────────────────────────
// El repaso de la noche avisa de lo que le falta a un EVENTO. Esto es lo mismo pero
// para el NEGOCIO: cosas que, sin poner, dejan la app dando números que no valen —el
// Resumen calculando el coste a 0€, el asistente sin poder contestar nada— y que nadie
// más va a decir si no lo dice esto. Pedido tal cual: que el asistente avise solo de lo
// que falta por configurar.
//
// Sin React y sin nube: entra lo que hay guardado en ESTE navegador, sale una lista con
// la misma forma que ya usa el repaso de eventos (texto, tono, comoSeArregla), para que
// Cerebro.jsx la pinte con la misma tarjeta (.cer-aviso) en vez de inventar una nueva.
//
// A propósito NO entra "ratios de personal sin ajustar": los de boda/comunión/
// corporativo son datos medidos de verdad (ver personal.js), no un hueco — avisar de
// eso sería decir que falta algo que en realidad ya está bien puesto.
import { leerTexto } from "../almacen.js";
import { leerPrecios } from "../precios.js";

// Misma clave que CLAVE_URL en Asistente.jsx: duplicada a propósito y no importada de
// allí, para no crear un import circular (Asistente.jsx ya importa Cerebro.jsx, que
// importaría este fichero, que importaría de vuelta a Asistente.jsx).
const CLAVE_URL = "gula_asistente_url";

export function avisosConfig() {
  const avisos = [];

  if (!leerTexto(CLAVE_URL)) {
    avisos.push({
      texto: "El asistente no tiene proxy configurado: no puede contestar nada todavía.",
      tono: "falta",
      comoSeArregla: "Se pone en Ajustes del asistente (el engranaje, arriba del panel).",
    });
  }

  if (!Object.keys(leerPrecios()).length) {
    avisos.push({
      texto: "No hay ningún precio cargado: el Resumen calcula el coste estimado a 0€.",
      tono: "falta",
      comoSeArregla: "Se cargan desde 💶 Precios.",
    });
  }

  return avisos;
}

// ─── LO PRIMERO QUE DICE, SI HAY ALGO PENDIENTE ─────────────────────────────────
// Pedido tal cual: que el asistente hable primero en vez de obligar a ir a mirar
// Cerebro para enterarse. Junta las dos fuentes que YA existían —lo del negocio
// (avisosConfig, arriba) y lo de cada evento (el repaso de la noche)— en una frase,
// no en una lista larga: es un saludo, no un informe. Solo tiene sentido en una charla
// NUEVA (hilo vacío en Asistente.jsx): repetirlo en cada respuesta sería spam, no un
// aviso, y por eso decide QUÉ decir pero no CUÁNDO — eso lo decide quien lo llama.
//
// Sin React: entran los avisos de negocio, el repaso (o null si no ha corrido
// todavía) y los recordatorios que tocan hoy (paraHoy(), en tareas.js), sale un texto
// o null si no hay nada que decir — que es el caso normal, y el caso normal no tiene
// por qué sonar a aviso.
// El contenido de los avisos NUNCA cambia con la personalidad —son las mismas reglas
// duras que ya no toca personalidad.js (números, alergias, lo que puede tocar)—; lo
// único que varía es la envoltura, y a mano, sin pasar por el modelo: mismo motivo que
// el resto de este fichero ("sin nube"), y la única forma de que la pestaña Humano
// suene distinta al cambiar de personalidad incluso ANTES de haber preguntado nada,
// que es justo donde vive el selector — si no, "Bromista" y "Directo" sonaban
// exactamente igual la primera vez que alguien probaba el asistente.
const ENVOLTURA_SALUDO = {
  directo: (frase) => frase,
  cercano: (frase) => `Oye, antes de nada: ${frase}`,
  bromista: (frase) => `${frase} Aviso dado, que conste.`,
  // "Casi telegráfico" (ver personalidad.js): fuera los puntos que separan frase de
  // frase, a golpe de "·" en su lugar — más corto de leer y de oír.
  parco: (frase) => frase.replace(/\.\s+/g, " · ").replace(/\.$/, ""),
};

export function saludoPendientes(avisosNegocio, repaso, recordatoriosHoy = [], personalidad = "directo") {
  const eventosConAvisos = repaso && Array.isArray(repaso.eventos)
    ? repaso.eventos.filter(e => e.avisos && e.avisos.length)
    : [];
  if (!avisosNegocio.length && !eventosConAvisos.length && !recordatoriosHoy.length) return null;

  const partes = [];
  // Los recordatorios van primero: es lo que alguien pidió que se le dijera A ÉL, en
  // concreto ("recuérdame...") — no es lo mismo que un aviso genérico del negocio o de
  // un evento, y perderlo entre esos dos sería justo lo que se pidió que no pasara.
  if (recordatoriosHoy.length) {
    partes.push(recordatoriosHoy.length === 1
      ? `Tenías apuntado: ${recordatoriosHoy[0].texto}.`
      : `Tenías apuntado: ${recordatoriosHoy.map(t => t.texto).join("; ")}.`);
  }
  if (avisosNegocio.length) partes.push(avisosNegocio.map(a => a.texto).join(" "));
  if (eventosConAvisos.length) {
    partes.push(
      `${eventosConAvisos.length} evento${eventosConAvisos.length === 1 ? "" : "s"} ` +
      `${eventosConAvisos.length === 1 ? "tiene" : "tienen"} algo sin poner (lo ves con detalle en Cerebro).`,
    );
  }
  const frase = partes.join(" ");
  const envolver = ENVOLTURA_SALUDO[personalidad] || ENVOLTURA_SALUDO.directo;
  return envolver(frase);
}
