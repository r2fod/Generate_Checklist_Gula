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
import { preguntar, SISTEMA } from "../asistente/cliente.js";
import { recordar, olvidar, refuerza, poda, parecido, paraElContexto, porTemas, saneaMemoria, MAX_RECUERDOS } from "../asistente/memoria.js";
import { conectores, conectoresActivos, conHerramientasDeConectores, registrarConector } from "../asistente/conectores.js";
import { todas, llevaDatos } from "../asistente/herramientas.js";
import { comprimir, ahorro } from "../asistente/comprimir.js";
import { candidatos, elige, mereceOtroIntento, preguntaLlevaDatos, preguntaPideCabeza, ORDEN } from "../asistente/enrutado.js";
import { saneaGasto, apuntar, resumen, euros, eurosTotales, puedePreguntar, esGratis, mesActual, PRECIOS, totales, costeDeUna } from "../asistente/gasto.js";
import { NIVELES, CLAVES_NIVEL, NUNCA, puede as permite, pideConfirmacion, comoContarlo } from "../asistente/permisos.js";
import { revisarEvento, revisarProximos } from "../asistente/revision.js";
import { aplicarEnCalendario } from "../asistente/escrituraCalendario.js";
import { contextoDelAsistente, eventoAbierto } from "../asistente/contexto.js";
import { idDeApunte } from "../calendario/apuntes.js";
import { gestoDeHerramienta } from "../asistente/gestos.js";
import { repasar } from "../../worker/repaso.js";
import { sinMarcas } from "../asistente/texto.js";
import { queHacerConLaUrl } from "../asistente/proxy.js";
import { readFileSync } from "node:fs";
import { COMPANEROS, CLAVES_COMPANERO, CLAVES_DIBUJADAS, companeroValido, COMPANERO_POR_DEFECTO } from "../asistente/companeros.js";
import { comoHabla, PERSONALIDADES, CLAVES_PERSONALIDAD } from "../asistente/personalidad.js";
import { saneaTareas, apuntarTarea, marcarTarea, quitarTarea, limpiarViejas, porEvento, sinHacer, paraElContexto as tareasContexto, MAX_TAREAS } from "../asistente/tareas.js";
import { saneaObjetivos, ponerObjetivo, cambiarEstado, quitarObjetivo, paraElContexto as metasContexto, cuantosActivos, MAX_OBJETIVOS } from "../asistente/objetivos.js";
import { arbol, contextoPlegado, grafo, porTema, porFuente, porDia } from "../asistente/arbol.js";
import { parte, foto, queHaCambiado, comoVanLosObjetivos } from "../asistente/subconsciente.js";
import { tituloDe, saneaCharlas, guardarCharla, borrarCharla, cuandoFue } from "../asistente/conversaciones.js";
import { aplicarEnTareas, encadenar } from "../asistente/escrituraTareas.js";
import { aplicarEnChecklists } from "../asistente/escrituraChecklists.js";
import { paraLeerEnVozAlta, hayEscucha, hayVoz } from "../asistente/voz.js";
import { NOMBRES_HERRAMIENTAS as TODAS_LAS_HERRAMIENTAS } from "../asistente/herramientas.js";
import { buildChecklist as construye } from "../checklist-generadores.js";

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
  // El catálogo entero lleva las de casa Y las de los conectores encendidos: si esto
  // fuera solo las de casa, una integración nueva no llegaría nunca al modelo.
  // Con el nivel por defecto (solo consultar) las de escribir NO salen, así que se
  // pide con confianza: aquí se comprueba el catálogo, no los permisos.
  ok(catalogoParaModelo(false, {}, "confianza").length >= NOMBRES_HERRAMIENTAS.length,
    `el catálogo entero lleva las de casa y las de los conectores (${catalogoParaModelo(false, {}, "confianza").length} de ${NOMBRES_HERRAMIENTAS.length} propias)`);
  ok(catalogoParaModelo(false).length < catalogoParaModelo(false, {}, "confianza").length,
    "y en solo consultar salen menos, que es de lo que va el nivel");

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

  // El diario: una línea por ida y vuelta, no una por pregunta. El total solo dice
  // cuánto; el diario dice en qué vuelta se fue, que es lo que se puede arreglar.
  workerFalso([
    { texto: "", llamadas: [{ id: "1", nombre: "calcular_hielo", argumentos: { comensales: 100 } }], uso: { entrada: 900, salida: 40 } },
    { texto: "", llamadas: [{ id: "2", nombre: "calcular_hielo", argumentos: { comensales: 50 } }], uso: { entrada: 4000, salida: 30 } },
    { texto: "Ya está.", uso: { entrada: 4200, salida: 60 } },
  ]);
  const conDiario = await preguntar({ texto: "¿cuánto hielo?", contexto: CTX, url: "http://falso", proveedor: "gemini" });
  ok(conDiario.diario.length === 3, `el diario trae una línea por vuelta (${conDiario.diario.length})`);
  ok(conDiario.diario[0].uso.entrada === 900 && conDiario.diario[2].uso.entrada === 4200,
    "y cada una con lo que costó ella, no con el total");
  ok(conDiario.uso.entrada === 9100 && conDiario.uso.salida === 130,
    `y el total sigue siendo la suma (${conDiario.uso.entrada}+${conDiario.uso.salida})`);
  ok(conDiario.diario[0].herramientas[0] === "calcular_hielo" && conDiario.diario[2].herramientas.length === 0,
    "y qué pidió el modelo en cada vuelta, para ver cuál dispara la siguiente");

  // Un modelo que se empeña en pedir lo mismo no puede dejar el navegador dando vueltas
  workerFalso([{ texto: "", llamadas: [{ id: "x", nombre: "calcular_hielo", argumentos: { comensales: 10 } }], uso: { entrada: 100, salida: 10 } }]);
  const bucle = await preguntar({ texto: "hola", contexto: CTX, url: "http://falso" });
  ok(/dando vueltas/.test(bucle.respuesta), "el bucle tiene tope y lo dice en vez de colgarse");
  ok(bucle.pasos.length <= 6, `y no pasa de seis vueltas (${bucle.pasos.length})`);
  // Quedarse sin vueltas no es gratis: esas idas y venidas se han pagado igual.
  ok(bucle.uso && bucle.uso.entrada > 0 && bucle.diario.length === bucle.pasos.length,
    `y aun sin respuesta se cuenta lo que costó (${bucle.uso ? bucle.uso.entrada : 0} tk)`);

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

console.log("\n── El cerebro ──");
{
  const guarda = (mem, texto, tema) => recordar(mem, texto, { tema }).memoria;

  // Lo importante: aprender lo mismo dicho de otra forma NO son dos recuerdos. Sin esto,
  // a los seis meses hay nueve versiones de "en esa finca no hay enchufe" y cada
  // pregunta arrastra las nueve.
  let m = guarda([], "En la finca de ejemplo no hay enchufe en la carpa", "sitios");
  m = guarda(m, "En la finca de ejemplo no hay enchufes en la carpa, hay que llevar generador", "sitios");
  ok(m.length === 1, `lo mismo con más detalle se funde (${m.length})`);
  ok(/generador/.test(m[0].texto), "y se queda la redacción NUEVA, que es la que está al día");
  ok(m[0].puntos === 2, "con más peso, porque se ha dicho dos veces");

  // Y el fundido peligroso NO ocurre: dos frases con la misma forma pero distinto
  // contenido son dos cosas distintas, y fundirlas perdería una.
  let n = guarda([], "En bodas ponemos 4 de cocina", "equipo");
  n = guarda(n, "En comuniones ponemos 3 de cocina", "equipo");
  ok(n.length === 2, `bodas y comuniones NO se funden (${n.length})`);
  ok(parecido("En bodas ponemos 4 de cocina", "En comuniones ponemos 3 de cocina") < 0.7,
    "porque no se parecen lo bastante");

  // El mismo recuerdo guardado desde dos móviles es UNO: el id sale del texto
  ok(saneaMemoria([{ texto: "Hola qué tal" }, { texto: "Hola qué tal" }]).length === 1,
    "el mismo recuerdo dos veces se queda en uno");

  // Un tema inventado cae en general en vez de crear un cajón nuevo
  ok(guarda([], "algo", "inventado")[0].tema === "general", "un tema que no existe cae en general");
  ok(recordar([], "   ").recuerdo === null, "y el texto vacío no crea recuerdo");

  // El tope: la memoria no puede crecer sin límite, porque cada pregunta la arrastra
  const muchos = Array.from({ length: MAX_RECUERDOS + 50 }, (_, i) => ({ texto: `Cosa numero ${i} de prueba`, tema: "general", puntos: i % 7 + 1, usado: i }));
  const podada = poda(muchos);
  ok(podada.length === MAX_RECUERDOS, `la memoria tiene tope (${podada.length})`);
  ok(Math.min(...podada.map(r => r.puntos)) >= Math.min(...muchos.map(r => r.puntos)),
    "y al podar se van los de menos peso, no los últimos que entraron");

  // Reforzar: lo que se usa sube. Es lo que separa un recuerdo útil de uno que alguien
  // apuntó una vez y no volvió a hacer falta.
  const antes = m[0].puntos;
  ok(refuerza(m, [m[0].id])[0].puntos === antes + 1, "usar un recuerdo lo refuerza");
  ok(refuerza(m, ["no-existe"])[0].puntos === antes, "y reforzar uno que no está no toca nada");

  // Olvidar de verdad
  ok(olvidar(m, m[0].id).memoria.length === 0 && olvidar(m, m[0].id).habia, "olvidar borra y lo dice");
  ok(!olvidar(m, "fantasma").habia, "y olvidar algo que no está lo dice también");

  // Lo que viaja en cada pregunta: agrupado por tema y con tope de tamaño
  let g = guarda([], "En la finca A no hay agua corriente", "sitios");
  g = guarda(g, "En comuniones ponemos 3 de cocina", "equipo");
  const ctxMem = paraElContexto(g);
  ok(/Fincas y sitios:/.test(ctxMem.texto) && /Cómo trabaja el equipo:/.test(ctxMem.texto),
    "el contexto va agrupado por temas");
  ok(ctxMem.ids.length === 2, "y devuelve qué recuerdos han viajado, para poder reforzarlos");
  ok(paraElContexto(g, { max: 20 }).texto.length < 200, "con poco sitio se lleva solo lo mejor");
  ok(paraElContexto([]).texto === "", "y sin memoria no mete nada en la conversación");

  ok(porTemas(g).length === 2 && porTemas([]).length === 0, "porTemas agrupa para la pantalla");
}

