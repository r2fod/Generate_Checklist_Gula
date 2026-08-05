// ─── SANEAR EL ESTADO QUE ENTRA ───────────────────────────────────────────────
// El estado de un evento llega de tres sitios que no controlamos del todo: lo guardado
// en este navegador, un enlace ?c= (que puede venir manipulado o de una versión vieja)
// y la nube. Si un campo llega con el tipo equivocado —una lista que es un texto, un
// mapa que es un número— la app revienta al dibujar. Y como el estado se guarda, al
// recargar vuelve a reventar: se queda uno fuera sin salida.
//
// Pasó de verdad: un ?c= con recogidas: "esto no es una lista" tumbaba la app entera.
// La red de seguridad (RedDeSeguridad.jsx) da salida cuando ocurre, pero es mejor que
// no ocurra: aquí se descarta lo que no encaja y se sigue con el resto.
//
// No se inventa nada ni se corrige el contenido: solo se tira lo que tiene el tipo
// equivocado, que es preferible a arrastrar un dato que hará estallar otra cosa más
// adelante. Lo que no está en estas listas se deja tal cual — campos nuevos de
// versiones futuras no deben perderse por pasar por aquí.

// Campos que la app RECORRE como lista (.map, .filter, .forEach). Si no son un array,
// tumban la pantalla en cuanto se dibuja.
const LISTAS = [
  "diasProduccion", "recogidas", "compras", "itemsManuales",
  "ordenCategorias", "logisticaEquipo",
];

// Campos que la app usa como mapa de "clave → valor" (los checks, las cantidades
// editadas, los cronómetros...). Un array o un número aquí también rompe.
const MAPAS = [
  "cronos", "categoriasRenombradas", "overridesManuales", "itemsOcultos",
  "nombresManuales", "preparados", "marcasRevisar", "checkeados",
  "valoresCalculados", "vueltos", "roturas", "notasCheck", "itemsAlquilerManual",
];

const esLista = (v) => Array.isArray(v);
const esMapa = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function sanearEstado(estado) {
  if (estado === null || typeof estado !== "object" || Array.isArray(estado)) return {};
  const limpio = { ...estado };
  const tirados = [];
  for (const k of LISTAS) {
    if (k in limpio && !esLista(limpio[k])) { delete limpio[k]; tirados.push(k); }
  }
  for (const k of MAPAS) {
    if (k in limpio && !esMapa(limpio[k])) { delete limpio[k]; tirados.push(k); }
  }
  // Se deja constancia: si alguien mira la consola, sabe qué venía mal y no se pregunta
  // por qué su evento ha perdido las recogidas.
  if (tirados.length) {
    console.warn("Estado con campos de tipo equivocado, se ignoran:", tirados.join(", "));
  }
  return limpio;
}

// Para saber, en las pruebas y desde fuera, qué campos vigila esto
export const CAMPOS_VIGILADOS = { LISTAS, MAPAS };

// ─── QUÉ CANTIDAD HA CAMBIADO, Y DE CUÁNTO A CUÁNTO ───────────────────────────
// Cuando alguien cambia una cantidad desde la oficina, quien está cargando el camión
// tiene que enterarse. El aviso decía "Cantidades editadas a mano (modificado)": ni
// qué item, ni de cuánto a cuánto. Para alguien con el móvil en una mano y una caja
// en la otra, eso no es un aviso, es ruido.
//
// Las claves son "categoría::etiqueta". Se enseña solo la etiqueta: la categoría ya
// se ve al llegar a la fila, y el aviso tiene que caber en una línea de móvil.
const soloEtiqueta = (clave) => {
  const corte = String(clave).indexOf("::");
  return corte === -1 ? String(clave) : String(clave).slice(corte + 2);
};

// "auto" es una cantidad que vuelve a calcularse sola: quitar el número escrito a mano
// no es dejarlo en blanco, es devolverlo a lo que dice la checklist.
const AUTO = "auto";

export function cambiosDeCantidad(antes, despues) {
  const a = esMapa(antes) ? antes : {};
  const b = esMapa(despues) ? despues : {};
  const cambios = [];
  for (const clave of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[clave], vb = b[clave];
    if (String(va ?? "") === String(vb ?? "")) continue;
    const de = va === undefined || va === "" ? AUTO : va;
    const to = vb === undefined || vb === "" ? AUTO : vb;
    cambios.push(`${soloEtiqueta(clave)}: ${de} → ${to}`);
  }
  return cambios.sort();
}
