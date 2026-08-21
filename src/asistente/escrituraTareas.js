// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LAS TAREAS ───────────────────────
// La traducción entre lo que devuelve una herramienta ({ que, datos }) y lo que sabe
// hacer la lista de tareas. Igual que escrituraCalendario.js y por lo mismo: la
// herramienta no tiene por qué saber cómo se guarda una tarea.
//
// Se puede componer con otros aplicadores: cada app junta los suyos y lo que no sepa
// hacer se lo pasa al siguiente. Así añadir un sitio donde escribir no obliga a tocar
// los que ya había.
import { apuntarTarea, marcarTarea } from "./tareas.js";

export function aplicarEnTareas({ tareas = [], guardar }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};

    if (que === "apuntar_tarea") {
      const r = apuntarTarea(tareas, datos.texto, { evento: datos.evento });
      if (r.error) return { error: r.error };
      guardar(r.tareas);
      return r.yaEstaba
        ? { apuntado: r.tarea.texto, yaEstaba: true }
        : { apuntado: r.tarea.texto };
    }

    if (que === "marcar_tarea") {
      const antes = tareas.find(t => t.id === datos.id);
      if (!antes) return { error: "Esa tarea ya no está." };
      guardar(marcarTarea(tareas, datos.id, true));
      return { hecha: antes.texto };
    }

    return null;   // no es mía: que la coja otro
  };
}

// Encadena varios aplicadores. El primero que sepa hacer algo, lo hace; si ninguno sabe,
// se dice. Sin esto, cada app tendría un if gigante que crecería con cada herramienta
// nueva que escriba.
export function encadenar(...aplicadores) {
  return function aplicar(propuesta) {
    for (const a of aplicadores) {
      if (!a) continue;
      const r = a(propuesta);
      if (r) return r;
    }
    return { error: `Aquí no se puede hacer "${(propuesta || {}).que}".` };
  };
}
