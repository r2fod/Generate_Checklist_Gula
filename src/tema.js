// ─── TEMA CLARO/OSCURO ────────────────────────────────────────────────────────
// El automático va por horario: oscuro de noche, claro de día. Las horas son las de la
// jornada de un catering — a las 20:00 ya se monta con luz artificial.
import { leerTexto } from "./almacen.js";

export const HORA_OSCURO = 20, HORA_CLARO = 7;
export function esHoraDeOscuro(ahora = new Date()) {
  const h = ahora.getHours();
  return h >= HORA_OSCURO || h < HORA_CLARO;
}
export function leerPreferenciaTema() {
  const g = leerTexto("gula_tema");
  return g === "claro" || g === "oscuro" || g === "auto" ? g : "auto";
}
export function temaSegunPreferencia(pref, ahora = new Date()) {
  if (pref === "claro" || pref === "oscuro") return pref;
  return esHoraDeOscuro(ahora) ? "oscuro" : "claro";
}

// El tema se pone en el <html> ANTES de montar React: si no, hay un fogonazo de blanco
// al arrancar de noche, y la pantalla de acceso (que va antes de la app) salía siempre
// en claro. Estaba copiada tal cual en los dos arranques —checklist y formulario—, que
// es justo la clase de duplicado que se queda a medias: se tocó una y la otra no.
export function aplicarTemaInicial(ahora = new Date()) {
  const tema = temaSegunPreferencia(leerPreferenciaTema(), ahora);
  document.documentElement.dataset.tema = tema;
  return tema;
}
