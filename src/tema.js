// ─── TEMA CLARO/OSCURO ────────────────────────────────────────────────────────
// El automático va por horario: oscuro de noche, claro de día. Las horas son las de la
// jornada de un catering — a las 20:00 ya se monta con luz artificial.
export const HORA_OSCURO = 20, HORA_CLARO = 7;
export function esHoraDeOscuro(ahora = new Date()) {
  const h = ahora.getHours();
  return h >= HORA_OSCURO || h < HORA_CLARO;
}
export function leerPreferenciaTema() {
  try {
    const g = localStorage.getItem("gula_tema");
    if (g === "claro" || g === "oscuro" || g === "auto") return g;
  } catch (e) { /* localStorage no disponible */ }
  return "auto";
}
export function temaSegunPreferencia(pref, ahora = new Date()) {
  if (pref === "claro" || pref === "oscuro") return pref;
  return esHoraDeOscuro(ahora) ? "oscuro" : "claro";
}
