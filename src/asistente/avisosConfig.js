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
