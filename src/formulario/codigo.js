// ─── EL CÓDIGO DEL BUZÓN ──────────────────────────────────────────────────────
// El formulario no sabe a quién mandar los datos si no lleva código: viene en el
// enlace que da logística (?enviar=<código>) y este navegador lo recuerda para que el
// icono de la pantalla de inicio abra el formulario correcto sin buscar el WhatsApp.
//
// Y ahí estaba el fallo que dejaba el iPhone con "Falta el enlace" después de hacer
// todos los pasos bien: en iOS, una app añadida a la pantalla de inicio NO comparte lo
// guardado con el navegador desde el que se añadió. Estrena su propio almacén, vacío.
// Así que el código guardado en Chrome o en Safari no existe dentro de la app, y como
// el manifiesto mandaba abrir "/formulario/" a secas —sin código en la dirección—, la
// app abría sin saber a qué buzón mandar. En Android no pasaba porque allí la app
// instalada sí comparte el almacén del navegador, y por eso parecía que funcionaba.
//
// Se arregla por los dos lados: el código viaja SIEMPRE en la dirección (para que lo
// que el móvil guarda al añadir a la pantalla de inicio ya lo lleve dentro), y además
// se puede pegar el enlace a mano si alguien se queda fuera igualmente.

const CLAVE = "gula_formulario_codigo";

export function leerGuardado(almacen) {
  try { return (almacen && almacen.getItem(CLAVE)) || ""; } catch (e) { return ""; }
}

export function guardar(almacen, codigo) {
  try { almacen && almacen.setItem(CLAVE, codigo); } catch (e) { /* en privado no se guarda, da igual */ }
}

// Saca el código de lo que sea que hayan pegado: el enlace entero, el enlace con más
// parámetros detrás, o el código a pelo. Se acepta todo porque quien está pegando esto
// ya viene de un problema y no es momento de exigirle un formato.
export function codigoDeTexto(texto) {
  const t = String(texto || "").trim();
  if (!t) return "";
  const enElEnlace = t.match(/[?&]enviar=([^&#\s]+)/i);
  if (enElEnlace) {
    try { return decodeURIComponent(enElEnlace[1]).trim(); } catch (e) { return enElEnlace[1].trim(); }
  }
  // Un código suelto: letras y números, sin espacios ni barras. Si lleva pinta de
  // enlace pero no trae ?enviar=, es que han pegado el enlace equivocado.
  if (/[/\s]/.test(t)) return "";
  return /^[\w-]{3,60}$/.test(t) ? t : "";
}

// La dirección que debería tener la página para que, al añadirla a la pantalla de
// inicio, el móvil se guarde el código dentro. Devuelve null si ya está bien.
export function direccionConCodigo(href, codigo) {
  if (!codigo) return null;
  try {
    const u = new URL(href);
    if (u.searchParams.get("enviar") === codigo) return null;
    u.searchParams.set("enviar", codigo);
    return u.toString();
  } catch (e) {
    return null;
  }
}
