// Pruebas del asistente: qué puede hacer y qué NO puede hacer. Sin navegador y sin red.
//
//   node src/__tests__/asistente.test.mjs
//
// Las que más importan no son las que comprueban que funciona, son las que comprueban
// que NO hace de más: que ninguna herramienta escribe, que a un proveedor que entrena
// con lo que recibe no le llega un solo nombre de cliente, y que el bucle no se queda
// dando vueltas. Un asistente que consulta mal da una respuesta rara; uno que escribe
// mal borra el trabajo de quien está cargando el camión.
import { HERRAMIENTAS, NOMBRES_HERRAMIENTAS, SIN_DATOS, ejecutar, catalogoParaModelo } from "../asistente/herramientas.js";
import { preguntar } from "../asistente/cliente.js";

let pasan = 0;
const fallos = [];
const ok = (cond, msg) => {
  if (cond) { pasan++; console.log(`  ✅ ${msg}`); }
  else { fallos.push(msg); console.log(`  ❌ ${msg}`); }
};

// Nombres inventados: en el repositorio no entra ni un cliente de verdad.
const CTX = {
  eventosGuardados: {
    "Boda Fulanita y Mengano": {
      evento: "boda", pax: 100, ninos: 10, fechaEvento: "2026-09-12", horaInicio: "13:00",
      ubicacion: "Finca de prueba", barraCoctel: true, horasCoctel: 1, barraCopas: true, horasCopas: 4,
      notasEvento: "⚠️ ALERGIAS: 2 celíacos, 1 vegano",
      logisticaEquipo: [{ nombre: "Alguien", inicio: "07:00", fin: "23:00" }],
      // Estos NO tienen que salir por ninguna herramienta: son el trabajo de quien carga.
      checkeados: { "Bebidas::Vino blanco": true }, vueltos: { "Bebidas::Cava": "3" },
      preparados: { "Bebidas::Cerveza Alhambra (tercios)": true }, roturas: { "Cristalería::Copas de vino": "4" },
    },
    "Comunión de prueba": { evento: "comunion", pax: 60, ninos: 25, fechaEvento: "2026-05-03", ubicacion: "Salón" },
  },
  apuntes: [
    { id: "a1", fecha: "2026-09-12", titulo: "Boda Fulanita y Mengano", tipo: "boda", sitio: "Finca de prueba", pax: 110, evento: "Boda Fulanita y Mengano" },
    { id: "a2", fecha: "2026-10-04", titulo: "Corporativo de prueba", tipo: "corporativo", sitio: "Nave", pax: 80 },
  ],
};

console.log("\n── Lo que el asistente NO puede hacer ──");
{
  // Ninguna herramienta escribe. Se comprueba de la única forma que vale: ejecutándolas
  // todas y viendo que el contexto sale intacto, byte por byte.
  const antes = JSON.stringify(CTX);
  NOMBRES_HERRAMIENTAS.forEach(n => ejecutar(n, { nombre: "Boda Fulanita y Mengano", texto: "boda", adultos: 50, comensales: 50, tipo: "boda" }, CTX));
  ok(JSON.stringify(CTX) === antes, "ejecutar las herramientas no cambia ni un dato de la app");

  // Los cuatro campos que no se pueden tocar tampoco se pueden LEER: si el modelo no
  // los ve, no puede razonar sobre ellos ni proponer pisarlos.
  const todo = NOMBRES_HERRAMIENTAS
    .map(n => JSON.stringify(ejecutar(n, { nombre: "Boda Fulanita y Mengano", adultos: 50, comensales: 50, tipo: "boda" }, CTX)))
    .join(" ");
  ["checkeados", "preparados", "vueltos", "roturas"].forEach(campo => {
    ok(!todo.includes(campo), `ninguna herramienta devuelve "${campo}"`);
  });

  // Una herramienta que no existe no revienta la conversación: contesta un error legible
  ok(ejecutar("borrar_todo", {}, CTX).error, "una herramienta inventada devuelve error, no explota");
  // Ni un contexto vacío
  ok(ejecutar("ver_evento", { nombre: "lo que sea" }, {}).error, "sin datos tampoco explota");
}

