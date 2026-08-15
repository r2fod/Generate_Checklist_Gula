// Prueba de la sincronización con la nube contra un Firestore en memoria que aplica
// LAS MISMAS reglas de seguridad que firestore.rules. Reproduce el arranque de la app
// (fusionar lo local con lo remoto y subir lo que falte) en escenarios de dos
// dispositivos, que es donde estaban los fallos que no se veían de otra forma.
//
//   node src/__tests__/sincronizacion.test.mjs
import { almacen, setSesion, limpiarPrevios } from './firestore-simulado.mjs';
import * as N from './nube-simulada.mjs';
const ok=(c,m)=>{console.log(`  ${c?'✅':'❌'} ${m}`); if(!c) process.exitCode=1;};

// Réplica EXACTA del arranque de App.jsx (sincronizar + suscripción)
function crearDispositivo(nombre, local, sincronizados = []) {
  const d = { nombre, local: { ...local }, sinc: [...sincronizados], primeraHecha: false, ultimaEscritura: 0, unsub: null, errores: [] };
  d.arrancar = async () => {
    const aplicar = ({ mapa, actualizado }) => {
      if (!d.primeraHecha) return;
      if (actualizado <= d.ultimaEscritura) return;
      d.ultimaEscritura = actualizado; d.local = mapa; d.sinc = Object.keys(mapa);
    };
    try {
      const archivo = await N.cargarArchivoNube();
      const local = d.local || {};
      const enArchivo = archivo && !archivo.vacio ? archivo.mapa : {};
      let remoto = enArchivo;
      if (!archivo || archivo.vacio) { const viejo = await N.cargarIndiceEventosNube(); remoto = (viejo && viejo.mapa) || {}; }
      const fus = { ...remoto };
      Object.keys(local).forEach(n => {
        if (remoto[n] !== undefined) return;
        if (d.sinc.includes(n)) return;
        fus[n] = local[n];
      });
      d.local = fus;
      d.ultimaEscritura = Date.now();
      await N.sincronizarArchivoNube(enArchivo, fus);
      d.sinc = Object.keys(fus);
    } catch (e) { d.errores.push(e.message); }
    finally { d.primeraHecha = true; }
    d.unsub = N.suscribirArchivoNube(({ cambios, actualizado }) => {
      if (!d.primeraHecha || !cambios || !cambios.length) return;
      const base = { ...d.local };
      let algo = false;
      cambios.forEach(c => {
        if (c.tipo === 'borrado') { if (base[c.nombre] !== undefined) { delete base[c.nombre]; algo = true; } return; }
        if (JSON.stringify(base[c.nombre]) === JSON.stringify(c.estado)) return;
        base[c.nombre] = c.estado; algo = true;
      });
      if (!algo) return;
      if (actualizado > d.ultimaEscritura) d.ultimaEscritura = actualizado;
      d.local = base; d.sinc = Object.keys(base);
    });
  };
  return d;
}
const ev = (n) => ({ evento:'boda', pax:n });

console.log('══ ESCENARIO REAL: móvil con todo, PC con lo viejo ══');
almacen.clear(); limpiarPrevios();
// El índice antiguo tiene lo que había ANTES de que las escrituras se bloquearan
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Produccion Carlos':ev(20),'Boda Fulanita y Mengano':ev(100),'Cena Pluto':ev(50)}), actualizado: 1000 });
const movil = crearDispositivo('móvil', {'Produccion Carlos':ev(20),'Boda Fulanita y Mengano':ev(100),'Cena Pluto':ev(50),'Produ kitten':ev(20),'Produccion Movistar':ev(30),'Boda nueva':ev(120)});
const pc = crearDispositivo('PC', {});

await pc.arrancar();
console.log(`  PC al abrir primero: ${Object.keys(pc.local).length} eventos → ${JSON.stringify(Object.keys(pc.local))}`);
ok(Object.keys(pc.local).length===3, 'el PC ve los 3 que había en el índice antiguo (no puede ver lo que nunca subió)');
ok(pc.errores.length===0, `sin errores de permisos: ${JSON.stringify(pc.errores)}`);

await movil.arrancar();
console.log(`  móvil al abrir: ${Object.keys(movil.local).length} eventos`);
ok(Object.keys(movil.local).length===6, 'el móvil conserva los suyos y suma los del índice');
ok(movil.errores.length===0, `sin errores de permisos: ${JSON.stringify(movil.errores)}`);
const subidos = [...almacen.keys()].filter(k=>k.startsWith('indice/evt_')).length;
ok(subidos===6, `y sube los 6 a la nube (${subidos} documentos evt_)`);

// El PC vuelve a abrir
const pc2 = crearDispositivo('PC otra vez', pc.local, pc.sinc);
await pc2.arrancar();
console.log(`  PC al volver a abrir: ${Object.keys(pc2.local).length} eventos → ${JSON.stringify(Object.keys(pc2.local))}`);
ok(Object.keys(pc2.local).length===6, 'AHORA el PC ve los 6');

console.log('\n══ El PC abre PRIMERO y el móvil después (orden inverso) ══');
almacen.clear(); limpiarPrevios();
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Cena Pluto':ev(50)}), actualizado: 1000 });
const pcA = crearDispositivo('PC', {'Solo del PC':ev(10)});
await pcA.arrancar();
const movB = crearDispositivo('móvil', {'Solo del móvil':ev(20),'Cena Pluto':ev(50)});
await movB.arrancar();
const pcC = crearDispositivo('PC', pcA.local, pcA.sinc); await pcC.arrancar();
ok(Object.keys(pcC.local).length===3, `nadie pierde nada en ningún orden: ${JSON.stringify(Object.keys(pcC.local))}`);

console.log('\n══ Sin sesión iniciada (las reglas deniegan) ══');
almacen.clear(); limpiarPrevios();
setSesion(false);
const sinSesion = crearDispositivo('sin sesión', {'Mío':ev(10)});
await sinSesion.arrancar();
ok(Object.keys(sinSesion.local).length===1, 'lo local NO se pierde aunque la nube deniegue');
ok(sinSesion.errores.length>0, `y el error se detecta para poder avisar: ${JSON.stringify(sinSesion.errores)}`);
setSesion(true);

console.log('\n══ Escenarios duros ══');
// 1. Borrar un evento en un dispositivo llega al otro
almacen.clear(); limpiarPrevios();
const a1 = crearDispositivo('A', {'Uno':ev(10),'Dos':ev(20),'Tres':ev(30)});
await a1.arrancar();
const b1 = crearDispositivo('B', {}); await b1.arrancar();
ok(Object.keys(b1.local).length===3, `B recibe los 3 de A: ${JSON.stringify(Object.keys(b1.local))}`);
// A borra "Dos"
const sinDos = { 'Uno':ev(10), 'Tres':ev(30) };
await N.sincronizarArchivoNube(a1.local, sinDos); a1.local = sinDos;
const b2 = crearDispositivo('B', b1.local, b1.sinc); await b2.arrancar();
ok(!Object.keys(b2.local).includes('Dos'), `el borrado llega a B: ${JSON.stringify(Object.keys(b2.local))}`);

// 2. Abrir dos veces seguidas no duplica ni borra
almacen.clear(); limpiarPrevios();
const c1 = crearDispositivo('C', {'Uno':ev(10),'Dos':ev(20)}); await c1.arrancar();
const docs1 = [...almacen.keys()].filter(k=>k.startsWith('indice/evt_')).length;
const c2 = crearDispositivo('C', c1.local, c1.sinc); await c2.arrancar();
const docs2 = [...almacen.keys()].filter(k=>k.startsWith('indice/evt_')).length;
ok(docs1===2 && docs2===2, `abrir dos veces deja 2 documentos, no ${docs2}`);
ok(Object.keys(c2.local).length===2, 'y siguen los 2 eventos');

