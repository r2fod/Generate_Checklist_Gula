// COPIA DE src/nube.js con la conexión sustituida por el Firestore simulado. Se
// regenera a mano si cambia nube.js: es lo que permite probar la sincronización sin
// tocar la nube de verdad.
// ─── SINCRONIZACIÓN EN LA NUBE (Firestore) ─────────────────────────────────────
// El SDK de Firebase se carga con import() dinámico SOLO si hay configuración:
// con firebaseConfig = null la app no descarga nada extra y funciona como siempre.



let dbPromise = null;
import { fakeDb, fakeFs } from "./firestore-simulado.mjs";

function getDb() { return Promise.resolve({ db: fakeDb, fs: fakeFs }); }

// ¿Está activada la edición compartida? (síncrono, para decidir qué link generar)
export const nubeActiva = () => true;

// Id corto y legible para el link (~8 caracteres sin ambiguos: 31^8 combinaciones)
export function nuevoIdEvento(largo = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: largo }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

// ─── EL CALENDARIO ────────────────────────────────────────────────────────────
// Copia de la sección de nube.js, con la conexión simulada. Lo que se prueba aquí es la
// mudanza a la carpeta propia: que copia sin borrar, que no se hace dos veces, y que el
// documento de mirar no toca el de verdad.
const COL_CALENDARIO = "calendario";
const DOC_PUNTERO = "indice/calendario";

export async function resolverCalendario() {
  const { db, fs } = await getDb();
  const ref = fs.doc(db, DOC_PUNTERO);
  const r = await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists() ? snap.data() : {};
    if (d.codigo && d.ver) return { codigo: d.codigo, ver: d.ver, estrenar: false };
    const codigo = nuevoIdEvento(12);
    const ver = nuevoIdEvento(12);
    tx.set(ref, { codigo, ver }, { merge: true });
    return { codigo, ver, estrenar: true, apuntes: d.apuntes || "[]", equipo: d.equipo || "[]" };
  });
  if (r.estrenar) {
    const actualizado = Date.now();
    await Promise.all([
      fs.setDoc(fs.doc(db, COL_CALENDARIO, r.codigo), { apuntes: r.apuntes, equipo: r.equipo, ver: r.ver, actualizado }),
      fs.setDoc(fs.doc(db, COL_CALENDARIO, r.ver), { apuntes: r.apuntes, equipo: r.equipo, actualizado }),
    ]);
  }
  return { codigo: r.codigo, ver: r.ver };
}

function leerCalendario(d) {
  try {
    return {
      apuntes: JSON.parse(d.apuntes),
      equipo: d.equipo ? JSON.parse(d.equipo) : [],
      ver: d.ver || "",
      actualizado: d.actualizado ?? 0,
    };
  }
  catch (e) { return null; }
}

export async function cargarCalendarioNube(codigo) {
  const { db, fs } = await getDb();
  if (!codigo) return null;
  const snap = await fs.getDoc(fs.doc(db, COL_CALENDARIO, codigo));
  return snap.exists() ? leerCalendario(snap.data()) : null;
}

export async function guardarCalendarioNube(codigo, apuntes, equipo = [], ver = "") {
  const { db, fs } = await getDb();
  if (!codigo) return 0;
  const actualizado = Date.now();
  const contenido = { apuntes: JSON.stringify(apuntes), equipo: JSON.stringify(equipo), actualizado };
  await Promise.all([
    fs.setDoc(fs.doc(db, COL_CALENDARIO, codigo), { ...contenido, ver }),
    ver ? fs.setDoc(fs.doc(db, COL_CALENDARIO, ver), contenido) : Promise.resolve(),
  ]);
  return actualizado;
}

export async function guardarEventoNube(id, estado) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.setDoc(fs.doc(db, "eventos", id), {
    estado: JSON.stringify(estado),
    actualizado: Date.now(),
  });
}

export async function cargarEventoNube(id) {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDoc(fs.doc(db, "eventos", id));
  return snap.exists() ? JSON.parse(snap.data().estado) : null;
}

