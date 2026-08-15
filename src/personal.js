// ─── CUÁNTA GENTE HACE FALTA EN UN EVENTO ─────────────────────────────────────
// Sala, cocina y logística a partir del tipo y de los comensales.
//
// Los números NO salen de los manuales del sector: salen de contar el personal que se
// puso de verdad en 19 eventos de la hoja de costes. Los del sector se quedaban cortos
// para cómo se trabaja aquí, y quedarse corto no es solo poner menos gente: de la cifra
// de sala salen también los delantales, las bandejas, los litos y los menús de personal.
//
// Vive aparte de checklist-generadores.js porque lo usan DOS sitios: la checklist (que
// provisiona material para esa gente) y el calendario, que enseña con semanas de
// antelación cuánta gente hace falta cada día y cuánta hay disponible.

// Pax por camarero, medido:
//   boda/comunión   9,0 · 7,1 · 9,0 · 6,7 · 8,7  → 1 cada 9
//   corporativo    11,5 · 7,2 · 5,0 · 10,7       → 1 cada 10
// Cumpleaños y producción grande NO tienen medición propia: se quedan donde estaban y
// se marcan aquí para no dar por bueno un número que nadie ha comprobado.
export const PAX_POR_CAMARERO = {
  boda: 9,
  comunion: 9,
  corporativo: 10,
  cumpleanos: 20,   // sin medir
  produccion: 20,   // sin medir por encima de 30 pax
};

export const SIN_MEDIR = ["cumpleanos", "produccion"];

// Cocina, por tramos. Medido: 2 hasta 40 pax, 3 hasta 60, 4-5 de 100 en adelante.
// Por tramos y no con una división porque los saltos reales no son proporcionales: de
// 26 a 40 pax siempre fueron 2, y de 100 a 150 siempre 4 o 5.
export function cocinaNecesaria(pax) {
  if (pax <= 0) return 0;
  if (pax <= 40) return 2;
  if (pax <= 60) return 3;
  if (pax <= 120) return 4;
  return 5;
}

// Logística es el número más estable de toda la hoja: 2 personas en casi todo, sea de
// 40 o de 150 pax, y 1 en lo pequeño. No escala con los comensales porque no depende de
// ellos, sino del camión: cargarlo y descargarlo cuesta lo mismo con 60 que con 140.
export function logisticaNecesaria(pax) {
  if (pax <= 0) return 0;
  return pax <= 30 ? 1 : 2;
}

// Sala. Un banquete nunca sale con menos de dos personas.
export function salaNecesaria(tipo, pax, paxPorCamarero = 0) {
  if (pax <= 0) return 0;
  const divisor = paxPorCamarero > 0 ? paxPorCamarero : (PAX_POR_CAMARERO[tipo] || 9);
  return Math.max(2, Math.ceil(pax / divisor));
}

// Todo junto, que es como se enseña en el calendario.
export function personalNecesario(tipo, pax, paxPorCamarero = 0) {
  const sala = salaNecesaria(tipo, pax, paxPorCamarero);
  const cocina = cocinaNecesaria(pax);
  const logistica = logisticaNecesaria(pax);
  return { sala, cocina, logistica, total: sala + cocina + logistica, sinMedir: SIN_MEDIR.includes(tipo) };
}
