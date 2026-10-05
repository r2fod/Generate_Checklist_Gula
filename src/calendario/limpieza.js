// ─── LIMPIAR EL CALENDARIO ────────────────────────────────────────────────────
// El calendario se llenó a golpe de importaciones (la hoja de pared, pegar listas) y
// arrastra tres clases de sobras que a mano cuestan de encontrar:
//
//   · REPETIDOS — el mismo evento dos veces el mismo día con el título escrito un poco
//                 distinto ("Produ X" y "Produ X 73 PAX", o "BODA FULANITA EN LA
//                 FINCA?" y "Boda Fulanita"): el id sale del título, así que para la app
//                 son dos apuntes y el día sale con un choque falso.
//   · POSIBLES  — "Posible Produ X" que ya está confirmado como "Produ X" ese mismo día.
//   · MES CRUZADO — el mismo evento con un mes justo de diferencia. La hoja de pared
//                 pinta al principio y al final de cada mes los días del mes de al lado,
//                 y la importación del 14/9 los leyó con el mes del bloque: el 1 de mayo
//                 acabó también en el 1 de abril.
//   · DÍAS SEGUIDOS — el mismo evento el 9 y el 10: uno de los dos tiene el día mal.
//                 Cuál, no se sabe, así que no se marca ninguno. Las producciones no
//                 cuentan: un rodaje de dos días seguidos es lo normal.
//
// "Mismo evento" es el mismo criterio que en el archivo de checklists (mismoTitulo, en
// repetidos.js): un calendario y otro no pueden discrepar de si dos cosas son la misma.
// Aquí solo se SUGIERE: qué grupos hay y cuál de cada uno sobra probablemente. Borrar lo
// decide quien mira la lista (Limpiar.jsx), apunte a apunte. Nunca se sugiere borrar uno
// con trabajo dentro —checklist creada o personal asignado—: eso sí que no se recupera
// con volver a apuntarlo.
//
// Sin React ni navegador: entra la lista, salen los grupos. Se prueba con node.
import { aFecha, esTipoEvento } from "./apuntes.js";
import { aISO } from "../fecha.js";
// Vive en texto.js: la usan también los repetidos del archivo de eventos (repetidos.js)
import { nucleoDeTitulo } from "../texto.js";
import { mismoTitulo } from "../repetidos.js";

// Con checklist creada o con gente asignada: ahí hay trabajo que no se rehace solo
const conTrabajo = (a) => !!(a.evento || (a.personal && a.personal.length));

// De dos iguales se queda el que más dice: el que tiene trabajo, luego el que trae más
// datos (hora, gente, sitio, notas) y, a igualdad, el de título más largo.
const peso = (a) => (conTrabajo(a) ? 1000 : 0)
  + ["hora", "pax", "sitio", "notas", "hasta"].filter(k => a[k]).length * 10
  + Math.min(a.titulo.length, 60) / 100;

// El mismo día del mes de al lado, o null si ese día no existe (31 de abril)
function mesDeAlLado(iso, n) {
  const f = aFecha(iso);
  if (!f) return null;
  const otro = new Date(f.getFullYear(), f.getMonth() + n, f.getDate());
  return otro.getDate() === f.getDate() ? otro : null;
}

