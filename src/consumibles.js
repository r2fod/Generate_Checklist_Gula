// ─── QUÉ VUELVE Y QUÉ SE GASTA ──────────────────────────────────────────────────
// Bug real, cazado por el dueño en producción: en Modo Carga → Vuelta, apuntar "0" en
// lo que ha vuelto de Hielo (se ha fundido/gastado entero, que es lo normal) hacía
// salir el chip "faltan 70 · apuntar como roturas" — como si esos 70 kg se hubieran
// roto. El hielo no se rompe: se consume. Lo mismo pasa con toda bebida, comida,
// combustible o desechable: que no vuelva NADA es el caso normal, no una pérdida.
//
// La cristalería, la vajilla, el mobiliario... sí son de verdad reutilizables: ahí que
// falte algo Sí suele ser una rotura o una pérdida, y el chip tiene sentido (ver el
// comentario de FilaCargaVuelta en ModalModoCarga.jsx, con el mismo criterio para los
// tercios de cerveza bebidos).
//
// Categorías donde TODO es fungible salvo la herramienta suelta que se cuela dentro
// (el tirador de cerveza no se bebe, el calentador de agua no se gasta).
const CATEGORIAS_CONSUMIBLES = new Set([
  "Bebidas", "Bebidas frías", "Alcoholes y licores", "Desechables y Bebidas",
]);
const HERRAMIENTAS_EN_CATEGORIA_CONSUMIBLE = [
  /^Tirador de cerveza$/, /^Calentador de agua$/, /^Kit té matcha$/,
];

// Sueltos fungibles dentro de categorías que por lo demás son material reutilizable
// (Café, Paella y fuego, Electricidad, Limpieza, Mantelería): el resto de la categoría
// es vajilla o herramienta de verdad, pero estos se gastan igual que una bebida.
const ITEMS_CONSUMIBLES = [
  /^Cápsulas café/, /^Café molido/, /^Infusiones/, /^Azucarillos/, /^Leches variadas/,
  /^Carbón$/, /^Leña$/, /^Pastillas de encender/, /^Bombonas llenas/, /^Garrafa gasolina/,
  /^Cinta aislante/, /^Bridas/, /^Imperdibles/,
  /^Fairy/, /^Estropajo/, /^Papel plata/, /^Film/, /^Papel Chemine/, /^Bolsas de basura/,
  // Servilletas de PAPEL: las de tela vuelven y se lavan, esas sí son reutilizables.
  /^Servilletas (grandes|cocktail)/,
  /^Vasos de (cartón|plástico)/, // de usar y tirar (café, refrescos) — no las de barra
  /^Bandejas de cartón blancas/, /^Blondas$/, /^Platitos de cartón/, /^Envase bocadillos/,
  /^Palitos (brocheta|café)/, /^Cacao$/, /^Canela$/, /^Leche condensada/,
  /^Bolsas grandes de papel/,
];

/**
 * ¿Este item se gasta (bebida, comida, combustible, desechable) en vez de volver?
 * Si es así, un "no ha vuelto nada" es lo esperado, no una rotura que sugerir.
 * @param {string} categoria @param {string} label @returns {boolean}
 */
export function esConsumible(categoria, label) {
  if (CATEGORIAS_CONSUMIBLES.has(categoria) && !HERRAMIENTAS_EN_CATEGORIA_CONSUMIBLE.some(re => re.test(label))) {
    return true;
  }
  return ITEMS_CONSUMIBLES.some(re => re.test(label));
}