// 3. Un evento editado en el móvil llega al PC
almacen.clear(); limpiarPrevios();
const m1 = crearDispositivo('móvil', {'Boda':{evento:'boda',pax:100}}); await m1.arrancar();
await N.sincronizarArchivoNube(m1.local, {'Boda':{evento:'boda',pax:150}});
const p1 = crearDispositivo('PC', {'Boda':{evento:'boda',pax:100}}, ['Boda']); await p1.arrancar();
ok(p1.local['Boda'].pax===150, `el PC recibe la edición del móvil (pax=${p1.local['Boda'].pax})`);

// 4. Nombres con tildes, barras y muy largos
almacen.clear(); limpiarPrevios();
const raros = {'Comunión Álvaro/Rocío':ev(40), ['x'.repeat(200)]:ev(10), 'Boda 50% + extra':ev(60)};
const r1 = crearDispositivo('raros', raros); await r1.arrancar();
const r2 = crearDispositivo('otro', {}); await r2.arrancar();
ok(Object.keys(r2.local).length===3, `nombres raros viajan bien: ${JSON.stringify(Object.keys(r2.local).map(s=>s.slice(0,22)))}`);

// 5. El documento antiguo NO se toca nunca
almacen.clear(); limpiarPrevios();
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Viejo':ev(10)}), actualizado: 1 });
const v1 = crearDispositivo('V', {'Nuevo':ev(20)}); await v1.arrancar();
const antiguo = almacen.get('indice/eventosGuardados');
ok(JSON.parse(antiguo.mapa).Viejo !== undefined && antiguo.actualizado===1, 'el documento antiguo queda intacto como copia de seguridad');
ok(Object.keys(v1.local).length===2, 'y sus eventos se recuperan y se suben');

console.log('\n══ El fallo que hacía desaparecer eventos de la pantalla ══');
// Una escritura en vuelo hace que Firestore entregue una foto con SOLO ese documento.
// Tomarla por la lista buena borraba los demás. Con cambios, no puede pasar.
almacen.clear(); limpiarPrevios();
const d1 = crearDispositivo('D', {'Boda que viene':ev(100), 'Pasado':ev(80)});
await d1.arrancar();
await new Promise(r => setTimeout(r, 0));   // la suscripción se registra en un microtask
ok(Object.keys(d1.local).length===2, `arranca con los 2: ${JSON.stringify(Object.keys(d1.local))}`);
// Se edita SOLO uno: la foto que llega trae un único documento
await N.sincronizarArchivoNube(d1.local, { ...d1.local, 'Boda que viene': ev(175) });
ok(Object.keys(d1.local).length===2, `tras editar uno siguen los 2: ${JSON.stringify(Object.keys(d1.local))}`);
ok(d1.local['Boda que viene'].pax===175, 'y el editado se actualiza');
ok(d1.local['Pasado'] !== undefined, 'el que no se tocó NO desaparece');

// ─── QUÉ SE APLICA AL EVENTO QUE TIENES ABIERTO ───────────────────────────────
// Dos personas con el mismo evento abierto y sin link compartido no se enteraban de
// nada: la lista se actualizaba, pero lo que tenías delante no, y ganaba la última en
// guardar en silencio. Estos son los guardianes de esa aplicación, que es la parte que
// puede pisarte lo que estás viendo.
console.log("\n══ Qué se aplica al evento que tienes abierto ══");
{
  const { cambioDelEventoAbierto } = await import("../sincronizacion-eventos.js");
  const cambios = [
    { nombre: "Boda Ana", tipo: "cambio", estado: { pax: 120 } },
    { nombre: "Produ Movistar", tipo: "cambio", estado: { pax: 25 } },
    { nombre: "Cumple Marta", tipo: "borrado" },
  ];
  ok(cambioDelEventoAbierto(cambios, "Boda Ana", {})?.pax === 120,
    "se aplica el cambio del evento abierto");
  ok(cambioDelEventoAbierto(cambios, "Otra boda", {}) === null,
    "y solo ese: el de otro evento no toca tu pantalla");
  ok(cambioDelEventoAbierto(cambios, "Cumple Marta", {}) === null,
    "un borrado no se aplica a la pantalla");
  ok(cambioDelEventoAbierto(cambios, "", {}) === null,
    "sin evento abierto no se aplica nada");
  ok(cambioDelEventoAbierto(cambios, "Boda Ana", { eventoNubeId: "abc123" }) === null,
    "con link compartido manda su propia suscripción, no esta");
}

// ── Las recogidas que trae un envío del formulario ────────────────────────────
// Los interruptores de la pantalla crean la recogida de cada alquiler al pulsarlos.
// Cuando la configuración llega de fuera (un envío de la oficina) no hay clic que
// valga: si esto falla, la app carga material de alquiler y NADIE va a buscarlo.
console.log("\n══ Alquileres → recogidas, sin pantalla ══");
{
  const { recogidasConAlquileres } = await import("../alquileres.js");
  const conceptos = (rs) => rs.map(r => r.concepto).sort();

  const boda = recogidasConAlquileres({
    evento: "boda", fechaEvento: "2027-08-11",
    origenSillas: "Carvillo", llevaArmarioCaliente: true, llevaMobiliarioAlquiler: true,
  });
  ok(JSON.stringify(conceptos(boda)) === JSON.stringify(["Armario caliente (Dealde)", "Mobiliario (Event Style)", "Sillas (Carvillo)"]),
    `cada alquiler trae su recogida con su proveedor → ${JSON.stringify(conceptos(boda))}`);
  const sillas = boda.find(r => r.auto === "sillas");
  ok(sillas.fecha === "2027-08-10" && sillas.fechaDevolucion === "2027-08-12",
    `se recoge el día antes y se devuelve el día después → ${sillas.fecha} / ${sillas.fechaDevolucion}`);

  ok(recogidasConAlquileres({ evento: "boda", origenSillas: "Nuestras" }).length === 0,
    "las sillas nuestras no crean recogida");
  ok(recogidasConAlquileres({ evento: "boda", origenSillas: "No llevan" }).length === 0,
    "y si no se llevan sillas, tampoco");

  // En un rodaje no hay mobiliario de Event Style, y las carpas solo si se alquilan
  const rodaje = recogidasConAlquileres({
    evento: "produccion", fechaEvento: "2027-09-05",
    llevaMobiliarioAlquiler: true, llevaGenerador: true, llevaCarpas: true, alquilaCarpas: true,
  });
  ok(JSON.stringify(conceptos(rodaje)) === JSON.stringify(["Carpas (Support On Set)", "Generador (Support On Set)"]),
    `en un rodaje: generador y carpas a SOS, y nada de Event Style → ${JSON.stringify(conceptos(rodaje))}`);
  ok(recogidasConAlquileres({ evento: "produccion", llevaCarpas: true }).length === 0,
    "las carpas del almacén no crean recogida: solo las alquiladas");

  // Lo escrito a mano no se toca NUNCA, y lo ya recogido tampoco se borra
  const conManual = recogidasConAlquileres({
    evento: "boda", fechaEvento: "2027-08-11", origenSillas: "Dealde",
    recogidas: [{ concepto: "Camión plataforma", fecha: "2027-08-09" }],
  });
  ok(conManual.some(r => r.concepto === "Camión plataforma" && !r.auto) && conManual.length === 2,
    `la recogida escrita a mano se queda como estaba → ${JSON.stringify(conceptos(conManual))}`);
  const yaRecogido = recogidasConAlquileres({
    evento: "boda", origenSillas: "Nuestras",
    recogidas: [{ concepto: "Sillas (Dealde)", auto: "sillas", recogido: true }],
  });
  ok(yaRecogido.length === 1,
    "un alquiler ya recogido no se borra aunque se apague: el material está de por medio");

  // Cambiar de proveedor renombra, no duplica
  const cambiado = recogidasConAlquileres({
    evento: "boda", fechaEvento: "2027-08-11", origenSillas: "Carvillo",
    recogidas: [{ concepto: "Sillas (Dealde)", auto: "sillas", fecha: "2027-08-01", fechasAuto: false }],
  });
  ok(cambiado.length === 1 && cambiado[0].concepto === "Sillas (Carvillo)" && cambiado[0].fecha === "2027-08-01",
    `cambiar de proveedor renombra y respeta la fecha puesta a mano → ${JSON.stringify(cambiado[0])}`);
}

