// ─── EL PROXY DEL ASISTENTE ───────────────────────────────────────────────────
// Un Cloudflare Worker de una sola pieza. Existe por una razón concreta: la app es un
// sitio estático en GitHub Pages y el repositorio es público, así que una clave de API
// metida en el bundle la lee cualquiera y la gasta cualquiera. Aquí las claves viven
// como secretos del Worker y nunca salen.
//
// Lo que hace, en orden:
//   1. Comprueba que quien pregunta tiene sesión del equipo (el mismo Firebase Auth de
//      la app). Sin esto, quien descubra la URL del Worker se come la cuota.
//   2. Traduce la conversación al formato del proveedor elegido y se la manda.
//   3. Devuelve SIEMPRE la misma forma: { texto, llamadas }. La app no sabe con quién
//      está hablando, y por eso se puede cambiar de proveedor sin tocar la app.
//
// Las herramientas NO se ejecutan aquí. El Worker devuelve "quiero llamar a esto con
// estos argumentos" y es la app la que lo ejecuta con sus datos, en el navegador. El
// modelo no ve Firestore ni tiene por dónde entrar.
//
// Va sin dependencias y en un fichero a propósito: así se pega tal cual en el panel de
// Cloudflare sin instalar nada. Ver worker/README.md.

import { repasar, DIAS_VISTA } from "./repaso.js";
import { CLAVES_VOZ_GEMINI } from "../src/asistente/vozGemini.js";

const CORS = (origen) => ({
  "Access-Control-Allow-Origin": origen,
  "Access-Control-Allow-Headers": "content-type, authorization",
  // GET además de POST: el repaso a mano se pide con GET, y si no está aquí el
  // navegador bloquea la respuesta aunque el Worker conteste bien.
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
});

const json = (datos, estado, origen) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json", ...CORS(origen) },
  });

// Solo los sitios de la app. Un Worker que contesta a cualquier origen es un Worker que
// acaba en la extensión de otro.
function origenPermitido(req, env) {
  const permitidos = (env.ORIGENES || "").split(",").map(s => s.trim()).filter(Boolean);
  const origen = req.headers.get("Origin") || "";
  if (!permitidos.length) return origen || "*";      // sin configurar: no se bloquea, pero conviene ponerlo
  return permitidos.includes(origen) ? origen : "";
}

// ─── QUIÉN PREGUNTA ───────────────────────────────────────────────────────────
// Se verifica el token de Firebase contra el propio Firebase en vez de comprobar la
// firma a mano: es una petición y no hay que meter criptografía ni claves públicas en
// el Worker. La FIREBASE_API_KEY es la del cliente web, que ya es pública (va en el
// bundle de la app): aquí no se está guardando ningún secreto nuevo.
//
// Devuelve { usuario } o { fallo }, y el fallo dice CUÁL de las tres cosas ha pasado. La
// primera versión devolvía null en los tres casos y contestaba "hace falta sesión": con
// eso, un usuario que SÍ tenía sesión no tenía forma de saber si el problema era su
// sesión, la clave de Firebase mal pegada o el token caducado. Tres arreglos distintos
// bajo el mismo mensaje es un mensaje que no sirve.
async function quienEs(idToken, env) {
  if (!idToken) {
    return { fallo: "No ha llegado ninguna sesión. Entra con el usuario del equipo en la app; si ya has entrado, cierra sesión y vuelve a entrar." };
  }
  // La clave se recorta: pegada desde el panel se lleva saltos de línea y espacios con
  // una facilidad pasmosa, y eso rompe la URL sin decir por qué.
  const clave = String(env.FIREBASE_API_KEY || "").trim();
  if (!clave) return { fallo: "Este Worker no tiene FIREBASE_API_KEY configurada." };

  let r;
  try {
    r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(clave)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: String(idToken).trim() }) },
    );
  } catch (e) {
    return { fallo: `No se ha podido comprobar la sesión con Firebase: ${e && e.message ? e.message : e}` };
  }

  if (!r.ok) {
    // El motivo de Google se devuelve tal cual. "API_KEY_INVALID" y "INVALID_ID_TOKEN"
    // piden cosas opuestas, y sin verlo se prueban las dos a ciegas.
    const detalle = await r.text().catch(() => "");
    const motivo = (detalle.match(/"message"\s*:\s*"([^"]+)"/) || [])[1] || `HTTP ${r.status}`;
    // Google escribe lo mismo de varias formas según el caso: "API_KEY_INVALID" en unos
    // sitios y "API key not valid" en otros. Buscando solo la primera, el aviso de clave
    // mala salía por la rama de "cierra sesión y vuelve a entrar", que manda a arreglar
    // justo lo que no estaba roto.
    if (/api[ _-]?key|referer|referrer|permission/i.test(motivo)) {
      return { fallo: `Firebase rechaza la clave del Worker (${motivo}). Revisa FIREBASE_API_KEY en Settings → Variables: tiene que ser la apiKey de Firebase, no la de Gemini — las dos empiezan por AIza y se confunden con una facilidad pasmosa.` };
    }
    return { fallo: `Firebase no acepta la sesión (${motivo}). Suele arreglarse cerrando sesión en la app y volviendo a entrar.` };
  }

  const d = await r.json().catch(() => null);
  const u = d && d.users && d.users[0];
  return u ? { usuario: { uid: u.localId, email: u.email || "" } } : { fallo: "Firebase no reconoce a ese usuario." };
}

