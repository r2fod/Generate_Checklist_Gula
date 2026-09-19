// ─── EL REPASO DE LA NOCHE ────────────────────────────────────────────────────
// Lo que hace el asistente cuando no hay nadie delante.
//
// Las reglas de "esto no cuadra" (revision.js) ya existen y ya están probadas, pero
// hasta ahora solo corrían cuando alguien abría la app. Y el fallo caro de este oficio
// no es calcular mal: es que un campo se quede sin poner y nadie lo mire hasta que el
// camión está cargado. Si nadie abre la app en toda la semana, nadie lo mira.
//
// Esto lo dispara el cron de Cloudflare. NO usa el modelo: son las mismas reglas de
// siempre, así que cuesta cero tokens, no se inventa nada y da igual que fallen los
// proveedores. Lo único que hace de más es leer Firestore y dejar el resultado escrito
// en "indice/avisos", que es lo que la app enseña al abrirse.
//
// Se reusa revision.js tal cual, sin copiarla: por eso este Worker pasa por un
// empaquetado (npm run worker:build). Dos motores de reglas viviendo en paralelo se
// separan al segundo cambio, y entonces uno avisa de cosas que el otro no.
import { revisarProximos } from "../src/asistente/revision.js";

export const FIRESTORE = "https://firestore.googleapis.com/v1";
const PREFIJO_EVENTO = "evt_";

// ─── EL TECHO DE UN DOCUMENTO ─────────────────────────────────────────────────
// Firestore corta un documento en 1 MiB (1.048.576 bytes) y no avisa antes: la escritura
// que lo pasa falla, y con ella se pierde lo que se estaba guardando. Dos documentos de
// esta app crecen sin techo propio porque guardan una LISTA entera en un solo campo:
//
//   · indice/calendario     — los apuntes originales, que se acumulan año tras año.
//   · indice/eventosGuardados — el archivo antiguo, congelado, que solo se lee. Si aún
//     estuviera creciendo sería el primero en reventar.
//
// El día que uno de los dos toque el techo, quien se entera es la persona que estaba
// apuntando una boda y se queda sin poder guardarla, un sábado. Por eso lo mira el
// repaso de la noche, que ya entra en Firestore igualmente: avisar con 200 kB de margen
// da tiempo a archivar lo viejo con calma.
export const TECHO_DOCUMENTO = 1048576;
const AVISA_DESDE = 0.75;   // 786 kB: hay que empezar a pensar en archivar
const URGE_DESDE = 0.9;     // 943 kB: queda poco y la escritura que falle pierde datos

// Los tonos son los MISMOS TRES de revision.js ("falta", "raro", "acuerdate") y no dos
// nuevos. Se inventaron "ojo" y "malo", y el resultado fue un aviso sin raya de color:
// el CSS solo conoce `.cer-aviso.es-falta`, `.es-raro` y `.es-acuerdate`. Un vocabulario
// paralelo en la punta de la cadena se nota tres pantallas más allá.

const kB = (bytes) => `${Math.round(bytes / 1024)} kB`;

// Puro y exportado: así se prueba sin Firestore delante. Devuelve null cuando el
// documento está lejos del techo, que es lo normal.
export function avisoDePeso(nombre, bytes) {
  const parte = bytes / TECHO_DOCUMENTO;
  if (parte < AVISA_DESDE) return null;
  return {
    documento: nombre,
    bytes,
    porcentaje: Math.round(parte * 100),
    tono: parte >= URGE_DESDE ? "falta" : "raro",
    texto: `El documento ${nombre} va por ${kB(bytes)} de los ${kB(TECHO_DOCUMENTO)} que caben (${Math.round(parte * 100)} %).`,
    // Un aviso que no dice qué hacer se lee, se asiente y se deja para luego.
    comoSeArregla: nombre.includes("calendario")
      ? "Saca del calendario los apuntes de años cerrados (Traer/exportar guarda una copia antes)."
      : "Es el archivo antiguo y solo se lee: se puede vaciar cuando se confirme que todo está en indice/evt_*.",
  };
}

// Cuántos días por delante se miran. Treinta: lo que falta por comprar todavía se puede
// comprar, y lo que hay que pedir todavía se puede pedir.
export const DIAS_VISTA = 30;

// ─── ENTRAR COMO EL ROBOT ─────────────────────────────────────────────────────
// El cron no tiene sesión de nadie: no hay navegador ni persona detrás. Se entra con una
// cuenta de Firebase propia —la del robot— cuyo usuario y contraseña son secretos del
// Worker. Así las reglas de Firestore siguen pidiendo sesión (request.auth != null) y no
// hay que tocarlas ni abrir nada.
export async function entrar(env) {
  const clave = String(env.FIREBASE_API_KEY || "").trim();
  const correo = String(env.ROBOT_EMAIL || "").trim();
  const pass = String(env.ROBOT_PASSWORD || "");
  if (!clave) throw new Error("Falta FIREBASE_API_KEY.");
  if (!correo || !pass) throw new Error("Faltan ROBOT_EMAIL y ROBOT_PASSWORD: sin ellos el repaso no puede leer Firestore.");

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(clave)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: correo, password: pass, returnSecureToken: true }),
    },
  );
  const d = await r.json().catch(() => ({}));
  // El motivo de Google tal cual: "INVALID_PASSWORD" se arregla solo, "no se pudo
  // entrar" obliga a abrir los logs de Cloudflare para enterarse de lo mismo.
  if (!r.ok || !d.idToken) {
    throw new Error(`El robot no puede entrar en Firebase (${(d.error && d.error.message) || r.status}).`);
  }
  return d.idToken;
}