// ── Un envío, leído en la bandeja ─────────────────────────────────────────────
// Quien revisa el envío tiene que leer lo mismo que vio quien lo mandó, y sobre todo
// tiene que distinguir "han dicho que no" de "no lo saben": lo segundo es lo que hay
// que mirar antes del evento.
console.log("\n══ Cómo se lee un envío en la bandeja ══");
{
  const { resumirEnvio } = await import("../formulario/preguntas.js");
  const filas = resumirEnvio({
    tipo: "boda", nombre: "Boda Ana y Luis", sitio: "Finca La Alquería",
    fecha: "2027-08-11", horaInicio: "12:30", horaFin: "02:00",
    adultos: 120, ninos: 10, coctel: 3, copas: 0,
    servicio: "bandeja", horno: "Grande", sillas: "Carvillo",
    menu: ["paella"], extras: [], entrante: null, notas: "",
  });
  const de = (id) => filas.find(f => f.id === id);
  ok(de("sillas").respuesta === "Las alquilamos a Carvillo",
    `las sillas se leen con su proveedor → "${de("sillas").respuesta}"`);
  ok(de("copas").respuesta === "no hay",
    `"cero horas de barra" se lee como no hay, no como sin contestar → "${de("copas").respuesta}"`);
  ok(de("entrante").respuesta === "no lo sé" && de("entrante").sinContestar === true,
    "lo que no saben sale marcado aparte, que es lo que hay que revisar");
  ok(de("coctel").sinContestar === false && de("gente").respuesta === "120 adultos · 10 niños",
    `lo contestado se lee entero → "${de("gente").respuesta}"`);
  ok(de("cuando").respuesta.includes("12:30") && de("cuando").respuesta.includes("a 02:00"),
    `la hora de fin se enseña aunque no configure nada → "${de("cuando").respuesta}"`);
  ok(!filas.some(f => f.id === "dias") && !filas.some(f => f.id === "carpas"),
    "y de una boda no se enseñan las preguntas de rodaje");
}

// ── Aplicar un envío no puede pisar lo que ya había ───────────────────────────
// Un envío llega de fuera y se mezcla con un evento que ya tiene trabajo hecho:
// fechas de recogida, notas de logística... Lo que trae el envío manda, pero lo que
// nadie ha contestado no puede borrar nada.
console.log("\n══ Un envío sobre un evento que ya existe ══");
{
  const { recogidasConAlquileres } = await import("../alquileres.js");
  // El envío cambia la fecha del evento: las recogidas automáticas se mueven con ella
  const movidas = recogidasConAlquileres({
    evento: "boda", fechaEvento: "2027-09-04", origenSillas: "Dealde",
    recogidas: [
      { concepto: "Sillas (Dealde)", auto: "sillas", fecha: "2027-08-10", fechaDevolucion: "2027-08-12", fechasAuto: true },
      { concepto: "Camión plataforma", fecha: "2027-08-09" },
    ],
  });
  const sillas = movidas.find(r => r.auto === "sillas");
  ok(sillas.fecha === "2027-09-03" && sillas.fechaDevolucion === "2027-09-05",
    `si el envío mueve la fecha del evento, la recogida se va con ella → ${sillas.fecha} / ${sillas.fechaDevolucion}`);
  ok(movidas.find(r => !r.auto).fecha === "2027-08-09",
    "y la escrita a mano se queda donde estaba");

  const aMano = recogidasConAlquileres({
    evento: "boda", fechaEvento: "2027-09-04", origenSillas: "Dealde",
    recogidas: [{ concepto: "Sillas (Dealde)", auto: "sillas", fecha: "2027-08-01", fechasAuto: false }],
  });
  ok(aMano[0].fecha === "2027-08-01",
    "una fecha de recogida puesta a mano no se mueve ni cambiando la del evento");
}

// ── Un menú puede llevar los dos entrantes ────────────────────────────────────
// En la app el de chupito y el de compartir son dos interruptores distintos (uno
// carga vasos de chupito, el otro platos extra) y hay menús que llevan los dos. El
// formulario obligaba a elegir uno, así que el otro se perdía.
console.log("\n══ Entrante de chupito Y para compartir ══");
{
  const { aRespuestasDeLaApp, resumirEnvio } = await import("../formulario/preguntas.js");

  const losDos = aRespuestasDeLaApp({
    tipo: "boda", nombre: "Boda dos entrantes", adultos: 100,
    entrante: ["chupito", "compartir"], compartirNumero: 2, entrantePersonas: 3,
  });
  ok(losDos.llevaEntrante === true && losDos.entranteCompartido === true,
    "se pueden llevar los dos entrantes a la vez");
  ok(losDos.numEntrantesCompartir === 2 && losDos.personasPorPlatoEntrante === 3,
    `y con sus cifras: ${losDos.numEntrantesCompartir} entrantes, uno cada ${losDos.personasPorPlatoEntrante} pax`);

  const soloChupito = aRespuestasDeLaApp({ tipo: "boda", adultos: 80, entrante: ["chupito"] });
  ok(soloChupito.llevaEntrante === true && soloChupito.entranteCompartido === false,
    "solo el de chupito no activa el compartido");

  const ninguno = aRespuestasDeLaApp({ tipo: "boda", adultos: 80, entrante: [] });
  ok(ninguno.llevaEntrante === false && ninguno.entranteCompartido === false,
    "y decir que no lleva ninguno es una respuesta, no un hueco");

  // Sin contestar cada cuántas personas, manda el valor de siempre de la app
  const sinDetalle = aRespuestasDeLaApp({ tipo: "boda", adultos: 80, entrante: ["compartir"] });
  ok(sinDetalle.entranteCompartido === true && sinDetalle.personasPorPlatoEntrante === undefined,
    "si no dicen cada cuántas personas, no se inventa: se queda el valor de la app");

  // La pregunta del detalle solo aparece si hay entrante para compartir
  const filasCon = resumirEnvio({ tipo: "boda", entrante: ["compartir"], entrantePersonas: 4 });
  const filasSin = resumirEnvio({ tipo: "boda", entrante: ["chupito"] });
  ok(filasCon.some(f => f.id === "entrantePersonas") && !filasSin.some(f => f.id === "entrantePersonas"),
    "y lo de cada cuántas personas solo se pregunta si hay entrante para compartir");
}

