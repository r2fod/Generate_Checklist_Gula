// ─── LA ESTRATEGIA DE CAPTACIÓN ───────────────────────────────────────────────
// Lo que el equipo quiere conseguir de su captación y cómo, guardado para no
// repetirlo de memoria en cada conversación. El asistente la diseña (con lo que
// ve: webs, capturas, calendario) y la actualiza cuando cambia; la lee antes de
// proponer marketing para no contradecir lo acordado.
//
// Vive en `indice/marketing` (no en una colección nueva): es un ajuste de equipo
// como precios o ratios, y la regla de `indice/{doc}` ya lo cubre — no hay que
// tocar reglas ni emulador por esta.
//
// Sin React ni nube: entra lo que el modelo propone, sale la estrategia sana o
// null. El modelo puede proponer cualquier cosa; aquí se le pone forma.
import { hoyISO } from "../fecha.js";

const MAX_FASE = 500;
const MAX_ITEM = 80;
const textoCorto = (s, hasta = MAX_ITEM) => String(s || "").trim().slice(0, hasta);
const listaDe = (bruta, cuantos) =>
  Array.isArray(bruta) ? bruta.slice(0, cuantos).map((x) => textoCorto(x)).filter(Boolean) : [];

/**
 * @param {unknown} brutos
 * @returns {null | { canales: string[], contenido: string[], puertas: string[], fase: string, actualizada: string }}
 */
export function saneaEstrategia(brutos) {
  if (!brutos || typeof brutos !== "object") return null;
  const canales = listaDe(brutos.canales, 10);
  const contenido = listaDe(brutos.contenido, 20);
  const puertas = listaDe(brutos.puertas, 10);
  const fase = textoCorto(brutos.fase, MAX_FASE);
  // Los cuatro campos son la estrategia: sin uno, es un borrador, no una estrategia.
  if (!canales.length || !contenido.length || !puertas.length || !fase) return null;
  return { canales, contenido, puertas, fase, actualizada: hoyISO() };
}

// Cómo se cuenta en una frase, para el contexto del asistente.
/** @param {null | { canales: string[], contenido: string[], puertas: string[], fase: string, actualizada: string }} e @returns {string} */
export function estrategiaEnFrase(e) {
  if (!e) return "";
  return `Estrategia de captación guardada (actualizada ${e.actualizada}): canales ${e.canales.join(", ")}; contenido ${e.contenido.join("; ")}; puertas ${e.puertas.join(", ")}; fase: ${e.fase}`;
}
