// ─── TRAER APUNTES POR ENLACE ─────────────────────────────────────────────────
// Para meter de golpe lo que había en otro sitio (la hoja de pared, otro calendario) sin
// que nadie tenga que copiar y pegar a mano.
//
// Los apuntes viajan en el FRAGMENTO de la dirección —lo que va detrás de "#"—, no en la
// parte de la consulta ("?"). La diferencia importa: el navegador nunca manda el
// fragmento al servidor. Y sobre todo, NO van dentro del código: los nombres de clientes
// y las vacaciones del equipo son datos de personas, y tanto el repositorio como lo
// publicado en GitHub Pages son públicos. Aquí solo vive el mecanismo, vacío.
//
// El enlace se genera una vez, se abre una vez, y no queda rastro en ninguna parte que
// se publique.
import { saneaLista } from "./apuntes.js";

const MARCA = "#traer=";

// Base64 "URL-safe": +/ y = se comen los enlaces al copiarlos por WhatsApp, así que se
// cambian por -_ y se quita el relleno.
const aUrlSafe = (s) => s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deUrlSafe = (s) => {
  const base = s.replace(/-/g, "+").replace(/_/g, "/");
  return base + "=".repeat((4 - (base.length % 4)) % 4);
};

// TextEncoder y no btoa a secas: btoa revienta con cualquier carácter por encima de
// 255, y aquí hay tildes y eñes en casi todos los títulos.
export function codificaApuntes(lista) {
  const bytes = new TextEncoder().encode(JSON.stringify(lista));
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return aUrlSafe(btoa(bin));
}

export function descodificaApuntes(txt) {
  try {
    const bin = atob(deUrlSafe(txt));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return saneaLista(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) { return []; }  // enlace cortado o manipulado: como si no trajera nada
}

// ¿Trae apuntes la dirección con la que se ha entrado? Devuelve la lista o null.
export function leerApuntesDelEnlace() {
  try {
    const h = window.location.hash || "";
    if (!h.startsWith(MARCA)) return null;
    const lista = descodificaApuntes(h.slice(MARCA.length));
    return lista.length ? lista : null;
  } catch (e) { return null; }
}

// Quita el fragmento de la barra de direcciones sin recargar. Se llama nada más leerlo:
// una recarga no vuelve a preguntar, y el enlace con los datos dentro no se queda a la
// vista de quien pase por al lado.
export function limpiaEnlace() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch (e) { /* navegador sin history API: se queda como está, no es grave */ }
}

export function enlaceParaTraer(base, lista) {
  return `${base}${MARCA}${codificaApuntes(lista)}`;
}