// Avisa (cb) cada vez que alguien guarda cambios en este evento. Devuelve una
// función para cancelar la suscripción.
export function suscribirEventoNube(id, cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || cancelado) return;
    const { db, fs } = conexion;
    unsub = fs.onSnapshot(
      fs.doc(db, "eventos", id),
      (snap) => { if (snap.exists()) cb(snap.data().estado); },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    );
  })();
  return () => { cancelado = true; unsub(); };
}

// ─── ÍNDICE COMPARTIDO DE "EVENTOS GUARDADOS" ──────────────────────────────────
// Un único documento fijo con la lista completa { nombre: estado }, para que el
// archivo de eventos guardados se vea igual desde cualquier dispositivo/navegador
// en vez de vivir solo en el localStorage de quien los guardó.
const DOC_INDICE = "indice/eventosGuardados";

export async function guardarIndiceEventosNube(mapa) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.setDoc(fs.doc(db, DOC_INDICE), { mapa: JSON.stringify(mapa), actualizado: Date.now() });
}

export async function cargarIndiceEventosNube() {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDoc(fs.doc(db, DOC_INDICE));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { mapa: JSON.parse(d.mapa), actualizado: d.actualizado ?? 0 };
}

// Avisa (cb) cada vez que alguien (en cualquier dispositivo) guarda/borra un evento.
// cb recibe { mapa, actualizado } para poder decidir por timestamp qué versión manda
// (un borrado no se puede "fusionar", solo sustituir por la más reciente).
export function suscribirIndiceEventosNube(cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || cancelado) return;
    const { db, fs } = conexion;
    unsub = fs.onSnapshot(
      fs.doc(db, DOC_INDICE),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        cb({ mapa: JSON.parse(d.mapa), actualizado: d.actualizado ?? 0 });
      },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    );
  })();
  return () => { cancelado = true; unsub(); };
}

// ─── ARCHIVO DE EVENTOS: UN DOCUMENTO POR EVENTO ──────────────────────────────
// El índice de arriba mete TODOS los eventos en un solo documento, y Firestore no
// admite documentos de más de 1 MiB: un evento con Modo carga terminado pesa ~12 KB,
// así que el archivo se llenaba sobre los 88 eventos y a partir de ahí los guardados
// fallaban. Aquí cada evento es su propio documento, así que ya no hay techo: lo
// único que limita es el tamaño de un evento suelto, que es 90 veces menor.
// Los documentos por evento viven DENTRO de "indice", que es la colección que las
// reglas de seguridad ya permiten al equipo con sesión iniciada. Una colección nueva
// ("archivo") caía en el "todo lo demás: denegado" de las reglas, así que ni se leía
// ni se escribía: por eso dejaban de verse eventos y saltaba el aviso rojo. Con el
// prefijo se distinguen del documento antiguo "indice/eventosGuardados", que sigue
// donde estaba como copia de seguridad.
const COL_ARCHIVO = "indice";
const PREFIJO_EVENTO = "evt_";

// Id estable y válido para Firestore a partir del nombre del evento: el mismo
// nombre da siempre el mismo id (para poder actualizarlo en vez de duplicarlo) y
// el sufijo hash evita que dos nombres distintos caigan en el mismo id al limpiar
// tildes y símbolos ("Boda Ana/Luis" y "Boda Ana Luis").
export function idDeNombreEvento(nombre) {
  const txt = String(nombre ?? "");
  const base = txt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "evento";
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (Math.imul(h, 31) + txt.charCodeAt(i)) | 0;
  return `${PREFIJO_EVENTO}${base}-${(h >>> 0).toString(36)}`;
}

