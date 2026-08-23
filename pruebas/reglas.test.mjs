// ─── LAS REGLAS DE FIRESTORE, CONTRA EL EMULADOR DE VERDAD ────────────────────
// Hasta ahora las reglas se probaban contra un Firestore escrito a mano
// (`src/__tests__/firestore-simulado.mjs`), que las REPRODUCE en JavaScript. Eso vale
// para probar la sincronización sin red —y es rapidísimo—, pero tiene un agujero
// evidente: comprueba lo que alguien creyó que dicen las reglas, no lo que dicen.
// Un paréntesis mal puesto en `firestore.rules` no lo caza nadie.
//
// Esto pasa los MISMOS casos por el motor de reglas real de Google, cargando el fichero
// `firestore.rules` tal cual se despliega.
//
//   npm run reglas:test
//
// Necesita el emulador de Firestore, que es un JAR: hace falta Java y bajarlo una vez
// (`npx firebase-tools setup:emulators:firestore`). Si no está, esto NO falla: avisa y
// se salta, igual que hace el barrido del navegador cuando no hay chromium. En CI sí
// corre — el runner tiene Java y puede descargarlo.
//
// Los datos son inventados: el repositorio es público.
import { readFileSync } from "node:fs";
import { connect } from "node:net";

const PUERTO = 8080;
const HOST = "127.0.0.1";

// ¿Hay emulador escuchando? Se mira antes de importar nada suyo: la librería, sin
// emulador delante, se queda esperando y la prueba parece colgada.
const hayEmulador = await new Promise((listo) => {
  const s = connect({ host: HOST, port: PUERTO });
  const fin = (r) => { s.destroy(); listo(r); };
  s.setTimeout(1500);
  s.on("connect", () => fin(true));
  s.on("error", () => fin(false));
  s.on("timeout", () => fin(false));
});

if (!hayEmulador) {
  console.log("\n══ Las reglas de Firestore ══");
  console.log(`  Saltado: no hay emulador en ${HOST}:${PUERTO}.`);
  console.log("  Para lanzarlo:  npx firebase-tools emulators:exec --only firestore \"npm run reglas:test\"");
  console.log("  (necesita Java y bajar el JAR una vez; en CI ya se hace solo)");
  process.exit(0);
}

const { initializeTestEnvironment, assertFails, assertSucceeds } =
  await import("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } =
  await import("firebase/firestore");

let pasan = 0;
const fallos = [];
const ok = (cond, msg) => {
  if (cond) { pasan++; console.log(`  ✅ ${msg}`); }
  else { fallos.push(msg); console.log(`  ❌ ${msg}`); }
};
// Envuelve las dos aserciones de la librería para poder seguir contando como el resto
// de las baterías (y no parar en la primera que falle).
const permite = async (promesa, msg) => {
  try { await assertSucceeds(promesa); ok(true, msg); }
  catch (e) { ok(false, `${msg} → lo ha DENEGADO`); }
};
const deniega = async (promesa, msg) => {
  try { await assertFails(promesa); ok(true, msg); }
  catch (e) { ok(false, `${msg} → lo ha PERMITIDO`); }
};

const entorno = await initializeTestEnvironment({
  projectId: "gula-reglas-de-prueba",
  firestore: { host: HOST, port: PUERTO, rules: readFileSync("firestore.rules", "utf8") },
});

const conSesion = entorno.authenticatedContext("alguien-del-equipo").firestore();
const sinSesion = entorno.unauthenticatedContext().firestore();

// Deja un documento puesto saltándose las reglas: hace falta para probar las lecturas y
// las correcciones sin depender de que la escritura anterior estuviera permitida.
const sembrar = (ruta, datos) => entorno.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), ruta), datos);
});

console.log("\n══ Las reglas de Firestore, contra el emulador ══");

console.log("\n── eventos/: el enlace ES la llave ──");
{
  await sembrar("eventos/evt-inventado", { estado: "{}" });
  await permite(getDoc(doc(sinSesion, "eventos/evt-inventado")),
    "quien tiene el enlace abre el evento sin cuenta: así se le pasa la lista a quien carga");
  await permite(setDoc(doc(sinSesion, "eventos/evt-inventado"), { estado: "{}" }),
    "y puede marcar lo cargado, que es justo para lo que se le pasa");
  await deniega(getDocs(collection(sinSesion, "eventos")),
    "pero NO se puede listar la colección: sin conocer el id no se llega a ningún evento");
}

console.log("\n── indice/: el archivo del equipo, con sesión ──");
{
  await sembrar("indice/evt_boda-inventada-1a2b", { nombre: "Boda inventada", estado: "{}" });
  await permite(getDoc(doc(conSesion, "indice/evt_boda-inventada-1a2b")), "el equipo lee su archivo");
  await permite(setDoc(doc(conSesion, "indice/precios"), { precios: "{}" }), "y lo escribe");
  await deniega(getDoc(doc(sinSesion, "indice/evt_boda-inventada-1a2b")),
    "sin sesión no se lee: ahí están los nombres de los clientes y los códigos del calendario");
  await deniega(setDoc(doc(sinSesion, "indice/precios"), { precios: "{}" }), "ni se escribe");
}

