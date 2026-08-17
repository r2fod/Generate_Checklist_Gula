// ─── LA CONEXIÓN A FIRESTORE, COMPARTIDA ──────────────────────────────────────
// El equivalente de firebase.js pero para la base de datos: se abre UNA vez y la
// comparten todos los que la usan (nube.js y formulario/envios.js).
//
// Estaba escrita dos veces, y cada archivo tenía SU propia variable con la promesa:
// dos arranques de conexión independientes, y ya habían empezado a separarse —uno
// guardaba un paso intermedio y el otro no—. Un getDb que un día haga algo distinto
// según quién lo llame es de los fallos que no se ven hasta que se ven.
//
// Con firebaseConfig = null no se descarga ni se inicializa nada: la app funciona en
// local y los enlaces llevan la checklist dentro.
import { firebaseConfig } from "./firebaseConfig.js";
import { getFirebaseApp } from "./firebase.js";

let dbPromise = null;

// Devuelve { db, fs } o null si no hay nube. El módulo de Firestore se trae con
// import() dinámico: son 542 kB y no tienen por qué caer en el arranque de nadie.
export function getDb() {
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

// ¿Está activada la edición compartida? Síncrono, para decidir qué link generar sin
// tener que esperar a que cargue nada.
export const nubeActiva = () => !!firebaseConfig;

// ─── SUSCRIBIRSE A ALGO ───────────────────────────────────────────────────────
// El armazón de "escuchar cambios" estaba repetido SEIS veces, palabra por palabra:
// la promesa de conexión, la bandera de cancelado, el unsub que empieza vacío y el
// catch que se traga los fallos de red. Doce líneas iguales seis veces son doce
// sitios donde arreglar el mismo despiste.
//
// El detalle que hay que respetar y por el que no vale un onSnapshot pelado: entre
// que se pide la conexión y llega, quien se suscribió puede haberse ido. Sin la
// bandera se registra un oyente sobre un componente desmontado que ya no puede
// atender nada.
export function suscribir(comoEscuchar) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getDb();
    if (!conexion || cancelado) return;
    unsub = comoEscuchar(conexion) || (() => {});
  })();
  return () => { cancelado = true; unsub(); };
}
