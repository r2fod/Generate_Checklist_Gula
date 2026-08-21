// ─── HABLAR CON EL ASISTENTE ──────────────────────────────────────────────────
// El bucle: se manda la conversación al Worker, el Worker contesta con texto o con
// "quiero llamar a estas herramientas", se ejecutan AQUÍ con los datos de la app, se le
// devuelve el resultado y se vuelve a preguntar. Se repite hasta que contesta con texto.
//
// Todo lo que decide qué se puede hacer está en herramientas.js. Esto solo es la
// tubería, y por eso es corto.
import { catalogoParaModelo, ejecutar, HERRAMIENTAS } from "./herramientas.js";

// Un tope duro de vueltas. Sin él, un modelo que se empeñe en pedir la misma
// herramienta una y otra vez deja el navegador dando vueltas y la factura corriendo.
const MAX_VUELTAS = 6;

// Los proveedores que entrenan con lo que les llega. A estos NO se les manda ninguna
// herramienta que devuelva nombres de clientes, fechas o sitios: sus tokens gratuitos
// se pagan con los datos, y esos datos no son míos para regalarlos.
const ENTRENAN_CON_LO_QUE_LES_LLEGA = ["openai"];

export const SISTEMA = `Eres el asistente de una empresa de catering. Ayudas al equipo con sus eventos: qué hay que cargar, cuánta bebida hace falta, cuánta gente, a qué hora sale el camión.

Cómo trabajas:
- Contestas en español, corto y al grano. Sin preámbulos ni resúmenes finales.
- Los números SIEMPRE salen de las herramientas, nunca de tu cabeza. Si te preguntan cuánta cerveza hace falta, llamas a calcular_bebida; no estimas.
- Si no sabes el nombre exacto de un evento, buscas antes de rendirte.
- Si una herramienta devuelve un error, lo dices tal cual y propones qué hacer. No te lo inventas ni disimulas.
- No puedes cambiar nada todavía: solo consultar. Si te piden modificar algo, dilo claro y explica dónde se hace en la app.
- Las alergias son lo más serio que manejas. Si aparecen, se dicen enteras y las primeras.`;

// Una conversación viva. Se guarda la lista de mensajes en el formato neutro que
// entiende el Worker; la traducción a cada proveedor es cosa suya.
export function nuevaConversacion() { return []; }

// Manda un mensaje y devuelve { mensajes, respuesta, pasos }. "pasos" son las
// herramientas que se han usado, para poder enseñarlas: un asistente que da un número
// sin decir de dónde sale es un asistente en el que no se puede confiar.
export async function preguntar({
  texto, mensajes = [], contexto = {}, proveedor = "gemini",
  url, token, onPaso,
}) {
  if (!url) throw new Error("El asistente no está configurado: falta la dirección del Worker.");
  const soloSinDatos = ENTRENAN_CON_LO_QUE_LES_LLEGA.includes(proveedor);
  const herramientas = catalogoParaModelo(soloSinDatos);
  const conversacion = [...mensajes, { rol: "usuario", contenido: texto }];
  const pasos = [];

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sistema: SISTEMA, mensajes: conversacion, herramientas, proveedor }),
    });
    const d = await r.json().catch(() => ({ error: `El asistente ha contestado algo ilegible (${r.status}).` }));
    if (!r.ok || d.error) throw new Error(d.error || `El asistente ha fallado (${r.status}).`);

    conversacion.push({ rol: "asistente", contenido: d.texto || "", llamadas: d.llamadas || [] });

    if (!d.llamadas || !d.llamadas.length) {
      return { mensajes: conversacion, respuesta: d.texto || "", pasos, proveedor: d.proveedor || proveedor };
    }

    // Se ejecutan aquí, en el navegador, con los datos de la app. El modelo no ve la
    // base de datos: pide por nombre y se le contesta.
    for (const llamada of d.llamadas) {
      // Un proveedor que pide una herramienta con datos cuando no se le ofreció ninguna
      // no se atiende: da igual por qué lo haya hecho.
      if (soloSinDatos && HERRAMIENTAS[llamada.nombre] && HERRAMIENTAS[llamada.nombre].datos) {
        conversacion.push({ rol: "herramienta", id: llamada.id, nombre: llamada.nombre,
          contenido: { error: "Esa herramienta no está disponible con este proveedor porque devuelve datos de clientes." } });
        continue;
      }
      const resultado = ejecutar(llamada.nombre, llamada.argumentos, contexto);
      pasos.push({ nombre: llamada.nombre, argumentos: llamada.argumentos, resultado });
      if (onPaso) onPaso({ nombre: llamada.nombre, argumentos: llamada.argumentos });
      conversacion.push({ rol: "herramienta", id: llamada.id, nombre: llamada.nombre, contenido: resultado });
    }
  }

  // Se acabaron las vueltas sin una respuesta. Se dice, en vez de devolver un hueco.
  return {
    mensajes: conversacion,
    respuesta: "Me he quedado dando vueltas sin llegar a una respuesta. Prueba a preguntarlo más concreto.",
    pasos,
    proveedor,
  };
}
