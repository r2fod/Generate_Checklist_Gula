import React, { useState, useMemo, useCallback } from "react";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const BATEA = { vino: 25, cava: 36, agua: 25, cubata: 25, chupito: 49 };
const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];

const EVENTOS = {
  boda:        { label: "Boda",              icon: "♥" },
  comunion:    { label: "Comunión / Bautizo", icon: "✚" },
  cumpleanos:  { label: "Cumpleaños",         icon: "✦" },
  corporativo: { label: "Evento corporativo", icon: "▣" },
};

// Campos logísticos que se pueden mapear desde el Sheet
const CAMPOS_LOGISTICA = [
  { key: "pax",              label: "PAX adultos",             tipo: "numero" },
  { key: "ninos",            label: "Niños",                   tipo: "numero" },
  { key: "evento",           label: "Tipo de evento",          tipo: "evento" },
  { key: "horasCoctel",      label: "Horas barra cóctel",      tipo: "numero" },
  { key: "horasCopas",       label: "Horas barra copas",       tipo: "numero" },
  { key: "llevaPaella",      label: "Lleva paella",            tipo: "bool" },
  { key: "tipoHorno",        label: "Tipo de horno",           tipo: "horno" },
  { key: "tipoBBQ",          label: "Barbacoa",                tipo: "bbq" },
  { key: "llevaArmarioCaliente", label: "Armario caliente (Alquiler)", tipo: "bool" },
  { key: "tieneFrituras",    label: "Frituras",                tipo: "bool" },
  { key: "llevaEntrante",    label: "Lleva entrante (chupito)", tipo: "bool" },
  { key: "mesVerano",        label: "Temporada verano",        tipo: "bool" },
  { key: "tieneCongelador",  label: "Finca con congelador",    tipo: "bool" },
  { key: "tieneBrindisCava", label: "Brindis con cava",        tipo: "bool" },
  { key: "dobleServicio",    label: "Doble servicio",          tipo: "bool" },
  { key: "tipoBandejas",     label: "Tipo de bandejas",        tipo: "bandejas" },
  { key: "fuerzaTextilTela", label: "Servilletas de tela",     tipo: "bool" },
  { key: "numCamareros",     label: "Nº camareros / personal sala", tipo: "numero" },
  { key: "llevaPalomitera",  label: "Lleva palomitera/carrito", tipo: "bool" },
  { key: "llevaJarrasCristal", label: "Jarras de cristal",     tipo: "bool" },
  { key: "tipoCafetera",     label: "Tipo de cafetera",        tipo: "cafetera" },
  { key: "extraBandejasMadera", label: "Bandejas de madera extra", tipo: "numero" },
  { key: "extraBandejasPlata",  label: "Bandejas de plata extra",  tipo: "numero" },
  { key: "llevaJamonero",    label: "Hay jamonero",            tipo: "bool" },
  { key: "personasPorPlatoEntrante", label: "Personas por plato de entrante", tipo: "numero" },
  { key: "llevaAguasPequenas", label: "Aguas pequeñas",        tipo: "bool" },
  { key: "hayDesayuno",      label: "Hay desayuno",            tipo: "bool" },
];

// Valores por defecto del formulario — se usan para no pisar campos ya editados a mano al importar
const DEFAULTS = {
  evento: "boda", pax: 80, ninos: 0, horasCoctel: 2, horasCopas: 4,
  dobleServicio: false, llevaEntrante: false, llevaPaella: false,
  llevaArmarioCaliente: false, numCamareros: 0, tipoBandejas: "Mixto",
  tipoHorno: "Pequeño", tipoBBQ: "No lleva", mesVerano: true,
  tieneCongelador: false, tieneBrindisCava: false, tieneFrituras: false,
  fuerzaTextilTela: false, llevaPalomitera: false, llevaJarrasCristal: false,
  tipoCafetera: "Nespresso", extraBandejasMadera: 0, extraBandejasPlata: 0,
  llevaJamonero: false, personasPorPlatoEntrante: 4, llevaAguasPequenas: false,
  hayDesayuno: false,
};

// ─── PARSE CSV ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const parseRow = (line) => {
    const result = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { result.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    result.push(cur.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = parseRow(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v.trim() !== ""));
  return { headers, rows };
}

// Convierte un valor raw del Sheet al tipo esperado
function parseValor(raw, tipo) {
  if (!raw) return null;
  const v = raw.toString().trim().toLowerCase();
  switch (tipo) {
    case "numero": return parseFloat(v.replace(",", ".")) || null;
    case "bool":   return ["sí", "si", "yes", "true", "1", "x", "✓"].includes(v);
    case "evento": {
      if (v.includes("boda"))            return "boda";
      if (v.includes("comun") || v.includes("bautizo")) return "comunion";
      if (v.includes("cumplea"))         return "cumpleanos";
      if (v.includes("corp") || v.includes("empresa")) return "corporativo";
      return null;
    }
    case "horno":   {
      if (v.includes("grande"))  return "Grande";
      if (v.includes("ambos") || v.includes("los dos")) return "Ambos";
      return "Pequeño";
    }
    case "bbq": {
      if (v.includes("no") || v === "") return "No lleva";
      if (v.includes("grand"))           return "Grande";
      return "Pequeña";
    }
    case "bandejas": {
      if (v.includes("madera")) return "Madera";
      if (v.includes("plata"))  return "Plata";
      return "Mixto";
    }
    case "cafetera": {
      if (v.includes("nespresso")) return "Nespresso";
      if (v.includes("bar"))       return "Bar";
      return "Grande";
    }
    default: return raw;
  }
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
  const agua15 = Math.round(pax * 0.5);
  const redbull = h > 0 ? Math.max(12, Math.round(pax * 0.12 * barFactor)) : 0;
  const taxisHielo = tieneCongelador ? Math.max(1, Math.ceil(pax / 80)) : Math.max(2, Math.ceil(pax / 30));
  return {
    cerveza, vinoBlanco, vinoTinto, cava, tonica, agua15, redbull,
    cocaNormal: Math.round(refrescoTotal * 0.25),
    cocaZero:   Math.round(refrescoTotal * 0.20),
    fanta:      Math.round(refrescoTotal * 0.25),
    sprite:     Math.round(refrescoTotal * 0.1),
    nestea:     Math.round(refrescoTotal * 0.1),
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
    vodka: r(pax / 40), vermut: r(pax / 40),
    mistela: 2, baileys: 1, tiaMaria: 1, limoncello: 1, jagger: 1, peach: 1,
    cremaOrujo: 1, cazalla: 1, orujoHierbas: 1, marcaBlanca: 1,
  };
}

