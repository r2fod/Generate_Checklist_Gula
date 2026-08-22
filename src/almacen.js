// ─── EL ALMACÉN DEL NAVEGADOR ─────────────────────────────────────────────────
// `localStorage` no siempre está: en el modo privado de Safari escribir lanza, con las
// cookies de terceros bloqueadas ni siquiera se puede leer la propiedad, y en node —que
// es donde corren las pruebas— no existe. Por eso CADA uso iba envuelto en su try/catch,
// y había trece repartidos por la app, cada uno con su comentario y con su manera de
// decir "si no se puede, da igual".
//
// Trece copias de lo mismo tienen dos problemas: una se escribe mal y nadie lo ve (un
// `JSON.parse` sin catch tumba la app entera al arrancar, con la pantalla en blanco), y
// no hay dónde tocar si algún día esto tiene que ir a otro sitio.
//
// Lo que NO hace, a propósito: no cachea, no serializa fechas y no avisa por pantalla.
// Guardar es "mejor esfuerzo"; lo que no se puede perder va a Firestore, no aquí.
//
// `localStorage` se nombra dentro del try en cada llamada, no se guarda en una variable
// de módulo: en node las pruebas lo ponen y lo quitan (`globalThis.localStorage`) entre
// bloques, y una referencia cogida al importar se quedaría con la de antes.

// Devuelve `porDefecto` si no se puede leer o si no hay nada guardado.
export function leerTexto(clave, porDefecto = "") {
  try {
    const v = localStorage.getItem(clave);
    return v === null || v === undefined ? porDefecto : v;
  } catch (e) { return porDefecto; }
}

// Devuelve si se pudo guardar. Casi nadie mira el resultado, pero las conversaciones sí:
// cuando no cabe, tiran la mitad más vieja y reintentan.
export function guardarTexto(clave, valor) {
  try { localStorage.setItem(clave, String(valor)); return true; }
  catch (e) { return false; }
}

export function borrar(clave) {
  try { localStorage.removeItem(clave); return true; }
  catch (e) { return false; }
}

// El JSON roto se trata igual que el que no está: `porDefecto`. Un estado a medio
// escribir (pestaña cerrada a mitad de un setItem) no puede impedir abrir la app.
export function leerJSON(clave, porDefecto = null) {
  try {
    const v = localStorage.getItem(clave);
    if (v === null || v === undefined || v === "") return porDefecto;
    const dato = JSON.parse(v);
    return dato === null || dato === undefined ? porDefecto : dato;
  } catch (e) { return porDefecto; }
}

export function guardarJSON(clave, valor) {
  try { return guardarTexto(clave, JSON.stringify(valor)); }
  catch (e) { return false; } // referencias circulares: no debería pasar, pero no tumba nada
}
