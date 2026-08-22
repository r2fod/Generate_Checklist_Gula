// ─── TEXTO: COMPARAR Y DAR IDENTIDAD ──────────────────────────────────────────
// Dos cuentas que estaban copiadas por medio repositorio:
//
//   · `sinTildes`, en los tres conectores (whatsapp, calendario, checklists) y en
//     `enrutado.js`. Cuatro copias de la misma línea, y de eso viven cosas que sí se
//     notan: si una se queda atrás, el asistente encuentra "la boda de Álvaro" por un
//     lado y no por otro según a quién le preguntes.
//   · `limpia` + `clave`, en memoria, objetivos, tareas y conversaciones. La clave es
//     la IDENTIDAD de un recuerdo o de un objetivo: es lo que hace que lo mismo apuntado
//     desde dos móviles sea una cosa y no dos. Cuatro copias de una identidad es la
//     misma trampa que `categoría::etiqueta` en la checklist.
//
// El markdown de las respuestas del modelo NO está aquí: eso es cosa del asistente y
// vive en `src/asistente/texto.js` (`sinMarcas`).

// Minúsculas y sin acentos, para comparar. NFD parte "á" en "a" + tilde suelta, y la
// tilde suelta es lo que se tira.
export const sinTildes = (t) => String(t || "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Espacios de sobra fuera y un solo espacio dentro. El `max` recorta lo que llega
// pegado de un modelo o de un formulario: sin tope, un párrafo entero se cuela como
// título de una tarea.
export const limpiaTexto = (t, max = Infinity) =>
  String(t || "").replace(/\s+/g, " ").trim().slice(0, max);

// El id sale del propio texto: el mismo recuerdo guardado dos veces desde dos móviles
// tiene que ser UNO. La ñ se conserva a posta —"año" y "ano" no son lo mismo, y quien
// lo lea en un panel de depuración lo agradece—.
export const claveDeTexto = (texto, max = 60) => sinTildes(limpiaTexto(texto))
  .replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, "-").slice(0, max);
