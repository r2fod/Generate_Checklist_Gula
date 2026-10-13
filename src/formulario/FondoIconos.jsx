// ─── FONDO DE ICONOS DEL FORMULARIO ────────────────────────────────────────────
// Iconos flotando muy suaves detrás de la pregunta, y cambian con ella: cuando se
// pregunta por la barra flotan copas, cuando se pregunta por el horno flotan llamas.
// Sirve para dos cosas: dar una pista de por dónde va la pregunta sin leer, y llenar
// el hueco de los lados en un ordenador, donde el formulario es una columna estrecha
// en medio de una pantalla enorme.
//
// Está detrás de todo, no se puede tocar y no ocupa sitio: si alguien tiene el
// sistema en "menos movimiento", se queda quieto.
import { useMemo } from "react";
import {
  Heart, Church, Cake, Briefcase, Clapperboard, MapPin, CalendarDays, Clock,
  Users, Sun, Tent, Zap, Plug, Martini, Beer, GlassWater, Wine, Utensils,
  UtensilsCrossed, ChefHat, CookingPot, Flame, Armchair, Coffee, Package,
  StickyNote, CupSoda, Wind, Table, Table2, Droplet, Refrigerator, Snowflake,
  Sparkles, Printer, Shirt, Flower2, PartyPopper, ShoppingCart, AlertTriangle, Soup, Plus,
  Ban, Hash, Pencil, Truck, Sofa, Popcorn, Croissant, Ham, Milk, Candy, Apple,
  HandPlatter, Layers, UserRound, Microwave, Heater, Boxes, Box, Palette,
  ScrollText, Tag, Baby, CakeSlice, Salad, RectangleHorizontal, Circle, ShoppingBasket,
} from "lucide-react";

// Qué flota en cada pregunta. Si una pregunta no está aquí, se usa el juego de
// siempre: es un fondo, no puede fallar nada por no tener su icono.
const ICONOS_POR_PREGUNTA = {
  // En el mismo orden que TIPOS_EVENTO (boda, comunión, empresa, cumpleaños,
  // producción): este juego también se usa de icono fijo por opción en el
  // título/botones, no solo para el fondo, así que el orden aquí SÍ importa.
  tipo: [Heart, Church, Briefcase, Cake, Clapperboard],
  nombreYsitio: [MapPin, Tent, Heart],
  cuando: [CalendarDays, Clock, Sun],
  gente: [Users, Utensils, Armchair],
  dias: [Clapperboard, CalendarDays, Coffee],
  carpas: [Tent, Package],
  parabanes: [Wind, Tent],
  generador: [Zap, Plug],
  sillas: [Armchair, Package],
  // Las 4 opciones son mesas (una rectangular propia + tres redondas de alquiler):
  // con solo 2 iconos aquí, el tercero y el cuarto repetían el juego desde el
  // principio y la primera redonda de alquiler salía con un sofá (Armchair, que
  // "sillas" sí usa bien) en vez de una mesa. Las 4 explícitas, sin ciclo.
  tipoMesa: [Table2, Table, Table, Table],
  coctel: [Martini, GlassWater, Wine],
  // Uno por opción: el vaso del chupito, la cuchara de los canapés y "Añadir más"
  coctelLleva: [GlassWater, Soup, Plus],
  // Brindis, barril de 30L, barril de 50L y aguas pequeñas
  barraLleva: [PartyPopper, Beer, Beer, Droplet],
  copas: [Beer, Martini, Wine, GlassWater],
  aguaPequena: [Droplet, GlassWater],
  servicio: [Utensils, UtensilsCrossed, Package],
  menu: [ChefHat, CookingPot, Flame],
  tamanoPaella: [CookingPot, Flame, ChefHat],
  cuantasPaellas: [CookingPot, Flame],
  entrante: [CupSoda, Utensils, ChefHat],
  entrantePersonas: [Users, Utensils],
  cafe: [Coffee, CupSoda],
  nevera: [Refrigerator, Snowflake],
  congelador: [Snowflake, Refrigerator],
  hielo: [Snowflake, GlassWater],
  horno: [Flame, ChefHat, CookingPot],
  armarioCaliente: [Flame, Package],
  mesasCalientes: [Flame, Utensils],
  cuantosGastros: [CookingPot, Package],
  extras: [Package, Coffee, Beer, Armchair],
  mobiliarioAlquiler: [Armchair, Package],
  otroAlquiler: [Package, StickyNote],
  distinto: [Sparkles, Package],
  imprimirMenu: [Printer, StickyNote],
  etiquetas: [Printer, Package],
  manteles: [Package, Sparkles],
  servilletasTela: [Shirt, Package],
  estiloPlato: [Utensils, UtensilsCrossed],
  estiloPlatoPostre: [UtensilsCrossed, Cake],
  flores: [Flower2, Heart],
  tarta: [Cake, PartyPopper],
  minutas: [StickyNote, MapPin],
  comprar: [ShoppingCart, Package],
  alergias: [AlertTriangle, Heart],
  excepcionesMesa: [Utensils, StickyNote],
  buffets: [ChefHat, Utensils, CookingPot],
  notas: [StickyNote, Clock],
  // Las pantallas que no son una pregunta también llevan el suyo
  elegir: [CalendarDays, MapPin, Heart],
  repaso: [Utensils, GlassWater, ChefHat, Package],
  fin: [Heart, Cake, Martini],
};
const POR_DEFECTO = [Utensils, GlassWater, ChefHat];

