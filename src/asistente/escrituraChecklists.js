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
    promover(elegidos);
    return {
      creadas: elegidos.map(a => a.titulo),
      aviso: "Creadas en el archivo con los datos del calendario (nombre, fecha, tipo). Les faltan los datos del formulario: pax, sitio, horas.",
    };
  };
}