function calcCristaleria(pax, h, dobleCopa, tieneBrindisCava, llevaEntrante) {
  const copasBarraPorPax = h > 0 ? Math.min(5, 2 + Math.max(0, h - 1)) : 0;
  const mult = dobleCopa ? 2 : 1;
  const vino = Math.round(pax * 2.5 * mult);
  const agua = Math.round(pax * 1.5 * mult);
  const cubata = Math.round(pax * copasBarraPorPax);
  const cavaCopas = Math.round(pax * (tieneBrindisCava ? 2.0 : 1.0));
  const fmt = (u, size) => ({ u: Math.ceil(u / size) * size, b: bateas(u, size), size });
  return {
    agua: fmt(agua, BATEA.agua), cubata: fmt(cubata, BATEA.cubata),
    vino: fmt(vino, BATEA.vino), cava: fmt(cavaCopas, BATEA.cava),
    chupito: llevaEntrante ? fmt(pax, BATEA.chupito) : null,
  };
}

function calcPaella(pax) {
  const n = Math.max(1, Math.ceil(pax / 30));
  const talla = pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande";
  return { n, talla };
}

function calcMesasServicio(pax) {
  if (pax <= 50) return { total: 7 };
  if (pax <= 100) return { total: 11 };
  return { total: 13 };
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
// - Bar: cafetera tipo bar (espresso/portafiltro), café molido por taza.
// - Grande: cafetera industrial, hace cargas de ~100 cafés con café molido.
function calcCafe(totalPax, tipoCafetera, hayDesayuno) {
  const items = [];
  if (tipoCafetera === "Grande") {
    items.push(["Cafetera grande (industrial)", "1"], ["Café molido (industrial)", `${Math.max(1, Math.ceil(totalPax / 100))} carga(s)`]);
  } else if (tipoCafetera === "Bar") {
    items.push(["Cafetera de bar", "1"], ["Café molido (cafetera de bar)", `${Math.ceil(totalPax / 50)} paq.`]);
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
    ["Leches variadas (entera/desnatada/sin lactosa/avena)", "4"],
    ["Jarras de leche", String(Math.max(2, Math.ceil(totalPax / 40)))],
  );
  return { nombre: "Café", items };
}

// ─── BUILD CHECKLIST ──────────────────────────────────────────────────────────
function buildChecklist(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  if (evtKey === "cumpleanos")  return buildChecklistCumpleanos(pax, horasCoctel, horasCopas, ninos, opts);
  if (evtKey === "corporativo") return buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts);
  return buildChecklistBoda(evtKey, pax, horasCoctel, horasCopas, ninos, opts); // boda y comunión
}

