import React, { useState, useMemo, useEffect } from "react";
import {
  nubeActiva, nuevoIdEvento, guardarEventoNube, suscribirEventoNube,
  guardarIndiceEventosNube, cargarIndiceEventosNube, suscribirIndiceEventosNube,
} from "./nube.js";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const BATEA = { vino: 25, cava: 36, agua: 25, cubata: 25, chupito: 49 };
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
function conBateas(label, qtyTexto) {
  const size = bateaSizeDe(label);
  const num = parseFloat(String(qtyTexto).replace(",", "."));
  if (!size || isNaN(num)) return qtyTexto;
  return `${qtyTexto} (${Math.ceil(num / size)} bateas de ${size})`;
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
  return `${qtyTexto} (${Math.ceil(num / size)} cajas de ${size})`;
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
const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];
const CATEGORIA_MANUAL = "Otros (añadidos manualmente)";
// Margen de seguridad del 10% SOLO sobre cristalería, vajilla y servilletas:
// es el buffer estándar del sector por roturas/pérdidas (los alquileres recomiendan
// pedir un 10-20% extra de copas y platos). Las bebidas, licores y cápsulas NO llevan
// margen extra: sus ratios ya están calibrados con eventos reales por encima de los
// rangos del sector (ej: vino 0,72 bot/pax frente al estándar de 0,33-0,5).
const MARGEN_SEGURIDAD = 1.1;
const conMargen = (n) => Math.ceil(n * MARGEN_SEGURIDAD);

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
  { fragmento: "electric", icono: "🔌", color: "#fef3c7", texto: "#92400e" },
  { fragmento: "mobiliario", icono: "🪑", color: "#fce7f3", texto: "#9d174d" },
  { fragmento: "cocina", icono: "🍳", color: "#ffedd5", texto: "#9a3412" },
  { fragmento: "menaje", icono: "🔪", color: "#e0e7ff", texto: "#3730a3" },
  { fragmento: "cristal", icono: "🥂", color: "#cffafe", texto: "#155e75" },
  { fragmento: "mantel", icono: "🧺", color: "#fae8ff", texto: "#86198f" },
  { fragmento: "vajilla", icono: "🍽️", color: "#dbeafe", texto: "#1e40af" },
  { fragmento: "limpieza", icono: "🧹", color: "#d1fae5", texto: "#065f46" },
  { fragmento: "café", icono: "☕", color: "#f3e8d2", texto: "#78350f" },
  { fragmento: "bebida", icono: "🥤", color: "#e0f2fe", texto: "#075985" },
  { fragmento: "alcohol", icono: "🥃", color: "#fee2e2", texto: "#991b1b" },
  { fragmento: "logística", icono: "📦", color: "#ede9fe", texto: "#5b21b6" },
  { fragmento: "desechable", icono: "🥡", color: "#fef9c3", texto: "#854d0e" },
  { fragmento: "otros", icono: "✨", color: "#f1f5f9", texto: "#334155" },
];
const CATEGORIA_DEFAULT = { icono: "📋", color: "#f1f5f9", texto: "#334155" };
function infoCategoria(nombre) {
  const n = nombre.toLowerCase();
  return ICONOS_CATEGORIA.find(i => n.includes(i.fragmento)) || CATEGORIA_DEFAULT;
}
function iconoCategoria(nombre) {
  return infoCategoria(nombre).icono;
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
function bateas(units, size) { return Math.ceil(units / size); }

function calcBebidas(pax, h, mesVerano, tieneCongelador) {
  const barFactor = h / 4;
  const cervezaFactor = mesVerano ? 2.0 : 1.5;
  // El consumo de cerveza por pax no crece sin límite cuanto más dura la barra: a partir
  // de las 4h de referencia el consumo por persona se estabiliza (nadie bebe el doble de
  // cerveza solo porque la barra esté abierta el doble de horas). Se limita el factor a 1
  // para no superar el techo real del sector (1,5-2 tercios/pax) en eventos largos.
  const cerveza = Math.round((pax * cervezaFactor * Math.min(1, barFactor)) / 24) * 24;
  // Vino: calibrado con datos reales (65 pax → 30 blanco, 16-17 tinto)
  const vinoTotal = Math.round(pax * 0.72);
  const ratioBlanco = mesVerano ? 0.65 : 0.45;
  const vinoBlanco = Math.round(vinoTotal * ratioBlanco);
  const vinoTinto = vinoTotal - vinoBlanco;
  const cava = Math.round(pax * 0.2);
  // Los refrescos (Coca-Cola, Fanta, Sprite, Nestea) se consumen durante todo el evento,
  // no solo en las horas de barra libre: calibrado con datos reales (65 pax → 120 Coca
  // normal, 72 Zero, 12 Nestea), ya no depende de las horas de barra
  const refrescoTotal = Math.round(pax * 7.4);
  const tonica = Math.max(6, Math.round(pax * 0.15 * barFactor));
  // Agua 1,5L (Solán de Cabras) es la de cliente en mesa/barra — no confundir con el
  // Agua Vidaqua de personal, que se calcula aparte en calcPersonal()
  const agua15 = Math.round(pax * 0.8);
  const redbull = h > 0 ? Math.max(6, Math.round(pax * 0.06 * barFactor)) : 0;
  // Aguas pequeñas van en cajas de 35 uds, ~3 uds/pax (ej. 65 pax ≈ 200 uds ≈ 6 cajas)
  const aguasPequenasUds = Math.round(pax * 3);
  const aguasPequenasCajas = Math.max(1, Math.ceil(aguasPequenasUds / 35));
  // Con congelador en la finca se hace/almacena el hielo in situ: no hace falta traerlo en taxis
  const taxisHielo = tieneCongelador ? 0 : Math.max(2, Math.ceil(pax / 30));
  // El vermut (rojo/blanco) se sirve en el aperitivo, no solo con barra libre de copas:
  // se calcula aquí (siempre presente) en vez de en calcDestilados (que sí depende de horasCopas).
  // Calibrado con datos reales (65 pax → 6 rojo, 5 blanco).
  const vermutRojo = Math.max(2, Math.round(pax / 11));
  const vermutBlanco = Math.max(2, Math.round(pax / 13));
  // Tinto de verano: bebida de verano habitual, más presente en meses cálidos
  const tintoVerano = Math.max(2, Math.round(pax * (mesVerano ? 0.25 : 0.12)));
  return {
    // Sin margen extra: los ratios ya están calibrados con eventos reales por encima
    // de los rangos del sector (vino 0,72 bot/pax vs 0,33-0,5 estándar; cerveza en el
    // techo de 1,5-2/pax; cava 0,2 vs 0,17). Añadir un 10% encima era pasarse.
    cerveza, vinoBlanco, vinoTinto,
    cava, tonica, agua15, redbull,
    aguasPequenasCajas, aguasPequenasUds,
    vermutRojo, vermutBlanco, tintoVerano,
    cocaNormal: Math.round(refrescoTotal * 0.25),
    cocaZero:   Math.round(refrescoTotal * 0.15),
    // Cada refresco por separado, sin unificar (datos reales: Fanta naranja y limón
    // se piden como productos distintos, no combinados en una sola línea)
    fantaNaranja: Math.round(refrescoTotal * 0.08),
    fantaLimon:   Math.round(refrescoTotal * 0.07),
    aquarius:     Math.round(refrescoTotal * 0.1),
    sprite:     Math.round(refrescoTotal * 0.1),
    nestea:     Math.round(refrescoTotal * 0.025),
    // Agua con gas y cerveza sin alcohol se piden en cajas de 24 (1 caja mínimo real)
    aguaConGas: Math.round(pax * 0.37),
    cerveza00:  Math.round(pax * 0.37),
    sinGluten:  Math.round(pax * 0.3),
    taxisHielo,
  };
}

function calcDestilados(pax, h) {
  const f = h / 4;
  const r  = (base) => Math.max(1, Math.round(base * f));
  // Estos licores no se compran de uno en uno: mínimo 2 botellas
  const r2 = (base) => Math.max(2, Math.round(base * f));
  return {
    // Calibrado con datos reales (65 pax, barra libre de copas 4h → Seagrams+Tanqueray 9,
    // Bacardí 1, tequila 2, tequila rosa 2-3, Ballantines 4, Barceló 4). Sin margen extra:
    // los mínimos de 2 botellas y el redondeo ya cubren de sobra el rango del sector.
    ginebraPremium: r2(pax / 7.2), ginebraSabor: r(pax / 35), ron: r(pax / 60),
    ronBlanco: r2(pax / 50), tequila: r2(pax / 33), tequilaSabor: r2(pax / 26),
    vodka: r(pax / 40), ballantines: r2(pax / 16), barcelo: r2(pax / 16),
    // Estos licores curiosos se piden fijos, sin escalar con el pax (no tiene sentido
    // aplicarles margen: ya son la cantidad mínima de compra)
    mistela: 2, baileys: 1, tiaMaria: 1, limoncello: 1, jagger: 1, peach: 1,
    cremaOrujo: 1, cazalla: 1, orujoHierbas: 1, marcaBlanca: 1,
  };
}

function calcCristaleria(pax, horasCoctel, horasCopas, dobleCopa, tieneBrindisCava, llevaEntrante, extraAguaDesayuno = 0) {
  // Vasos de cubata calibrados con el estándar del sector: ~4 vasos/pax para una
  // barra de 4h (los alquileres recomiendan 3-4/pax porque los camareros friegan
  // y reutilizan durante el servicio), escalando con las horas y con techo en 6.
  // Solo depende de las horas de COPAS: el cóctel/aperitivo no sirve cubatas.
  const copasBarraPorPax = horasCopas > 0 ? Math.min(6, 1 + horasCopas * 0.75) : 0;
  const mult = dobleCopa ? 2 : 1;
  // Copas de vino/agua/cava: cuantas más horas de barra libre (cóctel + copas
  // sumadas), más rondas y más roturas/pérdidas hay que cubrir — igual que otros
  // caterings calculan la cristalería sobre el total de horas de servicio, no
  // sobre el pax en seco. Se calibra con 4h de barra total = factor 1 (mismos
  // ratios de antes), con suelo en eventos breves y techo en eventos muy largos.
  const horasBarraTotal = horasCoctel + horasCopas;
  const barFactor = Math.min(1.75, Math.max(0.65, horasBarraTotal / 4));
  // Margen de seguridad del 10% para cubrir roturas/pérdidas de cristalería durante el servicio
  const vino = conMargen(pax * 2.5 * barFactor * mult);
  const agua = conMargen(pax * 1.5 * barFactor * mult) + extraAguaDesayuno;
  const cubata = conMargen(pax * copasBarraPorPax);
  const cavaCopas = conMargen(pax * (tieneBrindisCava ? 2.0 : 1.0) * barFactor);
  const fmt = (u, size) => ({ u: Math.ceil(u / size) * size, b: bateas(u, size), size });
  return {
    agua: fmt(agua, BATEA.agua), cubata: fmt(cubata, BATEA.cubata),
    vino: fmt(vino, BATEA.vino), cava: fmt(cavaCopas, BATEA.cava),
    chupito: llevaEntrante ? fmt(conMargen(pax), BATEA.chupito) : null,
  };
}

function calcPaella(pax, tallaManual) {
  const n = Math.max(1, Math.ceil(pax / 30));
  const talla = tallaManual && tallaManual !== "Auto"
    ? tallaManual.toLowerCase()
    : (pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande");
  return { n, talla };
}

function calcMesasServicio(pax) {
  if (pax <= 50) return { total: 7 };
  if (pax <= 100) return { total: 11 };
  return { total: 13 };
}

// Personal de sala: usa el nº de camareros importado del Excel si lo hay; si no,
// lo calcula automáticamente por pax. El ratio del sector es 1 camarero cada 10-15
// pax en banquete sentado (boda/comunión/corporativo) y 1 cada 20 en formato buffet
// más informal (cumpleaños/producción) — de ahí el divisor configurable.
function personalSala(pax, numCamareros, divisor = 20) {
  return numCamareros > 0 ? numCamareros : Math.max(2, Math.ceil(pax / divisor));
}

// Consumibles para el propio personal de sala/cocina (no para los invitados). El
// "staff" extra (cocina, producción, refuerzo...) se suma a los camareros de sala,
// porque también bebe agua y usa vasos aunque no sirva mesas.
// Los packs de vasos de cartón y plástico vienen de 50 unidades
function calcPersonal(pax, numCamareros, numStaff = 0, divisor = 20) {
  const n = personalSala(pax, numCamareros, divisor) + numStaff;
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
function calcCafe(totalPax, tipoCafetera, hayDesayuno) {
  const items = [];
  // El estándar del sector es 1-1,5 tazas/pax (una boda real de 116 invitados usó 100
  // cafés, 0,86/pax); aquí se sube a ~2,2/3,2 para cubrir varios momentos de café en
  // una boda española (sobremesa, tarta, recogida) sin llegar a triplicar lo que de
  // verdad se sirve, como pasaba con el ratio anterior (3,1/4,5, sin relación con las
  // tazas realmente calculadas más abajo: 0,6+0,4 = 1 taza/pax)
  const capsulas = Math.ceil(totalPax * (hayDesayuno ? 3.2 : 2.2));
  if (tipoCafetera === "Grande") {
    items.push(["Cafetera grande (industrial)", "1"], ["Café molido (industrial)", conSufijo(Math.max(1, Math.ceil(totalPax / 100)), "carga(s)")]);
  } else if (tipoCafetera === "Bar") {
    items.push(["Cafetera de bar", "1"], [`Cápsulas café (estándar/descafeinado) para ${totalPax} pax`, String(capsulas)], ["Cuencos para calentar leche", "2"]);
  } else {
    items.push(["Cafetera Nespresso", "1"], [`Cápsulas café (estándar/descafeinado) para ${totalPax} pax`, String(capsulas)], ["Cuencos para calentar leche", "2"]);
  }
  // Con desayuno se sirve más café por persona (todos toman, no solo parte de los pax)
  const factorLeche = hayDesayuno ? 0.9 : 0.6;
  const factorSolo  = hayDesayuno ? 0.7 : 0.4;
  items.push(
    [`Tazas café con leche e infusiones${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorLeche))],
    [`Tazas café solo y cortado${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorSolo))],
    ["Platos de café", String(conMargen(totalPax))],
    ["Infusiones (té variado + descafeinado)", conSufijo(Math.ceil(totalPax / 30), "caja")],
    ["Azucarillos y edulcorantes", conSufijo(Math.ceil(totalPax / 50), "caja")],
    [`Leches variadas (entera/desnatada/sin lactosa/avena)${hayDesayuno ? " (desayuno)" : ""}`, String(Math.max(4, Math.ceil(totalPax / (hayDesayuno ? 8 : 40))))],
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
    mesVerano, tieneBrindisCava, fuerzaTextilTela,
    tieneFrituras, numFrituras, llevaEntrante, llevaCanapes, llevaArmarioCaliente, numCamareros, numStaff = 0,
    llevaChillOut, numChillOut = 1,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoNevera, tipoCongelador, tipoPaella, origenSillas = "Dealde",
    estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
  } = opts;
  // El origen de las sillas (alquiler Dealde/Carvillo o propias) se refleja en el
  // nombre del item — el tag ALQUILER sale solo al detectar la palabra en el nombre.
  // Los cojines vienen incluidos con la silla de alquiler en bodas (no es un item
  // aparte que se pueda pedir por separado), así que se anota en el propio nombre
  // en vez de generar una línea "Cojines para sillas" suelta.
  const incluyeCojines = (origenSillas === "Dealde" || origenSillas === "Carvillo") && evtKey === "boda";
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas}${incluyeCojines ? ", con cojines" : ""})`;

  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  // Si se lleva congelador (propio o de la finca) se puede hacer/almacenar hielo in situ:
  // solo hace falta pedir taxis de hielo cuando NO se lleva ninguno.
  const hayCongelador = tipoCongelador !== "No lleva";

  const bebidas    = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, hayCongelador);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas (0 si no está activada):
  // el cóctel/aperitivo no sirve cubatas. Vino/agua/cava/chupito sí escalan con el total
  // de horas de barra libre (cóctel + copas), igual que otros caterings.
  const cristal    = calcCristaleria(pax, horasCoctel, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  const usaTela    = evtKey === "boda" || fuerzaTextilTela;
  const cats       = [];

  cats.push({ nombre: "Electricidad y camión", items: [
    ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Caja cables", "1"], ["Herramientas", "1"], ["Cinta aislante", conSufijo(1, "rollo")],
    ["Bridas", "1 bolsa"], ["Imperdibles", "1 paquete"],
    ["Carros de servicio/transporte", "2"], ["Walkies", "2"],
  ]});

  // Con canapés siempre hacen falta bandejas de plata y madera para pasarlos,
  // sea cual sea el tipo de bandeja elegido para el resto del servicio
  const bandejasMadera = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  // Mesas altas (cóctel de pie): solo hacen falta si hay barra libre/aperitivo con la gente de pie
  const mesasAltas = hayBarra ? Math.max(2, Math.ceil(pax / 15)) : 0;
  cats.push({ nombre: "Mobiliario, sala y decoración", items: [
    ["Mesas de 1,8m (total)", String(calcMesasTotal(evtKey, pax))],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax), true]),
    opt(evtKey === "boda", ["Mesa redonda especial para Tarta", "1"]),
    ["Mesa 1x1 cuadrada", "—"], ["Mesa alta", mesasAltas > 0 ? String(mesasAltas) : "—"], ["Taburetes", "—"],
    ["Marcos para menú", "—"], ["Caja deco", "—"], ["Servilleteros de madera", "—"],
    ["Guirnaldas de luces", "—"],
    ["Cajas de madera para alturas", "—"], ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPaella, ["Descansadores de paella", String(calcPaella(pax, tipoPaella).n)]),
    ["Cubo basura cocina", "2"],
    // "Nevera roja" es la propia nevera grande de la empresa, no un mueble aparte
    opt(tipoNevera !== "No lleva", [tipoNevera === "Grande" ? "Nevera roja (grande)" : `Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
  ]});

  const numPaella  = llevaPaella ? calcPaella(pax, tipoPaella).n : 0;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const bombonas   = numPaella + numFritura; // 1 bombona por paella + 1 extra si hay frituras
  const cocinaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella);
    // Difusor y trípode se comparten con las frituras (misma herramienta), se suman en vez de listar aparte
    cocinaItems.push([`Paella ${p.talla}`, String(p.n)], ["Difusores", String(p.n + numFritura)], ["Trípode", String(p.n + numFritura)], ["Paravientos", String(p.n)]);
  }
  cocinaItems.push(["Bombonas llenas", String(bombonas)], ["Cazuelas de barro", "—"], ["Cazuelas rojas", "—"], ["Gastros", "—"], ["Plancha", "—"]);
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño (con bandejas)", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Túrmix", "1"], ["Vitro eléctrica", "1"]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (tieneFrituras) {
    cocinaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Espumadera grande", String(Math.max(2, numFritura))]);
    if (!llevaPaella) cocinaItems.push(["Difusores", String(numFritura)], ["Trípode", String(numFritura)]);
  }
  if (tipoBBQ !== "no lleva") {
    cocinaItems.push([`Barbacoa ${tipoBBQ}`, String(Math.max(1, Math.ceil(pax / 60)))], ["Carbón", String(Math.max(2, Math.ceil(pax / 30)))], ["Leña", "1"], ["Pastillas de encender", "1"]);
  }
  cats.push({ nombre: "Cocina y fuego", items: cocinaItems });

  cats.push({ nombre: "Menaje y utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"], ["Aceiteras de cristal", "—"], ["Saleros y pimenteros", "6"],
    ["Ollas (mediana y grande)", "1"], ["Sartenes", "1"], ["Colador", "1"], ["Boles metálicos", "4"],
    ["Cucharones grandes", "3"], ["Pinzas largas", "2"], ["Copas metálicas", "Todas"],
    opt(llevaPaella, ["Paletas de paella", String(calcPaella(pax, tipoPaella).n)]),
  ]});

  cats.push({ nombre: "Cristalería", items: [
    [`Vasos de agua${dobleServicio ? " (doble)" : ""}`,  String(cristal.agua.u)],
    ["Vasos de cubata",                                   String(cristal.cubata.u)],
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`,  String(cristal.vino.u)],
    ["Copas de cava",                                     String(cristal.cava.u)],
    ["Copa martini", "—"], ["Vaso whiskey", "—"],
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(llevaJarrasCristal, ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica grande", "4"], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores cerveza", "2"], ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
  ]});

  cats.push({ nombre: "Mantelería y textiles", items: [
    ["Manteles beige", String(calcMesasTotal(evtKey, pax) + 2 + mesasAltas)], ["Delantales cocina y sala", String(personalSala(pax, numCamareros, 15) + 2)],
    ["Plancha de vapor (manteles)", "1"],
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas de papel (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas de papel", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
  ]});

  {/* Jamón, tarta y desayuno se sirven en plato pequeño (mismo estilo que el postre):
     se suman al recuento de "Platos postre" en vez de generar una línea aparte.
     El entrante sí se queda aparte porque suele llevar su propio plato de plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0)
    + (evtKey === "boda" ? totalPax : 0)
    + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla", items: [
    ...(!llevaCanapes ? [
      [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)],
      ["Platos hondos", "—"], ["Plato pan", "—"], ["Boles negros y blancos", "—"],
      [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)],
    ] : []),
    ["Tenedores grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
    ["Cuchillos grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
    ["Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(conMargen(totalPax))],
    ["Cucharas café", String(conMargen(totalPax * 0.8))],
    opt(entranteCompartido, [`Platos extra entrante (${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax)`, String(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante))]),
  ]});

  const personal = calcPersonal(pax, numCamareros, numStaff, 15);
  cats.push({ nombre: "Servicio y limpieza", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Bayetas y trapos de horno", "4"], ["Papel Chemine", conSufijo(2, "rollo")], ["Bolsas de basura", "10"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camarero", String(personalSala(pax, numCamareros, 15))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros, 15))],
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
  const RENDIMIENTO_BARRIL = 0.85;
  const litrosBarrilUd = tamanoBarril === "30L" ? 30 : tamanoBarril === "50L" ? 50 : 0;
  const litrosBarrilUtil = litrosBarrilUd * Math.max(1, numBarriles) * RENDIMIENTO_BARRIL;
  const litrosCervezaNecesarios = bebidas.cerveza * 0.33;
  const litrosRestantes = Math.max(0, litrosCervezaNecesarios - litrosBarrilUtil);
  // Se redondea a cajas de 24 tercios, igual que el cálculo original
  const tercerosRestantes = Math.ceil(litrosRestantes / 0.33 / 24) * 24;
  cats.push({ nombre: "Bebidas frías", items: [
    opt(litrosBarrilUd > 0, [`Barril de cerveza (${tamanoBarril})`, String(Math.max(1, numBarriles))]),
    opt(litrosBarrilUd > 0, ["Tirador de cerveza", "1"]),
    opt(tercerosRestantes > 0, ["Cerveza Alhambra (tercios)", String(tercerosRestantes)]),
    ["Vino blanco", conSufijo(bebidas.vinoBlanco, "botellas")], ["Vino tinto", conSufijo(bebidas.vinoTinto, "botellas")],
    ["Tinto de verano (1,5L)", conSufijo(bebidas.tintoVerano, "botellas")],
    ["Cava", conSufijo(bebidas.cava, "botellas")], ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15, "packs")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(bebidas.aguasPequenasCajas, "cajas (35 uds)")]),
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)], ["Aquarius", String(bebidas.aquarius)],
    ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Tónica", conSufijo(bebidas.tonica, "botellas")], ["Agua con gas", String(bebidas.aguaConGas)],
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
    dobleServicio, llevaPaella, tipoHorno, tieneFrituras, numFrituras, llevaEntrante, llevaCanapes,
    tieneBrindisCava, mesVerano, fuerzaTextilTela, tipoCafetera,
    llevaJamonero, personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir = 1,
    llevaArmarioCaliente, llevaPalomitera, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    tipoPaella, tipoNevera, tipoCongelador, origenSillas = "Dealde",
    llevaChillOut, numChillOut = 1,
  } = opts;
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas})`;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  const hayCongelador = tipoCongelador !== "No lleva";

  const bebidas = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, hayCongelador);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas: el cóctel/aperitivo no sirve cubatas
  const cristal = calcCristaleria(pax, horasCoctel, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  // Con canapés siempre hacen falta bandejas de plata y madera para pasarlos,
  // sea cual sea el tipo de bandeja elegido para el resto del servicio
  const bandejasMadera = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"], ["Cinta aislante / Bridas", "1"], ["Walkies", "2"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas totales", String(calcMesasServicio(pax).total)],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax)]),
    ["Cubos basura (reciclaje + cocina)", "2"],
    ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    opt(tipoNevera !== "No lleva", [`Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
  ]});

  const cocinaItems = [
    // 1 bombona por paella + 1 extra por cada sartén de fritura
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + numFritura)],
  ];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora / Túrmix", "1"], ["Vitro", "1"], ["Aceiteras de cristal", "—"], ["Saleros y pimenteros", "6"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella);
    // El trípode se comparte con las frituras (misma herramienta), se suma en vez de listar aparte
    cocinaItems.push([`Paella ${p.talla}`, String(p.n)], ["Trípodes", String(p.n + numFritura)], ["Descansadores paella", "2"]);
  }
  if (tieneFrituras) {
    cocinaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor pequeño (frituras)", String(numFritura)], ["Paravientos", "1"]);
    if (!llevaPaella) cocinaItems.push(["Trípodes", String(numFritura)]);
  }
  cats.push({ nombre: "Cocina y Electro", items: cocinaItems });

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín cuchillos / Tablas de corte", "1"], ["Ollas (mediana / grande)", "1"], ["Sartenes / Colador", "1"],
    ["Caja salsas / Arroces", "1"], ["Boles metálicos / Cucharones", "4"], ["Servilleteros madera", "2"],
    ["Caja cocina (varios)", "1"],
    opt(llevaPaella, ["Paletas de paella", String(calcPaella(pax, tipoPaella).n)]),
  ]});

  const usaTela = fuerzaTextilTela;
  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles beige", String(calcMesasServicio(pax).total + 1)],
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(personalSala(pax, opts.numCamareros) + 2)], ["Bayetas / Trapos", "4"],
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
    ...(!llevaCanapes ? [
      ["Platos trinchero blancos", String(platosDoble)], ["Platos metálicos", "—"], ["Platos postre", String(platosDoble + platosPostreExtra)],
    ] : []),
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))],
    ["Tenedores / Cuchillos / Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(conMargen(totalPax))],
    [`Copas cristal${dobleServicio ? " (doble)" : ""}`, String(cristal.vino.u)],
    ["Vasos cristal", String(cristal.agua.u)],
    ["Copa cava", String(cristal.cava.u)],
    ["Vaso cubata", String(cristal.cubata.u)],
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(entranteCompartido, [`Platos extra entrante (${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax)`, String(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante))]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica / Cubiteras + pinza", "2"], ["Abridores", "2"],
    ["Pinzas", "2"], ["Copas metálicas y conchas", "—"],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  const personal = calcPersonal(pax, opts.numCamareros, opts.numStaff);
  cats.push({ nombre: "Bebidas", items: [
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)],
    ["Aquarius", String(bebidas.aquarius)], ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15, "packs")],
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
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", conSufijo(2, "rollo")],
    ["Escoba, mocho, cubo y recogedor", "1"],
    ["Cajas vacías", "2"], ["Caja azul", "1"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camareros", String(personalSala(pax, opts.numCamareros))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, opts.numCamareros))],
    ["Hojas de fichaje", "1"],
  ]});

  return cats;
}

// Eventos corporativos / producciones — fiel a "Checklist de Carga – Producciones"
function buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    llevaPaella, tieneFrituras, numFrituras, tipoCafetera, dobleServicio, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, llevaJamonero, llevaAguasPequenas,
    llevaEntrante, llevaCanapes, personasPorPlatoEntrante, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoPaella, numCamareros, numStaff = 0, fuerzaTextilTela, origenSillas = "Dealde",
    llevaChillOut, numChillOut = 1,
  } = opts;
  const labelSillas = origenSillas === "Nuestras" ? "Sillas (nuestras)" : `Sillas (alquiler ${origenSillas})`;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const usaTela = fuerzaTextilTela;
  const totalPax = pax + ninos;
  const hayBarra = (horasCoctel + horasCopas) > 0;
  const personal = calcPersonal(pax, numCamareros, numStaff);
  // Con canapés siempre hacen falta bandejas de plata y madera para pasarlos,
  // sea cual sea el tipo de bandeja elegido para el resto del servicio
  const bandejasMadera = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (llevaCanapes ? Math.max(2, Math.ceil(pax / 20)) : 0)
    + (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Focos de luz / Trípodes", "—"], ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante / Bridas", "1"], ["Generador + garrafa gasolina (llena)", "1"],
    ["Producciones (rotulación/etiquetas)", "—"], ["Walkies", "2"], ["Máquina pegatinas", "1"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas", String(calcMesasServicio(pax).total)], ["Mesa redonda", "—"], ["Mesa larga", "—"],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax)]),
    ["Cubos basura (reciclaje + cocina)", "2"],
    ["Cajas de madera para alturas", "—"], ["Marcos para menú", "—"],
    ["Carpas con paredes y pesas", "—"], ["Paredes negras (plegadas)", "—"], ["Moqueta", "—"],
    ["Cestas de mimbre", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
  ]});

  cats.push({ nombre: "Cocina y sala", items: [
    ["Plancha de gas", "1"],
    // 1 bombona por paella + 1 extra por cada sartén de fritura
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + numFritura)],
    ["Horno pequeño / Microondas", "1"], ["Batidora / Túrmix", "1"], ["Mesas calientes", "—"],
    ["Vitro", "1"], ["Butano", "1"], ["Trípode", String(1 + numFritura)], ["Termos con tapa", "—"],
    ["Exprimidor", "1"], ["Sandwichera", "1"], ["Neveras playa grandes (con hielo)", "2"],
    ["Neveras playa pequeñas", "2"], ["Chafers", String(Math.max(2, Math.ceil(pax / 40)))],
    opt(llevaArmarioCaliente, ["Armario caliente (alquiler Dealde)", "1", true]),
  ]});

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín cuchillos / Tablas de corte", "1"], ["Ollas (mediana / grande)", "1"], ["Sartenes / Colador", "1"],
    opt(llevaPaella, [`Paella ${calcPaella(pax, tipoPaella).talla} / Paletas`, String(calcPaella(pax, tipoPaella).n)]),
    ["Paravientos", "—"], ["Boles metálicos / Cucharones", "4"], ["Pinzas servicio (metal/madera)", "2"],
    ["Servilleteros madera", "2"], ["Gastros", "—"], ["Caja cocina (varios)", "1"],
    ["Aceiteras de cristal", "—"], ["Saleros y pimenteros", "6"], ["Caja salsas / Arroces", "1"],
    opt(tieneFrituras, ["Sartén Parisiene (frituras)", String(numFritura)]),
    opt(tieneFrituras, ["Difusor pequeño (frituras)", String(numFritura)]),
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles negros", String(calcMesasServicio(pax).total + 1)],
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(personalSala(pax, numCamareros) + 2)], ["Bayetas / Trapos", "4"],
    ["Bandeja camareros", String(personalSala(pax, numCamareros))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros))],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla y Cubertería", items: [
    ...(!llevaCanapes ? [
      ["Platos trinchero blancos", String(platosDoble)], ["Platos postre (negro/gris)", String(platosDoble + platosPostreExtra)],
      ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ] : []),
    ["Tenedores / Cuchillos / Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(conMargen(totalPax))],
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))], ["Abridores", "2"],
    ["Champanera metálica / Cubiteras + pinza", "2"], ["Pinzas madera y metálicas", "2"],
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    opt(entranteCompartido, [`Platos extra entrante (${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax)`, String(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante))]),
  ]});

  cats.push({ nombre: "Desechables y Bebidas", items: [
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas grandes (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
    ["Bandejas de cartón blancas + blondas", conSufijo(Math.ceil(totalPax / 20), "paq.")],
    ["Platitos de cartón / Envase bocadillos", String(totalPax)],
    ["Palitos brocheta", conSufijo(Math.ceil(totalPax / 20), "paq.")], ["Palitos café", conSufijo(Math.ceil(totalPax / 30), "paq.")],
    ["Calentador de agua", "1"], ["Kit té matcha", "1"], ["Infusiones varias", conSufijo(1, "caja")],
    ["Leches variadas (sin/normal/avena)", "4"], ["Cacao y canela", conSufijo(1, "bote")], ["Leche condensada", conSufijo(1, "lata")],
    ["Vasos de cartón (L/M/S)", conSufijo(Math.ceil((totalPax + (hayDesayuno ? totalPax * 1.2 : 0)) / 50), "paq. (50 uds)")], ["Bolsas grandes de papel", conSufijo(1, "paq.")],
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    // Mismo volumen total que antes (1,5 Coca + 0,8 Fanta/Aquarius por pax), repartido
    // en cada bebida por separado en vez de en dos líneas combinadas
    ["Coca-Cola normal", String(Math.round(totalPax * 0.94))], ["Coca-Cola Zero", String(Math.round(totalPax * 0.56))],
    ["Fanta naranja", String(Math.round(totalPax * 0.24))], ["Fanta limón", String(Math.round(totalPax * 0.2))],
    ["Aquarius", String(Math.round(totalPax * 0.24))], ["Sprite", String(Math.round(totalPax * 0.12))],
    ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(Math.round(totalPax * 0.8), "packs")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(Math.max(1, Math.ceil(Math.round(totalPax * 3) / 35)), "cajas (35 uds)")]),
    ["Agua con gas", String(Math.round(totalPax * 0.15))],
    ["Hielo", `${Math.max(2, Math.ceil(totalPax / 30))} taxis`],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Limpieza y Despensa", items: [
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", conSufijo(3, "rollo")],
    ["Escoba, mocho, cubo y recogedor", "1"],
    ["Cajas vacías", "2"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
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
  dobleServicio: "Doble servicio", tamanoBarril: "Barril de cerveza", numBarriles: "Nº de barriles", llevaEntrante: "Entrante de chupito", llevaCanapes: "Lleva canapés",
  llevaPaella: "Lleva paella", tipoPaella: "Tamaño de paella",
  estiloPlatoPrincipal: "Estilo plato principal", estiloPlatoPostre: "Estilo plato postre",
  llevaArmarioCaliente: "Armario caliente", numCamareros: "Nº camareros", numStaff: "Nº staff", tipoBandejas: "Bandejas",
  tipoHorno: "Horno", tipoBBQ: "Barbacoa", mesVerano: "Mes de verano", tieneBrindisCava: "Brindis con cava",
  tieneFrituras: "Frituras", numFrituras: "Nº frituras", fuerzaTextilTela: "Servilletas de tela",
  llevaChillOut: "Chill out", numChillOut: "Nº chill out",
  llevaPalomitera: "Palomitera", llevaJarrasCristal: "Jarras de cristal", tipoCafetera: "Cafetera",
  extraBandejasMadera: "Bandejas madera extra", extraBandejasPlata: "Bandejas plata extra",
  llevaJamonero: "Jamonero", personasPorPlatoEntrante: "Personas por plato de entrante",
  entranteCompartido: "Entrante compartido", numEntrantesCompartir: "Nº de entrantes a compartir",
  llevaAguasPequenas: "Aguas pequeñas", hayDesayuno: "Desayuno",
  tipoNevera: "Nevera", tipoCongelador: "Congelador", origenSillas: "Sillas",
  logisticaEquipo: "Equipo de logística", tarifaLogistica: "Tarifa de logística", plusFurgoneta: "Plus de furgoneta",
  recogidas: "Recogidas",
  itemsManuales: "Items añadidos a mano", overridesManuales: "Cantidades editadas a mano",
  itemsOcultos: "Items quitados", nombresManuales: "Nombres corregidos", categoriasRenombradas: "Categorías renombradas",
  itemsAlquilerManual: "Items marcados como alquiler proveedor", checkeados: "Items marcados como cargados",
  vueltos: "Items marcados como vueltos", roturas: "Roturas contadas",
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
  return Math.round((h * (tarifa || 0) + (p.furgoneta ? (plusFurgo || 0) : 0)) * 100) / 100;
}

// "Juan 08:00–13:30 (5,5h · 55€) · Pedro 09:00–14:00 (5h · 70€ con furgo)"
function fmtLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return equipo
    .filter(p => p.nombre || p.inicio || p.fin)
    .map(p => {
      const h = horasLogistica(p.inicio, p.fin);
      const imp = importeLogistica(p, tarifa, plusFurgo);
      const horario = p.inicio || p.fin ? ` ${p.inicio || "?"}–${p.fin || "?"}` : "";
      const detalle = h !== null ? ` (${String(h).replace(".", ",")}h · ${String(imp).replace(".", ",")}€${p.furgoneta ? " con furgo" : ""})` : "";
      return `${p.nombre || "¿?"}${horario}${detalle}`;
    })
    .join(" · ");
}

// Total en € de todo el equipo de logística (solo personas con horario completo)
function totalLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return Math.round(equipo.reduce((acc, p) => acc + (importeLogistica(p, tarifa, plusFurgo) || 0), 0) * 100) / 100;
}

// Recogidas: alquileres/equipo de otros proveedores a devolver o recoger en fecha/hora concreta
function fmtRecogidas(recogidas = []) {
  return recogidas
    .filter(r => r.concepto)
    .map(r => {
      const fechaFmt = r.fecha ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const cuando = [fechaFmt, r.hora].filter(Boolean).join(" ");
      return cuando ? `${r.concepto} (${cuando})` : r.concepto;
    })
    .join(" · ");
}

function generarHTMLWord(evtKey, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklistCompleta, meta = {}) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  const checkeados = meta.checkeados || {};
  const vueltos = meta.vueltos || {};
  const roturas = meta.roturas || {};
  const cols = ["Concepto", "Cant.", "Sale ✓", "Vuelve ✓", "Roturas"];
  const tablaHTML = (items, catNombre) => `
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${items.map(([label, qty, , labelOriginal, esAlquilerManual, sufijo], i) => {
        const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
        const key = `${catNombre}::${labelOriginal ?? label}`;
        const sale = checkeados[key] ? "✓" : "";
        const vuelve = vueltos[key] ? "✓" : "";
        const rot = roturas[key] || "";
        return `<tr style="background:${alq ? "#fdf6e3" : i % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="padding:5px 6px;">${label}${alq ? ' <b style="color:#b45309;font-size:9pt;">[ALQUILER]</b>' : ""}</td>
          <td style="padding:5px 6px;font-weight:bold;color:#16a34a;">${fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${sale}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${vuelve}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#dc2626;">${rot}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  const secciones = checklist.map(cat => `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${cat.nombre}</h3>${tablaHTML(cat.items, cat.nombre)}`).join("");
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
      <div><span class="ml">PAX total</span>${pax + ninos} (${pax} adultos${ninos > 0 ? ` + ${ninos} niños` : ""})</div>
      <div><span class="ml">Barra libre</span>${barraCoctel ? `Cóctel ${horasCoctel}h` : "—"}${barraCopas ? ` + Copas ${horasCopas}h` : ""}</div>
    </div>
    ${secciones}
    <div class="notas"><strong>NOTAS:</strong><br/>${meta.notasEvento ? `<p style="white-space:pre-wrap;margin:6px 0;">${meta.notasEvento}</p>` : "<br/>"}</div>
    </body></html>`;
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
function SelectConOtro({ label, value, onChange, options }) {
  const [extras] = useState(() => leerExtrasGuardados(label));
  const opcionesCompletas = [...options, ...extras.filter(e => !options.includes(e))];
  const esPersonalizado = value && !opcionesCompletas.includes(value);
  const [modoOtro, setModoOtro] = useState(false);
  const [texto, setTexto] = useState(esPersonalizado ? value : "");
  if (modoOtro || esPersonalizado) {
    return (
      <div className="form-group">
        <span className="form-label">{label}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            className="form-input"
            autoFocus={modoOtro}
            placeholder="Ej: Relieve grande"
            value={modoOtro ? texto : value}
            onChange={e => { setTexto(e.target.value); onChange(e.target.value); }}
            onBlur={() => { if (!texto.trim()) setModoOtro(false); else guardarExtra(label, texto); }}
            onKeyDown={e => { if (e.key === "Enter") { guardarExtra(label, e.target.value); e.target.blur(); } }}
          />
          <button
            type="button"
            className="item-action-btn"
            title="Volver a elegir de la lista"
            onClick={() => { setModoOtro(false); setTexto(""); onChange(options[0]); }}
          >↺</button>
        </div>
      </div>
    );
  }
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      <select
        className="form-select"
        value={value}
        onChange={e => { if (e.target.value === "__otro__") { setModoOtro(true); setTexto(""); } else onChange(e.target.value); }}
      >
        {opcionesCompletas.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__otro__">+ Otro...</option>
      </select>
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
function ModalVistaPrevia({ checklist: checklistCompleta, evtKey, pax, ninos, meta = {}, onClose }) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <div className="preview-overlay" onClick={onClose}>
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
                🚚 Logística: {fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)}
                {totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) > 0 && ` — Total ${String(totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)).replace(".", ",")}€`}
              </div>
            )}
            {fmtRecogidas(meta.recogidas) && (
              <div className="preview-header-subtitle">📦 Recogidas: {fmtRecogidas(meta.recogidas)}</div>
            )}
          </div>
          <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar">✕</button>
        </div>
        <div className="preview-body">
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header">
                <span>{iconoCategoria(cat.nombre)}</span>
                <span>{cat.nombre}</span>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cant.</th>
                      <th className="preview-check-cell">Sale</th>
                      <th className="preview-check-cell">Vuelve</th>
                      <th className="preview-check-cell">Roturas</th>
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
                          <td className="preview-check-cell">{(meta.checkeados || {})[key] ? "✓" : ""}</td>
                          <td className="preview-check-cell">{(meta.vueltos || {})[key] ? "✓" : ""}</td>
                          <td className="preview-check-cell">{(meta.roturas || {})[key] || ""}</td>
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
function ModalModoCarga({ checklist: checklistCompleta, checkeados, vueltos, roturas, onToggleSale, onToggleVuelve, onRoturas, onClose, meta = {} }) {
  // Los items sin cantidad real ("—" o vacíos, a decidir in situ) no aportan nada
  // durante la carga — solo lían. Se quedan fuera aquí igual que en Word/Vista previa.
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const [modo, setModo] = useState("salida"); // salida | vuelta
  const totalItems = checklist.reduce((acc, c) => acc + c.items.length, 0);
  const marcadosMapa = modo === "salida" ? checkeados : vueltos;
  const totalMarcados = checklist.reduce((acc, c) => acc + c.items.filter(([, , , labelOriginal]) => marcadosMapa[`${c.nombre}::${labelOriginal}`]).length, 0);
  const totalRoturas = Object.values(roturas).reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);
  const pct = totalItems > 0 ? Math.round((totalMarcados / totalItems) * 100) : 0;
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal carga-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title">📦 Modo carga{meta.nombreEvento ? ` · ${meta.nombreEvento}` : ""}</div>
            <div className="preview-header-subtitle">
              {totalMarcados} de {totalItems} {modo === "salida" ? "cargados" : "vueltos"}
              {totalRoturas > 0 ? ` · ${totalRoturas} roturas` : ""}
            </div>
            <div className="carga-progreso"><div className="carga-progreso-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar modo carga" title="Cerrar">✕</button>
        </div>
        <div className="carga-modo-toggle">
          <div className="segmented-control">
            <button className={`segment-btn ${modo === "salida" ? "active" : ""}`} onClick={() => setModo("salida")}>🚚 Salida</button>
            <button className={`segment-btn ${modo === "vuelta" ? "active" : ""}`} onClick={() => setModo("vuelta")}>↩️ Vuelta</button>
          </div>
        </div>
        <div className="preview-body">
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header">
                <span>{iconoCategoria(cat.nombre)}</span>
                <span>{cat.nombre}</span>
              </div>
              <div className="carga-lista">
                {cat.items.map(([label, qty, , labelOriginal, , sufijo], i) => {
                  const key = `${cat.nombre}::${labelOriginal}`;
                  const marcado = modo === "salida" ? !!checkeados[key] : !!vueltos[key];
                  return (
                    <div className={`carga-row ${marcado ? "is-marcado" : ""}`} key={i}>
                      <label className="carga-row-principal">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => (modo === "salida" ? onToggleSale(key) : onToggleVuelve(key))}
                        />
                        <span className="carga-nombre">{label}</span>
                        <span className="carga-cantidad">{fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</span>
                      </label>
                      {modo === "vuelta" && (
                        <div className="carga-roturas">
                          <span>💥 roturas</span>
                          <input
                            type="number"
                            min="0"
                            className="carga-roturas-input"
                            value={roturas[key] || ""}
                            placeholder="0"
                            onChange={e => onRoturas(key, e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
        <div className="dialogo-titulo">🔄 Recalcular cantidades</div>
        <p className="dialogo-mensaje">
          Estas {cambios.length} cantidades automáticas han cambiado desde el último "Guardar evento"
          (seguramente por un ajuste en la app). Elige para cada una si prefieres mantener el valor de
          siempre (se fija como edición manual, no volverá a moverse solo) o usar el nuevo cálculo.
        </p>
        <div className="recalcular-lista">
          {cambios.map(c => (
            <div className="recalcular-row" key={c.key}>
              <div className="recalcular-nombre">{c.label}<span className="recalcular-categoria">{c.categoria}</span></div>
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
    padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem",
    background: "white", color: "#374151", width: "100%", cursor: "pointer",
  };

  const tituloPaso = { pegar: "Pega los items que quieras añadir", confirmar: "Revisa antes de añadir" }[paso];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: "#1f314d", color: "white", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>📋 Añadir varios items</div>
            <div style={{ opacity: 0.6, fontSize: "0.8rem", marginTop: 2 }}>{tituloPaso}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* PASO PEGAR */}
          {paso === "pegar" && (
            <>
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 14, fontSize: "0.85rem", color: "#0369a1" }}>
                ℹ️ Pega una lista de items, uno por línea. Puedes incluir la cantidad separada por tabulador, dos puntos o guion (ej. <em>"Vasos de tubo: 50"</em>); si no pones cantidad se añade con "1".
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>Items a añadir</label>
                <textarea
                  placeholder={"Vasos de tubo: 50\nManteles negros\nFocos led - 4"}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={10}
                  style={{ ...selectStyle, padding: "12px 14px", fontSize: "0.85rem", fontFamily: "monospace", cursor: "text", resize: "vertical" }}
                />
              </div>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, color: "#dc2626", fontSize: "0.85rem" }}>⚠️ {error}</div>}
              <button onClick={analizar} disabled={!texto.trim()} style={{ background: "#1f314d", color: "white", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", opacity: !texto.trim() ? 0.6 : 1 }}>
                Analizar →
              </button>
            </>
          )}

          {/* PASO CONFIRMAR: aviso previo — qué se añade, qué se omite por estar ya en la checklist */}
          {paso === "confirmar" && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, fontSize: "0.85rem", color: "#15803d" }}>
                ✓ {propuestos.length} items interpretados. Desmarca los que no quieras añadir — los ya presentes en la checklist aparecen desmarcados por defecto para no duplicar.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                {propuestos.map((p, idx) => (
                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${p.duplicado ? "#fde68a" : "#e5e7eb"}`, borderRadius: 8, background: p.duplicado ? "#fffbeb" : "white", cursor: "pointer" }}>
                    <input type="checkbox" checked={p.incluir} onChange={() => toggleIncluir(idx)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#1f314d", fontSize: "0.9rem" }}>{p.label} <span style={{ fontWeight: 700, color: "#16a34a" }}>· {p.qty}</span></div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>
                        {p.duplicado ? "⚠ Ya existe en la checklist (se omite)" : `Se añadirá a: ${p.categoria}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={() => setPaso("pegar")} style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600, color: "#374151" }}>← Atrás</button>
                <button onClick={confirmar} disabled={nInclu === 0} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", flex: 1, opacity: nInclu === 0 ? 0.6 : 1 }}>
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
function leerEstadoGuardado() {
  try {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) return { estado: JSON.parse(decodeURIComponent(c)), desdeLink: true };
    const guardado = localStorage.getItem("gula_checklist_estado");
    if (guardado) return { estado: JSON.parse(guardado), desdeLink: false };
  } catch (e) { /* link corrupto, localStorage no disponible, o JSON inválido: se ignora */ }
  return { estado: {}, desdeLink: false };
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [{ estado: estadoInicial, desdeLink: linkAbiertoInicial }] = useState(leerEstadoGuardado);
  const [evento, setEvento]         = useState(estadoInicial.evento ?? "boda");
  const [nombreEvento, setNombreEvento] = useState(estadoInicial.nombreEvento ?? "");
  const [fechaEvento, setFechaEvento]   = useState(estadoInicial.fechaEvento ?? "");
  const [horaInicio, setHoraInicio]     = useState(estadoInicial.horaInicio ?? "");
  const [ubicacion, setUbicacion]       = useState(estadoInicial.ubicacion ?? "");
  const [notasEvento, setNotasEvento]   = useState(estadoInicial.notasEvento ?? "");
  const [pax, setPax]               = useState(estadoInicial.pax ?? 80);
  const [ninos, setNinos]           = useState(estadoInicial.ninos ?? 0);
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
  const [llevaCanapes, setLlevaCanapes]               = useState(estadoInicial.llevaCanapes ?? false);
  const [llevaPaella, setLlevaPaella]                 = useState(estadoInicial.llevaPaella ?? false);
  const [tipoPaella, setTipoPaella]                   = useState(estadoInicial.tipoPaella ?? "Auto");
  const [estiloPlatoPrincipal, setEstiloPlatoPrincipal] = useState(estadoInicial.estiloPlatoPrincipal ?? "Blanco liso");
  const [estiloPlatoPostre, setEstiloPlatoPostre]       = useState(estadoInicial.estiloPlatoPostre ?? "Blanco");
  const [llevaArmarioCaliente, setLlevaArmarioCaliente] = useState(estadoInicial.llevaArmarioCaliente ?? false);
  const [numCamareros, setNumCamareros]                 = useState(estadoInicial.numCamareros ?? 0);
  // Staff extra (cocina, producción, refuerzo...) que no sirve mesas pero también
  // consume agua/vasos: se suma a los camareros para calcular esos consumibles
  const [numStaff, setNumStaff]                         = useState(estadoInicial.numStaff ?? 0);
  const [tipoBandejas, setTipoBandejas] = useState(estadoInicial.tipoBandejas ?? "Mixto");
  const [tipoHorno, setTipoHorno]       = useState(estadoInicial.tipoHorno ?? "Pequeño");
  const [tipoBBQ, setTipoBBQ]           = useState(estadoInicial.tipoBBQ ?? "No lleva");
  const [mesVerano, setMesVerano]               = useState(estadoInicial.mesVerano ?? true);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(estadoInicial.tieneBrindisCava ?? false);
  const [tieneFrituras, setTieneFrituras]       = useState(estadoInicial.tieneFrituras ?? false);
  const [numFrituras, setNumFrituras]           = useState(estadoInicial.numFrituras ?? 1);
  const [llevaChillOut, setLlevaChillOut]       = useState(estadoInicial.llevaChillOut ?? false);
  const [numChillOut, setNumChillOut]           = useState(estadoInicial.numChillOut ?? 1);
  const [fuerzaTextilTela, setFuerzaTextilTela] = useState(estadoInicial.fuerzaTextilTela ?? false);
  const [llevaPalomitera, setLlevaPalomitera]       = useState(estadoInicial.llevaPalomitera ?? false);
  const [llevaJarrasCristal, setLlevaJarrasCristal] = useState(estadoInicial.llevaJarrasCristal ?? false);
  const [tipoCafetera, setTipoCafetera]             = useState(estadoInicial.tipoCafetera ?? "Nespresso");
  const [extraBandejasMadera, setExtraBandejasMadera] = useState(estadoInicial.extraBandejasMadera ?? 0);
  const [extraBandejasPlata, setExtraBandejasPlata]   = useState(estadoInicial.extraBandejasPlata ?? 0);
  const [llevaJamonero, setLlevaJamonero]             = useState(estadoInicial.llevaJamonero ?? false);
  const [personasPorPlatoEntrante, setPersonasPorPlatoEntrante] = useState(estadoInicial.personasPorPlatoEntrante ?? 4);
  const [llevaAguasPequenas, setLlevaAguasPequenas]   = useState(estadoInicial.llevaAguasPequenas ?? false);
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
  // Categorías renombradas por el usuario: { "nombre original": "nombre nuevo" }
  const [categoriasRenombradas, setCategoriasRenombradas] = useState(estadoInicial.categoriasRenombradas ?? {});
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  const [modalPrevia, setModalPrevia]   = useState(false);
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
  const [nombresManuales, setNombresManuales] = useState(estadoInicial.nombresManuales ?? {}); // { "categoria::labelOriginal": "nombre corregido" }
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
  const [modoCarga, setModoCarga] = useState(false);
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
  const [linkAbierto, setLinkAbierto] = useState(linkAbiertoInicial ?? false);
  // Plantillas guardadas con nombre: configuración reutilizable entre eventos
  const [plantillas, setPlantillas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_plantillas")) || {}; } catch (e) { return {}; }
  });
  // Eventos guardados completos (con nombre, fecha, logística...): archivo de checklists
  // que se pueden recargar o compartir por link en cualquier momento
  const [eventosGuardados, setEventosGuardados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_eventos_guardados")) || {}; } catch (e) { return {}; }
  });
  // Historial para deshacer cambios manuales (cantidad editada o item quitado).
  // Se guarda un snapshot al EMPEZAR a editar cada item (no por cada tecla).
  const [historial, setHistorial] = useState([]);
  const ultimaClaveEditadaRef = React.useRef(null);

  // Snapshot de todo el estado configurable — lo usan tanto el link para el móvil
  // como el guardado automático en localStorage
  const getEstadoActual = () => ({
    evento, nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, pax, ninos,
    barraCoctel, horasCoctel, barraCopas, horasCopas,
    dobleServicio, tamanoBarril, numBarriles, llevaEntrante, llevaCanapes, llevaPaella, tipoPaella,
    estiloPlatoPrincipal, estiloPlatoPostre,
    llevaArmarioCaliente, numCamareros, numStaff, tipoBandejas,
    tipoHorno, tipoBBQ, mesVerano, tieneBrindisCava,
    tieneFrituras, numFrituras, fuerzaTextilTela, llevaChillOut, numChillOut,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, origenSillas, itemsManuales, overridesManuales,
    itemsOcultos, nombresManuales, categoriasRenombradas, itemsAlquilerManual, checkeados, vueltos, roturas,
    valoresCalculados, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, eventoNubeId,
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

  // ─── SINCRONIZACIÓN EN LA NUBE (si hay configuración de Firebase) ──────────
  // Referencias para distinguir nuestros propios guardados de los de otra persona
  const estadoActualJSONRef = React.useRef(estadoActualJSON);
  estadoActualJSONRef.current = estadoActualJSON;
  const ultimoGuardadoNubeRef = React.useRef(null);

  // Cada cambio local se sube a la nube con un pequeño retardo (evita subir por cada tecla)
  useEffect(() => {
    if (!nubeActiva() || !eventoNubeId) return;
    const t = setTimeout(() => {
      ultimoGuardadoNubeRef.current = estadoActualJSON;
      guardarEventoNube(eventoNubeId, getEstadoActual()).catch(() => { /* sin conexión: quedará en local */ });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON, eventoNubeId]);

  // Setters de cada campo, para poder aplicar un estado remoto SIN recargar la página
  const SETTERS_SYNC = {
    evento: setEvento, nombreEvento: setNombreEvento, fechaEvento: setFechaEvento,
    horaInicio: setHoraInicio, ubicacion: setUbicacion, notasEvento: setNotasEvento, pax: setPax, ninos: setNinos,
    barraCoctel: setBarraCoctel, horasCoctel: setHorasCoctel, barraCopas: setBarraCopas, horasCopas: setHorasCopas,
    dobleServicio: setDobleServicio, tamanoBarril: setTamanoBarril, numBarriles: setNumBarriles, llevaEntrante: setLlevaEntrante, llevaCanapes: setLlevaCanapes,
    llevaPaella: setLlevaPaella, tipoPaella: setTipoPaella,
    estiloPlatoPrincipal: setEstiloPlatoPrincipal, estiloPlatoPostre: setEstiloPlatoPostre,
    llevaArmarioCaliente: setLlevaArmarioCaliente, numCamareros: setNumCamareros, numStaff: setNumStaff, tipoBandejas: setTipoBandejas,
    tipoHorno: setTipoHorno, tipoBBQ: setTipoBBQ, mesVerano: setMesVerano, tieneBrindisCava: setTieneBrindisCava,
    tieneFrituras: setTieneFrituras, numFrituras: setNumFrituras, fuerzaTextilTela: setFuerzaTextilTela,
    llevaChillOut: setLlevaChillOut, numChillOut: setNumChillOut,
    llevaPalomitera: setLlevaPalomitera, llevaJarrasCristal: setLlevaJarrasCristal, tipoCafetera: setTipoCafetera,
    extraBandejasMadera: setExtraBandejasMadera, extraBandejasPlata: setExtraBandejasPlata, llevaJamonero: setLlevaJamonero,
    personasPorPlatoEntrante: setPersonasPorPlatoEntrante, llevaAguasPequenas: setLlevaAguasPequenas, hayDesayuno: setHayDesayuno,
    entranteCompartido: setEntranteCompartido, numEntrantesCompartir: setNumEntrantesCompartir,
    tipoNevera: setTipoNevera, tipoCongelador: setTipoCongelador, origenSillas: setOrigenSillas,
    logisticaEquipo: setLogisticaEquipo, tarifaLogistica: setTarifaLogistica, plusFurgoneta: setPlusFurgoneta, recogidas: setRecogidas,
    itemsManuales: setItemsManuales, overridesManuales: setOverridesManuales,
    itemsOcultos: setItemsOcultos, nombresManuales: setNombresManuales, categoriasRenombradas: setCategoriasRenombradas,
    itemsAlquilerManual: setItemsAlquilerManual, checkeados: setCheckeados, vueltos: setVueltos, roturas: setRoturas,
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
    const unsub = suscribirEventoNube(eventoNubeId, (remotoJSON) => {
      if (remotoJSON === estadoActualJSONRef.current || remotoJSON === ultimoGuardadoNubeRef.current) return;
      let remoto, previo;
      try { remoto = JSON.parse(remotoJSON); previo = JSON.parse(estadoActualJSONRef.current); }
      catch (e) { return; /* estado remoto corrupto: se ignora */ }
      const cambios = resumirCambios(previo, remoto);
      // Marcar ANTES de aplicar: así el guardado automático que provocará este
      // cambio de estado no se re-detecta como "cambio de otra persona"
      ultimoGuardadoNubeRef.current = remotoJSON;
      Object.entries(remoto).forEach(([k, v]) => { if (settersSyncRef.current[k]) settersSyncRef.current[k](v); });
      if (cambios.length > 0) {
        setHayCambiosRemotos(cambios);
        clearTimeout(window.__avisoSyncTimer);
        window.__avisoSyncTimer = setTimeout(() => setHayCambiosRemotos(null), 10000);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoNubeId]);

  // Si hay nombre de evento, se antepone al link copiado ("Boda Ana y Luis: https://...")
  // para poder distinguir de qué evento es al pegarlo en WhatsApp u otro chat.
  const copiarLink = (url, nombre) => {
    const texto = nombre ? `${nombre}: ${url}` : url;
    navigator.clipboard.writeText(texto).then(() => {
      setCompartirMsg("¡Link copiado! ✓");
      setTimeout(() => setCompartirMsg(""), 3000);
    }).catch(() => {
      // Sin permiso de portapapeles (o sin HTTPS): se muestra el link para copiarlo a mano
      window.prompt("No se pudo copiar automáticamente. Copia el link:", texto);
    });
  };

  const handleGenerarLink = () => {
    // Si no se ha puesto nombre de evento todavía, se usa el tipo + pax como
    // identificador de respaldo (ej. "Boda 80 pax") — así el link nunca sale pelado
    // y se puede distinguir de otros al pegarlo en WhatsApp, aunque no le hayas
    // puesto nombre aún.
    const etiquetaLink = nombreEvento || `${EVENTOS[evento]?.label} ${pax} pax`;
    if (nubeActiva()) {
      // Link corto con edición compartida: la checklist vive en la nube y los
      // cambios de cualquiera con el link se sincronizan
      const id = eventoNubeId || nuevoIdEvento();
      if (!eventoNubeId) setEventoNubeId(id);
      const estado = { ...getEstadoActual(), eventoNubeId: id };
      ultimoGuardadoNubeRef.current = JSON.stringify(estado);
      guardarEventoNube(id, estado).catch(() => { /* sin conexión */ });
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}`, etiquetaLink);
    } else {
      // Sin nube: el link lleva la checklist dentro (solo lectura/copia local)
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(estadoActualJSON)}`, etiquetaLink);
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
  const guardarEventos = (obj) => {
    setEventosGuardados(obj);
    try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(obj)); } catch (e) { /* localStorage lleno o no disponible */ }
    // Con la nube activa el archivo de eventos guardados se sincroniza: se ve igual
    // desde cualquier dispositivo, no solo en el navegador donde se guardaron
    if (nubeActiva()) {
      ultimaEscrituraLocalRef.current = Date.now();
      guardarIndiceEventosNube(obj).catch(() => { /* sin conexión: queda en local */ });
    }
  };

  useEffect(() => {
    if (!nubeActiva()) return;
    let cancelado = false;
    const aplicarSiEsMasReciente = ({ mapa, actualizado }) => {
      if (!mapa || cancelado) return;
      // Si ya hicimos una escritura local igual o más reciente, esto es un eco de
      // nuestro propio cambio (o un snapshot viejo en caché): se ignora sin más.
      if (actualizado <= ultimaEscrituraLocalRef.current) return;
      ultimaEscrituraLocalRef.current = actualizado;
      setEventosGuardados(mapa);
      try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(mapa)); } catch (e) { /* localStorage lleno o no disponible */ }
    };
    cargarIndiceEventosNube().then(aplicarSiEsMasReciente).catch(() => {});
    const unsub = suscribirIndiceEventosNube(aplicarSiEsMasReciente);
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
      guardarEventos({ ...eventosGuardados, [nombre]: { ...getEstadoActual(), valoresCalculados: valoresBaseActuales } });
      setGuardadoEventoMsg(`✓ Guardado como EVENTO: "${nombre}"`);
      setTimeout(() => setGuardadoEventoMsg(""), 3500);
    },
  });
  const handleRecalcular = () => {
    const cambios = [];
    Object.keys(valoresBaseActuales).forEach(key => {
      if (overridesManuales[key] !== undefined) return; // ya fijado a mano, no se toca ni se pregunta
      const anterior = valoresCalculados[key];
      const nuevo = valoresBaseActuales[key];
      if (anterior === undefined || anterior === nuevo) return; // nunca guardado, o sin cambios
      const [categoria, ...resto] = key.split("::");
      cambios.push({ key, categoria, label: resto.join("::"), anterior, nuevo });
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
        nuevoSnapshot[c.key] = c.anterior;
      } else {
        nuevoSnapshot[c.key] = c.nuevo;
      }
    });
    setOverridesManuales(nuevosOverrides);
    setValoresCalculados(nuevoSnapshot);
    setModalRecalcular(null);
  };
  const handleCargarEvento = (nombre) => {
    if (!eventosGuardados[nombre]) return;
    setDialogo({
      tipo: "confirm",
      titulo: `¿Abrir el evento "${nombre}"?`,
      mensaje: "Se sustituirá todo lo que hay ahora en pantalla por la checklist guardada.",
      textoConfirmar: "Abrir evento",
      onConfirm: () => {
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify(eventosGuardados[nombre])); } catch (e) { /* localStorage no disponible */ }
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
      guardarEventoNube(id, estado).catch(() => { /* sin conexión */ });
      if (!guardado.eventoNubeId) guardarEventos({ ...eventosGuardados, [nombre]: estado });
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}`, nombre);
    } else {
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(JSON.stringify(guardado))}`, nombre);
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

  const opts = {
    dobleServicio, tamanoBarril, numBarriles, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, tieneFrituras, numFrituras, llevaChillOut, numChillOut, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, llevaCanapes, llevaArmarioCaliente, numCamareros, numStaff,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, tipoPaella, origenSillas,
    estiloPlatoPrincipal, estiloPlatoPostre,
  };

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
        .map(([label, qty, idx]) => {
          const key = `${cat.nombre}::${label}`;
          // qty puede venir como { u, sufijo } (conSufijo): se separa el número editable
          // del texto fijo del envase, que se conserva aparte aunque se edite el número
          const esObjetoConSufijo = qty && typeof qty === "object";
          const valorBase = esObjetoConSufijo ? qty.u : qty;
          const sufijo = esObjetoConSufijo ? qty.sufijo : undefined;
          const cantidad = overridesManuales[key] !== undefined ? overridesManuales[key] : valorBase;
          return [nombresManuales[key] ?? label, cantidad, idx, label, !!itemsAlquilerManual[key], sufijo];
        });
    });
    // Si se ocultan todos los items de una categoría, la categoría desaparece también
    return cats.filter(c => c.items.length > 0);
  }, [baseChecklist, itemsManuales, overridesManuales, itemsOcultos, nombresManuales, categoriasRenombradas, itemsAlquilerManual]);

  // Foto del estado editable a mano, para poder deshacer cualquier cambio manual
  const snapshotHistorial = () => ({ overridesManuales, itemsManuales, itemsOcultos, nombresManuales, categoriasRenombradas, itemsAlquilerManual });
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
    // Si la cantidad cambia, el check de "Modo carga" (Sale/Vuelve, si estaba marcado)
    // deja de ser fiable — se desmarca para que se revise de nuevo. Las roturas no se
    // tocan: son un hecho ya ocurrido, no dependen de la cantidad pedida.
    setCheckeados(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setVueltos(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const handleToggleCheckCarga = (key) => setCheckeados(prev => ({ ...prev, [key]: !prev[key] }));
  const handleToggleVuelveCarga = (key) => setVueltos(prev => ({ ...prev, [key]: !prev[key] }));
  const handleRoturasCarga = (key, valor) => setRoturas(prev => {
    const next = { ...prev };
    if (!valor || valor === "0") delete next[key];
    else next[key] = valor;
    return next;
  });

  // Quita de la lista un item calculado (los manuales se borran de itemsManuales)
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
    setCategoriasRenombradas(ultimo.categoriasRenombradas);
    setItemsAlquilerManual(ultimo.itemsAlquilerManual);
    setHistorial(prev => prev.slice(0, -1));
    ultimaClaveEditadaRef.current = null;
  };

  // Renombra una categoría (botón ✎ de la cabecera). El nuevo nombre pasa a ser la
  // identidad: se migran las claves de todos los ajustes manuales de esa categoría
  // y los items añadidos a mano se mueven con ella.
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

  const filtered = useMemo(() => {
    if (!filtro.trim()) return checklist;
    const q = filtro.toLowerCase();
    return checklist.map(c => ({ ...c, items: c.items.filter(i => i[0].toLowerCase().includes(q)) })).filter(c => c.items.length > 0);
  }, [checklist, filtro]);

  const totalConceptos = checklist.reduce((acc, c) => acc + c.items.length, 0);
  const toggleCategory = (catName) => setOpenCategories(prev => ({ ...prev, [catName]: prev[catName] !== false ? false : true }));

  // Añade en bloque los items confirmados en ModalAgregarItems (ya filtrados de duplicados)
  const handleAgregarItems = (nuevos) => {
    if (nuevos.length === 0) return;
    setItemsManuales(prev => [...prev, ...nuevos.map(n => ({ label: n.label, cantidad: n.qty, categoria: n.categoria }))]);
    setAgregadosTag(`✓ ${nuevos.length} item${nuevos.length === 1 ? "" : "s"} añadido${nuevos.length === 1 ? "" : "s"}`);
    setTimeout(() => setAgregadosTag(""), 3000);
  };

  const handleDescargar = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, checkeados, vueltos, roturas });
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
    ].filter(Boolean).join(" · ");
    const notas = notasEvento ? `\n\n📝 NOTAS: ${notasEvento}` : "";
    return `${cabecera}\n${texto}${notas}`;
  };

  const handleCompartirWord = () => {
    handleDescargar();
    setMenuCompartir(false);
  };

  const handleCompartirPDF = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, checkeados, vueltos, roturas });
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

  const SegmentedControl = ({ value, onChange, options, label }) => (
    <div className="segment-group">
      <span className="segment-label">{label}</span>
      <div className="segmented-control">
        {options.map(opt => (
          <button key={opt} className={`segment-btn ${value === opt ? "active" : ""}`} onClick={() => onChange(opt)}>{opt}</button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {modalPrevia  && <ModalVistaPrevia checklist={checklist} evtKey={evento} pax={pax} ninos={ninos} meta={{ nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, checkeados, vueltos, roturas }} onClose={() => setModalPrevia(false)} />}
      {modoCarga && (
        <ModalModoCarga
          checklist={checklist}
          checkeados={checkeados}
          vueltos={vueltos}
          roturas={roturas}
          onToggleSale={handleToggleCheckCarga}
          onToggleVuelve={handleToggleVuelveCarga}
          onRoturas={handleRoturasCarga}
          meta={{ nombreEvento }}
          onClose={() => setModoCarga(false)}
        />
      )}
      {modalAgregar && <ModalAgregarItems checklist={checklist} categoriasDisponibles={categoriasDisponibles} onClose={() => setModalAgregar(false)} onConfirm={handleAgregarItems} />}
      {dialogo && <Dialogo config={dialogo} onCerrar={() => setDialogo(null)} />}
      {modalRecalcular && <ModalRecalcular cambios={modalRecalcular} onClose={() => setModalRecalcular(null)} onAplicar={handleAplicarRecalculo} />}

      <div className="app-wrapper">
        {/* HEADER */}
        <header className="app-header animate-entrance">
          <div className="header-title-group">
            <div className="header-icon">{EVENTOS[evento]?.icon || "📋"}</div>
            <div className="header-info">
              <h1>{nombreEvento || EVENTOS[evento]?.label || "Generador Checklist"}</h1>
              <p>
                {nombreEvento ? `${EVENTOS[evento]?.label} · ` : ""}{pax} pax · cóctel {barraCoctel ? horasCoctel : 0}h · {totalConceptos} conceptos
                {fechaEvento ? ` · ${new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                {horaInicio ? ` · ${horaInicio}h` : ""}
                {ubicacion ? ` · ${ubicacion}` : ""}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost" onClick={handleNuevoEvento} title="Borra la configuración guardada y empieza de cero">Nuevo evento</button>
            <button className="btn btn-outline" onClick={() => setModalPrevia(true)}>Vista previa</button>
            <button className="btn btn-outline" onClick={() => setModoCarga(true)}>📦 Modo carga</button>
            <div className="compartir-menu-wrap">
              <button className="btn btn-green" onClick={() => setMenuCompartir(v => !v)}>{compartirMsg || "Compartir"}</button>
              {menuCompartir && (
                <>
                  <div className="compartir-menu-backdrop" onClick={() => setMenuCompartir(false)} />
                  <div className="compartir-menu">
                    <button onClick={handleGenerarLink}>🔗 Link para el móvil</button>
                    <button onClick={handleCompartirWord}>📄 Word</button>
                    <button onClick={handleCompartirPDF}>🖨️ PDF</button>
                    <button onClick={handleCompartirWhatsapp}>💬 WhatsApp (texto)</button>
                    <button onClick={handleCompartirTexto}>📋 Copiar texto</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {linkAbierto && fechaEvento && fechaEvento < new Date().toISOString().slice(0, 10) && (
          <div className="archivado-banner">📦 Este evento ya pasó — checklist archivada, solo para consulta.</div>
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
            <button className="cambios-remotos-cerrar" onClick={() => setHayCambiosRemotos(null)} aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        <div className="main-layout">
        <div className="config-sidebar">

        {/* AÑADIR VARIOS ITEMS (pegando texto) */}
        <button
          className="add-material-btn animate-entrance"
          style={{
            animationDelay: "0.05s",
            background: agregadosTag ? "#f0fdf4" : "white",
            borderColor: agregadosTag ? "#bbf7d0" : undefined,
            color: agregadosTag ? "#16a34a" : undefined,
          }}
          onClick={() => setModalAgregar(true)}
        >
          <span>📋 {agregadosTag || "Añadir varios items pegando texto"}</span>
          <span style={{ fontSize: 12 }}>→</span>
        </button>

        {/* PLANTILLAS GUARDADAS */}
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.08s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Plantillas</span>
            <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarPlantilla} title="Guarda solo la configuración (pax, extras, equipamiento...) como plantilla reutilizable, SIN nombre/fecha/ubicación">💾 Guardar actual</button>
          </div>
          {guardadoPlantillaMsg && <p className="guardado-confirm">{guardadoPlantillaMsg}</p>}
          {Object.keys(plantillas).length === 0 ? (
            <p className="plantillas-vacio">Guarda configuraciones que repites (ej: "Boda estándar 100 pax") y cárgalas con un click en el próximo evento.</p>
          ) : (
            <div className="plantillas-lista">
              {Object.keys(plantillas).map(n => (
                <div className="plantilla-row" key={n}>
                  <button className="plantilla-nombre" onClick={() => handleAplicarPlantilla(n)} title={`Cargar la plantilla "${n}"`}>📁 {n}</button>
                  <button className="plantilla-borrar" onClick={() => handleBorrarPlantilla(n)} aria-label={`Borrar plantilla ${n}`} title="Borrar plantilla">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EVENTOS GUARDADOS */}
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.09s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Eventos guardados</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline btn-plantilla" onClick={handleRecalcular} title="Comprueba si alguna cantidad automática ha cambiado desde el último guardado (por un ajuste de fórmula) y deja elegir cuál usar">🔄 Recalcular</button>
              <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarEvento} title="Guarda esta checklist COMPLETA (nombre, fecha, ubicación, logística...) para reabrirla o compartir su link">💾 Guardar evento</button>
            </div>
          </div>
          {recalcularMsg && <p className="guardado-confirm">{recalcularMsg}</p>}
          {guardadoEventoMsg && <p className="guardado-confirm">{guardadoEventoMsg}</p>}
          {Object.keys(eventosGuardados).length === 0 ? (
            <p className="plantillas-vacio">Guarda la checklist de cada evento y comparte su link: quien lo abra la verá en la web, lista para hacer check desde el móvil.</p>
          ) : (
            <div className="plantillas-lista">
              {Object.keys(eventosGuardados).map(n => (
                <div className="plantilla-row" key={n}>
                  <button className="plantilla-nombre" onClick={() => handleCargarEvento(n)} title={`Abrir el evento "${n}"`}>📋 {n}</button>
                  <button className="plantilla-link" onClick={() => handleLinkEvento(n)} title="Copiar link para compartir" aria-label={`Copiar link del evento ${n}`}>🔗</button>
                  <button className="plantilla-borrar" onClick={() => handleBorrarEvento(n)} aria-label={`Borrar evento guardado ${n}`} title="Borrar evento guardado">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONFIG */}
        <div className="config-card animate-entrance" style={{ animationDelay: "0.1s" }}>
          <div className="section-title">Evento</div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">TIPO DE EVENTO</span>
              <select className="form-select" value={evento} onChange={e => setEvento(e.target.value)}>
                {Object.entries(EVENTOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <span className="form-label">PAX ADULTOS</span>
              <input type="number" className="form-input" value={pax} onChange={e => setPax(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">NIÑOS</span>
              <input type="number" className="form-input" value={ninos} onChange={e => setNinos(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">Nº CAMAREROS</span>
              <input type="number" className="form-input" placeholder="Auto" value={numCamareros || ""} onChange={e => setNumCamareros(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">Nº STAFF (cocina, otros)</span>
              <input type="number" className="form-input" placeholder="0" value={numStaff || ""} onChange={e => setNumStaff(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">NOMBRE DEL EVENTO</span>
              <input type="text" className="form-input" placeholder="Ej: Boda de Ana y Luis" value={nombreEvento} onChange={e => setNombreEvento(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">FECHA</span>
              <input type="date" className="form-input" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">HORA DE INICIO</span>
              <input type="time" className="form-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">UBICACIÓN</span>
              <input type="text" className="form-input" placeholder="Ej: Finca La Alquería" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
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
            <span className="form-label">EQUIPO DE LOGÍSTICA (cada uno con su horario)</span>
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
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, inicio: e.target.value } : x))}
                  />
                  <span className="logistica-sep">–</span>
                  <input
                    type="time"
                    className="form-input logistica-hora"
                    value={p.fin}
                    title="Hora de fin"
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, fin: e.target.value } : x))}
                  />
                  <label className="logistica-furgo" title="Plus por llevar furgoneta">
                    <input
                      type="checkbox"
                      checked={p.furgoneta || false}
                      onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, furgoneta: e.target.checked } : x))}
                    />
                    🚐
                  </label>
                  {horas !== null && (
                    <span className="logistica-info">{String(horas).replace(".", ",")}h · <strong>{String(importe).replace(".", ",")}€</strong></span>
                  )}
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setLogisticaEquipo(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar persona"
                    aria-label={`Quitar ${p.nombre || "persona"} de logística`}
                  >✕</button>
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
          <div className="logistica-block">
            <span className="form-label">RECOGIDAS (alquileres/equipo de otros a devolver o recoger)</span>
            {recogidas.map((r, i) => (
              <div className="logistica-row" key={i}>
                <input
                  type="text"
                  className="form-input logistica-nombre"
                  placeholder="Ej: Camión plataforma (Albácar)"
                  value={r.concepto}
                  onChange={e => setRecogidas(prev => prev.map((x, idx) => idx === i ? { ...x, concepto: e.target.value } : x))}
                />
                <input
                  type="date"
                  className="form-input logistica-hora"
                  value={r.fecha}
                  title="Fecha de recogida"
                  onChange={e => setRecogidas(prev => prev.map((x, idx) => idx === i ? { ...x, fecha: e.target.value } : x))}
                />
                <input
                  type="time"
                  className="form-input logistica-hora"
                  value={r.hora}
                  title="Hora de recogida"
                  onChange={e => setRecogidas(prev => prev.map((x, idx) => idx === i ? { ...x, hora: e.target.value } : x))}
                />
                <button
                  className="item-action-btn item-action-borrar"
                  onClick={() => setRecogidas(prev => prev.filter((_, idx) => idx !== i))}
                  title="Quitar recogida"
                  aria-label={`Quitar recogida ${r.concepto || ""}`}
                >✕</button>
              </div>
            ))}
            <button
              className="btn-add-logistica"
              onClick={() => setRecogidas(prev => [...prev, { concepto: "", fecha: "", hora: "" }])}
            >+ Añadir recogida</button>
          </div>
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
          {evento !== "produccion" && evento !== "cumpleanos" && (
            <div className="form-row" style={{ marginTop: 12, alignItems: "flex-end" }}>
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
              [llevaCanapes,         setLlevaCanapes,         "Lleva canapés",            "bandejas en vez de platos"],
              [llevaPaella,          setLlevaPaella,          "Lleva paella",             "calcula paelleros completos"],
              [llevaArmarioCaliente, setLlevaArmarioCaliente, "Armario caliente",         "alquiler Dealde"],
              [tieneFrituras,        setTieneFrituras,        "Hay frituras",             tieneFrituras ? `${numFrituras} sartén parisiene (ajusta abajo)` : "sartén parisiene"],
              ...(evento !== "produccion"
                ? [[tieneBrindisCava, setTieneBrindisCava, "Brindis con cava", "dobla copas de cava"]]
                : []),
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de palomitera propio"],
              [llevaChillOut,        setLlevaChillOut,        "Lleva chill out",          llevaChillOut ? `${numChillOut} (ajusta abajo)` : "sofás/zona chill out"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              [llevaAguasPequenas,   setLlevaAguasPequenas,   "Aguas pequeñas",           "botellas individuales 33cl"],
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
          {(entranteCompartido || llevaPaella || tieneFrituras || llevaChillOut) && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              {entranteCompartido && (
                <>
                  <SegmentedControl label="Se comparte cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
                  <div className="form-group controls-mini">
                    <span className="form-label">Nº de entrantes a compartir</span>
                    <input type="number" className="form-input" value={numEntrantesCompartir} min="1" onChange={e => setNumEntrantesCompartir(Math.max(1, parseInt(e.target.value) || 1))} />
                  </div>
                </>
              )}
              {llevaPaella && (
                <SegmentedControl label="Tamaño de paella" value={tipoPaella} onChange={setTipoPaella} options={["Auto", "Pequeña", "Mediana", "Grande"]} />
              )}
              {tieneFrituras && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº sartenes parisiene (frituras)</span>
                  <input type="number" className="form-input" value={numFrituras} min="1" onChange={e => setNumFrituras(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Ajusta bombonas, difusor, trípode y espumadera</span>
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
            <SegmentedControl label="Sillas" value={origenSillas} onChange={setOrigenSillas} options={["Dealde", "Carvillo", "Nuestras", "No llevan"]} />
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
            <SegmentedControl label="Horno" value={tipoHorno} onChange={setTipoHorno} options={["Pequeño", "Grande", "Ambos"]} />
            <SegmentedControl label="Cafetera" value={tipoCafetera} onChange={setTipoCafetera} options={["Nespresso", "Bar", "Grande"]} />
            {evento !== "cumpleanos" && evento !== "produccion" && (
              <>
                <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
                <div className="equip-pareja">
                  <SelectConOtro label="Estilo plato principal" value={estiloPlatoPrincipal} onChange={setEstiloPlatoPrincipal} options={["Blanco liso", "Relieve blanco", "Verde", "Metálico"]} />
                  <SelectConOtro label="Estilo plato postre" value={estiloPlatoPostre} onChange={setEstiloPlatoPostre} options={["Blanco", "Verde"]} />
                </div>
              </>
            )}
          </div>
        </div>

        </div>
        <div className="checklist-main">

        {/* BUSCADOR + DESHACER */}
        <div className="animate-entrance search-row" style={{ animationDelay: "0.2s" }}>
          <input type="text" className="search-input-main" placeholder="Buscar un material..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          {historial.length > 0 && (
            <button className="btn btn-outline btn-deshacer" onClick={handleDeshacer} title="Deshace el último cambio manual (cantidad editada o item quitado)">↩ Deshacer</button>
          )}
        </div>

        {/* AÑADIR ITEM PERSONALIZADO */}
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
            <div className="form-group" style={{ flex: 2 }}>
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
                <option value="__nueva__">➕ Nueva categoría…</option>
              </select>
            </div>
            <label className="add-item-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
              <input type="checkbox" checked={nuevoItemAlquiler} onChange={e => setNuevoItemAlquiler(e.target.checked)} />
              🏷 Alquiler proveedor
            </label>
            <button className="btn btn-navy-outline add-item-btn" onClick={handleAddItemManual} disabled={!nuevoItemLabel.trim()}>+ Añadir</button>
          </div>
        </div>

        {/* CATEGORÍAS */}
        {filtered.map((cat, idx) => {
          const isOpen = openCategories[cat.nombre] !== false;
          const infoCat = infoCategoria(cat.nombre);
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s`, borderTopColor: infoCat.color, borderTopWidth: 3 }}>
              <div className="category-header" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggleCategory(cat.nombre)} onKeyDown={e => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && toggleCategory(cat.nombre)}>
                <span className="cat-name"><span className="cat-icon" style={{ background: infoCat.color, color: infoCat.texto }}>{infoCat.icono}</span>{cat.nombre}</span>
                <span className="cat-count">
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleRenombrarCategoria(cat.nombre); }} title="Renombrar categoría" aria-label={`Renombrar categoría ${cat.nombre}`}>✎</button>
                  {cat.items.length}<span className="arrow">▼</span>
                </span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty, manualIdx, labelOriginal, esAlquilerManual, sufijo], i) => {
                    const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                    const displayQty = String(qty && qty.u ? qty.u : qty);
                    const keyId = `${cat.nombre}::${labelOriginal ?? label}`;
                    const editado = overridesManuales[keyId] !== undefined;
                    const renombrado = manualIdx === undefined && nombresManuales[keyId] !== undefined;
                    const esItemManual = manualIdx !== undefined;
                    // Nº de bateas recalculado siempre en vivo a partir de lo que se esté
                    // mostrando (aunque la cantidad se edite a mano), no de un texto fijado
                    const bateaSize = bateaSizeDe(label);
                    const bateaCount = bateaSize ? Math.ceil((parseFloat(displayQty.replace(",", ".")) || 0) / bateaSize) : null;
                    // Igual que las bateas, pero para bebidas que se piden en cajas (cerveza,
                    // vino, refrescos): recalculado en vivo a partir de la cantidad mostrada
                    const cajaSize = bateaSize ? null : cajaSizeDe(label);
                    const cajaCount = cajaSize ? Math.ceil((parseFloat(displayQty.replace(",", ".")) || 0) / cajaSize) : null;
                    return (
                      <div key={i} className={`item-row ${alq ? "is-alquiler" : ""}`}>
                        {editandoNombre === keyId ? (
                          <div className="item-edit-row">
                            <input
                              type="text"
                              className="item-name-input"
                              value={nombreTemporal}
                              autoFocus
                              onChange={e => setNombreTemporal(e.target.value)}
                              onBlur={() => handleConfirmarEdicionItem(cat.nombre, labelOriginal ?? label, manualIdx, label, nombreTemporal, alquilerTemporal)}
                              onKeyDown={e => {
                                if (e.key === "Enter") e.target.blur();
                                if (e.key === "Escape") { setNombreTemporal(label); setAlquilerTemporal(esAlquilerManual); e.target.blur(); }
                              }}
                            />
                            <label className="item-edit-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
                              <input
                                type="checkbox"
                                checked={alquilerTemporal}
                                onMouseDown={e => e.preventDefault()}
                                onChange={e => setAlquilerTemporal(e.target.checked)}
                              />
                              🏷 Alquiler
                            </label>
                          </div>
                        ) : (
                          <div className="item-name">
                            {label}
                            {alq && <span className="tag-alquiler">ALQUILER</span>}
                            {(editado || renombrado) && <span title={renombrado ? "Nombre corregido a mano" : "Cantidad editada a mano"} style={{ color: "#9ca3af", fontSize: "0.7rem" }}>✎</span>}
                          </div>
                        )}
                        <input
                          type="text"
                          className="item-qty-input"
                          value={displayQty}
                          title="Click para editar la cantidad"
                          onChange={e => {
                            handleEditarCantidad(cat.nombre, labelOriginal ?? label, e.target.value);
                            // Parpadeo verde de confirmación: se reinicia la animación en cada tecla
                            e.target.classList.remove("qty-flash");
                            void e.target.offsetWidth;
                            e.target.classList.add("qty-flash");
                          }}
                          onAnimationEnd={e => e.target.classList.remove("qty-flash")}
                          onFocus={e => e.target.select()}
                          size={Math.max(2, displayQty.length)}
                        />
                        {bateaCount !== null ? (
                          <span className="item-batea-info" title="Bateas recalculadas automáticamente según la cantidad">{bateaCount} bateas de {bateaSize}</span>
                        ) : cajaCount !== null ? (
                          <span className="item-batea-info" title="Cajas recalculadas automáticamente según la cantidad">{cajaCount} cajas de {cajaSize}</span>
                        ) : sufijo ? (
                          <span className="item-batea-info" title="Envase fijo: no cambia aunque edites la cantidad">{sufijo}</span>
                        ) : null}
                        <div className="item-actions">
                          <button
                            className="item-action-btn"
                            onClick={() => { setEditandoNombre(keyId); setNombreTemporal(label); setAlquilerTemporal(esAlquilerManual); }}
                            title="Editar el nombre / marcar alquiler proveedor"
                            aria-label={`Editar ${label}`}
                          >✎</button>
                          <button
                            className="item-action-btn item-action-borrar"
                            onClick={() => esItemManual ? handleRemoveItemManual(manualIdx) : handleOcultarItem(cat.nombre, labelOriginal ?? label)}
                            title="Quitar de la lista"
                            aria-label={`Quitar ${label}`}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
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