console.log("\n── Los datos de clientes y quién puede verlos ──");
{
  // El catálogo recortado es lo único que se le manda a un proveedor que entrena con lo
  // que recibe. Si esto falla, se están regalando los clientes.
  const recortado = catalogoParaModelo(true).map(h => h.name);
  ok(recortado.length === SIN_DATOS.length && recortado.every(n => !HERRAMIENTAS[n].datos),
    `el catálogo recortado son solo las de calcular → ${recortado.join(", ")}`);
  ok(!recortado.includes("buscar_eventos") && !recortado.includes("ver_evento") && !recortado.includes("ver_calendario"),
    "y no lleva ninguna que devuelva nombres, fechas o sitios");
  ok(catalogoParaModelo(false).length === NOMBRES_HERRAMIENTAS.length,
    "el catálogo entero sí las lleva todas");

  // Las marcadas sin datos no pueden devolver datos aunque se les pase un evento
  SIN_DATOS.forEach(n => {
    const r = JSON.stringify(ejecutar(n, { nombre: "Boda Fulanita y Mengano", adultos: 50, comensales: 50, tipo: "boda" }, CTX));
    ok(!/Fulanita|Finca de prueba|2026-09-12/.test(r), `${n} no deja escapar ningún dato del evento`);
  });
}

console.log("\n── Consultar de verdad ──");
{
  const buscado = ejecutar("buscar_eventos", { texto: "fulanita" }, CTX);
  ok(buscado.total === 1 && buscado.eventos[0].nombre === "Boda Fulanita y Mengano",
    "busca por parte del nombre, sin tildes ni mayúsculas");
  ok(ejecutar("buscar_eventos", { desde: "2026-09-01" }, CTX).total === 1, "y filtra por fecha");

  const ev = ejecutar("ver_evento", { nombre: "boda fulanita" }, CTX);
  ok(ev.adultos === 100 && ev.ninos === 10 && ev.barraCopas === 4, "los datos del evento salen bien");
  ok(ev.menusEspeciales.join(" ").includes("2 × Menú sin gluten"),
    `y las alergias llegan contadas → ${ev.menusEspeciales.join(", ")}`);

  // Sin nombre coge el evento abierto: "¿cuánto hielo llevo?" se pregunta con él delante
  const abierto = ejecutar("ver_evento", {}, { ...CTX, eventoActual: { nombreEvento: "El de ahora", evento: "boda", pax: 40 } });
  ok(abierto.nombre === "El de ahora", "sin nombre contesta sobre el evento abierto");
  ok(ejecutar("ver_evento", {}, CTX).error, "y sin ninguno abierto lo dice, no se inventa uno");

  // Los números salen de las fórmulas de la casa, no de la cabeza del modelo
  const beb = ejecutar("calcular_bebida", { adultos: 100, ninos: 10, horasCoctel: 1, horasCopas: 4, verano: true }, CTX);
  ok(beb.bebida && beb.bebida.cerveza > 0 && beb.bebida.vinoBlanco > 0, "calcular_bebida devuelve las cifras reales");
  ok(ejecutar("calcular_hielo", { comensales: 110, verano: true, horasBarra: 5 }).kg > 0, "y el hielo sale en kilos");
  ok(ejecutar("calcular_bebida", { adultos: 0 }).error, "sin comensales lo dice en vez de devolver ceros");

  const ch = ejecutar("ver_checklist", { nombre: "fulanita", categoria: "bebida" }, CTX);
  ok(ch.categorias && ch.categorias.length >= 1 && ch.categorias[0].items.length > 3,
    `una categoría suelta trae sus items → ${ch.categorias ? ch.categorias[0].categoria : "?"}`);
  ok(ejecutar("ver_checklist", { nombre: "fulanita", categoria: "unicornios" }, CTX).error.includes("Las que hay"),
    "y una categoría que no existe contesta con las que sí hay");

  const esc = ejecutar("ver_escaleta", { nombre: "fulanita" }, CTX);
  ok(esc.tramos && esc.tramos.length >= 7 && /Salida/.test(esc.resumen), "la escaleta sale con sus tramos");
  ok(ejecutar("ver_escaleta", { nombre: "comunión" }, CTX).error,
    "y un evento sin hora de inicio lo dice, no inventa una escaleta");

  ok(ejecutar("ver_calendario", { desde: "2026-10-01" }, CTX).total === 1, "el calendario filtra por fechas");
  ok(ejecutar("simular_checklist", { tipo: "boda", adultos: 80 }, CTX).categorias.length > 5,
    "y se puede simular un evento que todavía no existe");
}

