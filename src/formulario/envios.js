// ─── EL CANAL CON LA OFICINA ───────────────────────────────────────────────────
// Dos operaciones, y nada más:
//
//   · leerProximos(codigo)  — la lista corta que ve quien rellena el formulario:
//     nombre, día y sitio de los 8 próximos eventos. Ni pax, ni cantidades, ni
//     logística, ni checklist. Se lee por el código, igual que un evento por su
//     link: sin él no se puede ni listar (ver firestore.rules).
//   · enviarFormulario(...) — crea el envío. Quien tiene el código solo puede
//     crear; leerlos, cambiarlos o borrarlos es cosa del equipo con sesión.
//
// Lo de este fichero no toca en ningún momento los eventos ni la checklist.
import { firebaseConfig } from "../firebaseConfig.js";
import { getFirebaseApp } from "../firebase.js";

let dbPromise = null;

function getDb() {
  if (!firebaseConfig) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await getFirebaseApp();
      const fs = await import("firebase/firestore");
      return { db: fs.getFirestore(app), fs };
    })();
  }
  return dbPromise;
}

export const nubeActiva = () => !!firebaseConfig;

// Código de acceso del formulario: 10 caracteres sin ambiguos (nada de l/1, o/0).
// Nadie lo teclea —el enlace se copia y se pega—, así que alargarlo no molesta a nadie
// y quita de la mesa el probar códigos hasta acertar: 31^10 combinaciones.
// Los códigos viejos de 6 siguen valiendo: son el nombre de su documento, sin más.
export function nuevoCodigo() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

// Cuántos eventos ve la oficina y de qué ventana de fechas salen
export const MAX_PROXIMOS = 8;

// Deja los avisos en su forma mínima: nombre y teléfono solo con dígitos (WhatsApp
// no traga espacios ni guiones). Los que se queden sin número no viajan.
//
// Aviso: estos números viajan en la lista que lee el formulario, porque es su pantalla
// de "Enviado" la que pinta el botón de avisar. Quien tenga el enlace del formulario
// puede verlos. Es el precio de que el aviso salga de un solo toque al enviar.
export function limpiarAvisos(avisos = []) {
  return (Array.isArray(avisos) ? avisos : [])
    .map(a => ({ nombre: (a.nombre || "").trim(), tel: String(a.tel || "").replace(/[^0-9]/g, "") }))
    .filter(a => a.tel.length >= 6)
    .slice(0, 6);
}

// Deja SOLO lo que la oficina necesita para reconocer un evento. Esta función es la
// frontera de lo que sale de la app: si algún día se añade un campo al evento, aquí
// no aparece salvo que se ponga a mano, que es justo lo que se quiere.
export function resumirParaOficina(eventosGuardados = {}, hoy = new Date().toISOString().slice(0, 10)) {
  return Object.entries(eventosGuardados)
    // El tipo va incluido para que, al elegir un evento que ya existe, el formulario
    // sepa qué preguntas tocan sin tener que preguntárselo otra vez a la oficina
    .map(([nombre, e]) => ({ nombre, fecha: e?.fechaEvento || "", sitio: e?.ubicacion || "", tipo: e?.evento || "boda" }))
    .filter(e => e.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, MAX_PROXIMOS);
}

// La app publica la lista corta cada vez que cambian sus eventos
export async function publicarProximos(codigo, eventosGuardados, avisos = []) {
  const conexion = await getDb();
  if (!conexion || !codigo) return;
  const { db, fs } = conexion;
  await fs.setDoc(fs.doc(db, "publico", codigo), {
    eventos: resumirParaOficina(eventosGuardados),
    // A quién avisar por WhatsApp al terminar de mandar. Va aquí porque el botón lo
    // pinta el formulario: es su "Enviar" el que encadena el aviso.
    avisos: limpiarAvisos(avisos),
    actualizado: Date.now(),
  });
}

// Cambiar el enlace tiene que MATAR el anterior: si el documento viejo se quedara ahí,
// quien tuviera el link de antes seguiría viendo la lista de eventos y mandando cosas.
export async function borrarProximos(codigo) {
  const conexion = await getDb();
  if (!conexion || !codigo) return;
  const { db, fs } = conexion;
  await fs.deleteDoc(fs.doc(db, "publico", codigo));
}

// El formulario lee la lista con su código. Distingue tres cosas, porque no son lo
// mismo: que el código no valga (hay que cerrar el formulario), que no haya conexión
// (se puede seguir rellenando) y que valga pero no haya eventos próximos.
export async function leerProximos(codigo) {
  const conexion = await getDb();
  if (!conexion || !codigo) return { ok: false, motivo: "no-existe" };
  const { db, fs } = conexion;
  try {
    const snap = await fs.getDoc(fs.doc(db, "publico", codigo));
    if (!snap.exists()) return { ok: false, motivo: "no-existe" };
    const d = snap.data();
    return { ok: true, eventos: d.eventos || [], avisos: Array.isArray(d.avisos) ? d.avisos : [] };
  } catch (e) {
    return { ok: false, motivo: "sin-conexion" };
  }
}

