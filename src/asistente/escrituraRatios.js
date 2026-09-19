// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LOS RATIOS DE PERSONAL ───────────
// La traducción entre lo que devuelve la herramienta ({ que, datos }) y cómo se cambia
// un ratio de verdad. Igual que escrituraCalendario.js y por lo mismo: la herramienta
// no tiene por qué saber cómo se persiste un ratio, y este fichero no tiene por qué
// saber si hay nube o no — eso lo decide "guardar", que pone quien lo usa (en el
// calendario ya es la misma cambiarRatios() del panel; en la checklist, un equivalente).
import { leerRatios } from "../personal.js";

export function aplicarEnRatios({ guardar }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};
    if (que !== "aplicar_ratio") return null;   // no es mía: que la coja otro

    const antes = leerRatios()[datos.tipo];
    // Se manda el juego de ratios ENTERO, no solo el que cambia: "guardar" (como
    // cambiarRatios() del calendario) parte de los valores de fábrica y aplica lo que se
    // le pasa encima — mandar solo uno resetearía a los demás si alguien los había
    // ajustado antes. El mismo motivo por el que el panel del calendario manda su
    // formulario entero y no un campo suelto.
    guardar({ ...leerRatios(), [datos.tipo]: datos.paxPorCamarero });

    return { cambiado: datos.tipo, antes, ahora: datos.paxPorCamarero };
  };
}
