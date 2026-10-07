import {
  Plug, Armchair, CookingPot, Utensils, Wine, Shirt, UtensilsCrossed,
  SprayCan, Coffee, CupSoda, Martini, Truck, Package, Users, Boxes,
  Beer, GlassWater, Flame, Snowflake, ChefHat, Zap, Tent, Radio, Table, Cake,
  ClipboardList, Tag, RotateCcw, ShoppingCart, Sparkles, Refrigerator, Layers, Soup,
  ConciergeBell, Fuel, PartyPopper, Popcorn, Sofa, Ham, Droplet, Croissant, Milk,
  Check,
} from "lucide-react";
import { useAcabaDe } from "./useAcabaDe.js";

// Los iconos que se mueven a su manera (fase 3 del rediseño): la llama tiembla, el copo
// gira y el camión arranca. Los demás dan un saltito. Solo CSS ("Iconos con vida" en
// index.css): aquí únicamente se les pone la clase según el dibujo, no según el texto.
const ANIMACION = new Map([[Flame, "anim-llama"], [Snowflake, "anim-hielo"], [Truck, "anim-camion"]]);
const claseAnim = (Comp) => ANIMACION.get(Comp);

// Icono decorativo + color pastel por categoría, buscado por fragmento del nombre
// (varía según el tipo de evento: "Cocina y fuego", "Cocina y Electro"...)
const ICONOS_CATEGORIA = [
  // La primera de la lista y la primera de la checklist: los menús que hay que sacar
  // aparte por una alergia. En rojo a propósito — es lo único de toda la carga que, si
  // se pasa por alto, acaba en algo más que un viaje de vuelta.
  { fragmento: "menús especiales", Comp: ChefHat, color: "#fee2e2", texto: "#991b1b" },
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
  return <Comp size={size} strokeWidth={2.2} className={claseAnim(Comp)} />;
}
// Los dos colores de una categoría como variables CSS, para ponerlos UNA vez en su
// contenedor (con la clase .con-cat): el icono, la raya, el tinte de la cabecera y la
// barra de progreso los leen de ahí. Antes cada sitio copiaba el pastel en línea, y el
// tema oscuro solo podía apagarlos con un filtro sobre todo el bloque.
export function estiloCategoria(nombre) {
  const { color, texto } = infoCategoria(nombre);
  return { "--cat": texto, "--cat-suave": color };
}
// Cabecera de una categoría en la hoja y en el modo carga (las dos eran la misma
// copia). Con hechos/total enseña cuánto lleva: "3/8" y su barra. Al completarla se
// celebra (una vez, al marcar lo último; no al abrir con ella ya hecha). `grupo` es la
// pestaña del modo carga: cambiar de Prep. a Salida no es terminar nada.
export function CabeceraCategoria({ nombre, hechos, total, grupo }) {
  const conCuenta = total > 0 && Number.isFinite(hechos);
  const completa = conCuenta && hechos === total;
  const [celebra, terminar] = useAcabaDe(completa, grupo);
  return (
    <div className={`preview-category-header${celebra ? " celebra" : ""}`}
         onAnimationEnd={e => { if (e.target === e.currentTarget) terminar(); }}>
      <span className="cat-icon-mini"><IconoCategoria nombre={nombre} /></span>
      <span className="cat-cabecera-nombre">{nombre}</span>
      {conCuenta && (
        <>
          <span className={`cat-cuenta${completa ? " es-completa" : ""}`}>
            {completa && <Check size={11} strokeWidth={3} aria-hidden="true" />}{hechos}/{total}
          </span>
          <span className="cat-progreso" aria-hidden="true"><span style={{ width: `${(hechos / total) * 100}%` }} /></span>
        </>
      )}
    </div>
  );
}

// Icono por MATERIAL: se elige según palabras clave del nombre del item (el primero
// que coincide gana, por eso el orden importa). Es decorativo — una pista visual.
const ICONOS_ITEM = [
  { f: ["menú sin", "menu sin", "menú vegano", "menu vegano", "menú vegetariano", "menu vegetariano", "menú especial", "menu especial"], I: ChefHat, c: "#991b1b" },
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
export function IconoItem({ label, size = 15 }) {
  const { I, c } = iconoItem(label);
  const anim = claseAnim(I);
  return <I size={size} strokeWidth={2} className={anim ? `item-icon ${anim}` : "item-icon"} style={{ color: c }} />;
}

// ─── BLOQUES Y EXTRAS DE LA CONFIGURACIÓN ───
// "Que haya más contraste para diferenciar compras, recogidas, las opciones como
// paella, parisiene…" (el dueño): en un formulario de dos metros todo era el mismo
// título pequeño en gris. Cada bloque lleva su icono aquí y su color en el CSS
// (data-bloque en el padre), y cada extra su icono, buscado por su texto.
const ICONO_BLOQUE = {
  evento: ClipboardList, logistica: Truck, alquileres: Tag, recogidas: RotateCcw,
  compras: ShoppingCart, barra: Martini, extras: Sparkles, equipamiento: Refrigerator,
};
export function IconoBloque({ bloque }) {
  const Icono = ICONO_BLOQUE[bloque] || Boxes;
  return <span className="bloque-icono" aria-hidden="true"><Icono size={14} strokeWidth={2.3} className={claseAnim(Icono)} /></span>;
}
// El icono y el título de un bloque juntos, con su explicación debajo en pequeño (antes
// iba entre paréntesis en el propio título y ocupaba cuatro líneas en el móvil).
export function TituloBloque({ bloque, detalle, children }) {
  return (
    <span className="bloque-cabecera">
      <IconoBloque bloque={bloque} />
      <span className="bloque-titulos">
        <span>{children}</span>
        {detalle && <span className="bloque-detalle">{detalle}</span>}
      </span>
    </span>
  );
}
const ICONO_EXTRA = {
  "Doble servicio": Layers, "Doble tenedor": Utensils, "Doble cuchillo": Utensils,
  "Doble cuchara": Utensils, "Doble copa de vino": Wine, "Doble vaso de agua": GlassWater,
  "Doble copa de cava": Wine, "Entrante de chupito": Soup, "Cucharas de porcelana": Utensils, "Entrante compartido": UtensilsCrossed,
  "Solo bandeja": ConciergeBell, "Lleva paella": CookingPot, "Hay frituras": Flame,
  "Plancha de gas": Fuel, "Brindis con cava": PartyPopper, "Lleva palomitera": Popcorn,
  "Lleva chill out": Sofa, "Hay jamonero": Ham, "Hay tarta": Cake, "Aguas pequeñas": Droplet,
  "Hay desayuno": Croissant, "Café para invitados": Coffee, "Servilletas de tela": Shirt,
  "Jarras de cristal": Milk, "Llevamos cristalería": Wine, "Llevamos hielo": Snowflake,
  "La bebida la pone Gula": Beer,
};
export function IconoExtra({ nombre }) {
  const Icono = ICONO_EXTRA[nombre];
  return Icono ? <span className="bloque-icono extra-icono" aria-hidden="true"><Icono size={15} strokeWidth={2.2} className={claseAnim(Icono)} /></span> : null;
}