// ── El staff se pregunta con los adultos y los niños ──────────────────────────
// No son invitados, pero están ahí: la app los suma al personal para agua y vasos.
console.log("\n══ Staff en el recuento de gente ══");
{
  const { aRespuestasDeLaApp, resumirEnvio } = await import("../formulario/preguntas.js");
  const con = aRespuestasDeLaApp({ tipo: "boda", adultos: 120, ninos: 10, staff: 6 });
  ok(con.pax === 120 && con.ninos === 10 && con.numStaff === 6,
    `el staff viaja aparte de los invitados → ${con.pax} + ${con.ninos} niños + ${con.numStaff} staff`);
  const sin = aRespuestasDeLaApp({ tipo: "boda", adultos: 120 });
  ok(sin.numStaff === undefined,
    "y si no lo ponen, no se inventa un cero: se queda el valor de la app");
  const fila = resumirEnvio({ tipo: "boda", adultos: 120, ninos: 10, staff: 6 }).find(f => f.id === "gente");
  ok(fila.respuesta.includes("6 staff"),
    `la bandeja lo enseña con el resto de la gente → "${fila.respuesta}"`);
}

// ── Borrar un evento lo borra también de la nube ──────────────────────────────
// Si el borrado solo pasara en este navegador, el evento volvería en cuanto otro
// dispositivo sincronizara su copia, y además seguiría saliéndole a la oficina en la
// lista de próximos del formulario.
console.log("\n══ Borrar un evento ══");
{
  const { calcularCambiosArchivo, idDeNombreEvento } = await import("../nube.js");
  const { resumirParaOficina } = await import("../formulario/envios.js");

  const antes = { "Boda Ana": { pax: 100, fechaEvento: "2027-08-11" }, "Cumple Marta": { pax: 30, fechaEvento: "2027-09-02" } };
  const despues = { "Boda Ana": antes["Boda Ana"] };
  const { escribir, borrar } = calcularCambiosArchivo(antes, despues);
  ok(borrar.length === 1 && borrar[0].nombre === "Cumple Marta",
    `el evento borrado se manda a borrar de la nube → ${JSON.stringify(borrar.map(b => b.nombre))}`);
  ok(borrar[0].id === idDeNombreEvento("Cumple Marta"),
    "y se borra justo su documento, no otro");
  ok(escribir.length === 0,
    "y no se reescribe el que no se ha tocado");

  // Y deja de estar en la lista corta que ve la oficina
  const paraOficina = resumirParaOficina(despues, "2027-01-01").map(e => e.nombre);
  ok(!paraOficina.includes("Cumple Marta") && paraOficina.includes("Boda Ana"),
    `y desaparece de los próximos que ve la oficina → ${JSON.stringify(paraOficina)}`);
}

// ── Flores y minutas: no son material, son un sitio y un día ──────────────────
// No se cargan del almacén: alguien tiene que ir a por ellas. Si no acaban en las
// recogidas con su fecha, no avisa nadie y el día del evento no están.
console.log("\n══ Flores y minutas → recogidas ══");
{
  const { recogidasDelEnvio, resumirEnvio, archivosDelEnvio } = await import("../formulario/preguntas.js");

  const r = recogidasDelEnvio({
    tipo: "boda", flores: "si", floresQuien: "Floristería Mar", floresFecha: "2027-08-10",
    minutas: "si", minutasQuien: "Imprenta Ruiz", minutasFecha: "2027-08-09",
  });
  ok(r.length === 2 && r[0].concepto === "Flores (Floristería Mar)" && r[0].fecha === "2027-08-10",
    `las flores van con su sitio y su día → ${JSON.stringify(r[0])}`);
  ok(r[1].concepto === "Minutas (Imprenta Ruiz)" && r[1].fecha === "2027-08-09",
    `y las minutas igual → ${JSON.stringify(r[1])}`);
  ok(!r.some(x => x.auto),
    "no son automáticas: se portan como una recogida escrita a mano y nada las quita sola");

  ok(recogidasDelEnvio({ flores: "no", minutas: "no" }).length === 0,
    "si no llevan, no se crea ninguna recogida");
  ok(recogidasDelEnvio({}).length === 0,
    "y si no lo han contestado, tampoco se inventa nada");
  const sinQuien = recogidasDelEnvio({ flores: "si", floresFecha: "2027-08-10" });
  ok(sinQuien[0].concepto === "Flores",
    `sin saber a quién, la recogida se crea igual → "${sinQuien[0].concepto}"`);

  // En la bandeja se leen con su sitio y su día, no como un "Sí" pelado
  const fila = resumirEnvio({
    tipo: "boda", flores: "si", floresQuien: "Floristería Mar", floresFecha: "2027-08-10",
  }).find(f => f.id === "flores");
  ok(/Floristería Mar/.test(fila.respuesta) && /ago/.test(fila.respuesta),
    `y se leen enteras en la bandeja → "${fila.respuesta}"`);

  // Minutas en todos los eventos menos en rodaje; flores en todos
  const ids = (tipo) => resumirEnvio({ tipo }).map(f => f.id);
  ok(ids("produccion").includes("flores") && !ids("produccion").includes("minutas"),
    "en un rodaje se preguntan las flores pero no las minutas");
  ok(ids("cumpleanos").includes("minutas") && ids("boda").includes("minutas"),
    "y las minutas se preguntan en el resto de eventos");

  // Lo que hay que imprimir, solo en rodaje
  ok(ids("produccion").includes("imprimirMenu") && ids("produccion").includes("etiquetas"),
    "en un rodaje se pregunta por el menú a imprimir y por las etiquetas");
  ok(!ids("boda").includes("imprimirMenu"),
    "y en una boda no se pregunta nada de imprimir");

  const conArchivo = archivosDelEnvio({
    imprimirMenu: "si",
    imprimirMenuArchivo: { nombre: "menu.jpg", tipo: "image/jpeg", datos: "data:image/jpeg;base64,AAAA", peso: 1234 },
  });
  ok(conArchivo.length === 1 && conArchivo[0].etiqueta === "Menú para imprimir",
    `el archivo adjunto llega a la bandeja → ${conArchivo[0].archivo.nombre}`);
  ok(archivosDelEnvio({ imprimirMenu: "si" }).length === 0,
    "y decir que sí sin adjuntar nada no inventa un archivo vacío");
}

// ── Carpas: se pregunta el número, no si hay sombra ───────────────────────────
// Preguntar "¿hay sombra?" es preguntar por el problema; lo que hay que cargar es un
// número de carpas. Se propone el que sale de la gente y se puede cambiar, y lo que
// pase de las 8 del almacén se alquila solo.
console.log("\n══ Cuántas carpas y cuántas alquilar ══");
{
  const { carpasRecomendadas, carpasPorAlquilar, paxDelDiaGrande, CARPAS_EN_ALMACEN } = await import("../carpas.js");
  const { aRespuestasDeLaApp, resumirEnvio } = await import("../formulario/preguntas.js");

  ok(carpasRecomendadas(40) === 6, `40 pax → 6 carpas (4 de comer + buffet + camión): ${carpasRecomendadas(40)}`);
  ok(carpasRecomendadas(12) === 3, `12 pax → 3: ${carpasRecomendadas(12)}`);
  ok(carpasRecomendadas(0) === 3, "sin gente puesta se propone el mínimo, no cero");
  ok(carpasPorAlquilar(11) === 3 && carpasPorAlquilar(6) === 0,
    `de 11 hay que alquilar 3, y de 6 ninguna (almacén: ${CARPAS_EN_ALMACEN})`);
  ok(paxDelDiaGrande(["12", "17", "12"]) === 17,
    "manda el día de más gente: las carpas se montan una vez y se quedan");

  const pocas = aRespuestasDeLaApp({ tipo: "produccion", dias: [30], carpas: "si", numCarpas: 5 });
  ok(pocas.llevaCarpas === true && pocas.numCarpas === 5 && pocas.alquilaCarpas === false,
    "5 carpas caben en el almacén: no se alquila ninguna");
  const muchas = aRespuestasDeLaApp({ tipo: "produccion", dias: [120], carpas: "si", numCarpas: 12 });
  ok(muchas.alquilaCarpas === true,
    "12 no caben: se marca el alquiler solo, sin preguntarlo aparte");
  const ninguna = aRespuestasDeLaApp({ tipo: "produccion", dias: [30], carpas: "no" });
  ok(ninguna.llevaCarpas === false && ninguna.numCarpas === undefined,
    "y si no hacen falta, no se lleva ninguna");

  // Lo que ya no se pregunta en un rodaje
  const ids = resumirEnvio({ tipo: "produccion" }).map(f => f.id);
  ok(!ids.includes("sombra") && !ids.includes("carpasAlquiler"),
    "ya no se pregunta por la sombra ni si se alquilan: lo dice el número");
  const opcionesMenu = resumirEnvio({ tipo: "produccion", menu: ["paella", "frito", "jamonero"] });
  ok(!/Jamonero/.test(opcionesMenu.find(f => f.id === "menu").respuesta),
    "en un rodaje no se ofrece jamonero");
  ok(!ids.includes("extras"),
    "y sin chill out ni palomitera no queda nada que preguntar de lo presupuestado: esa pantalla no sale");
  ok(resumirEnvio({ tipo: "boda" }).some(f => f.id === "extras"),
    "pero en una boda esa pregunta sigue estando");
}

