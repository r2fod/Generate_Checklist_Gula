// ─── LO QUE LE IMPORTA AL NEGOCIO ─────────────────────────────────────────────
// La pieza que separa un asistente que contesta de uno que ayuda. Sin esto, "¿cómo va
// el mes?" se contesta con una lista de eventos; con esto, se contesta mirando lo que
// habéis dicho que importa —"bajar la merma de cristalería", "no volver a olvidar las
// sillas de alquiler"— y diciendo cómo va ESO.
//
// Es la idea de "Objetivos y enfoque" de OpenHuman, y aquí hace exactamente lo mismo:
// entra en cada conversación para que el asistente sepa qué priorizar. Se guarda en la
// nube porque es del equipo: un objetivo que solo ve quien lo escribió no es un objetivo.
//
// Lo que NO hace: cumplirlos solo. Un asistente que dice "he bajado la merma" sin que
// nadie haya cambiado nada es peor que uno que no dice nada. Aquí se anota el objetivo y
// se le recuerda; el trabajo lo hacen las personas.
//
// Sin React ni Firestore: entra una lista, sale una lista.

// Cuántos caben. Con más de esto no son objetivos, es una lista de deseos: entran todos
// en cada pregunta, ocupan sitio y el asistente no puede priorizar entre quince cosas.
export const MAX_OBJETIVOS = 8;
const MAX_TEXTO = 200;

export const ESTADOS = {
  activo:     { nombre: "En marcha", peso: 0 },
  logrado:    { nombre: "Conseguido", peso: 1 },
  aparcado:   { nombre: "Aparcado", peso: 2 },
};
const estadoValido = (e) => (Object.keys(ESTADOS).includes(e) ? e : "activo");

const limpia = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO);

const clave = (texto) => limpia(texto).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, "-").slice(0, 50);

// { id, texto, estado, creado, porQue }
export function saneaObjetivos(bruto) {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  return bruto
    .map(o => {
      if (!o || typeof o !== "object") return null;
      const texto = limpia(o.texto);
      if (!texto) return null;
      const id = String(o.id || clave(texto)).slice(0, 50);
      if (!id || vistos.has(id)) return null;
      vistos.add(id);
      return {
        id,
        texto,
        estado: estadoValido(o.estado),
        creado: Number.isFinite(Number(o.creado)) ? Number(o.creado) : 0,
        // El porqué es opcional pero cambia mucho: "bajar la merma" y "bajar la merma
        // porque el año pasado nos costó 900€" no dan la misma respuesta.
        porQue: limpia(o.porQue),
      };
    })
    .filter(Boolean)
    .sort((a, b) => ESTADOS[a.estado].peso - ESTADOS[b.estado].peso || b.creado - a.creado)
    .slice(0, MAX_OBJETIVOS);
}

export function ponerObjetivo(lista, texto, { porQue = "", ahora = Date.now() } = {}) {
  const limpio = limpia(texto);
  if (!limpio) return { objetivos: saneaObjetivos(lista), objetivo: null };
  const actual = saneaObjetivos(lista);
  const id = clave(limpio);
  const yaEsta = actual.find(o => o.id === id);
  if (yaEsta) {
    // Volver a decir el mismo objetivo lo REACTIVA: es lo que se quiere decir cuando se
    // repite algo que estaba aparcado.
    const actualizado = { ...yaEsta, estado: "activo", porQue: porQue || yaEsta.porQue };
    return { objetivos: saneaObjetivos(actual.map(o => (o.id === id ? actualizado : o))), objetivo: actualizado, yaEstaba: true };
  }
  if (actual.filter(o => o.estado === "activo").length >= MAX_OBJETIVOS) {
    return { objetivos: actual, objetivo: null, error: `Ya hay ${MAX_OBJETIVOS} objetivos. Da uno por conseguido o apárcalo antes de añadir otro.` };
  }
  const nuevo = { id, texto: limpio, estado: "activo", creado: ahora, porQue: limpia(porQue) };
  return { objetivos: saneaObjetivos([...actual, nuevo]), objetivo: nuevo };
}

export function cambiarEstado(lista, id, estado) {
  return saneaObjetivos(saneaObjetivos(lista).map(o => (o.id === id ? { ...o, estado: estadoValido(estado) } : o)));
}

export function quitarObjetivo(lista, id) {
  return saneaObjetivos(lista).filter(o => o.id !== id);
}

// Lo que viaja en cada conversación: solo los que están en marcha. Los conseguidos y los
// aparcados ocupan sitio y no cambian ninguna respuesta.
export function paraElContexto(lista) {
  const activos = saneaObjetivos(lista).filter(o => o.estado === "activo");
  if (!activos.length) return "";
  return activos
    .map(o => `- ${o.texto}${o.porQue ? ` (${o.porQue})` : ""}`)
    .join("\n");
}

export const cuantosActivos = (lista) => saneaObjetivos(lista).filter(o => o.estado === "activo").length;