console.log("\n── El cerebro, desde el asistente ──");
{
  // El cerebro escribe. Es lo ÚNICO que escribe, y hay que comprobar que sigue sin
  // poder tocar nada más: un asistente que aprende está bien, uno que marca items no.
  let mem = [];
  const ctx = {
    ...CTX,
    memoria: mem,
    onRecordar: (t, tema) => { const r = recordar(mem, t, { tema }); mem = r.memoria; return r; },
    onOlvidar: (id) => { mem = olvidar(mem, id).memoria; },
  };
  const antes = JSON.stringify(CTX.eventosGuardados);

  const r1 = ejecutar("recordar", { texto: "En la finca de prueba no hay enchufe en la carpa", tema: "sitios" }, ctx);
  ok(r1.guardado && !r1.yaLoSabia && mem.length === 1, "el asistente puede aprender algo");
  const r2 = ejecutar("recordar", { texto: "En la finca de prueba no hay enchufes en la carpa", tema: "sitios" }, ctx);
  ok(r2.yaLoSabia && mem.length === 1, "y si ya lo sabía lo dice en vez de duplicarlo");
  ok(JSON.stringify(CTX.eventosGuardados) === antes, "aprender no toca ni un evento");

  ctx.memoria = mem;
  ok(ejecutar("ver_cerebro", {}, ctx).grupos.length === 1, "puede enseñar lo que sabe");
  ok(ejecutar("olvidar", { texto: "enchufe" }, ctx).olvidado && mem.length === 0,
    "y puede olvidarlo cuando resulta que era falso");
  ok(ejecutar("olvidar", { texto: "algo que nunca dijo nadie" }, { ...ctx, memoria: mem }).error,
    "olvidar algo que no recuerda contesta un error, no borra al azar");
  ok(ejecutar("recordar", { texto: "algo" }, { ...CTX }).error,
    "y sin cerebro conectado lo dice en vez de fallar");
}

console.log("\n── El repaso ──");
{
  const hoy = new Date().toISOString().slice(0, 10);
  const enUnMes = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const ctx = {
    eventosGuardados: {
      "Boda a medias": { evento: "boda", fechaEvento: enUnMes, sinConfigurar: true },
      "Boda lista": { evento: "boda", fechaEvento: enUnMes, pax: 100, horaInicio: "13:00", ubicacion: "Sitio", logisticaEquipo: [{ nombre: "Alguien" }] },
      "Una vieja": { evento: "boda", fechaEvento: "2020-01-01", pax: 50 },
    },
    apuntes: [
      { fecha: enUnMes, titulo: "Sin checklist todavía", tipo: "corporativo" },
      // Nada de esto lleva checklist ni la va a llevar nunca, y salía todo en la lista
      // de pendientes. Se vio en la primera pregunta de verdad, con el calendario real.
      { fecha: enUnMes, titulo: "Vacaciones de alguien", tipo: "vacaciones" },
      { fecha: enUnMes, titulo: "Recoger camión", tipo: "recogida" },
      { fecha: enUnMes, titulo: "Día cerrado", tipo: "cerrado" },
    ],
  };
  const r = ejecutar("que_falta", {}, ctx);
  ok(r.eventos === 2, `solo mira los que se acercan, no el archivo entero (${r.eventos})`);
  ok(r.conCosasQueFaltan.length === 1 && r.conCosasQueFaltan[0].evento === "Boda a medias",
    "señala el que está a medias");
  ok(r.conCosasQueFaltan[0].falta.length >= 4, `y dice QUÉ le falta → ${r.conCosasQueFaltan[0].falta.join(" · ")}`);
  ok(r.enOrden.length === 1 && /Boda lista/.test(r.enOrden[0]), "y el que está completo va aparte");
  // El hueco por el que un evento desaparece del desplegable de la oficina
  ok(r.apuntesSinChecklist.length === 1 && r.apuntesSinChecklist[0].tipo === "corporativo",
    `avisa solo de los apuntes que SON un evento y aún no tienen checklist (${r.apuntesSinChecklist.map(a => a.tipo).join(", ")})`);
  ok(!JSON.stringify(r).includes("Vacaciones") && !JSON.stringify(r).includes("Recoger camión"),
    "las vacaciones, las recogidas y los días cerrados no salen como pendientes: no llevan checklist");
  ok(ejecutar("que_falta", { dias: 1 }, ctx).eventos === 0, "y se puede acotar a los próximos días");
}

console.log("\n── Conectores ──");
{
  // WhatsApp no necesita configurar nada (es un enlace), así que está encendido de
  // salida. El correo necesita cuenta y etiqueta, así que NO existe para el modelo.
  const ids = conectores().map(c => c.id);
  ok(ids.includes("whatsapp") && ids.includes("correo"), `los conectores se registran solos → ${ids.join(", ")}`);
  const activos = conectoresActivos({}).map(c => c.id);
  ok(activos.includes("whatsapp"), "whatsapp está listo sin configurar nada");
  ok(!activos.includes("correo"), "y el correo NO, porque le falta la cuenta");

  // Esto es lo que importa: un conector a medias no puede aparecer en el catálogo. Si
  // apareciera, el modelo lo llamaría y fallaría en cada pregunta.
  const catalogo = catalogoParaModelo(false).map(h => h.name);
  ok(catalogo.includes("mensaje_para_el_equipo"), "la herramienta de whatsapp entra en el catálogo");
  ok(!catalogo.includes("buscar_correos"), "y la del correo no, mientras esté a medias");

  // En cuanto se configura, aparece sola. Sin tocar una línea del asistente.
  const conCorreo = { correo: { cuenta: "eventos@ejemplo.com", etiqueta: "Eventos" } };
  ok(conectoresActivos(conCorreo).map(c => c.id).includes("correo"), "configurado, el correo se enciende");
  ok(catalogoParaModelo(false, conCorreo).map(h => h.name).includes("buscar_correos"),
    "y su herramienta entra en el catálogo sin tocar nada más");
  ok(ejecutar("buscar_correos", {}, { ...CTX, conectores: conCorreo }).error,
    "aunque todavía conteste que no está implementado, que es la verdad");

  // La barrera de datos alcanza a los conectores. Este es el fallo que se cuela solo:
  // una herramienta nueva que no está en ninguna lista y pasa por "sin datos".
  ok(llevaDatos("mensaje_para_el_equipo") === true, "una herramienta de conector con datos se marca como tal");
  ok(llevaDatos("inventada") === true, "y una desconocida se trata como si los llevara: ante la duda, no se comparte");
  ok(!catalogoParaModelo(true).map(h => h.name).includes("mensaje_para_el_equipo"),
    "así que no se le ofrece a un proveedor que entrena con lo que recibe");

  // De casa gana sobre conector: la de casa es la que tiene pruebas
  const chocan = conHerramientasDeConectores({ mensaje_para_el_equipo: { deCasa: true } }, {});
  ok(chocan.mensaje_para_el_equipo.deCasa === true, "si dos coinciden en nombre, gana la de casa");

  // El mensaje del grupo sale con lo que hay que saber, y deja claro que no se ha enviado
  const wa = ejecutar("mensaje_para_el_equipo", { nombre: "fulanita" }, CTX);
  ok(/Boda Fulanita/.test(wa.texto) && /Salida \d{2}:\d{2}/.test(wa.texto), "el mensaje lleva el evento y la hora de salida");
  ok(/ALERGIAS/.test(wa.texto) && /sin gluten/.test(wa.texto), "y las alergias, al final y separadas");
  ok(/^https:\/\/wa\.me\//.test(wa.enlace) && /NO se ha enviado/.test(wa.aviso),
    "devuelve el enlace y avisa de que no lo ha mandado");

  // Un conector nuevo entra con una línea, que es la prueba de que el hueco sirve
  registrarConector({
    id: "prueba", nombre: "De prueba", necesita: ["clave"],
    herramientas: { saluda: { datos: false, esquema: { description: "x", parameters: { type: "object", properties: {} } }, corre: () => ({ hola: true }) } },
  });
  const cfg = { prueba: { clave: "sí" } };
  ok(!Object.keys(todas({})).includes("saluda"), "un conector nuevo sin configurar sigue apagado");
  ok(ejecutar("saluda", {}, { conectores: cfg }).hola === true, "y configurado funciona, sin tocar el asistente");
  ok(catalogoParaModelo(true, cfg).map(h => h.name).includes("saluda"),
    "y si declara que no lleva datos, se le puede ofrecer a cualquiera");
}