// ─── LEER Y ESCRIBIR FIRESTORE POR REST ───────────────────────────────────────
// El SDK de Firebase no cabe aquí (el Worker va sin dependencias), pero la API REST es
// la misma base de datos. Lo único incómodo es que devuelve los valores etiquetados
// ({ stringValue: "..." }), así que hay que desenvolverlos.
const valor = (v) => {
  if (!v || typeof v !== "object") return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  return undefined;
};

export const campos = (doc) => {
  const salida = {};
  Object.entries((doc && doc.fields) || {}).forEach(([k, v]) => { salida[k] = valor(v); });
  return salida;
};

export const proyecto = (env) => String(env.FIREBASE_PROJECT_ID || "").trim();

// Los eventos guardados viven como un documento por evento dentro de "indice", con el
// prefijo "evt_". Se pagina: con muchos eventos, Firestore no los devuelve todos de una.
async function leerEventos(env, token) {
  const base = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice`;
  const mapa = {};
  let pagina = "";
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const url = `${base}?pageSize=300${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ""}`;
    const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Firestore no deja leer los eventos (${(d.error && d.error.message) || r.status}).`);
    (d.documents || []).forEach(doc => {
      const id = String(doc.name || "").split("/").pop();
      if (!id.startsWith(PREFIJO_EVENTO)) return;
      const c = campos(doc);
      if (!c.nombre || !c.estado) return;
      try { mapa[c.nombre] = JSON.parse(c.estado); } catch (e) { /* documento corrupto: se salta */ }
    });
    if (!d.nextPageToken) break;
    pagina = d.nextPageToken;
  }
  return mapa;
}

// Lo que pesa un documento suelto. Se pide entero —no hay forma de preguntar su tamaño
// sin leerlo— y se mide el JSON que devuelve la API REST, que es lo más parecido a lo
// que cuenta Firestore. No es el byte exacto de su contabilidad: para avisar con 200 kB
// de margen sobra, y equivocarse por arriba aquí es lo que se quiere.
async function pesoDe(env, token, ruta) {
  const url = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/${ruta}`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) return null;   // no existe todavía o no se puede leer: no es motivo para tumbar el repaso
  const texto = await r.text();
  return new TextEncoder().encode(texto).length;
}

async function guardarAvisos(env, token, contenido) {
  const url = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice/avisos`;
  // Se guarda como texto JSON en un solo campo, igual que hace la app con los demás
  // ajustes compartidos: así el formato lo manda el código y no el tipado de Firestore.
  const r = await fetch(url, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      fields: {
        avisos: { stringValue: JSON.stringify(contenido) },
        actualizado: { integerValue: String(Date.now()) },
      },
    }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(`Firestore no deja escribir el repaso (${(d.error && d.error.message) || r.status}).`);
  }
}

// ─── EL REPASO ────────────────────────────────────────────────────────────────
// Devuelve lo que ha hecho, para poder verlo desde /__repaso sin esperar al cron.
export async function repasar(env) {
  if (!proyecto(env)) throw new Error("Falta FIREBASE_PROJECT_ID: sin él no se sabe qué base de datos mirar.");
  const token = await entrar(env);
  const eventos = await leerEventos(env, token);
  const revisados = revisarProximos(eventos, DIAS_VISTA);

  // Los dos que crecen sin techo propio. Si la lectura falla se sigue: el repaso de los
  // eventos es lo importante y no puede caerse por un aviso de tamaño.
  const pesos = [];
  for (const ruta of ["indice/calendario", "indice/eventosGuardados"]) {
    const bytes = await pesoDe(env, token, ruta).catch(() => null);
    if (bytes === null) continue;
    const aviso = avisoDePeso(ruta, bytes);
    if (aviso) pesos.push(aviso);
  }

  const contenido = {
    cuando: Date.now(),
    dias: DIAS_VISTA,
    // Cuántos se han mirado, no solo cuántos fallan: "0 avisos" con 0 eventos mirados
    // es un error silencioso, y con 12 mirados es una buena noticia.
    mirados: Object.keys(eventos).length,
    // Los documentos que se acercan al MiB. Casi siempre va vacío, y ese es el objetivo.
    documentos: pesos,
    eventos: revisados.map(r => ({
      evento: r.evento,
      fecha: r.fecha,
      // "comoSeArregla" viaja también: un aviso que no dice qué hacer se lee, se asiente
      // y se deja para luego.
      avisos: (r.avisos || []).map(a => ({ tono: a.tono, texto: a.texto, comoSeArregla: a.comoSeArregla || "" })),
    })),
  };
  await guardarAvisos(env, token, contenido);
  return contenido;
}
