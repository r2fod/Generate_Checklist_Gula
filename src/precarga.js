// ─── HACER COSAS CUANDO SOBRA TIEMPO ──────────────────────────────────────────
// El asistente va en un chunk aparte (`React.lazy`), y eso está bien: quien no lo abre
// no se lo descarga. Pero quien SÍ lo abre paga la descarga entera en el peor momento
// posible —con el dedo ya en el botón, esperando— y encima muchas veces desde el móvil
// de un montaje, con la cobertura que hay en una finca.
//
// Esto lo adelanta al rato muerto: cuando el navegador no tiene nada que hacer, se trae
// el chunk. Si nunca hay rato muerto no se trae y no pasa nada: la carga perezosa sigue
// funcionando igual.
//
// Por qué un helper y no `requestIdleCallback` a pelo en cada sitio:
//   · Safari no lo tiene (hasta hace dos días), así que hace falta el respaldo con
//     setTimeout, y esa rama estaba a punto de escribirse dos veces.
//   · Hay que poder llamarlo desde un efecto que se ejecuta dos veces en StrictMode sin
//     que la precarga se dispare dos veces.
//   · En node (las pruebas) no hay ni window ni requestIdleCallback: tiene que no hacer
//     nada en vez de reventar.

const yaHechas = new Set();

// `clave` es para que llamar dos veces a lo mismo no lo haga dos veces (StrictMode monta
// los efectos dos veces a propósito). Devuelve una función para cancelar: si la persona
// se va de la página antes del rato muerto, no tiene sentido descargar nada.
export function alSobrarTiempo(tarea, { clave = "", espera = 2000 } = {}) {
  if (typeof tarea !== "function") return () => {};
  if (clave) {
    if (yaHechas.has(clave)) return () => {};
    yaHechas.add(clave);
  }
  const lanzar = () => { try { tarea(); } catch (e) { /* precargar es un extra: si falla, se cargará al abrirlo */ } };

  if (typeof requestIdleCallback === "function") {
    // `timeout` para que en una pestaña que nunca se queda quieta acabe pasando igual.
    const id = requestIdleCallback(lanzar, { timeout: espera });
    return () => { if (typeof cancelIdleCallback === "function") cancelIdleCallback(id); };
  }
  if (typeof setTimeout === "function") {
    const id = setTimeout(lanzar, espera);
    return () => clearTimeout(id);
  }
  return () => {};
}

// Solo para las pruebas: sin esto, la segunda comprobación que use la misma clave se
// encuentra con que "ya está hecha" y no mide nada.
export function olvidarPrecargas() {
  yaHechas.clear();
}
