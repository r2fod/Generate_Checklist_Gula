// ─── CATÁLOGO DE PRECIOS (para el coste estimado en Modo carga → Resumen) ──────
// Precio por unidad de cada item, compartido entre TODOS los eventos (el precio de
// "Copas de vino" es el mismo en cualquier boda, no depende del evento) — se busca por
// el nombre exacto del item.
//
// Vive SOLO en Firestore. Antes había un catálogo de 53 precios de partida escrito
// aquí mismo (sacados de "Resumen Eventos.xlsx"), pero el repositorio es público y un
// catálogo de precios de compra revela el margen del negocio a cualquiera que lo mire.
// Se subieron los 53 a la nube una vez desde la pantalla de 💶 Precios y se quitaron de
// aquí: la nube es ahora la ÚNICA fuente, no hay copia de respaldo en el código.
//
// La lectura sigue siendo SÍNCRONA (se dibuja con ella), así que el navegador guarda
// una copia local en localStorage y la nube la refresca por detrás. Lo que esto cuesta,
// y hay que saberlo: un navegador que nunca se ha conectado se queda sin precios (el
// Resumen calcula a 0) hasta la primera vez que lo haga con sesión iniciada.
const CLAVE = "gula_precios_items";

// Un texto o un NaN pegado a mano no es un precio: no se guarda ni se sube.
function saneaPrecios(precios = {}) {
  const limpio = {};
  Object.entries(precios).forEach(([nombre, valor]) => {
    if (typeof valor === "number" && isFinite(valor)) limpio[nombre] = valor;
  });
  return limpio;
}

// Mete los precios que vienen de la nube en este navegador, sin perder lo de aquí que
// todavía no haya subido. Gana lo de la nube: es lo que ha decidido el equipo.
export function fusionarPreciosNube(remotos = {}) {
  if (!remotos || typeof remotos !== "object") return leerPrecios();
  guardarPrecios({ ...leerPrecios(), ...remotos });
  return leerPrecios();
}

export function leerPrecios() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); }
  catch (e) { return {}; }
}
export function guardarPrecios(precios) {
  try { localStorage.setItem(CLAVE, JSON.stringify(saneaPrecios(precios))); }
  catch (e) { /* localStorage no disponible */ }
}
// Pega líneas "Item: 1,50" o "Item 1.50" (mismo formato que "Añadir varios items") y
// las fusiona con el catálogo existente sin perder precios que no se han vuelto a pegar
export function parsePreciosPegados(texto) {
  const precios = {};
  texto.split("\n").map(l => l.trim()).filter(Boolean).forEach(linea => {
    const m = linea.match(/^(.*\S)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*€?\s*$/) || linea.match(/^(.*\S)\s{2,}(\d+(?:[.,]\d+)?)\s*€?\s*$/);
    if (m) precios[m[1].trim()] = parseFloat(m[2].replace(",", "."));
  });
  return precios;
}
