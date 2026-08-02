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
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Produccion Carlos':ev(20),'Boda Anna y Mario':ev(100),'Cena Pluto':ev(50)}), actualizado: 1000 });
const movil = crearDispositivo('móvil', {'Produccion Carlos':ev(20),'Boda Anna y Mario':ev(100),'Cena Pluto':ev(50),'Produ kitten':ev(20),'Produccion Movistar':ev(30),'Boda nueva':ev(120)});
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
  ok(!filas.some(f => f.id === "dias") && !filas.some(f => f.id === "sombra"),
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
