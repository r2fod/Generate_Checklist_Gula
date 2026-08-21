// ─── EL ÁRBOL DE LA MEMORIA ───────────────────────────────────────────────────
// La memoria era una lista plana por tema. Funcionaba con veinte recuerdos y se rompía
// con doscientos: en cada pregunta viajaban todos, ordenados por puntos, y lo de hace
// ocho meses ocupaba lo mismo que lo de ayer.
//
// Esto es la estructura de OpenHuman traída aquí. Su Memory Tree pliega lo que sabe en
// árboles de resumen por TRES ejes —fuente, tema y día— y manda el árbol, no las hojas.
// La idea es la que importa: lo reciente y lo que se usa va entero; lo viejo se pliega
// en una línea que dice cuánto hay y de qué, para poder pedirlo si hace falta.
//
// Por qué tres ejes y no uno:
//   · TEMA    — "de bebida sé estas cinco cosas". Es como se pregunta.
//   · FUENTE  — "esto lo aprendí trabajando, esto me lo contaron". Es como se decide
//               de qué fiarse cuando dos recuerdos se contradicen.
//   · DÍA     — "esto es de esta semana". Es como se sabe qué está al día.
//
// Sin React ni nube: entra una lista, sale un árbol.
import { TEMAS, CLAVES_TEMA, FUENTES, poda } from "./memoria.js";

// Lo que cabe entero antes de empezar a plegar. Por debajo de esto plegar solo quita
// información sin ahorrar nada que se note.
const CABEN_ENTEROS = 24;
// Y el tamaño máximo del árbol que viaja en cada pregunta.
const MAX_ARBOL = 2600;

const dia = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : "");

// Qué tan "vivo" está un recuerdo: los puntos mandan, pero lo reciente sube. Sin esto,
// algo que se dijo una vez hace un año y se usó mucho al principio tapa para siempre a
// lo que se acaba de aprender.
const DIAS_FRESCO = 60;
function vivacidad(r, ahora = Date.now()) {
  const edadDias = r.usado ? (ahora - r.usado) / 86400000 : 999;
  const frescura = Math.max(0, 1 - edadDias / DIAS_FRESCO);
  return r.puntos + frescura * 2;
}

// ─── LOS TRES EJES ────────────────────────────────────────────────────────────
export function porTema(memoria) {
  const lista = poda(memoria);
  return CLAVES_TEMA
    .map(t => ({ eje: "tema", clave: t, titulo: TEMAS[t], recuerdos: lista.filter(r => r.tema === t) }))
    .filter(g => g.recuerdos.length);
}

export function porFuente(memoria) {
  const lista = poda(memoria);
  return Object.keys(FUENTES)
    .map(f => ({ eje: "fuente", clave: f, titulo: FUENTES[f], recuerdos: lista.filter(r => (r.fuente || "charla") === f) }))
    .filter(g => g.recuerdos.length);
}

// Por día, de lo más reciente hacia atrás. Se agrupa por el día en que se APRENDIÓ, no
// en el que se usó: "qué me contasteis el martes" es la pregunta que se hace.
export function porDia(memoria) {
  const lista = poda(memoria);
  const mapa = {};
  lista.forEach(r => {
    const d = dia(r.creado) || "sin fecha";
    (mapa[d] ||= []).push(r);
  });
  return Object.keys(mapa)
    .sort((a, b) => b.localeCompare(a))
    .map(d => ({ eje: "dia", clave: d, titulo: d === "sin fecha" ? "Sin fecha" : d, recuerdos: mapa[d] }));
}

export function arbol(memoria) {
  return { temas: porTema(memoria), fuentes: porFuente(memoria), dias: porDia(memoria) };
}

