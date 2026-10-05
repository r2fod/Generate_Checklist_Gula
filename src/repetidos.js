// ─── EVENTOS REPETIDOS EN EL ARCHIVO ──────────────────────────────────────────
// El mismo evento acababa guardado dos y tres veces por caminos distintos, y la oficina
// lo veía repetido en el formulario ("Veo duplicados eventos, revisa bien qué pasa", el
// dueño). Pasa así:
//
//   1. El calendario crea la checklist en blanco con el título de la hoja de pared:
//      "BODA FULANITA Y MENGANO EN LA FINCA?".
//   2. La oficina no la reconoce en la lista, elige "Es un evento nuevo" y escribe
//      "Boda Fulanita y Mengano".
//   3. Al aplicar el envío, la app CREA un evento con ese nombre, y ya hay dos.
//
// Aquí se decide qué dos eventos del archivo parecen el mismo, para tres cosas: ofrecer
// el que ya hay al aplicar un envío nuevo (App.jsx), no enseñar a la oficina la checklist
// en blanco que ya tiene gemela con datos (resumirParaOficina) y marcar los repetidos en
// "Eventos guardados" para borrar el que sobre a mano. Nunca se borra nada solo.
//
// Sin React ni navegador: entra el archivo, sale la respuesta. Se prueba con node.
import { nucleoDeTitulo } from "./texto.js";

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function diasEntre(a, b) {
  if (!SOLO_FECHA.test(a || "") || !SOLO_FECHA.test(b || "")) return Infinity;
  const ms = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round(Math.abs(ms(a) - ms(b)) / 86400000);
}

// ¿Dicen lo mismo dos títulos? Iguales sin tildes, mayúsculas, signos ni la gente, o uno
// dentro del otro por palabras enteras ("Boda Fulanita y Mengano" dentro de "BODA
// FULANITA Y MENGANO EN LA FINCA?"). El corto necesita dos palabras por lo menos: "Boda"
// a secas estaría dentro de todas las bodas.
export function mismoTitulo(a, b) {
  const x = nucleoDeTitulo(a).nucleo, y = nucleoDeTitulo(b).nucleo;
  if (!x || !y) return false;
  if (x === y) return true;
  const [corto, largo] = x.length <= y.length ? [x, y] : [y, x];
  return corto.split(" ").length >= 2 && ` ${largo} `.includes(` ${corto} `);
}

// Dos eventos del archivo que parecen el mismo: mismo tipo, mismo título y como mucho un
// día de diferencia (la hoja y la oficina no siempre apuntan el mismo día; ver más abajo
// por qué entonces no se esconde ninguno).
export function parecenElMismo(nombreA, a, nombreB, b) {
  if (!a || !b || nombreA === nombreB) return false;
  if ((a.evento || "boda") !== (b.evento || "boda")) return false;
  return diasEntre(a.fechaEvento, b.fechaEvento) <= 1 && mismoTitulo(nombreA, nombreB);
}

// Para cada evento, con cuáles parece repetido. Es la marca de "Eventos guardados".
export function repetidosDe(eventos = {}) {
  const lista = Object.entries(eventos || {});
  const otros = new Map();
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const [na, a] = lista[i], [nb, b] = lista[j];
      if (!parecenElMismo(na, a, nb, b)) continue;
      otros.set(na, [...(otros.get(na) || []), nb]);
      otros.set(nb, [...(otros.get(nb) || []), na]);
    }
  }
  return otros;
}

// Para un evento que llega NUEVO del formulario: el que ya está en el archivo y parece
// el mismo, o null. Primero el del mismo día; y entre esos, el que ya tiene datos antes
// que el que creó el calendario en blanco: lo que manda la oficina va junto a lo que ya
// mandó, no repartido en dos.
export function eventoParecido(eventos, nombre, estado) {
  const fecha = estado?.fechaEvento;
  const candidatos = Object.entries(eventos || {}).filter(([n, e]) => parecenElMismo(nombre, estado, n, e));
  candidatos.sort(([, a], [, b]) => (diasEntre(a.fechaEvento, fecha) - diasEntre(b.fechaEvento, fecha))
    || ((a.sinConfigurar ? 1 : 0) - (b.sinConfigurar ? 1 : 0)));
  return candidatos.length ? candidatos[0][0] : null;
}

// Una checklist en blanco (la del calendario) que ya tiene ese MISMO día una gemela con
// datos: a la oficina le sobra, porque si la elige los datos van a la de en blanco y
// quedan dos a medias. Con un día de diferencia no se esconde: ahí no se sabe cuál es la
// fecha buena, y elegir tiene que poder elegirse.
export function blancaConGemela(nombre, evento, eventos) {
  if (!evento?.sinConfigurar) return false;
  return Object.entries(eventos || {}).some(([n, e]) => !e?.sinConfigurar
    && e?.fechaEvento === evento.fechaEvento && parecenElMismo(nombre, evento, n, e));
}