console.log("\n── Comprimir lo que se le manda al modelo ──");
{
  const valido = (x) => { try { JSON.parse(JSON.stringify(x)); return true; } catch (e) { return false; } };

  // Lo que más pesa de toda la app: una checklist entera. Y viaja otra vez en cada
  // pregunta siguiente, así que lo que se ahorre aquí se ahorra muchas veces.
  const entera = ejecutar("ver_checklist", { nombre: "fulanita" }, CTX);
  const c = comprimir(entera);
  ok(c.despues < c.antes * 0.5, `una checklist entera baja a menos de la mitad (${c.antes} → ${c.despues})`);
  ok(valido(c.resultado), "y lo que sale sigue siendo JSON válido");
  // El primer intento truncaba el JSON por la mitad y lo volvía a pegar. Producía texto
  // que ya no era JSON, así que el modelo recibía basura en vez de datos. Nunca más.
  ok(JSON.stringify(c.resultado).length <= 3100, "y cabe en el tope");

  // Lo que se recorta SE DICE. Un resultado a medias sin avisar hace que el modelo
  // conteste con seguridad sobre datos que no ha visto, y eso es peor que uno largo.
  const larga = comprimir({ cosas: Array.from({ length: 100 }, (_, i) => `elemento ${i}`) });
  ok(JSON.stringify(larga.resultado).includes("y 70 más"), "una lista larga avisa de cuántos faltan");

  // Lo pequeño no se toca: comprimir lo que ya cabía solo quitaría información
  const chico = ejecutar("calcular_hielo", { comensales: 100, verano: true, horasBarra: 4 }, CTX);
  ok(comprimir(chico).resultado.kg === chico.kg, "un resultado pequeño llega entero");

  // Un error es lo único que el modelo necesita leer palabra por palabra
  ok(comprimir({ error: "no encuentro eso" }).resultado.error === "no encuentro eso",
    "los errores no se tocan nunca");

  // Los ceros y los vacíos se van: "0 tónicas" y "no llevar tónica" son lo mismo
  const conCeros = comprimir({ a: 1, b: 0, c: "", d: null, e: [], f: false, g: 0.7200000000000001 });
  ok(!("b" in conCeros.resultado) && !("d" in conCeros.resultado) && !("e" in conCeros.resultado),
    "los ceros, nulos y vacíos no viajan");
  ok(conCeros.resultado.g === 0.72, "y los decimales largos se redondean");
  ok(conCeros.resultado.a === 1, "pero lo que dice algo se queda");

  // Nada revienta con entradas raras
  [null, undefined, 0, "", [], "texto suelto"].forEach(x => {
    ok(valido(comprimir(x).resultado) || comprimir(x).resultado === undefined, `comprimir ${JSON.stringify(x)} no revienta`);
  });

  ok(ahorro([{ antes: 1000, despues: 400 }, { antes: 500, despues: 250 }]).porcentaje === 57,
    "el ahorro de toda la conversación se puede enseñar");
  ok(ahorro([]).porcentaje === 0, "y sin pasos no inventa un porcentaje");
}

console.log("\n── Etiquetas sin datos a medias ──");
{
  // Un evento creado solo por el calendario no lleva tipo de nevera ni de barbacoa: solo
  // nombre, fecha y tipo. La checklist imprimía "Nevera (undefined)" y "Barbacoa
  // undefined", y salía en el camión así. Lo destapó el asistente, al pedir una checklist
  // reconstruida desde un evento guardado en vez de desde la pantalla.
  ["boda", "comunion", "corporativo", "cumpleanos", "produccion"].forEach(t => {
    const etiquetas = construye(t, 100, 2, 4, 0, {}).flatMap(c => c.items.filter(Boolean).map(i => i[0]));
    const rotas = etiquetas.filter(l => /undefined|null|NaN/.test(l));
    ok(rotas.length === 0, `${t} sin opciones no imprime etiquetas a medias${rotas.length ? ` → ${rotas.join(", ")}` : ""}`);
  });
  // Y con los valores puestos sigue saliendo exactamente lo de siempre
  const con = construye("boda", 100, 2, 4, 0, { tipoNevera: "Grande", tipoBBQ: "grande" })
    .flatMap(c => c.items.filter(Boolean).map(i => i[0]));
  ok(con.includes("Nevera roja (grande)") && con.includes("Barbacoa grande"),
    "con los valores puestos, las etiquetas son las de siempre");
}

console.log("\n── Quién contesta cada pregunta ──");
{
  // Con uno configurado no hay nada que decidir, y no puede fallar por intentarlo
  ok(elige("lo que sea", ["gemini"]) === "gemini", "con un solo proveedor, ese");
  ok(elige("lo que sea", []) === "" || elige("lo que sea", []) === "gemini",
    "sin ninguno no se inventa uno");

  // Lo gratis por delante para el día a día: preguntar "¿qué tengo pendiente?" al
  // modelo caro es tirar dinero.
  const tres = ["gemini", "claude", "openai"];
  ok(elige("que tengo pendiente", tres) === "gemini", "el día a día va a lo gratis");
  ok(elige("cuanto hielo para 100 personas", tres) === "gemini", "y una cuenta sencilla también");

  // Y el bueno solo cuando la pregunta lo pide
  ok(elige("que me recomiendas para esta boda", tres) === "claude", "recomendar va al de pago");
  ok(elige("compara el coste de las dos bodas", tres) === "claude", "comparar también");
  ok(elige("por que sale tan caro", tres) === "claude", "y preguntar un porqué");
  ok(!preguntaPideCabeza("cuantas sillas llevo") && preguntaPideCabeza("que me recomiendas"),
    "se distingue buscar un número de pedir criterio");

  // LA REGLA QUE NO SE SALTA: si la pregunta va sobre clientes, OpenAI queda fuera
  // aunque sea el único. Sus tokens gratis se pagan con los datos.
  ok(preguntaLlevaDatos("que eventos tengo en septiembre"), "una pregunta sobre eventos lleva datos");
  ok(!preguntaLlevaDatos("cuanto hielo para 100 personas"), "y una cuenta pelada no");
  ok(!candidatos("que eventos tengo en septiembre", ["gemini", "openai"]).includes("openai"),
    "con datos de clientes, OpenAI no entra ni de respaldo");
  ok(candidatos("cuanto hielo para 100 personas", ["gemini", "openai"]).includes("openai"),
    "pero para calcular sí puede");
  ok(candidatos("que eventos tengo", ["openai"]).length === 0,
    "y si es el único, se prefiere no contestar antes que mandarle los clientes");

  // Solo se proponen los que están configurados de verdad
  ok(candidatos("que me recomiendas", ["gemini"]).join() === "gemini",
    "no se propone Claude si no tiene clave");
  ok(candidatos("lo que sea", tres).every(p => tres.includes(p)), "nunca sale uno de fuera de la lista");
  ok(ORDEN[0] === "gemini", "el orden de partida empieza por lo gratis");

  // El respaldo: qué merece reintentar con otro y qué no
  ["429 Too Many Requests", "quota exceeded", "RESOURCE_HAS_BEEN_EXHAUSTED", "503 unavailable", "overloaded"]
    .forEach(m => ok(mereceOtroIntento(m), `"${m.slice(0, 28)}" merece probar con otro`));
  ["400 Bad Request", "Cuerpo ilegible", "Hace falta tener sesión del equipo"]
    .forEach(m => ok(!mereceOtroIntento(m), `"${m.slice(0, 28)}" NO se reintenta: estaría igual de mal en todos`));
}

console.log("\n── El gasto ──");
{
  // localStorage no existe en node: apuntar() lo intenta y sigue. Que no reviente es
  // parte de la prueba, porque en modo privado del navegador pasa lo mismo.
  let g = saneaGasto(null);
  ok(g.mes === mesActual() && Object.keys(g.proveedores).length === 0, "arranca a cero, del mes en curso");

  g = apuntar("gemini", { entrada: 3000, salida: 400 }, g);
  g = apuntar("claude", { entrada: 5000, salida: 900 }, g);
  g = apuntar("claude", { entrada: 4000, salida: 700 }, g);
  ok(g.proveedores.claude.preguntas === 2 && g.proveedores.claude.entrada === 9000,
    "suma las preguntas y los tokens de cada proveedor");
  ok(g.proveedores.gemini.entrada === 3000, "y los lleva separados");

  // Gemini es gratis: cuenta tokens pero no euros. Enseñar un coste donde no lo hay
  // haría que alguien dejara de usar lo único que no cuesta nada.
  ok(euros("gemini", g) === 0 && esGratis("gemini"), "Gemini cuenta tokens pero no euros");
  ok(euros("claude", g) > 0 && !esGratis("claude"), "y Claude sí cuesta");
  ok(Math.abs(eurosTotales(g) - euros("claude", g)) < 1e-9, "el total es la suma de lo que cuesta");

  // Ordenado por lo que más cuesta: es lo que se mira
  const r = resumen(g);
  ok(r[0].proveedor === "claude" && r[0].gratis === false, "el resumen pone primero lo que más cuesta");
  ok(r.find(x => x.proveedor === "gemini").gratis === true, "y marca cuál es gratis");

  // Un mes nuevo empieza de cero: un contador que arrastra meses no dice nada de lo que
  // va a llegar en la próxima factura, que es para lo que se mira.
  ok(Object.keys(saneaGasto({ mes: "2020-01", proveedores: { claude: { entrada: 9e9 } } }).proveedores).length === 0,
    "el gasto de otro mes no se arrastra");
  ok(saneaGasto({ mes: mesActual(), proveedores: { inventado: { entrada: 5 } } }).proveedores.inventado === undefined,
    "y un proveedor que no existe se ignora");
  ok(apuntar("inventado", { entrada: 100 }, g) === g, "apuntar en uno que no existe no toca nada");

  // El tope: frena a los de pago y NO a los gratis
  ok(puedePreguntar("claude", g, 0).puede, "sin tope no se frena nada");
  ok(!puedePreguntar("claude", g, 0.001).puede, "pasado el tope, el de pago se para");
  ok(puedePreguntar("claude", g, 0.001).motivo.includes("Gemini"), "y dice qué hacer, no solo que no");
  ok(puedePreguntar("gemini", g, 0.001).puede,
    "pero Gemini sigue: pararlo por dinero cuando es gratis dejaría la app sin asistente por un número que no aplica");

  ok(Object.keys(PRECIOS).every(p => PRECIOS[p].nombre), "todos los proveedores tienen nombre para la pantalla");
}

