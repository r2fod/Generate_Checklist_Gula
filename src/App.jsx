import React, { useState, useMemo } from "react";

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

// Campos logísticos que se pueden mapear desde el Sheet.
// "sinonimos" alimenta el mapeo automático: cuantas más palabras tenga un sinónimo,
// más específico y prioritario es a la hora de reservar una columna del Sheet.
const CAMPOS_LOGISTICA = [
  { key: "pax",              label: "PAX adultos",             tipo: "numero", sinonimos: ["pax adultos", "numero de adultos", "nº adultos", "adultos", "invitados", "comensales", "asistentes", "pax"] },
  { key: "ninos",            label: "Niños",                   tipo: "numero", sinonimos: ["numero de ninos", "ninos", "menores"] },
  { key: "evento",           label: "Tipo de evento",          tipo: "evento", sinonimos: ["tipo de evento", "tipo evento", "clase de evento", "evento"] },
  { key: "horasCoctel",      label: "Horas barra cóctel",      tipo: "numero", sinonimos: ["horas barra coctel", "horas de coctel", "barra coctel", "horas aperitivo", "coctel"] },
  { key: "horasCopas",       label: "Horas barra copas",       tipo: "numero", sinonimos: ["horas barra copas", "horas de copas", "barra libre copas", "copas"] },
  { key: "llevaPaella",      label: "Lleva paella",            tipo: "bool", sinonimos: ["lleva paella", "hay paella", "paella"] },
  { key: "tipoHorno",        label: "Tipo de horno",           tipo: "horno", sinonimos: ["tipo de horno", "tamano de horno", "horno"] },
  { key: "tipoBBQ",          label: "Barbacoa",                tipo: "bbq", sinonimos: ["tipo de barbacoa", "barbacoa", "bbq", "parrilla"] },
  { key: "llevaArmarioCaliente", label: "Armario caliente (Alquiler)", tipo: "bool", sinonimos: ["armario caliente", "armario"] },
  { key: "tieneFrituras",    label: "Frituras",                tipo: "bool", sinonimos: ["hay frituras", "frituras", "fritos"] },
  { key: "llevaEntrante",    label: "Lleva entrante (chupito)", tipo: "bool", sinonimos: ["lleva entrante", "entrante", "chupito"] },
  { key: "mesVerano",        label: "Temporada verano",        tipo: "bool", sinonimos: ["temporada verano", "temporada", "epoca del ano", "mes del evento", "verano"] },
  { key: "tieneCongelador",  label: "Finca con congelador",    tipo: "bool", sinonimos: ["finca con congelador", "finca congelador", "tiene congelador"] },
  { key: "tieneBrindisCava", label: "Brindis con cava",        tipo: "bool", sinonimos: ["brindis con cava", "brindis", "hay cava"] },
  { key: "dobleServicio",    label: "Doble servicio",          tipo: "bool", sinonimos: ["doble servicio", "servicio doble"] },
  { key: "tipoBandejas",     label: "Tipo de bandejas",        tipo: "bandejas", sinonimos: ["tipo de bandejas", "bandejas de servicio", "bandejas"] },
  { key: "fuerzaTextilTela", label: "Servilletas de tela",     tipo: "bool", sinonimos: ["servilletas de tela", "servilletas tela"] },
  { key: "numCamareros",     label: "Nº camareros / personal sala", tipo: "numero", sinonimos: ["numero de camareros", "nº camareros", "personal de sala", "camareros"] },
  { key: "llevaPalomitera",  label: "Lleva palomitera/carrito", tipo: "bool", sinonimos: ["lleva palomitera", "carrito de palomitas", "palomitera", "palomitas"] },
  { key: "llevaJarrasCristal", label: "Jarras de cristal",     tipo: "bool", sinonimos: ["jarras de cristal", "jarras"] },
  { key: "tipoCafetera",     label: "Tipo de cafetera",        tipo: "cafetera", sinonimos: ["tipo de cafetera", "cafetera"] },
  { key: "extraBandejasMadera", label: "Bandejas de madera extra", tipo: "numero", sinonimos: ["bandejas de madera extra", "bandejas de madera", "madera extra"] },
  { key: "extraBandejasPlata",  label: "Bandejas de plata extra",  tipo: "numero", sinonimos: ["bandejas de plata extra", "bandejas de plata", "plata extra"] },
  { key: "llevaJamonero",    label: "Hay jamonero",            tipo: "bool", sinonimos: ["hay jamonero", "jamonero", "corte de jamon"] },
  { key: "personasPorPlatoEntrante", label: "Personas por plato de entrante", tipo: "numero", sinonimos: ["personas por plato de entrante", "personas por plato", "plato de entrante compartido"] },
  { key: "llevaAguasPequenas", label: "Aguas pequeñas",        tipo: "bool", sinonimos: ["aguas pequenas", "agua pequena", "botellines de agua"] },
  { key: "hayDesayuno",      label: "Hay desayuno",            tipo: "bool", sinonimos: ["hay desayuno", "desayuno", "coffee break"] },
  { key: "tipoNevera",       label: "Tamaño de nevera",        tipo: "tamano", sinonimos: ["tamano de nevera", "tipo de nevera", "nevera"] },
  { key: "tipoCongelador",   label: "Tamaño de congelador",    tipo: "tamano", sinonimos: ["tamano de congelador", "tipo de congelador", "congelador"] },
  { key: "tipoPaella",       label: "Tamaño de paella",        tipo: "tamanoPaella", sinonimos: ["tamano de paella", "tipo de paella", "talla de paella"] },
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
  hayDesayuno: false, tipoNevera: "Mediana", tipoCongelador: "Mediana", tipoPaella: "Auto",
};

