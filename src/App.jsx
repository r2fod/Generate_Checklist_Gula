import React, { useState, useMemo, useEffect } from "react";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const BATEA = { vino: 25, cava: 36, agua: 25, cubata: 25, chupito: 49 };
const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];
const CATEGORIA_MANUAL = "Otros (añadidos manualmente)";

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
  const cerveza = Math.round((pax * cervezaFactor * barFactor) / 24) * 24;
  const vinoTotal = Math.round(pax * 0.55);
  const ratioBlanco = mesVerano ? 0.70 : 0.45;
  const vinoBlanco = Math.round(vinoTotal * ratioBlanco);
  const vinoTinto = vinoTotal - vinoBlanco;
  const cava = Math.round(pax * 0.2);
  const refrescoTotal = Math.round(pax * 2.5 * barFactor);
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
  return {
    cerveza, vinoBlanco, vinoTinto, cava, tonica, agua15, redbull,
    aguasPequenasCajas, aguasPequenasUds,
    cocaNormal: Math.round(refrescoTotal * 0.25),
    cocaZero:   Math.round(refrescoTotal * 0.20),
    fanta:      Math.round(refrescoTotal * 0.25),
    sprite:     Math.round(refrescoTotal * 0.1),
    nestea:     Math.round(refrescoTotal * 0.05),
    aguaConGas: Math.round(pax * 0.15),
    cerveza00:  Math.round(pax * 0.15),
    sinGluten:  Math.round(pax * 0.2),
    taxisHielo,
  };
}

function calcDestilados(pax, h) {
  const f = h / 4;
  const r = (base) => Math.max(1, Math.round(base * f));
  return {
    ginebraPremium: r(pax / 25), ginebraSabor: r(pax / 35), ron: r(pax / 30),
    ronBlanco: r(pax / 50), tequila: r(pax / 45), tequilaSabor: r(pax / 40),
    vodka: r(pax / 40), vermutRojo: r(pax / 40), vermutBlanco: r(pax / 55),
    mistela: 2, baileys: 1, tiaMaria: 1, limoncello: 1, jagger: 1, peach: 1,
    cremaOrujo: 1, cazalla: 1, orujoHierbas: 1, marcaBlanca: 1,
  };
}