// ── A quién se avisa por WhatsApp ─────────────────────────────────────────────
// El aviso dentro de la app solo salta si la app está abierta. Desde la bandeja se
// puede avisar por WhatsApp con todo cerrado, y por eso los números tienen que
// quedar limpios: WhatsApp no traga espacios, guiones ni el "+".
console.log("\n══ Avisos por WhatsApp ══");
{
  const { limpiarAvisos } = await import("../formulario/envios.js");
  const l = limpiarAvisos([{ nombre: "  Raúl · Jefe de logística ", tel: "+34 600 11 22 33" }]);
  // Número INVENTADO a propósito: el repositorio es público. Los de verdad viven
  // en Firestore, puestos una vez desde la app.
  ok(l[0].tel === "34600112233", `el número se limpia para el enlace → ${l[0].tel}`);
  ok(l[0].nombre === "Raúl · Jefe de logística", "y el nombre se queda sin espacios de más");
  ok(limpiarAvisos([{ nombre: "Sin número", tel: "" }]).length === 0,
    "un contacto sin número no viaja: sería un botón que no lleva a ningún sitio");
  ok(limpiarAvisos([{ nombre: "Corto", tel: "123" }]).length === 0,
    "y un número imposible tampoco");
  ok(limpiarAvisos(Array.from({ length: 12 }, (_, i) => ({ nombre: `N${i}`, tel: "34600111222" }))).length === 6,
    "como mucho 6, que si no cada envío de la bandeja es una fila de botones");
  ok(limpiarAvisos(null).length === 0 && limpiarAvisos(undefined).length === 0,
    "sin nadie configurado no falla: simplemente no sale el botón");
}

// ── Qué han cambiado, no que hayan cambiado algo ──────────────────────────────
// Cuando la oficina corrige un envío, lo útil es la diferencia: "120 → 140 adultos"
// se lee de un vistazo, "han cambiado algo" obliga a abrirlo y compararlo a mano.
console.log("\n══ La diferencia entre dos versiones de un envío ══");
{
  const { cambiosEntreRespuestas } = await import("../formulario/preguntas.js");
  const antes = { tipo: "boda", nombre: "Boda A", adultos: 120, ninos: 10, horno: "Grande", copas: 4 };
  const dif = cambiosEntreRespuestas(antes, { ...antes, adultos: 140, horno: "Ambos" });
  ok(dif.length === 2, `solo salen las que han cambiado (${dif.length})`);
  const gente = dif.find(c => c.id === "gente");
  ok(gente.antes.includes("120") && gente.ahora.includes("140"),
    `y se leen en palabras → "${gente.antes} → ${gente.ahora}"`);
  ok(dif.some(c => c.id === "horno" && c.ahora === "Los dos"),
    "también las de elegir, con el texto de la opción y no su código");
  ok(cambiosEntreRespuestas(antes, antes).length === 0,
    "si no ha cambiado nada, no se dice nada");
  ok(cambiosEntreRespuestas({}, {}).length === 0,
    "y con envíos vacíos no revienta");
}

// ── Lo que no se puede dejar en blanco ────────────────────────────────────────
// El nombre y el día no son "un dato más": sin nombre logística recibe un "Evento
// sin nombre" y no sabe de qué le hablan, y sin día no se pueden calcular las
// recogidas (flores, minutas, alquileres), que es lo que hace que alguien vaya a
// buscarlas a tiempo.
console.log("\n══ Lo obligatorio del formulario ══");
{
  const { loQueFalta, preguntasDe } = await import("../formulario/preguntas.js");
  const vacio = loQueFalta({ tipo: "boda" }).map(f => f.id);
  ok(vacio.includes("nombreYsitio") && vacio.includes("cuando"),
    `sin nombre ni día se avisa de las dos → ${JSON.stringify(vacio)}`);
  ok(loQueFalta({ tipo: "boda", nombre: "Boda A", fecha: "2027-08-11" }).length === 0,
    "con nombre y día no falta nada");
  ok(loQueFalta({ tipo: "boda", nombre: "   ", fecha: "2027-08-11" }).length === 1,
    "un nombre de solo espacios no cuenta como nombre");
  ok(loQueFalta({ tipo: "produccion", nombre: "Rodaje", fecha: "2027-08-11" }).length === 0,
    "y en un rodaje pide lo mismo, ni más ni menos");

  // Y esas dos preguntas ya no ofrecen "No lo sé": sería una salida a un callejón
  const dela = (id, tipo) => preguntasDe(tipo, {}).find(p => p.id === id);
  ok(dela("nombreYsitio", "boda").noSe === false && dela("cuando", "boda").noSe === false,
    "no se puede contestar \"no lo sé\" al nombre ni al día");
  ok(dela("horno", "boda").noSe !== false,
    "pero al resto sí: una respuesta en blanco sigue siendo información buena");

  // Las sillas se preguntan en TODOS los tipos, rodaje incluido. Antes el rodaje se
  // saltaba la pregunta y al aplicar el envío forzaba "Nuestras", así que pisaba el
  // alquiler que hubiera puesto en la app y se llevaba por delante su recogida.
  for (const tipo of ["boda", "comunion", "corporativo", "cumpleanos", "produccion"]) {
    ok(!!dela("sillas", tipo), `en ${tipo} se pregunta quién pone las sillas`);
  }
}

