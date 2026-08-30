// ─── QUÉ SE LE DEJA HACER ─────────────────────────────────────────────────────
// Hasta aquí el asistente solo consultaba, y era una decisión consciente: uno que
// consulta mal da una respuesta rara; uno que escribe mal borra el trabajo de quien
// está cargando el camión. Para dejarle escribir hace falta esto: decir qué puede
// tocar, y que se vea antes de que lo toque.
//
// Tres niveles, y el de partida es el de siempre. Nadie se encuentra un asistente con
// permisos que no ha dado.
//
// Y una lista que NO depende del nivel: hay cuatro cosas que no se exponen en ninguno.
// La identidad de un item de la checklist es "categoría::etiqueta", así que renombrarlo
// o marcarlo por su cuenta destruye lo que otra persona lleva marcado en el camión, sin
// forma de recuperarlo y sin que nadie sepa por qué. Eso no es un permiso que alguien
// pueda dar en un desplegable: es un no.
//
// Sin React ni nube: entra un nivel y una herramienta, sale sí o no.

export const NIVELES = {
  consultar: {
    nombre: "Solo consultar",
    resumen: "Mira tus datos y calcula. No cambia nada.",
    escribe: false,
    confirma: false,
  },
  permiso: {
    nombre: "Con permiso",
    resumen: "Puede crear y editar, pero cada cambio te lo enseña y decides tú.",
    escribe: true,
    confirma: true,
  },
  confianza: {
    nombre: "Confianza",
    resumen: "Crea y edita sin preguntar. Todo queda apuntado y se puede deshacer.",
    escribe: true,
    confirma: false,
  },
};
export const CLAVES_NIVEL = Object.keys(NIVELES);
export const NIVEL_POR_DEFECTO = "consultar";

export const nivelValido = (n) => (CLAVES_NIVEL.includes(n) ? n : NIVEL_POR_DEFECTO);

// Lo que no se toca, se ponga el nivel que se ponga. No están en el catálogo de
// herramientas siquiera: esto es el segundo cerrojo, por si algún día alguien añade una
// herramienta con uno de estos nombres sin caer en la cuenta.
export const NUNCA = [
  "marcar_cargado", "marcar_preparado", "marcar_vuelto", "apuntar_roturas",
  "renombrar_item", "renombrar_categoria", "borrar_evento", "borrar_archivo",
];

// ¿Puede usarse esta herramienta con este nivel? Devuelve el porqué cuando no, para
// poder decírselo al modelo en vez de que se quede sin entender qué ha pasado.
export function puede(nombre, nivel, herramienta) {
  if (NUNCA.includes(nombre)) {
    return { puede: false, motivo: "Esa acción no está disponible para el asistente en ningún nivel: tocaría las marcas de carga, y eso solo lo hace una persona." };
  }
  const n = NIVELES[nivelValido(nivel)];
  // Solo se miran las que escriben. Consultar está permitido siempre: el nivel decide
  // qué puede CAMBIAR, no qué puede saber.
  if (!herramienta || !herramienta.escribe) return { puede: true };
  if (!n.escribe) {
    return { puede: false, motivo: `El asistente está en "${n.nombre}" y esa acción cambia datos. Dilo y explica dónde se hace a mano, o sube el nivel en los ajustes del asistente.` };
  }
  return { puede: true };
}

// ¿Hay que enseñar el cambio y esperar un sí? En "Con permiso", siempre que escriba.
export function pideConfirmacion(nivel, herramienta) {
  return !!(herramienta && herramienta.escribe && NIVELES[nivelValido(nivel)].confirma);
}

// La frase que se le mete al modelo en el mensaje de sistema. Que sepa lo que puede
// hacer evita la mitad del problema: si no lo sabe, propone cosas que no puede hacer y
// la conversación se va en explicar por qué no.
export function comoContarlo(nivel) {
  const n = NIVELES[nivelValido(nivel)];
  if (!n.escribe) {
    // "de la app": su memoria (recordar/olvidar) está disponible en todos los
    // niveles — no es un dato de la app, es su propio estado, y el equipo la lee
    // y la borra a mano en Cerebro. Decir "no puedes cambiar nada" a secas
    // contradecía a las herramientas que sí tenía (la trampa nº2 de CONTEXTO,
    // que ya costó un bug).
    return "No puedes cambiar nada de la app (eventos, checklists, calendario, tareas): solo consultar y calcular. Si te piden modificar algo de la app, dilo claro y explica dónde se hace. Tu propia memoria sí puedes guardarla (recordar/olvidar): es tuya, no es un dato de la app, y el equipo la lee y la borra a mano en Cerebro.";
  }
  return n.confirma
    ? "Puedes crear y editar cosas, pero cada cambio se le enseña a la persona y lo aprueba antes de aplicarse. Propón el cambio concreto, con los valores exactos."
    : "Puedes crear y editar cosas directamente. Di siempre QUÉ has cambiado, con los valores de antes y de después.";
}