// ─── PARSE CSV ────────────────────────────────────────────────────────────────
// Parser de una sola pasada sobre todo el texto (no separa por "\n" de antemano):
// las celdas de un Google Sheet pueden contener saltos de línea entre comillas
// (notas, observaciones...), y partir por líneas primero desplazaba las columnas
// de todas las filas siguientes a esa celda, corrompiendo la importación entera.
function parseCSV(text) {
  const filas = [];
  let fila = [], celda = "", enComillas = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (enComillas) {
      if (c === '"') {
        if (text[i + 1] === '"') { celda += '"'; i++; } // comilla escapada ""
        else enComillas = false;
      } else {
        celda += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      fila.push(celda.trim()); celda = "";
    } else if (c === "\r") {
      // ignorar, lo gestiona el \n siguiente
    } else if (c === "\n") {
      fila.push(celda.trim()); celda = "";
      filas.push(fila); fila = [];
    } else {
      celda += c;
    }
  }
  if (celda !== "" || fila.length > 0) { fila.push(celda.trim()); filas.push(fila); }

  const noVacias = filas.filter(f => f.some(v => v !== ""));
  if (noVacias.length < 2) return { headers: [], rows: [] };
  const headers = noVacias[0];
  const rows = noVacias.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v.trim() !== ""));
  return { headers, rows };
}

