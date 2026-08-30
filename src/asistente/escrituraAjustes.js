// ─── APLICAR LO QUE PROPONE EL ASISTENTE, EN LOS AJUSTES ──────────────────────
// La traducción entre lo que devuelve la herramienta ({ que, datos }) y lo que los
// paneles ya saben hacer: los MISMOS guardados que usa quien lo hace a mano —los
// factores, la estrategia—. La herramienta no tiene por qué saber cómo se guarda un
// ajuste, y si escribe algo, lo hace por la misma puerta que la persona.
//
// Se compone con los demás aplicadores con encadenar() (ver escrituraTareas.js):
// lo que no sepa hacer se lo pasa al siguiente.
export function aplicarEnAjustes({ aplicarBebida, aplicarHielo, aplicarComida, aplicarEstrategia }) {
  return function aplicar(propuesta) {
    const { que, datos = {} } = propuesta || {};

    if (que === "aplicar_calibracion") {
      const { area, tipo, clave = "", factor } = datos;
      if (area === "bebida" && aplicarBebida) return aplicarBebida(tipo, clave, factor);
      if (area === "hielo" && aplicarHielo) return aplicarHielo(tipo, factor);
      if (area === "comida" && aplicarComida) return aplicarComida(tipo, clave, factor);
      return { error: `Aquí no se puede ajustar "${area}".` };
    }

    if (que === "guardar_estrategia") {
      // El saneado (y el "no tiene forma de estrategia") lo hace el guardado de la
      // app, que es el mismo que el del panel: una sola puerta, un solo resultado.
      if (aplicarEstrategia) return aplicarEstrategia(datos);
      return null;   // no hay guardado de estrategia en esta pantalla: que se lo diga la cadena
    }

    return null;   // no es mía: que la coja otro
  };
}
