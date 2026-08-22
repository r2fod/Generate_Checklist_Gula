// ─── EL CEREBRO ───────────────────────────────────────────────────────────────
// Lo que el asistente ha aprendido de vosotros y no está en ningún cálculo: "en esta
// finca no hay enchufe en la carpa", "en las comuniones ponemos 3 de cocina, no 4", "a
// este cliente no le pongas cerveza sin alcohol". Cosas que hoy vivían en la cabeza de
// quien lleva más tiempo, y que se pierden el día que esa persona libra.
//
// Está copiado de la idea buena de OpenHuman —su "Memory Tree"— y de una decisión suya
// concreta: la memoria se guarda en TEXTO que se puede leer y corregir, no en vectores
// opacos. Un cerebro que no puedes abrir es un cerebro en el que no puedes confiar, y
// aquí importa el doble: si aprende mal que en las bodas van 2 de cocina, se carga mal
// el camión y nadie sabe por qué.
//
// Tres cosas que hace y una que no:
//   · Funde lo repetido en vez de acumularlo. Aprender lo mismo cuatro veces no son
//     cuatro recuerdos, es uno con más peso.
//   · Puntúa por uso. Lo que se usa sube; lo que nunca se usa se cae cuando hay que
//     hacer sitio, en vez de crecer sin límite y llenar cada pregunta de ruido.
//   · Va por temas, para poder llevarse solo lo que viene a cuento.
//   · NO decide nada. La memoria entra en la conversación como contexto, no como orden.
//
// Sin React, sin Firestore: entra una lista, sale una lista.

import { sinTildes, limpiaTexto, claveDeTexto } from "../texto.js";

// Los temas son cerrados a propósito. Con temas libres, "bebida", "bebidas" y "Bebida"
// acaban siendo tres cajones distintos con lo mismo dentro, y el asistente se lleva uno.
export const TEMAS = {
  equipo:   "Cómo trabaja el equipo",
  sitios:   "Fincas y sitios",
  clientes: "Preferencias de clientes",
  bebida:   "Bebida y consumos",
  cocina:   "Cocina y menús",
  carga:    "Carga, camión y montaje",
  general:  "Otras cosas",
};
export const CLAVES_TEMA = Object.keys(TEMAS);
const temaValido = (t) => (CLAVES_TEMA.includes(t) ? t : "general");

// Un recuerdo largo no es un recuerdo, es un documento: si hace falta más, son dos.
const MAX_TEXTO = 280;
// El tope de recuerdos que se guardan. Por encima, cada pregunta arrastraría un tocho
// que cuesta dinero y tapa lo que importa.
export const MAX_RECUERDOS = 200;
// Y lo que de verdad viaja en cada conversación: los mejores, hasta este tamaño.
const MAX_CONTEXTO = 2600;

const limpia = (t) => limpiaTexto(t, MAX_TEXTO);

// El id sale del propio texto para que el mismo recuerdo guardado dos veces desde dos
// móviles sea UNO, no dos. Es la misma idea que la identidad de un item de la checklist,
// y por eso la cuenta vive en src/texto.js y no copiada aquí.
const clave = (texto) => claveDeTexto(texto, 60);

// ─── PARECIDO ─────────────────────────────────────────────────────────────────
// Sin esto, "en la finca X no hay enchufe fuera" y "en la finca X no hay enchufes en la
// carpa" son dos recuerdos que dicen lo mismo, y a los seis meses hay nueve. No es
// semántica de verdad: son las palabras que comparten, quitando las que no dicen nada.
const VACIAS = new Set(["de", "la", "el", "los", "las", "un", "una", "en", "y", "o", "que", "no", "se", "a", "con", "por", "para", "al", "del", "es", "son", "hay", "lo", "le", "su", "sus", "mas", "más"]);

// Se quita la "s" del final. Sin esto, "enchufe" y "enchufes" son palabras distintas y
// dos recuerdos que dicen exactamente lo mismo no se funden nunca. No es un lematizador
// —"ponemos" queda en "ponemo"— y da igual: lo único que importa es que la misma palabra
// se recorte igual en los dos textos que se están comparando.
const raiz = (p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p);

