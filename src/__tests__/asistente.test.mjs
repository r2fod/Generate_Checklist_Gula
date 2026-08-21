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
  ok(catalogoParaModelo(false).length >= NOMBRES_HERRAMIENTAS.length,
    `el catálogo entero lleva las de casa y las de los conectores (${catalogoParaModelo(false).length} de ${NOMBRES_HERRAMIENTAS.length} propias)`);

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
  ok(aplicar({ que: "inventado", datos: {} }).error, "una operación que no existe no revienta");
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
  TODAS_LAS_HERRAMIENTAS.forEach(n => {
    const f = gestoDeHerramienta(n).frase;
    ok(!f.includes("_"), `"${n}" se dice en cristiano → ${f}`);
  });

  ok(gestoDeHerramienta("").frase === "Pensando…", "sin herramienta, pensando");
  ok(gestoDeHerramienta("preguntando a gemini").frase.startsWith("Preguntando"),
    "y un aviso que ya viene escrito se deja tal cual");
  ok(gestoDeHerramienta("inventada_nueva").frase.includes("inventada nueva"),
    "una herramienta nueva sin frase no rompe: se lee su nombre sin guiones");
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

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