// ─── LOS TRES PROVEEDORES ─────────────────────────────────────────────────────
// Cada uno pide la conversación y las herramientas en su propio formato y contesta en
// el suyo. Aquí se traduce a la ida y a la vuelta, y la app ve siempre lo mismo.

// Gemini. Es el que va por defecto: tiene capa gratuita de verdad.
//
// Varias claves, una por cuenta de Google: GEMINI_API_KEY es la única obligatoria;
// GEMINI_API_KEY_2 y GEMINI_API_KEY_3 son opcionales, cada una con su propia cuota
// gratis diaria aparte. Si la que se está usando se agota, Google contesta 429
// (RESOURCE_EXHAUSTED) y aquí se prueba con la siguiente antes de rendirse — sin eso,
// la primera cuenta que llegue a su tope tira abajo Gemini entero el resto del día,
// aunque las otras dos sigan con cuota de sobra.
export function clavesGemini(env) {
  return [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3].filter(Boolean);
}

async function gemini(cuerpo, env) {
  // El nombre del modelo caduca. Google retiró gemini-2.5-flash "para cuentas nuevas"
  // sin avisar, y el Worker contestaba un 404 que no decía nada de por qué. Por eso el
  // valor de aquí es solo el punto de partida: GEMINI_MODEL lo pisa sin tocar el código,
  // que es lo que hace falta el día que este también caduque.
  const modelo = env.GEMINI_MODEL || "gemini-3.6-flash";
  const contenidos = cuerpo.mensajes.map(m => {
    if (m.rol === "herramienta") {
      return { role: "user", parts: [{ functionResponse: { name: m.nombre, response: { resultado: m.contenido } } }] };
    }
    if (m.rol === "asistente" && m.llamadas && m.llamadas.length) {
      // La "firma" vuelve pegada a la llamada. Gemini 3.6 la manda con cada functionCall
      // y EXIGE que se le devuelva tal cual al continuar la conversación: sin ella
      // contesta un 400 y no ejecuta nada. Es suyo y opaco, así que ni se mira ni se
      // toca, solo se guarda y se devuelve.
      return {
        role: "model",
        parts: m.llamadas.map(l => ({
          functionCall: { name: l.nombre, args: l.argumentos },
          ...(l.firma ? { thoughtSignature: l.firma } : {}),
        })),
      };
    }
    return { role: m.rol === "asistente" ? "model" : "user", parts: [{ text: String(m.contenido || "") }] };
  });
  const cuerpoGemini = JSON.stringify({
    contents: contenidos,
    systemInstruction: { parts: [{ text: cuerpo.sistema }] },
    tools: [{ functionDeclarations: cuerpo.herramientas }],
  });

  const claves = clavesGemini(env);
  let ultimoFallo;
  for (let i = 0; i < claves.length; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${claves[i]}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: cuerpoGemini },
    );
    if (r.ok) {
      const d = await r.json();
      const partes = (((d.candidates || [])[0] || {}).content || {}).parts || [];
      const u = d.usageMetadata || {};
      return {
        uso: { entrada: u.promptTokenCount || 0, salida: u.candidatesTokenCount || 0 },
        texto: partes.filter(p => p.text).map(p => p.text).join("").trim(),
        llamadas: partes.filter(p => p.functionCall).map((p, i2) => ({
          id: `g${i2}`,
          // Gemini a veces devuelve el nombre con un prefijo suyo ("default_api:que_falta").
          // La app busca la herramienta por su nombre exacto, así que se limpia aquí: si no,
          // contesta "no existe ninguna herramienta que se llame así" y no es verdad.
          nombre: String(p.functionCall.name || "").split(":").pop(),
          argumentos: p.functionCall.args || {},
          firma: p.thoughtSignature || "",
        })),
      };
    }
    ultimoFallo = new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
    // Solo se prueba la siguiente CLAVE si el fallo es DE CUOTA. Cualquier otro error
    // (clave mal puesta, modelo retirado, petición mal formada) es el mismo fallo para
    // las tres cuentas — insistir con otra clave solo tardaría más en decir lo mismo.
    if (r.status !== 429) throw ultimoFallo;
  }
  throw ultimoFallo;
}