console.log("\n── calendario/: dos documentos, uno de mirar y otro de tocar ──");
{
  const bueno = { apuntes: "[]", equipo: "[]", ver: "codigodever12", actualizado: Date.now() };
  await permite(setDoc(doc(sinSesion, "calendario/codigoreal123"), bueno),
    "con el código se escribe el calendario sin cuenta: es el enlace que usa el equipo");
  await permite(getDoc(doc(sinSesion, "calendario/codigoreal123")), "y se lee igual");
  await deniega(getDocs(collection(sinSesion, "calendario")),
    "listar la colección, no: si no, se verían todos los calendarios que existen");
  await deniega(setDoc(doc(sinSesion, "calendario/codigoreal123"), { ...bueno, loQueSea: "x" }),
    "un campo de más se rechaza: un calendario no puede acabar siendo el almacén de otra cosa");
  await deniega(setDoc(doc(sinSesion, "calendario/codigoreal123"), { ...bueno, apuntes: "x".repeat(900001) }),
    "y pasado el tope de tamaño tampoco (900 kB deja sitio sin acercarse al MiB del documento)");
  await deniega(setDoc(doc(sinSesion, "calendario/codigoreal123"), { ...bueno, apuntes: [] }),
    "los apuntes viajan como texto JSON, no como array: si no, el formato lo mandaría Firestore");
}

console.log("\n── publico/: la lista corta que ve la oficina ──");
{
  await sembrar("publico/CODIGO1234", { eventos: [], avisos: [], actualizado: Date.now() });
  await permite(getDoc(doc(sinSesion, "publico/CODIGO1234")),
    "la oficina la lee con su código, sin cuenta");
  await deniega(getDocs(collection(sinSesion, "publico")),
    "pero no puede listar los buzones de las demás");
  await deniega(setDoc(doc(sinSesion, "publico/CODIGO1234"), { eventos: [] }),
    "ni escribirla: el enlace es para leer y mandar, no para cambiarle la lista al equipo");
  await permite(setDoc(doc(conSesion, "publico/CODIGO1234"), { eventos: [], avisos: [], actualizado: Date.now() }),
    "la escribe la app, que sí tiene sesión");
}

console.log("\n── envios/: crear sí, cotillear no ──");
{
  const envio = {
    codigo: "CODIGO1234",
    respuestas: { tipo: "boda", pax: 120 },
    eventoDestino: "Boda inventada",
    enviado: serverTimestamp(),
    version: 1,
  };
  await permite(setDoc(doc(sinSesion, "envios/envio-1"), envio),
    "quien tiene el código manda el formulario sin cuenta");
  await deniega(setDoc(doc(sinSesion, "envios/envio-2"), { ...envio, enviado: new Date() }),
    "la fecha la pone el SERVIDOR: con la del móvil, un reloj mal puesto adelanta o atrasa un envío");
  await deniega(setDoc(doc(sinSesion, "envios/envio-3"), { ...envio, loQueSea: "x" }),
    "un campo que no toca tumba el envío");
  await deniega(getDocs(collection(sinSesion, "envios")),
    "y no se puede listar el buzón: los envíos de las demás no son suyos");
  await permite(getDocs(collection(conSesion, "envios")), "el equipo sí lo lee entero");

  // Corregir lo mandado, mientras nadie lo haya revisado.
  await permite(updateDoc(doc(sinSesion, "envios/envio-1"), {
    respuestas: { tipo: "boda", pax: 140 }, enviado: serverTimestamp(), corregido: true,
  }), "se corrige lo mandado mientras esté sin revisar: cambian los pax y no hace falta mandar otro");
  await deniega(updateDoc(doc(sinSesion, "envios/envio-1"), {
    codigo: "OTROBUZON1", respuestas: {}, enviado: serverTimestamp(),
  }), "no se puede mover a otro buzón cambiándole el código");

  await sembrar("envios/envio-revisado", { ...envio, enviado: new Date(), revisado: Date.now() });
  await deniega(updateDoc(doc(sinSesion, "envios/envio-revisado"), {
    respuestas: { pax: 200 }, enviado: serverTimestamp(),
  }), "y una vez revisado ya no: lo aplicado a la checklist y lo mandado dejarían de decir lo mismo");
  await deniega(deleteDoc(doc(sinSesion, "envios/envio-1")), "borrar es cosa del equipo");
}

console.log("\n── todo lo demás, denegado ──");
{
  await deniega(getDoc(doc(sinSesion, "loquesea/x")), "una colección que no existe en las reglas no se lee");
  await deniega(setDoc(doc(conSesion, "loquesea/x"), { a: 1 }),
    "ni se escribe, ni siquiera con sesión: lo que no está permitido está prohibido");
}

await entorno.cleanup();

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Las reglas dicen lo que creemos que dicen.");