console.log("\n── Qué se le deja hacer ──");
{
  const escribe = { escribe: true }, lee = { escribe: false };

  // El de partida es el de siempre: nadie se encuentra un asistente con permisos que
  // no ha dado.
  ok(CLAVES_NIVEL[0] === "consultar" && !NIVELES.consultar.escribe, "el nivel de partida no escribe");
  ok(NIVELES.permiso.escribe && NIVELES.permiso.confirma, "\"Con permiso\" escribe pero pregunta");
  ok(NIVELES.confianza.escribe && !NIVELES.confianza.confirma, "\"Confianza\" escribe sin preguntar");

  // Consultar SIEMPRE se puede: el nivel decide qué puede CAMBIAR, no qué puede saber
  CLAVES_NIVEL.forEach(n => ok(permite("ver_evento", n, lee).puede, `en ${n} se puede consultar`));
  ok(!permite("crear_apunte", "consultar", escribe).puede, "en consultar no se puede escribir");
  ok(permite("crear_apunte", "permiso", escribe).puede, "en permiso sí");
  ok(pideConfirmacion("permiso", escribe) && !pideConfirmacion("confianza", escribe),
    "y solo en permiso hay que aprobarlo");
  ok(!pideConfirmacion("permiso", lee), "consultar nunca pide aprobación");

  // LA LISTA QUE NO DEPENDE DEL NIVEL. La identidad de un item es categoría::etiqueta:
  // marcarlo o renombrarlo por su cuenta destruye lo que otra persona lleva marcado en
  // el camión, sin forma de recuperarlo. Eso no es un permiso que quepa en un desplegable.
  NUNCA.forEach(n => {
    CLAVES_NIVEL.forEach(nivel => {
      ok(!permite(n, nivel, escribe).puede, `"${n}" sigue prohibida en ${nivel}`);
    });
  });
  ok(permite("marcar_cargado", "confianza", escribe).motivo.includes("una persona"),
    "y se explica por qué, no solo que no");

  // Un nivel inventado cae en el más prudente, no en el más permisivo
  ok(!permite("crear_apunte", "inventado", escribe).puede, "un nivel que no existe no abre la puerta");
  ok(comoContarlo("consultar").includes("No puedes cambiar nada"), "al modelo se le dice lo que puede");
  ok(comoContarlo("permiso").includes("aprueba"), "y que en permiso hay que aprobarlo");
}

console.log("\n── ¿Esto tiene sentido? ──");
{
  const dentroDeUnMes = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const tono = (r, t) => r.avisos.filter(a => a.tono === t);

  // Un evento completo no debe inventarse problemas: un revisor que siempre encuentra
  // algo es un revisor que nadie mira.
  const bueno = revisarEvento("Boda buena", {
    evento: "boda", pax: 100, ninos: 10, fechaEvento: dentroDeUnMes, horaInicio: "13:00",
    ubicacion: "Finca de prueba", barraCoctel: true, horasCoctel: 1, barraCopas: true, horasCopas: 4,
    logisticaEquipo: [{ nombre: "Alguien" }, { nombre: "Otro" }], tipoCongelador: "Mediana",
    origenSillas: "Nuestras",
  });
  ok(tono(bueno, "falta").length === 0 && tono(bueno, "raro").length === 0,
    `un evento completo no saca ni faltas ni rarezas → ${bueno.avisos.map(a => a.tono).join(", ") || "nada"}`);

  // El fallo silencioso por excelencia: la barra marcada con cero horas. No da error, no
  // se ve en pantalla, y la checklist sale sin una gota.
  const sinHoras = revisarEvento("X", { evento: "boda", pax: 100, fechaEvento: dentroDeUnMes, horaInicio: "13:00", ubicacion: "F", barraCopas: true, horasCopas: 0, logisticaEquipo: [{ nombre: "A" }] });
  ok(tono(sinHoras, "raro").some(a => /cero horas/.test(a.texto)), "caza la barra marcada con cero horas");

  // Y el contrario: horas puestas con la barra desmarcada, que tampoco cuentan
  const sinMarcar = revisarEvento("X", { evento: "boda", pax: 100, fechaEvento: dentroDeUnMes, horaInicio: "13:00", ubicacion: "F", horasCopas: 4, logisticaEquipo: [{ nombre: "A" }] });
  ok(tono(sinMarcar, "raro").some(a => /desmarcada/.test(a.texto)), "y las horas puestas con la barra desmarcada");

  // Lo que impide calcular sale como falta y va primero
  const vacio = revisarEvento("Y", { evento: "boda" });
  ok(tono(vacio, "falta").length >= 3, `un evento vacío saca varias faltas (${tono(vacio, "falta").length})`);
  ok(vacio.avisos[0].tono === "falta", "y las faltas salen las primeras");
  ok(vacio.avisos.every(a => a.comoSeArregla !== undefined), "cada aviso dice cómo se arregla");

  // Alergias escritas que el contador no supo leer: están puestas y aun así cocina no
  // sabe cuántos menús sacar. Es el peor caso posible y tiene que salir.
  const raroAlergias = revisarEvento("Z", { evento: "boda", pax: 50, fechaEvento: dentroDeUnMes, horaInicio: "13:00", ubicacion: "F", logisticaEquipo: [{ nombre: "A" }], notasEvento: "ALERGIAS: uno que no puede con el sésamo" });
  ok(tono(raroAlergias, "raro").some(a => /clasificar|no he sabido/.test(a.texto)),
    "avisa de las alergias que no ha sabido contar");

  // Los recordatorios son de cosas que hay que hacer FUERA de la app
  const alquiler = revisarEvento("W", { evento: "boda", pax: 80, fechaEvento: dentroDeUnMes, horaInicio: "13:00", ubicacion: "F", logisticaEquipo: [{ nombre: "A" }], origenSillas: "Dealde", llevaGenerador: true });
  ok(tono(alquiler, "acuerdate").some(a => /sillas/i.test(a.texto)), "recuerda las sillas de alquiler");
  ok(tono(alquiler, "acuerdate").some(a => /generador/i.test(a.texto)), "y el generador con su gasolina");

  // El repaso de todos solo saca los que tienen algo
  const todos = revisarProximos({
    "Con problema": { evento: "boda", fechaEvento: dentroDeUnMes },
    "Vieja": { evento: "boda", fechaEvento: "2020-01-01" },
  });
  ok(todos.length === 1 && todos[0].evento === "Con problema", "el repaso general solo saca los que se acercan y tienen algo");
}

console.log("\n── Escribir en el calendario ──");
{
  const id = idDeApunte("2026-09-12", "Boda X");
  const apuntes = [{ id, fecha: "2026-09-12", titulo: "Boda X", tipo: "boda" }];
  let ops = [];
  const aplicar = aplicarEnCalendario({
    apuntes, guardar: (a) => ops.push(["guardar", a.id]), borrar: (x) => ops.push(["borrar", x]),
  });

  ops = []; const creado = aplicar({ que: "crear_apunte", datos: { titulo: "Boda Y", fecha: "2026-10-01", tipo: "boda", pax: 90 } });
  ok(creado.creado === "Boda Y" && ops[0][1] === idDeApunte("2026-10-01", "Boda Y"),
    "al crear, el id sale de la fecha y el título — no es aleatorio");

  // Cambiar la fecha cambia la IDENTIDAD. Si no se borra el viejo quedan los dos y el
  // calendario enseña el mismo evento dos veces.
  ops = []; aplicar({ que: "editar_apunte", datos: { id, cambios: { fecha: "2026-09-13" } } });
  ok(ops.some(o => o[0] === "borrar" && o[1] === id), "al cambiar la fecha se borra el id viejo");
  ok(ops.some(o => o[0] === "guardar" && o[1] === idDeApunte("2026-09-13", "Boda X")), "y se guarda con el nuevo");

  ops = []; aplicar({ que: "editar_apunte", datos: { id, cambios: { pax: 120 } } });
  ok(!ops.some(o => o[0] === "borrar"), "pero cambiar solo el pax no borra nada: la identidad no cambia");

  // Todo pasa por saneaLista, la misma puerta que lo escrito a mano
  ok(aplicar({ que: "crear_apunte", datos: { titulo: "X", fecha: "no es fecha", tipo: "boda" } }).error,
    "una fecha inválida no se guarda");
  ok(aplicar({ que: "editar_apunte", datos: { id: "no-existe", cambios: { pax: 1 } } }).error,
    "editar uno que ya no está lo dice en vez de crear otro");
  // null y no error: así se puede encadenar con otros aplicadores. El error lo da la
  // cadena cuando no la sabe hacer ninguno.
  ok(aplicar({ que: "inventado", datos: {} }) === null, "una operación que no es suya la pasa al siguiente");
}

console.log("\n── El contexto es lo único que existe ──");
{
  // Lo que no se pase, el asistente no lo ve. Es la parte importante: decir el contexto
  // app por app es decir qué puede mirar en cada sitio.
  const ctx = contextoDelAsistente({
    apuntes: [{ id: "a1", fecha: "2026-09-12", titulo: "X", tipo: "boda", marcaInterna: "no debe salir" }],
  });
  ok(!JSON.stringify(ctx.apuntes).includes("marcaInterna"), "los apuntes se recortan a lo que hace falta");
  ok(ctx.eventosGuardados && ctx.memoria && Array.isArray(ctx.apuntes), "y lo que no se pasa queda vacío, no undefined");

  // El evento abierto no lleva marcas de carga: no pintan nada en una respuesta y son
  // justo lo que no debe ver.
  const abierto = eventoAbierto({ evento: "boda", pax: 100, checkeados: { a: true }, vueltos: { b: "2" }, roturas: { c: "1" } });
  ok(!JSON.stringify(abierto).includes("checkeados") && !JSON.stringify(abierto).includes("roturas"),
    "el evento abierto no lleva las marcas de carga");
  ok(eventoAbierto({}) === null, "y sin evento no se inventa uno");
}

console.log("\n── Tokens por pregunta ──");
{
  ok(costeDeUna("gemini", { entrada: 3000, salida: 400 }).gratis === true, "una de Gemini sale como gratis");
  ok(costeDeUna("claude", { entrada: 3000, salida: 400 }).euros > 0, "y una de Claude con su coste");
  ok(costeDeUna("gemini", { entrada: 0, salida: 0 }) === null, "una sin tokens no enseña nada");
  ok(costeDeUna("gemini", null) === null, "y sin datos tampoco");

  let g = saneaGasto(null);
  g = apuntar("gemini", { entrada: 2000, salida: 500 }, g);
  g = apuntar("gemini", { entrada: 4000, salida: 500 }, g);
  const t = totales(g);
  ok(t.media === 3500, `la media por pregunta sale bien (${t.media})`);
  ok(t.hoyPreguntas === 2 && t.hoyTokens === 7000, "y hoy se cuenta aparte del mes");
  ok(totales(saneaGasto(null)).media === 0, "sin preguntas la media es cero, no NaN");
}