// El formulario escucha la lista EN VIVO. Antes se leía una sola vez al abrirlo: si la
// oficina lo dejaba abierto y en la app se creaba un evento nuevo, allí no aparecía
// hasta recargar — y nadie recarga una app que ya tiene abierta. Así el evento nuevo
// sale solo, sin tocar nada.
//
// Solo avisa cuando el documento EXISTE. Un fallo de red o un borrado momentáneo no
// pueden vaciarle la lista a quien está a media pregunta: en ese caso se sigue con lo
// último que había, que es más útil que una pantalla en blanco.
export function suscribirProximos(codigo, cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || !codigo || cancelado) return;
    const { db, fs } = conexion;
    unsub = fs.onSnapshot(
      fs.doc(db, "publico", codigo),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        cb({ eventos: d.eventos || [], avisos: Array.isArray(d.avisos) ? d.avisos : [] });
      },
      () => { /* sin conexión o sin permiso: se sigue con lo que ya había */ },
    );
  })();
  return () => { cancelado = true; unsub(); };
}

// Manda las respuestas. `eventoDestino` es el nombre del evento que han elegido de la
// lista, o "" si han dicho que es nuevo. La fecha la pone el servidor: así no depende
// del reloj del móvil de quien lo envía.
export async function enviarFormulario(codigo, respuestas, eventoDestino = "") {
  const conexion = await getDb();
  if (!conexion) throw new Error("sin-nube");
  const { db, fs } = conexion;
  const ref = fs.doc(fs.collection(db, "envios"));
  await fs.setDoc(ref, {
    codigo,
    respuestas,
    eventoDestino,
    enviado: fs.serverTimestamp(),
    version: 1,
  });
  return ref.id;
}

// La bandeja de la app: lo que ha mandado la oficina, del más nuevo al más viejo.
// Requiere sesión iniciada (lo dicen las reglas, no solo esta función).
export async function leerEnvios() {
  const conexion = await getDb();
  if (!conexion) return [];
  const { db, fs } = conexion;
  const snap = await fs.getDocs(fs.collection(db, "envios"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.enviado?.seconds || 0) - (a.enviado?.seconds || 0));
}

// Corregir un envío ya mandado: cambian los pax, se cae la barra libre, lo que sea.
// Solo funciona MIENTRAS no se haya revisado — lo dicen las reglas, no esta función.
// Si ya se revisó, la escritura falla y el formulario manda uno nuevo.
export async function corregirEnvio(id, respuestas, eventoDestino = "") {
  const conexion = await getDb();
  if (!conexion) throw new Error("sin-nube");
  const { db, fs } = conexion;
  await fs.updateDoc(fs.doc(db, "envios", id), {
    respuestas,
    eventoDestino,
    enviado: fs.serverTimestamp(),
    corregido: true,
  });
}

// La app escucha el buzón en vivo: así un envío nuevo (o uno corregido) se ve al
// momento sin tener que abrir nada ni recargar. Devuelve la función para dejar de
// escuchar.
export function suscribirEnvios(cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || cancelado) return;
    const { db, fs } = conexion;
    unsub = fs.onSnapshot(
      fs.collection(db, "envios"),
      (snap) => {
        const lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        cb(lista.sort((a, b) => (b.enviado?.seconds || 0) - (a.enviado?.seconds || 0)));
      },
      () => { /* sin conexión o sin permiso: la app sigue igual */ },
    );
  })();
  return () => { cancelado = true; unsub(); };
}

// Un envío revisado (aplicado o descartado) NO se borra: sale de la bandeja pero se
// queda guardado. Lo que mandó la oficina es la única prueba de lo que dijeron, y
// cuando algo no cuadra el día del evento es justo lo que hay que poder mirar.
export async function marcarRevisado(id, { aplicado, eventoDestino = "" } = {}) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.updateDoc(fs.doc(db, "envios", id), {
    revisado: Date.now(),
    aplicado: !!aplicado,
    aplicadoA: eventoDestino,
  });
}

// Separa lo que falta por mirar de lo que ya se miró. Función pura: la decisión de
// qué sigue pendiente no depende de la nube.
export function repartirEnvios(envios = []) {
  const pendientes = envios.filter(e => !e.revisado);
  const revisados = envios.filter(e => e.revisado)
    .sort((a, b) => (b.revisado || 0) - (a.revisado || 0));
  return { pendientes, revisados };
}

export async function borrarEnvio(id) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.deleteDoc(fs.doc(db, "envios", id));
}