// ─── VOZ NATURAL (Gemini TTS) ─────────────────────────────────────────────────
// Un extra sobre el chat, no un proveedor más: la app sigue funcionando con la voz del
// propio navegador si esto falla o no está configurado (ver src/asistente/voz.js). Por
// eso reutiliza las MISMAS claves de Gemini que ya usa el chat (clavesGemini, arriba):
// no hace falta pegar ningún secreto nuevo en el panel de Cloudflare para tener voz más
// natural, si ya se tiene Gemini puesto.
//
// Gemini devuelve audio en crudo (PCM, sin envolver en WAV ni en nada reproducible tal
// cual) — envolverlo es cosa del navegador (ver pcmAUrlDeAudio en voz.js), aquí solo se
// pasa tal cual junto con la frecuencia real que diga el mimeType, por si Google la
// cambia algún día sin avisar (como ya ha pasado con nombres de modelo, ver `gemini`
// arriba).
// Qué voz usar, en un sitio aparte y exportado para poder probarlo sin llamar a
// Gemini de verdad — mismo motivo que clavesGemini(). Quien pregunta puede elegir la
// suya desde los Ajustes del asistente (ver vozGemini.js); validada aquí otra vez —no
// basta con que el cliente ya la valide, un cliente cualquiera podría mandar lo que
// quisiera— para no colarle a Gemini un voiceName inventado. Sin elegir ninguna válida,
// manda GEMINI_TTS_VOZ como hasta ahora, y a falta de eso, "Kore".
export function vozElegida(vozCliente, env) {
  return (CLAVES_VOZ_GEMINI.includes(vozCliente) ? vozCliente : null) || env.GEMINI_TTS_VOZ || "Kore";
}

async function vozDeGemini(texto, env, vozCliente) {
  // Sonaba a voz del navegador incluso con Gemini configurado: el modelo por defecto
  // de antes (gemini-2.5-flash-preview-tts) ya no está — Google lo ha ido moviendo a
  // gemini-3.1-flash-tts-preview (confirmado contra la documentación y el .proto
  // oficial en agosto de 2026) —, así que la llamada fallaba con un error normal
  // (no de cuota, un 404), vozDeGemini() lo lanzaba, el Worker contestaba 502 y
  // voz.js caía en silencio a la voz local — sin ningún aviso visible de que la nube
  // nunca llegaba a usarse. Mismo motivo que ya obligó a poner GEMINI_MODEL aparte
  // para el chat: el nombre del modelo caduca, así que GEMINI_TTS_MODEL sigue siendo
  // la vía para pisarlo sin tocar código el día que esto también cambie.
  const modelo = env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
  const voz = vozElegida(vozCliente, env);
  const claves = clavesGemini(env);
  let ultimoFallo;
  for (let i = 0; i < claves.length; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${claves[i]}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: texto }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
          },
        }),
      },
    );
    if (r.ok) {
      const d = await r.json();
      const parte = ((((d.candidates || [])[0] || {}).content || {}).parts || [])[0];
      const datos = parte && parte.inlineData;
      if (!datos || !datos.data) throw new Error("Gemini no ha devuelto ningún audio.");
      const frecuencia = Number((String(datos.mimeType || "").match(/rate=(\d+)/) || [])[1]) || 24000;
      return { audio: datos.data, frecuencia };
    }
    ultimoFallo = new Error(`Gemini TTS ${r.status}: ${(await r.text()).slice(0, 300)}`);
    // Mismo criterio que en `gemini`: solo se prueba la siguiente clave si es cuota.
    if (r.status !== 429) throw ultimoFallo;
  }
  throw ultimoFallo;
}