function calcCristaleria(pax, h, dobleCopa, tieneBrindisCava, llevaEntrante, extraAguaDesayuno = 0) {
  // 1 cubata/hora y pax (mínimo 1 si hay barra), sin techo artificial antes de las 4-5h:
  // una barra libre de 8h debe servir notablemente más que una de 2h, no lo mismo.
  const copasBarraPorPax = h > 0 ? Math.min(8, 1 + h) : 0;
  const mult = dobleCopa ? 2 : 1;
  const vino = Math.round(pax * 2.5 * mult);
  const agua = Math.round(pax * 1.5 * mult) + extraAguaDesayuno;
  const cubata = Math.round(pax * copasBarraPorPax);
  const cavaCopas = Math.round(pax * (tieneBrindisCava ? 2.0 : 1.0));
  const fmt = (u, size) => ({ u: Math.ceil(u / size) * size, b: bateas(u, size), size });
  return {
    agua: fmt(agua, BATEA.agua), cubata: fmt(cubata, BATEA.cubata),
    vino: fmt(vino, BATEA.vino), cava: fmt(cavaCopas, BATEA.cava),
    chupito: llevaEntrante ? fmt(pax, BATEA.chupito) : null,
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

// Personal de sala: usa el nº de camareros importado del Excel si lo hay,
// si no lo calcula automáticamente por pax (1 camarero cada 20 pax aprox.)
function personalSala(pax, numCamareros) {
  return numCamareros > 0 ? numCamareros : Math.max(2, Math.ceil(pax / 20));
}

// Consumibles para el propio personal de sala/cocina (no para los invitados)
// Los packs de vasos de cartón y plástico vienen de 50 unidades
function calcPersonal(pax, numCamareros) {
  const n = personalSala(pax, numCamareros);
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
  if (tipoCafetera === "Grande") {
    items.push(["Cafetera grande (industrial)", "1"], ["Café molido (industrial)", `${Math.max(1, Math.ceil(totalPax / 100))} carga(s)`]);
  } else if (tipoCafetera === "Bar") {
    items.push(["Cafetera de bar", "1"], [`Cápsulas café (estándar/descafeinado) para ${totalPax} pax`, String(Math.ceil(totalPax * (hayDesayuno ? 2.2 : 1.5)))], ["Cuencos para calentar leche", "2"]);
  } else {
    items.push(["Cafetera Nespresso", "1"], [`Cápsulas café (estándar/descafeinado) para ${totalPax} pax`, String(Math.ceil(totalPax * (hayDesayuno ? 2.2 : 1.5)))], ["Cuencos para calentar leche", "2"]);
  }
  // Con desayuno se sirve más café por persona (todos toman, no solo parte de los pax)
  const factorLeche = hayDesayuno ? 0.9 : 0.6;
  const factorSolo  = hayDesayuno ? 0.7 : 0.4;
  items.push(
    [`Tazas café con leche e infusiones${hayDesayuno ? " (desayuno)" : ""}`, String(Math.round(totalPax * factorLeche))],
    [`Tazas café solo y cortado${hayDesayuno ? " (desayuno)" : ""}`, String(Math.round(totalPax * factorSolo))],
    ["Platos de café", String(totalPax)],
    ["Infusiones (té variado + descafeinado)", `${Math.ceil(totalPax / 30)} caja`],
    ["Azucarillos y edulcorantes", `${Math.ceil(totalPax / 50)} caja`],
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
    dobleServicio, llevaPaella, tipoBandejas, tipoBBQ, tipoHorno,
    mesVerano, tieneBrindisCava, fuerzaTextilTela,
    tieneFrituras, numFrituras, llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    tipoNevera, tipoCongelador, tipoPaella,
    estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
  } = opts;

  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  // Si se lleva congelador (propio o de la finca) se puede hacer/almacenar hielo in situ:
  // solo hace falta pedir taxis de hielo cuando NO se lleva ninguno.
  const hayCongelador = tipoCongelador !== "No lleva";

  const bebidas    = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, hayCongelador);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata dependen de las horas reales de barra libre (0 si no hay barra);
  // vino/agua/cava/chupito no dependen de esto, se calculan igual para el servicio de mesa.
  const cristal    = calcCristaleria(pax, horasBarraTotal, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  const usaTela    = evtKey === "boda" || fuerzaTextilTela;
  const cats       = [];

  cats.push({ nombre: "Electricidad y camión", items: [
    ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"], ["Cinta aislante", "1"],
    ["Bridas", "1 bolsa"], ["Rulos cable", "2"], ["Imperdibles", "1 paquete"],
    ["Carros de servicio/transporte", "2"],
  ]});

  const bandejasMadera = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  cats.push({ nombre: "Mobiliario, sala y decoración", items: [
    ["Mesas de 1,8m (total)", String(calcMesasTotal(evtKey, pax))],
    ["Sillas (alquiler)", String(totalPax), true],
    ...(evtKey === "boda" ? [["Mesa redonda especial para Tarta", "1"]] : []),
    ["Mesa 1x1 cuadrada", "—"], ["Mesa alta", "—"], ["Taburetes", "—"],
    ["Marcos para menú", "—"], ["Caja deco", "—"], ["Servilleteros de madera", "—"],
    ["Cajas de madera para alturas", "—"],
    ...(llevaPaella ? [["Descansadores de paella", String(calcPaella(pax, tipoPaella).n)]] : []),
    ["Cubo basura cocina", "2"], ["Champanera metálica grande", "4"],
    ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores cerveza", "2"],
    ["Bandeja camarero", String(personalSala(pax, numCamareros))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros))],
    ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
    // "Nevera roja" es la propia nevera grande de la empresa, no un mueble aparte
    ...(tipoNevera !== "No lleva" ? [[tipoNevera === "Grande" ? "Nevera roja (grande)" : `Nevera (${tipoNevera})`, "1"]] : []),
    ...(hayCongelador ? [[`Congelador (${tipoCongelador})`, "1"]] : []),
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),

    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
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
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande (Alquiler Dealde)", "1", true]);
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
    ...(llevaPaella ? [["Paletas de paella", String(calcPaella(pax, tipoPaella).n)]] : []),
  ]});

  cats.push({ nombre: "Cristalería", items: [
    [`Vasos de agua${dobleServicio ? " (doble)" : ""}`,  `${cristal.agua.u} (${cristal.agua.b} bateas de ${cristal.agua.size})`],
    ["Vasos de cubata",                                   `${cristal.cubata.u} (${cristal.cubata.b} bateas de ${cristal.cubata.size})`],
    ...(hayBarra ? [["Vasos de chupito de plástico (barra libre)", `${Math.max(1, Math.ceil(pax * 1.5 / 80))} paq. (80 uds)`]] : []),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`,  `${cristal.vino.u} (${cristal.vino.b} bateas de ${cristal.vino.size})`],
    ["Copas de cava",                                     `${cristal.cava.u} (${cristal.cava.b} bateas de ${cristal.cava.size})`],
    ["Copa martini", "—"], ["Vaso whiskey", "—"],
    ...(cristal.chupito ? [["Vasos chupito cristal (entrante)", `${cristal.chupito.u} (${cristal.chupito.b} bateas de ${cristal.chupito.size})`]] : []),
    ...(llevaJarrasCristal ? [["Jarras de cristal", String(Math.max(2, Math.ceil(totalPax / 8)))]] : []),
  ]});

  cats.push({ nombre: "Mantelería y textiles", items: [
    ["Manteles beige", String(calcMesasTotal(evtKey, pax) + 2)], ["Delantales cocina y sala", String(personalSala(pax, numCamareros) + 2)],
    [usaTela ? "Servilletas de tela" : "Servilletas de papel", usaTela ? String(totalPax) : `${Math.ceil(totalPax * 6 / 50)} paq. (50)`],
    ["Servilletas cocktail", `${Math.ceil(totalPax * 2 / 100)} paq. (100)`],
  ]});

  {/* Jamón, tarta y desayuno se sirven en plato pequeño (mismo estilo que el postre):
     se suman al recuento de "Platos postre" en vez de generar una línea aparte.
     El entrante sí se queda aparte porque suele llevar su propio plato de plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0)
    + (evtKey === "boda" ? totalPax : 0)
    + (hayDesayuno ? totalPax : 0);
  cats.push({ nombre: "Vajilla", items: [
    [`Platos trinchero (${estiloPlatoPrincipal})`, String(totalPax * (dobleServicio ? 2 : 1))],
    ["Platos hondos", "—"], ["Plato pan", "—"], ["Boles negros y blancos", "—"],
    [`Platos postre (${estiloPlatoPostre})`, String(totalPax + platosPostreExtra)],
    ["Tenedores grandes", String(totalPax * (dobleServicio ? 2 : 1) + (hayDesayuno ? totalPax : 0))],
    ["Cuchillos grandes", String(totalPax * (dobleServicio ? 2 : 1) + (hayDesayuno ? totalPax : 0))],
    ["Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1) + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(totalPax)],
    ["Cucharas café", String(Math.round(totalPax * 0.8))],
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
  ]});

  const personal = calcPersonal(pax, numCamareros);
  cats.push({ nombre: "Servicio y limpieza", items: [
    ["Fairy", "1"], ["Estropajo", "1"], ["Papel plata", "1"], ["Film", "1"],
    ["Bayetas y trapos de horno", "4"], ["Papel Chemine", "2"], ["Bolsas de basura", "10"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", `${personal.vasosCartonPacks} packs (50 uds)`],
    ["Agua Vidaqua 1,5L (personal)", `${personal.aguaVidaquaPacks} packs (6 uds)`],
    ["Vasos de plástico (personal)", `${personal.vasosPlasticoPacks} packs (50 uds)`],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Bebidas frías", items: [
    ["Cerveza Alhambra (tercios)", String(bebidas.cerveza)],
    ["Vino blanco", `${bebidas.vinoBlanco} botellas`], ["Vino tinto", `${bebidas.vinoTinto} botellas`],
    ["Cava", `${bebidas.cava} botellas`], ["Agua 1,5L (Solán de Cabras, cliente)", `${bebidas.agua15} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33cl)", `${bebidas.aguasPequenasCajas} cajas (35 uds)`]] : []),
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta / Aquarius", String(bebidas.fanta)], ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Tónica", `${bebidas.tonica} botellas`], ["Agua con gas", String(bebidas.aguaConGas)],
    ["Cerveza 0,0", String(bebidas.cerveza00)], ["Cerveza sin gluten", String(bebidas.sinGluten)],
    ["Hielo", hayCongelador ? "No hace falta (se lleva congelador)" : `${bebidas.taxisHielo} taxis`],
    ...(hayBarra ? [["Redbull", String(bebidas.redbull)]] : []),
  ]});

  if (destilados) {
    cats.push({ nombre: "Alcoholes y licores", items: [
      ["Ginebra (Seagrams/Tanqueray)", String(destilados.ginebraPremium)],
      ["Ginebra de sabor (Puerto de Indias)", String(destilados.ginebraSabor)],
      ["Ron (Bacardí)", String(destilados.ron)], ["Ron saborizado (Negrita)", String(destilados.ronBlanco)],
      ["Tequila", String(destilados.tequila)], ["Tequila Rosa", String(destilados.tequilaSabor)],
      ["Vodka", String(destilados.vodka)], ["Vermut rojo", String(destilados.vermutRojo)], ["Vermut blanco", String(destilados.vermutBlanco)],
      ["Mistela", String(destilados.mistela)], ["Baileys", String(destilados.baileys)],
      ["Tía María", String(destilados.tiaMaria)], ["Limoncello", String(destilados.limoncello)],
      ["Jagger (Jägermeister)", String(destilados.jagger)], ["Peche (licor de melocotón)", String(destilados.peach)],
      ["Crema de orujo", String(destilados.cremaOrujo)], ["Cazalla", String(destilados.cazalla)],
      ["Orujo de hierbas", String(destilados.orujoHierbas)],
      ["Ballantines", "1"], ["Barceló", "1"], ["Martini", "1"], ["Crema de arroz", "1"],
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
    dobleServicio, llevaPaella, tipoHorno, tieneFrituras, numFrituras, llevaEntrante,
    tieneBrindisCava, mesVerano, fuerzaTextilTela, tipoCafetera,
    llevaJamonero, personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    tipoPaella, tipoNevera, tipoCongelador,
  } = opts;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  const hayCongelador = tipoCongelador !== "No lleva";

  const bebidas = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, hayCongelador);
  const cristal = calcCristaleria(pax, horasBarraTotal, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  const bandejasMadera = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"], ["Cinta aislante / Bridas / Rulos", "1"], ["Walkies", "2"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas totales", String(calcMesasServicio(pax).total)],
    ["Sillas", String(totalPax)],
    ["Cubos basura (reciclaje + cocina)", "2"],
    ["Champanera metálica / Cubiteras + pinza", "2"],
    ["Abridores", "2"],
    ["Bandeja camareros", String(personalSala(pax, opts.numCamareros))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, opts.numCamareros))],
    ["Pinzas", "2"], ["Copas metálicas y conchas", "—"],
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),
    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
    ...(tipoNevera !== "No lleva" ? [[`Nevera (${tipoNevera})`, "1"]] : []),
    ...(hayCongelador ? [[`Congelador (${tipoCongelador})`, "1"]] : []),
  ]});

  const cocinaItems = [
    // 1 bombona por paella + 1 extra por cada sartén de fritura
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + numFritura)],
  ];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande (Alquiler Dealde)", "1", true]);
  cocinaItems.push(["Microondas", "1"], ["Batidora / Túrmix", "1"], ["Vitro", "1"], ["Aceiteras / Saleros / Pimenteros", "1/2 de cada"]);
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
    ...(llevaPaella ? [["Paletas de paella", String(calcPaella(pax, tipoPaella).n)]] : []),
  ]});

  const usaTela = fuerzaTextilTela;
  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles beige", String(calcMesasServicio(pax).total + 1)],
    ["Delantales", String(personalSala(pax, opts.numCamareros) + 2)], ["Bayetas / Trapos", "4"],
    [usaTela ? "Servilletas de tela" : "Servilletas (grandes / cocktail)", usaTela ? String(totalPax) : `${Math.ceil(totalPax * 7 / 50)} paq. (50)`],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + (hayDesayuno ? totalPax : 0);
  cats.push({ nombre: "Vajilla, Cubertería y Cristalería", items: [
    ["Platos trinchero blancos", String(totalPax * (dobleServicio ? 2 : 1))], ["Platos metálicos", "—"], ["Platos postre", String(totalPax + platosPostreExtra)],
    ["Jarras de cristal", String(Math.max(2, Math.ceil(totalPax / 8)))],
    ["Tenedores / Cuchillos / Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1) + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(totalPax)],
    [`Copas cristal${dobleServicio ? " (doble)" : ""}`, `${cristal.vino.u} (${cristal.vino.b} bateas de ${cristal.vino.size})`],
    ["Vasos cristal", `${cristal.agua.u} (${cristal.agua.b} bateas de ${cristal.agua.size})`],
    ["Copa cava", `${cristal.cava.u} (${cristal.cava.b} bateas de ${cristal.cava.size})`],
    ["Vaso cubata", `${cristal.cubata.u} (${cristal.cubata.b} bateas de ${cristal.cubata.size})`],
    ...(hayBarra ? [["Vasos de chupito de plástico (barra libre)", `${Math.max(1, Math.ceil(pax * 1.5 / 80))} paq. (80 uds)`]] : []),
    ...(cristal.chupito ? [["Chupito (entrante)", `${cristal.chupito.u} (${cristal.chupito.b} bateas de ${cristal.chupito.size})`]] : []),
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Bebidas", items: [
    ["Coca Cola (Normal / Zero)", String(bebidas.cocaNormal + bebidas.cocaZero)],
    ["Fanta (Limón / Naranja / Aquarius / Nestea)", String(bebidas.fanta + bebidas.nestea)],
    ["Agua 1,5L (Solán de Cabras, cliente)", `${bebidas.agua15} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33cl)", `${bebidas.aguasPequenasCajas} cajas (35 uds)`]] : []),
    ["Agua con gas", String(bebidas.aguaConGas)],
    ...(hayBarra ? [["Alcohol (barra libre)", "Ver Alcoholes"]] : []),
    ["Hielo", hayCongelador ? "No hace falta (se lleva congelador)" : `${bebidas.taxisHielo} taxis`],
  ]});

  const personal = calcPersonal(pax, opts.numCamareros);
  cats.push({ nombre: "Limpieza", items: [
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", "2"],
    ["Cajas vacías", "2"], ["Caja azul", "1"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", `${personal.vasosCartonPacks} packs (50 uds)`],
    ["Agua Vidaqua 1,5L (personal)", `${personal.aguaVidaquaPacks} packs (6 uds)`],
    ["Vasos de plástico (personal)", `${personal.vasosPlasticoPacks} packs (50 uds)`],
  ]});

  return cats;
}

// Eventos corporativos / producciones — fiel a "Checklist de Carga – Producciones"
function buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    llevaPaella, tieneFrituras, numFrituras, tipoCafetera, dobleServicio, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, llevaJamonero, llevaAguasPequenas,
    llevaEntrante, personasPorPlatoEntrante, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    tipoPaella, numCamareros,
  } = opts;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const totalPax = pax + ninos;
  const hayBarra = (horasCoctel + horasCopas) > 0;
  const bandejasMadera = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Focos de luz / Trípodes", "—"], ["Regletas y alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante / Bridas / Rulos", "1"], ["Generador + garrafa gasolina (llena)", "1"],
    ["Producciones (rotulación/etiquetas)", "—"], ["Walkies", "2"], ["Máquina pegatinas", "1"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas", String(calcMesasServicio(pax).total)], ["Mesa redonda", "—"], ["Mesa larga", "—"],
    ["Sillas", String(totalPax)], ["Cubos basura (reciclaje + cocina)", "2"],
    ["Champanera metálica / Cubiteras + pinza", "2"], ["Pinzas madera y metálicas", "2"],
    ["Cajas de madera para alturas", "—"], ["Marcos para menú", "—"],
    ["Carpas con paredes y pesas", "—"], ["Paredes negras (plegadas)", "—"], ["Moqueta", "—"],
    ["Bandeja camareros", String(personalSala(pax, numCamareros))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros))],
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),
  ]});

  cats.push({ nombre: "Cocina y sala", items: [
    ["Plancha de gas", "1"],
    // 1 bombona por paella + 1 extra por cada sartén de fritura
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + numFritura)],
    ["Horno pequeño / Microondas", "1"], ["Batidora / Túrmix", "1"], ["Mesas calientes", "—"],
    ["Vitro", "1"], ["Butano", "1"], ["Trípode", String(1 + numFritura)], ["Termos con tapa", "—"],
    ["Exprimidor", "1"], ["Sandwichera", "1"], ["Neveras playa grandes (con hielo)", "2"],
    ["Neveras playa pequeñas", "2"], ["Chafers", String(Math.max(2, Math.ceil(pax / 40)))],
    ...(llevaArmarioCaliente ? [["Armario caliente (alquiler Dealde)", "1", true]] : []),
  ]});

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín cuchillos / Tablas de corte", "1"], ["Ollas (mediana / grande)", "1"], ["Sartenes / Colador", "1"],
    ...(llevaPaella ? [[`Paella ${calcPaella(pax, tipoPaella).talla} / Paletas`, String(calcPaella(pax, tipoPaella).n)]] : []),
    ["Paravientos", "—"], ["Boles metálicos / Cucharones", "4"], ["Pinzas servicio (metal/madera)", "2"],
    ["Servilleteros madera", "2"], ["Gastros", "—"], ["Caja cocina (varios)", "1"],
    ["Aceiteras / Saleros / Pimenteros", "1/2 de cada"], ["Caja salsas / Arroces", "1"],
    ...(tieneFrituras ? [["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor pequeño (frituras)", String(numFritura)]] : []),
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles negros", String(calcMesasServicio(pax).total + 1)],
    ["Delantales", String(personalSala(pax, numCamareros) + 2)], ["Bayetas / Trapos", "4"],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + (hayDesayuno ? totalPax : 0);
  cats.push({ nombre: "Vajilla y Cubertería", items: [
    ["Platos trinchero blancos", String(totalPax * (dobleServicio ? 2 : 1))], ["Platos postre (negro/gris)", String(totalPax + platosPostreExtra)],
    ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ["Tenedores / Cuchillos / Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1) + (hayDesayuno ? totalPax : 0))],
    ["Cucharas postre", String(totalPax)],
    ["Jarras de cristal", String(Math.max(2, Math.ceil(totalPax / 8)))], ["Abridores", "2"],
    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
  ]});

  cats.push({ nombre: "Desechables y Bebidas", items: [
    ["Servilletas (grandes / cocktail)", `${Math.ceil(totalPax * 7 / 50)} paq. (50)`],
    ["Bandejas de cartón blancas + blondas", `${Math.ceil(totalPax / 20)} paq.`],
    ["Platitos de cartón / Envase bocadillos", String(totalPax)],
    ["Palitos brocheta", `${Math.ceil(totalPax / 20)} paq.`], ["Palitos café", `${Math.ceil(totalPax / 30)} paq.`],
    ["Calentador de agua", "1"], ["Kit té matcha", "1"], ["Infusiones varias", "1 caja"],
    ["Leches variadas (sin/normal/avena)", "4"], ["Cacao y canela", "1"], ["Leche condensada", "1"],
    ["Vasos de cartón (L/M/S)", `${Math.ceil((totalPax + (hayDesayuno ? totalPax * 1.2 : 0)) / 50)} paq. (50 uds)`], ["Bolsas grandes de papel", "1 paq."],
    ...(hayBarra ? [["Vasos de chupito de plástico (barra libre)", `${Math.max(1, Math.ceil(pax * 1.5 / 80))} paq. (80 uds)`]] : []),
    ["Coca-Cola (Normal / Zero)", String(Math.round(totalPax * 1.5))],
    ["Fanta (Limón / Naranja / Aquarius)", String(Math.round(totalPax * 0.8))],
    ["Agua 1,5L (Solán de Cabras, cliente)", `${Math.round(totalPax * 0.8)} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33cl)", `${Math.max(1, Math.ceil(Math.round(totalPax * 3) / 35))} cajas (35 uds)`]] : []),
    ["Agua con gas", String(Math.round(totalPax * 0.15))],
    ["Hielo", `${Math.max(2, Math.ceil(totalPax / 30))} taxis`],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  const personal = calcPersonal(pax, numCamareros);
  cats.push({ nombre: "Limpieza y Despensa", items: [
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", "3 rollo"],
    ["Cajas vacías", "2"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", `${personal.vasosCartonPacks} packs (50 uds)`],
    ["Agua Vidaqua 1,5L (personal)", `${personal.aguaVidaquaPacks} packs (6 uds)`],
    ["Vasos de plástico (personal)", `${personal.vasosPlasticoPacks} packs (50 uds)`],
  ]});

  return cats;
}

// ─── WORD EXPORT ──────────────────────────────────────────────────────────────
// Un item sin cantidad real (vacío o solo "—", a decidir in situ) no aporta nada
// impreso/exportado — se queda fuera de Vista previa y Descargar Word, pero sigue
// editable en la checklist principal de la app por si se quiere rellenar a mano.
function tieneCantidadVisible(qty) {
  const v = String(qty && qty.u ? qty.u : qty).trim();
  return v !== "" && v !== "—" && v !== "-";
}

function quitarItemsSinCantidad(checklist) {
  return checklist
    .map(cat => ({ ...cat, items: cat.items.filter(([, qty]) => tieneCantidadVisible(qty)) }))
    .filter(cat => cat.items.length > 0);
}

function generarHTMLWord(evtKey, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklistCompleta, meta = {}) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  const cols = ["Concepto", "Cant.", "Sale ✓", "Vuelve ✓", "Roturas"];
  const tablaHTML = (items) => `
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${items.map(([label, qty], i) => {
        const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
        return `<tr style="background:${alq ? "#fdf6e3" : i % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="padding:5px 6px;">${label}${alq ? ' <b style="color:#b45309;font-size:9pt;">[ALQUILER]</b>' : ""}</td>
          <td style="padding:5px 6px;font-weight:bold;color:#16a34a;">${qty.u ? qty.u : qty}</td>
          <td style="width:60px;"></td><td style="width:60px;"></td><td style="width:60px;"></td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  const secciones = checklist.map(cat => `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${cat.nombre}</h3>${tablaHTML(cat.items)}`).join("");
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
      <div><span class="ml">Fecha generación</span>${fecha}</div>
      <div><span class="ml">PAX total</span>${pax + ninos} (${pax} adultos${ninos > 0 ? ` + ${ninos} niños` : ""})</div>
      <div><span class="ml">Barra libre</span>${barraCoctel ? `Cóctel ${horasCoctel}h` : "—"}${barraCopas ? ` + Copas ${horasCopas}h` : ""}</div>
    </div>
    ${secciones}
    <div class="notas"><strong>NOTAS:</strong><br/><br/></div>
    </body></html>`;
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
          </div>
          <button className="preview-close-btn" onClick={onClose}>✕ Cerrar</button>
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
                    {cat.items.map(([label, qty], i) => {
                      const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                      return (
                        <tr key={i} className={alq ? "is-rental" : ""}>
                          <td>
                            {label}
                            {alq && <span className="preview-rental-badge">ALQUILER</span>}
                          </td>
                          <td className="preview-qty-cell">{qty.u ? qty.u : qty}</td>
                          <td className="preview-check-cell"></td>
                          <td className="preview-check-cell"></td>
                          <td className="preview-check-cell"></td>
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
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>✕</button>
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

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [evento, setEvento]         = useState("boda");
  const [nombreEvento, setNombreEvento] = useState("");
  const [fechaEvento, setFechaEvento]   = useState("");
  const [horaInicio, setHoraInicio]     = useState("");
  const [ubicacion, setUbicacion]       = useState("");
  const [pax, setPax]               = useState(80);
  const [ninos, setNinos]           = useState(0);
  const [barraCoctel, setBarraCoctel] = useState(true);
  const [horasCoctel, setHorasCoctel] = useState(2);
  const [barraCopas, setBarraCopas]   = useState(false);
  const [horasCopas, setHorasCopas]   = useState(4);
  const [dobleServicio, setDobleServicio]             = useState(false);
  const [llevaEntrante, setLlevaEntrante]             = useState(false);
  const [llevaPaella, setLlevaPaella]                 = useState(false);
  const [tipoPaella, setTipoPaella]                   = useState("Auto");
  const [estiloPlatoPrincipal, setEstiloPlatoPrincipal] = useState("Blanco liso");
  const [estiloPlatoPostre, setEstiloPlatoPostre]       = useState("Blanco");
  const [llevaArmarioCaliente, setLlevaArmarioCaliente] = useState(false);
  const [numCamareros, setNumCamareros]                 = useState(0);
  const [tipoBandejas, setTipoBandejas] = useState("Mixto");
  const [tipoHorno, setTipoHorno]       = useState("Pequeño");
  const [tipoBBQ, setTipoBBQ]           = useState("No lleva");
  const [mesVerano, setMesVerano]               = useState(true);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(false);
  const [tieneFrituras, setTieneFrituras]       = useState(false);
  const [numFrituras, setNumFrituras]           = useState(1);
  const [fuerzaTextilTela, setFuerzaTextilTela] = useState(false);
  const [llevaPalomitera, setLlevaPalomitera]       = useState(false);
  const [llevaJarrasCristal, setLlevaJarrasCristal] = useState(false);
  const [tipoCafetera, setTipoCafetera]             = useState("Nespresso");
  const [extraBandejasMadera, setExtraBandejasMadera] = useState(0);
  const [extraBandejasPlata, setExtraBandejasPlata]   = useState(0);
  const [llevaJamonero, setLlevaJamonero]             = useState(false);
  const [personasPorPlatoEntrante, setPersonasPorPlatoEntrante] = useState(4);
  const [llevaAguasPequenas, setLlevaAguasPequenas]   = useState(false);
  const [hayDesayuno, setHayDesayuno]                 = useState(false);
  const [tipoNevera, setTipoNevera]         = useState("Mediana");
  const [tipoCongelador, setTipoCongelador] = useState("Mediana");
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  const [modalPrevia, setModalPrevia]   = useState(false);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [compartirMsg, setCompartirMsg] = useState("");
  const [menuCompartir, setMenuCompartir] = useState(false);
  const [agregadosTag, setAgregadosTag] = useState("");
  const [itemsManuales, setItemsManuales] = useState([]); // [{ label, cantidad, categoria }] — añadidos a mano por el usuario
  const [overridesManuales, setOverridesManuales] = useState({}); // { "categoria::label": "cantidad editada a mano" }
  const [nuevoItemLabel, setNuevoItemLabel] = useState("");
  const [nuevoItemCantidad, setNuevoItemCantidad] = useState("");
  const [nuevoItemCategoria, setNuevoItemCategoria] = useState("");
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [linkAbierto, setLinkAbierto] = useState(false);

  // Snapshot completo del estado configurable, para generar un link que reabra
  // la misma checklist en cualquier dispositivo (sin backend: todo va en la URL)
  const ESTADO_SETTERS = {
    evento: setEvento, nombreEvento: setNombreEvento, fechaEvento: setFechaEvento,
    horaInicio: setHoraInicio, ubicacion: setUbicacion, pax: setPax, ninos: setNinos,
    barraCoctel: setBarraCoctel, horasCoctel: setHorasCoctel, barraCopas: setBarraCopas, horasCopas: setHorasCopas,
    dobleServicio: setDobleServicio, llevaEntrante: setLlevaEntrante, llevaPaella: setLlevaPaella, tipoPaella: setTipoPaella,
    estiloPlatoPrincipal: setEstiloPlatoPrincipal, estiloPlatoPostre: setEstiloPlatoPostre,
    llevaArmarioCaliente: setLlevaArmarioCaliente, numCamareros: setNumCamareros, tipoBandejas: setTipoBandejas,
    tipoHorno: setTipoHorno, tipoBBQ: setTipoBBQ, mesVerano: setMesVerano, tieneBrindisCava: setTieneBrindisCava,
    tieneFrituras: setTieneFrituras, numFrituras: setNumFrituras, fuerzaTextilTela: setFuerzaTextilTela,
    llevaPalomitera: setLlevaPalomitera, llevaJarrasCristal: setLlevaJarrasCristal, tipoCafetera: setTipoCafetera,
    extraBandejasMadera: setExtraBandejasMadera, extraBandejasPlata: setExtraBandejasPlata, llevaJamonero: setLlevaJamonero,
    personasPorPlatoEntrante: setPersonasPorPlatoEntrante, llevaAguasPequenas: setLlevaAguasPequenas, hayDesayuno: setHayDesayuno,
    tipoNevera: setTipoNevera, tipoCongelador: setTipoCongelador,
    itemsManuales: setItemsManuales, overridesManuales: setOverridesManuales,
  };

  // Al abrir un link generado (?c=...), restaura el estado guardado en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (!c) return;
    try {
      const estado = JSON.parse(decodeURIComponent(c));
      Object.entries(estado).forEach(([k, v]) => { if (ESTADO_SETTERS[k]) ESTADO_SETTERS[k](v); });
      setLinkAbierto(true);
    } catch (e) { /* link corrupto o antiguo: se ignora y se queda en los valores por defecto */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerarLink = () => {
    const estado = {
      evento, nombreEvento, fechaEvento, horaInicio, ubicacion, pax, ninos,
      barraCoctel, horasCoctel, barraCopas, horasCopas,
      dobleServicio, llevaEntrante, llevaPaella, tipoPaella,
      estiloPlatoPrincipal, estiloPlatoPostre,
      llevaArmarioCaliente, numCamareros, tipoBandejas,
      tipoHorno, tipoBBQ, mesVerano, tieneBrindisCava,
      tieneFrituras, numFrituras, fuerzaTextilTela,
      llevaPalomitera, llevaJarrasCristal, tipoCafetera,
      extraBandejasMadera, extraBandejasPlata, llevaJamonero,
      personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
      tipoNevera, tipoCongelador, itemsManuales, overridesManuales,
    };
    const url = `${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(JSON.stringify(estado))}`;
    navigator.clipboard.writeText(url).then(() => {
      setCompartirMsg("¡Link copiado! ✓");
      setTimeout(() => setCompartirMsg(""), 3000);
    });
    setMenuCompartir(false);
  };

  const opts = {
    dobleServicio, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, tieneFrituras, numFrituras, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    tipoNevera, tipoCongelador, tipoPaella,
    estiloPlatoPrincipal, estiloPlatoPostre,
  };

  // Checklist calculada (sin los items manuales) — sirve también para listar las categorías reales
  // disponibles a la hora de elegir dónde encajar un item añadido a mano.
  const baseChecklist = useMemo(() =>
    buildChecklist(evento, pax, barraCoctel ? horasCoctel : 0, barraCopas ? horasCopas : 0, ninos, opts),
    [evento, pax, barraCoctel, horasCoctel, barraCopas, horasCopas, ninos, opts]
  );
  const categoriasDisponibles = useMemo(() => baseChecklist.map(c => c.nombre), [baseChecklist]);

  const checklist = useMemo(() => {
    const cats = baseChecklist.map(c => ({ ...c, items: [...c.items] }));
    // El 3er elemento de la tupla (índice real en itemsManuales) permite borrar el item
    // correcto luego, aunque el buscador esté filtrando la lista visible.
    itemsManuales.forEach((it, idx) => {
      let destino = cats.find(c => c.nombre === it.categoria);
      if (!destino) {
        destino = cats.find(c => c.nombre === CATEGORIA_MANUAL);
        if (!destino) { destino = { nombre: CATEGORIA_MANUAL, items: [] }; cats.push(destino); }
      }
      destino.items.push([it.label, it.cantidad, idx]);
    });
    // Aplica las cantidades editadas a mano (clave: categoría + etiqueta del item)
    cats.forEach(cat => {
      cat.items = cat.items.map(([label, qty, idx]) => {
        const key = `${cat.nombre}::${label}`;
        return overridesManuales[key] !== undefined ? [label, overridesManuales[key], idx] : [label, qty, idx];
      });
    });
    return cats;
  }, [baseChecklist, itemsManuales, overridesManuales]);

  const handleEditarCantidad = (categoria, label, valor) => {
    const key = `${categoria}::${label}`;
    setOverridesManuales(prev => {
      const next = { ...prev };
      if (valor.trim() === "") delete next[key];
      else next[key] = valor;
      return next;
    });
  };

  const handleLabelItemManual = (value) => {
    setNuevoItemLabel(value);
    if (!categoriaTocada) setNuevoItemCategoria(sugerirCategoria(value, categoriasDisponibles) || CATEGORIA_MANUAL);
  };
  const handleAddItemManual = () => {
    const label = nuevoItemLabel.trim();
    if (!label) return;
    const categoria = nuevoItemCategoria || sugerirCategoria(label, categoriasDisponibles) || CATEGORIA_MANUAL;
    setItemsManuales(prev => [...prev, { label, cantidad: nuevoItemCantidad.trim() || "1", categoria }]);
    setNuevoItemLabel(""); setNuevoItemCantidad(""); setNuevoItemCategoria(""); setCategoriaTocada(false);
  };
  const handleRemoveItemManual = (idx) => setItemsManuales(prev => prev.filter((_, i) => i !== idx));

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
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion });
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Checklist_${EVENTOS[evento]?.label?.replace(/ /g, "_")}_${pax}pax.doc`;
    a.click();
  };

  const getTextoChecklist = () => {
    const texto = checklist.map(cat => `\n▶ ${cat.nombre.toUpperCase()}\n` + cat.items.map(([l, q]) => `  • ${l}: ${q.u ? q.u : q}`).join("\n")).join("\n");
    const cabecera = [
      nombreEvento ? nombreEvento.toUpperCase() : `CHECKLIST ${EVENTOS[evento]?.label?.toUpperCase()}`,
      `${pax} pax`,
      fechaEvento ? new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
      horaInicio ? `${horaInicio}h` : null,
      ubicacion || null,
    ].filter(Boolean).join(" · ");
    return `${cabecera}\n${texto}`;
  };

  const handleCompartirWord = () => {
    handleDescargar();
    setMenuCompartir(false);
  };

  const handleCompartirPDF = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion });
    const ventana = window.open("", "_blank");
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
      {modalPrevia  && <ModalVistaPrevia checklist={checklist} evtKey={evento} pax={pax} ninos={ninos} meta={{ nombreEvento, fechaEvento, horaInicio, ubicacion }} onClose={() => setModalPrevia(false)} />}
      {modalAgregar && <ModalAgregarItems checklist={checklist} categoriasDisponibles={categoriasDisponibles} onClose={() => setModalAgregar(false)} onConfirm={handleAgregarItems} />}

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
            <button className="btn btn-outline" onClick={() => setModalPrevia(true)}>Vista previa</button>
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
              <input type="number" className="form-input" value={pax} onChange={e => setPax(parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">NIÑOS</span>
              <input type="number" className="form-input" value={ninos} onChange={e => setNinos(parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">Nº CAMAREROS</span>
              <input type="number" className="form-input" placeholder="Auto" value={numCamareros || ""} onChange={e => setNumCamareros(parseInt(e.target.value) || 0)} min="0" />
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
          <hr />
          <div className="section-title">Barra libre</div>
          <div className="form-row">
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCoctel} onChange={e => setBarraCoctel(e.target.checked)} />
                Cóctel / aperitivo
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="6" step="0.5" className="range-slider" value={horasCoctel} onChange={e => setHorasCoctel(parseFloat(e.target.value))} disabled={!barraCoctel} />
                <span className="range-value">{horasCoctel}h</span>
              </div>
            </div>
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCopas} onChange={e => setBarraCopas(e.target.checked)} />
                Copas
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="12" step="1" className="range-slider" value={horasCopas} onChange={e => setHorasCopas(parseFloat(e.target.value))} disabled={!barraCopas} />
                <span className="range-value">{horasCopas}h</span>
              </div>
            </div>
          </div>
          <hr />
          <div className="section-title">Extras</div>
          <div className="checkbox-grid">
            {[
              [dobleServicio,        setDobleServicio,        "Doble servicio",          "dobla cubierto, copa y plato"],
              [llevaEntrante,        setLlevaEntrante,        "Lleva entrante",           "chupito de cristal"],
              [llevaPaella,          setLlevaPaella,          "Lleva paella",             "calcula paelleros completos"],
              [llevaArmarioCaliente, setLlevaArmarioCaliente, "Armario caliente",         "alquiler Dealde"],
              [tieneFrituras,        setTieneFrituras,        "Hay frituras",             tieneFrituras ? `${numFrituras} sartén parisiene (ajusta abajo)` : "sartén parisiene"],
              ...(evento !== "produccion"
                ? [[tieneBrindisCava, setTieneBrindisCava, "Brindis con cava", "dobla copas de cava"]]
                : []),
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de palomitera propio"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              [llevaAguasPequenas,   setLlevaAguasPequenas,   "Aguas pequeñas",           "botellas individuales 33cl"],
              [hayDesayuno,          setHayDesayuno,          "Hay desayuno",             "sandwichera + más tazas de café"],
              ...(evento !== "cumpleanos" && evento !== "produccion"
                ? [[llevaJarrasCristal, setLlevaJarrasCristal, "Jarras de cristal", "para agua/zumos en mesa"]]
                : []),
            ].map(([val, fn, lab, sub]) => (
              <label key={lab} className="checkbox-label-normal">
                <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                {lab} <span>· {sub}</span>
              </label>
            ))}
          </div>
          {(llevaEntrante || llevaPaella || tieneFrituras) && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              {llevaEntrante && (
                <SegmentedControl label="Plato de entrante compartido cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
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
            </div>
          )}
          <hr />
          <div className="section-title">Equipamiento</div>
          <div className="controls-stack">
            <div className="controls-row">
              <SegmentedControl label="Bandejas de servicio" value={tipoBandejas} onChange={setTipoBandejas} options={["Madera", "Plata", "Mixto"]} />
              <div className="form-group controls-mini">
                <span className="form-label">Madera extra</span>
                <input type="number" className="form-input" value={extraBandejasMadera || ""} placeholder="0" min="0" onChange={e => setExtraBandejasMadera(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group controls-mini">
                <span className="form-label">Plata extra</span>
                <input type="number" className="form-input" value={extraBandejasPlata || ""} placeholder="0" min="0" onChange={e => setExtraBandejasPlata(parseInt(e.target.value) || 0)} />
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
                  <div className="form-group controls-mini">
                    <span className="form-label">Estilo plato principal</span>
                    <select className="form-select" value={estiloPlatoPrincipal} onChange={e => setEstiloPlatoPrincipal(e.target.value)}>
                      {["Blanco liso", "Relieve blanco", "Verde", "Metálico"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group controls-mini">
                    <span className="form-label">Estilo plato postre</span>
                    <select className="form-select" value={estiloPlatoPostre} onChange={e => setEstiloPlatoPostre(e.target.value)}>
                      {["Blanco", "Verde"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            {evento !== "cumpleanos" && evento !== "produccion" && (
              <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
            )}
          </div>
        </div>

        </div>
        <div className="checklist-main">

        {/* BUSCADOR */}
        <div className="animate-entrance" style={{ animationDelay: "0.2s" }}>
          <input type="text" className="search-input-main" placeholder="Buscar un material..." value={filtro} onChange={e => setFiltro(e.target.value)} />
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
                onChange={e => { setNuevoItemCategoria(e.target.value); setCategoriaTocada(true); }}
              >
                {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                <option value={CATEGORIA_MANUAL}>{CATEGORIA_MANUAL}</option>
              </select>
            </div>
            <button className="btn btn-navy-outline add-item-btn" onClick={handleAddItemManual} disabled={!nuevoItemLabel.trim()}>+ Añadir</button>
          </div>
        </div>

        {/* CATEGORÍAS */}
        {filtered.map((cat, idx) => {
          const isOpen = openCategories[cat.nombre] !== false;
          const esManual = cat.nombre === CATEGORIA_MANUAL;
          const infoCat = infoCategoria(cat.nombre);
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s`, borderTopColor: infoCat.color, borderTopWidth: 3 }}>
              <div className="category-header" onClick={() => toggleCategory(cat.nombre)}>
                <span className="cat-name"><span className="cat-icon" style={{ background: infoCat.color, color: infoCat.texto }}>{infoCat.icono}</span>{cat.nombre}</span>
                <span className="cat-count">{cat.items.length}<span className="arrow">▼</span></span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty, manualIdx], i) => {
                    const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                    const displayQty = String(qty && qty.u ? qty.u : qty);
                    const editado = overridesManuales[`${cat.nombre}::${label}`] !== undefined;
                    return (
                      <div key={i} className={`item-row ${alq ? "is-alquiler" : ""}`}>
                        <div className="item-name">
                          {label}
                          {alq && <span className="tag-alquiler">ALQUILER</span>}
                          {editado && <span title="Cantidad editada a mano" style={{ color: "#9ca3af", fontSize: "0.7rem" }}>✎</span>}
                        </div>
                        <input
                          type="text"
                          className="item-qty-input"
                          value={displayQty}
                          title="Click para editar la cantidad"
                          onChange={e => handleEditarCantidad(cat.nombre, label, e.target.value)}
                          onFocus={e => e.target.select()}
                          size={Math.max(2, displayQty.length)}
                        />
                        {esManual && (
                          <button
                            onClick={() => handleRemoveItemManual(manualIdx)}
                            title="Quitar item"
                            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1rem", marginLeft: 8, lineHeight: 1 }}
                          >✕</button>
                        )}
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
