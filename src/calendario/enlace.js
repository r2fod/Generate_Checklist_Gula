// ─── LOS DOS ENLACES DEL CALENDARIO ───────────────────────────────────────────
// El calendario se comparte de dos maneras y son dos cosas distintas de verdad, no dos
// botones que hacen lo mismo:
//
//   · VER   — para el equipo y para quien solo necesita mirar. Abre una COPIA del
//             calendario en un documento aparte. Aunque quien lo tenga se ponga a
//             trastear, no puede tocar el calendario de verdad: son dos documentos
//             distintos y el suyo no se lee nunca de vuelta.
//   · EDITAR— para quien apunta cosas sin tener cuenta del equipo (la oficina). Abre el
//             calendario de verdad, con permiso de escritura.
//
// El "permiso" es el propio código del enlace: en Firestore quien conoce el nombre del
// documento puede abrirlo, y no hay forma de retirárselo a alguien sin cambiar el
// código —lo que deja fuera también a todos los demás—. Por eso los dos códigos viven
// en indice/, que solo se lee con sesión iniciada: el que tiene el enlace de ver no
// puede llegar desde ahí al de editar.
//
// Este archivo no toca Firestore ni el navegador por su cuenta: recibe la dirección y
// devuelve texto. Así se puede probar entero sin levantar nada.

export const MODOS = { EQUIPO: "equipo", EDICION: "edicion", LECTURA: "lectura" };

// El parámetro del enlace editable y el del de solo ver. Cortos porque el enlace se
// manda por WhatsApp y se lee de un vistazo.
const PARAM_EDICION = "cal";
const PARAM_LECTURA = "ver";

// ¿Con qué código y en qué modo se ha entrado? Sin ninguno de los dos parámetros es el
// equipo entrando por la puerta normal, que pasa por login y resuelve su código solo.
export function enlaceDeLaUrl(busqueda = "") {
  let p;
  try { p = new URLSearchParams(busqueda); } catch (e) { return null; }
  const editar = (p.get(PARAM_EDICION) || "").trim();
  if (editar) return { modo: MODOS.EDICION, codigo: editar };
  const ver = (p.get(PARAM_LECTURA) || "").trim();
  if (ver) return { modo: MODOS.LECTURA, codigo: ver };
  return null;
}

// La dirección de la app del calendario, salga de donde salga. Se llama desde la app
// suelta (/calendario/) y desde la pantalla de dentro de la checklist (/checklist/),
// y el enlace que se copia tiene que llevar a la del calendario en los dos casos.
export function direccionDelCalendario(href) {
  let u;
  try { u = new URL(href); } catch (e) { return ""; }
  // Fuera el archivo: de ".../checklist/index.html" queda ".../checklist/"
  let ruta = u.pathname.replace(/[^/]*$/, "");
  if (/\/(checklist|formulario|pruebas)\/$/.test(ruta)) {
    ruta = ruta.replace(/\/(checklist|formulario|pruebas)\/$/, "/calendario/");
  } else if (!ruta.endsWith("/calendario/")) {
    ruta = `${ruta.endsWith("/") ? ruta : `${ruta}/`}calendario/`;
  }
  return `${u.origin}${ruta}`;
}

// Lo que se ENSEÑA del enlace, que no es lo mismo que lo que se copia.
//
// El enlace entero mide unos 70 caracteres y no cabe en un móvil: a 320px se veía
// "https://r2fod.github.io/Generate_Ch…" y nada más — o sea justo la parte que es
// IDÉNTICA en los dos. Ninguna pista de cuál estabas a punto de pegar en el grupo, y
// mandar el editable creyendo que mandabas el de mirar no tiene vuelta atrás: ese enlace
// no se le puede quitar a una persona sin invalidárselo a todas.
//
// Recortado por el final cabe en una línea y se lee lo único que los distingue: ?ver= o
// ?cal=. Se copia y se abre SIEMPRE el entero; esto es solo la etiqueta.
export function enlaceCorto(url) {
  let u;
  try { u = new URL(url); } catch (e) { return String(url || ""); }
  const partes = u.pathname.split("/").filter(Boolean);
  const ultima = partes.length ? partes[partes.length - 1] : "";
  return `…/${ultima}/${u.search}`;
}

// Los dos enlaces listos para copiar. Sin códigos no hay enlaces: mejor no enseñar nada
// que dar uno que no abre.
export function enlacesDeCalendario(href, codigos) {
  const base = direccionDelCalendario(href);
  if (!base || !codigos || !codigos.codigo || !codigos.ver) return null;
  return {
    ver: `${base}?${PARAM_LECTURA}=${encodeURIComponent(codigos.ver)}`,
    editar: `${base}?${PARAM_EDICION}=${encodeURIComponent(codigos.codigo)}`,
  };
}
