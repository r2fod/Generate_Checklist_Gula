import {
  Plug, Armchair, CookingPot, Utensils, Wine, Shirt, UtensilsCrossed,
  SprayCan, Coffee, CupSoda, Martini, Truck, Package, Users, Boxes,
  Beer, GlassWater, Flame, Snowflake, ChefHat, Zap, Tent, Radio, Table, Cake,
} from "lucide-react";

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
export function infoCategoria(nombre) {
  let info = _cacheCategoria.get(nombre);
  if (info) return info;
  const n = String(nombre).toLowerCase();
  info = ICONOS_CATEGORIA.find(i => n.includes(i.fragmento)) || CATEGORIA_DEFAULT;
  _cacheCategoria.set(nombre, info);
  return info;
}
// Icono SVG (lucide) de una categoría, buscado por su nombre.
export function IconoCategoria({ nombre, size = 16 }) {
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
export function iconoItem(label) {
  let icono = _cacheIconoItem.get(label);
  if (icono) return icono;
  const n = String(label).toLowerCase();
  icono = ICONOS_ITEM.find(it => it.f.some(fr => n.includes(fr))) || ITEM_ICON_DEFAULT;
  _cacheIconoItem.set(label, icono);
  return icono;
}
export function IconoItem({ label, size = 15 }) {
  const { I, c } = iconoItem(label);
  return <I size={size} strokeWidth={2} className="item-icon" style={{ color: c }} />;
}