const palabras = (t) => new Set(sinTildes(limpia(t))
  .split(/[^a-z0-9ñ]+/).filter(p => p.length > 2 && !VACIAS.has(p)).map(raiz));

// Comunes entre el total de distintas (Jaccard). Se probó antes con Dice y fundía cosas
// que NO eran lo mismo: dos frases que comparten el armazón —"el X conviene revisarlo
// antes que el Y"— salían a 0,71 aunque X e Y fueran distintos, porque las palabras del
// armazón pesaban tanto como las que dicen algo. Y el caso que de verdad importa,
// "en bodas 4 de cocina" contra "en comuniones 3 de cocina", se quedaba en 0,67: a un
// pelo del umbral, o sea a un pelo de perder un dato.
//
// Jaccard castiga que uno tenga palabras que el otro no, que es exactamente lo que pasa
// cuando dos frases parecidas hablan de cosas distintas.
export function parecido(a, b) {
  const x = palabras(a), y = palabras(b);
  if (!x.size || !y.size) return 0;
  let comunes = 0;
  x.forEach(p => { if (y.has(p)) comunes++; });
  return comunes / (x.size + y.size - comunes);
}

// Por encima de esto se considera lo mismo dicho de otra forma y se funde. Se eligió
// para que quepa el caso de siempre —la misma frase con un detalle más, 0,67— y NO
// quepan dos frases con el mismo armazón y distinto contenido, que se quedan por debajo
// de 0,57. Fundir dos recuerdos que no eran lo mismo pierde un dato, y eso es peor que
// tener dos parecidos.
const UMBRAL_FUNDIR = 0.6;

// ─── LA LISTA ─────────────────────────────────────────────────────────────────
// ─── DE DÓNDE SALIÓ CADA COSA ─────────────────────────────────────────────────
// Un recuerdo sin fuente es un rumor. "En las comuniones ponemos 3 de cocina" puede ser
// una decisión del jefe de cocina o algo que alguien dijo de pasada en una conversación
// de hace ocho meses, y desde el panel no había forma de distinguirlas — así que
// tampoco había forma de saber cuál corregir.
//
// La fuente dice DÓNDE se aprendió: en qué evento se estaba, o si vino de una revisión.
// No es un adorno del panel: es lo que permite tirar del hilo cuando algo suena raro.
export const FUENTES = {
  charla:   "En una conversación",
  evento:   "Trabajando un evento",
  revision: "De una revisión",
  mano:     "Escrito a mano",
};
const fuenteValida = (f) => (Object.keys(FUENTES).includes(f) ? f : "charla");

// Un recuerdo: { id, texto, tema, puntos, creado, usado, quien, fuente, donde }
export function saneaMemoria(bruta) {
  if (!Array.isArray(bruta)) return [];
  const vistos = new Set();
  return bruta
    .map(r => {
      if (!r || typeof r !== "object") return null;
      const texto = limpia(r.texto);
      if (!texto) return null;
      const id = String(r.id || clave(texto)).slice(0, 60);
      if (!id || vistos.has(id)) return null;
      vistos.add(id);
      const n = (v, x) => (Number.isFinite(Number(v)) ? Number(v) : x);
      return {
        id,
        texto,
        tema: temaValido(r.tema),
        puntos: Math.max(1, Math.min(999, n(r.puntos, 1))),
        creado: n(r.creado, 0),
        usado: n(r.usado, 0),
        quien: String(r.quien || "").slice(0, 60),
        fuente: fuenteValida(r.fuente),
        // En qué evento se estaba al aprenderlo. Es lo que convierte "lo dijo alguien"
        // en "salió de la boda del 12", que es lo que se puede comprobar.
        donde: String(r.donde || "").slice(0, 80),
      };
    })
    .filter(Boolean);
}