// ── Manteles: la app pone cuántos, la oficina de qué color ────────────────────
// Lo importante es que el reparto SUME el total calculado: si cargara el número
// completo de cada color, se iría el doble de manteles en el camión.
console.log("\n══ Color de los manteles ══");
{
  const { repartoManteles, colorPorDefecto } = await import("../manteles.js");
  const { aRespuestasDeLaApp } = await import("../formulario/preguntas.js");

  ok(colorPorDefecto("boda") === "Beige" && colorPorDefecto("produccion") === "Negros",
    "sin elegir nada se carga lo de siempre: beige en salón, negros en rodaje");

  const uno = repartoManteles(11, "Negros");
  ok(uno.length === 1 && uno[0][0] === "Manteles negros" && uno[0][1] === "11",
    `un solo color lleva el total → ${JSON.stringify(uno)}`);

  const dos = repartoManteles(11, "Ambos", 50);
  const suma = dos.reduce((a, [, n]) => a + Number(n), 0);
  ok(suma === 11, `de los dos colores, la suma es el total calculado (${suma} de 11)`);
  ok(dos[0][0] === "Manteles beige" && dos[0][1] === "6" && dos[1][1] === "5",
    `y se reparte por el porcentaje → ${JSON.stringify(dos)}`);
  const setenta = repartoManteles(11, "Ambos", 70);
  ok(setenta[0][1] === "8" && setenta[1][1] === "3",
    `70% beige de 11 son 8 y 3 → ${JSON.stringify(setenta)}`);
  ok(repartoManteles(11, "Ambos", 100).length === 1,
    "al 100% no se carga una línea de cero del otro color");

  // Los nombres son los de siempre: el nombre ES la identidad del item, y cambiarlo
  // perdería las marcas de carga de los eventos que ya existen
  ok(repartoManteles(5, "Beige")[0][0] === "Manteles beige",
    "el nombre del item no cambia respecto a lo que ya había");

  const e = aRespuestasDeLaApp({
    tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100,
    manteles: "Ambos", porcentajeBeige: 70, estiloPlato: "Otro", estiloPlatoCual: "Pizarra",
  });
  ok(e.colorManteles === "Ambos" && e.porcentajeBeige === 70,
    "el color y el reparto viajan del formulario a la app");
  ok(e.estiloPlatoPrincipal === "Pizarra",
    `y un plato escrito a mano llega tal cual → "${e.estiloPlatoPrincipal}"`);
  const lista = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, estiloPlato: "Verde" });
  ok(lista.estiloPlatoPrincipal === "Verde", "y uno de la lista, con su nombre exacto");
  const sinDecir = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, estiloPlato: "Otro", estiloPlatoCual: "  " });
  ok(sinDecir.estiloPlatoPrincipal === undefined,
    "si eligen \"Otro\" y no escriben nada, no se pisa el plato que tuviera la app");
}

// ── Lo que hay que comprar ────────────────────────────────────────────────────
// El hielo no está en el almacén: alguien pasa a comprarlo. Va a Compras, que ya
// tiene su aviso, en vez de quedarse enterrado en las notas del evento.
console.log("\n══ Compras que trae el envío ══");
{
  const { comprasDelEnvio, resumirEnvio } = await import("../formulario/preguntas.js");
  const c = comprasDelEnvio({ comprar: "20 sacos de hielo\n· Hielo seco\n\n   \n- Limas" });
  ok(c.length === 3, `una línea, una compra (${c.length})`);
  ok(c[0].concepto === "20 sacos de hielo" && c[1].concepto === "Hielo seco" && c[2].concepto === "Limas",
    `y se limpian las viñetas y los huecos → ${JSON.stringify(c.map(x => x.concepto))}`);
  ok(c.every(x => x.comprado === false),
    "ninguna llega marcada como comprada: eso lo marca quien va a la tienda");
  ok(comprasDelEnvio({}).length === 0 && comprasDelEnvio({ comprar: "  " }).length === 0,
    "y sin nada que comprar no se inventa una línea vacía");

  // En la bandeja se lee sin abrir el envío, y las notas siguen siendo cosa aparte
  const filas = resumirEnvio({ tipo: "boda", comprar: "20 sacos de hielo\nHielo seco", notas: "Alergia al marisco" });
  ok(filas.find(f => f.id === "comprar").respuesta === "20 sacos de hielo · Hielo seco",
    "las compras se leen en una línea en la bandeja");
  ok(filas.find(f => f.id === "notas").respuesta === "Alergia al marisco",
    "y no se mezclan con las notas del evento");
}

// ── El armario caliente también es alquiler ───────────────────────────────────
// Se pide a Dealde: no basta con cargarlo en la checklist, hay que ir a buscarlo y
// devolverlo. Si no viaja en el envío, la app lo carga y nadie va a por él.
console.log("\n══ Armario caliente ══");
{
  const { aRespuestasDeLaApp, resumirEnvio } = await import("../formulario/preguntas.js");
  const { recogidasConAlquileres } = await import("../alquileres.js");

  const con = aRespuestasDeLaApp({ tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100, armarioCaliente: "si" });
  ok(con.llevaArmarioCaliente === true, "marcarlo llega a la app");
  const r = recogidasConAlquileres(con);
  ok(r.some(x => x.concepto === "Armario caliente (Dealde)" && x.fecha === "2027-08-10" && x.fechaDevolucion === "2027-08-12"),
    `y trae su recogida en Dealde con sus fechas → ${JSON.stringify(r.map(x => x.concepto))}`);

  const sin = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, armarioCaliente: "no" });
  ok(sin.llevaArmarioCaliente === false && recogidasConAlquileres(sin).length === 0,
    "decir que no lleva no crea ninguna recogida");
  ok(aRespuestasDeLaApp({ tipo: "boda", adultos: 100 }).llevaArmarioCaliente === undefined,
    "y si no lo contestan, se queda lo que tuviera la app");

  const ids = (t) => resumirEnvio({ tipo: t }).map(f => f.id);
  ok(ids("boda").includes("armarioCaliente") && ids("cumpleanos").includes("armarioCaliente"),
    "se pregunta en los eventos de salón");
  ok(!ids("produccion").includes("armarioCaliente"),
    "y no en un rodaje, que ahí no se lleva");
}

// ── Lo que se presupuesta aparte ──────────────────────────────────────────────
// Jarras, aguas pequeñas y cuántos barriles. Van dentro de "¿está presupuestado
// algo de esto?" y no en preguntas propias: son tres cosas que se marcan de un
// vistazo y el formulario ya tiene quince pantallas.
console.log("\n══ Jarras, aguas y barriles ══");
{
  const { aRespuestasDeLaApp, opcionesDe, PREGUNTAS } = await import("../formulario/preguntas.js");
  const extras = PREGUNTAS.find(p => p.id === "extras");
  const ops = (t) => opcionesDe(extras, t).map(o => o.valor);

  ok(ops("boda").includes("jarras") && !ops("cumpleanos").includes("jarras"),
    "las jarras se ofrecen donde la app las tiene: no en cumpleaños ni en rodaje");
  ok(!ops("boda").includes("aguasPequenas"),
    "las aguas pequeñas no se preguntan aquí: son cosa de rodaje y allí van siempre");

  const e = aRespuestasDeLaApp({
    tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100,
    extras: ["barril50", "jarras"], numBarriles: 3,
  });
  ok(e.tamanoBarril === "50L" && e.numBarriles === 3,
    `el barril lleva su tamaño y cuántos → ${e.tamanoBarril} ×${e.numBarriles}`);
  ok(e.llevaJarrasCristal === true, "y las jarras llegan marcadas");

  const sinBarril = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, extras: ["jarras"], numBarriles: 3 });
  ok(sinBarril.numBarriles === undefined,
    "sin barril marcado no se cuela un número de barriles");
  const nada = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, extras: [] });
  ok(nada.llevaJarrasCristal === false,
    "y decir que no hay nada presupuestado es una respuesta, no un hueco");
}

// ── Aguas pequeñas: en rodaje van siempre, lo que cambia es el envase ─────────
// La app tenía el interruptor al revés: lo ofrecía en los eventos de salón, cuando
// las cajas de 33cl son el agua de beber de todo el día en un rodaje.
console.log("\n══ Envase de las aguas pequeñas ══");
{
  const { aRespuestasDeLaApp, resumirEnvio } = await import("../formulario/preguntas.js");
  const e = aRespuestasDeLaApp({ tipo: "produccion", nombre: "R", fecha: "2027-08-11", dias: [30], aguaPequena: "Cartón" });
  ok(e.tipoAguaPequena === "Cartón", `el envase viaja a la app → ${e.tipoAguaPequena}`);
  ok(aRespuestasDeLaApp({ tipo: "produccion", dias: [30] }).tipoAguaPequena === undefined,
    "y sin contestar no se inventa: se queda como estaba");
  const ids = (t) => resumirEnvio({ tipo: t }).map(f => f.id);
  ok(ids("produccion").includes("aguaPequena") && !ids("boda").includes("aguaPequena"),
    "solo se pregunta en rodaje");
}

