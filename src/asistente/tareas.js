// ─── LO QUE HAY QUE HACER ─────────────────────────────────────────────────────
// El asistente ya detecta cosas que hay que hacer —"las sillas son de alquiler, hay que
// pedirlas"— pero no tenía dónde apuntarlas. Así que lo decía, se cerraba el panel y se
// perdía. Un aviso que hay que recordar a mano no es un aviso, es ruido.
//
// Es el "Goals & Todos" de OpenHuman, con la parte de tareas. Van en la nube porque son
// del equipo: una tarea que solo ve quien la apuntó no está apuntada.
//
// Lo que las hace útiles y no otra lista más:
//   · Se pueden colgar de un EVENTO. "Pedir las sillas" no es una tarea suelta: es de la
//     boda del 12, y cuando esa boda pasa deja de importar.
//   · El asistente puede apuntarlas, pero solo con permiso, como todo lo que escribe.
//   · Se caen solas cuando su evento ya pasó: una lista que solo crece deja de mirarse.
//
// Sin React ni nube: entra una lista, sale una lista.

export const MAX_TAREAS = 60;
const MAX_TEXTO = 180;

const limpia = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO);

const clave = (texto, evento) => `${limpia(texto)}|${evento || ""}`.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ|]/g, "-").replace(/-+/g, "-").slice(0, 70);

const hoyISO = () => new Date().toISOString().slice(0, 10);

// { id, texto, evento, hecho, creado, quien }
export function saneaTareas(bruto) {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  return bruto
    .map(t => {
      if (!t || typeof t !== "object") return null;
      const texto = limpia(t.texto);
      if (!texto) return null;
      const evento = String(t.evento || "").slice(0, 80);
      const id = String(t.id || clave(texto, evento)).slice(0, 70);
      if (!id || vistos.has(id)) return null;
      vistos.add(id);
      return {
        id, texto, evento,
        hecho: !!t.hecho,
        creado: Number.isFinite(Number(t.creado)) ? Number(t.creado) : 0,
        quien: String(t.quien || "").slice(0, 60),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_TAREAS);
}

export function apuntarTarea(lista, texto, { evento = "", quien = "", ahora = Date.now() } = {}) {
  const limpio = limpia(texto);
  if (!limpio) return { tareas: saneaTareas(lista), tarea: null, error: "No me has dicho qué apuntar." };
  const actual = saneaTareas(lista);
  const id = clave(limpio, evento);
  const yaEsta = actual.find(t => t.id === id);
  if (yaEsta) {
    // Apuntar dos veces lo mismo no crea dos tareas: la desmarca si estaba hecha, que
    // es lo que se quiere decir al repetirla.
    const revivida = { ...yaEsta, hecho: false };
    return { tareas: actual.map(t => (t.id === id ? revivida : t)), tarea: revivida, yaEstaba: true };
  }
  if (actual.filter(t => !t.hecho).length >= MAX_TAREAS) {
    return { tareas: actual, tarea: null, error: `Ya hay ${MAX_TAREAS} tareas sin hacer. Cierra algunas antes de apuntar más.` };
  }
  const nueva = { id, texto: limpio, evento, hecho: false, creado: ahora, quien: String(quien || "").slice(0, 60) };
  return { tareas: [nueva, ...actual], tarea: nueva };
}

export function marcarTarea(lista, id, hecho = true) {
  return saneaTareas(lista).map(t => (t.id === id ? { ...t, hecho: !!hecho } : t));
}

export function quitarTarea(lista, id) {
  return saneaTareas(lista).filter(t => t.id !== id);
}

// Se van las hechas y las de eventos que ya pasaron. Una lista que solo crece deja de
// mirarse, y entonces da igual lo que tenga dentro.
export function limpiarViejas(lista, eventosGuardados = {}, hoy = hoyISO()) {
  return saneaTareas(lista).filter(t => {
    if (!t.hecho) {
      // Sin hacer se queda SIEMPRE, aunque su evento haya pasado: si no se hizo, alguien
      // tiene que enterarse de que no se hizo.
      return true;
    }
    if (!t.evento) return false;                      // hecha y suelta: fuera
    const e = eventosGuardados[t.evento];
    return !e || !e.fechaEvento || e.fechaEvento >= hoy;   // hecha pero su evento no ha pasado: se queda
  });
}

// Agrupadas por evento, con las sueltas al final. Es como se miran: antes de un evento
// se mira lo de ESE evento.
export function porEvento(lista) {
  const t = saneaTareas(lista);
  const mapa = {};
  t.forEach(x => { (mapa[x.evento || ""] ||= []).push(x); });
  return Object.keys(mapa)
    .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(evento => ({
      evento,
      titulo: evento || "Sin evento",
      tareas: mapa[evento].sort((x, y) => Number(x.hecho) - Number(y.hecho) || y.creado - x.creado),
    }));
}

export const sinHacer = (lista) => saneaTareas(lista).filter(t => !t.hecho);

// Lo que viaja en la conversación: solo lo que queda por hacer, y con tope. Las hechas
// no cambian ninguna respuesta.
export function paraElContexto(lista, max = 20) {
  const pendientes = sinHacer(lista).slice(0, max);
  if (!pendientes.length) return "";
  return pendientes
    .map(t => `- ${t.texto}${t.evento ? ` (${t.evento})` : ""}`)
    .join("\n");
}
