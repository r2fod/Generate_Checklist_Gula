// ─── PUENTE LOCAL CON CLAUDE CODE ─────────────────────────────────────────────
// Hace lo mismo que el Worker de Cloudflare —recibe la conversación, contesta texto o
// llamadas a herramientas— pero en vez de llamar a una API con una clave, ejecuta el
// CLI de Claude Code que ya tienes instalado. Así el asistente va con tu suscripción,
// sin claves ni saldo.
//
// Es exactamente lo que hace OpenHuman: como es una app de escritorio, puede ejecutar
// el CLI de tu ordenador. Tu app es una página web, así que hace falta esta pieza en
// medio.
//
//   node puente/servidor.mjs
//
// Y en la app, en la dirección del proxy: http://localhost:8787
//
// ── LO QUE HAY QUE SABER ANTES DE ILUSIONARSE ────────────────────────────────
//
//   1. Solo funciona EN ESTE ORDENADOR y SOLO mientras la terminal esté abierta. En el
//      móvil del equipo no hay nada de esto: para eso está el Worker con Gemini.
//
//   2. Es para ti, no para el equipo. Tu suscripción es de una persona; ponerla a
//      servir a cinco móviles por un túnel no es lo que se ha contratado. Si el equipo
//      lo va a usar, va por el Worker.
//
//   3. Las herramientas van por texto, no por el mecanismo nativo. El CLI no acepta un
//      catálogo de herramientas de fuera, así que se le pide que conteste un JSON con
//      la forma exacta. Funciona, pero es menos fiable que Gemini o que la API: alguna
//      vez contestará algo que no se puede leer. Cuando pase, se dice y ya está — no
//      se inventa una respuesta.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PUERTO = Number(process.env.PUERTO || 8787);
// El de siempre y el de desarrollo. Al ser localhost el navegador lo trata como sitio
// de confianza, así que una app servida por HTTPS puede llamar aquí sin quejarse.
const ORIGENES = (process.env.ORIGENES || "https://r2fod.github.io,http://localhost:5173").split(",").map(s => s.trim());