// ── Paella: cuántas y de qué tamaño ──────────────────────────────────────────
// El formulario preguntaba SI había paella pero ni la talla ni el número: la talla se
// quedaba en "Auto" y el número siempre salía de la gente (una cada 30). Con el mismo
// pax cocina puede querer dos medianas en vez de una grande, y eso arrastra paletas,
// trípodes, paravientos y bombonas.
console.log("\n══ Paella: cuántas y de qué tamaño ══");
{
  const { aRespuestasDeLaApp, resumirEnvio, resumirRespuesta, PREGUNTAS } = await import("../formulario/preguntas.js");
  const { calcPaella, paellasPorPax, tallaPorPax } = await import("../paella.js");

  const base = { tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100, menu: ["paella"] };
  const puesto = aRespuestasDeLaApp({ ...base, tamanoPaella: "Mediana", cuantasPaellas: "otras", numPaellas: 3 });
  ok(puesto.tipoPaella === "Mediana" && puesto.numPaellas === 3,
    `la talla y el número viajan a la app → ${puesto.tipoPaella} × ${puesto.numPaellas}`);

  const auto = aRespuestasDeLaApp({ ...base, tamanoPaella: "Auto", cuantasPaellas: "auto" });
  ok(auto.tipoPaella === "Auto" && auto.numPaellas === 0,
    "y decir \"las que salgan por la gente\" es una respuesta: se escribe, no se deja a medias");

  const sinTocar = aRespuestasDeLaApp(base);
  ok(sinTocar.tipoPaella === undefined && sinTocar.numPaellas === undefined,
    "sin contestar no se inventa nada: el evento se queda como estaba");

  // Las dos preguntas solo aparecen si el menú lleva paella
  const ids = (r) => resumirEnvio(r).map(f => f.id);
  const conPaella = ids({ tipo: "boda", menu: ["paella"] });
  const sinPaella = ids({ tipo: "boda", menu: ["frito"] });
  ok(conPaella.includes("tamanoPaella") && conPaella.includes("cuantasPaellas"),
    "con paella en el menú se pregunta talla y número");
  ok(!sinPaella.includes("tamanoPaella") && !sinPaella.includes("cuantasPaellas"),
    "y sin paella no se pregunta ninguna de las dos");
  ok(ids({ tipo: "produccion", menu: ["paella"] }).includes("cuantasPaellas"),
    "en un rodaje también, que también se hace paella");

  // La cuenta es la misma en las dos puntas: un solo sitio, no dos que se separan
  ok(calcPaella(100, "Auto", 0).n === paellasPorPax(100) && paellasPorPax(100) === 4,
    `100 personas → ${paellasPorPax(100)} paellas (una cada 30)`);
  ok(calcPaella(100, "Auto", 0).talla === tallaPorPax(100) && tallaPorPax(100) === "grande",
    "y la talla que sale de la gente es la misma que propone el formulario");
  ok(calcPaella(100, "Mediana", 2).n === 2 && calcPaella(100, "Mediana", 2).talla === "mediana",
    "lo puesto a mano manda sobre la cuenta (2 medianas con 100 personas)");
  ok(calcPaella(100, "Auto", 0).n === 4,
    "y con el número en blanco se vuelve a la cuenta de siempre");

  // El repaso tiene que enseñar el número, no un "Otro número" pelado
  const pNum = PREGUNTAS.find(p => p.id === "cuantasPaellas");
  const resumen = resumirRespuesta(pNum, { ...base, cuantasPaellas: "otras", numPaellas: 3 }, "boda");
  ok(/3/.test(resumen), `el repaso enseña cuántas son → "${resumen}"`);
  const pCarpas = PREGUNTAS.find(p => p.id === "carpas");
  const resCarpas = resumirRespuesta(pCarpas, { tipo: "produccion", carpas: "si", numCarpas: 11 }, "produccion");
  ok(/11/.test(resCarpas), `y las carpas también, que se quedaban en "Sí" → "${resCarpas}"`);
}

// ── Frituras: cuántas sartenes parisiene ─────────────────────────────────────
// Se marcaba "Algo frito" y nada más: la app se quedaba en una sartén aunque hubiera
// tres frituras a la vez, y cada una arrastra su difusor, su trípode y su bombona.
//
// Al añadirlo salió un fallo que llevaba tiempo ahí: en las preguntas de MARCAR el
// número se guardaba siempre en "<valor>Numero" ignorando el campoNumero de la
// pregunta. Los barriles decían guardarse en numBarriles y se guardaban en
// barril30Numero, así que el número que escribían en oficina no llegaba nunca: la app
// recibía "barril de 30L" y cargaba uno.
console.log("\n══ Frituras y el número de las preguntas de marcar ══");
{
  const { aRespuestasDeLaApp, resumirEnvio, PREGUNTAS } = await import("../formulario/preguntas.js");

  const f = aRespuestasDeLaApp({ tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100, menu: ["frito"], numFrituras: 3 });
  ok(f.tieneFrituras === true && f.numFrituras === 3,
    `las sartenes parisiene viajan a la app → ${f.numFrituras}`);

  const sinFrito = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, menu: ["paella"], numFrituras: 3 });
  ok(sinFrito.tieneFrituras === false && sinFrito.numFrituras === undefined,
    "sin marcar frito no se cuela un número de sartenes");

  const soloMarca = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, menu: ["frito"] });
  ok(soloMarca.tieneFrituras === true && soloMarca.numFrituras === undefined,
    "y marcarlo sin decir cuántas deja el valor de la app, no un cero");

  // La pregunta declara dónde va el número, y ahí tiene que ir
  const menu = PREGUNTAS.find(p => p.id === "menu");
  const frito = menu.opciones.find(o => o.valor === "frito");
  ok(frito.conNumero && frito.campoNumero === "numFrituras",
    "la pregunta del menú pide el número y dice dónde guardarlo");

  // El fallo de los barriles: lo que escribían se perdía por el camino
  const b = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, extras: ["barril30"], numBarriles: 3 });
  ok(b.tamanoBarril === "30L" && b.numBarriles === 3,
    `y los barriles ya no pierden su número → ${b.tamanoBarril} × ${b.numBarriles}`);

  // Las que NO declaran campoNumero siguen guardando donde siempre: no se rompe nada
  const extras = PREGUNTAS.find(p => p.id === "extras");
  const chill = extras.opciones.find(o => o.valor === "chillout");
  ok(!chill.campoNumero, "el chill out no declara campoNumero: sigue en chilloutNumero");
  const c = aRespuestasDeLaApp({ tipo: "boda", adultos: 100, extras: ["chillout"], chilloutNumero: 2 });
  ok(c.llevaChillOut === true && c.numChillOut === 2,
    `y su número sigue llegando igual → ${c.numChillOut}`);

  ok(resumirEnvio({ tipo: "boda", menu: ["frito"], numFrituras: 3 }).some(f2 => /3/.test(f2.respuesta)),
    "el repaso enseña cuántas sartenes son antes de mandarlo");
}