console.log("\n── La cara de lo que está haciendo ──");
{
  // Lo importante: borrar NO puede parecerse a buscar. Con un solo "pensando" para todo,
  // te enteras de que iba a borrar algo cuando ya está borrado.
  ok(gestoDeHerramienta("borrar_apunte").gesto === "borrando", "borrar tiene su propia cara");
  ok(gestoDeHerramienta("olvidar").gesto === "borrando", "y olvidar también, que también quita");
  ok(gestoDeHerramienta("crear_apunte").gesto === "creando", "crear tiene otra");
  ok(gestoDeHerramienta("buscar_eventos").gesto === "buscando", "buscar otra");
  ok(gestoDeHerramienta("calcular_hielo").gesto === "calculando", "calcular otra");
  ok(gestoDeHerramienta("revisar_todo").gesto === "revisando", "revisar otra");
  ok(gestoDeHerramienta("recordar").gesto === "aprendiendo", "y aprender otra");

  // Lo específico gana a lo general: "borrar_apunte" lleva "apunte" dentro y no puede
  // caer en la regla de crear.
  ok(gestoDeHerramienta("borrar_apunte").gesto !== gestoDeHerramienta("crear_apunte").gesto,
    "borrar un apunte no se confunde con crearlo");

  // TODAS las herramientas tienen frase en cristiano. Si falta una, sale
  // "buscando ver_checklist", que es peor que no decir nada.
  //
  // Y "todas" son las de casa MÁS las de los conectores: mirando solo las de casa,
  // "crear_checklists" se coló sin frase y el muñeco decía "Creando crear checklists…".
  // Con todos los conectores encendidos, una herramienta nueva no puede escaparse.
  const CATALOGO_ENTERO = Object.keys(todas({
    correo: { cuenta: "x", etiqueta: "y" },
    whatsapp: {},
    calendario: { puedeEscribir: true },
    checklists: { puedeCrear: true },
  }));
  ok(CATALOGO_ENTERO.length > TODAS_LAS_HERRAMIENTAS.length,
    `el catálogo entero incluye las de los conectores (${CATALOGO_ENTERO.length} contra ${TODAS_LAS_HERRAMIENTAS.length})`);
  CATALOGO_ENTERO.forEach(n => {
    const f = gestoDeHerramienta(n).frase;
    ok(!f.includes("_"), `"${n}" se dice en cristiano → ${f}`);
  });

  ok(gestoDeHerramienta("").frase === "Pensando…", "sin herramienta, pensando");
  ok(gestoDeHerramienta("preguntando a gemini").frase.startsWith("Preguntando"),
    "y un aviso que ya viene escrito se deja tal cual");
  ok(gestoDeHerramienta("inventada_nueva").frase.includes("inventada nueva"),
    "una herramienta nueva sin frase no rompe: se lee su nombre sin guiones");
}

console.log("\n── El asistente es el mismo en las dos apps ──");
{
  // El fallo que hubo que arreglar: en el calendario podía crear, editar y borrar
  // apuntes, y en la checklist no —solo se le encendía el conector de checklists—. El
  // asistente es el MISMO en las dos pantallas, así que pedirle lo mismo contestaba
  // distinto según por dónde lo hubieras abierto, sin forma de que nadie adivinara
  // por qué.
  const fuente = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  const app = fuente("../App.jsx");
  const cal = fuente("../calendario/main.jsx");

  const encendidos = (t) => ["calendario", "checklists"].filter(c => new RegExp(`${c}: \\{ puede`).test(t));
  ok(encendidos(app).includes("calendario"),
    "la checklist enciende el conector del calendario, no solo el de checklists");
  ok(encendidos(cal).includes("calendario"),
    "y el calendario también, como ya hacía");

  // Y que de verdad tenga con qué escribir: encender el conector sin pasar el aplicador
  // deja al modelo ofreciendo una herramienta que falla al usarla, que es peor que no
  // ofrecerla.
  ok(/aplicarEnCalendario\(\{[^}]*guardar:[^}]*borrar:/s.test(app),
    "y le pasa el guardar y el borrar de verdad, no solo el permiso");
}

console.log("\n── Los precios, ya migrados a la nube ──");
{
  // La migración terminó: los 53 precios de "Resumen Eventos.xlsx" se subieron una vez
  // desde el botón "Subir todos los precios a la nube" y se comprobó en Firestore que
  // llegaron los 53. Con eso confirmado, PRECIOS_BASE sale del código —es público, y un
  // catálogo de precios de compra revela márgenes— y el botón de migración, que ya
  // había hecho su trabajo, se quita para no dejarlo como un "por si acaso" confuso al
  // lado de un campo que ya sube el catálogo con cada corrección.
  const fuente = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  const precios = fuente("../precios.js");
  const app = fuente("../App.jsx");
  const modal = fuente("../components/ModalModoCarga.jsx");

  ok(!/PRECIOS_BASE/.test(precios) && !/PRECIOS_BASE/.test(app) && !/PRECIOS_BASE/.test(modal),
    "no queda ningún precio de compra en el código: la nube es la única fuente");
  ok(!/soloLosCambiados/.test(precios) && !/soloLosCambiados/.test(app),
    "y no queda ningún sitio que suba o guarde solo las diferencias");
  ok(!/handleSubirTodosPrecios|Subir todos los precios a la nube/.test(app) && !/handleSubirTodosPrecios|Subir todos los precios a la nube/.test(modal),
    "el botón de la migración, ya usado, no queda como código muerto");

  // Lo que SÍ tiene que seguir: el guardado normal de precios sube a la nube en cada
  // corrección, y sube el catálogo ENTERO —con setDoc, subir solo lo cambiado borra de
  // la nube todo lo demás, que es justo la trampa que dejaba armada la migración.
  const guardado = app.match(/const handleGuardarPrecios[\s\S]*?\n  };/)?.[0] || "";
  ok(guardado.length > 0, "el guardado normal de precios sigue estando");
  ok(/guardarPreciosNube\(leerPrecios\(\)\)/.test(guardado),
    "y sube el catálogo entero, no solo lo que se acaba de tocar");
}