const CORS = (origen) => ({
  "Access-Control-Allow-Origin": origen,
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// Lo que se le pide al CLI. Se le dan las herramientas como texto y se le exige el JSON
// con la forma que espera la app. Lo importante es lo de "NADA MÁS": cualquier saludo
// alrededor del JSON lo vuelve ilegible.
function construyePrompt({ sistema, mensajes, herramientas }) {
  const catalogo = herramientas.map(h =>
    `- ${h.name}: ${h.description}\n  argumentos: ${JSON.stringify(h.parameters || {})}`).join("\n");

  const charla = mensajes.map(m => {
    if (m.rol === "herramienta") return `RESULTADO de ${m.nombre}:\n${JSON.stringify(m.contenido)}`;
    if (m.rol === "asistente" && m.llamadas && m.llamadas.length) {
      return `TÚ PEDISTE: ${m.llamadas.map(l => `${l.nombre}(${JSON.stringify(l.argumentos)})`).join(", ")}`;
    }
    return `${m.rol === "asistente" ? "TÚ" : "USUARIO"}: ${m.contenido || ""}`;
  }).join("\n\n");

  return `${sistema}

--- HERRAMIENTAS QUE PUEDES PEDIR ---
${catalogo}

--- CONVERSACIÓN ---
${charla}

--- CÓMO CONTESTAR ---
Contesta SOLO con un objeto JSON y NADA MÁS: ni saludo, ni explicación, ni bloque de código.

Si necesitas datos, pide herramientas:
{"llamadas":[{"nombre":"nombre_de_la_herramienta","argumentos":{}}]}

Si ya puedes contestar:
{"texto":"tu respuesta para la persona"}

Nunca las dos cosas a la vez. Si ya tienes los resultados que pediste, contesta con "texto".`;
}

// El JSON puede venir con un ```json alrededor por mucho que se pida que no. Se busca el
// primer objeto que se pueda leer en vez de dar por perdida la respuesta entera.
function sacaJSON(salida) {
  const limpio = String(salida || "").trim()
    .replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(limpio); } catch (e) { /* venía con más cosas alrededor */ }
  const desde = limpio.indexOf("{");
  const hasta = limpio.lastIndexOf("}");
  if (desde === -1 || hasta <= desde) return null;
  try { return JSON.parse(limpio.slice(desde, hasta + 1)); } catch (e) { return null; }
}

function ejecutaClaude(prompt) {
  return new Promise((resolve, reject) => {
    // --print para que conteste y salga. El prompt va por la entrada estándar y no como
    // argumento: uno largo se pasa del límite de la línea de comandos y el error que da
    // no dice nada de eso.
    const hijo = spawn("claude", ["--print"], { stdio: ["pipe", "pipe", "pipe"] });
    let salida = "", error = "";
    hijo.stdout.on("data", d => { salida += d; });
    hijo.stderr.on("data", d => { error += d; });
    hijo.on("error", e => reject(new Error(
      e.code === "ENOENT"
        ? "No encuentro el comando 'claude'. Instala Claude Code y entra con tu cuenta."
        : String(e.message || e))));
    hijo.on("close", codigo => {
      if (codigo !== 0) return reject(new Error(error.trim() || `El CLI ha salido con código ${codigo}`));
      resolve(salida);
    });
    hijo.stdin.end(prompt);
  });
}

createServer(async (req, res) => {
  const origen = ORIGENES.includes(req.headers.origin) ? req.headers.origin : ORIGENES[0];
  if (req.method === "OPTIONS") { res.writeHead(204, CORS(origen)); return res.end(); }

  const responde = (datos, estado = 200) => {
    res.writeHead(estado, { "content-type": "application/json; charset=utf-8", ...CORS(origen) });
    res.end(JSON.stringify(datos));
  };

  if (req.method === "GET") return responde({ puente: "claude-code", puerto: PUERTO, origenes: ORIGENES });
  if (req.method !== "POST") return responde({ error: "Solo POST" }, 405);

  let cuerpo = "";
  for await (const trozo of req) cuerpo += trozo;

  let datos;
  try { datos = JSON.parse(cuerpo); } catch (e) { return responde({ error: "Cuerpo ilegible" }, 400); }
  if (!Array.isArray(datos.mensajes) || !datos.mensajes.length) {
    return responde({ error: "No hay conversación que mandar." }, 400);
  }

  try {
    const bruto = await ejecutaClaude(construyePrompt({
      sistema: String(datos.sistema || ""),
      mensajes: datos.mensajes,
      herramientas: Array.isArray(datos.herramientas) ? datos.herramientas : [],
    }));
    const leido = sacaJSON(bruto);
    if (!leido) {
      // Se dice que no se ha entendido en vez de inventar una respuesta. Con las
      // herramientas por texto esto pasa de vez en cuando, y callarlo sería peor.
      return responde({ error: `El CLI ha contestado algo que no he sabido leer:\n${String(bruto).slice(0, 400)}` }, 502);
    }
    responde({
      texto: String(leido.texto || ""),
      llamadas: (leido.llamadas || []).map((l, i) => ({
        id: `c${i}`, nombre: String(l.nombre || ""), argumentos: l.argumentos || {},
      })),
      proveedor: "claude-code",
    });
  } catch (e) {
    responde({ error: String(e && e.message ? e.message : e) }, 502);
  }
}).listen(PUERTO, "127.0.0.1", () => {
  // Solo 127.0.0.1: escuchando en todas las interfaces, cualquiera de la misma wifi
  // podría usar tu suscripción sin que te enteres.
  console.log(`Puente de Claude Code escuchando en http://localhost:${PUERTO}`);
  console.log(`Pon esa dirección en el asistente de la app (engranaje → Dirección del proxy).`);
  console.log(`Orígenes permitidos: ${ORIGENES.join(", ")}`);
  console.log(`\nCtrl+C para pararlo. Mientras esté parado, la app no tendrá asistente por aquí.`);
});