export function sugerenciasDeLimpieza(apuntes) {
  const eventos = (Array.isArray(apuntes) ? apuntes : []).filter(a => a && esTipoEvento(a.tipo));
  const info = new Map(eventos.map(a => [a.id, nucleoDeTitulo(a.titulo)]));
  const grupos = [];
  const usados = new Set();
  const quitables = (lista) => lista.filter(a => !conTrabajo(a)).map(a => a.id);

  // 1. Repetidos: mismo día y mismo título (los dos "posible" o ninguno: uno de cada lo
  // mira la regla de abajo)
  const mismoEvento = (a, b) => info.get(a.id).tentativo === info.get(b.id).tentativo && mismoTitulo(a.titulo, b.titulo);
  const juntos = [];
  for (const a of eventos) {
    const grupo = juntos.find(g => g[0].fecha === a.fecha && g.some(x => mismoEvento(x, a)));
    if (grupo) grupo.push(a); else juntos.push([a]);
  }
  for (const lista of juntos) {
    if (lista.length < 2) continue;
    const orden = [...lista].sort((x, y) => peso(y) - peso(x));
    grupos.push({ clase: "repetido", apuntes: orden, queda: orden[0].id, quitar: quitables(orden.slice(1)) });
    orden.forEach(a => usados.add(a.id));
  }

  // 2. "Posible X" que ya está confirmado como "X" el mismo día
  for (const p of eventos) {
    if (usados.has(p.id) || !info.get(p.id).tentativo) continue;
    const confirmado = eventos.find(c => c.id !== p.id && c.fecha === p.fecha
      && !info.get(c.id).tentativo && mismoTitulo(c.titulo, p.titulo));
    if (!confirmado) continue;
    grupos.push({ clase: "posible", apuntes: [confirmado, p], queda: confirmado.id, quitar: quitables([p]) });
    usados.add(p.id); usados.add(confirmado.id);
  }

  // 3. El mismo evento con un mes justo de diferencia. Cuál sobra sale de cómo se
  // equivocó la importación: los primeros días de un mes se leyeron en el mes ANTERIOR
  // (sobra el de antes) y los últimos, en el SIGUIENTE (sobra el de después). Por la
  // mitad del mes no hay regla, y entonces no se marca ninguno.
  for (const a of eventos) {
    if (usados.has(a.id)) continue;
    const siguiente = mesDeAlLado(a.fecha, 1);
    if (!siguiente) continue;
    const iso = aISO(siguiente);
    const b = eventos.find(x => !usados.has(x.id) && x.fecha === iso && mismoTitulo(x.titulo, a.titulo));
    if (!b) continue;
    const dia = aFecha(a.fecha).getDate();
    const sobra = dia <= 13 ? a : dia >= 22 ? b : null;
    grupos.push({ clase: "mes", apuntes: [a, b], queda: sobra ? (sobra === a ? b : a).id : null, quitar: sobra ? quitables([sobra]) : [] });
    usados.add(a.id); usados.add(b.id);
  }

  // 4. El mismo evento en días seguidos. Se enseña la pareja sin marcar ninguno: el día
  // bueno lo sabe quien lo mira. Ni producciones (rodajes de varios días) ni lo que ya
  // dura varios días (hasta). Un apunte que ya sale en otro grupo puede salir aquí
  // también —el 9 repetido Y además el 10—, pero emparejado con el que se queda, no con
  // el que ya va marcado para borrar.
  //
  // Y tampoco lo que es de varios días apuntado día a día: con los datos de verdad salían
  // un evento de empresa de cuatro días seguidos (tres parejas) y otro de dos con su
  // checklist cada día. Tres días o más seguidos son un evento largo, no un error de
  // fecha; y dos con trabajo dentro (checklist o personal) los montó alguien a propósito.
  const sobran = new Set(grupos.flatMap(g => g.quitar));
  const enDia = new Set();
  const deUnDia = (a) => a.tipo !== "produccion" && !a.hasta && !sobran.has(a.id) && !enDia.has(a.id);
  const diaMas = (iso, n) => { const f = aFecha(iso); return aISO(new Date(f.getFullYear(), f.getMonth(), f.getDate() + n)); };
  const hayIgual = (a, iso) => eventos.some(x => x.id !== a.id && x.fecha === iso && mismoEvento(a, x));
  for (const a of eventos) {
    if (!deUnDia(a)) continue;
    const b = eventos.find(x => deUnDia(x) && x.fecha === diaMas(a.fecha, 1) && mismoEvento(a, x));
    if (!b) continue;
    if ((conTrabajo(a) && conTrabajo(b)) || hayIgual(a, diaMas(a.fecha, -1)) || hayIgual(b, diaMas(b.fecha, 1))) continue;
    grupos.push({ clase: "dia", apuntes: [a, b], queda: null, quitar: [] });
    enDia.add(a.id); enDia.add(b.id);
  }

  return grupos.sort((x, y) => x.apuntes[0].fecha.localeCompare(y.apuntes[0].fecha));
}
