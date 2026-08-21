// ─── LAS CONVERSACIONES GUARDADAS ─────────────────────────────────────────────
// Al cerrar el panel se perdía todo. Preguntas algo, lo cierras para mirar la checklist,
// vuelves y no hay nada — así que hay que volver a preguntarlo, y se paga otra vez.
//
// Van en el navegador y NO en la nube, al revés que la memoria y las tareas. Es a
// propósito: una conversación es de quien la tuvo. Lo que sirve al equipo ya se guarda
// en el cerebro (lo aprendido) y en las tareas (lo que hay que hacer); el resto es el
// camino que se siguió para llegar ahí, y compartirlo solo llenaría la lista de todos
// con las dudas de cada uno.
//
// Sin React: entra una lista, sale una lista.

const CLAVE = "gula_asistente_charlas";
// Cuántas se guardan. Con más, la lista deja de servir para encontrar algo y localStorage
// empieza a pesar de verdad (una conversación con herramientas son varios kB).
export const MAX_CHARLAS = 20;

const limpia = (t) => String(t || "").replace(/\s+/g, " ").trim();

// El título sale de la primera pregunta. Pedirlo a mano lo dejaría siempre en blanco, y
// pedírselo al modelo cuesta dinero por algo que se resuelve con un slice.
export function tituloDe(hilo = []) {
  const primera = hilo.find(m => m.de === "yo");
  const t = limpia(primera && primera.texto);
  if (!t) return "Sin título";
  return t.length > 44 ? `${t.slice(0, 44)}…` : t;
}

export function saneaCharlas(bruto) {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  return bruto
    .map(c => {
      if (!c || typeof c !== "object" || !Array.isArray(c.hilo) || !c.hilo.length) return null;
      const id = String(c.id || "").slice(0, 40);
      if (!id || vistos.has(id)) return null;
      vistos.add(id);
      return {
        id,
        titulo: limpia(c.titulo) || tituloDe(c.hilo),
        cuando: Number.isFinite(Number(c.cuando)) ? Number(c.cuando) : 0,
        hilo: c.hilo,
        // Los mensajes en formato neutro, para poder seguir la conversación donde se
        // dejó. Sin ellos se vería el texto pero el modelo no tendría el contexto.
        mensajes: Array.isArray(c.mensajes) ? c.mensajes : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.cuando - a.cuando)
    .slice(0, MAX_CHARLAS);
}

export function leerCharlas() {
  try { return saneaCharlas(JSON.parse(localStorage.getItem(CLAVE) || "[]")); }
  catch (e) { return []; }
}

function escribir(lista) {
  const limpias = saneaCharlas(lista);
  try { localStorage.setItem(CLAVE, JSON.stringify(limpias)); }
  catch (e) {
    // Sin sitio: se tira la mitad más vieja y se reintenta. Perder conversaciones viejas
    // es mucho mejor que dejar de guardar las nuevas sin decir nada.
    try { localStorage.setItem(CLAVE, JSON.stringify(limpias.slice(0, Math.ceil(MAX_CHARLAS / 2)))); }
    catch (e2) { /* modo privado: no se guarda y la app sigue */ }
  }
  return limpias;
}

// Guardar la que está abierta. Si ya existía, se actualiza en su sitio; si no, se añade.
export function guardarCharla(lista, { id, hilo, mensajes }) {
  if (!Array.isArray(hilo) || !hilo.length) return saneaCharlas(lista);
  const actual = saneaCharlas(lista);
  const charla = {
    id: id || `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    titulo: tituloDe(hilo),
    cuando: Date.now(),
    hilo,
    mensajes: mensajes || [],
  };
  return escribir([charla, ...actual.filter(c => c.id !== charla.id)]);
}

export function borrarCharla(lista, id) {
  return escribir(saneaCharlas(lista).filter(c => c.id !== id));
}

export function borrarTodas() {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* modo privado */ }
  return [];
}

// "hace 5 min", "ayer", "12 sept". Una fecha completa en una lista de veinte no se lee.
export function cuandoFue(ms, ahora = Date.now()) {
  if (!ms) return "";
  const min = Math.round((ahora - ms) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  const d = new Date(ms);
  return `${d.getDate()} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getMonth()]}`;
}