// ─── LOS ICONOS EN PRIMER PLANO: EL DEL TÍTULO Y EL DE CADA OPCIÓN ───────────────
// Salían del juego del fondo, por posición: la primera opción el primer icono, la
// segunda el segundo... y así "Corner de vermut" llevaba una olla y "Fruta" unos
// cubiertos ("que tengan sentido con la frase", el dueño). Ahora cada uno dice lo
// suyo: el título, de qué va la pregunta; cada opción, lo que contesta.
const ICONO_TITULO = {
  tipo: PartyPopper, dias: CalendarDays, coctelLleva: HandPlatter, copas: Wine,
  bebidaAparte: CupSoda, cristaleria: Wine, numBarras: Beer, barraLleva: Beer,
  entrante: Salad, entrantePersonas: Users, horno: Microwave, armarioCaliente: Heater,
  cuantosGastros: Boxes, extras: Sparkles, mobiliarioAlquiler: Sofa, otroAlquiler: Truck,
  buffets: UtensilsCrossed, buffetPlatos: Layers, queDobla: Layers, manteles: Palette,
  estiloPlato: Palette, estiloPlatoPostre: CakeSlice, minutas: ScrollText, etiquetas: Tag,
};
export function iconoDePregunta(idPregunta) {
  return ICONO_TITULO[idPregunta] || (ICONOS_POR_PREGUNTA[idPregunta] || POR_DEFECTO)[0];
}

// Por opción: lo que dice cada respuesta. Lo que no está aquí sale de reglas comunes
// (iconoDeOpcion, abajo): "no" tacha, "otro número" es una almohadilla y un "sí"
// lleva el icono de su pregunta (¿carpas? sí → una carpa).
const ICONO_OPCION = {
  tipo: { boda: Heart, comunion: Church, corporativo: Briefcase, cumpleanos: Cake, produccion: Clapperboard },
  sillas: { finca: MapPin, Dealde: Truck, Carvillo: Truck, Nuestras: Armchair },
  tipoMesa: { "Rectangular 1,8m": RectangleHorizontal, "Redonda 1,5m": Circle, "Redonda 1,8m": Circle, "Redonda 2m": Circle },
  coctelLleva: { chupito: GlassWater, cuchara: Soup, otro: Plus },
  bebidaAparte: { no: Wine, si: ShoppingBasket },
  numBarras: { 1: Beer, 2: Beer },
  barraLleva: { brindis: PartyPopper, barril30: Beer, barril50: Beer, aguasPequenas: Droplet },
  aguaPequena: { Plástico: Droplet, Cartón: Box },
  servicio: { sentados: Utensils, bandeja: HandPlatter },
  menu: { paella: CookingPot, frito: Flame, dosPlatos: Layers },
  queDobla: { tenedor: Utensils, cuchillo: Utensils, cuchara: Soup, vino: Wine, agua: GlassWater, cava: Wine },
  tamanoPaella: { Pequeña: CookingPot, Mediana: CookingPot, Grande: CookingPot },
  entrante: { individual: UserRound, compartir: Users },
  entrantePersonas: { 1: UserRound, 3: Users, 4: Users },
  cafe: { invitados: Users, personal: ChefHat },
  nevera: { Mediana: Refrigerator, Grande: Refrigerator },
  congelador: { Mediana: Snowflake, Grande: Snowflake },
  horno: { Pequeño: Microwave, Grande: Microwave, Ambos: Microwave },
  cuantosGastros: { auto: Boxes },
  extras: { chillout: Sofa, jarras: Milk, barbacoa: Flame, palomitera: Popcorn, desayuno: Croissant, jamonero: Ham },
  buffets: { quesos: UtensilsCrossed, dulce: Candy, ibericos: Ham, croquetas: Flame, fruta: Apple, vermut: Wine, aperol: Martini },
  distinto: { planchaGas: Flame, bandejasMadera: HandPlatter, bandejasPlata: HandPlatter },
  servilletasTela: { si: Shirt, no: StickyNote },
  estiloPlatoPostre: { "Mismo que el principal": Layers },
  excepcionesMesa: { menuInfantil: Baby },
};
const NO = new Set(["no", "No lleva"]);
export function iconoDeOpcion(idPregunta, opcion) {
  const valor = opcion && opcion.valor;
  const texto = (opcion && opcion.texto) || "";
  const propio = ICONO_OPCION[idPregunta] && ICONO_OPCION[idPregunta][valor];
  if (propio) return propio;
  // "No llevamos platos", "No hace falta", "No lleva": un no se tacha
  if (NO.has(valor) || /^no\b/i.test(texto)) return Ban;
  if (/^otr/i.test(String(valor))) return /número/i.test(texto) ? Hash : /escrib/i.test(texto) ? Pencil : Plus;
  if (/^auto$/i.test(String(valor))) return Users;
  return iconoDePregunta(idPregunta);
}

