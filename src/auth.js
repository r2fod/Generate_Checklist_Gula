// ─── ACCESO DEL EQUIPO (Firebase Authentication) ───────────────────────────────
// Login con correo y contraseña compartidos por el equipo. Protege la app interna
// (crear eventos y ver el archivo completo de eventos guardados). Los links de un
// evento concreto (?evento=id) NO pasan por aquí: dan acceso directo a ese evento
// para poder mandarlos al móvil del personal.
//
// El SDK de auth se carga con import() dinámico SOLO si hay configuración de Firebase.
import { firebaseConfig } from "./firebaseConfig.js";
import { getFirebaseApp } from "./firebase.js";

let authPromise = null;

function getAuth() {
  if (!firebaseConfig) return null;
  if (!authPromise) {
    authPromise = (async () => {
      const app = await getFirebaseApp();
      const sdk = await import("firebase/auth");
      return { auth: sdk.getAuth(app), sdk };
    })();
  }
  return authPromise;
}

// ¿Está configurado el acceso? (síncrono, para decidir si se muestra el login)
export const accesoActivo = () => !!firebaseConfig;

export async function iniciarSesion(email, password) {
  const conexion = await getAuth();
  if (!conexion) throw new Error("Acceso no configurado");
  await conexion.sdk.signInWithEmailAndPassword(conexion.auth, email, password);
}

export async function cerrarSesion() {
  const conexion = await getAuth();
  if (!conexion) return;
  await conexion.sdk.signOut(conexion.auth);
}

// Avisa (cb) con el usuario actual (o null si no hay sesión) al arrancar y en cada
// cambio de sesión. Devuelve una función para cancelar la suscripción.
export function observarSesion(cb) {
  let unsub = () => {};
  let cancelado = false;
  (async () => {
    const conexion = await getAuth();
    if (!conexion || cancelado) { cb(null); return; }
    unsub = conexion.sdk.onAuthStateChanged(conexion.auth, (usuario) => cb(usuario));
  })();
  return () => { cancelado = true; unsub(); };
}
