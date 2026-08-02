// ─── LO QUE HA MANDADO ESTE MÓVIL ──────────────────────────────────────────────
// La lista de envíos hechos desde aquí, para poder volver a uno y cambiarlo. Vive
// en el navegador y no en la nube a propósito: leer los envíos de la nube exige
// sesión del equipo, y darle a la oficina permiso para listarlos sería enseñarle
// también los de las demás. Con la lista local, cada móvil ve lo suyo.
//
// Contrapartida honesta: si cambian de móvil o borran los datos del navegador,
// pierden la lista. Lo mandado no se pierde —eso está en la nube y logística lo
// sigue viendo—, solo la forma cómoda de volver a ello desde el formulario.

// La lista NO se guarda por código: si logística cambia el enlace, lo que ya
// mandaron sigue existiendo en la nube y tiene que poder corregirse igual. Atarla al
// código dejaba la lista vacía por un cambio que no tiene nada que ver con ellas.
const CLAVE = "gula_formulario_mios";
const clave = () => CLAVE;

export function leerMios() {
  try {
    const l = JSON.parse(localStorage.getItem(clave()) || "[]");
    return Array.isArray(l) ? l : [];
  } catch (e) { return []; }
}

function guardar(lista) {
  try { localStorage.setItem(clave(), JSON.stringify(lista.slice(0, 20))); }
  catch (e) { /* sin sitio: se pierde la lista, no lo mandado */ }
}

// Apunta (o actualiza) un envío. Se guardan también las respuestas para poder
// abrirlo y cambiarlo sin pedirle nada a la nube.
export function apuntarEnvio({ id, respuestas, eventoDestino }) {
  const lista = leerMios();
  const entrada = {
    id,
    respuestas,
    eventoDestino: eventoDestino || "",
    nombre: (respuestas && respuestas.nombre) || eventoDestino || "Evento sin nombre",
    fecha: (respuestas && respuestas.fecha) || "",
    enviado: Date.now(),
  };
  const i = lista.findIndex(x => x.id === id);
  if (i === -1) return guardar([entrada, ...lista]);
  const copia = [...lista];
  copia[i] = { ...copia[i], ...entrada };
  guardar(copia);
}

export function olvidarEnvio(id) {
  guardar(leerMios().filter(x => x.id !== id));
}