// El gesto de cada icono, al aparecer en el título y al elegir la opción: la llama
// parpadea, el copo gira, las copas brindan, el camión arranca, el corazón late y el
// "no" niega. El resto da un brinco. Solo CSS (index.css, "form-gesto-").
const GESTOS = new Map([
  [Flame, "llama"], [Snowflake, "hielo"], [Truck, "camion"], [Heart, "latido"], [Baby, "latido"],
  [Ban, "no"], [PartyPopper, "giro"], [Sparkles, "giro"], [Flower2, "giro"],
  ...[Wine, Martini, GlassWater, Beer, CupSoda, Milk, Coffee].map(I => [I, "brindis"]),
]);
export function gestoDeIcono(Icono) {
  return `form-gesto-${GESTOS.get(Icono) || "bote"}`;
}

// Sitios fijos (en %), tamaños y ritmos. Van a mano y no al azar para que el fondo
// quede repartido y no se amontone en una esquina, y para que sea siempre igual.
// "conMargen": solo caben donde hay margen a los lados de la columna. En el móvil no
// lo hay y esos caían justo debajo del icono del título (un corazón detrás del
// corazón del título), de la barra de progreso o de los botones de arriba: ahí se
// esconden (hasta 900px). Por encima, la columna ocupa como mucho del 23% al 77% del
// ancho, así que ningún icono entra en esa franja: uno a 46% asomaba junto a la barra
// de progreso y otro a 30% detrás de "Atrás".
const SITIOS = [
  { x: 6, y: 12, tam: 46, dur: 19, retraso: 0, conMargen: true },
  { x: 84, y: 8, tam: 34, dur: 23, retraso: 1.6, conMargen: true },
  { x: 91, y: 34, tam: 54, dur: 26, retraso: 0.4 },
  { x: 3, y: 44, tam: 30, dur: 21, retraso: 2.4, conMargen: true },
  { x: 12, y: 74, tam: 50, dur: 24, retraso: 1.1 },
  { x: 88, y: 66, tam: 40, dur: 20, retraso: 3.0 },
  { x: 80, y: 89, tam: 28, dur: 25, retraso: 0.8 },
  { x: 16, y: 92, tam: 36, dur: 22, retraso: 2.0 },
  { x: 15, y: 5, tam: 26, dur: 27, retraso: 1.4, conMargen: true },
];

export default function FondoIconos({ pregunta }) {
  const piezas = useMemo(() => {
    const juego = ICONOS_POR_PREGUNTA[pregunta] || POR_DEFECTO;
    return SITIOS.map((s, i) => ({ ...s, Icono: juego[i % juego.length], id: i }));
  }, [pregunta]);
  return (
    // La clave hace que al cambiar de pregunta el fondo entero se vuelva a montar y
    // entre con su fundido, en vez de cambiar los iconos de golpe
    <div className="form-fondo" aria-hidden="true" key={pregunta}>
      {piezas.map(({ Icono, x, y, tam, dur, retraso, conMargen, id }) => (
        <span
          className={`form-fondo-icono${conMargen ? " con-margen" : ""}`}
          key={id}
          style={{
            left: `${x}%`, top: `${y}%`,
            animationDuration: `${dur}s`,
            animationDelay: `${retraso}s`,
          }}
        >
          <Icono size={tam} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}
