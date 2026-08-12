// ─── CATÁLOGO DE PRECIOS (para el coste estimado en Modo carga → Resumen) ──────
// Precio por unidad de cada item, guardado en este navegador y compartido entre
// TODOS los eventos (el precio de "Copas de vino" es el mismo en cualquier boda,
// no depende del evento) — se busca por el nombre exacto del item.
// Precios de partida sacados de "Resumen Eventos.xlsx" (coste unitario estimado,
// consistente en las ~24 hojas de eventos reales). Cualquier precio pegado en
// "💶 Precios" pisa al de aquí y queda guardado en el navegador.
const PRECIOS_BASE = {
  // Bebidas y hielo
  "Cerveza Alhambra (tercios)": 0.49, // caja de 24 a 11,76€
  "Vino blanco": 4.1,                 // Nebla blanco
  "Vino tinto": 5.22,                 // Nebla tinto
  "Cava": 3.99,                       // El Miracle
  "Agua 1,5L (Solán de Cabras, cliente)": 4.06, // pack de 6 a 0,68€/botella
  "Coca-Cola normal": 0.6,
  "Coca-Cola Zero": 0.58,
  "Fanta naranja": 0.54,
  "Fanta limón": 0.54,
  "Aquarius": 0.68,
  "Nestea": 0.74,
  "Tónica": 1.51,
  "Agua con gas": 1.18,
  "Cerveza 0,0": 0.95,
  "Redbull": 1.0,
  "Vermut rojo": 6.3,
  "Vermut blanco": 4.1,
  // Alcoholes y licores
  "Ginebra (Seagrams/Tanqueray)": 13.05,
  "Ginebra de sabor (Puerto de Indias)": 11.24,
  "Ron (Bacardí)": 14.85,
  "Ron saborizado (Negrita)": 8,
  "Tequila": 12.87,
  "Tequila Rosa": 6.7,
  "Vodka": 10.9, // Absolut
  "Baileys": 10.26,
  "Limoncello": 5.99,
  "Peche (licor de melocotón)": 5.99,
  "Cazalla": 8.45,
  "Orujo de hierbas": 7.8,
  "Ballantines": 9.25,
  "Barceló": 12.48,
  "Martini": 8.05,
  "Otros licores marca blanca (Smirnoff)": 11.15,
  // Bebidas que faltaban por precio — ESTIMADOS de mercado, ajustar con la tarifa real
  // del proveedor (Bebidas Serrano). Son un punto de partida para que el Resumen no deje
  // huecos; cualquier precio pegado en "Precios" pisa estos.
  "Sprite": 0.54,
  "Cerveza sin gluten": 0.95,
  "Tinto de verano (1,5L)": 2.5,
  "Aguas pequeñas (33cl)": 6.5,                    // caja de 35 uds
  "Agua Vidaqua 1,5L (personal)": 2.4,             // pack de 6
  "Agua 1,5L (extra: paella, lavar, personal)": 4, // pack de 6
  "Mistela": 5.5,
  "Tía María": 13,
  "Jagger (Jägermeister)": 15,
  "Crema de orujo": 7.8,
  "Crema de arroz": 6,
  // ─── Vajilla ────────────────────────────────────────────────────────────────
  // Todo este catálogo va SIN IVA, igual que las bebidas. Ojo con IKEA: publica sus
  // precios CON IVA (es venta a particular), así que hay que quitárselo antes de
  // apuntarlo aquí o el coste del evento sale un 21% inflado frente al resto.
  // STRIMMIG, plato de gres gris-verde claro de 27 cm: 16,99€ el paquete de 4 con IVA
  // → 4,25€/ud con IVA → 3,51€/ud sin IVA. Comprobado en ikea.es (agosto 2026).
  // La etiqueta lleva el estilo dentro porque el selector de platos lo cambia; el precio
  // va sobre el nombre completo, así que solo aplica al verde.
  "Platos trinchero (Verde)": 3.51,
  // STRIMMIG plato de postre, mismo gres gris-verde claro, 21 cm: 14,99€ el paquete de
  // 4 con IVA → 3,75€/ud con IVA → 3,10€/ud sin IVA.
  "Platos postre (Verde)": 3.10,
  // ─── Cristalería (Makro) ────────────────────────────────────────────────────
  // Makro es venta a profesional: sus precios YA vienen sin IVA, así que van tal cual,
  // sin dividir entre 1,21 como los de IKEA.
  //   Copa de vino Lena 53cl ... 9,78€ / 6 → 1,63€
  //   Vaso de cubata 50cl ...... 7,22€ / 6 → 1,20€
  //   Vaso de agua 36cl ........ 7,92€ / 6 → 1,32€
  // Van por duplicado con y sin "(doble)" porque el interruptor de doble servicio
  // cambia la ETIQUETA del item ("Copas de vino" → "Copas de vino (doble)"), y el
  // precio se busca por el nombre completo: sin las dos, el evento que más copas
  // gasta sería justo el que sale sin coste.
  "Copas de vino": 1.63,
  "Copas de vino (doble)": 1.63,
  "Vasos de agua": 1.32,
  "Vasos de agua (doble)": 1.32,
  "Vasos de cubata": 1.20,
  //   Copa de cava ............. 9,78€ / 6  → 1,63€
  //   Vaso de chupito cristal .. 12,88€ / 12 → 1,07€
  "Copas de cava": 1.63,
  "Vasos chupito cristal (entrante)": 1.07,
};
export function leerPrecios() {
  try { return { ...PRECIOS_BASE, ...JSON.parse(localStorage.getItem("gula_precios_items") || "{}") }; }
  catch (e) { return { ...PRECIOS_BASE }; }
}
export function guardarPrecios(precios) {
  try { localStorage.setItem("gula_precios_items", JSON.stringify(precios)); }
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