// ── Tarta y alergias ─────────────────────────────────────────────────────────
// La mesa de la tarta y sus platos se cargaban SIEMPRE en boda y comunión, hubiera
// tarta o no; en un cumpleaños no se cargaba mesa ninguna, y es donde siempre la hay;
// y la pala y el cuchillo con los que se corta no se cargaban en ningún sitio.
//
// Las alergias vivían dentro del cajón de "algo que tener en cuenta", entre la petición
// del cliente y con quién hablar al llegar. Ahora tienen pantalla propia y salen las
// primeras y marcadas en las notas del evento, que es por donde llegan a la hoja, al
// Word y al texto de WhatsApp.
console.log("\n══ Tarta y alergias ══");
{
  const { aRespuestasDeLaApp, recogidasDelEnvio, resumirEnvio } = await import("../formulario/preguntas.js");
  const base = { tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100 };

  ok(aRespuestasDeLaApp(base).llevaTarta === undefined,
    "sin contestar lo de la tarta no se toca: el evento se queda como estaba");
  ok(aRespuestasDeLaApp({ ...base, tarta: "si" }).llevaTarta === true,
    "decir que sí carga su mesa redonda, los platos, la pala y el cuchillo");
  ok(aRespuestasDeLaApp({ ...base, tarta: "no" }).llevaTarta === false,
    "y decir que no los quita");
  ok(recogidasDelEnvio({ tarta: "si" }).length === 0,
    "la tarta no crea recogida: solo dice si la hay");

  // Alergias: primero, marcadas, y sin pisar el resto de las notas
  const dos = aRespuestasDeLaApp({ ...base, alergias: "2 celíacos", notas: "Llamar a Marta al llegar" });
  ok(/^⚠️ ALERGIAS: 2 celíacos/.test(dos.notasEvento) && /Llamar a Marta/.test(dos.notasEvento),
    `las alergias van las primeras y las notas detrás → ${JSON.stringify(dos.notasEvento)}`);
  ok(aRespuestasDeLaApp({ ...base, alergias: "1 vegano" }).notasEvento === "⚠️ ALERGIAS: 1 vegano",
    "sin más notas, van solas");
  ok(aRespuestasDeLaApp({ ...base, notas: "Solo esto" }).notasEvento === "Solo esto",
    "y sin alergias no se cuela ningún aviso vacío");
  ok(aRespuestasDeLaApp(base).notasEvento === undefined,
    "sin contestar ninguna de las dos, las notas del evento no se tocan");

  // Las dos preguntas existen donde tienen que existir
  const ids = (t) => resumirEnvio({ tipo: t }).map(f => f.id);
  ok(ids("boda").includes("alergias") && ids("produccion").includes("alergias"),
    "las alergias se preguntan en todos los tipos de evento");
  ok(ids("boda").includes("tarta") && ids("cumpleanos").includes("tarta") && !ids("produccion").includes("tarta"),
    "y la tarta en todos menos en un rodaje");
}

// ── Lo que se sale de lo normal ──────────────────────────────────────────────
// El formulario no preguntaba por los platos, los platos de postre, los cubiertos, las
// bandejas ni la plancha de gas. Un evento creado desde aquí se quedaba con los valores
// por defecto de la app sin que nadie los hubiera confirmado, y no había forma de decir
// que ESTA boda va sin cubiertos o con bandejas solo de plata.
//
// Va en una pantalla de casillas y no en cuatro preguntas: la respuesta es "lo de
// siempre" en casi todos los eventos, y el formulario ya pasa de veinte pantallas.
console.log("\n══ Algo distinto de lo normal ══");
{
  const { aRespuestasDeLaApp, resumirEnvio, PREGUNTAS } = await import("../formulario/preguntas.js");
  const base = { tipo: "boda", nombre: "B", fecha: "2027-08-11", adultos: 100 };
  const campos = ["llevaPlatos", "llevaPlatosPostre", "llevaCubiertos", "llevaPlanchaGas", "tipoBandejas"];
  const solo = (e) => Object.fromEntries(campos.filter(k => k in e).map(k => [k, e[k]]));

  // Sin contestar no se toca NADA: la app se queda con lo que ya tuviera. Es la regla de
  // todo el formulario y aquí importa el doble, porque son campos que ya tienen valor.
  ok(Object.keys(solo(aRespuestasDeLaApp(base))).length === 0,
    "sin contestar la pantalla, ninguno de esos campos se toca");

  // Contestarla sin marcar nada SÍ es una respuesta: "va lo de siempre"
  const normal = solo(aRespuestasDeLaApp({ ...base, distinto: [] }));
  ok(normal.llevaPlatos === true && normal.llevaPlatosPostre === true
    && normal.llevaCubiertos === true && normal.tipoBandejas === "Mixto",
    `contestarla sin marcar nada deja lo de siempre → ${JSON.stringify(normal)}`);

  const sinCubiertos = aRespuestasDeLaApp({ ...base, distinto: ["sinCubiertos"] });
  ok(sinCubiertos.llevaCubiertos === false && sinCubiertos.llevaPlatos === true,
    "marcar una casilla quita solo lo suyo, no arrastra al resto");

  // Sin platos tampoco hay platos de postre: servir el postre en plato cuando no se
  // llevan platos no existe, y dejarlo suelto cargaba unos sin los otros.
  const sinPlatos = aRespuestasDeLaApp({ ...base, distinto: ["sinPlatos"] });
  ok(sinPlatos.llevaPlatos === false && sinPlatos.llevaPlatosPostre === false,
    "quitar los platos quita también los de postre");
  ok(aRespuestasDeLaApp({ ...base, distinto: ["sinPlatosPostre"] }).llevaPlatos === true,
    "pero quitar solo los de postre deja los principales");

  // Las bandejas son una elección de tres metida en casillas
  const tipo = (marcadas) => aRespuestasDeLaApp({ ...base, distinto: marcadas }).tipoBandejas;
  ok(tipo(["bandejasMadera"]) === "Madera" && tipo(["bandejasPlata"]) === "Plata",
    "marcar un tipo de bandeja manda");
  ok(tipo(["bandejasMadera", "bandejasPlata"]) === "Mixto",
    "y marcar los dos es llevar de los dos: mixtas, igual que no marcar ninguno");

  const plancha = aRespuestasDeLaApp({ ...base, distinto: ["planchaGas"], numPlanchasGas: 3 });
  ok(plancha.llevaPlanchaGas === true && plancha.numPlanchasGas === 3,
    `la plancha de gas se pide con su número → ${plancha.numPlanchasGas}`);
  ok(aRespuestasDeLaApp({ ...base, distinto: [] }).llevaPlanchaGas === false,
    "y sin marcarla no va, que es lo normal");

  // Un rodaje también carga platos, cubiertos y bandejas: la pantalla no puede quedarse
  // fuera. La plancha sí, que producción no la lee.
  const rodaje = aRespuestasDeLaApp({ tipo: "produccion", distinto: ["sinPlatos", "bandejasPlata"] });
  ok(rodaje.llevaPlatos === false && rodaje.tipoBandejas === "Plata",
    "en un rodaje también manda: allí se cargan platos y bandejas igual");
  ok(!("llevaPlanchaGas" in rodaje),
    "pero la plancha de gas no se le toca, que producción no la usa");

  const ids = (t) => resumirEnvio({ tipo: t }).map(f => f.id);
  ok(ids("boda").includes("distinto") && ids("produccion").includes("distinto"),
    "la pantalla se pregunta en todos los tipos de evento");
  const opts = PREGUNTAS.find(q => q.id === "distinto").opciones.map(o => o.valor);
  ok(opts.length === 6 && opts.includes("sinPlatos") && opts.includes("bandejasPlata"),
    `y son seis casillas en UNA pantalla, no cuatro preguntas sueltas → ${opts.join(", ")}`);
}
