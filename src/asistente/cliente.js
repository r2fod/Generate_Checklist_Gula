// ─── HABLAR CON EL ASISTENTE ──────────────────────────────────────────────────
// El bucle: se manda la conversación al Worker, el Worker contesta con texto o con
// "quiero llamar a estas herramientas", se ejecutan AQUÍ con los datos de la app, se le
// devuelve el resultado y se vuelve a preguntar. Se repite hasta que contesta con texto.
//
// Todo lo que decide qué se puede hacer está en herramientas.js. Esto solo es la
// tubería, y por eso es corto.
import { catalogoParaModelo, ejecutar, llevaDatos } from "./herramientas.js";
import { contextoPlegado } from "./arbol.js";
import { paraElContexto as objetivosParaElContexto } from "./objetivos.js";
import { paraElContexto as tareasParaElContexto } from "./tareas.js";
import { comprimir } from "./comprimir.js";
import { candidatos, mereceOtroIntento, porQue } from "./enrutado.js";
import { comoContarlo, NIVEL_POR_DEFECTO } from "./permisos.js";

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
- Las alergias son lo más serio que manejas. Si aparecen, se dicen enteras y las primeras.

Tienes memoria. Cuando te corrijan o te cuenten cómo trabajan, lo guardas con recordar: una frase corta, concreta y en tercera persona. No guardes lo que ya sale de un cálculo (cuánta cerveza, cuánto hielo) ni datos de un evento suelto que ya están en la app; guarda lo que NO está escrito en ninguna parte y servirá el mes que viene. Si algo que recordabas resulta ser falso, lo borras con olvidar.`;

// Lo aprendido va al final del mensaje de sistema, aparte y marcado. Aparte porque no
// son órdenes: son cosas que el equipo ha contado y pueden estar mal apuntadas, y el
// modelo tiene que poder contrastarlas con lo que devuelven las herramientas en vez de
// creérselas por encima de un cálculo.
function conMemoria(sistema, memoria, objetivos, tareas) {
  const { texto, ids } = contextoPlegado(memoria || []);
  const metas = objetivosParaElContexto(objetivos || []);
  let salida = sistema;

  // Los objetivos van ANTES que la memoria y por delante de todo: son lo que decide qué
  // priorizar, no un dato más. Sin ellos, "¿cómo va el mes?" se contesta con una lista
  // de eventos en vez de con cómo va lo que habéis dicho que importa.
  if (metas) {
    salida += `

--- LO QUE LE IMPORTA A ESTE EQUIPO AHORA ---
Tenlo presente al contestar: si algo de lo que ves afecta a esto, dilo aunque no te lo hayan preguntado.

${metas}`;
  }

  const pendientes = tareasParaElContexto(tareas || []);
  if (pendientes) {
    salida += `

--- LO QUE ESTÁ APUNTADO POR HACER ---
Si lo que te preguntan tiene que ver con algo de esto, dilo. Y no vuelvas a apuntar lo que ya está aquí.

${pendientes}`;
  }

  if (texto) {
    salida += `

--- LO QUE HAS APRENDIDO DE ESTE EQUIPO ---
Esto te lo han contado ellos. Vale para dar contexto y para avisar, pero NO manda sobre lo que devuelve una herramienta: si el cálculo dice una cosa y esto dice otra, das las dos y preguntas. Lo que va entre corchetes es dónde se aprendió.

