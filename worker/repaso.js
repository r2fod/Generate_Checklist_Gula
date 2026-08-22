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

const FIRESTORE = "https://firestore.googleapis.com/v1";
const PREFIJO_EVENTO = "evt_";

// Cuántos días por delante se miran. Treinta: lo que falta por comprar todavía se puede
// comprar, y lo que hay que pedir todavía se puede pedir.
export const DIAS_VISTA = 30;

// ─── ENTRAR COMO EL ROBOT ─────────────────────────────────────────────────────
// El cron no tiene sesión de nadie: no hay navegador ni persona detrás. Se entra con una
// cuenta de Firebase propia —la del robot— cuyo usuario y contraseña son secretos del
// Worker. Así las reglas de Firestore siguen pidiendo sesión (request.auth != null) y no
// hay que tocarlas ni abrir nada.
async function entrar(env) {
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

const campos = (doc) => {
  const salida = {};
  Object.entries((doc && doc.fields) || {}).forEach(([k, v]) => { salida[k] = valor(v); });
  return salida;
};

const proyecto = (env) => String(env.FIREBASE_PROJECT_ID || "").trim();

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

  const contenido = {
    cuando: Date.now(),
    dias: DIAS_VISTA,
    // Cuántos se han mirado, no solo cuántos fallan: "0 avisos" con 0 eventos mirados
    // es un error silencioso, y con 12 mirados es una buena noticia.
    mirados: Object.keys(eventos).length,
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