// Claude. El de más calidad, y el que se paga por token.
async function claude(cuerpo, env) {
  const mensajes = [];
  cuerpo.mensajes.forEach(m => {
    if (m.rol === "herramienta") {
      mensajes.push({ role: "user", content: [{ type: "tool_result", tool_use_id: m.id, content: JSON.stringify(m.contenido) }] });
    } else if (m.rol === "asistente" && m.llamadas && m.llamadas.length) {
      mensajes.push({ role: "assistant", content: [
        ...(m.contenido ? [{ type: "text", text: m.contenido }] : []),
        ...m.llamadas.map(l => ({ type: "tool_use", id: l.id, name: l.nombre, input: l.argumentos })),
      ] });
    } else {
      mensajes.push({ role: m.rol === "asistente" ? "assistant" : "user", content: String(m.contenido || "") });
    }
  });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-opus-5",
      max_tokens: 2048,
      system: cuerpo.sistema,
      messages: mensajes,
      tools: cuerpo.herramientas.map(h => ({
        name: h.name, description: h.description, input_schema: h.parameters || { type: "object", properties: {} },
      })),
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const bloques = d.content || [];
  const u = d.usage || {};
  return {
    uso: { entrada: u.input_tokens || 0, salida: u.output_tokens || 0 },
    texto: bloques.filter(b => b.type === "text").map(b => b.text).join("").trim(),
    llamadas: bloques.filter(b => b.type === "tool_use").map(b => ({ id: b.id, nombre: b.name, argumentos: b.input || {} })),
  };
}