${texto}`;
  }

  return { sistema: salida, ids };
}

// Una conversación viva. Se guarda la lista de mensajes en el formato neutro que
// entiende el Worker; la traducción a cada proveedor es cosa suya.
export function nuevaConversacion() { return []; }

// Manda un mensaje y devuelve { mensajes, respuesta, pasos }. "pasos" son las
// herramientas que se han usado, para poder enseñarlas: un asistente que da un número
// sin decir de dónde sale es un asistente en el que no se puede confiar.
// Una vuelta completa con UN proveedor. La de fuera se encarga de elegirlo y de
// reintentar con otro; esta solo habla.
export async function preguntar({
  texto, mensajes = [], contexto = {}, proveedor = "gemini",
  url, token, onPaso, onUsoMemoria,
}) {
  if (!url) throw new Error("El asistente no está configurado: falta la dirección del Worker.");
  const soloSinDatos = ENTRENAN_CON_LO_QUE_LES_LLEGA.includes(proveedor);
  const nivel = contexto.nivel || NIVEL_POR_DEFECTO;
  const herramientas = catalogoParaModelo(soloSinDatos, contexto.conectores || {}, nivel);
  const conversacion = [...mensajes, { rol: "usuario", contenido: texto }];
  const pasos = [];
  // Lo aprendido viaja en cada pregunta; los ids vuelven para poder reforzar lo que de
  // verdad se ha usado, que es lo que separa un recuerdo útil de uno que alguien apuntó
  // una vez y no volvió a hacer falta.
  // Lo que puede y no puede hacer se le dice en el sistema. Si no lo sabe, propone
  // cosas que no puede hacer y la conversación se va en explicar por qué no.
  const conNivel = `${SISTEMA}\n\n${comoContarlo(nivel)}`;
  const { sistema, ids: recordados } = conMemoria(conNivel, contexto.memoria, contexto.objetivos, contexto.tareas);
  const usoTotal = { entrada: 0, salida: 0 };

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sistema, mensajes: conversacion, herramientas, proveedor }),
    });
    const d = await r.json().catch(() => ({ error: `El asistente ha contestado algo ilegible (${r.status}).` }));
    if (!r.ok || d.error) {
      // El Worker dice, hasta cuando falla, qué proveedores tienen clave. Se cuelga del
      // error para que quien reintenta sepa con cuál probar.
      const fallo = new Error(d.error || `El asistente ha fallado (${r.status}).`);
      fallo.disponibles = d.disponibles || null;
      throw fallo;
    }

    if (d.uso) { usoTotal.entrada += d.uso.entrada || 0; usoTotal.salida += d.uso.salida || 0; }
    conversacion.push({ rol: "asistente", contenido: d.texto || "", llamadas: d.llamadas || [] });

    if (!d.llamadas || !d.llamadas.length) {
      if (onUsoMemoria && recordados.length) onUsoMemoria(recordados);
      return {
        mensajes: conversacion, respuesta: d.texto || "", pasos,
        proveedor: d.proveedor || proveedor, recordados,
        disponibles: d.disponibles || null,
        // Lo que ha costado, para poder contarlo. Se suma lo de TODAS las vueltas: una
        // pregunta que llama a tres herramientas son cuatro idas y venidas al modelo, y
        // contar solo la última diría que costó la cuarta parte de lo que costó.
        uso: usoTotal,
      };
    }

    // Se ejecutan aquí, en el navegador, con los datos de la app. El modelo no ve la
    // base de datos: pide por nombre y se le contesta.
    for (const llamada of d.llamadas) {
      // Un proveedor que pide una herramienta con datos cuando no se le ofreció ninguna
      // no se atiende: da igual por qué lo haya hecho.
      if (soloSinDatos && llevaDatos(llamada.nombre, contexto.conectores || {})) {
        conversacion.push({ rol: "herramienta", id: llamada.id, nombre: llamada.nombre,
          contenido: { error: "Esa herramienta no está disponible con este proveedor porque devuelve datos de clientes." } });
        continue;
      }
      const crudo = ejecutar(llamada.nombre, llamada.argumentos, contexto);
      // Se comprime ANTES de meterlo en la conversación, no al mandarlo: el resultado se
      // queda ahí y viaja otra vez en cada pregunta siguiente. Comprimir a la salida
      // ahorraría una vez; comprimir aquí ahorra todas.
      const { resultado, antes, despues } = comprimir(crudo);
      pasos.push({ nombre: llamada.nombre, argumentos: llamada.argumentos, resultado, antes, despues });
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


// ─── CON ENRUTADO AUTOMÁTICO ──────────────────────────────────────────────────
// Elige el proveedor según lo que se pregunte y lo que haya configurado, y si el
// elegido se cae —sin cuota, saturado— prueba con el siguiente en vez de dejar a la
// persona mirando un error. Es lo que de verdad se usa desde la pantalla; preguntar()
// se queda para cuando alguien elige uno a mano.
export async function preguntarAuto({ texto, disponibles, onProveedor, ...resto }) {
  const lista = candidatos(texto, disponibles && disponibles.length ? disponibles : ["gemini"]);
  if (!lista.length) {
    throw new Error("Esa pregunta lleva datos de clientes y el único proveedor configurado entrena con lo que recibe. Configura Gemini o Claude en el proxy.");
  }

  let ultimo = null;
  for (let i = 0; i < lista.length; i++) {
    const proveedor = lista[i];
    if (onProveedor) onProveedor(proveedor, porQue(texto, proveedor, disponibles || []));
    try {
      const r = await preguntar({ ...resto, texto, proveedor });
      return { ...r, motivo: porQue(texto, proveedor, r.disponibles || disponibles || []) };
    } catch (e) {
      ultimo = e;
      // Un 400 no se reintenta: la petición está mal y va a estar igual de mal en todos.
      // Reintentarlo cuatro veces solo tarda cuatro veces más en dar el mismo error.
      if (i === lista.length - 1 || !mereceOtroIntento(e.message)) throw e;
    }
  }
  throw ultimo;
}