console.log("\n── El Worker y el navegador ──");
{
  // Esto no se puede probar llamando al Worker —no corre aquí—, pero sí se puede
  // comprobar el orden, que es lo que estaba mal y costó un "Failed to fetch" sin
  // explicación en el móvil.
  //
  // La app pide el repaso con un fetch y una cabecera "authorization". Eso hace que el
  // navegador mande ANTES un OPTIONS de permiso. Si la ruta del repaso está por encima
  // de donde se atiende ese OPTIONS, se lo traga y contesta 401 sin cabeceras CORS: el
  // navegador bloquea la respuesta y en pantalla no se lee ningún motivo.
  const worker = readFileSync(new URL("../../worker/index.js", import.meta.url), "utf8");

  const iOptions = worker.indexOf('req.method === "OPTIONS"');
  const iRepaso = worker.indexOf('pathname === "/__repaso"');
  const iOrigen = worker.indexOf("const origen = origenPermitido");
  ok(iOptions > 0 && iRepaso > 0 && iOrigen > 0, "las tres piezas siguen en el Worker");
  ok(iRepaso > iOptions,
    "el repaso se atiende DESPUÉS del OPTIONS, para no tragarse el permiso previo del navegador");
  ok(iRepaso > iOrigen, "y después de comprobar el origen, para poder contestar con CORS");

  // Y una respuesta sin cabeceras CORS no llega a leerse desde otra dirección, por muy
  // bien que conteste el Worker.
  const bloqueRepaso = worker.slice(iRepaso, iRepaso + 700);
  ok(!/new Response\(/.test(bloqueRepaso),
    "el repaso contesta con json(), que pone las cabeceras, y no con Response a pelo");
  ok(/"Access-Control-Allow-Methods": "GET, POST, OPTIONS"/.test(worker),
    "y el GET está permitido: el repaso a mano se pide con GET");
}

console.log("\n── La dirección del proxy ──");
{
  // No está en el código a propósito (el repositorio es público), así que vive en
  // Firestore y quien la configura primero la deja para todos. El agujero que tenía:
  // solo subía al TECLEARLA, así que quien la puso antes de que existiera este reparto
  // se la quedaba para él y los demás veían el campo vacío sin saber cuál era.
  const q = queHacerConLaUrl;
  ok(q({ mia: "", equipo: "" }).accion === "pedir", "si no la tiene nadie, se pide");
  ok(q({ mia: "", equipo: "https://w" }).accion === "bajar",
    "si la tiene el equipo y este navegador no, se baja: nadie la configura dos veces");
  ok(q({ mia: "https://w", equipo: "" }).accion === "subir",
    "y si la tiene este navegador y el equipo no, SE SUBE — el caso que faltaba");
  ok(q({ mia: "https://mia", equipo: "https://equipo" }).url === "https://mia",
    "con las dos manda la de este navegador: quien apunta a otro Worker para probar no quiere que se la pisen");
  ok(q({ mia: "  https://w  ", equipo: "" }).url === "https://w",
    "y los espacios de pegarla no cuentan como dirección");
}

console.log("\n── Cómo escribe ──");
{
  // Los modelos escriben markdown por costumbre. En una burbuja que no lo interpreta se
  // ven los asteriscos tal cual, y parece que ha contestado una máquina rota. Se le pide
  // que no lo use, pero pedirlo no basta: un modelo se olvida cada tantas respuestas.
  ok(sinMarcas("El **8 de julio** hay una boda") === "El 8 de julio hay una boda",
    "las negritas se van");
  ok(sinMarcas("con `código` dentro") === "con código dentro", "y las comillas invertidas");
  ok(sinMarcas("## Eventos") === "Eventos", "y las almohadillas de título");
  ok(sinMarcas("- uno\n- dos") === "· uno\n· dos",
    "los guiones de lista pasan a puntos, no desaparecen: tres cosas seguidas sin nada delante se leen como una parrafada");
  ok(sinMarcas("uno\n\n\n\ndos") === "uno\n\ndos", "y un hueco de cuatro saltos se queda en uno normal");
  ok(sinMarcas("una boda\ny una comunión").includes("\n"),
    "pero los saltos de línea de verdad se respetan: en pantalla son lo que hace legible una lista");

  // El sistema tiene que pedirlo, no solo limpiarse después: limpiar arregla lo que se ve,
  // pedirlo arregla lo que se paga (menos tokens gastados en asteriscos).
  ok(/NADA de markdown/.test(SISTEMA), "y se le pide en el sistema, no solo se limpia después");
  // La línea que decía "no puedes cambiar nada todavía" contradecía al nivel de permiso:
  // en Confianza el modelo recibía las dos órdenes a la vez y se creía la equivocada.
  ok(!/no puedes cambiar nada todav/i.test(SISTEMA),
    "y el sistema ya no contradice al nivel de permiso");
}

console.log("\n── Los muñecos ──");
{
  // El muñeco se dibuja DOS veces: pequeño en la cabecera (Companero.jsx) y grande en la
  // pestaña Humano (Humano.jsx). Son dos SVG distintos a propósito —lo que se lee a 30px
  // no es lo que se lee a 200— pero la lista tiene que ser la misma: si se añade uno solo
  // en un fichero, al elegirlo desaparece en la otra pantalla y parece que se ha roto.
  const lee = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  // Se leen las claves del objeto OFICIOS de cada fichero. Mirando el formato exacto de
  // la línea ("clave: (") la prueba se rompía al escribir uno como "clave: <>…", que es
  // el mismo dibujo escrito más corto: avisaba de un fallo que no existía.
  const claves = (t) => {
    const bloque = t.slice(t.indexOf("const OFICIOS = {"));
    return (bloque.slice(0, bloque.indexOf("\n};")).match(/^ {2}([a-z]+):/gm) || [])
      .map(l => l.trim().replace(":", ""));
  };

  const enPequeno = claves(lee("../asistente/Companero.jsx"));
  const enGrande = claves(lee("../asistente/Humano.jsx"));
  const faltan = enPequeno.filter(k => !enGrande.includes(k));
  const sobran = enGrande.filter(k => !enPequeno.includes(k));

  ok(enPequeno.length === CLAVES_DIBUJADAS.length,
    `los dibujados son los mismos que dice la lista (${enPequeno.length} de ${CLAVES_DIBUJADAS.length})`);
  ok(!faltan.length, `todos los del pequeño están en el grande${faltan.length ? ` → falta ${faltan.join(", ")}` : ""}`);
  ok(!sobran.length, `y ninguno sobra en el grande${sobran.length ? ` → sobra ${sobran.join(", ")}` : ""}`);

  // Y todos son de catering: el que pidió el muñeco quería algo de la casa, no una bola
  // con ojos. "ninguno" es la opción de apagarlo, no un muñeco.
  CLAVES_DIBUJADAS.forEach(k => {
    ok(enPequeno.includes(k), `"${k}" (${COMPANEROS[k].nombre}) está dibujado, no solo listado`);
  });

  // Los compañeros pasaron de objetos con cara a oficios. Quien tuviera guardado un
  // "chef" o una "cazuela" se quedaba sin muñeco y sin saber por qué.
  ok(companeroValido("chef") === COMPANERO_POR_DEFECTO && companeroValido("cazuela") === COMPANERO_POR_DEFECTO,
    "uno de los viejos cae en el de por defecto en vez de dejar el hueco");
  ok(companeroValido("camarero") === "camarero" && companeroValido("ninguno") === "ninguno",
    "y los que existen se respetan, incluido apagarlo");
}

console.log("\n── La personalidad ──");
{
  ok(comoHabla("directo") === "", "\"Directo\" no añade nada: es el asistente de siempre");
  ok(comoHabla("cercano").length > 20 && comoHabla("bromista") !== comoHabla("parco"),
    "y las otras tres cambian de verdad, cada una a lo suyo");
  ok(comoHabla("inventada") === "", "una personalidad que no existe cae en la de por defecto");

  // Lo que ninguna personalidad puede pisar. Un asistente bromista que se salte una
  // alergia no es simpático, es peligroso.
  ok(/alergia/i.test(PERSONALIDADES.bromista.tono) && /serio/i.test(PERSONALIDADES.bromista.tono),
    "la bromista tiene prohibido bromear con una alergia o un error");
  ok(/alergias/i.test(PERSONALIDADES.parco.tono),
    "y la parca tiene prohibido acortar una alergia");
  CLAVES_PERSONALIDAD.forEach(k => {
    ok(PERSONALIDADES[k].nombre && PERSONALIDADES[k].resumen,
      `"${k}" se puede enseñar en pantalla con nombre y resumen`);
  });
}

console.log("\n── El repaso de la noche ──");
{
  // El cron del Worker corriendo aquí, con un Firestore de mentira. Importa porque este
  // camino no lo ejecuta nadie mirando: si se rompe, se rompe en silencio a las tres de
  // la mañana y nadie se entera hasta que falta un congelador en agosto.
  const EVENTOS = {
    "Boda de prueba": { evento: "boda", pax: 120, fechaEvento: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10) },
    "Comunión de prueba": { evento: "comunion", pax: 80, ninos: 20, fechaEvento: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10), horaInicio: "13:00", ubicacion: "Finca de prueba" },
  };

  const firestoreFalso = ({ falloEntrada = null } = {}) => {
    const escrito = [];
    globalThis.fetch = async (url, opciones = {}) => {
      const u = String(url);
      if (u.includes("signInWithPassword")) {
        if (falloEntrada) return { ok: false, status: 400, json: async () => ({ error: { message: falloEntrada } }) };
        return { ok: true, status: 200, json: async () => ({ idToken: "token-de-mentira" }) };
      }
      if (u.includes("/documents/indice/avisos")) {
        escrito.push(JSON.parse(opciones.body));
        return { ok: true, status: 200, json: async () => ({}) };
      }
      if (u.includes("/documents/indice")) {
        return {
          ok: true, status: 200,
          json: async () => ({
            documents: [
              // Un documento que NO es un evento: el índice viejo vive en la misma
              // colección y colarlo rompería el repaso.
              { name: "proyectos/x/documents/indice/eventosGuardados", fields: { mapa: { stringValue: "{}" } } },
              ...Object.entries(EVENTOS).map(([nombre, e], i) => ({
                name: `proyectos/x/documents/indice/evt_${i}`,
                fields: { nombre: { stringValue: nombre }, estado: { stringValue: JSON.stringify(e) } },
              })),
              // Y uno corrupto: no puede tumbar el repaso entero.
              { name: "proyectos/x/documents/indice/evt_roto", fields: { nombre: { stringValue: "Roto" }, estado: { stringValue: "{{{" } } },
            ],
          }),
        };
      }
      throw new Error(`El repaso ha llamado a un sitio que no tocaba: ${u}`);
    };
    return escrito;
  };

  const ENV = { FIREBASE_API_KEY: "k", FIREBASE_PROJECT_ID: "gula-prueba", ROBOT_EMAIL: "robot@prueba", ROBOT_PASSWORD: "x" };

  const escrito = firestoreFalso();
  const r = await repasar(ENV);
  ok(r.mirados === 2, `mira los eventos y salta lo que no lo es (${r.mirados})`);
  ok(r.eventos.length === 1 && r.eventos[0].evento === "Boda de prueba",
    "solo avisa de los que están dentro de los 30 días");
  ok(r.eventos[0].avisos.some(a => a.tono === "falta"),
    "y con los avisos de siempre, los de revision.js, no otros nuevos");
  ok(r.eventos[0].avisos.every(a => typeof a.comoSeArregla === "string"),
    "cada aviso lleva cómo se arregla");
  ok(escrito.length === 1 && JSON.parse(escrito[0].fields.avisos.stringValue).mirados === 2,
    "y queda escrito en Firestore para que la app lo enseñe al abrirse");

  // Y se puede preguntar por él: sin herramienta, el repaso solo se ve si te acuerdas de
  // abrir la pestaña del cerebro.
  const conRepaso = ejecutar("ver_repaso", {}, { ...CTX, repaso: r });
  ok(conRepaso.mirados === 2 && conRepaso.eventos.length === 1, "y se puede preguntar por él");
  ok(typeof conRepaso.haceHoras === "number",
    "diciendo cuándo corrió: un repaso de hace cinco días habla de otro calendario");
  ok(ejecutar("ver_repaso", {}, CTX).nada, "y si todavía no hay ninguno, lo dice en vez de callar");

  // Cero avisos con cero eventos mirados es un error mudo; con doce, una buena noticia.
  ok(typeof r.mirados === "number", "se apunta cuántos se han mirado, no solo cuántos fallan");

  // Los fallos se dicen, no se tragan: un repaso que calla parece que ha ido bien.
  firestoreFalso({ falloEntrada: "INVALID_PASSWORD" });
  let fallo = "";
  try { await repasar(ENV); } catch (e) { fallo = e.message; }
  ok(/INVALID_PASSWORD/.test(fallo), `el motivo de Google llega tal cual → "${fallo}"`);

  for (const [quita, espera] of [["FIREBASE_PROJECT_ID", /FIREBASE_PROJECT_ID/], ["ROBOT_EMAIL", /ROBOT_EMAIL/]]) {
    firestoreFalso();
    const env = { ...ENV, [quita]: "" };
    let m = "";
    try { await repasar(env); } catch (e) { m = e.message; }
    ok(espera.test(m), `sin ${quita} dice exactamente qué falta`);
  }

  // El aviso que responde el botón conjuga el verbo: con un solo evento salía
  // "1 tienen algo sin poner", que suena a fallo del sistema y no a lo que es —
  // un evento flojo de datos. No se puede pulsar el botón desde aquí (llama al
  // Worker), pero el contrato del texto sí se puede vigilar en la fuente.
  const avisoRepaso = readFileSync(new URL("../asistente/Asistente.jsx", import.meta.url), "utf8");
  ok(/d\.eventos\.length === 1 \? "tiene" : "tienen"/.test(avisoRepaso),
    "el aviso del repaso conjuga: 1 tiene, 2 tienen");
  ok(/d\.mirados === 1 \? "" : "s"/.test(avisoRepaso),
    "y el contador también: 1 evento, 2 eventos");
}

