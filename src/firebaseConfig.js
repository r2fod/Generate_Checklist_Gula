// ─── CONFIGURACIÓN DE FIREBASE (edición compartida en la nube) ─────────────────
//
// Con null la app funciona como siempre: los links llevan la checklist dentro
// (?c=...) y no hay sincronización entre dispositivos.
//
// Para activar la nube: crea un proyecto en https://console.firebase.google.com
// con una base de datos Firestore, añade una "app web" y pega aquí el bloque de
// configuración que te da Firebase, así:
//
// export const firebaseConfig = {
//   apiKey: "AIza...",
//   authDomain: "gula-checklist.firebaseapp.com",
//   projectId: "gula-checklist",
//   storageBucket: "gula-checklist.appspot.com",
//   messagingSenderId: "...",
//   appId: "...",
// };
//
// Y en Firestore → Reglas, pega esto (cualquiera con el link puede ver/editar,
// como un Google Docs con "cualquiera con el enlace"):
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /eventos/{id} {
//       allow read, write: if true;
//     }
//   }
// }

export const firebaseConfig = {
  apiKey: "AIzaSyB12RMvRIn_ijoBD2QBhRTae7EMozMrXpQ",
  authDomain: "gula-checklist.firebaseapp.com",
  projectId: "gula-checklist",
  storageBucket: "gula-checklist.firebasestorage.app",
  messagingSenderId: "157739109937",
  appId: "1:157739109937:web:f9436e49089e61efd00f10",
};