// Qué eventos hay que escribir y cuáles borrar entre dos versiones del archivo.
// Función pura y sin Firestore, para poder razonarla y probarla por separado.
export function calcularCambiosArchivo(anterior = {}, nuevo = {}) {
  const escribir = [];
  const borrar = [];
  Object.entries(nuevo).forEach(([nombre, ev]) => {
    const antes = anterior[nombre];
    if (antes !== undefined && JSON.stringify(antes) === JSON.stringify(ev)) return;
    escribir.push({ nombre, id: idDeNombreEvento(nombre), estado: JSON.stringify(ev) });
  });
  Object.keys(anterior).forEach(nombre => {
    if (nuevo[nombre] === undefined) borrar.push({ nombre, id: idDeNombreEvento(nombre) });
  });
  return { escribir, borrar };
}

// Sube solo lo que ha cambiado y borra lo que ya no está. Escribir evento a evento
// (en vez del mapa entero) es lo que quita el techo del documento único.
export async function sincronizarArchivoNube(anterior = {}, nuevo = {}) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  const { escribir, borrar } = calcularCambiosArchivo(anterior, nuevo);
  if (!escribir.length && !borrar.length) return;
  const ahora = Date.now();
  await Promise.all([
    ...escribir.map(e => fs.setDoc(fs.doc(db, COL_ARCHIVO, e.id), { nombre: e.nombre, estado: e.estado, actualizado: ahora })),
    ...borrar.map(e => fs.deleteDoc(fs.doc(db, COL_ARCHIVO, e.id))),
  ]);
}

// Lee el archivo entero. Devuelve { mapa, actualizado } igual que el índice viejo,
// para que quien lo use no note la diferencia.
export async function cargarArchivoNube() {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDocs(fs.collection(db, COL_ARCHIVO));
  return leerSnapshotArchivo(snap);
}

function leerSnapshotArchivo(snap) {
  const mapa = {};
  let actualizado = 0;
  snap.forEach(doc => {
    // El documento antiguo con TODOS los eventos vive en la misma colección: se salta
    // (no lleva "nombre"/"estado", lleva "mapa"), igual que cualquier otro que no sea
    // un evento suelto.
    if (!doc.id.startsWith(PREFIJO_EVENTO)) return;
    const d = doc.data();
    if (!d || !d.nombre || !d.estado) return;
    try { mapa[d.nombre] = JSON.parse(d.estado); } catch (e) { /* documento corrupto: se salta */ }
    if ((d.actualizado ?? 0) > actualizado) actualizado = d.actualizado ?? 0;
  });
  return { mapa, actualizado, vacio: Object.keys(mapa).length === 0 };
}

// Avisa de CADA CAMBIO (alta, edición o borrado) en el archivo, no de la foto entera.
// Es importante: una foto de la colección no es la lista completa. Estando sin
// conexión, o mientras hay una escritura en vuelo, Firestore entrega una foto con
// solo los documentos que conoce en ese momento, y tomarla por la lista buena borraba
// de la pantalla todos los demás eventos. Con los cambios se puede aplicar lo que de
// verdad ha pasado: los que llegan se añaden o actualizan, y solo desaparecen los que
// Firestore marca explícitamente como borrados.
export function suscribirArchivoNube(cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || cancelado) return;
    const { db, fs } = conexion;
    unsub = fs.onSnapshot(
      fs.collection(db, COL_ARCHIVO),
      (snap) => {
        const cambios = [];
        let actualizado = 0;
        (snap.docChanges ? snap.docChanges() : []).forEach(c => {
          if (!c.doc || !c.doc.id.startsWith(PREFIJO_EVENTO)) return;
          const d = c.doc.data();
          if (c.type === "removed") {
            if (d && d.nombre) cambios.push({ tipo: "borrado", nombre: d.nombre });
            return;
          }
          if (!d || !d.nombre || !d.estado) return;
          try { cambios.push({ tipo: "alta", nombre: d.nombre, estado: JSON.parse(d.estado) }); }
          catch (e) { /* documento corrupto: se salta */ }
          if ((d.actualizado ?? 0) > actualizado) actualizado = d.actualizado ?? 0;
        });
        if (cambios.length) cb({ cambios, actualizado });
      },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    );
  })();
  return () => { cancelado = true; unsub(); };
}