console.log("\n── El bucle de herramientas ──");
{
  // Un Worker de mentira: contesta lo que se le diga, sin red.
  const workerFalso = (guion) => {
    let vuelta = 0;
    globalThis.fetch = async () => ({
      ok: true, status: 200,
      json: async () => guion[Math.min(vuelta++, guion.length - 1)],
    });
  };

  workerFalso([
    { texto: "", llamadas: [{ id: "1", nombre: "calcular_hielo", argumentos: { comensales: 100, verano: true, horasBarra: 4 } }] },
    { texto: "Hacen falta 122 kg." },
  ]);
  const r = await preguntar({ texto: "¿cuánto hielo?", contexto: CTX, url: "http://falso", proveedor: "gemini" });
  ok(r.respuesta === "Hacen falta 122 kg.", "una llamada a herramienta y su respuesta");
  ok(r.pasos.length === 1 && r.pasos[0].nombre === "calcular_hielo" && r.pasos[0].resultado.kg > 0,
    "y queda apuntado qué herramienta se usó y qué contestó");

  // Un modelo que se empeña en pedir lo mismo no puede dejar el navegador dando vueltas
  workerFalso([{ texto: "", llamadas: [{ id: "x", nombre: "calcular_hielo", argumentos: { comensales: 10 } }] }]);
  const bucle = await preguntar({ texto: "hola", contexto: CTX, url: "http://falso" });
  ok(/dando vueltas/.test(bucle.respuesta), "el bucle tiene tope y lo dice en vez de colgarse");
  ok(bucle.pasos.length <= 6, `y no pasa de seis vueltas (${bucle.pasos.length})`);

  // Con OpenAI, una herramienta con datos se rechaza AQUÍ aunque el modelo la pida
  workerFalso([
    { texto: "", llamadas: [{ id: "1", nombre: "ver_evento", argumentos: { nombre: "Boda Fulanita y Mengano" } }] },
    { texto: "No puedo con este proveedor." },
  ]);
  const bloqueado = await preguntar({ texto: "dime la boda", contexto: CTX, url: "http://falso", proveedor: "openai" });
  ok(bloqueado.pasos.length === 0, "con OpenAI no se ejecuta ninguna herramienta con datos de clientes");
  ok(!JSON.stringify(bloqueado.mensajes).includes("Finca de prueba"),
    "y ni un dato del evento entra en la conversación");

  // Un error del Worker llega en cristiano, no como un hueco
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "Hace falta tener sesión del equipo." }) });
  let mensaje = "";
  try { await preguntar({ texto: "hola", contexto: CTX, url: "http://falso" }); }
  catch (e) { mensaje = e.message; }
  ok(/sesión del equipo/.test(mensaje), `el error del Worker llega tal cual → "${mensaje}"`);

  // Sin configurar, se dice; no se llama a un sitio que no existe
  let sinUrl = "";
  try { await preguntar({ texto: "hola", contexto: CTX }); } catch (e) { sinUrl = e.message; }
  ok(/no está configurado/.test(sinUrl), "sin dirección del Worker avisa en vez de fallar por la red");
}

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
