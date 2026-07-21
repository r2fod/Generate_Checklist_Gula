// ─── APP DE FIREBASE COMPARTIDA ────────────────────────────────────────────────
// Inicializa la app de Firebase UNA sola vez y la comparten Firestore (nube.js) y
// Authentication (auth.js), para no crear dos apps y evitar el error de "app
// duplicada". Con firebaseConfig = null no se carga ni se inicializa nada.
import { firebaseConfig } from "./firebaseConfig.js";

let appPromise = null;

export const firebaseDisponible = () => !!firebaseConfig;

export function getFirebaseApp() {
  if (!firebaseConfig) return null;
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      // Reutiliza la app si ya existe (p. ej. si otro módulo la inicializó antes)
      return getApps().length ? getApp() : initializeApp(firebaseConfig);
    })();
  }
  return appPromise;
}
