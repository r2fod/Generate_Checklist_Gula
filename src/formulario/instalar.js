// ─── ¿SE PUEDE INSTALAR ESTO, Y CÓMO? ─────────────────────────────────────────
// En Android y en el ordenador el navegador avisa (evento "beforeinstallprompt") y
// se le puede pedir que instale. En iPhone NO existe nada de eso: la única forma es
// Compartir → "Añadir a pantalla de inicio", y hay que explicarlo a mano.
//
// Y hay una trampa que se come el caso más habitual: el enlace del formulario llega
// por WhatsApp, y WhatsApp lo abre DENTRO de su propio navegador. Ahí el botón de
// Compartir es el de WhatsApp, no el de Safari, y "Añadir a pantalla de inicio" no
// existe. Se puede seguir la instrucción al pie de la letra y no encontrar la opción
// por ningún lado. Por eso lo primero que hay que decir en ese caso es "ábrelo en
// Safari", no "dale a Compartir".

// iPad desde iPadOS 13 se hace pasar por Mac: el agente dice "Macintosh" y no dice
// "iPad" por ningún lado. Se distingue por el táctil, que un Mac de verdad no tiene.
export function esIOS(ua = "", puntosTactiles = 0) {
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // Un Mac de verdad no tiene puntos táctiles; un iPad disfrazado, sí.
  return /macintosh|mac os x/i.test(ua) && puntosTactiles > 1;
}

// Navegador metido dentro de otra app (WhatsApp, Instagram, Facebook, Gmail...).
// El Safari de verdad en iOS lleva "Version/17.0 ... Safari/604.1"; una vista web
// incrustada se queda en "Mobile/15E148" sin "Version/" ni "Safari/". Además algunas
// apps sí se identifican, y esas se reconocen directamente.
const APPS_CONOCIDAS = /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|LinkedInApp|GSA\/|MicroMessenger)/i;

// Chrome, Firefox, Edge y Opera en iOS son navegadores de verdad y desde iOS 16.4
// también saben añadir a la pantalla de inicio. Se marcan aparte porque no llevan el
// "Version/" de Safari y el truco de abajo los confundiría con una vista incrustada.
const NAVEGADORES_DE_VERDAD = /(CriOS|FxiOS|EdgiOS|OPiOS|OPT\/)/i;

function esNavegadorDeApp(ua = "") {
  if (!ua) return false;
  if (APPS_CONOCIDAS.test(ua)) return true;
  if (NAVEGADORES_DE_VERDAD.test(ua)) return false;
  // Solo se aplica el truco del "Version/" en iOS: en Android los navegadores buenos
  // (Chrome, Firefox, Samsung) tampoco llevan "Version/" y no son vistas incrustadas.
  if (!/iphone|ipad|ipod/i.test(ua)) return false;
  return !(/Version\/\d/i.test(ua) && /Safari\//i.test(ua));
}

// Ya está instalado y abierto como app: no hay nada que ofrecer.
export function yaEsApp(ventana) {
  if (!ventana) return false;
  try {
    if (ventana.matchMedia && ventana.matchMedia("(display-mode: standalone)").matches) return true;
  } catch (e) { /* matchMedia raro, se ignora */ }
  return Boolean(ventana.navigator && ventana.navigator.standalone);
}

// Cuánto se calla el aviso cuando alguien le da a "Ahora no". Antes se callaba PARA
// SIEMPRE, y eso dejaba sin salida: un toque sin querer y ya no había forma de volver
// a ver cómo se instalaba. Un mes es tiempo de sobra para no cansar a nadie.
export const DIAS_SILENCIO = 30;
const CLAVE_SILENCIO = "gula_formulario_instalar";

export function estaSilenciado(almacen, ahora = Date.now()) {
  let v = null;
  try { v = almacen && almacen.getItem(CLAVE_SILENCIO); } catch (e) { return false; }
  if (!v) return false;
  // "no" a secas es lo que guardaban las versiones viejas: silencio para siempre. Se
  // trata como un silencio que ya ha vencido, para que quien se quedó sin aviso lo
  // recupere en cuanto abra la versión nueva.
  const desde = Number(v);
  if (!Number.isFinite(desde) || desde <= 0) return false;
  return ahora - desde < DIAS_SILENCIO * 24 * 60 * 60 * 1000;
}

export function silenciar(almacen, ahora = Date.now()) {
  try { almacen && almacen.setItem(CLAVE_SILENCIO, String(ahora)); } catch (e) { /* en privado no se guarda */ }
}

// Qué aviso toca enseñar. Devuelve null (ninguno), "puede" (el navegador deja pedir
// la instalación), "iphone" (hay que explicarla) o "enSafari" (antes de nada, salir
// del navegador de la app en la que se ha abierto el enlace).
export function queAvisoToca({ ua = "", puntosTactiles = 0, hayEventoDelNavegador = false } = {}) {
  if (hayEventoDelNavegador) return "puede";
  const iOS = esIOS(ua, puntosTactiles);
  if (!iOS) return null;
  return esNavegadorDeApp(ua) ? "enSafari" : "iphone";
}
