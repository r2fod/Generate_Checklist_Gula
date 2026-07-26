// Prueba de la sincronización con la nube contra un Firestore en memoria que aplica
// LAS MISMAS reglas de seguridad que firestore.rules. Reproduce el arranque de la app
// (fusionar lo local con lo remoto y subir lo que falte) en escenarios de dos
// dispositivos, que es donde estaban los fallos que no se veían de otra forma.
//
//   node src/__tests__/sincronizacion.test.mjs
import { almacen, setSesion } from './firestore-simulado.mjs';
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
    d.unsub = N.suscribirArchivoNube(({ mapa, actualizado, vacio }) => { if (vacio) return; aplicar({ mapa, actualizado }); });
  };
  return d;
}
const ev = (n) => ({ evento:'boda', pax:n });

console.log('══ ESCENARIO REAL: móvil con todo, PC con lo viejo ══');
almacen.clear();
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
almacen.clear();
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Cena Pluto':ev(50)}), actualizado: 1000 });
const pcA = crearDispositivo('PC', {'Solo del PC':ev(10)});
await pcA.arrancar();
const movB = crearDispositivo('móvil', {'Solo del móvil':ev(20),'Cena Pluto':ev(50)});
await movB.arrancar();
const pcC = crearDispositivo('PC', pcA.local, pcA.sinc); await pcC.arrancar();
ok(Object.keys(pcC.local).length===3, `nadie pierde nada en ningún orden: ${JSON.stringify(Object.keys(pcC.local))}`);

console.log('\n══ Sin sesión iniciada (las reglas deniegan) ══');
almacen.clear();
setSesion(false);
const sinSesion = crearDispositivo('sin sesión', {'Mío':ev(10)});
await sinSesion.arrancar();
ok(Object.keys(sinSesion.local).length===1, 'lo local NO se pierde aunque la nube deniegue');
ok(sinSesion.errores.length>0, `y el error se detecta para poder avisar: ${JSON.stringify(sinSesion.errores)}`);
setSesion(true);

console.log('\n══ Escenarios duros ══');
// 1. Borrar un evento en un dispositivo llega al otro
almacen.clear();
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
almacen.clear();
const c1 = crearDispositivo('C', {'Uno':ev(10),'Dos':ev(20)}); await c1.arrancar();
const docs1 = [...almacen.keys()].filter(k=>k.startsWith('indice/evt_')).length;
const c2 = crearDispositivo('C', c1.local, c1.sinc); await c2.arrancar();
const docs2 = [...almacen.keys()].filter(k=>k.startsWith('indice/evt_')).length;
ok(docs1===2 && docs2===2, `abrir dos veces deja 2 documentos, no ${docs2}`);
ok(Object.keys(c2.local).length===2, 'y siguen los 2 eventos');

// 3. Un evento editado en el móvil llega al PC
almacen.clear();
const m1 = crearDispositivo('móvil', {'Boda':{evento:'boda',pax:100}}); await m1.arrancar();
await N.sincronizarArchivoNube(m1.local, {'Boda':{evento:'boda',pax:150}});
const p1 = crearDispositivo('PC', {'Boda':{evento:'boda',pax:100}}, ['Boda']); await p1.arrancar();
ok(p1.local['Boda'].pax===150, `el PC recibe la edición del móvil (pax=${p1.local['Boda'].pax})`);

// 4. Nombres con tildes, barras y muy largos
almacen.clear();
const raros = {'Comunión Álvaro/Rocío':ev(40), ['x'.repeat(200)]:ev(10), 'Boda 50% + extra':ev(60)};
const r1 = crearDispositivo('raros', raros); await r1.arrancar();
const r2 = crearDispositivo('otro', {}); await r2.arrancar();
ok(Object.keys(r2.local).length===3, `nombres raros viajan bien: ${JSON.stringify(Object.keys(r2.local).map(s=>s.slice(0,22)))}`);

// 5. El documento antiguo NO se toca nunca
almacen.clear();
almacen.set('indice/eventosGuardados', { mapa: JSON.stringify({'Viejo':ev(10)}), actualizado: 1 });
const v1 = crearDispositivo('V', {'Nuevo':ev(20)}); await v1.arrancar();
const antiguo = almacen.get('indice/eventosGuardados');
ok(JSON.parse(antiguo.mapa).Viejo !== undefined && antiguo.actualizado===1, 'el documento antiguo queda intacto como copia de seguridad');
ok(Object.keys(v1.local).length===2, 'y sus eventos se recuperan y se suben');
