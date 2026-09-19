// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LA CRISTALERÍA ───────────────────
// Igual que escrituraBebida.js pero más simple: los factores de cristalería no van
// por tipo de evento, así que no hay fila que conservar — es un mapa plano.
import { leerFactoresCristaleria } from "../cristaleria.js";

export function aplicarEnCristaleria({ guardar }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};
    if (que !== "aplicar_factor_cristaleria") return null;   // no es mía: que la coja otro

    guardar({ ...leerFactoresCristaleria(), [datos.clave]: datos.factor });

    return { cambiado: datos.clave, ahora: datos.factor };
  };
}