// ─── LO QUE VIAJA EN CADA PREGUNTA ────────────────────────────────────────────
// El árbol plegado: por tema (que es como se pregunta), con lo vivo entero y el resto
// resumido en una línea. Devuelve también qué ids han viajado, para poder reforzarlos.
export function contextoPlegado(memoria, { max = MAX_ARBOL, ahora = Date.now() } = {}) {
  const lista = poda(memoria);
  if (!lista.length) return { texto: "", ids: [], plegados: 0 };

  const ordenada = [...lista].sort((a, b) => vivacidad(b, ahora) - vivacidad(a, ahora));
  const enteros = [];
  const plegados = [];
  let tamano = 0;

  ordenada.forEach((r, i) => {
    const cuesta = r.texto.length + 4;
    if (i < CABEN_ENTEROS && tamano + cuesta <= max) {
      enteros.push(r);
      tamano += cuesta;
    } else {
      plegados.push(r);
    }
  });

  const porT = {};
  enteros.forEach(r => { (porT[r.tema] ||= []).push(r); });

  const bloques = CLAVES_TEMA
    .filter(t => porT[t])
    .map(t => {
      // La fuente va pegada al recuerdo cuando no es una charla: saber que algo salió
      // trabajando un evento concreto es lo que permite contrastarlo.
      const lineas = porT[t].map(r => {
        const de = r.donde ? ` [${r.donde}]` : "";
        return `- ${r.texto}${de}`;
      });
      return `${TEMAS[t]}:\n${lineas.join("\n")}`;
    });

  // Lo plegado no desaparece: se dice cuánto hay y de qué, para que el modelo pueda
  // pedirlo con ver_cerebro si le hace falta. Tirarlo en silencio sería mentir sobre lo
  // que sabe.
  if (plegados.length) {
    const cuenta = {};
    plegados.forEach(r => { cuenta[r.tema] = (cuenta[r.tema] || 0) + 1; });
    const resumen = Object.entries(cuenta)
      .map(([t, n]) => `${n} de ${TEMAS[t].toLowerCase()}`)
      .join(", ");
    bloques.push(`Además sé ${plegados.length} cosas más que ahora no caben (${resumen}). Si hacen falta, pídelas con ver_cerebro.`);
  }

  return { texto: bloques.join("\n\n"), ids: enteros.map(r => r.id), plegados: plegados.length };
}

// ─── EL GRAFO ─────────────────────────────────────────────────────────────────
// Qué se conecta con qué. En OpenHuman son personas, temas y mensajes; aquí son las
// cosas de las que va este oficio: sitios, clientes y tipos de evento. Sale de cruzar
// los recuerdos con los eventos guardados, así que no hay nada que mantener a mano.
//
// Sirve para una cosa concreta: ver que de una finca sabes tres cosas y las tres son
// avisos, o que de un tipo de evento no sabes nada todavía.
export function grafo(memoria = [], eventosGuardados = {}) {
  const nodos = new Map();
  const enlaces = [];

  const pon = (tipo, nombre) => {
    if (!nombre) return null;
    const id = `${tipo}:${nombre.toLowerCase()}`;
    if (!nodos.has(id)) nodos.set(id, { id, tipo, nombre, peso: 0 });
    const n = nodos.get(id);
    n.peso++;
    return id;
  };

  // Los sitios y los tipos salen de los eventos: es el dato que ya existe y está limpio.
  Object.entries(eventosGuardados).forEach(([nombre, e]) => {
    if (!e) return;
    const evt = pon("evento", nombre);
    const sitio = pon("sitio", (e.ubicacion || "").trim());
    const tipo = pon("tipo", e.evento || "");
    if (evt && sitio) enlaces.push({ de: evt, a: sitio, por: "se hizo en" });
    if (evt && tipo) enlaces.push({ de: evt, a: tipo, por: "es un" });
  });

  // Y los recuerdos se enganchan a lo que nombran. Sin coincidencia, cuelgan de su tema:
  // así no se pierde nada por no haber sabido enlazarlo.
  memoria.forEach(r => {
    const rec = pon("recuerdo", r.texto.slice(0, 60));
    const texto = r.texto.toLowerCase();
    let enganchado = false;
    nodos.forEach((n) => {
      if ((n.tipo === "sitio" || n.tipo === "evento") && n.nombre.length > 3 && texto.includes(n.nombre.toLowerCase())) {
        enlaces.push({ de: rec, a: n.id, por: "habla de" });
        enganchado = true;
      }
    });
    if (!enganchado) {
      const t = pon("tema", TEMAS[r.tema] || r.tema);
      if (rec && t) enlaces.push({ de: rec, a: t, por: "es de" });
    }
    if (r.donde) {
      const d = pon("evento", r.donde);
      if (rec && d) enlaces.push({ de: rec, a: d, por: "se aprendió en" });
    }
  });

  return { nodos: [...nodos.values()].sort((a, b) => b.peso - a.peso), enlaces };
}
