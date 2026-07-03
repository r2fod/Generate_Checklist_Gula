// ─── SINCRONIZACIÓN EN LA NUBE (Firestore) ─────────────────────────────────────
// El SDK de Firebase se carga con import() dinámico SOLO si hay configuración:
// con firebaseConfig = null la app no descarga nada extra y funciona como siempre.
import { firebaseConfig } from "./firebaseConfig.js";

let dbPromise = null;

function getDb() {
  if (!firebaseConfig) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp } = await import("firebase/app");
      const fs = await import("firebase/firestore");
      const db = fs.getFirestore(initializeApp(firebaseConfig));
      return { db, fs };
    })();
  }
  return dbPromise;
}

// ¿Está activada la edición compartida? (síncrono, para decidir qué link generar)
export const nubeActiva = () => !!firebaseConfig;

// Id corto y legible para el link (~8 caracteres sin ambiguos: 31^8 combinaciones)
export function nuevoIdEvento() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
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
