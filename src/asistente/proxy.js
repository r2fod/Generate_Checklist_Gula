// ─── DE DÓNDE SALE LA DIRECCIÓN DEL PROXY ─────────────────────────────────────
// La dirección del Worker no está en el código a propósito: el repositorio es público y
// una URL publicada ahí es un blanco fácil para golpearla hasta agotar la cuota diaria
// del equipo. Vive en Firestore, y quien la configura primero la deja puesta para todos.
//
// Este fichero es SOLO la decisión de qué hacer con lo que hay en cada sitio, sin React
// ni nube: entra lo de este navegador y lo del equipo, sale qué hacer. Existe porque la
// decisión tenía un agujero que no se veía hasta que ya habías perdido la dirección:
// la URL solo subía al TECLEARLA, así que quien la configuró antes de que existiera
// este reparto se la quedaba para él solo, y los demás se encontraban el campo vacío
// sin manera de saber cuál era. Pasó de verdad.

export function queHacerConLaUrl({ mia = "", equipo = "" } = {}) {
  const m = String(mia || "").trim();
  const e = String(equipo || "").trim();

  // La de este navegador manda: si alguien la ha puesto a mano para probar otro Worker,
  // no se le pisa con la del equipo.
  if (m && e) return { accion: "nada", url: m };

  // Este navegador la tiene y el equipo no: se sube. Este es el caso que faltaba.
  if (m && !e) return { accion: "subir", url: m };

  // El equipo la tiene y este navegador no: se baja y se guarda aquí.
  if (!m && e) return { accion: "bajar", url: e };

  // Nadie la tiene: hay que pedirla.
  return { accion: "pedir", url: "" };
}
