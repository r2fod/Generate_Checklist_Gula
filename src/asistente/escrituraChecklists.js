// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN EL ARCHIVO DE EVENTOS ────────────
// La traducción entre lo que devuelve la herramienta y lo que sabe hacer la app.
// Igual que escrituraCalendario.js y escrituraTareas.js, y por lo mismo: la herramienta
// no tiene por qué saber cómo se crea una checklist ni que hay que marcar el apunte
// después.
//
// Devuelve null cuando la operación no es suya, para poder encadenarlo con los otros.
export function aplicarEnChecklists({ apuntes = [], promover }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};
    if (que !== "crear_checklists") return null;

    const elegidos = apuntes.filter(a => (datos.ids || []).includes(a.id));
    if (!elegidos.length) return { error: "Esos apuntes ya no están en el calendario." };

    // promover() es asíncrona (escribe en la nube para marcar el apunte), pero la
    // herramienta contesta ya: el modelo no puede quedarse esperando a una escritura, y
    // lo que importa —las checklists— se crea en el mismo momento. Si el marcado falla
    // por conexión, se rehace solo al siguiente arranque.
    //
    // { dias: Infinity }: promover() vuelve a filtrar por "próximo" con la misma
    // función que usa el arranque automático (14 días por defecto) — bien para el
    // arranque, que mira TODOS los apuntes y decide él solo cuáles tocan, pero mal
    // aquí: aquí ya se ha elegido a mano, por id, exactamente cuáles crear (puede que
    // el asistente los haya buscado a propósito con dias más grande, o por nombre con
    // "cuales"), y sin este bypass ese segundo filtro los descartaba en silencio si
    // caían más allá de los 14 días — el bug real que vio el dueño: pidió crear 5
    // bodas de dentro de 19-26 días, el asistente dijo "Hecho" y no se creó ninguna.
    promover(elegidos, { dias: Infinity });
    return {
      creadas: elegidos.map(a => a.titulo),
      aviso: "Creadas en el archivo con los datos del calendario (nombre, fecha, tipo). Les faltan los datos del formulario: pax, sitio, horas.",
    };
  };
}