console.log("\n── Hablarle y que conteste ──");
{
  // El texto de una respuesta lleva markdown y símbolos que leídos en voz alta suenan
  // absurdos. Y las horas son el caso peor: "13:00" se lee "trece dos puntos cero cero".
  const leido = paraLeerEnVozAlta("**Boda X** a las 13:00\n- ⚠️ 2 celíacos\n- `sin gluten`");
  ok(!leido.includes("*") && !leido.includes("`"), "no lee los asteriscos ni las comillas");
  ok(!leido.includes("⚠️"), "ni los símbolos");
  ok(/13 y 00/.test(leido), `las horas se leen como horas → "${leido}"`);
  ok(!/\n/.test(leido), "y va en una sola línea");
  ok(paraLeerEnVozAlta("") === "" && paraLeerEnVozAlta(null) === "", "sin texto no dice nada");

  // Fuera del navegador no existe ninguna de las dos, y comprobarlo no puede reventar:
  // este módulo lo importa el panel entero.
  ok(hayEscucha() === false && hayVoz() === false, "fuera del navegador se dice que no hay, sin reventar");
}

console.log("\n── El árbol de la memoria ──");
{
  let mem = [];
  const guarda = (t, tema, fuente, donde) => { ({ memoria: mem } = recordar(mem, t, { tema, fuente, donde })); };
  guarda("En la Finca de prueba no hay enchufe en la carpa", "sitios", "evento", "Boda del 12");
  guarda("En comuniones ponemos 3 de cocina", "equipo", "charla");
  guarda("El proveedor de hielo no sirve los domingos", "general", "revision", "Boda del 19");

  // Los tres ejes devuelven la MISMA forma. Es lo que permite pintarlos con un solo
  // componente y añadir un cuarto mañana sin tocar la pantalla.
  const a = arbol(mem);
  [a.temas, a.fuentes, a.dias].forEach((eje, i) => {
    ok(eje.every(g => g.eje && g.clave && g.titulo && Array.isArray(g.recuerdos)),
      `el eje ${["temas", "fuentes", "días"][i]} devuelve la forma común`);
  });
  ok(a.temas.length === 3 && a.fuentes.length === 3, "tres temas y tres fuentes distintas");
  ok(porDia(mem).length === 1, "y todo lo de hoy va en un día");

  // La fuente viaja pegada al recuerdo: es lo que permite contrastarlo
  const ctx = contextoPlegado(mem);
  ok(/\[Boda del 12\]/.test(ctx.texto), "en el contexto se dice dónde se aprendió cada cosa");
  ok(ctx.ids.length === 3 && ctx.plegados === 0, "con pocos recuerdos no se pliega nada");

  // Con muchos, se pliega y SE DICE. Tirarlos en silencio sería mentir sobre lo que sabe.
  // Textos DISTINTOS de verdad: sesenta frases casi iguales se funden en una, que es
  // justo lo que hace bien la memoria, pero entonces no hay nada que plegar.
  const SUJETOS = ["mantel", "camion", "nevera", "carpa", "generador", "silla", "copa", "plato", "bandeja", "termo"];
  const HECHOS = ["se guarda arriba", "pesa demasiado", "hay que pedirlo antes", "llega tarde siempre",
    "cuesta el doble", "no cabe atras", "se rompe facil"];
  let muchos = [];
  SUJETOS.forEach(su => HECHOS.forEach(h => {
    ({ memoria: muchos } = recordar(muchos, `${su} ${h}`, { tema: "general" }));
  }));
  ok(muchos.length > 40, `los setenta recuerdos distintos se guardan (${muchos.length})`);
  const plegado = contextoPlegado(muchos);
  ok(plegado.plegados > 0, `con setenta recuerdos se pliega (${plegado.plegados} plegados)`);
  ok(/no caben/.test(plegado.texto) && /ver_cerebro/.test(plegado.texto),
    "y se dice cuántos faltan y cómo pedirlos");
  ok(plegado.texto.length < 3200, "el árbol que viaja tiene tope");

  // El grafo engancha los recuerdos con los sitios y eventos que nombran
  const g = grafo(mem, { "Boda de prueba": { evento: "boda", ubicacion: "Finca de prueba" } });
  ok(g.nodos.some(n => n.tipo === "sitio" && n.nombre === "Finca de prueba"), "el grafo saca los sitios de los eventos");
  ok(g.enlaces.some(e => e.por === "habla de"), "y engancha los recuerdos con lo que nombran");
  ok(g.enlaces.some(e => e.por === "se aprendió en"), "y con el evento donde se aprendieron");
  ok(grafo([], {}).nodos.length === 0, "sin nada, grafo vacío y sin reventar");
}

console.log("\n── SuperContext: el barrido por relevancia ──");
{
  // Sin overflow no cambia nada: el barrido solo actúa cuando hay que elegir qué se
  // pliega, y con pocos recuerdos no hay elección que hacer.
  let peq = [];
  ({ memoria: peq } = recordar(peq, "En comuniones ponemos 3 de cocina", { tema: "equipo" }));
  ok(contextoPlegado(peq).texto === contextoPlegado(peq, { pregunta: "algo sin relación" }).texto,
    "sin overflow, la pregunta no cambia nada");

  // El caso que de verdad importa: un dato relevante pero poco usado, contra treinta
  // populares que no tienen nada que ver. Sin SuperContext el dato relevante se pliega
  // porque "vivacidad" solo mira puntos y frescura, no de qué habla la pregunta.
  const SUJ = ["mantel", "camion", "nevera", "carpa", "generador", "silla", "copa", "plato", "bandeja", "termo"];
  const HEC = ["se guarda arriba", "pesa demasiado", "hay que pedirlo antes", "llega tarde siempre", "cuesta el doble", "no cabe atras", "se rompe facil"];
  let mem = [];
  SUJ.forEach(su => HEC.forEach(h => { ({ memoria: mem } = recordar(mem, `${su} ${h}`, { tema: "general" })); }));
  mem = mem.map(r => ({ ...r, puntos: 50, usado: Date.now() }));         // muy vivos, cero relación
  ({ memoria: mem } = recordar(mem, "El hielo se derrite rápido sin congelador en agosto", { tema: "bebida" }));
  mem = mem.map(r => (r.texto.includes("hielo") ? { ...r, puntos: 1, usado: Date.now() - 90 * 86400000 } : r));

  const sinPregunta = contextoPlegado(mem, { max: 900 });
  const conPregunta = contextoPlegado(mem, { max: 900, pregunta: "cuánto hielo necesito para la barra en agosto" });
  ok(!sinPregunta.texto.includes("hielo"), "sin pregunta, el dato poco usado se pliega (es lo correcto en el primer turno)");
  ok(conPregunta.texto.includes("hielo"), "y CON la pregunta, el barrido lo rescata aunque tenga pocos puntos");
  ok(sinPregunta.plegados > 0 && conPregunta.plegados > 0, "y en los dos casos se sigue plegando el resto y avisando");

  // Lo relevante no expulsa a lo relevante: entre dos MISMO parecido a la pregunta
  // (comparten exactamente las mismas palabras que ella), sigue ganando el más vivo, no
  // un orden al azar.
  let dos = [];
  ({ memoria: dos } = recordar(dos, "El hielo de la barra pesa mucho", { tema: "bebida" }));
  ({ memoria: dos } = recordar(dos, "El hielo de la barra huele mal", { tema: "bebida" }));
  const pA = parecido(dos[0].texto, "hielo de la barra");
  const pB = parecido(dos[1].texto, "hielo de la barra");
  ok(pA === pB, `las dos frases de prueba son igual de relevantes (${pA} vs ${pB})`);
  dos = dos.map((r, i) => ({ ...r, puntos: i === 0 ? 40 : 5 }));
  const ambos = contextoPlegado(dos, { pregunta: "hielo de la barra" });
  ok(ambos.texto.indexOf("pesa mucho") < ambos.texto.indexOf("huele mal"),
    "entre dos igual de relevantes, sigue mandando el más vivo");
}

console.log("\n── Lo que le importa al equipo ──");
{
  let o = [];
  ({ objetivos: o } = ponerObjetivo(o, "Bajar la merma de cristalería", { porQue: "el año pasado costó 900€" }));
  ({ objetivos: o } = ponerObjetivo(o, "No olvidar las sillas de alquiler"));
  ok(cuantosActivos(o) === 2, "se apuntan los objetivos");
  ok(/900€/.test(metasContexto(o)), "y el porqué viaja con ellos: cambia la respuesta");

  // Repetir uno lo REACTIVA, que es lo que se quiere decir al insistir en algo aparcado
  o = cambiarEstado(o, o.find(x => /sillas/.test(x.texto)).id, "aparcado");
  ok(cuantosActivos(o) === 1, "aparcar lo saca de los activos");
  ({ objetivos: o } = ponerObjetivo(o, "No olvidar las sillas de alquiler"));
  ok(cuantosActivos(o) === 2, "y volver a decirlo lo reactiva en vez de duplicarlo");

  // Solo los activos viajan: los conseguidos ocupan sitio y no cambian nada
  o = cambiarEstado(o, o[0].id, "logrado");
  ok(!metasContexto(o).includes(o.find(x => x.estado === "logrado").texto),
    "un objetivo conseguido no viaja en la conversación");

  ok(ponerObjetivo([], "").objetivo === null, "un objetivo vacío no se crea");
  ok(metasContexto([]) === "", "sin objetivos no se mete nada en la conversación");
  let lleno = [];
  for (let i = 0; i < MAX_OBJETIVOS + 3; i++) ({ objetivos: lleno } = ponerObjetivo(lleno, `Objetivo numero ${i}`));
  ok(cuantosActivos(lleno) <= MAX_OBJETIVOS, `hay tope de objetivos (${cuantosActivos(lleno)})`);
}

