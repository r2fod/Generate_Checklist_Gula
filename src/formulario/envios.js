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

// Código de acceso del formulario: 6 caracteres sin ambiguos (nada de l/1, o/0)
export function nuevoCodigo() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

// Cuántos eventos ve la oficina y de qué ventana de fechas salen
export const MAX_PROXIMOS = 8;

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
export async function publicarProximos(codigo, eventosGuardados) {
  const conexion = await getDb();
  if (!conexion || !codigo) return;
  const { db, fs } = conexion;
  await fs.setDoc(fs.doc(db, "publico", codigo), {
    eventos: resumirParaOficina(eventosGuardados),
    actualizado: Date.now(),
  });
}

// El formulario lee la lista con su código
export async function leerProximos(codigo) {
  const conexion = await getDb();
  if (!conexion || !codigo) return null;
  const { db, fs } = conexion;
  try {
    const snap = await fs.getDoc(fs.doc(db, "publico", codigo));
    if (!snap.exists()) return null;
    return snap.data().eventos || [];
  } catch (e) {
    return null; // código que ya no vale, o sin conexión
  }
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

// La bandeja de la app: los envíos que aún no se han revisado, del más nuevo al más
// viejo. Requiere sesión iniciada (lo dicen las reglas, no solo esta función).
export async function leerEnvios() {
  const conexion = await getDb();
  if (!conexion) return [];
  const { db, fs } = conexion;
  const snap = await fs.getDocs(fs.collection(db, "envios"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.enviado?.seconds || 0) - (a.enviado?.seconds || 0));
}

export async function borrarEnvio(id) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.deleteDoc(fs.doc(db, "envios", id));
}
