import React, { useState, useMemo, useEffect, useDeferredValue } from "react";

import {
  Heart, Church, Cake, Briefcase, Clapperboard,
  Plug, Armchair, CookingPot, Utensils, Wine, Shirt, UtensilsCrossed,
  SprayCan, Coffee, CupSoda, Martini, Truck, Package, Users, Boxes, ShoppingCart,
  Save, RefreshCw, Link2, FileText, Printer, MessageCircle, ClipboardCopy, ClipboardCheck,
  ListPlus, FolderOpen, CalendarDays, CalendarClock, Clock, X, Check,
  ChevronUp, ChevronDown, Plus, Tag, Pencil, Undo2, RotateCcw, Euro,
  BarChart3, AlertTriangle, Info, ArrowRight, Asterisk, Bell, BellOff, Play, Pause, Copy, Search,
  Beer, GlassWater, Flame, Snowflake, ChefHat, Zap, Tent, Radio, Table, Moon, Sun, Download, Upload, Eye,
  MapPin,
} from "lucide-react";
import { cambioDelEventoAbierto } from "./sincronizacion-eventos.js";
import { carpasRecomendadas, carpasPorAlquilar, CARPAS_EN_ALMACEN } from "./carpas.js";
import { repartoManteles, colorPorDefecto } from "./manteles.js";
import { calcPaella } from "./paella.js";
import {
  ALQUILERES, DIAS_ANTES_RECOGIDA, DIAS_DESPUES_DEVOLUCION,
  sumaDias, conceptoAlquiler, recogidasConAlquileres,
} from "./alquileres.js";
import {
  nubeActiva, nuevoIdEvento, guardarEventoNube, suscribirEventoNube,
  cargarIndiceEventosNube,
  sincronizarArchivoNube, cargarArchivoNube, suscribirArchivoNube,
  leerConfigFormulario, guardarConfigFormulario,
} from "./nube.js";
import { aRespuestasDeLaApp, resumirEnvio, recogidasDelEnvio, comprasDelEnvio, archivosDelEnvio, fmtFechaCorta, cambiosEntreRespuestas } from "./formulario/preguntas.js";
import { nuevoCodigo, publicarProximos, borrarProximos, leerEnvios, borrarEnvio, marcarRevisado, repartirEnvios, suscribirEnvios, limpiarAvisos } from "./formulario/envios.js";
import logoGula from "./assets/gula-logo.png";
import { sanearEstado, cambiosDeCantidad } from "./estado.js";
import {
  BATEA, bateas, conMargen, MARGEN_SEGURIDAD,
  BOTELLAS_AGUA_POR_PAX, RESPALDO_TERCIOS_CON_BARRIL, RENDIMIENTO_BARRIL, terciosConBarril,
  calcBebidas, calcDestilados, calcCristaleria, champaneras, calcBandejas,
} from "./calculos.js";


// ─── CONSTANTES ──────────────────────────────────────────────────────────────
// Cuánto se espera a que el evento suba antes de avisar de que el link puede estar
// muerto. Con cobertura normal la subida tarda menos de un segundo; si pasa de aquí,
// más vale decirlo que dejar que manden un link que no abre nada.
const ESPERA_SUBIDA_LINK = 4000;

// Botellas de 33cl por persona y DÍA en un rodaje. Va por temporada porque la
// diferencia es enorme: una jornada de doce horas al sol en agosto no se parece en
// nada a una de enero. Son ~2,1 litros por cabeza en verano y ~1,5 en invierno,
// además de los refrescos y del agua de 1,5L que va aparte.

// Tercios de respaldo que van SIEMPRE que se lleve barril. La cuenta de litros puede
// dar cero (dos barriles de 50L cubren de sobra a 100 personas), y salir sin una sola
// botella deja el evento entero colgando de que el tirador y el barril funcionen.
// Qué tamaño de batea corresponde a cada tipo de vaso/copa, detectado por el nombre
// del item. Así el nº de bateas se recalcula siempre en vivo a partir de la cantidad
// que se esté mostrando (aunque se edite a mano), en vez de quedar fijado en un texto.
const BATEA_POR_LABEL = [
  { fragmento: "chupito cristal", size: BATEA.chupito },
  { fragmento: "vasos de agua", size: BATEA.agua }, { fragmento: "vasos cristal", size: BATEA.agua },
  { fragmento: "copas de vino", size: BATEA.vino }, { fragmento: "copas cristal", size: BATEA.vino },
  { fragmento: "vasos de cubata", size: BATEA.cubata }, { fragmento: "vaso cubata", size: BATEA.cubata },
  { fragmento: "copas de cava", size: BATEA.cava }, { fragmento: "copa cava", size: BATEA.cava },
];
function bateaSizeDe(label) {
  const norm = label.toLowerCase();
  const m = BATEA_POR_LABEL.find(b => norm.includes(b.fragmento));
  return m ? m.size : null;
}
// "200" + tamaño 25 → "200 (8 bateas de 25)"; si la cantidad no es un número
// (ej. "—") o el item no es de cristalería, se muestra tal cual sin más.
// "1 caja" y no "1 cajas". Parece una tontería hasta que se lee "1 cajas de 24" al
// lado de un número y hay que pararse a pensar qué está diciendo.
function plural(n, singular, plural_) { return `${n} ${n === 1 ? singular : plural_}`; }

function conBateas(label, qtyTexto) {
  const size = bateaSizeDe(label);
  const num = parseFloat(String(qtyTexto).replace(",", "."));
  if (!size || isNaN(num)) return qtyTexto;
  return `${qtyTexto} (${plural(Math.ceil(num / size), "batea", "bateas")} de ${size})`;
}
// Mismo mecanismo que las bateas, para bebidas que se piden en cajas de tamaño fijo:
// cerveza (24 tercios/caja), vino y tinto de verano (6 botellas/caja) y refrescos
// (24 uds/caja). El nº de cajas se recalcula en vivo igual que las bateas.
const CAJA_POR_LABEL = [
  { fragmento: "cerveza alhambra", size: 24 },
  { fragmento: "vino blanco", size: 6 }, { fragmento: "vino tinto", size: 6 }, { fragmento: "tinto de verano", size: 6 },
  { fragmento: "coca-cola", size: 24 }, { fragmento: "fanta", size: 24 }, { fragmento: "aquarius", size: 24 },
  { fragmento: "sprite", size: 24 }, { fragmento: "nestea", size: 24 },
];
function cajaSizeDe(label) {
  const norm = label.toLowerCase();
  const m = CAJA_POR_LABEL.find(c => norm.includes(c.fragmento));
  return m ? m.size : null;
}
function conCajas(label, qtyTexto) {
  const size = cajaSizeDe(label);
  const num = parseFloat(String(qtyTexto).replace(",", "."));
  if (!size || isNaN(num)) return qtyTexto;
  return `${qtyTexto} (${plural(Math.ceil(num / size), "caja", "cajas")} de ${size})`;
}
// Empareja un número editable con el texto fijo del envase (packs, cajas, paq.,
// cargas...), para que al corregir la cantidad a mano no haya que retocar también
// ese texto — se guarda aparte y no se pierde ni queda desincronizado al editar.
function conSufijo(u, sufijo) { return { u, sufijo }; }
// Añade la info de bateas (cristalería) o el sufijo de envase (packs/cajas/paq.) a
// la cantidad mostrada, para Word/Vista previa/texto — en la lista principal esa
// info se muestra aparte, no mezclada en el campo editable.
function fmtCantidadCompleta(label, qtyTexto, sufijo) {
  const conBatea = conBateas(label, qtyTexto);
  if (conBatea !== qtyTexto) return conBatea;
  const conCaja = conCajas(label, qtyTexto);
  if (conCaja !== qtyTexto) return conCaja;
  return sufijo ? `${qtyTexto} ${sufijo}` : qtyTexto;
}
// Un item se marca como ALQUILER de tres formas, en este orden: porque el generador
// lo crea ya marcado (tercer dato de la tupla, ver opt/buildChecklist), porque se ha
// marcado a mano con el ✎, o porque el nombre lleva el proveedor dentro. Lo tercero es
// el respaldo de siempre: sin él, un item escrito a mano como "Camión (alquiler)"
// perdería el tag.
const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];
const CATEGORIA_MANUAL = "Otros (añadidos manualmente)";

// ─── TEMPORADA ────────────────────────────────────────────────────────────────
// El consumo cambia mucho entre verano e invierno: la cerveza baja de 2 a 1,5 por pax,
// el reparto de vino se da la vuelta (65% blanco en verano, 45% en invierno) y el tinto
// de verano se reduce a la mitad. Ese dato existía en el código pero no había forma de
// cambiarlo desde ninguna parte: estaba fijo en "verano" todo el año, así que una boda
// de diciembre cargaba cerveza de agosto y el doble de blanco que de tinto.
// Ahora sale de la fecha del evento, con la opción de forzarlo a mano.
const MES_VERANO_DESDE = 5, MES_VERANO_HASTA = 9; // de mayo a septiembre

function esFechaDeVerano(fechaISO) {
  // Sin fecha puesta todavía se usa el mes de hoy, que es la mejor pista que hay
  const d = fechaISO ? new Date(fechaISO + "T00:00:00") : new Date();
  const mes = (isNaN(d.getTime()) ? new Date() : d).getMonth() + 1;
  return mes >= MES_VERANO_DESDE && mes <= MES_VERANO_HASTA;
}

// "auto" (por la fecha), "verano" o "invierno" forzados a mano
function esVerano(estacion, fechaISO) {
  if (estacion === "verano") return true;
  if (estacion === "invierno") return false;
  return esFechaDeVerano(fechaISO);
}

export function hoyISO() {
  const d = new Date();
  const dosCifras = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

// Qué temporada le toca a un evento guardado ANTES de que existiera este dato. Los que
// ya han pasado se quedan clavados en lo que tuvieran: su lista es historia y no tiene
// sentido que las cifras cambien al abrirla. Los que están por venir pasan a automático,
// para que se corrijan solos según su fecha.
export function temporadaInicial(estado = {}, hoy = hoyISO()) {
  if (estado.estacion) return estado.estacion;
  const yaPasado = estado.fechaEvento && estado.fechaEvento < hoy;
  if (!yaPasado) return "auto";
  return estado.mesVerano === false ? "invierno" : "verano";
}

// ─── ALQUILERES ───────────────────────────────────────────────────────────────
// Material que no es nuestro: hay que ir a buscarlo antes del evento y devolverlo
// después. Antes eran dos interruptores sueltos (sillas y armario caliente) que solo
// añadían su línea a la carga; la recogida y la devolución había que escribirlas a
// mano en cada evento, y por eso se olvidaban. Ahora cada alquiler que se activa crea
// solo su recogida (el día antes) y su devolución (el día después), con las fechas
// sacadas de la del evento.
//
// Para añadir otro alquiler basta con una entrada más aquí y engancharla a su control.
// Margen de seguridad del 10% SOLO sobre cristalería, vajilla y servilletas:
// es el buffer estándar del sector por roturas/pérdidas (los alquileres recomiendan
// pedir un 10-20% extra de copas y platos). Las bebidas, licores y cápsulas NO llevan
// margen extra: sus ratios ya están calibrados con eventos reales por encima de los
// rangos del sector (ej: vino 0,72 bot/pax frente al estándar de 0,33-0,5).

// Item "opcional": SIEMPRE ocupa su sitio en el array (nunca se quita del todo con un
// spread condicional), aunque la condición sea falsa — con cantidad null en ese caso.
// Así el orden natural de la categoría no depende de qué esté activo: si luego alguien
// edita a mano ese item y la condición deja de cumplirse, sigue en su misma posición en
// vez de "resucitar" al final de la lista (el render se encarga de ocultarlo salvo que
// haya una edición manual, ver el useMemo de "checklist").
function opt(condicion, tupla) {
  return condicion ? tupla : [tupla[0], null, ...tupla.slice(2)];
}

const EVENTOS = {
  boda:        { label: "Boda",              icon: "♥" },
  comunion:    { label: "Comunión / Bautizo", icon: "✚" },
  cumpleanos:  { label: "Cumpleaños",         icon: "✦" },
  corporativo: { label: "Evento corporativo", icon: "▣" },
  produccion:  { label: "Producción / Shooting", icon: "▶" },
};

// Icono decorativo + color pastel por categoría, buscado por fragmento del nombre
// (varía según el tipo de evento: "Cocina y fuego", "Cocina y Electro"...)
const ICONOS_CATEGORIA = [
  { fragmento: "electric", Comp: Plug, color: "#fef3c7", texto: "#92400e" },
  { fragmento: "personal", Comp: Users, color: "#e0e7ff", texto: "#3730a3" },
  { fragmento: "mobiliario", Comp: Armchair, color: "#fce7f3", texto: "#9d174d" },
  { fragmento: "paella", Comp: Flame, color: "#ffe0cc", texto: "#9a3412" },
  { fragmento: "fuego", Comp: Flame, color: "#ffe0cc", texto: "#9a3412" },
  { fragmento: "cocina", Comp: CookingPot, color: "#ffedd5", texto: "#9a3412" },
  { fragmento: "menaje", Comp: Utensils, color: "#e0e7ff", texto: "#3730a3" },
  { fragmento: "cristal", Comp: Wine, color: "#cffafe", texto: "#155e75" },
  { fragmento: "mantel", Comp: Shirt, color: "#fae8ff", texto: "#86198f" },
  { fragmento: "vajilla", Comp: UtensilsCrossed, color: "#dbeafe", texto: "#1e40af" },
  { fragmento: "limpieza", Comp: SprayCan, color: "#d1fae5", texto: "#065f46" },
  { fragmento: "café", Comp: Coffee, color: "#f3e8d2", texto: "#78350f" },
  { fragmento: "bebida", Comp: CupSoda, color: "#e0f2fe", texto: "#075985" },
  { fragmento: "alcohol", Comp: Martini, color: "#fee2e2", texto: "#991b1b" },
  { fragmento: "logística", Comp: Truck, color: "#ede9fe", texto: "#5b21b6" },
  { fragmento: "desechable", Comp: Package, color: "#fef9c3", texto: "#854d0e" },
  { fragmento: "otros", Comp: Boxes, color: "#f1f5f9", texto: "#334155" },
];
const CATEGORIA_DEFAULT = { Comp: Boxes, color: "#f1f5f9", texto: "#334155" };
// El resultado se guarda en caché: el nombre de una categoría no cambia de icono,
// y esto se llamaba varias veces por render para cada una de las ~14 categorías.
const _cacheCategoria = new Map();
function infoCategoria(nombre) {
  let info = _cacheCategoria.get(nombre);
  if (info) return info;
  const n = String(nombre).toLowerCase();
  info = ICONOS_CATEGORIA.find(i => n.includes(i.fragmento)) || CATEGORIA_DEFAULT;
  _cacheCategoria.set(nombre, info);
  return info;
}
const EVENTO_ICON = { boda: Heart, comunion: Church, cumpleanos: Cake, corporativo: Briefcase, produccion: Clapperboard };
// Icono SVG (lucide) de una categoría, buscado por su nombre.
function IconoCategoria({ nombre, size = 16 }) {
  const Comp = infoCategoria(nombre).Comp || Boxes;
  return <Comp size={size} strokeWidth={2.2} />;
}

// Icono por MATERIAL: se elige según palabras clave del nombre del item (el primero
// que coincide gana, por eso el orden importa). Es decorativo — una pista visual.
const ICONOS_ITEM = [
  { f: ["vino", "tinto de verano", "vermut", "mistela", "cava", "champ", "sangr"], I: Wine, c: "#9d174d" },
  { f: ["cerveza", "barril", "tercio", "alhambra"], I: Beer, c: "#b45309" },
  { f: ["ginebra", "ron ", "vodka", "tequila", "whisk", "licor", "baileys", "orujo", "cazalla", "jagger", "jägg", "martini", "ballantines", "barceló", "barcelo", "seagram", "smirnoff", "destilado", "tanqueray", "puerto de indias", "negrita", "tía maría", "tia maria", "limoncello", "peche"], I: Martini, c: "#7c3aed" },
  { f: ["café", "cafe", "cafetera", "capsul", "cápsula", "infusion", "infusión", "taza"], I: Coffee, c: "#78350f" },
  { f: ["coca", "fanta", "sprite", "nestea", "aquarius", "refresco", "redbull", "red bull", "zumo", "tónica", "tonica"], I: CupSoda, c: "#0891b2" },
  { f: ["hielo"], I: Snowflake, c: "#0ea5e9" },
  { f: ["agua", "solán", "solan", "vidaqua", "leche", "jarra"], I: GlassWater, c: "#2563eb" },
  { f: ["copa", "vaso", "cristaler", "chupito"], I: Wine, c: "#0e7490" },
  { f: ["bombona", " gas", "butano", "carbón", "carbon", "leña", "brasa", "barbacoa", "bbq", "pastillas de encender", "reja"], I: Flame, c: "#ea580c" },
  { f: ["horno", "microondas", "vitro", "plancha", "sandwich", "sándwich", "túrmix", "turmix", "batidora", "exprimidor", "cafetera", "termo", "calentador", "chafer", "mesa caliente", "armario caliente"], I: ChefHat, c: "#dc2626" },
  { f: ["paella", "olla", "sartén", "sarten", "cazuela", "gastro", "cuenco", "colador", "difusor", "paravientos", "trípode", "tripode", "descansador"], I: CookingPot, c: "#c2410c" },
  { f: ["cuchillo", "tenedor", "cuchara", "cubiert", "paleta", "cucharón", "cucharon", "pinza", "abridor", "sacacorchos", "espumadera", "maletín", "maletin", "tabla"], I: Utensils, c: "#4f46e5" },
  { f: ["plato", "vajilla", "bandeja", "fuente", "champanera", "cubitera", "bol ", "boles", "conchas", "palangana", "blonda"], I: UtensilsCrossed, c: "#1e40af" },
  { f: ["mantel", "servilleta", "delantal", "trapo", "bayeta", "lito", "textil", "camino"], I: Shirt, c: "#a21caf" },
  { f: ["fairy", "estropajo", "limpieza", "escoba", "mocho", "recogedor", "papel", "film", "chemine", "bolsa", "cenicero", "basura", "cubo"], I: SprayCan, c: "#059669" },
  { f: ["nevera", "congelador"], I: Snowflake, c: "#0284c7" },
  { f: ["silla", "taburete", "sofá", "chill", "trona", "cesta"], I: Armchair, c: "#9333ea" },
  { f: ["tarta", "candy", "mesa dulce"], I: Cake, c: "#db2777" },
  { f: ["mesa", "caballete", "servilletero", "marcos", "deco", "cajas de madera"], I: Table, c: "#7c3aed" },
  { f: ["regleta", "alargador", "cable", "generador", "garrafa", "foco", "luz", "guirnalda", "eléctric", "electric", "imperdible", "brida", "rulo", "cinta"], I: Zap, c: "#ca8a04" },
  { f: ["walkie", "micrófono", "microfono", "atril", "señalética", "senaletica", "cartel", "pegatina", "photocall", "porta-nombres", "acreditaci", "producciones"], I: Radio, c: "#0d9488" },
  { f: ["carpa", "pared", "moqueta", "pesas"], I: Tent, c: "#0f766e" },
  { f: ["furgoneta", "camión", "camion", "taxi", "carro", "transporte", "flota", "logístic", "logistic"], I: Truck, c: "#7c3aed" },
  { f: ["camarero", "barman", "cocina", "personal", "staff", "office", "fichaje"], I: Users, c: "#4338ca" },
];
const ITEM_ICON_DEFAULT = { I: Package, c: "#64748b" };
// Buscar el icono recorre 24 grupos con ~10 palabras cada uno: hasta ~240 búsquedas
// de texto POR ITEM, y con ~140 items eso son decenas de miles en cada render. Como
// el icono de un nombre no cambia nunca, se calcula una vez y se guarda.
const _cacheIconoItem = new Map();
function iconoItem(label) {
  let icono = _cacheIconoItem.get(label);
  if (icono) return icono;
  const n = String(label).toLowerCase();
  icono = ICONOS_ITEM.find(it => it.f.some(fr => n.includes(fr))) || ITEM_ICON_DEFAULT;
  _cacheIconoItem.set(label, icono);
  return icono;
}
function IconoItem({ label, size = 15 }) {
  const { I, c } = iconoItem(label);
  return <I size={size} strokeWidth={2} className="item-icon" style={{ color: c }} />;
}


// Detecta si un texto pegado usa tabulador (copiado de Excel/Sheets) o coma como separador de columnas
function detectarDelimitador(text) {
  const primeraLinea = text.split("\n")[0] || "";
  const tabs = (primeraLinea.match(/\t/g) || []).length;
  const comas = (primeraLinea.match(/,/g) || []).length;
  return tabs > comas ? "\t" : ",";
}

// Quita acentos, pasa a minúsculas y limpia puntuación para comparar cabeceras de forma robusta
function normalizar(s) {
  return s.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Sugiere a qué categoría de la checklist pertenece un item escrito a mano,
// buscando palabras clave del nombre y emparejándolas con un fragmento del
// nombre real de categoría (que varía según el tipo de evento: "Cocina y fuego",
// "Cocina y Electro", "Cocina y sala"... por eso se busca por fragmento, no por nombre exacto).
const PISTAS_CATEGORIA = [
  { fragmento: "electric", palabras: ["cable", "regleta", "alargador", "enchufe", "foco", "luz", "generador", "electricidad"] },
  { fragmento: "mobiliario", palabras: ["mesa", "silla", "decoracion", "vela", "flor", "centro de mesa", "photocall", "carpa", "taburete", "nevera", "congelador", "lona"] },
  { fragmento: "cocina", palabras: ["horno", "cocina", "sarten", "olla", "fuego", "gas", "plancha", "parrilla", "barbacoa", "paella", "bombona"] },
  { fragmento: "menaje", palabras: ["cuchillo", "cuchara", "tenedor", "utensilio", "bol", "colador", "cucharon"] },
  { fragmento: "cristal", palabras: ["copa", "vaso", "cristal"] },
  { fragmento: "mantel", palabras: ["mantel", "servilleta", "delantal", "textil"] },
  { fragmento: "vajilla", palabras: ["plato", "vajilla", "cubierto"] },
  { fragmento: "limpieza", palabras: ["limpieza", "fairy", "basura", "trapo", "bayeta", "papel"] },
  { fragmento: "cafe", palabras: ["cafe", "te", "infusion", "azucar", "edulcorante"] },
  { fragmento: "bebida", palabras: ["bebida", "agua", "refresco", "cerveza", "vino", "cola", "fanta", "tonica", "zumo", "hielo"] },
  { fragmento: "alcohol", palabras: ["alcohol", "licor", "ron", "vodka", "ginebra", "whisky", "vermut"] },
];

function sugerirCategoria(label, categoriasDisponibles) {
  const norm = normalizar(label);
  if (!norm) return null;
  for (const pista of PISTAS_CATEGORIA) {
    if (pista.palabras.some(p => norm.includes(p))) {
      const encontrada = categoriasDisponibles.find(c => normalizar(c).includes(pista.fragmento));
      if (encontrada) return encontrada;
    }
  }
  return null;
}

// ─── HELPERS DE CÁLCULO ───────────────────────────────────────────────────────

function calcMesasServicio(pax) {
  if (pax <= 50) return { total: 7 };
  if (pax <= 100) return { total: 11 };
  return { total: 13 };
}

// Buscar la ubicación del evento en Google Maps. Lo que se escribe es el nombre del
// sitio ("Finca La Alquería"), no unas coordenadas, y Maps lo busca igual de bien: se
// usa la URL de búsqueda, que funciona en el navegador, en Android y en iPhone (donde
// abre la aplicación de Maps si está instalada) sin depender de ninguna clave.
function enlaceMapa(sitio) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((sitio || "").trim())}`;
}

// Personal de sala: usa el nº de camareros importado del Excel si lo hay; si no,
// lo calcula automáticamente por pax. El ratio del sector es 1 camarero cada 10-15
// pax en banquete sentado (boda/comunión/corporativo) y 1 cada 20 en formato buffet
// más informal (cumpleaños/producción) — de ahí el divisor configurable.
// El mínimo es 2 (en un banquete nunca se va con una sola persona de sala), pero en
// producciones pequeñas se pasa a 1: para 25 pax de rodaje no van 2 y 2.
function personalSala(pax, numCamareros, divisor = 20, minimo = 2) {
  return numCamareros > 0 ? numCamareros : Math.max(minimo, Math.ceil(pax / divisor));
}

// Consumibles para el propio personal de sala/cocina (no para los invitados). El
// "staff" extra (cocina, producción, refuerzo...) se suma a los camareros de sala,
// porque también bebe agua y usa vasos aunque no sirva mesas.
// Los packs de vasos de cartón y plástico vienen de 50 unidades
function calcPersonal(pax, numCamareros, numStaff = 0, divisor = 20, minimoSala = 2) {
  const n = personalSala(pax, numCamareros, divisor, minimoSala) + numStaff;
  return {
    n,
    // Los vasos de café son "mini" (tamaño espresso/cortado): siempre se llevan 3 packs
    vasosCartonPacks: 3,
    aguaVidaquaPacks: Math.max(1, Math.ceil(n / 6)),
    vasosPlasticoPacks: Math.max(1, Math.ceil(n / 50)),
  };
}

function calcMesasComensales(evtKey, pax) {
  return evtKey === "boda" || evtKey === "comunion" ? Math.ceil(pax / 7) : 0;
}

function calcMesasTotal(evtKey, pax) {
  return calcMesasServicio(pax).total + calcMesasComensales(evtKey, pax);
}

// Categoría de Café, compartida por los 3 tipos de evento
// Las 3 cafeteras son propiedad de la empresa (no alquiler):
// - Nespresso: cápsulas, cantidad calculada para cubrir el pax.
// - Bar: cafetera tipo bar (portátil), también funciona con cápsulas, no café molido.
// - Grande: la única cafetera industrial, hace cargas de ~100 cafés con café molido.
// En una producción se bebe café todo el día, desde que se monta a las 6 hasta que se
// recoge: no tiene nada que ver con los 2-3 cafés de sobremesa de un banquete. Por eso
// el ratio se pasa desde fuera en vez de salir del interruptor de desayuno.
const CAPSULAS_POR_PAX_PRODUCCION = 5.5;

function calcCafe(totalPax, tipoCafetera, hayDesayuno, paxConsumo = totalPax, sinVajilla = false, ratioCapsulas = null) {
  const items = [];
  // paxConsumo ≠ totalPax solo en producciones de varios días: lo que se gasta
  // (cápsulas, café, infusiones, azúcar, leches) se calcula sobre la suma de pax
  // de todos los días; lo reutilizable (tazas, platos, jarras) sobre el día mayor.
  // El estándar del sector es 1-1,5 tazas/pax (una boda real de 116 invitados usó 100
  // cafés, 0,86/pax); aquí se sube a ~2,2/3,2 para cubrir varios momentos de café en
  // una boda española (sobremesa, tarta, recogida) sin llegar a triplicar lo que de
  // verdad se sirve, como pasaba con el ratio anterior (3,1/4,5, sin relación con las
  // tazas realmente calculadas más abajo: 0,6+0,4 = 1 taza/pax)
  const capsulas = Math.ceil(paxConsumo * (ratioCapsulas ?? (hayDesayuno ? 3.2 : 2.2)));
  if (tipoCafetera === "Grande") {
    items.push(["Cafetera grande (industrial)", "1"], ["Café molido (industrial)", conSufijo(Math.max(1, Math.ceil(paxConsumo / 100)), "carga(s)")]);
  } else if (tipoCafetera === "Bar") {
    items.push(["Cafetera de bar", "1"], ["Cápsulas café (estándar/descafeinado)", conSufijo(capsulas, `para ${paxConsumo} pax`)], ["Cuencos para calentar leche", "2"]);
  } else {
    items.push(["Cafetera Nespresso", "1"], ["Cápsulas café (estándar/descafeinado)", conSufijo(capsulas, `para ${paxConsumo} pax`)], ["Cuencos para calentar leche", "2"]);
  }
  // Con desayuno se sirve más café por persona (todos toman, no solo parte de los pax)
  const factorLeche = hayDesayuno ? 0.9 : 0.6;
  const factorSolo  = hayDesayuno ? 0.7 : 0.4;
  // En producciones/rodajes el café se sirve en vaso de cartón con palito de madera, así
  // que no van tazas, platos ni cucharas de café (esos consumibles se cargan aparte).
  if (!sinVajilla) items.push(
    [`Tazas café con leche e infusiones${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorLeche))],
    [`Tazas café solo y cortado${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorSolo))],
    ["Platos de café", String(conMargen(totalPax))],
  );
  items.push(
    ["Infusiones (té variado + descafeinado)", conSufijo(Math.ceil(paxConsumo / 30), "caja")],
    ["Azucarillos y edulcorantes", conSufijo(Math.ceil(paxConsumo / 50), "caja")],
    [`Leches variadas (entera/desnatada/sin lactosa/avena)${hayDesayuno ? " (desayuno)" : ""}`, String(Math.max(4, Math.ceil(paxConsumo / (hayDesayuno ? 8 : 40))))],
    ["Jarras de leche", String(Math.max(2, Math.ceil(totalPax / (hayDesayuno ? 20 : 40))))],
  );
  return { nombre: "Café", items };
}

// ─── BUILD CHECKLIST ──────────────────────────────────────────────────────────
function buildChecklist(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  if (evtKey === "cumpleanos") return buildChecklistCumpleanos(pax, horasCoctel, horasCopas, ninos, opts);
  if (evtKey === "produccion") return buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts);
  return buildChecklistBoda(evtKey, pax, horasCoctel, horasCopas, ninos, opts); // boda, comunión y evento corporativo
}

// Boda y comunión — fiel a "Checklist de Carga – BODA"
function buildChecklistBoda(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    dobleServicio, tamanoBarril = "No lleva", numBarriles = 1, llevaPaella, tipoBandejas, tipoBBQ, tipoHorno,
    mesVerano, tieneBrindisCava, fuerzaTextilTela, colorManteles, porcentajeBeige,
    tieneFrituras, numFrituras, llevaEntrante, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas = 1, llevaPlatos, llevaCubiertos, numCamareros, numStaff = 0,
    soloBandeja,
    llevaPlatosPostre = llevaPlatos,
    llevaChillOut, numChillOut = 1,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, llevaMobiliarioAlquiler,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta = true,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoNevera, tipoCongelador, tipoPaella, numPaellas = 0, origenSillas = "Dealde",
    estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
    paxPorCamarero = 0, numLogisticaEquipo = 0,
  } = opts;
  // Nº de logística para la lista de Personal: la gente real que hayas añadido en el
  // "Equipo de logística"; si no hay nadie, el recomendado (1 cada 60 pax).
  const numLogistica = numLogisticaEquipo > 0 ? numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60));
  // El origen de las sillas (alquiler Dealde/Carvillo o propias) se refleja en el
  // nombre del item — el tag ALQUILER sale solo al detectar la palabra en el nombre.
  // Los cojines vienen incluidos con la silla de alquiler en bodas (no es un item
  // aparte que se pueda pedir por separado), así que se anota en el propio nombre
  // en vez de generar una línea "Cojines para sillas" suelta.
  const incluyeCojines = (origenSillas === "Dealde" || origenSillas === "Carvillo") && evtKey === "boda";
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas}${incluyeCojines ? ", con cojines" : ""})`;
  // Las nuestras no son alquiler, así que no llevan el tag ni generan recogida
  const esAlquilerSillas = origenSillas !== "Nuestras";

  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  // Si se lleva congelador (propio o de la finca) se puede hacer/almacenar hielo in situ:
  // solo hace falta pedir taxis de hielo cuando NO se lleva ninguno.
  const hayCongelador = tipoCongelador !== "No lleva";
  // Boda, Comunión/Bautizo y Corporativo comparten la mayor parte de la lista; estas
  // banderas activan/ocultan lo que es propio de cada uno (ver items con opt() abajo).
  const esComunion = evtKey === "comunion";
  const esCorporativo = evtKey === "corporativo";
  // Corporativo suele ser cóctel de pie (menos camareros que un banquete sentado):
  // 1 cada 18 pax; boda y comunión (servicio en mesa) 1 cada 12. Si el usuario fija
  // su propio ratio (1 camarero cada X pax) en el formulario, manda ese.
  const divisorCam = paxPorCamarero > 0 ? paxPorCamarero : (esCorporativo ? 18 : 12);

  const bebidas    = calcBebidas(pax, horasBarraTotal, mesVerano, hayCongelador, tieneBrindisCava, horasCopas);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas (0 si no está activada):
  // el cóctel/aperitivo no sirve cubatas. Vino/agua/cava/chupito sí escalan con el total
  // de horas de barra libre (cóctel + copas), igual que otros caterings.
  const cristal    = calcCristaleria(pax, horasCoctel, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  const usaTela    = evtKey === "boda" || fuerzaTextilTela;
  const cats       = [];

  cats.push({ nombre: "Electricidad y camión", items: [
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"], ["Cinta aislante", conSufijo(1, "rollo")],
    ["Bridas", conSufijo(1, "bolsa")], ["Imperdibles", conSufijo(1, "paquete")],
    ["Carros de servicio/transporte", "2"], ["Walkies", "2"],
  ]});

  // Personal (banquete emplatado): camareros según el ratio configurado, logística
  // 1 cada 60 pax (carga/transporte/montaje), cocina ~3 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros", String(personalSala(pax, numCamareros, divisorCam))],
    ["Logística", String(numLogistica)],
    ["Cocina", String(Math.max(2, Math.ceil(pax * 3 / 50)))],
  ]});

  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { pasar: bandejasPasar, madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata });
  // Mesas altas (cóctel de pie): solo hacen falta si hay barra libre/aperitivo con la gente de pie
  const mesasAltas = hayBarra ? Math.max(2, Math.ceil(pax / 15)) : 0;
  cats.push({ nombre: "Mobiliario, sala y decoración", items: [
    ["Mesas de 1,8m", String(calcMesasTotal(evtKey, pax))],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax), esAlquilerSillas]),
    opt(llevaMobiliarioAlquiler, ["Mobiliario (alquiler Event Style)", "1", true]),
    opt(evtKey === "boda" && llevaTarta, ["Mesa redonda especial para Tarta", "1"]),
    ["Mesa 1x1 cuadrada", "—"], ["Mesa alta", mesasAltas > 0 ? String(mesasAltas) : "—"], ["Taburetes", "—"],
    ["Marcos para menú", "—"], ["Caja deco", "—"], ["Servilleteros de madera", "—"],
    opt(!esCorporativo, ["Guirnaldas de luces", "—"]),
    // Propio de Comunión / Bautizo
    opt(esComunion && llevaTarta, ["Mesa redonda (tarta comunión)", "1"]),
    opt(esComunion, ["Candy bar / mesa dulce", "—"]),
    opt(esComunion, ["Photocall / atrezzo", "—"]),
    // Propio de Evento corporativo
    opt(esCorporativo, ["Señalética / cartelería con logo", "—"]),
    opt(esCorporativo, ["Porta-nombres / acreditaciones", "—"]),
    opt(esCorporativo, ["Atril + micrófono", "—"]),
    opt(esCorporativo, ["Photocall / roll-up corporativo", "—"]),
    ["Cajas de madera para alturas", "—"], ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPaella, ["Descansadores de paella", String(calcPaella(pax, tipoPaella, numPaellas).n)]),
    ["Cubo basura cocina", "2"],
    // "Nevera roja" es la propia nevera grande de la empresa, no un mueble aparte
    opt(tipoNevera !== "No lleva", [tipoNevera === "Grande" ? "Nevera roja (grande)" : `Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
  ]});

  const numPaella  = llevaPaella ? calcPaella(pax, tipoPaella, numPaellas).n : 0;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 si hay plancha de gas
  const nPlanchas  = llevaPlanchaGas ? Math.max(1, numPlanchasGas) : 0;
  const bombonas   = numPaella + numFritura + nPlanchas;
  // Paella y fuego: todo el equipo de fuego/paella junto (paella, difusores, trípode,
  // paravientos, bombonas, parisiene, barbacoa…), para distinguirlo y cargarlo cómodo.
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas);
    // Difusor y trípode se comparten con las frituras (misma herramienta), se suman en vez de listar aparte
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)], ["Difusor", String(p.n + numFritura)], ["Trípode", String(p.n + numFritura)], ["Paravientos", String(p.n)]);
  }
  if (tieneFrituras) {
    paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Espumadera grande", String(Math.max(2, numFritura))]);
    if (!llevaPaella) paellaItems.push(["Difusor", String(numFritura)], ["Trípode", String(numFritura)]);
  }
  if (llevaPlanchaGas) paellaItems.push(["Plancha de gas", String(nPlanchas)]);
  // Sin fuego no hay bombonas: sin esto la categoría "Paella y fuego" se quedaba en
  // pantalla con una sola línea a 0, que no dice nada a quien carga.
  if (bombonas > 0) paellaItems.push(["Bombonas llenas", String(bombonas)]);
  if (tipoBBQ !== "no lleva") {
    paellaItems.push([`Barbacoa ${tipoBBQ}`, String(Math.max(1, Math.ceil(pax / 60)))], ["Reja BBQ grande", "1"], ["Carbón", String(Math.max(2, Math.ceil(pax / 30)))], ["Leña", "1"], ["Pastillas de encender", "1"]);
  }
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  const cocinaItems = [];
  cocinaItems.push(["Cazuelas de barro", "—"], ["Cazuelas rojas", "—"], ["Gastros", "—"], ["Plancha (cocina)", "—"]);
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Vitro", "1"]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  cats.push({ nombre: "Cocina", items: cocinaItems });

  cats.push({ nombre: "Menaje y utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"], ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"], ["Boles metálicos", "4"],
    ["Cucharones grandes", "3"], ["Pinzas largas", "2"], ["Copas metálicas", "Todas"],
    // La mesa de la tarta y los platos ya se cargaban; la pala y el cuchillo con los que
    // se corta, no. Es de esas cosas que solo se echan en falta con la tarta delante.
    opt(llevaTarta, ["Pala de tarta", "1"]),
    opt(llevaTarta, ["Cuchillo de tarta", "1"]),
  ]});

  cats.push({ nombre: "Cristalería", items: [
    [`Vasos de agua${dobleServicio ? " (doble)" : ""}`,  String(cristal.agua.u)],
    opt(cristal.cubata.u > 0, ["Vasos de cubata", String(cristal.cubata.u)]),
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`,  String(cristal.vino.u)],
    ["Copas de cava",                                     String(cristal.cava.u)],
    ["Copa martini", "—"], ["Vaso whiskey", "—"],
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(llevaJarrasCristal, ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores de cerveza", "2"], ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
  ]});

  cats.push({ nombre: "Mantelería y textiles", items: [
    ...repartoManteles(calcMesasTotal(evtKey, pax) + 2 + mesasAltas, colorManteles || colorPorDefecto(evtKey), porcentajeBeige),
    ["Delantales", String(personalSala(pax, numCamareros, divisorCam) + 2)],
    ["Plancha de vapor (manteles)", "1"],
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas grandes (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
  ]});

  {/* Jamón, tarta y desayuno se sirven en plato pequeño (mismo estilo que el postre):
     se suman al recuento de "Platos postre" en vez de generar una línea aparte.
     El entrante sí se queda aparte porque suele llevar su propio plato de plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0)
    + (evtKey === "boda" && llevaTarta ? totalPax : 0)
    + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla", items: [
    ...((!soloBandeja && llevaPlatos) ? [
      [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)],
      ["Platos hondos", "—"], ["Plato pan", "—"], ["Boles negros", "—"], ["Boles blancos", "—"], ["Platos metálicos", "—"],
    ] : []),
    // El plato de postre va aparte del principal: se puede llevar postre aunque el
    // resto vaya en bandeja (y al revés), así que tiene su propio "No llevan".
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cuchillos grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas postre", String(conMargen(totalPax))],
      ["Cucharas café", String(conMargen(totalPax * 0.8))],
    ] : []),
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
  ]});

  const personal = calcPersonal(pax, numCamareros, numStaff, divisorCam);
  cats.push({ nombre: "Servicio y limpieza", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Bayetas", "4"], ["Trapos de horno", "4"], ["Papel Chemine", conSufijo(2, "rollo")], ["Bolsas de basura", "10"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camareros", String(personalSala(pax, numCamareros, divisorCam))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros, divisorCam))],
    ["Hojas de fichaje", "1"],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  // El barril de cerveza (30L/50L) descuenta esos litros de los tercios necesarios en
  // vez de sustituirlos del todo: puede haber tercios + barril (el barril cubre parte
  // y el resto se completa con botellín), solo barril (si cubre todo lo necesario) o
  // solo tercios (si no se lleva barril) — nunca se piden de más ni de menos.
  // El litraje nominal del barril NO es todo aprovechable: purgado del grifo/línea al
  // conectar, espuma y los restos que quedan sin servir al final suponen ~10-15% de
  // merma real en barra (estándar del sector para barriles de cerveza de barril). Se
  // calcula con un 85% de rendimiento útil para no quedarnos cortos de tercios de
  // repuesto si el barril rinde menos de lo nominal.
  // La cuenta vive en calculos.js (terciosConBarril). Estaba escrita dos veces —aquí y
  // en cumpleaños— y dos copias de la misma fórmula son una que se queda atrás.
  const litrosBarrilUd = tamanoBarril === "30L" ? 30 : tamanoBarril === "50L" ? 50 : 0;
  const tercerosRestantes = terciosConBarril(bebidas.cerveza, litrosBarrilUd, numBarriles);
  cats.push({ nombre: "Bebidas frías", items: [
    opt(litrosBarrilUd > 0, [`Barril de cerveza (${tamanoBarril})`, String(Math.max(1, numBarriles))]),
    opt(litrosBarrilUd > 0, ["Tirador de cerveza", "1"]),
    opt(tercerosRestantes > 0, ["Cerveza Alhambra (tercios)", String(tercerosRestantes)]),
    ["Vino blanco", conSufijo(bebidas.vinoBlanco, "botellas")], ["Vino tinto", conSufijo(bebidas.vinoTinto, "botellas")],
    ["Tinto de verano (1,5L)", conSufijo(bebidas.tintoVerano, "botellas")],
    ["Cava", conSufijo(bebidas.cava, "botellas")], ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15Packs, "packs (6 uds)")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(bebidas.aguasPequenasCajas, "cajas (35 uds)")]),
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)], ["Aquarius", String(bebidas.aquarius)],
    ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    // La tónica solo existe si hay barra libre de COPAS: es mezcla de ginebra, y en el
    // aperitivo no se sirve. Sin copas no aparece la línea siquiera — una línea a cero
    // en la lista de compra es una línea que alguien acaba comprando por si acaso.
    opt(horasCopas > 0, ["Tónica", conSufijo(bebidas.tonica, "botellas")]),
    ["Agua con gas", String(bebidas.aguaConGas)],
    ["Cerveza 0,0", String(bebidas.cerveza00)], ["Cerveza sin gluten", String(bebidas.sinGluten)],
    ["Vermut rojo", String(bebidas.vermutRojo)], ["Vermut blanco", String(bebidas.vermutBlanco)],
    opt(!hayCongelador, ["Hielo", conSufijo(bebidas.taxisHielo, "taxis")]),
    opt(hayBarra, ["Redbull", String(bebidas.redbull)]),
  ]});

  if (destilados) {
    cats.push({ nombre: "Alcoholes y licores", items: [
      ["Ginebra (Seagrams/Tanqueray)", String(destilados.ginebraPremium)],
      ["Ginebra de sabor (Puerto de Indias)", String(destilados.ginebraSabor)],
      ["Ron (Bacardí)", String(destilados.ron)], ["Ron saborizado (Negrita)", String(destilados.ronBlanco)],
      ["Tequila", String(destilados.tequila)], ["Tequila Rosa", String(destilados.tequilaSabor)],
      ["Vodka", String(destilados.vodka)],
      ["Mistela", String(destilados.mistela)], ["Baileys", String(destilados.baileys)],
      ["Tía María", String(destilados.tiaMaria)], ["Limoncello", String(destilados.limoncello)],
      ["Jagger (Jägermeister)", String(destilados.jagger)], ["Peche (licor de melocotón)", String(destilados.peach)],
      ["Crema de orujo", String(destilados.cremaOrujo)], ["Cazalla", String(destilados.cazalla)],
      ["Orujo de hierbas", String(destilados.orujoHierbas)],
      ["Ballantines", String(destilados.ballantines)], ["Barceló", String(destilados.barcelo)],
      ["Martini", "1"], ["Crema de arroz", "1"],
      ["Otros licores marca blanca (Smirnoff)", String(destilados.marcaBlanca)],
    ]});
  }

  cats.push({ nombre: "Logística y retorno", items: [
    ["Cajas extra platos sucios", "1"], ["Cajas extra cubiertos sucios", "1"],
    ["Caja azul extra", "1"], ["Taxis comida", "—"],
  ]});

  return cats;
}

// Cumpleaños — fiel a "Checklist de Carga – cumpleaños"
function buildChecklistCumpleanos(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    dobleServicio, llevaPaella, tipoHorno, tieneFrituras, numFrituras, llevaEntrante, soloBandeja,
    tieneBrindisCava, mesVerano, fuerzaTextilTela, colorManteles, porcentajeBeige, tipoCafetera,
    tamanoBarril = "No lleva", numBarriles = 1,
    llevaJamonero, personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno, llevaMobiliarioAlquiler,
    entranteCompartido, numEntrantesCompartir = 1,
    llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas = 1, llevaPlatos, llevaCubiertos, llevaPalomitera, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    llevaPlatosPostre = llevaPlatos, estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
    tipoPaella, numPaellas = 0, tipoNevera, tipoCongelador, llevaTarta = true, origenSillas = "Dealde",
    llevaChillOut, numChillOut = 1,
  } = opts;
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas})`;
  const esAlquilerSillas = origenSillas !== "Nuestras";
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  const hayCongelador = tipoCongelador !== "No lleva";
  // Cumpleaños: formato informal, 1 camarero cada 20 pax salvo que se fije otro ratio.
  const divisorCam = opts.paxPorCamarero > 0 ? opts.paxPorCamarero : 20;

  const bebidas = calcBebidas(pax, horasBarraTotal, mesVerano, hayCongelador, tieneBrindisCava, horasCopas);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas: el cóctel/aperitivo no sirve cubatas
  const cristal = calcCristaleria(pax, horasCoctel, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { pasar: bandejasPasar, madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata });
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante", conSufijo(1, "rollo")], ["Bridas", conSufijo(1, "bolsa")], ["Walkies", "2"],
  ]});

  // Personal: en cumpleaños suele ser formato más informal (1:20); logística 1 cada
  // 60 pax (carga/transporte), cocina ~2 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Logística", String(opts.numLogisticaEquipo > 0 ? opts.numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60)))],
    ["Cocina", String(Math.max(1, Math.ceil(pax * 2 / 50)))],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas de 1,8m", String(calcMesasServicio(pax).total)],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax), esAlquilerSillas]),
    opt(llevaMobiliarioAlquiler, ["Mobiliario (alquiler Event Style)", "1", true]),
    ["Cubo basura reciclaje", "1"], ["Cubo basura cocina", "1"],
    ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    // En un cumpleaños siempre hay tarta y no se cargaba mesa para ella
    opt(llevaTarta, ["Mesa redonda para tarta", "1"]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    opt(tipoNevera !== "No lleva", [`Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
  ]});

  // Paella y fuego: todo el equipo de fuego/paella junto (para distinguirlo y cargarlo cómodo)
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas);
    // El trípode se comparte con las frituras (misma herramienta), se suma en vez de listar aparte
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)], ["Descansadores de paella", "2"], ["Trípode", String(p.n + numFritura)]);
  }
  if (tieneFrituras) {
    paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor", String(numFritura)], ["Paravientos", "1"]);
    if (!llevaPaella) paellaItems.push(["Trípode", String(numFritura)]);
  }
  const nPlanchasCumple = llevaPlanchaGas ? Math.max(1, numPlanchasGas) : 0;
  if (llevaPlanchaGas) paellaItems.push(["Plancha de gas", String(nPlanchasCumple)]);
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 si hay plancha de gas
  const bombonasCumple = (llevaPaella ? calcPaella(pax, tipoPaella, numPaellas).n : 0) + numFritura + nPlanchasCumple;
  if (bombonasCumple > 0) paellaItems.push(["Bombonas llenas", String(bombonasCumple)]);
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  const cocinaItems = [];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Vitro", "1"], ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  cats.push({ nombre: "Cocina y Electro", items: cocinaItems });

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"],
    ["Caja salsas y arroces", "1"], ["Boles metálicos", "4"], ["Cucharones grandes", "3"],
    ["Servilleteros de madera", "2"], ["Caja cocina (varios)", "1"],
    // Con lo que se corta la tarta, que tampoco se cargaba aquí
    opt(llevaTarta, ["Pala de tarta", "1"]),
    opt(llevaTarta, ["Cuchillo de tarta", "1"]),
  ]});

  const usaTela = fuerzaTextilTela;
  cats.push({ nombre: "Mantelería y Textiles", items: [
    ...repartoManteles(calcMesasServicio(pax).total + 1, colorManteles || colorPorDefecto("cumpleanos"), porcentajeBeige),
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(personalSala(pax, opts.numCamareros, divisorCam) + 2)], ["Bayetas", "4"], ["Trapos de horno", "4"],
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas grandes (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla, Cubertería y Cristalería", items: [
    ...((!soloBandeja && llevaPlatos) ? [
      [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)], ["Platos metálicos", "—"],
    ] : []),
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))],
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cuchillos grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas postre", String(conMargen(totalPax))],
    ] : []),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`, String(cristal.vino.u)],
    ["Vasos de agua", String(cristal.agua.u)],
    ["Copas de cava", String(cristal.cava.u)],
    opt(cristal.cubata.u > 0, ["Vasos de cubata", String(cristal.cubata.u)]),
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"], ["Abridores de cerveza", "2"],
    ["Pinzas largas", "2"], ["Copas metálicas", "—"], ["Conchas", "—"],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  const personal = calcPersonal(pax, opts.numCamareros, opts.numStaff, divisorCam);
  // Faltaban el vino, la cerveza y el cava: se cargaban las copas de vino y de cava pero
  // no había nada que servir en ellas. Se calculan igual que en la boda: si hay barril,
  // los litros que da se descuentan de los tercios en vez de sumarse.
  const barrilLitros = tamanoBarril === "30L" ? 30 : tamanoBarril === "50L" ? 50 : 0;
  // Misma cuenta que en la boda, y ahora literalmente la misma función (calculos.js)
  const terciosCerveza = terciosConBarril(bebidas.cerveza, barrilLitros, numBarriles);
  cats.push({ nombre: "Bebidas", items: [
    opt(barrilLitros > 0, [`Barril de cerveza (${tamanoBarril})`, String(Math.max(1, numBarriles))]),
    opt(barrilLitros > 0, ["Tirador de cerveza", "1"]),
    opt(terciosCerveza > 0, ["Cerveza Alhambra (tercios)", String(terciosCerveza)]),
    ["Vino blanco", conSufijo(bebidas.vinoBlanco, "botellas")],
    ["Vino tinto", conSufijo(bebidas.vinoTinto, "botellas")],
    ["Cava", conSufijo(bebidas.cava, "botellas")],
    ["Tinto de verano (1,5L)", conSufijo(bebidas.tintoVerano, "botellas")],
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)],
    ["Aquarius", String(bebidas.aquarius)], ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15Packs, "packs (6 uds)")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(bebidas.aguasPequenasCajas, "cajas (35 uds)")]),
    ["Agua con gas", String(bebidas.aguaConGas)],
    opt(!hayCongelador, ["Hielo", conSufijo(bebidas.taxisHielo, "taxis")]),
  ]});

  if (destilados) {
    cats.push({ nombre: "Alcoholes y licores", items: [
      ["Ginebra (Seagrams/Tanqueray)", String(destilados.ginebraPremium)],
      ["Ginebra de sabor (Puerto de Indias)", String(destilados.ginebraSabor)],
      ["Ron (Bacardí)", String(destilados.ron)], ["Ron saborizado (Negrita)", String(destilados.ronBlanco)],
      ["Tequila", String(destilados.tequila)], ["Tequila Rosa", String(destilados.tequilaSabor)],
      ["Vodka", String(destilados.vodka)],
      ["Mistela", String(destilados.mistela)], ["Baileys", String(destilados.baileys)],
      ["Tía María", String(destilados.tiaMaria)], ["Limoncello", String(destilados.limoncello)],
      ["Jagger (Jägermeister)", String(destilados.jagger)], ["Peche (licor de melocotón)", String(destilados.peach)],
      ["Crema de orujo", String(destilados.cremaOrujo)], ["Cazalla", String(destilados.cazalla)],
      ["Orujo de hierbas", String(destilados.orujoHierbas)],
      ["Ballantines", String(destilados.ballantines)], ["Barceló", String(destilados.barcelo)],
      ["Otros licores marca blanca (Smirnoff)", String(destilados.marcaBlanca)],
    ]});
  }

  cats.push({ nombre: "Limpieza", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")], ["Papel Chemine", conSufijo(2, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Cajas vacías", "2"], ["Caja azul", "1"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camareros", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Hojas de fichaje", "1"],
  ]});

  return cats;
}

// Eventos corporativos / producciones — fiel a "Checklist de Carga – Producciones"
function buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    llevaPaella, tieneFrituras, numFrituras, tipoCafetera, dobleServicio, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, llevaJamonero, llevaPlatos, llevaCubiertos, numPlanchasGas = 1,
    llevaPlatosPostre = llevaPlatos, estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Negro/gris",
    soloBandeja, personasPorPlatoEntrante, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoPaella, numPaellas = 0, numCamareros, numStaff = 0, fuerzaTextilTela, origenSillas = "Dealde",
    llevaChillOut, numChillOut = 1, tipoHorno = "pequeño",
    llevaCarpas = true, llevaGenerador = true, mesVerano = true,
  } = opts;
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas})`;
  const esAlquilerSillas = origenSillas !== "Nuestras";
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const usaTela = fuerzaTextilTela;
  // Producción de varios días con pax distinto por día (ej. 12+17+12): el equipo
  // reutilizable (mesas, plancha, vajilla...) se dimensiona para el día de MÁS pax,
  // y lo consumible (refrescos, aguas, vasos, servilletas, cápsulas...) para la SUMA
  // de todos los días. Sin días definidos funciona como siempre (un solo día).
  const diasPax = (opts.diasProduccion || []).map(d => parseInt(d, 10)).filter(n => n > 0);
  const nDias = Math.max(1, diasPax.length);
  if (diasPax.length) { pax = Math.max(...diasPax); ninos = 0; }
  const totalPax = pax + ninos;
  const paxConsumo = diasPax.length ? diasPax.reduce((a, b) => a + b, 0) : totalPax;
  // Producción: equipo de rodaje 1 cada 20 pax salvo que se fije otro ratio.
  const divisorCam = opts.paxPorCamarero > 0 ? opts.paxPorCamarero : 20;
  // Producciones pequeñas (hasta 30 pax): 1 de sala/office y 1 de cocina. El ratio de
  // banquete (1 cada 20 pax) y el mínimo de 2 daban 2 y 2 para un rodaje de 25 pax, que
  // es más gente de la que hace falta. A partir de ahí escala como siempre.
  const produPequena = pax <= 30;
  const nSala = numCamareros > 0 ? numCamareros : (produPequena ? 1 : personalSala(pax, numCamareros, divisorCam));
  const nCocina = produPequena ? 1 : Math.max(2, Math.ceil(pax * 2 / 50));
  // En producciones no hay barra libre (ni cóctel ni copas): solo refrescos, agua
  // con gas y aguas (cajas de 33cl y botellas de 1,5L) — nada de alcohol ni cristalería
  const personal = calcPersonal(pax, nSala, numStaff, divisorCam);
  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { pasar: bandejasPasar, madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata });
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Focos de luz", "1"],
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante", conSufijo(1, "rollo")], ["Bridas", conSufijo(1, "bolsa")],
    // La garrafa de gasolina va con el generador: si no se lleva generador, tampoco.
    // El generador es alquilado (SOS) y va marcado como tal; la gasolina la ponemos nosotros.
    opt(llevaGenerador, ["Generador", "1", true]), opt(llevaGenerador, ["Garrafa gasolina (llena)", "1"]),
    ["Walkies", "2"], ["Máquina pegatinas", "1"],
  ]});

  // Personal de rodaje: equipo de sala/office (1:20) y cocina ~2 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros / office", String(nSala)],
    ["Logística", String(opts.numLogisticaEquipo > 0 ? opts.numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60)))],
    ["Cocina", String(nCocina)],
  ]});

  // Carpas: las dos fijas de siempre (la del buffet y la del culo del camión) se suman
  // aparte de la zona de comer, igual que ya se hace con las mesas (por pax + 4 de
  // buffet + 1 del camión). Antes iba todo en una sola cuenta de pax/12, así que esas
  // dos se comían el número: con 25 pax salían 3 en total y quedaba UNA sola para que
  // comieran 25 personas. La zona de comer sigue el estándar de las alquiladoras: una
  // 3x3 cubre ~12 personas de pie (0,75 m²/pax). Todo editable a mano si el sitio ya
  // tiene sombra, nave o interior.
  // Cuántas hacen falta: la cuenta de siempre a partir del pax, salvo que alguien haya
  // dicho un número (desde el formulario o a mano), que manda sobre el cálculo — el
  // sitio lo ha visto una persona y la cuenta no.
  const carpasIdeal = opts.numCarpas > 0 ? opts.numCarpas : carpasRecomendadas(pax);
  // Lo que hay en almacén: no se puede cargar más de lo que se tiene. La cantidad que
  // sale es la que se coge del almacén, y si hacen falta más se avisa al lado para
  // poder alquilar la diferencia a tiempo.
  const PESAS_EN_ALMACEN = 6;
  const numCarpas = Math.min(carpasIdeal, CARPAS_EN_ALMACEN);
  const faltanCarpas = carpasPorAlquilar(carpasIdeal);
  const PAREDES_POR_CARPA = 3;
  const numChafers = Math.max(2, Math.ceil(pax / 40));
  // Las mesas de 1,8m van todas en un único total: cocina/servicio (por pax) + 4 de
  // buffet + 1 para el camión. La cuadrada 1x1 de la zona de cajas sucias va aparte
  // porque es otro tipo de mesa.
  const mesasServicio = calcMesasServicio(pax).total;
  const MESAS_BUFFET = 4;
  const MESA_CAMION = 1;
  // En rodajes siempre aparece gente que no estaba en la lista (técnicos, productora,
  // visitas), así que las sillas se piden con 5 de más sobre el pax del día.
  // (con 0 pax no se suman: un evento aún sin rellenar no debe pedir 5 sillas)
  const SILLAS_EXTRA = totalPax > 0 ? 5 : 0;
  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas de 1,8m", String(mesasServicio + MESAS_BUFFET + MESA_CAMION)],
    ["Mesa 1x1 cuadrada (zona cajas sucias)", "1"],
    // Mesa larga fuera: las largas del rodaje son las de 1,8m de arriba, así que era
    // una línea repetida que solo hacía dudar de si había que cargar algo más.
    ["Mesa redonda", "—"],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax + SILLAS_EXTRA), esAlquilerSillas]),
    // En un rodaje se separa mucho más residuo que en un banquete: van 3 de reciclaje
    ["Cubo basura reciclaje", "3"], ["Cubo basura cocina", "1"],
    ["Cajas de madera para alturas", "—"], ["Marcos para menú", "—"],
    // Carpas, paredes y pesas en tres líneas: antes ponía "Carpas con paredes y pesas"
    // y más abajo otra línea de paredes, así que no se sabía si las de la primera
    // estaban incluidas o no. Tres paredes por carpa (tres caras cerradas y una
    // abierta para entrar) y dos pesas por carpa.
    opt(llevaCarpas, ["Carpas", faltanCarpas > 0
      ? conSufijo(numCarpas, `de ${CARPAS_EN_ALMACEN} en almacén · faltan ${faltanCarpas}, hay que alquilarlas`)
      : String(numCarpas)]),
    opt(llevaCarpas, ["Paredes de carpas", String(numCarpas * PAREDES_POR_CARPA)]),
    // Las pesas son las que hay: se cargan todas y se reparten entre las carpas más
    // expuestas al viento, no van por carpa
    opt(llevaCarpas, ["Pesas (15kg)", String(PESAS_EN_ALMACEN)]),
    ["Moqueta", "—"],
    ["Cestas de mimbre", "—"],
    // Decoración del buffet: la cantidad se pone a mano según el sitio, igual que
    // el resto de la decoración de esta categoría
    ["Jarrones de cristal", "—"], ["Flores", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
  ]});

  // Paella y fuego: todo el equipo de fuego/paella junto (para distinguirlo y cargarlo cómodo).
  // Paravientos solo tienen sentido con fuego fuera (paellas/frituras): uno por foco.
  const numPaellaProd = llevaPaella ? calcPaella(pax, tipoPaella, numPaellas).n : 0;
  const numParavientos = numPaellaProd + numFritura;
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas);
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)]);
  }
  paellaItems.push(["Trípode", String(1 + numFritura)]);
  if (numParavientos > 0) paellaItems.push(["Paravientos", String(numParavientos)]);
  if (tieneFrituras) paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor", String(numFritura)]);
  // En producción la plancha de gas va fija, pero puede ir más de una: cada una lleva
  // su bombona, así que el número manda sobre las dos líneas.
  const nPlanchasProd = Math.max(1, numPlanchasGas);
  paellaItems.push(["Plancha de gas", String(nPlanchasProd)]);
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 por cada plancha de gas
  paellaItems.push(["Bombonas llenas", String(numPaellaProd + numFritura + nPlanchasProd)]);
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  cats.push({ nombre: "Cocina y sala", items: [
    // (La plancha de gas va en "Paella y fuego" junto al resto de fuego)
    // Mesa caliente para mantener el pase: 1 por cada ~40 pax del día grande
    // El horno lo elige el selector de Equipamiento, igual que en el resto de
    // eventos: aquí estaba fijo en "Horno pequeño" y cambiar a Grande o Ambos no
    // hacía nada.
    opt(tipoHorno === "pequeño" || tipoHorno === "ambos", ["Horno pequeño", "1"]),
    opt(tipoHorno === "grande" || tipoHorno === "ambos", ["Horno grande", "1"]),
    ["Microondas", "1"], ["Batidora de vaso", "1"], ["Mesas calientes", String(Math.max(1, Math.ceil(pax / 40)))],
    // Termos de café/agua caliente: uno por cada ~25 pax (aguantan 8-10 tazas)
    // "Butano" fuera: era la misma bombona que ya sale contada en "Paella y fuego"
    // (una por paella, una por sartén de fritura y una por plancha de gas), así que
    // aparecía dos veces con dos nombres distintos.
    ["Vitro", "1"], ["Termos con tapa", String(Math.max(2, Math.ceil(pax / 25)))],
    ["Exprimidor", "1"], ["Sandwichera", "1"], ["Neveras playa grandes (llenar de hielo)", "2"],
    ["Neveras playa pequeñas", "2"], ["Chafers", String(numChafers)],
    opt(llevaArmarioCaliente, ["Armario caliente (alquiler Dealde)", "1", true]),
  ]});

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"],
    ["Boles metálicos", "4"], ["Cucharones grandes", "3"], ["Pinzas largas", "2"],
    // Cada chafer trabaja con 2 gastros (el que está sirviendo + el de reposición)
    ["Servilleteros de madera", "2"], ["Gastros", String(numChafers * 2)], ["Caja cocina (varios)", "1"],
    ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"], ["Caja salsas y arroces", "1"],
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    // Un mantel por mesa de servicio y de buffet (la del camión y la de cajas
    // sucias van sin vestir) + 1 de repuesto
    ...repartoManteles(mesasServicio + MESAS_BUFFET + 1, opts.colorManteles || colorPorDefecto("produccion"), opts.porcentajeBeige),
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(nSala + 2)], ["Bayetas", "4"], ["Trapos de horno", "4"],
    ["Bandeja camareros", String(nSala)],
    ["Litos (paño bandeja camarero)", String(nSala)],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  // En un rodaje se come DOS veces: el desayuno de la mañana y la comida. Las dos con
  // cubierto, y el desayuno además con su plato pequeño. Así que los cubiertos van
  // siempre para dos servicios y el plato de postre lleva uno por cabeza de más — no
  // depende de la casilla "Hay desayuno", que es para el evento suelto que lo pide.
  const cubiertosProdu = conMargen(totalPax * 2);
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + totalPax;
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  cats.push({ nombre: "Vajilla y Cubertería", items: [
    opt(!soloBandeja && llevaPlatos, [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)]),
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ...((!soloBandeja && llevaPlatos) ? [
      ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ] : []),
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosProdu)],
      ["Cuchillos grandes", String(cubiertosProdu)],
      ["Cucharas grandes", String(cubiertosProdu)],
      ["Cucharas postre", String(cubiertosProdu)],
    ] : []),
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))], ["Abridores de cerveza", "2"],
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    // Las metálicas van fijas, no por gente: son las que hay en el almacén y se cargan
    // todas. En un rodaje se usan para todo, y por gente salían 2 en un día de 40
    // personas, que es la mitad de las que de verdad se acaban usando.
    ["Bandejas metálicas", "10"],
    ["Bandejas metálicas brillantes", "8"],
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
  ]});

  // Todo lo de esta categoría se gasta: con varios días se calcula sobre la suma
  // de pax de todos los días (paxConsumo), no sobre el día más grande
  cats.push({ nombre: "Desechables y Bebidas", items: [
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(paxConsumo))], ["Servilletas grandes (extra)", conSufijo(conMargen(paxConsumo / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(paxConsumo * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(paxConsumo * 3.5 / 100), "paq. (100)")],
    ["Bandejas de cartón blancas", conSufijo(Math.ceil(paxConsumo / 20), "paq.")], ["Blondas", conSufijo(Math.ceil(paxConsumo / 20), "paq.")],
    ["Platitos de cartón", String(paxConsumo)], ["Envase bocadillos", String(paxConsumo)],
    ["Palitos brocheta", conSufijo(Math.ceil(paxConsumo / 20), "paq.")], ["Palitos café", conSufijo(Math.ceil(paxConsumo / 30), "paq.")],
    ["Calentador de agua", "1"], ["Kit té matcha", "1"],
    ["Cacao", conSufijo(1, "bote")], ["Canela", conSufijo(1, "bote")], ["Leche condensada", conSufijo(1, "lata")],
    // En un rodaje se bebe todo el día (café, agua, refrescos), así que no basta con
    // un vaso por persona: se calculan 4 por pax y día, más 1,2 extra si hay desayuno.
    // Antes salía 1 solo paquete para 25 pax, que son 2 vasos por persona en toda la
    // jornada.
    ["Vasos de cartón (L/M/S)", conSufijo(Math.max(2, Math.ceil(paxConsumo * (4 + (hayDesayuno ? 1.2 : 0)) / 50)), "paq. (50 uds)")], ["Bolsas grandes de papel", conSufijo(1, "paq.")],
    // Los vasos del personal van aquí, con el resto de vasos, y no en Limpieza
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    // Mismo volumen total que antes (1,5 Coca + 0,8 Fanta/Aquarius por pax), repartido
    // en cada bebida por separado en vez de en dos líneas combinadas
    ["Coca-Cola normal", String(Math.round(paxConsumo * 0.94))], ["Coca-Cola Zero", String(Math.round(paxConsumo * 0.56))],
    ["Fanta naranja", String(Math.round(paxConsumo * 0.24))], ["Fanta limón", String(Math.round(paxConsumo * 0.2))],
    ["Aquarius", String(Math.round(paxConsumo * 0.24))],
    // En producción el agua de beber son las CAJAS de 33cl (35 uds). El ratio va por
    // temporada: en un rodaje de doce horas al sol se bebe el doble que en enero, y
    // con 3,5 fijas se salía con poco más de un litro por cabeza y día. La de 1,5L es
    // solo un extra por si hace falta (paella, lavar, beber el personal), no va por
    // pax — un par de packs por día es de sobra.
    ["Aguas pequeñas (33cl)", conSufijo(
      Math.max(1, Math.ceil(paxConsumo * BOTELLAS_AGUA_POR_PAX[mesVerano ? "verano" : "invierno"] / 35)),
      // Corto a propósito: el sufijo va en la misma fila que el nombre y los botones,
      // y uno largo empujaba los de editar y borrar fuera de la pantalla en un móvil.
      `35 uds · ${mesVerano ? "verano" : "invierno"} ${String(BOTELLAS_AGUA_POR_PAX[mesVerano ? "verano" : "invierno"]).replace(".", ",")}/pax`
      + `${opts.tipoAguaPequena ? ` · ${opts.tipoAguaPequena.toLowerCase()}` : ""}`)],
    ["Agua 1,5L (extra: paella, lavar, personal)", conSufijo(2 * nDias, "packs")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks * nDias, "packs (6 uds)")],
    ["Agua con gas", String(Math.round(paxConsumo * 0.15))],
    ["Hielo", conSufijo(Math.max(2, Math.ceil(paxConsumo / 30)), "taxis")],
  ]});

  // En producciones/rodajes va una cafetera de mantenimiento aparte, encendida todo el
  // día para el equipo (café continuo), además de la de servicio que calcula calcCafe.
  const cafeProduccion = calcCafe(totalPax, tipoCafetera, hayDesayuno, paxConsumo, true, CAPSULAS_POR_PAX_PRODUCCION);
  cafeProduccion.items.push(["Cafetera de mantenimiento (rodaje, siempre encendida)", "1"]);
  cats.push(cafeProduccion);

  cats.push({ nombre: "Limpieza y Despensa", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")], ["Papel Chemine", conSufijo(3, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Cajas vacías", "2"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Hojas de fichaje", "1"],
  ]});

  return cats;
}

// ─── WORD EXPORT ──────────────────────────────────────────────────────────────
// Un item sin cantidad real (vacío, solo "—" a decidir in situ, o en 0 porque no
// hace falta ninguno) no aporta nada a la hora de cargar el camión ni de imprimir
// — se queda fuera de Modo carga, Vista previa y Word/PDF, pero sigue editable en
// la checklist principal de la app por si se quiere rellenar a mano.
function tieneCantidadVisible(qty) {
  const v = String(qty && qty.u ? qty.u : qty).trim();
  return v !== "" && v !== "—" && v !== "-" && v !== "0";
}

function quitarItemsSinCantidad(checklist) {
  return checklist
    .map(cat => ({ ...cat, items: cat.items.filter(([, qty]) => tieneCantidadVisible(qty)) }))
    .filter(cat => cat.items.length > 0);
}

// ─── RESUMEN DE CAMBIOS REMOTOS (para el aviso de sincronización) ──────────────
const ETIQUETAS_CAMPO = {
  evento: "Tipo de evento", nombreEvento: "Nombre del evento", fechaEvento: "Fecha",
  horaInicio: "Hora de inicio", ubicacion: "Ubicación", notasEvento: "Notas", pax: "Pax adultos", ninos: "Niños",
  barraCoctel: "Barra cóctel", horasCoctel: "Horas de cóctel", barraCopas: "Barra copas", horasCopas: "Horas de copas",
  diasProduccion: "Días de producción",
  dobleServicio: "Doble servicio", tamanoBarril: "Barril de cerveza", numBarriles: "Nº de barriles", llevaEntrante: "Entrante de chupito", llevaCanapes: "Lleva canapés", soloBandeja: "Servicio solo en bandeja",
  llevaPaella: "Lleva paella", tipoPaella: "Tamaño de paella", numPaellas: "Nº de paellas",
  estiloPlatoPrincipal: "Estilo plato principal", estiloPlatoPostre: "Estilo plato postre",
  llevaArmarioCaliente: "Armario caliente", llevaPlanchaGas: "Plancha de gas", numPlanchasGas: "Nº planchas de gas", llevaPlatos: "Platos", llevaPlatosPostre: "Platos de postre", llevaCubiertos: "Cubiertos", numCamareros: "Nº camareros", paxPorCamarero: "Pax por camarero", numStaff: "Nº staff", tipoBandejas: "Bandejas",
  tipoHorno: "Horno", tipoBBQ: "Barbacoa", estacion: "Temporada", tieneBrindisCava: "Brindis con cava",
  tieneFrituras: "Frituras", numFrituras: "Nº frituras", fuerzaTextilTela: "Servilletas de tela",
  llevaChillOut: "Chill out", numChillOut: "Nº chill out",
  llevaPalomitera: "Palomitera", llevaJarrasCristal: "Jarras de cristal", tipoCafetera: "Cafetera",
  llevaCarpas: "Carpas", llevaGenerador: "Generador",
  llevaMobiliarioAlquiler: "Mobiliario de alquiler", alquilaCarpas: "Carpas de alquiler", numCarpas: "Nº de carpas",
  extraBandejasMadera: "Bandejas madera extra", extraBandejasPlata: "Bandejas plata extra",
  llevaJamonero: "Jamonero", llevaTarta: "Lleva tarta", personasPorPlatoEntrante: "Personas por plato de entrante",
  entranteCompartido: "Entrante compartido", numEntrantesCompartir: "Nº de entrantes a compartir",
  llevaAguasPequenas: "Aguas pequeñas", tipoAguaPequena: "Envase de las aguas pequeñas", hayDesayuno: "Desayuno",
  tipoNevera: "Nevera", tipoCongelador: "Congelador", origenSillas: "Sillas",
  logisticaEquipo: "Equipo de logística", tarifaLogistica: "Tarifa de logística", plusFurgoneta: "Plus de furgoneta",
  recogidas: "Recogidas", compras: "Compras",
  itemsManuales: "Items añadidos a mano", overridesManuales: "Cantidades editadas a mano",
  itemsOcultos: "Items quitados", nombresManuales: "Nombres corregidos", categoriasRenombradas: "Categorías renombradas", ordenCategorias: "Orden de las categorías",
  itemsAlquilerManual: "Items marcados como alquiler proveedor",
  preparados: "Items marcados como preparados", checkeados: "Items marcados como cargados",
  marcasRevisar: "Items con la cantidad cambiada tras marcarlos",
  vueltos: "Items marcados como vueltos", roturas: "Roturas contadas",
  notasCheck: "Recordatorios de notas hechos",
  valoresCalculados: "Foto de cantidades automáticas",
};

// Compara el estado anterior y el recibido y devuelve frases cortas ("Pax adultos: 65 → 88")
function resumirCambios(prev, nuevo) {
  const cambios = [];
  const claves = new Set([...Object.keys(prev || {}), ...Object.keys(nuevo || {})]);
  claves.forEach(k => {
    if (k === "eventoNubeId") return;
    const a = prev?.[k], b = nuevo?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const etiqueta = ETIQUETAS_CAMPO[k] || k;
    // Las cantidades se dicen UNA A UNA, con nombre y con el antes y el después. Es lo
    // que de verdad tiene que ver quien está cargando el camión: "Regletas: 3 → 5" le
    // dice qué volver a contar; "Cantidades editadas a mano (modificado)", nada.
    if (k === "overridesManuales") {
      cambiosDeCantidad(a, b).forEach(t => cambios.push(t));
      return;
    }
    // Y esta es la consecuencia de la anterior, no un cambio aparte: decirla también
    // sería contar dos veces lo mismo en un aviso que solo enseña las cuatro primeras.
    if (k === "marcasRevisar") return;
    if (typeof b === "boolean" || typeof a === "boolean") {
      cambios.push(`${etiqueta}: ${b ? "sí" : "no"}`);
    } else if (Array.isArray(a) || Array.isArray(b) || typeof a === "object" || typeof b === "object") {
      const na = Array.isArray(a) ? a.length : Object.keys(a || {}).length;
      const nb = Array.isArray(b) ? b.length : Object.keys(b || {}).length;
      cambios.push(na !== nb ? `${etiqueta}: ${na} → ${nb}` : `${etiqueta} (modificado)`);
    } else {
      const fmt = (v) => (v === "" || v === null || v === undefined) ? "—" : v;
      cambios.push(`${etiqueta}: ${fmt(a)} → ${fmt(b)}`);
    }
  });
  return cambios;
}

// Horas trabajadas entre dos horas "HH:MM" (si acaba pasada la medianoche, suma 24h)
function horasLogistica(inicio, fin) {
  if (!inicio || !fin) return null;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let h = (hf + mf / 60) - (hi + mi / 60);
  if (h < 0) h += 24;
  return Math.round(h * 4) / 4; // redondeo al cuarto de hora
}

// Importe de una persona de logística: horas × tarifa + plus de furgoneta si lo lleva
function importeLogistica(p, tarifa, plusFurgo) {
  const h = horasLogistica(p.inicio, p.fin);
  if (h === null) return null;
  // "Nómina": ya cobra su sueldo, no suma coste por horas al evento (solo la furgoneta
  // si la pone). "Extra" (por defecto): se paga por horas × tarifa + plus de furgoneta.
  const costeHoras = p.tipo === "nomina" ? 0 : h * (tarifa || 0);
  return Math.round((costeHoras + (p.furgoneta ? (plusFurgo || 0) : 0)) * 100) / 100;
}

// "Juan 08:00–13:30 (5,5h · 55€) · Pedro 09:00–14:00 (5h · 70€ con furgo)"
function fmtLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return equipo
    .filter(p => p.nombre || p.inicio || p.fin)
    .map(p => {
      const h = horasLogistica(p.inicio, p.fin);
      const imp = importeLogistica(p, tarifa, plusFurgo);
      const horario = p.inicio || p.fin ? ` ${p.inicio || "?"}–${p.fin || "?"}` : "";
      const tipoTxt = p.tipo === "nomina" ? " nómina" : "";
      const detalle = h !== null ? ` (${String(h).replace(".", ",")}h · ${String(imp).replace(".", ",")}€${p.furgoneta ? " con furgo" : ""}${tipoTxt})` : (tipoTxt ? ` (${tipoTxt.trim()})` : "");
      return `${p.nombre || "¿?"}${horario}${detalle}`;
    })
    .join(" · ");
}

// Total en € de todo el equipo de logística (solo personas con horario completo)
function totalLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return Math.round(equipo.reduce((acc, p) => acc + (importeLogistica(p, tarifa, plusFurgo) || 0), 0) * 100) / 100;
}

// Estimación (en minutos) del tiempo de Preparación / Carga / Descarga / Montaje.
// Carga y descarga se reparten entre la gente de logística; la descarga lleva recargo por
// fatiga según las horas de jornada. El Montaje (colocar mesas, decoración, montar cocina
// in situ) es tiempo de todo el equipo — se estima como tiempo transcurrido (no se divide
// por logística), en línea con el estándar del sector (~2-4 h para un evento medio).
// Compartida entre Modo carga y el formulario (para sugerir la hora de fin de logística).
const CARGA_BASE_MIN = 20, CARGA_MIN_POR_ITEM = 1.5, DESCARGA_FACTOR = 0.6;
const PREP_BASE_MIN = 30, PREP_MIN_POR_PAX = 1, PREP_MIN_POR_ITEM = 0.5;
const MONTAJE_BASE_MIN = 45, MONTAJE_MIN_POR_PAX = 1.1, MONTAJE_MIN_POR_ITEM = 0.4;
const FATIGA_DESDE_H = 4, FATIGA_POR_HORA = 0.08, FATIGA_MAX = 0.6;
// El tiempo por item se cobraba igual en un evento de 25 pax que en uno de 200, y no
// es así: una produción de 25 pax tiene casi las mismas LÍNEAS de checklist que una
// boda de 150 (128 frente a 136) — lo que cambia es el volumen de cada línea, no
// cuántas hay. Se escala con la raíz del pax (el volumen crece, pero manejar 10 cajas
// no cuesta 10 veces manejar 1) tomando 100 pax como referencia, que es donde se
// calibró el modelo contra los tiempos de otros caterings: ahí el factor es 1 y los
// tiempos no se mueven. Los topes evitan disparates en los extremos.
const VOLUMEN_REF_PAX = 100, VOLUMEN_MIN = 0.45, VOLUMEN_MAX = 1.6;
const factorVolumen = (pax) =>
  Math.min(VOLUMEN_MAX, Math.max(VOLUMEN_MIN, Math.sqrt(Math.max(0, pax || 0) / VOLUMEN_REF_PAX)));
// Repartir el trabajo entre N personas NO divide el tiempo entre N: hay una parte
// que no se puede paralelizar (colocar la furgoneta, repasar la hoja, coordinarse) y
// cuellos de botella físicos (una puerta, un montacargas, una cocina). Se modela como
// en cualquier planificación de obra: una parte fija en serie + el resto repartido
// entre un equipo "efectivo" que crece por debajo de lo lineal.
//   1 persona → 1,00   ·   2 → 1,87   ·   3 → 2,69   ·   4 → 3,48   ·   5 → 4,26
const EXPONENTE_EQUIPO = 0.9;
const equipoEfectivo = (n) => Math.pow(Math.max(1, n || 1), EXPONENTE_EQUIPO);
// ─── CALIBRACIÓN CON LOS TIEMPOS REALES ───────────────────────────────────────
// Las constantes de arriba son estimaciones del sector. En cuanto hay eventos con
// el cronómetro usado, se comparan con lo estimado y se saca un factor por fase:
// si de verdad se tarda un 20% más cargando, las próximas estimaciones lo reflejan.
// Se usa la MEDIANA (no la media) para que un evento raro no descoloque el ajuste, y
// hacen falta al menos 3 eventos medidos por fase para fiarse.
const MIN_EVENTOS_CALIBRAR = 3;
const FASES_TIEMPO = ["prep", "carga", "descarga", "montaje"];
function medianaFactor(valores) {
  if (valores.length < MIN_EVENTOS_CALIBRAR) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const m = orden.length % 2
    ? orden[(orden.length - 1) / 2]
    : (orden[orden.length / 2 - 1] + orden[orden.length / 2]) / 2;
  // Se acota entre la mitad y el triple: un factor fuera de ahí es un cronómetro
  // que se dejó corriendo, no un dato real.
  return Math.min(3, Math.max(0.5, m));
}
function calcularCalibracion(eventosGuardados = {}) {
  const ratios = { prep: [], carga: [], descarga: [], montaje: [] };
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !ev.cronos) return;
    const items = (ev.totalItemsCarga ?? 0) || contarItemsCarga(ev);
    if (!items) return;
    const est = estimarTiemposCarga({
      totalItems: items,
      pax: (ev.pax || 0) + (ev.ninos || 0),
      numLogistica: numLogisticaDe(ev),
      horasJornada: horasJornadaDe(ev),
    }, null);
    FASES_TIEMPO.forEach(f => {
      const real = (ev.cronos[f] && ev.cronos[f].ms) || 0;
      const estimado = est[`${f}Min`] * 60000;
      if (real > 60000 && estimado > 0) ratios[f].push(real / estimado);
    });
  });
  const factores = {};
  let nMedidos = 0;
  FASES_TIEMPO.forEach(f => {
    const factor = medianaFactor(ratios[f]);
    if (factor !== null) { factores[f] = factor; nMedidos = Math.max(nMedidos, ratios[f].length); }
  });
  return Object.keys(factores).length ? { factores, nMedidos } : null;
}
function numLogisticaDe(ev) {
  const n = (ev.logisticaEquipo || []).filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length;
  return n > 0 ? n : Math.max(1, Math.ceil((ev.pax || 0) / 60));
}
function horasJornadaDe(ev) {
  return (ev.logisticaEquipo || []).reduce((mx, p) => { const h = horasLogistica(p.inicio, p.fin); return h && h > mx ? h : mx; }, 0);
}
// Nº de items que se cargan de verdad en un evento guardado (sin los que no llevan
// cantidad y sin "Personal"), para poder comparar su tiempo real con el estimado.
function contarItemsCarga(ev) {
  try {
    return quitarItemsSinCantidad(checklistDeEventoGuardado(ev))
      .filter(c => !/personal/i.test(c.nombre))
      .reduce((a, c) => a + c.items.length, 0);
  } catch (e) { return 0; }
}

function estimarTiemposCarga({ totalItems = 0, pax = 0, numLogistica = 1, horasJornada = 0 }, calibracion) {
  const nEf = equipoEfectivo(numLogistica);
  const f = (fase) => (calibracion && calibracion.factores[fase]) || 1;
  const reparte = (base, trabajo, fase) => Math.round((base + trabajo / nEf) * f(fase));
  const vol = factorVolumen(pax);
  const prepMin = totalItems > 0 ? reparte(PREP_BASE_MIN, pax * PREP_MIN_POR_PAX + totalItems * PREP_MIN_POR_ITEM * vol, "prep") : 0;
  const cargaMin = totalItems > 0 ? reparte(CARGA_BASE_MIN, totalItems * CARGA_MIN_POR_ITEM * vol, "carga") : 0;
  const fatiga = Math.min(FATIGA_MAX, Math.max(0, (horasJornada - FATIGA_DESDE_H) * FATIGA_POR_HORA));
  // La recogida va más rápida que la carga (todo va a granel a las cajas), pero lleva
  // recargo por fatiga: es lo último de una jornada larga.
  const descargaMin = Math.round(cargaMin * DESCARGA_FACTOR * (1 + fatiga) * (f("descarga") / f("carga")));
  const montajeMin = totalItems > 0 ? reparte(MONTAJE_BASE_MIN, pax * MONTAJE_MIN_POR_PAX + totalItems * MONTAJE_MIN_POR_ITEM * vol, "montaje") : 0;
  return { prepMin, cargaMin, descargaMin, montajeMin, fatiga, totalMin: prepMin + cargaMin + descargaMin + montajeMin };
}
// "08:30" + 150 min → "11:00" (sumar minutos a una hora HH:MM, con vuelta de día)
function sumarMinutosHora(hhmm, minutos) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(minutos)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Recogidas: alquileres/equipo de otros proveedores a devolver o recoger en fecha/hora concreta
function fmtRecogidas(recogidas = []) {
  return recogidas
    .filter(r => r.concepto)
    .map(r => {
      const fechaFmt = r.fecha ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const cuando = [fechaFmt, r.hora].filter(Boolean).join(" ");
      const devFmt = r.fechaDevolucion ? new Date(r.fechaDevolucion + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const partes = [
        cuando ? `${cuando}${r.recogido ? " ✓" : ""}` : (r.recogido ? "recogido ✓" : ""),
        devFmt ? `devuelve ${devFmt}${r.devuelto ? " ✓" : ""}` : "",
      ].filter(Boolean).join(", ");
      return partes ? `${r.concepto} (${partes})` : r.concepto;
    })
    .join(" · ");
}

// Compras: lo que hay que comprar antes del evento, con su cantidad y cuándo
function fmtCompras(compras = []) {
  return compras
    .filter(c => c.concepto)
    .map(c => {
      const fechaFmt = c.fecha ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const partes = [c.cantidad, fechaFmt, c.comprado ? "✓" : ""].filter(Boolean).join(" ");
      return partes ? `${c.concepto} (${partes})` : c.concepto;
    })
    .join(" · ");
}

function generarHTMLWord(evtKey, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklistCompleta, meta = {}) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  const preparados = meta.preparados || {};
  const checkeados = meta.checkeados || {};
  const vueltos = meta.vueltos || {};
  const roturas = meta.roturas || {};
  const cols = ["Concepto", "Cant.", "Prep. ✓", "Sale ✓", "Vuelve ✓", "Roturas"];
  const tablaHTML = (items, catNombre) => `
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${items.map(([label, qty, , labelOriginal, esAlquilerManual, sufijo], i) => {
        const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
        const key = `${catNombre}::${labelOriginal ?? label}`;
        const prep = preparados[key] ? "✓" : "";
        const sale = checkeados[key] ? "✓" : "";
        const vuelve = vueltos[key] ? "✓" : "";
        const rot = roturas[key] || "";
        return `<tr style="background:${alq ? "#fdf6e3" : i % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="padding:5px 6px;">${label}${alq ? ' <b style="color:#b45309;font-size:9pt;">[ALQUILER]</b>' : ""}</td>
          <td style="padding:5px 6px;font-weight:bold;color:#16a34a;">${fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${prep}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${sale}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${vuelve}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#dc2626;">${rot}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  const secciones = checklist.map(cat => `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${cat.nombre}</h3>${tablaHTML(cat.items, cat.nombre)}`).join("");
  // Recogidas y compras iban solo en pantalla: en el documento que se lleva la furgoneta
  // no aparecían. Ahora van como secciones propias, con su casilla para marcar en papel.
  const tablaSimple = (titulo, cols, filas) => filas.length === 0 ? "" : `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${titulo}</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${filas.map((f, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">${f.map((celda, j) => `<td style="padding:5px 6px;${j === f.length - 1 ? "width:60px;text-align:center;font-weight:bold;color:#16a34a;" : ""}">${celda}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const fmtFecha = (f) => f ? new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
  const seccionRecogidas = tablaSimple("Recogidas y devoluciones", ["Concepto", "Recoger", "Devolver", "Hecho"],
    (meta.recogidas || []).filter(r => r.concepto).map(r => [
      r.concepto,
      [fmtFecha(r.fecha), r.hora].filter(Boolean).join(" ") || "—",
      fmtFecha(r.fechaDevolucion) || "—",
      r.recogido || r.devuelto ? "✓" : "",
    ]));
  const seccionCompras = tablaSimple("Compras", ["Concepto", "Cantidad", "Cuándo", "Hecho"],
    (meta.compras || []).filter(c => c.concepto).map(c => [
      c.concepto, c.cantidad || "—", fmtFecha(c.fecha) || "—", c.comprado ? "✓" : "",
    ]));
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Checklist ${EVENTOS[evtKey]?.label} · ${pax} pax</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#222;}h1{color:#1f314d;font-size:18pt;}
    .meta{display:flex;flex-wrap:wrap;gap:12px 32px;background:#f3f4f6;padding:12px 16px;border-radius:4px;margin:16px 0;font-size:10pt;}
    .ml{font-weight:bold;color:#555;font-size:9pt;text-transform:uppercase;display:block;}
    .notas{margin-top:24px;border:1px solid #ddd;padding:12px;min-height:80px;border-radius:4px;}
    @media print{body{margin:10px}}</style>
    </head><body>
    <h1>${meta.nombreEvento ? meta.nombreEvento.toUpperCase() : `CHECKLIST DE EVENTO — ${EVENTOS[evtKey]?.label?.toUpperCase()}`} · ${pax} PAX</h1>
    <div class="meta">
      ${meta.nombreEvento ? `<div><span class="ml">Tipo de evento</span>${EVENTOS[evtKey]?.label}</div>` : ""}
      ${fechaEventoFmt ? `<div><span class="ml">Fecha del evento</span>${fechaEventoFmt}</div>` : ""}
      ${meta.horaInicio ? `<div><span class="ml">Hora de inicio</span>${meta.horaInicio}h</div>` : ""}
      ${meta.ubicacion ? `<div><span class="ml">Ubicación</span>${meta.ubicacion}</div>` : ""}
      ${fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) ? `<div><span class="ml">Equipo logística</span>${fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)}${totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) > 0 ? ` — Total ${String(totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)).replace(".", ",")}€` : ""}</div>` : ""}
      ${fmtRecogidas(meta.recogidas) ? `<div><span class="ml">Recogidas</span>${fmtRecogidas(meta.recogidas)}</div>` : ""}
      <div><span class="ml">Fecha generación</span>${fecha}</div>
      <div><span class="ml">PAX total</span>${(() => {
        const dias = evtKey === "produccion" ? (meta.diasProduccion || []).map(d => parseInt(d, 10)).filter(n => n > 0) : [];
        return dias.length ? `${dias.join(" + ")} pax (${dias.length} días de producción)` : `${pax + ninos} (${pax} adultos${ninos > 0 ? ` + ${ninos} niños` : ""})`;
      })()}</div>
      ${evtKey !== "produccion" ? `<div><span class="ml">Barra libre</span>${barraCoctel ? `Cóctel ${horasCoctel}h` : "—"}${barraCopas ? ` + Copas ${horasCopas}h` : ""}</div>` : ""}
    </div>
    ${secciones}
    ${seccionRecogidas}
    ${seccionCompras}
    <div class="notas"><strong>NOTAS:</strong><br/>${meta.notasEvento ? `<p style="white-space:pre-wrap;margin:6px 0;">${meta.notasEvento}</p>` : "<br/>"}</div>
    </body></html>`;
}

// ─── CATÁLOGO DE PRECIOS (para el coste estimado en Modo carga → Resumen) ──────
// Precio por unidad de cada item, guardado en este navegador y compartido entre
// TODOS los eventos (el precio de "Copas de vino" es el mismo en cualquier boda,
// no depende del evento) — se busca por el nombre exacto del item.
// Precios de partida sacados de "Resumen Eventos.xlsx" (coste unitario estimado,
// consistente en las ~24 hojas de eventos reales). Cualquier precio pegado en
// "💶 Precios" pisa al de aquí y queda guardado en el navegador.
const PRECIOS_BASE = {
  // Bebidas y hielo
  "Cerveza Alhambra (tercios)": 0.49, // caja de 24 a 11,76€
  "Vino blanco": 4.1,                 // Nebla blanco
  "Vino tinto": 5.22,                 // Nebla tinto
  "Cava": 3.99,                       // El Miracle
  "Agua 1,5L (Solán de Cabras, cliente)": 4.06, // pack de 6 a 0,68€/botella
  "Coca-Cola normal": 0.6,
  "Coca-Cola Zero": 0.58,
  "Fanta naranja": 0.54,
  "Fanta limón": 0.54,
  "Aquarius": 0.68,
  "Nestea": 0.74,
  "Tónica": 1.51,
  "Agua con gas": 1.18,
  "Cerveza 0,0": 0.95,
  "Redbull": 1.0,
  "Vermut rojo": 6.3,
  "Vermut blanco": 4.1,
  // Alcoholes y licores
  "Ginebra (Seagrams/Tanqueray)": 13.05,
  "Ginebra de sabor (Puerto de Indias)": 11.24,
  "Ron (Bacardí)": 14.85,
  "Ron saborizado (Negrita)": 8,
  "Tequila": 12.87,
  "Tequila Rosa": 6.7,
  "Vodka": 10.9, // Absolut
  "Baileys": 10.26,
  "Limoncello": 5.99,
  "Peche (licor de melocotón)": 5.99,
  "Cazalla": 8.45,
  "Orujo de hierbas": 7.8,
  "Ballantines": 9.25,
  "Barceló": 12.48,
  "Martini": 8.05,
  "Otros licores marca blanca (Smirnoff)": 11.15,
  // Bebidas que faltaban por precio — ESTIMADOS de mercado, ajustar con la tarifa real
  // del proveedor (Bebidas Serrano). Son un punto de partida para que el Resumen no deje
  // huecos; cualquier precio pegado en "Precios" pisa estos.
  "Sprite": 0.54,
  "Cerveza sin gluten": 0.95,
  "Tinto de verano (1,5L)": 2.5,
  "Aguas pequeñas (33cl)": 6.5,                    // caja de 35 uds
  "Agua Vidaqua 1,5L (personal)": 2.4,             // pack de 6
  "Agua 1,5L (extra: paella, lavar, personal)": 4, // pack de 6
  "Mistela": 5.5,
  "Tía María": 13,
  "Jagger (Jägermeister)": 15,
  "Crema de orujo": 7.8,
  "Crema de arroz": 6,
  // ─── Vajilla ────────────────────────────────────────────────────────────────
  // Todo este catálogo va SIN IVA, igual que las bebidas. Ojo con IKEA: publica sus
  // precios CON IVA (es venta a particular), así que hay que quitárselo antes de
  // apuntarlo aquí o el coste del evento sale un 21% inflado frente al resto.
  // STRIMMIG, plato de gres gris-verde claro de 27 cm: 16,99€ el paquete de 4 con IVA
  // → 4,25€/ud con IVA → 3,51€/ud sin IVA. Comprobado en ikea.es (agosto 2026).
  // La etiqueta lleva el estilo dentro porque el selector de platos lo cambia; el precio
  // va sobre el nombre completo, así que solo aplica al verde.
  "Platos trinchero (Verde)": 3.51,
  // STRIMMIG plato de postre, mismo gres gris-verde claro, 21 cm: 14,99€ el paquete de
  // 4 con IVA → 3,75€/ud con IVA → 3,10€/ud sin IVA.
  "Platos postre (Verde)": 3.10,
  // ─── Cristalería (Makro) ────────────────────────────────────────────────────
  // Makro es venta a profesional: sus precios YA vienen sin IVA, así que van tal cual,
  // sin dividir entre 1,21 como los de IKEA.
  //   Copa de vino Lena 53cl ... 9,78€ / 6 → 1,63€
  //   Vaso de cubata 50cl ...... 7,22€ / 6 → 1,20€
  //   Vaso de agua 36cl ........ 7,92€ / 6 → 1,32€
  // Van por duplicado con y sin "(doble)" porque el interruptor de doble servicio
  // cambia la ETIQUETA del item ("Copas de vino" → "Copas de vino (doble)"), y el
  // precio se busca por el nombre completo: sin las dos, el evento que más copas
  // gasta sería justo el que sale sin coste.
  "Copas de vino": 1.63,
  "Copas de vino (doble)": 1.63,
  "Vasos de agua": 1.32,
  "Vasos de agua (doble)": 1.32,
  "Vasos de cubata": 1.20,
  //   Copa de cava ............. 9,78€ / 6  → 1,63€
  //   Vaso de chupito cristal .. 12,88€ / 12 → 1,07€
  "Copas de cava": 1.63,
  "Vasos chupito cristal (entrante)": 1.07,
};
function leerPrecios() {
  try { return { ...PRECIOS_BASE, ...JSON.parse(localStorage.getItem("gula_precios_items") || "{}") }; }
  catch (e) { return { ...PRECIOS_BASE }; }
}
function guardarPrecios(precios) {
  try { localStorage.setItem("gula_precios_items", JSON.stringify(precios)); }
  catch (e) { /* localStorage no disponible */ }
}
// Pega líneas "Item: 1,50" o "Item 1.50" (mismo formato que "Añadir varios items") y
// las fusiona con el catálogo existente sin perder precios que no se han vuelto a pegar
function parsePreciosPegados(texto) {
  const precios = {};
  texto.split("\n").map(l => l.trim()).filter(Boolean).forEach(linea => {
    const m = linea.match(/^(.*\S)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*€?\s*$/) || linea.match(/^(.*\S)\s{2,}(\d+(?:[.,]\d+)?)\s*€?\s*$/);
    if (m) precios[m[1].trim()] = parseFloat(m[2].replace(",", "."));
  });
  return precios;
}

// ─── TEMA CLARO/OSCURO ────────────────────────────────────────────────────────
// El automático va por horario: oscuro de noche, claro de día. Las horas son las de la
// jornada de un catering — a las 20:00 ya se monta con luz artificial.
export const HORA_OSCURO = 20, HORA_CLARO = 7;
export function esHoraDeOscuro(ahora = new Date()) {
  const h = ahora.getHours();
  return h >= HORA_OSCURO || h < HORA_CLARO;
}
export function leerPreferenciaTema() {
  try {
    const g = localStorage.getItem("gula_tema");
    if (g === "claro" || g === "oscuro" || g === "auto") return g;
  } catch (e) { /* localStorage no disponible */ }
  return "auto";
}
export function temaSegunPreferencia(pref, ahora = new Date()) {
  if (pref === "claro" || pref === "oscuro") return pref;
  return esHoraDeOscuro(ahora) ? "oscuro" : "claro";
}

// Normaliza un texto para buscar sin importar tildes ni mayúsculas.
function _norm(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Los conceptos de las recogidas se escriben con el verbo delante ("Recoger
// generador"), y al reutilizarlos para el aviso de devolución quedaba un
// "Devolución: Recoger generador" que se lee al revés. Para la devolución se deja
// solo el objeto: "Devolución: generador". Si al quitarlo no queda nada, se
// respeta el texto original tal cual.
function soloObjeto(concepto) {
  const txt = String(concepto ?? "");
  const limpio = txt.replace(/^\s*(recoger|recogida de|recogida|recojer)\s+/i, "").trim();
  return limpio || txt;
}

// ─── REVISIÓN DE DATOS GUARDADOS ──────────────────────────────────────────────
// Reconstruye la checklist (categorías + items) de un evento GUARDADO a partir de
// su configuración, para poder comparar sus marcas con los items que tendría hoy
// sin necesidad de abrirlo. Aplica las categorías renombradas y añade los items
// puestos a mano (la clave usa la etiqueta base del item).
function checklistDeEventoGuardado(ev) {
  if (!ev || !ev.evento) return [];
  const opts = {
    ...ev,
    tipoBBQ: (ev.tipoBBQ || "").toLowerCase(),
    tipoHorno: (ev.tipoHorno || "").toLowerCase(),
    numLogisticaEquipo: (ev.logisticaEquipo || []).filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
  };
  let cats;
  try {
    cats = buildChecklist(ev.evento, ev.pax || 0, ev.barraCoctel ? (ev.horasCoctel || 0) : 0, ev.barraCopas ? (ev.horasCopas || 0) : 0, ev.ninos || 0, opts);
  } catch (e) { return []; }
  const renom = ev.categoriasRenombradas || {};
  const salida = cats.map(c => ({ nombre: renom[c.nombre] ?? c.nombre, items: c.items.map(it => it[0]) }));
  (ev.itemsManuales || []).forEach(it => {
    const nombreCat = renom[it.categoria] ?? it.categoria ?? "Otros";
    let destino = salida.find(c => c.nombre === nombreCat);
    if (!destino) { destino = { nombre: nombreCat, items: [] }; salida.push(destino); }
    destino.items.push(it.label);
  });
  return salida;
}

// ─── DIÁLOGO PROPIO (sustituye a window.prompt/confirm, que rompen la estética) ─
// ─── SELECT CON OPCIÓN "OTRO..." ───────────────────────────────────────────────
// Como un <select> normal, pero con una opción "+ Otro..." al final que revela un
// campo de texto para escribir un valor que no esté en la lista (ej. un estilo de
// plato puntual que no se pide siempre). Los valores nuevos que se escriben se
// guardan en este navegador (localStorage, independiente del evento) para que la
// próxima vez ya aparezcan como una opción más de la lista, en cualquier evento.
function leerExtrasGuardados(clave) {
  try { return JSON.parse(localStorage.getItem(`gula_opciones_extra::${clave}`) || "[]"); }
  catch (e) { return []; }
}
function guardarExtra(clave, valor) {
  if (!valor || !valor.trim()) return;
  try {
    const actuales = leerExtrasGuardados(clave);
    if (!actuales.includes(valor)) localStorage.setItem(`gula_opciones_extra::${clave}`, JSON.stringify([...actuales, valor]));
  } catch (e) { /* localStorage no disponible */ }
}
function SelectConOtro({ label, value, onChange, options, opcionNinguna }) {
  const [extras, setExtras] = useState(() => leerExtrasGuardados(label));
  const opcionesCompletas = [...options, ...extras.filter(e => !options.includes(e))];
  const esPersonalizado = value && value !== opcionNinguna && !opcionesCompletas.includes(value);
  const [modoOtro, setModoOtro] = useState(false);
  const [texto, setTexto] = useState("");
  // Guarda el texto escrito como una opción reutilizable (en este navegador) y lo
  // deja seleccionado. Así queda disponible en la lista para cualquier otro evento.
  const anadirOtro = () => {
    const val = texto.trim();
    if (!val) return;
    guardarExtra(label, val);
    setExtras(prev => (prev.includes(val) ? prev : [...prev, val]));
    onChange(val);
    setTexto("");
    setModoOtro(false);
  };
  // Guarda como opción reutilizable un valor personalizado que venía cargado del
  // evento (aún no estaba en la lista), sin tener que reescribirlo.
  const guardarValorActual = () => {
    if (!value || !value.trim()) return;
    guardarExtra(label, value);
    setExtras(prev => (prev.includes(value) ? prev : [...prev, value]));
  };
  if (modoOtro) {
    return (
      <div className="form-group">
        <span className="form-label">{label}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            className="form-input"
            autoFocus
            placeholder="Ej: Relieve grande"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); anadirOtro(); } if (e.key === "Escape") { setModoOtro(false); setTexto(""); } }}
          />
          <button
            type="button"
            className="item-action-btn item-action-add"
            title="Añadir esta opción y guardarla para otros eventos"
            aria-label="Añadir opción"
            disabled={!texto.trim()}
            onClick={anadirOtro}
          ><Plus size={14} /></button>
          <button
            type="button"
            className="item-action-btn"
            title="Cancelar y volver a la lista"
            aria-label="Cancelar"
            onClick={() => { setModoOtro(false); setTexto(""); }}
          ><X size={14} /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <select
          className="form-select"
          style={{ flex: 1 }}
          value={value}
          onChange={e => { if (e.target.value === "__otro__") { setModoOtro(true); setTexto(""); } else onChange(e.target.value); }}
        >
          {opcionesCompletas.map(o => <option key={o} value={o}>{o}</option>)}
          {esPersonalizado && <option value={value}>{value}</option>}
          {opcionNinguna && <option value={opcionNinguna}>{opcionNinguna}</option>}
          <option value="__otro__">+ Otro...</option>
        </select>
        {esPersonalizado && (
          <button
            type="button"
            className="item-action-btn item-action-add"
            title="Guardar este valor como opción para otros eventos"
            aria-label="Guardar opción"
            onClick={guardarValorActual}
          ><Plus size={14} /></button>
        )}
      </div>
    </div>
  );
}

function Dialogo({ config, onCerrar }) {
  const [valor, setValor] = useState(config.valorInicial || "");
  const esPrompt = config.tipo === "prompt";
  const confirmar = () => {
    if (esPrompt && !valor.trim()) return;
    onCerrar();
    config.onConfirm(esPrompt ? valor.trim() : undefined);
  };
  return (
    <div className="dialogo-overlay" onClick={onCerrar}>
      <div className="dialogo-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={config.titulo}>
        <div className="dialogo-titulo">{config.titulo}</div>
        {config.mensaje && <p className="dialogo-mensaje">{config.mensaje}</p>}
        {esPrompt && (
          <input
            type="text"
            className="form-input"
            placeholder={config.placeholder || ""}
            value={valor}
            autoFocus
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") onCerrar();
            }}
          />
        )}
        <div className="dialogo-acciones">
          <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button
            className={`btn ${config.peligro ? "btn-peligro" : "btn-green"}`}
            onClick={confirmar}
            disabled={esPrompt && !valor.trim()}
          >{config.textoConfirmar || "Aceptar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL VISTA PREVIA ───────────────────────────────────────────────────────
function ModalVistaPrevia({ checklist: checklistCompleta, evtKey, pax, ninos, meta = {}, onClose, sinCerrar = false }) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  // Las columnas Sale/Vuelve/Roturas solo aparecen si hay algo marcado. Antes salían
  // siempre y en el móvil se comían 78px de ancho y 68 de alto (con las cabeceras
  // giradas en vertical para caber), para quedarse vacías: lo normal es mirar la hoja
  // ANTES del evento, cuando aún no se ha marcado nada. El Word y el PDF sí las llevan
  // siempre, que ahí sirven para ir marcando a mano sobre el papel.
  const algo = (o) => Object.values(o || {}).some(v => v !== "" && v !== false && v !== undefined);
  const hayMarcas = algo(meta.preparados) || algo(meta.checkeados) || algo(meta.vueltos) || algo(meta.roturas);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  // Todo lo que NO es nuestro, junto y arriba. Estaba marcado fila a fila, pero repartido
  // entre catorce categorías: para saber qué hay que devolver había que recorrer la hoja
  // entera. Es lo primero que necesita quien lleva el servicio, porque de eso responde
  // cuando acaba el evento.
  const alquileres = checklist.flatMap(cat => cat.items
    .filter(([label, , , , esAlquilerManual]) =>
      esAlquilerManual || PALABRAS_ALQUILER.some(pl => String(label).toLowerCase().includes(pl)))
    .map(([label, qty, , , , sufijo]) => ({
      label,
      cantidad: fmtCantidadCompleta(label, qty && qty.u ? qty.u : qty, sufijo),
    })));
  return (
    <div className={`preview-overlay ${sinCerrar ? "is-pantalla" : ""}`} onClick={sinCerrar ? undefined : onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title">{meta.nombreEvento || "Checklist de evento"}</div>
            <div className="preview-header-subtitle">
              {EVENTOS[evtKey]?.label} · {pax} pax{ninos > 0 ? ` · ${ninos} niños` : ""} · {fechaEventoFmt || fecha}
              {meta.horaInicio ? ` · ${meta.horaInicio}h` : ""}
              {meta.ubicacion ? ` · ${meta.ubicacion}` : ""}
            </div>
            {fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) && (
              <div className="preview-header-subtitle">
                <Truck size={14} /> Logística: {fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)}
                {totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) > 0 && ` — Total ${String(totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)).replace(".", ",")}€`}
              </div>
            )}
            {fmtRecogidas(meta.recogidas) && (
              <div className="preview-header-subtitle"><Package size={14} /> Recogidas: {fmtRecogidas(meta.recogidas)}</div>
            )}
            {fmtCompras(meta.compras) && (
              <div className="preview-header-subtitle"><ShoppingCart size={14} /> Compras: {fmtCompras(meta.compras)}</div>
            )}
          </div>
          {!sinCerrar && (
            <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar"><X size={14} /></button>
          )}
        </div>
        <div className="preview-body">
          {alquileres.length > 0 && (
            <div className="preview-alquileres">
              <div className="preview-alquileres-titulo">
                <Tag size={14} /> No es nuestro — hay que devolverlo ({alquileres.length})
              </div>
              <ul className="preview-alquileres-lista">
                {alquileres.map((a, i) => (
                  <li key={i}><span>{a.label}</span><strong>{a.cantidad}</strong></li>
                ))}
              </ul>
              {fmtRecogidas(meta.recogidas) && (
                <div className="preview-alquileres-fechas">
                  <Package size={13} /> {fmtRecogidas(meta.recogidas)}
                </div>
              )}
            </div>
          )}
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header" style={{ borderLeftColor: infoCategoria(cat.nombre).color }}>
                <span className="cat-icon-mini" style={{ background: infoCategoria(cat.nombre).color, color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} /></span>
                <span>{cat.nombre}</span>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cant.</th>
                      {hayMarcas && <th className="preview-check-cell">Prep.</th>}
                      {hayMarcas && <th className="preview-check-cell">Sale</th>}
                      {hayMarcas && <th className="preview-check-cell">Vuelve</th>}
                      {hayMarcas && <th className="preview-check-cell">Roturas</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map(([label, qty, , labelOriginal, esAlquilerManual, sufijo], i) => {
                      const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                      const key = `${cat.nombre}::${labelOriginal ?? label}`;
                      return (
                        <tr key={i} className={alq ? "is-rental" : ""}>
                          <td>
                            {label}
                            {alq && <span className="preview-rental-badge">ALQUILER</span>}
                          </td>
                          <td className="preview-qty-cell">{fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</td>
                          {hayMarcas && <td className="preview-check-cell">{(meta.preparados || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.checkeados || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.vueltos || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.roturas || {})[key] || ""}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="preview-notes">
            <strong>Notas</strong>
            {meta.notasEvento && <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: "0.88rem" }}>{meta.notasEvento}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODO CARGA (check interactivo, sincronizado por el link del evento) ──────
// Pantalla simple pensada para el móvil mientras se carga/descarga el camión. Dos
// modos: "Salida" (marcar lo que sale, antes del evento) y "Vuelta" (marcar lo que
// vuelve + contar roturas/pérdidas, al recoger). Todo se guarda en el mismo estado
// del evento que ya se sincroniza en tiempo real (eventoNubeId): si varias personas
// abren el link a la vez ven los checks de las demás al momento, y queda guardado en
// la nube para poder consultarlo o exportarlo cuando haga falta.
function ModalModoCarga({ checklist: checklistCompleta, preparados = {}, checkeados, vueltos, roturas, marcasRevisar = {}, onTogglePreparado, onToggleSale, onVuelve, onRoturas, notasCheck = {}, onToggleNota, cronos = {}, onCronoStart, onCronoPause, onCronoReset, onClose, sinCerrar = false, meta = {} }) {
  // Los items sin cantidad real ("—" o vacíos, a decidir in situ) no aportan nada
  // durante la carga — solo lían. Se quedan fuera aquí igual que en Word/Vista previa.
  // La categoría "Personal" (camareros/logística/cocina) es solo informativa: no se
  // carga ni se devuelve, así que también se deja fuera de Modo carga.
  const checklist = quitarItemsSinCantidad(checklistCompleta).filter(c => !/personal/i.test(c.nombre));
  const [modo, setModo] = useState("salida"); // preparacion | salida | vuelta
  const [verResumen, setVerResumen] = useState(false);
  const [precios, setPrecios] = useState(() => leerPrecios());
  const [editandoPrecios, setEditandoPrecios] = useState(false);
  const totalItems = checklist.reduce((acc, c) => acc + c.items.length, 0);
  // Items con cantidad numérica (los que se pueden "marcar todo vuelto"). Sirve para
  // alternar el botón entre marcar y desmarcar todo en la pestaña Vuelta.
  // Todas las filas de la Vuelta se pueden marcar, tengan número o no. Las que llevan
  // una cantidad en texto (ej. "Copas metálicas · Todas") se marcan con true, que la
  // app ya entiende como "volvió entero". Antes se quedaban fuera del "marcar todo"
  // y encima no tenían casilla propia: no había forma de darlas por vueltas.
  const itemsMarcables = checklist.flatMap(c => c.items
    .map(([, q, , lo]) => {
      const n = parseFloat(String(q && q.u ? q.u : q).replace(",", "."));
      return { key: `${c.nombre}::${lo}`, valor: isNaN(n) ? true : String(n) };
    }));
  const todoVuelto = itemsMarcables.length > 0 && itemsMarcables.every(it => { const v = vueltos[it.key]; return v !== undefined && v !== ""; });
  const contarSi = (cumple) => checklist.reduce((acc, c) => acc + c.items.filter(([, , , lo]) => cumple(`${c.nombre}::${lo}`)).length, 0);
  const totalPreparados = contarSi(k => preparados[k]);
  // Lo que está preparado pero todavía sin cargar. Es el camino normal —se prepara y
  // luego se sube al camión— así que subirlo de golpe ahorra repasar la lista entera
  // item a item. También es la vía para recuperar una carga que se haya perdido,
  // porque lo preparado y lo cargado suelen ser lo mismo.
  const preparadosSinCargar = checklist.flatMap(c => c.items
    .map(([, , , lo]) => `${c.nombre}::${lo}`)
    .filter(k => preparados[k] && !checkeados[k]));
  const totalMarcados = modo === "preparacion" ? totalPreparados
    : modo === "salida" ? contarSi(k => checkeados[k])
    : contarSi(k => { const v = vueltos[k]; return v !== undefined && v !== ""; });
  const palabraModo = modo === "preparacion" ? "preparados" : modo === "salida" ? "cargados" : "vueltos";
  // Items marcados a los que alguien les ha cambiado la cantidad DESPUÉS: siguen
  // marcados (es trabajo hecho, no se borra) pero hay que volver a contarlos. El aviso
  // de "revisar" vive en su fila, y en una lista de 130 ítems eso es no verlo nunca:
  // quien carga no va a recorrer la lista entera por si acaso. Aquí se cuentan para
  // poder decirlo arriba, donde sí se mira, y llevar de un toque al primero.
  const porRevisar = checklist.flatMap(c => c.items
    .map(([, , , lo]) => `${c.nombre}::${lo}`)
    .filter(k => marcasRevisar[k] && (modo === "preparacion" ? preparados[k] : modo === "salida" ? checkeados[k] : vueltos[k] !== undefined && vueltos[k] !== "")));
  const irAlPrimeroPorRevisar = () => {
    const fila = document.querySelector(`[data-revisar="${CSS.escape(porRevisar[0] || "")}"]`);
    if (fila) fila.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const totalRoturas = Object.values(roturas).reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);
  const pct = totalItems > 0 ? Math.round((totalMarcados / totalItems) * 100) : 0;
  // Tiempos estimados (Preparación / Carga / Descarga). El criterio vive en
  // estimarTiemposCarga() para compartirlo con el formulario. El nº de logística marca
  // el reparto; la descarga lleva recargo por fatiga según las horas de jornada.
  const numLogistica = Math.max(1, meta.numLogistica || 1);
  const horasJornada = meta.horasJornada || 0;
  const paxTotal = meta.totalPax || 0;
  const { prepMin, cargaMin, descargaMin, montajeMin, fatiga, totalMin } = estimarTiemposCarga({ totalItems, pax: paxTotal, numLogistica, horasJornada }, meta.calibracion);
  const fmtMin = (m) => {
    if (m <= 0) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? (min > 0 ? `${h} h ${min} min` : `${h} h`) : `${min} min`;
  };
  // Cronómetro en vivo: refresco cada segundo mientras algún cronómetro esté corriendo.
  const [ahoraTick, setAhoraTick] = useState(Date.now());
  const algunoCorriendo = ["carga", "descarga"].some(f => cronos[f] && cronos[f].running);
  useEffect(() => {
    if (!algunoCorriendo) return;
    setAhoraTick(Date.now()); // sincroniza YA al arrancar, si no el primer frame daría un valor raro
    const id = setInterval(() => setAhoraTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [algunoCorriendo]);
  const cronoMs = (fase) => {
    const c = cronos[fase];
    if (!c) return 0;
    // Math.max evita el negativo del primer render antes de que ahoraTick se sincronice
    const enMarcha = c.running && c.since ? Math.max(0, ahoraTick - c.since) : 0;
    return (c.ms || 0) + enMarcha;
  };
  const fmtCrono = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };
  // Recordatorios del evento: cada línea de las notas se convierte en una tarea con
  // su propio check (coger comida del congelador, hielo, taxis, un material extra…).
  // Se marcan a mano según se van haciendo y todo queda guardado/sincronizado con el
  // evento. Cuando están todas hechas el bloque se colapsa a "completado". Se puede
  // silenciar del todo con el botón de campana.
  const notasTexto = (meta.notasEvento || "").trim();
  const notasItems = notasTexto
    .split(/[\n;]+/)
    .map(s => s.replace(/^[\s•·*✓\-–]+/, "").trim())
    .filter(Boolean);
  const notasHechas = notasItems.filter(t => notasCheck[t]).length;
  const notasCompletas = notasItems.length > 0 && notasHechas === notasItems.length;
  const [notaSilenciada, setNotaSilenciada] = useState(false);
  const mostrarRecordatorio = notasItems.length > 0 && !notaSilenciada;
  // Cronómetro de una fase (carga/descarga): empezar/seguir, pausar y reiniciar, con
  // el tiempo real corriendo y el estimado al lado para poder controlarlo en vivo.
  const renderCrono = (fase, estimadoMin, label) => {
    const c = cronos[fase] || {};
    const ms = cronoMs(fase);
    const corriendo = !!c.running;
    const estMs = estimadoMin * 60000;
    const sobre = estMs > 0 && ms > estMs;
    return (
      <div className={`crono-box ${corriendo ? "is-corriendo" : ""}`}>
        <div className="crono-info">
          <span className="crono-label"><Clock size={14} /> {label}</span>
          {estimadoMin > 0 && <span className="crono-estimado">estimado ~{fmtMin(estimadoMin)}{sobre ? " · pasado" : ""}</span>}
        </div>
        <div className="crono-acciones">
          <span className={`crono-tiempo ${sobre ? "is-sobre" : ""}`}>{fmtCrono(ms)}</span>
          {corriendo ? (
            <button className="btn crono-btn crono-btn-pause" onClick={() => onCronoPause && onCronoPause(fase)} title="Pausar" aria-label="Pausar cronómetro"><Pause size={14} /> <span className="crono-btn-texto">Pausar</span></button>
          ) : (
            <button className="btn crono-btn crono-btn-start" onClick={() => onCronoStart && onCronoStart(fase)} title={ms > 0 ? "Seguir" : "Empezar"} aria-label={ms > 0 ? "Seguir cronómetro" : "Empezar cronómetro"}><Play size={14} /> <span className="crono-btn-texto">{ms > 0 ? "Seguir" : "Empezar"}</span></button>
          )}
          <button className="btn btn-outline crono-btn crono-btn-reset" onClick={() => onCronoReset && onCronoReset(fase)} disabled={ms === 0 && !corriendo} title="Reiniciar a cero" aria-label="Reiniciar cronómetro"><RotateCcw size={14} /></button>
        </div>
      </div>
    );
  };
  // Resumen tipo hoja de cálculo: Carga Inicial / Vuelta / Consumo Real, agrupado por
  // categoría, igual que la plantilla en la que ya llevaban el control. "Vuelta" solo
  // se conoce si se ha registrado un valor en la pestaña Vuelta (número o, por datos
  // antiguos, el booleano de la versión previa: true = volvió todo).
  const fmtEur = (n) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
  const filasPorCategoria = checklist.map(cat => {
    const filas = cat.items.map(([label, qty, , labelOriginal, , sufijo]) => {
      const key = `${cat.nombre}::${labelOriginal}`;
      const valor = parseFloat(String(qty && qty.u ? qty.u : qty).replace(",", "."));
      const cargaInicial = isNaN(valor) ? null : valor;
      const raw = vueltos[key];
      let vuelta = null;
      if (raw === true) vuelta = cargaInicial;
      else if (raw !== undefined && raw !== "") vuelta = parseFloat(String(raw).replace(",", ".")) || 0;
      const consumoReal = (cargaInicial !== null && vuelta !== null) ? Math.max(0, cargaInicial - vuelta) : null;
      const rot = parseInt(roturas[key], 10) || 0;
      // Si el item se renombró a mano, se busca el precio por su nombre original
      // para que el coste no se pierda al cambiarle la etiqueta.
      const precio = precios[label] ?? precios[labelOriginal];
      // Se cobra lo que FALTA, y las roturas son parte de eso, no algo aparte. Antes se
      // sumaban las dos cosas: apuntar "vuelven 90 de 100" y "10 roturas" —que son las
      // mismas 10 copas— cobraba 20. Con el máximo sale bien en los cuatro casos:
      //   vuelven 100 y 5 rotas (vuelven rotas en la caja) → faltan 0, roturas 5 → 5
      //   vuelven 90 y 10 rotas (las que faltan)           → faltan 10, roturas 10 → 10
      //   vuelven 90 sin apuntar roturas                   → faltan 10             → 10
      //   sin apuntar la vuelta pero con 3 rotas           → roturas 3             → 3
      const costeTotal = (precio !== undefined && (consumoReal !== null || rot > 0))
        ? Math.max(consumoReal || 0, rot) * precio
        : null;
      return { key, label, sufijo, cargaInicial, vuelta, consumoReal, roturas: rot, precio, costeTotal };
    });
    const subtotal = filas.reduce((acc, f) => acc + (f.costeTotal || 0), 0);
    return { nombre: cat.nombre, filas, subtotal };
  }).filter(c => c.filas.length > 0);
  const granTotal = filasPorCategoria.reduce((acc, c) => acc + c.subtotal, 0);
  const porPax = meta.totalPax > 0 ? granTotal / meta.totalPax : null;
  // Cuántas líneas se están quedando fuera del coste por no tener precio. Es el dato que
  // convierte "el total pone 340€" en "el total pone 340€ y le faltan 60 líneas": sin
  // esto, un total corto parece un evento barato en vez de un catálogo incompleto.
  const sinPrecio = filasPorCategoria.flatMap(c => c.filas)
    .filter(f => f.cargaInicial !== null && f.precio === undefined);
  const conPrecio = filasPorCategoria.flatMap(c => c.filas).filter(f => f.precio !== undefined).length;
  // Lo que cuestan solo las roturas, aparte de lo consumido: es el dato que dice si
  // conviene comprar cristalería más resistente o cambiar de cajas de transporte.
  const costeRoturas = filasPorCategoria.flatMap(c => c.filas)
    .reduce((acc, f) => acc + (f.precio !== undefined ? f.roturas * f.precio : 0), 0);
  const totalRoturasUds = filasPorCategoria.flatMap(c => c.filas).reduce((acc, f) => acc + f.roturas, 0);
  // Las categorías que más pesan, para verlo de un vistazo en vez de sumar columnas
  const ranking = filasPorCategoria
    .filter(c => c.subtotal > 0)
    .sort((a, b) => b.subtotal - a.subtotal);
  const handleGuardarPrecios = (texto) => {
    const nuevos = { ...precios, ...parsePreciosPegados(texto) };
    setPrecios(nuevos);
    guardarPrecios(nuevos);
    setEditandoPrecios(false);
  };
  // Exporta el resumen a CSV (se abre en Excel/Sheets/Numbers). Separador ";" y BOM
  // UTF-8 para que Excel en español lo lea bien con tildes.
  const exportarResumenCSV = () => {
    const sep = ";";
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Categoría", "Producto", "Carga inicial", "Vuelta", "Consumo real", "Roturas", "Coste ud.", "Coste total"]];
    filasPorCategoria.forEach(cat => {
      cat.filas.forEach(f => rows.push([cat.nombre, f.label, f.cargaInicial ?? "", f.vuelta ?? "", f.consumoReal ?? "", f.roturas || "", f.precio !== undefined ? f.precio : "", f.costeTotal !== null ? f.costeTotal : ""]));
      rows.push([`Subtotal ${cat.nombre}`, "", "", "", "", "", "", cat.subtotal]);
    });
    rows.push(["TOTAL", "", "", "", "", "", "", granTotal]);
    const csv = "﻿" + rows.map(r => r.map(esc).join(sep)).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resumen_${(meta.nombreEvento || "evento").replace(/[^\w\-]+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className={`preview-overlay ${sinCerrar ? "is-pantalla" : ""}`} onClick={sinCerrar ? undefined : onClose}>
      <div className="preview-modal carga-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title"><Package size={16} /> Modo carga{meta.nombreEvento ? ` · ${meta.nombreEvento}` : ""}</div>
            <div className="preview-header-subtitle">
              {totalMarcados} de {totalItems} {palabraModo}
              {modo === "salida" && totalPreparados > 0 ? ` · ${totalPreparados} preparados` : ""}
              {totalRoturas > 0 ? ` · ${totalRoturas} roturas` : ""}
            </div>
            {/* Alguien ha cambiado una cantidad de algo que ya estaba marcado. Va aquí
                arriba, junto al recuento, porque es lo único que se mira sin scroll —
                y lleva de un toque a la fila, que buscarla entre 130 no es plan. */}
            {porRevisar.length > 0 && (
              <button type="button" className="carga-por-revisar" onClick={irAlPrimeroPorRevisar}
                      title="Se les cambió la cantidad después de marcarlos: hay que volver a contarlos">
                <AlertTriangle size={13} />
                <span>
                  {porRevisar.length === 1
                    ? "1 con la cantidad cambiada"
                    : `${porRevisar.length} con la cantidad cambiada`}
                </span>
                <span className="carga-por-revisar-ir">Ver →</span>
              </button>
            )}
            <div className="carga-progreso"><div className="carga-progreso-fill" style={{ width: `${pct}%` }} /></div>
            {totalItems > 0 && (
              <div className="carga-tiempos" title={`Estimado a partir de ${totalItems} ítems y ${numLogistica} de logística${meta.logisticaReal ? " (del Equipo de logística)" : " (1 cada 60 pax)"}.\nPreparación = (30 + pax × 1 + ítems × 0,5) ÷ logística.\nCarga = (20 + ítems × 1,5) ÷ logística.\nDescarga ≈ 60% de la carga${fatiga > 0 ? ` +${Math.round(fatiga * 100)}% por fatiga (jornada de ${String(horasJornada).replace(".", ",")}h)` : ""}.\nMontaje in situ (todo el equipo) = 45 + pax × 1,1 + ítems × 0,4.`}>
                <Clock size={13} />
                <span><strong>Prep</strong> ~{fmtMin(prepMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Carga</strong> ~{fmtMin(cargaMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Descarga</strong> ~{fmtMin(descargaMin)}{fatiga > 0 ? " ⚠️" : ""}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Montaje</strong> ~{fmtMin(montajeMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span className="carga-tiempos-total"><strong>Total</strong> ~{fmtMin(totalMin)}</span>
                <span className="carga-tiempos-nota">
                  ({numLogistica} logística{meta.logisticaReal ? "" : ", estimado"})
                  {/* Si ya hay eventos cronometrados, el ajuste que se está aplicando se
                      dice en voz alta: nada de corregir los tiempos por detrás. */}
                  {meta.calibracion && (
                    <span className="carga-calibrado" title="Los tiempos estimados están ajustados con los cronómetros de tus eventos anteriores">
                      · ajustado con {meta.calibracion.nMedidos} eventos medidos
                      {FASES_TIEMPO.filter(f => meta.calibracion.factores[f]).map(f =>
                        ` · ${f} ×${meta.calibracion.factores[f].toFixed(2).replace(".", ",")}`).join("")}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          {!sinCerrar && (
            <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar modo carga" title="Cerrar"><X size={14} /></button>
          )}
        </div>
        {/* Esta tira se queda fija al hacer scroll: marcando 150 items, el recuento y el
            cambio Salida/Vuelta son lo único que se usa todo el rato, y antes había que
            subir hasta arriba del todo para llegar a ellos. */}
        <div className="carga-modo-toggle">
          <div className="segmented-control">
            <button className={`segment-btn segment-preparacion ${modo === "preparacion" && !verResumen ? "active" : ""}`} onClick={() => { setModo("preparacion"); setVerResumen(false); }} title="Lo que ya está preparado (sacado del almacén y listo), antes de subirlo al camión"><ClipboardCheck size={14} /> Prep.</button>
            <button className={`segment-btn segment-salida ${modo === "salida" && !verResumen ? "active" : ""}`} onClick={() => { setModo("salida"); setVerResumen(false); }} title="Lo que ya está cargado en el camión"><Truck size={14} /> Salida</button>
            <button className={`segment-btn segment-vuelta ${modo === "vuelta" && !verResumen ? "active" : ""}`} onClick={() => { setModo("vuelta"); setVerResumen(false); }}><Undo2 size={14} /> Vuelta</button>
            <button className={`segment-btn segment-resumen ${verResumen ? "active" : ""}`} onClick={() => setVerResumen(true)}><BarChart3 size={14} /> Resumen</button>
          </div>
          {!verResumen && (
            <span className="carga-toggle-cuenta" title={`${totalMarcados} de ${totalItems} ${palabraModo}`}>
              {totalMarcados}/{totalItems}
            </span>
          )}
        </div>
        {mostrarRecordatorio && (
          <div className={`carga-nota-recordatorio ${notasCompletas ? "is-completo" : ""}`} role="note">
            <div className="carga-nota-cabecera">
              {notasCompletas ? <Check size={16} className="carga-nota-icono" /> : <Bell size={16} className="carga-nota-icono" />}
              <span className="carga-nota-titulo">Recordatorios del evento</span>
              <span className="carga-nota-progreso">{notasHechas}/{notasItems.length}</span>
              <button className="carga-nota-silenciar" onClick={() => setNotaSilenciada(true)} title="Silenciar los recordatorios" aria-label="Silenciar los recordatorios"><BellOff size={15} /></button>
            </div>
            <div className="carga-nota-lista">
              {notasItems.map((t, i) => {
                const hecho = !!notasCheck[t];
                return (
                  <label className={`carga-nota-item ${hecho ? "is-hecho" : ""}`} key={i}>
                    <input type="checkbox" checked={hecho} onChange={() => onToggleNota && onToggleNota(t)} />
                    <span className="carga-nota-item-texto">{t}</span>
                  </label>
                );
              })}
            </div>
            {notasCompletas && <div className="carga-nota-completo-msg"><Check size={14} /> Todos los recordatorios hechos</div>}
          </div>
        )}
        {verResumen ? (
          <div className="preview-body">
            <div className="resumen-precios-bar">
              <button className="btn btn-outline" onClick={() => setEditandoPrecios(v => !v)}><Euro size={14} /> {editandoPrecios ? "Cerrar precios" : "Precios"}</button>
              {filasPorCategoria.length > 0 && (
                <button className="btn btn-outline" onClick={exportarResumenCSV} title="Descarga el resumen en CSV (se abre en Excel, Sheets o Numbers)"><FileText size={14} /> Exportar (Excel)</button>
              )}
              {granTotal > 0 && (
                <span className="resumen-coste-total">
                  Coste estimado: <strong>{fmtEur(granTotal)}</strong>
                  {porPax !== null && <> · {fmtEur(porPax)}/pax</>}
                </span>
              )}
            </div>
            {editandoPrecios && (
              <div className="resumen-bloque">
                <div className="resumen-titulo">Precios por unidad</div>
                <p className="resumen-vacio">
                  Pega una línea por item, "Nombre: precio" (ej. "Copas de vino: 0,60"). Se guarda en
                  este navegador y se usa en cualquier evento — pega solo lo que quieras actualizar,
                  el resto del catálogo no se toca.
                </p>
                <textarea
                  className="form-input notas-textarea"
                  rows={5}
                  placeholder={"Copas de vino: 0,60\nVino blanco: 6,50\nRegletas y alargadores: 2"}
                  onBlur={e => { if (e.target.value.trim()) { handleGuardarPrecios(e.target.value); e.target.value = ""; } }}
                />
              </div>
            )}
            {filasPorCategoria.length === 0 ? (
              <p className="resumen-vacio">No hay items con cantidad para resumir.</p>
            ) : (
              <>
              {/* Las cifras grandes primero. La tabla de siete columnas tiene todo el
                  detalle, pero para saber "cómo ha ido" no hay que leer 150 filas. */}
              <div className="resumen-fichas">
                <div className="resumen-fichita is-total">
                  <span className="resumen-fichita-label">Coste del evento</span>
                  <strong className="resumen-fichita-valor">{fmtEur(granTotal)}</strong>
                  {porPax !== null && <span className="resumen-fichita-pie">{fmtEur(porPax)} por persona</span>}
                </div>
                <div className={`resumen-fichita ${totalRoturasUds > 0 ? "is-roturas" : ""}`}>
                  <span className="resumen-fichita-label">Roturas y pérdidas</span>
                  <strong className="resumen-fichita-valor">{totalRoturasUds}</strong>
                  <span className="resumen-fichita-pie">{costeRoturas > 0 ? `${fmtEur(costeRoturas)} de reposición` : "sin coste apuntado"}</span>
                </div>
                {sinPrecio.length > 0 && (
                  <button
                    type="button"
                    className="resumen-fichita is-falta"
                    onClick={() => setEditandoPrecios(true)}
                    title={`Sin precio: ${sinPrecio.slice(0, 12).map(f => f.label).join(", ")}${sinPrecio.length > 12 ? "…" : ""}`}
                  >
                    <span className="resumen-fichita-label">Sin precio todavía</span>
                    <strong className="resumen-fichita-valor">{sinPrecio.length}</strong>
                    <span className="resumen-fichita-pie">de {sinPrecio.length + conPrecio} · pon los precios →</span>
                  </button>
                )}
              </div>

              {/* En qué se va el dinero, sin sumar columnas a mano */}
              {ranking.length > 0 && (
                <div className="resumen-bloque">
                  <div className="resumen-titulo">En qué se va</div>
                  <div className="resumen-ranking">
                    {ranking.map(c => (
                      <div className="resumen-ranking-fila" key={c.nombre}>
                        <span className="resumen-ranking-nombre">
                          <span className="cat-icon-mini" style={{ background: infoCategoria(c.nombre).color, color: infoCategoria(c.nombre).texto }}>
                            <IconoCategoria nombre={c.nombre} size={11} />
                          </span>
                          {c.nombre}
                        </span>
                        <span className="resumen-ranking-barra">
                          <span
                            className="resumen-ranking-relleno"
                            style={{ width: `${granTotal > 0 ? Math.max(2, (c.subtotal / granTotal) * 100) : 0}%`, background: infoCategoria(c.nombre).color }}
                          />
                        </span>
                        <span className="resumen-ranking-cifra">{fmtEur(c.subtotal)}</span>
                        <span className="resumen-ranking-pct">{granTotal > 0 ? Math.round((c.subtotal / granTotal) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="resumen-tabla-wrap">
                <table className="resumen-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Carga inicial</th>
                      <th>Vuelta</th>
                      <th>Consumo real</th>
                      <th>Roturas</th>
                      <th>Coste ud.</th>
                      <th>Coste total</th>
                    </tr>
                  </thead>
                  {filasPorCategoria.map(cat => (
                    <tbody key={cat.nombre}>
                      <tr className="resumen-cat-header" style={{ background: infoCategoria(cat.nombre).color }}>
                        <td colSpan={7} style={{ color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} size={14} /> {cat.nombre}</td>
                      </tr>
                      {cat.filas.map(f => (
                        <tr key={f.key}>
                          <td className="resumen-tabla-producto" title={f.label}><IconoItem label={f.label} size={13} /> {f.label}</td>
                          <td>{f.cargaInicial ?? "—"}{f.sufijo ? ` ${f.sufijo}` : ""}</td>
                          <td>{f.vuelta ?? "—"}</td>
                          <td>{f.consumoReal ?? "—"}</td>
                          <td className={f.roturas > 0 ? "resumen-celda-rotura" : ""}>{f.roturas > 0 ? f.roturas : "—"}</td>
                          <td className={f.precio === undefined && f.cargaInicial !== null ? "resumen-celda-sinprecio" : ""}
                              title={f.precio === undefined && f.cargaInicial !== null ? "Sin precio: esta línea no suma al total" : undefined}>
                            {f.precio !== undefined ? fmtEur(f.precio) : "—"}
                          </td>
                          <td>{f.costeTotal !== null ? fmtEur(f.costeTotal) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="resumen-subtotal-row">
                        <td colSpan={6}>Subtotal {cat.nombre}</td>
                        <td>{fmtEur(cat.subtotal)}</td>
                      </tr>
                    </tbody>
                  ))}
                  <tfoot>
                    <tr className="resumen-total-row">
                      <td colSpan={6}>TOTAL</td>
                      <td>{fmtEur(granTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )}
          </div>
        ) : (
        <div className="preview-body">
          {modo === "preparacion" && renderCrono("prep", prepMin, "Cronómetro de preparación")}
          {modo === "salida" && (
            <>
              {renderCrono("carga", cargaMin, "Cronómetro de carga")}
              {/* El montaje es la fase peor estimada, así que también se cronometra:
                  con varios eventos medidos se puede afinar la hora de fin sugerida. */}
              {renderCrono("montaje", montajeMin, "Cronómetro de montaje")}
            </>
          )}
          {/* Subir al camión de golpe todo lo que ya está preparado. Lo normal es que
              coincidan: lo que se ha preparado es justo lo que se carga. Marcarlo uno a
              uno en una lista de 130 items es media hora, y además es la forma de
              rehacer una carga que se haya perdido. NO desmarca nada: solo añade. */}
          {modo === "salida" && preparadosSinCargar.length > 0 && (
            <button
              className="btn btn-outline carga-todo-vuelto"
              onClick={() => preparadosSinCargar.forEach(k => onToggleSale(k))}
              title="Da por cargado todo lo que ya está marcado como preparado. No quita ninguna marca."
            ><Check size={15} /> Cargar todo lo preparado ({preparadosSinCargar.length})</button>
          )}
          {modo === "vuelta" && renderCrono("descarga", descargaMin, "Cronómetro de descarga")}
          {modo === "vuelta" && (
            <button
              className={`btn btn-outline carga-todo-vuelto ${todoVuelto ? "is-desmarcar" : ""}`}
              onClick={() => itemsMarcables.forEach(it => onVuelve(it.key, todoVuelto ? "" : it.valor))}
              title={todoVuelto ? "Quita la marca de vuelto de todos los items" : "Marca todos los items como que volvieron completos (luego ajustas los que falten y las roturas)"}
            >{todoVuelto ? <><X size={15} /> Desmarcar todo</> : <><Check size={15} /> Marcar todo como vuelto</>}</button>
          )}
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header" style={{ borderLeftColor: infoCategoria(cat.nombre).color }}>
                <span className="cat-icon-mini" style={{ background: infoCategoria(cat.nombre).color, color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} /></span>
                <span>{cat.nombre}</span>
              </div>
              <div className="carga-lista">
                {cat.items.map(([label, qty, , labelOriginal, , sufijo], i) => {
                  const key = `${cat.nombre}::${labelOriginal}`;
                  // Preparación y Salida son la misma fila con distinta marca. Cada una
                  // enseña en pequeño cómo va la otra: preparando ves lo que ya está en
                  // el camión, y cargando ves lo que venía preparado.
                  if (modo !== "vuelta") {
                    const enPreparacion = modo === "preparacion";
                    const marcado = enPreparacion ? !!preparados[key] : !!checkeados[key];
                    const otroMarcado = enPreparacion ? !!checkeados[key] : !!preparados[key];
                    return (
                      <div className={`carga-row ${marcado ? "is-marcado" : ""}`} key={i}
                           data-revisar={marcado && marcasRevisar[key] ? key : undefined}>
                        <label className="carga-row-principal">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => (enPreparacion ? onTogglePreparado && onTogglePreparado(key) : onToggleSale(key))}
                          />
                          <span className="carga-nombre"><IconoItem label={label} /> <span className="carga-nombre-texto">{label}</span></span>
                          {otroMarcado && (
                            <span className={`carga-marca-otra ${enPreparacion ? "is-cargado" : "is-preparado"}`}
                                  title={enPreparacion ? "Ya está cargado en el camión" : "Estaba marcado como preparado"}>
                              {enPreparacion ? <Truck size={11} /> : <ClipboardCheck size={11} />}
                              <span className="carga-marca-otra-texto">{enPreparacion ? "cargado" : "prep."}</span>
                            </span>
                          )}
                          {/* La cantidad cambió DESPUÉS de marcarlo: la marca se respeta
                              (es trabajo hecho) pero hay que volver a contarlo. */}
                          {marcado && marcasRevisar[key] && (
                            <span className="carga-marca-otra is-revisar"
                                  title="La cantidad ha cambiado desde que lo marcaste: conviene volver a contarlo">
                              <AlertTriangle size={11} />
                              <span className="carga-marca-otra-texto">revisar</span>
                            </span>
                          )}
                          <span className="carga-cantidad">{fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</span>
                        </label>
                      </div>
                    );
                  }
                  const valorVuelta = vueltos[key];
                  const marcado = valorVuelta !== undefined && valorVuelta !== "";
                  const cantidadCompletaNum = parseFloat(String(qty && qty.u ? qty.u : qty).replace(",", "."));
                  const cantidadCompleta = isNaN(cantidadCompletaNum) ? null : cantidadCompletaNum;
                  const vueltaTexto = valorVuelta === true
                    ? String(cantidadCompleta || "")
                    : (valorVuelta ?? "");
                  const vinoTodo = cantidadCompleta !== null
                    ? parseFloat(String(vueltaTexto).replace(",", ".")) === cantidadCompleta
                    : valorVuelta === true;
                  // Lo que salió menos lo que ha vuelto. Si de 100 copas vuelven 90, esas
                  // 10 no están: da igual si se rompieron o se quedaron por ahí, hay que
                  // reponerlas. Se ofrece con un toque en vez de rellenarlo solo, porque
                  // no siempre es una rotura: de 100 tercios vuelven 20 y los otros 80
                  // están bebidos, no rotos. Ahí no se toca el botón y ya está.
                  const vueltaNum = parseFloat(String(vueltaTexto).replace(",", "."));
                  const faltan = (cantidadCompleta !== null && !isNaN(vueltaNum))
                    ? Math.max(0, cantidadCompleta - vueltaNum) : 0;
                  const sugerirRoturas = faltan > 0 && !roturas[key];
                  return (
                    <div className={`carga-row ${marcado ? "is-marcado" : ""} ${vinoTodo ? "is-vino-todo" : ""}`} key={i}>
                      {/* La pastilla "todo" va en la línea del nombre, que es donde está
                          la casilla de marcar en Prep. y en Salida: es la misma acción y
                          tiene que estar en el mismo sitio. Debajo se apilaba, y entre eso
                          y los dos campos cada item ocupaba cuatro líneas — recorrer la
                          vuelta de un rodaje era bajar el triple de lo necesario. */}
                      <div className="carga-row-principal carga-row-vuelta">
                        <span className="carga-nombre"><IconoItem label={label} /> <span className="carga-nombre-texto">{label}</span></span>
                        <span className="carga-cantidad">de {fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</span>
                        <label className={`carga-vino-todo ${vinoTodo ? "is-on" : ""}`} title={cantidadCompleta !== null ? "Vino todo: rellena la cantidad completa" : "Marcar como que volvió entero"} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={vinoTodo}
                            onChange={e => onVuelve(key, e.target.checked ? (cantidadCompleta !== null ? String(cantidadCompleta) : true) : "")}
                          />
                          <Check size={12} /> todo
                        </label>
                      </div>
                      {/* Y debajo, los dos números, alineados entre ellos */}
                      <div className="carga-vuelta-controles">
                        {/* Si la cantidad es un texto ("Todas") no hay número que contar:
                            esa fila se marca solo con la casilla, sin campo numérico. */}
                        {cantidadCompleta !== null && (
                          <div className="carga-roturas carga-vuelve-cantidad">
                            <span><Undo2 size={12} /> vuelve</span>
                            <input
                              type="number"
                              min="0"
                              className="carga-roturas-input"
                              value={vueltaTexto}
                              placeholder="0"
                              onChange={e => onVuelve(key, e.target.value)}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="carga-roturas">
                          <span><AlertTriangle size={12} /> roturas</span>
                          <input
                            type="number"
                            min="0"
                            className="carga-roturas-input"
                            value={roturas[key] || ""}
                            placeholder="0"
                            onChange={e => onRoturas(key, e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                          {sugerirRoturas && (
                            <button
                              type="button"
                              className="carga-faltan"
                              title={`Han vuelto ${vueltaNum} de ${cantidadCompleta}: apuntar las ${faltan} que faltan como roturas`}
                              onClick={e => { e.stopPropagation(); onRoturas(key, String(faltan)); }}
                            >faltan {faltan}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// ─── EL FORMULARIO DE OFICINA: EL ENLACE Y LA BANDEJA ─────────────────────────
// Las dos puntas del canal con la oficina, en una sola pantalla: de dónde sale el
// enlace que se les pasa, y qué han mandado por él.
//
// Aplicar un envío NO escribe nada a escondidas: abre el evento con los datos ya
// puestos para que se revisen. Lo que la oficina no contestó se queda con el valor
// por defecto de la app y sale marcado aquí, para saber qué mirar.
// Un envío en la bandeja: a qué evento va, qué contestaron y qué se puede hacer con
// él. Los ya revisados se ven igual, pero apagados y diciendo dónde acabaron.
// De qué evento habla un envío, para poder nombrarlo en un aviso
function nombreDelEnvio(e) {
  return e.eventoDestino || (e.respuestas && e.respuestas.nombre) || "evento nuevo";
}

// El mensaje que se manda por WhatsApp desde la bandeja: lo justo para saber de qué
// va sin abrir nada, y las cifras que más cambian los planes.
function textoAvisoEnvio(e) {
  const r = e.respuestas || {};
  const trozos = [];
  if (r.fecha) trozos.push(fmtFechaCorta(r.fecha));
  if (r.sitio) trozos.push(r.sitio);
  const gente = [r.adultos && `${r.adultos} adultos`, r.ninos && `${r.ninos} niños`, r.staff && `${r.staff} staff`]
    .filter(Boolean).join(" + ");
  if (gente) trozos.push(gente);
  const cabecera = e.corregido
    ? `Han CAMBIADO los datos de "${nombreDelEnvio(e)}"`
    : `Datos nuevos de "${nombreDelEnvio(e)}"`;
  return `${cabecera}${trozos.length ? `\n${trozos.join(" · ")}` : ""}\nEstá en el formulario, sin aplicar todavía.`;
}

function TarjetaEnvio({ e, fmtEnviado, revisado = false, avisos = [], children }) {
  return (
    <div className={`envio-card ${revisado ? "es-revisado" : ""}`}>
      <div className="envio-cabecera">
        <span className="envio-destino">
          {e.eventoDestino
            ? <><ArrowRight size={13} /> Para <strong>{e.eventoDestino}</strong></>
            : <><Plus size={13} /> Evento nuevo</>}
        </span>
        <span className="envio-fecha">
          {e.corregido && <span className="envio-corregido">cambiado</span>}
          {fmtEnviado(e)}
        </span>
      </div>
      {revisado && (
        <div className="envio-estado">
          {e.aplicado
            ? <><Check size={12} /> Aplicado{e.aplicadoA ? ` a "${e.aplicadoA}"` : ""}</>
            : <><X size={12} /> Descartado</>}
        </div>
      )}
      {/* Lo que han adjuntado: el menú a imprimir o la imagen de las etiquetas. Se
          abre en otra pestaña y desde ahí se imprime o se guarda. */}
      {archivosDelEnvio(e.respuestas || {}).length > 0 && (
        <div className="envio-archivos">
          {archivosDelEnvio(e.respuestas || {}).map(({ id, etiqueta, archivo }) => (
            <a className="envio-archivo" href={archivo.datos} target="_blank" rel="noreferrer"
               download={archivo.nombre} key={id}>
              {/^image\//.test(archivo.tipo)
                ? <img src={archivo.datos} alt="" className="envio-archivo-mini" />
                : <span className="envio-archivo-icono"><FileText size={14} /></span>}
              <span className="envio-archivo-texto">{etiqueta}<em>{archivo.nombre}</em></span>
            </a>
          ))}
        </div>
      )}
      <div className="envio-respuestas">
        {resumirEnvio(e.respuestas || {}).map(f => (
          <div className={`envio-fila ${f.sinContestar ? "es-sin-contestar" : ""}`} key={f.id}>
            <span className="envio-preg">{f.pregunta}</span>
            <span className="envio-resp">{f.respuesta}</span>
          </div>
        ))}
      </div>
      {avisos.length > 0 && !revisado && (
        <div className="envio-avisar">
          {avisos.map((a, i) => (
            <a
              className="btn btn-outline envio-avisar-btn"
              key={i}
              href={`https://wa.me/${a.tel}?text=${encodeURIComponent(textoAvisoEnvio(e))}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={14} /> Avisar{a.nombre ? ` a ${a.nombre.split(/[ ·]/)[0]}` : ""}
            </a>
          ))}
        </div>
      )}
      <div className="envio-acciones">{children}</div>
    </div>
  );
}

function ModalFormularioOficina({
  codigo, enlace, envios, cargando, copiado,
  onCrear, onCambiar, onCopiar, onCompartir, onAplicar, onDescartar, onBorrar, onClose,
  avisos = [], onCambiarAvisos,
}) {
  const { pendientes, revisados } = repartirEnvios(envios);
  const [verRevisados, setVerRevisados] = useState(false);
  const fmtEnviado = (e) => {
    const s = e && e.enviado && e.enviado.seconds;
    if (!s) return "recién";
    return new Date(s * 1000).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title"><ClipboardCheck size={16} /> Formulario del evento</div>
            <div className="preview-header-subtitle">
              {pendientes.length > 0 ? `${pendientes.length} sin revisar` : "Nada sin revisar"}
              {revisados.length > 0 ? ` · ${revisados.length} ya revisados` : ""}
            </div>
          </div>
          <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar"><X size={14} /></button>
        </div>
        <div className="preview-body">
          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">El enlace para compartir</div>
            {!codigo ? (
              <>
                <p className="resumen-vacio">
                  Se les pasa una vez y lo pueden guardar. Abre solo el formulario: desde ahí
                  no se llega a la checklist, ni a la configuración, ni a los eventos. Verán
                  los 8 próximos eventos (nombre, día y sitio) para elegir a cuál van los datos.
                </p>
                <button className="btn btn-green" onClick={onCrear}><Link2 size={15} /> Crear el enlace</button>
              </>
            ) : (
              <>
                <div className="form-oficina-enlace">
                  <input className="form-input" type="text" readOnly value={enlace} onFocus={e => e.target.select()} />
                  <button className="btn btn-green" onClick={onCopiar}>
                    {copiado ? <><Check size={15} /> Copiado</> : <><ClipboardCopy size={15} /> Copiar</>}
                  </button>
                  {/* En el móvil esto abre el compartir de siempre (WhatsApp y demás):
                      es como se les va a pasar de verdad, sin pegarlo a mano. */}
                  {typeof navigator !== "undefined" && navigator.share && (
                    <button className="btn btn-outline" onClick={onCompartir}>
                      <MessageCircle size={15} /> Enviar
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={() => window.open(enlace, "_blank", "noopener")}>
                    <Eye size={15} /> Verlo
                  </button>
                </div>
                <p className="resumen-vacio">
                  Código <strong>{codigo}</strong>. Si lo cambias, el que ya tengan deja de
                  funcionar al momento.
                </p>
                <button className="btn btn-outline" onClick={onCambiar}><RefreshCw size={14} /> Cambiar el enlace</button>
              </>
            )}
          </div>

          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">A quién se avisa por WhatsApp</div>
            <p className="resumen-vacio">
              Al mandar o cambiar un envío, al formulario le sale un botón para avisarte
              por WhatsApp con el mensaje ya escrito. Llega aunque tengas la app cerrada.
            </p>
            {avisos.map((a, i) => (
              <div className="aviso-contacto" key={i}>
                <input
                  className="form-input" type="text" placeholder="Nombre"
                  value={a.nombre}
                  onChange={e => onCambiarAvisos(avisos.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                />
                <input
                  className="form-input" type="tel" placeholder="Móvil con prefijo (34...)"
                  value={a.tel}
                  onChange={e => onCambiarAvisos(avisos.map((x, j) => j === i ? { ...x, tel: e.target.value } : x))}
                />
                <button className="aviso-contacto-quitar" aria-label="Quitar" title="Quitar"
                        onClick={() => onCambiarAvisos(avisos.filter((x, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => onCambiarAvisos([...avisos, { nombre: "", tel: "" }])}>
              <Plus size={14} /> Añadir a alguien
            </button>
          </div>

          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">Lo que ha llegado</div>
            {cargando && <p className="resumen-vacio">Mirando el buzón...</p>}
            {!cargando && pendientes.length === 0 && (
              <p className="resumen-vacio">No hay envíos sin revisar.</p>
            )}
            {pendientes.map(e => (
              <TarjetaEnvio e={e} fmtEnviado={fmtEnviado} avisos={limpiarAvisos(avisos)} key={e.id}>
                <button className="btn btn-outline" onClick={() => onDescartar(e)}>Descartar</button>
                <button className="btn btn-green" onClick={() => onAplicar(e)}>Aplicar y abrir</button>
              </TarjetaEnvio>
            ))}

            {/* Lo ya revisado NO se borra: es la única prueba de lo que dijo la
                oficina, y es lo que se mira cuando el día del evento algo no cuadra.
                Va plegado para que no estorbe a lo que sí hay que hacer. */}
            {revisados.length > 0 && (
              <>
                <button className="btn btn-outline envio-ver-revisados" onClick={() => setVerRevisados(v => !v)}>
                  {verRevisados ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {" "}Ya revisados ({revisados.length})
                </button>
                {verRevisados && revisados.map(e => (
                  <TarjetaEnvio e={e} fmtEnviado={fmtEnviado} revisado key={e.id}>
                    <button className="btn btn-outline" onClick={() => onBorrar(e)}>Borrar del todo</button>
                  </TarjetaEnvio>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL AÑADIR VARIOS ITEMS (pegando texto) ────────────────────────────────
// Cada línea pegada se interpreta como "nombre" o "nombre <tab/2 espacios/":"/"-"> cantidad".
// Antes de tocar la checklist se normaliza cada nombre y se compara con lo que ya existe
// (categorías actuales + items ya añadidos a mano) para no duplicar nada, y se muestra
// una pantalla de confirmación con lo que se va a añadir/omitir antes de aplicar el cambio.
function parseItemsPegados(texto) {
  const delim = detectarDelimitador(texto);
  return texto.split("\n").map(l => l.trim()).filter(Boolean).map(linea => {
    if (delim !== "," && linea.includes(delim)) {
      const [nombre, cantidad] = linea.split(delim).map(p => p.trim());
      return { label: nombre, qty: cantidad || "1" };
    }
    const m = linea.match(/^(.*\S)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*$/) || linea.match(/^(.*\S)\s{2,}(\d+(?:[.,]\d+)?)\s*$/);
    if (m) return { label: m[1].trim(), qty: m[2].replace(",", ".") };
    return { label: linea, qty: "1" };
  }).filter(it => it.label);
}

// ─── MODAL RECALCULAR ──────────────────────────────────────────────────────────
// Lista los items cuya cantidad automática ha cambiado desde el último "Guardar
// evento" (por ejemplo, tras un ajuste de fórmula) y deja elegir, uno a uno, si se
// mantiene el valor de antes (se fija como edición manual) o se acepta el nuevo.
function ModalRecalcular({ cambios, onClose, onAplicar }) {
  const [decisiones, setDecisiones] = useState(() => Object.fromEntries(cambios.map(c => [c.key, "mantener"])));
  const elegir = (key, valor) => setDecisiones(prev => ({ ...prev, [key]: valor }));
  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div className="dialogo-modal recalcular-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialogo-titulo"><RefreshCw size={16} /> Recalcular cantidades</div>
        <p className="dialogo-mensaje">
          En estas {cambios.length} cantidades el cálculo automático de ahora no coincide con lo que
          tienes puesto: o las editaste a mano (marcadas <strong>a mano</strong>) o han cambiado desde
          el último "Guardar evento". Elige para cada una si mantienes tu valor (queda fijo, no se
          volverá a mover solo) o usas el nuevo cálculo.
        </p>
        <div className="recalcular-lista">
          {cambios.map(c => (
            <div className="recalcular-row" key={c.key}>
              <div className="recalcular-nombre">
                {c.label}
                {c.aMano && <span className="recalcular-tag">a mano</span>}
                <span className="recalcular-categoria">{c.categoria}</span>
              </div>
              <div className="recalcular-opciones">
                <button
                  className={`btn btn-outline recalcular-opcion ${decisiones[c.key] === "mantener" ? "active" : ""}`}
                  onClick={() => elegir(c.key, "mantener")}
                >Mantener {c.anterior}</button>
                <button
                  className={`btn btn-outline recalcular-opcion ${decisiones[c.key] === "nuevo" ? "active" : ""}`}
                  onClick={() => elegir(c.key, "nuevo")}
                >Usar {c.nuevo}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="dialogo-acciones">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-green" onClick={() => onAplicar(decisiones)}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

function ModalAgregarItems({ checklist, categoriasDisponibles, onClose, onConfirm }) {
  const [texto, setTexto]           = useState("");
  const [error, setError]           = useState("");
  const [propuestos, setPropuestos] = useState([]); // [{label, qty, categoria, duplicado, incluir}]
  const [paso, setPaso]             = useState("pegar"); // pegar → confirmar

  const analizar = () => {
    setError("");
    if (!texto.trim()) { setError("Pega primero los items que quieras añadir, uno por línea."); return; }
    const items = parseItemsPegados(texto);
    if (items.length === 0) { setError("No he podido interpretar ningún item en el texto pegado."); return; }
    const existentes = new Set();
    checklist.forEach(cat => cat.items.forEach(([label]) => existentes.add(normalizar(label))));
    const vistos = new Set();
    const props = items.map(it => {
      const norm = normalizar(it.label);
      const duplicado = existentes.has(norm) || vistos.has(norm);
      vistos.add(norm);
      return {
        ...it,
        categoria: sugerirCategoria(it.label, categoriasDisponibles) || CATEGORIA_MANUAL,
        duplicado,
        incluir: !duplicado,
      };
    });
    setPropuestos(props);
    setPaso("confirmar");
  };

  const toggleIncluir = (idx) => setPropuestos(prev => prev.map((p, i) => i === idx ? { ...p, incluir: !p.incluir } : p));

  const confirmar = () => {
    onConfirm(propuestos.filter(p => p.incluir));
    onClose();
  };

  const nInclu = propuestos.filter(p => p.incluir).length;

  const selectStyle = {
    padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: 6, fontSize: "0.85rem",
    background: "var(--card-bg)", color: "var(--text-main)", width: "100%", cursor: "pointer",
  };

  const tituloPaso = { pegar: "Pega los items que quieras añadir", confirmar: "Revisa antes de añadir" }[paso];

  return (
    <div className="agregar-overlay" onClick={onClose}>
      <div className="agregar-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="agregar-cabecera">
          <div>
            <div className="agregar-titulo"><ListPlus size={18} /> Añadir varios items</div>
            <div className="agregar-subtitulo">{tituloPaso}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="agregar-cerrar"><X size={14} /></button>
        </div>

        <div className="agregar-cuerpo">

          {/* PASO PEGAR */}
          {paso === "pegar" && (
            <>
              <div className="agregar-nota">
                <Info size={14} /> Pega una lista de items, uno por línea. Puedes incluir la cantidad separada por tabulador, dos puntos o guion (ej. <em>"Vasos de tubo: 50"</em>); si no pones cantidad se añade con "1".
              </div>
              <div className="agregar-campo">
                <label className="agregar-label">Items a añadir</label>
                <textarea
                  placeholder={"Vasos de tubo: 50\nManteles negros\nFocos led - 4"}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={10}
                  style={{ ...selectStyle, padding: "12px 14px", fontSize: "0.85rem", fontFamily: "monospace", cursor: "text", resize: "vertical" }}
                />
              </div>
              {error && <div className="agregar-error"><AlertTriangle size={14} /> {error}</div>}
              <button onClick={analizar} disabled={!texto.trim()} className="agregar-btn-principal">
                Analizar →
              </button>
            </>
          )}

          {/* PASO CONFIRMAR: aviso previo — qué se añade, qué se omite por estar ya en la checklist */}
          {paso === "confirmar" && (
            <>
              <div className="agregar-ok">
                ✓ {propuestos.length} items interpretados. Desmarca los que no quieras añadir — los ya presentes en la checklist aparecen desmarcados por defecto para no duplicar.
              </div>
              <div className="agregar-lista">
                {propuestos.map((p, idx) => (
                  <label key={idx} className={`agregar-fila ${p.duplicado ? "is-duplicado" : ""}`}>
                    <input type="checkbox" checked={p.incluir} onChange={() => toggleIncluir(idx)} />
                    <div style={{ flex: 1 }}>
                      <div className="agregar-fila-nombre">{p.label} <span className="agregar-fila-qty">· {p.qty}</span></div>
                      <div className="agregar-fila-nota">
                        {p.duplicado ? "⚠ Ya existe en la checklist (se omite)" : `Se añadirá a: ${p.categoria}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="agregar-acciones">
                <button onClick={() => setPaso("pegar")} className="agregar-btn-atras">← Atrás</button>
                <button onClick={confirmar} disabled={nInclu === 0} className="agregar-btn-confirmar">
                  ✓ Añadir {nInclu} item{nInclu === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Lee el estado guardado (link ?c=... o localStorage) de forma síncrona, ANTES del primer
// render, para que cada useState arranque ya con el valor correcto. Hacerlo en un efecto
// (después del montaje) provoca una carrera con el guardado automático: en StrictMode,
// donde React ejecuta los efectos del montaje dos veces, el efecto de guardado puede
// escribir los valores por defecto en localStorage antes de que el de carga los restaure.
// Nombres de los eventos que este dispositivo ya dio por subidos a la nube. Sirve
// para distinguir "creado aquí y aún sin subir" de "borrado desde otro dispositivo".
const CLAVE_SINCRONIZADOS = "gula_eventos_sincronizados";
function leerSincronizados() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE_SINCRONIZADOS) || "[]"); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function guardarSincronizados(nombres) {
  try { localStorage.setItem(CLAVE_SINCRONIZADOS, JSON.stringify(nombres)); } catch (e) { /* localStorage no disponible */ }
}

// ─── LINK DE SOLO MARCAR ───────────────────────────────────────────────────────
// El link de un evento se le pasa a quien carga el camión. Hasta ahora daba lo mismo
// que a ti: podía cambiar cantidades, quitar items o tocar la configuración sin
// querer, y eso se sincroniza a todo el mundo. Con "?solo=1" la pantalla se queda en
// modo marcar: se ve la checklist, se abre Modo carga y se marca todo lo que haga
// falta, pero no se puede cambiar QUÉ se carga.
//
// Es una barrera contra el despiste, no contra alguien con mala idea: quien tenga el
// link y sepa quitarle el "?solo=1" vuelve a poder editar. Para impedirlo de verdad
// haría falta que la nube distinguiera quién escribe cada campo, y eso son otras
// reglas y otro día.
// Basta con "solo=1". ANTES exigía ADEMÁS que hubiera "evento=", y eso lo dejaba
// muerto justo cuando no hay nube: sin ella el link no lleva "evento=" sino la
// checklist dentro ("?c=..."), así que "Link para marcar" copiaba un link que se abría
// editable como cualquier otro, sin avisar de nada. Pidiendo solo "solo=1" funciona con
// las dos formas de link.
function esSoloMarcar() {
  try {
    return !!new URLSearchParams(window.location.search).get("solo");
  } catch (e) { return false; }
}

// "Link para marcar" abre DIRECTO en Modo carga, en Salida. Antes aterrizaba en la
// checklist entera y había que encontrar y pulsar "Modo carga": para quien recibe el
// link por WhatsApp y solo tiene que ir marcando lo que sube al camión, eso es una
// pantalla de más y una que no le hace falta. Dentro tiene Salida y Vuelta, que es lo
// que marca logística, y sigue pudiendo salir de ahí si necesita mirar otra cosa.
//
// Va en su propia marca ("carga=1") y no colgado de "solo=1" a propósito: los links
// que ya se mandaron llevan solo "solo=1" y tienen que seguir abriéndose como se
// abrían. Los nuevos llevan las dos.
function abreEnModoCarga() {
  try {
    return !!new URLSearchParams(window.location.search).get("carga");
  } catch (e) { return false; }
}

// Solo ver: la checklist entera para consultarla, sin poder marcar NADA. Es el link
// del metre — necesita saber qué hay y cuánto, pero las marcas de carga son de
// logística y una casilla tocada por error deja a alguien pensando que algo está
// cargado cuando no lo está. Lleva "solo=1" además (misma lectura, sin edición) y lo
// único que quita de más es la entrada a Modo carga.
function esSoloVista() {
  try {
    return !!new URLSearchParams(window.location.search).get("vista");
  } catch (e) { return false; }
}

function leerEstadoGuardado() {
  try {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    // Se sanea SIEMPRE al entrar: un campo con el tipo equivocado (de un ?c= viejo o
    // manipulado) tumbaba la app al dibujar, y como el estado se guarda, recargar
    // volvía a tumbarla. Ver src/estado.js.
    if (c) return { estado: sanearEstado(JSON.parse(decodeURIComponent(c))), desdeLink: true };
    const guardado = localStorage.getItem("gula_checklist_estado");
    if (guardado) return { estado: sanearEstado(JSON.parse(guardado)), desdeLink: false };
  } catch (e) { /* link corrupto, localStorage no disponible, o JSON inválido: se ignora */ }
  return { estado: {}, desdeLink: false };
}

// Selector de opciones en botones (Sillas, Horno, Cafetera...). Va a nivel de módulo
// a propósito: definido dentro de App, React lo trata como un componente NUEVO en cada
// render y desmonta y vuelve a montar los nueve selectores con cada tecla que se pulse.
const SegmentedControl = React.memo(({ value, onChange, options, label }) => (
  <div className="segment-group">
    <span className="segment-label">{label}</span>
    <div className="segmented-control">
      {options.map(opt => (
        <button key={opt} className={`segment-btn ${value === opt ? "active" : ""}`} onClick={() => onChange(opt)}>{opt}</button>
      ))}
    </div>
  </div>
));

// Lista que muestra solo unos pocos elementos y despliega el resto bajo demanda,
// para que "Eventos guardados" y "Plantillas" no crezcan sin fin cuando hay muchos.
function ListaColapsable({ nombres, limite = 5, children }) {
  const [verTodos, setVerTodos] = useState(false);
  // El orden lo decide quien usa la lista (nombres ya viene ordenado).
  const visibles = verTodos ? nombres : nombres.slice(0, limite);
  return (
    <div className="plantillas-lista">
      {visibles.map(children)}
      {nombres.length > limite && (
        <button className="ver-todos-btn" onClick={() => setVerTodos(v => !v)}>
          {verTodos ? "▲ Ver menos" : `▼ Ver todos (${nombres.length})`}
        </button>
      )}
    </div>
  );
}

// ─── UNA FILA DE LA LISTA ──────────────────────────────────────────────────────
// Está fuera del componente grande y envuelta en React.memo por una razón medida: con
// 162 items, cada tecla que se pulsaba en CUALQUIER campo (el nombre del evento, la
// ubicación, las notas) repintaba las 162 filas aunque ninguna cambiara. En un móvil
// de gama media eran 92 ms por letra. Así solo se repinta la fila cuyo dato ha cambiado.
//
// Los manejadores llegan en una referencia que nunca cambia de identidad (accionesRef):
// si se pasaran como funciones sueltas se crearían nuevas en cada render y la
// memoización no serviría de nada.
const FilaItem = React.memo(function FilaItem({
  categoria, label, labelOriginal, displayQty, manualIdx, esAlquilerManual, sufijo,
  editado, renombrado, editando, nombreTemporal, alquilerTemporal, acciones, soloMarcar = false,
}) {
  const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
  const keyId = `${categoria}::${labelOriginal ?? label}`;
  const esItemManual = manualIdx !== undefined;

  // ─── La cantidad se escribe en local y se confirma con una pausa ───────────
  // Cada tecla escribía en el estado del evento entero: eso reconstruye la checklist
  // (150 y pico filas), la vuelve a guardar y programa la subida a la nube. Medido:
  // unos 100 ms por pulsación, que escribiendo rápido se nota y se comen letras.
  //
  // Ahora lo que se teclea vive AQUÍ mientras dura, y sube al evento cuando se para de
  // escribir (o al salir del campo). Lo de fuera no cambia: la cantidad acaba en el
  // mismo sitio, marca el item para revisar igual y se sincroniza igual.
  const [tecleando, setTecleando] = React.useState(null);
  const temporizadorRef = React.useRef(null);
  // Mientras no se esté tecleando manda lo que venga de fuera: así un cambio de otro
  // dispositivo (o un recálculo) se ve al momento, como hasta ahora.
  const qty = tecleando ?? displayQty;
  const confirmar = (valor) => {
    clearTimeout(temporizadorRef.current);
    acciones.current.editarCantidad(categoria, labelOriginal ?? label, valor);
  };
  // Al desmontar la fila (cambiar de evento, ocultar el item) no se puede perder lo
  // último tecleado: se confirma antes de irse.
  React.useEffect(() => () => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
  }, []);

  // Nº de bateas recalculado siempre en vivo a partir de lo que se esté mostrando
  // (aunque la cantidad se edite a mano), no de un texto fijado
  const bateaSize = bateaSizeDe(label);
  const bateaCount = bateaSize ? Math.ceil((parseFloat(qty.replace(",", ".")) || 0) / bateaSize) : null;
  // Igual que las bateas, pero para bebidas que se piden en cajas (cerveza, vino, refrescos)
  const cajaSize = bateaSize ? null : cajaSizeDe(label);
  const cajaCount = cajaSize ? Math.ceil((parseFloat(qty.replace(",", ".")) || 0) / cajaSize) : null;
  return (
    <div className={`item-row ${alq ? "is-alquiler" : ""}`}>
      {editando && !soloMarcar ? (
        <div className="item-edit-row">
          <input
            type="text"
            className="item-name-input"
            value={nombreTemporal}
            autoFocus
            onChange={e => acciones.current.setNombreTemporal(e.target.value)}
            onBlur={() => acciones.current.confirmarEdicion(categoria, labelOriginal ?? label, manualIdx, label, alquilerTemporal)}
            onKeyDown={e => {
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") { acciones.current.setNombreTemporal(label); acciones.current.setAlquilerTemporal(esAlquilerManual); e.target.blur(); }
            }}
          />
          <label className="item-edit-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
            <input
              type="checkbox"
              checked={alquilerTemporal}
              onMouseDown={e => e.preventDefault()}
              onChange={e => acciones.current.setAlquilerTemporal(e.target.checked)}
            />
            <Tag size={12} /> Alquiler
          </label>
        </div>
      ) : (
        <div className="item-name">
          <span className="item-name-lead">
            <IconoItem label={label} />
            <span className="item-label-text">
              {label}
              {(editado || renombrado) && <span title={renombrado ? "Nombre corregido a mano" : "Cantidad editada a mano"} className="item-edit-flag"><Asterisk size={11} /></span>}
              {alq && <span className="tag-alquiler"><Tag size={10} /> ALQUILER</span>}
            </span>
          </span>
        </div>
      )}
      <input
        type="text"
        className="item-qty-input"
        value={qty}
        // Con el link de solo marcar la cantidad se lee pero no se toca: quien carga
        // el camión no tiene por qué cambiar QUÉ se carga, y un cambio suyo se
        // sincronizaría a todo el mundo.
        readOnly={soloMarcar}
        title={soloMarcar ? "Con este link las cantidades no se cambian" : "Click para editar la cantidad"}
        onChange={e => {
          const valor = e.target.value;
          setTecleando(valor);
          // Medio segundo sin teclear = ya está. Lo justo para no ir por detrás de los
          // dedos y lo bastante corto para que nadie note que hay un retardo.
          clearTimeout(temporizadorRef.current);
          temporizadorRef.current = setTimeout(() => confirmar(valor), 500);
          // Parpadeo verde de confirmación: se reinicia la animación en cada tecla
          e.target.classList.remove("qty-flash");
          void e.target.offsetWidth;
          e.target.classList.add("qty-flash");
        }}
        // Al salir del campo se confirma ya, sin esperar: si alguien escribe y cierra
        // la app en el mismo segundo, lo tecleado no se puede quedar por el camino.
        onBlur={e => { if (tecleando !== null) { confirmar(e.target.value); setTecleando(null); } }}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        onAnimationEnd={e => e.target.classList.remove("qty-flash")}
        onFocus={e => e.target.select()}
        size={Math.max(2, qty.length)}
      />
      {/* El "=" no es adorno: sin él, "5" y al lado "1 caja de 24" se lee como dos
          cantidades distintas y no se sabe si hay que llevar 5 o 24. Con el igual
          queda claro que es la MISMA cantidad dicha en envases: 5 uds = 1 caja.
          Y donde el número ya son cajas o packs (envase fijo, columna de la derecha
          sin "="), el texto es solo la etiqueta de lo que se cuenta. */}
      {bateaCount !== null ? (
        <span className="item-batea-info" title={`${displayQty} copas caben en estas bateas. Se recalcula solo al cambiar la cantidad.`}>= {bateaCount === 1 ? "1 batea" : `${bateaCount} bateas`} de {bateaSize}</span>
      ) : cajaCount !== null ? (
        <span className="item-batea-info" title={`${displayQty} unidades son estas cajas. Se recalcula solo al cambiar la cantidad.`}>= {cajaCount === 1 ? "1 caja" : `${cajaCount} cajas`} de {cajaSize}</span>
      ) : sufijo ? (
        <span className="item-batea-info" title="El número de la izquierda ya va en este envase: no cambia aunque edites la cantidad">{sufijo}</span>
      ) : null}
      {/* Renombrar y quitar items cambian la checklist para todo el mundo: con el
          link de solo marcar no se ofrecen. */}
      {!soloMarcar && (
        <div className="item-actions">
          <button
            className="item-action-btn"
            onClick={() => acciones.current.empezarEdicion(keyId, label, esAlquilerManual)}
            title="Editar el nombre / marcar alquiler proveedor"
            aria-label={`Editar ${label}`}
          ><Pencil size={13} /></button>
          <button
            className="item-action-btn item-action-borrar"
            onClick={() => esItemManual ? acciones.current.quitarManual(manualIdx) : acciones.current.ocultar(categoria, labelOriginal ?? label)}
            title="Quitar de la lista"
            aria-label={`Quitar ${label}`}
          ><X size={14} /></button>
        </div>
      )}
    </div>
  );
});

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App({ onCerrarSesion } = {}) {
  // El archivo de eventos (colección "indice") es del EQUIPO y sus reglas piden sesión
  // iniciada. Quien abre un link de un evento no la tiene —a propósito: el link se manda
  // al móvil del personal sin darles la app entera— así que sus intentos de sincronizar
  // el archivo se rechazaban siempre y salía un "No se ha podido guardar en la nube"
  // rojo en cada cambio. El evento SÍ se guardaba (sus reglas no piden sesión); lo que
  // fallaba era el archivo, que no es suyo y no tiene por qué tocar.
  // Acceso.jsx solo pasa onCerrarSesion cuando hay sesión de verdad: por eso vale de señal.
  const haySesionEquipo = !!onCerrarSesion;
  const [{ estado: estadoInicial, desdeLink: linkAbiertoInicial }] = useState(leerEstadoGuardado);
  const [evento, setEvento]         = useState(estadoInicial.evento ?? "boda");
  const [nombreEvento, setNombreEvento] = useState(estadoInicial.nombreEvento ?? "");
  const [fechaEvento, setFechaEvento]   = useState(estadoInicial.fechaEvento ?? "");
  const [horaInicio, setHoraInicio]     = useState(estadoInicial.horaInicio ?? "");
  const [ubicacion, setUbicacion]       = useState(estadoInicial.ubicacion ?? "");
  const [notasEvento, setNotasEvento]   = useState(estadoInicial.notasEvento ?? "");
  const [pax, setPax]               = useState(estadoInicial.pax ?? 80);
  const [ninos, setNinos]           = useState(estadoInicial.ninos ?? 0);
  // Solo producción: pax de cada día de rodaje/producción (ej. [12, 17, 12]). Lo
  // reutilizable se calcula para el día de MÁS pax y lo consumible para la SUMA.
  const [diasProduccion, setDiasProduccion] = useState(estadoInicial.diasProduccion ?? []);
  const diasPaxValidos = evento === "produccion" ? diasProduccion.map(d => parseInt(d, 10)).filter(n => n > 0) : [];
  // El pax que manda para las carpas: se montan una vez y se quedan, así que van por
  // el día de más gente, no por la suma de todos.
  const paxCarpas = diasPaxValidos.length ? Math.max(...diasPaxValidos) : pax;
  const [barraCoctel, setBarraCoctel] = useState(estadoInicial.barraCoctel ?? true);
  const [horasCoctel, setHorasCoctel] = useState(estadoInicial.horasCoctel ?? 2);
  const [barraCopas, setBarraCopas]   = useState(estadoInicial.barraCopas ?? false);
  const [horasCopas, setHorasCopas]   = useState(estadoInicial.horasCopas ?? 4);
  const [dobleServicio, setDobleServicio]             = useState(estadoInicial.dobleServicio ?? false);
  // Barril de cerveza (30L/50L, con tirador): descuenta esos litros de los tercios
  // necesarios en vez de sustituirlos del todo — puede haber tercios y barril a la
  // vez (el barril cubre parte y el resto se completa con botellín), solo barril
  // (si cubre todo lo necesario) o solo tercios (si no se lleva barril)
  const [tamanoBarril, setTamanoBarril] = useState(estadoInicial.tamanoBarril ?? "No lleva");
  const [numBarriles, setNumBarriles]   = useState(estadoInicial.numBarriles ?? 1);
  const [llevaEntrante, setLlevaEntrante]             = useState(estadoInicial.llevaEntrante ?? false);
  // Entrante compartido en plato (independiente del chupito): cuántas personas
  // comparten cada plato y cuántos entrantes distintos se reparten
  const [entranteCompartido, setEntranteCompartido] = useState(estadoInicial.entranteCompartido ?? false);
  const [numEntrantesCompartir, setNumEntrantesCompartir] = useState(estadoInicial.numEntrantesCompartir ?? 1);
  // "Lleva canapés" hacía dos cosas a la vez: sumar bandejas Y dejar los platos fuera
  // de la carga, y en una boda normal hay canapés en el cóctel Y platos en el banquete,
  // así que marcarlo te dejaba sin platos. Ahora las bandejas van siempre (por pax) y
  // lo único que se marca es si el servicio es entero de bandeja. La casilla vieja ya
  // no existe: se conserva su valor guardado solo para heredarlo aquí, y así los
  // eventos de antes siguen generando su misma lista.
  const [llevaCanapes] = useState(estadoInicial.llevaCanapes ?? false);
  const [soloBandeja, setSoloBandeja] = useState(estadoInicial.soloBandeja ?? estadoInicial.llevaCanapes ?? false);
  const [llevaPaella, setLlevaPaella]                 = useState(estadoInicial.llevaPaella ?? false);
  const [tipoPaella, setTipoPaella]                   = useState(estadoInicial.tipoPaella ?? "Auto");
  // 0 = las que salgan de la gente (una cada 30). Se guarda el 0 en vez de la cuenta
  // ya hecha para que al cambiar el pax se recalcule solo, como antes de poder ponerlo
  // a mano; en cuanto se escribe un número, manda ese.
  const [numPaellas, setNumPaellas]                   = useState(estadoInicial.numPaellas ?? 0);
  const [estiloPlatoPrincipal, setEstiloPlatoPrincipal] = useState(estadoInicial.estiloPlatoPrincipal ?? "Blanco liso");
  // En producción el plato de postre siempre fue el negro/gris, así que ese es su
  // valor de partida; en el resto de eventos, blanco. Solo aplica cuando el evento
  // no trae ya un estilo guardado.
  const [estiloPlatoPostre, setEstiloPlatoPostre]       = useState(estadoInicial.estiloPlatoPostre ?? (estadoInicial.evento === "produccion" ? "Negro/gris" : "Blanco"));
  const [llevaArmarioCaliente, setLlevaArmarioCaliente] = useState(estadoInicial.llevaArmarioCaliente ?? false);
  // Plancha de gas: en producción va fija; en el resto es opcional. Suma 1 bombona.
  const [llevaPlanchaGas, setLlevaPlanchaGas] = useState(estadoInicial.llevaPlanchaGas ?? false);
  // Cada plancha lleva SU bombona: antes la plancha era un sí/no y sumaba una sola, así
  // que poner una segunda a mano no subía el gas y se salía con una bombona de menos.
  const [numPlanchasGas, setNumPlanchasGas] = useState(estadoInicial.numPlanchasGas ?? 1);
  // Platos y cubiertos se pueden poner en "No llevan" para servicio de solo bandejas /
  // finger food (cóctel de pie). Van por separado por si solo se quita uno de los dos.
  const [llevaPlatos, setLlevaPlatos]       = useState(estadoInicial.llevaPlatos ?? true);
  // Los eventos guardados antes de separar postre de principal no tienen este campo:
  // se hereda de llevaPlatos para que sigan generando exactamente la misma lista.
  const [llevaPlatosPostre, setLlevaPlatosPostre] = useState(estadoInicial.llevaPlatosPostre ?? estadoInicial.llevaPlatos ?? true);
  const [llevaCubiertos, setLlevaCubiertos] = useState(estadoInicial.llevaCubiertos ?? true);
  const [numCamareros, setNumCamareros]                 = useState(estadoInicial.numCamareros ?? 0);
  // Ratio de camareros configurable: "1 camarero cada X pax". 0 = automático (usa el
  // recomendado por tipo de evento: boda/comunión 12, corporativo 18, cumple/produ 20).
  const [paxPorCamarero, setPaxPorCamarero]             = useState(estadoInicial.paxPorCamarero ?? 0);
  // Staff extra (cocina, producción, refuerzo...) que no sirve mesas pero también
  // consume agua/vasos: se suma a los camareros para calcular esos consumibles
  const [numStaff, setNumStaff]                         = useState(estadoInicial.numStaff ?? 0);
  const [tipoBandejas, setTipoBandejas] = useState(estadoInicial.tipoBandejas ?? "Mixto");
  const [tipoHorno, setTipoHorno]       = useState(estadoInicial.tipoHorno ?? "Pequeño");
  const [tipoBBQ, setTipoBBQ]           = useState(estadoInicial.tipoBBQ ?? "No lleva");
  // Los eventos guardados hasta ahora llevan mesVerano: true (era el único valor
  // posible, no había control) y ningún dato de temporada. Los que YA HAN PASADO se
  // quedan fijados en lo que tuvieran, para que su lista no cambie de cifras; los que
  // están por venir pasan a automático y se corrigen solos por su fecha.
  const [estacion, setEstacion] = useState(() => temporadaInicial(estadoInicial));
  const mesVerano = esVerano(estacion, fechaEvento);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(estadoInicial.tieneBrindisCava ?? false);
  const [tieneFrituras, setTieneFrituras]       = useState(estadoInicial.tieneFrituras ?? false);
  const [numFrituras, setNumFrituras]           = useState(estadoInicial.numFrituras ?? 1);
  const [llevaChillOut, setLlevaChillOut]       = useState(estadoInicial.llevaChillOut ?? false);
  const [numChillOut, setNumChillOut]           = useState(estadoInicial.numChillOut ?? 1);
  const [fuerzaTextilTela, setFuerzaTextilTela] = useState(estadoInicial.fuerzaTextilTela ?? false);
  const [llevaPalomitera, setLlevaPalomitera]       = useState(estadoInicial.llevaPalomitera ?? false);
  // En producciones casi siempre van carpas y generador, así que empiezan activados:
  // el interruptor está para los sitios que ya tienen sombra o luz propia.
  const [llevaCarpas, setLlevaCarpas]               = useState(estadoInicial.llevaCarpas ?? true);
  const [llevaGenerador, setLlevaGenerador]         = useState(estadoInicial.llevaGenerador ?? true);
  // Mobiliario de alquiler (Event Style): mesas altas, sofás, muebles de barra... No es
  // material nuestro, así que además de salir en la carga hay que ir a por él y devolverlo.
  const [llevaMobiliarioAlquiler, setLlevaMobiliarioAlquiler] = useState(estadoInicial.llevaMobiliarioAlquiler ?? false);
  // Carpas de alquiler (SOS): las 8 del almacén cubren casi todo, pero cuando el cálculo
  // pide más hay que alquilar las que falten. Solo en producciones.
  const [alquilaCarpas, setAlquilaCarpas] = useState(estadoInicial.alquilaCarpas ?? false);
  // Cuántas carpas hacen falta. 0 = las que salgan de la cuenta por pax; cualquier
  // otro número manda sobre ella (lo pone quien ha visto el sitio, o el formulario).
  const [numCarpas, setNumCarpas] = useState(estadoInicial.numCarpas ?? 0);
  // Color de los manteles. Vacío = el de siempre según el tipo de evento, para que un
  // evento guardado antes de existir esta opción cargue exactamente lo mismo.
  const [colorManteles, setColorManteles] = useState(estadoInicial.colorManteles ?? "");
  const [porcentajeBeige, setPorcentajeBeige] = useState(estadoInicial.porcentajeBeige ?? 50);
  const [llevaJarrasCristal, setLlevaJarrasCristal] = useState(estadoInicial.llevaJarrasCristal ?? false);
  const [tipoCafetera, setTipoCafetera]             = useState(estadoInicial.tipoCafetera ?? "Nespresso");
  const [extraBandejasMadera, setExtraBandejasMadera] = useState(estadoInicial.extraBandejasMadera ?? 0);
  const [extraBandejasPlata, setExtraBandejasPlata]   = useState(estadoInicial.extraBandejasPlata ?? 0);
  const [llevaJamonero, setLlevaJamonero]             = useState(estadoInicial.llevaJamonero ?? false);
  // Por defecto SÍ hay tarta: hasta ahora la mesa y los platos se cargaban siempre en
  // boda y comunión, y un evento guardado antes de esto tiene que abrirse igual que
  // estaba. Solo desmarcándolo se quitan (y con ellos la pala y el cuchillo).
  const [llevaTarta, setLlevaTarta]                   = useState(estadoInicial.llevaTarta ?? true);
  const [personasPorPlatoEntrante, setPersonasPorPlatoEntrante] = useState(estadoInicial.personasPorPlatoEntrante ?? 4);
  const [llevaAguasPequenas, setLlevaAguasPequenas]   = useState(estadoInicial.llevaAguasPequenas ?? false);
  // En rodaje las aguas pequeñas van siempre: lo que se elige es el envase. Vacío =
  // como estaba, sin decir nada, para no cambiar los rodajes ya guardados.
  const [tipoAguaPequena, setTipoAguaPequena] = useState(estadoInicial.tipoAguaPequena ?? "");
  const [hayDesayuno, setHayDesayuno]                 = useState(estadoInicial.hayDesayuno ?? false);
  const [tipoNevera, setTipoNevera]         = useState(estadoInicial.tipoNevera ?? "Mediana");
  const [tipoCongelador, setTipoCongelador] = useState(estadoInicial.tipoCongelador ?? "Mediana");
  const [origenSillas, setOrigenSillas]     = useState(estadoInicial.origenSillas ?? "Dealde"); // Dealde | Carvillo | Nuestras | No llevan
  // Equipo de logística (montaje/desmontaje): cada persona con su propio horario.
  // Si hay un estado guardado con el formato antiguo (horario general) se migra a una fila.
  const [logisticaEquipo, setLogisticaEquipo] = useState(estadoInicial.logisticaEquipo ?? (
    estadoInicial.logisticaQuien || estadoInicial.logisticaInicio || estadoInicial.logisticaFin
      ? [{ nombre: estadoInicial.logisticaQuien || "", inicio: estadoInicial.logisticaInicio || "", fin: estadoInicial.logisticaFin || "" }]
      : []
  )); // [{ nombre, inicio, fin, furgoneta }]
  const [tarifaLogistica, setTarifaLogistica] = useState(estadoInicial.tarifaLogistica ?? 10); // €/hora
  // Plus por poner furgoneta propia: 25€ por defecto (rango habitual 20-30€/evento,
  // por encima del kilometraje oficial de 0,26€/km para que compense). Modificable.
  const [plusFurgoneta, setPlusFurgoneta]     = useState(estadoInicial.plusFurgoneta ?? 25);
  // Recogidas: alquileres/equipo de otros proveedores que hay que devolver o recoger en
  // una fecha/hora concreta (camión plataforma, furgonetas, flores, armario caliente...)
  const [recogidas, setRecogidas] = useState(estadoInicial.recogidas ?? []); // [{ concepto, fecha, hora, notas }]
  // Compras: cosas que hay que comprar para el evento, con fecha límite y aviso previo.
  const [compras, setCompras] = useState(estadoInicial.compras ?? []); // [{ concepto, fecha, cantidad, comprado }]
  // Cronómetros de Modo carga: mide lo que se tarda de verdad cargando y descargando.
  // Por fase: { ms: acumulado en pausa, running: bool, since: timestamp del arranque }.
  const [cronos, setCronos] = useState(estadoInicial.cronos ?? {}); // { carga:{...}, descarga:{...} }
  // Categorías renombradas por el usuario: { "nombre original": "nombre nuevo" }
  const [categoriasRenombradas, setCategoriasRenombradas] = useState(estadoInicial.categoriasRenombradas ?? {});
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  // El link de solo ver (el del metre) abre DIRECTO en la hoja: es la vista buena para
  // quien tiene que saber qué hay y qué se devuelve, no la lista de carga con sus
  // casillas. Al cerrarla queda la checklist, también de solo lectura.
  const [modalPrevia, setModalPrevia]   = useState(esSoloVista);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [compartirMsg, setCompartirMsg] = useState("");
  const [menuCompartir, setMenuCompartir] = useState(false);
  const [agregadosTag, setAgregadosTag] = useState("");
  // Confirmación temporal de qué se acaba de guardar (plantilla o evento), para que
  // quede claro cuál de los dos botones se pulsó
  const [guardadoPlantillaMsg, setGuardadoPlantillaMsg] = useState("");
  const [guardadoEventoMsg, setGuardadoEventoMsg] = useState("");
  const [itemsManuales, setItemsManuales] = useState(estadoInicial.itemsManuales ?? []); // [{ label, cantidad, categoria }] — añadidos a mano por el usuario
  const [overridesManuales, setOverridesManuales] = useState(estadoInicial.overridesManuales ?? {}); // { "categoria::label": "cantidad editada a mano" }
  const [itemsOcultos, setItemsOcultos] = useState(estadoInicial.itemsOcultos ?? {}); // { "categoria::label": true } — items calculados quitados de la lista
  const [nombresManuales, setNombresManuales] = useState(estadoInicial.nombresManuales ?? {});
  // Orden de categorías elegido a mano (lista de nombres). Vacío = el de la app.
  const [ordenCategorias, setOrdenCategorias] = useState(estadoInicial.ordenCategorias ?? []); // { "categoria::labelOriginal": "nombre corregido" }
  // Preparar (sacar del almacén y dejarlo listo) y cargar en el camión son dos momentos
  // distintos, muchas veces de personas distintas: llevan su propio check para poder
  // controlar la preparación sin mezclarla con lo que ya está subido al camión.
  const [preparados, setPreparados] = useState(estadoInicial.preparados ?? {}); // { "categoria::label": true } — marcados como preparados en "Modo carga"
  // Items marcados en Modo carga a los que se les cambió la cantidad DESPUÉS de
  // marcarlos: la marca se conserva (es trabajo hecho) pero se señalan para volver a
  // contarlos. Se limpia al volver a tocar su casilla, que es cuando se han revisado.
  const [marcasRevisar, setMarcasRevisar] = useState(estadoInicial.marcasRevisar ?? {});
  const [checkeados, setCheckeados] = useState(estadoInicial.checkeados ?? {}); // { "categoria::label": true } — marcados como "Sale" (cargado) en "Modo carga"
  // Foto de las cantidades AUTOMÁTICAS (sin edición manual) tal como estaban la última vez
  // que se guardó el evento. Sirve para que "Recalcular" pueda detectar si alguna cantidad
  // cambió de valor por un ajuste de fórmula (como este mismo) desde entonces, sin que el
  // usuario tenga que fiarse de la memoria — los items editados a mano nunca se tocan solos.
  const [valoresCalculados, setValoresCalculados] = useState(estadoInicial.valoresCalculados ?? {});
  const [modalRecalcular, setModalRecalcular] = useState(null); // [{ key, label, categoria, anterior, nuevo }] o null
  const [recalcularMsg, setRecalcularMsg] = useState("");
  const [vueltos, setVueltos] = useState(estadoInicial.vueltos ?? {}); // { "categoria::label": true } — marcados como "Vuelve" (devuelto tras el evento)
  const [roturas, setRoturas] = useState(estadoInicial.roturas ?? {}); // { "categoria::label": "2" } — nº de roturas/pérdidas contadas a la vuelta
  const [notasCheck, setNotasCheck] = useState(estadoInicial.notasCheck ?? {}); // { "texto de la nota": true } — recordatorios de las notas marcados como hechos en "Modo carga"
  const [soloVista] = useState(esSoloVista);
  // El link de logística: entra en Modo carga y ahí se queda, sin puerta de salida
  const [soloCarga] = useState(() => abreEnModoCarga() && !esSoloVista());
  // Con el link de solo ver no se entra en Modo carga ni por la puerta de atrás
  const [modoCarga, setModoCarga] = useState(() => abreEnModoCarga() && !esSoloVista());
  // "Solo ver" es "solo marcar" y además sin marcar: hereda todo lo que aquel bloquea
  // (cantidades, nombres, configuración, añadir y quitar items).
  const [soloMarcar] = useState(() => esSoloMarcar() || esSoloVista());
  // Barra fina pegada arriba en móvil: la cabecera con los botones ocupa casi un tercio
  // de la pantalla, así que dejarla fija entera sería peor. En su lugar, al bajar de la
  // cabecera aparece una tira de ~50px con lo único que se usa mientras se recorre la
  // lista: dónde estás, el buscador y Modo carga. React no repinta si el valor no
  // cambia, así que basta con fijar el booleano en cada scroll.
  const [barraFija, setBarraFija] = useState(false);
  useEffect(() => {
    const alBajar = () => setBarraFija(window.scrollY > 260);
    window.addEventListener("scroll", alBajar, { passive: true });
    alBajar();
    return () => window.removeEventListener("scroll", alBajar);
  }, []);
  // Items marcados a mano como "alquiler proveedor", para los que no llevan Dealde/Carvillo/
  // Novelda/alquiler en el nombre y por tanto no se detectan solos (ej. algo puntual que no
  // está incluido y hay que alquilar aparte)
  const [itemsAlquilerManual, setItemsAlquilerManual] = useState(estadoInicial.itemsAlquilerManual ?? {}); // { "categoria::labelOriginal": true }
  const [editandoNombre, setEditandoNombre] = useState(null); // clave "categoria::label" del item cuyo nombre se está editando
  const [nombreTemporal, setNombreTemporal] = useState("");
  const [alquilerTemporal, setAlquilerTemporal] = useState(false); // checkbox "alquiler proveedor" mientras se edita un item
  // Diálogo propio activo (confirmaciones y campos de texto con la estética de la app)
  const [dialogo, setDialogo] = useState(null); // { tipo, titulo, mensaje, placeholder, valorInicial, textoConfirmar, peligro, onConfirm }
  // Id del evento en la nube (edición compartida): si existe, los cambios se
  // sincronizan con Firestore y el link es corto (?evento=id)
  const [eventoNubeId, setEventoNubeId] = useState(estadoInicial.eventoNubeId ?? null);
  // Lista de frases con lo que acaba de cambiar desde otro dispositivo (null = sin aviso)
  const [hayCambiosRemotos, setHayCambiosRemotos] = useState(null);
  const [nuevoItemLabel, setNuevoItemLabel] = useState("");
  const [nuevoItemCantidad, setNuevoItemCantidad] = useState("");
  const [nuevoItemCategoria, setNuevoItemCategoria] = useState("");
  const [nuevoItemAlquiler, setNuevoItemAlquiler] = useState(false);
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [linkAbierto] = useState(linkAbiertoInicial ?? false);
  // Plantillas guardadas con nombre: configuración reutilizable entre eventos
  const [plantillas, setPlantillas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_plantillas")) || {}; } catch (e) { return {}; }
  });
  // Eventos guardados completos (con nombre, fecha, logística...): archivo de checklists
  // que se pueden recargar o compartir por link en cualquier momento
  const [eventosGuardados, setEventosGuardados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_eventos_guardados")) || {}; } catch (e) { return {}; }
  });
  // Avisos de recogidas/devoluciones pendientes (hoy o ya pasadas), mirando TODOS los
  // eventos guardados, no solo el que está abierto — para no olvidar recoger/devolver
  // alquileres (camión plataforma, armario caliente, flores...) de ningún evento.
  const [avisosOcultos, setAvisosOcultos] = useState(false);
  // El formulario de oficina: el código del enlace (vive en la nube, compartido por
  // todos los dispositivos) y lo que han mandado por él. Sin nube esto no existe y la
  // app va exactamente igual que antes.
  const [codigoFormulario, setCodigoFormulario] = useState("");
  const [envios, setEnvios] = useState([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(false);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  // Aviso flotante cuando la oficina manda o cambia algo con la app abierta
  const [avisoEnvios, setAvisoEnvios] = useState(null);
  // A quién avisa la oficina por WhatsApp al mandar o cambiar algo. Se guarda en la
  // nube con el código, así que se pone una vez y vale para todos los dispositivos.
  // El número NO va escrito en el código: este repositorio es público.
  const [avisosWhatsapp, setAvisosWhatsapp] = useState([{ nombre: "Raúl · Jefe de logística", tel: "" }]);
  const primeraFotoEnviosRef = React.useRef(true);
  useEffect(() => {
    if (!avisoEnvios) return;
    const t = setTimeout(() => setAvisoEnvios(null), 30000);
    return () => clearTimeout(t);
  }, [avisoEnvios]);
  // ¿Hay una versión nueva publicada? Los .js llevan hash en el nombre, así que si el
  // navegador se queda con el index.html en caché sigue cargando la compilación vieja
  // para siempre y no te enteras. Se compara el id de la compilación cargada con el
  // version.json del servidor (pidiéndolo sin caché) al abrir, al volver a la pestaña
  // y cada 10 minutos. Si no hay conexión, no se dice nada.
  const [versionNueva, setVersionNueva] = useState(false);
  // Los eventos ya pasados se ocultan por defecto: la lista principal muestra solo los
  // PENDIENTES (fecha futura, el más cercano arriba; los sin fecha al final). Los pasados
  // quedan detrás de un "Ver pasados" para no perder el acceso a ellos.
  const [verPasados, setVerPasados] = useState(false);
  const [filtroEventos, setFiltroEventos] = useState("");
  const { eventosPendientes, eventosPasados } = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const q = _norm(filtroEventos);
    const pend = [], pas = [];
    Object.keys(eventosGuardados).forEach(n => {
      if (q && !_norm(n).includes(q)) return;
      const f = eventosGuardados[n]?.fechaEvento || "";
      if (f && f < hoy) pas.push(n); else pend.push(n);
    });
    pend.sort((a, b) => {
      const fa = eventosGuardados[a]?.fechaEvento || "", fb = eventosGuardados[b]?.fechaEvento || "";
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb);
    });
    pas.sort((a, b) => (eventosGuardados[b]?.fechaEvento || "").localeCompare(eventosGuardados[a]?.fechaEvento || ""));
    return { eventosPendientes: pend, eventosPasados: pas };
  }, [eventosGuardados, filtroEventos]);

  // Avisos de recogidas, devoluciones y compras. Avisan CON ANTELACIÓN: entran en la
  // lista cuando faltan DIAS_AVISO días o menos (o si ya están atrasados), no solo el
  // mismo día. Cada aviso lleva su lista y campo para poder marcarlo como hecho.
  //
  // Cinco días y no tres: una recogida de flores o de minutas no se resuelve el mismo
  // día — hay que llamar, confirmar y pasar a por ello. Con tres días la llamada
  // llegaba justa.
  const DIAS_AVISO = 5;
  // Suelo por abajo: una recogida de hace dos meses que nunca se marcó no es un
  // recordatorio, es ruido que tapa lo de esta semana. Se deja de avisar pasado ese
  // tiempo (el dato sigue en el evento, solo desaparece del panel de avisos).
  const DIAS_AVISO_CADUCA = 60;
  const avisosRecogidas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hoyISO = hoy.toISOString().slice(0, 10);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + DIAS_AVISO);
    const limiteISO = limite.toISOString().slice(0, 10);
    const diasHasta = (f) => Math.round((new Date(f + "T00:00:00") - hoy) / 86400000);
    const suelo = new Date(hoy); suelo.setDate(suelo.getDate() - DIAS_AVISO_CADUCA);
    const sueloISO = suelo.toISOString().slice(0, 10);
    const dentroVentana = (f) => f && f <= limiteISO && f >= sueloISO;
    const avisos = [];
    Object.entries(eventosGuardados).forEach(([nombreEvt, datos]) => {
      (datos.recogidas || []).forEach((r, idx) => {
        if (!r.concepto) return;
        if (dentroVentana(r.fecha) && !r.recogido) avisos.push({ evento: nombreEvt, idx, concepto: r.concepto, fecha: r.fecha, tipo: "Recogida", lista: "recogidas", campo: "recogido", dias: diasHasta(r.fecha) });
        // La devolución NO se avisa mientras la recogida siga pendiente: todavía no hay
        // nada que devolver y el mismo concepto salía dos veces seguidas ("Recogida:
        // generador" y justo debajo "Devolución: generador"), que es lo que hacía que
        // el aviso pareciera duplicado. En cuanto se marca la recogida como hecha,
        // aparece la devolución. Excepción: si la devolución vence hoy o está atrasada
        // se avisa igual aunque nadie marcara la recogida, para no pagar días de más.
        const devVencida = r.fechaDevolucion && diasHasta(r.fechaDevolucion) <= 0;
        if (dentroVentana(r.fechaDevolucion) && !r.devuelto && (r.recogido || devVencida)) {
          avisos.push({ evento: nombreEvt, idx, concepto: soloObjeto(r.concepto), fecha: r.fechaDevolucion, tipo: "Devolución", lista: "recogidas", campo: "devuelto", dias: diasHasta(r.fechaDevolucion) });
        }
      });
      (datos.compras || []).forEach((c, idx) => {
        if (!c.concepto) return;
        if (dentroVentana(c.fecha) && !c.comprado) avisos.push({ evento: nombreEvt, idx, concepto: c.concepto + (c.cantidad ? ` (${c.cantidad})` : ""), fecha: c.fecha, tipo: "Compra", lista: "compras", campo: "comprado", dias: diasHasta(c.fecha) });
      });
    });
    avisos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return avisos.map(a => ({ ...a, hoyISO }));
  }, [eventosGuardados]);
  // Marca una recogida/devolución/compra como hecha desde el propio aviso: se guarda en el
  // evento afectado (nube incluida) y, si es el evento abierto, también en su estado vivo
  const marcarAvisoHecho = (aviso) => {
    const { lista, campo } = aviso;
    const datos = eventosGuardados[aviso.evento];
    if (datos) {
      const nuevoEstado = { ...datos, [lista]: (datos[lista] || []).map((r, idx) => idx === aviso.idx ? { ...r, [campo]: true } : r) };
      guardarEventos({ ...eventosGuardados, [aviso.evento]: nuevoEstado });
      // El doc individual del link compartido también se actualiza si el evento tiene uno
      if (nubeActiva() && nuevoEstado.eventoNubeId) guardarEventoNube(nuevoEstado.eventoNubeId, nuevoEstado).catch(avisarFalloNube);
    }
    // Si el evento del aviso es el que está abierto en el formulario (mismo nombre o
    // mismo id de nube), su estado vivo también se marca — así un "Guardar evento"
    // posterior no pisa el hecho con el pendiente antiguo
    const esElAbierto = aviso.evento === nombreEvento || (datos && datos.eventoNubeId && datos.eventoNubeId === eventoNubeId);
    if (esElAbierto) {
      const setter = lista === "compras" ? setCompras : setRecogidas;
      setter(prev => prev.map((r, idx) => idx === aviso.idx ? { ...r, [campo]: true } : r));
    }
  };
  // Historial para deshacer cambios manuales (cantidad editada o item quitado).
  // Se guarda un snapshot al EMPEZAR a editar cada item (no por cada tecla).
  // El nombre que has escrito ya es de otro evento guardado: no se auto-guarda para no
  // pisarlo, y se dice claramente en vez de dejarlo en silencio.
  const [nombreOcupado, setNombreOcupado] = useState(false);
  const [historial, setHistorial] = useState([]);
  const ultimaClaveEditadaRef = React.useRef(null);

  // Snapshot de todo el estado configurable — lo usan tanto el link para el móvil
  // como el guardado automático en localStorage
  const getEstadoActual = () => ({
    evento, nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, pax, ninos,
    barraCoctel, horasCoctel, barraCopas, horasCopas, diasProduccion,
    dobleServicio, tamanoBarril, numBarriles, llevaEntrante, llevaCanapes, soloBandeja, llevaPaella, tipoPaella, numPaellas, // llevaCanapes: solo se conserva para no perderlo al guardar
    estiloPlatoPrincipal, estiloPlatoPostre,
    llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos, llevaPlatosPostre, llevaCubiertos, numCamareros, paxPorCamarero, numStaff, tipoBandejas,
    tipoHorno, tipoBBQ, estacion, mesVerano,
    tieneFrituras, numFrituras, fuerzaTextilTela, llevaChillOut, numChillOut,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, llevaCarpas, llevaGenerador,
    llevaMobiliarioAlquiler, alquilaCarpas, numCarpas, tieneBrindisCava, colorManteles, porcentajeBeige,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta,
    personasPorPlatoEntrante, llevaAguasPequenas, tipoAguaPequena, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, origenSillas, itemsManuales, overridesManuales,
    itemsOcultos, nombresManuales, categoriasRenombradas, ordenCategorias, itemsAlquilerManual, preparados, checkeados, vueltos, roturas, marcasRevisar, notasCheck, cronos,
    valoresCalculados, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, eventoNubeId,
  });
  const estadoActualJSON = JSON.stringify(getEstadoActual());

  // Guarda automáticamente en este navegador cada vez que cambia algo, para no perder
  // la configuración si se recarga la página o se cierra sin querer. El estado inicial
  // ya se restauró de forma síncrona (ver leerEstadoGuardado/estadoInicial arriba), así
  // que no hace falta guardia de "carga completada": no hay carrera con StrictMode.
  useEffect(() => {
    try { localStorage.setItem("gula_checklist_estado", estadoActualJSON); } catch (e) { /* localStorage lleno o no disponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);

  // Indicador "Guardado ✓": parpadea un instante tras cada cambio (el guardado en el
  // navegador es inmediato). Se salta el primer render para no aparecer al abrir.
  const [guardadoFlash, setGuardadoFlash] = useState(false);
  // Hasta ahora TODOS los guardados en la nube se tragaban su error en silencio: si
  // fallaban (sin conexión, permisos, o el archivo pasado del límite de 1 MB de
  // Firestore) la app parecía haber guardado. Ahora el fallo se ve y no desaparece
  // solo, para poder actuar antes de perder el trabajo hecho.
  const [errorNube, setErrorNube] = useState(null);
  // El aviso decía SIEMPRE "revisa la conexión", fuera cual fuera el fallo. Con una
  // sesión caducada eso manda a mirar el wifi durante un rato largo mientras lo que
  // hace falta es volver a entrar. Cada causa tiene su frase y su arreglo.
  const avisarFalloNube = (e) => {
    const codigo = String(e?.code || "");
    const msg = String(e?.message || e || "");
    if (/permission-denied|unauthenticated/i.test(codigo + " " + msg)) {
      setErrorNube("La sesión del equipo ha caducado. Los cambios están guardados en este dispositivo: vuelve a entrar para subirlos.");
      return;
    }
    if (/longer than|exceeds|maximum|too large|invalid-argument|resource-exhausted/i.test(codigo + " " + msg)) {
      setErrorNube("El archivo de eventos ya no cabe en la nube. Borra o archiva eventos antiguos para poder seguir guardando.");
      return;
    }
    setErrorNube("No se ha podido guardar en la nube. Los cambios están en este dispositivo; revisa la conexión.");
  };
  const primerGuardadoRef = React.useRef(true);
  useEffect(() => {
    if (primerGuardadoRef.current) { primerGuardadoRef.current = false; return; }
    setGuardadoFlash(true);
    const t = setTimeout(() => setGuardadoFlash(false), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);

  // ─── SINCRONIZACIÓN EN LA NUBE (si hay configuración de Firebase) ──────────
  // Referencias para distinguir nuestros propios guardados de los de otra persona
  const estadoActualJSONRef = React.useRef(estadoActualJSON);
  estadoActualJSONRef.current = estadoActualJSON;
  const ultimoGuardadoNubeRef = React.useRef(null);

  // Las marcas de tiempo de NUESTROS últimos guardados. Sirven para reconocer el eco de
  // lo que hemos escrito nosotros cuando vuelve por la suscripción.
  //
  // No se compara con la hora del móvil de nadie más a propósito: dos teléfonos con el
  // reloj desajustado unos minutos —que es de lo más normal— harían que los cambios de
  // uno se descartaran en el otro sin que nadie entendiera por qué. Solo se reconocen
  // las marcas propias, y para eso el reloj es siempre el mismo.
  const nuestrosGuardadosRef = React.useRef([]);
  const apuntarGuardadoPropio = (ts) => {
    if (!ts) return;
    // Diez llegan de sobra: el eco tarda un segundo, no media hora
    nuestrosGuardadosRef.current = [...nuestrosGuardadosRef.current.slice(-9), ts];
  };

  // Cada cambio local se sube a la nube con un pequeño retardo (evita subir por cada tecla)
  useEffect(() => {
    if (!nubeActiva() || !eventoNubeId) return;
    const t = setTimeout(() => {
      ultimoGuardadoNubeRef.current = estadoActualJSON;
      guardarEventoNube(eventoNubeId, getEstadoActual())
        .then((ts) => { apuntarGuardadoPropio(ts); setErrorNube(null); })
        .catch(avisarFalloNube);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON, eventoNubeId]);

  // Setters de cada campo, para poder aplicar un estado remoto SIN recargar la página
  const SETTERS_SYNC = {
    evento: setEvento, nombreEvento: setNombreEvento, fechaEvento: setFechaEvento,
    horaInicio: setHoraInicio, ubicacion: setUbicacion, notasEvento: setNotasEvento, pax: setPax, ninos: setNinos,
    barraCoctel: setBarraCoctel, horasCoctel: setHorasCoctel, barraCopas: setBarraCopas, horasCopas: setHorasCopas, diasProduccion: setDiasProduccion,
    dobleServicio: setDobleServicio, tamanoBarril: setTamanoBarril, numBarriles: setNumBarriles, llevaEntrante: setLlevaEntrante, soloBandeja: setSoloBandeja,
    llevaPaella: setLlevaPaella, tipoPaella: setTipoPaella, numPaellas: setNumPaellas,
    estiloPlatoPrincipal: setEstiloPlatoPrincipal, estiloPlatoPostre: setEstiloPlatoPostre,
    llevaArmarioCaliente: setLlevaArmarioCaliente, llevaPlanchaGas: setLlevaPlanchaGas, numPlanchasGas: setNumPlanchasGas, llevaPlatos: setLlevaPlatos, llevaPlatosPostre: setLlevaPlatosPostre, llevaCubiertos: setLlevaCubiertos, numCamareros: setNumCamareros, paxPorCamarero: setPaxPorCamarero, numStaff: setNumStaff, tipoBandejas: setTipoBandejas,
    tipoHorno: setTipoHorno, tipoBBQ: setTipoBBQ, estacion: setEstacion, tieneBrindisCava: setTieneBrindisCava,
    tieneFrituras: setTieneFrituras, numFrituras: setNumFrituras, fuerzaTextilTela: setFuerzaTextilTela,
    llevaChillOut: setLlevaChillOut, numChillOut: setNumChillOut,
    llevaPalomitera: setLlevaPalomitera, llevaJarrasCristal: setLlevaJarrasCristal, tipoCafetera: setTipoCafetera,
    llevaCarpas: setLlevaCarpas, llevaGenerador: setLlevaGenerador,
    llevaMobiliarioAlquiler: setLlevaMobiliarioAlquiler, alquilaCarpas: setAlquilaCarpas, numCarpas: setNumCarpas,
    colorManteles: setColorManteles, porcentajeBeige: setPorcentajeBeige,
    extraBandejasMadera: setExtraBandejasMadera, extraBandejasPlata: setExtraBandejasPlata, llevaJamonero: setLlevaJamonero, llevaTarta: setLlevaTarta,
    personasPorPlatoEntrante: setPersonasPorPlatoEntrante, llevaAguasPequenas: setLlevaAguasPequenas, tipoAguaPequena: setTipoAguaPequena, hayDesayuno: setHayDesayuno,
    entranteCompartido: setEntranteCompartido, numEntrantesCompartir: setNumEntrantesCompartir,
    tipoNevera: setTipoNevera, tipoCongelador: setTipoCongelador, origenSillas: setOrigenSillas,
    logisticaEquipo: setLogisticaEquipo, tarifaLogistica: setTarifaLogistica, plusFurgoneta: setPlusFurgoneta, recogidas: setRecogidas, compras: setCompras,
    itemsManuales: setItemsManuales, overridesManuales: setOverridesManuales,
    itemsOcultos: setItemsOcultos, nombresManuales: setNombresManuales, categoriasRenombradas: setCategoriasRenombradas, ordenCategorias: setOrdenCategorias,
    itemsAlquilerManual: setItemsAlquilerManual, preparados: setPreparados, checkeados: setCheckeados, vueltos: setVueltos, roturas: setRoturas, marcasRevisar: setMarcasRevisar, notasCheck: setNotasCheck, cronos: setCronos,
    valoresCalculados: setValoresCalculados,
    eventoNubeId: setEventoNubeId,
  };
  const settersSyncRef = React.useRef(SETTERS_SYNC);
  settersSyncRef.current = SETTERS_SYNC;

  // Escucha los guardados de otras personas en este evento: cuando llega uno que
  // no es nuestro se aplica AL INSTANTE (sin recargar) y se muestra un aviso con
  // el detalle de lo que ha cambiado
  useEffect(() => {
    if (!nubeActiva() || !eventoNubeId) return;
    const unsub = suscribirEventoNube(eventoNubeId, (remotoJSON, meta = {}) => {
      if (remotoJSON === estadoActualJSONRef.current || remotoJSON === ultimoGuardadoNubeRef.current) return;
      // El primer aviso de cada escritura es la nuestra sin confirmar: no hay nada que
      // aplicar, ya lo tenemos delante.
      if (meta.pendiente) return;
      // Y aquí está lo que hacía que las horas de barra "se cambiaran solas", sin que
      // nadie tocara nada desde ningún otro sitio: al mover un deslizador varias veces
      // seguidas se suben varios estados, y el eco del penúltimo llega cuando ya vas
      // por el último. Solo se comparaba el texto con el ÚLTIMO guardado nuestro, así
      // que el eco del anterior colaba y te devolvía el valor viejo — el deslizador
      // saltaba solo hacia atrás un segundo después de soltarlo.
      // Reconociendo la marca de tiempo como nuestra, ese eco se descarta entero.
      if (meta.actualizado && nuestrosGuardadosRef.current.includes(meta.actualizado)) return;
      let remoto, previo;
      // También lo que llega de la nube: puede venir de una versión distinta
      try { remoto = sanearEstado(JSON.parse(remotoJSON)); previo = JSON.parse(estadoActualJSONRef.current); }
      catch (e) { return; /* estado remoto corrupto: se ignora */ }
      const cambios = resumirCambios(previo, remoto);
      // Marcar ANTES de aplicar: así el guardado automático que provocará este
      // cambio de estado no se re-detecta como "cambio de otra persona"
      ultimoGuardadoNubeRef.current = remotoJSON;
      Object.entries(remoto).forEach(([k, v]) => {
        // Un doc remoto guardado sin nombre (típico: se puso el nombre solo en el
        // diálogo de guardar, no en el campo) no debe borrar el nombre que ya
        // tenemos: sin esto, al abrir ese evento el snapshot inicial de la nube
        // vaciaba el campo nada más inyectarlo, y el diálogo salía vacío otra vez
        if (k === "nombreEvento" && !v && previo.nombreEvento) return;
        if (settersSyncRef.current[k]) settersSyncRef.current[k](v);
      });
      if (cambios.length > 0) {
        setHayCambiosRemotos(cambios);
        // 25 segundos en vez de 10: da tiempo a leerlo aunque estés cargando el camión
        // con las manos ocupadas. Y siempre se puede cerrar con la ✕.
        clearTimeout(window.__avisoSyncTimer);
        window.__avisoSyncTimer = setTimeout(() => setHayCambiosRemotos(null), 25000);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoNubeId]);

  // Si hay nombre de evento, se antepone al link copiado ("Boda Ana y Luis: https://...")
  // para poder distinguir de qué evento es al pegarlo en WhatsApp u otro chat.
  // El aviso que sale en el propio botón de Compartir. Pasa por aquí por dos motivos:
  //   · un aviso nuevo borra el temporizador del anterior, que si no el "✓" de hace dos
  //     segundos apagaba el aviso que acababa de salir;
  //   · y los avisos llevan prioridad, porque el "¡Link copiado!" y el "no ha subido"
  //     compiten: el portapapeles y la subida terminan cada uno cuando quieren, y en
  //     las pruebas se vio que el "✓" llegaba el último y tapaba el fallo. Un aviso de
  //     más prioridad no se deja pisar por uno de menos.
  const avisoCompartirRef = React.useRef(null);
  const avisoPrioridadRef = React.useRef(0);
  const avisarCompartir = (texto, ms = 3000, prioridad = 0) => {
    if (prioridad < avisoPrioridadRef.current) return;
    avisoPrioridadRef.current = prioridad;
    if (avisoCompartirRef.current) clearTimeout(avisoCompartirRef.current);
    setCompartirMsg(texto);
    avisoCompartirRef.current = setTimeout(() => {
      setCompartirMsg("");
      avisoCompartirRef.current = null;
      avisoPrioridadRef.current = 0;
    }, ms);
  };

  // Se copia SOLO la dirección, sin el nombre del evento delante. Llevaba
  // "Evento: https://…" para que en WhatsApp se supiera de cuál era, pero eso rompía
  // pegarlo en la barra del navegador: al ver un texto con espacios, el navegador lo
  // BUSCA en vez de abrirlo, y parecía que el link no funcionaba. En WhatsApp da
  // igual, que ahí la dirección se detecta sola y de qué evento es se escribe al lado.
  // Compartir un link tiene dos caminos, y el orden importa:
  //
  // 1) El botón de compartir del móvil (navigator.share). Manda el NOMBRE y la
  //    DIRECCIÓN por separado, así que en el WhatsApp llega "Boda Anna y Mario ·
  //    carga" con su link debajo, tocable, y sin pasar por el portapapeles. Es lo
  //    que hacía falta: un link suelto entre veinte mensajes no hay quien lo
  //    encuentre después.
  // 2) Si el móvil o el navegador no lo tienen, se copia al portapapeles.
  //
  // Y aquí está la trampa que ya nos costó una vez: se copiaba "Nombre: https://…"
  // y quien pegaba ESO en la barra del navegador no abría nada — al ver un texto con
  // espacios, el navegador BUSCA en vez de abrir. Por eso, cuando toca copiar, la
  // dirección va SOLA y en su propia línea, la última, y el nombre encima. Pegado en
  // el WhatsApp se ve el nombre y el link tocable; y si alguien copia solo la última
  // línea, tiene la dirección limpia.
  const copiarLink = (url, nombre = "", queEs = "") => {
    const titulo = [nombre, queEs].filter(Boolean).join(" · ");
    // El share del móvil tiene que salir DENTRO del toque, igual que la copia: detrás
    // de un await el navegador lo rechaza por no venir de un gesto.
    if (navigator.share) {
      navigator.share({ title: titulo || "Checklist Gula", text: titulo, url })
        .then(() => avisarCompartir("¡Compartido! ✓"))
        // Cancelar el menú de compartir no es un fallo: no se dice nada y no se copia
        // nada a la espalda de nadie.
        .catch(() => {});
      return;
    }
    const texto = titulo ? `${titulo}\n${url}` : url;
    navigator.clipboard.writeText(texto).then(() => {
      avisarCompartir(nombre ? `¡Link de "${nombre}" copiado! ✓` : "¡Link copiado! ✓");
    }).catch(() => {
      // Sin permiso de portapapeles (o sin HTTPS): se muestra el link para copiarlo a
      // mano. Aquí va la dirección sola: es lo que hay que poder seleccionar de un tirón.
      window.prompt("No se pudo copiar automáticamente. Copia el link:", url);
    });
  };

  // ─── ALQUILERES ↔ RECOGIDAS ─────────────────────────────────────────────────
  // Activar un alquiler crea su recogida (el día antes) y su devolución (el día
  // después); desactivarlo la quita. Solo se toca la entrada marcada con `auto`: las
  // recogidas escritas a mano no se rozan nunca. Y si ya se marcó como recogida o
  // devuelta, no se borra aunque se apague el interruptor — el material está de por
  // medio y hay que devolverlo igual.
  // "yaEscritaAMano" es un patrón para reconocer una recogida que ya escribió alguien
  // para lo mismo. Sin esto, la de las sillas salía DUPLICADA en los eventos donde ya
  // había una a mano ("Recoger sillas Dealde"): la automática no la reconocía como
  // suya y creaba otra al lado, con otra fecha. Dos avisos para una sola cosa.
  const sincronizaAlquiler = (clave, activo, concepto, yaEscritaAMano = null) => {
    setRecogidas(prev => {
      const i = prev.findIndex(r => r.auto === clave);
      if (activo && i === -1 && yaEscritaAMano
          && prev.some(r => !r.auto && yaEscritaAMano.test(String(r.concepto || "")))) {
        return prev; // ya hay una escrita a mano para esto: manda la suya
      }
      if (activo) {
        // Ya existe: solo se refresca el nombre (p. ej. al cambiar de proveedor), nunca
        // las fechas, que a estas alturas pueden estar puestas a mano
        if (i !== -1) return prev.map((r, idx) => idx === i ? { ...r, concepto } : r);
        return [...prev, {
          concepto, hora: "",
          fecha: sumaDias(fechaEvento, -DIAS_ANTES_RECOGIDA),
          fechaDevolucion: sumaDias(fechaEvento, DIAS_DESPUES_DEVOLUCION),
          auto: clave, fechasAuto: true,
        }];
      }
      if (i === -1 || prev[i].recogido || prev[i].devuelto) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  };
  // Las sillas son alquiler POR DEFECTO ("Dealde"), pero su recogida solo se creaba si
  // alguien tocaba el selector con el dedo. Un evento nuevo, o uno que llega del
  // formulario de la oficina con las sillas ya puestas, se quedaba con sillas de
  // alquiler y sin recogida: nadie sabía cuándo había que ir a por ellas ni cuándo
  // devolverlas, que es justo lo que se olvida.
  const sillasVistasRef = React.useRef(null);
  useEffect(() => {
    // La fecha entra en la clave porque un evento sin fecha todavía no puede crear su
    // recogida: al ponerla, esto se vuelve a mirar y ya se crea con sus dos días.
    const clave = `${origenSillas}::${fechaEvento || ""}`;
    if (sillasVistasRef.current === clave) return;
    const primeraVez = sillasVistasRef.current === null;
    sillasVistasRef.current = clave;
    // Sin fecha de evento no hay nada que decir: una recogida sin día no responde a
    // "¿cuándo hay que ir?", que es justo para lo que existe, y sí saldría contada
    // como pendiente en el resumen. Se espera a que haya fecha.
    if (!fechaEvento) return;
    // Al ABRIR un evento ya pasado tampoco se toca nada: crear ahora su recogida sería
    // sacar un aviso rojo de algo que se hizo hace meses, y quitarla sería borrar el
    // registro de lo que ocurrió. Solo se sincroniza al cambiarlo de verdad.
    if (primeraVez && fechaEvento < hoyISO()) return;
    const esAlquiler = origenSillas === "Dealde" || origenSillas === "Carvillo";
    sincronizaAlquiler("sillas", esAlquiler, conceptoAlquiler("sillas", origenSillas), /silla/i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenSillas, fechaEvento]);

  // El generador de las producciones viene marcado de serie (siempre se lleva uno), así
  // que su recogida se crea al elegir el tipo de evento, que es cuando entra en juego —
  // si no, el único alquiler que nadie llega a pulsar sería justo el que más se olvida.
  // Al salir de producción se retiran el generador y las carpas de alquiler, que solo
  // existen ahí.
  const handleCambiarTipoEvento = (tipo) => {
    setEvento(tipo);
    if (tipo === "produccion") {
      if (llevaGenerador) sincronizaAlquiler("generador", true, conceptoAlquiler("generador"));
      // En un rodaje no se alquila mobiliario: si venía marcado, se apaga con su recogida
      if (llevaMobiliarioAlquiler) {
        setLlevaMobiliarioAlquiler(false);
        sincronizaAlquiler("mobiliario", false);
      }
      return;
    }
    sincronizaAlquiler("generador", false);
    if (alquilaCarpas) { setAlquilaCarpas(false); sincronizaAlquiler("carpas", false); }
  };
  // Al poner o cambiar la fecha del evento se recolocan las fechas de los alquileres
  // que sigan con las propuestas por la app. Las que se hayan tocado a mano se quedan.
  const handleCambiarFechaEvento = (nuevaFecha) => {
    setFechaEvento(nuevaFecha);
    setRecogidas(prev => prev.map(r => r.auto && r.fechasAuto
      ? { ...r, fecha: sumaDias(nuevaFecha, -DIAS_ANTES_RECOGIDA), fechaDevolucion: sumaDias(nuevaFecha, DIAS_DESPUES_DEVOLUCION) }
      : r));
  };
  // Cualquier cambio a mano en las fechas de una recogida automática la desengancha de
  // la fecha del evento: a partir de ahí manda lo que haya puesto el usuario.
  const editarRecogida = (i, cambios, tocaFechas = false) =>
    setRecogidas(prev => prev.map((x, idx) => idx === i
      ? { ...x, ...cambios, ...(tocaFechas && x.fechasAuto ? { fechasAuto: false } : {}) }
      : x));

  // Tres links, cada uno para una persona distinta:
  //   "edicion" — sin marcas. Quien lo abre puede cambiarlo todo.
  //   "marcar"  — "solo=1". La checklist entera, sin poder tocar cantidades.
  //   "carga"   — "solo=1&carga=1". Además entra DIRECTO en Modo carga (Salida), que
  //               es a lo único que va quien carga el camión: marcar lo que sube y,
  //               al volver, lo que baja. Sin buscar el botón de Modo carga en la
  //               cabecera con el móvil en una mano.
  // "carga=1" va aparte de "solo=1" y no colgado de él a propósito: los links que ya
  // se mandaron llevan solo "solo=1" y tienen que seguir abriéndose como se abrían.
  const handleGenerarLink = (tipo = "edicion") => {
    const marca = tipo === "carga" ? "&solo=1&carga=1"
      : tipo === "vista" ? "&solo=1&vista=1"
      : tipo === "marcar" ? "&solo=1" : "";
    // Qué link es, para que en el WhatsApp se distinga de los otros del mismo evento.
    // Sin esto, cuatro links iguales del mismo día y a ver quién acierta.
    const queEs = tipo === "carga" ? "carga del camión"
      : tipo === "vista" ? "solo ver"
      : tipo === "marcar" ? "para marcar" : "para editar";
    // Cada clic empieza limpio: si el anterior acabó en un aviso de fallo, ese aviso no
    // puede quedarse mandando y tapar el resultado de este
    avisoPrioridadRef.current = 0;
    if (nubeActiva()) {
      // Link corto con edición compartida: la checklist vive en la nube y los
      // cambios de cualquiera con el link se sincronizan
      const id = eventoNubeId || nuevoIdEvento();
      if (!eventoNubeId) setEventoNubeId(id);
      const estado = { ...getEstadoActual(), eventoNubeId: id };
      ultimoGuardadoNubeRef.current = JSON.stringify(estado);
      // El portapapeles se escribe AQUÍ, dentro del propio clic. El navegador solo deja
      // copiar mientras dura el gesto de quien pulsa: al esperar antes a que el evento
      // subiera, la copia caía fuera del gesto y el navegador la rechazaba — se cerraba
      // el menú y no pasaba nada más. El respaldo (un prompt con el link) tampoco se ve
      // en una app instalada, así que el fallo era invisible.
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}${marca}`, nombreEvento, queEs);
      // Y la subida se comprueba DESPUÉS: el link está copiado, pero hasta que el evento
      // no esté en la nube ese link no abre nada al otro lado. Eso hay que decirlo antes
      // de que lo manden, que es como nacía un link muerto sin que se enterara nadie.
      //
      // Ojo con el plazo: Firestore NO rechaza la escritura cuando no hay conexión, la
      // deja pendiente hasta que el servidor la confirme. Esperando solo al fallo, sin
      // cobertura no llegaría el aviso nunca — que es el caso en el que más falta hace.
      // Por eso se avisa también si tarda demasiado.
      let resuelto = false;
      const aTiempo = setTimeout(() => {
        if (resuelto) return;
        avisarCompartir("Copiado, pero el evento aún NO ha subido ⚠", 9000, 1);
      }, ESPERA_SUBIDA_LINK);
      guardarEventoNube(id, estado)
        .then((ts) => { apuntarGuardadoPropio(ts); resuelto = true; clearTimeout(aTiempo); setErrorNube(null); })
        .catch((e) => {
          resuelto = true;
          clearTimeout(aTiempo);
          avisarFalloNube(e);
          // En el mismo sitio donde sale "¡Link copiado!", que es donde se está mirando,
          // y con prioridad para que el "✓" del portapapeles no lo tape si llega después
          avisarCompartir("Copiado, pero el evento NO ha subido ✗", 9000, 1);
        });
    } else {
      // Sin nube el link lleva la checklist dentro. Aquí el "solo marcar" también vale:
      // no se sincroniza con nadie, pero evita que quien carga cambie lo que ve.
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(estadoActualJSON)}${marca}`, nombreEvento, queEs);
    }
    setMenuCompartir(false);
  };

  const handleNuevoEvento = () => setDialogo({
    tipo: "confirm",
    titulo: "¿Empezar un evento nuevo?",
    mensaje: "Se borrará la configuración guardada de este navegador (pax, extras, items añadidos a mano...).",
    textoConfirmar: "Empezar de cero",
    peligro: true,
    onConfirm: () => {
      try { localStorage.removeItem("gula_checklist_estado"); } catch (e) { /* localStorage no disponible */ }
      marcarEventoActivo(""); // evento nuevo: no auto-guarda hasta que se guarde por primera vez
      window.location.href = window.location.origin + window.location.pathname;
    },
  });

  // ─── PLANTILLAS GUARDADAS ─────────────────────────────────────────────────
  const guardarPlantillas = (obj) => {
    setPlantillas(obj);
    try { localStorage.setItem("gula_plantillas", JSON.stringify(obj)); } catch (e) { /* localStorage lleno o no disponible */ }
  };
  const handleGuardarPlantilla = () => setDialogo({
    tipo: "prompt",
    titulo: "💾 Guardar como PLANTILLA",
    mensaje: "Guarda solo la configuración reutilizable (pax, extras, equipamiento...), SIN nombre/fecha/ubicación del evento. Útil para reutilizar en futuros eventos parecidos.",
    placeholder: 'Ej: Boda estándar 100 pax',
    textoConfirmar: "Guardar plantilla",
    onConfirm: (nombre) => {
      // La plantilla guarda la configuración reutilizable, no los datos del evento
      // concreto (nombre, fecha, hora, ubicación, equipo de logística), que cambian en cada evento
      const { nombreEvento: _n, fechaEvento: _f, horaInicio: _h, ubicacion: _u, notasEvento: _no,
              logisticaEquipo: _le, eventoNubeId: _id, ...config } = getEstadoActual();
      guardarPlantillas({ ...plantillas, [nombre]: config });
      setGuardadoPlantillaMsg(`✓ Guardada como PLANTILLA: "${nombre}"`);
      setTimeout(() => setGuardadoPlantillaMsg(""), 3500);
    },
  });
  const handleAplicarPlantilla = (nombre) => {
    if (!plantillas[nombre]) return;
    setDialogo({
      tipo: "confirm",
      titulo: `¿Cargar la plantilla "${nombre}"?`,
      mensaje: "Se sustituirá la configuración actual (nombre, fecha, hora y ubicación del evento se mantienen).",
      textoConfirmar: "Cargar plantilla",
      onConfirm: () => {
        // Se escribe el estado combinado en localStorage y se recarga: el arranque
        // síncrono (leerEstadoGuardado) lo restaura igual que tras cerrar el navegador
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify({ ...getEstadoActual(), ...plantillas[nombre] })); } catch (e) { /* localStorage no disponible */ }
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  // ─── EVENTOS GUARDADOS (checklist completa con nombre, fecha, logística...) ──
  // La nube es la fuente de verdad: gana la escritura más reciente por timestamp.
  // NO se "fusiona" el mapa local con el de la nube (una fusión aditiva nunca puede
  // representar un borrado: si faltaba una clave en un lado solo significa "no tocada",
  // así que un evento recién borrado localmente resucitaba en cuanto llegaba cualquier
  // snapshot -aunque fuera uno viejo, en caché, de antes del borrado- de la nube).
  const ultimaEscrituraLocalRef = React.useRef(0);
  // Última versión del archivo que hemos escrito. Se usa para calcular qué eventos
  // han cambiado y subir SOLO esos, en vez del mapa entero.
  const eventosGuardadosRef = React.useRef(eventosGuardados);
  // Mientras la primera sincronización está en marcha llegan fotos incompletas del
  // archivo: hasta que termina, no se deja que sustituyan la lista local.
  const primeraSincroHechaRef = React.useRef(false);
  // Nombre del evento "activo" (el que has abierto o guardado en esta sesión). Solo ese
  // se auto-guarda, para no sobrescribir un evento bueno con un borrador del mismo nombre.
  const eventoActivoRef = React.useRef((() => { try { return localStorage.getItem("gula_evento_activo") || ""; } catch (e) { return ""; } })());
  const marcarEventoActivo = (nombre) => {
    eventoActivoRef.current = nombre || "";
    try { if (nombre) localStorage.setItem("gula_evento_activo", nombre); else localStorage.removeItem("gula_evento_activo"); } catch (e) { /* localStorage no disponible */ }
  };
  // Tema: automático por horario, o fijado a mano. Tres posiciones en el mismo botón:
  //   auto   → oscuro de las 20:00 a las 7:00, claro el resto del día (y cambia solo
  //            mientras la app está abierta: montando al atardecer se pone oscuro)
  //   claro  → siempre claro
  //   oscuro → siempre oscuro
  // Lo elegido se recuerda. Quien ya tenía "claro" u "oscuro" guardado de antes lo
  // conserva; el automático es lo que viene de fábrica.
  const [preferenciaTema, setPreferenciaTema] = useState(() => leerPreferenciaTema());
  const [tema, setTema] = useState(() => temaSegunPreferencia(leerPreferenciaTema()));
  useEffect(() => {
    try { localStorage.setItem("gula_tema", preferenciaTema); } catch (e) { /* localStorage no disponible */ }
    const aplicar = () => setTema(temaSegunPreferencia(preferenciaTema));
    aplicar();
    if (preferenciaTema !== "auto") return;
    // En automático se vuelve a mirar la hora cada 5 minutos y al volver a la pestaña,
    // para que el cambio ocurra aunque la app lleve horas abierta
    const cadaRato = setInterval(aplicar, 5 * 60 * 1000);
    const alVolver = () => { if (document.visibilityState === "visible") aplicar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(cadaRato); document.removeEventListener("visibilitychange", alVolver); };
  }, [preferenciaTema]);
  useEffect(() => { document.documentElement.dataset.tema = tema; }, [tema]);
  // ─── LO QUE SE QUEDÓ SIN SUBIR ────────────────────────────────────────────────
  // Si falla la subida del archivo —sesión caducada, sin cobertura, el móvil en un
  // sótano— los cambios se quedaban SOLO en este dispositivo y no volvían a intentarse
  // nunca: había que acordarse de tocar algo otra vez para que se reintentara. Aquí se
  // guarda el archivo que no llegó a subir y se reintenta cuando hay ocasión.
  //
  // Solo se guarda la ÚLTIMA versión, no una cola de cambios: el archivo entero se
  // manda de una pieza, así que la última contiene todo lo anterior. Una cola sería
  // pelearse por reproducir el orden de cosas que ya vienen resueltas.
  const pendienteSubirRef = React.useRef(null);
  const subirArchivo = (anterior, obj) => {
    ultimaEscrituraLocalRef.current = Date.now();
    return sincronizarArchivoNube(anterior, obj)
      .then(() => { pendienteSubirRef.current = null; setErrorNube(null); })
      .catch((e) => {
        // El "anterior" que se guarda es el de la primera vez que falló: desde ahí es
        // desde donde hay que calcular qué mandar cuando por fin entre.
        pendienteSubirRef.current = { anterior: pendienteSubirRef.current?.anterior ?? anterior, obj };
        avisarFalloNube(e);
      });
  };

  const guardarEventos = (obj) => {
    const anterior = eventosGuardadosRef.current;
    eventosGuardadosRef.current = obj;
    setEventosGuardados(obj);
    try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(obj)); } catch (e) { /* localStorage lleno o no disponible */ }
    // Con la nube activa el archivo se sincroniza evento a evento: se ve igual desde
    // cualquier dispositivo y, al no ir todo en un solo documento, no hay techo.
    if (nubeActiva() && haySesionEquipo) subirArchivo(anterior, obj);
  };

  // Reintento: al recuperar la conexión y cada minuto mientras quede algo pendiente.
  // Sin esto, quien perdió la sesión a media carga tenía que acordarse de volver a
  // tocar algo para que se subiera, y nadie se acuerda de eso descargando un camión.
  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    const reintentar = () => {
      const p = pendienteSubirRef.current;
      if (!p || !navigator.onLine) return;
      subirArchivo(p.anterior, eventosGuardadosRef.current || p.obj);
    };
    window.addEventListener("online", reintentar);
    const cada = setInterval(reintentar, 60000);
    // Y al volver a la app desde otra pestaña o tras desbloquear el móvil, que es
    // justo cuando se ha recuperado la cobertura sin que salte el evento "online".
    const alVolver = () => { if (document.visibilityState === "visible") reintentar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("online", reintentar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(cada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haySesionEquipo]);

  useEffect(() => {
    if (!nubeActiva()) return;
    let cancelado = false;
    const guardarLocal = (mapa) => {
      eventosGuardadosRef.current = mapa;
      setEventosGuardados(mapa);
      try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(mapa)); } catch (e) { /* localStorage lleno o no disponible */ }
    };
    // Aplica SOLO lo que ha cambiado. Sustituir la lista entera por la foto de la
    // colección borraba de la pantalla los eventos que Firestore aún no conocía.
    const aplicarCambios = ({ cambios, actualizado }) => {
      if (!cambios || !cambios.length || cancelado) return;
      if (!primeraSincroHechaRef.current) return;
      const base = { ...(eventosGuardadosRef.current || {}) };
      let algo = false;
      cambios.forEach(c => {
        if (c.tipo === "borrado") {
          if (base[c.nombre] !== undefined) { delete base[c.nombre]; algo = true; }
          return;
        }
        if (JSON.stringify(base[c.nombre]) === JSON.stringify(c.estado)) return; // eco nuestro
        base[c.nombre] = c.estado;
        algo = true;
      });
      if (!algo) return;
      if (actualizado > ultimaEscrituraLocalRef.current) ultimaEscrituraLocalRef.current = actualizado;
      guardarLocal(base);
      guardarSincronizados(Object.keys(base));

      // Y si lo que ha cambiado es el evento que tienes ABIERTO, se aplica a la
      // pantalla, no solo a la lista. Antes esto solo pasaba con los eventos que
      // tenían link compartido, así que dos personas con el mismo evento abierto sin
      // link no se enteraban de nada: cada una editaba su copia y ganaba la última en
      // guardar, en silencio. La lista sí se actualizaba; lo que tenías delante, no.
      let previo;
      try { previo = JSON.parse(estadoActualJSONRef.current); } catch (e) { return; }
      const remoto = cambioDelEventoAbierto(cambios, eventoActivoRef.current, previo);
      if (!remoto) return;
      const listaCambios = resumirCambios(previo, remoto).filter(t => !/^Foto de cantidades/.test(t));
      if (!listaCambios.length) return; // es nuestro propio guardado de vuelta
      Object.entries(remoto).forEach(([k, v]) => {
        if (k === "nombreEvento" && !v && previo.nombreEvento) return;
        if (settersSyncRef.current[k]) settersSyncRef.current[k](v);
      });
      setHayCambiosRemotos(listaCambios);
      clearTimeout(window.__avisoSyncTimer);
      window.__avisoSyncTimer = setTimeout(() => setHayCambiosRemotos(null), 25000);
    };
    // Arranque: se FUSIONA lo que hay en la nube con lo que hay en este dispositivo, y
    // lo que solo esté aquí se sube. Antes se sustituía, así que un evento que todavía
    // no estuviera en la nube desaparecía de la lista. Fusionar lo arregla solo: en
    // cuanto se abre la app, lo que falte vuelve a aparecer y se sube.
    const sincronizar = async () => {
      try {
        const archivo = await cargarArchivoNube();
        if (cancelado) return;
        const local = eventosGuardadosRef.current || {};
        // Lo que hay AHORA MISMO como documento por evento. Es la referencia contra la
        // que se calcula qué falta por subir: si se compara contra el índice viejo, los
        // eventos que solo estaban allí se dan por subidos y nunca llegan a tener su
        // documento, así que desaparecen para los demás dispositivos.
        const enArchivo = archivo && !archivo.vacio ? archivo.mapa : {};
        // Para fusionar sí vale el índice viejo (un solo documento), que es de donde
        // venimos. No se borra: queda como copia de seguridad.
        let remoto = enArchivo;
        if (!archivo || archivo.vacio) {
          const viejo = await cargarIndiceEventosNube();
          if (cancelado) return;
          remoto = (viejo && viejo.mapa) || {};
        }
        // Un evento que está aquí pero no en la nube puede ser dos cosas muy distintas:
        //   · creado en este dispositivo y aún sin subir → hay que conservarlo y subirlo
        //   · borrado desde otro dispositivo               → hay que dejarlo ir
        // Se distinguen con la lista de los que este dispositivo ya dio por subidos: si
        // estaba en esa lista y ya no está en la nube, es que lo borraron fuera.
        // Solo se puede dar un evento por borrado fuera si la lectura de la nube ha ido
        // BIEN y ha traído algo. Si falla o viene vacía (sin conexión, sesión caducada,
        // caché fría) no se sabe nada, y ante la duda no se tira nada: se conserva todo.
        const lecturaFiable = !!archivo && !archivo.vacio;
        const yaSincronizados = lecturaFiable ? leerSincronizados() : [];
        const fusionado = { ...remoto };
        Object.keys(local).forEach(n => {
          if (remoto[n] !== undefined) return;
          if (yaSincronizados.includes(n)) return; // borrado en otro dispositivo
          fusionado[n] = local[n];
        });
        guardarLocal(fusionado);
        ultimaEscrituraLocalRef.current = Date.now();
        // Sin sesión del equipo no se sube nada del archivo: sus reglas la exigen y el
        // intento acaba siempre en un rechazo. Quien abre un link de un evento solo
        // trabaja sobre ese evento.
        if (haySesionEquipo) {
          // La lista de "ya subidos" solo se actualiza si la subida ha ido bien: marcar
          // como subido algo que falló haría que se diera por borrado la próxima vez.
          await sincronizarArchivoNube(enArchivo, fusionado);
          guardarSincronizados(Object.keys(fusionado));
        }
      } catch (e) { /* sin conexión: se sigue con lo que haya en local */ }
      finally { primeraSincroHechaRef.current = true; }
    };
    sincronizar();
    const unsub = suscribirArchivoNube(aplicarCambios);
    return () => { cancelado = true; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleGuardarEvento = () => setDialogo({
    tipo: "prompt",
    titulo: "💾 Guardar como EVENTO",
    mensaje: "Guarda esta checklist COMPLETA (con nombre, fecha, ubicación y logística) para volver a abrirla o compartir su link cuando quieras.",
    placeholder: "Ej: Boda Ana y Luis · 15 agosto",
    valorInicial: nombreEvento || "",
    textoConfirmar: "Guardar evento",
    onConfirm: (nombre) => {
      // Se actualiza la foto de cantidades automáticas al guardar: a partir de ahora
      // "Recalcular" comparará contra los valores de ESTE guardado, no de uno anterior
      setValoresCalculados(valoresBaseActuales);
      // El campo "Nombre del evento" se sincroniza con el nombre elegido al guardar:
      // así el siguiente "Guardar evento" ya viene precargado sin volver a escribirlo
      setNombreEvento(nombre);
      marcarEventoActivo(nombre); // a partir de ahora este evento se auto-guarda solo
      guardarEventos({ ...eventosGuardados, [nombre]: { ...getEstadoActual(), nombreEvento: nombre, valoresCalculados: valoresBaseActuales } });
      setGuardadoEventoMsg(`✓ Guardado como EVENTO: "${nombre}"`);
      setTimeout(() => setGuardadoEventoMsg(""), 3500);
    },
  });
  // Auto-guardado. Antes solo se re-guardaba solo el evento que ya habías guardado o
  // abierto: un evento nuevo vivía únicamente en ESTE navegador hasta que le dabas a
  // "Guardar evento", así que si se rompía el móvil o cambiabas de aparato, se perdía.
  // Ahora se guarda solo desde el primer momento, en cuanto tiene nombre, y con ello
  // sube a la nube como cualquier otro.
  //
  // Lo que NO se puede perder por el camino, y por eso está el guardián:
  //   · Un borrador que por casualidad se llame igual que un evento ya guardado no lo
  //     pisa JAMÁS. Se avisa y no se guarda hasta que le cambies el nombre.
  //   · Escribir el nombre a trozos ("Boda", "Boda Ana", "Boda Ana y Luis") no puede
  //     dejar tres eventos: si el activo se renombra, se MUEVE en vez de duplicarse.
  //   · El primer guardado espera 3 segundos, para no crear nada mientras se escribe.
  useEffect(() => {
    const nombre = (nombreEvento || "").trim();
    if (!nombre) { setNombreOcupado(false); return; }
    const activo = eventoActivoRef.current;
    const esElActivo = nombre === activo;
    const ocupadoPorOtro = !esElActivo && !!eventosGuardados[nombre];
    setNombreOcupado(ocupadoPorOtro);
    if (ocupadoPorOtro) return;
    const t = setTimeout(() => {
      setEventosGuardados(prev => {
        // Se vuelve a comprobar aquí dentro: entre el cambio y el guardado han pasado
        // segundos y el nombre o el evento activo pueden ser ya otros
        if (nombre !== (nombreEvento || "").trim()) return prev;
        const activoAhora = eventoActivoRef.current;
        if (nombre !== activoAhora && prev[nombre]) return prev; // se ocupó mientras tanto
        const actualizado = { ...prev };
        // Renombrar el evento activo lo mueve, no lo duplica
        if (activoAhora && activoAhora !== nombre && actualizado[activoAhora]) delete actualizado[activoAhora];
        actualizado[nombre] = { ...getEstadoActual(), nombreEvento: nombre };
        marcarEventoActivo(nombre);
        // Sin esto la referencia se queda vieja y el siguiente cálculo de "qué ha
        // cambiado" compara contra un mapa desfasado.
        eventosGuardadosRef.current = actualizado;
        try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(actualizado)); } catch (e) { /* localStorage no disponible */ }
        if (nubeActiva() && haySesionEquipo) subirArchivo(prev, actualizado);
        return actualizado;
      });
    }, esElActivo ? 1200 : 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);
  useEffect(() => {
    let cancelado = false;
    const comprobar = async () => {
      try {
        // version.json se publica en la RAÍZ, y esta app vive en su carpeta: sin el
        // "../" se pediría /checklist/version.json, que no existe — y el aviso de
        // versión nueva dejaría de saltar sin que se notara.
        const r = await fetch(`../version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { id } = await r.json();
        if (!cancelado && id && id !== __BUILD_ID__) setVersionNueva(true);
      } catch (e) { /* sin conexión o servida desde fichero: se ignora */ }
    };
    comprobar();
    const cadaRato = setInterval(comprobar, 10 * 60 * 1000);
    const alVolver = () => { if (document.visibilityState === "visible") comprobar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { cancelado = true; clearInterval(cadaRato); document.removeEventListener("visibilitychange", alVolver); };
  }, []);

  const handleRecalcular = () => {
    const cambios = [];
    Object.keys(valoresBaseActuales).forEach(key => {
      const nuevo = valoresBaseActuales[key];
      const [categoria, ...resto] = key.split("::");
      const label = resto.join("::");
      const aMano = overridesManuales[key];
      // Cantidad puesta a mano: es justo la que NO se actualiza sola, así que si el
      // cálculo automático ya no coincide (por ejemplo porque ha cambiado el pax) es
      // la primera que hay que ofrecer. Antes se saltaba sin decir nada y el botón
      // contestaba "nada ha cambiado" teniendo una cantidad desfasada delante.
      if (aMano !== undefined) {
        if (String(aMano) === String(nuevo)) return;
        // Si ya se revisó contra este mismo cálculo (y se decidió mantener el valor a
        // mano), no se vuelve a preguntar: solo si el automático se mueve otra vez.
        if (valoresCalculados[key] === nuevo) return;
        cambios.push({ key, categoria, label, anterior: String(aMano), nuevo, aMano: true });
        return;
      }
      const anterior = valoresCalculados[key];
      if (anterior === undefined || anterior === nuevo) return; // nunca guardado, o sin cambios
      cambios.push({ key, categoria, label, anterior, nuevo, aMano: false });
    });
    if (cambios.length === 0) {
      setRecalcularMsg("✓ Nada ha cambiado desde el último guardado");
      setTimeout(() => setRecalcularMsg(""), 3500);
      return;
    }
    setModalRecalcular(cambios);
  };
  const handleAplicarRecalculo = (decisiones) => {
    const nuevosOverrides = { ...overridesManuales };
    const nuevoSnapshot = { ...valoresCalculados };
    modalRecalcular.forEach(c => {
      if (decisiones[c.key] === "mantener") {
        nuevosOverrides[c.key] = c.anterior;
        // En la foto se apunta el cálculo automático que se ha revisado, no el valor
        // que se mantiene: así no se vuelve a preguntar por lo ya decidido, pero sí
        // si el automático cambia otra vez más adelante.
        nuevoSnapshot[c.key] = c.nuevo;
      } else {
        // Con "usar el nuevo" hay que QUITAR la edición manual: si se deja puesta, la
        // cantidad se queda clavada en la de antes y el recalculo no se nota.
        if (c.aMano) delete nuevosOverrides[c.key];
        nuevoSnapshot[c.key] = c.nuevo;
      }
    });
    setOverridesManuales(nuevosOverrides);
    setValoresCalculados(nuevoSnapshot);
    setModalRecalcular(null);
  };
  // ── El formulario de oficina ──────────────────────────────────────────────
  // El código se lee una vez al abrir; con él ya se puede mirar el buzón.
  useEffect(() => {
    if (!nubeActiva()) return;
    let vivo = true;
    leerConfigFormulario().then(({ codigo, avisos }) => {
      if (!vivo || !codigo) return;
      setCodigoFormulario(codigo);
      if (avisos && avisos.length) setAvisosWhatsapp(avisos);
      refrescarEnviosRef.current(codigo);
    }).catch(() => { /* sin conexión: ya se verá al abrir la bandeja */ });
    return () => { vivo = false; };
  }, []);
  // Y a partir de ahí se escucha en vivo: un envío nuevo, o uno que la oficina
  // corrige porque han cambiado los pax, aparece solo sin recargar ni abrir nada.
  useEffect(() => {
    if (!codigoFormulario || !nubeActiva()) return;
    return suscribirEnvios((lista) => {
      // Lo que llega DESPUÉS de la primera foto es novedad: un envío nuevo o uno que
      // han cambiado. Eso se dice en voz alta, porque un cambio no sube el contador
      // de pendientes y pasaría desapercibido justo cuando más importa.
      setEnvios(prev => {
        const antes = new Map(prev.map(e => [e.id, e]));
        if (primeraFotoEnviosRef.current) { primeraFotoEnviosRef.current = false; return lista; }
        const nuevos = lista.filter(e => !antes.has(e.id));
        const cambiados = lista.filter(e => {
          const a = antes.get(e.id);
          return a && (a.enviado?.seconds || 0) !== (e.enviado?.seconds || 0);
        });
        const frases = [
          ...nuevos.map(e => `Nuevo: ${nombreDelEnvio(e)}`),
          // De un cambio interesa QUÉ han cambiado, no que haya cambiado algo: la
          // versión de antes está aquí en memoria, así que se puede decir.
          ...cambiados.map(e => {
            const dif = cambiosEntreRespuestas((antes.get(e.id) || {}).respuestas || {}, e.respuestas || {});
            const detalle = dif.slice(0, 2).map(c => `${c.pregunta.replace(/^¿|\?$/g, "")}: ${c.antes} → ${c.ahora}`).join("; ");
            return `Cambiado ${nombreDelEnvio(e)}${detalle ? ` — ${detalle}` : ""}${dif.length > 2 ? ` (+${dif.length - 2})` : ""}`;
          }),
        ];
        if (frases.length) setAvisoEnvios({ frases, envios: [...nuevos, ...cambiados] });
        return lista;
      });
    });
  }, [codigoFormulario]);
  // La lista corta que ve la oficina se republica cuando cambian los eventos. Va con
  // retardo para no escribir en la nube en cada tecleo mientras se edita un nombre.
  useEffect(() => {
    if (!codigoFormulario || !nubeActiva()) return;
    const t = setTimeout(() => {
      publicarProximos(codigoFormulario, eventosGuardadosRef.current, avisosWhatsapp).catch(() => { /* se reintenta al siguiente cambio */ });
    }, 2000);
    return () => clearTimeout(t);
  }, [codigoFormulario, eventosGuardados, avisosWhatsapp]);
  // Pendiente = lo que aún no se ha revisado. El aviso y el contador cuentan eso, no
  // el buzón entero: lo ya revisado se guarda para consultarlo, no para dar la lata.
  const enviosPendientes = repartirEnvios(envios).pendientes;
  // El enlace que se le pasa a la oficina apunta a la carpeta del formulario, que es
  // una app aparte y hermana de esta (por eso se instala sola, sin arrastrar la
  // checklist). Los enlaces viejos —los que apuntan a la raíz con ?enviar=— siguen
  // valiendo: la raíz los desvía aquí (ver public/index.html).
  const enlaceFormulario = codigoFormulario
    ? `${new URL("../formulario/", window.location.href).href}?enviar=${codigoFormulario}`
    : "";
  const refrescarEnvios = async (codigo = codigoFormulario) => {
    if (!codigo || !nubeActiva()) return;
    setCargandoEnvios(true);
    try { setEnvios(await leerEnvios()); }
    catch (e) { /* sin conexión: se queda con lo que ya tenía */ }
    finally { setCargandoEnvios(false); }
  };
  // El efecto de arranque necesita esta función, pero no puede depender de ella sin
  // volver a ejecutarse en cada render: se le pasa por un ref siempre fresco.
  const refrescarEnviosRef = React.useRef(refrescarEnvios);
  refrescarEnviosRef.current = refrescarEnvios;
  const handleCrearCodigoFormulario = async () => {
    const codigo = nuevoCodigo();
    try {
      await guardarConfigFormulario({ codigo, avisos: avisosWhatsapp });
      await publicarProximos(codigo, eventosGuardadosRef.current, avisosWhatsapp);
      setCodigoFormulario(codigo);
      refrescarEnvios(codigo);
    } catch (e) { avisarFalloNube(e); }
  };
  const handleCambiarCodigoFormulario = () => setDialogo({
    tipo: "confirm",
    titulo: "¿Cambiar el enlace del formulario?",
    mensaje: "El que ya tenga la oficina dejará de funcionar al momento y habrá que pasarles el nuevo. Lo que ya han mandado no se pierde.",
    textoConfirmar: "Cambiar el enlace",
    onConfirm: async () => {
      const viejo = codigoFormulario;
      await handleCrearCodigoFormulario();
      if (viejo) borrarProximos(viejo).catch(() => { /* si no se puede borrar, el nuevo manda igual */ });
    },
  });
  // En el móvil, el compartir del sistema: se manda por WhatsApp sin pegar nada a mano
  const handleCompartirEnlaceFormulario = () => {
    if (!navigator.share) return handleCopiarEnlaceFormulario();
    navigator.share({
      title: "Formulario de Gula",
      text: "Con este enlace nos pas\u00e1is los datos del evento. Se puede guardar en la pantalla de inicio.",
      url: enlaceFormulario,
    }).catch(() => { /* si lo cancelan, no pasa nada */ });
  };
  // Guarda a quién se avisa, en los dos sitios: la config del equipo (para verlo al
  // abrir la app en otro móvil) y la lista que lee el formulario, que es quien pinta
  // el botón de avisar al terminar de mandar.
  const handleGuardarAvisos = (lista) => {
    setAvisosWhatsapp(lista);
    if (!codigoFormulario || !nubeActiva()) return;
    guardarConfigFormulario({ codigo: codigoFormulario, avisos: lista }).catch(avisarFalloNube);
    publicarProximos(codigoFormulario, eventosGuardadosRef.current, lista).catch(() => { /* se reintenta al siguiente cambio */ });
  };
  const handleCopiarEnlaceFormulario = () => {
    navigator.clipboard.writeText(enlaceFormulario).then(() => {
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2500);
    }).catch(() => {
      window.prompt("No se pudo copiar automáticamente. Copia el enlace:", enlaceFormulario);
    });
  };
  const handleDescartarEnvio = (envio) => setDialogo({
    tipo: "confirm",
    titulo: "¿Descartar este envío?",
    mensaje: "Sale de la bandeja sin aplicar nada, pero se queda guardado en \"ya revisados\" por si hay que consultarlo luego.",
    textoConfirmar: "Descartar",
    onConfirm: async () => {
      try { await marcarRevisado(envio.id, { aplicado: false }); } catch (e) { avisarFalloNube(e); }
      refrescarEnvios();
    },
  });
  // Este sí borra de verdad, y solo se ofrece sobre los que ya se han revisado
  const handleBorrarEnvio = (envio) => setDialogo({
    tipo: "confirm",
    titulo: "\u00bfBorrar este env\u00edo del todo?",
    mensaje: "Se borra lo que mand\u00f3 la oficina y deja de poder consultarse. El evento no se toca.",
    textoConfirmar: "Borrar",
    peligro: true,
    onConfirm: async () => {
      try { await borrarEnvio(envio.id); } catch (e) { avisarFalloNube(e); }
      setEnvios(prev => prev.filter(x => x.id !== envio.id));
    },
  });
  // Aplicar = abrir el evento con lo contestado ya puesto. No se escribe nada por
  // detrás en un evento que no estás mirando: lo que llega de fuera se revisa.
  const handleAplicarEnvio = (envio) => {
    const cambios = aRespuestasDeLaApp(envio.respuestas || {});
    const destino = envio.eventoDestino || cambios.nombreEvento || "";
    const guardados = eventosGuardadosRef.current || {};
    const existe = !!(destino && guardados[destino]);
    const nombre = destino || "Evento del formulario";
    setDialogo({
      tipo: "confirm",
      titulo: existe ? `¿Aplicar al evento "${nombre}"?` : `¿Crear el evento "${nombre}"?`,
      mensaje: existe
        ? "Se abre el evento con los datos del formulario puestos encima de lo que ya tenía. Lo que la oficina no contestó se queda como está."
        : "Se crea el evento con lo que ha contestado la oficina; el resto se queda con los valores de siempre para que lo revises.",
      textoConfirmar: existe ? "Aplicar y abrir" : "Crear y abrir",
      onConfirm: async () => {
        const base = existe ? guardados[destino] : {};
        const estado = { ...base, ...cambios, nombreEvento: nombre };
        // Las notas se SUMAN, no se sustituyen: las del evento suelen ser tuyas (a quién
        // llamar, qué recoger) y las del formulario vienen del cliente. Perder unas por
        // las otras es justo lo que no puede pasar.
        const notasAntes = (base.notasEvento || "").trim();
        const notasNuevas = (cambios.notasEvento || "").trim();
        if (notasAntes && notasNuevas && !notasAntes.includes(notasNuevas)) {
          estado.notasEvento = `${notasAntes}\n${notasNuevas}`;
        } else if (notasAntes && !notasNuevas) {
          estado.notasEvento = base.notasEvento;
        }
        // Los alquileres que trae el envío tienen que traer su recogida y su devolución:
        // si no, la app cargaría el material y nadie iría a buscarlo.
        estado.recogidas = recogidasConAlquileres(estado);
        // Y las flores y las minutas, que no son material nuestro sino un sitio y un
        // día al que hay que ir. Se suman sin duplicar: si ya estaba escrita a mano,
        // manda la que ya había (puede tener la fecha ajustada o estar marcada).
        recogidasDelEnvio(envio.respuestas || {}).forEach(r => {
          if (estado.recogidas.some(x => (x.concepto || "").trim().toLowerCase() === r.concepto.toLowerCase())) return;
          estado.recogidas = [...estado.recogidas, r];
        });
        // Y lo que hay que comprar, a Compras: también se suma sin duplicar, que lo
        // que ya estuviera apuntado puede estar marcado como comprado.
        const comprasAntes = Array.isArray(estado.compras) ? estado.compras : [];
        estado.compras = comprasAntes.slice();
        comprasDelEnvio(envio.respuestas || {}).forEach(c => {
          if (estado.compras.some(x => (x.concepto || "").trim().toLowerCase() === c.concepto.toLowerCase())) return;
          estado.compras = [...estado.compras, c];
        });
        const siguiente = { ...guardados, [nombre]: estado };
        guardarEventos(siguiente);
        // No se borra: queda guardado como revisado, con a qué evento fue a parar
        try { await marcarRevisado(envio.id, { aplicado: true, eventoDestino: nombre }); }
        catch (e) { /* si falla, seguirá en la bandeja y se vuelve a intentar */ }
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify(estado)); }
        catch (e) { /* localStorage no disponible */ }
        marcarEventoActivo(nombre);
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  const handleCargarEvento = (nombre) => {
    if (!eventosGuardados[nombre]) return;
    setDialogo({
      tipo: "confirm",
      titulo: `¿Abrir el evento "${nombre}"?`,
      mensaje: "Se sustituirá todo lo que hay ahora en pantalla por la checklist guardada.",
      textoConfirmar: "Abrir evento",
      onConfirm: () => {
        // Si el evento se guardó con el campo "Nombre del evento" vacío (se puso el
        // nombre solo en el diálogo de guardar), al abrirlo se usa el nombre con el
        // que está archivado — así el próximo guardado ya viene con nombre puesto
        const estado = { ...eventosGuardados[nombre], nombreEvento: eventosGuardados[nombre].nombreEvento || nombre };
        // El doc compartido de la nube también se actualiza con el nombre: si no, su
        // snapshot (con nombre vacío) volvería a dejar el campo en blanco tras abrir
        if (nubeActiva() && estado.eventoNubeId && !eventosGuardados[nombre].nombreEvento) {
          guardarEventoNube(estado.eventoNubeId, estado).catch(avisarFalloNube);
        }
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify(estado)); } catch (e) { /* localStorage no disponible */ }
        marcarEventoActivo(estado.nombreEvento || nombre); // al abrirlo, este pasa a auto-guardarse
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  // Copia el link público del evento guardado: quien lo abra ve la checklist
  // en la web (GitHub Pages) sin necesitar nada instalado. Con la nube activa
  // el link es corto y con edición compartida.
  const handleLinkEvento = (nombre) => {
    const guardado = eventosGuardados[nombre];
    if (!guardado) return;
    if (nubeActiva()) {
      const id = guardado.eventoNubeId || nuevoIdEvento();
      const estado = { ...guardado, eventoNubeId: id };
      guardarEventoNube(id, estado).catch(avisarFalloNube);
      if (!guardado.eventoNubeId) guardarEventos({ ...eventosGuardados, [nombre]: estado });
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}`, nombre, "para editar");
    } else {
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(JSON.stringify(guardado))}`, nombre, "para editar");
    }
  };
  const handleBorrarEvento = (nombre) => setDialogo({
    tipo: "confirm",
    titulo: `¿Borrar el evento guardado "${nombre}"?`,
    mensaje: "Los links que ya hayas compartido seguirán funcionando (llevan la checklist dentro).",
    textoConfirmar: "Borrar",
    peligro: true,
    onConfirm: () => {
      const next = { ...eventosGuardados };
      delete next[nombre];
      guardarEventos(next);
    },
  });

  // Duplica un evento guardado: copia toda su configuración con otro nombre, pero como
  // evento independiente y "en limpio" (sin los checks de carga/vuelta/roturas ni el link).
  const handleDuplicarEvento = (nombre) => setDialogo({
    tipo: "prompt",
    titulo: "Duplicar evento",
    mensaje: `Crea una copia de "${nombre}" con la misma configuración pero limpia (sin los checks de Modo carga).`,
    placeholder: `${nombre} (copia)`,
    valorInicial: `${nombre} (copia)`,
    textoConfirmar: "Duplicar",
    onConfirm: (nuevo) => {
      const base = eventosGuardados[nombre];
      const nom = (nuevo || "").trim();
      if (!base || !nom) return;
      const copia = { ...base, nombreEvento: nom, eventoNubeId: null, preparados: {}, checkeados: {}, vueltos: {}, roturas: {}, marcasRevisar: {}, cronos: {} };
      guardarEventos({ ...eventosGuardados, [nom]: copia });
      setGuardadoEventoMsg(`✓ Duplicado como "${nom}"`);
      setTimeout(() => setGuardadoEventoMsg(""), 3000);
    },
  });
  // Fila de un evento guardado (se reutiliza en la lista de pendientes y en la de pasados)
  const filaEvento = (n) => (
    <div className="plantilla-row" key={n}>
      <button className="plantilla-nombre" onClick={() => handleCargarEvento(n)} title={`Abrir el evento "${n}"`}>
        <CalendarDays size={15} /> {n}
        {avisosRecogidas.some(a => a.evento === n) && (
          <span className="plantilla-aviso-badge" title="Tiene recogidas/devoluciones pendientes"><Clock size={12} /> {avisosRecogidas.filter(a => a.evento === n).length}</span>
        )}
      </button>
      <button className="plantilla-link" onClick={() => handleDuplicarEvento(n)} title="Duplicar evento" aria-label={`Duplicar evento ${n}`}><Copy size={15} /></button>
      <button className="plantilla-link" onClick={() => handleLinkEvento(n)} title="Copiar link para compartir" aria-label={`Copiar link del evento ${n}`}><Link2 size={15} /></button>
      <button className="plantilla-borrar" onClick={() => handleBorrarEvento(n)} aria-label={`Borrar evento guardado ${n}`} title="Borrar evento guardado"><X size={15} /></button>
    </div>
  );

  const handleBorrarPlantilla = (nombre) => setDialogo({
    tipo: "confirm",
    titulo: `¿Borrar la plantilla "${nombre}"?`,
    textoConfirmar: "Borrar",
    peligro: true,
    onConfirm: () => {
      const next = { ...plantillas };
      delete next[nombre];
      guardarPlantillas(next);
    },
  });

  // opts se reconstruía en cada render, así que el useMemo de baseChecklist nunca
  // acertaba y la checklist entera (14 categorías, ~140 items) se recalculaba con
  // CADA tecla que se pulsara en cualquier campo. Memorizado por su contenido, solo
  // se rehace cuando de verdad cambia algo que afecta a las cantidades.
  const opts = useMemo(() => ({
    dobleServicio, tamanoBarril, numBarriles, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, colorManteles, porcentajeBeige, tieneFrituras, numFrituras, llevaChillOut, numChillOut, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, soloBandeja, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos, llevaPlatosPostre, llevaCubiertos, numCamareros, numStaff,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, llevaCarpas, llevaGenerador,
    llevaMobiliarioAlquiler,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta,
    personasPorPlatoEntrante, llevaAguasPequenas, tipoAguaPequena, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, tipoPaella, numPaellas, origenSillas,
    estiloPlatoPrincipal, estiloPlatoPostre, diasProduccion,
    paxPorCamarero,
    numLogisticaEquipo: logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
  }), [
    dobleServicio, tamanoBarril, numBarriles, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, colorManteles, porcentajeBeige, tieneFrituras, numFrituras, llevaChillOut, numChillOut, tipoBandejas, tipoBBQ,
    tipoHorno, llevaEntrante, soloBandeja, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos,
    llevaPlatosPostre, llevaCubiertos, numCamareros, numStaff, llevaPalomitera, llevaJarrasCristal,
    llevaCarpas, llevaGenerador, llevaMobiliarioAlquiler,
    tipoCafetera, extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta, personasPorPlatoEntrante,
    llevaAguasPequenas, tipoAguaPequena, hayDesayuno, entranteCompartido, numEntrantesCompartir, tipoNevera,
    tipoCongelador, tipoPaella, numPaellas, origenSillas, estiloPlatoPrincipal, estiloPlatoPostre,
    diasProduccion, paxPorCamarero, logisticaEquipo,
  ]);

  // Checklist calculada (sin los items manuales) — sirve también para listar las categorías reales
  // disponibles a la hora de elegir dónde encajar un item añadido a mano.
  const baseChecklist = useMemo(() =>
    buildChecklist(evento, pax, barraCoctel ? horasCoctel : 0, barraCopas ? horasCopas : 0, ninos, opts),
    [evento, pax, barraCoctel, horasCoctel, barraCopas, horasCopas, ninos, opts]
  );
  // Cantidad automática "de verdad" de cada item calculado ahora mismo, ignorando
  // cualquier edición manual — es lo que compara "Recalcular" contra la foto guardada
  // (valoresCalculados) para detectar cambios de fórmula desde el último guardado.
  const valoresBaseActuales = useMemo(() => {
    const mapa = {};
    baseChecklist.forEach(cat => {
      const nombreCat = categoriasRenombradas[cat.nombre] ?? cat.nombre;
      cat.items.forEach(([label, qty]) => {
        if (qty === null) return; // item "opcional" no activo ahora mismo: nada que comparar
        const esObjetoConSufijo = qty && typeof qty === "object";
        mapa[`${nombreCat}::${label}`] = String(esObjetoConSufijo ? qty.u : qty);
      });
    });
    return mapa;
  }, [baseChecklist, categoriasRenombradas]);
  const categoriasDisponibles = useMemo(() => {
    const base = baseChecklist.map(c => categoriasRenombradas[c.nombre] ?? c.nombre);
    // Las categorías creadas por el usuario (vía items añadidos) también están disponibles
    const propias = [...new Set(itemsManuales.map(it => it.categoria))]
      .filter(c => c && c !== CATEGORIA_MANUAL && !base.includes(c));
    return [...base, ...propias];
  }, [baseChecklist, categoriasRenombradas, itemsManuales]);

  const checklist = useMemo(() => {
    // Las categorías renombradas por el usuario se aplican sobre el nombre base:
    // el nuevo nombre pasa a ser la identidad (las claves de ajustes se migran al renombrar)
    const cats = baseChecklist.map(c => ({ ...c, nombre: categoriasRenombradas[c.nombre] ?? c.nombre, items: [...c.items] }));
    // El 3er elemento de la tupla (índice real en itemsManuales) permite borrar el item
    // correcto luego, aunque el buscador esté filtrando la lista visible.
    // Si la categoría del item no existe se crea (así el usuario puede crear categorías nuevas).
    itemsManuales.forEach((it, idx) => {
      let destino = cats.find(c => c.nombre === it.categoria);
      if (!destino) { destino = { nombre: it.categoria || CATEGORIA_MANUAL, items: [] }; cats.push(destino); }
      destino.items.push([it.label, it.cantidad, idx]);
    });
    // Aplica los ajustes manuales (clave: categoría + etiqueta ORIGINAL del item):
    // quita los items ocultos, aplica cantidades editadas y nombres corregidos.
    // La tupla resultante es [nombreMostrado, cantidad, idxManual, labelOriginal, esAlquilerManual] —
    // el label original se conserva como identidad estable del item aunque se renombre.
    cats.forEach(cat => {
      cat.items = cat.items
        .filter(([label]) => !itemsOcultos[`${cat.nombre}::${label}`])
        // Los items "opcionales" (ver opt() en los builders) SIEMPRE ocupan su sitio en
        // el array, con cantidad null si su condición no se cumple ahora mismo — así el
        // orden nunca depende de qué esté activo. Se ocultan aquí salvo que haya una
        // edición manual fijada, en cuyo caso se mantienen EN SU MISMA POSICIÓN natural
        // en vez de "resucitar" al final de la categoría como pasaba antes.
        .filter(([label, qty]) => qty !== null || overridesManuales[`${cat.nombre}::${label}`] !== undefined)
        .map(([label, qty, extra]) => {
          // El tercer dato de la tupla significa dos cosas según de dónde venga el item:
          // el índice dentro de itemsManuales si se añadió a mano (un número), o la marca
          // de alquiler si lo genera la app (true/false). Se leía siempre como índice, así
          // que "Sillas (alquiler Dealde)" y "Armario caliente" pasaban por items manuales:
          // su ✕ no los quitaba (buscaba el índice `true` en la lista de manuales, que no
          // existe) y al renombrarlos se perdía el nombre nuevo.
          const idx = typeof extra === "number" ? extra : undefined;
          const esAlquilerFijo = extra === true;
          const key = `${cat.nombre}::${label}`;
          // qty puede venir como { u, sufijo } (conSufijo): se separa el número editable
          // del texto fijo del envase, que se conserva aparte aunque se edite el número
          const esObjetoConSufijo = qty && typeof qty === "object";
          const valorBase = esObjetoConSufijo ? qty.u : qty;
          const sufijo = esObjetoConSufijo ? qty.sufijo : undefined;
          const cantidad = overridesManuales[key] !== undefined ? overridesManuales[key] : valorBase;
          return [nombresManuales[key] ?? label, cantidad, idx, label, esAlquilerFijo || !!itemsAlquilerManual[key], sufijo];
        });
    });
    // Si se ocultan todos los items de una categoría, la categoría desaparece también
    const visibles = cats.filter(c => c.items.length > 0);
    // Orden propio: las categorías que se hayan movido a mano mandan (en su orden), y
    // detrás van las demás como las genera la app. Así se puede dejar la lista en el
    // mismo orden en que se carga la furgoneta sin tocar los generadores.
    if (!ordenCategorias.length) return visibles;
    const pos = new Map(ordenCategorias.map((n, i) => [n, i]));
    return visibles
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const pa = pos.has(a.c.nombre) ? pos.get(a.c.nombre) : Infinity;
        const pb = pos.has(b.c.nombre) ? pos.get(b.c.nombre) : Infinity;
        return pa !== pb ? pa - pb : a.i - b.i;
      })
      .map(x => x.c);
  }, [baseChecklist, itemsManuales, overridesManuales, itemsOcultos, nombresManuales, categoriasRenombradas, itemsAlquilerManual, ordenCategorias]);

  // Estimación de tiempos para sugerir la hora de fin de logística desde la de inicio.
  // Usa el nº recomendado de logística (1 cada 60 pax) para que la sugerencia sea estable.
  // Gente que va a montar: la del equipo de logística si se ha metido, y si no, la
  // recomendada (1 cada 60 pax). Antes esto usaba SIEMPRE la recomendada, así que
  // añadir gente al equipo no cambiaba el tiempo estimado ni la hora de fin sugerida.
  const logisticaParaTiempos = useMemo(() => {
    const n = logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length;
    return n > 0 ? n : Math.max(1, Math.ceil(pax / 60));
  }, [logisticaEquipo, pax]);
  // Ajuste aprendido de los eventos ya cronometrados. Se recalcula solo cuando cambia
  // el archivo de eventos, no en cada render.
  const calibracion = useMemo(() => calcularCalibracion(eventosGuardados), [eventosGuardados]);
  // Horas de la jornada más larga del equipo: la recogida lleva recargo por fatiga.
  const horasJornadaEquipo = useMemo(
    () => logisticaEquipo.reduce((mx, p) => { const h = horasLogistica(p.inicio, p.fin); return h && h > mx ? h : mx; }, 0),
    [logisticaEquipo]);
  // Mismos datos que Modo carga (pax TOTAL con niños y fatiga de jornada): antes la
  // cabecera ignoraba las dos cosas y daba un total distinto al del modal.
  const tiemposCargaForm = useMemo(() => {
    // Se cuenta exactamente lo que se carga: sin items sin cantidad y sin "Personal",
    // igual que hace Modo carga. Antes la cabecera contaba de más y daba otro total.
    const totalItemsCarga = quitarItemsSinCantidad(checklist)
      .filter(c => !/personal/i.test(c.nombre))
      .reduce((a, c) => a + c.items.length, 0);
    return estimarTiemposCarga({ totalItems: totalItemsCarga, pax: pax + ninos, numLogistica: logisticaParaTiempos, horasJornada: horasJornadaEquipo }, calibracion);
  }, [checklist, pax, ninos, logisticaParaTiempos, horasJornadaEquipo, calibracion]);

  // Foto del estado editable a mano, para poder deshacer cualquier cambio manual
  // Los manejadores de cada fila viajan por esta referencia. Su identidad NUNCA cambia,
  // así que React.memo puede saltarse las filas que no han cambiado; y su contenido se
  // refresca en cada render, así que las funciones siempre son las de ahora.
  const accionesFilaRef = React.useRef({});
  accionesFilaRef.current = {
    editarCantidad: (categoria, labelOriginal, valor) => handleEditarCantidad(categoria, labelOriginal, valor),
    ocultar: (categoria, labelOriginal) => handleOcultarItem(categoria, labelOriginal),
    quitarManual: (idx) => handleRemoveItemManual(idx),
    empezarEdicion: (keyId, label, esAlquiler) => {
      setEditandoNombre(keyId); setNombreTemporal(label); setAlquilerTemporal(esAlquiler);
    },
    confirmarEdicion: (categoria, labelOriginal, manualIdx, label, esAlquilerNuevo) =>
      handleConfirmarEdicionItem(categoria, labelOriginal, manualIdx, label, nombreTemporal, esAlquilerNuevo),
    setNombreTemporal,
    setAlquilerTemporal,
  };

  const snapshotHistorial = () => ({ overridesManuales, itemsManuales, itemsOcultos, nombresManuales, categoriasRenombradas, ordenCategorias, itemsAlquilerManual });
  const pushHistorial = () => setHistorial(prev => [...prev.slice(-19), snapshotHistorial()]);

  const handleEditarCantidad = (categoria, labelOriginal, valor) => {
    const key = `${categoria}::${labelOriginal}`;
    // Snapshot al empezar a editar este item (no por cada tecla): así "Deshacer"
    // recupera la cantidad que había antes de tocar el item, de una vez
    if (ultimaClaveEditadaRef.current !== key) {
      ultimaClaveEditadaRef.current = key;
      pushHistorial();
    }
    setOverridesManuales(prev => {
      const next = { ...prev };
      if (valor.trim() === "") delete next[key];
      else next[key] = valor;
      return next;
    });
    // Si la cantidad cambia, lo ya marcado en "Modo carga" deja de ser fiable: lo que
    // preparaste eran 20 y ahora pone 30. ANTES esto DESMARCABA el item, y eso borraba
    // trabajo hecho — alguien había ido al almacén, lo había contado y lo había
    // marcado, y con cambiar una cifra desde otro sitio se perdía. La marca se queda y
    // el item se señala para revisar: se ve de un vistazo cuál hay que volver a contar
    // sin haber perdido nada por el camino.
    // Las roturas no se tocan: son un hecho ya ocurrido, no dependen de la cantidad.
    setMarcasRevisar(prev => {
      if (!preparados[key] && !checkeados[key] && vueltos[key] === undefined) return prev;
      return { ...prev, [key]: true };
    });
  };
  // Tocar la casilla es haberlo revisado: se le quita el aviso de "la cantidad cambió"
  const revisado = (key) => setMarcasRevisar(prev => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
  const handleTogglePreparado = (key) => { revisado(key); setPreparados(prev => ({ ...prev, [key]: !prev[key] })); };
  // Si algo sale en el camión es porque estaba preparado: marcarlo en Salida lo da
  // por preparado también. Antes las dos listas podían contradecirse —"cargado" pero
  // "sin preparar"— y quien miraba la de preparación volvía a buscar por el almacén
  // algo que ya iba dentro del camión.
  // Al revés NO: desmarcar la salida (se baja algo del camión) no deshace el trabajo
  // de haberlo preparado, que sigue hecho.
  const handleToggleCheckCarga = (key) => {
    revisado(key);
    const marcando = !checkeados[key];
    if (marcando) setPreparados(prev => (prev[key] ? prev : { ...prev, [key]: true }));
    setCheckeados(prev => ({ ...prev, [key]: marcando }));
  };
  const handleToggleNotaCarga = (texto) => setNotasCheck(prev => ({ ...prev, [texto]: !prev[texto] }));
  // Cronómetro de carga/descarga: arrancar acumula desde ahora, pausar suma el tramo
  // corrido al acumulado, reiniciar lo pone a cero. Se guarda/sincroniza con el evento.
  const handleCronoStart = (fase) => setCronos(prev => {
    const c = prev[fase] || { ms: 0, running: false, since: null };
    if (c.running) return prev;
    return { ...prev, [fase]: { ms: c.ms || 0, running: true, since: Date.now() } };
  });
  const handleCronoPause = (fase) => setCronos(prev => {
    const c = prev[fase];
    if (!c || !c.running) return prev;
    const add = c.since ? Date.now() - c.since : 0;
    return { ...prev, [fase]: { ms: (c.ms || 0) + add, running: false, since: null } };
  });
  const handleCronoReset = (fase) => setCronos(prev => ({ ...prev, [fase]: { ms: 0, running: false, since: null } }));
  // A diferencia de roturas, "0" en vuelve es un dato real (confirmado: no ha vuelto
  // nada), distinto de "todavía no se ha revisado" (sin entrada) — solo se borra la
  // clave si se deja el campo vacío del todo.
  const handleVuelveCarga = (key, valor) => setVueltos(prev => {
    const next = { ...prev };
    if (valor === "") delete next[key];
    else next[key] = valor;
    return next;
  });
  const handleRoturasCarga = (key, valor) => setRoturas(prev => {
    const next = { ...prev };
    if (!valor || valor === "0") delete next[key];
    else next[key] = valor;
    return next;
  });

  // Quita de la lista un item calculado (los manuales se borran de itemsManuales)
  // Items quitados con la ✕, agrupados por categoría. Antes solo se podían recuperar con
  // "Deshacer", que vive en memoria: al recargar, ese item se había ido para siempre en
  // ese evento. Con esto cada categoría enseña cuántos tiene quitados y deja recuperarlos.
  const ocultosPorCategoria = useMemo(() => {
    const m = {};
    Object.keys(itemsOcultos).forEach(k => {
      if (!itemsOcultos[k]) return;
      const cat = k.split("::")[0];
      (m[cat] ||= []).push(k.slice(cat.length + 2));
    });
    return m;
  }, [itemsOcultos]);
  const handleRecuperarOcultos = (categoria) => {
    pushHistorial();
    setItemsOcultos(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${categoria}::`)) delete next[k]; });
      return next;
    });
  };

  const handleOcultarItem = (categoria, labelOriginal) => {
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    setItemsOcultos(prev => ({ ...prev, [`${categoria}::${labelOriginal}`]: true }));
  };

  // Corrige el nombre de un item en el sitio. En los calculados se guarda como
  // "nombre corregido" sobre el label original (que sigue siendo la identidad del
  // item, así la cantidad se sigue recalculando sola); en los manuales se edita
  // el item directamente.
  // Confirma la edición de un item: nombre (si cambió) y el tag de alquiler proveedor,
  // ambos desde el mismo modo de edición (✎) — no hay un botón aparte por fila.
  const handleConfirmarEdicionItem = (categoria, labelOriginal, manualIdx, labelMostrado, nuevo, esAlquilerNuevo) => {
    setEditandoNombre(null);
    const nuevoLabel = nuevo.trim() || labelMostrado;
    const cambiaNombre = nuevoLabel !== labelMostrado;
    const key = `${categoria}::${labelOriginal}`;
    const cambiaAlquiler = esAlquilerNuevo !== !!itemsAlquilerManual[key];
    if (!cambiaNombre && !cambiaAlquiler) return;
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    let keyFinal = key;
    if (cambiaNombre) {
      if (manualIdx !== undefined) {
        setItemsManuales(prev => prev.map((it, i) => i === manualIdx ? { ...it, label: nuevoLabel } : it));
        // La cantidad editada a mano de un item manual va ligada a su nombre: se migra la clave
        const newKey = `${categoria}::${nuevoLabel}`;
        setOverridesManuales(prev => {
          if (prev[key] === undefined) return prev;
          const next = { ...prev };
          next[newKey] = next[key];
          delete next[key];
          return next;
        });
        // Lo marcado en Modo carga va ligado al nombre igual que la cantidad, y al
        // renombrar se quedaba huérfano: el item seguía en la lista pero sin su check,
        // así que lo preparado, lo cargado, lo vuelto y las roturas desaparecían sin
        // avisar. Se migran a la clave nueva.
        const migrar = (setter) => setter(prev => {
          if (prev[key] === undefined) return prev;
          const next = { ...prev };
          next[newKey] = next[key];
          delete next[key];
          return next;
        });
        [setPreparados, setCheckeados, setVueltos, setRoturas, setMarcasRevisar].forEach(migrar);
        keyFinal = newKey;
      } else {
        setNombresManuales(prev => ({ ...prev, [key]: nuevoLabel }));
      }
    }
    if (cambiaAlquiler) {
      setItemsAlquilerManual(prev => {
        const next = { ...prev };
        if (esAlquilerNuevo) next[keyFinal] = true; else delete next[keyFinal];
        return next;
      });
    }
  };

  const handleDeshacer = () => {
    if (historial.length === 0) return;
    const ultimo = historial[historial.length - 1];
    setOverridesManuales(ultimo.overridesManuales);
    setItemsManuales(ultimo.itemsManuales);
    setItemsOcultos(ultimo.itemsOcultos);
    setNombresManuales(ultimo.nombresManuales);
    setOrdenCategorias(ultimo.ordenCategorias ?? []);
    setCategoriasRenombradas(ultimo.categoriasRenombradas);
    setItemsAlquilerManual(ultimo.itemsAlquilerManual);
    setHistorial(prev => prev.slice(0, -1));
    ultimaClaveEditadaRef.current = null;
  };

  // Renombra una categoría (botón ✎ de la cabecera). El nuevo nombre pasa a ser la
  // identidad: se migran las claves de todos los ajustes manuales de esa categoría
  // y los items añadidos a mano se mueven con ella.
  // Mueve una categoría una posición arriba o abajo. El orden se guarda con el
  // evento, así que cada tipo de evento puede tener el suyo (el de la furgoneta).
  const handleMoverCategoria = (nombre, direccion) => {
    const actual = checklist.map(c => c.nombre);
    const i = actual.indexOf(nombre);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= actual.length) return;
    pushHistorial();
    const siguiente = [...actual];
    [siguiente[i], siguiente[j]] = [siguiente[j], siguiente[i]];
    setOrdenCategorias(siguiente);
  };
  const handleRenombrarCategoria = (nombreActual) => setDialogo({
    tipo: "prompt",
    titulo: "Renombrar categoría",
    valorInicial: nombreActual,
    textoConfirmar: "Renombrar",
    onConfirm: (nuevoNombre) => aplicarRenombreCategoria(nombreActual, nuevoNombre),
  });
  const aplicarRenombreCategoria = (nombreActual, nuevoNombre) => {
    if (!nuevoNombre || nuevoNombre === nombreActual) return;
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    // Si es una categoría base (o una base ya renombrada) el renombre se guarda
    // sobre el nombre ORIGINAL del generador, para sobrevivir a los recálculos
    const original = Object.keys(categoriasRenombradas).find(k => categoriasRenombradas[k] === nombreActual)
      ?? (baseChecklist.some(c => c.nombre === nombreActual) ? nombreActual : null);
    if (original) setCategoriasRenombradas(prev => ({ ...prev, [original]: nuevoNombre }));
    setItemsManuales(prev => prev.map(it => it.categoria === nombreActual ? { ...it, categoria: nuevoNombre } : it));
    const migraClaves = (obj) => {
      const next = {};
      Object.entries(obj).forEach(([k, v]) => {
        next[k.startsWith(`${nombreActual}::`) ? `${nuevoNombre}::${k.slice(nombreActual.length + 2)}` : k] = v;
      });
      return next;
    };
    setOverridesManuales(migraClaves);
    setItemsOcultos(migraClaves);
    setNombresManuales(migraClaves);
    setItemsAlquilerManual(migraClaves);
  };

  const handleLabelItemManual = (value) => {
    setNuevoItemLabel(value);
    if (!categoriaTocada) setNuevoItemCategoria(sugerirCategoria(value, categoriasDisponibles) || CATEGORIA_MANUAL);
  };
  // Normaliza para comparar nombres ignorando mayúsculas, acentos y espacios de sobra
  const normalizarNombreItem = (s) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const insertarItemManual = () => {
    const label = nuevoItemLabel.trim();
    const categoria = nuevoItemCategoria || sugerirCategoria(label, categoriasDisponibles) || CATEGORIA_MANUAL;
    setItemsManuales(prev => [...prev, { label, cantidad: nuevoItemCantidad.trim() || "1", categoria }]);
    if (nuevoItemAlquiler) setItemsAlquilerManual(prev => ({ ...prev, [`${categoria}::${label}`]: true }));
    setNuevoItemLabel(""); setNuevoItemCantidad(""); setNuevoItemCategoria(""); setCategoriaTocada(false); setNuevoItemAlquiler(false);
  };
  const handleAddItemManual = () => {
    const label = nuevoItemLabel.trim();
    if (!label) return;
    const objetivo = normalizarNombreItem(label);
    const yaExiste = checklist.some(cat => cat.items.some(([nombre]) => normalizarNombreItem(nombre) === objetivo));
    if (yaExiste) {
      setDialogo({
        tipo: "confirm",
        titulo: "Ese item ya existe",
        mensaje: `Ya hay un item llamado "${label}" en la checklist. ¿Quieres añadirlo igualmente como uno nuevo (quedará duplicado)?`,
        textoConfirmar: "Añadir igualmente",
        onConfirm: insertarItemManual,
      });
      return;
    }
    insertarItemManual();
  };
  const handleRemoveItemManual = (idx) => {
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    setItemsManuales(prev => prev.filter((_, i) => i !== idx));
  };

  // El campo de búsqueda responde al instante, pero recorrer y volver a pintar las
  // ~140 filas se hace con prioridad baja: así escribir no se atasca en el móvil.
  const filtroDiferido = useDeferredValue(filtro);
  const filtered = useMemo(() => {
    if (!filtroDiferido.trim()) return checklist;
    const q = filtroDiferido.toLowerCase();
    return checklist.map(c => ({ ...c, items: c.items.filter(i => i[0].toLowerCase().includes(q)) })).filter(c => c.items.length > 0);
  }, [checklist, filtroDiferido]);

  const totalConceptos = checklist.reduce((acc, c) => acc + c.items.length, 0);
  // Datos del resumen de cabecera: lo cargado hasta ahora y lo que queda por recoger
  // o comprar en ESTE evento (los avisos globales incluyen los de otros eventos).
  const itemsCargados = useMemo(() => Object.values(checkeados).filter(Boolean).length, [checkeados]);
  const itemsPreparados = useMemo(() => Object.values(preparados).filter(Boolean).length, [preparados]);
  const pendientesEvento = useMemo(() =>
    (recogidas || []).filter(r => r.concepto && (!r.recogido || (r.fechaDevolucion && !r.devuelto))).length
    + (compras || []).filter(c => c.concepto && !c.comprado).length,
  [recogidas, compras]);
  const fmtMinutos = (m) => {
    if (!m || m <= 0) return "—";
    const h = Math.floor(m / 60), min = Math.round(m % 60);
    return h > 0 ? (min > 0 ? `${h} h ${min} min` : `${h} h`) : `${min} min`;
  };
  const toggleCategory = (catName) => setOpenCategories(prev => ({ ...prev, [catName]: prev[catName] !== false ? false : true }));

  // Añade en bloque los items confirmados en ModalAgregarItems (ya filtrados de duplicados)
  const handleAgregarItems = (nuevos) => {
    if (nuevos.length === 0) return;
    setItemsManuales(prev => [...prev, ...nuevos.map(n => ({ label: n.label, cantidad: n.qty, categoria: n.categoria }))]);
    setAgregadosTag(`✓ ${nuevos.length} item${nuevos.length === 1 ? "" : "s"} añadido${nuevos.length === 1 ? "" : "s"}`);
    setTimeout(() => setAgregadosTag(""), 3000);
  };

  // ─── COPIA DE SEGURIDAD DEL ARCHIVO COMPLETO ────────────────────────────────
  // Un fichero con TODOS los eventos guardados, que no depende de la nube ni de nada.
  // Si algún día falla la sincronización o se pierde el acceso, con esto se recupera
  // todo. Se puede volver a cargar en cualquier dispositivo desde el mismo sitio.
  const handleExportarCopia = () => {
    const copia = {
      formato: "gula-checklist-copia",
      version: 1,
      exportado: new Date().toISOString(),
      eventos: eventosGuardados,
      plantillas,
      precios: leerPrecios(),
    };
    const blob = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Gula_copia_${new Date().toISOString().slice(0, 10)}_${Object.keys(eventosGuardados).length}eventos.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setGuardadoEventoMsg(`✓ Copia descargada con ${Object.keys(eventosGuardados).length} eventos`);
    setTimeout(() => setGuardadoEventoMsg(""), 4000);
  };
  // Al restaurar NO se borra nada: se suman los que falten y se preguntan los que ya
  // existen, para que cargar una copia vieja no pise trabajo más nuevo.
  const handleImportarCopia = (fichero) => {
    if (!fichero) return;
    const lector = new FileReader();
    lector.onload = () => {
      let datos;
      try { datos = JSON.parse(String(lector.result)); }
      catch (e) { setGuardadoEventoMsg("✕ Ese fichero no es una copia válida"); setTimeout(() => setGuardadoEventoMsg(""), 4000); return; }
      if (!datos || datos.formato !== "gula-checklist-copia" || !datos.eventos) {
        setGuardadoEventoMsg("✕ Ese fichero no es una copia de Gula");
        setTimeout(() => setGuardadoEventoMsg(""), 4000);
        return;
      }
      const nuevos = Object.keys(datos.eventos).filter(n => eventosGuardados[n] === undefined);
      const repetidos = Object.keys(datos.eventos).filter(n => eventosGuardados[n] !== undefined);
      setDialogo({
        tipo: "confirm",
        titulo: "Restaurar copia de seguridad",
        mensaje: `La copia tiene ${Object.keys(datos.eventos).length} eventos: ${nuevos.length} que no están aquí y ${repetidos.length} que ya existen. Se añaden los que faltan y NO se toca ninguno de los que ya tienes.`,
        textoConfirmar: `Añadir ${nuevos.length} eventos`,
        onConfirm: () => {
          const combinado = { ...eventosGuardados };
          nuevos.forEach(n => { combinado[n] = datos.eventos[n]; });
          guardarEventos(combinado);
          if (datos.plantillas) guardarPlantillas({ ...datos.plantillas, ...plantillas });
          setGuardadoEventoMsg(`✓ Restaurados ${nuevos.length} eventos de la copia`);
          setTimeout(() => setGuardadoEventoMsg(""), 5000);
        },
      });
    };
    lector.readAsText(fichero);
  };

  const handleDescargar = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas });
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Checklist_${EVENTOS[evento]?.label?.replace(/ /g, "_")}_${pax}pax.doc`;
    a.click();
  };

  const getTextoChecklist = () => {
    const texto = checklist.map(cat => `\n▶ ${cat.nombre.toUpperCase()}\n` + cat.items.map(([l, q, , , , sufijo]) => `  • ${l}: ${fmtCantidadCompleta(l, q.u ? q.u : q, sufijo)}`).join("\n")).join("\n");
    const cabecera = [
      nombreEvento ? nombreEvento.toUpperCase() : `CHECKLIST ${EVENTOS[evento]?.label?.toUpperCase()}`,
      `${pax} pax`,
      fechaEvento ? new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
      horaInicio ? `${horaInicio}h` : null,
      ubicacion || null,
      fmtLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)
        ? `Logística: ${fmtLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)}${totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 ? ` — Total ${String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€` : ""}`
        : null,
      fmtRecogidas(recogidas) ? `Recogidas: ${fmtRecogidas(recogidas)}` : null,
      fmtCompras(compras) ? `Compras: ${fmtCompras(compras)}` : null,
    ].filter(Boolean).join(" · ");
    const notas = notasEvento ? `\n\n📝 NOTAS: ${notasEvento}` : "";
    // El enlace del sitio va al final y en su línea: quien recibe esto por WhatsApp lo
    // que quiere el día del montaje es tocar y que se abra el mapa, no copiar el nombre
    // de la finca y buscarlo a mano.
    const mapa = ubicacion.trim() ? `\n\n📍 Cómo llegar: ${enlaceMapa(ubicacion)}` : "";
    return `${cabecera}\n${texto}${notas}${mapa}`;
  };

  const handleCompartirWord = () => {
    handleDescargar();
    setMenuCompartir(false);
  };

  const handleCompartirPDF = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas });
    const ventana = window.open("", "_blank");
    if (!ventana) {
      window.alert("El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para esta página y vuelve a intentarlo.");
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    ventana.onload = () => ventana.print();
    setMenuCompartir(false);
  };

  const handleCompartirWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(getTextoChecklist())}`;
    window.open(url, "_blank");
    setMenuCompartir(false);
  };

  const handleCompartirTexto = () => {
    navigator.clipboard.writeText(getTextoChecklist()).then(() => {
      setCompartirMsg("¡Copiado! ✓");
      setTimeout(() => setCompartirMsg(""), 2500);
    }).catch(() => {
      setCompartirMsg("No se pudo copiar ✗");
      setTimeout(() => setCompartirMsg(""), 2500);
    });
    setMenuCompartir(false);
  };

  const metaHoja = { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas };

  // Con el link de solo ver, la hoja NO es una ventana encima de la checklist: es todo
  // lo que hay. Detrás no queda nada que mirar ni que tocar, así que tampoco lleva ✕ —
  // cerrarla solo dejaría al metre delante de una lista que no es la que necesita.
  if (soloVista) {
    return (
      <ModalVistaPrevia
        checklist={checklist} evtKey={evento} pax={pax} ninos={ninos}
        meta={metaHoja} sinCerrar
      />
    );
  }

  return (
    <>
      {modalPrevia  && <ModalVistaPrevia checklist={checklist} evtKey={evento} pax={pax} ninos={ninos} meta={metaHoja} onClose={() => setModalPrevia(false)} />}
      {modoCarga && (
        <ModalModoCarga
          checklist={checklist}
          preparados={preparados}
          marcasRevisar={marcasRevisar}
          checkeados={checkeados}
          vueltos={vueltos}
          roturas={roturas}
          onTogglePreparado={handleTogglePreparado}
          onToggleSale={handleToggleCheckCarga}
          onVuelve={handleVuelveCarga}
          onRoturas={handleRoturasCarga}
          notasCheck={notasCheck}
          onToggleNota={handleToggleNotaCarga}
          cronos={cronos}
          onCronoStart={handleCronoStart}
          onCronoPause={handleCronoPause}
          onCronoReset={handleCronoReset}
          meta={{
            nombreEvento,
            totalPax: pax + ninos,
            notasEvento,
            numLogistica: logisticaParaTiempos,
            calibracion,
            logisticaReal: logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
            horasJornada: horasJornadaEquipo,
          }}
          onClose={() => setModoCarga(false)}
          // Con el link de logística, Modo carga es la app entera: no hay ✕ ni fondo
          // que tocar para salir. Cerrarlo dejaría a quien está cargando el camión
          // delante de una checklist que no puede tocar y sin forma clara de volver.
          sinCerrar={soloCarga}
        />
      )}
      {modalFormulario && (
        <ModalFormularioOficina
          codigo={codigoFormulario}
          enlace={enlaceFormulario}
          envios={envios}
          cargando={cargandoEnvios}
          copiado={enlaceCopiado}
          onCrear={handleCrearCodigoFormulario}
          onCambiar={handleCambiarCodigoFormulario}
          onCopiar={handleCopiarEnlaceFormulario}
          onCompartir={handleCompartirEnlaceFormulario}
          avisos={avisosWhatsapp}
          onCambiarAvisos={handleGuardarAvisos}
          onAplicar={handleAplicarEnvio}
          onDescartar={handleDescartarEnvio}
          onBorrar={handleBorrarEnvio}
          onClose={() => setModalFormulario(false)}
        />
      )}
      {modalAgregar && <ModalAgregarItems checklist={checklist} categoriasDisponibles={categoriasDisponibles} onClose={() => setModalAgregar(false)} onConfirm={handleAgregarItems} />}
      {dialogo && <Dialogo config={dialogo} onCerrar={() => setDialogo(null)} />}
      {modalRecalcular && <ModalRecalcular cambios={modalRecalcular} onClose={() => setModalRecalcular(null)} onAplicar={handleAplicarRecalculo} />}

      <div className="app-wrapper">
        <div className={`guardado-indicador ${guardadoFlash ? "is-visible" : ""}`} aria-live="polite"><Check size={14} /> Guardado</div>
        {errorNube && (
          <div className="error-nube" role="alert">
            <AlertTriangle size={15} />
            <span>{errorNube}</span>
            <button onClick={() => setErrorNube(null)} aria-label="Ocultar aviso" title="Ocultar"><X size={14} /></button>
          </div>
        )}
        {/* BARRA FINA (solo móvil, al bajar de la cabecera) */}
        <div className={`barra-fija ${barraFija ? "is-visible" : ""}`}>
          <span className="barra-fija-nombre" title={nombreEvento || EVENTOS[evento]?.label}>
            {nombreEvento || EVENTOS[evento]?.label}
          </span>
          <input
            type="text"
            className="barra-fija-buscar"
            placeholder="Buscar..."
            aria-label="Buscar un material"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          {/* Con el link de solo ver no hay entrada a Modo carga: marcar es de logística */}
          {!soloVista && (
            <button className="barra-fija-carga" onClick={() => setModoCarga(true)} title="Modo carga">
              <Package size={15} /><span className="barra-fija-carga-texto">Carga</span>
            </button>
          )}
        </div>

        {/* HEADER */}
        <header className="app-header animate-entrance">
          <div className="header-title-group">
            <div className="header-icon">{React.createElement(EVENTO_ICON[evento] || Heart, { size: 24, strokeWidth: 2.2 })}</div>
            <div className="header-info">
              <h1>{nombreEvento || EVENTOS[evento]?.label || "Generador Checklist"}</h1>
              {/* El subtítulo va en trozos con clase propia porque en móvil se limita a
                  dos líneas: lo que sobraba se perdía por el final, y lo que se perdía
                  era justo el día, la hora y el sitio. El cóctel y el nº de conceptos se
                  esconden ahí (el recuento está abajo en su contador y el cóctel en la
                  configuración) para que quepa lo que hace falta saber de un vistazo. */}
              <p>
                <span className="hdr-quien">
                  {nombreEvento ? `${EVENTOS[evento]?.label} · ` : ""}{diasPaxValidos.length > 0 ? `${diasPaxValidos.join("+")} pax · ${diasPaxValidos.length} días` : `${pax} pax`}
                </span>
                <span className="hdr-detalle">
                  {evento !== "produccion" ? ` · cóctel ${barraCoctel ? horasCoctel : 0}h` : ""} · {totalConceptos} conceptos
                </span>
                <span className="hdr-cuando">
                  {fechaEvento ? ` · ${new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                  {horaInicio ? ` · ${horaInicio}h` : ""}
                  {ubicacion ? ` · ${ubicacion}` : ""}
                </span>
              </p>
            </div>
            {/* El logo de Gula. Va aquí, al final del grupo del título y pegado al
                interruptor de tema, porque es el único sitio de la cabecera que no le
                quita espacio a nada: el nombre del evento y su subtítulo se quedan
                donde estaban y los botones de acción no se mueven. Es el dibujo del
                logo haciendo de máscara sobre un degradado, igual que en el formulario:
                el archivo es negro sobre transparente y en tema oscuro no se vería.
                En móvil se esconde — ahí la cabecera va justa y el subtítulo ya se
                recorta a dos líneas, así que sería quitarle sitio a lo que importa. */}
            <span
              className="app-logo"
              role="img"
              aria-label="Gula"
              style={{ WebkitMaskImage: `url(${logoGula})`, maskImage: `url(${logoGula})` }}
            />
            {/* El interruptor de tema va con el título, no en la rejilla de acciones:
                siendo un icono suelto dejaba una celda huérfana y descuadraba la fila
                de botones en el móvil. Lleva texto para que se encuentre. */}
            {(() => {
              const siguiente = { auto: "claro", claro: "oscuro", oscuro: "auto" }[preferenciaTema];
              const etiqueta = {
                auto: `Automático (ahora ${tema})`,
                claro: "Siempre claro",
                oscuro: "Siempre oscuro",
              }[preferenciaTema];
              const rotulo = { auto: "Auto", claro: "Claro", oscuro: "Oscuro" }[preferenciaTema];
              const Icono = preferenciaTema === "auto" ? Clock : (preferenciaTema === "oscuro" ? Moon : Sun);
              return (
                <button
                  className={`btn btn-tema ${preferenciaTema === "auto" ? "es-auto" : ""}`}
                  onClick={() => setPreferenciaTema(siguiente)}
                  title={`${etiqueta} · el automático pone oscuro de ${HORA_OSCURO}:00 a ${HORA_CLARO}:00. Pulsa para pasar a "${{ auto: "automático", claro: "siempre claro", oscuro: "siempre oscuro" }[siguiente]}"`}
                  aria-label={etiqueta}
                ><Icono size={15} /> {rotulo}</button>
              );
            })()}
          </div>
          <div className="header-actions">
            {!soloMarcar && (
              <button className="btn btn-ghost" onClick={handleNuevoEvento} title="Borra la configuración guardada y empieza de cero">Nuevo evento</button>
            )}
            {onCerrarSesion && (
              <button className="btn btn-ghost" onClick={onCerrarSesion} title="Cerrar la sesión del equipo">Cerrar sesión</button>
            )}
            {/* "Vista previa" ya no vive aquí: es la hoja tal como sale en el Word y en
                el PDF, así que su sitio es dentro de Compartir, un segundo antes de
                exportar. Además libera un botón de una cabecera que ocupaba casi un
                tercio de la pantalla del móvil. */}
            {!soloVista && (
              <button className="btn btn-outline" onClick={() => setModoCarga(true)}><Package size={15} /> Modo carga</button>
            )}
            <div className="compartir-menu-wrap">
              <button className="btn btn-green" onClick={() => setMenuCompartir(v => !v)}>{compartirMsg || "Compartir"}</button>
              {menuCompartir && (
                <>
                  <div className="compartir-menu-backdrop" onClick={() => setMenuCompartir(false)} />
                  <div className="compartir-menu">
                    <button onClick={() => { setMenuCompartir(false); setModalPrevia(true); }}><Eye size={15} /> Ver la hoja</button>
                    <div className="compartir-menu-sep" />
                    {/* El de logística: entra directo a marcar lo que sube al camión */}
                    <button onClick={() => handleGenerarLink("carga")} title="Abre directo en Modo carga (Salida): para quien carga el camión"><Package size={15} /> Link de Modo carga</button>
                    {/* El del metre: mira la lista y ya. Las marcas de carga son de
                        logística, y una casilla tocada por error deja a alguien
                        creyendo que algo va en el camión cuando no va. */}
                    <button onClick={() => handleGenerarLink("vista")} title="Solo para consultar la checklist: no deja marcar nada"><Eye size={15} /> Link de solo ver</button>
                    <button onClick={() => handleGenerarLink("edicion")} title="Quien lo abra puede cambiarlo todo"><Link2 size={15} /> Link con edición</button>
                    <button onClick={handleCompartirWord}><FileText size={15} /> Word</button>
                    <button onClick={handleCompartirPDF}><Printer size={15} /> PDF</button>
                    <button onClick={handleCompartirWhatsapp}><MessageCircle size={15} /> WhatsApp (texto)</button>
                    <button onClick={handleCompartirTexto}><ClipboardCopy size={15} /> Copiar texto</button>
                    {/* El canal con la oficina: el enlace que se les pasa y lo que
                        mandan por él. Vive aquí y no en la cabecera, que en el móvil
                        ya iba justa de sitio. */}
                    {nubeActiva() && (
                      <>
                        <div className="compartir-menu-sep" />
                        <button onClick={() => { setMenuCompartir(false); setModalFormulario(true); refrescarEnvios(); }}>
                          <ClipboardCheck size={15} /> Formulario del evento
                          {enviosPendientes.length > 0 && <span className="menu-badge">{enviosPendientes.length}</span>}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {/* RESUMEN DEL EVENTO: los datos que antes había que buscar en Vista previa
            o abriendo Modo carga. Se reparte en fichas que envuelven solas, así que
            en móvil caen en dos columnas y en escritorio van en una fila. */}
        <div className="resumen-evento animate-entrance" style={{ animationDelay: "0.04s" }}>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Users size={13} /> Pax total</span>
            <span className="resumen-ficha-valor">{pax + ninos}{ninos > 0 ? <em> · {pax} + {ninos} niños</em> : null}</span>
          </div>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Boxes size={13} /> Conceptos</span>
            {/* Mientras no haya nada en el camión, lo que interesa ver es cómo va la
                preparación; en cuanto se empieza a cargar, manda lo cargado. Nunca se
                enseñan las dos: en el móvil la fila no da para tres cifras. */}
            <span className="resumen-ficha-valor">{totalConceptos}{itemsCargados > 0
              ? <em> · {itemsCargados} cargados</em>
              : itemsPreparados > 0 ? <em> · {itemsPreparados} preparados</em> : null}</span>
          </div>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Clock size={13} /> Tiempo estimado</span>
            <span className="resumen-ficha-valor">{fmtMinutos(tiemposCargaForm.totalMin)}<em> · {logisticaParaTiempos} logística</em></span>
          </div>
          {totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 && (
            <div className="resumen-ficha">
              <span className="resumen-ficha-label"><Truck size={13} /> Coste logística</span>
              <span className="resumen-ficha-valor">{String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€</span>
            </div>
          )}
          {pendientesEvento > 0 && (
            <div className="resumen-ficha is-aviso">
              <span className="resumen-ficha-label"><Bell size={13} /> Pendientes</span>
              <span className="resumen-ficha-valor">{pendientesEvento}<em> · recogidas y compras</em></span>
            </div>
          )}
        </div>

        {linkAbierto && fechaEvento && fechaEvento < new Date().toISOString().slice(0, 10) && (
          <div className="archivado-banner">📦 Este evento ya pasó — checklist archivada, solo para consulta.</div>
        )}

        {versionNueva && (
          <div className="version-nueva-banner">
            <div className="cambios-remotos-detalle">
              <strong>⬆️ Hay una versión nueva de la app</strong>
              <span>Tus datos no se tocan: se recarga la página y ya está.</span>
            </div>
            <button className="btn btn-green version-nueva-btn" onClick={() => window.location.reload()}>Actualizar</button>
          </div>
        )}

        {hayCambiosRemotos && (
          <div className="cambios-remotos-banner">
            <div className="cambios-remotos-detalle">
              <strong>🔄 Actualizado desde otro dispositivo:</strong>
              <span>
                {hayCambiosRemotos.slice(0, 4).join(" · ")}
                {hayCambiosRemotos.length > 4 ? ` · y ${hayCambiosRemotos.length - 4} cambios más` : ""}
              </span>
            </div>
            <button className="cambios-remotos-cerrar" onClick={() => setHayCambiosRemotos(null)} aria-label="Cerrar aviso"><X size={14} /></button>
          </div>
        )}

        {/* Con la app abierta, lo que llega del formulario se dice al momento. Un
            cambio no sube el contador de pendientes, así que sin esto pasaría
            desapercibido justo cuando más importa (han cambiado los pax de mañana). */}
        {avisoEnvios && (
          <div className="cambios-remotos-banner">
            <div className="cambios-remotos-detalle">
              <strong>📋 Del formulario:</strong>
              <span>
                {avisoEnvios.frases.slice(0, 3).join(" · ")}
                {avisoEnvios.frases.length > 3 ? ` · y ${avisoEnvios.frases.length - 3} más` : ""}
              </span>
            </div>
            {/* Avisar aquí mismo, en cuanto llega: si hay que abrir la bandeja para
                hacerlo, se hace más tarde o no se hace. Manda el último que ha
                entrado, que es de lo que habla el aviso. */}
            {limpiarAvisos(avisosWhatsapp).map((a, i) => (
              <a
                className="btn btn-outline"
                key={i}
                href={`https://wa.me/${a.tel}?text=${encodeURIComponent(textoAvisoEnvio(avisoEnvios.envios[avisoEnvios.envios.length - 1]))}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={14} /> Avisar{a.nombre ? ` a ${a.nombre.split(/[ ·]/)[0]}` : ""}
              </a>
            ))}
            {/* Aceptar sin pasar por la bandeja: cuando llega uno solo, que es lo
                normal, se acepta aquí y el evento se abre ya configurado. Sigue
                preguntando antes, que aplicar toca un evento de verdad. */}
            {avisoEnvios.envios.length === 1 && (
              <button className="btn btn-green" onClick={() => {
                const envio = avisoEnvios.envios[0];
                setAvisoEnvios(null);
                handleAplicarEnvio(envio);
              }}>Aceptar y abrir</button>
            )}
            <button className="btn btn-outline" onClick={() => { setAvisoEnvios(null); setModalFormulario(true); }}>Verlo</button>
            <button className="cambios-remotos-cerrar" onClick={() => setAvisoEnvios(null)} aria-label="Cerrar aviso"><X size={14} /></button>
          </div>
        )}

        {/* Si la oficina ha mandado algo, se dice aquí: en el menú de Compartir hay un
            contador, pero eso hay que abrirlo para verlo y estos datos caducan. */}
        {enviosPendientes.length > 0 && !modalFormulario && (
          <div className="envios-aviso" role="status">
            <ClipboardCheck size={16} />
            <span>
              <strong>{enviosPendientes.length === 1 ? "1 envío" : `${enviosPendientes.length} envíos`} del formulario</strong>
              {" "}sin revisar
            </span>
            <button className="btn btn-green" onClick={() => { setModalFormulario(true); refrescarEnvios(); }}>Ver</button>
          </div>
        )}

        {avisosRecogidas.length > 0 && !avisosOcultos && (() => {
          // Cada aviso vive en SU evento: el detalle completo (con botón ✓ Hecho) solo
          // se enseña para el evento que está abierto ahora mismo; del resto de eventos
          // solo una línea compacta por evento para abrirlo — así no se mezclan
          const esAbierto = (evt) => evt === nombreEvento
            || (!!eventoNubeId && eventosGuardados[evt]?.eventoNubeId === eventoNubeId);
          const delAbierto = avisosRecogidas.filter(a => esAbierto(a.evento));
          const otrosEventos = [...new Set(avisosRecogidas.filter(a => !esAbierto(a.evento)).map(a => a.evento))];
          const textoDias = (d) => d < 0 ? "atrasado" : d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;
          return (
            <div className="avisos-recogidas-banner">
              <div className="cambios-remotos-detalle avisos-recogidas-detalle">
                {delAbierto.length > 0 && (
                  <div className="aviso-evento-grupo">
                    <strong>⏰ Pendiente en este evento ({delAbierto[0].evento}):</strong>
                    <span className="avisos-recogidas-lista">
                      {delAbierto.map(a => (
                        <span className={`aviso-recogida-chip ${a.dias < 0 ? "is-atrasado" : a.dias === 0 ? "is-hoy" : ""}`} key={`${a.lista}::${a.idx}::${a.tipo}`}>
                          {/* Todo el texto en UN solo elemento: siendo trozos sueltos,
                              el flex los trataba como piezas independientes y los
                              separaba a lo ancho al partirse en dos líneas. */}
                          <span className="aviso-recogida-texto">
                            {a.tipo}: "{a.concepto}"
                            {a.fecha ? ` (${new Date(a.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : ""}
                            {a.fecha ? <span className="aviso-recogida-dias"> · {textoDias(a.dias)})</span> : ""}
                          </span>
                          <button
                            className="aviso-recogida-hecho"
                            onClick={() => marcarAvisoHecho(a)}
                            title={`Marcar ${a.tipo.toLowerCase()} como hecha`}
                            aria-label={`Marcar ${a.tipo} de ${a.concepto} como hecha`}
                          >✓ Hecho</button>
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                {otrosEventos.length > 0 && (
                  <div className="aviso-evento-grupo">
                    <strong>⏰ Pendientes en otros eventos:</strong>
                    <span className="avisos-recogidas-lista">
                      {otrosEventos.map(evt => (
                        <button
                          className="aviso-otro-evento-btn"
                          key={evt}
                          onClick={() => handleCargarEvento(evt)}
                          title={avisosRecogidas.filter(a => a.evento === evt).map(a => `${a.tipo}: ${a.concepto}`).join(" · ")}
                        >📋 {evt} ({avisosRecogidas.filter(a => a.evento === evt).length}) →</button>
                      ))}
                    </span>
                  </div>
                )}
              </div>
              <button className="cambios-remotos-cerrar" onClick={() => setAvisosOcultos(true)} aria-label="Cerrar aviso"><X size={14} /></button>
            </div>
          );
        })()}

        <div className="main-layout">
        <div className="config-sidebar">

        {/* AÑADIR VARIOS ITEMS (pegando texto) */}
        {/* El estado "ya hay items pegados" se marca con una clase, no con colores en
            línea: un estilo en línea gana a las variables del tema y dejaba el botón
            blanco en modo oscuro. */}
        {!soloMarcar && (
        <button
          className={`add-material-btn animate-entrance ${agregadosTag ? "is-hecho" : ""}`}
          style={{ animationDelay: "0.05s" }}
          onClick={() => setModalAgregar(true)}
        >
          <span><ListPlus size={16} /> {agregadosTag || "Añadir varios items pegando texto"}</span>
          <ArrowRight size={16} />
        </button>
        )}

        {/* PLANTILLAS GUARDADAS */}
        {!soloMarcar && (
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.08s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Plantillas</span>
            <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarPlantilla} title="Guarda solo la configuración (pax, extras, equipamiento...) como plantilla reutilizable, SIN nombre/fecha/ubicación"><Save size={14} /> Guardar actual</button>
          </div>
          {guardadoPlantillaMsg && <p className="guardado-confirm">{guardadoPlantillaMsg}</p>}
          {Object.keys(plantillas).length === 0 ? (
            <p className="plantillas-vacio">Guarda configuraciones que repites (ej: "Boda estándar 100 pax") y cárgalas con un click en el próximo evento.</p>
          ) : (
            <ListaColapsable nombres={[...Object.keys(plantillas)].reverse()}>
              {n => (
                <div className="plantilla-row" key={n}>
                  <button className="plantilla-nombre" onClick={() => handleAplicarPlantilla(n)} title={`Cargar la plantilla "${n}"`}><FolderOpen size={15} /> {n}</button>
                  <button className="plantilla-borrar" onClick={() => handleBorrarPlantilla(n)} aria-label={`Borrar plantilla ${n}`} title="Borrar plantilla"><X size={15} /></button>
                </div>
              )}
            </ListaColapsable>
          )}
        </div>
        )}

        {/* EVENTOS GUARDADOS */}
        {!soloMarcar && (
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.09s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Eventos guardados</span>
            {/* Arriba, con el título, solo la acción de cada día — igual que "Guardar
                actual" en Plantillas. Lo demás baja según se use menos. */}
            <div className="plantillas-header-acciones">
              <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarEvento} title="Guarda esta checklist COMPLETA (nombre, fecha, ubicación, logística...) para reabrirla o compartir su link"><Save size={14} /> Guardar evento</button>
            </div>
          </div>
          <button className="btn btn-outline btn-secundario-ancho" onClick={handleRecalcular} title="Comprueba si alguna cantidad automática ha cambiado desde el último guardado (por un ajuste de fórmula) y deja elegir cuál usar"><RefreshCw size={14} /> Recalcular cantidades</button>
          {recalcularMsg && <p className="guardado-confirm">{recalcularMsg}</p>}
          {guardadoEventoMsg && <p className="guardado-confirm">{guardadoEventoMsg}</p>}
          {Object.keys(eventosGuardados).length === 0 ? (
            <p className="plantillas-vacio">Guarda la checklist de cada evento y comparte su link: quien lo abra la verá en la web, lista para hacer check desde el móvil.</p>
          ) : (
            <>
              {Object.keys(eventosGuardados).length > 4 && (
                <div className="buscador-eventos">
                  <Search size={15} className="buscador-eventos-icono" />
                  <input
                    type="text"
                    className="buscador-eventos-input"
                    placeholder="Buscar evento por nombre…"
                    value={filtroEventos}
                    onChange={(e) => setFiltroEventos(e.target.value)}
                    aria-label="Buscar evento por nombre"
                  />
                  {filtroEventos && (
                    <button className="buscador-eventos-limpiar" onClick={() => setFiltroEventos("")} title="Limpiar búsqueda" aria-label="Limpiar búsqueda"><X size={14} /></button>
                  )}
                </div>
              )}
              {eventosPendientes.length > 0 ? (
                <ListaColapsable nombres={eventosPendientes}>{filaEvento}</ListaColapsable>
              ) : (
                <p className="plantillas-vacio">{filtroEventos ? "Ningún evento próximo coincide con la búsqueda." : "No hay eventos próximos."}</p>
              )}
              {eventosPasados.length > 0 && (
                <>
                  <button className="ver-todos-btn" onClick={() => setVerPasados(v => !v)}>
                    {verPasados ? <><ChevronUp size={14} /> Ocultar pasados</> : <><CalendarClock size={14} /> Ver eventos pasados ({eventosPasados.length})</>}
                  </button>
                  {verPasados && <ListaColapsable nombres={eventosPasados}>{filaEvento}</ListaColapsable>}
                </>
              )}
            </>
          )}
          {/* Copia y restauración: mantenimiento, se usa una vez de Pascuas a Ramos.
              Va al pie y en discreto para no competir con lo de cada día. */}
          <div className="mantenimiento-fila">
            <button className="btn-mantenimiento" onClick={handleExportarCopia} title="Descarga un fichero con TODOS tus eventos guardados. Es tu copia de seguridad: no depende de la nube ni de la conexión">
              <Download size={13} /> Descargar copia de seguridad
            </button>
            <label className="btn-mantenimiento" title="Carga una copia de seguridad. Solo AÑADE los eventos que no tengas: nunca pisa los que ya están">
              <Upload size={13} /> Restaurar
              <input type="file" accept="application/json,.json" style={{ display: "none" }}
                onChange={e => { handleImportarCopia(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        )}

        {/* CONFIG */}
        {!soloMarcar && (
        <div className="config-card animate-entrance" style={{ animationDelay: "0.1s" }}>
          <div className="section-title">Evento</div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">TIPO DE EVENTO</span>
              <select className="form-select" value={evento} onChange={e => handleCambiarTipoEvento(e.target.value)}>
                {Object.entries(EVENTOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {diasPaxValidos.length === 0 && (<>
            <div className="form-group">
              <span className="form-label">PAX ADULTOS</span>
              <input type="number" className="form-input" value={pax} onChange={e => setPax(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">NIÑOS</span>
              <input type="number" className="form-input" value={ninos} onChange={e => setNinos(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            </>)}
            <div className="form-group">
              <span className="form-label">Nº CAMAREROS</span>
              <input type="number" className="form-input" placeholder="Auto" value={numCamareros || ""} onChange={e => setNumCamareros(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label" title="Si dejas Nº camareros en Auto, se calcula 1 camarero por cada tantos pax. Vacío = valor recomendado por tipo de evento.">1 CAMARERO CADA · PAX</span>
              <input
                type="number"
                className="form-input"
                placeholder={evento === "corporativo" ? "18 (recom.)" : (evento === "cumpleanos" || evento === "produccion") ? "20 (recom.)" : "12 (recom.)"}
                value={paxPorCamarero || ""}
                onChange={e => setPaxPorCamarero(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
              />
            </div>
            <div className="form-group">
              <span className="form-label">Nº STAFF (cocina, otros)</span>
              <input type="number" className="form-input" placeholder="0" value={numStaff || ""} onChange={e => setNumStaff(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
          </div>
          {evento === "produccion" && (
            <div className="logistica-block">
              <div className="dia-produccion-row dia-produccion-numdias">
                <span className="form-label">DÍAS DE PRODUCCIÓN</span>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-input"
                  placeholder="1"
                  value={diasProduccion.length || ""}
                  onChange={e => {
                    // Máximo una semana (más días seguidos no tiene sentido). Al cambiar
                    // el número se conservan los pax ya escritos de los primeros días y
                    // solo se añaden/quitan huecos por el final.
                    const n = Math.min(7, Math.max(0, parseInt(e.target.value, 10) || 0));
                    setDiasProduccion(prev => n <= prev.length ? prev.slice(0, n) : [...prev, ...Array(n - prev.length).fill("")]);
                  }}
                />
                <span className="dia-produccion-hint">máx. 7</span>
              </div>
              {diasProduccion.map((d, i) => (
                <div className="dia-produccion-row" key={i}>
                  <span className="dia-produccion-label">Día {i + 1}</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="pax"
                    value={d}
                    onChange={e => setDiasProduccion(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                  />
                </div>
              ))}
              {diasPaxValidos.length > 0 ? (
                <p className="dias-produccion-resumen">
                  {diasPaxValidos.join(" + ")} pax en {diasPaxValidos.length} días → equipo para el día de {Math.max(...diasPaxValidos)} pax, consumibles para {diasPaxValidos.reduce((a, b) => a + b, 0)} raciones
                </p>
              ) : (
                <p className="dias-produccion-resumen">Pon cuántos días es la producción (máx. 7) y el pax de cada día. Sin días se calcula un solo día con los PAX de arriba.</p>
              )}
            </div>
          )}
          <div className="form-row">
            {/* El nombre y la ubicación son los dos campos de texto libre más largos:
                ocupan la fila entera en vez de media, que dejaba 145px y no se veía
                lo que habías escrito. La fecha y la hora sí caben a media fila. */}
            <div className="form-group form-group-ancho">
              <span className="form-label">NOMBRE DEL EVENTO</span>
              <input type="text" className="form-input" title={nombreEvento || "Nombre del evento"} placeholder="Ej: Boda de Ana y Luis" value={nombreEvento} onChange={e => setNombreEvento(e.target.value)} />
              {nombreOcupado && (
                <span className="aviso-nombre-ocupado">
                  Ya tienes un evento guardado con ese nombre. No se guarda solo para no pisarlo:
                  cámbiale el nombre, o ábrelo desde la lista si es ese.
                </span>
              )}
            </div>
            <div className="form-group">
              <span className="form-label">FECHA</span>
              <input type="date" className="form-input" value={fechaEvento} onChange={e => handleCambiarFechaEvento(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">HORA DE INICIO</span>
              <input type="time" className="form-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div className="form-group form-group-ancho">
              <span className="form-label">UBICACIÓN</span>
              <div className="ubicacion-row">
                <input type="text" className="form-input" title={ubicacion || "Ubicación"} placeholder="Ej: Finca La Alquería" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
                {/* Lo que escribe oficina es el nombre del sitio ("Finca La Alquería"),
                    no unas coordenadas: Maps lo busca igual de bien y ahorra copiarlo,
                    abrir la aplicación y pegarlo el día del montaje. Se abre en pestaña
                    nueva para no perder la checklist a medio marcar. */}
                {ubicacion.trim() && (
                  <a
                    className="btn btn-navy-outline btn-mapa"
                    href={enlaceMapa(ubicacion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir "${ubicacion.trim()}" en Google Maps`}
                  ><MapPin size={15} /> Cómo llegar</a>
                )}
              </div>
            </div>
          </div>
          <div className="form-group notas-group">
            <span className="form-label">NOTAS DEL EVENTO</span>
            <textarea
              className="form-input notas-textarea"
              placeholder="Ej: alergias, peticiones especiales, incidencias a tener en cuenta..."
              value={notasEvento}
              onChange={e => setNotasEvento(e.target.value)}
              rows={3}
            />
          </div>
          <div className="logistica-block">
            <span className="form-label logistica-label-rec">
              EQUIPO DE LOGÍSTICA (cada uno con su horario)
              <span className="logistica-recomendado" title="Recomendado: 1 persona de logística cada 60 pax. Se usa para repartir el tiempo de carga/descarga.">
                <Truck size={12} /> Recomendado: {Math.max(1, Math.ceil(pax / 60))}
                {logisticaEquipo.length < Math.max(1, Math.ceil(pax / 60)) && (
                  <button
                    className="logistica-add-rec"
                    onClick={() => setLogisticaEquipo(prev => {
                      const rec = Math.max(1, Math.ceil(pax / 60));
                      if (prev.length >= rec) return prev;
                      return [...prev, ...Array.from({ length: rec - prev.length }, () => ({ nombre: "", inicio: "", fin: "", furgoneta: false }))];
                    })}
                  >+ Añadir {Math.max(1, Math.ceil(pax / 60)) - logisticaEquipo.length}</button>
                )}
              </span>
            </span>
            {logisticaEquipo.length > 0 && (
              <div className="logistica-tarifas">
                <div className="form-group">
                  <span className="form-label">€ / hora</span>
                  <input type="number" className="form-input" min="0" step="0.5" value={tarifaLogistica} onChange={e => setTarifaLogistica(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="form-group">
                  <span className="form-label">Plus furgoneta propia (€)</span>
                  <input type="number" className="form-input" min="0" step="1" value={plusFurgoneta} onChange={e => setPlusFurgoneta(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
            )}
            {logisticaEquipo.map((p, i) => {
              const horas = horasLogistica(p.inicio, p.fin);
              const importe = importeLogistica(p, tarifaLogistica, plusFurgoneta);
              return (
                <div className="logistica-row" key={i}>
                  <input
                    type="text"
                    className="form-input logistica-nombre"
                    placeholder="Nombre"
                    value={p.nombre}
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, nombre: e.target.value } : x))}
                  />
                  <input
                    type="time"
                    className="form-input logistica-hora"
                    value={p.inicio}
                    title="Hora de inicio"
                    onChange={e => {
                      const nuevaInicio = e.target.value;
                      setLogisticaEquipo(prev => prev.map((x, idx) => {
                        if (idx !== i) return x;
                        const next = { ...x, inicio: nuevaInicio };
                        // Sugerir la hora de fin desde la de inicio (inicio + tiempo estimado
                        // total: preparación + carga + descarga). Solo si el fin está vacío o
                        // se había puesto de forma automática; siempre editable a mano.
                        if (nuevaInicio && tiemposCargaForm.totalMin > 0 && (!x.fin || x.finAuto)) {
                          next.fin = sumarMinutosHora(nuevaInicio, tiemposCargaForm.totalMin);
                          next.finAuto = true;
                        }
                        return next;
                      }));
                    }}
                  />
                  <span className="logistica-sep">–</span>
                  <input
                    type="time"
                    className="form-input logistica-hora"
                    value={p.fin}
                    title={p.finAuto ? "Hora de fin sugerida automáticamente (editable)" : "Hora de fin"}
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, fin: e.target.value, finAuto: false } : x))}
                  />
                  <button
                    type="button"
                    className={`logistica-tipo-btn ${p.tipo === "nomina" ? "is-nomina" : "is-extra"}`}
                    onClick={() => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, tipo: x.tipo === "nomina" ? "extra" : "nomina" } : x))}
                    title="Extra = se paga por horas · Nómina = ya va en nómina (no suma €/hora al evento)"
                  >{p.tipo === "nomina" ? "Nómina" : "Extra"}</button>
                  <label className="logistica-furgo" title="Plus por llevar furgoneta">
                    <input
                      type="checkbox"
                      checked={p.furgoneta || false}
                      onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, furgoneta: e.target.checked } : x))}
                    />
                    <Truck size={14} />
                  </label>
                  {horas !== null && (
                    <span className="logistica-info">{String(horas).replace(".", ",")}h · <strong>{String(importe).replace(".", ",")}€</strong>{p.tipo === "nomina" ? " nómina" : ""}</span>
                  )}
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setLogisticaEquipo(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar persona"
                    aria-label={`Quitar ${p.nombre || "persona"} de logística`}
                  ><X size={14} /></button>
                </div>
              );
            })}
            <div className="logistica-footer">
              <button
                className="btn-add-logistica"
                onClick={() => setLogisticaEquipo(prev => [...prev, { nombre: "", inicio: "", fin: "", furgoneta: false }])}
              >+ Añadir persona</button>
              {totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 && (
                <span className="logistica-total">Total: <strong>{String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€</strong></span>
              )}
            </div>
          </div>
          {/* ALQUILERES: material que no es nuestro. Estaban sueltos por el formulario
              (las sillas en Equipamiento, el armario caliente entre los extras) y no
              tenían ninguna relación con las recogidas de aquí abajo: se marcaba el
              alquiler, salía en la carga, y la recogida y la devolución había que
              escribirlas a mano evento tras evento. Ahora van juntos y cada uno crea
              las suyas con las fechas sacadas de la del evento. */}
          <div className="logistica-block">
            <span className="form-label">ALQUILERES (material de otros — crea su recogida y su devolución)</span>
            <div className="equip-grid alquileres-grid">
              <SegmentedControl
                label="Sillas"
                value={origenSillas}
                onChange={v => {
                  setOrigenSillas(v);
                  sincronizaAlquiler("sillas", v === "Dealde" || v === "Carvillo", conceptoAlquiler("sillas", v));
                }}
                options={["Dealde", "Carvillo", "Nuestras", "No llevan"]}
              />
              {/* El generador de las producciones siempre es alquilado (SOS), así que su
                  interruptor vive aquí y no en Equipamiento: al marcarlo hay que ir a
                  buscarlo y devolverlo, no solo cargarlo. */}
              {evento === "produccion" && (
                <SegmentedControl
                  label="Generador"
                  value={llevaGenerador ? "Lleva" : "No lleva"}
                  onChange={v => {
                    setLlevaGenerador(v === "Lleva");
                    sincronizaAlquiler("generador", v === "Lleva", conceptoAlquiler("generador"));
                  }}
                  options={["Lleva", "No lleva"]}
                />
              )}
              <label className="checkbox-label-normal">
                <input
                  type="checkbox"
                  checked={llevaArmarioCaliente}
                  onChange={e => {
                    setLlevaArmarioCaliente(e.target.checked);
                    sincronizaAlquiler("armarioCaliente", e.target.checked, conceptoAlquiler("armarioCaliente"));
                  }}
                />
                <span className="checkbox-texto">Armario caliente <span className="checkbox-sub">· Dealde</span></span>
              </label>
              {/* Mobiliario EXTRA, el que no tenemos: se alquila a Event Style cuando el
                  cliente pide más de lo nuestro. En un rodaje no se lleva, así que ahí no
                  se ofrece. Los chill out son nuestros y se configuran en Extras: esos no
                  hay que devolverlos. */}
              {evento !== "produccion" && (
                <label className="checkbox-label-normal">
                  <input
                    type="checkbox"
                    checked={llevaMobiliarioAlquiler}
                    onChange={e => {
                      setLlevaMobiliarioAlquiler(e.target.checked);
                      sincronizaAlquiler("mobiliario", e.target.checked, conceptoAlquiler("mobiliario"));
                    }}
                  />
                  <span className="checkbox-texto">Mobiliario extra <span className="checkbox-sub">· Event Style, lo que no es nuestro</span></span>
                </label>
              )}
              {/* Las 8 carpas del almacén cubren casi todo; cuando el cálculo pide más hay
                  que alquilar las que falten, y esas también se van a buscar y se devuelven. */}
              {evento === "produccion" && llevaCarpas && (
                <label className="checkbox-label-normal">
                  <input
                    type="checkbox"
                    checked={alquilaCarpas}
                    onChange={e => {
                      setAlquilaCarpas(e.target.checked);
                      sincronizaAlquiler("carpas", e.target.checked, conceptoAlquiler("carpas"));
                    }}
                  />
                  <span className="checkbox-texto">Carpas de alquiler <span className="checkbox-sub">· Support On Set</span></span>
                </label>
              )}
            </div>
            {!fechaEvento && recogidas.some(r => r.auto) && (
              <p className="alquileres-aviso">Pon la fecha del evento y las de recogida y devolución se rellenan solas.</p>
            )}
          </div>
          <div className="logistica-block">
            <span className="form-label">RECOGIDAS (alquileres/equipo de otros a devolver o recoger)</span>
            {recogidas.map((r, i) => (
              <div className="recogida-card" key={i}>
                <div className="recogida-card-top">
                  {r.auto && (
                    <span className="recogida-auto-badge" title="Creada sola al marcar el alquiler. Las fechas salen de la del evento hasta que las cambies a mano">
                      <Tag size={11} /> Alquiler
                    </span>
                  )}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Camión plataforma (Albácar)"
                    title={r.concepto || "Qué hay que recoger o devolver"}
                    value={r.concepto}
                    onChange={e => editarRecogida(i, { concepto: e.target.value })}
                  />
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setRecogidas(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar recogida"
                    aria-label={`Quitar recogida ${r.concepto || ""}`}
                  ><X size={14} /></button>
                </div>
                <div className="recogida-card-fechas">
                  <div className="form-group">
                    <span className="form-label">Recogida</span>
                    <div className="recogida-fecha-hora">
                      <input
                        type="date"
                        className="form-input"
                        value={r.fecha}
                        title="Fecha de recogida"
                        onChange={e => editarRecogida(i, { fecha: e.target.value }, true)}
                      />
                      <input
                        type="time"
                        className="form-input"
                        value={r.hora}
                        title="Hora de recogida"
                        onChange={e => editarRecogida(i, { hora: e.target.value })}
                      />
                    </div>
                    <label className={`recogida-estado ${r.recogido ? "is-hecho" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!r.recogido}
                        onChange={e => editarRecogida(i, { recogido: e.target.checked })}
                      />
                      {r.recogido ? "✓ Recogido" : "Pendiente de recoger"}
                    </label>
                  </div>
                  <div className="form-group">
                    <span className="form-label">Devolución</span>
                    <input
                      type="date"
                      className="form-input"
                      value={r.fechaDevolucion || ""}
                      title="Fecha de devolución"
                      onChange={e => editarRecogida(i, { fechaDevolucion: e.target.value }, true)}
                    />
                    {r.fechaDevolucion && (
                      <label className={`recogida-estado ${r.devuelto ? "is-hecho" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!r.devuelto}
                          onChange={e => editarRecogida(i, { devuelto: e.target.checked })}
                        />
                        {r.devuelto ? "✓ Devuelto" : "Pendiente de devolver"}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn-add-logistica"
              onClick={() => setRecogidas(prev => [...prev, { concepto: "", fecha: "", hora: "", fechaDevolucion: "" }])}
            >+ Añadir recogida</button>
          </div>
          <div className="logistica-block">
            <span className="form-label">COMPRAS (qué falta comprar, con fecha límite y aviso)</span>
            {compras.map((c, i) => (
              <div className="recogida-card" key={i}>
                <div className="recogida-card-top">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Hielo, servilletas, pilas walkie..."
                    title={c.concepto || "Qué hay que comprar"}
                    value={c.concepto}
                    onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, concepto: e.target.value } : x))}
                  />
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setCompras(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar compra"
                    aria-label={`Quitar compra ${c.concepto || ""}`}
                  ><X size={14} /></button>
                </div>
                <div className="recogida-card-fechas">
                  <div className="form-group">
                    <span className="form-label">Cantidad / detalle</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 4 bolsas"
                      title={c.cantidad || "Cantidad o detalle"}
                      value={c.cantidad || ""}
                      onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: e.target.value } : x))}
                    />
                  </div>
                  <div className="form-group">
                    <span className="form-label">Comprar antes de</span>
                    <input
                      type="date"
                      className="form-input"
                      value={c.fecha || ""}
                      title="Fecha límite de compra"
                      onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, fecha: e.target.value } : x))}
                    />
                    <label className={`recogida-estado ${c.comprado ? "is-hecho" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!c.comprado}
                        onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, comprado: e.target.checked } : x))}
                      />
                      {c.comprado ? "✓ Comprado" : "Pendiente de comprar"}
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn-add-logistica"
              onClick={() => setCompras(prev => [...prev, { concepto: "", cantidad: "", fecha: "", comprado: false }])}
            >+ Añadir compra</button>
          </div>
          {evento !== "produccion" && (<>
          <hr />
          <div className="section-title">Barra libre</div>
          <div className="form-row">
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCoctel} onChange={e => setBarraCoctel(e.target.checked)} />
                Cóctel / aperitivo
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="12" step="0.5" className="range-slider" value={horasCoctel} onChange={e => setHorasCoctel(parseFloat(e.target.value))} disabled={!barraCoctel} />
                <span className="range-value">{horasCoctel}h</span>
              </div>
            </div>
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCopas} onChange={e => setBarraCopas(e.target.checked)} />
                Copas
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="24" step="1" className="range-slider" value={horasCopas} onChange={e => setHorasCopas(parseFloat(e.target.value))} disabled={!barraCopas} />
                <span className="range-value">{horasCopas}h</span>
              </div>
            </div>
          </div>
          </>)}
          {/* En producción no sale porque un rodaje no lleva alcohol. En cumpleaños sí:
              estaba oculto del lote en que este evento se trató como "ligero", el mismo
              que le dejó sin vino, cerveza ni cava.
              Va en controls-row y NO en form-row: form-row parte la barra lateral en dos
              columnas iguales, así que al control le tocaban 171px necesitara lo que
              necesitara — y con los 196 que pide se rompía por dentro (primero partiendo
              "No lleva" en dos líneas, luego tirando "50L" a otra fila). controls-row
              reparte por contenido: cada cosa ocupa lo suyo y, si no caben las dos, el
              "Nº barriles" baja entero a la línea siguiente. */}
          {evento !== "produccion" && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              <SegmentedControl label="Barril de cerveza" value={tamanoBarril} onChange={setTamanoBarril} options={["No lleva", "30L", "50L"]} />
              {tamanoBarril !== "No lleva" && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº barriles</span>
                  <input type="number" className="form-input" value={numBarriles} min="1" onChange={e => setNumBarriles(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              )}
            </div>
          )}
          <hr />
          <div className="section-title">Extras</div>
          <div className="checkbox-grid">
            {[
              [dobleServicio,        setDobleServicio,        "Doble servicio",          "dobla cubierto, copa y plato"],
              [llevaEntrante,        setLlevaEntrante,        "Entrante de chupito",      "solo vasos de cristal"],
              [entranteCompartido,   setEntranteCompartido,   "Entrante compartido",      "platos para compartir en mesa"],
              /* "Lleva canapés" ya no existe: las bandejas para pasar comida van siempre,
                 calculadas por pax. Lo que de verdad cambia la carga es si el servicio
                 es entero de bandeja, y eso es esta casilla. */
              [soloBandeja,          setSoloBandeja,          "Solo bandeja",             "quita TODOS los platos y suma bandejas"],
              [llevaPaella,          setLlevaPaella,          "Lleva paella",             "calcula paelleros completos"],
              /* El armario caliente es alquiler: vive en el bloque ALQUILERES, junto a
                 las sillas, porque además de cargarlo hay que ir a por él y devolverlo. */
              [tieneFrituras,        setTieneFrituras,        "Hay frituras",             tieneFrituras ? `${numFrituras} ${numFrituras === 1 ? "sartén" : "sartenes"} parisiene (ajusta abajo)` : "sartén parisiene"],
              ...(evento !== "produccion"
                ? [[llevaPlanchaGas, setLlevaPlanchaGas, "Plancha de gas", "suma 1 bombona"]]
                : []),
              ...(evento !== "produccion"
                ? [[tieneBrindisCava, setTieneBrindisCava, "Brindis con cava", "dobla copas de cava"]]
                : []),
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de palomitera propio"],
              [llevaChillOut,        setLlevaChillOut,        "Lleva chill out",          llevaChillOut ? `${numChillOut} (ajusta abajo)` : "sofás/zona chill out"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              // La mesa y los platos de tarta se cargaban siempre, sin poder quitarlos, y
              // la pala y el cuchillo no se cargaban nunca. Aquí se decide de una vez.
              ...(evento !== "produccion"
                ? [[llevaTarta,      setLlevaTarta,           "Hay tarta",                "mesa, platos, pala y cuchillo"]]
                : []),
              ...(evento !== "produccion"
                ? [[llevaAguasPequenas, setLlevaAguasPequenas, "Aguas pequeñas", "botellas individuales 33cl"]]
                : []),
              [hayDesayuno,          setHayDesayuno,          "Hay desayuno",             "sandwichera + más tazas de café"],
              ...(evento !== "boda"
                ? [[fuerzaTextilTela, setFuerzaTextilTela, "Servilletas de tela", "añade tela y reduce las de papel grandes"]]
                : []),
              ...(evento !== "cumpleanos" && evento !== "produccion"
                ? [[llevaJarrasCristal, setLlevaJarrasCristal, "Jarras de cristal", "para agua/zumos en mesa"]]
                : []),
            ].map(([val, fn, lab, sub]) => (
              <label key={lab} className="checkbox-label-normal">
                <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                <span className="checkbox-texto">{lab} <span className="checkbox-sub">· {sub}</span></span>
              </label>
            ))}
          </div>
          {/* La plancha de gas entra en la condición: en un rodaje va siempre y sin
              esto, un rodaje sin paella ni frituras no enseñaba la fila entera y no
              había forma de decir cuántas planchas van (ni, con ellas, las bombonas). */}
          {(entranteCompartido || llevaPaella || tieneFrituras || llevaChillOut
            || llevaPlanchaGas || evento === "produccion") && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              {entranteCompartido && (
                <>
                  <SegmentedControl label="Se comparte cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
                  {/* Cuántos entrantes distintos se reparten. Era un campo numérico y no
                      se veía: hay menús con dos entrantes para compartir (y algún día
                      con tres) y cada uno multiplica sus platos. Como selector se ve de
                      un vistazo lo que hay puesto. Si algún menú lleva más de tres, se
                      edita la cantidad del item a mano en la lista. */}
                  <SegmentedControl
                    label="Entrantes a compartir"
                    value={Math.min(3, Math.max(1, numEntrantesCompartir))}
                    onChange={setNumEntrantesCompartir}
                    options={[1, 2, 3]}
                  />
                </>
              )}
              {llevaPaella && (
                <>
                  <SegmentedControl label="Tamaño de paella" value={tipoPaella} onChange={setTipoPaella} options={["Auto", "Pequeña", "Mediana", "Grande"]} />
                  {/* Cuántas paelleras. En blanco = las que salen de la gente (una cada
                      30), que es como funcionaba antes; escribir un número manda sobre
                      la cuenta y arrastra paletas, difusores, trípodes y bombonas. */}
                  <div className="form-group controls-mini">
                    <span className="form-label">Nº de paellas</span>
                    <input
                      type="number"
                      className="form-input"
                      value={numPaellas || ""}
                      min="1"
                      placeholder={String(calcPaella(pax, tipoPaella, 0).n)}
                      onChange={e => setNumPaellas(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      En blanco salen {calcPaella(pax, tipoPaella, 0).n} por la gente
                    </span>
                  </div>
                </>
              )}
              {tieneFrituras && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº sartenes parisiene (frituras)</span>
                  <input type="number" className="form-input" value={numFrituras} min="1" onChange={e => setNumFrituras(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Ajusta bombonas, difusor, trípode y espumadera</span>
                </div>
              )}
              {/* En producción la plancha va fija, así que el número se ofrece siempre;
                  en el resto, solo si la llevan. Cada plancha lleva su bombona. */}
              {(llevaPlanchaGas || evento === "produccion") && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº planchas de gas</span>
                  <input type="number" className="form-input" value={numPlanchasGas} min="1" onChange={e => setNumPlanchasGas(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Cada plancha suma su bombona</span>
                </div>
              )}
              {llevaChillOut && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº chill out</span>
                  <input type="number" className="form-input" value={numChillOut} min="1" onChange={e => setNumChillOut(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              )}
            </div>
          )}
          <hr />
          <div className="section-title">Equipamiento</div>
          <div className="equip-grid">
            {/* Las sillas se eligen en el bloque ALQUILERES (arriba, con las recogidas):
                según de quién sean hay que ir a buscarlas y devolverlas. */}
            <SegmentedControl label="Bandejas de servicio" value={tipoBandejas} onChange={setTipoBandejas} options={["Madera", "Plata", "Mixto"]} />
            <div className="equip-pareja">
              <div className="form-group">
                <span className="form-label">Madera extra</span>
                <input type="number" className="form-input" value={extraBandejasMadera || ""} placeholder="0" min="0" onChange={e => setExtraBandejasMadera(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div className="form-group">
                <span className="form-label">Plata extra</span>
                <input type="number" className="form-input" value={extraBandejasPlata || ""} placeholder="0" min="0" onChange={e => setExtraBandejasPlata(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
            </div>
            {evento !== "produccion" && (
              <>
                <SegmentedControl label="Nevera" value={tipoNevera} onChange={setTipoNevera} options={["No lleva", "Mediana", "Grande"]} />
                <SegmentedControl label="Congelador" value={tipoCongelador} onChange={setTipoCongelador} options={["No lleva", "Mediana", "Grande"]} />
              </>
            )}
            {/* "No lleva" no necesita nada más: los tres generadores solo añaden horno
                cuando el valor es pequeño/grande/ambos, así que con cualquier otro
                valor no se carga ninguno. */}
            <SegmentedControl label="Horno" value={tipoHorno} onChange={setTipoHorno} options={["Pequeño", "Grande", "Ambos", "No lleva"]} />
            <SegmentedControl label="Cafetera" value={tipoCafetera} onChange={setTipoCafetera} options={["Nespresso", "Bar", "Grande"]} />
            {/* La temporada solo mueve bebida (cerveza, reparto de vino y tinto de
                verano), así que en producción no se ofrece: un rodaje no lleva alcohol. */}
            {evento !== "produccion" && (
              <SegmentedControl
                label={`Temporada${estacion === "auto" ? ` · ahora ${mesVerano ? "verano" : "invierno"}` : ""}`}
                value={estacion === "auto" ? "Auto" : (estacion === "verano" ? "Verano" : "Invierno")}
                onChange={v => setEstacion(v === "Auto" ? "auto" : v.toLowerCase())}
                options={["Auto", "Verano", "Invierno"]}
              />
            )}
            {/* Vajilla. El estilo del plato se elige en TODOS los tipos de evento
                (antes cumpleaños y producción solo tenían un interruptor). Donde se
                elige el estilo está también la opción "No llevan", en vez de un
                interruptor aparte, y principal y postre son independientes: se puede
                llevar postre sin principal y al revés. Los cubiertos siguen con
                interruptor porque casi siempre van. */}
            {evento !== "cumpleanos" && evento !== "produccion" && (
              <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
            )}
            <div className="equip-pareja">
              {/* Cuántos manteles lo sigue calculando la app por las mesas; aquí solo
                  se elige de cuáles. Vacío = el de siempre según el tipo de evento. */}
              <SegmentedControl
                label="Manteles"
                value={colorManteles || colorPorDefecto(evento)}
                onChange={setColorManteles}
                options={["Beige", "Negros", "Ambos"]}
              />
              {(colorManteles || colorPorDefecto(evento)) === "Ambos" && (
                <div className="form-group">
                  <span className="form-label">% BEIGE (el resto, negros)</span>
                  <input
                    type="number" className="form-input" min="0" max="100"
                    value={porcentajeBeige}
                    onChange={e => setPorcentajeBeige(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
              )}
            </div>
            <div className="equip-pareja">
              <SelectConOtro
                label="Estilo plato principal"
                value={llevaPlatos ? estiloPlatoPrincipal : "No llevan"}
                onChange={v => { if (v === "No llevan") setLlevaPlatos(false); else { setLlevaPlatos(true); setEstiloPlatoPrincipal(v); } }}
                options={["Blanco liso", "Relieve blanco", "Verde", "Metálico"]}
                opcionNinguna="No llevan"
              />
              <SelectConOtro
                label="Estilo plato postre"
                value={llevaPlatosPostre ? estiloPlatoPostre : "No llevan"}
                onChange={v => { if (v === "No llevan") setLlevaPlatosPostre(false); else { setLlevaPlatosPostre(true); setEstiloPlatoPostre(v); } }}
                options={["Blanco", "Verde", "Negro/gris"]}
                opcionNinguna="No llevan"
              />
            </div>
            {soloBandeja && (llevaPlatos || llevaPlatosPostre) && (
              <div className="equip-aviso">Con "Solo bandeja" la comida va toda en bandeja, así que los platos no se cargan aunque aquí tengan estilo elegido.</div>
            )}
            <SegmentedControl label="Cubiertos" value={llevaCubiertos ? "Llevan" : "No llevan"} onChange={v => setLlevaCubiertos(v === "Llevan")} options={["Llevan", "No llevan"]} />
            {/* Carpas y generador son equipo estándar de rodaje, no un extra que se
                añade: van aquí con el resto del equipamiento y las cantidades se
                calculan solas. El "No llevan" es para el sitio puntual que ya tiene
                sombra o luz propia. */}
            {/* El generador está en ALQUILERES: siempre viene de SOS. Las carpas son
                nuestras (8 en almacén), así que su interruptor se queda aquí; si hacen
                falta más, se marcan como alquiler en ese bloque. */}
            {evento === "produccion" && (
              <SegmentedControl
                label="Aguas pequeñas"
                value={tipoAguaPequena || "Sin decir"}
                onChange={v => setTipoAguaPequena(v === "Sin decir" ? "" : v)}
                options={["Plástico", "Cartón", "Sin decir"]}
              />
            )}
            {evento === "produccion" && (
              <SegmentedControl
                label="Carpas"
                value={llevaCarpas ? "Llevan" : "No llevan"}
                onChange={v => {
                  setLlevaCarpas(v === "Llevan");
                  // Sin carpas no hay carpas que alquilar: se apaga también su recogida
                  if (v !== "Llevan" && alquilaCarpas) {
                    setAlquilaCarpas(false);
                    sincronizaAlquiler("carpas", false);
                  }
                }}
                options={["Llevan", "No llevan"]}
              />
            )}
            {/* Cuántas. Vacío = las que salen de la cuenta por pax; un número manda
                sobre ella, porque el sitio lo ha visto una persona y la cuenta no.
                Si pasa de las 8 del almacén, se dice aquí mismo cuántas alquilar. */}
            {evento === "produccion" && llevaCarpas && (
              <div className="form-group">
                <span className="form-label">Nº DE CARPAS</span>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  placeholder={String(carpasRecomendadas(paxCarpas))}
                  value={numCarpas || ""}
                  onChange={e => {
                    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setNumCarpas(n);
                    // Lo que pase de lo que hay en almacén se alquila, con su recogida
                    const hayQueAlquilar = carpasPorAlquilar(n > 0 ? n : carpasRecomendadas(paxCarpas)) > 0;
                    if (hayQueAlquilar !== alquilaCarpas) {
                      setAlquilaCarpas(hayQueAlquilar);
                      sincronizaAlquiler("carpas", hayQueAlquilar, conceptoAlquiler("carpas"));
                    }
                  }}
                />
                {carpasPorAlquilar(numCarpas || carpasRecomendadas(paxCarpas)) > 0 && (
                  <span className="checkbox-sub">
                    Tenemos {CARPAS_EN_ALMACEN}: hay que alquilar {carpasPorAlquilar(numCarpas || carpasRecomendadas(paxCarpas))} a Support On Set
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        </div>
        <div className="checklist-main">

        {/* BUSCADOR + DESHACER */}
        <div className="animate-entrance search-row" style={{ animationDelay: "0.2s" }}>
          <input type="text" className="search-input-main" placeholder="Buscar un material..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          {historial.length > 0 && (
            <button className="btn btn-outline btn-deshacer" onClick={handleDeshacer} title="Deshace el último cambio manual (cantidad editada o item quitado)"><Undo2 size={14} /> Deshacer</button>
          )}
        </div>

        {/* AÑADIR ITEM PERSONALIZADO */}
        {!soloMarcar && (
        <div className="config-card animate-entrance add-item-card" style={{ animationDelay: "0.22s" }}>
          <div className="add-item-row">
            <div className="form-group" style={{ flex: 2 }}>
              <span className="form-label">Añadir item personalizado</span>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Vela aromática"
                value={nuevoItemLabel}
                onChange={e => handleLabelItemManual(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddItemManual()}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <span className="form-label">Cantidad</span>
              <input
                type="text"
                className="form-input"
                placeholder="1"
                value={nuevoItemCantidad}
                onChange={e => setNuevoItemCantidad(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddItemManual()}
              />
            </div>
            <div className="form-group add-item-categoria" style={{ flex: 2 }}>
              <span className="form-label">Categoría</span>
              <select
                className="form-select"
                value={nuevoItemCategoria || CATEGORIA_MANUAL}
                onChange={e => {
                  if (e.target.value === "__nueva__") {
                    setDialogo({
                      tipo: "prompt",
                      titulo: "Nueva categoría",
                      placeholder: "Ej: Atrezzo photocall",
                      textoConfirmar: "Crear",
                      onConfirm: (nueva) => { setNuevoItemCategoria(nueva); setCategoriaTocada(true); },
                    });
                    return;
                  }
                  setNuevoItemCategoria(e.target.value); setCategoriaTocada(true);
                }}
              >
                {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                {nuevoItemCategoria && !categoriasDisponibles.includes(nuevoItemCategoria) && nuevoItemCategoria !== CATEGORIA_MANUAL && (
                  <option value={nuevoItemCategoria}>{nuevoItemCategoria}</option>
                )}
                <option value={CATEGORIA_MANUAL}>{CATEGORIA_MANUAL}</option>
                <option value="__nueva__">+ Nueva categoría…</option>
              </select>
            </div>
            <label className="add-item-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
              <input type="checkbox" checked={nuevoItemAlquiler} onChange={e => setNuevoItemAlquiler(e.target.checked)} />
              <Tag size={12} /> Alquiler proveedor
            </label>
            <button className="btn btn-navy-outline add-item-btn" onClick={handleAddItemManual} disabled={!nuevoItemLabel.trim()}>+ Añadir</button>
          </div>
        </div>
        )}

        {/* CATEGORÍAS */}
        {filtered.map((cat, idx) => {
          const isOpen = openCategories[cat.nombre] !== false;
          const infoCat = infoCategoria(cat.nombre);
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s`, borderTopColor: infoCat.color, borderTopWidth: 3 }}>
              <div className="category-header" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggleCategory(cat.nombre)} onKeyDown={e => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && toggleCategory(cat.nombre)}>
                <span className="cat-name"><span className="cat-icon" style={{ background: infoCat.color, color: infoCat.texto }}>{infoCat.Comp && <infoCat.Comp size={16} strokeWidth={2.2} />}</span>{cat.nombre}</span>
                <span className="cat-count">
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleMoverCategoria(cat.nombre, -1); }} disabled={idx === 0} title="Subir esta categoría" aria-label={`Subir la categoría ${cat.nombre}`}><ChevronUp size={13} /></button>
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleMoverCategoria(cat.nombre, 1); }} disabled={idx === checklist.length - 1} title="Bajar esta categoría" aria-label={`Bajar la categoría ${cat.nombre}`}><ChevronDown size={13} /></button>
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleRenombrarCategoria(cat.nombre); }} title="Renombrar categoría" aria-label={`Renombrar categoría ${cat.nombre}`}><Pencil size={13} /></button>
                  {cat.items.length}<span className="arrow">▼</span>
                </span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty, manualIdx, labelOriginal, esAlquilerManual, sufijo], i) => {
                    const keyId = `${cat.nombre}::${labelOriginal ?? label}`;
                    const editando = editandoNombre === keyId;
                    return (
                      <FilaItem
                        key={i}
                        categoria={cat.nombre}
                        label={label}
                        labelOriginal={labelOriginal}
                        displayQty={String(qty && qty.u ? qty.u : qty)}
                        manualIdx={manualIdx}
                        esAlquilerManual={esAlquilerManual}
                        sufijo={sufijo}
                        editado={overridesManuales[keyId] !== undefined}
                        renombrado={manualIdx === undefined && nombresManuales[keyId] !== undefined}
                        editando={editando}
                        // Solo la fila que se está editando recibe estos dos: si los
                        // recibieran todas, escribir un nombre repintaría la lista entera
                        nombreTemporal={editando ? nombreTemporal : null}
                        alquilerTemporal={editando ? alquilerTemporal : null}
                        acciones={accionesFilaRef}
                        soloMarcar={soloMarcar}
                      />
                    );
                  })}
                  {(ocultosPorCategoria[cat.nombre] || []).length > 0 && (
                    <div className="items-quitados">
                      <span className="items-quitados-texto">
                        {ocultosPorCategoria[cat.nombre].length} item{ocultosPorCategoria[cat.nombre].length === 1 ? "" : "s"} quitado{ocultosPorCategoria[cat.nombre].length === 1 ? "" : "s"}
                        <em title={ocultosPorCategoria[cat.nombre].join(" · ")}>{ocultosPorCategoria[cat.nombre].join(" · ")}</em>
                      </span>
                      <button className="items-quitados-btn" onClick={() => handleRecuperarOcultos(cat.nombre)}>
                        <RotateCcw size={13} /> Recuperar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        </div>
      </div>
    </>
  );
}
