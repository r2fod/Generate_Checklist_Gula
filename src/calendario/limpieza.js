// ─── LIMPIAR EL CALENDARIO ────────────────────────────────────────────────────
// El calendario se llenó a golpe de importaciones (la hoja de pared, pegar listas) y
// arrastra tres clases de sobras que a mano cuestan de encontrar:
//
//   · REPETIDOS — el mismo evento dos veces el mismo día con el título escrito un poco
//                 distinto ("Produ X" y "Produ X 73 PAX"): el id sale del título, así
//                 que para la app son dos apuntes y el día sale con un choque falso.
//   · POSIBLES  — "Posible Produ X" que ya está confirmado como "Produ X" ese mismo día.
//   · MES CRUZADO — el mismo evento con un mes justo de diferencia. La hoja de pared
//                 pinta al principio y al final de cada mes los días del mes de al lado,
//                 y la importación del 14/9 los leyó con el mes del bloque: el 1 de mayo
//                 acabó también en el 1 de abril.
//
// Aquí solo se SUGIERE: qué grupos hay y cuál de cada uno sobra probablemente. Borrar lo
// decide quien mira la lista (Limpiar.jsx), apunte a apunte. Nunca se sugiere borrar uno
// con trabajo dentro —checklist creada o personal asignado—: eso sí que no se recupera
// con volver a apuntarlo.
//
// Sin React ni navegador: entra la lista, salen los grupos. Se prueba con node.
import { aFecha, esTipoEvento } from "./apuntes.js";
import { sinTildes } from "../texto.js";

const TENTATIVO = /^(posibles?|provisional(es)?|tentativos?|a confirmar|por confirmar|sin confirmar)\s+/;

// Lo que importa de un título para saber si dos son el mismo evento: sin tildes, sin
// mayúsculas, sin signos, sin el número de gente ("73 PAX") y sin el "posible" delante.
export function nucleoDeTitulo(titulo) {
  let t = sinTildes(titulo).replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\b\d+\s*(pax|personas|invitados|comensales)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  const tentativo = TENTATIVO.test(t);
  if (tentativo) t = t.replace(TENTATIVO, "").trim();
  return { nucleo: t, tentativo };
}

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

  // 1. Repetidos: mismo día y mismo núcleo
  const porClave = new Map();
  for (const a of eventos) {
    const { nucleo, tentativo } = info.get(a.id);
    if (!nucleo) continue;
    const clave = `${a.fecha}|${tentativo ? "?" : ""}${nucleo}`;
    (porClave.get(clave) || porClave.set(clave, []).get(clave)).push(a);
  }
  for (const lista of porClave.values()) {
    if (lista.length < 2) continue;
    const orden = [...lista].sort((x, y) => peso(y) - peso(x));
    grupos.push({ clase: "repetido", apuntes: orden, queda: orden[0].id, quitar: quitables(orden.slice(1)) });
    orden.forEach(a => usados.add(a.id));
  }

  // 2. "Posible X" que ya está confirmado como "X" el mismo día
  for (const p of eventos) {
    if (usados.has(p.id) || !info.get(p.id).tentativo) continue;
    const confirmado = eventos.find(c => c.id !== p.id && c.fecha === p.fecha
      && !info.get(c.id).tentativo && info.get(c.id).nucleo === info.get(p.id).nucleo);
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
    const iso = `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, "0")}-${String(siguiente.getDate()).padStart(2, "0")}`;
    const b = eventos.find(x => !usados.has(x.id) && x.fecha === iso && info.get(x.id).nucleo === info.get(a.id).nucleo && info.get(a.id).nucleo);
    if (!b) continue;
    const dia = aFecha(a.fecha).getDate();
    const sobra = dia <= 13 ? a : dia >= 22 ? b : null;
    grupos.push({ clase: "mes", apuntes: [a, b], queda: sobra ? (sobra === a ? b : a).id : null, quitar: sobra ? quitables([sobra]) : [] });
    usados.add(a.id); usados.add(b.id);
  }

  return grupos.sort((x, y) => x.apuntes[0].fecha.localeCompare(y.apuntes[0].fecha));
}