console.log("\n── Lo que hay que hacer ──");
{
  let t = [];
  ({ tareas: t } = apuntarTarea(t, "Pedir las sillas a Dealde", { evento: "Boda del 12" }));
  ({ tareas: t } = apuntarTarea(t, "Llamar al proveedor de hielo"));
  ({ tareas: t } = apuntarTarea(t, "Pedir las sillas a Dealde", { evento: "Boda del 12" }));
  ok(t.length === 2, `apuntar dos veces lo mismo no duplica (${t.length})`);
  ok(sinHacer(t).length === 2, "las dos siguen pendientes");

  const sillas = t.find(x => /sillas/.test(x.texto));
  t = marcarTarea(t, sillas.id, true);
  ok(sinHacer(t).length === 1, "marcar una la saca de las pendientes");
  ({ tareas: t } = apuntarTarea(t, "Pedir las sillas a Dealde", { evento: "Boda del 12" }));
  ok(sinHacer(t).length === 2, "y volver a apuntarla la revive: es lo que se quiere decir al repetirla");

  ok(porEvento(t).some(g => g.evento === "Boda del 12"), "se agrupan por evento");
  ok(porEvento(t).some(g => g.evento === ""), "y las sueltas van aparte");

  // La limpieza: lo hecho de un evento pasado se va; lo PENDIENTE se queda aunque el
  // evento haya pasado, porque si no se hizo alguien tiene que enterarse.
  t = marcarTarea(t, sillas.id, true);
  const viejos = { "Boda del 12": { fechaEvento: "2020-01-01" } };
  const limpia = limpiarViejas(t, viejos);
  ok(!limpia.some(x => /sillas/.test(x.texto)), "lo hecho de un evento pasado se cae solo");
  ({ tareas: t } = apuntarTarea(t, "Algo que no se hizo", { evento: "Boda del 12" }));
  ok(limpiarViejas(t, viejos).some(x => /no se hizo/.test(x.texto)),
    "pero lo PENDIENTE de un evento pasado se queda: alguien tiene que enterarse");

  ok(tareasContexto(t).includes("Llamar al proveedor"), "las pendientes viajan en la conversación");
  ok(!tareasContexto([]).length, "y sin tareas no se mete nada");
  ok(apuntarTarea([], "  ").error, "una tarea vacía se rechaza");
  ok(saneaTareas([{ texto: "x", id: "a" }, { texto: "y", id: "a" }]).length === 1, "no hay dos con el mismo id");
}

console.log("\n── El subconsciente ──");
{
  const hoy = new Date().toISOString().slice(0, 10);
  const ev = {
    "Boda A": { evento: "boda", fechaEvento: hoy, pax: 100, ubicacion: "Finca", origenSillas: "Dealde", horaInicio: "13:00", logisticaEquipo: [{ nombre: "A" }] },
    "Boda B": { evento: "boda", fechaEvento: hoy },
  };

  // La primera vez NO hay con qué comparar, y decir que ha cambiado algo sería mentir
  ok(queHaCambiado(null, foto(ev)) === null, "la primera vez no se inventa un cambio");

  const antes = foto({ "Boda A": ev["Boda A"] });
  const p = parte({ eventosGuardados: ev, objetivos: [{ texto: "Bajar la merma de cristalería", estado: "activo" }], fotoAnterior: antes });
  ok(p.cambios && p.cambios.eventosNuevos.includes("Boda B"), "detecta lo que ha aparecido desde la última vez");
  ok(p.estaSemana.length === 2, "y lo que toca esta semana");
  ok(p.urgentes.some(u => u.evento === "Boda B"), "y señala el que está a medias");

  // Un objetivo que no se puede medir con los datos lo DICE. Es una respuesta honesta:
  // dice que hay que seguirlo por otro sitio, no que vaya bien.
  const conRaro = comoVanLosObjetivos([{ texto: "Tratar mejor al cliente", estado: "activo" }], { eventosGuardados: ev });
  ok(conRaro[0].medible === false && /vosotros/.test(conRaro[0].senal),
    "un objetivo que no sale de los datos se dice, no se finge");
  const medible = comoVanLosObjetivos([{ texto: "Bajar la merma", estado: "activo" }], { eventosGuardados: ev });
  ok(medible[0].medible === true, "y uno que sí se puede medir, se mide");

  ok(comoVanLosObjetivos([{ texto: "X", estado: "aparcado" }], {}).length === 0, "los aparcados no se miran");
  ok(parte({}).hayAlgoQueContar === false, "sin nada que contar, se dice que no hay nada");
}

console.log("\n── Las conversaciones guardadas ──");
{
  const hilo = [{ de: "yo", texto: "cuanto hielo para la boda del doce de septiembre en la finca esa" }, { de: "el", texto: "122 kg" }];
  ok(tituloDe(hilo).startsWith("cuanto hielo"), "el título sale de la primera pregunta");
  ok(tituloDe(hilo).length <= 46, "y se corta para que quepa en la lista");
  ok(tituloDe([]) === "Sin título", "sin hilo, un título que no miente");
  ok(tituloDe([{ de: "el", texto: "hola" }]) === "Sin título", "y el título sale de lo que PREGUNTASTE, no de lo que contestó");

  // saneaCharlas es lo que protege de un localStorage manipulado o de otra versión
  ok(saneaCharlas([{ id: "a", hilo: [] }]).length === 0, "una charla sin hilo no se guarda");
  ok(saneaCharlas([{ id: "a", hilo }, { id: "a", hilo }]).length === 1, "no hay dos con el mismo id");
  ok(saneaCharlas("no es una lista").length === 0, "y un guardado corrupto no revienta");

  const dosDias = Date.now() - 2 * 86400000;
  ok(cuandoFue(Date.now() - 90000) === "hace 2 min", "el cuándo se lee de un vistazo");
  ok(cuandoFue(dosDias) === "hace 2 días", "y en días cuando toca");
  ok(cuandoFue(0) === "", "sin fecha no se inventa una");
}

console.log("\n── Encadenar dónde se escribe ──");
{
  let tareas = [];
  const soloTareas = aplicarEnTareas({ tareas, guardar: (x) => { tareas = x; } });
  ok(soloTareas({ que: "crear_apunte", datos: {} }) === null,
    "un aplicador devuelve null si la operación no es suya");

  const cadena = encadenar(soloTareas);
  ok(cadena({ que: "apuntar_tarea", datos: { texto: "Pedir sillas" } }).apuntado === "Pedir sillas",
    "encadenado, la coge quien sabe hacerla");
  ok(cadena({ que: "borrar_apunte", datos: {} }).error,
    "y si no la sabe hacer nadie, se dice en vez de fallar en silencio");
  ok(encadenar(null, soloTareas)({ que: "apuntar_tarea", datos: { texto: "Otra cosa" } }).apuntado,
    "un aplicador vacío en la cadena no la rompe");
}

console.log("\n── Crear checklists desde el calendario ──");
{
  const en5 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const base = {
    apuntes: [
      { id: "a1", fecha: en5, titulo: "Boda de prueba uno", tipo: "boda" },
      { id: "a2", fecha: en5, titulo: "Boda de prueba dos", tipo: "boda" },
      // Ni las vacaciones ni las recogidas llevan checklist: si entraran aquí, pedir
      // "créame los próximos" crearía basura en el archivo.
      { id: "a3", fecha: en5, titulo: "Vacaciones de alguien", tipo: "vacaciones" },
      { id: "a4", fecha: en5, titulo: "Recoger camión", tipo: "recogida" },
    ],
    eventosGuardados: {},
    conectores: { checklists: { puedeCrear: true } },
    onEscribir: (p) => ({ propuesto: p.resumen, ids: p.datos.ids }),
  };

  // El nivel manda: era exactamente lo que fallaba —"Confianza" puesto y el asistente
  // contestando que no podía crear nada, porque la herramienta no existía.
  ok(ejecutar("crear_checklists", {}, { ...base, nivel: "consultar" }).error,
    "en solo consultar no se puede crear");
  const conf = ejecutar("crear_checklists", {}, { ...base, nivel: "confianza" });
  ok(conf.ids && conf.ids.length === 2, `en confianza crea los que se acercan (${conf.ids && conf.ids.length})`);
  ok(!conf.ids.includes("a3") && !conf.ids.includes("a4"),
    "y deja fuera lo que nunca lleva checklist: vacaciones y recogidas");

  // Por nombre, para "créame la de Alba"
  const uno = ejecutar("crear_checklists", { cuales: ["prueba uno"] }, { ...base, nivel: "confianza" });
  ok(uno.ids && uno.ids.length === 1 && uno.ids[0] === "a1", "se puede pedir una por su título");
  ok(ejecutar("crear_checklists", { cuales: ["no existe"] }, { ...base, nivel: "confianza" }).error,
    "y un título que no está en el calendario lo dice, no crea otra cosa");

  // No pisa lo que ya existe: decir "he creado 5" cuando 3 ya estaban sería mentir
  const yaEsta = {
    ...base, nivel: "confianza",
    eventosGuardados: { "Boda de prueba uno": {} },
    apuntes: base.apuntes.map(a => (a.id === "a1" ? { ...a, evento: "Boda de prueba uno" } : a)),
  };
  ok(ejecutar("crear_checklists", { cuales: ["prueba uno"] }, yaEsta).nada,
    "una que ya existe no se vuelve a crear");
  ok(ejecutar("crear_checklists", {}, yaEsta).ids.length === 1,
    "y al pedir los próximos solo entra la que falta");

  // Apagado donde la app no sabe crearlas (el calendario suelto no tiene archivo)
  ok(!catalogoParaModelo(false, {}, "confianza").map(h => h.name).includes("crear_checklists"),
    "sin puedeCrear la herramienta ni se ofrece");

  // El aplicador: crea de verdad y avisa de lo que le falta a lo creado
  let promovidos = null;
  const aplicar = aplicarEnChecklists({ apuntes: base.apuntes, promover: (x) => { promovidos = x; } });
  const r = aplicar({ que: "crear_checklists", datos: { ids: ["a1", "a2"] } });
  ok(promovidos && promovidos.length === 2, "el aplicador promueve los apuntes elegidos");
  ok(r.creadas.length === 2 && /formulario/.test(r.aviso),
    "y avisa de que les faltan los datos del formulario, en vez de darlas por completas");
  ok(aplicar({ que: "apuntar_tarea", datos: {} }) === null, "y lo que no es suyo lo pasa al siguiente");
  ok(aplicar({ que: "crear_checklists", datos: { ids: ["fantasma"] } }).error,
    "un apunte que ya no está lo dice");
}

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