// Quita acentos, pasa a minúsculas y limpia puntuación para comparar cabeceras de forma robusta
function normalizar(s) {
  return s.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Mapeo automático columna del Sheet → campo logístico.
// Compara por palabras completas (no substring suelto) para evitar falsos positivos
// como "Junio Evento" matcheando el campo "Tipo de evento" solo por contener "evento",
// prioriza sinónimos más largos/específicos, y nunca reutiliza la misma columna dos veces.
function autoMapearColumnas(headers, campos) {
  const cabeceras = headers.map(h => ({ original: h, norm: normalizar(h), palabras: normalizar(h).split(" ").filter(Boolean) }));
  const usadas = new Set();
  const mapeo = {};
  const ordenados = [...campos].sort((a, b) => {
    const maxA = Math.max(...a.sinonimos.map(s => s.split(" ").length));
    const maxB = Math.max(...b.sinonimos.map(s => s.split(" ").length));
    return maxB - maxA;
  });
  ordenados.forEach(campo => {
    let mejor = null, mejorScore = 0;
    cabeceras.forEach(h => {
      if (usadas.has(h.original)) return;
      campo.sinonimos.forEach(syn => {
        const synNorm = normalizar(syn);
        if (h.norm === synNorm) { mejorScore = 1000; mejor = h; return; }
        const synPalabras = synNorm.split(" ").filter(Boolean);
        const todasPresentes = synPalabras.every(p => h.palabras.includes(p));
        if (todasPresentes) {
          const score = synPalabras.length * 10 + (synPalabras.length === h.palabras.length ? 5 : 0);
          if (score > mejorScore) { mejorScore = score; mejor = h; }
        }
      });
    });
    if (mejor && mejorScore > 0) { mapeo[campo.key] = mejor.original; usadas.add(mejor.original); }
  });
  return mapeo;
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
      if (v.includes("produ") || v.includes("shooting") || v.includes("rodaje")) return "produccion";
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
    case "tamano": return v.includes("grande") ? "Grande" : "Mediana";
    case "tamanoPaella": {
      if (v.includes("pequeñ") || v.includes("pequen")) return "Pequeña";
      if (v.includes("grande")) return "Grande";
      if (v.includes("median")) return "Mediana";
      return "Auto";
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
    [`Leches variadas (entera/desnatada/sin lactosa/avena)${hayDesayuno ? " (desayuno)" : ""}`, String(Math.max(4, Math.ceil(totalPax / (hayDesayuno ? 15 : 40))))],
    ["Jarras de leche", String(Math.max(2, Math.ceil(totalPax / 40)))],
  );
  // Coffee break / desayuno: bollería, fruta y zumos (habitual en eventos corporativos y desayunos)
  if (hayDesayuno) {
    items.push(
      ["Bollería variada (mini)", `${Math.ceil(totalPax * 1.5)} uds.`],
      ["Fruta fresca (brocheta/macedonia)", String(totalPax)],
      ["Zumos naturales", `${Math.ceil(totalPax / 10)} packs`],
    );
  }
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
    mesVerano, tieneCongelador, tieneBrindisCava, fuerzaTextilTela,
    tieneFrituras, llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    tipoNevera, tipoCongelador, tipoPaella,
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
    ...(llevaPaella ? [["Descansadores de paella", String(calcPaella(pax, tipoPaella).n)]] : []),
    ["Cubo basura cocina", "2"], ["Champanera metálica grande", "4"],
    ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores cerveza", "2"],
    ["Bandeja camarero", String(personalSala(pax, numCamareros))],
    ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
    [`Nevera (${tipoNevera})`, "1"], [`Congelador (${tipoCongelador})`, "1"], ["Nevera roja", "—"],
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),

    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
  ]});

  const numPaella  = llevaPaella ? calcPaella(pax, tipoPaella).n : 0;
  const numFritura = tieneFrituras ? 1 : 0;
  const bombonas   = numPaella + numFritura + 2;
  const cocinaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella);
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
    ...(llevaPaella ? [["Paletas de paella", String(calcPaella(pax, tipoPaella).n)]] : []),
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
    ["Manteles beige", String(calcMesasTotal(evtKey, pax) + 2)], ["Delantales cocina y sala", String(personalSala(pax, numCamareros) + 2)],
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
    llevaArmarioCaliente, llevaPalomitera, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    tipoPaella,
  } = opts;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;

  const bebidas = calcBebidas(pax, hayBarra ? horasBarraTotal : 2, mesVerano, tieneCongelador);
  const cristal = calcCristaleria(pax, hayBarra ? horasBarraTotal : 2, dobleServicio, tieneBrindisCava, llevaEntrante);
  const bandejasMadera = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
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
    ["Bandeja camareros", String(personalSala(pax, opts.numCamareros))],
    ["Pinzas", "2"], ["Copas metálicas y conchas", "—"],
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),
    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
  ]});

  const cocinaItems = [
    ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + (tieneFrituras ? 1 : 0) + 1)],
  ];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande (Alquiler Dealde)", "1", true]);
  cocinaItems.push(["Microondas", "1"], ["Batidora / Túrmix", "1"], ["Vitro", "1"], ["Aceiteras / Saleros / Pimenteros", "1/2 de cada"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (tieneFrituras) cocinaItems.push(["Sartén Parisiene (frituras)", "1"], ["Paravientos", "1"]);
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella);
    cocinaItems.push([`Paella ${p.talla}`, String(p.n)], ["Trípodes", String(p.n)], ["Descansadores paella", "2"]);
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
  const {
    llevaPaella, tieneFrituras, tipoCafetera, dobleServicio, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, llevaJamonero, llevaAguasPequenas,
    llevaEntrante, personasPorPlatoEntrante, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    tipoPaella, numCamareros,
  } = opts;
  const totalPax = pax + ninos;
  const bandejasMadera = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Madera" ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasMadera;
  const bandejasPl     = (tipoBandejas === "Mixto" ? Math.max(2, Math.ceil(pax / 20)) : (tipoBandejas === "Plata"  ? Math.max(2, Math.ceil(pax / 10)) : 0)) + extraBandejasPlata;
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
    ["Bandeja camareros", String(personalSala(pax, numCamareros))],
    ...(llevaPalomitera ? [["Carrito palomitera", "1"]] : []),
  ]});

  cats.push({ nombre: "Cocina y sala", items: [
    ["Plancha de gas", "1"], ["Bombonas llenas", String((llevaPaella ? calcPaella(pax, tipoPaella).n : 0) + (tieneFrituras ? 1 : 0) + 1)],
    ["Horno pequeño / Microondas", "1"], ["Batidora / Túrmix", "1"], ["Mesas calientes", "—"],
    ["Vitro", "1"], ["Butano", "1"], ["Trípode", "1"], ["Termos con tapa", "—"],
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
    ...(tieneFrituras ? [["Sartén Parisiene (frituras)", "1"]] : []),
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    ["Manteles negros", String(calcMesasServicio(pax).total + 1)],
    ["Delantales", String(personalSala(pax, numCamareros) + 2)], ["Bayetas / Trapos", "4"],
  ]});

  cats.push({ nombre: "Vajilla y Cubertería", items: [
    ["Platos trinchero blancos", String(totalPax)], ["Platos postre (negro/gris)", String(totalPax)],
    ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ["Tenedores / Cuchillos / Cucharas grandes", String(totalPax * (dobleServicio ? 2 : 1))],
    ["Cucharas postre", String(totalPax)],
    ["Jarras de cristal", "—"], ["Abridores", "2"],
    ...(bandejasMadera > 0 ? [["Bandejas de madera", String(bandejasMadera)]] : []),
    ...(bandejasPl > 0     ? [["Bandejas de plata",  String(bandejasPl)]]     : []),
    ...(llevaJamonero ? [["Platos extra para Jamón", String(Math.ceil(pax * 0.3))]] : []),
    ...(llevaEntrante ? [[`Platos extra entrante (1 cada ${personasPorPlatoEntrante} pax)`, String(Math.ceil(totalPax / personasPorPlatoEntrante))]] : []),
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
    ["Aguas (2L / pequeñas)", `${Math.round(totalPax * 0.5)} packs`],
    ...(llevaAguasPequenas ? [["Aguas pequeñas (33/50cl)", String(Math.round(totalPax * 1))]] : []),
    ["Agua con gas", String(Math.round(totalPax * 0.15))],
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

// Extrae el listado real de pestañas (nombre + gid) de la vista pública htmlview de un Sheet.
// Google incrusta esto en un <script> como items.push({name: "...", pageUrl: "...", gid: "..."})
// una vez por pestaña, y el endpoint responde con CORS abierto, así que es fetcheable desde el navegador.
function parsePestanas(html) {
  const regex = /items\.push\(\{name:\s*"((?:\\.|[^"\\])*)"\s*,\s*pageUrl:\s*"(?:\\.|[^"\\])*"\s*,\s*gid:\s*"(-?\d+)"/g;
  const out = [];
  let m;
  while ((m = regex.exec(html))) {
    out.push({ name: m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"), gid: m[2] });
  }
  return out;
}

// ─── MODAL IMPORTAR SHEET ─────────────────────────────────────────────────────
function ModalImportSheet({ onClose, onImport }) {
  const [url, setUrl]               = useState("");
  const [cargando, setCargando]     = useState(false);
  const [error, setError]           = useState("");
  const [sheetId, setSheetId]       = useState(null);
  const [pestanas, setPestanas]     = useState([]); // [{name, gid}]
  const [pestanaUsada, setPestanaUsada] = useState(null); // nombre de la pestaña ya cargada
  const [sheetData, setSheetData]   = useState(null); // { headers, rows }
  const [filaIdx, setFilaIdx]       = useState(0);
  const [mapeo, setMapeo]           = useState({}); // campo.key → nombre columna del sheet
  const [mostrarMapeoManual, setMostrarMapeoManual] = useState(false);
  const [paso, setPaso]             = useState("url"); // url → pestana (solo si hay varias) → fila

  const extractSheetId = (u) => {
    const m = u.match(/\/spreadsheets\/d\/([\w-]+)/);
    return m ? m[1] : null;
  };

  const cargarPestana = async (id, gid, nombre) => {
    setError(""); setCargando(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid != null ? `&gid=${gid}` : ""}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("No se pudo leer esa pestaña del Sheet.");
      const text = await res.text();
      const data = parseCSV(text);
      if (data.headers.length === 0) throw new Error("Esa pestaña parece estar vacía.");
      setSheetData(data);
      setMapeo(autoMapearColumnas(data.headers, CAMPOS_LOGISTICA));
      setPestanaUsada(nombre || null);
      setPaso("fila");
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  // Paso 1: analiza el Sheet — detecta automáticamente sus pestañas
  const conectar = async () => {
    setError(""); setCargando(true);
    const id = extractSheetId(url);
    if (!id) { setError("URL inválida. Asegúrate de pegar el link completo del Google Sheet."); setCargando(false); return; }
    setSheetId(id);
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`);
      if (!res.ok) throw new Error("No se pudo acceder al Sheet. ¿Está compartido con 'Cualquier persona con el link puede ver'?");
      const html = await res.text();
      const detectadas = parsePestanas(html);
      if (detectadas.length > 1) {
        setPestanas(detectadas);
        setCargando(false);
        setPaso("pestana");
        return;
      }
      // Una sola pestaña (o no se pudo detectar el listado): cargar directamente
      await cargarPestana(id, detectadas[0]?.gid ?? null, detectadas[0]?.name ?? null);
      return;
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

  const tituloPaso = { url: "Pega el link del Sheet", pestana: "Elige la pestaña", fila: "Elige el evento a importar" }[paso];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 680, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: "#1f314d", color: "white", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>📊 Importar desde Google Sheets</div>
            <div style={{ opacity: 0.6, fontSize: "0.8rem", marginTop: 2 }}>{tituloPaso}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* PASO URL */}
          {paso === "url" && (
            <>
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 14, fontSize: "0.85rem", color: "#0369a1" }}>
                ℹ️ El Google Sheet debe estar <strong>compartido con "Cualquier persona con el link puede ver"</strong>.<br/>
                Ve a tu Sheet → Compartir → Cambiar a cualquier persona con el vínculo → Solo lectura.<br/><br/>
                Pega el link principal del Sheet (no hace falta que sea de una pestaña concreta): si tiene varias, te las mostraré para que elijas.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>Link del Google Sheet</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && conectar()}
                  style={{ ...selectStyle, padding: "12px 14px", fontSize: "0.95rem" }}
                />
              </div>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, color: "#dc2626", fontSize: "0.85rem" }}>⚠️ {error}</div>}
              <button onClick={conectar} disabled={cargando || !url.trim()} style={{ background: "#1f314d", color: "white", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", opacity: cargando || !url.trim() ? 0.6 : 1 }}>
                {cargando ? "Analizando el Sheet..." : "Analizar Sheet →"}
              </button>
            </>
          )}

          {/* PASO PESTAÑA: solo aparece si el Sheet tiene más de una */}
          {paso === "pestana" && (
            <>
              <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Este Sheet tiene {pestanas.length} pestañas. Elige cuál quieres importar:</p>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, color: "#dc2626", fontSize: "0.85rem" }}>⚠️ {error}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {pestanas.map(p => (
                  <button
                    key={p.gid}
                    disabled={cargando}
                    onClick={() => cargarPestana(sheetId, p.gid, p.name)}
                    style={{ textAlign: "left", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "white", cursor: cargando ? "default" : "pointer", fontWeight: 600, color: "#1f314d", opacity: cargando ? 0.6 : 1 }}
                  >
                    📑 {p.name}
                  </button>
                ))}
              </div>
              <button onClick={() => setPaso("url")} style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600, color: "#374151" }}>← Atrás</button>
            </>
          )}

          {/* PASO FILA: elegir el evento a importar, con mapeo automático ya aplicado */}
          {paso === "fila" && sheetData && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, fontSize: "0.85rem", color: "#15803d" }}>
                ✓ Pestaña "{pestanaUsada || "primera"}" cargada — {sheetData.headers.length} columnas, {sheetData.rows.length} filas. Las columnas se han mapeado automáticamente a la checklist.
              </div>
              <p style={{ fontWeight: 600, color: "#374151" }}>Elige el evento a importar ({sheetData.rows.length} filas disponibles):</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
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

              <button
                onClick={() => setMostrarMapeoManual(v => !v)}
                style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#1f314d", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                {mostrarMapeoManual ? "Ocultar" : "Ajustar mapeo de columnas manualmente (avanzado)"}
              </button>
              {mostrarMapeoManual && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
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
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={() => setPaso(pestanas.length > 1 ? "pestana" : "url")} style={{ background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600, color: "#374151" }}>← Atrás</button>
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
  const [tipoPaella, setTipoPaella]                   = useState("Auto");
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
  const [tipoNevera, setTipoNevera]         = useState("Mediana");
  const [tipoCongelador, setTipoCongelador] = useState("Mediana");
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  const [modalPrevia, setModalPrevia]   = useState(false);
  const [modalSheet, setModalSheet]     = useState(false);
  const [compartirMsg, setCompartirMsg] = useState("");
  const [importedTag, setImportedTag]   = useState("");
  const [importedAlquiler, setImportedAlquiler] = useState(false);
  const [itemsManuales, setItemsManuales] = useState([]); // [{ label, cantidad, categoria }] — añadidos a mano por el usuario
  const [nuevoItemLabel, setNuevoItemLabel] = useState("");
  const [nuevoItemCantidad, setNuevoItemCantidad] = useState("");
  const [nuevoItemCategoria, setNuevoItemCategoria] = useState("");
  const [categoriaTocada, setCategoriaTocada] = useState(false);

  const opts = {
    dobleServicio, llevaPaella, mesVerano, tieneCongelador, tieneBrindisCava,
    fuerzaTextilTela, tieneFrituras, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, llevaArmarioCaliente, numCamareros,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    tipoNevera, tipoCongelador, tipoPaella,
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
    return cats;
  }, [baseChecklist, itemsManuales]);

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

  // Aplicar datos importados del Sheet, sin pisar campos que el usuario ya tocó a mano
  // (solo se aplica el valor del Sheet si el campo sigue en su valor por defecto)
  const handleImport = (data) => {
    const valorActual = {
      evento, pax, ninos, horasCoctel, horasCopas, dobleServicio, llevaEntrante, llevaPaella,
      llevaArmarioCaliente, numCamareros, tipoBandejas, tipoHorno, tipoBBQ, mesVerano,
      tieneCongelador, tieneBrindisCava, tieneFrituras, fuerzaTextilTela, llevaPalomitera,
      llevaJarrasCristal, tipoCafetera, extraBandejasMadera, extraBandejasPlata, llevaJamonero,
      personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno, tipoNevera, tipoCongelador, tipoPaella,
    };
    const alquilerImportado = [];
    const importarSi = (campo, valor, setter) => {
      if (valor == null) return false;
      if (valorActual[campo] !== DEFAULTS[campo]) return false;
      setter(valor);
      return true;
    };
    if (data.evento) importarSi("evento", data.evento, setEvento);
    importarSi("pax", data.pax, setPax);
    importarSi("ninos", data.ninos, setNinos);
    if (data.horasCoctel != null) {
      importarSi("horasCoctel", data.horasCoctel || 2, setHorasCoctel);
      if (!barraCoctel) setBarraCoctel(data.horasCoctel > 0);
    }
    if (data.horasCopas != null) {
      importarSi("horasCopas", data.horasCopas || 4, setHorasCopas);
      if (!barraCopas) setBarraCopas(data.horasCopas > 0);
    }
    importarSi("llevaPaella", data.llevaPaella, setLlevaPaella);
    importarSi("tipoPaella", data.tipoPaella, setTipoPaella);
    if (importarSi("tipoHorno", data.tipoHorno, setTipoHorno) && (data.tipoHorno === "Grande" || data.tipoHorno === "Ambos")) {
      alquilerImportado.push("Horno grande (Alquiler Dealde)");
    }
    importarSi("tipoBBQ", data.tipoBBQ, setTipoBBQ);
    if (importarSi("llevaArmarioCaliente", data.llevaArmarioCaliente, setLlevaArmarioCaliente) && data.llevaArmarioCaliente) {
      alquilerImportado.push("Armario caliente (alquiler Dealde)");
    }
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
    importarSi("tipoNevera", data.tipoNevera, setTipoNevera);
    importarSi("tipoCongelador", data.tipoCongelador, setTipoCongelador);
    setImportedTag(alquilerImportado.length > 0
      ? `✓ Importado · ⚠ Incluye alquiler: ${alquilerImportado.join(", ")}`
      : "✓ Datos importados del Sheet");
    setImportedAlquiler(alquilerImportado.length > 0);
    setTimeout(() => { setImportedTag(""); setImportedAlquiler(false); }, alquilerImportado.length > 0 ? 6000 : 3000);
  };

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
          style={{
            animationDelay: "0.05s",
            background: importedAlquiler ? "#fdf6e3" : importedTag ? "#f0fdf4" : "white",
            borderColor: importedAlquiler ? "#f59e0b" : importedTag ? "#bbf7d0" : undefined,
            color: importedAlquiler ? "#b45309" : importedTag ? "#16a34a" : undefined,
            fontWeight: importedAlquiler ? 700 : undefined,
          }}
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
              ...(evento !== "produccion"
                ? [[tieneBrindisCava, setTieneBrindisCava, "Brindis con cava", "dobla copas de cava"]]
                : []),
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de palomitera propio"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              [llevaAguasPequenas,   setLlevaAguasPequenas,   "Aguas pequeñas",           "botellas individuales 33/50cl"],
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
          {(llevaEntrante || llevaPaella) && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              {llevaEntrante && (
                <SegmentedControl label="Plato de entrante compartido cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
              )}
              {llevaPaella && (
                <SegmentedControl label="Tamaño de paella" value={tipoPaella} onChange={setTipoPaella} options={["Auto", "Pequeña", "Mediana", "Grande"]} />
              )}
            </div>
          )}
          <hr />
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
              {evento !== "cumpleanos" && evento !== "produccion" && (
                <>
                  <SegmentedControl label="Nevera" value={tipoNevera} onChange={setTipoNevera} options={["Mediana", "Grande"]} />
                  <SegmentedControl label="Congelador" value={tipoCongelador} onChange={setTipoCongelador} options={["Mediana", "Grande"]} />
                </>
              )}
              <SegmentedControl label="Horno" value={tipoHorno} onChange={setTipoHorno} options={["Pequeño", "Grande", "Ambos"]} />
              <SegmentedControl label="Cafetera" value={tipoCafetera} onChange={setTipoCafetera} options={["Nespresso", "Bar", "Grande"]} />
            </div>
            {evento !== "cumpleanos" && evento !== "produccion" && (
              <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
            )}
          </div>
        </div>

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
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s` }}>
              <div className="category-header" onClick={() => toggleCategory(cat.nombre)}>
                {cat.nombre}
                <span className="cat-count">{cat.items.length} ▼</span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty, manualIdx], i) => {
                    const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                    return (
                      <div key={i} className={`item-row ${alq ? "is-alquiler" : ""}`}>
                        <div className="item-name">
                          {label}
                          {alq && <span className="tag-alquiler">ALQUILER</span>}
                        </div>
                        <div className="item-qty">{qty.u ? qty.u : qty}</div>
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
    </>
  );
}