// Aprender algo. Si ya se sabía —aunque esté dicho de otra forma— se refuerza y se queda
// la redacción NUEVA: la última vez que alguien lo dijo es la que está al día.
export function recordar(memoria, texto, { tema = "general", quien = "", fuente = "charla", donde = "", ahora = Date.now() } = {}) {
  const limpio = limpia(texto);
  if (!limpio) return { memoria: saneaMemoria(memoria), recuerdo: null, fundido: false };
  const lista = saneaMemoria(memoria);
  const t = temaValido(tema);

  const yaEsta = lista.find(r => r.tema === t && parecido(r.texto, limpio) >= UMBRAL_FUNDIR);
  if (yaEsta) {
    // Al fundir se queda la fuente NUEVA si la hay: la última vez que se dijo es la
    // que está al día, igual que con la redacción.
    const actualizado = {
      ...yaEsta, texto: limpio, puntos: Math.min(999, yaEsta.puntos + 1), usado: ahora,
      quien: quien || yaEsta.quien,
      fuente: fuenteValida(fuente), donde: donde || yaEsta.donde,
    };
    return {
      memoria: lista.map(r => (r.id === yaEsta.id ? actualizado : r)),
      recuerdo: actualizado,
      fundido: true,
    };
  }

  const nuevo = {
    id: clave(limpio), texto: limpio, tema: t, puntos: 1, creado: ahora, usado: ahora,
    quien: String(quien || "").slice(0, 60), fuente: fuenteValida(fuente), donde: String(donde || "").slice(0, 80),
  };
  return { memoria: poda([...lista, nuevo]), recuerdo: nuevo, fundido: false };
}

export function olvidar(memoria, id) {
  const lista = saneaMemoria(memoria);
  return { memoria: lista.filter(r => r.id !== id), habia: lista.some(r => r.id === id) };
}

// Cuando un recuerdo se usa de verdad en una respuesta, sube. Es lo que separa lo que
// sirve de lo que alguien apuntó una vez y no volvió a hacer falta.
export function refuerza(memoria, ids = [], ahora = Date.now()) {
  const set = new Set(ids);
  return saneaMemoria(memoria).map(r =>
    (set.has(r.id) ? { ...r, puntos: Math.min(999, r.puntos + 1), usado: ahora } : r));
}

// Hacer sitio. Se van los de menos puntos y, a igualdad, los que hace más que no se
// usan. Nunca se pasa del tope: una memoria que crece sin límite acaba costando dinero
// en cada pregunta y tapando lo que importa.
export function poda(memoria, max = MAX_RECUERDOS) {
  const lista = saneaMemoria(memoria);
  if (lista.length <= max) return lista;
  return [...lista]
    .sort((a, b) => b.puntos - a.puntos || b.usado - a.usado)
    .slice(0, max);
}

// ─── LO QUE VIAJA EN CADA PREGUNTA ────────────────────────────────────────────
// No se manda el cerebro entero: se mandan los mejores hasta un tamaño, agrupados por
// tema. Agrupar no es estética — un modelo lee mucho mejor "Fincas y sitios: A, B, C"
// que doce frases sueltas, y ocupa menos.
export function paraElContexto(memoria, { max = MAX_CONTEXTO } = {}) {
  const lista = poda(memoria).sort((a, b) => b.puntos - a.puntos || b.usado - a.usado);
  if (!lista.length) return { texto: "", ids: [] };

  const porTema = {};
  const ids = [];
  let tamano = 0;
  for (const r of lista) {
    const cuesta = r.texto.length + 4;
    if (tamano + cuesta > max) break;
    (porTema[r.tema] ||= []).push(r);
    ids.push(r.id);
    tamano += cuesta;
  }

  const bloques = CLAVES_TEMA
    .filter(t => porTema[t])
    .map(t => `${TEMAS[t]}:\n${porTema[t].map(r => `- ${r.texto}`).join("\n")}`);

  return { texto: bloques.join("\n\n"), ids };
}

// Los recuerdos de un tema, para poder enseñarlos y corregirlos en pantalla.
export function porTemas(memoria) {
  const lista = poda(memoria);
  return CLAVES_TEMA
    .map(t => ({
      tema: t,
      titulo: TEMAS[t],
      recuerdos: lista.filter(r => r.tema === t).sort((a, b) => b.puntos - a.puntos || b.usado - a.usado),
    }))
    .filter(g => g.recuerdos.length);
}
