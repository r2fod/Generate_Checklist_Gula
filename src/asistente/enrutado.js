// ─── QUIÉN CONTESTA CADA PREGUNTA ─────────────────────────────────────────────
// Con un proveedor no hay nada que decidir. Con dos o tres, elegir a mano en cada
// pregunta es incómodo y además se elige mal: nadie va a pararse a pensar si "¿cuánto
// hielo?" merece el modelo caro. Esto lo decide solo.
//
// Tres cosas mandan, en este orden:
//
//   1. QUÉ ESTÁ CONFIGURADO. El Worker dice en cada respuesta qué proveedores tienen
//      clave. Mandar una pregunta a uno sin configurar es comerse un error seguro.
//
//   2. LOS DATOS. Si la pregunta va a necesitar nombres de clientes, fechas o sitios,
//      OpenAI queda fuera: sus tokens gratuitos se pagan compartiendo lo que le llega
//      para entrenar. Esta regla no se salta ni aunque sea el único disponible — antes
//      se contesta que no se puede.
//
//   3. LO QUE CUESTA. Gemini es gratis y llega para casi todo. El de pago solo cuando la
//      pregunta lo pide de verdad: comparar, recomendar, explicar un porqué. Preguntar
//      "¿qué tengo pendiente?" al modelo caro es tirar dinero.
//
// Y si el elegido falla —sin cuota, caído, un 500—, se pasa al siguiente en vez de
// dejar a la persona mirando un error. Eso vale para hoy: la capa gratuita de Gemini
// tiene tope por minuto y se toca preguntando tres cosas seguidas.
//
// Sin React y sin red: entra una pregunta, sale un nombre.

import { sinTildes } from "../texto.js";

// El orden por defecto: primero lo gratis, luego lo bueno, luego lo limitado.
export const ORDEN = ["gemini", "claude", "openai", "compatible"];

// Los que NO pueden ver datos de clientes. Es la misma regla que ya aplica el catálogo
// de herramientas; aquí se usa para no mandarles ni la pregunta.
export const SIN_DATOS_DE_CLIENTES = ["openai"];

// Palabras que dicen que la pregunta va sobre EL NEGOCIO y no sobre una cuenta suelta.
// No hace falta afinarlo: equivocarse hacia "lleva datos" no rompe nada —solo usa un
// proveedor u otro—, y equivocarse hacia el otro lado enseñaría clientes a quien no debe.
const HABLA_DE_DATOS = [
  "evento", "eventos", "boda", "bodas", "comunion", "comunión", "corporativo",
  "cumpleanos", "cumpleaños", "produccion", "producción", "rodaje",
  "calendario", "checklist", "pendiente", "pendientes", "cliente", "clientes",
  "finca", "sitio", "escaleta", "camion", "camión", "equipo", "septiembre",
  "octubre", "noviembre", "diciembre", "enero", "febrero", "marzo", "abril",
  "mayo", "junio", "julio", "agosto", "manana", "mañana", "sabado", "sábado",
  "domingo", "semana", "cerebro", "recuerda", "apunta", "aprende",
];

// Y las que dicen que hace falta pensar, no solo buscar un número. Son las preguntas
// donde un modelo mejor se nota; el resto las contesta cualquiera igual de bien.
const PIDE_CABEZA = [
  "recomienda", "recomiendas", "recomendacion", "recomendación", "compara",
  "comparar", "por que", "por qué", "porque", "mejor", "peor", "conviene",
  "deberia", "debería", "opinas", "opinion", "opinión", "analiza", "explica",
  "diferencia", "merece la pena", "que hago", "qué hago", "ayudame a decidir",
];

const tieneAlguna = (texto, lista) => {
  const t = ` ${sinTildes(texto)} `;
  return lista.some(p => t.includes(` ${sinTildes(p)} `) || t.includes(sinTildes(p)));
};

export const preguntaLlevaDatos = (texto) => tieneAlguna(texto, HABLA_DE_DATOS);
export const preguntaPideCabeza = (texto) => tieneAlguna(texto, PIDE_CABEZA);

// Los proveedores que pueden atender ESTA pregunta, en el orden en que hay que
// probarlos. El primero es el que se usa; el resto son el respaldo si falla.
//
// "disponibles" viene del Worker. Sin él —la primera pregunta, antes de saber nada— se
// supone Gemini, que es el que se monta por defecto.
export function candidatos(texto, disponibles = ["gemini"]) {
  const hay = ORDEN.filter(p => disponibles.includes(p));
  if (!hay.length) return [];

  const conDatos = preguntaLlevaDatos(texto);
  // La regla que no se salta: si la pregunta va sobre clientes, los que entrenan con lo
  // que reciben quedan fuera aunque sean los únicos que hay.
  const permitidos = conDatos ? hay.filter(p => !SIN_DATOS_DE_CLIENTES.includes(p)) : hay;
  if (!permitidos.length) return [];

  // Si la pregunta pide pensar y hay un modelo mejor configurado, ese primero. Si no,
  // el orden de siempre: lo gratis por delante.
  if (preguntaPideCabeza(texto)) {
    const buenos = permitidos.filter(p => p === "claude" || p === "compatible");
    if (buenos.length) return [...buenos, ...permitidos.filter(p => !buenos.includes(p))];
  }
  return permitidos;
}

// El primero, o "" si la pregunta no la puede atender nadie de los que hay.
export function elige(texto, disponibles) {
  return candidatos(texto, disponibles)[0] || "";
}

// Por qué se ha elegido ese, en una línea. Se enseña debajo de la respuesta: un
// asistente que cambia de modelo sin decirlo hace que nadie entienda por qué a veces
// tarda más o contesta distinto.
export function porQue(texto, elegido, disponibles = []) {
  if (disponibles.length <= 1) return "";
  if (preguntaPideCabeza(texto) && (elegido === "claude" || elegido === "compatible")) {
    return "pide comparar o recomendar";
  }
  if (preguntaLlevaDatos(texto) && SIN_DATOS_DE_CLIENTES.includes("openai") && disponibles.includes("openai")) {
    return "lleva datos de clientes";
  }
  return "";
}

// Un fallo que merece probar con otro proveedor: sin cuota, saturado, caído o un error
// suyo. Un 400 no: eso es que la petición está mal y va a estar igual de mal en todos.
export function mereceOtroIntento(mensaje) {
  return /429|quota|rate.?limit|exhaust|overload|unavailable|timeout|50\d|resource.?has.?been/i
    .test(String(mensaje || ""));
}
