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
import { leerJSON, guardarJSON } from "../almacen.js";

const CLAVE = "gula_formulario_mios";
const clave = () => CLAVE;

export function leerMios() {
  const l = leerJSON(clave(), []);
  return Array.isArray(l) ? l : [];
}

// Sin sitio se pierde la lista, no lo mandado: lo enviado ya está en la nube.
function guardar(lista) {
  guardarJSON(clave(), lista.slice(0, 20));
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

// Busca en la lista el envío hecho para ese nombre de evento, sin mirar
// mayúsculas ni espacios de sobra. Lo usan tanto el aviso de "ya mandaste esto"
// del repaso como la marca de "enviado" en la lista de elegir evento: es la
// misma pregunta ("¿ya se mandó algo para este nombre?") hecha en dos sitios.
export function buscarEnvioPorNombre(mios, nombre) {
  const buscado = (nombre || "").trim().toLowerCase();
  if (!buscado) return null;
  return mios.find(m => (m.eventoDestino || m.nombre || "").trim().toLowerCase() === buscado) || null;
}
