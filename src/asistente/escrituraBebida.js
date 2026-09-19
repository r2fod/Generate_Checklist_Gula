// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LOS FACTORES DE BEBIDA ───────────
// La traducción entre lo que devuelve la herramienta ({ que, datos }) y cómo se cambia
// un factor de verdad. Mismo patrón que escrituraRatios.js: la herramienta no sabe cómo
// se persiste, "guardar" lo decide quien lo usa (en la checklist ya es la misma
// handleCambiarBebida del panel de Modo carga).
import { leerFactores } from "../bebida.js";

export function aplicarEnBebida({ guardar }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};
    if (que !== "aplicar_factor_bebida") return null;   // no es mía: que la coja otro

    // Los factores se guardan esparcidos (solo lo tocado; lo demás vale 1), así que aquí
    // no hace falta "el resto del juego" como en los ratios de personal — pero SÍ hace
    // falta conservar los otros factores YA tocados de este mismo tipo de evento, o un
    // segundo ajuste (p. ej. la cerveza después del vino) borraría el primero.
    const actuales = leerFactores();
    const filaDelTipo = actuales[datos.tipo] || {};
    guardar({ ...actuales, [datos.tipo]: { ...filaDelTipo, [datos.bebida]: datos.factor } });

    return { cambiado: `${datos.bebida} en ${datos.tipo}`, ahora: datos.factor };
  };
}
