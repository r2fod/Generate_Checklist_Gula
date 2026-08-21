// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN EL CALENDARIO ────────────────────
// La traducción entre lo que devuelve una herramienta ({ que, datos }) y lo que sabe
// hacer el calendario (guardar, borrar). Vive aparte de los dos a propósito: la
// herramienta no tiene por qué saber cómo se guarda un apunte, y el calendario no tiene
// por qué saber que existe un asistente.
//
// Todo pasa por saneaLista antes de guardarse, que es la misma puerta por la que entra
// lo que se escribe a mano. Un apunte del asistente no puede colarse por un camino con
// menos comprobaciones que el de una persona.
import { saneaLista, idDeApunte } from "../calendario/apuntes.js";

export function aplicarEnCalendario({ apuntes = [], guardar, borrar }) {
  return function aplicar(propuesta) {
    const { que, datos } = propuesta || {};

    if (que === "crear_apunte") {
      // El id NO es aleatorio: la identidad de un apunte es idDeApunte(fecha, título),
      // que es lo que hace que el mismo apunte traído dos veces sea uno. Poner un id al
      // azar lo rompería y el calendario acabaría con duplicados que parecen distintos.
      const [limpio] = saneaLista([{ ...datos, id: idDeApunte(datos.fecha, datos.titulo) }]);
      if (!limpio) return { error: "Ese apunte no ha pasado las comprobaciones: revisa la fecha y el tipo." };
      guardar(limpio);
      return { creado: limpio.titulo, fecha: limpio.fecha };
    }

    if (que === "editar_apunte") {
      const antes = apuntes.find(a => a.id === datos.id);
      if (!antes) return { error: "Ese apunte ya no está: alguien lo ha movido o borrado mientras tanto." };
      // Si cambia la fecha o el título, cambia la identidad. Se recalcula y se borra el
      // viejo: si no, quedarían los dos y el calendario enseñaría el evento dos veces.
      const fusionado = { ...antes, ...datos.cambios };
      const idNuevo = idDeApunte(fusionado.fecha, fusionado.titulo);
      const [limpio] = saneaLista([{ ...fusionado, id: idNuevo }]);
      if (!limpio) return { error: "El cambio deja el apunte inválido." };
      if (idNuevo !== antes.id) borrar(antes.id);
      guardar(limpio);
      return { editado: limpio.titulo };
    }

    if (que === "borrar_apunte") {
      const antes = apuntes.find(a => a.id === datos.id);
      if (!antes) return { error: "Ese apunte ya no está." };
      borrar(datos.id);
      return { borrado: antes.titulo };
    }

    return { error: `No sé hacer "${que}" en el calendario.` };
  };
}
