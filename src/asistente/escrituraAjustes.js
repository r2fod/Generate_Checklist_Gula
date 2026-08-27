// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LOS AJUSTES MEDIDOS ───────────────
// La traducción entre lo que devuelve la herramienta ({ que, datos }) y lo que los
// paneles ya saben hacer: los MISMOS ponFactores + subida a la nube que usa quien
// pulsa el botón "medido" en los paneles de Bebida, Hielo y Comida. La herramienta no
// tiene por qué saber cómo se guarda un ajuste, y la aplicación pasa por la misma
// puerta que cuando lo hace una persona desde el panel: una sola vía, un solo
// comportamiento.
//
// Se compone con los demás aplicadores con encadenar() (ver escrituraTareas.js):
// lo que no sepa hacer se lo pasa al siguiente.
export function aplicarEnAjustes({ aplicarBebida, aplicarHielo, aplicarComida }) {
  return function aplicar(propuesta) {
    const { que, datos = {} } = propuesta || {};
    if (que !== "aplicar_calibracion") return null;   // no es mía: que la coja otro
    const { area, tipo, clave = "", factor } = datos;
    if (area === "bebida" && aplicarBebida) return aplicarBebida(tipo, clave, factor);
    if (area === "hielo" && aplicarHielo) return aplicarHielo(tipo, factor);
    if (area === "comida" && aplicarComida) return aplicarComida(tipo, clave, factor);
    return { error: `Aquí no se puede ajustar "${area}".` };
  };
}
