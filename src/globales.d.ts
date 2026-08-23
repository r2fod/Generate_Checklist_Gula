// ─── LO QUE INVENTA EL EMPAQUETADOR ───────────────────────────────────────────
// `__BUILD_ID__` no existe en ningún fichero: lo sustituye Vite al compilar
// (vite.config.js → define), así que para `npm run tipos` es un nombre inventado y
// protesta. Aquí se le dice qué es. En node —las pruebas— NO existe de verdad, por eso
// quien lo usa lo hace dentro de un try/catch con respaldo (ver src/diario.js).
declare const __BUILD_ID__: string;
