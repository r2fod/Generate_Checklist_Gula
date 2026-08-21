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

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