// Cualquier cosa que hable el dialecto de OpenAI, que a estas alturas es casi todo:
// OpenAI, OpenRouter (cientos de modelos con una sola clave), Groq, DeepSeek, Together,
// Mistral, LM Studio y hasta Ollama. Por eso está escrito UNA vez y parametrizado: el
// proveedor "compatible" y el de OpenAI son este mismo código con otra dirección.
//
// El de OpenAI lleva además una condición: sus tokens gratuitos se pagan compartiendo
// lo que le llega para entrenar, así que la app solo le ofrece herramientas que no
// devuelven datos de clientes (ver cliente.js). Aquí no se puede comprobar —el Worker no
// sabe qué hace cada herramienta— y por eso la barrera vive allí, donde sí se sabe.
function dialectoOpenAI({ base, clave, modelo }) {
  return async (cuerpo) => {
    const mensajes = [{ role: "system", content: cuerpo.sistema }];
    cuerpo.mensajes.forEach(m => {
      if (m.rol === "herramienta") {
        mensajes.push({ role: "tool", tool_call_id: m.id, content: JSON.stringify(m.contenido) });
      } else if (m.rol === "asistente" && m.llamadas && m.llamadas.length) {
        mensajes.push({
          role: "assistant", content: m.contenido || null,
          tool_calls: m.llamadas.map(l => ({ id: l.id, type: "function", function: { name: l.nombre, arguments: JSON.stringify(l.argumentos) } })),
        });
      } else {
        mensajes.push({ role: m.rol === "asistente" ? "assistant" : "user", content: String(m.contenido || "") });
      }
    });
    const r = await fetch(`${String(base).replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${clave}` },
      body: JSON.stringify({
        model: modelo,
        messages: mensajes,
        tools: cuerpo.herramientas.map(h => ({ type: "function", function: { name: h.name, description: h.description, parameters: h.parameters || { type: "object", properties: {} } } })),
      }),
    });
    if (!r.ok) throw new Error(`${modelo} ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    const m = ((d.choices || [])[0] || {}).message || {};
    const u = d.usage || {};
    return {
      uso: { entrada: u.prompt_tokens || 0, salida: u.completion_tokens || 0 },
      texto: (m.content || "").trim(),
      llamadas: (m.tool_calls || []).map(t => ({
        id: t.id, nombre: t.function.name,
        argumentos: (() => { try { return JSON.parse(t.function.arguments || "{}"); } catch (e) { return {}; } })(),
      })),
    };
  };
}

// ─── EL REGISTRO ──────────────────────────────────────────────────────────────
// Añadir un proveedor es añadir una fila. "clave" es el secreto sin el que no se puede
// usar, y "habla" recibe el entorno y devuelve la función que habla con él.
const PROVEEDORES = {
  gemini: {
    clave: "GEMINI_API_KEY",
    habla: (env) => (cuerpo) => gemini(cuerpo, env),
  },
  claude: {
    clave: "ANTHROPIC_API_KEY",
    habla: (env) => (cuerpo) => claude(cuerpo, env),
  },
  openai: {
    clave: "OPENAI_API_KEY",
    habla: (env) => dialectoOpenAI({
      base: "https://api.openai.com/v1",
      clave: env.OPENAI_API_KEY,
      modelo: env.OPENAI_MODEL || "gpt-4o-mini",
    }),
  },
  // El hueco abierto: pones una dirección y una clave y ya está. Con OpenRouter son
  // cientos de modelos con una sola cuenta; con Groq o DeepSeek, los suyos; y si algún
  // día tienes Ollama en un ordenador al que se llegue desde fuera, también.
  compatible: {
    clave: "COMPATIBLE_API_KEY",
    // Sin dirección no hay a dónde llamar, así que este pide dos cosas y no una.
    ademas: "COMPATIBLE_URL",
    habla: (env) => dialectoOpenAI({
      base: env.COMPATIBLE_URL,
      clave: env.COMPATIBLE_API_KEY,
      modelo: env.COMPATIBLE_MODEL || "",
    }),
  },
};


// ─── DIAGNÓSTICO ──────────────────────────────────────────────────────────────
// "API key not valid" con una clave que SÍ funciona probada a mano solo puede querer
// decir una cosa: que el Worker está usando otro valor. Y como los secretos no se pueden
// volver a leer desde el panel, no había forma de comprobarlo — solo borrar y repegar a
// ciegas, que es justo lo que ya no había funcionado.
//
// Esto lo comprueba desde dentro: prueba la clave de Firebase contra Google y cuenta qué
// contesta. No enseña ninguna clave —solo cuántos caracteres tiene y qué dice Google—,
// así que se puede abrir desde el navegador sin miedo.
async function estado(env) {
  const claves = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "FIREBASE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "COMPATIBLE_API_KEY"];
  const puestas = {};
  claves.forEach(k => {
    const v = String(env[k] || "");
    // Solo si está y cuánto mide. Ni un carácter de ninguna, y no por prudencia
    // exagerada: enseñar un trozo NO FUNCIONÓ. Salía enmascarado con puntos —una
    // extensión del navegador, o el propio Cloudflare— y no había forma de compararlo.
    // La huella de abajo hace ese trabajo sin nada que enmascarar.
    puestas[k] = v ? `puesta, ${v.length} caracteres${v !== v.trim() ? " ⚠️ CON ESPACIOS O SALTOS DE LÍNEA" : ""}` : "NO puesta";
  });

  // La huella: los doce primeros caracteres del SHA-256. Dos claves distintas dan
  // huellas distintas y de la huella no se puede volver a la clave, así que se puede
  // pegar en cualquier sitio. Es lo único que sobrevive a que algo enmascare el texto.
  let huella = "sin clave";
  const bruta = String(env.FIREBASE_API_KEY || "");
  if (bruta) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruta.trim()));
    huella = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  }

  let firebase = "no se ha podido comprobar";
  const fk = String(env.FIREBASE_API_KEY || "").trim();
  if (fk) {
    try {
      // Un token de mentira a propósito: si la clave vale, Google se queja del TOKEN
      // (INVALID_ID_TOKEN). Si se queja de la CLAVE, la clave es la que está mal.
      const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fk)}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: "prueba" }) });
      const t = await r.text();
      const motivo = (t.match(/"message"\s*:\s*"([^"]+)"/) || [])[1] || `HTTP ${r.status}`;
      firebase = /INVALID_ID_TOKEN/i.test(motivo)
        ? "✅ LA CLAVE DE FIREBASE ES CORRECTA (Google solo rechaza el token de prueba, que es lo esperado)"
        : `❌ LA CLAVE DE FIREBASE NO VALE → Google dice: ${motivo}`;
    } catch (e) {
      firebase = `no se ha podido preguntar a Google: ${e && e.message ? e.message : e}`;
    }
  }

  return {
    origenes: env.ORIGENES ? env.ORIGENES.split(",").map(x => x.trim()) : "NO puesto (se aceptará cualquier origen)",
    proveedorPorDefecto: env.PROVEEDOR_POR_DEFECTO || "gemini",
    disponibles: disponiblesEn(env),
    claves: puestas,
    firebase,
    huellaDeLaClaveDeFirebase: huella,
    huellaQueDeberiaSalir: "353f1b0dd087",
    // El veredicto ya masticado: si no coinciden, la guardada no es la que toca.
    coincide: huella === "353f1b0dd087" ? "✅ SÍ, es la clave correcta" : "❌ NO, la guardada es OTRA clave (¿la de Gemini?)",
  };
}

// ─── SALUD DE LOS PROVEEDORES ─────────────────────────────────────────────────
// Google retiró gemini-2.5-flash "para cuentas nuevas" sin avisar, y el Worker
// contestó un 404 que no decía nada por qué: el nombre del modelo había caducado.
// La forma de enterarse es PREGUNTAR antes del sábado, no después: cada proveedor
// configurado contesta a un mensaje de dos tokens y se ve si el modelo existe y la
// clave vale. A demanda (alguien pulsa el botón de Ajustes), no en cada pregunta —
// cada ping cuesta unos pocos tokens.
//
// Exportada para probarla en la batería: la parte de fetch se queda lo más fina
// posible, y lo que sí se comprueba a fondo es lo que pasa cuando hay o no claves.
export async function salud(env) {
  const pings = [];
  for (const [nombre, p] of Object.entries(PROVEEDORES)) {
    const falta = [p.clave, p.ademas].filter(Boolean).filter(k => !env[k]);
    if (falta.length) {
      pings.push({ nombre, estado: "sin configurar", falta: falta.join(" y ") });
      continue;
    }
    try {
      const r = await p.habla(env)({
        mensajes: [{ rol: "usuario", contenido: "Di solo: ok" }],
        sistema: "",
        herramientas: [],
      });
      pings.push({ nombre, estado: "ok", contesta: String(r.texto || "").slice(0, 40) });
    } catch (e) {
      // El motivo tal cual: "Gemini 404: … not found" dice por sí solo que el modelo
      // ha cambiado, y un 401 que la clave no vale. Interpretarlo es peor que
      // enseñarlo, que es lo que ha costado enterarse de las otras dos veces.
      pings.push({ nombre, estado: "error", motivo: String(e && e.message ? e.message : e) });
    }
  }
  return { pings };
}

// ─── ANALIZAR WEBS ─────────────────────────────────────────────────────────────
// A4 del plan (v1): la herramienta analizar_web pide una dirección y el Worker la
// trae y la reduce a lo que cuenta para captar clientes. Dos cosas la gobiernan:
//
//   · La dirección la elige la persona, así que se valida el destino antes de
//     fetchear: nunca se mira red privada ni localhost. Esta ruta, abierta, sería
//     un agujero para sondear redes desde dentro.
//   · Sin dependencias (el Worker se pega tal cual, sin nada que instalar): la
//     extracción va a regex, y extrae lo que importa, no el DOM entero.
//
// Redes sociales no por aquí (v2): Instagram y compañía no enseñan su contenido a
// un scraper anónimo (muro de login), y lo que sirve allí es la captura del móvil
// con visión, que es otro camino.
const HOST_BLOQUEADOS = /^(localhost|.*\.localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1|\[?fe80|\[?f[cd][0-9a-f]{2}:)/i;

/** @param {unknown} url @returns {{ ok: boolean, url?: string, motivo?: string }} */
export function urlAnalizable(url) {
  try {
    const u = new URL(String(url || ""));
    if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, motivo: "Solo se analizan direcciones http o https." };
    if (HOST_BLOQUEADOS.test(u.hostname)) return { ok: false, motivo: "Esa dirección no se analiza: es de red privada." };
    return { ok: true, url: u.toString() };
  } catch (e) {
    return { ok: false, motivo: "Esa no parece una dirección completa (falta el https://)." };
  }
}

// Lo que cuenta para captar clientes, y no el DOM entero. Todo con tope: el
// resultado viaja al modelo, y una página de 400 h2 no va a la conversación.
export function extraerWeb(html, url) {
  const texto = String(html);
  const limpio = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const titulo = limpio(texto.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 120);
  const descripcion = limpio(
    texto.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)?.[1]
    || texto.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i)?.[1]);
  const encabezados = (tag) => [...texto.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map(m => limpio(m[1])).filter(Boolean);
  const enlaces = [...texto.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(m => ({ href: String(m[1]), texto: limpio(m[2]) }))
    .filter(l => l.texto)
    .slice(0, 60);
  // Lo que dice "hazlo ya": un enlace con verbo de acción en el texto o en la
  // dirección (wa.me, /contacto, /reservar...). Sin esto, "¿pueden pedirme
  // presupuesto desde la web?" se contesta a ciegas.
  const palabraCTA = /^(reserv|contact|presupuest|pedir|pedido|cotiz|solicita|informa|llamen|llama|escríben|escriben|visít|visita|booking|book|agenda|whatsapp|telegram|menu|menú)/i;
  const ctas = enlaces
    .filter(l => palabraCTA.test(l.texto) || palabraCTA.test(l.href.replace(/^https?:\/\//, "").split(/[?#]/)[0]))
    .slice(0, 10)
    .map(l => ({ texto: l.texto.slice(0, 60), href: l.href.slice(0, 120) }));
  const whatsapp = (enlaces.find(l => /wa\.me|api\.whatsapp|whatsapp/i.test(l.href)) || {}).href || null;
  return {
    url,
    titulo: titulo || "(sin título)",
    descripcion: descripcion.slice(0, 300) || "(sin meta description)",
    secciones: encabezados("h2").slice(0, 12),
    tituloPrincipal: encabezados("h1").slice(0, 3),
    movilAdaptado: /<meta[^>]+name=["']viewport["']/i.test(texto),
    imagenesSinAlt: (texto.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length,
    nEnlaces: enlaces.length,
    ctas,
    whatsapp: whatsapp ? whatsapp.slice(0, 120) : null,
    telefonos: (texto.match(/(?:\+34[\s.-]?)?[69]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g) || []).slice(0, 5),
    preciosVisibles: (texto.match(/[0-9]{1,5}(?:[.,][0-9]{1,2})?\s*€|€\s*[0-9]{1,5}(?:[.,][0-9]{1,2})?/g) || []).slice(0, 10),
  };
}

// Qué proveedores están de verdad utilizables con lo que hay configurado. La app lo
// necesita para poder elegir sola: sin esto tendría que adivinar, y adivinar mal
// significa mandar la pregunta a un proveedor sin clave y comerse el error.
const disponiblesEn = (env) =>
  Object.entries(PROVEEDORES)
    .filter(([, p]) => [p.clave, p.ademas].filter(Boolean).every(k => env[k]))
    .map(([nombre]) => nombre);

export default {
  // ─── EL REPASO DE LA NOCHE ──────────────────────────────────────────────────
  // Lo dispara el cron de Cloudflare, sin nadie delante. No usa el modelo: son las
  // reglas de revision.js, así que cuesta cero tokens y no depende de ningún proveedor.
  // Deja el resultado en Firestore ("indice/avisos") y la app lo enseña al abrirse.
  //
  // Si falla, se deja escrito en los logs y no se reintenta: el cron vuelve mañana, y un
  // reintento en bucle contra una contraseña mal puesta solo gasta cuota.
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(
      repasar(env)
        .then(r => console.log(`Repaso: ${r.eventos.length} eventos con avisos de ${r.mirados} mirados.`))
        .catch(e => console.error(`El repaso ha fallado: ${e && e.message ? e.message : e}`)),
    );
  },

  async fetch(req, env) {
    // Antes que nada y sin comprobar origen: es una página de diagnóstico que no enseña
    // ninguna clave, y tiene que poder abrirse desde el navegador para servir de algo.
    if (new URL(req.url).pathname === "/__estado") {
      return new Response(JSON.stringify(await estado(env), null, 2),
        { headers: { "content-type": "application/json; charset=utf-8" } });
    }

    // Lanzar el repaso a mano, para no esperar a que sea de noche cuando se acaba de
    // montar. Pide la misma sesión de equipo que todo lo demás: no es una página
    // pública, escribe en Firestore.
    const origen = origenPermitido(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS(origen || "null") });
    if (!origen) return new Response("Origen no permitido", { status: 403 });
    // ─── LANZAR EL REPASO A MANO ────────────────────────────────────────────
    // Va DESPUÉS de comprobar el origen y de atender el OPTIONS, y no antes, que es
    // donde estaba y por eso no funcionaba: la app lo llama con un fetch y una cabecera
    // "authorization", y eso hace que el navegador mande primero un OPTIONS de permiso.
    // Puesta arriba, esta ruta se tragaba ese OPTIONS y contestaba 401 sin cabeceras
    // CORS, así que el navegador bloqueaba la respuesta y en pantalla salía un
    // "Failed to fetch" que no decía nada. Por eso también se contesta con json(), que
    // las pone: una respuesta sin ellas no llega a leerse desde otra dirección.
    if (new URL(req.url).pathname === "/__repaso") {
      const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
      if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
      try {
        return json({ ...(await repasar(env)), dias: DIAS_VISTA }, 200, origen);
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 500, origen);
      }
    }

    // ─── PROBAR LOS PROVEEDORES ──────────────────────────────────────────────
    // Misma sesión que el resto, mismo patrón que /__repaso (y por las mismas
    // razones: el navegador manda un OPTIONS antes, y la respuesta va por json()
    // con sus cabeceras). Sirve para comprobar EL VIERNES que el modelo existe y
    // la clave vale, no el sábado en plena carga del camión.
    if (new URL(req.url).pathname === "/__salud") {
      if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
      const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
      if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
      try {
        return json(await salud(env), 200, origen);
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 500, origen);
      }
    }

    // ─── ANALIZAR UNA WEB ──────────────────────────────────────────────────
    // Misma sesión que el resto. El cuerpo lleva la url; la respuesta es la
    // extracción estructurada (extraerWeb). No toca Firestore: lo que se mira
    // es la web, no la app.
    if (new URL(req.url).pathname === "/__analizar") {
      if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
      const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
      if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
      let cuerpo;
      try { cuerpo = JSON.parse(await req.text()); } catch (e) { return json({ error: "Cuerpo ilegible" }, 400, origen); }
      const chequeo = urlAnalizable(cuerpo.url);
      if (!chequeo.ok) return json({ error: chequeo.motivo }, 400, origen);
      try {
        const r = await fetch(chequeo.url, {
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
          headers: { "user-agent": "Mozilla/5.0 (compatible; GulaChecklist/1.0)" },
        });
        if (!r.ok) return json({ error: `La web contestó ${r.status}: no se ha podido analizar.` }, 502, origen);
        const html = await r.text();
        if (html.length > 2000000) return json({ error: "La página pesa demasiado para analizarla (más de 2 MB)." }, 413, origen);
        return json(extraerWeb(html, chequeo.url), 200, origen);
      } catch (e) {
        return json({ error: `No se ha podido llegar a la web: ${String(e && e.message ? e.message : e).slice(0, 120)}` }, 502, origen);
      }
    }

    // ─── LA VOZ NATURAL ───────────────────────────────────────────────────────
    // Misma sesión de equipo que todo lo demás — no es un altavoz público — y el mismo
    // patrón de arriba: se contesta siempre con json(), con las cabeceras CORS puestas,
    // aunque falle. Un extra sobre el chat, por eso su propio error nunca tumba nada más
    // que esta respuesta: quien llama (voz.js) ya sabe seguir con la voz del navegador
    // si esto contesta que no.
    if (new URL(req.url).pathname === "/__voz") {
      if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
      const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
      if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
      if (!clavesGemini(env).length) {
        return json({ error: "Sin GEMINI_API_KEY puesta no hay voz en la nube." }, 501, origen);
      }
      let cuerpoVoz;
      try { cuerpoVoz = JSON.parse(await req.text()); } catch (e) { return json({ error: "Cuerpo ilegible" }, 400, origen); }
      const texto = String(cuerpoVoz.texto || "").trim();
      if (!texto) return json({ error: "Nada que decir." }, 400, origen);
      try {
        return json(await vozDeGemini(texto, env, String(cuerpoVoz.voz || "")), 200, origen);
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 502, origen);
      }
    }

    if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);

    // Un cuerpo enorme es un error o un abuso; en los dos casos no se atiende.
    const crudo = await req.text();
    if (crudo.length > 200000) return json({ error: "La conversación es demasiado larga." }, 413, origen);

    let cuerpo;
    try { cuerpo = JSON.parse(crudo); } catch (e) { return json({ error: "Cuerpo ilegible" }, 400, origen); }

    const quien = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
    if (quien.fallo) return json({ error: quien.fallo }, 401, origen);

    const nombre = PROVEEDORES[cuerpo.proveedor] ? cuerpo.proveedor : (env.PROVEEDOR_POR_DEFECTO || "gemini");
    const p = PROVEEDORES[nombre];
    // Se dice QUÉ falta, no "no configurado": si no, hay que abrir los logs de Cloudflare
    // para enterarse de que lo que faltaba era la dirección y no la clave.
    const faltan = [p.clave, p.ademas].filter(k => k && !env[k]);
    if (faltan.length) {
      return json({
        error: `Este Worker no tiene ${nombre} configurado: falta ${faltan.join(" y ")}.`,
        disponibles: disponiblesEn(env),
      }, 501, origen);
    }

    if (!Array.isArray(cuerpo.mensajes) || !cuerpo.mensajes.length) {
      return json({ error: "No hay conversación que mandar." }, 400, origen);
    }

    try {
      const salida = await p.habla(env)({
        sistema: String(cuerpo.sistema || ""),
        mensajes: cuerpo.mensajes,
        herramientas: Array.isArray(cuerpo.herramientas) ? cuerpo.herramientas : [],
      });
      return json({ ...salida, proveedor: nombre, disponibles: disponiblesEn(env) }, 200, origen);
    } catch (e) {
      // El mensaje del proveedor se devuelve tal cual: sin él, "algo ha fallado" obliga
      // a mirar los logs de Cloudflare para saber que era una clave caducada.
      return json({ error: String(e && e.message ? e.message : e), disponibles: disponiblesEn(env) }, 502, origen);
    }
  },
};