// Boda y comunión — fiel a "Checklist de Carga – BODA"
function buildChecklistBoda(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    dobleServicio, llevaPaella, tipoBandejas, tipoBBQ, tipoHorno,
    mesVerano, tieneCongelador, tieneBrindisCava, fuerzaTextilTela,
    tieneFrituras, llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
  } = opts;

  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;

  const bebidas    = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, tieneCongelador);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  const cristal    = calcCristaleria(pax, hayBarra ? horasBarraTotal : 2, dobleServicio, tieneBrindisCava, llevaEntrante);
  const usaTela    = evtKey === "boda" || fuerzaTextilTela;
  const cats       = [];

  cats.push({ nombre: "Electricidad y camión", items: [
    ["Regletas y alargadores", "Sí"], ["Caja cables", "1"], ["Cinta aislante", "1"],
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
    ...(llevaPaella ? [["Descansadores de paella", String(calcPaella(pax).n)]] : []),
    ["Cubo basura cocina", "2"], ["Champanera metálica grande", "4"],
    ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores cerveza", "2"],
    ["Bandeja camarero", numCamareros > 0 ? String(numCamareros) : String(Math.max(2, Math.ceil(pax / 20)))],
    ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
    ["Nevera pequeña", "—"], ["Congelador", "—"], ["Nevera roja", "—"],
    ...(llevaPalomitera ? [["Carrito palomitera (Alquiler)", "1"]] : []),

    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
  ]});

  const numPaella  = llevaPaella ? calcPaella(pax).n : 0;
  const numFritura = tieneFrituras ? 1 : 0;
  const bombonas   = numPaella + numFritura + 2;
  const cocinaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax);
    cocinaItems.push([`Paella ${p.talla}`, String(p.n)], ["Difusores", String(p.n)], ["Trípode", String(p.n)], ["Paravientos", String(p.n)]);
  }
  cocinaItems.push(["Bombonas llenas", String(bombonas)], ["Cazuelas de barro", "—"], ["Cazuelas rojas", "—"], ["Gastros", "—"], ["Plancha", "—"]);
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño (con bandejas)", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande (Alquiler Dealde)", "1", true]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Túrmix", "1"], ["Vitro eléctrica", "1"]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (tieneFrituras) cocinaItems.push(["Sartén Parisiene (frituras)", "1"], ["Difusor extra (frituras)", "1"], ["Trípode extra (frituras)", "1"], ["Espumadera grande", "2"]);
  if (tipoBBQ !== "no lleva") {
    cocinaItems.push([`Barbacoa ${tipoBBQ}`, String(Math.max(1, Math.ceil(pax / 60)))], ["Reja BBQ grande", "1"], ["Carbón", String(Math.max(2, Math.ceil(pax / 30)))], ["Leña", "1"], ["Pastillas de encender", "1"], ["Gastros extra", "—"]);
  }
  cats.push({ nombre: "Cocina y fuego", items: cocinaItems });

  cats.push({ nombre: "Menaje y utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"], ["Aceiteras de cristal", "—"], ["Saleros y pimenteros", "6"],
    ["Ollas (mediana y grande)", "1"], ["Sartenes", "1"], ["Colador", "1"], ["Boles metálicos", "4"],
    ["Cucharones grandes", "3"], ["Pinzas largas", "2"], ["Copas metálicas", "Todas"],
    ...(llevaPaella ? [["Paletas de paella", String(calcPaella(pax).n)]] : []),
  ]});

  cats.push({ nombre: "Cristalería", items: [
    [`Vasos de agua${dobleServicio ? " (doble)" : ""}`,  `${cristal.agua.u} (${cristal.agua.b} bateas de ${cristal.agua.size})`],
    ["Vasos de cubata",                                   `${cristal.cubata.u} (${cristal.cubata.b} bateas de ${cristal.cubata.size})`],
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`,  `${cristal.vino.u} (${cristal.vino.b} bateas de ${cristal.vino.size})`],
    ["Copas de cava",                                     `${cristal.cava.u} (${cristal.cava.b} bateas de ${cristal.cava.size})`],
    ["Copa martini", "—"], ["Vaso whiskey", "—"],
    ...(cristal.chupito ? [["Vasos chupito cristal (entrante)", `${cristal.chupito.u} (${cristal.chupito.b} bateas de ${cristal.chupito.size})`]] : []),
    ...(llevaJarrasCristal ? [["Jarras de cristal", "—"]] : []),
  ]});

  cats.push({ nombre: "Mantelería y textiles", items: [
    ["Manteles beige", String(calcMesasTotal(evtKey, pax) + 2)], ["Delantales cocina y sala", "5"],
    [usaTela ? "Servilletas de tela" : "Servilletas de papel", usaTela ? String(totalPax) : `${Math.ceil(totalPax / 40)} paq.`],
    ["Servilletas cocktail", `${Math.ceil(totalPax / 100)} paq. (100)`],
  ]});

  cats.push({ nombre: "Vajilla", items: [
    ["Platos trinchero blancos (principal)", String(totalPax)], ["Platos relieve blancos", "—"], ["Platos verdes", "—"],
    ["Platos hondos", "—"], ["Plato pan", "—"], ["Platos metálicos", "—"], ["Boles negros y blancos", "—"],
    ["Platos postre blancos", String(totalPax)], ["Platos verde postre", "—"],
    ["Tenedores grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cuchillos grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cucharas postre", String(totalPax)],
    ["Cucharas café", String(Math.round(totalPax * 0.8))],
    ...(llevaJamonero ? [["Platos extra para Jamón", String(Math.ceil(pax * 0.3))]] : []),
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
    ...(evtKey === "boda" ? [["Platos extra para Tarta nupcial", String(totalPax)]] : []),
  ]});

  cats.push({ nombre: "Servicio y limpieza", items: [
    ["Fairy", "1"], ["Estropajo", "1"], ["Papel plata", "1"], ["Film", "1"],
    ["Bayetas y trapos de horno", "4"], ["Papel Chemine", "2"], ["Bolsas de basura", "10"], ["Ceniceros", "—"],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Bebidas frías", items: [
    ["Cerveza Alhambra (tercios)", String(bebidas.cerveza)],
    ["Vino blanco", `${bebidas.vinoBlanco} botellas`], ["Vino tinto", `${bebidas.vinoTinto} botellas`],
    ["Cava", `${bebidas.cava} botellas`], ["Agua 1,5L", `${bebidas.agua15} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33/50cl)", String(Math.round(totalPax * 1))]] : []),
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta / Aquarius", String(bebidas.fanta)], ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Tónica", `${bebidas.tonica} botellas`], ["Agua con gas", String(bebidas.aguaConGas)],
    ["Cerveza 0,0", String(bebidas.cerveza00)], ["Cerveza sin gluten", String(bebidas.sinGluten)],
    ["Hielo", `${bebidas.taxisHielo} ${tieneCongelador ? "cajas almacén" : "taxis"}`],
    ...(hayBarra ? [["Redbull", String(bebidas.redbull)]] : []),
  ]});

  if (destilados) {
    cats.push({ nombre: "Alcoholes y licores", items: [
      ["Ginebra (Seagrams/Tanqueray)", String(destilados.ginebraPremium)],
      ["Ginebra de sabor (Puerto de Indias)", String(destilados.ginebraSabor)],
      ["Ron (Bacardí)", String(destilados.ron)], ["Ron saborizado (Negrita)", String(destilados.ronBlanco)],
      ["Tequila", String(destilados.tequila)], ["Tequila Rosa", String(destilados.tequilaSabor)],
      ["Vodka", String(destilados.vodka)], ["Vermut rojo", String(destilados.vermut)],
      ["Mistela", String(destilados.mistela)], ["Baileys", String(destilados.baileys)],
      ["Tía María", String(destilados.tiaMaria)], ["Limoncello", String(destilados.limoncello)],
      ["Jagger", String(destilados.jagger)], ["Peach", String(destilados.peach)],
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
    dobleServicio, llevaPaella, tipoHorno, tieneFrituras, llevaEntrante,
    tieneBrindisCava, mesVerano, tieneCongelador, fuerzaTextilTela, tipoCafetera,
    llevaJamonero, personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
  } = opts;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;

  const bebidas = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, tieneCongelador);
  const cristal = calcCristaleria(pax, hayBarra ? horasBarraTotal : 2, dobleServicio, tieneBrindisCava, llevaEntrante);
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Regletas, alargadores y caja cables", "Sí"], ["Cinta aislante / Bridas / Rulos", "1"], ["Walkies", "2"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas totales", String(calcMesasServicio(pax).total)],
    ["Sillas", String(totalPax)],
    ["Cubos basura (reciclaje + cocina)", "2"],
    ["Champanera metálica / Cubiteras + pinza", "2"],
    ["Abridores", "2"],
    ["Bandeja camareros", opts.numCamareros > 0 ? String(opts.numCamareros) : String(Math.max(2, Math.ceil(pax / 20)))],
    ["Pinzas", "2"], ["Copas metálicas y conchas", "—"],
  ]});

  const cocinaItems = [
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax).n : 0) + (tieneFrituras ? 1 : 0) + 1)],
  ];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande (Alquiler Dealde)", "1", true]);
  cocinaItems.push(["Microondas", "1"], ["Batidora / Túrmix", "1"], ["Vitro", "1"], ["Aceiteras / Saleros / Pimenteros", "1/2 de cada"]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (tieneFrituras) cocinaItems.push(["Sartén Parisiene (frituras)", "1"], ["Paravientos", "1"]);
  if (llevaPaella) {
    const p = calcPaella(pax);
    cocinaItems.push([`Paella ${p.talla}`, String(p.n)], ["Trípodes", String(p.n)], ["Descansadores paella", "2"]);
  }
  cats.push({ nombre: "Cocina y Electro", items: cocinaItems });

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín cuchillos / Tablas de corte", "1"], ["Ollas (mediana / grande)", "1"], ["Sartenes / Colador", "1"],
    ["Caja salsas / Arroces", "1"], ["Boles metálicos / Cucharones", "4"], ["Servilleteros madera", "2"],
    ["Caja cocina (varios)", "1"],
    ...(llevaPaella ? [["Paletas de paella", String(calcPaella(pax).n)]] : []),
  ]});

  const usaTela = fuerzaTextilTela;
  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles beige", String(calcMesasServicio(pax).total + 1)], ["Delantales / Bayetas / Trapos", "4"],
    [usaTela ? "Servilletas de tela" : "Servilletas (grandes / cocktail)", usaTela ? String(totalPax) : `${Math.ceil(totalPax / 40)} paq.`],
  ]});

  cats.push({ nombre: "Vajilla, Cubertería y Cristalería", items: [
    ["Platos trinchero blancos", String(totalPax)], ["Platos metálicos", "—"], ["Platos postre", String(totalPax)],
    ["Jarras de cristal", "—"],
    ["Tenedores / Cuchillos / Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cucharas postre", String(totalPax)],
    [`Copas cristal${dobleServicio ? " (doble)" : ""}`, `${cristal.vino.u} (${cristal.vino.b} bateas de ${cristal.vino.size})`],
    ["Vasos cristal", `${cristal.agua.u} (${cristal.agua.b} bateas de ${cristal.agua.size})`],
    ["Copa cava", `${cristal.cava.u} (${cristal.cava.b} bateas de ${cristal.cava.size})`],
    ["Vaso cubata", `${cristal.cubata.u} (${cristal.cubata.b} bateas de ${cristal.cubata.size})`],
    ...(cristal.chupito ? [["Chupito (entrante)", `${cristal.chupito.u} (${cristal.chupito.b} bateas de ${cristal.chupito.size})`]] : []),
    ...(llevaJamonero ? [["Platos extra para Jamón", String(Math.ceil(pax * 0.3))]] : []),
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Bebidas", items: [
    ["Coca Cola (Normal / Zero)", String(bebidas.cocaNormal + bebidas.cocaZero)],
    ["Fanta (Limón / Naranja / Aquarius / Nestea)", String(bebidas.fanta + bebidas.nestea)],
    ["Aguas (2L)", `${bebidas.agua15} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33/50cl)", String(Math.round(totalPax * 1))]] : []),
    ["Agua con gas", String(bebidas.aguaConGas)],
    ...(hayBarra ? [["Alcohol (barra libre)", "Ver Alcoholes"]] : []),
    ["Hielo", `${bebidas.taxisHielo} ${tieneCongelador ? "cajas almacén" : "taxis"}`],
  ]});

  cats.push({ nombre: "Limpieza", items: [
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", "2"],
    ["Cajas vacías", "2"], ["Caja azul", "1"], ["Ceniceros", "—"],
  ]});

  return cats;
}

// Eventos corporativos / producciones — fiel a "Checklist de Carga – Producciones"
function buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts) {
  const { llevaPaella, tieneFrituras, tipoCafetera, dobleServicio, hayDesayuno } = opts;
  const totalPax = pax + ninos;
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Focos de luz / Trípodes", "—"], ["Regletas, alargadores y caja cables", "Sí"],
    ["Cinta aislante / Bridas / Rulos", "1"], ["Generador + garrafa gasolina (llena)", "1"],
    ["Producciones (rotulación/etiquetas)", "—"], ["Walkies", "2"], ["Máquina pegatinas", "1"],
  ]});

  cats.push({ nombre: "Mobiliario", items: [
    ["Mesas", String(calcMesasServicio(pax).total)], ["Mesa redonda", "—"], ["Mesa larga", "—"],
    ["Sillas", String(totalPax)], ["Cubos basura (reciclaje + cocina)", "2"],
    ["Champanera metálica / Cubiteras + pinza", "2"], ["Pinzas madera y metálicas", "2"],
    ["Cajas de madera para alturas", "—"], ["Marcos para menú", "—"],
    ["Carpas con paredes y pesas", "—"], ["Paredes negras (plegadas)", "—"], ["Moqueta", "—"],
  ]});

  cats.push({ nombre: "Cocina y sala", items: [
    ["Plancha de gas", "1"], ["Bombonas llenas", String((llevaPaella ? calcPaella(pax).n : 0) + (tieneFrituras ? 1 : 0) + 1)],
    ["Horno pequeño / Microondas", "1"], ["Batidora / Túrmix", "1"], ["Mesas calientes", "—"],
    ["Vitro", "1"], ["Butano", "1"], ["Trípode", "1"], ["Termos con tapa", "—"],
    ["Exprimidor", "1"], ["Sandwichera", "1"], ["Neveras playa grandes (con hielo)", "2"],
    ["Neveras playa pequeñas", "2"], ["Chafers", String(Math.max(2, Math.ceil(pax / 40)))],
  ]});

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín cuchillos / Tablas de corte", "1"], ["Ollas (mediana / grande)", "1"], ["Sartenes / Colador", "1"],
    ...(llevaPaella ? [["Paella (mediana) / Paletas", String(calcPaella(pax).n)]] : []),
    ["Paravientos", "—"], ["Boles metálicos / Cucharones", "4"], ["Pinzas servicio (metal/madera)", "2"],
    ["Servilleteros madera", "2"], ["Gastros", "—"], ["Caja cocina (varios)", "1"],
    ["Aceiteras / Saleros / Pimenteros", "1/2 de cada"], ["Caja salsas / Arroces", "1"],
    ...(tieneFrituras ? [["Sartén Parisiene (frituras)", "1"]] : []),
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles negros", String(calcMesasServicio(pax).total + 1)], ["Delantales", "5"], ["Bayetas / Trapos", "4"],
  ]});

  cats.push({ nombre: "Vajilla y Cubertería", items: [
    ["Platos trinchero blancos", String(totalPax)], ["Platos postre (negro/gris)", String(totalPax)],
    ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ["Tenedores / Cuchillos / Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cucharas postre", String(totalPax)],
    ["Bandejas metálicas y madera", "—"], ["Jarras de cristal", "—"], ["Abridores", "2"],
  ]});

  cats.push({ nombre: "Desechables y Bebidas", items: [
    ["Servilletas (grandes / cocktail)", `${Math.ceil(totalPax / 40)} paq.`],
    ["Bandejas de cartón blancas + blondas", `${Math.ceil(totalPax / 20)} paq.`],
    ["Platitos de cartón / Envase bocadillos", String(totalPax)],
    ["Palitos brocheta", `${Math.ceil(totalPax / 20)} paq.`], ["Palitos café", `${Math.ceil(totalPax / 30)} paq.`],
    ["Calentador de agua", "1"], ["Kit té matcha", "1"], ["Infusiones varias", "1 caja"],
    ["Leches variadas (sin/normal/avena)", "4"], ["Cacao y canela", "1"], ["Leche condensada", "1"],
    ["Vasos de cartón (L/M/S)", `${Math.ceil(totalPax / 20)} paq.`], ["Bolsas grandes de papel", "1 paq."],
    ["Coca-Cola (Normal / Zero)", String(Math.round(totalPax * 1.5))],
    ["Fanta (Limón / Naranja / Aquarius)", String(Math.round(totalPax * 0.8))],
    ["Aguas (2L / pequeñas)", `${Math.round(totalPax * 0.5)} packs`], ["Agua con gas", String(Math.round(totalPax * 0.15))],
    ["Hielo", `${Math.max(2, Math.ceil(totalPax / 30))} taxis`],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno));

  cats.push({ nombre: "Limpieza y Despensa", items: [
    ["Caja limpieza (Fairy, estropajo, film, etc.)", "1"], ["Papel Chemine", "3 rollo"],
    ["Cajas vacías", "2"], ["Ceniceros", "—"],
  ]});

  return cats;
}

// ─── WORD EXPORT ──────────────────────────────────────────────────────────────
function generarHTMLWord(evtKey, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist) {
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
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
    .meta{display:flex;gap:32px;background:#f3f4f6;padding:12px 16px;border-radius:4px;margin:16px 0;font-size:10pt;}
    .ml{font-weight:bold;color:#555;font-size:9pt;text-transform:uppercase;display:block;}
    .notas{margin-top:24px;border:1px solid #ddd;padding:12px;min-height:80px;border-radius:4px;}
    @media print{body{margin:10px}}</style>
    </head><body>
    <h1>CHECKLIST DE EVENTO — ${EVENTOS[evtKey]?.label?.toUpperCase()} · ${pax} PAX</h1>
    <div class="meta">
      <div><span class="ml">Fecha generación</span>${fecha}</div>
      <div><span class="ml">PAX total</span>${pax + ninos} (${pax} adultos${ninos > 0 ? ` + ${ninos} niños` : ""})</div>
      <div><span class="ml">Barra libre</span>${barraCoctel ? `Cóctel ${horasCoctel}h` : "—"}${barraCopas ? ` + Copas ${horasCopas}h` : ""}</div>
    </div>
    ${secciones}
    <div class="notas"><strong>NOTAS:</strong><br/><br/></div>
    </body></html>`;
}

// ─── MODAL VISTA PREVIA ───────────────────────────────────────────────────────
function ModalVistaPrevia({ checklist, evtKey, pax, ninos, onClose }) {
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 820, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden", animation: "slideUpFade 0.3s ease both" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "#1f314d", color: "white", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>CHECKLIST DE EVENTO</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: 2 }}>{EVENTOS[evtKey]?.label?.toUpperCase()} · {pax} PAX · {fecha}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "1rem" }}>✕ Cerrar</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {checklist.map(cat => (
            <div key={cat.nombre}>
              <div style={{ background: "#1f314d", color: "white", padding: "8px 12px", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{cat.nombre}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Concepto", "Cant.", "Sale ✓", "Vuelve ✓", "Roturas"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map(([label, qty], i) => {
                    const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                    return (
                      <tr key={i} style={{ background: alq ? "#fdf6e3" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "8px 10px" }}>
                          {label}
                          {alq && <span style={{ background: "#f59e0b", color: "white", fontSize: "0.65rem", fontWeight: 800, padding: "1px 5px", borderRadius: 3, marginLeft: 6 }}>ALQUILER</span>}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#16a34a" }}>{qty.u ? qty.u : qty}</td>
                        <td style={{ padding: "8px 10px", width: 50 }}></td>
                        <td style={{ padding: "8px 10px", width: 50 }}></td>
                        <td style={{ padding: "8px 10px", width: 50 }}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          <div style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, minHeight: 80 }}>
            <strong style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#6b7280" }}>NOTAS</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL IMPORTAR SHEET ─────────────────────────────────────────────────────
function ModalImportSheet({ onClose, onImport }) {
  const [url, setUrl]               = useState("");
  const [cargando, setCargando]     = useState(false);
  const [error, setError]           = useState("");
  const [sheetData, setSheetData]   = useState(null); // { headers, rows }
  const [filaIdx, setFilaIdx]       = useState(0);
  const [mapeo, setMapeo]           = useState({}); // campo.key → nombre columna del sheet
  const [paso, setPaso]             = useState(1); // 1=URL, 2=mapeo, 3=fila
  const [gidDetectado, setGidDetectado] = useState(null);

  const extractSheetId = (u) => {
    const m = u.match(/\/spreadsheets\/d\/([\w-]+)/);
    return m ? m[1] : null;
  };

  const extractGid = (u) => {
    const m = u.match(/[#&]gid=(\d+)/);
    return m ? m[1] : null;
  };

  const fetchSheet = async () => {
    setError(""); setCargando(true);
    const id = extractSheetId(url);
    if (!id) { setError("URL inválida. Asegúrate de pegar el link completo del Google Sheet."); setCargando(false); return; }
    const gid = extractGid(url);
    setGidDetectado(gid);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ""}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("No se pudo acceder al sheet. ¿Está compartido con 'Cualquier persona con el link puede ver'?");
      const text = await res.text();
      const data = parseCSV(text);
      if (data.headers.length === 0) throw new Error("El archivo parece estar vacío.");
      setSheetData(data);
      // Mapeo automático inteligente: busca coincidencias por nombre
      const autoMapeo = {};
      CAMPOS_LOGISTICA.forEach(campo => {
        const found = data.headers.find(h => {
          const hn = h.toLowerCase();
          const kw = campo.label.toLowerCase();
          return hn.includes(kw.split(" ")[0]) || hn.includes(campo.key.toLowerCase());
        });
        if (found) autoMapeo[campo.key] = found;
      });
      setMapeo(autoMapeo);
      setPaso(2);
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  const aplicarImportacion = () => {
    const fila = sheetData.rows[filaIdx];
    const resultado = {};
    CAMPOS_LOGISTICA.forEach(campo => {
      const col = mapeo[campo.key];
      if (col && fila[col] !== undefined && fila[col] !== "") {
        resultado[campo.key] = parseValor(fila[col], campo.tipo);
      }
    });
    onImport(resultado);
    onClose();
  };

  const selectStyle = {
    padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem",
    background: "white", color: "#374151", width: "100%", cursor: "pointer",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 680, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: "#1f314d", color: "white", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>📊 Importar desde Google Sheets</div>
            <div style={{ opacity: 0.6, fontSize: "0.8rem", marginTop: 2 }}>
              Paso {paso} de 3: {paso === 1 ? "Pega el link del Sheet" : paso === 2 ? "Mapea las columnas" : "Elige el evento a importar"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* PASO 1: URL */}
          {paso === 1 && (
            <>
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 14, fontSize: "0.85rem", color: "#0369a1" }}>
                ℹ️ El Google Sheet debe estar <strong>compartido con "Cualquier persona con el link puede ver"</strong>.<br/>
                Ve a tu Sheet → Compartir → Cambiar a cualquier persona con el vínculo → Solo lectura.<br/><br/>
                📑 <strong>¿Tu Sheet tiene varias pestañas?</strong> Abre la pestaña que quieres importar dentro de Google Sheets (la URL cambiará a algo como <code>.../edit#gid=123456789</code>) y pega esa URL exacta aquí. Si pegas la URL sin pestaña concreta, se leerá la primera.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>Link del Google Sheet</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchSheet()}
                  style={{ ...selectStyle, padding: "12px 14px", fontSize: "0.95rem" }}
                />
                {extractGid(url) && (
                  <span style={{ alignSelf: "flex-start", background: "#eef2ff", color: "#4338ca", fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>
                    Pestaña detectada: gid={extractGid(url)}
                  </span>
                )}
              </div>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, color: "#dc2626", fontSize: "0.85rem" }}>⚠️ {error}</div>}
              <button onClick={fetchSheet} disabled={cargando || !url.trim()} style={{ background: "#1f314d", color: "white", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", opacity: cargando || !url.trim() ? 0.6 : 1 }}>
                {cargando ? "Cargando..." : "Conectar con el Sheet →"}
              </button>
            </>
          )}

          {/* PASO 2: MAPEO DE COLUMNAS */}
          {paso === 2 && sheetData && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, fontSize: "0.85rem", color: "#15803d" }}>
                ✓ Sheet cargado correctamente{gidDetectado ? ` (pestaña gid=${gidDetectado})` : " (primera pestaña)"} — {sheetData.headers.length} columnas, {sheetData.rows.length} filas. He intentado mapear automáticamente las columnas. Ajusta las que sean incorrectas.
              </div>
              <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Para cada campo logístico, elige qué columna del Sheet lo contiene. Deja en "— Sin mapear" los que no apliquen.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {CAMPOS_LOGISTICA.map(campo => (
                  <div key={campo.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.3px" }}>{campo.label}</label>
                    <select
                      style={selectStyle}
                      value={mapeo[campo.key] || ""}
                      onChange={e => setMapeo(prev => ({ ...prev, [campo.key]: e.target.value || undefined }))}
                    >
                      <option value="">— Sin mapear</option>
                      {sheetData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapeo[campo.key] && sheetData.rows[0] && (
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic" }}>
                        Ej: {sheetData.rows[0][mapeo[campo.key]]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setPaso(1)} style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600, color: "#374151" }}>← Atrás</button>
                <button onClick={() => setPaso(3)} style={{ background: "#1f314d", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", flex: 1 }}>Continuar →</button>
              </div>
            </>
          )}

          {/* PASO 3: ELEGIR FILA */}
          {paso === 3 && sheetData && (
            <>
              <p style={{ fontWeight: 600, color: "#374151" }}>Elige el evento a importar ({sheetData.rows.length} filas disponibles):</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {sheetData.rows.map((fila, idx) => {
                  const etiqueta = mapeo.evento ? fila[mapeo.evento] : "";
                  const paxLabel = mapeo.pax ? fila[mapeo.pax] : "";
                  const cols = sheetData.headers.slice(0, 3).map(h => `${h}: ${fila[h]}`).join(" · ");
                  return (
                    <button key={idx} onClick={() => setFilaIdx(idx)} style={{ textAlign: "left", padding: "12px 16px", border: `2px solid ${filaIdx === idx ? "#1f314d" : "#e5e7eb"}`, borderRadius: 8, background: filaIdx === idx ? "#f0f4ff" : "white", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ fontWeight: 600, color: "#1f314d", fontSize: "0.9rem" }}>Fila {idx + 1} {etiqueta ? `· ${etiqueta}` : ""} {paxLabel ? `· ${paxLabel} pax` : ""}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 3 }}>{cols}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={() => setPaso(2)} style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600, color: "#374151" }}>← Atrás</button>
                <button onClick={aplicarImportacion} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", flex: 1 }}>
                  ✓ Importar y generar checklist
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
  const [pax, setPax]               = useState(80);
  const [ninos, setNinos]           = useState(0);
  const [barraCoctel, setBarraCoctel] = useState(true);
  const [horasCoctel, setHorasCoctel] = useState(2);
  const [barraCopas, setBarraCopas]   = useState(false);
  const [horasCopas, setHorasCopas]   = useState(4);
  const [dobleServicio, setDobleServicio]             = useState(false);
  const [llevaEntrante, setLlevaEntrante]             = useState(false);
  const [llevaPaella, setLlevaPaella]                 = useState(false);
  const [llevaArmarioCaliente, setLlevaArmarioCaliente] = useState(false);
  const [numCamareros, setNumCamareros]                 = useState(0);
  const [tipoBandejas, setTipoBandejas] = useState("Mixto");
  const [tipoHorno, setTipoHorno]       = useState("Pequeño");
  const [tipoBBQ, setTipoBBQ]           = useState("No lleva");
  const [mesVerano, setMesVerano]               = useState(true);
  const [tieneCongelador, setTieneCongelador]   = useState(false);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(false);
  const [tieneFrituras, setTieneFrituras]       = useState(false);
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
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  const [modalPrevia, setModalPrevia]   = useState(false);
  const [modalSheet, setModalSheet]     = useState(false);
  const [compartirMsg, setCompartirMsg] = useState("");
  const [importedTag, setImportedTag]   = useState("");

  const opts = {
    dobleServicio, llevaPaella, mesVerano, tieneCongelador, tieneBrindisCava,
    fuerzaTextilTela, tieneFrituras, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
  };

  const checklist = useMemo(() =>
    buildChecklist(evento, pax, barraCoctel ? horasCoctel : 0, barraCopas ? horasCopas : 0, ninos, opts),
    [evento, pax, barraCoctel, horasCoctel, barraCopas, horasCopas, ninos, opts]
  );

  const filtered = useMemo(() => {
    if (!filtro.trim()) return checklist;
    const q = filtro.toLowerCase();
    return checklist.map(c => ({ ...c, items: c.items.filter(i => i[0].toLowerCase().includes(q)) })).filter(c => c.items.length > 0);
  }, [checklist, filtro]);

  const totalConceptos = checklist.reduce((acc, c) => acc + c.items.length, 0);
  const toggleCategory = (catName) => setOpenCategories(prev => ({ ...prev, [catName]: prev[catName] !== false ? false : true }));

  // Aplicar datos importados del Sheet, sin pisar campos que el usuario ya tocó a mano
  // (solo se aplica el valor del Sheet si el campo sigue en su valor por defecto)
  const handleImport = useCallback((data) => {
    const importarSi = (campo, valor, setter) => {
      if (valor == null) return;
      setter(prev => (prev === DEFAULTS[campo] ? valor : prev));
    };
    if (data.evento) importarSi("evento", data.evento, setEvento);
    importarSi("pax", data.pax, setPax);
    importarSi("ninos", data.ninos, setNinos);
    if (data.horasCoctel != null) {
      importarSi("horasCoctel", data.horasCoctel || 2, setHorasCoctel);
      setBarraCoctel(prev => (prev === true ? prev : data.horasCoctel > 0));
    }
    if (data.horasCopas != null) {
      importarSi("horasCopas", data.horasCopas || 4, setHorasCopas);
      setBarraCopas(prev => (prev === false ? data.horasCopas > 0 : prev));
    }
    importarSi("llevaPaella", data.llevaPaella, setLlevaPaella);
    importarSi("tipoHorno", data.tipoHorno, setTipoHorno);
    importarSi("tipoBBQ", data.tipoBBQ, setTipoBBQ);
    importarSi("llevaArmarioCaliente", data.llevaArmarioCaliente, setLlevaArmarioCaliente);
    importarSi("tieneFrituras", data.tieneFrituras, setTieneFrituras);
    importarSi("llevaEntrante", data.llevaEntrante, setLlevaEntrante);
    importarSi("mesVerano", data.mesVerano, setMesVerano);
    importarSi("tieneCongelador", data.tieneCongelador, setTieneCongelador);
    importarSi("tieneBrindisCava", data.tieneBrindisCava, setTieneBrindisCava);
    importarSi("dobleServicio", data.dobleServicio, setDobleServicio);
    importarSi("tipoBandejas", data.tipoBandejas, setTipoBandejas);
    importarSi("fuerzaTextilTela", data.fuerzaTextilTela, setFuerzaTextilTela);
    importarSi("numCamareros", data.numCamareros, setNumCamareros);
    importarSi("llevaPalomitera", data.llevaPalomitera, setLlevaPalomitera);
    importarSi("llevaJarrasCristal", data.llevaJarrasCristal, setLlevaJarrasCristal);
    importarSi("tipoCafetera", data.tipoCafetera, setTipoCafetera);
    importarSi("extraBandejasMadera", data.extraBandejasMadera, setExtraBandejasMadera);
    importarSi("extraBandejasPlata", data.extraBandejasPlata, setExtraBandejasPlata);
    importarSi("llevaJamonero", data.llevaJamonero, setLlevaJamonero);
    importarSi("personasPorPlatoEntrante", data.personasPorPlatoEntrante, setPersonasPorPlatoEntrante);
    importarSi("llevaAguasPequenas", data.llevaAguasPequenas, setLlevaAguasPequenas);
    importarSi("hayDesayuno", data.hayDesayuno, setHayDesayuno);
    setImportedTag("✓ Datos importados del Sheet");
    setTimeout(() => setImportedTag(""), 3000);
  }, []);

  const handleDescargar = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist);
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Checklist_${EVENTOS[evento]?.label?.replace(/ /g, "_")}_${pax}pax.doc`;
    a.click();
  };

  const handleCompartir = () => {
    const texto = checklist.map(cat => `\n▶ ${cat.nombre.toUpperCase()}\n` + cat.items.map(([l, q]) => `  • ${l}: ${q.u ? q.u : q}`).join("\n")).join("\n");
    navigator.clipboard.writeText(`CHECKLIST ${EVENTOS[evento]?.label?.toUpperCase()} · ${pax} pax\n${texto}`).then(() => {
      setCompartirMsg("¡Copiado! ✓");
      setTimeout(() => setCompartirMsg(""), 2500);
    });
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
      {modalPrevia && <ModalVistaPrevia checklist={checklist} evtKey={evento} pax={pax} ninos={ninos} onClose={() => setModalPrevia(false)} />}
      {modalSheet  && <ModalImportSheet onClose={() => setModalSheet(false)} onImport={handleImport} />}

      <div className="app-wrapper">
        {/* HEADER */}
        <header className="app-header animate-entrance">
          <div className="header-title-group">
            <div className="header-icon">{EVENTOS[evento]?.icon || "📋"}</div>
            <div className="header-info">
              <h1>{EVENTOS[evento]?.label || "Generador Checklist"}</h1>
              <p>{pax} pax · cóctel {barraCoctel ? horasCoctel : 0}h · {totalConceptos} conceptos</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => setModalPrevia(true)}>Vista previa</button>
            <button className="btn btn-outline" onClick={handleCompartir}>{compartirMsg || "Compartir"}</button>
            <button className="btn btn-green" onClick={handleDescargar}>Descargar Word</button>
          </div>
        </header>

        {/* IMPORT SHEET BANNER */}
        <button
          className="add-material-btn animate-entrance"
          style={{ animationDelay: "0.05s", background: importedTag ? "#f0fdf4" : "white", borderColor: importedTag ? "#bbf7d0" : undefined, color: importedTag ? "#16a34a" : undefined }}
          onClick={() => setModalSheet(true)}
        >
          <span>📊 {importedTag || "Importar datos desde Google Sheets"}</span>
          <span style={{ fontSize: 12 }}>→</span>
        </button>

        {/* CONFIG */}
        <div className="config-card animate-entrance" style={{ animationDelay: "0.1s" }}>
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
          </div>
          <div className="form-row">
            {numCamareros > 0
              ? <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: "0.85rem", color: "#16a34a" }}>
                  ✓ Nº camareros importado del Excel → <strong>{numCamareros} unidades</strong> de bandeja camarero
                </div>
              : <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem", color: "#9ca3af" }}>
                  Bandeja camarero → se calculará automáticamente por pax (importa el Excel para fijar el nº de camareros)
                </div>
            }
          </div>
          <hr />
          <div className="form-row">
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCoctel} onChange={e => setBarraCoctel(e.target.checked)} />
                BARRA LIBRE CÓCTEL / APERITIVO
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="6" step="0.5" className="range-slider" value={horasCoctel} onChange={e => setHorasCoctel(parseFloat(e.target.value))} disabled={!barraCoctel} />
                <span className="range-value">{horasCoctel}h</span>
              </div>
            </div>
            <div className="range-group" style={{ gridColumn: "span 2" }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCopas} onChange={e => setBarraCopas(e.target.checked)} />
                BARRA LIBRE COPAS
              </label>
              <div className="range-slider-container" style={{ maxWidth: "50%" }}>
                <input type="range" min="0" max="12" step="1" className="range-slider" value={horasCopas} onChange={e => setHorasCopas(parseFloat(e.target.value))} disabled={!barraCopas} />
                <span className="range-value">{horasCopas}h</span>
              </div>
            </div>
          </div>
          <hr />
          <div className="checkbox-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              [dobleServicio,        setDobleServicio,        "Doble servicio",          "dobla cubierto, copa y plato"],
              [llevaEntrante,        setLlevaEntrante,        "Lleva entrante",           "chupito de cristal"],
              [llevaPaella,          setLlevaPaella,          "Lleva paella",             "calcula paelleros completos"],
              [llevaArmarioCaliente, setLlevaArmarioCaliente, "Armario caliente",         "alquiler Dealde"],
              [tieneFrituras,        setTieneFrituras,        "Hay frituras",             "sartén parisiene"],
              [tieneBrindisCava,     setTieneBrindisCava,     "Brindis con cava",         "dobla copas de cava"],
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de chuches/palomitas, alquiler"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              [llevaAguasPequenas,   setLlevaAguasPequenas,   "Aguas pequeñas",           "botellas individuales 33/50cl"],
              [hayDesayuno,          setHayDesayuno,          "Hay desayuno",             "sandwichera + más tazas de café"],
              ...((evento === "boda" || evento === "comunion")
                ? [[llevaJarrasCristal, setLlevaJarrasCristal, "Jarras de cristal", "para agua/zumos en mesa"]]
                : []),
            ].map(([val, fn, lab, sub]) => (
              <label key={lab} className="checkbox-label-normal">
                <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                {lab} <span>· {sub}</span>
              </label>
            ))}
          </div>
          {llevaEntrante && (
            <div style={{ marginTop: 12 }}>
              <SegmentedControl label="Plato de entrante compartido cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
            </div>
          )}
          <hr />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-end" }}>
              <SegmentedControl label="Bandejas de servicio" value={tipoBandejas} onChange={setTipoBandejas} options={["Madera", "Plata", "Mixto"]} />
              <div className="form-group" style={{ maxWidth: 160 }}>
                <span className="form-label">Madera extra</span>
                <input type="number" className="form-input" value={extraBandejasMadera || ""} placeholder="0" min="0" onChange={e => setExtraBandejasMadera(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group" style={{ maxWidth: 160 }}>
                <span className="form-label">Plata extra</span>
                <input type="number" className="form-input" value={extraBandejasPlata || ""} placeholder="0" min="0" onChange={e => setExtraBandejasPlata(parseInt(e.target.value) || 0)} />
              </div>
              <SegmentedControl label="Horno" value={tipoHorno} onChange={setTipoHorno} options={["Pequeño", "Grande", "Ambos"]} />
              <SegmentedControl label="Cafetera" value={tipoCafetera} onChange={setTipoCafetera} options={["Nespresso", "Bar", "Grande"]} />
            </div>
            <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="animate-entrance" style={{ animationDelay: "0.2s" }}>
          <input type="text" className="search-input-main" placeholder="Buscar un material..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>

        {/* CATEGORÍAS */}
        {filtered.map((cat, idx) => {
          const isOpen = openCategories[cat.nombre] !== false;
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s` }}>
              <div className="category-header" onClick={() => toggleCategory(cat.nombre)}>
                {cat.nombre}
                <span className="cat-count">{cat.items.length} ▼</span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty], i) => {
                    const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                    return (
                      <div key={i} className={`item-row ${alq ? "is-alquiler" : ""}`}>
                        <div className="item-name">
                          {label}
                          {alq && <span className="tag-alquiler">ALQUILER</span>}
                        </div>
                        <div className="item-qty">{qty.u ? qty.u : qty}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
